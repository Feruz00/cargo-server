'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // get users
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM tbl_users WHERE role = 'user'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // get fields
    const fields = await queryInterface.sequelize.query(
      `SELECT id FROM tbl_cargo_fields`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const permissions = [];

    users.forEach((user) => {
      const count = Math.floor(Math.random() * 4) + 7;

      const shuffled = [...fields].sort(() => 0.5 - Math.random());

      const selected = shuffled.slice(0, count);

      selected.forEach((field) => {
        permissions.push({
          fieldId: field.id,
          userId: user.id,
          createdAt: now,
          updatedAt: now,
        });
      });
    });

    await queryInterface.bulkInsert('tbl_cargo_field_permissions', permissions);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tbl_cargo_field_permissions', null, {});
  },
};
