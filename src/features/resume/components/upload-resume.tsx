"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

import { useResumeUpload } from "../hooks/upload-resume.hook";

export const ResumeUpload = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { user, isLoaded } = useUser();

  const {
    data,
    mutate,
    isPending,
    isError,
    error,
    reset,
  } = useResumeUpload();

  const navigateToMeeting = (callId?: string) => {
    const targetMeetingId =
      callId ||
      data?.stream?.callId ||
      process.env.NEXT_PUBLIC_DEMO_ID ||
      "demo-meeting-room";

    const userName =
      user?.fullName ||
      user?.firstName ||
      user?.username ||
      "anonymous";

    router.push(
      `/meeting/${targetMeetingId}?name=${encodeURIComponent(userName)}`
    );
  };

  useEffect(() => {
    if (data?.resumeId && data?.stream?.callId) {
      navigateToMeeting(data.stream.callId);
    }
  }, [data]);

  /**
   * Only select/validate the file here.
   * DO NOT call mutate here.
   */
  const processFile = (file?: File) => {
    if (!file) return;

    if (!isLoaded) return;

    if (!user) {
      alert("Please login before uploading your resume.");
      return;
    }

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const validExtension = file.name.match(/\.(pdf|doc|docx)$/i);

    if (!validTypes.includes(file.type) && !validExtension) {
      alert("Please upload a PDF or Word document (.pdf, .doc, .docx)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Maximum file size is 10 MB.");
      return;
    }

    // Just store the file.
    setSelectedFile(file);

    // Clear previous mutation state if user selects another file.
    reset();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const clearFile = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    reset();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";

    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${parseFloat(
      (bytes / Math.pow(1024, i)).toFixed(1)
    )} ${sizes[i]}`;
  };

  /**
   * THIS is now where the mutation happens.
   *
   * User selects file
   *        ↓
   * selectedFile is stored
   *        ↓
   * User clicks Start Interview
   *        ↓
   * mutate({ file, userId })
   *        ↓
   * processing starts
   */
  const startInterview = () => {
    if (!selectedFile) {
      console.error("No resume selected");
      return;
    }

    if (!user) {
      alert("Please login before starting the interview.");
      return;
    }

    if (!isLoaded) {
      return;
    }

    console.log("Starting interview...");
    console.log("Uploading:", selectedFile.name);

    mutate({
      file: selectedFile,
      userId: user.id,
    });
  };

  /**
   * Upload box is shown only when there is no selected file
   * and no interview result.
   */
  const showUploadBox =
    !selectedFile && !isPending && !data;

  /**
   * Show selected-file state before mutation.
   */
  const showSelectedFile =
    selectedFile && !isPending && !data;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Upload Box */}
      {showUploadBox && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative group cursor-pointer
            flex flex-col items-center
            justify-center p-8
            border-2 border-dashed
            rounded-2xl
            transition-all duration-200
            ${
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40 bg-card"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform duration-200">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-foreground">
              <span className="text-primary hover:underline">
                Click to upload
              </span>{" "}
              or drag and drop
            </p>

            <p className="text-xs text-muted-foreground">
              PDF, DOC, or DOCX (Max size: 10 MB)
            </p>
          </div>
        </div>
      )}

      {/* Selected File - Before Starting */}
      {showSelectedFile && (
        <div className="p-6 rounded-2xl border bg-card space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold truncate max-w-[280px]">
                  {selectedFile.name}
                </p>

                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="p-2 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={startInterview}
            disabled={!user || !isLoaded}
            className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3.5 text-base font-semibold hover:opacity-90 transition cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Interview
          </button>
        </div>
      )}

      {/* Loading State */}
      {isPending && selectedFile && (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl border bg-card/60 backdrop-blur-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-base font-semibold text-foreground">
              Analyzing your resume...
            </p>

            <p className="text-xs text-muted-foreground">
              Preparing your personalized AI interview questions
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <FileText className="w-4 h-4" />

            <span className="font-medium text-foreground truncate max-w-[200px]">
              {selectedFile.name}
            </span>

            <span>
              ({formatFileSize(selectedFile.size)})
            </span>
          </div>
        </div>
      )}

      {/* Interview Ready */}
      {data && !isPending && (
        <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 font-semibold text-lg">
              <CheckCircle2 className="w-6 h-6" />
              Interview Ready
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer"
            >
              Upload another
            </button>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-4 h-4 text-foreground/70" />

              <span className="font-medium text-foreground truncate max-w-[240px]">
                {selectedFile.name}
              </span>

              <span>
                • {formatFileSize(selectedFile.size)}
              </span>
            </div>
          )}

          {data.firstQuestion && (
            <div className="p-4 rounded-xl bg-background border space-y-1.5 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Opening Question
              </p>

              <p className="text-sm font-medium leading-relaxed">
                {data.firstQuestion}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigateToMeeting(data.stream?.callId)}
            className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3.5 text-base font-semibold hover:opacity-90 transition cursor-pointer shadow-md"
          >
            Enter Interview
          </button>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-3">
          <div className="flex items-center justify-between text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />

              <span>
                {error?.message ||
                  "Failed to process resume. Please try again."}
              </span>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="p-1 hover:bg-destructive/10 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;