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

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(cookieParser());

const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

db();
app.use(express.json());
app.use("/api/user", userRouter);
app.use("/api/message", messageRouter);

app.get("/", (req, res) => {
  res
    .status(200)
    .send(`<h1>Server is running on http://localhost:${PORT}</h1>`);
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("message", (msg) => {
    io.emit("broadcast", { socketId: socket.id, message: msg });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
