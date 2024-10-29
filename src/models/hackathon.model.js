import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  content: { type: String, required: true },
});

// Define Team schema
const TeamSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  problemStatement: { type: String, required: true },
  hackathonId: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "TeamUser" }],
  maxMembers: { type: Number, required: true },
  requiredSkills: [{ type: String, required: true }],
  joiningRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "TeamUser" }],
  teamLeader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TeamUser",
    required: true,
  },
  chats: [ChatSchema],
});

// Define Hackathon schema
const HackathonSchema = new mongoose.Schema({
  hackathonName: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationStartDate: { type: Date, required: true },
  registrationEndDate: { type: Date, required: true },
  resultsDate: { type: Date, required: true },
  maxTeamSize: { type: Number, required: true },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }], // References to Team collection
  problemStatements: [{ type: String, required: true }],
  rules: [{ type: String, required: true }],
  status: { type: String, default: "upcoming" },
  organizer: { type: String, default: "" },
  prizeMoney: { type: Number, default: 0 },
  location: { type: String, required: true },
  imageUrl: { type: String, required: true },
});

const TeamUserSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  name: {
    type: String,
  },
  keySkills: [
    {
      type: String,
    },
  ],
});
export const Chat = mongoose.model("Chat", ChatSchema);
export const Team = mongoose.model("Team", TeamSchema);
export const TeamUser = mongoose.model("TeamUser", TeamUserSchema);
export const Hackathon = mongoose.model("Hackathon", HackathonSchema);
