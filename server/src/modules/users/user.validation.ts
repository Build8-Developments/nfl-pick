import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ApiResponse } from "../../utils/ApiResponse.js";

const createUserSchema = z.object({
  username: z.string().min(3).max(30).toLowerCase(),
  email: z.email().toLowerCase().optional(),
  passwordHash: z.string().min(8).max(30),
  avatar: z.string().optional(),
  role: z.enum(["admin", "user"]),
  points: z.number().default(0),
  totalBets: z.number().default(0),
  correctBets: z.number().default(0),
  winRate: z.number().default(0),
  bets: z.array(z.string()).default([]),
  props: z.array(z.string()).default([]),
});

const updateUserSchema = z.object({
  username: z.string().min(3).max(30).toLowerCase().optional(),
  email: z.email().toLowerCase().optional(),
  passwordHash: z.string().min(8).max(30).optional(),
  avatar: z.string().optional(),
  role: z.enum(["admin", "user"]).optional(),
  points: z.number().default(0).optional(),
  totalBets: z.number().default(0).optional(),
  correctBets: z.number().default(0).optional(),
  winRate: z.number().default(0).optional(),
  bets: z.array(z.string()).default([]).optional(),
  props: z.array(z.string()).default([]).optional(),
});

// function to validate the request body and attach it to the request object
const validateUser = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await schema.safeParseAsync(req.body);

      if (!result.success) {
        return res
          .status(400)
          .json(ApiResponse.error("Validation failed", result.error.format()));
      }

      req.body = result.data;
      next();
    } catch (error: any) {
      res.status(400).json(ApiResponse.error(error.message));
    }
  };
};

export { validateUser, createUserSchema, updateUserSchema };
