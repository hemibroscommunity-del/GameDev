/* ═══ v2.3.3266: ANOTHER PLAYER'S SHOT, AS IT FLIES ON THEIR SCREEN ═══
 *
 * src/game/peerShots.js -- how a watcher draws somebody else's arrow or bolt
 * (gameEvents.js reads it, visualSystems.js flies it), and which player a shot
 * of yours names (`tg`).  docs/specs/peer-shots.md.  Checked:
 *
 *   1. the numbers it is handed and the formulas it reads back are the game's:
 *      the bow's speed and reach, the volley's, the life a shooter sends;
 *   2. an arrow's copy flies the shooter's speed to the shooter's reach, for
 *      any Longshot and depth, and the volley stays 200 px apart;
 *   3. a bolt, and a shot that says its own speed, is exactly as before;
 *   4. what pierces;
 *   5. which player a shot names;
 *   6. where a copy reaches a player, that it is drawn solid to its reach as
 *      the shooter's own is, and where a player is drawn;
 *   7. the shooters name the player on every road a shot leaves by.
 */
import { readFileSync } from 'node:fs';
import { PEER_SHOT, peerShotFlight, shotTargetId, stepReaches, peerShotTargetAt } from '../../src/game/peerShots.js';
import { BOW_VOLLEY, volleyDelayMs } from '../../src/game/bowVolley.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const FRAME_MS = 1000 / 60;

/* ── 1. the game's numbers ─────────────────────────────────────────────── */
const projSrc = src('src/game/projectiles.js');
const gsSrc = src('src/data/gameSystems.js');
const arrowPx = Number((projSrc.match(/export var ARROW_SPEED_PX = (\d+(?:\.\d+)?);/) || [])[1]);
const reachPx = Number((gsSrc.match(/export const BOW_RANGE_PX = (\d+(?:\.\d+)?);/) || [])[1]);
const C = { arrowPx, reachPx, volleyK: BOW_VOLLEY.SPEED_K, peerPx: BOW_VOLLEY.PEER_PX_PER_FRAME };
{
  check('1a the bow\'s speed and reach are read off the game (ARROW_SPEED_PX 24, BOW_RANGE_PX 675)', arrowPx === 24 && reachPx === 675, { arrowPx, reachPx });
  check('1b the callers hand peerShots the game\'s own numbers (gameEvents.js)',
    /arrowPx: ARROW_SPEED_PX, reachPx: BOW_RANGE_PX, volleyK: BOW_VOLLEY\.SPEED_K, peerPx: BOW_VOLLEY\.PEER_PX_PER_FRAME/.test(src('src/networking/gameEvents.js')));
  /* the shooter's own arrow: ARROW_SPEED_PX x _rangeMult a frame, to
     BOW_RANGE_PX x _rangeMult, _rangeMult = bowRangeMult x depthK */
  check('1c the shooter\'s arrow flies ARROW_SPEED_PX x _rangeMult and comes down at BOW_RANGE_PX x _rangeMult (projectiles.js)',
    /ARROW_SPEED_PX \* \(a\._rangeMult \|\| 1\)/.test(projSrc) && /a\.dist > BOW_RANGE_PX \* \(a\._rangeMult \|\| 1\)/.test(projSrc));
  const mc = src('src/game/monsterCombat.js');
  check('1d ...its _rangeMult is bowRangeMult x depthK, and its relay\'s life is 90 x the same (monsterCombat.js)',
    /_rangeMult: \(isStaff \? 1 : bowRangeMult\(S\.rpg\)\) \* depthK\(S\.currentZone, P\.y\)/.test(mc)
    && /90 \* \(bowRangeMult\(S\.rpg\) \|\| 1\)\) \* depthK\(S\.currentZone, P\.y\)/.test(mc) && PEER_SHOT.LIFE_PER_K === 90);
  const pa = src('src/game/playerActions.js');
  check('1e the volley\'s life is 90 x its own reach multiplier, and its wait is sized for PEER_PX_PER_FRAME (playerActions.js)',
    /life: Math\.round\(90 \* _bowStat \* depthK\(S\.currentZone, S\.player\.y\)\)/.test(pa)
    && /delayMs: Math\.round\(volleyDelayMs\(bvj, BOW_VOLLEY\.PEER_PX_PER_FRAME\)\)/.test(pa)
    && /_bowSpd = _bowVolley \? ARROW_SPEED_PX \* _bowRange \* BOW_VOLLEY\.SPEED_K/.test(pa));
  check('1f the retreat shot\'s life is 90 x its reach multiplier too (dodge.js)',
    /90 \* \(bowRangeMult\(R\) \|\| 1\)\) \* _dk\)/.test(src('src/game/dodge.js')) && /_rangeMult: \(isStaff \? 1 : bowRangeMult\(R\)\) \* _dk/.test(src('src/game/dodge.js')));
}

/* ── 2. an arrow's copy: the shooter's speed, the shooter's reach ────────── */
{
  const plain = peerShotFlight({ isStaff: false, life: 90 }, 90, C);
  check('2a a plain arrow is drawn at 24 px a frame and ends at 675 px (it was 8, to 720)', near(plain.speedPx, 24) && near(plain.reach, 675) && plain.holdFrames === 0 && !plain.pierce, plain);
  /* Longshot and depth scale speed and reach together, so the flight takes the
     same time on every screen: 675 / 24 = 28.1 frames */
  let same = true; const seen = [];
  for (const k of [0.5, 0.8, 1, 1.25, 1.6, 2, 2.6]) {
    const life = Math.round(90 * k);
    const f = peerShotFlight({ life }, life, C);
    const shooterSpeed = 24 * k, shooterReach = 675 * k;
    seen.push({ k, speed: +f.speedPx.toFixed(2), reach: Math.round(f.reach) });
    if (Math.abs(f.speedPx / shooterSpeed - 1) > 0.006 || Math.abs(f.reach / shooterReach - 1) > 0.006) same = false;
    if (Math.abs(f.reach / f.speedPx - 675 / 24) > 1e-6) same = false;
  }
  check('2b with Longshot and depth it flies the shooter\'s speed to the shooter\'s reach, within the life\'s rounding (<0.6%)', same, seen);
  check('2c a relay with no life (an old page) is the plain arrow', near(peerShotFlight({}, NaN, C).speedPx, 24) && near(peerShotFlight({}, NaN, C).reach, 675));
  const forged = peerShotFlight({ life: 600 }, 600, C), tiny = peerShotFlight({ life: 1 }, 1, C);
  check('2d a forged life cannot make a silly flight (multiplier held to 0.25..4)', near(forged.speedPx, 24 * 4) && near(tiny.speedPx, 24 * 0.25), { forged, tiny });
  /* the volley: 0.7 of the speed, and its waits sized by the shooter for
     8 px a frame are counted in this speed's frames: the train is 200 px */
  const vol = [0, 1, 2].map((i) => peerShotFlight({ isSpecial: true, volley: 1, life: 90, delayMs: Math.round(volleyDelayMs(i, BOW_VOLLEY.PEER_PX_PER_FRAME)) }, 90, C));
  check('2e a volley arrow flies 0.7 of the bow (16.8 px a frame) to the same reach', vol.every((f) => near(f.speedPx, 16.8) && near(f.reach, 675)), vol);
  check('2f ...and they leave 200 px apart (GAP_PX), as on the shooter\'s screen (was 25 frames at 8)', vol.every((f, i) => Math.abs(f.holdFrames * f.speedPx - i * BOW_VOLLEY.GAP_PX) < 0.5),
    vol.map((f) => +(f.holdFrames * f.speedPx).toFixed(1)));
  const volK = [0, 1, 2].map((i) => peerShotFlight({ isSpecial: true, volley: 1, life: 144, delayMs: Math.round(volleyDelayMs(i, 8)) }, 144, C));
  check('2g ...200 px apart however far Longshot sends them', volK.every((f, i) => Math.abs(f.holdFrames * f.speedPx - i * 200) < 0.5), volK.map((f) => +(f.holdFrames * f.speedPx).toFixed(1)));
  check('2h ...and none waits past the old cap (60 frames)', peerShotFlight({ isSpecial: true, volley: 1, life: 23, delayMs: 5000 }, 23, C).holdFrames === PEER_SHOT.HOLD_MAX);
  const lone = peerShotFlight({ isSpecial: true, life: 90 }, 90, C);
  check('2i an old worker\'s lone special flies the bow\'s full speed', near(lone.speedPx, 24) && near(lone.reach, 675), lone);
}

/* ── 3. a bolt, and a shot that names its speed, is as before ───────────── */
{
  const bolt = peerShotFlight({ isStaff: true, life: 135 }, 135, C);
  check('3a a bolt: its own 5 px (speedPx null), its life ends it (no reach), no wait', bolt.speedPx === null && bolt.reach === null && bolt.holdFrames === 0 && !bolt.pierce, bolt);
  const big = peerShotFlight({ isStaff: true, isSpecial: true, big: true, speedPx: 5, life: 135 }, 135, C);
  check('3b the big bolt keeps its speedPx', big.speedPx === 5 && big.reach === null, big);
  check('3c a staff orb\'s speed is still held to 20', peerShotFlight({ isStaff: true, speedPx: 99 }, 50, C).speedPx === 20);
  const said = peerShotFlight({ isStaff: false, speedPx: 12, life: 40, delayMs: 500 }, 40, C);
  check('3d an arrow that names its own speed keeps the old meaning: that speed, its life, its delay in its own frames', said.speedPx === 12 && said.reach === null && said.holdFrames === 30, said);
}

/* ── 4. what pierces ───────────────────────────────────────────────────── */
{
  check('4a a plain arrow does not', !peerShotFlight({ life: 90 }, 90, C).pierce);
  check('4b one with the Piercing stat does (pc)', peerShotFlight({ life: 90, pc: 1 }, 90, C).pierce);
  check('4c every bow special does (playerActions: pierce: true)', peerShotFlight({ life: 90, isSpecial: true }, 90, C).pierce && peerShotFlight({ life: 90, isSpecial: true, volley: 1 }, 90, C).pierce);
  check('4d a bolt never does', !peerShotFlight({ isStaff: true, pc: 1, isSpecial: true }, 90, C).pierce);
  check('4e the shooter\'s own arrow pierces for those same reasons',
    /pierce: !isStaff && bowPierceCount\(S\.rpg\) > 0/.test(src('src/game/monsterCombat.js')) && /pc: \(!isStaff && bowPierceCount\(S\.rpg\) > 0\) \? 1 : undefined/.test(src('src/game/monsterCombat.js')));
}

/* ── 5. which player a shot names ──────────────────────────────────────── */
{
  const lock = (id, type = 'player') => ({ lockedTarget: { type, id, ref: {} } });
  check('5a no lock: nobody', shotTargetId({}, false) === null && shotTargetId(null, false) === null);
  check('5b a monster locked: nobody', shotTargetId(lock('m1', 'monster'), false) === null);
  check('5c a player locked outside a safe zone: them', shotTargetId(lock('bp_abc'), false) === 'bp_abc');
  check('5d ...but not in a safe zone, where the hit test will not try them', shotTargetId(lock('bp_abc'), true) === null);
  check('5e in a duel, the opponent locked: them, safe zone or not', shotTargetId(Object.assign(lock('bp_foe'), { _inDuel: { opponent: 'bp_foe' } }), true) === 'bp_foe');
  check('5f in a duel, somebody else locked: nobody (the hit test tries only the opponent)', shotTargetId(Object.assign(lock('bp_x'), { _inDuel: { opponent: 'bp_foe' } }), false) === null);
  check('5g an id is sent as a string, and a silly one not at all', shotTargetId(lock(42), false) === '42' && shotTargetId(lock('x'.repeat(200)), false) === null);
  /* the same gate as projectiles.js's PvP hit test */
  check('5h ...the gate the shooter\'s PvP hit test uses (projectiles.js)',
    /S\._inDuel\s*\|\|\s*\(!\(\(ZONES\[S\.currentZone\] \|\| \{\}\)\.safe\)\s*&& S\.lockedTarget && S\.lockedTarget\.type === 'player' && S\.lockedTarget\.id\)/.test(projSrc.replace(/\n\s*/g, ' ')));
}

/* ── 6. reaching, fading, where they are drawn ─────────────────────────── */
{
  check('6a a 24 px step passing 20 px from a player reaches them (arrow room 28.6)', stepReaches(0, 0, 24, 0, 12, 20, PEER_SHOT.ARROW_R));
  check('6b ...one passing 30 px off does not', !stepReaches(0, 0, 24, 0, 12, 30, PEER_SHOT.ARROW_R));
  check('6c ...the step, not its end: a player it flew past this frame is reached', stepReaches(0, 0, 96, 0, 40, 10, PEER_SHOT.ARROW_R) && !stepReaches(96, 0, 96, 0, 40, 10, PEER_SHOT.ARROW_R));
  check('6d the room is the shooter\'s PvP test\'s: 22 + an arrow\'s half 6.6, a special 22 x 1.5',
    near(PEER_SHOT.ARROW_R, 22 + 6.6, 1e-9) && near(PEER_SHOT.SPECIAL_R, 22 * 1.5) && /PVP_BODY_R = 22\b/.test(projSrc + src('src/data/gameSystems.js') + src('src/game/combatHelpers.js')));
  /* the shooter's own arrow is drawn at min(1, life / 20) and comes down at
     its reach long before that life runs low; the copy counts down the life it
     was sent with (90 x the multiplier) by the same rule (effectsRenderer), so
     it too is solid all the way to its reach -- mp-projlook holds it there */
  let solid = true; const left = [];
  for (const k of [0.6, 0.8, 1, 1.25, 1.6, 2, 2.6]) {
    const life = Math.round(90 * k);
    const f = peerShotFlight({ life }, life, C);
    const atReach = life - f.reach / f.speedPx;   /* frames of life left when it gets there */
    left.push(+atReach.toFixed(1));
    if (atReach < 20) solid = false;
  }
  check('6e a copy is drawn solid all the way to its reach, as the shooter\'s own is (life/20 never under 1 before it gets there)', solid
    && /const _rFade = Math\.min\(1, \(rp\.life \|\| 0\) \/ 20\);/.test(src('src/rendering/systems/effectsRenderer.js')), left);
  const S = { myId: 'me', player: { x: 100, y: 200, renderX: 999 }, others: { p2: { x: 1, y: 2, renderX: 50, renderY: 60 }, p3: { x: NaN, y: 2 } } };
  check('6f you are where you are (never a drawn copy)', JSON.stringify(peerShotTargetAt(S, 'me')) === JSON.stringify({ x: 100, y: 200 }));
  check('6g another player where their copy is drawn', JSON.stringify(peerShotTargetAt(S, 'p2')) === JSON.stringify({ x: 50, y: 60 }));
  check('6h nobody, or nowhere: null', peerShotTargetAt(S, 'p9') === null && peerShotTargetAt(S, 'p3') === null && peerShotTargetAt(null, 'me') === null);
}

/* ── 7. every road a shot leaves by names the player ───────────────────── */
{
  const mc = src('src/game/monsterCombat.js'), dg = src('src/game/dodge.js'), pa = src('src/game/playerActions.js');
  check('7a the bow and staff\'s own shot (monsterCombat.js)', /tg: shotTargetId\(S, \(ZONES\[S\.currentZone\] \|\| \{\}\)\.safe\) \|\| undefined/.test(mc));
  check('7b the retreat shot (dodge.js)', /tg: shotTargetId\(S, \(ZONES\[S\.currentZone\] \|\| \{\}\)\.safe\) \|\| undefined/.test(dg));
  check('7c the bow volley, the big bolt and the three orbs (playerActions.js)', (pa.match(/shotTargetId\(S, \(ZONES\[S\.currentZone\] \|\| \{\}\)\.safe\)/g) || []).length === 3
    && /tg: _shotTg/.test(pa));
  check('7d the watcher reads it, and what pierces (gameEvents.js)', /pierce: _rpFl\.pierce/.test(src('src/networking/gameEvents.js')) && /tg: \(typeof payload\.tg === 'string'/.test(src('src/networking/gameEvents.js')));
  const vs = src('src/game/visualSystems.js');
  check('7e the copy flies to its reach, keeps its line, and a piercing one flies on through (visualSystems.js)',
    /if \(rp\.reach != null && rp\.dist >= rp\.reach\) return peerShotEnd\(rp, 'reach'\);/.test(vs) && /rp\._x0 = owner \? \(owner\.renderX \|\| owner\.x\) : rp\.x;/.test(vs) && /else if \(!rp\.pierce\)/.test(vs));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) { console.log('FAILED'); process.exit(1); }
console.log('ALL PASS');
