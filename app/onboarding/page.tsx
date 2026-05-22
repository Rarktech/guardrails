"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COLORS = [
  { label: "Coral", value: "var(--coral)", css: "#ff7a59" },
  { label: "Mint", value: "var(--mint)", css: "#6fcfa0" },
  { label: "Sky", value: "var(--sky)", css: "#7bb8ff" },
  { label: "Butter", value: "var(--butter)", css: "#ffd66b" },
  { label: "Rose", value: "var(--rose)", css: "#ffc6b0" },
  { label: "Berry", value: "#c8568f", css: "#c8568f" },
  { label: "Ink", value: "var(--ink)", css: "#1f1a24" },
  { label: "Sage", value: "#8fb87e", css: "#8fb87e" },
];

const PERSONALITIES = [
  { id: "cautious", emoji: "🦉", title: "Cautious", sub: "Checks twice, acts once. Won't touch anything spicy." },
  { id: "balanced", emoji: "🐺", title: "Balanced", sub: "Steady growth. Diversified by default. Good all-rounder." },
  { id: "bold", emoji: "🦁", title: "Bold", sub: "Momentum chaser. Loves volatility. High risk tolerance." },
  { id: "degen", emoji: "🦊", title: "Degen", sub: "YOLO energy. Meme coins welcome. You asked for it." },
];

const NAME_SUGGESTIONS = ["Buddy", "Max", "Sage", "Chip", "Blaze", "Nova"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Buddy");
  const [color, setColor] = useState(COLORS[0]);
  const [personality, setPersonality] = useState(PERSONALITIES[1]);
  const [allowance, setAllowance] = useState(50);

  const TOTAL_STEPS = 3;

  function saveBuddy() {
    try {
      localStorage.setItem("gr_buddy", JSON.stringify({ name, color: color.css, personality: personality.id, allowance }));
    } catch {}
    router.push("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      {/* bg blobs */}
      <div style={{ position: "fixed", borderRadius: "50%", filter: "blur(60px)", opacity: 0.4, pointerEvents: "none", background: "var(--coral)", width: 300, height: 300, top: -80, right: -80 }} />
      <div style={{ position: "fixed", borderRadius: "50%", filter: "blur(60px)", opacity: 0.4, pointerEvents: "none", background: "var(--mint)", width: 280, height: 280, bottom: -60, left: -60 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 460 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link href="/" className="brand" style={{ justifyContent: "center" }}>
            <span className="brand-mark">G</span>
            <span>Guardrails</span>
          </Link>
        </div>

        {/* Progress dots */}
        <div className="dots" style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span key={i} style={{
              width: i === step ? 22 : 7, height: 7,
              borderRadius: 999, background: i <= step ? "var(--ink)" : "var(--line)",
              transition: "all .25s ease"
            }} />
          ))}
        </div>

        {/* Card */}
        <div className="card" style={{ borderRadius: 28, padding: "28px 24px", boxShadow: "8px 8px 0 rgba(31,26,36,0.9)" }}>

          {/* Step 0 — Name + color */}
          {step === 0 && (
            <>
              <h3 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
                Meet your <span className="scribble" style={{ color: "var(--coral-deep)" }}>Buddy</span>
              </h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.5, margin: "0 0 22px" }}>
                Give your AI agent a name and a look. You can change this anytime.
              </p>

              {/* Avatar preview */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, margin: "12px 0 22px" }}>
                <div style={{
                  width: 120, height: 120, borderRadius: 30, background: color.css,
                  border: "3px solid var(--ink)", display: "grid", placeItems: "center", fontSize: 60,
                  boxShadow: "0 6px 0 rgba(31,26,36,0.9)", transition: "background .25s ease"
                }}>🐷</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{name || "Buddy"}</div>
              </div>

              <input
                className="input" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Name your agent…"
                style={{ width: "100%", padding: "14px 16px", border: "2px solid var(--ink)", borderRadius: 16, font: "inherit", fontSize: 18, fontWeight: 700, background: "#fff", outline: "none", textAlign: "center", marginBottom: 10 }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
                {NAME_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setName(s)}
                    style={{ background: "#fff", border: "2px solid var(--ink)", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 0 rgba(31,26,36,0.9)", fontFamily: "inherit" }}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Color picker */}
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-soft)", marginBottom: 10 }}>Pick a color</div>
              <div className="swatch-row">
                {COLORS.map(c => (
                  <button key={c.label} onClick={() => setColor(c)}
                    className={`swatch ${color.label === c.label ? "on" : ""}`}
                    style={{ background: c.css, border: `2.5px solid var(--ink)` }}
                    title={c.label}>
                    {color.label === c.label && (
                      <span style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "var(--ink)", color: "var(--paper)", border: "2px solid var(--paper)", display: "grid", placeItems: "center", fontSize: 12 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 1 — Personality */}
          {step === 1 && (
            <>
              <h3 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
                How should <span className="scribble" style={{ color: "var(--coral-deep)" }}>{name || "Buddy"}</span> trade?
              </h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.5, margin: "0 0 18px" }}>Pick a trading personality.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {PERSONALITIES.map(p => (
                  <button key={p.id} className={`pcard ${personality.id === p.id ? "on" : ""}`}
                    onClick={() => setPersonality(p)}>
                    <div className="pavi" style={{ width: 52, height: 52, borderRadius: 16, border: "2px solid var(--ink)", display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0 }}>{p.emoji}</div>
                    <div>
                      <div className="ptitle" style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1 }}>{p.title}</div>
                      <div className="psub" style={{ fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 600, marginTop: 2 }}>{p.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2 — Allowance */}
          {step === 2 && (
            <>
              <h3 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
                Set <span className="scribble" style={{ color: "var(--coral-deep)" }}>{name}&apos;s</span> daily limit
              </h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.5, margin: "0 0 8px" }}>
                This becomes an on-chain AgentCap object. {name} literally cannot spend more.
              </p>

              <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, textAlign: "center", margin: "18px 0 8px" }}>
                ${allowance} <small style={{ fontSize: 18, color: "var(--ink-soft)", fontWeight: 600 }}>/ day</small>
              </div>

              <input type="range" min="10" max="500" step="5" value={allowance}
                onChange={e => setAllowance(parseInt(e.target.value))}
                className="demo-slider" style={{ marginBottom: 8 }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-soft)", fontWeight: 700, marginBottom: 18 }}>
                <span>$10</span><span>$100</span><span>$250</span><span>$500</span>
              </div>

              {/* Summary */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "AgentCap.budget", value: `${(allowance * 1_000_000).toLocaleString()} MIST/day`, type: "u64" },
                  { label: "AgentCap.venues", value: "[deepbook::pool]", type: "vector" },
                  { label: "AgentCap.personality", value: personality.title, type: "String" },
                ].map(f => (
                  <div key={f.label} className="mono" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "var(--paper-2)", borderRadius: 8, fontSize: 12 }}>
                    <span style={{ color: "var(--coral-deep)", fontWeight: 700, flex: 1 }}>{f.label}</span>
                    <span style={{ color: "var(--ink-soft)", fontSize: 10.5 }}>{f.type}</span>
                    <span style={{ fontWeight: 700 }}>{f.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button className="btn ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 0 }}>← Back</button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <button className="btn coral" onClick={() => setStep(s => s + 1)} style={{ flex: 1, justifyContent: "center" }}>Next →</button>
            ) : (
              <button className="btn coral" onClick={saveBuddy} style={{ flex: 1, justifyContent: "center" }}>
                🚀 Mint AgentCap & Start
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
