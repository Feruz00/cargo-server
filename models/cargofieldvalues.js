'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CargoFieldValues extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CargoFieldValues.belongsTo(models.CargoFields, {
        foreignKey: 'fieldId',
        as: 'field',
      });
      CargoFieldValues.belongsTo(models.Users, {
        foreignKey: 'createdUser',
        as: 'createdByUser',
      });
      CargoFieldValues.belongsTo(models.Users, {
        foreignKey: 'updatedUser',
        as: 'updatedByUser',
      });
    }
  }
  CargoFieldValues.init(
    {
      fieldId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      rowNum: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      rowId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      createdUser: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      updatedUser: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'CargoFieldValues',
      tableName: 'tbl_cargo_field_values',
    }
  );
  return CargoFieldValues;
};
