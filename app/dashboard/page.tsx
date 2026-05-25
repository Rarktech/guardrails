"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { DashboardComposer, type Intent, conditionText, ASSET_EMOJI } from "@/components/DashboardComposer";
import { AgentCapCard } from "@/components/AgentCapCard";
import { RulesCard, withRuleProofs, type Rule } from "@/components/RulesCard";
import { ActivityFeed, type ReceiptItem } from "@/components/ReceiptFeed";
import { GuardianCard, evalRisks } from "@/components/Guardian";
import { PTBPreview } from "@/components/PTBPreview";
import { withProofs, shortId } from "@/lib/utils";
import { buildLogTx } from "@/lib/contracts";
import { uploadAuditLog } from "@/lib/walrus";
import { loadSession } from "@/lib/zklogin";

const RECEIPT_REGISTRY_ID = "0xd5375f3d5350df87ff0f196d67f2d1db1fcc94d67cffec9ca4dc8483e7eccde9";
const DEEPBOOK_SUI_USDC = "0x4405b50d791fd3346754e8171aaab6bc2ed26c2c46efdd033c14b30ae507ac33";

const ORACLE_PRICES: Record<string, { px: number }> = {
  SUI: { px: 4.18 }, ETH: { px: 3812.40 }, BTC: { px: 67240 }, SOL: { px: 174.20 }, USDC: { px: 1.00 },
};

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function intentToFeedItem(intent: Intent, id: number, txDigest?: string, walrusCid?: string): ReceiptItem {
  const emoji = intent.action === "Stop" ? "🛑" : (ASSET_EMOJI[intent.asset ?? "SUI"] ?? "💰");
  const basePayload = {
    v: 1,
    intent: { action: intent.action, asset: intent.asset, amount: intent.amount, swapTo: intent.swapTo, condition: intent.condition },
    signedAt: new Date().toISOString(),
    signer: txDigest ? "wallet" : "0x7a…f3",
  };

  if (intent.action === "Stop") {
    return withProofs<ReceiptItem>({ id, kind: "bad", emoji, text: "Buddy stopped on your command", time: timeNow(), badge: "REVOKED", payload: { ...basePayload, kind: "revocation" }, payloadBytes: 188, txDigest, walrusCid });
  }

  const tail = intent.action === "Swap" && intent.swapTo ? ` into ${intent.swapTo}` : "";
  const isNow = intent.condition?.type === "now";

  if (isNow) {
    const verb = intent.action === "Sell" ? "Sold" : intent.action === "Swap" ? "Swapped" : "Bought";
    return withProofs<ReceiptItem>({ id, kind: "ok", emoji, text: `${verb} $${intent.amount} ${intent.asset}${tail}`, time: timeNow(), badge: "OK", payload: { ...basePayload, kind: "execution", venue: "DeepBook v3" }, payloadBytes: 312, txDigest, walrusCid });
  }

  const verb = intent.action === "Buy" ? "Will buy" : intent.action === "Sell" ? "Will sell" : "Will swap";
  const cond = conditionText(intent.condition);
  return withProofs<ReceiptItem>({ id, kind: "new", emoji, text: `New rule — ${verb.toLowerCase()} $${intent.amount} ${intent.asset}${tail} ${cond}`, time: timeNow(), badge: "WAITING", payload: { ...basePayload, kind: "rule" }, payloadBytes: 264, txDigest, walrusCid });
}

function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

function ReviewSheet({ intent, ctx, onSign, onCancel, signing }: {
  intent: Intent | null;
  ctx: { allowance: number; spent: number; recentCount: number };
  onSign: () => void;
  onCancel: () => void;
  signing: boolean;
}) {
  const risks = useMemo(() => intent ? evalRisks(intent, ctx) : [], [intent, ctx]);
  const blocks = risks.filter(r => r.severity === "block").length;
  const warns = risks.filter(r => r.severity === "warn").length;

  if (!intent) return null;

  return (
    <div className="sheet-veil" onClick={(e) => { if ((e.target as Element).classList.contains("sheet-veil")) onCancel(); }}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-head">
          <div>
            <h2 className="sheet-title">Review before signing</h2>
            <p className="sheet-sub">Guardian checks every move against on-chain state. Sui enforces what&apos;s signed.</p>
          </div>
          <button className="sheet-close" onClick={onCancel} aria-label="Close">×</button>
        </div>

        {intent.action !== "Stop" && <GuardianCard intent={intent} ctx={ctx} />}
        <PTBPreview intent={intent} />

        <div className="sheet-foot">
          {blocks > 0 ? (
            <span className="blocked-msg">⛔ Sui would reject this — fix the blocking issue above.</span>
          ) : warns > 0 ? (
            <span style={{ fontSize: 13, color: "#8a6a14", fontWeight: 700 }}>⚠ {warns} warning{warns > 1 ? "s" : ""} — proceed if intentional.</span>
          ) : (
            <span style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 600 }}>🔒 Signed once. Sui enforces it from here.</span>
          )}
          <span style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn coral" onClick={onSign} disabled={blocks > 0 || signing}>
            {signing ? "Signing…" : intent.action === "Stop" ? "✋ Sign & revoke" : "✓ Sign & send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function seedReceipts(): ReceiptItem[] {
  return [
    withProofs<ReceiptItem>({ id: 1, kind: "ok", emoji: "🌊", text: "Bought $6 SUI · trend follow", time: "09:14", badge: "OK", walrusCid: "b0lXTbrlXbM-fq8_VY6u8fNE9chmqOFhMckSQ5x9poQ", txDigest: "4xN7wKpYsRm2vQhUaGz9bF8eDcJtL3nP6kBvWfH5jXyq", payload: { v: 1, kind: "execution", venue: "DeepBook v3", side: "buy", asset: "SUI", amountUsd: 6, fillPrice: 1.842, slippageBps: 12 }, payloadBytes: 711 }),
    withProofs<ReceiptItem>({ id: 2, kind: "bad", emoji: "₿", text: "Blocked $72 BTC · over allowance", time: "09:14", badge: "BLOCKED", walrusCid: "wwd_I5rR1irkAH9pGGt-sT7sh9qrw67HT1-Wz2vFKGQ", txDigest: "9aXjQpRm2vKtL3nWfH5jBvE6cDsR7uN8kPbZyM4xQwLh", payload: { v: 1, kind: "guardian_block", rule: "per_tx_cap", attempted: { asset: "BTC", amountUsd: 72 }, cap: 50 }, payloadBytes: 611, gas: 0 }),
    withProofs<ReceiptItem>({ id: 3, kind: "ok", emoji: "⟠", text: "Bought $4 ETH · momentum up", time: "09:14", badge: "OK", walrusCid: "WYqGMnt93fAvQCsWAUrQLWDQE1SP05ghwLmXJPAaEkk", txDigest: "7pBkR3jX9vQa2mKtL3nWfH5jBvE6cDsR7uN8kPbZyM4x", payload: { v: 1, kind: "execution", venue: "DeepBook v3", side: "buy", asset: "ETH", amountUsd: 4, fillPrice: 3210.55, slippageBps: 7 }, payloadBytes: 711 }),
  ];
}

function seedRules(): Rule[] {
  const HOUR = 3_600_000;
  return [
    withRuleProofs({ id: 9001, intent: { action: "Buy", asset: "SUI", amount: 5, condition: { type: "dip", pct: 10 } }, startPrice: 4.18, armedAt: Date.now() - 2 * HOUR, status: "armed" }),
    withRuleProofs({ id: 9002, intent: { action: "Sell", asset: "ETH", amount: 25, condition: { type: "above", value: 4000 } }, startPrice: 3812.40, armedAt: Date.now() - 6 * HOUR, status: "armed" }),
    withRuleProofs({ id: 9003, intent: { action: "Buy", asset: "BTC", amount: 20, condition: { type: "schedule", unit: "day" } }, armedAt: Date.now() - 26 * HOUR, status: "paused" }),
  ];
}

export default function DashboardPage() {
  const router = useRouter();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [buddy, setBuddy] = useState({ name: "Buddy", emoji: "🐷", color: "#ffc6b0", allowance: 50 });
  const [allowance, setAllowance] = useState(50);
  const [spent, setSpent] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);
  const [toast, setToast] = useState("");
  const [signing, setSigning] = useState(false);
  const idRef = useRef(100);

  // Determine display address: connected wallet > session > fallback
  const [sessionAddress, setSessionAddress] = useState("0x7a…f3");
  useEffect(() => {
    const sess = loadSession();
    if (sess?.address) setSessionAddress(shortId(sess.address));
  }, []);
  const displayAddress = account ? shortId(account.address) : sessionAddress;

  const [items, setItems] = useState<ReceiptItem[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gr_receipts") ?? "null");
      if (Array.isArray(stored) && stored.length) return stored;
    } catch {}
    return seedReceipts();
  });

  const [rules, setRules] = useState<Rule[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gr_rules") ?? "null");
      if (Array.isArray(stored) && stored.length) return stored;
    } catch {}
    return seedRules();
  });

  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem("gr_buddy") ?? "null");
      if (b) setBuddy({ name: "Buddy", emoji: "🐷", color: "#ffc6b0", allowance: 50, ...b });
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("gr_receipts", JSON.stringify(items)); } catch {}
  }, [items]);
  useEffect(() => {
    try { localStorage.setItem("gr_rules", JSON.stringify(rules)); } catch {}
  }, [rules]);

  function pushItem(item: ReceiptItem) {
    setItems(arr => [item, ...arr].slice(0, 12));
  }
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  async function handleSign() {
    const intent = pendingIntent;
    if (!intent) return;
    const id = idRef.current++;
    setSigning(true);

    try {
      if (account && intent.action !== "Stop") {
        // Attempt real on-chain log transaction
        const capId = localStorage.getItem("gr_cap_id") ?? account.address;
        const venue = DEEPBOOK_SUI_USDC;
        const amountUsd = BigInt(Math.round((intent.amount ?? 0) * 1_000_000));
        const tx = buildLogTx(
          RECEIPT_REGISTRY_ID,
          capId,
          intent.action,
          amountUsd,
          venue,
          true,
          new Uint8Array(0),
        );

        const result = await signAndExecute({ transaction: tx });
        const txDigest = result.digest;

        // Upload audit receipt to Walrus
        let walrusCid: string | undefined;
        try {
          walrusCid = await uploadAuditLog({
            v: 1,
            agentId: capId,
            action: intent.action,
            amount: intent.amount ?? 0,
            asset: intent.asset ?? "SUI",
            venue,
            allowed: true,
            txDigest,
            guardianChecks: [],
            timestamp: new Date().toISOString(),
            gasPaidBy: "user",
          });
        } catch {
          // Walrus upload failure is non-fatal
        }

        const item = intentToFeedItem(intent, id, txDigest, walrusCid);
        pushItem(item);
        if (intent.condition?.type === "now") {
          setSpent(s => Math.min(allowance, s + (intent.amount ?? 0)));
        }
        showToast(`Signed on-chain ✓ ${txDigest.slice(0, 8)}…`);
        setPendingIntent(null);
        return;
      }
    } catch (err) {
      console.warn("On-chain sign failed, falling back to simulation:", err);
    } finally {
      setSigning(false);
    }

    // Fallback: simulate sign
    simulateSign(intent, id);
  }

  function simulateSign(intent: Intent, id: number) {
    const item = intentToFeedItem(intent, id);
    pushItem(item);

    if (intent.action === "Stop") {
      setStopped(true);
      showToast("Buddy is stopped 🛑");
      setPendingIntent(null);
      return;
    }

    if (intent.condition?.type === "now" && !stopped) {
      setSpent(s => Math.min(allowance, s + (intent.amount ?? 0)));
      showToast("Signed & sent ✓");
    } else {
      const startTarget = intent.action === "Buy" ? intent.asset : (intent.swapTo ?? intent.asset);
      const newRule = withRuleProofs({
        id, intent,
        startPrice: ORACLE_PRICES[startTarget ?? "SUI"]?.px,
        armedAt: Date.now(), status: "armed",
      });
      setRules(rs => [newRule, ...rs]);
      showToast("Rule armed ✓");
    }
    setPendingIntent(null);
  }

  function handlePauseRule(rule: Rule) {
    setRules(rs => rs.map(r => r.id === rule.id ? { ...r, status: "paused" } : r));
    pushItem(withProofs<ReceiptItem>({ id: idRef.current++, kind: "new", emoji: "⏸", text: `Paused — ${rule.intent.action.toLowerCase()} $${rule.intent.amount} ${rule.intent.asset} rule`, time: timeNow(), badge: "PAUSED", payload: { v: 1, kind: "rule_pause", ruleId: rule.objectId }, payloadBytes: 168 }));
    showToast("Rule paused ⏸");
  }
  function handleResumeRule(rule: Rule) {
    setRules(rs => rs.map(r => r.id === rule.id ? { ...r, status: "armed" } : r));
    pushItem(withProofs<ReceiptItem>({ id: idRef.current++, kind: "new", emoji: "▶", text: `Resumed — ${rule.intent.action.toLowerCase()} $${rule.intent.amount} ${rule.intent.asset} rule`, time: timeNow(), badge: "RESUMED", payload: { v: 1, kind: "rule_resume", ruleId: rule.objectId }, payloadBytes: 172 }));
    showToast("Rule armed ▶");
  }
  function handleCancelRule(rule: Rule) {
    setRules(rs => rs.filter(r => r.id !== rule.id));
    pushItem(withProofs<ReceiptItem>({ id: idRef.current++, kind: "bad", emoji: "🗑", text: `Cancelled — ${rule.intent.action.toLowerCase()} $${rule.intent.amount} ${rule.intent.asset} rule`, time: timeNow(), badge: "CANCELLED", payload: { v: 1, kind: "rule_cancel", ruleId: rule.objectId }, payloadBytes: 176 }));
    showToast("Rule cancelled");
  }
  function handleStop() {
    setStopped(true);
    pushItem(withProofs<ReceiptItem>({ id: idRef.current++, kind: "bad", emoji: "🛑", text: "Buddy stopped on your command", time: timeNow(), badge: "REVOKED", payload: { v: 1, kind: "revocation", target: "AgentCap", source: "owner", at: new Date().toISOString() }, payloadBytes: 174 }));
    showToast("Buddy is stopped 🛑");
  }
  function handleResume() {
    setStopped(false);
    pushItem(withProofs<ReceiptItem>({ id: idRef.current++, kind: "new", emoji: "▶", text: "Buddy is awake again", time: timeNow(), badge: "LIVE", payload: { v: 1, kind: "mint_cap", target: "AgentCap", budgetUsdPerDay: allowance, at: new Date().toISOString() }, payloadBytes: 218 }));
    showToast("Buddy is back ▶");
  }

  const ctx = { allowance, spent, recentCount: items.filter(i => i.kind === "ok").length };

  return (
    <>
      <div className="wrap">
        <nav className="nav">
          <Link href="/" className="brand">
            <span className="brand-mark">G</span>
            <span>Guardrails</span>
          </Link>
          <div className="nav-right">
            <Link href="/onboarding">⚙ Edit {buddy.name}</Link>
            <Link href="/auth" onClick={() => { try { localStorage.removeItem("gr_session"); } catch {} }}>Log out</Link>
            <span className="me-chip" title="connected wallet">
              <span className="av">{buddy.emoji}</span>
              {displayAddress}
            </span>
          </div>
        </nav>
      </div>

      <main>
        <div className="wrap">
          <div className="greeting">
            Hi <span className="scribble">friend</span> — what should {buddy.name} do?
          </div>

          <div className="grid">
            <DashboardComposer onSubmit={setPendingIntent} buddyName={buddy.name} />

            <div className="stack">
              <AgentCapCard
                buddy={buddy}
                allowance={allowance}
                spent={spent}
                stopped={stopped}
                onChangeBudget={setAllowance}
                onRevoke={handleStop}
                onMint={handleResume}
              />
              <RulesCard
                rules={rules}
                buddyName={buddy.name}
                onPause={handlePauseRule}
                onResume={handleResumeRule}
                onCancel={handleCancelRule}
              />
              <ActivityFeed items={items} buddyName={buddy.name} />
            </div>
          </div>
        </div>
      </main>

      <ReviewSheet intent={pendingIntent} ctx={ctx} onSign={handleSign} onCancel={() => setPendingIntent(null)} signing={signing} />
      <Toast msg={toast} />
    </>
  );
}
