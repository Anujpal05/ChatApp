import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  callerId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, index: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, index: true },
  kind: { type: String, enum: ["Audio", "Video"], required: true },
  status: { type: String, enum: ["ringing", "accepted", "rejected", "missed", "ended", "failed"], default: "ringing" },
  startedAt: Date,
  endedAt: Date,
  durationSeconds: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

export default mongoose.models.CallHistory || mongoose.model("CallHistory", callSchema);
