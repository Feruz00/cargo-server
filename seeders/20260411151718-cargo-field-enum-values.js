'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const fields = await queryInterface.sequelize.query(
      `SELECT id, \`key\` FROM tbl_cargo_fields WHERE type = 'enum'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const fieldMap = {};
    fields.forEach((f) => {
      fieldMap[f.key] = f.id;
    });

    const enumValues = [];

    // 🎯 Ýük görnüşi
    if (fieldMap.cargo_type) {
      enumValues.push(
        { name: 'Elektronika', color: '#1890ff', fieldId: fieldMap.cargo_type },
        { name: 'Iýmit', color: '#52c41a', fieldId: fieldMap.cargo_type },
        { name: 'Geýim', color: '#fa8c16', fieldId: fieldMap.cargo_type }
      );
    }

    // 🎯 Status
    if (fieldMap.status) {
      enumValues.push(
        { name: 'Garaşylýar', color: '#faad14', fieldId: fieldMap.status },
        { name: 'Ýolda', color: '#1890ff', fieldId: fieldMap.status },
        { name: 'Eltildi', color: '#52c41a', fieldId: fieldMap.status }
      );
    }

    // 🎯 Priority
    if (fieldMap.priority) {
      enumValues.push(
        { name: 'Pes', color: '#52c41a', fieldId: fieldMap.priority },
        { name: 'Orta', color: '#faad14', fieldId: fieldMap.priority },
        { name: 'Ýokary', color: '#f5222d', fieldId: fieldMap.priority }
      );
    }

    await queryInterface.bulkInsert(
      'tbl_cargo_field_enum_values',
      enumValues.map((e) => ({
        ...e,
        createdAt: now,
        updatedAt: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tbl_cargo_field_enum_values', null, {});
  },
};
