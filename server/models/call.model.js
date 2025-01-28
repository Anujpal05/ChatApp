import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    callerId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    receiverId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    kind: {
      type: String,
      enum: ["Audio", "Video"],
      required: true,
    },
  },
  { timestamps: true }
);

const CallHistory = new mongoose.model("CallHistory", callSchema);

export default CallHistory;
