import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const { PORT, NODE_ENV, MONGODB_URI } = process.env;
