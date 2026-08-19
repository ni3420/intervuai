import { StreamClient } from "@stream-io/node-sdk";

export interface SpeakInCallProps {
  streamClient: StreamClient;
  callType?: string;
  callId: string;
  text: string;
  speakerId?: string;
}

export async function speak({
  streamClient,
  callType = "default",
  callId,
  text,
  speakerId = "ai-interviewer",
}: SpeakInCallProps): Promise<void> {
  try {
    // 1. Initialize channel on Stream backend with ChannelMemberRequest objects
    const channel = streamClient.chat.channel("messaging", callId);
    await channel.getOrCreate({
      data: {
        created_by_id: speakerId,
        members: [{ user_id: speakerId }],
      },
    });

    // 2. Broadcast the message to the chat channel
    await channel.sendMessage({
      message: {
        text,
        user_id: speakerId,
      },
    });

    // 3. Update the video call's custom metadata
    const call = streamClient.video.call(callType, callId);
    await call.update({
      custom: {
        lastAiSpeech: text,
        lastAiSpeechTimestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Stream TTS] Failed to broadcast speech to call:", error);
    throw error;
  }
}