import express from "express";
import {
  getAllUsers,
  getUser,
  logOut,
  registerUser,
  updateUser,
} from "../controllers/user.controller.js";
import { verifyToken } from "../auth/auth.js";
const router = express.Router();

router.route("/register").post(registerUser);
router.route("/logout").post(logOut);
router.route("/get-all-users").get(verifyToken, getAllUsers);
router.route("/update-user").post(updateUser);
router.route("/get-user").get(getUser);

export default router;
