# Cooking — pan minigame, server validation & the physics floor

Status: SHIPPED (v2.3.1104 rate limit; v2.3.1146 anti-bot; v2.3.1166
extraction into `server/src/cooking.js`; v2.3.1167 physics floor).

## The mechanic (client)

Cooking a raw fish is a **timing minigame**, not a dice roll:

1. Player selects a raw `fish_*` at a campfire. `startExtraction`
   (`src/game/lifeSkillRewards.js`) opens a window after
   `computeOpenDelay(cookingLevel, fishTier)` ms — the same
   skill-vs-tier curve every gather skill uses (base 4000ms, +1200ms
   per tier level above skill, −250ms per level below, clamped to
   [2000, 10000], ±15% jitter).
2. Flip-swipe while the window is open → **cooked**
   (`applyCookingResult(…, 'cooked')`).
3. Window closes without a flip → **burnt** (BroTown.jsx extraction
   tick: "never flipped in time → the fish burns").

The client then sends `cook_request { fishKey, kind, taps, swipeFp? }`
and renders optimistically; the server's `player_state` echo is
authoritative (rule-20 tiebreaker).

## Server handling (`server/src/cooking.js` → `_handleCookRequest`)

Checks in order, every rejection dropping the request WITHOUT
consuming the fish and echoing `player_state` to snap the client back:

1. `fishKey` must be a `fish_*` string.
2. **Rate limit** (v2.3.1104): 20 cooks per rolling minute
   (`_cookRateOk`, in-memory `ps._cookHistory`).
3. **Anti-bot** (v2.3.1146): `_botfpOnCook` hourly cap + flip-gesture
   fingerprint replay/presence bookkeeping (botfp.js, caps-gated).
4. **Physics floor** (v2.3.1167): consecutive cooks must be at least
   `_computeOpenDelayBase(cookingLevel, fishTier) × (1 − EXTRACT_JITTER)`
   ms apart — the fastest a legitimate minigame can possibly finish.
   `ps._lastCookAt` is in-memory only (like `_lastGambleAt`, NOT in the
   `_saveRpg` field list), so the first cook after a join/deploy is
   always allowed; cycling the connection to reset the anchor buys at
   most one instant cook per reconnect, and the persisted
   `_cookHistory` rate limit still binds at 20/min.
5. Player must hold the raw fish; exactly one is consumed.
6. `kind === 'cooked'` mints `cooked_<fishKey>` +8 cooking XP;
   anything else mints `burnt_dust`.

## Why the server does NOT roll the outcome

Handoff item L suggested closing the `kind` trust gap. A server-side
skill-based roll was considered and rejected: the real outcome is
**player timing**, so server RNG would burn fish for players who
flipped correctly — a gameplay regression worse than the cheat it
closes. The remaining trust in `kind` is bounded: a forger who claims
`cooked` every time gains at most the delta between their real flip
accuracy and 100%, at a cadence capped by the physics floor + rate
limit + botfp hourly cap.

## Future work — full outcome validation (`caps.cookSim`)

To validate the flip itself the server needs to observe the window:
a `cook_start` handshake (mirroring `extraction_start`, which cooking
deliberately skips today — v2.3.853) would let the server stamp the
window open/close times and verify the `cook_request` arrival falls
inside the open window for `cooked` / after close for `burnt`.
Requires a client change, so it must ship caps-gated
(`state_sync.caps.cookSim`) with the v2.3.694 `taps` posture: old
workers tolerate the extra message, old clients keep the floor-only
validation.

## Tests

`server/test/lifeskills-economy.test.mjs` §3/§3a: consume-exactly-one,
cooked/burnt minting, rate-limit drop, floor drop (instant + 1s gap),
full-window acceptance.
