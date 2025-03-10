import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { Cluster } from "../models/cluster.model.js";
import { pipeline } from "@xenova/transformers";

const model = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

// Function to extract embeddings and ensure array format
const getEmbeddings = async (text) => {
  const result = await model(text, { pooling: "mean", normalize: true });
  return result.data ? Array.from(result.data) : Array.from(result);
};

// Role-Skill Mapping
const roleSkillData = {
  "Frontend Developer": [
    "React",
    "Vue.js",
    "Next.js",
    "JavaScript",
    "TypeScript",
    "Redux",
    "CSS",
    "Sass",
    "Tailwind CSS",
    "GraphQL",
    "Webpack",
  ],
  "Mobile Developer": [
    "Flutter",
    "Dart",
    "Swift",
    "Kotlin",
    "React Native",
    "Android",
    "iOS",
    "Objective-C",
    "Xcode",
    "Java",
  ],
  "Backend Developer": [
    "Node.js",
    "Express",
    "MongoDB",
    "Python",
    "PostgreSQL",
    "FastAPI",
    "Java",
    "Spring Boot",
    "MySQL",
    "Redis",
    "Kafka",
    "Docker",
    "Kubernetes",
    "AWS",
  ],
  "AI/ML Developer": [
    "TensorFlow",
    "PyTorch",
    "Machine Learning",
    "Deep Learning",
    "NLP",
    "Scikit-learn",
    "Pandas",
    "Keras",
    "Matplotlib",
    "OpenCV",
  ],
};

const roles = Object.keys(roleSkillData);
const skillTexts = Object.values(roleSkillData).map((skills) =>
  skills.join(" ")
);

const roleSkillVectors = await Promise.all(skillTexts.map(getEmbeddings));

// ✅ Fix: Debug and validate vectors
const cosineSimilarity = (vec1, vec2) => {
  if (!Array.isArray(vec1) || !Array.isArray(vec2)) {
    throw new Error("cosineSimilarity: One or both vectors are not arrays!");
  }

  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val ** 2, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val ** 2, 0));
  return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
};

// Function to match user skills to roles
export const matchRole = async (userSkills, threshold = 0.3) => {
  if (!userSkills || userSkills.length === 0) {
    throw new Error("No skills provided");
  }

  const userText = userSkills.join(" ");
  const userVector = await getEmbeddings(userText);

  const proximityScores = roles.reduce((acc, role, i) => {
    const score = cosineSimilarity(userVector, roleSkillVectors[i]);
    acc[role] = score >= threshold ? score : 0.0;
    return acc;
  }, {});
  return {
    status: "success",
    message: "Role matching complete",
    proximity_scores: proximityScores,
    user_vector: userVector,
  };
};

// ✅ Validate Job Data Before Insertion
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
    return new ApiError(
      400,
      `Missing required fields: ${missingFields.join(", ")}`
    );
  }
  return null;
};

export const uploadJobs = asyncHandler(async (req, res) => {
  const jobsArray = req.body;
  if (!Array.isArray(jobsArray) || jobsArray.length === 0) {
    return res
      .status(400)
      .json(new ApiError(400, "Invalid job data. Expecting an array of jobs."));
  }

  const failedJobs = [];
  const jobsToSave = [];

  for (const jobData of jobsArray) {
    const validationError = validateJobData(jobData);
    if (validationError) {
      failedJobs.push({ jobData, error: validationError.message });
      continue;
    }

    try {
      const processedData = await matchRole(jobData.requiredSkills);
      if (processedData instanceof ApiError) {
        failedJobs.push({ jobData, error: processedData.message });
        continue;
      }

      const clusterNames = Object.keys(processedData.proximity_scores);
      let existingClusters = await Cluster.find({
        name: { $in: clusterNames },
      });

      const newClusters = clusterNames
        .filter((name) => !existingClusters.some((c) => c.name === name))
        .map((name) => new Cluster({ name, jobs: [] }));

      if (newClusters.length > 0) {
        const savedClusters = await Cluster.insertMany(newClusters);
        existingClusters = [...existingClusters, ...savedClusters];
      }

      // Find the top cluster
      let topCluster = existingClusters.reduce((max, cluster) => {
        return processedData.proximity_scores[cluster.name] >
          processedData.proximity_scores[max.name]
          ? cluster
          : max;
      }, existingClusters[0]);

      // If no clusters exist, create a new one
      if (!topCluster) {
        topCluster = new Cluster({ name: clusterNames[0], jobs: [] });
        await topCluster.save();
        existingClusters.push(topCluster);
      }

      const clusters = [
        {
          clusterId: topCluster._id,
          percentage: processedData.proximity_scores[topCluster.name],
        },
      ];

      const newJob = new Job({
        ...jobData,
        postingDate: new Date(),
        deadline: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1)
        ),
        applicants: [],
        clusters,
        embedding: processedData.user_vector,
      });

      jobsToSave.push({ job: newJob, clusters });
    } catch (error) {
      console.error("Error processing job:", error.message);
      failedJobs.push({ jobData, error: "Failed to process job data" });
    }
  }

  if (jobsToSave.length > 0) {
    const savedJobs = await Job.insertMany(jobsToSave.map(({ job }) => job));

    const clusterUpdates = jobsToSave.map(({ job, clusters }) => ({
      updateOne: {
        filter: { _id: clusters[0].clusterId },
        update: {
          $push: {
            jobs: { jobId: job._id, percentage: clusters[0].percentage },
          },
        },
      },
    }));

    await Cluster.bulkWrite(clusterUpdates);

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { savedJobs, failedJobs },
          "Jobs uploaded successfully"
        )
      );
  }

  return res
    .status(400)
    .json(new ApiResponse(400, { failedJobs }, "All jobs failed to process"));
});

// ✅ Apply for a Job
export const applyJob = asyncHandler(async (req, res) => {
  const { userId, jobId } = req.body;

  const user = await User.findById(userId);
  const job = await Job.findById(jobId);
  if (!user || !job) {
    return res.status(404).json(new ApiError(404, "User or Job not found"));
  }

  job.clusters.forEach((jobCluster) => {
    const userCluster = user.clusters.find((c) =>
      c.clusterId.equals(jobCluster.clusterId)
    );
    if (userCluster) {
      userCluster.percentage = userCluster.percentage + 0.1;
    } else {
      user.clusters.push({
        clusterId: jobCluster.clusterId,
        percentage: 0.1,
      });
    }
  });

  if (!user.appliedJobs.includes(jobId)) user.appliedJobs.push(jobId);
  if (!job.applicants.includes(userId)) job.applicants.push(userId);

  await user.save();
  await job.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Job application successful"));
});

export const getAppliedJobs = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId).populate("appliedJobs");
  if (!user) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  // Calculate match percentage for each applied job
  const appliedJobsWithMatch = user.appliedJobs
    .map((job) => ({
      ...job.toObject(),
      matchPercentage:
        Math.max(0, cosineSimilarity(user.embedding, job.embedding) * 100) || 0,
    }))
    .reverse();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        appliedJobsWithMatch,
        "Applied jobs fetched successfully"
      )
    );
});

// ✅ Search Jobs by Cluster (with match percentage)
export const searchJobs = asyncHandler(async (req, res) => {
  const { userId, clusterName } = req.body;

  const user = await User.findById(userId).populate("appliedJobs");
  const cluster = await Cluster.findOne({ name: clusterName });

  if (!user || !cluster) {
    return res.status(404).json(new ApiError(404, "User or Cluster not found"));
  }

  // Find user's cluster percentage
  const userCluster = user.clusters.find((c) =>
    c.clusterId.equals(cluster._id)
  );
  const userClusterPercentage = userCluster ? userCluster.percentage : 0;

  // Update user's cluster percentage
  if (userCluster) {
    userCluster.percentage += 0.05;
  } else {
    user.clusters.push({ clusterId: cluster._id, percentage: 0.05 });
  }
  await user.save();

  // Fetch jobs related to the cluster
  const jobs = await Job.find({
    _id: { $in: cluster.jobs.map((j) => j.jobId) },
  });

  // Get applied job IDs
  const appliedJobIds = new Set(
    user.appliedJobs.map((job) => job._id.toString())
  );

  // Filter out applied jobs and add match percentage

  const jobsWithMatch = jobs
    .filter((job) => !appliedJobIds.has(job._id.toString()))
    .map((job) => ({
      ...job.toObject(),
      matchPercentage:
        Math.max(0, cosineSimilarity(user.embedding, job.embedding) * 100) || 0,
    }))
    .sort((a, b) => b.matchPercentage - a.matchPercentage); // Sort by match percentage

  return res
    .status(200)
    .json(new ApiResponse(200, jobsWithMatch, "Jobs fetched successfully"));
});

// ✅ Get Personalized Jobs (with match percentage)
export const getPersonalizedJobs = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId).populate("appliedJobs");
  if (!user) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  // Sort user clusters by percentage in descending order
  const sortedClusters = user.clusters.sort(
    (a, b) => b.percentage - a.percentage
  );

  // Get the top cluster ID and its percentage
  const topCluster = sortedClusters[0];
  if (!topCluster) {
    return res
      .status(404)
      .json(new ApiError(404, "No clusters found for the user"));
  }

  // Fetch jobs related to the top cluster
  const topClusterJobs = await Job.find({
    "clusters.clusterId": topCluster.clusterId,
  });

  // Get applied job IDs
  const appliedJobIds = new Set(
    user.appliedJobs.map((job) => job._id.toString())
  );

  // Filter out applied jobs and add match percentage
  const recommendedJobs = topClusterJobs
    .filter((job) => !appliedJobIds.has(job._id.toString()))
    .map((job) => {
      const jobCluster = job.clusters.find((c) =>
        c.clusterId.equals(topCluster.clusterId)
      );
      return {
        ...job.toObject(),
        matchPercentage:
          Math.max(0, cosineSimilarity(user.embedding, job.embedding) * 100) ||
          0,
      };
    })
    .sort((a, b) => b.matchPercentage - a.matchPercentage); // Sort by match percentage

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { recommendedJobs },
        "Personalized jobs fetched successfully"
      )
    );
});
