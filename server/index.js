import express from "express";
import cors from "cors";
import db from "./config/db.js";
import dotenv from "dotenv";
import { app, server } from "./utils/socket.js";
import userRouter from "./routes/user.routes.js";
import cookieParser from "cookie-parser";
import messageRouter from "./routes/message.route.js";
dotenv.config();
const PORT = process.env.PORT || 5001;

//Database configuration
db();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());

app.use(express.json());
app.use("/api/user", userRouter);
app.use("/api/message", messageRouter);

app.get("/", (req, res) => {
  res
    .status(200)
    .send(`<h1>Server is running on http://localhost:${PORT}</h1>`);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
