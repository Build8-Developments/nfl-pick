import { type Request, type Response, type NextFunction } from "express";
import { NODE_ENV } from "../config/environment.js";

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = res.statusCode || 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorHandler;
