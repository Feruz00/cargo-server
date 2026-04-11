'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tbl_chart_axes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      chartId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tbl_charts',
          key: 'id',
        },
        onDelete: 'CASCADE',
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

      axisType: {
        type: Sequelize.ENUM('x', 'y', 'value', 'category', 'series'),
        allowNull: false,
      },

      aggregation: {
        type: Sequelize.ENUM('sum', 'avg', 'count', 'min', 'max'),
        allowNull: true,
      },

      orderIndex: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tbl_chart_axes');
  },
};
