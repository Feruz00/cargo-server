const { getCharts, createChart, deleteChart } = require('../controller/chart');
const { protect, restrictTo } = require('../middleware/auth');

const router = require('express').Router();

router.use(protect, restrictTo('head'));

router.route('/').get(getCharts).post(createChart);

router.route('/:id').get(getCharts).delete(deleteChart);

module.exports = router;
