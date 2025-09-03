import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import Pick from "./pick.model.js";

export const getMyPickByWeek = async (req: Request, res: Response) => {
  const userId = (req as any).user?._id as string;
  const week = Number(req.params.week);
  const pick = await Pick.findOne({ user: userId, week });
  return res.status(200).json(ApiResponse.success(pick));
};

export const upsertMyPick = async (req: Request, res: Response) => {
  const userId = (req as any).user?._id as string;
  const { week, selections, lockOfWeek, touchdownScorer, propBet, propBetOdds, isFinalized } = req.body as any;
  const updated = await Pick.findOneAndUpdate(
    { user: userId, week: Number(week) },
    { selections, lockOfWeek, touchdownScorer, propBet, propBetOdds, isFinalized },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return res.status(200).json(ApiResponse.success(updated, "Picks saved"));
};

export const deleteMyPick = async (req: Request, res: Response) => {
  const userId = (req as any).user?._id as string;
  const week = Number(req.params.week);
  await Pick.findOneAndDelete({ user: userId, week });
  return res.status(200).json(ApiResponse.success(null, "Picks deleted"));
};


