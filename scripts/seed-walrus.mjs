/**
 * Uploads 3 demo audit blobs to Walrus testnet and prints the blob IDs.
 * Run: node scripts/seed-walrus.mjs
 */

const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";

const BLOBS = [
  {
    label: "ok — bought $6 SUI",
    payload: {
      v: 1, kind: "execution",
      venue: "DeepBook v3",
      side: "buy", asset: "SUI", quote: "USDC",
      amountUsd: 6, fillPrice: 1.842, slippageBps: 12,
      reason: "trend_follow:ma_cross_15m",
      signer: "0x7af3b2c1d4e5f60a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
      agentId: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      txDigest: "4xN7wKpYsRm2vQhUaGz9bF8eDcJtL3nP6kBvWfH5jXyq",
      guardianChecks: [
        { key: "cap",  severity: "ok",   title: "Within allowance" },
        { key: "slip", severity: "ok",   title: "Tight slippage" },
        { key: "conc", severity: "ok",   title: "Diversified" },
        { key: "vel",  severity: "ok",   title: "Calm pace" },
      ],
      allowance: { daily: 50, spent: 0, remaining: 50 },
      gasPaidBy: "Guardrails",
      timestamp: "2026-05-22T09:14:02Z",
    },
  },
  {
    label: "blocked — $72 BTC over cap",
    payload: {
      v: 1, kind: "guardian_block",
      rule: "per_tx_cap",
      attempted: { asset: "BTC", amountUsd: 72 },
      cap: 50,
      source: "agent",
      signer: "0x7af3b2c1d4e5f60a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
      agentId: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      txDigest: "9aXjQpRm2vKtL3nWfH5jBvE6cDsR7uN8kPbZyM4xQwLh",
      guardianChecks: [
        { key: "cap",  severity: "block", title: "Over your allowance" },
        { key: "slip", severity: "ok",    title: "Tight slippage" },
        { key: "conc", severity: "ok",    title: "Diversified" },
        { key: "vel",  severity: "ok",    title: "Calm pace" },
      ],
      gasPaidBy: "Guardrails",
      timestamp: "2026-05-22T09:14:31Z",
    },
  },
  {
    label: "ok — bought $4 ETH",
    payload: {
      v: 1, kind: "execution",
      venue: "DeepBook v3",
      side: "buy", asset: "ETH", quote: "USDC",
      amountUsd: 4, fillPrice: 3210.55, slippageBps: 7,
      reason: "momentum:rsi_oversold_4h",
      signer: "0x7af3b2c1d4e5f60a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
      agentId: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      txDigest: "7pBkR3jX9vQa2mKtL3nWfH5jBvE6cDsR7uN8kPbZyM4x",
      guardianChecks: [
        { key: "cap",  severity: "ok", title: "Within allowance" },
        { key: "slip", severity: "ok", title: "Tight slippage" },
        { key: "conc", severity: "ok", title: "Diversified" },
        { key: "vel",  severity: "ok", title: "Calm pace" },
      ],
      allowance: { daily: 50, spent: 6, remaining: 44 },
      gasPaidBy: "Guardrails",
      timestamp: "2026-05-22T09:14:18Z",
    },
  },
];

async function upload(blob) {
  const body = JSON.stringify(blob.payload);
  console.log(`\nUploading: ${blob.label} (${body.length} bytes)…`);
  try {
    const res = await fetch(`${PUBLISHER}/v1/blobs`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const blobId =
      data.newlyCreated?.blobObject?.blobId ??
      data.alreadyCertified?.blobId ??
      null;
    if (!blobId) throw new Error("No blobId in response: " + JSON.stringify(data).slice(0, 200));
    console.log(`  ✓ blobId: ${blobId}`);
    return blobId;
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    return null;
  }
}

const results = [];
for (const blob of BLOBS) {
  const id = await upload(blob);
  results.push({ label: blob.label, blobId: id });
}

console.log("\n\n=== RESULTS ===");
results.forEach((r, i) => {
  console.log(`[${i}] ${r.label}`);
  console.log(`    blobId: ${r.blobId ?? "FAILED"}`);
});

console.log("\n=== PASTE INTO app/page.tsx RECEIPTS[].cid ===");
results.forEach((r, i) => {
  console.log(`  RECEIPTS[${i}].cid = "${r.blobId ?? ""}"`);
});
