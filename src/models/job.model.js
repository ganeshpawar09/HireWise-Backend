import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  companyName: { type: String, required: true },
  location: { type: String, required: true },
  jobType: { type: String },
  requiredSkills: [{ type: String }],
  description: { type: String },
  salaryRangeMin: { type: Number },
  salaryRangeMax: { type: Number },
  responsibilities: [{ type: String }],
  qualifications: [{ type: String }],
  postingDate: { type: Date },
  deadline: { type: Date },
  jobLink: { type: String },
  experience: { type: String },
  companyDescription: { type: String },
  companyIndustry: { type: String },
  companySize: { type: Number },
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  embedding: { type: [Number], default: [] },
  clusters: [
    {
      clusterId: { type: mongoose.Schema.Types.ObjectId, ref: "Cluster" },
      percentage: { type: Number },
    },
  ],
});

export const Job = mongoose.model("Job", jobSchema);
