import dotenv from "dotenv";

dotenv.config({ quiet: true });

const required = [
  "PORT",
  "NODE_ENV",
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_EXPIRATION",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const { PORT, NODE_ENV, MONGODB_URI, JWT_SECRET, JWT_EXPIRATION } =
  process.env as Record<(typeof required)[number], string>;
