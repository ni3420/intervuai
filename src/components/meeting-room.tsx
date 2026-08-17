"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Call,
  CallControls,
  ParticipantView,
  StreamCall,
  useCallStateHooks,
  useStreamVideoClient,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import TranscriptPanel from "@/components/transcript-panel";
import { Bot, User } from "lucide-react";

interface MeetingRoomProps {
  callId: string;
  userId: string;
  onLeave: () => void;
}

// Dedicated single-window interview display
function SingleInterviewStage() {
  const { useParticipants, useLocalParticipant } = useCallStateHooks();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();

  // Find the AI Interviewer participant (or fallback to any remote participant)
  const aiParticipant = participants.find(
    (p) => p.userId === "ai-interviewer" || p.userId !== localParticipant?.userId
  );

  return (
    <div className="relative flex-1 w-full h-full rounded-2xl bg-gray-900 border border-gray-700 overflow-hidden shadow-2xl flex items-center justify-center">
      {/* Main Window: AI Interviewer */}
      {aiParticipant ? (
        <div className="w-full h-full flex items-center justify-center relative">
          {aiParticipant.videoStream ? (
            <ParticipantView
              participant={aiParticipant}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 text-center p-6">
              <div className="w-24 h-24 rounded-full bg-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center shadow-lg animate-pulse">
                <Bot className="w-12 h-12 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">AI Interviewer</h3>
                <p className="text-sm text-gray-400 mt-1">Listening and analyzing...</p>
              </div>
            </div>
          )}

          {/* AI Name Badge */}
          <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700 text-xs font-medium text-blue-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AI Interviewer (Active)
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
          <Bot className="w-12 h-12 animate-pulse text-gray-500" />
          <p className="text-sm">Connecting AI Interviewer to call...</p>
        </div>
      )}

      {/* Floating mini user window in top-right corner (PIP) */}
      {localParticipant && (
        <div className="absolute top-4 right-4 w-36 h-28 rounded-xl bg-gray-800 border border-gray-600 shadow-xl overflow-hidden z-10 flex items-center justify-center">
          {localParticipant.videoStream ? (
            <ParticipantView
              participant={localParticipant}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 text-gray-400">
              <User className="w-6 h-6 text-gray-300" />
              <span className="text-[10px] text-gray-300 font-medium truncate max-w-[90px]">
                {localParticipant.name || "You"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MeetingRoom({
  callId,
  userId,
  onLeave,
}: MeetingRoomProps) {
  const client = useStreamVideoClient();
  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);

  const joinedRef = useRef(false);
  const leavingRef = useRef(false);

  useEffect(() => {
    if (!client || joinedRef.current) return;
    joinedRef.current = true;

    let activeCall: Call | null = null;

    const initCall = async () => {
  try {
    const myCall = client.call("default", callId);
    activeCall = myCall;

    await myCall.getOrCreate({
      data: {
        members: [{ user_id: userId, role: "call_member" }],
      },
    });

    // Join the call without passing invalid camera/mic properties
    await myCall.join({ create: true });

    // Explicitly disable media tracks on the call instance
    await myCall.camera.disable();
    await myCall.microphone.disable();

   

    await myCall.startClosedCaptions({ language: "en" });

    myCall.on("call.session_ended", () => {
      onLeave();
    });

    setCall(myCall);
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Failed to join call");
  }
};

    initCall();

    return () => {
      if (activeCall && !leavingRef.current) {
        leavingRef.current = true;
        activeCall.stopClosedCaptions().catch(() => {});
        activeCall.leave().catch(() => {});
      }
    };
  }, [client, callId, userId, onLeave]);

  const handleLeaveClick = async () => {
    if (leavingRef.current) {
      onLeave();
      return;
    }

    leavingRef.current = true;

    if (call) {
      try {
        await call.stopClosedCaptions();
        await call.leave();
      } catch (err) {
        console.error("Error leaving call:", err);
      }
    }

    onLeave();
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white gap-4">
        <p className="text-red-400 text-lg font-medium">{error}</p>
        <button
          onClick={onLeave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors cursor-pointer"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium">Loading interview room...</p>
        </div>
      </div>
    );
  }

  return (
    <StreamCall call={call}>
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 md:p-6">
        <div className="container mx-auto h-[calc(100vh-3rem)] grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          {/* Main Single Window Stage */}
          <div className="flex flex-col gap-4 h-full">
            <SingleInterviewStage />

            <div className="flex items-center justify-center p-3 bg-gray-800 border border-gray-700 rounded-xl shadow-lg">
              <CallControls onLeave={handleLeaveClick} />
            </div>
          </div>

          {/* Real-time Captions & Transcript */}
          <div className="h-full rounded-2xl bg-gray-800 border border-gray-700 overflow-hidden shadow-2xl">
            <TranscriptPanel />
          </div>
        </div>
      </div>
    </StreamCall>
  );
}