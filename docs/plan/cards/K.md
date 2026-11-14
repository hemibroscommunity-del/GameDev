# Card K: the wire, moved (steps 4.1 step 2, 5.8, 4.2, 4.1b, 11.3, 11.4)

**Starts:** now. Card N (the wire table, `server/src/wire/`, and its guard)
is merged, and card E (the books) is merged whole at the gatekeeper's
sitting 11, so part 11's "K with E's fixes still open" holds it no longer.
**Read:** `CLAUDE.md` (§5, the wire's rules: deny by default, either side
ships first, caps, kill switches, the doors, one write, writes and messages
cost money; §7, the laws a page change keeps); the ten rules at the top of
part 5 of `docs/GRAND-PLAN.md` (1, 2, 3, 4 and 8 most); steps 4.1, 4.1b,
4.2, 5.8, 11.3, 11.4, and pillar 11's "Not to build"; `docs/SHAPES.md`
part 2 (the request id `reqId`, and "Things a phone names by their place
today"), part 5 (the wire's columns, both tables) and part 8 (names);
`server/src/wire/README.md`; `tools/guards/wire-table.test.mjs`;
`docs/plan/census/wire.md` parts 1, 2 and 7 (read rows by grep, a row at a
time: the page is 754 KB); `docs/ARCHITECTURE-HANDOFF.md` (rules 5, 7, 10,
13 to 16, 19 to 21, 27); `server/test/testroom.mjs` (card E's test room and
its `DISTURBANCES`); TRAPS §18 (the shim's allowlist drops a type
silently), §182, §196, §316, §329, §333; card R
(`docs/plan/cards/R.md`), for the files the two cards share.
**Tags:** 5181 to 5199, one a PR, in the order below. 5180 is the
orchestrator's PR that commits this card and card R: do not commit the card
yourself. The card has more PRs than tags: when they run out, ask the
planning session for a second block; never take one yourself.
**Browser:** light to medium: `questline` before each PR that changes a
page file, and the scenarios of the family it moves. One run at a time.
**Effort:** extra (the wire, money's requests, every send on the page).
**Your questions, and "ready":** by message to the planning session,
`session_01LccHak9SKjatMy6sijchun` (not `@parent`). Anything decided for
the owner while away goes in the PR's words under the heading **"Decided
for the owner while away"**, with its switch (`docs/plan/README.md`).

## What the card builds, so the PRs read as one

Four walls, each made from card N's table, and two rules on top of them:

- **The worker's lists and the door's checks** (4.1, step 2): the lists the
  worker keeps by hand today are made from the table, and one check at the
  door holds every field to the form its row names, with a suite that
  throws hostile values at every row.
- **The action door** (5.8): one way out of the page, `src/game/actions.js`.
  It makes the request id, and it is where a helper would one day act
  (pillar 11), so it is built once.
- **The send door** (4.1b): one way out of the worker, `_send`, counting
  messages and bytes by type.
- **Claims with numbers** (4.2): each judge's gain measured by a house bot,
  and each tightening behind its own switch.
- **A value request acts once** (11.3), and a thing that can be listed is
  named by its id, never its place.
- **The game's voice never carries a player's words inside its own
  sentences** (11.4).

## PRs, in order

Each PR's branch starts from `main` and opens against `main`, ready for
review (not a draft). Never begin a branch from another unmerged branch: a
PR that needs an earlier one waits for it to merge (do a free PR meanwhile:
each line says what it waits for), and merges `main` in before its last
push. A PR touching `server/**` deploys the worker on merge: say so in its
first line.

1. **(tag 5181) The worker's two lists made from the table.** Changes
   nothing.
   - `PRIVILEGED_EVENTS` (`server/src/index.js`) and `RELAY.TYPES`
     (`server/src/relay.js`) are made from the table's `out` and `relay`
     rows; `wire-audit`'s `RELAY_ECHO_ALLOWLIST` from the relay rows the
     worker also sends. A fact the table cannot say yet (`clan_war_declare`
     is an `out` row on neither list) becomes SHAPES part 5's machine
     column (`privileged`), moved into the table: the literal list is
     deleted in the same PR. Never both.
   - The table's files stay leaves. One new file, `server/src/wire/lists.js`,
     is the one place that reads them and makes the lists; the worker
     imports it. Mind the README's quoting (`'type':`): `wire-audit` reads
     `type: '<name>'` anywhere in `server/src/` as a message sent.
   - Files: new `server/src/wire/lists.js`; `server/src/wire/*.js` (a
     column, if needed); `server/src/index.js` (the list's definition
     only); `server/src/relay.js` (`RELAY.TYPES`' only);
     `server/test/wire-audit.test.mjs`; `tools/guards/wire-table.test.mjs`;
     `server/src/wire/README.md`; `docs/SHAPES.md` part 5 (`privileged`,
     `relayed`: made from the table).
   - Done when each made list equals today's (the test holds today's copy
     for this PR only, then compares the table's rows), a row added to the
     table reaches its list with no other edit, and the PR says how much the
     worker's bundle grew (the table ships in the worker now).
   - Waits for: nothing.
2. **(tag 5182) The worker's other lists made from the table.** Changes
   nothing. After 1 is merged.
   - `fight` (`FIGHT_LOCK`, `FIGHT_OPEN`, `fightlock.js`), `placed`
     (`ROOM_PLACED`, `RELAY_PLACED`, `eventplace.js`), `muted`
     (`MUTABLE_RELAY_TYPES`, `chatmod.js`), `pace` (the `PACE` lanes,
     `flood.js`; `SOCIAL.TYPES`, `chatguard.js`), `watch` (the anti-bot
     hook's types, `index.js` and `botsig.js`). Each list moves into its
     column; the code reads it from `lists.js`; the literal is deleted.
   - `rideEnds` (`RIDE_ENDS_ON`, `server/src/ride.js`) is card SK's file
     while SK runs: here only if SK's status says `done`, else its own
     small PR later (write it under Next).
   - `flag`: a row names the live flag that turns its handler off, by its
     row's name in card T's switch table (`tools/guards/lib/switches.mjs`);
     the guard fails a name that is not a row there. No list of flag names
     is made here: T's table is the one (rule 2).
   - **Not moved, and why** (write each in the README): `cap` (`CAP_GATES`
     and join.js's `caps` are its one list; precheck `cap-registry`);
     `roads` (the doors' tables' `at`: the guard can compute it, never
     stored twice); `silent` (`refusal-door-list.mjs`, a test's list);
     `rejoin` (`REJOIN_SLOTS`, which card L's phase table reads); `body`,
     `idle` and `pv` (rules written in line, not lists); `phoneSend` and
     `phoneCase` (the page's: PR 5).
   - Files: `server/src/fightlock.js`, `eventplace.js`, `chatmod.js`,
     `flood.js`, `chatguard.js`, `botsig.js` (each its list only),
     `server/src/index.js` (the watch hook's list only), `server/src/wire/*`,
     their suites (`fight-lock`, `wire-audit`, `wire-table`, the rest the
     lists name), the README, SHAPES part 5.
   - Done when each list equals today's, and a row's column changed in the
     table changes the worker's list (a test each).
3. **(tag 5183) The hostile-values suite, as a census.** Changes nothing
   (a test and a page). Free: no PR before it.
   - New `server/test/wire-hostile.test.mjs`, on card E's test room. Every
     `in` row, and every `http` row a phone may call, with each field its
     `trust` names set in turn to one closed list of hostile values:
     `__proto__`, `constructor` and `prototype` as keys, at any depth; NaN,
     plus and minus Infinity, -1, 0, 2^53, 1e308; a string of 1 MB; an
     array, an object, null or a boolean where a number or string goes; an
     object 1,000 deep; another player's id; a `reqId` outside SHAPES' form.
   - A row passes when nothing throws out of the router or the route, no
     value moved (the world's sum: unexplained 0), no key named `__proto__`
     is stored or kept in memory, and the answer is what the row's `bad`
     says (`dropped:<code>` a silent exit with that code, `refused` an
     answer that says so).
   - Rows that fail today land as a census (rule 3): new
     `docs/plan/census/hostile.md` (row, field, value, what happened), and
     the suite's line is their count: it only falls. Fix no handler here.
   - Done when every row runs, the count is the line, and a planted handler
     that writes `ps[payload.k] = ...` fails it (its break proof, in the
     header).
4. **(tag 5184) The door's checks made from the table.** After 1 and 3 are
   merged.
   - One check at the router (`_onMessage`) and one at the routes' door
     (`routeHttp`), before any handler: the body a plain object; keys
     `__proto__`, `constructor` and `prototype` refused at any depth; every
     field the row's `trust` names held to its form (a number finite; a
     `words` field a string within its bound, the lengths `chatguard.js`
     already holds; a `reqId` in SHAPES' form). A field the row does not
     name passes untouched: an older or a newer phone's extra field is not
     a fault. New `server/src/wire/door.js` (it reads `lists.js`); one call
     in each of the two places in `index.js`.
   - Behind the lower-case live flag `wiredoor` (a line of its own, its row
     in the switch table). It refuses only what no page of the game sends:
     the PR runs `questline` and the bot lab (`tools/qa/load/bot-lab.mjs`)
     with the door counting, and finds none. A field an honest page can
     send out of form (a NaN position from a drawing fault) is counted,
     never refused, and goes under Found.
   - The hostile census falls by what the door now catches; its line is
     lowered in this PR.
   - Files: new `server/src/wire/door.js`; `server/src/index.js` (the two
     calls); `server/src/liveops.js` (the flag); `wire-hostile.test.mjs`;
     `docs/plan/census/hostile.md`; `server/test/refusal-door-list.mjs` (the
     door's code); new `docs/specs/wire-door.md`; the switch table's row.
   - Done when the line falls, `wiredoor: false` is today's way byte for
     byte (its suite run once with it thrown: rule 4), and honest play
     counts nothing refused.
5. **(tag 5185) The action door, step 1** (5.8). Changes nothing.
   - New `src/game/actions.js`: `act(name, payload)`, one row a request.
     The rows: every `in` and `relay` row the page sends, and every HTTP
     route a player's page calls. Each row says its way: sent alone at once
     (today `monster_damage`, `cape_redeem`, ...), priority (today's
     `PRIORITY_EVENTS`), the 33 ms batch, a rider, held for the rejoin
     (`node_strike`), settled (`SETTLED_SENDS`), or `http` (with the
     session's token).
   - The channel shim's pass-through allowlist, `PRIORITY_EVENTS` and
     `SETTLED_SENDS` (`src/networking/wsClient.js`) become the door's rows:
     one list. SHAPES part 5's `phoneSend` column lives here, never in the
     worker's table. A type with no row is refused at the door and counted,
     loudly on a QA page: TRAPS §18's silent drop, gone. The shim stays the
     door's transport.
   - **The page's door does not import the worker's table** (it would carry
     every row and its notes into a phone's memory): its rows are its own,
     and its guard holds them to the table.
   - The door makes `reqId` (SHAPES part 2: one maker, its form) for each
     request whose wire row's `doesWhat` holds `value-out` or `final`, and
     sends it as `payload.reqId` (in an HTTP body, `reqId`). A worker before
     PR 9 lets it pass (PR 4's door passes a field the row does not name).
     It adds bytes, never a message.
   - Its guard, new `tools/guards/action-door.test.mjs`: every row of the
     door is an `in`, `relay` or `http` row of the table, and every such row
     the page sends has a row; a send to the socket, or a `fetch` of
     `/api/`, from anywhere else is counted. A census, 203 sends in 87 files
     on `main` 9fd5e58 (grep `channel.send(`), plus the `fetch`es: it only
     falls (rule 3).
   - Files: new `src/game/actions.js`; `src/networking/wsClient.js` (the
     shim's three lists only); new `tools/guards/action-door.test.mjs`;
     `tools/guards/lib/systems.mjs` and `docs/SYSTEMS.md` (the new file
     placed, a line of its own); new `docs/specs/action-door.md`;
     `docs/SHAPES.md` part 5 (`phoneSend`: the door's rows) and part 2
     (`reqId`'s maker, built); CLAUDE.md §5 and §8 (one line each: a
     request leaves the page through `act`); `tools/dev/precheck.mjs`, its
     two checks that read the page's sends: `shim-allowlist` (56 types
     with a pass-through today) reads the door's rows, and `town-gate` (no
     send gated on `_serverMonsters`) finds the sends through `act` too,
     so PRs 7 keep both true.
   - Waits for card SK's #1782 (two lines of `wsClient.js`'s move path and
     its imports) to merge. If it is still held when you get here, ask the
     planning session: the hunks are far apart.
   - Done when every type takes exactly today's way (a test runs today's
     shim and the door over every name and compares), `questline` is green,
     and a send of a type with no row fails the guard (break proof).
6. **(tag 5186) The gain bench** (4.2, step 1). Changes nothing (tests
   only). Free: no PR before it. Measure before changing.
   - A house bot for each known claim, written for it, in two kinds: the
     honest one (it plays as a phone does, on each of card E's
     `DISTURBANCES`: a slow line, loss, 4 frames a second, a hidden tab, a
     deploy) and the maximal liar (it sends the most the judge accepts). In
     node, on the test room: new `server/test/claims-gain.test.mjs` and its
     helper beside it (`claimbots.mjs`, not a `*.test.mjs`).
   - A claim's gain is the liar's take an hour over the honest player's
     (gold, experience, kills, ore: what the claim earns). The gains land as
     a census, new `docs/plan/census/claims.md`; in the suite each claim's
     gain is a line that only falls (rule 3); 1.5 is the bar at which a
     claim's box is ticked. **The honest bots meet no refusal on any
     disturbance: strict from the start.**
   - The claims (step 4.2's list): the sword's reach (`PVE_MELEE_RANGE`,
     400 px, `index.js`; a miss never reaches the worker); the move
     (`MOVE_BUDGET`, `movement.js`, 500 px a second, no walls); the
     harvest's grade; the cook's result; the guard and cooking beyond
     #1530's limits; the quest hand-in; the weapon sale with no take-back;
     gold taken on the page in two panels; the local-monster mode; a
     sword's claim labelled a bow's (TRAPS §329). One the bench cannot
     reach in node goes in the census with why.
   - Done when every claim has its number or its why, and a judge loosened
     by a planted line (the reach doubled) raises its gain and fails the
     suite (break proof).
7. **(tags 5187 to 5192) The page's sends through the action door** (5.8),
   a family a PR, after 5 is merged. Each is mechanical:
   `S.channel.send({...})` becomes `act('<name>', payload)`, the same
   payload, the same way. Each lowers the census's line by what it moved;
   `questline` and the family's scenarios (`ls tools/qa/mp/` by the
   file's system) are green before its PR. **Before each, read the status
   files of the cards named and the files of their open PRs**
   (`git diff --name-only origin/main...<branch>`): a file another card's
   open PR changes waits for that PR to merge, and the rest of the family
   goes now. The counts are `main` 9fd5e58's.
   1. **(5187) Combat and moving** (`src/game/`): `monsterCombat.js` (15),
      `projectiles.js` (7), `playerActions.js` (7), `dodge.js` (7),
      `abilities.js` (4), `interactions.js` (4), `jumpActions.js`,
      `shieldToggle.js`, `weaponGem.js`, `respawn.js` (2 each),
      `combatHelpers.js`, `accuracy.js`, `climbActions.js`,
      `shieldWear.js`, `shieldGem.js`, `desktopControls.js` (1 each).
      Holders: card L's page doors (the death door, `respawn.js`; the
      pose, `interactions.js`), card SK (`interactions.js`, if its mend
      reaches it).
   2. **(5188) Life skills, the economy and the social game**
      (`src/game/`): `lifeSkillRewards.js` (6), `chat.js` (5),
      `alliance.js`, `chatMute.js`, `nmlAsk.js` (3 each), `bank.js`,
      `fishWeigh.js`, `noMansLand.js`, `wheelDungeons.js` (2 each),
      `achievements.js`, `dailyRewards.js`, `groundLoot.js`, `itemDrop.js`,
      `petBook.js`, `pointsReset.js`, `presence2.js`, `questKept.js`,
      `race.js`, `rest.js`, `revealBag.js`, `shardCrack.js`,
      `spinBoard.js`, `trapping.js`, `weaponSell.js`,
      `zoneTransitions.js` (1 each). Holders: card L (`zoneTransitions.js`
      is the zone door; `race.js` the race's), card T's read moves (its
      PR 7 on).
   3. **(5189) The networking files**: `src/networking/gameEvents.js` (9),
      `broWallet.js` (2), `nodeSync.js`, and `wsClient.js`'s own four;
      `src/debug/report.js` (1: cards O and T change it today, so last in
      the family). After it no send is left in `src/networking/` but the
      door's transport.
   4. **(5190) The panels** (`src/ui/panels/` and its `buildings/`):
      `InspectPlayerPanel.jsx` (6), `ClanPanel.jsx` (5), `AceFlipPanel.jsx`,
      `InventoryPanel.jsx` (3 each), `DuelRequestPanel.jsx`,
      `IncomingTradePanel.jsx`, `ThreatIncomingPanel.jsx`, `CookPanel.jsx`,
      `GamblePanel.jsx`, `SmithyPanel.jsx` (2 each), `ClanInviteCard.jsx`,
      `DungeonCreatorPanel.jsx`, `GuildPanel.jsx`, `PartyHUD.jsx`,
      `RideButton.jsx`, `ShopkeeperPanel.jsx`, `TradePanel.jsx`,
      `TradeWindowPanel.jsx`, `EnchantPanel.jsx`, `GemcutPanel.jsx`,
      `HardenedWoodTab.jsx`, `PartyPanel.jsx`, `TownBoardPage.jsx`,
      `TrapsTab.jsx`, `WoodworkPanel.jsx` (1 each). Holders: card SK
      (`RideButton.jsx`), card L's `window` door.
   5. **(5191) The phone's sheets and the HTTP calls**: `src/ui/mobile/`
      (`farmBus.js` 4, `dash/itemActions.js` 3, `dash/SocialPanel.jsx`,
      `dash/equipActions.js`, `sheet/HeroExpanded.jsx` 2 each,
      `ChatBubble.jsx`, `ChestReveal.jsx`, `LoginSpinWindow.jsx`,
      `dash/GearTab.jsx`, `dash/ItemDetailPopup.jsx`,
      `dash/LeaderboardPanel.jsx`, `dash/SettingsPanel.jsx`,
      `dash/SpendPointConfirm.jsx`, `dash/WeaponBar.jsx` 1 each),
      `src/ui/storeApi.js`, and every `fetch` of `/api/` a player's page
      makes (`buildings/ExchangePanel.jsx`, 7: the market's `place`;
      `buildings/PartyPanel.jsx`; `src/ui/panels/LeaderboardPanel.jsx`; the
      two Feedback panels). Left out, as the door's exceptions written in
      its spec: `src/debug/crashTrap.js` and `src/networking/index.js`
      (they run before a session). Holders: card LB (#1798, its two
      leaderboard files).
   6. **(5192) `src/ui/BroTown.jsx`** (17), last and alone. Holders: card
      SK (#1782), card L's `ui` resets, and never while card M runs
      (part 11). Done when the census counts nothing outside the door's
      transport; the gatekeeper then makes the guard strict (rule 3).
8. **(tag 5193) The send door, step 1** (4.1b). Changes nothing. After 1 is
   merged.
   - New `server/src/send.js`: one `_send` (and its forms for a named few
     and for the room), the only place a frame is written to a socket. It
     counts messages and bytes by type, in memory. The systems' own helpers
     (about 36: SHAPES part 5's "no single send") call it. A census guard
     counts raw writes elsewhere: 134 `.send(JSON.stringify` in about 75
     files on `main` 9fd5e58; it only falls.
   - The counts are read through the one admin route the Test panel uses
     (card A's). In the day's book only as a part that rides a put already
     made (`DAYBOOK.RIDES`, `daybook.js`): no new row, held by
     `cost-guard`. If it cannot ride, it stays in memory and goes under
     Needs.
   - Every frame byte for byte as before (a test compares each helper's
     frame). Its kill switch `sendcount` turns the counting off; the door
     stays.
   - Files: new `server/src/send.js`; the files that hold the helpers (the
     helpers only; the PR names them); `daybook.js` (the riding part, if
     it rides); new `server/test/send-door.test.mjs`;
     `server/test/cost-guard.test.mjs` (its line, a place of its own);
     `server/src/liveops.js`; new `docs/specs/send-door.md`; SHAPES part 5;
     CLAUDE.md §5 (one line: a frame leaves the worker through `_send`).
   - Waits for: the shared files' order below, for each helper's file.
9. **(tag 5194) Ids and repeats, step 1: the market, the auction house and
   the five** (11.3).
   - The worker reads `reqId` (SHAPES part 2: its form; its reach, only
     with the actor's `pid`; a repeat acts once and gets the first answer
     again; the answer echoes it) on: `POST /api/market/place` and the
     cancel; the auction house's list, buy, bid, accept and cancel
     (`store.js`, `storeoffer.js`); the bank's two; the daily spin; a chest;
     a cape's redeem (the last five read `reqId` first, and `opId` from an
     older phone). Each row's `reqId` column in the table turns from
     `none` to `reqId`.
   - **Where it is remembered (the reading chosen):** in the record the
     request already writes, in the same put (a market order and a listing
     on their own record; the bank's `ops`, as today): no new row. A
     request whose record holds no room for it: in memory for the sitting
     (a retry across a deploy is the rare case), and a lasting stamp row
     built OFF behind the live flag `reqstamp` and listed under Needs as a
     cost question, with its rows a day. `cost-guard` holds both.
   - Either side ships first: a phone with no `reqId` is served as today. A
     new cap `reqid` (its own new line in join.js's `caps` and in
     `CAP_GATES`: TRAPS §316) tells the page the worker answers once; only
     then may the action door re-send a timed-out request with the same id.
     Kill switch `reqonce`.
   - **The order with card R** (both touch trade and the market): R's
     PR 1 (the roads' table, tag 5280, a new file that touches no
     settlement) and R's stash door (tag 5281) merge first; then this PR;
     R's escrow roads' ledger (its last PR) only after this one merges.
   - Files: `server/src/market.js`, `store.js`, `storeoffer.js`, `bank.js`,
     `dailyrewards.js`, `dailychest.js`, `eventcapes.js`; `server/src/wire/*`
     (the column); `server/src/join.js` (the cap's line); `CAP_GATES`
     (`src/ui/panels/DevPanel.jsx`); `src/game/actions.js` (the retry,
     gated); `server/src/liveops.js`; new `server/test/req-once.test.mjs`;
     `cost-guard.test.mjs`; new `docs/specs/req-once.md`; SHAPES part 2.
   - Done when a repeat of each (the same `reqId`, at once and a minute
     later; across a restart for those with a record) acts once and gets
     the first answer, the world's sum holds, and the market's `place` with
     the id ignored sells the next weapon (break proof).
10. **(tag 5195) Ids and repeats, step 2: every other value request**
    (11.3). The rest of the table's rows a player may start whose
    `doesWhat` holds `value-out` or `final` and whose `reqId` is `none` (35
    of 62 on `main` 9fd5e58: run the README's count), file by file, the
    same reading as 9. Files held by another card wait (the shared files
    below; card L's doors). A file whose rows are already `state` (a repeat
    finds the thing done) is left, and says so. Done when no such row is
    `none`, or each left says why.
11. **(tag 5196) Ids and repeats, step 3: named by id, never by place**
    (11.3).
    - SHAPES part 2's table: `sell_weapon` and `equip_request` (`gear.js`),
      `POST /api/market/place` (`market.js`), `POST /api/store/list`
      (`store.js`), `amulet_forge_request` (`amulet.js`),
      `trade2_stage_weapon` (`trade2.js`), `smith_salvage` and
      `essence_apply` (`salvage.js`), `reveal_item` (`revealbag.js`) name a
      weapon by its `gid` (card R's PR 3). The place is still read from an
      older phone; a request whose id and place disagree is refused. A new
      cap `gidnames`, its own line; kill switch `gidnames`.
    - Waits for card R's weapon id (its PR 3, tag 5282) merged.
    - Files: those handlers; their rows in the action door (the payload);
      `server/src/wire/*` (the `trust` of the new field); join.js's cap
      line; `CAP_GATES`; a suite; SHAPES part 2 (the table, done).
12. **(tag 5197) The words rule** (11.4).
    - A census first: every string the worker sends or stores for a player
      to read that holds a player's words (a name, a clan's tag, a shop's
      note, chat): today `store.js` ("sold to" and the buyer's name),
      `clans.js`, `trade.js`, `gathering.js`, `gear.js`, `gearstash.js`,
      `risechest.js` (grep; the table's 24 rows with a `words` field show
      where words come in).
    - Such a message carries a template id and its parts
      (`{ t: 'sold_to', p: { item, buyer, price } }`); the page fills it
      from one table of the game's sentences (a new leaf under `src/data/`),
      the player's words drawn as words, never read as the game's. **What
      a player reads stays word for word the same.** Either side ships
      first: a mail entry keeps its sentence beside the template for an
      older phone, made in ONE function on the worker the guard knows.
    - The guard (new `server/test/words-rule.test.mjs`): a server string
      joined or templated with a field the table marks `words`, or with a
      stored name, fails, outside that one function.
    - Files: those files' sentences; new `server/src/words.js`; the page's
      readers of those messages and of mail (the PR names them); the new
      `src/data/` leaf; the guard; new `docs/specs/words-rule.md`.
    - Waits for: card R's stash door (`inbox.js`, `store.js`) and PR 9 here
      in `store.js`, merged.
13. **(tags 5198, 5199) The worker's sends through the door** (4.1b), two
    batches, after 8 is merged: first the files no card holds; then the
    rest after their holders (card L's doors: `trade2.js`, `duel.js`,
    `party.js`, `cooking.js`, `gathering.js`, the fishing file, `dungeon.js`,
    `ride.js`, `poses.js`, `race.js`, `gladiator.js`, `arena.js`; card R's:
    `join.js`, `prog3.js`, `pointsreset.js`, `persistence.js`, `admin.js`,
    `quests.js`). Each byte for byte. Done when the census is 0; the
    gatekeeper then makes it strict.
14. **(the second block) The claims tightened** (4.2), one judge a PR, in
    this order where its files are free: the sword's reach; the move and
    its walls; a sword's claim labelled a bow's (TRAPS §329); the weapon
    sale's take-back; gold taken on the page in two panels; the
    local-monster mode; the guard and cooking beyond #1530's limits; the
    harvest's grade and the cook's result (after card L's harvest and cook
    doors and card R's experience door); the quest hand-in (after card R's
    quest door).
    - Each: its own lower-case live flag (its row in the switch table); its
      gain before and after on the bench (PR 6), the census's line lowered;
      **the honest bots on every disturbance meet no refusal with it ON**
      (a refusal fails the PR, whatever the gain).
    - **The default (the reading chosen):** a tightening that changes
      anything an honest player can do on any line of the closed list (a
      refused or slowed hit, a step held back, a position moved, a smaller
      harvest) lands OFF, and goes under Needs as the owner's, in plain
      words ("turn on X: a cheat's gain 3.1 times down to 1.2; an honest
      phone on a slow line: nothing refused"). It is not decided for the
      owner while away. Only a tightening that leaves the honest bots' play
      byte for byte the same (it refuses only what no page sends) lands ON,
      with its switch.
    - Files: the judge's own (the reach: `index.js`, `combat.js`, `hits.js`,
      `abilities.js`; the move: `movement.js`, `movepath.js`,
      `moveclaims.js`; ...), `liveops.js`, its suite, the census.

## Readings chosen for you

- **The table is the truth from PR 1 on.** A list made from it is never
  also written by hand: the old literal goes in the PR that makes it.
- **The request id** is SHAPES part 2's: `reqId`, one maker (the action
  door), its form, its reach. `opId` stays the worker's: a string a phone
  chose never stands where a payout's stamp stands.
- **Messages and writes cost money.** No PR here adds a message a phone
  sends or a row the worker puts, except where it says so, and then it is
  OFF until the owner's yes (PR 9's `reqstamp`; PR 8's riding part if it
  cannot ride). Never decided for the owner while away.
- **Who may start a thing** stays as card N wrote it: the 91 `person` rows
  stay open (the owner, 2026-11-14: *"Leave open"*; step 11.7). Build no
  helper lane: the action door is where one would act, later.
- **A fix never turns on something nobody has seen** (TRAPS §305). A wrong
  row in the table (the code says otherwise): the table says what the code
  does, and the row goes under Found with its file and line.
- **A new message or route** this card adds gets its row in the table in
  the same PR (card N's guard fails one with none).
- **A new live flag, cap or switch row** goes on a line of its own
  (rule 3, TRAPS §316, §333); say so in the status file. Once card T's
  #1804 is on `main`, a switch row's place is set by its name.
- **Both protocol versions keep working** (v1 and v2).
- **Part 11's "never side by side"**: the wire moved, the action door and
  6.2 half-done together. 6.2 (one shared table a rule) starts only after
  PRs 7 and 13 are done.

## The files K and R share, and who goes first

The same table is in card R. "Then" means after the first one's PR is
MERGED, not opened. Neither card writes a file here while the other's
named PR is open. The planning session settles a clash.

| File | First | Then |
|---|---|---|
| `server/src/index.js` | K 5181, then K 5184 | R 5281 (the stash's writers); K's sends (13) |
| `server/src/wire/*` | K 5181, 5182 (the columns) | R's new rows (its route, 5286); K 5194 to 5196 (the `reqId` and `trust` columns of rows) |
| `server/src/market.js`, `store.js` | R 5281 (the stash door) | K 5194, 5196, 5197; R's escrow ledger (its last) |
| `server/src/trade2.js` | card L's trade door (#1809) | R 5281, then K 5195, 5196 |
| `server/src/inbox.js` | R 5281 | K 5197 (the mail's words); K's sends |
| `server/src/join.js` | R 5281, 5282 (the load), the experience door | K 5194, 5196 (a cap's line each); K's sends |
| `gear.js`, `salvage.js`, `revealbag.js`, `amulet.js`, `nomansland.js`, `quests.js` | R 5281, 5282 (and 5284, `quests.js`) | K 5196; K's sends; K's quest hand-in |
| `gathering.js`, `cooking.js`, `dungeon.js`, `party.js` | card L's doors | R's experience door; then K's harvest and cook claims; K's sends |
| `prog3.js`, `pointsreset.js` | R 5283 | K's sends |
| `persistence.js`, `admin.js`, `daybook.js` | R 5285 to 5288 | K 5193 (`daybook.js`), K's sends |
| `duel.js`, `gladiator.js`, `arena.js` | card L's doors | R's escrow ledger; K's sends |
| `gold.js`, `bag.js` (`GOLD_ROADS`, `BAG_ROADS`) | R only while R is open | K never: a road K needs goes under Needs |
| `xfer.js`, `storagemarks.js`, `playerroads.js`, the stash door | R only | |
| `src/game/actions.js`, `wsClient.js`, every page send | K only | |
| `liveops.js`, `cost-guard.test.mjs`, `world-sum.test.mjs`, `systems.mjs`, `switches.mjs`, CLAUDE.md §5 and §8 | either, each line in a place of its own (rule 3) | the gatekeeper lists such PRs one after another |
| `docs/SHAPES.md` | K: parts 2 (`reqId`) and 5; R: parts 2 (the weapon's `gid`) and 3 | part 8 (names): one at a time |

## Files K waits on (read the status files again before each PR)

- **Card L** (state and phases): its trade door (#1809, `trade2.js`), then
  its worker doors in order (`duel.js`, `party.js`, `cooking.js`,
  `gathering.js`, the fishing file, `dungeon.js`, the guard's file,
  `ride.js`, `poses.js`, `race.js`, `gladiator.js`/`arena.js`);
  `src/state/phases.js`; its page doors (the death door, `loading`,
  `window`); its `ui` and `render` resets (`BroTown.jsx`, `src/ui/**`,
  `src/rendering/**`). **`wsClient.js` is yours from PR 5 to the last PR
  that changes it: card L's `connection` door goes after K's last
  `wsClient.js` PR** (card L's own card says so: "before K starts, or after
  K"; K starts now).
- **Card SK**: `server/src/ride.js` and `src/game/ride.js`, `moveDiet.js`,
  `src/state/movement.js`, and its #1782 in `wsClient.js` and `BroTown.jsx`.
- **Card T**: `tools/guards/lib/switches.mjs`, `docs/SWITCHES.md`,
  `src/debug/report.js` (#1804); from its PR 6, `src/game/switches.js` and
  the reads it moves into it across `src/` (a few systems a PR).
- **Card O**: `src/game/framePacer.js`, `clientOff.js`, `deviceProfile.js`,
  `drawLanes.js`, `src/debug/report.js` and `perfTracker.js`; later
  `entityRenderer.js`.
- **Card LB**: `src/ui/mobile/dash/LeaderboardPanel.jsx` (#1798).
- **Card TF**: the townsfolk's files (`folkSkill.js`, `_drawFolk`); card P:
  `src/rendering/**` (no send there). Card J2: `tools/qa/mp/**`.
- **Card R**: the shared files above.

## Not yours

The roads' table, the stash, experience, points and quest doors, the
weapon's id, the restore and the export (card R); `GOLD_ROADS` and
`BAG_ROADS`; the phase doors and `REJOIN_SLOTS` (card L); the switch
table's form (card T: you add rows); the sitting's card and the signals
(card Q, after K); a helper's lane (step 11.7); 6.2's shared tables;
`docs/plan/census/wire.md` (card C's, done).
