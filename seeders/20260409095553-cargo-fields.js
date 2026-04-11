'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const fields = [
      { name: 'Agram (kg)', key: 'weight', type: 'number' },
      { name: 'Göwrüm (m³)', key: 'volume', type: 'number' },
      { name: '1 kg bahasy', key: 'price_per_kg', type: 'number' },

      {
        name: 'Jemi baha',
        key: 'total_price',
        type: 'number',
        isComputed: true,
        formula: 'weight * price_per_kg + volume',
      },

      { name: 'Ýük görnüşi', key: 'cargo_type', type: 'enum' },
      { name: 'Gelýän ýeri', key: 'origin', type: 'text' },
      { name: 'Barýan ýeri', key: 'destination', type: 'text' },

      { name: 'Ugradylan senesi', key: 'departure_date', type: 'date' },
      { name: 'Gelen senesi', key: 'arrival_date', type: 'date' },

      { name: 'Statusy', key: 'status', type: 'enum' },
      { name: 'Yzarlaýyş belgisi', key: 'tracking_number', type: 'text' },
      { name: 'Müşderiniň ady', key: 'client_name', type: 'text' },

      { name: 'Üstünlik derejesi', key: 'priority', type: 'enum' },

      { name: 'Ätiýaçlandyryş bahasy', key: 'insurance_value', type: 'number' },
      { name: 'Bellikler', key: 'notes', type: 'text' },
    ];

    await queryInterface.bulkInsert(
      'tbl_cargo_fields',
      fields.map((f, index) => ({
        ...f,
        orderIndex: index,
        isComputed: f.isComputed || false,
        formula: f.formula || null,
        createdAt: now,
        updatedAt: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tbl_cargo_fields', null, {});
  },
};
