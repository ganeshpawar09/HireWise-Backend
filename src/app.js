import express from "express";
import cors from "cors";
import http from "http";
import dotenv from "dotenv";

import userRouter from "./routes/user.route.js";
import jobRouter from "./routes/job.route.js";
import topicRouter from "./routes/topic.route.js";

dotenv.config();

const app = express();

// Middleware setup
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Set up API routes
app.use("/api/user", userRouter);
app.use("/api/job", jobRouter);
app.use("/api/topic", topicRouter);

export { app };
