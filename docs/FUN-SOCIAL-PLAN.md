# BroTown: Fun & Social Plan (revised)

v2.3.3391, 2026-10-18. The owner's own plan ("Bro Town: Fun & Social Plan", Oct 17,
written without the code) checked against the code, corrected and added to.
The owner: "Go recommended". This file is the plan; each piece's spec goes in
`docs/specs/` as it ships.

## The short version

Fun in three layers, and spam kept small by limits built into the messages
from day one:

1. **One player:** emotes and dances that move the whole drawn bro in code, a
   wheel to pick them, quick chat, and a town that reacts (the townsfolk and
   your pet).
2. **Two players:** high fives with an accept, dancing in step, conga lines,
   group photos, showing off your gear.
3. **The whole town:** toys made on the farm (tomatoes, pies, fireworks),
   a soapbox, a ball, a cannonball into Bro Pond, silly stats.

Moderation mostly exists already; what is missing is small and waits until
it is needed.

## The owner's decisions (2026-10-18, "Go recommended")

- **Toys are made on the farm**, not bought or free: they cost something, so
  they limit themselves, and farming gets a purpose (the five magic crops have
  none yet).
- **The Halloween Pumpkin Head is a new picture** made in ChatGPT from the
  prompt at the end of this file (the old one in the code was drawn for the
  game's earlier look).
- **Titles show on the player card**, not under the name: the name plate
  already carries the alliance tag, the Hemi Bro check, the party badge and
  the skulls.

## What the game already has (checked in the code, 2026-10-18)

| The plan assumed | What is really there |
|---|---|
| Emoji emotes from earlier builds | 30 emoji and 12 quick lines (`EMOTES`, `TEXT_EMOTES` in src/data/gameDisplay.js). Their only button was in the old bottom toolbar, hidden since v14, and a sent emote only beeped: nothing drew it. Fixed in Phase 0. |
| Speech bubbles | One per player, 5 s, black on white (effectsRenderer `_updateChatBubbles`); the townsfolk say a line every 8-23 s. |
| Quick chat | The 12 quick lines are it, once they can be reached. |
| Moderation later | A mute kept on the server (chatmod.js), reports with the server's own copy of what was said, kick, freeze and announcements (admin.js) -- only through terminal commands until Phase 0 put them in the Test panel. |
| Rate limits | A per-connection budget (flood.js) and one relay allowance, 8 at once and 4 a second, that chat and emotes SHARE with sword swings and arrows. No repeat filter, no text cleaning, no word filter. |
| Kill switches sent on connect | Every feature already has one (`caps`, live flags). |
| A beat from the server clock | Phones do not know the server's time (only the farm guesses it). Every tick carries the server's time; the phone ignores it. |
| Titles and unlocks | Titles live only on the phone ("Gladiator"); the only unlockable is the Crimson Cape. |
| Thrown toys | None (the old Frozen Shore snowball is switched off). |
| NPCs react | Six townsfolk stand still in BroTown, one picture each, facing south: Mayor Bro, Diego, Ace, Blacksmith Bro, Lil Bro, Beastmaster Bro. |

## The rules every piece follows

The plan's five, kept:

1. **Fun alone, better together.** The townsfolk and your pet react, so it
   works with nobody else online.
2. **Expressive, not loud.** Styles are picked from menus; anything big is
   rare, near you, or tied to a place.
3. **Almost no new art.** Emotes move the drawn bro in code, so they fit every
   look and the memory budget.
4. **The viewer has the last word.** Tone down others' flair, mute a player,
   opt out of being splatted.
5. **Every toy has an off switch** -- a live flag, as every feature here has.

And BroTown's own, which the plan did not know:

6. **A pose that lasts is part of the player, not a message.** Sit, sleep,
   flop, a dance, a walk style or a conga ride the player's regular updates
   (the tick, like sprinting `spr` and the skull `sk`; or the look, like the
   hat). A one-off message is missed by anyone who walks up later, who would
   see you standing (docs/TRAPS.md §176). A one-shot emote (wave, laugh) is a
   moment, so it may go to the players near it only.
7. **Social messages have their own allowance**, apart from combat's: a dance
   party must never eat the messages a fight needs.
8. **What can be earned is stored and checked on the server.** A modified
   phone must not wear an emote, a skin or a title it never earned (rule zero
   of ARCHITECTURE-HANDOFF). The server checks that THIS player earned it, not
   only that the id exists.
9. **Everything a feature draws loads on the loading screen** (the preloading
   law). Bubble skins are a few KB each; the plan's "load it when someone uses
   one" is not allowed here.
10. **Sound memory has about 4 MB of room** (tools/qa/mp/memory-budget.mjs,
    `sound`: 30 MB, 26 measured). Twelve new one-second sounds would use all
    of it. Reuse the recordings the game already has, as the hit sounds did
    (v2.3.3001).
11. **No new always-on button on a phone.** The screen is full. Emotes and
    quick chat live in the chat box, which opens by tapping your own bro. On
    a computer, 1-3 already pick weapons: B (for Bro) opens the emotes.
12. **Toys stay out of combat.** Pies, tomatoes and snowballs never use the
    arrow code: in No man's land an arrow that passes through a player asks
    "Attack?" (`_nmlStrayShot`). Toys get their own list and fly only on safe
    ground (town and the commons).
13. **Kill-switch names are lower case** (TRAPS §117): `emotes: false`, never
    `emoteWheel: false`.

## Phase 0 -- fix what is there (one small PR each)

- [x] Emotes you can see: the existing 30 emoji pop over your head for the
  players near you, the 12 quick lines show as your speech bubble; opened
  from the chat box (tap your bro, then the smiley) or B; the server keeps
  only emotes on its list; blocking someone hides their emotes too
  (v2.3.3391, docs/specs/emotes.md).
- [x] Chat fixes: Block made from the friends list did not hide chat (the
  two panels saved the list in two shapes); a name starting with 📍, 🛡 or ✉
  dressed ordinary chat as area, party or whisper chat; the chat name colour
  took any colour, invisible included (v2.3.3391, docs/specs/emotes.md "The
  chat's three fixes").
- [ ] Reports, kick and freeze in the Test panel, beside the bot flags, so the
  owner can read them without terminal commands (its own PR, #972,
  docs/specs/chat-moderation.md).

## Phase 1 -- one player smiles

Built so far:

- [x] The motion code and all twelve moves, held poses kept by the worker
  (`po` on the tick), the Moves tab and `/wave`-style commands: v2.3.3392,
  docs/specs/emote-moves.md. The emote wheel became a Moves tab of all twelve
  (no slots to choose yet); the extras are the move's own emoji popped over
  the head, no new sounds.
- [ ] The server's guardrails (the social allowance, a repeat filter, text
  cleaning): its own PR, #974.
- [x] `/roll` (1-100, or `/roll 20`) and `/flip`, rolled by the worker:
  v2.3.3393, docs/specs/dice.md.
- [x] Your pet copies your sit, sleep, flop and dances; Lil Bro copies you,
  Blacksmith Bro flexes back, Diego, Ace and Mayor Bro have a word:
  v2.3.3394, docs/specs/emote-moves.md "Your pet and the townsfolk join in".

- Code-driven motion for the whole figure, after the trait layers are put
  together: offset, squash and stretch, tilt, pivoted at the feet. The
  template is `src/rendering/jumpFx.js` (it moves the body after the depth
  pass and `figureFeetY` adds the lift back, so sorting and the shadow stay on
  the ground); `_applyBuildScale` already squashes the body without stretching
  the name plate.
- The 12 starter emotes, three of them dances:

  | Emote | Motion | Extras (reused sounds) |
  |---|---|---|
  | Wave | three quick side-to-side tilts | "Hi!" pop |
  | Laugh | fast up-and-down shake, 1.5 s | "HA HA" pop |
  | Flex | squash down, stretch tall, hold | sparkles |
  | Shrug | small hop with a tilt | "?" pop |
  | Facepalm | lean forward, hold, slow head shake | sweat drop |
  | Cheer | two big hops | confetti |
  | Sit | squash to 70%, held until you move | |
  | Sleep | tip over flat, held | Zzz |
  | Flop | face-plant with a bounce, held | dust puff |
  | Bro Bounce (dance) | bob on the beat, lean left and right | notes |
  | Robot (dance) | snappy turns on quarter beats | |
  | Sprinkler (dance) | face-flips in steps, one long sweep | droplets |

  Held ones (sit, sleep, flop, dances) are a tick key the server owns (the
  `pw` pattern: an allowlist of pose ids, absent when not posing). The 2-minute
  idle logout counts touches only, so a pose does not keep a phone in.
- The emote wheel (8 slots the player chooses) in the chat box and on B.
- Your pet copies your sit, dance and flop (it is drawn beside you on every
  screen already, `pw`).
- The six townsfolk react in character, with the same motion code: Lil Bro
  copies your emote, Blacksmith Bro flexes back, Diego: "No dancing in my
  store!", Ace calls odds on a dance-off, Mayor Bro claps for a party.
- `/roll` (1-100) and `/flip`, rolled by the SERVER (a phone's own roll can
  always say 100), once per 5 s, shown over your head and in the chat.
- The guardrails still missing, on the server: the social allowance (rule 7),
  a repeat filter for typed lines (not for quick-chat lines), text cleaning
  (stacked accents, invisible and right-to-left characters, at most 6 emoji,
  "lolllllll" to "lolll"), and emote and style ids checked against lists.
- Not in Phase 1: fonts and letter effects (the most work for the fewest
  laughs; Phase 3).

## Halloween (if Phase 1 lands by about Oct 27)

- [x] Zombie Shuffle dance (code motion): v2.3.3395, docs/specs/halloween.md.
- [x] A spooky bubble skin: drawn in code instead of a 9-slice picture
  (purple, pumpkin-orange rim, cream words), nothing to load: v2.3.3395.
- [ ] The Pumpkin Head: a hat everyone can put on from the bag during Halloween
  week, like the T-shirt toggle. Needs one picture (prompt at the end).

## Phase 2 -- two players laugh

- Two-player emotes: High Five, Dap, Bro Hug, Chest Bump. One offers, the
  other accepts on a small card (the No man's land card's shape); ignored for
  5 s, the offerer slumps "left hanging".
- After a duel or a spar: one tap for "GG" and a dap (both already agreed to
  the fight).
- The clock sync, then dancing in step: `beat = floor((serverTime - start) /
  beatMs)`, every phone picking the pose from the beat, no extra messages.
  The tick already carries the server's time.
- Dance parties: three or more dancers close together (townsfolk count) light
  the ground with disco tiles; the music swells. The land-music picker owns
  the one music player (src/game/wheelMusic.js), so "party music wins near a
  party" is a rule of its own there.
- Conga line: Follow on a player; the follower's phone really walks the
  leader's path (the server checks every step, docs/specs/move-budget.md),
  never jumps to it; any touch on the stick breaks off.
- Flex your gear: raise your weapon; its real name and grade pop up, read by
  the server from what you wear, so nobody fakes a Godly sword.
- Group photo: "Say cheese", 3-2-1 for everyone near, a framed picture of the
  group handed to the phone's share sheet. Captured at normal size around the
  group (~1-2 MB), never the whole 3x screen (~12 MB at once, where the black
  screens came from), and let go at once.

## Phase 3 -- the town is a playground

- Toys made on the farm (decision above), on safe ground only, each with a
  "No splats" setting for the target:
  - tomatoes, to throw at whoever is on the soapbox;
  - pies (wheat and strawberry; not the Pumpkin Pie, which is a meal);
  - snowballs, free, scooped from the snow in the frost land (the game knows
    which ground is snow, for footprints);
  - fireworks from the five magic crops, one colour each: frostberry,
    dewmelon, thunder pepper, gloomcap, heartroot.
- The soapbox: a crate or the Town Hall steps (no new art). Standing on it
  makes your chat big under a spotlight; a megaphone does the same anywhere.
- Cannonball: jump into Bro Pond for a big splash (jumping and swimming
  exist).
- The town ball: the server owns it, in the town square only, resting when
  nobody is near (as far monsters rest, `wheelrest`).
- Chat style: bubble shape, a preset colour, size (Quiet, Normal, Big --
  "Quiet", because "Whisper" is the whisper lane), then fonts and letter
  effects. Only Big is rationed. A message carries ids, never values.
- Earned emotes, bubble skins and titles, stored on the server; titles on the
  player card.
- Silly stats in the Town Hall: most flops, biggest dance party, longest
  conga line, counted by the server.
- Cosmetics as the perk of the $2 supporter pass (docs/SUPPORTER-PASS-PLAN.md):
  with no play caps, the pass needs something to offer that does not touch
  balance.
- "Area" chat means near you: today it reaches everyone in the Wheel, which
  is five times bigger now.

## Phase 4 -- moderation (small now)

Start when about 20 people play regularly, or at the first spam complaint:

- a word filter (slurs always; other words by each player's setting);
- escalating timeouts (1 minute, 10 minutes, 24 hours);
- Block kept on the server, stopping trades, duel challenges and invites too
  (since v2.3.3519 the phone drops a blocked player's duel challenges, trade
  requests and party invites; on the server the block would follow you to
  every device and the request would never be sent);
- throws and Big text unlocked when you finish the Mayor's first quest (the
  commons already wait on it), instead of after 30 minutes.

Test the limits with the tools the game already has: `tools/qa/load/load.mjs`
(120-150 bots), `tools/qa/load/bot-lab.mjs`, and the memory check every PR
runs (`mp-membudget`).

## Art and sound asks

### The Pumpkin Head (Halloween)

- **In the game:** a hat everyone can wear in Halloween week.
- **Attach:** `docs/art/headwear-mannequin.png` (five heads on magenta, made by
  `tools/make_headwear_mannequin.py`).
- **Then:** send the picture in chat; a session imports it with
  `python3 tools/import_headwear_green.py --art sheet.png --id pumpkin-head
  --name "Pumpkin Head"`.

```text
Draw a carved Halloween jack-o'-lantern worn as a hat on each of the five
heads, in the direction each cell is labelled: front, three-quarter, side,
three-quarter back, back. The pumpkin covers the whole head like a helmet:
round, orange, with deep ridges, a short curly green stem on top, and from the
front a big goofy grin and two triangle eyes cut into it, glowing warm yellow
inside. From the back it is a plain pumpkin with its stem.
Paint the entire person, head and shoulders, flat solid green #00FF00 with no
shading. Keep the magenta background and the labels. Do not resize or
re-lay-out the sheet.
Draw the pumpkin at the size it would be on this head, sitting down over it, in
the same pixel style as the head: crisp pixel art, hard-edged square pixels, 3
to 5 flat tones per colour, a one-pixel outline in a darker shade of its own
colour, never black. Draw only the pumpkin in colour; do not draw eyes, skin or
hair.
```

### A dance track (Phase 2, optional)

One short loop (30-60 s) for dance parties, played through the music player
(it streams; it is never decoded into memory).

## Still open

- Which emotes are earned rather than given (The Worm from a townsperson,
  napping on the town bench for a minute...), and what earns them.
- What each magic crop does besides fireworks (the owner's call since
  v2.3.3135).
