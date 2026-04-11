'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CargoFieldEnumValues extends Model {
    static associate(models) {
      CargoFieldEnumValues.belongsTo(models.CargoFields, {
        foreignKey: 'fieldId',
        as: 'field',
      });
    }
  }

  CargoFieldEnumValues.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true },
      },

      color: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isHex(value) {
            if (value && !/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
              throw new Error('Color must be valid HEX');
            }
          },
        },
      },

      fieldId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'CargoFieldEnumValues',
      tableName: 'tbl_cargo_field_enum_values',
    }
  );

  return CargoFieldEnumValues;
};
