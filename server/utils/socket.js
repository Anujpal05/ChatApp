import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import { getUser } from "../controllers/user.controller.js";
export const app = express();
export const server = http.createServer(app);
dotenv.config();

export const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
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

  socket.on("offer", (offer) => {
    socket.broadcast.emit("offer", offer);
  });
  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer);
  });
  socket.on("ice-candidate", (candidate) => {
    socket.broadcast.emit("ice-candidate", candidate);
  });

  socket.on("calling", async (data) => {
    if (data?.callerId) {
      const userData = await getUser(data?.callerId);
      if (userData.success) {
        data.userName = userData?.user?.userName;
      }
    }

    socket.broadcast.emit("calling", data);
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
