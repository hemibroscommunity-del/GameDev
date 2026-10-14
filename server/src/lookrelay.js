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

  /* index.js case 'track': relay this player's look to everyone else, or
     what changed of it (above) */
  _lookRelay(ws, session, clean) {
    const st = this._lookStats || (this._lookStats = { tracks: 0, full: 0, delta: 0, none: 0 });
    st.tracks++;
    if (this._lookDeltaOff()) {
      session._look = null;
      st.full++;
      this.broadcastExcept(ws, { type: 'player_update', id: session.id, data: clean });
      return 'full';
    }
    const r = lookDelta(clean, session._look || null, Date.now());
    session._look = r.last;
    if (!r.data) { st.none++; return 'none'; }
    if (r.full) st.full++; else st.delta++;
    this.broadcastExcept(ws, { type: 'player_update', id: session.id, data: r.data });
    return r.full ? 'full' : 'delta';
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
    return { on: !this._lookDeltaOff(), ...st };
  },
};
