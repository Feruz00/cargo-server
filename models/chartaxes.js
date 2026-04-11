'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChartAxes extends Model {
    static associate(models) {
      ChartAxes.belongsTo(models.Charts, {
        foreignKey: 'chartId',
        as: 'chart',
      });

      ChartAxes.belongsTo(models.CargoFields, {
        foreignKey: 'fieldId',
        as: 'field',
      });
    }
  }

  ChartAxes.init(
    {
      chartId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      fieldId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      axisType: {
        type: DataTypes.ENUM('x', 'y', 'value', 'category', 'series'),
        allowNull: false,
      },

      aggregation: {
        type: DataTypes.ENUM('sum', 'avg', 'count', 'min', 'max'),
        allowNull: true,
      },

      orderIndex: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'ChartAxes',
      tableName: 'tbl_chart_axes',
    }
  );

  return ChartAxes;
};
