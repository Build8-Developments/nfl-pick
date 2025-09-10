import type { Request, Response } from "express";
import Pick from "../picks/pick.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const resolveProps = async (req: Request, res: Response) => {
  const { pickIds } = (req.body || {}) as { pickIds?: string[] };
  if (!Array.isArray(pickIds) || pickIds.length === 0) {
    return res.status(400).json(ApiResponse.error("pickIds required"));
  }
  await Pick.updateMany(
    { _id: { $in: pickIds } },
    { $set: { propBetResolved: true, propBetCorrect: true } }
  );
  res.json(ApiResponse.success(null, "Props resolved"));
};


