import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ParsedIntent {
  action: "Buy" | "Sell" | "Swap" | "Stop";
  amount?: number;
  asset?: string;
  swapTo?: string;
  condition?: { type: string; pct?: number; value?: number; unit?: string };
  confidence: number;
  raw: string;
}

export async function parseIntentWithClaude(userText: string): Promise<ParsedIntent> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: `You are an intent parser for a crypto trading agent called Guardrails.
Parse user input into a structured trading intent JSON.
Supported assets: SUI, ETH, BTC, USDC, SOL.
Supported actions: Buy, Sell, Swap, Stop.
Return ONLY valid JSON matching the ParsedIntent interface.`,
    messages: [
      {
        role: "user",
        content: `Parse this trading intent: "${userText}"
Return JSON with: action, amount (number), asset, swapTo (if swap), condition (object with type: now|dip|above|schedule), confidence (0-1), raw (original text).`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  try {
    const json = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    return { ...json, raw: userText };
  } catch {
    // Fallback to local parsing
    return parseIntentLocal(userText);
  }
}

export async function generateAgentReasoning(
  intent: ParsedIntent,
  marketContext: { price: number; poolDepth: number; allowanceLeft: number }
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 150,
    system: "You are Buddy, a friendly AI trading agent. Explain your reasoning for a trade in 1-2 sentences. Be concise and plain-English.",
    messages: [
      {
        role: "user",
        content: `Intent: ${intent.action} $${intent.amount} ${intent.asset}. Price: $${marketContext.price}. Pool depth: $${marketContext.poolDepth.toLocaleString()}. Allowance left: $${marketContext.allowanceLeft}. Explain your reasoning.`,
      },
    ],
  });
  return message.content[0].type === "text" ? message.content[0].text : "Executing trade as instructed.";
}

function parseIntentLocal(text: string): ParsedIntent {
  const lower = text.toLowerCase();
  let action: ParsedIntent["action"] = "Buy";
  if (/\b(sell|dump|exit)\b/.test(lower)) action = "Sell";
  else if (/\b(swap|convert)\b/.test(lower)) action = "Swap";
  else if (/\b(stop|pause|freeze)\b/.test(lower)) action = "Stop";

  const amountMatch = lower.match(/\$?\s?(\d+)/);
  const amount = amountMatch ? parseInt(amountMatch[1]) : 20;

  const ASSETS = ["SUI", "ETH", "BTC", "USDC", "SOL"];
  let asset = "SUI";
  for (const a of ASSETS) {
    if (lower.includes(a.toLowerCase())) { asset = a; break; }
  }

  return { action, amount, asset, condition: { type: "now" }, confidence: 0.7, raw: text };
}
