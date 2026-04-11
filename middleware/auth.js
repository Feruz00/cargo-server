const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { Users } = require('../models');
const { catchAsync } = require('../utils/catchAsync');
const { cookieOptions } = require('../utils/constants');
const AppError = require('../utils/appError');

const protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.user) {
    token = req.cookies.user;
  }

  if (!token) {
    res.clearCookie('user', cookieOptions);

    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (err) {
    res.clearCookie('user', cookieOptions);
    return next(
      new AppError('Token is invalid or expired. Please login again.', 401)
    );
  }
  let currentUser;
  currentUser = await Users.findByPk(decoded.id, {
    attributes: { exclude: ['password'] },
  });

  if (!currentUser) {
    res.clearCookie('user', cookieOptions);

    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  await currentUser.update({ last_login: new Date() });
  currentUser = await currentUser.toJSON();

  req.user = currentUser;

  next();
});

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }

    return next();
  };
};

module.exports = { protect, restrictTo };
