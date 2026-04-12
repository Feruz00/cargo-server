const { Op, fn, col, literal } = require('sequelize');
const {
  CargoFields,
  Users,
  CargoFieldPermission,
  CargoFieldValues,
  sequelize,
  CargoFieldEnumValues,
} = require('../models');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const XLSX = require('xlsx');
const { getIO } = require('../socket');
const dayjs = require('dayjs');

exports.getValues = catchAsync(async (req, res) => {
  let { page = 1, limit = 15, sort, order } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (page < 1) page = 1;
  if (limit < 1 || limit > 100) limit = 15;

  let fldIds = [];

  if (req.user.role === 'user') {
    const permissions = await CargoFieldPermission.findAll({
      where: { userId: req.user.id },
      attributes: ['fieldId'],
      raw: true,
    });

    fldIds = permissions.map((p) => p.fieldId);

    if (!fldIds.length) {
      return res.json({ fields: [], data: [], count: 0 });
    }
  }

  let fields = await CargoFields.findAll({
    where: req.user.role === 'user' ? { id: fldIds } : {},
    order: [['orderIndex', 'ASC']],
    include: [
      {
        model: CargoFieldEnumValues,
        as: 'enums',
        attributes: ['id', 'name', 'color'],
      },
    ],
  });

  fields = fields.map((f) => f.toJSON());

  const conditions = [];

  for (const field of fields) {
    if (field.type === 'enum' && req.query[field.key]) {
      conditions.push({
        fieldId: field.id,
        value: { [Op.in]: req.query[field.key].split(',') },
      });
    }

    if (field.type === 'text' && req.query[field.key]) {
      conditions.push({
        fieldId: field.id,
        value: { [Op.like]: `%${req.query[field.key]}%` },
      });
    }

    if (field.type === 'date') {
      const startKey = `${field.key}From`;
      const endKey = `${field.key}End`;

      if (req.query[startKey] && req.query[endKey]) {
        const start = dayjs(req.query[startKey]).format('YYYY-MM-DD');
        const end = dayjs(req.query[endKey]).format('YYYY-MM-DD');

        conditions.push({
          fieldId: field.id,
          value: {
            [Op.between]: [start, end], // ✅ STRING compare
          },
        });
      }
    }
  }

  let matchedRowIds = null;

  for (const cond of conditions) {
    const rows = await CargoFieldValues.findAll({
      attributes: ['rowId'],
      where: cond,
      raw: true,
    });

    const ids = rows.map((r) => r.rowId);

    if (!matchedRowIds) {
      matchedRowIds = ids;
    } else {
      matchedRowIds = matchedRowIds.filter((id) => ids.includes(id));
    }
  }

  if (req.user.role === 'user') {
    const userRows = await CargoFieldValues.findAll({
      attributes: ['rowId'],
      where: {
        createdUser: req.user.id,
        fieldId: { [Op.in]: fldIds },
      },
      raw: true,
    });

    const userIds = userRows.map((r) => r.rowId);

    if (matchedRowIds) {
      matchedRowIds = matchedRowIds.filter((id) => userIds.includes(id));
    } else {
      matchedRowIds = userIds;
    }
  }

  let rowIds = [...new Set(matchedRowIds || [])];

  if (!rowIds.length) {
    return res.json({ fields, data: [], count: 0 });
  }

  const sortField = fields.find((f) => f.key === sort);

  let sortMap = {};

  if (sortField) {
    const sortRows = await CargoFieldValues.findAll({
      where: {
        rowId: { [Op.in]: rowIds },
        fieldId: sortField.id,
      },
      attributes: ['rowId', 'value'],
      raw: true,
    });

    sortRows.forEach((r) => {
      let val = r.value;

      if (sortField.type === 'number') {
        val = Number(val) || 0;
      } else if (sortField.type === 'date') {
        val = new Date(val).getTime() || 0;
      } else {
        val = val ? val.toString().toLowerCase() : '';
      }

      sortMap[r.rowId] = val;
    });
  }

  let finalRows = rowIds.map((rowId) => ({
    rowId,
    value: sortField ? (sortMap[rowId] ?? null) : rowId,
  }));

  finalRows.sort((a, b) => {
    if (!sortField) return b.rowId.localeCompare(a.rowId);

    const A = a.value;
    const B = b.value;

    if (A === null) return 1;
    if (B === null) return -1;

    if (typeof A === 'number') {
      return order === 'ascend' ? A - B : B - A;
    }

    if (A > B) return order === 'ascend' ? 1 : -1;
    if (A < B) return order === 'ascend' ? -1 : 1;
    return 0;
  });

  const pageRowIds = finalRows
    .slice((page - 1) * limit, page * limit)
    .map((r) => r.rowId);

  const values = await CargoFieldValues.findAll({
    where: {
      rowId: { [Op.in]: pageRowIds },
      ...(req.user.role === 'user' ? { fieldId: { [Op.in]: fldIds } } : {}),
    },
    include: [
      {
        model: CargoFields,
        as: 'field',
        attributes: ['key', 'type', 'isComputed', 'formula'],
      },
    ],
    raw: true,
    nest: true,
  });

  const dataMap = {};

  pageRowIds.forEach((id) => {
    dataMap[id] = { rowId: id };
  });

  values.forEach((row) => {
    const key = row.field.key;
    dataMap[row.rowId][key] = row.value;
  });

  const data = pageRowIds.map((id) => dataMap[id]);

  res.json({
    fields,
    data,
    count: rowIds.length,
  });
});

exports.create = catchAsync(async (req, res) => {
  const pers = await CargoFieldPermission.findAll({
    where: { userId: req.user.id },
  });
  const perIds = pers.map((row) => row.fieldId);

  let fields = await CargoFields.findAll({ where: { id: perIds } });
  fields = fields.map((row) => ({ key: row.key, id: row.id, type: row.type }));

  const lastField = await CargoFieldValues.findOne({
    order: [['rowNum', 'DESC']],
    attributes: ['rowNum'],
  });

  const num = lastField ? lastField.rowNum + 1 : 1;

  const request = req.body;
  const data = [];
  fields.forEach((field) => {
    const key = Object.keys(request).find((key) => key === field.key);
    if (key) {
      data.push({
        fieldId: field.id,
        value: request[key],
        rowNum: num,
        createdUser: req.user.id,
      });
    } else {
      data.push({
        fieldId: field.id,
        value: '',
        rowNum: num,
        createdUser: req.user.id,
      });
    }
  });

  await CargoFieldValues.bulkCreate(data);
  const io = getIO();
  const newRow = await buildRow(num);

  io.to('head-room').emit('values:created', {
    rowNum: num,
    row: newRow,
  });
  return res.json({ data: [] });
});

exports.getOne = catchAsync(async (req, res) => {
  const rowNum = req.params.id;
  const field = await CargoFieldValues.findAll({
    where: {
      rowNum: rowNum,
    },
    attributes: ['id', 'value', 'fieldId'],
  });

  return res.json({ data: field });
});

exports.update = catchAsync(async (req, res) => {
  const rowNum = req.params.id;
  const request = req.body;

  const pers = await CargoFieldPermission.findAll({
    where: { userId: req.user.id },
  });

  const perIds = pers.map((p) => p.fieldId);

  const fields = await CargoFields.findAll({
    where: { id: perIds },
  });

  const fieldMap = {};
  fields.forEach((f) => {
    fieldMap[f.id] = f;
  });

  const values = await CargoFieldValues.findAll({
    where: { rowNum },
  });

  const valueMap = {};
  values.forEach((v) => {
    valueMap[v.fieldId] = v;
  });

  for (const fieldId of perIds) {
    const field = fieldMap[fieldId];
    if (!field) continue;

    const val = request[field.key] ?? '';

    if (valueMap[fieldId]) {
      await valueMap[fieldId].update({
        value: val,
        updatedUser: req.user.id,
      });
    } else {
      await CargoFieldValues.create({
        fieldId,
        value: val,
        rowNum,
        createdUser: req.user.id,
        updatedUser: req.user.id,
      });
    }
  }
  const updatedRow = await buildRow(rowNum);
  const io = getIO();

  io.to('head-room').emit('values:updated', {
    rowNum,
    updatedRow,
  });
  res.status(200).json({
    status: 'success',
  });
});

exports.deleteOne = catchAsync(async (req, res, next) => {
  const rowNum = req.params.id;
  const deletedRow = await buildRow(rowNum);
  const count = await CargoFieldValues.destroy({
    where: {
      rowNum: rowNum,
    },
  });
  if (!count) return next(new AppError('Field not found', 404));
  const io = getIO();

  io.to('head-room').emit('values:deleted', {
    rowNum,
    deletedRow, // optional
  });
  res.status(204).json({
    status: 'success',
  });
});

exports.deleteMany = catchAsync(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      message: 'Please provide an array of user IDs',
    });
  }
  const deletedCount = await CargoFieldValues.destroy({
    where: {
      rowNum: { [Op.in]: ids },
    },
  });
  res.status(200).json({
    status: 'success',
    deleted: deletedCount,
  });
});

exports.importExcel = catchAsync(async (req, res) => {
  const file = req.file;
  const insertedRowNums = [];
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json(sheet);

  if (!jsonData.length) {
    return res.status(400).json({ message: 'Empty file' });
  }

  const pers = await CargoFieldPermission.findAll({
    where: { userId: req.user.id },
  });

  const fieldIds = pers.map((p) => p.fieldId);

  const fields = await CargoFields.findAll({
    where: { id: fieldIds },
  });

  const fieldMap = {};
  fields.forEach((f) => {
    fieldMap[f.name] = f; // IMPORTANT: Excel header must match name
  });

  const maxRow = await CargoFieldValues.max('rowNum');
  let currentRowNum = maxRow ? maxRow + 1 : 1;

  const bulkData = [];

  for (let i = jsonData.length - 1; i >= 0; i--) {
    const row = jsonData[i];

    for (const key in row) {
      const field = fieldMap[key];
      if (!field) continue;

      bulkData.push({
        fieldId: field.id,
        value: row[key] ?? '',
        rowNum: currentRowNum,
        createdUser: req.user.id,
        updatedUser: req.user.id,
      });
    }
    insertedRowNums.push(currentRowNum);
    currentRowNum++;
  }

  //   console.log(bulkData.filter((row, index) => index < 10));
  // 🔹 bulk insert
  await CargoFieldValues.bulkCreate(bulkData);
  const rows = await Promise.all(
    insertedRowNums.map((rowNum) => buildRow(rowNum))
  );
  const io = getIO();

  io.to('head-room').emit('values:imported', {
    rows,
  });
  res.status(200).json({
    status: 'success',
    inserted: bulkData.length,
  });
});

exports.getChartData = catchAsync(async (req, res) => {
  const {
    chart = 'line', // line | bar
    groupBy = 'daily', // daily | weekly | monthly
    startDate,
    endDate,
    userId,
  } = req.query;

  // =========================
  // 🧠 VALIDATION
  // =========================
  const allowedCharts = ['line', 'bar'];
  const allowedGroups = ['daily', 'weekly', 'monthly'];

  if (!allowedCharts.includes(chart)) {
    return res.status(400).json({ message: 'Invalid chart type' });
  }

  if (!allowedGroups.includes(groupBy)) {
    return res.status(400).json({ message: 'Invalid groupBy value' });
  }

  // =========================
  // 📅 DATE FORMAT
  // =========================
  let dateFormat = '%Y-%m-%d';

  if (groupBy === 'monthly') dateFormat = '%Y-%m';
  if (groupBy === 'weekly') dateFormat = '%x-%v'; // ISO week

  // =========================
  // 🔍 FILTER
  // =========================
  const where = {};

  if (startDate && endDate) {
    where.createdAt = {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    };
  }

  if (userId) {
    where.createdUser = userId;
  }

  // =========================
  // 📊 QUERY
  // =========================
  const rawData = await CargoFieldValues.findAll({
    attributes: [
      [
        fn(
          'DATE_FORMAT',
          col('CargoFieldValues.createdAt'), // ✅ FIXED
          dateFormat
        ),
        'date',
      ],
      col('CargoFieldValues.createdUser'),

      // 🔥 IMPORTANT: count by rowNum (NOT id)
      [fn('COUNT', fn('DISTINCT', col('CargoFieldValues.rowNum'))), 'count'],
    ],
    include: [
      {
        model: Users,
        as: 'createdByUser',
        attributes: ['id', 'name'],
        where: { role: 'user' }, // ✅ only users
        required: true, // ✅ INNER JOIN
      },
    ],
    where,
    group: [
      literal('date'),
      col('CargoFieldValues.createdUser'),
      col('createdByUser.id'),
    ],
    order: [[literal('date'), 'ASC']],
    raw: true,
    nest: true,
  });

  // =========================
  // 🔄 TRANSFORM DATA
  // =========================
  const labelsSet = new Set();
  const datasetsMap = {};

  rawData.forEach((row) => {
    const date = row.date;
    const userId = row.createdUser;
    const userName = row.createdByUser?.name || 'Unknown';
    const count = Number(row.count);

    labelsSet.add(date);

    if (!datasetsMap[userId]) {
      datasetsMap[userId] = {
        label: userName,
        data: {},
      };
    }

    datasetsMap[userId].data[date] = count;
  });

  // sort labels (important for charts)
  const labels = Array.from(labelsSet).sort();

  const datasets = Object.values(datasetsMap).map((ds) => ({
    label: ds.label,
    data: labels.map((date) => ds.data[date] || 0),
  }));

  // =========================
  // 📤 RESPONSE
  // =========================
  res.json({
    chart,
    groupBy,
    labels,
    datasets,
  });
});

async function buildRow(rowNum) {
  function isSafeFormula(formula) {
    return /^[0-9a-zA-Z_+\-*/().\s]+$/.test(formula);
  }

  function safeEvalFormula(formula, context) {
    try {
      if (!isSafeFormula(formula)) return formula;

      const keys = Object.keys(context);

      const values = keys.map((k) => {
        const val = context[k];
        if (val === null || val === undefined) return 0;

        const num = Number(val);
        return isNaN(num) ? 0 : num;
      });

      const fn = new Function(...keys, `return ${formula}`);
      return fn(...values);
    } catch {
      return formula;
    }
  }
  const fields = await CargoFields.findAll({
    attributes: ['key', 'type', 'isComputed', 'formula'],
    raw: true,
  });

  const values = await CargoFieldValues.findAll({
    where: { rowNum },
    include: [
      {
        model: CargoFields,
        as: 'field',
        attributes: ['key', 'type', 'isComputed', 'formula'],
      },
      {
        model: Users,
        as: 'createdByUser',
        attributes: ['id', 'name', 'username'],
      },
      {
        model: Users,
        as: 'updatedByUser',
        attributes: ['id', 'name', 'username'],
      },
    ],
    raw: true,
    nest: true,
  });

  const row = {
    rowNum,
    createdAt: null,
    updatedAt: null,
    createdUser: null,
    updatedUser: null,
  };

  for (const v of values) {
    row[v.field.key] = v.value;

    if (!row.createdAt || new Date(v.createdAt) > new Date(row.createdAt)) {
      row.createdAt = v.createdAt;
      row.createdUser = v.createdByUser;
    }

    if (!row.updatedAt || new Date(v.updatedAt) > new Date(row.updatedAt)) {
      row.updatedAt = v.updatedAt;
      row.updatedUser = v.updatedByUser;
    }
  }

  // ✅ COMPUTED FIELDS (CRITICAL FIX)
  for (const field of fields) {
    if (field.isComputed && field.formula) {
      const result = safeEvalFormula(field.formula, row);

      row[field.key] =
        result === undefined || result === null || Number.isNaN(result)
          ? field.formula
          : result;
    }
  }

  return row;
}
