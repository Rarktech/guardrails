import Link from "next/link";

const AGENT_CAP_MOVE = `module guardrails::cap {
    use sui::clock::{Self, Clock};
    use sui::event;

    // Every agent holds exactly one of these.
    // Has key + store → it's an owned Sui object.
    public struct AgentCap has key, store {
        id:             UID,
        owner:          address,
        daily_cap:      u64,   // MIST — set by the human at mint time
        spent_today:    u64,   // accumulates each trade
        allowed_venues: vector<address>,  // DeepBook pool whitelist
        reset_epoch:    u64,   // auto-resets at midnight UTC
        personality:    String,
    }

    // Called inside every trade PTB.
    // If this asserts — the whole transaction is rejected by Sui validators.
    // The app cannot override it.
    public fun charge(
        cap:    &mut AgentCap,
        amount: u64,
        venue:  address,
        clock:  &Clock,
    ) {
        // Daily reset
        let today = clock::timestamp_ms(clock) / 86_400_000;
        if (today > cap.reset_epoch) {
            cap.spent_today = 0;
            cap.reset_epoch = today;
        };

        // Venue whitelist check
        assert!(
            vector::contains(&cap.allowed_venues, &venue),
            EVenueNotAllowed  // error code 1
        );

        // Budget check — this is the hard stop
        assert!(
            cap.spent_today + amount <= cap.daily_cap,
            EOverDailyAllowance  // error code 0
        );

        cap.spent_today = cap.spent_today + amount;
    }

    // Burns the cap object — agent can never sign again.
    // The object ceases to exist on-chain. Irreversible.
    public entry fun revoke(cap: AgentCap, _clock: &Clock, ctx: &mut TxContext) {
        assert!(cap.owner == tx_context::sender(ctx), ENotOwner);
        let AgentCap { id, .. } = cap;
        object::delete(id);
        event::emit(CapRevoked { cap_id, owner });
    }
}`;

const AUDIT_LOG_MOVE = `module guardrails::audit {
    // Emitted for every agent decision — on-chain forever.
    public struct ActionRecord has copy, drop {
        cap_id:       ID,
        action:       String,  // "buy" | "sell" | "swap" | "stop"
        amount_usd:   u64,
        venue:        address,
        allowed:      bool,    // false = Guardian blocked it
        walrus_blob:  vector<u8>,  // CID of the full JSON receipt on Walrus
        timestamp_ms: u64,
        signer:       address,
    }

    public entry fun log(
        registry:    &mut ReceiptRegistry,
        cap_id:      ID,
        action:      vector<u8>,
        amount_usd:  u64,
        venue:       address,
        allowed:     bool,
        walrus_blob: vector<u8>,
        clock:       &Clock,
        ctx:         &mut TxContext,
    ) {
        let record = ActionRecord { ... };
        event::emit(record);  // permanent, queryable by package ID
        // Ring-buffer of last 100 entries in shared ReceiptRegistry
        vector::push_back(&mut registry.entries, record);
    }
}`;

function CodeBlock({ code, title }: { code: string; title: string }) {
  return (
    <div style={{ background: "#1a1620", border: "2px solid var(--ink)", borderRadius: 20, overflow: "hidden", marginBottom: 28 }}>
      <div style={{ background: "#2a2332", padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #3d3545" }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#8b8498", fontFamily: "JetBrains Mono, monospace" }}>Move</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#d8d2e0", fontFamily: "JetBrains Mono, monospace" }}>{title}</span>
      </div>
      <pre style={{ margin: 0, padding: "20px 24px", fontSize: "12.5px", lineHeight: 1.7, color: "#d8d2e0", overflowX: "auto", fontFamily: "JetBrains Mono, monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: ".06em", background: color, border: "1.5px solid var(--ink)" }}>
      {label}
    </span>
  );
}

export default function ContractsPage() {
  return (
    <>
      <div className="wrap">
        <nav className="nav">
          <Link href="/" className="brand">
            <span className="brand-mark">G</span>
            <span>Guardrails</span>
          </Link>
          <div className="nav-right">
            <Link href="/dashboard" style={{ color: "var(--ink-soft)", fontWeight: 700, fontSize: 14 }}>← back to dashboard</Link>
          </div>
        </nav>
      </div>

      <main>
        <div className="wrap" style={{ maxWidth: 860, paddingBottom: 80 }}>
          <div style={{ paddingTop: 40, marginBottom: 40 }}>
            <div style={{ display: "inline-block", fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--coral-deep)", marginBottom: 12 }}>
              MOVE SMART CONTRACTS
            </div>
            <h1 style={{ margin: "0 0 16px", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
              The code that enforces your rules
            </h1>
            <p style={{ margin: "0 0 24px", fontSize: 17, color: "var(--ink-soft)", lineHeight: 1.6, maxWidth: 640 }}>
              Guardrails is <b>not</b> a JavaScript safety layer. These two Move modules are what actually
              prevent your agent from overspending. If <code style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 15 }}>charge()</code> asserts,
              the Sui validator rejects the entire transaction — no app-level override is possible.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
              <Badge label="Testnet deployed" color="var(--mint)" />
              <Badge label="Move 2024" color="var(--sky)" />
              <Badge label="DeepBook v3" color="var(--butter)" />
              <Badge label="Walrus receipts" color="var(--rose)" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
              {[
                { icon: "🔒", title: "Hard spend cap", text: "assert!(spent + amount ≤ cap) — not a UI check. Validators enforce it." },
                { icon: "🏛", title: "Venue whitelist", text: "Agent can only hit DeepBook pools you explicitly approved at mint time." },
                { icon: "🔥", title: "Instant revoke", text: "revoke() deletes the UID from the Sui object store. It's gone — no rewind." },
              ].map(f => (
                <div key={f.icon} style={{ background: "#fff", border: "2px solid var(--ink)", borderRadius: 20, padding: "20px 18px", boxShadow: "0 4px 0 rgba(31,26,36,0.9)" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>{f.text}</div>
                </div>
              ))}
            </div>
          </div>

          <h2 style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 22 }}>guardrails::cap — AgentCap</h2>
          <p style={{ margin: "0 0 18px", color: "var(--ink-soft)", fontSize: 15 }}>
            The core policy object. Owned by the human, held by the agent. <code style={{ fontFamily: "JetBrains Mono, monospace" }}>charge()</code> is
            called inside every trade PTB and is the single source of truth for spend limits.
          </p>
          <CodeBlock code={AGENT_CAP_MOVE} title="sources/agent_cap.move" />

          <h2 style={{ margin: "32px 0 12px", fontWeight: 800, fontSize: 22 }}>guardrails::audit — Audit Log</h2>
          <p style={{ margin: "0 0 18px", color: "var(--ink-soft)", fontSize: 15 }}>
            Emits an <code style={{ fontFamily: "JetBrains Mono, monospace" }}>ActionRecord</code> event for every agent decision (allowed or blocked).
            The Walrus <code style={{ fontFamily: "JetBrains Mono, monospace" }}>blob_id</code> field is the CID of the full JSON reasoning payload — anyone
            can fetch it from the Walrus aggregator forever.
          </p>
          <CodeBlock code={AUDIT_LOG_MOVE} title="sources/audit_log.move" />

          <div style={{ background: "var(--ink)", color: "var(--paper)", borderRadius: 24, padding: "28px 32px", marginTop: 40, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Deploy to Sui Testnet</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "14px 18px", lineHeight: 1.8 }}>
              <span style={{ color: "#8b8498" }}># Install Sui CLI first: https://docs.sui.io/guides/developer/getting-started/sui-install</span><br />
              <span style={{ color: "#6fcfa0" }}>sui</span> client switch --env testnet<br />
              <span style={{ color: "#6fcfa0" }}>sui</span> client publish contracts/ --gas-budget 50000000
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              After publishing, drop the package ID into <code style={{ fontFamily: "JetBrains Mono, monospace" }}>.env.local</code> as{" "}
              <code style={{ fontFamily: "JetBrains Mono, monospace" }}>NEXT_PUBLIC_PACKAGE_ID</code> and the app will use real on-chain calls.
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
