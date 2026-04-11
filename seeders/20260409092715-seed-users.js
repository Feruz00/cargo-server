'use strict';

const { toHash } = require('../utils/password');

module.exports = {
  async up(queryInterface) {
    const password = await toHash('test12345');
    const now = new Date();

    const users = [
      { name: 'Head', username: 'head', role: 'head' },

      ...Array.from({ length: 3 }).map((_, i) => ({
        name: `Admin ${i + 1}`,
        username: `admin${i + 1}`,
        role: 'admin',
      })),

      ...Array.from({ length: 20 }).map((_, i) => ({
        name: `User ${i + 1}`,
        username: `user${i + 1}`,
        role: 'user',
      })),
    ].map((u) => ({
      ...u,
      password,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));

    await queryInterface.bulkInsert('tbl_users', users);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tbl_users', null, {});
  },
};
