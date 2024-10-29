import { Router } from "express";
import {
  uploadHackathon,
  createTeam,
  getRegisteredHackathons,
  getSearchHackathons,
  getTeamsForHackathon,
  getYouMightLike,
  getSuggestedTeammates,
} from "../controllers/hackathon.controller.js";

const hackathonRouter = Router();

hackathonRouter.route("/upload-hackathon").post(uploadHackathon);
hackathonRouter.route("/create-team").post(createTeam);
hackathonRouter.route("/search").post(getSearchHackathons);
hackathonRouter.route("/registered").post(getRegisteredHackathons);
hackathonRouter.route("/teams").post(getTeamsForHackathon);
hackathonRouter.route("/youmightlike").post(getYouMightLike);
hackathonRouter.route("/suggested-teammates").post(getSuggestedTeammates);

export default hackathonRouter;
