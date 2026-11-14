# RT-3 findings: players, privacy, legal, bots (red team, 2026-11-14, v2.3.5592)

The owner's question: three months on, BroTown is dead because players were
harmed or driven away, the game was pulled for a privacy or legal problem, or
bots ruined it. This is RT-3's part: players, privacy, legal and bots. Each
finding: what, proof, harm, likelihood, covered by the plan or not, smallest fix.
"Suspected, not proven" where no local run or quoted line proves it. Nothing here
touched the live game: the node test rooms and the bot lab only. I am not a
lawyer; the items marked LAWYER need one.

Proof scripts: `docs/security/rt3-proofs/` (run each from the repo root with
`node docs/security/rt3-proofs/<file>`; the React one needs `npm install`).

## The ranked list (likelihood x harm, most first)

| # | What | Proof | Harm | Likely | In the plan? | Smallest fix | Build / run cost |
|---|---|---|---|---|---|---|---|
| 1 | **S1** No word filter, no silence, a frozen player back in a second | `t4-ban.mjs`; quoted lines | Slurs and abuse reach 13-year-olds; the owner cannot remove anyone; the About panel promises otherwise | near certain once strangers play | No card (FUN-SOCIAL Phase 4 is a trigger; 10.9 has no card) | A silence lever + a freeze that refuses the frozen character's devices; a slur list (the owner's words) | ~150 lines, a new card; nothing to run |
| 2 | **S2** A name can be anything and changed mid-game ("SYSTEM: your account is banned, send your login") | `t1-names.mjs` | Posing as the game or the owner; scams; slurs on name tags and boards | high (the honest name box allows "BroTown Admin") | No (11.4 templates mail only) | `name` out of `track`'s look keys; `cleanCharName` (as `cleanPetName`), reserved words, unique names | ~100 lines; card K (`track`'s row) or a new card |
| 3 | **B1** A throwaway character is free and mints ~460 gold for a main: ~550,000 gold an hour from one home line | `fleet-funnel.mjs`: 200 throwaways, 91,500 gold, nothing refused | The economy (prices, market, auction house) | medium-high once anyone looks | Partly, later (R's `hold` columns at 0; K's 4.2 sees one character, not a fleet; Q not started) | OWNER turns the account check on; the login wheel waits for 10 active minutes or level 4 | ~20 lines + suite; free to run |
| 4 | **S3** The feedback board: anyone on the internet writes to it, nobody can delete, one post blanks the game for whoever opens it | `t2-feedback.mjs`, `react-object-name.cjs` | Scam notices in the game's own board; the board a crash | medium | No (outside the room's wire door; no card holds `feedback.js`) | Name a string cut to 24; render `String()`; an owner delete; one error boundary | ~50 lines; ASKED the planning session (no card holds the files) |
| 5 | **P1** Anyone reads who is online and when, any player's bids, every crash report | `privacy-reads.mjs` | Stalking; "the game leaks player data" | medium | `/store/mine` only (11.5, no card) | `/crashes` behind the admin key; `/top` without `lastSeen`/`playtime`; `/store/mine` asks the session | ~40 lines; PW/LB, K |
| 6 | **P2** No privacy contact, no deletion, the notice a draft | quoted lines | A complaint or regulator pulls the game | low-medium, high harm | No | OWNER: notice, contact, controller; CODE: an admin "erase player" route | ~80 lines, a new card |
| 7 | **L1** Hats named and drawn after Mickey, Naruto, Kermit (live; a townsperson wears one) | quoted lines | A takedown notice takes the site down | low-medium | No | Rename and redraw three hats, re-bake Gary | ~1 hour + a re-bake |
| 8 | **S4** A harasser flushes the report's evidence with three harmless lines | `t5-evidence.mjs` | Reports useless | medium | 10.9 (no card) | Keep the lines each player RECEIVED, send those with a report | ~20 lines |
| 9 | **P3** A permanent public chain record per character, automatic, no notice, no kill switch | quoted lines | Erasure impossible (LAWYER) | low-medium | No | OWNER checks if live; a `chainscore` kill switch + opt-in | ~20 lines |
| 10 | **L2** Sound licences: a Freesound artist's file filed as Pixabay, unnamed; 39 CONFIRMs | ffprobe tags | A claim on a few files | breach probable, enforcement unlikely | No | OWNER reads ~25 Freesound pages; code adds names to About | an hour each |
| 11 | **B2** A 24-hour script: 2-6x an honest hour, flagged, keeps it all; owns the Kills and skill boards and their chain record | bot lab today | Boards meaningless; honest players give up on them | medium | K 4.2 (per hour), Q (watch) | Hours: a board row and a chain write wait for a human-shaped day (Q's 10.2 card) | Q's card |
| 12 | **S5** Trade requests spammed, each with a popup and sound | `t6-invites.mjs`: 100 in 10 s | Harassment | medium | 10.9 (no card) | party.js's `INVITE_REPEAT_MS` into `trade2.js`, `friends.js` | ~10 lines |
| 13 | **P4** Login keys in a 2-year cookie scripts can read; old keys from the public id (device lock holds) | quoted lines; `oldkey.mjs` | Account takeover if a second wall falls | low | card S (accounts) | Ids, not keys, in the cookie; retire old keys; a CSP | small; S / RT-1 |
| 14 | **P5** Google Fonts, wsrv.nl, GitHub raw at page load | quoted lines | German demand letters | low | No | Host fonts and CSV in `public/` | ~1 hour |
| 15 | **B6** Eight addresses of throwaways fill the one room | quoted lines (not run) | Every real player told "room full" | low-medium | No (RT-1/RT-2) | B1's check; fresh characters give their place first | owner lever `ip_sockets` today |
| 16 | **B3** The arena's house prize, shared, taken by walkovers | quoted lines (not run) | Honest arena prizes zeroed | low-medium | No | A walkover pays the entries back, no house gold | ~10 lines |
| 17 | **S6** New players killed and stripped at the town's edge (the owner's design) | quoted lines | New players quit | medium | No | No player-kill under level 3 or first 30 minutes | one check |
| 18 | **S7 / L6** Minors: 13+ only in About; open chat and whispers; gold-only gambling | quoted lines | LAWYER | - | No | A rules-and-age line at creation; whispers friends-only for new characters | small |
| 19 | **B4** Throwaways at level 4 spend the owner's gas | quoted lines | The relayer wallet drained | low | No | A day budget of chain writes | ~15 lines |
| 20 | **P6, P7, L3-L5, L7, B5** | below | | low | | below | |

## Only the owner can do

1. **Turn the account check on** (Turnstile): OPERATIONS.md "The account check".
   It needs the site key in `server/wrangler.toml`, which only the owner may
   approve, and the secret in the dashboard. Closes most of B1, S1's ban
   evasion, B6.
2. **Decide the chat rules' teeth**: whether there is a word list (and its words),
   timeouts, and what "muted or removed" in About means; the server-kept block.
3. **Write the privacy notice and give a contact email**; name the data
   controller (who "Hemi Bros Community" is). Until then a deletion request has
   nowhere private to go.
4. **Check two secrets and two settings in the dashboard**: is the chain relayer
   key set (writes live)? is Turnstile's secret set? are Cloudflare Web Analytics
   or Workers Logs on (they keep addresses)?
5. **Read ~25 Freesound pages** (CREDITS.md's CONFIRM rows; klankbeeld's shield
   sound) and say each licence; any NonCommercial one comes out.
6. **A written assignment from the Hemi Bros artist** (CREDITS.md:51 "No terms").
7. **Which AI tool and plan made what** (Grok Imagine is credited nowhere; Suno's
   receipts), so the terms can be read.
8. **A lawyer's hour**: the hats and the collection's traits (Disney, Pepe);
   "Hemi"/"BroTown" trademark search; gambling-like games for 13+; GDPR/PECR
   (fonts, device token, canvas hash, cookie, chain record); COPPA and the UK
   Children's Code; LICENSE (MIT with no carve-out for art and sound).
9. **Before the repo goes public**: GitHub secret scanning over the FULL history
   (this clone is shallow), raw Pixabay/Freesound sources out of `assets/`, a
   decision on the purchased tileset in history.
10. **Policy calls**: no player-kill for brand-new characters (S6); a hold on a
    new character's trades (R's `hold`, B1); an hours rule for boards (B2).

## Bots (measured locally)

### B1. A throwaway character is free, and each one mints about 460 gold a day for a main (HIGH, proven)

- **What**: the account check (Turnstile) is OFF in production. `server/wrangler.toml:61`
  `TURNSTILE_SITEKEY = ""` ("Empty = the check is off (every new character is let in
  as before)"), and `verify.js` `_verifyConfigured()` needs both keys. Deploys apply
  `[vars]` wholesale (wrangler.toml:40-44), so a dashboard value cannot be on.
- The login wheel is "one per ACCOUNT", and the account is the DEVICE id
  (`loginspin.js` header: "THE ACCOUNT is the DEVICE ... devicelock.js cleanDevice"),
  a random token the phone makes up. A script sends a new one each join.
- The trade window moves any gold with no fee, hold or pace (`playerroads.js:82`
  `fee: 0, hold: 0, pace: 0`), and a character can trade the second it exists.
- **Proof** (local, the real GameRoom in memory, card E's test room;
  `scratchpad/bots/fleet-funnel.mjs`, copied to `docs/security/rt3-proofs/fleet-funnel.mjs`):
  200 new characters, each a new device id: join, spin, collect, trade-window all
  gold to one main. Result: `{"N":200,"mainGain":91500,"perAlt":458,"msgsPerAlt":12,"refused":{}}`.
  Nothing refused, nothing flagged. 2,208 storage rows (11 a throwaway).
- **Scale**: one internet address may join 20 times a minute (`flood.js:77`
  `IP_JOINS_PER_MIN: 20`). So one home line makes ~1,200 throwaways an hour, about
  **550,000 gold an hour**; an honest fighter makes about 3,100 (bot lab
  `loot-walk-fighter`). That is ~175x, from a 60-line script, every day, with no
  play at all. A cheap pool of addresses multiplies it.
- **Harm**: gold stops meaning anything (the market, the auction house, prices);
  the main tops any wealth view; and 11 rows a throwaway are the room's write bill
  (9,000 throwaways spend the free plan's 100,000 rows a day).
- **Likelihood**: high once anyone looks (a public repo, or a player reading the
  network tab). The daily spin is the most visible free money in the game.
- **Covered by the plan?** Partly, later. Card R's road table (10.5) has the
  `hold`/`fee`/`pace` columns, all 0 and read by nothing. Card K's 4.2 bench
  measures ONE character's liar's take an hour; it does not see a fleet. Card Q
  (10.2-10.9, not started) watches and makes cases, after the fact. Nothing in
  the plan keys the daily spin to something the server measures.
- **Smallest fix** (in this order):
  1. **The owner turns the account check on** (OPERATIONS.md "The account
     check": a Turnstile widget, the secret in the dashboard, the site key in
     wrangler.toml, which only the owner may approve). Cost: 0 to build, free to
     run; a real player ticks a box once. It makes each throwaway a solved
     challenge (a captcha farm still beats it, at a price).
  2. **The login wheel waits for play the server measured**: a character spins
     after, say, 10 active minutes or level 4 (`_prog3`), not on its first
     breath. ~20 lines in `loginspin.js` + its suite, behind a live flag.
     Cost to run: nothing. Route: card R (it owns the roads) or a new card.
  3. **A new character's trade window holds gold** (`playerroads.js` `hold`
     for the first N active hours) -- card R's table, turned up: the owner's
     call (pillar 10 "Turning any of them up is the owner's call").

### B2. A 24-hour script is 2-6x an honest hour, flagged, and keeps it all (MEDIUM, proven)

Bot lab today (`node tools/qa/load/bot-lab.mjs 60`, seed 1, this checkout, 5 min):

| Doing | Honest an hour | Script an hour | x | Flagged? |
|---|---|---|---|---|
| Pine logs (`edge-pine` vs `honest-pine`) | 429 | 951 | 2.2 | yes (`aimed, gesture`), paid in full |
| Kills, bow aimbot under the message budget (`aimbot-bow` vs `honest-archer`) | 415 kills, 30k xp | 2,658 kills, 64k xp | 6.4 kills, 2.1 xp | yes (`rooted`), paid in full |
| Cooking (`limit-cook` vs `honest-cook`) | 1,390 | 2,400 (the cap) | 1.7 | yes (`cook`) |
| Harvest with no start (`nofp-pine`, `disguised-pine`) | - | 6 | ~0 | closed since v2.3.3322 |
| Walking (`burst`) | 150-250 px/s | 656 px/s | ~3 | - |

- The per-hour holes the 2026-10-16 review found are mostly closed (harvest,
  hit-proof, move budget, one socket). What is left is the time: a script
  plays 24 hours, every day; an honest player perhaps 1-3. So per DAY a script
  is ~10-50x a person, on boards that are now server-authoritative (kills,
  levels, skills: `leaderboard.js` SERIES_CATEGORIES), so a bot owns the
  Kills and skill boards within a week, and its kills and levels go on the
  public chain as "authoritative" (`chainscore.js`).
- "Flag, never act" (`docs/specs/server-botsig.md`): every flag above changes
  nothing. The owner sees them in the Test panel's Bot flags.
- **Covered**: card K's 4.2 (each gain to 1.5, its first step merged: move
  4.35, bow label 3.76, reach 2.96, harvest 1.86, cook 1.59 still over), card Q
  (10.2 the sitting's card with hours of the day played; 10.9 cases). Both
  planned; Q not started (no card file in `docs/plan/cards/`).
- **Smallest fix, not in the plan**: hours. The plan's own line (pillar 10,
  "hours, accounts a person") but no step builds an hour rule. A board row and
  a chain write could wait for a character whose day has a human shape (the
  sitting's card, 10.2, has "the hours of the day played"). The owner's call
  (no play caps: "Dont ship any caps yet"). Route: card Q.

### B3. The arena's house prize is shared, so a fleet takes every honest player's prize (MEDIUM, from reading the code)

- `gladiator.js:59-60` `PRIZE_PER_ENTRANT: 250, HOUSE_GOLD_PER_HOUR: 3600` game-wide,
  and `gladiator.js:401-402` an offline opponent is a walkover. Seven free
  throwaways enter and log off; the eighth wins by walkover (the 2026-10-16
  review, item 6, still true by reading).
- **Harm**: the fleet takes the whole hour's house gold, and an honest bracket
  that hour pays from entries only. Suspected, not proven by a run.
- **Covered**: no. **Smallest fix**: a walkover pays the entries back and no
  house gold (a few lines in `_arenaOnMatchResolved`), behind a flag. A new card
  or card R (a mint road).

### B4. Throwaways reaching level 4 each spend the owner's gas on mainnet (LOW-MEDIUM, from reading the code)

- `chainscore.js` header: "levels 4, 10, 25 ... bounded at nine transactions per
  character"; "4 -- the very first level-up -- ... within their first minutes".
  No game-wide day budget (no day or budget constant in chainscore.js; only the
  per-player `_chainInFlight` and a send queue).
- With free characters, a script levelling throwaways to 4 spends one relayer
  transaction each. On an L2 a transaction is cheap (cents or less; a lawyer
  is not needed, the owner's wallet balance is the number), so the harm is the
  wallet drained and the chain writes stopping for everyone, silently.
- **Smallest fix**: a day budget of chain writes (say 200) in chainscore.js,
  behind a flag; and B1's account check. A new card (chain files belong to no
  running card that I found). Whether the relayer key is even set is the owner's
  knowledge.

### B5. What does NOT ruin the boards (ruled out)

- Gold earned, playtime and dungeons on the board are the phone's own blob
  (`index.js` ~6199 `rpgData = session.data?.rpgData`; `track` merges it, size
  bounded only), so a script can write any number there. But the phone's board
  (`src/ui/mobile/dash/LeaderboardPanel.jsx`) shows the server's series, AP and
  power; only the old desktop panel (`src/ui/panels/LeaderboardPanel.jsx`, still
  lazily loaded) reads those columns. LOW: delete the three columns, or route
  them from server counts. Card PW (the boards) or card LB.
- The per-address limits hold one address to 16 sockets and 20 joins a minute
  (`flood.js:76-77`); the origin lock (`origin.js`) does not stop a script (it
  sends any Origin header it likes) and is not meant to.

## Legal (assets, names, licences). I am not a lawyer: items marked LAWYER need one.

### L1. Three wearable hats are named after (and drawn like) other companies' characters (MEDIUM, proven)

- `src/rendering/traits/headwearCatalog.js:44` `{ id: 'mickey-ears', name: 'Mickey Ears' }`,
  `:95` `'Naruto Headband'`, `:103` `'Kermit Hat'`; live: `pendingTraits.js:51`
  `PENDING_TRAITS_LIVE = true`. A townsperson wears one: `src/data/npcLooks.js:156`
  `hat: 'naruto-headband'` (Guildmaster Gary).
- The Hemi Bros collection's own trait layers (the portraits' source,
  `assets/portrait-source/hemi-bros/`, names in `tools/qa/nft_portraits.py:102-105`)
  look like Iron Man's helmet, Gojo, Pepe, a Jedi robe (the legal sweep's reading of
  the pictures; not re-checked by me).
- **Harm**: a takedown notice to Cloudflare Pages or GitHub takes the site down.
  Disney and Furie (Pepe) both enforce. **Likelihood**: low-medium (small demo,
  but the names say exactly what was copied).
- **Smallest fix (code)**: rename the three (`Round Ears`, `Ninja Headband`,
  `Frog Hat`; the ids stay, saves keep the id), redraw their tell-tale marks,
  change Gary's hat; re-bake his look (`tools/qa/npc-looks.mjs`). A new card
  (art); ~1 hour plus a re-bake. **OWNER/LAWYER**: the collection's traits.

### L2. Sound licences: at least one file is filed under the wrong licence, its author unnamed (MEDIUM, proven)

- `public/sfx/shield/shield-block.mp3` carries its own tags: `artist: C klankbeeld 2017`,
  `copyright: Cklankbeeld`, `comment: http://www.freesound.org/people/klankbeeld/`
  (read with ffprobe). CREDITS.md's blanket row calls `public/sfx/` Pixabay ("no
  attribution required"). The About panel (`AboutPanel.jsx` Credits) does not name
  klankbeeld. If it is CC BY, the licence needs the name shown; without it the
  licence ends.
- The legal sweep also found: `public/audio/slime-death-v2.mp3` tagged "FoolBoy
  Media"; `public/audio/ambient/wind-dunes.mp3` with no CREDITS row; 39 `CONFIRM`
  marks in CREDITS.md (about 20 Freesound sounds never looked up); jump sounds and
  `daily-spin` by authors the About panel does not name.
- What is right: the About panel exists, players reach it (More, About), and it
  credits the CC BY footsteps (`AboutPanel.jsx` ~117-119).
- **Smallest fix**: OWNER opens ~25 Freesound pages and says each licence
  (any NC must come out); then a code PR adds the names and licence links to the
  About panel and the missing CREDITS rows. A new card (or the sound card, if one
  runs). Cost: an hour of the owner's time, an hour of code.

### L3. Who owns the Hemi Bros art (LAWYER, owner)

- CREDITS.md:51: the collection was "made by an artist or a team based in
  Mongolia, at the repository owner's direction", "No terms". It is the townsfolk
  portraits, the brand and the logo. Without a written assignment the artist may
  still hold the copyright. **Only the owner can do**: get a written assignment.

### L4. AI tools: one not credited, one mislabelled (LOW-MEDIUM, owner)

- Grok Imagine (xAI) made player animation frames ("carved from the Grok clip",
  `src/rendering/playerSprites.js:99,104,148`; `docs/skill-animation-pipeline.md:8`)
  and is named nowhere in CREDITS.md or About. About says "all music ... Suno"
  but `dance-beat.mp3` is a Pixabay track (legal sweep). **OWNER** confirms which
  tool and plan made what (paid plans' terms differ on commercial use); LAWYER
  reads the xAI and Suno terms. Then a CREDITS/About correction (code).

### L5. The names (LAWYER, not checked)

- "Hemi" is also a car-engine trademark (Stellantis's HEMI) and Hemi Labs'
  network name; "BroTown" is close to "bro'Town", a New Zealand TV cartoon
  (2004-09). A trademark search in the game and clothing classes is a lawyer's.

### L6. Chance-based rewards for a 13+ audience (LAWYER)

- In-game gold only, never sold or cashed out (no code sells gold; the supporter
  pass is not built): Gamble Hall 40% (`src/data/items.js:180`), Ace's coin flip
  (`gamble.js`), the daily login wheel with unlimited double-or-nothing
  (`loginspin.js`), a daily chest, a weekly jackpot lottery at 50 gold a ticket
  (`cadence.js:29-53`), arena betting pools. About says 13+ (`AboutPanel.jsx:104`).
  Gold moves between players freely, so gold has a street price the day anyone
  sells it. Some countries rate simulated gambling (Australia: R18+ since 2024,
  for classification). LAWYER: simulated gambling for teenagers, and what changes
  the day the pass sells anything that touches gold or spins.

### L7. The project licence (owner/LAWYER)

- `LICENSE` is MIT, "Copyright (c) 2026 Hemi Bros Community", with no carve-out
  for art and sound (only CREDITS.md:3-8 says assets keep their own terms). About
  60 raw Pixabay/Freesound source files sit in `assets/sfx-source/`; Pixabay's
  licence forbids redistributing files as they are, which a PUBLIC repo does. A
  deleted purchased tileset (`TX_*`) is still in git history from when the repo was
  public. **Fix**: one line in LICENSE limiting MIT to the code; before any repo
  goes public, move raw sound sources out (and decide on history). Owner/LAWYER;
  who "Hemi Bros Community" is as a legal owner.

### Ruled out (legal)

- Code: the 17 client runtime packages are MIT/BSD/ISC; the worker has no runtime
  packages; vendored noble-secp256k1 is MIT with its licence; no copied code found.
- No LPC/Kenney/OpenGameArt pack files in the tree; the NonCommercial arena sounds
  are not in the game.
- Style prompts naming games ("like Eastward or Sea of Stars", `bible.js:90`): a
  style is generally not protected. LOW.
- Fonts: OFL, from Google Fonts (`src/index.html:66`): the licence is fine; the
  privacy side (players' addresses sent to Google) is in the privacy part.

### B6. Eight addresses of joined throwaways fill the one room (MEDIUM, from reading the code; availability, shared with RT-1/RT-2)

- One room for the whole world, `MAX_PLAYERS = 120` (`index.js:766`); one address
  holds at most 16 places (`flood.js:76` `IP_SOCKETS: 16`); a joined socket that
  sends a real move now and then stays (the AFK sweep, `index.js:1202`, resets on
  real input). Throwaways are free (B1). So 8 addresses (a phone hotspot and a few
  cheap VPN exits) hold 128 places and every real player is told `room_full`.
- Not run here (it needs many addresses; the node room has none). Suspected, not
  proven by a run; each step is a quoted line.
- **Owner's lever today**: the `ip_sockets` live flag (lower it to 4: 30
  addresses needed) and `max_players`. **Smallest fix**: B1's account check; then
  a place in the room held by a character with some play behind it ahead of a
  new one (a fresh character is the first to give its place up). Route: the
  server split's room door (SERVER-SPLIT-PLAN), or RT-1/RT-2's list.

## Player safety

Proof scripts: `docs/security/rt3-proofs/` (each runs with `node <file>` from the
repo root against the node test room; written for this review, not suites).

### S1. One troll cannot be stopped: no word filter, no silence, and a frozen player is back in a second (HIGH, proven)

- **No lane filters words**: room chat (the whole world), area, whispers to any
  stranger by name, party, friend messages, shop threads. `chatguard.js`
  `cleanChatText` strips invisible and right-to-left characters, stacked accents,
  emoji runs; no word list anywhere in `server/src` or `src`
  (`docs/specs/chat-guard.md:194` "No word filter. That is a later choice for the
  owner.").
- **The owner's levers**: kick and freeze one `bp_` id (`admin.js` ~375-394). No
  silence or timeout, no rename, no ban by device or address.
- **Proof** (`t4-ban.mjs`): a frozen id is refused `frozen`; a NEW id from the SAME
  device and SAME address is let in. The account check is off (B1).
- **Harm**: slurs and sexual content reach every player, 13-year-olds included
  (About says 13+), and the owner has no way to remove the person. The About panel
  promises "Harassment, hate and spam get muted or removed" (`AboutPanel.jsx`),
  a promise the tools cannot keep. **Likelihood**: near certain once strangers play.
- **Plan**: `docs/FUN-SOCIAL-PLAN.md:233-240` Phase 4 (a word filter, timeouts, a
  server block) starts "at ~20 regular players or the first spam complaint": a
  trigger, no card. 10.9 (card Q) has a server-kept block; Q has no card file.
- **Smallest fix** (a new card, "the moderator's levers", ~150 lines + suites):
  1. `silenced:<pid>{until}` set from admin.js and the Test panel, checked at the
     chat entry points (the mute's own list, `MUTABLE_RELAY_TYPES`, already names
     them): ~40 lines;
  2. a freeze also refuses the frozen character's known device ids
     (`auth:<pid>.devs`): ~30 lines; plus B1's account check (owner);
  3. a short slur list in `cleanChatText`, matched after folding look-alike
     letters, digits-for-letters and spacing; the line dropped: ~80 lines plus
     the list. The list's words are the owner's call.

### S2. A name can be anything, and changed mid-game into "SYSTEM: send your login" (HIGH, proven)

- `track` carries `name` among its look keys (`index.js` ~588-594
  `TRACK_COSMETIC_KEYS`), cut to length only (~5014), written to the player's state
  and sent to everyone (~5061-5071). The owner's "names are permanent"
  (`join.js` ~855-867) is defeated after join.
- **Proof** (`t1-names.mjs`, re-run by me): after one `track`, the name was
  `"Owner‮ (admin)\n\n\nSYSTEM: your account is banned, send your login"`;
  the victim got it in `player_update`, and room chat used it as the speaker's
  name. At creation a zero-width space, a right-to-left override and a newline
  were stored for good in `char:<pid>`; a second character took the victim's exact
  name, which makes every whisper to that name "ambiguous" (`chatlanes.js` ~172).
- Also: the honest name box (`NameModal.jsx:1350`) checks nothing but 20
  characters; the arena takes the request's own claimed name (`gladiator.js:312`)
  and everyone reads "<name> is the Gladiator champion!"; no owner badge anywhere.
- **Harm**: posing as the game or the owner to scam login keys or gold; slurs on
  name tags and the public boards. The device lock blunts a stolen key
  (`devicelock.js`, on by default), but not a gold scam or a slur.
- **Plan**: 11.4 (card K PR 12, tag 5197) templates the game's mail sentences
  only; it does not say what a name may be, nor the rename through `track`.
- **Smallest fix** (~100 lines; card K takes `track`'s row, or a new card):
  `name` out of `TRACK_COSMETIC_KEYS` (or stamped from `session.char.name`, as the
  look is); one `cleanCharName` modelled on `cleanPetName` (`petbook.js` ~228-235:
  letters, digits, space, `'-`, 3-16); a reserved list (brotown, admin, system,
  owner, mod, gm, after folding); unique names through a `name:<folded>` key (a
  storage-key registry row); an owner rename lever.

### S3. The feedback board: anyone on the internet writes to it, nobody can delete, and one post blanks the game for whoever opens it (HIGH, proven)

- `/api/feedback` goes straight to the Feedback object (`index.js:412-414`), before
  the origin lock and outside the room's wire door; `playerId` and `playerName` are
  taken as given; no type or length check on the name (`feedback.js` ~106-130);
  the 5-an-hour limit is keyed on the claimed id; no delete route.
- **Proof** (`t2-feedback.mjs`, re-run by me): 20 of 20 posts as "BroTown Team
  (official) ... whisper your Login Key" accepted; a 5,000-character name accepted;
  an OBJECT as the name accepted and served back by `/list`; 50 up-votes from
  made-up ids counted; `DELETE` 404.
- **The crash** (`react-object-name.cjs`, React 18.3.1 as the game uses):
  rendering the panel's `{t.playerName || 'Bro'}` with an object THROWS "Objects
  are not valid as a React child". `src/` has no error boundary
  (no `componentDidCatch` / `getDerivedStateFromError`; one root, `main.jsx`), so
  React unmounts the whole UI. Every player who opens Feedback while that ticket
  is among the newest shown loses the game's screens until they reload; the owner
  cannot remove it without a code change. Not run in a browser; each step proven.
- **Harm**: a scam notice in the game's own board; the board turned into a crash
  for everyone. **Likelihood**: medium (the route is in the page's network tab).
- **Plan**: not covered (card K's hostile-values suite, PR 3, covers rows the
  ROOM handles; this route never reaches the room).
- **Smallest fix** (~30 lines, `feedback.js` and `FeedbackPanel.jsx`; a new card or
  card K's door, routed by the planning session): the name a string cut to 24
  (else refused); render `String(...)`; an owner DELETE behind the admin key; and
  later a room-issued token (the session) for a post. Plus one error boundary
  round each window (~20 lines) so no one panel can blank the game.

### S4. A harasser flushes the evidence before the report (MEDIUM, proven)

- A report quotes the speaker's last 3 lines across all lanes, in memory
  (`chatmod.js:33` `CONTEXT_LINES 3`, `_chatModRemember`). Proof (`t5-evidence.mjs`):
  two abusive whispers, then three harmless lines to someone else: the report held
  "nice weather / lol / gg". A deploy wipes the lines too. The owner gets no alert;
  reports wait in the Test panel. Reporting is only from the player card
  (`InspectPlayerPanel.jsx` ~711-721), not from a chat line.
- **Smallest fix** (~20 lines, `chatmod.js`): keep the lines each player RECEIVED
  (a ring per recipient, 10), and save those with the report. Route: card Q (10.9
  evidence) or the moderator's-levers card.

### S5. Trade requests can be spammed, each with a popup and a sound (MEDIUM, proven)

- `trade2.js` ~216: every `trade2_open` sends the card again. Proof
  (`t6-invites.mjs`): 100 cards in 10 s at the victim, each "<name> wants to
  trade!" and a sound; party invites are paced (5 s, 2 got through); duel
  challenges ~4.7 a second (the relay bucket); `friend_request` unpaced. Block is
  the phone's only (`docs/specs/block-list.md:3-5`), and a new character is not on
  it; `store_dm` is in neither block table.
- **Smallest fix** (~10 lines): party.js's `INVITE_REPEAT_MS` copied into
  `trade2.js` and `friends.js`. Route: card Q (10.9's server block) or a new card.

### S6. A new player can be killed and stripped at the town's edge (owner's design; MEDIUM)

- No man's land starts at the level-1 ring (`nomansland.js` ~17-24, `FIRST_TIER: 1`
  ~131); a player kill takes the whole bag, gathering tools, all gold and spare gear.
  No protection for a new character; a level-1 throwaway can camp the exit.
- The owner's call. A one-check option: no player-kill on a character under
  level 3 or in its first 30 minutes (`_nmlAllowed`).

### S7. Minors (owner and LAWYER)

- Nothing asks an age or shows terms at creation; "meant for players aged 13 and
  over" is only in About, two taps deep. Whispers from any stranger by name are on
  by default; no setting hides world chat. Gold-only gambling (L6).
- Smallest fix: a rules-and-age line at character creation, and whispers from
  friends only for a new character (both cheap); the age and its consequences are
  the owner's and a lawyer's.

### Ruled out (safety)

- Markup through names or chat (no `dangerouslySetInnerHTML`; every `innerHTML` is
  a constant or escaped); a last-second trade swap (`trade2.js` ~229-236, 262-272);
  a duel stake raised after the card (`duel.js` ~239-250); body-blocking (players do
  not collide); emote text (fixed lists); forging the board from outside (read-only
  route); a non-string name through `track` (the wire door refuses it,
  `t3-numname.mjs`); a stolen login key alone (the device lock).

## Privacy. I am not a lawyer: the lawyer's list is at the end.

Proof: `docs/security/rt3-proofs/privacy-reads.mjs` runs the repo's own GameRoom,
Feedback and Leaderboard classes as a stranger with no key, token or socket.

### P1. Anyone on the internet can read when each player is online, what they bid, and their crash reports (HIGH, proven)

- `GET /api/leaderboard/top` (`leaderboard.js` ~60-65, 206-269): each row's player
  id, name, playtime, clan tag and `lastSeen` in ms, refreshed at least every 10
  minutes while they play (`index.js` ~1238 `LEADERBOARD_MIN_MS`/`HEARTBEAT`).
  Polling it is a near-live "who is online, and when do they play" for every
  active player (about 30 categories x 100 rows).
- `GET /api/store/mine?playerId=X` (`store.js` ~597-608): any player's listings and
  what they bid on, how much and when. Proof: a stranger read Bob's bids. (Plan
  step 11.5 already names it, no card.) `GET /api/store/browse`: seller and bidder
  ids and names.
- `GET /api/feedback/crashes` (`feedback.js:61-65`, quoted above: no key check):
  every crash report, with the full browser User-Agent, zone, log lines, and in
  some lines the character's name (`BroTown.jsx` ~12634 `' as ' + snap.name`).
- **Harm**: stalking (when a player is on), and an easy "this game leaks player
  data" post. **Likelihood**: medium.
- **Smallest fix** (~40 lines in all): `/crashes` behind the admin key (one `if`,
  `feedback.js`); `/top` without `lastSeen` and `playtime` (or a day's
  resolution); `/store/mine` asks the session token (`_httpAuthCheck`, as 11.5
  says). Route: feedback.js no card holds (ask); `leaderboard.js` card PW/LB;
  `store.js` card K (11.5 is K's pillar).

### P2. No privacy contact, no deletion, and the notice is a draft (HIGH for a pull-down, owner)

- The About panel (Settings, About) has a privacy section, but its own header says
  "a plain-language starting draft written from the code, not legal advice; the
  owner signs off on the wording (and the age line)" (`AboutPanel.jsx` ~21-23). It
  names no controller and no contact; the only contact is "Send feedback", which
  posts to the PUBLIC board (S3). It is shown after the device id, fingerprint and
  font requests have happened.
- No erasure path: "restart / delete character" (`persistence.js` ~493+) copies
  the record to `rpgsnap:<pid>:prereset-*` first, and leaves `auth:`, `char:` (name,
  drawings), `botstat:`, `device:`, `bro_link:` (wallet), feedback tickets, the crash
  log and the chain record. No purge of inactive accounts.
- **Kept forever**: `auth:`, `char:`, `rpg:`, `botstat:` (network AS number and
  organisation, behaviour signals), `device:` (a hash including a canvas render,
  `src/networking/index.js` ~262-283), `bro_link:`, feedback tickets, board rows
  (filtered after 7 days, never deleted).
- **Smallest fix**: OWNER: the notice's words, a real contact address (email), the
  controller's name. CODE (a new card, ~80 lines + a suite): an admin "erase player"
  route that deletes every key the storage registry lists for a player id, and the
  player's device and feedback rows, logged in `admin_log`.

### P3. A permanent public record on the chain for each character, automatic, with no notice and no kill switch (MEDIUM, owner)

- `wrangler.toml` `SCORES_CONTRACT` (Hemi mainnet, "deployed 2026-08-13");
  `chainwriter.js` ~132 `playerKey = keccak256(playerId)`; the contract emits
  `ScoreRecorded(bytes32 indexed player, ...)`. Player ids are public in the game,
  so anyone can hash one and read that character's level history with dates. It
  cannot be erased (a clash with the right to erasure: LAWYER). Writes run when
  the relayer key secret is set (`_chainScoreConfigured`); no live flag stops them.
- **Smallest fix**: OWNER checks whether writes are live (`/api/admin/chainstatus`);
  deleting the relayer key in the dashboard stops new ones. CODE: a lower-case
  kill switch (`chainscore: false`) and an opt-in; the notice says it. A new card
  with B4's day budget.

### P4. Credentials: login keys in a 2-year cookie the page's scripts can read; old keys from the public id (MEDIUM, partly proven)

- `rosterCookie.js` ~40-85: the cookie `bt_chars` carries the roster "INCLUDING the
  phrase" (its own words: "The phrase IS the character ... the mirror has to carry
  it"), `Max-Age` two years, `SameSite=Lax; Secure`, not HttpOnly, on the widest
  domain the browser accepts. No Content-Security-Policy ships
  (`public/_headers` has cache rules only, per the sweep).
- Old-style ids carry two of a key's four words (`src/networking/index.js` ~95-101):
  the privacy sweep recovered the exact key from the id in 20 of 20 synthetic
  trials (~160 ms each, 247,500 candidates; `rt3-proofs/oldkey.mjs`). The device lock
  (`devicelock.js`, on by default) is the wall that holds: a key alone from an
  unknown device is refused. The owner already had this privately (antibot review
  "One more finding reached the owner privately").
- **Smallest fix**: the cookie keeps ids, never keys (or the page's own host only);
  retire old-style keys (card S, accounts); a CSP header (RT-1/RT-2's area).

### P5. Third parties get every player's address at page load, without consent (MEDIUM, proven by reading)

- Google Fonts (`src/index.html` ~66; a Munich court, 2022, LG Muenchen 3 O
  17493/20, and a wave of German demand letters after it), the wsrv.nl image proxy
  (`src/networking/index.js` ~308-310), a CSV from raw.githubusercontent.com
  (`GameApp.jsx:50`). No analytics or ad scripts found.
- **Smallest fix (code, ~1 hour)**: host the four OFL fonts and the CSV in
  `public/`; draw NFT avatars through the game's own path. A new small card (it
  touches `index.html`; check the memory law for the fonts' weight).

### P6. A linked wallet is findable by every nearby player (LOW-MEDIUM)

- The verified token id rides the tick to nearby players (`tick.js` ~555
  `bro: ps.bro`; `nearjoin.js` ~80); `ownerOf(tokenId)` on the public chain gives the
  wallet and its whole history. The notice says a wallet is kept "only if you choose
  to link one" but not that it becomes public. **Fix**: send a yes/no badge, not the
  id; say it in the notice.

### P7. If the repo goes public (LOW, owner)

- No secrets in the working tree (the 64-hex strings are curve constants and test
  digests). This clone is SHALLOW (1,081 commits): the full history was NOT
  checked. The repo was public before 2026-10-28, so that history is already
  copied. Exposed: the project's commit email and an AI tool's user id in a root
  video's file name. Admin routes are listed in the page's code and all answer 404
  without the key (proven). **OWNER**: run GitHub secret scanning over the full
  history before going public; also L7's raw sound files.

### Privacy: good practice found

The admin surface fails closed and compares hashed keys; the smoothness report is
anonymised; chat reports expire after 30 days; the transfer ledger 90 days, the
day book 60; server logs rarely carry ids; no Workers observability block in
wrangler.toml.

### For a lawyer (privacy)

GDPR / UK GDPR transparency (articles 12-14: controller, contact, basis, rights);
erasure (17) against the chain record; ePrivacy / PECR for the device token, the
canvas hash, the cookie and Google Fonts; transfers to Google, wsrv.nl, GitHub;
profiling (21-22) for the bot signals; COPPA's actual-knowledge rule and the UK
Children's Code for a 13+ game with open chat and private messages; whether the
prize draws and contests need terms.
