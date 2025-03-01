import mongoose from "mongoose";
const Schema = mongoose.Schema;

const mockInterviewResult = new Schema({
  question: { type: String, required: true },
  video_confidence: { type: Number, required: true },
  audio_confidence: { type: Number, required: true },
  fluency_percentage: { type: Number, required: true },
  transcription: {
    transcription: { type: String, required: true },
    filler_words: { type: Map, of: Number },
    total_fillers: { type: Number, required: true },
  },
  grammar: {
    grammar_mistakes: { type: [String], default: [] },
    enhanced_response: { type: String },
    feedback: { type: [String], default: [] },
  },
});

export const MockInterviewResult = mongoose.model(
  "MockInterviewResult",
  mockInterviewResult
);
