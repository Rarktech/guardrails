"use client";
import { useMemo } from "react";

interface Intent {
  action: string; amount?: number; asset?: string; swapTo?: string;
}
interface Ctx {
  allowance?: number; spent?: number; recentCount?: number;
}

const ORACLE_PRICES: Record<string, { px: number; src: string; ageS: number }> = {
  SUI:  { px: 4.18,    src: "Pyth",        ageS: 3 },
  ETH:  { px: 3812.40, src: "Pyth",        ageS: 7 },
  BTC:  { px: 67240,   src: "Pyth",        ageS: 4 },
  SOL:  { px: 174.20,  src: "Switchboard", ageS: 12 },
  USDC: { px: 1.00,    src: "Pyth",        ageS: 2 },
};

const POOL_DEPTH: Record<string, number> = {
  SUI: 82400, ETH: 41200, BTC: 19800, SOL: 6300, USDC: 9999999,
};

const PORTFOLIO: Record<string, number> = {
  SUI: 62, ETH: 18, BTC: 9, SOL: 0, USDC: 41,
};

interface Risk {
  key: string; severity: "ok" | "warn" | "block"; icon: string;
  title: string; detail: string; proof: { label: string; value: string };
  why?: string;
}

function evalRisks(intent: Intent, ctx: Ctx): Risk[] {
  if (!intent || intent.action === "Stop") return [];
  const { allowance = 50, spent = 0, recentCount = 0 } = ctx;
  const target = intent.action === "Buy" ? (intent.asset ?? "SUI") : (intent.swapTo ?? intent.asset ?? "SUI");
  const amt = intent.amount ?? 0;
  const risks: Risk[] = [];

  const remaining = allowance - spent;
  if (amt > remaining) {
    risks.push({ key: "cap", severity: "block", icon: "🔒", title: "Over your allowance",
      detail: `This would spend $${amt} but Buddy only has $${remaining} left today.`,
      proof: { label: "AgentCap remaining", value: `$${remaining} / $${allowance}` },
      why: "Sui will reject this — the AgentCap charge call aborts in Move." });
  } else if (amt > remaining * 0.75) {
    risks.push({ key: "cap", severity: "warn", icon: "🔒", title: "Uses most of your allowance",
      detail: `This spends $${amt} of your remaining $${remaining}.`,
      proof: { label: "After this trade", value: `$${remaining - amt} left` } });
  } else {
    risks.push({ key: "cap", severity: "ok", icon: "🔒", title: "Within allowance",
      detail: `Buddy will have $${remaining - amt} left after this.`,
      proof: { label: "AgentCap", value: `$${remaining}/$${allowance}` } });
  }

  const depth = POOL_DEPTH[target] ?? 10000;
  const impactBps = Math.round((amt / depth) * 10000);
  if (impactBps > 200) {
    risks.push({ key: "slip", severity: "block", icon: "📉", title: "Slippage too high",
      detail: `Estimated price impact ${(impactBps / 100).toFixed(2)}% — pool too thin.`,
      proof: { label: `${target}/USDC depth`, value: `$${depth.toLocaleString()}` },
      why: "The PTB sets min_out at 0.5% — Sui would revert the swap." });
  } else if (impactBps > 50) {
    risks.push({ key: "slip", severity: "warn", icon: "📉", title: "Noticeable price impact",
      detail: `You'll move the ${target} price about ${(impactBps / 100).toFixed(2)}%.`,
      proof: { label: `${target}/USDC depth`, value: `$${depth.toLocaleString()}` } });
  } else {
    risks.push({ key: "slip", severity: "ok", icon: "📉", title: "Tight slippage",
      detail: `Price impact ~${(impactBps / 100).toFixed(2)}%, well under 0.5%.`,
      proof: { label: `${target}/USDC depth`, value: `$${depth.toLocaleString()}` } });
  }

  const totalUSD = Object.values(PORTFOLIO).reduce((a, b) => a + b, 0);
  const targetCur = PORTFOLIO[target] ?? 0;
  const targetNext = targetCur + (intent.action === "Sell" ? -amt : amt);
  const newTotal = intent.action === "Buy" ? totalUSD + amt : totalUSD;
  const newPct = newTotal > 0 ? targetNext / newTotal : 0;
  if (newPct > 0.7) {
    risks.push({ key: "conc", severity: "warn", icon: "📊", title: "Heavy concentration",
      detail: `After this you'd be ${Math.round(newPct * 100)}% ${target}.`,
      proof: { label: `${target} share`, value: `${Math.round((targetCur / totalUSD) * 100)}% → ${Math.round(newPct * 100)}%` } });
  } else {
    risks.push({ key: "conc", severity: "ok", icon: "📊", title: "Diversified",
      detail: `${target} stays at ${Math.round(newPct * 100)}% of portfolio.`,
      proof: { label: `${target} share`, value: `${Math.round(newPct * 100)}%` } });
  }

  if (recentCount >= 8) {
    risks.push({ key: "vel", severity: "warn", icon: "⚡", title: "Buddy's trading fast",
      detail: `${recentCount} trades in the last hour — could be momentum, could be noise.`,
      proof: { label: "Last 60 min", value: `${recentCount} trades` } });
  } else {
    risks.push({ key: "vel", severity: "ok", icon: "⚡", title: "Calm pace",
      detail: `${recentCount} trades in the last hour.`,
      proof: { label: "Last 60 min", value: `${recentCount} trades` } });
  }

  return risks;
}

export function GuardianCard({ intent, ctx }: { intent: Intent; ctx: Ctx }) {
  const risks = useMemo(() => evalRisks(intent, ctx), [intent, ctx]);
  if (!risks.length) return null;

  const blocks = risks.filter(r => r.severity === "block").length;
  const warns  = risks.filter(r => r.severity === "warn").length;
  const headlineSev = blocks > 0 ? "block" : warns > 0 ? "warn" : "ok";
  const oracle = ORACLE_PRICES[intent.action === "Buy" ? (intent.asset ?? "SUI") : (intent.swapTo ?? intent.asset ?? "SUI")];

  return (
    <div className={`guardian guardian-${headlineSev}`}>
      <div className="guardian-head">
        <div className="guardian-badge">
          <span className="guardian-shield">🛡</span>
          <span>Guardian</span>
        </div>
        <div className="guardian-summary">
          {headlineSev === "block" && <><b>{blocks} block{blocks > 1 ? "s" : ""}</b> — Sui would reject this</>}
          {headlineSev === "warn" && <><b>{warns} warning{warns > 1 ? "s" : ""}</b> — review before signing</>}
          {headlineSev === "ok" && <><b>All clear</b> — safe to sign</>}
        </div>
        {oracle && (
          <div className="guardian-oracle mono">
            <span className="dot" />
            {oracle.src} · ${oracle.px.toLocaleString()} · {oracle.ageS}s ago
          </div>
        )}
      </div>

      <div className="guardian-grid">
        {risks.map(r => (
          <div className={`risk risk-${r.severity}`} key={r.key}>
            <div className="risk-head">
              <span className="risk-ico">{r.icon}</span>
              <span className="risk-title">{r.title}</span>
              <span className={`risk-pill risk-pill-${r.severity}`}>
                {r.severity === "block" ? "BLOCK" : r.severity === "warn" ? "WARN" : "OK"}
              </span>
            </div>
            <div className="risk-detail">{r.detail}</div>
            <div className="risk-proof mono">
              <span className="risk-proof-label">{r.proof.label}</span>
              <span className="risk-proof-val">{r.proof.value}</span>
            </div>
            {r.why && <div className="risk-why">{r.why}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export { evalRisks };
export type { Risk, Intent };
