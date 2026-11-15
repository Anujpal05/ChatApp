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

    // Type of message stored in encrypted history.
    messageType: {
      type: String,
      enum: ["text", "attachment"],
      default: "text",
    },

    // Encrypted archive payload. Never store plaintext here.
    ciphertext: {
      type: String,
      required: true,
    },

    storageEncryption: {
      type: String,
      default: "AES-256-GCM-v1",
    },

    envelopeType: {
      type: String,
      default: "quicktalk-history-v1",
    },

    attachment: {
      url: String,
      publicId: String,
      mimeType: String,
      size: Number,
      encrypted: {
        type: Boolean,
        default: true,
      },
    },

    // Delivery and read receipts.
    deliveredAt: Date,
    readAt: Date,

    // Message editing and deletion.
    editedAt: Date,

    // Delete-for-me applies only to this history owner's copy.
    hiddenAt: Date,

    // Delete-for-everyone applies to both participants' copies.
    deletedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Prevent duplicate copies for the same history owner.
messageSchema.index(
  { historyOwnerId: 1, clientMessageId: 1 },
  { unique: true },
);

// Efficient conversation history retrieval.
messageSchema.index({
  historyOwnerId: 1,
  conversationId: 1,
  createdAt: -1,
});

export default mongoose.models.Messages ||
  mongoose.model("Messages", messageSchema);
