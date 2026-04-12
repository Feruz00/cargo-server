'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 🔹 USERS
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM tbl_users WHERE role = 'user'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // 🔹 FIELDS
    const fields = await queryInterface.sequelize.query(
      `SELECT id, \`key\`, type, isComputed, formula FROM tbl_cargo_fields`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // 🔹 ENUM VALUES
    const enumValues = await queryInterface.sequelize.query(
      `SELECT fieldId, name FROM tbl_cargo_field_enum_values`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // 🔹 PERMISSIONS
    const permissions = await queryInterface.sequelize.query(
      `SELECT fieldId, userId FROM tbl_cargo_field_permissions`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // =========================
    // 🔥 MAPS
    // =========================
    const fieldById = {};
    fields.forEach((f) => (fieldById[f.id] = f));

    const enumMap = {};
    enumValues.forEach((e) => {
      if (!enumMap[e.fieldId]) enumMap[e.fieldId] = [];
      enumMap[e.fieldId].push(e.name);
    });

    const userFieldsMap = {};
    permissions.forEach((p) => {
      if (!userFieldsMap[p.userId]) userFieldsMap[p.userId] = [];
      userFieldsMap[p.userId].push(p.fieldId);
    });

    // =========================
    // 🔧 HELPERS
    // =========================
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const randNum = (min, max) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    // ✅ SAFE FORMULA
    const evalFormula = (formula, data) => {
      try {
        if (!formula) return null;

        const keys = Object.keys(data);

        const values = keys.map((k) => {
          const v = Number(data[k]);
          return isNaN(v) ? 0 : v;
        });

        const result = Function(...keys, `return ${formula}`)(...values);

        if (result === null || result === undefined) return null;

        const num = Number(result);
        return isNaN(num) ? null : num;
      } catch (err) {
        return null;
      }
    };

    const rows = [];

    // =========================
    // 🚀 GENERATE DATA
    // =========================
    for (const user of users) {
      const allowedFieldIds = userFieldsMap[user.id] || [];
      if (!allowedFieldIds.length) continue;

      const totalRows = randNum(50, 100);

      for (let i = 0; i < totalRows; i++) {
        const rowId = uuidv4(); // ✅ UNIQUE ROW ID
        const rowData = {};

        // =========================
        // 🔹 BASE VALUES
        // =========================
        for (const fieldId of allowedFieldIds) {
          const field = fieldById[fieldId];
          if (!field || field.isComputed) continue;

          let value = null;

          switch (field.type) {
            case 'number':
              value = randNum(1, 1000);
              break;

            case 'text':
              if (field.key === 'tracking_number')
                value = `TRK-${user.id}-${i}`;
              else if (field.key === 'client_name')
                value = `Client ${user.id}-${i}`;
              else value = 'Test data';
              break;

            case 'date':
              value = `2026-04-${String(randNum(1, 28)).padStart(2, '0')}`;
              break;

            case 'enum':
              value = rand(enumMap[fieldId] || []);
              break;

            default:
              value = null;
          }

          rowData[field.key] = value;
        }

        // =========================
        // 🔹 COMPUTED FIELDS
        // =========================
        for (const fieldId of allowedFieldIds) {
          const field = fieldById[fieldId];
          if (!field || !field.isComputed) continue;

          const result = evalFormula(field.formula, rowData);

          rowData[field.key] = result; // ✅ store computed result
        }

        // =========================
        // 💾 SAVE ROW
        // =========================
        for (const fieldId of allowedFieldIds) {
          const field = fieldById[fieldId];
          if (!field) continue;

          let val = rowData[field.key];

          // ✅ enforce computed numeric safety
          if (field.isComputed) {
            val = val === null ? null : Number(val);
          }

          rows.push({
            rowId, // 🔥 UUID GROUP KEY
            fieldId,
            value: val === null || val === undefined ? null : String(val), // store as string
            createdUser: user.id,
            updatedUser: user.id,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // =========================
    // 🚀 INSERT
    // =========================
    await queryInterface.bulkInsert('tbl_cargo_field_values', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tbl_cargo_field_values', null, {});
  },
};
