import { Worker } from "bullmq";
import { ConvexHttpClient } from "convex/browser";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

import { api } from "../../../convex/_generated/api";
import { loadResume } from "../local/pdf.loader";
import { indexResume } from "../local/pdf.indexer";
import {
  askLlama,
  type ChatMessage,
} from "../local/llama";

import { Server } from "socket.io";
import { createServer } from "http";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is missing");
}

const convex = new ConvexHttpClient(convexUrl);

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("interview_transcript", (data) => {
    console.log("======================================");
    console.log("CANDIDATE TRANSCRIPT");
    console.log("Call ID:", data.callId);
    console.log("User ID:", data.userId);
    console.log("Text:", data.transcript);
    console.log("======================================");
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

httpServer.listen(3001, () => {
  console.log("Socket server running on port 3001");
});

const worker = new Worker(
  "resume-upload",
  async (job) => {
    const { resumeId, storageId, filename } = job.data;

    console.log(`Processing resume: ${filename}`);

    const downloadUrl = await convex.query(
      api.files.getResumeDownloadUrl,
      {
        storageId,
      }
    );

    if (!downloadUrl) {
      throw new Error("Resume file not found in Convex Storage");
    }

    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to download resume: ${response.status}`
      );
    }

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    const tempPath = path.join(
      os.tmpdir(),
      `resume-${resumeId}.pdf`
    );

    await writeFile(tempPath, buffer);

    try {
      const { docs, chunks } =
        await loadResume(tempPath);

      const result = await indexResume(
        chunks,
        filename,
        String(resumeId)
      );

      const resumeText = chunks
        .map((chunk) => chunk.pageContent)
        .join("\n\n");

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `
You are a professional human interviewer.

Ask only one question at a time.
Start with a short introduction.
Ask questions based on the candidate's resume.
Output only what the interviewer would say.
`,
        },
        {
          role: "user",
          content: `
Candidate resume:

${resumeText}

Start the interview now.
`,
        },
      ];

      const firstQuestion =
        await askLlama(messages);

      console.log("======================================");
      console.log("FIRST INTERVIEW QUESTION");
      console.log(firstQuestion);
      console.log("======================================");

      return {
        success: true,
        resumeId,
        filename,
        firstQuestion,
        pages: docs.length,
        chunks: chunks.length,
        vectors: result.vectors,
      };
    } finally {
      await unlink(tempPath).catch(() => {});
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: Number(
        process.env.REDIS_PORT || 6379
      ),
    },
    concurrency: 1,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(
    `Job ${job?.id} failed:`,
    error
  );
});

const handleShutdown = async (
  signal: string
) => {
  console.log(
    `Received ${signal}. Shutting down...`
  );

  await worker.close().catch(() => {});

  httpServer.close();

  process.exit(0);
};

process.on("SIGINT", () =>
  handleShutdown("SIGINT")
);

process.on("SIGTERM", () =>
  handleShutdown("SIGTERM")
);

export default worker;
