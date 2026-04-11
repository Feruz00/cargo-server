'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tbl_cargo_field_enum_values', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      color: {
        type: Sequelize.STRING, // HEX like #FF0000
        allowNull: true,
      },

      fieldId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tbl_cargo_fields',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tbl_cargo_field_enum_values');
  },
};
