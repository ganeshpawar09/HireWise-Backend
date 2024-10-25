import mongoose from "mongoose";

// Define Course schema
const CourseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  courseName: { type: String, required: true },
  creator: { type: String, required: true },
  createdAt: { type: Date, required: true },
  topics: { type: Map, of: [String] }, // Map structure for topics

  // Ratings on course suitability levels
  beginnerFriendly: { type: Number, default: 0 },
  intermediateFriendly: { type: Number, default: 0 },
  expertFriendly: { type: Number, default: 0 },

  // Ratings on course depth and orientation
  inDepthRating: { type: Number, default: 0 },
  fromScratch: { type: Number, default: 0 },
  notFromScratch: { type: Number, default: 0 },
  conceptOriented: { type: Number, default: 0 },
  projectOriented: { type: Number, default: 0 },

  prerequisiteSkills: [{ type: String, required: true }],
  roleFocused: [{ type: String, required: true }],
  thumbnailUrl: { type: String, required: true },
  likes: { type: Number, default: 0 },
  comments: [{ type: String }],
  courseUrl: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: String, required: true },
  price: { type: Number, required: true },
  learningOutcomes: [{ type: String, required: true }],
  platform: { type: String, required: true },
});

// Export the Course model
export const Course = mongoose.model("Course", courseName);
