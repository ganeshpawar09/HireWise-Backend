import { server } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";
dotenv.config({
  path: "C:/Users/gapaw/Desktop/hirewise backend/.env",
});

const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
