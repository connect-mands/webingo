import { validationResult } from "express-validator";
import { AppError } from "../utils/AppError.js";

export function validate(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return next(new AppError("Validation failed", 422, result.array()));
  }
  return next();
}

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
}

export function errorHandler(error, _req, res, _next) {
  const status = error.statusCode || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: {
      message: error.isOperational ? error.message : "Internal server error",
      details: error.details
    }
  });
}
