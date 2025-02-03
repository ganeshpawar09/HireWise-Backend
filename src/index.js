import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
  path: "D:/Final Year Project/Final Year Project Code/hirewise backend/.env",
});

connectDB().then(() => {
  app.listen(process.env.PORT || 8000, () => {
    console.log(`Server is listening on port ${process.env.PORT || 8000}`);
  });
});
