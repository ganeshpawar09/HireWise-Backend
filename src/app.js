import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

import userRouter from "./routes/user.route.js";
import jobRouter from "./routes/job.route.js";
import topicRouter from "./routes/topic.route.js";
import mockInterviewRouter from "./routes/mock.interview.route.js";
import hackathonRouter from "./routes/hackathon.route.js";

dotenv.config();

const app = express();

// Middleware setup
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Set up API routes
app.use("/api/user", userRouter);
app.use("/api/job", jobRouter);
app.use("/api/topic", topicRouter);
app.use("/api/mockInterview", mockInterviewRouter);
app.use("/api/hackathon", hackathonRouter);

// Create HTTP server and Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT"],
    credentials: true,
  },
});

const activePeers = new Map();
const waitingPeers = new Map();

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Handle peer matching
  socket.on("find_peer", () => {
    console.log("Finding peer for:", socket.id);

    if (waitingPeers.size > 0) {
      // Get first waiting peer that isn't the current socket
      const matchedPeer = Array.from(waitingPeers.entries()).find(
        ([peerId]) => peerId !== socket.id
      );

      if (matchedPeer) {
        const [matchedPeerId, matchedSocket] = matchedPeer;

        // Remove matched peer from waiting list
        waitingPeers.delete(matchedPeerId);

        // Add both peers to active connections
        activePeers.set(socket.id, matchedPeerId);
        activePeers.set(matchedPeerId, socket.id);

        // Notify both peers
        socket.emit("peer_found", { peerId: matchedPeerId });
        matchedSocket.emit("peer_found", { peerId: socket.id });

        console.log(`Matched peers: ${socket.id} <-> ${matchedPeerId}`);
      }
    } else {
      // Add to waiting list if no match found
      waitingPeers.set(socket.id, socket);
      console.log("Added to waiting list:", socket.id);
    }
  });
  
  socket.on("stop_finding_peer", () => {
    if (waitingPeers.has(socket.id)) {
      waitingPeers.delete(socket.id);
      console.log(`Removed ${socket.id} from waiting list`);
    }
  });

  socket.on("offer", (data) => {
    const targetPeerId = activePeers.get(socket.id);
    if (targetPeerId) {
      io.to(targetPeerId).emit("offer", {
        sdp: data.sdp,
        fromSocketId: socket.id,
      });
      console.log(`Offer sent from ${socket.id} to ${targetPeerId}`);
    }
  });

  socket.on("answer", (data) => {
    const targetPeerId = activePeers.get(socket.id);
    if (targetPeerId) {
      io.to(targetPeerId).emit("answer", {
        sdp: data.sdp,
        fromSocketId: socket.id,
      });
      console.log(`Answer sent from ${socket.id} to ${targetPeerId}`);
    }
  });

  socket.on("ice_candidate", (data) => {
    const targetPeerId = activePeers.get(socket.id);
    if (targetPeerId) {
      io.to(targetPeerId).emit("ice_candidate", {
        candidate: data.candidate,
        fromSocketId: socket.id,
      });
      console.log(`ICE candidate sent from ${socket.id} to ${targetPeerId}`);
    }
  });

  socket.on("disconnect", () => {
    // Clean up peer connections
    const connectedPeerId = activePeers.get(socket.id);
    if (connectedPeerId) {
      io.to(connectedPeerId).emit("peer_disconnected");
      activePeers.delete(connectedPeerId);
      activePeers.delete(socket.id);
    }

    // Remove from waiting list if present
    waitingPeers.delete(socket.id);
    console.log("Client disconnected:", socket.id);
  });
});

export { server };
