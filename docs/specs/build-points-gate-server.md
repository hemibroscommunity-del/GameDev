# Combat-Level Build-Points Gate — Server-Side

**For:** the Cloudflare Worker at `wss://brotown-server.hemibroscommunity.workers.dev`
**Client counterpart:** GameDev `session-1` v2.3.150 — `addBuildProg` increments `R._buildPointsThisLvl`; 4 client level-up loops gated with `&& (R._buildPointsThisLvl || 0) >= 5`

---

## Why

User's 2am note: *"Combat levels should only go up based on how many build points have been achieved each level. Every 5."*

The build-points use-training system already exists — it bumps a T1 stat (power / vitality / endurance / agility / mind) each time the player accumulates enough activity to cross a threshold. The intent: **combat level is a pure consequence of build-point progression. killXp is no longer relevant to leveling at all** — it still feeds build progression via `distributeKillXpToBuild → addBuildProg`, but the `R.xp >= xpRequired(R.level)` comparison plays no role in level-up.

User-decided semantics: **5 build points = 1 combat level**, any T1 stat counts (not per-stat). Stat lock burns the share (doesn't deflect to another stat), so a heavily-locked build will take longer to level — feature, not bug.

Initial attempt (v2.3.150) gated on both XP and BP. User correctly identified that the dual gate creates situations where a player earns 5 BP but is locked out of leveling because XP hasn't kept pace (locked-stat or low-XP-monster scenarios). v2.3.151 drops the XP condition entirely.

---

## What's on the client (already shipped in v2.3.150)

- `createDefaultRpg` adds `_buildPointsThisLvl: 0`
- `addBuildProg` increments `R._buildPointsThisLvl` by 1 each time a stat ticks (inside the threshold-crossing `while` loop)
- All 4 SP level-up loops in `BroTown.jsx` are gated:
  - `while (R.xp >= xpRequired(R.level) && (R._buildPointsThisLvl || 0) >= 5)`
  - Inside the loop, `R._buildPointsThisLvl -= 5` (excess carries over)
- Existing saves with the field missing default to 0 via `|| 0`; their first new build-point crossing materializes the field

These changes affect SP / dungeon mode immediately. In MP mode the worker still auto-levels via `player_state`, so the gate has no MP effect until this server piece lands.

---

## What to add to the worker

### 1. Per-player level-readiness counter

Add one field to the per-player session state:

```js
playerState.buildPointsThisLvl = 0;
```

Defaulted to 0 for new sessions and for existing players who don't have it yet.

### 2. New WS message from client → worker: `build_point_earned`

The client needs to tell the worker each time a build point ticks. Add the dispatch on the client side (this part will need a future client commit — call it out as a TODO until I land it):

```js
// Client side, inside addBuildProg, after R._buildPointsThisLvl++:
if (S.channel) S.channel.send({ type: 'build_point_earned' });
```

Worker handler:

```js
case 'build_point_earned': {
  playerState.buildPointsThisLvl = (playerState.buildPointsThisLvl || 0) + 1;
  // No echo back needed; client already incremented its own copy.
  break;
}
```

### 3. Replace the worker's XP-based level-up loop with a pure-BP loop

Find wherever the worker runs its own version of:

```js
while (playerState.xp >= xpRequired(playerState.level)) {
  playerState.xp -= xpRequired(playerState.level);
  playerState.level += 1;
  // ... unspentT2 += 5, HP/stamina/mana restore, etc.
}
```

Replace with the pure-BP version:

```js
while ((playerState.buildPointsThisLvl || 0) >= 5) {
  playerState.buildPointsThisLvl -= 5;
  playerState.level += 1;
  // ... unspentT2 += 5, HP/stamina/mana restore, etc.
}
```

Note that **the XP comparison is gone entirely**, and the loop no longer subtracts from `playerState.xp`. killXp still accumulates onto `playerState.xp` for the bar UI and analytics, but it's not consumed on level-up.

`xpRequired` is no longer needed in this loop. The worker can still use it elsewhere (e.g. the per-stat build threshold in `addBuildProg`-equivalent server code, which is `Math.max(200, Math.floor(xpRequired(level)))` on the client). Don't remove `xpRequired` entirely — just from the level-up gate.

### 4. Echo via `player_state` (optional but recommended)

Add `buildPointsThisLvl` to the `player_state` push payload so the client and server stay in sync:

```js
sendPlayerState(player, {
  hp, maxHp, stamina, mana, /* etc. */
  level, xp, unspentT2,
  buildPointsThisLvl: player.buildPointsThisLvl,
});
```

Client receives this in the `player_state` switch case (`BroTown.jsx ~2094`) and mirrors it onto `S.rpg._buildPointsThisLvl`. This guards against drift if a `build_point_earned` message gets dropped.

---

## Edge cases

| Case | Expected behavior |
|---|---|
| Player earns 5 build points | Level += 1, BP counter `-= 5`. If they happened to earn 10 in one event (multi-stat threshold crossing), the loop fires twice. |
| Player has stat locks on most stats | Burn rate is faster (locked stats consume the share without contributing). Slower build progression → slower combat leveling. Matches design intent — pure builds are deliberately slow. |
| Existing save with no `buildPointsThisLvl` field | Defaults to 0, level-ups blocked until first 5 build points earned post-deploy. |
| Disconnect / reconnect | Worker should persist `buildPointsThisLvl` alongside other per-player state. If not, players lose progress toward the next level (annoying but not data loss). |
| Race: build_point_earned arrives after monster_kill | Build point ticks on the worker; loop fires on the next worker tick (or on the next monster_kill resolution). At most one tick of latency. |
| Race: same WS message arrives twice | `buildPointsThisLvl` over-counts. Acceptable for v1; if it becomes a problem, add a monotonic event ID and dedupe. |

---

## Verification

1. Wipe a test character to level 1, 0 build points.
2. Kill monsters with melee only (so build_use weights power).
3. Watch XP rise on the bar. Notice level stays at 1 even when XP crosses `xpRequired(1)`. XP is no longer the gate.
4. After enough kills, power crosses its threshold and `_buildPointsThisLvl` ticks to 1. Repeat 4 more times for 5.
5. On the kill that ticks the 5th build point: combat level should rise.
6. `_buildPointsThisLvl` should drop back to 0 (or whatever excess remained). R.xp is untouched by the level-up.

If steps 3 + 5 + 6 all match — gate works.

**Lock-build sanity test:** Lock vitality, endurance, mind. Equip bow. Kill low-XP monsters. Build points should still tick (from agility weights and power from melee swings while drawing bow — depending on per-action weighting). Combat level should rise on the 5th tick regardless of how much killXp has accumulated. This is the case that exposed the v2.3.150 bug.

---

## Client TODO

After the worker ships this, **add the `build_point_earned` dispatch on the client side** in `BroTown.jsx addBuildProg`, right after `R._buildPointsThisLvl++`:

```js
if (typeof window !== 'undefined' && window._gameState && window._gameState.current && window._gameState.current.channel) {
  try { window._gameState.current.channel.send({ type: 'build_point_earned' }); } catch (e) {}
}
```

(Or wire `S` through to `addBuildProg` more cleanly — the current signature is `addBuildProg(R, stat, amount)` so it has no direct handle on `S`. Quick fix: read it through the existing `window._gameState.current` pattern that other parts of BroTown.jsx use.)

---

## Provenance

- Plan: `~/.claude/plans/these-are-notes-i-shimmering-firefly.md` → A1
- Decision: 5 build points total per level (any T1 stat counts)
- Client commit: v2.3.150 — `addBuildProg` increments + 4 client loops gated (XP + BP)
- Client commit: v2.3.151 — dropped the XP condition entirely; pure BP gate
- This worker spec exists to complete the design for MP mode
