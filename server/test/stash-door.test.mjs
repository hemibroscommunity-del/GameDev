/* ═══ v2.3.5281: THE STASHES' DOOR (grand plan step 4.3, card R PR 2) ═══
 * (the door: server/src/stash.js; the spec: docs/specs/stash-door.md)
 *
 * A player's stashes -- the weapon bag and the five gear lists -- were written
 * by hand in about forty places across sixteen files.  Every change goes
 * through stashGive / stashTake / stashSet now, each call naming its ROAD, its
 * row in STASH_ROADS.  This suite holds it, as gold-door.test holds the purse:
 *
 *   1. THE DOOR: a give appends and is REFUSED at the stash's cap (handoff
 *      rule 3, moved here: false, nothing added); a take returns the piece or
 *      null; a set makes the list, or one place; the list is made when
 *      missing; a wrong road, verb or stash throws, the list untouched;
 *   2. ONE DOOR: no stash is written anywhere in server/src but stash.js --
 *      by its name (`.weaponStash.push`, `= []`, `[i] =`, `.length =`), by a
 *      field held in a name inside a function that touches a stash
 *      (`ps[field].push`), or through a name that holds one
 *      (`const bag = ps.shieldStash; bag.push`); what is not a stash is
 *      listed with why;
 *   3. ONE ROW, ONE PLACE: every call names a road the table has, with its
 *      verb, from its row's file -- the door's own calls and the three
 *      helpers that hand it their caller's road (gearstash.js
 *      _gearStashLiveAdd / _gearStashLiveTake, shieldwear.js bagIt); every
 *      road has exactly one caller;
 *   4. THE CLASSES: every road is a mint, a burn, a move or an escrow (gold.js
 *      classFaults); a move is within the same player (`other: 'self'`); an
 *      escrow names a place that holds (ESCROW_PLACES); the door's gear lists
 *      are gearstash.js's;
 *   5. THE CAP IS THE DOOR'S: `_saveRpg` keeps every weapon of a bag over its
 *      cap (never cut at the save), and a weapon by the mail to a full bag is
 *      refused at the door (the mail keeps it), the bag untouched.
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-14:
 *   - `ps.weaponStash.push(w);` put back in inbox.js           -> FAIL 2 (a second writer)
 *   - `if (list.length >= stashCap(field, room)) return false;` deleted -> FAIL 1, FAIL 5
 *   - a second `stashTake(ps, 'weaponStash', 0, 'salvage_weapon')` in store.js -> FAIL 3 (two callers; and the wrong file)
 *
 * A new way to change a stash: a row in STASH_ROADS and one call that names it.
 */
import { readFileSync } from 'node:fs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { STASH_ROADS, STASH_FIELDS, STASH_SELF, stashGive, stashTake, stashSet, stashCap } from '../src/stash.js';
import { GEAR_STASH_FIELDS, gearStashCap } from '../src/gearstash.js';
import { classFaults, CLASSES, ESCROW_PLACES } from '../src/gold.js';
import { makeStorage, openRoom, settle, playTour, roomGuard } from './testroom.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 900) : ''); }
}
const throws = (fn) => { try { fn(); return false; } catch (e) { return true; } };
const ROOM = { WEAPON_STASH_CAP: 3 };

/* ══════════ 1. THE DOOR ══════════ */
{
  const ps = {};
  check('1. a give makes the list when missing, and appends', stashGive(ps, 'weaponStash', { n: 1 }, 'loot_weapon', ROOM) === true && Array.isArray(ps.weaponStash) && ps.weaponStash.length === 1);
  stashGive(ps, 'weaponStash', { n: 2 }, 'reveal_dev', ROOM);
  stashGive(ps, 'weaponStash', { n: 3 }, 'quest_reward', ROOM);
  const full = stashGive(ps, 'weaponStash', { n: 4 }, 'mail_weapon', ROOM);
  check('1. a give at the cap is REFUSED: false, nothing added (rule 3, never cut at the save)', full === false && ps.weaponStash.length === 3 && ps.weaponStash.every((w, i) => w.n === i + 1), ps.weaponStash);
  check('1. ...the weapon bag\'s cap is the room\'s; without a room it throws', stashCap('weaponStash', ROOM) === 3 && throws(() => stashCap('weaponStash', {})) && throws(() => stashGive({}, 'weaponStash', {}, 'loot_weapon')));
  check('1. ...a gear list\'s is gearstash.js\'s', stashCap('armorStash') === gearStashCap());
  const t = stashTake(ps, 'weaponStash', 1, 'salvage_weapon');
  check('1. a take returns the piece at its place, the rest closing up', t && t.n === 2 && ps.weaponStash.map((w) => w.n).join() === '1,3');
  check('1. ...nothing there: null, nothing taken', stashTake(ps, 'weaponStash', 9, 'weapon_sell') === null && stashTake(ps, 'weaponStash', -1, 'weapon_sell') === null && stashTake(ps, 'weaponStash', 0.5, 'weapon_sell') === null && ps.weaponStash.length === 2);
  check('1. a set at a place makes that place; a place that is not one: false', stashSet(ps, 'weaponStash', { n: 9 }, 'equip_swap', 0) === true && ps.weaponStash[0].n === 9 && stashSet(ps, 'weaponStash', { n: 8 }, 'equip_swap', 5) === false && ps.weaponStash.length === 2);
  check('1. a set makes the whole list; anything not a list, an empty one', stashSet(ps, 'weaponStash', [{ n: 7 }], 'join_stored') === true && ps.weaponStash.length === 1 && stashSet(ps, 'weaponStash', 'junk', 'nml_weapons') === true && Array.isArray(ps.weaponStash) && ps.weaponStash.length === 0);
  const before = JSON.stringify(ps);
  const wrong = [
    () => stashGive(ps, 'weaponStash', {}, 'no_such_road', ROOM),
    () => stashGive(ps, 'weaponStash', {}, 'salvage_weapon', ROOM),     /* a take road, given */
    () => stashTake(ps, 'weaponStash', 0, 'loot_weapon'),               /* a give road, taken */
    () => stashGive(ps, 'armorStash', {}, 'loot_weapon', ROOM),          /* a weapon road on a gear list */
    () => stashGive(ps, 'weaponStash', {}, 'gear_loot', ROOM),           /* a gear road on the weapon bag */
    () => stashGive(ps, 'weaponStash', {}, 'constructor', ROOM),         /* an Object.prototype name */
    () => stashSet(ps, 'weaponStash', [], 'toString'),
  ];
  check('1. a wrong road, verb or stash throws, the list untouched', wrong.every(throws) && JSON.stringify(ps) === before);
}

/* ══════════ 2. ONE DOOR ══════════ */
/* Comments out, line numbers kept (gold-door.test's strip). */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const files = srcFiles();
const code = Object.create(null);
for (const f of files) code[f] = strip(readFileSync(new URL(f, SRC_DIR), 'utf8'));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;
const NAMES = STASH_FIELDS.join('|');
/* a write: an assign (not a compare), or a list's own changers */
const W = '(?:=(?![=>])|\\.(?:push|splice|pop|shift|unshift|sort|reverse|fill|copyWithin)\\s*\\(|\\.length\\s*=(?!=)|\\[[^\\]\\n]*\\]\\s*=(?![=>]))';
/* the functions (methods and plain ones) a file is cut into, for rule B */
function chunks(s) {
  const heads = [...s.matchAll(/^(?: {2}(?:async\s+)?[A-Za-z_$][\w$]*\s*\([^)\n]*\)\s*\{|(?:export\s+)?(?:async\s+)?function\s+[\w$]+\s*\([^)\n]*\)\s*\{)\s*$/gm)].map((m) => m.index);
  const out = [];
  for (let i = 0; i < heads.length; i++) out.push([heads[i], i + 1 < heads.length ? heads[i + 1] : s.length]);
  return out;
}
/* the names a function binds to a stash field */
function stashVars(body) {
  const v = new Set();
  for (const m of body.matchAll(/for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s+of\s+(?:GEAR_STASH_FIELDS|STASH_FIELDS)\b/g)) v.add(m[1]);
  for (const m of body.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*(?:GEAR_PROV_FIELD|liveField\(|STASH_FIELDS|Stash['"])/g)) v.add(m[1]);
  const head = /^[^\n]*\(([^)\n]*)\)/.exec(body);
  if (head) for (const p of head[1].split(',').map((x) => x.trim())) if (/^(?:field|fld|f)$/.test(p)) v.add(p);
  return v;
}
const TOUCHES = new RegExp('\\b(?:' + NAMES + ')\\b|GEAR_STASH_FIELDS|STASH_FIELDS|GEAR_PROV_FIELD|liveField\\(|isGearField\\(');
/* What looks like a stash write and is not one, and why.  Matched by file and
   the text of its line; a stale entry fails. */
const NOT_A_STASH = [];   /* none today: a worn slot (`ps[f] = null` over WORN_WEAPONS) is not bound to a stash field */
const rawCount = (f, re) => [...code[f].matchAll(re)].length;
{
  const found = [];
  const seen = new Set();
  const note = (f, s, i) => {
    const ls = s.lastIndexOf('\n', i) + 1, le = s.indexOf('\n', i);
    const line = s.slice(ls, le < 0 ? s.length : le);
    const ok = NOT_A_STASH.find((a) => a.file === f && line.includes(a.text));
    if (ok) { seen.add(ok); return; }
    found.push(f + ':' + lineOf(s, i) + ' ' + line.trim().slice(0, 110));
  };
  /* A: by its name */
  const A = new RegExp('(?:\\.(?:' + NAMES + ')|\\[\\s*[\'"](?:' + NAMES + ')[\'"]\\s*\\])\\s*' + W, 'g');
  /* B: by a field held in a name (one bound to a stash field in that
     function: a loop over the stash fields, a name made from one, a `field`
     parameter), inside a function that touches a stash */
  const B = (vars) => new RegExp('(?<![\\w$.])[A-Za-z_$][\\w$]*\\s*\\[\\s*(?:' + [...vars].join('|') + ')\\s*\\]\\s*' + W, 'g');
  /* C: through a name that holds a stash */
  const C = new RegExp('(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*[^;\\n]*?(?:\\.(?:' + NAMES + ')|\\[\\s*[A-Za-z_$][\\w$]*\\s*\\])\\s*;', 'g');
  for (const f of files) {
    if (f === 'stash.js') continue;
    const s = code[f];
    for (const m of s.matchAll(A)) note(f, s, m.index);
    for (const [a, b] of chunks(s)) {
      const body = s.slice(a, b);
      if (!TOUCHES.test(body)) continue;
      const vars = stashVars(body);
      if (vars.size) for (const m of body.matchAll(B(vars))) note(f, s, a + m.index);
      for (const m of body.matchAll(C)) {
        if (!new RegExp('\\.(?:' + NAMES + ')|\\[').test(m[0]) || !TOUCHES.test(m[0]) && !/\[\s*(?:field|f|fld)\s*\]/.test(m[0])) continue;
        const v = m[1].replace(/\$/g, '\\$');
        const re = new RegExp('(?<![\\w$.])(?<!(?:const|let|var)\\s+)' + v + '\\s*' + W, 'g');   /* a name declared again is no write */
        for (const w of body.slice(m.index + m[0].length).matchAll(re)) note(f, s, a + m.index + m[0].length + w.index);
      }
    }
  }
  check('2. no stash is written in server/src but through the door (stash.js): by its name, by a field in a name, or through a name that holds one', found.length === 0, found);
  check('2. ...every NOT_A_STASH entry still exists (a stale one is deleted)', seen.size === NOT_A_STASH.length, NOT_A_STASH.filter((a) => !seen.has(a)).map((a) => a.file + ' ' + a.text));
  /* the scanner, tried on what it must find (each a break proof that runs every time) */
  const plant = (txt) => {
    const s = strip(txt);
    let n = 0;
    n += [...s.matchAll(A)].length;
    for (const [a, b] of chunks(s)) {
      const body = s.slice(a, b);
      if (!TOUCHES.test(body)) continue;
      const vars = stashVars(body);
      if (vars.size) n += [...body.matchAll(B(vars))].length;
      for (const m of body.matchAll(C)) { const v = m[1]; n += [...body.slice(m.index + m[0].length).matchAll(new RegExp('(?<![\\w$.])(?<!(?:const|let|var)\\s+)' + v + '\\s*' + W, 'g'))].length; }
    }
    return n;
  };
  const mustFind = [
    'export const x = {\n  _a(ps, w) {\n    ps.weaponStash.push(w);\n  },\n};',
    'export const x = {\n  _a(ps) {\n    ps.armorStash = [];\n  },\n};',
    'export const x = {\n  _a(ps, i, w) {\n    ps.weaponStash[i] = w;\n  },\n};',
    'export const x = {\n  _a(ps) {\n    ps.weaponStash.length = 8;\n  },\n};',
    'export const x = {\n  _a(ps, p) {\n    const field = GEAR_PROV_FIELD.shield;\n    ps[field].push(p);\n  },\n};',
    'export const x = {\n  _a(ps, p) {\n    const bag = ps.shieldStash;\n    bag.splice(0, 1);\n  },\n};',
    'export const x = {\n  _a(ps) {\n    ps[\'gearStash\'].pop();\n  },\n};',
  ];
  const missed = mustFind.filter((t) => plant(t) === 0);
  check('2. ...the scanner finds each shape of a second writer (' + mustFind.length + ' planted)', missed.length === 0, missed);
  check('2. ...and reads a compare as no write', plant('export const x = {\n  _a(ps) {\n    if (ps.weaponStash == null) return;\n    return ps.weaponStash.length === 3;\n  },\n};') === 0);
}

/* ══════════ 3. ONE ROW, ONE PLACE ══════════ */
/* every call, its arguments read to its own closing bracket (strings skipped) */
function callsIn(s, name) {
  const out = [];
  const re = new RegExp('(?<![\\w$])(?:this\\.)?' + name.replace(/\$/g, '\\$') + '\\(', 'g');
  for (const m of s.matchAll(re)) {
    const before = s.slice(Math.max(0, m.index - 30), m.index);
    if (/(?:function|async)\s+$/.test(before) || /^\s*$/.test(before.split('\n').pop()) && /\)\s*\{\s*$/.test(s.slice(m.index, s.indexOf('\n', m.index)))) {
      /* a definition's head, not a call */
      if (new RegExp('^\\s*(?:async\\s+)?(?:function\\s+)?' + name + '\\s*\\([^)]*\\)\\s*\\{').test(s.slice(s.lastIndexOf('\n', m.index) + 1))) continue;
    }
    let i = m.index + m[0].length, depth = 1, q = null;
    for (; i < s.length && depth > 0; i++) {
      const ch = s[i];
      if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
      if (ch === '\'' || ch === '"' || ch === '`') q = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    const args = s.slice(m.index + m[0].length, i - 1);
    out.push({ args, line: lineOf(s, m.index), at: m.index });
  }
  return out;
}
/* the door's own three, and the helpers that hand it their caller's road:
   [name, verb, the file it is defined in, the argument its road is] */
const DOOR = [['stashGive', 'give'], ['stashTake', 'take'], ['stashSet', 'set']];
const HELPERS = [['_gearStashLiveAdd', 'give', 'gearstash.js', 3], ['_gearStashLiveTake', 'take', 'gearstash.js', 3], ['bagIt', 'give', 'shieldwear.js', 3]];
const argsOf = (a) => {
  const parts = []; let depth = 0, q = null, cur = '';
  for (let i = 0; i < a.length; i++) {
    const ch = a[i];
    if (q) { cur += ch; if (ch === '\\') { cur += a[++i]; } else if (ch === q) q = null; continue; }
    if (ch === '\'' || ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
};
{
  const byRoad = Object.create(null);
  const bad = [];
  const lit = (x) => { const m = /^'([A-Za-z0-9_]+)'$/.exec(x || ''); return m ? m[1] : null; };
  const take = (f, c, verb, roadArg) => {
    const where = f + ':' + c.line;
    const road = lit(roadArg);
    if (!road) { bad.push(where + ' names no road as a plain string (' + roadArg + ')'); return; }
    if (!Object.prototype.hasOwnProperty.call(STASH_ROADS, road)) { bad.push(where + ' names "' + road + '", which STASH_ROADS has not got'); return; }
    const row = STASH_ROADS[road];
    if (row.verb !== verb) bad.push(where + ' ' + road + ' is a ' + row.verb + ', called as a ' + verb);
    if (row.at.split(' ')[0] !== f) bad.push(where + ' ' + road + '\'s row says it is in ' + row.at.split(' ')[0]);
    (byRoad[road] = byRoad[road] || []).push(where);
  };
  for (const f of files) {
    if (f === 'stash.js') continue;
    const s = code[f];
    for (const [name, verb] of DOOR) {
      for (const c of callsIn(s, name)) {
        const a = argsOf(c.args);
        const roadArg = a[3];
        /* inside a helper, the road is its caller's: the parameter `road` */
        const inside = HELPERS.find(([h, hv, hf]) => hf === f && hv === verb && chunks(s).some(([a, b]) => c.at > a && c.at < b
          && new RegExp('^\\s*(?:function\\s+)?' + h + '\\s*\\([^)]*\\broad\\b').test(s.slice(a, s.indexOf('\\n', a)))));
        if (roadArg === 'road' && inside) continue;
        take(f, c, verb, roadArg);
      }
    }
    for (const [h, verb, hf, at] of HELPERS) {
      for (const c of callsIn(s, h)) {
        if (f === hf && new RegExp('^\\s*(?:async\\s+)?(?:function\\s+)?' + h + '\\s*\\([^)]*\\)\\s*\\{').test(s.slice(s.lastIndexOf('\n', c.at) + 1))) continue;   /* its definition */
        take(f, c, verb, argsOf(c.args)[at]);
      }
    }
  }
  check('3. every call names a road the table has, with its verb, from its row\'s file (the helpers\' callers too)', bad.length === 0, bad);
  const none = Object.keys(STASH_ROADS).filter((r) => !byRoad[r]);
  const twice = Object.keys(byRoad).filter((r) => byRoad[r].length > 1).map((r) => r + ': ' + byRoad[r].join(', '));
  check('3. every road has a caller (a row nobody calls is deleted with its feature)', none.length === 0, none);
  check('3. no road has two callers (a second place is a second row)', twice.length === 0, twice);
}

/* ══════════ 4. THE CLASSES ══════════ */
{
  const faults = classFaults(STASH_ROADS, { [STASH_SELF]: true });
  check('4. every road is a mint, a burn, a move or an escrow, with its other side (gold.js classFaults)', faults.length === 0 && Object.values(STASH_ROADS).every((r) => CLASSES.includes(r.class)), faults);
  const between = Object.entries(STASH_ROADS).filter(([, r]) => r.class === 'move' && r.other !== STASH_SELF).map(([k]) => k);
  check('4. a move is within the same player (`other: \'self\'`): between players a piece is held (an escrow)', between.length === 0, between);
  check('4. ...every escrow names a place that holds (ESCROW_PLACES)', Object.values(STASH_ROADS).filter((r) => r.class === 'escrow').every((r) => ESCROW_PLACES.includes(r.other)) && ESCROW_PLACES.includes('trade2wpn:'));
  check('4. the door\'s gear lists are gearstash.js\'s', JSON.stringify(STASH_FIELDS.slice(1)) === JSON.stringify(GEAR_STASH_FIELDS) && STASH_FIELDS[0] === 'weaponStash');
  check('4. every road touches stashes the door knows', Object.values(STASH_ROADS).every((r) => r.fields.length && r.fields.every((f) => STASH_FIELDS.includes(f))));
}

/* ══════════ 5. THE CAP IS THE DOOR'S ══════════ */
{
  const st = makeStorage();
  const room = await openRoom(st);
  room._liveFlags.roomrow = false;
  const cap = room.WEAPON_STASH_CAP;
  const pid = 'bp_stash_a';
  const ps = { coins: 0, inventory: {}, level: 1, hp: 10, maxHp: 10 };
  room.playerState[pid] = ps;
  const over = Array.from({ length: cap + 3 }, (_, i) => ({ name: 'Blade ' + i, type: 'sword', tierMult: 1 }));
  stashSet(ps, 'weaponStash', over.slice(), 'join_stored');
  await room._saveRpg(pid, ps);
  await settle();
  const stored = st._store.get('rpg:' + pid);
  check('5. _saveRpg keeps every weapon of a bag over its cap (never cut at the save)', stored && Array.isArray(stored.weaponStash) && stored.weaponStash.length === cap + 3, stored && stored.weaponStash && stored.weaponStash.length);
  const before = ps.weaponStash.length;
  const landed = room._applyCreditToPs(ps, { kind: 'weapon', payload: { weapon: { name: 'Mailed', type: 'sword', tierMult: 1 } } }, pid);
  check('5. a weapon by the mail to a full bag is refused at the door (the mail keeps it), the bag untouched', landed === false && ps.weaponStash.length === before && !ps.weaponStash.some((w) => w && w.name === 'Mailed'), { landed, n: ps.weaponStash.length });
}

/* ══════════ R. THE RUNNING ROOM (v2.3.6440, card DG PR 1) ══════════
   The tour (testroom.mjs playTour: a quest handed in) played on a guarded
   room.  A second writer of the stashes planted on its paths is refused there,
   however it is spelled (Object.assign, `||=`, a computed key, an alias, a
   destructure, `delete`), and fails this suite: testroom.mjs "THE RUNNING
   ROOM REFUSES".  Break proof: plants1.json (tools/dev/plants/). */
{
  const t = await playTour({ tag: 'stash' });
  check('R. the tour plays under the running room\'s guard', roomGuard.armed());
  check('R. ...the guard is ON the tour\'s record (coins its accessor, the bag its Proxy, the room\'s map the guarded one: the purpose review, sitting 56)', roomGuard.holds(t.ps, t.room).length === 0, roomGuard.holds(t.ps, t.room));
  check('R. ...each of its steps did what it does (a quest handed in, paid)', t.steps.length > 0 && t.steps.every((x) => x.paid), t.steps);
  check('R. ...and no write of a guarded field was refused (testroom.mjs)', roomGuard.refusals().length === 0, roomGuard.refusals().slice(0, 5));
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('stash-door: FAILED'); process.exit(1); }
console.log('all stash-door checks passed');
