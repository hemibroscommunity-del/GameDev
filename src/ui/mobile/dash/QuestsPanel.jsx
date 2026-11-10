import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3615: "tap" reads "click" on a computer */
import { TRAIL_STYLES, isTrailOff, getShownTrailStyle, setTrailShown, GROUND_PATH } from '@/game/questTrailStyle.js'; /* v2.3.2896; v2.3.2992 GROUND_PATH */
import { useScrollTap } from '../sheet/scrollTap.js'; /* v2.3.2896: the switch sits in a scroller */
import { DailyRewardsCard } from './DailyRewardsCard.jsx'; /* v2.3.3140: the way into the daily quests and the season */
import { trackedQuestId, setTrackedQuest } from '@/game/trackedQuest.js';
import { questJournalList, questJournalPage, journalCtx } from '../sheet/questJournalModel.js';   /* v2.3.3944: the journal */
import { apTotalText } from '@/game/questJournal.js';
import { QuestJournalPage, useJournalTap } from './QuestJournalPage.jsx';
import { useBoxSize, sideBySide, FOOT_FADE } from './railKit.js';   /* v2.3.4356: a list beside what it opens */
import { QUEST_PIN, OWNER_ICON } from '@/data/ownerIcons.js';   /* v2.3.4356: the givers' own pins, on the list's pills; the prize wheel on Daily */
import { dailyRewardsBus, questsLive, spinLive } from '@/game/dailyRewards.js';

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

/* ═══ v2.3.4356: A MENU, NOT A SCROLL ═══
   The owner, 2026-11-09: "The quests page actually needs to be reorganized as
   a useful menu interface.  Right now everything scrolls too long and it's
   not a good quest management system.  It needs to be able to help you
   navigate active quests, next steps, locations, etc easily on a mobile
   device."

   v2.3.3944's journal answered every question, but as ONE column: the points,
   a whole quest's six parts (about 700 px of them), the daily card, then the
   Active, Available and Done lists -- in a band about 190 px tall.  To reach
   your second quest you scrolled past all of the first.

   NOW it is the Leaderboards' shape (v2.3.4355, the owner: "This is looking
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

/* ═══ v2.3.2896: THE QUEST PATH SWITCH, WHERE THE QUESTS ARE ═══
   Owner: "Allow an option to switch off the footprints from the quest
   dashboard button too."  Settings -> Quest path already had Off as one of
   its chips, but Settings is two taps deep behind More, and the Quests
   button is where a player's head is when the road under their feet is the
   thing in the way.  So the same setting is reachable here as a plain
   on/off -- not a second copy of the style picker: Off writes the very 'off'
   the Settings row stores, and On brings back whichever look was last showing
   (questTrailStyle.setTrailShown), so the two places can never disagree.

   The whole row is the target, not just the pill: a 44px row is the touch
   floor, and a 46px pill at the edge of a skinny landscape column is not.
   Through useScrollTap because the row lives inside the panel's scroller,
   where a thumb that drifts ~15px has its tap confiscated (scrollTap.js). */
const PathSwitch = () => {
  const [, force] = useState(0);
  const scrollTap = useScrollTap();
  /* Read every render, not cached in state: it is a variable read, and the
     Settings row can change it while this panel is unmounted. */
  const on = !isTrailOff();
  const look = TRAIL_STYLES.find((s) => s.id === getShownTrailStyle());
  return (
    <div
      role="switch" aria-checked={on} aria-label="Quest path"
      data-questpath-switch={on ? 'on' : 'off'}
      /* role="switch" is not one the click-sound delegate recognises
         (button / role="button"), so the row says so itself */
      data-uisfx="click"
      {...scrollTap(() => { setTrailShown(!on); force((v) => v + 1); })}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        minHeight: 44, padding: '4px 4px',
        borderBottom: `1px solid ${COL.divider}`,
        cursor: 'pointer', touchAction: 'manipulation',
      }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: COL.text }}>Quest path</span>
        <span style={{
          display: 'block', fontSize: 14, color: COL.text2, marginTop: 1,   /* v2.3.3944: 13.5 / 11.5 were, the journal's floor is 13 */
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{on ? (look ? look.label : 'On') + ' on the ground' : 'Hidden'}</span>
      </span>
      {/* The Settings Toggle's pill, same sizes and states (brass-soft fill +
          brass knob when on, raised + muted knob when off). */}
      <span aria-hidden="true" style={{
        display: 'block', flex: 'none',
        width: 46, height: 26,
        borderRadius: 999,
        background: on ? COL.accentFill : COL.raised,
        border: `1px solid ${on ? COL.accent : COL.borderStrong}`,
        boxSizing: 'border-box',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute',
          top: 2, left: on ? 22 : 2,
          width: 20, height: 20,
          borderRadius: '50%',
          background: on ? COL.accent : COL.muted,
          boxShadow: '0 1px 2px rgba(0,0,0,.35)',
          transition: 'left .15s',
        }} />
      </span>
    </div>
  );
};

const EmptyLine = ({ text }) => (
  <div style={{ padding: '12px 6px', color: COL.text2, fontSize: 15, lineHeight: 1.45 }}>{text}</div>
);

/* the list's width (136: a title of fifteen letters whole beside its pin),
   the least page it stands beside the quest on, and the least height (three
   pills at once) */
const RAIL_W = 136;
const SIDE_MIN_W = 340;
const SIDE_MIN_H = 140;

/* what is open while the game is: { id, group } of a quest picked by hand
   (dropped when the quest changes hands), or '@done' / '@daily' */
let lastPick = null;

/* a pill's picture: the giver's pin for a quest (ownerIcons QUEST_PIN, the
   ones over heads and on the maps, behind the loading screen already), a
   brass star on the one you track, a green tick for Done, the prize wheel
   for the daily rewards */
const PinIcon = ({ kind, px }) => {
  if (kind === 'tracked') return <span aria-hidden="true" data-quest-pill-icon="tracked" style={{ flex: 'none', width: px, textAlign: 'center', fontSize: px, lineHeight: 1, color: COL.accent }}>★</span>;
  if (kind === 'done') return <span aria-hidden="true" data-quest-pill-icon="done" style={{ flex: 'none', width: px, textAlign: 'center', fontSize: px - 2, lineHeight: 1, fontWeight: 800, color: '#7FD6AC' }}>✓</span>;
  /* the daily rewards wear the owner's prize wheel (the Daily Rewards window's own), never a second star */
  const src = kind === 'daily' ? OWNER_ICON.prizeWheel.src : kind === 'ready' ? QUEST_PIN.ready : kind === 'offer' ? QUEST_PIN.offer : QUEST_PIN.waiting;
  return <img data-quest-pill-icon={kind} src={src} alt="" draggable={false} style={{ flex: 'none', width: px, height: px, objectFit: 'contain' }} />;
};

const pillStyle = (on, warm) => ({
  display: 'flex', alignItems: 'center', gap: 5, width: '100%', height: 36, padding: '0 8px 0 6px', boxSizing: 'border-box',
  borderRadius: 999,
  /* a lit pill is a tint over the same well, never a hole (NavRail, v2.3.2176) */
  background: on ? `linear-gradient(0deg, ${COL.accentFill}, ${COL.accentFill}), ${COL.wellSoft}` : COL.wellSoft,
  border: `1px solid ${on ? COL.accent : warm ? COL.edgeWarm : COL.tileBor}`,
  color: on ? COL.accent : COL.text, fontSize: 13, fontWeight: 700, textAlign: 'left',
});
const pillHit = (row) => ({
  display: 'flex', alignItems: 'center', minHeight: 44, margin: 0, padding: 0, flex: row ? '0 0 auto' : undefined, width: row ? undefined : '100%',
  background: 'transparent', border: 'none', fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
});
const secStyle = (row) => (row
  ? { flex: 'none', fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.muted, padding: '0 2px 0 6px' }
  : { padding: '8px 6px 2px', fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.muted });

export const QuestsPanel = () => {
  const [, force] = useState(0);
  const [boxRef, boxW, boxH] = useBoxSize();
  const tap = useJournalTap();
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
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
  const pill = ({ id, hook, icon, label, title, count, warm }) => (
    <button key={id} type="button" role="tab" aria-selected={lit === id} data-quest-lit={lit === id ? '1' : undefined} title={title || label}
      {...hook} {...tap(() => (id === '@done' || id === '@daily' ? setPick(id) : pickQuest(id)))} style={pillHit(!side)}>
      <span data-quest-pill="" style={{ ...pillStyle(lit === id, warm), width: side ? '100%' : 'auto', maxWidth: side ? undefined : 220 }}>
        <PinIcon kind={icon} px={18} />
        <span style={{ minWidth: 0, flex: side ? 1 : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        {count != null ? <span style={{ flex: 'none', fontSize: 13, fontWeight: 800, color: lit === id ? COL.accent : COL.text2, fontVariantNumeric: 'tabular-nums' }}>{count}</span> : null}
      </span>
    </button>
  );
  const sec = (word) => <div key={'s:' + word} data-quest-sec={word} aria-hidden={side ? undefined : 'true'} style={secStyle(!side)}>{word}</div>;
  const list = [
    L.active.length ? sec('Active') : null,
    ...L.active.map((r) => pill({
      id: r.id, label: r.title, title: r.title + ': ' + deskWords(r.line),
      icon: r.tracked ? 'tracked' : r.ready ? 'ready' : 'waiting', warm: r.ready,
      hook: { 'data-quest-row': r.id /* v2.3.3522: mp-trackquest */, 'data-quest-row-ready': r.ready ? '1' : '0', 'data-quest-row-track': r.tracked ? 'on' : 'off' },
    })),
    L.available.length ? sec('Available') : null,
    ...L.available.map((r) => pill({ id: r.id, label: r.title, title: r.title + ': ' + r.where, icon: 'offer', hook: { 'data-quest-offer-row': r.id } })),
    (L.done.length || dailyOn) ? sec('More') : null,
    L.done.length ? pill({ id: '@done', label: 'Done', count: L.done.length, icon: 'done', hook: { 'data-quest-nav': 'done' } }) : null,
    dailyOn ? pill({ id: '@daily', label: 'Daily', title: 'Daily rewards', icon: 'daily', hook: { 'data-quest-nav': 'daily' } }) : null,
  ];

  /* ── what the lit pill opens ── */
  const apLine = (
    /* v2.3.3944: the points every hand-in pays (server quests.js
       QUEST_AP_REWARD), added up */
    <div data-journal-ap={L.apTotal} style={{ padding: '4px 2px 6px', fontSize: 15, fontWeight: 800, color: COL.text }}>
      <span style={{ color: COL.accent }}>★</span> {apTotalText(L.apTotal)}
    </div>
  );
  let pane;
  if (open === '@daily') {
    pane = (
      <div data-quest-pane="daily">
        <div style={{ padding: '4px 2px 8px', fontSize: 15, lineHeight: 1.4, color: COL.text2 }}>{deskWords('Your free spin and the day\'s rewards. Tap to open them.')}</div>
        {/* v2.3.3140: the daily quests and the season, one line */}
        <DailyRewardsCard />
      </div>
    );
  } else if (open === '@done') {
    pane = (
      <div data-quest-pane="done">
        {apLine}
        {L.done.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${COL.divider}` }}>
            <button type="button" data-quest-done-row={r.id} {...tap(() => pickQuest(r.id))} style={{
              display: 'block', flex: 1, minWidth: 0, minHeight: 44, padding: '6px 2px', background: 'transparent', border: 'none',
              color: COL.text, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation',
            }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: COL.text2, lineHeight: 1.3 }}><span style={{ color: '#7FD6AC' }}>✓</span> {r.title}</span>
            </button>
            <span data-quest-done-ap={r.ap} style={{ flex: 'none', fontSize: 14, fontWeight: 800, color: COL.text, padding: '0 4px' }}>+{r.ap} AP</span>
          </div>
        ))}
        {/* v2.3.2992: the road on the ground is put away -- the way is on the
            minimap (questTrailStyle.js GROUND_PATH) -- so its switch goes
            with it, back with `?questpath` */}
        {GROUND_PATH && <PathSwitch />}
      </div>
    );
  } else if (page) {
    pane = (
      <div data-journal-focus={page.id} data-quest-pane="quest">
        {open.group === 'done' ? (
          <button type="button" data-quest-back="done" {...tap(() => setPick('@done'))} style={{
            display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, margin: 0, padding: '0 10px 0 2px', background: 'transparent', border: 'none',
            color: COL.accent, fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
          }}><span aria-hidden="true">◂</span> Done quests</button>
        ) : null}
        <QuestJournalPage page={page} brief track={{ onToggle: toggleTrack }} />
      </div>
    );
  } else {
    pane = (
      <div data-quest-pane="none">
        <EmptyLine text="No quest right now. Look for a gold ! over someone's head in BroTown." />
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
      <div ref={navRef} data-quest-rail="" role="tablist" aria-label="Your quests" aria-orientation="vertical" style={{
        flex: 'none', width: RAIL_W, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y',
        padding: '0 4px 18px 0', boxSizing: 'border-box', borderRight: `1px solid ${COL.divider}`,
        WebkitMaskImage: FOOT_FADE, maskImage: FOOT_FADE,
      }}>
        {list}
      </div>
      <div data-quest-detail="" role="tabpanel" style={{
        flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y',
        padding: '0 2px 22px 6px', boxSizing: 'border-box',
        WebkitMaskImage: FOOT_FADE, maskImage: FOOT_FADE,
      }}>
        {pane}
      </div>
    </div>
  );
};
