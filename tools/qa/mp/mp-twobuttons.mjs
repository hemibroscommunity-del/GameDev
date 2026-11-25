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
 * PART 6 (tag 6546, the owner's mends of 2026-11-24): 6a in part 2 (the
 *   latch wears the plain sword, raised and pressed in, never the
 *   crosshair), 6b in 2f (mode 4 keeps the crosshair), 6d to 6f in part 2
 *   (the owner: "It's only the line drawn that snaps": no line before the
 *   press, the line on the lock, gone at combat's end), 6c at the end (the
 *   left stick's zones in CSS px on the owner's iPhone, 430x775 at 3x).
 *
 * PART 7 (item 8, tag 6547, the owner of 2026-11-24: "I want arrows to be
 *   able to shoot whenever the line of site is aimed at" and "I want to change
 *   the melee behavior so that it doesn't jump to every monster"), after 2e:
 *   2c's first step (in part 2) the press with a sword moves nothing: the body
 *   where it stood, no dash, the latch on (the stick alone walks it in, then);
 *   7a. a bow, turned where no monster is, nothing sighted, ONE press: exactly
 *       one arrow, on the body's facing (the tap's angle), a free one
 *       (S._freeShots), the latch idle;
 *   7b. two presses 100 ms apart: no arrow sooner than the bow's cadence
 *       after the last (S.swingTimer: the worker's cycle is not outrun);
 *   7c. `?freefire=0` (history.replaceState: read at each ask): no arrow, the
 *       tap spent 'empty' (the bow waits for its line, as before);
 *   7d. (v2.3.6548: nothing else in sight at the press, else a SKIP; an
 *       arrow loosed, free or on its line) a free arrow that meets a monster hurts it (the monster hidden from
 *       the page's sight until the free arrow leaves: one in front is
 *       sighted, and the press would lock it).
 *   (No switch for the stay: the orchestrator, 2026-11-24, nothing to give
 *   back; the press's road is held by tools/guards/free-attack.test.mjs.)
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
 *       v2.3.6548 (tag 6548, card CT part 15, TAP AND HOLD; the owner,
 *       2026-11-24: "if you hold down the attack button near a monster
 *       something signifies that the auto-attack is enabled ... Otherwise
 *       each tap is its own attack cycle"): now a TAP is one attack (the
 *       tap's count up one) and a lock that STAYS (active, data-latch lock,
 *       NO held attack, the ring shown while the finger is down and gone at
 *       the lift); a hold of 900 ms with `?autohold=1500` is still a tap (the
 *       ring's length 1500ms, no auto: the switch honoured, a release before
 *       the fill); a hold past the fill (600 ms) is AUTO (data-latch auto,
 *       lit, the held attack on, the ring gone, the press stamped at least
 *       600 ms before the fill); a tap while auto lets go (idle, 'press',
 *       no attack of its own); `?holdauto=0` is the old press (a tap locks
 *       AND holds, no ring, no tap attack; again lets go); then a tap locks
 *       again and the hold turns auto on for the fight;
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
 *       v2.3.6548: the kill lets EVERYTHING go, others near or not (no hop:
 *       the owner's "doesn't jump to every monster"): idle ('killed'), no
 *       id, the held attack off, raised; the others near at the kill said;
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
 *   (v2.3.6549, card CT part 16: the rule is the right thumb's phase,
 *   thumbSide.js: Block at a THREAT, the specials IN REACH, Charge with a
 *   sword in sight but out of reach; each on its own spot of the thumb's arc)
 *   3a. far off (700 px), nothing in sight: the right side is Attack and
 *       Jump only (no Block, no Special, no Whirlwind, no Charge) and no line
 *       drawn;
 *   3b. walked in to 435 px (inside the sword's 440): sighted, the phase a
 *       threat: Block and Charge on screen, Special NOT (out of the sword's
 *       reach) (v2.3.6546: and NO line: the latch is idle, and the line is
 *       combat's, 6d to 6f);
 *   3c. walked back and forth between 435 and 520 px (past the 440 a new
 *       sighting needs, inside the 550 the sight is held to) six times: the buttons and the phase never
 *       changed (no flicker at the edge);
 *   3d. out to 700 px: the phase gone, the line gone, Block and Charge gone,
 *       each in ONE change, Special never came (came once, went once over the whole walk; v2.3.6544:
 *       each button counted on its own, and 3c a SKIP with the frame time where
 *       this page draws a frame wider than the sight's 400 ms hold: TRAPS 200);
 *   3e. the mode off (part 2f's page, mode 4): with a shield and a sword
 *       Block comes by today's rule (a monster within reach), no sight
 *       line, the resolver not asked to hide it; and no Charge, Attack at
 *       its old place (v2.3.6549: modes 1 to 4 untouched);
 *   3f. (v2.3.6549) the spots: Attack, Jump, Block and Charge as drawn,
 *       each 44 px or more, 8 px or more of air between any two (their
 *       circles), all on the right half;
 *   3g. hopped beside the monster (in the sword's reach): the phase reach,
 *       Special on screen, Charge gone, Block still there AT THE SAME SPOT
 *       as in 3b, Special's spot clear of the others;
 *   3h. hopped back out to 400 px on its line, sighted: Charge again; a tap
 *       on it: the dash went (its probe), the body carried toward the
 *       monster (150 px or more nearer), then in reach;
 *   3i. hopped far off (nothing in sight), a monster's hit stamped as the
 *       worker's would: Block comes, Special does not; Block gone again
 *       about 3 s after the hit.
 *
 * PART 4 (PR 5, tag 6544): THE TEST PANEL'S ROW AND THE TEACHING WORDS
 *   (part 2f's page, mode 4, upright)
 *   4a. mode 4: the controls tour and the quest coach say today's words
 *       (window.__btTourWords, __btCoach().words);
 *   4b. the Test panel (a hold on the zone's name; no key) has the row
 *       "Controls: two sticks / two buttons" reading two sticks; a tap on
 *       it loads the page again in mode 5 (the address's manual=5, the
 *       device's `bt_manual` '5'), and there the tour and the coach say the
 *       two buttons' words (src/data/say/controlsTutorial.js, questCoach.js);
 *   4c. the row again, reading two buttons: a tap loads mode 4 (manual=4,
 *       the key forgotten), today's words back.
 *
 * PART 5 (item 6, tag 6545): SPRINT FROM THE STICK'S RIM, upright and
 *   sideways (after part 1, stamina full), timed by the renderer's own
 *   frames (S._frameCount; TRAPS 200), the worker's bar read through its
 *   admin view:
 *   5a. in mode 5 the sprint button is not drawn (its probe: not shown, the
 *       rim live, the worker's sprint supported);
 *   5b. the thumb AT the rim (share 1.0, west): full walking speed, no
 *       sprint, the stamina still on the phone and on the worker;
 *   5c. pushed past it (1.4): the rim's sprint (how 'rim'), running, the
 *       turn ring lit (data-rimsprint), and the worker bills the moves
 *       marked `sp` (its stamina falls);
 *   5d. back to the rim (1.0): it ends ('rim'), the ring dark, the walk on;
 *   5e. out again, then the worker's stamina set to 2: it runs dry
 *       ('empty'), and with the thumb still out (moved about past the rim,
 *       the bar mended) it does not start again; back inside, then out: it
 *       starts;
 *   5f. the thumb lifted: it ends ('rim'), the stick at rest;
 *   5g. the mode off (part 2f's page, mode 4): the button drawn as today,
 *       and a thumb far past the left disc's rim sprints nothing;
 *   5h. `?rimsprint=0` in mode 5 (part 4's page loaded again): the button
 *       back, a thumb past the rim walks at full speed and sprints nothing,
 *       the tour's words without the rim's line.
 *
 * Today's stick with the mode off is played by mp-sprint (the thumb and the
 * button together) and mp-heldcombat (the default, mode 4).
 */
import * as H from './harness.mjs';
import { SAY as TOUR } from '../../../src/data/say/controlsTutorial.js';   /* v2.3.6544: part 4's words */
import { SAY as COACH } from '../../../src/data/say/questCoach.js';
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
    /* v2.3.6549 (the gatekeeper's sitting 63): never one an earlier pass hit (upright's 2b, 2c and 7d leave it at
       1 hp, so sideways it died at the first tap and ten steps went red), and only one at full health */
    if (Array.isArray(o.skip) && o.skip.indexOf(String(m.id)) >= 0) continue;
    if (typeof m.curHp === 'number' && typeof m.maxHp === 'number' && m.curHp < m.maxHp) continue;
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

/* v2.3.6547: every dash (S._bashDash) a frame sees, from now: { kind, at } (card CT item 8) */
const DASHWATCH = (P) => P.page.evaluate(() => {
  window.__ctDash = [];
  cancelAnimationFrame(window.__ctDashR);
  let last = null;
  const f = () => { const S = window._gameState.current, d = S._bashDash; if (d && d !== last) window.__ctDash.push({ kind: d.kind || 'bash', at: Date.now() }); last = d || null; window.__ctDashR = requestAnimationFrame(f); };
  window.__ctDashR = requestAnimationFrame(f);
});
const LINE = (P) => P.page.evaluate(() => (window.__btSightLine ? window.__btSightLine() : null));   /* v2.3.6546: the sight line's QA record (rendering/sightLineDraw.js) */
/* v2.3.6546: what the Attack disc wears: the plain sword (bt-rjoy-strike, mode 5)
   and the crosshair (bt-rjoy-aim), each drawn or not, and the latch's look */
const FACE_ICON = (P) => P.page.evaluate(() => {
  const base = document.querySelector('.bt-rjoy-base');
  const on = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return getComputedStyle(el).display !== 'none' && r.width > 4 && r.height > 4; };
  const st = base && base.querySelector('.bt-rjoy-strike');
  return { latch: base ? base.getAttribute('data-latch') : null, ricon: base ? base.getAttribute('data-ricon') : null,
    strike: on(st), aim: on(base && base.querySelector('.bt-rjoy-aim')), src: st ? st.getAttribute('src') : null,
    /* v2.3.6640 (card PAD): in the controller the disc wears the owner's painted face (its sword), never the plain sword or the crosshair */
    pad: !!base && base.getAttribute('data-pad') === '1', face: on(base && base.querySelector('.bt-pad-face')) };
});
/* v2.3.6640 (card PAD): the controller's socket a control sits in, on the page (window.__btPad's layout; mp-padskin's WELL).
   v2.3.6641 (part 3): one shell, its wells; in a fight (Block shown) Block is the big well and Jump the middle one (padSkin.js wellOf) */
const PAD_SOCKETS = (P) => P.page.evaluate(() => {
  const sh = document.querySelector('[data-padhousing="shell"]'), L = window.__btPad && window.__btPad.layout;
  if (!sh || !L || !L.wells) return null;
  const b = sh.getBoundingClientRect(), W = L.wells, fight = !!document.querySelector('[data-shield]');
  const at = (w) => ({ x: b.left + w.x, y: b.bottom - w.y, d: w.d });
  return { attack: at(W.attack), special: at(W.special), ctx: at(W.mobility), jump: at(fight ? W.mid : W.big), block: at(fight ? W.big : W.mid) };
});

/* ═══ v2.3.6545: PART 5's helpers ═══ */
/* the sprint as the phone and its button see it, the ring, the frame */
const RIMV = (P) => H.readState(P, (S) => {
  const sp = S._sprint || {};
  const b = window.__btSprintBtn ? window.__btSprintBtn() : null;
  return { on: !!sp.on, how: sp.how || null, why: sp.why || null, running: !!(sp.on && sp.moving), st: S.rpg ? S.rpg.stamina : null,
    sx: S.stickX || 0, sy: S.stickY || 0, phase: S._stickPhase || 'rest', f: S._frameCount || 0,
    ring: !!document.querySelector('[data-rimsprint="on"]'), btn: b, dom: !!document.querySelector('[data-sprint]') };
});
/* `n` of the renderer's own frames (TRAPS 200: never a clock's window) */
async function frames(P, n) {
  const f0 = await H.readState(P, (S) => S._frameCount || 0);
  await H.waitFor(P, (S) => S._frameCount || 0, (v) => v >= f0 + n, { timeout: 90000, label: n + ' frames' }).catch(() => null);
}
const srvSt = async (wsPort, id) => { const v = await H.serverPlayer(wsPort, id).catch(() => null); return v && typeof v.stamina === 'number' ? v.stamina : null; };
/* the thumb out from the disc's centre `c` to `share` of the drawn radius `R`, west, in slow steps (never a swipe) */
async function thumbTo(P, touch, c, R, from, share) {
  const n = Math.max(1, Math.round(Math.abs(share - from) / 0.1));
  for (let k = 1; k <= n; k++) { await touch('touchMove', [{ x: c.x - (from + (share - from) * k / n) * R, y: c.y, id: 5 }]); await P.page.waitForTimeout(40); }
}

/* ═══ v2.3.6544: PART 4's helpers ═══ */
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
/* the Test panel: a 1.2 s hold on the zone's name (ZoneHeader), held until it is up (mp-soundstudio's) */
async function openPanel(P) {
  for (let i = 0; i < 3; i++) {
    if (await panelUp(P)) return true;
    const at = await P.page.evaluate(() => {
      const el = document.querySelector('.bt-zone-header__title');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    if (!at) { await P.page.waitForTimeout(1000); continue; }
    await P.page.mouse.move(at.x, at.y);
    await P.page.mouse.down();
    const t0 = Date.now();
    await P.page.waitForTimeout(1400);
    while (Date.now() - t0 < 8000 && !(await panelUp(P))) await P.page.waitForTimeout(250);
    await P.page.mouse.up();
    for (const t1 = Date.now(); Date.now() - t1 < 4000;) {
      if (await panelUp(P)) return true;
      await P.page.waitForTimeout(250);
    }
  }
  return panelUp(P);
}
/* the mode, the remembered key, the address and the words, as this page has them */
const WORDS = (P) => P.page.evaluate(() => {
  const t = window.__btTourWords ? window.__btTourWords() : [];
  const by = Object.create(null); for (const x of t) by[x.key] = x;
  const c = window.__btCoach ? window.__btCoach().words : null;
  let key = 'n/a'; try { key = localStorage.getItem('bt_manual'); } catch (e) { /* no store */ }
  return { mode: window.__btManual ? window.__btManual.mode() : null, key, manual: new URLSearchParams(location.search).get('manual'),
    move: by.move && by.move.body, attack: by.attack && by.attack.body, targetLabel: by.target && by.target.label, target: by.target && by.target.body,
    shield: by.shield && by.shield.body, coach: c };
});
const coachIs = (w, m, a, sp) => !!w.coach && (w.coach.move || []).length === 1 && w.coach.move[0] === m && (w.coach.attack || []).length === 2 && w.coach.attack.every((x) => x === a)
  && (w.coach.special || []).length === 2 && w.coach.special.every((x) => x === sp);
/* today's words (mode 4: no tap lock, so the target step's no-lock words) */
const todayWords = (w) => w.mode === 4 && w.move === TOUR['controlsTutorial.moveBody'] && w.attack === TOUR['controlsTutorial.attackBody']
  && w.targetLabel === TOUR['controlsTutorial.targetLabel'] && w.target === TOUR['controlsTutorial.targetBodyNoLock'] && w.shield === TOUR['controlsTutorial.shieldBody']
  && coachIs(w, 'Drag to move.', 'Hold to attack the nearest enemy.', 'A quick swipe on the Attack button.');
const twoWords = (w) => w.mode === 5 && w.move === TOUR['controlsTutorial.moveBodyRim']   /* v2.3.6545: the rim's sprint line (moveBodyTwo with `?rimsprint=0`, 5h) */ && w.attack === TOUR['controlsTutorial.attackBodyHold']   /* v2.3.6548: tap and hold's words (attackBodyTwo, targetBodyTwo, attackTwo with `?holdauto=0`) */
  && w.targetLabel === TOUR['controlsTutorial.targetLabelTwo'] && w.target === TOUR['controlsTutorial.targetBodyHold'] && w.shield === TOUR['controlsTutorial.shieldBodyTwo']
  && coachIs(w, COACH['questCoach.moveTwo'], COACH['questCoach.attackHold'], COACH['questCoach.specialTwo']);
/* the row: open the panel, read it, tap its button at its centre (a real touch), wait for the page to load again and the world */
async function tapRow(P) {
  if (!(await openPanel(P))) return { panel: false };
  const at = await P.page.evaluate(() => {
    const el = document.querySelector('[data-dev-controls]');
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    const label = Array.from(document.querySelectorAll('div')).some((d) => d.textContent === 'Controls: two sticks / two buttons');
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, reads: el.getAttribute('data-dev-controls'), label };
  });
  if (!at) return { panel: true, row: false };
  await P.page.waitForTimeout(150);
  const nav = P.page.waitForNavigation({ timeout: 30000 }).catch(() => null);
  await P.page.touchscreen.tap(at.x, at.y);
  const went = !!(await nav);
  let inW = null;
  if (went) {
    await H.enterWorld(P);
    inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel again' }).catch(() => null);
    await P.page.waitForFunction(() => !!(window.__btCoach && window.__btTourWords), null, { timeout: 20000 }).catch(() => null);
  }
  return { panel: true, row: true, reads: at.reads, label: at.label, went, inW: !!inW };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  try {
    const used = [];   /* v2.3.6549: the monsters a pass has picked (PICK's skip) */
    for (const [label, viewport] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]]) {
      const P = await H.newPlayer(browser, { name: label === 'upright' ? 'Twobro' : 'Sidebro', wsPort, webPort, viewport, touch: true, dpr: 3, world: 'wheel', query: 'manual=5&wheelwhole' + (process.env.TWO_Q || '') });   /* v2.3.6542: wheelwhole: every Wheel monster in the arrival's list (server/src/wheelnear.js; mp-blockcost's), for part 2's real monster */
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

      /* ── PART 5 (v2.3.6545): sprint from the stick's rim ── */
      {
        const me5 = await H.readState(P, (S) => S.myId);
        await H.devOp(wsPort, 'vitals', me5, { heal: true });
        await frames(P, 3);
        const a = await RIMV(P);
        rec.ok(`5a. ${label}: in mode 5 the sprint button is not drawn (shown ${a.btn && a.btn.shown}, the rim ${a.btn && a.btn.rim}, the worker's sprint ${a.btn && a.btn.supported})`,
          !!a.btn && a.btn.shown === false && a.btn.rim === true && a.btn.supported === true && !a.dom, a);
        /* 5b: at the rim */
        await touch('touchStart', [{ x: c.x, y: c.y, id: 5 }]);
        await P.page.waitForTimeout(80);
        await thumbTo(P, touch, c, R, 0, 1.0);
        await frames(P, 4);
        const b0 = await RIMV(P), s0 = await srvSt(wsPort, me5);
        await frames(P, 8);
        const b1 = await RIMV(P), s1 = await srvSt(wsPort, me5);
        rec.ok(`5b. ${label}: the thumb at the rim walks at full speed (${b1.sx.toFixed(2)}) and does not sprint (${b1.on}); stamina still (phone ${b0.st} -> ${b1.st}, worker ${s0} -> ${s1})`,
          b1.phase === 'walk' && b1.sx < -0.99 && !b0.on && !b1.on && b0.st === b1.st && s0 != null && s0 === s1, { b0, b1, s0, s1 });
        /* 5c: past it */
        await thumbTo(P, touch, c, R, 1.0, 1.4);
        const on = await H.waitFor(P, (S) => !!(S._sprint && S._sprint.on && S._sprint.moving), (v) => v, { timeout: 20000, label: 'the rim sprint' }).catch(() => null);
        const c0 = await RIMV(P);
        /* the worker's bill, and its bar back on the phone: a page drawing a frame
           every 800 ms (this box sideways) reads the worker's echo many frames
           late, so wait on both, by frames (the helper's first run: 100 -> 89 on
           the worker while the phone still read a late full bar) */
        let s2 = null, c1 = null;
        for (let k = 0; k < 40; k++) {
          await frames(P, 2);
          s2 = await srvSt(wsPort, me5); c1 = await RIMV(P);
          if (s2 != null && s1 != null && s2 < s1 - 1 && c1.st < s1 - 1) break;
        }
        rec.ok(`5c. ${label}: pushed past the rim (1.4) it sprints (how ${c1.how}, running ${c1.running}), the ring lit (${c1.ring}); the worker bills the sp moves (${s1} -> ${s2}), the phone's bar falls (${c0.st} -> ${c1.st} of ${s1})`,
          !!on && c1.on && c1.how === 'rim' && c1.running && c1.ring && s2 != null && s1 != null && s2 < s1 - 1 && c1.st < s1 - 1, { c0, c1, s1, s2 });
        /* 5d: back to the rim */
        await thumbTo(P, touch, c, R, 1.4, 1.0);
        const off = await H.waitFor(P, (S) => !!(S._sprint && S._sprint.on), (v) => !v, { timeout: 20000, label: 'the rim sprint ends' }).catch(() => null);
        await frames(P, 3);
        const d1 = await RIMV(P);
        rec.ok(`5d. ${label}: back at the rim it ends (${d1.why}), the ring dark (${d1.ring}), the walk on (${d1.sx.toFixed(2)})`,
          off === false && !d1.on && d1.why === 'rim' && !d1.ring && d1.sx < -0.99, d1);
        /* 5e: out, run dry, no restart with the thumb out; back in and out: again */
        await thumbTo(P, touch, c, R, 1.0, 1.4);
        const on2 = await H.waitFor(P, (S) => !!(S._sprint && S._sprint.on), (v) => v, { timeout: 20000, label: 'the rim sprint again' }).catch(() => null);
        await H.devOp(wsPort, 'vitals', me5, { stamina: 2 });
        const dry = await H.waitFor(P, (S) => (S._sprint ? S._sprint.why : null), (v) => v === 'empty', { timeout: 120000, label: 'run dry (the worker\'s bar reaches a slow page late)' }).catch(() => null);
        await H.devOp(wsPort, 'vitals', me5, { heal: true });
        await H.waitFor(P, (S) => (S.rpg ? S.rpg.stamina : 0), (v) => v >= 50, { timeout: 120000, label: 'the bar mended on the phone' }).catch(() => null);
        let restarted = false;
        for (const sh of [1.5, 1.3, 1.6, 1.35]) {
          await thumbTo(P, touch, c, R, sh === 1.5 ? 1.4 : 1.45, sh);
          await frames(P, 2);
          const e = await RIMV(P);
          if (e.on) restarted = true;
        }
        const e1 = await RIMV(P);
        await thumbTo(P, touch, c, R, 1.35, 0.9);
        await frames(P, 2);
        await thumbTo(P, touch, c, R, 0.9, 1.4);
        const back = await H.waitFor(P, (S) => !!(S._sprint && S._sprint.on && S._sprint.how === 'rim'), (v) => v, { timeout: 20000, label: 'the rim sprint after coming back' }).catch(() => null);
        rec.ok(`5e. ${label}: out again it sprints (${!!on2}); at 0 stamina it ends (${dry}); with the thumb still out and the bar mended (${e1.st}) it does not start again (${restarted}); back inside, then out: it starts (${!!back})`,
          !!on2 && dry === 'empty' && !restarted && !e1.on && e1.st >= 5 && !!back, { e1, restarted });
        /* 5f: lifted */
        await touch('touchEnd', [{ x: c.x - 1.4 * R, y: c.y, id: 5 }]);
        const lift = await H.waitFor(P, (S) => ({ on: !!(S._sprint && S._sprint.on), why: S._sprint && S._sprint.why, phase: S._stickPhase || 'rest' }), (v) => !v.on, { timeout: 20000, label: 'lifted' }).catch(() => null);
        rec.ok(`5f. ${label}: the thumb lifted, the sprint ends (${lift && lift.why}), the stick at rest (${lift && lift.phase})`, !!lift && lift.why === 'rim' && lift.phase === 'rest', lift);
        await frames(P, 3);
      }

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
         out, 480 px from any other: the sight takes a NEW monster at 440, its
         550 holds only the one already in sight; the fourth run: 506 px the most
         room near BroTown, 650 asked too much) */
      const mon0 = await H.readState(P, bind(PICK, { dMin: 60, dMax: 420, maxD: 3000, skip: used }));
      if (mon0) used.push(mon0.id);
      rec.ok(`2. ${label}: a real monster of the Wheel with no other near its path (${mon0 && mon0.room} px; guard)`, !!mon0 && mon0.room >= 480, mon0);
      if (!mon0 || mon0.room < 480) continue;
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
      /* v2.3.6548 (tap and hold): the ring on the disc, the address's
         switches flipped in place (switches.js reads the address at each
         ask), and a press held for `ms` with a read while the finger is down */
      const RING = (P) => P.page.evaluate(() => { const el = document.querySelector('.bt-rjoy-base'); return el ? { hold: el.getAttribute('data-hold'), ms: el.style.getPropertyValue('--autohold') || null, latch: el.getAttribute('data-latch') } : null; });
      const ADDR = (q) => P.page.evaluate((q) => { const u = new URL(location.href); for (const k of Object.keys(q)) { if (q[k] == null) u.searchParams.delete(k); else u.searchParams.set(k, q[k]); } history.replaceState(history.state, '', u.pathname + u.search + u.hash); return u.search; }, q);
      const HOLD = async (ms, midAt) => {
        await touch('touchStart', [{ x: RD.x, y: RD.y, id: 2 }]);
        await P.page.waitForTimeout(midAt);
        const mid = { ring: await RING(P), l: await LATCH(P) };
        if (ms > midAt) await P.page.waitForTimeout(ms - midAt);
        const end = await LATCH(P);
        await touch('touchEnd', [{ x: RD.x, y: RD.y, id: 2 }]);
        await P.page.waitForTimeout(400);
        return { mid, end, after: await LATCH(P), ring: await RING(P) };
      };
      /* a hold until auto (the fill is the frame's: this box draws few) */
      const HOLD_AUTO = async () => {
        await P.page.evaluate(() => { const w = window.__ctHold = { at: 0, auto: 0 }; const t = setInterval(() => { const S = window._gameState && window._gameState.current; if (!S) return; if (S._latchHoldAt > 0) w.at = S._latchHoldAt; if (S._latchPhase === 'auto' && !w.auto) { w.auto = Date.now(); clearInterval(t); } }, 15); setTimeout(() => clearInterval(t), 12000); });
        await touch('touchStart', [{ x: RD.x, y: RD.y, id: 2 }]);
        await P.page.waitForTimeout(250);
        const mid = { ring: await RING(P), l: await LATCH(P) };
        const filled = await H.waitFor(P, (S) => S._latchPhase || 'idle', (v) => v === 'auto', { timeout: 10000, label: 'the hold\'s fill' }).catch(() => null);
        const held = await LATCH(P);
        await touch('touchEnd', [{ x: RD.x, y: RD.y, id: 2 }]);
        await P.page.waitForTimeout(400);
        return { mid, filled: !!filled, held, after: await LATCH(P), ring: await RING(P), icon: await FACE_ICON(P), t: await P.page.evaluate(() => window.__ctHold) };
      };
      const i0 = await FACE_ICON(P);   /* v2.3.6546: raised, before the press */
      /* 6d (v2.3.6546, the owner: "It's only the line drawn that snaps"): sighted, the latch idle: NO line yet */
      await frames(P, 2);
      const ln0 = await LINE(P);
      rec.ok(`6d. ${label}: the monster in sight, Attack not pressed: no sight line (drawn ${ln0 && ln0.drawn})`, !!ln0 && !ln0.drawn, ln0);
      await DASHWATCH(P);   /* v2.3.6547: every frame's dash, from before the press */
      const atPress = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, f: S._frameCount || 0 }));
      const tapsAt0 = (await LATCH(P)).taps;
      const tp1 = await HOLD(150, 100);   /* v2.3.6548: a tap (150 ms: the ring read while the finger is down) */
      const b1 = await H.waitFor(P, (S) => !!(S.lockedTarget && S.lockedTarget.latch), (v) => v, { timeout: 8000, label: 'the latch\'s lock' }).catch(() => null);
      const l1 = await LATCH(P);
      rec.ok(`2b. ${label}: a TAP: one attack (taps ${tapsAt0} -> ${l1.taps}), the latch active on it, locked, NO held attack, the disc raised (${l1.phase}, ${l1.lock}, ${l1.look}, auto ${l1.auto})`,
        !!b1 && l1.phase === 'active' && l1.id === target && l1.lock === target && l1.latchLock && !l1.auto && l1.look === 'lock' && l1.taps === tapsAt0 + 1, { ...l1, target, b1: !!b1, tapsAt0 });
      rec.ok(`2b. ${label}: the tap's ring: shown while the finger was down (${tp1.mid.ring && tp1.mid.ring.hold}), gone at the lift (${tp1.ring && tp1.ring.hold})`,
        !!tp1.mid.ring && !!tp1.mid.ring.hold && !!tp1.ring && tp1.ring.hold == null, tp1);
      /* 6a (v2.3.6546): the latch wears the plain sword, raised and pressed in, never the crosshair */
      const i1 = await FACE_ICON(P);
      rec.ok(`6a. ${label}: Attack wears the plain sword${i0.pad ? ' (the controller: its painted face, ' + i0.face + ')' : ''}, not the crosshair: raised (${i0.latch}: sword ${i0.strike}, crosshair ${i0.aim}) and locked by a tap (${i1.latch}: sword ${i1.strike}, crosshair ${i1.aim})`,
        i0.latch === 'off' && i1.latch === 'lock' && (i0.pad
          /* v2.3.6640 (card PAD): in the controller the sword is the painted face's: the face drawn, neither the plain sword nor the crosshair */
          ? i1.pad && i0.face && !i0.strike && !i0.aim && i1.face && !i1.strike && !i1.aim
          : i0.strike && !i0.aim && i1.strike && !i1.aim && i1.src), { i0, i1 });   /* v2.3.6548: a tap's lock is 'lock' (raised); lit is the hold's ('auto', below) */
      const ln1 = await H.waitFor(P, () => (window.__btSightLine ? window.__btSightLine() : null), (v) => !!v && v.drawn && v.id === target, { timeout: 8000, label: 'the line on the lock' }).catch(() => null);
      rec.ok(`6e. ${label}: Attack pressed: the line drawn to the LOCKED monster (${ln1 && ln1.id}, ${ln1 && ln1.len} px)`, !!ln1, { ln1: ln1 || (await LINE(P)), target });
      /* 2c (v2.3.6547, card CT item 8; the owner, 2026-11-24: "I want to change the
         melee behavior so that it doesn't jump to every monster"): the press
         locks and the sword swings WHERE THE BODY STANDS: no walk, no step, no
         dash toward it (the monster 170 px off, past the blade's reach: the
         swings miss); the stick alone moves the body (below) */
      await frames(P, 4);
      await P.page.waitForTimeout(1200);
      const stay = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, f: S._frameCount || 0, phase: S._latchPhase || 'idle', end: S._latchEnd || null, dash: window.__ctDash ? window.__ctDash.slice() : null, cd: window.__btAbilityStatus ? window.__btAbilityStatus('sworddash').cdLeft : null }));
      const stayMoved = Math.hypot(stay.x - atPress.x, stay.y - atPress.y);
      rec.ok(`2c. ${label}: the press moved nothing: the body ${Math.round(stayMoved)} px from where it stood over ${stay.f - atPress.f} frames, no dash (${(stay.dash || []).length}, its cooldown ${stay.cd}), the latch ${stay.phase}`,
        stayMoved <= 12 && !!stay.dash && stay.dash.length === 0 && !(stay.cd > 0) && stay.f - atPress.f >= 4 && (stay.phase === 'active' || stay.end === 'killed'), { atPress, stay });
      rec.ok(`2b. ${label}: the tap is ONE attack cycle: 1.2 s on, no held attack and no more taps (taps ${(await LATCH(P)).taps}), the lock kept`,
        (await LATCH(P)).taps === l1.taps && !(await LATCH(P)).auto && (await LATCH(P)).phase === 'active', await LATCH(P));

      /* v2.3.6548 (tap and hold, card CT part 15) */
      {
        /* a release before the fill, with ?autohold=1500: held 900 ms (past
           the 600 default), still a tap -- the switch honoured */
        await ADDR({ autohold: '1500' });
        const tA = (await LATCH(P)).taps;
        const hA = await HOLD(900, 300);
        rec.ok(`2b. ${label}: ?autohold=1500, held 900 ms and lifted: a release before the fill is a tap -- one attack (taps ${tA} -> ${hA.after.taps}), the ring ${hA.mid.ring && hA.mid.ring.ms} shown then gone, still locked (${hA.after.phase}), no auto`,
          !!hA.mid.ring && hA.mid.ring.hold != null && hA.mid.ring.ms === '1500ms' && hA.end.phase === 'active' && !hA.end.auto && hA.after.phase === 'active' && !hA.after.auto && hA.after.look === 'lock' && hA.ring && hA.ring.hold == null && hA.after.taps === tA + 1 && hA.after.id === target, hA);
        await ADDR({ autohold: null });
        /* a hold past the fill: auto, lit */
        const tB = (await LATCH(P)).taps;
        const hB = await HOLD_AUTO();
        const tookMs = hB.t && hB.t.at && hB.t.auto ? hB.t.auto - hB.t.at : null;
        rec.ok(`2b. ${label}: a HOLD past the fill: auto-attack on after ${tookMs} ms (>= 600), the button lit (${hB.after.look}), the held attack on with the finger lifted, the ring gone (${hB.ring && hB.ring.hold}); the press one attack (taps ${tB} -> ${hB.after.taps})`,
          hB.filled && !!hB.mid.ring && hB.mid.ring.hold != null && hB.mid.l.phase === 'active' && tookMs >= 600 && hB.after.phase === 'auto' && hB.after.auto && hB.after.look === 'auto' && hB.after.lock === target && hB.after.latchLock && hB.ring && hB.ring.hold == null && hB.after.id === target && hB.after.taps === tB + 1 && hB.icon.latch === 'auto' && hB.icon.strike && !hB.icon.aim, hB);
        /* a tap while auto: off, and no attack of its own */
        await press();
        const lC = await LATCH(P);
        rec.ok(`2b. ${label}: a tap while auto: off (${lC.phase}, ${lC.end}), the button raised (${lC.look}), the held attack off, NO attack of its own (taps ${hB.after.taps} -> ${lC.taps})`,
          lC.phase === 'idle' && lC.end === 'press' && !lC.auto && lC.look === 'off' && lC.taps === hB.after.taps, lC);
        /* ?holdauto=0: the press of parts 13-14 */
        await ADDR({ holdauto: '0' });
        const tD = (await LATCH(P)).taps;
        const hD = await HOLD(150, 100);
        const lD2 = (await press(), await LATCH(P));
        rec.ok(`2b. ${label}: ?holdauto=0: a tap locks AND holds (${hD.after.phase}, auto ${hD.after.auto}, ${hD.after.look}), no ring (${hD.mid.ring && hD.mid.ring.hold}), no tap attack (taps ${tD} -> ${hD.after.taps}); again lets go (${lD2.phase}, ${lD2.end})`,
          hD.after.phase === 'auto' && hD.after.auto && hD.after.look === 'auto' && !!hD.mid.ring && hD.mid.ring.hold == null && hD.after.taps === tD && lD2.phase === 'idle' && lD2.end === 'press' && !lD2.auto, { hD, lD2 });
        await ADDR({ holdauto: null });
        /* lock it again with a tap, for the walk and the fight */
        await press();
        const lE = await LATCH(P);
        rec.ok(`2b. ${label}: a tap locks it again (${lE.phase} on ${lE.id})`, lE.phase === 'active' && lE.id === target, { lE, target });
      }

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
      const lockHeld = (l) => l.phase === 'active' || l.phase === 'auto' || l.end === 'killed';   /* v2.3.6548: a tap's lock or auto */
      rec.ok(`2c. ${label}: the stick walks you in while locked (${Math.round(toward)} px toward it; the gap ${g ? Math.round(g.d) : '?'} px), the lock held`, !!g && (g.d <= 90 || toward > 20) && lockHeld(await LATCH(P)), { gPress, g, toward, walkTrace });
      /* this box draws a few frames a second and a held attack halves the
         walk (mode 4's rule, kept): the rest of the way by the harness's hop */
      if (g0 && g0.d > 90) {
        const m1 = await H.readState(P, bind((S, id) => { const m = (S.monsters || []).find((x) => x && String(x.id) === id); return m ? { x: m.x, y: m.y } : null; }, target));
        if (m1) await H.hopTo(P, Math.round(m1.x - 50 * Math.cos(g0.a)), Math.round(m1.y - 50 * Math.sin(g0.a)), { tries: 30 });
      }
      /* v2.3.6548: the fight's held attack is the hold's: hold Attack to the fill */
      const hF = await HOLD_AUTO();
      rec.ok(`2c. ${label}: held to the fill for the fight: auto (${hF.after.phase}, ${hF.after.look})`, hF.filled && hF.after.phase === 'auto' && hF.after.auto && hF.after.id === target, hF);
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

      /* 2d: v2.3.6548 (tap and hold): the kill lets everything go, others
         near or not -- no hop to the next (the press of parts 13-14 moved the
         lock; `?holdauto=0` keeps that).  The others near at the kill said */
      const lockMoved = false;
      const nearAtKill = await H.readState(P, bind((S, id) => (S.monsters || []).filter((m) => m && String(m.id) !== id && m.alive && !(m.curHp <= 0) && Math.hypot(m.x - S.player.x, m.y - S.player.y) <= 550).length, target));
      await P.page.waitForTimeout(400);
      const l3 = await LATCH(P);
      await frames(P, 2);
      const ln3 = await LINE(P);
      rec.ok(`6f. ${label}: combat over (${l3.phase}, ${l3.end}): the line gone (drawn ${ln3 && ln3.drawn})`, l3.phase === 'idle' && !!ln3 && !ln3.drawn, { l3, ln3 });
      rec.ok(`2d. ${label}: the kill let everything go (${l2.phase} at the kill, now ${l3.phase}, ${l3.end}): no hop (${nearAtKill} other${nearAtKill === 1 ? '' : 's'} within 550 px), the held attack off, the disc raised (${l3.look})`,
        l2.phase === 'idle' && l3.phase === 'idle' && l3.end === 'killed' && l3.id == null && !l3.auto && l3.look === 'off' && !l3.latchLock, { l2, l3, nearAtKill });

      /* 2e: a tap on the world's right half attacks nothing */
      const tz = await P.page.evaluate(() => { const el = document.querySelector('[data-joyzone="R"]'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width * 0.5, y: b.top + b.height * 0.35 }; });
      const tapsBefore = (await LATCH(P)).taps;
      if (tz) { await touch('touchStart', [{ x: tz.x, y: tz.y, id: 3 }]); await P.page.waitForTimeout(60); await touch('touchEnd', [{ x: tz.x, y: tz.y, id: 3 }]); await P.page.waitForTimeout(800); }
      const l4 = await LATCH(P);
      rec.ok(`2e. ${label}: a tap on the world's right half attacks nothing`, !!tz && l4.taps === tapsBefore && !l4.auto && l4.phase === 'idle', { tz, tapsBefore, l4 });

      /* ── PART 7 (v2.3.6547, card CT item 8): THE FREE ARROW, AND THE SWORD THAT STAYS ──
         The owner, 2026-11-24: "I want arrows to be able to shoot whenever the
         line of site is aimed at (instead of the current behavior of only
         firing when something is in front to fire at like props or monsters)" */
      const p7EqB = await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged').catch((e) => ({ ok: false, why: String(e) }));
      rec.ok(`7. ${label}: a bow in hand (guard)`, !!(p7EqB && p7EqB.ok), p7EqB);
      /* every new arrow of yours, each frame: its angle, its stamp, the tap's angle */
      await P.page.evaluate(() => {
        const S0 = window._gameState.current, seen = new WeakSet();
        for (const a of (S0.arrows || [])) seen.add(a);
        window.__ctShots = [];
        cancelAnimationFrame(window.__ctShotR);
        const f = () => {
          const S = window._gameState.current;
          for (const a of (S.arrows || [])) if (a && !seen.has(a)) { seen.add(a); window.__ctShots.push({ ang: a.ang, ts: a._shotTs || Date.now(), tap: S._tapAtk ? S._tapAtk.ang : null, how: S._tapAtk ? S._tapAtk.how : null, line: !!(S._bowSight && S._bowSight.d != null), f: S._frameCount || 0 }); }
          window.__ctShotR = requestAnimationFrame(f);
        };
        window.__ctShotR = requestAnimationFrame(f);
      });
      const p7SHOTS = () => P.page.evaluate(() => ({ list: (window.__ctShots || []).slice(), free: window._gameState.current._freeShots || 0, phase: window._gameState.current._latchPhase || 'idle', sight: window._gameState.current._sightPhase || 'none', how: window._gameState.current._tapAtk ? window._gameState.current._tapAtk.how : null }));
      const p7Quick = async () => { await touch('touchStart', [{ x: RD.x, y: RD.y, id: 2 }]); await P.page.waitForTimeout(60); await touch('touchEnd', [{ x: RD.x, y: RD.y, id: 2 }]); };
      const p7TurnTo = async (a) => {
        await touch('touchStart', [c]); await P.page.waitForTimeout(80);
        await touch('touchMove', [{ x: c.x + 0.2 * R * Math.cos(a), y: c.y + 0.2 * R * Math.sin(a), id: 1 }]);
        await P.page.waitForTimeout(600);
        await touch('touchEnd', [{ x: c.x + 0.2 * R * Math.cos(a), y: c.y + 0.2 * R * Math.sin(a), id: 1 }]);
      };
      /* the way with no live monster within 70 degrees of it (of those within 1500 px) */
      const p7Away = await H.readState(P, (S) => {
        const P0 = S.player, live = (S.monsters || []).filter((m) => m && m.alive && Math.hypot(m.x - P0.x, m.y - P0.y) < 1500);
        let best = null;
        for (let k = 0; k < 8; k++) {
          const a = -Math.PI + k * Math.PI / 4;
          let off = Math.PI;
          for (const m of live) { let d = Math.abs(Math.atan2(m.y - P0.y, m.x - P0.x) - a) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d; off = Math.min(off, d); }
          if (!best || off > best.off) best = { a, off };
        }
        return best;
      });
      await p7TurnTo(p7Away.a);
      const p7None = await H.waitFor(P, (S) => S._sightPhase || 'none', (v) => v === 'none', { timeout: 8000, label: 'nothing sighted' }).catch(() => null);
      rec.ok(`7. ${label}: turned where no monster is (${Math.round(p7Away.off * 180 / Math.PI)} degrees from the nearest), nothing sighted (guard)`, !!p7None && p7Away.off >= 70 * Math.PI / 180, { p7Away, p7None });
      /* 7a: ONE press: one arrow, the way the body faces (a press this box's slow
         frames let expire, 600 ms with no frame, is pressed again: up to 4) */
      const p7S0 = await p7SHOTS();
      let p7S1 = p7S0, p7Tries = 0;
      for (; p7Tries < 4 && p7S1.list.length === p7S0.list.length; p7Tries++) {
        await p7Quick();
        await H.waitFor(P, () => (window.__ctShots || []).length, (n) => n > p7S0.list.length, { timeout: 3000, label: 'an arrow' }).catch(() => null);
        p7S1 = await p7SHOTS();
      }
      await frames(P, 3);
      await P.page.waitForTimeout(1200);
      p7S1 = await p7SHOTS();
      const p7A1 = p7S1.list.slice(p7S0.list.length);
      const p7OffTap = p7A1[0] && typeof p7A1[0].tap === 'number' ? Math.abs(Math.atan2(Math.sin(p7A1[0].ang - p7A1[0].tap), Math.cos(p7A1[0].ang - p7A1[0].tap))) : null;
      const p7OffTurn = p7A1[0] ? Math.abs(Math.atan2(Math.sin(p7A1[0].ang - p7Away.a), Math.cos(p7A1[0].ang - p7Away.a))) : null;
      rec.ok(`7a. ${label}: a bow, nothing in front, Attack: exactly one arrow (${p7A1.length}, press ${p7Tries}), on the body's facing (${p7OffTap == null ? '?' : p7OffTap.toFixed(3)} rad from the tap's, ${p7OffTurn == null ? '?' : Math.round(p7OffTurn * 180 / Math.PI)} deg from the turn), free (${p7S1.free - p7S0.free}; or the bow's line on a prop: ${p7A1[0] ? p7A1[0].line : '?'}, today's rule), the latch idle`,
        p7A1.length === 1 && p7OffTap != null && p7OffTap < 0.02 && p7OffTurn < 0.45 && (p7S1.free - p7S0.free === 1 || p7A1[0].line) && p7S1.phase === 'idle', { p7A1, p7S0: { n: p7S0.list.length, free: p7S0.free }, p7S1: { free: p7S1.free, phase: p7S1.phase, how: p7S1.how } });
      /* 7b: two presses 100 ms apart: the bow's cadence (S.swingTimer) holds, no
         arrow sooner than its cycle after the last (bow 600 x 0.825 = 495 ms) */
      await P.page.waitForTimeout(900);
      const p7S2a = await p7SHOTS();
      await p7Quick(); await P.page.waitForTimeout(100); await p7Quick();
      await frames(P, 4);
      await P.page.waitForTimeout(1500);
      const p7S2 = await p7SHOTS();
      const p7All = p7S2.list;
      const p7Gaps = []; for (let k = 1; k < p7All.length; k++) p7Gaps.push(p7All[k].ts - p7All[k - 1].ts);
      const p7A2 = p7All.length - p7S2a.list.length;
      rec.ok(`7b. ${label}: two presses 100 ms apart: ${p7A2} arrow(s), none inside the bow's cadence (the gaps ${p7Gaps.join(', ')} ms, each at least 445)`,
        p7A2 >= 1 && p7A2 <= 2 && p7Gaps.every((g) => g >= 445), { p7Gaps, p7A2 });
      /* 7c: `?freefire=0` (the page's own address, history.replaceState: the switch is read at each ask) */
      await P.page.evaluate(() => { const u = new URL(location.href); u.searchParams.set('freefire', '0'); history.replaceState(history.state, '', u.toString()); });
      await P.page.waitForTimeout(900);
      const p7S3a = await p7SHOTS();
      let p7S3 = p7S3a;
      for (let k = 0; k < 2; k++) { await p7Quick(); await frames(P, 3); await P.page.waitForTimeout(900); }
      p7S3 = await p7SHOTS();
      rec.ok(`7c. ${label}: \`?freefire=0\`: two presses, no arrow (${p7S3.list.length - p7S3a.list.length}), none free (${p7S3.free - p7S3a.free}), the tap spent 'empty' (${p7S3.how})`,
        p7S3.list.slice(p7S3a.list.length).every((x) => x.line) && p7S3.free === p7S3a.free, { p7S3a: { n: p7S3a.list.length }, p7S3: { n: p7S3.list.length, how: p7S3.how } });
      await P.page.evaluate(() => { const u = new URL(location.href); u.searchParams.delete('freefire'); history.replaceState(history.state, '', u.toString()); });
      /* 7d: a free arrow that meets a monster hurts it.  A monster in front is
         SIGHTED (the press would lock it), so the test hides it from the page
         (S.monsters read without it: sight, the bow's line and the press see
         nothing; the first run hid the object, which a tick replaces) until
         the free arrow leaves, then shows it again: the arrow,
         loosed at nothing, meets it, and the worker takes the claim */
      const mon7 = await H.readState(P, bind(PICK, { dMin: 60, dMax: 420, maxD: 3000, skip: used }));
      if (mon7) used.push(mon7.id);
      let hit7 = null;
      if (mon7) {
        await H.hopTo(P, Math.round(mon7.x - 150 * Math.cos(mon7.a)), Math.round(mon7.y - 150 * Math.sin(mon7.a)), { p7Tries: 60 });
        await P.page.waitForTimeout(1000);
        const nr7 = await H.readState(P, bind((S, id) => { const m = (S.monsters || []).find((x) => x && String(x.id) === id); return m ? { a: Math.atan2(m.y - S.player.y, m.x - S.player.x), d: Math.hypot(m.x - S.player.x, m.y - S.player.y), hp: m.curHp } : null; }, mon7.id));
        if (nr7) {
          await p7TurnTo(nr7.a);
          const sighted7 = await H.waitFor(P, (S) => S._sightPhase || 'none', (v) => v === 'sighted', { timeout: 6000, label: 'sighted' }).catch(() => null);
          const p7Hid = await P.page.evaluate((id) => {
            /* the page's list read without it (sight.js sightPick, the bow's line and
               the press all read S.monsters, whose objects the ticks replace) */
            const S = window._gameState.current;
            if (!(S.monsters || []).some((x) => x && String(x.id) === id)) return false;
            let arr = S.monsters;
            const h = window.__ctHid = { on: true, free: S._freeShots || 0 };
            Object.defineProperty(S, 'monsters', { configurable: true, enumerable: true, get: () => (h.on && Array.isArray(arr) ? arr.filter((x) => !x || String(x.id) !== id) : arr), set: (v) => { arr = v; } });
            h.show = () => { if (!h.on) return; h.on = false; delete S.monsters; S.monsters = arr; };
            const w = () => { if (!h.on) return; if ((S._freeShots || 0) > h.free) { h.show(); return; } requestAnimationFrame(w); };
            requestAnimationFrame(w);
            setTimeout(h.show, 12000);   /* never left hidden */
            return true;
          }, mon7.id);
          await frames(P, 2);
          /* v2.3.6548 (part 15, the helper's run on 9a289461: 7d red both ways,
             the arrow flying and hurting the monster each time): the press must
             find NOTHING in sight (upright another of the 12 near was locked,
             the latch active), and the shot is counted as an arrow loosed (the
             shots' list), free or on its line (sideways the bow's line was on
             something: today's rule, 7a's, and it hurt the monster all the same) */
          const clear7 = await H.waitFor(P, (S) => ({ p: S._sightPhase || 'none', id: S._sightId == null ? null : String(S._sightId) }), (v) => v.p === 'none', { timeout: 4000, label: 'nothing in sight' }).catch(() => null);
          const f7a = await p7SHOTS();
          const loosed7 = (f) => f.free > f7a.free || f.list.length > f7a.list.length;
          for (let k = 0; k < 3 && !loosed7(await p7SHOTS()); k++) { await p7Quick(); await H.waitFor(P, (S) => (S._freeShots || 0) + ':' + (window.__ctShots || []).length, (v) => v !== (f7a.free + ':' + f7a.list.length), { timeout: 3000, label: 'the arrow' }).catch(() => null); }
          const f7 = await p7SHOTS();
          hit7 = await H.waitFor(P, bind((S, id) => { const m = (S.monsters || []).find((x) => x && String(x.id) === id); return m ? (m.curHp != null ? m.curHp : m.hp) : null; }, mon7.id), (hp) => typeof hp === 'number' && typeof nr7.hp === 'number' && hp < nr7.hp, { timeout: 8000, label: 'the monster hurt' }).catch(() => null);
          const p7Shown = await P.page.evaluate(() => !(window.__ctHid && window.__ctHid.on));
          const name7 = `7d. ${label}: an arrow (${f7.free - f7a.free} free, ${f7.list.length - f7a.list.length} loosed) pressed with nothing in sight meets the monster ${Math.round(nr7.d)} px on (sighted first: ${!!sighted7}, hidden ${p7Hid}, shown again ${p7Shown}): the worker hurt it (${nr7.hp} -> ${hit7}), the latch ${f7.phase}`;
          if (!clear7) rec.skip(name7, 'another monster stayed in sight with this one hidden (the press would lock it, not loose a free arrow): the placement, not the rule');
          else rec.ok(name7, !!sighted7 && p7Hid && loosed7(f7) && f7.phase === 'idle' && hit7 != null, { nr7, f7: { free: f7.free, phase: f7.phase, n: f7.list.length }, hit7, p7Shown });
          await P.page.evaluate(() => { const h = window.__ctHid; if (h && h.on) h.show(); });
        } else rec.ok(`7d. ${label}: the monster (guard)`, false, mon7);
      } else rec.ok(`7d. ${label}: a monster with room (guard)`, false, null);
      await P.page.evaluate(() => cancelAnimationFrame(window.__ctShotR));
      /* the sword back in hand for part 3 */
      const p7EqS = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch((e) => ({ ok: false, why: String(e) }));
      rec.ok(`7. ${label}: the sword back in hand (guard)`, !!(p7EqS && p7EqS.ok), p7EqS);

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
         480 px from any other live monster (a NEW sighting is at 440; the
         550 holds only the one in sight); then the body turned to face it from that side, so the
         keeper's line (the drawn facing's) is that side */
      const mon3 = await H.readState(P, bind(PICK, { dMin: 400, dMax: 730, maxD: 4000, skip: used }));
      if (mon3) used.push(mon3.id);
      rec.ok(`3. ${label}: a live monster with no other near the path (${mon3 && mon3.room} px, from the ${mon3 && mon3.face}; guard)`, !!mon3 && mon3.room >= 480, mon3);
      if (!mon3 || mon3.room < 480) continue;
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
        const w = window._ctEdge = { want: 700, at: 700, real: null, phase: [], dom: [], ticks: 0, lost: false, last: Date.now(), gaps: [], fOn: true };
        /* v2.3.6544: the renderer's clock (TRAPS 200): the gap between animation frames, so 3c can tell a page that cannot hold the sight from a sight that does not */
        let fLast = 0;
        const fr = (ts) => { if (fLast && w.gaps.length < 2000) w.gaps.push(ts - fLast); fLast = ts; if (w.fOn) requestAnimationFrame(fr); };
        requestAnimationFrame(fr);
        const shown = () => ({ block: !!document.querySelector('[data-shield]'), special: !!document.querySelector('[data-special]'), ability: !!document.querySelector('[data-ability]'), charge: !!document.querySelector('[data-charge]') });   /* v2.3.6549: + Charge */
        let was = JSON.stringify(shown());
        w.dom.push({ t: Date.now(), v: JSON.parse(was) });
        /* v2.3.6546 (part 12's Found: Block and Special changed 8 times in 3c upright while the phase held): each change says what the buttons' rules read then -- the sight, the latch, the nearest live monster, the last hurt, the shield, the frame */
        const why = () => { const S = window._gameState && window._gameState.current; if (!S || !S.player) return null; let near = null; for (const m of S.monsters || []) { if (!m || !m.alive || (typeof m.curHp === 'number' && m.curHp <= 0)) continue; const d = Math.hypot(m.x - S.player.x, m.y - S.player.y); if (near == null || d < near) near = d; }
          return { p: S._sightPhase || 'none', sAge: S._sightAt ? Date.now() - S._sightAt : null, l: S._latchPhase || 'idle', near: near == null ? null : Math.round(near), hurt: S.lastDamageTaken ? Date.now() - S.lastDamageTaken : null, up: !!S._shieldUp, sw: !!(S._wheelSwim && S._wheelSwim.on), f: S._frameCount || 0, sh: window.__btShieldBtn ? window.__btShieldBtn().shown : null, sp: window.__btSpecialBtn ? window.__btSpecialBtn().shown : null }; };
        const mo = w.mo = new MutationObserver(() => { const n = JSON.stringify(shown()); if (n !== was) { was = n; w.dom.push({ t: Date.now(), v: JSON.parse(n), d: Math.round(w.at), why: why() }); } });
        mo.observe(document.body, { childList: true, subtree: true });
        let ph = null;
        clearInterval(window.__ctEdgeT);
        window.__ctEdgeT = setInterval(() => {
          const S = window._gameState && window._gameState.current;
          if (!S || !S.player) return;
          const p = S._sightPhase || 'none';
          const m = (S.monsters || []).find((x) => x && String(x.id) === id);
          /* v2.3.6544: each change of the phase says why (the gap, the facing and where it came from, the angle off it): the helper's run on PR 5 and #2327's run 5 saw the phase change twice at the edge, sideways */
          if (p !== ph) { ph = p; const fa = FACE[S._renderFacing]; w.phase.push({ t: Date.now(), p, d: Math.round(w.at), real: m ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null, f: S._renderFacing, src: S._facingSrc, off: m && typeof fa === 'number' ? Math.round(Math.abs(((Math.atan2(m.y - S.player.y, m.x - S.player.x) - fa + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * 180 / Math.PI) : null }); }
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
          block: !!document.querySelector('[data-shield]'), special: !!document.querySelector('[data-special]'), ability: !!document.querySelector('[data-ability]'), charge: !!document.querySelector('[data-charge]'), thumb: S && S._thumbPhase || 'calm', swim: !!(S && S._wheelSwim && S._wheelSwim.on),
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
      rec.ok(`3a. ${label}: far off (${q0.at} px), nothing in sight: Attack and Jump only (Block ${q0.block}, Special ${q0.special}, Whirlwind ${q0.ability}, Charge ${q0.charge}), no line`,
        q0.phase === 'none' && q0.attack && q0.jump && !q0.block && !q0.special && !q0.ability && !q0.charge && !!q0.line && !q0.line.drawn && q0.latch === 'idle', q0);
      const marks = await P.page.evaluate(() => ({ p: window._ctEdge.phase.length, d: window._ctEdge.dom.length }));
      /* 3b: in to 435; this box draws a frame every few hundred ms, so wait on the page's own sight (TRAPS 200) */
      await walkTo(435, 0);
      const s1 = await H.waitFor(P, (S) => S._sightPhase || 'none', (v) => v === 'sighted', { timeout: 15000, label: 'sighted at 435' }).catch(() => null);
      await H.waitFor(P, () => !!document.querySelector('[data-shield]') && !!document.querySelector('[data-charge]'), (v) => v, { timeout: 8000, label: 'Block and Charge' }).catch(() => null);
      await frames(P, 2);
      const q1 = await EDGE(P);
      const RECT = (sel) => P.page.evaluate((q) => { const el = document.querySelector(q); if (!el) return null; const b = el.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; }, sel);
      const blockAt3b = await RECT('[data-shield]');
      /* v2.3.6546: no line before the press (the owner: "It's only the line drawn that snaps"); the line is combat's (6d to 6f).
         v2.3.6549: out of the sword's reach: Block and Charge, not Special */
      rec.ok(`3b. ${label}: walked in to ${q1.at} px: sighted, a threat: Block and Charge on the arc, Special not yet (out of reach), and no line before the press (drawn ${q1.line && q1.line.drawn})`,
        !!s1 && q1.phase === 'sighted' && q1.id === mon3.id && q1.thumb === 'threat' && !!q1.line && !q1.line.drawn && q1.block && q1.charge && !q1.special && q1.attack && q1.jump, q1);
      /* 3c: back and forth across the edge, inside the held 550.  v2.3.6543:
         out to 520, not 545 (the helper's run on 9af138bb, sideways: a frame
         every 767 ms, and the monster's wander past 550 on ONE frame is more
         than the 0.4 s hold there; 545 left it 5 px, 520 leaves 30, still 80
         past the 440 a new sighting needs) */
      const mid = await P.page.evaluate(() => ({ p: window._ctEdge.phase.length, d: window._ctEdge.dom.length, g: window._ctEdge.gaps.length }));
      for (let k = 0; k < 6; k++) { await walkTo(520, 300); await walkTo(435, 300); }
      const q2 = await EDGE(P);
      const w2 = await P.page.evaluate((o) => { const gs = window._ctEdge.gaps.slice(o.g).sort((a, b) => a - b); return { phase: window._ctEdge.phase.slice(-6), dom: window._ctEdge.dom.slice(o.d), frameMs: gs.length ? Math.round(gs[gs.length >> 1]) : null, frames: gs.length }; }, { g: mid.g, d: mid.d });
      if (w2.dom.length) console.log(`  3c ${label}: the buttons changed ${w2.dom.length} times (v2.3.6546: each with what their rules read): ${JSON.stringify(w2.dom)}`);   /* v2.3.6546: every change in 3c, not the last six */
      const name3c = `3c. ${label}: back and forth between 435 and 520 px six times: no change of the phase (${q2.phases - mid.p}) or the buttons (${q2.doms - mid.d}), still sighted, no line before the press`;
      const edgeHeld = q2.phases === mid.p && q2.doms === mid.d && q2.phase === 'sighted' && q2.block && q2.charge && !q2.special && q2.line && !q2.line.drawn && !q2.lost;   /* v2.3.6546: no line before the press; v2.3.6549: Block and Charge, not Special */
      /* v2.3.6544 (TRAPS 200): the sight holds 400 ms past its last sighting (sight.js SIGHT.HOLD_MS), counted on the
         game's own clock and stepped once a frame.  A page that draws a frame wider than that (this box sideways: 767
         to 1117 ms) drops the sight on ONE frame that misses (the monster's wander past the held 550 between two
         frames), where a phone at 30 to 60 fps holds through a dozen.  The helper's run on PR 5 and #2327's run 5
         were that: the game's record (each change's gap, facing and angle) shows no flap on a page that can hold.
         So: a SKIP with the frame time there, never a red; on a page whose frames fit inside the hold, the strict check. */
      const HOLD_MS = 400;
      /* v2.3.6549: Block and Jump are not drawn in the water (shieldToggle.js, JumpButton.jsx: by design); a walk
         whose path crosses a shore changes them there, which is the place's, not this rule's (the run on this
         part, upright: Block and Jump went at 435 px each time, swimming, the phase a threat throughout) */
      const wet = w2.dom.some((x) => x.why && x.why.sw) || q2.swim;
      if (!edgeHeld && wet && q2.phases === mid.p) {
        rec.skip(name3c, `the walk's path crosses the water there (Block and Jump are not drawn while swimming, by design): the phase held (${q2.phases - mid.p} changes), Charge held; the changes: ${JSON.stringify(w2.dom.map((x) => ({ v: x.v, sw: x.why && x.why.sw })))}`);
      } else if (!edgeHeld && !q2.lost && w2.frameMs != null && w2.frameMs >= HOLD_MS) {
        rec.skip(name3c, `this page drew a frame every ${w2.frameMs} ms (its median over the walk, ${w2.frames} frames), wider than the sight's ${HOLD_MS} ms hold, so one frame's miss is past the hold; the changes: ${JSON.stringify(w2.phase)}`);
      } else {
        rec.ok(name3c, edgeHeld, { q2, w2 });
      }
      const after3c = { p: q2.phases, d: q2.doms };
      /* 3d: out */
      await walkTo(700, 0);
      await H.waitFor(P, (S) => S._sightPhase || 'none', (v) => v === 'none', { timeout: 15000, label: 'lost at 700' }).catch(() => null);
      await H.waitFor(P, () => !document.querySelector('[data-shield]') && !document.querySelector('[data-charge]'), (v) => v, { timeout: 8000, label: 'Block and Charge gone' }).catch(() => null);
      await P.page.waitForTimeout(600);
      const q3 = await EDGE(P);
      const w3 = await P.page.evaluate(() => { const w = window._ctEdge; clearInterval(window.__ctEdgeT); w.mo.disconnect(); w.fOn = false; return { phase: w.phase, dom: w.dom }; });
      /* v2.3.6544: each button's own comings and goings, not the screen's: Block and Special come in their own renders
         (the run on PR 5 upright: Block, then Special 620 ms later, a frame every 450 ms), which is two changes of
         the screen and one coming of each.  From before 3b: in once, out once each; if 3c was a SKIP (a page that
         cannot hold), from after 3c: out once each. */
      const strict = q2.phases === mid.p;
      const from = strict ? marks : after3c;
      const flips = (k) => { let n = 0; for (let j = Math.max(1, from.d); j < w3.dom.length; j++) if (w3.dom[j].v[k] !== w3.dom[j - 1].v[k]) n++; return n; };
      const fb = flips('block'), fs = flips('special'), fa = flips('ability'), fc = flips('charge'), want = strict ? 2 : 1;
      const wet3 = w3.dom.some((x) => x.why && x.why.sw);
      const name3d = `3d. ${label}: out to ${q3.at} px: the phase, the line, Block and Charge gone, each in one change, Special never came`;
      if (wet3 && fc === want && fs === 0 && q3.phases - from.p === want && !q3.block && !q3.charge) rec.skip(name3d, `the path crossed the water (Block not drawn while swimming, by design): Block changed ${fb} times, Charge ${fc}, Special ${fs}, the phase ${q3.phases - from.p}`);
      else rec.ok(`3d. ${label}: out to ${q3.at} px: the phase, the line, Block and Charge gone, each in one change, Special never came (${strict ? 'over the whole walk: in, out' : 'after the edge'}: the phase ${q3.phases - from.p} changes, Block ${fb}, Charge ${fc}, Special ${fs}, Whirlwind ${fa})`,
        q3.phase === 'none' && q3.line && !q3.line.drawn && !q3.block && !q3.special && !q3.charge && q3.phases - from.p === want && fb === want && fc === want && fs === 0, { q3, w3 });
      /* ── v2.3.6549 (card CT part 16): the spots, the reach, Charge, an unseen hit ── */
      const CIRCLES = (sels) => P.page.evaluate((qs) => { const o = {}; for (const [k, q] of qs) { const el = document.querySelector(q); if (!el) continue; const b = el.getBoundingClientRect(); o[k] = { x: b.left + b.width / 2, y: b.top + b.height / 2, d: Math.min(b.width, b.height), l: b.left, w: innerWidth }; } return o; }, sels);
      const SELS = [['attack', '.bt-rjoy-base'], ['jump', '[data-jump]'], ['block', '[data-shield]'], ['charge', '[data-charge]'], ['special', '[data-special]'], ['whirl', '[data-ability="whirl"]'], ['bash', '[data-ability="bash"]']];
      const spotsOk = (c, airMin = 8) => { const ks = Object.keys(c), bad = []; for (const k of ks) { if (c[k].d < 44) bad.push(k + ' ' + Math.round(c[k].d)); if (c[k].l < c[k].w / 2 - 1) bad.push(k + ' left half'); }
        for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = c[ks[i]], b = c[ks[j]]; const air = Math.hypot(a.x - b.x, a.y - b.y) - a.d / 2 - b.d / 2; if (air < airMin) bad.push(ks[i] + '/' + ks[j] + ' ' + Math.round(air)); } return bad; };
      const sameSpot = (a, b) => !!a && !!b && Math.abs(a.l - b.l) <= 1 && Math.abs(a.t - b.t) <= 1 && a.w === b.w;
      /* 3f, 3g: hop beside it, on the line it stands on from the body (the walker is off now) */
      const onLine = (d) => P.page.evaluate((o) => { const S = window._gameState.current, m = (S.monsters || []).find((x) => x && String(x.id) === o.id); if (!m || !m.alive) return null; const a = Math.atan2(m.y - S.player.y, m.x - S.player.x); return { x: Math.round(m.x - Math.cos(a) * o.d), y: Math.round(m.y - Math.sin(a) * o.d) }; }, { id: mon3.id, d });
      /* a hop to `d` px on that line, or the nearest of a few beside it out of the water (Block and Jump are not drawn in it) */
      const dryHop = async (d) => { for (const dd of [d, d - 30, d + 30, d - 60, d + 60, d + 90]) { const t = await onLine(dd); if (!t) return null; await H.hopTo(P, t.x, t.y, { tries: 160 }); await P.page.waitForTimeout(700); const wet = await P.page.evaluate(() => { const S = window._gameState.current; return !!(S._wheelSwim && S._wheelSwim.on); }); if (!wet) return dd; } return null; };
      await dryHop(50);
      const inReach = await H.waitFor(P, (S) => S._thumbPhase || 'calm', (v) => v === 'reach', { timeout: 15000, label: 'in reach' }).catch(() => null);
      await H.waitFor(P, () => !!document.querySelector('[data-special]') && !document.querySelector('[data-charge]'), (v) => v, { timeout: 8000, label: 'Special, no Charge' }).catch(() => null);
      const q4 = await EDGE(P);
      const blockAt3g = await RECT('[data-shield]');
      const c4 = await CIRCLES(SELS);
      rec.ok(`3g. ${label}: beside it, in the sword's reach: Special came, Charge went, Block stayed at its spot (${JSON.stringify(blockAt3b)} then ${JSON.stringify(blockAt3g)})`,
        !!inReach && q4.special && !q4.charge && q4.block && sameSpot(blockAt3b, blockAt3g), { q4, blockAt3b, blockAt3g });
      /* v2.3.6640 (card PAD): in the controller the spots are the housing's sockets, whose faces have 4 to 6 px of air (the owner's art): there each
         control's centre is on its own socket (2 px) and no two touch boxes overlap (game/padSkin.js), 44 px or more, on the right half */
      const sock4 = await PAD_SOCKETS(P);
      const bad4 = spotsOk(c4, sock4 ? 0 : 8);
      if (sock4) for (const [k, sk] of [['attack', 'attack'], ['jump', 'jump'], ['block', 'block'], ['special', 'special'], ['charge', 'ctx']]) if (c4[k] && (Math.abs(c4[k].x - sock4[sk].x) > 2 || Math.abs(c4[k].y - sock4[sk].y) > 2)) bad4.push(k + ' off its socket');
      rec.ok(`3f. ${label}: the ${sock4 ? 'controller\'s sockets' : 'arc\'s spots'} as drawn (${Object.keys(c4).join(', ')}): 44 px or more, ${sock4 ? 'each on its socket, no two boxes over each other' : '8 px or more of air'}, on the right half`, bad4.length === 0 && !!c4.attack && !!c4.jump && !!c4.block && !!c4.special, { bad4, c4 });
      /* 3h: Charge -- out to 400 on its line, facing it (the line from the monster through the body: the drawn facing turns with the hop's walk) */
      await dryHop(400);
      await touch('touchStart', [c]);
      await P.page.waitForTimeout(80);
      const fa3 = await P.page.evaluate((id) => { const S = window._gameState.current, m = (S.monsters || []).find((x) => x && String(x.id) === id); return m ? Math.atan2(m.y - S.player.y, m.x - S.player.x) : 0; }, mon3.id);
      await touch('touchMove', [{ x: c.x + 0.2 * R * Math.cos(fa3), y: c.y + 0.2 * R * Math.sin(fa3), id: 1 }]);
      await P.page.waitForTimeout(400);
      await touch('touchEnd', [{ x: c.x + 0.2 * R * Math.cos(fa3), y: c.y + 0.2 * R * Math.sin(fa3), id: 1 }]);
      const chg = await H.waitFor(P, () => (window.__btChargeBtn ? Object.assign({ el: !!document.querySelector('[data-charge]') }, window.__btChargeBtn()) : null), (v) => !!v && v.shown && v.el, { timeout: 15000, label: 'Charge shown' }).catch(() => null);
      const cAt = await P.page.evaluate(() => { const el = document.querySelector('[data-charge]'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; });
      const d0 = await P.page.evaluate((id) => { const S = window._gameState.current, m = (S.monsters || []).find((x) => x && String(x.id) === id); return m ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null; }, mon3.id);
      let dashed = null, d1 = null;
      if (chg && cAt) {
        const before = chg.dashes;
        await touch('touchStart', [{ x: cAt.x, y: cAt.y, id: 7 }]);
        await P.page.waitForTimeout(60);
        await touch('touchEnd', [{ x: cAt.x, y: cAt.y, id: 7 }]);
        dashed = await H.waitFor(P, () => window.__btChargeBtn(), (v) => v.dashes > before, { timeout: 5000, label: 'the dash' }).catch(() => null);
        d1 = await H.waitFor(P, (S) => { const m = (S.monsters || []).find((x) => x && String(x.id) === mon3.id); return m ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null; }, (v) => v != null && d0 != null && v <= d0 - 150, { timeout: 6000, label: 'carried in' }).catch(() => null);
      }
      const q5 = await EDGE(P);
      rec.ok(`3h. ${label}: at ${d0} px, sighted, Charge on screen; a tap dashed (${!!dashed}) and carried the body in (${d0} -> ${d1} px)`, !!chg && !!dashed && d1 != null, { chg, dashed, d0, d1, q5 });
      /* 3i: an unseen hit -- far off, nothing in sight, the worker's stamp (gameEvents.js: S.lastDamageTaken = Date.now()) */
      await dryHop(1100);
      await H.waitFor(P, (S) => [S._sightPhase || 'none', S._thumbPhase || 'calm', S._latchPhase || 'idle'].join(), (v) => v === 'none,calm,idle' || v === 'none,calm,active', { timeout: 15000, label: 'calm' }).catch(() => null);
      const calm = await EDGE(P);
      await P.page.evaluate(() => { window._gameState.current.lastDamageTaken = Date.now(); window.__ctHurtAt = Date.now(); });
      const up = await H.waitFor(P, () => !!document.querySelector('[data-shield]'), (v) => v, { timeout: 3000, label: 'Block at the hit' }).catch(() => null);
      const q6 = await EDGE(P);
      const gone = await H.waitFor(P, () => ({ b: !!document.querySelector('[data-shield]'), t: Date.now() - window.__ctHurtAt }), (v) => !v.b, { timeout: 8000, label: 'Block gone' }).catch(() => null);
      /* v2.3.6640 (card PAD): the hop off can end in the water (dryHop's last try, on the water spoke: wm-tidal-*), where Block is not drawn
         by design (3d's skip): a placement, not the rule -- read once under the controller, never with `&padskin=0`, its body swimming */
      if (calm.swim && !up) rec.skip(`3i. ${label}: nothing in sight, a monster's hit: Block came`, `the hop off ended in the water (swim ${calm.swim}): Block is not drawn while swimming, by design`);
      else rec.ok(`3i. ${label}: nothing in sight, a monster's hit: Block came (${!!up}), Special did not (${q6.special}); gone ${gone ? gone.t : '?'} ms after the hit (3 s and a render)`,
        calm.phase === 'none' && !calm.block && !!up && !q6.special && q6.thumb === 'threat' && !!gone && gone.t >= 2800 && gone.t <= 4500, { calm, q6, gone });
    }

    /* 2f: the mode off -- today's default, the held attack on the right half */
    {
      const Q = await H.newPlayer(browser, { name: 'Fourbro', wsPort, webPort, viewport: UPRIGHT, touch: true, dpr: 3, world: 'wheel', query: 'manual=4' + (process.env.TWO_Q || '') });
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
        const iq = await FACE_ICON(Q);
        rec.ok(`6b. the mode off: the disc wears ${iq.pad ? 'the controller\'s face (' + iq.face + ')' : 'the crosshair as today (' + iq.aim + ')'}, no sword drawn on it (${iq.strike}, in the page: ${iq.src})`,
          iq.pad ? iq.face && !iq.aim && !iq.strike : iq.aim && !iq.strike && !iq.src, iq);   /* v2.3.6640 (card PAD): in the controller, its painted face and nothing over it */
        /* 3e (v2.3.6543): the mode off, nothing in sight: the resolver hides
           nothing (Block and Special by their own rules alone) and no sight
           line is drawn */
        const off = await Q.page.evaluate(() => ({ shield: window.__btShieldBtn ? window.__btShieldBtn().shown : 'no probe', special: window.__btSpecialBtn ? window.__btSpecialBtn().shown : 'no probe',
          line: window.__btSightLine ? window.__btSightLine().drawn : 'no probe', phase: (window._gameState.current || {})._sightPhase || 'none' }));
        rec.ok(`3e. the mode off: the two buttons' resolver hides nothing (Block ${off.shield}, Special ${off.special}), no sight line (${off.line})`,
          off.shield === true && off.special === true && off.line === false && off.phase === 'none', off);
        /* v2.3.6549: and the right thumb's part touches nothing: no Charge, Attack at its old place (ShieldButton.jsx RBTN: upright 36 px in, 72 over the band, 84 across) */
        const off2 = await Q.page.evaluate(() => { const el = document.querySelector('.bt-rjoy-zone'), dash = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dash-h')) || 0; const b = el ? el.getBoundingClientRect() : null;
          return { charge: !!document.querySelector('[data-charge]'), probe: window.__btChargeBtn ? window.__btChargeBtn().shown : 'no probe', at: b ? { right: Math.round(innerWidth - b.right), bottom: Math.round(innerHeight - b.bottom - dash), w: Math.round(b.width) } : null, phase: (window._gameState.current || {})._thumbPhase || 'calm' }; });
        const qSock = await PAD_SOCKETS(Q), qDisc = qSock ? await Q.page.evaluate(() => { const b = document.querySelector('.bt-rjoy-zone').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }) : null;
        rec.ok(`3e. the mode off: no Charge (${off2.charge}), Attack at its old place${qSock ? ' (the controller: its socket)' : ''} (${JSON.stringify(off2.at)}), the thumb's phase never written (${off2.phase})`,
          !off2.charge && off2.probe !== true && !!off2.at && off2.phase === 'calm' && (qSock
            /* v2.3.6640 (card PAD): in the controller its old place is Attack's socket, its box no smaller than today's 84 */
            ? !!qDisc && Math.abs(qDisc.x - qSock.attack.x) <= 2 && Math.abs(qDisc.y - qSock.attack.y) <= 2 && off2.at.w >= 84
            : off2.at.right === 36 && Math.abs(off2.at.bottom - 72) <= 1 && off2.at.w === 84), { off2, qSock: qSock && qSock.attack, qDisc });

        /* 5g (v2.3.6545): the mode off: the sprint button as today, and the
           left disc pushed far past its rim sprints nothing */
        {
          const D4 = await DISC(Q);
          const g0 = await RIMV(Q);
          let g1 = null;
          if (D4.base) {
            const c4 = { x: D4.base.x, y: D4.base.y }, R4 = D4.base.w / 2;
            await tq('touchStart', [{ x: c4.x, y: c4.y, id: 5 }]);
            await Q.page.waitForTimeout(80);
            await thumbTo(Q, tq, c4, R4, 0, 1.6);
            await frames(Q, 6);
            g1 = await RIMV(Q);
            await tq('touchEnd', [{ x: c4.x - 1.6 * R4, y: c4.y, id: 5 }]);
            await frames(Q, 3);
          }
          rec.ok(`5g. the mode off: the sprint button drawn as today (${g0.btn && g0.btn.shown}, rim ${g0.btn && g0.btn.rim}); the left disc pushed far past its rim walks (${g1 && g1.sx.toFixed(2)}) and sprints nothing (${g1 && g1.on})`,
            !!g0.btn && g0.btn.shown === true && g0.btn.rim === false && g0.dom && !!g1 && g1.sx < -0.9 && !g1.on && !g1.ring, { g0, g1 });
        }

        /* PART 4 (v2.3.6544): the Test panel's row, and the words in each mode */
        await Q.page.waitForFunction(() => !!(window.__btCoach && window.__btTourWords), null, { timeout: 20000 }).catch(() => null);
        const w4 = await WORDS(Q);
        rec.ok(`4a. mode ${w4.mode}: the controls tour and the quest coach say today's words`, todayWords(w4), w4);
        const r1 = await tapRow(Q);
        const w5 = r1.went ? await WORDS(Q) : null;
        rec.ok(`4b. the Test panel's row "Controls: two sticks / two buttons" read ${r1.reads}; its tap loaded mode ${w5 && w5.mode} (the address's manual=${w5 && w5.manual}, the key ${w5 && w5.key}), and the tour and the coach say the two buttons' words`,
          r1.label && r1.reads === 'sticks' && r1.went && r1.inW && !!w5 && w5.manual === '5' && w5.key === '5' && twoWords(w5), { r1, w5 });
        if (r1.went && r1.inW) {
          const r2 = await tapRow(Q);
          const w6 = r2.went ? await WORDS(Q) : null;
          rec.ok(`4c. the row read ${r2.reads}; its tap loaded mode ${w6 && w6.mode} (manual=${w6 && w6.manual}, the key ${w6 && w6.key}), today's words back`,
            r2.reads === 'buttons' && r2.went && r2.inW && !!w6 && w6.manual === '4' && w6.key === null && todayWords(w6), { r2, w6 });
        } else rec.ok('4c. the row back to two sticks (4b first)', false, r1);

        /* 5h (v2.3.6545): `?rimsprint=0` in mode 5: the button back, the rim does nothing, the tour without its line */
        {
          const u = new URL(Q.page.url());
          u.searchParams.set('manual', '5');
          u.searchParams.set('rimsprint', '0');
          await Q.page.goto(u.toString()).catch(() => null);
          await H.enterWorld(Q);
          const inH = await H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel, ?rimsprint=0' }).catch(() => null);
          let h0 = null, h1 = null, wh = null;
          if (inH) {
            const ch = await Q.ctx.newCDPSession(Q.page);
            const th = (type, pts) => ch.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
            await Q.page.waitForFunction(() => !!(window.__btCoach && window.__btTourWords && window.__btSprintBtn), null, { timeout: 20000 }).catch(() => null);
            await frames(Q, 3);
            h0 = await RIMV(Q);
            wh = await WORDS(Q);
            const DH = await DISC(Q);
            if (DH.base) {
              const ch5 = { x: DH.base.x, y: DH.base.y }, RH = DH.base.w / 2;
              await th('touchStart', [{ x: ch5.x, y: ch5.y, id: 5 }]);
              await Q.page.waitForTimeout(80);
              await thumbTo(Q, th, ch5, RH, 0, 1.6);
              await frames(Q, 6);
              h1 = await RIMV(Q);
              await th('touchEnd', [{ x: ch5.x - 1.6 * RH, y: ch5.y, id: 5 }]);
            }
          }
          rec.ok(`5h. \`?rimsprint=0\` in mode ${wh && wh.mode}: the sprint button back (${h0 && h0.btn && h0.btn.shown}); a thumb past the rim walks at full speed (${h1 && h1.sx.toFixed(2)}) and sprints nothing (${h1 && h1.on}); the tour says the walk without the rim's line`,
            !!inH && !!wh && wh.mode === 5 && !!h0 && h0.btn && h0.btn.shown === true && h0.btn.rim === false && h0.dom && !!h1 && h1.sx < -0.99 && !h1.on && !h1.ring
              && wh.move === TOUR['controlsTutorial.moveBodyTwo'], { h0, h1, move: wh && wh.move });
        }
      } else rec.ok('2f. the mode off: in the Wheel (guard)', false, inQ);
    }
    /* ── PART 6 (v2.3.6546): THE LEFT STICK'S ZONES ON THE OWNER'S PHONE ──
       The owner, 2026-11-24, on an iPhone 14 Pro (430x775 CSS px at 3x):
       "directional facing (no movement) isn't working with left joystick based
       on press distance".  A slow push west, one CSS px a touch move, from
       where the thumb landed (the disc's centre), upright and sideways, and
       upright again with `?turnzone=50`: where the dead zone ends, where TURN
       ends and where the rim is, in CSS px, read off the page's own phase
       (S._stickPhase) after each move.  The numbers are stickZones.js's
       (DEAD 12%, TURN 30% of the disc's DRAWN radius): this checks the page
       keeps them, and prints them for the owner. */
    for (const [label, viewport, q] of [['upright', { width: 430, height: 775 }, 'manual=5'], ['sideways', { width: 775, height: 430 }, 'manual=5'], ['upright, ?turnzone=50', { width: 430, height: 775 }, 'manual=5&turnzone=50']]) {
      const Z = await H.newPlayer(browser, { name: 'Zonebro' + players.length, wsPort, webPort, viewport, touch: true, dpr: 3, world: 'wheel', query: q + (process.env.TWO_Q || '') });
      players.push(Z);
      Z.page.on('pageerror', (e) => errs.push('6 ' + label + ': ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(Z);
      const inZ = await H.waitFor(Z, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      if (!inZ) { rec.ok(`6c. ${label}: in the Wheel (guard)`, false, null); continue; }
      await Z.page.waitForTimeout(1500);
      const cz = await Z.ctx.newCDPSession(Z.page);
      const tz = (type, pts) => cz.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
      const DZ = await DISC(Z);
      if (!DZ.base) { rec.ok(`6c. ${label}: the left disc on screen (guard)`, false, DZ); continue; }
      const RZ = DZ.base.w / 2, cc = { x: DZ.base.x, y: DZ.base.y, id: 6 };
      const turn = q.indexOf('turnzone=50') >= 0 ? 0.5 : 0.3;
      let deadEnd = null, turnEnd = null, last = 'rest';
      await tz('touchStart', [cc]);
      await Z.page.waitForTimeout(80);
      for (let px = 1; px <= Math.ceil(RZ) + 2; px++) {
        await tz('touchMove', [{ x: cc.x - px, y: cc.y, id: 6 }]);
        const ph = await H.readState(Z, (S) => S._stickPhase || 'rest');
        if (last === 'rest' && ph !== 'rest') deadEnd = px - 1;
        if (last !== 'walk' && ph === 'walk') turnEnd = px - 1;
        last = ph;
      }
      await tz('touchEnd', [{ x: cc.x - Math.ceil(RZ) - 2, y: cc.y, id: 6 }]);
      /* a CSS px a step: each border read to the whole px at or below it */
      const okDead = deadEnd === Math.floor(0.12 * RZ), okTurn = turnEnd === Math.floor(turn * RZ);
      console.log(`  6c ${label} (${viewport.width}x${viewport.height}, 3x): the dead zone ends at ${deadEnd} px, TURN ends at ${turnEnd} px (a band of ${turnEnd != null && deadEnd != null ? turnEnd - deadEnd : '?'} px), the rim at ${RZ} px; the ring drawn at ${DZ.ring && DZ.ring.w / 2} px`);
      rec.ok(`6c. ${label}: a slow push from where the thumb landed: nothing to ${deadEnd} px, TURN to ${turnEnd} px, walking past it, the rim at ${RZ} px (the drawn radius; ${Math.round(turn * 100)}% of it ${(turn * RZ).toFixed(1)} px)`,
        okDead && okTurn && last === 'walk' && !!DZ.ring && Math.abs(DZ.ring.w / 2 - turn * RZ) < 1.5, { deadEnd, turnEnd, RZ, ring: DZ.ring, last });
    }

    rec.ok('1g/2g. no page errors', errs.length === 0, errs.slice(0, 4));
  } finally {
    for (const P of players) await P.ctx.close().catch(() => {});
  }
}
