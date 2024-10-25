import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  content: { type: String, required: true },
});

// Define Team schema
const TeamSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teamName: { type: String, required: true },
  hackathonId: { type: String, required: true },
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  maxMembers: { type: Number, required: true },
  requiredSkills: [{ type: String, required: true }],
  joiningRequests: [{ type: Schema.Types.ObjectId, ref: "User" }],
  teamLeader: { type: Schema.Types.ObjectId, ref: "User", required: true },
  chats: [ChatSchema],
});

// Define Hackathon schema
const HackathonSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  hackathonName: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationStartDate: { type: Date, required: true },
  registrationEndDate: { type: Date, required: true },
  resultsDate: { type: Date, required: true },
  maxTeamSize: { type: Number, required: true },
  teams: [{ type: Schema.Types.ObjectId, ref: "Team" }], // References to Team collection
  problemStatements: [{ type: String, required: true }],
  rules: [{ type: String, required: true }],
  status: { type: String, default: "upcoming" },
  organizer: { type: String, default: "" },
  prizeMoney: { type: Number, default: 0 },
  location: { type: String, required: true },
  imageUrl: { type: String, required: true },
});

const Chat = mongoose.model("Chat", ChatSchema);
const Team = mongoose.model("Team", TeamSchema);
const Hackathon = mongoose.model("Hackathon", HackathonSchema);

module.exports = { Chat, Team, Hackathon };
