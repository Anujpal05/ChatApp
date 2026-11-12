import mongoose from "mongoose";

const db = async () => {
  if (!process.env.MONGODB_URL) throw new Error("MONGODB_URL is required");
  await mongoose.connect(process.env.MONGODB_URL, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log("MongoDB connected.");
};

export default db;
