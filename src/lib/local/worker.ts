import { Worker } from "bullmq";

import { loadResume } from "../local/pdf.loader";
import { indexResume } from "../local/pdf.indexer";

const worker = new Worker(
  "resume-upload",
  async (job) => {
    const { filePath, filename } = job.data;

    console.log(`Processing resume: ${filename}`);

    const { docs, chunks } = await loadResume(filePath);

    const result = await indexResume(
      chunks,
      filename,
      String(job.id)
    );

    return {
      success: true,
      filename,
      pages: docs.length,
      chunks: chunks.length,
      vectors: result.vectors,
    };
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT || 6379),
    },
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

export default worker;