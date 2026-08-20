import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { queue } from "@/lib/local/queue";

export const runtime = "nodejs";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("resume") as File | null;
    const userId = formData.get("userId") as string | null;
    console.log("fieos",file)

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const uploadUrl = await convex.mutation(
      api.files.generateUploadUrl,
      {}
    );

    const uploadForm = new FormData();

    uploadForm.append("file", file);

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: uploadForm,
    });

    const uploadText = await uploadResponse.text();

    if (!uploadResponse.ok) {
      throw new Error(
        `Convex upload failed: ${uploadResponse.status} ${uploadText}`
      );
    }

    const { storageId } = JSON.parse(uploadText);

    const resumeId = await convex.mutation(
      api.files.createResume,
      {
        userId,
        storageId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      }
    );

    const job = await queue.add("resume-upload", {
      resumeId,
      userId,
      storageId,
      filename: file.name,
    });

    return NextResponse.json({
      success: true,
      resumeId,
      storageId,
      jobId: job.id,
      filename: file.name,
    });
  } catch (error) {
    console.error("Resume upload failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Upload failed",
      },
      { status: 500 }
    );
  }
}