import dotenv from "dotenv";
dotenv.config();
import express from "express";
import http from "http";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { Server } from "socket.io";
import Users from "../models/user.model.js";

export const app = express();
export const server = http.createServer(app);

const allowedOrigin = process.env.CLIENT_URL;
export const io = new Server(server, {
  cors: { origin: allowedOrigin, credentials: true },
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e6,
});

const userSockets = new Map();
const callSessions = new Map();

io.use((socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const token = cookies.token;
    if (!token) return next(new Error("unauthorized"));
    const user = jwt.verify(token, process.env.SECRET_KEY, {
      issuer: "quicktalk-api",
      audience: "quicktalk-client",
    });
    socket.data.userId = user.userId;
    socket.data.userName = user.userName;
    return next();
  } catch {
    return next(new Error("unauthorized"));
  }
});

const emitPresence = () => {
  const onlineUserIds = [...userSockets.keys()];
  io.emit("presence:snapshot", onlineUserIds);
  io.emit("getOnlineUsers", onlineUserIds); // compatibility with the original client
};

export const getReceiverSocketId = (receiverId) => {
  const sockets = userSockets.get(String(receiverId));
  return sockets ? [...sockets][0] : undefined;
};

export const emitToUser = (userId, event, payload) => {
  io.to(`user:${userId}`).emit(event, payload);
};

io.on("connection", async (socket) => {
  const userId = String(socket.data.userId);
  socket.join(`user:${userId}`);
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socket.id);
  await Users.updateOne({ _id: userId }, { $set: { isOnline: true } }).catch(() => {});
  emitPresence();

  socket.on("conversation:join", async ({ peerId }, ack = () => {}) => {
    if (!peerId || String(peerId) === userId) return ack({ ok: false });
    const peer = await Users.exists({ _id: peerId, blockedUsers: { $ne: userId } });
    const self = await Users.exists({ _id: userId, blockedUsers: { $ne: peerId } });
    if (!peer || !self) return ack({ ok: false, error: "Conversation unavailable." });
    const room = [userId, String(peerId)].sort().join(":");
    socket.join(`conversation:${room}`);
    ack({ ok: true, room });
  });

  socket.on("typing:start", ({ peerId }) => {
    if (!peerId) return;
    const room = [userId, String(peerId)].sort().join(":");
    if (socket.rooms.has(`conversation:${room}`)) socket.to(`conversation:${room}`).emit("typing:update", { userId, isTyping: true });
  });
  socket.on("typing:stop", ({ peerId }) => {
    if (!peerId) return;
    const room = [userId, String(peerId)].sort().join(":");
    if (socket.rooms.has(`conversation:${room}`)) socket.to(`conversation:${room}`).emit("typing:update", { userId, isTyping: false });
  });

  // Call signaling is scoped to a server-tracked call and its two authenticated participants.
  for (const event of ["call:invite", "call:accept", "call:reject", "call:hangup", "webrtc:offer", "webrtc:answer", "webrtc:ice-candidate"]) {
    socket.on(event, async (payload = {}, ack = () => {}) => {
      const { peerId, callId } = payload;
      if (!peerId || !callId || String(peerId) === userId) return ack({ ok: false, error: "Invalid signaling payload." });
      const peerKey = String(peerId);
      const peer = await Users.exists({ _id: peerKey, blockedUsers: { $ne: userId } });
      if (!peer) return ack({ ok: false, error: "Recipient unavailable." });
      const now = Date.now();
      for (const [id, session] of callSessions) {
        const maxAge = session.status === "ringing" ? 60_000 : 4 * 60 * 60 * 1000;
        if (now - session.updatedAt > maxAge) callSessions.delete(id);
      }
      if (event === "call:invite") {
        if (!userSockets.has(peerKey)) return ack({ ok: false, error: "Recipient is offline." });
        if (callSessions.has(callId)) return ack({ ok: false, error: "Call identifier already exists." });
        callSessions.set(callId, { callerId: userId, receiverId: peerKey, status: "ringing", createdAt: now, updatedAt: now });
      } else {
        const session = callSessions.get(callId);
        if (!session || ![session.callerId, session.receiverId].includes(userId) ||
            ![session.callerId, session.receiverId].includes(peerKey) || userId === peerKey) {
          return ack({ ok: false, error: "Call session is not valid for these participants." });
        }
        if (["call:accept", "call:reject"].includes(event) && userId !== session.receiverId) {
          return ack({ ok: false, error: "Only the invited recipient can accept or reject this call." });
        }
        if (event === "webrtc:offer" && userId !== session.callerId) return ack({ ok: false, error: "Only the caller can send the initial offer." });
        if (event === "webrtc:answer" && userId !== session.receiverId) return ack({ ok: false, error: "Only the recipient can answer the offer." });
        if (event === "call:accept") session.status = "accepted";
        if (event.startsWith("webrtc:") && session.status !== "accepted") return ack({ ok: false, error: "Call has not been accepted." });
        session.updatedAt = now;
        if (["call:reject", "call:hangup"].includes(event)) callSessions.delete(callId);
      }
      emitToUser(peerKey, event, { ...payload, peerId: userId, callId });
      ack({ ok: true });
    });
  }

  socket.on("disconnect", async () => {
    const sockets = userSockets.get(userId);
    sockets?.delete(socket.id);
    if (!sockets?.size) {
      userSockets.delete(userId);
      await Users.updateOne({ _id: userId }, { $set: { isOnline: false, lastSeenAt: new Date() } }).catch(() => {});
    }
    emitPresence();
  });
});
