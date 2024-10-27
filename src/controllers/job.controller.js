import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";

// Validate job data before insertion
const validateJobData = (jobData) => {
  const requiredFields = [
    "role",
    "companyName",
    "location",
    "jobType",
    "requiredSkills",
  ];
  const missingFields = requiredFields.filter((field) => !jobData[field]);

  if (missingFields.length > 0) {
    throw new ApiError(
      400,
      `Missing required fields: ${missingFields.join(", ")}`
    );
  }
};

const uploadJobs = asyncHandler(async (req, res) => {
  const jobsData = req.body;

  // Validate each job in the array
  if (!Array.isArray(jobsData)) {
    throw new ApiError(400, "Jobs data must be an array");
  }

  jobsData.forEach(validateJobData);

  // Add posting date and initialize applicants array
  const enrichedJobsData = jobsData.map((job) => ({
    ...job,
    postingDate: new Date(),
    applicants: [],
  }));

  const createdJobs = await Job.insertMany(enrichedJobsData);

  return res
    .status(201)
    .json(new ApiResponse(201, createdJobs, "Jobs uploaded successfully"));
});

const applyJobs = asyncHandler(async (req, res) => {
  const { jobId, userId } = req.body;

  const job = await Job.findById(jobId);
  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  if (job.applicants.includes(userId)) {
    throw new ApiError(400, "You have already applied to this job");
  }

  const [updatedJob, updatedUser] = await Promise.all([
    Job.findByIdAndUpdate(
      jobId,
      { $push: { applicants: userId } },
      { new: true }
    ),
    User.findByIdAndUpdate(
      userId,
      { $push: { appliedJobs: jobId } },
      { new: true }
    ),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedJob, "Successfully applied to job"));
});

const getAppliedJobs = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId).populate({
    path: "appliedJobs",
    options: {
      sort: { postingDate: -1 },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.appliedJobs,
        "Applied jobs retrieved successfully"
      )
    );
});

const searchJobs = asyncHandler(async (req, res) => {
  const {
    role,
    keySkills,
    companyName,
    location,
    jobType,
    sortBy = "postingDate",
    order = "desc",
    experienceRange,
  } = req.body;

  const query = { isExpired: { $ne: true } };

  // Build search query
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

  if (experienceRange) {
    query.experienceRequired = experienceRange;
  }

  const jobs = await Job.find(query)
    .sort({ [sortBy]: order === "desc" ? -1 : 1 })
    .select("-applicants");

  return res
    .status(200)
    .json(new ApiResponse(200, jobs, "Jobs retrieved successfully"));
});

const recommendedJobs = asyncHandler(async (req, res) => {
  // const { userId } = req.body;

  // const user = await User.findById(userId);
  // if (!user) {
  //   throw new ApiError(404, "User not found");
  // }

  // const query = {
  //   isExpired: { $ne: true },
  //   $or: [
  //     { requiredSkills: { $in: user.keySkills || [] } },
  //     { location: user.location },
  //     { role: { $regex: user.profileHeadline || "", $options: "i" } },
  //   ],
  // };

  // if (user.fresher) {
  //   query.experienceRequired = { $in: ["0-1 years", "Fresher", null] };
  // }

  // const jobs = await Job.find(query)
  //   .sort({ postingDate: -1 })
  //   .select("-applicants");
  const jobs = await Job.find();
  return res
    .status(200)
    .json(
      new ApiResponse(200, jobs, "Recommended jobs retrieved successfully")
    );
});

const youMightLikeJobs = asyncHandler(async (req, res) => {
  // const { userId } = req.body;

  // const user = await User.findById(userId);
  // if (!user) {
  //   throw new ApiError(404, "User not found");
  // }

  // const appliedJobs = await Job.find({ _id: { $in: user.appliedJobs } });

  // const commonSkills = [
  //   ...new Set(appliedJobs.flatMap((job) => job.requiredSkills)),
  // ];
  // const commonRoles = [...new Set(appliedJobs.map((job) => job.role))];

  // const query = {
  //   isExpired: { $ne: true },
  //   _id: { $nin: user.appliedJobs }, // Exclude already applied jobs
  //   $or: [
  //     { requiredSkills: { $in: commonSkills } },
  //     { role: { $in: commonRoles } },
  //   ],
  // };

  // const jobs = await Job.find(query)
  //   .sort({ postingDate: -1 })
  //   .select("-applicants");
  const jobs = await Job.find();
  return res
    .status(200)
    .json(new ApiResponse(200, jobs, "Similar jobs retrieved successfully"));
});

export {
  uploadJobs,
  applyJobs,
  getAppliedJobs,
  searchJobs,
  recommendedJobs,
  youMightLikeJobs,
};
