"use client";

import { useEffect, useState } from "react";

import {
  StreamVideoClient,
} from "@stream-io/video-client";

import {
  StreamVideo,
  StreamCall,
  SpeakerLayout,
  CallControls,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";

export default function InterviewRoom() {
  const [client, setClient] =
    useState<StreamVideoClient | null>(null);

  const [call, setCall] =
    useState<any>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let streamClient:
      | StreamVideoClient
      | null = null;

    async function connect() {
      try {
        console.log(
          "1. Getting Stream token..."
        );

        const response =
          await fetch(
            "/api/stream/token",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (!response.ok) {
          throw new Error(
            `Token API returned ${response.status}`
          );
        }

        const data =
          await response.json();

        console.log(
          "2. Token received:",
          data
        );

        streamClient =
          new StreamVideoClient({
            apiKey:
              data.apiKey,

            user: {
              id:
                data.userId,
              name:
                "Test Candidate",
            },

            token:
              data.token,
          });

        console.log(
          "3. Stream client created"
        );

        const streamCall =
          streamClient.call(
            "default",
            "test-interview"
          );

        console.log(
          "4. Joining call..."
        );

        await streamCall.join({
          create: true,
        });

        console.log(
          "5. Successfully joined call!"
        );

        setClient(
          streamClient
        );

        setCall(
          streamCall
        );
      } catch (error) {
        console.error(
          "Stream connection error:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Failed to connect"
        );
      }
    }

    connect();

    return () => {
      if (streamClient) {
        streamClient.disconnectUser();
      }
    };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-lg rounded-xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-lg font-bold text-red-500">
            Stream Error
          </h1>

          <p className="mt-2 text-sm">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mx-auto mb-4 h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />

          <p>
            Connecting to interview...
          </p>
        </div>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <div className="h-screen w-full">
          <SpeakerLayout />

          <CallControls />
        </div>
      </StreamCall>
    </StreamVideo>
  );
}