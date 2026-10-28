/* THE HIDDEN SETTINGS (v2.3.3723, docs/specs/hidden-settings.md).
 *
 * The owner, 2026-10-28: "Just hiding what you can in the server code (like
 * anti bot, tuning, ...)".  The anti-bot thresholds, weights, flag scores,
 * fleet limits and the two hour caps are read from one stored record merged
 * over public placeholders (hidden.js).  What this suite pins:
 *   1. the table: every placeholder is today's BOTFP value and inside its own
 *      range; the hour caps' floors never go under the honest bound
 *      (node-respawn §3c's property, for ANY value the owner may store);
 *   2. a stored value overrides its placeholder, in the anti-bot itself (the
 *      flag score, the hour cap), read when the room starts;
 *   3. a broken or missing value falls back to its placeholder (unknown name,
 *      not a number, out of range, a fraction for a count, a newer worker's
 *      record, `__proto__`), and a failed read is not fatal;
 *   4. the admin route: 404 with no key configured, 401 with a wrong one;
 *      GET lists, POST sets (live at once), refuses a bad value (400), null
 *      clears, DELETE clears one or all; the audit log never holds a value;
 *      a newer worker's record is never written over (409);
 *   5. the kill switch `hidden_off` (a lower-case live flag) puts every value
 *      back to its placeholder and leaves the record alone;
 *   6. NOTHING HIDDEN REACHES A PHONE: a room with every setting set to a
 *      marker is played (joins, harvests up to a flag and a cap, cooks, chat,
 *      the live flags' kill switch) and every message every phone got is read
 *      for a marker, a setting's name or the record's key. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { BOTFP } from '../src/botfp.js';
import { HIDDEN, HIDDEN_SPEC, HIDDEN_PLACEHOLDERS, cleanHidden, mergeHidden, hiddenRefusal } from '../src/hidden.js';
import { HONEST_CYCLE_MIN_MS } from '../src/gathering.js';

const KEY = 'test-admin-key-hidden';
function makeState(seed) {
  const store = new Map(Object.entries(seed || {}));
  let puts = 0;
  return {
    store, puts: () => puts,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { puts++; if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const envWith = (k) => ({ LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ...(k ? { ADMIN_KEY: k } : {}) });
function fakeWs(label) { return { label, sent: [], raw: [], send(s) { this.raw.push(s); this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const admin = (room, method, path, key, body) => room._adminFetch(new Request('https://w/api/admin' + path, {
  method,
  headers: Object.assign(key ? { Authorization: 'Bearer ' + key } : {}, body ? { 'Content-Type': 'application/json' } : {}),
  body: body ? JSON.stringify(body) : undefined,
}));
const jbody = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });
const send = (room, ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
async function join(room, id, device) {
  const ws = fakeWs(id);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  const msg = { type: 'join', id, name: 'T' + id.slice(-3), phrase: 'p-' + id, protocolVersion: 2, data: { x: -100000, y: -100000, z: 'town' } };
  if (device) msg.device = device;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  return ws;
}
/* one strike through the real door (botfp.test's way): the start, a window
   backdated past its delay, the strike */
async function strike(room, ws, id, node, fp, accuracy = 'good') {
  node.alive = true; node.respawnAt = 0;
  const skill = room._harvestSkillName(node.nodeType);
  await send(room, ws, 'extraction_start', { nodeId: node.id, zone: 'meadow', skill });
  const ex = room.extractions[id];
  if (ex) ex.startedAt = Date.now() - ex.openDelayBase - 500;
  const payload = { id: node.id, zone: 'meadow', accuracy };
  if (fp) payload.swipeFp = fp;
  await send(room, ws, 'node_strike', payload);
}
async function harvester(room, id, device) {
  const ws = await join(room, id, device);
  const ps = room.playerState[id];
  ps.z = 'meadow';
  const node = room._ensureZoneNodes('meadow')[0];
  ps.x = node.x; ps.y = node.y;
  ps.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 }; ps.lifeSkills = {};
  return { ws, ps, node, skill: room._harvestSkillName(node.nodeType), inv: room._harvestInvKey(node.nodeType, node.tierLvl) };
}
const synthFp = (i) => ({ len: 400, n: 60, dur: 1200, ent: 0.001, tv: 0, vc: 0.001, h: 'syn-' + i });

// ── 1. the table ──
{
  const names = Object.keys(HIDDEN_SPEC);
  check('1. every hidden setting is a BOTFP name, its placeholder today\'s value', names.length >= 24
    && names.every((n) => n in BOTFP && HIDDEN_SPEC[n].dflt === BOTFP[n] && HIDDEN_PLACEHOLDERS[n] === BOTFP[n]), names.length);
  check('1. every placeholder is inside its own range (a fresh room reads exactly today\'s values)',
    names.every((n) => hiddenRefusal(n, HIDDEN_SPEC[n].dflt) === null), names.filter((n) => hiddenRefusal(n, HIDDEN_SPEC[n].dflt)));
  for (const n of ['FLAG_AT', 'STARTLESS_FLAG_AT', 'FLAG_MIN_GAP_MS', 'FLEET_MIN_IDS', 'FLEET_ACTIVE_MIN', 'FLEET_ACTIVE_STRIKES',
    'HARVEST_HOUR_CAP', 'COOK_HOUR_CAP', 'ENT_FLOOR', 'TV_FLOOR', 'VC_FLOOR', 'SCORE_SYNTH', 'SCORE_REPLAY', 'SCORE_COLLAPSE', 'SCORE_INTERVAL']) {
    check('1. ' + n + ' is hidden', n in HIDDEN_SPEC);
  }
  for (const n of ['PUT_MIN_MS', 'MAP_CAP', 'RING', 'H_RING', 'DEVICE_ID_MAX', 'WELFORD_CAP']) {
    check('1. ' + n + ' (plumbing: memory and cost) stays public', !(n in HIDDEN_SPEC));
  }
  /* node-respawn §3c holds the PLACEHOLDER above the honest rate; the range's
     floor holds every value the owner can store there too */
  const honest = 3600000 / HONEST_CYCLE_MIN_MS;
  check(`1. no storable harvest cap fires on an honest player (floor ${HIDDEN_SPEC.HARVEST_HOUR_CAP.lo} >= ${Math.round(honest)}/h)`,
    HIDDEN_SPEC.HARVEST_HOUR_CAP.lo >= honest && hiddenRefusal('HARVEST_HOUR_CAP', Math.floor(honest)) !== null);
  check('1. ...nor any storable cook cap', HIDDEN_SPEC.COOK_HOUR_CAP.lo >= honest && hiddenRefusal('COOK_HOUR_CAP', Math.floor(honest)) !== null);
  check('1. the table is frozen', Object.isFrozen(HIDDEN_SPEC) && Object.isFrozen(HIDDEN_PLACEHOLDERS) && Object.isFrozen(mergeHidden({})));
  check('1. the record is its own key, never the live flags (they are spread over every phone\'s caps)', HIDDEN.KEY === 'hidden_settings');
}

// ── 2. a stored value overrides its placeholder, read when the room starts ──
{
  const state = makeState({ [HIDDEN.KEY]: { v: 1, s: { FLAG_AT: 4, HARVEST_HOUR_CAP: 2500 }, at: 1 } });
  const room = new GameRoom(state, envWith(KEY));
  check('2. before the read: the placeholders', room._hid().FLAG_AT === BOTFP.FLAG_AT);
  await room._hiddenEnsure();
  check('2. read at the start: the stored values', room._hid().FLAG_AT === 4 && room._hid().HARVEST_HOUR_CAP === 2500, room._hid());
  check('2. ...and every other is its placeholder', room._hid().COOK_HOUR_CAP === BOTFP.COOK_HOUR_CAP && room._hid().SCORE_SYNTH === BOTFP.SCORE_SYNTH);
  const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  const at = src.indexOf('await this._hiddenEnsure();'), sock = src.indexOf('new WebSocketPair()');
  check('2. the worker reads them before its first socket (index.js fetch)', at > 0 && sock > at, { at, sock });

  // the flag score: three scripted strikes (3 x SCORE_SYNTH = 6, less a moment's decay) flag at 4, where 10 would not
  const h = await harvester(room, 'bp_hid_flag');
  for (let i = 0; i < 3; i++) await strike(room, h.ws, 'bp_hid_flag', h.node, synthFp(i));
  const rec = room._botfp.get('bp_hid_flag');
  check('2. the anti-bot flags at the stored score (4), not the placeholder (10)',
    rec.flags.length === 1 && rec.flags[0].kind === 'suspicion-threshold', { flags: rec.flags.length, score: rec.score });

  // the hour cap: the 2,401st harvest of the hour is paid at 2,500 (the placeholder withholds it)
  const g = await harvester(room, 'bp_hid_cap');
  const rg = room._botfpRecord('bp_hid_cap', Date.now());
  rg.hour = { hourStart: Date.now(), bySkill: { [g.skill]: BOTFP.HARVEST_HOUR_CAP } };
  const before = g.ps.inventory[g.inv] || 0;
  await strike(room, g.ws, 'bp_hid_cap', g.node, null);
  check('2. past the placeholder cap, under the stored one: paid', (g.ps.inventory[g.inv] || 0) > before && rg.counters.capClamps === 0,
    { before, after: g.ps.inventory[g.inv], clamps: rg.counters.capClamps });
  rg.hour.bySkill[g.skill] = 2500;
  const mid = g.ps.inventory[g.inv] || 0;
  await strike(room, g.ws, 'bp_hid_cap', g.node, null);
  check('2. past the stored cap: withheld', (g.ps.inventory[g.inv] || 0) === mid && rg.counters.capClamps === 1, { mid, after: g.ps.inventory[g.inv] });
}

// ── 3. a broken or missing value falls back ──
{
  const s = { FLAG_AT: 'twelve', HARVEST_HOUR_CAP: 5, SYNTH_MIN_FLOORS: 2.5, ENT_FLOOR: null, VC_FLOOR: -1, TV_FLOOR: Infinity,
    COOK_HOUR_CAP: 999999999, nonsense: 3, PUT_MIN_MS: 1, SCORE_REPLAY: 7 };
  Object.defineProperty(s, '__proto__', { value: { FLAG_AT: 1 }, enumerable: true, configurable: true, writable: true });
  const clean = cleanHidden({ v: 1, s });
  check('3. broken values are dropped, one good value kept', Object.keys(clean).join(',') === 'SCORE_REPLAY' && clean.SCORE_REPLAY === 7, Object.keys(clean));
  const t = mergeHidden(clean);
  check('3. ...each dropped one reads its placeholder', t.FLAG_AT === BOTFP.FLAG_AT && t.HARVEST_HOUR_CAP === BOTFP.HARVEST_HOUR_CAP
    && t.SYNTH_MIN_FLOORS === BOTFP.SYNTH_MIN_FLOORS && t.ENT_FLOOR === BOTFP.ENT_FLOOR && t.TV_FLOOR === BOTFP.TV_FLOOR
    && t.COOK_HOUR_CAP === BOTFP.COOK_HOUR_CAP && !('nonsense' in t) && !('PUT_MIN_MS' in t), t);
  check('3. `__proto__` reaches nothing', Object.getPrototypeOf(t) === Object.prototype && t.FLAG_AT === BOTFP.FLAG_AT);
  check('3. no record, a bare value, no `s`: empty', [undefined, null, 7, 'x', {}, { v: 1 }, { v: 1, s: null }].every((r) => Object.keys(cleanHidden(r)).length === 0));
  check('3. a newer worker\'s record reads as empty', Object.keys(cleanHidden({ v: HIDDEN.V + 1, s: { FLAG_AT: 4 } })).length === 0);

  const room = new GameRoom(makeState({ [HIDDEN.KEY]: { v: 1, s } }), envWith(KEY));
  await room._hiddenEnsure();
  check('3. a room with a broken record runs on its placeholders (and the one good value)', room._hid().FLAG_AT === BOTFP.FLAG_AT && room._hid().SCORE_REPLAY === 7);
  const room2 = new GameRoom(makeState(), envWith(KEY));
  await room2._hiddenEnsure();
  check('3. no record at all: every placeholder', Object.keys(HIDDEN_SPEC).every((n) => room2._hid()[n] === BOTFP[n]));
  const st3 = makeState();
  st3.storage.get = async () => { throw new Error('storage down'); };
  const room3 = new GameRoom(st3, envWith(KEY));
  let threw = false;
  try { await room3._hiddenEnsure(); } catch (e) { threw = true; }
  check('3. a failed read is not fatal: the placeholders, read again next time', !threw && room3._hid().FLAG_AT === BOTFP.FLAG_AT && !room3._hiddenLoaded);
}

// ── 4. the admin route ──
{
  const state = makeState();
  const room = new GameRoom(state, envWith(KEY));
  const bare = new GameRoom(makeState(), envWith(null));
  check('4. no ADMIN_KEY configured: 404', (await admin(bare, 'GET', '/dev/hidden', KEY)).status === 404);
  check('4. a wrong key: 401', (await admin(room, 'GET', '/dev/hidden', 'nope')).status === 401);
  check('4. no key: 401', (await admin(room, 'GET', '/dev/hidden', null)).status === 401);
  check('4. a wrong key cannot write either', (await admin(room, 'POST', '/dev/hidden', 'nope', { name: 'FLAG_AT', value: 3 })).status === 401 && !state.store.has(HIDDEN.KEY));

  const g = await jbody(await admin(room, 'GET', '/dev/hidden', KEY));
  const row = (b, n) => (b.settings || []).find((x) => x.name === n);
  check('4. GET lists every setting with its words, range, placeholder and value', g.status === 200 && g.body.ok
    && g.body.settings.length === Object.keys(HIDDEN_SPEC).length && row(g.body, 'FLAG_AT').value === BOTFP.FLAG_AT
    && row(g.body, 'FLAG_AT').stored === null && typeof row(g.body, 'FLAG_AT').words === 'string', g.body);

  const p = await jbody(await admin(room, 'POST', '/dev/hidden', KEY, { name: 'FLAG_AT', value: 7.5 }));
  check('4. POST stores one', p.status === 200 && row(p.body, 'FLAG_AT').stored === 7.5 && state.store.get(HIDDEN.KEY).s.FLAG_AT === 7.5, p.body);
  check('4. ...live at once, no restart', room._hid().FLAG_AT === 7.5);
  for (const [name, value, why] of [['FLAG_AT', 0, 'under its range'], ['FLAG_AT', 'x', 'not a number'], ['SYNTH_MIN_FLOORS', 1.5, 'a fraction'],
    ['HARVEST_HOUR_CAP', 2000, 'under the honest bound'], ['PUT_MIN_MS', 1000, 'public plumbing'], ['__proto__', 3, 'no such setting'], [null, 3, 'no name']]) {
    const r = await jbody(await admin(room, 'POST', '/dev/hidden', KEY, { name, value }));
    check('4. POST refuses ' + why + ' (400, nothing changed)', r.status === 400 && r.body.ok === false && room._hid().FLAG_AT === 7.5, r);
  }
  await admin(room, 'POST', '/dev/hidden', KEY, { name: 'COOK_HOUR_CAP', value: 3000 });
  const c = await jbody(await admin(room, 'POST', '/dev/hidden', KEY, { name: 'FLAG_AT', value: null }));
  check('4. value null: back to the placeholder, the other kept', c.status === 200 && room._hid().FLAG_AT === BOTFP.FLAG_AT && room._hid().COOK_HOUR_CAP === 3000, c.body);
  await admin(room, 'POST', '/dev/hidden', KEY, { name: 'SCORE_REPLAY', value: 4 });
  const d1 = await jbody(await admin(room, 'DELETE', '/dev/hidden?name=SCORE_REPLAY', KEY));
  check('4. DELETE ?name= clears one', d1.status === 200 && room._hid().SCORE_REPLAY === BOTFP.SCORE_REPLAY && room._hid().COOK_HOUR_CAP === 3000);
  const d2 = await jbody(await admin(room, 'DELETE', '/dev/hidden', KEY));
  check('4. DELETE with no name clears all', d2.status === 200 && Object.keys(state.store.get(HIDDEN.KEY).s).length === 0 && room._hid().COOK_HOUR_CAP === BOTFP.COOK_HOUR_CAP);
  const log = JSON.stringify(state.store.get('admin_log') || []);
  check('4. every write is in the audit log, by name', /hidden_set/.test(log) && /hidden_clear_all/.test(log) && /COOK_HOUR_CAP/.test(log), log.slice(0, 300));
  check('4. ...and never with its value', !/3000|7\.5/.test(log), log);

  const newer = makeState({ [HIDDEN.KEY]: { v: HIDDEN.V + 1, s: { FLAG_AT: 4, x: 'future' } } });
  const rn = new GameRoom(newer, envWith(KEY));
  const w = await jbody(await admin(rn, 'POST', '/dev/hidden', KEY, { name: 'FLAG_AT', value: 3 }));
  check('4. a newer worker\'s record is never written over (409)', w.status === 409 && newer.store.get(HIDDEN.KEY).s.x === 'future' && rn._hid().FLAG_AT === BOTFP.FLAG_AT, w);
  check('4. ...and the list says so', (await jbody(await admin(rn, 'GET', '/dev/hidden', KEY))).body.newer === true);
}

// ── 5. the kill switch ──
{
  const state = makeState({ [HIDDEN.KEY]: { v: 1, s: { FLAG_AT: 4, HARVEST_HOUR_CAP: 2500 } } });
  const room = new GameRoom(state, envWith(KEY));
  await room._hiddenEnsure();
  const on = await jbody(await admin(room, 'POST', '/flags', KEY, { name: HIDDEN.OFF_FLAG, value: true }));
  check('5. `hidden_off` is a name the live flags take (lower case)', on.status === 200 && on.body.flags.hidden_off === true, on);
  check('5. thrown: every value is its placeholder', Object.keys(HIDDEN_SPEC).every((n) => room._hid()[n] === BOTFP[n]));
  check('5. ...the record untouched', state.store.get(HIDDEN.KEY).s.FLAG_AT === 4);
  check('5. ...and the Test panel says so', (await jbody(await admin(room, 'GET', '/dev/hidden', KEY))).body.off === true);
  await admin(room, 'DELETE', '/flags?name=' + HIDDEN.OFF_FLAG, KEY);
  check('5. cleared: the private values are back', room._hid().FLAG_AT === 4 && room._hid().HARVEST_HOUR_CAP === 2500);
}

// ── 6. nothing hidden reaches a phone ──
{
  /* a marker for every setting: a value in its range a game message would not
     carry by chance (seven significant figures; a count with room for one).
     A setting whose whole range is a handful of small whole numbers cannot be
     told from a coordinate or a count by its value, so it is looked for by its
     NAME only, like every other. */
  const markers = Object.create(null);
  let i = 0;
  for (const [n, s] of Object.entries(HIDDEN_SPEC)) {
    i++;
    if (s.int) {
      if (s.hi - s.lo < 5000) continue;
      markers[n] = s.lo + 1777 + i * 31;
    } else {
      markers[n] = Number((s.lo + (s.hi - s.lo) * (0.31 + i * 0.0137)).toPrecision(7));
    }
    if (hiddenRefusal(n, markers[n]) !== null) delete markers[n];
  }
  /* small enough that the bot below crosses them */
  const s = { ...markers, FLAG_AT: 3.917243, SCORE_SYNTH: 2.718281 };
  const state = makeState({ [HIDDEN.KEY]: { v: 1, s } });
  const room = new GameRoom(state, envWith(KEY));
  await room._hiddenEnsure();
  check('6. the markers are in force', room._hid().FLAG_AT === 3.917243 && Object.keys(markers).length >= 15, Object.keys(markers).length);

  const phones = [];
  const bot = await harvester(room, 'bp_hid_bot', { id: 'hidfleet', env: 'e1' });
  phones.push(bot.ws);
  const honest = await harvester(room, 'bp_hid_ok', { id: 'hidok', env: 'e2' });
  phones.push(honest.ws);
  for (let k = 0; k < 6; k++) await strike(room, bot.ws, 'bp_hid_bot', bot.node, synthFp(k), 'perfect');
  for (let k = 0; k < 3; k++) await strike(room, honest.ws, 'bp_hid_ok', honest.node, { len: 800 + k, n: 90, dur: 1500, ent: 0.12 + k / 50, tv: 40, vc: 0.3, h: 'ok' + k });
  const rb = room._botfpRecord('bp_hid_bot', Date.now());
  rb.hour.bySkill[bot.skill] = 1e6;   /* past any cap: a withheld strike */
  await strike(room, bot.ws, 'bp_hid_bot', bot.node, synthFp(99));
  await send(room, bot.ws, 'chat', { text: 'hello' });
  await send(room, honest.ws, 'cook_result', { kind: 'cooked', fish: 'fish_raw', swipeFp: { h: 'c1' } });
  await admin(room, 'POST', '/flags', KEY, { name: HIDDEN.OFF_FLAG, value: true });
  phones.push(await join(room, 'bp_hid_late'));
  await admin(room, 'DELETE', '/flags?name=' + HIDDEN.OFF_FLAG, KEY);
  await admin(room, 'POST', '/dev/hidden', KEY, { name: 'COOK_HOUR_CAP', value: markers.COOK_HOUR_CAP || 3001 });
  if (typeof room._tick === 'function') { try { await room._tick(); } catch (e) { /* a bare room's tick may want more; the messages so far are the point */ } }
  check('6. the bot was flagged and capped (the paths that might speak were run)',
    rb.flags.length >= 1 && rb.counters.capClamps >= 1, { flags: rb.flags.map((f) => f.kind), c: rb.counters });

  const raw = phones.flatMap((w) => w.raw).join('\n');
  check('6. the phones got messages to read', phones.every((w) => w.raw.length > 0) && raw.length > 2000, phones.map((w) => w.raw.length));
  const leaks = [];
  for (const [n, v] of Object.entries(s)) {
    const re = new RegExp('(^|[^0-9.])' + String(v).replace('.', '\\.') + '([^0-9]|$)');
    if (re.test(raw)) leaks.push(n + '=' + v);
  }
  for (const n of Object.keys(HIDDEN_SPEC)) if (raw.includes(n)) leaks.push('name ' + n);
  if (raw.includes(HIDDEN.KEY)) leaks.push('the key');
  check('6. no phone got a hidden value, a setting\'s name or the record\'s key', leaks.length === 0, leaks);
  const caps = (phones[2].sent.find((m) => m.type === 'state_sync') || {}).caps || {};
  check('6. ...the kill switch is a flag a phone may see (its name only, no value)', caps.hidden_off === true && !Object.keys(caps).some((k) => k in HIDDEN_SPEC), Object.keys(caps).filter((k) => /hid/i.test(k)));
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
if (failures) process.exit(1);
