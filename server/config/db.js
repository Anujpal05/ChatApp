import mongoose from "mongoose";

const db = async () => {
  try {
    console.log("database connecting.....");
    console.log(process.env.MONGODB_URL);
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Database connected successfully!");
  } catch (error) {
    console.log("Database connection error!");
  }
};

export default db;
