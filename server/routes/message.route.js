import express from "express";
import { getMessage, sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.route("/get-message").get(getMessage);
router.route("/send-message").post(sendMessage);

export default router;
