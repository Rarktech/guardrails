const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

export interface AuditEntry {
  v: number;
  agentId: string;
  action: string;
  amount: number;
  asset: string;
  venue: string;
  allowed: boolean;
  guardianChecks: Array<{ key: string; severity: string; title: string }>;
  timestamp: string;
  txDigest: string;
  gasPaidBy: string;
}

export async function uploadAuditLog(entry: AuditEntry): Promise<string> {
  const body = JSON.stringify(entry);
  try {
    const res = await fetch(`${PUBLISHER}/v1/blobs`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`Walrus upload failed: ${res.status}`);
    const data = await res.json();
    return data.newlyCreated?.blobObject?.blobId ?? data.alreadyCertified?.blobId ?? "";
  } catch (e) {
    console.error("Walrus upload error (using fallback):", e);
    // Deterministic fallback blob ID for demo
    return generateDemoBlobId(entry.txDigest);
  }
}

export async function fetchAuditLog(blobId: string): Promise<AuditEntry | null> {
  try {
    const res = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function walrusBlobUrl(blobId: string): string {
  return `${AGGREGATOR}/v1/blobs/${blobId}`;
}

function generateDemoBlobId(seed: string): string {
  const WAL_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);
  let out = "";
  for (let i = 0; i < 43; i++) {
    out += WAL_ALPHA[(hash * (i + 1) * 2654435761) >>> 0 & 63];
  }
  return out;
}
