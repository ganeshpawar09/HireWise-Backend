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
    education: [EducationSchema],
    experience: [ExperienceSchema],
    projects: [ProjectSchema],
    appliedJobs: [{ type: Schema.Types.ObjectId, ref: "Job" }],
    aptitudeTestResult: [
      { type: Schema.Types.ObjectId, ref: "AptitudeTestResult" },
    ],
    mockInterviewResult: [
      { type: Schema.Types.ObjectId, ref: "MockInterviewResult" },
    ],
    gitHubData: GitHubDataSchema,
    leetCodeData: LeetCodeDataSchema,
    linkedin: String,
    leetcode: String,
    github: String,
    portfolio: String,
    accessToken: { type: String },
    notInterestedJobs: [{ type: Schema.Types.ObjectId, ref: "Job" }],
    embedding: { type: [Number], default: [] },
    clusters: [
      {
        clusterId: { type: mongoose.Schema.Types.ObjectId, ref: "Cluster" },
        percentage: { type: Number },
      },
    ],
  },
  {
    timestamps: true,
  }
);

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
