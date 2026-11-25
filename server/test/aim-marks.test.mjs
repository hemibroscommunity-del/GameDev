/* ═══ v2.3.6555: WHAT THE AIM SHOWS (card CT part 22; src/game/aimMarks.js) ═══
 *
 * The two buttons (`?manual=5`).  The owner, 2026-11-25: "a tiny directional
 * Carat out in front of the character", and a frame "yellow if that monster
 * is in queue for lock on targeting ... after you hit the monster it turns
 * red and locks on".  Played on the module itself:
 *
 *   1. THE GATE: the frame and the caret only in the two buttons on a touch
 *      screen (twoButtonsLive); `?targetframe=0` takes the frame away,
 *      `?aimcaret=0` the caret, each alone;
 *   2. YELLOW is the press's own pick: the monster the frame wears is the one
 *      Attack's press then locks (latchAttackPress), the sight's hold
 *      (S._sightId) included; nothing in sight, a dying one, one behind the
 *      bro: no frame;
 *   3. RED is the latch's monster, from the press that locks it (active or
 *      auto); while a latch holds there is no yellow, another monster in
 *      sight or not; the locked one dead or gone: no frame at all;
 *   4. THE CARET points along the drawn facing (the eight ways the sight
 *      reads), at the lock while one holds, and is hidden dead, dying,
 *      riding, in a beat (harvest, fishing, cooking) or a talk;
 *   5. THE BOX: the drawn box x 1.25, never under 48 CSS px a side, at any
 *      zoom; the look's numbers are the card's;
 *   6. ONE object a frame, cleared at each call.
 *
 * Mutants (v2.3.6555): 72 one-line changes of aimMarks.js's code lines (a
 * comparison flipped, && and || swapped, a ! dropped, max for min, a sign or
 * an operator turned, a number +1, a tone swapped) run against this suite:
 * 68 killed.  The four that live change nothing anyone can see: the loop's
 * bound one past the end (it reads undefined, which the `m &&` skips), and
 * the starting values of the two reused objects (_OUT.color, _BOX.hw,
 * _BOX.hh), which every call writes before it returns them.
 */
import { AIM, AIM_TONES, aimGate, aimMarks, aimFrameBox, caretShown } from '../../src/game/aimMarks.js';
import { latchAttackPress, latchPhase, latchTo, sightNow } from '../../src/game/latch.js';
import { FACE_ANGLE, drawnFace } from '../../src/game/sight.js';
import { setManualCombat } from '../../src/game/manualCombat.js';
setManualCombat(5);   /* mode 5 on a touch screen (no window: no mouse) */

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const ON = Object.freeze({ live: true, frame: true, caret: true });
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9;
const mon = (id, x, y, more) => Object.assign({ id, x, y, alive: true }, more || {});
const page = (mons, more) => Object.assign({ player: { x: 0, y: 0 }, _renderFacing: 'east', monsters: mons, currentZone: 'wheel', rpg: { hp: 50 } }, more || {});
const snap = (o) => ({ id: o.frame ? o.frame.id : null, tone: o.tone, color: o.color, caret: o.caret });

/* 1. THE GATE */
{
  const g = aimGate('', true);
  check('1a. no switch: the frame and the caret on', g.live === true && g.frame === true && g.caret === true, g);
  const f = aimGate('?targetframe=0', true);
  check('1b. ?targetframe=0: the frame off, the caret on', f.frame === false && f.caret === true, f);
  const c = aimGate('?aimcaret=0', true);
  check('1c. ?aimcaret=0: the caret off, the frame on', c.caret === false && c.frame === true, c);
  check('1d. the gate given shut stays shut', aimGate('', false).live === false);
  check('1e. the gate read: mode 5 on a touch screen', aimGate('').live === true);
  setManualCombat(4);
  check('1f. the gate read: mode 4 shut', aimGate('').live === false);
  setManualCombat(5);
  check('1g. aimGate() reads the page (no address: both on)', aimGate().frame === true && aimGate().caret === true && aimGate().live === true);
  check('1g2. one object, reused', aimGate('', true) === aimGate('?aimcaret=0', false));
  const S = page([mon('a', 300, 0)]);
  const shut = snap(aimMarks(S, { live: false, frame: true, caret: true }));
  check('1h. shut: no frame, no caret', shut.id === null && shut.tone === null && shut.color === 0 && shut.caret === null, shut);
  const nf = snap(aimMarks(S, aimGate('?targetframe=0', true)));
  check('1i. ?targetframe=0: no frame, the caret still east', nf.id === null && nf.tone === null && nf.color === 0 && near(nf.caret, 0), nf);
  const nc = snap(aimMarks(S, aimGate('?aimcaret=0', true)));
  check('1j. ?aimcaret=0: the yellow frame, no caret', nc.id === 'a' && nc.tone === 'pick' && nc.caret === null, nc);
  const dflt = snap(aimMarks(S));
  check('1k. no gate given: read afresh (mode 5, no switch): yellow and the caret', dflt.id === 'a' && dflt.tone === 'pick' && near(dflt.caret, 0), dflt);
}

/* 2. YELLOW: the press's own pick */
{
  const a = mon('a', 300, 0), b = mon('b', 200, 300);
  const S = page([b, a]);
  const o = aimMarks(S, ON);
  check('2a. the monster in sight wears the yellow frame', o.frame === a && o.tone === 'pick' && o.color === AIM.YELLOW && o.color === 0xF2C94C, snap(o));
  const pk = sightNow(S);
  check('2b. ...the same monster the press\'s sight picks', pk && pk.id === 'a');
  check('2c. ...and the press then locks it', latchAttackPress(S) === 'lock' && S._latchId === 'a');
  const N = page([mon('w', -300, 0)]);
  const n = snap(aimMarks(N, ON));
  check('2d. the only monster behind the bro: no frame', n.id === null && n.tone === null && n.color === 0, n);
  const E = page([]);
  check('2e. no monsters: no frame', aimMarks(E, ON).frame === null);
  const D = page([mon('d', 300, 0, { curHp: 0 })]);
  check('2f. a dying monster in sight: no frame', aimMarks(D, ON).frame === null);
  /* the sight's hold: a monster already sighted keeps it to 55 degrees,
     a fresh one only within the cone -- the frame follows the press's rule */
  const off = mon('h', 300 * Math.cos(50 * Math.PI / 180), 300 * Math.sin(50 * Math.PI / 180));   /* 50 degrees: past the 45 cone, inside the 55 hold */
  const H = page([off]);
  const fresh = aimMarks(H, ON).frame;
  const fpk = sightNow(H);
  H._sightId = 'h';
  const kept = aimMarks(H, ON).frame;
  const kpk = sightNow(H);
  check('2g. the frame follows the sight\'s hold exactly as the press does', (fresh === null) === (fpk === null) && (kept && kept.id) === (kpk && kpk.id) && kept !== fresh, { fresh: fresh && fresh.id, kept: kept && kept.id });
  const R = page([mon(7, 300, 0)]);
  const r = aimMarks(R, ON);
  check('2h. a number id: framed (ids compared as strings)', r.frame && r.frame.id === 7 && r.tone === 'pick');
  const Z = page([mon('a', 300, 0)], { _zoneLoading: true });
  const z = snap(aimMarks(Z, ON));
  check('2i. a zone loading: nothing', z.id === null && z.caret === null, z);
  check('2j. no player: nothing', snap(aimMarks({ monsters: [mon('a', 300, 0)] }, ON)).caret === null && aimMarks({ monsters: [] }, ON).frame === null);
  check('2k. no state: nothing, no throw', aimMarks(null, ON).frame === null && aimMarks(undefined, ON).caret === null && aimMarks('x', ON).frame === null);
}

/* 3. RED: the latch's monster */
{
  const a = mon('a', 300, 40), b = mon('b', 250, 0);
  const S = page([a]);
  latchAttackPress(S);
  S.monsters.push(b);
  const o = aimMarks(S, ON);
  check('3a. after the press: the locked monster wears the red frame', o.frame === a && o.tone === 'lock' && o.color === AIM.RED && o.color === 0xFF3C3C, snap(o));
  check('3b. ...and no yellow on the other in sight (nearer, in the cone)', sightNow(S) && sightNow(S).id === 'b' && o.frame !== b);
  const T = page([mon('a', 300, 0)]);
  latchTo(T, 'auto', 'a');
  check('3c. auto (the held attack) is red too', aimMarks(T, ON).tone === 'lock' && latchPhase(T) === 'auto');
  const A = page([mon('x', 0, 300), mon('a', 300, 0)]);
  latchTo(A, 'active', 'x');
  check('3d. the lock off the facing (south while facing east): still red on it', aimMarks(A, ON).frame && aimMarks(A, ON).frame.id === 'x');
  const K = page([mon('a', 300, 0, { curHp: 0 }), mon('b', 280, 0)]);
  latchTo(K, 'active', 'a');
  const k = snap(aimMarks(K, ON));
  check('3e. the locked one dying, another in sight: no frame (no yellow while the latch holds)', k.id === null && k.tone === null && k.color === 0, k);
  const G = page([mon('b', 280, 0)]);
  latchTo(G, 'active', 'gone');
  check('3f. the locked one gone from the list: no frame', aimMarks(G, ON).frame === null);
  const U = page([mon('a', 300, 0, { alive: false })]);
  latchTo(U, 'active', 'a');
  check('3g. the locked one not alive: no frame', aimMarks(U, ON).frame === null);
  const I = page([mon('a', NaN, 0)]);
  latchTo(I, 'active', 'a');
  check('3h. the locked one at no place: no frame', aimMarks(I, ON).frame === null);
  const P = page([mon('a', 300, 0)]);
  latchTo(P, 'active', 'a');
  latchTo(P, 'idle', null, 'press');
  check('3i. let go: yellow again', aimMarks(P, ON).tone === 'pick');
  const Q = page([mon('a', 300, 0, { curHp: null })]);
  latchTo(Q, 'active', 'a');
  check('3k. the locked one with no hp number yet: still red', aimMarks(Q, ON).tone === 'lock');
  const Q1 = page([mon('a', 300, 0, { curHp: 1 })]);
  latchTo(Q1, 'active', 'a');
  check('3l. the locked one at 1 hp: still red', aimMarks(Q1, ON).tone === 'lock');
  const NP = page([mon('a', 300, 0)]);
  latchTo(NP, 'active', 'a');
  delete NP.player;
  const np = snap(aimMarks(NP, ON));
  check('3m. a lock with no player: nothing', np.id === null && np.tone === null && np.caret === null, np);
  check('3j. the tones table', AIM_TONES.pick === 0xF2C94C && AIM_TONES.lock === 0xFF3C3C && Object.isFrozen(AIM_TONES));
}

/* 4. THE CARET */
{
  for (const f of Object.keys(FACE_ANGLE)) {
    const S = page([], { _renderFacing: f });
    const c = aimMarks(S, ON).caret;
    check('4a. facing ' + f + ': the caret along it', near(c, FACE_ANGLE[f]) && near(c, drawnFace(S)), c);
  }
  check('4b. the eight ways, eight angles', new Set(Object.values(FACE_ANGLE)).size === 8);
  const L = page([mon('a', 150, 200)], { _renderFacing: 'north', player: { x: 50, y: 100 } });
  latchTo(L, 'active', 'a');
  check('4c. a lock: the caret at the locked monster, not the facing', near(aimMarks(L, ON).caret, Math.PI / 4));
  const L2 = page([mon('a', -100, 0)], { _renderFacing: 'east', player: { x: 0, y: 0 } });
  latchTo(L2, 'auto', 'a');
  check('4d. a lock to the west while drawn east: west', near(Math.abs(aimMarks(L2, ON).caret), Math.PI));
  const O = page([mon('a', 0, 0)], { _renderFacing: 'south' });
  latchTo(O, 'active', 'a');
  check('4e. a lock on the bro\'s own spot: the facing', near(aimMarks(O, ON).caret, Math.PI / 2));
  const O2 = page([mon('a', 0, 50)], { _renderFacing: 'north' });
  latchTo(O2, 'active', 'a');
  check('4e2. a lock straight below (same x): south', near(aimMarks(O2, ON).caret, Math.PI / 2));
  const O3 = page([mon('a', 50, 0)], { _renderFacing: 'north' });
  latchTo(O3, 'active', 'a');
  check('4e3. a lock straight east (same y): east', near(aimMarks(O3, ON).caret, 0));
  const X = page([mon('a', 0, 300, { curHp: 0 })], { _renderFacing: 'west' });
  latchTo(X, 'active', 'a');
  check('4f. the locked one dying: the facing', near(aimMarks(X, ON).caret, Math.PI));
  const W = page([], { _renderFacing: undefined, _facingAngle: 1.234 });
  check('4g. no drawn facing yet: the body\'s turn', near(aimMarks(W, ON).caret, 1.234));
  const hidden = [
    ['dead (hp 0)', { rpg: { hp: 0 } }],
    ['dying', { _dying: true }],
    ['riding', { _ride: { on: true } }],
    ['a harvest, fishing or cooking beat', { _extraction: { skill: 'fishing', status: 'waiting' } }],
    ['talking (a panel over the world)', { _uiBusy: true }],
  ];
  for (const [why, more] of hidden) {
    const S = page([], more);
    check('4h. hidden: ' + why, aimMarks(S, ON).caret === null && caretShown(S) === false);
  }
  const shown = [
    ['no rpg yet', { rpg: undefined }],
    ['hp not a number', { rpg: { hp: 'x' } }],
    ['the board off', { _ride: { on: false } }],
    ['at 1 hp', { rpg: { hp: 1 } }],
  ];
  for (const [why, more] of shown) {
    const S = page([], more);
    check('4i. shown: ' + why, typeof aimMarks(S, ON).caret === 'number' && caretShown(S) === true);
  }
  check('4j. no state, no player: not shown', caretShown(null) === false && caretShown({}) === false);
  const C = page([mon('a', 300, 0)]);
  const co = aimMarks(C, { live: true, frame: true, caret: false });
  check('4k. the caret off: the frame alone', co.caret === null && co.tone === 'pick');
}

/* 5. THE BOX and the look */
{
  const b = aimFrameBox({ hw: 40, hh: 60 }, 1);
  check('5a. the drawn box x 1.25', near(b.hw, 50) && near(b.hh, 75), b);
  const s = aimFrameBox({ hw: 10, hh: 30 }, 1);
  check('5b. never under 48 CSS px a side (each side alone)', near(s.hw, 24) && near(s.hh, 37.5), s);
  const z = aimFrameBox({ hw: 10, hh: 10 }, 2.5);
  check('5c. ...at any zoom (2.5 world px a CSS px: 60 world px)', near(z.hw, 60) && near(z.hh, 60), z);
  const e = aimFrameBox({ hw: 19.2, hh: 19.2 }, 1);
  check('5d. exactly 48 at the edge', near(e.hw, 24) && near(e.hh, 24), e);
  check('5e. one object, reused', aimFrameBox({ hw: 1, hh: 1 }, 1) === aimFrameBox({ hw: 2, hh: 2 }, 1));
  check('5f. the card\'s numbers', AIM.YELLOW === 0xF2C94C && AIM.RED === 0xFF3C3C && AIM.BRASS === 0xD8A85F && AIM.KEYLINE === 0x14181A
    && AIM.BOX === 1.25 && AIM.MIN_SIDE === 48 && AIM.LINE === 2 && AIM.FRAME_ALPHA === 0.6
    && AIM.CARET_OUT === 26 && AIM.CARET_W === 8 && AIM.CARET_ALPHA === 0.75 && Object.isFrozen(AIM));
}

/* 6. ONE object a frame, cleared at each call */
{
  const S = page([mon('a', 300, 0)]);
  const first = aimMarks(S, ON);
  check('6a. framed and turned', first.tone === 'pick' && typeof first.caret === 'number');
  const second = aimMarks(page([], { rpg: { hp: 0 } }), ON);
  check('6b. the same object, every field cleared', second === first && second.frame === null && second.tone === null && second.color === 0 && second.caret === null, snap(second));
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
