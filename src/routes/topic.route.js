import { Router } from "express";
import {
  addQuestionsByTopic,
  getQuestionsBySubTopic,
  getTopicsStructure,
} from "../controllers/topic.controller.js";

const topicRouter = Router();

topicRouter.post("/upload", addQuestionsByTopic);
topicRouter.get("/get", getTopicsStructure);
topicRouter.post("/get-question", getQuestionsBySubTopic);

export default topicRouter;
