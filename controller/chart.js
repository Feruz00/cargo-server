const { Op, fn, col, literal } = require('sequelize');
const { Charts, ChartAxes } = require('../models');

const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');

exports.getCharts = catchAsync(async (req, res, next) => {
  let charts = await Charts.findAll({
    include: {
      model: ChartAxes,
      as: 'axes',
      attributes: ['axisType', 'fieldId', 'aggregation', 'orderIndex'],
    },
  });

  charts = charts.map((row) => row.toJSON());

  charts.forEach((chart) => {
    console.log('Name:', chart.name, chart.type);
    console.log('Axes:', chart.axes);
  });
  return res.json({});
});

exports.createChart = catchAsync(async (req, res, next) => {});

exports.deleteChart = catchAsync(async (req, res, next) => {});
