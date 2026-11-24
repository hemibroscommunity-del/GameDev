/* ═══ v2.3.6541: THE TWO BUTTONS, PLAYED ON A PHONE (card CT; `?manual=5`, a trial) ═══
 *
 * The owner, 2026-11-23: "The left joystick rotates the character
 * directionally if pressed at or below about 30% from center and begin
 * walking in the pointed direction if moved further."  Played with REAL
 * touches (the browser's own touch input, CDP Input.dispatchTouchEvent), in
 * the Wheel's BroTown, upright AND sideways, each touch landing at the left
 * disc's centre:
 *
 * PART 1 (PR 2, tag 6541): THE LEFT STICK
 *   1a. `?manual=5` plays the two buttons, and the disc draws the turn's
 *       border as a ring at 30% of its drawn radius;
 *   1b. a thumb at 20% of the drawn radius, pointed west, TURNS the body
 *       west (the facing drawn, and the facing angle) and does not walk;
 *   1c. lifted: the stick at rest, the body still faces west (the turn is a
 *       facing, not a pose);
 *   1d. a thumb at 70% WALKS that way;
 *   1e. lifted: at rest, the walk stopped;
 *   1f. a fast flick (120 px) is the dodge roll (the swipe judged first;
 *       its four touches sent to the zone's listeners in one task: see 1f);
 *   1g. no page errors.
 *
 * PART 2 (PR 3, tag 6542): THE RIGHT SIDE -- Attack, a latch
 *   (the character first let past the Mayor's gate, tut_1: a new one is
 *   held in BroTown's safe circle, and the nearest monster is outside it)
 *   2a. a real monster of the Wheel, the body turned toward it by the stick
 *       (a 20% turn): SIGHTED (game/sight.js);
 *   2b. ONE press of Attack (the disc, at its centre) and the lift: the
 *       latch active, the monster locked (targeting.js: the latch's lock),
 *       the held attack on with no thumb down, the disc pressed in
 *       (data-latch on);
 *   2c. the stick walks you in while locked (the body walks toward it: a
 *       Wheel monster wanders; the rest by the harness's hop, and in the
 *       fight a keeper inside the page holds you beside it: this box's few
 *       frames, a held attack's half walk),
 *       then the fight plays itself to
 *       the monster's death (the worker brings it
 *       near its floor first, /dev/hurt, so a test box's few frames a second
 *       finish it): the latch's end 'killed', or the lock moved to the next
 *       (v2.3.6542: a SKIP with the frame time where the page drew frames
 *       wider than the blade's contact window and no swing reached its hit
 *       test: TRAPS §200);
 *   2d. the SECOND press (the lock moved on to the next) lets go, or the
 *       kill with none other in sight let go by itself: the latch idle, the
 *       held attack off, the disc raised (data-latch off);
 *   2e. a tap on the world's right half attacks nothing (Attack is the
 *       attack);
 *   2f. the mode off (`?manual=4`, today's default): the right half is the
 *       held attack again (held: on; lifted: off), no data-latch;
 *   2g. no page errors.
 *
 * PART 3 (PR 4, tag 6543): THE SIGHT LINE, AND BLOCK AND THE SPECIALS
 *   (a shield in hand, the latch idle; the body held on the line in front
 *   of a real monster by a keeper inside the page, on its own clock, at a
 *   distance that follows a path: far, in, back and forth across the edge,
 *   out.  A page-side watcher counts every time Block or Special comes or
 *   goes, each change of the DOM, and every change of the sight's phase)
 *   3a. far off (700 px), nothing in sight: the right side is Attack and
 *       Jump only (no Block, no Special, no Whirlwind) and no line drawn;
 *   3b. walked in to 435 px (inside the sword's 440): sighted, the line
 *       drawn to that monster, Block and Special on screen around Attack;
 *   3c. walked back and forth between 435 and 545 px (inside the 550 the
 *       sight is held to) six times: the buttons and the phase never
 *       changed (no flicker at the edge);
 *   3d. out to 700 px: the phase gone, the line gone, Block and Special gone,
 *       each in ONE change (came once, went once over the whole walk);
 *   3e. the mode off (part 2f's page, mode 4): with a shield and a sword
 *       Block comes by today's rule (a monster within reach), no sight
 *       line, the resolver not asked to hide it.
 *
 * Today's stick with the mode off is played by mp-sprint (the thumb and the
 * button together) and mp-heldcombat (the default, mode 4).
 */
import * as H from './harness.mjs';
export const lane = 'full';

const UPRIGHT = { width: 390, height: 844 };
/* v2.3.6542: H.readState passes the page's S alone: an argument goes into the function's text */
const bind = (fn, arg) => ({ toString: () => `(S) => (${fn.toString()})(S, ${JSON.stringify(arg)})` });
/* v2.3.6543: a monster AND the side to come at it from, chosen so no other
   live monster is near the path (the third run: 2b/2c upright locked another
   of the pack, and part 3 found no monster 1300 px from its nearest neighbour
   among those the phone knows: 548 and 582).  For each live monster and each
   of the eight drawn facings, the body's points on the path (dMin to dMax out,
   facing it) and the nearest OTHER live monster to any of them: the pair with
   the most room wins (within maxD of the body). */
const PICK = (S, o) => {
  const FACE = { east: 0, southeast: Math.PI / 4, south: Math.PI / 2, southwest: 3 * Math.PI / 4, west: Math.PI, northwest: -3 * Math.PI / 4, north: -Math.PI / 2, northeast: -Math.PI / 4 };
  const P0 = S.player, live = (S.monsters || []).filter((m) => m && m.alive && (m.curHp > 0 || m.curHp == null));
  let best = null;
  for (const m of live) {
    const d = Math.hypot(m.x - P0.x, m.y - P0.y);
    if (d > o.maxD) continue;
    let nn = Infinity;
    for (const q of live) if (q !== m) nn = Math.min(nn, Math.hypot(q.x - m.x, q.y - m.y));
    for (const face of Object.keys(FACE)) {
      const a = FACE[face];
      let room = Infinity;
      for (let s = o.dMin; s <= o.dMax; s += 30) {
        const x = m.x - Math.cos(a) * s, y = m.y - Math.sin(a) * s;
        for (const q of live) if (q !== m) room = Math.min(room, Math.hypot(q.x - x, q.y - y));
      }
      if (!best || room > best.room || (room === best.room && d < best.d)) best = { id: String(m.id), x: m.x, y: m.y, d, face, a, room: Math.round(room), nn: Math.round(nn) };
    }
  }
  return best;
};
const SIDEWAYS = { width: 844, height: 390 };

/* the left disc's drawn box and the turn ring's */
const DISC = (P) => P.page.evaluate(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height }; };
  return { base: r(document.querySelector('.bt-joystick-base')), ring: r(document.querySelector('[data-turnring]')) };
});

/* what the stick, the walk and the facing are now */
const STICK = (P) => H.readState(P, (S) => ({
  phase: S._stickPhase || 'rest', sx: S.stickX || 0, sy: S.stickY || 0,
  x: S.player.x, y: S.player.y, facing: S._renderFacing || null,
  ang: S._facingAngle, roll: !!S._dodgeRoll,
}));

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  try {
    for (const [label, viewport] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]]) {
      const P = await H.newPlayer(browser, { name: label === 'upright' ? 'Twobro' : 'Sidebro', wsPort, webPort, viewport, touch: true, dpr: 3, world: 'wheel', query: 'manual=5&wheelwhole' });   /* v2.3.6542: wheelwhole: every Wheel monster in the arrival's list (server/src/wheelnear.js; mp-blockcost's), for part 2's real monster */
      players.push(P);
      P.page.on('pageerror', (e) => errs.push(label + ': ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
        { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      rec.ok(`${label}: in the Wheel (guard)`, !!inW, inW);
      if (!inW) continue;
      await P.page.waitForTimeout(2000);
      const cdp = await P.ctx.newCDPSession(P.page);
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });

      /* 1a */
      const mode = await P.page.evaluate(() => window.__btManual.mode());
      const D = await DISC(P);
      const R = D.base ? D.base.w / 2 : 0;
      rec.ok(`1a. ${label}: \`?manual=5\` plays the two buttons (mode ${mode}); the ring at 30% of the drawn radius (${D.ring && D.ring.w / 2} of ${R} px)`,
        mode === 5 && !!D.ring && R > 0 && Math.abs(D.ring.w / 2 - 0.3 * R) < 1.5 && Math.abs(D.ring.x - D.base.x) < 1 && Math.abs(D.ring.y - D.base.y) < 1, D);
      if (!D.base) continue;
      const c = { x: D.base.x, y: D.base.y, id: 1 };

      /* 1b: 20% west, held */
      await touch('touchStart', [c]);
      await P.page.waitForTimeout(80);
      await touch('touchMove', [{ x: c.x - 0.2 * R, y: c.y, id: 1 }]);
      const t0 = await STICK(P);
      /* the body slews to its facing a share a frame (visualSystems), and this
         box draws a few frames a second: wait on the renderer, not a clock (TRAPS 200) */
      await H.waitFor(P, (S) => S._renderFacing, (v) => v === 'west', { timeout: 10000, label: 'facing west' }).catch(() => null);
      const t1 = await STICK(P);
      const moved = Math.hypot(t1.x - t0.x, t1.y - t0.y);
      rec.ok(`1b. ${label}: a thumb at 20% turns the body west (${t1.phase}, faces ${t1.facing}, angle ${t1.ang && t1.ang.toFixed(2)}) and does not walk (${moved.toFixed(1)} px)`,
        t1.phase === 'turn' && t1.sx === 0 && t1.sy === 0 && t1.facing === 'west' && Math.abs(Math.abs(t1.ang) - Math.PI) < 0.35 && moved < 1, { t0, t1 });

      /* 1c */
      await touch('touchEnd', [{ x: c.x - 0.2 * R, y: c.y, id: 1 }]);
      await P.page.waitForTimeout(700);
      const t2 = await STICK(P);
      rec.ok(`1c. ${label}: lifted, the stick at rest and the body still faces west (${t2.facing})`, t2.phase === 'rest' && t2.facing === 'west', t2);

      /* 1d: 70% east, held (a slow push: not a swipe) */
      await touch('touchStart', [c]);
      await P.page.waitForTimeout(80);
      for (let k = 1; k <= 7; k++) { await touch('touchMove', [{ x: c.x + 0.1 * k * R, y: c.y, id: 1 }]); await P.page.waitForTimeout(40); }
      const w0 = await STICK(P);
      await P.page.waitForTimeout(900);
      const w1 = await STICK(P);
      const walked = Math.hypot(w1.x - w0.x, w1.y - w0.y);
      rec.ok(`1d. ${label}: a thumb at 70% walks that way (${w1.phase}, stick ${w1.sx.toFixed(2)}, ${walked.toFixed(1)} px)`,
        w1.phase === 'walk' && w1.sx > 0.4 && Math.abs(w1.sy) < 0.01 && (walked > 4 || w1.x > w0.x), { w0, w1 });

      /* 1e */
      await touch('touchEnd', [{ x: c.x + 0.7 * R, y: c.y, id: 1 }]);
      await P.page.waitForTimeout(300);
      const e0 = await STICK(P);
      await P.page.waitForTimeout(500);
      const e1 = await STICK(P);
      rec.ok(`1e. ${label}: lifted, at rest and the walk stopped`, e1.phase === 'rest' && e1.sx === 0 && e1.sy === 0 && Math.hypot(e1.x - e0.x, e1.y - e0.y) < 2, { e0, e1 });

      /* 1f: a fast flick */
      await P.page.waitForTimeout(1200);
      const before = await P.page.evaluate(() => Date.now());
      /* The one gesture NOT sent through CDP: on this box each CDP touch waits
         behind a frame of a few hundred ms, so a flick's release lands past the
         swipe's 300 ms (and moves sent with no frame between are coalesced into
         a tap).  So the flick's four touches go to the movement zone's own
         listeners in one task, at the disc's centre, 120 px in about 40 ms of
         the page's clock (TRAPS 200: time by the page, not by this script). */
      await P.page.evaluate(async ({ x, y }) => {
        const el = document.querySelector('[data-joyzone="L"]');
        const mk = (t, cx) => new TouchEvent(t, { bubbles: true, cancelable: true,
          touches: t === 'touchend' ? [] : [new Touch({ identifier: 61, target: el, clientX: cx, clientY: y })],
          changedTouches: [new Touch({ identifier: 61, target: el, clientX: cx, clientY: y })] });
        const until = (ms) => { const e = performance.now() + ms; while (performance.now() < e) { /* the page's own clock */ } };
        el.dispatchEvent(mk('touchstart', x));
        for (const k of [40, 80, 120]) { until(12); el.dispatchEvent(mk('touchmove', x + k)); }
        el.dispatchEvent(mk('touchend', x + 120));
      }, { x: c.x, y: c.y });
      /* the roll's own stamp (game/dodge.js), not the roll itself: it is over in a few of this box's frames */
      await P.page.waitForTimeout(600);
      const f = await H.readState(P, (S) => ({ flash: S._dodgeFlash || 0, stamina: S.rpg && S.rpg.stamina }));
      rec.ok(`1f. ${label}: a fast flick is the dodge roll (the swipe judged first)`, f.flash >= before, { before, ...f });
      await P.page.waitForTimeout(800);

      /* ── PART 2: the right side ── */
      const me = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 8 });
      /* v2.3.6542: past the Mayor's gate (mp-crowdfight's way).  A new
         character is held inside BroTown's safe circle until the first quest
         (game/wheelHome.js wheelCommonsGate: every step out pulled back to the edge, the
         body's speed 0), and the nearest monster stands just outside it: the
         stick and the keeper both walked into the gate (part 6's write-watch:
         the walk's step, then the gate's pull back, each frame) */
      await H.devOp(wsPort, 'quests', me).catch(() => null);
      await P.page.evaluate(() => {
        const keep = () => {
          const S = window._gameState && window._gameState.current, R = S && S.rpg;
          if (!R) return;
          if (!R._quests || typeof R._quests !== 'object') R._quests = {};
          if (!R._quests.tut_1) R._quests.tut_1 = true;
        };
        keep();
        clearInterval(window.__ctGateOpen);
        window.__ctGateOpen = setInterval(keep, 100);
      });
      await H.devOp(wsPort, 'kit', me, { what: 'weapons' });   /* a new character has no weapon (mp-arena's way) */
      await H.waitFor(P, (S) => ((S.rpg && S.rpg.weaponStash) || []).some((w) => w && w.type === 'greatsword') || !!(S.rpg && S.rpg.weapon), (v) => v, { timeout: 15000, label: 'the kit' }).catch(() => null);
      const eq = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch((e) => ({ ok: false, why: String(e) }));   /* the held attack swings only an equipped weapon (monsterCombat _eqWpn) */
      rec.ok(`2. ${label}: a sword in hand (guard)`, !!(eq && eq.ok), eq);
      /* v2.3.6543: the monster with room round the walk in (PICK: 60 to 420 px
         out, the sight's 550 held plus a wander, 650 px from any other) */
      const mon0 = await H.readState(P, bind(PICK, { dMin: 60, dMax: 420, maxD: 3000 }));
      rec.ok(`2. ${label}: a real monster of the Wheel with no other near its path (${mon0 && mon0.room} px; guard)`, !!mon0 && mon0.room >= 650, mon0);
      if (!mon0 || mon0.room < 650) continue;
      await H.hopTo(P, Math.round(mon0.x - 170 * Math.cos(mon0.a)), Math.round(mon0.y - 170 * Math.sin(mon0.a)), { tries: 90 });
      await P.page.waitForTimeout(1200);
      const near = await H.readState(P, bind((S, id) => { const m = (S.monsters || []).find((x) => x && String(x.id) === id); return m ? { mx: m.x, my: m.y, px: S.player.x, py: S.player.y } : null; }, mon0.id));
      /* 2a: turn toward it with the stick, 20% of the drawn radius */
      const ang = near ? Math.atan2(near.my - near.py, near.mx - near.px) : 0;
      await touch('touchStart', [c]);
      await P.page.waitForTimeout(80);
      await touch('touchMove', [{ x: c.x + 0.2 * R * Math.cos(ang), y: c.y + 0.2 * R * Math.sin(ang), id: 1 }]);
      await P.page.waitForTimeout(600);
      await touch('touchEnd', [{ x: c.x + 0.2 * R * Math.cos(ang), y: c.y + 0.2 * R * Math.sin(ang), id: 1 }]);
      const seen = await H.waitFor(P, (S) => ({ phase: S._sightPhase || 'none', id: S._sightId == null ? null : String(S._sightId) }),
        (v) => v.phase === 'sighted' && v.id != null, { timeout: 15000, label: 'sighted' }).catch(() => null);
      rec.ok(`2a. ${label}: turned toward a monster (${near ? Math.round(Math.hypot(near.mx - near.px, near.my - near.py)) : '?'} px), it is sighted`, !!seen, { seen, near });
      if (!seen) continue;
      const target = seen.id;

      /* 2b: ONE press of Attack, at the disc's centre, and the lift */
      const RD = await P.page.evaluate(() => { const el = document.querySelector('.bt-rjoy-base'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; });
      rec.ok(`2b. ${label}: Attack is on screen (${RD && Math.round(RD.w)} px)`, !!RD && RD.w > 20, RD);
      if (!RD) continue;
      const press = async () => { await touch('touchStart', [{ x: RD.x, y: RD.y, id: 2 }]); await P.page.waitForTimeout(120); await touch('touchEnd', [{ x: RD.x, y: RD.y, id: 2 }]); await P.page.waitForTimeout(400); };
      const LATCH = (P) => H.readState(P, (S) => {
        const el = document.querySelector('.bt-rjoy-base');
        const lt = S.lockedTarget;
        return { phase: S._latchPhase || 'idle', id: S._latchId == null ? null : String(S._latchId), end: S._latchEnd || null,
          lock: lt && lt.ref ? String(lt.id) : null, latchLock: !!(lt && lt.latch), auto: !!S.autoAttack,
          look: el ? el.getAttribute('data-latch') : null, taps: S._tapAttacks || 0 };
      });
      await press();
      const b1 = await H.waitFor(P, (S) => !!(S.lockedTarget && S.lockedTarget.latch), (v) => v, { timeout: 8000, label: 'the latch\'s lock' }).catch(() => null);
      const l1 = await LATCH(P);
      rec.ok(`2b. ${label}: one press: the latch active on it, locked, attacking with no thumb down, the disc pressed in (${l1.phase}, ${l1.lock}, ${l1.look})`,
        !!b1 && l1.phase === 'active' && l1.id === target && l1.lock === target && l1.latchLock && l1.auto && l1.look === 'on', { ...l1, target, b1: !!b1 });

      /* 2c: walk in with the stick (real touches, 70%, re-aimed each half
         second; the lock turns the body to it), then the fight to its death
         (brought near its floor by the worker) */
      const GAP = (P) => H.readState(P, bind((S, id) => { const m = (S.monsters || []).find((x) => x && String(x.id) === id); return m ? { d: Math.hypot(m.x - S.player.x, m.y - S.player.y), a: Math.atan2(m.y - S.player.y, m.x - S.player.x), px: S.player.x, py: S.player.y } : null; }, target));
      let g = await GAP(P);
      const gPress = g;
      /* v2.3.6542: the walk's trace (part 6's red: the body moved 32 px with
         the gap closing 9): what the stick said, what the body did, each
         half second -- the evidence the next red reads */
      const walkTrace = [];
      const STK = (P) => H.readState(P, (S) => ({ sx: +(S.stickX || 0).toFixed(2), sy: +(S.stickY || 0).toFixed(2), x: Math.round(S.player.x), y: Math.round(S.player.y),
        vx: +(S.player.vx || 0).toFixed(2), vy: +(S.player.vy || 0).toFixed(2), auto: !!S.autoAttack, climb: !!S._climb, swim: !!(S._wheelSwim && S._wheelSwim.on), air: !!S._jump, back: !!S._backpedaling,
        hold: [S._zoneLoading, S._netHold, S._townArtHold, S._farmArtHold, S._avatarArtHold, S._sled, S._shieldUp, S._extraction, S._dodgeRoll].map((v) => (v ? 1 : 0)).join(''),
        clk: ['_playerStunUntil', '_lootFreezeUntil', '_stuckUntil', '_dazeUntil', '_frozenUntil', '_chillUntil', '_slowUntil', '_spdBuff'].filter((k) => S[k] && Date.now() < S[k]).join(','),
        bf: !!(S._bf && S._bf.view), stf: !!(S._stf && S._stf.g), dt: S._dtScale, ag: S.rpg && S.rpg.agility, swing: !!S.isSwinging, ride: !!S._ride, race: !!S._race, aim: S._aimAngle == null ? null : +S._aimAngle.toFixed(2) }));
      if (g && g.d > 90) {
        await touch('touchStart', [c]);
        await P.page.waitForTimeout(80);
        for (let k = 0; k < 16 && g && g.d > 90; k++) {
          await touch('touchMove', [{ x: c.x + 0.7 * R * Math.cos(g.a), y: c.y + 0.7 * R * Math.sin(g.a), id: 1 }]);
          await P.page.waitForTimeout(500);
          g = await GAP(P);
          walkTrace.push(await STK(P));
        }
        await touch('touchEnd', [{ x: c.x, y: c.y, id: 1 }]);
      }
      const g0 = await GAP(P);
      /* v2.3.6542: what the STICK did, the body's walk toward the monster
         (along the line at the press), not the gap: a Wheel monster wanders,
         and one walking off faster than a held attack's halved walk grew the
         gap with the stick walking you in all the same (the helper's run:
         341 -> 372 px upright, 238 -> 329 sideways) */
      const toward = g && gPress ? (g.px - gPress.px) * Math.cos(gPress.a) + (g.py - gPress.py) * Math.sin(gPress.a) : 0;
      /* v2.3.6543: the lock held, or it held to the monster's death on the walk in
         (a monster that starts within reach is killed by the latch before the
         check: the first run of part 3, upright, the gap 90 px: the end
         'killed', the latch's own) */
      const lockHeld = (l) => l.phase === 'active' || l.end === 'killed';
      rec.ok(`2c. ${label}: the stick walks you in while locked (${Math.round(toward)} px toward it; the gap ${g ? Math.round(g.d) : '?'} px), the lock held`, !!g && (g.d <= 90 || toward > 20) && lockHeld(await LATCH(P)), { gPress, g, toward, walkTrace });
      /* this box draws a few frames a second and a held attack halves the
         walk (mode 4's rule, kept): the rest of the way by the harness's hop */
      if (g0 && g0.d > 90) {
        const m1 = await H.readState(P, bind((S, id) => { const m = (S.monsters || []).find((x) => x && String(x.id) === id); return m ? { x: m.x, y: m.y } : null; }, target));
        if (m1) await H.hopTo(P, Math.round(m1.x - 50 * Math.cos(g0.a)), Math.round(m1.y - 50 * Math.sin(g0.a)), { tries: 30 });
      }
      const afterHop = { latch: await LATCH(P), gap: await GAP(P), stk: await STK(P) };
      const hp = await H.readState(P, bind((S, id) => { const m = (S.monsters || []).find((x) => x && String(x.id) === id); return m ? (m.curHp != null ? m.curHp : m.hp) : null; }, target));
      const hurt = typeof hp === 'number' && hp > 2 ? await H.devOp(wsPort, 'hurt', me, { id: target, dmg: Math.floor(hp) - 1 }).catch((e) => ({ err: String(e) })) : { hp };
      /* the monster at 1 hp walks off: the harness keeps you beside it, the
         latch does the rest.  v2.3.6542: the keeping runs INSIDE the page, on
         its own clock (glideTo's way): every 100 ms the body steps up to
         40 px toward where the monster IS, to within 30 px (400 px/s, under
         the worker's 500 px/s move budget), until it dies or 90 s pass.  A
         hop by evaluate from here (one round trip a 100 px step, 1-3 s on
         this box) fell behind a monster walking off: 282 px both ways, the
         sword swinging at air (the helper's run) */
      await P.page.evaluate((id) => {
        const until = Date.now() + 90000, t0 = Date.now();
        /* v2.3.6542: the fight's trace, every second and at the keeper's stop */
        const tr = window._ctFight = { stop: null, trace: [], contacts: 0, frameMs: null };
        let k10 = 0, swings = 0, swWas = null, cWas = null;
        /* v2.3.6542: the box's frame by the renderer's clock (TRAPS §200):
           the median gap between animation frames over the fight */
        const gaps = []; let fLast = 0, fOn = true;
        const fr = (ts) => { if (fLast && gaps.length < 400) gaps.push(ts - fLast); fLast = ts; if (fOn) requestAnimationFrame(fr); };
        requestAnimationFrame(fr);
        const t = setInterval(() => {
          const S = window._gameState && window._gameState.current;
          if (S && S.swingTimer && S.swingTimer !== swWas) { swWas = S.swingTimer; swings++; }
          /* v2.3.6542: a swing whose blade reached its hit test.  The game's
             own witness: monsterCombat stamps S._propSwingAt with the swing's
             timer on the one frame its contact opens (MELEE_CONTACT_MS, 120 ms
             in) while the swing still runs (under 400 ms) -- the same gate
             as the monster test beside it.  A page whose frames come further
             apart than that window never draws that frame, and the sword
             cuts air on every swing (the helper's run on ea3175e7, sideways:
             43 swings in 90 s, the lock on a fishman 25 px off at 1 hp, the
             hit flag never seen) */
          if (S && S._propSwingAt && S._propSwingAt !== cWas) { cWas = S._propSwingAt; tr.contacts++; }
          const m = S && (S.monsters || []).find((x) => x && String(x.id) === id);
          const row = () => ({ t: Date.now() - t0, here: !!m, alive: m ? m.alive : null, hp: m ? m.curHp : null, gap: m ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null,
            lid: S && S._latchId != null ? String(S._latchId) : null, ph: S && S._latchPhase, auto: !!(S && S.autoAttack), n: S ? (S.monsters || []).length : null, px: S ? Math.round(S.player.x) : null, py: S ? Math.round(S.player.y) : null, vx: S ? +(S.player.vx || 0).toFixed(2) : null,
            sw: swings, rdx: m && typeof m.renderX === 'number' ? Math.round(m.renderX - m.x) : 'none', rdy: m && typeof m.renderY === 'number' ? Math.round(m.renderY - m.y) : 'none',
            aim: S && S._aimAngle != null ? +S._aimAngle.toFixed(2) : null, ang: m ? +Math.atan2(m.y - S.player.y, m.x - S.player.x).toFixed(2) : null,
            hit: m ? !!m._hitThisSwing : null, inv: m ? !!m._invulnerable : null, arch: m ? (m.archetype || m.type) : null });
          if ((++k10 % 10 === 0 || k10 === 1) && tr.trace.length < 100) tr.trace.push(row());
          if (!S || !m || !m.alive || m.curHp <= 0 || Date.now() > until) {
            fOn = false; const gs = gaps.slice().sort((a, b) => a - b);
            tr.frameMs = gs.length ? Math.round(gs[gs.length >> 1]) : null;
            tr.stop = Object.assign(row(), { contacts: tr.contacts, frameMs: tr.frameMs }); clearInterval(t); return;
          }
          const dx = m.x - S.player.x, dy = m.y - S.player.y, d = Math.hypot(dx, dy);
          if (d <= 30) return;
          const k = Math.min(40, d - 25);
          S.player.x += (dx / d) * k; S.player.y += (dy / d) * k;
        }, 100);
      }, target);
      const FIGHT = bind((S, id) => { const m = (S.monsters || []).find((x) => x && String(x.id) === id);
        return { end: S._latchEnd || null, id: S._latchId == null ? null : String(S._latchId), dead: !(m && m.alive && !(m.curHp <= 0)),
          gap: m ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null }; }, target);
      const died = await H.waitFor(P, FIGHT, (f) => f.dead && (f.end === 'killed' || (f.id && f.id !== target)), { timeout: 95000, label: 'the fight to its death' }).catch(() => null);
      const l2 = await LATCH(P);
      const why = await H.readState(P, bind((S, id) => { const m = (S.monsters || []).find((x) => x && String(x.id) === id);
        return { wpn: !!(S.rpg && S.rpg.weapon), slot: S.rpg && S.rpg.activeSlot, swim: !!(S._wheelSwim && S._wheelSwim.on), swungAgo: S.swingTimer ? Date.now() - S.swingTimer : null,
          gap: m ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null, mhp: m ? m.curHp : null }; }, target));
      const fightTrace = died ? null : await P.page.evaluate(() => window._ctFight || null);
      const fightName = `2c. ${label}: the fight played to its death with no press (the end: ${l2.end || (l2.id === target ? 'none: still on it' : 'moved to ' + l2.id)})`;
      /* v2.3.6542: TRAPS §200.  Where this page never drew one frame inside
         the blade's contact window (no swing reached its hit test), the
         fight cannot be judged here: a skip with the frame time, never a
         pass, and only when the median frame is wider than that window
         (280 ms).  No contact on a faster page, or one swing that reached its hit test and a monster still
         alive at 1 hp is the game's, and stays red */
      if (!died && fightTrace && fightTrace.stop && fightTrace.contacts === 0 && fightTrace.stop.sw >= 5 && fightTrace.frameMs >= 400 - 120) {
        rec.skip(fightName, `this page drew a frame every ${fightTrace.frameMs} ms (its median over the fight): ${fightTrace.stop.sw} swings and not one frame inside the blade's contact window (${120}-${400} ms into a swing), so no swing reached its hit test; the lock held (${l2.id}), ${fightTrace.stop.gap} px off`);
      } else rec.ok(fightName, !!died, { died, l2, hurt, why, afterHop, fightTrace });

      /* 2d: the second press lets go (when the lock moved on to the next);
         a kill with none other in sight let go by itself ('killed') */
      const lockMoved = l2.phase === 'active';
      if (lockMoved) await press();
      else await P.page.waitForTimeout(400);
      const l3 = await LATCH(P);
      rec.ok(`2d. ${label}: ${lockMoved ? 'the second press lets go' : 'the kill let go by itself'}: idle (${l3.end}), the held attack off, the disc raised (${l3.look})`,
        l3.phase === 'idle' && l3.end === (lockMoved ? 'press' : 'killed') && !l3.auto && l3.look === 'off' && !l3.latchLock, l3);

      /* 2e: a tap on the world's right half attacks nothing */
      const tz = await P.page.evaluate(() => { const el = document.querySelector('[data-joyzone="R"]'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width * 0.5, y: b.top + b.height * 0.35 }; });
      const tapsBefore = (await LATCH(P)).taps;
      if (tz) { await touch('touchStart', [{ x: tz.x, y: tz.y, id: 3 }]); await P.page.waitForTimeout(60); await touch('touchEnd', [{ x: tz.x, y: tz.y, id: 3 }]); await P.page.waitForTimeout(800); }
      const l4 = await LATCH(P);
      rec.ok(`2e. ${label}: a tap on the world's right half attacks nothing`, !!tz && l4.taps === tapsBefore && !l4.auto && l4.phase === 'idle', { tz, tapsBefore, l4 });

      /* ── PART 3: the sight line, and Block and the specials ── */
      /* the kit's shield lands in the stash: worn the bag's way (the UI
         review's armForFight; shieldWear.js) */
      await H.devOp(wsPort, 'kit', me, { what: 'shield' }).catch(() => null);
      const wear = () => P.page.evaluate(() => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return false;
        if (R.shield) return true;
        if (!Array.isArray(R.shieldStash) || !R.shieldStash.length) return false;
        const sh = R.shieldStash.shift();
        R.shield = sh;
        if (S.channel && S._serverCaps && S._serverCaps.shieldwear) {
          const payload = (typeof sh.gid === 'string' && sh.gid) ? { gid: sh.gid }
            : { sig: [sh.name || '', sh.gearBase || '', sh.tierMult == null ? '' : sh.tierMult, sh.tier || ''].join('|') };
          try { S.channel.send({ type: 'shield_wear', payload }); } catch (e) { /* the next change reports it */ }
        }
        return true;
      });
      let shieldOn = false;
      for (let k = 0; k < 60 && !shieldOn; k++) { shieldOn = await wear(); if (!shieldOn) await P.page.waitForTimeout(250); }
      rec.ok(`3. ${label}: a shield in hand (guard)`, !!shieldOn);
      /* v2.3.6543: a monster with ROOM round the path (the second run: at
         700 px from the one chosen, another of its pack was in sight 350-460
         px off, and the sight is the phone's, of every monster; the third: no
         monster 1300 px from its nearest neighbour among those the phone
         knows).  PICK: the body's points 400 to 730 px out on the side chosen,
         650 px from any other live monster (the sight's 550 held, and a
         wander); then the body turned to face it from that side, so the
         keeper's line (the drawn facing's) is that side */
      const mon3 = await H.readState(P, bind(PICK, { dMin: 400, dMax: 730, maxD: 4000 }));
      rec.ok(`3. ${label}: a live monster with no other near the path (${mon3 && mon3.room} px, from the ${mon3 && mon3.face}; guard)`, !!mon3 && mon3.room >= 650, mon3);
      if (!mon3 || mon3.room < 650) continue;
      await H.hopTo(P, Math.round(mon3.x - 700 * Math.cos(mon3.a)), Math.round(mon3.y - 700 * Math.sin(mon3.a)), { tries: 260 });
      await P.page.waitForTimeout(1500);
      await touch('touchStart', [c]);
      await P.page.waitForTimeout(80);
      await touch('touchMove', [{ x: c.x + 0.2 * R * Math.cos(mon3.a), y: c.y + 0.2 * R * Math.sin(mon3.a), id: 1 }]);
      const faced = await H.waitFor(P, (S) => S._renderFacing, (v) => v === mon3.face, { timeout: 10000, label: 'facing ' + mon3.face }).catch(() => null);
      await touch('touchEnd', [{ x: c.x + 0.2 * R * Math.cos(mon3.a), y: c.y + 0.2 * R * Math.sin(mon3.a), id: 1 }]);
      rec.ok(`3. ${label}: turned to face it from the ${mon3.face} side (guard)`, !!faced, { faced });
      if (!faced) continue;
      /* the keeper and the watcher, inside the page: the body stands on the
         drawn facing's line from the monster (so it is straight ahead,
         whatever way the body faces), at the path's distance, stepping at most
         40 px a 100 ms (400 px/s: the worker's move budget is 500) */
      await P.page.evaluate((id) => {
        const FACE = { east: 0, southeast: Math.PI / 4, south: Math.PI / 2, southwest: 3 * Math.PI / 4, west: Math.PI, northwest: -3 * Math.PI / 4, north: -Math.PI / 2, northeast: -Math.PI / 4 };
        const w = window._ctEdge = { want: 700, at: 700, real: null, phase: [], dom: [], ticks: 0, lost: false, last: Date.now() };
        const shown = () => ({ block: !!document.querySelector('[data-shield]'), special: !!document.querySelector('[data-special]'), ability: !!document.querySelector('[data-ability]') });
        let was = JSON.stringify(shown());
        w.dom.push({ t: Date.now(), v: JSON.parse(was) });
        const mo = w.mo = new MutationObserver(() => { const n = JSON.stringify(shown()); if (n !== was) { was = n; w.dom.push({ t: Date.now(), v: JSON.parse(n), d: Math.round(w.at) }); } });
        mo.observe(document.body, { childList: true, subtree: true });
        let ph = null;
        clearInterval(window.__ctEdgeT);
        window.__ctEdgeT = setInterval(() => {
          const S = window._gameState && window._gameState.current;
          if (!S || !S.player) return;
          const p = S._sightPhase || 'none';
          if (p !== ph) { ph = p; w.phase.push({ t: Date.now(), p, d: Math.round(w.at) }); }
          const m = (S.monsters || []).find((x) => x && String(x.id) === id);
          if (!m || !m.alive) { w.lost = true; return; }
          w.ticks++;
          /* v2.3.6543: stepped by the time since the last step (400 px/s,
             at most 200 px a step), not 40 px a tick: this box's timers run
             a slow frame apart, and the first run's body lagged its path
             (sideways: 335 px off with the path at 700) */
          const t = Date.now(), dt = Math.min(500, t - w.last); w.last = t;
          const step = 0.4 * dt;
          const f = FACE[S._renderFacing];
          const a = typeof f === 'number' ? f : (typeof S._facingAngle === 'number' ? S._facingAngle : Math.PI / 2);
          w.at += Math.max(-step, Math.min(step, w.want - w.at));
          const tx = m.x - Math.cos(a) * w.at, ty = m.y - Math.sin(a) * w.at;
          const dx = tx - S.player.x, dy = ty - S.player.y, dd = Math.hypot(dx, dy);
          const k = Math.min(dd, step);
          if (dd > 0.5) { S.player.x += (dx / dd) * k; S.player.y += (dy / dd) * k; }
          w.real = Math.hypot(m.x - S.player.x, m.y - S.player.y);
        }, 100);
      }, mon3.id);
      const EDGE = (P) => P.page.evaluate(() => {
        const w = window._ctEdge, S = window._gameState && window._gameState.current;
        const ln = window.__btSightLine ? window.__btSightLine() : null;
        return { at: Math.round(w.at), real: w.real == null ? null : Math.round(w.real), phase: S && S._sightPhase || 'none', id: S && S._sightId != null ? String(S._sightId) : null, line: ln,
          block: !!document.querySelector('[data-shield]'), special: !!document.querySelector('[data-special]'), ability: !!document.querySelector('[data-ability]'),
          attack: !!document.querySelector('.bt-rjoy-base'), jump: !!document.querySelector('[data-jump]'), latch: S && S._latchPhase || 'idle',
          phases: w.phase.length, doms: w.dom.length, lost: w.lost, ticks: w.ticks };
      });
      const walkTo = async (d, holdMs) => {
        await P.page.evaluate((x) => { window._ctEdge.want = x; }, d);
        /* the body there, by the real distance (the path's and the body's) */
        await H.waitFor(P, () => ({ at: Math.round(window._ctEdge.at), real: window._ctEdge.real }), (v) => v.at === d && v.real != null && Math.abs(v.real - d) < 12, { timeout: 30000, label: 'at ' + d }).catch(() => null);
        if (holdMs) await P.page.waitForTimeout(holdMs);
      };
      /* 3a */
      await walkTo(700, 1500);
      await H.waitFor(P, (S) => S._sightPhase || 'none', (v) => v === 'none', { timeout: 8000, label: 'nothing in sight' }).catch(() => null);
      await P.page.waitForTimeout(600);   /* the buttons' 200 ms render tick, twice and more */
      const q0 = await EDGE(P);
      rec.ok(`3a. ${label}: far off (${q0.at} px), nothing in sight: Attack and Jump only (Block ${q0.block}, Special ${q0.special}, Whirlwind ${q0.ability}), no line`,
        q0.phase === 'none' && q0.attack && q0.jump && !q0.block && !q0.special && !q0.ability && !!q0.line && !q0.line.drawn && q0.latch === 'idle', q0);
      const marks = await P.page.evaluate(() => ({ p: window._ctEdge.phase.length, d: window._ctEdge.dom.length }));
      /* 3b: in to 435; this box draws a frame every few hundred ms, so wait on the page's own sight (TRAPS 200) */
      await walkTo(435, 0);
      const s1 = await H.waitFor(P, (S) => S._sightPhase || 'none', (v) => v === 'sighted', { timeout: 15000, label: 'sighted at 435' }).catch(() => null);
      await H.waitFor(P, () => !!document.querySelector('[data-shield]') && !!document.querySelector('[data-special]'), (v) => v, { timeout: 8000, label: 'Block and Special' }).catch(() => null);
      await H.waitFor(P, () => !!(window.__btSightLine && window.__btSightLine().drawn), (v) => v, { timeout: 8000, label: 'the line' }).catch(() => null);
      const q1 = await EDGE(P);
      rec.ok(`3b. ${label}: walked in to ${q1.at} px: sighted, the line drawn to it (${q1.line && q1.line.len} px), Block and Special around Attack`,
        !!s1 && q1.phase === 'sighted' && q1.id === mon3.id && !!q1.line && q1.line.drawn && q1.line.id === mon3.id && Math.abs(q1.line.len - 435) < 60 && q1.block && q1.special && q1.attack && q1.jump, q1);
      /* 3c: back and forth across the edge, inside the held 550 */
      const mid = await P.page.evaluate(() => ({ p: window._ctEdge.phase.length, d: window._ctEdge.dom.length }));
      for (let k = 0; k < 6; k++) { await walkTo(545, 300); await walkTo(435, 300); }
      const q2 = await EDGE(P);
      const w2 = await P.page.evaluate(() => ({ phase: window._ctEdge.phase.slice(-6), dom: window._ctEdge.dom.slice(-6) }));
      rec.ok(`3c. ${label}: back and forth between 435 and 545 px six times: no change of the phase (${q2.phases - mid.p}) or the buttons (${q2.doms - mid.d}), still sighted with the line`,
        q2.phases === mid.p && q2.doms === mid.d && q2.phase === 'sighted' && q2.block && q2.special && q2.line && q2.line.drawn && !q2.lost, { q2, w2 });
      /* 3d: out */
      await walkTo(700, 0);
      await H.waitFor(P, (S) => S._sightPhase || 'none', (v) => v === 'none', { timeout: 15000, label: 'lost at 700' }).catch(() => null);
      await H.waitFor(P, () => !document.querySelector('[data-shield]') && !document.querySelector('[data-special]'), (v) => v, { timeout: 8000, label: 'Block and Special gone' }).catch(() => null);
      await P.page.waitForTimeout(600);
      const q3 = await EDGE(P);
      const w3 = await P.page.evaluate(() => { const w = window._ctEdge; clearInterval(window.__ctEdgeT); w.mo.disconnect(); return { phase: w.phase, dom: w.dom }; });
      const domFlips = q3.doms - marks.d;
      rec.ok(`3d. ${label}: out to ${q3.at} px: the phase, the line, Block and Special gone, each in one change (the phase ${q3.phases - marks.p} changes, the buttons ${domFlips} over the whole walk: in, out)`,
        q3.phase === 'none' && q3.line && !q3.line.drawn && !q3.block && !q3.special && q3.phases - marks.p === 2 && domFlips <= 2 && domFlips >= 1, { q3, w3 });
    }

    /* 2f: the mode off -- today's default, the held attack on the right half */
    {
      const Q = await H.newPlayer(browser, { name: 'Fourbro', wsPort, webPort, viewport: UPRIGHT, touch: true, dpr: 3, world: 'wheel', query: 'manual=4' });
      players.push(Q);
      Q.page.on('pageerror', (e) => errs.push('mode 4: ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(Q);
      const inQ = await H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      if (inQ) {
        await Q.page.waitForTimeout(2000);
        const cq = await Q.ctx.newCDPSession(Q.page);
        const tq = (type, pts) => cq.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
        const z = await Q.page.evaluate(() => { const el = document.querySelector('[data-joyzone="R"]'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width * 0.5, y: b.top + b.height * 0.4 }; });
        let held = null, after = null;
        if (z) {
          await tq('touchStart', [{ x: z.x, y: z.y, id: 4 }]);
          for (let k = 1; k <= 4; k++) { await tq('touchMove', [{ x: z.x - 10 * k, y: z.y, id: 4 }]); await Q.page.waitForTimeout(60); }
          held = await H.waitFor(Q, (S) => !!S.autoAttack, (v) => v, { timeout: 6000, label: 'held' }).catch(() => null);
          await tq('touchEnd', [{ x: z.x - 40, y: z.y, id: 4 }]);
          await Q.page.waitForTimeout(500);
          after = await H.readState(Q, (S) => ({ auto: !!S.autoAttack, mode: window.__btManual.mode(), look: (document.querySelector('.bt-rjoy-base') || { getAttribute: () => null }).getAttribute('data-latch') }));
        }
        rec.ok(`2f. the mode off (mode ${after && after.mode}): the right half is the held attack again (held: ${!!held}; lifted: ${after && after.auto}), no data-latch`,
          !!z && !!held && after && !after.auto && after.mode === 4 && after.look === null, { z, held, after });
        /* 3e (v2.3.6543): the mode off, nothing in sight: the resolver hides
           nothing (Block and Special by their own rules alone) and no sight
           line is drawn */
        const off = await Q.page.evaluate(() => ({ shield: window.__btShieldBtn ? window.__btShieldBtn().shown : 'no probe', special: window.__btSpecialBtn ? window.__btSpecialBtn().shown : 'no probe',
          line: window.__btSightLine ? window.__btSightLine().drawn : 'no probe', phase: (window._gameState.current || {})._sightPhase || 'none' }));
        rec.ok(`3e. the mode off: the two buttons' resolver hides nothing (Block ${off.shield}, Special ${off.special}), no sight line (${off.line})`,
          off.shield === true && off.special === true && off.line === false && off.phase === 'none', off);
      } else rec.ok('2f. the mode off: in the Wheel (guard)', false, inQ);
    }
    rec.ok('1g/2g. no page errors', errs.length === 0, errs.slice(0, 4));
  } finally {
    for (const P of players) await P.ctx.close().catch(() => {});
  }
}
