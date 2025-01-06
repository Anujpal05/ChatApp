import express from "express";
import {
  getAllUser,
  getUser,
  registerUser,
  updateUser,
} from "../controllers/user.controller.js";
const router = express.Router();

router.route("/register").post(registerUser);
router.route("/get-all-users").get(getAllUser);
router.route("/update-user").post(updateUser);
router.route("/get-user").get(getUser);

export default router;
