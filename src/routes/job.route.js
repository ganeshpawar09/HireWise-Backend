import { Router } from "express";
import {
  uploadJobs,
  applyJobs,
  searchJobs,
  recommendedJobs,
  youMightLikeJobs,
  getAppliedJobs,
} from "../controllers/job.controller.js";

const jobRouter = Router();

jobRouter.post("/upload", uploadJobs);
jobRouter.post("/apply", applyJobs);
jobRouter.post("/applied", getAppliedJobs);
jobRouter.post("/search", searchJobs);
jobRouter.post("/recommended", recommendedJobs);
jobRouter.post("/you-might-like", youMightLikeJobs);

export default jobRouter;
