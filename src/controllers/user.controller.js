import { User } from "../models/user.model.js";
import { Otp } from "../models/otp.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";
import { matchRole } from "./job.controller.js";
import { Cluster } from "../models/cluster.model.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
const generateOTP = otpGenerator.generate(4, {
  upperCaseAlphabets: false,
  lowerCaseAlphabets: false,
  specialChars: false,
});

const sendOTPEmail = async (email, otp) => {
  try {
    const currentYear = new Date().getFullYear();
    const timestamp = new Date().toISOString();
    const uniqueId = Math.random().toString(36).substring(2, 8).toUpperCase();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `HireWise Secure Code [${uniqueId}] - ${
        timestamp.split("T")[0]
      }`,
      text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap');
              
              body {
                  font-family: 'Outfit', sans-serif;
                  line-height: 1.6;
                  color: #E6EDF3;
                  background-color: #0D1117;
                  margin: 0;
                  padding: 0;
              }
              .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 40px 20px;
              }
              .card {
                  background: linear-gradient(145deg, #12151E, #1C2333);
                  border-radius: 16px;
                  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                  overflow: hidden;
                  border: 1px solid rgba(255, 255, 255, 0.1);
              }
              .header {
                  background: linear-gradient(90deg, #3D5AFE, #00B8D4);
                  padding: 30px;
                  text-align: center;
              }
              .logo {
                  margin-bottom: 15px;
                  font-size: 32px;
                  font-weight: 600;
                  color: white;
                  letter-spacing: 1px;
              }
              .content {
                  padding: 30px;
              }
              .otp-container {
                  margin: 30px 0;
                  text-align: center;
              }
              .otp-box {
                  background: rgba(255, 255, 255, 0.05);
                  border-radius: 12px;
                  padding: 20px;
                  letter-spacing: 8px;
                  font-size: 32px;
                  font-weight: 600;
                  color: #FFFFFF;
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                  display: inline-block;
                  min-width: 60%;
              }
              .timer {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 25px 0;
                  color: #8B949E;
              }
              .timer-icon {
                  margin-right: 10px;
                  font-size: 20px;
              }
              .warning {
                  margin: 25px 0;
                  padding: 15px;
                  border-radius: 8px;
                  background-color: rgba(240, 143, 43, 0.1);
                  border-left: 4px solid #F08F2B;
                  color: #F0C97C;
              }
              .unique-id {
                  text-align: center;
                  font-family: monospace;
                  background: rgba(61, 90, 254, 0.1);
                  color: #3D5AFE;
                  padding: 8px 16px;
                  border-radius: 20px;
                  display: inline-block;
                  margin: 10px 0;
                  letter-spacing: 2px;
              }
              .footer {
                  text-align: center;
                  padding: 30px;
                  color: #8B949E;
                  font-size: 13px;
                  border-top: 1px solid rgba(255, 255, 255, 0.05);
              }
              .social-icons {
                  margin: 15px 0;
              }
              .social-icons a {
                  display: inline-block;
                  margin: 0 10px;
                  color: #8B949E;
                  text-decoration: none;
              }
              .links a {
                  color: #58A6FF;
                  text-decoration: none;
                  margin: 0 10px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="card">
                  <div class="header">
                      <div class="logo">HireWise</div>
                      <p>Your Career Growth Partner</p>
                      <div class="unique-id">REF: ${uniqueId}</div>
                  </div>
                  
                  <div class="content">
                      <h2>Verification Code</h2>
                      <p>Hi there,</p>
                      <p>Use the secure verification code below to complete your authentication:</p>
                      
                      <div class="otp-container">
                          <div class="otp-box">${otp}</div>
                      </div>
                      
                      <div class="timer">
                          <span class="timer-icon">⏱️</span>
                          <span>This code expires in <strong>10 minutes</strong></span>
                      </div>
                      
                      <div class="warning">
                          <p><strong>Security Notice:</strong> If you didn't request this code, please secure your account immediately by changing your password.</p>
                      </div>
                  </div>
                  
                  <div class="footer">
                      <div class="social-icons">
                          <a href="#">Twitter</a>
                          <a href="#">LinkedIn</a>
                          <a href="#">Instagram</a>
                      </div>
                      <p>© ${currentYear} HireWise. All rights reserved.</p>
                      <div class="links">
                          <a href="#">Privacy Policy</a>
                          <a href="#">Terms of Service</a>
                          <a href="#">Support</a>
                      </div>
                  </div>
              </div>
          </div>
      </body>
      </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    return new ApiError(
      500,
      "Error sending verification code: " + error.message
    );
  }
};

const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  console.log(email);
  if (!email) {
    return res.status(400).json(new ApiError(400, "Email is required"));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json(new ApiError(400, "Invalid email format"));
  }

  const otp = generateOTP;
  const otpExpiration = new Date(Date.now() + 10 * 60 * 1000);

  const savedOtp = await Otp.findOneAndUpdate(
    { email },
    { otp, otpExpiration },
    { upsert: true, new: true }
  );

  if (!savedOtp) {
    return res.status(500).json(new ApiError(500, "Error saving OTP"));
  }

  await sendOTPEmail(email, otp);

  return res
    .status(200)
    .json(new ApiResponse(200, { email }, "OTP sent successfully"));
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  console.log(email);
  console.log(otp);
  // Validate input
  if (!email || !otp) {
    return res
      .status(400)
      .json(new ApiError(400, "Email and OTP are required"));
  }

  // Check for OTP record
  const otpRecord = await Otp.findOne({ email });

  if (!otpRecord) {
    return res
      .status(400)
      .json(new ApiError(400, "No OTP found for this email"));
  }

  // Check if OTP has expired
  if (new Date() > otpRecord.otpExpiration) {
    await Otp.deleteOne({ email });
    return res.status(400).json(new ApiError(400, "OTP has expired"));
  }

  // Validate the OTP
  if (otpRecord.otp !== otp) {
    return res.status(400).json(new ApiError(400, "Invalid OTP"));
  }

  // Find the user by email
  let user = await User.findOne({ email })
    .populate({
      path: "aptitudeTestResult",
      populate: {
        path: "selectedOptions.question",
        model: "Question",
        select:
          "questionText topic subTopic level options correctOptionIndex explanation",
      },
    })
    .populate("mockInterviewResult");

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
  return res
    .status(200)
    .json(
      new ApiResponse(200, { user, accessToken }, "OTP verified successfully")
    );
});

export async function updateUserClusters(user, result) {
  // Update user embedding
  user.embedding = result.user_vector;

  // Process proximity scores
  const proximityScores = result.proximity_scores;
  const clusterUpdates = [];

  for (const [clusterName, percentage] of Object.entries(proximityScores)) {
    let cluster = await Cluster.findOne({ name: clusterName });

    // If cluster does not exist, create it
    if (!cluster) {
      cluster = new Cluster({ name: clusterName, jobs: [] });
      await cluster.save();
    }

    clusterUpdates.push({ clusterId: cluster._id, percentage });
  }

  // Update user's clusters
  user.clusters = clusterUpdates;

  // Save user
  await user.save();
}

const updateUserProfile = asyncHandler(async (req, res) => {
  const { userId, updates } = req.body;

  if (!userId) {
    return res.status(400).json(new ApiError(400, "User ID is required"));
  }

  try {
    // Fetch existing user data
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    // Check if keySkills have changed
    const skillsUpdated =
      updates.keySkills &&
      JSON.stringify(updates.keySkills) !==
        JSON.stringify(existingUser.keySkills);

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate({
        path: "aptitudeTestResult",
        populate: {
          path: "selectedOptions.question",
          model: "Question",
          select:
            "questionText topic subTopic level options correctOptionIndex explanation",
        },
      })
      .populate("mockInterviewResult");

    // If skills are updated, call matchRole to update clusters & embedding
    if (skillsUpdated) {
      const result = await matchRole(user.keySkills);
      await updateUserClusters(user, result);
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, { user }, "User profile updated successfully")
      );
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(new ApiError(error.statusCode || 500, error.message));
  }
});

const getUserById = asyncHandler(async (req, res) => {
  const userId = req.body.userId;

  if (!userId) {
    return res.status(400).json(new ApiError(400, "User ID is required"));
  }

  const user = await User.findById(userId)
    .populate({
      path: "aptitudeTestResult",
      populate: {
        path: "selectedOptions.question",
        model: "Question",
        select:
          "questionText topic subTopic level options correctOptionIndex explanation",
      },
    })
    .populate("mockInterviewResult");

  if (!user) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User profile fetched successfully"));
});

const leetCodeProfileFetcher = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: "Invalid or missing User ID",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 404,
        message: "User not found",
      });
    }

    if (!user.leetcode) {
      return res.status(400).json({
        status: 400,
        message: "LeetCode username not set for this user",
      });
    }

    const username = user.leetcode;
    const baseUrl = "https://leetcode.com/graphql";

    const operationQueryDict = {
      languageStats: `
          query languageStats($username: String!) {
            matchedUser(username: $username) {
              languageProblemCount {
                languageName
                problemsSolved
              }
            }
          }
        `,
      skillStats: `
          query skillStats($username: String!) {
            matchedUser(username: $username) {
              tagProblemCounts {
                advanced {
                  tagName
                  problemsSolved
                }
              }
            }
          }
        `,
      userProblemsSolved: `
          query userProblemsSolved($username: String!) {
            matchedUser(username: $username) {
              submitStatsGlobal {
                acSubmissionNum {
                  difficulty
                  count
                }
              }
            }
          }
        `,
      userProfileCalendar: `
          query userProfileCalendar($username: String!, $year: Int) {
            matchedUser(username: $username) {
              userCalendar(year: $year) {
                streak
                totalActiveDays
              }
            }
          }
        `,
      userContestRankingInfo: `
          query userContestRankingInfo($username: String!) {
            userContestRankingHistory(username: $username) {
              rating
            }
          }
        `,
    };

    const scrapeUserProfile = async (username) => {
      const output = {};

      const scrapeSingleOperation = async (operation) => {
        const jsonData = {
          query: operationQueryDict[operation],
          variables: { username },
          operationName: operation,
        };

        try {
          const response = await fetch(baseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(jsonData),
          });

          if (!response.ok) {
            throw new Error(
              `Error fetching operation ${operation}: ${response.statusText}`
            );
          }

          const responseData = await response.json();
          output[operation] = responseData.data || {};
        } catch (error) {
          console.error(`Error in operation ${operation}:`, error);
        }
      };

      const operations = Object.keys(operationQueryDict);
      await Promise.all(operations.map(scrapeSingleOperation));

      if (output.userContestRankingInfo) {
        const ratings =
          output.userContestRankingInfo.userContestRankingHistory || [];
        output.userContestRankingInfo.userContestRankingHistory =
          ratings.slice(-10);
      }

      return output;
    };

    const profileData = await scrapeUserProfile(username);

    if (!profileData) {
      return res.status(500).json({
        status: 500,
        message: "Failed to fetch LeetCode profile data",
      });
    }

    user.leetCodeData = user.leetCodeData || {};

    const languageProblemCount =
      profileData.languageStats?.matchedUser?.languageProblemCount;

    if (Array.isArray(languageProblemCount)) {
      user.leetCodeData.languageUsage = Object.fromEntries(
        languageProblemCount
          .filter(
            ({ languageName, problemsSolved }) =>
              languageName && typeof problemsSolved === "number"
          )
          .map(({ languageName, problemsSolved }) => [
            languageName,
            problemsSolved,
          ])
      );
    }

    const topicProblemCounts =
      profileData.skillStats?.matchedUser?.tagProblemCounts?.advanced;

    if (Array.isArray(topicProblemCounts)) {
      user.leetCodeData.skillStats = Object.fromEntries(
        topicProblemCounts
          .filter(
            ({ tagName, problemsSolved }) =>
              tagName && typeof problemsSolved === "number"
          )
          .map(({ tagName, problemsSolved }) => [tagName, problemsSolved])
      );
    }

    const userCalendar =
      profileData.userProfileCalendar?.matchedUser?.userCalendar;

    if (userCalendar) {
      user.leetCodeData.submissionStats = {
        activeDays: userCalendar.totalActiveDays || 0,
        maxStreak: userCalendar.streak || 0,
      };
    }

    const submitStatsGlobal =
      profileData.userProblemsSolved?.matchedUser?.submitStatsGlobal
        ?.acSubmissionNum;
    if (Array.isArray(submitStatsGlobal)) {
      user.leetCodeData.problemStats = Object.fromEntries(
        submitStatsGlobal
          .filter(
            ({ difficulty, count }) => difficulty && typeof count === "number"
          )
          .map(({ difficulty, count }) => [difficulty, count])
      );
    }

    const userContestRankingHistory =
      profileData.userContestRankingInfo?.userContestRankingHistory;

    if (Array.isArray(userContestRankingHistory)) {
      user.leetCodeData.ratingHistory = userContestRankingHistory
        .map((entry) => entry.rating)
        .filter((rating) => typeof rating === "number");
    }

    await user.save();

    await user.populate({
      path: "aptitudeTestResult",
      populate: {
        path: "selectedOptions.question",
        model: "Question",
        select:
          "questionText topic subTopic level options correctOptionIndex explanation",
      },
    });

    await user.populate("mockInterviewResult");

    return res.status(200).json({
      status: 200,
      data: { user },
      message: "User profile extracted successfully",
    });
  } catch (error) {
    console.error("Profile fetcher error:", error);

    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      errors: [error.message],
    });
  }
};

const githubProfileFetcher = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid or missing User ID"));
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    if (!user.github) {
      return res
        .status(400)
        .json(new ApiError(400, "GitHub username not set for this user"));
    }

    // Fetch GitHub profile data
    const userUrl = `https://api.github.com/users/${user.github}`;
    const reposUrl = `https://api.github.com/users/${user.github}/repos`;

    // Fetch user data and repositories in parallel
    const [userData, reposData] = await Promise.all([
      fetch(userUrl).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user data");
        return res.json();
      }),
      fetch(reposUrl).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch repos data");
        return res.json();
      }),
    ]);

    // Initialize GitHub data if it doesn't exist
    if (!user.gitHubData) {
      user.gitHubData = {};
    }
    const languageCount = new Map();
    var totalRepositories = 0;
    // Calculate language distribution
    for (const repo of reposData) {
      if (repo.language) {
        totalRepositories = totalRepositories + 1; // Increment total repository count
        languageCount.set(
          repo.language,
          (languageCount.get(repo.language) || 0) + 1
        );
      }
    }

    // Calculate the percentage for each language
    const languageDistribution = {};
    languageCount.forEach((count, language) => {
      languageDistribution[language] = (count / totalRepositories) * 100; // Calculate percentage
    });

    // Calculate total stars
    const totalStars = reposData.reduce(
      (sum, repo) => sum + repo.stargazers_count,
      0
    );

    // Update GitHub data according to schema
    user.gitHubData = {
      repositories: reposData.length,
      stars: totalStars,
      followers: userData.followers,
      following: userData.following,
      languageDistribution: languageDistribution,
    };

    // Save changes
    await user.save();

    await user.populate({
      path: "aptitudeTestResult",
      populate: {
        path: "selectedOptions.question",
        model: "Question",
        select:
          "questionText topic subTopic level options correctOptionIndex explanation",
      },
    });

    await user.populate("mockInterviewResult");

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { user },
          "GitHub profile data extracted successfully"
        )
      );
  } catch (error) {
    console.error("GitHub profile fetcher error:", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json(error);
    }

    return res
      .status(500)
      .json(new ApiError(500, "Internal server error", [error.message]));
  }
});

export {
  sendOTP,
  verifyOTP,
  updateUserProfile,
  getUserById,
  leetCodeProfileFetcher,
  githubProfileFetcher,
};
