# Each memory saver, off from the Test panel (v2.3.3755)

> The owner, 2026-10-28, turning every memory saver on by default: *"I can
> always revert the change if I don't like it."*

## Why

Reverting a saver is a pull request and a deploy, and a judge cannot add
`?x=0` to an address. So during the showing the owner needs a no-deploy OFF
for each client saver, from the Test panel, live, as the message diet has
(`docs/specs/move-path.md`).

## How it works

- **One live flag a saver**, `off_<name>: true` (a live flag holds a boolean
  or a number, never a list, so the comma list lives in the caps instead).
- **The worker** (`server/src/clientoff.js`) folds them into one sorted comma
  list: `caps.clientoff` at join (`''` with none), and the privileged
  `client_off {off}` to every phone whenever an `off_` flag is set or cleared
  (`liveops.js`).
- **The phone** (`src/game/clientOff.js`, no imports): `setClientOff(list)`
  from wsClient.js (state_sync, `client_off`), kept in localStorage
  (`bt_clientoff`) for the next load. A saver asks:
  - `clientOff(name)` if it can change while you play (follows the worker
    live; `onClientOff(fn)` to be told);
  - `clientOffAtLoad(name)` if it only takes effect as the game loads (what
    this phone last heard, read once).
- Each saver's own `?x=0` stays its own off-ramp for one phone.
- **The Test panel** (`DevPanel.jsx`, "Memory savers"): All off, All on, and
  one Turn off / Turn on a saver, its state from the flags (or the caps).

## The savers

| id | Words | Wired | Takes effect |
|---|---|---|---|
| `sfxcache` | Sound held only while needed | `src/game/clientOffApply.js` (BT_AUDIO.SFX_CACHE) | next load |
| `voicecap` | A crowd of one sound plays as a few | `clientOffApply.js` (BT_AUDIO.VOICE_CAP) | at once |
| `onecopy` | Pictures held once | `src/rendering/picsOnce.js` | next load |
| `picnumbers` | Monster strips as colour numbers | `src/rendering/picsNumbers.js` | next load |
| `codelazy` | Windows load when opened | `src/ui/lazyPanel.js` (CODE_LAZY) | next load |
| `groundlean` | Lean ground builder | `src/game/wheelTrial.js` (adds `groundlean=0` to what the ground worker is told) | next load |
| `heaplean` | Map leftover let go | `src/game/wheelTrial.js` (_heapLean) | next load |
| `lookpalette` | Characters coloured on the chip | its own PR (`src/rendering/lookPalette.js`): one line | at once |
| `lookarmour` | Bodies under armour coloured on the chip | v2.3.3752 (`src/rendering/lookArmour.js` `lookArmourOn`); `?lookarmour=0` for one phone | at once (the next frame draws the old masked bake) |

The look palette, not yet on main when this shipped, takes one line in its
own PR (#1212): `import { clientOff } from '@/game/clientOff.js'` and
`&& !clientOff('lookpalette')` in `lookPaletteOn()` (asked every frame, so it
follows live).(A saver that is ever an opt-in again, on only with `?id`, takes
`optIn: true` in CLIENT_SAVERS, and the panel reads "allowed, only with
?id" for it.)

## Tests

- `server/test/client-off.test.mjs` (16 checks): the phone's rule (a list,
  followed live, kept for the next load, nothing before the worker speaks, no
  storage), the worker's list at join and its broadcast on every `off_` change
  and no other, a privileged type, the eight names and their flags.
- `server/test/liveops.test.mjs` 8i: `off_onecopy` through the operator's
  route, told at join, cleared.
- `tools/qa/mp/mp-clientoff.mjs` (5 checks): on a page in BroTown,
  `off_voicecap` turns the voice cap off at once with no reload and is kept;
  `off_onecopy` and a reload turn pictures-held-once off from that load; both
  cleared, the voice cap is back.
