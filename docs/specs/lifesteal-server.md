# Melee Lifesteal — Server-Side Implementation Spec

**For:** the Cloudflare Worker at `wss://brotown-server.hemibroscommunity.workers.dev`
**Client counterpart:** GameDev repo, branch `session-1`, v2.3.146 and later
**Client file:** `src/ui/BroTown.jsx` — see `applyMeleeLifesteal` and `trackMonsterDamage` (search the file by those names)

---

## Why this lives on the server

The client already tracks per-monster damage and writes a `+N HP` floater on melee kills, but the actual HP mutation gets stomped on the next `player_state` push because the worker is authoritative for HP and currently knows nothing about lifesteal. Net effect today: the floater flashes but HP doesn't change. To make the heal actually persist, the worker has to apply it and include the new HP in the player_state it sends back.

A previous attempt to gate the client-side overwrite (only accept HP decreases) caused brief invincibility after every kill. That hack was reverted in v2.3.146 — the proper fix is server-side.

---

## Design intent (one paragraph)

On a melee kill, the player gets back 90% of the net damage that specific monster dealt to them during their engagement with it. Heal scales with what the fight cost, rewards engaging tougher monsters, glass-cannon builds benefit less (less HP taken → less heal-back). Melee-only by design — ranged and staff builds get a separate vitality side-train on kill (already client-side, see v2.3.127 in BroTown.jsx).

User quote: *"killing monsters melee heals you, no regen. 90% of the damage received from the monster (net)"*.

---

## What to add to the worker

### 1. Per-player damage-tracking state

Add one field to the per-player session object the worker already maintains (the thing it pushes via `player_state`):

```js
// monsterId -> total damage taken from that monster since last reset.
// Cleared on monster death (refund applied) or on zone change / disconnect.
playerState.dmgFromMonster = {};
```

### 2. Helper module — `lib/lifesteal.js`

Self-contained, no dependencies. Mirrors the client logic exactly.

```js
const LIFESTEAL_FRACTION = 0.9;

function trackMonsterDamage(playerState, monsterId, amount) {
  if (!playerState || monsterId == null || !amount || amount <= 0) return;
  if (!playerState.dmgFromMonster) playerState.dmgFromMonster = {};
  playerState.dmgFromMonster[monsterId] =
    (playerState.dmgFromMonster[monsterId] || 0) + amount;
}

// Returns the refund amount (>0) if a heal was applied, else 0.
// Caller decides whether to emit a player_state push and/or a
// `lifesteal_credit` broadcast so the client can show a +N HP floater.
function applyMeleeLifesteal(playerState, monsterId, activeSlot) {
  if (!playerState || monsterId == null) return 0;
  if ((activeSlot || 'melee') !== 'melee') return 0;
  if (!playerState.dmgFromMonster) return 0;
  const taken = playerState.dmgFromMonster[monsterId] || 0;
  if (taken <= 0) return 0;
  const refund = Math.ceil(taken * LIFESTEAL_FRACTION);
  const maxHp = playerState.maxHp || playerState.hp || 1;
  playerState.hp = Math.min(maxHp, (playerState.hp || 0) + refund);
  delete playerState.dmgFromMonster[monsterId];
  return refund;
}

module.exports = { trackMonsterDamage, applyMeleeLifesteal };
```

### 3. Hook into damage-to-player

Find every place where a monster's damage reduces a player's HP (`player.hp -= dmg` or equivalent). Add one line after each HP decrement:

```js
player.hp -= damageAmount;
trackMonsterDamage(player, monster.id, damageAmount);  // <-- add
```

The client has 8 such sites (slam, sweep, charge, volatile-explode, monster-melee, sentinel-pierce, stalker-crit, slime-projectile). The worker likely has fewer since it's authoritative — grep for whatever decrements player HP from monster sources.

### 4. Hook into the monster_kill handler

Find the function that runs when a monster dies, computes XP/gold shares, and broadcasts to recipients. Right after the killer is identified, before the player_state push:

```js
const refund = applyMeleeLifesteal(
  killerPlayer,
  monster.id,
  killerPlayer.activeSlot
);

// Optional: tell the client about the refund so it can show an
// authoritative +N HP floater (instead of relying on its local guess).
if (refund > 0) {
  channel.send({
    type: 'lifesteal_credit',
    payload: { playerId: killerPlayer.id, refund },
  });
}

// The existing player_state push for this player will now carry the
// bumped hp — no extra work needed if it reads from playerState.hp.
sendPlayerState(killerPlayer);
```

### 5. Cleanup on zone change / disconnect

Wherever the worker handles a player switching zones (or disconnecting), reset the map so stale monster IDs don't linger or get refunded across sessions:

```js
playerState.dmgFromMonster = {};
```

---

## Edge cases to handle

| Case | Expected behavior |
|---|---|
| Player kills with ranged/staff (not melee) | No refund. The function returns 0 because of the `activeSlot` check. Ranged/staff get the vitality side-train instead (client-side, v2.3.127). |
| Player kills a monster that never hit them | No refund. `taken === 0` → bail. |
| Party kill (multiple players damaged the monster) | Only the player who landed the final blow gets the refund. Match whatever attribution the worker already uses for XP last-hit (per gdd.md §17.4.3 — damage-last-hit tracking). |
| Killing blow would heal above maxHp | Clamp to maxHp. The `Math.min(maxHp, ...)` handles this. |
| Player switches slot mid-fight (melee → ranged → melee kill) | Counts as melee kill. Refund applies. The damage they took during ranged phase still counts in the total. This matches client behavior. |
| Player dies before kill resolves | No refund. They'll respawn at maxHp via existing respawn logic. Clear the map on respawn too if you don't already (defensive). |

---

## What to verify in your worker

Before writing code, find these in the worker:

1. **Per-player state object** — what's it called? (Client assumes a thing the worker pushes via `player_state`.)
2. **Damage-to-player function(s)** — where does `player.hp -= dmg` happen? Could be one centralized helper or scattered across monster ability handlers.
3. **Monster_kill handler / kill attribution** — who decides the killer when multiple players hit the monster?
4. **`activeSlot` on the worker** — is it stored per-player? Client sends `set_active_slot` WS messages — confirm those are persisted.
5. **`monster.id` shape** — client uses string IDs like `'summon-1709876543210-2'`. Worker should be using the same identifiers since it broadcasts them. Confirm before keying the map on them.

---

## After it ships — client cleanup

Once the worker is live with this, **edit `src/ui/BroTown.jsx`** to remove the client-side HP write so the heal doesn't apply twice. In `applyMeleeLifesteal`, delete this line:

```js
R.hp = Math.min(maxHp, (R.hp || 0) + refund);
```

Keep everything else — the damage-tracking, the `+N HP` floater push, the `delete S._dmgFromMonster[m.id]`. The floater is still useful as immediate visual feedback (or, if the worker emits `lifesteal_credit`, the client can render the floater from that event instead and the math is guaranteed to match).

Also delete the CAVEAT comment block in the docstring once this is no longer accurate.

---

## How to know it's working

1. **In single-player / safe zone test**: take exactly 50 damage from a fodder slime (track via dev tools or just eyeball the HP bar), kill it with melee. HP should rise by 45 (ceil of 50 × 0.9). Without server-side support today, you'll see the floater but HP snaps back; with this change, HP stays up.
2. **Ranged kill**: do the same fight but kill with bow. No `+N HP` floater, no HP change. Vitality progress should still tick up (client-side).
3. **Multi-monster fight**: get hit by two slimes in the same area for 30 each, kill one with melee. HP should rise by 27 (ceil of 30 × 0.9), not 54 — only the killed monster's tally refunds.
4. **No-hit kill**: walk up to a slime, kill before it touches you. No refund (taken is 0).
5. **No invincibility**: between kills, the player should take damage normally. The bug from the reverted client-side hacks was a 1.5s invuln window — that should NOT come back with this design.

---

## Open questions for the worker author

- Should the refund cap below maxHp count for any in-flight buffs? Client uses `R.maxHp || R.hp || 1`. If the worker has buff-modified maxHp (e.g. cooking HP buff), use the effective cap.
- Should this be off in PvP / arena? The note above says "melee KILLS heal you" without qualifying PvP. If PvP should NOT lifesteal, gate the function on `!playerInArena(killerPlayer)` or similar.
- Should the worker also clear the dmgFromMonster entry when the monster despawns naturally (TTL, zone change) without being killed? Probably yes, for memory hygiene, though not strictly required for correctness.

---

## Provenance

- v2.3.130 — client-side lifesteal added (damage tracking, refund, floater)
- v2.3.144 — failed attempt: gated `player_state` HP rises (server's stale low HP still stomped the heal)
- v2.3.145 — failed attempt: 1.5s lockout window (caused mid-kill invincibility regression)
- v2.3.146 — reverted both gates; client side now writes HP optimistically but it gets stomped. This spec exists to finish the job server-side.
