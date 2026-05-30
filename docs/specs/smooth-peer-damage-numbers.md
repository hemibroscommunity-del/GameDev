# Brotown Spec — Smooth Peer Damage Numbers

Make the damage numbers from **other players' fights** appear at a natural, live cadence instead of arriving in a clumped "array of numbers all at once." Target feel: as smooth as the numbers a player sees for their **own** hits.

Client-only. The worker already emits combat events at per-tick cadence; no worker change.

---

## Part 1: Problem & diagnosis

**Symptom:** when watching another player fight a monster, several damage numbers pop simultaneously as a vertical column, as if a few seconds of combat replayed at once.

**Root cause — arrival coalescing, not buffering.** Nothing in code holds combat events for seconds:

- Worker flushes its `eventBuffer` every tick (~45 Hz, `brotown-server/src/index.js:4112`); each `monster_hit` ships the tick after the damage lands.
- Client processes a tick's `events` array **immediately** on receive (`wsClient.js:138`) and pushes each floater straight into `S.dmgNumbers` with `ts: Date.now()` (`wsClient.js:507` `monster_hit` handler).

When the watcher's main thread or socket hitches for a moment, several server ticks queue at the transport layer and deliver together in one JS turn. Every floater in that burst gets a near-identical `ts`, and the anti-overlap stacker (`effectsRenderer.js:356-375`, 26 px spacing) lays them out as a column → the "all at once" look.

**Why own numbers feel smooth:** they are spawned one-per-swing at swing time (`gameLoop.js:3581`+), naturally spaced by the swing cooldown — independent of network arrival timing.

**Amplifier — double floaters.** In server-authoritative zones a watcher can get **two** floaters per peer hit:
1. the worker's `monster_hit` (`wsClient.js:507`), and
2. the attacker's `monster_dmg_at` broadcast, which `gameLoop.js:8642` (and the `BroTown.jsx:8642` mirror) fires **regardless** of whether the zone is server-authoritative.

`monster_dmg_at` is only needed for legacy **client-local-AI** zones. In server zones it is redundant noise on top of `monster_hit`.

---

## Part 2: Design

Two independent fixes. Fix B alone removes the double-count; Fix A removes the burst. Ship both.

### Fix A — Display scheduler for peer floaters (the smoothing)

Give **incoming peer** damage numbers a tiny playback buffer, the same way remote **positions** already get one (`wsClient.js:171-178` `_posBuffer`). Decouple *receipt* from *display*: enqueue peer floaters on arrival, then release them at a steady minimum spacing per monster. A burst of 6 numbers arriving together drips out over ~half a second and reads like live combat.

**Scope:** peer numbers only — `attackerId !== S.myId` (for `monster_hit`) and `payload.id !== S.myId` (for `monster_dmg_at`). The local player's own numbers stay **immediate** (unchanged) so self-feedback keeps zero latency.

**Queue model.** Add a release queue keyed by monster:

```
S._peerDmgQueue   = S._peerDmgQueue   || {};  // monsterId -> [ {x,y,text,color,crit,recvTs}, ... ]
S._peerDmgLastRel = S._peerDmgLastRel || {};  // monsterId -> last release timestamp (ms)
```

Use a stable key: `monsterId` when present, else a coarse position bucket (e.g. `Math.round(x/24)+':'+Math.round(y/24)`) for client-local zones where `monster_dmg_at` carries only `x,y`.

**Enqueue** (replaces the direct `S.dmgNumbers.push` for peer entries in the `monster_hit` and `monster_dmg_at` handlers):

```js
function enqueuePeerDamage(S, key, floater) {
  if (!S._peerDmgQueue) S._peerDmgQueue = {};
  var q = (S._peerDmgQueue[key] = S._peerDmgQueue[key] || []);
  floater.recvTs = Date.now();
  q.push(floater);
  // bound growth: collapse the oldest if a monster's queue runs away
  if (q.length > PEER_DMG_QUEUE_CAP) q.splice(0, q.length - PEER_DMG_QUEUE_CAP);
}
```

**Drain** — call once per frame from the render/update loop (natural home: top of `effectsRenderer._updateDamageNumbers(S, now)`, which already runs every frame with `now`):

```js
function _releasePeerDamage(S, now) {
  var Q = S._peerDmgQueue; if (!Q) return;
  var L = S._peerDmgLastRel || (S._peerDmgLastRel = {});
  for (var key in Q) {
    var q = Q[key]; if (!q || !q.length) continue;
    var last = L[key] || 0;
    var head = q[0];
    var held = now - head.recvTs;
    // release if enough spacing has elapsed, OR the entry has waited too long
    if (now - last >= PEER_DMG_MIN_SPACING_MS || held >= PEER_DMG_MAX_HOLD_MS) {
      head.ts = now;                 // fresh start so the float animation begins now
      delete head.recvTs;
      S.dmgNumbers.push(head);
      q.shift();
      L[key] = now;
    }
    if (!q.length) delete Q[key];
  }
}
```

Behavior:
- Steady fire → numbers release ~one per `PEER_DMG_MIN_SPACING_MS`, matching a human attack cadence.
- Burst → the queue absorbs it and drips it out, still bounded by `PEER_DMG_MAX_HOLD_MS` so the watcher never sees combat lag more than that behind reality.
- `PEER_DMG_MAX_HOLD_MS` ensures heavy sustained DPS (release rate < arrival rate) doesn't accumulate an ever-growing backlog — once an entry waits too long it is force-released, and `PEER_DMG_QUEUE_CAP` collapses any runaway.

The monster HP bar / `_hitFlash` / hit particles in the `monster_hit` handler should **still update immediately** on receive — only the floating *number* is scheduled. HP and impact feedback staying instant keeps the fight readable; the number cadence is the only thing being smoothed.

### Fix B — Dedupe the floater source in server zones

Stop the redundant peer floater so each hit yields exactly one number.

- **Preferred:** at the `monster_dmg_at` **broadcast site** (`gameLoop.js:8642` / `BroTown.jsx:8642`), gate the send on client-local zones only:
  ```js
  if (!S._serverMonsters && S.channel) S.channel.send({ type:'broadcast', event:'monster_dmg_at', payload:{ ... } });
  ```
  In server zones, `monster_hit` is the single source of truth; in client-local zones, `monster_dmg_at` remains the source. (Keep any non-floater side effects that path may carry — verify the broadcast isn't also used for something else before gating.)
- **Fallback** (if the broadcast must stay for another consumer): gate the *floater* in the `monster_dmg_at` receive handler instead — skip pushing a number when `S._serverMonsters` is true, since `monster_hit` already covers it.

Route whichever single peer-floater path survives through the Fix A scheduler.

---

## Part 3: Tuning constants

| Constant | Suggested | Purpose |
|---|---|---|
| `PEER_DMG_MIN_SPACING_MS` | 80 | Min gap between released peer numbers per monster (≈ live attack cadence) |
| `PEER_DMG_MAX_HOLD_MS` | 600 | Force-release a queued number after this; bounds display lag + backlog |
| `PEER_DMG_QUEUE_CAP` | 12 | Per-monster queue cap; collapse oldest beyond this |

Tune by feel: lower `MIN_SPACING` if it reads too slow under heavy multi-hit; raise it if columns still form. `MAX_HOLD` should stay ≤ the floater TTL (`effectsRenderer.js:309`, default 1.5 s) so nothing is released only to instantly expire.

---

## Part 4: Edge cases

- **Local player unaffected.** Own-hit floaters (`gameLoop.js:3581`+) bypass the queue entirely. Only `attackerId !== S.myId` / `id !== S.myId` entries enqueue.
- **Monster dies mid-queue.** Leftover queued numbers for a dead monster still drain (their `x,y` were captured at enqueue). The `monster_kill` handler clears the monster, not the queue; `MAX_HOLD` flushes the tail within 600 ms. Optionally clear `S._peerDmgQueue[monsterId]` on `monster_kill` if trailing numbers over a corpse look odd.
- **Zone change / reset.** Clear `S._peerDmgQueue` and `S._peerDmgLastRel` wherever `S.dmgNumbers` is cleared on zone transition, to avoid releasing stale numbers into the new zone.
- **Position drift.** Floaters capture `x,y` at enqueue; a monster moving during the ≤600 ms hold means a number can spawn slightly behind it. Acceptable (same as today's monster-position lag); not worth tracking the live monster for a 0.5 s cosmetic.
- **Crit/special styling.** Preserve `color`, `crit`, and any `special`/`ttl` fields through the queue unchanged — the scheduler only delays `ts`.

---

## Part 5: Implementation checklist

- [ ] Add `_peerDmgQueue` / `_peerDmgLastRel` to state (init lazily or in `createInitialState.js`).
- [ ] `monster_hit` handler (`wsClient.js:507`): for `attackerId !== S.myId`, enqueue instead of direct push; keep HP/`_hitFlash`/particles immediate.
- [ ] `monster_dmg_at` handler: route peer floater through the queue (or skip in server zones per Fix B).
- [ ] Add `_releasePeerDamage(S, now)` call at the top of `effectsRenderer._updateDamageNumbers`.
- [ ] Fix B: gate `monster_dmg_at` broadcast on `!S._serverMonsters` (or gate the floater on receive).
- [ ] Clear both queues on zone change / `S.dmgNumbers` reset.
- [ ] Add the three tuning constants.
- [ ] Mirror into the `BroTown.jsx` monolith copy if it is the live path (see the two-path note in `broadcast-special-attacks.md`).
- [ ] Two-client test: one player fights a monster, the other watches — numbers drip at a live cadence with no column dumps, exactly one number per hit, and HP bar still tracks instantly.

---

## Cross-references

- `wsClient.js:171-178` — existing remote-position interpolation buffer (the pattern this mirrors for numbers).
- `wsClient.js:507` — `monster_hit` handler (server-authoritative peer floater).
- `gameLoop.js:8642` / `BroTown.jsx:8642` — `monster_dmg_at` broadcast (client-local peer floater; dedupe target).
- `effectsRenderer.js:295-375` — damage-number update/TTL/anti-overlap stacker (drain hook + interaction).
- `brotown-server/src/index.js:4112` — worker per-tick `eventBuffer` flush (confirms the burst is not server-side).
- Companion spec: `broadcast-special-attacks.md`.
