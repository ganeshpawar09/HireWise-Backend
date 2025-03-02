import mongoose from "mongoose";
import AptitudeTestResult from "../models/aptitude_result.model.js";
import { Question, Topic } from "../models/topic.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const addQuestions = asyncHandler(async (req, res) => {
  const questions = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res
      .status(400)
      .json(new ApiError(400, "Questions must be a non-empty array"));
  }

  const errors = [];

  // Validate each question
  questions.forEach((question, index) => {
    const {
      topic,
      subTopic,
      level,
      questionText,
      options,
      correctOptionIndex,
    } = question;
    const missingFields = [];

    if (!topic) missingFields.push("topic");
    if (!subTopic) missingFields.push("subTopic");
    if (!level) missingFields.push("level");
    if (!questionText) missingFields.push("questionText");
    if (!Array.isArray(options) || options.length < 2)
      missingFields.push("options");
    if (
      correctOptionIndex === undefined ||
      !Number.isInteger(correctOptionIndex) ||
      correctOptionIndex < 0 ||
      correctOptionIndex >= options.length
    ) {
      missingFields.push("correctOptionIndex");
    }

    if (missingFields.length > 0) {
      errors.push({ index, missingFields });
    }
  });

  if (errors.length > 0) {
    return res
      .status(400)
      .json(new ApiError(400, "Some questions have missing fields", errors));
  }

  try {
    // Insert all valid questions into the database
    const createdQuestions = await Question.insertMany(questions);

    // Find or create the topic document
    let topicDoc = await Topic.findOne();
    if (!topicDoc) {
      topicDoc = new Topic({ topics: new Map() });
    }

    // Group questions by topic and subtopic
    createdQuestions.forEach((newQuestion) => {
      const { topic, subTopic, _id } = newQuestion;

      if (!topicDoc.topics.has(topic)) {
        topicDoc.topics.set(topic, new Map());
      }

      if (!topicDoc.topics.get(topic).has(subTopic)) {
        topicDoc.topics.get(topic).set(subTopic, []);
      }

      topicDoc.topics.get(topic).get(subTopic).push(_id);
    });

    await topicDoc.save();

    return res
      .status(201)
      .json(
        new ApiResponse(201, createdQuestions, "Questions added successfully")
      );
  } catch (error) {
    console.error("Error adding questions:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Error adding questions", error.message));
  }
});

const getTopicsStructure = asyncHandler(async (req, res) => {
  try {
    // Get the topic document
    const topicDoc = await Topic.findOne();

    if (!topicDoc || !topicDoc.topics) {
      return res
        .status(200)
        .json(new ApiResponse(200, { topics: [] }, "No topics found"));
    }

    // Convert the Map to a plain object
    const topicObject =
      topicDoc.topics instanceof Map
        ? Object.fromEntries(topicDoc.topics)
        : topicDoc.topics;

    // Extract topics and subtopics
    const topics = Object.entries(topicObject).map(([topic, subTopicsMap]) => ({
      topic,
      subtopics:
        subTopicsMap instanceof Map ? Array.from(subTopicsMap.keys()) : [],
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(200, topics, "Topics structure retrieved successfully")
      );
  } catch (error) {
    console.error("Error in getTopicsStructure:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Error retrieving topics structure"));
  }
});

const getQuestionsBySubTopic = asyncHandler(async (req, res) => {
  const { subTopic, numberOfQuestions } = req.body;

  try {
    if (!subTopic || !Array.isArray(subTopic) || !numberOfQuestions) {
      return res
        .status(400)
        .json(
          new ApiError(400, "subTopic array and numberOfQuestions are required")
        );
    }

    const numQuestions = parseInt(numberOfQuestions);
    if (isNaN(numQuestions) || numQuestions <= 0) {
      return res
        .status(400)
        .json(
          new ApiError(400, "numberOfQuestions must be a positive integer")
        );
    }

    const topicDoc = await Topic.findOne();
    if (!topicDoc) {
      return res
        .status(404)
        .json(new ApiError(404, "No topics found in the database"));
    }

    let questionIds = new Set();

    for (const currentSubTopic of subTopic) {
      for (const [topic, subTopicsMap] of topicDoc.topics.entries()) {
        if (subTopicsMap.has(currentSubTopic)) {
          subTopicsMap
            .get(currentSubTopic)
            .forEach((id) => questionIds.add(id));
        }
      }
    }

    const validQuestionIds = [...questionIds].filter((id) =>
      /^[0-9a-fA-F]{24}$/.test(id)
    );
    if (validQuestionIds.length === 0) {
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            "No valid questions found for the requested subtopics"
          )
        );
    }

    const questions = await Question.find({ _id: { $in: validQuestionIds } })
      .limit(numQuestions)
      .lean();

    if (questions.length === 0) {
      return res
        .status(404)
        .json(
          new ApiError(404, "No questions found for the requested subtopics")
        );
    }

    const shuffledQuestions = questions.sort(() => Math.random() - 0.5);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { questions: shuffledQuestions },
          `Retrieved ${shuffledQuestions.length} questions`
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(500, "Unexpected server error while retrieving questions")
      );
  }
});

const uploadAptitudeResult = asyncHandler(async (req, res) => {
  try {
    const { userId, overallScore, totalTimeTaken, testDate, selectedOptions } =
      req.body;

    // Validate required fields
    const missingFields = [];
    if (!userId) missingFields.push("userId");
    if (overallScore === undefined) missingFields.push("overallScore");
    if (!totalTimeTaken) missingFields.push("totalTimeTaken");
    if (!testDate) missingFields.push("testDate");
    if (!Array.isArray(selectedOptions) || selectedOptions.length === 0)
      missingFields.push("selectedOptions");

    if (missingFields.length > 0) {
      return res
        .status(400)
        .json(new ApiError(400, `Missing fields: ${missingFields.join(", ")}`));
    }

    // Validate testDate
    const parsedTestDate = new Date(testDate);
    if (isNaN(parsedTestDate.getTime())) {
      return res.status(400).json(new ApiError(400, "Invalid testDate format"));
    }

    // Convert selectedOptions into proper format
    const formattedSelectedOptions = selectedOptions.map(
      ({ question, option }) => ({
        question: new mongoose.Types.ObjectId(question), // Store as ObjectId
        option,
      })
    );

    // Create a new aptitude test result
    const newTestResult = await AptitudeTestResult.create({
      selectedOptions: formattedSelectedOptions,
      totalTimeTaken,
      testDate: parsedTestDate,
      overallScore,
    });

    // Push the newly created test result to the user's aptitudeTestResult array
    await User.findByIdAndUpdate(
      userId,
      { $push: { aptitudeTestResult: newTestResult._id } },
      { new: true }
    );

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          newTestResult,
          "Aptitude test result created and linked to user"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Server error while saving test result"));
  }
});

const getAllQuestions = asyncHandler(async (req, res) => {
  try {
    const topicDoc = await Topic.findOne();

    if (!topicDoc) {
      return res.status(404).json(new ApiError(404, "No questions found"));
    }

    let allQuestions = [];

    // Extract all topics
    const mainTopics = Object.keys(topicDoc.toObject()).filter(
      (key) => !["_id", "__v", "createdAt", "updatedAt"].includes(key)
    );

    for (const mainTopic of mainTopics) {
      if (
        topicDoc[mainTopic] &&
        typeof topicDoc[mainTopic].get === "function"
      ) {
        for (const [subTopic, questions] of topicDoc[mainTopic]) {
          const formattedQuestions = questions.map((q) => ({
            topic: mainTopic,
            subTopic: subTopic,
            questionText: q.questionText,
            level: q.level,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation,
          }));

          allQuestions = [...allQuestions, ...formattedQuestions];
        }
      }
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          allQuestions,
          "All questions retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error fetching all questions:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Error retrieving questions"));
  }
});

export {
  addQuestions,
  getTopicsStructure,
  getQuestionsBySubTopic,
  uploadAptitudeResult,
  getAllQuestions,
};
