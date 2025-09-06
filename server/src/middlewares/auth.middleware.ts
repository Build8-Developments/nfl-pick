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
  // Check if user is authenticated via session
  const session = req.session as any;
  if (!session || !session.isAuthenticated) {
    return next(new AuthenticationError("Please login to view this page."));
  }

  try {
    // Verify the session token if it exists
    if (session.token) {
      const { id, role } = verifyToken(session.token);
      
      // Verify the user still exists and is active
      const user = await User.findById(id).select("-passwordHash");
      if (!user) {
        // Clear invalid session
        session.destroy(() => {});
        return next(new AuthenticationError("User not found"));
      }

      // Attach the user to the request object
      req.user = user;
      next();
    } else {
      // Fallback: try to get user from session userId
      if (session.userId) {
        const user = await User.findById(session.userId).select("-passwordHash");
        if (!user) {
          session.destroy(() => {});
          return next(new AuthenticationError("User not found"));
        }
        req.user = user;
        next();
      } else {
        return next(new AuthenticationError("Invalid session"));
      }
    }
  } catch (error: any) {
    // Clear invalid session on any error
    session.destroy(() => {});
    
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
  const user = req.user;

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
