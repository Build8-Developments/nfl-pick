import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRATION } from "./environment.js";
import type { ObjectId } from "mongoose";

export const generateToken = (userId: ObjectId, role: string) => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign({ id: userId, role }, JWT_SECRET as Secret, {
    expiresIn: (JWT_EXPIRATION || "7d") as SignOptions["expiresIn"],
  });
};

export const verifyToken = (token: string): jwt.JwtPayload => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.verify(token, JWT_SECRET as Secret) as jwt.JwtPayload; // returns the decoded payload and verifies the signature
};
