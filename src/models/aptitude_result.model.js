import mongoose from "mongoose";
const Schema = mongoose.Schema;

const SubTopicAnalysisSchema = new Schema({
  subTopic: { type: String, required: true },
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  score: { type: Number, required: true },
});

const TopicAnalysisSchema = new Schema({
  topic: { type: String, required: true },
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  subTopics: {
    type: Map,
    of: SubTopicAnalysisSchema,
    required: true,
  },
  score: { type: Number, required: true },
});

const TestAnalyticsSchema = new Schema({
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  averageTimePerQuestion: { type: Number, required: true },
  totalTimeTaken: { type: Number, required: true },
  topicWiseAnalysis: {
    type: Map,
    of: TopicAnalysisSchema,
    required: true,
  },
  overallScore: { type: Number, required: true },
});

const AptitudeTestResultSchema = new Schema(
  {
    analytics: { type: TestAnalyticsSchema, required: true },
    timePerQuestion: { type: Number, required: true },
    totalTimeTaken: { type: Number, required: true },
    date: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

const AptitudeTestResult = mongoose.model(
  "AptitudeTestResult",
  AptitudeTestResultSchema
);

export default AptitudeTestResult;
