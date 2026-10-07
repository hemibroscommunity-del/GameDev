/* The daily rewards -- v2.3.3140 (server/src/dailyrewards.js).
 *
 * Owner: "a layered system: a small reward just for logging in, daily
 * quests that get people playing, and both feeding a longer progression
 * track like a battle pass" -- then: "I'd rather have it be something like a
 * free daily spin from the gambling building where you can win quite good
 * rewards but it's rare" -- and its twist: "Your first spin is for a lump
 * sum award.  You have a rare chance at a high lump sum in gold.  Then you
 * have the option of spinning it for double or nothing at 50% odds and that
 * continues on."
 *
 *   1. The pure helpers: day numbers, seasons, the spin's prizes and odds.
 *   2. The join: both caps advertised, the state sent after player_state,
 *      nothing paid by the login itself.
 *   3. The free spin: a lump sum as a pot, double or nothing (won, lost),
 *      take it (paid once), once a day, bonus spins, refusals, a replayed
 *      opId, the cooldown, the house limit, the streak's bonus, a pot left
 *      open at midnight PAID, the kill switch holding a pot open.
 *   4. The daily quests: locked until tut_1, three for everyone (fights
 *      only without tools), counted by kind / land / skill, paid once, the
 *      all-three bonus, the reroll, the kill switch, junk input.
 *   5. The season: stars, claims (one, all, not reached, twice), spins and
 *      freezes as grants, the overflow, the season's end mailing what was
 *      never claimed.
 *   6. Saving: counted progress flushed by the tick and on close; a player
 *      online across midnight turns over to the new day.
 *   7. The wire: both server types privileged; a forged one is not relayed.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import {
  DAILY, dayOf, dayOfPeriod, seasonOf, seasonEndDay, spinMult, spinLump, spinPick, tierNeed,
} from '../src/dailyrewards.js';

function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const DAY = 86400000;
const state = makeState();
const room = new GameRoom(state, mockEnv);
/* A fixed clock in the PAST (v2.3.1155: a future-ish timestamp the real
   clock can catch up with is a time bomb in an opId-deduped system). */
let NOW = Date.UTC(2026, 0, 14, 12, 0, 0);
room._drNow = () => NOW;
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const settle = () => new Promise((r) => setTimeout(r, 10));
const send = async (ws, type, payload) => {
  await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));
  await settle();   /* the router fires the handler without awaiting it */
};
const lastState = (ws) => { const all = ws.sent.filter((m) => m.type === 'rewards_state'); return all.length ? all[all.length - 1].payload : null; };
/* Force the next rolls of the spin's dice. */
const force = (...vals) => { let i = 0; room._drRand = () => (i < vals.length ? vals[i++] : 0.99); };
const PRIZES = DAILY.SPIN.PRIZES;
const W_TOTAL = PRIZES.reduce((t, p) => t + p.w, 0);
/* a roll that lands on prize i (the middle of its slice of the weights) */
const AT = (i) => (PRIZES.slice(0, i).reduce((t, p) => t + p.w, 0) + PRIZES[i].w / 2) / W_TOTAL;
const HEADS = 0.1;   /* a double won */
const TAILS = 0.9;   /* a double lost */
const spinNews = (w) => w.sent.filter((m) => m.type === 'rewards_state' && m.payload.news && m.payload.news.kind === 'spin').map((m) => m.payload.news);
const paidSpin = (w) => w.sent.filter((m) => m.type === 'inbox_delivered').flatMap((m) => m.payload.entries || []).filter((e) => e.source === 'dailyspin');

// ── 1. The pure helpers ──
{
  check('dayOf is the UTC day number', dayOf(Date.UTC(1970, 0, 2, 5)) === 1 && dayOf(Date.UTC(2026, 9, 6, 23, 59)) === dayOf(Date.UTC(2026, 9, 6, 0, 0)));
  check('dayOfPeriod reads cadence\'s yyyymmdd', dayOfPeriod(20261006) === dayOf(Date.UTC(2026, 9, 6, 12)) && dayOfPeriod(0) === 0);
  const E = DAILY.SEASON.EPOCH_DAY;
  check('the epoch is a Monday', new Date(E * DAY).getUTCDay() === 1, new Date(E * DAY).toISOString());
  check('everything before the epoch is season 1, and season 1 is 28 days past it',
    seasonOf(E - 400) === 1 && seasonOf(E) === 1 && seasonOf(E + 27) === 1 && seasonOf(E + 28) === 2 && seasonOf(E + 56) === 3);
  check('a season ends 28 days after its start', seasonEndDay(1) === E + 28 && seasonEndDay(2) === E + 56);
  check('the streak\'s bonus: x1 at a 1-day streak, +10% a day, capped at 7 days (x1.6)',
    spinMult(1) === 1 && spinMult(2) === 1.1 && spinMult(7) === 1.6 && spinMult(30) === 1.6 && spinMult(0) === 1);
  check('a lump sum is the prize x the bonus, to the nearest 5', spinLump(25, 1) === 25 && spinLump(25, 1.1) === 30 && spinLump(25, 1.6) === 40
    && spinLump(10000, 1.6) === 16000 && spinLump(0, 1) === 5);
  check('the prizes rise, and each has a weight', PRIZES.length === 8 && PRIZES.every((p, i) => p.w > 0 && (i === 0 || p.coins > PRIZES[i - 1].coins)));
  check('rare and high: the jackpot (10,000) is 1 in 1,000, a thousand or more 1 in 25',
    PRIZES[7].coins === 10000 && PRIZES[7].w / W_TOTAL === 0.001 && PRIZES.filter((p) => p.coins >= 1000).reduce((t, p) => t + p.w, 0) / W_TOTAL === 0.04);
  check('spinPick reads the weights', spinPick(0) === 0 && spinPick(AT(3)) === 3 && spinPick(0.9995) === 7 && spinPick(0.99999999) === 7
    && PRIZES.every((p, i) => spinPick(AT(i)) === i));
  const ev = PRIZES.reduce((t, p) => t + p.coins * p.w, 0) / W_TOTAL;
  check('a spin pays 144 on average (the economy\'s size, v2.3.3140)', ev === 144, ev);
  check('double or nothing is the owner\'s fair coin, under a house limit', DAILY.SPIN.DOUBLE_CHANCE === 0.5
    && DAILY.SPIN.POT_MAX === 100000 && spinLump(PRIZES[7].coins, spinMult(7)) * 2 <= DAILY.SPIN.POT_MAX);
  check('a tier needs its stars', tierNeed(1) === DAILY.SEASON.STARS_PER_TIER && tierNeed(25) === 25 * DAILY.SEASON.STARS_PER_TIER);
  check('every tier pays something', DAILY.SEASON.TIERS.every((t) => Array.isArray(t) && t.length > 0
    && t.every((g) => ['coins', 'item', 'spin', 'freeze'].includes(g.kind) && g.n > 0)));
  check('the kill switches pass the admin flags route (TRAPS §117)', /^[a-z0-9_]{1,32}$/.test('dailyspin') && /^[a-z0-9_]{1,32}$/.test('dailyquests'));
}

// ── 2. The join ──
let ws = fakeWs();
await join(ws, 'bp_dr_a');
const ps = () => room.playerState['bp_dr_a'];
{
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.dailyspin and caps.dailyquests are advertised', !!sync && sync.caps.dailyspin === true && sync.caps.dailyquests === true);
  const iState = ws.sent.findIndex((m) => m.type === 'rewards_state');
  const iPs = ws.sent.findIndex((m) => m.type === 'player_state');
  check('rewards_state is sent on join, after player_state', iState > 0 && iPs >= 0 && iState > iPs, { iState, iPs });
  const st = lastState(ws);
  check('...a free spin is ready, nothing open, the wheel\'s prizes at a 1-day streak',
    !!st && st.spin.on && st.spin.ready === 1 && st.spin.open === 0 && st.spin.pot === 0 && st.spin.mult === 1
    && st.spin.prizes.length === PRIZES.length && st.spin.prizes.every((p, i) => p.c === PRIZES[i].coins && p.w === PRIZES[i].w)
    && st.spin.limit === DAILY.SPIN.POT_MAX && st.spin.chance === 0.5, st && st.spin);
  check('...the daily quests are locked until the first quest is handed in', !!st && st.dq.locked === true && st.dq.list.length === 0, st && st.dq);
  check('...and the season is the clock\'s', !!st && st.season.s === seasonOf(dayOf(NOW)) && st.season.st === 0 && st.season.tiers.length === DAILY.SEASON.TIERS.length);
  check('the login itself paid nothing', !ws.sent.some((m) => m.type === 'inbox_delivered' && m.payload.entries.some((e) => e.source === 'daily')));
}

// ── 3. The free spin: a lump sum, then double or nothing ──
{
  const c0 = ps().coins || 0;
  force(AT(2));
  ws.sent.length = 0;
  await send(ws, 'daily_spin', { act: 'spin', opId: 's1' });
  let st = lastState(ws);
  check('the free spin lands on a lump sum (100): the pot, open, nothing paid yet',
    !!st && st.news.act === 'spin' && st.news.started === 'free' && st.news.i === 2 && st.news.lump === 100 && st.news.pot === 100
    && st.news.jackpot === false && st.spin.open === 1 && st.spin.pot === 100 && st.spin.i === 2 && st.spin.canDouble === 1
    && ps().coins === c0 && paidSpin(ws).length === 0, st && { news: st.news, spin: st.spin });
  check('...and the day\'s free spin put a star on the season', st.season.st === DAILY.SEASON.SPIN_STARS, st.season);
  NOW += 1000;
  force(HEADS);
  await send(ws, 'daily_spin', { act: 'double', opId: 's2' });
  st = lastState(ws);
  check('double or nothing, won: the pot doubles (200), still nothing paid',
    st.news.act === 'double' && st.news.won === true && st.news.k === 1 && st.news.pot === 200
    && st.spin.pot === 200 && st.spin.k === 1 && st.spin.open === 1 && ps().coins === c0, { news: st.news, spin: st.spin });
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'collect', opId: 's3' });
  st = lastState(ws);
  check('take it: the pot is paid and the run is over', st.news.act === 'collect' && st.news.paid === 200 && st.news.k === 1
    && ps().coins - c0 === 200 && st.spin.open === 0 && st.spin.pot === 0, { news: st.news, got: ps().coins - c0 });
  const credits = paidSpin(ws);
  check('...as one credit of source dailyspin (the game keeps it out of chat)', credits.length === 1 && credits[0].payload.amount === 200, credits);
  check('...and today\'s free spin is used', st.spin.ready === 0, st.spin);
  NOW += 1000;
  force(AT(0));
  await send(ws, 'daily_spin', { act: 'spin', opId: 's4' });
  check('no second free spin the same day (and no bonus spin banked)', lastState(ws).news.refused === 'none' && ps().coins === c0 + 200, lastState(ws).news);
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'collect', opId: 's5' });
  check('nothing open: Take is refused', lastState(ws).news.refused === 'closed' && ps().coins === c0 + 200, lastState(ws).news);
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'double', opId: 's6' });
  check('nothing open: Double is refused', lastState(ws).news.refused === 'closed', lastState(ws).news);
  NOW += 1000;
  await send(ws, 'daily_spin', { opId: 's7' });
  check('no act named is a spin', lastState(ws).news.act === 'spin' && lastState(ws).news.refused === 'none', lastState(ws).news);
}
{
  /* a bonus spin, and a double lost */
  const rec = room._drMap().get('bp_dr_a');
  rec.sp.extra = 1;
  const c0 = ps().coins;
  const stars0 = rec.se.st;
  force(AT(3), HEADS, TAILS);
  ws.sent.length = 0;
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'spin', opId: 'l1' });
  let st = lastState(ws);
  check('a bonus spin starts a run of its own (200)', st.news.started === 'bonus' && st.news.pot === 200 && rec.sp.extra === 0, st.news);
  check('...and puts no star on the season (the free spin\'s alone)', rec.se.st === stars0, rec.se);
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'spin', opId: 'l1b' });
  check('a new spin while a pot is open is refused (take it or double it first)', lastState(ws).news.refused === 'open' && rec.sp.pot === 200, lastState(ws).news);
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'double', opId: 'l2' });
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'double', opId: 'l3' });
  st = lastState(ws);
  check('double or nothing, lost: the pot (400) is gone, nothing paid', st.news.won === false && st.news.lost === 400 && st.news.pot === 0
    && st.news.k === 1 && st.spin.open === 0 && st.spin.pot === 0 && ps().coins === c0 && paidSpin(ws).length === 0, { news: st.news, spin: st.spin });
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'collect', opId: 'l4' });
  check('...and there is nothing left to take', lastState(ws).news.refused === 'closed' && ps().coins === c0);
}
{
  /* a replayed opId acts once; the cooldown drops an act too soon */
  const rec = room._drMap().get('bp_dr_a');
  rec.sp.extra = 2;
  force(AT(0), AT(0));
  NOW += 1000;
  ws.sent.length = 0;
  await send(ws, 'daily_spin', { act: 'spin', opId: 'same' });
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'spin', opId: 'same' });
  const spins = spinNews(ws);
  check('a replayed opId acts once', spins.length === 1 && spins[0].started === 'bonus', spins);
  check('...one bonus spin spent', rec.sp.extra === 1 && rec.sp.open === 1, rec.sp);
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'collect', opId: 'real' });   /* a real act ... */
  ws.sent.length = 0;
  NOW += 100;                                                       /* ... and one inside the cooldown */
  await send(ws, 'daily_spin', { act: 'spin', opId: 'quick' });
  check('an act inside the cooldown is dropped', !ws.sent.some((m) => m.type === 'rewards_state'));
}
{
  /* the jackpot, and the house limit: a pot that cannot double again is paid by itself */
  const rec = room._drMap().get('bp_dr_a');
  rec.sp.open = 0; rec.sp.extra = 1;
  const c0 = ps().coins;
  force(AT(7), HEADS, HEADS, HEADS, HEADS, HEADS);
  ws.sent.length = 0;
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'spin', opId: 'j0' });
  let st = lastState(ws);
  check('the jackpot: 10,000, flagged for the window', st.news.jackpot === true && st.news.lump === 10000 && st.spin.open === 1, st.news);
  let n = 0;
  while (lastState(ws).spin.open && n < 20) { NOW += 1000; n++; await send(ws, 'daily_spin', { act: 'double', opId: 'j' + n }); }
  st = lastState(ws);
  check('three doubles reach 80,000, which cannot double again (160,000 > the limit): paid by itself',
    n === 3 && st.news.won === true && st.news.top === true && st.news.pot === 80000 && st.news.paid === 80000
    && ps().coins - c0 === 80000 && st.spin.open === 0, { n, news: st.news, got: ps().coins - c0 });
  /* a pot over the line can only come from a stored record (the limit
     lowered by a deploy): it is refused a double, and still taken */
  rec.sp.open = 1; rec.sp.pot = 60000; rec.sp.k = 0; rec.sp.run = 'big';
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'double', opId: 'j-over' });
  check('a pot past the limit is refused a double', lastState(ws).news.refused === 'limit' && rec.sp.pot === 60000 && lastState(ws).spin.canDouble === 0, lastState(ws).news);
  NOW += 1000;
  const c1 = ps().coins;
  await send(ws, 'daily_spin', { act: 'collect', opId: 'j-take' });
  check('...and taken as ever', lastState(ws).news.paid === 60000 && ps().coins - c1 === 60000);
  /* the same run can never pay twice, whatever the record says (a crash
     between the credit and the save) */
  rec.sp.open = 1; rec.sp.pot = 60000; rec.sp.run = 'big';
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'collect', opId: 'j-again' });
  check('a run pays once: its pot opId is the oplog\'s', lastState(ws).news.paid === 0 && ps().coins - c1 === 60000 && rec.sp.open === 0, lastState(ws).news);
}
{
  /* the streak raises the lump sum; a new day frees the spin and PAYS a pot left open */
  await room._cadenceSet('login', 'bp_dr_a', { period: room._cadencePeriodDaily(NOW), streak: 6, fz: 0 });
  const rec = room._drMap().get('bp_dr_a');
  rec.sp.open = 1; rec.sp.pot = 400; rec.sp.k = 2; rec.sp.i = 2; rec.sp.run = 'left-open';   /* a pot left open at midnight */
  const c0 = ps().coins;
  NOW += DAY;
  force(AT(1));
  ws.sent.length = 0;
  await send(ws, 'daily_spin', { act: 'spin', opId: 'nextday' });
  const st = lastState(ws);
  const credits = paidSpin(ws);
  check('a new day PAYS the pot left open (400), never loses it', credits.length === 1 && credits[0].payload.amount === 400 && ps().coins - c0 === 400, { credits, got: ps().coins - c0 });
  check('...and the next state says so (kept), once', st.kept === 400 && ws.sent.filter((m) => m.type === 'rewards_state' && m.payload.kept).length === 1, { kept: st.kept });
  check('...then the free spin again, the streak advanced (7 days) and the lump sum with it (50 x 1.6 = 80)',
    st.news.started === 'free' && st.news.mult === 1.6 && st.news.pot === 80 && st.streak.n === 7 && st.spin.pot === 80, { news: st.news, streak: st.streak });
  check('...the wheel shows today\'s prizes (x1.6)', st.spin.mult === 1.6 && st.spin.prizes[0].c === 40 && st.spin.prizes[7].c === 16000, st.spin.prizes);
  check('...a 7-day streak earns a freeze', st.streak.fz === 1, st.streak);
}
{
  /* the kill switch: no act at all, and a pot open at the day's end WAITS */
  room._liveFlags = { ...(room._liveFlags || {}), dailyspin: false };
  const rec = room._drMap().get('bp_dr_a');
  rec.sp.extra = 3;
  const c0 = ps().coins;
  ws.sent.length = 0;
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'collect', opId: 'off' });
  check('switched off: no act, nothing paid, the bonus spins wait', !ws.sent.some((m) => m.type === 'rewards_state') && ps().coins === c0 && rec.sp.extra === 3);
  NOW += DAY;
  await send(ws, 'rewards_get', {});
  check('...a pot open at the day\'s end is NOT paid while switched off: it waits, open', rec.sp.open === 1 && rec.sp.pot === 80
    && ps().coins === c0 && lastState(ws).spin.open === 1 && lastState(ws).spin.on === false, { sp: rec.sp, spin: lastState(ws).spin });
  const ws2 = fakeWs();
  await join(ws2, 'bp_dr_off');
  const sync = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is told the spin is off', !!sync && sync.caps.dailyspin === false);
  room._liveFlags = { ...(room._liveFlags || {}), dailyspin: true };
  NOW += 1000;
  await send(ws, 'daily_spin', { act: 'collect', opId: 'back-on' });
  check('switched back on: the pot that waited is taken as ever', lastState(ws).news.paid === 80 && ps().coins === c0 + 80 && rec.sp.open === 0, lastState(ws).news);
}

// ── 4. The daily quests ──
{
  /* the unlock, mid-session: handing in tut_1 */
  ps()._quests = Object.create(null);
  ps()._quests.tut_1 = 'turnedIn';
  ws.sent.length = 0;
  await room._drOnQuestTurnIn('bp_dr_a', 'tut_1');
  const st = lastState(ws);
  check('handing in the first quest rolls three daily quests at once', !!st && st.dq.locked === false && st.dq.list.length === 3 && st.news.kind === 'unlocked', st && st.dq);
  check('...a player with no tools gets fights only, never the same one twice',
    st.dq.list.every((q) => q.t === 'kill' || q.t === 'kill_land')
    && new Set(st.dq.list.map((q) => q.t + ':' + q.p)).size === 3, st.dq.list);
  check('...and every kind comes before a repeat: "defeat N" and at most two lands', st.dq.list.some((q) => q.t === 'kill')
    && st.dq.list.filter((q) => q.t === 'kill_land').length <= 2, st.dq.list);
  let ok3 = true;
  for (let d = 0; d < 40; d++) {
    const l = room._dqRoll('bp_dr_a', dayOf(NOW) + 100 + d);
    if (!(l.length === 3 && l.some((q) => q.t === 'kill') && l.filter((q) => q.t === 'kill_land').length === 2)) { ok3 = false; break; }
  }
  check('...on every day, for a player with no tools', ok3);
  const lands = st.dq.list.filter((q) => q.t === 'kill_land').map((q) => q.p);
  check('...a land quest names a real land', lands.every((p) => ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'].includes(p)), lands);
}
{
  /* a fresh day, with tools: a gather quest appears; the roll is a pure
     function of (player, day) */
  ps().inventory = { ...(ps().inventory || {}), mining_pickaxe: 1, woodcutting_axe: 1, fishing_pole: 1 };
  const day = dayOf(NOW) + 1;
  const a = room._dqRoll('bp_dr_a', day);
  const b = room._dqRoll('bp_dr_a', day);
  check('with tools the day has a fight and a gather', a.length === 3 && a.some((q) => DAILY.QUESTS.TEMPLATES[q.t].pool === 'fight')
    && a.some((q) => DAILY.QUESTS.TEMPLATES[q.t].pool === 'gather'), a);
  check('the same player and day roll the same three', JSON.stringify(a) === JSON.stringify(b));
  let differs = false;
  for (let d = 1; d < 30 && !differs; d++) differs = JSON.stringify(room._dqRoll('bp_dr_a', day + d)) !== JSON.stringify(a);
  check('...and another day rolls others', differs);
}
{
  /* counting: set a known board, then signal */
  const rec = room._drMap().get('bp_dr_a');
  rec.dq.list = [
    { t: 'kill', p: null, g: 3, n: 0, d: 0, c: 60 },
    { t: 'kill_land', p: 'frost', g: 2, n: 0, d: 0, c: 70 },
    { t: 'mine', p: null, g: 4, n: 0, d: 0, c: 60 },
  ];
  rec.dq.all = 0;
  const st0 = rec.se.st;
  const c0 = ps().coins;
  ws.sent.length = 0;
  room._drSignal('bp_dr_a', 'kill', { home: 'ember' }, 1);
  check('a kill counts for "defeat N" but not for another land\'s quest', rec.dq.list[0].n === 1 && rec.dq.list[1].n === 0);
  check('...and its count is sent', ws.sent.some((m) => m.type === 'daily_progress' && m.payload.i === 0 && m.payload.n === 1));
  room._drSignal('bp_dr_a', 'kill', { home: 'frost' }, 1);
  check('a Frost Ridge kill counts for both', rec.dq.list[0].n === 2 && rec.dq.list[1].n === 1);
  room._drSignal('bp_dr_a', 'gather', 'woodcutting', 1);
  check('a log is not ore', rec.dq.list[2].n === 0);
  room._drSignal('bp_dr_a', 'gather', 'mining', 2);
  check('a perfect strike\'s two ores count two', rec.dq.list[2].n === 2);
  room._drSignal('bp_dr_a', 'kill', { home: 'frost' }, 1);
  await settle();
  check('the third kill finishes "defeat 3" and the second Frost Ridge kill finishes that one', rec.dq.list[0].d === 1 && rec.dq.list[1].d === 1);
  const paid = ws.sent.filter((m) => m.type === 'inbox_delivered').flatMap((m) => m.payload.entries).filter((e) => e.source === 'dailyquest');
  check('...each paid once, its own coins', paid.length === 2 && ps().coins - c0 === 60 + 70, { paid, got: ps().coins - c0 });
  check('...each a star on the season', rec.se.st === st0 + 2, rec.se);
  room._drSignal('bp_dr_a', 'kill', { home: 'frost' }, 1);
  await settle();
  check('a finished quest counts no further and pays no more', ps().coins - c0 === 60 + 70 && rec.dq.list[0].n === 3);
  const extra0 = rec.sp.extra;
  ws.sent.length = 0;
  room._drSignal('bp_dr_a', 'gather', 'mining', 3);
  await settle();
  const st = lastState(ws);
  check('the third finishes the day: +1 star and a bonus spin, once', rec.dq.all === 1 && rec.se.st === st0 + 3 + DAILY.QUESTS.ALL.stars
    && rec.sp.extra === Math.min(DAILY.SPIN.EXTRA_MAX, extra0 + DAILY.QUESTS.ALL.spins) && st && st.news.kind === 'daily' && st.news.all
    && st.news.all.spins === 1, { se: rec.se, sp: rec.sp, news: st && st.news });
  check('...the count was capped at the goal', rec.dq.list[2].n === 4);
  room._drSignal('bp_dr_a', 'cook', 'fish_minnow', 1);
  room._drSignal('bp_dr_a', 'smelt', 'bar_copper', 2);
  check('signals no quest asks for change nothing', rec.dq.list.every((q) => q.d === 1));
}
{
  /* the reroll */
  const rec = room._drMap().get('bp_dr_a');
  rec.dq.list = [
    { t: 'kill', p: null, g: 15, n: 0, d: 0, c: 60 },
    { t: 'mine', p: null, g: 10, n: 4, d: 0, c: 60 },
    { t: 'cook', p: null, g: 4, n: 0, d: 1, c: 80 },
  ];
  rec.dq.rr = 0;
  ws.sent.length = 0;
  await send(ws, 'daily_reroll', { i: 2 });
  check('a finished quest cannot be rerolled', rec.dq.list[2].t === 'cook' && rec.dq.rr === 0);
  await send(ws, 'daily_reroll', { i: 1 });
  const nq = rec.dq.list[1];
  check('a reroll swaps the quest for another kind, from zero', nq.t !== 'mine' && nq.t !== 'kill' && nq.t !== 'cook' && nq.n === 0 && rec.dq.rr === 1, rec.dq.list);
  check('...and says so', lastState(ws).news.kind === 'reroll' && lastState(ws).dq.rr === 0);
  const before = JSON.stringify(rec.dq.list);
  await send(ws, 'daily_reroll', { i: 0 });
  check('one free reroll a day', JSON.stringify(rec.dq.list) === before);
  for (const junk of ['__proto__', 'constructor', -1, 3, 1.5, null]) {
    rec.dq.rr = 0;
    const b = JSON.stringify(rec.dq.list);
    await send(ws, 'daily_reroll', { i: junk });
    check('a junk slot rerolls nothing: ' + JSON.stringify(junk), JSON.stringify(rec.dq.list) === b && rec.dq.rr === 0);
  }
}
{
  /* the kill switch */
  room._liveFlags = { ...(room._liveFlags || {}), dailyquests: false };
  const rec = room._drMap().get('bp_dr_a');
  rec.dq.list = [{ t: 'kill', p: null, g: 15, n: 0, d: 0, c: 60 }];
  room._drSignal('bp_dr_a', 'kill', {}, 1);
  check('switched off: nothing is counted', rec.dq.list[0].n === 0);
  rec.dq.rr = 0;
  await send(ws, 'daily_reroll', { i: 0 });
  check('...nothing is rerolled', rec.dq.list[0].t === 'kill' && rec.dq.rr === 0);
  const ws2 = fakeWs();
  await join(ws2, 'bp_dr_off2');
  const sync = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is told the quests are off', !!sync && sync.caps.dailyquests === false);
  room._liveFlags = { ...(room._liveFlags || {}), dailyquests: true };
}

// ── 5. The season ──
{
  const rec = room._drMap().get('bp_dr_a');
  rec.se.st = tierNeed(5);
  rec.se.cl = [];
  const c0 = ps().coins;
  ws.sent.length = 0;
  await send(ws, 'season_claim', { tier: 1 });
  let st = lastState(ws);
  const t1coins = DAILY.SEASON.TIERS[0].filter((g) => g.kind === 'coins').reduce((s, g) => s + g.n, 0);
  check('a reached tier is claimed and paid', !!st && st.news.kind === 'claim' && st.news.tiers.join() === '1' && ps().coins - c0 === t1coins
    && rec.se.cl.includes(1), { news: st && st.news, got: ps().coins - c0 });
  const c1 = ps().coins;
  ws.sent.length = 0;
  await send(ws, 'season_claim', { tier: 1 });
  check('...and only once', ps().coins === c1 && !ws.sent.some((m) => m.type === 'rewards_state'));
  await send(ws, 'season_claim', { tier: 6 });
  check('a tier not reached cannot be claimed', !rec.se.cl.includes(6) && ps().coins === c1);
  for (const junk of ['__proto__', 'constructor', 0, 99, -3, 2.5, null]) {
    const b = JSON.stringify(rec.se.cl);
    await send(ws, 'season_claim', { tier: junk });
    check('a junk tier claims nothing: ' + JSON.stringify(junk), JSON.stringify(rec.se.cl) === b);
  }
  const spins0 = rec.sp.extra;
  ws.sent.length = 0;
  await send(ws, 'season_claim', { all: true });
  st = lastState(ws);
  check('"claim all" takes every reached tier left (2-5)', st.news.tiers.join() === '2,3,4,5' && [1, 2, 3, 4, 5].every((t) => rec.se.cl.includes(t)), st.news);
  const spinsIn = [2, 3, 4, 5].flatMap((t) => DAILY.SEASON.TIERS[t - 1]).filter((g) => g.kind === 'spin').reduce((s, g) => s + g.n, 0);
  check('...a spin grant banks bonus spins', rec.sp.extra === Math.min(DAILY.SPIN.EXTRA_MAX, spins0 + spinsIn), { extra: rec.sp.extra, spins0, spinsIn });
  const gems = (ps().inventory || {}).rare_gem || 0;
  check('...an item grant lands in the bag', gems >= 1, ps().inventory);
}
{
  /* a freeze grant (tier 7), capped at FREEZE_MAX */
  const rec = room._drMap().get('bp_dr_a');
  await room._cadenceSet('login', 'bp_dr_a', { period: room._cadencePeriodDaily(NOW), streak: 3, fz: 1 });
  rec.se.st = tierNeed(7);
  await send(ws, 'season_claim', { tier: 7 });
  const c = await room._cadenceGet('login', 'bp_dr_a');
  check('a freeze grant adds a freeze', c.fz === 2, c);
  rec.se.cl = rec.se.cl.filter((t) => t !== 7);
  await send(ws, 'season_claim', { tier: 7 });
  check('...never past the cap of ' + DAILY.STREAK.FREEZE_MAX, (await room._cadenceGet('login', 'bp_dr_a')).fz === DAILY.STREAK.FREEZE_MAX);
}
{
  /* the overflow: past the last tier, a bonus spin every OVERFLOW_STARS */
  const rec = room._drMap().get('bp_dr_a');
  rec.se.st = tierNeed(DAILY.SEASON.TIERS.length);
  rec.se.ov = 0;
  rec.sp.extra = 0;
  room._seAddStars(rec, DAILY.SEASON.OVERFLOW_STARS * 2 + 1);
  check('stars past the last tier pay a bonus spin every ' + DAILY.SEASON.OVERFLOW_STARS, rec.se.ov === 2 && rec.sp.extra === 2, rec);
  room._seAddStars(rec, 1);
  check('...each only once', rec.se.ov === 2 && rec.sp.extra === 2);
}
{
  /* the season ends while the player is away: what they reached and never
     claimed is MAILED at their next join, and the new season starts at 0 */
  const rec = room._drMap().get('bp_dr_a');
  rec.se.st = tierNeed(10);
  rec.se.cl = [1, 2, 3, 4, 5, 6, 7];
  await room._drSave('bp_dr_a');
  const s0 = rec.se.s;
  const wsOld = ws;
  await room.webSocketClose(wsOld);
  check('a disconnect forgets the cached record', !room._drMap().has('bp_dr_a'));
  NOW = seasonEndDay(s0) * DAY + 3 * 3600000;   /* 3 a.m. on the next season's first day */
  ws = fakeWs();
  const c0 = ps() ? ps().coins : null;
  await join(ws, 'bp_dr_a');
  const st = lastState(ws);
  check('the first state after the join says the season ended and what it mailed (8, 9, 10)',
    !!st && st.news && st.news.kind === 'season_end' && st.news.s === s0 && st.news.mailed.join() === '8,9,10', st && st.news);
  const mail = ws.sent.filter((m) => m.type === 'inbox_delivered').flatMap((m) => m.payload.entries).filter((e) => e.source === 'season');
  const coinsMailed = [8, 9, 10].flatMap((t) => DAILY.SEASON.TIERS[t - 1]).filter((g) => g.kind === 'coins').reduce((s, g) => s + g.n, 0);
  check('...its coins and items arrived (online, so straight into the bag)', mail.length >= 3
    && mail.filter((e) => e.kind === 'gold').reduce((s, e) => s + e.payload.amount, 0) === coinsMailed, mail);
  check('...and the new season starts from zero', st.season.s === s0 + 1 && st.season.st > 0 === false && st.season.cl.length === 0, st.season);
  void c0;
  /* the same season close can never pay twice: the opIds are the claim's */
  const rec2 = room._drMap().get('bp_dr_a');
  rec2.se = { s: s0, st: tierNeed(10), cl: [1, 2, 3, 4, 5, 6, 7], ov: 0 };
  const coins1 = ps().coins;
  await room._seClose('bp_dr_a', rec2);
  check('a second close of the same season pays nothing (the opIds stand)', ps().coins === coins1);
}

// ── 6. Saving and the day turning over ──
{
  const rec = room._drMap().get('bp_dr_a');
  ps()._quests = Object.create(null);
  ps()._quests.tut_1 = 'turnedIn';
  rec.dq.list = [{ t: 'kill', p: null, g: 15, n: 0, d: 0, c: 60 }, { t: 'kill_land', p: 'sky', g: 10, n: 0, d: 0, c: 70 }, { t: 'kill_land', p: 'mist', g: 10, n: 0, d: 0, c: 70 }];
  await room._drSave('bp_dr_a');
  room._drSignal('bp_dr_a', 'kill', {}, 1);
  check('a count marks the record dirty, not saved', room._drDirtyMap().has('bp_dr_a')
    && state._store.get(DAILY.KEY + 'bp_dr_a').dq.list[0].n === 0);
  room.__drLastTick = 0;
  room._drTick(NOW + 1000);
  await settle();
  check('the tick does not write it before SAVE_MS', state._store.get(DAILY.KEY + 'bp_dr_a').dq.list[0].n === 0);
  room.__drLastTick = 0;
  room._drTick(NOW + DAILY.SAVE_MS + 1000);
  await settle();
  check('...and writes it after', state._store.get(DAILY.KEY + 'bp_dr_a').dq.list[0].n === 1 && !room._drDirtyMap().has('bp_dr_a'));
  room._drSignal('bp_dr_a', 'kill', {}, 1);
  await room.webSocketClose(ws);
  check('a disconnect writes what was counted', state._store.get(DAILY.KEY + 'bp_dr_a').dq.list[0].n === 2);
  ws = fakeWs();
  await join(ws, 'bp_dr_a');
  check('...and the next join reads it back', room._drMap().get('bp_dr_a').dq.list[0].n === 2);
}
{
  /* online across midnight: the next tick turns the day over */
  const rec = room._drMap().get('bp_dr_a');
  const day0 = rec.dq.day;
  room.__drLastTick = 0;
  room._drTick(NOW);              /* remembers today */
  NOW += DAY;
  ws.sent.length = 0;
  room.__drLastTick = 0;
  room._drTick(NOW);              /* a new day */
  await settle(); await settle();
  const st = lastState(ws);
  check('a player online across midnight gets the new day: three new quests and a free spin',
    rec.dq.day === day0 + 1 && rec.dq.list.length === 3 && rec.dq.list.every((q) => q.n === 0) && !!st && st.news.kind === 'newday' && st.spin.ready === 1,
    { day: rec.dq.day, day0, news: st && st.news });
  const c = await room._cadenceGet('login', 'bp_dr_a');
  check('...and the streak advanced as a login would have', c && c.period === room._cadencePeriodDaily(NOW), c);
}
{
  /* a pot open across midnight, online: the tick's new day pays it */
  const rec = room._drMap().get('bp_dr_a');
  rec.sp.open = 1; rec.sp.pot = 250; rec.sp.k = 1; rec.sp.run = 'midnight';
  const c0 = ps().coins;
  room.__drLastTick = 0;
  room._drTick(NOW);
  NOW += DAY;
  ws.sent.length = 0;
  room.__drLastTick = 0;
  room._drTick(NOW);
  await settle(); await settle();
  check('a pot still open at midnight is paid by the new day, online too', ps().coins - c0 === 250 && rec.sp.open === 0 && paidSpin(ws).length === 1
    && lastState(ws).spin.ready === 1, { got: ps().coins - c0, sp: rec.sp });
}

// ── 7. The wire ──
{
  check('rewards_state and daily_progress are privileged', PRIVILEGED_EVENTS.has('rewards_state') && PRIVILEGED_EVENTS.has('daily_progress'));
  const other = fakeWs();
  await join(other, 'bp_dr_b');
  other.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'rewards_state', payload: { spin: { ready: 1 }, news: { kind: 'spin', won: true, paid: 99999 } } }));
  await settle();
  check('a forged rewards_state is not relayed to anyone', !other.sent.some((m) => m.type === 'rewards_state'));
  ws.sent.length = 0;
  await send(ws, 'rewards_get', {});
  check('rewards_get answers with the state', !!lastState(ws));
}

// ── 8. The operator's test hook (/dev/daily) ──
{
  const rec = room._drMap().get('bp_dr_a');
  rec.dq.list = [{ t: 'kill', p: null, g: 15, n: 0, d: 0, c: 100 }, { t: 'chop', p: null, g: 10, n: 0, d: 0, c: 100 }, { t: 'smelt', p: null, g: 2, n: 0, d: 0, c: 150 }];
  rec.dq.all = 0;
  const st0 = rec.se.st, ex0 = rec.sp.extra, c0 = ps().coins;
  const r = await room._drDev('bp_dr_a', { stars: 4, spins: 1, quest: [0, 999] });
  await settle();
  check('the dev hook adds stars and bonus spins', r.ok && rec.se.st === st0 + 4 + DAILY.QUESTS.STARS && rec.sp.extra === Math.min(DAILY.SPIN.EXTRA_MAX, ex0 + 1), { r, se: rec.se });
  check('...and finishing a quest through it PAYS it, as a kill would', rec.dq.list[0].d === 1 && ps().coins - c0 === 100, { got: ps().coins - c0 });
  const off = await room._drDev('bp_nobody', { stars: 1 });
  check('...an offline id is refused', off.ok === false);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall daily rewards checks passed');
process.exit(failures ? 1 : 0);
