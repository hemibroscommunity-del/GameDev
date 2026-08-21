/* The south idle blade, photographed. (v2.3.1839)
 *
 * Owner: "South idle the sword is in front of the characters face.  Angle
 * south sword just a bit so it's not over the face."
 *
 * SOUTH_IDLE_TILT already exists (v2.3.1821b set it to -0.18) so this is a
 * question of how much further, and that is not answerable from the constant.
 * This pins the south idle with a greatsword in hand and photographs it
 * clipped to the player, so the overlap can be measured off the frame the
 * player actually sees instead of reasoned about from an angle in radians.
 */
import * as H from './harness.mjs';
import fsMod from 'fs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Southy', wsPort, webPort,
    viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* Face south and stay there — _facingAngle is slewed, so pin from a rAF. */
  await P.page.evaluate(() => {
    window.__pinS = true;
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      if (S && window.__pinS) {
        S._facing = 'south'; S._facingAngle = Math.PI / 2; S._renderFacing = 'south';
        S._targetFacingAngle = Math.PI / 2;
        S.rpg.activeSlot = 'melee';
        S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' };
        if (S.player) { S.player.vx = 0; S.player.vy = 0; }
        S._shieldUp = false; S.autoAttack = false; S.isSwinging = false;
      }
      if (window.__pinS) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await P.page.waitForTimeout(1500);

  const w = await P.page.evaluate(() => window.__btWeapon || null);
  rec.ok('the south idle blade is drawn (guard)',
    !!(w && w.visible && w.texW > 0 && w.facing === 'south'), w);
  rec.ok('...and it is the idle tilt, not a swing (guard)',
    !!(w && Math.abs(w.rotation) > 0 && Math.abs(w.rotation) < 1), { rotation: w && w.rotation });

  /* SWEEP.  __btSouthTilt overrides the constant per frame, so one build
     photographs every candidate and the choice is made by looking rather than
     by reasoning about a sign the code comments already call the easy thing to
     get wrong. */
  const SWEEP = (process.env.BT_TILT_SWEEP || '').split(',').map(Number).filter((n) => !isNaN(n));
  const shots = SWEEP.length ? SWEEP : [];
  for (const t of shots) {
    await P.page.evaluate((v) => { window.__btSouthTilt = v; }, t);
    await P.page.waitForTimeout(500);
    try {
      fsMod.mkdirSync('tools/qa/mp/out', { recursive: true });
      const clip = await P.page.evaluate(() => {
        const b = window.__btBlockPose, cv = document.querySelector('canvas');
        if (!cv) return null;
        const r = cv.getBoundingClientRect();
        const cx = r.left + (b && b.screen ? b.screen.x : r.width / 2);
        const cy = r.top + (b && b.screen ? b.screen.y : r.height / 2);
        const SZ = 110;
        return { x: Math.max(0, cx - SZ / 2), y: Math.max(0, cy - SZ * 0.68), width: SZ, height: SZ };
      });
      const tag = String(t).replace('.', 'p').replace('-', 'm');
      await P.page.screenshot({ path: `tools/qa/mp/out/tilt-${tag}.png`, ...(clip ? { clip } : {}) });
    } catch (e) { /* the assertions are the test */ }
  }
  await P.page.evaluate(() => { delete window.__btSouthTilt; });
  await P.page.waitForTimeout(400);

  /* ═══ DOES THE BLADE CROSS HIS FACE? ═══
     Segment (grip -> tip) against the head box, because the blade's AABB
     covers the head whenever the sword leans and would condemn every angle.
     Liang-Barsky: the fraction of the segment inside the box, clipped per
     axis; no intersection leaves the interval empty. */
  const crosses = (blade, head) => {
    if (!blade || !head) return null;
    let t0 = 0, t1 = 1;
    const dx = blade.tx - blade.gx, dy = blade.ty - blade.gy;
    const p = [-dx, dx, -dy, dy];
    const q = [blade.gx - head.x0, head.x1 - blade.gx,
      blade.gy - head.y0, head.y1 - blade.gy];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; continue; }
      const r = q[i] / p[i];
      if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return t0 <= t1;
  };

  const measure = async (tilt) => {
    await P.page.evaluate((v) => { window.__btSouthTilt = v; }, tilt);
    await P.page.waitForTimeout(420);
    const w2 = await P.page.evaluate(() => window.__btWeapon || null);
    return { tilt, blade: w2 && w2.blade, head: w2 && w2.head,
      hits: crosses(w2 && w2.blade, w2 && w2.head) };
  };

  const cur = await measure(-0.18);
  rec.ok('the geometry probe reported a blade and a head (guard)',
    !!(cur.blade && cur.head), cur);
  /* GUARD THE GUARD: the first version of this computed a "tip" that landed
     on the grip — a 6.7px stub that crosses nothing, so every clearance check
     would have passed by measuring a blade that was not there.  A greatsword
     on screen is tens of pixels long. */
  rec.ok('...and the blade has a real length, not a stub at the grip',
    !!(cur.blade && cur.blade.len > 20), { len: cur.blade && cur.blade.len });
  /* THE CONTROL, asserted rather than remembered: the value that shipped
     really does put the blade across his face.  Without this the check below
     could pass on a probe that never intersects anything. */
  rec.ok('the OLD tilt (-0.18) does put the blade across his face',
    cur.hits === true, cur);

  const now = await measure(null);
  await P.page.evaluate(() => { delete window.__btSouthTilt; });
  await P.page.waitForTimeout(420);
  const shipped = await P.page.evaluate(() => window.__btWeapon || null);
  const shippedHit = crosses(shipped && shipped.blade, shipped && shipped.head);
  rec.ok('the SHIPPED tilt keeps the blade clear of his face',
    shippedHit === false,
    { rotation: shipped && shipped.rotation, blade: shipped && shipped.blade,
      head: shipped && shipped.head });

  rec.ok('the tilt constant is reported for the record',
    !!(w && typeof w.rotation === 'number'), { SOUTH_IDLE_TILT: w && w.rotation });
}
