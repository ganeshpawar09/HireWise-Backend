import { Router } from "express";
import {
  sendOTP,
  verifyOTP,
  updateUserProfile,
  getUserById,
  leetCodeProfileFetcher,
  githubProfileFetcher,
} from "../controllers/user.controller.js";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";
import { createUserProfileFromResume, getInterviewQuestion, getUserFeedback,  } from "../controllers/user.gemini.controller.js";

const userRouter = Router();

userRouter.route("/send-otp").post(sendOTP);
userRouter.route("/verify-otp").post(verifyOTP);
userRouter.route("/update-user").post(updateUserProfile);
userRouter.route("/get-user").post(getUserById);
userRouter.route("/fetch-leetcode-profile").post(leetCodeProfileFetcher);
userRouter.route("/fetch-github-profile").post(githubProfileFetcher);
userRouter.route("/build-user-profile-resume").post(createUserProfileFromResume);
userRouter.route("/get-feedback-tips").post(getUserFeedback);
userRouter.route("/get-interview-questions").post(getInterviewQuestion);




userRouter.get("/access-token-verify", verifyAccessToken, (req, res) => {
  return res.status(200).json({ message: "Access Token is Valid" });
});

export default userRouter;
