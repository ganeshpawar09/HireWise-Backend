import { Topic } from "../models/topic.model.js";
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

const addQuestionsByTopic = asyncHandler(async (req, res, next) => {
  const topicsData = req.body;

  try {
    if (
      !topicsData ||
      typeof topicsData !== "object" ||
      Object.keys(topicsData).length === 0
    ) {
      throw new ApiError(
        400,
        "Invalid input: Please provide a valid topics data structure."
      );
    }

    // Get or create the topic document
    let topicDoc = (await Topic.findOne()) || new Topic();

    // Process each main topic (dsa, dbms, etc.)
    for (const [mainTopic, subTopicsData] of Object.entries(topicsData)) {
      // Validate main topic exists in schema
      if (!topicDoc.schema.paths[mainTopic]) {
        throw new ApiError(400, `Invalid main topic: ${mainTopic}`);
      }

      // Initialize the Map if it doesn't exist
      if (!topicDoc[mainTopic]) {
        topicDoc[mainTopic] = new Map();
      }

      // Process each subtopic
      for (const [subTopicName, questions] of Object.entries(subTopicsData)) {
        if (!Array.isArray(questions)) {
          throw new ApiError(
            400,
            `Questions for subtopic "${subTopicName}" must be an array`
          );
        }

        const processedQuestions = questions.map((question) => {
          if (
            !question.options ||
            !Array.isArray(question.options) ||
            question.options.length === 0 ||
            typeof question.correctOptionIndex !== "number"
          ) {
            throw new ApiError(
              400,
              `Invalid question structure in subtopic "${subTopicName}"`
            );
          }

          // Shuffle options
          const shuffledOptions = shuffleArray(question.options);
          const newCorrectOptionIndex = shuffledOptions.findIndex(
            (option) => option === question.options[question.correctOptionIndex]
          );

          return {
            topic: question.topic,
            subTopic: question.subTopic,
            level: question.level,
            questionText: question.questionText,
            options: shuffledOptions,
            correctOptionIndex: newCorrectOptionIndex,
            explanation: question.explanation,
          };
        });

        topicDoc[mainTopic].set(subTopicName, processedQuestions);
      }
    }

    await topicDoc.save();

    return res
      .status(201)
      .json(new ApiResponse(201, "done", "Questions added successfully."));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.name === "ValidationError") {
      throw new ApiError(400, error.message);
    }
    console.error("Error in addQuestionsByTopic:", error);
    throw new ApiError(500, "Error processing questions");
  }
});

const getTopicsStructure = asyncHandler(async (req, res) => {
  try {
    // Get the topic document
    const topicDoc = await Topic.findOne();

    if (!topicDoc) {
      return res
        .status(200)
        .json(new ApiResponse(200, { topics: [] }, "No topics found"));
    }

    // Get main topics (filtering out MongoDB specific fields)
    const mainTopics = Object.keys(topicDoc.toObject()).filter(
      (key) => !["_id", "__v", "createdAt", "updatedAt"].includes(key)
    );

    // Initialize result structure
    const topics = mainTopics
      .map((topic) => {
        const subtopics =
          topicDoc[topic] && typeof topicDoc[topic].get === "function"
            ? Array.from(topicDoc[topic].keys())
            : [];

        return {
          topic,
          subtopics,
        };
      })
      .filter((item) => item.subtopics.length > 0);

    return res
      .status(200)
      .json(
        new ApiResponse(200, topics, "Topics structure retrieved successfully")
      );
  } catch (error) {
    console.error("Error in getTopicsStructure:", error);
    throw new ApiError(500, "Error retrieving topics structure");
  }
});

const getQuestionsBySubTopic = asyncHandler(async (req, res) => {
  const { subTopic, numberOfQuestions } = req.body; // Changed from req.query to req.body
  console.log(subTopic);

  try {
    // Validate input
    console.log(subTopic, numberOfQuestions);
    if (!subTopic || !Array.isArray(subTopic) || !numberOfQuestions) {
      throw new ApiError(
        400,
        "Both subTopic array and numberOfQuestions are required"
      );
    }

    // Convert numberOfQuestions to integer
    const numQuestions = parseInt(numberOfQuestions);
    if (isNaN(numQuestions) || numQuestions <= 0) {
      throw new ApiError(400, "numberOfQuestions must be a positive integer");
    }

    // Get the topic document
    const topicDoc = await Topic.findOne();
    if (!topicDoc) {
      throw new ApiError(404, "No topics found in the database");
    }

    // Get all topic keys from the document (excluding MongoDB specific fields)
    const topicKeys = Object.keys(topicDoc.toObject()).filter(
      (key) => !["_id", "__v", "createdAt", "updatedAt"].includes(key)
    );

    let allSelectedQuestions = [];

    // Process each requested subtopic
    for (const currentSubTopic of subTopic) {
      let subtopicQuestions = null;

      // Find questions for current subtopic
      for (const topic of topicKeys) {
        if (topicDoc[topic] && topicDoc[topic].has(currentSubTopic)) {
          const questions = topicDoc[topic].get(currentSubTopic);

          if (Array.isArray(questions) && questions.length > 0) {
            if (questions.length >= numQuestions) {
              // If we have enough questions, randomly select the required number
              const shuffled = [...questions].sort(() => Math.random() - 0.5);
              subtopicQuestions = shuffled.slice(0, numQuestions);
            } else {
              // If we don't have enough questions, take all available questions
              subtopicQuestions = [...questions];
            }
            break; // Take questions from the first topic that has this subtopic
          }
        }
      }

      if (subtopicQuestions) {
        allSelectedQuestions = [...allSelectedQuestions, ...subtopicQuestions];
      }
    }

    if (allSelectedQuestions.length === 0) {
      throw new ApiError(404, `No questions found for the requested subtopics`);
    }

    // Shuffle all selected
    const shuffledQuestions = allSelectedQuestions.sort(
      () => Math.random() - 0.6
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          questions: shuffledQuestions,
        },
        `Retrieved ${shuffledQuestions.length} questions successfully`
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("Error in getQuestionsBySubTopic:", error);
    throw new ApiError(500, "Error retrieving questions");
  }
});

export { addQuestionsByTopic, getTopicsStructure, getQuestionsBySubTopic };
