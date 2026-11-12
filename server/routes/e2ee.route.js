import express from "express";
import { verifyToken } from "../auth/auth.js";
import { createRelayIdentityAssertion } from "../controllers/e2ee.controller.js";
import { rateLimit } from "../middleware/rateLimit.js";
const router = express.Router();
router.post("/identity-assertion", verifyToken, rateLimit({ max: 20 }), createRelayIdentityAssertion);
export default router;
