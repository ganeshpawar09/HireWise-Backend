import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Define Education schema
const EducationSchema = new mongoose.Schema({
  institution: { type: String, required: true },
  degree: { type: String, required: true },
  startYear: { type: String, required: true },
  endYear: { type: String, required: true },
});

// Define Project schema
const ProjectSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  technologyUsed: { type: String, required: true },
  projectLink: { type: String },
});

// Define Experience schema
const ExperienceSchema = new Schema({
  companyName: { type: String, required: true },
  jobTitle: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String },
});

// Define Assessment schema
const AssessmentSchema = new Schema({
  overallScore: { type: Number, required: true },
  date: { type: Date, required: true },
  detailedScores: { type: Map, of: Number },
});

// Define User schema
const UserSchema = new Schema({
  // Personal Information
  id: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  name: { type: String, required: true },
  gender: { type: String, required: true },
  dateOfBirth: { type: String, required: true },
  differentlyAbled: { type: Boolean, required: true },
  location: { type: String, required: true },

  // Contact Information
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  socialLinks: { type: Map, of: String },

  // Resume and Profile
  resume: { type: String, required: true },
  resumeFileName: { type: String, required: true },
  lastUpdatedDate: { type: String, required: true },
  fresher: { type: Boolean, required: true },
  profileHeadline: { type: String, required: true },
  profileSummary: { type: String, required: true },
  careerBreak: { type: Boolean, required: true },

  // Skills and Achievements
  keySkills: [{ type: String, required: true }],
  achievements: [{ type: String }],
  targetCompanies: [{ type: String }],

  // Education and Experience
  education: [EducationSchema],
  experience: [ExperienceSchema],
  projects: [ProjectSchema],

  // Job Applications
  appliedJobs: [{ type: Schema.Types.ObjectId, ref: "Job" }],

  // Teams
  joinedTeams: { type: Map, of: String },
  createdTeams: { type: Map, of: String },
  teamInvitations: [{ type: Schema.Types.ObjectId, ref: "Team" }],

  // Assessments
  aptitudeAssessments: [AssessmentSchema],
  mockInterviewAssessments: [AssessmentSchema],
  communicationAssessments: [AssessmentSchema],

  accessToken: [{ type: String }],
});

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      phoneNumber: this.phoneNumber,
      name: this.name,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
