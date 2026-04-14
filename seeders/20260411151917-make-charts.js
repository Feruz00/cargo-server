'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // ================================
    // 1. CREATE CHARTS
    // ================================
    const chartsData = [
      {
        name: 'Ýükleriň görnüşi boýunça paýlanyşy',
        type: 'pie',
        description: 'Ýük görnüşlerine görä paýlanyş',
      },
      {
        name: 'Status boýunça sanaw',
        type: 'bar',
        description: 'Ýükleriň status boýunça sany',
      },
      {
        name: 'Gün boýunça girdeji',
        type: 'line',
        description: 'Günler boýunça umumy girdeji',
      },
      {
        name: 'Üstünlik derejesine görä baha',
        type: 'bar',
        description: 'Priority boýunça jemi baha',
      },
      // {
      //   name: 'Ýurt boýunça ýük sany',
      //   type: 'bar',
      //   description: 'Gelýän ýer boýunça statistika',
      // },
    ];

    await queryInterface.bulkInsert(
      'tbl_charts',
      chartsData.map((c) => ({
        ...c,
        createdAt: now,
        updatedAt: now,
      }))
    );

    // ================================
    // 2. FETCH CHARTS + FIELDS
    // ================================
    const charts = await queryInterface.sequelize.query(
      `SELECT id, name FROM tbl_charts`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const fields = await queryInterface.sequelize.query(
      `SELECT id, \`key\` FROM tbl_cargo_fields`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const chartMap = {};
    charts.forEach((c) => (chartMap[c.name] = c.id));

    const fieldMap = {};
    fields.forEach((f) => (fieldMap[f.key] = f.id));

    const axes = [];

    // ================================
    // 3. DEFINE AXES
    // ================================

    // 🟢 PIE → cargo_type
    if (chartMap['Ýükleriň görnüşi boýunça paýlanyşy']) {
      axes.push(
        {
          chartId: chartMap['Ýükleriň görnüşi boýunça paýlanyşy'],
          fieldId: fieldMap.cargo_type,
          axisType: 'category',
          aggregation: null,
        },
        {
          chartId: chartMap['Ýükleriň görnüşi boýunça paýlanyşy'],
          fieldId: fieldMap.cargo_type,
          axisType: 'value',
          aggregation: 'count',
        }
      );
    }

    // 🟢 BAR → status
    if (chartMap['Status boýunça sanaw']) {
      axes.push(
        {
          chartId: chartMap['Status boýunça sanaw'],
          fieldId: fieldMap.status,
          axisType: 'x',
          aggregation: null,
        },
        {
          chartId: chartMap['Status boýunça sanaw'],
          fieldId: fieldMap.status,
          axisType: 'y',
          aggregation: 'count',
        }
      );
    }

    // 🟢 LINE → date vs total_price
    if (chartMap['Gün boýunça girdeji']) {
      axes.push(
        {
          chartId: chartMap['Gün boýunça girdeji'],
          fieldId: fieldMap.departure_date,
          axisType: 'x',
          aggregation: null,
        },
        {
          chartId: chartMap['Gün boýunça girdeji'],
          fieldId: fieldMap.total_price,
          axisType: 'y',
          aggregation: 'sum',
        }
      );
    }

    // 🟢 BAR → priority vs total_price
    if (chartMap['Üstünlik derejesine görä baha']) {
      axes.push(
        {
          chartId: chartMap['Üstünlik derejesine görä baha'],
          fieldId: fieldMap.priority,
          axisType: 'x',
          aggregation: null,
        },
        {
          chartId: chartMap['Üstünlik derejesine görä baha'],
          fieldId: fieldMap.total_price,
          axisType: 'y',
          aggregation: 'sum',
        }
      );
    }

    // 🟢 BAR → origin vs count
    if (chartMap['Ýurt boýunça ýük sany']) {
      axes.push(
        {
          chartId: chartMap['Ýurt boýunça ýük sany'],
          fieldId: fieldMap.origin,
          axisType: 'x',
          aggregation: null,
        },
        {
          chartId: chartMap['Ýurt boýunça ýük sany'],
          fieldId: fieldMap.origin,
          axisType: 'y',
          aggregation: 'count',
        }
      );
    }

    // ================================
    // 4. INSERT AXES
    // ================================
    await queryInterface.bulkInsert(
      'tbl_chart_axes',
      axes.map((a, index) => ({
        ...a,
        orderIndex: index,
        createdAt: now,
        updatedAt: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tbl_chart_axes', null, {});
    await queryInterface.bulkDelete('tbl_charts', null, {});
  },
};
