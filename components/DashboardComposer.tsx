"use client";
import { useState, useEffect, useRef } from "react";

const ASSETS = ["SUI", "ETH", "BTC", "USDC", "SOL"];
export const ASSET_EMOJI: Record<string, string> = {
  SUI: "🌊", ETH: "⟠", BTC: "₿", USDC: "💵", SOL: "🟣",
};

const VOICE_PHRASES = [
  "Buy twenty dollars of SUI if it drops five percent",
  "Sell ten dollars of ETH when it hits four thousand",
  "Buy five dollars of BTC every day this week",
  "Swap fifty USDC into SUI right now",
];

export interface Condition {
  type: "now" | "dip" | "above" | "schedule";
  pct?: number;
  value?: number;
  unit?: string;
}

export interface Intent {
  action: string;
  amount?: number;
  asset?: string;
  swapTo?: string;
  condition?: Condition;
  raw?: string;
}

export function conditionText(c?: Condition | null): string {
  if (!c) return "right now";
  if (c.type === "now") return "right now";
  if (c.type === "dip") return `if it drops ${c.pct}%`;
  if (c.type === "above") return `when it hits $${c.value?.toLocaleString()}`;
  if (c.type === "schedule") return `every ${c.unit}`;
  return "right now";
}

function parseIntent(textRaw: string): Intent | null {
  if (!textRaw) return null;
  const text = textRaw.toLowerCase().replace(/[?.!]+$/, "").trim();

  let action: string | null = null;
  if (/\b(buy|grab|get|cop)\b/.test(text)) action = "Buy";
  else if (/\b(sell|dump|exit)\b/.test(text)) action = "Sell";
  else if (/\b(swap|convert|trade)\b.+\b(into|for|to)\b/.test(text)) action = "Swap";
  else if (/\b(stop|pause|freeze|halt)\b/.test(text)) action = "Stop";

  if (action === "Stop") return { action: "Stop", raw: textRaw };
  if (!action) return null;

  const numWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    fifteen: 15, twenty: 20, "twenty-five": 25, "twenty five": 25,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  };
  let amount = 0;
  const dollarMatch = text.match(/\$\s?(\d+)/);
  const digitMatch = text.match(/(\d+)\s*(dollars?|usd|bucks)?/);
  if (dollarMatch) amount = parseInt(dollarMatch[1], 10);
  else if (digitMatch) amount = parseInt(digitMatch[1], 10);
  else {
    for (const [w, v] of Object.entries(numWords)) {
      if (new RegExp(`\\b${w}\\b`).test(text)) { amount = v; break; }
    }
  }
  if (!amount) amount = 20;

  let asset = "SUI";
  for (const a of ASSETS) {
    if (new RegExp(`\\b${a.toLowerCase()}\\b`).test(text)) { asset = a; break; }
  }
  if (/\b(bitcoin)\b/.test(text)) asset = "BTC";
  if (/\b(ether|ethereum)\b/.test(text)) asset = "ETH";

  let swapTo: string | undefined;
  if (action === "Swap") {
    const m = text.match(/\b(?:into|for|to)\s+([a-z]+)/);
    if (m) {
      const cand = m[1].toUpperCase();
      if (ASSETS.includes(cand)) swapTo = cand;
    }
  }

  let condition: Condition = { type: "now" };
  const dipMatch = text.match(/(?:drops?|dips?|falls?)\s+(?:by\s+)?(\d+)\s*(?:percent|%)/);
  const riseMatch = text.match(/(?:hits?|reaches?|above|over)\s+\$?(\d+(?:[,.]\d+)?(?:\s*k)?)/);
  const everyMatch = text.match(/\b(every\s+(day|hour|week|monday|tuesday|wednesday|thursday|friday))/);

  if (dipMatch) condition = { type: "dip", pct: parseInt(dipMatch[1], 10) };
  else if (riseMatch) {
    let v = riseMatch[1].replace(",", "");
    if (/k$/.test(v)) v = String(parseFloat(v) * 1000);
    condition = { type: "above", value: Math.round(parseFloat(v)) };
  } else if (everyMatch) {
    condition = { type: "schedule", unit: everyMatch[2] };
  }

  return { action, amount, asset, swapTo, condition, raw: textRaw };
}

function SlotPop({ options, onPick, onClose }: {
  options: { value: string | number; label: string }[];
  onPick: (v: string | number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".slot-pop")) onClose();
    };
    setTimeout(() => document.addEventListener("click", h), 0);
    return () => document.removeEventListener("click", h);
  }, [onClose]);
  return (
    <div className="slot-pop" style={{ top: 36, left: 0 }}>
      {options.map(o => (
        <button key={String(o.value)} onClick={() => { onPick(o.value); onClose(); }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Slot({ kind, label, options, onChange }: {
  kind: string; label: string;
  options: { value: string | number; label: string }[];
  onChange: (v: string | number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span className={`slot ${kind}`} onClick={() => setOpen(o => !o)}>{label}</span>
      {open && <SlotPop options={options} onPick={onChange} onClose={() => setOpen(false)} />}
    </span>
  );
}

function IntentCard({ intent, onChange, onConfirm, onCancel }: {
  intent: Intent;
  onChange: (i: Intent) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (intent.action === "Stop") {
    return (
      <div className="intent">
        <h4>Got it</h4>
        <div className="sentence">
          <span className="slot action">Stop</span> the bot{" "}
          <span className="slot cond">right now</span>.
        </div>
        <div className="intent-actions">
          <button className="btn coral" onClick={onConfirm}>✋ Yes, stop it</button>
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  const actionOpts = [
    { value: "Buy", label: "Buy" },
    { value: "Sell", label: "Sell" },
    { value: "Swap", label: "Swap" },
  ];
  const amountOpts = [5, 10, 20, 50, 100, 200].map(v => ({ value: v, label: `$${v}` }));
  const assetOpts = ASSETS.map(a => ({ value: a, label: `${ASSET_EMOJI[a]} ${a}` }));
  const condOpts = [
    { value: "now", label: "right now" },
    { value: "dip5", label: "if it drops 5%" },
    { value: "dip10", label: "if it drops 10%" },
    { value: "daily", label: "every day" },
    { value: "weekly", label: "every week" },
  ];
  const condMap: Record<string, Condition> = {
    now: { type: "now" },
    dip5: { type: "dip", pct: 5 },
    dip10: { type: "dip", pct: 10 },
    daily: { type: "schedule", unit: "day" },
    weekly: { type: "schedule", unit: "week" },
  };

  return (
    <div className="intent">
      <h4>Here&apos;s what I heard — tap any chip to change it</h4>
      <div className="sentence">
        <Slot kind="action" label={intent.action} options={actionOpts} onChange={v => onChange({ ...intent, action: String(v) })} />{" "}
        <Slot kind="amount" label={`$${intent.amount}`} options={amountOpts} onChange={v => onChange({ ...intent, amount: Number(v) })} />{" "}
        of{" "}
        <Slot kind="asset" label={`${ASSET_EMOJI[intent.asset ?? "SUI"]} ${intent.asset ?? "SUI"}`} options={assetOpts} onChange={v => onChange({ ...intent, asset: String(v) })} />
        {intent.action === "Swap" && intent.swapTo && (
          <> into <Slot kind="asset" label={`${ASSET_EMOJI[intent.swapTo]} ${intent.swapTo}`} options={assetOpts} onChange={v => onChange({ ...intent, swapTo: String(v) })} /></>
        )}{" "}
        <Slot kind="cond" label={conditionText(intent.condition)} options={condOpts} onChange={v => onChange({ ...intent, condition: condMap[String(v)] })} />
        .
      </div>
      <div className="intent-rules">
        <span className="intent-rule">🔒 stays under your allowance</span>
        <span className="intent-rule">📜 receipt saved</span>
        <span className="intent-rule">✋ stop any time</span>
      </div>
      <div className="intent-actions">
        <button className="btn coral" onClick={onConfirm}>✓ Send it</button>
        <button className="btn ghost" onClick={onCancel}>Nope, scrap it</button>
      </div>
    </div>
  );
}

export function DashboardComposer({ onSubmit, buddyName = "Buddy" }: {
  onSubmit: (intent: Intent) => void;
  buddyName?: string;
}) {
  const [tab, setTab] = useState<"voice" | "text">("voice");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const phraseIdx = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [text, setText] = useState("");

  function clearTimers() {
    timers.current.forEach(t => clearTimeout(t));
    timers.current = [];
  }
  useEffect(() => () => clearTimers(), []);

  function startRecording() {
    clearTimers();
    setIntent(null);
    setTranscript("");
    setRecording(true);
    const phrase = VOICE_PHRASES[phraseIdx.current % VOICE_PHRASES.length];
    phraseIdx.current += 1;
    const words = phrase.split(" ");
    let acc = "";
    words.forEach((w, i) => {
      timers.current.push(setTimeout(() => {
        acc = acc ? acc + " " + w : w;
        setTranscript(acc);
      }, 180 + i * 220));
    });
  }

  function stopRecording() {
    clearTimers();
    setRecording(false);
    const final = transcript;
    if (final) {
      setTimeout(() => {
        const parsed = parseIntent(final);
        if (parsed) setIntent(parsed);
      }, 250);
    }
  }

  function submitText() {
    const t = text.trim();
    if (!t) return;
    const parsed = parseIntent(t);
    if (parsed) { setIntent(parsed); setTranscript(t); }
  }

  const suggestions = [
    "Buy $20 SUI if it drops 5%",
    "Sell $10 ETH when it hits $4000",
    "Buy $5 BTC every day",
    `Stop ${buddyName}`,
  ];

  return (
    <div className="composer">
      <div className="tabs" role="tablist">
        <button className={tab === "voice" ? "on" : ""} onClick={() => setTab("voice")}>🎙️ Say it</button>
        <button className={tab === "text" ? "on" : ""} onClick={() => setTab("text")}>⌨️ Type it</button>
      </div>

      {tab === "voice" && (
        <div className="voice-stage">
          <div
            className={`mic ${recording ? "recording" : ""}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={() => recording && stopRecording()}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            role="button"
            aria-label="Hold to record"
          >
            <span className="pulse" />
            <span className="pulse p2" />
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="9" y="3" width="6" height="12" rx="3" fill="#1f1a24" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="#1f1a24" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          {recording ? (
            <>
              <div className="waveform">
                <span /><span /><span /><span /><span /><span /><span />
              </div>
              <div className="transcript">{transcript || "Listening…"}{transcript && <span className="caret" />}</div>
            </>
          ) : transcript && !intent ? (
            <div className="mic-hint" style={{ marginTop: 22 }}>
              <div className="transcript" style={{ marginTop: 0 }}>&ldquo;{transcript}&rdquo;</div>
              <div style={{ marginTop: 8 }}>thinking…</div>
            </div>
          ) : !intent ? (
            <div className="mic-hint">
              <b>Hold</b> the button and tell {buddyName} what to do.<br />
              <span style={{ opacity: .7 }}>try: &ldquo;buy twenty dollars of SUI if it drops five percent&rdquo;</span>
            </div>
          ) : (
            <div className="mic-hint">
              <div className="transcript" style={{ marginTop: 0 }}>&ldquo;{transcript}&rdquo;</div>
            </div>
          )}
        </div>
      )}

      {tab === "text" && (
        <div className="text-stage">
          <textarea
            className="text-input"
            placeholder={`Tell ${buddyName} what to do… e.g. "buy $20 SUI if it drops 5%"`}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitText(); } }}
            rows={3}
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn coral" onClick={submitText} disabled={!text.trim()}>Read it back to me →</button>
            <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>or press <b>Enter</b></span>
          </div>
          <div>
            <div className="label-sm" style={{ marginBottom: 8 }}>or try one of these</div>
            <div className="suggestions">
              {suggestions.map(s => (
                <button key={s} className="sugg" onClick={() => {
                  setText(s);
                  setTimeout(() => {
                    const p = parseIntent(s);
                    if (p) { setIntent(p); setTranscript(s); }
                  }, 50);
                }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {intent && (
        <IntentCard
          intent={intent}
          onChange={setIntent}
          onConfirm={() => { onSubmit(intent); setIntent(null); setTranscript(""); setText(""); }}
          onCancel={() => { setIntent(null); setTranscript(""); setText(""); }}
        />
      )}
    </div>
  );
}
