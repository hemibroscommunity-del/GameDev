import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';
import { deriveQuestLog, trackedQuestId, rewardText } from './questModel.js';
import { questDetailBus } from './questDetailBus.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';

/* v2.3.1288: Quests compact.  v2.3.1298 (ChatGPT round-5): the glance
   answers "what should I do NEXT?", not "what states exist":
   - TWO comfortable rows instead of three compressed ones, sorted
     ready → tracked → active → recommended available.
   - Rows carry DIRECTION instead of repeated status labels: a ready
     quest says where to turn in, an active quest shows its objective,
     an available one names the NPC and the reward.
   - Summary prioritizes actionable states: "1 READY · 2 ACTIVE", or
     "0 ACTIVE · 8 AVAILABLE" when nothing is underway (completed
     never counts here).
   - Tapping a row expands straight into that quest's detail view. */

const ROW_CAP = 2;

export const QuestsCompact = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { active, upcoming, done } = deriveQuestLog(getState());
  const tracked = trackedQuestId();

  const rows = [
    ...active.filter(a => a.ready).map(a => ({
      quest: a.quest, tone: '#D8AA58',
      line: `Ready — return to ${a.quest.npc}`,
    })),
    ...active.filter(a => !a.ready && a.quest.id === tracked).map(a => ({
      quest: a.quest, tone: '#5B99DE', star: true,
      line: a.quest.desc,
    })),
    ...active.filter(a => !a.ready && a.quest.id !== tracked).map(a => ({
      quest: a.quest, tone: null,
      line: a.quest.desc,
    })),
    ...upcoming.map(quest => ({
      quest, tone: null, dim: true,
      line: `Talk to ${quest.npc}${rewardText(quest) ? ' · ' + rewardText(quest) : ''}`,
    })),
  ];
  const overflow = rows.length - ROW_CAP;
  const readyN = active.filter(a => a.ready).length;

  if (rows.length === 0 && done.length === 0) {
    return (
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        fontFamily: 'Source Sans 3, sans-serif',
      }}>
        <img src="/icons/ui/panel-quests.webp?v=2.3.1224" alt="" draggable={false}
          style={{ width: 32, height: 32, objectFit: 'contain', opacity: 0.4 }}
          onError={(e) => { e.currentTarget.replaceWith(document.createTextNode('📜')); }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2 }}>
          No quests yet — talk to the folks around town.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'flex', flexDirection: 'column',
      padding: '6px 12px 2px',
      fontFamily: 'Source Sans 3, sans-serif',
      overflow: 'hidden',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.10em',
        textTransform: 'uppercase', color: COL.muted,
        padding: '2px 0 2px',
        flex: '0 0 auto',
      }}>
        {readyN > 0 || active.length > 0
          ? `${readyN} ready · ${active.length - readyN} active`
          : `0 active · ${upcoming.length} available`}
      </div>
      {rows.length === 0 && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, color: COL.text2,
        }}>All caught up — for now.</div>
      )}
      {rows.slice(0, ROW_CAP).map(({ quest, tone, line, star, dim }) => (
        <button key={quest.id}
          onPointerUp={(e) => {
            e.stopPropagation();
            questDetailBus.select(quest.id);
            dashboardPanelBus.push('questDetail');
          }}
          style={{
            flex: '1 1 0', minHeight: 0,
            display: 'flex', alignItems: 'center', gap: 8,
            borderTop: `1px solid ${COL.divider}`,
            background: 'transparent', border: 'none',
            borderRadius: 0,
            padding: '0 2px',
            color: COL.text, fontFamily: 'inherit', textAlign: 'left',
            cursor: 'pointer', touchAction: 'manipulation',
            minWidth: 0,
          }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: dim ? COL.text2 : COL.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{star ? '★ ' : ''}{quest.title}</span>
            <span style={{
              display: 'block', fontSize: 11, marginTop: 1,
              color: tone || COL.muted, fontWeight: tone ? 700 : 400,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{line}</span>
          </span>
          <span aria-hidden="true" style={{ flex: 'none', fontSize: 14, color: COL.muted }}>›</span>
        </button>
      ))}
      {overflow > 0 && (
        <div style={{
          flex: '0 0 auto',
          fontSize: 11, fontWeight: 600, color: COL.muted,
          padding: '2px 0 4px',
        }}>+{overflow} more — expand for the full log</div>
      )}
    </div>
  );
};
