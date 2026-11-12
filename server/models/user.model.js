import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 24, lowercase: true, index: true },
  email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
  password: { type: String, required: true, select: false },
  avatar: { type: String, default: "" },
  bio: { type: String, maxlength: 160, default: "" },
  statusText: { type: String, maxlength: 80, default: "Available" },
  signalUserId: { type: String, default: null, index: true },
  lastSeenAt: { type: Date, default: null },
  isOnline: { type: Boolean, default: false },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
}, { timestamps: true, versionKey: false });

export default mongoose.models.Users || mongoose.model("Users", userSchema);
