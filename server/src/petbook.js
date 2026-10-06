/* ═══ v2.3.3111: THE PETS RECORD — pets:<playerId> ═══
 * Plan: docs/PET-TRAPPING-PLAN.md, "For the builder".  Spec:
 * docs/specs/trapping.md.  Catches come from trapping.js.
 *
 * Until now a pet lived inside the rpg blob's lifeSkills (`pets`, an array of
 * up to six, and `activePet`, an INDEX into it), with an id made fresh at
 * every join and a shape that kept only the archetype -- a fire goblin, a
 * storm slime and a blue slime all became the same pet.  And the join took up
 * to six pets from the browser for anyone the server had none for
 * (pets.js _petsAdoptOnJoin): any kind, at level 100, on every join.
 *
 * THE RECORD IS THE ONLY PROOF A PET IS YOURS.  Only the worker writes it, and
 * nothing a phone says about its pets is ever read again.  Each pet has an id
 * made by the worker that never changes and is unique across every player
 * (`p_...`), so a pet can be followed from owner to owner once pets trade
 * (Phase 3), and a short story: what it is (`kind`, `look`, `home`, `stage`),
 * who caught it and when (`caughtBy`, `at`), how many owners it has had, and
 * when it may first be traded (`tradeAfter`, a day after its catch).
 *
 *   pets:<pid> = { v: 1, cap: 30, active: 'p_...' | null, moved: true,
 *     list: [{ id, kind, look, home, stage, gold, size, name, lv, xp, at,
 *              caughtBy, owners, tradeAfter, legacy? }],
 *     journal: { '<kind>.<stage>': { tries, n, gold, big } } }
 *
 * Its own storage key (handoff rules 1 and 2): one GET at join, never a prefix
 * list.  Versioned: a worker that finds a NEWER `v` leaves the record whole
 * and refuses to touch it (a rollback must not destroy it) -- arms and pet
 * actions are refused for that session instead.  Deleted by
 * _resetCharacterData.  Not in the daily rpgsnap:.
 *
 * WHEN IT IS WRITTEN.  A catch and every pet action write at once.  A miss
 * only counts a try (`journal`), which never changes the odds, so it is kept
 * in memory and written at most every SAVE_MS, and on disconnect: rows
 * written per kill were the regen mistake (handoff rule 4).
 *
 * OLD PETS MOVE IN ONCE (`moved`), from the stored rpg blob's lifeSkills.pets
 * -- never from the browser: the join no longer adopts a client's list, and a
 * first connect's life skills lose `pets` before anything reads them
 * (trapping.js trapBootstrapGuard).  The kind is guessed from the old element
 * and archetype, the level capped at the player's Trapping level, and each is
 * marked `legacy`: it may have been made by a browser in the years the join
 * adopted them, so, like gear with no provenance row (gearprov.js), it works
 * in every way and can never be traded.
 *
 * KILL SWITCH (lower case, TRAPS §117): `petbook: false` in liveflags
 * un-advertises caps.petbook and refuses naming, setting active and
 * releasing.  The record still loads, a catch still lands in it, and an
 * active pet still picks up loot: switching the page off must not take
 * anyone's pets away.
 */
import { trapLevelOf } from './trapping.js';

export const PETS_KEY = (playerId) => 'pets:' + playerId;

export const PETBOOK = Object.freeze({
  V: 1,
  CAP: 30,            // the collection to start (the Pet House sells more, Phase 4)
  CAP_MAX: 120,       // the most it can ever hold, so the record stays small
  SAVE_MS: 60000,     // a try counted in memory is written at most this often
  ACTIONS_PER_MIN: 30,
  TRADE_HOLD_MS: 24 * 3600 * 1000,   // a new pet can't be traded for a day
  GOLD_CHANCE: 1 / 50,               // about one catch in fifty is golden
  /* A pet's size: 0.85-1.25, most near 1.05 (the mean of two rolls), and a
     Big badge from 1.18, about one in sixteen. */
  SIZE_MIN: 0.85, SIZE_MAX: 1.25, BIG_AT: 1.18,
});

/* The nine kinds: each land's monsters, tamed.  `look` is the monster's look
   as the game draws it (its archetype once its zone's variant is applied --
   src/data/wheelStageLooks.js's keys), `home` its land.  The names a kind goes
   by are the phone's (src/data/trapping.js PET_KINDS); mirror-audit holds the
   two tables to the same kinds, lands and looks. */
export const PET_KINDS = Object.freeze({
  snowling: Object.freeze({ home: 'frost', look: 'snowman' }),
  gobling: Object.freeze({ home: 'ember', look: 'fireGoblin' }),
  mumling: Object.freeze({ home: 'sky', look: 'mummy' }),
  pebbling: Object.freeze({ home: 'hollows', look: 'rockmonster' }),
  sparklet: Object.freeze({ home: 'thunder', look: 'fodder' }),
  finling: Object.freeze({ home: 'tidal', look: 'fishman' }),
  wisplet: Object.freeze({ home: 'mist', look: 'mireWisp' }),
  lurkling: Object.freeze({ home: 'mist', look: 'bogLurker' }),
  dewdrop: Object.freeze({ home: 'verdant', look: 'blueSlime' }),
});

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const KIND_BY_HOME = Object.freeze({
  frost: 'snowling', ember: 'gobling', sky: 'mumling', hollows: 'pebbling',
  thunder: 'sparklet', tidal: 'finling', mist: 'wisplet', verdant: 'dewdrop',
});

/** The kind a Wheel monster becomes, from its land and the look it SPAWNED in
 *  (a mummy torn down to its skeleton is still a mummy).  null for a monster
 *  with no land. */
export function petKindOf(m) {
  const home = m && typeof m.home === 'string' ? m.home : '';
  if (!has(KIND_BY_HOME, home)) return null;
  const look = (m && (m.spawnVariant || m.variant)) || '';
  if (home === 'mist' && (look === 'bogLurker' || (!look && m.arch === 'brute'))) return 'lurkling';
  return KIND_BY_HOME[home];
}

/** A land's stage: 1 for levels 1-20, 2 for 21-40 (wheelStageLooks.js). */
export function petStageOf(level) {
  const L = Math.floor(Number(level) || 0);
  return L >= 1 ? Math.ceil(L / 20) : 1;
}

/** The journal's key for a kind at a stage. */
export function journalKey(kind, stage) {
  return kind + '.' + Math.max(1, Math.floor(Number(stage) || 1));
}
const JOURNAL_KEY_RE = /^[a-z]{2,16}\.\d{1,2}$/;

/** A size from two rolls: the mean of two uniforms, so most land near 1.05. */
export function petSizeFrom(r1, r2) {
  const t = (Math.max(0, Math.min(1, Number(r1) || 0)) + Math.max(0, Math.min(1, Number(r2) || 0))) / 2;
  return Math.round((PETBOOK.SIZE_MIN + (PETBOOK.SIZE_MAX - PETBOOK.SIZE_MIN) * t) * 100) / 100;
}

/* ═══ A NAME ═══
   2-16 letters, numbers, spaces, hyphens or apostrophes; spaces collapsed and
   trimmed.  NO EMOJI: an emoji in the world's outlined text is a known iPhone
   Safari crash (src/rendering/nodeLabels.js), and a pet's name will float
   over it.  Letters of any alphabet are letters.  The phone runs the same
   rule (src/data/trapping.js cleanPetName; mirror-audit). */
export const PET_NAME = Object.freeze({ MIN: 2, MAX: 16 });
export function cleanPetName(raw) {
  if (typeof raw !== 'string' || raw.length > 64) return null;
  const s = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (s.length < PET_NAME.MIN || s.length > PET_NAME.MAX) return null;
  if (!/^[\p{L}\p{N} '-]+$/u.test(s)) return null;
  if (!/[\p{L}\p{N}]/u.test(s)) return null;
  return s;
}

const PET_ID_RE = /^p_[a-z0-9]{6,40}$/;
const int = (v, lo, hi, dflt) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};

/* One stored pet, every field coerced to its shape.  The record is written
   only by the worker, so this is a guard against a future bug, not against a
   player -- and so it keeps a pet whenever it can, never drops one for a bad
   field: a lost pet is worse than a defaulted one. */
function cleanPet(p, now) {
  if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !PET_ID_RE.test(p.id)) return null;
  const kind = (typeof p.kind === 'string' && has(PET_KINDS, p.kind)) ? p.kind : 'dewdrop';
  const at = int(p.at, 0, now + 60000, now);
  const out = {
    id: p.id,
    kind,
    look: PET_KINDS[kind].look,
    home: PET_KINDS[kind].home,
    stage: int(p.stage, 1, 9, 1),
    gold: p.gold === true,
    size: Math.round(Math.max(PETBOOK.SIZE_MIN, Math.min(PETBOOK.SIZE_MAX, Number(p.size) || 1)) * 100) / 100,
    name: cleanPetName(p.name),
    lv: int(p.lv, 1, 999, 1),
    xp: int(p.xp, 0, 1e12, 0),
    at,
    caughtBy: typeof p.caughtBy === 'string' ? p.caughtBy.slice(0, 64) : '',
    owners: int(p.owners, 1, 1e6, 1),
    tradeAfter: int(p.tradeAfter, 0, 1e15, at + PETBOOK.TRADE_HOLD_MS),
  };
  if (p.legacy === true) out.legacy = true;
  return out;
}

/** A stored record, normalised; `{locked: true}` when it is from a NEWER
 *  worker than this one, which must then leave it whole. */
export function normalizePetbook(raw, now = Date.now()) {
  if (raw && typeof raw === 'object' && Number(raw.v) > PETBOOK.V) return { locked: true, rec: null };
  const rec = { v: PETBOOK.V, cap: PETBOOK.CAP, active: null, moved: false, list: [], journal: Object.create(null) };
  if (raw && typeof raw === 'object') {
    rec.cap = int(raw.cap, PETBOOK.CAP, PETBOOK.CAP_MAX, PETBOOK.CAP);
    rec.moved = raw.moved === true;
    const seen = new Set();
    if (Array.isArray(raw.list)) {
      for (const p of raw.list.slice(0, PETBOOK.CAP_MAX + 10)) {
        const c = cleanPet(p, now);
        if (c && !seen.has(c.id)) { seen.add(c.id); rec.list.push(c); }
      }
    }
    if (typeof raw.active === 'string' && seen.has(raw.active)) rec.active = raw.active;
    if (raw.journal && typeof raw.journal === 'object') {
      for (const k of Object.keys(raw.journal)) {
        if (!JOURNAL_KEY_RE.test(k)) continue;
        const j = raw.journal[k];
        if (!j || typeof j !== 'object') continue;
        rec.journal[k] = {
          tries: int(j.tries, 0, 1e9, 0), n: int(j.n, 0, 1e9, 0), gold: int(j.gold, 0, 1e9, 0),
          big: Math.round(Math.max(0, Math.min(PETBOOK.SIZE_MAX, Number(j.big) || 0)) * 100) / 100,
        };
      }
    }
  }
  return { locked: false, rec };
}

/* The kind an OLD pet (lifeSkills.pets, v2.3.1130) most likely was: its
   element names its land, the archetype splits the Poison Forest's two and
   stands in when the element was lost ('flora' was missing from the old
   element list, so a Verdant pet came back with none). */
const OLD_KIND_BY_ELEMENT = Object.freeze({
  frost: 'snowling', flame: 'gobling', wind: 'mumling', stone: 'pebbling',
  storm: 'sparklet', water: 'finling', venom: 'wisplet', flora: 'dewdrop',
});
const OLD_KIND_BY_ARCH = Object.freeze({
  snowman: 'snowling', brute: 'pebbling', stalker: 'mumling', hexer: 'mumling', volatile: 'mumling',
});
export function oldPetKind(p) {
  const el = p && typeof p.element === 'string' ? p.element : '';
  const arch = p && typeof p.archetype === 'string' ? p.archetype : '';
  if (el === 'venom') return arch === 'brute' ? 'lurkling' : 'wisplet';
  if (has(OLD_KIND_BY_ELEMENT, el)) return OLD_KIND_BY_ELEMENT[el];
  if (has(OLD_KIND_BY_ARCH, arch)) return OLD_KIND_BY_ARCH[arch];
  return 'dewdrop';
}

export const petbookMethods = {
  /* `petbook: false` in liveflags -- no naming, setting active or releasing */
  _petbookOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'petbook') && !f.petbook);
  },

  /* playerId -> { rec, locked, dirty, savedAt, acts }.  The cache lives as
     long as the session; storage is the truth (rule 11). */
  _petbookMap() {
    if (!this._petbookCache) this._petbookCache = new Map();
    return this._petbookCache;
  },
  _petbookOf(pid) {
    return (pid && this._petbookMap().get(pid)) || null;
  },
  _petbookForget(pid) {
    if (pid) this._petbookMap().delete(pid);
  },

  _petbookMintId() {
    this._petSeq = (this._petSeq || 0) + 1;
    const rnd = Math.floor(Math.random() * 2176782336).toString(36).padStart(6, '0');
    return 'p_' + Date.now().toString(36) + this._petSeq.toString(36) + rnd;
  },

  /* Put a COPY: storage clones on put anyway, and the test suites' storage
     does not -- an aliased object would let a test pass on a write that never
     happened. */
  _petbookSave(pid, book) {
    if (!book || book.locked || !book.rec) return;
    book.dirty = false;
    book.savedAt = Date.now();
    try { this.state.storage.put(PETS_KEY(pid), JSON.parse(JSON.stringify(book.rec))); } catch (e) { /* fire-and-forget, the _saveRpg posture */ }
  },
  /* On disconnect (index.js webSocketClose): a copy of a record with a try
     counted only in memory, or null -- taken synchronously, so the cache can
     go at once -- and its put, awaited at the end of the handler. */
  _petbookDirtyCopy(pid) {
    const book = this._petbookOf(pid);
    if (!book || book.locked || !book.dirty || !book.rec) return null;
    book.dirty = false;
    return JSON.parse(JSON.stringify(book.rec));
  },
  async _petbookPut(pid, copy) {
    if (!pid || !copy) return;
    try { await this.state.storage.put(PETS_KEY(pid), copy); } catch (e) { /* best-effort: a lost try never changes the odds */ }
  },

  /* ═══ AT JOIN ═══
     After the rpg blob has set ps.lifeSkills (join.js), before anything reads
     a pet.  One storage GET.  A book already in memory for this player -- a
     session the same id just superseded (join.js's eviction, which skips
     webSocketClose) -- is the newest truth and is kept rather than re-read. */
  async _petbookLoadOnJoin(pid, ps) {
    if (!pid || !ps) return null;
    const map = this._petbookMap();
    let book = map.get(pid);
    if (!book || book.locked) {
      let raw, failed = false;
      try { raw = await this.state.storage.get(PETS_KEY(pid)); } catch (e) { failed = true; }
      if (failed) {
        book = { rec: null, locked: true, dirty: false, savedAt: 0, acts: [] };
        map.set(pid, book);
        return book;
      }
      const n = normalizePetbook(raw);
      book = { rec: n.rec, locked: n.locked, dirty: false, savedAt: Date.now(), acts: [] };
      map.set(pid, book);
    }
    if (book.locked) return book;
    const ls = ps.lifeSkills && typeof ps.lifeSkills === 'object' ? ps.lifeSkills : null;
    if (!book.rec.moved) {
      this._petbookMoveOldPets(pid, ps, book.rec);
      book.rec.moved = true;
      this._petbookSave(pid, book);
    }
    /* The old fields stay empty from now on: the record is the only list. */
    if (ls) {
      if (has(ls, 'pets')) ls.pets = [];
      if (has(ls, 'activePet')) ls.activePet = null;
    }
    return book;
  },

  _petbookMoveOldPets(pid, ps, rec) {
    const ls = ps.lifeSkills && typeof ps.lifeSkills === 'object' ? ps.lifeSkills : null;
    const old = ls && Array.isArray(ls.pets) ? ls.pets : [];
    if (!old.length) return 0;
    const T = trapLevelOf(ps);
    const now = Date.now();
    const activeIdx = ls && typeof ls.activePet === 'number' ? ls.activePet : -1;
    let moved = 0;
    old.slice(0, PETBOOK.CAP).forEach((p, i) => {
      if (!p || typeof p !== 'object' || rec.list.length >= PETBOOK.CAP) return;
      const kind = oldPetKind(p);
      const at = (typeof p.captured_at === 'number' && p.captured_at > 0 && p.captured_at <= now) ? Math.floor(p.captured_at) : now;
      const pet = {
        id: this._petbookMintId(),
        kind, look: PET_KINDS[kind].look, home: PET_KINDS[kind].home,
        stage: 1, gold: false, size: 1,
        name: cleanPetName(p.name),
        lv: Math.max(1, Math.min(T, Math.floor(Number(p.level) || 1))),
        xp: 0, at, caughtBy: pid, owners: 1, tradeAfter: at + PETBOOK.TRADE_HOLD_MS,
        legacy: true,
      };
      rec.list.push(pet);
      if (i === activeIdx && !rec.active) rec.active = pet.id;
      moved++;
    });
    return moved;
  },

  /* What the phone is sent: the record, copied, and when it was sent. */
  _petbookWire(book) {
    const r = book.rec;
    const journal = {};
    for (const k of Object.keys(r.journal)) journal[k] = { ...r.journal[k] };
    return { v: r.v, cap: r.cap, active: r.active, list: r.list.map((p) => ({ ...p })), journal };
  },
  _petbookSend(pid, extra) {
    const book = this._petbookOf(pid);
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    const payload = (!book || book.locked)
      ? { unavailable: true, ...(extra || {}) }
      : { ...this._petbookWire(book), ...(extra || {}) };
    try { ws.send(JSON.stringify({ type: 'pets_state', payload })); } catch (e) {}
  },

  /* The active pet, for the loot vacuum (index.js _handleLootPickup). */
  _petbookActive(pid) {
    const book = this._petbookOf(pid);
    if (!book || book.locked || !book.rec || !book.rec.active) return null;
    return book.rec.list.find((p) => p.id === book.rec.active) || null;
  },

  /* ═══ A CATCH (trapping.js) -- written at once ═══
     The pet starts at the monster's level, which the arm rule keeps at or
     below the catcher's Trapping level.  Never refused for a full collection
     here: the arm checked it, and a pet already caught is never lost, so a
     rare race past the cap lands one over it. */
  _petbookAddCatch(pid, ps, m, T, now) {
    const book = this._petbookOf(pid);
    if (!book || book.locked || !book.rec) return null;
    const kind = petKindOf(m) || 'dewdrop';
    const lvl = Math.max(1, Math.floor(Number(m.level) || 1));
    const stage = petStageOf(lvl);
    const pet = {
      id: this._petbookMintId(),
      kind, look: PET_KINDS[kind].look, home: PET_KINDS[kind].home,
      stage,
      gold: Math.random() < PETBOOK.GOLD_CHANCE,
      size: petSizeFrom(Math.random(), Math.random()),
      name: null,
      lv: Math.max(1, Math.min(Math.max(1, Math.floor(Number(T) || 1)), lvl)),
      xp: 0,
      at: now,
      caughtBy: pid,
      owners: 1,
      tradeAfter: now + PETBOOK.TRADE_HOLD_MS,
    };
    book.rec.list.push(pet);
    if (!book.rec.active) book.rec.active = pet.id;
    const key = journalKey(kind, stage);
    const j = book.rec.journal[key] || (book.rec.journal[key] = { tries: 0, n: 0, gold: 0, big: 0 });
    j.tries++; j.n++;
    if (pet.gold) j.gold++;
    if (pet.size > j.big) j.big = pet.size;
    this._petbookSave(pid, book);
    return { ...pet };
  },

  /* A miss: one more try at this kind, kept in memory (SAVE_MS). */
  _petbookCountMiss(pid, m, now) {
    const book = this._petbookOf(pid);
    if (!book || book.locked || !book.rec) return;
    const kind = petKindOf(m) || 'dewdrop';
    const key = journalKey(kind, petStageOf(m.level));
    const j = book.rec.journal[key] || (book.rec.journal[key] = { tries: 0, n: 0, gold: 0, big: 0 });
    j.tries++;
    book.dirty = true;
    if (now - (book.savedAt || 0) >= PETBOOK.SAVE_MS) this._petbookSave(pid, book);
  },

  _petbookTries(pid, m) {
    const book = this._petbookOf(pid);
    if (!book || book.locked || !book.rec) return 0;
    const key = journalKey(petKindOf(m) || 'dewdrop', petStageOf(m.level));
    const j = book.rec.journal[key];
    return j ? j.tries : 0;
  },

  /* ═══ THE PETS PAGE: set active, name, release ═══
     Each the same shape: the switch, the record, a rate limit, the pet found
     by its id in the list (an array search, so '__proto__' is simply not a
     pet), the change, written at once, and the whole record sent back -- on a
     refusal too, so the page can never drift from the truth. */
  _petbookAct(session, op, payload, apply) {
    if (!session || !session.id) return;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps || ps.disconnected) return;
    const refuse = (error) => this._petbookSend(pid, { op, error });
    if (this._petbookOff()) return refuse('off');
    const book = this._petbookOf(pid);
    if (!book || book.locked || !book.rec) return refuse('pets-unavailable');
    const now = Date.now();
    book.acts = (book.acts || []).filter((t) => now - t < 60000);
    if (book.acts.length >= PETBOOK.ACTIONS_PER_MIN) return refuse('too-fast');
    const id = payload && typeof payload.id === 'string' ? payload.id : null;
    const pet = id ? book.rec.list.find((p) => p.id === id) : null;
    const err = apply(book.rec, pet, id);
    if (err) return refuse(err);
    book.acts.push(now);
    this._petbookSave(pid, book);
    this._petbookSend(pid, { op, id });
  },

  /* pet_active {id}: this pet follows you; {id: null} puts yours away. */
  _handlePetActive(session, payload) {
    this._petbookAct(session, 'active', payload, (rec, pet, id) => {
      if (payload && payload.id === null) { rec.active = null; return null; }
      if (!pet) return 'no-pet';
      rec.active = pet.id;
      return null;
    });
  },

  /* pet_name {id, name} */
  _handlePetName(session, payload) {
    this._petbookAct(session, 'name', payload, (rec, pet) => {
      if (!pet) return 'no-pet';
      const name = cleanPetName(payload && payload.name);
      if (!name) return 'bad-name';
      pet.name = name;
      return null;
    });
  },

  /* pet_release {id, confirm: true}: it goes back to the wild, for good.  The
     confirm, as a character restart asks for one: a stray send is a no-op. */
  _handlePetRelease(session, payload) {
    this._petbookAct(session, 'release', payload, (rec, pet) => {
      if (!pet) return 'no-pet';
      if (!payload || payload.confirm !== true) return 'confirm';
      rec.list = rec.list.filter((p) => p !== pet);
      if (rec.active === pet.id) rec.active = null;
      return null;
    });
  },
};
