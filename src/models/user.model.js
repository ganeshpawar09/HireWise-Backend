import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Define Education schema
const EducationSchema = new mongoose.Schema({
  institution: { type: String },
  degree: { type: String },
  startYear: { type: String },
  endYear: { type: String },
});

// Define Project schema
const ProjectSchema = new mongoose.Schema({
  title: { type: String },
  description: { type: String },
  technologyUsed: { type: String },
  projectLink: { type: String },
});

// Define Experience schema
const ExperienceSchema = new mongoose.Schema({
  companyName: { type: String },
  jobTitle: { type: String },
  startDate: { type: String },
  endDate: { type: String },
});

// Define Assessment schema
const AssessmentSchema = new mongoose.Schema({
  overallScore: { type: Number },
  date: { type: Date },
  detailedScores: { type: Map, of: Number },
});

// Define User schema
const UserSchema = new mongoose.Schema({
  // Personal Information
  firstName: { type: String },
  middleName: { type: String },
  lastName: { type: String },
  name: { type: String },
  gender: { type: String },
  dateOfBirth: { type: String },
  differentlyAbled: { type: Boolean },
  location: { type: String },

  // Contact Information
  email: { type: String, required: true }, // Keep email required
  phoneNumber: { type: String },
  socialLinks: { type: Map, of: String },

  // Resume and Profile
  resume: { type: String },
  resumeFileName: { type: String },
  lastUpdatedDate: { type: String },
  fresher: { type: Boolean },
  profileHeadline: { type: String },
  profileSummary: { type: String },
  careerBreak: { type: Boolean },

  // Skills and Achievements
  keySkills: [{ type: String }],
  achievements: [{ type: String }],
  targetCompanies: [{ type: String }],

  // Education and Experience
  education: [EducationSchema],
  experience: [ExperienceSchema],
  projects: [ProjectSchema],

  // Job Applications
  appliedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],

  // Teams
  joinedTeams: { type: Map, of: String },
  createdTeams: { type: Map, of: String },
  teamInvitations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],

  // Assessments
  aptitudeAssessments: [AssessmentSchema],
  mockInterviewAssessments: [AssessmentSchema],
  communicationAssessments: [AssessmentSchema],

  accessToken: [{ type: String }],
});

UserSchema.methods.generateAccessToken = function () {
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

export const User = mongoose.model("User", UserSchema);
