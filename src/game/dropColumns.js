/* ═══ v2.3.3616: EACH DROP A COLUMN OVER THE MONSTER ═══
 *
 * The owner, 2026-10-26: "Instead of showing the dice roll for each drop I
 * think it would be better to show each drop in columns of the floating icon
 * rising with the quantity beneath it and the rarity beneath that. So
 * example: upon monster death and dropping gold with remains, show gold icon,
 * number 5 beneath it, and "Normal" beneath the number. If two items are
 * dropped it will be spaced apart as two columns appearing simultaneously.
 * Rising briefly then disappearing."
 *
 * A kill tells this phone what it dropped in two messages: the PILE
 * (loot_drop, the worker's _serializePile: its gold -- this player's share of
 * it -- remains, shard, rare gem, armour and weapon) and the killing blow's
 * own (combat_credit's `rh`, the drop the kill's one roll landed on when it is
 * this player's: the gold nugget goes straight into the killer's bag and is on
 * no pile).  combat_credit is sent at once and the pile with the next tick, so
 * the credit is kept a moment (CREDIT_KEEP_MS) for the pile to find, and a
 * nugget whose pile never comes still gets its column (NUGGET_WAIT_MS).
 *
 * WHAT EACH COLUMN SAYS comes from the codex's own drop table
 * (data/codexDrops.js codexDropsFor), so the column and the codex page always
 * agree: its picture, and its RARITY -- for a piece of gear its grade, which
 * the pile keeps hidden until it is picked up ("Mystery" when the worker says
 * the grade is worth a reveal, else "Normal": _serializePile's mystery bits);
 * for anything else how often it drops (RARITY_TIERS: every kill or most is
 * "Normal", the shard's 1 in 10 "Uncommon", the rare gem's 1 in 200 "Rare",
 * the nugget's 1 in 10,000 "Very rare").
 *
 * Nothing here decides anything: the drops are the worker's.  This builds the
 * columns (S._dropCols, a short list of groups) and the renderer draws them
 * (rendering/dropColumns.js).  It replaces the dice roll over the monster
 * (game/killRoll.js), which `?dropcols=0` brings back; the roll stays on the
 * codex's page. */
/* relative, plain data only: the server's drop-columns suite imports this */
import { codexDropsFor } from '../data/codexDrops.js';
import { petKindOfMonster } from '../data/trapping.js';

const OFF = (() => {
  try { return typeof location !== 'undefined' && /[?&]dropcols=0\b/.test(location.search || ''); }
  catch (e) { return false; }
})();

/** Are the columns shown (and the dice roll over the monster not)? */
export function dropColumnsLive() { return !OFF; }

/* how long a group is on screen, and how long a credit waits for its pile */
export const DROP_COLS = Object.freeze({
  TTL_MS: 2200,          /* the whole life: up, held, faded (rendering/dropColumns.js) */
  CREDIT_KEEP_MS: 3000,  /* a kill's credit, kept for its pile to find */
  NUGGET_WAIT_MS: 400,   /* a nugget with no pile in that time shows on its own */
  MAX_GROUPS: 8,         /* a big fight: the oldest group goes first */
  LIFT: 20,              /* popup px over where a damage number starts */
});

/* how often a drop comes, in the words a column prints under it */
export const RARITY_TIERS = Object.freeze([
  { at: 0.2, label: 'Normal', color: '#E5EDE9' },
  { at: 0.02, label: 'Uncommon', color: '#7EE0A8' },
  { at: 0.002, label: 'Rare', color: '#7FB2FF' },
  { at: 0, label: 'Very rare', color: '#FFB25A' },
]);
/* a piece of gear's grade, the bag's colours (dash/common.js qualityInk) */
export const GRADE_WORDS = Object.freeze({
  normal: { label: 'Normal', color: '#E5EDE9' },
  mystery: { label: 'Mystery', color: '#D9A6FF' },
});

/** The words under a drop: its grade for gear, else how often it comes. */
export function rarityOf(row, mystery) {
  if (row && row.graded) return mystery ? GRADE_WORDS.mystery : GRADE_WORDS.normal;
  const c = row && typeof row.chance === 'number' ? row.chance : 1;
  for (const t of RARITY_TIERS) if (c >= t.at) return { label: t.label, color: t.color };
  return { label: RARITY_TIERS[RARITY_TIERS.length - 1].label, color: RARITY_TIERS[RARITY_TIERS.length - 1].color };
}

/* the monster a pile is for: lootId 'mk-<monster id>-<seq>' (index.js
   _spawnLootForKill) */
export function monsterIdOfLoot(lootId) {
  const m = typeof lootId === 'string' ? /^mk-(.+)-\d+$/.exec(lootId) : null;
  return m ? m[1] : null;
}

/** The columns a kill's drops make, left to right: what every kill drops
 *  first, the rarest last.  `pile` is the phone's own copy (wsClient
 *  _buildServerPile: coins already this player's share), `rh` the killing
 *  blow's drop, `kind` the monster's codex kind. */
export function columnsFor(kind, pile, rh) {
  const rows = kind ? codexDropsFor(kind, { crack: true }) : null;
  const rowOf = (id) => (rows ? rows.find((r) => r.id === id) || null : null);
  const cols = [];
  const add = (id, qty, mystery, fallback) => {
    const row = rowOf(id) || fallback || null;
    if (!row) return;
    const r = rarityOf(row, mystery);
    cols.push({ id, icon: row.icon || null, qty: Math.max(1, Math.floor(qty || 1)), label: r.label, color: r.color, name: row.name || id });
  };
  if (pile) {
    if (pile.coins > 0) add('gold', pile.coins);
    if (pile.skull) add('remnant', 1);
    if (pile.shard) add('shard', 1, false, { name: 'Shard', icon: '/icons/items/' + pile.shard + '.webp?v=2.3.1774', chance: 0.1 });
    if (pile.gem) add('raregem', 1);
    if (Array.isArray(pile.armor)) {
      for (const a of pile.armor) {
        if (!a) continue;
        const legs = a.slot === 'legsArmor' || /greave/i.test(String(a.name || ''));
        add(legs ? 'irongreaves' : 'irontorso', 1, !!a.mystery);   /* each piece's own bit (index.js _mysteryPiece) */
      }
    }
    if (pile.hasWeapon) add('irongreatsword', 1, !!pile.weaponMystery);
  }
  if (rh === 'nugget') add('nugget', 1);
  else if (rh === 'rawgem') add('rawgem', 1);
  return cols;
}

/* ── the two messages, matched by the monster ── */
function credits(S) { return S._dcCredits || (S._dcCredits = new Map()); }
function groups(S) { return S._dropCols || (S._dropCols = []); }

function kindOf(S, monsterId, ccKind) {
  if (typeof ccKind === 'string' && ccKind) return ccKind;
  const m = S && S.monsters && monsterId ? S.monsters.find((mm) => mm && mm.id === monsterId) : null;
  return m ? petKindOfMonster(m) : null;
}
/* is a spot inside the view (the camera's world box, a little past its
   edges)?  With no view known yet, it is trusted (game/killRoll.js's rule) */
function inView(S, x, y) {
  if (!(S && S.camera && S._viewW > 0 && S._viewH > 0)) return true;
  return x >= S.camera.x - 60 && x <= S.camera.x + S._viewW + 60 && y >= S.camera.y - 60 && y <= S.camera.y + S._viewH + 160;
}
/* over the monster's bar -- or, a kill off your screen (a burn finishing it out
   of sight), over your own head: the drops are yours to see */
function spotOf(S, monsterId, x, y) {
  const at = spotAt(S, monsterId, x, y);
  if (at && inView(S, at.x, at.y + 110)) return at;
  const P = S && S.player;
  if (P && typeof P.x === 'number') {
    const top = typeof S._selfBandTopY === 'number' && isFinite(S._selfBandTopY) ? S._selfBandTopY : P.y - 102;
    return { x: P.x, y: top - 34 - DROP_COLS.LIFT, over: 'you' };
  }
  return at;
}
function spotAt(S, monsterId, x, y) {
  const m = S && S.monsters && monsterId ? S.monsters.find((mm) => mm && mm.id === monsterId) : null;
  /* over its bar, where a damage number starts (combatHelpers monsterPopupY:
     its stamped bar top, else POPUP_NO_STAMP_Y), a little higher */
  if (m && typeof m.x === 'number') return { x: m.x, y: (m.y != null ? m.y : (m.renderY || 0)) + (m._popupTopOff != null ? m._popupTopOff : -120) - DROP_COLS.LIFT };
  if (typeof x === 'number' && typeof y === 'number') return { x, y: y - 110 };
  return null;
}
function pushGroup(S, monsterId, kind, spot, cols, now) {
  if (!spot || !cols.length) return null;
  const list = groups(S);
  while (list.length >= DROP_COLS.MAX_GROUPS) list.shift().gone = true;
  const g = { monsterId, kind, x: spot.x, y: spot.y, ts: now, cols, over: spot.over || 'monster' };
  list.push(g);
  if (typeof window !== 'undefined' && window.__btProbe) {
    try {
      const log = window.__btDropColLog || (window.__btDropColLog = []);
      log.push({ monsterId, kind, at: now, over: g.over, cols: cols.map((c) => ({ id: c.id, qty: c.qty, label: c.label, icon: c.icon })) });
      if (log.length > 40) log.splice(0, log.length - 40);
    } catch (e) { /* a probe never breaks the game */ }
  }
  return g;
}

/** combat_credit (wsClient): keep the kill's kind and its own drop for the
 *  pile; a nugget whose pile does not come shows by itself. */
export function noteKillCredit(S, cc, now = Date.now()) {
  if (!dropColumnsLive() || !S || !cc || !cc.monsterId) return;
  const kind = kindOf(S, cc.monsterId, cc.cx && cc.cx.k);
  const c = { kind, rh: typeof cc.rh === 'string' ? cc.rh : null, at: now, used: false };
  const map = credits(S);
  map.set(cc.monsterId, c);
  for (const [id, v] of map) if (now - v.at > DROP_COLS.CREDIT_KEEP_MS) map.delete(id);
  /* the pile came first: its group takes the nugget now */
  const g = groups(S).find((q) => q.monsterId === cc.monsterId && now - q.ts < DROP_COLS.CREDIT_KEEP_MS);
  if (g) {
    c.used = true;
    if (c.rh === 'nugget' || c.rh === 'rawgem') {
      const more = columnsFor(g.kind || kind, null, c.rh);
      if (more.length) { g.cols = g.cols.concat(more); g.dirty = true; }
    }
    return;
  }
  if (c.rh === 'nugget' || c.rh === 'rawgem') {
    const id = cc.monsterId;
    const spot0 = spotOf(S, id);
    setTimeout(() => {
      const cur = credits(S).get(id);
      if (!cur || cur.used) return;
      cur.used = true;
      pushGroup(S, id, kind, spotOf(S, id) || spot0, columnsFor(kind, null, cur.rh), Date.now());
    }, DROP_COLS.NUGGET_WAIT_MS);
  }
}

/** loot_drop (gameEvents), a NEW pile in this zone: its columns, when it is
 *  this player's to pick up.  Returns the group, or null. */
export function noteLootDrop(S, pile, myId, now = Date.now()) {
  if (!dropColumnsLive() || !S || !pile || pile.isDeathDrop || pile.dropped) return null;
  const mine = Array.isArray(pile.recipients) ? pile.recipients.indexOf(myId) >= 0 : false;
  if (!mine) return null;
  const monsterId = monsterIdOfLoot(pile.lootId);
  const c = monsterId ? credits(S).get(monsterId) : null;
  if (c) c.used = true;
  const kind = (c && c.kind) || kindOf(S, monsterId, null);
  const cols = columnsFor(kind, pile, c ? c.rh : null);
  return pushGroup(S, monsterId, kind, spotOf(S, monsterId, pile.x, pile.y), cols, now);
}

/** A zone change: nothing carried over. */
export function clearDropColumns(S) {
  if (!S) return;
  if (S._dropCols) for (const g of S._dropCols) g.gone = true;
  S._dropCols = [];
  if (S._dcCredits) S._dcCredits.clear();
}

/* every picture a column can show, for the loading screen
   (rendering/dropColumns.js preloadDropColumnIcons): each kind's whole table */
export function dropColumnIconUrls(kinds) {
  const out = new Set();
  for (const k of kinds || []) {
    const rows = codexDropsFor(k, { crack: true }) || [];
    for (const r of rows) if (r.icon) out.add(r.icon);
  }
  return Array.from(out);
}
