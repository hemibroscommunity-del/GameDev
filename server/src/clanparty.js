/* ═══ v2.3.3320: STEP 3 -- CLANS BECOME PARTIES (docs/specs/alliance.md
 * "Step 3: clans become parties") ═══
 *
 * The owner: "skip clans altogether and just go from party to alliances ...
 * 'party' that stays persistent until you remove yourself from the party and
 * it becomes 'alliance' at 20+ people", then "Go recommended" to the plan's
 * five recommendations, of which this is the third step (1: a party that
 * lasts, v2.3.3284; 2: the alliance, v2.3.3313).
 *
 * - NO NEW CLANS.  clan_create, clan_join_accept and clan_war_declare are
 *   refused ("Clans are parties now"), and a clan_invite is no longer relayed
 *   (index.js) -- an old phone's card would invite to a clan that cannot be
 *   joined.
 * - EVERY CLAN BECOMES A STORED PARTY, ONCE (`_clanPartyConvertAll`, from
 *   _clansEnsure, which every join awaits): the clan's members in no party
 *   yet form one -- its leader leading if they are among them, else its
 *   oldest member -- and the party carries the clan's name and tag as its
 *   `ally` with `clan: 1`.  The clan's records (`clan:`, `clan_by_player:`)
 *   go in the SAME synchronous run as the party's writes, so storage holds
 *   one or the other, never both and never neither (one write batch).  A
 *   member already in a party keeps theirs; a clan left with fewer than two
 *   members is no party, and its records simply go, freeing its name and tag.
 *   One-way: a clan holds nothing a party lacks (no gold, and its wars need
 *   the old lands, which are closed).
 * - A FORMER CLAN WEARS ITS TAG BELOW 20 (the owner's third alliance
 *   decision): alliance.js `_allyTagOf` gives the tag while `ally.clan`, an
 *   alliance or not; it is renamed only as an alliance (20 active), as any.
 * - A clan at war waits for its war's end (`_clanPartyAfterWar`, called by
 *   clans.js _resolveClanWar once its own writes are done).
 * - `clanparty: false` in the live flags is the kill switch: no conversion,
 *   and clans work as they did (create, join, wars).  A clan already turned
 *   into a party stays one.  It needs `partykeep` (a party is stored). */
import { PARTY } from './party.js';
import { allyName, allyTagOk } from './alliance.js';

export const CLAN_PARTY = {
  /* the refusal every clan request gets now (clan_error's `text`) */
  REFUSE: 'Clans are parties now: make a party in the Saloon',
};

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export const clanPartyMethods = {
  /* the live flags, loaded if nothing has loaded them yet; false when they
     cannot be read (nothing is converted on a guess) */
  async _clanPartyFlagsLoaded() {
    if (this._liveFlags) return true;
    if (typeof this._liveFlagsEnsure !== 'function') return true;
    try { await this._liveFlagsEnsure(); return true; } catch (e) { return false; }
  },

  _clanPartyOn() {
    const f = this._liveFlags;
    if (f && typeof f === 'object' && own(f, 'clanparty') && !f.clanparty) return false;
    return typeof this._partyKeepOn === 'function' ? this._partyKeepOn() : false;
  },

  /* Every clan that can be turned into a party now, is.  Once a worker's life
     in practice (the registry's first load), and again whenever the switch is
     turned on with clans still in memory.  Never two passes at once: a join
     arriving mid-pass goes on (its party reaches it by party_state when the
     pass gets to its clan). */
  async _clanPartyConvertAll() {
    if (!this._clans || !this._clans.size || this._clanPartyBusy) return;
    /* the switch is read before anything is turned -- a join reaches the clan
       registry before it loads the live flags (join.js), so a room's first
       join would otherwise convert with `clanparty: false` on file */
    if (!(await this._clanPartyFlagsLoaded()) || !this._clanPartyOn()) return;
    this._clanPartyBusy = true;
    try {
      /* the alliances' names and tags (a converted clan's must not collide:
         _allyTaken), loaded first */
      if (typeof this._allyEnsure === 'function') {
        try { await this._allyEnsure(); } catch (e) { return; }   /* the next load tries again */
      }
      const atWar = new Set();
      for (const w of (this._clanWars ? this._clanWars.values() : [])) {
        if (w && w.status === 'active') {
          if (w.challenger) atWar.add(w.challenger.clanId);
          if (w.defender) atWar.add(w.defender.clanId);
        }
      }
      for (const clan of [...this._clans.values()]) {
        if (!clan || atWar.has(clan.id) || (this._clanRestPending && this._clanRestPending.has(clan.id))) continue;
        try { await this._clanToParty(clan); } catch (e) { /* stays a clan until the next load */ }
        if (!this._clanPartyOn()) break;
      }
    } finally {
      this._clanPartyBusy = false;
    }
  },

  /* _resolveClanWar's tail: the two clans of a war that has just ended, once
     its own writes (their rest, the payments) are done */
  async _clanPartyAfterWar(clans) {
    if (!(await this._clanPartyFlagsLoaded()) || !this._clanPartyOn()) return;
    if (typeof this._allyEnsure === 'function') {
      try { await this._allyEnsure(); } catch (e) { return; }
    }
    for (const c of clans || []) {
      const live = c && this._clans && this._clans.get(c.id);
      if (live) { try { await this._clanToParty(live); } catch (e) { /* the next load */ } }
    }
  },

  /* One clan -> a stored party (or nothing).  Storage reads first (who is in
     a party already, everyone's name), then ONE synchronous run of writes. */
  async _clanToParty(clan) {
    const st = this.state && this.state.storage;
    if (!st || !clan || !clan.id) return null;
    const members = [];
    for (const m of (Array.isArray(clan.members) ? clan.members : [])) {
      if (typeof m === 'string' && m && m.length <= 64 && !members.includes(m)) members.push(m);
    }
    let idx = null, chars = null;
    if (members.length) {
      /* at most 20 keys a read (CLANS.MAX_MEMBERS), under storage's 128 */
      idx = await st.get(members.map((m) => 'party_by_player:' + m));
      chars = await st.get(members.map((m) => 'char:' + m));
    }
    /* the clan may have gone while those were read (a war, a leave) */
    if (!this._clans || this._clans.get(clan.id) !== clan || !this._clanPartyOn()) return null;
    if (!this._parties) this._parties = new Map();
    if (!this._partyByPlayer) this._partyByPlayer = new Map();
    const inParty = (m) => this._partyByPlayer.has(m)
      || (this._partyUnknownIds && this._partyUnknownIds.has(m))
      || !!(idx instanceof Map && idx.get('party_by_player:' + m));
    const free = members.filter((m) => !inParty(m));
    const now = Date.now();
    /* ═══ ONE RUN: no await from here to the end of the writes ═══ */
    /* the clan leaves the registry first: its own name and tag must not read
       as taken below */
    this._clans.delete(clan.id);
    for (const m of members) if (this._clanByPlayer && this._clanByPlayer.get(m) === clan.id) this._clanByPlayer.delete(m);
    let p = null;
    if (free.length >= 2) {
      const name = allyName(clan.name);
      const tag = allyTagOk(clan.tag);
      /* a name or tag an alliance already holds stays with the alliance (it
         cannot happen while the two are checked against each other -- clans.js
         and alliance.js both look -- but a record from before that rule could) */
      const taken = typeof this._allyTaken === 'function' ? this._allyTaken(name, tag, null) : null;
      p = {
        id: crypto.randomUUID(),
        leader: free.includes(clan.leaderId) ? clan.leaderId : free[0],
        members: free,
        meta: Object.create(null),   /* keyed by player ids (the party meta lesson, v2.3.1185) */
        ts: +clan.createdAt || now,
        lastVitals: 0,
        ally: { on: false, since: 0, name: taken === 'name' ? null : name, tag: taken === 'tag' ? null : tag, renamedAt: 0, clan: 1 },
      };
      for (const m of free) {
        const ps = this.playerState[m];
        const ch = chars instanceof Map ? chars.get('char:' + m) : null;
        const nm = ps ? this._partyNameOf(m) : (ch && typeof ch.name === 'string' && ch.name.trim()) || 'Bro';
        /* a member online now counts toward the alliance from now; the rest
           from their next join (their level and `seen` are not known) */
        p.meta[m] = { name: String(nm).slice(0, PARTY.NAME_MAX), level: (ps && ps.level) | 0 || 1, at: +clan.createdAt || now, seen: ps ? now : 0 };
      }
      this._parties.set(p.id, p);
      for (const m of free) { this._partyByPlayer.set(m, p); this._partyIndexPut(m, p.id); }
      this._partyStore(p);
    }
    /* the clan's own records go in the same run */
    const del = (k) => { try { const pr = st.delete(k); if (pr && typeof pr.catch === 'function') pr.catch(() => {}); } catch (e) { /* the next load */ } };
    del('clan:' + clan.id);
    for (const m of members) del('clan_by_player:' + m);
    /* ═══ the run ends: tell whoever is here ═══ */
    for (const m of members) {
      if (!this.playerState[m]) continue;
      if (typeof this._clanUntag === 'function') this._clanUntag(m);
    }
    if (p) {
      for (const m of p.members) if (this.playerState[m] && this._allySetTag) this._allySetTag(m, true);
      this._partyBroadcast(p, { fromClan: 1 });
    }
    return p;
  },
};
