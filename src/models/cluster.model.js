import mongoose from "mongoose";

const clusterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },

  // Jobs in this cluster with their relevance percentage
  jobs: [
    {
      jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
      percentage: { type: Number },
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

export const Cluster = mongoose.model("Cluster", clusterSchema);
