/* ═══ v2.3.3276: A JOIN IS TOLD THE PLAYERS AROUND IT, AND A LOOK COMES WHEN ITS PLAYER DOES ═══
 * (the server split plan's Phase 0e, docs/SERVER-SPLIT-PLAN.md; the owner,
 * 2026-10-16: "Yes do suggested")
 *
 * A joining phone's snapshot (state_sync, index.js getAllPlayerData) gave it
 * EVERY player in the room, each with their whole public look: what they wear,
 * their drawings, the inspect card -- ~0.9 KB for a player who has drawn
 * nothing (tools/qa/load/track-sample.json, off a real phone), ~3 KB with all
 * eight drawings (256 hex each).  And every join told every other phone the
 * joiner's whole look (player_join).  Both grow with the room: at 1,000
 * players a join was ~1 MB of snapshot and ~1,000 copies of the joiner's
 * look, and after a deploy all 1,000 come back at once.
 *
 * A phone draws only the players around it: presence v2 (presence2.js) already
 * sends a pres-2 phone in the Wheel no far player at all while its world map is
 * shut, and parks a far player's copy out of sight.  What it still keeps of a
 * far player is what its LISTS show: the leaderboard's online tab (name,
 * colour, level, the inspect card's counters), the clan window's other clans
 * (the clan tag, name and colour), the player list (name, colour, the Hemi Bro
 * picture and count).  So a phone that says it can take it (`nj: 1` in its
 * join, beside `pres: 2`) is now sent:
 *   - WHOLE, the players around it (`_nearJoinAround`): its own zone and, in
 *     the Wheel, within NEAR_JOIN.R -- the same circle every roster covers
 *     (tick.js FAR_PLAYERS.NEAR_R): everyone its screen or minimap can show --
 *     its party wherever they are, and its own sparring clones;
 *   - everyone else as a LIST ENTRY (`_nearJoinListEntry`): the fields above
 *     and nothing of the look, marked `fa: 1`, which the phone parks out of
 *     sight at once (src/game/nearJoin.js);
 *   - and, on the tick that first sends a player whole to it -- they walked
 *     into its circle, it walked into theirs, they joined its party -- that
 *     player's whole look in the same message (`pl`), read by the phone BEFORE
 *     the tick's players, so the tick that first shows them shows them in their
 *     own look.  A phone that ARRIVES somewhere (a zone change: every trip into
 *     the Wheel, from a login, a death, a dungeon or the farm) is sent, on its
 *     next tick, the look and the place of everyone around it whose look it
 *     does not hold (`_nearJoinArrivalIds`), the ones standing still too --
 *     they would otherwise wait for the next roster (about a second).  The
 *     moment between the phone's own zone change and that tick (a round trip)
 *     is under the trip's loading veil (zoneTransitions.js, wheelHome.js).
 *
 * WHICH LOOKS A PHONE HOLDS.  `session._looks` is the set of players this
 * session has been sent whole since its snapshot (the snapshot's whole
 * entries, a whole player_join, a `pl`).  And the look relay (lookrelay.js)
 * still goes to everyone, as before: a delta to every phone, and the WHOLE
 * look of each player at least once a minute (LOOK_RELAY.FULL_EVERY_MS) and on
 * every new session's first track.  Each whole relay stamps the player's state
 * with the room's next `_lookSeq` (`_nearJoinWholeSent`), and a session keeps
 * the `_lookSeq` its snapshot was made at (`_snapSeq`): a player whose last
 * whole relay is NEWER than the snapshot is held too -- the phone got it after
 * its snapshot replaced its peers.  So a look goes in `pl` only to a phone that
 * has never had it whole: in practice, for a minute after a join.  A relay
 * that is only a delta never makes a look held (it may land on a list entry).
 *
 * WHAT A PLAYER SEES.  Around them, nothing changes: every player they can see
 * is sent whole, look and all, as before.  In the lists, a far player's entry
 * has everything the lists show; their PORTRAIT (the friends list, the inspect
 * card opened from the player list) is the plain one until their look reaches
 * this phone -- by their next whole relay, within about a minute and a half
 * after you join, or at once when they come near.
 *
 * Deploy-order safe both ways: an old phone sends no `nj` and gets the
 * snapshot, player_join and ticks byte for byte as before; a new phone against
 * an old worker gets them too (no `fa`, no `pl`) and needs neither.  The
 * relays are untouched.  Kill switch: `nearjoin: false` in the live flags --
 * new joins get the whole snapshot again (and `caps.nearjoin` false); a phone
 * that already got a near snapshot keeps getting its `pl`s, which it needs.
 */

import { WHEEL_ZONE } from './wheelzone.js';

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const NEAR_JOIN = Object.freeze({
  /* the players a phone gets whole: the circle every roster covers
     (tick.js FAR_PLAYERS.NEAR_R; near-join.test.mjs holds them equal) */
  R: 2400,
  /* a far player's list entry: what the lists show (BroTown's player list,
     LeaderboardPanel, ClanPanel), under the names the snapshot uses.  And
     their zone, from their state (the friends list says where they are). */
  LIST_KEYS: Object.freeze(['name', 'color', 'avatar', 'rpgLv', 'clanTag', 'clanColor1', 'bro',
    /* v2.3.3311: the alliance's tag (alliance.js), shown in the lists too */
    'allyTag']),
  /* ...and of their inspect card (`rpgData`), the parts the lists read: the
     clan window's other clans, the leaderboard's online tab */
  LIST_RPG_KEYS: Object.freeze(['clanTag', 'clanName', 'clanColor1',
    'lifeTotal', 'ap', 'kills', 'dungeons', 'goldEarned', 'playtime']),
});

const LIST_KEYS = NEAR_JOIN.LIST_KEYS;
const LIST_RPG_KEYS = NEAR_JOIN.LIST_RPG_KEYS;
const R2 = NEAR_JOIN.R * NEAR_JOIN.R;

/* Where a player IS, from their state: `move` is the only writer of a
   position (index.js TRACK_STATE_EXCLUDED), while the look the snapshot reads
   first (session.data) keeps the x/y of their last `track` -- up to half a
   minute old with the quiet phone (quietphone.js), and the zone they JOINED
   in.  A near entry is drawn the moment it lands, so it says where they stand
   now, rounded as the tick rounds it (tick.js `rp`). */
function live(entry, q) {
  if (!entry || !q) return entry;
  const r = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : v);
  entry.x = r(q.x); entry.y = r(q.y); entry.z = q.z; entry.d = q.d;
  entry.vx = r(q.vx) || 0; entry.vy = r(q.vy) || 0;
  if (q.f !== undefined) entry.f = q.f;
  return entry;
}

export const nearJoinMethods = {
  /* `nearjoin: false` in the live flags (the note above) */
  _nearJoinOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'nearjoin') && !f.nearjoin);
  },

  /* join.js: does this join get the near snapshot?  A v2 presence-2 phone that
     says it can (`nj: 1`), unless the switch is thrown.  Fixed for the
     session: it is what the phone was sent, and so what it needs from now on. */
  _nearJoinFor(session, msg) {
    return !!(session && session.pres2 && msg && msg.nj === 1 && !this._nearJoinOff());
  },

  /* Is `id` (state `q`) around session `s`, whose player is `sps`?  Its own
     zone (and in the Wheel within R), its party (`party`, a Set or null),
     its own sparring clones.  `sps` may be null (pre-join): nobody is. */
  _nearJoinAround(s, sps, id, q, party) {
    if (!q || !sps) return false;
    if (q._spar && q._spar.owner === s.id) return true;
    if (party && party.has(id)) return true;
    if (q.z !== sps.z) return false;
    if (sps.z !== WHEEL_ZONE) return true;
    const dx = q.x - sps.x, dy = q.y - sps.y;
    return dx * dx + dy * dy <= R2;
  },

  /* Has session `s` been sent `id`'s whole look since its snapshot (the note
     above)?  `q` is their state. */
  _nearJoinHeld(s, id, q) {
    if (s._looks && s._looks.has(id)) return true;
    return !!q && (q._lookWholeSeq || 0) > (s._snapSeq || 0);
  },

  /* lookrelay.js: `id`'s whole look just went to every phone */
  _nearJoinWholeSent(id) {
    const q = id ? this.playerState[id] : null;
    if (!q) return;
    this._lookSeq = (this._lookSeq || 0) + 1;
    q._lookWholeSeq = this._lookSeq;
  },

  /* join.js: a player is joining (or coming back): nobody holds the look of
     this session yet -- their player_join decides who does */
  _nearJoinFresh(id) {
    const q = id ? this.playerState[id] : null;
    if (q) q._lookWholeSeq = 0;
  },

  /* The whole entry the snapshot gives `id` -- a player, a body left
     lingering in a fight, or a sparring clone -- or null.  `s` is the
     player's own session when the caller has it (else it is looked up). */
  _nearJoinWhole(id, s) {
    const q = this.playerState[id];
    if (!q) return null;
    const c = this._sparById ? this._sparById.get(id) : null;
    if (c) return live({ ...c.look, rpgHp: Math.round(q.hp || 0), rpgMaxHp: Math.round(q.maxHp || 1) }, q);
    let sess = s || null;
    if (!sess) {
      for (const [, x] of this.sessions) if (x.id === id) { sess = x; break; }
    }
    if (!sess && this._lingerSessions) {
      const lb = this._lingerSessions();
      const b = lb ? lb.get(id) : null;
      if (b && b.session) sess = b.session;
    }
    return sess ? live(this._gearProvCropPeer(this._peerPublic(q, sess)), q) : null;
  },

  /* A far player's list entry (LIST_KEYS, LIST_RPG_KEYS), marked `fa`.  The
     same precedence as _peerPublic: the look the phone sent over the state,
     the session's name over the state's.  `s` may be just `{ data }`. */
  _nearJoinListEntry(q, s) {
    const data = s && s.data && typeof s.data === 'object' ? s.data : null;
    const out = { fa: 1 };
    for (const k of LIST_KEYS) {
      let v;
      if (data && own(data, k)) v = data[k];
      else if (k === 'name' && s && s.name !== undefined) v = s.name;
      else if (q && own(q, k)) v = q[k];
      else continue;
      if (v !== undefined) out[k] = v;
    }
    if (q && typeof q.z === 'string') out.z = q.z;
    if (q && q.broN > 0) out.brn = q.broN;
    const rd = data && own(data, 'rpgData') ? data.rpgData : (q && own(q, 'rpgData') ? q.rpgData : null);
    if (rd && typeof rd === 'object' && !Array.isArray(rd)) {
      const o = {};
      let any = false;
      for (const k of LIST_RPG_KEYS) if (own(rd, k) && rd[k] !== undefined) { o[k] = rd[k]; any = true; }
      if (any) out.rpgData = o;
    }
    return out;
  },

  /* join.js: the joiner's player_join.  Every socket but the joiner's is told
     their whole look (one string), as before -- except a near-join session
     the joiner is not around: a list entry, and it no longer holds their look
     (a rejoin may come back in another), so it is sent whole when they come
     around it, or by their next whole relay.  `pub` is the whole public look,
     `data` the join's own (for the list entry's precedence). */
  _nearJoinJoinBroadcast(ws, id, name, pub, data) {
    const q = this.playerState[id];
    let whole = null, list = null;
    /* the joiner's party, read once: a session is in it or not (a party is
       the same set from either side), so no session's own is read */
    const jp = this._presence2Party ? this._presence2Party(id) : null;
    for (const [w, s] of this.sessions) {
      if (w === ws) continue;
      let m;
      if (s.nearJoin && s._looks && s.id) {
        const sps = this.playerState[s.id];
        if (this._nearJoinAround(s, sps, id, q, jp && jp.has(s.id) ? jp : null)) {
          s._looks.add(id);
          m = whole || (whole = JSON.stringify({ type: 'player_join', id, name, data: pub }));
        } else {
          s._looks.delete(id);
          m = list || (list = JSON.stringify({ type: 'player_join', id, name, data: this._nearJoinListEntry(q, { name, data }) }));
        }
      } else {
        m = whole || (whole = JSON.stringify({ type: 'player_join', id, name, data: pub }));
      }
      try { w.send(m); } catch {}
    }
  },

  /* A clone's list entry (spar.js keeps its look on the clone) */
  _nearJoinCloneList(c) {
    return this._nearJoinListEntry(this.playerState[c.id], { name: c.name, data: c.look });
  },

  /* index.js getAllPlayerData, for a near-join session: the players around
     it whole, everyone else as a list entry; and what it now holds. */
  _nearJoinPlayers(session) {
    const r = Object.create(null);   /* keyed by player id (TRAPS: '__proto__') */
    const sps = session && session.id ? this.playerState[session.id] : null;
    const party = this._presence2Party ? this._presence2Party(session.id) : null;
    const looks = new Set();
    session._looks = looks;
    session._snapSeq = this._lookSeq || 0;
    const put = (id, q, s, whole, list) => {
      if (this._nearJoinAround(session, sps, id, q, party) || id === session.id) {
        r[id] = whole();
        looks.add(id);
      } else {
        r[id] = list();
      }
    };
    for (const [, s] of this.sessions) {
      if (!s.id) continue;
      const q = this.playerState[s.id];
      put(s.id, q, s,
        () => live(this._gearProvCropPeer(this._peerPublic(q, s)), q),
        () => this._nearJoinListEntry(q, s));
    }
    /* the bodies left lingering in a fight (linger.js), as getAllPlayerData */
    const lb = this._lingerSessions ? this._lingerSessions() : null;
    if (lb) for (const [id, b] of lb) {
      const q = this.playerState[id];
      if (!(id in r) && q && b && b.session) {
        put(id, q, b.session,
          () => live(this._gearProvCropPeer(this._peerPublic(q, b.session)), q),
          () => this._nearJoinListEntry(q, b.session));
      }
    }
    /* the sparring clones (spar.js), as getAllPlayerData */
    if (this._sparById) for (const [id, c] of this._sparById) {
      const q = this.playerState[id];
      if (!(id in r) && q) put(id, q, null, () => this._nearJoinWhole(id), () => this._nearJoinCloneList(c));
    }
    return r;
  },

  /* tick.js: the looks session `s` (player `sps`) must be sent with this tick:
     every player this tick sends it whole -- `plan` (its own players, slim ones
     skipped), else the zone's `roster` (an object, on a presence tick) and
     movers `dz` ([id, state] pairs) -- who is around it and whose look it does
     not hold.  `extra` is a list of ids (an arrival's).  Returns the `pl`
     object's JSON or null; marks them held.  Cheap when every one is held, as
     nearly always (_nearJoinHeld: a Set lookup and a number), the party read
     only when one is not.  `bySess` maps id -> session (built once a tick by the caller,
     lazily). */
  _nearJoinLooksJson(s, sps, plan, roster, dz, extra, bySess) {
    if (!s._looks || !sps) return null;
    let party;   /* read once, only if needed */
    let out = null;
    const consider = (id) => {
      if (id === s.id) return;
      const q = this.playerState[id];
      if (!q || this._nearJoinHeld(s, id, q)) return;
      if (party === undefined) party = this._presence2Party ? this._presence2Party(s.id) : null;
      if (!this._nearJoinAround(s, sps, id, q, party)) return;
      const e = this._nearJoinWhole(id, bySess ? bySess().get(id) : null);
      if (!e) return;
      (out || (out = [])).push(JSON.stringify(id) + ':' + JSON.stringify(e));
      s._looks.add(id);
    };
    if (plan) { for (const e of plan.list) if (!e[2]) consider(e[0]); }
    else {
      if (roster) for (const id in roster) consider(id);
      if (dz) for (const e of dz) consider(e[0]);
    }
    if (extra) for (const id of extra) consider(id);
    return out ? '{' + out.join(',') + '}' : null;
  },

  /* tick.js, on every roster (about once a second): what `_looks` no longer
     needs to say.  A look sent whole to this session is held anyway once its
     player's next whole relay has gone (`_lookWholeSeq` newer than the
     session's snapshot: _nearJoinHeld), and a player gone from the room is
     gone -- so both leave the set, and it holds only the looks sent in the last
     minute or so (every phone's look is relayed whole at least once a minute,
     LOOK_RELAY.FULL_EVERY_MS), plus the sparring clones and lingering bodies,
     which are never relayed.  Never pruned, a long session's set grew toward
     everyone it ever met: at 1,000 players 19.5 MB in all
     (tools/qa/load/memprobe.mjs). */
  _nearJoinPrune(s) {
    const L = s._looks;
    if (!L || L.size === 0) return;
    const snap = s._snapSeq || 0;
    for (const id of L) {
      const q = this.playerState[id];
      if (!q || (q._lookWholeSeq || 0) > snap) L.delete(id);
    }
  },

  /* tick.js: a near-join session that arrived somewhere (movement.js sets
     `_nearArrive` on a zone change) is sent, on its next tick, everyone around
     it whose look it does not hold -- not only this tick's movers -- so the
     players standing where it arrived are drawn at once, not at the next
     roster.  The ids, from the whole room. */
  _nearJoinArrivalIds(s, sps) {
    const ids = [];
    if (!sps) return ids;
    const party = this._presence2Party ? this._presence2Party(s.id) : null;
    for (const id of Object.keys(this.playerState)) {
      if (id === s.id) continue;
      const q = this.playerState[id];
      if (q && !this._nearJoinHeld(s, id, q) && this._nearJoinAround(s, sps, id, q, party)) ids.push(id);
    }
    return ids;
  },
};
