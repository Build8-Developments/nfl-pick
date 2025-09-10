import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ApiResponse } from "../../utils/ApiResponse.js";
import multer from "multer";

// Middleware to parse multipart data and accept files without saving them
export const parseMultipartData = () => {
  return multer({
    storage: multer.memoryStorage(), // Store files in memory temporarily
    fileFilter: (req, file, cb) => {
      // Accept all files for now, we'll validate later
      cb(null, true);
    },
  }).any(); // Accept any number of files
};

// Middleware to validate multipart form data
export const validateMultipartForm = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if this is a multipart request
      const contentType = req.headers["content-type"] || "";

      if (contentType.includes("multipart/form-data")) {
        // For multipart requests, validate the form fields
        // Note: req.body will contain the form fields after multer processes it
        const formData = req.body as Record<string, any>;

        // Remove file-related fields for validation
        const avatar = formData.avatar;
        delete formData.avatar;

        const result = await schema.safeParseAsync(formData);

        if (!result.success) {
          return res
            .status(400)
            .json(
              ApiResponse.error("Validation failed", result.error.format())
            );
        }

        // Validation passed, store the validated data
        const validatedData = result.data as Record<string, any>;
        validatedData.avatar = avatar;
        req.body = validatedData;
        next();
      } else {
        // For JSON requests, validate normally
        const result = await schema.safeParseAsync(req.body);

        if (!result.success) {
          return res
            .status(400)
            .json(
              ApiResponse.error("Validation failed", result.error.format())
            );
        }

        req.body = result.data;
        next();
      }
    } catch (error: any) {
      res.status(400).json(ApiResponse.error(error.message));
    }
  };
};
