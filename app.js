require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const errorHandler = require('./utils/errorHandler');
const xss = require('xss');
const hpp = require('hpp');
const compression = require('compression');

const AppError = require('./utils/appError');

const app = express();

// app.enable('trust proxy');

app.use(cookieParser());
const allowedOrigins =
  process.env.NODE_ENV === 'production' ? '*' : ['http://localhost:5173'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(morgan('dev'));

app.use((req, res, next) => {
  if (req.body) req.body = JSON.parse(xss(JSON.stringify(req.body)));
  if (req.params) req.params = JSON.parse(xss(JSON.stringify(req.params)));
  if (req.query) {
    const sanitizedQuery = {};
    for (const key in req.query) {
      sanitizedQuery[key] = xss(req.query[key]);
    }
    req.query = sanitizedQuery;
  }
  next();
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '50mb' }));

app.use(
  hpp({
    whitelist: ['page', 'limit'],
  })
);

app.use(compression());

app.use('/api/users', require('./routes/user'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/field', require('./routes/field'));
app.use('/api/value', require('./routes/values'));
app.use('/api/charts', require('./routes/charts'));

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorHandler);

module.exports = app;
