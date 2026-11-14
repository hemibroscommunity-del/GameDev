# The device profile (v2.3.4804)

`src/game/deviceProfile.js`; held by `server/test/device-profile.test.mjs`.

## Why

The owner, 2026-11-11, on the architectural plan: the game asks what kind of
device it is on in many places (each system "might need different lanes
depending on device, operating system, browser"). The answers were written
wherever they were needed:

- "is there a mouse?" in **sixteen** places, each with its own guard (some
  `window.matchMedia &&`, some `typeof matchMedia === 'function'`, some in a
  `try`, two keeping a query list of their own);
- "is this a computer's window?" in **three**, the query written out in each;
- "is this an iPhone?" **twice by hand**, and a third time differently on the
  Speed test.

A device answer two places can give differently is a lane nobody chose. The
right shape is lanes by what the machine CAN do (a mouse, a window with room,
a memory limit), decided in one place, read everywhere; a device named only for
a known bug with no other test (the look palette on Windows and a Mac:
`lookPaletteChoice.js`).

## The profile

| Question | Function | What decides it | Who asks |
|---|---|---|---|
| A mouse or trackpad is the main pointer | `fineInput()` | `(pointer:fine)`, live | the "click" words (`deskWords.js`), keys, hints, the Trap / Jump layouts (the timing bar's went with it: v2.3.4800, the combat feel), the step volume, the coach, the band sideways, the minimap size |
| A computer's window with room | `computerFrame()` | `(pointer:fine) and (min-width:1000px)`, live: game.css's computer rule | the layout (`deskWide.js`), the canvas's shell (`BroTown.jsx` resize), the keys strip's column |
| An iPhone or iPad | `onIOS()` | the user agent, or MacIntel with touch points (an iPad asking for the desktop site) | the install hint, Settings' "add to home screen" |
| All of it | `deviceProfile()` | the above, plus Windows / Mac and the look palette's choice and the pixel ratio | the Speed test's card (`speedTest.js`), and `window.__btDevice()` for QA |

The two media queries are written once, as `FINE_QUERY` and
`COMPUTER_FRAME_QUERY`; the test holds them to game.css's `@media` rules.

## Step 1 (this version): nothing changes

Every place asks the same question it asked before; only where the answer
comes from moved. The one visible change is the Speed test's card, which now
names the lanes (`mouse` or `touch`, a computer window or not, iOS, the look
palette) so one screenshot from any device says which lanes it is in.

## The owner's questions (not decided here)

The two answers can disagree, as they always did:

- **a computer window under 1000 px wide** has a mouse (the "click" words, the
  keys) but not a computer's frame (the phone's layout);
- **a touchscreen laptop** reports its main pointer, usually the trackpad
  (`fine`), even while it is being tapped;
- **an iPad with a trackpad or keyboard** may report `fine`.

What each of those should get is a decision, not a fix. The likely answer:
the controls follow what was used last, the layout follows the window's size.

## Adding a device question

Add it to the profile (a function, and a line in `deviceProfile()`), and ask
it from there. `device-profile.test` §3 fails a file in `src/` that asks
`matchMedia` about the pointer, writes the computer-window query, or tests the
user agent for an iPhone by hand.

## The device class (v2.3.5121)

`devClass()` in the same file; held by `device-profile.test` §5 to §7. The
grand plan's step 2.1 and `docs/SHAPES.md` part 6. Card A built it, because the
field report (step 1.1) needs it and cannot wait for the lanes. Card O builds
`drawLane` from it later.

**Why:** the report adds a phone's smoothness into the day's bins by **cell**,
and a cell's first part is what the device can do. "How does it run on X" has
to mean X's facts, never X's name. A name decides nothing, and a name a page
reads (the user agent, the chip's name) is free text that no table a coding
session reads may hold.

**Facts only.** The class never holds a system's or browser's name, the
chip's name, a model or anything timed. A cold phone behind the loading
screen always answers "fast", and timing the look palette's build was the
Windows freeze. The chip's name is read once, only to set `soft`, and is never
kept.

| Field | The fact | Values | Read from |
|---|---|---|---|
| `gl` | the WebGL the game's renderer got | `1`, `2` | the renderer's own context |
| `soft` | it draws in software | `0`, `1` | the chip's name against `SOFT_GL`; v2.3.5228: the one program's fallback asks the same list (`softRenderer`), and `paletteTex.js` keeps no copy (§7) |
| `maxTex` | the largest picture side | `2048`, `4096`, `8192`, `16384` (at or under; 2048 or less reads `2048`) | `MAX_TEXTURE_SIZE` |
| `prec` | bits kept at middle precision | `16`, `32` | `getShaderPrecisionFormat` (fragment, medium): 23 bits or more is `32`. Only the profile asks this (§7) |
| `units` | pictures one batch can hold | `8`, `16`, `32` (at or under) | `MAX_TEXTURE_IMAGE_UNITS` |
| `mp` | megapixels the screen asks for | `1`, `2`, `3`, `4`, `6`, `9`, `12` (the first at or over; over 12 reads `12`) | the renderer's own size in CSS px times the **screen's** ratio, not the lowered one (`renderRes.js`). Nothing measures the page |
| `dpr` | device px to a CSS px | `1`, `1.5`, `2`, `3`, `4` (the nearest) | `devicePixelRatio` |
| `hz` | the screen's rate | `30`, `60`, `90`, `120`, `144`, `other` | the pacer's `read().hz`, the nearest within 4. A rate that is none of these, or not known yet (`?pace=0`, the first frames), reads `other` |
| `fill` | a coarse timed fill | `fast`, `mid`, `slow`, `none` | **not run: always `none`.** Nothing is timed at the start; the words wait for card O |
| `input` | mouse or touch | `mouse`, `touch` | `fineInput()` |
| `frame` | a computer's window | `0`, `1` | `computerFrame()` |
| `cores` | processor threads the browser reports | `2`, `4`, `8`, `16` (at or under; none reported reads `2`) | `hardwareConcurrency` |

- **The key** is the values in that order, joined with `-`: an iPhone 14 Pro
  Max reads about `2-0-16384-16-16-4-3-120-none-touch-0-4`. It is coarse on
  purpose: a finer key makes cells that never reach the 20 reports a cell is
  read at (step 1.3).
- **`null`** while there is no drawing context, or the context is lost. A
  report waits for a class.
- **Cheap, and off the frame:** the chip's constants are asked once per
  context (a `WeakMap`); the rest are numbers the page already holds.
- `classOf(facts)` is the pure binning (the tests'); `DEV_CLASS` holds the
  closed lists the worker checks a report against (card A's PR 4);
  `window.__btDevClass()` is the QA probe.
- `device` on the wire is the login's device id (`join.device`). The class is
  never sent under that name.
- Not in the class, and never to be added: `ios`, `windows`, `mac`, the user
  agent, the chip's name, the model (a page cannot read it; the Speed test
  asks the player), how long a program took to build or a bake took, the
  heap's size.

### What still asks the device outside the profile

Each of these is someone else's to move, so this PR only lists them:
`paletteTex.js` (the chip's name, `SOFTWARE_GL`), `peerImpostor.js` and
`crashTrap.js` (`MAX_TEXTURE_SIZE`), `bodyBake.js` (`hardwareConcurrency`),
`perfHud.js` (the chip's name, on the strip). Card O's lanes read the class
instead (step 2.1).

**Moved (v2.3.5227, card O PR 7).** The four the card names ask the
profile now, and each gets the answer it got by asking itself
(`device-profile.test` §3b):

| File | Its question | The profile's |
|---|---|---|
| `paletteTex.js` | the chip's name (one program or three) | `rendererName(renderer)` |
| `peerImpostor.js` | the largest picture side (`MAX_TEXTURE_SIZE`) | `maxTextureSize(renderer)` |
| `bodyBake.js` | the processor's threads (the bake pool) | `cores()` |
| `crashTrap.js` | the user agent and the largest side (a crash report) | `userAgent()`, `maxTextureSize(renderer)` |

`chipName` is the one copy of "Firefox gives RENDERER, Chrome and Safari
the debug extension"; the class's `soft` reads it too. `paletteTex.js`
keeps `SOFTWARE_GL` (§7 holds the class's list to it).

**The two choices' names (v2.3.5228, card O PR 8).** `onWindows` and
`onMac` moved here from `lookPaletteChoice.js` (re-exported there), and
`paletteTex.js`'s `SOFTWARE_GL` is gone: the one program's fallback asks
`softRenderer`, the class's `SOFT_GL`. The lanes' overrides (`drawLanes.js`
`OVERRIDES`) pin the `program` knob to the three and the `look` knob to
baked; each row's `when` (`software`, `computer`, `windows`, `mac`) is
answered by `devAsk(facts)` here, and the page's own answers are handed to
the lanes (`useDevAsk`). `lookPalette.js` reads no navigator now (§3's
census 4 -> 3). The look's choice is handed in for the profile's `palette`
(`useLookChoice`), never imported: one way only. Every device gets the
answer it got before (`server/test/one-program.test.mjs`).

§3 now also fails a chip or browser question outside the profile: the
largest side through `getParameter`, `.hardwareConcurrency`, `.userAgent`,
the chip's name (`RENDERER`, the unmasked one). Four files still ask one,
a census that only falls (`STILL_ASKS`, the line 4), each with its reason:
`networking/index.js` (the identity's fingerprint parts: who, not what it
can draw), `perfHud.js` (the strip's chip name, `?perf=1`),
`DebugOverlay.jsx` (the "UA" cell), and `lookPalette.js` (the look's
choice: card O's PR 8 moves it into the lanes' table). A file on the list
that no longer asks fails too, so the list shrinks with the code.
