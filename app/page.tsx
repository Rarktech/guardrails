"use client";
import Link from "next/link";
import { HeroDemo } from "@/components/HeroDemo";

const RECEIPTS = [
  {
    kind: "ok", emoji: "🌊", title: "Bought $6 SUI",
    sub: "DeepBook v3 · trend follow · fill $1.84", time: "09:14:02",
    tx: "4xN7wKpYsRm2vQhUaGz9bF8eDcJtL3nP6kBvWfH5jXyq",
    cid: "b0lXTbrlXbM-fq8_VY6u8fNE9chmqOFhMckSQ5x9poQ", gas: 14286,
  },
  {
    kind: "bad", emoji: "₿", title: "Blocked $72 BTC",
    sub: "Guardian: over per-tx allowance ($50 cap)", time: "09:14:31",
    tx: "9aXjQpRm2vKtL3nWfH5jBvE6cDsR7uN8kPbZyM4xQwLh",
    cid: "wwd_I5rR1irkAH9pGGt-sT7sh9qrw67HT1-Wz2vFKGQ", gas: 2104,
  },
  {
    kind: "ok", emoji: "⟠", title: "Bought $4 ETH",
    sub: "DeepBook v3 · momentum up · fill $3,210", time: "09:14:18",
    tx: "7pBkR3jX9vQa2mKtL3nWfH5jBvE6cDsR7uN8kPbZyM4x",
    cid: "WYqGMnt93fAvQCsWAUrQLWDQE1SP05ghwLmXJPAaEkk", gas: 13891,
  },
];

const APPROVES = ["Buy $4 SUI", "Buy $7 ETH", "Sell $2 USDC", "Buy $5 SUI", "Buy $9 BTC", "Sell $3 ETH"];

function short(s: string, h = 8, t = 6) {
  return s.length > h + t + 1 ? `${s.slice(0, h)}…${s.slice(-t)}` : s;
}

export default function LandingPage() {
  return (
    <>
      <div className="wrap">
        <nav className="nav">
          <a href="/" className="brand">
            <span className="brand-mark">G</span>
            <span>Guardrails</span>
          </a>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#audit">Receipts</a>
            <Link href="/contracts">Move contracts</Link>
            <Link href="/auth" className="btn coral">Get started</Link>
          </div>
        </nav>
      </div>

      {/* ── Hero ── */}
      <section className="hero" id="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <span className="tag">
                <span className="dot" />
                Built on Sui · DeepBook · Walrus
              </span>
              <h1 className="headline">
                Give your AI an{" "}
                <span className="ribbon">allowance</span>.
              </h1>
              <p className="lede">
                Guardrails is the safety layer for autonomous AI money on Sui. Set the daily budget.
                Sui enforces it on-chain. Every move is signed, every receipt pinned forever.
              </p>
              <div className="cta-row">
                <Link href="/auth" className="btn coral">▶ Try it free</Link>
                <Link href="/dashboard" className="btn ghost">See dashboard</Link>
                <span className="scribble" style={{ color: "var(--ink-soft)", fontSize: 20 }}>
                  ← play with the demo!
                </span>
              </div>
            </div>
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* ── Simplify ── */}
      <section className="simplify">
        <div className="wrap">
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span className="eyebrow">What we&apos;re fixing</span>
          </div>
          <h2 className="title" style={{ textAlign: "center" }}>
            Today, AI agents ask <span className="scribble">&ldquo;can I?&rdquo;</span> a thousand times a day.
          </h2>
          <p className="kicker" style={{ textAlign: "center", margin: "0 auto 0" }}>
            You&apos;re stuck saying yes, yes, yes. Or worse — you give them the keys and hope for the best.
            Guardrails replaces both with one simple thing: <b>a limit Sui enforces in Move.</b>
          </p>

          <div className="compare" style={{ marginTop: 40 }}>
            <div className="panel before">
              <span className="label">Before · today</span>
              <h3>Approve every single thing 🥱</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {APPROVES.map((a, i) => (
                  <div key={i} className="approve-row">
                    <span>🤖</span>
                    <span>{a}?</span>
                    <span className="pill">APPROVE</span>
                  </div>
                ))}
                <div style={{ fontSize: 13, color: "var(--ink-soft)", textAlign: "center", marginTop: 4 }}>
                  …and 994 more today.
                </div>
              </div>
            </div>

            <div className="arrow" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>→</div>

            <div className="panel after">
              <span className="label">After · with Guardrails</span>
              <h3>Set the limit once. Walk away. 🌴</h3>
              <div style={{ background: "#fff", border: "2px solid var(--ink)", borderRadius: 18, padding: 18, marginTop: 4 }}>
                <div style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 700 }}>Buddy&apos;s allowance</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "4px 0 12px" }}>
                  <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em" }}>$50</div>
                  <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>/ day</div>
                </div>
                <div className="bar"><span style={{ width: "32%" }} /></div>
                <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="chip live">● trading</span>
                  <span className="chip">DeepBook only</span>
                  <span className="chip">expires in 23h</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 12 }}>
                <Link href="/auth" className="btn coral" style={{ flex: 1, justifyContent: "center" }}>One button</Link>
                <button className="stop" style={{ flex: 1 }}>✋ STOP</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how">
        <div className="wrap">
          <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div>
              <span className="eyebrow">How it works</span>
              <h2 className="title">Three steps. <span className="scribble">No PhD.</span></h2>
            </div>
            <p className="kicker" style={{ maxWidth: 380 }}>
              If you can use a thermostat, you can use Guardrails. Promise.
            </p>
          </div>
          <div className="steps">
            {[
              { n: "1", title: "Set the limit", body: "Drag a slider. Pick how much your AI can spend. That's it — no contracts to read, no keys to copy.", icon: "🎚️" },
              { n: "2", title: "Let it loose", body: "Your AI trades on its own. Guardrails checks every move on-chain. Over the limit? Blocked. Wrong place? Blocked.", icon: "✅" },
              { n: "3", title: "Stop anytime", body: "One big button. Press it and your AI is frozen — instantly, on-chain, forever (or until you turn it back on).", icon: "🛑" },
            ].map(s => (
              <div className="step" key={s.n}>
                <div className="num">{s.n}</div>
                <div className="ico" style={{ fontSize: 28 }}>{s.icon}</div>
                <h4>{s.title}</h4>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Audit / Receipts ── */}
      <section id="audit">
        <div className="wrap">
          <div className="audit-card">
            <div>
              <span className="eyebrow" style={{ color: "rgba(255,255,255,0.55)" }}>Always know what happened</span>
              <h2 className="title" style={{ color: "var(--paper)", margin: "0 0 14px" }}>
                Every move, written down.{" "}
                <span className="scribble" style={{ color: "var(--butter)" }}>forever.</span>
              </h2>
              <p style={{ color: "#d8d2e0", fontSize: 17, lineHeight: 1.55, maxWidth: 460 }}>
                Every move your agent makes is a signed Sui transaction. The full reasoning is
                content-addressed and pinned to <b style={{ color: "var(--paper)" }}>Walrus</b>.
                Anyone with the link can verify it. You don&apos;t have to trust us.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                <span className="chip" style={{ background: "#241f2a", color: "#d8d2e0", borderColor: "#2f2a36" }}>📜 Sui-signed</span>
                <span className="chip" style={{ background: "#241f2a", color: "#d8d2e0", borderColor: "#2f2a36" }}>🐋 Walrus-pinned</span>
                <span className="chip" style={{ background: "#241f2a", color: "#d8d2e0", borderColor: "#2f2a36" }}>🔍 publicly verifiable</span>
              </div>
              <div style={{ marginTop: 22 }}>
                <Link href={`/receipt?tx=${RECEIPTS[0].tx}&kind=ok`} className="btn coral" target="_blank">
                  Open a real receipt →
                </Link>
              </div>
            </div>

            <div className="lreceipts">
              {RECEIPTS.map((r, i) => (
                <Link key={i} className={`lreceipt lreceipt-${r.kind}`} href={`/receipt?tx=${r.tx}&kind=${r.kind}`}>
                  <div className="lreceipt-row1">
                    <span className="lreceipt-emo">{r.emoji}</span>
                    <div className="lreceipt-meta">
                      <div className="lreceipt-title">{r.title}</div>
                      <div className="lreceipt-sub">{r.sub}</div>
                    </div>
                    <span className={`lreceipt-badge lreceipt-badge-${r.kind}`}>
                      {r.kind === "ok" ? "OK" : "BLOCKED"}
                    </span>
                  </div>
                  <div className="lreceipt-proofs">
                    <div className="lp">
                      <span className="lp-chip lp-chip-sui">SUI</span>
                      <span className="lp-val mono">{short(r.tx)}</span>
                    </div>
                    <div className="lp">
                      <span className="lp-chip lp-chip-wal">WALRUS</span>
                      <span className="lp-val mono">{short(r.cid)}</span>
                    </div>
                  </div>
                  <div className="lreceipt-foot">
                    <span className="lreceipt-time mono">{r.time}</span>
                    <span className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{r.gas.toLocaleString()} MIST</span>
                    <span className="lreceipt-spacer" />
                    <span className="lreceipt-open">open ↗</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="final-cta" style={{ position: "relative", overflow: "hidden" }}>
        <div className="blob" style={{ background: "var(--coral)", width: 360, height: 360, top: 20, left: "10%" }} />
        <div className="blob" style={{ background: "var(--mint)", width: 320, height: 320, bottom: 0, right: "8%" }} />
        <div className="wrap" style={{ position: "relative" }}>
          <span className="scribble" style={{ color: "var(--coral-deep)", fontSize: 28, display: "block", marginBottom: 4 }}>ready?</span>
          <h2 className="title" style={{ margin: "0 auto 18px", maxWidth: 900 }}>
            Give your AI a wallet.<br />Keep your hands on the brake.
          </h2>
          <p className="kicker" style={{ margin: "0 auto 28px" }}>
            Free to try. Two minutes to set up. Sui enforces the limit, Walrus pins the receipts,
            you keep the stop button.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/auth" className="btn coral">▶ Open the dashboard</Link>
            <a href="#hero" className="btn ghost">Replay the demo</a>
          </div>
          <div style={{ marginTop: 32, color: "var(--ink-soft)", fontSize: 14 }}>
            built on <b>Sui</b> · trades on <b>DeepBook</b> · receipts on <b>Walrus</b> · works with any AI agent
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "var(--ink)", color: "var(--paper)", padding: "40px 0" }}>
        <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <a href="/" className="brand" style={{ color: "var(--paper)" }}>
            <span className="brand-mark" style={{ background: "var(--paper)", color: "var(--ink)" }}>G</span>
            <span>Guardrails</span>
          </a>
          <div style={{ display: "flex", gap: 22, fontSize: 14 }}>
            <Link href="/contracts" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Move Contracts</Link>
            <Link href="/dashboard" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Dashboard</Link>
            <a href="https://github.com" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }} target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Sui Overflow 2026 · Agentic Web Track</div>
        </div>
      </footer>
    </>
  );
}
