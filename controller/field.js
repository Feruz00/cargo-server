const { Op } = require('sequelize');
const {
  CargoFields,
  Users,
  CargoFieldPermission,
  sequelize,
  CargoFieldEnumValues,
} = require('../models');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');

/**
 * GET ALL FIELDS
 */
exports.getAllFields = catchAsync(async (req, res, next) => {
  let {
    page = 1,
    limit = 10,
    name,
    key,
    type,
    isComputed,
    sort = 'orderIndex',
    order = 'ASC',
  } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (page < 1) page = 1;
  if (limit < 1 || limit > 100) limit = 10;

  const offset = (page - 1) * limit;

  const options = {
    where: {},
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

  if (key) {
    options.where.key = {
      [Op.like]: `%${key}%`,
    };
  }

  if (type) {
    options.where.type = {
      [Op.in]: type.split(','),
    };
  }

  if (isComputed !== undefined) {
    options.where.isComputed = {
      [Op.in]: isComputed.split(',').map((v) => v === 'true'),
    };
  }

  // 🔽 sorting
  const allowedSortFields = ['name', 'key', 'type', 'createdAt', 'orderIndex'];
  const allowedOrder = ['ASC', 'DESC'];

  if (!allowedSortFields.includes(sort)) sort = 'orderIndex';
  if (!allowedOrder.includes(order.toUpperCase())) order = 'ASC';

  options.order = [[sort, order]];

  const { rows: fields, count } = await CargoFields.findAndCountAll(options);

  res.status(200).json({
    data: fields,
    count: Array.isArray(count) ? count.length : count,
  });
});

/**
 * GET ONE FIELD
 */
exports.getOneField = catchAsync(async (req, res, next) => {
  const field = await CargoFields.findByPk(req.params.id, {
    include: [
      {
        model: CargoFieldEnumValues,
        as: 'enums',
        attributes: ['id', 'name', 'color'],
      },
    ],
  });

  if (!field) return next(new AppError('Field not found', 404));
  const permissions = await CargoFieldPermission.findAll({
    where: {
      fieldId: field.id,
    },
    include: [
      {
        association: 'user',
      },
    ],
  });
  res.status(200).json({
    status: 'success',
    data: {
      field,

      users: permissions,
    },
  });
});

/**
 * CREATE FIELD
 */
exports.createField = catchAsync(async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { users, enums, type, isComputed, formula, ...others } = req.body;

    if (isComputed && !formula) {
      return next(new AppError('Computed field must have formula', 400));
    }

    if (type === 'enum' && (!enums || !enums.length)) {
      return next(new AppError('Enum field must have values', 400));
    }

    const lastField = await CargoFields.findOne({
      order: [['orderIndex', 'DESC']],
      attributes: ['orderIndex'],
      transaction,
    });

    const nextOrder = lastField ? lastField.orderIndex + 1 : 1;

    const field = await CargoFields.create(
      {
        ...others,
        type,
        isComputed: !!isComputed,
        formula: isComputed ? formula : null,
        orderIndex: nextOrder,
      },
      { transaction }
    );
    if (type === 'enum') {
      const enumData = enums.map((e) => ({
        fieldId: field.id,
        name: e.name,
        color: e.color || '#999',
      }));

      await CargoFieldEnumValues.bulkCreate(enumData, { transaction });
    }
    if (users && users.length > 0) {
      const permissions = users.map((userId) => ({
        userId,
        fieldId: field.id,
      }));

      await CargoFieldPermission.bulkCreate(permissions, {
        transaction,
      });
    }

    await transaction.commit();

    res.status(201).json({
      status: 'success',
      data: field,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

/**
 * UPDATE FIELD
 */
exports.updateField = catchAsync(async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const field = await CargoFields.findByPk(req.params.id, {
      include: [
        {
          model: CargoFieldEnumValues,
          as: 'enums',
        },
      ],
      transaction,
    });

    if (!field) {
      await transaction.rollback();
      return next(new AppError('Field not found', 404));
    }

    const { users, enums, type, isComputed, formula, ...others } = req.body;
    // console.log(enums);
    if (isComputed && !formula) {
      return next(new AppError('Computed field must have formula', 400));
    }

    if (type === 'enum' && (!enums || !enums.length)) {
      return next(new AppError('Enum field must have values', 400));
    }
    const oldType = field.type;

    if (oldType === 'enum' && type !== 'enum') {
      await CargoFieldEnumValues.destroy({
        where: { fieldId: field.id },
        transaction,
      });
    }
    await field.update(
      {
        ...others,
        type,
        isComputed: !!isComputed,
        formula: isComputed ? formula : null,
      },
      { transaction }
    );

    if (type === 'enum') {
      await CargoFieldEnumValues.destroy({
        where: { fieldId: field.id },
        transaction,
      });

      const enumData = enums.map((e) => ({
        fieldId: field.id,
        name: e.name,
        color: e.color || '#999999',
      }));

      await CargoFieldEnumValues.bulkCreate(enumData, { transaction });
    }

    if (users) {
      await CargoFieldPermission.destroy({
        where: { fieldId: field.id },
        transaction,
      });

      if (users.length > 0) {
        const permissions = users.map((userId) => ({
          userId,
          fieldId: field.id,
        }));

        await CargoFieldPermission.bulkCreate(permissions, {
          transaction,
        });
      }
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      data: field,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

/**
 * UPDATE Oder
 */
exports.updateFieldOrder = catchAsync(async (req, res, next) => {
  const order = req.body;

  await Promise.all(
    order.map(async (el) => {
      const data = await CargoFields.findByPk(el.id);

      if (data) {
        await data.update({ orderIndex: el.order });
      }
    })
  );

  res.status(200).json({
    status: 'success',
  });
});
/**
 * DELETE FIELD
 */
exports.deleteField = catchAsync(async (req, res, next) => {
  const field = await CargoFields.findByPk(req.params.id);

  if (!field) return next(new AppError('Field not found', 404));

  await field.destroy();

  res.status(204).json({
    status: 'success',
  });
});

/**
 * DELETE MULTIPLE FIELDS
 */
exports.deleteFields = catchAsync(async (req, res, next) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new AppError('Please provide field IDs', 400));
  }

  const deletedCount = await CargoFields.destroy({
    where: {
      id: { [Op.in]: ids },
    },
  });

  res.status(200).json({
    status: 'success',
    deleted: deletedCount,
  });
});
