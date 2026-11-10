/* ═══ v2.3.4490: WHAT PLAYERS DREW, FOR THE OWNER TO LOOK AT ═══
 *
 * The owner, 2026-11-10: "I also need profile pic and character images of
 * other players saved somewhere so I can monitor for anything inappropriate
 * that they drew in the custom character creator."
 *
 * They ARE saved: every character's whole look, its nine drawings included,
 * is in its permanent record (`char:<pid>`, join.js _loadOrCreateCharacter:
 * written once, at creation; nothing can change a drawing afterwards).  What
 * was missing was anywhere to SEE them.  This is the worker's half of the
 * Test panel's "Player drawings" page (src/ui/panels/DevPanel.jsx): admin
 * only (devtools.js _devFetch, behind the admin key like every lever).
 *
 *   GET  /dev/looks?before=<ms>&limit=<n>
 *        Every character that has DRAWN something (a drawing key with ink:
 *        join.js DRAWING_KEYS), newest first by the day it was made, a page
 *        at a time.  Each row: its id, name, when it was made, whether it is
 *        in the world now, its inked drawings as they are stored (a drawing
 *        is 256 hex characters, a 16 x 16 grid: the page draws each large),
 *        and the short ids its face is drawn from (boards.js boardFace).
 *        With `seenAt` (below) and how many are newer than it.
 *   POST /dev/lookseen {}
 *        "I have looked at all of these": `artwatch_seen` = {at: now}.  A
 *        drawing cannot change after creation, so one mark in time is the
 *        whole of "seen": the page marks what was made after it NEW.
 *   POST /dev/lookwipe {playerId}
 *        Remove a character's drawings, for everyone and for good: the nine
 *        drawing keys leave its record (a record without a key is BLANK:
 *        _stampRecordLook drops it from the join and from every relay, so no
 *        phone can put it back), the players who can see it now are told
 *        (null a key, the peer merge's way of clearing one: clans.js), and
 *        the record keeps when (`artWipedAt`).  Its traits, name and colours
 *        are untouched.  Logged (admin_log) like every admin change.
 *
 * A read scans every `char:` record (as /dev/apinfo does): the owner's own
 * action, never a player's.  No cap and no kill switch: nothing here is a
 * player's to call, and a wipe is an operator's act like a freeze.
 *
 * Suite: server/test/charwatch.test.mjs.  Spec: docs/specs/char-watch.md. */
import { DRAWING_KEYS } from './join.js';
import { boardFace } from './boards.js';

export const CHAR_WATCH = Object.freeze({
  SEEN_KEY: 'artwatch_seen',
  PAGE: 24,
  PAGE_MAX: 60,
  SCAN_MAX: 20000,
  NAME_MAX: 64,
  ART_LEN: 256,
});
const int = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };

/** Is this stored value a drawing with something on it?  (All '0' is the blank canvas.) */
export function artHasInk(s) {
  return typeof s === 'string' && s.length > 0 && /[^0]/.test(s);
}

/** A look's inked drawings, by their wire keys -- null when it has none. */
export function inkedArt(look) {
  if (!look || typeof look !== 'object') return null;
  let out = null;
  for (const k of DRAWING_KEYS) {
    const v = look[k];
    if (!artHasInk(v)) continue;
    (out || (out = {}))[k] = String(v).slice(0, CHAR_WATCH.ART_LEN * 2);
  }
  return out;
}

/** From every stored character ([key, record] pairs), the page of those that drew something: newest first,
 *  made before `before` (0: from the newest), `limit` of them.  `seenAt`: how many are newer than the mark. */
export function watchPage(chars, { before = 0, limit = CHAR_WATCH.PAGE, seenAt = 0, online = null } = {}) {
  const idx = [];
  for (const [k, c] of chars) {
    if (!c || typeof c !== 'object' || typeof k !== 'string' || k.slice(0, 5) !== 'char:') continue;
    const art = inkedArt(c.look);
    if (!art) continue;
    idx.push({ id: k.slice(5), at: int(c.createdAt, 0, Number.MAX_SAFE_INTEGER), c, art });
  }
  idx.sort((a, b) => (b.at - a.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const total = idx.length;
  const fresh = idx.filter((r) => r.at > seenAt).length;
  const from = before > 0 ? idx.filter((r) => r.at < before) : idx;
  const n = int(limit, 1, CHAR_WATCH.PAGE_MAX);
  const rows = from.slice(0, n).map((r) => ({
    id: r.id,
    name: String((r.c && r.c.name) || '').slice(0, CHAR_WATCH.NAME_MAX),
    createdAt: r.at,
    fresh: r.at > seenAt,
    online: !!(online && online(r.id)),
    art: r.art,
    face: boardFace(r.c.look),
  }));
  return { rows, total, fresh, more: from.length > rows.length };
}

export const charWatchMethods = {
  async _watchSeenAt() {
    try {
      const v = await this.state.storage.get(CHAR_WATCH.SEEN_KEY);
      return int(v && v.at, 0, Number.MAX_SAFE_INTEGER);
    } catch (e) { return 0; }
  },

  /* GET /dev/looks */
  async _watchLooks(params) {
    const before = int(params && params.get('before'), 0, Number.MAX_SAFE_INTEGER);
    const limit = int((params && params.get('limit')) || CHAR_WATCH.PAGE, 1, CHAR_WATCH.PAGE_MAX);
    let chars;
    try { chars = await this.state.storage.list({ prefix: 'char:', limit: CHAR_WATCH.SCAN_MAX }); }
    catch (e) { return { ok: false, error: 'could not read the characters' }; }
    const seenAt = await this._watchSeenAt();
    const page = watchPage(chars, { before, limit, seenAt, online: (id) => !!(this.playerState && this.playerState[id]) });
    return { ok: true, seenAt, ...page };
  },

  /* POST /dev/lookseen */
  async _watchSeen() {
    const at = Date.now();
    await this.state.storage.put(CHAR_WATCH.SEEN_KEY, { at });
    return { ok: true, seenAt: at };
  },

  /* POST /dev/lookwipe {playerId} */
  async _watchWipe(playerId) {
    if (typeof playerId !== 'string' || !playerId) return { ok: false, error: 'playerId required' };
    const key = 'char:' + playerId;
    const rec = await this.state.storage.get(key);
    if (!rec || typeof rec !== 'object' || !rec.look) return { ok: false, error: 'no such character' };
    const wiped = [];
    for (const k of DRAWING_KEYS) {
      if (rec.look[k] === undefined || rec.look[k] === null) continue;
      wiped.push(k);
      delete rec.look[k];
    }
    if (!wiped.length) return { ok: true, wiped, wasOnline: false };
    rec.artWipedAt = Date.now();
    await this.state.storage.put(key, rec);
    /* in the world now: this session's own copy of the record and of its look, and everyone who can see it */
    const session = this._sessionById ? this._sessionById(playerId) : null;
    if (session) {
      if (session.char && session.char.look) for (const k of wiped) delete session.char.look[k];
      if (session.data) for (const k of wiped) delete session.data[k];
      const ps = this.playerState ? this.playerState[playerId] : null;
      if (ps) for (const k of wiped) delete ps[k];
      /* null, not delete: the peer merge is Object.assign, so a falsy VALUE is the only way to clear a key across
         the wire; with the build keys every player_update must carry (clans.js, lookrelay.js) */
      const data = {};
      for (const k of wiped) data[k] = null;
      if (session.data && session.data.hg) data.hg = session.data.hg;
      if (session.data && session.data.fr) data.fr = session.data.fr;
      try {
        const ws = this._wsBySessionId ? this._wsBySessionId(playerId) : null;
        this.broadcastExcept(ws, { type: 'player_update', id: playerId, data });
        if (typeof this._lookForget === 'function') this._lookForget(session);
      } catch (e) { /* the record is blank either way: the next join shows it so */ }
    }
    return { ok: true, wiped, wasOnline: !!session };
  },
};
