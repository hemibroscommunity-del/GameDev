import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { QUEST_CHAINS, QUEST_STATUS, getNpcQuest } from '../../../data/gameSystems.js';

/* v2.3.1265: Quests — new toolbar destination (owner: the 5-button ribbon
   is Inventory · Chat · Friends · Quests · More).  A READ-ONLY quest log:
   accepting and turning in stays with the NPCs (the server-authoritative
   quest_accept / quest_turn_in flow, v2.3.782 + handoff rules) — this
   panel only reads R._quests + QUEST_CHAINS, so it adds zero wire surface.

   Sections:
   - ACTIVE     — accepted quests; live check(R,S) says READY vs IN PROGRESS.
   - NEXT UP    — per NPC, the first incomplete unaccepted quest ("see X").
   - COMPLETED  — turned-in count, newest-titled list, dimmed.  */

const secHdr = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '.10em',
  textTransform: 'uppercase',
  color: COL.muted,
  padding: '10px 12px 4px',
};

const rowBox = {
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  borderBottom: `1px solid ${COL.divider}`,
};

export const QuestsPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const R = (S && S.rpg) || {};
  const qs = R._quests || {};

  const active = [];
  const done = [];
  for (const [qid, quest] of Object.entries(QUEST_CHAINS)) {
    const st = qs[qid];
    if (st === QUEST_STATUS.active || st === QUEST_STATUS.complete) {
      let ready = st === QUEST_STATUS.complete;
      /* check() bodies read live S freely; a throw must never take the
         panel down (same defensive posture as the dashboard readouts). */
      if (!ready && typeof quest.check === 'function') {
        try { ready = !!quest.check(R, S); } catch (_e) { ready = false; }
      }
      active.push({ quest, ready });
    } else if (st === QUEST_STATUS.turnedIn) {
      done.push(quest);
    }
  }
  /* NEXT UP: for each quest-giving NPC, the first incomplete quest that
     is not yet accepted — the same selection the NPC dialogue uses.
     getNpcQuest returns a { quest, status } wrapper, NOT the quest. */
  const npcs = [...new Set(Object.values(QUEST_CHAINS).map(q => q.npc))];
  const upcoming = [];
  for (const npc of npcs) {
    const r = getNpcQuest(R, npc);
    if (r && r.status === QUEST_STATUS.available) upcoming.push(r.quest);
  }

  const reward = (q) => [q.reward?.gold ? `${q.reward.gold}g` : null, q.reward?.xp ? `${q.reward.xp}xp` : null]
    .filter(Boolean).join(' · ');

  return (
    <div style={{ ...panelStyle, overflowY: 'auto' }}>
      {active.length === 0 && upcoming.length === 0 && done.length === 0 && (
        <div style={{ padding: '28px 16px', textAlign: 'center', color: COL.muted, fontSize: 13 }}>
          No quests yet — talk to the folks around town.
        </div>
      )}

      {active.length > 0 && <div style={secHdr}>Active</div>}
      {active.map(({ quest, ready }) => (
        <div key={quest.id} style={rowBox}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: COL.text }}>{quest.title}</div>
            <div style={{ fontSize: 12, color: COL.text2, marginTop: 1 }}>{quest.desc}</div>
            <div style={{ fontSize: 10.5, color: COL.muted, marginTop: 2 }}>
              {quest.npc}{reward(quest) ? ` · ${reward(quest)}` : ''}
            </div>
          </div>
          <span style={{
            flex: '0 0 auto',
            fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
            color: ready ? '#59BF91' : '#D8A85F',
            whiteSpace: 'nowrap',
          }}>{ready ? 'READY — SEE ' + quest.npc.split(' ')[0].toUpperCase() : 'IN PROGRESS'}</span>
        </div>
      ))}

      {upcoming.length > 0 && <div style={secHdr}>Next up</div>}
      {upcoming.map((quest) => (
        <div key={quest.id} style={rowBox}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: COL.text2 }}>{quest.title}</div>
            <div style={{ fontSize: 10.5, color: COL.muted, marginTop: 2 }}>
              Talk to {quest.npc}{reward(quest) ? ` · ${reward(quest)}` : ''}
            </div>
          </div>
          <span style={{ flex: '0 0 auto', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: COL.muted }}>
            AVAILABLE
          </span>
        </div>
      ))}

      {done.length > 0 && <div style={secHdr}>Completed · {done.length}</div>}
      {done.map((quest) => (
        <div key={quest.id} style={{ ...rowBox, opacity: 0.55, minHeight: 36, padding: '6px 12px' }}>
          <div style={{ flex: 1, fontSize: 12.5, color: COL.text2 }}>{quest.title}</div>
          <span style={{ fontSize: 12, color: '#59BF91' }}>✓</span>
        </div>
      ))}
    </div>
  );
};
