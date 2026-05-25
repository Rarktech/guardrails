"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConnectWallet, useWallets, useCurrentAccount } from "@mysten/dapp-kit";
import { createBypassSession, saveSession, startZkLogin } from "@/lib/zklogin";

type ConnectState = "idle" | "connecting" | "connected" | "error";

export default function AuthPage() {
  const router = useRouter();
  const [state, setState] = useState<ConnectState>("idle");
  const [walletName, setWalletName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingConnect, setPendingConnect] = useState(false);

  const detectedWallets = useWallets();
  const account = useCurrentAccount();
  const { mutate: connectWallet } = useConnectWallet();

  // Redirect when wallet connects (only if we initiated the connection)
  useEffect(() => {
    if (account && pendingConnect) {
      setState("connected");
      saveSession({ address: account.address, provider: walletName });
      const t = setTimeout(() => router.push("/onboarding"), 800);
      return () => clearTimeout(t);
    }
  }, [account, pendingConnect, walletName, router]);

  function connectBrowserWallet(name: string) {
    const wallet = detectedWallets.find(w =>
      w.name === name || w.name.toLowerCase().includes(name.split(" ")[0].toLowerCase())
    );
    if (!wallet) {
      setErrorMsg(`${name} extension not detected. Install it and refresh.`);
      setState("error");
      return;
    }
    setWalletName(name);
    setState("connecting");
    setPendingConnect(true);
    connectWallet({ wallet }, {
      onError: (err) => {
        setState("error");
        setPendingConnect(false);
        setErrorMsg(err.message || "Connection cancelled.");
      },
    });
  }

  async function handleGoogleLogin() {
    setWalletName("Google (zkLogin)");
    setState("connecting");
    try {
      await startZkLogin();
      // page will redirect to Google — no further code runs
    } catch (err: unknown) {
      setState("error");
      const msg = err instanceof Error ? err.message : "Google sign-in failed.";
      setErrorMsg(msg + " Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in Vercel env vars.");
    }
  }

  async function bypassConnect() {
    setState("connecting");
    setWalletName("Demo Mode");
    await new Promise(r => setTimeout(r, 900));
    setState("connected");
    const session = createBypassSession("Demo User");
    saveSession(session);
    setTimeout(() => router.push("/onboarding"), 700);
  }

  const installedNames = detectedWallets.map(w => w.name.toLowerCase());
  function isInstalled(name: string) {
    return installedNames.some(n => n.includes(name.split(" ")[0].toLowerCase()));
  }

  const BROWSER_WALLETS = [
    { name: "Sui Wallet", sub: "Official Sui browser extension", ico: "🌊" },
    { name: "Phantom", sub: "Multi-chain wallet", ico: "👻" },
    { name: "Suiet", sub: "Open-source Sui wallet", ico: "🔷" },
  ];

  return (
    <>
      <div style={{ position: "fixed", borderRadius: "50%", filter: "blur(50px)", opacity: 0.45, pointerEvents: "none", zIndex: 0, background: "var(--coral)", width: 340, height: 340, top: -60, left: -60 }} />
      <div style={{ position: "fixed", borderRadius: "50%", filter: "blur(50px)", opacity: 0.45, pointerEvents: "none", zIndex: 0, background: "var(--mint)", width: 300, height: 300, bottom: -80, right: -40 }} />

      <div className="wrap" style={{ position: "relative", zIndex: 1 }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 0" }}>
          <Link href="/" className="brand">
            <span className="brand-mark">G</span>
            <span>Guardrails</span>
          </Link>
          <Link href="/" style={{ color: "var(--ink-soft)", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>← Back home</Link>
        </nav>
      </div>

      <main style={{ flex: 1, display: "grid", placeItems: "center", padding: "24px 0 60px", position: "relative", zIndex: 1 }}>
        <div className="wrap">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", maxWidth: 1100, margin: "0 auto" }}>

            <div style={{ padding: 12 }} className="auth-pitch">
              <h2 style={{ fontSize: "clamp(34px, 4.6vw, 50px)", lineHeight: 1.02, margin: "0 0 16px", fontWeight: 800, letterSpacing: "-0.02em" }}>
                Your AI agent.<br />
                <span className="scribble" style={{ color: "var(--coral-deep)" }}>Your rules.</span>
              </h2>
              <p style={{ color: "var(--ink-soft)", fontSize: 17, lineHeight: 1.55, maxWidth: 460 }}>
                Connect once. Guardrails mints an on-chain AgentCap that enforces your spending limits
                directly in Move — no middleman, no app-level checks.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
                {[
                  { ico: "🔒", text: "Spending enforced in Move, not JavaScript" },
                  { ico: "🐋", text: "Every action pinned to Walrus forever" },
                  { ico: "✋", text: "One button stops everything, on-chain" },
                ].map(p => (
                  <div key={p.ico} style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 600 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, border: "2px solid var(--ink)", background: "var(--rose)", display: "grid", placeItems: "center", flexShrink: 0 }}>{p.ico}</div>
                    {p.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ maxWidth: 460, borderRadius: 28, padding: "32px 28px", boxShadow: "8px 8px 0 rgba(31,26,36,0.9)" }}>
              <span className="pip" style={{ position: "absolute", top: -14, left: 28 }}>CONNECT</span>

              <h1 style={{ fontSize: "clamp(28px, 4vw, 38px)", lineHeight: 1.05, margin: "12px 0 8px", fontWeight: 800, letterSpacing: "-0.02em" }}>
                Who are you?
              </h1>
              <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.55, margin: "0 0 24px" }}>
                Pick a wallet to connect. Google sign-in uses <b>zkLogin</b> — no seed phrase needed.
              </p>

              {errorMsg && state === "error" && (
                <div style={{ background: "#fff0f0", border: "2px solid #ff7a59", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#c0392b", marginBottom: 16 }}>
                  {errorMsg}
                  <button onClick={() => { setState("idle"); setErrorMsg(""); }} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: 800, fontSize: 15, lineHeight: 1 }}>×</button>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Google zkLogin */}
                <button className="wallet-btn" onClick={handleGoogleLogin} style={{ opacity: state === "connecting" ? 0.7 : 1 }}>
                  <div className="wallet-ico">🔑</div>
                  <div className="wallet-meta" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>Sign in with Google</span>
                    <span className="wallet-sub" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)" }}>via zkLogin — no seed phrase</span>
                  </div>
                  <span className="wallet-tag hot">HOT</span>
                </button>

                {/* Browser wallets */}
                {BROWSER_WALLETS.map(w => {
                  const installed = isInstalled(w.name);
                  return (
                    <button
                      key={w.name}
                      className="wallet-btn"
                      onClick={() => connectBrowserWallet(w.name)}
                      style={{ opacity: state === "connecting" ? 0.7 : 1 }}
                    >
                      <div className="wallet-ico">{w.ico}</div>
                      <div className="wallet-meta" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>{w.name}</span>
                        <span className="wallet-sub" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)" }}>
                          {installed ? "✓ Detected" : w.sub}
                        </span>
                      </div>
                      {installed && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "var(--mint)", border: "1.5px solid var(--ink)" }}>READY</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="divider" style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 18px", color: "var(--ink-soft)", fontSize: 12, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                <span style={{ flex: 1, height: "1.5px", background: "var(--line)", display: "block" }} />
                or
                <span style={{ flex: 1, height: "1.5px", background: "var(--line)", display: "block" }} />
              </div>

              <button
                className="btn"
                onClick={bypassConnect}
                style={{ width: "100%", justifyContent: "center", borderRadius: 18, padding: "14px 18px" }}
              >
                🚀 Try the demo (no wallet needed)
              </button>

              <p style={{ marginTop: 18, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.55, textAlign: "center" }}>
                By connecting you agree to the <a href="#" style={{ color: "var(--ink)" }}>Terms</a>.
                Guardrails never holds your private keys.
              </p>
            </div>
          </div>
        </div>
      </main>

      {state !== "idle" && state !== "error" && (
        <div className="connecting-overlay">
          <div className="connecting-modal">
            {state === "connecting" ? (
              <div className="spinner" />
            ) : (
              <div className="check-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {state === "connecting" ? `Connecting ${walletName}…` : "Connected!"}
            </div>
            <div style={{ color: "var(--ink-soft)", fontSize: 13, textAlign: "center" }}>
              {state === "connecting" ? "Approve in your wallet" : "Redirecting to setup…"}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 880px) {
          .auth-pitch { display: none; }
        }
      `}</style>
    </>
  );
}
