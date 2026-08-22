/* THE SHIELD ON THE BACK, AND THE LAYERING THAT KILLED IT (v2.3.1782).
 *
 * Owner: "quite long ago, there was a build that let the player wear the
 * shield on his back (just aesthetic only) while jogging and standing.  I
 * think it was removed because it kept bumping into layering issues with how
 * mirroring works ... Maybe it involves cloning the shield on one side only."
 *
 * v2.3.377 removed it for exactly that reason.  So the property under test is
 * not "a shield is drawn" — it is the Z-ORDER, at every facing, which is the
 * thing that kept breaking.  A screenshot cannot see child order and a
 * "shield is visible" assertion passes against every version of the bug, so
 * this reads the child indices out of the display list directly.
 *
 * The fix is structural: two sprites at fixed positions in the child list
 * (Lo before the body, Hi after the arms), and picking a facing only toggles
 * `visible`.  The assertions below are therefore INVARIANTS, not a table of
 * expected values — loIdx < bodyIdx and hiIdx > armIdx must hold at all eight
 * facings, in both poses, no matter what else the renderer did that frame.
 *
 * MEASURED BASELINE (local player, pine shield equipped):
 *     loIdx 0, bodyIdx 2, armIdx 25, hiIdx 26   (indices are stable)
 *     facings E/SE/S/SW/W -> behind (Lo shown)
 *     facings NW/N/NE     -> in front (Hi shown)
 *     jog lean at E +0.15 rad, at W -0.15 rad   (opposite, as a lean must be)
 *
 * FALSIFIED: reverting to the single-sprite v2.3.377 path (one sprite
 * reindexed per frame) fails the exclusivity assertion outright — there is
 * only one sprite, so `behind` and `front` can never disagree — and dropping
 * the E/W lean sign fails the last pair.
 */
import * as H from './harness.mjs';

const BEHIND = [0, 1, 2, 3, 4];         /* E, SE, S, SW, W — in front only when you see his back */
const NAMES = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

async function face(P, idx) {
  await P.page.evaluate((i) => {
    const S = window._gameState.current;
    S._facingAngle = i * Math.PI / 4;
    S._aimAngle = undefined;
    S.lockedMonster = null;
  }, idx);
  await P.page.waitForTimeout(320);
  return P.page.evaluate(() => window.__btBackShield || null);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Shieldy', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* Equip a shield.  The render path only tests truthiness of rpg.shield;
     the art is the same pine PNG triplet the in-hand block uses. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.shield = { name: 'Pine Shield', type: 'shield', gearBase: 'pine' };
    S._shieldUp = false;
    S._bashPose = null;
  });
  await P.page.waitForTimeout(600);

  const first = await face(P, 2);
  rec.ok('the back shield renders at all', !!(first && first.on), { probe: first });
  if (!first) { await P.ctx.close().catch(() => {}); return; }

  /* GUARD: the two clones really are two distinct sprites at fixed places.
     Without this the invariants below are satisfied by any single sprite that
     happens to sit in the right half of the list. */
  rec.ok('there are two clones, and the body and arm sit between them (guard)',
    first.loIdx < first.bodyIdx && first.bodyIdx < first.armIdx && first.armIdx < first.hiIdx,
    { loIdx: first.loIdx, bodyIdx: first.bodyIdx, armIdx: first.armIdx, hiIdx: first.hiIdx });

  /* ── the invariant, at all eight facings ── */
  const seen = [];
  for (let i = 0; i < 8; i++) {
    const m = await face(P, i);
    seen.push({ f: NAMES[i], behind: m.behind, front: m.front, lo: m.loIdx, body: m.bodyIdx, arm: m.armIdx, hi: m.hiIdx });

    rec.ok(`${NAMES[i]}: the facing under test is the one that rendered (guard)`,
      m.facingIdx === i, { asked: i, got: m.facingIdx });
    rec.ok(`${NAMES[i]}: exactly one clone is drawn`,
      (m.behind ? 1 : 0) + (m.front ? 1 : 0) === 1, { behind: m.behind, front: m.front });
    rec.ok(`${NAMES[i]}: the behind-clone can never reach over the body`,
      m.loIdx < m.bodyIdx, { loIdx: m.loIdx, bodyIdx: m.bodyIdx });
    rec.ok(`${NAMES[i]}: the front-clone can never fall under the arm`,
      m.hiIdx > m.armIdx, { hiIdx: m.hiIdx, armIdx: m.armIdx });
    rec.ok(`${NAMES[i]}: drawn on the side the camera says it should be`,
      m.behind === BEHIND.includes(i), { behind: m.behind, expectedBehind: BEHIND.includes(i) });
  }
  console.log('    facings', JSON.stringify(seen));

  /* HELD BEATS SLUNG.  This is the v2.3.1735 bug in the old single-sprite
     version: a posed shield fell down the on-back z-rule and vanished into
     the torso.  Both clones must go dark the moment it is in hand. */
  await P.page.evaluate(() => { window._gameState.current._shieldUp = true; });
  await P.page.waitForTimeout(400);
  const held = await P.page.evaluate(() => window.__btBackShield || null);
  rec.ok('raising the shield hides both back clones',
    held && !held.on && !held.behind && !held.front, { probe: held });
  /* v2.3.1805: "in hand" is now either renderer.  Facing NW/N/NE the shield is
     held on the FAR side of the body, and under the block stand-in the only
     sprite that can sit behind that body is the stand-in's own lower clone —
     the display's shield lives in a different container and cannot be ordered
     against it.  So the invariant is that it is drawn in hand by ONE of the
     two, not that this particular sprite is the one doing it. */
  rec.ok('...and the in-hand shield is the one drawing instead',
    !!(held && (held.heldVisible || held.heldByStandIn)),
    { heldVisible: held && held.heldVisible, heldByStandIn: held && held.heldByStandIn });
  await P.page.evaluate(() => { window._gameState.current._shieldUp = false; });
  await P.page.waitForTimeout(400);

  /* THE LEAN IS A LEAN.  Mirroring flips the artwork, not the direction the
     shield tilts on screen (pixi applies scale before rotation), so E and W
     must lean OPPOSITE ways.  Correcting the rotation by the mirror flag —
     the intuitive move, and one I made first — makes these two equal. */
  const leans = {};
  for (const i of [0, 4]) {
    await face(P, i);
    await P.page.keyboard.down(i === 0 ? 'KeyD' : 'KeyA');
    await P.page.waitForTimeout(700);
    const m = await P.page.evaluate(() => window.__btBackShield || null);
    await P.page.keyboard.up(i === 0 ? 'KeyD' : 'KeyA');
    leans[NAMES[i]] = m ? { pose: m.pose, rotation: m.rotation, mirror: m.mirror } : null;
    await P.page.waitForTimeout(400);
  }
  console.log('    leans', JSON.stringify(leans));
  const e = leans.E, w = leans.W;
  rec.ok('the jog pose is what was measured (guard)',
    !!(e && w && e.pose === 'jog' && w.pose === 'jog'), { E: e, W: w });
  if (e && w && e.pose === 'jog' && w.pose === 'jog') {
    rec.ok('east and west lean opposite ways, despite one being mirrored',
      Math.sign(e.rotation) === -Math.sign(w.rotation) && Math.abs(e.rotation) > 0.05,
      { east: e.rotation, west: w.rotation, eastMirrored: e.mirror, westMirrored: w.mirror });
  }

  /* ── v2.3.1784: THE ATTACK STAND-INS ───────────────────────────────
     Owner: "make sure the shield layering works when using all attack
     animations and armor combos."

     It did not.  During a swing or a bow shot the real body is HIDDEN and the
     whole figure is redrawn by effectsRenderer in a different layer, but
     `pose` stays 'stand'/'jog' the whole time — so the v2.3.1782 shield kept
     drawing in the player container against a body that was not there.
     Measured before the fix: mid-swing the walking probe read on:true,
     front:true with the body sprite hidden.  A shield hanging in the air
     beside the swing.

     Two properties now, and both are needed: the walking pair must LEAVE when
     a stand-in takes over, and the stand-in's own pair must ARRIVE.  Testing
     only one of them passes against "the shield vanished when you attack",
     which is the other way to get this wrong. */
  /* ── PIN FROM INSIDE THE PAGE, EVERY FRAME ──
     A one-shot evaluate cannot hold a facing.  _facingAngle is SLEWED toward
     its target by the game's own frame loop, so a value poked once is
     overwritten before the next render: instrumenting the resolver showed
     src:"facingAngle" with aim already at 3.927 (northwest) and fa still at
     -2.76 — mid-slew, rounding to west.  That is why NW failed on some armour
     combos and not others while always reporting west; nothing about the
     armour mattered, it was a race.
     So the pin lives in a rAF inside the page and re-stamps every frame, the
     same shape mp-blockstance settled on.  It also re-arms the swing window,
     which is short enough to lapse while we wait. */
  await P.page.evaluate(() => {
    window.__pinA = { i: 0, kind: 'sword', on: false };
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      const p = window.__pinA;
      if (S && p && p.on) {
        const a = p.i * Math.PI / 4;
        S._facingAngle = a; S._aimAngle = a; S._mouseAimAngle = a;
        S._shieldKb = false; S.lockedMonster = null;
        if (S.player) { S.player.vx = 0; S.player.vy = 0; }
        if (p.kind === 'sword') { S.isSwinging = true; S.swingTimer = Date.now(); S._swingAng = a; }
        else { S._bowShotAt = Date.now(); S._bowShotAng = a; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const attack = async (idx, kind) => {
    await P.page.evaluate(({ i, k }) => { window.__pinA.i = i; window.__pinA.kind = k; window.__pinA.on = true; },
      { i: idx, k: kind });
    /* Wait for the PROBE, not for the state: _renderFacing reaching the target
       is not the same event as the shield being PLACED at it. */
    const want = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'][idx];
    const t0 = Date.now();
    for (;;) {
      const f = await P.page.evaluate(() => (window.__btStandInShield && window.__btStandInShield.facing) || null);
      if (f === want) break;
      if (Date.now() - t0 > 5000) break;      /* let the assertion report it */
      await P.page.waitForTimeout(70);
    }
    await P.page.waitForTimeout(120);
    return P.page.evaluate(() => ({
      why: (() => { const S = window._gameState.current; return {
        src: S._facingSrc, rf: S._renderFacing, aim: S._aimAngle, ma: S._mouseAimAngle,
        fa: S._facingAngle, vx: S.player && S.player.vx, vy: S.player && S.player.vy,
        shieldUp: !!S._shieldUp, sw: !!S.isSwinging }; })(),
      standIn: window.__btStandInShield || null,
      walk: window.__btBackShield || null,
    }));
  };

  /* Armour combos.  chest and legs are the only equippable plate (gearCatalog),
     and each draws its OWN sprite inside the stand-in stack — which is exactly
     what the two clones have to stay outside of. */
  const COMBOS = [
    ['bare', 'none', 'none'],
    ['chest only', 'copperplate', 'none'],
    ['legs only', 'none', 'coppergreaves'],
    ['full copper', 'copperplate', 'coppergreaves'],
  ];
  /* Every stand-in size measured, so the constancy assertion at the end has
     the whole matrix rather than one facing's word for it. */
  const sizeLog = [];
  for (const [label, chest, legs] of COMBOS) {
    await P.page.evaluate(({ c, l }) => {
      window.__btSetGear && window.__btSetGear('chest', c);
      window.__btSetGear && window.__btSetGear('legs', l);
    }, { c: chest, l: legs });
    await P.page.waitForTimeout(400);

    for (const kind of ['sword', 'bow']) {
      for (const [fname, fidx] of [['N', 6], ['NE', 7], ['NW', 5], ['S', 2], ['E', 0]]) {
        const r = await attack(fidx, kind);
        const tag = `${kind} ${fname}, ${label}`;
        const si = r.standIn;

        rec.ok(`${tag}: the walking pair steps aside for the stand-in`,
          !!(r.walk && r.walk.on === false && r.walk.standIn === true),
          { walkOn: r.walk && r.walk.on, standInFlag: r.walk && r.walk.standIn });

        rec.ok(`${tag}: the stand-in draws the shield instead`,
          !!(si && si.on && (si.behind || si.front)), { standIn: si });
        if (!si) continue;

        /* The invariants, inside the stand-in's own stack this time. */
        rec.ok(`${tag}: behind-clone stays under the body`,
          si.loIdx < si.bodyIdx, { loIdx: si.loIdx, bodyIdx: si.bodyIdx });
        rec.ok(`${tag}: front-clone stays over the weapon`,
          si.hiIdx > si.weaponIdx, { hiIdx: si.hiIdx, weaponIdx: si.weaponIdx });
        /* THE ARMOUR CLAIM: every worn plate sprite sits BETWEEN the two
           clones, so no combination of them can land on the wrong side. */
        rec.ok(`${tag}: the armour layers sit between the two clones`,
          si.loIdx < si.chestIdx && si.chestIdx < si.hiIdx
          && si.loIdx < si.legsIdx && si.legsIdx < si.hiIdx,
          { lo: si.loIdx, chest: si.chestIdx, legs: si.legsIdx, hi: si.hiIdx });
        rec.ok(`${tag}: exactly one clone is drawn`,
          (si.behind ? 1 : 0) + (si.front ? 1 : 0) === 1, { behind: si.behind, front: si.front });
        rec.ok(`${tag}: on the side the camera says`,
          si.behind === !(fidx === 5 || fidx === 6 || fidx === 7),
          { behind: si.behind, facing: si.facing, why: r.why });
        /* ═══ v2.3.1807: IN FRONT MEANS IN FRONT OF HIS HEAD TOO ═══
           Owner: "the character swinging north northeast and northwest has his
           beard, hat, and maybe other items that are still layering in front
           of the shield (should be behind it)."
           Facing away, the shield on his back is between the camera and ALL of
           him.  It only showed on the head because the trait sprites are added
           to the node layer AFTER both stand-ins' clones (v2.3.867) — a
           build-order default that is right everywhere except here.
           The armour claim above cannot catch this: the plate sits between the
           clones by construction, and the traits are a separate set added
           later.  Asserted only in FRONT mode, because behind-mode wants the
           opposite and would fail this by design. */
        if (!si.behind) {
          rec.ok(`${tag}: the front-clone covers the hat and beard as well`,
            si.traitIdx >= 0 && si.hiIdx > si.traitIdx,
            { hiIdx: si.hiIdx, traitIdx: si.traitIdx });
        } else {
          rec.ok(`${tag}: ...and behind him, the traits stay on top where they belong`,
            si.traitIdx >= 0 && si.loIdx < si.traitIdx,
            { loIdx: si.loIdx, traitIdx: si.traitIdx });
        }
        /* ═══ SAME OBJECT, SAME SIZE ═══
           A shield that resized on attack reads as a different shield.
           BACK_SHIELD_PX is 72, scaled by the stand-in's body height.

           v2.3.1837: THE BAND WAS RECALIBRATED, and it is worth saying why
           rather than just moving a number.  It used to be 55..90 and two
           facings sat outside it (N 92.03, S 90.16) — a standing failure
           nobody had chased.  The cause was the bug v2.3.1836 fixed: the
           stand-in was sized by (221-33)*dirScale, south's crown/feet rows
           times a scale built to CANCEL per-facing height differences, so
           the body height it produced varied 16% by facing and drifted off
           whatever this band was first tuned against.
           With the stand-in now sized by each sheet's own measured rows,
           _swordBodyH equals the WALKING body's rendered height exactly —
           (feet - crown + 1) is the painted height, so painted * dirScale is
           the real figure — and every facing lands on 90.2..90.7.  The
           shield-to-body ratio is unchanged at 86%; only the absolute size
           moved, because the body underneath it was wrong before.
           So the band moves up to cover the corrected size, and the real
           assertion is the new one below it: the size is now CONSTANT, which
           is a far stronger claim than any band. */
        rec.ok(`${tag}: it is still the same size shield`,
          si.sizePx > 55 && si.sizePx < 110, { sizePx: si.sizePx });
        sizeLog.push({ tag, sizePx: si.sizePx });
      }
      await P.page.evaluate(() => {
        const S = window._gameState.current;
        S.isSwinging = false; S.swingTimer = 0; S._bowShotAt = 0;
      });
      await P.page.waitForTimeout(500);
    }
  }
  await P.page.evaluate(() => {
    window.__btSetGear && window.__btSetGear('chest', 'none');
    window.__btSetGear && window.__btSetGear('legs', 'none');
  });

  await P.page.screenshot({ path: 'tools/qa/mp/out/backshield.png' }).catch(() => {});
  await P.ctx.close().catch(() => {});
  /* ═══ v2.3.1837: ONE SIZE ACROSS THE WHOLE MATRIX ═══
     Five facings x two stand-ins x four armour combos.  Before v2.3.1836 the
     stand-in's body height varied 16% by facing, so this could not have been
     asserted at all; now it can, and it is the assertion that would catch a
     regression in the sizing the band above is too loose to see. */
  if (sizeLog.length) {
    const v = sizeLog.map((x) => x.sizePx);
    const lo = Math.min(...v), hi = Math.max(...v);
    const spread = (hi - lo) / ((hi + lo) / 2);
    rec.ok('the slung shield is one size across every facing, stand-in and armour combo',
      spread < 0.01,
      { spreadPct: +(spread * 100).toFixed(2), lo: +lo.toFixed(2), hi: +hi.toFixed(2),
        n: sizeLog.length,
        smallest: sizeLog.find((x) => x.sizePx === lo),
        largest: sizeLog.find((x) => x.sizePx === hi) });
  }

}
