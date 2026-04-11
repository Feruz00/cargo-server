'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Charts extends Model {
    static associate(models) {
      Charts.hasMany(models.ChartAxes, {
        foreignKey: 'chartId',
        as: 'axes',
      });
    }
  }

  Charts.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      type: {
        type: DataTypes.ENUM('bar', 'line', 'pie', 'area'),
        allowNull: false,
      },

      description: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: 'Charts',
      tableName: 'tbl_charts',
    }
  );

  return Charts;
};
