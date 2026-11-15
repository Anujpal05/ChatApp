
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // User whose personal encrypted history contains this message.
    historyOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },

    conversationId: {
      type: String,
      required: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    clientMessageId: {
      type: String,
      required: true,
    },

    protocol: {
      type: String,
      enum: ["signal", "legacy"],
      default: "signal",
    },

    ciphertext: {
      type: String,
      required: true,
    },

    envelopeType: {
      type: String,
      default: "AES-256-GCM",
    },

    attachment: {
      url: String,
      mimeType: String,
      size: Number,
      encrypted: {
        type: Boolean,
        default: true,
      },
    },

    deliveredAt: Date,
    readAt: Date,
    editedAt: Date,
    deletedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Prevent duplicate copies for the same history owner.
messageSchema.index(
  { historyOwnerId: 1, clientMessageId: 1 },
  { unique: true }
);

// Efficient conversation history retrieval.
messageSchema.index({
  historyOwnerId: 1,
  conversationId: 1,
  createdAt: -1,
});

export default mongoose.models.Messages ||
  mongoose.model("Messages", messageSchema);
