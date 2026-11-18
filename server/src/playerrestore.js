/* ═══ v2.3.5285: ONE PLAYER'S RESTORE, MADE FROM THE REGISTRY (grand plan step 4.7, card R PR 6) ═══
 * (spec docs/specs/restore.md, "One player's restore"; the owner's steps:
 *  docs/OPERATIONS.md, "Fixing a broken save"; held by
 *  server/test/restore.test.mjs)
 *
 * WHY.  The owner's restore (admin.js POST /api/admin/restore) put back one
 * record, `rpg:`, from a daily copy, and it put it back BY HAND: the purse,
 * the bag and the stashes changed with no door and nothing booked, so the
 * world's sum (worldsum.js) read every restore as value made or lost from
 * nowhere.  Now:
 *
 *   WHAT IS PUT BACK is the registry's: every record whose marks say
 *   `whose: 'player'` is placed in storagemarks.js RESTORE_WAYS, RESTORED or
 *   LEFT, with why.  A restore puts back each restored record THE SNAPSHOT
 *   HOLDS: the character always (a daily copy is the stored character), and
 *   the vault and the pets when the copy carries them (`_with`, written by
 *   the daily copy with `fullsnap` in the live flags, ON by default since
 *   v2.3.6000, the owner's call (card CS): it reads two rows more a player a
 *   day; `fullsnap: false` turns it off).
 *
 *   THROUGH THE DOORS.  The restored character's purse is made the copy's by
 *   the gold door (`restore`, a set road judged by its difference: SHAPES
 *   part 3, edge 1), each bag key by the bag door, each stash by the stash
 *   door, starting from the record as it is now and its own count (`_econ`):
 *   so what the restore adds or takes is BOOKED on the character, and the
 *   sum stays balanced (restore.test: unexplained 0).  The vault's
 *   difference books on the character too (`restore_vault`, gold and bag).
 *
 *   ONE RUN OF WRITES (handoff rule 5).  The `prerestore-` copy covers every
 *   record the restore overwrites (the character at its top, or `_norpg:
 *   true` when there was none; each other under `_with`, null for one the
 *   restore creates, so its way back deletes it), and it is written
 *   with the restore itself, nothing awaited between: a restart can never
 *   keep the restore without its way back.
 *
 *   A NEWER WORKER'S RECORD is refused, never rewritten
 *   (docs/specs/migrations.md): a copy or a record now whose shape number is
 *   past this worker's, or a count (`_econ`) past its.
 *
 *   BETWEEN PLAYERS.  An order, a listing, a pot, a pile (`whose:
 *   'between'`) is never rewound: it is the other side's too.  The answer
 *   says which of them name this player (`between`), one page of each
 *   (PLAYER_RESTORE.BETWEEN_PAGE rows) read when the owner presses it: a
 *   piece listed since the copy comes back in the character AND stays in its
 *   listing -- the owner sees it there.
 *
 *   A DRY RUN (`dry: true`) answers all of it and writes nothing.
 *
 * A restore runs by the owner's hand only (behind the admin key), never on a
 * page's word, with the player out of the room (admin.js answers 409). */
import { restoredPrefixes, RESTORE_WAYS, STORAGE_MARKS } from './storagemarks.js';
import { wholeGold, econOn, ECON_V } from './gold.js';
import { bagSet, bagEconOwn, wholeCount } from './bag.js';
import { stashSet, STASH_FIELDS } from './stash.js';
import { worldCtx, worldAdd } from './worldsum.js';
import { RPG_SCHEMA_VERSION } from './migrations.js';
import { BANK } from './bank.js';
import { PETBOOK } from './petbook.js';
import { XFER } from './xfer.js';   /* v2.3.5710: the ledger's prefix, read from its one writer (shapes-once) */

/* ═══ v2.3.5710 (card SEC PR 11): WHAT MOVED SINCE THE COPY ═══
   The second red team: with `fullsnap` off a copy carries the character
   only, so the vault is never rewound -- restoring one player gave back
   what they had banked since the copy (in the vault AND in the restored
   purse), and what they traded or gifted away (the other player keeps it;
   the restored character has it again).  The dry run showed the new total
   and not why.  Now the answer (dry and real) says `moved`, when anything
   did:
     - `vault`: the vault's gold and items NOW, when the copy does not carry
       the vault (it stays as it is: read it beside `booked`);
     - `given`: what this player handed over since the copy, from the
       transfer ledger's rows (XFER.PREFIX, xfer.js): as the giver (`from`)
       the row's own side, and as the other side (`to`) its `price` (a trade
       window's side b, a market's or auction's buyer: the sitting 38
       review) -- when, the road, to whom, the gold, the goods and the ids
       (pets, weapons, gear).  Rows from the copy's own TIME on
       (`givenSince`: a `prereset-`/`prerestore-` key's time; a daily
       copy's from `rpgsnap_at:` when it is that day's, else the day's
       start, `exact: false`).  At most GIVEN_PAGES pages of GIVEN_PAGE rows
       read (`givenMore` when there were more).
   Nothing moved: no `moved` field, the answer as before.  Reads only: no
   new write, no new lever.  docs/OPERATIONS.md's restore steps say to read
   it.  (An explicit yes in the Test panel is a later PR: it needs the
   panel's row.) */
export const PLAYER_RESTORE = Object.freeze({
  /* rows read of each between-players prefix for the answer, at most */
  BETWEEN_PAGE: 200,
  /* how deep a between record is searched for the player's id */
  NAME_DEPTH: 6,
  /* between records named in the answer, at most */
  NAMED_MAX: 50,
  /* v2.3.5710: the ledger read for `moved.given`: pages, and rows a page */
  GIVEN_PAGE: 200,
  GIVEN_PAGES: 5,
  GIVEN_MAX: 50,
});

/* v2.3.5710: the day a copy was made, as the ledger writes it (yyyymmdd):
   a daily copy's key ends with it; a `prereset-` or `prerestore-` copy's with
   the time it was made.  null: not known (every row read). */
export function copyDay(snapKey) {
  const tail = String(snapKey || '').split(':').pop();
  if (/^\d{8}$/.test(tail)) return tail;
  const m = /^pre(?:reset|restore)-(\d{10,})$/.exec(tail);
  if (!m) return null;
  return utcDay(Number(m[1]));
}
/* a time's UTC day, yyyymmdd (null: not a time) */
function utcDay(t) {
  const d = new Date(t);
  if (!Number.isFinite(d.getTime())) return null;
  const p = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate());
}

/* v2.3.5710 (the sitting 38 review): the time a `prereset-`/`prerestore-`
   copy was made, from its key; null for a daily copy (its key holds only
   the day). */
export function copyTime(snapKey) {
  const m = /^pre(?:reset|restore)-(\d{10,})$/.exec(String(snapKey || '').split(':').pop());
  const t = m ? Number(m[1]) : NaN;
  return Number.isFinite(t) ? t : null;
}

/* one side of a ledger row as the answer names it */
function givenSide(side) {
  const s = side && typeof side === 'object' ? side : {};
  const goods = Object.create(null);
  if (s.goods && typeof s.goods === 'object') for (const k of Object.keys(s.goods)) { const n = wholeCount(s.goods[k]); if (n > 0 && !BAD_KEYS.has(k)) goods[k] = n; }
  const ids = (Array.isArray(s.ids) ? s.ids : []).filter((x) => typeof x === 'string' && x).slice(0, 64);
  return { gold: wholeGold(s.gold), goods, ids };
}

/** v2.3.5710: what moved since the copy that a restore will not rewind:
 *  the vault now (when the copy has none), and what the player gave away
 *  (the ledger's rows, xfer.js, from the copy's day on, `from` the player).  null: nothing. */
export async function movedSince(room, pid, snap, snapKey, vaultNow) {
  const out = {};
  if (!holds(snap, 'bank:') && vaultNow && typeof vaultNow === 'object') {
    const gold = wholeGold(vaultNow.gold);
    const items = (Array.isArray(vaultNow.items) ? vaultNow.items : [])
      .filter((it) => it && typeof it.key === 'string' && !BAD_KEYS.has(it.key) && wholeCount(it.n) > 0)
      .map((it) => ({ key: it.key, n: wholeCount(it.n) }));
    if (gold > 0 || items.length) out.vault = { gold, items };
  }
  const day = copyDay(snapKey);
  const st = room.state.storage;
  /* the copy's own time: rows before it (the same day) were not since */
  let since = copyTime(snapKey), exact = since !== null;
  if (since === null && day) {
    let at = null;
    try { at = await st.get('rpgsnap_at:' + pid); } catch (e) { at = null; }
    if (typeof at === 'number' && Number.isFinite(at) && utcDay(at) === day) { since = at; exact = true; }
    else since = Date.UTC(+day.slice(0, 4), +day.slice(4, 6) - 1, +day.slice(6, 8));
  }
  const given = [];
  let more = false, after = null;
  for (let page = 0; page < PLAYER_RESTORE.GIVEN_PAGES; page++) {
    const opt = { prefix: XFER.PREFIX, limit: PLAYER_RESTORE.GIVEN_PAGE };
    if (after !== null) opt.startAfter = after;
    else if (day) opt.start = XFER.PREFIX + day;
    let rows;
    try { rows = await st.list(opt); } catch (e) { break; }
    let n = 0;
    for (const [k, v] of rows) {
      n++; after = k;
      if (day && k < XFER.PREFIX + day) continue;   /* a storage that ignores `start` */
      if (!v || typeof v !== 'object' || (v.from !== pid && v.to !== pid)) continue;
      if (since !== null && !(Number(v.at) >= since)) continue;   /* before the copy */
      /* as the giver, the row's own side; as the other side, its price */
      const side = v.from === pid ? givenSide(v) : givenSide(v.price);
      if (!side.gold && !Object.keys(side.goods).length && !side.ids.length) continue;
      if (given.length >= PLAYER_RESTORE.GIVEN_MAX) { more = true; continue; }
      const other = v.from === pid ? v.to : v.from;
      given.push({ key: k, at: Number(v.at) || 0, road: typeof v.road === 'string' ? v.road : null, to: typeof other === 'string' ? other : null, ...side });
    }
    if (n < PLAYER_RESTORE.GIVEN_PAGE) break;
    if (page === PLAYER_RESTORE.GIVEN_PAGES - 1) more = true;
  }
  if (given.length) { out.given = given; if (since !== null) out.givenSince = { at: since, exact }; }
  if (more) out.givenMore = true;
  return Object.keys(out).length ? out : null;
}

const own = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** The daily copy carries the vault and the pets (`_with`): two rows more
 *  read a player a day.  ON by default since v2.3.6000 (card CS, the owner,
 *  2026-11-17: "I think turn all of them on then we monitor usage cost"); `fullsnap: false` in the live flags turns it off. */
export function fullSnapOn(room) {
  const f = room && room._liveFlags;
  return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'fullsnap') && f.fullsnap === false);
}
/** A restart books the deleted character into `econ_gone`: a new row, and a
 *  read and a write a restart.  ON by default since v2.3.6000 (card CS, the
 *  owner, 2026-11-17: "I think turn all of them on then we monitor usage cost"); `resetbook: false` in the live flags turns it off. */
export function resetBookOn(room) {
  const f = room && room._liveFlags;
  return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'resetbook') && f.resetbook === false);
}

/** The daily copy of a player: the stored character as it is, and with
 *  `fullsnap` the other restored records at the same moment under `_with`
 *  (null where there is none). */
export async function snapshotCopy(room, pid, storedBlob) {
  if (!fullSnapOn(room)) return storedBlob;
  const others = restoredPrefixes().filter((p) => p !== 'rpg:');
  const got = await Promise.all(others.map((p) => room.state.storage.get(p + pid)));
  const w = {};
  others.forEach((p, i) => { w[p] = got[i] === undefined ? null : got[i]; });
  const copy = { ...storedBlob, _with: w };
  /* v2.3.6000 (card CS; the gatekeeper's sitting 45): ON by default now, so a
     worst-case character with a full vault could make a copy past the
     storage's 128 KiB a value: its put threw (swallowed) and the day had NO
     copy.  Past SNAP_WITH_MAX the copy is the character alone, as before. */
  try { if (JSON.stringify(copy).length > SNAP_WITH_MAX) return storedBlob; } catch (e) { return storedBlob; }
  return copy;
}
/** The fuller daily copy's most, in characters of its JSON: under the
 *  storage's 128 KiB a value, with room to spare. */
export const SNAP_WITH_MAX = 120000;

/* ── what a copy holds ── */
const holds = (snap, p) => (p === 'rpg:' ? !snap._norpg : own(snap._with, p));
function rpgOf(snap) {
  const out = {};
  for (const k of Object.keys(snap)) if (k !== '_with' && k !== '_norpg') out[k] = snap[k];
  return out;
}
const snapOf = (snap, p) => (p === 'rpg:' ? rpgOf(snap) : (snap._with[p] === undefined ? null : snap._with[p]));

/* ── a record past this worker (migrations.md: refused, never rewritten) ── */
function newerOf(p, v) {
  if (!v || typeof v !== 'object') return false;
  if (p === 'rpg:') return (typeof v._v === 'number' && v._v > RPG_SCHEMA_VERSION) || !!(v._econ && typeof v._econ === 'object' && typeof v._econ.v === 'number' && v._econ.v > ECON_V);
  if (p === 'bank:') return typeof v._v === 'number' && v._v > BANK.V;
  if (p === 'pets:') return typeof v.v === 'number' && v.v > PETBOOK.V;
  return false;
}

/* a bag-shaped copy of a vault's items: {key: count} */
function vaultBag(v) {
  const bag = {};
  for (const it of (v && Array.isArray(v.items) ? v.items : [])) {
    if (!it || typeof it.key !== 'string' || BAD_KEYS.has(it.key)) continue;
    bag[it.key] = (bag[it.key] || 0) + wholeCount(it.n);
  }
  return bag;
}
const keysOf = (...bags) => [...new Set(bags.flatMap((b) => (b && typeof b === 'object' ? Object.keys(b) : [])))].filter((k) => !BAD_KEYS.has(k));

/* What the world holds of these records (worldsum.js's own readers):
   gold and each bag key. */
function heldOf(pid, recs) {
  const ctx = worldCtx();
  for (const [p, v] of recs) if (v && typeof v === 'object') worldAdd(ctx, p + pid, v);
  return { gold: ctx.gold, goods: ctx.goods };
}

/* The character as the restore makes it, through the doors: started from
   the record now (its purse, its bag, its count) and made the copy's.  Every
   other field is the copy's. */
function restoredCharacter(room, snapRpg, curRpg) {
  const cur = curRpg && typeof curRpg === 'object' ? curRpg : null;
  const work = {
    coins: cur ? cur.coins : 0,
    inventory: cur && cur.inventory && typeof cur.inventory === 'object' ? { ...cur.inventory } : {},
    _econ: cur && cur._econ && typeof cur._econ === 'object' ? structuredClone(cur._econ) : undefined,
  };
  const SKIP = new Set(['coins', 'inventory', '_econ', ...STASH_FIELDS]);
  for (const k of Object.keys(snapRpg)) if (!SKIP.has(k)) work[k] = snapRpg[k];
  econOn(work);
  room._goldSet(work, snapRpg.coins, 'restore');
  const snapBag = snapRpg.inventory && typeof snapRpg.inventory === 'object' ? snapRpg.inventory : {};
  for (const k of keysOf(work.inventory, snapBag)) bagSet(work.inventory, k, own(snapBag, k) ? snapBag[k] : 0, 'restore');
  bagEconOwn(work.inventory, work);
  for (const f of STASH_FIELDS) if (own(snapRpg, f)) stashSet(work, f, Array.isArray(snapRpg[f]) ? snapRpg[f].slice() : [], 'restore');
  return work;
}

/* The vault's difference, booked on the character's count by the doors
   (the vault record itself is put whole). */
function bookVault(room, work, curVault, snapVault) {
  const econ = econOn(work);
  room._goldSet({ coins: wholeGold(curVault && curVault.gold), _econ: econ }, snapVault ? snapVault.gold : 0, 'restore_vault');
  const now = vaultBag(curVault), want = vaultBag(snapVault);
  const holder = { inventory: now, _econ: econ };
  for (const k of keysOf(now, want)) bagSet(now, k, own(want, k) ? want[k] : 0, 'restore_vault');
  bagEconOwn(now, holder);
}

/* does `v` name `pid` anywhere (a string equal to it), within `depth` */
function namesPlayer(v, pid, depth) {
  if (v === pid) return true;
  if (!v || typeof v !== 'object' || depth <= 0) return false;
  for (const k of Object.keys(v)) {
    if (k === pid) return true;
    if (namesPlayer(v[k], pid, depth - 1)) return true;
  }
  return false;
}
/** The records held between players that name `pid`: one page of each
 *  value-holding between prefix (a single key, its one row). */
export async function betweenOf(room, pid) {
  const st = room.state.storage;
  const named = [], full = [];
  let read = 0;
  for (const [p, m] of Object.entries(STORAGE_MARKS)) {
    if (m.whose !== 'between' || m.value === 'none') continue;
    let page;
    if (p.endsWith(':')) page = await st.list({ prefix: p, limit: PLAYER_RESTORE.BETWEEN_PAGE });
    else { const v = await st.get(p); page = new Map(v === undefined ? [] : [[p, v]]); }
    read += page.size;
    if (p.endsWith(':') && page.size >= PLAYER_RESTORE.BETWEEN_PAGE) full.push(p);
    for (const [k, v] of page) {
      if (k.split(':').includes(pid) || namesPlayer(v, pid, PLAYER_RESTORE.NAME_DEPTH)) named.push({ key: k, holds: m.why });
    }
  }
  return { between: named.slice(0, PLAYER_RESTORE.NAMED_MAX), betweenMore: named.length > PLAYER_RESTORE.NAMED_MAX ? named.length - PLAYER_RESTORE.NAMED_MAX : 0, betweenFull: full, betweenRead: read };
}

/** The owner's restore of one player from one copy.  Returns {status, ...}:
 *  400 a wrong ask, 409 the player here or a newer worker's record, 404 no
 *  such copy, 200 done (or, with `dry: true`, what it would do). */
export async function playerRestore(room, body, now = Date.now()) {
  const b = body && typeof body === 'object' ? body : {};
  const pid = typeof b.playerId === 'string' ? b.playerId : '';
  const snapKey = typeof b.snapKey === 'string' ? b.snapKey : '';
  /* the sitting 20 review (low): a `dry` that is not a boolean ("true", 1)
     is refused, never read as "not dry" -- a dry run asked as text must not
     restore for real */
  if (Object.prototype.hasOwnProperty.call(b, 'dry') && typeof b.dry !== 'boolean') return { status: 400, ok: false, error: 'dry is true or false' };
  const dry = b.dry === true;
  if (!pid || !snapKey || !snapKey.startsWith('rpgsnap:' + pid + ':')) return { status: 400, ok: false, error: 'playerId + a matching snapKey required' };
  // A live session's next _saveRpg would clobber the restore -- kick first,
  // deliberately manual (the operator should know the player is being reverted).
  if (typeof room._wsBySessionId === 'function' && room._wsBySessionId(pid)) return { status: 409, ok: false, error: 'player online -- kick first' };
  /* v2.3.4413: ...and while the player is still IN THE ROOM (a body left in
     a fight saves itself over the restore when it goes) */
  if (room.playerState && room.playerState[pid]) return { status: 409, ok: false, error: 'player still in the world (a body left in a fight stays up to 20 seconds) -- wait 20 seconds, then restore again' };
  const st = room.state.storage;
  const snap = await st.get(snapKey);
  if (!snap || typeof snap !== 'object') return { status: 404, ok: false, error: 'snapshot not found' };

  const prefixes = restoredPrefixes();
  const curVals = await Promise.all(prefixes.map((p) => st.get(p + pid)));
  const cur = (p) => curVals[prefixes.indexOf(p)];
  const touched = prefixes.filter((p) => holds(snap, p));

  /* a newer worker's record, in the copy or now: refused */
  const newer = [];
  for (const p of touched) {
    if (newerOf(p, snapOf(snap, p))) newer.push(snapKey + (p === 'rpg:' ? '' : ' ' + p));
    if (newerOf(p, cur(p))) newer.push(p + pid);
  }
  if (!touched.includes('rpg:') && newerOf('rpg:', cur('rpg:'))) newer.push('rpg:' + pid);
  if (newer.length) return { status: 409, ok: false, error: 'newer', newer, words: 'A newer worker wrote ' + newer.join(', ') + ': refused, never rewritten (docs/specs/migrations.md).' };

  /* the difference the world holds, before and after (the answer's `booked`) */
  const before = heldOf(pid, prefixes.map((p) => [p, cur(p)]));
  const after = heldOf(pid, prefixes.map((p) => [p, touched.includes(p) ? snapOf(snap, p) : cur(p)]));
  const booked = { gold: after.gold - before.gold, goods: Object.create(null) };
  for (const k of keysOf(before.goods, after.goods)) { const d = (after.goods[k] || 0) - (before.goods[k] || 0); if (d) booked.goods[k] = d; }

  /* the character the restore makes (the copy's, or the one now when only
     the vault or the pets change: the vault's difference books on it) */
  const vaultChanges = touched.includes('bank:') && JSON.stringify(snapOf(snap, 'bank:')) !== JSON.stringify(cur('bank:') === undefined ? null : cur('bank:'));
  if (vaultChanges && !touched.includes('rpg:') && !cur('rpg:')) return { status: 409, ok: false, error: 'no-character', words: 'The vault would change with no character to book it on: restore a copy that holds the character too.' };

  const between = await betweenOf(room, pid);
  const left = Object.keys(RESTORE_WAYS).filter((p) => !touched.includes(p));
  /* v2.3.5710: what moved since the copy that this restore will not rewind */
  const moved = await movedSince(room, pid, snap, snapKey, cur('bank:'));
  const answer = { ok: true, restoredFrom: snapKey, dry, restored: touched, left, booked, ...between, ...(moved ? { moved } : {}) };
  if (dry) return { status: 200, ...answer, copy: null, words: 'Nothing written: this is what the restore would do.' };

  const puts = Object.create(null), dels = [];
  let work = null;
  if (touched.includes('rpg:')) work = restoredCharacter(room, snapOf(snap, 'rpg:'), cur('rpg:'));
  else if (vaultChanges) work = structuredClone(cur('rpg:'));
  if (vaultChanges) bookVault(room, work, cur('bank:'), snapOf(snap, 'bank:'));
  if (work) puts['rpg:' + pid] = work;
  for (const p of touched) {
    if (p === 'rpg:') continue;
    const v = snapOf(snap, p);
    if (v !== null) puts[p + pid] = v;
    else if (cur(p) !== undefined) dels.push(p + pid);
  }

  /* the way back: every record overwritten that is there now */
  /* the way back: every record the restore writes or deletes.  One there
     now is copied; one the restore CREATES (no vault now, one in the copy)
     is copied as null, so restoring the way back deletes it again (the
     sitting 20 review).  The character itself: none now, `_norpg` (the way
     back leaves the character the restore put; a restart's own copy is the
     way back to none). */
  const touchedNow = prefixes.filter((p) => own(puts, p + pid) || dels.includes(p + pid));
  const holdsNow = (p) => cur(p) !== undefined;
  let copyKey = null;
  if (touchedNow.some((p) => holdsNow(p) || p !== 'rpg:')) {
    const copy = touchedNow.includes('rpg:') && holdsNow('rpg:') ? rpgOf(cur('rpg:')) : { _norpg: true };
    const w = {};
    for (const p of touchedNow) if (p !== 'rpg:') w[p] = holdsNow(p) ? cur(p) : null;
    if (Object.keys(w).length) copy._with = w;
    copyKey = 'rpgsnap:' + pid + ':prerestore-' + now;
    puts[copyKey] = copy;
  }

  /* ONE run of writes (rule 5): the copy, the restore and its deletes, every
     one issued before any is awaited */
  const writes = Object.keys(puts).map((k) => st.put(k, puts[k]));
  for (const k of dels) writes.push(st.delete(k));
  await Promise.all(writes);
  /* the room's own copies of what changed, forgotten (the player is away:
     the next open reads the restored record) */
  if (typeof room._bankForget === 'function') room._bankForget(pid);
  if (typeof room._petbookForget === 'function') room._petbookForget(pid);
  return { status: 200, ...answer, copy: copyKey };
}
