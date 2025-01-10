import express from "express";
import { verifyToken } from "../auth/auth.js";
import { getMessages, sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.route("/get-messages/:id").get(verifyToken, getMessages);
router.route("/send-message/:id").post(verifyToken, sendMessage);

export default router;
