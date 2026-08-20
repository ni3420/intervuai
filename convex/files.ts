import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createResume = mutation({
  args: {
    userId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
  },

  handler: async (ctx, args) => {
    const resumeId = await ctx.db.insert("resumes", {
      userId: args.userId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      status: "processing",
      createdAt: Date.now(),
    });

    return resumeId;
  },
});

export const getUserResumes = query({
  args: {
    userId: v.string(),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("resumes")
      .withIndex("by_userId", (q) =>
        q.eq("userId", args.userId)
      )
      .order("desc")
      .collect();
  },
});

export const getResume = query({
  args: {
    resumeId: v.id("resumes"),
  },

  handler: async (ctx, args) => {
    return await ctx.db.get(args.resumeId);
  },
});

export const getResumeDownloadUrl = query({
  args: {
    storageId: v.id("_storage"),
  },

  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const updateExtractedText = mutation({
  args: {
    resumeId: v.id("resumes"),
    extractedText: v.string(),
  },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.resumeId, {
      extractedText: args.extractedText,
      status: "analyzed",
    });

    return true;
  },
});

export const markResumeFailed = mutation({
  args: {
    resumeId: v.id("resumes"),
    error: v.string(),
  },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.resumeId, {
      status: "failed",
    });

    return true;
  },
});