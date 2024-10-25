import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Course } from "../models/course.model.js";

// Upload new courses
const uploadCourse = asyncHandler(async (req, res) => {
  const courseData = req.body; // Assume the request body contains course details

  // Create a new course in the database
  const newCourse = new Course(courseData);
  await newCourse.save();

  return res
    .status(201)
    .json(new ApiResponse(201, newCourse, "Course uploaded successfully"));
});

// Update an existing course
const updateCourse = asyncHandler(async (req, res) => {
  const { courseId, updatedData } = req.body;

  const updatedCourse = await Course.findByIdAndUpdate(courseId, updatedData, {
    new: true,
    runValidators: true,
  });

  if (!updatedCourse) {
    return new ApiError(404, "Course not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCourse, "Course updated successfully"));
});

// Fetch a list of all courses
const getAllCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find().sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, courses, "Courses retrieved successfully"));
});

export { uploadCourse, updateCourse, getAllCourses };
