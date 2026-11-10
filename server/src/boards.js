/* ═══ v2.3.4389: THE LEADERBOARDS, WITH FACES ═══
 *
 * The owner, 2026-11-09: "the leaderboards should be expanded and easier to
 * navigate from mobile and include the character profile pic and level next
 * to each record.  Also I want to have the 'daily spin' biggest wins and
 * losses records.  Additionally is it possible to have stand-in (deleted
 * character) rows if the record was made by a deleted character?  Maybe still
 * include their profile pic and level but just grayed out with the deleted
 * label over it."  Spec: docs/specs/leaderboards.md.
 *
 * Three things, one switch (`boards2`):
 *
 * 1. A FACE AND A LEVEL ON EVERY ROW.  The face is a LOOK, never an image
 *    (the Ace board's rule, gamble.js): the phone draws any player's Hemi
 *    Bro bust from their cosmetics (characterPortrait.js portraitDataUrl), so
 *    a row carries `look` -- only the short ids a bust is made of (FACE_KEYS:
 *    skin, hair, hat, beard, eyes, glasses, shirt and their colours; never
 *    the 256-character drawings, which a 32 px bust does not show and which
 *    would make fifty rows of a board 20 KB) -- and `lv`, the level on the
 *    name plate (prog3.js _prog3CharLevel), both as they were WHEN THE RECORD
 *    WAS SET: a board is a record of a moment.
 *      - the ranks (the Leaderboard object, leaderboard.js): the room's
 *        report carries `look`; the board works `lv` out of the row's series;
 *      - the biggest fish (fishlog.js) and Ace's flips (gamble.js): `lv`
 *        (and the fish rows' `look`) stamped as a row is entered;
 *      - the daily spin, below.
 *
 * 2. THE DAILY SPIN'S RECORDS, `spin_board` (ONE GameRoom key, the Ace
 *    board's way and for its reason: written in the run that settles the
 *    spin, never across to another object).  Two lists of SIZE:
 *      wins    the biggest pots PAID -- collected, kept at the day's end, or
 *              paid at the house limit;
 *      losses  the biggest pots LOST to a double or nothing.
 *    Both spins feed it: the login wheel (loginspin.js) and the Gambling
 *    Den's (dailyrewards.js), which pay through the same `dailyspin` source.
 *    ONE row a player a list (their best), so one lucky player cannot hold
 *    all ten.  Each `{pid, name, n, k, at, lv, look}`: `n` the gold, `k` the
 *    doubles behind it.  Read once a worker's life (this room is the only
 *    writer); a record a NEWER worker wrote, or a failed read, is LOCKED:
 *    shown as it was read, never written (the fish board's rule).  Written
 *    only when a spin takes a place: at most one row a spin.
 *
 * 3. THE DELETED STAND-INS.  A character deleted for good -- restarted from
 *    Settings or from the character list (persistence.js
 *    _resetCharacterData) -- keeps the id its next life uses.  So its rows
 *    are RETIRED, not removed: on every board the row's id becomes
 *    `<pid>#<when>` and it is marked `gone`.  The row keeps its name, level
 *    and face, the phone draws it grey with "Deleted" over the face, and the
 *    next life's record is a row of its own (nothing matches the old id).
 *      - `fish_board`, `spin_board`, `ace_board`: a record stands until it
 *        is beaten, deleted or not;
 *      - the ranks: the Leaderboard object moves `player:<pid>` to
 *        `gone:<pid>:<when>`, shown for the same 7 days a player who stopped
 *        playing is, then pruned.
 *    Removing a character from ONE DEVICE's list (charRoster.js forgetChar)
 *    deletes nothing here: its Login Key still reaches it, so its rows stay
 *    live.
 *
 * THE WIRE:
 *   spin_board_request {}      phone -> worker (index.js's router).
 *   spin_board {wins, losses} | {off: true} | {unavailable: true}
 *                              PRIVILEGED (index.js).
 *   caps.boards2               advertised (join.js); the phone shows the
 *       Daily spin records and asks for them only against a worker that
 *       says so.  Kill switch `boards2: false` in the live flags:
 *       un-advertises the cap, records no spin, stamps no face or level,
 *       retires no row (what is on the boards stays).
 *
 * Suite: server/test/boards.test.mjs. */

export const BOARDS = Object.freeze({
  V: 1,
  SPIN_KEY: 'spin_board',
  SIZE: 10,
  NAME_MAX: 24,
  /* what a Hemi Bro bust is drawn from (src/rendering/hemiBust.js
     lookFromPortraitOpts), in join.js's wire names */
  FACE_KEYS: Object.freeze(['sk', 'hr', 'hc', 'hw', 'htc', 'fh', 'fhc', 'ew', 'ewc', 'es', 'ec', 'sc', 'st', 'stc', 'sp']),
  FACE_VAL_MAX: 64,
  LV_MAX: 999,
  GOLD_MAX: 1000000000,
  /* a retired row's id: `<pid>#<when>` (no id the game makes holds a '#';
     the row's `gone` is what says it is retired, never the id's shape) */
  GONE_MARK: '#',
});

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const int = (v, lo, hi) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
};

/** A stored look cut down to what a bust shows: FACE_KEYS only, short
 *  strings and finite numbers -- or null for nothing to draw. */
export function boardFace(look) {
  if (!look || typeof look !== 'object') return null;
  const out = {};
  let any = false;
  for (const k of BOARDS.FACE_KEYS) {
    if (!has(look, k)) continue;
    const v = look[k];
    if (typeof v === 'string' && v && v.length <= BOARDS.FACE_VAL_MAX) { out[k] = v; any = true; }   // proto-ok: k is one of FACE_KEYS
    else if (typeof v === 'number' && Number.isFinite(v)) { out[k] = v; any = true; }   // proto-ok: as above
  }
  return any ? out : null;
}

/** A retired row's id. */
export function goneId(pid, at) {
  return String(pid) + BOARDS.GONE_MARK + Math.floor(Number(at) || 0);
}

/** `rows` with every live row of `pid` retired (a new list; the rows of
 *  anyone else, and rows already retired, as they were).  Returns
 *  `{rows, n}`: `n` how many were retired. */
export function retireRows(rows, pid, at) {
  let n = 0;
  const out = (Array.isArray(rows) ? rows : []).map((e) => {
    if (!e || typeof e !== 'object' || e.pid !== pid || e.gone) return e;
    n += 1;
    return { ...e, pid: goneId(pid, at), gone: Math.floor(Number(at) || 0) || 1 };
  });
  return { rows: out, n };
}

const spinRow = (e) => {
  if (!e || typeof e !== 'object' || typeof e.pid !== 'string' || !e.pid || e.pid.length > 128) return null;
  const n = int(e.n, 0, BOARDS.GOLD_MAX);
  if (!n) return null;
  const row = {
    pid: e.pid, name: String(e.name || 'Bro').slice(0, BOARDS.NAME_MAX), n,
    k: int(e.k, 0, 40), at: int(e.at, 0, Number.MAX_SAFE_INTEGER), lv: int(e.lv, 0, BOARDS.LV_MAX),
  };
  const look = boardFace(e.look);
  if (look) row.look = look;
  if (e.gone) row.gone = int(e.gone, 1, Number.MAX_SAFE_INTEGER);
  return row;
};
const spinList = (list) => {
  const seen = new Set();
  const rows = [];
  for (const e of Array.isArray(list) ? list : []) {
    const row = spinRow(e);
    if (!row || seen.has(row.pid)) continue;
    seen.add(row.pid);
    rows.push(row);
  }
  rows.sort((x, y) => (y.n - x.n) || (x.at - y.at));
  return rows.slice(0, BOARDS.SIZE);
};

/** A stored spin board, made safe: `{wins, losses, locked}`. */
export function normalizeSpinBoard(raw) {
  if (raw && typeof raw === 'object' && Number(raw.v) > BOARDS.V) return { wins: null, losses: null, locked: true };
  const src = raw && typeof raw === 'object' ? raw : {};
  return { wins: spinList(src.w), losses: spinList(src.l), locked: false };
}

/* a plain copy for storage and the wire (codex.js's note: the suites'
   storage does not clone) */
const plainRows = (rows) => (rows || []).map((e) => (e.look ? { ...e, look: { ...e.look } } : { ...e }));

export const boardMethods = {
  /* the kill switch, read the lower-case way (TRAPS §117) */
  _boardsOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'boards2') && !f.boards2);
  },
  _boardsOn() { return !this._boardsOff(); },   /* the caps literal reads a method call (caps-audit) */

  /* Who a row is about, as they are NOW: `{name, lv, look}` of a player who
     is here; null for one who is not. */
  _boardWho(pid) {
    const ps = pid && this.playerState ? this.playerState[pid] : null;
    if (!ps) return null;
    const session = this._sessionById ? this._sessionById(pid) : null;
    let lv = 0;
    try { lv = int(this._prog3CharLevel(ps), 0, BOARDS.LV_MAX); } catch (e) { lv = int(ps.level, 0, BOARDS.LV_MAX); }
    return {
      name: String((this._laneNameOf ? this._laneNameOf(pid) : ps.name) || 'Bro').slice(0, BOARDS.NAME_MAX),
      lv,
      look: boardFace(session && session.char && session.char.look),
    };
  },

  /* ...and of one who has left (a pot kept for them): the name and face off
     their character record, the level the spin stamped (`hint`). */
  async _boardWhoStored(pid, hint) {
    const who = { name: String((hint && hint.name) || 'Bro').slice(0, BOARDS.NAME_MAX), lv: int(hint && hint.lv, 0, BOARDS.LV_MAX), look: null };
    try {
      const ch = await this.state.storage.get('char:' + pid);
      if (ch && typeof ch === 'object') {
        if (typeof ch.name === 'string' && ch.name) who.name = ch.name.slice(0, BOARDS.NAME_MAX);
        who.look = boardFace(ch.look);
      }
    } catch (e) { /* a row without a face is still a row */ }
    return who;
  },

  /* ═══ THE SPIN BOARD ═══ read once a worker's life; a failed read is tried
     again by the next ask (nothing cached), a newer one is locked. */
  async _spinBoardEnsure() {
    if (this._spinBoardBook) return this._spinBoardBook;
    let raw, failed = false;
    try { raw = await this.state.storage.get(BOARDS.SPIN_KEY); } catch (e) { failed = true; }
    if (failed) return { wins: null, losses: null, locked: true };
    if (this._spinBoardBook) return this._spinBoardBook;   /* another ask filled it while this one read */
    this._spinBoardBook = normalizeSpinBoard(raw);
    return this._spinBoardBook;
  },

  _spinBoardPut(book) {
    try { this.state.storage.put(BOARDS.SPIN_KEY, { v: BOARDS.V, w: plainRows(book.wins), l: plainRows(book.losses) }); } catch (e) { /* fire-and-forget: a record, never money */ }
  },

  /* `n` gold won (or lost) by `pid`: on the list if it beats the tenth (or
     the list is short) and this player's own row.  No await: the caller has
     the book.  Returns the place it holds (1-SIZE) or 0. */
  _spinBoardEnter(book, pid, who, n, won, k, at) {
    if (!book || book.locked || !book.wins || !book.losses) return 0;
    const amount = int(n, 0, BOARDS.GOLD_MAX);
    if (!pid || !amount) return 0;
    const side = won ? 'wins' : 'losses';
    const list = book[side];
    const mine = list.find((e) => e.pid === pid && !e.gone);
    if (mine && mine.n >= amount) return 0;
    if (!mine && list.length >= BOARDS.SIZE && amount <= list[list.length - 1].n) return 0;
    const row = {
      pid, name: String((who && who.name) || 'Bro').slice(0, BOARDS.NAME_MAX), n: amount,
      k: int(k, 0, 40), at: int(at, 0, Number.MAX_SAFE_INTEGER), lv: int(who && who.lv, 0, BOARDS.LV_MAX),
    };
    if (who && who.look) row.look = who.look;
    const next = list.filter((e) => e.pid !== pid || e.gone);
    next.push(row);
    next.sort((x, y) => (y.n - x.n) || (x.at - y.at));
    book[side] = next.slice(0, BOARDS.SIZE);
    const idx = book[side].indexOf(row);
    if (idx < 0) return 0;
    this._spinBoardPut(book);
    return idx + 1;
  },

  /* A spin's end, for the record: `n` gold PAID (`won`) or LOST to a double,
     after `k` doubles.  Called AFTER the spin is settled and saved, and never
     allowed to cost it: every caller wraps this in a try. */
  async _spinBoardRecord(pid, n, won, k, hint) {
    if (!pid || !(n > 0) || this._boardsOff()) return 0;
    const book = await this._spinBoardEnsure();
    if (!book || book.locked) return 0;
    const who = this._boardWho(pid) || await this._boardWhoStored(pid, hint);
    return this._spinBoardEnter(book, pid, who, n, won, k, Date.now());
  },

  _boardSend(pid, type, payload) {
    const ws = this._wsBySessionId && this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) { /* display only */ }
  },

  /* ═══ spin_board_request (index.js's router) ═══ */
  async _handleSpinBoardRequest(session) {
    const pid = session && session.id;
    if (!pid || !this.playerState[pid]) return;
    if (this._boardsOff()) { this._boardSend(pid, 'spin_board', { off: true }); return; }
    const book = await this._spinBoardEnsure();
    this._boardSend(pid, 'spin_board', book && book.wins && book.losses
      ? { wins: plainRows(book.wins), losses: plainRows(book.losses) }
      : { unavailable: true });
  },

  /* ═══ A CHARACTER DELETED FOR GOOD (persistence.js _resetCharacterData) ═══
     Its rows are retired on every board.  Best-effort, piece by piece: a
     board that cannot be read keeps its row live, which is only a row the
     next life can beat or share -- never a reason to fail a restart. */
  async _boardsGone(pid) {
    if (!pid || this._boardsOff()) return;
    const at = Date.now();
    /* no more reports of the old life: its session is on its way out, and a
       `track` let in by the awaits below would write the row straight back */
    const session = this._sessionById ? this._sessionById(pid) : null;
    if (session) session._lbGone = true;
    try {
      const fb = this._fishBoardEnsure ? await this._fishBoardEnsure() : null;
      if (fb && !fb.locked && fb.boards && this._fishBoardRetire) this._fishBoardRetire(fb, pid, at);
    } catch (e) { /* best-effort, as above */ }
    try {
      const sb = await this._spinBoardEnsure();
      if (sb && !sb.locked && sb.wins) {
        const w = retireRows(sb.wins, pid, at), l = retireRows(sb.losses, pid, at);
        if (w.n || l.n) { sb.wins = w.rows; sb.losses = l.rows; this._spinBoardPut(sb); }
      }
    } catch (e) { /* best-effort, as above */ }
    try { if (this._aceBoardRetire) await this._aceBoardRetire(pid, at); } catch (e) { /* best-effort, as above */ }
    try {
      const stub = this.env.LEADERBOARD.get(this.env.LEADERBOARD.idFromName('global'));
      await stub.fetch(new Request('https://internal/api/leaderboard/gone', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: pid, ts: at }),
      }));
    } catch (e) { /* best-effort: the old row ages out in 7 days as it always did */ }
  },
};
