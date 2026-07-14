import React, { useEffect, useState } from 'react';
import { COL, getState } from '../dash/common.js';
import { deriveQuestLog } from './questModel.js';

/* v2.3.1288: Quests compact (nav-system PR B) — the quest log at a
   glance: a count line + up to three one-line rows, READY quests first
   (they're the actionable ones), then in-progress, then the first
   available pickups.  Descriptions, rewards and the completed list are
   the expanded panel's job.  Read-only, same derivation as the panel
   (sheet/questModel.js). */

const ROW_CAP = 3;

export const QuestsCompact = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { active, upcoming, done } = deriveQuestLog(getState());

  /* One flat glance list: READY → ACTIVE → AVAILABLE.  v2.3.1291
     (ChatGPT round-3 §1): one canonical status set everywhere —
     Ready / Active / Available / Completed ("in progress" retired). */
  const rows = [
    ...active.filter(a => a.ready).map(a => ({ quest: a.quest, badge: 'READY', color: '#59BF91' })),
    ...active.filter(a => !a.ready).map(a => ({ quest: a.quest, badge: 'ACTIVE', color: '#D8A85F' })),
    ...upcoming.map(quest => ({ quest, badge: 'AVAILABLE', color: COL.muted })),
  ];
  const overflow = rows.length - ROW_CAP;

  if (rows.length === 0) {
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
          {done.length > 0 ? 'All quests done — for now.' : 'No quests yet — talk to the folks around town.'}
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
        {/* v2.3.1291 (round-3 §4): a USEFUL summary — "0 active" alone
            hid the 8 waiting pickups. */}
        {active.length} active · {upcoming.length} available{done.length ? ` · ${done.length} done` : ''}
      </div>
      {rows.slice(0, ROW_CAP).map(({ quest, badge, color }) => (
        <div key={quest.id} style={{
          flex: '1 1 0', minHeight: 0,
          display: 'flex', alignItems: 'center', gap: 10,
          borderTop: `1px solid ${COL.divider}`,
        }}>
          <span style={{
            flex: 1, minWidth: 0,
            fontSize: 13, fontWeight: 600, color: badge === 'AVAILABLE' ? COL.text2 : COL.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{quest.title}</span>
          <span style={{
            flex: '0 0 auto',
            fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
            color, whiteSpace: 'nowrap',
          }}>{badge}</span>
        </div>
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
