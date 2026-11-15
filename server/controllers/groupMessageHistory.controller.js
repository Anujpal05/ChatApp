
import mongoose from "mongoose";
import Messages from "../models/message.model.js";
import Group from "../models/group.model.js";

const isValidId = (id) => mongoose.isValidObjectId(id);

const getActiveGroupForMember = async (groupId, userId) => {
  if (!isValidId(groupId)) return null;

  return Group.findOne({
    _id: groupId,
    isActive: true,
    "members.userId": userId,
  });
};

// Save one independently encrypted copy for the authenticated member.
export const saveGroupEncryptedHistory = async (req, res) => {
  try {
    const ownerId = String(req.user.userId);
    const groupId = String(req.params.groupId);

    const {
      clientMessageId,
      senderId,
      ciphertext,
      messageType = "text",
      attachment,
    } = req.body || {};

    if (!isValidId(groupId) || !isValidId(senderId)) {
      return res.status(400).json({
        message: "Invalid group or sender identifier.",
      });
    }

    const group = await getActiveGroupForMember(groupId, ownerId);

    if (!group) {
      return res.status(403).json({
        message: "You are not an active member of this group.",
      });
    }

    // The message sender must also be a current group member.
    const senderIsMember = group.members.some(
      (member) => String(member.userId) === String(senderId),
    );

    if (!senderIsMember) {
      return res.status(403).json({
        message: "The sender is not an active group member.",
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

    if (
      typeof ciphertext !== "string" ||
      !ciphertext ||
      ciphertext.length > 1500000
    ) {
      return res.status(400).json({
        message: "Encrypted history payload is missing or too large.",
      });
    }

    if (!["text", "attachment"].includes(messageType)) {
      return res.status(400).json({
        message: "Invalid message type.",
      });
    }

    if (
      messageType === "attachment" &&
      (!attachment?.url || attachment.encrypted !== true)
    ) {
      return res.status(400).json({
        message: "A valid encrypted attachment is required.",
      });
    }

    const conversationId = `group:${groupId}`;

    const record = await Messages.findOneAndUpdate(
      {
        historyOwnerId: ownerId,
        clientMessageId,
      },
      {
        $setOnInsert: {
          historyOwnerId: ownerId,
          conversationType: "group",
          groupId,
          conversationId,
          senderId,
          receiverId: null,
          clientMessageId,
          protocol: "signal",
          storageEncryption: "AES-256-GCM-v1",
          ciphertext,
          envelopeType: "quicktalk-group-history-v1",
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

    console.error("saveGroupEncryptedHistory:", error.message);

    return res.status(500).json({
      message: "Unable to save group message history.",
    });
  }
};

// Retrieve only the authenticated member's own encrypted group history.
export const getGroupEncryptedHistory = async (req, res) => {
  try {
    const ownerId = String(req.user.userId);
    const groupId = String(req.params.groupId);

    const group = await getActiveGroupForMember(groupId, ownerId);

    if (!group) {
      return res.status(403).json({
        message: "You are not an active member of this group.",
      });
    }

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 50, 1),
      100,
    );

    const filter = {
      historyOwnerId: ownerId,
      conversationType: "group",
      groupId,
      conversationId: `group:${groupId}`,
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
      nextCursor:
        rows.length === limit ? rows[0]?.createdAt : null,
    });
  } catch (error) {
    console.error("getGroupEncryptedHistory:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve group message history.",
    });
  }
};
