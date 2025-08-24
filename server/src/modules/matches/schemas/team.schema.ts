import mongoose, { Schema, Document } from "mongoose";

export interface ITeam extends Document {
  srId: string;
  name: string;
  market: string;
  alias: string;
  division: {
    id: string;
    name: string;
    alias: string;
  };
  teamColors: {
    primary: string;
    secondary: string;
  };
  lastUpdated: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    srId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    market: {
      type: String,
      required: true,
    },
    alias: {
      type: String,
      required: true,
    },
    division: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      alias: {
        type: String,
        required: true,
      },
    },
    teamColors: {
      primary: {
        type: String,
        required: true,
      },
      secondary: {
        type: String,
        required: true,
      },
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "teams",
  }
);

// Indexes
TeamSchema.index({ srId: 1 });
TeamSchema.index({ alias: 1 });
TeamSchema.index({ "division.alias": 1 });

export const Team = mongoose.model<ITeam>("Team", TeamSchema);
