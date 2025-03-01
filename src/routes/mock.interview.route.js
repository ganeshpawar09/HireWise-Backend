import { Router } from "express";
import { processVideo, uploadVideo } from "../controllers/mock.interview.js";
import { upload } from "../middlewares/multer.middleware.js";

const mockInterviewRouter = Router();
// Define the route for uploading map and video
mockInterviewRouter.post("/upload-video", upload.single("video"), uploadVideo);
mockInterviewRouter.post("/process-video", processVideo);

export default mockInterviewRouter;
