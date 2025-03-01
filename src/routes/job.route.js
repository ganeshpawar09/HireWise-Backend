import { Router } from "express";
import {
  uploadJobs,
  applyJob,
  searchJobs,
  getPersonalizedJobs,
  getAppliedJobs,
} from "../controllers/job.controller.js";

const jobRouter = Router();

jobRouter.post("/upload", uploadJobs);
jobRouter.post("/apply", applyJob);
jobRouter.post("/applied", getAppliedJobs);
jobRouter.post("/search", searchJobs);
jobRouter.post("/recommended", getPersonalizedJobs);

export default jobRouter;
