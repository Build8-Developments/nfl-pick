import mongoose, { Schema, Document } from "mongoose";

export interface ISeason extends Document {
  srId: string;
  year: number;
  type: string;
  name: string;
  isActive: boolean;

const SeasonSchema = new Schema<ISeason>(
  {
    srId: {
      type: String,
      required: true,
      unique: true,
    },
    year: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "seasons",
  }
);

// Indexes
SeasonSchema.index({ srId: 1 });
SeasonSchema.index({ isActive: 1 });
SeasonSchema.index({ year: 1 });

export const Season = mongoose.model<ISeason>("Season", SeasonSchema);
