/* Does the slung shield layer the same during a SPECIAL as a normal swing?
 * (v2.3.1834)
 *
 * Owner: "Also during special attacks the shield does not obey layering."
 *
 * WHAT THIS FOUND, which is not a bug: the layering is the same.  Recorded
 * because the investigation cost real time and the next person should not
 * repeat it.
 *
 * Two suspicions were tested and both were wrong.  The first was structural —
 * the stand-in BODY is chosen by S._swordSwingDir while _placeStandInShield
 * decides front-or-behind from S._renderFacing, two pieces of state deciding
 * one picture.  They do differ (aiming southeast draws the east sheet) but
 * only because the body sheets are 4-way and shared by mirroring, and the
 * shield's own 8-way choice is right in every case.  The second was visual: a
 * contact sheet of all eight facings LOOKED like the greatsword lay across
 * the shield face on NW/N/NE.  At 5x it does not — the hilt and hand are
 * behind the shield and only the part of the blade that extends past its
 * silhouette shows, which is correct.  A 130px thumbnail is not evidence.
 *
 * The index dump settles it: in front mode the shield clone sits at 22 with
 * body 5, weapon 4, chest 6, legs 7, traits 21 under it.  _specialAttack is
 * not read by _placeStandInShield at all.
 *
 * ONE TRAP FOR WHOEVER READS THIS NEXT.  The v2.3.1807 lift moves the front
 * clone above the traits and never moves it back, so whichever pass runs
 * FIRST shows the un-lifted indices and the second inherits the lift.  Run
 * the special pass first and it looks like a special-only bug; run it second
 * and it looks like a normal-swing-only bug.  It is neither.  This file runs
 * special first deliberately and asserts the two passes AGREE, which is the
 * shape that cannot be fooled by the ordering.
 */
import * as H from './harness.mjs';
import fsMod from 'fs';

const DIRS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Spec', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg && !S.rpg.shield) S.rpg.shield = { id: 'wood-shield', name: 'Pine Shield', type: 'shield' };
  });

  /* Pin from a rAF: _facingAngle is slewed by the game loop, so a value
     written from evaluate() is gone before the next draw. */
  await P.page.evaluate(() => {
    window.__sp = { i: 0, on: false, special: true };
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      const p = window.__sp;
      if (S && p && p.on) {
        const a = p.i * Math.PI / 4;
        S._facingAngle = a; S._aimAngle = a; S._mouseAimAngle = a;
        S.lockedMonster = null; S._shieldUp = false;
        if (S.player) { S.player.vx = 0; S.player.vy = 0; }
        S.isSwinging = true; S.swingTimer = Date.now(); S._swingAng = a;
        S._specialAttack = !!p.special;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const sample = async (idx, special) => {
    await P.page.evaluate(({ i, sp }) => { window.__sp.i = i; window.__sp.special = sp; window.__sp.on = true; },
      { i: idx, sp: special });
    const want = DIRS[idx];
    const t0 = Date.now();
    for (;;) {
      const f = await P.page.evaluate(() => (window.__btStandInShield && window.__btStandInShield.facing) || null);
      if (f === want) break;
      if (Date.now() - t0 > 5000) break;
      await P.page.waitForTimeout(70);
    }
    await P.page.waitForTimeout(120);
    if (process.env.BT_SPEC_SHOTS) {
      try {
        fsMod.mkdirSync('tools/qa/mp/out', { recursive: true });
        const clip = await P.page.evaluate(() => {
          const cv = document.querySelector('canvas');
          const S = window._gameState.current;
          const er = window.__btStandInShield;
          if (!cv || !S) return null;
          const r = cv.getBoundingClientRect();
          const SZ = 130;
          return { x: Math.max(0, r.left + r.width / 2 - SZ / 2),
                   y: Math.max(0, r.top + r.height / 2 - SZ * 0.62), width: SZ, height: SZ, _er: !!er };
        });
        await P.page.screenshot({ path: `tools/qa/mp/out/spec-${special ? 'S' : 'N'}-${want}.png`, ...(clip ? { clip } : {}) });
      } catch (e) {}
    }
    return P.page.evaluate(() => window.__btStandInShield || null);
  };

  const rows = [];
  /* SPECIAL FIRST — see the ordering trap in the header. */
  for (const mode of [true, false]) {
    for (let i = 0; i < DIRS.length; i++) {
      const r = await sample(i, mode);
      rows.push({ want: DIRS[i], special: mode, r });
    }
  }

  const get = (want, special) => (rows.find((x) => x.want === want && x.special === special) || {}).r;
  rec.ok('both passes measured every facing (guard)',
    rows.length === DIRS.length * 2 && rows.every((x) => x.r && x.r.on),
    { n: rows.length, missing: rows.filter((x) => !(x.r && x.r.on)).map((x) => `${x.special ? 'S' : 'N'}:${x.want}`) });
  rec.ok('the special pass really had the special flag set (guard)',
    rows.filter((x) => x.special).every((x) => x.r && x.r.special === true),
    rows.filter((x) => x.special).map((x) => `${x.want}=${x.r && x.r.special}`));

  for (const d of DIRS) {
    const S = get(d, true), N = get(d, false);
    if (!S || !N) continue;
    /* THE ASSERTION THAT MATTERS: a special must not change which side of the
       body the shield is drawn on.  Comparing the two passes rather than
       checking each against a hardcoded expectation is what makes this immune
       to the one-way lift above — both passes inherit the same lift state by
       the time they are compared, so a real divergence is the only thing that
       can separate them. */
    rec.ok(`${d}: a special draws the shield on the same side as a normal swing`,
      S.behind === N.behind && S.front === N.front,
      { special: { behind: S.behind, front: S.front }, normal: { behind: N.behind, front: N.front } });
    /* And the contract itself, under the special: facing away the shield is
       nearest the camera and must beat every part of him; facing toward it is
       on his back and must lose to all of them. */
    const parts = [S.bodyIdx, S.weaponIdx, S.chestIdx, S.legsIdx, S.traitIdx].filter((v) => typeof v === 'number' && v >= 0);
    if (S.front) {
      rec.ok(`${d}: ...and in front mode it covers his body, weapon, armour and traits`,
        parts.every((v) => S.hiIdx > v), { hiIdx: S.hiIdx, parts, S });
    } else {
      rec.ok(`${d}: ...and in behind mode it stays under his body, weapon and armour`,
        [S.bodyIdx, S.weaponIdx, S.chestIdx, S.legsIdx].filter((v) => v >= 0).every((v) => S.loIdx < v),
        { loIdx: S.loIdx, parts, S });
    }
  }
}
