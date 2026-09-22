/* ═══ v2.3.2642: ONE LISTENER FOR EVERY MENU BUTTON ═══
 *
 * Owner: "Use the click sound for navigating through the menus (tapping the
 * dashboard buttons or any of the buttons in any of those menus).  Use the
 * close sound for closing the dialog window that appear in game (like for
 * quests and tutorials pop ups and stuff like that)."
 *
 * WHY A DELEGATE AND NOT FORTY HANDLERS.  "Any of the buttons in any of
 * those menus" is roughly four hundred controls across forty-four files.
 * Wiring them one at a time is not just tedious: it is the shape of bug this
 * feature has ALREADY shipped twice.  v2.3.2637 put a tick on
 * dashboardPanelBus.tapDestination, which reads like the right chokepoint and
 * has no callers, so the tabs were silent; v2.3.2639 found the real gesture on
 * the nav rail and fixed that ONE control.  Every button added after such a
 * pass is silent by default, and nothing fails when it is -- a missing sound
 * is invisible to lint, to the build, and to every scenario that does not
 * listen for it.  A delegate inverts that: a new button is audible the day it
 * is added, and silence becomes the thing you have to ask for.
 *
 * WHAT COUNTS AS A BUTTON, and why that selector is safe here.  `<button>` and
 * `[role="button"]`, and nothing else.  That is not a guess -- it was checked
 * against the code: the world controls are all plain divs with pointer
 * handlers (TouchControls, AbilityButtons, SpecialButton, ShieldButton,
 * EmotePanel contain ZERO of either token), so the joystick, the attack
 * button, the special and the shield cannot reach this, and the combat sounds
 * they already own are not doubled.  The one world control that does use
 * role="button" is ElementBurstButton, which opts out by attribute.
 *
 * CAPTURE, because NavRail (and several panels) call stopPropagation in their
 * own handlers; a bubble-phase listener would never see the taps this feature
 * exists for.
 *
 * WHICH SOUND.  Explicit `data-uisfx` wins; after that the dialog-close
 * signals the repo ALREADY uses are read as-is, so a close cross does not have
 * to be edited to be heard:
 *   - `data-qa="dlg-close"`      (QuestOfferPanel, NpcDialogue)
 *   - `.bt-inspect-close`        (the shared close cross -- 16 panels)
 *   - aria-label starting "Close" (ControlsTutorial, InfoPopup, ItemDetail,
 *                                  ShopkeeperPanel, AccountModal, ...)
 *   - a cross GLYPH as the button's entire text, when it has no aria-label
 * An aria-label that is NOT a close ("Remove Bronze Sword", the trade window's
 * ✕ chips) falls through to the click on purpose -- removing an item from an
 * offer is not closing a window.
 */

import { BT_AUDIO } from '@/data/index.js';

/* Every cross the repo draws as a text node.  QuestOfferPanel and NpcDialogue
   deliberately use an SVG instead (v2.3.2289 -- a glyph there polluted
   textContent and broke six quest scenarios), which is why data-qa is the
   first signal above and not an afterthought. */
const CLOSE_GLYPHS = ['✕', '✖', '×', '╳', '⨯'];

/* A tap, not a drag.  A pointerup that travelled is a scroll of a list whose
   rows happen to be role="button", and the panels are full of those.  The
   browser suppresses `click` after such a gesture; pointerup is not
   suppressed, so the check has to be made here. */
const TAP_SLOP_PX = 12;

function attr(el, name) {
  try { return el.getAttribute(name); } catch (e) { return null; }
}

function isDisabled(el) {
  if (el.disabled) return true;
  if (attr(el, 'aria-disabled') === 'true') return true;
  return false;
}

function isCloseControl(btn) {
  if (btn.closest('[data-uisfx="close"]')) return true;
  if (btn.closest('[data-qa="dlg-close"]')) return true;
  if (btn.classList && btn.classList.contains('bt-inspect-close')) return true;
  if (btn.closest('.bt-inspect-close')) return true;
  const label = attr(btn, 'aria-label');
  /* An aria-label is an ANSWER, not a hint: if the author named the control,
     that name decides, and a "Remove ..." button does not get the close
     sound just because it draws a cross. */
  if (label != null && label !== '') return /^close\b/i.test(label.trim());
  const txt = (btn.textContent || '').trim();
  return CLOSE_GLYPHS.indexOf(txt) !== -1;
}

/* Exported for the QA scenario, which asserts the routing without having to
   synthesise pointer events for every control in the game. */
export function resolveUiSfx(target) {
  if (!target || !target.closest) return null;
  /* Nearest declaration wins, so a container can silence a whole surface and
     one control inside it can still opt back in. */
  const declared = target.closest('[data-uisfx]');
  const mode = declared ? attr(declared, 'data-uisfx') : null;
  if (mode === 'off' || mode === 'none') return null;
  const btn = target.closest('button, [role="button"]');
  if (!btn && mode == null) return null;
  const el = btn || declared;
  if (isDisabled(el)) return null;
  if (mode === 'close') return 'ui-close';
  if (mode === 'click') return 'ui-click';
  return isCloseControl(el) ? 'ui-close' : 'ui-click';
}

let installed = false;

export function installUiSfxDelegate(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || installed) return;
  installed = true;

  /* v2.3.2642: the routing decision on the autotest surface (the v2.3.2123
     idiom), so tools/qa/mp/mp-uisfx3.mjs tests the GAME's copy of the rule
     instead of its own re-implementation of it -- which is the only version
     of this test that can fail when the rule changes. */
  if (typeof window !== 'undefined') window.__uiSfxResolve = resolveUiSfx;

  let downX = 0, downY = 0, downId = null, downAt = 0;

  d.addEventListener('pointerdown', (e) => {
    downId = e.pointerId;
    downX = e.clientX;
    downY = e.clientY;
    /* The gesture's own start, on BT_AUDIO's clock -- it is what tells a
       named sound fired during this tap from one fired for the previous
       tap.  See BT_AUDIO.uiClick. */
    downAt = BT_AUDIO._now();
  }, true);

  d.addEventListener('pointerup', (e) => {
    if (e.pointerId !== downId) return;
    downId = null;
    const dx = e.clientX - downX, dy = e.clientY - downY;
    if ((dx * dx + dy * dy) > (TAP_SLOP_PX * TAP_SLOP_PX)) return;
    let key = null;
    try { key = resolveUiSfx(e.target); } catch (err) { key = null; }
    if (!key) return;
    /* The close sound goes through uiTick directly: it is a NAMED sound, so it
       is allowed to win the gesture (and a panel that also ticks 'ui-close'
       from its own handler collapses into this one by uiTick's same-key
       window).  The click defers and stands down if a named sound turns up --
       see BT_AUDIO.uiClick. */
    try {
      if (key === 'ui-close') BT_AUDIO.uiTick('ui-close', 0.5);
      else BT_AUDIO.uiClick(undefined, downAt);
    } catch (err) { /* a UI sound must never break a tap */ }
  }, true);
}
