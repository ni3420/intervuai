import { NextRequest, NextResponse } from "next/server";

import {
  askLlama,
  type ChatMessage,
} from "@/lib/local/llama";

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const {
      transcript,
      messages,
    } = body as {
      transcript?: string;
      messages?: ChatMessage[];
    };

    if (!transcript?.trim()) {
      return NextResponse.json(
        {
          error: "Transcript is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        {
          error: "Interview messages are required",
        },
        {
          status: 400,
        }
      );
    }

    const updatedMessages: ChatMessage[] = [
      ...messages,

      {
        role: "user",
        content: transcript.trim(),
      },
    ];

    console.log(
      "[Interview] Candidate:",
      transcript
    );

    const response = await askLlama(
      updatedMessages
    );

    console.log(
      "[Interview] AI:",
      response
    );

    return NextResponse.json({
      response,

      messages: [
        ...updatedMessages,

        {
          role: "assistant",
          content: response,
        },
      ],
    });
  } catch (error) {
    console.error(
      "[Interview API] Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate AI response",
      },
      {
        status: 500,
      }
    );
  }
}
