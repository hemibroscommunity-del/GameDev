import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { trackedQuestId, setTrackedQuest } from '../sheet/questModel.js';
import { questDetailBus } from '../sheet/questDetailBus.js';
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3615: "tap" reads "click" on a computer */
import { questJournalPage, questById } from '../sheet/questJournalModel.js';   /* v2.3.3944: the journal's page */
import { QuestJournalPage, useJournalTap } from './QuestJournalPage.jsx';

/* v2.3.1298 (ChatGPT round-5 Quests): the focused quest page — pushed into
   the sheet from any quest row (and, since F1, from the pinned quest card).

   ═══ v2.3.3944: THE JOURNAL'S PAGE ═══
   The owner, 2026-11-02: "Make it a place that makes it clear which quest
   they are on, what's required, where to go, who was talked to and what to
   do next, etc. show rewards preview, what was handed during the quest too."
   The page is the journal's now (QuestJournalPage: NOW, WHERE with Show on
   map, WHO, GIVEN TO YOU, REWARD with its +5 Achievement Points, NEXT), the
   same one the quest list opens on, then Track.

   What stays as it was, and why:
   - NO Accept and NO Turn In here.  v2.3.1704 (owner: "Disable turning in
     quest rewards (completion) through the quest pane.  It's getting messed
     up") and v2.3.2195 (owner: "the landscape quest module lets you accept a
     quest from the menu (this was disabled a while ago and should remain
     disabled)" -- accepting here skipped Mayor Bro handing over the starter
     weapons).  A quest is taken and handed in with its giver, in the world;
     this page never adds wire surface.
   - Track (v2.3.3522): the minimap's gold star, the world map's road and the
     pinned quest card follow the tracked quest (game/trackedQuest.js);
     data-quest-track and data-quest-track-note for mp-trackquest.
   - What the giver hands you for saying yes is shown in every state now, not
     only while the quest is on offer (v2.3.1710 hid it once taken, so the
     page forgot the sword and shield the moment you had them). */

export const QuestDetailPanel = () => {
  const [, force] = useState(0);
  const tap = useJournalTap();
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const qid = questDetailBus.selected();
  const S = getState();
  const page = questById(qid) ? questJournalPage(S, qid) : null;

  if (!page) {
    return <div style={panelStyle}><div style={{ padding: 20, color: COL.text2, fontSize: 15 }}>Quest not found.</div></div>;
  }
  const inHand = page.status === 'active' || page.status === 'ready';
  const tracked = trackedQuestId() === page.id;

  return (
    <div style={{ ...panelStyle, overflowY: 'auto' }}>
      <QuestJournalPage page={page} />
      {/* Track: a quest in hand only (a pin for "what am I doing") */}
      {inHand && (
        <button
          type="button"
          data-quest-track={tracked ? 'on' : 'off'}
          {...tap(() => { setTrackedQuest(trackedQuestId() === page.id ? null : page.id); force((v) => v + 1); })}
          style={{
            width: '100%',
            minHeight: 48,
            marginTop: 10,
            background: tracked ? COL.accentFill : 'transparent',
            border: `1px solid ${tracked ? COL.accent : COL.borderStrong}`,
            borderRadius: 10,
            color: tracked ? COL.accent : COL.text,
            fontFamily: 'inherit',
            fontSize: 16, fontWeight: 700,
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >{tracked ? deskWords('★ Tracked — tap to untrack') : '☆ Track this quest'}</button>
      )}
      {/* v2.3.3522: what tracking does, said once it is on */}
      {inHand && tracked && (
        <div data-quest-track-note="" style={{ fontSize: 14, color: COL.text2, padding: '6px 2px 0', textAlign: 'center' }}>
          Your map's gold star follows this quest.
        </div>
      )}
      <div style={{ height: 26 }} />
    </div>
  );
};
