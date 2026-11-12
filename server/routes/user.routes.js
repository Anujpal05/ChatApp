import express from "express";
import { getAllUsers, getMe, logOut, loginUser, registerUser, updateProfile, updateSignalIdentity } from "../controllers/user.controller.js";
import { verifyToken } from "../auth/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
const router = express.Router();

router.post("/register", rateLimit({ max: 5 }), registerUser);
router.post("/login", rateLimit({ max: 10 }), loginUser);
router.post("/logout", logOut);
router.get("/me", verifyToken, getMe);
router.get("/get-all-users", verifyToken, getAllUsers);
router.patch("/profile", verifyToken, updateProfile);
router.put("/signal-identity", verifyToken, updateSignalIdentity);
export default router;
