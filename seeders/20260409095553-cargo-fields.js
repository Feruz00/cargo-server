'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const fields = [
      { name: 'Weight (kg)', key: 'weight', type: 'number' },
      { name: 'Volume (m³)', key: 'volume', type: 'number' },
      { name: 'Price per kg', key: 'price_per_kg', type: 'number' },
      {
        name: 'Total Price',
        key: 'total_price',
        type: 'number',
        isComputed: true,
        formula: 'weight * price_per_kg + volume',
      },
      { name: 'Cargo Type', key: 'cargo_type', type: 'text' },
      { name: 'Origin', key: 'origin', type: 'text' },
      { name: 'Destination', key: 'destination', type: 'text' },
      { name: 'Departure Date', key: 'departure_date', type: 'date' },
      { name: 'Arrival Date', key: 'arrival_date', type: 'date' },
      { name: 'Status', key: 'status', type: 'text' },
      { name: 'Tracking Number', key: 'tracking_number', type: 'text' },
      { name: 'Client Name', key: 'client_name', type: 'text' },
      { name: 'Priority Level', key: 'priority', type: 'text' },
      { name: 'Insurance Value', key: 'insurance_value', type: 'number' },
      { name: 'Notes', key: 'notes', type: 'text' },
    ];

    await queryInterface.bulkInsert(
      'tbl_cargo_fields',
      fields.map((f) => ({
        ...f,
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
