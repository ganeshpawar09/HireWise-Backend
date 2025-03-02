import mongoose from "mongoose";
const Schema = mongoose.Schema;

const AptitudeTestResultSchema = new Schema(
  {
    selectedOptions: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question", // ✅ Now can be populated
          required: true,
        },
        option: { type: Number, default: -1 },
      },
    ],
    totalTimeTaken: { type: Number, required: true },
    testDate: { type: Date, required: true },
    overallScore: { type: Number, required: true },
  },
  { timestamps: true }
);

const AptitudeTestResult = mongoose.model(
  "AptitudeTestResult",
  AptitudeTestResultSchema
);

export default AptitudeTestResult;
