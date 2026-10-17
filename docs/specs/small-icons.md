# The owner's small icons (v2.3.3274)

The owner, 2026-10-16, after a list of the emoji and code-drawn pictures the
game still wore: *"I want chatGPT to draw custom art for that stuff"*, and then
four sheets of it: *"Here's the art assets for the 'small icons'"*.

## What changed, place by place

| Where | Was | Now |
|---|---|---|
| A party member's name plate | 🎉 written before the name | the party badge (three bros), at the plate's left end |
| The party window | 🎟️ header, 👑 leader, 💀 member down, 📍 member elsewhere | the owner's party, leader, down and elsewhere pictures |
| Over a head in a PvP fight | the 💀 emoji (tinted red for a red skull) | the owner's skull, tinted the same way |
| Over a townsperson | an 8 px gold ★ | the talk bubble, where the quest badge goes, while he has no quest for you |
| Chat lines | 🛡 Party, 📍 Area, ✉ Whisper | the party, area and whisper bubbles |
| The HUD's buff badges | 🔮 🩸 ⚔️ 💠 💚 🛡️ 🥧 💨 | cursed, bleeding, damage, mana, regen, resist, XP and speed pictures |
| "Defense Lv N" | 🛡️ | the owner's shield in front (the plate the sheet drew it on is not used: the game writes the words) |
| The ability buttons | Whirlwind, Special, Shield Bash, Jump and Element Burst drawn in code | the owner's five pictures, with grey copies for cooldown and disabled |
| The right stick's tap | talk, door, sleep and the five farm steps as white outline drawings | the owner's eight pictures, drawn whole like the weapon pictures |

## How

- **Cut once, by a tool.** `tools/ui/cut-small-icons.py` reads the four sheets
  in `assets/icons-source/sheet-small-*.png` (kept, so a redraw is re-cut in one
  command) and finds each icon by its own transparency: pieces in rows, a row
  split at its widest gaps, refusing to write anything unless it finds exactly
  the icons it expects (the "!" strokes, sparkles and Zzz join their icon). It
  lifts the art's alpha from the background remover's ~252 to solid and fits
  each into the icon set's frame (a 12% margin) AT THE SIZE IT IS DRAWN: 64 px
  for the small marks (party, chat, buffs, skull, talk bubble: drawn 13-28 px),
  160 for the ability and stick buttons, 128 for the popup's shield. A picture
  a page shows or warms is held decoded at its own size, so the icon set's
  usual 256 would have held about 7 MB for badges drawn at 16 px; this holds
  about 2 MB. The five ability pictures also get a grey copy. The Defense
  shield is cut out of its plate by its mirror image (the plate runs on behind
  the shield, so no straight cut separates them).
- **No CSS filter on a control** (controlSkin.jsx's rule, TRAPS §42): the ability
  buttons' cooldown and disabled states swap to the baked grey copy.
- **The Element Burst** keeps a faint ring in the element's colour behind the
  owner's picture, which is the same for every element.
- **Nothing loads on first use** (the preloading law): the DOM pictures are
  warmed on the loading screen with the other control pictures
  (`controlsPreload.js`), and the canvas's 64 px copies are loaded there too
  (`preloadSmallIconTextures`, `preloadAnimations.js`; the same 64 px files).
  180 KB of files in all, 0.05 MB on the graphics chip for the canvas's three.
- **Where the game finds them:** `src/data/smallIcons.js` (no imports;
  `chatLaneOf` reads a chat line's lane from the mark at the front of its name,
  so nothing in the chat's data changed).

## Tests

- `server/test/small-icons.test.mjs` (21): the chat lanes, every file in place
  at its size, and each place using the pictures.
- `node tools/qa/mp/run.mjs smallicons` (9): a real page in BroTown and a
  socket friend: the townsfolk's talk bubbles (never with a quest badge), the
  party badge on the friend's plate and the party window's pictures, the threat
  skull, the three chat lanes through the real server, the elsewhere mark, the
  eight buff badges and the Defense popup. Screenshots in
  `tools/qa/mp/out/smallicons-*.png`.
- `mp-btnskin` and `mp-tapact` read the ability buttons and the right stick.
