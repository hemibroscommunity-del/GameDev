/* ═══ v2.3.6686: A HEADLINE NUMBER AS A TREE (card UI2-combat, the build's step 4, PR 2) ═══
 *
 * The owner's master specification, 4.2: "DPS is the principal offensive
 * summary statistic ... Tap a headline metric to see its breakdown ... Use
 * authoritative existing combat calculations, not hardcoded illustrative
 * numbers."  Part 3.2: "Show one layer at a time."
 *
 * A node: { id, value, fmt, op?, kids?, source? }.
 *   value   the game's own number, as the game worked it out (never redone
 *           here: dpsTree is built from gameSystems.js calcDisplayDps' `out`,
 *           filled by the lines it returns its total from);
 *   op      how its kids JOIN into it (OPS below): a contribution is not
 *           always a sum, so the operator is a word of its own (the page says
 *           it), and `evalNode` joins the kids by it.  The guard
 *           (tools/guards/metric-tree.test.mjs) walks every node and joins
 *           it: each must give its own value to the last bit, so the root is
 *           the headline the game shows, and a branch that is added where the
 *           game multiplies goes red;
 *   source  a leaf's: 'base' (the game's own rule), 'points' (placed points:
 *           `stat`, `n`), 'level' (a weapon's level: `n`), 'item' (the worn
 *           weapon: `slot`, a door to that item's card).
 * The words are the page's (sheet/StatTree.jsx, by the node's id); nothing
 * here is a player's word.  Element is NO part of DPS (calcDisplayDps reads
 * none), so no node is.  No effective-health number exists in the game
 * (the master notes' F1): no tree here makes one.
 *
 * No imports: node tests it. */

/* The joins, each the expression its lines in gameSystems.js write, in the
   same order (floating point is not associative: a join re-ordered is a
   different number, and the guard sees it). */
export const OPS = Object.freeze({
  /* a ÷ b ÷ c ...: DPS = damage a swing ÷ seconds a swing ÷ the display's scale */
  quotient: (v) => v.slice(1).reduce((a, b) => a / b, v[0]),
  /* a + b + ...: damage a swing = the average hit + what critical hits add */
  sum: (v) => v.slice(1).reduce((a, b) => a + b, v[0]),
  /* (a + b) / 2: the average hit, halfway between the least and the most */
  mean: (v) => (v[0] + v[1]) / 2,
  /* chance x (critical hit - average hit): what critical hits add */
  critAdd: (v) => v[0] * (v[1] - v[2]),
  /* the greater of (average x multiplier) and (most x anchor), then + flat */
  critHit: (v) => Math.max(v[0] * v[1], v[2] * v[3]) + (v.length > 4 ? v[4] : 0),
  /* base x spread + flat, to a whole number: a hit's least or most */
  roundHit: (v) => Math.round(v[0] * v[1] + (v.length > 2 ? v[2] : 0)),
  /* (weapon's base + level's) x Power x tier x grade: a hit's base */
  hitBase: (v) => (v[0] + v[1]) * v[2] * v[3] * v[4],
  /* (base time x Speed x the weapon's pace + cast time) / 1000: seconds a swing */
  swing: (v) => (v[0] * v[1] * v[2] + (v.length > 3 ? v[3] : 0)) / 1000,
});

export const SOURCES = Object.freeze(['base', 'points', 'level', 'item',
  /* v2.3.6695 (card UI2-feats): AP's tree (src/game/feats.js apTree): 'medal' an earned achievement
     (`id`, a door to its medal; null: none earned yet), 'rest' quests, guild rungs and the arena
     together (the worker keeps one total) */
  'medal', 'rest']);

function node(id, value, fmt, more) {
  return Object.freeze({ id, value: Number(value), fmt, ...(more || {}) });
}
function leaf(id, value, fmt, source) {
  return node(id, value, fmt, { source: Object.freeze({ ...source }) });
}
function branch(id, value, fmt, op, kids) {
  return node(id, value, fmt, { op, kids: Object.freeze(kids.filter(Boolean)) });
}
/* v2.3.6695: the same makers for another headline's tree (feats.js apTree), never a second shape */
export const treeLeaf = leaf;
export const treeBranch = branch;

/** v2.3.6686: the parts calcDisplayDps(rpg, wpn, out) filled, with its total: { ...out, dps },
 *  or null where it filled none (no weapon).  Call as dpsPartsFrom(out, calcDisplayDps(r, w, out)). */
export function dpsPartsFrom(out, dps) {
  return out && out.range ? Object.freeze({ ...out, dps: Number(dps) }) : null;
}

/** A node's value joined again from its kids by its operator (a leaf: its own value). */
export function evalNode(n) {
  if (!n || !n.kids || !n.kids.length) return n ? n.value : NaN;
  const f = OPS[n.op];
  if (typeof f !== 'function') return NaN;
  return f(n.kids.map(evalNode));
}

/** Every node whose kids, joined by its operator, do not give its own value:
 *  [{ id, value, joined }].  Empty: the tree multiplies out to the headline. */
export function treeMismatches(root) {
  const out = [];
  const walk = (n, path) => {
    if (!n) return;
    if (n.kids && n.kids.length) {
      const j = OPS[n.op] ? OPS[n.op](n.kids.map((k) => k.value)) : NaN;
      if (!(j === n.value)) out.push({ id: path, value: n.value, joined: j });
      for (const k of n.kids) walk(k, path + '/' + k.id);
    }
  };
  walk(root, root ? root.id : '');
  return out;
}

/** The node at a path of ids under the root ([] the root), or null. */
export function nodeAt(root, path) {
  let n = root || null;
  for (const id of path || []) {
    if (!n || !n.kids) return null;
    n = n.kids.find((k) => k.id === id) || null;
  }
  return n;
}

/** Every node of the tree, once each by its path: [{ path: [ids], node }]. */
export function treeNodes(root) {
  const out = [];
  const walk = (n, path) => {
    out.push({ path, node: n });
    for (const k of n.kids || []) walk(k, path.concat(k.id));
  };
  if (root) walk(root, []);
  return out;
}

/* a number as the page shows it, by its kind */
const trim = (s) => s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
export function nodeText(n) {
  const v = Number(n && n.value);
  if (!Number.isFinite(v)) return '—';
  switch (n.fmt) {
    case 'dps': return v.toFixed(1);                       /* the headline's own form (broStats.js) */
    case 'pct': return trim((v * 100).toFixed(1)) + '%';
    case 'x': return '×' + trim(v.toFixed(3));
    case 's': return trim(v.toFixed(3)) + ' s';
    case 'ms': return trim(v.toFixed(1)) + ' ms';
    case 'int': return String(Math.round(v));
    default: return trim(v.toFixed(2));                    /* damage, in the game's own units */
  }
}

/**
 * DPS as a tree, from calcDisplayDps' parts (gameSystems.js) and what
 * names a leaf's source.  Null with no parts (no weapon: the page's "—").
 * p     dpsPartsFrom(out, calcDisplayDps(as, wpn, out))
 * info  { cat, slot, level, pts: { dmg, luck, aspd } }
 */
export function dpsTree(p, info) {
  if (!p || !p.range || !p.range.parts || !p.range.parts.hit) return null;
  const I = info || {};
  const pts = I.pts || {};
  const r = p.range, rp = r.parts, h = rp.hit;
  const item = { kind: 'item', slot: I.slot || null };
  const hitBase = branch('hitBase', rp.base, 'dmg', 'hitBase', [
    leaf('weaponBase', h.effBase, 'dmg', item),
    leaf('levelDmg', h.term, 'dmg', { kind: 'level', cat: I.cat || null, n: Number(I.level) || 0 }),
    leaf('power', h.powerMult, 'x', { kind: 'points', stat: 'dmg', n: Number(pts.dmg) || 0 }),
    leaf('tier', h.tierFactor, 'x', item),
    leaf('grade', h.qualityMult, 'x', item),
  ]);
  /* a flat part that is 0 is not shown: x + 0 is x to the bit */
  const flat = rp.flat ? leaf('flat', rp.flat, 'dmg', { kind: 'points', stat: 'flat', n: rp.flat }) : null;
  const least = branch('least', r.min, 'int', 'roundHit', [hitBase, leaf('spreadLow', rp.band[0], 'x', { kind: 'base' }), flat]);
  const most = branch('most', r.max, 'int', 'roundHit', [hitBase, leaf('spreadHigh', rp.band[1], 'x', { kind: 'base' }), flat]);
  const avg = branch('avg', p.avg, 'dmg', 'mean', [least, most]);
  const critFlat = p.critFlat ? leaf('critFlat', p.critFlat, 'dmg', { kind: 'points', stat: 'critDmg', n: p.critFlat }) : null;
  const critHit = branch('critHit', p.critHit, 'dmg', 'critHit', [
    avg,
    leaf('critMult', p.critMult, 'x', { kind: 'points', stat: 'luck', n: Number(pts.luck) || 0 }),
    most,
    leaf('anchor', p.anchorMult, 'x', { kind: 'base' }),
    critFlat,
  ]);
  const chance = leaf('critChance', p.critChance, 'pct', { kind: 'points', stat: 'luck', n: Number(pts.luck) || 0 });
  const critAdd = branch('critAdd', p.critAdd, 'dmg', 'critAdd', [chance, critHit, avg]);
  const perSwing = branch('perSwing', p.perSwing, 'dmg', 'sum', [avg, critAdd]);
  const secs = branch('secs', p.secs, 's', 'swing', [
    leaf('swingBase', rp.swingMs, 'ms', { kind: 'base' }),
    leaf('speed', rp.swingMult, 'x', { kind: 'points', stat: 'aspd', n: Number(pts.aspd) || 0 }),
    leaf('pace', rp.paceMult, 'x', { kind: 'base' }),
    rp.castMs ? leaf('cast', rp.castMs, 'ms', { kind: 'base' }) : null,
  ]);
  return branch('dps', p.dps, 'dps', 'quotient', [perSwing, secs, leaf('scale', p.scaleK, 'int', { kind: 'base' })]);
}
