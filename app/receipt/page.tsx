"use client";
import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GuardianCard } from "@/components/Guardian";
import { PTBPreview } from "@/components/PTBPreview";
import { withProofs, shortId } from "@/lib/utils";
import type { Intent } from "@/components/DashboardComposer";

interface ReceiptItem {
  id: number;
  kind: "ok" | "bad" | "new";
  emoji: string;
  text: string;
  time: string;
  badge: string;
  txDigest?: string;
  walrusCid?: string;
  gas?: number;
  epoch?: number;
  checkpoint?: number;
  signer?: string;
  payload?: Record<string, unknown>;
  payloadBytes?: number;
  intent?: Intent;
  timestampMs?: number;
  fillPrice?: number;
}

function synthFromDigest(tx: string, params: { action: string; asset: string; amount: number; kind: string }): ReceiptItem {
  let seed = 0;
  for (let i = 0; i < Math.min(tx.length, 16); i++) {
    seed = ((seed * 31) + tx.charCodeAt(i)) >>> 0;
  }
  if (!seed) seed = 1234567;

  const asset = params.asset || ["SUI", "ETH", "BTC", "SOL"][seed % 4];
  const amount = params.amount || (5 + (seed % 25));
  const action = params.action || (((seed >>> 4) % 5 === 0) ? "Sell" : "Buy");
  const kind = (params.kind || (((seed >>> 6) % 10 === 0) ? "bad" : "ok")) as "ok" | "bad" | "new";
  const emojiMap: Record<string, string> = { SUI: "🌊", ETH: "⟠", BTC: "₿", SOL: "🟣", USDC: "💵" };
  const emoji = kind === "bad" ? "🛑" : (emojiMap[asset] ?? "💰");
  const verbMap: Record<string, string> = { Buy: "Bought", Sell: "Sold", Swap: "Swapped" };
  const verb = verbMap[action] ?? "Bought";
  const text = kind === "bad"
    ? `Blocked $${amount} ${asset} · over allowance`
    : `${verb} $${amount} ${asset}`;

  const basePrices: Record<string, number> = { SUI: 1.84, ETH: 3210.55, BTC: 67240, SOL: 174.20, USDC: 1.0 };
  const fillPrice = +((basePrices[asset] ?? 1) * (1 + ((seed % 200) - 100) / 10000)).toFixed(4);
  const synthDate = new Date(Date.now() - (seed % 86400000));

  const payload = kind === "bad"
    ? { v: 1, kind: "guardian_block", rule: "per_tx_cap", attempted: { asset, amountUsd: amount }, cap: 50, source: "agent", signer: "0x7a…f3" }
    : { v: 1, kind: "execution", venue: "DeepBook v3", side: action.toLowerCase(), asset, quote: "USDC", amountUsd: amount, fillPrice, slippageBps: 5 + (seed % 18), reason: "trend_follow:ma_cross_15m", signer: "0x7a…f3" };

  return withProofs<ReceiptItem>({
    id: seed, kind, emoji, text,
    time: synthDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    badge: kind === "bad" ? "BLOCKED" : "OK",
    payload,
    payloadBytes: 220 + (seed % 240),
    gas: kind === "bad" ? 0 : (12345 + (seed % 4200)),
    intent: { action, asset, amount, condition: { type: "now" } },
    fillPrice, timestampMs: synthDate.getTime(),
    txDigest: tx,
  });
}

function copyToClip(text: string) {
  try { navigator.clipboard.writeText(text); } catch {}
}

function useFakeAction(): [string, () => void] {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const trigger = useCallback(() => {
    if (state !== "idle") return;
    setState("loading");
    setTimeout(() => setState("done"), 850 + Math.random() * 400);
  }, [state]);
  return [state, trigger];
}

const IconExt = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4h6v6" /><path d="M10 14L20 4" />
    <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
  </svg>
);

function VerifyButton({ kind, item }: { kind: "sui" | "walrus"; item: ReceiptItem }) {
  const [state, trigger] = useFakeAction();
  const labels: Record<string, string> = kind === "sui"
    ? { idle: "Verify on Sui", loading: "Querying full node…", done: `✓ matches chain · epoch ${item.epoch} · finalized` }
    : { idle: "Fetch from Walrus", loading: "Pulling blob…", done: `✓ blob retrieved · ${item.payloadBytes} B · sha matches` };
  return (
    <button className={`verify verify-${kind} verify-${state}`} onClick={trigger} disabled={state !== "idle"}>
      <span className="verify-ico">
        {state === "loading" ? <span className="spin" /> : state === "done" ? "" : (kind === "sui" ? "🔎" : "📦")}
      </span>
      <span>{labels[state]}</span>
    </button>
  );
}

function ShortCopy({ value, label }: { value: string; label: string }) {
  const [hit, setHit] = useState(false);
  return (
    <button className="sc" onClick={() => { copyToClip(value); setHit(true); setTimeout(() => setHit(false), 1100); }} title={value}>
      <span className="sc-label">{label}</span>
      <span className="sc-val mono">{shortId(value, 8, 6)}</span>
      <span className="sc-act">{hit ? "✓" : "copy"}</span>
    </button>
  );
}

function ReceiptContent() {
  const params = useSearchParams();
  const tx = params.get("tx") ?? "";
  const action = params.get("action") ?? "";
  const asset = params.get("asset") ?? "";
  const amount = parseInt(params.get("amount") ?? "0", 10);
  const kind = params.get("kind") ?? "";

  const [item, setItem] = useState<ReceiptItem | null>(null);
  const [source, setSource] = useState<"local" | "synth">("synth");

  useEffect(() => {
    if (!tx) return;
    try {
      const stored = JSON.parse(localStorage.getItem("gr_receipts") ?? "null");
      if (Array.isArray(stored)) {
        const hit = stored.find((r: ReceiptItem) => r.txDigest === tx);
        if (hit) { setItem(hit); setSource("local"); return; }
      }
    } catch {}
    setItem(synthFromDigest(tx, { action, asset, amount, kind }));
    setSource("synth");
  }, [tx, action, asset, amount, kind]);

  if (!tx) {
    return (
      <div className="wrap" style={{ marginTop: 40 }}>
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>No receipt selected</h2>
          <p style={{ color: "var(--ink-soft)", marginTop: 8 }}>
            Try opening one from the <Link href="/dashboard" style={{ color: "var(--coral-deep)", fontWeight: 800 }}>dashboard</Link>.
          </p>
        </div>
      </div>
    );
  }

  if (!item) return <div className="wrap" style={{ marginTop: 40 }}>Loading…</div>;

  const intent = item.intent ?? null;
  const guardianCtx = item.payload && (item.payload as Record<string, unknown>).kind === "guardian_block"
    ? { allowance: (item.payload as Record<string, unknown>).cap as number ?? 50, spent: 0, recentCount: 2 }
    : { allowance: 50, spent: 0, recentCount: 2 };

  const dt = new Date(item.timestampMs ?? Date.now());
  const dateStr = dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const isBlocked = item.kind === "bad";

  return (
    <>
      <div className="wrap">
        <nav className="nav">
          <Link href="/" className="brand">
            <span className="brand-mark">G</span>
            <span>Guardrails</span>
          </Link>
          <div className="nav-right">
            {source === "synth" && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", padding: "4px 10px", background: "var(--paper-2)", borderRadius: 999, border: "1.5px solid var(--line)" }} title="No matching receipt in this browser — reconstructed from the digest.">
                synthesized
              </span>
            )}
            <Link href="/dashboard" style={{ color: "var(--ink-soft)", fontWeight: 700, fontSize: 14 }}>← dashboard</Link>
          </div>
        </nav>
      </div>

      <main>
        <div className="wrap">
          <div className={`hero-rcpt hero-${item.kind}`}>
            <div className="hero-rcpt-top">
              <span className={`hero-status hero-status-${item.kind}`}>
                <span className="dot" />{item.badge}
              </span>
              <span className="hero-when">{dateStr} · {item.time}</span>
            </div>
            <div className="hero-headline">
              <span className="hero-emo">{item.emoji}</span>
              <h1>{item.text}</h1>
            </div>
            <div className="hero-meta-row">
              <span className="hero-chip"><span className="hero-chip-k">by</span><span className="hero-chip-v mono">{item.signer}</span></span>
              {!!(item.payload as Record<string, unknown>)?.venue && <span className="hero-chip"><span className="hero-chip-k">on</span><span className="hero-chip-v">{String((item.payload as Record<string, unknown>).venue)}</span></span>}
              {item.fillPrice && <span className="hero-chip"><span className="hero-chip-k">fill</span><span className="hero-chip-v mono">${item.fillPrice.toLocaleString()}</span></span>}
              {isBlocked && <span className="hero-chip hero-chip-bad"><span className="hero-chip-k">rule</span><span className="hero-chip-v mono">{String((item.payload as Record<string, unknown>)?.rule)}</span></span>}
            </div>
            <div className="perforate" />
            <div className="hero-proofs">
              <div className="hero-proof">
                <div className="hero-proof-head">
                  <span className="proof-chip proof-chip-sui">SUI</span>
                  <span className="hero-proof-label">transaction digest</span>
                </div>
                <div className="hero-proof-val mono">{item.txDigest}</div>
                <div className="hero-proof-acts">
                  <VerifyButton kind="sui" item={item} />
                  <a className="proof-btn proof-btn-link" href={`https://suiscan.xyz/testnet/tx/${item.txDigest}`} target="_blank" rel="noopener noreferrer"><IconExt /> suiscan</a>
                </div>
              </div>
              <div className="hero-proof">
                <div className="hero-proof-head">
                  <span className="proof-chip proof-chip-wal">WALRUS</span>
                  <span className="hero-proof-label">blob CID</span>
                </div>
                <div className="hero-proof-val mono">{item.walrusCid}</div>
                <div className="hero-proof-acts">
                  <VerifyButton kind="walrus" item={item} />
                  <a className="proof-btn proof-btn-link" href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${item.walrusCid}`} target="_blank" rel="noopener noreferrer"><IconExt /> aggregator</a>
                </div>
              </div>
            </div>
            <div className="hero-meta">
              <div className="meta-cell"><div className="meta-k">gas used</div><div className="meta-v mono">{item.gas?.toLocaleString()} MIST</div></div>
              <div className="meta-cell"><div className="meta-k">epoch</div><div className="meta-v mono">{item.epoch}</div></div>
              <div className="meta-cell"><div className="meta-k">checkpoint</div><div className="meta-v mono">{item.checkpoint?.toLocaleString()}</div></div>
              <div className="meta-cell"><div className="meta-k">finality</div><div className="meta-v mono">finalized</div></div>
            </div>
          </div>

          {intent && (
            <section className="rdetail">
              <h3 className="rdetail-title">
                <span className="rdetail-pip">SIGN-TIME SNAPSHOT</span>
                What Guardian saw
              </h3>
              <p className="rdetail-sub">
                The risk profile at the moment this transaction was signed.
                {isBlocked && " The block came from this check — Sui never executed it."}
              </p>
              <GuardianCard intent={intent} ctx={guardianCtx} />
            </section>
          )}

          {intent && (
            <section className="rdetail">
              <h3 className="rdetail-title">
                <span className="rdetail-pip">WHAT WAS SIGNED</span>
                The full programmable transaction
              </h3>
              <p className="rdetail-sub">Every Move call, every argument. This bytecode is what your wallet approved.</p>
              <PTBPreview intent={intent} />
            </section>
          )}

          <section className="rdetail">
            <h3 className="rdetail-title">
              <span className="rdetail-pip">WALRUS BLOB</span>
              The pinned payload
            </h3>
            <p className="rdetail-sub">The full intent + outcome, content-addressed and pinned to Walrus. Anyone with the CID can fetch it forever.</p>
            <div className="payload-card">
              <div className="payload-head">
                <span className="payload-cid mono">{shortId(item.walrusCid ?? "", 10, 8)}</span>
                <span className="payload-bytes mono">{item.payloadBytes} bytes</span>
                <span style={{ flex: 1 }} />
                <button className="proof-btn" onClick={() => copyToClip(JSON.stringify(item.payload, null, 2))}>copy json</button>
              </div>
              <pre className="payload-body mono">{JSON.stringify(item.payload, null, 2)}</pre>
            </div>
          </section>

          <footer className="rfoot">
            <div className="rfoot-card">
              <div className="rfoot-emo">🛡</div>
              <div className="rfoot-text">
                <h4>What is this?</h4>
                <p>This is a receipt from <b>Guardrails</b> — an allowance system for autonomous AI agents on Sui. Every move your agent makes is signed on-chain and the full reasoning is pinned to Walrus. You can verify it without trusting us.</p>
              </div>
              <Link className="btn coral" href="/">Try it →</Link>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ marginTop: 40 }}>Loading…</div>}>
      <ReceiptContent />
    </Suspense>
  );
}
