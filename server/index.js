import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import db from "./config/db.js";
import { app, server } from "./utils/socket.js";
import userRouter from "./routes/user.routes.js";
import messageRouter from "./routes/message.route.js";
import callRouter from "./routes/call.route.js";
import storyRouter from "./routes/story.route.js";
import aiRouter from "./routes/ai.route.js";
import e2eeRouter from "./routes/e2ee.route.js";

const PORT = Number(process.env.PORT || 5001);
if (!process.env.SECRET_KEY || !process.env.CLIENT_URL || !process.env.MONGODB_URL) {
  throw new Error("Missing required environment configuration: SECRET_KEY, CLIENT_URL, MONGODB_URL.");
}

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("X-Frame-Options", "DENY");
  res.set("Permissions-Policy", "camera=(self), microphone=(self), display-capture=(self)");
  next();
});
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  const origin = req.get("origin");
  if (unsafe && origin && origin !== process.env.CLIENT_URL) {
    return res.status(403).json({ message: "Request origin is not allowed." });
  }
  next();
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "quicktalk-api", timestamp: new Date().toISOString() }));
app.use("/api/user", userRouter);
app.use("/api/message", messageRouter);
app.use("/api/call", callRouter);
app.use("/api/stories", storyRouter);
app.use("/api/ai", aiRouter);
app.use("/api/e2ee", e2eeRouter);

app.use((err, _req, res, _next) => {
  console.error("Unhandled request error:", err.message);
  res.status(500).json({ message: "Unexpected server error." });
});

await db();
server.listen(PORT, () => console.log(`QuickTalk API listening on ${PORT}`));
