"use client";

import { useMutation } from "@tanstack/react-query";
import { uploadResume } from "../api/upload-resume.api";

export const useResumeUpload = () => {
  return useMutation({
    mutationFn: ({
      file,
      userId,
    }: {
      file: File;
      userId: string;
    }) => uploadResume(file, userId),

    onSuccess: (data) => {
      console.log("Resume uploaded:", data);
    },

    onError: (error) => {
      console.error(
        "Resume upload failed:",
        error.message
      );
    },
  });
};