# Performance ideas for after the showing: what's missing, ideas of our own, and the colour question (v2.3.3719)

The owner, 2026-10-28:

- *"Based on what you know about mobile game performance for games like mine,
  is there anything we're missing that should be integrated into this game?"*
- *"Also are there any novel ways that aren't commonly used in other games you
  think could improve performance in mine? One instance I'm thinking of is how
  you eliminated the lag after putting on a piece of armor."*
- *"I like these ideas. Can you document them so it doesn't get lost in this
  conversation?"*

**Nothing here is built yet.** Each item:

- waits until after the showing;
- needs the owner's yes;
- goes in its own PR.

The memory work already running (lanes M1-M4) is in `docs/MEMORY-MAP.md`.
"Battery saver (a cooler phone)" on the owner's list
(`docs/OWNER-LIST-2026-10-26.md`, "After the judges") is the same aim as 1a's
heat step and 2f below.

## The owner's standing decisions (2026-10-28)

- **Combat never feels slow.** *"I definitely don't want combat to feel slow."*
  - These stay loaded behind the loading screen, as the preloading law says
    (CLAUDE.md §7): every swing, dodge, jump, block and special, a hit taken,
    a death, walking and running, and everything another player does.
  - None of them goes on any load-when-wanted list, now or later.
- **Loading other animations when they're first wanted is held off.** This
  covers fishing, mining, crafting, emotes and weapons not in your three
  slots. The owner: *"I might add it later but I'll hold off. I'll wait to see
  how the memory work goes."*
  - Revisit after the character lanes' phase 2, measured.
  - The gathering poses already load this way (#822, v2.3.3077): made on the
    way to a tree, as a log lands in the bag, or when a campfire is lit.

## 1. What mobile games do that this game doesn't yet

Checked against the code on 2026-10-28. These are already in place, so they
aren't listed:

- smoothing (antialias) off;
- no blur behind windows (`docs/LANTERN-SLATE-SPEC.md`), with one exception
  (1f);
- far players and monsters not drawn (`docs/specs/peer-cull.md`);
- monsters sent to each phone by distance (`server/src/wheelzone.js`);
- recovery after the graphics are lost (renderHeal, the rebuild);
- music streamed from its file;
- the world's art kept as colour numbers.

### 1a. An automatic lighter mode

- **Today.** The game can already draw the screen at 2x instead of 3x
  (`?res=2`) and draw fewer other players in full (`?crowd=K`). These are
  switches in the address, and nothing turns them on by itself.
- **The idea.** Most mobile games step down by themselves, on three triggers:
  - **slow frames for a while.** An iPhone slows itself down when it heats up
    in a long session.
  - **a crash last time.** A phone whose last session ended killed or black
    starts the next one lighter. The crash trap (`src/debug/crashTrap.js`)
    already records `killed`, `CONTEXT_LOST` and `auto-reload` on the phone.
  - **the game's own memory count** (2b).
- **The cost.** The picture is a little softer, on those phones only. That
  changes the look, so it is the owner's call.

### 1b. Smoothness reports from real phones

- **Today.** The crash trap reports crashes and black screens from players'
  phones, but not stutter. Every frame-time number in this repo comes from a
  QA machine that draws in software and is not an iPhone.
- **The idea.** A small summary per session, sent with the crash trap's
  beacon:
  - the frame rate, and the worst frames (the slowest 5%, and long frames a
    minute);
  - where you were, and how many players were on screen;
  - the phone type (from its user agent) and the game's version.
- **What it shows.** Which iPhones struggle, where, and whether a new version
  made things worse.
- **The cost.** One message a session. Keep it to one: messages cost money
  (CLAUDE.md §5).

### 1c. A crowded fight, measured, before the arena grows

- **The memory.** Each other player drawn costs about 2.5 MB on a phone today
  (`mp-peermem`). 30 fighters on one screen is about 75 MB of players alone,
  enough to put an iPhone over its limit in a fight.
- **The tests.** `mp-crowdbots` measures crowds walking. Nothing measures 20-30
  players fighting on one screen: frame work, memory, and the sounds playing
  at once.
- **The sound.** Combat sounds deliberately have no limit on overlapping copies
  of one sound (`gameDisplay.js`, the v2.3.2639 note). A crowded arena wants
  one, for example at most 4 copies of one cue within 50 ms.
- **The plan.** Until the character lanes' phase 2 lands, the arena's area
  draws fewer players in full. These points went to the arena lane (C) for
  `docs/specs/arena-area.md` on 2026-10-28.

### 1d. Faster loading for returning players

- **Today.** The game's ~700 sprite and sound files are re-checked with the
  server on every visit, one round trip each. `public/_headers` keeps only the
  code (`/assets/*`) and the world's ground and baked objects for good. The
  sprite and sound folders were left out on purpose, because not every one of
  their addresses carries a version (its header explains why).
- **The idea.** Give every sprite and sound address its version (`?v=`), the
  way the world's ground was done in v2.3.2959. Then add those folders to
  `_headers` as kept for a year.
- **The result.** A returning player's loading screen, which the preloading law
  already makes long, skips hundreds of round trips. Nothing changes on screen.

### 1e. Safari's engine in the tests

- **Today.** Every automated test runs on Chromium, but the main platform is
  iPhone Safari.
- **The idea.** Playwright can drive WebKit, Safari's engine. It isn't an
  iPhone (no iPhone memory killer, a different graphics path), but it catches
  Safari-only breakage before players do. The owner's own phone stays the last
  check.
- **What it needs.** WebKit installed in CI. That is a change to `.github/`, so
  only in the owner's own words. It isn't installed on the QA box either
  (`/opt/pw-browsers` has Chromium only).

### 1f. Small: the dialogue's blurred background

- `.bt-npcdlg-scrim` (`src/styles/game.css`) blurs the live game behind a
  townsperson's dialogue (`backdrop-filter: blur(2px)`).
- That is the one place left where the spec's ban on blur behind windows on
  iPhones is broken.
- The fix is one line: its dark tint stays, the blur goes.

## 2. Ideas of our own

The armour fix (v2.3.2871-2874, `src/rendering/maskedBake.js`) answered the
owner's *"whenever I put on a piece of armor like legs or torso the game would
noticeably stutter"* with two ideas:

1. do the work BEFORE it is needed, from what the game knows: the pieces you
   own were baked ahead of time;
2. do the rest where it doesn't hurt: in a worker, on another core.

A third idea goes further: make the work unnecessary. Each idea below is one of
those three, carried further.

### 2a. No bake at all: a look is a few colours

The character lanes: M3, the foundation (v2.3.3716), then its phase 2.

- **Today.** Every look (skin, trousers, boots, clothes, armour) gets its own
  recoloured copy of every sheet it wears, so putting armour on, or meeting a
  new player, means making copies.
- **After.** Every look draws from the same shared sheets, and the graphics
  chip colours each part as it draws.
  - Putting armour on becomes changing a few colours: effectively instant, and
    no memory per look.
  - The same goes for a new player walking on screen.
- **Why it's unusual.** Colouring at draw time from a few colours is how 1990s
  consoles did palette swaps. Modern games rarely do it, and seldom with a
  full character creator.
- **How it stays exact.** See part 3.

### 2b. The game counts its own memory, and lightens before Safari kills it

- **The problem.** An iPhone gives a web page no warning before shutting it
  down; that is the black screen. Consoles have fixed memory, and native apps
  get the system's warning. Web games are blind.
- **What this game has.** It already counts nearly everything it holds:
  textures, canvases, decoded sound and the workers (the probes `mp-membudget`
  reads, `tools/qa/mp/memprobe.mjs`).
- **The idea.** Run that count live in the game, against the lines in
  `docs/MEMORY-MAP.md`. As it nears a line, the game drops the cheapest things
  first:
  - far players drawn as a shared stand-in;
  - pictures from the land behind you;
  - decoded sounds that aren't playing.
- **The result.** A distant player looks plainer for a while, instead of the
  game crashing. This is the most direct attack on the black screens, and it
  is 1a's third trigger.

### 2c. Prepare what's coming, from what the game knows

This is the armour fix applied everywhere. The game knows more about the next
few seconds than most games do:

- every moving player's position, even off screen (each tick lists them), and
  what they wear;
- which monsters are round the bend;
- what you just bought, which you'll probably wear;
- what the next dungeon wave holds.

Today another player's figure is made the moment they come within range
(v2.3.3241, peer-cull.md). That is the same kind of work that made armour
stutter, now when someone walks onto your screen in a busy town.

- **The idea.** Make it in quiet frames, in the order people approach, on the
  other core.
- **After phase 2.** There is far less to make, so this matters most until then,
  and for monsters and effects after.

### 2d. Heavy work only in calm moments the game chooses

- **The calm moments.** The game knows when a stutter can't matter:
  - standing in BroTown, where nothing can attack you;
  - reading a townsperson's lines;
  - a window open;
  - a loading screen.
- **The idea.** Queue the heavy upkeep for those moments, never in a fight:
  preparing looks, emptying caches, putting pictures on the chip.
- **Why it's unusual.** Engines usually spread such work evenly over frames.
  Timing it by what is happening in the game is rare.
- It pairs with 2c: one lane.

### 2e. Effects as colour changes, and colour cycling

This comes once pictures are coloured as they are drawn (M2's colour numbers
for monsters, 2a for characters).

- **Effects.** Each of these becomes a different set of colours, not an extra
  drawing pass:
  - hit flashes;
  - frozen, burning and poisoned tints;
  - night.

  Today a monster's white flash as it appears is a `ColorMatrixFilter`, an
  extra pass for each monster for 620 ms (`entityRenderer.js`,
  `SPAWN_WHITE_FILTER`).
- **Colour cycling.** Looping light can be animated by rotating colours
  through a picture's palette instead of storing a strip of frames: a fire,
  lava, glowing runes, a portal. It is a 1990s trick almost no modern game
  uses. The water is already drawn by code (`wheelWater.js`), so it wouldn't
  change. This is for new art drawn for it, on its own palette.

### 2f. Fewer frames where the world can't be seen

- **The idea.** When a window covers the world (the bag, the character page, a
  shop), the world behind it could be drawn less often.
- **Why.** Less heat now means the iPhone doesn't slow itself down later in the
  session, when the fight comes. It is part of the owner's battery saver.
- **First.** Not checked yet: confirm the game doesn't already do this.

## 3. The colour question

The owner: *"do you think there'll be any noticeable difference in visual
quality switching to the 256 color method? The figures on screen are quite
small, but 256 colors doesn't sound like a lot (maybe it is) does that include
colors of every brightness too? Maybe pixels are so small that the
arrangement of those colors is what does the trick"*

**What it means.**

- "256 colours" is per picture, not per screen. Every picture brings its own
  set, so the screen shows many thousands at once.
- Every shade counts as a colour: a skin tone two steps lighter is another
  one.
- Old consoles drew whole worlds with 16 colours a sprite (the SNES). The
  owner is right that the arrangement does much of the work: at play size the
  eye blends neighbouring pixels.

**Measured on main, 2026-10-28**: distinct colours per file (PIL, colour and
see-through level counted together).

| art | files | typical (median) | most | on 256 or fewer |
|---|---|---|---|---|
| the world's ground and objects | (not re-counted) | 64 each, by the art law | | all: colour numbers since v2.3.3190 |
| monsters | 66 | 256 | 111,836 (the snowman's impact) | 48 |
| player body sheets | 82 | ~8,000 | 39,367 (fish-south) | 6 |
| clothes and armour | 114 | ~1,650 | 62,799 (steel greaves, chop-west) | 20 |
| head pieces (traits) | 937 | ~310 | 14,007 (a thumbnail) | 402 |
| effects | 5 | ~30,000 | 106,377 (whirl-vortex) | 0 |
| townsfolk sheets | 4 | ~12,800 | 209,759 | 0 |
| weapons, shields, tools | 10 | ~640 | 862 | 2 |

**What that means.**

- **The world.** Its ground and objects were drawn on 64 colours each (the
  art law), so turning them into colour numbers lost nothing. `mp-palette`
  found 0.03% of the screen's pixels one step apart (of 255) where colours
  meet, and none further.
- **Monsters.** 48 of 66 strips are already on 256 colours or fewer: exact.
  The rest stay as they are.
- **Characters, clothes, effects and townsfolk.** These are not 256-colour
  art.
  - A typical body sheet has about 8,000 distinct colours. Most are near-twins,
    one or two steps apart, from the soft shading and smooth edges of HD pixel
    art.
  - Squeezing them to 256 would very probably not show at play size, but it
    would be a reduction.
- **The rule.** No picture's colours are reduced without the owner's yes.
  Pictures already on 256 or fewer become colour numbers (exact); the rest are
  held once (M2's `onecopy`), at their own colours.

**How 2a stays exact anyway.** The recolour that gives each player a look works
by brightness (`playerSkins.js`, `_retint`): every pixel keeps its own
brightness and takes the look's colour for its part. So no palette of 256 is
needed:

- each sheet stays as drawn, shared by every look;
- a one-byte map, baked offline by the game's own classification, says which
  part each pixel is: skin, trousers, boots, or kept as drawn;
- the graphics chip colours the parts as it draws, from the look's few
  colours, with the same arithmetic as `_retint`.

The result is the same pixels, no colour reduction, and a look that costs a few
bytes.

**64, 128 or 256: is a smaller set cheaper?** The owner asked this too. For
memory, no.

- **A pixel is one byte either way.** A colour-numbers pixel takes one byte
  whether its picture has 64, 128 or 256 colours (an `r8unorm` texture,
  `paletteTex.js`). A byte is the smallest unit the graphics chip reads
  cheaply. The colour list is one 1 KB atlas row a picture either way.
- **Going below a byte doesn't pay.** It means packing two pixels into one
  byte (16 colours or fewer) and unpacking them in the shader: slower, and
  harder to blend smoothly (the shader blends four texels). 64 and 128
  (6 and 7 bits) don't divide a byte evenly, so nothing is saved there.
- **Where a smaller set does help.**
  - **The atlas.** A 64-colour picture fills a quarter of its row, so four can
    share one row, their numbers offset when they are prepared (0-63, 64-127,
    128-191, 192-255). Nothing changes in the shader, and the atlas holds up to
    four times as many pictures before it fills. Worth it only if the rows run
    short: `__btPalette()` counts `rowsUsed` and `rowsFull`, and M2 reports
    them at the fight.
  - **The files.** A picture with fewer colours makes a slightly smaller file to
    download. That is not memory.

So 256 is the ceiling for every picture at no memory cost. The world's 64 is
the art law's style, not a memory need. The orchestrator sent this to the characters lane (M3) on 2026-10-28;
its spec, `docs/specs/look-palette.md`, records what it built and why.

## 4. The order, after the showing

1. **1b first**: measure real phones before changing them.
2. **1a with 2b**: one lane, one way of stepping down, three triggers (slow
   frames, a crash last time, the game's own memory count).
3. **2c with 2d**: one lane.
4. **1d**: invisible, and a faster loading screen for every returning player.
5. **1c**: with the arena's growth (lane C's plan).
6. **1e**: when the owner says so (a `.github/` change).
7. **2a and 2e** ride on the memory lanes. **2f** and **1f** are small.
