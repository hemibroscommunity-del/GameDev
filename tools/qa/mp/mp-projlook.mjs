/* ═══ v2.3.2919: A PEER'S ARROW AND BOLT LOOK LIKE THE ONES THEY SHOT ═══
 *
 * Owner: "check all other broadcasted player animations to make sure they
 * match what your character does client side so there's no discrepancies."
 *
 * Your own arrow is tipped in your weapon's element colour and fades out over
 * the last 20 frames of its flight; your staff bolt glows in your staff's
 * element.  player_projectile carried no element, so a watcher drew every
 * peer's arrow tan at a flat 0.9, and every peer's bolt in the no-element
 * lavender.  And the retreat shot (swipe away from a locked target with a bow
 * or staff) sent no projectile at all: a watcher saw the roll and no arrow.
 *
 * Two real clients.  B shoots, A watches; both screens report what each shot
 * was drawn with (the renderer's __btShotLook), sampled through the flight,
 * and the watcher's copy must match the shooter's own.
 *   1. a FLAME bow's ordinary shot, through the game's own auto-attack
 *      (mp-aimpath's recipe: the weapon in hand, a target standing on the aim
 *      line so the sight gate lets the shot go, the attack held);
 *   2. a FROST staff's ordinary bolt, the same way;
 *   3. the staff SPECIAL (one big bolt) from a staff with TWO elements, through
 *      the game's own specialAttack: a special is drawn in the second element
 *      when there is one (playerActions hasElement), on both screens;
 *   4. the RETREAT SHOT, through the game's own dodge (the swipe's function),
 *      swiping away from a locked target: the watcher must draw its arrow, in
 *      its colour, and add no bow-draw pose the shooter's screen doesn't play.
 *
 *   node tools/qa/mp/run.mjs projlook
 */
import * as H from './harness.mjs';

const ANG = 0.9;
const DIST = 640;   /* inside the 675 px plant cap, far enough that the arrow lives into its last 20 frames */

const arm = (P, slot, el1, el2) => P.page.evaluate(({ slot, el1, el2, ang, d }) => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const t = ((F.WOODWORKING_TIERS || {}).pine) || { tierMult: 1 };
  const wpn = (type, name, mine) => ({ type, tierMult: t.tierMult, gearBase: 'pine', name, tier: 'common',
    element1: mine ? el1 : undefined, element2: mine ? (el2 || undefined) : undefined });
  R.rangedWeapon = wpn('bow', 'Pine Bow', slot === 'ranged');
  R.staffWeapon = wpn('staff', 'Pine Staff', slot === 'staff');
  R.activeSlot = slot;
  R.mana = R.maxMana = 500;
  R.stamina = Math.max(R.stamina || 0, R.maxStamina || 0, 100);
  S._shieldUp = false; S._bowSpecialQueued = 0; S.arrows = [];
  S._serverMonsters = false;
  const m = F.createMonster('look-line', 'fodder', 2,
    S.player.x + Math.cos(ang) * d, S.player.y + Math.sin(ang) * d, null);
  m.alive = true; m.curHp = m.maxHp = 90000; m.spd = 0; m.vx = 0; m.vy = 0;
  m.renderX = m.x; m.renderY = m.y;
  S.monsters = [m];
  S.lockedTarget = null;
  return { slot: R.activeSlot, el1, el2: el2 || null };
}, { slot, el1, el2, ang: ANG, d: DIST });

const look = (P, who, kind) => P.page.evaluate(({ who, kind }) => {
  const L = window.__btShotLook ? window.__btShotLook() : null;
  return L ? L.filter((s) => s.who === who && s.kind === kind) : null;
}, { who, kind });

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Archer' });
  await H.waitMutualSight(A, B);
  const bId = await H.readState(B, (S) => S.myId);
  rec.ok('probe present: the renderer\'s shot report (guard)',
    await A.page.evaluate(() => typeof window.__btShotLook === 'function'), {});

  /* Both screens through one flight: every frame's report, sampled. */
  const sample = async (kind) => {
    const own = [], peer = [], seen = { own: [], peer: [] };
    for (let i = 0; i < 60; i++) {
      const [o, p] = await Promise.all([look(B, 'self', kind), look(A, bId, kind)]);
      const t = Date.now();
      if (o && o.length) { own.push(...o); seen.own.push(t); }
      if (p && p.length) { peer.push(...p); seen.peer.push(t); }
      await A.page.waitForTimeout(120);
    }
    /* How long each copy was on screen, first sighting to last. */
    const span = (ts) => (ts.length ? ts[ts.length - 1] - ts[0] : 0);
    return { own, peer, ownSpan: span(seen.own), peerSpan: span(seen.peer) };
  };
  /* Your own shot flies by the 60 Hz tick (step and life x _dtScale), so it is
     in the air as long at any frame rate; the watcher's copy must be too, not
     longer on a slower screen.  Checked on bolts, which fly out their whole
     life on both screens (an arrow drops into the ground at the shooter's
     screen edge, and stays there). */
  const SPAN_TOL = 700;   /* ms: a few of this machine's ~9 frames, plus the relay */
  const sameSpan = (label, s) => {
    console.log(`    ${label}: in the air ${s.ownSpan} ms on the shooter's screen, ${s.peerSpan} ms on the watcher's`);
    rec.ok(`${label}: the watcher's copy is in the air as long as the shooter's (${s.peerSpan} ms against ${s.ownSpan})`,
      s.ownSpan > 0 && Math.abs(s.peerSpan - s.ownSpan) <= SPAN_TOL, { ownSpan: s.ownSpan, peerSpan: s.peerSpan });
  };
  /* The fade.  Your own shot is drawn at min(1, life / 20): solid, then
     fading out over its last 20 frames of flight.  The watcher's copy counts
     down the same life (the shooter sends it), so it must be drawn by the same
     rule at every point of its flight -- not at a flat 0.9-1.0 -- and, where
     the shot flies free to the end of its life, be SEEN fading out. */
  const fadeRule = (label, own, peer, wantTail) => {
    const rule = (q) => Math.abs(q.alpha - Math.min(1, (q.life || 0) / 20)) <= 0.001;
    const ownOff = own.filter((q) => !rule(q)), peerOff = peer.filter((q) => !rule(q));
    const ownTail = own.filter((q) => q.life < 20), peerTail = peer.filter((q) => q.life < 20);
    console.log(`    ${label}: own ${own.length - ownOff.length} of ${own.length} samples at life/20 (${ownTail.length} fading), `
      + `watcher ${peer.length - peerOff.length} of ${peer.length} (${peerTail.length} fading)`
      + (peerOff.length ? `; e.g. watcher life ${peerOff[0].life} drawn at ${peerOff[0].alpha}` : ''));
    rec.ok(`${label}: the shooter's own copy is drawn at life/20 (guard)`, ownOff.length === 0, { ownOff: ownOff.slice(0, 4) });
    rec.ok(`${label}: the watcher's copy is drawn by the same fade at every point of its flight (${peer.length - peerOff.length} of ${peer.length})`,
      peer.length > 0 && peerOff.length === 0, { peerOff: peerOff.slice(0, 4) });
    if (wantTail) {
      rec.ok(`${label}: ...and is seen fading out at the end (${peerTail.length} sample(s) in the last 20 frames)`,
        peerTail.length > 0 && peerTail.every(rule), { peerTail: peerTail.slice(0, 4), ownTail: ownTail.slice(0, 4) });
    }
  };
  const sameColour = (label, own, peer) => {
    const ownColors = [...new Set(own.map((s) => s.color))], peerColors = [...new Set(peer.map((s) => s.color))];
    console.log(`    ${label}: own colour ${ownColors.map((x) => '#' + x.toString(16))}, watcher's ${peerColors.map((x) => '#' + x.toString(16))}`);
    rec.ok(`${label}: the shooter's own arrow is tipped in the element (guard: not the no-element grey)`,
      ownColors.length === 1 && ownColors[0] !== 0xc8c8d0, { ownColors });
    rec.ok(`${label}: the watcher tips it in the same colour`, peerColors.length === 1 && peerColors[0] === ownColors[0],
      { ownColors, peerColors });
  };
  const sameGlow = (label, want, own, peer) => {
    const ownEl = [...new Set(own.map((s) => s.elem))], peerEl = [...new Set(peer.map((s) => s.elem))];
    console.log(`    ${label}: own glows ${JSON.stringify(ownEl)}, the watcher's ${JSON.stringify(peerEl)}`);
    rec.ok(`${label}: the shooter's own glows ${want} (guard)`, ownEl.length === 1 && ownEl[0] === want, { ownEl });
    rec.ok(`${label}: the watcher's copy glows ${want} too`, peerEl.length === 1 && peerEl[0] === want, { ownEl, peerEl });
  };

  /* ── 1 and 2: the ordinary shot and the ordinary bolt ── */
  for (const c of [{ slot: 'ranged', el: 'flame', kind: 'arrow' }, { slot: 'staff', el: 'frost', kind: 'bolt' }]) {
    const armed = await arm(B, c.slot, c.el);
    await B.page.waitForTimeout(400);
    await B.page.evaluate((ang) => {
      const S = window._gameState.current;
      S._aimAngle = ang; S._aiming = true; S.swingTimer = 0; S.autoAttack = true;
    }, ANG);
    /* One shot is enough, and more would overlap on screen: stop holding as
       soon as the shooter's own screen shows the first. */
    let fired = false;
    for (let i = 0; i < 30 && !fired; i++) {
      await B.page.waitForTimeout(60);
      const mine = await look(B, 'self', c.kind);
      fired = !!(mine && mine.length);
    }
    /* ...and take the target away once it has: the target was only there for
       the sight gate, and a shot that hits it never reaches the end of its
       flight, where the fade is. */
    await B.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; S.monsters = []; S.lockedTarget = null; });
    const sm = await sample(c.kind);
    const { own, peer } = sm;
    rec.ok(`${c.kind}: the ${c.el} ${c.kind === 'arrow' ? 'bow' : 'staff'} fired, through the game's own auto-attack (guard)`,
      fired && own.length > 0, { armed, fired, own: own.length });
    rec.ok(`${c.kind}: the watcher drew the peer's ${c.kind} (guard)`, peer.length > 0, { peer: peer.length });
    if (own.length && peer.length) {
      if (c.kind === 'arrow') sameColour('arrow', own, peer);
      else sameGlow('bolt', c.el, own, peer);
      /* A bolt flies out its whole life and fades.  The shooter's own ARROW
         usually drops into the ground first, solid (projectiles.js plants it
         at the edge of their screen or at 675 px), so for arrows the rule is
         checked wherever each copy was drawn, and the fade-out is not
         required to be seen. */
      fadeRule(c.kind, own, peer, c.kind === 'bolt');
      if (c.kind === 'bolt') sameSpan('bolt', sm);
    }
    await B.page.waitForTimeout(800);
  }

  /* ── 3: the staff special, from a staff with two elements ── */
  {
    const armed = await arm(B, 'staff', 'flame', 'frost');
    await B.page.waitForTimeout(400);
    const cast = await B.page.evaluate((ang) => {
      const S = window._gameState.current, F = window._gameFns || {};
      S._lastSwipe = 0; S.lockedTarget = null; S._aimAngle = ang; S._aiming = true;
      if (F.specialAttack) F.specialAttack();
      S._aiming = false; S.monsters = [];   /* free flight to the end of its life (see above) */
      const a = (S.arrows || [])[0];
      return { n: (S.arrows || []).length, big: !!(a && a.big), element: a ? a.element || null : null };
    }, ANG);
    const sm = await sample('bigbolt');
    const { own, peer } = sm;
    console.log(`    special: ${JSON.stringify(cast)}`);
    rec.ok('special: the two-element staff cast its big bolt, through the game\'s own specialAttack (guard)',
      cast.n === 1 && cast.big && own.length > 0, { armed, cast, own: own.length });
    rec.ok('special: the watcher drew the peer\'s big bolt (guard)', peer.length > 0, { peer: peer.length });
    if (own.length && peer.length) {
      sameGlow('special', 'frost', own, peer);
      fadeRule('special', own, peer, true);
      sameSpan('special', sm);
    }
    await B.page.waitForTimeout(800);
  }

  /* ── 4: the retreat shot ── */
  {
    const armed = await arm(B, 'ranged', 'flame');
    await B.page.waitForTimeout(400);
    const drawBefore = await A.page.evaluate((id) => {
      const o = window._gameState.current.others[id];
      return o ? (o._bowShotAt || 0) : null;
    }, bId);
    const shot = await B.page.evaluate((ang) => {
      const S = window._gameState.current, F = window._gameFns || {};
      const m = (S.monsters || [])[0];
      S.autoAttack = false; S._aiming = false;
      /* A tapped lock, the intent test a retreat shot needs (targeting.js
         engagedStance), and a swipe straight away from it. */
      S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap', at: Date.now() };
      if (F.contextualDodge) F.contextualDodge(ang + Math.PI);
      return {
        kind: S._dodgeRoll ? (S._dodgeRoll.kind || 'dodge') : null,
        arrows: (S.arrows || []).filter((a) => a.retreatShot).length,
      };
    }, ANG);
    const { own, peer } = await sample('arrow');
    const drawAfter = await A.page.evaluate((id) => {
      const o = window._gameState.current.others[id];
      return o ? (o._bowShotAt || 0) : null;
    }, bId);
    console.log(`    retreat shot: ${JSON.stringify(shot)}; own ${own.length} sample(s), watcher's ${peer.length}`);
    rec.ok('retreat: the archer rolled away and loosed, through the game\'s own dodge (guard)',
      shot.kind === 'retreat_shot' && shot.arrows === 1 && own.length > 0, { armed, shot, own: own.length });
    rec.ok('retreat: the watcher draws the arrow too (it used to fly on the archer\'s screen alone)',
      peer.length > 0, { peer: peer.length });
    if (own.length && peer.length) sameColour('retreat', own, peer);
    /* The archer's own screen plays no bow-draw for a retreat shot (dodge.js
       stamps no _bowShotAt), so the watcher's copy must not start one. */
    rec.ok('retreat: ...and plays no bow draw for it, as the archer\'s own screen plays none',
      drawBefore !== null && drawAfter === drawBefore, { drawBefore, drawAfter });
  }
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
