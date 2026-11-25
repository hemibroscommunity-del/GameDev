/* ═══ v2.3.6620: THE QUESTS TAB IN PAGES (card QP) ═══
 *
 * The owner, 2026-11-25, of the Bro tab ("it shows "pages" where all the
 * information needs to be displayed together (instead of scrolling little by
 * little) so all related information is shown at once ... Players see the big
 * picture first and can investigate the details whenever they want"), then of
 * this one, with three mockups: "Same idea here I want the quest menu
 * redesigned to this".
 *
 * On an upright phone the tab opens on your quest, whole, with no scrolling,
 * in a band of today's height (the owner, earlier: "No don't change todays
 * dashboard height": about 190 px on an iPhone):
 *   1 QUEST    the row Active (n) | Daily | Completed with the three page
 *              marks at its end; the head (the giver's face, the quest's name,
 *              its state and giver, Track); what to do NOW (the thing's
 *              picture, the words, the count and its bar: a tap opens 2);
 *              WHERE (the pin, the place, Map: the world map's gold road, as
 *              the old page's card did); REWARDS in one row of tiles (a tap
 *              opens 3).
 *   2 JOURNEY  the head, then the steps as a line: done green with a tick
 *              (and what the giver handed over), the step in hand gold with
 *              its count and place, the ones to come grey.
 *   3 REWARDS  the head with the count, the completion rewards as tiles, and
 *              the next quest (its giver's face, name, who and where, a lock:
 *              "Available after <this quest>").
 * Pages 2 and 3 head their top row with their name (the mockups draw no tabs
 * there), the marks at its end as on page 1.  The picker of your quests
 * (Active, then Available: the head is its button when there is more than
 * one), Daily and Completed are today's lists, and may scroll.
 * Wide (the page's own box 600 px or more: a phone on its side, a tablet) the
 * three stand side by side under one head, no marks.
 *
 * The rules (what is shown, which quest, the steps' states, what a tap
 * opens) are game/questPages.js; the words are the journal's
 * (game/questJournal.js, through questJournalModel.js) and
 * data/say/questPages.js.  Read-only: taking and handing in stay with the
 * givers, in the world (owner, v2.3.1704 and v2.3.2195).
 * `?questpages=0` gives back the old page (QuestsPanel.jsx).
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { deskWords } from '@/game/deskWords.js';
import { coinArtFor } from '@/game/coinArt.js';
import { sw } from '@/game/switches.js';
import { trackedQuestId, setTrackedQuest } from '@/game/trackedQuest.js';
import { questJournalList, questJournalPage, journalCtx, questById, afterOf } from '../sheet/questJournalModel.js';
import { useJournalTap, npcPortrait, showQuestOnMap } from './QuestJournalPage.jsx';
import { useBoxSize } from './railKit.js';
import { FaceIcon, pillStyle, pillHit, DonePane, DailyPane } from './questParts.jsx';
import { thumbFor } from './InventoryPanel.jsx';
import { DailyRewardsCard } from './DailyRewardsCard.jsx';
import { dailyRewardsBus, questsLive, spinLive } from '@/game/dailyRewards.js';
import { OWNER_ICON } from '@/data/ownerIcons.js';
import { folkDisplayName } from '@/data/folkNames.js';
import {
  questPagesStart, questPagesStep, shownQuest, shownView, litTab, pagesSideBySide, pageMarks,
  journeySteps, journeyFocus, rewardTiles, pickChoices,
} from '@/game/questPages.js';
import { SAY } from '@/data/say/questPages.js';
import { SAY as SAY_J } from '@/data/say/questJournal.js';
import { SAY as SAY_Q } from '@/data/say/questsPanel.js';
import { say } from '@/game/say.js';

/* the trial is everyone's (CLAUDE.md §7: a trial becomes the default, with its switch) */
export const QUEST_PAGES = (function () { try { return !sw('questpages'); } catch (_e) { return true; } })();

/* what is shown while the game runs (the old page's lastPick, as a view) */
let lastAt = questPagesStart();
/* a road that names a quest (the pinned card's "Open quest" reaches
   QuestDetailPanel, which hands it here): its page 1 on the next mount */
let pendingOpen = null;
/** Open `qid` on page 1 the next time the tab draws (QuestDetailPanel.jsx). */
export function openQuestOnPages(qid) { pendingOpen = typeof qid === 'string' ? qid : null; }

const GREEN = '#59BF91', GREEN_TEXT = '#7FD6AC';
const STATUS_TONE = { ready: COL.accent, active: '#7FB0EC', available: COL.text2, done: GREEN, locked: COL.muted };
const TOP_H = 30, HEAD_H = 36, GAP = 3;
const CARD = {
  display: 'block', boxSizing: 'border-box', margin: 0, width: '100%',
  background: COL.raised, border: `1px solid ${COL.border}`, borderRadius: 10, color: COL.text,
  fontFamily: 'inherit', textAlign: 'left', touchAction: 'manipulation',
};
const ONE_LINE = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 };
const LABEL = { fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.accent, lineHeight: 1.1 };

/* the map pin (drawn: nothing to load), as the old page's WHERE card */
const pin = (px) => (
  <svg width={px} height={px} viewBox="0 0 20 20" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
    <path d="M10 1.8a5.6 5.6 0 0 0-5.6 5.6c0 4.1 5.6 10.8 5.6 10.8s5.6-6.7 5.6-10.8A5.6 5.6 0 0 0 10 1.8Z" fill="#D8AA58" stroke="#172126" strokeWidth="1" />
    <circle cx="10" cy="7.4" r="2.1" fill="#172126" />
  </svg>
);
/* the lock on a quest still ahead (drawn: the game has no lock picture) */
const lock = (
  <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
    <path d="M5.5 9.5V6.5a4.5 4.5 0 0 1 9 0v3" fill="none" stroke="#B9C1BF" strokeWidth="2.2" />
    <rect x="2.5" y="9.5" width="15" height="11" rx="2.5" fill="#B9C1BF" stroke="#172126" strokeWidth="1" />
    <circle cx="10" cy="15" r="1.7" fill="#172126" />
  </svg>
);

const Bar = ({ frac }) => (
  <div aria-hidden="true" style={{ height: 6, borderRadius: 3, background: COL.well, overflow: 'hidden' }}>
    {/* brass while you work on it, green once it is all there (green means done: UI-DESIGN-NOTES) */}
    <div style={{ width: `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`, height: '100%', background: frac >= 1 ? GREEN : COL.accent, borderRadius: 3 }} />
  </div>
);

/* a reward as a tile: its picture over its name (gold, the points, an item) */
const tileInner = (t, big) => {
  const px = big ? 24 : 18;
  let pic = null, word = '';
  if (t.kind === 'gold') { pic = <img src={coinArtFor(t.n)} alt="" draggable={false} style={{ width: px, height: px, objectFit: 'contain' }} />; word = say(SAY_J, 'questJournal.gold', { gold: t.n }); }
  else if (t.kind === 'ap') { pic = <span aria-hidden="true" style={{ fontSize: px - 2, lineHeight: `${px}px`, color: COL.accent }}>★</span>; word = say(SAY, 'questPages.ap', { ap: t.n }); }
  else if (t.kind === 'xp') { pic = <span aria-hidden="true" style={{ fontSize: 15, fontWeight: 800, lineHeight: `${px}px`, color: '#9DB8FA' }}>XP</span>; word = say(SAY_J, 'questJournal.xp', { xp: t.n }); }
  else { pic = t.icon ? <img src={t.icon} alt="" draggable={false} style={{ width: px, height: px, objectFit: 'contain', imageRendering: 'pixelated' }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : null; word = t.label; }
  return (
    <span key={t.kind + (t.label || t.n)} data-quest-tile={t.kind} title={word} style={{
      flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
      height: big ? 46 : 34, padding: '0 3px', boxSizing: 'border-box', borderRadius: 8, background: COL.wellSoft, border: `1px solid ${COL.tileBor}`,
    }}>
      <span style={{ height: px, display: 'flex', alignItems: 'center' }}>{pic}</span>
      <span style={{ ...ONE_LINE, maxWidth: '100%', fontSize: 13, fontWeight: 700, lineHeight: '15px', color: COL.text }}>{word}</span>
    </span>
  );
};

export const QuestPages = () => {
  const [, force] = useState(0);
  const [boxRef, boxW, boxH] = useBoxSize();
  const tap = useJournalTap();
  const [at, setAtRaw] = useState(() => lastAt);
  const [noteUntil, setNoteUntil] = useState(0);
  const setAt = (next) => { lastAt = next; setAtRaw(next); };
  const go = (t) => setAt(questPagesStep(lastAt, t));
  useEffect(() => {
    const id = setInterval(() => force((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const ctx = journalCtx(S);
  const L = questJournalList(S, ctx);
  const groupOf = (id) => (L.active.some((r) => r.id === id) ? 'active' : L.available.some((r) => r.id === id) ? 'available' : L.done.some((r) => r.id === id) ? 'done' : null);
  /* the tab opened: page 1 of the quest you are on, or of the quest a road named */
  useLayoutEffect(() => {
    const qid = pendingOpen;
    pendingOpen = null;
    setAt(questPagesStep(lastAt, qid && questById(qid) ? { kind: 'quest', id: qid, group: groupOf(qid) } : { kind: 'open' }));
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const dailyOn = !!dailyRewardsBus.get() && (questsLive() || spinLive());
  const quest = shownQuest(at, groupOf, L.focusId);
  const view = shownView(at, { quest, dailyOn, doneCount: L.done.length });
  const page = quest && (view === 'quest' || view === 'journey' || view === 'rewards') ? questJournalPage(S, quest.id, ctx) : null;
  const wide = pagesSideBySide(boxW);
  const tracked = page ? trackedQuestId() === page.id : false;
  const inHand = !!page && (page.status === 'active' || page.status === 'ready');
  const choices = pickChoices(L);
  /* a page with room for a second line (a taller band than an iPhone's) */
  const roomy = boxH >= 205;

  /* the journey opens on the step in hand (it scrolls only past four steps) */
  const stepsRef = useRef(null);
  useEffect(() => {
    const box = stepsRef.current;
    const on = box && box.querySelector('[data-step-focus="1"]');
    try { if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' }); } catch (_e) { /* an old browser: the list is still a list */ }
  }, [view, page && page.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTrack = (qid) => {
    const on = trackedQuestId() !== qid;
    setTrackedQuest(on ? qid : null);
    setNoteUntil(on ? Date.now() + 5000 : 0);
    force((v) => v + 1);
  };

  /* ── the top row: the tabs (page 1 and the lists) or the page's name (2, 3), and the marks ── */
  const lit = litTab(view, quest && quest.group);
  const tabBtn = (id, word, icon, hook) => (
    <button key={id} type="button" role="tab" aria-selected={lit === id} data-quest-tab={id} {...hook}
      {...tap(() => go({ kind: 'tab', tab: id }))} style={{
        /* each as wide as its words, the room left shared ("Completed" whole on a 375 px phone) */
        flex: '1 1 auto', minWidth: 0, height: TOP_H, margin: 0, padding: '0 6px', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        background: lit === id ? `linear-gradient(0deg, ${COL.accentFill}, ${COL.accentFill}), ${COL.wellSoft}` : COL.wellSoft,
        border: `1px solid ${lit === id ? COL.accent : COL.tileBor}`, borderRadius: 9,
        color: lit === id ? COL.accent : COL.text, fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
      }}>
      {icon}
      <span style={ONE_LINE}>{word}</span>
    </button>
  );
  const tabs = (
    <div role="tablist" aria-label={say(SAY, 'questPages.tabsAria')} style={{ flex: 1, minWidth: 0, display: 'flex', gap: 4 }}>
      {tabBtn('active', say(SAY, 'questPages.tabActive', { n: L.active.length }), null, {})}
      {dailyOn ? tabBtn('daily', say(SAY, 'questPages.tabDaily'),
        <img src={OWNER_ICON.prizeWheel.src} alt="" draggable={false} style={{ width: 16, height: 16, objectFit: 'contain', flex: 'none' }} />, { 'data-quest-nav': 'daily' }) : null}
      {tabBtn('done', say(SAY, 'questPages.tabDone'), <span aria-hidden="true" style={{ color: GREEN_TEXT, flex: 'none' }}>✓</span>, { 'data-quest-nav': 'done' })}
    </div>
  );
  const MARK_WORD = { quest: 'questPages.markQuest', journey: 'questPages.markJourney', rewards: 'questPages.markRewards' };
  const marks = !wide && page ? (
    <div role="tablist" aria-label={say(SAY, 'questPages.marksAria')} data-quest-marks="" style={{ flex: 'none', display: 'flex', alignItems: 'center' }}>
      {pageMarks(view).map((m) => (
        <button key={m.page} type="button" role="tab" aria-selected={m.lit} aria-label={say(SAY, MARK_WORD[m.page])} title={say(SAY, MARK_WORD[m.page])}
          data-quest-mark={m.page} data-lit={m.lit ? '1' : '0'} {...tap(() => go({ kind: 'mark', page: m.page }))} style={{
            width: 26, height: TOP_H, margin: 0, padding: 0, background: 'transparent', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation',
          }}>
          <span aria-hidden="true" style={{
            display: 'block', width: m.lit ? 16 : 10, height: 10, borderRadius: 5, boxSizing: 'border-box',
            background: m.lit ? COL.accent : COL.wellSoft, border: `1px solid ${m.lit ? COL.accent : COL.borderStrong}`,
          }} />
        </button>
      ))}
    </div>
  ) : null;
  const pageName = (key) => (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span data-quest-page-name="" style={{ ...LABEL, ...ONE_LINE, fontSize: 14 }}>{say(SAY, key)}</span>
      <span aria-hidden="true" style={{ flex: 1, height: 1, background: COL.accent, opacity: 0.55 }} />
    </div>
  );
  const top = (word) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: TOP_H, flex: 'none' }}>
      {word ? pageName(word) : tabs}
      {marks}
    </div>
  );

  /* ── the head: the giver's face, the name, the state and giver, Track (the picker's button when there is a choice) ── */
  const head = (withCount) => {
    if (!page) return null;
    const face = npcPortrait(page.npc);
    const giver = folkDisplayName(page.npc) || '';
    const note = inHand && tracked && Date.now() < noteUntil;
    const pickable = choices > 1;
    const who = (
      <>
        {face ? (
          <img data-journal-face={page.npc || ''} src={face} alt={giver} draggable={false} style={{
            width: 34, height: 34, flex: 'none', objectFit: 'contain', imageRendering: 'pixelated',
            borderRadius: 8, background: COL.well, border: `1px solid ${COL.borderStrong}`, boxSizing: 'border-box',
          }} />
        ) : null}
        <span style={{ flex: 1, minWidth: 0, display: 'block', textAlign: 'left' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <span data-journal-title="" style={{ ...ONE_LINE, fontSize: 16, fontWeight: 800, lineHeight: '18px', color: COL.text }}>{page.title}</span>
            {pickable ? <span aria-hidden="true" data-quest-picker-mark="" style={{ flex: 'none', fontSize: 13, color: COL.accent }}>▾</span> : null}
          </span>
          {note ? (
            /* v2.3.3522: what tracking does, said when it is turned on */
            <span data-quest-track-note="" style={{ ...ONE_LINE, display: 'block', fontSize: 13, lineHeight: '15px', color: COL.text2 }}>{say(SAY_J, 'questJournal.trackNote')}</span>
          ) : (
            <span style={{ ...ONE_LINE, display: 'block', fontSize: 13, lineHeight: '15px' }}>
              <span data-journal-status-word="" style={{ fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: STATUS_TONE[page.status] || COL.text2 }}>{page.statusLabel}</span>
              {giver ? <span style={{ fontWeight: 600, color: COL.text2 }}>{' · ' + giver}</span> : null}
            </span>
          )}
        </span>
      </>
    );
    const count = withCount && page.now && page.now.count ? page.now.count : null;
    return (
      <div data-journal-head="" style={{ display: 'flex', alignItems: 'center', gap: 6, height: HEAD_H, flex: 'none' }}>
        {pickable ? (
          <button type="button" data-quest-picker="open" aria-label={say(SAY, 'questPages.pickAria')} {...tap(() => go({ kind: 'head', choices }))} style={{
            flex: 1, minWidth: 0, height: HEAD_H, margin: 0, padding: 0, display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 'none', color: COL.text, fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
          }}>{who}</button>
        ) : <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{who}</div>}
        {count ? (
          <span data-quest-head-count={count.have + '/' + count.n} style={{ flex: 'none', fontSize: 17, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: count.have >= count.n ? GREEN_TEXT : COL.text, padding: '0 4px' }}>
            {count.have + '/' + count.n}
          </span>
        ) : null}
        {inHand ? (
          <button type="button" data-quest-track={tracked ? 'on' : 'off'} aria-pressed={tracked}
            aria-label={say(SAY_J, tracked ? 'questJournal.trackStopAria' : 'questJournal.trackThis')} title={say(SAY_J, tracked ? 'questJournal.trackStop' : 'questJournal.trackThis')}
            {...tap(() => toggleTrack(page.id))} style={{
              flex: 'none', width: 56, height: HEAD_H, margin: 0, padding: 0, boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: tracked ? COL.accentFill : COL.wellSoft, border: `1px solid ${tracked ? COL.accent : COL.borderStrong}`, borderRadius: 10,
              color: tracked ? COL.accent : COL.text, fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
            }}>
            <span aria-hidden="true" style={{ fontSize: 15, lineHeight: '15px', color: COL.accent }}>{tracked ? '★' : '☆'}</span>
            <span style={{ fontSize: 13, fontWeight: 800, lineHeight: '15px' }}>{say(SAY_J, 'questJournal.trackButton')}</span>
          </button>
        ) : null}
      </div>
    );
  };

  /* ── page 1's blocks ── */
  const nowBlock = () => {
    const now = page && page.now;
    if (!now) return null;
    const q = questById(page.id);
    const key = q && q.need && typeof q.need.key === 'string' ? q.need.key : null;
    const thumb = key ? thumbFor(key) : null;
    const c = now.count;
    const words = deskWords(now.text);
    return (
      <button type="button" data-journal="now" data-journal-card="" data-quest-to="journey" aria-label={say(SAY, 'questPages.nowAria', { now: words })}
        {...tap(() => go({ kind: 'now' }))} style={{ ...CARD, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '3px 8px', cursor: 'pointer' }}>
        {thumb ? <img data-quest-now-pic={key} src={thumb} alt="" draggable={false} style={{ width: 28, height: 28, flex: 'none', objectFit: 'contain', imageRendering: 'pixelated' }} /> : null}
        <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span data-journal-now="" style={{
              flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 800, lineHeight: '18px', color: page.status === 'done' ? GREEN_TEXT : COL.accent,
              ...(roomy || !c ? { display: '-webkit-box', WebkitLineClamp: roomy ? 2 : 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : ONE_LINE),
            }}>{words}</span>
            {c ? <span data-journal-count={c.have + '/' + c.n} title={c.text} style={{ flex: 'none', fontSize: 15, fontWeight: 800, color: c.have >= c.n ? GREEN_TEXT : COL.text, fontVariantNumeric: 'tabular-nums' }}>{c.have + '/' + c.n}</span> : null}
          </span>
          {c ? <span style={{ display: 'block', marginTop: 3 }}><Bar frac={c.have / c.n} /></span> : null}
        </span>
      </button>
    );
  };
  const whereBlock = () => {
    const where = page && page.where;
    if (!where) return null;
    const words = deskWords(where.text);
    const inner = (
      <>
        {pin(16)}
        <span data-journal-where="" style={{ ...ONE_LINE, flex: 1, fontSize: 14, fontWeight: 600, color: COL.text }}>{words}</span>
      </>
    );
    if (!where.map) {
      return <div data-journal="where" data-journal-card="" aria-label={say(SAY_J, 'questJournal.whereAria', { where: words })} style={{ ...CARD, flex: 'none', display: 'flex', alignItems: 'center', gap: 7, height: 28, padding: '0 8px' }}>{inner}</div>;
    }
    /* the whole row is Show on map (the old page's WHERE card), the Map chip says so */
    return (
      <button type="button" data-journal="where" data-journal-card="" data-journal-map={page.id} aria-label="Show on map" title={say(SAY_J, 'questJournal.whereTip', { where: words })}
        {...tap(() => showQuestOnMap(page))} style={{ ...CARD, flex: 'none', display: 'flex', alignItems: 'center', gap: 7, height: 28, padding: '0 3px 0 8px', cursor: 'pointer' }}>
        {inner}
        <span aria-hidden="true" style={{
          flex: 'none', display: 'flex', alignItems: 'center', height: 22, padding: '0 12px', borderRadius: 999,
          background: COL.accentFill, border: `1px solid ${COL.accent}`, color: COL.accent, fontSize: 13, fontWeight: 800,
        }}>{say(SAY_J, 'questJournal.mapChip')}</span>
      </button>
    );
  };
  const rewardRow = () => {
    const tiles = rewardTiles(page && page.reward);
    if (!tiles.length) return null;
    return (
      <button type="button" data-journal="reward" data-journal-card="" data-quest-to="rewards" aria-label={say(SAY, 'questPages.rewardsAria')} title={page.reward.note}
        {...tap(() => go({ kind: 'rewards' }))} style={{ ...CARD, flex: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 3px 2px 8px', cursor: 'pointer' }}>
        <span style={{ ...LABEL, flex: 'none', paddingRight: 6, borderRight: `1px solid ${COL.divider}`, marginRight: 2 }}>{say(SAY, 'questPages.rewards')}</span>
        {tiles.map((t) => tileInner(t, false))}
      </button>
    );
  };

  /* ── page 2: the journey ── */
  const journey = () => {
    const steps = journeySteps(page, (questById(page.id) || {}).desc);
    const focus = journeyFocus(steps);
    const npc = folkDisplayName(page.npc) || '';
    const two = steps.length <= 3 || roomy;   /* the step in hand gets its place and count on a line of its own */
    return (
      <div ref={stepsRef} data-quest-steps={page.id} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
        {steps.map((s, i) => {
          const col = s.state === 'done' ? GREEN_TEXT : s.state === 'current' ? COL.accent : COL.muted;
          const text = deskWords(s.text || (s.kind === 'handin' ? say(SAY, 'questPages.handIn', { npc }) : ''));
          const sub = s.state === 'current' && two ? [s.where, s.count].filter(Boolean).join(' · ') : '';
          return (
            <div key={i} data-step-state={s.state} data-step-kind={s.kind} data-step-focus={i === focus ? '1' : undefined} style={{ display: 'flex', alignItems: 'stretch', gap: 6, flex: 'none' }}>
              {/* the line: a circle a step, joined (green below a done one) */}
              <span aria-hidden="true" style={{ position: 'relative', flex: 'none', width: 20 }}>
                {i > 0 ? <span style={{ position: 'absolute', left: 9, top: -GAP, height: `calc(50% + ${GAP}px)`, width: 2, background: steps[i - 1].state === 'done' ? GREEN : COL.borderStrong }} /> : null}
                {i < steps.length - 1 ? <span style={{ position: 'absolute', left: 9, top: '50%', bottom: 0, width: 2, background: s.state === 'done' ? GREEN : COL.borderStrong }} /> : null}
                <span style={{
                  position: 'absolute', left: 1, top: 'calc(50% - 9px)', width: 18, height: 18, borderRadius: 9, boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, lineHeight: 1, color: '#10222A',
                  background: s.state === 'done' ? GREEN : COL.well, border: `2px solid ${s.state === 'done' ? GREEN : s.state === 'current' ? COL.accent : COL.borderStrong}`,
                }}>{s.state === 'done' ? '✓' : ''}</span>
              </span>
              <span style={{
                flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, minHeight: 26, padding: '2px 8px', boxSizing: 'border-box', borderRadius: 9,
                background: s.state === 'current' ? `linear-gradient(0deg, ${COL.accentFill}, ${COL.accentFill}), ${COL.raised}` : COL.raised,
                border: `1px solid ${s.state === 'done' ? 'rgba(89, 191, 145, 0.45)' : s.state === 'current' ? COL.accent : COL.border}`,
              }}>
                <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
                  <span data-step-text="" title={s.sub || undefined} style={{ ...ONE_LINE, display: 'block', fontSize: 14, fontWeight: 800, lineHeight: '18px', color: col }}>{text}</span>
                  {sub ? <span style={{ ...ONE_LINE, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, lineHeight: '16px', color: COL.text2 }}>{s.where ? pin(13) : null}<span style={ONE_LINE}>{deskWords(sub)}</span></span> : null}
                </span>
                {/* what the giver handed over, by its pictures (the mockup's "Received") */}
                {s.items && s.items.length ? s.items.map((it, k) => (it.icon ? <img key={k} src={it.icon} alt={it.label} title={it.label} draggable={false} style={{ width: 20, height: 20, flex: 'none', objectFit: 'contain', imageRendering: 'pixelated', borderRadius: 4, background: COL.well }} /> : null)) : null}
                {s.state === 'current' && page.now && page.now.count ? <span style={{ flex: 'none', fontSize: 15, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>{page.now.count.have + '/' + page.now.count.n}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  /* ── page 3: the rewards and what comes next ── */
  const completion = () => {
    const tiles = rewardTiles(page.reward);
    return (
      <div data-journal="reward-all" title={page.reward.note} style={{ display: 'flex', gap: 4, flex: 'none' }}>
        {tiles.map((t) => tileInner(t, true))}
      </div>
    );
  };
  const nextBlock = () => {
    const after = page.status === 'done' || page.status === 'locked' ? null : afterOf(S, page.id);
    const label = <span style={{ ...LABEL, flex: 'none', width: 44, lineHeight: '15px' }}>{say(SAY, 'questPages.next')}</span>;
    if (after && after.npc && after.title) {
      const face = npcPortrait(after.npc);
      const meet = after.meet || '';
      return (
        <div data-journal="next" data-journal-card="" data-quest-next={after.title} aria-label={deskWords(page.next ? page.next.text : '')} style={{ ...CARD, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '3px 8px' }}>
          {label}
          {face ? <img src={face} alt="" draggable={false} style={{ width: 34, height: 34, flex: 'none', objectFit: 'contain', imageRendering: 'pixelated', borderRadius: 8, background: COL.well, border: `1px solid ${COL.borderStrong}`, boxSizing: 'border-box' }} /> : null}
          <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
            <span data-quest-next-title="" style={{ ...ONE_LINE, display: 'block', fontSize: 15, fontWeight: 800, lineHeight: '17px', color: COL.text }}>{after.title}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
              {pin(13)}
              <span style={{ ...ONE_LINE, fontSize: 13, lineHeight: '15px', color: COL.text2 }}>{folkDisplayName(after.npc) + (meet ? ' · ' + meet : '')}</span>
            </span>
            <span data-quest-next-after="" style={{ ...ONE_LINE, display: 'block', fontSize: 13, lineHeight: '15px', fontStyle: 'italic', color: COL.text2 }}>{say(SAY, 'questPages.nextAfter', { title: page.title })}</span>
          </span>
          {lock}
        </div>
      );
    }
    /* a quest already in hand, or nothing more: the journal's own line */
    return (
      <div data-journal="next" data-journal-card="" style={{ ...CARD, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
        {label}
        <span data-journal-next="" style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, lineHeight: '17px', color: COL.text, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{deskWords(page.next ? page.next.text : '')}</span>
      </div>
    );
  };

  /* ── what is drawn ── */
  /* a band too short for any page whole (a phone on its side: about 80 px):
     the pages stand at their own height and the whole scrolls, as the old page did */
  const short = wide && boxH > 0 && boxH < 150;
  const col = (name, children) => (
    <div data-quest-page={name} style={short ? { flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: GAP }
      : { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: GAP, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
      {children}
    </div>
  );
  const rootStyle = { ...panelStyle, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: GAP, padding: '2px 4px 0', WebkitMaskImage: 'none', maskImage: 'none' };
  const hooks = { 'data-quest-view': view, 'data-quest-open': quest ? quest.id : '' };

  if (page && wide) {
    /* side by side: one head over the three (each whole where the band is
       tall enough; a phone on its side's band is about 80 px, so there the
       whole scrolls, as the old page did) */
    return (
      <div ref={boxRef} data-quests-page="pages-wide" {...hooks} style={short ? { ...rootStyle, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y' } : rootStyle}>
        {short ? null : top(null)}
        <div data-journal-focus={page.id} data-journal-page={page.id} data-journal-status={page.status} style={{ display: 'flex', flexDirection: 'column', gap: GAP, flex: short ? 'none' : 1, minHeight: 0 }}>
          {/* the short band: the head and the tabs on one row, so a page starts under them */}
          {short ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1, minWidth: 0 }}>{head(false)}</div><div style={{ flex: 1, minWidth: 0 }}>{top(null)}</div></div> : head(false)}
          <div style={{ display: 'flex', gap: 8, flex: short ? 'none' : 1, minHeight: 0, paddingBottom: short ? 8 : 0 }}>{/* the three pages */}
            {col('quest', <>{nowBlock()}{whereBlock()}</>)}
            {col('journey', journey())}
            {col('rewards', <>{completion()}{nextBlock()}</>)}
          </div>
        </div>
      </div>
    );
  }
  if (page) {
    return (
      <div ref={boxRef} data-quests-page="pages" {...hooks} style={rootStyle}>
        {top(view === 'journey' ? 'questPages.journey' : view === 'rewards' ? 'questPages.completion' : null)}
        <div data-journal-focus={page.id} data-journal-page={page.id} data-journal-status={page.status} style={{ display: 'flex', flexDirection: 'column', gap: GAP, flex: 1, minHeight: 0 }}>
          {head(view === 'rewards')}
          {view === 'journey' ? col('journey', journey())
            : view === 'rewards' ? col('rewards', <>{completion()}{nextBlock()}</>)
              : col('quest', <>{nowBlock()}{whereBlock()}{rewardRow()}</>)}
        </div>
      </div>
    );
  }

  /* the lists: the picker, Completed, Daily (they may scroll) */
  let list;
  if (view === 'pick') {
    const pill = (r, group) => (
      <button key={r.id} type="button" {...(group === 'active'
        ? { 'data-quest-row': r.id, 'data-quest-row-ready': r.ready ? '1' : '0', 'data-quest-row-track': r.tracked ? 'on' : 'off' }
        : { 'data-quest-offer-row': r.id })}
        title={r.title} {...tap(() => go({ kind: 'choose', id: r.id, group }))} style={pillHit(false)}>
        <span data-quest-pill="" style={{ ...pillStyle(quest && quest.id === r.id, r.ready), width: '100%' }}>
          <FaceIcon npc={r.npc} kind={group === 'available' ? 'offer' : r.tracked ? 'tracked' : r.ready ? 'ready' : 'waiting'} />
          <span style={{ ...ONE_LINE, flex: 1, fontSize: 14 }}>{r.title}</span>
        </span>
      </button>
    );
    list = (
      <div data-quest-pane="pick">
        <button type="button" data-quest-back="pick" {...tap(() => go({ kind: 'back' }))} style={{
          display: 'flex', alignItems: 'center', gap: 4, minHeight: 36, margin: 0, padding: '0 10px 0 2px', background: 'transparent', border: 'none',
          color: COL.accent, fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
        }}><span aria-hidden="true">◂</span>{' '}{say(SAY, 'questPages.back')}</button>
        {L.active.length ? <div style={{ ...LABEL, padding: '2px 2px 0' }}>{say(SAY, 'questPages.pickActive')}</div> : null}
        {L.active.map((r) => pill(r, 'active'))}
        {L.available.length ? <div style={{ ...LABEL, padding: '6px 2px 0' }}>{say(SAY, 'questPages.pickAvailable')}</div> : null}
        {L.available.map((r) => pill(r, 'available'))}
      </div>
    );
  } else if (view === 'daily') {
    list = <DailyPane />;
  } else if (view === 'done') {
    list = <DonePane L={L} tap={tap} onPick={(id) => go({ kind: 'choose', id, group: 'done' })} />;
  } else {
    list = (
      <div data-quest-pane="none">
        <div style={{ padding: '12px 6px', color: COL.text2, fontSize: 15, lineHeight: 1.45 }}>{say(SAY_Q, 'questsPanel.none')}</div>
        {dailyOn ? <DailyRewardsCard /> : null}
      </div>
    );
  }
  return (
    <div ref={boxRef} data-quests-page="pages" {...hooks} style={rootStyle}>
      {top(null)}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y', paddingBottom: 12 }}>{list}</div>
    </div>
  );
};
