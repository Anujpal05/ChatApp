import { generateToken } from "../auth/auth.js";
import Users from "../models/user.model.js";
import bcrypt from "bcrypt";
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

    if (existingUser) {
      const isMatch = await bcrypt.compare(password, existingUser.password);

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials!" });
      }

      const payload = {
        userName,
        userId: existingUser._id,
      };

      const token = generateToken(payload);
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      });

      return res
        .status(200)
        .json({ message: "Login Successfully!", userId: existingUser._id });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = new Users({
      userName,
      password: hashPassword,
    });

    await newUser.save();

    const payload = {
      userName,
      userId: newUser._id,
    };

    const token = generateToken(payload);
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

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

export const logOut = (req, res) => {
  try {
    res.cookie("token", "", { maxAge: 0 });
    return res.status(200).json({ message: "LogOut successfully!" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId, socketId } = req.body;
    const user_id = new mongoose.Types.ObjectId(userId);
    const use = await Users.findById(userId);
    console.log(socketId);
    console.log("Before User : ", use);
    const user = await Users.findByIdAndUpdate(
      user_id,
      { $set: { socketId: socketId } },
      { new: true }
    );

    console.log("After :", user);

    return res.status(200).json({ message: "Updating...", user });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await Users.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ message: "Retrieve all users successfully!", users });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
};

export const getUser = async (userId) => {
  try {
    const user = await Users.findById(userId).select("-password");
    return { user, success: true };
  } catch (error) {
    return { success: false };
  }
};
