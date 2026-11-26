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
import { Ui2TwoPanel, Ui2ItemGrid, Ui2ItemCell, Ui2Slot, Ui2Action, ui2RootClass } from '@/ui/kit/index.js';
import { getBagEntries } from './bagModel.js';
import { groupSpare } from './gearBag.js';
import { BagTile } from './InventoryPanel.jsx';
import { GEAR_FILTERS, GEAR_CELLS } from './itemCategory.js';
import { gearTabBus } from './gearTabBus.js';
import { GearFilterMenu } from './GearFilterMenu.jsx';
import { cellContent } from './gearCells.js';
import { openItemPage, itemPageInput } from './itemPageOpen.js';
import { runItemAction } from './itemActions.js';
import { itemDetailBus } from './itemDetailBus.js';
import { shopBus } from '../shopBus.js';
import { getEquippedSlots, GHOST_SRC } from '../sheet/equipModel.js';
import { inspectItem, itemSummary, reqWords } from '@/game/itemInspect.js';
import { compareSet } from '@/game/compare.js';
import { projectEquip } from '@/game/equipProject.js';
import { wsPanels, wsPicked, wsScroll } from '@/game/workspace.js';
import { beforeDraw } from '@/game/framePacer.js';
import { coinArtFor } from '@/game/coinArt.js';
import { barNumber } from '@/game/barNumbers.js';
import { gemCutKey, gemIcon } from '@/data/gems.js';
import { SAY } from '@/data/say/gearPanels.js';
import { say } from '@/game/say.js';
import './gearPanels.css';

const GAP = 4;        /* between the two panels */
const PAD = 4;        /* inside a panel */
const HEAD = 30;      /* the label row: its controls 30 px tall, their touch reaching 44 (.u2-hit) */
const MIN = 44;       /* no cell under the finger's floor */
const G = 3;          /* between the bag's squares: a packed, regular grid */
const BODY_G = 6;     /* between the body's cells: wider, so the shape reads apart from the grid */
const COMPARE_KINDS = Object.freeze({ sword: 1, bow: 1, staff: 1, chest: 1, legs: 1, shield: 1 });
/* the body: [column, row] of each of the nine cells (the weapons, the figure's line, the other side) */
const BODY = Object.freeze({ sword: [0, 0], bow: [0, 1], staff: [0, 2], cape: [1, 0], chest: [1, 1], legs: [1, 2], shield: [2, 0], amulet: [2, 1], gem: [2, 2] });
const SHORT_HEAD = 52;   /* sideways: the filter and the coins stacked at the bag's left (no label row in a 63 px page) */
const HAND_OF = Object.freeze({ sword: 'melee', bow: 'ranged', staff: 'staff' });

const bagKeyOf = (e) => (e.kind === 'item' ? 'i-' + e.key : `${e.kind}-${e.index}`);
const safe = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };

/* the panels' box, from a ResizeObserver's own entry (docs/specs/layout-reads.md, way 5: not a read) */
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

/** The geometry: the bag's squares and the body's cells, upright or in one sideways row. */
export function gearPanelsGeometry(W, H) {
  const short = H > 0 && H - HEAD - 2 * PAD < 2 * MIN + G;
  if (short) {
    /* sideways: the Equipped row is nine cells in three groups; the bag takes the rest */
    const cell = Math.max(MIN, Math.min(56, H - 2 * PAD));
    const eqW = 9 * cell + 6 * 2 + 2 * BODY_G * 2 + 2 * PAD;
    const invW = Math.max(2 * cell + 2 * PAD, W - GAP - eqW);
    const cols = Math.max(1, Math.floor((invW - 2 * PAD - (SHORT_HEAD + G) + G) / (cell + G)));
    return { short, W, H, cell, bagCell: cell, cols, invW, eqW, bodyCell: cell, torsoW: cell };
  }
  const pw = Math.floor((W - GAP) / 2);
  const inner = pw - 2 * PAD;
  const below = H - HEAD - 2 * PAD;
  const cols = Math.floor((inner + G) / (MIN + G)) >= 3 ? 3 : 2;
  const bagCell = Math.max(MIN, Math.min(64, Math.floor((inner - (cols - 1) * G) / cols)));
  const bodyCell = Math.max(MIN, Math.min(56, Math.floor((below - 2 * BODY_G) / 3), Math.floor((inner - 2 * BODY_G) / 3.25)));
  const torsoW = Math.min(Math.floor(bodyCell * 1.25), inner - 2 * bodyCell - 2 * BODY_G);
  return { short, W, H, invW: pw, eqW: pw, cols, bagCell, bodyCell, torsoW: Math.max(bodyCell, torsoW) };
}

/* ── the label rows ── */
function InventoryHead({ fid, coins, menu }) {
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
      <span className="u2-gp-coins" data-gear-gold={coins} title={say(SAY, 'gearPanels.coins', { n: coins.toLocaleString() })} aria-label={say(SAY, 'gearPanels.coins', { n: coins.toLocaleString() })}>
        <img src={coinArtFor(coins)} alt="" draggable={false} />
        <span>{barNumber(coins, true, 10000)}</span>
      </span>
    </>
  );
}

/* ── one worn cell, its picture as today's Gear draws it ── */
function WornCell({ c, R, slots, ws, size, w, hand }) {
  const ct = safe(() => cellContent(R, c.id, slots), {});
  const filled = !!ct.item;
  const els = c.id === 'gem' ? (ct.els || []) : [];
  const has = c.id === 'gem' ? els.length > 0 : filled;
  const picked = wsPicked(ws, 'right', c.id);
  const inHand = !!(HAND_OF[c.id] && HAND_OF[c.id] === hand && filled);
  const look = !!safe(() => itemPageInput({ from: 'gear', R, cell: c.id }), null);
  const words = !has ? say(SAY, 'gearPanels.empty', { slot: c.label })
    : inHand ? say(SAY, 'gearPanels.inHand', { slot: c.label, name: ct.name || '' })
      : say(SAY, 'gearPanels.cell', { slot: c.label, name: ct.name || '' });
  const pic = c.id === 'gem' ? null : (ct.icon || GHOST_SRC[HAND_OF[c.id] ? 'weapon' : c.id]);
  return (
    <Ui2ItemCell cell={{ key: c.id, grade: ct.quality || 'normal', empty: !has }} size={size} selected={picked}
      style={{ width: w || size }}
      attrs={{ 'data-eqslot': c.id, 'data-gear-cell': c.id, 'data-gear-filled': filled ? '1' : '0', 'data-gear-active': inHand ? '1' : undefined }}>
      <div role="button" tabIndex={0} aria-pressed={picked} aria-label={words} title={words} className="u2-gp-worn"
        onPointerUp={(e) => { e.stopPropagation(); gearTabBus.wsDo({ type: 'pick', side: 'right', key: c.id, look }); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gearTabBus.wsDo({ type: 'pick', side: 'right', key: c.id, look }); } }}>
        <span className={'u2-slot' + (has ? '' : ' is-empty') + (inHand ? ' is-hand' : '')} data-grade={ct.quality || 'normal'}>
          {!has ? <img className="u2-gp-ghost" src={`/icons/bag/equip-${c.id}.webp?v=2.3.4199`} alt="" draggable={false} />
            : c.id === 'gem' ? (
              <span className="u2-gp-gems">{els.map((el, i) => <img key={el + i} src={gemIcon(gemCutKey(el))} alt="" draggable={false} />)}</span>
            ) : <img className="u2-slot-art" src={pic} alt="" draggable={false} />}
        </span>
      </div>
    </Ui2ItemCell>
  );
}

/* ── the Equipped panel: a body ── */
function EquippedBody({ R, ws, geo }) {
  const slots = safe(() => getEquippedSlots(R), []);
  const hand = R.activeSlot || 'melee';
  const s = geo.bodyCell;
  if (geo.short) {
    const groups = [['sword', 'bow', 'staff'], ['cape', 'chest', 'legs'], ['shield', 'amulet', 'gem']];
    return (
      <div className="u2-gp-bodyrow" data-gear-body="row">
        {groups.map((g, i) => (
          <div key={i} className="u2-gp-group" data-gear-group-of={i}>
            {g.map((id) => <WornCell key={id} c={GEAR_CELLS.find((x) => x.id === id)} R={R} slots={slots} ws={ws} size={s} hand={hand} />)}
          </div>
        ))}
      </div>
    );
  }
  const tw = geo.torsoW;
  return (
    <div className="u2-body" data-gear-body="figure"
      style={{ gridTemplateColumns: `${s}px ${tw}px ${s}px`, gridTemplateRows: `repeat(3, ${s}px)`, columnGap: BODY_G, rowGap: BODY_G }}>
      <span className="u2-body-line" aria-hidden="true" style={{ width: Math.round(tw * 0.62), marginLeft: -Math.round(tw * 0.31) }} />
      {GEAR_CELLS.map((c) => {
        const [col, row] = BODY[c.id] || [0, 0];
        return (
          <div key={c.id} style={{ gridColumn: col + 1, gridRow: row + 1, justifySelf: 'center', position: 'relative' }}>
            <WornCell c={c} R={R} slots={slots} ws={ws} size={s} w={col === 1 ? tw : s} hand={hand} />
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

function Summary({ R, ws, entry, geo }) {
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
    if (p) cmp = compareSet({ kind: p.kind, a: p.now, b: p.then, restricted: reqWords(p.req).why });
  }
  const sum = itemSummary(model, kind, cmp);
  const lead = sum.action;
  const details = () => { gearTabBus.wsDo({ type: 'details' }); openItemPage({ from: 'gear', ...(fromBag ? { R, entry } : { R, cell: ws.pick }) }); };
  const close = (e) => { if (e) e.stopPropagation(); gearTabBus.wsDo({ type: 'close' }); };
  const pic = Math.min(44, geo.short ? geo.cell - 6 : 44);
  return (
    <div className={'u2-gp-sum' + (geo.short ? ' is-row' : '')} data-gear-summary={fromBag ? 'bag' : 'worn'} data-gear-kind={kind}>
      <div className="u2-gp-id">
        <Ui2Slot grade={sum.hidden ? 'normal' : sum.grade} art={sum.art} size={pic} name={sum.name} />
        <div className="u2-gp-name">
          <span className="u2-gp-name-t" data-gear-sum-name="">{sum.name}</span>
          <span className="u2-gp-where">{sum.where}{sum.gradeWord ? ' · ' + sum.gradeWord : ''}</span>
        </div>
        <button type="button" className="u2-gp-x" data-esc="" data-ws-close="" aria-label={say(SAY, 'gearPanels.close')} onClick={close}>{'✕'}</button>
      </div>
      <div className="u2-gp-facts">
        {cmp ? (
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
            {!geo.short && sum.line ? <p className="u2-gp-line">{sum.line}</p> : null}
          </>
        )}
      </div>
      <div className="u2-gp-acts">
        <Ui2Action c="silver" label={say(SAY, 'gearPanels.details')} onClick={details} data-gear-details="" />
        {lead ? (
          <Ui2Action c={lead.face} label={lead.label} disabled={lead.off} onClick={() => runOne(lead.id, got)}
            data-gear-act={lead.id} title={lead.off ? lead.why : undefined} {...(lead.attrs || {})} />
        ) : null}
      </div>
      {lead && lead.off && !(cmp && cmp.restricted) ? <p className="u2-gp-why" data-u2-why="">{lead.why}</p> : null}
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
  React.useLayoutEffect(() => {
    if (!bagShown) return;
    const top = wsScroll(gearTabBus.state.ws, 'left');
    if (top > 0) beforeDraw(() => { const el = bagRef.current; if (el) el.scrollTop = top; });
  }, [bagShown]);

  const geo = gearPanelsGeometry(box.w, box.h);
  const coins = Number(R.coins || 0);
  const weaponsHeld = (R.weaponStash || []).filter(Boolean).length;
  const cells = entries.map((e) => ({ key: bagKeyOf(e), grade: (e.obj && e.obj.quality) || 'normal', e }));
  const selKey = ws.from === 'left' ? ws.pick : null;
  const rowsIn = geo.short ? 1 : Math.max(1, Math.floor((box.h - HEAD - 2 * PAD + G) / (geo.bagCell + G)));
  const fill = Math.max(Math.ceil((cells.length + 1) / geo.cols), rowsIn + 1) * geo.cols;

  const inventory = entries.length === 0 && fid !== 'all' ? (
    <div className="u2-gp-none" data-gear-empty={fid}>
      <span>{say(SAY, 'gearPanels.noneOf', { what: (GEAR_FILTERS[fid] || {}).none || 'items' })}</span>
      <Ui2Action c="silver" label={say(SAY, 'gearPanels.showAll')} onClick={() => gearTabBus.clearFilter()} data-gear-showall="" />
    </div>
  ) : (
    <div data-gear-bag="" style={{ height: '100%' }}>
      <Ui2ItemGrid cells={cells} cols={geo.cols} size={geo.bagCell} gap={G} selectedKey={selKey} fill={fill}
        scrollRef={bagRef} onScroll={onBagScroll}
        render={(c) => (
          <BagTile entry={c.e} selected={false} style={{ aspectRatio: 'auto', height: '100%' }}
            onSelect={() => gearTabBus.wsDo({ type: 'pick', side: 'left', key: c.key, look: true }, c.e.kind === 'item' ? null : c.e.obj)} />
        )} />
    </div>
  );
  const menu = st.menu && bagShown
    ? <GearFilterMenu fid={fid} allEntries={allEntries} counts={counts} weaponsHeld={weaponsHeld} box={{ left: PAD, right: PAD, top: PAD + HEAD, bottom: PAD }} /> : null;
  const summary = ws.mode === 'look' ? <Summary R={R} ws={ws} entry={picked} geo={geo} /> : null;

  const side = (which) => {
    if (show[which] === 'summary') return { kind: 'summary', label: '', children: summary, style: { flex: `0 0 ${which === 'left' ? geo.invW : geo.eqW}px` } };
    if (which === 'left') {
      return { kind: 'storage', label: geo.short ? '' : say(SAY, 'gearPanels.inventory'), headH: geo.short ? undefined : HEAD,
        head: geo.short ? null : <InventoryHead fid={fid} coins={coins} menu={st.menu} />,
        children: geo.short ? (
          <div className="u2-gp-shortrow">
            <div className="u2-gp-shorthead" style={{ width: SHORT_HEAD }}><InventoryHead fid={fid} coins={coins} menu={st.menu} /></div>
            <div style={{ flex: '1 1 auto', minWidth: 0, height: '100%' }}>{inventory}</div>{menu}
          </div>
        ) : <>{inventory}{menu}</>,
        style: { flex: `0 0 ${geo.invW}px` } };
    }
    return { kind: 'worn', label: geo.short ? '' : say(SAY, 'gearPanels.equipped'), headH: geo.short ? undefined : HEAD,
      children: <EquippedBody R={R} ws={ws} geo={geo} />, style: { flex: `0 0 ${geo.eqW}px` } };
  };

  return (
    <div ref={rootRef} className={ui2RootClass('u2-gp')} data-gear-ws="" data-ws-mode={ws.mode} data-ws-from={ws.from || undefined}
      data-ws-keys={keys.length} data-gear-short={geo.short ? '1' : undefined}>
      {box.w > 0 ? <Ui2TwoPanel left={side('left')} right={side('right')} /> : null}
    </div>
  );
}
