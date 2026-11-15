import mongoose from "mongoose";
import CallHistory from "../models/call.model.js";

const VALID_STATUSES = [
  "ringing",
  "accepted",
  "rejected",
  "missed",
  "ended",
  "failed",
];

const FINAL_STATUSES = ["rejected", "missed", "ended", "failed"];

export const addNewCall = async (req, res) => {
  try {
    const {
      callerId = req.user.userId,
      receiverId,
      kind,
      status = "ringing",
    } = req.body || {};

    if (
      !mongoose.isValidObjectId(callerId) ||
      !mongoose.isValidObjectId(receiverId) ||
      !["Audio", "Video"].includes(kind) ||
      !VALID_STATUSES.includes(status)
    ) {
      return res.status(400).json({ message: "Invalid call details." });
    }

    if (
      ![String(callerId), String(receiverId)].includes(String(req.user.userId))
    ) {
      return res.status(403).json({
        message: "You are not a participant in this call.",
      });
    }

    const call = await CallHistory.create({
      callerId,
      receiverId,
      kind,
      status,
      startedAt: status === "accepted" ? new Date() : undefined,
      endedAt: FINAL_STATUSES.includes(status) ? new Date() : undefined,
      durationSeconds: 0,
    });

    return res.status(201).json({ call });
  } catch (error) {
    console.error("Create call history error:", error);
    return res.status(500).json({
      message: "Unable to save call history.",
    });
  }
};

export const updateCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    const { status, durationSeconds = 0 } = req.body || {};

    if (!mongoose.isValidObjectId(callId) || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid call update." });
    }

    const call = await CallHistory.findOne({
      _id: callId,
      $or: [{ callerId: req.user.userId }, { receiverId: req.user.userId }],
    });

    if (!call) {
      return res.status(404).json({ message: "Call not found." });
    }

    // If already finalized with the same status, treat this as success.
    if (FINAL_STATUSES.includes(call.status)) {
      if (call.status === status) {
        return res.status(200).json({ call });
      }

      return res.status(409).json({
        message: "This call has already finished.",
      });
    }

    call.status = status;

    if (status === "accepted" && !call.startedAt) {
      call.startedAt = new Date();
    }

    if (FINAL_STATUSES.includes(status)) {
      call.endedAt = new Date();
      call.durationSeconds = Math.max(
        0,
        Math.min(Number(durationSeconds) || 0, 86400),
      );
    }

    await call.save();

    return res.status(200).json({ call });
  } catch (error) {
    console.error("Update call history error:", error);
    return res.status(500).json({
      message: "Unable to update call history.",
    });
  }
};

export const getIndividualCall = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.call_id)) {
      return res.status(400).json({
        message: "Invalid call identifier.",
      });
    }

    const call = await CallHistory.findOne({
      _id: req.params.call_id,
      $or: [{ callerId: req.user.userId }, { receiverId: req.user.userId }],
    })
      .populate("callerId", "userName avatar")
      .populate("receiverId", "userName avatar");

    if (!call) {
      return res.status(404).json({ message: "Call not found." });
    }

    return res.json({ callDetails: call });
  } catch (error) {
    console.error("Get individual call error:", error);
    return res.status(500).json({
      message: "Unable to load call details.",
    });
  }
};

export const getAllCallDetails = async (req, res) => {
  try {
    const calls = await CallHistory.find({
      $or: [{ callerId: req.user.userId }, { receiverId: req.user.userId }],
    })
      .populate("callerId", "userName avatar")
      .populate("receiverId", "userName avatar")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ callingHistory: calls });
  } catch (error) {
    console.error("Get call history error:", error);
    return res.status(500).json({
      message: "Unable to load call history.",
    });
  }
};
