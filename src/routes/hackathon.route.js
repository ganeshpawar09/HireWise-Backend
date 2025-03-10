import { Router } from "express";
import {
  uploadHackathon,
  getHackathons,
  searchHackathons,
} from "../controllers/hackathon.controller.js";

const hackathonRouter = Router();

hackathonRouter.post("/upload", uploadHackathon);
hackathonRouter.get("/get-all", getHackathons);
hackathonRouter.post("/search", searchHackathons);

export default hackathonRouter;
