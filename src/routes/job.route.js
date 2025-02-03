import { Router } from "express";
import {
  uploadJobs,
  applyJobs,
  searchJobs,
  recommendedJobs,
  getAppliedJobs,
} from "../controllers/job.controller.js";

const jobRouter = Router();

jobRouter.post("/upload", uploadJobs);
jobRouter.post("/apply", applyJobs);
jobRouter.post("/applied", getAppliedJobs);
jobRouter.post("/search", searchJobs);
jobRouter.post("/recommended", recommendedJobs);

export default jobRouter;
