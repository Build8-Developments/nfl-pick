import mongoose, { Schema, Document } from "mongoose";

export interface IProp extends Document {
  _id: mongoose.Types.ObjectId;

  // User who submitted the prop
  userId: mongoose.Types.ObjectId;

  // Week context
  weekId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;

  // Prop details
  prediction: string;
  category?: string;

  // Status and evaluation
  status: "pending" | "correct" | "incorrect";

  // Admin evaluation
  evaluatedBy?: mongoose.Types.ObjectId;
  evaluatedAt?: Date;
  adminNotes?: string;

  // Points (free to submit, +1 if correct)
  pointsWon: number;

  // Timing
  submittedAt: Date;
  weekEndDate: Date;
}

const PropSchema = new Schema<IProp>(
  {
    // User who submitted the prop
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    // Week context
    weekId: {
      type: Schema.Types.ObjectId,
      ref: "Week",
      required: [true, "Week ID is required"],
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: [true, "Season ID is required"],
    },

    // Prop details
    prediction: {
      type: String,
      required: [true, "Prediction is required"],
      trim: true,
      maxlength: [1000, "Prediction cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
    },

    // Status and evaluation
    status: {
      type: String,
      enum: ["pending", "correct", "incorrect"],
      default: "pending",
    },

    // Admin evaluation
    evaluatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    evaluatedAt: {
      type: Date,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Admin notes cannot exceed 500 characters"],
    },

    // Points
    pointsWon: {
      type: Number,
      default: 0,
      min: [0, "Points won cannot be negative"],
      max: [1, "Maximum points won is 1"],
    },

    // Timing
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    weekEndDate: {
      type: Date,
      required: [true, "Week end date is required"],
    },
  },
  {
    timestamps: true,
    collection: "props",
  }
);

// Indexes for performance
PropSchema.index({ userId: 1 });
PropSchema.index({ weekId: 1 });
PropSchema.index({ seasonId: 1 });
PropSchema.index({ status: 1 });
PropSchema.index({ submittedAt: 1 });

// Compound indexes for common queries
PropSchema.index({ userId: 1, weekId: 1 });
PropSchema.index({ weekId: 1, status: 1 });
PropSchema.index({ seasonId: 1, weekId: 1 });

// Unique constraint: One prop per user per week
PropSchema.index({ userId: 1, weekId: 1 }, { unique: true });

// Pre-save middleware for validation
PropSchema.pre("save", function (next) {
  // Ensure points won is 0 or 1
  if (this.pointsWon > 1) {
    this.pointsWon = 1;
  }

  next();
});

// Static method to find user's props for a week
PropSchema.statics.findUserWeekProps = function (
  userId: mongoose.Types.ObjectId,
  weekId: mongoose.Types.ObjectId
) {
  return this.find({ userId, weekId });
};

// Static method to find pending props for a week
PropSchema.statics.findPendingWeekProps = function (
  weekId: mongoose.Types.ObjectId
) {
  return this.find({ weekId, status: "pending" }).populate("userId");
};

// Static method to find evaluated props for a week
PropSchema.statics.findEvaluatedWeekProps = function (
  weekId: mongoose.Types.ObjectId
) {
  return this.find({
    weekId,
    status: { $in: ["correct", "incorrect"] },
  }).populate("userId");
};

// Method to evaluate prop
PropSchema.methods.evaluateProp = function (
  isCorrect: boolean,
  adminId: mongoose.Types.ObjectId,
  notes?: string
) {
  this.status = isCorrect ? "correct" : "incorrect";
  this.pointsWon = isCorrect ? 1 : 0;
  this.evaluatedBy = adminId;
  this.evaluatedAt = new Date();
  this.adminNotes = notes;
  this.updatedAt = new Date();
  return this.save();
};

export const Prop = mongoose.model<IProp>("Prop", PropSchema);
