/* ═══ v2.3.4490: ACCURACY -- HOW MANY OF YOUR SHOTS HIT, A WEAPON ═══
 *
 * The owner, 2026-11-10: "I want somewhere that stats keep track of
 * 'accuracy' (maybe for all 3 weapon types) like the amount of times the
 * projectile hit on target.  Now that it's a swipe I expect the accuracy of
 * bow to go down but that's why I increased speed by 25%."
 *
 * The worker only ever heard about HITS (`monster_damage`, `player_attack`):
 * a shot that missed was never sent.  So:
 *
 *   SHOTS are the phone's count.  Every basic sword swing, arrow and staff
 *   bolt is numbered on the phone as it starts (src/game/accuracy.js), a
 *   weapon; the counts ride the `track` the phone already sends (`ac: [sword,
 *   bow, staff]`, since this join) -- no message of their own.  Read here
 *   and nowhere else: `ac` is not a look key, so it is never stored on the
 *   player or relayed.  Bounded: a report may claim SHOTS_PER_S a second
 *   since the last (the quickest honest shot is every 200 ms) and a backlog
 *   of SHOTS_BURST.
 *
 *   HITS are the worker's.  A hit claim carries its shot's number (`sn`),
 *   and a claim the worker ACCEPTED -- past every gate of combat.js, where
 *   the monster's or the player's health is taken -- counts once a shot: an
 *   arrow that pierces three monsters, a swing that catches two, is one hit.
 *   Specials are not counted either way (no `sn`), nor the chips of a
 *   volley's stuck arrows.
 *
 * So the hit count is honest and the shot count is the phone's word: a
 * modified phone can report fewer shots and read a better number.  ACCURACY
 * IS A STAT TO LOOK AT.  It pays nothing and ranks nothing, and must not.
 *
 * WHAT IS KEPT (its own keys: handoff rule 1, never the rpg blob):
 *   acc:<pid>        {v, w: {melee|ranged|staff: {s, h, r}}, at} -- shots and
 *                    hits for good, and `r`, the last BUCKETS x BUCKET shots
 *                    in buckets of [shots, hits], newest last ("your last
 *                    200").  Written at most every FLUSH_MS while you fight,
 *                    and as you leave; standing and walking write nothing.
 *   accday:<yyyymmdd> {v, melee|ranged|staff: [s, h]} -- every player's, a
 *                    UTC day, for the owner (the Test panel's Accuracy box:
 *                    did the bow's swipe lower it?).  A character in test
 *                    mode is left out of the day's totals.  DAY_KEEP days.
 *
 * THE WIRE:
 *   track.data.ac        [n, n, n]      phone -> worker, riding `track`.
 *   monster_damage.sn, player_attack.sn   the shot a hit claim belongs to.
 *   acc_request {}                      phone -> worker (the Journey page).
 *   acc_state {w} | {off: true}         PRIVILEGED (index.js).
 *   caps.accuracy                       advertised (join.js); the phone
 *       counts and asks only against a worker that says so.  Kill switch
 *       `accuracy: false` in the live flags: un-advertises the cap, counts
 *       nothing, answers {off: true} (what is stored stays).
 *
 * Suite: server/test/accuracy.test.mjs.  Spec: docs/specs/accuracy.md. */

export const ACC = Object.freeze({
  V: 1,
  SLOTS: Object.freeze(['melee', 'ranged', 'staff']),
  BUCKET: 50,
  BUCKETS: 4,
  SHOTS_PER_S: 8,
  SHOTS_BURST: 40,
  SN_KEEP: 24,                 /* the shots whose hits are remembered, a weapon (arrows land out of order) */
  FLUSH_MS: 5 * 60 * 1000,
  DAY_KEEP: 60,
  COUNT_MAX: 1e9,
});
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const int = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
export const accKey = (pid) => 'acc:' + pid;
export const accDayKey = (day) => 'accday:' + day;

/** The UTC day of `ts`, 'yyyymmdd'. */
export function accDay(ts) {
  const d = new Date(Number(ts) || 0);
  const p = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate());
}

const blankSlot = () => ({ s: 0, h: 0, r: [] });
export function accBlank() {
  return { v: ACC.V, w: { melee: blankSlot(), ranged: blankSlot(), staff: blankSlot() }, at: 0 };
}

/** A stored record made safe to read: whole numbers, hits never past shots, the buckets as they should be. */
export function accNormalize(raw) {
  const out = accBlank();
  if (!raw || typeof raw !== 'object' || !raw.w || typeof raw.w !== 'object') return out;
  for (const slot of ACC.SLOTS) {
    const a = raw.w[slot];
    if (!a || typeof a !== 'object') continue;
    const s = int(a.s, 0, ACC.COUNT_MAX), h = Math.min(s, int(a.h, 0, ACC.COUNT_MAX));
    const r = [];
    for (const b of (Array.isArray(a.r) ? a.r.slice(-ACC.BUCKETS) : [])) {
      if (!Array.isArray(b)) continue;
      const bs = int(b[0], 0, ACC.BUCKET), bh = Math.min(bs, int(b[1], 0, ACC.BUCKET));
      if (bs > 0) r.push([bs, bh]);
    }
    out.w[slot] = { s, h, r };
  }
  out.at = int(raw.at, 0, Number.MAX_SAFE_INTEGER);
  return out;
}

/** `shots` more shots and `hits` more hits of `slot` into `rec`.  Returns the hits that found no shot to belong
 *  to (a hit whose shot's report has not come yet): the caller keeps them for the next time. */
export function accAdd(rec, slot, shots, hits) {
  const a = rec && rec.w && rec.w[slot];
  if (!a) return 0;
  shots = int(shots, 0, ACC.COUNT_MAX); hits = int(hits, 0, ACC.COUNT_MAX);
  a.s = Math.min(ACC.COUNT_MAX, a.s + shots);
  let left = shots;
  while (left > 0) {
    let b = a.r[a.r.length - 1];
    if (!b || b[0] >= ACC.BUCKET) { b = [0, 0]; a.r.push(b); }
    const take = Math.min(left, ACC.BUCKET - b[0]);
    b[0] += take; left -= take;
  }
  const take = Math.min(hits, a.s - a.h);
  a.h += take;
  /* into the newest buckets with room: a hit lands a moment after its shot */
  let put = take;
  for (let i = a.r.length - 1; i >= 0 && put > 0; i--) {
    const room = a.r[i][0] - a.r[i][1];
    const t = Math.min(room, put);
    a.r[i][1] += t; put -= t;
  }
  if (a.r.length > ACC.BUCKETS) a.r.splice(0, a.r.length - ACC.BUCKETS);
  return hits - take;
}

/** What the phone is shown: a weapon, shots and hits for good and over the last buckets. */
export function accView(rec) {
  const out = {};
  for (const slot of ACC.SLOTS) {
    const a = (rec && rec.w && rec.w[slot]) || blankSlot();
    let rs = 0, rh = 0;
    for (const b of a.r) { rs += b[0]; rh += b[1]; }
    out[slot] = { s: a.s, h: a.h, rs, rh };
  }
  return out;
}

const blankPairs = () => ({ melee: [0, 0], ranged: [0, 0], staff: [0, 0] });
/** A stored day made safe to read. */
export function accDayNormalize(raw) {
  const out = { v: ACC.V, ...blankPairs() };
  if (!raw || typeof raw !== 'object') return out;
  for (const slot of ACC.SLOTS) {
    const p = raw[slot];
    if (!Array.isArray(p)) continue;
    const s = int(p[0], 0, Number.MAX_SAFE_INTEGER);
    out[slot] = [s, Math.min(s, int(p[1], 0, Number.MAX_SAFE_INTEGER))];
  }
  return out;
}

export const accuracyMethods = {
  /* the kill switch, read the lower-case way (TRAPS §117) */
  _accOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'accuracy') && !f.accuracy);
  },
  _accOn() { return !this._accOff(); },   /* the caps literal reads a method call (caps-audit) */

  /* A player's counts since they came in, not yet written: { d: shots and hits a weapon, seen: the phone's last
     report, sn: the shots that have hit, dirty }.  The room's, by player id (a Map: the id is the client's). */
  _accEntry(pid, now) {
    if (!this._accBook) this._accBook = new Map();
    let e = this._accBook.get(pid);
    if (!e) {
      e = { d: blankPairs(), seen: [0, 0, 0], seenAt: now || Date.now(), sn: { melee: [], ranged: [], staff: [] }, dirty: false, flushedAt: now || Date.now() };
      this._accBook.set(pid, e);
    }
    return e;
  },

  /* A join (and a rejoin): the phone starts its counts again from nothing (src/game/accuracy.js accReset, at
     state_sync), so the worker's copy of them does too.  What was counted and not yet written is kept. */
  _accJoin(pid, now) {
    try {
      if (!pid || this._accOff()) return;
      const e = this._accEntry(pid, now);
      e.seen = [0, 0, 0];
      e.seenAt = now || Date.now();
      e.sn = { melee: [], ranged: [], staff: [] };
    } catch (err) { /* a count must never stop a join */ }
  },

  _accDayAdd(pid, slot, shots, hits, now) {
    const ps = this.playerState ? this.playerState[pid] : null;
    if (ps && typeof this._testMode === 'function' && this._testMode(ps)) return;   /* the owner's testing is not the players' aim */
    const day = accDay(now);
    if (!this._accDayBook || this._accDayBook.day !== day) {
      /* a new day: yesterday's unwritten counts go with the next flush, under yesterday's key */
      if (this._accDayBook && this._accDayBook.dirty) (this._accDayOld || (this._accDayOld = [])).push(this._accDayBook);
      this._accDayBook = { day, d: blankPairs(), dirty: false };
    }
    this._accDayBook.d[slot][0] += shots;
    this._accDayBook.d[slot][1] += hits;
    this._accDayBook.dirty = true;
  },

  /* ═══ the phone's shot counts, riding its `track` (index.js) ═══ */
  async _accShots(session, ac, now) {
    try { await this._accShotsIn(session, ac, now); } catch (err) { /* a count must never stop the track it rides */ }
  },
  async _accShotsIn(session, ac, now) {
    const pid = session && session.id;
    if (!pid || !Array.isArray(ac) || this._accOff() || !this.playerState || !this.playerState[pid]) return;
    /* three whole counts or nothing: a report that is not one is not read as "the page began again" */
    if (ac.length !== ACC.SLOTS.length || !ac.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= ACC.COUNT_MAX)) return;
    now = now || Date.now();
    const e = this._accEntry(pid, now);
    const dt = Math.max(0, now - e.seenAt) / 1000;
    let room = Math.floor(ACC.SHOTS_BURST + dt * ACC.SHOTS_PER_S);
    for (let i = 0; i < ACC.SLOTS.length; i++) {
      const slot = ACC.SLOTS[i];
      const v = int(ac[i], 0, ACC.COUNT_MAX);
      const delta = v - e.seen[i];
      e.seen[i] = v;
      if (delta <= 0) continue;   /* (less than before: a page that began again; counted from here) */
      const take = Math.min(delta, room);
      if (take <= 0) continue;
      room -= take;
      e.d[slot][0] += take;
      e.dirty = true;
      this._accDayAdd(pid, slot, take, 0, now);
    }
    e.seenAt = now;
    if (e.dirty && now - e.flushedAt >= ACC.FLUSH_MS) await this._accFlush(pid, e, now);
  },

  /* ═══ a hit the worker accepted (combat.js, where the health is taken) ═══
     Once a shot: `sn` is the shot's number on the phone, a weapon.  A special carries none. */
  _accHit(pid, slot, special, sn, now) {
    try { this._accHitIn(pid, slot, special, sn, now); } catch (err) { /* a count must never stop a hit */ }
  },
  _accHitIn(pid, slot, special, sn, now) {
    if (!pid || special || this._accOff()) return;
    if (slot !== 'melee' && slot !== 'ranged' && slot !== 'staff') return;
    const n = Math.floor(Number(sn));
    if (!(n > 0) || n > ACC.COUNT_MAX) return;
    const e = this._accEntry(pid, now);
    const seen = e.sn[slot];
    if (seen.indexOf(n) >= 0) return;                     /* this shot has hit already (it pierced; the swing caught two) */
    if (seen.length && n < seen[0] - ACC.SN_KEEP) return;   /* far older than any remembered: not a shot still in the air */
    seen.push(n);
    seen.sort((a, b) => a - b);
    if (seen.length > ACC.SN_KEEP) seen.splice(0, seen.length - ACC.SN_KEEP);
    e.d[slot][1] += 1;
    e.dirty = true;
    this._accDayAdd(pid, slot, 0, 1, now || Date.now());
  },

  /* The unwritten counts into a record (a copy of the stored one); hits with no shot yet stay in the entry. */
  _accMerge(rec, e) {
    for (const slot of ACC.SLOTS) {
      const left = accAdd(rec, slot, e.d[slot][0], e.d[slot][1]);
      e.d[slot][0] = 0;
      e.d[slot][1] = left;
    }
    return rec;
  },

  /* Write a player's counts, and the day's with them (one more row at most). */
  async _accFlush(pid, e, now) {
    now = now || Date.now();
    e.flushedAt = now;
    if (!e.dirty) return;
    e.dirty = false;
    try {
      const rec = accNormalize(await this.state.storage.get(accKey(pid)));
      this._accMerge(rec, e);
      rec.at = now;
      await this.state.storage.put(accKey(pid), rec);
      if (ACC.SLOTS.some((s) => e.d[s][1] > 0)) e.dirty = true;   /* hits still waiting for their shots */
    } catch (err) { e.dirty = true; }
    await this._accDayFlush();
  },

  async _accDayFlush() {
    const books = (this._accDayOld || []).splice(0);
    if (this._accDayBook && this._accDayBook.dirty) books.push(this._accDayBook);
    for (const b of books) {
      if (!b.dirty) continue;
      const d = b.d;
      b.d = blankPairs();
      b.dirty = false;
      try {
        const rec = accDayNormalize(await this.state.storage.get(accDayKey(b.day)));
        for (const slot of ACC.SLOTS) { rec[slot][0] += d[slot][0]; rec[slot][1] = Math.min(rec[slot][0], rec[slot][1] + d[slot][1]); }
        await this.state.storage.put(accDayKey(b.day), rec);
      } catch (err) {
        /* not lost: put back for the next flush */
        for (const slot of ACC.SLOTS) { b.d[slot][0] += d[slot][0]; b.d[slot][1] += d[slot][1]; }
        b.dirty = true;
        if (b !== this._accDayBook) (this._accDayOld || (this._accDayOld = [])).push(b);
      }
    }
    /* the players who have gone, with nothing left to write */
    if (this._accBook) {
      for (const [pid, e] of this._accBook) if (!e.dirty && !(this.playerState && this.playerState[pid])) this._accBook.delete(pid);
    }
    /* and the days past DAY_KEEP go, once a worker's life a day */
    const today = accDay(Date.now());
    if (this._accPrunedDay !== today) {
      this._accPrunedDay = today;
      try {
        const days = await this.state.storage.list({ prefix: 'accday:' });
        const keys = [...days.keys()].sort();
        const drop = keys.slice(0, Math.max(0, keys.length - ACC.DAY_KEEP));
        if (drop.length) await this.state.storage.delete(drop);
      } catch (err) { /* next day */ }
    }
  },

  /* webSocketClose (index.js): what is unwritten is taken before the session goes, written after (the codex's way) */
  /* (The entry itself stays: a second login closes the FIRST socket after the new one has joined, and the new
     session's copy of the phone's counts must not be forgotten with it, or its next report would count every shot
     since its join again.  An entry nobody is here for goes with the next flush: _accDayFlush.) */
  _accDirtyCopy(pid) {
    if (!pid || !this._accBook) return null;
    const e = this._accBook.get(pid);
    if (!e || !e.dirty) return null;
    const out = { d: e.d, dirty: true, flushedAt: e.flushedAt };
    e.d = blankPairs();
    e.dirty = false;
    return out;
  },
  async _accPut(pid, e) {
    if (!pid || !e) return;
    e.dirty = true;
    await this._accFlush(pid, e, Date.now());
  },

  /* A character restarted for good (persistence.js _resetCharacterData): its aim goes with it. */
  async _accGone(pid) {
    if (!pid) return;
    if (this._accBook) this._accBook.delete(pid);
    try { await this.state.storage.delete(accKey(pid)); } catch (err) { /* a count, not a debt */ }
  },

  /* ═══ acc_request (index.js's router): your own, as stored plus what is not yet written ═══ */
  async _handleAccRequest(session) {
    const pid = session && session.id;
    if (!pid || !this.playerState || !this.playerState[pid]) return;
    const ws = this._wsBySessionId && this._wsBySessionId(pid);
    if (!ws) return;
    let payload;
    if (this._accOff()) payload = { off: true };
    else {
      let rec = accBlank();
      try { rec = accNormalize(await this.state.storage.get(accKey(pid))); } catch (err) { rec = accBlank(); }
      const e = this._accBook && this._accBook.get(pid);
      if (e) for (const slot of ACC.SLOTS) accAdd(rec, slot, e.d[slot][0], e.d[slot][1]);
      payload = { w: accView(rec) };
    }
    try { ws.send(JSON.stringify({ type: 'acc_state', payload })); } catch (err) { /* display only */ }
  },

  /* ═══ the owner's days (devtools.js GET /dev/accuracy): every player's, newest first ═══ */
  async _accAdminDays(n) {
    const want = int(n, 1, ACC.DAY_KEEP) || 14;
    const rows = new Map();
    try {
      const days = await this.state.storage.list({ prefix: 'accday:' });
      for (const [k, v] of days) rows.set(k.slice('accday:'.length), accDayNormalize(v));
    } catch (err) { return { ok: false, error: 'could not read the days' }; }
    /* with what is counted and not yet written */
    const live = (this._accDayOld || []).slice();
    if (this._accDayBook) live.push(this._accDayBook);
    for (const b of live) {
      const r = rows.get(b.day) || accDayNormalize(null);
      for (const slot of ACC.SLOTS) { r[slot][0] += b.d[slot][0]; r[slot][1] = Math.min(r[slot][0], r[slot][1] + b.d[slot][1]); }
      rows.set(b.day, r);
    }
    const out = [...rows.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, want)
      .map(([day, r]) => ({ day, melee: r.melee, ranged: r.ranged, staff: r.staff }));
    return { ok: true, on: this._accOn(), days: out };
  },
};
