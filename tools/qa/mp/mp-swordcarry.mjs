/* THE CARRIED SWORD POINTS UP, AND FORWARD (v2.3.1786).
 *
 * Owner: "can you invert the sword held angle so instead of running around
 * with it facing downward it points upward?" — then, on the first cut: "The
 * sword needs to always aim forward though.  And I'm just talking about
 * JOGGING and IDLE sword position, not attacking."
 *
 * That correction is the property under test, and it is why this asserts the
 * SIGN OF scale.y rather than "the sword looks different".  There are two ways
 * to point a blade up and they are not interchangeable:
 *   - rotation by 180 degrees inverts BOTH axes, so the blade ends up up and
 *     BACK, over the shoulder, away from the way he is running;
 *   - a vertical flip inverts only the vertical, so the art's baked forward
 *     lean survives and the blade points up and FORWARD.
 * The first cut used the rotation and had to be redone.  A screenshot check
 * would have passed against both.
 *
 * MEASURED BASELINE (copper greatsword, idle, all eight facings):
 *     scaleY -0.24 on every facing, rotation 0, visible true
 *     scaleX +/-0.24, sign carrying the per-facing mirror, untouched
 *
 * NOTE FOR ANYONE EXTENDING THIS: do not set S.autoAttack to drive the weapon
 * on.  isInCombat is unconditionally true (SHEATHED_DEFAULT_ENABLED is false),
 * so it is not needed — and autoAttack makes the bro swing on his own, so the
 * probe lands mid-swing on the stand-in.  That cost me an hour reading it as
 * texture corruption.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
const OUT = `${H.REPO}/tools/qa/mp/out/swordcarry`;

const NAMES = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

async function face(P, idx) {
  await P.page.evaluate((i) => {
    const S = window._gameState.current;
    S._facingAngle = i * Math.PI / 4; S._aimAngle = i * Math.PI / 4;
    S.lockedTarget = null; S.isSwinging = false; S.swingTimer = 0; S.autoAttack = false;
  }, idx);
  await P.page.waitForTimeout(280);
  /* Re-assert the weapon right before reading: the worker is authoritative for
     equipment and its player_state delta clears a client-side assignment
     within about a second. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'melee';
    S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' };
  });
  await P.page.waitForTimeout(140);
  return P.page.evaluate(() => window.__btWeapon || null);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Carry', wsPort, webPort, viewport: { width: 390, height: 844 }, dpr: 3 });   /* v2.3.2925: iPhone density, so the pictures show the fist */
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* v2.3.2925: poll the first read -- on a cold join the weapon art can still
     be resolving for a frame or two, and a single sample then failed this guard
     at random (it passed on the next run, and on every other facing). */
  let first = await face(P, 2);
  for (let i = 0; i < 6 && !(first && first.visible); i++) first = await face(P, 2);
  rec.ok('the carried sword is drawn at all', !!(first && first.visible), { probe: first });
  if (!first) { await P.ctx.close().catch(() => {}); return; }
  /* GUARD: the per-facing art actually resolved.  Without this every sign
     assertion below is satisfied by an empty texture. */
  rec.ok('the greatsword art resolved (guard)', first.texW > 0 && first.texH > 0,
    { texW: first.texW, texH: first.texH });

  const seen = [];
  for (let i = 0; i < 8; i++) {
    const m = await face(P, i);
    seen.push({ f: NAMES[i], scaleY: m && m.scaleY, scaleX: m && m.scaleX, rot: m && m.rotation });
    rec.ok(`${NAMES[i]}: the facing under test is the one that rendered (guard)`,
      !!(m && m.facing), { probe: m });
    rec.ok(`${NAMES[i]}: the blade points UP`, !!(m && m.bladeUp && m.scaleY < 0),
      { bladeUp: m && m.bladeUp, scaleY: m && m.scaleY });
    /* FORWARD, not backward: a 180-degree rotation would also read as
       "blade up", so the vertical inversion has to come from the FLIP, which
       is what keeps the art's forward lean.

       v2.3.1839: SOUTH IS EXEMPT FROM THE EXACT-ZERO FORM, and it had been
       failing here since v2.3.1821b gave it a deliberate idle tilt to get the
       blade off the character's face — a standing red nobody had chased,
       confirmed by re-running this at the old -0.18 (south failed, all seven
       other facings reported exactly 0).  Pinning to zero was only ever a
       proxy for "not rotated 180 degrees"; now that one facing tilts on
       purpose, the proxy has to become the actual claim.  1 radian is far
       above any idle tilt worth having and far below the ~3.14 this exists to
       catch. */
    const _tiltOk = (NAMES[i] === 'S')
      ? (m && Math.abs(m.rotation) < 1)
      : (m && Math.abs(m.rotation) < 1e-6);
    rec.ok(`${NAMES[i]}: ...by flipping, not rotating, so the lean stays forward`,
      !!_tiltOk, { rotation: m && m.rotation,
        rule: NAMES[i] === 'S' ? 'south carries SOUTH_IDLE_TILT; must not be a 180 flip' : 'must be exactly 0' });
    /* The per-facing horizontal mirror must be untouched by any of this. */
    rec.ok(`${NAMES[i]}: the facing mirror is left alone`,
      !!(m && Math.abs(Math.abs(m.scaleX) - Math.abs(m.scaleY)) < 1e-6),
      { scaleX: m && m.scaleX, scaleY: m && m.scaleY });
  }
  console.log('    facings', JSON.stringify(seen));

  /* ── v2.3.1787: WHICH SIDE OF THE BODY THE BLADE IS ON ──
     Owner: "SW SE and E need the sword layered in front of" ... "Looks like it
     is probably the shirt."  In front for E/SE/S/SW/NE, behind for W/NW/N —
     the facings where you are looking at his back.

     ═══ v2.3.2516: SW COMES OUT, BY THE SAME OWNER ═══
     D7, backlog triage 2026-09-14 §5.8: "greatsword at southwest goes BEHIND
     the body for jog/idle AND for the attack swing -- it is in the right hand,
     facing away from the camera; the character should occlude the swing instead
     of the blade passing through the body.  Southeast and east are unchanged."

     So this set loses SW and keeps everything else, which is the shape of the
     answer: at SE and E the blade is on the CAMERA side of the figure and at SW
     it is on the far side.  v2.3.1787 swept SW along with the two facings it
     could actually see.  Rendered at 20x before and after (tools/qa/mp/out/,
     arules-*-greatsword-carry-southwest.png): before, the blade runs down across
     the tee and the cape; after, the body occludes it and only the span outside
     the silhouette reads.  The plain sword and the staff have been behind at SW
     all along -- they are not `_heldInHand` and never reach heldWeaponInFront --
     so this makes the greatsword agree with them rather than inventing a rule. */
  /* ═══ v2.3.2911: ...AND THE CARRIED SW COMES BACK IN FRONT ═══
     Owner: "East, Southwest, northeast the characters hand should be over the
     handle."  Behind the body, the arm swallowed the SW handle and only the
     crossguard showed beside the hand.  The carried SW blade now sits in front
     with a hole at the grip, so the fist is drawn over the handle (see
     gripHoleWanted).  The SWING keeps v2.3.2516's behind-the-body order. */
  const FRONT = new Set(['E', 'SE', 'S', 'SW', 'NE']);
  const GRIP_HOLE = new Set(['E', 'SE', 'S', 'SW', 'NE']);   /* v2.3.2925: + S, + SE (standing) */
  for (let i = 0; i < 8; i++) {
    const m = await face(P, i);
    const want = FRONT.has(NAMES[i]);
    rec.ok(`${NAMES[i]}: the blade is ${want ? 'in front of' : 'behind'} the body`,
      !!m && (m.wcIdx > m.spriteBodyIdx) === want,
      { wcIdx: m && m.wcIdx, spriteBodyIdx: m && m.spriteBodyIdx, expectedInFront: want });
    if (i <= 2) {   /* v2.3.2925: idle E / SE / S close-ups for eyes -- the hand on the grip */
      mkdirSync(OUT, { recursive: true });
      const box = await P.page.evaluate(() => {
        const S = window._gameState.current, c = document.querySelector('canvas').getBoundingClientRect();
        const x = c.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y = c.top + (S.player.y - 30 - S.camera.y) * (S._worldScaleY || 1);
        return { x: Math.max(0, Math.round(x - 70)), y: Math.max(0, Math.round(y - 75)), width: 140, height: 130 };
      });
      await P.page.screenshot({ path: `${OUT}/idle-${NAMES[i]}.png`, clip: box }).catch(() => {});
    }
    const hole = GRIP_HOLE.has(NAMES[i]);
    rec.ok(`${NAMES[i]}: the fist is ${hole ? '' : 'not '}cut over the handle`,
      !!m && !!m.gripHole === hole, { gripHole: m && m.gripHole });
  }

  /* ═══ v2.3.2923: TURNING AWAY FROM A GRIP-HOLE FACING LEAVES NOTHING BEHIND ═══
     Owner: "There's a marker that I'm seeing on the character near the hand
     that looks like a circle" and "The sword is clipped at the top."  Both
     were the hole's leftovers: the mask Graphics drew as a white dot once it
     stopped being a mask, and the shine kept the masked frame's clip box.
     Every facing, arriving from each of the three hole facings. */
  for (const from of [0, 1, 2, 3, 7]) {
    for (let i = 0; i < 8; i++) {
      if (GRIP_HOLE.has(NAMES[i])) continue;
      await face(P, from);
      const m = await face(P, i);
      rec.ok(`${NAMES[from]} -> ${NAMES[i]}: no white dot left at the hand`, !!m && m.gripHoleDot === false,
        { gripHoleDot: m && m.gripHoleDot });
      rec.ok(`${NAMES[from]} -> ${NAMES[i]}: the blade is not clipped by a stale box`, !!m && m.staleClip === false,
        { staleClip: m && m.staleClip });
    }
  }

  /* THE SHIRT, WHICH IS WHAT THIS WAS ACTUALLY ABOUT.  "In front" used to be
     measured against _spriteBody — which is NOT DRAWN (v2.3.608 made it the
     invisible transform reference the gear copies), so the blade landed under
     every worn layer.  Bare, the shirt is baked into the body sheet and the
     bug is invisible; put a chest plate on and it is the whole defect.  This
     is the case that would silently regress if someone re-anchored to
     _spriteBody again. */
  await P.page.evaluate(() => { try { window.__btSetGear('chest', 'copperplate'); } catch (e) {} });
  await P.page.waitForTimeout(900);
  const armoured = await face(P, 0);
  console.log('    armoured E', JSON.stringify(armoured));
  if (armoured && armoured.gearChestVis) {
    rec.ok('with a chest plate on, the blade still clears it',
      armoured.wcIdx > armoured.gearChestIdx,
      { wcIdx: armoured.wcIdx, gearChestIdx: armoured.gearChestIdx });
  } else {
    rec.ok('the chest plate actually went on (guard for the check above)',
      false, { gearChestVis: armoured && armoured.gearChestVis });
  }
  await P.page.evaluate(() => { try { window.__btSetGear('chest', 'none'); } catch (e) {} });
  await P.page.waitForTimeout(600);

  /* ATTACKING IS NOT THIS.  The owner drew the line explicitly, and the swing
     lives in its own branch — so a swing must still drive rotation and leave
     the blade unflipped. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'melee';
    S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' };
    S._facingAngle = 0; S._aimAngle = 0;
    S.isSwinging = true; S.swingTimer = Date.now(); S._swingAng = 0;
  });
  await P.page.waitForTimeout(90);
  const sw = await P.page.evaluate(() => window.__btWeapon || null);
  console.log('    mid-swing', JSON.stringify(sw));
  if (sw) {
    rec.ok('a swing is not flipped — it keeps its own rotation path',
      sw.bladeUp === false && sw.scaleY > 0, { bladeUp: sw.bladeUp, scaleY: sw.scaleY });
  }

  /* ═══ v2.3.2925: JOGGING SOUTHWEST THE BODY COVERS THE BLADE; NORTH LEANS WEST ═══
     Owner: "Southwest jog the sword needs to be occluded by the players body.
     Also north jog the weapon should point northwest instead of its current
     northeast."  Real key input (the game loop owns vx/vy), with the player
     pinned in place at the start of every frame so a long hold cannot walk
     him into a wall.  Pictures in tools/qa/mp/out/swordcarry/ for eyes. */
  mkdirSync(OUT, { recursive: true });
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__scPin = { x: S.player.x, y: S.player.y, on: true };
    const _raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => _raf((ts) => {
      try { const p = window.__scPin, Q = window._gameState.current; if (p.on) { Q.player.x = p.x; Q.player.y = p.y; } } catch (e) { /* the frame first */ }
      cb(ts);
    });
  });
  const jog = async (keys, name) => {
    await P.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; S.autoAttack = false; S._aimAngle = null; });
    for (const k of keys) await P.page.keyboard.down(k);
    let m = null;
    for (let t = 0; t < 8; t++) {
      await P.page.evaluate(() => {
        const S = window._gameState.current;
        S.rpg.activeSlot = 'melee';
        S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' };
      });
      await P.page.waitForTimeout(150);
      m = await P.page.evaluate(() => window.__btWeapon || null);
      if (m && m.pose === 'jog' && m.facing === name) break;
    }
    const box = await P.page.evaluate(() => {
      const S = window._gameState.current, c = document.querySelector('canvas').getBoundingClientRect();
      const x = c.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y = c.top + (S.player.y - 30 - S.camera.y) * (S._worldScaleY || 1);
      return { x: Math.max(0, Math.round(x - 70)), y: Math.max(0, Math.round(y - 75)), width: 140, height: 130 };
    });
    await P.page.screenshot({ path: `${OUT}/jog-${name}.png`, clip: box }).catch(() => {});
    /* v2.3.2925: the run wobble -- the blade's angle over a few frames */
    const rots = [];
    for (let t = 0; t < 8; t++) { await P.page.waitForTimeout(70); const r = await P.page.evaluate(() => window.__btWeapon && window.__btWeapon.rotation); rots.push(r); }
    for (const k of keys) await P.page.keyboard.up(k);
    await P.page.waitForTimeout(250);
    if (m) m.rots = rots;
    return m;
  };
  await P.page.click('canvas', { position: { x: 5, y: 5 } }).catch(() => {});
  const swj = await jog(['a', 's'], 'southwest');
  rec.ok('SW jog: the body is jogging southwest (guard)', !!(swj && swj.pose === 'jog' && swj.facing === 'southwest'), { pose: swj && swj.pose, facing: swj && swj.facing });
  rec.ok('SW jog: the blade is behind the body', !!swj && swj.wcIdx < swj.spriteBodyIdx, { wcIdx: swj && swj.wcIdx, spriteBodyIdx: swj && swj.spriteBodyIdx });
  rec.ok('SW jog: no grip hole (the body covers the handle)', !!swj && !swj.gripHole, { gripHole: swj && swj.gripHole });
  const n = await jog(['w'], 'north');
  rec.ok('N jog: the body is jogging north (guard)', !!(n && n.pose === 'jog' && n.facing === 'north'), { pose: n && n.pose, facing: n && n.facing });
  rec.ok('N jog: the blade is mirrored about the grip, leaning northwest', !!n && n.scaleX < 0, { scaleX: n && n.scaleX });
  {
    const r = (n && n.rots || []).filter((v) => typeof v === 'number');
    const span = r.length ? Math.max(...r) - Math.min(...r) : 0;
    rec.ok('N jog: the blade wobbles with the run, a few degrees about the grip', span > 0.02 && span < 0.2, { rots: r.map((v) => +v.toFixed(3)), span: +span.toFixed(3) });
  }
  /* v2.3.2925: south, a strip of frames for eyes -- the back of the hand over the grip */
  for (let k = 0; k < 6; k++) {
    const sj = await jog(['s'], 'south');
    if (k === 0) rec.ok('S jog: the fist is cut over the handle', !!sj && sj.pose === 'jog' && !!sj.gripHole, { pose: sj && sj.pose, gripHole: sj && sj.gripHole });
    try { (await import('node:fs')).renameSync(`${OUT}/jog-south.png`, `${OUT}/jog-south-${k}.png`); } catch (e) { /* picture only */ }
  }
  await P.page.evaluate(() => { window.__scPin.on = false; });

  await P.ctx.close().catch(() => {});
}
