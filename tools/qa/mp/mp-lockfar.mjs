/* ═══ NO LOCK ON A MONSTER ACROSS THE MAP (v2.3.3486) ═══
 *
 * The owner, after more play: "You can get stuck targeted to a monster way
 * across the map."  game/targeting.js lockTooFar drops ANY monster lock --
 * tapped or automatic, every weapon -- past LOCK_FAR_PX (1,700), or after
 * LOCK_UNDRAWN_MS (1.5 s) off the circle the renderer draws monsters in (the
 * view's half-diagonal + 400), in a zone that culls far monsters (the Wheel).
 *
 * On a phone in the Wheel's BroTown, a bow in hand (a bow's tap lock is never
 * released by range otherwise -- its 675 px snipe needs that), with stand-in
 * monsters placed in S.monsters round you so nothing else moves them:
 *   1. a bow's tap lock 500 px off (inside the drawn circle) is kept for 3 s;
 *   2. one past the drawn circle but inside 1,700 px is kept at first, then
 *      dropped 'far' about 1.5 s later;
 *   3. one 2,200 px off is dropped 'far' at once;
 *   4. a sword's lock the ATTACK press promoted is latched (`near`), so it is
 *      released once the monster is past the 275 px ring like any sword lock;
 *   5. no page errors.
 */
import * as H from './harness.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* a stand-in monster at (dx, dy) from the player, locked by a tap */
const place = (P, dx, dy, id, src) => P.page.evaluate(({ dx, dy, id, src }) => {
  const S = window._gameState.current;
  S.monsters = S.monsters || [];
  const m = { id, alive: true, curHp: 50, maxHp: 50, hp: 50, x: S.player.x + dx, y: S.player.y + dy,
    renderX: S.player.x + dx, renderY: S.player.y + dy, type: 'slime', arch: 'slime', level: 1, zone: S.currentZone };
  S.monsters.push(m);
  S.lockedTarget = { type: 'monster', id, ref: m, src: src || 'tap' };
  S._lockDroppedWhy = null;
  return { at: Date.now(), view: { w: S._viewW, h: S._viewH } };
}, { dx, dy, id, src });
const lock = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, lt = S.lockedTarget;
  return { id: lt ? lt.id : null, why: S._lockDroppedWhy || null, near: !!(lt && lt.near), src: lt ? lt.src : null };
});
const unplace = (P, id) => P.page.evaluate((id) => {
  const S = window._gameState.current;
  S.monsters = (S.monsters || []).filter((m) => m.id !== id);
  if (S.lockedTarget && S.lockedTarget.id === id) S.lockedTarget = null;
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Locker', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'kit', myId, { what: 'weapons' });
    await P.page.waitForTimeout(1200);
    const eq = await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged');
    await P.page.waitForTimeout(800);
    rec.ok('a bow in hand (guard)', !!eq.ok && await H.readState(P, (S) => S.rpg && S.rpg.activeSlot === 'ranged'), eq);

    /* ── 1. a snipe inside the drawn circle is kept ── */
    const v = await place(P, 500, 0, 'qa-near', 'tap');
    await P.page.waitForTimeout(3000);
    const l1 = await lock(P);
    rec.ok(`a bow's tap lock 500 px off is kept (3 s later: ${l1.id || 'none'}, ${l1.why || 'not dropped'})`, l1.id === 'qa-near', { l1, view: v.view });
    await unplace(P, 'qa-near');

    /* ── 2. off the drawn circle, inside 1,700: dropped about 1.5 s later ── */
    const R = await P.page.evaluate(() => { const S = window._gameState.current; return Math.hypot(S._viewW, S._viewH) / 2 + 400; });
    const off = Math.min(1600, Math.round(R + 150));
    await place(P, 0, -off, 'qa-undrawn', 'tap');
    await P.page.waitForTimeout(500);
    const l2a = await lock(P);
    const t2 = Date.now();
    const l2b = await H.waitFor(P, (S) => ({ id: S.lockedTarget ? S.lockedTarget.id : null, why: S._lockDroppedWhy || null }),
      (x) => x.id !== 'qa-undrawn', { timeout: 6000, label: 'undrawn lock dropped' }).catch(() => null);
    const took = Date.now() - t2 + 500;
    rec.ok(`a lock ${off} px off (past the drawn circle, ${Math.round(R)} px) is kept at first, then dropped 'far' about 1.5 s later (${took} ms)`,
      R < 1700 && l2a.id === 'qa-undrawn' && !!l2b && l2b.why === 'far' && took >= 1200 && took <= 4500, { l2a, l2b, R, off, took });
    await unplace(P, 'qa-undrawn');

    /* ── 3. 2,200 px off: dropped at once ── */
    await place(P, 2200, 0, 'qa-far', 'tap');
    const l3 = await H.waitFor(P, (S) => ({ id: S.lockedTarget ? S.lockedTarget.id : null, why: S._lockDroppedWhy || null }),
      (x) => x.id !== 'qa-far', { timeout: 3000, label: 'far lock dropped' }).catch(() => null);
    rec.ok("a lock 2,200 px off is dropped 'far' at once", !!l3 && l3.why === 'far', l3);
    await unplace(P, 'qa-far');

    /* ── 4. a sword's promoted lock is latched ── */
    const src = readFileSync(join(H.REPO, 'src/ui/BroTown.jsx'), 'utf8');
    const promo = /S\.lockedTarget = \{ type: 'monster', id: _lt\.id, ref: _lt\.ref, src: 'tap', near: true \}/.test(src);
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
    await P.page.waitForTimeout(800);
    await place(P, 150, 0, 'qa-promo', 'tap');
    await P.page.evaluate(() => { const S = window._gameState.current; if (S.lockedTarget) S.lockedTarget.near = true; });
    await P.page.waitForTimeout(400);
    const held = await lock(P);
    await P.page.evaluate(() => { const S = window._gameState.current; const m = S.monsters.find((q) => q.id === 'qa-promo'); if (m) { m.x += 300; m.renderX = m.x; } });
    const l4 = await H.waitFor(P, (S) => ({ id: S.lockedTarget ? S.lockedTarget.id : null, why: S._lockDroppedWhy || null }),
      (x) => x.id !== 'qa-promo', { timeout: 4000, label: 'promoted lock released' }).catch(() => null);
    rec.ok("the ATTACK press's promotion carries the latch (near), and a latched sword lock is released past the 275 px ring",
      promo && held.id === 'qa-promo' && !!l4 && l4.why === 'range', { promo, held, l4 });
    await unplace(P, 'qa-promo');

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
