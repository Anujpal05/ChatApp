import mongoose from "mongoose";
import CallHistory from "../models/call.model.js";

export const addNewCall = async (req, res) => {
  try {
    const { callerId = req.user.userId, receiverId, kind, status = "accepted", durationSeconds = 0 } = req.body || {};
    if (!mongoose.isValidObjectId(callerId) || !mongoose.isValidObjectId(receiverId) || !["Audio", "Video"].includes(kind)) return res.status(400).json({ message: "Invalid call details." });
    if (![String(callerId), String(receiverId)].includes(String(req.user.userId))) return res.status(403).json({ message: "You are not a participant in this call." });
    const call = await CallHistory.create({
      callerId, receiverId, kind,
      status: ["accepted", "rejected", "missed", "ended", "failed"].includes(status) ? status : "accepted",
      startedAt: status === "accepted" ? new Date() : undefined,
      endedAt: ["rejected", "missed", "ended", "failed"].includes(status) ? new Date() : undefined,
      durationSeconds: Math.max(0, Math.min(Number(durationSeconds) || 0, 86400)),
    });
    res.status(201).json({ call });
  } catch (error) {
    res.status(500).json({ message: "Unable to save call history." });
  }
};

export const getIndividualCall = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.call_id)) return res.status(400).json({ message: "Invalid call identifier." });
    const call = await CallHistory.findOne({ _id: req.params.call_id, $or: [{ callerId: req.user.userId }, { receiverId: req.user.userId }] }).populate("callerId", "userName avatar").populate("receiverId", "userName avatar");
    if (!call) return res.status(404).json({ message: "Call not found." });
    res.json({ callDetails: call });
  } catch {
    res.status(500).json({ message: "Unable to load call details." });
  }
};

export const getAllCallDetails = async (req, res) => {
  try {
    const calls = await CallHistory.find({ $or: [{ callerId: req.user.userId }, { receiverId: req.user.userId }] })
      .populate("callerId", "userName avatar").populate("receiverId", "userName avatar")
      .sort({ createdAt: -1 }).limit(100);
    res.json({ callingHistory: calls });
  } catch {
    res.status(500).json({ message: "Unable to load call history." });
  }
};
