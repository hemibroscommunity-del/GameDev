/* ═══ v2.3.5525: THE LOADING DOOR -- THE WORLD'S VEILS' ONE WRITER (card L PR 5) ═══
 * (docs/specs/loading-door.md; src/game/veilDoor.js)
 *
 * The world's veils are one field, `S._veils` (a Map from the reason to its
 * hold), written only by veilTo, which also writes each reason's old field
 * (S._zoneLoading, S._wheelTripVeil, S._townArtHold, S._farmArtHold,
 * S._avatarArtHold, and since v2.3.5527 S._netHold) for its readers.  This suite:
 *
 *   1. the door's own rules: every reason, a hold and a lift, the old field
 *      written as before (the trip's lift is false, the others' null), the
 *      phase, a reason that is none, the switch;
 *   2. A SECOND WRITER FAILS: a write of S._veils or of a reason's old field
 *      anywhere in src/ outside veilTo (the phase table's guard reads
 *      S._veils off the tree too: DOOR_SUITES); every reason has its
 *      callers, in the files that held it before;
 *   3. a real hold: avatarHold.js holdForAvatar veils and lifts through the
 *      door (the others need the game: questline and mp-heldsweep play them).
 *
 * Break proof, tried by hand: `S._farmArtHold = seq;` back in farmTrip.js
 * -> FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { veilTo, veilPhase, VEIL_WHYS } from '../../src/game/veilDoor.js';
import { holdForAvatar } from '../../src/game/avatarHold.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

/* ── 1. the door's own rules ── */
{
  check('1. the reasons and their old fields', JSON.stringify(VEIL_WHYS) === JSON.stringify({ zone: '_zoneLoading', trip: '_wheelTripVeil', town: '_townArtHold', farm: '_farmArtHold', avatar: '_avatarArtHold', net: '_netHold' }));
  const S = {};
  check('1. nothing held: in', veilPhase(S) === 'in');
  const holds = { zone: { zone: 'dungeon_1' }, trip: true, town: { t: 1, done: false }, farm: 7, avatar: { t: 2 }, net: true };
  let ok = true;
  for (const [why, h] of Object.entries(holds)) {
    if (veilTo(S, why, h) !== true || S[VEIL_WHYS[why]] !== h || S._veils.get(why) !== h) ok = false;
  }
  check('1. each reason holds: its old field is its hold, and it is in S._veils', ok && S._veils.size === 6);
  check('1. ...veiled', veilPhase(S) === 'veiled');
  veilTo(S, 'zone', null); veilTo(S, 'trip', null); veilTo(S, 'town', null); veilTo(S, 'farm', null); veilTo(S, 'net', null);
  check('1. lifts: the old fields as before (the trip and the net false, the others null), still veiled by the one left',
    S._zoneLoading === null && S._wheelTripVeil === false && S._townArtHold === null && S._farmArtHold === null && S._netHold === false && veilPhase(S) === 'veiled' && S._veils.size === 1);
  veilTo(S, 'avatar', undefined);
  check('1. the last lift: in', veilPhase(S) === 'in' && S._avatarArtHold === null);
  veilTo(S, 'trip', false);
  check('1. a hold of false is a lift', S._wheelTripVeil === false && veilPhase(S) === 'in');
  check('1. a reason that is none, one off the prototype, or no S is refused',
    veilTo(S, 'dungeon', true) === false && veilTo(S, 'constructor', true) === false && veilTo(S, '__proto__', true) === false && veilTo(null, 'zone', {}) === false && S._dungeon === undefined && veilPhase(S) === 'in');
  setSearch('?veildoor=0');
  const T = {};
  check('1. ?veildoor=0: the old field alone, as before', veilTo(T, 'farm', 3) === true && T._farmArtHold === 3 && T._veils === undefined);
  setSearch('');
}

/* ── 2. no second writer ── */
{
  const ROOT = new URL('../../', import.meta.url);
  const files = [];
  (function walk(rel) {
    for (const n of readdirSync(new URL(rel, ROOT))) {
      const r = rel + n;
      if (statSync(new URL(r, ROOT)).isDirectory()) walk(r + '/');
      else if (/\.(js|jsx|mjs)$/.test(n)) files.push(r);
    }
  })('src/');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const NAMES = '_veils|_zoneLoading|_wheelTripVeil|_townArtHold|_farmArtHold|_avatarArtHold|_netHold';
  const WRITE = new RegExp(`(?:\\.(?:${NAMES})\\b|\\[\\s*['"](?:${NAMES})['"]\\s*\\])\\s*(?:[-+*/]?=(?!=)|\\+\\+|--)|delete\\s+[\\w$.]+\\.(?:${NAMES})\\b|Object\\.assign\\(\\s*[\\w$.]+\\s*,[^)]*\\{[^}]*\\b(?:${NAMES})\\s*:`);
  const read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!new RegExp(NAMES).test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/veilDoor.js') {
        if (/^export function veilTo\(S, why, hold\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. veilTo makes S._veils (one write) and writes the old field by its reason', doorWrites === 1 && /S\[VEIL_WHYS\[why\]\] = /.test(read('src/game/veilDoor.js')), doorWrites);
  check('2. no write of S._veils or a veil\'s old field in src/ outside veilTo', outside.length === 0, outside);
  const calls = (f) => [...strip(read(f)).matchAll(/veilTo\(S, '([a-z]+)', ([^)]*)\)/g)].map((m) => m[1] + (/^(null|false)$/.test(m[2].trim()) ? '-' : '+'));
  const zt = calls('src/game/zoneTransitions.js'), ft = calls('src/game/farmTrip.js'), ah = calls('src/game/avatarHold.js');
  const has = (list, k) => list.includes(k);
  check('2. zoneTransitions.js holds and lifts the zone, the trip and the town',
    ['zone+', 'zone-', 'trip+', 'trip-', 'town+', 'town-'].every((k) => has(zt, k)), zt);
  check('2. farmTrip.js holds and lifts the farm, avatarHold.js the avatar',
    has(ft, 'farm+') && has(ft, 'farm-') && has(ah, 'avatar+') && has(ah, 'avatar-'), { ft, ah });
  /* v2.3.5527: the net's callers, found by what they call (no big file named by its path) */
  const callers = files.filter((f) => !/veilDoor\.js$/.test(f) && /\bveilTo\(/.test(strip(read(f))));
  const net = callers.flatMap((f) => [...strip(read(f)).matchAll(/veilTo\(S, 'net', ([^)]*?)\);/g)].map((m) => ({ f, lift: /^null$/.test(m[1].trim()) || /\? null : true$/.test(m[1].trim()) })));
  const netFiles = [...new Set(net.map((n) => n.f))];
  check('2. the net is held and lifted in two networking files (state_sync and the close; the readiness veil)',
    netFiles.length === 2 && netFiles.every((f) => f.startsWith('src/networking/')) && net.some((n) => n.lift) && net.length >= 3, net);
  check('2. no other file calls veilTo (five: the zone door, the farm, your bro, and the two of the net)', callers.length === 5, callers);
}

/* ── 3. a real hold ── */
{
  const S = {};
  let done;
  const wait = new Promise((r) => { done = r; });
  const h = holdForAvatar(S, wait, 'BroTown');
  check('3. your bro\'s hold veils through the door', S._avatarArtHold === h && S._veils.get('avatar') === h && veilPhase(S) === 'veiled');
  done();
  await new Promise((r) => setTimeout(r, 20));
  check('3. ...and its lift goes through it too', S._avatarArtHold === null && veilPhase(S) === 'in' && h.why === 'ready', { why: h.why, phase: veilPhase(S) });
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
