import { NextResponse } from "next/server";
import {
  buildSimpleEvaluationPrompt,
  SIMPLE_EVALUATION_QUESTION_COUNT,
  SUBMIT_EVALUATION_TOOL,
  type ChatMessage,
  type DraftPayload,
} from "@/lib/evaluationConfig";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";
const XAI_MODELS = ["grok-3", "grok-2-1212", "grok-2-latest"];

export async function POST(request: Request) {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey?.trim()) {
    return NextResponse.json(
      {
        error:
          "XAI_API_KEY is not configured. Add it to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const {
      messages,
      studentName,
      evaluatorName,
      evalType,
    }: {
      messages: ChatMessage[];
      studentName: string;
      evaluatorName: string;
      evalType: string;
    } = body;

    if (!studentName || !evaluatorName || !evalType) {
      return NextResponse.json(
        { error: "Missing studentName, evaluatorName, or evalType." },
        { status: 400 },
      );
    }

    const userAnswerCount = messages.filter((m) => m.role === "user").length;

    const systemPrompt = buildSimpleEvaluationPrompt(
      studentName,
      evaluatorName,
      evalType,
      userAnswerCount,
    );

    const toolChoice =
      userAnswerCount >= SIMPLE_EVALUATION_QUESTION_COUNT
        ? { type: "function" as const, function: { name: "submit_evaluation" } }
        : "auto";

    const xaiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let data: Record<string, unknown> | null = null;
    let lastError = "";

    for (const model of XAI_MODELS) {
      const response = await fetch(XAI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: xaiMessages,
          tools: [SUBMIT_EVALUATION_TOOL],
          tool_choice: toolChoice,
          temperature: 0.6,
        }),
      });

      if (response.ok) {
        data = await response.json();
        break;
      }

      lastError = await response.text();
      if (response.status !== 404 && !lastError.includes("model")) {
        break;
      }
    }

    if (!data) {
      return NextResponse.json(
        { error: `xAI request failed: ${lastError}` },
        { status: 502 },
      );
    }
    const choices = data.choices as Array<{ message?: Record<string, unknown> }> | undefined;
    const message = choices?.[0]?.message;

    if (!message) {
      return NextResponse.json(
        { error: "No response from xAI." },
        { status: 502 },
      );
    }

    const toolCalls = message.tool_calls as
      | Array<{ function?: { name?: string; arguments?: string } }>
      | undefined;
    if (toolCalls && toolCalls.length > 0) {
      const submitCall = toolCalls.find(
        (tc: { function?: { name?: string; arguments?: string } }) =>
          tc.function?.name === "submit_evaluation",
      );

      if (submitCall?.function?.arguments) {
        const draftPayload = JSON.parse(
          submitCall.function.arguments,
        ) as DraftPayload;

        const closing =
          typeof message.content === "string" && message.content.trim()
            ? message.content
            : "I've compiled your evaluation draft and am submitting it now. Thank you for your thoughtful feedback.";

        return NextResponse.json({
          type: "tool_call",
          assistantMessage: closing,
          draftPayload,
        });
      }
    }

    const content =
      typeof message.content === "string"
        ? message.content
        : "Could you tell me more about that?";

    return NextResponse.json({
      type: "message",
      message: { role: "assistant" as const, content },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal server error: ${msg}` },
      { status: 500 },
    );
  }
}
