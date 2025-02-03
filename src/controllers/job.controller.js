import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Cluster } from "../models/cluster.model.js";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};
// Validate job data before insertion
const validateJobData = (jobData) => {
  const requiredFields = [
    "title",
    "companyName",
    "location",
    "jobType",
    "requiredSkills",
  ];
  const missingFields = requiredFields.filter((field) => !jobData[field]);

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(
        new ApiError(
          400,
          `Missing required fields: ${missingFields.join(", ")}`
        )
      );
  }
};
const uploadJobs = asyncHandler(async (req, res) => {
  try {
    const jobsArray = req.body; // Expecting an array of job objects

    if (!Array.isArray(jobsArray) || jobsArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid job data. Expecting an array of jobs.",
      });
    }

    const savedJobs = await Promise.all(
      jobsArray.map(async (jobData) => {
        // Validate each job data
        validateJobData(jobData);

        // Create new job instance
        const newJob = new Job({
          ...jobData,
          postingDate: new Date(),
          deadline: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1)
          ), // One year later
          applicants: [],
        });

        // Process job to get clusters and embeddings
        const chatSession = model.startChat({ generationConfig, history: [] });

        const prompt = `
        You are an AI model specialized in job market analysis. Given the job details below, assign relevant clusters and generate an embedding.

        Job Clusters:
        - Mobile Developer
        - Frontend Developer
        - Backend Developer
        - AI/ML Developer
        
        **Job Details:**
        ${JSON.stringify(newJob)}

        **Response Format (JSON only, no markdown or explanations):**
        {
          "clusters": [
            {
              "clusterName": "Frontend Developer",
              "percentage": 85
            }
          ],
          "embedding": [0.12, 0.34, 0.56, ...] // Example numbers
        }
      `;

        const result = await chatSession.sendMessage(prompt);
        let responseText = result.response.text().trim();

        // Remove markdown formatting (```json and ```)
        responseText = responseText.replace(/```json|```/g, "").trim();

        // Parse processed data
        const processedData = JSON.parse(responseText);

        // Ensure clusters exist in the database and map their IDs
        const clusters = await Promise.all(
          processedData.clusters.map(async (cluster) => {
            let existingCluster = await Cluster.findOne({
              name: cluster.clusterName,
            });

            if (!existingCluster) {
              existingCluster = new Cluster({
                name: cluster.clusterName,
                jobs: [],
              });
              await existingCluster.save();
            }

            return {
              clusterId: existingCluster._id,
              percentage: cluster.percentage,
            };
          })
        );

        // Assign clusters and embedding to the job
        newJob.clusters = clusters;
        newJob.embedding = processedData.embedding;
        await newJob.save();

        // Update cluster documents to include this job
        await Promise.all(
          clusters.map(async (cluster) => {
            await Cluster.findByIdAndUpdate(cluster.clusterId, {
              $push: {
                jobs: { jobId: newJob._id, percentage: cluster.percentage },
              },
            });
          })
        );

        return newJob;
      })
    );

    res.status(201).json({
      success: true,
      message: "Jobs processed and clusters updated successfully",
      jobs: savedJobs,
    });
  } catch (error) {
    console.error("Error processing jobs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
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
    return res.status(404).json(new ApiError(404, "User not found"));
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

const applyJobs = asyncHandler(async (req, res) => {
  const { jobId, userId } = req.body;

  // Start MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the job with its cluster information
    const job = await Job.findById(jobId).select("clusters applicants");
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found"));
    }

    // Prevent duplicate applications
    if (job.applicants.includes(userId)) {
      return res
        .status(400)
        .json(new ApiError(400, "You have already applied to this job"));
    }

    // Fetch user and apply for job
    const user = await User.findById(userId).session(session);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    // Increase user's cluster percentages based on job clusters
    job.clusters.forEach((jobCluster) => {
      const userCluster = user.clusters.find(
        (uc) => uc.clusterId.toString() === jobCluster.clusterId.toString()
      );

      if (userCluster) {
        // Increase percentage if the user already has this cluster
        userCluster.percentage += jobCluster.percentage * 0.5; // Adjust weight as needed
      } else {
        // Add new cluster with an initial percentage
        user.clusters.push({
          clusterId: jobCluster.clusterId,
          percentage: jobCluster.percentage * 0.5,
        });
      }
    });

    // Save user with updated cluster percentages
    await user.save({ session });

    // Update job applicants list
    await Job.findByIdAndUpdate(
      jobId,
      { $push: { applicants: userId } },
      { new: true, session }
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Successfully applied to job"));
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json(new ApiError(500, "Get issue while applying"));
  }
});
const searchJobs = asyncHandler(async (req, res) => {
  const { role, sortBy = "postingDate", order = "desc" } = req.body;
  const userId = req.user._id; // From authentication middleware

  const query = { isExpired: { $ne: true } };

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    query.role = { $in: roles.map((r) => new RegExp(r, "i")) };
  }

  // Find jobs based on query
  const jobs = await Job.find(query)
    .sort({ [sortBy]: order === "desc" ? -1 : 1 })
    .select("clusters");

  // If the user searched for a specific role, update their cluster percentages
  if (role) {
    const user = await User.findById(userId);
    if (user) {
      role.forEach(async (searchedRole) => {
        // Find the cluster corresponding to the searched role
        const cluster = await Cluster.findOne({ name: searchedRole });

        if (cluster) {
          const userCluster = user.clusters.find(
            (uc) => uc.clusterId.toString() === cluster._id.toString()
          );

          if (userCluster) {
            userCluster.percentage += 1; // Increase by a small amount
          } else {
            user.clusters.push({ clusterId: cluster._id, percentage: 1 });
          }
        }
      });

      await user.save();
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, jobs, "Jobs retrieved successfully"));
});

const markJobNotInterested = asyncHandler(async (req, res) => {
  const { jobId, userId } = req.body;

  // Start a transaction session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the job with its cluster information
    const job = await Job.findById(jobId).select("clusters");
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found"));
    }

    // Find user
    const user = await User.findById(userId).session(session);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    // Reduce user's cluster percentages based on job clusters
    job.clusters.forEach((jobCluster) => {
      const userCluster = user.clusters.find(
        (uc) => uc.clusterId.toString() === jobCluster.clusterId.toString()
      );

      if (userCluster) {
        userCluster.percentage -= jobCluster.percentage * 0.3; // Reduce weight (adjust as needed)

        // Prevent negative percentages
        if (userCluster.percentage < 0) {
          userCluster.percentage = 0;
        }
      }
    });

    // Save user with updated cluster percentages
    await user.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Marked job as Not Interested"));
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json(new ApiError(500, "Get issue while applying"));
  }
});

const recommendedJobs = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Find user with embedding & cluster info
  const user = await User.findById(userId).select(
    "embedding clusters appliedJobs notInterestedJobs"
  );
  if (!user) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  // Get top 3 clusters by percentage
  const topClusters = user.clusters
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3)
    .map((cluster) => cluster.clusterId);

  // Get jobs from top 3 clusters (last 30 days, not applied, not marked as "Not Interested", deadline not passed)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const today = new Date();

  const jobs = await Job.find({
    clusters: { $in: topClusters },
    postingDate: { $gte: thirtyDaysAgo },
    deadline: { $gte: today }, // Exclude jobs with past deadlines
    _id: { $nin: [...user.appliedJobs, ...user.notInterestedJobs] },
  }).select("embedding title companyName location requiredSkills");

  if (!jobs.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No matching jobs found"));
  }

  // Compute similarity scores
  const rankedJobs = jobs
    .map((job) => ({
      job,
      score: cosineSimilarity(user.embedding, job.embedding),
    }))
    .sort((a, b) => b.score - a.score) // Sort by highest similarity

    .slice(0, 10); // Send top 10 recommendations

  return res
    .status(200)
    .json(
      new ApiResponse(200, rankedJobs, "Recommended jobs fetched successfully")
    );
});

// Function to compute cosine similarity between two vectors
const cosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  return dotProduct / (magnitudeA * magnitudeB);
};

export {
  uploadJobs,
  applyJobs,
  getAppliedJobs,
  searchJobs,
  recommendedJobs,
  markJobNotInterested,
};
