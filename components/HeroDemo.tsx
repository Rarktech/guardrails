"use client";
import { useState, useEffect, useRef } from "react";

const ASSETS = [
  { sym: "SUI", emoji: "🌊" },
  { sym: "USDC", emoji: "💵" },
  { sym: "ETH", emoji: "⟠" },
  { sym: "BTC", emoji: "₿" },
];
const REASONS = ["saw a dip", "momentum up", "rebalance", "yield spike", "low-vol entry", "trend follow"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rint(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

function Ring({ pct, value }: { pct: number; value: number }) {
  const r = 46, c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(pct, 1));
  const color = pct >= 1 ? "var(--coral)" : pct > 0.75 ? "var(--butter)" : "var(--mint)";
  return (
    <div className="demo-dial">
      <div className="ring" style={{ width: 110, height: 110 }}>
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={r} fill="none" stroke="var(--paper-2)" strokeWidth="10" />
          <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 55 55)"
            style={{ transition: "stroke-dashoffset .4s ease, stroke .25s" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <div>
            <div className="num">${value}</div>
            <div className="sub">spent</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeedItem {
  id: number; ok: boolean; isRevoke?: boolean;
  asset?: string; emoji?: string; amount?: number; reason?: string;
}

export function HeroDemo() {
  const [budget, setBudget] = useState(50);
  const [running, setRunning] = useState(false);
  const [spent, setSpent] = useState(0);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [revoked, setRevoked] = useState(false);
  const idRef = useRef(1);
  const spentRef = useRef(0);
  const budgetRef = useRef(50);

  useEffect(() => { spentRef.current = spent; }, [spent]);
  useEffect(() => { budgetRef.current = budget; }, [budget]);

  useEffect(() => {
    if (!running || revoked) return;
    const id = setInterval(() => {
      const asset = rand(ASSETS);
      const amount = Math.random() < 0.18 ? rint(20, 80) : rint(2, 14);
      const ok = !revoked && (spentRef.current + amount) <= budgetRef.current;
      const entry: FeedItem = { id: idRef.current++, ok, asset: asset.sym, emoji: asset.emoji, amount, reason: rand(REASONS) };
      if (ok) { spentRef.current += amount; setSpent(spentRef.current); }
      setFeed(f => [entry, ...f].slice(0, 40));
    }, 1600);
    return () => clearInterval(id);
  }, [running, revoked]);

  const pct = budget > 0 ? spent / budget : 0;
  const remaining = Math.max(0, budget - spent);
  const status = revoked ? "stopped" : running ? "live" : "idle";

  function start() { setRevoked(false); setRunning(true); }
  function stop() {
    setRevoked(true); setRunning(false);
    setFeed(f => [{ id: idRef.current++, ok: false, isRevoke: true }, ...f].slice(0, 40));
  }
  function reset() { setRunning(false); setRevoked(false); setSpent(0); spentRef.current = 0; setFeed([]); }

  return (
    <div className="demo-card">
      <div className="pip">▸ LIVE DEMO · TRY IT</div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "var(--rose)", border: "2px solid var(--ink)", display: "grid", placeItems: "center", fontSize: 18 }}>🐷</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Buddy</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>your trading agent</div>
          </div>
        </div>
        <span className={`chip ${status === "live" ? "live" : status === "stopped" ? "stopped" : ""}`}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: status === "live" ? "#1d6f47" : status === "stopped" ? "#913317" : "#999", boxShadow: status === "live" ? "0 0 0 4px rgba(29,111,71,.18)" : "none" }} />
          {status === "live" ? "trading" : status === "stopped" ? "stopped" : "ready"}
        </span>
      </div>

      <Ring pct={pct} value={spent} />

      <div className="kpi">
        <span>Allowance <b>${budget}</b></span>
        <span style={{ color: pct >= 1 ? "var(--coral-deep)" : "var(--ink-soft)" }}>
          {pct >= 1 ? "🚫 limit hit" : `$${remaining} left`}
        </span>
      </div>
      <div className={`bar ${pct >= 1 ? "full" : pct > 0.75 ? "warn" : ""}`}>
        <span style={{ width: `${Math.min(pct, 1) * 100}%` }} />
      </div>

      <div style={{ marginTop: 16, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>Set the limit</label>
        <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>${budget}</span>
      </div>
      <input type="range" min="20" max="200" step="5" value={budget}
        onChange={e => setBudget(parseInt(e.target.value))}
        disabled={running && !revoked} className="demo-slider" />

      <div className="feed" style={{ marginTop: 16 }}>
        {feed.length === 0 && (
          <div className="feed-empty">Press <b>Let it trade</b> to watch Buddy work.</div>
        )}
        {feed.map(row => row.isRevoke ? (
          <div key={row.id} className="feed-row bad">
            <span>🛑</span>
            <span>You hit <b>STOP</b>. Buddy is now frozen.</span>
            <span className="badge">REVOKED</span>
          </div>
        ) : (
          <div key={row.id} className={`feed-row ${row.ok ? "ok" : "bad"}`}>
            <span style={{ fontSize: 16 }}>{row.emoji}</span>
            <span>
              {row.ok ? "bought" : "tried"} <b>${row.amount} {row.asset}</b>
              <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}> · {row.reason}</span>
            </span>
            <span className="badge">{row.ok ? "OK" : "BLOCKED"}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        {!running && !revoked && (
          <button className="btn coral" onClick={start} style={{ flex: 1, justifyContent: "center" }}>▶ Let it trade</button>
        )}
        {running && (
          <button className="stop" onClick={stop} style={{ flex: 1 }}>✋ STOP Buddy</button>
        )}
        {revoked && (
          <button className="btn" onClick={reset} style={{ flex: 1, justifyContent: "center" }}>↺ Try again</button>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
        🔒 Buddy <b>cannot</b> spend over <b>${budget}</b>. Guardrails blocks it on-chain — not in the app.
      </div>
    </div>
  );
}
