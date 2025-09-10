import type { Request, Response, NextFunction } from "express";
import { validateGameID, is2025SeasonGame } from "../../api/tank01.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

/**
 * Middleware to validate game ID format and 2025 season
 */
export const validateGameIDMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { gameID } = req.params;

  if (!gameID) {
    return res.status(400).json(
      ApiResponse.error("Game ID is required")
    );
  }

  if (!validateGameID(gameID)) {
    return res.status(400).json(
      ApiResponse.error(`Invalid game ID format: ${gameID}. Expected format: YYYYMMDD_TEAM@TEAM`)
    );
  }

  if (!is2025SeasonGame(gameID)) {
    return res.status(400).json(
      ApiResponse.error(`Game is not from 2025 season: ${gameID}`)
    );
  }

  next();
};

/**
 * Middleware to validate week and season parameters
 */
export const validateWeekSeasonMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { week, season } = req.query;

  if (!week || !season) {
    return res.status(400).json(
      ApiResponse.error("Week and season are required")
    );
  }

  const weekNum = parseInt(week as string);
  const seasonNum = parseInt(season as string);

  if (isNaN(weekNum) || isNaN(seasonNum)) {
    return res.status(400).json(
      ApiResponse.error("Week and season must be valid numbers")
    );
  }

  if (weekNum < 1 || weekNum > 18) {
    return res.status(400).json(
      ApiResponse.error("Week must be between 1 and 18")
    );
  }

  if (seasonNum < 2020 || seasonNum > 2030) {
    return res.status(400).json(
      ApiResponse.error("Season must be between 2020 and 2030")
    );
  }

  // Add validated values to request for use in controllers
  (req as any).validatedWeek = weekNum;
  (req as any).validatedSeason = seasonNum;

  next();
};

/**
 * Middleware to validate user ID parameter
 */
export const validateUserIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json(
      ApiResponse.error("User ID is required")
    );
  }

  if (typeof userId !== "string" || userId.trim().length === 0) {
    return res.status(400).json(
      ApiResponse.error("User ID must be a valid string")
    );
  }

  next();
};

/**
 * Rate limiting middleware for Tank01 API calls
 */
export const rateLimitTank01Middleware = (req: Request, res: Response, next: NextFunction) => {
  // Simple in-memory rate limiting (in production, use Redis)
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const clientId = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // Max 10 requests per minute per IP

  const clientData = rateLimitMap.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
    next();
  } else if (clientData.count < maxRequests) {
    clientData.count++;
    next();
  } else {
    return res.status(429).json(
      ApiResponse.error("Too many requests. Please try again later.")
    );
  }
};

/**
 * Error handling middleware for Tank01 API errors
 */
export const tank01ErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.name === "Tank01APIError") {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json(
      ApiResponse.error(error.message)
    );
  }
  
  next(error);
};
