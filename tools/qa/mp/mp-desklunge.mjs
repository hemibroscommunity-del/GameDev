/* ═══ A COMPUTER'S SWORD CLICK LUNGES, AS A PHONE'S PRESS DOES (v2.3.3694) ═══
 *
 * The owner, testing the desktop version, 2026-10-28: "The melee needs the
 * "zoom to attack monster" behavior that exists on phones when you get close
 * enough."
 *
 * A computer (1280 x 800, a mouse), in the world, against a real worker, at
 * Frost Ridge's first snowmen, the dev kit's greatsword in hand, god mode on:
 *   1. a snowman locked by the game itself (nothing clicked), a real left
 *      click on empty ground lunges at it: the dash leaves for that monster,
 *      the press's ordinary swing is skipped (the lunge's strike is the hit),
 *      the worker lands it (the snowman's HP falls), and the click that ends
 *      the press leaves the lock on it, a deliberate one now (`src: 'tap'`);
 *   2. off cooldown again, a click ON a snowman lunges at THAT one, and its
 *      click keeps the lock; a second click on it keeps it too (on the build
 *      before, a click on the monster you were locked onto toggled it off);
 *   3. inside the lunge's cooldown a click swings as it always did, no dash;
 *   4. the bow in hand, a click near a snowman shoots and never lunges;
 *   5. no page errors.
 */
import * as H from './harness.mjs';

const DESK = { width: 1280, height: 800 };
const PRESS_MS = 90;

/* the snowmen near you, nearest first */
const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, p = S.player;
  return (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0) && m.home === 'frost')
    .map((m) => ({ id: String(m.id), x: Math.round(m.x), y: Math.round(m.y), hp: m.curHp, d: Math.round(Math.hypot(m.x - p.x, m.y - p.y)) }))
    .sort((a, b) => a.d - b.d);
});
/* a world point on the page (mp-deskclick's pagePoint) */
const pagePoint = (P, wx, wy) => P.page.evaluate(([x, y]) => {
  const S = window._gameState.current;
  const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
  const px = cv.left + (x - S.camera.x) * S._worldScaleX, py = cv.top + (y - S.camera.y) * S._worldScaleY;
  const top = document.elementFromPoint(px, py);
  return { x: Math.round(px), y: Math.round(py), canvas: !!(top && top.classList && top.classList.contains('brotown-canvas')) };
}, [wx, wy]);
/* what the press did, watched every frame from before it: the dash and its
   target, the swing's clock, the lock */
const watch = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const w = { dash: null, swing0: S.swingTimer || 0, swung: false, frames: 0 };
  window.__dlWatch = w;
  const tick = () => {
    if (window.__dlWatch !== w) return;
    w.frames++;
    if (S._bashDash && !w.dash) w.dash = { target: S._bashDash.targetId != null ? String(S._bashDash.targetId) : null };
    if ((S.swingTimer || 0) !== w.swing0) w.swung = true;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const readWatch = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, w = window.__dlWatch || {};
  window.__dlWatch = null;
  const lt = S.lockedTarget;
  const st = window.__btAbilityStatus ? window.__btAbilityStatus('sworddash') : null;
  return { dash: w.dash, swung: !!w.swung, frames: w.frames, lock: lt ? { type: lt.type, id: lt.id != null ? String(lt.id) : null, src: lt.src || null } : null,
    cd: st ? st.cdLeft : null, press: window.__btDeskPress ? window.__btDeskPress.kind : null };
});
const hpOf = (P, id) => P.page.evaluate((mid) => {
  const m = (window._gameState.current.monsters || []).find((q) => q && String(q.id) === mid);
  return m ? m.curHp : null;
}, id);
const lungeReady = (P) => H.waitFor(P, () => (window.__btAbilityStatus ? window.__btAbilityStatus('sworddash') : null),
  (st) => !!st && st.visible && st.equipped && st.afford && st.cdLeft === 0, { timeout: 15000, label: 'the lunge ready' }).catch(() => null);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Deskblade', wsPort, webPort, viewport: DESK, touch: false, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading, desk: !!S._isDesktop }),
      (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world on a computer (guard)', !!inW && inW.desk, inW);
    if (!inW || !inW.desk) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
    await H.devOp(wsPort, 'kit', me, { what: 'weapons' }).catch(() => {});
    await P.page.waitForTimeout(1500);
    const eq = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    await P.page.evaluate(() => { window.__btProbe = true; });
    const armed = await H.readState(P, (S) => ({ slot: S.rpg && S.rpg.activeSlot, weapon: !!(S.rpg && S.rpg.weapon), type: S.rpg && S.rpg.weapon && S.rpg.weapon.type }));
    rec.ok(`a greatsword in hand (guard): ${JSON.stringify(armed)}`, armed.slot === 'melee' && armed.weapon, { armed, eq });
    if (!armed.weapon) return;

    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
    await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
    await P.page.waitForTimeout(1500);
    let ms = await near(P);
    rec.ok(`at Frost Ridge's first snowmen (${ms.length} near)`, ms.length >= 2, ms.slice(0, 4));
    if (ms.length < 2) return;

    /* ── 1 ── the game's own lock, a click on empty ground */
    const m1 = ms[0];
    await H.hopTo(P, m1.x, m1.y + 170, { tries: 30 });
    const auto = await H.waitFor(P, (S) => {
      const lt = S.lockedTarget;
      return lt && lt.type === 'monster' ? { id: String(lt.id), src: lt.src || null } : null;
    }, (v) => !!v && v.src === 'auto', { timeout: 10000, label: 'the game locks a snowman' }).catch(() => null);
    await lungeReady(P);
    const t1 = auto ? auto.id : m1.id;
    const hp1 = await hpOf(P, t1);
    /* empty ground: on the far side of you from the snowman, 120 px off */
    const me1 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const emptyPt = await pagePoint(P, me1.x - 110, me1.y + 70);
    await watch(P);
    await P.page.mouse.click(emptyPt.x, emptyPt.y, { delay: PRESS_MS });
    await P.page.waitForTimeout(700);
    const r1 = await readWatch(P);
    let hp1b = hp1;
    for (let i = 0; i < 20 && hp1b === hp1; i++) { await P.page.waitForTimeout(200); hp1b = await hpOf(P, t1); }
    rec.ok(`1. the game's own lock (${auto ? auto.src : 'none'}), a click on empty ground (${emptyPt.canvas ? 'the canvas' : 'NOT the canvas'}, press: ${r1.press}) lunges at it: the dash left for ${r1.dash && r1.dash.target} (the lock's ${t1})`,
      !!auto && emptyPt.canvas && r1.press === 'attack' && !!r1.dash && r1.dash.target === t1, { auto, r1, emptyPt });
    rec.ok(`1. ...the worker lands it (the snowman's HP ${hp1} -> ${hp1b}), and the lunge is on its cooldown (${r1.cd} ms)`,
      typeof hp1 === 'number' && typeof hp1b === 'number' && hp1b < hp1 && r1.cd > 0, { hp1, hp1b, cd: r1.cd });
    rec.ok(`1. ...and the click that ended the press kept the lock on it, a deliberate one now (${JSON.stringify(r1.lock)})`,
      !!r1.lock && r1.lock.id === t1 && r1.lock.src === 'tap', r1.lock);

    /* ── 3 ── inside the cooldown a click swings, no dash */
    const r3pt = await pagePoint(P, me1.x - 110, me1.y + 70);
    await watch(P);
    await P.page.mouse.click(r3pt.x, r3pt.y, { delay: PRESS_MS });
    await P.page.waitForTimeout(500);
    const r3 = await readWatch(P);
    rec.ok(`3. inside the lunge's cooldown a click swings as before, no dash (${JSON.stringify({ dash: r3.dash, swung: r3.swung, cd: r3.cd })})`,
      !r3.dash && r3.press === 'attack' && r3.swung, r3);

    /* ── 2 ── a click ON a snowman: the lunge goes to the one clicked */
    await lungeReady(P);
    ms = await near(P);
    const cur = await H.readState(P, (S) => (S.lockedTarget && S.lockedTarget.id != null ? String(S.lockedTarget.id) : null));
    const m2 = ms.find((m) => m.id !== cur && m.d < 420) || ms[0];
    const hp2 = await hpOf(P, m2.id);
    const onIt = await P.page.evaluate((mid) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((q) => q && String(q.id) === mid);
      return m ? { x: m.x, y: m.y - 28 } : null;
    }, m2.id);
    const onPt = onIt ? await pagePoint(P, onIt.x, onIt.y) : null;
    await watch(P);
    if (onPt) await P.page.mouse.click(onPt.x, onPt.y, { delay: PRESS_MS });
    await P.page.waitForTimeout(700);
    const r2 = await readWatch(P);
    let hp2b = hp2;
    for (let i = 0; i < 20 && hp2b === hp2; i++) { await P.page.waitForTimeout(200); hp2b = await hpOf(P, m2.id); }
    rec.ok(`2. a click ON a snowman (${m2.id}, ${m2.d} px off; the lock was ${cur}) lunges at THAT one (the dash left for ${r2.dash && r2.dash.target}), and the worker lands it (HP ${hp2} -> ${hp2b})`,
      !!onPt && onPt.canvas && !!r2.dash && r2.dash.target === m2.id && typeof hp2b === 'number' && hp2b < hp2, { r2, onPt, m2 });
    rec.ok(`2. ...and the click keeps the lock on it (${JSON.stringify(r2.lock)})`,
      !!r2.lock && r2.lock.id === m2.id, r2.lock);

    /* ── 2b ── a second click on the monster you are locked onto (inside the
       cooldown: a swing) keeps the lock; on the build before, that click
       toggled it off (the click's "tap same = unlock") */
    const again = await P.page.evaluate((mid) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((q) => q && String(q.id) === mid && q.alive !== false);
      return m ? { x: m.x, y: m.y - 28 } : null;
    }, m2.id);
    const againPt = again ? await pagePoint(P, again.x, again.y) : null;
    await watch(P);
    if (againPt) await P.page.mouse.click(againPt.x, againPt.y, { delay: PRESS_MS });
    await P.page.waitForTimeout(500);
    const r2b = await readWatch(P);
    rec.ok(`2b. a second click on the snowman you are locked onto keeps the lock, a deliberate one (${JSON.stringify(r2b.lock)}); the build before toggled it off`,
      !!againPt && !!r2b.lock && r2b.lock.id === m2.id && r2b.lock.src === 'tap', { r2b, againPt });

    /* ── 4 ── the bow never lunges */
    const bow = await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged').catch(() => null);
    await P.page.waitForTimeout(800);
    const slot4 = await H.readState(P, (S) => S.rpg && S.rpg.activeSlot);
    ms = await near(P);
    const m4 = ms[0];
    const at4 = m4 ? await P.page.evaluate((mid) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((q) => q && String(q.id) === mid);
      return m ? { x: m.x, y: m.y - 28 } : null;
    }, m4.id) : null;
    const pt4 = at4 ? await pagePoint(P, at4.x, at4.y) : null;
    await watch(P);
    if (pt4) await P.page.mouse.click(pt4.x, pt4.y, { delay: PRESS_MS });
    await P.page.waitForTimeout(700);
    const r4 = await readWatch(P);
    rec.ok(`4. the bow in hand (${slot4}), a click on a snowman never lunges (${JSON.stringify({ dash: r4.dash, press: r4.press })})`,
      slot4 === 'ranged' && !!pt4 && !r4.dash && r4.press === 'attack', { r4, bow });

    rec.ok('5. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
