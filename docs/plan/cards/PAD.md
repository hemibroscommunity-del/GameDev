# Card PAD: the controls area as a controller (the owner's request, 2026-11-25)

**The owner's words, 17:3x UTC 2026-11-25, to the orchestrator (part 18):**
*"Also want a redesign of the controls area to be more like a controller. I
attached a mockups (first and last attachments) as well as the art assets in
middle"*.

**Purpose.** The touch controls look like one built-in game controller: a
left housing that holds the stick, a right housing that holds five round
buttons in FIXED places, both docked to the top edge of the dashboard band,
the middle left open so the world shows. It is a new LOOK and a fixed
LAYOUT. What a control does, when it shows, and how a touch is read do not
change.

The pictures (branch `claude/plan-orc`, `docs/plan/status/assets/`):
- `pad-mock-01-full.png`: the owner's full mockup (the screen, the button
  states, the context examples, sizes 54 px and 72 px, the design notes).
- `pad-mock-02-concept.png`: the first concept sketch (two grips rising from
  the dashboard, the centre open).
- `pad-art-01-stick.png`: the stick: eleven baked pictures AND its four
  pieces (housing, gold ring, arrow disc, knob).
- `pad-art-02-buttons.png`: Jump, Block, Special, Skate, Charge, each in
  five states (idle, pressed, ready glow, cooldown, disabled), big and small,
  and empty sockets.
- `pad-art-03-attack.png`: Attack in nine states (idle, pressed, two
  cooldowns, ready glow, active swing, disabled, locked, empty).
- `pad-art-04-housings.png`: the left and right housings, the centre bridge,
  the three-slot pill, sockets, a small tab.

Model: the strong model, high. Tags 6640 on (block PAD, 6640 to 6659; add it
to `tools/dev/tag-blocks.json`). ONE draft PR, tag 6640, branch
`claude/plan-pad-1-controller`. No server file, no cap, nothing under
`.github/`.

## The readings, chosen so you do not guess

1. **A skin and a layout, not new controls.** Every rule stays where it is:
   `src/game/controlVisibility.js` (what shows when), `stickZones.js`,
   `thumbSide.js` (left-handed: the two housings swap sides), `thumbArc.js`,
   `contextButton.js`, the control mode. No touch box gets smaller than
   today's. The stick's behaviour (where it rests, how it follows the
   thumb) is today's; only its picture changes.
2. **Fixed places** (the mockup's "Layout & sizes"): Attack, the big one
   (72 px), low on the right; Jump (54 px) to its left; above them a row of
   three: the context socket (Skate when the skateboard is offered, Charge
   when Charge is offered: the game's own rule decides, never both), Block,
   Special. A control the game hides right now leaves its EMPTY SOCKET
   (the mockup's "Context examples"); the others never move.
3. **Nothing invented.** Map the game's own buttons of the default scheme to
   the five sockets. A button of the game with no socket in the mockup keeps
   today's place and look and is LISTED in the PR's body; a socket or a
   state the game has nothing for stays empty and is LISTED. The mockup's
   three-slot pill in the middle is used only if the game already has that
   control there; else listed.
4. **States from the game's own state only**: idle, pressed, cooldown (the
   sweep; a number only where the game shows one today), ready (the glow),
   disabled (grey), active, locked. One FACE picture an action; pressed, the
   cooldown sweep and the glow are drawn by CSS (transform, opacity, a conic
   gradient, a ring) where that reads like the sheet; a second picture only
   where CSS cannot (say which in the PR's body). No CSS `filter` on a
   control that is on screen all the time (an iPhone pays a layer for it).
5. **The stick is its four pieces**, the knob moved by code; never the
   eleven baked pictures.
6. **The art law and the memory law.** The sheets are ChatGPT's, with red
   and yellow fringe specks on the edges: cut them with a small repeatable
   tool under `tools/art/`, clean the fringe, pass each picture through
   `public/tools/style/process.js`, 256 colours at most, at 2 px a CSS px
   and no bigger. The four sheets are kept byte for byte where CT kept the
   Talk picture's original (`assets/icons-source`). The pieces load behind
   the loading screen (PRELOADING IS LAW; `src/data/talkPill.js` is the
   model for a small picture decoded there), are `touch-action:
   manipulation`, and cost little: aim under 200 kB of files in all. If
   `mp-membudget` reads more, the line is raised with the MB and why in the
   PR's body, never silently.
7. **The dashboard's height and the world's view do not change** (the
   owner, 11-25: "No don't change todays dashboard height"; the mockup's own
   note says the same). The housings sit over the bottom of the world as
   today's controls do. A housing's plate takes no touch: a tap that reaches
   the world today still does.
8. **Upright AND sideways** (TRAPS §175), and a left-handed player. On a
   computer nothing changes unless touch controls show there today.
9. **The switch**: `?padskin=0` brings back today's look. ON by default (the
   owner, 11-11: a trial the owner likes becomes the default, with its
   switch). Its row in the switch table.
10. **Out of this card** (list them as follow-ups, do not build): the
    mockup's tab row with icons (Gear, Bro, Quests...), the top bar, the
    minimap, the quest plate, the name plates.
11. **The slice** (finish.md part 5, rule 5): the layout and the
    state-to-face rules are a module under `src/game/` (say `padSkin.js`)
    with a suite that tests what they DO (the sockets' places for a band's
    size, upright, sideways, left-handed; which face and overlay for a
    control's state; an empty socket for a hidden control); `BroTown.jsx`
    and the panels gain calls, not logic.

## Done when

- The suite is green and kills every mutant of its module's lines, or lists
  the survivor with why.
- A phone test `tools/qa/mp/mp-padskin.mjs` (`world: 'wheel'`, its `lane`)
  shows, upright and sideways: each shown control sits in its socket; a
  hidden control leaves an empty socket and the others do not move; no touch
  box is smaller than with `?padskin=0`; a press still does what it did
  (Attack swings, the stick walks); `?padskin=0` is today's look.
- `mp-contextbuttons`, `mp-twobuttons` and `mp-membudget` are no redder
  than on main (ONE helper on the cheapest model runs them, twice where a
  step comes and goes: `docs/plan/debts.md`, CT, 65 tail).
- The screen is in `tools/qa/ui-review/states.mjs` and has its section in
  `docs/UI-DESIGN-NOTES.md`; precheck passes.
- The PR's body, in plain words: what the owner will see, the switch, the
  two LISTS of reading 3, "Decided for the owner while away", a preview
  link, and screenshots upright and sideways.

## Laws that apply (CLAUDE.md)

Preloading; memory (256 colours, freed or kept on purpose, the check's
line); the page's one thread (no layout read inside a frame: the measure
helpers); touch (`touch-action`, `swallowTapClick` where a control closes
on pointerup); desktop (`deskKeys.js` buttons keep `data-key`); phone tests
play the world, never the old map. Checklist rows: a `?name=`; a screen; a
phone test; a picture; anything the memory check reads more of.
