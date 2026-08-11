import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { QUEST_CHAINS } from '../../../data/gameSystems.js';
import { deriveQuestLog, trackedQuestId, setTrackedQuest, rewardText } from '../sheet/questModel.js';
import { questDetailBus } from '../sheet/questDetailBus.js';

/* v2.3.1298 (ChatGPT round-5 Quests): the focused quest page — pushed
   into the sheet from any quest row.  Status, objective, quest giver,
   rewards (with the coin sprite, not just an abbreviation), and a
   Track/Untrack toggle (client-side pin; the tracked quest sorts to
   the top of compact + Active).  For a READY quest the destination is
   the dominant instruction.  Accepting/turning-in stays with the NPCs
   — this page never adds wire surface. */

export const QuestDetailPanel = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const qid = questDetailBus.selected();
  const quest = QUEST_CHAINS[qid] || Object.values(QUEST_CHAINS).find(q => q.id === qid);
  const S = getState();
  const { active, upcoming, done } = deriveQuestLog(S);

  if (!quest) {
    return <div style={panelStyle}><div style={{ padding: 20, color: COL.muted, fontSize: 13 }}>Quest not found.</div></div>;
  }

  const activeEntry = active.find(a => a.quest.id === quest.id);
  const status = activeEntry ? (activeEntry.ready ? 'Ready' : 'Active')
    : upcoming.some(q => q.id === quest.id) ? 'Available'
    : done.some(q => q.id === quest.id) ? 'Completed' : 'Locked';
  const tracked = trackedQuestId() === quest.id;
  const gold = quest.reward?.gold || 0;
  const xp = quest.reward?.xp || 0;

  const statusTone = status === 'Ready' ? COL.accent
    : status === 'Active' ? '#5B99DE'
    : status === 'Completed' ? '#59BF91' : COL.muted;

  return (
    <div style={{ ...panelStyle, overflowY: 'auto' }}>
      {/* Title + status. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px 4px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: COL.text }}>{quest.title}</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: statusTone, marginTop: 2, letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {status}
          </div>
        </div>
      </div>

      {/* READY: the destination is the dominant instruction. */}
      {status === 'Ready' && (
        <div style={{
          margin: '6px 0 8px',
          padding: '10px 12px',
          borderRadius: 8,
          background: COL.accentFill,
          border: `1px solid ${COL.accent}`,
          fontSize: 14, fontWeight: 700, color: COL.accent,
        }}>
          Ready to turn in — return to {quest.npc}.
        </div>
      )}

      {/* Objective. */}
      <div style={{ padding: '6px 2px 2px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: COL.muted }}>
        Objective
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.45, color: COL.text, padding: '0 2px 6px' }}>
        {quest.desc}
      </div>

      {/* Quest giver. */}
      <div style={{ padding: '6px 2px 2px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: COL.muted }}>
        Quest giver
      </div>
      <div style={{ fontSize: 13.5, color: COL.text, padding: '0 2px 6px' }}>{quest.npc}</div>

      {/* Rewards — coin sprite, not just abbreviations (round-5). */}
      {(gold > 0 || xp > 0) && (
        <>
          <div style={{ padding: '6px 2px 2px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: COL.muted }}>
            Rewards
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '2px 2px 8px' }}>
            {gold > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 700, color: COL.gold, fontVariantNumeric: 'tabular-nums' }}>
                <img src="/icons/popups/gold.webp" alt="gold"
                  style={{ width: 15, height: 15, imageRendering: 'pixelated', display: 'block' }} />
                {gold}
              </span>
            )}
            {xp > 0 && (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#8AA9F9', fontVariantNumeric: 'tabular-nums' }}>
                +{xp} XP
              </span>
            )}
          </div>
        </>
      )}

      {/* Track toggle — active quests only (a pin for "what am I doing"). */}
      {status === 'Active' && (
        <button
          onPointerUp={(e) => {
            e.stopPropagation();
            setTrackedQuest(tracked ? null : quest.id);
            force(v => v + 1);
          }}
          style={{
            width: '100%',
            minHeight: 44,
            marginTop: 8,
            background: tracked ? COL.accentFill : 'transparent',
            border: `1px solid ${tracked ? COL.accent : COL.border}`,
            borderRadius: 10,
            color: tracked ? COL.accent : COL.text,
            fontFamily: 'inherit',
            fontSize: 13, fontWeight: 700,
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >{tracked ? '★ Tracked — tap to untrack' : '☆ Track this quest'}</button>
      )}
      {/* ═══ v2.3.1665: ACCEPT / TURN IN from the panel ═══
          The header above used to say "accepting/turning-in stays with the
          NPCs — this page never adds wire surface."  That was true and it
          made the quest system UNREACHABLE: town NPC entities have been
          disabled since v2.3.214 (S.npcs = []), and the town spawn is also
          gated on the zone not carrying a walkability grid, which town now
          does.  So the only door into quests was a door that no longer
          exists.

          These two buttons send the SAME two events the NPC dialogue modal
          sent (quest_accept / quest_turn_in) — no new wire surface, just a
          reachable trigger.  The server validates state transitions and the
          declarative objective either way (server/src/quests.js), so the
          panel cannot mint a reward the NPC path couldn't. */}
      {(status === 'Available' || status === 'Ready') && (
        <button
          onPointerUp={(e) => {
            e.stopPropagation();
            const St = getState();
            if (!St || !St.channel) return;
            St.channel.send({
              type: status === 'Ready' ? 'quest_turn_in' : 'quest_accept',
              payload: { questId: quest.id },
            });
            force(v => v + 1);
          }}
          style={{
            width: '100%',
            minHeight: 44,
            marginTop: 8,
            background: COL.accentFill,
            border: `1px solid ${COL.accent}`,
            borderRadius: 10,
            color: COL.accent,
            fontFamily: 'inherit',
            fontSize: 13, fontWeight: 800,
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >{status === 'Ready' ? 'Turn in — claim your reward' : `Accept from ${quest.npc}`}</button>
      )}

      {/* The giver's own words, so the arc reads as someone sending you
          somewhere rather than a checklist appearing. */}
      {quest.dialogue && (status === 'Available' || status === 'Active' || status === 'Ready') && (
        <div style={{
          marginTop: 8, padding: '8px 10px',
          background: COL.wellSoft, border: `1px solid ${COL.tileBor}`,
          borderRadius: 8,
        }}>
          <div style={{
            fontSize: 8.5, fontWeight: 700, letterSpacing: '.06em',
            textTransform: 'uppercase', color: COL.muted, marginBottom: 3,
          }}>{quest.npc}</div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: COL.text2, fontStyle: 'italic' }}>
            “{status === 'Ready' ? quest.dialogue.complete
              : status === 'Active' ? quest.dialogue.progress
              : quest.dialogue.start}”
          </div>
        </div>
      )}
    </div>
  );
};
