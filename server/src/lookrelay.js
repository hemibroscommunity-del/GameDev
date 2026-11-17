/* ═══ v2.3.3240: A PLAYER'S LOOK IS RELAYED WHEN IT CHANGES, NOT EVERY 2 s ═══
 *
 * Owner, 2026-10-13: "Go recommended but I want you to stress test to see what
 * can be optimized."
 *
 * Every phone sends `track` every 2 s, whatever changed (BroTown.jsx): its
 * whole look (hair, clothes, gear, drawings), its level and HP, its weapon and
 * the inspect card's stats -- 39 fields, ~940 bytes for a new character, more
 * with drawings (tools/qa/load/track-sample.json, caught off a real phone by
 * mp-trackcapture).  The room relayed every one to EVERY other player in the
 * room as a message of its own (`player_update`, index.js case 'track'), each
 * compressed for each socket: N(N-1)/2 sends a second, 7,140 at 120 players --
 * more messages than all the ticks.  The load test's bots never sent it, so
 * every capacity number before this version left it out.
 *
 * But the phones already MERGE a relay: wsClient's player_update writes only
 * the keys it carries (Object.assign, then peerCosmetics' "delta semantics",
 * v2.3.1961) and keeps the rest.  So most relays repeated what every phone
 * already had.  Now a relay carries only what changed since this player's
 * last relay, and goes out only when something did:
 *   - `x`, `y`, `dir` never send one on their own (RIDE_ALONG): the ticks carry
 *     where everyone is and which way they face, and the 1 Hz roster carries
 *     everyone; they still ride along in a relay that goes, as before;
 *   - nor does HP (LAZY: `rpgHp`, `rpgMaxHp`), which changes on every hit: a
 *     peer's health bar is armed and fed by the worker's own PvP hits
 *     (gameEvents.js, `_hpSeenAt`), so these only feed the inspect card --
 *     they go with the next relay that goes for another reason, and in every
 *     whole copy (at most a minute old);
 *   - nor do the inspect card's COUNTERS (LAZY_IN: `rpgData`'s kills, server
 *     kills, gold earned and minutes played), which change on every kill and
 *     every minute.  The rest of `rpgData` IS news: the phone draws a peer's
 *     slung shield and block pose from `rpgData.shield` (entityRenderer), and
 *     the equipment sheet and clan lists read its gear and clan names -- so
 *     any change there relays `rpgData`, whole, at once.  (The first cut of
 *     v2.3.3240 held ALL of rpgData back, and a shield put on or taken off
 *     could take a minute to show on the others' screens.)
 *   - `hg` and `fr` go in EVERY relay that carries them (ALWAYS): wsClient sets
 *     a peer's height and frame from them unconditionally (`_ud.hg || null`), so
 *     a relay without them would put everyone of a different build back to
 *     average -- and going back to average (the key gone) is itself a change;
 *   - a key that disappears sends nothing, as before: the phones kept the old
 *     value from a full relay that left it out, and still do -- but it is
 *     forgotten here, so its return is always news (leaving a clan clears the
 *     tag on every phone by a relay of its own, clans.js);
 *   - every FULL_EVERY_MS a player's whole look goes again, whatever changed,
 *     so a phone that missed one (a tab suspended through a join, v2.3.1112)
 *     still converges -- in a minute rather than 2 s.
 * A new session (every join and rejoin) starts with a full relay, and every
 * joiner is sent everyone's whole look in its state_sync, so a delta always
 * lands on a whole look.  `server/test/look-relay.test.mjs` replays random
 * looks through a model of the phone's merge both ways and asserts the same
 * peer, key for key.
 *
 * Server only, so deploy-order safe: an old phone merges a delta exactly as a
 * new one.  Kill switch: `lookdelta: false` in the live flags relays every
 * track whole again, from the next one.
 */
import { RELAY } from './relay.js';

export const LOOK_RELAY = Object.freeze({
  FULL_EVERY_MS: 60000,
  RIDE_ALONG: Object.freeze(['x', 'y', 'dir']),
  LAZY: Object.freeze(['rpgHp', 'rpgMaxHp']),
  /* inside these keys, the fields that change on every kill or minute and
     that nothing draws: a change to them alone sends nothing; any other
     change to the key relays it, whole */
  LAZY_IN: Object.freeze({ rpgData: Object.freeze(['kills', 'svKills', 'goldEarned', 'playtime']) }),
  ALWAYS: Object.freeze(['hg', 'fr']),
});

/* ═══ v2.3.5721: THE LOOK RELAY PACED AND BOUNDED (card K2 PR 2; the second red team's CRITICAL 2) ═══
 *
 * The relay went out the moment a `track` came, to every other player
 * (broadcastExcept), outside the relay byte budget (relay.js RELAY.BYTES_*),
 * and `rpgData` went whole, any keys, up to TRACK_BLOB_MAX_BYTES (8 KB): one
 * socket sending a `track` with a fresh `rpgData` every message made the
 * room send about 0.9 MB a second to every other phone.  Now, with
 * `lookpace` on (on unless its own falsy value):
 *   - PACE: at most one look relay a socket a second (SLOT_MS).  A `track`
 *     inside the second is HELD, the latest one winning, and sent at the
 *     next slot (a timer, one a socket at most).  An honest page sends one
 *     every 2 s at most (BroTown.jsx `S._lastTrack`), so it is never held;
 *   - BYTES: the relay as it goes out is paid from the sender's relay byte
 *     bucket (relay.js `_relayBytesHave`: 8 KB at once, 2 KB a second
 *     after), as a phone's other relays are; one it cannot pay for is held
 *     until it can (never dropped: the others would keep a stale look);
 *   - FIELDS: `rpgData` carries only the fields a page reads from another
 *     player (RPGDATA_READ, each to its form; found by grep in src/, every
 *     one kept, so what the others see is unchanged).  The page sends eight
 *     more (power, vitality, endurance, agility, mind, pvpKills, pvpDeaths,
 *     deaths) that no page reads of another player: they stay in the
 *     player's own copy (session.data, playerState, the leaderboard's
 *     report) and are left out of the relay.  A change to one of them alone
 *     is no longer news.
 * `lookpace: false` relays every `track` at once, whole `rpgData`, outside
 * the bucket: the way before. */
export const LOOK_PACE = Object.freeze({
  SLOT_MS: 1000,
  /* one string field's length on the relay: above every honest one (an
     item's name, a clan's, an achievement's id) */
  TEXT_MAX: 96,
});

/* What a page reads of another player's `rpgData` (grep `rpgData` in src/,
   2026-11-17), by its form: 'text' a string (or null), 'num' a finite number,
   an object a nested one, each of its fields by its form.
     equipModel.js (the equipment sheet): weapon, armor, shield, amulet;
     entityRenderer.js (a slung shield, the block pose): shield;
     LeaderboardPanel.jsx (the room's live list): lifeTotal, ap, kills,
       dungeons, goldEarned, playtime, clanTag;
     ClanPanel.jsx: clanTag, clanName, clanColor1;
     playerProfile.js profileFromPeer (the Inspect card): ap, clanName,
       clanTag, combat {melee, bow, staff}, farmReady, kills, petInfo {name,
       species, level, kind, stage, gold}, quests, svKills, title, rarest. */
export const RPGDATA_READ = Object.freeze({
  weapon: 'text', armor: 'text', shield: 'text', amulet: 'text',
  clanTag: 'text', clanName: 'text', clanColor1: 'text', title: 'text', rarest: 'text',
  ap: 'num', kills: 'num', svKills: 'num', quests: 'num', dungeons: 'num',
  goldEarned: 'num', lifeTotal: 'num', playtime: 'num', farmReady: 'num',
  combat: Object.freeze({ melee: 'num', bow: 'num', staff: 'num' }),
  petInfo: Object.freeze({ name: 'text', species: 'text', level: 'num', kind: 'text', stage: 'num', gold: 'bool' }),
});

const ownKey = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
/* one value to its form, or undefined to leave it out */
function toForm(form, v) {
  if (form === 'text') {
    if (v === null) return null;
    return typeof v === 'string' ? (v.length > LOOK_PACE.TEXT_MAX ? v.slice(0, LOOK_PACE.TEXT_MAX) : v) : undefined;
  }
  if (form === 'num') return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  if (form === 'bool') return typeof v === 'boolean' ? v : undefined;
  if (form && typeof form === 'object') {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
    const o = {};
    for (const k of Object.keys(form)) {
      if (!ownKey(v, k)) continue;
      const x = toForm(form[k], v[k]);
      if (x !== undefined) o[k] = x;
    }
    return o;
  }
  return undefined;
}

/** `rpgData` as the relay carries it: only RPGDATA_READ's fields, each to
 *  its form.  Pure. */
export function rpgDataRelayed(rd) {
  if (!rd || typeof rd !== 'object' || Array.isArray(rd)) return rd;
  return toForm(RPGDATA_READ, rd);
}

/** The look as the relay carries it (`rpgData` cut; every other key as the
 *  track's gate left it).  `clean` itself is never changed. */
export function lookRelayed(clean) {
  if (!clean || !ownKey(clean, 'rpgData') || !clean.rpgData || typeof clean.rpgData !== 'object') return clean;
  const out = Object.create(null);
  for (const k of Object.keys(clean)) out[k] = clean[k];
  out.rpgData = rpgDataRelayed(clean.rpgData);
  return out;
}

const RIDE_ALONG = new Set(LOOK_RELAY.RIDE_ALONG);
const LAZY = new Set(LOOK_RELAY.LAZY);
const ALWAYS = new Set(LOOK_RELAY.ALWAYS);
const LAZY_IN = new Map(Object.entries(LOOK_RELAY.LAZY_IN).map(([k, v]) => [k, new Set(v)]));

/* a value's signature: equal looks, equal strings (the relay goes out as
   JSON, so JSON is what a phone can tell apart) */
function sigOf(v) {
  if (v === undefined) return undefined;
  try { return JSON.stringify(v); } catch { return '\u0000' + String(Math.random()); }
}
/* ...and of the part of a LAZY_IN key that is news: the value without its
   counters (anything not a plain object is all news) */
function newsSigOf(v, lazy) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return sigOf(v);
  const o = {};
  for (const k of Object.keys(v)) if (!lazy.has(k)) o[k] = v[k];
  return sigOf(o);
}

/**
 * What to relay of `clean` given what was relayed of this player before
 * (`last`: { sigs, news, fullAt } or null), at `now`.  Pure, so the test can drive
 * it.  Returns { data, full, last } -- `data` null when nothing goes out --
 * and the new `last` to keep.
 */
export function lookDelta(clean, last, now) {
  const sigs = Object.create(null);
  const news = Object.create(null);   /* LAZY_IN keys: the signature of what is news in them */
  for (const k of Object.keys(clean)) {
    sigs[k] = sigOf(clean[k]);
    const lz = LAZY_IN.get(k);
    if (lz && clean[k] !== undefined) news[k] = newsSigOf(clean[k], lz);
  }
  if (!last || !(now - last.fullAt < LOOK_RELAY.FULL_EVERY_MS)) {
    return { data: clean, full: true, last: { sigs, news, fullAt: now } };
  }
  const lastNews = last.news || Object.create(null);
  let changed = false;
  for (const k in sigs) {
    if (RIDE_ALONG.has(k) || LAZY.has(k)) continue;
    if (LAZY_IN.has(k) ? (lastNews[k] !== news[k]) : (last.sigs[k] !== sigs[k])) { changed = true; break; }
  }
  /* going back to an average build: the key gone is the news */
  if (!changed) for (const k of ALWAYS) if (last.sigs[k] !== undefined && sigs[k] === undefined) { changed = true; break; }
  /* A key that went is FORGOTTEN, relay or not, so that its return is always
     news.  The phones keep a key a relay leaves out -- but something else may
     clear it: leaving a clan sends {clanTag: null} on its own (clans.js), and
     rejoining the same clan must put the tag back. */
  let gone = false;
  for (const k in last.sigs) if (sigs[k] === undefined) { gone = true; break; }
  if (!changed) {
    if (!gone) return { data: null, full: false, last };
    const kept = Object.create(null);
    const keptNews = Object.create(null);
    for (const k in last.sigs) if (sigs[k] !== undefined) kept[k] = last.sigs[k];
    for (const k in lastNews) if (sigs[k] !== undefined) keptNews[k] = lastNews[k];
    return { data: null, full: false, last: { sigs: kept, news: keptNews, fullAt: last.fullAt } };
  }
  /* what goes: where they stand, the build, and every key whose value is not
     the one last relayed -- a LAZY or LAZY_IN key's counters too, riding along */
  const data = {};
  for (const k in sigs) {
    if (RIDE_ALONG.has(k) || ALWAYS.has(k) || last.sigs[k] !== sigs[k]) data[k] = clean[k];
  }
  return { data, full: false, last: { sigs, news, fullAt: last.fullAt } };
}

export const lookRelayMethods = {
  /* `lookdelta: false` in the live flags: every track relayed whole */
  _lookDeltaOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'lookdelta') && !f.lookdelta);
  },

  /* v2.3.5721: `lookpace: false` in the live flags: relayed at once, whole
     `rpgData`, outside the bucket (on unless its own falsy value) */
  _lookPaceOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'lookpace') && !f.lookpace);
  },

  /* index.js case 'track': relay this player's look to everyone else, or
     what changed of it (above).  v2.3.5721: paced, paid for and cut (the
     header's LOOK_PACE): 'held' when it waits for its slot or its bytes */
  _lookRelay(ws, session, clean) {
    const st = this._lookStats || (this._lookStats = { tracks: 0, full: 0, delta: 0, none: 0 });
    st.tracks++;
    if (this._lookPaceOff()) return this._lookRelayNow(ws, session, clean);
    const look = lookRelayed(clean);
    const now = Date.now();
    if (!session._lookHeld && !(now - (session._lookSentAt || -Infinity) < LOOK_PACE.SLOT_MS)) {
      const r = this._lookRelayNow(ws, session, look, now);
      if (r !== 'held') return r;
    }
    session._lookHeld = { ws, look };   /* the latest wins */
    st.held = (st.held || 0) + 1;
    this._lookArm(session, now);
    return 'held';
  },

  /* the held look's timer: one a socket, at its slot (or when its bytes
     are there) */
  _lookArm(session, now) {
    if (session._lookTimer) return;
    const t = typeof now === 'number' ? now : Date.now();
    const wait = Math.max(0, (session._lookSentAt || -Infinity) + LOOK_PACE.SLOT_MS - t, session._lookWaitMs || 0);
    session._lookTimer = setTimeout(() => { session._lookTimer = null; this._lookFlush(session); }, Math.min(Math.max(wait, 0), 60000) || 0);
  },

  /* the held look goes now, if its socket is still this session's and its
     slot has come; else it waits again */
  _lookFlush(session, now) {
    const held = session && session._lookHeld;
    if (!held) return 'none';
    if (this.sessions && this.sessions.get(held.ws) !== session) { session._lookHeld = null; return 'gone'; }
    const t = typeof now === 'number' ? now : Date.now();
    if (t - (session._lookSentAt || -Infinity) < LOOK_PACE.SLOT_MS) { this._lookArm(session, t); return 'held'; }
    session._lookHeld = null;
    const r = this._lookRelayNow(held.ws, session, held.look, t);
    if (r === 'held') { session._lookHeld = held; this._lookArm(session, t); }
    return r;
  },

  /* the relay itself: whole or a delta (lookDelta), paid for from the relay
     bucket when paced ('held' when it cannot pay yet, nothing kept) */
  _lookRelayNow(ws, session, clean, now) {
    const st = this._lookStats || (this._lookStats = { tracks: 0, full: 0, delta: 0, none: 0 });
    const paced = !this._lookPaceOff();
    const t = typeof now === 'number' ? now : Date.now();
    if (this._lookDeltaOff()) {
      if (paced && !this._lookPay(session, { type: 'player_update', id: session.id, data: clean }, t)) return 'held';
      session._look = null;
      st.full++;
      if (paced) session._lookSentAt = t;
      this.broadcastExcept(ws, { type: 'player_update', id: session.id, data: clean });
      /* v2.3.3276: every phone now holds this look whole (nearjoin.js) */
      if (this._nearJoinWholeSent) this._nearJoinWholeSent(session.id);
      return 'full';
    }
    const r = lookDelta(clean, session._look || null, paced ? t : Date.now());
    if (!r.data) { session._look = r.last; st.none++; return 'none'; }
    const out = { type: 'player_update', id: session.id, data: r.data };
    if (paced && !this._lookPay(session, out, t)) return 'held';   /* nothing kept: the next try is measured from what the phones hold */
    session._look = r.last;
    if (paced) session._lookSentAt = t;
    if (r.full) st.full++; else st.delta++;
    this.broadcastExcept(ws, out);
    /* v2.3.3276: a whole one: every phone now holds this look (nearjoin.js) */
    if (r.full && this._nearJoinWholeSent) this._nearJoinWholeSent(session.id);
    return r.full ? 'full' : 'delta';
  },

  /* v2.3.5721: pay for a look relay from the sender's relay bytes (relay.js
     `_relayBytesHave`): true when paid.  One larger than the whole bucket
     (none is, cut: a whole look is some 1 to 3 KB) waits for a full bucket.
     `_lookWaitMs`: how long until it could pay. */
  _lookPay(session, msg, now) {
    if (!this._relayBytesHave) return true;
    let bytes = 0;
    try { bytes = JSON.stringify(msg).length; } catch (e) { return true; }
    const cost = Math.min(bytes, RELAY.BYTES_BURST);
    const have = this._relayBytesHave(session, now);
    if (have < cost) {
      session._lookWaitMs = Math.ceil(((cost - have) / RELAY.BYTES_PER_S) * 1000);
      const st = this._lookStats; if (st) st.unpaid = (st.unpaid || 0) + 1;
      return false;
    }
    session._lookWaitMs = 0;
    session.relayBytes -= cost;
    return true;
  },

  /* Something else relayed this player (clans.js, leaving a clan): the next
     track goes whole, whatever the phones were last sent by this relay */
  _lookForget(session) {
    if (session) session._look = null;
  },

  /* /dev/overview: how many tracks came in, and how many went out whole, as
     a delta, or not at all */
  _lookInfo() {
    const st = this._lookStats || { tracks: 0, full: 0, delta: 0, none: 0 };
    return { on: !this._lookDeltaOff(), paced: !this._lookPaceOff(), ...st };
  },
};
