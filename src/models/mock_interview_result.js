import mongoose from "mongoose";
const Schema = mongoose.Schema;

const mistakeSchema = new Schema({
  incorrect: { type: String, required: true },
  correct: { type: String, required: true },
  type: { type: String, required: true },
});

const mockInterviewResultSchema = new Schema({
  question: { type: String, required: true },
  video_confidence: { type: [Number], required: true },
  audio_confidence: { type: [Number], required: true },
  fluency_percentage: { type: [Number], required: true },
  transcription: { type: String, required: true },
  grammar: {
    grammar_accuracy: { type: String, required: true },
    enhanced_response: { type: String, required: true },
  },
});

export const MockInterviewResult = mongoose.model(
  "MockInterviewResult",
  mockInterviewResultSchema
);
