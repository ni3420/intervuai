import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  resumes: defineTable({
    userId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    extractedText: v.optional(v.string()),

    feedback: v.optional(
      v.object({
        score: v.number(),
        summary: v.string(),
        skills: v.array(v.string()),
        strengths: v.array(v.string()),
        improvements: v.array(v.string()),
      })
    ),

    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("analyzed"),
      v.literal("failed")
    ),

    error: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),
});