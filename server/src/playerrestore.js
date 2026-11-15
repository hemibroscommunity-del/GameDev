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
 *   the daily copy with `fullsnap: true` in the live flags, OFF by default:
 *   it reads two rows more a player a day -- the owner's call).
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
 *   true` when there was none; each other under `_with`), and it is written
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

export const PLAYER_RESTORE = Object.freeze({
  /* rows read of each between-players prefix for the answer, at most */
  BETWEEN_PAGE: 200,
  /* how deep a between record is searched for the player's id */
  NAME_DEPTH: 6,
  /* between records named in the answer, at most */
  NAMED_MAX: 50,
});

const own = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** The daily copy carries the vault and the pets (`_with`) only with
 *  `fullsnap: true` in the live flags: two rows more read a player a day,
 *  OFF until the owner says (a cost: card R's Needs). */
export function fullSnapOn(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'fullsnap') && f.fullsnap === true);
}
/** A restart books the deleted character into `econ_gone` only with
 *  `resetbook: true` in the live flags: a new row, and a read and a write a
 *  restart, OFF until the owner says (a cost: card R's Needs). */
export function resetBookOn(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'resetbook') && f.resetbook === true);
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
  return { ...storedBlob, _with: w };
}

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
  const answer = { ok: true, restoredFrom: snapKey, dry, restored: touched, left, booked, ...between };
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
  const over = prefixes.filter((p) => (own(puts, p + pid) || dels.includes(p + pid)) && cur(p) !== undefined);
  let copyKey = null;
  if (over.length) {
    const copy = over.includes('rpg:') ? rpgOf(cur('rpg:')) : { _norpg: true };
    const w = {};
    for (const p of over) if (p !== 'rpg:') w[p] = cur(p);
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
