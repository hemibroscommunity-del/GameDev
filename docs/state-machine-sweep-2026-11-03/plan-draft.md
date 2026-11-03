# DRAFT fix plan for BroTown's implicit state machines (for adversarial review)

The repo is `/home/user/GameDev`. Below, `SM` =
`/tmp/claude-0/-home-user-GameDev/1ce7f958-f168-5491-938e-aa5095f58949/scratchpad/sm`.

- The evidence for every item is in `SM/round2/<V>.md`. Each file has the verified machine, its
  concerns (CONFIRMED / PLAUSIBLE / REFUTED, with path:line) and its quick fixes.
- Three clusters are still being verified: VA (small bugs, including crash reporting), VB (the
  phone's fight controls and sound) and VC (art loads, held memory, the studios). They are marked
  PENDING.

## The owner's situation

- Desktop "expo" on Thursday 2026-11-05 (today is Tuesday 2026-11-03). The judges play on
  computers, in the sideways layout.
- About 14% of weekly usage is left, and the owner wants room for desktop layout fixes.
- GitHub Actions minutes cost money.
- The owner is new to coding. They merge one-press PRs written in plain words.
- Many parallel Claude sessions work on the repo. The house rules (CLAUDE.md):
  - one system per PR, with a v2.3.N tag;
  - precheck before every push;
  - a new server behaviour gets a cap (CAP_GATES) and a lower-case kill switch;
  - both wire protocols keep working;
  - one write: no await between a payment and its stamp;
  - the PRELOADING and MEMORY laws.

## Principles

1. **Act only on CONFIRMED concerns.** A PLAUSIBLE one gets a test or a measurement first.
2. **Every fix starts with a test that fails before the fix and passes after.** Server: a
   `server/test` suite. Phone: an `mp-*` scenario.
3. **Fix the pattern once rather than its instances one at a time**, where several instances
   share a cause.
4. **Keep each fix fixed** with a guard that fails if someone reintroduces the bug, in the style of
   `hit-door.test`.

## Before Thursday (minimal and low-risk, desktop-visible only)

- T1. **The first steps stall on laptop-sized windows** (V15, M1-1). On a computer window under
  about 754 CSS px tall ("Your map", 264 px minimap against the 0.35-of-height rule), "Your quest"
  and "Save your Login Key" never come.
  - Fix: let the map card's size rule exempt the minimap on computers, or scale the rule.
  - Proof: mp-firststeps with `wide: true` at 1366x768.
- T2. **Crowds of dressed players re-bake every printed shirt each frame on a computer** (V18,
  R7-3). An expo crowd in BroTown could hit this.
  - Option: cap the dressed-shirt work, or fall back to the plain shirt for crowds over 8.
  - Or do nothing before Thursday and measure.
- T3. **A duel challenge covers the controls** (V6, P2-5 widened). Any challenge puts an inert
  full-screen scrim over the controls until answered, even mid-fight.
  - Option: show a small banner instead. Or leave it until after Thursday.
- T4. **The computer's key 2 selects an empty bow slot** (VB, G2-17). PENDING verification.
- T5. **Two tabs on two characters** (V5): the first tab becomes the other character on any
  reconnect.
  - Judges may open two tabs. The quick fix is a page-start key.
  - Is it safe enough before Thursday?

## Wave 1: verified quick fixes (one PR per system, each with its failing test first)

1. **Crash reports** (VA, N2-1, PENDING). Upload stops once the 16-entry ring is full. Telemetry
   first, so later fixes can be seen working.
2. **Blocks and friends** (V12):
   - the player card reads `bt_blocked` fresh before writing;
   - `isBlockedId` on `friend_dm`, the backlog and the Requests rows;
   - a toast that consumes `friend_error`;
   - the leader idle clock `seen || at`;
   - an `includes` check before the accept's push;
   - the anti-bot eviction skips live sessions.
3. **Duels** (V6):
   - the accepter enters the duel only on its own settled echo, or drops the flag after a few
     seconds without one;
   - clear an unsettled `_inDuel` on `duel_decline`;
   - the duel's melee claim names its foe as `target` (this closes the No Man's Land red-skull
     path);
   - `declineBoth` on the two silent drops (duel.js:145-146);
   - the block check in `duel_wager_request`.
4. **The General Store and offers** (V8a):
   - an in-flight ref on Place;
   - clear `mktSellItem` on every answer and on open;
   - the offer-expiry pass counts offers only (or keeps a cursor);
   - refund: credit, then write;
   - `post()` gets an AbortController timeout, and a late answer only touches its own card.
5. **Session exits** (V3):
   - a 'join failed' close code of its own;
   - flush `_regenDirty` in the takeover before the rebuild;
   - the admin restore refuses while `playerState[pid]` exists;
   - `_achvForget` in `_lingerEnd`;
   - the arena eat gates ask the duel record.
6. **Phone-reported flags, the cheap half** (V1):
   - skip the skill-track restore under prog3 (grids.js:844);
   - break the guard at 0 stamina in `_hitStopped`;
   - refuse a raise while dazed or frozen;
   - a minimum time down before a raise re-arms the parry;
   - no cook/fire re-arm for a few seconds after `_endExtraction`;
   - the target gates ask `ps.dying`, not the phone's `ps.dead` (a sweep across about ten files).
7. **Monster life** (V7):
   - clear `_proj*` and `_kbDebt` at death;
   - end `_tgPhase` at the swell's start;
   - the phone's respawn reset clears `_burst*`, and `isIntangible` reads the clock;
   - the phone makes no piles when `S._serverLoot` is set;
   - the lifesteal ledger is cleared per monster id on the kill.
8. **Loot piles** (V22):
   - 'not-recipient' on a death pile becomes a retry, or death piles send their windows as time
     left;
   - add `S._dying` to the pet vacuum's gate;
   - echo `viaPet`.
9. **Zone change** (V11):
   - drop the Land Office's `startZoneAmbient('town')`;
   - move the opening's hide below its "still mine?" check;
   - add `_wheelDungeonOpening` to the Enter guard and the movement freeze;
   - call `clearZoneLocalFx` in respawn, arena entry, the Workshop clear and both farm trips;
   - the ground worker: `pump()` after a promotion, `!failed.has` in prefetchRound, and a
     generation number for `_ready`.
10. **Shield** (V10):
    - skip the fallback block in server zones;
    - apply a peer's shield edges whatever their zone;
    - drop the lunge's strike when the guard goes up;
    - `SHIELD_CD_MS` = 3000.
11. **Cold flags** (V13): `await this._liveFlagsEnsure()` at the top of `GameRoom.fetch`, plus a
    cold-room suite check.
12. **Renderer and art** (V17a, V17b):
    - `wheelLifeWarm()` on a rebuild;
    - the preload report tells the truth;
    - the bar loader re-arms its latch on failure;
    - release an evicted fishing overlay through `releaseCanvasSource`;
    - destroy `ent.gear` in the peer reap;
    - a failed object page drops after a few seconds;
    - `freeLook` counts siblings held in `_looks`;
    - re-send `pose` after a reconnect.
13. **Looks** (V18):
    - R7-2's guard prefix through `_headSheetKey`;
    - R7-1's chained body retry;
    - R8-11's try per facing;
    - eyewear and eye-style "ready" promises in preloadTraits.
14. **Predictions** (V9a, V9b):
    - an echo at the four silent hand-in returns, plus `achievementPoints`;
    - resend `lifeSkills` on 'antibot-cap';
    - the cook popup says 200;
    - the picker's bag-full check;
    - `return refuseWeapons()` at gear.js:747;
    - `canEquipItem` in `equipStashWeapon`;
    - a re-send on a refused armour swap;
    - the amulet pill gets a gate;
    - drop the arena bet on `arena_stake_error`.
15. **Identity** (V5):
    - a page-start key used by the join and the re-target;
    - the heartbeat and joinTown stamp that key;
    - the 'auth' mint reloads instead when the shared key changed;
    - one cache-key list.
16. **Socket** (V4):
    - each handler checks `sock === ws`;
    - Try now returns while CONNECTING;
    - the cleanup detaches before it closes;
    - the veil re-applies when the loading screen lifts.
17. **The farm's phone-only shops** (V9c): hide the Furniture Workshop and the Dungeon Workshop's
    Store until the server owns them. The owner's "remove or rebuild" decision is already pending.
18. PENDING: whatever VA, VB and VC confirm.

## Wave 2: authority and money (needs owner decisions; caps and kill switches)

- A. **The server decides the player's phases itself** (V1, V10). Life, guard, activity, entry
  grace and in-step become one worker record changed by one `_phaseSet`. The move's fields become
  requests: `dead` is ignored, and the server tells the phone about a guard break (a new field, cap
  and switch). The model is v2.3.3292's dodge.
- B. **One fight-lock table** (V21, V8b's gift lane, S7-12). Every message that moves gold or bag
  items names its gate, checked once in the router, plus a test that fails any debit without a row.
- C. **Money in one write** (V8a, V8b, the S9 mail-outs):
  - one helper that writes the payment, its stamp and the record's "paid" phase together;
  - a phase field per escrow record, plus `converge()` at wake;
  - the General Store names a sold weapon by id and works out its type and tier itself (this
    closes the known cheat).
- D. **Durable death**: the dying window and the keep-the-bag promise saved with the record (V2);
  the death pile survives a deploy (V22).

## Wave 3: make the top machines explicit (one door each, plus a test that fails any other writer)

- **Server:**
  - `session.phase` and `_playerLeaves(id, why)` (V3);
  - `ps.life` and `lifeTo()` (V2);
  - `m.life` and `_endLife()` (V7);
  - `_duelLeave()` and one "may I leave?" check (V6);
  - `_fightState()` (V21);
  - `ps.guard` (V10);
  - the flags-cache phase (V13).
- **Phone:**
  - `openSocket()` and `setConn()` (V4);
  - a per-page identity record and `switchCharacter()` (V5);
  - `changeZone()` and the veil's holder list (V11);
  - `S._duel` written only from the wire (V6);
  - `door.js` (V15);
  - a shared SheetCache / art record (V17b, V18);
  - a renderer-life module (V17a).

## Keep it fixed

- A one-door test per machine (like `hit-door.test`).
- A transition-table test per machine.
- Chaos scenarios in `tools/qa/mp`:
  - a second tab mid-fight;
  - a deploy mid-trade;
  - a restart between two writes;
  - an iPhone app switch;
  - a black-screen rebuild;
  - a phone clock ahead or behind.
- An "every refusal echoes" check.
- A precheck that bans a bare `Assets.load` or `fetch` outside a loader with a time limit and a
  retry.
- A spec page per machine, plus TRAPS lines.
- Two CLAUDE.md rules:
  - "a phase lives in one field with one transition function";
  - "the server never takes a phase from the phone's move".
- The sweep's brief and scripts saved in the repo for per-folder re-runs, a `/repo-review` check
  for new flags and timers on shared objects, and a quarterly full sweep.

## Owner decisions, ranked

1. Two characters in two tabs: allowed or not?
2. A second tab mid-fight: wait for the body, or take it over?
3. Should the server stop believing the phone about dead, guard, cooking, zone and world size?
4. A zone change mid-duel: forfeit, or refused doors?
5. Blocks: server-kept, stopping DMs and requests, and unfriending?
6. A death pile across a deploy, and the dying window across a closed app?
7. The fight lock: do forging, hardening, gems and equipping count?
8. The farm's two workshops: remove or rebuild?
9. A monster pile: 30 s or 60 s?
10. The guard break: shown on the phone, and does it come back by itself?
11. A failed monster look: invisible, or a stand-in?
12. The Login Key card's prerequisites, and the map card's size rule on computers.
