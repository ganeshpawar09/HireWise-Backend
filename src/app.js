import express from "express";
import cors from "cors";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

import userRouter from "./routes/user.route.js";
import jobRouter from "./routes/job.route.js";
import hackathonRouter from "./routes/hackathon.route.js";
import courseRouter from "./routes/course.route.js";

app.use("/api/user", userRouter);
app.use("/api/job", jobRouter);
app.use("/api/hackathon", hackathonRouter);
app.use("/api/course", courseRouter);

export { app };
