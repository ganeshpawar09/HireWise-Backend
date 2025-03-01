import fs from "fs";
import axios from "axios";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { MockInterviewResult } from "../models/mock_interview_result.js";
/**
 * Upload Video to Cloudinary
 */
export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(new ApiError(400, "Video file is required"));
    }

    const localFilePath = req.file.path;

    // Upload to Cloudinary
    const uploadedFiles = await uploadOnCloudinary([localFilePath]);

    // Delete local file
    fs.unlinkSync(localFilePath);

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res
        .status(500)
        .json(new ApiError(500, "Failed to upload video to Cloudinary"));
    }

    // Get uploaded video URL
    const videoUrl = uploadedFiles[0]?.url;

    return res
      .status(200)
      .json(new ApiResponse(200, { videoUrl }, "Video uploaded successfully"));
  } catch (error) {
    console.error("Error uploading video:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};
/**
 * Process Video: Send for analysis & update user profile
 */
export const processVideo = async (req, res) => {
  try {
    const { userId, videoUrl, question } = req.body;
    console.log([userId, videoUrl, question]);
    if (!userId || !videoUrl || !question) {
      return res
        .status(400)
        .json(
          new ApiError(400, "User ID, video URL, and question are required")
        );
    }

    // Call processing API
    const processingApiUrl = "";
    const response = await axios.post(
      "http://192.168.14.68:8000/process-video",
      {
        cloudinary_url: videoUrl,
        question: question,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log(response.data);
    if (response.data.status !== "success") {
      return res
        .status(500)
        .json(
          new ApiError(500, `Error processing video ${response.data.message}`)
        );
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    // Create a new MockInterviewResult document
    const mockInterviewResult = new MockInterviewResult({
      question,
      video_confidence: response.data.video_confidence,
      audio_confidence: response.data.audio_confidence,
      fluency_percentage: response.data.fluency_percentage,
      transcription: response.data.transcription,
      grammar: response.data.grammar,
    });

    await mockInterviewResult.save(); // Save the new record

    // Update user's mockInterviewResult array with ObjectId reference
    user.mockInterviewResult.push(mockInterviewResult._id);
    await user.save();

    return res.status(200).json(
      new ApiResponse(200, {
        message: "Processing complete",
        mockInterviewResult,
      })
    );
  } catch (error) {
    console.error("Error processing video:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};
