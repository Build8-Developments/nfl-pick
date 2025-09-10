
import { IUser } from "../modules/users/user.model.js";

declare global {
  namespace Express {
    interface Request {
      session: any;
      user?: IUser;
    }
  }
  
  namespace Express.Session {
    interface SessionData {
      userId?: string;
      userRole?: string;
      token?: string;
      isAuthenticated?: boolean;
    }
  }
}

export {};
