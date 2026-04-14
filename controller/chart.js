const { Op, fn, col, literal } = require('sequelize');
const { Charts, ChartAxes, CargoFieldValues } = require('../models');

const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');

exports.getCharts = catchAsync(async (req, res, next) => {
  const { range = 'all' } = req.query;

  const charts = await Charts.findAll({
    include: {
      model: ChartAxes,
      as: 'axes',
      include: {
        association: 'field',
      },
      order: [['orderIndex', 'ASC']],
    },
  });

  const result = [];

  for (const chart of charts) {
    const axes = chart.axes;
    if (!axes.length) continue;

    const pivotAttributes = axes.map((axis) => [
      literal(`
        MAX(CASE 
          WHEN fieldId = ${axis.fieldId} 
          THEN value 
        END)
      `),
      axis.field.key,
    ]);

    const where = buildDateFilter(range, axes);

    const rawRows = await CargoFieldValues.findAll({
      attributes: ['rowId', ...pivotAttributes],
      where,
      group: ['rowId'],
      raw: true,
    });

    if (!rawRows.length) {
      result.push({
        id: chart.id,
        name: chart.name,
        type: chart.type,
        data: { xAxis: [], series: [] },
      });
      continue;
    }

    const aggregated = aggregateData(axes, rawRows);
    const formatted = formatChartData(chart.type, aggregated);

    result.push({
      id: chart.id,
      name: chart.name,
      type: chart.type,
      data: formatted,
    });
  }

  res.json({ data: result });
});

exports.createChart = catchAsync(async (req, res, next) => {
  const { name, type, description, axes } = req.body;

  if (!name || !type) {
    return next(new AppError('Name and type are required', 400));
  }

  // console.log(name, type, description, axes);

  // return res.json({});

  const chart = await Charts.create({
    name,
    type,
    description,
  });

  if (axes?.length) {
    const axesData = axes.map((axis, index) => ({
      chartId: chart.id,
      fieldId: axis.fieldId,
      axisType: axis.axisType,
      aggregation: axis.aggregation || null,
      orderIndex: index,
    }));

    await ChartAxes.bulkCreate(axesData);
  }

  res.status(201).json({ chart });
});

exports.deleteChart = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const chart = await Charts.findByPk(id);

  if (!chart) {
    return next(new AppError('Chart not found', 404));
  }

  await ChartAxes.destroy({ where: { chartId: id } });
  await chart.destroy();

  res.json({ message: 'Chart deleted successfully' });
});

const buildDateFilter = (range, axes) => {
  if (!range || range === 'all') return {};

  const dateAxis = axes.find((a) => a.field.type === 'date');
  if (!dateAxis) return {};

  const now = new Date();
  let start;

  if (range === 'week') {
    start = new Date();
    start.setDate(now.getDate() - 7);
  }

  if (range === 'month') {
    start = new Date();
    start.setMonth(now.getMonth() - 1);
  }

  if (range === '3month') {
    start = new Date();
    start.setMonth(now.getMonth() - 3);
  }

  if (range === 'year') {
    start = new Date();
    start.setFullYear(now.getFullYear() - 1);
  }

  if (!start) return {};

  const dateStr = start.toISOString().slice(0, 10);

  return {
    rowId: {
      [Op.in]: literal(`(
        SELECT rowId FROM tbl_cargo_field_values
        WHERE fieldId = ${dateAxis.fieldId}
        AND STR_TO_DATE(value, '%Y-%m-%d') >= '${dateStr}'
      )`),
    },
  };
};

const aggregateData = (axes, rows) => {
  const xAxis = axes.find((a) => ['x', 'category'].includes(a.axisType));

  const yAxis = axes.find((a) => ['y', 'value'].includes(a.axisType));

  const seriesAxis = axes.find((a) => a.axisType === 'series');

  if (!xAxis || !yAxis) return {};

  const xKey = xAxis.field.key;
  const yKey = yAxis.field.key;
  const seriesKey = seriesAxis ? seriesAxis.field.key : null;

  const aggType = yAxis.aggregation || 'count';

  const result = {};

  rows.forEach((row) => {
    // 🔹 CLEAN X
    let x = row[xKey];
    if (x === null || x === 'null' || x === undefined) return;

    // 🔹 SERIES
    const s = seriesKey ? row[seriesKey] || 'Unknown' : 'default';

    if (!result[s]) result[s] = {};
    if (!result[s][x]) result[s][x] = initAgg(aggType);

    // 🔥 COUNT (MOST IMPORTANT FIX)
    if (aggType === 'count') {
      result[s][x] += 1;
      return;
    }

    // 🔹 NUMERIC VALUE
    let value = row[yKey];

    if (value === null || value === 'null' || value === undefined) {
      value = 0;
    }

    value = Number(value);
    if (isNaN(value)) value = 0;

    applyAgg(result[s][x], value, aggType);
  });

  return finalizeAgg(result, aggType);
};
const initAgg = (type) => {
  if (type === 'count') return 0;
  return { sum: 0, count: 0, min: null, max: null };
};

const applyAgg = (bucket, value, type) => {
  bucket.sum += value;
  bucket.count++;

  if (bucket.min === null || value < bucket.min) {
    bucket.min = value;
  }

  if (bucket.max === null || value > bucket.max) {
    bucket.max = value;
  }
};

const finalizeAgg = (data, type) => {
  const result = {};

  Object.keys(data).forEach((series) => {
    result[series] = {};

    Object.keys(data[series]).forEach((x) => {
      const val = data[series][x];

      if (type === 'sum') result[series][x] = val.sum;
      else if (type === 'avg') result[series][x] = val.sum / val.count;
      else if (type === 'min') result[series][x] = val.min;
      else if (type === 'max') result[series][x] = val.max;
      else result[series][x] = val;
    });
  });

  return result;
};

const formatChartData = (type, data) => {
  const categories = new Set();

  Object.values(data).forEach((series) => {
    Object.keys(series).forEach((x) => categories.add(x));
  });

  const xAxis = Array.from(categories);

  const series = Object.keys(data).map((key) => ({
    name: key === 'default' ? '' : key,
    type,
    data: xAxis.map((x) => data[key][x] || 0),
  }));

  return {
    xAxis,
    series,
  };
};
