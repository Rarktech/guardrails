"use client";
import { useMemo } from "react";
import { shortId, suiDigest, walrusBlob } from "@/lib/utils";
import { ASSET_EMOJI, type Condition, type Intent } from "./DashboardComposer";

const ORACLE_PRICES: Record<string, { px: number }> = {
  SUI: { px: 4.18 }, ETH: { px: 3812.40 }, BTC: { px: 67240 }, SOL: { px: 174.20 }, USDC: { px: 1.00 },
};

function ruleObjectId(seed: number) {
  const alpha = "0123456789abcdef";
  let s = (seed * 2654435761) >>> 0;
  let out = "0x";
  for (let i = 0; i < 62; i++) {
    s += 0x6d2b79f5; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    out += alpha[((t ^ (t >>> 14)) >>> 0) % alpha.length];
  }
  return out;
}

function timeAgo(ms: number) {
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.round(d / 60)}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}

function nextRunFor(unit: string) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  if (unit === "week") while (next.getDay() !== 1) next.setDate(next.getDate() + 1);
  return next;
}

function untilStr(target: Date) {
  const d = (target.getTime() - Date.now()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `in ${Math.round(d / 60)}m`;
  if (d < 86400) return `in ${Math.round(d / 3600)}h`;
  return `in ${Math.round(d / 86400)}d`;
}

function conditionText(c?: Condition | null) {
  if (!c) return "right now";
  if (c.type === "now") return "right now";
  if (c.type === "dip") return `if it drops ${c.pct}%`;
  if (c.type === "above") return `when it hits $${c.value?.toLocaleString()}`;
  if (c.type === "schedule") return `every ${c.unit}`;
  return "right now";
}

export interface Rule {
  id: number;
  intent: Intent;
  status: "armed" | "paused" | "cancelled";
  objectId?: string;
  txDigest?: string;
  walrusCid?: string;
  armedAt?: number;
  startPrice?: number;
}

export function withRuleProofs(rule: Omit<Rule, "objectId" | "txDigest" | "walrusCid" | "armedAt"> & Partial<Rule>): Rule {
  const seed = ((rule.id * 16807) >>> 0);
  const { objectId, txDigest, walrusCid, armedAt, status, ...rest } = rule;
  return {
    objectId: objectId ?? ruleObjectId(seed),
    txDigest: txDigest ?? suiDigest(seed + 1),
    walrusCid: walrusCid ?? walrusBlob(seed + 2),
    armedAt: armedAt ?? Date.now(),
    status: status ?? "armed",
    ...rest,
  } as Rule;
}

const PauseI = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
    <rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);
const PlayI = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M7 5l12 7-12 7z" /></svg>
);
const XI = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

type TrigMeta =
  | { kind: "price"; asset: string; side: string; start: number; target: number; current: number; progress: number; label: string }
  | { kind: "schedule"; unit: string; nextRun: Date };

function triggerMeta(rule: Rule): TrigMeta | null {
  const cond = rule.intent.condition;
  if (!cond) return null;
  const asset = rule.intent.action === "Buy" ? rule.intent.asset : (rule.intent.swapTo ?? rule.intent.asset);
  const live = ORACLE_PRICES[asset ?? "SUI"] ?? { px: 1.0 };

  if (cond.type === "dip" && cond.pct !== undefined) {
    const start = rule.startPrice ?? live.px;
    const tgt = start * (1 - cond.pct / 100);
    const span = start - tgt;
    const moved = Math.max(0, Math.min(span, start - live.px));
    return { kind: "price", asset: asset ?? "SUI", side: "below", start, target: tgt, current: live.px, progress: span > 0 ? moved / span : 0, label: `drop ${cond.pct}%` };
  }
  if (cond.type === "above" && cond.value !== undefined) {
    const start = rule.startPrice ?? live.px;
    const tgt = cond.value;
    const span = tgt - start;
    const moved = Math.max(0, Math.min(span, live.px - start));
    return { kind: "price", asset: asset ?? "SUI", side: "above", start, target: tgt, current: live.px, progress: span > 0 ? moved / span : 0, label: `≥ $${tgt.toLocaleString()}` };
  }
  if (cond.type === "schedule" && cond.unit) {
    return { kind: "schedule", unit: cond.unit, nextRun: nextRunFor(cond.unit) };
  }
  return null;
}

function PriceBar({ meta }: { meta: Extract<TrigMeta, { kind: "price" }> }) {
  const pct = Math.round(meta.progress * 100);
  const heat = pct >= 90 ? "hot" : pct >= 50 ? "warm" : "cool";
  return (
    <div className="trig">
      <div className={`trig-bar trig-bar-${heat}`}>
        <div className="trig-bar-fill" style={{ width: `${Math.max(2, pct)}%` }}>
          <span className="trig-bar-dot" />
        </div>
      </div>
      <div className="trig-ends">
        <span className="trig-end">
          <span className="trig-end-k">now</span>
          <span className="trig-end-v mono">${meta.current.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
        </span>
        <span className="trig-progress">{pct < 100 ? <>{pct}% toward trigger</> : <>ready to fire</>}</span>
        <span className="trig-end trig-end-target">
          <span className="trig-end-k">{meta.side === "above" ? "≥" : "≤"} target</span>
          <span className="trig-end-v mono">${meta.target.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
        </span>
      </div>
    </div>
  );
}

function ScheduleRow({ meta }: { meta: Extract<TrigMeta, { kind: "schedule" }> }) {
  const when = meta.nextRun.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
  return (
    <div className="trig trig-sched">
      <div className="trig-sched-ico">⏰</div>
      <div className="trig-sched-text">
        <div className="trig-sched-when">{when}</div>
        <div className="trig-sched-sub">next run · {untilStr(meta.nextRun)} · every {meta.unit}</div>
      </div>
    </div>
  );
}

function RuleRow({ rule, onPause, onResume, onCancel }: {
  rule: Rule;
  onPause: (r: Rule) => void;
  onResume: (r: Rule) => void;
  onCancel: (r: Rule) => void;
}) {
  const meta = useMemo(() => triggerMeta(rule), [rule]);
  const intent = rule.intent;
  const asset = intent.action === "Buy" ? intent.asset : (intent.swapTo ?? intent.asset);
  const emoji = ASSET_EMOJI[asset ?? "SUI"] ?? "💰";
  const isPaused = rule.status === "paused";
  const actionVerb = intent.action === "Buy" ? "buy" : intent.action === "Sell" ? "sell" : "swap";

  return (
    <div className={`rule rule-${rule.status}`}>
      <div className="rule-head">
        <span className="rule-emo">{emoji}</span>
        <div className="rule-summary">
          <div className="rule-trigger">{conditionText(intent.condition)}</div>
          <div className="rule-action">
            → {actionVerb} <b>${intent.amount} {intent.asset}</b>
            {intent.action === "Swap" && intent.swapTo && <> into <b>{intent.swapTo}</b></>}
          </div>
        </div>
        <span className={`rule-status rule-status-${rule.status}`}>
          <span className="dot" />
          {isPaused ? "PAUSED" : "ARMED"}
        </span>
      </div>

      {meta && (
        isPaused
          ? <div className="rule-paused-note">Watching paused — won&apos;t fire until you resume.</div>
          : meta.kind === "price"
            ? <PriceBar meta={meta} />
            : <ScheduleRow meta={meta} />
      )}

      <div className="rule-foot">
        <a className="rule-id mono" href={`https://suiscan.xyz/testnet/object/${rule.objectId}`}
          target="_blank" rel="noopener noreferrer" title={`Rule object · ${rule.objectId}`}>
          {shortId(rule.objectId ?? "", 6, 4)}
        </a>
        <span className="rule-armed">armed {timeAgo(rule.armedAt ?? Date.now())}</span>
        <span className="rule-foot-spacer" />
        {isPaused ? (
          <button className="rule-btn rule-btn-resume" onClick={() => onResume(rule)}><PlayI /> resume</button>
        ) : (
          <button className="rule-btn" onClick={() => onPause(rule)}><PauseI /> pause</button>
        )}
        <button className="rule-btn rule-btn-cancel" onClick={() => onCancel(rule)}><XI /> cancel</button>
      </div>
    </div>
  );
}

export function RulesCard({ rules, buddyName = "Buddy", onPause, onResume, onCancel }: {
  rules: Rule[];
  buddyName?: string;
  onPause: (r: Rule) => void;
  onResume: (r: Rule) => void;
  onCancel: (r: Rule) => void;
}) {
  const armed = rules.filter(r => r.status === "armed").length;
  const paused = rules.filter(r => r.status === "paused").length;

  return (
    <div className="card">
      <span className="pip">ARMED RULES</span>
      <h3 className="card-title">What {buddyName} is watching for</h3>
      <p className="card-sub">
        {rules.length === 0
          ? <>No standing rules. Add one on the left like &ldquo;buy $5 SUI if it drops 10%&rdquo;.</>
          : <>{armed} armed{paused > 0 && <> · {paused} paused</>} · evaluated every block</>
        }
      </p>
      {rules.length > 0 && (
        <div className="rules-list">
          {rules.map(r => (
            <RuleRow key={r.id} rule={r} onPause={onPause} onResume={onResume} onCancel={onCancel} />
          ))}
        </div>
      )}
    </div>
  );
}
