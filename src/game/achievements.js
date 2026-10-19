/* ═══ v2.3.3484: ACHIEVEMENTS, ON THE PHONE ═══
 *
 * The owner, 2026-10-19: "Achievement points are something I'd like in the
 * game. You get it by completing the game. Some of them are through super
 * rare achievements. Although not as rare, an arena winner should be included
 * in that."  Then, to the plan's six questions, "Go recommended on
 * everything" (server/src/achievements.js has the six).
 *
 * THE WORKER DECIDES EVERY ONE (server/src/achievements.js): which you have,
 * when, how many times, and the points.  It says so in one PRIVILEGED event,
 * `achv_state`, at the join (after state_sync, beside codex_state) and on
 * every change:
 *   {unavailable: true}                      the record is locked (a failed
 *                                            read, or a newer worker's)
 *   {v, got: {id: atMs}, n: {id: times},     what you have, and
 *    dg: {land: 1}, ap,                      the worker's AP total,
 *    new?: [id], retro?: [id]}               the one just earned (the moment)
 *                                            or the ones granted quietly at
 *                                            the join for what was done
 *                                            before achievements existed.
 * wsClient.js hands it here from its DIRECT switch -- never processGameEvent,
 * which relayed events reach (the farm_state lesson, v2.3.3127).  This keeps a
 * normalized copy in `S._achv` for the Achievements page (ui/mobile/dash/
 * AchievementsPanel.jsx), the More tile, and the moment:
 *   - a COMMON one is a line in the chat ("Achievement: First Blood (+10
 *     AP)"), the owner's decision 4;
 *   - a RARE, ARENA or SUPER-RARE one is a banner over the world for about
 *     three seconds, with a sound (ui/panels/AchievementBanner.jsx): queued
 *     here as a MOMENT, shown only once the world is in view (a crown paid by
 *     the mail is granted while the loading screen is still up) and its
 *     picture is decoded, so it never pops in half drawn;
 *   - `retro` is ONE quiet line, no banners: "Achievements for what you'd
 *     already done: First Blood, Blooded (+20 AP)".
 * The page's AP total is the WORKER's: `S._achv.ap`, kept fresh by every
 * player_state echo of `achievementPoints` too (noteServerAp), never the
 * phone's own +5 quest prediction (game/quests.js).
 *
 * THE TITLE AND THE RAREST (the plan's Phase 3): achv_state also carries `t`,
 * the title you chose (an achievement you have, only while you have it), and
 * `rarest`, the earned one first in the worker's ACHV.RARITY; your card
 * (ui/panels/playerProfile.js) reads them here as `S._achv.t` and
 * `S._achv.rarest`.  The page's "Use as title" asks the worker
 * (`achv_title {id}`, null to take it off: sendAchvTitle); the worker
 * answers with a fresh achv_state every time -- a change refused past its
 * burst of ten comes back unchanged -- and only that answer moves the page.
 *
 * Every id passes achvById (the phone's table, data/achievements.js): an id
 * this phone does not know (a newer worker added it) is skipped, and every
 * map is built over the table's own ids, null-prototype -- no key the wire
 * chose ever reaches an object (CLAUDE.md, the '__proto__' rule).
 *
 * Relative imports, every one import-free, so node can read this file
 * (server/test/achievements-client.test.mjs). */
import { ACHIEVEMENTS, ACHV_TIERS, ACHV_TOTAL_AP, achvById, achvAp, achvBig } from '../data/achievements.js';
import { chatLogBus } from '../ui/mobile/chatLogBus.js';
import { CODEX_KINDS } from '../data/monsterCodex.js';   /* Know Thy Enemy's nine, for its row's progress */
import { WHEEL_DUNGEON_HOMES } from '../data/wheelDungeons.js';   /* Delver's three (the worker's WHEEL_DUNGEON.LANDS, mirror-audit) */

/* how long a big one's banner is up, and how long a moment may wait for the
   world to come into view before it is let go quietly (the daily toast's
   rule, gameEvents.js: a join can sit behind its loading screen a while) */
export const BANNER_MS = 3200;
export const MOMENT_GIVE_UP_MS = 120000;
/* never a pile of banners: the newest few */
export const MOMENT_MAX = 6;
/* the chat line's colour: the lantern brass's light (LANTERN-SLATE focus) */
export const ACHV_LINE_COLOR = '#EAC675';

const has = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);

function bump(a) { a.rev = (a.rev + 1) % 1e9; }

function achvOf(S) {
  if (!S._achv) {
    S._achv = {
      known: false, unavailable: false,
      got: Object.create(null), n: Object.create(null), dg: Object.create(null),
      t: null, rarest: null, titleAsk: null,
      ap: null, rev: 0, moments: [], showing: null,
    };
  }
  return S._achv;
}

/** Does this worker grant achievements?  (`caps.achievements`, state_sync) */
export function achvLive(S) {
  return !!(S && S._serverCaps && S._serverCaps.achievements);
}

/** An `achv_state` payload made safe: only the table's ids, whole numbers.
 *  Pure -- the node suite reads it. */
export function normalizeAchvState(p) {
  const got = Object.create(null), n = Object.create(null), dg = Object.create(null);
  const src = p && typeof p === 'object' ? p : {};
  if (src.unavailable) return { unavailable: true, got, n, dg, ap: null, fresh: [], retro: [] };
  for (const a of ACHIEVEMENTS) {
    const at = has(src.got, a.id) ? Math.floor(Number(src.got[a.id])) : NaN;
    if (Number.isFinite(at) && at > 0) got[a.id] = at;
    const c = has(src.n, a.id) ? Math.floor(Number(src.n[a.id])) : 0;
    if (a.count && Number.isFinite(c) && c > 0) n[a.id] = c;
  }
  /* the Wheel's dungeons cleared: only the lands this phone knows have one */
  for (const land of WHEEL_DUNGEON_HOMES) if (has(src.dg, land) && src.dg[land]) dg[land] = 1;
  const apN = Number(src.ap);
  const ids = (list) => (Array.isArray(list) ? list : []).filter((id, i, all) => !!achvById(id) && all.indexOf(id) === i);
  /* the title and the rarest: an id the page knows and you have, else none */
  const mine = (id) => (typeof id === 'string' && achvById(id) && has(got, id) ? id : null);
  return {
    unavailable: false, got, n, dg,
    t: mine(src.t), rarest: mine(src.rarest),
    ap: Number.isFinite(apN) && apN >= 0 ? Math.floor(apN) : null,
    fresh: ids(src.new), retro: ids(src.retro),
  };
}

/* a line in the chat, from the game (system), as spar.js and noMansLand.js
   write theirs */
function say(S, text) {
  if (!S || !text) return;
  try {
    S.chatLog = [...(S.chatLog || []).slice(-50), { id: 'achv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name: '', text, color: ACHV_LINE_COLOR, ts: Date.now(), system: true }];
    chatLogBus.bump();
  } catch (e) { /* a line is never worth a frame */ }
}

const fmt = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US');

/** "Achievement: First Blood (+10 AP)" -- a common one's line. */
export function achvLine(id) {
  const a = achvById(id);
  return a ? 'Achievement: ' + a.name + ' (+' + fmt(achvAp(id)) + ' AP)' : '';
}

/** One line for everything the join granted quietly:
 *  "Achievements for what you'd already done: First Blood, Blooded (+20 AP)". */
export function achvRetroLine(ids) {
  const list = (Array.isArray(ids) ? ids : []).filter((id) => !!achvById(id));
  if (!list.length) return '';
  const ap = list.reduce((s, id) => s + achvAp(id), 0);
  return (list.length === 1 ? 'An achievement for what you\'d already done: ' : 'Achievements for what you\'d already done: ')
    + list.map((id) => achvById(id).name).join(', ') + ' (+' + fmt(ap) + ' AP)';
}

/** The banner's words: "Gladiator · +500 AP". */
export function achvBannerWords(id) {
  const a = achvById(id);
  return a ? a.name + ' · +' + fmt(achvAp(id)) + ' AP' : '';
}

/** A mail entry of kind 'achv' (payload {id}: the arena's crown, gladiator.js)
 *  in words: "Gladiator achievement"; one this phone does not know is still
 *  "An achievement", never "?" or blank. */
export function achvMailWords(payload) {
  const a = payload && typeof payload === 'object' ? achvById(payload.id) : null;
  return a ? a.name + ' achievement' : 'An achievement';
}
/** The same inside the chat's "You received ..." line: "the Gladiator
 *  achievement", or "an achievement". */
export function achvMailPhrase(payload) {
  const a = payload && typeof payload === 'object' ? achvById(payload.id) : null;
  return a ? 'the ' + a.name + ' achievement' : 'an achievement';
}

function queueMoment(a, id, now) {
  if (!Array.isArray(a.moments)) a.moments = [];
  if (a.showing && a.showing.id === id) return false;
  if (a.moments.some((m) => m.id === id)) return false;
  a.moments.push({ id, at: now });
  if (a.moments.length > MOMENT_MAX) a.moments.splice(0, a.moments.length - MOMENT_MAX);
  return true;
}

/** The worker's word (wsClient.js's direct switch).  Stores it, says the
 *  commons in the chat, queues the big ones' banners, and says the join's
 *  quiet grants in one line.  Returns what it did, for the tests:
 *  {big: [id], lines: [text]}. */
export function onAchvState(S, p, now) {
  const out = { big: [], lines: [] };
  if (!S || !p || typeof p !== 'object') return out;
  const t = typeof now === 'number' ? now : Date.now();
  const a = achvOf(S);
  const s = normalizeAchvState(p);
  a.known = true;
  a.unavailable = s.unavailable;
  /* the worker's answer to a title ask, or any newer word: nothing waits */
  a.titleAsk = null;
  if (s.unavailable) { a.t = null; a.rarest = null; bump(a); return out; }
  a.got = s.got; a.n = s.n; a.dg = s.dg;
  a.t = s.t; a.rarest = s.rarest;
  if (s.ap != null) a.ap = s.ap;
  for (const id of s.fresh) {
    if (achvBig(id)) { if (queueMoment(a, id, t)) out.big.push(id); }
    else { const line = '🏆 ' + achvLine(id); say(S, line); out.lines.push(line); }
  }
  if (s.retro.length) { const line = '🏆 ' + achvRetroLine(s.retro); say(S, line); out.lines.push(line); }
  bump(a);
  return out;
}

/* a title ask with no answer stops waiting after this (a lost frame, a worker
   from before titles): the page's buttons come back */
export const TITLE_ASK_MS = 4000;

/** "Use as title" (an id you have) or "Remove title" (null): asks the worker
 *  (server achievements.js _achvTitle), the road every page's ask takes --
 *  S.channel.send, channelShim's passthrough (wsClient.js, TRAPS #18).  The
 *  page waits for the worker's achv_state; nothing changes here but the
 *  wait.  False when it was not sent (no worker achievements, not yours,
 *  no connection). */
export function sendAchvTitle(S, id, now) {
  if (!achvLive(S) || !S.channel || typeof S.channel.send !== 'function') return false;
  const a = S._achv;
  const want = id == null ? null : id;
  if (want !== null && !(achvById(want) && a && has(a.got, want))) return false;
  try { S.channel.send({ type: 'achv_title', payload: { id: want } }); } catch (e) { return false; }
  achvOf(S).titleAsk = { id: want, at: typeof now === 'number' ? now : Date.now() };
  bump(S._achv);
  return true;
}

/** A title ask still waiting for its answer: {id, at} or null. */
export function achvTitleWaiting(S, now) {
  const a = S && S._achv;
  const ask = a && a.titleAsk;
  if (!ask) return null;
  if ((typeof now === 'number' ? now : Date.now()) - ask.at > TITLE_ASK_MS) { a.titleAsk = null; bump(a); return null; }
  return ask;
}

/** The player_state echo's `achievementPoints` (wsClient.js): the worker's
 *  total whenever it moves -- a quest's +5 and a guild rung pay without an
 *  achv_state, so the page reads this, never the phone's own prediction. */
export function noteServerAp(S, ap) {
  if (!S) return;
  const v = Number(ap);
  if (!Number.isFinite(v) || v < 0) return;
  const a = achvOf(S);
  if (a.ap !== Math.floor(v)) { a.ap = Math.floor(v); bump(a); }
}

/** Your AP as the page shows it: the worker's, else the rpg blob's. */
export function achvApTotal(S) {
  const a = S && S._achv;
  if (a && typeof a.ap === 'number') return a.ap;
  const r = S && S.rpg && Number(S.rpg.achievementPoints);
  return Number.isFinite(r) && r > 0 ? Math.floor(r) : 0;
}

/** The page's numbers: how many of the table you have, the AP your
 *  achievements are worth, and the rest of your AP (quests, guild rungs and
 *  anything else the worker paid) -- never below 0.  A row the owner's test
 *  lever lit pays nothing, so "the rest" can read 0 then. */
export function achvSummary(S) {
  const a = S && S._achv;
  let earned = 0, achvPts = 0;
  for (const def of ACHIEVEMENTS) {
    if (a && has(a.got, def.id)) { earned++; achvPts += ACHV_TIERS[def.tier].ap; }
  }
  const apTotal = achvApTotal(S);
  return { earned, total: ACHIEVEMENTS.length, apTotal, achvPts, otherPts: Math.max(0, apTotal - achvPts), maxPts: ACHV_TOTAL_AP };
}

/* The page's filter chips: the arena's row is listed under All and Rare (the
   owner: "although not as rare"). */
export const ACHV_FILTERS = Object.freeze([
  Object.freeze({ id: 'all', label: 'All', tiers: null }),
  Object.freeze({ id: 'common', label: 'Common', tiers: ['common'] }),
  Object.freeze({ id: 'rare', label: 'Rare', tiers: ['rare', 'arena'] }),
  Object.freeze({ id: 'superrare', label: 'Super-rare', tiers: ['superrare'] }),
]);

/** The rows for a filter, in the table's order: {def, got, at, n}. */
export function achvRows(S, filterId) {
  const f = ACHV_FILTERS.find((x) => x.id === filterId) || ACHV_FILTERS[0];
  const a = S && S._achv;
  return ACHIEVEMENTS.filter((def) => !f.tiers || f.tiers.includes(def.tier)).map((def) => ({
    def,
    got: !!(a && has(a.got, def.id)),
    at: a && has(a.got, def.id) ? a.got[def.id] : 0,
    n: a && has(a.n, def.id) ? a.n[def.id] : 0,
  }));
}

/* the combat levels the worker keeps (S.rpg.prog3, its own blob): the
   highest of Melee, Bow and Magic is what Blooded, Veteran and Centurion ask */
const COMBAT_ROWS = Object.freeze({ combat_10: 10, combat_50: 50, combat_100: 100 });
function bestCombatLevel(S) {
  const sk = S && S.rpg && S.rpg.prog3 && S.rpg.prog3.sk;
  let top = 0;
  for (const c of ['sword', 'bow', 'staff']) top = Math.max(top, Math.floor(Number(sk && sk[c] && sk[c].level) || 0));
  return top;
}

/** How far along a row you have not earned yet is, in words, from what the
 *  worker already sent (the codex's counts, the dungeons it noted, the combat
 *  levels): "4 of 9 kinds", "1 of 3 cleared", "Your best: Lv 7".  '' for a
 *  row with nothing to count. */
export function achvProgress(S, id) {
  if (Object.prototype.hasOwnProperty.call(COMBAT_ROWS, id)) {
    const top = bestCombatLevel(S);
    return top > 0 ? 'Your best: Lv ' + top : '';
  }
  if (id === 'codex_all' || id === 'elder_all') {
    const k = S && S._codex && S._codex.k;
    if (!k) return '';
    const i = id === 'codex_all' ? 0 : 1;
    const n = CODEX_KINDS.filter((kind) => has(k, kind) && Array.isArray(k[kind]) && Number(k[kind][i]) >= 1).length;
    return n + ' of ' + CODEX_KINDS.length + ' kinds';
  }
  if (id === 'dungeons_all') {
    const dg = S && S._achv && S._achv.dg;
    const n = WHEEL_DUNGEON_HOMES.filter((land) => has(dg, land)).length;
    return n + ' of ' + WHEEL_DUNGEON_HOMES.length + ' cleared';
  }
  return '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** When it was earned: "Oct 19" (and the year when it is not this one).
 *  Spelled out here rather than toLocaleDateString, so every phone reads the
 *  same words whatever its language. */
export function achvDateWords(at, now) {
  const t = Number(at);
  if (!Number.isFinite(t) || t <= 0) return '';
  const d = new Date(t), today = new Date(typeof now === 'number' ? now : Date.now());
  const w = MONTHS[d.getMonth()] + ' ' + d.getDate();
  return d.getFullYear() === today.getFullYear() ? w : w + ', ' + d.getFullYear();
}

/** Is the world in view -- the intro lifted, no zone or connection veil over
 *  it?  A banner waits for this (the daily toast's own test, gameEvents.js). */
export function achvWorldShown(S) {
  return !!(S && S.__introLiftedAt && !S._zoneLoading && !S._netHold);
}

/** The banner's subject at `now`: {id, at, shownAt, until, started}, or null.
 *  `started` is true on the one call that put it up (the caller plays its
 *  sound then, once).  `ready(id, at)` says the next one may show now (the
 *  world in view, its picture decoded, `at` when it was queued); a moment
 *  that waited past MOMENT_GIVE_UP_MS goes quietly. */
export function achvMoment(S, now, ready) {
  const a = S && S._achv;
  if (!a) return null;
  const t = typeof now === 'number' ? now : Date.now();
  if (a.showing && t >= a.showing.until) { a.showing = null; bump(a); }
  if (a.showing) return { ...a.showing, started: false };
  if (!Array.isArray(a.moments)) a.moments = [];
  while (a.moments.length && t - a.moments[0].at > MOMENT_GIVE_UP_MS) a.moments.shift();
  if (!a.moments.length) return null;
  const next = a.moments[0];
  if (typeof ready === 'function' && !ready(next.id, next.at)) return null;
  a.moments.shift();
  a.showing = { id: next.id, at: next.at, shownAt: t, until: t + BANNER_MS };
  bump(a);
  return { ...a.showing, started: true };
}
