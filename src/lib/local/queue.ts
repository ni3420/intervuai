import { Queue } from "bullmq";

export const queue = new Queue("resume-upload");
