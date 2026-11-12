import mongoose from "mongoose";
import Messages from "../models/message.model.js";
import Users from "../models/user.model.js";
import { emitToUser } from "../utils/socket.js";

const conversationKey = (a, b) => [String(a), String(b)].sort().join(":");

const canChat = async (a, b) => {
  const [first, second] = await Promise.all([
    Users.exists({ _id: a, blockedUsers: { $ne: b } }),
    Users.exists({ _id: b, blockedUsers: { $ne: a } }),
  ]);

  return Boolean(first && second);
};

export const getMessages = async (req, res) => {
  try {
    const peerId = req.params.id;
    if (!mongoose.isValidObjectId(peerId) || !(await canChat(req.user.userId, peerId))) return res.status(404).json({ message: "Conversation unavailable." });
    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 100);
    const filter = { conversationId: conversationKey(req.user.userId, peerId), deletedAt: null };
    if (req.query.before && !Number.isNaN(Date.parse(req.query.before))) filter.createdAt = { $lt: new Date(req.query.before) };
    const messages = await Messages.find(filter).sort({ createdAt: -1 }).limit(limit).select("-text").lean();
    res.json({ messages: messages.reverse(), nextCursor: messages.length === limit ? messages[0]?.createdAt : null });

  } catch (error) {
    console.error("getMessages:", error.message);
    res.status(500).json({ message: "Unable to load messages." });
  }

};

export const sendMessage = async (req, res) => {
  try {
    const peerId = req.params.id;
    const senderId = req.user.userId;
    const { clientMessageId, protocol, ciphertext, envelopeType, attachment } = req.body || {};
    if (!mongoose.isValidObjectId(peerId) || String(senderId) === String(peerId)) return res.status(400).json({ message: "Invalid recipient." });

    if (!(await canChat(senderId, peerId))) return res.status(403).json({ message: "This conversation is unavailable." });
   
    if (!clientMessageId || String(clientMessageId).length > 100) return res.status(400).json({ message: "clientMessageId is required." });
   
    if (protocol !== "signal" || typeof ciphertext !== "string" || ciphertext.length > 200_000) {
      return res.status(400).json({ message: "Only Signal-encrypted message envelopes are accepted by this endpoint." });
    }
   
    const message = await Messages.findOneAndUpdate(
      { senderId, receiverId: peerId, clientMessageId },
      { $setOnInsert: {
        conversationId: conversationKey(senderId, peerId), senderId, receiverId: peerId,
        clientMessageId, protocol, ciphertext, envelopeType: envelopeType || "signal",
        attachment: attachment && typeof attachment === "object" ? attachment : undefined,
      } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).select("-text");
    emitToUser(peerId, "message:metadata", { conversationId: message.conversationId, senderId, clientMessageId, createdAt: message.createdAt });
    res.status(201).json({ message });

  } catch (error) {
    console.error("sendMessage:", error.message);
    res.status(500).json({ message: "Unable to send encrypted message." });
  }
};

export const markDelivered = async (req, res) => {
  const { messageId } = req.params;
  if (!mongoose.isValidObjectId(messageId)) return res.status(400).json({ message: "Invalid message." });
 
  const message = await Messages.findOneAndUpdate({ _id: messageId, receiverId: req.user.userId }, { $set: { deliveredAt: new Date() } }, { new: true });
  if (!message) return res.status(404).json({ message: "Message not found." });
  
  emitToUser(message.senderId, "message:delivered", { messageId, deliveredAt: message.deliveredAt });
  res.json({ deliveredAt: message.deliveredAt });
};

export const markRead = async (req, res) => {
  const peerId = req.params.id;
  const result = await Messages.updateMany({ conversationId: conversationKey(req.user.userId, peerId), receiverId: req.user.userId, readAt: null }, { $set: { readAt: new Date(), deliveredAt: new Date() } });
  emitToUser(peerId, "message:read", { readerId: req.user.userId, conversationId: conversationKey(req.user.userId, peerId), count: result.modifiedCount });
  res.json({ updated: result.modifiedCount });
};
