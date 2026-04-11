const { UniqueConstraintError, DatabaseError } = require("sequelize");

const sendErrorDev = (err, req, res, next) => {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  } else if (err instanceof UniqueConstraintError) {
    return res.status(400).json({ message: "Duplicate value error" });
  } else if (err?.name === "SequelizeValidationError") {
    return res.status(400).json({ message: err.errors[0].message });
  } else if (
    err instanceof DatabaseError &&
    err.original &&
    err.original.sqlMessage
  ) {
    // Handle errors related to unknown columns
    return res.status(400).json({ message: "Invalid column in query", err });
  } else {
    // Handle other errors
    return res.status(500).json({ message: "Internal server error", err });
  }
};

const errorHandler = (err, req, res, next) => {
  console.log(err);
  return sendErrorDev(err, req, res, next);
};

module.exports = errorHandler;
