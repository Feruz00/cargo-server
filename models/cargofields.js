'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CargoFields extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CargoFields.hasMany(models.CargoFieldValues, {
        foreignKey: 'fieldId',
        as: 'values',
      });
      CargoFields.hasMany(models.CargoFieldPermission, {
        foreignKey: 'fieldId',
        as: 'permissions',
      });
    }
  }
  CargoFields.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true },
      },

      key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          isLowercase: true,
        },
      },

      type: {
        type: DataTypes.ENUM('text', 'number', 'date', 'enum'),
        allowNull: false,
      },

      isComputed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      orderIndex: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      formula: {
        type: DataTypes.STRING,
        validate: {
          isValidFormula(value) {
            if (this.isComputed && !value) {
              throw new Error('Computed field must have formula');
            }
          },
        },
      },
    },
    {
      sequelize,
      modelName: 'CargoFields',
      tableName: 'tbl_cargo_fields',
    }
  );
  return CargoFields;
};
