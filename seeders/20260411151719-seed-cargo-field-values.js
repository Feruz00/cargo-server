'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const users = await queryInterface.sequelize.query(
      `SELECT id FROM tbl_users WHERE role = 'user'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const fields = await queryInterface.sequelize.query(
      `SELECT id, \`key\`, type, isComputed, formula FROM tbl_cargo_fields`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const enumValues = await queryInterface.sequelize.query(
      `SELECT fieldId, name FROM tbl_cargo_field_enum_values`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // 👉 maps
    const fieldById = {};
    fields.forEach((f) => (fieldById[f.id] = f));

    const enumMap = {};
    enumValues.forEach((e) => {
      if (!enumMap[e.fieldId]) enumMap[e.fieldId] = [];
      enumMap[e.fieldId].push(e.name);
    });

    const permissions = await queryInterface.sequelize.query(
      `SELECT fieldId, userId FROM tbl_cargo_field_permissions`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const userFieldsMap = {};
    permissions.forEach((p) => {
      if (!userFieldsMap[p.userId]) userFieldsMap[p.userId] = [];
      userFieldsMap[p.userId].push(p.fieldId);
    });

    const rows = [];

    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randNum = (min, max) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    const evalFormula = (formula, data) => {
      try {
        return Function(
          ...Object.keys(data),
          `return ${formula}`
        )(...Object.values(data));
      } catch {
        return null;
      }
    };

    users.forEach((user) => {
      const allowedFieldIds = userFieldsMap[user.id] || [];
      const totalRows = randNum(50, 100);

      for (let rowNum = 1; rowNum <= totalRows; rowNum++) {
        const rowData = {};

        // ✅ base values
        allowedFieldIds.forEach((fieldId) => {
          const field = fieldById[fieldId];
          if (!field || field.isComputed) return;

          let value = null;

          switch (field.type) {
            case 'number':
              value = randNum(1, 1000);
              break;

            case 'text':
              if (field.key === 'tracking_number')
                value = `TRK-${user.id}-${rowNum}`;
              else if (field.key === 'client_name')
                value = `Müşderi ${user.id}-${rowNum}`;
              else value = 'Test maglumat';
              break;

            case 'date':
              value = new Date('2026-04-01');
              break;

            case 'enum':
              value = rand(enumMap[fieldId] || []);
              break;

            default:
              value = null;
          }

          rowData[field.key] = value;
        });

        // ✅ computed
        allowedFieldIds.forEach((fieldId) => {
          const field = fieldById[fieldId];
          if (!field || !field.isComputed) return;

          rowData[field.key] = evalFormula(field.formula, rowData);
        });

        // ✅ save
        allowedFieldIds.forEach((fieldId) => {
          const field = fieldById[fieldId];
          if (!field) return;

          rows.push({
            fieldId,
            value:
              rowData[field.key] !== undefined
                ? String(rowData[field.key])
                : '',
            rowNum,
            createdUser: user.id,
            updatedUser: user.id,
            createdAt: now,
            updatedAt: now,
          });
        });
      }
    });

    await queryInterface.bulkInsert('tbl_cargo_field_values', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tbl_cargo_field_values', null, {});
  },
};
