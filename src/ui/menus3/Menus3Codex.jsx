/* ═══ v2.3.6867: WORLD · CODEX IN THE NEW PANEL (card MN step 8) ═══
 *
 * The header's Codex tab of World, the K key and the NEW MONSTER card open
 * it; a quest's links (World · Quests) open its pages on the quest's own
 * history, so the one Back returns to the quest.  WHAT IT HOLDS IS TODAY'S
 * CODEX (dash/CodexPage.jsx, src/game/codexView.js): the six kinds on a rail
 * of the Bag's pills (Monsters, Items, Resources, Townsfolk, Lands, Pets),
 * "N of M met" and the monsters' tiles four across (the game's own picture,
 * the pet sheet's twin the loading screen fetched, as today's cards: nothing
 * loads because the menu opened; its name, its land, NEW); a kind with no
 * pages yet its honest line, Pets its one door to today's pet journal (a
 * page of today's band: menus3Away keeps the panel's place for its Back).
 *
 * A tile opens the monster's page IN the panel (src/game/menus3Codex.js the
 * page names; menus3Nav.js the one Back): today's showcase and its four
 * doors (Combat, Loot, Habitat, Story) drawn by today's components
 * (dash/MonsterShowcase.jsx, handed the panel's openers); a drop's row opens
 * the item's page (today's model: itemPageInput 'codex' -> inspectItem; its
 * "Found from" door every monster that drops it, a met one opening its
 * page).  A monster's page loads its strips while it is open and frees them
 * on leaving, as today's (CodexStage.jsx: the owner's "loading only when you
 * open the info tab").  The Codex's rule (a page opens at one kill) is
 * codexView.js's, read there only. */
import React, { useEffect } from 'react';
import { Ui2Slot, Ui2Group, Ui2Value, Ui2Empty, ui2RootClass } from '@/ui/kit/index.js';
import { PetPortrait } from '@/ui/petPortrait.jsx';
import { codexView, codexMet } from '@/game/codexView.js';
import { codexCounts, codexFresh, codexLive, takeCodexOpen } from '@/game/monsterCodex.js';
import { monsterShowcase } from '@/game/entityInspect.js';
import { inspectItem } from '@/game/itemInspect.js';
import { CODEX_ENTRIES } from '@/data/monsterCodex.js';
import { codex3Door, codex3Shelf, codex3ItemArg, codex3ItemOf, CODEX3_SHELVES } from '@/game/menus3Codex.js';
import { codexUseS } from '@/ui/mobile/dash/codexPageOpen.js';
import { itemPageInput, codexItemName } from '@/ui/mobile/dash/itemPageOpen.js';
import { ITEM_NAMES } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { CodexShowcase, CodexCombat, CodexLoot, CodexHabitat, CodexStory, CodexFound, codexLoot } from '@/ui/mobile/dash/MonsterShowcase.jsx';
import { useClock } from '@/ui/mobile/sheet/CharacterPage.jsx';
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';
import { menus3Bus, menus3Away } from './menus3Wire.js';
import { SAY } from '@/data/say/codexPages.js';
import { SAY as SAY_CX } from '@/data/say/monsterCodex.js';
import { SAY as SAY_M } from '@/data/say/menus3.js';
import { say } from '@/game/say.js';

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const revOf = (S) => String(S && S._codex ? S._codex.rev : -1);

/* the shelf's word, each key written out (the say guard reads them) */
function shelfWord(id) {
  switch (id) {
    case 'monsters': return say(SAY, 'codexPages.shelfMonsters');
    case 'items': return say(SAY, 'codexPages.shelfItems');
    case 'resources': return say(SAY, 'codexPages.shelfResources');
    case 'townsfolk': return say(SAY, 'codexPages.shelfTownsfolk');
    case 'lands': return say(SAY, 'codexPages.shelfLands');
    default: return say(SAY, 'codexPages.shelfPets');
  }
}

/* the name a monster's pages go by: its own once met, else "???" (the Codex's rule) */
function monsterName(S, kind) {
  if (!kind || !has(CODEX_ENTRIES, kind)) return '';
  return codexMet(codexCounts(S, kind)[0]) ? CODEX_ENTRIES[kind].name : say(SAY_CX, 'monsterCodex.unknownName');
}

/** The header's title for a Codex page in the panel (Menus3Panel.jsx pageTitle). */
export function codexTitle(top, getS) {
  if (!top) return '';
  const S = typeof getS === 'function' ? getS() : null;
  switch (top.page) {
    case 'cxMonster': return monsterName(S, top.arg) || say(SAY, 'codexPages.shelfMonsters');
    case 'cxCombat': return say(SAY, 'codexPages.doorCombat');
    case 'cxLoot': return say(SAY, 'codexPages.doorLoot');
    case 'cxHabitat': return say(SAY, 'codexPages.doorHabitat');
    case 'cxStory': return say(SAY, 'codexPages.doorStory');
    case 'cxFound': return say(SAY_CX, 'monsterCodex.itemFoundFrom');
    case 'cxItem': { const it = codex3ItemOf(top.arg); return it ? codexItemName({ key: it.key, name: ITEM_NAMES[it.key] }) || '' : ''; }
    default: return '';
  }
}

/* ── the Codex's own page: the kinds, and the monsters' tiles ── */
function CodexRoot({ getS, top }) {
  useClock(() => revOf(getS()), 500);
  /* the NEW MONSTER card's tap: that monster's page, over the Codex (as today's) */
  useEffect(() => {
    const k = takeCodexOpen(getS());
    if (k && has(CODEX_ENTRIES, k)) menus3Bus.push('cxMonster', k);
  });
  const S = getS();
  const shelf = codex3Shelf(top.rail);
  const view = codexView({ shelf, countsOf: (k) => codexCounts(S, k), freshOf: (k) => codexFresh(S, k) });
  useEffect(() => {
    try { window.__btMenus3Codex = { shelf: view.shelf, met: view.met, total: view.total, cards: view.cards.map((c) => c.kind), known: view.cards.filter((c) => c.met).map((c) => c.kind), empty: !!view.empty }; } catch (e) { /* no window */ }
  });
  const c = S && S._codex;
  const note = c && c.unavailable ? say(SAY_CX, 'monsterCodex.noteUnavailable')
    : !(c && c.known) && !codexLive(S) ? say(SAY_CX, 'monsterCodex.noteOld') : '';
  const pick = (id) => { menus3Bus.keep({ rail: id, scroll: 0 }); menus3Bus.bump(); };
  const door = view.empty && view.empty.door;
  return (
    <div className="m3-codex" data-m3-codex={view.shelf} data-m3-codex-met={view.met}>
      <div className="m3-rail" role="tablist" aria-label={say(SAY, 'codexPages.shelvesAria')}>
        {CODEX3_SHELVES.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={id === view.shelf} className={'u2-raised u2-ctl m3-pill' + (id === view.shelf ? ' is-selected' : '')}
            data-m3-cxshelf={id} onClick={() => pick(id)}>{shelfWord(id)}</button>
        ))}
      </div>
      {view.cards.length ? <p className="m3-line m3-cx-met" data-m3-cx-head="">{note || view.metWords}</p> : null}
      {view.cards.length ? (
        <div className="m3-grid" data-m3-grid={view.cards.length} style={{ gridTemplateColumns: 'repeat(var(--m3-cols, 4), minmax(0, 1fr))' }}>
          {view.cards.map((card) => (
            <button key={card.kind} type="button" className={'u2-raised u2-ctl m3-tile m3-cx-tile' + (card.met ? '' : ' is-dim')}
              data-m3-cx={card.kind} data-m3-cx-known={card.met ? 1 : 0} data-m3-cx-fresh={card.fresh ? 1 : 0}
              aria-label={card.met && card.element ? card.name + ', ' + card.element.name + ', ' + card.land + ', ' + card.line : card.name + ', ' + card.land + ', ' + card.line}
              onClick={() => menus3Bus.push('cxMonster', card.kind)}>
              {card.fresh ? <span className="m3-cx-new" aria-hidden="true">{say(SAY_CX, 'monsterCodex.cardNew')}</span> : null}
              <span className="m3-tile-art" aria-hidden="true"><PetPortrait pet={{ kind: card.kind, stage: 1 }} size={40} shadow={!card.met} /></span>
              <span className="m3-tile-name">{card.name}</span>
              <span className="m3-cx-land">{card.land}</span>
            </button>
          ))}
        </div>
      ) : null}
      {view.empty ? (
        <div className="m3-cx-empty" data-m3-cx-empty={view.shelf}>
          <Ui2Empty title={view.empty.title} why={view.empty.why} />
          {door ? (
            <button type="button" className="u2-raised u2-ctl m3-door" data-m3-cx-door={door.page}
              onClick={() => menus3Away(() => dashboardPanelBus.push(door.page))}>{door.word}</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ── an item's page, the Codex's (read-only: what it is, where it drops, Found from) ── */
function CodexItem({ R, getS, arg }) {
  const it = codex3ItemOf(arg);
  const S = getS();
  let got = null;
  if (it) {
    const met = it.kind && has(CODEX_ENTRIES, it.kind) && codexMet(codexCounts(S, it.kind)[0]);
    let row = null;
    if (met) { try { row = codexLoot(S, it.kind).rows.find((r) => r.key === it.key) || null; } catch (e) { row = null; } }
    const from = it.kind ? monsterName(S, it.kind) : '';
    try { got = itemPageInput({ from: 'codex', R: R || (S && S.rpg) || {}, key: it.key, kind: it.kind, monster: from, drop: row || { key: it.key, name: ITEM_NAMES[it.key] } }); } catch (e) { got = null; }
  }
  const m = got ? inspectItem(got.input) : null;
  useEffect(() => {
    try { window.__btMenus3CodexItem = m ? { key: it.key, kind: it.kind, name: m.name, facts: m.facts.map((f) => f.k + '=' + f.v), doors: m.doors.map((d) => d.id) } : null; } catch (e) { /* no window */ }
  });
  if (!m) return <div className="m3-page" data-m3-cx-item="" data-m3-gone=""><p className="m3-line">{say(SAY_M, 'menus3.gone')}</p></div>;
  return (
    <div className={ui2RootClass('m3-page')} data-m3-cx-item={it.key}>
      <div className="m3-item-id">
        <Ui2Slot grade="normal" art={m.art} size={48} name={m.name} />
        <span className="m3-item-words">
          <span className="m3-item-name" data-m3-item-name={m.name}>{m.name}</span>
          <span className="m3-item-sub">{[m.gradeWord, m.where].filter(Boolean).join(' · ')}</span>
        </span>
      </div>
      {m.facts.length ? (
        <div className="m3-facts" data-m3-facts={m.facts.length}>
          {m.facts.map((f) => <Ui2Group key={f.k} k={f.k} data-m3-fact={f.k}><Ui2Value v={f.v} /></Ui2Group>)}
        </div>
      ) : null}
      {m.line ? <p className="m3-line" data-m3-item-line="">{m.line}</p> : null}
      {m.doors.map((d) => (
        <button key={d.id} type="button" className="u2-raised u2-ctl m3-qlink" data-m3-cx-itemdoor={d.id}
          onClick={() => { if (d.id === 'codexFound') menus3Bus.push('cxFound', it.key); }}>
          <span className="m3-row-name">{d.label}</span>
          <span className="u2-chev" aria-hidden="true">{'›'}</span>
        </button>
      ))}
    </div>
  );
}

/** World · Codex, and the Codex's pages wherever they were opened: the
 *  panel's body (Menus3Panel.jsx, src/game/menus3Codex.js codex3Body). */
export function Menus3Codex({ R, getS, top }) {
  codexUseS(getS);   /* today's pages read the game's state through codexS() */
  if (!top) return null;
  const open = (page, arg, keep) => menus3Bus.push(page, arg, keep);
  const kind = typeof top.arg === 'string' ? top.arg : '';
  let body = null;
  /* each page keyed by its place in the history: a page of its own, never another's strips */
  const k = top.page + '|' + (top.arg || '');
  switch (top.page) {
    case 'cxMonster':
      body = <div className="m3-cx-fill" data-m3-cx-page="monster" data-m3-cx-of={kind}><CodexShowcase key={k} kind={kind} onDoor={(p) => { const to = codex3Door(p); if (to) open(to, kind); }} /></div>;
      break;
    case 'cxCombat': body = <div className="m3-cx-fill" data-m3-cx-page="combat" data-m3-cx-of={kind}><CodexCombat key={k} kind={kind} /></div>; break;
    case 'cxHabitat': body = <div data-m3-cx-page="habitat" data-m3-cx-of={kind}><CodexHabitat key={k} kind={kind} /></div>; break;
    case 'cxStory': body = <div data-m3-cx-page="story" data-m3-cx-of={kind}><CodexStory key={k} kind={kind} /></div>; break;
    case 'cxLoot':
      body = (
        <div data-m3-cx-page="loot" data-m3-cx-of={kind}>
          <CodexLoot key={k} top={{ kind, row: top.rail }}
            onRow={(r) => { const a = codex3ItemArg(kind, r.key); if (a) open('cxItem', a, { rail: r.id }); }} />
        </div>
      );
      break;
    case 'cxItem': body = <CodexItem key={k} R={R} getS={getS} arg={top.arg} />; break;
    case 'cxFound':
      body = <div data-m3-cx-page="found" data-m3-cx-of={kind}><CodexFound key={k} itemKey={kind || null} onSource={(m) => open('cxMonster', m)} /></div>;
      break;
    default: body = <CodexRoot getS={getS} top={top} />;
  }
  return <div className="m3-cx" data-m3-page={top.page}>{body}</div>;
}
