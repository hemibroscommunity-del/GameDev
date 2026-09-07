/* WHICH SIDE OF THE BODY THE IDLE BOW IS ON (v2.3.2325).
 *
 * Three of the eight facings are not drawn from their own art: west is a
 * mirrored east, northwest a mirrored northeast, and SOUTHEAST A MIRRORED
 * SOUTHWEST (entityRenderer's MIRROR_SCREEN_DIR).  The body sprite carries the
 * flip in its scale.x; the held weapon does not -- it is a sibling container,
 * positioned from a hand anchor that entityRenderer mirrors by hand
 * (`const ax = mirror ? (SHEET_W - hand[0]) : hand[0]`).
 *
 * So the mirror is applied to the weapon in a DIFFERENT place from the body,
 * by different code, and nothing was checking that the two agree.  If that one
 * expression is ever dropped, the body turns round and the bow does not: the
 * character faces southeast holding the bow on the southwest side, out of the
 * wrong hand, and every screenshot of the other seven facings still looks
 * right.
 *
 * v2.3.2322 made this worth pinning: the idle bow now goes BEHIND the body on
 * the near diagonals, with a 6px outward nudge at SW and NE so a strip of limb
 * still shows.  Owner, in order: "Southwest and southeast bow idle position
 * don't have the correct layer placement for weapon relative to body", then
 * "the correct look should be partial occlusion of the weapon behind the
 * players body", then "Southwest the upper handle of the bow should be behind
 * the body", then "northeast the body should mostly hide the bow".  Four
 * messages about one rule, which is a rule worth a test.
 *
 * READ THE NOTE IN THE BODY before adding a mirror assertion here.  The
 * obvious one -- "a facing and its mirror put the bow on opposite sides" --
 * is false by design, and the first cut of this file shipped it and got two
 * red lines out of a correct build.
 */
import * as H from './harness.mjs';

const NAMES = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

async function face(P, idx) {
  await P.page.evaluate((i) => {
    const S = window._gameState.current;
    S._facingAngle = i * Math.PI / 4; S._aimAngle = i * Math.PI / 4;
    S.lockedTarget = null; S.isSwinging = false; S.swingTimer = 0; S.autoAttack = false;
    S._shieldUp = false;
  }, idx);
  await P.page.waitForTimeout(280);
  /* Re-assert the bow right before reading: the worker is authoritative for
     equipment and its player_state delta clears a client-side assignment
     within about a second (the trap mp-swordcarry records). */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'ranged';
    S.rpg.rangedWeapon = { name: 'Pine Bow', type: 'bow', gearBase: 'wood', dmg: 3 };
  });
  await P.page.waitForTimeout(160);
  return P.page.evaluate(() => window.__btWeapon || null);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const first = await face(P, 2);
  rec.ok('the held bow is drawn at all (guard)', !!(first && first.visible), { probe: first });
  if (!first) { await P.ctx.close().catch(() => {}); return; }
  rec.ok('the bow art resolved, so the numbers below are about a real sprite (guard)',
    first.texW > 0 && first.texH > 0, { texW: first.texW, texH: first.texH });

  const at = {};
  for (let i = 0; i < 8; i++) {
    const m = await face(P, i);
    at[NAMES[i]] = m ? { x: m.x, wcIdx: m.wcIdx, bodyIdx: m.spriteBodyIdx, facing: m.facing } : null;
  }
  console.log('    bow x by facing: ' + JSON.stringify(at));

  /* ═══ WHAT THIS FILE DOES *NOT* ASSERT, AND WHY ═══
     The first cut of this scenario asserted that the three mirrored pairs put
     the bow on OPPOSITE screen sides, on the reasoning that southeast is drawn
     as a mirrored southwest so everything about it should be mirrored too.
     Two of the three pairs failed -- and the assertion was wrong, not the
     renderer.  Measured: E -3.01 / W +4.72 (opposite), NE +14.42 / NW +11.37
     (same side), SW -15.84 / SE -11.81 (same side).

     The mechanism is `getAnchor` (playerAnchors.js:90): on a mirrored facing
     it deliberately reads the OTHER hand's anchor -- `entry.l` instead of
     `entry.r` -- before the caller mirrors the x.  So a mirrored render does
     not merely flip the weapon across the body, it moves it to the other
     hand, which is what keeps the bow in the forward hand on both sides of a
     diagonal.  Whether the two land on the same screen side after that is
     decided by where the two hands sit in the sheet, and on the diagonals
     both hands are on the same side of the figure's centre.

     So "mirrored pairs are on opposite sides" is a rule that was never true
     and was never meant to be, and a test asserting it would fail a correct
     build for as long as anyone left it in.  The numbers are still printed
     above, because they are the fastest way to see a real mirror break (E/W
     going same-sign would be one); they are not an assertion.

     What IS pinned below is v2.3.2322's actual claim, which the owner did
     report and which one edit to a nudge table could undo. */
  for (const [a, b] of [['E', 'W'], ['NE', 'NW'], ['SW', 'SE']]) {
    rec.ok(`${a}/${b}: both facings rendered, so the layer checks below mean something (guard)`,
      !!(at[a] && at[b]), { [a]: at[a], [b]: at[b] });
  }

  /* v2.3.2322's own claim, restated here so a change to the nudge cannot
     quietly undo the layering it was added to serve: the idle bow is in FRONT
     of the body at east and south only, and behind it everywhere else. */
  const FRONT = new Set(['E', 'S']);
  for (const n of NAMES) {
    const m = at[n];
    if (!m) continue;
    const want = FRONT.has(n);
    rec.ok(`${n}: the idle bow is ${want ? 'in front of' : 'behind'} the body`,
      (m.wcIdx > m.bodyIdx) === want,
      { wcIdx: m.wcIdx, bodyIdx: m.bodyIdx, expectedInFront: want });
  }

  const threw = P.logs.filter((l) => /entityRenderer threw|pageerror/.test(l));
  rec.ok('no renderer system threw while turning with the bow out', threw.length === 0, threw);

  await P.ctx.close().catch(() => {});
}
