# BACKLOG TRIAGE — 2026-09-14 (v2.3.2471)

Read against `main` at 8f74d42 (version high-water v2.3.2470). A read-only
triage of the owner's backlog (about 75 items): what to fix first, what must
not be patched in isolation, and how to split the work across parallel AI
sessions. **Nothing here is implemented.** Every claim is marked **KNOWN**
(read in the code or a trustworthy doc at 8f74d42) or **INFERRED** (the
reading the surrounding code most directly supports; the alternative is
named). Line numbers drift — grep the quoted identifier.

The line-cited research behind each cluster is in `docs/triage-2026-09-14/`
(raw checkpoint logs from seven read-only research passes). Keep them: they
are what stops the next session from paying for the same research twice.

**How to use this document.** Owner: read §0 and §1, answer the decisions in
§0.4, then open sessions with the briefs in §1.3. A session: read only its
lane brief (§1.3), its cluster (§2) and its evidence file — not the whole
document.

---

## 0. Executive read

### 0.1 The real problems, in order of what a player actually loses

1. **Un-pickable loot is a client formula bug, not a server position bug
   (KNOWN formula, INFERRED sequence).** `src/game/groundLoot.js:97-102`
   pulls a pile toward the player with `pull = (1 - lDist/50) * 3`, applied
   while the pile's server anchor is within 50 px of the player and the
   *visual* pile is more than 20 px away, with no clamp. Once the visual
   pile is more than 50 px from the player the pull goes **negative** and
   accelerates: the pile runs away while you fight on the spot. Past 160 px
   from its anchor the server (`index.js:3800-3805`, radius 160 measured
   from the anchor) can never grant it, and the client asks from the visual
   position — the "position disagreement" is the pile's, not the player's.
   Dash kills sit exactly on the edge (`DASH_STOP_PX = 46` vs magnet range
   50), which is why the owner sees it "mainly during melee dash". Every
   non-range rejection is also retried silently every 5 s forever
   (v2.3.2327 removed the floater), so ghost piles never die. The move
   broadcast gate already includes the dash (`_bashDash`, v2.3.2263) —
   TRAPS §46 is not the cause. This has been "ongoing" because v2.3.1161's
   comment claims the visual pile "can never stray" beyond the magnet range,
   and that claim is false in this branch. → §2.3, lane L.
2. **Silence after returning to the game has a known un-handled path
   (KNOWN gap).** The audio-resume harness (`tools/qa/audio-resume-check.mjs`)
   still passes against the shipped code, so the *visibilitychange* path
   works. The bfcache return (`pageshow`) only calls `onResume(true)`
   (`GameApp.jsx:244-255`) and never arms the iOS session reclaim, which is
   armed only by `noteHidden → noteVisible` with 2 s away
   (`gameDisplay.js:1833-1836`). iOS "does not always fire" visibilitychange
   (the code says so at `:246`), so that return lands in the v2.3.1604
   detached-route mode: speaker icon, silence, no recovery except reload.
   → §2.3, lane L.
3. **The animation-preloading law is broken in three places (KNOWN).**
   `preloadGear()` warms `stand/jog/hit/mine/dodge` only — the `pickup` and
   `fish` gear sheets are absent, so the first pickup draws shirtless for
   500 ms (the exact report); the masked-body `PREWARM_POSES` list also
   lacks them; and the sword/bow stand-in shirt strips are cut lazily on
   first swing/shot (`effectsRenderer.js:2482-2489` says so). This is the
   owner's standing directive (CLAUDE.md, TRAPS #12). → §2.6, lane P.
4. **Hits that should miss are a hit-radius problem, client-decided
   (KNOWN numbers, INFERRED cause).** Slime `_hitR` is 27 (default 18) plus
   the arrow's swept capsule → about 34 px effective; the special multiplies
   the radius by **3** → about 92 px. The server validates only zone,
   cadence and damage caps, never geometry. → §2.5, lane C.
5. **Two "big" asks are bigger than they look, and one of them is not what
   its predecessor was.** The bow-equals-one normalization is a *balance
   pass in integer arithmetic*, not the near-lossless units change the ÷4.8
   rescale was: at "1 damage" every `Math.round` is a ±50 % swing, the
   0.6–0.8 bow band collapses to one integer, and per-level growth
   (`DMG_PER_LEVEL` 1.5 → 0.3) becomes invisible for two or three levels at a
   time. It also moves about 85 constants in 14 files with 8 test/tool pins,
   XP paid per damage point, weapon sell prices, the anticheat floor and
   banked flats in stored blobs. The general store's "sell ANY item" is
   blocked on the fact that armor, shield, legs, cosmetic gear and amulet
   stashes are **client-local** — the server holds only the equipped slot —
   so those need a server-side gear stash (its own PR) before they can be
   escrowed. → §2.1, §2.2.
6. **Nine asks reverse an owner directive from the last 60 days or need art
   or a screenshot the sessions do not have.** A session that guesses will
   build the wrong thing; the owner can answer each in one line. → §0.4.

### 0.2 The traps — what must not be patched in isolation

- **Normalization (§2.1).** Never client-only or server-only: displayed and
  authoritative damage diverge (the ÷4.8 spec's own warning), and the
  anticheat floor (`combat.js:489,527`, flat 21) becomes 5× too loose or too
  strict. Must move together: weapon bases, `DMG_PER_LEVEL`, `HP_PER_LEVEL`,
  `DAMAGE_CHANNEL_FLAT` and its cap, the monster HP curve, monster attack
  base, player max-HP formula, elemental DoT/collision flats, cooking and
  potion heals, `XP_PER_DMG` (inversely, or XP rates fall 5×), the sell-price
  formula (`gear.js:184`, or every weapon sells for a fifth), the anticheat
  floor, and a migration for banked `ps.t2Flat` (INFERRED). Do not "fix"
  BALANCE-PLAN §1's 7.29/8.54 in passing — those numbers are stale (bow and
  staff were re-based to 12.80/13.44 in v2.3.2259); edit only the lines the
  change makes true (TRAPS #10).
- **Attributes (§2.1c).** New rpg-blob fields go through the fixed field
  list and a migration (`RPG_SCHEMA_VERSION` 14 → append v15, never
  renumber), not ad hoc (TRAPS #2). The v11 `prog3SplitAtk` precedent
  *refunds* moved points to the pool rather than copying them.
- **Shield for bow/staff and the right double-tap (§2.4).** These two asks
  are one change: the bow/staff double-tap-and-hold guard (v2.3.2446, four
  days old) uses the same tap classifier the weapon swap would need. Retire
  the guard and restore the button in the same PR, or the two gestures fight.
  `mp-bowshield` (15 assertions) inverts.
- **Monster stopping distance (§2.5).** Raising the 45 px chase stop
  (`index.js:1978-1985`) without widening the monster's swing reach
  (`WHIFF_GRACE` 1.3×) makes monsters stop outside their own reach and never
  hit. Server-only; test in `tick`/`telegraph` suites.
- **Chop size (§2.6).** `CHOP_STANDIN_H` has been bumped three times
  (84 → 112 → 95 → 104.5, the last one already "+10 %" in v2.3.2273). The
  walking body is scaled by `buildScale` (Tall ×1.13) and no stand-in is
  (INFERRED, `effectsRenderer.js` has zero `buildScale` references). Apply
  the build scale; do not bump the constant a fourth time.
- **Debris (§2.5).** Do not build a second debris system. The hit path is
  live, but none of the five `DEBRIS_BURSTS` sheets exist under
  `public/sprites/effects/`, so every burst is the 450 ms six-dot fallback
  and the ground decals are near-invisible blobs. Art, or a louder fallback.
- **Landscape zoom (§2.8).** Combat zones cannot zoom out: the no-void
  floors (v2.3.2247, v2.3.2257) force 0.824 sideways vs 0.587 portrait.
  Only town/worldview can change. Decide which the owner means first.
- **Every "small" fix.** 77 TRAPS entries exist because obvious fixes here
  have been wrong before. Do not staff a lane below Opus 5 high.

### 0.3 The order

1. **Owner answers §0.4** (ten minutes; unblocks four lanes).
2. **Lane L (loot, sound, coin sound, death race)** — highest player pain,
   smallest diff, no design decisions. Ship first.
3. **Lane C-in (input controls)** before **lane C-bow (bow rework)**: the
   bow's special-queue needs the special button's flag, and the shield
   change frees the right double-tap.
4. **Lane S in this order: small server behaviours → attributes →
   normalization.** Normalization last, on a settled constant set, after
   the rounding decision. Alternative: normalize first if the owner wants
   to see it sooner; then the attribute PR must re-base its numbers.
5. **Lane M (store) in phases:** stackables + weapons with buy-now and
   resting bids → server gear stash → gear listings. Independent of every
   other lane file-wise; can start immediately.
6. **Lanes P, F, H, A** as capacity frees; none blocks another lane.

### 0.4 Decisions the owner must make first (recommended default in bold)

| # | Decision | Why it is a decision | Default |
|---|---|---|---|
| D1 | Normalization: true small-integer combat (a balance pass; TTK re-tuned per archetype with `tools/balance-sim.mjs`) or keep the internal scale and rescale only the *display*? | At "1 damage" integer rounding makes the ÷k sweep lossy; display-only keeps TTK exact but hit numbers stop adding up to the HP bar | **True integer combat, k = 5** (the lowest L1 roll is the sword's 6.67 × 0.75 = 5.0, not the bow's) |
| D2 | Normalization: rescale the survival axis too (player HP 100 → 20, monster attack base 12 → 2.4, heals, potions)? | Last time the survival axis was deliberately left alone; the ask says "player hp" | **Yes**, same k, same PR |
| D3 | Tap-lock on a farther monster: never steal a tapped lock, or keep the melee auto-switch (v2.3.2263, `AUTO_SWITCH_MARGIN` 0.88 after 900 ms) but only when the tapped monster leaves the perimeter? | The steal is the owner's own "go by the nearest" directive | **A tap lock is absolute until the monster dies or leaves the 220 px perimeter** |
| D4 | Nameplate in combat: hide the whole plate, or hide the name pill and keep HP bar + a red "attacking you" cue? | Hiding everything removes the v2.3.2295 red plate the owner asked for | **Hide the name pill; keep HP bar and red cue**; needs the nameplate screenshot |
| D5 | World text size: raise the base (owner lowered it 12 → 8 in v2.3.2265) or add a CSS-pixel floor (~9–10 px) the way the carets do (v2.3.2255)? | At combat-zone scale the name renders about 6 px | **CSS-pixel floor** |
| D6 | Cape hidden during the dodge roll — reverses v2.3.2129, which removed `dodge` from the hidden poses so "the cape you paid for does not vanish when you bend down for loot" | Same pose serves roll and pickup | **Hide for the roll/tumble only, not the pickup bend** (needs a pose split or a roll flag) |
| D7 | Southwest sword behind the body — reverses v2.3.1787 ("SW, SE and E need the sword layered in front"), which applies to the greatsword; plain sword and staff are already behind | Which weapon, jog or attack? | **Greatsword, jog/idle only; confirm** |
| D8 | Shield for bow/staff: button returns, auto-aims at the nearest monster, and the v2.3.2446 double-tap-hold guard is retired (which frees the right double-tap for weapon swap) | Reverses a four-day-old directive | **Yes, all three together** |
| D9 | Block button left of the attack disc — that column is where the ability buttons sit (`AbilityButtons.jsx:118-121`) | Layout conflict | **Block left of the disc, abilities stacked above it** |
| D10 | Landscape "too zoomed in": town/worldview, or combat zones? | Combat zones cannot zoom out without void | **Town/worldview only** |
| D11 | Store scope for phase 1 | "Any item" needs a server gear stash first | **Stackables + weapons; buy-now + resting bids; gear in phase 2** |
| D12 | Elemental resistance: which damage does it resist? No monster damage is typed today (KNOWN: only the 5 % cooking buff and a client-only amulet field exist) | A stat with nothing to resist is dead content | **Define the list (fire trail, slime burst, elemental PvP) in the attribute PR, or defer** |
| D13 | Staff splash: base radius and whether specials splash | Server intent flag needed | **60 px, basic bolts only, 50 %, capped by `_maxDmgForAttacker`** |
| D14 | Monster stop distance in px ("full length of the sword") | Must match swing reach | **72 px (`GS_OUTER_RADIUS`), reach widened to match** |
| D15 | Items that need art or a screenshot from the owner: nameplate design; mana bar in landscape; shirtless-bow squares (with and without ink drawn?); copper feet; the "Lil Bro" source sheet (not in the repo); a coin sound file (the owner removed all synthesized audio in v2.3.1103 — do not re-enable `beep()`); five debris sheets | Sessions cannot produce these | Supply when convenient; lanes skip these until then |

---

## 1. Session plan

### 1.1 Rules for parallel sessions in this repo (why "more" is not free)

- Every merge to `main` forces every other in-flight session to renumber
  its version tag and re-merge (the log is full of "Renumber above main's
  new high-water"). That cost grows with the square of concurrency. **Run
  at most four lanes at once**, and re-check the high-water immediately
  before merging (TRAPS #16).
- **No two concurrent lanes may own the same primary file.** The lane
  table assigns ownership; the collision files are `src/ui/BroTown.jsx`
  (12.8k lines), `src/rendering/systems/entityRenderer.js` (12.8k),
  `src/rendering/systems/effectsRenderer.js` (9.7k), `src/data/gameSystems.js`,
  `server/src/combat.js`, `src/networking/gameEvents.js`. Where two lanes
  touch one of these in different regions (marked ⚠ below) the later PR
  rebases on `main` before pushing.
- **One system per PR**, not one line per PR: batching several constant
  tweaks inside one subsystem is fine and cheaper for the owner to test.
- **Sessions persist across a lane's sequential PRs.** A lane's second PR
  reuses the context the first one loaded; start a fresh session only when
  switching lanes or when the transcript is bloated.
- **Sessions read, they do not re-research.** Each brief names its cluster
  and evidence file; the research is already paid for.
- Every PR: `node tools/dev/precheck.mjs`, the named harness, spec doc
  updated in the same PR, plain-language PR body, one-button merge.
- **Verification is on a phone.** The harnesses prove the mechanism; the
  owner's iPhone proves the feel. Ask for a phone check in the PR body
  where the brief says so.

### 1.2 Lane table

Model tiers as the owner named them. "Fable 5.1 max" where a wrong first
cut is expensive (many files, contracts, migrations, anticheat, or a
decision the session has to get right against 77 traps). "Opus 5 max"
for contained logic in the big files. "Opus 5 high" for constant-level
work with a named file and a named harness. Nothing below Opus 5 high.

| Lane | Sessions (in order) | Model | Primary files owned | Verify with | Size |
|---|---|---|---|---|---|
| **L** loot & liveness | L1 loot magnet + silent rejects + pet path + coin-sound hook → L2 death/recovery race + slime burst window → L3 audio bfcache resume | Fable 5.1 max (L1), then continue the same session | `src/game/groundLoot.js`, `src/networking/wsClient.js` (pickup/credit), `server/src/index.js` (pickup/death), `src/data/gameDisplay.js` (audio), `src/ui/GameApp.jsx` | new `mp-lootmagnet` (dash-kill), `mp-remnant`, `mp-lootzone`, `mp-deathgold`, `mp-slimeburst`, `tools/qa/audio-resume-check.mjs`; phone | S / S / S |
| **C-in** input controls | C1 special button by the left stick + shield for bow/staff (retire the double-tap guard) + right double-tap weapon swap + block button left of the disc + attack-disc ghosting over a monster | Fable 5.1 max | `src/ui/BroTown.jsx` input handlers ⚠, `src/ui/mobile/TouchControls.jsx`, `ShieldButton.jsx`, `AbilityButtons.jsx`, `src/game/shieldToggle.js` | `mp-bowshield` (inverts), `mp-btnlayout`, `mp-rbutton`, `mp-joyfade`, `mp-solospecial`, `mp-ctltut`; phone | M |
| **C-bow** bow rework | C2 on-target fire gate + queue + clipped sight line + 3× arrow speed + special queue → C3 stuck-arrow fixes, arrow outline, special pulse, bow/staff material hit sounds, hit-radius audit | Fable 5.1 max (C2), Opus 5 max (C3) | `src/game/monsterCombat.js` (fire gate), `src/game/projectiles.js`, `src/game/playerActions.js`, `effectsRenderer.js` sight stream & arrow draw ⚠ | `mp-arrowshot`, `mp-arrowdt` (update 480 px/s), `mp-aimpath`, `mp-hitmatrix`, `mp-hitreal`, `mp-hitsound`; phone | M / M |
| **S** server combat math | S1 kill-popup raw damage + staff 50 % splash + monster stop distance + pounce removal → S2 attribute restructure (elemental per weapon, resistance global, max mana global) → S3 bow-equals-one normalization | Opus 5 max (S1), Fable 5.1 max (S2, S3) | `server/src/combat.js`, `gear.js`, `prog3.js`, `data.js`, `elemental.js`, `telegraph.js`, `migrations.js`, `index.js` (monster AI) ⚠, `src/data/gameSystems.js`, `src/data/prog3.js`, `HeroExpanded.jsx` rows, `server/test/*` pins, `tools/balance-sim.mjs` | `cd server && npm test` (mirror-audit, prog3, display-dps, anticheat, tick, telegraph, migrations), `tools/balance-sim.mjs`, `tools/audit-validator.py --scale` | S / M / L |
| **M** general store | M1 store phase 1 (list stackables + stash weapons from the bag, buy-now, resting bids, sold toast, anchor to a header icon, grouping by bag filters) → M2 server gear stash → M3 gear listings | Fable 5.1 max | `server/src/market.js` (+ new store module), `inbox.js` touchpoints, `join.js` caps, handoff registry table, `ExchangePanel.jsx`/new panel, `src/ui/mobile/dash/ItemDetailPopup.jsx`, `InventoryPanel.jsx`, `bagFilterBus.js`, `server/test/market.test.mjs` | `market.test.mjs`, `caps-audit`, `opid-audit`, `wire-audit`, `mp-market`, `mp-itemcard`; phone | L / M / M |
| **P** harvesting & preload | P1 pickup/fish gear preload + stand-in strip warm-up + chop skin tint + build scale on stand-ins → P2 gesture sync defects + wind-up bar above the head (95 % stall, thumb-synced frames) | Opus 5 max | `src/rendering/gearSheets.js`, `preloadAnimations.js`, `combatGear.js`, `effectsRenderer.js` stand-in bake region ⚠, `src/game/gesturePose.js`, `src/ui/mobile/ExtractionSwipeLayer.jsx`, `src/game/lifeSkillRewards.js` | `mp-standinskin` (extend to chop/cook/fire), `mp-figscale`, `mp-gcue` (add a real-pointer case), `mp-harvest`, `mp-chopyield`, `mp-coldload`, `window.__btPreloadReport`; phone | S / M |
| **F** combat feel & monsters | F1 melee ring + first-lock flash/bounce + skeleton walk fps + fireball size + debris/decal fallback tuning → F2 orb-range repro in Desert Winds | Opus 5 high (F1), Opus 5 max (F2) | `effectsRenderer.js` ring/chip/debris regions ⚠, `src/data/monsterVariants.js`, `src/game/targeting.js` (lock `at` stamp) | `mp-lockchip`, `mp-lockrings`, `mp-engage`, `mp-skeleton`, `mp-feel`, `mp-orbrange`; phone | S / S |
| **H** HUD, nameplates, tutorial | H1 first-join dashboard closed + attention ring, oval-cue fix, post-quest highlight → H2 nameplate/targeting per D3–D5 (after the screenshot) → H3 landscape fold chip, mana border, head margin, Designs button, trade-cancel chat line, mayor-bro popups | Opus 5 max (H1, H2), Opus 5 high (H3) | `src/ui/mobile/QuestCoach.jsx`, `BottomDashboard.jsx`, `sheetGeometry.js`, `VitalBar.jsx`, `src/game/worldViewport.js`, `entityRenderer.js` nameplate region ⚠, `targeting.js` steal rule, `PlayerPaint.jsx`, `gameEvents.js` trade/popup lines ⚠, `game.css` | `mp-questcoach`, `mp-ctltut`, `mp-onboarding`, `mp-firstrun`, `mp-monsterplate`, `mp-moncue`, `mp-worldtext`, `mp-landscape-*`, `mp-designs`, `mp-trade`; phone | S / M / S |
| **A** sprite art | A1 rule fixes (cape hidden on roll per D6, stand-in cape z-order, south-block cape, SW preview cape, face-tattoo region rule, SW greatsword per D7) → A2 rebakes (bow south eye, jog belt table, tee waist reseal, legs icon crop, copper feet) → A3 owner-supplied (Lil Bro sheet, tee frames, screenshots) | Opus 5 max (A1), Opus 5 high (A2) | `entityRenderer.js` cape/weapon regions ⚠, `effectsRenderer.js` `_placeStandInCapeOn` ⚠, `src/rendering/playerDecal.js`, `characterPortrait.js`, `src/rendering/jogBelt.js` + `tools/gen_jog_belt_table.py`, `tools/gear/*`, `public/sprites/gear/*` | `mp-cape*`, `mp-facetat`, `mp-tattoos`, `mp-southshirt`, `mp-shirtarm`, `mp-southsword`, `mp-coppergear`, `qa-gear-sheet.mjs`; 20× renders in the PR | S / M / — |

Size: S = one short PR, M = one substantial PR, L = a multi-PR feature.

**Suggested start:** L, C-in, S and M together (four lanes, two of them
short). When L finishes start P; when C-in finishes the same session
continues as C-bow; when P finishes start F; then H and A. Answer §0.4
before C-in, S and H start — each has a decision in it.

### 1.3 Session briefs (copy-paste)

Every brief assumes the session's own start-up: the SessionStart brief
runs, `CLAUDE.md` is read, and server work reads
`docs/ARCHITECTURE-HANDOFF.md` first. Each brief says which evidence file
to read; that file's citations are the starting point, not a suggestion.

**L1 — loot magnet.** Read `docs/BACKLOG-TRIAGE-2026-09-14.md` §2.3 and
`docs/triage-2026-09-14/loot-persist-audio.md`. Fix, in `src/game/groundLoot.js`:
the magnet pull must never push a pile away and the visual pile must never
be farther from its server anchor than the server's pickup radius; drop a
pile locally on a permanent rejection (`no-pile`, `already-claimed`,
`not-recipient`, `wrong-zone`) instead of retrying every 5 s; stop the pet
vacuum from holding `_pickupPending` against the manual grab. Hang a coin
sound on `_applyLootCredit` when `payload.coins > 0` only if an approved
sound file exists in `public/sfx/` — never re-enable `beep()`. Write an
`mp-lootmagnet` harness that dash-kills a slime and asserts the pile is
collected. Do not touch the server pickup radius. Phone check requested.

**L2 — die-and-recover, slime burst.** Same session. Add a guard so a
death within the 500 ms `_lootFreezeUntil` window after a recovery credit
cannot re-drop the bag (or remove the freeze if nothing depends on it —
find out). Extend the blue-slime burst so a frame hitch longer than 400 ms
at the kill frame cannot skip it, and confirm `_updateMonsters` throws
nothing (per `mp-slimeburst`). Migrate the client-local town/dungeon death
path only if it is on the way; otherwise note it.

**L3 — sound after return.** Same session. Arm the iOS session reclaim on
the `pageshow` (bfcache) return the way `noteHidden → noteVisible` does;
keep `tools/qa/audio-resume-check.mjs` green and add its case. Phone
check: background the game 30 s, return, expect sound.

**C1 — input controls.** Read §2.4 and `combat-controls-fx.md`. Owner
decisions D8 and D9 apply. One PR: a Special button orbiting the left
stick (must swallow its own touches — the left zone is the movement layer
and a left swipe is the dodge); shield button back for bow/staff, aimed at
the nearest monster when there is no lock (`targetCandidates(S)[0]`);
retire the bow/staff double-tap-and-hold guard and make a right-disc
double tap the weapon swap (the melee first tap still lunges — check that
`RBTN_DBL_MS` and `maybeSwordDash` do not fight); block button to the left
of the disc with abilities stacked above; attack disc drops to an outline
while a monster is under it (project `S.monsters` to screen each frame in
the existing resolver). Update `docs/specs/control-redesign.md`, whose
history stops at v2.3.2251. Invert `mp-bowshield`. Phone check requested.

**C2 — bow rework.** Same session after C1. Read §2.5 (bow). Client-only:
at the bow fire site, fire only when a ray from the grip along the aim
angle hits the first monster's hit circle; when it does not, do not stamp
`swingTimer`, so the next shot fires the instant the line touches (cadence
still applies from the last shot); a pressed special sets a flag consumed
at the same site; clip the sight stream at the first hit distance; arrow
speed ×3 with the segment cap, trail teleport threshold and `mp-arrowdt`
updated. No server change is needed (the server checks zone, cadence and
caps only). Phone check requested — this changes how the bow feels.

**C3 — arrows and hits.** Same session. Skip the plain stuck-arrow stub
when `isSpecial`; add mummy/skeleton entries to the stuck-arrow anchor
table; bake a bright keyline into the arrow art with the existing
pine-arrow tool rather than a runtime filter; pulse the special white in
flight; play material hit sounds for arrows and bolts via
`hitMaterialOf`; set slime `_hitR` to the sprite's measured radius and cap
the special radius multiplier. Keep `mp-hitmatrix` and `mp-hitsound` green.

**S1 — small server behaviours.** Read §2.1 (d–f), §2.5 (stop distance,
pounce) and `combat-numbers.md`, `combat-controls-fx.md`. Four contained
server changes, one PR each or one PR if they stay small: add `rawDmg` to
`monster_hit` and show it in the kill popup (XP and contribution keep
`actualDmg`); a `splash` intent for basic staff bolts at 50 % under the
cap (D13); monster chase stop at D14's distance with swing reach widened
to match; delete the `pounce` kit (stalkers keep the basic wind-up). Extend
the nearest suites.

**S2 — attributes.** Same lane, after S1. Read §2.1c. Move elemental damage
from global `BODY.elem` to per-weapon `ATK` channels, add elemental
resistance (D12) as a global channel, make max mana a global channel
instead of a staff-level derivation; both sides of PROG3, the allocate
whitelist, recompute paths, HeroExpanded rows, a v15 migration that refunds
moved points (v11 precedent), `_sanitizeProg3`, mirror-audit pins.

**S3 — normalization.** Same lane, after S2 and D1/D2. Read §2.1a–b. Write
the design note first (k, rounding rule, the integer HP table per
archetype and level previewed with `tools/balance-sim.mjs`, XP and sell
re-basing), then one PR that moves every constant in the inventory,
client and server in the same commit, with the mirror-audit and
display-dps fixtures updated and a shrink migration for banked flats.
Prove hits-to-kill parity within tolerance in the PR body.

**M1 — store phase 1.** Read §2.2 and `general-store.md`. Server: a
per-listing model (item or stash weapon, any price, seller-set), buy-now
and resting bids with gold escrow, credit-first settlement through
`_creditPlayer`, lazy expiry, new storage prefixes registered in the
handoff table, a narrow caps flag advertised in `join.js` and listed in
`CAP_GATES`, opIds with literal prefixes, `Object.create(null)` maps.
Client: a "Sell" action in the item modal (the `shopBus`/`tradeBagBus`
bag-tap precedent), a store panel grouped by `bagFilterBus.CATEGORIES`, a
toast on `inbox_delivered` with `source === 'market'`, and the anchor
button moved to a small header icon. Do not list gear stashes (client-local
— rule 16). Extend `market.test.mjs`.

**M2/M3 — gear stash, gear listings.** Same lane. Persist armor, shield,
legs, cosmetic and amulet stashes server-side (fixed field list,
migration, join load, echo adoption), then let the store escrow them.

**P1 — preload law and stand-ins.** Read §2.6 and `harvest-preload.md`.
Add `pickup` and `fish` to `preloadGear()` sets and `PREWARM_POSES`; warm
the sword/bow stand-in shirt strips inside the loading gate; pass the skin
recolor to the chop stand-in the way cook and fire do; apply `buildScale`
to every stand-in and stop bumping `CHOP_STANDIN_H`. Note fishing skin
needs the rod re-cut onto its own layer (art). Extend `mp-standinskin`.
Report `window.__btPreloadReport` in the PR.

**P2 — gesture sync and the wind-up bar.** Same session. Fix the two
pointer defects (a harvest started on `touchstart` never sets
`_gestureDown`; `onPointerUp` ignores `pointerId`), stop feeding the demo
phase into the body (keep it on the button), and add the world-space bar
above the head that fills over `startedAt → windowOpensAt`, stalls at
95 % in `ready`, and completes on the reps. Server needs nothing (it
refuses only `too-early`). Add a real-pointer case to `mp-gcue`.

**F1 — feel.** Read §2.5 and `combat-controls-fx.md`. Extend
`engageRingGfx` into the light-red melee ring on the aggroed or locked
monster (one ring, radius = melee reach); stamp `at` on every lock and
flash/bounce the chip for its first second within the headroom gates;
raise the skeleton's `walkDistPerFrame`; enlarge the fireball
`projectileScalePx`; make the debris fallback and decals visible for about
5 s until the owner's sheets arrive.

**H1 — tutorial.** Read §2.9 and `hud-tutorial.md`. First join after
creation: dashboard starts folded with an attention ring on the fold chip,
then the tutorial resumes; the lesson after the weapon swap must never
fall back to the whole right touch zone (size-sanity guard on rings);
after `tut_1` turn-in highlight the Dashboard nav button, or the fold chip
if the dashboard is folded.

**H2 — nameplates and targeting.** After the screenshot and D3–D5. Name
pill hidden while engaged, red cue kept; tap lock absolute; a CSS-pixel
floor for world text.

**H3 — HUD polish.** Fold chip to a real touch target; mana bar border;
`_HEAD_MARGIN` mirroring `_FOOT_MARGIN` so the bro cannot walk under the
rail; Designs button in the primary style with a finite pulse; trade-cancel
also writes a chat line; no damage popups on the Mayor.

**A1 — art rules; A2 — rebakes.** Read §2.7 and `art-bugs.md`. Every art
PR ships 20× renders of the touched frames before and after. A1 is code
only; A2 uses the named tools and measurements (`mp-southshirt`,
`qa-gear-sheet.mjs`), never eyeballing (TRAPS #21).

---

## 2. Clusters

Format per cluster: items · known vs inferred · likely root cause · blast
radius if the symptom alone is patched · severity (engineering judgement)
· what evidence would change the read · next action.

### 2.1 Combat scale and attributes (lane S)

**Items.** Normalize all combat numbers so the lowest weapon roll is 1 ·
move elemental damage to per-weapon points · add elemental resistance as
a global attribute · move max mana to a global attribute · show the full
damage of the killing hit · no damage numbers on the Mayor · 50 % splash
on basic magic bolts.

**(a) Normalization — known.** Weapon bases today are greatsword 10,
sword 6.67, **bow 12.80, staff 13.44** (`server/src/gear.js:67`,
duplicated `combat.js:398`; bow/staff re-based in v2.3.2259 — BALANCE-PLAN
§1 is stale). Variance: melee 0.75–1.25, bow 0.6–0.8, staff 0.5–1.5. The
lowest level-1 roll before any allocated points is therefore the sword's
5.0, then staff 6.72, greatsword 7.5, bow 7.68 — "probably bow" is wrong
by the code. Server rolls `max(1, round(base))` after variance and crit
(`combat.js:752`), caps and rounds again (`:903`), clamps to remaining HP
(`:905`); monster HP is integer by construction; DoT, collision and burst
all `round`. The client prints the wire number verbatim. About **85
absolute constants in 14 files** must move together (full inventory in
`combat-numbers.md` §1), including: `DMG_PER_LEVEL` 1.5/1.5/1.8,
`HP_PER_LEVEL` 6, `DAMAGE_CHANNEL_FLAT` +1/pt cap 100, `BODY.hp` 8/pt,
maxHp `floor(100 + level×6 + hp×8)`, monster HP `{base 12.5, ramp 1.052,
flat 100, flatLow 50}` (`data.js:28`), monster attack `monsterStat(12,…)`
at three sites, `XP_PER_DMG` 0.4 (XP is paid per damage point), elemental
burn `5 + P×0.3`, root `3 + P×0.15`, thorn `4 + P×0.25`, about 45
`COLLISION_TABLE` bases, `SLIME_BURST.DMG` 60, `FIRE_TRAIL.DMG` 6, cooking
heal `92 + tier×8`, `cookedMinnow` 23, hardness `BASE_BONUS` 1.0417, PvP
`dmgBase` 10, anticheat floor 21, sell value `ceil(tierMult×base×0.5)`.
Pins: `mirror-audit`, `prog3`, `display-dps`, `anticheat` (`coins === 27`),
`tools/balance-sim.mjs` (copied variance and curve), `tools/audit-validator.py`
(already has a `--scale` mode and already flags the rounding collapse at
`:199`), `tools/verify-prog3-retune.mjs`, `mp-orbline` (DPS ratio).

**(b) Normalization — inferred.** With k = 5: sword rolls 1.0–1.67 (shown
as 1 or 2), bow 1.54–2.05 (almost always 2), a level-up adds 0.3 (visible
every third level as a +1 step), the crit anchor is 2, and `max(1,…)`
floors dominate. Hits-to-kill parity cannot be preserved by division; it
has to be **re-tuned as an integer table per archetype and level** with
the sim, which is a balance pass the owner should see in a table before
it is coded. T2 flats banked in stored blobs (`ps.t2Flat`) need a shrink
migration; leaderboard damage totals will be mixed-scale unless rescaled.
Alternative reading: keep the internal scale and rescale only the display
(exact TTK, but "1 + 2 + 1" will not add up to the HP bar) — D1.

**Blast radius if patched in isolation.** Client-only: tooltips and popups
disagree with the server. Server-only: the anticheat floor is 5× too loose
(cheat headroom) or too strict; XP rate falls 5×; every weapon sells for a
fifth; potions heal 5× relative to HP.

**Severity.** P1 as a product ask; engineering risk high. **Evidence that
changes the read:** the owner choosing display-only (then it is a small
client PR) or accepting an integer balance pass (then a design note comes
first). **Next action:** design note with the sim's TTK table, then one
lockstep PR (S3).

**(c) Attributes — known.** The grid is PROG3 (`server/src/prog3.js:44-215`,
mirror `src/data/prog3.js`; spec `docs/specs/progression-v3.md` — the
build-skill-progression and character-build specs describe the retired 6×5
grid). Elemental damage is a **global** `BODY.elem` channel consumed by
`elemAttackStat(ps)` with no weapon argument at four sites (`combat.js:116,
954`, `burst.js:214`, `elemental.js:217`). **No elemental resistance exists**
(only the 5 % cooking buff, `combat.js:239`, and a client-only stone-amulet
field). Max mana is **not a stat**: `100 + magicLvl×2.5` (`prog3.js:582`).
Touch points: PROG3 tables both sides, `prog3FreshAlloc/Atk`,
`_handleProg3Allocate` whitelist (`:730-806`), `_prog3Recompute`, client
`recalcDerived` (`gameSystems.js:5390`), HeroExpanded rows, mirror-audit
§12, migration v15 appended to `MIGRATIONS` plus the `_sanitizeProg3` join
heal (`prog3.js:411`). **Inferred:** refunded elem points can only land in
the pool (v11 precedent). **Severity** P2; **next action** S2 after D12.

**(d) Kill popup — known.** `monster_hit.dmg` is `actualDmg`, clamped to
remaining HP; `rawDmg` is a local never sent (`combat.js:903-905,
1082-1105`). Additive payload field; contribution and XP keep `actualDmg`.
Deploy-order safe if the client falls back to `dmg`. Small; S1.

**(e) Mayor damage numbers — known.** Entirely client-local: NPCs carry
`hp:100, noHp:true` (`gameDisplay.js:3742+`); the melee sweep hits any
alive NPC in arc and pops `'' + npcDmg` (`monsterCombat.js:2706-2750`).
Gate the popup on `!noHp`. Trivial; H3.

**(f) Staff splash — known.** No splash today: one monster per bolt
(`projectiles.js:582,608,728`), staff never pierces; Detonation only widens
the single-target hit radius (`aoeCap/aoeCone` are read nowhere). The
server receives one `monster_damage` per target and rolls **full** damage
for each (`combat.js:893`), so a 50 % splash **needs a server change**: a
`splash` intent halved under `_maxDmgForAttacker`, or a server radius scan
like `burst.js:184-223`. Client-sent per-target hits at full damage would
be an exploit, not a feature. S1 after D13.

### 2.2 General store (lane M)

**Known.** The order book (`server/src/market.js`, mixed into the GameRoom,
HTTP `/api/market*`, `settled: true`) lists **only stash weapons**
(`:247-254`); buy orders escrow gold; matching is a composite-key bucket
(`category:subtype:tierKey:el1:el2`) where the resting order sets the
price and a resting buy *is* a bid per bucket, executed immediately on
crossing — no auction close. Settlement is credit-first/delete-last via
`_creditPlayer` (kinds: gold, item, weapon only — `inbox.js:171-199`);
`_escrowTakeItem` exists for stackables; `trade2.js:380-504` is the
cleanest escrow → deliver/refund → stamp-checked sweep template. The
client Exchange (`ExchangePanel.jsx`, opened by the town marketplace
building) sells only `weaponStash`, still carries a legacy self-credit
behind `!data.settled` (`:664-678`), and is gated on no cap. The retired
`marketplace.js` DO is exported only for `wrangler.toml`; nothing routes to
it (handoff rule 23: leave it). Armor/legs/shield/cosmetic/amulet stashes
are **client-local** (`gameSystems.js:5358-5364`, `wsClient.js:1695`,
`grids.js:860` "armor lives in a client-only armorStash"); the server holds
only the equipped slot, and rule 16 forbids escrowing the client's blob.
Sold notification today: `_creditPlayer(source:'market')` → `inbox_delivered`
(PRIVILEGED) online, `inbox:<pid>` drained on join offline; the client
renders a system chat line only (`gameEvents.js:1220-1250`). The **anchor**
is a client-local bag pin (`inventoryLocks.js`, in-memory `Map`, not
persisted; button `ItemDetailPopup.jsx:1367-1369`) — not on-chain, not a
shortcut. Bag filters: `bagFilterBus.js:46-52` `CATEGORIES = all, weapon,
armor, potion, crafting`, `classify()` in `InventoryPanel.jsx:34-59`.

**Inferred.** Phase 1 (stackables + weapons, buy-now + resting bids, toast,
list-from-bag, anchor icon) is medium and reuses most of market.js; true
per-listing auctions add a bid record, per-bid gold escrow, outbid refunds
with deterministic opIds and lazy resolution (rule 12: no alarms); gear
listings are large because the gear stash must move server-side first.
Unique weapons (quality/hardness/temper) fit the bucket book poorly, which
argues for the per-listing model from the start.

**Blast radius.** Economy: duplication or loss if escrow/settlement order,
opId idempotency or the registry are wrong (the exact hole marketplace.md
closed). **Severity** P1 product, high risk. **Evidence that changes the
read:** D11 narrowing phase 1. **Next action** M1; register new prefixes;
new narrow cap in `join.js` + `CAP_GATES`; `market.js:66-69` shows the
taxonomy is client-supplied — the store must display server-derived item
fields.

### 2.3 Loot, death, slime burst, persistence, audio (lane L)

**Loot — known/inferred:** see §0.1 item 1. Secondary contributors (known):
the pet vacuum shares `_pickupPending` (`BroTown.jsx:5849-5858`) and a
`no-pet` reject holds the flag 5 s against the manual grab; the movement
validator drops silently and refreshes `lastMoveAt` (`movement.js:250-260,
296`) so a client more than about 91 px off while streaming stays stuck
until the 1 s keepalive — not tripped by the dash (≤60 px/packet). Server
expires kill piles at 60 s; the client never expires remnants — ghosts only
if `loot_despawn` is missed. **Severity P0** (gold lost, ongoing).
**Evidence:** a capture of a pile at 60–160 px from its drop point while
the player stands near the drop point confirms; a stuck pile within 20 px
of the player would refute the formula reading and point at the reject
loop. **Next action** L1 local fix + harness.

**Die and recover at once — inferred.** Server refuses pickup while dead
(`index.js:3790`) and the pile spawns after `ps.dead = true`. The real
sequence: the death pile sits inside the pack; recovering it sets
`S._lootFreezeUntil = now + 500` (`wsClient.js:2569`), the player is frozen
half a second in the pack, dies, and `_spawnDeathPile` re-drops the bag —
no guard either way. The client-local town/dungeon death path also
self-credits with no dead guard (`groundLoot.js:220`; TRAPS #32 territory).
**Severity P1** (items). **Next action** L2.

**Blue slime burst — known chain, inferred trigger.** `telegraph.js:595/621`
swell → execute + kill in one tick; the renderer stamps `_slimeDeathStart`
on the first `alive=false` and draws the burst for only **400 ms**
(`entityRenderer.js:6546,6737`). A frame hitch longer than that at the kill
frame elapses the window unseen; any throw in `_updateMonsters` aborts the
rest of that frame's loop (`pixiRenderer.js:323`, the `mp-slimeburst`
incident). **Severity P2.** **Evidence:** a console error at kill time
would flip this from timing to a throw. **Next action** L2.

**Continue list after force-close — known: no data loss.** The roster
`bt_chars` is written at boot, at join and every 30 s, mirrored to a cookie;
logout writes nothing extra (`GameApp.jsx:632-636`); the server saves per
mutation and flushes on `webSocketClose`. Guest tabs are excluded by design,
and a player normally never *sees* Continue after a force-close because
`bt_resume` auto-rejoins within 10 minutes. **Cannot reproduce from code.**
Ask: guest tab, private browsing, or how long after the close?

**Sound after return — known gap:** see §0.1 item 2. **Severity P0** (the
game goes silent until reload). **Next action** L3.

**Coin sound — known:** none is audible; `beep()` is a no-op since
v2.3.1103 (owner removed all synthesized audio) and `collect()` is two
beeps; no coin asset exists. Hook: `_applyLootCredit` when `payload.coins
> 0`; `SFX_MANIFEST` is eager-loaded, which satisfies the preload law.
Needs an approved sound file (D15).

### 2.4 Input controls (lane C-in)

**Known.** Since v2.3.2258 the right side is two surfaces: the right-half
zone is a joystick again (drag aims and auto-attacks, `BroTown.jsx:8298`)
and the disc is the contextual button; `docs/specs/control-redesign.md`
stops at v2.3.2251 — later history lives only in code comments. Bow and
staff never auto-lock (`targeting.js:~250`); a tap is their only lock. Bow
cadence is 495 ms (`gameSystems.js:5557`). Double-tap **left** stick is the
weapon swap (`BroTown.jsx` ~8848 → `_desktopCycleWeapon` :7881, which drops
the shield on a swap to ranged/staff). Every combat button is right-side
and measured off `RBTN`; nothing orbits the left disc. The special fires
from `doSpecialAttack` (`:7486`) via the flick classifier. For bow/staff
`shieldButtonLive` returns false (`shieldToggle.js:~112`, v2.3.2446) and a
right-disc double tap opens a steerable hold (`:8195-8290`); melee has no
right double-tap because tap one already lunges (`maybeSwordDash`). The
shield angle source is `shieldAimAngle` (lock → `_shieldAngle` →
`_aimAngle` → facing). `ShieldButton.jsx:~55-70` places the button under
the disc; the ability column sits where "left of the disc" would go. The
attack disc already fades to 0.45 when `_hot` (v2.3.2263); no HUD-side
monster screen-rect list exists, but projection is one line.

**Inferred.** A left Special button is a new component that must swallow
its touches (left zone = movement layer, left swipe = dodge). Restoring
the shield for bow/staff is one deleted early-return plus a nearest-monster
fallback; retiring the double-tap guard is what makes a right double-tap
swap unambiguous (D8). All client-only; `blocking`/`ba` ride `move`, no
caps flag. **Blast radius** if done piecemeal: two gestures on one
classifier. **Severity P1** (owner's control redesign). **Next action** C1.

### 2.5 Bow rework, hits, feel, monsters (lanes C-bow, F, S1)

**Bow firing — known.** The gate (`monsterCombat.js:1450-1451`) fires on
cadence whenever `autoAttack` (or an engage swing) is on and nothing blocks;
**no on-target check exists**. Aim = `rangedAimAngle` (lock → live aim →
last aim → facing). The sight stream (`effectsRenderer.js:5142-5202`) is
drawn along the same angle for `BOW_RANGE_PX × bowRangeMult` and is **not
clipped** at monsters. Arrow speed `8 × _rangeMult` px/frame (480 px/s),
plant cap 675 (`projectiles.js:461,572`); Longshot scales both. Server:
ranged and staff get no proximity gate — zone, 210 ms per-(player,monster)
cadence, special ≤3 per 1200 ms, damage cap; PvP `RANGE_CAP` 950 at impact;
**no travel-time check**, so 3× speed has no anticheat coupling.
**Inferred:** a ray-vs-circle test at the fire site that does not stamp
`swingTimer` on a miss gives "queue until lined up, then fire at once" for
free; guards to update: segment cap 200 px, trail teleport 80 px,
`mp-arrowdt` (expects 480 px/s). **Severity P1.** **Next action** C2.

**Two stuck arrows — known.** `projectiles.js:958-1008` pushes a plain
`_stuckArrows` stub for every non-staff arrow with no `isSpecial` check,
and `:1180-1183` also sets `a.stuckIn` for the special art. One condition.
**Stuck below the skeleton's feet — known:** the anchor table (`:990-1006`)
has fireGoblin −30 and slime −17, everything else `yAnchor 0` (feet) while
`monsterBodyOffsetY` is 48/60. **Arrow outline — known history:** the arrow
art has a keyline (`ARROW_PINE`, `effectsRenderer.js:531-560`); bake a
brighter one with `tools/gear/make-pine-arrow.mjs`, avoid a runtime filter
(the iOS `drop-shadow` history). C3.

**Hit detection — known:** §0.1 item 4. Test is a swept capsule (front
28.5, half 6.6) vs a circle at `renderY − 23`; `_hitR` slime 27, fireGoblin
26, snowman 32, mummy 40, skeleton 50, `× staffAoeMult`, **special ×3**.
Client-decided; the server caps damage only. **Severity P1** (feel and
fairness). **Evidence:** measuring the slime sprite's visual radius. C3.

**Melee ring — known.** Reach test: `dist − monsterMeleeHitRadius ≤
GS_OUTER_RADIUS 72` (fodder → 96 px). The dash has **no trigger radius**:
it fires on the melee press with any lock up to `DASH_MAX_REACH_PX` 900;
the 220 px `TARGET_PERIMETER_PX` supplies the lock. The notice "!" is the
server `tg` transition → `_aggroTs` (`wsClient.js:815-818`, aggro range
120). Existing ring drawer: `engageRingGfx` (`effectsRenderer.js:4522-4560`).
So "close enough to dash" is not a state; define the ring as melee reach
around the aggroed or locked monster. Client-only. F1.

**Stopping distance — known.** Server-only: chase while `attackDist > 45`,
attack at ≤45 (`index.js:1978-1985, 2085-2106`); no player–monster
separation server-side; client push-out radii are cosmetic. Coupling: widen
the swing reach or monsters stop out of reach (§0.2). S1 after D14.

**Pounce — known.** `KITS.stalker` (`telegraph.js:95`, leap 140, radius
46); stalkers spawn only in sky/Desert Winds and are skinned as the mummy.
Removing it leaves the universal basic wind-up swing. Server-only;
`mirror-audit` only requires server kits ⊆ client labels. S1.

**Skeleton animation — known.** Walk frames are distance-driven;
`walkDistPerFrame 3.0` (`monsterVariants.js:122`) on 8-frame strips at
about 79 px/s → about 3.3 loops/s. Raise the constant. **Fireball —
known:** `projectileScalePx: 24`, visual only. F1.

**Staff orbs vanishing in Desert Winds — cannot judge from code.** Speed 5,
life 135 → 675 px; `mp-orbrange` asserts it in a real client. Suspects
(inferred): the orb dies on its first hit against a nearer or transforming
mummy (non-pierce), or impact at the skeleton's body centre reads as short.
Needs a sky-zone repro (F2).

**Debris and sounds — known:** §0.2 (debris). Melee hit sounds are
material-keyed (v2.3.2452); arrows and bolts still play flat `arrow-hit` /
`magicHit` (`projectiles.js:875-876`). C3.

**First-lock flash — known.** The chip (`effectsRenderer.js` ~4790-4945)
has no lock-start time for auto locks (`lockedTarget.at` only from
`tapStealable`); stamp it on every lock and lerp colour and bob amplitude
for the first second, inside the headroom gates (`mp-lockchip` 12–24 px). F1.

### 2.6 Harvesting and preload (lane P)

**Skin during harvesting — known.** Mining uses the real (tinted) body;
**fishing** uses the raw sheet by design because the pink rod and line are
baked into it (`entityRenderer.js:10115`; v2.3.2304 names the fix: re-cut
the fish art with the rod on its own layer); **woodcutting** loads the chop
strip with plain `_fxLoad` and never passes `recolorStandInSkin`, which
cook and fire do (`effectsRenderer.js:1705` vs `:2563, :2637`); local and
peer lumberjacks share one strip. `mp-standinskin` covers only the sword
and bow strips. Chop = code fix; fish = art.

**Animation continues during gestures — known design, inferred defects.**
v2.3.2384 feeds the demo phase into the body on purpose ("fixing only the
button would have left the frozen character behind it"); before it the
body moved only with the thumb — that is the "previously working". Two
concrete sync-loss paths: the harvest starts on `touchstart`
(`BroTown.jsx:9152-9162`) so that finger's `pointerdown` already fired
while `S._extraction` was null and `onPointerDown` bailed
(`ExtractionSwipeLayer.jsx:198`) — a thumb held through the wind-up never
sets `_gestureDown` and the demo keeps playing (INFERRED, DOM ordering);
and `onPointerUp` has no `pointerId` check (`:403-414`) so any other
finger lifting clears the gesture. `mp-gcue` sets `_gestureDown` directly —
the real pointer path is untested.

**New wind-up bar flow — known phases.** `startExtraction`
(`lifeSkillRewards.js:89-150`): `waiting` for 2–10 s (base 4 s) with the
button ring already filling `startedAt → windowOpensAt`
(`BroTown.jsx:5204`), then `ready` with **no timeout** since v2.3.1416, reps
counted client-side (mining 3, woodcutting 3, fishing 1.5, cooking 1) →
`succeedExtraction` → one `node_strike`. Server (`gathering.js:684-704`)
refuses only `too-early`; reps never reach it. So the bar above the head,
the 95 % stall and thumb-synced frames are client-only. **Severity P2.**

**Chop size — known/inferred:** §0.2. **Preload — known:** §0.1 item 3.
**Severity P1** (owner directive). P1 then P2.

### 2.7 Sprite art (lane A)

Classification: **A** = rule/table fix in code, **B** = asset fix with a
named tool, **C** = needs a screenshot or the source art.

| Item | Class | Known | Next |
|---|---|---|---|
| Copper legs jog-east bluish feet | C→B | copper = steel art × multiply tint `0xFF9E58`; a multiply cannot add blue; either blue texels in `steelgreaves/jog-east.png` boot rows or the body's shoes peeking past the 6 px erase | measure with `qa-gear-sheet.mjs --slots=legs --poses=jog` |
| Shirtless idle bow-shot boxed squares S/SE/E | C | idle bow draws `bow-<dir>-body.png` baked with the player's drawings (v2.3.2429); reads like 16 px body-ink cells | ask: with no ink drawn too? |
| South idle bow-shot left eye black | B | stand-ins get `eyeT=null` so eyes are sheet art; `tools/fix_bow_eye.mjs` rebuilt frame 0 and calls frame 2 "dark-eyed" | repaint that eye, bump `BOW_ART_VERSION` |
| Face tattoo lower half missing, jog S/E bow-shot | A (mechanism inferred) | `splitSkinRegions` (`playerDecal.js:844-869`) defines the face as skin strictly above the torso band's first row; on bow torso strips that row is at jaw height | seed the face from the head bbox |
| Cape not hidden on the roll | A, one line, **D6** | `_CAPE_HIDDEN_POSES = {swing, bowshot, chop, cook, fire}` (`entityRenderer.js:1508`); `dodge` removed deliberately in v2.3.2129 | roll-only hide |
| SE jog armored legs gap | A/B | SE mirrors `jog-southwest`; the plate–greaves seam is covered by the chain belt whose band height is a per-direction **median** + 4 (`tools/gen_jog_belt_table.py`) — wider frames show through | regenerate with per-frame max; if SW is clean, suspect mirror handling |
| Lil Bro shirt transparent | B, **D15** | `tools/import_npc_walk.py:79-83` keys out any pixel with r,g,b > 232 ("white grid lines") and the shirt is white; the source sheet is not in the repo | owner re-supplies the sheet, fix the key |
| Cape behind the body on east jog bow attack | A | `_placeStandInCapeOn` (`effectsRenderer.js:306-330`) forces the back half under every split-facing stand-in; `mp-capeattack` pins it | per-(stand-in, dir) exception, owner render sign-off |
| No cape on south shield block | A | south is the only facing that blocks on the real body; while moving `_placeSouthBlockLegs` hides the body sprite and `_placeCape` bails on `!sb.visible` (`:2078`, `:1668`) | seat the cape from the band composite |
| No cape in the SW equipment preview | A (feature) | `characterPortrait.js` has no cape code at all; portrait `GEAR_ART_VER` is also stale (2.3.1656 vs world 2.3.2174) | add cape compositing to the portrait |
| Armored legs icon too small in the slot | B | all slots draw at 80 %/contain; `greaves-copper.webp` is a tint of `greaves.webp` whose padding is the cause | re-crop, re-run `make-metal-icons.mjs` |
| Recolored tee jog-south skin sliver at the waist | B/C | no runtime mask; slivers are sealed into the sheet by `seal-shirt-edges.mjs` (≤2 px); a dark tint exposes what is left | run `mp-southshirt`, reseal if > 0, bump `GEAR_VERSION` + `SHIRT_ART_VER` |
| Tee jog-east shoulder bare again | B/C | the v2.3.2066 sleeve bake was **reverted in v2.3.2140** to the artist's unsleeved art after v2.3.2134 found the real cause (an arm capsule stamping a bare body clone over the tee, east-only, in combat); `mp-shirtarm` now only reports the bare window | ask: in combat or not? In combat → capsule regression (`entityRenderer.js:11091-11117`); out of combat → TRAPS §30's answer stands: seven hand-drawn frames |
| SW run sword in front of the body | A, one line, **D7** | `heldWeaponInFront` (`:4225`): greatsword in front at SW by v2.3.1787 owner request; sword and staff already behind | after D7 |

Shared machinery: three placement paths (walking `getBodyFrame`, stand-in
`_bakeBodyStrip` — no eye colour, no `steadyArt` —, and the portrait — no
cape, stale versions); cape visibility = `_CAPE_HIDDEN_POSES` + the
`sb.visible` gate; weapon z-order = `inFrontInHand` + `heldWeaponInFront`.
The only image codec in the sandbox is Chromium (no PIL): use
`qa-gear-sheet.mjs`, `inspect-sheets.mjs` and the `mp-*` pixel metrics.

### 2.8 HUD, nameplates, targeting, landscape (lane H)

**Known.** Tap hit-test never refuses a far monster; the override is
`tapStealable()` (`targeting.js`, v2.3.2263): melee only, after
`TAP_PIN_MS` 900 a rival ≥12 % nearer steals the tap lock — the owner's own
"go by the nearest" directive (D3). Red plate = `alarm ? 0x7A1D1D` fill /
`0xFF8A8A` stroke (`entityRenderer.js:4972`) with an AA trade-off recorded
in the comment. Monster pill font 8 (`_attachNamePill(hpUi, 8, …)`, lowered
12 → 8 in v2.3.2265), level 7; `setPlateZoom` half-compensates, so at a
combat zone's 0.587 scale the name is about 6 CSS px (inferred arithmetic);
the v2.3.2466 11 px floor deliberately exempted world text (D5). Per-monster
combat facts the client already has for hiding the plate: `_atkMeUntil`,
`_aggroTs`, `lockedTarget.ref`, `_engagedId` (D4). Attack-disc ghosting:
~25 lines in the existing per-frame resolver. Landscape fold chip is 34×34
with a 6 px border-image (about 22 px of glyph) — under the 44 pt minimum.
Mana bar border in landscape: two candidates (`VitalBar.jsx:74` near-
invisible border, or the in-world `bar-mp.webp` pill) — needs a screenshot.
Landscape zoom: §0.2. **Top rail overlap — known:** canvas height = viewport
− band; `.bt-zone-header` is `position:fixed; top:-4px` over the canvas;
the camera clamps to `y ≥ 0` and the walk clamp is `P.y ≥ hs`
(`BroTown.jsx:4894`) — town included; the bottom already has
`_FOOT_MARGIN = 80` (`:4892`). A `_HEAD_MARGIN` is the mirror fix.
Designs button: `.bt-paint-copy` is deliberately quiet; reusable finite
pulse `bt-nav-pulse`; LANTERN-SLATE allows finite pulses only. Trade
cancel: server broadcasts `trade2_state {state:'cancelled', reason}`; the
client maps reasons but only to a world popup (`gameEvents.js:3335-3349`) —
add the chat line. **Severity P2** across the cluster.

### 2.9 Tutorial (lane H1)

**Known.** Dashboard default = `dashMinBus.min` from `bt_dash_min` (open);
no first-join case; `preTutorial(rpg)` already identifies a brand-new bro;
the fold chips are untransformed (TRAPS #65 does not apply). Turn-in is
`turnInQuest()` (`quests.js:87`) and the coach already gates on
`q.tut_1 === 'turnedIn'`; the nav id is `dashboard`. The quest indicator
renders only for an `active` quest — between turning in `tut_1` and
accepting `tut_2` it is absent **by design**, which is the likely "missing
once" (a UX gap, not a bug). **Inferred, strong:** the screen-sized oval
after the swap is the `blockRanged` lesson (v2.3.2269) falling back to
`[data-joyzone="R"]` — the fixed right half of the screen — with
`shape:'circle'` and the pulse scale, because `measure()` runs before the
disc hold is reconciled and the disc fails `reachable()`. Drop the zone
fallback and add a size-sanity guard. **Severity P2** (first minutes of
play). H1.

---

## 3. Leftovers — wait, or cannot be judged

- **Continue list after a force-close** — no data loss in code; needs the
  circumstances (§2.3).
- **Quest indicator missing once** — by design between turn-in and accept;
  decide whether the indicator should show the `available` quest.
- **Staff orbs vanishing** — needs a Desert Winds repro (F2).
- **Copper feet, shirtless-bow squares, tee shoulder, mana border, nameplate
  design, Lil Bro sheet, debris sheets, coin sound** — blocked on D15.
- **Fishing skin tone** — art: the rod must be re-cut onto its own layer.
- **Per-listing auctions and gear listings in the store** — after phase 1
  and the gear stash.
- **Landscape zoom in combat zones** — cannot without void; town/worldview
  only (D10).
- **Elemental resistance** — nothing to resist until D12 names the sources.

## 4. Already exists — do not rebuild

- Hit debris and ground decals (v2.3.2200) — live on every hit path; only
  the art is missing.
- Material-keyed hit sounds for melee (v2.3.2452) — extend to projectiles.
- The bow sight stream (v2.3.2448) — clip it, do not redraw it.
- The dash in the move-broadcast gate (v2.3.2263) — TRAPS §46 is closed.
- Trade-cancel feedback — a world popup exists; add the chat line.
- Audio resume on visibilitychange — harness passes; the gap is `pageshow`.
- The button wind-up ring during `waiting` — it is the data source for the
  bar above the head.
- Chop stand-in size bumps — three so far; the fourth must be the build
  scale.
- A per-kill remnant-pile harness (`mp-remnant`), a loot-zone harness
  (`mp-lootzone`) and a dash-hit harness (`mp-dashhit`) — the loot fix
  extends these rather than starting new.
- `tools/audit-validator.py --scale` and `tools/balance-sim.mjs` — the
  normalization preview tools already exist.

---

## 5. Owner input received after the first cut (2026-09-14, later the same day)

The owner answered part of §0.4 with four mockups, a sound file and three
statements. Sessions launched from this plan read THIS section before their
lane brief; where it disagrees with §1 or §2 above, this section wins.

### 5.1 Model choice

The owner chose **Opus 5 for every lane** ("I'll trust that you've
structured each request correctly so that Opus 5 high is capable of doing
them all"). The lane table's Fable picks are therefore advisory only. The
effort tier is not settable when a session is created from another session;
launched sessions run at the environment's default effort. Every brief in
§5.7 is written more prescriptively than §1.3 to compensate: named files,
named functions, the order of steps, and the harness that proves each step.

### 5.2 The nameplate design (D4, D5 answered)

Mockup: `docs/triage-2026-09-14/assets/nameplate-design.png` (Frost Ridge,
portrait). What it specifies, read off the image:

- **Monster plate** = a rounded dark-navy pill, bold white name, and the
  level in a white circular badge at the pill's right end (dark digits).
  The pill's 2 px border is coloured by **difficulty relative to the
  player's level**, and the mock's own legend names the four bands: green
  "Low", yellow "Near", orange "High", red "Danger". The mock's player is
  level 3 and shows level 1 green, level 2 yellow, level 4 orange, level 6
  red. Default thresholds (D16, confirm): diff ≤ −2 green; −1 to 0 yellow;
  +1 to +2 orange; ≥ +3 red.
- **Player plate** = same pill with a gold border and the level badge
  ("Bronze Gravy 3").
- **NPC plate** (second mockup, town) = dark rounded rectangle, white name,
  small gold role or level line under it ("Mayor Bro / Mayor",
  "Rex Bash / LV 3").
- Text is far larger than today's 8 pt world text: the pill reads at about
  14–15 CSS px on a phone. This settles D5 — the new plate sets its own
  size as a CSS-pixel value, not a world-scaled font.
- **In combat the monster pill hides** (the backlog ask). The HP bar stays.
  Because a red border now means "Danger", the "monster is attacking you"
  cue (v2.3.2295, D4) moves off the plate: default is a red tint or ring on
  the HP bar frame while `_atkMeUntil` is live (confirm).
- The mock also shows a small orange triangle above the locked monster: the
  existing lock chip, unchanged.

### 5.3 The Points accordion (S2's UI, answered)

Mockup: `docs/triage-2026-09-14/assets/points-accordion.png`. The Points
tab becomes an accordion: one collapsible section per combat skill
(MELEE, BOW, STAFF) with the skill's icon, its point total and a chevron in
the header; inside, one tile per channel (icon, channel name, current
value, and a − / count / + row). The mock shows DAMAGE, CRIT, CRIT DMG, ATK
SPD per skill; **the owner adds ELEM PWR to each skill's section** (it is
no longer shared). Below the accordions a **SHARED STATS** header carries
the three per-skill totals and the shared tiles: the mock shows MAX HP,
DEFENSE, STAMINA, DODGE (and ELEM PWR, which moves out); per the backlog
**MAX MANA and ELEM RESIST join the shared row**. Channels that exist in
code but are not in the mock stay in their skill's section — list them in
the PR rather than dropping them. Owner rows keep the "i" info button.

### 5.4 The coin sound (D15 partly answered)

`public/sfx/loot/coin-pickup.mp3` (38 KB, MP3 160 kbps 24 kHz, about two
seconds; source: "Spilled Coins", freesound_community, id 101296, as
supplied by the owner). Lane L hangs it on `_applyLootCredit` when
`payload.coins > 0`, registers it in `SFX_MANIFEST` under a new `loot`
group, and adds a CREDITS.md row (license as the owner confirms; assumed
Pixabay Content License from the file name — **outstanding**). Never
re-enable `beep()`.

### 5.5 Lil Bro

The owner says the NPC "was already given as an art asset". What the repo
holds is only the IMPORTED result (`public/sprites/npc/lil-bro-walk-*.webp`);
the source sheet is not under `tools/gear/src-art/npc` (only the Mayor's
files are) and the clone is shallow, so it cannot be recovered from
history. Two routes for lane A: the owner re-uploads the source sheet and
`tools/import_npc_walk.py` is re-run with the white test removed from
`is_key()`; or, without the source, fill the transparent holes that lie
INSIDE the body silhouette with the shirt's white (the same enclosed-hole
idea as `tools/fill_gear_gaps.py`), verified at 20× on all eight facings.

### 5.6 New lane T — the tattoo editor zone picker

Mockup `docs/triage-2026-09-14/assets/tattoo-editor-mock.png`; UI art
`tools/gear/src-art/creator/tattoo-zone-ui.png` (a contact sheet: top row
four square zone frames — two sizes, each in a plain and a glowing
"selected" state; middle row a flip button, a previous and a next chevron
button, and an "i" button; bottom row two label plates, "Tap a zone to edit"
and "Front • Chest + Arms"). Slice it by measuring the cells, not by
assuming a grid (TRAPS §59).

What changes: the small character preview beside the editor gets two
tappable zone frames drawn over the figure (head, torso). Tapping one loads
that zone's canvas into the big grid; the selected frame glows. The flip
button turns the preview to the **back** (the `north` sheet already renders
back art, v2.3.2422) and the two frames then address the back-head and
back-torso canvases. The label plate names the side and zone. The same
picker drives shirt and pants designs (front/back). The zone model already
exists in `src/ui/panels/BodyInk.jsx` (`BACK_TARGET` / `FRONT_OF`, the MODE
strip, :133–156) — this replaces the MODE strip and Front/Back switch as
the way to choose a canvas, not the canvases. Editor: `PlayerPaint.jsx`.
Specs: `docs/specs/tattoo-front-and-back.md`, `creator-ink-card.md`;
history v2.3.2455–2470 (design placement). Harnesses: `mp-bodyink`,
`mp-inkback`, `mp-inkframes`, `mp-inkplace`, `mp-tattoos`, `mp-facetat`,
`mp-designs`, `mp-ccink`.

### 5.7 What was launched from this session

Four sessions were created from this session on Opus 5, each on its own
branch from `main`, with the briefs below; the remaining lanes (P, H, T, F,
A) are queued behind them so no more than four run at once. Each session
reads this document from `origin/claude/game-backlog-triage-akaog2` (PR
#613) until that PR merges. Branches: `claude/lane-L-loot`,
`claude/lane-C-controls-bow`, `claude/lane-S-server-combat`,
`claude/lane-M-store`.

### 5.8 Owner answers to §0.4 (2026-09-14, later) — every decision is now closed

Sessions read this subsection as the final word; it supersedes the
defaults stated earlier in this document.

- **D1 normalization → DISPLAY-ONLY rescaling** (the owner's lean, and
  the recommendation: it delivers the mental model at a fraction of the
  cost, with no gameplay risk, and `k = 1` restores today's numbers). Spec:
  one client-side display scale `k = 5` (the lowest level-1 roll is the
  sword's 5.0) applied by ONE exported helper in `src/data/gameSystems.js`
  to every player-facing combat number: damage popups, monster HP text and
  bar labels, player HP, heals and potion values, damage-range / DPS /
  tooltip readouts, PvP and duel numbers, chat combat lines. Internal math,
  the wire and the server are untouched. Consistency rule: a non-kill
  popup shows the change in DISPLAYED HP — `ceil(before/k) − ceil(after/k)`
  — so the hits add up to the bar; the kill popup shows `round(rawDmg/k)`
  (lane S PR 1 adds `rawDmg`). Mana and stamina are NOT scaled (default;
  confirm). Assigned to **lane S as its PR 4**, replacing the design note.
  Surfaces to audit: `gameEvents.js` popups, `entityRenderer.js` HP text
  (~7766 — change only the call site; lane H's nameplate work adopts the
  same helper), `HeroExpanded.jsx` stats, item cards and tooltips
  (`calcDisplayDps`), `display-dps.test.mjs` pins, harnesses `mp-fakenum`,
  `mp-dmgicon`, `mp-hpbar`, `mp-resbars`, `mp-critpreview`.
- **D2 yes**: player HP is displayed ÷k too. **D3 yes**: a tap lock is
  absolute. **D9 yes**: block left of the disc, abilities above. **D12
  yes**: resistance covers every elemental-pipeline damage the player
  takes. **D13 yes**: 60 px, basic bolts only, 50 %. **D14 yes**: 72 px
  stop with matching reach. **D16 yes**: the four difficulty bands as
  stated in §5.2.
- **D4 / "attacking you" → the plate's BACKGROUND FILL turns bright red
  while the monster is attacking you; the border rules do not change.**
  Combined with "the plate disappears in active combat", the default
  precedence is: hidden while the monster is YOUR engaged target (locked,
  or hit by you within the last 3 s); otherwise bright-red fill while
  `_atkMeUntil` is live; otherwise the difficulty border (confirm).
- **D6 → hide the cape on the dodge pose INCLUDING the loot bend**
  (reverses v2.3.2129 in full: the cape hung in mid-air while the player
  crouched). Add `dodge` (and the pickup pose if it is separate) back to
  `_CAPE_HIDDEN_POSES`.
- **D7 → greatsword at southwest goes BEHIND the body for jog/idle AND for
  the attack swing** (it is in the right hand, facing away from the camera;
  the character should occlude the swing instead of the blade passing
  through the body). Southeast and east are unchanged.
- **D10 → landscape zoom: town/worldview only**; combat zones stay.
- **D11 / store phases 2–3 → proceed after the owner reviews phase 1.**
  Lane M stops after its two PRs; M2 (server gear stash) and M3 (gear
  listings) are queued behind that review.
- **Coin sound → royalty free, owner-supplied.** The CREDITS.md row says
  so; no "confirm" marker.
- **Lil Bro → skipped for now.** Drop it from lane A.
- **Mana bar in landscape → reuse the existing block-style bar asset**
  (the mana blocks that shipped with the stamina block asset). Lane H3.
- **Shirtless-bow "boxed squares" → resolved** (it was a tattoo, working
  as designed). Drop it.
- **Copper feet → the body's SHOES poke out beneath the copper leggings.**
  The masked-body erase for the legs slot (6 px dilation) or the greaves'
  boot rows; lane A2 measures with `qa-gear-sheet.mjs` and fixes the
  erase/boot coverage, with 20× renders in the PR.
- **Tee shoulder, east → while JOGGING, not in combat; the owner suspects
  the shield's layering.** Lane A1 reproduces jog-east with and without a
  shield equipped; if the bare shoulder appears only with the shield, the
  cause is the shield placement's body clone or mask (the same family as
  v2.3.2134's capsule), not the tee art. Only then fall back to §2.7's
  hand-drawn-frames answer.
- **Debris → use the fallback art for now.** Lane F1 makes the fallback
  burst and decals last about 5 s and read clearly; no sheets needed.
