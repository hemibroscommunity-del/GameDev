# Achievements (v2.3.3485)

The owner, 2026-10-19: "Achievement points are something I'd like in the game.
You get it by completing the game. Some of them are through super rare
achievements. Although not as rare, an arena winner should be included in
that." The plan (its research of what already existed, and six questions) was
answered "Go recommended on everything".

## Decided

1. **Points per tier:** common 10 AP, rare 100, super-rare 1,000, and the
   arena's 500 between them ("although not as rare").
2. **The arena's 500 AP once a character.** v2.3.3481 paid it on every crown,
   and a second account in a two-player bracket could crown every few minutes.
   Now it is the Gladiator achievement: the first crown pays the points, a
   later crown pays its gold, and the row counts the crowns.
3. **Super-rares are shown** before they are earned (players hunt what they can
   see), not hidden as "???".
4. **The moment:** a banner and a sound for rare, the arena and super-rare, and
   a line in the chat for common.
5. **Player-versus-player achievements:** a duel won and a No man's land kill,
   once each, common. A friend's second account can hand you one; at 10 AP that
   is the owner's accepted trade.
6. **Where:** the More page's Journey tile, which was always empty (nothing in
   the game or the worker writes a journey), becomes Achievements. Your AP
   number opens it.

## The 23 achievements

7,470 AP in all.

| id | name | tier | AP | what earns it | where the worker notices it |
|---|---|---|---|---|---|
| first_blood | First Blood | common | 10 | your first kill | combat.js `_resolveMonsterKill` (the killing blow) |
| combat_10 | Blooded | common | 10 | Melee, Bow or Magic to level 10 | prog3.js `_prog3AwardXp` (a level-up) |
| first_dungeon | Into the Dark | common | 10 | clear a dungeon of the Wheel (counted) | dungeon.js `_dungeonComplete` (`cfg.home`; never the Workshop) |
| first_pet | Gotcha | common | 10 | catch a pet | trapping.js (the catch) |
| first_order | Farmhand | common | 10 | deliver a Feed & Seed order (counted) | farmorders.js `_handleFarmOrder` |
| first_duel | Duelist | common | 10 | win a duel by the kill (counted) | duel.js `_resolveDuel` (`how` 'kill', not an arena match) |
| nml_kill | Outlaw | common | 10 | kill a player under No man's land's rule (counted) | nomansland.js `_nmlOnDeath` |
| story_done | Storyteller | rare | 100 | every story chain's last quest handed in | quests.js `_handleQuestTurnIn` |
| codex_all | Know Thy Enemy | rare | 100 | a kill of all nine kinds | the kill, from the codex's counts |
| elder_all | Elder Hunter | rare | 100 | all nine kinds past level 20 | the kill, the codex's second-stage counts |
| dungeons_all | Delver | rare | 100 | the Great Cave, Foundry Dome and Buried City | dungeon.js (`dg` on the record) |
| combat_50 | Veteran | rare | 100 | a combat skill to 50 | prog3.js |
| natural_one | Natural One | rare | 100 | a killing blow whose kill roll is 1 (1 in 10,000; counted) | combat.js (`kr.roll`) |
| iron_blade | Iron Great Sword | rare | 100 | an Iron Great Sword off a kill (counted) | index.js `_handleLootPickup` |
| golden_pet | Golden Catch | rare | 100 | a golden pet (counted) | trapping.js |
| elite_piece | Elite | rare | 100 | an Elite or Godly piece, found or forged (counted) | the pickup, gear.js and armorforge.js's forges, dailychest.js |
| gladiator | Gladiator | arena | 500 | win the Gladiator Arena (counted) | gladiator.js `_arenaCrown`, by the mail (below) |
| tempered | Perfectly Tempered | super-rare | 1,000 | harden a weapon to H5 (counted) | hardening.js (a success at `HARDEN.MAX`) |
| golden_giant | Golden Giant | super-rare | 1,000 | a golden pet that is big too, size 1.18+ (counted) | trapping.js |
| elite_iron | Elite Iron | super-rare | 1,000 | an Elite (or Godly) Iron Great Sword off a kill (counted) | the pickup |
| house_limit | Breaking the House | super-rare | 1,000 | the free spin's pot doubled to the house limit (counted) | dailyrewards.js (`news.top`) |
| combat_100 | Centurion | super-rare | 1,000 | a combat skill to 100 | prog3.js |
| godly | Godly | super-rare | 1,000 | a Godly piece, found or forged (counted) | as Elite |

"The story" is the last quest of every live chain (tut_4, life_2, beast_4,
mayor_3), worked out from the quest table: a chain's middle can be skipped
(mayor_1 hid itself while the Wheel's buildings had no doors), and a skipped
quest must never make the achievement impossible.

Left out on purpose: life-skill levels (the guild ladder already pays AP for
them), owning Hemi Bros (buying, not playing), logins and streaks (not
"completing the game").

## How it is built

`server/src/achievements.js` (`achievementMethods`, a mixin, rule 22),
modelled on the codex (codex.js).

- **The record** `achv:<pid>`: `{v, got: {<id>: at}, n: {<id>: times},
  dg: {<land>: 1}}`. AP stays in the rpg blob's `achievementPoints` (rule 1: no
  new blob field). Ids only from `ACHV.LIST`, which is append-only; a stored
  record's unknown keys are dropped on load (null-prototype maps, so a
  `__proto__` id is just dropped).
- **One write per payment.** `_achvGrant` marks `got`, adds the points to the
  live player and writes the record, and the place it is called from saves the
  player in the same synchronous run (or the grant saves, `save: true`, where
  that place does not). `got` is the stamp (rules 5 and 7): present, the
  achievement never pays again, so there is no oplog. Every change is written at
  once; nothing is held unwritten, so a deploy loses nothing.
- **Locked:** a record written by a newer worker (`v` above ours), or one whose
  read failed, is never paid into or written over, and the phone is told
  `unavailable`.
- **At the join:** one GET, BEFORE the mail drains, so the arena's achievement
  waiting there finds its record. Then `_achvSweep` grants what the worker can
  already see you did before achievements existed: a kill (`svKills`), a combat
  level, the story's ends, the codex's nine kinds, a pet, a golden or golden
  big one. It is quiet: one chat line on the phone, no banners. Dungeons,
  orders, duels, Outlaw, rolls, gear, H5 and the spin leave no trace the worker
  can read, so they wait for the next time.
- **The arena:** `_arenaCrown` pays the gold as before (no `ap` in it any more)
  and sends a second credit, `kind: 'achv'`, `{id: 'gladiator'}`, opId
  `arenaachv:<tid>`. inbox.js applies it through `_achvFromMail`, which returns
  FALSE (the entry stays queued, the pet's rule) while the record is not loaded
  or is locked: the gold never waits on it. The champion box says `ap` only
  when that crown pays it (`_achvWouldPay`: 500, 0 if earned before, nothing if
  the champion is away and it cannot tell yet). A v2.3.3481 gold credit still
  carrying `ap` in a mailbox goes through the Gladiator achievement too, so it
  pays once.
- **The stamp:** the AP on the inspect card's blob (`rpgData.ap`) came from the
  phone's own `track`, so a modified page could show any number on its card, in
  the lists and on the leaderboard. `_achvStamp` writes the worker's total over
  it on every track (index.js, beside the clan tag's and the cape's stamps) and
  at the join, whatever the kill switch says.
- **Cost:** an ordinary kill writes nothing new. A character's first kill writes
  one row more (First Blood); counted rows write one row each time they count,
  and none of them is frequent (`cost-guard` §5).

## The card: your title and your rarest

The plan's Phase 3. A player's card had a placeholder title ("Fishing
Master") and "rarest drop" ("Ancient Ember Crown"), the same on everyone's
(src/ui/panels/playerProfile.js PROFILE_PREVIEW).

- **The title** is an achievement you have, picked on the Achievements page
  ("Use as title"), or none. The record keeps it as `t`, and only while you
  have it (the lever's clear forgets it). `achv_title {id}` changes it:
  - the same title again writes nothing;
  - a change is one row, PACED (flood.js `PACE.ACHVT`, a burst of 10 and one
    more every 10 s, handoff rule 27). Past the burst a change is REFUSED,
    never held, so a tap never queues a write behind it;
  - anything you do not have, an unknown id, `__proto__`, a number or an
    object is refused. So is any change with the kill switch on, or with the
    record unreadable;
  - the phone is always sent `achv_state` back, so a refused tap puts its page
    right.
- **The rarest** is worked out, never chosen: the earned achievement first in
  `ACHV.RARITY`:
  - by tier first: super-rare, then the arena, rare, common;
  - in a tier, by the worker's own odds. H5 is five successes in a row, ~1 in
    2.5 million runs: a failure with under 20 temper resets the weapon to H0,
    and a success clears the temper, so the pity band almost never builds.
    Godly is 1 in 2,000,000 a quality roll. An Elite Iron Great Sword is ~1 in
    55,000 kills. The house limit is ~1 in 600 spins at one a day. A golden
    giant is ~1 in 700 catches. Level 100 is a grind that comes...
- **On the card** both are ids on the inspect card's blob (`rpgData.title`,
  `rpgData.rarest`), stamped by `_achvStamp` with the AP at the join and on
  every track. A page's own `title` or `rarest` is taken off, never relayed,
  and an unreadable record shows neither.
  - The page has the words and pictures (src/data/achievements.js).
  - A far player's list entry carries them too (nearjoin.js `LIST_RPG_KEYS`).
  - The phone puts its own title and rarest in its track, so a change is news
    and goes at once (lookrelay.js); the worker's stamp is still the truth.

## The wire

| message | direction | when | payload |
|---|---|---|---|
| `achv_state` | worker -> phone, PRIVILEGED | at the join (after `codex_state`), on every change and in answer to `achv_title` | `{v, got, n, dg, t?, rarest?, ap, new?: [id], retro?: [id]}`, or `{unavailable: true}` |
| `achv_title` | phone -> worker | "Use as title" on the page | `{id}`: an achievement you have, or `null` to take it off |
| `rpgData.title`, `rpgData.rarest` | on the card's blob, relayed | the join and every track | achievement ids, the worker's (`_achvStamp`) |
| `inbox_delivered` entry `kind: 'achv'` | worker -> phone | a Gladiator crown delivered | `{id: 'gladiator'}` |
| `caps.achievements` | in `state_sync` | the join | `true`; `achievements: false` in the live flags turns it off |
| POST `/api/admin/dev/achv` | owner -> worker | the Test panel | `{playerId, id}` / `{all: true}` / `{clear: true}`: lit without points; clear forgets them, the points stay |

**Kill switch:** `achievements: false` in the live flags. Nothing is granted,
counted or swept, the arena's crown sends no achievement, and the cap is off at
the next join. What was earned stays, AP included.

## The phone

The page, the More tile, the moment, the mail line and the arena's words: see
docs/UI-DESIGN-NOTES.md "Achievements". `src/data/achievements.js` holds each
row's words and picture, held to the worker's list by mirror-audit.

## After the owner's ChatGPT review (2026-10-19)

The owner sent ChatGPT's review of the page (the kit: its brief and nine
pictures). Each finding was checked against the code and the owner's
decisions first:

- **Built:**
  - the AP, "9/23" and the title on the page's own header row, right of
    "◂ ACHIEVEMENTS": a `Head` in BottomDashboard's PANELS, drawn on both
    drilled headers (sideways on its own line under the title);
  - 48 px rows with a one-line `clue` (src/data/achievements.js) and short
    progress (`achvProgressShort`: "best Lv 23", "4/9", "1/3");
  - a tap opens a row in place (its whole `how` and the progress in words;
    on an earned row, the title buttons), one at a time;
  - every name in the warm white;
  - the AP split as the page's last line (`achvSplitWords`);
  - the card's title chip and rarest box open the page under More
    (InspectPlayerPanel `openFromCard`);
  - the super-rare rarest box a rainbow edge on the card's slate;
  - a long title cut with an ellipsis in its chip (`max-width: 60%`).

  The page now opens on two whole rows where it opened on one (`mp-achievements` 2a2).
- **Not built:**
  - a "Closest first" sort: only six rows have progress the worker sends;
  - the banner's smaller type: it would make the name smaller than its 16 px.
- **Not wired:** the badge "drafts" ChatGPT drew in code (its own words: "NOT
  claimed as the hand-painted art ... Approve/rework the appearance before
  inserting"). Shown them in the game beside today's pictures, the owner
  chose "Wait for painted ones": the borrowed pictures stay until then.

## Not built yet

- The owner's own badge art: docs/ART-WISHLIST.md "Achievements".

## Tests

- `server/test/achievements.test.mjs` (91): every achievement at its place, once;
  the record and the save of its points in one synchronous run; the arena's
  first crown, a second one, a champion away, an unreadable record and a
  v2.3.3481 crown in the mail; locked records; the kill switch; the join's
  sweep; the stamp; the lever; normalizeAchv; and the card (§11): the rarest's
  order, `achv_title`'s every refusal, its pace, and the stamp over a page's
  claim. `cost-guard` §9c: 200 title changes in 2 s write at most 10 rows.
- `mirror-audit`: the page's list, tiers, points and counting rows are the
  worker's. `cost-guard` §5: the first kill's one extra row, none after.
  `wire-audit`: `achv_state` privileged. `arena` §4: the crown's points.
- `server/test/achievements-client.test.mjs` (64): the phone's half, in node:
  `achv_state` read and checked, the moments queued, the page's numbers, the
  mail's words, the title's ask, and the wiring (the direct switch, the
  shim's passthrough, the banner outside the world's wrap).
- `mp-achievements` (a phone, sideways and a computer).
