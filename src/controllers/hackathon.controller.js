import { Hackathon, Team, TeamUser, Chat } from "../models/hackathon.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const uploadHackathon = asyncHandler(async (req, res) => {
  const hackathonData = req.body;

  try {
    const uploadedHackathon = await Hackathon.create(hackathonData);

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          uploadedHackathon,
          "Hackathon uploaded successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "Error uploading hackathon: " + error.message);
  }
});
const createTeam = asyncHandler(async (req, res) => {
  const {
    userId,
    problemStatement,
    hackathonId,
    teamName,
    maxMembers,
    requiredSkills,
  } = req.body;

  try {
    // Convert `userId` and `hackathonId` to ObjectId with 'new'
    const userIdObject = new mongoose.Types.ObjectId(userId);
    const hackathonIdObject = new mongoose.Types.ObjectId(hackathonId);

    const user = await User.findById(userIdObject);
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create team leader with ObjectId conversion
      const leader = await TeamUser.create(
        [
          {
            userId: userIdObject,
            name: user.name,
            keySkills: user.keySkills || [],
          },
        ],
        { session }
      );

      // Create team with ObjectId conversion
      const team = await Team.create(
        [
          {
            teamName,
            problemStatement,
            hackathonId: hackathonIdObject,
            maxMembers,
            requiredSkills,
            teamLeader: leader[0]._id, // Ensure this is an ObjectId
            members: [leader[0]._id], // Array of ObjectId
            joiningRequests: [leader[0]._id],
            chats: [],
          },
        ],
        { session }
      );

      // Update hackathon and user with new team ID
      await Hackathon.findByIdAndUpdate(
        hackathonIdObject,
        { $push: { teams: team[0]._id } },
        { session, new: true }
      );

      await User.findByIdAndUpdate(
        userIdObject,
        { $set: { [`createdTeams.${hackathonId}`]: team[0]._id } },
        { session, new: true }
      );

      await session.commitTransaction();

      const populatedTeam = await Team.findById(team[0]._id)
        .populate("teamLeader")
        .populate("joiningRequests")
        .populate("members")
        .lean();

      return res.status(201).json({
        status: "success",
        data: populatedTeam,
        message: "Team created successfully",
      });
    } catch (error) {
      await session.abortTransaction();
      return res.status(500).json({
        status: "error",
        message: error.message || "Error in team creation transaction",
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Create team error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
});

const getRegisteredHackathons = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId || typeof userId !== "string") {
      throw new ApiError(400, "Invalid user ID");
    }

    const user = await User.findById(userId).select("joinedTeams createdTeams");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const joinedHackathonIds = user.joinedTeams?.keys
      ? Array.from(user.joinedTeams.keys())
      : [];
    const createdHackathonIds = user.createdTeams?.keys
      ? Array.from(user.createdTeams.keys())
      : [];
    const registeredHackathonIds = [
      ...new Set([...joinedHackathonIds, ...createdHackathonIds]),
    ];

    const hackathons = await Hackathon.find({
      _id: { $in: registeredHackathonIds },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          hackathons,
          "Successfully fetched registered hackathons"
        )
      );
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      throw res.status(error.statusCode).json(error);
    }
    throw res.status(500).json(new ApiError(500, "Error fetching hackathons"));
  }
});

const getSearchHackathons = asyncHandler(async (req, res) => {
  const { search } = req.body;

  try {
    const searchCriteria = {
      $or: [
        { location: { $regex: search, $options: "i" } },
        { hackathonName: { $regex: search, $options: "i" } },
      ],
    };

    const hackathons = await Hackathon.find(searchCriteria);

    return res
      .status(200)
      .json(
        new ApiResponse(200, hackathons, "Hackathons fetched successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Error searching hackathons: " + error.message);
  }
});
const getYouMightLike = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  try {
    const hackathons = await Hackathon.find();

    return res
      .status(200)
      .json(
        new ApiResponse(200, hackathons, "Hackathons fetched successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Error searching hackathons: " + error.message);
  }
});

const getTeamsForHackathon = asyncHandler(async (req, res) => {
  const { userId, hackathonId } = req.body;

  try {
    if (!userId || typeof userId !== "string") {
      throw new ApiError(400, "Invalid user ID");
    }

    if (!hackathonId || typeof hackathonId !== "string") {
      throw new ApiError(400, "Invalid hackathon ID");
    }

    const user = await User.findById(userId).select("joinedTeams createdTeams");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    let teams = null;
    let leader = false;
    let member = false;

    if (user.joinedTeams != null && user.joinedTeams.has(hackathonId)) {
      teams = await Team.findById(user.joinedTeams.get(hackathonId))
        .populate("teamLeader")
        .populate("members")
        .populate("joiningRequests")
        .lean();
      member = true;
    } else if (
      user.createdTeams != null &&
      user.createdTeams.has(hackathonId)
    ) {
      teams = await Team.findById(user.createdTeams.get(hackathonId))
        .populate("teamLeader")
        .populate("members")
        .populate("joiningRequests")
        .lean();
      leader = true;
    }

    if (leader || member) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { teams, leader, member },
            "Successfully fetched teams for hackathon"
          )
        );
    }

    teams = await Team.find({ hackathonId: hackathonId })
      .populate("teamLeader")
      .populate("members")
      .populate("joiningRequests")
      .lean();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { teams, leader, member },
          "Successfully fetched teams for hackathon"
        )
      );
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      throw res.status(error.statusCode).json(error);
    }
    throw res.status(500).json(new ApiError(500, "Error fetching teams"));
  }
});

const getSuggestedTeammates = asyncHandler(async (req, res) => {
  try {
    const users = await User.find(
      {},
      {
        _id: 1,
        name: 1,
        keySkills: 1,
      }
    );

    const teamUsers = users.map((user) => ({
      userId: user._id.toString(),
      name: user.name,
      keySkills: user.keySkills,
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          teamUsers,
          "Successfully fetched suggested teammates"
        )
      );
  } catch (error) {
    throw res
      .status(500)
      .json(new ApiError(500, "Error fetching suggested teammates"));
  }
});

export {
  uploadHackathon,
  createTeam,
  getRegisteredHackathons,
  getSearchHackathons,
  getTeamsForHackathon,
  getYouMightLike,
  getSuggestedTeammates,
};
