/* ═══ v2.3.5090: A VALUE ROAD FAILS CLOSED WHILE SAVES ARE REFUSED (valuepause.js; card E PR 9) ═══
 *
 *   1. THE PAUSE, from card A's one count (roomrow.js `_savesRefused`): a put
 *      the storage refuses starts it; it lasts PAUSE.MS (one minute), then
 *      lifts by itself; a newer worker's character refused at a join does not
 *      start it; `valuepause: false` turns it off; a room with no count never
 *      pauses.  Through the real storage wrapper: a put that throws.
 *   2. THE ONE TABLE: every `move` or `escrow` road of the two doors is in
 *      VALUE_PAUSE (an action that starts with its TAKE) or in PAUSE_EXEMPT
 *      (a payout, a kill, a shop, a shut road) -- never both, never neither;
 *      every road VALUE_PAUSE names is a TAKE; every exempt payout a GIVE.
 *   3. EACH ROW'S HANDLER asks the pause (its file has the function, and the
 *      function calls `valuePaused`).
 *   4. THE THREAT LEVY stays shut (OPEN_PVP false): the day it opens, its row
 *      moves from PAUSE_EXEMPT into VALUE_PAUSE.
 *
 * BREAK PROOF (rule 8), tried by hand: `bank_deposit` taken off VALUE_PAUSE
 * -> FAIL 2 (a road on neither list).
 */
import { readFileSync } from 'node:fs';
import { PAUSE, VALUE_PAUSE, PAUSE_EXEMPT, valuePaused, pauseOff } from '../src/valuepause.js';
import { GOLD_ROADS } from '../src/gold.js';
import { BAG_ROADS } from '../src/bag.js';
import { makeStorage, openRoom, seededClock, settle } from './testroom.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}

const clock = seededClock({ start: Date.UTC(2026, 10, 14, 12, 0, 0), seed: 9 }).install();

/* ══════════ 1. THE PAUSE ══════════ */
{
  /* a storage that refuses its puts when told (as a full disk or a rolled-back
     worker's would), under card A's wrapper, which the room's start puts on it */
  const st = makeStorage();
  const inner = st.storage.put;
  let refuse = false;
  st.storage.put = function (...a) { return refuse ? Promise.reject(new Error('refused')) : inner.apply(this, a); };
  const room = await openRoom(st);
  if (!st.storage.__btRowsCounted) room._roomRowStart(clock.now());
  check('1. a room whose saves all landed is not paused', valuePaused(room) === false && st.storage.__btRowsCounted === true);
  refuse = true;
  await room.state.storage.put('rpg:bp_vp', { coins: 1 }).catch(() => {});
  await settle();
  refuse = false;
  check('1. a put the storage refused is card A\'s count (one, never counted again here)', room._savesRefused().put === 1, room._savesRefused());
  check('1. ...and the room pauses at once', valuePaused(room) === true);
  clock.advance(PAUSE.MS - 1000);
  check('1. ...for a minute', valuePaused(room) === true);
  clock.advance(2000);
  check('1. ...then lifts by itself', valuePaused(room) === false);
  /* a second refusal starts it again; the kill switch turns it off */
  room._roomRowRefused('put', clock.now());
  check('1. a second refused put pauses again', valuePaused(room) === true);
  room._liveFlags = { valuepause: false };
  check('1. `valuepause: false`: nothing pauses', pauseOff(room) === true && valuePaused(room) === false);
  room._liveFlags = {};
  clock.advance(PAUSE.MS + 1);
  /* a newer worker's character refused at a join is that player's, not the storage's */
  room._roomRowRefused('newer', clock.now());
  check('1. a character a newer worker saved does not pause the room', valuePaused(room) === false, room._savesRefused());
  check('1. ...a room with no count never pauses, and a broken read never throws', valuePaused({}) === false && valuePaused(null) === false
    && valuePaused({ _savesRefused() { throw new Error('x'); } }) === false);
  check('1. the owner\'s words', PAUSE.WORDS === 'Saving is paused for a moment, try again.' && PAUSE.MS === 60000);
}

/* ══════════ 2. THE ONE TABLE ══════════ */
{
  const roads = [...Object.entries(GOLD_ROADS), ...Object.entries(BAG_ROADS)].filter(([, r]) => r.class === 'move' || r.class === 'escrow');
  const names = new Set(roads.map(([k]) => k));
  const paused = new Set(Object.values(VALUE_PAUSE).flatMap((r) => r.roads));
  const exempt = new Set(Object.keys(PAUSE_EXEMPT));
  const neither = [...names].filter((k) => !paused.has(k) && !exempt.has(k));
  const both = [...names].filter((k) => paused.has(k) && exempt.has(k));
  const stray = [...paused, ...exempt].filter((k) => !names.has(k));
  /* 28 rows (16 gold, 12 bag), 24 names: four roads carry both gold and goods */
  check(`2. every move or escrow road (${roads.length} rows, ${names.size} names) pauses or is exempt, never both`, roads.length === 28 && names.size === 24 && neither.length === 0 && both.length === 0, { neither, both });
  check('2. ...and both lists name only move or escrow roads', stray.length === 0, stray);
  const rowsOf = (k) => roads.filter(([n]) => n === k).map(([, r]) => r);   /* its move or escrow rows only */
  const takes = [...paused].filter((k) => rowsOf(k).some((r) => r.dir !== 'take'));
  check('2. every road an action pauses on is a TAKE (into another player or a held place)', takes.length === 0, takes);
  const payouts = Object.entries(PAUSE_EXEMPT).filter(([, why]) => why.startsWith('a payout')).map(([k]) => k);
  const notGives = payouts.filter((k) => rowsOf(k).some((r) => r.dir !== 'give'));
  check('2. ...and every exempt payout a GIVE (the owner: every payout keeps paying)', payouts.length >= 6 && notGives.length === 0, notGives);
}

/* ══════════ 3. EACH ROW'S HANDLER ASKS THE PAUSE ══════════ */
{
  const bad = [];
  for (const [t, row] of Object.entries(VALUE_PAUSE)) {
    const [file, fn] = row.at.split(' ');
    let f = '';
    try { f = readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'); } catch (e) { bad.push(t + ': no ' + file); continue; }
    const i = f.search(new RegExp('\\n  (async )?' + fn + '\\('));
    if (i < 0) { bad.push(t + ': no ' + fn); continue; }
    const j = f.indexOf('\n  },', i);
    if (!/valuePaused\(/.test(f.slice(i, j > i ? j : undefined))) bad.push(t + ': ' + fn + ' never asks valuePaused');
  }
  check('3. every row\'s handler exists and asks the pause', bad.length === 0, bad);
}

/* ══════════ 4. THE THREAT LEVY STAYS SHUT ══════════ */
{
  const src = readFileSync(new URL('../src/threat.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  const m = src.match(/OPEN_PVP\s*=\s*(true|false)/);
  check('4. OPEN_PVP is false, so the threat levy is shut (open it, and its row moves into VALUE_PAUSE)', !!m && m[1] === 'false', m && m[0]);
}

clock.restore();
console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all valuepause checks passed');
