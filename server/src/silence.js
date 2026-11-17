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
 * /api/admin/silence {playerId, minutes, note} (minutes left out: until
 * lifted; else a positive whole number, at most MINUTES_MAX),
 * DELETE /api/admin/silence?id=.  Each logged in `admin_log`.
 *
 * KILL SWITCH in the live flags: `silence: false` (no silence is checked:
 * every character speaks; the rows are kept).
 * THE OWNER'S LEVER `freezedevice: true` (the sitting 19 review, the planning
 * session's call): the device half is OFF until the owner turns it on, a
 * freeze holding the character only, as before.  It can hold the OWNER out
 * (a ?guest=1 alt shares the main's phone; a device reached with a new key is
 * never recorded), so it waits for the owner's decision.  v2.3.5625 (card MOD
 * PR 5): its devices now come from botfp's `device:` record too, and the
 * owner's spare is complete the same way (`_frozenDeviceIs`); the lever stays
 * OFF, the owner's to turn on.
 * The sitting 19 review also: the frozen characters' records are read 128 a
 * get (the runtime's most: 129 freezes threw, and it failed open), and a
 * silence's `minutes` is a positive whole number or left out (-60 and 0.5
 * were "until lifted").
 */

import { WIRE_IN } from './wire/in.js';
import { WIRE_RELAY } from './wire/relays.js';
import { CHAT_LANE_TYPES } from './wire/lists.js';
import { EMOTE } from './emotes.js';

/* THE CHAT LANES a silence closes: the wire table's rows whose trust has
   `text: 'words'` (card K's word, 2026-11-15: never every `speaks` row --
   that is 39, `join`, `track`, a trade and a duel among them): today chat,
   area_chat, whisper, party_chat, friend_dm and store_dm, and a new lane by
   its row.  v2.3.5625: card K's own CHAT_LANE_TYPES (wire/lists.js, the one
   reader of the table), as the silence first offered to take in. */
export const SILENCE_LANES = CHAT_LANE_TYPES;

/* v2.3.5625 (card MOD PR 5; the sitting 19 review's low, "words still reach
   others outside the six lanes"): THE OTHER ROWS WITH WORDS.  Every socket
   row whose trust names a `words` field is either one a silence closes
   (SILENCE_WORDS: a name other players read -- a pet's, an alliance's, a
   clan's) or one it leaves open, with why (SILENCE_OPEN); silence.test fails
   a new row in neither, so a new name others read is covered by deciding,
   not by remembering.  And the emote's quick LINES ("GG", "EZ", "RIP": the
   closed list, emotes.js EMOTE.LINES) are words over the head: a silenced
   character's are dropped, its emoji and moves go on (they say nothing). */
export const SILENCE_WORDS = Object.freeze(new Set(['pet_name', 'alliance_name', 'clan_create', 'clan_invite']));
export const SILENCE_OPEN = Object.freeze({
  join: 'the name is the record\'s (charname.js: a new one by the rule); a silence never stops a character joining',
  track: 'never renames (charname.js _stampRecordName); its look and place are play',
  chat_mute: 'one\'s own mute list; nobody else reads it',
  friend_request: 'the name it carries is the sender\'s own page\'s; the target reads the server\'s (friends.js)',
  dungeon_start: 'the worker\'s own config (the page names only the mouth); nobody reads its name',
});
/** The socket rows whose trust names a `words` field (what SILENCE_WORDS and
 *  SILENCE_OPEN between them must cover, beside the lanes). */
export function wordRows({ inn = WIRE_IN, relay = WIRE_RELAY } = {}) {
  return [...inn, ...relay].filter((r) => r && r.trust && Object.values(r.trust).includes('words')).map((r) => r.name);
}
const LINE_EMOTES = new Set(EMOTE.LINES);

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
  GET_MAX: 128,   /* v2.3.5621: the keys one storage.get takes (the runtime's limit) */
  OWNER_DEV: 'ownerdev:',   /* v2.3.5627: a device the owner's own characters joined from */
});

/** When the silence ends, in words a player reads. */
export function silenceUntilWords(until) {
  if (!until) return 'until the owner lifts it';
  const d = new Date(until);
  const hh = String(d.getUTCHours()).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
  return 'until ' + hh + ':' + mm + ' UTC' + (until - Date.now() > 86400000 ? ' on ' + d.toISOString().slice(0, 10) : '');
}

export const silenceMethods = {
  /* the kill switch `silence: false`, and the owner's lever `freezedevice: true` (OFF unset) */
  _silenceOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'silence') && !f.silence);
  },
  _freezeDeviceOn() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'freezedevice') && f.freezedevice === true);
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
  _silenceSpeakOk(session, now, what) {
    const t = now || Date.now();
    const s = session && this._silenceOf(session.id, t);
    if (!s) return true;
    if (!session._silenceToldAt || t - session._silenceToldAt >= SILENCE.TELL_MS) {
      session._silenceToldAt = t;
      const ws = this._wsBySessionId ? this._wsBySessionId(session.id) : null;
      if (ws) {
        try { ws.send(JSON.stringify({ type: 'server_announce', payload: { text: 'You can\'t ' + (what === 'name' ? 'give names others read' : 'chat') + ' right now: the owner has silenced this character ' + silenceUntilWords(s.until) + '.', ts: t } })); } catch (e) { /* closed */ }
      }
    }
    return false;
  },

  /** THE SILENCE'S DOOR (index.js `_onMessage`, its own step right after the
   *  wire door: card K's word -- never inside it, which refuses only what no
   *  page sends and sits behind `wiredoor`).  True: this frame is a chat lane
   *  (SILENCE_LANES, by its `type`: the page's shim sends a relayed event as
   *  its own type, card K measured) from a silenced character, and is
   *  dropped. */
  _silenceDoor(session, msg) {
    if (!msg || !this._silenceOn() || !this._silences || !this._silences.size) return false;
    if (SILENCE_LANES.has(msg.type)) return !this._silenceSpeakOk(session);
    /* v2.3.5625: a name others read, and an emote's quick line */
    if (SILENCE_WORDS.has(msg.type)) return !this._silenceSpeakOk(session, 0, 'name');
    if (msg.type === 'emote') {
      const p = msg.payload && typeof msg.payload === 'object' ? msg.payload : msg;
      if (typeof p.emoji === 'string' && LINE_EMOTES.has(p.emoji)) return !this._silenceSpeakOk(session);
    }
    return false;
  },

  /* ── A FREEZE HOLDS THE DEVICE ── */
  /** The owner's few lists, for the device rule: the frozen characters
   *  (`frozen:`, listed at every join, so a freeze holds the next join at
   *  once), the owner's own characters (`testmode:`), and the devices each
   *  side's `auth:<pid>.devs` names (the device lock's list), read again only
   *  when the frozen list changed or FROZEN_TTL_MS has passed. */
  async _frozenLists(now) {
    const t = now || Date.now();
    const empty = { frozen: new Set(), owner: new Set(), devs: new Set(), ownerDevs: new Set() };
    let frozenIds;
    try {
      const rows = await this.state.storage.list({ prefix: 'frozen:', limit: SILENCE.FROZEN_MAX });
      frozenIds = [...rows.keys()].map((k) => k.slice('frozen:'.length));
    } catch (e) { return this._frozenL || empty; }
    if (!frozenIds.length) { this._frozenL = empty; this._frozenSig = ''; return empty; }
    const sig = frozenIds.join('|');
    if (this._frozenL && sig === this._frozenSig && t - this._frozenAt < SILENCE.FROZEN_TTL_MS) return this._frozenL;
    const devsOf = async (ids) => {
      const out = new Set();
      /* v2.3.5621 (the sitting 19 review): GET_MAX a get, the runtime's most */
      for (let i = 0; i < ids.length; i += SILENCE.GET_MAX) {
        const auths = await this.state.storage.get(ids.slice(i, i + SILENCE.GET_MAX).map((id) => 'auth:' + id));
        for (const a of auths.values()) for (const d of (a && Array.isArray(a.devs) ? a.devs : [])) if (d && typeof d.d === 'string') out.add(d.d);
      }
      return out;
    };
    try {
      const tm = await this.state.storage.list({ prefix: 'testmode:', limit: SILENCE.FROZEN_MAX });
      const owner = new Set([...tm.keys()].map((k) => k.slice('testmode:'.length)));
      const ownerDevs = await devsOf([...owner]);
      /* v2.3.5627 (sitting 22's review): and every device the owner's own
         characters have joined from, kept for good (`ownerdev:`, below) --
         botfp's record keeps only a device's last 8 characters in 30 days,
         so the owner's could fall off it, and the phone be held */
      const od = await this.state.storage.list({ prefix: SILENCE.OWNER_DEV, limit: SILENCE.FROZEN_MAX });
      for (const k of od.keys()) ownerDevs.add(k.slice(SILENCE.OWNER_DEV.length));
      const lists = { frozen: new Set(frozenIds), owner, devs: await devsOf(frozenIds), ownerDevs };
      this._frozenL = lists; this._frozenSig = sig; this._frozenAt = t;
    } catch (e) { /* the last read stands */ }
    return this._frozenL || empty;
  },

  /** v2.3.5627 (card MOD PR 7; sitting 22's review, its first finding): the
   *  owner's own devices, KEPT.  A join that is in (join.js, after the key,
   *  beside botfp's) by a character in test mode (`ps._testMode`: the
   *  owner's own) marks its device `ownerdev:<device>` {pid, at}, once a
   *  device (a put only when the device is new to the list: a handful,
   *  ever).  A freeze never holds a marked device, whatever its botfp
   *  record has since forgotten (its last 8 characters in 30 days). */
  async _ownerDeviceNote(session) {
    const id = session && session.id;
    const device = session && session.device;
    if (typeof id !== 'string' || typeof device !== 'string' || !device) return;
    const ps = this.playerState && this.playerState[id];
    if (!(this._testMode && this._testMode(ps))) return;
    if (!this._ownerDevNoted) this._ownerDevNoted = new Set();
    if (this._ownerDevNoted.has(device)) return;
    try {
      const key = SILENCE.OWNER_DEV + device;
      if (!(await this.state.storage.get(key))) await this.state.storage.put(key, { pid: id, at: Date.now() });
      this._ownerDevNoted.add(device);
      if (this._frozenL && this._frozenL.ownerDevs) this._frozenL.ownerDevs.add(device);
    } catch (e) { /* the next join tries again */ }
  },

  /** True when this join's device belongs to a frozen character (the join is
   *  then refused `frozen`, as a frozen character's own is).  `pid` is the
   *  character the join names.
   *  v2.3.5625 (card MOD PR 5; the sitting 19 review's two MEDIUMs): the
   *  device's characters come from botfp's own record, `device:<device>`
   *  (botfp.js `_botfpOnJoin`: every character that joined from this
   *  device, whatever key it came with, its last DEVICE_IDS_CAP in 30 days),
   *  beside the device lock's `auth:<pid>.devs` (which records only the
   *  device a character was MADE on, or added with its key: a freeze held
   *  only that one, and its spare missed the owner's other phones).  The
   *  owner's spare is complete the same way: the device is never held when
   *  the record (or a test-mode character's `devs`) shows one of the owner's
   *  own characters on it, nor is a join that names one (its key still
   *  decides, after this).  A refused join writes nothing, so the record
   *  cannot be flushed of the frozen character by new ones once it holds. */
  async _frozenDeviceIs(device, now, pid) {
    if (!this._freezeDeviceOn() || typeof device !== 'string' || !device) return false;
    const L = await this._frozenLists(now);
    if (!L.frozen.size) return false;
    if (typeof pid === 'string' && L.owner.has(pid)) return false;   /* the owner's own character, by name */
    if (L.ownerDevs.has(device)) return false;                      /* never the owner's own phone */
    let ids = [];
    try {
      const rec = await this.state.storage.get('device:' + device);
      ids = rec && Array.isArray(rec.ids) ? rec.ids.map((e) => e && e.id).filter((x) => typeof x === 'string') : [];
    } catch (e) { ids = []; }
    if (ids.some((x) => L.owner.has(x))) return false;              /* ...whatever key it came with */
    if (!ids.some((x) => L.frozen.has(x)) && !L.devs.has(device)) return false;
    /* v2.3.5627 (the planning session's call, 2026-11-17, sitting 22's
       review: the lever stays OFF, the owner can change it): a held phone
       refuses only a NEW character, one with no login and no record yet --
       never an existing character's join (a friend's own character on a
       phone the frozen one once used plays on; the frozen one itself is
       refused by its own `frozen:` row, join.js) */
    if (typeof pid === 'string' && pid) {
      try {
        const had = await this.state.storage.get(['auth:' + pid, 'char:' + pid]);
        if (had && had.size) return false;
      } catch (e) { return false; }   /* a failed read lets the join on to the key */
    }
    return true;
  },

  /** The join's half (join.js, before the key is checked: a refused join
   *  writes nothing): true when it refused this socket, as a frozen
   *  character's own join is refused (`frozen`, close 4004, which the phone
   *  never answers with a new character). */
  async _frozenDeviceRefuse(ws, device, pid) {
    /* ...and the silences into memory, once a room's life: every speaker has
       joined first, so the speak check (a Map read) always has them */
    await this._silenceEnsure();
    if (!(await this._frozenDeviceIs(device, 0, pid))) return false;
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
      /* v2.3.5621 (the sitting 19 review): left out is until lifted; else a
         positive whole number of minutes (-60 and 0.5 were until lifted) */
      const given = body.minutes !== undefined && body.minutes !== null;
      if (given && !(Number.isInteger(body.minutes) && body.minutes > 0 && body.minutes <= SILENCE.MINUTES_MAX)) {
        return json({ ok: false, error: 'minutes: a whole number from 1 to ' + SILENCE.MINUTES_MAX + ', or left out for until lifted' }, 400);
      }
      const minutes = given ? body.minutes : 0;
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

