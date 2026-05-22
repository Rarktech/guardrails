"use client";
import { useState, useEffect, useRef } from "react";
import { shortId } from "@/lib/utils";
import Link from "next/link";

export interface ReceiptItem {
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
}

function copyToClip(text: string, then?: () => void) {
  try {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(then, then);
      return;
    }
  } catch {}
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch {}
  document.body.removeChild(ta);
  then?.();
}

const IconCopy = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
);
const IconExt = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4h6v6" /><path d="M10 14L20 4" />
    <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
  </svg>
);
const IconChev = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const IconLink = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

function Receipt({ item, defaultOpen = false }: { item: ReceiptItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState("");
  const [payloadOpen, setPayloadOpen] = useState(false);

  const flash = (k: string) => { setCopied(k); setTimeout(() => setCopied(""), 1200); };

  const sui = item.txDigest ?? "";
  const wal = item.walrusCid ?? "";
  const explorerUrl = `https://suiscan.xyz/testnet/tx/${sui}`;
  const walrusUrl = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${wal}`;

  return (
    <div className={`rcpt rcpt-${item.kind}${open ? " open" : ""}`}>
      <button className="rcpt-row" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="rcpt-emo">{item.emoji}</span>
        <span className="rcpt-text">{item.text}</span>
        <span className="rcpt-hash mono" title={`tx ${sui}`}>tx·{shortId(sui, 4, 4)}</span>
        <span className="rcpt-time">{item.time}</span>
        <span className="rcpt-badge">{item.badge}</span>
        <span className="rcpt-chev"><IconChev open={open} /></span>
      </button>

      {open && (
        <div className="rcpt-body">
          <div className="rcpt-proofs">
            <div className="proof">
              <div className="proof-head">
                <span className="proof-chip proof-chip-sui">SUI</span>
                <span className="proof-label">transaction digest</span>
              </div>
              <div className="proof-val mono">{sui}</div>
              <div className="proof-acts">
                <button className="proof-btn" onClick={e => { e.stopPropagation(); copyToClip(sui, () => flash("sui")); }}>
                  {copied === "sui" ? <>✓ copied</> : <><IconCopy /> copy</>}
                </button>
                <a className="proof-btn proof-btn-link" href={explorerUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                  <IconExt /> suiscan
                </a>
              </div>
            </div>

            <div className="proof">
              <div className="proof-head">
                <span className="proof-chip proof-chip-wal">WALRUS</span>
                <span className="proof-label">blob CID</span>
              </div>
              <div className="proof-val mono">{wal}</div>
              <div className="proof-acts">
                <button className="proof-btn" onClick={e => { e.stopPropagation(); copyToClip(wal, () => flash("wal")); }}>
                  {copied === "wal" ? <>✓ copied</> : <><IconCopy /> copy</>}
                </button>
                <a className="proof-btn proof-btn-link" href={walrusUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                  <IconExt /> view blob
                </a>
              </div>
            </div>
          </div>

          <div className="rcpt-meta">
            <div className="meta-cell"><div className="meta-k">gas used</div><div className="meta-v mono">{item.gas?.toLocaleString()} MIST</div></div>
            <div className="meta-cell"><div className="meta-k">epoch</div><div className="meta-v mono">{item.epoch}</div></div>
            <div className="meta-cell"><div className="meta-k">checkpoint</div><div className="meta-v mono">{item.checkpoint?.toLocaleString()}</div></div>
            <div className="meta-cell"><div className="meta-k">signer</div><div className="meta-v mono">{item.signer}</div></div>
          </div>

          <button className="rcpt-payload-toggle" onClick={e => { e.stopPropagation(); setPayloadOpen(o => !o); }}>
            <IconChev open={payloadOpen} />
            <span>{payloadOpen ? "Hide" : "Show"} pinned payload</span>
            <span className="rcpt-payload-size mono">{item.payloadBytes ?? 412} B</span>
          </button>
          {payloadOpen && (
            <pre className="rcpt-payload mono">{JSON.stringify(item.payload ?? { v: 1, kind: item.kind, summary: item.text, at: new Date().toISOString() }, null, 2)}</pre>
          )}

          <div className="rcpt-perma">
            <Link className="rcpt-perma-link" href={`/receipt?tx=${sui}`} target="_blank" onClick={e => e.stopPropagation()}>
              <IconLink />
              Open shareable receipt →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function ActivityFeed({ items, buddyName = "Buddy" }: { items: ReceiptItem[]; buddyName?: string }) {
  const lastIdRef = useRef(items[0]?.id);
  const [freshId, setFreshId] = useState<number | null>(null);

  useEffect(() => {
    if (items[0] && items[0].id !== lastIdRef.current) {
      lastIdRef.current = items[0].id;
      setFreshId(items[0].id);
      const h = setTimeout(() => setFreshId(null), 1400);
      return () => clearTimeout(h);
    }
  }, [items]);

  return (
    <div className="card">
      <span className="pip">RECEIPTS</span>
      <h3 className="card-title">What {buddyName} just did</h3>
      <p className="card-sub">Every move signed on Sui · payload pinned to Walrus. Tap a row for proof.</p>
      <div className="feed" style={{ maxHeight: 400, overflowY: "auto" }}>
        {items.length === 0 && (
          <div style={{ color: "var(--ink-soft)", fontSize: 14, padding: 12, textAlign: "center" }}>
            Nothing yet. Tell {buddyName} something on the left →
          </div>
        )}
        {items.map(it => (
          <div key={it.id} className={freshId === it.id ? "rcpt-fresh" : ""}>
            <Receipt item={it} defaultOpen={freshId === it.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
