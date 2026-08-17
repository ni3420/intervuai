"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCall } from "@stream-io/video-react-sdk";
import { useChatContext } from "stream-chat-react";

interface Transcript {
  id: string;
  text: string;
  speaker: string;
  timestamp: string;
}

export default function TranscriptPanel() {
  const call = useCall();
  const { client: chatClient } = useChatContext();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  useEffect(() => {
    if (!call) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleClosedCaptions = (event: any) => {
      const captionText =
        event?.closed_caption?.text ||
        event?.closedCaption?.text ||
        event?.text;

      if (!captionText || captionText.trim() === "") return;

      const speakerName =
        event?.closed_caption?.user?.name ||
        event?.closed_caption?.user?.id ||
        event?.speaker?.name ||
        event?.user?.name ||
        "Unknown";

      const newEntry: Transcript = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: captionText.trim(),
        speaker: speakerName,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };

      setTranscripts((prev) => [...prev, newEntry]);
    };

    call.on("call.closed_caption", handleClosedCaptions);

    return () => {
      call.off("call.closed_caption", handleClosedCaptions);
    };
  }, [call]);

  // Listen for channel/assistant message events if emitted via Stream Chat
  useEffect(() => {
    if (!chatClient || !call?.id) return;

    const channel = chatClient.channel("messaging", call.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNewMessage = (event: any) => {
      if (!event?.message?.text) return;

      const newEntry: Transcript = {
        id: event.message.id || `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: event.message.text,
        speaker: event.message.user?.name || event.message.user?.id || "Assistant",
        timestamp: new Date(event.message.created_at || Date.now()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };

      setTranscripts((prev) => [...prev, newEntry]);
    };

    channel.watch().catch(() => {});
    channel.on("message.new", handleNewMessage);

    return () => {
      channel.off("message.new", handleNewMessage);
    };
  }, [chatClient, call?.id]);

  return (
    <div className="flex h-full flex-col bg-gray-800 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800/80 px-4 py-3 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <div className="flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-red-500" />
          </div>
          <h3 className="font-semibold text-sm tracking-wide">Live Transcripts</h3>
        </div>
        <span className="rounded-md bg-gray-700 px-2 py-0.5 text-xs text-gray-300 font-medium">
          {transcripts.length} {transcripts.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Transcript Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {transcripts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-400 p-6">
            <svg
              className="h-10 w-10 mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-300">Waiting for speech...</p>
            <p className="text-xs text-gray-500 mt-1">
              Start talking in the meeting to see real-time captions and AI responses.
            </p>
          </div>
        ) : (
          transcripts.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-gray-700/60 bg-gray-900/60 p-3 shadow-xs space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-400">{t.speaker}</span>
                <span className="text-gray-400">{t.timestamp}</span>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed break-words">{t.text}</p>
            </div>
          ))
        )}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  );
}