import mongoose from "mongoose";
import Messages from "../models/message.model.js";
import Users from "../models/user.model.js";
import cloudinary from "../config/cloudnaryConfig.js";
import { emitToUser } from "../utils/socket.js";

const conversationKey = (a, b) => [String(a), String(b)].sort().join(":");

const canChat = async (a, b) => {
  const [first, second] = await Promise.all([
    Users.exists({
      _id: a,
      blockedUsers: { $ne: b },
    }),
    Users.exists({
      _id: b,
      blockedUsers: { $ne: a },
    }),
  ]);

  return Boolean(first && second);
};

// Save one independently encrypted history copy.
export const saveEncryptedHistory = async (req, res) => {
  try {
    const ownerId = String(req.user.userId);
    const peerId = String(req.params.peerId);

    const {
      clientMessageId,
      senderId,
      receiverId,
      ciphertext,
      messageType = "text",
      attachment,
    } = req.body || {};

    if (
      !mongoose.isValidObjectId(peerId) ||
      !mongoose.isValidObjectId(senderId) ||
      !mongoose.isValidObjectId(receiverId)
    ) {
      return res.status(400).json({
        message: "Invalid participant identifier.",
      });
    }

    // Only conversation participants can save history.
    if (
      ![String(senderId), String(receiverId)].includes(ownerId) ||
      ![String(senderId), String(receiverId)].includes(peerId) ||
      ownerId === peerId
    ) {
      return res.status(403).json({
        message: "You are not a participant in this conversation.",
      });
    }

    if (!(await canChat(ownerId, peerId))) {
      return res.status(403).json({
        message: "This conversation is unavailable.",
      });
    }

    if (
      typeof clientMessageId !== "string" ||
      !clientMessageId ||
      clientMessageId.length > 120
    ) {
      return res.status(400).json({
        message: "A valid clientMessageId is required.",
      });
    }

    if (typeof ciphertext !== "string" || ciphertext.length > 1500000) {
      return res.status(400).json({
        message: "Encrypted history payload is missing or too large.",
      });
    }

    if (!["text", "attachment"].includes(messageType)) {
      return res.status(400).json({
        message: "Invalid message type.",
      });
    }

    const record = await Messages.findOneAndUpdate(
      {
        historyOwnerId: ownerId,
        clientMessageId,
      },
      {
        $setOnInsert: {
          historyOwnerId: ownerId,
          conversationId: conversationKey(ownerId, peerId),
          senderId,
          receiverId,
          clientMessageId,
          protocol: "signal",
          storageEncryption: "AES-256-GCM-v1",
          ciphertext,
          envelopeType: "quicktalk-history-v1",
          messageType,

          attachment: attachment?.url
            ? {
                url: String(attachment.url),
                publicId: attachment.publicId
                  ? String(attachment.publicId)
                  : null,
                size: Number(attachment.size) || 0,
                encrypted: true,
              }
            : undefined,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).select("-text");

    return res.status(201).json({
      message: {
        _id: record._id,
        clientMessageId: record.clientMessageId,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json({
        duplicate: true,
        message: {
          clientMessageId: req.body?.clientMessageId,
        },
      });
    }

    console.error("saveEncryptedHistory:", error.message);

    return res.status(500).json({
      message: "Unable to save encrypted message history.",
    });
  }
};

// Retrieve encrypted history belonging to the authenticated user.
export const getEncryptedHistory = async (req, res) => {
  try {
    const ownerId = String(req.user.userId);
    const peerId = String(req.params.peerId);

    if (
      !mongoose.isValidObjectId(peerId) ||
      !(await canChat(ownerId, peerId))
    ) {
      return res.status(404).json({
        message: "Conversation unavailable.",
      });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

    const filter = {
      historyOwnerId: ownerId,
      conversationId: conversationKey(ownerId, peerId),
      deletedAt: null,
    };

    if (req.query.before && !Number.isNaN(Date.parse(req.query.before))) {
      filter.createdAt = {
        $lt: new Date(req.query.before),
      };
    }

    const rows = await Messages.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-text")
      .lean();

    return res.json({
      messages: rows.reverse(),
      nextCursor: rows.length === limit ? rows[0]?.createdAt : null,
    });
  } catch (error) {
    console.error("getEncryptedHistory:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve encrypted message history.",
    });
  }
};

// Upload an already encrypted attachment to Cloudinary.
export const uploadEncryptedAttachment = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        message: "Encrypted file is required.",
      });
    }

    if (req.file.size > 25 * 1024 * 1024) {
      return res.status(413).json({
        message: "Maximum attachment size is 25 MB.",
      });
    }

    const result = await new Promise((resolve, reject) => {
      console.log("[Attachment] Buffer length:", req.file.buffer.length);

      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "quicktalk/encrypted-attachments",
          resource_type: "raw",
        },
        (error, uploaded) => {
          console.log("[Attachment] Cloudinary callback invoked");

          if (error) {
            console.error("[Attachment] Callback error:", error);
            reject(error);
          } else {
            console.log("[Attachment] Callback success");
            resolve(uploaded);
          }
        },
      );

      stream.on("finish", () => {
        console.log("[Attachment] Stream finish event");
      });

      stream.on("close", () => {
        console.log("[Attachment] Stream close event");
      });

      stream.on("error", (error) => {
        console.error("[Attachment] Stream error:", error);
      });

      stream.end(req.file.buffer);

      console.log("[Attachment] Buffer passed to Cloudinary stream");
    });

    return res.status(201).json({
      url: result.secure_url,
      publicId: result.public_id,
      size: result.bytes,
    });
  } catch (error) {
    console.error("uploadEncryptedAttachment:", error.message);

    return res.status(500).json({
      message: "Unable to upload encrypted attachment.",
    });
  }
};

// export const uploadEncryptedAttachment = async (req, res) => {
//   console.log("[Attachment] Controller reached");

//   try {
//     if (!req.file?.buffer) {
//       console.log("[Attachment] No file received");

//       return res.status(400).json({
//         message: "Encrypted file is required.",
//       });
//     }

//     console.log("[Attachment] File received:", {
//       originalName: req.file.originalname,
//       size: req.file.size,
//       mimeType: req.file.mimetype,
//     });

//     if (req.file.size > 25 * 1024 * 1024) {
//       return res.status(413).json({
//         message: "Maximum attachment size is 25 MB.",
//       });
//     }

//     console.log("[Attachment] Starting Cloudinary upload");

//     const result = await new Promise((resolve, reject) => {
//       const stream = cloudinary.uploader.upload_stream(
//         {
//           folder: "quicktalk/encrypted-attachments",
//           resource_type: "raw",
//         },
//         (error, uploaded) => {
//           if (error) {
//             console.error("[Attachment] Cloudinary callback error:", error);
//             reject(error);
//             return;
//           }

//           console.log("[Attachment] Cloudinary upload completed");
//           resolve(uploaded);
//         },
//       );

//       stream.on("error", (error) => {
//         console.error("[Attachment] Upload stream error:", error);
//         reject(error);
//       });

//       stream.end(req.file.buffer);
//     });

//     return res.status(201).json({
//       url: result.secure_url,
//       publicId: result.public_id,
//       size: result.bytes,
//     });
//   } catch (error) {
//     console.error("[Attachment] Upload failed:", error);

//     return res.status(500).json({
//       message: "Unable to upload encrypted attachment.",
//     });
//   }
// };

export const markEncryptedMessagesDelivered = async (req, res) => {
  try {
    const ownerId = String(req.user.userId);
    const peerId = String(req.params.peerId);
    const { clientMessageIds } = req.body || {};

    if (
      !mongoose.isValidObjectId(peerId) ||
      ownerId === peerId ||
      !Array.isArray(clientMessageIds) ||
      clientMessageIds.length === 0 ||
      clientMessageIds.length > 100 ||
      clientMessageIds.some(
        (id) => typeof id !== "string" || !id || id.length > 120,
      )
    ) {
      return res.status(400).json({
        message: "Invalid delivery receipt.",
      });
    }

    if (!(await canChat(ownerId, peerId))) {
      return res.status(403).json({
        message: "This conversation is unavailable.",
      });
    }

    const now = new Date();
    const conversationId = conversationKey(ownerId, peerId);

    // Update the sender's encrypted history copy.
    const senderResult = await Messages.updateMany(
      {
        historyOwnerId: peerId,
        conversationId,
        senderId: peerId,
        receiverId: ownerId,
        clientMessageId: { $in: clientMessageIds },
        deliveredAt: null,
      },
      {
        $set: { deliveredAt: now },
      },
    );

    // Also update the recipient's own history copy.
    await Messages.updateMany(
      {
        historyOwnerId: ownerId,
        conversationId,
        senderId: peerId,
        receiverId: ownerId,
        clientMessageId: { $in: clientMessageIds },
        deliveredAt: null,
      },
      {
        $set: { deliveredAt: now },
      },
    );

    emitToUser(peerId, "message:delivered", {
      peerId: ownerId,
      clientMessageIds,
      deliveredAt: now,
    });

    return res.json({
      success: true,
      updated: senderResult.modifiedCount,
      deliveredAt: now,
    });
  } catch (error) {
    console.error("markEncryptedMessagesDelivered:", error.message);

    return res.status(500).json({
      message: "Unable to update delivery receipts.",
    });
  }
};

export const markEncryptedMessagesRead = async (req, res) => {
  try {
    const ownerId = String(req.user.userId);
    const peerId = String(req.params.peerId);
    const { clientMessageIds } = req.body || {};

    if (
      !mongoose.isValidObjectId(peerId) ||
      ownerId === peerId ||
      !Array.isArray(clientMessageIds) ||
      clientMessageIds.length === 0 ||
      clientMessageIds.length > 100 ||
      clientMessageIds.some(
        (id) => typeof id !== "string" || !id || id.length > 120,
      )
    ) {
      return res.status(400).json({
        message: "Invalid read receipt.",
      });
    }

    if (!(await canChat(ownerId, peerId))) {
      return res.status(403).json({
        message: "This conversation is unavailable.",
      });
    }

    const now = new Date();
    const conversationId = conversationKey(ownerId, peerId);

    const filter = {
      conversationId,
      senderId: peerId,
      receiverId: ownerId,
      clientMessageId: { $in: clientMessageIds },
    };

    // Update the sender's encrypted history copy.
    const senderResult = await Messages.updateMany(
      {
        ...filter,
        historyOwnerId: peerId,
        readAt: null,
      },
      {
        $set: {
          deliveredAt: now,
          readAt: now,
        },
      },
    );

    // Update the recipient's own history copy.
    await Messages.updateMany(
      {
        ...filter,
        historyOwnerId: ownerId,
        readAt: null,
      },
      {
        $set: {
          deliveredAt: now,
          readAt: now,
        },
      },
    );

    emitToUser(peerId, "message:read", {
      peerId: ownerId,
      clientMessageIds,
      readAt: now,
    });

    return res.json({
      success: true,
      updated: senderResult.modifiedCount,
      readAt: now,
    });
  } catch (error) {
    console.error("markEncryptedMessagesRead:", error.message);

    return res.status(500).json({
      message: "Unable to update read receipts.",
    });
  }
};
