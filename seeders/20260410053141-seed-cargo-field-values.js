'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // ✅ users
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM tbl_users WHERE role = 'user'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // ✅ fields (with type + formula)
    const fields = await queryInterface.sequelize.query(
      `SELECT id, \`key\`, type, isComputed, formula FROM tbl_cargo_fields`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // map
    const fieldById = {};
    fields.forEach((f) => {
      fieldById[f.id] = f;
    });

    // ✅ permissions
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

    // 🎯 helpers
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

    // 🚀 generate data
    users.forEach((user) => {
      const allowedFieldIds = userFieldsMap[user.id] || [];

      const totalRows = randNum(50, 100); // 🔥 50–100 rows

      for (let rowNum = 1; rowNum <= totalRows; rowNum++) {
        const rowData = {};

        // 👉 FIRST pass: generate base fields
        allowedFieldIds.forEach((fieldId) => {
          const field = fieldById[fieldId];
          if (!field || field.isComputed) return;

          let value = null;

          switch (field.type) {
            case 'number':
              value = randNum(1, 1000);
              break;

            case 'text':
              if (field.key === 'cargo_type')
                value = rand(['Electronics', 'Food', 'Clothes']);
              else if (field.key === 'origin')
                value = rand(['China', 'USA', 'Germany']);
              else if (field.key === 'destination')
                value = rand(['Japan', 'France', 'UAE']);
              else if (field.key === 'status')
                value = rand(['Pending', 'In Transit', 'Delivered']);
              else if (field.key === 'priority')
                value = rand(['Low', 'Normal', 'High']);
              else if (field.key === 'tracking_number')
                value = `TRK-${user.id}-${rowNum}-${Date.now()}`;
              else if (field.key === 'client_name')
                value = `Client ${user.id}-${rowNum}`;
              else value = 'Sample text';
              break;

            case 'date':
              value = new Date('2026-04-01');
              break;

            default:
              value = null;
          }

          rowData[field.key] = value;
        });

        // 👉 SECOND pass: compute formula fields
        allowedFieldIds.forEach((fieldId) => {
          const field = fieldById[fieldId];
          if (!field || !field.isComputed) return;

          const computed = evalFormula(field.formula, rowData);
          rowData[field.key] = computed;
        });

        // 👉 FINAL: save to DB
        allowedFieldIds.forEach((fieldId) => {
          const field = fieldById[fieldId];
          if (!field) return;

          const value =
            rowData[field.key] !== undefined ? rowData[field.key] : null;

          rows.push({
            fieldId,
            value: value !== null ? String(value) : '',
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
