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
 *   5. (v2.3.3973) a sword in hand and no lock chosen: once a snowman is
 *      inside your melee reach the same reticle, softer, stands on it (the
 *      owner: "Whenever a monster first comes in range for melee attack this
 *      same reticle should appear too"), and walked out of reach it goes --
 *      it was 5. "a sword's automatic lock wears no reticle";
 *   2b. (v2.3.3973) the lock's reticle is thin (a 1 px line), roomier, and
 *      grows and shrinks slowly by its scale ("a thin larger line that grows
 *      and shrinks while on target");
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
    /* ── 2b. v2.3.3973: thin, roomier, pulsing by its scale ── */
    const scales = [];
    for (let i = 0; i < 8; i++) { const q = await look(P); if (q.ret && q.ret.shown) scales.push(q.ret.scale); await P.page.waitForTimeout(230); }
    const spread = scales.length ? Math.max(...scales) - Math.min(...scales) : 0;
    rec.ok(`2b. the lock's reticle is a thin line (${r2.ret && r2.ret.line} px, rim ${r2.ret && r2.ret.rim}), full strength (${r2.ret && r2.ret.alpha}), roomier (${r2.ret && r2.ret.hw}x${r2.ret && r2.ret.hh}), and grows and shrinks (scale ${Math.min(...scales)}..${Math.max(...scales)})`,
      !!r2.ret && r2.ret.mode === 'lock' && r2.ret.line <= 1 && r2.ret.rim <= 0.5 && r2.ret.alpha === 1 && r2.ret.hw >= 34
      && scales.length >= 6 && spread >= 0.04 && scales.every((v) => v >= 0.9 && v <= 1.1), { ret: r2.ret, scales });

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

    /* ── 5. v2.3.3973: a sword in hand, no lock chosen: the reticle on what is in reach ── */
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
    await P.page.evaluate(() => { window._gameState.current.lockedTarget = null; });
    const near = await snowmen(P);
    const tgt = near[0];
    const ring = () => P.page.evaluate(() => (window.__btReachRing ? window.__btReachRing() : null));
    /* walked up to it: inside the reach the softer reticle stands on it */
    const cur = tgt ? (await snowmen(P)).find((m) => m.id === tgt.id) || tgt : null;
    if (cur) await H.hopTo(P, cur.x + 40, cur.y + 10, { tries: 40 }).catch(() => {});
    const r5b = await H.waitFor(P, () => (window.__btLockReticle ? window.__btLockReticle() : null), (v) => !!(v && v.shown && v.mode === 'reach'),
      { timeout: 8000, label: 'the in-reach reticle' }).catch(() => null);
    const rr = await ring();
    await shot(P, '5-reach');
    rec.ok(`5. a sword in hand, no lock chosen: walked up to a snowman, inside your melee reach the same reticle, softer, stands on a monster in reach (${JSON.stringify(r5b)}; the reach ring says ${rr ? (rr.inReach ? 'in reach' : 'out of reach') : '-'})`,
      !!r5b && r5b.shown && r5b.mode === 'reach' && r5b.alpha < 1 && r5b.line <= 1, { r5b, rr });
    /* and out of reach again it goes */
    const cur2 = tgt ? (await snowmen(P)).find((m) => m.id === tgt.id) || tgt : null;
    if (cur2) await H.hopTo(P, cur2.x + 520, cur2.y + 60, { tries: 40 }).catch(() => {});
    const r5c = await H.waitFor(P, () => (window.__btLockReticle ? window.__btLockReticle() : null), (v) => !!(v && !v.shown),
      { timeout: 8000, label: 'the reticle gone out of reach' }).catch(() => null);
    /* (out of reach is the snowmen's spread apart: a spot "far" from one can be
       in reach of another, so "none in reach" is read here, walked away) */
    rec.ok(`5. ...and walked out of reach it goes (${JSON.stringify(r5c)})`, !!r5c && !r5c.shown, r5c);
    rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
