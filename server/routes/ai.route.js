import express from "express";
import { verifyToken } from "../auth/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { assistant } from "../controllers/ai.controller.js";
const router = express.Router();
router.post(
  "/assistant",
  verifyToken,
  rateLimit({ windowMs: 60_000, max: 12 }),
  assistant,
);
export default router;
