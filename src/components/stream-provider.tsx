"use client";

import React, { ReactNode } from "react";
import { StreamVideo } from "@stream-io/video-react-sdk";
import { Chat } from "stream-chat-react";
import { useStreamClients, StreamUser } from "@/hooks/use-stream-hook";

interface StreamProviderProps {
  children: ReactNode;
  user: StreamUser;
  token: string;
}

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;

export default function StreamProvider({
  children,
  user,
  token,
}: StreamProviderProps) {
  const { videoClient, chatClient } = useStreamClients({
    apiKey: API_KEY,
    user,
    token,
  });

  if (!videoClient || !chatClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
        <p className="text-lg font-medium animate-pulse">Connecting to Stream...</p>
      </div>
    );
  }

  return (
    <StreamVideo client={videoClient}>
      <Chat client={chatClient}>{children}</Chat>
    </StreamVideo>
  );
}