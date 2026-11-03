import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { questDetailBus } from '../sheet/questDetailBus.js';
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3615: "tap" reads "click" on a computer */
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { TRAIL_STYLES, isTrailOff, getShownTrailStyle, setTrailShown, GROUND_PATH } from '@/game/questTrailStyle.js'; /* v2.3.2896; v2.3.2992 GROUND_PATH */
import { useScrollTap } from '../sheet/scrollTap.js'; /* v2.3.2896: the switch sits in a scroller */
import { DailyRewardsCard } from './DailyRewardsCard.jsx'; /* v2.3.3140: the way into the daily quests and the season */
import { trackedQuestId, setTrackedQuest } from '@/game/trackedQuest.js';
import { questJournalList, questJournalPage, journalCtx } from '../sheet/questJournalModel.js';   /* v2.3.3944: the journal */
import { apTotalText } from '@/game/questJournal.js';
import { QuestJournalPage, useBoxWidth, useJournalTap } from './QuestJournalPage.jsx';

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

const openDetail = (qid) => {
  questDetailBus.select(qid);
  dashboardPanelBus.push('questDetail');
};

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

const SectionHead = ({ children, n }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '16px 4px 6px', borderBottom: `1px solid ${COL.borderStrong}` }}>
    <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.accent }}>{children}</span>
    <span style={{ fontSize: 14, fontWeight: 700, color: COL.text2 }}>{n}</span>
  </div>
);

const EmptyLine = ({ text }) => (
  <div style={{ padding: '12px 6px', color: COL.text2, fontSize: 15, lineHeight: 1.45 }}>{text}</div>
);

const rowBtn = {
  display: 'block', flex: 1, minWidth: 0,
  minHeight: 56,
  padding: '8px 4px',
  background: 'transparent',
  border: 'none',
  color: COL.text,
  fontFamily: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  touchAction: 'manipulation',
};
const rowWrap = { display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${COL.divider}` };
const rowTitle = { display: 'block', fontSize: 16, fontWeight: 700, color: COL.text, lineHeight: 1.3 };
const rowLine = { display: 'block', fontSize: 15, color: COL.text2, marginTop: 2, lineHeight: 1.35 };

export const QuestsPanel = () => {
  const [, force] = useState(0);
  const [boxRef, boxW] = useBoxWidth();
  const tap = useJournalTap();
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const ctx = journalCtx(S);
  const L = questJournalList(S, ctx);
  const focus = L.focusId ? questJournalPage(S, L.focusId, ctx) : null;
  /* the box, measured: the page and the log side by side once there is room
     for both (a wide band), one column otherwise */
  const wide = boxW >= 760;

  const toggleTrack = (qid) => { setTrackedQuest(trackedQuestId() === qid ? null : qid); force((v) => v + 1); };

  const focusCard = focus ? (
    <div data-journal-focus={focus.id} style={{
      margin: '8px 0 4px', padding: '2px 12px 4px', borderRadius: 12,
      background: COL.raised, border: `1px solid ${COL.edgeWarm}`,
    }}>
      <QuestJournalPage page={focus} kicker={focus.status === 'available' ? 'Your next quest' : 'Your quest'} />
    </div>
  ) : (
    <EmptyLine text="No quest right now. Look for a gold ! over someone's head in BroTown." />
  );

  const log = (
    <div>
      <SectionHead n={L.active.length}>Active</SectionHead>
      {L.active.length === 0 ? <EmptyLine text="Nothing in hand. Take a quest from someone below." /> : L.active.map((r) => (
        <div key={r.id} style={rowWrap}>
          <button type="button" style={rowBtn} data-quest-row={r.id /* v2.3.3522: mp-trackquest */} {...tap(() => openDetail(r.id))}>
            <span style={rowTitle}>{r.title}</span>
            <span style={{ ...rowLine, color: r.ready ? COL.accent : COL.text2, fontWeight: r.ready ? 700 : 400 }}>{deskWords(r.line)}</span>
          </button>
          {/* v2.3.3944: Track from the list, a 44 px star */}
          <button type="button" data-quest-row-track={r.tracked ? 'on' : 'off'} aria-pressed={r.tracked}
            aria-label={(r.tracked ? 'Stop tracking ' : 'Track ') + r.title}
            {...tap(() => toggleTrack(r.id))}
            style={{
              flex: 'none', width: 48, height: 48, borderRadius: 10,
              background: r.tracked ? COL.accentFill : 'transparent',
              border: `1px solid ${r.tracked ? COL.accent : COL.border}`,
              color: r.tracked ? COL.accent : COL.text2, fontSize: 22, lineHeight: 1,
              fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
            }}>{r.tracked ? '★' : '☆'}</button>
        </div>
      ))}

      <SectionHead n={L.available.length}>Available</SectionHead>
      {L.available.length === 0 ? <EmptyLine text="No one has a new quest for you right now." /> : L.available.map((r) => (
        <div key={r.id} style={rowWrap}>
          <button type="button" style={rowBtn} data-quest-offer-row={r.id} {...tap(() => openDetail(r.id))}>
            <span style={rowTitle}>{r.title}</span>
            <span style={rowLine}>{r.where}</span>
          </button>
          <span aria-hidden="true" style={{ flex: 'none', fontSize: 20, color: COL.text2, padding: '0 8px' }}>›</span>
        </div>
      ))}

      <SectionHead n={L.done.length}>Done</SectionHead>
      {L.done.length === 0 ? <EmptyLine text="Quests you hand in are listed here, with the points they paid." /> : L.done.map((r) => (
        <div key={r.id} style={rowWrap}>
          <button type="button" style={{ ...rowBtn, minHeight: 48 }} data-quest-done-row={r.id} {...tap(() => openDetail(r.id))}>
            <span style={{ ...rowTitle, fontWeight: 600, color: COL.text2 }}><span style={{ color: '#7FD6AC' }}>✓</span> {r.title}</span>
          </button>
          <span data-quest-done-ap={r.ap} style={{ flex: 'none', fontSize: 15, fontWeight: 800, color: COL.text, padding: '0 8px' }}>+{r.ap} AP</span>
        </div>
      ))}
    </div>
  );

  return (
    <div ref={boxRef} style={{ ...panelStyle, overflowY: 'auto' }}>
      {/* v2.3.3140: the daily quests and the season, one line above the
          story quests -- renders nothing against a worker without them */}
      <DailyRewardsCard />
      {/* v2.3.3944: the points every hand-in pays (server quests.js
          QUEST_AP_REWARD), added up -- shown nowhere before */}
      <div data-journal-ap={L.apTotal} style={{ padding: '8px 4px 2px', fontSize: 16, fontWeight: 800, color: COL.text }}>
        <span style={{ color: COL.accent }}>★</span> {apTotalText(L.apTotal)}
      </div>
      {/* v2.3.2992: the road on the ground is put away -- the way is on
          the minimap (questTrailStyle.js GROUND_PATH) -- so its switch
          goes with it, back with `?questpath` */}
      {GROUND_PATH && <PathSwitch />}
      {wide ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', columnGap: 20, alignItems: 'start', paddingBottom: 26 }}>
          <div style={{ minWidth: 0 }}>{focusCard}</div>
          <div style={{ minWidth: 0 }}>{log}</div>
        </div>
      ) : (
        <div style={{ paddingBottom: 26 }}>{focusCard}{log}</div>
      )}
    </div>
  );
};
