import mongoose from "mongoose";
import CallHistory from "../models/call.model.js";

export const addNewCall = async (req, res) => {
  try {
    const { callerId, receiverId, kind } = req.body;
    if (!callerId || !receiverId || !kind) {
      return res.status(400).json({ message: "Provide all required field!" });
    }

    const newCall = new CallHistory({
      callerId,
      receiverId,
      kind,
    });

    newCall.save();
    return res.status(200).json({ message: "New Call added successfully!" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
};

export const getIndividualCall = async (req, res) => {
  try {
    const { call_id } = req.params;
    console.log(call_id);
    if (!call_id) {
      return res.status(400).json({ message: "Please provide call_id!" });
    }

    const callDetails = await CallHistory.findById(call_id);

    if (!callDetails) {
      return res.status(404).json({ message: "Call details not found!" });
    }

    return res
      .status(200)
      .json({ message: "Call details found!", callDetails });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
};

export const getAllCallDetails = async (req, res) => {
  try {
    const { userid } = req.params;

    if (!userid) {
      return res.status(400).json({ message: "Please Provide userId!" });
    }

    const callingHistory = await CallHistory.find({
      $or: [{ callerId: userid }, { receiverId: userid }],
    })
      .populate("receiverId")
      .populate("callerId")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ message: "Retrieving call history!", callingHistory });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error!", error });
  }
};
