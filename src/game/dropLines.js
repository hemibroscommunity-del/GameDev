/* ═══ v2.3.3627: EACH DROP A LINE OF WORDS, RISING OVER THE MONSTER ═══
 *
 * The owner, 2026-10-27: "instead of the two column icon, quantity, rarity,
 * when item drops, I think I just want the name of the item to float upwards
 * with quantity in parenthesis and the color of the font indicating rarity.
 * So normal would just be white. So coins (5) rising and disappearing in
 * white, slime remains (1) rising beneath that message then disappearing in
 * white (as a example)"
 *
 * So a kill whose pile is yours shows one line a drop, "Coins (5)" over
 * "Slime Remains (1)", each in its rarity's colour, rising together off the
 * monster and fading.  They replace v2.3.3616's columns (a picture, the amount
 * under it and the rarity's word under that), which replaced the dice roll
 * (game/killRoll.js); `?droplines=0` draws the roll again.
 *
 * A kill tells this phone what it dropped in two messages: the PILE
 * (loot_drop, the worker's _serializePile: its gold -- this player's share of
 * it -- remains, shard, rare gem, armour and weapon) and the killing blow's
 * own (combat_credit's `rh`, the drop the kill's one roll landed on when it is
 * this player's: the gold nugget goes straight into the killer's bag and is on
 * no pile).  combat_credit is sent at once and the pile with the next tick, so
 * the credit is kept a moment (CREDIT_KEEP_MS) for the pile to find, and a
 * nugget whose pile never comes still gets its line (NUGGET_WAIT_MS).
 *
 * WHAT EACH LINE SAYS: the drop's name as the bag says it -- "Coins" for the
 * gold (the owner's word), the remains by the pile's own key (data/remains.js),
 * the shard by its key (data/shards.js), the rest by the codex's own drop table
 * (data/codexDrops.js codexDropsFor) -- and its amount in brackets.  Its COLOUR
 * is its rarity: for a piece of gear its grade, which the pile keeps hidden
 * until it is picked up (purple when the worker says the grade is worth a
 * reveal, else white: _serializePile's mystery bits); for anything else how
 * often it drops (RARITY_TIERS: every kill or most is white, the shard's 1 in
 * 10 green, the rare gem's 1 in 200 blue, the nugget's 1 in 10,000 orange),
 * by the codex's chances, so the line and the codex page always agree.
 *
 * v2.3.3692: THE PICTURE FIRST, THEN THE NAME, THEN "x5" -- the owner,
 * 2026-10-28: "It might also be good to include the icon image next to the
 * name of the dropped items when monsters die (floating popup) I also think
 * the (x5) or whatever number format with the "x" quantity preceding the
 * number looks better. So maybe the icon first then the name then the
 * quantity in the message popup".  Each line carries its drop's picture
 * (`icon`, the codex's own for that drop, data/codexDrops.js: the addresses
 * the bag and the codex load them from), and says "Coins x5".
 *
 * Nothing here decides anything: the drops are the worker's.  This builds the
 * lines (S._dropLines, a short list of groups) and the renderer draws them
 * (rendering/dropLines.js). */
/* relative, plain data only: the server's drop-lines suite imports this */
import { codexDropsFor } from '../data/codexDrops.js';
import { petKindOfMonster } from '../data/trapping.js';
import { remainsName } from '../data/remains.js';
import { shardByKey } from '../data/shards.js';
import { coinArtFor } from './coinArt.js';   /* v2.3.3734 */

const OFF = (() => {
  try { return typeof location !== 'undefined' && /[?&]droplines=0\b/.test(location.search || ''); }
  catch (e) { return false; }
})();

/** Are the lines shown (and the dice roll over the monster not)? */
export function dropLinesLive() { return !OFF; }

/* how long a group is on screen, and how long a credit waits for its pile */
export const DROP_LINES = Object.freeze({
  TTL_MS: 2000,          /* one line's life: in, up, faded (rendering/dropLines.js) */
  STAGGER_MS: 120,       /* each line under the one before comes in (and goes) this much later */
  CREDIT_KEEP_MS: 3000,  /* a kill's credit, kept for its pile to find */
  NUGGET_WAIT_MS: 400,   /* a nugget with no pile in that time shows on its own */
  MAX_GROUPS: 8,         /* a big fight: the oldest group goes first */
  LIFT: 20,              /* popup px over your bar, for a kill off your screen */
});
/** A group's whole life: its last line's, staggered after the first. */
export function dropGroupMs(n) { return DROP_LINES.TTL_MS + Math.max(0, (n || 1) - 1) * DROP_LINES.STAGGER_MS; }

/* how often a drop comes: the colour of its line (and the word the codex uses) */
export const RARITY_TIERS = Object.freeze([
  { at: 0.2, label: 'Normal', color: '#FFFFFF' },
  { at: 0.02, label: 'Uncommon', color: '#7EE0A8' },
  { at: 0.002, label: 'Rare', color: '#7FB2FF' },
  { at: 0, label: 'Very rare', color: '#FFB25A' },
]);
/* a piece of gear's grade: white as any normal drop, purple when the worker
   says its grade is worth a reveal (the bag's colours, dash/common.js) */
export const GRADE_WORDS = Object.freeze({
  normal: { label: 'Normal', color: '#FFFFFF' },
  mystery: { label: 'Mystery', color: '#D9A6FF' },
});

/** A drop's rarity: its grade for gear, else how often it comes. */
export function rarityOf(row, mystery) {
  if (row && row.graded) return mystery ? GRADE_WORDS.mystery : GRADE_WORDS.normal;
  const c = row && typeof row.chance === 'number' ? row.chance : 1;
  for (const t of RARITY_TIERS) if (c >= t.at) return { label: t.label, color: t.color };
  return { label: RARITY_TIERS[RARITY_TIERS.length - 1].label, color: RARITY_TIERS[RARITY_TIERS.length - 1].color };
}

/** "Coins x5": a drop's name and its amount after an x, the owner's way
 *  (v2.3.3692: it was "Coins (5)"). */
export function dropLineText(name, qty) {
  return String(name) + ' x' + Math.max(1, Math.floor(Number(qty) || 1));
}

/* the monster a pile is for: lootId 'mk-<monster id>-<seq>' (index.js
   _spawnLootForKill) */
export function monsterIdOfLoot(lootId) {
  const m = typeof lootId === 'string' ? /^mk-(.+)-\d+$/.exec(lootId) : null;
  return m ? m[1] : null;
}

/** The lines a kill's drops make, top to bottom: what every kill drops first,
 *  the rarest last.  `pile` is the phone's own copy (wsClient
 *  _buildServerPile: coins already this player's share), `rh` the killing
 *  blow's drop, `kind` the monster's codex kind.  A drop the kind's codex
 *  table does not list shows nothing: never a wrong name. */
export function linesFor(kind, pile, rh) {
  const rows = kind ? codexDropsFor(kind, { crack: true }) : null;
  const rowOf = (id) => (rows ? rows.find((r) => r.id === id) || null : null);
  const lines = [];
  const add = (id, qty, mystery, name, fallback) => {
    const row = rowOf(id) || fallback || null;
    if (!row) return;
    const r = rarityOf(row, mystery);
    const q = Math.max(1, Math.floor(qty || 1));
    const nm = name || row.name || id;
    /* v2.3.3692: its picture, the codex row's (null for a drop with none: the
       line is its words alone) */
    /* v2.3.3734: coins show the owner's pile for the amount */
    const icon = id === 'gold' ? coinArtFor(q) : (row.icon || null);
    lines.push({ id, name: nm, qty: q, text: dropLineText(nm, q), label: r.label, color: r.color, icon });
  };
  if (pile) {
    if (pile.coins > 0) add('gold', pile.coins, false, 'Coins');
    if (pile.skull) add('remnant', 1, false, remainsName(pile.skull));
    if (pile.shard) {
      const sh = shardByKey(pile.shard);
      add('shard', 1, false, sh ? sh.label : null, { name: 'Shard', chance: 0.1 });
    }
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
  else if (rh === 'rawgem') add('rawgem', 1, false, null, { name: 'Raw Gem', chance: 0.05 });
  return lines;
}

/* ── the two messages, matched by the monster ── */
function credits(S) { return S._dlCredits || (S._dlCredits = new Map()); }
function groups(S) { return S._dropLines || (S._dropLines = []); }

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
/* WHERE: the first line starts on the monster's body, halfway up to where its
   bar was, and the lines hang under it and rise -- under the killing blow's
   own number, which starts over the bar and climbs faster, so the two never
   cover each other.  A kill off your screen (a burn finishing it out of
   sight) shows over your own head instead, the last line's foot over your bar
   (`over: 'you'`, rendering/dropLines.js): the drops are yours to see. */
function spotOf(S, monsterId, x, y) {
  const at = spotAt(S, monsterId, x, y);
  if (at && inView(S, at.x, at.y + 60)) return at;
  const P = S && S.player;
  if (P && typeof P.x === 'number') {
    const top = typeof S._selfBandTopY === 'number' && isFinite(S._selfBandTopY) ? S._selfBandTopY : P.y - 102;
    return { x: P.x, y: top - 34 - DROP_LINES.LIFT, over: 'you' };
  }
  return at;
}
function spotAt(S, monsterId, x, y) {
  const m = S && S.monsters && monsterId ? S.monsters.find((mm) => mm && mm.id === monsterId) : null;
  /* its bar's stamped offset over its feet (combatHelpers monsterPopupY:
     _popupTopOff, else -120), halved: its body's middle */
  if (m && typeof m.x === 'number') {
    const off = m._popupTopOff != null ? m._popupTopOff : -120;
    return { x: m.x, y: (m.y != null ? m.y : (m.renderY || 0)) + off * 0.5 };
  }
  if (typeof x === 'number' && typeof y === 'number') return { x, y: y - 60 };
  return null;
}
function pushGroup(S, monsterId, kind, spot, lines, now) {
  if (!spot || !lines.length) return null;
  const list = groups(S);
  while (list.length >= DROP_LINES.MAX_GROUPS) list.shift().gone = true;
  const g = { monsterId, kind, x: spot.x, y: spot.y, ts: now, lines, over: spot.over || 'monster' };
  list.push(g);
  if (typeof window !== 'undefined' && window.__btProbe) {
    try {
      const log = window.__btDropLineLog || (window.__btDropLineLog = []);
      log.push({ monsterId, kind, at: now, over: g.over, lines: lines.map((l) => ({ id: l.id, text: l.text, color: l.color, label: l.label, icon: l.icon || null })) });
      if (log.length > 40) log.splice(0, log.length - 40);
    } catch (e) { /* a probe never breaks the game */ }
  }
  return g;
}

/** combat_credit (wsClient): keep the kill's kind and its own drop for the
 *  pile; a nugget whose pile does not come shows by itself. */
export function noteKillCredit(S, cc, now = Date.now()) {
  if (!dropLinesLive() || !S || !cc || !cc.monsterId) return;
  const kind = kindOf(S, cc.monsterId, cc.cx && cc.cx.k);
  const c = { kind, rh: typeof cc.rh === 'string' ? cc.rh : null, at: now, used: false };
  const map = credits(S);
  map.set(cc.monsterId, c);
  for (const [id, v] of map) if (now - v.at > DROP_LINES.CREDIT_KEEP_MS) map.delete(id);
  /* the pile came first: its group takes the nugget now */
  const g = groups(S).find((q) => q.monsterId === cc.monsterId && now - q.ts < DROP_LINES.CREDIT_KEEP_MS);
  if (g) {
    c.used = true;
    if (c.rh === 'nugget' || c.rh === 'rawgem') {
      const more = linesFor(g.kind || kind, null, c.rh);
      if (more.length) { g.lines = g.lines.concat(more); g.dirty = true; }
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
      pushGroup(S, id, kind, spotOf(S, id) || spot0, linesFor(kind, null, cur.rh), Date.now());
    }, DROP_LINES.NUGGET_WAIT_MS);
  }
}

/** loot_drop (gameEvents), a NEW pile in this zone: its lines, when it is
 *  this player's to pick up.  Returns the group, or null. */
export function noteLootDrop(S, pile, myId, now = Date.now()) {
  if (!dropLinesLive() || !S || !pile || pile.isDeathDrop || pile.dropped) return null;
  const mine = Array.isArray(pile.recipients) ? pile.recipients.indexOf(myId) >= 0 : false;
  if (!mine) return null;
  const monsterId = monsterIdOfLoot(pile.lootId);
  const c = monsterId ? credits(S).get(monsterId) : null;
  if (c) c.used = true;
  const kind = (c && c.kind) || kindOf(S, monsterId, null);
  const lines = linesFor(kind, pile, c ? c.rh : null);
  return pushGroup(S, monsterId, kind, spotOf(S, monsterId, pile.x, pile.y), lines, now);
}
