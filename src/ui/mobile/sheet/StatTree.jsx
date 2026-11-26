/* ═══ v2.3.6686: THE STAT TREE, ONE LAYER AT A TIME (card UI2-combat, the build's step 4, PR 2) ═══
 *
 * The owner's master specification, 4.2: "DPS is the principal offensive
 * summary statistic ... Tap a headline metric to see its breakdown ... Use
 * authoritative existing combat calculations, not hardcoded illustrative
 * numbers"; part 3.2: "Show one layer at a time."  Its second acceptance
 * task: "Find the Sword DPS and explain where its damage comes from by
 * navigating to details."
 *
 * A weapon page's DPS opens layer 0 (src/game/combatHub.js TREE_PAGES): the
 * headline, the line that says in words how its rows join into it, and its
 * rows.  A row with reasons of its own is raised (it opens the next layer, a
 * frame page pushed over this one, so the header's Back returns layer by
 * layer to the weapon's page); a row that is a reason is sunk and names its
 * source (a game rule, placed points, a weapon's level); a row that is the
 * worn weapon is raised too, a door to that item's card (today's card,
 * dash/ItemDetailPopup.jsx, until Gear's item page).
 *
 * Every number is the game's: the tree is src/game/metricTree.js dpsTree
 * built from gameSystems.js calcDisplayDps' `out` (its parts, filled by
 * the lines it returns its total from), with the same two inputs the page's DPS row reads
 * (broStats.js broDpsInputs); tools/guards/metric-tree.test.mjs joins every
 * layer again and holds the root to calcDisplayDps to the last bit.  Element
 * is no part of DPS, so no row is.
 *
 * THE ROOM (the master notes' part 3): 172 px of content upright at 390 x
 * 844: the headline row 44 px, the rows two rows of three 44 px tiles (a
 * layer has five at most).  Sideways (63; 58): one row, the headline and the
 * rows beside it, each a 44 px tile.  No scroll, no smaller text. */
import React, { useEffect } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { itemDetailBus } from '../dash/itemDetailBus.js';
import { useClock, useRoom } from './CharacterPage.jsx';
import { broDpsInputs } from './broStats.js';
import { calcDisplayDps } from '../../../data/gameSystems.js';
import { prog3AtkPts, prog3AtkMeta } from '../../../data/prog3.js';
import { dashNavView } from '@/game/dashNav.js';
import { TREE_PAGES, treeDepthOf, treeSel, treeSelRead } from '@/game/combatHub.js';
import { dpsTree, dpsPartsFrom, nodeAt, nodeText, treeMismatches } from '@/game/metricTree.js';
import { weaponProgress } from '@/game/progression.js';
import { ui2RootClass } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/statTree.js';
import { SAY as HSAY } from '@/data/say/combatHub.js';
import { say } from '@/game/say.js';
import './combatPage.css';

/* a node's word, by its id (metricTree.js names none: the words are the page's) */
const WORD = {
  dps: () => say(SAY, 'statTree.dps'),
  perSwing: () => say(SAY, 'statTree.perSwing'),
  secs: () => say(SAY, 'statTree.secs'),
  scale: () => say(SAY, 'statTree.scale'),
  avg: () => say(SAY, 'statTree.avg'),
  critAdd: () => say(SAY, 'statTree.critAdd'),
  least: () => say(SAY, 'statTree.least'),
  most: () => say(SAY, 'statTree.most'),
  hitBase: () => say(SAY, 'statTree.hitBase'),
  weaponBase: () => say(SAY, 'statTree.weaponBase'),
  levelDmg: () => say(SAY, 'statTree.levelDmg'),
  power: () => say(SAY, 'statTree.power'),
  tier: () => say(SAY, 'statTree.tier'),
  grade: () => say(SAY, 'statTree.grade'),
  spreadLow: () => say(SAY, 'statTree.spreadLow'),
  spreadHigh: () => say(SAY, 'statTree.spreadHigh'),
  flat: () => say(SAY, 'statTree.flat'),
  critChance: () => say(SAY, 'statTree.critChance'),
  critHit: () => say(SAY, 'statTree.critHit'),
  critMult: () => say(SAY, 'statTree.critMult'),
  anchor: () => say(SAY, 'statTree.anchor'),
  critFlat: () => say(SAY, 'statTree.critFlat'),
  swingBase: () => say(SAY, 'statTree.swingBase'),
  speed: () => say(SAY, 'statTree.speed'),
  pace: () => say(SAY, 'statTree.pace'),
  cast: () => say(SAY, 'statTree.cast'),
};
/* how a layer's rows join into its headline, by the node's id (and whether its optional row is there) */
const HOW = {
  dps: (n) => say(SAY, 'statTree.howDps', { k: nodeText(n.kids[n.kids.length - 1]) }),
  perSwing: () => say(SAY, 'statTree.howPerSwing'),
  avg: () => say(SAY, 'statTree.howAvg'),
  least: (n) => (n.kids.length > 2 ? say(SAY, 'statTree.howLeastFlat') : say(SAY, 'statTree.howLeast')),
  most: (n) => (n.kids.length > 2 ? say(SAY, 'statTree.howMostFlat') : say(SAY, 'statTree.howMost')),
  hitBase: () => say(SAY, 'statTree.howHitBase'),
  critAdd: () => say(SAY, 'statTree.howCritAdd'),
  critHit: (n) => (n.kids.length > 4 ? say(SAY, 'statTree.howCritHitFlat') : say(SAY, 'statTree.howCritHit')),
  secs: (n) => (n.kids.length > 3 ? say(SAY, 'statTree.howSecsCast') : say(SAY, 'statTree.howSecs')),
};
const WEAPON_WORD = {
  sword: () => say(HSAY, 'combatHub.sword'),
  bow: () => say(HSAY, 'combatHub.bow'),
  staff: () => say(HSAY, 'combatHub.staff'),
};
const SLOT_OF = Object.freeze({ sword: 'melee', bow: 'ranged', staff: 'staff' });
const wordOf = (n) => (WORD[n.id] ? WORD[n.id]() : n.id);

/* the weapon of a layer's page (its entry's `sel`) */
function selOf(page) {
  try {
    const v = dashNavView(dashboardPanelBus.nav());
    if (v.top && v.top.id === String(page)) return treeSelRead(v.top.sel);
  } catch (e) { /* no frame */ }
  return null;
}
function cat0(page) { const s = selOf(page); return s ? s.cat : 'sword'; }

/** The tree for weapon `cat`, from the very inputs the page's DPS row reads. */
export function weaponDpsTree(R, cat) {
  const { cat: c, as, wpn } = broDpsInputs(R, cat);
  if (!wpn) return { cat: c, as, wpn, tree: null };
  let parts = null;
  const out = {};
  try { parts = dpsPartsFrom(out, calcDisplayDps(as, wpn, out)); } catch (e) { parts = null; }
  const pts = {};
  for (const k of ['dmg', 'luck', 'aspd']) { try { pts[k] = prog3AtkPts(as, c, k); } catch (e) { pts[k] = 0; } }
  let level = 0;
  try { level = weaponProgress(as, c).level; } catch (e) { level = 0; }
  return { cat: c, as, wpn, tree: dpsTree(parts, { cat: c, slot: SLOT_OF[c], level, pts }) };
}

/* the words of where a leaf comes from */
function sourceWords(src, cat, wpn) {
  if (!src) return '';
  if (src.kind === 'item') return wpn ? say(SAY, 'statTree.fromItem', { name: String(wpn.name || wpn.type || '') }) : say(SAY, 'statTree.noItem');
  if (src.kind === 'level') return say(SAY, 'statTree.fromLevel', { w: WEAPON_WORD[cat] ? WEAPON_WORD[cat]() : '', n: src.n });
  if (src.kind === 'points') {
    const m = prog3AtkMeta().find((x) => x.key === src.stat);
    if (!m) return say(SAY, 'statTree.fromPointsOld');
    return say(SAY, 'statTree.fromPoints', { n: Number(src.n) || 0, stat: m.label });
  }
  return say(SAY, 'statTree.fromRule');
}

/**
 * S     the game's state (handed by BroCard)
 * page  this layer's frame page (combatHub.js TREE_PAGES)
 */
export function StatTree({ S, page, live }) {
  /* the numbers follow the game: a new key (a placed point, a new weapon) draws the layer again */
  useClock(() => {
    const L = live ? live() : S;
    const t = weaponDpsTree((L && L.rpg) || {}, cat0(page));
    return t.tree ? String(t.tree.value) + '|' + (t.wpn && t.wpn.name) : '';
  }, 400);
  const [ref, room] = useRoom();
  const depth = Math.max(0, treeDepthOf(page));
  const sel = selOf(page);
  const cat = sel ? sel.cat : 'sword';
  const R = (S && S.rpg) || {};
  const T = weaponDpsTree(R, cat);
  /* the node this layer is: its path read back (a step that no longer exists stops at its parent) */
  let here = T.tree;
  const path = [];
  for (const id of (sel ? sel.path : [])) {
    const next = nodeAt(here, [id]);
    if (!next || !next.kids) break;
    here = next; path.push(id);
  }
  const ww = WEAPON_WORD[cat] ? WEAPON_WORD[cat]() : '';
  useEffect(() => {
    try {
      window.__btStatTree = {
        cat, page: String(page), depth, path: path.slice(), id: here ? here.id : null, value: here ? here.value : null,
        kids: here && here.kids ? here.kids.map((k) => ({ id: k.id, value: k.value, opens: !!k.kids, source: k.source ? k.source.kind : null })) : [],
        root: T.tree ? T.tree.value : null, game: T.wpn ? calcDisplayDps(T.as, T.wpn) : 0,
        mismatches: T.tree ? treeMismatches(T.tree).length : 0,
      };
    } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btStatTree = null; } catch (e) { /* no window */ } }, []);

  if (!here) {
    return (
      <div ref={ref} className={ui2RootClass() + ' u2-st' + (room.short ? ' is-short' : '')} data-stat-tree={cat} data-stat-tree-depth={depth}>
        <div className="u2-group u2-st-none" data-stat-tree-none="">{say(SAY, 'statTree.none', { w: ww })}</div>
      </div>
    );
  }

  const open = (k) => {
    const id = TREE_PAGES[depth + 1];
    if (!id) return;
    dashboardPanelBus.go({ type: 'push', id, sel: treeSel(cat, path.concat(k.id)) });
  };
  const openItem = () => {
    if (!T.wpn) return;
    try { itemDetailBus.open({ kind: 'weapon', slot: SLOT_OF[cat], wpn: T.wpn }); } catch (e) { /* no card */ }
  };
  const headline = (
    <div className="u2-group u2-st-head" data-stat-tree-node={here.id} data-stat-tree-value={nodeText(here)}>
      <span className="u2-st-hv"><b>{nodeText(here)}</b><span className="u2-st-hk">{depth === 0 ? say(SAY, 'statTree.weaponDps', { w: ww }) : wordOf(here)}</span></span>
      <span className="u2-st-how" data-stat-tree-how="">{HOW[here.id] ? HOW[here.id](here) : ''}</span>
    </div>
  );
  const rows = here.kids.map((k) => {
    const v = nodeText(k), w = wordOf(k);
    if (k.kids) {
      return (
        <button key={k.id} type="button" className="u2-raised u2-st-row is-opens" data-stat-tree-row={k.id} data-stat-tree-opens=""
          aria-label={say(SAY, 'statTree.openAria', { word: w, v })} onClick={() => open(k)}>
          <span className="u2-st-rv">{v}</span><span className="u2-st-rk">{w}</span><span className="u2-chev" aria-hidden="true">{'›'}</span>
        </button>
      );
    }
    const from = sourceWords(k.source, cat, T.wpn);
    if (k.source && k.source.kind === 'item' && T.wpn) {
      return (
        <button key={k.id} type="button" className="u2-raised u2-st-row is-item" data-stat-tree-row={k.id} data-stat-tree-source="item"
          aria-label={say(SAY, 'statTree.itemAria', { word: w, v, name: from })} onClick={openItem}>
          <span className="u2-st-rv">{v}</span><span className="u2-st-rk">{w}</span><span className="u2-st-rs">{from}</span><span className="u2-chev" aria-hidden="true">{'›'}</span>
        </button>
      );
    }
    return (
      <div key={k.id} className="u2-group u2-st-row is-leaf" data-stat-tree-row={k.id} data-stat-tree-source={k.source ? k.source.kind : ''}>
        <span className="u2-st-rv">{v}</span><span className="u2-st-rk">{w}</span><span className="u2-st-rs">{from}</span>
      </div>
    );
  });
  return (
    <div ref={ref} className={ui2RootClass() + ' u2-st' + (room.short ? ' is-short' : '')} data-stat-tree={cat} data-stat-tree-depth={depth}>
      {headline}
      <div className={'u2-st-rows is-' + here.kids.length}>{rows}</div>
    </div>
  );
}

export default StatTree;
