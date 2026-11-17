# Card SEC: the second red team's fixes (the ones that need no decision and sit in no running card's files)

**Why (the owner, 2026-11-17):** *"run another red team to find vulnerabilities
in order to ensure none exist after fixing"*, then *"a fresh look. Starting
from scratch"*, then, on the list it produced and the orchestrator's
recommendation (one new fix session for what needs no decision; the three
worst in card K's files to card K): *"Go recommended"*.

**Starts:** now. **Tags:** 5700 to 5714, one a PR, in the order below; 5715 to
5719 spare (the block `"SEC": [[5700, 5719]]`, written by PR 1).
**Browser:** none (PR 14 alone is page code: its own node test, no phone run).
**Effort:** extra (money, saves, the join).
**Read first:** `CLAUDE.md` (§4 deploying; §5 the wire's rules: deny by
default, a kill switch for every new server behaviour, one write, writes
cost money, the doors); `docs/ARCHITECTURE-HANDOFF.md` whole (rule 2's
storage-key registry, rule 3 the stashes' caps, rules 5 to 10); the ten rules
at the top of part 5 of `docs/GRAND-PLAN.md`; `docs/plan/README.md`;
`docs/TRAPS.md` §277 (every merged `server/test/` file deploys) and §316 (a
new line in a shared list on a line of its own); the switch table
(`tools/guards/lib/switches.mjs`, `node tools/guards/switches.test.mjs
--write`); and, before each PR, the spec of the system it touches.

**How to prove each fix.** Each PR adds a server suite (or extends the
nearest) that FAILS on `main` before the change and passes after: the
finish line's break proof (plan rule 8). The house's shared test room
(`server/test/testroom.mjs`) and its restart tests
(`server/test/chaos-restart.test.mjs`, `storm.test.mjs`,
`world-sum.test.mjs`) are the harness. Local only: never the live game.

## PRs, in order

1. **(tag 5700) This card.** Files: `docs/plan/cards/SEC.md`,
   `docs/plan/status/SEC.md`, `tools/dev/tag-blocks.json` (the block
   `"SEC": [[5700, 5719]]`, `nextBlock` 5720).

2. **(tag 5701) A join's id is a string of the id's form.**
   - Today: the join's gate for names every object carries asks only of
     strings (`server/src/join.js`, the `MAGIC_IDS` gate, about line 676:
     `typeof msg.id === 'string' && MAGIC_IDS.has(msg.id)`). An `id` that is
     a list, a number, a boolean or an object is let in, records are written
     under `auth:__proto__`, `rpg:[object Object]` and the like, two live
     sessions can share one character, and the owner's kick, freeze and
     silence answer "not online" for it.
   - Build: before that gate, refuse a join whose `id` is present and is not
     a string of 1 to 64 characters of the form the game's own ids take.
     FIRST list every way an id is made (`server/src/account.js`,
     `src/networking/index.js`, guest ids, `admin.js`'s export form about
     line 149) and choose the narrowest form every one of them fits; say the
     census in the PR. The refusal is the same answer the magic-name gate
     gives, with nothing read or written first.
   - Kill switch `joinidform: false`. No cap: an honest phone never meets it.
   - **Done when:** the suite refuses a list, a number, `0`, `true`, an
     object, `""`, 65 characters and a NUL inside an id, each with no
     storage row written and no session kept; every id form the census found
     still joins; the switch thrown restores today's way.

3. **(tag 5702) A refused write is seen, and the bank's two records land
   together.**
   - Today: `_saveRpg`'s put is in a `try {} catch (e) {}`
     (`server/src/persistence.js`, about lines 307 to 455) and the vault's
     put swallows its refusal (`server/src/bank.js`, about 286 to 290). When
     the storage refuses writes, a withdrawal leaves the purse credited in
     memory and the vault unchanged on file; the purse is written again by
     the next ordinary save and the vault never is (`leave.js`
     `_bankForget` drops the memory copy), so the gold exists twice. A
     deposit made then is lost.
   - The reading chosen: the owner's decided behaviour stands (a payout
     keeps working while saves are refused: `valuepause.js`'s header). The
     fix is that the vault's record and the character's record land
     together or not at all: a vault whose put was refused is marked dirty,
     is written again in the SAME synchronous run as the character's next
     save (rule 5: one write), and is never dropped from memory while dirty
     (the leave writes both). The bank's answer says so when its own write
     was refused (the existing `paused` refusal and its words).
   - No new write in the ordinary case (`cost-guard` holds the line); the
     refused put is counted where card A already counts it (`roomrow.js`).
   - Kill switch `bankretry: false`.
   - **Done when:** with a storage that refuses puts for a while and then
     takes them, a withdrawal and a deposit each end with the world's sum
     unchanged (unexplained gold 0) after a later save, a leave and a
     restart; the same under the restart test's every-batch sweep for the
     bank's two actions; `valuepause.test` still green.

4. **(tag 5703) The bag-size switch never destroys what is stored.**
   - Today: `disable_bigbags` lowers the caps to 8 and 32
     (`liveops.js` `_syncBagCaps`), and the cuts rule 3 calls "the cuts that
     remain" then run at those lowered caps: the join's
     (`gear.js` `_sanitizeWeaponList`, `arr.slice(0, this.WEAPON_STASH_CAP)`),
     the gear lists' at the save (`persistence.js` `capStash`) and the join
     (`gearstash.js`). A player's 140 weapons become 8 on file at their next
     login.
   - The reading chosen: the cuts that remain always run at the NORMAL caps
     (140 and 48), whatever the switch says; the switch only lowers what a
     give may fill (the stash door already refuses a give past the cap).
     With the switch not thrown, nothing changes.
   - No kill switch, for rule 3's own reason (one would only bring back a
     cut that destroys weapons). Rule 3's words in
     `docs/ARCHITECTURE-HANDOFF.md` are brought up to date in this PR.
   - **Done when:** with `disable_bigbags: true`, a join and a save keep 140
     weapons and 48 pieces of each gear list on file; a give into a bag over
     the lowered cap is refused; with the switch off the suite reads as today.

5. **(tag 5704) A save from a newer worker keeps the fields this worker
   does not know.**
   - Today: with `newersave: false` (the rollback's step 2 in
     `docs/OPERATIONS.md`, which says nothing is lost) the older worker lets
     the player in and writes the record again from its own field list
     (`persistence.js` `_saveRpg`, with `_rpgSaveVFor` keeping the newer
     `_v`): a field the newer version added is dropped, and the kept mark
     means no migration puts it back.
   - Build: when a player's stored version is newer than this worker's, keep
     the stored record's unknown top-level fields at load and write them
     through under the known field list. One sentence in OPERATIONS's step,
     and `docs/specs/migrations.md`.
   - Kill switch `newerkeep: false`.
   - **Done when:** a record at a newer `_v` with an unknown field keeps it
     through a join, a save and a leave with `newersave: false`; a known
     field still saves as today; the refusal without the switch is unchanged.

6. **(tag 5705) The leaderboard holds what it keeps and what it reads.**
   - Today (`server/src/leaderboard.js`): a negative `limit` returns nearly
     every row (about line 101); the cache key is the category as sent, so a
     made-up category is the level board under a new key and a full read
     each time (about 256 to 276, 345); `updatePlayer` keeps `clanTag` and
     five other fields as sent, of any size (about 160 to 178); the read
     lists every `player:` row unpaged and the sweep sits behind it.
   - Build: `limit` held to 1 to 100; the board's real name worked out
     before the key; each kept field held to its type and a short length; a
     row over a byte ceiling refused; the read paged; the sweep before the
     sort.
   - Kill switch `boardhold: false` if the object can read the live flags
     the way `docs/specs/board-cache.md`'s switch does; else say why not.
   - **Done when:** the suite shows each of the five held; the boards' own
     suites (`boards.test`, `statboards.test`, the cache's) stay green; no
     board a player sees changes.

7. **(tag 5706) The feedback board keeps its hour for honest posts.**
   - Today (`server/src/feedback.js`): the per-address paces live in memory
     and reset when the object sleeps (`_paced`, about 491 to 519); one
     shared hour's budget serves posts, votes and crash reports, and a vote
     on a ticket that does not exist is counted before the ticket is looked
     for (about 336, 343); the crash feed is one row, a ring of 200, that
     junk can push every real report out of and that can grow past a row's
     size, with no way to clear it (about 243 to 266, 570); the list reads
     every ticket ever kept on each ask (about 370 to 411); the text keeps
     direction-changing and zero-width characters (about 268 to 301).
   - Build: a share of the hour for each kind (posts, votes, crash
     reports); the per-address counts in the stored hour row (no new row);
     the ticket looked up before a vote is counted; the crash feed cut by
     bytes, cleared by the owner's sweep, and a full row dropping its oldest
     half; the list's answer kept 30 seconds and the board capped at its
     newest 500 tickets; the text through the cleaner the name already uses.
   - Its switch the way `docs/specs/feedback-guard.md`'s is made.
   - **Done when:** one address cannot use more than its kind's share; an
     honest crash report and a bug report still land beside a full vote
     share; 200 junk reports leave a real one readable; `cost-guard` green.

8. **(tag 5707) The public reads' pace has no side door.**
   - Today (`server/src/publicreads.js`, about 107 to 111): a request with
     any `Authorization` header, whatever it says, skips both the kept
     answer and the pace; `/api/market/my`, `/history`, `/api/store/mine`
     and `/api/arena/tournament` were never covered.
   - Build: the pass-through only for the room's health check; every public
     GET on the three surfaces paced. Rides the existing `publicreads` flag.
   - **Done when:** the suite shows a request with a junk header paced as
     one without; the four routes paced; a signed-in player's own reads
     still answered.

9. **(tag 5708) A guest that has done nothing writes nothing.**
   - Today: a throwaway guest's join still writes about two and a half rows
     (`join.js`, the `reportToLeaderboard(session, true)` call about line
     2092; the bot statistics' `botstat:` row, written about twice and never
     deleted). `docs/specs/guest-lazy.md` is the neighbour: read it first.
   - Build: no board report and no `botstat:` row until the guest has done
     something worth keeping (the same test `guestlazy` uses); an owner's
     sweep of `botstat:` rows whose character has no record.
   - Kill switch `guestquiet: false`. The storage-key registry unchanged
     (no new key).
   - **Done when:** an idle guest's join and leave write 0 rows in the room
     and send no board report; a guest who then plays is counted as today;
     the sweep removes only orphan rows; the bot signals' suites stay green.

10. **(tag 5709) A character restart is one write; requests received have
    a ceiling.**
    - Today: `_resetCharacterData` (`persistence.js`, about 533 to 636) is
      sixteen separate awaited deletes: the room restarting between them
      leaves a new level-1 character holding the old vault, farm and pets.
      `friends.js` (about 141 to 173) puts no ceiling on requests RECEIVED.
    - Build: collect the keys and issue one `storage.delete([...])` in the
      same run as the `rpg:` delete (the same rows, fewer awaits); refuse a
      friend request with the existing "target full" answer at 50 pending.
    - Kill switch `reqincap: false` for the ceiling; none for the delete's
      shape.
    - **Done when:** the restart test's every-batch sweep over a character
      restart leaves no record of the old character beside the new one; the
      51st pending request is refused; `restore.test` and the friends' suite
      stay green.

11. **(tag 5710) A player's restore says what it would copy.**
    - Today (`server/src/playerrestore.js`, about 89, 223, 245): with
      `fullsnap` off the vault is never rewound, so restoring one player
      adds back what they banked, traded or gifted since the copy; the dry
      run shows the new total and not why.
    - Build: the answer (dry and real) gains `moved`: the vault's gold and
      items now when the copy does not carry the vault, and the transfer
      ledger's rows (`xfer:`) since the copy's day that name this player as
      the giver. No new write, no new lever; OPERATIONS's restore steps say
      to read it. (Asking for an explicit yes in the Test panel is a later
      PR for the planner: it needs the panel's row.)
    - **Done when:** the suite's banked-then-restored player shows the vault
      and the gift in `moved`; the answer is unchanged when nothing moved.

12. **(tag 5711) The owner can see a flood.**
    - Today: refusals by address, sockets closed for flooding and relay
      bytes dropped are counted on the session only and reach no owner page.
    - Build: one tally on the room (memory only: say so), read by
      `/api/admin/overview` (`server/src/admin.js`); a paragraph in
      `docs/OPERATIONS.md` on a free uptime monitor pointed at
      `/health/room` and Cloudflare's usage notice.
    - Kill switch `floodtally: false`. No write.
    - **Done when:** the overview shows the three counts after the suite
      makes each happen; nothing is written; the overview's shape for an
      older Test panel is unchanged apart from the new field.

13. **(tag 5712) The chain's sends have a day's budget.**
    - Today (`server/src/chainscore.js`, about 86 to 94 and 368 to 373;
      `chainwriter.js`, about 349 to 375): every new character's early
      level-ups make the game's wallet pay a fee, with no ceiling a day, no
      live flag and a fee taken at twice the node's quote whatever it is.
    - Build: a kill switch `chainscore: false`; a ceiling on sends a day; a
      ceiling on the fee a send may pay. The day's count rides a record a
      send already writes; if a send writes none, the count is memory's and
      the PR says so. NEVER a new write (the owner's cost rule): if one is
      truly needed, stop and put it under Needs.
    - **Done when:** past the day's ceiling a send waits for tomorrow and
      nothing is lost; a quote over the fee ceiling is not sent; the switch
      thrown sends nothing.

14. **(tag 5713) Two small ones on the page.** ASK FIRST: put under Needs
    whether card L holds `src/networking/gameEvents.js`; if it does, hand
    the first half to L under Found and build only the second.
    - `gameEvents.js` (about 3855 to 3878): the damage popup a relay brings
      draws `Number(payload.dmg) || 0` and finite `x`, `y`, never a string.
    - The developer console (`?dev=1&debug=1`, `src/debug/`): the recorded
      `join` frame and the State tab show the login key and device token
      blanked.
    - **Done when:** a node test of each; nothing an honest player sees
      changes.

15. **(tag 5714) Three guards and words.**
    - `tools/guards/do-migrations.test.mjs` reads every `server/wrangler.*`
      file, and holds the worker's `name`, `main` and each binding's class.
    - `docs/specs/provenance.md`'s check asks which branch signed
      (`--source-ref refs/heads/main`).
    - `server/src/verify.js` (about line 69) honours the account check's
      address override only for a local host.
    - **Done when:** each guard's break proof is recorded.

## Rules for every PR here

- **A kill switch each**, lower case, with its row in the switch table
  (`on` its merge day), except where the card says none and why.
- **No cap**: nothing here is a new path the phone takes. If a reply's
  shape grows, an older page must read it as before.
- **Writes cost money**: nothing here may write more; `cost-guard.test`
  holds the lines. A new write is the owner's call: stop and ask.
- **One write** (handoff rules 5 and 7): PRs 3 and 10 are that rule.
- **Every merged `server/test/` file deploys** (TRAPS §277): open a PR only
  when its line is done; the gatekeeper batches them.
- **`join.js` is shared**: PRs 2 and 9 touch it. Merge `main` first, keep
  the hunks small, a new line on a line of its own (TRAPS §316).
- **What a player sees:** nothing in this card changes it. If a fix would,
  stop and put it under Needs.

## Not yours

- **Card K's files** (the planning session routes these to K): the body
  size limit at the routes (`index.js` `routeHttp`, `wire/door.js`), the
  look relay's pace (`index.js` `track`, `lookrelay.js`), the place at a
  rejoin (`lastplace.js`, `movement.js`), and after those: a move's field
  types, the Workshop start's place, a try/catch round the single-message
  path, `_relayBuild`'s field list, the room ceiling's fairness
  (`flood.js`), the request id in public orders (`market.js`), the colour
  and picture forms at `track` and `store.js`.
- **The owner's calls, built by nobody until said:** the described-gear path
  (`grids.js`, `gearstash.js`); retiring old login keys (`devicelock.js`,
  `loginkeys.js`); the roster cookie (`rosterCookie.js`); the site's headers
  (`public/_headers`: is the game ever shown inside another site's page?);
  where the admin key is kept (`DevPanel.jsx`); a guest's share of the
  seats; what a character restart leaves on file; the four claim switches.
- **`.github/` and `server/wrangler.toml`**: the owner's own words
  (the CODEOWNERS lines, the pinned actions, the workflows' permissions).
- A wrong-typed stored field closing the join where today it is defaulted:
  listed, not built (it changes what a broken record's player meets).
