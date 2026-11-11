# The bow's feel: tension, stillness, the snap (v2.3.4802)

> The owner, 2026-11-11: *"Instead of just copying what other games do I want
> to think about the 'feel' of the combat. Think about the sword swing. The
> bow pull back and release. The staff building power and blasting the
> orb."* Then, approving the design: *"Yes remove the timing bar. It needs to
> be something else entirely, and yes but build all of them (sword, bow,
> magic)."*

The bow is the second of the three (the sword's is `sword-feel.md`, whose
kit this uses). Its worker half shipped beside it (`server/src/drawgather.js`,
v2.3.4801, `manual-combat.md` "The bow's draw and the staff's gather"): the
phone claims how long it drew, the worker bounds the claim by its own clock
and pays the shot its share. This is the phone's half: what a player feels.

## What a player feels

Every attack has four beats: **touch**, **build**, **release**, **contact**.

| beat | on a phone | what is seen and heard |
|---|---|---|
| touch: the NOCK | the thumb goes down anywhere on the right side (or on the disc) | the bro raises the bow (the bow pose's first frame, held), the arrow's small tick on the string. No line yet, the walk as it was |
| build: the DRAW | the thumb pulls **back**, away from where the arrow will go, past a flick's length (24 px) | the bow drawn (the pose's second frame from a third of a draw) and its string pulled further back; a creak rising in pitch, an octave by full draw; an aim line growing forward from the bow, two faint lines **wide and loose** at first, closing to one as the draw fills; the walk slowing (to 0.8 of itself) |
| build: the SETTLE | held to **full draw** (371 ms on a new character: the flicked bow's interval) | one crisp **gold** line to the end of the sight, a quiet click, the nock's gleam gold; the walk planted (0.6). Letting go now is the **perfect shot** |
| build: the TIRED ARM | held more than 300 ms past full | the line **trembles** across its length and fades back from gold, the creak wavers. Still a full shot; the perfect one has passed |
| release: the LOOSE | the thumb lifts | the creak cut dead (a beat of quiet), a **twang** sized by the draw (thin and quick for a half draw, deep for a full one, a bright ring on top for the perfect one), the arrow leaving **at once** from the drawn bow with a streak, the bow pose on its release frame (the arm's recoil), the camera nudged back 2 px (3 for the perfect one) |
| contact | the arrow lands (and sticks, as it always did) | a spark sized by the draw and a hit sound under the arrow's own (a tick for a light shot, a thud for a full one, deeper for the perfect one); the number sized by the worker's share (`pw`), the perfect draw's small glint (`pf`) |
| cancel: the LET DOWN | the thumb slides back to where it touched (8 px) | the string eased back with a soft falling creak; lifted there, **nothing is shot or sent**. A tap (no pull) is no shot either |

- **A half draw is weaker but quicker** (a snipe on the run): its damage is
  its share of a full draw, so quick half draws add up to the same damage a
  second as full ones. Only a draw of 0.8 or more carries a full shot's extras
  (the shove, the gem's status, its mana), as a sword's cut.
- The arrow leaves **opposite the pull**: the slingshot bow's aim (`?manual=2`,
  the owner's 2026-11-10 trial), which this grew from. The bro and the line
  point where it will go while the thumb draws. A draw loosed within 350 ms of
  the touch is still helped to a monster within 12° of its line (`mcAssist`);
  a slower one is left exactly as aimed.
- No faster than the worker counts: a loose comes no sooner than 150 ms after
  the last shot (the worker lands nothing under 100).

### A computer

The **left button held draws** (nocked and drawing at once: there is no pull
to make), the cursor aims, and **its release looses**, wherever the pointer is
then (the release is heard on the window). A plain click is a light, quick
shot. The window losing focus lets the string down. The right click is still
the special.

## Switches

- **On for everyone** in the game's own combat (nothing chosen: the free
  swing), with a bow in hand, against a worker advertising `caps.bowDraw`.
- **`?bowfeel=0`** in the address turns it off on that one phone or computer,
  remembered (`localStorage` `bt_bowfeel`); **`?bowfeel=1`** brings it back.
  Off, the bow is the earlier flick bow exactly: a flick shoots the way it
  went, no sooner than its 371 ms, and no `dr` is sent.
- **`bowdraw: false`** (the worker's live flag) takes the draw away from every
  phone at once: the cap is no longer advertised and every phone plays the
  flick bow.
- `?manual=1` (the plain swipes, a flicked bow), `?manual=2` (the slingshot
  bow) and `?manual=0` (the old held combat) never meet it.

## The wire

| what | where | when |
|---|---|---|
| `dr` | the arrow's `player_projectile` relay | a drawn bow's loose: the draw, whole ms, from the pull past the line to the lift, on the phone's clock (`bowWire`) |
| `sw: ts` | every claim of that arrow: `monster_damage` AND `player_attack` (the PvP claim) | the arrow carries a `dr` (`bowFeelSw`) |
| `pw`, `pf` | the worker's `monster_hit` | its share (absent for a plain full one), its perfect draw |

All gated on `caps.bowDraw`. The relayed copy carries the draw the worker
COUNTED. Nothing here decides damage: the worker rolls every hit.

**The numbers are the worker's** (`src/game/drawGather.js`): the full draw
(`fullDrawMs`), the perfect window (`PERFECT_DRAW_MS` 300), the share
(`buildShare`). The phone draws the bend and the gold line by the draw **as
the worker will count it**: at most the time since the last shot plus the
worker's own 100 ms allowance (`BOW_FEEL.CLAIM_ALLOW_MS`, a mirror of its
`SLACK_MS`; the sword kit's `feelClaimMs` default of 150 is the sword's guess,
not the worker's). So the gold line promises exactly the worker's perfect
shot, and `bow-feel.test` §5 holds the two together through a real worker for
draws from 60 ms to 1.5 s, both edges of the window.

## How it is built

| file | what |
|---|---|
| `src/game/bowDraw.js` | THE RULES, pure (imports only `drawGather.js` and `manualCombat.js`): **one phase field** (`idle`, `nock`, `drawing`) and **one transition** (`bowStep`: down, move, up, a computer's press and release, abort); the view by the time (`bowView`: draw, full, tired; the share, the perfect shot, how tired); the claim (`bowClaimMs`, `bowWire`); the walk, the line's look, the string's bend, the pose's frame |
| `src/game/bowFeel.js` | the wiring: the hook into manual combat, the sounds of each step, `bowFeelFrame` (the loop's, once a frame), the walk, a computer's press (its release on the window), the shot (`bowFeelGapMs`, `bowFeelWire`, `bowFeelLoosed`), the claims' `sw` (`bowFeelSw`), the contact (`bowFeelContact`); the switch; the probe `window.__btBowFeel()` |
| `src/game/manualCombat.js` | a hook (`mcSetBowHook`): the touch handlers' own `mcSwipeStart` / `Move` / `End`, `mcAbort` and `mcAskShot` carry the draw, so no touch handler in `BroTown.jsx` has a line of its own; the drawn bow pulls back (`mcBowSling`), looses at once for its share (`mcAskShot`). No hook, or the hook off: every line as it was |
| `src/rendering/systems/bowFeelFx.js` | the drawer, in the weapon feel kit's own small layer (`weaponFeelFx.js` registers it): the string's V pulled back from the grip, the aim line (two loose lines to one gold one, the tremble), cut at what the bow's sight meets |
| `src/data/bowFeelSound.js` | the sounds, made with WebAudio (no files): `nock`, `creak` (a handle: its pitch rises with the draw, wavers tired), `click`, `twang` (sized by the share; the perfect ring), `letdown`. Played by `BT_AUDIO.bowSound`; labelled in the Sound Studio (`bow*`) |
| `src/rendering/systems/entityRenderer.js`, `effectsRenderer.js` | the bow pose while nocked and drawn (`S._bfPose`): the stand-in's first frame raised, its second drawn, held (`S._bowHoldFrame`) |
| `src/game/monsterCombat.js` | the drawn bow's gap, `dr` on the relay, the arrow leaving at once (`bowFeelLoosed`) |
| `src/game/projectiles.js` | `sw` on the arrow's `monster_damage` and `player_attack`; the contact's spark and sound |
| `src/ui/BroTown.jsx` | `bowFeelFrame` after the sword's, the walk's multiplier, a computer's press |

## Art the owner could draw later

Each placeholder is the kit's soft white picture tinted in code, or the bow's
own stand-in frames held. To replace one, draw it and say which; it would load
behind the loading screen (256 colours, `strip256.mjs`):

- **the bow bending**: a short strip of the bow drawn from rest to full (say
  five frames, each facing the bow pose has), to replace the held "raised" and
  "drawn" frames and the drawn string's V (`bow:strA`, `bow:strB`, `bow:nock`);
- **the aim line**: a thin dashed or feathered line, pale for loose, gold for
  the sweet spot (now the kit's streak, tinted: `bow:aim`, `bow:aimA`, `bow:aimB`);
- **the release**: a snap of air at the bow, and a spark of three sizes at the
  hit (now the kit's streak, ring and burst);
- **the sounds** are made in code: a recording of a bow's creak, a nock, a
  click and a twang would replace them (with its licence in CREDITS.md).

## Not built, and why

- **Other players see the shot, not the draw**: their copy of you shows the
  shot's pose and arrow as before. Showing a peer's nock and draw is a relay
  of its own (a field the worker would rebuild), its own change.
- **The aim line does not wobble the shot**: "wide and loose" is a picture of
  the tension, not a spread. The arrow goes where the line's middle points.
- **Knock-back and debris of an arrow** are as they were; the hit's spark and
  sound are sized by the draw, and its number by the worker's share.
- **No cancel key on a computer**: a draw is let down only by the window
  losing focus. A key for it would be a new entry in `deskKeys.js` (the
  owner's call).
- The tutorial's words were changed for the bow ("pull back ... let go"); the
  old flick words remain for `?manual=1`, which the tutorial cannot tell apart.

## Tests

- `server/test/bow-feel.test.mjs`: the numbers (the worker's), the one
  transition (nock, draw, let down, loose, cancel, a computer), the view (the
  share, the settle's two edges, the tired arm), the bound, **the claim through
  a real worker** (`pw` = the phone's share and `pf` = the phone's gold line,
  60 ms to 1.5 s), the hook (and today's flick with it off), the look (the
  walk slower only, the line, the bend, the pose), the sounds (every node let
  go, every row in the studio), the wiring and the switch.
- `node tools/qa/mp/run.mjs bowfeel` (`mp-bowfeel.mjs`): an upright phone in
  the Wheel with the worker's bow, the default combat -- the nock, the draw
  growing (drawn: the string, the line), the settle (one click, the gold
  line), the tired arm, the let-down sending nothing, a real half draw sending
  `dr`, two real arrows at a monster of the Flame Fields answered by the
  worker's `pw` 0.5 and `pf: 1`, the feel's work a frame within a quarter of
  held-budget's frame line, a computer's held button, `?bowfeel=0` the flick.
