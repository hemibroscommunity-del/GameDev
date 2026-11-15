/* ═══ v2.3.5621: THE OWNER'S SILENCE, AND A FREEZE THAT HOLDS THE DEVICE (card MOD PR 1) ═══
 *
 * The red team (2026-11-14, RT-3 S1, docs/security/rt3-findings.md and its
 * proof t4-ban.mjs): the owner could kick and freeze ONE character, nothing
 * else.  No silence: a troll could only be put out of the game.  And a frozen
 * player was back in a second -- a new character on the SAME phone was let
 * in, the account check (Turnstile) being off.  The About panel promises
 * "Harassment, hate and spam get muted or removed".  This is the owner's half
 * of that promise (card MOD, docs/plan/cards/MOD.md):
 *
 *   SILENCE.  `silenced:<pid>` {until, note, by, at} -- a character's words
 *   reach nobody until `until` (0: until lifted): room chat, area, whisper,
 *   party, a friend's message, a shop thread, an emote's words.  Not a mute
 *   (chatmod.js: one player's own list): the owner's, for everyone.  The
 *   silenced player is told once a SILENCE.TELL_MS, in the game's voice
 *   (`server_announce`, to that socket only: no new message type), until
 *   when; nobody else is told anything.  Every silence is loaded into memory
 *   once a room's life (`_silenceEnsure`, a list of a few rows), so the
 *   check a message makes is a Map read.
 *
 *   A FREEZE HOLDS THE DEVICE.  A join from a device a frozen character has
 *   played on (`auth:<pid>.devs`, devicelock.js) is refused `frozen`,
 *   whatever character it names -- a new one included.  Read from the
 *   `frozen:` rows themselves (admin.js writes them), listed at every join
 *   (the owner's few: a freeze holds the very next join) and their devices
 *   read again when that list changes, so the freeze route needs no change
 *   and an unfreeze lifts the devices with it.  NEVER the
 *   owner's own phone: a device a character in test mode has played on
 *   (`testmode:<pid>`, testmode.js: the owner's own characters) is never held,
 *   so freezing a test character cannot lock the owner out.  A NEW device
 *   still gets in: the account check is that wall, and the owner's to turn
 *   on (docs/OPERATIONS.md "The account check").
 *
 * WHERE A SILENCE IS CHECKED: `_silenceDoor`, one step in the router right
 * after the wire door, for the chat lanes (SILENCE_LANES): one check, so a
 * new lane is covered by its row, not by remembering five handlers.
 *
 * The owner's routes (admin.js's key, the same final-404 chain as
 * devicelock.js's): GET /api/admin/silence (every silence), POST
 * /api/admin/silence {playerId, minutes, note} (minutes 0: until lifted),
 * DELETE /api/admin/silence?id=.  Each logged in `admin_log`.
 *
 * KILL SWITCHES in the live flags: `silence: false` (no silence is checked:
 * every character speaks; the rows are kept) and `freezedevice: false` (a
 * freeze holds the character only, as before).
 */

/* THE CHAT LANES a silence closes: the wire table's rows whose trust has
   `text: 'words'` (card K's word, 2026-11-15: never every `speaks` row --
   that is 39, `join`, `track`, a trade and a duel among them).  A stopgap
   copy: card K's `CHAT_LANES` (wire/lists.js, the one reader of the table)
   replaces it when it lands, with `wireRowOf` for the row a frame names. */
export const SILENCE_LANES = Object.freeze(new Set(['chat', 'party_chat', 'area_chat', 'whisper', 'friend_dm', 'store_dm']));

export const SILENCE = Object.freeze({
  KEY: 'silenced:',
  /* the longest a silence is set for by minutes (a year); 0 is until lifted */
  MINUTES_MAX: 525600,
  NOTE_MAX: 200,
  /* the silenced speaker is told at most this often */
  TELL_MS: 60000,
  /* the frozen characters' devices, read again at least this often (and at
     once when the `frozen:` list changes) -- only when someone joins */
  FROZEN_TTL_MS: 60000,
  /* the most frozen characters read for their devices (the owner's freezes: a handful) */
  FROZEN_MAX: 500,
});

/** When the silence ends, in words a player reads. */
export function silenceUntilWords(until) {
  if (!until) return 'until the owner lifts it';
  const d = new Date(until);
  const hh = String(d.getUTCHours()).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
  return 'until ' + hh + ':' + mm + ' UTC' + (until - Date.now() > 86400000 ? ' on ' + d.toISOString().slice(0, 10) : '');
}

export const silenceMethods = {
  /* the kill switches: `silence: false` and `freezedevice: false` in the live flags */
  _silenceOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'silence') && !f.silence);
  },
  _freezeDeviceOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'freezedevice') && !f.freezedevice);
  },

  /* every silence, into memory, once a room's life (and again after a failed read) */
  async _silenceEnsure() {
    if (this._silences) return this._silences;
    const m = new Map();
    try {
      const rows = await this.state.storage.list({ prefix: SILENCE.KEY });
      for (const [k, v] of rows) if (v && typeof v === 'object') m.set(k.slice(SILENCE.KEY.length), v);
      this._silences = m;
    } catch (e) { return m; }
    return m;
  },

  /** The silence on `pid` now, or null (none, ended, or the switch thrown). */
  _silenceOf(pid, now) {
    if (!this._silenceOn() || !this._silences || typeof pid !== 'string') return null;
    const s = this._silences.get(pid);
    if (!s) return null;
    if (s.until && s.until <= (now || Date.now())) return null;
    return s;
  },

  /** May this session's words go out?  False drops them; the speaker is told
   *  once a TELL_MS, in the game's voice, to their own socket only. */
  _silenceSpeakOk(session, now) {
    const t = now || Date.now();
    const s = session && this._silenceOf(session.id, t);
    if (!s) return true;
    if (!session._silenceToldAt || t - session._silenceToldAt >= SILENCE.TELL_MS) {
      session._silenceToldAt = t;
      const ws = this._wsBySessionId ? this._wsBySessionId(session.id) : null;
      if (ws) {
        try { ws.send(JSON.stringify({ type: 'server_announce', payload: { text: 'You can\'t chat right now: the owner has silenced this character ' + silenceUntilWords(s.until) + '.', ts: t } })); } catch (e) { /* closed */ }
      }
    }
    return false;
  },

  /** THE SILENCE'S DOOR (index.js `_onMessage`, its own step right after the
   *  wire door: card K's word -- never inside it, which refuses only what no
   *  page sends and sits behind `wiredoor`).  True: this frame is a chat lane
   *  (SILENCE_LANES; a relayed frame names its row by `event`) from a
   *  silenced character, and is dropped. */
  _silenceDoor(session, msg) {
    if (!msg || !this._silenceOn() || !this._silences || !this._silences.size) return false;
    const row = msg.type === 'broadcast' ? msg.event : msg.type;
    if (!SILENCE_LANES.has(row)) return false;
    return !this._silenceSpeakOk(session);
  },

  /* ── A FREEZE HOLDS THE DEVICE ── */
  /** The devices every frozen character has played on.  The `frozen:` rows
   *  (the owner's few) are listed at every join, so a freeze holds the next
   *  join at once; their devices (and the owner's test-mode phones) are read
   *  again only when that list changed or FROZEN_TTL_MS has passed. */
  async _frozenDevices(now) {
    const t = now || Date.now();
    let frozenIds;
    try {
      const rows = await this.state.storage.list({ prefix: 'frozen:', limit: SILENCE.FROZEN_MAX });
      frozenIds = [...rows.keys()].map((k) => k.slice('frozen:'.length));
    } catch (e) { return this._frozenDev || new Set(); }
    if (!frozenIds.length) { this._frozenDev = new Set(); this._frozenSig = ''; return this._frozenDev; }
    const sig = frozenIds.join('|');
    if (this._frozenDev && sig === this._frozenSig && t - this._frozenDevAt < SILENCE.FROZEN_TTL_MS) return this._frozenDev;
    const devsOf = async (ids) => {
      const out = [];
      if (ids.length) {
        const auths = await this.state.storage.get(ids.map((id) => 'auth:' + id));
        for (const a of auths.values()) for (const d of (a && Array.isArray(a.devs) ? a.devs : [])) if (d && typeof d.d === 'string') out.push(d.d);
      }
      return out;
    };
    try {
      const set = new Set(await devsOf(frozenIds));
      if (set.size) {
        const tm = await this.state.storage.list({ prefix: 'testmode:', limit: SILENCE.FROZEN_MAX });
        for (const d of await devsOf([...tm.keys()].map((k) => k.slice('testmode:'.length)))) set.delete(d);   /* never the owner's own phone */
      }
      this._frozenDev = set; this._frozenSig = sig; this._frozenDevAt = t;
    } catch (e) { /* the last read stands */ }
    return this._frozenDev || new Set();
  },

  /** True when this join's device belongs to a frozen character (the join is
   *  then refused `frozen`, as a frozen character's own is). */
  async _frozenDeviceIs(device, now) {
    if (!this._freezeDeviceOn() || typeof device !== 'string' || !device) return false;
    return (await this._frozenDevices(now)).has(device);
  },

  /** The join's half (join.js, before the key is checked: a refused join
   *  writes nothing): true when it refused this socket, as a frozen
   *  character's own join is refused (`frozen`, close 4004, which the phone
   *  never answers with a new character). */
  async _frozenDeviceRefuse(ws, device) {
    /* ...and the silences into memory, once a room's life: every speaker has
       joined first, so the speak check (a Map read) always has them */
    await this._silenceEnsure();
    if (!(await this._frozenDeviceIs(device))) return false;
    try { ws.send(JSON.stringify({ type: 'join_rejected', reason: 'frozen' })); } catch (e) { /* closed */ }
    try { ws.close(4004, 'frozen'); } catch (e) { /* closed */ }
    if (this._playerLeaves) await this._playerLeaves(ws, 'refused');
    return true;
  },

  /* ── THE OWNER'S ROUTES (admin.js, after the key) ── */
  async _silenceAdminRoute(request, url, path, json) {
    if (path !== '/silence') return null;
    const now = Date.now();
    const m = await this._silenceEnsure();
    if (request.method === 'GET') {
      const list = [];
      for (const [id, s] of m) if (!s.until || s.until > now) list.push({ playerId: id, ...s });
      return json({ ok: true, on: this._silenceOn(), silenced: list });
    }
    if (request.method === 'POST') {
      let body = null;
      try { body = await request.json(); } catch (e) { body = null; }
      const id = body && typeof body.playerId === 'string' ? body.playerId.trim().slice(0, 64) : '';
      if (!id) return json({ ok: false, error: 'playerId required' }, 400);
      const minutes = Math.max(0, Math.min(SILENCE.MINUTES_MAX, Math.floor(Number(body.minutes) || 0)));
      const note = typeof body.note === 'string' ? body.note.slice(0, SILENCE.NOTE_MAX) : '';
      const rec = { until: minutes ? now + minutes * 60000 : 0, note, at: now };
      await this.state.storage.put(SILENCE.KEY + id, rec);
      m.set(id, rec);
      const ws = this._wsBySessionId ? this._wsBySessionId(id) : null;
      if (ws) { const sess = this.sessions && this.sessions.get(ws); if (sess) sess._silenceToldAt = 0; }
      if (this._adminLog) await this._adminLog({ op: 'silence', playerId: id, minutes, note });
      return json({ ok: true, playerId: id, until: rec.until, online: !!ws });
    }
    if (request.method === 'DELETE') {
      const id = (url.searchParams.get('id') || '').trim().slice(0, 64);
      if (!id) return json({ ok: false, error: 'id required' }, 400);
      const had = m.has(id);
      await this.state.storage.delete(SILENCE.KEY + id);
      m.delete(id);
      if (this._adminLog) await this._adminLog({ op: 'unsilence', playerId: id });
      return json({ ok: true, playerId: id, was: had });
    }
    return null;
  },
};

