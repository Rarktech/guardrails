"use client";
import { useState, useMemo } from "react";

const POOL_IDS: Record<string, string> = {
  SUI:  "0xa1b2c3d4…e8f3",
  ETH:  "0x4d8c2e9b…71a0",
  BTC:  "0x9f1e3a7c…b524",
  SOL:  "0x2c6b9e4f…3d18",
  USDC: "0xa1b2c3d4…e8f3",
};

const TYPE_TAGS: Record<string, string> = {
  SUI:  "0x2::sui::SUI",
  ETH:  "0x…::weth::WETH",
  BTC:  "0x…::wbtc::WBTC",
  USDC: "0x…::usdc::USDC",
  SOL:  "0x…::wsol::WSOL",
};

const AGENT_CAP_ID  = "0x7c4f3a1e…b9ae";
const AGENT_CAP_PKG = "guardrails::cap";
const POLICY_MODULE = "guardrails::policy";

interface PTBCommand {
  type: string; target?: string; typeArgs?: string[];
  args: { name: string; value: string; kind: string }[];
  result?: string;
}

interface PTBBlock { kind: "trade" | "revoke"; commands: PTBCommand[] }

function intentToPTB(intent: { action: string; amount?: number; asset?: string; swapTo?: string } | null): PTBBlock | null {
  if (!intent) return null;
  const baseUnits = (intent.amount ?? 0) * 1_000_000;
  const minOut = Math.floor(baseUnits * (1 - 50 / 10_000));

  if (intent.action === "Stop") {
    return { kind: "revoke", commands: [{
      type: "MoveCall", target: `${AGENT_CAP_PKG}::revoke`, typeArgs: [],
      args: [
        { name: "cap", value: AGENT_CAP_ID, kind: "object" },
        { name: "clock", value: "0x6", kind: "shared" },
      ],
    }] };
  }

  const isBuy = intent.action === "Buy";
  const fromAsset = isBuy ? "USDC" : (intent.asset ?? "SUI");
  const toAsset   = isBuy ? (intent.asset ?? "SUI") : (intent.swapTo ?? "USDC");

  return {
    kind: "trade",
    commands: [
      { type: "SplitCoins", target: "gas", args: [{ name: "amounts", value: `[${baseUnits.toLocaleString()}]`, kind: "value" }], result: "split_coin" },
      { type: "MoveCall", target: "deepbook::pool::swap_exact_base_for_quote",
        typeArgs: [TYPE_TAGS[fromAsset], TYPE_TAGS[toAsset]],
        args: [
          { name: "pool",    value: POOL_IDS[isBuy ? (intent.asset ?? "SUI") : fromAsset], kind: "shared" },
          { name: "coin_in", value: "Result(0)", kind: "result" },
          { name: "min_out", value: minOut.toLocaleString(), kind: "value" },
          { name: "clock",   value: "0x6", kind: "shared" },
        ], result: "swap_out" },
      { type: "MoveCall", target: `${AGENT_CAP_PKG}::charge`, typeArgs: [],
        args: [
          { name: "cap",    value: AGENT_CAP_ID, kind: "object" },
          { name: "amount", value: baseUnits.toLocaleString(), kind: "value" },
          { name: "clock",  value: "0x6", kind: "shared" },
        ] },
      { type: "TransferObjects", target: "wallet",
        args: [
          { name: "objects",   value: "[Result(1)]", kind: "result" },
          { name: "recipient", value: "0x7a8b…1f3c", kind: "address" },
        ] },
    ],
  };
}

function ptbToEnglish(ptb: PTBBlock | null, intent: { action: string; amount?: number; asset?: string; swapTo?: string } | null) {
  if (!ptb || !intent) return [];
  if (ptb.kind === "revoke") return [
    { icon: "🛑", text: "Burn the active AgentCap so Buddy can't sign anything." },
    { icon: "⛓", text: "Effective immediately, on-chain — Sui validators reject any further trades from Buddy." },
  ];
  const isBuy = intent.action === "Buy";
  const fromAsset = isBuy ? "USDC" : (intent.asset ?? "SUI");
  const toAsset   = isBuy ? (intent.asset ?? "SUI") : (intent.swapTo ?? "USDC");
  return [
    { icon: "✂️", text: `Take $${intent.amount} ${fromAsset} from your wallet.` },
    { icon: "🔄", text: `Swap it for ${toAsset} on DeepBook (reject if slippage > 0.5%).` },
    { icon: "🔒", text: `Tell Buddy's AgentCap to subtract $${intent.amount} from today's allowance.` },
    { icon: "📬", text: `Send the ${toAsset} back to your wallet.` },
  ];
}

function PTBLine({ cmd, i }: { cmd: PTBCommand; i: number }) {
  return (
    <div className="ptb-line">
      <div className="ptb-line-head">
        <span className="ptb-idx">{i}</span>
        <span className="ptb-cmd">{cmd.type}</span>
        {cmd.target && cmd.target !== "gas" && cmd.target !== "wallet" && (
          <span className="ptb-target">{cmd.target}</span>
        )}
        {cmd.typeArgs && cmd.typeArgs.length > 0 && (
          <span className="ptb-typeargs">&lt;{cmd.typeArgs.join(", ")}&gt;</span>
        )}
      </div>
      <div className="ptb-args">
        {cmd.args.map((a, k) => (
          <div className="ptb-arg" key={k}>
            <span className="ptb-arg-name">{a.name}:</span>
            <span className={`ptb-arg-val ptb-kind-${a.kind}`}>{a.value}</span>
          </div>
        ))}
        {cmd.result && (
          <div className="ptb-arg">
            <span className="ptb-arg-name">→</span>
            <span className="ptb-arg-val ptb-kind-result">{cmd.result}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PTBPreview({ intent }: { intent: { action: string; amount?: number; asset?: string; swapTo?: string } | null }) {
  const [mode, setMode] = useState<"english" | "ptb">("english");
  const ptb = useMemo(() => intentToPTB(intent), [intent]);
  const english = useMemo(() => ptbToEnglish(ptb, intent), [ptb, intent]);
  if (!ptb) return null;

  return (
    <div className="ptb-card">
      <div className="ptb-head">
        <div>
          <div className="ptb-eyebrow">Transaction preview</div>
          <div className="ptb-title">
            {ptb.kind === "revoke" ? "Revoke Buddy" : "Programmable Transaction Block"}
          </div>
        </div>
        <div className="ptb-toggle">
          <button className={mode === "english" ? "on" : ""} onClick={() => setMode("english")}>Plain English</button>
          <button className={mode === "ptb" ? "on" : ""} onClick={() => setMode("ptb")}>Raw PTB</button>
        </div>
      </div>

      {mode === "english" ? (
        <div className="ptb-english">
          {english.map((row, i) => (
            <div className="ptb-en-row" key={i}>
              <span className="ptb-en-ico">{row.icon}</span>
              <span className="ptb-en-text">{row.text}</span>
            </div>
          ))}
          <div className="ptb-en-foot">
            <span className="ptb-en-foot-label">Will sign with</span>
            <span className="ptb-en-foot-val mono">AgentCap {AGENT_CAP_ID}</span>
          </div>
        </div>
      ) : (
        <div className="ptb-raw">
          <div className="ptb-raw-head mono">
            <span className="ptb-raw-kw">sender</span> = <span className="ptb-kind-address">0x7a8b…1f3c</span>
            <span className="ptb-raw-sep">·</span>
            <span className="ptb-raw-kw">gas_budget</span> = <span className="ptb-kind-value">10_000_000</span>
          </div>
          {ptb.commands.map((c, i) => <PTBLine cmd={c} i={i} key={i} />)}
          <div className="ptb-raw-foot mono">
            <span className="ptb-raw-kw">// signed by</span>{" "}
            <span className="ptb-kind-object">{AGENT_CAP_ID}</span>{" "}
            <span className="ptb-raw-kw">// {POLICY_MODULE}</span>
          </div>
        </div>
      )}
    </div>
  );
}
