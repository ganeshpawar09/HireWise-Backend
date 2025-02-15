import { User } from "../models/user.model.js";
import { Otp } from "../models/otp.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import AptitudeTestResult from "../models/aptitude_result.model.js";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";
import { processUserProfile } from "./user.gemini.controller.js";

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
    return new ApiError(500, "Error sending OTP email: " + error.message);
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
  let user = await User.findOne({ email }).populate("aptitudeAssessments");

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

const updateUserProfile = asyncHandler(async (req, res) => {
  const { userId, updates } = req.body;

  // Validate input
  if (!userId) {
    return res.status(400).json(new ApiError(400, "User ID is required"));
  }

  // Handle aptitude test results specifically
  if (updates.aptitudeAssessments && updates.aptitudeAssessments.length > 0) {
    try {
      const savedAssessments = await Promise.all(
        updates.aptitudeAssessments.map(async (assessment) => {
          // Convert nested objects to Maps
          const topicWiseAnalysis = new Map();

          if (assessment.analytics && assessment.analytics.topicWiseAnalysis) {
            for (const [topicKey, topicValue] of Object.entries(
              assessment.analytics.topicWiseAnalysis
            )) {
              const subTopics = new Map();

              if (topicValue.subTopics) {
                for (const [subTopicKey, subTopicValue] of Object.entries(
                  topicValue.subTopics
                )) {
                  subTopics.set(subTopicKey, subTopicValue);
                }
              }

              topicWiseAnalysis.set(topicKey, {
                ...topicValue,
                subTopics,
              });
            }
          }

          const testResult = new AptitudeTestResult({
            analytics: {
              ...assessment.analytics,
              topicWiseAnalysis,
            },
            timePerQuestion: assessment.timePerQuestion,
            totalTimeTaken: assessment.totalTimeTaken,
            date: new Date(assessment.date || Date.now()),
            user: userId,
          });

          return await testResult.save();
        })
      );

      // Update updates to reference new test result IDs
      updates.aptitudeAssessments = savedAssessments.map(
        (result) => result._id
      );
    } catch (error) {
      console.error("Aptitude assessment processing error:", error);
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            `Invalid aptitude assessment data: ${error.message}`
          )
        );
    }
  }

  // Update user profile
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    {
      new: true,
      runValidators: true,
    }
  ).populate("aptitudeAssessments");

  if (!user) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }
  await processUserProfile(user);
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User profile updated successfully"));
});

const getUserById = asyncHandler(async (req, res) => {
  const userId = req.body.userId;

  if (!userId) {
    return res.status(400).json(new ApiError(400, "User ID is required"));
  }

  const user = await User.findById(userId).populate("aptitudeAssessments");

  if (!user) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User profile fetched successfully"));
});

// const scrapeLeetcodeProfile = async (username) => {
//   try {
//     console.log("Fetching profile for:", username); // Debug log
//     console.log(`${process.env.fastApi}/api/leetcode/profile`);
//     const response = await fetch(
//       `${process.env.fastApi}/api/leetcode/profile`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify({ username }),
//         // Add timeout
//         timeout: 30000,
//       }
//     );

//     console.log("Response status:", response.status); // Debug log

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error("Error response:", errorText); // Debug log
//       return new Error(`Failed to fetch LeetCode profile: ${errorText}`);
//     }

//     const data = await response.json();
//     // console.log("Received data:", data); // Debug log

//     if (!data || !data.data) {
//       return new Error("Invalid response format");
//     }

//     return data.data;
//   } catch (error) {
//     console.error("Detailed error:", error); // Debug log
//     return new ApiError(500, "Failed to fetch LeetCode profile", [
//       error.message,
//       error.stack,
//     ]);
//   }
// };

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
