import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
export const app = express();
export const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

export const getReceiverSocketId = (receiverId) => {
  return onlineUsersMap[receiverId];
};

const onlineUsersMap = {};
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("message", (msg) => {
    io.emit("broadcast", { socketId: socket.id, message: msg });
  });

  const userId = socket?.handshake?.query?.userId;

  if (userId) {
    onlineUsersMap[userId] = socket.id;
  }

  io.emit("getOnlineUsers", Object.keys(onlineUsersMap));

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    delete onlineUsersMap[userId];
    io.emit("getOnlineUsers", Object.keys(onlineUsersMap));
  });
});
