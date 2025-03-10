import mongoose from "mongoose";

const HackathonSchema = new mongoose.Schema({
  hackathonName: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  maxTeamSize: { type: Number, required: true },
  problemStatements: [{ type: String, required: true }],
  rules: [{ type: String, required: true }],
  organizer: { type: String, default: "" },
  prizeMoney: { type: Number, default: 0 },
  location: { type: String, required: true },
  imageUrl: { type: String, required: true },
  registrationLink: { type: String, required: true },
});

const Hackathon = mongoose.model("Hackathon", HackathonSchema);

export default Hackathon;
