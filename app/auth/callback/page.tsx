"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtToAddress, getExtendedEphemeralPublicKey } from "@mysten/zklogin";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { saveSession } from "@/lib/zklogin";

type Status = "loading" | "error";

export default function ZkLoginCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleCallback() {
      try {
        // Read JWT from URL fragment (#id_token=...)
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        const jwt = params.get("id_token");
        if (!jwt) throw new Error("No id_token in callback URL.");

        // Restore state saved before the OAuth redirect
        const ephKeyHex = localStorage.getItem("zk_eph_key");
        const randomness = localStorage.getItem("zk_randomness");
        const maxEpoch = localStorage.getItem("zk_max_epoch");
        if (!ephKeyHex || !randomness || !maxEpoch) {
          throw new Error("zkLogin state missing. Please sign in again.");
        }

        // Reconstruct ephemeral keypair
        const secretKeyBytes = Uint8Array.from(
          ephKeyHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
        );
        const ephemeralKP = Ed25519Keypair.fromSecretKey(secretKeyBytes);

        // Derive Sui address from JWT (salt "0" → deterministic address per Google account)
        const address = jwtToAddress(jwt, "0");

        // Get extended ephemeral public key for the prover
        const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
          ephemeralKP.getPublicKey()
        );

        // Call Mysten prover service to generate ZK proof
        const proverResponse = await fetch("https://prover-dev.mystenlabs.com/v1", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jwt,
            extendedEphemeralPublicKey,
            maxEpoch: Number(maxEpoch),
            jwtRandomness: randomness,
            salt: "0",
            keyClaimName: "sub",
          }),
        });

        if (!proverResponse.ok) {
          throw new Error(`Prover error: ${proverResponse.status}`);
        }

        const proof = await proverResponse.json();

        // Store proof for transaction signing
        localStorage.setItem("zk_proof", JSON.stringify(proof));
        localStorage.setItem("zk_address", address);
        localStorage.setItem("zk_max_epoch_val", maxEpoch);

        // Save session and go to onboarding
        saveSession({ address, provider: "google", avatar: "🔑" });
        router.push("/onboarding");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        setStatus("error");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--paper)" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        {status === "loading" ? (
          <>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: "4px solid var(--ink)", borderTopColor: "var(--coral)", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Signing you in…</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>Generating your zero-knowledge proof. This takes a few seconds.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Sign-in failed</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 24 }}>{error}</div>
            <a href="/auth" style={{ display: "inline-block", padding: "12px 24px", background: "var(--ink)", color: "#fff", borderRadius: 14, fontWeight: 700, textDecoration: "none" }}>
              Try again
            </a>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
