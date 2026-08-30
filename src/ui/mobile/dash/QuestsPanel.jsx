import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { deriveQuestLog, trackedQuestId, rewardText } from '../sheet/questModel.js';
import { questDetailBus } from '../sheet/questDetailBus.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { panelVw } from '../playViewport.js'; /* v2.3.2172: the sheet's width, not the shell's */

/* v2.3.1265: Quests — read-only quest log (accepting/turning-in stays
   with the NPCs; server-authoritative flow untouched).
   v2.3.1298 (ChatGPT round-5, owner-approved): no more one long feed —
   a sticky segmented control (Active · Available · Completed, with
   counts) gives each state a focused view.  READY quests pin above
   ordinary active ones with the brass treatment; the tracked quest
   (★, client-side) comes next.  Available rows drop the redundant
   AVAILABLE label for the reward on the right.  Rows are 44px+ and
   tap through to the quest detail drill (objectives, rewards,
   track/untrack, where to go).  Selected segment persists for the
   session; reward text contrast raised. */

const SEGMENTS = ['Active', 'Available', 'Completed'];
let _lastSegment = 'Active';

/* v2.3.2172 (owner: every destination opens in the dashboard's skinny
   landscape column): `narrow` shrinks the type a notch and lets the button
   actually shrink — three nowrap flex:1 buttons whose text is wider than a
   third of a ~204px row overflow the sheet's edge otherwise (measured:
   "Available (1)" ran off the right of the landscape pane).  The count
   moves to a corner badge there; see the render. */
const seg = (active, narrow) => ({
  /* v2.3.2173: narrow shares by CONTENT, not thirds — equal thirds starve
     the longest word and "Completed" was still rendering "Comple…" at
     10px.  'Active' cedes what it doesn't need. */
  flex: narrow ? '1 1 auto' : 1,
  minWidth: 0,
  position: 'relative',
  overflow: 'hidden',
  minHeight: 36,
  background: active ? COL.raised : 'transparent',
  color: active ? COL.text : COL.text2,
  border: 'none',
  borderBottom: `2px solid ${active ? COL.accent : 'transparent'}`,
  borderRadius: 8,
  fontFamily: 'inherit',
  fontSize: narrow ? 10 : 12,
  fontWeight: 700,
  padding: narrow ? '0 2px' : undefined,
  cursor: 'pointer',
  touchAction: 'manipulation',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis', /* the backstop; at 10px all three words fit */
});

const rowBtn = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%',
  minHeight: 48,
  padding: '6px 4px',
  background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${COL.divider}`,
  color: COL.text,
  fontFamily: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  touchAction: 'manipulation',
  minWidth: 0,
};

const openDetail = (qid) => {
  questDetailBus.select(qid);
  dashboardPanelBus.push('questDetail');
};

const EmptyLine = ({ text }) => (
  <div style={{ padding: '26px 16px', textAlign: 'center', color: COL.muted, fontSize: 13, lineHeight: 1.45 }}>{text}</div>
);

export const QuestsPanel = () => {
  const [, force] = useState(0);
  const [segment, setSegmentState] = useState(_lastSegment);
  const setSegment = (s) => { _lastSegment = s; setSegmentState(s); };
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const { active, upcoming, done } = deriveQuestLog(S);
  const tracked = trackedQuestId();

  /* Active order: ready → tracked → rest (round-5). */
  const activeSorted = [
    ...active.filter(a => a.ready),
    ...active.filter(a => !a.ready && a.quest.id === tracked),
    ...active.filter(a => !a.ready && a.quest.id !== tracked),
  ];

  return (
    <div style={{ ...panelStyle, overflowY: 'auto' }}>
      {/* Sticky segmented control — content scrolls under it. */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 2,
        display: 'flex', gap: 2,
        background: COL.bg,
        borderRadius: 10, padding: 2,
        border: `1px solid ${COL.border}`,
      }}>
        {SEGMENTS.map(s => {
          const n = s === 'Active' ? active.length : s === 'Available' ? upcoming.length : done.length;
          /* v2.3.2172: in the skinny landscape column the inline " (1)" is
             the width that overflowed, so the count becomes a corner badge
             there — same number, fewer pixels.  Portrait unchanged. */
          const narrow = panelVw() < 260;
          return (
            <button key={s} onClick={() => setSegment(s)} style={seg(segment === s, narrow)}>
              {s}{!narrow && n > 0 ? ` (${n})` : ''}
              {narrow && n > 0 && (
                <span aria-hidden="true" style={{
                  position: 'absolute', top: 2, right: 2,
                  minWidth: 13, height: 13, padding: '0 3px',
                  borderRadius: 7, background: COL.accent, color: COL.onAccent,
                  fontSize: 9, fontWeight: 900, lineHeight: '13px', textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
                }}>{n > 9 ? '9+' : n}</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ paddingBottom: 26 }}>
        {segment === 'Active' && (
          activeSorted.length === 0
            ? <EmptyLine text="No active quests. Choose one from Available or speak with someone in town." />
            : activeSorted.map(({ quest, ready }) => (
              <button key={quest.id} style={rowBtn}
                onPointerUp={(e) => { e.stopPropagation(); openDetail(quest.id); }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontSize: 13.5, fontWeight: 600, color: COL.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{quest.id === tracked && !ready ? '★ ' : ''}{quest.title}</span>
                  {/* round-5: objective + giver, raised contrast (text2,
                      was muted). */}
                  <span style={{ display: 'block', fontSize: 12, color: COL.text2, marginTop: 1 }}>{quest.desc}</span>
                  {/* v2.3.1704 (owner: "The quest UI is a little confusing
                      what's rewards for the next quests vs what's rewarded for
                      the current quest").  This read "Mayor Bro · 25g · 40 XP"
                      — the giver and the payout joined by the SAME middot the
                      payout uses internally, so it scanned as one undifferentiated
                      run of facts with no word anywhere saying which part was a
                      reward.  Naming it costs six characters and makes an active
                      quest's payout impossible to confuse with an offer's. */}
                  <span style={{ display: 'block', fontSize: 11, color: COL.text2, marginTop: 1 }}>
                    {quest.npc}{rewardText(quest) ? ` · pays ${rewardText(quest)}` : ''}
                  </span>
                </span>
                {ready ? (
                  <span style={{
                    flex: '0 0 auto',
                    fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
                    color: '#20170D', background: COL.accent,
                    borderRadius: 5, padding: '2px 6px',
                    whiteSpace: 'nowrap',
                  }}>READY</span>
                ) : (
                  <span aria-hidden="true" style={{ flex: 'none', fontSize: 14, color: COL.muted }}>›</span>
                )}
              </button>
            ))
        )}

        {segment === 'Available' && (
          upcoming.length === 0
            ? <EmptyLine text="You're caught up — for now." />
            : upcoming.map((quest) => (
              <button key={quest.id} style={rowBtn}
                onPointerUp={(e) => { e.stopPropagation(); openDetail(quest.id); }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontSize: 13.5, fontWeight: 600, color: COL.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{quest.title}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: COL.text2, marginTop: 1 }}>
                    Talk to {quest.npc}
                  </span>
                </span>
                {/* round-5: the segment already says AVAILABLE — the
                    right side earns its keep as the reward. */}
                {/* v2.3.1704: ...and it was a bare money figure floating at the
                    right edge with no label, which is the same figure shape an
                    ACTIVE row carries.  A player looking at an offer could not
                    tell whether "25g · 40 XP" was what this new quest pays or a
                    leftover from the one they are already on.  Two words fix
                    it, and "pays" matches the wording on the active rows above
                    so the two lists read as one language. */}
                {rewardText(quest) && (
                  <span style={{ flex: '0 0 auto', fontSize: 11, fontWeight: 700, color: COL.gold, whiteSpace: 'nowrap' }}>
                    pays {rewardText(quest)}
                  </span>
                )}
                <span aria-hidden="true" style={{ flex: 'none', fontSize: 14, color: COL.muted }}>›</span>
              </button>
            ))
        )}

        {segment === 'Completed' && (
          done.length === 0
            ? <EmptyLine text="Your completed adventures will appear here." />
            : [...done].reverse().map((quest) => (
              <div key={quest.id} style={{ ...rowBtn, cursor: 'default', opacity: 0.55, minHeight: 38 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: COL.text2 }}>{quest.title}</span>
                <span style={{ fontSize: 12, color: '#59BF91' }}>✓</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
