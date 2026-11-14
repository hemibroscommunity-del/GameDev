# RT-3 findings: players, privacy, legal, bots (red team, 2026-11-14)

Working file, written as the review goes (the card RT brief). Each finding:
what, proof, harm, likelihood, covered by the plan or not, smallest fix.
"Suspected, not proven" where no local test or quoted line proves it.
Nothing here touched the live game: local worker and node test rooms only.

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
  `scratchpad/bots/fleet-funnel.mjs`, copied to `docs/security/rt3-fleet-funnel.mjs`):
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
