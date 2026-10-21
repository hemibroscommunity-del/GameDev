/* ═══ v2.3.3313: THE ALLIANCE (docs/specs/alliance.md) ═══
 *
 * Step 2 of the owner's party -> alliance plan.  The owner: "I think I'd
 * rather skip clans altogether and just go from party to alliances.  Maybe it
 * just gets called 'party' that stays persistent until you remove yourself
 * from the party and it becomes 'alliance' at 20+ people which opens up the
 * new features you're talking about", then "Go recommended" to the plan, and
 * after step 1 (the party that lasts, party.js) merged, "Push to main, then
 * keep going on recommended" to the four decisions this step waited on:
 *   1. wars are fought in No man's land under its existing rules, last 30
 *      minutes and pay only the members who fought;
 *   2. the name and tag are free, the leader's, changed at most once a day,
 *      unique across alliances and clans;
 *   3. the tag shows for an alliance;
 *   4. the leaderboard ranks alliances by active members, then total level.
 *
 * WHAT AN ALLIANCE IS.  A party (stored, up to 50) whose ACTIVE members reach
 * ALLIANCE.AT 20, and stays one until they fall below ALLIANCE.DROP 15, so a
 * party hovering at 20 does not flicker.  Active: played in the last
 * ACTIVE_MS 7 days (online now, or their `seen` in the party record) and
 * level ACTIVE_LEVEL 5 or more (ps.level, the three combat skills added up;
 * since v2.3.3538 the HIGHEST of the three, prog3.js -- a new character is 1,
 * so 5 is a weapon at level 5).
 * The count is taken when something could change it -- a member's join, a
 * member joining or leaving, a rename -- and on the party's vitals echo while
 * someone is on (a member reaching level 5 mid-visit).  Never by an alarm:
 * a party nobody is on changes at the next join (handoff rule 12).  Nothing
 * else about the party changes: the strip, the chat, dungeons four at a time.
 *
 * STORAGE (handoff rule 2's table):
 *   party:<id>      the party record (party.js) plus `ally` once it has been
 *                   an alliance: {on, since, name, tag, renamedAt}; such a
 *                   record is stamped v 2 (PARTY.V) -- an older worker leaves
 *                   it whole and its members unknown, never a party that
 *                   forgot its name;
 *   ally:<partyId>  the board's row, written WITH the record (_partyStore,
 *                   one synchronous run, so the two are one write batch) and
 *                   deleted with it: the name and tag, whether it is an
 *                   alliance, and each member's [last seen + 7 days, level],
 *                   so the board counts a party nobody is on without reading
 *                   its record (a dead alliance falls off by itself);
 *   ally_war:<id>   a war, while it runs and for WAR_RETENTION 48 h after
 *                   (its end is the next war's cooldown for both sides).
 *
 * THE TAG reaches everyone as the player key `allyTag` -- server-set only
 * (not a track or join key, so no phone can send one), in the snapshot and
 * list entries (index.js PEER_PUBLIC_KEYS, nearjoin.js LIST_KEYS), and a
 * change goes out as a player_update carrying the build keys the phone resets
 * from every player_update (the clans' v2.3.3240 lesson).
 *
 * KILL SWITCH: `alliance: false` in the live flags (and `partykeep: false`,
 * as it needs the stored party) -- no status, names, wars or board; tags come
 * off at the next vitals echo; a running war stands still until it is back.
 * A party that ends still clears its row (a name must not outlive it). */
import { PARTY } from './party.js';
import { NML } from './nomansland.js';

export const ALLIANCE = Object.freeze({
  AT: 20,                               // active members to become an alliance
  DROP: 15,                             // ...and the fewest it stays one at
  ACTIVE_MS: 7 * 24 * 3600 * 1000,      // "played in the last 7 days"
  ACTIVE_LEVEL: 5,                      // character level (ps.level)
  RENAME_MS: 24 * 3600 * 1000,          // a name or tag changes at most once a day
  NAME_MIN: 3,
  NAME_MAX: 16,                         // a clan's limits (clans.js)
  WAR_MS: 30 * 60 * 1000,               // a war lasts 30 minutes (the clans')
  WAR_COOLDOWN: 3600 * 1000,            // an hour's rest after one, both sides
  WAR_RETENTION: 48 * 3600 * 1000,      // an ended war kept this long (the clans')
  REWARD_WIN: 500,                      // gold to each winner who fought
  REWARD_LOSE: 50,                      // ...each loser who fought, and both sides on a draw
  BOARD_TOP: 20,
  BOARD_EVERY_MS: 5000,                 // one board answer every 5 s a player
  KILL_LOG: 50,
  ROW_V: 1,
  WAR_V: 1,
});

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const TAG_RE = /^[A-Z0-9]{1,4}$/;
/* control characters, and the invisible and direction-changing ones a name
   could use to pass for another */
const HIDDEN_RE = /[\x00-\x1f\x7f​-‏‪-‮⁠-⁩﻿]/g;

export function allyName(v) {
  if (typeof v !== 'string') return null;
  const s = v.slice(0, 64).replace(HIDDEN_RE, '').replace(/\s+/g, ' ').trim();
  return s.length >= ALLIANCE.NAME_MIN && s.length <= ALLIANCE.NAME_MAX ? s : null;
}

export function allyTagOk(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim().toUpperCase();
  return TAG_RE.test(s) ? s : null;
}

/* a stored `ally`, read back: only what this worker understands */
export function cleanAlly(a) {
  if (!a || typeof a !== 'object') return null;
  return {
    on: !!a.on,
    since: +a.since || 0,
    name: allyName(a.name),
    tag: allyTagOk(a.tag),
    renamedAt: +a.renamedAt || 0,
    /* v2.3.3321: a former clan (clanparty.js) -- its tag is worn below 20 */
    ...(a.clan ? { clan: 1 } : {}),
  };
}

/* The board's row from a party's stored shape (its members and the `meta`
   _partyStore writes).  `act`: each member who could count, as [the moment
   they stop counting, their level], latest first. */
export function allyRowOf(id, ally, members, meta) {
  const act = [];
  for (const m of members) {
    const x = meta && own(meta, m) ? meta[m] : null;
    const lv = x ? (x.level | 0) : 0;
    const seen = x ? (+x.seen || 0) : 0;
    if (lv >= ALLIANCE.ACTIVE_LEVEL && seen > 0) act.push([seen + ALLIANCE.ACTIVE_MS, lv]);
  }
  act.sort((a, b) => b[0] - a[0]);
  return {
    v: ALLIANCE.ROW_V, id, on: !!(ally && ally.on),
    name: (ally && ally.name) || null, tag: (ally && ally.tag) || null,
    since: (ally && +ally.since) || 0, members: members.length, act,
  };
}

/* A row as it stands now: its members still counting, their levels added up,
   and whether it is an alliance (only a stored alliance that still has DROP
   of them -- nobody is on it, or it would be in memory and its row fresh) */
export function allyRowLive(row, now) {
  let active = 0, total = 0;
  for (const e of (Array.isArray(row && row.act) ? row.act : [])) {
    if (Array.isArray(e) && e[0] > now) { active++; total += e[1] | 0; }
  }
  return { active, total, on: !!(row && row.on) && active >= ALLIANCE.DROP };
}

/* the board's order: active members, then their levels, then the oldest */
export function allyRank(a, b) {
  return (b.active - a.active) || (b.total - a.total) || ((a.since || 0) - (b.since || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export const allianceMethods = {
  _allyOn() {
    if (!this._partyKeepOn()) return false;
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'alliance') && !f.alliance);
  },

  _allyError(pid, reason, extra) {
    this._partySend(pid, 'alliance_error', Object.assign({ reason }, extra || {}));
  },

  /* Who counts now: an online member, or one seen in the last ACTIVE_MS, at
     ACTIVE_LEVEL or more.  `ids`: the members who count (the wire marks them). */
  _allyCount(p, now) {
    let active = 0, total = 0;
    const ids = new Set();
    for (const m of p.members) {
      const ps = this.playerState[m];
      const x = p.meta[m] || {};
      const lv = ps ? (Number(ps.level) || 0) : (x.level | 0);
      const seen = ps ? now : (+x.seen || 0);
      if (lv >= ALLIANCE.ACTIVE_LEVEL && seen > 0 && now - seen < ALLIANCE.ACTIVE_MS) {
        active++; total += lv; ids.add(m);
      }
    }
    return { active, total, ids };
  },

  /* Is it an alliance now?  Flips the status when the count says so (stored
     at once, with its row) and returns 'alliance' / 'party' when it flipped,
     else null.  The caller broadcasts (with `became`) and moves the tags. */
  _allyCheck(p, now) {
    if (!p || !this._allyOn() || !this._parties || this._parties.get(p.id) !== p) return null;
    const { active } = this._allyCount(p, now);
    const was = !!(p.ally && p.ally.on);
    const on = was ? active >= ALLIANCE.DROP : active >= ALLIANCE.AT;
    if (on === was) return null;
    const a = p.ally || { on: false, since: 0, name: null, tag: null, renamedAt: 0 };
    p.ally = Object.assign({}, a, { on, since: on ? now : a.since || 0 });
    this._partyStore(p);
    for (const m of p.members) if (this.playerState[m]) this._allySetTag(m);
    return on ? 'alliance' : 'party';
  },

  /* _partyStore's other half: the row, from what the record holds, in the
     same run (so in the same write batch) */
  _allyRowPut(p, storedMeta) {
    if (!p || !p.ally) return;
    const row = allyRowOf(p.id, p.ally, p.members, storedMeta);
    if (this._allyIndex) this._allyIndex.set(p.id, row);
    this._partyStorageDo('put', 'ally:' + p.id, row);
  },

  /* a party that ends takes its row, and so its name, with it */
  _allyRowDrop(partyId) {
    if (this._allyIndex) this._allyIndex.delete(partyId);
    this._partyStorageDo('delete', 'ally:' + partyId);
  },

  /* the tag a player wears: their party's, while it is an alliance -- or,
     v2.3.3321, while it is a former clan, an alliance or not (the owner's
     third decision: "former clans keep theirs below 20", clanparty.js) */
  _allyTagOf(pid) {
    if (!this._allyOn()) return null;
    const p = this._partyOf(pid);
    const a = p && p.ally;
    return a && (a.on || a.clan) && a.tag ? a.tag : null;
  },

  /* Put the right tag on a player (their state and session's look) and tell
     everyone else when it changed.  `force`: tell them even when it did not
     -- a join, after which every phone holds a fresh copy of them without it. */
  _allySetTag(pid, force) {
    const tag = this._allyTagOf(pid);
    const ps = this.playerState[pid];
    const had = (ps && ps.allyTag) || null;
    if (!force && had === tag) return;
    if (ps) { if (tag) ps.allyTag = tag; else delete ps.allyTag; }
    let ws = null, sess = null;
    for (const [w, s] of this.sessions) if (s.id === pid) { ws = w; sess = s; }   /* the last one is the live one (_wsBySessionId) */
    const sd = sess && sess.data;
    if (sd) { if (tag) sd.allyTag = tag; else delete sd.allyTag; }
    if (!tag && !had) return;
    /* null, not left out: the phone's merge is Object.assign (clans.js
       _clanRemoveMember) -- and the build keys, which the phone resets from
       every player_update */
    const d = { allyTag: tag };
    if (sd && sd.hg) d.hg = sd.hg;
    if (sd && sd.fr) d.fr = sd.fr;
    this.broadcastExcept(ws, { type: 'player_update', id: pid, data: d });
  },

  /* ═══ the index: every alliance's row, and the wars ═══
     Loaded once a worker's life, when something needs the whole list -- a
     member's join (wars to score), a rename (names to compare), a war, the
     board, a clan's creation (clans.js).  A read that throws loads nothing:
     the caller answers 'not-loaded' and the next one tries again. */
  async _allyEnsure() {
    if (this._allyIndex) { this._allyWarsLazy(Date.now()); return; }
    const st = this.state && this.state.storage;
    if (!st || typeof st.list !== 'function') {
      this._allyIndex = new Map(); this._allyWars = new Map(); this._allyEnds = new Map();
      return;
    }
    const index = new Map(), wars = new Map(), ends = new Map();
    const rows = await st.list({ prefix: 'ally:' });
    for (const [k, r] of rows) {
      const id = k.slice(5);
      if (!r || typeof r !== 'object' || r.id !== id) continue;
      /* a newer worker's row (a rollback): its name and tag stay taken, and
         nothing else of it is read -- off the board until it is back */
      const newer = (r.v | 0) > ALLIANCE.ROW_V;
      index.set(id, {
        v: ALLIANCE.ROW_V, id, on: !newer && !!r.on, name: allyName(r.name), tag: allyTagOk(r.tag),
        since: +r.since || 0, members: r.members | 0,
        act: !newer && Array.isArray(r.act) ? r.act.filter((e) => Array.isArray(e) && typeof e[0] === 'number').slice(0, PARTY.KEEP_MAX) : [],
      });
    }
    const now = Date.now();
    const list = await st.list({ prefix: 'ally_war:' });
    const side = (x) => x && typeof x === 'object' && typeof x.pid === 'string' && Array.isArray(x.members) && Array.isArray(x.fought);
    for (const [k, w] of list) {
      /* a newer worker's war is left whole (and unread); a broken one goes */
      if (w && typeof w === 'object' && (w.v | 0) > ALLIANCE.WAR_V) continue;
      if (!w || typeof w !== 'object' || !w.id || !side(w.a) || !side(w.b)) { this._partyStorageDo('delete', k); continue; }
      if (!Array.isArray(w.kills)) w.kills = [];
      if (w.status === 'active') { wars.set(w.id, w); continue; }
      const end = +w.endTime || 0;
      if (end <= now - ALLIANCE.WAR_RETENTION) { this._partyStorageDo('delete', k); continue; }
      for (const s of [w.a, w.b]) if (s && typeof s.pid === 'string') ends.set(s.pid, Math.max(ends.get(s.pid) || 0, end));
    }
    /* the parties in memory are newer than their stored rows only if a write
       is still in flight; theirs win either way */
    if (this._parties) for (const p of this._parties.values()) {
      if (p.ally) index.set(p.id, allyRowOf(p.id, p.ally, p.members, p.meta));
    }
    if (this._allyIndex) return;   /* another caller loaded it meanwhile */
    this._allyIndex = index;
    this._allyWars = wars;
    this._allyEnds = ends;
    this._allyWarsLazy(now);
  },

  /* is a name or tag someone else's?  'name' | 'tag' | null.  Every row, an
     alliance now or not (a name is kept while its party lasts), and every
     clan.  The caller has loaded both. */
  _allyTaken(name, tag, exceptPartyId) {
    const nl = name ? name.toLowerCase() : null;
    if (this._allyIndex) for (const r of this._allyIndex.values()) {
      if (r.id === exceptPartyId) continue;
      if (tag && r.tag === tag) return 'tag';
      if (nl && r.name && r.name.toLowerCase() === nl) return 'name';
    }
    if (this._clans) for (const c of this._clans.values()) {
      if (tag && c.tag === tag) return 'tag';
      if (nl && typeof c.name === 'string' && c.name.toLowerCase() === nl) return 'name';
    }
    return null;
  },

  /* alliance_name {name, tag}: the leader names their alliance.  The first is
     free; a change waits RENAME_MS from the last. */
  async _handleAllianceName(session, payload) {
    const pid = session && session.id;
    if (!pid) return;
    if (!this._allyOn()) return this._allyError(pid, 'off');
    const p = this._partyOf(pid);
    if (!p) return this._allyError(pid, 'no-party');
    if (p.leader !== pid) return this._allyError(pid, 'not-leader');
    const now = Date.now();
    const flip = this._allyCheck(p, now);
    if (flip) this._partyBroadcast(p, { became: flip });
    if (!p.ally || !p.ally.on) return this._allyError(pid, 'not-alliance', { active: this._allyCount(p, now).active, at: ALLIANCE.AT });
    const name = allyName(payload && payload.name);
    if (!name) return this._allyError(pid, 'bad-name');
    const tag = allyTagOk(payload && payload.tag);
    if (!tag) return this._allyError(pid, 'bad-tag');
    const a = p.ally;
    if (a.name === name && a.tag === tag) return this._partyBroadcast(p);
    if (a.name && a.renamedAt && now - a.renamedAt < ALLIANCE.RENAME_MS) {
      return this._allyError(pid, 'rename-wait', { ms: a.renamedAt + ALLIANCE.RENAME_MS - now });
    }
    try {
      await this._allyEnsure();
      if (typeof this._clansEnsure === 'function') await this._clansEnsure();
    } catch (e) { return this._allyError(pid, 'not-loaded'); }
    /* storage awaits only (rule 9), but the party is checked again */
    if (this._partyOf(pid) !== p || p.leader !== pid || !p.ally || !p.ally.on) return;
    const taken = this._allyTaken(name, tag, p.id);
    if (taken) return this._allyError(pid, taken === 'tag' ? 'tag-taken' : 'name-taken', { tag, name });
    p.ally = Object.assign({}, p.ally, { name, tag, renamedAt: now });
    this._partyStore(p);
    for (const m of p.members) if (this.playerState[m]) this._allySetTag(m);
    this._partyBroadcast(p, { renamed: 1 });
  },

  /* ═══ WARS ═══ */
  _allyWarOf(partyId) {
    if (!this._allyWars) return null;
    for (const w of this._allyWars.values()) {
      if (w.status === 'active' && (w.a.pid === partyId || w.b.pid === partyId)) return w;
    }
    return null;
  },

  /* ms until this party may fight again (an hour from its last war's end) */
  _allyWarWait(partyId, now) {
    const end = (this._allyEnds && this._allyEnds.get(partyId)) || 0;
    return Math.max(0, end + ALLIANCE.WAR_COOLDOWN - now);
  },

  _allyOnWarRoster(pid) {
    if (!this._allyWars) return false;
    for (const w of this._allyWars.values()) {
      if (w.status === 'active' && (w.a.members.includes(pid) || w.b.members.includes(pid))) return true;
    }
    return false;
  },

  /* what a party's window says of its war */
  _allyWarWire(w, partyId, now) {
    const us = w.a.pid === partyId ? 'a' : 'b';
    const them = us === 'a' ? 'b' : 'a';
    return {
      us: w[us].score,
      them: { tag: w[them].tag, name: w[them].name, score: w[them].score },
      endsIn: Math.max(0, w.endTime - now),
      fought: w[us].fought.length,
      kills: w.kills.slice(-5).map((k) => ({ k: k.k, v: k.v, mine: k.s === us })),
    };
  },

  /* alliance_war {tag}: the leader declares war on another alliance. */
  async _handleAllianceWar(session, payload) {
    const pid = session && session.id;
    if (!pid) return;
    if (!this._allyOn()) return this._allyError(pid, 'off');
    const p = this._partyOf(pid);
    if (!p) return this._allyError(pid, 'no-party');
    if (p.leader !== pid) return this._allyError(pid, 'not-leader');
    let now = Date.now();
    const flip = this._allyCheck(p, now);
    if (flip) this._partyBroadcast(p, { became: flip });
    if (!p.ally || !p.ally.on) return this._allyError(pid, 'not-alliance', { active: this._allyCount(p, now).active, at: ALLIANCE.AT });
    if (!p.ally.tag) return this._allyError(pid, 'no-name');
    const tag = allyTagOk(payload && payload.tag);
    if (!tag) return this._allyError(pid, 'bad-tag');
    if (tag === p.ally.tag) return this._allyError(pid, 'self');
    try { await this._allyEnsure(); } catch (e) { return this._allyError(pid, 'not-loaded'); }
    let row = null;
    for (const r of this._allyIndex.values()) if (r.tag === tag && r.id !== p.id) { row = r; break; }
    if (!row) return this._allyError(pid, 'no-such', { tag });
    /* the other side as it stands: in memory (someone is on it), or its
       stored record (nobody is: counted from its meta) */
    let q = this._parties && this._parties.get(row.id);
    let qMembers, qOn, qName;
    if (q) {
      const f2 = this._allyCheck(q, now);
      if (f2) this._partyBroadcast(q, { became: f2 });
      qOn = !!(q.ally && q.ally.on && q.ally.tag === tag);
      qMembers = q.members.slice();
      qName = q.ally && q.ally.name;
    } else {
      let rec;
      try { rec = await this.state.storage.get('party:' + row.id); } catch (e) { return this._allyError(pid, 'not-loaded'); }
      if (!rec || typeof rec !== 'object' || rec.id !== row.id || !Array.isArray(rec.members) || (rec.v | 0) > PARTY.V) {
        return this._allyError(pid, 'no-such', { tag });
      }
      const ra = cleanAlly(rec.ally);
      qMembers = rec.members.filter((m) => typeof m === 'string' && m);
      const live = allyRowLive(allyRowOf(row.id, ra, qMembers, rec.meta && typeof rec.meta === 'object' ? rec.meta : null), now);
      qOn = !!(ra && ra.tag === tag && live.on);
      qName = ra && ra.name;
      q = null;
    }
    /* checked again after the awaits */
    now = Date.now();
    if (this._partyOf(pid) !== p || p.leader !== pid || !p.ally || !p.ally.on || p.ally.tag === tag) return;
    if (!qOn) return this._allyError(pid, 'not-alliance-them', { tag });
    if (this._allyWarOf(p.id)) return this._allyError(pid, 'at-war');
    if (this._allyWarOf(row.id)) return this._allyError(pid, 'them-at-war', { tag });
    const waitUs = this._allyWarWait(p.id, now), waitThem = this._allyWarWait(row.id, now);
    if (waitUs > 0) return this._allyError(pid, 'rest', { ms: waitUs });
    if (waitThem > 0) return this._allyError(pid, 'rest-them', { ms: waitThem, tag });
    /* rosters frozen now; a player already on another war's roster (one who
       changed party mid-war) fights only that one */
    const roster = (ids) => ids.filter((m) => !this._allyOnWarRoster(m));
    const w = {
      v: ALLIANCE.WAR_V, id: crypto.randomUUID(), status: 'active',
      startTime: now, endTime: now + ALLIANCE.WAR_MS,
      a: { pid: p.id, tag: p.ally.tag, name: p.ally.name || p.ally.tag, score: 0, members: roster(p.members), fought: [] },
      b: { pid: row.id, tag, name: qName || tag, score: 0, members: roster(qMembers), fought: [] },
      kills: [],
    };
    this._allyWars.set(w.id, w);
    this._partyStorageDo('put', 'ally_war:' + w.id, w);
    this._partyBroadcast(p, { war: 'start' });
    if (q) this._partyBroadcast(q, { war: 'start' });
  },

  /* The death (index.js _handlePlayerDeath, beside the clans' _warOnDeath; a
     duel's kill never comes here): a kill under No man's land's rule by one
     roster on the other scores.  The rule's own test, as _nmlOnDeath reads
     it: the killing blow came through it in the last KILL_BLOW_MS. */
  _allyWarOnDeath(ps, victimId, cause) {
    if (!this._allyWars || !this._allyWars.size || !this._allyOn()) return;
    if (typeof cause !== 'string' || !cause.startsWith('pvp:')) return;
    if (this._nmlOff && this._nmlOff()) return;
    const killerId = cause.slice(4);
    const now = Date.now();
    if (!ps || ps._nmlLastHitBy !== killerId || !(now - (ps._nmlLastHitAt || 0) <= NML.KILL_BLOW_MS)) return;
    const pk = this._partyOf(killerId), pv = this._partyOf(victimId);
    if (!pk || !pv || pk.id === pv.id) return;
    for (const w of this._allyWars.values()) {
      if (w.status !== 'active' || now >= w.endTime) continue;
      const side = w.a.pid === pk.id ? 'a' : w.b.pid === pk.id ? 'b' : null;
      if (!side) continue;
      const other = side === 'a' ? 'b' : 'a';
      if (w[other].pid !== pv.id) continue;
      if (!w[side].members.includes(killerId) || !w[other].members.includes(victimId)) return;
      w[side].score += 1;
      for (const [sd, id] of [[side, killerId], [other, victimId]]) if (!w[sd].fought.includes(id)) w[sd].fought.push(id);
      w.kills.push({ k: String(this._partyNameOf(killerId)).slice(0, PARTY.NAME_MAX), v: String(this._partyNameOf(victimId)).slice(0, PARTY.NAME_MAX), s: side, ts: now });
      if (w.kills.length > ALLIANCE.KILL_LOG) w.kills.splice(0, w.kills.length - ALLIANCE.KILL_LOG);
      this._partyStorageDo('put', 'ally_war:' + w.id, w);
      this._partyBroadcast(pk, { war: 'kill' });
      this._partyBroadcast(pv, { war: 'kill' });
      return;
    }
  },

  _tickAllyWars(now) {
    if (!this._allyWars || !this._allyWars.size || !this._allyOn()) return;
    this._allyWarsLazy(now);
  },

  /* rule 12: a war that ended while nobody was on ends at the next look */
  _allyWarsLazy(now) {
    if (!this._allyWars || !this._allyOn()) return;
    for (const w of [...this._allyWars.values()]) {
      if (w.status === 'active' && now >= w.endTime) this._allyResolveWar(w);
    }
  },

  /* The end: the side with more kills wins; the roster members who fought
     and are still in the party are paid (500 / 50, 50 each on a draw, nobody
     on 0-0: the clans' v2.3.3180 rule), one opId a member a war. */
  _allyResolveWar(w) {
    if (w.status !== 'active') return;
    w.status = 'ended';
    this._allyWars.delete(w.id);
    const win = w.a.score > w.b.score ? 'a' : w.b.score > w.a.score ? 'b' : null;
    const noKills = !(w.a.score > 0) && !(w.b.score > 0);
    const end = +w.endTime || Date.now();
    if (!this._allyEnds) this._allyEnds = new Map();
    for (const s of [w.a, w.b]) this._allyEnds.set(s.pid, Math.max(this._allyEnds.get(s.pid) || 0, end));
    const st = this.state && this.state.storage;
    (async () => {
      const paid = { a: [], b: [] };
      try {
        for (const sd of ['a', 'b']) {
          if (noKills) break;
          const side = w[sd];
          const amount = win && sd === win ? ALLIANCE.REWARD_WIN : ALLIANCE.REWARD_LOSE;
          for (const id of side.members) {
            if (!side.fought.includes(id)) continue;
            /* still in the party: their own word (the index), in memory when
               their party is, else as stored */
            let inIt;
            if (this._partyByPlayer && this._partyByPlayer.has(id)) inIt = this._partyByPlayer.get(id).id === side.pid;
            else inIt = !!st && (await st.get('party_by_player:' + id)) === side.pid;
            if (!inIt) continue;
            /* a 'dup' was paid by an earlier try (a restart mid-payment) */
            await this._creditPlayer(id, {
              opId: 'allywar:' + w.id + ':' + id, source: 'allywar', kind: 'gold',
              payload: { amount },
              note: 'alliance war vs [' + w[sd === 'a' ? 'b' : 'a'].tag + ']' + (win ? (sd === win ? ' — victory' : ' — defeat') : ' — draw'),
            });
            paid[sd].push(id);
          }
        }
        w.paid = { a: paid.a.slice(), b: paid.b.slice() };
        this._partyStorageDo('put', 'ally_war:' + w.id, w);
      } catch (e) { /* opIds make a retry safe; the war is ended either way */ }
      for (const sd of ['a', 'b']) {
        const side = w[sd];
        const other = w[sd === 'a' ? 'b' : 'a'];
        const party = this._parties && this._parties.get(side.pid);
        const amount = win && sd === win ? ALLIANCE.REWARD_WIN : ALLIANCE.REWARD_LOSE;
        if (!party) continue;
        for (const id of party.members) {
          if (!this.playerState[id]) continue;
          this._partySend(id, 'alliance_war_end', {
            won: win ? sd === win : null, us: side.score, them: other.score, vs: other.tag,
            paid: paid[sd].includes(id) ? amount : 0,
          });
        }
        this._partyBroadcast(party, { war: 'end' });
      }
    })();
  },

  /* alliance_board: every alliance, the top BOARD_TOP, and yours */
  async _handleAllianceBoard(session) {
    const pid = session && session.id;
    if (!pid) return;
    if (!this._allyOn()) return this._allyError(pid, 'off');
    const now = Date.now();
    if (session._allyBoardAt && now - session._allyBoardAt < ALLIANCE.BOARD_EVERY_MS) return;
    session._allyBoardAt = now;
    try { await this._allyEnsure(); } catch (e) { session._allyBoardAt = 0; return this._allyError(pid, 'not-loaded'); }
    const all = [];
    for (const r of this._allyIndex.values()) {
      /* a party in memory is counted as its own window counts it; one nobody
         is on, from its row */
      const p = this._parties && this._parties.get(r.id);
      let live;
      if (p && p.ally) {
        const c = this._allyCount(p, now);
        live = { active: c.active, total: c.total, on: !!p.ally.on };
      } else live = allyRowLive(r, now);
      if (!live.on) continue;
      all.push({ id: r.id, name: r.name, tag: r.tag, active: live.active, total: live.total, members: p ? p.members.length : r.members, since: r.since });
    }
    all.sort(allyRank);
    const out = (r) => ({ name: r.name, tag: r.tag, active: r.active, total: r.total, members: r.members });
    const p = this._partyOf(pid);
    const at = p ? all.findIndex((r) => r.id === p.id) : -1;
    this._partySend(pid, 'alliance_rows', {
      rows: all.slice(0, ALLIANCE.BOARD_TOP).map(out),
      n: all.length,
      mine: at >= 0 ? Object.assign({ rank: at + 1 }, out(all[at])) : null,
    });
  },
};
