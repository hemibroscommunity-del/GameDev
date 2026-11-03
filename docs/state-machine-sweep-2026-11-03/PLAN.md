# What to do next: the fix plan after three adversarial reviews (v2.3.4153)

The draft was `plan-draft.md`. Three agents then tried to break it, each with its own lens:

- `reviews/R1.md`: regressions and the house rules (4 kept, 23 changed, 3 moved).
- `reviews/R2.md`: root causes and simpler fixes (6 kept, 23 changed, 1 moved).
- `reviews/R3.md`: the owner's reality and what's missing (10 kept, 17 changed, 3 moved).

None of the three dropped anything. What follows is what survived. The item-by-item reasons, with
path:line evidence, are in the three review files.

## Before Thursday's expo (2026-11-05)

The biggest risk isn't in the code. The judges will probably share one venue internet address, and
the game allows each address 16 places and 20 connections a minute (`server/src/flood.js:74-77`).
The account door allows 20 checks a minute per address (`server/src/account.js:39-40`). A refused
judge sees "BroTown is full".

1. **Raise the per-address limits for the expo.**
   - The live switches `ip_sockets` and `ip_joins_min` exist for exactly this case
     (`docs/OPERATIONS.md:477-486`). The owner must not run commands, so pick one:
     - someone with the admin key sets them;
     - a Test panel button for the two switches;
     - one small server PR that raises the defaults for the week, merged in Wednesday's quiet hours
       and reverted after.
   - The account door's limit has no switch.
2. **Freeze merges.**
   - No `server/**` merge from Wednesday evening: a deploy disconnects everyone, wipes duels,
     trades and death piles, and cold-starts the room.
   - No client merge during judging: every open page gets the new-build banner
     (`src/game/buildWatch.js:2-4`, v2.3.1718's judging-day lesson).
   - Tell the parallel sessions.
3. **Expo setup, no code:**
   - one private window per judge, maximised or full screen, closed when they finish;
   - clocks set automatically;
   - "reload the page" for anything stuck;
   - open the game once before judges arrive, or press the "Probe live room" workflow, to warm the
     room and load the switches;
   - check the Actions spending headroom.
4. **Two small phone-only fixes, each with its tests.** Check the in-flight gear-tab and coach
   branches first: both systems changed today.
   - **Key 2 picks a bow you don't own (VB, G2-17).**
     - Guard `_desktopSelectSlot` (`src/ui/BroTown.jsx:9899-9921`) with
       `ownedWeaponSlots(rpg).includes(slot)` (`src/game/weaponSlots.js:27-32`), so the keys and
       the weapon bar share one rule.
     - Heal a saved unowned `activeSlot` to melee at join.
     - Update mp-pointsswitch §4 and mp-soundcues §2b, which expect today's behaviour.
   - **The first steps stall on laptop-sized windows (V15, M1-1).**
     - Exempt only the minimap lesson from the size rule, by a per-lesson flag. Never loosen
       `MARK_RECT_H_FRAC`.
     - Prove it at 1366x657 or 1280x720. At 1366x768 it passes today, which is why tests missed it.
     - Add that short laptop view to mp-firststeps.
5. **Optional, the owner's call.** Each is client-only and a few lines:
   - crash reports stop after 16 on a page (VA, N2-1);
   - monsters drawn as a generic body after a short walk (V17b, R6-5);
   - the Wheel's ground helper retrying after a Wi-Fi blip (V11, G3-4/T1-12);
   - a computer-only raise of the dressed-shirt cap (V18, R7-3). This is unmeasured: either measure
     it with `lookpalette=0`, or use the existing degrade instead of evicting.
6. **Not before Thursday:**
   - the duel card's banner: only `data-esc` = Decline is safe now, and never `data-enter` on
     Accept;
   - the two-tab identity fix: one window per judge covers it.
7. **Smoke check on the final main:**
   - run `playable` and `memory-budget`;
   - the owner clicks through the Pages preview on a real laptop window: a new character, the map
     and quest cards, and key 2.

   The test box keeps the look palette on, but Windows and Mac turn it off, so desktop proofs must
   pass `lookpalette=0`.

## After Thursday, Wave 1: honest players' harms first

### The order

1. The phantom duel (V6): a red skull, and worn gear lost to a player kill.
2. Undone blocks (V12).
3. Bag losses: the dying window (V2) and death piles (V22).
4. The guard break shown on the phone (V10).
5. The pond memory leak (V17b, R1-8).
6. The bag lost behind the dungeon's loading screen (V11). Do not add the movement freeze the draft
   proposed: holding a player still and blind for 8 s while monsters hit them makes this worse.
7. The frozen trade window (V8b).
8. The Rare armour lost on the phone after a reconnect (V9b): match by gid.

### Then the cheap closes for modified phones

- First, the one-line `dead` fix: target gates ask `ps.dying`. Today this is god mode.
- Then the room-wide abuses:
  - minted `dungeon:` ids leak up to about 100 MB an hour against a 128 MB room;
  - a points-reset loop can write about 131,000 rows a day, past the free plan's 100,000;
  - the feedback board trusts any typed id.

### House rules for every fix

- **Scope:** one system per PR, with its own v2.3.N tag.
- **Tests:**
  - a test that fails first;
  - node tests where the code lives in `src/game` or `server/src`;
  - phone scenarios only for real browser behaviour, since they cost paid minutes and only
    `playable` and `memory-budget` run on every PR.
- **Server rules:**
  - a lower-case kill switch (and a cap where the phone must know) for every new server rule;
  - a `_testMode` decision for each honesty check.
- **Same PR:** update the pinned tests and docs the change makes wrong. The lists are in R1's
  "Missing" section.
- **Merging:** batch server merges in quiet hours.

### Ordering

- The cold-flags fix (V13) goes before the HTTP-route changes.
- The shared loader helper goes before the "load once, never retry" fixes.
- Move mp-remnant off the retired map before relying on it.
- The second-tab takeover (V3) and two-tab identity (V5) ship under one answer.
- The duel's rejoin clear only ships with the worker's re-send.

## Wave 2: fix the five causes, not just their instances

1. **The server decides the player's phases itself:** dead, guard, zone flips, world size and
   cooking. The phone's fields become requests, the way v2.3.3292 did for dodging.
2. **One fight-lock table in the router.** Every message that moves gold or items names its gate,
   and answers with its handler's existing refusal. A test sends every message during a player
   fight and checks that nothing moved.
3. **Phone copies of server sessions** (the duel, the trade window, the held pose, the arena) are
   cleared at every rejoin and re-sent by the worker, as the party already does
   (`src/networking/wsClient.js:1641-1647`, `server/src/join.js:1889-1893`).
4. **One server clock on the phone**, taken from the ping, for every server timestamp: loot piles,
   the trade countdown, buffs.
5. **Two habits that keep a phone honest with itself:**
   - A dropped send is never stamped as sent (the mute, stats_update, quest taps): the channel shim
     returns false, and callers stamp only on true.
   - Caches never evict what this frame draws: the dressed shirts, the fishing overlay, trait
     colours.

**Money:** each payment, its stamp and the record's "paid" phase are written in one synchronous run,
with a phase per escrow record that the wake finishes. A stored-shape change needs the rollback
note.

## Keep it fixed

- A "one door" test per machine that fails any other writer, as `hit-door.test` does.
- Chaos tests for the bad moments, node tests first:
  - a second tab mid-fight;
  - a deploy mid-trade;
  - a restart between two saves;
  - an app switch;
  - a black-screen rebuild;
  - a wrong phone clock.
- A precheck rule against any load with no time limit or retry.
- Two CLAUDE.md lines:
  - "a phase lives in one field with one transition function";
  - "the server never takes a phase from the phone's move".
- Re-run the sweep on one folder before refactoring it (`tools/` here).
- Make Wave 3's explicit machines behaviour-preserving and staged. Most become a small root fix plus
  a guard test rather than a rewrite.

## Decisions only the owner can make (ranked by what they unblock)

1. **The expo's per-address limits:** who sets them, and to what.
2. **A zone change mid-duel:** forfeit after 15 s, or doors refuse duellers? Should a duel challenge
   time out on the phone? (V6)
3. **Blocks:** kept by the server, also stopping DMs and requests, and unfriending? (V12)
4. **Should the server stop believing the phone** about dead, guard, cooking, zone and world size?
   (V1)
5. **Two characters in two tabs, and a second tab mid-fight:** allowed? Take the body over, or wait?
   (V5, V3)
6. **A death pile across a deploy, and the dying window across a closed app.** (V22, V2)
7. **The fight lock:** do forging, hardening, gems and equipping count? (V21)
8. **The farm's two phone-only workshops:** remove or rebuild? (V9c)
9. **Smaller ones:**
   - a monster pile lasts 30 s or 60 s;
   - a failed monster look shows as invisible or as a stand-in;
   - the guard break is shown, and the guard may or may not come back by itself.
