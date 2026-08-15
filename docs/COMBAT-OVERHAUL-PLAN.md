# Combat Overhaul — staged plan (owner-approved 2026-08-14)

> **Status:** ALL SIX SHIPPED — PRs 1-6 (v2.3.1726, 1727, 1730, 1731, 1733, 1734).
> Live charter — this is a TRUSTWORTHY doc in CLAUDE.md's sense: it describes
> work being done now, not early design thinking. Update the status line as
> each stage lands.

## Why

Owner feedback after the judging session (2026-08-14), verbatim where it matters:

1. **Shield** — "The shield arc currently blocks all attacks from everywhere.
   It should have a vulnerability where the arc isn't covered."
2. **Levels don't feel like anything** — "The players who are level 13 do not
   feel significantly more powerful than the level 3 players... I DO want
   leveling to feel more powerful than current is." Fractional crit-chance
   gains mean nothing to a player who hasn't already committed.
3. **Pacing** — "Just finishing 20 minutes of the quests to get you to the last
   mayor bro quest shouldn't get you that far (maybe level 5 or 6 from level 3
   where you start)."
4. **Combat is boring** — "You have your base attacks from holding down the auto
   attack, spam swipe special attacks until your mana runs out, then swipe again
   as soon as it slowly rises." Monsters "just walk over to you and attack or
   shoot projectiles. There's no strategy. No timed blocking, no dodging."

Owner decisions (asked directly, 2026-08-14):

| Question | Answer |
|---|---|
| Scope | Everything, staged PRs |
| Combat depth direction | All three: stamina abilities, elemental abilities, smarter monsters |
| What a level should grant | Chunky stats **and** milestone unlocks |
| Shield arc width | Keep 120° (the drawn cone) — fix is making everything respect it |
| Should blocking cost stamina | Yes, drain while held |
| Gate existing abilities behind levels | No — only NEW abilities |

## Standing constraints

- One system per PR; `node tools/dev/precheck.mjs` before every push; PRs
  mergeable by a non-coder in one button press.
- **Anticheat lockstep**: `_computeAttackDamage` + `_maxWeaponDmg` +
  `_maxDmgForAttacker` (server/src/combat.js) + client mirrors move in the
  same commit (the v2.3.1451 rule).
- Mirrored tables are CI-enforced by `server/test/mirror-audit.test.mjs`
  (prog3 constants, quest XP, monster curves).
- New client→server event = server switch case + handler + **`channelShim.send`
  allowlist line** (TRAPS #18; precheck rule 8). Server-emitted types →
  `PRIVILEGED_EVENTS` (wire-audit enforced).
- Display-only server→client events are deploy-order safe when the client
  graceful-degrades; new credit paths need a `state_sync.caps` flag.
- iPhone Safari first: every new ability needs a touch input, desktop key second.
- Old clients that send no shield facing keep the omnidirectional block —
  pinned, do not "fix".
- INV-14: mobility abilities deal less than auto-attack. Imbalance is policy
  (fun first).

## PR 1 — Directional shield ✅ v2.3.1726

Monster melee and PvP now respect the 120° arc. The arc existed since
v2.3.1705 but melee was handed the tick loop's slim player projection (no
facing) and the check fail-opens on a missing facing; PvP had no arc at all
because the lag-comp history carried no facing. Desktop Q now aims at the
mouse; shield rotation broadcasts immediately instead of waiting for the 1 Hz
keepalive.

## PR 2 — Progression retune ✅ v2.3.1727

Completes PROGRESSION-REDESIGN decision #13, which shipped first-guess
placeholders "pending the balance-sim retune" that never happened.

| Constant | Was | Now |
|---|---|---|
| `DMG_PER_LEVEL` sword/bow | 0.18 | 1.5 |
| `DMG_PER_LEVEL` staff | 0.22 | 1.8 |
| `HP_PER_LEVEL` | 2 | 6 |
| `XP_PER_DMG` | 1.0 | 0.4 |
| Quest XP table | — | ×0.7 (rounded to nearest 5), all chains |

Level 3 → 13 goes from +17.7% damage / +18.9% HP to **+130% / +51%**.
Visit-buildings lands at **character level 6** (was 8, or 10-11 for anyone who
fought along the way). Priced by `tools/verify-prog3-retune.mjs`.

Also split damage from flat XP in `_prog3AwardXp` — quest rewards were being
multiplied by `XP_PER_DMG`, invisible while that was 1.0.

## PR 3 — Monster telegraphs ✅ v2.3.1730

SHIPPED as `server/src/telegraph.js` — brute Overhead Slam (900ms) and
stalker Pounce (700ms), with a ground marker at the exact radius the server
tests, whiff-on-move, directional block, and the MAX_HIT_PCT no-oneshot
clamp.  Nine server assertions cover the four fairness properties.
DEFERRED from this slice: snowman's Snow Volley (wants the existing
ranged/snowball path, not the melee-shaped resolve) and a QA scenario for
the client visuals.

Original spec, kept for the deferred half:

Standard-zone monsters wind up big attacks you dodge or block on reaction.
Zero new input surface, which is why it comes before the new abilities.
This is ARCHITECTURE-HANDOFF Item I ("telegraph variety... and standard-zone
minibosses") — reuse the dungeon-boss driver shape (`dungeon.js`
`_dungeonTickBossAbilities`: ready → telegraph → execute → cooldown) in a new
`server/src/telegraph.js` mixin rather than forking core AI.

| Archetype | Ability | Windup | Effect | CD | Counter |
|---|---|---|---|---|---|
| brute | Overhead Slam | 900 ms | 2× melee AoE (r 55) at the telegraphed spot | 5 s | move out; front-block halves; parry negates |
| stalker | Pounce | 700 ms | leap ≤140 px, 1.5× melee | 6 s | sidestep; block |
| snowman | Snow Volley | 1200 ms | 3-projectile fan via the existing ranged path | 7 s | strafe; block per projectile |

Fodder and swarm keep the plain 1500 ms swing — beginners need free hits
somewhere. `MAX_HIT_PCT 0.5` clamp applies to every telegraphed hit.
Execute-phase re-checks position so dodging works with no new i-frame
plumbing. Wire: display-only `monster_ability {mid, kind, phase, x, y}` →
PRIVILEGED_EVENTS; old clients just see the (clamped) hit, no caps flag.

## Unplanned, shipped mid-sequence

- **v2.3.1728 — every modal was unreachable on desktop.**  A regression from
  v2.3.1715 (this session's own desktop-shell work), live in production for
  six versions: `.brotown-wrap` was `width:100vw` inside a 380px
  `contain:paint` shell, so every modal centred outside the visible window
  and was clipped; the keyboard-hints strip separately intercepted clicks on
  modal footers.  Found while starting PR 3, because `mp-questline` had been
  failing the whole time and ran nowhere.
- **v2.3.1729 — the playable-path test runs in CI.**  Owner call.  The mp
  harness could not have run in CI at all: `REPO` was hardcoded to
  `/home/user/GameDev` and Chromium to `/opt/pw-browsers`.  Both fixed; the
  `playable` job (questline, ~3.5 min) is now a blocking PR gate, verified
  green on a real runner.

## PR 4 — Parry + block stamina ✅ v2.3.1731

- **Parry**: server timestamps `ps.blockStartT` when blocking flips true; a hit
  landing ≤250 ms after the raise is negated, staggers the attacker 1.5 s, and
  refunds stamina. Server-observed timing — no new client event, never trust a
  client timing claim. The client's dormant `blockRingBus.resolveIncoming()`
  (150 ms window, written and never called) finally gets its caller.
- **`BLOCK_COSTS_STAMINA` → true** both sides: ~2/s held + ~10 per blocked hit,
  guard-break at zero. The drain and auto-release code is intact behind the
  flag. Free infinite blocking would neuter PR 3; parry is the escape valve
  (perfect timing costs nothing).

## PR 5 — Stamina abilities + milestone unlocks ✅ v2.3.1733

SHIPPED as `server/src/abilities.js` (+ the `src/data/abilities.js` mirror);
full write-up in `docs/specs/stamina-abilities.md`.  Both abilities are
resolved entirely server-side — level, stamina, cooldown, targets, damage,
stun and knockback — and the milestone ladder drives both server availability
and client button visibility.  37 server assertions + a `mp-ability` QA
scenario.

TWO DEVIATIONS from the table below, both deliberate:

1. **Whirlwind's touch input is a BUTTON, not a long press.**  Holding the
   combat joystick IS the auto-attack input (rS sets `S.autoAttack` on
   touchstart), so a long-press trigger would fire Whirlwind every few
   seconds during ordinary attacking and spend 40% of the bar the player
   needs for blocking.  Two round buttons sit above the joystick instead,
   each appearing at its milestone level — which is also the most legible
   form "a level unlocked something" can take.  Bash keeps its planned
   gesture (tap attack while the shield is up).
2. **Desktop E is Shield Bash only WHILE BLOCKING.**  E is the interact key;
   the block state disambiguates, and the interact chain is untouched
   otherwise.  R is Whirlwind.

| Ability | Touch | Desktop | Cost | CD | Damage | Extra |
|---|---|---|---|---|---|---|
| Shield Bash | tap attack while shield up (or its button) | E while blocking | 30% stamina | 4 s | 0.75× auto | 0.8 s stun + knockback, cancels a wind-up |
| Whirlwind | its button | R | 40% stamina | 6 s | 1.0× auto, AoE r 60 | swarm-breaker |

| Char lvl | Unlock |
|---|---|
| 3 (floor) | the whole existing kit, incl. parry |
| 4 | Shield Bash |
| 5 | +1 bonus allocation point |
| 6 | Element Burst (PR 6; also needs an enchanted weapon) |
| 8 | Whirlwind |
| 10 | Second Wind: +25% max stamina |

Existing dodge/lunge/retreat stay ungated (owner call — removing them from
current players would be a regression). New `ability {kind}` client→server
event needs all three legs. Caps flag `caps.abil`. `ability_rejected` still has
no client handler — write it here.

v2.3.1733 shipped all of the above except the level-6 rung, which was left
EMPTY for PR 6 to fill (`MILESTONES` in `server/src/abilities.js` +
`src/data/abilities.js`, both sides in the same commit; the abilities suite
asserts the gap so filling it is a deliberate edit).  `ability_rejected` now
has its client handler, which also gives the older dodge/lunge/retreat/swipe
refusals a visible reason for the first time.

**v2.3.1734 filled rung 6** with `{ burst: true, label: 'Element Burst' }` —
no `kind`, because Element Burst spends MANA and so has no entry in
`STAM_ABILITIES` (the ladder-consistency check would rightly reject a kind
that table does not have).  The gap assertion was flipped, not deleted: what
was worth pinning was never "the rung is empty" but "exactly one thing owns
level 6, and everyone agrees what".

## PR 6 — Element Burst + mana rework ✅ v2.3.1734

Shipped as specified, with **one deliberate scope cut** (below).

**The mana bug.** The special cost `floor(maxMana/5)` — a fraction of max, so
exactly 5 casts per bar at Magic 1 and at Magic 100. The plan named that. What
it did not name is the second half: **regen is also a percentage of maxMana**
(`maxMana × 0.018` per tick out of combat), so the SUSTAINED rate was frozen
too — a flat 7.4 s per cast at every Magic level in the game. Training Magic
bought nothing in either dimension. Flat `SPECIAL_MANA_COST` 25 +
`MANA_PER_MAGIC_LEVEL` 1.2 → 2.5 fixes both:

| Magic lvl | maxMana | casts/bar | sustained s/cast |
|---|---|---|---|
| 1 | 102 | 4 | 9.1 |
| 10 | 125 | 5 | 7.4 |
| 30 | 175 | 7 | 5.3 |
| 50 | 225 | 9 | 4.1 |
| 100 | 350 | 14 | 2.7 |

(was 5 casts / 7.4 s at every row.) The floor is a small deliberate nerf:
5 casts → 4. That is the price of the resource meaning anything, and the burst
spends from the same pool so a level-6 player now chooses between them.

Note the coupling this rests on: since v2.3.1710 a special trains the WEAPON
that fired it, not Magic, so a melee main does NOT level Magic by spamming
specials — their mana genuinely sits at the 4-cast floor until they train
Magic deliberately. That is the owner's stated design ("within the magic stat
allocation is the only way to grow your mana"), and this is the PR where
Magic's cross-weapon job starts paying.

**Element Burst.** Character level 6 + `element1` on the equipped weapon
(Enchant-gated by construction), 25 mana, 3 s CD, 1.5× auto, radius-70 nova,
element status applied to everything caught. Touch button (hidden until
eligible, tinted with the weapon's element), desktop **G**. Server-resolved
end to end: `element_burst` carries an EMPTY payload and the worker reads the
weapon, position, pools, cooldown and targets from its own state.
`server/src/burst.js`; caps flag `elemBurst`; server→client `element_nova`
for the ring + the status the client paints locally.

It is a **setup, not a detonator** — it applies the status and leaves your
ordinary swings to detonate collisions. A nova that detonated on every monster
in the radius would be the biggest damage button in the game on a 3 s timer,
and the interesting loop is burst-then-swing. This is also what finally gives
water→soak a purpose: Soak has only ever been a collision setup.

**SCOPE CUT — two of the three dormant statuses were NOT activated.**
Shipped: **stone→fracture** (armor shred, +6%/stack to 5 stacks = +30% damage
taken, applied on the burst AND the ordinary hit path) with its client visual
(the monster's status pip grows and gains a ring with the stack count —
nothing had ever read `stacks` before). **water→soak** needed no new mechanic:
it already functions as a collision setup and the burst is the ability that
makes applying it worth doing.

**storm→shock is deferred**, and so are curse/reveal. A "brief stun" needs a
new monster-side timer (`elementMoveMult` is all-or-nothing and shock's 4 s
duration would make it strictly better than Freeze), a client stun visual, and
an interaction review against the telegraph (PR 3) and parry (PR 4) systems
that shipped days ago. That is its own PR, not a rider on this one. Storm
bursts are damage-only until then — which is honest, where an invisible stun
would not be.

Verified: `server/test/burst.test.mjs` (34 assertions; every behavior checked
to FAIL with the change reverted), the PROG3 mirror finally enforced in
`mirror-audit.test.mjs` (the standing constraints claimed it already was),
and `tools/qa/mp/mp-burst.mjs` — a real browser against a real worker, which
is the only thing that can see the `channelShim` allowlist (TRAPS #18) and
what a cast actually cost the WORKER.

## Verification (every PR)

1. `node tools/dev/precheck.mjs` before push (syntax, tag claim, shim
   allowlist, storage keys, server suite).
2. `cd server && npm test` — extend the nearest suite; every new behavior
   **verified to fail with the fix reverted**, not assumed to.
3. QA harness against a real worker: `node tools/qa/mp/run.mjs <scenarios>`.
4. Playable smoke on the Pages preview — touch gestures on iPhone Safari, not
   just desktop.
5. Claim a `v2.3.N` tag above the origin/main high-water (session brief).

## Known-stale referee

`tools/balance-sim.mjs` audits the retired T1/T2 economy and has **zero**
prog3 awareness, so it cannot price anything a live character does. PR 2 used
`tools/verify-prog3-retune.mjs` instead. Teaching balance-sim the trained-skill
model is unclaimed work; until it happens, do not treat its output as a
verdict on progression.
