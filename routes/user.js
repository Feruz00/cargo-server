const {
  getAllUsers,
  createUser,
  deleteUsers,
  deleteUser,
  updateUser,
  getOneUser,
  myFields,
} = require('../controller/user');
const { protect, restrictTo } = require('../middleware/auth');

const router = require('express').Router();

router.use(protect);
router.route('/fields').get(myFields);

router.route('/').get(restrictTo('admin', 'head'), getAllUsers);
router.use(restrictTo('admin'));
router.route('/').post(createUser).delete(deleteUsers);

router.route('/:id').get(getOneUser).patch(updateUser).delete(deleteUser);

module.exports = router;
