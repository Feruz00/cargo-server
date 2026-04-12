const { Op } = require('sequelize');
const {
  Users,
  CargoFieldPermission,
  sequelize,
  CargoFields,
  CargoFieldEnumValues,
} = require('../models');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { toHash } = require('../utils/password');

/**
 * GET ALL
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
  // return next(new AppError('bay bay', 400));
  let {
    page = 1,
    limit = 10,
    username,
    status,
    role,
    name,
    sort = 'id',
    order = 'DESC',
  } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (page < 1) page = 1;
  if (limit < 1 || limit > 100) limit = 10;

  const offset = (page - 1) * limit;

  const options = {
    where: {
      id: {
        [Op.ne]: req.user.id,
      },
    },

    attributes: {
      exclude: ['password'],
    },
  };
  if (req.query.page && req.query.limit) {
    options.limit = limit;
    options.offset = offset;
  }
  if (name) {
    options.where.name = {
      [Op.like]: `%${name}%`,
    };
  }
  if (username) {
    options.where.username = {
      [Op.like]: `%${username}%`,
    };
  }
  if (status) {
    options.where.isActive = {
      [Op.in]: status.split(',').map((row) => row === 'true'),
    };
  }

  if (role) {
    options.where.role = {
      [Op.in]: role.split(','),
    };
  }

  const allowedSortFields = [
    'name',
    'username',
    'createdAt',
    'role',
    'last_login',
  ];
  const allowedOrder = ['ASC', 'DESC'];

  if (!allowedSortFields.includes(sort)) sort = 'createdAt';
  if (!allowedOrder.includes(order.toUpperCase())) order = 'DESC';

  options.order = [[sort, order]];

  const { rows: users, count } = await Users.findAndCountAll(options);

  res.status(200).json({
    data: users,
    count: Array.isArray(count) ? count.length : count,
  });
});

/**
 * GET ONE
 */
exports.getOneUser = catchAsync(async (req, res, next) => {
  const user = await Users.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
  });

  if (!user) return next(new AppError('User not found', 404));
  const permissions = await CargoFieldPermission.findAll({
    where: {
      userId: user.id,
    },
    include: [
      {
        association: 'field',
        attributes: ['id', 'name', 'orderIndex'], // include orderIndex
      },
    ],
    order: [[{ model: CargoFields, as: 'field' }, 'orderIndex', 'ASC']],
  });

  res.status(200).json({
    status: 'success',
    data: {
      user,
      permissions,
    },
  });
});

exports.myFields = catchAsync(async (req, res, next) => {
  const permissions = await CargoFieldPermission.findAll({
    where: {
      userId: req.user.id,
    },
  });
  const ids = permissions.map((row) => row.fieldId);

  const fields = await CargoFields.findAll({
    where: {
      id: {
        [Op.in]: ids,
      },
    },
    include: [
      {
        model: CargoFieldEnumValues,
        as: 'enums',
        attributes: ['id', 'name', 'color'],
      },
    ],
    order: [['orderIndex', 'ASC']],
  });
  return res.json({ data: fields });
});
/**
 * CREATE
 */
exports.createUser = catchAsync(async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { permissions, ...others } = req.body;
    const password = await toHash(req.body.password);
    // 1. Create user
    const user = await Users.create({ ...others, password }, { transaction });

    // 2. Prepare permissions (only if exists)
    let data = [];

    if (permissions && permissions.length > 0) {
      const pers = await CargoFields.findAll({
        where: { id: permissions },
        transaction,
      });

      data = pers.map((row) => ({
        fieldId: row.id,
        userId: user.id,
      }));

      // 3. Bulk create permissions
      await CargoFieldPermission.bulkCreate(data, { transaction });
    }

    // 4. Commit
    await transaction.commit();

    res.status(201).json({
      status: 'success',
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    // 5. Rollback on error
    await transaction.rollback();
    next(error);
  }
});

/**
 * UPDATE
 */
exports.updateUser = catchAsync(async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const user = await Users.findByPk(req.params.id, { transaction });

    if (!user) return next(new AppError('User not found', 404));
    if (user.id === req.user.id) {
      return next(new AppError('You cannot update own information', 400));
    }

    const { permissions, password, ...others } = req.body;
    const newUpdate = { ...others };

    if (password) {
      newUpdate.password = await toHash(password);
    }

    // Update user
    await user.update(newUpdate, { transaction });

    if (permissions) {
      await CargoFieldPermission.destroy({
        where: { userId: user.id },
        transaction,
      });

      if (permissions.length > 0) {
        const data = permissions.map((id) => ({
          userId: user.id,
          fieldId: id,
        }));
        await CargoFieldPermission.bulkCreate(data, { transaction });
      }
    }

    // Commit transaction
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});
/**
 * DELETE
 */
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await Users.findByPk(req.params.id);

  if (!user) return next(new AppError('User not found', 404));
  if (user.id === req.user.id) {
    return next(new AppError('You cannot delete own information', 400));
  }
  await user.destroy();

  res.status(204).json({
    status: 'success',
  });
});

/**
 * DELETE USERS
 */

exports.deleteUsers = catchAsync(async (req, res, next) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      message: 'Please provide an array of user IDs',
    });
  }

  if (ids.includes(req.user.id)) {
    return next(new AppError('You cannot delete your own account', 400));
  }

  const deletedCount = await Users.destroy({
    where: {
      id: { [Op.in]: ids },
    },
  });

  res.status(200).json({
    status: 'success',
    deleted: deletedCount,
  });
});
