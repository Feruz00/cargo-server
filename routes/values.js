const {
  getValues,
  create,
  deleteMany,
  deleteOne,
  update,
  getOne,
  importExcel,
  getChartData,
} = require('../controller/value');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/multer');

const router = require('express').Router();
router.use(protect);

router.route('/').get(restrictTo('user', 'head'), getValues);
router.route('/chart').get(restrictTo('head'), getChartData);
router.use(restrictTo('user'));
router.route('/').post(create).delete(deleteMany);

router.post('/import', upload.single('file'), importExcel);

router.route('/:id').get(getOne).patch(update).delete(deleteOne);

module.exports = router;
