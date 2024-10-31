import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const Schema = mongoose.Schema;

// Submission Stats Schema
const SubmissionStatsSchema = new Schema({
  activeDays: { type: Number, required: true },
  maxStreak: { type: Number, required: true },
});

// LeetCode Data Schema
const LeetCodeDataSchema = new Schema({
  ratingHistory: [{ type: Number }],
  problemStats: { type: Map, of: Number },
  languageUsage: { type: Map, of: Number },
  skillStats: { type: Map, of: Number },
  submissionStats: { type: SubmissionStatsSchema, required: true },
});

// GitHub Data Schema
const GitHubDataSchema = new Schema({
  repositories: { type: Number, required: true },
  stars: { type: Number, required: true },
  followers: { type: Number, required: true },
  following: { type: Number, required: true },
  languageDistribution: { type: Map, of: Number },
});

// Education Schema
const EducationSchema = new Schema({
  institution: { type: String, required: true },
  degree: { type: String, required: true },
  startYear: { type: String, required: true },
  endYear: { type: String, required: true },
});

// Project Schema
const ProjectSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  technologyUsed: { type: String, required: true },
  projectLink: { type: String, required: true },
});

// Experience Schema
const ExperienceSchema = new Schema({
  companyName: { type: String, required: true },
  jobTitle: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
});

// Assessment Base Schema
const AssessmentSchema = new Schema(
  {
    overallScore: { type: Number, required: true },
    date: { type: Date, required: true },
    detailedScores: { type: Map, of: Number },
  },
  { discriminatorKey: "assessmentType" }
);

const UserSchema = new Schema(
  {
    firstName: String,
    middleName: String,
    lastName: String,
    name: String,
    gender: String,
    dateOfBirth: String,
    differentlyAbled: Boolean,
    location: String,
    email: { type: String, required: true, unique: true },
    phoneNumber: String,
    lastUpdatedDate: String,
    fresher: Boolean,
    profileHeadline: String,
    profileSummary: String,
    careerBreak: Boolean,
    keySkills: [String],
    achievements: [String],
    targetCompanies: [String],
    education: [EducationSchema],
    experience: [ExperienceSchema],
    projects: [ProjectSchema],
    appliedJobs: [{ type: Schema.Types.ObjectId, ref: "Job" }],
    joinedTeams: { type: Map, of: String },
    createdTeams: { type: Map, of: String },
    teamInvitations: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    aptitudeAssessments: [
      { type: Schema.Types.ObjectId, ref: "AptitudeTestResult" },
    ],
    mockInterviewAssessments: [AssessmentSchema],
    communicationAssessments: [AssessmentSchema],
    gitHubData: GitHubDataSchema,
    leetCodeData: LeetCodeDataSchema,
    linkedin: String,
    leetcode: String,
    github: String,
    portfolio: String,
    accessToken: { type: String }, // Ensure this is defined as a String
  },
  {
    timestamps: true,
  }
);

// Method to generate access tokens
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

// Export User model
export const User = mongoose.model("User", UserSchema);
