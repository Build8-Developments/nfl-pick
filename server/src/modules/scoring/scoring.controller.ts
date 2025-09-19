import type { Request, Response } from "express";
import { ScoringService } from "./scoring.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

/**
 * Calculate points for all users for a specified week
 */
export const calculateWeeklyPoints = async (req: Request, res: Response) => {
  try {
    const { week, season } = req.params;

    if (!week || !season) {
      return res
        .status(400)
        .json(ApiResponse.error("Week and season are required"));
    }

    const result = await ScoringService.calculateWeeklyPoints(
      parseInt(week),
      parseInt(season)
    );

    if (!result.success) {
      return res.status(400).json(ApiResponse.error(result.message));
    }

    return res
      .status(200)
      .json(ApiResponse.success(result.data, result.message));
  } catch (error) {
    console.error(
      "[scoring.controller] Error calculating weekly points:",
      error
    );
    return res
      .status(500)
      .json(
        ApiResponse.error("An error occurred while calculating weekly points")
      );
  }
};

/**
 * Get user's scoring for a specific week
 */
export const getUserWeekScoring = async (req: Request, res: Response) => {
  try {
    const { userId, week, season } = req.params;

    if (!userId || !week || !season) {
      return res
        .status(400)
        .json(ApiResponse.error("User ID, week, and season are required"));
    }

    const result = await ScoringService.getUserWeekScoring(
      userId,
      parseInt(week),
      parseInt(season)
    );

    if (!result.success) {
      return res
        .status(400)
        .json(
          ApiResponse.error(result.message || "Failed to retrieve user scoring")
        );
    }

    return res
      .status(200)
      .json(ApiResponse.success(result.data, result.message));
  } catch (error) {
    console.error(
      "[scoring.controller] Error getting user week scoring:",
      error
    );
    return res
      .status(500)
      .json(
        ApiResponse.error("An error occurred while retrieving user scoring")
      );
  }
};

/**
 * Get user's total season points
 */
export const getUserSeasonPoints = async (req: Request, res: Response) => {
  try {
    const { userId, season } = req.params;

    if (!userId || !season) {
      return res
        .status(400)
        .json(ApiResponse.error("User ID and season are required"));
    }

    const result = await ScoringService.getUserSeasonPoints(
      userId,
      parseInt(season)
    );

    if (!result.success) {
      return res
        .status(400)
        .json(
          ApiResponse.error(
            result.message || "Failed to retrieve user season points"
          )
        );
    }

    return res
      .status(200)
      .json(ApiResponse.success(result.data, result.message));
  } catch (error) {
    console.error(
      "[scoring.controller] Error getting user season points:",
      error
    );
    return res
      .status(500)
      .json(
        ApiResponse.error(
          "An error occurred while retrieving user season points"
        )
      );
  }
};

/**
 * Get weekly summary for all users
 */
export const getWeeklySummary = async (req: Request, res: Response) => {
  try {
    const { week, season } = req.params;

    if (!week || !season) {
      return res
        .status(400)
        .json(ApiResponse.error("Week and season are required"));
    }

    const result = await ScoringService.getWeeklySummary(
      parseInt(week),
      parseInt(season)
    );

    if (!result.success) {
      return res
        .status(400)
        .json(
          ApiResponse.error(
            result.message || "Failed to retrieve weekly summary"
          )
        );
    }

    return res
      .status(200)
      .json(ApiResponse.success(result.data, result.message));
  } catch (error) {
    console.error("[scoring.controller] Error getting weekly summary:", error);
    return res
      .status(500)
      .json(
        ApiResponse.error("An error occurred while retrieving weekly summary")
      );
  }
};
