import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import http from "http";
import db from "./config/db.js";
import dotenv from "dotenv";
import userRouter from "./routes/user.routes.js";
import cookieParser from "cookie-parser";
import messageRouter from "./routes/message.route.js";
dotenv.config();
const PORT = process.env.PORT || 5001;

const app = express();

db();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());

const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

app.use(express.json());
app.use("/api/user", userRouter);
app.use("/api/message", messageRouter);

app.get("/", (req, res) => {
  res
    .status(200)
    .send(`<h1>Server is running on http://localhost:${PORT}</h1>`);
});

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

  console.log(Object.keys(onlineUsersMap));
  io.emit("getOnlineUsers", Object.keys(onlineUsersMap));

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    delete onlineUsersMap[userId];
    io.emit("getOnlineUsers", Object.keys(onlineUsersMap));
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
