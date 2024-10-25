import { Router } from "express";
import {
  sendOTP,
  verifyOTP,
  updateUserProfile,
  getUserById,
} from "../controllers/user.controller.js";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/send-otp").get(sendOTP);
userRouter.route("/verify-otp").post(verifyOTP);
userRouter.route("/update-user").post(updateUserProfile);
userRouter.route("/get-user").get(getUserById);

userRouter.get("/access-token-verify", verifyAccessToken, (req, res) => {
  return res.status(200).json({ message: "Access Token is Valid" });
});

export default userRouter;
