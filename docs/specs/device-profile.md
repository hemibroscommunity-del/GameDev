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
| A mouse or trackpad is the main pointer | `fineInput()` | `(pointer:fine)`, live | the "click" words (`deskWords.js`), keys, hints, the Trap / Jump / timing-bar layouts, the step volume, the coach, the band sideways, the minimap size |
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
