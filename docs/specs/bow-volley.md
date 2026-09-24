# The bow special: three white-hot arrows, a third each, no blast (v2.3.2808)

The owner asked: "I'm thinking actually that the bow special should be 3 white hot arrows that follow each other closely. One shot for all 3 arrows. I think the archetype for bow will be speed and DPS as opposed to staff which is area damage and high damage variance."

Asked how hard each arrow should hit: **"A third each"** — the three together deal what the one arrow did. Asked what happens after they hit: **"Burn, but no blast"** — they stick and burn the monster you shot, and the area send-off (v2.3.2279) is gone, because area damage belongs to the staff.

The rules the three arrows share live in one leaf module, `src/game/bowVolley.js`: `playerActions.js` fires the volley, `projectiles.js` flies and settles it, and `effectsRenderer.js` / `hotArrowFx.js` draw it.

## What the player sees

| | Before | Now |
|---|---|---|
| One press of the special | one white-hot arrow at 3× | **three** white-hot arrows, one behind the other |
| Spacing | — | 80 px tip to tip (one arrow is 62.8), on one line |
| Damage per arrow | 3× the bow's special roll | a third of that, so the same total |
| Shove | 60 px (worker) | 60 px, once: arrows 2–3 send `noKb` |
| Burn | every 500 ms for 4 s from the arrow | the same burn, from **one** arrow of the three |
| End | heats back to white, then a 220 px blast at 3× | the embers darken and fade; no blast |
| A miss | plants, 100 px ground burn, then the blast | three arrows stand in the ground a little apart, one ground burn, no blast |
| Mana, cooldown, swing clock | one special | one special |
| Another player's screen | one arrow | three, the same distance apart |

## The rules (bowVolley.js)

- **One train.** Arrow *i* waits `i × 80 px ÷ its own speed` at the bow — about 56 ms at the bow's 24 px a frame, less with Longshot, so the gap is 80 px whatever the stat has done to the speed. The wait ends on a whole frame, so an arrow is caught up by the time it overstayed (at most 50 ms, three frames) and every gap is the one asked for. Arrows 2–3 fly the **first** arrow's line — its launch point and its angle — so they follow it rather than each aiming afresh from wherever the player has walked in the 100 ms between them. Measured: 80.0 px apart, 0.0 px off the line (mp-hotarrow).
- **Not drawn on the string.** An arrow still waiting its turn (`_held`) is not drawn; it appears the frame it is loosed. Staff orbs keep their old look at the hand.
- **One burn.** The first arrow to come to rest (stuck in a monster or planted) starts the volley's burn clock (`volleyRested`). Only one arrow ticks (`volleyBurns`): the first to ask. If its monster dies, a sibling still resting in something takes over for the time that is left. The 4 s life and the 500 ms cadence belong to the volley (`burnT0`, the volley's `_lingerNext`), so a hand-over never buys an extra tick, and all three burn out together. Three burning arrows would triple the burn — and the worker would drop two ticks in three anyway, since burn ticks are ordinary hits and its normal lane admits one per 210 ms per monster.
- **One shove.** The first arrow of the volley to hit a monster shoves it; the rest send `noKb: true` and skip the local nudge (`volleyShoves`). Build credit (`addBuildUse`) likewise counts once per monster, as the one arrow did; weapon XP is paid by damage, so its total is unchanged.
- **No blast.** `_arrowSendOff` returns for any volley arrow. The lone arrow an old worker gets keeps its blast.

## Wire surface

| Surface | Direction | Shape | Gate / notes |
|---|---|---|---|
| `monster_damage.part` | client → worker | `3` on each arrow of the volley | The worker divides its **own** capped special roll by it: `slot: 'ranged'` specials only, integers 2–3, anything else is 1. Honoured unconditionally — it can only lower damage, and three full specials per 1200 ms per monster is what the special lane has admitted since v2.3.1134. Capped first, then split, so three thirds of an over-cap roll never sum past the cap (`combat.js`). |
| `monster_damage.noKb` | client → worker | `true` on arrows 2–3 into a monster the volley already hit | The v2.3.1435 flag the burn ticks already use. Cheat-neutral: a shove only helps the player. |
| `caps.bowvolley` | worker → client (`state_sync`) | `true` | The client fires the volley only when it is advertised. **Lower case on purpose** — see the kill switch. |
| `arrow_blast` | client → worker | unchanged `{zone, x, y}` | Refused as `retired` (first gate, silent, counted in the operator view's `arrowBlast`) while the volley is live (`_bowVolleyLive`). |
| `player_projectile.delayMs` | client ↔ client relay | 0 / 167 / 333 per arrow | The staff volley's field (v2.3.2259). A peer's arrow flies 8 px a frame, so the stagger is sized for that, and a peer holds a non-staff projectile that many **frames** (`holdFrames`), not milliseconds — in milliseconds the gap shrank with the watcher's frame rate (measured 14–22 px apart on a busy tab). |

No new message types, and nothing new in `PRIVILEGED_EVENTS`.

## Deploy order

| | Old worker | New worker |
|---|---|---|
| **Old client** | unchanged | the one full-strength arrow (no `part`, rolled whole, exactly as before) and its burn; its blast is refused as `retired`, so it loses only the send-off |
| **New client** | no `caps.bowvolley`: the one arrow, its burn and its blast, exactly as before | the volley |

## Kill switch

`bowvolley: false` in the `liveflags` storage key — `POST /api/admin/flags {"name":"bowvolley","value":false}`, and the test panel's **Live flags** section lists and clears it. It un-advertises the volley (join.js spreads the flags over the caps last) **and** lets `arrow_blast` through again, so a client that joins after it gets the old special back whole, blast included. A client already in the game keeps what it joined with until it reconnects.

The name is lower case because the admin route only accepts `/^[a-z0-9_]{1,32}$/` (`liveops.js` `FLAG_NAME_RE`). A camelCase kill switch cannot be thrown through it — see TRAPS §117.

## Balance notes

- **Expected damage is unchanged**; the spread is narrower. Each arrow rolls its own variance and its own crit, so the volley's total averages the old arrow's with less swing — the steady-DPS weapon beside the staff's big hits. Live, on a worker: three hits of 10 + 11 + 9 where the client predicted 11 each (mp-bowvolley).
- **Overkill waste drops.** If the first arrow kills, the other two fly on to what is behind it, where the old arrow's whole 3× landed on one target.
- **PvP:** each arrow's `player_attack` carries a third as its `dmgBase` (the client's own number, clamped by the worker), so the total is the same; the PvP special lane also admits 3 per 1200 ms. One real difference: a **blocked** volley costs the blocker's stamina three times (once per arrow), where the one arrow cost it once.
- **Elements:** each arrow re-applies the weapon's second element; a collision consumes a *different* element's status, so arrows 2–3 find nothing left to detonate — no tripled collision damage.

## Tests

- `server/test/combat-lifecycle.test.mjs` §12 — a part:3 special lands a third; the lane admits all three and they sum to one arrow (±1 rounding); a fourth is still dropped; capped before it is split (30 → 10); ignored on staff specials and on basic hits (the burn ticks); junk values read safely; `caps.bowvolley` is advertised.
- `server/test/arrowblast.test.mjs` §6 — retired by default and with `bowvolley: true`, with no damage, no `arrow_boom` and no cooldown started; the kill switch end to end through a real join (caps false, blast lands); the flag name passes `FLAG_NAME_RE`. §1–5 now run behind the kill switch, where the blast still exists.
- `tools/qa/mp/mp-hotarrow.mjs` — town, page clock: three arrows per press for one `ability_use`, a third each, the 80 px train, nothing drawn on the string, all three stuck, 3 × a third before the first tick, **one** burn (7 ticks, one at a time), one smoulder clock, the burn-out, no `arrow_blast`, a missed volley as three arrows with one ground burn, and a peer seeing three arrows 72 px apart.
- `tools/qa/mp/mp-bowvolley.mjs` — a real worker zone: three `part: 3` sends, `noKb` on arrows 2–3, all three settled as `monster_hit`, one burn of 7 ticks ~500 ms apart, no blast asked for or refused.
- `tools/qa/mp/mp-arrowblast.mjs` — now the kill switch's test: the flag thrown before anyone joins, caps false, one arrow, its blast sent once after the burn and not refused as `retired`; the flag cleared however the run ends.
