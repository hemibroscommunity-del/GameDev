# Brotown Spec — Broadcast Special Attacks to Peers

Make other players see when a player casts a **special attack** (melee special swing and the mana **swipe**), not just a generic swing arc. The remote-render support already exists and is dormant; this spec wires it on across the live code path.

This slots under §16 (server-authority / multiplayer visuals). It is a **client→client visual broadcast** — it does **not** touch the worker and does **not** need a `PRIVILEGED_EVENTS` change (these events flow through the worker's default rebroadcast path).

---

## Part 1: Problem & current state

When a player performs a special attack, peers see only a normal swing — the "this was special" cue (wide gold-haloed arc) never reaches them.

There are **two parallel client code paths** in the repo right now (a refactor-in-progress): the `BroTown.jsx` monolith and the extracted modules (`game/gameLoop.js`, `networking/wsClient.js`, `rendering/systems/entityRenderer.js`). The special-attack wiring is **complete in the monolith but missing in the modules**:

| Concern | Monolith (`BroTown.jsx`) | Extracted modules |
|---|---|---|
| Special-swing **send** | ✅ `BroTown.jsx:11871` sends `player_swing { id, ts, special:true }` | ❌ `gameLoop.js:3315` sends `player_swing { id, ts }` — no `special` |
| Mana **swipe** send | `BroTown.jsx:11796` sends `ability_use {type:'swipe'}` to the worker (mana cost only — no peer visual) | same gap |
| Swing **receive** | ✅ `BroTown.jsx:2858` sets `S.others[id]._swingSpecial = !!payload.special` | ❌ `wsClient.js:482` sets `_swingTs` only |
| Remote special **render** | ✅ `entityRenderer.js:1893-1978` already draws the wide `Math.PI` gold arc when `other._swingSpecial` | (shared — already works once `_swingSpecial` is set) |

The renderer is already done. The gap is purely the **send** (drop the `special` flag) and the **receive** (never store `_swingSpecial`) in the module path.

> **Precondition for the implementer:** confirm which path the production build actually executes (the monolith's inline `connect()`/`channelShim`, or the extracted `wsClient.js`/`gameLoop.js`). `fpsOverlay.js` imports from `wsClient.js`, and `BroTown.jsx` comments reference `wsClient.js` as the active tick handler — strong signal the **modules are live**. Apply the change to the live path; mirror it into the other copy so a future module cutover doesn't regress it.

---

## Part 2: Design

Reuse the existing `player_swing` event; add a boolean `special` to its payload. The melee special already has `S._specialAttack`; the mana swipe sets `S._specialAttack = true` at trigger time too (`BroTown.jsx:11866`), so a single flag covers both.

**Wire contract (unchanged event name, additive field):**

```
broadcast player_swing { id, ts, special?: boolean }   // special defaults falsy = normal swing
```

No new event type, so no worker change and no deny-list entry. Older clients that ignore `special` simply render the normal arc — forward/backward compatible.

### Send

The swing broadcast must carry the **special state of that specific swing**. At the broadcast site, `S._specialAttack` reflects whether the in-progress swing is special.

- **Module path — `gameLoop.js:3315`:** add `special: !!S._specialAttack` to the payload:
  ```js
  if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_swing',
    payload: { id: S.myId, ts: Date.now(), special: !!S._specialAttack } });
  ```
- Confirm the regular-swing path that sets `S._specialAttack = false` (`gameLoop.js:3312`) runs **before** this broadcast for normal swings, so normal swings send `special:false`. (It does today — 3312 precedes 3315.)
- **Mana swipe:** ensure the swipe trigger sets `S._specialAttack = true` for the swing it produces (the monolith does this at `BroTown.jsx:11866`). If the live swipe path produces its own swing/broadcast separately, have it emit `player_swing { special:true }` the same way. The existing `ability_use {type:'swipe'}` send to the worker stays as-is (it is the mana-cost path, orthogonal to the visual).

### Receive

- **Module path — `wsClient.js:479-485`:** store the flag so the renderer can read it:
  ```js
  case 'player_swing': {
    if (payload.id && S.others[payload.id]) {
      S.others[payload.id]._swingTs = Date.now();
      S.others[payload.id]._swingSpecial = !!payload.special;   // ← add
    }
    break;
  }
  ```

### Render

No change required. `entityRenderer.js:1893-1978` already keys off `other._swingSpecial`:
- `oVisualArc = oSwingSpecial ? Math.PI : SWING_FULL_ARC` (wider arc)
- `trailReach = oSwingSpecial ? 84 : 42`
- gold fill `0xffd54a` / glow stroke `0xfff2a8`, thicker stroke, extra outer arc ring.

---

## Part 3: Edge cases

- **Stale flag persistence.** `_swingSpecial` lives on the remote-player object and is only read while `_swingTs` is within `SWING_ANIM_MS`. Because every swing broadcast now sets `_swingSpecial` explicitly (true *or* false), a special swing followed by a normal swing correctly reverts. No separate reset needed as long as the normal-swing send includes `special:false` (it will, via `!!S._specialAttack`).
- **Ranged/staff specials.** These render as `player_projectile` (`gameLoop.js:3300`), not `player_swing`. Out of scope here — if a ranged special needs a distinct peer visual, add a `special` flag to `player_projectile` and a matching branch in the remote-projectile renderer as a follow-up.
- **Batching latency.** `player_swing` is a non-priority broadcast, so it rides the 33 ms input-batch window (`wsClient.js:1344 INPUT_BATCH_WINDOW`). That is fine for a swing cue; do **not** add it to `PRIORITY_EVENTS` (it is cosmetic, not authoritative).
- **Self-echo.** The worker rebroadcasts to all; the receive handler only acts on `S.others[payload.id]`, so the caster never renders a remote arc for itself.

---

## Part 4: Implementation checklist

- [ ] Confirm which networking path the build runs (modules vs. monolith); apply to the live one, mirror to the other.
- [ ] `gameLoop.js:3315` swing broadcast includes `special: !!S._specialAttack`.
- [ ] Verify normal swings send `special:false` (flag reset at `gameLoop.js:3312` precedes the broadcast).
- [ ] Mana-swipe trigger sets `S._specialAttack = true` for its swing so the broadcast carries `special:true`.
- [ ] `wsClient.js` `player_swing` handler sets `S.others[id]._swingSpecial = !!payload.special`.
- [ ] Confirm `entityRenderer.js` remote special-arc branch fires (manual test: two clients, one casts special, the other sees the wide gold arc).
- [ ] No worker change; no `PRIVILEGED_EVENTS` edit.
- [ ] Two-client smoke test: normal swing → thin white arc on peer; special swing → wide gold arc on peer; alternating swings revert correctly.

---

## Cross-references

- **§16** — Server-authority / multiplayer event flow (this is a client→client visual, default rebroadcast path).
- `entityRenderer.js:1893-1978` — existing remote special-swing renderer (the dormant support being switched on).
- `BroTown.jsx:11866-11871`, `BroTown.jsx:2854-2861` — working reference implementation in the monolith to port.
- Companion spec: `smooth-peer-damage-numbers.md` (the other half of "make peers' combat read as smoothly as my own").
