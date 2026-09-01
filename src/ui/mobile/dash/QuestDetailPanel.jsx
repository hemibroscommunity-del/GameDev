import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { QUEST_CHAINS } from '../../../data/gameSystems.js';
import { deriveQuestLog, trackedQuestId, setTrackedQuest } from '../sheet/questModel.js';
import { questDetailBus } from '../sheet/questDetailBus.js';
import { NPC_DATA } from '../../../data/gameDisplay.js';

/* v2.3.1673: the quest giver's portrait, looked up by the NAME the quest
   chain stores — the same key getNpcQuest already matches on, so there is no
   second id to keep in sync.  Returns null for a giver with no art. */
const npcPortrait = (name) => {
  const npc = (NPC_DATA || []).find((n) => n && n.name === name);
  return (npc && npc.portrait) || null;
};

/* ═══ v2.3.1710: THE REWARD, PICTURED, ON THIS PAGE TOO ═══
   Owner: "Quest item thumbnail rewards are not shown in the quest panel until
   after you accept the quest (only xp and gold are shown)."
   The in-world dialogue has had item art since v2.3.1681; this page — the one
   you reach by tapping a row in the quest log — never did. It listed gold, XP
   and at most the item's NAME as text, so the two surfaces gave different
   answers about the same quest, and on an OFFER the picture of what you are
   working toward existed nowhere.
   Same 40px chip the dialogue draws (src/ui/panels/QuestPanel.jsx), rebuilt
   here on this pane's own COL tokens rather than imported across the
   panels/ ↔ mobile/dash boundary — `npcPortrait` above is duplicated for the
   same reason. A file that 404s removes its own chip rather than leaving a
   broken-image glyph in the middle of the rewards. */
const RewardChip = ({ item }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 52 }}>
    <img
      src={item.icon}
      alt={item.label || ''}
      draggable={false}
      style={{
        width: 40, height: 40, objectFit: 'contain',
        borderRadius: 9, background: COL.well, padding: 3,
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
      }}
      onError={(e) => {
        const box = e.currentTarget.parentNode;
        if (box && box.parentNode) box.parentNode.removeChild(box);
      }}
    />
    <div style={{ fontSize: 9, lineHeight: 1.15, color: COL.muted, textAlign: 'center' }}>
      {item.label || ''}
    </div>
  </div>
);

/* v2.3.1298 (ChatGPT round-5 Quests): the focused quest page — pushed
   into the sheet from any quest row.  Status, objective, quest giver,
   rewards (with the coin sprite, not just an abbreviation), and a
   Track/Untrack toggle (client-side pin; the tracked quest sorts to
   the top of compact + Active).  For a READY quest the destination is
   the dominant instruction.  Accepting/turning-in stays with the NPCs
   — this page never adds wire surface. */

export const QuestDetailPanel = () => {
  const [, force] = useState(0);
  /* v2.3.1704: the turn-in XP picker used to live here — see the long note by
     the action button below for why it is gone.  The picker itself is NOT
     dead: the in-world dialogue (src/ui/panels/QuestPanel.jsx) still carries
     it, and that is now the only door a turn-in goes through. */
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
  /* v2.3.1704 (Task 3, owner: "The quest UI is a little confusing what's
     rewards for the next quests vs what's rewarded for the current quest").
     `reward.item` is the DISPLAY name of the piece the turn-in pays (the
     server's QUEST_REWARDS entry is the authority — see questModel.rewardText).
     This page listed gold and XP only, so it and the in-world dialogue gave
     two different answers about what the same quest pays: the dialogue showed
     four item pictures, the pane showed a money figure and no items at all. */
  const item = quest.reward?.item ? String(quest.reward.item) : null;
  /* v2.3.1710: the same DISPLAY-ONLY `gives` table the in-world dialogue
     reads (src/data/gameSystems.js; mirror-audit.test.mjs pins every entry to
     a real server payout moment, so nothing here can promise an item the
     worker will not hand over).  Split by moment for the same reason the
     dialogue splits it — a picture with no "when" beside it is the confusion
     v2.3.1704 was about. */
  const givesAccept = (quest.gives || []).filter((g) => g && g.icon && g.when === 'accept');
  const givesFinish = (quest.gives || []).filter((g) => g && g.icon && g.when === 'complete');

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
      {/* ═══ v2.3.1704: THIS IS THE WHOLE OF THE READY STATE NOW ═══
          Owner: "Disable turning in quest rewards (completion) through the
          quest pane.  It's getting messed up."
          There used to be a Turn In button (and an XP-skill picker) directly
          under this banner, so the banner said "go and see him" while the
          control underneath offered to skip the walk — two contradictory
          instructions, one of which is the one the owner wants gone.  With the
          button removed the banner is no longer decoration next to an action;
          it IS the action, so it says where to go and what happens there,
          calmly and in full.
          Proximity is what makes this reasonable: since v2.3.1701 his dialogue
          opens on its own when you walk up to him, so "go and see him" costs a
          walk and no tapping. */}
      {status === 'Ready' && (
        <div style={{
          margin: '6px 0 8px',
          padding: '10px 12px',
          borderRadius: 8,
          background: COL.accentFill,
          border: `1px solid ${COL.accent}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COL.accent }}>
            Ready to hand in — go and see {quest.npc}.
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: COL.text2, marginTop: 3 }}>
            Walk up to {quest.npc} in town and he&rsquo;ll open the conversation
            himself. He pays the reward there.
          </div>
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
      {/* ═══ v2.3.1704: SAY WHICH QUEST, AND SAY WHEN ═══
          Owner: "The quest UI is a little confusing what's rewards for the
          next quests vs what's rewarded for the current quest."
          The heading was the bare word "Rewards" over two numbers, on a page
          the player reached by tapping a row in a list of several quests — so
          nothing on screen tied the figures to the quest they belonged to.
          Naming the quest in the heading is the cheapest possible fix and the
          only one that survives the player arriving here from anywhere.
          It also states the MOMENT ("for finishing"), because a quest has two
          payout moments — the kit the giver hands over when you say yes, and
          the payout for coming back — and this block has only ever described
          the second one while the in-world dialogue draws both.
          The item joins the line for the same reason: it is part of what
          finishing pays, and listing gold and XP alone made this pane and the
          dialogue disagree about the same quest. */}
      {/* v2.3.1710: what he hands over for SAYING YES, shown only while the
          quest is still on offer — once it is active this kit is already in
          the bag, and re-drawing it would read as a second payout.  It sits
          ABOVE the finishing rewards because that is the order the player
          meets them in. */}
      {status === 'Available' && givesAccept.length > 0 && (
        <>
          <div style={{ padding: '6px 2px 2px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: COL.muted }}>
            He hands you now
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '2px 2px 4px' }}>
            {givesAccept.map((g, i) => <RewardChip key={g.icon + i} item={g} />)}
          </div>
        </>
      )}

      {(gold > 0 || xp > 0 || item || givesFinish.length > 0) && (
        <>
          <div style={{ padding: '6px 2px 2px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: COL.muted }}>
            For finishing &ldquo;{quest.title}&rdquo;
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '2px 2px 4px', flexWrap: 'wrap' }}>
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
            {/* v2.3.1710: the NAME only when there is no picture of it.  With
                a chip below carrying the same words under the art, printing
                the name here too says "Iron Greaves" twice in four lines —
                and life_1's pickaxe is the case that keeps this branch alive:
                the server grants it, no art for it exists in the repo, so
                text is the only way it appears at all. */}
            {item && givesFinish.length === 0 && (
              <span style={{ fontSize: 13.5, fontWeight: 700, color: COL.text }}>{item}</span>
            )}
          </div>
          {givesFinish.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '2px 2px 4px' }}>
              {givesFinish.map((g, i) => <RewardChip key={g.icon + i} item={g} />)}
            </div>
          )}
          {/* The one line that removes the ambiguity outright: this quest's
              reward is paid when THIS quest is handed in, not before. */}
          <div style={{ fontSize: 11, color: COL.muted, padding: '0 2px 8px' }}>
            Paid by {quest.npc} when you hand this quest in.
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
      {/* ═══ v2.3.2195: AND THE ACCEPT HALF IS GONE TOO ═══
          Owner: "the landscape quest module lets you accept a quest from the
          menu (this was disabled a while ago and should remain disabled).  I
          did not receive weapons from mayor bro for first quest done correctly
          by walking up to him after accepting the quest in the module."

          The second sentence is the bug and it explains the first.  The
          server DOES pay the starter kit on accept, from either door
          (_handleQuestAccept, grantOnAccept) -- so the sword and shield were
          either granted silently, with no giver, no dialogue and no line
          naming them, or their grant failed the way that path is deliberately
          allowed to fail (an occupied slot or a full stash must not stop a
          quest being accepted).  Then Mayor Bro had nothing to hand over,
          because the quest was already active.  Either way the player did the
          arc correctly and watched the handover moment not happen.

          WHAT WAS HERE, and why it went.  v2.3.1665 added this button when
          town NPCs did not exist (S.npcs = [] since v2.3.214), so the quest
          system had no door at all; v2.3.1669 kept it once Mayor Bro was back,
          on the argument that "a panel route means the arc does not depend on
          finding an NPC on a small screen".  That argument is now spent: the
          owner walked up to him.  What the panel road cannot do is BE the
          moment -- the kit is a thing a person hands you, and a list page can
          only make it appear in a bag.

          This is the same removal, for the same reason, as v2.3.1704 took the
          turn-in half out of this pane: two doors sent the same message and
          they were never the same door.  Nothing leaves the wire --
          `quest_accept` is unchanged and is still sent by the dialogue
          (src/game/quests.js).  This is a UI door closing, not a protocol
          change, so no allowlist work applies (docs/TRAPS.md #18 is about the
          opposite direction).

          THE COST, stated: quests are now startable only by finding their
          giver.  That is the owner's call and it is what makes the starter kit
          a handover again.  The tracked-quest arrow and the quest coach both
          still point at the giver, so "find him" is a signposted job rather
          than a search. */}

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
              /* v2.3.1704: was 8.5 — below the 10px floor the UI has had since
                 v2.3.1239, and this is the label that says WHOSE words these
                 are, which Task 3's whole "which quest is this" problem needs
                 legible.  The row it sits in already reserves the height. */
              fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
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
