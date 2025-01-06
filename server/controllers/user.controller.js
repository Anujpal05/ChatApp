import Users from "../models/user.model.js";
import { io } from "../index.js";
import mongoose from "mongoose";

export const registerUser = async (req, res) => {
  try {
    const { userName, password } = req.body;

    if (!userName || !password) {
      return res
        .status(404)
        .json({ message: "Please provide all required field!" });
    }

    if (userName.length < 5) {
      return res
        .status(400)
        .json({ message: "Username must be greater than 4!" });
    }

    if (password.length < 5) {
      return res
        .status(400)
        .json({ message: "Password must be greater than 4!" });
    }

    const existingUser = await Users.findOne({ userName });

    res.cookie("userName", userName);
    if (existingUser) {
      return res
        .status(200)
        .json({ message: "Login Successfully!", userId: existingUser._id });
    }

    const userId = Date.now();

    const newUser = new Users({
      userName,
      password,
    });

    await newUser.save();

    return res.status(200).json({
      message: "New user register successfully!",
      userId: newUser._id,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Internal server error!", error: error });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId, socketId } = req.body;
    const user_id = new mongoose.Types.ObjectId(userId);
    const user = await Users.findByIdAndUpdate(
      user_id,
      { $set: { socketId: socketId } },
      { new: true }
    );

    return res.status(200).json({ message: "Updating...", user });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const users = await Users.find().sort({ createdAt: -1 });
    return res
      .status(200)
      .json({ message: "Retrieve all users successfully!", users });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
};

export const getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(userId);
    const user = await Users.findById(userId);
    return res.status(200).json({ message: "Retrieve user details!", user });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
};
