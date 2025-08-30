import dotenv from "dotenv";

dotenv.config({ quiet: true });

const required = [
  "PORT",
  "NODE_ENV",
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_EXPIRATION",
  "RAPIDAPI_KEY",
  "RAPIDAPI_HOST",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const {
  PORT,
  NODE_ENV,
  MONGODB_URI,
  JWT_SECRET,
  JWT_EXPIRATION,
  RAPIDAPI_KEY,
  RAPIDAPI_HOST,
} = process.env as Record<(typeof required)[number], string>;
