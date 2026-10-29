/* ═══ THE LOCK YOU CHOSE WEARS A RETICLE (v2.3.3876) ═══
 *
 * The owner, playtesting on a computer: "Show some kind of lock on reticle if
 * you double click a monster to lock on. Right now it's unclear that your aim
 * is locked on to a monster."
 *
 * A computer (1280 x 800, the wide layout) at Frost Ridge's first snowmen,
 * Playwright's real mouse:
 *   1. a bow in hand, nothing locked: no reticle;
 *   2. a double click on a snowman locks it (src 'tap') and four corner
 *      brackets stand round it (window.__btLockReticle: shown, its id), the
 *      box centred on the snowman;
 *   3. it follows: a second later the box is still centred on the snowman,
 *      wherever it walked;
 *   4. a click on empty ground lets the lock go, and the reticle with it;
 *   5. a sword's AUTOMATIC lock on the nearest snowman wears no reticle (the
 *      chip alone, as before): the brackets say "you chose this";
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/lockreticle-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const WIDE = { width: 1280, height: 800 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `lockreticle-${name}.png`) }); } catch (e) { /* a picture only */ } };

const pagePoint = (P, wx, wy) => P.page.evaluate(([x, y]) => {
  const S = window._gameState.current;
  const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
  const px = cv.left + (x - S.camera.x) * S._worldScaleX, py = cv.top + (y - S.camera.y) * S._worldScaleY;
  const top = document.elementFromPoint(px, py);
  return { x: Math.round(px), y: Math.round(py), canvas: !!(top && top.classList && top.classList.contains('brotown-canvas')) };
}, [wx, wy]);
const snowmen = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, p = S.player;
  return (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0) && m.home === 'frost')
    .map((m) => ({ id: String(m.id), x: Math.round(m.x), y: Math.round(m.y), d: Math.round(Math.hypot(m.x - p.x, m.y - p.y)) }))
    .sort((a, b) => a.d - b.d);
});
/* the reticle, the lock, and where the locked snowman is drawn */
const look = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, lt = S.lockedTarget, m = lt && lt.ref;
  return {
    ret: window.__btLockReticle ? window.__btLockReticle() : null,
    lock: lt ? { id: lt.id != null ? String(lt.id) : null, src: lt.src || null, type: lt.type } : null,
    mon: m ? { x: Math.round(m.renderX != null ? m.renderX : m.x), y: Math.round(m.renderY != null ? m.renderY : m.y) } : null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Lockret', wsPort, webPort, viewport: WIDE, world: 'wheel', wide: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 150000, label: 'into the world' }).catch(() => null);
    await H.closeNpcDialogue(P).catch(() => {});
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
    await H.armWorker(P, wsPort, me, ['bow']).catch(() => []);
    await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged').catch(() => null);
    await P.page.evaluate(() => { window.__btProbe = true; });
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
    await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
    await P.page.waitForTimeout(2000);
    await P.page.evaluate(() => { window._gameState.current.lockedTarget = null; });
    await P.page.waitForTimeout(500);

    /* ── 1. nothing locked: no reticle ── */
    const r1 = await look(P);
    rec.ok('1. a bow in hand, nothing locked: no reticle', !r1.lock && !!r1.ret && !r1.ret.shown, r1);

    /* ── 2. a double click on a snowman ── */
    const ms = await snowmen(P);
    const mb = ms.find((m) => m.d < 520) || ms[0];
    const onIt = mb ? await P.page.evaluate((mid) => {
      const S = window._gameState.current;
      const q = (S.monsters || []).find((z) => z && String(z.id) === mid);
      return q ? { x: q.x, y: q.y - 28 } : null;
    }, mb.id) : null;
    const pb = onIt ? await pagePoint(P, onIt.x, onIt.y) : null;
    if (pb) await P.page.mouse.dblclick(pb.x, pb.y, { delay: 40 });
    await P.page.waitForTimeout(800);
    const r2 = await look(P);
    await shot(P, '2-locked');
    const centred = (r) => !!(r.ret && r.ret.shown && r.mon) && Math.abs(r.ret.cx - r.mon.x) <= 3 && r.ret.cy < r.mon.y && r.ret.cy > r.mon.y - 120;
    rec.ok(`2. a double click on a snowman (${mb && mb.id}, ${mb && mb.d} px) locks it (${JSON.stringify(r2.lock)}) and the brackets stand round it (${JSON.stringify(r2.ret)})`,
      !!pb && pb.canvas && !!r2.lock && r2.lock.id === mb.id && r2.lock.src === 'tap' && !!r2.ret && r2.ret.shown && r2.ret.id === mb.id && centred(r2), { r2, pb });

    /* ── 3. it follows ── */
    await P.page.waitForTimeout(1500);
    const r3 = await look(P);
    rec.ok(`3. a second and a half later the box is still on the snowman (box ${r3.ret && r3.ret.cx},${r3.ret && r3.ret.cy}; snowman ${r3.mon && r3.mon.x},${r3.mon && r3.mon.y}; it moved ${r2.mon && r3.mon ? Math.round(Math.hypot(r3.mon.x - r2.mon.x, r3.mon.y - r2.mon.y)) : '?'} px)`,
      !!r3.lock && r3.lock.id === mb.id && centred(r3), { r3 });

    /* ── 4. a click on empty ground lets it go ── */
    const here = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const away = mb ? { x: here.x - (mb.x - here.x) * 0.6, y: here.y - (mb.y - here.y) * 0.6 + 40 } : { x: here.x - 150, y: here.y + 60 };
    const pe = await pagePoint(P, away.x, away.y);
    await P.page.mouse.click(pe.x, pe.y);
    await P.page.waitForTimeout(800);
    const r4 = await look(P);
    await shot(P, '4-released');
    rec.ok(`4. a click on empty ground (${pe.canvas ? 'the world' : 'NOT the world'}) lets the lock go, and the reticle with it`,
      pe.canvas && !r4.lock && !!r4.ret && !r4.ret.shown, { r4, pe });

    /* ── 5. a sword's automatic lock: no reticle ── */
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
    const near = await snowmen(P);
    if (near[0] && near[0].d > 150) await H.hopTo(P, near[0].x + 90, near[0].y + 30, { tries: 40 }).catch(() => {});
    const auto = await H.waitFor(P, (S) => (S.lockedTarget ? S.lockedTarget.src || null : null), (v) => v === 'auto',
      { timeout: 12000, label: 'an automatic lock' }).catch(() => null);
    const r5 = await look(P);
    await shot(P, '5-auto');
    rec.ok(`5. a sword's automatic lock on the nearest snowman (${JSON.stringify(r5.lock)}) wears no reticle (the chip alone)`,
      auto === 'auto' && !!r5.lock && r5.lock.src === 'auto' && !!r5.ret && !r5.ret.shown, r5);
    rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
