/* ═══ v2.3.6691: A QUEST'S OWN PAGE UNDER THE NEW DASHBOARD (card UI2-quests, the build's step 6) ═══
 *
 * The owner's master specification, 2026-11-25, part 6: "Individual quest
 * shows journey first, with completed steps and the current objective
 * visually dominant. Current task includes relevant progress and contextual
 * actions such as Track or Locate when supported. Future journey is
 * open-ended: do not reveal future steps, total step count, or whole-quest
 * completion percentage. A neutral indication that the adventure continues is
 * sufficient for an ongoing quest. Completed quests show actual completed
 * history. Story and Rewards are separate accessible destinations."  Its
 * acceptance task: "Identify the next objective in an active quest, see
 * previous steps, track it or locate it where available, without seeing
 * future steps."
 *
 * The page `questDetail` (header "Quest"), zones top to bottom:
 *   identity  the giver's face, the quest's name, its state and giver;
 *   journey   the steps behind you (a tick, their words, what the giver
 *             handed over), scrolling inside their zone, opened on the last;
 *   NOW       dominant, never behind a scroll: the thing's picture, the
 *             words, the count and its bar, the place; then one quiet line,
 *             "The adventure continues";
 *   actions   Track (a quest in hand: immediate, the phone's own), Show on
 *             map (only where the game can show the road), and the Rewards
 *             door (raised: it opens a page, `questRewards`).
 * A step still to come is never drawn, the hand-in only once the quest is
 * ready (then it IS the now), and no "Then: ..." line, no count of steps, no
 * percent.  A done quest (from Completed) is its whole history, its Rewards
 * door and the journal's "Next: ..." line; an offer (from On offer) its talk
 * to the giver as NOW.  Story is left out: the game has no story text.
 * Sideways (63 px) the steps and the name stand on the left and NOW with its
 * actions beside them.  The rules: src/game/questPages.js journeyToNow,
 * questActions, questOpens.  The quest is the frame's entry's `sel` (the
 * landing's row), else questDetailBus (the pinned card's road).
 *
 * The drawing is dash/questViews.jsx's (node renders it: tools/guards/
 * quests-ui2.test.mjs); this file reads the game and hands it over.
 * Also here: the frame's Quests pages beside it (src/game/questPages.js
 * QUEST_FRAME_PAGES): Rewards, Daily, Completed, On offer. */
import React, { useEffect, useState } from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashNavView } from '@/game/dashNav.js';
import { useClock, useRoom } from '../sheet/CharacterPage.jsx';
import { questJournalList, questJournalPage, journalCtx, questById } from '../sheet/questJournalModel.js';
import { questDetailBus } from '../sheet/questDetailBus.js';
import { npcPortrait, showQuestOnMap, useJournalTap } from './QuestJournalPage.jsx';
import { thumbFor } from './InventoryPanel.jsx';
import { DonePane, DailyPane } from './questParts.jsx';
import { QuestRow, QuestPageView, QuestRewardsView } from './questViews.jsx';   /* the drawing (node renders it) */
import { trackedQuestId, setTrackedQuest } from '@/game/trackedQuest.js';
import { deskWords } from '@/game/deskWords.js';
import { journeyToNow, questActions, questOpens, questPageSel, questPageKey, QUEST_FRAME_PAGES } from '@/game/questPages.js';
import { ui2RootClass, Ui2Empty } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/questPages.js';
import { SAY as SAY_J } from '@/data/say/questJournal.js';
import { say } from '@/game/say.js';

/** Is this one of the frame's Quests pages (BottomDashboard's framePage switch)? */
export function isQuestFramePage(id) { return QUEST_FRAME_PAGES.indexOf(String(id)) >= 0; }

/* the quest the page is about: the entry's own selection, else the bus (questPages.js questPageSel; v2.3.6691,
   the mend of sitting 71: read once per ENTRY -- QuestDetailPanel keys this page on questPageKey) */
function topEntry() { try { return dashNavView(dashboardPanelBus.nav()).top; } catch (e) { return null; } }
function selOf() { return questPageSel(topEntry(), questDetailBus.selected()); }
/** the key QuestDetailPanel draws the page under: a new entry (another quest's road) is a new page */
export function questPageAt() { return questPageKey(topEntry()); }

function pageOf(S, qid) {
  if (!qid) return null;
  try { return questJournalPage(S, qid, journalCtx(S)); } catch (e) { return null; }
}
function picOf(qid) {
  const q = qid ? questById(qid) : null;
  const key = q && q.need && typeof q.need.key === 'string' ? q.need.key : null;
  const src = key ? thumbFor(key) : null;
  return src ? { key, src } : null;
}
const pageKey = (p, tracked) => (!p ? '-' : [p.id, p.status, p.now ? p.now.text : '', p.now && p.now.count ? p.now.count.have + '/' + p.now.count.n : '', p.where ? p.where.text + (p.where.map ? '+' : '') : '', tracked].join('|'));

/** The quest's own page (BottomDashboard's PANELS `questDetail`, chosen by QuestDetailPanel.jsx under the frame). */
export function QuestPage({ getS }) {
  const [at] = useState(selOf);
  const qid = at.qid;
  const [, force] = useState(0);
  const noteUntil = React.useRef(0);
  useClock(() => pageKey(pageOf(getS(), qid), trackedQuestId() + (Date.now() < noteUntil.current ? '+note' : '')), 1000);
  const [ref, room] = useRoom();
  const stepsRef = React.useRef(null);
  const S = getS();
  const page = pageOf(S, qid);
  const tracked = trackedQuestId();
  const j = journeyToNow(page, (questById(qid) || {}).desc);
  const acts = questActions(page, tracked);
  /* the pinned card's road carries no selection: keep it on the entry, so Back finds it again */
  useEffect(() => { if (qid && !at.kept && at.key != null) dashboardPanelBus.go({ type: 'keep', key: at.key, sel: qid }); }, []);
  /* the steps behind you open on the last of them (the one next to NOW) */
  useEffect(() => {
    const box = stepsRef.current;
    try { if (box && box.lastElementChild && box.lastElementChild.scrollIntoView) box.lastElementChild.scrollIntoView({ block: 'nearest' }); } catch (e) { /* an old browser: the list is still a list */ }
  }, [page && page.id, page && page.status]);
  useEffect(() => {
    try { window.__btQuestUi2 = page ? { id: page.id, status: page.status, done: j.done.length, now: j.now ? j.now.kind : null, continues: j.continues, acts: acts.actions.map((a) => a.id), doors: acts.doors.map((d) => d.id) } : null; } catch (e) { /* no window */ }
  });
  useEffect(() => () => { try { window.__btQuestUi2 = null; } catch (e) { /* no window */ } }, []);
  const onTrack = () => {
    const on = trackedQuestId() !== qid;
    setTrackedQuest(on ? qid : null);
    noteUntil.current = on ? Date.now() + 5000 : 0;
    force((v) => v + 1);
  };
  const note = tracked === qid && Date.now() < noteUntil.current ? say(SAY_J, 'questJournal.trackNote') : null;
  const onMap = () => { showQuestOnMap(page); force((v) => v + 1); };
  const onRewards = () => { const a = questOpens({ kind: 'rewards', id: qid }); if (a) dashboardPanelBus.go(a); };
  return <QuestPageView page={page} j={j} acts={acts} face={page ? npcPortrait(page.npc) : null} pic={picOf(qid)} short={room.short} tight={!room.short && room.h > 0 && room.h < 180} note={note}
    onTrack={onTrack} onMap={onMap} onRewards={onRewards} boxRef={ref} stepsRef={stepsRef} />;
}

function QuestRewardsPage({ getS }) {
  const [at] = useState(selOf);
  useClock(() => pageKey(pageOf(getS(), at.qid), ''), 2000);
  return <QuestRewardsView page={pageOf(getS(), at.qid)} />;
}

/* Completed and On offer: a row opens that quest's page */
const openRow = (id) => {
  const a = questOpens({ kind: 'row', id });
  if (!a) return;
  questDetailBus.select(a.sel);
  dashboardPanelBus.go(a);
};

function QuestsDonePage({ getS }) {
  useClock(() => { const S = getS(); return String(questJournalList(S, journalCtx(S)).done.length); }, 2000);
  const tap = useJournalTap();
  const S = getS();
  const L = questJournalList(S, journalCtx(S));
  return (
    <div className={ui2RootClass() + ' u2-ql-page'} data-quests-ui2-done={L.done.length}>
      {L.done.length ? <DonePane L={L} tap={tap} onPick={openRow} /> : <Ui2Empty kind="absent" title={say(SAY, 'questPages.doorDone', { n: 0 })} />}
    </div>
  );
}

function QuestsOffersPage({ getS }) {
  useClock(() => { const S = getS(); return questJournalList(S, journalCtx(S)).available.map((r) => r.id).join(','); }, 2000);
  const S = getS();
  const L = questJournalList(S, journalCtx(S));
  return (
    <div className={ui2RootClass() + ' u2-ql-page'} data-quests-ui2-offers={L.available.length}>
      {L.available.length ? L.available.map((r) => (
        <QuestRow key={r.id} r={{ id: r.id, title: r.title, npc: r.npc, sub: deskWords(r.where || '') }} face={npcPortrait(r.npc)} onOpen={() => openRow(r.id)}
          hooks={{ 'data-quest-offer-row': r.id }} />
      )) : <Ui2Empty kind="absent" title={say(SAY, 'questPages.offersNone')} />}
    </div>
  );
}

/** The frame's Quests pages (BottomDashboard's framePage switch).  `S` the game's state as the
    dashboard holds it (handed, never reached for: grand plan 5.7); the pages' clocks read the newest. */
export function QuestFramePage({ id, S }) {
  const live = React.useRef(S);
  live.current = S;
  const getS = React.useCallback(() => live.current, []);
  if (id === 'questRewards') return <QuestRewardsPage getS={getS} />;
  if (id === 'questsDone') return <QuestsDonePage getS={getS} />;
  if (id === 'questsOffers') return <QuestsOffersPage getS={getS} />;
  if (id === 'questsDaily') return <div className={ui2RootClass() + ' u2-ql-page'} data-quests-ui2-daily=""><DailyPane /></div>;
  return null;
}
