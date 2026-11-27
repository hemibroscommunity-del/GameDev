import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3615: "tap" reads "click" on a computer */
import { GROUND_PATH } from '@/game/questTrailStyle.js'; /* v2.3.2896; v2.3.2992 GROUND_PATH */
import { DailyRewardsCard } from './DailyRewardsCard.jsx'; /* v2.3.3140: the way into the daily quests and the season */
import { trackedQuestId, setTrackedQuest } from '@/game/trackedQuest.js';
import { questJournalList, questJournalPage, journalCtx } from '../sheet/questJournalModel.js';   /* v2.3.3944: the journal */
import { QuestJournalPage, useJournalTap } from './QuestJournalPage.jsx';
import { useBoxSize, sideBySide, FOOT_FADE, railHeading } from './railKit.js';   /* v2.3.4394: a list beside what it opens */
/* v2.3.6620 (card QP): the pills, the quest path switch, Done and Daily are questParts.jsx's, shared with the pages */
import { PathSwitch, FaceIcon, PinIcon, pillStyle, pillHit, DonePane, DailyPane } from './questParts.jsx';
import { QuestPages, QUEST_PAGES } from './QuestPages.jsx';
import { QuestsLanding } from './QuestsLanding.jsx';   /* v2.3.6691: the frame's landing (card UI2-quests) */
import { ui2FrameOn } from '../ui2Frame.js';   /* v2.3.6620: the Quests tab in pages; `?questpages=0` this page */
import { dailyRewardsBus, questsLive, spinLive } from '@/game/dailyRewards.js';
import { SAY } from '@/data/say/questsPanel.js';   /* v2.3.6350: its words, in the one table (docs/specs/player-words.md, W1) */
import { say } from '@/game/say.js';

/* v2.3.1265: Quests — read-only quest log (accepting/turning-in stays
   with the NPCs; server-authoritative flow untouched).
   v2.3.1298 (ChatGPT round-5, owner-approved): a sticky segmented control
   (Active · Available · Completed) -- until v2.3.3944, below.

   ═══ v2.3.3944: THE QUEST JOURNAL ═══
   The owner, 2026-11-02: "Make the 'quest' button in the menu actually
   useful.  Right now it's just a confusing menu with barely any utility and
   it's not very easy to read.  Make it a place that makes it clear which
   quest they are on, what's required, where to go, who was talked to and
   what to do next, etc. show rewards preview, what was handed during the
   quest too.  Also keep track of achievement points gained from each quest."
   The tabs hid two thirds of the answer behind a tap each, and the rows were
   12-13 px lines a phone could barely read.  So the page now OPENS on the
   quest you are on -- the one you track, else the newest one in hand, else
   the next one someone has for you -- drawn in full (QuestJournalPage: NOW,
   WHERE, WHO, GIVEN TO YOU, REWARD, NEXT), and under it the whole log in
   one scroll: the points your quests have paid, Active (the tracked one
   first, each with its own ★ Track toggle), Available (who has one for you,
   and where: every giver with an offer, as the gold "!" on the maps shows
   them, the tour's suggestion first), and Done (each with its +5 AP).  A row
   opens that quest's own page (QuestDetailPanel), as before.
   The words are game/questJournal.js's (docs/specs/quest-journal.md). */

/* ═══ v2.3.4394: A MENU, NOT A SCROLL ═══
   The owner, 2026-11-09: "The quests page actually needs to be reorganized as
   a useful menu interface.  Right now everything scrolls too long and it's
   not a good quest management system.  It needs to be able to help you
   navigate active quests, next steps, locations, etc easily on a mobile
   device."

   v2.3.3944's journal answered every question, but as ONE column: the points,
   a whole quest's six parts (about 700 px of them), the daily card, then the
   Active, Available and Done lists -- in a band about 190 px tall.  To reach
   your second quest you scrolled past all of the first.

   NOW it is the Leaderboards' shape (v2.3.4393, the owner: "This is looking
   good"): YOUR QUESTS ARE A LIST of pills down the left, and the one that is
   lit is OPEN beside it.
     the list   Active (the giver's grey "?" pin, his gold ring and tick once
                it is ready to hand in, a brass star on the one you track),
                Available (the gold "!"), then More: Done with its count, and
                Daily rewards.  It scrolls by itself, each pill a 44 px
                target.
     the quest  QuestJournalPage `brief`: the title and status with MAP and
                TRACK beside them, then what to do NOW with its count and
                bar, then WHERE -- all on screen at once on a phone -- and
                WHO, the steps, GIVEN TO YOU, REWARD and NEXT a scroll below.
     Done       the points your quests have paid, then each one handed in
                with its +5 AP; a tap opens it, "Done quests" comes back.
     Daily      the daily rewards card (its window opens from it).
   It opens on the quest you are on (the tracked one, else the newest in
   hand, else the first on offer), as it did; a quest you pick stays open
   until it changes hands (taken, handed in), when the page goes back to the
   one you are on.  Where the page is too narrow or too short for the two
   side by side, the list is one row of pills over the quest (railKit.js).
   A pill is a quest's whole title where it fits and its start where it does
   not: the full title heads the page beside it.
   QuestDetailPanel (a quest opened from the pinned card in the world) is as
   it was. */

const EmptyLine = ({ text }) => (
  <div style={{ padding: '12px 6px', color: COL.text2, fontSize: 15, lineHeight: 1.45 }}>{text}</div>
);

/* the list's width (140: a title of about thirteen letters whole beside its
   giver's face), the least page it stands beside the quest on, and the least
   height (three pills at once) */
const RAIL_W = 140;
const SIDE_MIN_W = 340;
const SIDE_MIN_H = 140;

/* what is open while the game is: { id, group } of a quest picked by hand
   (dropped when the quest changes hands), or '@done' / '@daily' */
let lastPick = null;

const OldQuestsPanel = ({ getS }) => {
  const [, force] = useState(0);
  const [boxRef, boxW, boxH] = useBoxSize();
  const tap = useJournalTap();
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getS();
  const ctx = journalCtx(S);
  const L = questJournalList(S, ctx);
  const groupOf = (id) => (L.active.some((r) => r.id === id) ? 'active' : L.available.some((r) => r.id === id) ? 'available' : L.done.some((r) => r.id === id) ? 'done' : null);
  /* the daily rewards card draws only against a worker with them (its own rule) */
  const dailyOn = !!dailyRewardsBus.get() && (questsLive() || spinLive());

  /* ── what is open ── */
  const [pick, setPickRaw] = useState(() => lastPick);
  const setPick = (p) => { lastPick = p; setPickRaw(p); };
  let open = pick;
  if (open === '@daily' && !dailyOn) open = null;
  if (open && typeof open === 'object' && groupOf(open.id) !== open.group) open = null;   /* it changed hands: back to the quest you are on */
  if (!open) open = L.focusId ? { id: L.focusId, group: groupOf(L.focusId) } : (L.done.length ? '@done' : null);
  const openId = open && typeof open === 'object' ? open.id : null;
  const page = openId ? questJournalPage(S, openId, ctx) : null;
  const lit = open === '@done' || (open && open.group === 'done') ? '@done' : open === '@daily' ? '@daily' : openId;
  const pickQuest = (id) => setPick({ id, group: groupOf(id) });

  const side = sideBySide(boxW, boxH, SIDE_MIN_W, SIDE_MIN_H);
  /* the pill of what is open is on screen in the list: the page opens on the
     quest you are on, which may be far down it */
  const navRef = useRef(null);
  useEffect(() => {
    const nav = navRef.current;
    const on = nav && nav.querySelector('[data-quest-lit="1"]');
    try { if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_e) { /* an old browser: the list is still a list */ }
  }, [lit, side]);

  const toggleTrack = (qid) => { setTrackedQuest(trackedQuestId() === qid ? null : qid); force((v) => v + 1); };

  /* ── the list ──  (`pill` and `sec` are plain functions, never components
     made in this render: the page redraws every second, and a button that
     was a new component each time would be taken away from under a finger
     between its press and its lift) */
  const pill = ({ id, hook, icon, npc, label, title, count, warm }) => (
    <button key={id} type="button" role="tab" aria-selected={lit === id} data-quest-lit={lit === id ? '1' : undefined} title={title || label}
      {...hook} {...tap(() => (id === '@done' || id === '@daily' ? setPick(id) : pickQuest(id)))} style={pillHit(!side)}>
      <span data-quest-pill="" style={Object.assign({}, pillStyle(lit === id, warm), { width: side ? '100%' : 'auto', maxWidth: side ? undefined : 220 })}>
        {npc ? <FaceIcon npc={npc} kind={icon} /> : <PinIcon kind={icon} px={18} />}
        <span style={{ minWidth: 0, flex: side ? 1 : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        {count != null ? <span style={{ flex: 'none', fontSize: 13, fontWeight: 800, color: lit === id ? COL.accent : COL.text2, fontVariantNumeric: 'tabular-nums' }}>{count}</span> : null}
      </span>
    </button>
  );
  /* a heading headlines its section (railKit railHeading: brass, with a rule) */
  let secN = 0;
  const sec = (word) => <div key={'s:' + word} data-quest-sec={word} aria-hidden={side ? undefined : 'true'} style={railHeading(!side, secN++ === 0)}>{word}</div>;
  const list = [
    L.active.length ? sec(say(SAY, 'questsPanel.secActive')) : null,
    ...L.active.map((r) => pill({
      id: r.id, npc: r.npc, label: r.title, title: r.title + ': ' + deskWords(r.line),
      icon: r.tracked ? 'tracked' : r.ready ? 'ready' : 'waiting', warm: r.ready,
      hook: { 'data-quest-row': r.id /* v2.3.3522: mp-trackquest */, 'data-quest-row-ready': r.ready ? '1' : '0', 'data-quest-row-track': r.tracked ? 'on' : 'off' },
    })),
    L.available.length ? sec(say(SAY, 'questsPanel.secAvailable')) : null,
    ...L.available.map((r) => pill({ id: r.id, npc: r.npc, label: r.title, title: r.title + ': ' + r.where, icon: 'offer', hook: { 'data-quest-offer-row': r.id } })),
    (L.done.length || dailyOn) ? sec(say(SAY, 'questsPanel.secMore')) : null,
    L.done.length ? pill({ id: '@done', label: say(SAY, 'questsPanel.done'), count: L.done.length, icon: 'done', hook: { 'data-quest-nav': 'done' } }) : null,
    dailyOn ? pill({ id: '@daily', label: say(SAY, 'questsPanel.daily'), title: say(SAY, 'questsPanel.dailyTip'), icon: 'daily', hook: { 'data-quest-nav': 'daily' } }) : null,
  ];

  /* ── what the lit pill opens ── */
  let pane;
  if (open === '@daily') {
    pane = <DailyPane />;
  } else if (open === '@done') {
    /* v2.3.6620: the list is questParts.jsx's (the pages' Completed draws it too) */
    pane = <DonePane L={L} tap={tap} onPick={pickQuest} />;
  } else if (page) {
    pane = (
      <div data-journal-focus={page.id} data-quest-pane="quest">
        {open.group === 'done' ? (
          <button type="button" data-quest-back="done" {...tap(() => setPick('@done'))} style={{
            display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, margin: 0, padding: '0 10px 0 2px', background: 'transparent', border: 'none',
            color: COL.accent, fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
          }}><span aria-hidden="true">◂</span>{' '}{say(SAY, 'questsPanel.doneBack')}</button>
        ) : null}
        <QuestJournalPage page={page} brief track={{ onToggle: toggleTrack }} />
      </div>
    );
  } else {
    pane = (
      <div data-quest-pane="none">
        <EmptyLine text={say(SAY, 'questsPanel.none')} />
        {dailyOn ? <DailyRewardsCard /> : null}
        {GROUND_PATH && L.done.length === 0 ? <PathSwitch /> : null}
      </div>
    );
  }

  if (!side) {
    /* the narrow or short page: the list is one row of pills over the quest */
    return (
      <div ref={boxRef} data-quests-page="chips" data-quest-open={lit || ''} style={{ ...panelStyle, overflowY: 'auto' }}>
        <div ref={navRef} data-quest-chips="" role="tablist" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, overflowX: 'auto', padding: '2px 0' }}>
          {list}
        </div>
        <div style={{ paddingBottom: 26 }}>{pane}</div>
      </div>
    );
  }
  return (
    <div ref={boxRef} data-quests-page="list" data-quest-open={lit || ''} style={{
      ...panelStyle, overflow: 'hidden', display: 'flex', padding: '2px 4px 0',
      /* each side fades at its own foot: the page itself does not scroll */
      WebkitMaskImage: 'none', maskImage: 'none',
    }}>
      <div ref={navRef} data-quest-rail="" role="tablist" aria-label={say(SAY, 'questsPanel.listAria')} aria-orientation="vertical" style={{
        flex: 'none', width: RAIL_W, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y',
        padding: '0 4px 18px 0', boxSizing: 'border-box', borderRight: `1px solid ${COL.divider}`,
        WebkitMaskImage: FOOT_FADE, maskImage: FOOT_FADE,
      }}>
        {list}
      </div>
      <div data-quest-detail="" role="tabpanel" style={{
        flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y',
        /* a short fade (8 px, not the list's 18): the WHERE card ends at the
           pane's foot on a phone, and must not be read through a fade */
        padding: '2px 2px 12px 6px', boxSizing: 'border-box',   /* 2 px on top: the Track button overhangs its head row by that */
        WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 8px), transparent)', maskImage: 'linear-gradient(180deg, #000 calc(100% - 8px), transparent)',
      }}>
        {pane}
      </div>
    </div>
  );
};

/* ═══ v2.3.6620: THE QUESTS TAB IN PAGES (card QP) ═══
   The owner, 2026-11-25: "Same idea here I want the quest menu redesigned to
   this" (three mockups: the quest, its journey, its rewards and what is
   next, each whole with no scrolling).  The pages are QuestPages.jsx (their
   rules game/questPages.js); `?questpages=0` gives back the page above,
   the list beside the quest (v2.3.4394), as it was. */
/* the page's one reader of the game, handed to whichever page draws (the open hand: grand plan 5.7) */
/* v2.3.6691 (card UI2-quests): under the new dashboard the landing, your quests as rows (QuestsLanding.jsx);
   today's tab only under `?ui2=0`, where `?questpages=0` still gives the older list.  Chosen at render, by the
   frame's ONE switch (tools/guards/quests-mount.test.mjs follows it by the syntax tree) */
export const QuestsPanel = () => (ui2FrameOn() ? <QuestsLanding getS={getState} /> : QUEST_PAGES ? <QuestPages getS={getState} /> : <OldQuestsPanel getS={getState} />);
