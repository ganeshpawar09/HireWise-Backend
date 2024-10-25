import mongoose from "mongoose";
const topicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  learningResources: [
    { type: mongoose.Schema.Types.ObjectId, ref: "ArticleSource" },
  ],
  featuredPlaylists: [
    { type: mongoose.Schema.Types.ObjectId, ref: "VideoPlaylist" },
  ],
  recommendedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
  question: { type: mongoose.Schema.Types.ObjectId, ref: "TopicQuestions" },
});

export const Topic = mongoose.model("Topic", topicSchema);

const articleSourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logoUrl: { type: String, required: true },
  websiteUrl: { type: String, required: true },
  description: { type: String },
});

export const ArticleSource = mongoose.model(
  "ArticleSource",
  articleSourceSchema
);

const videoPlaylistSchema = new mongoose.Schema({
  title: { type: String, required: true },
  channelName: { type: String, required: true },
  thumbnailUrl: { type: String },
  videoCount: { type: Number, required: true },
  websiteUrl: { type: String },
});

export const VideoPlaylist = mongoose.model(
  "VideoPlaylist",
  videoPlaylistSchema
);

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  channelName: { type: String, required: true },
  thumbnailUrl: { type: String },
  websiteUrl: { type: String, required: true },
  duration: { type: String },
  views: { type: Number },
  publishedDate: { type: Date },
  description: { type: String },
});

export const Video = mongoose.model("Video", videoSchema);

const topicQuestionsSchema = new mongoose.Schema({
  easyQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  mediumQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  hardQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  extremeHardQuestions: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
  ],
});

export const TopicQuestions = mongoose.model(
  "TopicQuestions",
  topicQuestionsSchema
);

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true },
  explanation: { type: String },
});

export const Question = mongoose.model("Question", questionSchema);
