import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { QUEST_CHAINS } from '../../../data/gameSystems.js';
import { deriveQuestLog, trackedQuestId, setTrackedQuest, rewardText } from '../sheet/questModel.js';
import { questDetailBus } from '../sheet/questDetailBus.js';
import { prog3Live, PROG3_SKILL_META } from '../../../data/prog3.js';
import { NPC_DATA } from '../../../data/gameDisplay.js';

/* v2.3.1673: the quest giver's portrait, looked up by the NAME the quest
   chain stores — the same key getNpcQuest already matches on, so there is no
   second id to keep in sync.  Returns null for a giver with no art. */
const npcPortrait = (name) => {
  const npc = (NPC_DATA || []).find((n) => n && n.name === name);
  return (npc && npc.portrait) || null;
};

/* v2.3.1298 (ChatGPT round-5 Quests): the focused quest page — pushed
   into the sheet from any quest row.  Status, objective, quest giver,
   rewards (with the coin sprite, not just an abbreviation), and a
   Track/Untrack toggle (client-side pin; the tracked quest sorts to
   the top of compact + Active).  For a READY quest the destination is
   the dominant instruction.  Accepting/turning-in stays with the NPCs
   — this page never adds wire surface. */

export const QuestDetailPanel = () => {
  const [, force] = useState(0);
  /* v2.3.1669: which skill the turn-in XP should feed.  Null = not yet
     chosen, which is the state the Turn In button waits in — the server
     refuses an XP-paying turn-in with no category, so asking here is the
     mechanism rather than a courtesy. */
  const [xpCat, setXpCat] = useState(null);
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
  const needsXpChoice = prog3Live((getState() || {}).rpg) && xp > 0;

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
          NPCs — this page never adds wire surface."  That was true, and it
          made the quest system UNREACHABLE: town NPC entities had been
          disabled since v2.3.214 (S.npcs = []), so the only door into
          quests was a door that no longer existed.

          v2.3.1669 CORRECTION: an earlier version of this comment blamed
          the town walkability grid for the spawn being gated off.  That
          was wrong — town has no walkability grid at all (tiledMaps.js has
          its .walk.json commented out), so that clause was always true and
          never gated anything.  Mayor Bro is back in the world now, but
          these buttons STAY: a panel route means the arc does not depend on
          finding an NPC on a small screen, and both paths send the same two
          events.

          The server validates state transitions and the declarative
          objective either way (server/src/quests.js), so the panel cannot
          mint a reward the NPC path couldn't. */}
      {/* v2.3.1669: XP has to go SOMEWHERE.  Under prog3 there is no
          generic XP bar — every point belongs to Melee, Bow or Magic —
          so a quest that pays XP asks which one first.  The server
          enforces it (an XP-paying turn-in naming no category is refused
          outright), so this picker is the mechanism, not a courtesy:
          without a choice there is no reward. */}
      {status === 'Ready' && needsXpChoice && (
        <div style={{ marginTop: 8 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
            textTransform: 'uppercase', color: COL.muted, marginBottom: 4,
          }}>Train {xp} XP into</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {PROG3_SKILL_META.map(sk => {
              const on = xpCat === sk.key;
              return (
                <button key={sk.key}
                  aria-pressed={on}
                  onPointerUp={(e) => { e.stopPropagation(); setXpCat(sk.key); }}
                  style={{
                    flex: '1 1 0', minWidth: 0, minHeight: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    background: on ? COL.accentFill : 'transparent',
                    border: `1px solid ${on ? COL.accent : COL.border}`,
                    borderRadius: 10,
                    color: on ? COL.accent : COL.text,
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', touchAction: 'manipulation',
                  }}>
                  <img src={sk.iconSrc} alt="" draggable={false}
                    style={{ width: 18, height: 18, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
                  {sk.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(status === 'Available' || status === 'Ready') && (
        <button
          aria-disabled={status === 'Ready' && needsXpChoice && !xpCat}
          onPointerUp={(e) => {
            e.stopPropagation();
            const St = getState();
            if (!St || !St.channel) return;
            if (status === 'Ready' && needsXpChoice && !xpCat) return;
            St.channel.send({
              type: status === 'Ready' ? 'quest_turn_in' : 'quest_accept',
              payload: status === 'Ready'
                ? { questId: quest.id, xpCat: xpCat || undefined }
                : { questId: quest.id },
            });
            setXpCat(null);
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
            opacity: (status === 'Ready' && needsXpChoice && !xpCat) ? 0.5 : 1,
            touchAction: 'manipulation',
          }}
        >{status === 'Ready'
          ? (needsXpChoice && !xpCat ? 'Choose a skill to train' : 'Turn in — claim your reward')
          : `Accept from ${quest.npc}`}</button>
      )}

      {/* The giver's own words, so the arc reads as someone sending you
          somewhere rather than a checklist appearing. */}
      {quest.dialogue && (status === 'Available' || status === 'Active' || status === 'Ready') && (
        <div style={{
          marginTop: 8, padding: '8px 10px',
          background: COL.wellSoft, border: `1px solid ${COL.tileBor}`,
          borderRadius: 8,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          {/* v2.3.1673 (owner: "show his head in the dialogue window").  The
              portrait is a crop of the same sprite standing in town, so the
              face you are reading is the face you walked up to.  Falls back to
              text-only if the NPC has no art — most givers still don't. */}
          {npcPortrait(quest.npc) && (
            <img src={npcPortrait(quest.npc)} alt="" draggable={false}
              style={{
                width: 44, height: 44, flex: 'none', objectFit: 'contain',
                imageRendering: 'pixelated',   /* it is pixel art; do not smooth it */
                borderRadius: 6, background: COL.well,
                border: `1px solid ${COL.tileBor}`,
              }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 8.5, fontWeight: 700, letterSpacing: '.06em',
              textTransform: 'uppercase', color: COL.muted, marginBottom: 3,
            }}>{quest.npc}</div>
            <div style={{
              fontSize: 12, lineHeight: 1.45, color: COL.text2, fontStyle: 'italic',
              /* v2.3.1676: the starter-kit line carries the control
                 instructions as its own paragraphs.  Without pre-wrap the \n\n
                 collapses and three separate controls run together into one
                 unreadable sentence — which is exactly the "controls are not
                 obvious" problem this text exists to solve. */
              whiteSpace: 'pre-wrap',
            }}>
              “{status === 'Ready' ? quest.dialogue.complete
                : status === 'Active' ? quest.dialogue.progress
                : quest.dialogue.start}”
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
