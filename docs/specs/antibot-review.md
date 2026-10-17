# The anti-bot review: what a script gets past the game today (v2.3.3271)

> The owner, 2026-10-16: *"I want you to examine the robustness of the anti
> bot protection built into the game."*

## The short answer

1. **The anti-bot system collects evidence, stops almost nothing, and nobody
   sees what it collects.**
   - It looks only at harvesting gestures (botfp.js).
   - Every number it judges is written by the phone, so a script writes
     whatever passes.
   - A script that sends no fingerprint at all is never even scored.
2. **Four server rules really hold bots back, and three of them have holes:**
   - the hour caps: 2,400 harvests a skill and 2,400 cooks an hour;
   - the combat hit limits;
   - the walking speed limit;
   - the harvest's timing check.

   In the lab a script gathered top-tier ore **48 times** as fast as an honest
   miner and killed monsters **7 times** as fast as an honest fighter.
   It was never flagged. It also plays 24 hours a day.
3. **Worse than farming: one person with a script could take the game down
   for everyone today, in about two minutes.** The game is on Cloudflare's free
   plan, whose daily limits cover the whole account. Several messages write a
   row of storage every time they are sent, with no limit on how often. Once
   the day's 100,000 rows are spent, nothing saves until midnight UTC. On the
   paid plan the same attack would cost about $100 a day.
4. **The urgent fixes are small, and honest play would never notice them.**
   They are listed in order at the end. Choosing them is the owner's call: the
   game's anti-bot policy since 2026-07-03 is "flag, never act", and some of
   the fixes change that.

## How this was tested

- **The bot lab** (`tools/qa/load/bot-lab.mjs`, new) runs scripted players
  against the REAL server code in this machine's memory, a simulated hour each.
  - Each script sends only messages the real game sends.
  - Each reports what it took home and what the anti-bot checks made of it.
  - Run it with `node tools/qa/load/bot-lab.mjs [minutes] [--only=name,name]`.
- **Two read-only reviews of the server code:**
  - every message type's limits;
  - what a free account is worth, and how value moves between accounts.

  Where this page says "from reading the code", nothing was run.
- **The `null` message** was also sent to a local copy of Cloudflare's own
  runtime (`wrangler dev`).

## Part 1: bots that farm

### What a script takes home in an hour (the lab)

| Doing | An honest player | A script | How many times | What the anti-bot checks made of the script |
|---|---|---|---|---|
| Pine, Woodcutting 1 (the commons' 6 trees) | 381 logs | 1,072 logs | 2.8x (every tree, the moment it grows back) | score 0, unless it repeats one fingerprint |
| Obsidian ore, Mining 15 (the level it opens) | 81 ore | 3,930 ore | **48x** (stopped only by the 2,400 an hour cap) | score 0 |
| Cooking minnows | 1,386 | 2,400 (the cap) | 1.7x | score 0 |
| Monsters, Frost Ridge levels 1-5 | 619 kills | 4,376 kills | **7x** (combat XP 2.2x) | nothing checks fighting |
| Walking speed | 150-250 px/s (441 the fastest build) | 2,909 px/s, or 58,661 with bundles | 6.6x, or ~130x | nothing records it |

A script runs all day. Over a day the obsidian script brings home about
94,000 ore. Three hours of honest mining brings home about 240.

### 1. A harvest without its "start" message skips the whole wait (CRITICAL)

- **What a harvest should take:**
  - First a string of hits. An obsidian vein is about 160 hits, or 104 seconds
    at the level it opens. The owner set each tier to take about twice as long
    as the one before.
  - Then the gesture, 1.5 seconds.
- **What the server checks:** a harvest's timing only against the `extraction_start` message the phone
  sends first (gathering.js `_handleNodeStrike`).
  - A strike with no start record is paid with **no timing check at all**: the
    branch kept for phones from before v2.3.229, which only counts it.
  - A start for one node followed by a strike on another is paid too, and not
    even counted. The lab did this twice and was paid twice.
- **Measured:** obsidian went from 81 ore an hour to 3,930.
- **Who still uses that branch:** every phone has sent the start message since
  v2.3.1704, so only scripts do, plus a harvest that was halfway through when
  the server restarted.
- **The fix:** pay only a strike that matches its own start record, after the
  record's hits. Also, a strike that comes with no fingerprint may not claim
  "perfect": every real gesture sends one (ExtractionSwipeLayer.jsx), and
  "perfect" doubles the yield.

### 2. The fingerprints are the phone's word, and a script controls the phone (HIGH)

`botfp.js` scores each harvest gesture's fingerprint:
- how smooth it is;
- how even its timing is;
- whether the same path was replayed.

From those it writes flags. In the lab:
- **The same fingerprint every time** was flagged (score 1,851) and **still paid
  in full**.
- **No fingerprint:** score 0 for the whole hour. The pattern checks run only
  on strikes that carry one, so they never run at all.
- **A fresh, human-looking fingerprint each time:** score 0.
- **Four accounts on one device id:** two of the four were flagged, all four paid. With an
  id each, nothing was flagged. The device id is the phone's word too: a random
  token it keeps in storage.

The only numbers a script cannot fake are the ones the server measures itself:
- time between messages;
- position;
- counts.

### 3. Nobody sees the flags, and a flag changes nothing (HIGH; the seeing fixed v2.3.3323, bot-flags.md)

- **Where flags go:** to storage under `botstat:`.
- **How to read them:** only with a `curl` command to `/api/botstat?flagged=1`.
  - It takes the admin key in a different header (`x-admin-key`) from every
    other admin command (`Authorization: Bearer`).
  - It isn't in OPERATIONS.md.
  - The Test panel doesn't show flags.
- **What a flag does:** nothing in the game. That is by design: the owner's
  2026-07-03 decision.

### 4. Movement: a script moves 6.6 times faster, or anywhere at once (HIGH)

- **The per-message allowance:** the speed check gives 80 px of slack for a
  roll and for network jitter, and gives it again with EVERY move message
  (movement.js).
  - At the phone's own 30 messages a second, that is 2,909 px/s.
  - A bundle of 24 moves in one message (the quiet phone's bundles, v2.3.3254)
    is 1,900 px at once, anywhere in the Wheel in under a second.
- **From reading the code:**
  - A zone change skips the check entirely (audit C-6, still open).
  - A reconnect may claim any position in any zone (join.js
    `_sanitizeJoinData`).
  - The server has no map of water, walls or buildings, so a script also walks
    through them.
- **The fix:**
  - make the 80 px a budget that refills over time;
  - start a reconnect where the player was last saved;
  - close the zone-change gap.

### 5. Fighting: hits are limited per monster, not per player, and "ranged" reaches 3,600 px without a bow (HIGH)

- **The hit limits:** one normal hit per 210 ms and three specials per 1.2 s,
  counted for each pair of player and monster (combat.js).
- **What a script can claim:**
  - A "ranged" or "staff" hit may come from anywhere in a zone, or within
    3,600 px in the Wheel.
  - It may be claimed with no bow or staff at all; the server then uses the
    sword's numbers.
  - From reading the code: in fights with monsters, a hit marked "special" is
    not matched to the mana paid for it. Fights between players are.
- **In the lab:** a script standing still, hitting every level 1-5 monster in
  reach as often as each monster's limit allowed, killed 4,376 an hour. An
  honest sword fighter killed 619.
- **The fix:**
  - limit hits per player across all monsters;
  - ask for the weapon a ranged or staff hit needs;
  - limit reach to what that weapon reaches, plus room for kiting;
  - charge PvE specials as PvP specials are charged.

  These need the fight simulator, so that no honest bow or staff build is
  clipped.

### 6. Free accounts, and moving value between them (MEDIUM)

From reading the code:
- **An account costs nothing.**
  - Any unused name is a new character.
  - There is no limit per device or per internet address, and no captcha.
  - A character starts with 50 gold.
- **What each account can collect:**
  - About 120 gold a day from the farm's order board, with no fighting.
  - About 400 a day after the first quest (four snowman kills): the free daily
    spin averages 144 to 230 gold.
  - About 1,450 a day with scripted daily quests.
  - About 2,235 gold once, from the quest chain.
- **How value moves between accounts:** a gift trade or the trade window
  (up to 999,999 gold), or an auction listing at any price.
  - None of these charges a fee or has a limit.
  - None keeps a lasting record of who gave what to whom.
- **The arena:**
  - Seven accounts join and log off, and the eighth wins every match by
    walkover.
  - That takes the house's whole 3,600 gold an hour, the game-wide cap from
    v2.3.3178: up to 86,400 a day for one operator.
- **The crimson cape:** its 20 tickets, one per account, can all go to one
  fleet.
- **On-chain scores:** each character's first combat level-up (level 4) writes
  to Hemi mainnet, paid by the game's relayer wallet if its key is set
  (chainscore.js). A thousand throwaway accounts would be a thousand
  transactions.
- **What the owner can see today:** `/api/admin/economy` (the total gold, the
  top 10, and an alert when total gold jumps 25% in a day). Nothing shows who
  traded what to whom.

### 7. Cooking (LOW)

- **What's claimed:** cooked or burnt is the phone's word.
- **The limits:** 45 a minute and 2,400 an hour.
- **The result:** a script cooks about 1.7 times as many as a quick honest cook,
  and never burns one.

## Part 2: bots that attack the game itself

These are not farming. Each lets one person stop the game for everyone, or run
up the bill.

**The free plan's limits.** They are daily and cover the whole account.
- 100,000 requests (20 incoming messages count as one).
- 13,000 GB-s of a server being awake.
- 100,000 rows written.

Past any of them, Cloudflare refuses that kind of work until midnight UTC
(docs/specs/cost-diet.md). The game's busiest day so far used 747 rows.

### 8. One message, one row written: the day's saves in about two minutes (CRITICAL)

- **Measured** (1,000 messages from one player gave 1,000 rows each time):
  - `chat_mute`, un-muting someone who was never muted;
  - `stats_update`, a defence of 10, 11, 10, 11 ...;
  - `friend_dm` to a friend who is offline (a second account is enough).
- **From reading the code, the same with:** `set_active_slot`,
  `build_point_earned`, equipping back and forth, `cape_equip` and
  `store_offer_reply`.
- **How fast:** a message may carry 24 of them. At 50 messages a second, 100,000
  rows go in about 80 seconds.
- **What then:**
  - Every save in the game fails without a word (`_saveRpg` swallows the
    error), so progress made after that is lost at the next restart.
  - No new character can be made.
  - Both last until midnight UTC.
- **On the paid plan:** the same is about 100 million rows a day, about $100 a
  day.

### 9. Any room name makes a new room, awake and billed (CRITICAL on the free plan)

- **The hole:** `/ws?room=<any name>` makes a new game room (index.js).
  - A room with a socket in it runs its tick and is billed 0.125 GB-s every
    second.
  - One word every 90 seconds keeps the socket from being logged out.
- **The cost:**
  - Two such rooms kept all day already pass the free plan's 13,000 GB-s.
  - A hundred pass it in about 17 minutes.
  - On the paid plan, each room kept awake is about $4 a month: a thousand
    are about $4,000.
- **The fix:** accept only the real room's name (and any name on a local test
  server).

### 10. One script can fill the room (HIGH)

- **The hole:** the room's 120 places count sockets, before any join.
- **Measured:** a socket that never joins keeps its place as long as it says
  one word every 90 seconds. Silent ones were logged out after 2 minutes.
- **The impact:** 120 such sockets lock every real player out. Accounts are
  free, so joined bots can do it too.
- **The fix:**
  - a socket must join within a few seconds;
  - limit the sockets per internet address, in the Worker before the room.

### 11. One socket, any number of players (HIGH)

- **Measured:** joining again on the same socket under a new name, 200 times,
  left 200 extra players in the room and wrote about 1,100 rows.
- **Why:** the earlier player is never removed, and every tick walks them all.
- **The fix:** one join per socket.

### 12. No limit on messages per socket (MEDIUM, the root cause of 8 and 11)

- **The gaps:**
  - Nothing counts a socket's messages overall.
  - Nothing closes a socket for sending too many.
  - The 16 KB size limit and the relay's own budget cover only their own paths.
- **What is not the danger:** the server's own time. Each message took 2-5
  microseconds here, and a bundle of 24 moves 76.
- **What is:** the free plan's quotas, and the writes.
- **The fix:** a budget per socket well above the phone's own 30 messages a
  second. A socket over it is closed with the code that stops the phone
  reconnecting by itself.

### 13. A message that is just `null` (LOW)

It throws in the server's handler. On a local copy of Cloudflare's runtime it
is logged as an error, and the room and its players carry on. It's a one-line
fix.

### Also found, from reading the code

- **Dungeons:** there are 8 at a time for the whole room, so eight accounts can
  hold them all.
- **Zone names:** every new `dungeon:<anything>` zone name adds an entry that
  is never removed, and the tick walks the node list every time.
- **Public pages:** the leaderboard and the feedback list read every stored row
  on every request. The crash report rewrites a log of up to about 1 MB each
  time. Feedback's limits are keyed by ids the phone makes up.
- **One message to everyone:** a changed look, or any unknown message under
  16 KB, goes to everyone in the room. The relay's budget is 8, then 4 a
  second.

## What to do, in order

**Done since this review:** the urgent five (1-5 below) in
docs/specs/one-socket.md (v2.3.3274), and the account check in
docs/specs/account-check.md (v2.3.3275, off until the owner sets the keys).
Fix 9, the flags shown, in docs/specs/bot-flags.md (v2.3.3323): the Test
panel's Bot flags section lists every flagged player in words, and
OPERATIONS.md says how to read them (/api/botstat takes the Bearer key now).
One more finding reached the owner privately: the way a login key becomes a
player id needs replacing with server-issued random ids and a proper
credential; it is on the list below the farming holes.

**Urgent: one person can stop the game.** Each item is small and honest play
never notices it. Items 2 and 4 touch the room's door and the join, where the
server split is being built, so they are best done with that session.
1. Write nothing when nothing changed:
   - `chat_mute`;
   - `set_active_slot` and `build_point_earned` when the value is the same;
   - an offline friend's messages at most once every few seconds;
   - `stats_update` and equipping saved at most once a second for each player.
2. Accept only the real room's name.
3. A message budget per socket. Close sockets that go over it.
4. Join within a few seconds, and once per socket. Limit the sockets per
   internet address.
5. Guard the `null` message.

**High: bots farm far faster than people.**

6. A harvest pays only against its own start record, after its hits. A strike
   without a fingerprint may not claim "perfect".
7. Movement:
   - the 80 px becomes a budget that refills;
   - a reconnect starts where you were saved;
   - close the zone-change gap.
8. Fighting:
   - limit hits per player across monsters;
   - ask for the weapon;
   - make reach that weapon's;
   - charge PvE specials.

   The simulator checks each change.
9. Show the flags in the Test panel. Put the command in OPERATIONS.md.

**The owner's call (policy):**

10. Act on evidence. Today a flag does nothing. For example: lower a flagged
    account's hour caps, or hold its trades and auction listings for review.
11. Make a new account earn the right to move value. For example: trading and
    listing open after some hours of play, or with the supporter pass.
12. Judge what the server measures itself, not the phone's numbers. Hours
    online a day, per account and per device, is the hardest thing for a bot to
    fake: humans sleep.
13. The planned two-hour daily cap for free play is the strongest limit on what
    one account can farm. It only holds once accounts cost something.

## Files

- `tools/qa/load/bot-lab.mjs`: the bot lab. It sits under `tools/`, so it never
  deploys the worker.
- `docs/specs/antibot-review.md`: this page.
- `docs/specs/anticheat-botfp.md`: a pointer to this page.
- `CLAUDE.md`: Testing, the bot lab.
