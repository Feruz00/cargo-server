const {
  getAllFields,
  createField,
  deleteFields,
  deleteField,
  updateField,
  getOneField,
  updateFieldOrder,
} = require('../controller/field');
const { protect, restrictTo } = require('../middleware/auth');

const router = require('express').Router();

router.use(protect);

router.route('/').get(restrictTo('admin', 'head'), getAllFields);

router.use(protect, restrictTo('admin'));
router.route('/').post(createField).delete(deleteFields).put(updateFieldOrder);

router.route('/:id').get(getOneField).patch(updateField).delete(deleteField);

module.exports = router;
