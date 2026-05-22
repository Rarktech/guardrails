import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY ?? "");

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
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(
      `You are an intent parser for a crypto trading agent called Guardrails.
Parse the user input into a structured JSON trading intent.
Supported assets: SUI, ETH, BTC, USDC, SOL.
Supported actions: Buy, Sell, Swap, Stop.
Return ONLY valid JSON with these fields:
- action: "Buy"|"Sell"|"Swap"|"Stop"
- amount: number (USD amount)
- asset: string
- swapTo: string (only for Swap)
- condition: { type: "now"|"dip"|"above"|"schedule", pct?: number, value?: number, unit?: string }
- confidence: number 0-1
- raw: the original text

User input: "${userText}"`
    );
    const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
    const json = JSON.parse(text);
    return { ...json, raw: userText };
  } catch {
    return parseIntentLocal(userText);
  }
}

export async function generateAgentReasoning(
  intent: ParsedIntent,
  marketContext: { price: number; poolDepth: number; allowanceLeft: number }
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(
      `You are Buddy, a friendly AI trading agent. Explain your reasoning for a trade in 1-2 sentences. Be concise and plain-English.
Intent: ${intent.action} $${intent.amount} ${intent.asset}. Price: $${marketContext.price}. Pool depth: $${marketContext.poolDepth.toLocaleString()}. Allowance left: $${marketContext.allowanceLeft}.`
    );
    return result.response.text();
  } catch {
    return "Executing trade as instructed.";
  }
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
