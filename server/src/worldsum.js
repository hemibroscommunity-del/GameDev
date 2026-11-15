/* ═══ THE WORLD'S SUM (grand plan step 4.4; card E) ═══
 *
 * v2.3.5084 (PR 5) built it in world-sum.test.mjs; v2.3.5091 (PR 10) moved
 * it whole beside the suites so the storm judged with the same one; v2.3.5093
 * (PR 12) moved it here, into the worker, so the live walk (liveops.js
 * _metricsMaybe, the day's economy snapshot) and the suites (world-sum,
 * storm) use ONE sum (the plan's rule 2) -- no copy stays in a test:
 *
 *     everything held  ==  the start  +  minted  -  burned
 *
 *   worldCtx()               a fresh count;
 *   worldAdd(ctx, key, v)    one stored record into it, by the registry's
 *                            marks (storagemarks.js) and READERS below: a
 *                            record of no value, or with no reader, adds
 *                            nothing (a page at a time: the live walk's way);
 *   count(room, store)       the whole world: the characters live in the
 *                            room, the piles on the ground, and every stored
 *                            record (a Map, or a suite's storage with
 *                            `_store`), with what could not be counted;
 *   unexplained(start, now)  how far held and net moved apart since `start`
 *                            (0 everywhere when nothing went unexplained).
 *
 * v2.3.5285 (card R PR 6): A RECORD'S END.  A character a restart deletes
 * took what it held with it, and its own count (`_econ`) went too: the sum
 * read it as value gone with no burn written (card K's hostile census:
 * `character_reset`, gold -5000).  With `resetbook: true` in the live flags
 * the restart books it into `econ_gone` (goneAdd, in the deletes' own run):
 * what it held as burned, its own minted and burned kept.  That record holds
 * nothing; NET_READERS reads its count, so the sum stays balanced.
 */
import { STORAGE_MARKS, marksOf } from './storagemarks.js';
import { mailMinted, wholeGold } from './gold.js';
import { bagEconPending, wholeCount } from './bag.js';
import { orderEscrowGold } from './liveops.js';

/* One reader a marked value prefix (storagemarks.js `value` not `none`).  Each
   adds what its record HOLDS to `held`: gold, each bag key, and the ids of
   the things counted as one (a piece of gear by its gid, a pet by its id). */
const add = (o, k, n) => { if (n) o[k] = (o[k] || 0) + n; };
function holdBag(ctx, bag) {
  if (!bag || typeof bag !== 'object') return;
  for (const k of Object.keys(bag)) add(ctx.goods, k, wholeCount(bag[k]));
}
const GEAR_FIELDS = ['armor', 'legsArmor', 'shield', 'amulet', 'weapon', 'rangedWeapon', 'staffWeapon'];
const STASH_FIELDS = ['armorStash', 'legsStash', 'shieldStash', 'gearStash', 'amuletStash'];
function holdGear(ctx, rec, where) {
  for (const f of GEAR_FIELDS) { const p = rec && rec[f]; if (p && typeof p === 'object' && typeof p.gid === 'string' && p.gid) ctx.ids.push(['gear', p.gid, where]); }
  for (const f of STASH_FIELDS) for (const p of (rec && Array.isArray(rec[f]) ? rec[f] : [])) if (p && typeof p.gid === 'string' && p.gid) ctx.ids.push(['gear', p.gid, where]);
}
/* a character's own count: what it minted less what it burned */
function netOf(ctx, econ) {
  if (!econ || typeof econ !== 'object') return;
  ctx.net.gold += (Number(econ.g && econ.g.m) || 0) - (Number(econ.g && econ.g.b) || 0);
  const i = econ.i && typeof econ.i === 'object' ? econ.i : {};
  for (const k of Object.keys(i)) add(ctx.net.goods, k, (Number(i[k].m) || 0) - (Number(i[k].b) || 0));
}
function holdCharacter(ctx, rec, where) {
  ctx.gold += wholeGold(rec.coins);
  holdBag(ctx, rec.inventory);
  holdGear(ctx, rec, where);
  netOf(ctx, rec._econ);
  /* the bag door's counts still beside a bag no save has named (bag.js) */
  const w = bagEconPending(rec.inventory);
  for (const k of Object.keys(w)) add(ctx.net.goods, k, w[k].m - w[k].b);
}
export const READERS = {
  'rpg:': (ctx, key, v) => { if (!ctx.live.has(key.slice(4))) holdCharacter(ctx, v || {}, key); },
  'bank:': (ctx, key, v) => {
    ctx.gold += Math.max(0, Math.floor(Number(v && v.gold) || 0));
    for (const it of (v && Array.isArray(v.items) ? v.items : [])) add(ctx.goods, it.key, Math.max(0, Math.floor(Number(it.n) || 0)));
  },
  'inbox:': (ctx, key, v) => {
    for (const e of (Array.isArray(v) ? v : [])) {
      const p = (e && e.payload) || {};
      if (e.kind === 'gold') { const n = Math.max(0, Math.floor(p.amount || 0)); ctx.gold += n; ctx.net.gold += mailMinted(e, n); }
      else if (e.kind === 'item' && typeof p.invKey === 'string') { const n = Math.max(1, Math.floor(p.count || 1)); add(ctx.goods, p.invKey, n); add(ctx.net.goods, p.invKey, mailMinted(e, n)); }
      else if (e.kind === 'gear' && p.piece && typeof p.piece.gid === 'string') ctx.ids.push(['gear', p.piece.gid, key]);
      else if (e.kind === 'pet' && p.pet && typeof p.pet.id === 'string') ctx.ids.push(['pet', p.pet.id, key]);
    }
  },
  'pets:': (ctx, key, v) => { for (const pet of (v && Array.isArray(v.list) ? v.list : [])) if (pet && typeof pet.id === 'string') ctx.ids.push(['pet', pet.id, key]); },
  'mkt_order:': (ctx, key, v) => { ctx.gold += orderEscrowGold(v); /* a sell order holds a weapon: summed once weapons carry a gid (step 4.3) */ },
  'store_listing:': (ctx, key, v) => {
    if (!v) return;
    if (v.kind === 'item' && typeof v.invKey === 'string' && !(v.sale && v.sale.goodsPaid)) add(ctx.goods, v.invKey, Math.max(0, Math.floor(Number(v.qty) || 0)));
    if (v.kind === 'gear' && v.gear && typeof v.gear.gid === 'string') ctx.ids.push(['gear', v.gear.gid, key]);
    if (v.kind === 'pet' && v.pet && typeof v.pet.id === 'string') ctx.ids.push(['pet', v.pet.id, key]);
    if (v.topBid && Number(v.topBid.amount) > 0) ctx.gold += Math.floor(Number(v.topBid.amount));
    for (const o of Object.values(v.offers || {})) if (o && Number(o.gold) > 0) ctx.gold += Math.floor(Number(o.gold));
    if (v.sale && v.sale.paid && !v.sale.goldPaid) ctx.gold += Math.max(0, Math.floor(Number(v.sale.price) || 0));
  },
  'duelEscrow:': (ctx, key, v) => { ctx.gold += 2 * Math.max(0, Math.floor(Number(v && v.wager) || 0)); },
  'arena_entry:': (ctx, key, v) => { ctx.gold += Math.max(0, Math.floor(Number(v && v.wager) || 0)); },
  'arena_stake:': (ctx, key, v) => { ctx.gold += Math.max(0, Math.floor(Number(v && v.amount) || 0)); },
  'bounty:': (ctx, key, v) => { ctx.gold += Math.max(0, Math.floor(Number(v && v.amount) || 0)); },
  'jackpot:draw': (ctx, key, v) => { ctx.gold += Math.max(0, Math.floor(Number(v && v.pool) || 0)); },
  'trade2wpn:': () => { /* a weapon: summed once weapons carry a gid (step 4.3) */ },
  'death_pile:': (ctx, key, v) => {
    /* a pile is counted once: from the ground while the room holds it, from
       its row only before the room has restored it */
    if (!v || ctx.piles.has(v.id || key.slice('death_pile:'.length))) return;
    for (const it of (Array.isArray(v.items) ? v.items : [])) add(ctx.goods, it.key, Math.max(0, Math.floor(Number(it.qty) || 0)));
  },
  'shop_stock': (ctx, key, v) => { for (const k of Object.keys(v || {})) add(ctx.goods, k, Math.max(0, Math.floor(Number(v[k]) || 0))); },
};

/* v2.3.5285: the records that hold no value but a count the sum reads as
   net (one key each; their marks say `none`) */
export const GONE_KEY = 'econ_gone';
export const GONE_V = 1;   /* its shape number: a newer one is never written over */
export const NET_READERS = Object.freeze({
  [GONE_KEY]: (ctx, key, v) => netOf(ctx, v),
});
/* `econ_gone`'s shape, made or healed: `_econ`'s, and `n` the characters booked */
function goneShape(v) {
  const g = v && typeof v === 'object' ? v : {};
  if (!g.g || typeof g.g !== 'object') g.g = { m: 0, b: 0 };
  if (!g.i || typeof g.i !== 'object') g.i = Object.create(null);
  if (typeof g.v !== 'number') g.v = GONE_V;
  if (!Number.isFinite(g.n)) g.n = 0;
  return g;
}
/** A deleted character into `econ_gone` (pure: returns the record to put).
 *  `records`: [[key, value]] of what the restart deletes that holds value
 *  (its `rpg:` -- the live state when it is in the room -- and its `bank:`).
 *  What each HELD is booked burned (`b`), less what its own count already
 *  says it made (its net): so the world's net falls by what it held. */
export function goneAdd(gone, records) {
  const g = goneShape(gone);
  const ctx = worldCtx();
  for (const [key, v] of records || []) if (v && typeof v === 'object') worldAdd(ctx, key, v);
  g.g.b = (Number(g.g.b) || 0) + (ctx.gold - ctx.net.gold);
  const keys = new Set([...Object.keys(ctx.goods), ...Object.keys(ctx.net.goods)]);
  for (const k of keys) {
    const d = (ctx.goods[k] || 0) - (ctx.net.goods[k] || 0);
    if (!d || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    const p = Object.prototype.hasOwnProperty.call(g.i, k) ? g.i[k] : (g.i[k] = { m: 0, b: 0 });
    p.b = (Number(p.b) || 0) + d;
  }
  g.n += 1;
  return g;
}

/** Every marked value prefix with no reader, and every stored key with no
 *  marks: what the sum cannot count. */
export function coverage(readers, keys) {
  const noReader = Object.entries(STORAGE_MARKS).filter(([p, m]) => m.value !== 'none' && !readers[p]).map(([p]) => p);
  const unmarked = keys.filter((k) => !marksOf(k));
  return { noReader, unmarked };
}

/** The world counted: held and net (minted less burned), gold and each bag
 *  key; every id held; and what could not be counted. */
/** A fresh count: held (gold, each bag key, ids) and net (minted less burned). */
export function worldCtx() {
  return { gold: 0, goods: Object.create(null), net: { gold: 0, goods: Object.create(null) }, ids: [], live: new Set(), piles: new Set() };
}
/* the reader of a stored key: the key itself (`shop_stock`), or its longest marked prefix */
function readerOf(readers, key) {
  if (Object.prototype.hasOwnProperty.call(readers, key)) return readers[key];
  let best = null;
  for (const p of Object.keys(readers)) if (p.endsWith(':') && key.startsWith(p) && (!best || p.length > best.length)) best = p;
  return best ? readers[best] : null;
}
/** One stored record into `ctx` (nothing when it holds no value or has no reader). */
export function worldAdd(ctx, key, value, readers = READERS) {
  if (Object.prototype.hasOwnProperty.call(NET_READERS, key)) { NET_READERS[key](ctx, key, value); return true; }   /* v2.3.5285 */
  const m = marksOf(key);
  if (!m || m.value === 'none') return false;
  const r = readerOf(readers, key);
  if (!r) return false;
  r(ctx, key, value);
  return true;
}

export function count(room, state, readers = READERS) {
  const ctx = worldCtx();
  const store = state && state._store instanceof Map ? state._store : state instanceof Map ? state : new Map();
  /* the characters in the room: live (a sparring clone is no one's) */
  for (const [pid, ps] of Object.entries((room && room.playerState) || {})) {
    if (!ps || ps._spar) continue;
    ctx.live.add(pid);
    holdCharacter(ctx, ps, 'live:' + pid);
  }
  /* the piles on the ground: a player's (a death's, a drop's) */
  for (const list of Object.values((room && room.loot) || {})) {
    for (const pile of (list || [])) {
      if (!pile || !pile.isDeathDrop) continue;
      ctx.piles.add(pile.lootId);
      if (pile.inventoryClaimed) continue;
      for (const it of (pile.deathItems || [])) add(ctx.goods, it.key, Math.max(0, Math.floor(Number(it.qty) || 0)));
    }
  }
  const keys = [...store.keys()].sort();
  for (const key of keys) worldAdd(ctx, key, store.get(key), readers);
  const dup = [];
  const seen = new Map();
  for (const [kind, id, where] of ctx.ids) { const k = kind + ':' + id; if (seen.has(k)) dup.push([k, seen.get(k), where]); else seen.set(k, where); }
  return { gold: ctx.gold, goods: ctx.goods, net: ctx.net, dup, ...coverage(readers, keys) };
}

/** How far held and net have moved apart since `start`: gold, and each bag
 *  key that moved (0 everywhere when nothing went unexplained). */
export function unexplained(start, now) {
  const gold = (now.gold - now.net.gold) - (start.gold - start.net.gold);
  const goods = Object.create(null);
  const keys = new Set([...Object.keys(start.goods), ...Object.keys(now.goods), ...Object.keys(start.net.goods), ...Object.keys(now.net.goods)]);
  for (const k of keys) {
    const d = ((now.goods[k] || 0) - (now.net.goods[k] || 0)) - ((start.goods[k] || 0) - (start.net.goods[k] || 0));
    if (d) goods[k] = d;
  }
  return { gold, goods };
}
