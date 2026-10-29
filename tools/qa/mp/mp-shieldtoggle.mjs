/* ═══ ON A COMPUTER, THE RIGHT BUTTON TOGGLES THE SHIELD (v2.3.3845) ═══
 *
 * The owner, 2026-10-29: "Also I think right click should just hold up
 * shield until you click right click again. You should also be able to just
 * hold it up and point if there's no monsters around."
 *
 * On a real page, a computer (1280 x 800, the wide layout), a shield on the
 * arm, Playwright's real mouse:
 *   In BroTown, nothing near:
 *   1. a right press and release raises the guard, and a second later it is
 *      still up; no browser menu;
 *   2. moving the mouse turns it: the pointer right of the bro, the guard
 *      faces right; left, left;
 *   3. walking with the mouse still, it stays on the pointer (aimed from
 *      where the pointer is now, not where the last mouse move left it);
 *   4. the next right press lowers it;
 *   5. what lowers a guard still does -- X (a roll, or before v2.3.3844 a
 *      jump) -- and the next right
 *      press raises it again; leaving the window lowers it;
 *   6. the controls list says "Shield \u2195" (up and down: "Shield
 *      (toggle)" is 97 px of the column's 73), not cut short.
 *   At Frost Ridge, a snowman near:
 *   7. the guard faces the snowman, not the pointer held the other way;
 *   8. no page errors.
 */
import * as H from './harness.mjs';

const WIDE = { width: 1280, height: 800 };
const angGap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
/* a world point on the page */
const pagePoint = (P, wx, wy) => P.page.evaluate(([x, y]) => {
  const S = window._gameState.current;
  const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
  const px = cv.left + (x - S.camera.x) * S._worldScaleX, py = cv.top + (y - S.camera.y) * S._worldScaleY;
  const top = document.elementFromPoint(px, py);
  return { x: Math.round(px), y: Math.round(py), canvas: !!(top && top.classList && top.classList.contains('brotown-canvas')) };
}, [wx, wy]);
/* the guard, and the angle from the bro to where the pointer is now */
const look = (P, mx, my) => P.page.evaluate(([x, y]) => {
  const S = window._gameState.current;
  const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
  const wx = (x - cv.left) / S._worldScaleX + S.camera.x, wy = (y - cv.top) / S._worldScaleY + S.camera.y;
  return { up: !!S._shieldUp, mouse: !!S._shieldMouse, ang: typeof S._shieldAngle === 'number' ? S._shieldAngle : null,
    ptr: Math.atan2(wy - S.player.y, wx - S.player.x), press: window.__btDeskPress || null,
    why: S._shieldDroppedWhy || null, x: Math.round(S.player.x), y: Math.round(S.player.y),
    menus: (window.__stMenus || []).slice() };
}, [mx, my]);
const rightClick = async (P) => {
  await P.page.mouse.down({ button: 'right' });
  await P.page.waitForTimeout(120);
  await P.page.mouse.up({ button: 'right' });
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Shieldtoggle', wsPort, webPort, viewport: WIDE, world: 'wheel', wide: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading, desk: !!S._isDesktop }),
      (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'into the world' }).catch(() => null);
    rec.ok('a computer in the world, the wide layout (guard)', !!inW && inW.desk, inW);
    if (!inW || !inW.desk) return;
    await H.closeNpcDialogue(P).catch(() => {});
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    const shieldOn = await P.page.evaluate(() => {
      window.__btProbe = true;
      window.__stMenus = [];
      document.addEventListener('contextmenu', (e) => window.__stMenus.push(e.defaultPrevented));
      const R = window._gameState.current.rpg;
      if (!R.shield) R.shield = (R.shieldStash || []).length ? R.shieldStash[0] : { name: 'Pine Shield', type: 'shield', gearBase: 'wood', tierMult: 1, def: 1 };
      return !!R.shield;
    });
    await P.page.waitForTimeout(1500);
    const here = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const near = await H.readState(P, (S) => (S.monsters || []).filter((m) => m && m.alive !== false).length);

    /* ── 1. press, release: up, and still up a second later ── */
    const upPt = await pagePoint(P, here.x - 10, here.y - 160);   /* the pointer above the bro */
    await P.page.mouse.move(upPt.x, upPt.y);
    await P.page.waitForTimeout(400);
    await rightClick(P);
    await P.page.waitForTimeout(1000);
    const r1 = await look(P, upPt.x, upPt.y);
    rec.ok(`1. in BroTown (${near} monsters drawn), a right press and release raises the shield, still up 1 s later (press: ${r1.press && r1.press.kind})`,
      shieldOn && upPt.canvas && r1.up && r1.press && r1.press.kind === 'shield', { r1, upPt });
    rec.ok(`1. ...and no browser menu (${JSON.stringify(r1.menus)})`, r1.menus.length >= 1 && r1.menus.every((p) => p === true), r1.menus);

    /* ── 2. the mouse turns it ── */
    const rightPt = await pagePoint(P, here.x + 180, here.y - 20);
    await P.page.mouse.move(rightPt.x, rightPt.y, { steps: 4 });
    await P.page.waitForTimeout(500);
    const r2a = await look(P, rightPt.x, rightPt.y);
    const leftPt = await pagePoint(P, here.x - 180, here.y + 30);
    await P.page.mouse.move(leftPt.x, leftPt.y, { steps: 4 });
    await P.page.waitForTimeout(500);
    const r2b = await look(P, leftPt.x, leftPt.y);
    rec.ok(`2. with nothing near, moving the mouse turns the shield: right ${r2a.ang && r2a.ang.toFixed(2)} (pointer ${r2a.ptr.toFixed(2)}), left ${r2b.ang && r2b.ang.toFixed(2)} (pointer ${r2b.ptr.toFixed(2)})`,
      r2a.up && r2b.up && angGap(r2a.ang, r2a.ptr) < 0.2 && angGap(r2b.ang, r2b.ptr) < 0.2 && angGap(r2a.ang, r2b.ang) > 2.2, { r2a, r2b });

    /* ── 3. walking with the mouse still ── */
    await P.page.keyboard.down('s');
    await P.page.waitForTimeout(900);
    await P.page.keyboard.up('s');
    await P.page.waitForTimeout(400);
    const r3 = await look(P, leftPt.x, leftPt.y);
    rec.ok(`3. walking with the mouse still (to ${r3.x},${r3.y}), the shield stays on the pointer (${r3.ang && r3.ang.toFixed(2)} vs ${r3.ptr.toFixed(2)}; it was ${r2b.ang && r2b.ang.toFixed(2)})`,
      r3.up && (r3.y - r2b.y) > 30 && angGap(r3.ang, r3.ptr) < 0.2, { r2b, r3 });

    /* ── 4. the next right press lowers it ── */
    await rightClick(P);
    await P.page.waitForTimeout(700);
    const r4 = await look(P, leftPt.x, leftPt.y);
    rec.ok(`4. the next right press lowers it (press: ${r4.press && r4.press.kind})`, !r4.up && r4.press && r4.press.kind === 'shield-down', r4);

    /* ── 5. a roll lowers it, the next press raises it; a blur lowers it ── */
    await rightClick(P);
    await P.page.waitForTimeout(600);
    const r5a = await look(P, leftPt.x, leftPt.y);
    await P.page.keyboard.press('x');   /* the roll since v2.3.3844, the jump before it: both lower a guard */
    await P.page.waitForTimeout(900);
    const r5b = await look(P, leftPt.x, leftPt.y);
    await P.page.waitForTimeout(600);
    await rightClick(P);
    await P.page.waitForTimeout(600);
    const r5c = await look(P, leftPt.x, leftPt.y);
    rec.ok(`5. up again (${r5a.up}); a roll or jump lowers it (${r5b.why}); the next right press raises it again (press: ${r5c.press && r5c.press.kind})`,
      r5a.up && !r5b.up && r5c.up && r5c.press && r5c.press.kind === 'shield', { r5a, r5b, r5c });
    await P.page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await P.page.waitForTimeout(400);
    const r5d = await look(P, leftPt.x, leftPt.y);
    rec.ok('5. ...and leaving the window lowers it', !r5d.up && !r5d.mouse, r5d);

    /* ── 6. the controls list ── */
    const row = await P.page.evaluate(() => {
      const r = [...document.querySelectorAll('.bt-desk-keys .bt-desk-key')].find((e) => ((e.querySelector('kbd') || {}).textContent || '').trim() === 'R-Click');
      const sp = r && r.querySelector('span');
      return sp ? { w: sp.textContent, cut: sp.scrollWidth > sp.clientWidth + 1, sw: sp.scrollWidth, cw: sp.clientWidth } : null;
    });
    rec.ok(`6. the controls list says R-Click "${row && row.w}", not cut short`, !!row && row.w === 'Shield \u2195' && !row.cut, row);

    /* ── 7. a snowman near: the guard faces it ── */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
    await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
    await P.page.waitForTimeout(2500);
    let r7 = null, sm = null;
    for (let k = 0; k < 4 && !(r7 && r7.ok); k++) {
      sm = await P.page.evaluate(() => {
        const S = window._gameState.current, p = S.player;
        return (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0))
          .map((m) => ({ x: m.x, y: m.y, d: Math.hypot(m.x - p.x, m.y - p.y) })).sort((a, b) => a.d - b.d)[0] || null;
      });
      if (!sm) { await P.page.waitForTimeout(2000); continue; }
      const me7 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      if (sm.d > 110) { await H.hopTo(P, sm.x + (me7.x - sm.x) * 90 / sm.d, sm.y + (me7.y - sm.y) * 90 / sm.d, { tries: 40 }).catch(() => {}); await P.page.waitForTimeout(500); }
      const me8 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      /* the pointer the other way from the snowman */
      const away = Math.atan2(me8.y - sm.y, me8.x - sm.x);
      const ap = await pagePoint(P, me8.x + Math.cos(away) * 170, me8.y + Math.sin(away) * 170);
      await P.page.mouse.move(ap.x, ap.y, { steps: 3 });
      await P.page.waitForTimeout(300);
      await rightClick(P);
      await P.page.waitForTimeout(500);
      const l = await look(P, ap.x, ap.y);
      const toMon = await P.page.evaluate(() => {
        const S = window._gameState.current, p = S.player;
        const m = (S.monsters || []).filter((x) => x && x.alive !== false && (x.curHp == null || x.curHp > 0))
          .map((x) => ({ a: Math.atan2(x.y - p.y, x.x - p.x), d: Math.hypot(x.x - p.x, x.y - p.y) })).sort((a, b) => a.d - b.d)[0];
        return m || null;
      });
      r7 = { ...l, toMon, ok: l.up && !!toMon && angGap(l.ang, toMon.a) < 0.5 && angGap(l.ang, l.ptr) > 1.5 };
      if (!r7.ok && l.up) { await rightClick(P); await P.page.waitForTimeout(400); }
    }
    rec.ok(`7. a snowman near (${r7 && r7.toMon && Math.round(r7.toMon.d)} px): the guard faces it (${r7 && r7.ang && r7.ang.toFixed(2)} vs ${r7 && r7.toMon && r7.toMon.a.toFixed(2)}), not the pointer held the other way (${r7 && r7.ptr.toFixed(2)})`,
      !!r7 && r7.ok, r7);
    rec.ok('8. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
