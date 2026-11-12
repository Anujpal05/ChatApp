import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Users from "../models/user.model.js";
import { createAccessToken, setAuthCookie, clearAuthCookie } from "../auth/auth.js";

const publicUser = (user) => ({
  _id: user._id,
  userName: user.userName,
  email: user.email,
  avatar: user.avatar,
  bio: user.bio,
  statusText: user.statusText,
  signalUserId: user.signalUserId,
  isOnline: user.isOnline,
  lastSeenAt: user.lastSeenAt,
  createdAt: user.createdAt,
});

export const registerUser = async (req, res) => {
  try {
    const { userName, password, email } = req.body || {};
    const normalized = String(userName || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(normalized)) return res.status(400).json({ message: "Username must be 3–24 characters using letters, numbers or underscores." });
    if (typeof password !== "string" || password.length < 10 || password.length > 128) return res.status(400).json({ message: "Password must contain at least 10 characters." });
    if (email && (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return res.status(400).json({ message: "Enter a valid email address." });
    if (await Users.findOne({ userName: { $regex: `^${normalized}$`, $options: "i" } })) return res.status(409).json({ message: "That username is already taken." });
    if (email && await Users.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: "That email is already registered." });
    const user = await Users.create({ userName: normalized, email: email?.toLowerCase(), password: await bcrypt.hash(password, 12) });
    setAuthCookie(res, createAccessToken(user));
    return res.status(201).json({ message: "Welcome to QuickTalk.", user: publicUser(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Username or email already exists." });
    console.error("registerUser:", error.message);
    return res.status(500).json({ message: "Unable to create account." });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body || {};
    const normalized = String(userName || "").trim().toLowerCase();
    const user = await Users.findOne({ userName: { $regex: `^${normalized}$`, $options: "i" } }).select("+password");
    const valid = user && typeof password === "string" && await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid username or password." });
    setAuthCookie(res, createAccessToken(user));
    return res.status(200).json({ message: "Signed in successfully.", user: publicUser(user) });
  } catch (error) {
    console.error("loginUser:", error.message);
    return res.status(500).json({ message: "Unable to sign in." });
  }
};

export const logOut = (_req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({ message: "Signed out successfully." });
};

export const getMe = async (req, res) => {
  try {
    const user = await Users.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "Account not found." });
    return res.json({ user: publicUser(user) });
  } catch {
    return res.status(500).json({ message: "Unable to load account." });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const self = await Users.findById(req.user.userId).select("blockedUsers").lean();
    const excluded = [req.user.userId, ...(self?.blockedUsers || [])];
    const users = await Users.find({ _id: { $nin: excluded }, blockedUsers: { $ne: req.user.userId } })
      .select("userName avatar bio statusText signalUserId isOnline lastSeenAt")
      .sort({ isOnline: -1, userName: 1 })
      .limit(200).lean();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Unable to retrieve users." });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const allowed = ["avatar", "bio", "statusText"];
    const update = {};
    for (const key of allowed) if (typeof req.body?.[key] === "string") update[key] = req.body[key].slice(0, key === "bio" ? 160 : 500);
    const user = await Users.findByIdAndUpdate(req.user.userId, { $set: update }, { new: true, runValidators: true });
    res.json({ user: publicUser(user) });
  } catch {
    res.status(400).json({ message: "Unable to update profile." });
  }
};

export const updateSignalIdentity = async (req, res) => {
  try {
    const signalUserId = String(req.body?.signalUserId || "").trim();
    if (!signalUserId || signalUserId.length > 128) return res.status(400).json({ message: "A valid Signal relay identity is required." });
    const user = await Users.findByIdAndUpdate(req.user.userId, { $set: { signalUserId } }, { new: true });
    if (!user) return res.status(404).json({ message: "Account not found." });
    res.json({ signalUserId: user.signalUserId });
  } catch {
    res.status(500).json({ message: "Unable to save Signal identity." });
  }
};

export const updateUser = async (req, res) => {
  if (req.body?.userId && String(req.body.userId) !== String(req.user.userId)) return res.status(403).json({ message: "Forbidden." });
  return updateProfile(req, res);
};

export const getUser = async (userId) => {
  try {
    if (!mongoose.isValidObjectId(userId)) return { success: false };
    const user = await Users.findById(userId).select("-password");
    return { user, success: Boolean(user) };
  } catch { return { success: false }; }
};
