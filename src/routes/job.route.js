import { Router } from "express";
import {
  uploadJobs,
  applyJob,
  searchJobs,
  getJobsForUser,
  getJob,
} from "../controllers/job.controller.js";

const jobRouter = Router();

jobRouter.route("/upload-job").post(uploadJobs);
jobRouter.route("/apply-job").post(applyJob);
jobRouter.route("/search-job").get(searchJobs);
jobRouter.route("/get-job-for-user").get(getJobsForUser);
jobRouter.route("/get-job").get(getJob);

export default jobRouter;
