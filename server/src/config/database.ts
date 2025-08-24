import mongoose from "mongoose";

const connectDB = async (URI: string, env: string) => {
  try {
    await mongoose.connect(URI);
    console.log(`Connected to MongoDB in ${env} mode`);
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
    process.exit(1);
  }
};

export default connectDB;
