import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { deriveQuestLog, trackedQuestId, rewardText } from '../sheet/questModel.js';
import { questDetailBus } from '../sheet/questDetailBus.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';

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

const seg = (active) => ({
  flex: 1,
  minHeight: 36,
  background: active ? COL.raised : 'transparent',
  color: active ? COL.text : COL.text2,
  border: 'none',
  borderBottom: `2px solid ${active ? COL.accent : 'transparent'}`,
  borderRadius: 8,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  touchAction: 'manipulation',
  whiteSpace: 'nowrap',
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
          return (
            <button key={s} onClick={() => setSegment(s)} style={seg(segment === s)}>
              {s}{n > 0 ? ` (${n})` : ''}
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
                  <span style={{ display: 'block', fontSize: 11, color: COL.text2, marginTop: 1 }}>
                    {quest.npc}{rewardText(quest) ? ` · ${rewardText(quest)}` : ''}
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
                {rewardText(quest) && (
                  <span style={{ flex: '0 0 auto', fontSize: 11, fontWeight: 700, color: COL.gold, whiteSpace: 'nowrap' }}>
                    {rewardText(quest)}
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
