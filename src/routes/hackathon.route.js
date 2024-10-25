import { Router } from "express";
import {
  getHackathonTeams,
  getTeamDetails,
  uploadHackathon,
  createTeam,
  requestToJoinTeam,
  addMemberToTeam,
  sendTeamInvitation,
  removeMember,
  rejectTeamInvitation,
  addMemberToTeam,
  acceptTeamInvitation,
} from "../controllers/hackathon.controller.js";

const hackathonRouter = Router();

hackathonRouter.route("/upload-hackathon").post(uploadHackathon);
hackathonRouter.route("/create-team").post(createTeam);
hackathonRouter.route("/get-team-details").get(getTeamDetails);
hackathonRouter.route("/get-hackathons-teams").get(getHackathonTeams);
hackathonRouter.route("/send-request-to-join-team").post(requestToJoinTeam);
hackathonRouter.route("/add-memeber-to-team").post(addMemberToTeam);
hackathonRouter.route("/send-team-invitation").post(sendTeamInvitation);
hackathonRouter.route("/remove-memeber").post(removeMember);
hackathonRouter.route("/reject-team-invitaion").post(rejectTeamInvitation);
hackathonRouter.route("/accept-team-invitaion").post(acceptTeamInvitation);

export default hackathonRouter;
