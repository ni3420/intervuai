import { api } from "@/lib/axios/client";

export const uploadResume = async (
  file: File,
  userId: string
) => {
  const formData = new FormData();
  console.log("files",file)

  formData.append("resume", file);
  formData.append("userId", userId);

  const { data } = await api.post(
    "/api/resume",
    formData
  );

  return data;
};