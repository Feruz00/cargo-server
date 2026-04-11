const { Users } = require('../models');
const jwt = require('jsonwebtoken');
const { catchAsync } = require('../utils/catchAsync');
const { cookieOptions } = require('../utils/constants');
const { compare } = require('../utils/password');

/**
 * CurrentUser
 */

exports.currentUser = catchAsync(async (req, res) => {
  res.status(200).json({
    data: req.user,
  });
});

/**
 * LOGIN
 */
exports.loginUser = catchAsync(async (req, res) => {
  const { username, password } = req.body;

  const user = await Users.findOne({ where: { username } });

  if (!user || !(await compare(user.password, password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  if (!user.isActive) {
    return res.status(400).json({ message: 'Your account stopped' });
  }

  const token = jwt.sign(
    { id: user.id, type: 'user' },
    process.env.JWT_SECRET,
    {
      expiresIn: '1d',
    }
  );

  res.cookie('user', token, cookieOptions);
  const userData = await user.toJSON();
  delete userData.password;
  res.status(200).json({
    status: 'success',
    token,
    data: userData,
  });
});

/**
 * LOGOUT
 */
exports.logoutUser = catchAsync(async (req, res) => {
  res.cookie('user', '', cookieOptions);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});
