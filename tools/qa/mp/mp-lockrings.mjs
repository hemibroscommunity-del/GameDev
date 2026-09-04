/* ═══ HOW MANY RINGS ARE ON THE TARGET, AND WHOSE ARE THEY (v2.3.2263) ═══
 *
 * Owner, twice now: "Monsters still have two lock on circles on them."
 * v2.3.2262 skipped the locked monster in the candidate ground-ring loop
 * (`if (isCur) continue;`) and the pair survived, so the pair is NOT the one
 * that fix was aimed at and reading the code again is not going to say which
 * two it is.
 *
 * So this LOOKS.  Two monsters, one TAP-locked and one merely a candidate,
 * both on screen at once, each cropped from the position the renderer reports
 * rather than from coordinates typed in here (the mp-arrowshot lesson).  The
 * crops are analysed off-line: a radial histogram of brass pixels names every
 * ring's radius, and the locked/unlocked pair is the control that says which
 * drawer owns which ring.
 *
 * The numbers to compare against, both from effectsRenderer:
 *   lock reticle   circle, world radius 18 +/- 3, four corner dots
 *   candidate ring ellipse, rx = monsterMeleeHitRadius + 10 (34 for a slime),
 *                  ry = rx * 0.38
 */
import * as H from './harness.mjs';

const TILE = 32;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

const seed = (P, list) => P.page.evaluate((ms) => {
  const S = window._gameState.current;
  S._serverMonsters = false;
  S.monsters = ms.map(([id, dx, dy]) => ({
    id, arch: 'fodder', archetype: 'fodder', type: 'fodder',
    x: S.player.x + dx, y: S.player.y + dy,
    renderX: S.player.x + dx, renderY: S.player.y + dy,
    spawnX: S.player.x + dx, spawnY: S.player.y + dy,
    targetX: S.player.x + dx, targetY: S.player.y + dy,
    hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0,
    spd: 0, vx: 0, vy: 0, alive: true, statuses: {},
    _hitThisSwing: false, _atkCd: 0, _stunUntil: 0, respawnAt: 0, moveTimer: 0, _stuckArrows: [],
  }));
}, list);

export async function run({ browser, wsPort, webPort, rec }) {
  const out = process.env.BT_RING_OUT || `${H.REPO}/tools/qa/mp/out/lockrings`;
  const P = await H.newPlayer(browser, {
    name: 'Rings', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  /* THE ZONE MATTERS.  The first cut of this shot the pair in TOWN, where the
     cobble is the same brass the marks are drawn in (TRAPS #21) and the zoom is
     the town zoom -- neither is what the owner is looking at.  Walk out to a
     spoke zone, exactly as mp-dashhit does, then take the scene over. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1800);
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'verdant')
        || (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId !== 'town') || null,
    };
  });
  if (!marks.townOut || !marks.spoke) {
    rec.skip('the rings can be photographed in a combat zone', 'no exit tables');
    await P.ctx.close().catch(() => {}); return;
  }
  await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'World View' }).catch(() => {});
  await P.page.waitForTimeout(800);
  await stand(P, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z !== 'worldview' && z !== 'town',
    { timeout: 30000, label: 'a monster zone' }).catch(() => {});
  await P.page.waitForTimeout(2500);
  /* Opposite sides so neither monster's marks bleed into the other's crop,
     both well inside the 220px perimeter so both are candidates -- and the
     TAPPED one deliberately the FARTHER of the two, which is what the
     targeting section at the end needs. */
  await seed(P, [['locked', -200, 0], ['plain', 90, 0]]);
  await P.page.waitForTimeout(700);

  /* TAP the left one, the way the owner does -- src:'tap' is what pins it, and
     going through the state directly would skip whatever the tap path sets. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.id === 'locked');
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
  });
  await P.page.waitForTimeout(600);

  const state = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return {
      scaleX: S._worldScaleX, scaleY: S._worldScaleY,
      dpr: window.devicePixelRatio,
      lock: S.lockedTarget && S.lockedTarget.id,
      cands: (S._targetCands || []).map((c) => c.m && c.m.id),
      slot: S.rpg && S.rpg.activeSlot,
    };
  });
  rec.ok('the tap-locked monster is the lock (guard)', state.lock === 'locked', state);
  rec.ok('...and BOTH monsters are candidates, so both wear candidate marks (guard)',
    state.cands.length === 2, state);
  console.log('    world: ' + JSON.stringify(state));

  /* One crop per monster, framed on the body the renderer reports. */
  const boxFor = async (id) => P.page.evaluate((mid) => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => x.id === mid);
    if (!m) return null;
    const r = document.querySelector('canvas').getBoundingClientRect();
    const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
    const cx = r.left + ((m.renderX != null ? m.renderX : m.x) - S.camera.x) * kx;
    const cy = r.top + ((m.renderY != null ? m.renderY : m.y) - S.camera.y) * ky;
    const half = 62;
    const x = Math.max(0, Math.round(cx - half)), y = Math.max(0, Math.round(cy - half));
    const w = Math.min(innerWidth - x, half * 2), h = Math.min(innerHeight - y, half * 2);
    return (w > 40 && h > 40) ? { x, y, width: w, height: h, cx, cy } : null;
  }, id);

  /* ═══ WHAT THE LOCK FOLLOWS (v2.3.2263) ═══
     Owner: "the lock on targeting when attacking with melee isn't working the
     way I want when other monsters are nearer than the one you're locked on
     to.  I want the lock on system to go by the nearest monster for which one
     to target, not just the one you've been fighting."

     The fixture is exactly that complaint: a TAPPED lock on a monster 200px
     away with another standing at 90px.  Before v2.3.2263 the tapped one held
     the lock for the rest of the fight at any distance.

     Both halves are asserted, because the rule has to keep a previous
     directive alive as well as satisfy this one: the tap is PINNED briefly
     (v2.3.2260's "tap a monster across the screen, then press Attack to lunge
     at it" needs the lock to survive from thumb to thumb), and then the
     nearest rule takes over. */
  const pinned = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { id: S.lockedTarget && S.lockedTarget.id, src: S.lockedTarget && S.lockedTarget.src };
  });
  rec.ok('right after the tap the lock is still the monster you TAPPED, though it is the farther one',
    pinned.id === 'locked' && pinned.src === 'tap', pinned);
  /* TAP_PIN_MS is 900; wait past it and let the rule run. */
  await P.page.waitForTimeout(1400);
  const stolen = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const lt = S.lockedTarget;
    const d = (id) => {
      const m = (S.monsters || []).find((x) => x.id === id);
      return m ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null;
    };
    return { id: lt && lt.id, src: lt && lt.src, dLocked: d('locked'), dPlain: d('plain') };
  });
  console.log('    after the pin: ' + JSON.stringify(stolen));
  rec.ok(`...and once the pin lapses the NEARER monster takes the lock (${stolen.dPlain}px vs ${stolen.dLocked}px)`,
    stolen.id === 'plain', stolen);
  rec.ok('...as an automatic lock, so the nearest rule owns it from here',
    stolen.src === 'auto', stolen);

  /* ═══ AND A BOW'S TAP IS STILL ABSOLUTE ═══
     v2.3.2251 made the tap the ONLY way a ranged weapon acquires anything and
     v2.3.2246's snipe depends on it surviving far outside the perimeter, so
     the new rule must not reach it.  Same fixture, different slot. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'ranged';
    const m = (S.monsters || []).find((x) => x.id === 'locked');
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
  });
  await P.page.waitForTimeout(1400);
  const bow = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { id: S.lockedTarget && S.lockedTarget.id, src: S.lockedTarget && S.lockedTarget.src,
      slot: S.rpg && S.rpg.activeSlot };
  });
  console.log('    with a bow: ' + JSON.stringify(bow));
  rec.ok('a BOW keeps the monster it tapped, even with a nearer one standing there',
    bow.id === 'locked' && bow.src === 'tap', bow);
  /* Put the sword back so the crops below are the melee case the owner sees. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'melee';
    const m = (S.monsters || []).find((x) => x.id === 'locked');
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
  });
  await P.page.waitForTimeout(400);

  /* ═══ THE BUTTON STOPS HIDING THE FIGHT (v2.3.2263) ═══
     Owner: "Attack button sometimes covers monster (not sure best way to deal
     with it maybe 50% transparency during active combat?)"

     Three facts, because the naive reading of that request breaks an older
     one.  v2.3.2251 is the owner asking for the OPPOSITE -- "the attack button
     isn't lit up when it becomes available (font hard to see)" -- so fading
     the element would dim the label and the lit edge with it and hand that
     complaint straight back.  Only the painted metal fades; the label stays
     opaque; and the touch target is untouched, because an unpressable attack
     button is a worse bug than a solid one. */
  const btn = await P.page.evaluate(() => {
    const disc = document.querySelector('.bt-rjoy-base');
    if (!disc) return null;
    const body = disc.querySelector('div[style*="border-radius: 50%"]') || disc.firstElementChild;
    const label = Array.from(disc.children).find((c) => (c.textContent || '').trim() === 'ATTACK');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    return {
      discOpacity: +getComputedStyle(disc).opacity,
      bodyOpacity: body ? +getComputedStyle(body).opacity : null,
      bodyHasSprite: !!(body && /base\.webp/.test(getComputedStyle(body).backgroundImage || '')),
      labelText: label ? label.textContent.trim() : null,
      labelOpacity: label ? +getComputedStyle(label).opacity : null,
      pointerEvents: getComputedStyle(disc).pointerEvents,
      wrapOpacity: +getComputedStyle(disc.parentElement).opacity,
      /* v2.3.2264: the warm wash.  Two background layers means the gradient is
         painted over the sprite; one means bare metal. */
      bodyBg: body ? getComputedStyle(body).backgroundImage : null,
      bodyRect: body ? (() => { const r = body.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() : null,
    };
  });
  /* ═══ ONE TARGET, ONE RING (v2.3.2263) ═══
     Owner, three times: "I still see two lock on circles on my screen."  The
     renderer now reports how many it drew, so this is a number rather than a
     reading of the code -- which is what the two previous answers were, and
     both of them named the wrong pair. */
  await P.page.evaluate(() => { if (window.__btLockRings) window.__btLockRings(); });  /* arm */
  await P.page.waitForTimeout(300);                                                    /* let a frame run */
  const rings = await P.page.evaluate(() => (window.__btLockRings ? window.__btLockRings() : null));
  console.log('    lock rings drawn on the target: ' + JSON.stringify(rings));
  rec.ok(`the locked monster wears exactly ONE ring (drawn: ${rings && rings.count}, radii ${JSON.stringify(rings && rings.radii)})`,
    !!rings && rings.count === 1, rings);

  console.log('    attack button: ' + JSON.stringify(btn));
  rec.ok('the attack button is up, lit and pressable with monsters in play (guard)',
    !!btn && btn.wrapOpacity === 1 && btn.discOpacity === 1 && btn.pointerEvents === 'auto', btn);
  rec.ok(`...its painted metal is see-through, so it stops covering the monster (${btn && btn.bodyOpacity})`,
    !!btn && btn.bodyHasSprite === true && btn.bodyOpacity > 0.2 && btn.bodyOpacity < 0.7, btn);
  rec.ok('...and the LABEL is not faded with it, which is what v2.3.2251 asked for',
    !!btn && btn.labelText === 'ATTACK' && btn.labelOpacity === 1, btn);
  /* ═══ v2.3.2264: SEE-THROUGH MUST NOT READ AS DISABLED ═══
     Owner: "The problem is implying the button is inactive when it's partially
     transparent.  Maybe only during combat it changes color (like to orange)
     keeping its transparency."  So the two have to be true together -- faded
     AND warm -- and the warm half has to be absent when there is nothing to
     fight, or it stops meaning anything. */
  rec.ok('...and the see-through disc is WARM, not greyed, so it reads as live',
    !!btn && /linear-gradient/.test(btn.bodyBg || '') && /214,\s*138,\s*60/.test(btn.bodyBg || ''),
    { bodyBg: btn && btn.bodyBg });
  if (btn && btn.bodyRect) {
    await P.page.screenshot({ path: `${out}/button-hot.png`,
      clip: { x: btn.bodyRect.x - 6, y: btn.bodyRect.y - 6, width: btn.bodyRect.w + 12, height: btn.bodyRect.h + 12 } });
  }


  const bLock = await boxFor('locked');
  const bPlain = await boxFor('plain');
  rec.ok('both monsters resolve to an on-screen crop box (guard)', !!bLock && !!bPlain,
    { bLock, bPlain });
  await P.page.screenshot({ path: `${out}/full.png` });
  if (bLock) await P.page.screenshot({ path: `${out}/locked.png`, clip: { x: bLock.x, y: bLock.y, width: bLock.width, height: bLock.height } });
  if (bPlain) await P.page.screenshot({ path: `${out}/plain.png`, clip: { x: bPlain.x, y: bPlain.y, width: bPlain.width, height: bPlain.height } });
  console.log('    crops written to ' + out + ' (locked.png / plain.png)');

  /* THE CONTROL, run LAST: it shoves the monsters off the map, which would
     leave the ring camera above with nothing to frame.
     Drop the target and empty the perimeter, and the disc must go drop the target and empty the perimeter, and the disc must go
     back to plain opaque metal. */
  const cold = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.lockedTarget = null;
    (S.monsters || []).forEach((m) => { m.x += 4000; m.y += 4000; m.renderX = m.x; m.renderY = m.y; });
    return true;
  });
  /* POLL FOR THE TRANSITION TO SETTLE, do not guess a wait.  The disc fades
     over 0.18s and the first version of this read 0.953 -- a value on its way
     to 1, asserted as though it were an end state.  That is TRAPS #44 in the
     same file that documents it. */
  const btnCold = await P.page.evaluate(() => new Promise((resolve) => {
    const disc = document.querySelector('.bt-rjoy-base');
    const body = disc && (disc.querySelector('div[style*="border-radius: 50%"]') || disc.firstElementChild);
    if (!body) return resolve(null);
    const t0 = Date.now();
    let last = null, stable = 0;
    const iv = setInterval(() => {
      const o = +getComputedStyle(body).opacity;
      if (last !== null && Math.abs(o - last) < 0.001) stable++; else stable = 0;
      last = o;
      if (stable >= 3 || Date.now() - t0 > 3000) {
        clearInterval(iv);
        resolve({ opacity: o, bg: getComputedStyle(body).backgroundImage, settledMs: Date.now() - t0 });
      }
    }, 60);
  }));
  console.log('    attack button, nothing to fight: ' + JSON.stringify(btnCold));
  rec.ok('with nothing to fight the disc is opaque metal again, so the warm state MEANS something',
    !!cold && !!btnCold && btnCold.opacity === 1 && !/linear-gradient/.test(btnCold.bg || ''), btnCold);
  console.log('    expected, in CSS px radius: reticle ' +
    (18 * (state.scaleX || 1)).toFixed(1) + ' (15..21 with its bob), candidate ellipse rx ' +
    (34 * (state.scaleX || 1)).toFixed(1) + ' ry ' + (34 * 0.38 * (state.scaleY || 1)).toFixed(1));
}
