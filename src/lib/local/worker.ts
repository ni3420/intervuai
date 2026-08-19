import { Worker } from "bullmq";
import { ConvexHttpClient } from "convex/browser";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

import { StreamClient } from "@stream-io/node-sdk";

import { api } from "../../../convex/_generated/api";
import { loadResume } from "../local/pdf.loader";
import { indexResume } from "../local/pdf.indexer";
import {
  askLlama,
  type ChatMessage,
} from "../local/llama";
import { speak } from "./tts";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const streamApiKey = process.env.STREAM_API_KEY;
const streamApiSecret = process.env.STREAM_API_SECRET;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is missing");
}

if (!streamApiKey) {
  throw new Error("STREAM_API_KEY is missing");
}

if (!streamApiSecret) {
  throw new Error("STREAM_API_SECRET is missing");
}

const convex = new ConvexHttpClient(convexUrl);
const stream = new StreamClient(streamApiKey, streamApiSecret);

const CALL_TYPE = "default";
const AI_USER_ID = "ai-interviewer";

async function createInterviewCall({
  resumeId,
  filename,
  firstQuestion,
}: {
  resumeId: string;
  filename: string;
  firstQuestion: string;
}) {
  const candidateId = `candidate-${resumeId}`;
  const callId = `resume-interview-${resumeId}`;

  console.log(`Creating Stream call: ${callId}`);

  await stream.upsertUsers([
    {
      id: AI_USER_ID,
      name: "AI Interviewer",
      role: "admin",
    },
    {
      id: candidateId,
      name: "Candidate",
      role: "user",
    },
  ]);

  const call = stream.video.call(CALL_TYPE, callId);

  await call.getOrCreate({
    data: {
      created_by_id: AI_USER_ID,
      members: [
        {
          user_id: AI_USER_ID,
          role: "admin",
        },
        {
          user_id: candidateId,
          role: "call_member",
        },
      ],
      custom: {
        resumeId: String(resumeId),
        filename,
        interviewStatus: "waiting",
        firstQuestion,
        aiUserId: AI_USER_ID,
        candidateId,
      },
    },
  });

  console.log(`Stream call created: ${callId}`);

  return {
    callId,
    callType: CALL_TYPE,
    candidateId,
    aiUserId: AI_USER_ID,
  };
}

const worker = new Worker(
  "resume-upload",
  async (job) => {
    const { resumeId, storageId, filename } = job.data;

    console.log("======================================");
    console.log(`Processing resume: ${filename}`);
    console.log(`Resume ID: ${resumeId}`);
    console.log("======================================");

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
      throw new Error(`Failed to download resume: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const tempPath = path.join(os.tmpdir(), `resume-${resumeId}.pdf`);

    await writeFile(tempPath, buffer);
    console.log(`Resume downloaded: ${tempPath}`);

    try {
      const { docs, chunks } = await loadResume(tempPath);
      console.log(`Resume loaded: ${docs.length} pages, ${chunks.length} chunks`);

      const result = await indexResume(
        chunks,
        filename,
        String(resumeId)
      );

      console.log(`Resume indexed: ${result.vectors} vectors`);

      const resumeText = chunks
        .map((chunk) => chunk.pageContent)
        .join("\n\n");

      console.log("stage 1");

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `
You are a professional human interviewer conducting a real job interview.

Analyze the candidate's resume carefully.

Your job is to interview the candidate, not answer questions for them.

Rules:
- Ask only ONE question at a time.
- Start with a short natural introduction.
- Ask the first question based on the candidate's resume.
- Do not provide the candidate's answer.
- Do not give explanations.
- Do not invent experience, skills, projects or education.
- Ask about actual projects, skills, education and experience from the resume.
- Keep questions concise and natural.
- Make the interview feel like a real human conversation.
- If the candidate later gives a vague answer, ask a clarification question.
- If the candidate gives a strong answer, ask a deeper follow-up question.
- Gradually increase difficulty.
- Output ONLY what the interviewer would say.
`,
        },
        {
          role: "user",
          content: `
Candidate resume:

--- RESUME START ---

${resumeText}

--- RESUME END ---

Start the interview now.

Introduce yourself briefly and ask the first interview question.
`,
        },
      ];
      console.log("stage 2");

      const firstQuestion = await askLlama(messages);
      console.log(`First question for ${filename}:`);
      console.log(firstQuestion);

      const interview = await createInterviewCall({
        resumeId: String(resumeId),
        filename,
        firstQuestion,
      });

      let audioGenerated = false;
      try {
        await speak({
          streamClient: stream,
          callType: interview.callType,
          callId: interview.callId,
          text: firstQuestion,
          speakerId: AI_USER_ID,
        });
        audioGenerated = true;
        console.log("First question broadcasted to Stream room");
      } catch (speakError) {
        console.error("Failed to broadcast speech:", speakError);
        process.exit(1)
      }
      console.log("stage 3");

      const interviewData = {
        resumeId: String(resumeId),
        filename,
        callId: interview.callId,
        callType: interview.callType,
        candidateId: interview.candidateId,
        aiUserId: interview.aiUserId,
        firstQuestion,
        interviewStatus: "waiting",
        pages: docs.length,
        chunks: chunks.length,
        vectors: result.vectors,
        hasFirstQuestionAudio: audioGenerated,
      };

      console.log("======================================");
      console.log("INTERVIEW READY");
      console.log(JSON.stringify(interviewData, null, 2));
      console.log("======================================");

      return {
        success: true,
        resumeId,
        filename,
        pages: docs.length,
        chunks: chunks.length,
        vectors: result.vectors,
        firstQuestion,
        stream: {
          apiKey: streamApiKey,
          callId: interview.callId,
          callType: interview.callType,
          candidateId: interview.candidateId,
          aiUserId: interview.aiUserId,
        },
        interview: {
          status: "waiting",
        },
      };
    } finally {
      await unlink(tempPath).catch(() => {});
      console.log(`Temporary file removed: ${tempPath}`);
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT || 6379),
    },
    concurrency: 1,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", async (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
  await worker.close().catch(() => {});
  process.exit(1);
});

worker.on("error", async (error) => {
  console.error("Worker error:", error);
  await worker.close().catch(() => {});
  process.exit(1);
});

worker.on("closed", () => {
  console.warn("Worker has stopped/closed. Exiting process...");
  process.exit(1);
});

// Handle termination signals to cleanly shut down worker
const handleShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down worker...`);
  await worker.close().catch(() => {});
  process.exit(0);
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

export default worker;