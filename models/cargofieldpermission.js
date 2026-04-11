'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CargoFieldPermission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CargoFieldPermission.belongsTo(models.CargoFields, {
        foreignKey: 'fieldId',
        as: 'field',
      });
      CargoFieldPermission.belongsTo(models.Users, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }
  CargoFieldPermission.init(
    {
      fieldId: DataTypes.INTEGER,
      userId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'CargoFieldPermission',
      tableName: 'tbl_cargo_field_permissions',
      validate: {
        async userMustExist() {
          const { Users } = sequelize.models;

          const user = await Users.findByPk(this.userId);
          if (!user) throw new Error('User not found');
        },
      },
    }
  );
  return CargoFieldPermission;
};
