/* ═══ v2.3.6681: THE DASHBOARD'S ONE HEADER (card UI2-frame, the build's step 2) ═══
 *
 * The owner, 2026-11-25 (the master specification): "Completely retire the
 * old CLOSE / Gear / Bro / Quests / Codex / More persistent tab strip ... one
 * contextual header ... Deep screens have labeled Back, title, Menu and
 * Close; no duplicate secondary global nav."  It stands where the row of
 * CLOSE and six buttons stood (the same 52 px, 48 on a short screen: the
 * band's height is the game's, sheetGeometry.js), built from the kit's header
 * (src/ui/kit/Header.jsx) and its tile, restyling neither:
 *   closed      the slim row keeps two buttons, Gear and Menu (the card's
 *               reading 5); the handle stays on the band's edge;
 *   Gear root   [Close]  Gear  [Menu ›]
 *   Menu root   [‹ Gear]  Menu  [Close]
 *   a page      [‹ where Back goes, in words]  its name  [Menu] [Close]
 * Back names its target (dashNav's backTo): the page under, "Gear", "Menu",
 * or "World" for a page reached from the world.  The small Menu on a page
 * goes to the Menu's ROOT (the specification: "The Menu shortcut on a deep
 * view opens the directory root").
 *
 * The game's state comes from the parent as props (open-hand.test: never
 * window._gameState).  The old hooks the tutorial, the coach, the guide arrow
 * and the points' flight find (`[data-nav="dashboard"]`, `[data-nav="hero"]`)
 * are worn by the control that leads there now: Gear's button (or "‹ Gear"),
 * and the Menu (Bro's tile on the Menu's root).  A computer: the Gear button
 * wears I, the Menu O (deskKeys.js NAV_KEYS); Close data-esc (the kit). */
import React from 'react';
import { Ui2Header, Ui2Tile, ui2RootClass } from '@/ui/kit/index.js';
import { BT_AUDIO } from '@/data/index.js';
import { swallowTapClick } from '../../swallowTapClick.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashNavView, dashNavBackTo } from '@/game/dashNav.js';
import { NAV_KEYS } from '@/game/deskKeys.js';
import { SAY } from '@/data/say/dashFrame.js';
import { menus3On } from '@/ui/menus3/menus3Switch.js';   /* v2.3.6860 */
import { Menus3Dock } from '@/ui/menus3/Menus3Dock.jsx';   /* v2.3.6860 */
import { say } from '@/game/say.js';

/** A control's press: on the finger's lift (the band's way: BandClose,
    NavRail), the tap's own click swallowed so it lands on nothing under the
    new header; a keyboard's click (detail 0) as well. */
export function frameTap(fn) {
  return {
    onPointerDown: (e) => e.stopPropagation(),
    onPointerUp: (e) => {
      e.stopPropagation();
      swallowTapClick(e);
      try { e.currentTarget.blur(); } catch (_) { /* fine */ }
      try { BT_AUDIO.uiClickNow(); } catch (_) { /* no sound */ }
      fn(e);
    },
    onClick: (e) => { if (e.detail !== 0) return; fn(e); },
  };   /* touch-action: manipulation is the kit's own (.ui2 *) */
}

const go = (a) => () => dashboardPanelBus.go(a);

/** The word for Back's target. */
function backWord(to, titleOf) {
  if (!to) return '';
  if (to.kind === 'world') return say(SAY, 'dashFrame.world');
  if (to.kind === 'page') return titleOf(to.id);
  if (to.ws === 'gear') return to.id ? titleOf(to.id) : say(SAY, 'dashFrame.gear');
  return say(SAY, 'dashFrame.menu');
}

/* v2.3.6697 (card UI2-grip): the band's pull handle is gone (the owner,
   2026-11-26: "It has an open button making pull handle redundant"), so the
   fold's hook [data-dash-fold] -- how the harness, the coach, the guide arrow
   and the rewards' flight find the fold -- is worn here, by the two controls
   that ARE dashNav's 'fold': Gear when the band is folded ('min'), Close when
   it is shown ('open').  `foldHook` false (`?bandgrip=1`: the handle wears it;
   or sideways) wears none. */
export function DashHeader({ nav, titleOf, menuMark, foldHook = false, peopleDot = false }) {
  const v = dashNavView(nav);
  const kind = !v.shown ? 'closed' : v.top ? 'page' : v.ws === 'gear' ? 'gear-root' : 'menu-root';
  const wrap = (child) => (
    <div className={ui2RootClass()} data-dash-frame={kind} style={{ flex: '1 1 auto', minWidth: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
      {child}
    </div>
  );

  if (kind === 'closed') {
    const mark = menuMark || {};
    /* v2.3.6860 (card MN step 1): the owner's dock, Bro World People, under ?menus3 */
    if (menus3On()) return wrap(<Menus3Dock mark={mark} tap={frameTap} people={peopleDot} />);   /* v2.3.6870: + People's dot */
    return wrap(
      <div style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'center' }}>
        <Ui2Tile size="primary" label={say(SAY, 'dashFrame.gear')} aria-label={say(SAY, 'dashFrame.gearAria')}
          data-dash-ctl="gear" data-nav="dashboard" data-key={NAV_KEYS.dashboard} data-dash-fold={foldHook ? 'min' : undefined}
          style={{ flex: '1 1 0', height: 44 }} {...frameTap(go({ type: 'gear' }))} />
        <Ui2Tile size="primary" label={say(SAY, 'dashFrame.menu')} aria-label={say(SAY, 'dashFrame.menuAria')}
          data-dash-ctl="menu" data-nav="hero" data-key={NAV_KEYS.more}
          badge={mark.count} dot={mark.dot} glow={mark.glow}
          style={{ flex: '1 1 0', height: 44 }} {...frameTap(go({ type: 'menu' }))} />
      </div>,
    );
  }

  const closeCtl = { 'data-dash-ctl': 'close', 'data-dash-fold': foldHook ? 'open' : undefined, ...frameTap(go({ type: 'close' })) };
  if (kind === 'gear-root') {
    return wrap(
      <Ui2Header title={say(SAY, 'dashFrame.gear')} closeStart menuNext menuMark={menuMark}
        ctl={{
          close: closeCtl,
          menu: { 'data-dash-ctl': 'menu', 'data-nav': 'hero', 'data-key': NAV_KEYS.more, ...frameTap(go({ type: 'menu' })) },
        }} />,
    );
  }
  if (kind === 'menu-root') {
    return wrap(
      <Ui2Header title={say(SAY, 'dashFrame.menu')} backLabel={say(SAY, 'dashFrame.gear')} onMenu={false}
        ctl={{
          back: { 'data-dash-ctl': 'back', 'data-dash-back': '', 'data-back-to': 'gear', 'data-nav': 'dashboard', 'data-key': NAV_KEYS.dashboard, ...frameTap(go({ type: 'back' })) },
          close: closeCtl,
        }} />,
    );
  }
  const to = dashNavBackTo(nav);
  const backTo = !to ? '' : to.kind === 'world' ? 'world' : to.kind === 'page' ? to.id : to.ws;
  /* a page straight under the Menu's root: Back IS the Menu, so the small Menu
     beside it would say the same thing twice ("‹ Menu" ... "Menu"); it shows
     from the second page down, where the two differ */
  const twice = !!to && to.kind === 'ws' && to.ws === 'menu';
  return wrap(
    <Ui2Header title={<span data-dash-title={v.top.id}>{titleOf(v.top.id)}</span>} backLabel={backWord(to, titleOf)} menuMark={menuMark}
      onMenu={twice ? false : undefined}
      ctl={{
        back: { 'data-dash-ctl': 'back', 'data-dash-back': '', 'data-back-to': backTo, ...frameTap(go({ type: 'back' })) },
        menu: { 'data-dash-ctl': 'menu', 'data-nav': 'hero', ...frameTap(go({ type: 'menuRoot' })) },
        close: closeCtl,
      }} />,
  );
}
