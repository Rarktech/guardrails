"use client";
import { useState, useEffect } from "react";

const CAP_OBJECT_ID = "0x7c4f3a1e2d8b5f9c6a4e1b7d3c2f8a91b9ae";
const CAP_TYPE = "guardrails::cap::AgentCap";
const REVOKE_TARGET = "guardrails::cap::revoke";

function shortHex(s: string, head = 6, tail = 4) {
  return s.length > head + tail + 1 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;
}

function fakeTxDigest() {
  const cs = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 44; i++) s += cs[Math.floor(Math.random() * cs.length)];
  return s;
}

function timeLeft(toMs: number) {
  const diff = Math.max(0, toMs - Date.now());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

interface BuddyConfig {
  name?: string;
  emoji?: string;
  color?: string;
  allowance?: number;
}

interface AgentCapCardProps {
  buddy?: BuddyConfig;
  allowance: number;
  spent: number;
  stopped: boolean;
  onChangeBudget: (v: number) => void;
  onRevoke: () => void;
  onMint: () => void;
}

export function AgentCapCard({ buddy, allowance, spent, stopped, onChangeBudget, onRevoke, onMint }: AgentCapCardProps) {
  const r = 46, c = 2 * Math.PI * r;
  const pct = allowance > 0 ? Math.min(spent / allowance, 1) : 0;
  const off = c * (1 - pct);
  const ringColor = pct >= 1 ? "var(--coral)" : pct > 0.75 ? "var(--butter)" : "var(--mint)";
  const remaining = Math.max(0, allowance - spent);
  const name = buddy?.name ?? "Buddy";

  const [expiresAt] = useState<number>(() => {
    try {
      const x = parseInt(localStorage.getItem("gr_cap_exp") ?? "0", 10);
      if (x > Date.now()) return x;
    } catch {}
    const x = Date.now() + 23 * 60 * 60 * 1000 + 47 * 60 * 1000;
    try { localStorage.setItem("gr_cap_exp", String(x)); } catch {}
    return x;
  });

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const [confirming, setConfirming] = useState(false);
  const [burning, setBurning] = useState(false);
  const [revokeTx, setRevokeTx] = useState("");

  function doRevoke() {
    setConfirming(false);
    setBurning(true);
    setRevokeTx(fakeTxDigest());
    setTimeout(() => {
      setBurning(false);
      onRevoke();
    }, 1400);
  }

  return (
    <div className={`cap-card${stopped ? " is-revoked" : ""}${burning ? " is-burning" : ""}`}>
      <span className="pip">ON-CHAIN POLICY</span>

      <div className="cap-id-row">
        <div>
          <div className="cap-type mono">{CAP_TYPE}</div>
          <div className="cap-objid mono" title={CAP_OBJECT_ID}>
            <span className="cap-objid-label">id:</span>
            <span className="cap-objid-val">{shortHex(CAP_OBJECT_ID, 8, 6)}</span>
            <a className="cap-explorer" href={`https://suiscan.xyz/testnet/object/${CAP_OBJECT_ID}`} target="_blank" rel="noopener noreferrer" title="View on Sui Explorer">↗</a>
          </div>
        </div>
        <div className={`cap-status ${stopped ? "revoked" : "live"}`}>
          <span className="dot" />
          {stopped ? "revoked" : "active"}
        </div>
      </div>

      <div className="cap-ring-row">
        <div className="ring" style={{ width: 96, height: 96, position: "relative" }}>
          <svg width="96" height="96" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r={r} fill="none" stroke="var(--paper-2)" strokeWidth="10" />
            <circle cx="55" cy="55" r={r} fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 55 55)"
              style={{ transition: "stroke-dashoffset .4s ease, stroke .25s" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>${spent}</div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600 }}>of ${allowance}</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1 }}>
            ${remaining}<span style={{ fontSize: 14, color: "var(--ink-soft)", fontWeight: 600 }}> left</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>resets in {timeLeft(expiresAt)}</div>
        </div>
      </div>

      <div className="cap-fields mono">
        {[
          { k: "budget", t: "u64", v: `${(allowance * 1_000_000).toLocaleString()}` },
          { k: "spent", t: "u64", v: `${(spent * 1_000_000).toLocaleString()}` },
          { k: "venues", t: "vector", v: "[deepbook]" },
          { k: "expires_at", t: "u64", v: new Date(expiresAt).toISOString().slice(0, 16).replace("T", " ") },
        ].map(f => (
          <div className="cap-field" key={f.k}>
            <span className="cap-field-k">{f.k}</span>
            <span className="cap-field-t">{f.t}</span>
            <span className="cap-field-v">{f.v}</span>
          </div>
        ))}
      </div>

      {!stopped && (
        <div className="cap-budget">
          <div className="cap-budget-head">
            <span className="label-sm">Budget</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>${allowance} / day</span>
          </div>
          <input type="range" min="10" max="500" step="5" value={allowance}
            onChange={e => onChangeBudget(parseInt(e.target.value, 10))}
            className="demo-slider" />
        </div>
      )}

      {!stopped ? (
        confirming ? (
          <div className="cap-confirm">
            <div className="cap-confirm-msg">
              <b>Burn the AgentCap?</b><br />
              <span>{name} won&apos;t be able to sign anything until you mint a new one.</span>
            </div>
            <div className="cap-confirm-row">
              <button className="btn ghost" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="stop" onClick={doRevoke}>✋ Yes, revoke</button>
            </div>
          </div>
        ) : (
          <button className="stop" onClick={() => setConfirming(true)} style={{ width: "100%" }}>
            ✋ Revoke AgentCap
          </button>
        )
      ) : (
        <div className="cap-burned">
          <div className="cap-burned-stamp">REVOKED</div>
          <div className="cap-burned-info">
            <div className="cap-burned-line"><b>{REVOKE_TARGET}</b> succeeded</div>
            {revokeTx && <div className="mono cap-burned-tx">tx: {shortHex(revokeTx, 8, 6)}</div>}
          </div>
          <button className="btn mint" onClick={onMint} style={{ width: "100%" }}>▶ Mint a new AgentCap</button>
        </div>
      )}

      {burning && (
        <div className="cap-burn-veil">
          <div className="cap-burn-glow" />
          <div className="cap-burn-msg mono">calling <b>{REVOKE_TARGET}</b>…</div>
        </div>
      )}
    </div>
  );
}
