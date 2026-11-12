import express from "express";
import { verifyToken } from "../auth/auth.js";
import { getMessages, markDelivered, markRead, sendMessage } from "../controllers/message.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

router.get("/get-messages/:id", verifyToken, getMessages);
router.post("/send-message/:id", verifyToken, rateLimit({ max: 60 }), sendMessage);
router.patch("/delivered/:messageId", verifyToken, markDelivered);
router.patch("/read/:id", verifyToken, markRead);

export default router;
