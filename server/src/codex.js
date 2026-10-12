/* ═══ v2.3.3153: THE MONSTER CODEX -- WHAT EACH KILL TEACHES YOU ═══
 *
 * Owner, 2026-10-12: "Begin working on the monster section of the codex.
 * After you kill a monster you learn more about it, what it does, where it's
 * from, elemental type, special attack, (make up a backstory) etc. it'll be
 * another dashboard section that just displays information."
 *
 * The Codex page's Bestiary tab read `rpg._seenMonsters || rpg.killedMonsters`,
 * which nothing has written since the fights moved to the worker: it was empty
 * for everyone.  What a player KNOWS about a monster is what they have killed
 * of it, so the count lives here, on the worker, where a kill is a fact:
 * counted at the one place a monster dies and pays (combat.js
 * `_resolveMonsterKill`, beside the quest and daily-quest credit), for every
 * player that kill pays XP to -- a party's kill teaches the whole party, as it
 * counts for their quests.
 *
 * THE KINDS are the pets' nine (petbook.js PET_KINDS, petKindOf): each land's
 * monsters, the Poison Forest's two looks apart.  One table, so a codex page and
 * a pet journal page are always about the same monster.  A monster with no
 * land (the closed old zones) teaches nothing.  A kill at level 21 or more is
 * the land's SECOND STAGE (petStageOf, wheelStageLooks.js: the recoloured
 * monsters past the first pass), counted on its own as well, for the entry's
 * elder form.
 *
 * WHAT THE COUNTS OPEN is the game's business (src/data/monsterCodex.js
 * CODEX_TIERS, which mirror-audit holds to TIERS below): the worker only needs
 * the thresholds to know which kill must reach storage at once.
 *
 * THE RECORD `codex:<pid>` (handoff rule 1: never a new field on the rpg
 * blob) is `{ v, k: { <kind>: [kills, secondStageKills] } }` -- nine pairs of
 * numbers at most.  One GET at join, cached for the session:
 *   - a kill that crosses a threshold (a new fact) is written AT ONCE;
 *   - any other kill at most once every SAVE_MS, on the next kill after it,
 *     and on disconnect (index.js webSocketClose) -- a deploy (rule 11) can
 *     lose at most a minute of counting and never a fact already learned;
 *   - a record a NEWER worker wrote (`v` above V) is LOCKED: left whole, never
 *     counted into or overwritten (a rollback must not shrink it), and so is
 *     one whose read failed -- a failed read must never become a fresh record
 *     written over the real one.
 * Deleted with the character (persistence.js _resetCharacterData).
 *
 * THE WIRE:
 *   codex_state {v, k}             at join, after the pets record; {unavailable}
 *                                  when locked.  PRIVILEGED (index.js).
 *   combat_credit.cx {k, n, n2}    the kill's kind and its new counts, on the
 *                                  credit message the recipient already gets --
 *                                  no new message per kill.
 *   caps.codex                     advertised; `codex: false` in liveflags is
 *                                  the kill switch (the join's spread turns the
 *                                  cap off, _codexOff stops the counting; what
 *                                  was learned stays readable).
 * Spec: docs/specs/monster-codex.md.  Suite: server/test/codex.test.mjs. */
import { PET_KINDS, petKindOf, petStageOf } from './petbook.js';

export const CODEX_KEY = (playerId) => 'codex:' + playerId;

export const CODEX = Object.freeze({
  V: 1,
  /* the nine kinds, in the pets' order */
  KINDS: Object.freeze(Object.keys(PET_KINDS)),
  /* the kills at which an entry tells more: its page, its element, its
     special attack, its story (src/data/monsterCodex.js CODEX_TIERS) */
  TIERS: Object.freeze([1, 3, 10, 25]),
  /* second-stage kills that show the elder form */
  STAGE2_AT: 1,
  /* counting that crosses no threshold reaches storage at most this often */
  SAVE_MS: 60000,
  /* a count stops here: big enough never to be reached, small enough that a
     stored number can never grow without bound */
  MAX: 9999999,
});

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const count = (v) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(CODEX.MAX, n) : 0;
};

/** A stored codex record, made safe to count into: `{rec, locked}`.  Locked
 *  when a newer worker wrote it (left exactly as it is). */
export function normalizeCodex(raw) {
  if (raw && typeof raw === 'object' && Number(raw.v) > CODEX.V) return { rec: null, locked: true };
  const k = Object.create(null);
  const src = raw && typeof raw === 'object' && raw.k && typeof raw.k === 'object' ? raw.k : null;
  if (src) {
    for (const kind of CODEX.KINDS) {
      if (!has(src, kind)) continue;
      const pair = Array.isArray(src[kind]) ? src[kind] : [];
      const n = count(pair[0]);
      if (!n) continue;
      k[kind] = [n, Math.min(n, count(pair[1]))];
    }
  }
  return { rec: { v: CODEX.V, k }, locked: false };
}

/** Did going from `before` to `after` kills cross a threshold? */
export function codexCrossed(before, after) {
  for (const t of CODEX.TIERS) if (before < t && after >= t) return true;
  return false;
}

export const codexMethods = {
  /* `codex: false` in liveflags -- no counting (what was learned stays) */
  _codexOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'codex') && !f.codex);
  },

  /* playerId -> { rec, locked, dirty, savedAt }.  The cache lives as long as
     the session; storage is the truth (rule 11). */
  _codexMap() {
    if (!this._codexCache) this._codexCache = new Map();
    return this._codexCache;
  },
  _codexOf(pid) {
    return (pid && this._codexMap().get(pid)) || null;
  },
  _codexForget(pid) {
    if (pid) this._codexMap().delete(pid);
  },

  /* A COPY: storage clones on put anyway, and the suites' storage does not --
     an aliased object would let a test pass on a write that never happened. */
  _codexSave(pid, book) {
    if (!book || book.locked || !book.rec) return;
    book.dirty = false;
    book.savedAt = Date.now();
    try { this.state.storage.put(CODEX_KEY(pid), JSON.parse(JSON.stringify(book.rec))); } catch (e) { /* fire-and-forget, the _saveRpg posture */ }
  },
  /* On disconnect (index.js webSocketClose): a copy of a record with counting
     only in memory, or null -- taken synchronously, so the cache can go at
     once -- and its put, awaited at the end of the handler. */
  _codexDirtyCopy(pid) {
    const book = this._codexOf(pid);
    if (!book || book.locked || !book.dirty || !book.rec) return null;
    book.dirty = false;
    return JSON.parse(JSON.stringify(book.rec));
  },
  async _codexPut(pid, copy) {
    if (!pid || !copy) return;
    try { await this.state.storage.put(CODEX_KEY(pid), copy); } catch (e) { /* best-effort: a minute of counting */ }
  },

  /* ═══ AT JOIN ═══ one storage GET.  A record already in memory for this
     player -- a session the same id just superseded (join.js's eviction skips
     webSocketClose) -- is the newest truth and is kept rather than re-read. */
  async _codexLoadOnJoin(pid) {
    if (!pid) return null;
    const map = this._codexMap();
    let book = map.get(pid);
    if (book && !book.locked) return book;
    let raw, failed = false;
    try { raw = await this.state.storage.get(CODEX_KEY(pid)); } catch (e) { failed = true; }
    if (failed) {
      book = { rec: null, locked: true, dirty: false, savedAt: 0 };
    } else {
      const n = normalizeCodex(raw);
      book = { rec: n.rec, locked: n.locked, dirty: false, savedAt: Date.now() };
    }
    map.set(pid, book);
    return book;
  },

  /* What the phone is sent: the counts, copied. */
  _codexWire(book) {
    const k = {};
    for (const kind of Object.keys(book.rec.k)) k[kind] = book.rec.k[kind].slice();
    return { v: book.rec.v, k };
  },
  _codexSend(pid) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    const book = this._codexOf(pid);
    const payload = (!book || book.locked || !book.rec) ? { unavailable: true } : this._codexWire(book);
    try { ws.send(JSON.stringify({ type: 'codex_state', payload })); } catch (e) {}
  },

  /* ═══ A KILL (combat.js _resolveMonsterKill, for each XP recipient) ═══
     Counts monster `m` for player `pid` and returns what the credit message
     carries -- `{k, n, n2}` -- or null when nothing was counted. */
  _codexOnKill(pid, m, now) {
    if (this._codexOff()) return null;
    const book = this._codexOf(pid);
    if (!book || book.locked || !book.rec) return null;
    const kind = petKindOf(m);
    if (!kind || !has(PET_KINDS, kind)) return null;
    const second = petStageOf(m && m.level) >= 2;
    const pair = has(book.rec.k, kind) ? book.rec.k[kind] : [0, 0];
    const before = pair[0], before2 = pair[1];
    const after = Math.min(CODEX.MAX, before + 1);
    const after2 = second ? Math.min(after, before2 + 1) : before2;
    book.rec.k[kind] = [after, after2];
    const t = typeof now === 'number' ? now : Date.now();
    const learned = codexCrossed(before, after) || (before2 < CODEX.STAGE2_AT && after2 >= CODEX.STAGE2_AT);
    if (learned || t - (book.savedAt || 0) >= CODEX.SAVE_MS) this._codexSave(pid, book);
    else book.dirty = true;
    return { k: kind, n: after, n2: after2 };
  },

  /* ═══ THE TEST LEVER (devtools /dev/codex) ═══
     Twenty-five kills of nine kinds is a long way to walk to look at a page:
     sets `kind`'s counts (or every kind's, `all`), writes and tells the
     phone.  `n` kills, `n2` of them past level 20. */
  _codexDevSet(pid, body) {
    const book = this._codexOf(pid);
    if (!book) return { ok: false, error: 'not online' };
    if (book.locked || !book.rec) return { ok: false, error: 'codex record locked' };
    const b = body && typeof body === 'object' ? body : {};
    const kinds = b.all ? CODEX.KINDS : (typeof b.kind === 'string' && has(PET_KINDS, b.kind) ? [b.kind] : []);
    if (!kinds.length) return { ok: false, error: 'kind (one of ' + CODEX.KINDS.join(', ') + ') or all' };
    const n = count(b.n), n2 = Math.min(n, count(b.n2));
    for (const kind of kinds) {
      if (n) book.rec.k[kind] = [n, n2];
      else delete book.rec.k[kind];
    }
    this._codexSave(pid, book);
    this._codexSend(pid);
    return { ok: true, kinds, n, n2 };
  },
};
