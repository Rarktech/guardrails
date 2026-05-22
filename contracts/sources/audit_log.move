/// Guardrails — Audit Log
///
/// Every time an agent action is evaluated (allowed or blocked), the
/// guardian emits an ActionRecord event and optionally stores a pointer
/// to the full JSON payload on Walrus (blob_id).
///
/// Events are permanent on Sui — anyone can query them by package ID.
/// The Walrus blob_id lets verifiers fetch the full reasoning payload
/// without trusting the app.
module guardrails::audit {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::transfer;
    use sui::event;
    use std::string::{Self, String};
    use std::vector;

    // ── Structs ───────────────────────────────────────────────────────────────

    /// Emitted for every agent decision (allowed or blocked).
    public struct ActionRecord has copy, drop, store {
        /// The AgentCap object that signed (or was checked against).
        cap_id:       ID,
        /// "buy" | "sell" | "swap" | "stop"
        action:       String,
        /// USD amount * 1_000_000 (i.e. same units as AgentCap.daily_cap).
        amount_usd:   u64,
        /// DeepBook pool address targeted (zero if blocked before reaching swap).
        venue:        address,
        /// Whether Sui executed the trade (true) or the Guardian blocked it (false).
        allowed:      bool,
        /// Content-hash of the Walrus blob storing the full JSON payload.
        walrus_blob:  vector<u8>,
        /// Unix ms timestamp.
        timestamp_ms: u64,
        /// Sui address of the agent's ephemeral signer.
        signer:       address,
    }

    /// A shared on-chain index of recent receipts (last 100).
    /// Useful for block explorer queries and for the dashboard to
    /// reconstruct history from chain without Walrus.
    public struct ReceiptRegistry has key {
        id:       UID,
        entries:  vector<ActionRecord>,
        capacity: u64,
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        let registry = ReceiptRegistry {
            id:       object::new(ctx),
            entries:  vector::empty(),
            capacity: 100,
        };
        transfer::share_object(registry);
    }

    // ── Entry ─────────────────────────────────────────────────────────────────

    /// Emit an ActionRecord event and push it to the shared registry.
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
        let record = ActionRecord {
            cap_id,
            action:       string::utf8(action),
            amount_usd,
            venue,
            allowed,
            walrus_blob,
            timestamp_ms: clock::timestamp_ms(clock),
            signer:       tx_context::sender(ctx),
        };

        // Emit for event indexers.
        event::emit(record);

        // Push to ring-buffer (evict oldest when full).
        vector::push_back(&mut registry.entries, record);
        let len = vector::length(&registry.entries);
        if (len > registry.capacity) {
            vector::remove(&mut registry.entries, 0);
        };
    }

    // ── View ──────────────────────────────────────────────────────────────────

    public fun entry_count(registry: &ReceiptRegistry): u64 {
        vector::length(&registry.entries)
    }
}
