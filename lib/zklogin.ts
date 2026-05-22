"use client";

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

export function generateNonce(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
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
