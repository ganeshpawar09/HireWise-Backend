import { Router } from "express";
import {
  addQuestions,
  getAllQuestions,
  getQuestionsBySubTopic,
  getTopicsStructure,
  uploadAptitudeResult,
} from "../controllers/topic.controller.js";

const topicRouter = Router();

topicRouter.post("/upload", addQuestions);
topicRouter.get("/get", getTopicsStructure);
topicRouter.post("/get-question", getQuestionsBySubTopic);
topicRouter.post("/upload-result", uploadAptitudeResult);
topicRouter.get("/get-all", getAllQuestions);

export default topicRouter;
