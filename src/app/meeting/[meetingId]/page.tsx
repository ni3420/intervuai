"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import StreamProvider from "@/components/stream-provider";
import MeetingRoom from "@/components/meeting-room";
import { StreamUser } from "@/hooks/use-stream-hook";
import { StreamTheme } from "@stream-io/video-react-sdk";

export default function MeetingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const callId = (params.meetingId || params.id) as string;
  const rawName = searchParams.get("name") || "anonymous";

  // Derive user directly during render (no state or effect needed)
  const user: StreamUser = useMemo(() => {
    const formattedId = rawName.toLowerCase().replace(/\s+/g, "-");
    return {
      id: formattedId,
      name: rawName,
      type: "authenticated",
    };
  }, [rawName]);

  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchToken = async () => {
      try {
        const response = await fetch("/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: user.id }),
        });

        const data = await response.json();
        console.log("data",data)

        if (!response.ok || !data.token) {
          throw new Error(data.error || "Failed to fetch meeting token");
        }

        if (!isCancelled) {
          setToken(data.token);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "An unexpected error occurred");
        }
      }
    };

    fetchToken();

    return () => {
      isCancelled = true;
    };
  }, [user.id]);

  const handleLeave = () => {
    router.push("/");
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white gap-4">
        <p className="text-red-400 text-lg font-medium">{error}</p>
        <button
          onClick={handleLeave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium">Connecting to meeting...</p>
        </div>
      </div>
    );
  }

  return (
    <StreamProvider user={user} token={token}>
      <StreamTheme>
        <MeetingRoom callId={callId} userId={user.id} onLeave={handleLeave} />
      </StreamTheme>
    </StreamProvider>
  );
}