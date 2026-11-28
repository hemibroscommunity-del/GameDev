/* ═══ v2.3.6688: GEAR'S TWO PANELS: INVENTORY LEFT, EQUIPPED RIGHT, AND THE QUICK LOOK (card UI2-gear PR 2) ═══
 *
 * The owner, 2026-11-25, with the master specification (part 5): "The new
 * direction removes the permanent middle column, gives slots more space, and
 * distinguishes stored items from worn equipment by layout shape, not color
 * alone."  "Keep the source panel in its original location during quick
 * inspection; the opposite panel is replaced with the summary. No shifting
 * the inventory to the other side."  Part 5.1: the comparison is what
 * happens to YOU.
 *
 * Drawn under the new frame only (GearTab hands over to it; `?ui2=0` keeps
 * today's three panels).  What each side shows is the workspace's
 * (src/game/workspace.js wsPanels), moved only by its one transition through
 * gearTabBus.wsDo:
 *   LEFT   Inventory: the storage grid (the kit's ONE grid of item cells,
 *          each holding the game's own BagTile), the filter and the coins in
 *          its label row; it scrolls inside its panel, and its scroll is kept
 *          (read and given back at the top of the frame: beforeDraw);
 *   RIGHT  Equipped: the nine cells in a BODY's shape, not a grid: the three
 *          weapons down the left, Cape, Chest and Legs (wider: a torso) on
 *          the figure's line in the middle, Shield, Amulet and Gem down the
 *          right; sideways, one row in three groups of three;
 *   a tap on a bag square: the Equipped panel becomes its summary; a tap on a
 *   worn cell: the Inventory panel becomes its summary; the picked square
 *   wears the kit's SELECTED state; the same square again, or the summary's
 *   close (Esc on a computer), is the way back with the bag's scroll.
 * The summary is the one item page's model cut short (itemInspect.js
 * itemSummary of inspectItem of PR 1's itemPageInput), with, for a piece you
 * could put on, the comparison (compare.js compareSet of equipProject.js
 * projectEquip: your DPS now and if equipped, by the Bro pages' readers);
 * its Details opens the ONE item page (openItemPage).  No figure and no
 * health, mana or energy bars here: they are on the world's own screen. */
import React from 'react';
import { Ui2TwoPanel, Ui2ItemGrid, Ui2ItemCell, Ui2Slot, Ui2Action, Ui2Stat, Ui2Comparison, ui2RootClass } from '@/ui/kit/index.js';
import { v17GearOn, GEAR_INTENT, itemActIntent, sumLayout } from '@/game/v17Gear.js';
import { topGoldOn } from '@/game/topGold.js';   /* v2.3.6845: the purse's other place (the top bar) */   /* v2.3.6845 (card UI4 PR 6): `?v17gear` */
import { getBagEntries } from './bagModel.js';
import { groupSpare } from './gearBag.js';
import { BagTile } from './InventoryPanel.jsx';
import { GEAR_FILTERS, GEAR_CELLS } from './itemCategory.js';
import { gearTabBus } from './gearTabBus.js';
import { GearFilterMenu } from './GearFilterMenu.jsx';
import { cellContent } from './gearCells.js';
import { openItemPage, itemPageInput } from './itemPageOpen.js';
import { runItemAction } from './itemActions.js';
import { assetUrl } from '@/game/assetUrl.js';   /* v2.3.6743: the empty slot's ghost gets its file's version, not a hand ?v= (card KEEP PR 3b, the mend) */
import { itemDetailBus } from './itemDetailBus.js';
import { shopBus } from '../shopBus.js';
import { getEquippedSlots, GHOST_SRC } from '../sheet/equipModel.js';
import { inspectItem, itemSummary, reqWords } from '@/game/itemInspect.js';
import { compareSet } from '@/game/compare.js';
import { projectEquip } from '@/game/equipProject.js';
import { gearPanelsGeometry, GEAR_GAP, GEAR_PAD, GEAR_HEAD, GEAR_G, GEAR_BODY_G, GEAR_SHORT_HEAD } from '@/game/gearGeometry.js';   /* v2.3.6784 */
import { GEAR_BODY, GEAR_BODY_ROW } from '@/game/gearShowcase.js';   /* v2.3.6689: the body's shape, shared with the showcase */
import { wsPanels, wsPicked, wsScroll } from '@/game/workspace.js';
import { beforeDraw } from '@/game/framePacer.js';
import { coinArtFor } from '@/game/coinArt.js';
import { barNumber } from '@/game/barNumbers.js';
import { gemCutKey, gemIcon } from '@/data/gems.js';
import { equipLookOn } from '@/game/equipLook.js';   /* v2.3.6698: the Equipped panel's pale green and full pictures (?equiplook=0 the old) */
import { SAY } from '@/data/say/gearPanels.js';
import { say } from '@/game/say.js';
import './gearPanels.css';

/* v2.3.6784 (card UI3-menus): the geometry and its numbers are src/game/gearGeometry.js's (its suite:
   tools/guards/gear-geometry.test.mjs); the label row 24 (was 30), the bag in whole rows */
const PAD = GEAR_PAD, HEAD = GEAR_HEAD, G = GEAR_G, BODY_G = GEAR_BODY_G;
const COMPARE_KINDS = Object.freeze({ sword: 1, bow: 1, staff: 1, chest: 1, legs: 1, shield: 1 });
/* the body: [column, row] of each of the nine cells (v2.3.6689: ONE table, src/game/gearShowcase.js, which
   Bro's Equipment showcase lays its cells out by too) */
const BODY = GEAR_BODY;
const SHORT_HEAD = GEAR_SHORT_HEAD;   /* sideways: the filter and the coins stacked at the bag's left (no label row in a 63 px page) */
const HAND_OF = Object.freeze({ sword: 'melee', bow: 'ranged', staff: 'staff' });

const bagKeyOf = (e) => (e.kind === 'item' ? 'i-' + e.key : `${e.kind}-${e.index}`);
const safe = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };

/* the panels' box, from a ResizeObserver's own entry (docs/specs/layout-reads.md, way 5: not a read) */
/* v2.3.6689: exported as useGearBox, Bro's Equipment showcase measures its page the same way */
export function useGearBox() { return useBox(); }
function useBox() {
  const ref = React.useRef(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let ro = null;
    try {
      ro = new ResizeObserver((list) => {
        const r = list && list[0] && list[0].contentRect;
        if (!r) return;
        const w = Math.round(r.width), h = Math.round(r.height);
        setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
      });
      ro.observe(el);
    } catch (e) { /* an old browser: the default box */ }
    return () => { try { ro && ro.disconnect(); } catch (e) { /* gone */ } };
  }, []);
  return [ref, box];
}

/** The geometry (v2.3.6784: src/game/gearGeometry.js; exported here still, for whoever reads it from Gear). */
export { gearPanelsGeometry };

/* ── the label rows ── */
function InventoryHead({ fid, coins, menu, coinsHere = true }) {
  const word = fid === 'all' ? say(SAY, 'gearPanels.clear') : ((GEAR_FILTERS[fid] || {}).pill || say(SAY, 'gearPanels.allItems'));
  return (
    <>
      <button type="button" className="u2-gp-ctl u2-hit" data-gear-filter={fid} aria-expanded={menu} aria-label={say(SAY, 'gearPanels.filter', { word })}
        data-on={fid === 'all' ? undefined : '1'} onClick={(e) => { e.stopPropagation(); gearTabBus.setMenu(!menu); }}>
        <span className="u2-gp-ctl-word">{word}</span>
      </button>
      {fid !== 'all' ? (
        <button type="button" className="u2-gp-ctl u2-hit" data-gear-filter-clear="" aria-label={say(SAY, 'gearPanels.clearAria')}
          onClick={(e) => { e.stopPropagation(); gearTabBus.clearFilter(); }}>{say(SAY, 'gearPanels.clear')}</button>
      ) : null}
      {/* v2.3.6784 (card UI3-menus, reading 6): the owner, 2026-11-26: "make the gold balance a compact pill":
          the kit's stat at pill size, recessed, the number gold, NOT a button (it opens nothing) */}
      {/* v2.3.6845 (`?v17gear`): the owner, 2026-11-28 about 02:10 UTC: "Remove the coins from bag and slide filter
          over": the purse is on the top bar (src/game/topGold.js), so here it goes and the filter takes its place at
          the row's end; a phone that hid the top bar's gold (`?topgold=0`) keeps it here (no screen without it) */}
      {coinsHere ? <Ui2Stat intent={GEAR_INTENT.coins} size="pill" className="u2-gp-coins" art={coinArtFor(coins)} v={barNumber(coins, true, 10000)}
        data-gear-gold={coins} title={say(SAY, 'gearPanels.coins', { n: coins.toLocaleString() })} aria-label={say(SAY, 'gearPanels.coins', { n: coins.toLocaleString() })} /> : null}
    </>
  );
}

/* ── one worn cell, its picture as today's Gear draws it ──
   v2.3.6689: `tap` (Bro's Equipment showcase) is the cell's own press instead of the workspace's pick
   (no workspace there: `ws` null, nothing picked); `look` then says whether the page has anything for it
   v2.3.6698 (card UI2-equipgreen): the worn picture marked `is-fill`, 94% of its slot as a bag cell's (gearPanels.css),
   in Gear and in the showcase alike; `?equiplook=0` the kit's 72% */
function WornCell({ c, R, slots, ws, size, w, hand, tap }) {
  const ct = safe(() => cellContent(R, c.id, slots), {});
  const filled = !!ct.item;
  const els = c.id === 'gem' ? (ct.els || []) : [];
  const has = c.id === 'gem' ? els.length > 0 : filled;
  const picked = ws ? wsPicked(ws, 'right', c.id) : false;
  const inHand = !!(HAND_OF[c.id] && HAND_OF[c.id] === hand && filled);
  const look = !!safe(() => itemPageInput({ from: 'gear', R, cell: c.id }), null);
  const words = !has ? say(SAY, 'gearPanels.empty', { slot: c.label })
    : inHand ? say(SAY, 'gearPanels.inHand', { slot: c.label, name: ct.name || '' })
      : say(SAY, 'gearPanels.cell', { slot: c.label, name: ct.name || '' });
  const pic = c.id === 'gem' ? null : (ct.icon || GHOST_SRC[HAND_OF[c.id] ? 'weapon' : c.id]);
  const press = () => { if (tap) { if (look) tap(c.id); } else gearTabBus.wsDo({ type: 'pick', side: 'right', key: c.id, look }); };
  return (
    <Ui2ItemCell cell={{ key: c.id, grade: ct.quality || 'normal', empty: !has }} size={size} selected={picked}
      style={{ width: w || size }}
      attrs={{ 'data-eqslot': c.id, 'data-gear-cell': c.id, 'data-gear-filled': filled ? '1' : '0', 'data-gear-active': inHand ? '1' : undefined }}>
      <div role="button" tabIndex={0} aria-pressed={picked} aria-label={words} title={words} className="u2-gp-worn"
        data-gear-look={look ? '1' : '0'}
        onPointerUp={(e) => { e.stopPropagation(); press(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(); } }}>
        <span className={'u2-slot' + (has ? '' : ' is-empty') + (inHand ? ' is-hand' : '')} data-grade={ct.quality || 'normal'}>
          {!has ? <img className="u2-gp-ghost" src={assetUrl(`/icons/bag/equip-${c.id}.webp`)} alt="" draggable={false} />
            : c.id === 'gem' ? (
              <span className="u2-gp-gems">{els.map((el, i) => <img key={el + i} src={gemIcon(gemCutKey(el))} alt="" draggable={false} />)}</span>
            ) : <img className={'u2-slot-art' + (equipLookOn() ? ' is-fill' : '')} src={pic} alt="" draggable={false} />}
        </span>
      </div>
    </Ui2ItemCell>
  );
}

/* ── the Equipped panel: a body ── (v2.3.6689: exported, Bro's Equipment showcase draws the same body,
   its `tap` opening the one item page) */
export function EquippedBody({ R, ws, geo, tap }) {
  const slots = safe(() => getEquippedSlots(R), []);
  const hand = R.activeSlot || 'melee';
  const s = geo.bodyCell;
  if (geo.short) {
    const groups = GEAR_BODY_ROW;
    return (
      <div className="u2-gp-bodyrow" data-gear-body="row">
        {groups.map((g, i) => (
          <div key={i} className="u2-gp-group" data-gear-group-of={i}>
            {g.map((id) => <WornCell key={id} c={GEAR_CELLS.find((x) => x.id === id)} R={R} slots={slots} ws={ws} size={s} hand={hand} tap={tap} />)}
          </div>
        ))}
      </div>
    );
  }
  const tw = geo.torsoW;
  return (
    <div className="u2-body" data-gear-body="figure"
      style={{ gridTemplateColumns: `${s}px ${tw}px ${s}px`, gridTemplateRows: [s, s, s].map((x) => x + 'px').join(' '), columnGap: BODY_G, rowGap: BODY_G }}>
      <span className="u2-body-line" aria-hidden="true" style={{ width: Math.round(tw * 0.62), marginLeft: -Math.round(tw * 0.31) }} />
      {GEAR_CELLS.map((c) => {
        const [col, row] = BODY[c.id] || [0, 0];
        return (
          <div key={c.id} style={{ gridColumn: col + 1, gridRow: row + 1, justifySelf: 'center', position: 'relative' }}>
            <WornCell c={c} R={R} slots={slots} ws={ws} size={s} w={col === 1 ? tw : s} hand={hand} tap={tap} />
          </div>
        );
      })}
    </div>
  );
}

/* ── the summary: the one item page's model, cut short, with the comparison ── */
function runOne(id, got) {
  if (!got) return;
  if (!got.target) {
    if (id === 'unequip' && got.unequip) { got.unequip(); gearTabBus.afterChange(); }
    return;
  }
  const changes = id === 'equip' || id === 'unequip' || id === 'capeOn' || id === 'capeOff';
  const ui = {
    close: () => (changes ? gearTabBus.afterChange() : gearTabBus.wsDo({ type: 'close' })),
    sell: () => {},
    drop: () => itemDetailBus.open({ ...got.target, anchor: null, flow: 'drop' }),
  };
  /* v2.3.6688: Equip shows at once and the worker corrects it, as today (reading 9: step 3's pending mark is
     not on main yet, so no pending mark here) */
  runItemAction(id, got.target, got.card, ui, { equip: { activate: false } });
}

/* the change: its arrow and its amount; the headline adds the words ("No change", "25% more damage per
   second"), a supporting row keeps them in its title and the tradeoff line (the room of a 189 px panel) */
function Change({ row, big }) {
  const c = row.change;
  const tone = c.good > 0 ? 'good' : c.good < 0 ? 'bad' : 'same';
  return (
    <span className={'u2-gp-chg is-' + tone + (big ? ' is-big' : '')} data-cmp-dir={c.dir} data-cmp-good={c.good} title={c.say}>
      {c.arrow ? <span aria-hidden="true">{c.arrow}</span> : null}
      <span>{big ? (c.v ? c.v + ' ' + c.words : c.say) : (c.v || (c.dir === 'none' ? c.say : ''))}</span>
    </span>
  );
}

/* v2.3.6845 (card UI4 PR 6, `?v17gear`): the comparison through the kit's Comparison (V17:49 "Positive/negative
   deltas use signed text and color; never color alone"): each row its number before and after and the difference
   SIGNED with its word ("+2.3 better"); the colour only repeats them.  The headline keeps the game's own words
   under it ("25% more damage per second": compare.js, the whole character's); the rows were an arrow and a number
   (their words only in a title): now the word is on screen.  `L` (v17Gear.js sumLayout) says how many rows and
   whether the tradeoff line fit the room: a row is never half drawn (mp-v17fit). */
function CompareV17({ cmp, short, L }) {
  if (short && !L.head) return null;
  const row = (r, head) => (
    <Ui2Comparison key={r.key} k={r.label} before={r.a.n} after={r.b.n} lower={r.goodWay === 'lower'} digits={r.dec}
      unit={r.unit} className={head ? 'is-head' : undefined}
      data-cmp-head={head ? r.key : undefined} data-cmp-row={head ? undefined : r.key} data-cmp-good={r.change.good} />
  );
  return (
    <>
      <div className="u2-gp-head is-v17">
        {row(cmp.head, true)}
        {L.words && cmp.head.change.dir !== 'none' ? <span className="u2-gp-sub" data-cmp-say="">{cmp.head.change.say}</span> : null}
      </div>
      {short ? null : cmp.rows.slice(0, L.rows).map((r) => row(r, false))}
      {L.line && (cmp.restricted || cmp.tradeoff) ? <p className="u2-gp-line" data-cmp-tradeoff={cmp.restricted ? undefined : ''}>{cmp.restricted || cmp.tradeoff}</p> : null}
    </>
  );
}

function Summary({ R, ws, entry, geo, w, h }) {
  const fromBag = ws.from === 'left';
  const src = fromBag ? { from: 'gear', R, entry } : { from: 'gear', R, cell: ws.pick };
  const got = safe(() => itemPageInput(src), null);
  if (!got) return null;
  /* Sell stays the shop's own window's, as on today's Gear's card (itemPageInput: atShop false) */
  const model = inspectItem(got.input);
  const kind = got.input.kind;
  let cmp = null;
  if (fromBag && entry && entry.obj && !model.hidden && COMPARE_KINDS[kind]) {
    const p = safe(() => projectEquip(R, entry.obj, kind), null);
    /* v2.3.6688 (the mends): `hidden` too, so the rule holds in compare.js itself (a "?" is never compared) */
    if (p) cmp = compareSet({ kind: p.kind, a: p.now, b: p.then, restricted: reqWords(p.req).why, hidden: model.hidden });
  }
  const sum = itemSummary(model, kind, cmp);
  const lead = sum.action;
  const details = () => { gearTabBus.wsDo({ type: 'details' }); openItemPage({ from: 'gear', ...(fromBag ? { R, entry } : { R, cell: ws.pick }) }); };
  const close = (e) => { if (e) e.stopPropagation(); gearTabBus.wsDo({ type: 'close' }); };
  const pic = Math.min(44, geo.short ? geo.cell - 6 : 44);
  const on = v17GearOn();
  /* v2.3.6845 (V17:57 "fixed buttons"): the reason an action is off sits ABOVE the buttons (it pushed them up),
     and Details keeps its half of the row when the item has no action (it took the whole row) */
  const why = lead && lead.off && !(cmp && cmp.restricted) ? <p className="u2-gp-why" data-u2-why="">{lead.why}</p> : null;
  const L = on ? sumLayout(w, h, geo.short, !!why, !!cmp) : null;
  return (
    <div className={'u2-gp-sum' + (geo.short ? ' is-row' : '')} data-gear-summary={fromBag ? 'bag' : 'worn'} data-gear-kind={kind}>
      <div className="u2-gp-id">
        {L && !L.pic ? null : <Ui2Slot grade={sum.hidden ? 'normal' : sum.grade} hidden={sum.hidden} art={sum.art} size={pic} name={sum.name} />}
        <div className="u2-gp-name">
          <span className="u2-gp-name-t" data-gear-sum-name="">{sum.name}</span>
          <span className="u2-gp-where">{sum.where}{sum.gradeWord ? ' · ' + sum.gradeWord : ''}</span>
          {/* v2.3.6688 (the mends): a "?" piece's line, today's card's, in every shape (sideways too) */}
          {sum.hidden && sum.line ? <span className="u2-gp-hidden" data-sum-hidden="">{sum.line}</span> : null}
        </div>
        <button type="button" className="u2-gp-x" data-esc="" data-ws-close="" aria-label={say(SAY, 'gearPanels.close')} onClick={close}>{'✕'}</button>
      </div>
      <div className="u2-gp-facts">
        {cmp && L ? <CompareV17 cmp={cmp} short={geo.short} L={L} /> : L ? (
          <>
            {sum.head && L.head ? (
              <div className="u2-gp-head" data-sum-head={sum.head.k}>
                <span className="u2-gp-k">{sum.head.k}</span><span className="u2-gp-v">{sum.head.v}</span>
              </div>
            ) : null}
            {sum.facts.slice(0, geo.short && !L.head ? 0 : L.rows + (sum.head ? 0 : 1)).map((f) => (
              <div key={f.k} className="u2-gp-row" data-sum-fact={f.k}><span className="u2-gp-k">{f.k}</span><span className="u2-gp-v">{f.v}</span></div>
            ))}
            {L.line && sum.line && !sum.hidden ? <p className="u2-gp-line">{sum.line}</p> : null}
          </>
        ) : cmp ? (
          <>
            <div className="u2-gp-head" data-cmp-head={cmp.head.key}>
              <span className="u2-gp-k">{cmp.head.label}</span>
              <span className="u2-gp-v"><span className="u2-gp-sub">{cmp.subjects.a}</span> {cmp.head.a.v} → <span className="u2-gp-sub">{cmp.subjects.b}</span> {cmp.head.b.v}</span>
              <Change row={cmp.head} big />
            </div>
            {geo.short ? null : cmp.rows.map((r) => (
              <div key={r.key} className="u2-gp-row" data-cmp-row={r.key}>
                <span className="u2-gp-k">{r.label}</span>
                <span className="u2-gp-v">{r.a.v} → {r.b.v}</span>
                <Change row={r} />
              </div>
            ))}
            {!geo.short && (cmp.restricted || cmp.tradeoff) ? <p className="u2-gp-line" data-cmp-tradeoff={cmp.restricted ? undefined : ''}>{cmp.restricted || cmp.tradeoff}</p> : null}
          </>
        ) : (
          <>
            {sum.head ? (
              <div className="u2-gp-head" data-sum-head={sum.head.k}>
                <span className="u2-gp-k">{sum.head.k}</span><span className="u2-gp-v">{sum.head.v}</span>
              </div>
            ) : null}
            {(geo.short ? sum.facts.slice(0, 1) : sum.facts).map((f) => (
              <div key={f.k} className="u2-gp-row" data-sum-fact={f.k}><span className="u2-gp-k">{f.k}</span><span className="u2-gp-v">{f.v}</span></div>
            ))}
            {!geo.short && sum.line && !sum.hidden ? <p className="u2-gp-line">{sum.line}</p> : null}
          </>
        )}
      </div>
      {on ? why : null}
      <div className="u2-gp-acts" data-gear-acts={on ? (lead ? 'two' : 'one') : undefined}>
        {on ? <Ui2Action intent={GEAR_INTENT.details} label={say(SAY, 'gearPanels.details')} onClick={details} data-gear-details="" />
          : <Ui2Action intent={GEAR_INTENT.detailsWas} c="silver" label={say(SAY, 'gearPanels.details')} onClick={details} data-gear-details="" />}
        {lead ? (
          <Ui2Action intent={itemActIntent(lead.id) || undefined} c={lead.face} label={lead.label} disabled={lead.off} onClick={() => runOne(lead.id, got)}
            data-gear-act={lead.id} title={lead.off ? lead.why : undefined} {...(lead.attrs || {})} />
        ) : on ? <span className="u2-gp-act-gap" aria-hidden="true" data-gear-act-gap="" /> : null}
      </div>
      {on ? null : why}
    </div>
  );
}

export function GearPanels({ R: Rin }) {
  const R = Rin || {};
  const [rootRef, box] = useBox();
  const [, tick] = React.useReducer((n) => (n + 1) % 1000000, 0);
  React.useEffect(() => gearTabBus.subscribe(() => tick()), []);
  React.useEffect(() => shopBus.subscribe(() => tick()), []);
  React.useEffect(() => itemDetailBus.subscribe(() => tick()), []);
  /* back from the one item page (the frame popped it): the same look, the same pick */
  React.useEffect(() => { if (gearTabBus.state.ws.mode === 'page') gearTabBus.wsDo({ type: 'back' }); }, []);

  const st = gearTabBus.state;
  const ws = st.ws;
  const show = wsPanels(ws);
  const allEntries = groupSpare(safe(() => getBagEntries(Rin), []));
  const fid = st.filter.id;
  const entries = fid === 'all' ? allEntries : allEntries.filter((e) => e.gcat === fid);
  const counts = Object.create(null);
  for (const e of allEntries) counts[e.gcat] = (counts[e.gcat] || 0) + 1;
  const keys = allEntries.map(bagKeyOf);
  const picked = ws.from === 'left' && ws.pick != null
    ? allEntries.find((e) => (st.sel && st.sel.obj ? e.obj === st.sel.obj : bagKeyOf(e) === ws.pick)) || null : null;

  /* a bag pick that is gone (sold, eaten, equipped from elsewhere): back to management */
  React.useEffect(() => {
    if (ws.from === 'left' && ws.pick != null && !picked) gearTabBus.wsDo({ type: 'gone', keys: [] });
  });

  /* the bag's scroll: read at the top of the frame after a scroll, given back when the bag is drawn again */
  const bagRef = React.useRef(null);
  const askRef = React.useRef(false);
  const onBagScroll = React.useCallback(() => {
    if (askRef.current) return;
    askRef.current = true;
    beforeDraw(() => {
      askRef.current = false;
      const el = bagRef.current;
      if (el) gearTabBus.wsDo({ type: 'scroll', side: 'left', top: el.scrollTop }, null, true);
    });
  }, []);
  const bagShown = show.left === 'panel';
  /* given back when the bag is drawn again: after a look from the Equipped side, and after the item page (Gear
     drawn afresh, the grid there only once its box is known: hence `drawn` among the reasons) */
  const drawn = bagShown && box.w > 0;
  React.useLayoutEffect(() => {
    if (!drawn) return;
    const top = wsScroll(gearTabBus.state.ws, 'left');
    if (top > 0) beforeDraw(() => { const el = bagRef.current; if (el) el.scrollTop = top; });
  }, [drawn]);

  const on = v17GearOn();
  const coinsHere = !on || !topGoldOn();   /* v2.3.6845: the bag's gold pill only where the top bar shows none */
  const geo = gearPanelsGeometry(box.w, box.h, on ? { v17: true, coins: coinsHere } : undefined);   /* v2.3.6845: the mends of mp-v17fit */
  const coins = Number(R.coins || 0);
  const weaponsHeld = (R.weaponStash || []).filter(Boolean).length;
  const cells = entries.map((e) => ({ key: bagKeyOf(e), grade: (e.obj && e.obj.quality) || 'normal', e }));
  const selKey = ws.from === 'left' ? ws.pick : null;
  const rowsIn = geo.rows;   /* v2.3.6784: the geometry's whole rows (reading 7) */
  const fill = Math.max(Math.ceil((cells.length + 1) / geo.cols), rowsIn + 1) * geo.cols;

  const inventory = entries.length === 0 && fid !== 'all' ? (
    <div className="u2-gp-none" data-gear-empty={fid}>
      <span>{say(SAY, 'gearPanels.noneOf', { what: (GEAR_FILTERS[fid] || {}).none || say(SAY, 'gearPanels.items') })}</span>
      <Ui2Action intent={GEAR_INTENT.showAll} c="silver" label={say(SAY, 'gearPanels.showAll')} onClick={() => gearTabBus.clearFilter()} data-gear-showall="" />
    </div>
  ) : (
    <div data-gear-bag="" data-bag-rows={geo.rows} style={{ height: '100%' }}>
      {/* v2.3.6784 (reading 7): the scroller exactly its whole rows tall (geo.bagH), the rest of the body under it;
          (reading 4) the bag's square wears the kit's socket (`kit`), the worn cell's */}
      <Ui2ItemGrid cells={cells} cols={geo.cols} size={geo.bagCell} gap={G} selectedKey={selKey} fill={fill}
        scrollRef={bagRef} onScroll={onBagScroll} height={geo.bagH}
        render={(c) => (
          <BagTile kit entry={c.e} selected={false} style={{ aspectRatio: 'auto', height: '100%' }}
            onSelect={() => gearTabBus.wsDo({ type: 'pick', side: 'left', key: c.key, look: true }, c.e.kind === 'item' ? null : c.e.obj)} />
        )} />
    </div>
  );
  const menu = st.menu && bagShown
    ? <GearFilterMenu fid={fid} allEntries={allEntries} counts={counts} weaponsHeld={weaponsHeld} box={{ left: PAD, right: PAD, top: PAD + HEAD, bottom: PAD }} /> : null;
  /* v2.3.6845: the summary's own box (the side it stands in, inside the pane's padding), for what it holds */
  const sumW = (show.left === 'summary' ? geo.invW : geo.eqW) - 2 * PAD;
  const summary = ws.mode === 'look' ? <Summary R={R} ws={ws} entry={picked} geo={geo} w={sumW} h={geo.H - 2 * PAD} /> : null;

  const side = (which) => {
    if (show[which] === 'summary') return { kind: 'summary', label: '', children: summary, style: { flex: `0 0 ${which === 'left' ? geo.invW : geo.eqW}px` } };
    if (which === 'left') {
      return { kind: 'storage', label: geo.short || !geo.invTitle ? '' : say(SAY, 'gearPanels.inventory'), name: on ? say(SAY, 'gearPanels.inventory') : undefined, headH: geo.short ? undefined : HEAD,
        head: geo.short ? null : <InventoryHead fid={fid} coins={coins} menu={st.menu} coinsHere={coinsHere} />,
        children: geo.short ? (
          <div className="u2-gp-shortrow">
            <div className="u2-gp-shorthead" style={{ width: SHORT_HEAD }}><InventoryHead fid={fid} coins={coins} menu={st.menu} coinsHere={coinsHere} /></div>
            <div style={{ flex: '1 1 auto', minWidth: 0, height: '100%' }}>{inventory}</div>{menu}
          </div>
        ) : <>{inventory}{menu}</>,
        style: { flex: `0 0 ${geo.invW}px` } };
    }
    return { kind: 'worn', label: geo.short || !geo.wornHead ? '' : say(SAY, 'gearPanels.equipped'), name: on ? say(SAY, 'gearPanels.equipped') : undefined, headH: geo.short || !geo.wornHead ? undefined : HEAD,
      children: <EquippedBody R={R} ws={ws} geo={geo} />, style: { flex: `0 0 ${geo.eqW}px` } };
  };

  return (
    <div ref={rootRef} className={ui2RootClass('u2-gp')} data-gear-ws="" data-ws-mode={ws.mode} data-ws-from={ws.from || undefined}
      data-ws-keys={keys.length} data-gear-short={geo.short ? '1' : undefined} data-equip-look={equipLookOn() ? '1' : undefined}
      data-v17-gear={on ? '1' : undefined} data-gear-cols={on ? geo.cols : undefined} data-gear-coins={on ? (coinsHere ? '1' : '0') : undefined} data-gear-box={on ? box.w + 'x' + box.h : undefined}>
      {box.w > 0 ? <Ui2TwoPanel left={side('left')} right={side('right')} /> : null}
    </div>
  );
}
