/* ═══ v2.3.6863: WORLD · QUESTS IN THE NEW PANEL -- THE TODAY STRIP, THE RAIL, A QUEST'S PAGE (card MN step 7) ═══
 *
 * The owner's Quests (docs/design/menus3/SPEC.md "What To Do", the wireframe
 * v4.4): the Today strip at the top, a rail Active | On offer | Done over the
 * rows (the wireframe's; its Daily rail is sample content: the game's daily
 * quests are off), a row opening the quest's own page in the panel with the
 * one Back (src/game/menus3Nav.js).  The rules are node's
 * (src/game/menus3Quests.js); the history is the panel's (menus3Wire.js).
 *
 * NOTHING NEW IS INVENTED.  The lists are the journal's (questJournalModel.js
 * questJournalList / questJournalPage, the reading today's Quests pages
 * draw); a quest's page IS today's drawing (dash/questViews.jsx
 * QuestPageView: the steps behind you, NOW, "The adventure continues", Track,
 * Show on map, the Rewards door; a step still to come never drawn) with its
 * rules (questPages.js journeyToNow, questActions); Show on map is today's
 * (QuestJournalPage.jsx showQuestOnMap: the world map, the gold road on the
 * quest) and the panel stays open UNDER the map, so closing the map is back
 * on the quest.  A quest's links (a monster's Codex page, an item's page) are
 * TODAY's pages in today's band until the new Codex is built (card MN step
 * 8); the panel is handed back when their Back leaves (menus3Wire.js
 * menus3Away).
 *
 * THE TODAY STRIP (menus3Quests.js todayStrip): the free daily spin (its
 * button opens the login wheel exactly as the top bar's does: the wheel's own
 * request), the login streak with the Gambling Den's spin (the Daily Rewards
 * window's Today tab, read; asked fresh as that window asked:
 * dailyRewards.js askRewards, `rewards_get`), the farm's three orders (read
 * from Feed & Seed's last board; nothing asked: farm_open writes the free
 * deed).  A place's words open under the strip, one at a time.
 *
 * No art loads because it opened: the givers' faces, the item thumbs and the
 * prize wheel are the files today's Quests and the top bar already draw. */
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { questJournalList, questJournalPage, journalCtx, questById } from '@/ui/mobile/sheet/questJournalModel.js';
import { npcPortrait, showQuestOnMap } from '@/ui/mobile/dash/QuestJournalPage.jsx';
import { thumbFor, ITEM_NAMES } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { QuestRow, QuestPageView, QuestRewardsView } from '@/ui/mobile/dash/questViews.jsx';
import { useClock } from '@/ui/mobile/sheet/CharacterPage.jsx';
import { openCodexMonster } from '@/ui/mobile/dash/codexPageOpen.js';
import { openItemPage, codexItemName } from '@/ui/mobile/dash/itemPageOpen.js';
import { trackedQuestId, setTrackedQuest } from '@/game/trackedQuest.js';
import { journeyToNow, questActions } from '@/game/questPages.js';
import { dailyRewardsBus, spinLive, questsLive, seasonLive, askRewards, untilText, coinsShort } from '@/game/dailyRewards.js';
import { loginSpinBus, loginSpinNextWords } from '@/game/loginSpinWheel.js';
import { farmBus } from '@/ui/mobile/farmBus.js';
import { CODEX_REMNANTS } from '@/data/codexDrops.js';
import { CODEX_ENTRIES } from '@/data/monsterCodex.js';
import { MENUS3_QUEST_RAIL, questRailId, questRails, questRailStart, questLinks, todayStrip, todayTap } from '@/game/menus3Quests.js';
import { deskWords } from '@/game/deskWords.js';
import { Ui2Empty } from '@/ui/kit/EmptyState.jsx';
import { menus3Bus, menus3Away } from './menus3Wire.js';
import { SAY } from '@/data/say/menus3Quests.js';
import { SAY as SAY_DR } from '@/data/say/dailyRewards.js';
import { SAY as SAY_J } from '@/data/say/questJournal.js';
import { say } from '@/game/say.js';

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const codexKnown = (k) => has(CODEX_ENTRIES, k);

/* the journal's list and a page, never throwing into the panel */
function listOf(S) {
  const ctx = journalCtx(S);
  let L = null;
  try { L = questJournalList(S, ctx); } catch (e) { L = null; }
  const counts = Object.create(null);
  if (L) {
    for (const r of L.active || []) {
      let p = null;
      try { p = questJournalPage(S, r.id, ctx); } catch (e) { p = null; }
      if (p && p.now && p.now.count) counts[r.id] = p.now.count;
    }
  }
  return questRails(L, { known: !!(S && S._serverCaps), tracked: trackedQuestId(), counts });
}
function pageOf(S, qid) {
  if (!qid) return null;
  try { return questJournalPage(S, qid, journalCtx(S)); } catch (e) { return null; }
}
const railsKey = (r) => r.kind + '|' + r.active.map((x) => [x.id, x.ready ? 1 : 0, x.tracked ? 1 : 0, x.count ? x.count.have + '/' + x.count.n : ''].join(':')).join(',')
  + '|' + r.offers.map((x) => x.id).join(',') + '|' + r.done.length;
const pageKey = (p) => (!p ? '-' : [p.id, p.status, p.now ? p.now.text : '', p.now && p.now.count ? p.now.count.have + '/' + p.now.count.n : '', p.where ? p.where.text + (p.where.map ? '+' : '') : ''].join('|'));

/* ── THE TODAY STRIP ── */
function useBus(bus, get) { return useSyncExternalStore(bus.subscribe, get, get); }

function stripOf(S) {
  const lg = loginSpinBus.get() || {};
  return todayStrip({
    login: { known: !!lg.known, avail: !!lg.avail, capOn: !!(S && S._serverCaps && S._serverCaps.loginspin) },
    rewards: dailyRewardsBus.get(),
    denOn: spinLive(S),
    ordersOn: !!(S && S._serverCaps && S._serverCaps.farmorders),
    orders: farmBus.orders,
    now: farmBus.serverNow(),
    dailyOn: questsLive(S),
    seasonOn: seasonLive(S),
  });
}

function chipWord(c) {
  switch (c.id) {
    case 'spin': return say(SAY, 'menus3q.spin');
    case 'streak': return say(SAY, 'menus3q.streak', { days: c.days });
    case 'orders': return c.known ? say(SAY, 'menus3q.orders', { done: c.done, all: c.all }) : say(SAY, 'menus3q.ordersShort');
    default: return say(SAY, 'menus3q.daily');
  }
}

/* the Den's spin, in the Daily Rewards window's own words (DailyRewardsWindow.jsx TodayTab) */
function denWords(d, st) {
  if (!d) return null;
  const head = d.state === 'locked' ? say(SAY_DR, 'dailyRewards.spinTitle') : d.state === 'open' ? say(SAY_DR, 'dailyRewards.spinPot', { pot: coinsShort(d.pot) })
    : d.state === 'ready' ? say(SAY_DR, 'dailyRewards.spinReady') : d.state === 'bonus' ? say(SAY_DR, 'dailyRewards.spinExtra', { n: d.extra }) : say(SAY_DR, 'dailyRewards.spinDone');
  const sub = d.state === 'locked' ? say(SAY_DR, 'dailyRewards.spinLocked') : d.state === 'open' ? say(SAY_DR, 'dailyRewards.spinOpen')
    : d.state === 'ready' || d.state === 'bonus' ? (d.jackpot ? say(SAY_DR, 'dailyRewards.spinLumpJackpot', { jackpot: coinsShort(d.jackpot) }) : say(SAY_DR, 'dailyRewards.spinLump'))
    : say(SAY_DR, 'dailyRewards.spinNext', { until: untilText(st && st.resetAt, st) });
  return { head, sub };
}

function TodayWords({ c, onSpin }) {
  if (c.id === 'spin') {
    return (
      <div className="m3-today-words" data-m3-today-words="spin">
        <span className="m3-today-line">{c.avail ? say(SAY, 'menus3q.spinReady') : say(SAY, 'menus3q.spinSpent') + ' ' + loginSpinNextWords() + '.'}</span>
        {c.avail ? <button type="button" className="u2-raised u2-ctl m3-today-go" data-m3-spin-go="" onClick={onSpin}>{say(SAY, 'menus3q.spinGo')}</button> : null}
      </div>
    );
  }
  if (c.id === 'streak') {
    const st = dailyRewardsBus.get();
    const den = denWords(c.den, st);
    return (
      <div className="m3-today-words is-col" data-m3-today-words="streak">
        <span className="m3-today-line"><b>{say(SAY_DR, 'dailyRewards.streak', { days: c.days })}</b>{' \u00B7 ' + say(SAY, 'menus3q.freezes', { fz: c.fz, max: c.fzMax })}</span>
        <span className="m3-today-sub">{(c.saved ? say(SAY_DR, 'dailyRewards.freezeSaved') : '') + say(SAY_DR, 'dailyRewards.streakHow')}</span>
        <span className="m3-today-sub">{say(SAY_DR, 'dailyRewards.freezeHow', { every: c.every })}</span>
        {den ? <span className="m3-today-line" data-m3-den={c.den.state}><b>{say(SAY, 'menus3q.denHead')}</b>{': ' + den.head}</span> : null}
        {den ? <span className="m3-today-sub">{den.sub}</span> : null}
      </div>
    );
  }
  if (c.id === 'orders') {
    return (
      <div className="m3-today-words is-col" data-m3-today-words="orders">
        {c.known ? c.list.map((o, i) => (o.gone
          ? <span key={i} className="m3-today-sub" data-m3-order={i}>{say(SAY, 'menus3q.orderGone')}</span>
          : (
            <span key={i} className="m3-today-line m3-order" data-m3-order={i} data-m3-order-done={o.done ? '1' : '0'}>
              {thumbFor(o.key) ? <img src={thumbFor(o.key)} alt="" draggable={false} className="m3-order-art" /> : null}
              <span className="m3-order-name">{say(SAY, 'menus3q.order', { n: o.n, name: ITEM_NAMES[o.key] || o.key })}</span>
              <span className="m3-today-sub">{o.done ? say(SAY, 'menus3q.orderDone') : say(SAY, 'menus3q.orderPay', { gold: o.gold, xp: o.xp })}</span>
            </span>
          ))) : null}
        <span className="m3-today-sub">{c.known ? say(SAY, 'menus3q.ordersAt') : c.old ? say(SAY, 'menus3q.ordersNew') : say(SAY, 'menus3q.ordersUnseen')}</span>
      </div>
    );
  }
  return null;
}

function TodayStrip({ S }) {
  useBus(loginSpinBus, loginSpinBus.get);
  useBus(dailyRewardsBus, dailyRewardsBus.get);
  useBus(farmBus, farmBus.getSnapshot);
  const [open, setOpen] = useState(null);
  /* fresh from the worker as the Daily Rewards window was, once a visit (the same ask, the same row) */
  useEffect(() => { if (spinLive(S)) askRewards(); }, []);
  const chips = stripOf(S);
  if (!chips.length) return null;
  const shown = chips.find((c) => c.id === open) || null;
  const tap = (c) => {
    if (c.id === 'daily') { dailyRewardsBus.openWindow('today'); return; }
    setOpen((o) => todayTap(o, c.id));
  };
  return (
    <div className="m3-today" data-m3-today={chips.map((c) => c.id).join(' ')}>
      <div className="m3-rail" role="group" aria-label={say(SAY, 'menus3q.today')}>
        {chips.map((c) => (
          <button key={c.id} type="button" className={'u2-raised u2-ctl m3-pill m3-chip' + (c.lit ? ' is-lit' : '') + (open === c.id ? ' is-selected' : '')}
            data-m3-chip={c.id} data-m3-lit={c.lit ? '1' : '0'} aria-expanded={c.id === 'daily' ? undefined : open === c.id} onClick={() => tap(c)}>
            {c.lit ? <span className="m3-chip-dot" aria-hidden="true" /> : null}
            {chipWord(c)}
          </button>
        ))}
      </div>
      {shown ? <TodayWords c={shown} onSpin={() => { try { loginSpinBus.open(); } catch (e) { /* no wheel */ } }} /> : null}
    </div>
  );
}

/* ── THE RAIL AND ITS ROWS ── */
function railWord(id, n) {
  if (id === 'offers') return say(SAY, 'menus3q.railOffers', { n: n.offers });
  if (id === 'done') return say(SAY, 'menus3q.railDone', { n: n.done });
  return say(SAY, 'menus3q.railActive', { n: n.active });
}

function MapButton({ S, qid, title }) {
  const p = pageOf(S, qid);
  if (!p || !p.where || p.where.map !== true) return null;
  return (
    <button type="button" className="u2-raised u2-ctl m3-qmap" data-m3-qmap={qid} aria-label={say(SAY, 'menus3q.mapAria', { title })}
      onClick={() => showQuestOnMap(p)}>{say(SAY, 'menus3q.map')}</button>
  );
}

function QuestsRoot({ getS, top }) {
  const S = getS();
  const rails = listOf(S);
  useClock(() => railsKey(listOf(getS())), 1000);
  const rail = top.rail == null ? questRailStart(rails) : questRailId(top.rail);
  const pick = (id) => { menus3Bus.keep({ rail: id, scroll: 0 }); menus3Bus.bump(); };
  const open = (qid) => menus3Bus.push('quest', qid, { rail });
  useEffect(() => {
    try { window.__btMenus3Quests = { rail, kind: rails.kind, active: rails.active.map((r) => r.id), offers: rails.offers.map((r) => r.id), done: rails.done.map((r) => r.id), ready: rails.active.filter((r) => r.ready).map((r) => r.id), tracked: (rails.active.find((r) => r.tracked) || {}).id || null }; } catch (e) { /* no window */ }
  });
  let body;
  if (rails.kind === 'loading') body = <Ui2Empty kind="loading" rows={2} />;
  else if (rail === 'offers') {
    body = rails.offers.length ? rails.offers.map((r) => (
      <div key={r.id} className="m3-qrow">
        <QuestRow r={{ id: r.id, title: r.title, npc: r.npc, sub: deskWords(r.where || '') }} face={npcPortrait(r.npc)} onOpen={() => open(r.id)}
          hooks={{ 'data-m3-quest': r.id, 'data-m3-quest-rail': 'offers' }} />
        <MapButton S={S} qid={r.id} title={r.title} />
      </div>
    )) : <Ui2Empty kind="absent" title={say(SAY, 'menus3q.noneOffers')} />;
  } else if (rail === 'done') {
    body = rails.done.length ? rails.done.map((r) => (
      <div key={r.id} className="m3-qrow">
        <QuestRow r={{ id: r.id, title: r.title, npc: (questById(r.id) || {}).npc || '' }} face={npcPortrait((questById(r.id) || {}).npc)} onOpen={() => open(r.id)}
          hooks={{ 'data-m3-quest': r.id, 'data-m3-quest-rail': 'done' }} />
      </div>
    )) : <Ui2Empty kind="absent" title={say(SAY, 'menus3q.noneDone')} />;
  } else {
    body = rails.active.length ? rails.active.map((r) => (
      <div key={r.id} className="m3-qrow">
        <QuestRow r={r} face={npcPortrait(r.npc)} onOpen={() => open(r.id)}
          hooks={{ 'data-m3-quest': r.id, 'data-m3-quest-rail': 'active', 'data-m3-quest-ready': r.ready ? '1' : '0', 'data-m3-quest-track': r.tracked ? 'on' : 'off' }} />
        <MapButton S={S} qid={r.id} title={r.title} />
      </div>
    )) : <Ui2Empty kind="absent" title={say(SAY, rails.n.offers ? 'menus3q.noneActive' : 'menus3q.noneActiveAll')} />;
  }
  return (
    <div className="m3-quests" data-m3-quests={rail}>
      <TodayStrip S={S} />
      <div className="m3-rail" role="group" aria-label={say(SAY, 'menus3q.railAria')}>
        {MENUS3_QUEST_RAIL.map((id) => (
          <button key={id} type="button" className={'u2-raised u2-ctl m3-pill' + (id === rail ? ' is-selected' : '')} data-m3-qrail={id}
            aria-pressed={id === rail} onClick={() => pick(id)}>{railWord(id, rails.n)}</button>
        ))}
      </div>
      <div className="m3-qlist" data-m3-qlist={rail}>{body}</div>
    </div>
  );
}

/* ── A QUEST'S PAGE ── */
function linkWord(l, page) {
  if (l.kind === 'monster') return say(SAY, 'menus3q.inCodex', { name: (CODEX_ENTRIES[l.id] || {}).name || l.id });
  if (l.kind === 'item') return say(SAY, 'menus3q.itemPage', { name: codexItemName({ key: l.key, name: ITEM_NAMES[l.key] }) || ITEM_NAMES[l.key] || l.key });
  const place = page && page.where && page.where.text ? deskWords(page.where.text) : '';
  return place ? say(SAY, 'menus3q.onMap', { place }) : say(SAY, 'menus3q.placeMap');
}

function QuestOne({ R, getS, qid }) {
  const [, force] = useState(0);
  const noteUntil = React.useRef(0);
  useClock(() => pageKey(pageOf(getS(), qid)) + trackedQuestId() + (Date.now() < noteUntil.current ? '+note' : ''), 1000);
  const stepsRef = React.useRef(null);
  const S = getS();
  const page = pageOf(S, qid);
  const q = questById(qid) || {};
  const tracked = trackedQuestId();
  const j = journeyToNow(page, q.desc);
  const acts = questActions(page, tracked);
  const links = questLinks(q, page, CODEX_REMNANTS, codexKnown);
  const key = q.need && typeof q.need.key === 'string' ? q.need.key : null;
  const pic = key && thumbFor(key) ? { key, src: thumbFor(key) } : null;
  useEffect(() => {
    try { window.__btMenus3Quest = page ? { id: page.id, status: page.status, done: j.done.length, now: j.now ? j.now.kind : null, continues: j.continues, acts: acts.actions.map((a) => a.id), doors: acts.doors.map((d) => d.id), links: links.map((l) => l.kind + (l.id ? ':' + l.id : l.key ? ':' + l.key : '')) } : null; } catch (e) { /* no window */ }
  });
  const onTrack = () => {
    const on = trackedQuestId() !== qid;
    setTrackedQuest(on ? qid : null);
    noteUntil.current = on ? Date.now() + 5000 : 0;
    force((v) => v + 1);
  };
  const note = tracked === qid && Date.now() < noteUntil.current ? say(SAY_J, 'questJournal.trackNote') : null;
  /* the map opens OVER the panel, which stays: closing the map is back on the quest */
  const onMap = () => { showQuestOnMap(page); force((v) => v + 1); };
  const onRewards = () => menus3Bus.push('rewards', qid);
  const follow = (l) => {
    if (l.kind === 'place') { onMap(); return; }
    if (l.kind === 'monster') { menus3Away(() => openCodexMonster(l.id, getS)); return; }
    const from = (CODEX_ENTRIES[l.from] || {}).name || '';
    menus3Away(() => openItemPage({ from: 'codex', R: R || (S && S.rpg) || {}, key: l.key, kind: l.from, monster: from, drop: { key: l.key, name: ITEM_NAMES[l.key] } }));
  };
  return (
    <div className="m3-quest" data-m3-quest-page={qid}>
      <QuestPageView page={page} j={j} acts={acts} face={page ? npcPortrait(page.npc) : null} pic={pic} short={false} tight={false} note={note}
        onTrack={onTrack} onMap={onMap} onRewards={onRewards} stepsRef={stepsRef} />
      {links.length ? (
        <div className="m3-qlinks" data-m3-qlinks={links.map((l) => l.kind).join(' ')}>
          <span className="m3-counters-head">{say(SAY, 'menus3q.links')}</span>
          {links.map((l, i) => (
            <button key={i} type="button" className="u2-raised u2-ctl m3-qlink" data-m3-qlink={l.kind} data-m3-qlink-of={l.id || l.key || ''} onClick={() => follow(l)}>
              <span className="m3-row-name">{linkWord(l, page)}</span>
              <span className="u2-chev" aria-hidden="true">{'\u203A'}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** World · Quests: the panel's body for the section (Menus3Panel.jsx). */
export function Menus3Quests({ R, getS, top }) {
  if (!top) return null;
  if (top.page === 'quest') return <QuestOne key={'q' + top.arg} R={R} getS={getS} qid={top.arg} />;
  if (top.page === 'rewards') return <div className="m3-quest" data-m3-quest-rewards={top.arg}><QuestRewardsView page={pageOf(getS(), top.arg)} /></div>;
  return <QuestsRoot getS={getS} top={top} />;
}
