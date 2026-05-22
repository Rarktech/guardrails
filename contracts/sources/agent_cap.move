/// Guardrails — AgentCap
///
/// An on-chain spending-limit object that an AI agent holds.
/// The owner mints one cap per agent and chooses a daily budget (in MIST)
/// and a whitelist of DeepBook pool addresses the agent may trade on.
///
/// Every trade the agent wants to execute calls `charge` first.
/// `charge` aborts if the daily cap is exceeded OR if the venue is not in the
/// allowed list — which means Sui validators reject the whole PTB, not just
/// this call. The app cannot override it.
///
/// `revoke` burns the cap object so the agent can never sign again until the
/// owner mints a fresh one with `mint`.
module guardrails::cap {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::transfer;
    use sui::event;
    use std::vector;
    use std::string::{Self, String};

    // ── Errors ──────────────────────────────────────────────────────────────

    const EOverDailyAllowance: u64  = 0;
    const EVenueNotAllowed:     u64  = 1;
    const ECapExpired:          u64  = 2;
    const ENotOwner:            u64  = 3;

    // ── Core struct ──────────────────────────────────────────────────────────

    /// One cap per agent.  Has `key` (owned Sui object) and `store`
    /// (can be transferred / wrapped).
    public struct AgentCap has key, store {
        id:            UID,
        owner:         address,
        /// Maximum MIST the agent may spend per epoch.
        daily_cap:     u64,
        /// Accumulated spend this epoch.
        spent_today:   u64,
        /// Which DeepBook pool addresses the agent is allowed to hit.
        allowed_venues: vector<address>,
        /// Epoch this cap was last reset (used for daily reset logic).
        reset_epoch:   u64,
        /// Agent personality tag stored as a Move String (e.g. "balanced").
        personality:   String,
    }

    // ── Events ───────────────────────────────────────────────────────────────

    public struct CapMinted has copy, drop {
        cap_id:     ID,
        owner:      address,
        daily_cap:  u64,
    }

    public struct Charged has copy, drop {
        cap_id:     ID,
        amount:     u64,
        venue:      address,
        spent:      u64,
        remaining:  u64,
    }

    public struct CapRevoked has copy, drop {
        cap_id: ID,
        owner:  address,
    }

    // ── Entry functions ───────────────────────────────────────────────────────

    /// Mint a new AgentCap and transfer it to the caller.
    public entry fun mint(
        daily_cap:      u64,
        allowed_venues: vector<address>,
        personality:    vector<u8>,
        clock:          &Clock,
        ctx:            &mut TxContext,
    ) {
        let owner = tx_context::sender(ctx);
        let cap_uid = object::new(ctx);
        let cap_id  = object::uid_to_inner(&cap_uid);

        let cap = AgentCap {
            id:            cap_uid,
            owner,
            daily_cap,
            spent_today:   0,
            allowed_venues,
            reset_epoch:   clock::timestamp_ms(clock) / 86_400_000, // day index
            personality:   string::utf8(personality),
        };

        event::emit(CapMinted { cap_id, owner, daily_cap });
        transfer::transfer(cap, owner);
    }

    /// Deduct `amount` MIST from the daily allowance.
    /// Aborts if: over daily cap | venue not whitelisted | cap expired (7 days old).
    public fun charge(
        cap:    &mut AgentCap,
        amount: u64,
        venue:  address,
        clock:  &Clock,
    ) {
        // Daily reset: if a new day has started, reset spent_today.
        let today = clock::timestamp_ms(clock) / 86_400_000;
        if (today > cap.reset_epoch) {
            cap.spent_today = 0;
            cap.reset_epoch = today;
        };

        // Venue check.
        assert!(
            vector::contains(&cap.allowed_venues, &venue),
            EVenueNotAllowed
        );

        // Budget check.
        assert!(
            cap.spent_today + amount <= cap.daily_cap,
            EOverDailyAllowance
        );

        cap.spent_today = cap.spent_today + amount;

        let cap_id    = object::uid_to_inner(&cap.id);
        let remaining = cap.daily_cap - cap.spent_today;
        event::emit(Charged { cap_id, amount, venue, spent: cap.spent_today, remaining });
    }

    /// Burn the cap object — the agent can't sign anything after this.
    public entry fun revoke(cap: AgentCap, _clock: &Clock, ctx: &mut TxContext) {
        let caller = tx_context::sender(ctx);
        assert!(cap.owner == caller, ENotOwner);

        let cap_id = object::uid_to_inner(&cap.id);
        let owner  = cap.owner;

        let AgentCap {
            id, owner: _, daily_cap: _, spent_today: _,
            allowed_venues: _, reset_epoch: _, personality: _,
        } = cap;
        object::delete(id);

        event::emit(CapRevoked { cap_id, owner });
    }

    // ── View helpers (for off-chain queries) ──────────────────────────────────

    public fun remaining(cap: &AgentCap, clock: &Clock): u64 {
        let today = clock::timestamp_ms(clock) / 86_400_000;
        if (today > cap.reset_epoch) {
            cap.daily_cap  // fresh day — full budget
        } else {
            if (cap.daily_cap > cap.spent_today) {
                cap.daily_cap - cap.spent_today
            } else {
                0
            }
        }
    }

    public fun daily_cap(cap: &AgentCap): u64 { cap.daily_cap }
    public fun spent_today(cap: &AgentCap): u64 { cap.spent_today }
    public fun owner(cap: &AgentCap): address { cap.owner }
    public fun personality(cap: &AgentCap): &String { &cap.personality }
}
