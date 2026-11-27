/* ═══ v2.3.6695: QUEST HISTORY, FEATS' DOOR TO THE QUESTS YOU FINISHED (card UI2-feats) ═══
 *
 * The master specification 4.5: "Maintain the original consolidation and
 * reuse existing records/quest data."  So this is the Quests pages' own
 * Completed list, CALLED AS IT IS, never a copy: dash/questParts.jsx DonePane
 * (the AP every hand-in paid, added, then each quest handed in with its +5)
 * drawn from sheet/questJournalModel.js questJournalList's rows, with the
 * journal's own tap (QuestJournalPage.jsx useJournalTap).  A row opens that
 * quest's page through the Quests pages' own road (src/game/questPages.js
 * questOpens, the quest put in questDetailBus), as their Completed page does:
 * no line of those files is edited.  Another player's quests are their
 * phone's count, which the worker does not keep: "Not shared". */
import React from 'react';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { useClock } from './CharacterPage.jsx';
import { questJournalList, journalCtx } from './questJournalModel.js';
import { questDetailBus } from './questDetailBus.js';
import { DonePane } from '../dash/questParts.jsx';
import { useJournalTap } from '../dash/QuestJournalPage.jsx';
import { questOpens } from '@/game/questPages.js';
import { Ui2Empty, ui2RootClass } from '@/ui/kit/index.js';
import { SAY } from '@/data/say/feats.js';
import { say } from '@/game/say.js';

/* a row: that quest's page, the Quests pages' own road */
const openQuest = (id) => {
  const a = questOpens({ kind: 'row', id });
  if (!a) return;
  questDetailBus.select(a.sel);
  dashboardPanelBus.go(a);
};

export function QuestHistory({ S, who }) {
  useClock(() => String(questJournalList(S, journalCtx(S)).done.length), 2000);
  const tap = useJournalTap();
  if (who != null) {
    return <div className={ui2RootClass() + ' u2-ql-page'} data-feats-quests="other"><Ui2Empty kind="absent" title={say(SAY, 'feats.notShared')} /></div>;
  }
  const L = questJournalList(S, journalCtx(S));
  return (
    <div className={ui2RootClass() + ' u2-ql-page'} data-feats-quests={L.done.length}>
      {L.done.length ? <DonePane L={L} tap={tap} onPick={openQuest} />
        : <Ui2Empty kind="absent" title={say(SAY, 'feats.questsNone')} how={say(SAY, 'feats.questsNoneHow')} />}
    </div>
  );
}

export default QuestHistory;
