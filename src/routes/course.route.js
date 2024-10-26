import express from "express";
import {
  uploadCourse,
  updateCourse,
  getAllCourses,
} from "../controllers/course.controller.js";

const courseRouter = express.Router();

courseRouter.post("/upload-courses", uploadCourse); // Upload a new course
courseRouter.put("/update-courses", updateCourse); // Update a course
courseRouter.get("/get-all-courses", getAllCourses); // Get all courses

export default courseRouter;
