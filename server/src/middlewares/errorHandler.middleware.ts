import { type Request, type Response, type NextFunction } from "express";
import { NODE_ENV } from "../config/environment.js";
import mongoose from "mongoose";
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from "../utils/errors.js";

// Error Handler Middleware
const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors)
      .map((val: any) => val.message)
      .join(", ");
    error = new ValidationError(message);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new ConflictError(message);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new ValidationError(message);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new AuthenticationError("Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    error = new AuthenticationError("Token expired");
  }

  // Multer errors (file upload)
  if (err.code === "LIMIT_FILE_SIZE") {
    error = new ValidationError("File too large");
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    error = new ValidationError("Unexpected file field");
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  // Error response
  const errorResponse: any = {
    success: false,
    error: {
      message,
      statusCode,
    },
  };

  // Add stack trace in development
  if (NODE_ENV === "development") {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = {
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    };
  }

  // Add additional details for validation errors
  if (error instanceof ValidationError && err.errors) {
    errorResponse.error.details = err.errors;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response) => {
  throw new NotFoundError(`Route ${req.originalUrl} not found`);
};

export default errorHandler;
