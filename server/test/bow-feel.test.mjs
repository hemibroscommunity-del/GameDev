/* THE BOW'S FEEL (v2.3.4802): tension, stillness, the snap -- the phone's half
 * of the bow's draw (src/game/bowDraw.js the rules, src/game/bowFeel.js the
 * wiring, src/rendering/systems/bowFeelFx.js the drawer, src/data/bowFeelSound.js
 * the sounds; docs/specs/bow-feel.md).  The owner, 2026-11-11: "Think about
 * the sword swing.  The bow pull back and release."  The worker's half is
 * server/src/drawgather.js (draw-gather.test).
 *
 *   1. THE NUMBERS are the worker's: the full draw, the perfect window, the
 *      claim's allowance (its SLACK_MS), the gap over its MIN_GAP_MS.
 *   2. ONE PHASE, ONE TRANSITION: nock, draw past the pull, let the string
 *      down at the centre, loose on the lift, cancel; a computer's press.
 *   3. DRAW -> SHARE, THE SETTLE, THE TIRED ARM: the view by the time.
 *   4. THE BOUND: a draw read as the worker will count it.
 *   5. THE CLAIM YOU SEND, through a real GameRoom: `dr` on the relay, `sw` on
 *      the hit -- the worker's `pw` is the phone's share and its `pf` the
 *      phone's gold line, for draws all along the way.
 *   6. THE HOOK: the touch handlers' own manual-combat calls carry the draw;
 *      no hook (or the hook off) is today's flick, exactly.
 *   7. THE LOOK: the walk (slower only), the aim line wide to crisp gold to
 *      trembling, the string's bend, the pose's frame.
 *   8. THE SOUNDS: every node let go; every kind labelled in the Sound Studio.
 *   9. THE WIRING and the switch. */
import { readFileSync } from 'node:fs';
import { BOW_FEEL, bowState, bowStep, bowClaimMs, bowView, bowPerfect, bowWire, bowWalkMult, bowLineLook, bowStringPx, bowPoseFrame } from '../../src/game/bowDraw.js';
import * as PHONE from '../../src/game/drawGather.js';
import { MANUAL, setManualCombat, mcSetBowHook, mcBowSling, mcShotAngle, mcSwipeStart, mcSwipeMove, mcSwipeEnd, mcAbort, mcAskShot, mcFrame, mcBowDraws } from '../../src/game/manualCombat.js';
import { feelSwitch } from '../../src/game/weaponFeel.js';
import { bowSynth } from '../../src/data/bowFeelSound.js';
import { GameRoom } from '../src/index.js';
import { DRAW_GATHER } from '../src/drawgather.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); } else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const near = (a, b, e) => Math.abs(a - b) <= (e == null ? 1e-9 : e);
const FULL = 371;   /* a new character's full draw (draw-gather.test §1) */

// ── 1. the numbers ──
{
  const DG = read('../src/drawgather.js');
  check('1a MIRROR: the claim\'s allowance is the worker\'s own SLACK_MS (100), not the sword kit\'s 150',
    BOW_FEEL.CLAIM_ALLOW_MS === DRAW_GATHER.SLACK_MS && DRAW_GATHER.SLACK_MS === 100 && /SLACK_MS: 100,/.test(DG));
  check('1b a loose no sooner than the worker counts one (its MIN_GAP_MS 100), with the network\'s 50 between: the free swing\'s gap',
    BOW_FEEL.GAP_MS === MANUAL.FREE_GAP_MS && BOW_FEEL.GAP_MS > DRAW_GATHER.MIN_GAP_MS);
  check('1c the full draw and the perfect window are the worker\'s (drawGather.js): 371 ms on a new character, 300 after it',
    PHONE.fullDrawMs(495) === FULL && PHONE.DRAW_GATHER.PERFECT_DRAW_MS === 300 && PHONE.DRAW_GATHER.PERFECT_DRAW_MS === DRAW_GATHER.PERFECT_DRAW_MS);
  check('1d the pull is a flick\'s length, the cancel the stick\'s dead zone (the slingshot bow\'s)', BOW_FEEL.PULL_PX === MANUAL.SWIPE_PX && BOW_FEEL.CENTRE_PX === MANUAL.CENTRE_PX);
  check('1e the rules import only the pure rules (node runs them)', (read('../../src/game/bowDraw.js').match(/^import /gm) || []).length === 2
    && /^import \{ DRAW_GATHER, buildShare, buildWire \} from '\.\/drawGather\.js';/m.test(read('../../src/game/bowDraw.js')));
}

// ── 2. one phase, one transition ──
{
  const st = bowState();
  const seq = [];
  const go = (type, now, x, y) => { const a = bowStep(st, { type, now, x, y }); seq.push(a + ':' + st.phase); return a; };
  go('down', 1000, 100, 100);
  go('move', 1010, 110, 100);   /* 10 px: still nocked */
  go('move', 1020, 125, 100);   /* 25 px: drawn */
  const drawAt = st.drawAt;
  go('move', 1100, 104, 100);   /* back to 4 px: let down */
  go('move', 1200, 130, 100);   /* out again: a new draw */
  const drawAt2 = st.drawAt;
  go('up', 1500, 130, 100);     /* lifted out: loosed */
  check('2a thumb down nocks; a roll under the pull does nothing; past the pull it draws; back to the touch point lets the string down; out again draws afresh; the lift looses',
    seq.join(' ') === 'nock:nock none:nock draw:drawing letdown:nock draw:drawing loose:idle' && drawAt === 1020 && drawAt2 === 1200, seq);
  check('2b the loose carries its draw: from the pull past the line to the lift (not from the nock)', st.loose && st.loose.drawMs === 300 && st.loose.at === 1500, st.loose);
  check('2c the one field: the phase is idle, nock or drawing -- the draw\'s look (full, tired) is never stored', Object.keys(st).filter((k) => /phase/i.test(k)).length === 1);
  const st2 = bowState();
  bowStep(st2, { type: 'down', now: 0, x: 0, y: 0 });
  const tap = bowStep(st2, { type: 'up', now: 90, x: 3, y: 0 });
  bowStep(st2, { type: 'down', now: 200, x: 0, y: 0 });
  bowStep(st2, { type: 'move', now: 220, x: 0, y: 30 });
  const back = bowStep(st2, { type: 'up', now: 400, x: 0, y: 5 });   /* lifted at the centre with no move there */
  bowStep(st2, { type: 'down', now: 500, x: 0, y: 0 });
  bowStep(st2, { type: 'move', now: 520, x: 0, y: 30 });
  const ab = bowStep(st2, { type: 'abort', now: 600 });
  check('2d a tap is no shot (cancel); a draw lifted back at the touch point is no shot; a press ended some other way (the shield, a harvest) is no shot',
    tap === 'cancel' && back === 'cancel' && ab === 'cancel' && st2.phase === 'idle' && st2.n.loose === 0, st2.n);
  const st3 = bowState();
  const dd = bowStep(st3, { type: 'deskdown', now: 50 });
  const mv = bowStep(st3, { type: 'move', now: 60, x: 900, y: 900 });
  const tu = bowStep(st3, { type: 'up', now: 70, x: 0, y: 0 });
  const du = bowStep(st3, { type: 'deskup', now: 450 });
  check('2e a computer: the button down nocks and draws at once (no pull to make), a touch event touches nothing of it, its release looses',
    dd === 'draw' && mv === 'none' && tu === 'none' && du === 'loose' && st3.loose.drawMs === 400, { dd, mv, tu, du, loose: st3.loose });
}

// ── 3. draw -> share, the settle, the tired arm ──
{
  const st = bowState();
  bowStep(st, { type: 'down', now: 0, x: 0, y: 0 });
  bowStep(st, { type: 'move', now: 10000, x: -30, y: 0 });   /* the draw starts at 10000, the last shot long ago */
  const at = (ms) => bowView(st, 10000 + ms, FULL, 1);
  const half = at(185.5), edge = at(FULL - 1), full = at(FULL), mid = at(FULL + 150), last = at(FULL + 300), past = at(FULL + 301), tired = at(FULL + 300 + BOW_FEEL.TIRE_MS);
  check('3a the share fills with the draw: half at half the full draw (the worker\'s buildShare), a hair under full still drawing',
    half.phase === 'draw' && near(half.r, 0.5) && edge.phase === 'draw' && edge.r < 1 && !edge.perfect);
  check('3b FULL DRAW SETTLES: from full to 300 ms after it the draw is "full" and a loose is the perfect shot (the worker\'s window, both edges)',
    full.phase === 'full' && full.perfect && full.r === 1 && mid.phase === 'full' && near(mid.settleT, 0.5, 0.01) && last.phase === 'full' && last.perfect
    && bowPerfect(FULL, FULL, FULL) && bowPerfect(FULL + 300, FULL + 300, FULL) && !bowPerfect(FULL + 301, FULL + 301, FULL));
  check('3c HELD TOO LONG THE ARM TIRES: a ms past the window it is tired, no longer perfect, still a full share; the tiredness grows to 1',
    past.phase === 'tired' && !past.perfect && past.r === 1 && past.tireT > 0 && past.tireT < 0.01 && tired.tireT === 1);
  check('3d a nock shows no draw (share 0); nothing nocked: no view', at(0).phase === 'draw' && bowView(bowState(), 5, FULL, 0) === null
    && (() => { const s = bowState(); bowStep(s, { type: 'down', now: 0, x: 0, y: 0 }); const v = bowView(s, 900, FULL, 0); return v.phase === 'nock' && v.r === 0; })());
}

// ── 4. the bound ──
{
  check('4a a draw is read as the worker counts it: never more than the time since the last shot plus 100; none before: the draw itself; nonsense: 0',
    bowClaimMs(371, 200) === 300 && bowClaimMs(371, 5000) === 371 && bowClaimMs(371, Infinity) === 371 && bowClaimMs(-4, 50) === 0 && bowClaimMs(NaN, 50) === 0 && bowClaimMs(371, -50) === 100);
  const st = bowState();
  bowStep(st, { type: 'down', now: 0, x: 0, y: 0 });
  bowStep(st, { type: 'move', now: 10000, x: -30, y: 0 });
  /* the last shot 150 ms before this draw began: at a full draw's time the worker counts 371 + 50... no: since-last 521 + 100 */
  const fresh = bowView(st, 10000 + FULL, FULL, 10000 + FULL - 200);   /* a shot 200 ms ago: the draw reads 300 */
  check('4b a draw begun right after another shot is counted short by the bound: the bend and the gold line show what the worker will count, not more',
    fresh.counted === 300 && fresh.phase === 'draw' && !fresh.perfect && near(fresh.r, 300 / FULL), fresh);
  check('4c the `dr` sent is the raw draw, whole ms (the worker bounds it): 371.6 -> 372, nothing -> 0, past a minute -> a minute',
    bowWire(371.6) === 372 && bowWire(0) === 0 && bowWire(1e9) === PHONE.DRAW_GATHER.CLAIM_MAX_MS);
}

// ── 5. the claim you send, through the real worker ──
{
  let T = 1_978_000_000_000;
  const realNow = Date.now;
  Date.now = () => T;
  const realRandom = Math.random;
  Math.random = () => 0.5;
  const store = new Map();
  const state = {
    storage: { get: async (k) => store.get(k), put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
  const room = new GameRoom(state, { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ADMIN_KEY: 'bf-key' });
  room._liveFlags = {};
  const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_bf_one', name: 'bf', phrase: 'p-bf', ws: [1, 5], protocolVersion: 2, fs: 2, data: { x: 0, y: 0, z: 'town' } }));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const ps = room.playerState.bp_bf_one, sess = room.sessions.get(ws);
  room._saveRpg = () => {}; room._saveRpgVitals = () => {}; room._saveRpgPools = () => {}; room._queuePlayerStateFlush = () => {};
  room.stateHistory = {}; room._prog3AwardXp = () => {};
  room._rollHit = () => ({ dmg: 100, isCrit: false });
  const caps = (ws.sent.find((x) => x.type === 'state_sync') || {}).caps || {};
  check('5a the worker advertises caps.bowDraw (what bowFeelOn gates on)', caps.bowDraw === 1, caps);
  const ZONE = 'meadow';
  const results = [];
  let mid = 0;
  for (const ms of [60, 185, 300, FULL, FULL + 120, FULL + 300, FULL + 301, 1500]) {
    ps.weapon = { type: 'sword', name: 'sword', tierMult: 1.25, quality: 'normal' };
    ps.rangedWeapon = { type: 'bow', tierMult: 1 }; ps.activeSlot = 'ranged';
    ps.z = ZONE; ps.x = 500; ps.y = 500; ps.dead = false; ps.dying = false; ps.disconnected = false; ps.maxMana = 100; ps.mana = 0; ps.manaBlocks = 5; ps.amulet = null;
    delete ps._monHitCad; delete ps._hitBucket; ps._dg = undefined; ps._pfb = undefined; ps._fs = undefined; sess.relayTokens = undefined;
    room.monsters[ZONE] = [];
    const zcfg = room._getZoneConfig(ZONE);
    const m = room._makeZoneMonster(ZONE, zcfg, (zcfg && zcfg.spawns && zcfg.spawns[0]) || { arch: 'fodder' }, 'bf-m' + (++mid), 620, 500, 3);
    m.hp = m.maxHp = 1e7; m.alive = true; m.atkCd = T + 1e9; m.element = null; m.statuses = {};
    room.monsters[ZONE].push(m);
    T += 10000;
    /* THE PHONE: a real draw by the rules, its last shot long ago */
    const st = bowState();
    bowStep(st, { type: 'down', now: T - ms - 40, x: 200, y: 600 });
    bowStep(st, { type: 'move', now: T - ms, x: 200, y: 640 });
    const v = bowView(st, T, FULL, T - 10000);
    bowStep(st, { type: 'up', now: T, x: 200, y: 640 });
    const dr = bowWire(st.loose.drawMs);
    /* THE WIRE: the relay with `dr` and its `ts`, then the arrow's claim naming it */
    const ts = T;
    room.eventBuffer.length = 0;
    await room.webSocketMessage(ws, JSON.stringify({ type: 'player_projectile', payload: { id: 'bp_bf_one', x: 500, y: 500, ang: 0, isStaff: false, ts, dr } }));
    const relay = room.eventBuffer.find((e) => e.type === 'player_projectile');
    T += 120;
    room.eventBuffer.length = 0;
    room._handleMonsterDamage(sess, { monsterId: m.id, zone: ZONE, slot: 'ranged', element: null, sw: ts });
    const hit = room.eventBuffer.find((e) => e.type === 'monster_hit' && !e.payload.splash);
    const pw = hit ? (hit.payload.pw == null ? 1 : hit.payload.pw) : null;
    results.push({ ms, dr, r: +v.r.toFixed(2), phonePerfect: v.perfect, phase: v.phase, pw, pf: hit ? hit.payload.pf === 1 : null, relayDr: relay && relay.payload && relay.payload.dr });
  }
  Date.now = realNow; Math.random = realRandom;
  const ok = results.every((x) => x.pw != null && x.pf === x.phonePerfect && (x.pf ? near(x.pw, 1.12, 0.005) : near(x.pw, Math.round(x.r * 100) / 100, 0.011)));
  check('5b THE CLAIM: every draw the phone looses lands its share (the worker\'s `pw` = the phone\'s r), and the worker\'s perfect (`pf`) is exactly the phone\'s gold line -- 60 ms to 1.5 s, both edges of the window',
    ok && results.filter((x) => x.pf).length === 3 && results.find((x) => x.ms === FULL + 301).phase === 'tired' && !results.find((x) => x.ms === FULL + 301).pf, results);
  check('5c the relay others get carries the draw the worker counted', results.every((x) => x.relayDr === x.dr), results.map((x) => [x.dr, x.relayDr]));
}

// ── 6. the hook ──
{
  const st = bowState();
  let hookOn = true;
  mcSetBowHook({ on: () => hookOn, step: (S, ev) => bowStep(st, ev), gap: BOW_FEEL.GAP_MS });
  setManualCombat(3);
  const S = { rpg: { activeSlot: 'ranged' }, swingTimer: 0, _serverCaps: {} };
  mcFrame(S, 1000, FULL, 600);
  check('6a with the hook on, a bow pulls BACK (the slingshot plumbing: the aim and the sight point where the arrow goes) and is drawn',
    mcBowSling(S) && mcBowDraws(S) && near(Math.abs(mcShotAngle(S, 0)), Math.PI) && near(mcShotAngle(S, Math.PI / 2), -Math.PI / 2));
  mcSwipeStart(S, 5000, 300, 600);
  const p1 = st.phase;
  mcSwipeMove(S, 5010, 300, 640);
  const p2 = st.phase;
  const r = mcSwipeEnd(S, 5300, 300, 640);
  check('6b the touch handlers\' own calls: down nocks, the pull draws, the lift looses -- AT ONCE ("fire"), not after the flicked bow\'s interval',
    p1 === 'nock' && p2 === 'drawing' && r === 'fire' && S._mc.fireAt === 5300 && st.loose.drawMs === 290, { p1, p2, r, loose: st.loose });
  S.swingTimer = 5300;
  mcSwipeStart(S, 5310, 300, 600);
  mcSwipeMove(S, 5320, 300, 640);
  const soon = mcSwipeEnd(S, 5400, 300, 640);
  mcSwipeStart(S, 6000, 300, 600);
  mcSwipeMove(S, 6010, 300, 640);
  mcSwipeMove(S, 6100, 300, 603);
  const down = mcSwipeEnd(S, 6200, 300, 603);
  mcSwipeStart(S, 7000, 300, 600);
  mcSwipeMove(S, 7010, 300, 640);
  mcAbort(S);
  check('6c a loose sooner than the gap is no shot ("early"); a string let down at the touch point is no shot ("cancel"); an aborted press lets it down',
    soon === 'early' && down === 'cancel' && st.phase === 'idle' && st.n.letdown >= 1, { soon, down, phase: st.phase });
  hookOn = false;
  S.swingTimer = 0;
  mcSwipeStart(S, 9000, 300, 600);
  const n0 = st.n.nock;
  mcSwipeMove(S, 9010, 300, 640);
  const flick = mcSwipeEnd(S, 9100, 300, 640);
  check('6d the hook OFF (`?bowfeel=0`, a worker without caps.bowDraw): today\'s flick bow -- the shot the way the thumb went, nothing nocked',
    !mcBowSling(S) && !mcBowDraws(S) && near(mcShotAngle(S, 0), 0) && flick === 'fire' && st.n.nock === n0);
  setManualCombat(2);
  check('6e `?manual=2` is still the slingshot bow with the hook off', mcBowSling(S) && !mcBowDraws(S));
  setManualCombat(1);
  hookOn = true;
  check('6f ...and `?manual=1` the plain flick (the hook only answers on the game\'s own combat: bowFeel.js asks manualFreeSwing)',
    /manualFreeSwing\(\) && S\._serverCaps && S\._serverCaps\.bowDraw/.test(read('../../src/game/bowFeel.js')));
  mcSetBowHook(null);
  setManualCombat(3);
  const S2 = { rpg: { activeSlot: 'ranged' }, swingTimer: 0, _serverCaps: {} };
  mcFrame(S2, 1000, FULL, 600);
  check('6g no hook at all: a bow asked to shoot early waits its interval, as before', mcAskShot(S2, 1000) === 'fire' && (S2.swingTimer = 1000, mcAskShot(S2, 1100)) === 'early');
}

// ── 7. the look ──
{
  const v = (phase, r, tireT) => ({ phase, r, tireT: tireT || 0, settleT: 0 });
  check('7a THE WALK slows as the bow is drawn and is planted settled -- never faster (the worker bounds a move from above)',
    bowWalkMult(null) === 1 && bowWalkMult(v('nock', 0)) === 1 && near(bowWalkMult(v('draw', 0.5)), 0.9) && bowWalkMult(v('full', 1)) === BOW_FEEL.SETTLED_WALK
    && bowWalkMult(v('tired', 1, 1)) === BOW_FEEL.SETTLED_WALK && [0, 0.3, 1].every((r) => bowWalkMult(v('draw', r)) <= 1));
  const l0 = bowLineLook(v('draw', 0)), l5 = bowLineLook(v('draw', 0.5)), lf = bowLineLook(v('full', 1)), lt = bowLineLook(v('tired', 1, 1));
  check('7b THE AIM LINE grows forward wide and loose, narrowing as the draw fills; settled one crisp gold line; tired it trembles and fades from gold; none at the nock',
    bowLineLook(v('nock', 0)) === null && l0.len < l5.len && l5.len < 1 && l0.spread > l5.spread && l5.spread > 0.03 && l0.thick > l5.thick && l0.alpha < l5.alpha && l0.gold === 0
    && lf.len === 1 && lf.spread === 0 && lf.gold === 1 && lf.tremble === 0 && lf.thick < l5.thick
    && lt.tremble > 1 && lt.gold < 1 && lt.alpha < lf.alpha);
  check('7c THE BEND: the string pulled back further as the draw fills; the pose raised at the nock and drawn from a third',
    bowStringPx(v('nock', 0)) === BOW_FEEL.NOCK_PX && bowStringPx(v('draw', 1)) === BOW_FEEL.STRING_PX && bowStringPx(v('draw', 0.5)) > bowStringPx(v('draw', 0.2))
    && bowPoseFrame(null) === -1 && bowPoseFrame(v('nock', 0)) === 0 && bowPoseFrame(v('draw', 0.2)) === 0 && bowPoseFrame(v('draw', 0.5)) === 1 && bowPoseFrame(v('full', 1)) === 1);
}

// ── 8. the sounds ──
{
  let made = 0, cut = 0;
  const node = (extra) => Object.assign({ connect() {}, disconnect() { cut++; } }, extra);
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {} });
  const sources = [];
  const ctx = {
    currentTime: 0, sampleRate: 8000,
    createOscillator() { made++; const o = node({ type: '', frequency: param(), start() {}, stop() {} }); sources.push(o); return o; },
    createGain() { made++; return node({ gain: param() }); },
    createBiquadFilter() { made++; return node({ type: '', frequency: param(), Q: { value: 0 } }); },
    createBufferSource() { made++; const s = node({ buffer: null, loop: false, start() {}, stop() {} }); sources.push(s); return s; },
    createBuffer(ch, n) { return { copyToChannel() {}, length: n }; },
  };
  const out = node({});
  const ok = [['nock', 1], ['click', 1], ['twang', 0.4], ['twang', 1], ['twang', 1.12], ['letdown', 1]].map(([k, x]) => bowSynth(ctx, out, k, x));
  const h = bowSynth(ctx, out, 'creak', 1);
  h.set(0.5); h.set(1, 0.5); h.stop(true);
  for (const s of sources) if (s.onended) s.onended();
  check('8a every kind plays (nock, click, twang light / full / perfect, letdown) and the creak gives a handle that rises and wavers', ok.every((x) => x === true) && h && typeof h.set === 'function' && bowSynth(ctx, out, 'nope', 1) === null);
  check('8b EVERY NODE IS LET GO when its sound ends (the v2.3.2126 lesson)', made > 0 && cut === made, { made, cut });
  const W = read('../../src/data/bowFeelSound.js');
  check('8c made, not recorded: nothing fetched or decoded, the noise written with copyToChannel, no imports', !/fetch\(|decodeAudioData|getChannelData\(/.test(W) && /copyToChannel/.test(W) && !/^import /m.test(W));
  const ST = read('../../src/data/soundStudio.js'), GD = read('../../src/data/gameDisplay.js');
  check('8d every kind is labelled in the Sound Studio, played by BT_AUDIO.bowSound behind the mute and the loading screen\'s gate',
    ['bowNock', 'bowDraw', 'bowClick', 'bowTwangLight', 'bowTwang', 'bowTwangPerfect', 'bowLetDown'].every((id) => new RegExp("\\['" + id + "', 'fight', ").test(ST))
    && /BT_AUDIO\.bowSound = function \(kind, k, opts\) \{\s*\n\s*if \(this\.muted \|\| !this\.ctx \|\| !this\._ctxLive\(\)\) return null;\s*\n\s*if \(this\.soundGateClosed\(\)\) return null;/.test(GD)
    && /BT_AUDIO\.bowDrawDemo = function/.test(GD));
}

// ── 9. the wiring and the switch ──
{
  const BF = read('../../src/game/bowFeel.js'), MC = read('../../src/game/monsterCombat.js'), PJ = read('../../src/game/projectiles.js');
  const BRO = read('../../src/ui/BroTown.jsx'), ER = read('../../src/rendering/systems/entityRenderer.js'), EF = read('../../src/rendering/systems/effectsRenderer.js');
  const FX = read('../../src/rendering/systems/weaponFeelFx.js'), CA = read('./caps-audit.test.mjs');
  check('9a the shot: a drawn bow looses at its gap, its relay carries `dr`, its arrow leaves on the loose (monsterCombat)',
    /var _bfGap = _mcDraws \? bowFeelGapMs\(S\) : null;\n\s*if \(_bfGap != null\) effectiveSwingCd = _bfGap;/.test(MC) && /\n\s*dr: bowFeelWire\(S, isStaff\),\n/.test(MC)
    && /S\._bowShotAng = arrAngle;\n\s*bowFeelLoosed\(S, arrAngle\);/.test(MC));
  check('9b EVERY claim of a drawn arrow names its shot: `sw` on monster_damage AND on player_attack (the PvP claim)',
    /: \(staffSw\(S, a\) \?\? bowFeelSw\(a\)\)/.test(PJ) && /\n\s*sw: staffSw\(S, a\) \?\? bowFeelSw\(a\),\n\s*kind: isStaffProj \? 'staff' : 'ranged',/.test(PJ) && (PJ.match(/^\s*sw: /gm) || []).length === 2 && /if \(!isStaffProj\) bowFeelContact\(S, a, m\);/.test(PJ));
  check('9c gated on the worker: bowFeelOn reads caps.bowDraw, and caps-audit no longer excuses it',
    /S\._serverCaps\.bowDraw/.test(BF) && !/\['bowDraw',/.test(CA));
  check('9d the loop\'s frame after the sword\'s, the walk, a computer\'s press; its release heard on the window',
    /swordFeelFrame\(S, Date\.now\(\)\);\n(?:\s*staffFeelFrame\([^\n]*\n)?\s*bowFeelFrame\(S, Date\.now\(\)\);/.test(BRO)   /* v2.3.4803: the staff's frame may sit between (both after the sword's) */ && /finalSpd \*= bowFeelWalkMult\(S\);/.test(BRO)
    && /if \(!bowFeelDeskDown\(S, Date\.now\(\)\)\) mcAskShot\(S, Date\.now\(\)\);/.test(BRO) && /addEventListener\('mouseup'/.test(BF) && /addEventListener\('blur'/.test(BF));
  check('9e the pose: the stand-in raised and drawn while nocked (entityRenderer), its frame held (effectsRenderer); the drawer in the kit\'s own layer',
    /S\._bowHoldFrame = null;\n\s*if \(!_bowDir && S\._bfPose/.test(ER) && /S\._bowHoldFrame != null && S\._bowHoldFrame >= 0\) \? Math\.min\(n - 1, S\._bowHoldFrame\)/.test(EF)
    && /registerFeelDrawer\(bowFeelDrawer\);/.test(FX));
  const st = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
  const s1 = st();
  const off = feelSwitch('bowfeel', 'bt_bowfeel', '?bowfeel=0', s1), kept = feelSwitch('bowfeel', 'bt_bowfeel', '', s1), back = feelSwitch('bowfeel', 'bt_bowfeel', '?bowfeel=1', s1), after = feelSwitch('bowfeel', 'bt_bowfeel', '', s1);
  check('9f THE SWITCH: on by default; `?bowfeel=0` off on one phone, remembered (bt_bowfeel); `?bowfeel=1` back',
    feelSwitch('bowfeel', 'bt_bowfeel', '', st()) && !off && !kept && back && after && /feelSwitch\('bowfeel', BOW_FEEL_KEY/.test(BF) && /BOW_FEEL_KEY = 'bt_bowfeel'/.test(BF));
  check('9g nothing here decides damage: the phone claims (`dr`), the worker counts (no damage number written in the bow\'s files)',
    !/dmg\s*[*]=|pDmg|_computeAttackDamage/.test(BF) && !/dmg/.test(read('../../src/game/bowDraw.js')));
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
