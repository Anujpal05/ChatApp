import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, index: true },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ["image", "video"], default: "image" },
  caption: { type: String, maxlength: 240, default: "" },
  audience: { type: String, enum: ["contacts", "public"], default: "contacts" },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  viewers: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users" }, viewedAt: Date }],
}, { timestamps: true, versionKey: false });

export default mongoose.models.Story || mongoose.model("Story", storySchema);
