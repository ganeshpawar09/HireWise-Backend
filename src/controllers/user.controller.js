import { User } from "../models/user.model.js";
import { Otp } from "../models/otp.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
const generateOTP = otpGenerator.generate(6, {
  upperCaseAlphabets: false,
  lowerCaseAlphabets: false,
  specialChars: false,
});

const sendOTPEmail = async (email, otp) => {
  try {
    const currentYear = new Date().getFullYear();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Authentication",
      text: `Your OTP is: ${otp}. This OTP will expire in 10 minutes.`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
              }
              .container {
                  background-color: #f9f9f9;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 20px 0;
              }
              .header {
                  text-align: center;
                  margin-bottom: 30px;
              }
              .otp-box {
                  background-color: #ffffff;
                  padding: 15px;
                  border-radius: 4px;
                  text-align: center;
                  font-size: 24px;
                  font-weight: bold;
                  margin: 20px 0;
                  border: 1px solid #ddd;
              }
              .footer {
                  text-align: center;
                  font-size: 12px;
                  color: #666;
                  margin-top: 30px;
              }
              .warning {
                  color: #666;
                  font-style: italic;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>HireWise</h1>
                  <p>Your Career Growth Partner</p>
              </div>
              
              <h2>Authentication OTP</h2>
              <p>Your One-Time Password is:</p>
              
              <div class="otp-box">
                  ${otp}
              </div>
              
              <p>⏰ This OTP will expire in <strong>10 minutes</strong></p>
              <p class="warning">🔒 If you didn't request this OTP, please ignore this email.</p>
              
              <div class="footer">
                  <p>© ${currentYear} HireWise. All rights reserved.</p>
                  <p>
                      <a href="#">Terms of Service</a> | 
                      <a href="#">Privacy Policy</a> | 
                      <a href="#">Contact Support</a>
                  </p>
              </div>
          </div>
      </body>
      </html>
  `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new ApiError(500, "Error sending OTP email: " + error.message);
  }
};

const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  const otp = generateOTP;
  const otpExpiration = new Date(Date.now() + 10 * 60 * 1000);

  const savedOtp = await Otp.findOneAndUpdate(
    { email },
    { otp, otpExpiration },
    { upsert: true, new: true }
  );

  if (!savedOtp) {
    throw new ApiError(500, "Error saving OTP");
  }

  await sendOTPEmail(email, otp);

  throw res
    .status(200)
    .json(new ApiResponse(200, { email }, "OTP sent successfully"));
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  console.log(email, otp);

  // Validate input
  if (!email || !otp) {
    throw res.status(400).json(new ApiError(400, "Email and OTP are required"));
  }

  // Check for OTP record
  const otpRecord = await Otp.findOne({ email });

  if (!otpRecord) {
    throw res
      .status(400)
      .json(new ApiError(400, "No OTP found for this email"));
  }

  // Check if OTP has expired
  if (new Date() > otpRecord.otpExpiration) {
    await Otp.deleteOne({ email });
    throw res.status(400).json(new ApiError(400, "OTP has expired"));
  }

  // Validate the OTP
  if (otpRecord.otp !== otp) {
    throw res.status(400).json(new ApiError(400, "Invalid OTP"));
  }

  // Find the user by email
  let user = await User.findOne({ email });

  // If user does not exist, create a new user
  if (!user) {
    user = await User.create({
      email,
      lastUpdatedDate: new Date(),
    });
  }

  // Generate access token for the user
  const accessToken = user.generateAccessToken();

  // Respond with success message and user info
  throw res
    .status(200)
    .json(
      new ApiResponse(200, { user, accessToken }, "OTP verified successfully")
    );
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const updates = req.body;

  const user = await User.findByIdAndUpdate(userId, updates, { new: true });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  throw res
    .status(200)
    .json(new ApiResponse(200, { user }, "User profile updated successfully"));
});

const getUserById = asyncHandler(async (req, res) => {
  const userId = req.body.userId;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User profile fetched successfully"));
});

export { sendOTP, verifyOTP, updateUserProfile, getUserById };
