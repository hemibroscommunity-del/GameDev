# Combat-Level Build-Points Gate — Server-Side

**For:** the Cloudflare Worker at `wss://brotown-server.hemibroscommunity.workers.dev`
**Client counterpart:** GameDev `session-1` v2.3.150 — `addBuildProg` increments `R._buildPointsThisLvl`; 4 client level-up loops gated with `&& (R._buildPointsThisLvl || 0) >= 5`

---

## Why

User's 2am note: *"Combat levels should only go up based on how many build points have been achieved each level. Every 5."*

The build-points use-training system already exists. The system bumps a T1 stat (power / vitality / endurance / agility / mind) each time the player accumulates enough activity to cross a threshold. Today, combat level ticks up independently — purely from killXp. The gate inverts that direction: combat level is *earned* by also having done the build-point work since the last level.

Effect: a player who farms killXp but never engages with combat in a way that builds stats stops gaining levels. They can't power-level past their actual stat investment. XP overflows; it sits there until build points catch up; then both consume together (one level for every 5 build points + 1 full XP threshold).

User-decided semantics: **5 build points total since last combat level**, any T1 stat counts (not per-stat). Stat lock burns the share (doesn't deflect to another stat), so a heavily-locked build will take longer to level — feature, not bug.

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

### 3. Gate the worker's level-up loop

Find wherever the worker runs its own version of:

```js
while (playerState.xp >= xpRequired(playerState.level)) {
  playerState.xp -= xpRequired(playerState.level);
  playerState.level += 1;
  // ... unspentT2 += 5, HP/stamina/mana restore, etc.
}
```

Gate it the same way the client does:

```js
while (playerState.xp >= xpRequired(playerState.level)
    && (playerState.buildPointsThisLvl || 0) >= 5) {
  playerState.xp -= xpRequired(playerState.level);
  playerState.buildPointsThisLvl -= 5;
  playerState.level += 1;
  // ... unspentT2 += 5, HP/stamina/mana restore, etc.
}
```

Note: `xpRequired` lives in `src/data/gameSystems.js` on the client. If the worker doesn't import that, copy the function over (it's tri-phase and small — ~10 lines, search for `function xpRequired` in that file).

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
| Player has lots of XP overflow, then earns 5 build points | Worker's level-up loop fires, consumes 1 xpRequired worth + 5 build points, level += 1. If they earned >5 build points and have XP for multiple levels, the while loop bumps multiple levels until either condition fails. |
| Player earns build points faster than XP | Build points sit waiting. Level only ticks when both conditions hit. Excess build points carry over via `-= 5` (no waste). |
| Player has stat locks on most stats | Burn rate is faster (fewer eligible stats means fewer crossings, slower build points). Level gating naturally slows accordingly. Matches design intent — pure builds are a deliberate slow track. |
| Existing save with no `buildPointsThisLvl` field | Defaults to 0, level-ups blocked until first 5 build points earned post-deploy. Earned XP doesn't disappear — just queues. |
| Disconnect / reconnect | Worker should persist `buildPointsThisLvl` alongside other per-player state. If not, players lose progress toward the next level (annoying but not data loss). |
| Race: build_point_earned arrives after monster_kill | XP gets queued (passes the `xp >= xpRequired` check), build point arrives next, condition fully met on next monster_kill (or next tick where the worker re-checks). Acceptable — at most one kill of latency. |

---

## Verification

1. Wipe a test character to level 1, 0 XP, 0 build points.
2. Kill monsters with melee only (so build_use weights power).
3. Watch XP rise. Notice level stays at 1 even when XP crosses `xpRequired(1)`.
4. After enough kills, power crosses its threshold and `_buildPointsThisLvl` ticks to 1. Repeat 4 more times for 5.
5. On the kill that ticks the 5th build point: combat level should rise.
6. XP should decrease by `xpRequired(1)` and `_buildPointsThisLvl` should drop back to 0 (or whatever excess remained).

If steps 3 + 5 + 6 all match — gate works.

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
- Client commit: v2.3.150 — `addBuildProg` increments + 4 client loops gated
- This worker spec exists to complete the design for MP mode
