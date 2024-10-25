import { Hackathon } from "../models/Hackathon.js";
import { Team } from "../models/Team.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const uploadHackathon = asyncHandler(async (req, res) => {
  const hackathonData = req.body; // assuming an array of jobs is sent in the request body

  const uploadHackathon = await Hackathon.insertMany(hackathonData);

  return res
    .status(201)
    .json(new ApiResponse(201, uploadHackathon, "Jobs uploaded successfully"));
});

const createTeam = asyncHandler(async (req, res) => {
  const { teamLeader, hackathonId, teamName, maxMembers, requiredSkills } =
    req.body;

  if (!teamLeader) {
    return new ApiError(401, "Authentication required");
  }

  if (!teamName || !maxMembers) {
    return new ApiError(400, "Team name and maximum members are required");
  }

  // Check if hackathon exists
  const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon) {
    return new ApiError(404, "Hackathon not found");
  }

  // Check if user is already in a team for this hackathon
  const existingTeam = await Team.findOne({
    hackathonId,
    members: teamLeader,
  });

  if (existingTeam) {
    return new ApiError(
      400,
      "You are already part of a team in this hackathon"
    );
  }

  // Create team
  const team = await Team.create({
    teamName,
    hackathonId,
    maxMembers,
    requiredSkills,
    teamLeader,
    members: [teamLeader], // Add team leader as first member
  });

  // Update hackathon with new team
  await Hackathon.findByIdAndUpdate(
    hackathonId,
    {
      $push: { teams: team._id },
    },
    { new: true }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, team, "Team created successfully"));
});

const requestToJoinTeam = asyncHandler(async (req, res) => {
  const { teamId, userId } = req.body;

  if (!userId) {
    return new ApiError(401, "Authentication required");
  }

  const team = await Team.findById(teamId);
  if (!team) {
    return new ApiError(404, "Team not found");
  }

  // Check if user is already a member
  if (team.members.includes(userId)) {
    return new ApiError(400, "You are already a member of this team");
  }

  // Check if user has already requested to join
  if (team.joiningRequests.includes(userId)) {
    return new ApiError(400, "You have already requested to join this team");
  }

  // Check if team is full
  if (team.members.length >= team.maxMembers) {
    return new ApiError(400, "Team is already full");
  }

  // Add join request
  const updatedTeam = await Team.findByIdAndUpdate(
    teamId,
    {
      $push: { joiningRequests: userId },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTeam, "Join request sent successfully"));
});

const addMemberToTeam = asyncHandler(async (req, res) => {
  const { teamLeaderId, teamId, userId } = req.body;

  if (!teamLeaderId) {
    return new ApiError(401, "Authentication required");
  }

  const team = await Team.findById(teamId);
  if (!team) {
    return new ApiError(404, "Team not found");
  }

  // Verify that the requester is the team leader
  if (team.teamLeader.toString() !== teamLeaderId.toString()) {
    return new ApiError(403, "Only team leader can add members");
  }

  // Check if user has requested to join
  if (!team.joiningRequests.includes(userId)) {
    return new ApiError(400, "User has not requested to join this team");
  }

  // Check if team is full
  if (team.members.length >= team.maxMembers) {
    return new ApiError(400, "Team is already full");
  }

  // Add member and remove from joining requests
  const updatedTeam = await Team.findByIdAndUpdate(
    teamId,
    {
      $push: { members: userId },
      $pull: { joiningRequests: userId },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTeam, "Member added successfully"));
});

const getTeamDetails = asyncHandler(async (req, res) => {
  const { teamId } = req.body;

  const team = await Team.findById(teamId);

  if (!team) {
    return new ApiError(404, "Team not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, team, "Team details fetched successfully"));
});

const getHackathonTeams = asyncHandler(async (req, res) => {
  const { hackathonId } = req.body;

  const hackathon = await Hackathon.findById(hackathonId).populate({
    path: "teams",
    populate: [
      { path: "members", select: "firstName lastName email" },
      { path: "teamLeader", select: "firstName lastName email" },
    ],
  });

  if (!hackathon) {
    return new ApiError(404, "Hackathon not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        hackathon.teams,
        "Hackathon teams fetched successfully"
      )
    );
});

const sendTeamInvitation = asyncHandler(async (req, res) => {
  const { teamId, userId } = req.body;

  const team = await Team.findById(teamId);
  if (!team) {
    return new ApiError(404, "Team not found");
  }

  const user = await User.findById(userId);
  if (!user) {
    return new ApiError(404, "User not found");
  }

  // Check if user is already a member
  if (team.members.includes(userId)) {
    return new ApiError(400, "User is already a member of this team");
  }

  // Check if team is full
  if (team.members.length >= team.maxMembers) {
    return new ApiError(400, "Team is already full");
  }

  // Check if invitation already exists
  const existingInvitation = user.teamInvitations?.find(
    (invitation) => invitation.teamId.toString() === teamId
  );

  if (existingInvitation) {
    return new ApiError(400, "Invitation already sent to this user");
  }

  // Add invitation to user's teamInvitations
  await User.findByIdAndUpdate(
    userId,
    {
      $push: {
        teamInvitations: {
          teamId: team._id,
          teamName: team.teamName,
          hackathonId: team.hackathonId,
          invitedBy: teamLeaderId,
          invitedAt: new Date(),
        },
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Team invitation sent successfully"));
});

// Accept team invitation
const acceptTeamInvitation = asyncHandler(async (req, res) => {
  const { teamId, userId } = req.body;

  if (!userId) {
    return new ApiError(401, "Authentication required");
  }

  const user = await User.findById(userId);
  if (!user) {
    return new ApiError(404, "User not found");
  }

  // Check if invitation exists
  const invitation = user.teamInvitations?.find(
    (inv) => inv.teamId.toString() === teamId
  );

  if (!invitation) {
    return new ApiError(404, "No invitation found for this team");
  }

  const team = await Team.findById(teamId);
  if (!team) {
    return new ApiError(404, "Team not found");
  }

  // Check if team is full
  if (team.members.length >= team.maxMembers) {
    return new ApiError(400, "Team is already full");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Add user to team members
    await Team.findByIdAndUpdate(
      teamId,
      {
        $push: { members: userId },
      },
      { session }
    );

    // Remove invitation from user's teamInvitations
    await User.findByIdAndUpdate(
      userId,
      {
        $pull: {
          teamInvitations: { teamId: team._id },
        },
      },
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    return new ApiError(500, "Error accepting team invitation");
  } finally {
    session.endSession();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Team invitation accepted successfully"));
});

// Reject team invitation
const rejectTeamInvitation = asyncHandler(async (req, res) => {
  const { teamId, userId } = req.body;

  if (!userId) {
    return new ApiError(401, "Authentication required");
  }

  // Remove invitation from user's teamInvitations
  await User.findByIdAndUpdate(userId, {
    $pull: {
      teamInvitations: { teamId: mongoose.Types.ObjectId(teamId) },
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Team invitation rejected successfully"));
});

// Remove member from team
const removeMember = asyncHandler(async (req, res) => {
  const { teamLeaderId, teamId, memberId } = req.body;

  if (!teamLeaderId) {
    return new ApiError(401, "Authentication required");
  }

  const team = await Team.findById(teamId);
  if (!team) {
    return new ApiError(404, "Team not found");
  }

  // Verify that the requester is the team leader
  if (team.teamLeader.toString() !== teamLeaderId.toString()) {
    return new ApiError(403, "Only team leader can remove members");
  }

  // Prevent removing team leader
  if (memberId === team.teamLeader.toString()) {
    return new ApiError(400, "Team leader cannot be removed");
  }

  // Check if user is actually a member
  if (!team.members.includes(memberId)) {
    return new ApiError(400, "User is not a member of this team");
  }

  // Remove member from team
  const updatedTeam = await Team.findByIdAndUpdate(
    teamId,
    {
      $pull: { members: memberId },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTeam, "Member removed successfully"));
});
const leaveTeam = asyncHandler(async (req, res) => {
  const { teamId, userId } = req.body;

  if (!userId) {
    return new ApiError(401, "Authentication required");
  }

  const team = await Team.findById(teamId);
  if (!team) {
    return new ApiError(404, "Team not found");
  }

  // Check if user is actually a member
  if (!team.members.includes(userId)) {
    return new ApiError(400, "You are not a member of this team");
  }

  // If user is team leader, delete the entire team
  if (team.teamLeader.toString() === userId.toString()) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Remove team from hackathon's teams array
      await Hackathon.findByIdAndUpdate(
        team.hackathonId,
        {
          $pull: { teams: teamId },
        },
        { session }
      );

      // Remove team invitations from all users
      await User.updateMany(
        { "teamInvitations.teamId": team._id },
        {
          $pull: {
            teamInvitations: { teamId: team._id },
          },
        },
        { session }
      );

      // Delete the team
      await Team.findByIdAndDelete(teamId).session(session);

      await session.commitTransaction();

      return res
        .status(200)
        .json(
          new ApiResponse(200, null, "Team deleted successfully as leader left")
        );
    } catch (error) {
      await session.abortTransaction();
      return new ApiError(500, "Error deleting team");
    } finally {
      session.endSession();
    }
  }

  // If not team leader, just remove the member
  const updatedTeam = await Team.findByIdAndUpdate(
    teamId,
    {
      $pull: { members: userId },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTeam, "Left team successfully"));
});

export {
  getHackathonTeams,
  getTeamDetails,
  uploadHackathon,
  createTeam,
  requestToJoinTeam,
  addMemberToTeam,
  sendTeamInvitation,
  removeMember,
  rejectTeamInvitation,
  addMemberToTeam,
  acceptTeamInvitation,
};
