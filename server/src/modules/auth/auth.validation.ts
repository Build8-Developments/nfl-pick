import { z } from "zod";
import { ApiResponse } from "../../utils/apiResponse.js";
import type { NextFunction, Request, Response } from "express";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const validateLogin = (schema: z.ZodSchema) => {
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

export { validateLogin, loginSchema };
