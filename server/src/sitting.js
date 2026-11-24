/* ═══ v2.3.6481: THE SITTING'S CARD (grand plan step 10.2; card WHO PR 2) ═══
 *
 * One visit of one character, measured by the server and kept with the
 * character.  Designed once in docs/SHAPES.md: part 2 (`stint`, "What a
 * sitting is") and part 7 (the card's row, and "Open", ruled 5083: the card
 * goes INSIDE `_econ`, under keys of its own -- no third exception to the
 * handoff's rule 1).  This file is the card's ONE writer: every other file
 * hands it facts and writes no field of the card itself.
 *
 * WHERE IT LIVES: on the live record's `_econ` (migrations.js ECON, shape
 * ECON_V 2), so it rides `rpg:<pid>`'s own puts -- no new row, no new put,
 * no write a move (cost-guard):
 *   _econ.s    the OPEN card (one array, below), or absent;
 *   _econ.sh   the CLOSED cards, oldest first, the last SIT.KEEP (32: the
 *              owner's yes, call 13 of the plan).
 * Its counters are counted in memory and reach storage with whatever save
 * the record makes next (a paced tap, the regen drain, a gold move, the
 * close flush): so a card is exact up to the record's last save, and a card
 * cut by a deploy or a crash is "closed at the last moment it was saved"
 * (SHAPES part 2) -- at the next join (sitOpen).
 *
 * THE CARD, a fixed array (about 120 bytes as JSON; SIT.COL names each):
 *   0  t    the sitting's id, `stint`: the worker's clock in ms at the join
 *           that began it (actor.js stintNext).  Also its "when".
 *   1  u    the last moment it was touched (an activity, a join, a leave)
 *   2  a    active seconds: the gaps between activities no longer than
 *           SIT.IDLE_MS, summed
 *   3  g    the longest gap, seconds (between touches: a reconnect's too)
 *   4  n    the network: the socket's AS number (request.cf.asn), 0 unknown
 *   5  b    the build the phone's report named (report.js), '' none yet
 *   6  mv   moves judged
 *   7  mo   ...of them, over the move budget (movement.js)
 *   8  hc   hits claimed on monsters
 *   9  hl   ...landed
 *  10  hr   ...refused, by reason: [noWeapon, far, rate, shot, swing]
 *           (SIT.REFUSALS: hitproof.js's names)
 *  11  gd   gold by road class, signed net whole coins:
 *           [mint, burn, move, escrow] (gold.js CLASSES)
 *  12  hh   the hours of the day played: bit h set for UTC hour h
 *  13  sf   the report's `soft` (a software chip): 1, 0, or -1 unknown
 *  14  se   the report's `seen` seconds, summed
 *  15  dr   the report's `drawn` frames, summed
 *
 * A SITTING SPANS RECONNECTS AND DEPLOYS (rule 5: a session is a sitting,
 * not a socket).  At a join (sitOpen): an open card touched less than
 * SIT.GAP_MS ago goes on, with the same `stint` (the actor is made with it:
 * actor.js actorSocket); an older one is closed (onto `sh`) and a new one
 * opened.  Only the card the record's LATEST join took counts (v2.3.6481,
 * sitting 59: a join with `sitting: false` takes none, so the flag thrown
 * on mid-sitting never reopens a week-old card; open(), sitForget).
 * SIT.GAP_MS is the anti-bot's break, five quiet minutes
 * (botsig.js BOTSIG.BREAK_MS; sitting.test holds the two equal: this file
 * imports nothing, so the doors that hand it facts can import it).
 *
 * WHAT HANDS IT FACTS, one call each, memory only:
 *   join.js     sitOpen (the card opened or carried on; its network)
 *   leave.js    sitTouch (the leave's moment: the gap to a reconnect)
 *   movement.js sitMove (a judged move; over the budget or not)
 *   combat.js / hitproof.js  sitHit (claimed, landed, refused by reason)
 *   gold.js     sitGold (every road's class, beside the `_econ` count)
 *   report.js   sitReport (soft, build, seen, drawn): NOT HANDED YET.
 *               report.js is card PH's while it mends #2279 (the
 *               orchestrator, 2026-11-23); until its one call lands, those
 *               four columns stay at their blanks (-1, '', 0, 0).
 * The three calls outside this card's files (movement.js, combat.js with
 * hitproof.js, gold.js) are the orchestrator's yes of 2026-11-23: memory
 * only, deciding nothing (sitting.test §9: a move's, a hit's and the
 * purse's outcome the same with `sitting: false`).  `moves` are the judged
 * ones: with `movebudget: false` (the old bound) none are counted.  Gold by
 * class is what the door books (gold.js econGold): a payout by the mail
 * counts under its road's class and its minted part under `mint` too.
 *
 * THE KILL SWITCH `sitting: false` in the live flags (sitOff): nothing is
 * opened, closed or counted, the cap `sitting` is not advertised, and the
 * actor's `stint` is one a socket again (as v2.3.6480).  What a record holds
 * stays as it is (econClean keeps it), so throwing it back on goes on from
 * there: an open card older than the gap is closed at the next join.
 *
 * Nothing a player sees changes.  No `qa` kind (actor.js: no proof exists).
 * Suite: server/test/sitting.test.mjs.  The spec is this header and SHAPES
 * parts 2 and 7. */

export const SIT = Object.freeze({
  GAP_MS: 300000,       /* five quiet minutes end a sitting: botsig.js BOTSIG.BREAK_MS */
  IDLE_MS: 60000,       /* a gap between activities longer than this is not active time */
  KEEP: 32,             /* closed cards a character keeps (the owner's call 13) */
  LEN: 16,              /* the card's columns */
  BUILD_MAX: 24,        /* the build's characters kept */
  NUM_MAX: 1e15,
  COL: Object.freeze({ t: 0, u: 1, a: 2, g: 3, n: 4, b: 5, mv: 6, mo: 7, hc: 8, hl: 9, hr: 10, gd: 11, hh: 12, sf: 13, se: 14, dr: 15 }),
  REFUSALS: Object.freeze(['noWeapon', 'far', 'rate', 'shot', 'swing']),
  CLASSES: Object.freeze(['mint', 'burn', 'move', 'escrow']),
});
const C = SIT.COL;

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const fin = (v) => typeof v === 'number' && Number.isFinite(v);
const num = (v) => (fin(v) ? Math.max(-SIT.NUM_MAX, Math.min(SIT.NUM_MAX, Math.round(v))) : 0);
const pos = (v) => Math.max(0, num(v));
const zeros = (n) => { const a = []; for (let i = 0; i < n; i++) a.push(0); return a; };

/** `sitting: false` in the live flags. */
export function sitOff(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && own(f, 'sitting') && f.sitting === false);
}

/** A new open card: its stint (the worker's clock), its network. */
export function sitBlank(begun, asn) {
  const s = zeros(SIT.LEN);
  s[C.t] = pos(begun);
  s[C.u] = s[C.t];
  s[C.n] = fin(asn) && asn > 0 ? Math.floor(asn) : 0;
  s[C.b] = '';
  s[C.hr] = zeros(SIT.REFUSALS.length);
  s[C.gd] = zeros(SIT.CLASSES.length);
  s[C.sf] = -1;
  return s;
}

/** One card made safe (a stored one, or a live one at the save): every
 *  column its type, numbers finite and bounded, the build short ASCII.  null
 *  for what is not a card. */
export function sitOneClean(raw) {
  if (!Array.isArray(raw) || raw.length < SIT.LEN) return null;
  const t = pos(raw[C.t]);
  if (!t) return null;
  const s = sitBlank(t, raw[C.n]);
  s[C.u] = Math.max(t, pos(raw[C.u]));
  for (const k of ['a', 'g', 'mv', 'mo', 'hc', 'hl', 'hh', 'se', 'dr']) s[C[k]] = pos(raw[C[k]]);
  s[C.hh] = s[C.hh] & 0xffffff;
  s[C.b] = typeof raw[C.b] === 'string' ? raw[C.b].replace(/[^\x20-\x7e]/g, '').slice(0, SIT.BUILD_MAX) : '';
  const hr = Array.isArray(raw[C.hr]) ? raw[C.hr] : [];
  s[C.hr] = SIT.REFUSALS.map((_, i) => pos(hr[i]));
  const gd = Array.isArray(raw[C.gd]) ? raw[C.gd] : [];
  s[C.gd] = SIT.CLASSES.map((_, i) => num(gd[i]));
  s[C.sf] = raw[C.sf] === 1 || raw[C.sf] === 0 ? raw[C.sf] : -1;
  return s;
}

/** The two keys of `_econ` made safe, onto `out` (migrations.js econClean):
 *  `s` the open card when there is one, `sh` the closed ones (at most KEEP,
 *  the newest kept). */
export function sitCleanInto(out, raw) {
  if (!out || !raw || typeof raw !== 'object') return out;
  const s = sitOneClean(raw.s);
  if (s) out.s = s;
  if (Array.isArray(raw.sh)) {
    const sh = [];
    for (const c of raw.sh.slice(-SIT.KEEP)) { const k = sitOneClean(c); if (k) sh.push(k); }
    if (sh.length) out.sh = sh;
  }
  return out;
}

/* v2.3.6481 (sitting 59's bug): the card each live record's LATEST join
   opened or carried on, in this room (a WeakMap: record -> card).  A record
   can hold an open card its join did not take -- joined with `sitting: false`,
   or a newer `_econ` -- and the flag thrown back on mid-sitting then counted
   moves into a card a week old, never closed.  Only the card in this map
   counts; any other waits for the next join, which closes it (sitOpen). */
function liveMap(room) {
  if (!room || typeof room !== 'object') return null;
  if (!(room._sitLive instanceof WeakMap)) room._sitLive = new WeakMap();
  return room._sitLive;
}

/** At every join, before the card is opened: the record's card counts no
 *  more until sitOpen takes one (join.js; also when it opens nothing). */
export function sitForget(room, rec) {
  const m = liveMap(room);
  if (m && rec && typeof rec === 'object') m.delete(rec);
}

/** v2.3.6484 (sitting 60's review): the flag set through the live flags'
 *  route (liveops.js, its one call).  Thrown OFF, every card the joins took
 *  counts no more: thrown back on with the same socket and no rejoin, the
 *  card went on, the off time its longest gap (a week: g = 604799) and the
 *  moves after it counted into a sitting that had stopped.  The next join
 *  closes it or carries it on (sitOpen), as after a reconnect.  Set on, or
 *  off again, nothing is forgotten (a card counting goes on counting). */
export function sitFlagSet(room) {
  if (sitOff(room)) room._sitLive = new WeakMap();
}

/* the open card of a live record that this room's join took, or null */
function open(room, rec) {
  const e = rec && rec._econ;
  const s = e && typeof e === 'object' && Array.isArray(e.s) && e.s.length >= SIT.LEN ? e.s : null;
  const m = s && liveMap(room);
  return m && m.get(rec) === s ? s : null;
}

/** A touch at `now`: the gap since the last one (the longest kept), active
 *  time when it was short, and the hour of the day when it is an activity. */
function touch(s, now, active) {
  const t = Math.floor(now);
  const d = t - s[C.u];
  if (d > 0) {
    if (d > s[C.g] * 1000) s[C.g] = Math.floor(d / 1000);
    if (active && d <= SIT.IDLE_MS) s[C.a] = s[C.a] + d / 1000;
    s[C.u] = t;
  }
  if (active) s[C.hh] = s[C.hh] | (1 << new Date(t).getUTCHours());
}

/** At the join, once the record is the live one: the open card goes on (a
 *  touch inside the gap) or is closed onto `sh` and a new one opened.
 *  `econ` is the record's `_econ` of THIS worker's shape (join.js checks
 *  its `v`).  Returns the sitting's stint, or null (`sitting: false`, no
 *  record): the actor then takes one of its own. */
export function sitOpen(room, rec, session, now, stintNew) {
  sitForget(room, rec);   /* v2.3.6481: the card the last join took counts no more unless this one takes it */
  if (sitOff(room) || !rec || !rec._econ || typeof rec._econ !== 'object') return null;
  const e = rec._econ;
  const t = Math.floor(fin(now) ? now : Date.now());
  const asn = session && fin(session.asn) ? session.asn : 0;
  const cur = sitOneClean(e.s);
  if (cur && t - cur[C.u] < SIT.GAP_MS) {
    touch(cur, t, false);
    if (asn) cur[C.n] = Math.floor(asn);   /* the network the sitting is on now */
    e.s = cur;
    liveMap(room).set(rec, cur);   /* v2.3.6481: this join's card (open) */
    return cur[C.t];
  }
  if (cur) {
    const sh = Array.isArray(e.sh) ? e.sh : [];
    sh.push(cur);
    e.sh = sh.slice(-SIT.KEEP);
  }
  const begun = typeof stintNew === 'function' ? stintNew(t) : t;   /* actor.js stintNext: the id is made there, once */
  e.s = sitBlank(begun, asn);
  liveMap(room).set(rec, e.s);   /* v2.3.6481: this join's card (open) */
  return e.s[C.t];
}

/** A touch with no activity (the leave): the gap to a reconnect counts. */
export function sitTouch(room, rec, now) {
  if (sitOff(room)) return;
  const s = open(room, rec);
  if (s) touch(s, fin(now) ? now : Date.now(), false);
}

/** A judged move; `over` when the budget could not cover it. */
export function sitMove(room, rec, now, over) {
  if (sitOff(room)) return;
  const s = open(room, rec);
  if (!s) return;
  s[C.mv]++;
  if (over) s[C.mo]++;
  touch(s, fin(now) ? now : Date.now(), true);
}

/** A hit on a monster: `claim`, `landed`, or a refusal's reason
 *  (SIT.REFUSALS); another word counts nothing. */
export function sitHit(room, rec, what, now) {
  if (sitOff(room)) return;
  const s = open(room, rec);
  if (!s) return;
  if (what === 'claim') { s[C.hc]++; touch(s, fin(now) ? now : Date.now(), true); return; }
  if (what === 'landed') { s[C.hl]++; return; }
  const i = SIT.REFUSALS.indexOf(what);
  if (i >= 0) s[C.hr][i]++;
}

/** Gold through the door: its road's class and the purse's difference. */
export function sitGold(room, rec, cls, d) {
  if (sitOff(room) || !fin(d) || !d) return;
  const s = open(room, rec);
  if (!s) return;
  const i = SIT.CLASSES.indexOf(cls);
  if (i >= 0) s[C.gd][i] = num(s[C.gd][i] + d);
}

/** The report's facts for the card (report.js, card A: it writes no field). */
export function sitReport(room, rec, facts) {
  if (sitOff(room) || !facts || typeof facts !== 'object') return;
  const s = open(room, rec);
  if (!s) return;
  if (facts.soft === 0 || facts.soft === 1) s[C.sf] = facts.soft;
  if (typeof facts.build === 'string' && facts.build) s[C.b] = facts.build.replace(/[^\x20-\x7e]/g, '').slice(0, SIT.BUILD_MAX);
  if (fin(facts.seen) && facts.seen > 0) s[C.se] = pos(s[C.se] + facts.seen);
  if (fin(facts.drawn) && facts.drawn > 0) s[C.dr] = pos(s[C.dr] + facts.drawn);
}

/** A card read as words (the Test panel, the owner's cases, the tests). */
export function sitRead(raw) {
  const s = sitOneClean(raw);
  if (!s) return null;
  const o = Object.create(null);
  for (const k of Object.keys(C)) o[k] = s[C[k]];
  o.long = Math.max(0, Math.round((s[C.u] - s[C.t]) / 1000));
  o.a = Math.round(o.a);
  o.hr = Object.fromEntries(SIT.REFUSALS.map((r, i) => [r, s[C.hr][i]]));
  o.gd = Object.fromEntries(SIT.CLASSES.map((r, i) => [r, s[C.gd][i]]));
  return o;
}
