import { StreamClient } from "@stream-io/node-sdk";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey) {
  throw new Error("STREAM_API_KEY is missing");
}

if (!apiSecret) {
  throw new Error("STREAM_API_SECRET is missing");
}

export const stream = new StreamClient(
  apiKey,
  apiSecret
);

export const STREAM_API_KEY = apiKey;

export const AI_USER_ID = "ai-interviewer";