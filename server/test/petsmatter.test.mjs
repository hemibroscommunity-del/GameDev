/* Pets that matter -- v2.3.3123 (docs/PET-TRAPPING-PLAN.md Phase 4; spec
 * docs/specs/trapping.md "Pets that matter").
 *
 *   1. CAPS: petwards, petshow and pethouse advertised; each switch takes its
 *      own back.
 *   2. THE LAND WARD (petbook.js _petWard, monsterstatus.js _elemOnHit): the
 *      pet out with you, from the land of the monster that hits you, takes
 *      petWardOf(the level it works at) off what that element does -- a
 *      chill, a hold, a daze and a soak shorter, a burn's and a poison's ticks
 *      lighter, a gust's shove shorter, a storm's arc lighter on whoever it
 *      reaches -- says so on the hit (`wd`), and never touches the hit itself.
 *      A pet from another land, no pet, a pet put away, the switch: nothing.
 *      A traded pet above your Trapping level wards at your level.
 *   3. THE OTHERS SEE YOUR PET (petbook.js _petWireRefresh, tick.js `pw`):
 *      the pet out with you on your tick record, exactly petWireOf; none with
 *      none; a level-up and a pet put away change it at once; `petshow: false`
 *      takes it off every record.
 *   4. MORE ROOM IN THE PET HOUSE (pet_house_buy): 10 places for the price
 *      shown, gold and room written together; a stale size, a short purse, no
 *      confirm, a full house and the switch each refused and charging nothing;
 *      the same send twice buys once; the last step stops at 120.
 *   5. THE REVEAL'S LEVER (devtools `look`): the next pet made golden and Big,
 *      once.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
import { CHILL, GUST, STUCK, DAZE, SHOCK, SOAK, BURN, POISON } from '../src/monsterstatus.js';
import { PETBOOK, petWardOf, petHousePrice, petWireOf } from '../src/petbook.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const k of [...store.keys()].filter((x) => !opts?.prefix || x.startsWith(opts.prefix)).sort()) out.set(k, store.get(k));
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

/* Every hit is a sure hit (no Dodge roll), and every catch's look the same
   (not golden, as big as it gets) unless the lever says otherwise. */
Math.random = () => 0.999;

const state = makeState();
const room = new GameRoom(state, mockEnv);
const sockets = {};
async function joinWheel(id) {
  const w = fakeWs(id);
  sockets[id] = w;
  room.sessions.set(w, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(w, JSON.stringify({ type: 'join', id, name: id.toUpperCase(), protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
  const p = room.playerState[id];
  p.lifeSkills.trapping = { level: 30, xp: 0 };
  return p;
}
const cmd = (id, type, payload) => room.webSocketMessage(sockets[id], JSON.stringify({ type, payload: payload || {} }));
const lastOf = (id, type) => { const r = sockets[id].sent.filter((m) => m.type === type); return r.length ? r[r.length - 1].payload : null; };

const ps = await joinWheel('p1');
await room.webSocketMessage(sockets.p1, JSON.stringify({ type: 'move', x: 21504, y: 21792, z: WHEEL_ZONE }));
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
const of = (home) => wheel.find((m) => m.home === home);
const book = (pid) => room._petbookOf(pid);

/* the pet out with `pid`: one of `home`'s, at level `lv` */
function giveOut(pid, home, lv) {
  const made = room._petbookAddCatch(pid, room.playerState[pid], { home, level: Math.min(lv, 20), arch: 'fodder' }, 30, Date.now());
  const rp = book(pid).rec.list.find((q) => q.id === made.id);
  rp.lv = lv;
  book(pid).rec.active = rp.id;
  room._petWireRefresh(pid);
  return rp;
}
function putAway(pid) {
  if (book(pid) && book(pid).rec) { book(pid).rec.active = null; book(pid).rec.list = []; }
  room._petWireRefresh(pid);
}

/* the status suite's stage: monster m and the player 30 px apart out on m's
   spoke, the player fresh -- and sturdy, so a heavy hit never kills */
function alongSpoke(m, r) {
  const ux = m.spawnX - WHEEL_CENTRE[0], uy = m.spawnY - WHEEL_CENTRE[1], ul = Math.hypot(ux, uy);
  return { x: WHEEL_CENTRE[0] + (ux / ul) * r, y: WHEEL_CENTRE[1] + (uy / ul) * r };
}
function stage(m) {
  const p = alongSpoke(m, WHEEL_SAFE_R + 400);
  m.x = p.x; m.y = p.y; m.alive = true;
  ps.x = p.x + 30; ps.y = p.y;
  ps.z = WHEEL_ZONE; ps.dead = false; ps.dying = false; ps.disconnected = false;
  ps.maxHp = 5000; ps.hp = 5000;
  ps.blocking = false; ps._zoneEntryGraceUntil = 0; ps._godUntil = 0;
  ps._chillUntil = 0; ps._stuckUntil = 0; ps._stuckImmuneUntil = 0; ps._gustLeft = 0; ps._gustUntil = 0;
  ps._dazeUntil = 0; ps._dazeImmuneUntil = 0; ps._soakUntil = 0;
  if (room._burns) room._burns.clear();
  if (room._poisons) room._poisons.clear();
  room.eventBuffer.length = 0;
}
const attacksOn = (pid) => room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.targetId === pid).map((e) => e.payload);
const strike = (m) => { room._monsterStrikePlayer(WHEEL_ZONE, m, 'p1', m.x, m.y); const a = attacksOn('p1'); return a.length ? a[a.length - 1] : null; };
/* the same monster's hit, with no pet out and then with `home`'s at `lv` */
function both(home, lv, m, read) {
  putAway('p1');
  stage(m);
  const plain = strike(m);
  const p0 = read ? read() : null;
  giveOut('p1', home, lv);
  stage(m);
  const warded = strike(m);
  const p1 = read ? read() : null;
  return { plain, warded, p0, p1 };
}

// ── 1. CAPS ───────────────────────────────────────────────────────────────────
{
  const sync = sockets.p1.sent.find((m) => m.type === 'state_sync');
  const caps = (sync && sync.caps) || {};
  check('caps: petwards, petshow and pethouse advertised', caps.petwards === true && caps.petshow === true && caps.pethouse === true, caps);
  room._liveFlags = { petwards: false, petshow: false, pethouse: false };
  check('caps: each switch, lower case, says it is off', room._petWardsOff() && room._petShowOff() && room._petHouseOff());
  room._liveFlags = {};
  check('caps: ...and on again without them', !room._petWardsOff() && !room._petShowOff() && !room._petHouseOff());
}

// ── 2. THE LAND WARD ──────────────────────────────────────────────────────────
{
  check('ward: 15% at Lv 1, a point a level, half at most (Lv 36 on)',
    petWardOf(1) === 0.15 && petWardOf(10) === 0.24 && petWardOf(35) === 0.49 && petWardOf(36) === 0.5 && petWardOf(120) === 0.5 && petWardOf(0) === 0.15);

  putAway('p1');
  check('ward: no pet out, no ward', room._petWard('p1', ps, 'frost') === 0);
  const sn = giveOut('p1', 'frost', 8);
  check('ward: a Snowling at Lv 8 wards frost by petWardOf(8)', room._petWard('p1', ps, 'frost') === petWardOf(8), room._petWard('p1', ps, 'frost'));
  check('ward: ...and nothing else', ['flame', 'wind', 'stone', 'storm', 'water', 'venom', 'flora', '__proto__', null].every((e) => room._petWard('p1', ps, e) === 0));
  sn.lv = 60;
  check('ward: a pet above your Trapping level (30) wards at your level', room._petWard('p1', ps, 'frost') === petWardOf(30));
  sn.lv = 8;
  room._liveFlags = { petwards: false };
  check('ward: `petwards: false` turns it off', room._petWard('p1', ps, 'frost') === 0);
  room._liveFlags = {};
  book('p1').rec.active = null;
  check('ward: a pet put away wards nothing', room._petWard('p1', ps, 'frost') === 0);
  const keep = book('p1');
  room._petbookMap().set('p1', { rec: null, locked: true, dirty: false, savedAt: 0, acts: [] });
  check('ward: a record from a newer worker is never read', room._petWard('p1', ps, 'frost') === 0);
  room._petbookMap().set('p1', keep);

  /* each of the eight, through the real hit */
  const w = petWardOf(12), pct = Math.round(w * 100);
  const short = (ms) => Math.max(1, Math.round(ms * (1 - w)));

  const chill = both('frost', 12, of('frost'));
  check(`ward: CHILL -- a Snowling out, the snowman's chill is ${short(CHILL.MS)} ms, not ${CHILL.MS}, and the hit says wd ${pct}`,
    chill.plain && chill.plain.st === 'chill' && chill.plain.stMs === CHILL.MS && !('wd' in chill.plain)
      && chill.warded && chill.warded.st === 'chill' && chill.warded.stMs === short(CHILL.MS) && chill.warded.wd === pct, chill);
  check('ward: ...the worker\'s own clock is the shorter one', ps._chillUntil > 0 && ps._chillUntil - Date.now() <= short(CHILL.MS));
  check('ward: ...and the hit itself is exactly as hard (it never makes anyone hit harder, nor softer)', chill.plain.dmgTaken === chill.warded.dmgTaken && chill.warded.dmgTaken > 0, chill);

  const stuck = both('verdant', 12, of('verdant'));
  check(`ward: HOLD -- a Dewdrop out, the blue slime holds you ${short(STUCK.MS)} ms, its window after unchanged`,
    stuck.plain.stMs === STUCK.MS && stuck.warded.stMs === short(STUCK.MS) && stuck.warded.wd === pct
      && Math.abs((ps._stuckImmuneUntil - ps._stuckUntil) - STUCK.IMMUNE_MS) <= 1, stuck);

  const dz = of('hollows');
  const daze = both('hollows', 12, dz);
  check(`ward: DAZE -- a Pebbling out, the rock monster dazes you ${short(DAZE.MS)} ms`,
    daze.plain.st === 'daze' && daze.plain.stMs === DAZE.MS && daze.warded.stMs === short(DAZE.MS) && daze.warded.wd === pct, daze);

  const soak = both('tidal', 12, of('tidal'));
  check(`ward: SOAK -- a Finling out, the fishman soaks you ${short(SOAK.MS)} ms`,
    soak.plain.st === 'soak' && soak.plain.stMs === SOAK.MS && soak.warded.stMs === short(SOAK.MS) && soak.warded.wd === pct
      && ps._soakUntil - Date.now() <= short(SOAK.MS), soak);

  const gm = of('sky');
  const gust = both('sky', 12, gm);
  const len = (p) => (p && Array.isArray(p.kb) ? Math.hypot(p.kb[0], p.kb[1]) : 0);
  check(`ward: GUST -- a Mumling out, the mummy's shove is ${Math.round((1 - w) * 100)}% as long`,
    gust.plain.st === 'gust' && gust.warded.st === 'gust' && gust.warded.wd === pct
      && Math.abs(len(gust.warded) / len(gust.plain) - (1 - w)) < 0.04 && len(gust.plain) > GUST.PX * 0.5, { plain: gust.plain.kb, warded: gust.warded.kb });
  check('ward: ...and the worker grants the room for exactly the shorter shove', Math.abs(ps._gustLeft - len(gust.warded)) < 0.01, { left: ps._gustLeft, kb: gust.warded.kb });

  /* the damage-over-time two, at a heavy hit so the ward is not lost in a round */
  const em = of('ember'); const emDmg = em.dmg; em.dmg = 100;
  const burn = both('ember', 12, em, () => (room._burns && room._burns.get('p1') ? room._burns.get('p1').dmg : null));
  em.dmg = emDmg;
  check(`ward: BURN -- a Gobling out, each tick ${Math.round(100 * BURN.PCT * (1 - w))} not ${Math.round(100 * BURN.PCT)} (a 100 hit)`,
    burn.p0 === Math.round(100 * BURN.PCT) && burn.p1 === Math.round(100 * BURN.PCT * (1 - w)) && burn.warded.wd === pct && burn.warded.stMs === burn.plain.stMs, burn);
  const vm = of('mist'); const vmDmg = vm.dmg; vm.dmg = 100;
  const poison = both('mist', 12, vm, () => (room._poisons && room._poisons.get('p1') ? room._poisons.get('p1').dmg : null));
  vm.dmg = vmDmg;
  check(`ward: POISON -- a Wisplet out, each tick ${Math.round(100 * POISON.PCT * (1 - w))} not ${Math.round(100 * POISON.PCT)}`,
    poison.p0 === Math.round(100 * POISON.PCT) && poison.p1 === Math.round(100 * POISON.PCT * (1 - w)) && poison.warded.wd === pct, poison);
  putAway('p1');
  const lurk = room._petbookAddCatch('p1', ps, { home: 'mist', level: 5, arch: 'brute' }, 30, Date.now());
  const lr = book('p1').rec.list.find((q) => q.id === lurk.id);
  lr.lv = 12; book('p1').rec.active = lr.id;
  check('ward: the Mire\'s other kind, a Lurkling, wards venom too', lr.kind === 'lurkling' && room._petWard('p1', ps, 'venom') === w, { kind: lr.kind, ward: room._petWard('p1', ps, 'venom') });

  /* the storm's arcs, softened where they land */
  const p2 = await joinWheel('p2'); const p3 = await joinWheel('p3');
  const tm = of('thunder'); const tmDmg = tm.dmg; tm.dmg = 100;
  putAway('p1'); putAway('p2'); putAway('p3');
  giveOut('p2', 'thunder', 12);
  stage(tm);
  for (const [o, dx] of [[p2, 60], [p3, 90]]) Object.assign(o, { z: WHEEL_ZONE, x: ps.x + dx, y: ps.y, dead: false, dying: false, disconnected: false, maxHp: 5000, hp: 5000, _zoneEntryGraceUntil: 0, _godUntil: 0, blocking: false });
  const own = strike(tm);
  const arcs = room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.ability === 'shock').map((e) => e.payload);
  const a2 = arcs.find((a) => a.targetId === 'p2'), a3 = arcs.find((a) => a.targetId === 'p3');
  tm.dmg = tmDmg;
  check(`ward: SHOCK -- the arc to a player with a Sparklet out is ${Math.round(100 * SHOCK.PCT * (1 - w))} and says wd ${pct}`,
    !!a2 && a2.dmg === Math.round(100 * SHOCK.PCT * (1 - w)) && a2.wd === pct, a2);
  check(`ward: ...the arc to one without is the full ${Math.round(100 * SHOCK.PCT)}, no wd`, !!a3 && a3.dmg === Math.round(100 * SHOCK.PCT) && !('wd' in a3), a3);
  check('ward: ...and the struck player\'s own crackle carries none (there is nothing on them to soften)', own && own.st === 'shock' && !('wd' in own), own);
  for (const o of [p2, p3]) Object.assign(o, { z: 'town', x: 1000, y: 1000 });

  /* the wrong land's pet, and the switch, through the real hit */
  putAway('p1');
  giveOut('p1', 'ember', 12);
  stage(of('frost'));
  const wrong = strike(of('frost'));
  check('ward: a Gobling out does nothing to the snowman\'s chill', wrong.stMs === CHILL.MS && !('wd' in wrong), wrong);
  putAway('p1');
  giveOut('p1', 'frost', 12);
  room._liveFlags = { petwards: false };
  stage(of('frost'));
  const off = strike(of('frost'));
  room._liveFlags = {};
  check('ward: `petwards: false` -- the full chill, no wd', off.stMs === CHILL.MS && !('wd' in off), off);
  /* a dodge or a blocked hit carries nothing, ward or not (the status suite's rule) */
  const none = room._elemOnHit(WHEEL_ZONE, of('frost'), 'p1', ps, { dodged: true, dmgTaken: 0 }, Date.now());
  check('ward: a dodged hit carries no status and no wd', none && !('st' in none) && !('wd' in none), none);
}

// ── 3. THE OTHERS SEE YOUR PET ────────────────────────────────────────────────
{
  const watcher = await joinWheel('pw');
  const tickOnce = async () => {
    sockets.pw.sent.length = 0;
    room.dirtyPlayers.add('p1');
    room.startTickLoop();
    await new Promise((r) => setTimeout(r, room.TICK_RATE * 3));
    clearInterval(room.tickInterval); room.tickInterval = null;
    const ticks = sockets.pw.sent.filter((m) => m.type === 'tick' && m.players && m.players.p1);
    return ticks.length ? ticks[ticks.length - 1].players.p1 : null;
  };
  watcher.z = ps.z; watcher.x = ps.x + 50; watcher.y = ps.y;
  putAway('p1');
  const bare = await tickOnce();
  check('show: no pet out -- your record carries no `pw` at all', !!bare && !('pw' in bare), bare);
  const pet = giveOut('p1', 'frost', 9);
  check('show: a pet out -- _petWire is petWireOf(it)', ps._petWire === petWireOf(pet) && /^snowling\.1\.[01]\.\d{2,3}\.9$/.test(ps._petWire), ps._petWire);
  const seen = await tickOnce();
  check('show: ...and the others\' tick carries it as `pw` (never `pt`, the pants), never its name', !!seen && seen.pw === petWireOf(pet) && !('pt' in seen) && !/Sparky|name/.test(JSON.stringify(seen)), seen);
  pet.name = 'Sparky';
  room._petbookSend('p1');
  check('show: a name changes nothing on the wire', ps._petWire === petWireOf({ ...pet, name: null }));
  room.dirtyPlayers.clear();
  const T = ps.lifeSkills.trapping.level;
  const g = room._petbookAddXp('p1', ps, 100000, Date.now());
  check('show: a level-up changes it at once and marks you dirty', !!g && g.leveled > 0 && ps._petWire.endsWith('.' + T) && room.dirtyPlayers.has('p1'), { g, wire: ps._petWire });
  room.dirtyPlayers.clear();
  await cmd('p1', 'pet_active', { id: null });
  check('show: put away -- gone from your record, and you are marked dirty', ps._petWire === null && room.dirtyPlayers.has('p1'));
  const gone = await tickOnce();
  check('show: ...the next tick has no `pw`', !!gone && !('pw' in gone), gone);
  await cmd('p1', 'pet_active', { id: pet.id });
  room._liveFlags = { petshow: false };
  const hidden = await tickOnce();
  room._liveFlags = {};
  check('show: `petshow: false` -- no `pw` on any record, the pet still out', !!hidden && !('pw' in hidden) && ps._petWire === petWireOf(pet), hidden);
  check('show: _petWire is never saved in the character', !('_petWire' in (state._store.get('rpg:p1') || {})));
  room.sessions.delete(sockets.pw);
  delete room.playerState.pw;
}

// ── 4. MORE ROOM IN THE PET HOUSE ─────────────────────────────────────────────
{
  putAway('p1');
  const b = book('p1');
  b.rec.cap = PETBOOK.CAP;
  b.acts = [];
  check('house: 1,000 gold for 30 -> 40, 2,000 for 40 -> 50 ... 9,000 for 110 -> 120, nothing at 120',
    petHousePrice(30) === 1000 && petHousePrice(40) === 2000 && petHousePrice(110) === 9000 && petHousePrice(120) === 0 && petHousePrice(5) === 1000);
  ps.coins = 500;
  await cmd('p1', 'pet_house_buy', { cap: 30, confirm: true });
  let r = lastOf('p1', 'pets_state');
  check('house: 500 gold is not enough -- refused, nothing charged', r && r.op === 'house' && r.error === 'no-gold' && ps.coins === 500 && b.rec.cap === 30, r);
  ps.coins = 5000;
  await cmd('p1', 'pet_house_buy', { cap: 30 });
  r = lastOf('p1', 'pets_state');
  check('house: no confirm -- refused', r.error === 'confirm' && ps.coins === 5000 && b.rec.cap === 30, r);
  await cmd('p1', 'pet_house_buy', { cap: 40, confirm: true });
  r = lastOf('p1', 'pets_state');
  check('house: a stale size (a price it did not show) -- refused, nothing charged', r.error === 'stale' && ps.coins === 5000 && b.rec.cap === 30, r);
  await cmd('p1', 'pet_house_buy', { cap: 30, confirm: true });
  r = lastOf('p1', 'pets_state');
  check('house: 1,000 gold buys 10 places: 30 -> 40', !r.error && r.op === 'house' && r.cap === 40 && b.rec.cap === 40 && ps.coins === 4000, { r: { op: r.op, cap: r.cap, error: r.error }, coins: ps.coins });
  check('house: ...the gold and the room written together (rpg and pets records)',
    (state._store.get('rpg:p1') || {}).coins === 4000 && (state._store.get('pets:p1') || {}).cap === 40,
    { rpg: (state._store.get('rpg:p1') || {}).coins, pets: (state._store.get('pets:p1') || {}).cap });
  await cmd('p1', 'pet_house_buy', { cap: 30, confirm: true });
  r = lastOf('p1', 'pets_state');
  check('house: the same send again buys nothing (stale)', r.error === 'stale' && b.rec.cap === 40 && ps.coins === 4000, r);
  room._liveFlags = { pethouse: false };
  await cmd('p1', 'pet_house_buy', { cap: 40, confirm: true });
  room._liveFlags = {};
  r = lastOf('p1', 'pets_state');
  check('house: `pethouse: false` -- refused (off)', r.error === 'off' && b.rec.cap === 40 && ps.coins === 4000, r);
  b.rec.cap = 110; ps.coins = 20000; b.acts = [];
  await cmd('p1', 'pet_house_buy', { cap: 110, confirm: true });
  r = lastOf('p1', 'pets_state');
  check('house: the last step, 110 -> 120 for 9,000', !r.error && b.rec.cap === 120 && ps.coins === 11000, { error: r.error, cap: b.rec.cap, coins: ps.coins });
  await cmd('p1', 'pet_house_buy', { cap: 120, confirm: true });
  r = lastOf('p1', 'pets_state');
  check('house: at 120 it is as big as it gets (house-full), nothing charged', r.error === 'house-full' && b.rec.cap === PETBOOK.CAP_MAX && ps.coins === 11000, r);
  check('house: a 120-place collection survives a reload of its record', (state._store.get('pets:p1') || {}).cap === 120);
  b.rec.cap = PETBOOK.CAP;
  room._petbookSave('p1', b);
}

// ── 5. THE REVEAL'S LEVER ─────────────────────────────────────────────────────
{
  const out = room._devTrapping('p1', { look: { gold: true, size: 1.22 }, pet: { home: 'frost', level: 2 } });
  const made = book('p1').rec.list.find((q) => q.id === out.pet);
  check('look: the lever makes the next pet golden and Big (1.22)', out.ok && !!made && made.gold === true && made.size === 1.22, { out, made });
  const out2 = room._devTrapping('p1', { pet: { home: 'frost', level: 2 } });
  const made2 = book('p1').rec.list.find((q) => q.id === out2.pet);
  check('look: ...once: the pet after rolls as ever (not golden)', !!made2 && made2.gold === false && made2.size === 1.25, made2);
  room._devTrapping('p1', { look: { size: 9 } });
  const out3 = room._devTrapping('p1', { pet: { home: 'frost', level: 2 } });
  const made3 = book('p1').rec.list.find((q) => q.id === out3.pet);
  check('look: a size past the rolls is held to them (1.25)', !!made3 && made3.size === PETBOOK.SIZE_MAX, made3);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
