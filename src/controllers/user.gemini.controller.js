import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
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

// Utility function to safely parse AI response
const parseAIResponse = (responseText) => {
  try {
    const cleanText = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    return null;
  }
};
// Function to validate education entries
const validateEducation = (education) => {
  return education.map((edu) => ({
    institution: edu.institution || "Unknown Institution",
    degree: edu.degree || "Unknown Degree",
    startYear: edu.startYear || "Unknown Start Year",
    endYear: edu.endYear || "Unknown End Year", // Ensure endYear is always set
  }));
};

// Function to validate experience entries
const validateExperience = (experience) => {
  return experience.map((exp) => ({
    companyName: exp.companyName || "Unknown Company",
    jobTitle: exp.jobTitle || "Unknown Job Title",
    startDate: exp.startDate || "Unknown Start Date",
    endDate: exp.endDate || "Unknown End Date",
  }));
};

// Function to validate project entries
const validateProjects = (projects) => {
  return projects.map((proj) => ({
    title: proj.title || "Untitled Project",
    description: proj.description || "No description available",
    technologyUsed: proj.technologyUsed || "Unknown Technologies",
    projectLink: proj.projectLink || "",
  }));
};
// Create user profile from resume
export const createUserProfileFromResume = async (req, res) => {
  try {
    const { userId, resumeContent, extraInfo } = req.body;

    if (!userId || !resumeContent) {
      return res
        .status(400)
        .json(new ApiError(400, "User ID and Resume content are required"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const chatSession = model.startChat({ generationConfig, history: [] });
    const prompt = `Extract and structure a comprehensive user profile from the given resume and existing profile data.

    Format:
    {
      "firstName": "", "lastName": "", "email": "", "phoneNumber": "",
      "profileSummary": "", "profileHeadline": "", "careerBreak": false, "fresher": false,
      "keySkills": [], "achievements": [], "softSkills": [], "languages": [],
      "linkedin": "", "leetcode": "", "github": "", "portfolio": "",
      "education": [{ "institution": "", "degree": "", "startYear": "", "endYear": "" }],
      "experience": [{ "companyName": "", "jobTitle": "", "startDate": "", "endDate": "" }],
      "projects": [{ "title": "", "description": "", "technologyUsed": "", "projectLink": "" }],
      "gitHubData": { "repositories": 0, "stars": 0, "followers": 0, "following": 0, "languageDistribution": {} },
      "leetCodeData": { "ratingHistory": [], "problemStats": {}, "languageUsage": {}, "skillStats": {}, "submissionStats": { "activeDays": 0, "maxStreak": 0 } }
    }

    Existing Profile Data:
    ${JSON.stringify(user)}
    
    Resume Content:
    ${resumeContent}
    
    Additional Info: ${extraInfo}`;

    const result = await chatSession.sendMessage(prompt);
    const resultText = result.response.text();

    // Remove markdown formatting (backticks and language identifiers)
    const cleanedJson = resultText.replace(/```json|```/g, "").trim();

    let formattedProfile;
    try {
      formattedProfile = JSON.parse(cleanedJson);
    } catch (error) {
      return res
        .status(500)
        .json(new ApiError(500, "Invalid JSON format from AI response"));
    }

    if (!formattedProfile) {
      return res
        .status(500)
        .json(new ApiError(500, "Failed to parse extracted profile data"));
    }
    // Merge new data with the existing user profile
    Object.assign(user, {
      firstName: formattedProfile.firstName || user.firstName,
      lastName: formattedProfile.lastName || user.lastName,
      email: formattedProfile.email || user.email,
      phoneNumber: formattedProfile.phoneNumber || user.phoneNumber,
      profileSummary: formattedProfile.profileSummary || user.profileSummary,
      profileHeadline: formattedProfile.profileHeadline || user.profileHeadline,
      careerBreak: formattedProfile.careerBreak ?? user.careerBreak,
      fresher: formattedProfile.fresher ?? user.fresher,
      keySkills: formattedProfile.keySkills || user.keySkills,
      achievements: formattedProfile.achievements || user.achievements,
      softSkills: formattedProfile.softSkills || user.softSkills,
      languages: formattedProfile.languages || user.languages,
      linkedin: formattedProfile.linkedin || user.linkedin,
      leetcode: formattedProfile.leetcode || user.leetcode,
      github: formattedProfile.github || user.github,
      portfolio: formattedProfile.portfolio || user.portfolio,
      education: formattedProfile.education?.length
        ? validateEducation(formattedProfile.education)
        : user.education,
      experience: formattedProfile.experience?.length
        ? validateExperience(formattedProfile.experience)
        : user.experience,
      projects: formattedProfile.projects?.length
        ? validateProjects(formattedProfile.projects)
        : user.projects,
      gitHubData: formattedProfile.gitHubData || user.gitHubData,
      leetCodeData: formattedProfile.leetCodeData || user.leetCodeData,
    });

    await user.save();

    await processUserProfile(user); // Ensure further processing

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { user },
          "User profile extracted and processed successfully"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiError(500, error.message));
  }
};

// Get user feedback
export const getUserFeedback = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const chatSession = model.startChat({ generationConfig, history: [] });

    const prompt = `
      You are an AI career coach analyzing a user's profile, aptitude results, and job applications. Provide **short, precise, and high-value** feedback and tips.  

      **Response Format (JSON):**  
      {
          "feedback": ["Direct insights on strengths & key improvements"],
          "tips": ["Actionable suggestions to improve job prospects"]
      }

      ### **Guidelines:**  
      - Keep feedback **short and impactful** (one sentence per point).  
      - Only provide **useful, job-relevant insights**—no fluff.  
      - If the user is applying to the wrong roles, point it out.  
      - If key skills or achievements are missing from the profile, highlight them.  
      - Make tips **specific and easy to act on** (e.g., "Make your GitHub public and link projects" instead of "Improve GitHub").  

      **User Profile Data:**  
      ${JSON.stringify(user, null, 2)}
    `;

    const result = await chatSession.sendMessage(prompt);
    const feedback = parseAIResponse(result.response.text());

    if (!feedback) {
      return res
        .status(500)
        .json(new ApiError(500, "Failed to parse AI response"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { feedback },
          "User feedback retrieved successfully"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiError(500, error.message));
  }
};

// Get interview questions
export const getInterviewQuestion = async (req, res) => {
  try {
    const { userId, companyName, role, interviewType } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const chatSession = model.startChat({ generationConfig, history: [] });

    const prompt = `You are an interviewer conducting a ${interviewType} interview for a ${role} position at ${companyName}.
      The candidate's profile is:
      ${JSON.stringify(user)}
      
      Return a JSON array of interview questions.
      Example: ["Question 1", "Question 2", "Question 3"]`;

    const result = await chatSession.sendMessage(prompt);
    const interviewQuestions = parseAIResponse(result.response.text());

    if (!interviewQuestions) {
      return res
        .status(500)
        .json(new ApiError(500, "Failed to parse AI response"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { interviewQuestions },
          "Interview questions generated successfully"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiError(500, error.message));
  }
};

// Process user profile for job clustering and embedding
export const processUserProfile = async (user) => {
  try {
    const prompt = `You are an AI specializing in career analysis. Assign job clusters and generate an embedding.
    Job Clusters: ["Mobile Developer", "Frontend Developer", "Backend Developer", "AI/ML Developer"]

    User Profile:
    ${JSON.stringify(user, null, 2)}

    Output JSON:
    {"clusters": [{"cluster": "Mobile Developer", "percentage": 85}], "embedding": [-0.34, 0.89, -0.12]}`;

    const chatSession = model.startChat({ generationConfig, history: [] });
    const result = await chatSession.sendMessage(prompt);

    const resultText = result.response.text();

    // Remove markdown formatting (backticks and language identifiers)
    const cleanedJson = resultText.replace(/```json|```/g, "").trim();

    let userData;
    try {
      userData = JSON.parse(cleanedJson);
    } catch (error) {
      console.error("Invalid JSON format from AI response:", error);
      return;
    }

    if (
      !userData ||
      !Array.isArray(userData.clusters) ||
      !Array.isArray(userData.embedding)
    ) {
      console.error("Invalid response format:", userData);
      return;
    }

    const updatedClusters = [];

    for (const newCluster of userData.clusters) {
      const clusterName = newCluster.cluster;
      const percentage = newCluster.percentage;

      // Check if the cluster already exists in the Cluster collection
      let cluster = await Cluster.findOne({ name: clusterName });

      // If the cluster does not exist, create a new one
      if (!cluster) {
        cluster = new Cluster({ name: clusterName });
        await cluster.save();
      }

      // Add cluster to the user's profile (ensuring no duplicates)
      const existingCluster = user.clusters.find((c) =>
        c.clusterId.equals(cluster._id)
      );

      if (existingCluster) {
        existingCluster.percentage = percentage; // Update existing cluster percentage
      } else {
        updatedClusters.push({ clusterId: cluster._id, percentage });
      }
    }

    // Merge updated clusters with existing ones
    user.clusters = [...user.clusters, ...updatedClusters];

    // Update user embedding
    user.embedding = userData.embedding;

    // Save the updated user profile
    await user.save();
  } catch (error) {
    console.error("Error processing user profile:", error);
  }
};
