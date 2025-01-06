import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    socketId: {
      type: String,
    },
  },
  { timestamps: true }
);

const Users = new mongoose.model("Users", userSchema);

export default Users;
