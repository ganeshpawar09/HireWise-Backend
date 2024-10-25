import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";

const uploadJobs = asyncHandler(async (req, res) => {
  const jobsData = req.body; // assuming an array of jobs is sent in the request body

  // Insert the jobs into the database
  const createdJobs = await Job.insertMany(jobsData);

  return res
    .status(201)
    .json(new ApiResponse(201, createdJobs, "Jobs uploaded successfully"));
});

const applyJob = asyncHandler(async (req, res) => {
  const { jobId, userId } = req.body;

  const job = await Job.findById(jobId);
  if (!job) {
    return new ApiError(404, "Job not found");
  }

  if (job.applicants.includes(userId)) {
    return new ApiError(400, "You have already applied to this job");
  }

  // Add user to job applicants
  job.applicants.push(userId);
  await job.save();

  // Add company to user's applied companies
  const user = await User.findById(userId);
  if (!user.appliedJobs.includes(jobId)) {
    user.appliedJobs.push(jobId);
    await user.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, job, "Successfully applied to job"));
});

const searchJobs = asyncHandler(async (req, res) => {
  const { role, keySkills, companyName, location, jobType } = req.query;

  const query = {};

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    query.role = { $in: roles.map((r) => new RegExp(r, "i")) };
  }

  if (location) {
    const locations = Array.isArray(location) ? location : [location];
    query.location = { $in: locations.map((loc) => new RegExp(loc, "i")) };
  }

  if (jobType) {
    const jobTypes = Array.isArray(jobType) ? jobType : [jobType];
    query.jobType = { $in: jobTypes };
  }

  if (companyName) {
    const companies = Array.isArray(companyName) ? companyName : [companyName];
    query.companyName = { $in: companies.map((name) => new RegExp(name, "i")) };
  }

  if (keySkills) {
    const requiredSkills = Array.isArray(keySkills) ? keySkills : [keySkills];
    query.requiredSkills = { $in: requiredSkills };
  }

  const jobs = await Job.find(query)
    .sort({ postingDate: -1 }) 
    .select("-applicants"); 

  // Return the jobs in response
  return res
    .status(200)
    .json(new ApiResponse(200, jobs, "Jobs retrieved successfully"));
});

const getJobsForUser = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Assuming user is authenticated
  const user = await User.findById(userId);

  if (!user) {
    return new ApiError(404, "User not found");
  }

  // Build query based on user's profile
  const query = {
    $or: [
      // Match based on user's key skills
      { requiredSkills: { $in: user.keySkills || [] } },
      // Match based on user's recommended job roles
      { role: { $in: user.recommendedJobRoles || [] } },
      // Match based on user's location
      { location: user.location },
    ],
  };

  // If user is a fresher, exclude jobs requiring experience
  if (user.fresher) {
    query.experience = { $in: ["0-1 years", "Fresher", null] };
  }

  const recommendedJobs = await Job.find(query)
    .sort({ postingDate: -1 })
    .limit(20)
    .select("-applicants"); // Exclude applicants list for privacy

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        recommendedJobs,
        "Recommended jobs retrieved successfully"
      )
    );
});
const getJob = asyncHandler(async (req, res) => {
  try {
    // Retrieve all job entries from the database
    const jobs = await Job.find();

    return res
      .status(200)
      .json(new ApiResponse(200, jobs, "All jobs retrieved successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to retrieve jobs"));
  }
});

export { uploadJobs, applyJob, searchJobs, getJobsForUser, getJob };
