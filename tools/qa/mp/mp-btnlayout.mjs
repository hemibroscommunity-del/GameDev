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
  const dashSel = ['.bt-dashboard', '.bt-bottom-dashboard', '[data-dash]', '.bt-navrail'];
  let dashTop = null;
  for (const s of dashSel) {
    const el = document.querySelector(s);
    if (!el) continue;
    const b = el.getBoundingClientRect();
    if (b.height > 0 && (dashTop == null || b.top < dashTop)) dashTop = Math.round(b.top);
  }
  const rootCS = getComputedStyle(document.documentElement);
  const cssBand = rootCS.getPropertyValue('--dash-h');
  const cssSheet = rootCS.getPropertyValue('--sheet-h');
  const cssSab = rootCS.getPropertyValue('--sab');
  return {
    dashTop, cssBand: cssBand.trim(), sheetH: cssSheet.trim(), sab: cssSab.trim(),
    innerH: window.innerHeight,
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
  const slug = `${phone.width}x${phone.height}${phone.sab ? '-standalone' : ''}`;
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
