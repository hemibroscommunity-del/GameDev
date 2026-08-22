/* THE WEAPON IN THE OFF HAND WHILE BLOCKING (v2.3.1864).
 *
 * Owner: "When the character is blocking I want to see what it looks like for
 * the equipped weapon to be visible in the off hand (the hand that's back).
 * Can you put it there?"
 *
 * Two things this has to prove, and neither is readable off a screenshot at
 * the size a phone draws the bro:
 *
 *   1. THE WEAPON IS IN THE OTHER HAND.  "Off hand" only means anything
 *      relative to the shield hand, so the assertion is a DISTANCE between two
 *      published points — the shield's and the weapon's — not "the weapon
 *      exists".  A weapon parked on top of the shield would pass every
 *      is-it-drawn check ever written.
 *   2. IT IS ON THE FIGURE.  Same trap the away-facing shield fell into
 *      (v2.3.1833): a placement that looks plausible in a probe can still be
 *      sitting on the feet or a body-width off to one side.  So the point is
 *      bounded against the drawn figure's own height and centre, which the
 *      stand-in publishes.
 *
 * The shots at the end are the deliverable the owner actually asked for —
 * "I want to see what it looks like" — one per facing, at every weapon type.
 */
import * as H from './harness.mjs';

const IDX = { E: 0, SE: 1, S: 2, SW: 3, W: 4, NW: 5, N: 6, NE: 7 };
const FACING_OF = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

async function pin(P, k) {
  await P.page.evaluate((kk) => { window.__pin.k = kk; window.__pin.on = true; }, k);
  /* Wait for the FRAME, not the clock — the guard angle slews over several
     frames, so a fixed sleep reads the previous facing's numbers (the bug that
     made mp-blockstance blame the caret for a facing it had not reached). */
  const want = FACING_OF[k];
  const t0 = Date.now();
  for (;;) {
    const b = await P.page.evaluate(() => window.__btBlockPose || null);
    if (b && b.facing === want) break;
    if (Date.now() - t0 > 4000) break;
    await P.page.waitForTimeout(80);
  }
  await P.page.waitForTimeout(140);
}

const probe = (P) => P.page.evaluate(() => ({
  off: window.__btBlockOffHand || null,
  pose: window.__btBlockPose || null,
  behind: window.__btBlockShieldBehind || null,
}));

/* Where the SHIELD is, in world coordinates, whichever renderer drew it.  The
   two placements live in different containers (see entityRenderer's v2.3.1805
   note) and publish in different spaces: the display's sprite is local to the
   player, the away-facing clone is already world.  Collapsing that here is
   what lets one assertion cover all eight facings. */
function shieldWorld(p) {
  /* WHICH RENDERER DREW IT THIS FRAME, from the pose probe — not from whether
     the away-facing probe happens to hold a value.  It used to be the latter,
     and the away-facing probe was never cleared, so after one north block
     every later facing was measured against a shield that had not been drawn
     for several seconds: a west block came back with the sword "aimed through
     the guard" and the guard 60px from where it said.  (v2.3.1864 clears the
     probe too, but reading the flag is what makes this correct either way.) */
  if (!p.pose) return null;
  if (p.pose.shieldBehind && p.behind) return { x: p.behind.x, y: p.behind.y };
  if (p.pose.shieldSpriteVisible && p.off) {
    return { x: p.off.bodyX + p.pose.shieldX, y: p.off.bodyFootY + p.pose.shieldY };
  }
  return null;
}

async function setWeapon(P, w) {
  await P.page.evaluate((ww) => {
    const S = window._gameState.current;
    S.rpg.activeSlot = ww.slot;
    if (ww.slot === 'melee') S.rpg.weapon = ww.item;
    else if (ww.slot === 'staff') S.rpg.staffWeapon = ww.item;
    else S.rpg.rangedWeapon = ww.item;
  }, w);
  await P.page.waitForTimeout(220);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Guard', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.shield = { name: 'Pine Shield', type: 'shield' };
    S.rpg.activeSlot = 'melee';
    S.rpg.weapon = { type: 'greatsword', name: 'Copper Greatsword', gearBase: 'copper', dmg: 5 };
    /* Re-stamped from a rAF inside the page: the movement system rewrites
       vx/vy every frame and several paths clear _shieldUp, and _shieldKb / the
       mouse aim silently re-derive the guard angle if only the derived value
       is poked (mp-blockstance records both traps). */
    window.__pin = { k: 0, on: false };
    const tick = () => {
      const S2 = window._gameState.current;
      if (S2 && window.__pin.on) {
        S2._shieldUp = true;
        S2._shieldKb = false;
        S2._mouseAimAngle = window.__pin.k * Math.PI / 4;
        S2._facingAngle = window.__pin.k * Math.PI / 4;
        S2._aimAngle = window.__pin.k * Math.PI / 4;
        S2._shieldAngle = window.__pin.k * Math.PI / 4;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* ── 0. the control: the weapon is hidden when the shield is DOWN ──
     Not a formality.  Every assertion below is about a sprite that only this
     version draws, so if the probe were somehow left over from another path
     they would all pass against a frame that never had a block in it. */
  await P.page.evaluate(() => { window.__pin.on = false; window._gameState.current._shieldUp = false; });
  await P.page.waitForTimeout(500);
  const down = await probe(P);
  rec.ok('shield DOWN: nothing is drawn in the off hand', !(down.off && down.off.on), down.off);

  /* ── 1. every stand-in facing puts the weapon in a hand ── */
  const STANDIN = ['E', 'SE', 'SW', 'W', 'NW', 'N', 'NE'];
  const seen = [];
  for (const n of STANDIN) {
    await pin(P, IDX[n]);
    const p = await probe(P);
    rec.ok(`${n}: the off-hand weapon is drawn`, !!(p.off && p.off.on), p.off);
    if (!p.off || !p.off.on) continue;
    seen.push({ n, ...p.off });

    rec.ok(`${n}: ...as the equipped weapon, not a stand-in default`,
      p.off.type === 'greatsword', p.off);
    /* THE HILT IS IN THE HAND.  handles.json has no bare `greatsword` key, so
       this silently fell through to a bottom-centre pivot at first and hung
       the blade off the chest at an angle the table never asked for — and the
       x/y it reported stayed perfectly plausible throughout.  A position check
       cannot catch a wrong pivot; this can. */
    rec.ok(`${n}: ...pivoting on its grip, not its frame's bottom edge`,
      p.off.gripped === true, { gripped: p.off.gripped, anchor: [p.off.anchorX, p.off.anchorY] });
    /* ...AND AS THE SWORD IT IS.  A greatsword's neutral icon is Sword1.webp —
       the bamboo pole — so falling back to it would have a bro carrying a
       copper greatsword raise his shield and be holding a gold stick, swapping
       on the frame the block starts.  `posed` says the per-facing held art
       resolved, which is the same art he was carrying a moment earlier. */
    rec.ok(`${n}: ...drawn with the per-facing held art, not the bamboo fallback`,
      p.off.posed === true, { artDir: p.off.artDir, posed: p.off.posed });

    /* ON THE FIGURE.  bodyH is the drawn crown-to-foot height, so these are
       body-relative and stay true whatever the zone scale is. */
    const dx = Math.abs(p.off.x - p.off.bodyX);
    const dy = p.off.bodyFootY - p.off.y;
    rec.ok(`${n}: ...within a body-width of the figure's centre`,
      dx < p.off.bodyH * 0.85, { dx, bodyH: p.off.bodyH });
    rec.ok(`${n}: ...and up at chest height, not on the feet or over the head`,
      dy > p.off.bodyH * 0.25 && dy < p.off.bodyH * 1.15, { dy, bodyH: p.off.bodyH });

    /* THE OTHER HAND.  The whole request is a two-hand statement, so it needs
       a measurement against the SHIELD, not just "a weapon is drawn" — one
       parked on top of the shield would satisfy every bound above. */
    const sh = shieldWorld(p);
    rec.ok(`${n}: the shield's position is published too (so the gap is measurable)`, !!sh, p);
    if (sh) {
      const gap = Math.hypot(p.off.x - sh.x, p.off.y - sh.y);
      /* NORTH IS GENUINELY CLOSE, and this is an art fact rather than a
         threshold picked to go green.  Facing straight away from the camera
         the bow pose is foreshortened: the grip hand sits at [100,100] of the
         frame and the string hand at [82,113] — 22px apart on a sheet whose
         figure is 188 tall, so no placement in the real hand can be far from
         the shield.  Every other facing spreads the arms wide. */
      const near = (n === 'N');
      const need = p.off.bodyH * (near ? 0.08 : 0.30);
      rec.ok(`${n}: ...and the weapon is in the OTHER hand, clear of the shield`,
        gap > need, { gap, bodyH: p.off.bodyH, need, foreshortened: near });
    }

    /* Away facings hold it on the far side of the torso; camera facings in
       front of the chest.  That choice IS the z-order on this path, so it is
       worth its own line rather than being implied by a position. */
    const wantBehind = (n === 'NW' || n === 'N' || n === 'NE');
    rec.ok(`${n}: drawn ${wantBehind ? 'behind' : 'in front of'} the body`,
      !!p.off.behind === wantBehind, { clone: p.off.clone, behind: p.off.behind });
  }

  /* MIRRORED FACINGS ARE NOT COPIES.  west is the east sheet flipped, so its
     weapon must land on the opposite side of the body — if the mirror were
     dropped from the placement the two would sit at the same offset and this
     is the only thing that would notice. */
  const e = seen.find((x) => x.n === 'E'), w = seen.find((x) => x.n === 'W');
  rec.ok('east and west both reported (mirror check)', !!(e && w), { e: !!e, w: !!w });
  if (e && w) {
    rec.ok('a mirrored facing holds the weapon on the mirrored side',
      Math.sign(e.x - e.bodyX) === -Math.sign(w.x - w.bodyX),
      { east: e.x - e.bodyX, west: w.x - w.bodyX });
  }

  /* ── 1b. THE AIM TABLE POINTS THE BLADE OUT OF THE GUARD ──
     Only for the NEUTRAL icons (sword, staff), and that limit is the point: a
     greatsword and a bow resolve to art that is already posed for the facing,
     so their blade direction is the artist's decision and not this code's —
     asserting it would be testing a drawing.  BLOCK_OFFHAND.aim IS this code's
     decision, so it is the one worth pinning.
     The bar is 60 degrees off the bearing to the shield rather than "pointing
     away at all": the shield is drawn LOW — centre near the ankles, its 72px
     face reaching the chest — so the line from a chest-height grip to it runs
     diagonally down at every facing, and any blade swept down out of the
     silhouette sits within 90 degrees of that line. */
  await setWeapon(P, { slot: 'melee', item: { type: 'sword', name: 'Copper Sword', gearBase: 'copper', dmg: 3 } });
  for (const n of ['E', 'SW', 'W', 'NW', 'N']) {
    await pin(P, IDX[n]);
    const p = await probe(P);
    const sh = p.off && p.off.on ? shieldWorld(p) : null;
    rec.ok(`${n}: the neutral icon is drawn and measurable`, !!(p.off && p.off.on && sh && !p.off.posed), p.off);
    if (!sh || !p.off || !p.off.on) continue;
    const bearing = Math.atan2(sh.y - p.off.y, sh.x - p.off.x);
    const dot = Math.cos(p.off.aim - bearing);
    rec.ok(`${n}: ...and its blade is not aimed through the guard (>60 deg off it)`,
      dot < 0.5, { aim: p.off.aim, bearing, dot, degOff: +(Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI).toFixed(1),
        gripX: p.off.x, gripY: p.off.y, shX: +sh.x.toFixed(1), shY: +sh.y.toFixed(1), bodyX: p.off.bodyX,
        poseShieldX: p.pose && p.pose.shieldX, poseShieldY: p.pose && p.pose.shieldY, viaBehind: !!p.behind, poseFacing: p.pose && p.pose.facing, sheet: p.off.sheet });
  }
  await setWeapon(P, { slot: 'melee', item: { type: 'greatsword', name: 'Copper Greatsword', gearBase: 'copper', dmg: 5 } });

  /* ── 2. SOUTH IS HONESTLY EMPTY ──
     A south block is not the stand-in at all (v2.3.1805: the bow south body
     sheet is holed through the face), so there is no measured hand to put a
     weapon in.  Pinned as the DECISION, so a later change to it is loud
     instead of looking like the feature quietly half-working. */
  await pin(P, IDX.S);
  const s = await probe(P);
  rec.ok('south draws no off-hand weapon — it has no stand-in to hold one',
    !(s.off && s.off.on), s.off);

  /* ── 3. every weapon type gets in the hand ──
     The three slots read from three different fields, and the port that
     preceded this one shipped a bug where a non-melee slot fell through to the
     bow (entityRenderer's note).  One pass each, so a slot that reads the
     wrong field cannot hide behind the melee case. */
  const KINDS = [
    { slot: 'melee',  item: { type: 'sword', name: 'Copper Sword', gearBase: 'copper', dmg: 3 } },
    { slot: 'ranged', item: { type: 'bow',   name: 'Pine Bow',     gearBase: 'wood',   dmg: 3 } },
    { slot: 'staff',  item: { type: 'staff', name: 'Pine Staff',   gearBase: 'wood',   dmg: 3 } },
  ];
  for (const k of KINDS) {
    await setWeapon(P, k);
    await pin(P, IDX.E);
    const p = await probe(P);
    rec.ok(`${k.item.type}: reaches the off hand from the ${k.slot} slot`,
      !!(p.off && p.off.on && p.off.type === k.item.type), p.off);
    if (p.off && p.off.on) {
      rec.ok(`${k.item.type}: ...at a size that reads against the body`,
        p.off.px > p.off.bodyH * 0.35 && p.off.px < p.off.bodyH * 0.85,
        { px: p.off.px, bodyH: p.off.bodyH });
    }
  }

  /* THE RENDER MUST NOT HAVE THROWN.  pixiRenderer catches per system, so a
     scope error here does not white-screen — it silently drops the whole
     effects layer, which looks like a camera problem in a screenshot. */
  const threw = P.logs.filter((l) => /entityRenderer threw|effectsRenderer threw|pageerror/.test(l));
  rec.ok('no renderer system threw while blocking with a weapon', threw.length === 0, threw);

  /* ── look at it ──
     A crop per facing per weapon, centred on the figure through the camera
     (the viewport centre is NOT the player — the camera does not hold him
     dead centre, and a centre crop returns cobblestones). */
  const SHOT_KINDS = [
    { slot: 'melee',  item: { type: 'greatsword', name: 'Copper Greatsword', gearBase: 'copper', dmg: 5 }, tag: 'greatsword' },
    { slot: 'melee',  item: { type: 'sword', name: 'Copper Sword', gearBase: 'copper', dmg: 3 }, tag: 'sword' },
    { slot: 'staff',  item: { type: 'staff', name: 'Pine Staff', gearBase: 'wood', dmg: 3 }, tag: 'staff' },
    { slot: 'ranged', item: { type: 'bow', name: 'Pine Bow', gearBase: 'wood', dmg: 3 }, tag: 'bow' },
  ];
  for (const k of SHOT_KINDS) {
    await setWeapon(P, k);
    for (const n of ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']) {
      await pin(P, IDX[n]);
      const cv = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const r = document.querySelector('canvas').getBoundingClientRect();
        return { x: r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1),
                 y: r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
      });
      await P.page.screenshot({
        path: `tools/qa/mp/out/bw-${k.tag}-${n}.png`,
        clip: { x: Math.max(0, Math.round(cv.x - 85)), y: Math.max(0, Math.round(cv.y - 120)),
                width: 170, height: 165 },
      });
    }
  }
  await P.page.screenshot({ path: 'tools/qa/mp/out/blockweapon.png' });
  await P.ctx.close().catch(() => {});
}
