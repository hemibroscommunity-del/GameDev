/* ═══ v2.3.3948: RARE FISH, WEIGHED, WITH RECORDS ═══
 *
 * The owner, 2026-11-02: "Add a 1% chance of catching an albino version of
 * whatever fish you're trying to catch. Consuming adds a one time 5
 * achievement point bonus. Also add a 0.1% chance of catching 'large'
 * whatever fish you're fishing. Consuming adds 10 achievement points (one
 * time). It also heals double. Doing an 'inspect' will roll for finding the
 * weight of the fish. Include leaderboards for largest caught types of fish
 * (triggered by inspection)."  Spec: docs/specs/fish-variants.md.
 *
 * THE CATCH (gathering.js, the one place a fish is paid): each fish rolls on
 * the worker -- 0.1% LARGE, else 1% ALBINO, else the plain fish; never both.
 * A variant is its OWN bag key, the species' key with a suffix:
 * `fish_trout_albino`, `fish_pike_large` (cooked: `cooked_fish_trout_albino`,
 * cooking.js prefixes `cooked_` to whatever it cooks).  So a variant never
 * stacks with the plain fish, and every rule that reads a fish by its prefix
 * (`fish_`, `cooked_fish_`: the cook, the eat, the quests, the shop, the
 * store's tab, the bag's Fish chip) keeps working on it; the species lookups
 * (`species.includes(name)`) still find the trout in `trout_albino`.
 *
 * EATING (cooking.js _handleEatRequest): a large fish heals double, and the
 * first albino and the first large of each species a player eats are one
 * achievement each (achievements.js: `albino_<species>` 5 AP,
 * `large_<species>` 10 AP, once, through _achvGrant -- a fish bought or
 * traded counts as well: what is paid for is eating one).
 *
 * WEIGHING: `fish_inspect {key}` -- the bag's Inspect on a fish -- weighs ONE
 * catch of that key: a weight rolled once, in its species' range (WEIGHTS
 * below; a large fish 3 to 5 times the plain fish's biggest, an albino the
 * plain range), and answered `fish_weight`.  Each fish CAUGHT can be weighed
 * once: the worker counts, per player, the catches of each key not yet
 * weighed, and a weigh-in takes one.  A fish that was not caught (bought,
 * traded, out of the daily chest) has no catch to weigh: "You've weighed all
 * your Trout."  Raw or cooked, the catch is the raw key's.
 *
 * THE RECORD `fishlog:<pid>` (handoff rule 1: never a new field on the rpg
 * blob) is `{v, u: {<raw key>: catches not weighed}, b: {<species>: best
 * grams}}` -- at most 15 keys and 5 species.  One GET at the join (beside the
 * codex), cached for the session, the codex's rules:
 *   - a CATCH only counts, in memory: written at most once a SAVE_MS, on the
 *     next catch after it, and on disconnect (index.js webSocketClose,
 *     linger.js) -- a deploy loses at most a minute of catches to weigh,
 *     never a fish (the fish is in the bag, the rpg save's);
 *   - a WEIGH-IN is written at once, before its answer goes (rule 10): a
 *     weigh lost to a deploy would be a second roll of the same catch;
 *   - a record a NEWER worker wrote (`v` above V), or one whose read failed,
 *     is LOCKED: never counted into, weighed from or overwritten;
 *   - deleted with the character (persistence.js _resetCharacterData).
 * Writes: one row a minute while fishing at most, one a weigh-in -- and a
 * weigh-in needs a catch, so a script that taps Inspect writes no more rows
 * than it caught fish (cost-guard.test §11).
 *
 * THE BOARDS `fish_board` (one GameRoom key, the Ace board's way, gamble.js:
 * never the Leaderboard DO, which ranks skills every 5 minutes and forgets a
 * player after 7 days): one board a species, the ten heaviest, ONE row a
 * player (their best), `{pid, name, g, v?, at}`.  A weigh-in that beats a
 * board's tenth enters it, written at once in the weigh-in's run.  Read once
 * a worker's life (the only writer is this room); a newer `v`, or a failed
 * read, locks it -- shown as it was read, never written.  Ties keep the
 * earlier row above.
 *
 * THE WIRE:
 *   harvest_credit.fish {key, sp, v}   the catch's key and variant (null for
 *                                      a plain fish): the phone's words
 *                                      ("An albino Trout!").
 *   fish_inspect {key}                 phone -> worker (index.js's router).
 *   fish_weight {key, sp, v, g, best, newBest, rank, left} | {key, sp, v,
 *       none: true} | {key, off: true} | {key, unavailable: true}
 *                                      PRIVILEGED (index.js).
 *   fish_board_request {}              phone -> worker.
 *   fish_board {boards: {<sp>: [{pid, name, g, v?, at}]}} | {off: true}
 *                                      PRIVILEGED (index.js).
 *   caps.fishvariants, caps.fishweigh  advertised (join.js); the phone gates
 *       its Inspect and its Biggest fish tab on fishweigh.  Kill switches in
 *       the live flags: `fishvariants: false` rolls no variant (every fish
 *       plain), `fishweigh: false` counts no catch, weighs nothing and shows
 *       no board (what was weighed stays).
 *   /dev/fish {next: 'albino'|'large'|'normal'|null, give: <key>, n}  the
 *       owner's lever (devtools.js): the next fish caught is that variant;
 *       or `give` puts `n` of a fish key in the bag AS CATCHES (weighable).
 *
 * Suite: server/test/fish-variants.test.mjs. */
import { FISH_TIERS } from './data.js';

export const FISHLOG_KEY = (playerId) => 'fishlog:' + playerId;

/* The species, in the fishing ladder's order (data.js FISH_TIERS). */
const SPECIES = Object.freeze(FISH_TIERS.map((t) => t.name));

/* v2.3.3948: what each species weighs, in GRAMS (the owner's table, in kg:
   Minnow 0.05-0.2, Clownfish 0.1-0.4, Trout 0.5-3, Salmon 2-8, Pike 2-12).
   A large one is LARGE_MIN to LARGE_MAX times the plain fish's biggest; an
   albino weighs what a plain one does.  Mirrored in src/data/fishVariants.js
   (mirror-audit): the phone's Records page names the ranges. */
const WEIGHTS = Object.freeze({
  minnow: Object.freeze([50, 200]),
  clownfish: Object.freeze([100, 400]),
  trout: Object.freeze([500, 3000]),
  salmon: Object.freeze([2000, 8000]),
  pike: Object.freeze([2000, 12000]),
});

export const FISHLOG = Object.freeze({
  V: 1,
  SPECIES,
  VARIANTS: Object.freeze(['albino', 'large']),
  /* the odds, rolled in this order: large first, and an albino only on a
     fish that is not large ("0.1% large, else 1% albino") */
  LARGE_ODDS: 0.001,
  ALBINO_ODDS: 0.01,
  WEIGHTS,
  LARGE_MIN: 3,
  LARGE_MAX: 5,
  /* catches that write nothing new reach storage at most this often (the
     codex's minute) */
  SAVE_MS: 60000,
  /* a count stops here: never reached, never unbounded in storage */
  MAX: 99999,
  /* the boards */
  BOARD_KEY: 'fish_board',
  BOARD_V: 1,
  BOARD_SIZE: 10,
  NAME_MAX: 24,
  /* the most of a key the lever gives at once */
  GIVE_MAX: 50,
});

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const KEY_RE = /^(cooked_)?fish_([a-z]+)(?:_(albino|large))?$/;

/** A fish key read: `{cooked, sp, v, raw}` -- the species, the variant
 *  (null for a plain fish) and the RAW key its catches are counted under --
 *  or null for anything that is not one of the game's fish. */
export function fishKeyInfo(key) {
  if (typeof key !== 'string' || key.length > 64) return null;
  const m = KEY_RE.exec(key);
  if (!m || !has(WEIGHTS, m[2])) return null;
  const v = m[3] || null;
  return { cooked: !!m[1], sp: m[2], v, raw: 'fish_' + m[2] + (v ? '_' + v : '') };
}

/** The variant's key for a plain fish key (`fish_trout` + 'albino'). */
export function fishVariantKey(plainKey, v) {
  return v ? plainKey + '_' + v : plainKey;
}

/** The variant of the next fish: 'large', 'albino' or null.  `rand` is the
 *  dice (Math.random); two rolls, never both. */
export function rollFishVariant(rand) {
  const r = typeof rand === 'function' ? rand : Math.random;
  if (r() < FISHLOG.LARGE_ODDS) return 'large';
  if (r() < FISHLOG.ALBINO_ODDS) return 'albino';
  return null;
}

/** A weight in grams for a fish of species `sp` and variant `v`. */
export function rollFishWeight(sp, v, rand) {
  const r = typeof rand === 'function' ? rand : Math.random;
  const w = WEIGHTS[sp];
  if (!w) return 0;
  const lo = v === 'large' ? w[1] * FISHLOG.LARGE_MIN : w[0];
  const hi = v === 'large' ? w[1] * FISHLOG.LARGE_MAX : w[1];
  return Math.max(lo, Math.min(hi, Math.round(lo + (hi - lo) * r())));
}

const count = (v) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(FISHLOG.MAX, n) : 0;
};
const RAW_KEYS = Object.freeze(SPECIES.flatMap((sp) => [null, ...FISHLOG.VARIANTS].map((v) => fishVariantKey('fish_' + sp, v))));

/** A stored record, made safe to count into: `{rec, locked}`.  Only the
 *  game's fish keys and species are kept, so no client-chosen key ever
 *  reaches a map. */
export function normalizeFishlog(raw) {
  if (raw && typeof raw === 'object' && Number(raw.v) > FISHLOG.V) return { rec: null, locked: true };
  const u = Object.create(null), b = Object.create(null);
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const k of RAW_KEYS) {
    const n = src.u && typeof src.u === 'object' && has(src.u, k) ? count(src.u[k]) : 0;
    if (n) u[k] = n;
  }
  for (const sp of SPECIES) {
    const g = src.b && typeof src.b === 'object' && has(src.b, sp) ? count(src.b[sp]) : 0;
    if (g) b[sp] = g;
  }
  return { rec: { v: FISHLOG.V, u, b }, locked: false };
}

/** A stored board, made safe: `{boards, locked}`. */
export function normalizeFishBoard(raw) {
  if (raw && typeof raw === 'object' && Number(raw.v) > FISHLOG.BOARD_V) return { boards: null, locked: true };
  const boards = Object.create(null);
  const src = raw && typeof raw === 'object' && raw.b && typeof raw.b === 'object' ? raw.b : {};
  for (const sp of SPECIES) {
    const list = has(src, sp) && Array.isArray(src[sp]) ? src[sp] : [];
    const seen = new Set();
    const rows = [];
    for (const e of list) {
      if (!e || typeof e !== 'object' || typeof e.pid !== 'string' || seen.has(e.pid)) continue;
      const g = count(e.g);
      if (!g) continue;
      seen.add(e.pid);
      const row = { pid: e.pid, name: String(e.name || 'Bro').slice(0, FISHLOG.NAME_MAX), g, at: Math.floor(Number(e.at) || 0) };
      if (e.v === 'albino' || e.v === 'large') row.v = e.v;
      rows.push(row);
    }
    rows.sort((x, y) => (y.g - x.g) || (x.at - y.at));
    boards[sp] = rows.slice(0, FISHLOG.BOARD_SIZE);
  }
  return { boards, locked: false };
}

/* a plain copy for storage and the wire (codex.js's note: the suites'
   storage does not clone, and an aliased object would pass a test on a write
   that never happened) */
const plainLog = (rec) => ({ v: rec.v, u: { ...rec.u }, b: { ...rec.b } });
const plainBoards = (boards) => {
  const b = {};
  for (const sp of SPECIES) b[sp] = (boards && boards[sp] ? boards[sp] : []).map((e) => ({ ...e }));
  return b;
};

export const fishlogMethods = {
  /* the kill switches, read the lower-case way (TRAPS §117) */
  _fishVariantsOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'fishvariants') && !f.fishvariants);
  },
  _fishWeighOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'fishweigh') && !f.fishweigh);
  },

  /* playerId -> { rec, locked, dirty, savedAt } */
  _fishlogMap() {
    if (!this._fishlogCache) this._fishlogCache = new Map();
    return this._fishlogCache;
  },
  _fishlogOf(pid) {
    return (pid && this._fishlogMap().get(pid)) || null;
  },
  _fishlogForget(pid) {
    if (pid) this._fishlogMap().delete(pid);
    if (pid && this._fishForce) this._fishForce.delete(pid);
  },
  _fishlogSave(pid, book) {
    if (!book || book.locked || !book.rec) return;
    book.dirty = false;
    book.savedAt = Date.now();
    try { this.state.storage.put(FISHLOG_KEY(pid), plainLog(book.rec)); } catch (e) { /* fire-and-forget, the _saveRpg posture */ }
  },
  /* On disconnect (index.js webSocketClose, linger.js _lingerEnd): a copy of
     a record with catches counted only in memory, or null -- taken
     synchronously, written (awaited) at the end of the handler, the codex's
     way. */
  _fishlogDirtyCopy(pid) {
    const book = this._fishlogOf(pid);
    if (!book || book.locked || !book.dirty || !book.rec) return null;
    book.dirty = false;
    return plainLog(book.rec);
  },
  async _fishlogPut(pid, copy) {
    if (!pid || !copy) return;
    try { await this.state.storage.put(FISHLOG_KEY(pid), copy); } catch (e) { /* best-effort: a minute of catches */ }
  },

  /* ═══ AT JOIN (join.js, beside the codex) ═══ one GET.  A record already in
     memory (a session the same id just superseded) is the newest truth. */
  async _fishlogLoadOnJoin(pid) {
    if (!pid) return null;
    const map = this._fishlogMap();
    let book = map.get(pid);
    if (book && !book.locked) return book;
    let raw, failed = false;
    try { raw = await this.state.storage.get(FISHLOG_KEY(pid)); } catch (e) { failed = true; }
    if (failed) book = { rec: null, locked: true, dirty: false, savedAt: 0 };
    else {
      const n = normalizeFishlog(raw);
      book = { rec: n.rec, locked: n.locked, dirty: false, savedAt: Date.now() };
    }
    map.set(pid, book);
    return book;
  },

  /* the dice: `_fishDice` when a suite holds them, else Math.random */
  _fishRand() {
    return typeof this._fishDice === 'function' ? this._fishDice() : Math.random();
  },

  /* ═══ THE CATCH (gathering.js _handleNodeStrike) ═══
     `qty` fish of plain key `plainKey` into the bag, each rolled for its
     variant; each counted as a catch to weigh.  Returns what harvest_credit
     says: `{key, sp, v}` of the last fish (a strike pays one fish:
     gathering.js _harvestYieldMult).  The caller saves the rpg blob. */
  _fishCatch(pid, ps, plainKey, qty) {
    const info = fishKeyInfo(plainKey);
    const n = Math.max(1, Math.floor(Number(qty) || 1));
    if (!ps.inventory) ps.inventory = {};
    if (!info || info.v) {   /* not one of the game's fish: paid as it was */
      ps.inventory[plainKey] = (ps.inventory[plainKey] || 0) + n;   // proto-ok: plainKey is gathering.js _harvestInvKey's, from its own table
      return null;
    }
    let out = null;
    for (let i = 0; i < n; i++) {
      let v = null;
      const forced = this._fishForce ? this._fishForce.get(pid) : undefined;
      if (forced !== undefined) {   /* the owner's lever, one fish (devtools /dev/fish) */
        this._fishForce.delete(pid);
        v = forced;
      } else if (!this._fishVariantsOff()) {
        v = rollFishVariant(() => this._fishRand());
      }
      const key = fishVariantKey(plainKey, v);
      ps.inventory[key] = (ps.inventory[key] || 0) + 1;   // proto-ok: one of RAW_KEYS
      this._fishlogCount(pid, key, 1);
      out = { key, sp: info.sp, v };
    }
    return out;
  },

  /* a catch to weigh: counted in memory, written at most once a SAVE_MS
     (and on disconnect) */
  _fishlogCount(pid, rawKey, n) {
    if (this._fishWeighOff()) return;
    const book = this._fishlogOf(pid);
    if (!book || book.locked || !book.rec) return;
    book.rec.u[rawKey] = Math.min(FISHLOG.MAX, (book.rec.u[rawKey] || 0) + n);
    if (Date.now() - (book.savedAt || 0) >= FISHLOG.SAVE_MS) this._fishlogSave(pid, book);
    else book.dirty = true;
  },

  _fishSend(pid, type, payload) {
    const ws = this._wsBySessionId && this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) { /* display only */ }
  },

  /* ═══ THE BOARDS ═══ read once a worker's life (this room is the only
     writer); a failed read or a newer one is locked: shown, never written. */
  async _fishBoardEnsure() {
    if (this._fishBoardBook) return this._fishBoardBook;
    let raw, failed = false;
    try { raw = await this.state.storage.get(FISHLOG.BOARD_KEY); } catch (e) { failed = true; }
    /* a read that failed is tried again by the next ask (nothing cached) */
    if (failed) return { boards: null, locked: true };
    if (this._fishBoardBook) return this._fishBoardBook;   /* another ask filled it while this one read */
    this._fishBoardBook = normalizeFishBoard(raw);
    return this._fishBoardBook;
  },

  /* A weigh-in of `g` grams of species `sp` by `pid`: on the board if it
     beats the tenth (or the board is short) and this player's own row.
     Returns the place it holds (1-10) or 0.  Written at once. */
  _fishBoardEnter(book, pid, name, sp, g, v, at) {
    if (!book || book.locked || !book.boards) return 0;
    const list = book.boards[sp] || [];
    const mine = list.find((e) => e.pid === pid);
    if (mine && mine.g >= g) return 0;
    if (!mine && list.length >= FISHLOG.BOARD_SIZE && g <= list[list.length - 1].g) return 0;
    const row = { pid, name: String(name || 'Bro').slice(0, FISHLOG.NAME_MAX), g, at };
    if (v) row.v = v;
    const next = list.filter((e) => e.pid !== pid);
    next.push(row);
    next.sort((x, y) => (y.g - x.g) || (x.at - y.at));
    book.boards[sp] = next.slice(0, FISHLOG.BOARD_SIZE);
    try { this.state.storage.put(FISHLOG.BOARD_KEY, { v: FISHLOG.BOARD_V, b: plainBoards(book.boards) }); } catch (e) { /* fire-and-forget */ }
    const idx = book.boards[sp].indexOf(row);
    return idx >= 0 ? idx + 1 : 0;
  },

  /* ═══ fish_inspect {key} (index.js's router) ═══ */
  async _handleFishInspect(session, payload) {
    const pid = session && session.id;
    const ps = pid && this.playerState && this.playerState[pid];
    if (!ps) return;
    const key = payload && typeof payload === 'object' ? payload.key : null;
    const info = fishKeyInfo(key);
    if (!info) return;   /* deny by default: not a fish of this game, nothing answered */
    if (this._fishWeighOff()) { this._fishSend(pid, 'fish_weight', { key, off: true }); return; }
    const base = { key, sp: info.sp, v: info.v };
    const inv = ps.inventory && typeof ps.inventory === 'object' ? ps.inventory : null;
    const held = inv && has(inv, key) ? Math.floor(Number(inv[key]) || 0) : 0;
    const book = this._fishlogOf(pid);
    if (!book || book.locked || !book.rec) { this._fishSend(pid, 'fish_weight', { ...base, unavailable: true }); return; }
    const left = book.rec.u[info.raw] || 0;
    if (held <= 0 || left <= 0) { this._fishSend(pid, 'fish_weight', { ...base, none: true, left: 0 }); return; }
    /* the board is read BEFORE anything changes: a storage await keeps the
       gate shut (rule 9), and nothing below awaits */
    const board = await this._fishBoardEnsure();
    if (!this.playerState[pid] || (book.rec.u[info.raw] || 0) <= 0) return;   /* gone while it read */
    const g = rollFishWeight(info.sp, info.v, () => this._fishRand());
    const now = Date.now();
    const n = book.rec.u[info.raw] - 1;
    if (n > 0) book.rec.u[info.raw] = n;
    else delete book.rec.u[info.raw];
    const prev = book.rec.b[info.sp] || 0;
    const newBest = g > prev;
    if (newBest) book.rec.b[info.sp] = g;
    this._fishlogSave(pid, book);   /* at once: a lost weigh-in would be a second roll */
    const rank = this._fishBoardEnter(board, pid, this._laneNameOf ? this._laneNameOf(pid) : ps.name, info.sp, g, info.v, now);
    this._fishSend(pid, 'fish_weight', { ...base, g, best: book.rec.b[info.sp], newBest, rank, left: n });
  },

  /* ═══ fish_board_request (index.js's router) ═══ */
  async _handleFishBoardRequest(session) {
    const pid = session && session.id;
    if (!pid || !this.playerState[pid]) return;
    if (this._fishWeighOff()) { this._fishSend(pid, 'fish_board', { off: true }); return; }
    const board = await this._fishBoardEnsure();
    this._fishSend(pid, 'fish_board', board && board.boards ? { boards: plainBoards(board.boards) } : { unavailable: true });
  },

  /* ═══ THE OWNER'S LEVER (devtools /dev/fish) ═══
     `next`: the next fish this player catches is 'albino', 'large' or
     'normal' (null clears it) -- in memory, one fish, gone on a deploy.
     `give` + `n`: that many of a raw fish key put in the bag AS CATCHES (each
     one weighable), saved at once; a cooked key goes in the bag alone. */
  _fishDev(pid, body) {
    const ps = this.playerState && this.playerState[pid];
    if (!ps) return { ok: false, error: 'not online' };
    const b = body && typeof body === 'object' ? body : Object.create(null);
    const out = { ok: true };
    if (has(b, 'next')) {
      if (!this._fishForce) this._fishForce = new Map();
      if (b.next === null || b.next === '') { this._fishForce.delete(pid); out.next = null; }
      else if (b.next === 'normal' || b.next === 'albino' || b.next === 'large') {
        this._fishForce.set(pid, b.next === 'normal' ? null : b.next);
        out.next = b.next;
      } else return { ok: false, error: "next: 'albino', 'large', 'normal' or null" };
    }
    if (has(b, 'give')) {
      const info = fishKeyInfo(b.give);
      if (!info) return { ok: false, error: 'give: a fish key (fish_<species>[_albino|_large], or cooked_)' };
      const n = Math.max(1, Math.min(FISHLOG.GIVE_MAX, Math.floor(Number(b.n) || 1)));
      if (!ps.inventory) ps.inventory = {};
      ps.inventory[b.give] = (ps.inventory[b.give] || 0) + n;   // proto-ok: fishKeyInfo matched one of the game's fish
      if (!info.cooked) {
        const book = this._fishlogOf(pid);
        if (book && !book.locked && book.rec && !this._fishWeighOff()) {
          book.rec.u[info.raw] = Math.min(FISHLOG.MAX, (book.rec.u[info.raw] || 0) + n);
          this._fishlogSave(pid, book);
        }
      }
      this._saveRpg(pid, ps);
      if (this._queuePlayerStateFlush) this._queuePlayerStateFlush(pid);
      out.give = b.give;
      out.n = n;
    }
    if (!has(b, 'next') && !has(b, 'give')) return { ok: false, error: "next ('albino'|'large'|'normal'|null) or give (a fish key) and n" };
    return out;
  },
};
