import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: [true, "Topic is required"],
    trim: true,
  },
  subTopic: {
    type: String,
    required: [true, "Subtopic is required"],
    trim: true,
  },
  level: {
    type: String,
    enum: {
      values: ["Easy", "Medium", "Hard"],
      message: "Level must be either Easy, Medium, or Hard",
    },
    required: true,
  },
  questionText: {
    type: String,
    required: [true, "Question text is required"],
    trim: true,
  },
  options: [
    {
      type: String,
      required: [true, "Options are required"],
      trim: true,
    },
  ],
  correctOptionIndex: {
    type: Number,
    required: true,
  },
  explanation: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const topicSchema = new mongoose.Schema(
  {
    dsa: {
      type: Map,
      of: [questionSchema],
    },
    dbms: {
      type: Map,
      of: [questionSchema],
    },
    oop: {
      type: Map,
      of: [questionSchema],
    },
    cn: {
      type: Map,
      of: [questionSchema],
    },
    os: {
      type: Map,
      of: [questionSchema],
    },
    verbal: {
      type: Map,
      of: [questionSchema],
    },
    quantitative: {
      type: Map,
      of: [questionSchema],
    },
    logical: {
      type: Map,
      of: [questionSchema],
    },
  },
  { timestamps: true }
);

export const Topic = mongoose.model("Topic", topicSchema);
