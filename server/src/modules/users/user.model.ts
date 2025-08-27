import bcrypt from "bcryptjs";
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  avatar: string;
  role: "admin" | "user";

  points?: number;
  totalBets?: number;
  correctBets?: number;
  winRate?: number;

  bets?: mongoose.Types.ObjectId[];
  props?: mongoose.Types.ObjectId[];

  _createdAt?: Date;
  _updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },

    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
    },

    avatar: {
      type: String,
      default: "https://placehold.co/64x64",
    },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },

    points: {
      type: Number,
      default: 100,
      min: [0, "Points cannot be negative"],
    },

    totalBets: {
      type: Number,
      default: 0,
      min: [0, "Total bets cannot be negative"],
    },

    correctBets: {
      type: Number,
      default: 0,
      min: [0, "Correct bets cannot be negative"],
    },

    winRate: {
      type: Number,
      default: 0,
      min: [0, "Win rate cannot be negative"],
      max: [100, "Win rate cannot exceed 100%"],
    },

    bets: [
      {
        type: Schema.Types.ObjectId,
        ref: "Bet",
      },
    ],

    props: [
      {
        type: Schema.Types.ObjectId,
        ref: "Prop",
      },
    ],
  },
  {
    timestamps: true,
    collection: "users",
  }
);

UserSchema.index({ points: -1 });
UserSchema.index({ role: 1 });

UserSchema.virtual("calculatedWinRate").get(function () {
  if (!this.totalBets || this.totalBets === 0) return 0;
  return Math.round(((this.correctBets || 0) / this.totalBets) * 100);
});

UserSchema.methods.addPoints = function (amount: number): Promise<void> {
  this.points += amount;
  return this.save();
};

UserSchema.methods.deductPoints = function (amount: number): Promise<void> {
  if (this.points < amount) {
    throw new Error("Insufficient points");
  }
  this.points -= amount;
  return this.save();
};

UserSchema.methods.addBet = function (
  betId: mongoose.Types.ObjectId
): Promise<void> {
  this.bets.push(betId);
  this.totalBets += 1;
  return this.save();
};

UserSchema.methods.addProp = function (
  propId: mongoose.Types.ObjectId
): Promise<void> {
  this.props.push(propId);
  return this.save();
};

UserSchema.statics.findByUsername = function (username: string) {
  return this.findOne({ username: username.toLowerCase() });
};

UserSchema.statics.getLeaderboard = function (limit: number = 10) {
  return this.find({ role: "user" })
    .sort({ points: -1 })
    .limit(limit)
    .select("username points totalBets correctBets winRate");
};

UserSchema.pre("save", async function (next) {
  if (this.totalBets && this.totalBets > 0) {
    this.winRate = Math.round(((this.correctBets || 0) / this.totalBets) * 100);
  }

  if (this.isModified("passwordHash")) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});

export const User = mongoose.model<IUser>("User", UserSchema);

export default User;
