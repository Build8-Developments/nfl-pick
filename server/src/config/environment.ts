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
  "SESSION_SECRET",
] as const;

const optional = [
  "EMAIL_USER",
  "EMAIL_APP_PASSWORD",
  "EMAIL_FROM",
  "CLIENT_URL",
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
  SESSION_SECRET,
} = process.env as Record<(typeof required)[number], string>;

export const { EMAIL_USER, EMAIL_APP_PASSWORD, EMAIL_FROM, CLIENT_URL } =
  process.env as Record<(typeof optional)[number], string | undefined>;
