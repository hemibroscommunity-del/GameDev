# UI sounds — the menu click and the dialog close (v2.3.2642)

What a tap in the menus sounds like, and where to change it. Code is the
source of truth; this is the map.

## The owner's rule

> "Use the click sound for navigating through the menus (tapping the dashboard
> buttons or any of the buttons in any of those menus). Use the close sound for
> closing the dialog window that appear in game (like for quests and tutorials
> pop ups and stuff like that)."

Three UI sounds exist, and each has one job:

| key | file | when |
|---|---|---|
| `ui-click` | `public/sfx/ui/click.mp3` | navigating — any button in any menu |
| `ui-close` | `public/sfx/ui/close.mp3` | a dialog/window closing |
| `ui-equip` | `public/sfx/ui/equip.mp3` | equipping **or** unequipping (v2.3.2637: one sound, by instruction) |

`ui-click` is deliberately quieter in effect than `ui-close` (0.85 gain on a
0.540-peak sample vs 0.5 on a 0.975-peak one). A sound you hear on *every* tap
has to sit under one you hear when something happens.

## How a button gets its sound

**You almost never wire one.** `src/ui/uiSfxDelegate.js` installs a single
capture-phase `pointerdown`/`pointerup` pair on `document` (from
`src/main.jsx`) and gives a sound to every `<button>` and `[role="button"]` in
the app. A new panel is audible the day it is written; silence is the thing you
have to ask for.

It routes on markup, in this order:

1. `data-uisfx="off"` on the element or any ancestor → **silent**
2. `data-uisfx="close"` / `"click"` → that sound, explicitly
3. `data-qa="dlg-close"`, or the `.bt-inspect-close` class → **close**
4. `aria-label` starting `Close` → **close**; any *other* `aria-label` →
   **click** (so the trade window's "Remove …" ✕ is not a close)
5. no label, and the button's whole text is a cross (`✕ ✖ × ╳ ⨯`) → **close**
6. otherwise → **click**

Disabled buttons (`disabled`, `aria-disabled="true"`) are silent. A pointerup
that travelled more than 12px is a scroll, not a tap, and is silent.

### When you do need to touch code

- **A control that is not a button** (a card or row with `onClick`): give it
  `data-uisfx="click"`, or make it a real `[role="button"]`.
- **A world/HUD control drawn as a button**: `data-uisfx="off"`. Today the only
  one is `ElementBurstButton`. The joystick, attack, special and shield discs
  are plain divs, so the delegate cannot reach them at all — keep it that way.
- **A dialog that closes by something other than a button** (a backdrop tap, a
  decline branch, finishing a tour): call `BT_AUDIO.uiTick('ui-close', 0.5)` in
  the component's own close helper. `QuestPanel._closeQuestPanel` and
  `ControlsTutorial.onClose` are the two worked examples — one helper per panel,
  never the sound copied onto each exit.

## Why a tap never makes two sounds

Some buttons already own a named sound (equip, close) whose handler runs *after*
the pointerup the delegate watches. So the generic click is **deferred 60ms**
and stands down if a named sound spoke for the same gesture
(`BT_AUDIO.uiClick`, `src/data/gameDisplay.js`):

- a named tick that lands **after** the delegate schedules → cancels the pending
  click (`uiTick` clears `_uiClickPending`);
- a named tick that lands **before** it (anything on `pointerdown`) → caught by
  comparing `_uiSpecificAt` against the timestamp the *gesture* began, which the
  delegate passes in.

The gesture timestamp, not a time window, is what makes this exact: any fixed
window wide enough to cover a slow press also swallows the *next* tap, because
reaching for the next button after closing a window takes about that long.

`uiTick` additionally collapses repeats of the **same** key inside 260ms and
keeps one voice per key (v2.3.2639/2641), so a control that is both explicitly
wired and seen by the delegate costs a duplicate *call*, never a duplicate
*sound*. `NavRail` relies on exactly that: it calls `BT_AUDIO.uiClickNow()`
itself so the dashboard tabs never depend on the delegate.

## Tests

- `tools/qa/mp/mp-uisfx.mjs` — every key decodes to real audio, and each UI tick
  is under 0.6s.
- `tools/qa/mp/mp-uisfx2.mjs` — the equip sound fires from the real unequip path;
  a dashboard tab plays the click and not the close.
- `tools/qa/mp/mp-uisfx3.mjs` — the routing table above, one-gesture-one-sound in
  both orders, a **coverage** sweep that asks React which elements carry a tap
  handler and requires a sound for each (allowlist: the panel surface
  `.bt-dashboard`, and `[data-zone-title]`, which is a long-press handle), and a
  spill test that no world control resolves to a menu sound.

Adding a sound? Ship it as **mp3** (v2.3.1610: `decodeAudioData` refuses AAC
outside Safari), register it in `BT_AUDIO.SFX_MANIFEST` so the loading gate
preloads it, and prove it with `tools/qa/mp/audio-formats.mjs`. Trim trailing
silence with `tools/trim_mp3_tail.mjs` — a lossless frame-boundary cut; there is
no mp3 encoder in the sandbox.
