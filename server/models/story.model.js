
import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      maxlength: 240,
      default: "",
    },
    // Currently visible to all authenticated, non-blocked users.
    audience: {
      type: String,
      enum: ["public"],
      default: "public",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    viewers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true, versionKey: false },
);

storySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Story ||
  mongoose.model("Story", storySchema);
