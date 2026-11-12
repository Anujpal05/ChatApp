import mongoose from "mongoose";
import Story from "../models/story.model.js";

export const listStories = async (req, res) => {
  try {
    const stories = await Story.find({ expiresAt: { $gt: new Date() }, userId: { $ne: req.user.userId }, audience: "public" })
      .populate("userId", "userName avatar").sort({ createdAt: -1 }).limit(100).lean();
    res.json({ stories });
  } catch {
    res.status(500).json({ message: "Unable to load stories." });
  }
};

export const createStory = async (req, res) => {
  try {
    const { mediaUrl, mediaType = "image", caption = "" } = req.body || {};
    if (typeof mediaUrl !== "string" || !/^https:\/\//i.test(mediaUrl) || mediaUrl.length > 2048) return res.status(400).json({ message: "A secure media URL is required." });
    if (!["image", "video"].includes(mediaType)) return res.status(400).json({ message: "Unsupported story media type." });
    const story = await Story.create({ userId: req.user.userId, mediaUrl, mediaType, caption: String(caption).slice(0, 240), audience: "public", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    res.status(201).json({ story });
  } catch {
    res.status(500).json({ message: "Unable to publish story." });
  }
};

export const viewStory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid story." });
    const story = await Story.findOneAndUpdate({ _id: req.params.id, expiresAt: { $gt: new Date() }, userId: { $ne: req.user.userId }, audience: "public" }, { $addToSet: { viewers: { userId: req.user.userId, viewedAt: new Date() } } }, { new: true });
    if (!story) return res.status(404).json({ message: "Story unavailable." });
    res.json({ viewed: true });
  } catch {
    res.status(500).json({ message: "Unable to record story view." });
  }
};
