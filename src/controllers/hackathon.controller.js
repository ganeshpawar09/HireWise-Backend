import Hackathon from "../models/hackathon.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const uploadHackathon = asyncHandler(async (req, res) => {
  let hackathonData = req.body;

  if (!Array.isArray(hackathonData) || hackathonData.length === 0) {
    return res
      .status(400)
      .json(new ApiError(400, "Hackathon data must be a non-empty array"));
  }

  hackathonData = hackathonData.map((hackathon) => ({
    ...hackathon,
    startDate: new Date(),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
  }));

  try {
    const newHackathons = await Hackathon.insertMany(hackathonData);
    return res
      .status(201)
      .json(
        new ApiResponse(201, newHackathons, "Hackathons uploaded successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Error uploading hackathons: ${error.message}`));
  }
});

export const getHackathons = asyncHandler(async (req, res) => {
  try {
    const hackathons = await Hackathon.find();
    return res
      .status(200)
      .json(
        new ApiResponse(200, hackathons, "Hackathons retrieved successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Error fetching hackathons: ${error.message}`));
  }
});

export const searchHackathons = asyncHandler(async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json(new ApiError(400, "Search query is required"));
  }

  try {
    const hackathons = await Hackathon.find({
      $or: [
        { hackathonName: { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } },
      ],
    });

    return res
      .status(200)
      .json(new ApiResponse(200, hackathons, "Hackathons search results"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Error searching hackathons: ${error.message}`));
  }
});
