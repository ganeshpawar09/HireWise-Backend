import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { Cluster } from "../models/cluster.model.js";
import { pipeline } from "@xenova/transformers";

// import axios from "axios";

// // ✅ Cosine Similarity Function
// const cosineSimilarity = (vec1, vec2) => {
//   if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
//   const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
//   const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val ** 2, 0));
//   const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val ** 2, 0));
//   return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
// };

// export const matchRole = async (skills) => {
//   try {
//     const response = await axios.post("http://0.0.0.0:8000/match-role", {
//       skills,
//     });
//     return response.data; // Returns proximity_scores & user_vector
//   } catch (error) {
//     console.error("Error calling match_role API:", error.message);
//     return new ApiError(500, "Failed to match user skills");
//   }
// };

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

// Upload Jobs (Handles Validation, Clusters, and Bulk Insert)
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

      const clusterNames = Object.entries(processedData.proximity_scores)
        .filter(([_, percentage]) => percentage > 0.3)
        .map(([clusterName]) => clusterName);

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

      const clusters = existingClusters.map((cluster) => ({
        clusterId: cluster._id,
        percentage: processedData.proximity_scores[cluster.name],
      }));

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

    const clusterUpdates = jobsToSave.flatMap(({ job, clusters }) =>
      clusters.map((cluster) => ({
        updateOne: {
          filter: { _id: cluster.clusterId },
          update: {
            $push: { jobs: { jobId: job._id, percentage: cluster.percentage } },
          },
        },
      }))
    );

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

// ✅ Get Personalized Jobs
export const getPersonalizedJobs = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  // Ensure at least two clusters are considered, even if the second one has 0%
  const sortedClusters = user.clusters
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 2); // Always take the top 2 clusters

  if (sortedClusters.length < 2) {
    return res
      .status(400)
      .json(new ApiError(400, "User must have clusters for recommendations"));
  }

  const [topClusterId, secondClusterId] = [
    sortedClusters[0]?.clusterId,
    sortedClusters[1]?.clusterId || sortedClusters[0]?.clusterId, // Use top cluster if there's only one
  ];

  const [topClusterJobs, secondClusterJobs] = await Promise.all([
    Job.find({ "clusters.clusterId": topClusterId }).limit(20),
    Job.find({ "clusters.clusterId": secondClusterId }).limit(20),
  ]);

  // const filterRelevantJobs = (jobs) => {
  //   return jobs
  //     .map((job) => ({
  //       job,
  //       similarity: cosineSimilarity(user.embedding, job.embedding),
  //     }))
  //     .filter(
  //       (j) =>
  //         j.similarity > 0.3 &&
  //         j.job.applicants &&
  //         !j.job.applicants.includes(userId)
  //     )
  //     .sort((a, b) => b.similarity - a.similarity)
  //     .slice(0, 10)
  //     .map((j) => j.job);
  // };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        recommendedJobs: topClusterJobs,
        youMightLikeJobs: secondClusterJobs,
      },
      "Personalized jobs fetched successfully"
    )
  );
});

export const getAppliedJobs = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId).populate("appliedJobs");
  if (!user) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.appliedJobs,
        "Applied jobs fetched successfully"
      )
    );
});

// ✅ Search Jobs by Cluster
export const searchJobs = asyncHandler(async (req, res) => {
  const { userId, clusterName } = req.body;

  const user = await User.findById(userId);
  const cluster = await Cluster.findOne({ name: clusterName });

  if (!user || !cluster) {
    return res.status(404).json(new ApiError(404, "User or Cluster not found"));
  }

  const userCluster = user.clusters.find((c) =>
    c.clusterId.equals(cluster._id)
  );
  if (userCluster) {
    userCluster.percentage = Math.min(userCluster.percentage + 5, 100);
  } else {
    user.clusters.push({ clusterId: cluster._id, percentage: 5 });
  }
  await user.save();

  const jobs = await Job.find({
    _id: { $in: cluster.jobs.map((j) => j.jobId) },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, jobs, "Jobs fetched successfully"));
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
      userCluster.percentage = Math.min(
        userCluster.percentage + jobCluster.percentage * 0.1,
        100
      );
    } else {
      user.clusters.push({
        clusterId: jobCluster.clusterId,
        percentage: jobCluster.percentage * 0.1,
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
