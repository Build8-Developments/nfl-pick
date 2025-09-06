export interface IUser {
  username: string;
  passwordHash: string;
  avatar: string;
  role: "admin" | "user";
  email?: string;

  points?: number;
  totalBets?: number;
  correctBets?: number;
  winRate?: number;

  bets?: string[];
  props?: string[];

  _createdAt?: Date;
  _updatedAt?: Date;
}
