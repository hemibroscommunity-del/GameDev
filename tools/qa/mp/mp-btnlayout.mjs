/* ═══ THE COMBAT BUTTONS DO NOT HIDE UNDER THE DASHBOARD (v2.3.2254) ═══
 *
 * Owner: "[shield bash] needs to move up though it's behind the dashboard
 * right now (portrait)."
 *
 * Every one of these controls is anchored in `calc(var(--sheet-h, var(--dash-h))
 * + Npx)` and their N values were each chosen against a different snapshot of
 * that band.  The band moves (v2.3.2118's identity row, the landscape fold,
 * an open sheet), and nothing checked that the stack still cleared it -- so a
 * button could sit under the dashboard and every existing assertion would pass,
 * because a covered element still reports a perfectly good rect.
 *
 * This measures the real rects against the real dashboard, in portrait, with
 * the shield UP so the bash button is on screen.
 */
import * as H from './harness.mjs';

const installTouch = (P) => P.page.evaluate(() => {
  window.__touch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t],
    }));
  };
  window.__centre = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { el, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  };
});

const rects = (P) => P.page.evaluate(() => {
  const one = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const shown = cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), shown };
  };
  /* The dashboard's own top edge: whichever of the band elements is highest. */
  const dashSel = ['.bt-dashboard', '.bt-bottom-dashboard', '[data-dash]', '.bt-navrail',
    /* v2.3.2254: .bt-dashboard above is the same element in BOTH snaps -- it
       simply grows to `expandedSheetHeight + var(--sab)` when a destination is
       open (BottomDashboard, v2.3.2198) -- so the expanded rows measure against
       the real painted top without a second selector.  .bt-land-sheet is the
       sideways side-panel, kept for the landscape case. */
    '.bt-land-sheet'];
  let dashTop = null;
  for (const s of dashSel) {
    const el = document.querySelector(s);
    if (!el) continue;
    const b = el.getBoundingClientRect();
    if (b.height > 0 && (dashTop == null || b.top < dashTop)) dashTop = Math.round(b.top);
  }
  const bus = window.__broDashPanelBus;
  const rootCS = getComputedStyle(document.documentElement);
  const cssBand = rootCS.getPropertyValue('--dash-h');
  const cssSheet = rootCS.getPropertyValue('--sheet-h');
  const cssSab = rootCS.getPropertyValue('--sab');
  return {
    dashTop, cssBand: cssBand.trim(), sheetH: cssSheet.trim(), sab: cssSab.trim(),
    innerH: window.innerHeight,
    mode: (bus && bus.state && bus.state.mode) || null,
    attack: one('.bt-rjoy-base'), shield: one('[data-shield]'),
    bash: one('[data-ability="bash"]'), whirl: one('[data-ability="whirl"]'),
  };
});

/* Several real phones, because the whole stack is anchored in `calc(band +
   Npx)` and the band's height is device-dependent -- a clearance that holds on
   a 390x844 can be gone on a shorter screen, which is exactly the shape of bug
   being chased here. */
const PHONES = [
  { width: 390, height: 844, tag: 'iPhone 13/14/15' },
  { width: 375, height: 667, tag: 'iPhone SE / 8' },
  { width: 360, height: 640, tag: 'small Android' },
  { width: 430, height: 932, tag: 'iPhone Pro Max' },
  /* ═══ THE INSTALLED LAUNCH (v2.3.2254) ═══
     The reason a browser-tab sweep can pass while the owner's phone shows a
     button under the band.  Standalone (added to the home screen) the page
     draws under the home indicator, so env(safe-area-inset-bottom) becomes
     ~34px -- and --dash-h counts it (v2.3.2178) while --sheet-h, which is
     what every floating control actually anchors to, does not.  The band
     grows DOWNWARD-inclusive and the controls do not move: the whole stack
     loses one inset of clearance.  env() cannot be set in a headless
     browser, so this overrides the same #bt-sab-probe the landscape suite
     already drives (v2.3.2178's note: "the QA harness simulates a
     standalone launch by overriding the probe"). */
  { width: 390, height: 844, tag: 'iPhone 13 STANDALONE', sab: 34 },
  { width: 430, height: 932, tag: 'iPhone Pro Max STANDALONE', sab: 34 },
  /* ═══ THE OWNER'S ACTUAL SCREEN (v2.3.2254) ═══
     A native 1290x2796 screenshot -- an iPhone Pro Max, 430x932 CSS at 3x --
     with the game installed to the home screen AND the dashboard sheet OPEN
     on the bag.  Measured off that capture: the band's painted top edge sits
     at CSS y 581.7, and the shield button (CSS x 308..356, so exactly its 48px
     width) is CUT OFF there with roughly 18 CSS px of it behind the band.

     The closed-bar rows above did not cover this: stampSheetH takes a
     DIFFERENT branch when mode === 'expanded' (expandedSheetHeight, not
     barHeight), so a fix verified with the sheet shut proves nothing about the
     state the owner is actually playing in.  Both insets, so the expanded
     branch is pinned with and without the home indicator. */
  { width: 430, height: 932, tag: 'Pro Max SHEET OPEN', expand: 'bag' },
  { width: 430, height: 932, tag: 'Pro Max STANDALONE + SHEET OPEN', sab: 34, expand: 'bag' },
];

export async function run({ browser, wsPort, webPort, rec }) {
  for (const ph of PHONES) await onePhone({ browser, wsPort, webPort, rec }, ph);
}

async function onePhone({ browser, wsPort, webPort, rec }, phone) {
  const P = await H.newPlayer(browser, {
    name: 'Lay' + phone.width, wsPort, webPort,
    viewport: { width: phone.width, height: phone.height }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  if (phone.sab) {
    await P.page.evaluate((px) => {
      const st = document.createElement('style');
      st.textContent = '#bt-sab-probe{padding-bottom:' + px + 'px!important}';
      document.head.appendChild(st);
      window.dispatchEvent(new Event('resize'));
    }, phone.sab);
    await P.page.waitForTimeout(900);
  }
  await installTouch(P);
  /* A shield in hand, a monster near, and the shield RAISED — the only state
     in which the bash button exists (v2.3.2252). */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg && !S.rpg.shield) S.rpg.shield = { type: 'shield', name: 'QA Shield', tierMult: 1 };
    S._serverMonsters = false;
    S.monsters = [{
      id: 'lay_1', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: S.player.x + 80, y: S.player.y, renderX: S.player.x + 80, renderY: S.player.y,
      hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0, spd: 0, vx: 0, vy: 0,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [],
    }];
  });
  await P.page.waitForTimeout(700);
  if (phone.expand) {
    await P.page.evaluate((d) => { window.__broDashPanelBus.open(d); }, phone.expand);
    await P.page.waitForTimeout(900);
  }
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); if (c) { window.__touch(c.el, 'touchstart', c.x, c.y, 20); window.__touch(c.el, 'touchend', c.x, c.y, 20); } });
  await P.page.waitForTimeout(400);

  const r = await rects(P);
  const tag = `${phone.tag} ${phone.width}x${phone.height}`;
  if (phone.sab) {
    rec.ok(`${tag}: guard: the standalone inset really took (--sab is ${r.sab})`,
      Math.round(parseFloat(r.sab) || 0) === phone.sab, r);
  }
  console.log(`    LAYOUT ${tag}: ` + JSON.stringify(r));
  rec.ok(`${tag}: the dashboard band was found (guard)`,
    typeof r.dashTop === 'number' && r.dashTop > 0, r);
  /* GUARD, and it caught a real silent pass: the first version of the expanded
     rows measured a sheet that had never opened and went green anyway.  A row
     that claims to test the open sheet must prove the sheet is open. */
  rec.ok(`${tag}: guard: the sheet snap is what this row claims (${r.mode})`,
    r.mode === (phone.expand ? 'expanded' : 'bar'), { mode: r.mode, wanted: phone.expand ? 'expanded' : 'bar' });

  /* ═══ THE ROOT CAUSE, PINNED DIRECTLY (v2.3.2254) ═══
     Every assertion above is a CONSEQUENCE -- a button that happens to clear a
     band on one device at one size.  The defect itself is that two numbers
     describing the same band disagreed: --dash-h counts the home-indicator
     inset (v2.3.2178) and --sheet-h did not, so the controls hung 34px too low
     on an installed phone.  Pin the numbers, not just their symptom, and the
     next person who edits either formula fails here instead of on a phone.

     Portrait only: sideways --dash-h is the inset ALONE (v2.3.2168 removed the
     band), and the two are equal there for a different reason. */
  const _band = parseFloat(r.cssBand) || 0, _sheet = parseFloat(r.sheetH) || 0;
  rec.ok(`${tag}: --sheet-h and --dash-h agree (${_sheet} vs ${_band}) -- the controls hang from the same band the dashboard paints`,
    Math.abs(_sheet - _band) < 0.6, { sheetH: _sheet, dashH: _band, sab: r.sab });
  /* ...and the band PAINTS what it claims, so agreeing on a wrong number is
     not a pass either. */
  rec.ok(`${tag}: the band paints the height it declares (top ${r.dashTop} vs innerH ${r.innerH} - dash-h ${_band})`,
    Math.abs(r.dashTop - (r.innerH - _band)) <= 2, { dashTop: r.dashTop, innerH: r.innerH, dashH: _band });
  rec.ok(`${tag}: guard: the shield is up, so the bash button exists`,
    !!r.bash && r.bash.shown === true, r.bash);

  /* THE CLAIM.  Every combat control's BOTTOM edge must sit above the
     dashboard's top edge -- not merely its top edge, or a button half-swallowed
     by the band still passes. */
  for (const [name, box] of [['attack', r.attack], ['shield', r.shield], ['bash', r.bash], ['whirl', r.whirl]]) {
    if (!box || !box.shown) continue;
    rec.ok(`${tag}: the ${name} button sits clear of the dashboard (bottom ${box.bottom} vs dash top ${r.dashTop})`,
      box.bottom <= r.dashTop, { name, box, dashTop: r.dashTop });
  }
  /* ...and the bash column clears the ATTACK DISC, which is the thing directly
     under it.  Its old 178px anchor was 70 + the disc's PORTRAIT height + 12,
     so sideways (a 108px disc) the two boxes met exactly (v2.3.2254). */
  if (r.bash && r.attack && r.bash.shown && r.attack.shown) {
    rec.ok(`${tag}: the bash button sits clear of the attack disc (bash bottom ${r.bash.bottom} vs disc top ${r.attack.top})`,
      r.bash.bottom + 8 <= r.attack.top, { bash: r.bash, attack: r.attack });
  }
  /* ...and they do not overlap each other. */
  if (r.bash && r.shield && r.bash.shown && r.shield.shown) {
    rec.ok(`${tag}: the bash button does not overlap the shield button`,
      r.bash.bottom <= r.shield.top || r.bash.top >= r.shield.bottom
      || r.bash.right <= r.shield.left || r.bash.left >= r.shield.right,
      { bash: r.bash, shield: r.shield });
  }
  const slug = `${phone.width}x${phone.height}${phone.sab ? '-standalone' : ''}${phone.expand ? '-open' : ''}`;
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/btnlayout-${slug}.png` });

  /* ═══ SLIDE DOWN FROM ATTACK ONTO THE SHIELD (v2.3.2254) ═══
     Owner: "I'd like it if I can just slide my finger down from the attack
     button to the shield button and have it activate.  Right now if I slide
     my finger down while attacking the shield button doesn't activate."

     Driven as the phone drives it: touchstart ON THE ATTACK DISC, then moves
     dispatched to that same element (the browser routes every later touch to
     the element that took the touchstart -- which is exactly WHY the shield
     never saw the finger), then a touchend inside the shield's box.

     Two claims, and the second is the one that would have shipped broken: the
     guard goes up, AND the special is not spent on the way out.  A downward
     drag is fast and committed, which is precisely what bE's flick classifier
     is looking for. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._shieldUp) { const c = window.__centre('[data-shield]'); if (c) { window.__touch(c.el, 'touchstart', c.x, c.y, 31); window.__touch(c.el, 'touchend', c.x, c.y, 31); } }
  });
  await P.page.waitForTimeout(350);
  const pre = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { shieldUp: !!S._shieldUp, swipe: !!S._hasUsedSwipe, mp: S.rpg ? S.rpg.mp : null };
  });
  rec.ok(`${tag}: guard: the shield starts DOWN for the slide test`, pre.shieldUp === false, pre);

  const slid = await P.page.evaluate(() => {
    const a = window.__centre('.bt-rjoy-base');
    const sh = window.__centre('[data-shield]');
    if (!a || !sh) return { err: 'no control' };
    window.__touch(a.el, 'touchstart', a.x, a.y, 40);
    /* Six steps down the gap, all dispatched to the ATTACK disc. */
    for (let i = 1; i <= 6; i++) {
      const f = i / 6;
      window.__touch(a.el, 'touchmove', a.x + (sh.x - a.x) * f, a.y + (sh.y - a.y) * f, 40);
    }
    window.__touch(a.el, 'touchend', sh.x, sh.y, 40);
    const S = window._gameState.current;
    return { shieldUp: !!S._shieldUp, swipe: !!S._hasUsedSwipe, mp: S.rpg ? S.rpg.mp : null };
  });
  rec.ok(`${tag}: sliding from the attack button onto the shield raises the guard`,
    slid.shieldUp === true, slid);
  rec.ok(`${tag}: ...and that slide does not also fire the special`,
    slid.swipe === pre.swipe, { pre, slid });

  await P.ctx.close().catch(() => {});
}
