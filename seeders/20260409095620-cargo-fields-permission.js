'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 🔹 get all users with role 'user'
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM tbl_users WHERE role = 'user'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // 🔹 get all fields
    const fields = await queryInterface.sequelize.query(
      `SELECT id FROM tbl_cargo_fields`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const permissions = [];

    // ✅ give ALL fields to ALL users
    users.forEach((user) => {
      fields.forEach((field) => {
        permissions.push({
          fieldId: field.id,
          userId: user.id,
          createdAt: now,
          updatedAt: now,
        });
      });
    });

    // 🔥 bulk insert
    await queryInterface.bulkInsert('tbl_cargo_field_permissions', permissions);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tbl_cargo_field_permissions', null, {});
  },
};
