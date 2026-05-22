import { NextRequest, NextResponse } from "next/server";
import { parseIntentWithClaude, generateAgentReasoning } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { text, marketContext } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const intent = await parseIntentWithClaude(text);

    let reasoning: string | undefined;
    if (marketContext && intent.action !== "Stop") {
      reasoning = await generateAgentReasoning(intent, marketContext);
    }

    return NextResponse.json({ intent, reasoning });
  } catch (err) {
    console.error("[agent route]", err);
    return NextResponse.json({ error: "Failed to parse intent" }, { status: 500 });
  }
}
