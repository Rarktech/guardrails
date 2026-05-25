"use client";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { generateNonce, generateRandomness } from "@mysten/zklogin";

export interface ZkLoginSession {
  address: string;
  provider: string;
  email?: string;
  name?: string;
  avatar?: string;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const REDIRECT_URI = typeof window !== "undefined"
  ? `${window.location.origin}/auth/callback`
  : "";

export function getGoogleAuthUrl(nonce: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function startZkLogin(): Promise<void> {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("your_google")) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.");
  }
  const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" });
  const { epoch } = await client.getLatestSuiSystemState();
  const maxEpoch = Number(epoch) + 2;
  const ephemeralKP = new Ed25519Keypair();
  const randomness = generateRandomness();
  const nonce = generateNonce(ephemeralKP.getPublicKey(), maxEpoch, randomness);
  // Store state needed to complete the flow after the OAuth redirect
  localStorage.setItem("zk_eph_key", Buffer.from(ephemeralKP.getSecretKey()).toString("hex"));
  localStorage.setItem("zk_randomness", randomness.toString());
  localStorage.setItem("zk_max_epoch", maxEpoch.toString());
  window.location.href = getGoogleAuthUrl(nonce);
}

export function saveSession(session: ZkLoginSession): void {
  try {
    localStorage.setItem("gr_session", JSON.stringify(session));
  } catch {}
}

export function loadSession(): ZkLoginSession | null {
  try {
    const raw = localStorage.getItem("gr_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem("gr_session");
    localStorage.removeItem("gr_buddy");
    localStorage.removeItem("gr_cap_exp");
    localStorage.removeItem("zk_eph_key");
    localStorage.removeItem("zk_randomness");
    localStorage.removeItem("zk_max_epoch");
    localStorage.removeItem("zk_proof");
  } catch {}
}

export function createBypassSession(name = "Demo User"): ZkLoginSession {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  const addr = "0x" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return {
    address: addr,
    provider: "bypass",
    name,
    email: "demo@guardrails.xyz",
    avatar: "🧑",
  };
}
