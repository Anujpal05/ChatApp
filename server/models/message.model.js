import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, index: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, index: true },
  clientMessageId: { type: String, required: true },
  protocol: { type: String, enum: ["signal", "legacy"], default: "legacy" },
  ciphertext: { type: String, default: null },
  envelopeType: { type: String, default: null },
  // Legacy field is retained only for explicitly enabled local migration/demo mode.
  text: { type: String, default: null, select: false },
  attachment: {
    url: String,
    mimeType: String,
    size: Number,
    encrypted: { type: Boolean, default: true },
  },
  deliveredAt: Date,
  readAt: Date,
  editedAt: Date,
  deletedAt: Date,
}, { timestamps: true, versionKey: false });

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1, clientMessageId: 1 }, { unique: true });

export default mongoose.models.Messages || mongoose.model("Messages", messageSchema);
