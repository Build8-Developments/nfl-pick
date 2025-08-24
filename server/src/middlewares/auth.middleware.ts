import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../config/jwt.js";
import User, { type IUser } from "../modules/users/user.model.js";
import { NODE_ENV } from "../config/environment.js";
import {
  AuthenticationError,
  AuthorizationError,
  InternalServerError,
} from "../utils/errors.js";

const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AuthenticationError("Please login to view this page."));
  }

  try {
    const { id, role } = verifyToken(token);
    const user = await User.findById(id).select("-passwordHash");

    if (!user) {
      return next(new AuthenticationError("Unauthorized"));
    }

    // attach the user to the request object
    (req as Request & { user: IUser }).user = user;
    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return next(new AuthenticationError("Invalid token"));
    } else if (error.name === "TokenExpiredError") {
      return next(new AuthenticationError("Token expired"));
    } else {
      return next(new InternalServerError("Internal server error"));
    }
  }
};

const protectAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as Request & { user?: IUser }).user;

  if (NODE_ENV === "production") {
    if (!user || user.role !== "admin") {
      return next(new AuthorizationError("Forbidden"));
    }
  }

  // development: allow all
  console.log(
    `Passed admin protection on ${req.method} ${req.originalUrl} by ${
      user?.username || "unknown"
    }`
  );
  return next();
};

export { protect, protectAdmin };
