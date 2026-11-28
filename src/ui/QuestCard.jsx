/* ═══ v2.3.3918: THE PINNED QUEST CARD, TOP LEFT ═══
 *
 * Moved out of BroTown.jsx (where it was `data-quest-hud`, v2.3.1665 on) so
 * the card's rules live in one small file.  What it says is
 * src/game/questCard.js's (the owner's "[Into the Wild · 3/5 · Defeat 5
 * monsters]"); this file only draws it.
 *
 *   - a quest in hand: the title, "3/5" at its right, the objective line; the
 *     green check (QUEST_ART.check, v2.3.3048) ONLY once it is ready, with
 *     "Done! Go back to <giver>".  A tap opens that quest's page (the quest
 *     page's Track picks which quest this is: game/trackedQuest.js).
 *   - between two quests: the tour's next step and who gives it (v2.3.3525,
 *     unchanged), taking no taps.
 *
 * v2.3.3918: the v2.3.1714 tap-to-fold is retired -- the owner's tracker is
 * "tappable" to open the quest, and a compact card no longer needs folding.
 * The old 'bt_quest_hud_collapsed' preference is simply no longer read.
 *
 * Placed at top: var(--bt-hud-top, 56px), so a frame above it (the top bar's
 * player status) can push it down by setting the variable. *
 * ═══ v2.3.6781: ONE LINE UNDER THE CHARACTER HUD (card UI3, PR 2) ═══
 * The owner, 2026-11-26: "Quest: Smaller, single-line tracker underneath."
 * While the HUD is up (src/ui/hud/CharacterHud.jsx; game/charHud.js
 * charHudOn) the card is ONE line under it, `title · count · objective`
 * (charHudQuestLine), or between quests `Next: <quest> · Talk to <giver>` and
 * "+n more": never wrapping, the HUD's width, 30 px drawn in a 44 px hit box.
 * Its tap opens the quest; there is no fold (the one line IS the folded
 * form).  Every data-quest-hud mark stays.  The HUD moves --bt-hud-top down
 * by its own height (game.css), so this card's top line is unchanged.  Under
 * `?hud=0` the card is exactly as before.
 *
 * ═══ v2.3.6790: AND THE LINE LEAVES THE WORLD (card UI3, PR 10) ═══
 * The owner, 2026-11-27: "Maybe just keep quests in quest area for now.
 * Leave only character hud in top left corner."  With the HUD up this card
 * draws NOTHING (game/hudCorner.js cornerQuest 'none'): the tracked quest,
 * its steps and its ready live on the Quests page, whose button keeps its
 * ready dot.  `?questline=1` (remembered) brings the one line back, and
 * while it is drawn html[data-questline="1"] (a write, never a read) moves
 * the status column under it (game.css).  `?hud=0`: main's card, as before.
 */
import React, { useEffect, useState } from 'react';
import {
  QUEST_CHAINS, QUEST_STATUS, questObjectiveDone, questSteps,
} from '@/data/gameSystems.js';
import { tourOffer } from '@/game/questRoute.js';
import { TOUR_MEET } from '@/game/tour.js';
import { folkDisplayName } from '@/data/folkNames.js';   /* v2.3.4048: the giver's nickname */
import { trackedFirst } from '@/game/trackedQuest.js';
import { questCardWords } from '@/game/questCard.js';
import { QUEST_ART } from '@/ui/panels/questArt.jsx';
import { questDetailBus } from '@/ui/mobile/sheet/questDetailBus.js';
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';
import { SAY } from '@/data/say/questCard.js';   /* v2.3.6350: its words, in the one table (docs/specs/player-words.md, W1) */
import { say } from '@/game/say.js';
import { charHudQuestLine } from '@/game/charHud.js';   /* v2.3.6781: under the character HUD, one line */
import { cornerQuest } from '@/game/hudCorner.js';   /* v2.3.6790: the corner holds the HUD alone (or the line, ?questline=1) */
import { SAY as HUD_SAY } from '@/data/say/charHud.js';
import { menus3On } from '@/ui/menus3/menus3Switch.js';   /* v2.3.6863 (card MN step 7): the quest line opens its quest in the new panel */
import { menus3Go } from '@/ui/menus3/menus3Wire.js';

const GOLD = '#D8A94D';
const GREEN = '#59BF91';

const boxStyle = (extra) => ({
  position: 'absolute',
  top: 'var(--bt-hud-top, 56px)',
  left: 8,
  zIndex: 17,
  background: 'rgba(17,25,29,.85)',
  padding: '4px 10px',
  borderRadius: 6,
  /* v2.3.1711: 248 keeps the objective to one or two lines on a 390px phone */
  maxWidth: 248,
  ...extra,
});
const markStyle = { width: 18, height: 18, flex: '0 0 auto', objectFit: 'contain' };
const titleRow = (color) => ({
  fontSize: 14,   /* v2.3.4207: a smidge larger (was 13) -- the owner */ fontWeight: 700, lineHeight: 1.25,
  display: 'flex', alignItems: 'center', gap: 6, color,
});
/* v2.3.1711: .72 white clears 4.5:1 on the slate */
const subLine = { fontSize: 11, lineHeight: 1.3, marginTop: 1, color: 'rgba(255,255,255,.72)' };
/* v2.3.4207: the next step reads at a glance -- bold and fully white */
const stepLine = { ...subLine, fontWeight: 700, color: '#fff' };
/* v2.3.6781: the one line (charHud.css's palette: the recessed panel, the
   border, the off-white text, the gold).  The line is 30 drawn at the top of
   its 44 hit box; the box is transparent below it. */
const LINE_HIT = { position: 'absolute', top: 'var(--bt-hud-top, 56px)', left: 8, zIndex: 17, width: 184, height: 44, boxSizing: 'border-box' };
const LINE_DRAWN = (edge) => ({
  height: 30, boxSizing: 'border-box', padding: '0 8px 0 6px', display: 'flex', alignItems: 'center', gap: 5,
  background: 'rgba(14,29,41,.88)', border: '1px solid ' + edge, borderRadius: 6,
  fontSize: 12, fontWeight: 700, lineHeight: '28px', color: '#F1F0E9',
});
const LINE_TEXT = { flex: '1 1 auto', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const lineMark = { width: 14, height: 14, flex: '0 0 auto', objectFit: 'contain' };

/* v2.3.4207: THE TAP-TO-FOLD IS BACK (the owner: "bring back the feature where
   if you tap the top left active quest it minimizes a bit to just show the
   title").  v2.3.3918 had retired it for a tap that opens the quest page; that
   page now opens from the small arrow on the expanded card.  Remembered under
   the old key. */
const FOLD_KEY = 'bt_quest_hud_collapsed';
function readFold() { try { return localStorage.getItem(FOLD_KEY) === '1'; } catch (e) { return false; } }

/* v2.3.3918: the card's tap -- the quest's own page in the quest screens.
   One place, so a move of the quest pages (under the "Bro" tab) changes it
   once. */
export function openQuestPage(qid) {
  /* v2.3.6863: under ?menus3, World · Quests on THAT quest's page (its Back the Quests' own page) */
  if (menus3On() && typeof qid === 'string' && qid && menus3Go('hud.questLine', { quest: qid })) return;
  try {
    questDetailBus.select(qid);
    dashboardPanelBus.open('quests');
    dashboardPanelBus.push('questDetail');
  } catch (e) { /* a sheet not mounted yet: nothing to open */ }
}

export default function QuestCard({ rpgState, live }) {
  const [folded, setFolded] = useState(readFold);
  /* v2.3.6790: 'card' (no HUD), 'line' (?questline=1) or 'none' (the HUD alone) */
  const corner = cornerQuest();
  useEffect(() => {
    if (corner !== 'line') return undefined;
    try { document.documentElement.setAttribute('data-questline', '1'); } catch (e) { /* no page */ }
    return () => { try { document.documentElement.removeAttribute('data-questline'); } catch (e) { /* no page */ } };
  }, [corner]);
  if (!rpgState || corner === 'none') return null;
  const liveRpg = (live && live.rpg) || rpgState;
  let active = Object.entries(rpgState._quests || {})
    .filter(([, status]) => status === QUEST_STATUS.active)
    .map(([qid]) => QUEST_CHAINS[qid])
    .filter(Boolean);

  if (active.length === 0) {
    /* v2.3.3525: between two steps of the tour, who is next (questRoute.js
       tourOffer); the gold road leads to him.  Takes no taps. */
    let to = null;
    try { to = tourOffer(liveRpg, live); } catch (e) { to = null; }
    if (!to) return null;
    const talk = 'Talk to ' + folkDisplayName(to.npc) + (TOUR_MEET[to.npc] ? ' ' + TOUR_MEET[to.npc] : '');
    if (corner === 'line') {
      /* v2.3.6781: one line under the HUD; takes no taps, as before */
      return (
        <div data-quest-hud="1" data-quest-hud-next={to.quest.id} data-quest-hud-oneline="1"
          style={{ ...LINE_HIT, pointerEvents: 'none' }}>
          <div style={LINE_DRAWN('rgba(234,196,116,.45)')}>
            <img src="/icons/ui/panel-quests.webp" alt={say(SAY, 'questCard.markQuest')} draggable={false} style={lineMark} />
            <span style={LINE_TEXT}>{charHudQuestLine(null, { next: say(SAY, 'questCard.next', { quest: to.quest.title }), talk })}</span>
            {to.more > 0 && (
              <span data-quest-hud-more={to.more} style={{ flex: '0 0 auto', color: '#EAC474', whiteSpace: 'nowrap' }}>
                {say(HUD_SAY, 'charHud.more', { more: to.more })}
              </span>
            )}
          </div>
        </div>
      );
    }
    return (
      <div data-quest-hud="1" data-quest-hud-next={to.quest.id}
        style={boxStyle({ pointerEvents: 'none', border: '1px solid rgba(216,169,77,.35)' })}>
        <div style={titleRow(GOLD)}>
          <img src="/icons/ui/panel-quests.webp" alt={say(SAY, 'questCard.markQuest')} draggable={false} style={markStyle} />
          <span style={{ flex: 1, minWidth: 0 }}>{say(SAY, 'questCard.next', { quest: to.quest.title })}</span>
        </div>
        <div style={subLine}>{talk}</div>
        {/* v2.3.3525: others have work too, and where they show */}
        {to.more > 0 && (
          <div data-quest-hud-more={to.more} style={{ ...subLine, color: 'rgba(216,169,77,.85)' }}>
            {say(SAY, 'questCard.more', { more: to.more })}
          </div>
        )}
      </div>
    );
  }

  /* v2.3.3522: the quest you TRACK first, else the first */
  active = trackedFirst(active.map((q) => ({ qid: q.id, q }))).map((e) => e.q);
  const q = active[0];
  /* v2.3.1914: the live rpg, so the count and the check agree */
  const done = questObjectiveDone(q, live, rpgState);
  let steps = null;
  try { steps = questSteps(q, rpgState, live); } catch (e) { steps = null; }
  const w = questCardWords(q, { done, steps, rpg: liveRpg });

  if (corner === 'line') {
    /* v2.3.6781: one line under the HUD -- the owner's "[Into the Wild · 3/5 ·
       Defeat 5 monsters]"; a tap opens the quest's page; no fold */
    const tone = done ? GREEN : '#EAC474';
    return (
      <div
        data-quest-hud="1"
        data-quest-hud-quest={q.id}
        data-quest-hud-ready={done ? '1' : '0'}
        data-quest-hud-oneline="1"
        role="button"
        aria-label={say(SAY, 'questCard.openAria')}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); openQuestPage(q.id); }}
        style={{ ...LINE_HIT, pointerEvents: 'auto', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        <div style={LINE_DRAWN(done ? 'rgba(61,220,151,.45)' : '#4B6275')}>
          <img
            src={done ? QUEST_ART.check : '/icons/ui/panel-quests.webp'}
            alt={say(SAY, done ? 'questCard.markReady' : 'questCard.markQuest')}
            draggable={false}
            data-quest-hud-mark={done ? 'ready' : 'quest'}
            className={done ? 'bt-quest-hud-ready' : undefined}
            style={lineMark}
          />
          <span style={{ ...LINE_TEXT, color: tone }} data-quest-hud-line="1" data-quest-hud-count={w.count || undefined}
            title={charHudQuestLine(w, null)}>
            {charHudQuestLine(w, null)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      /* v2.3.3481: the quest coach finds this card by it (QuestCoach.jsx) */
      data-quest-hud="1"
      data-quest-hud-quest={q.id}
      data-quest-hud-ready={done ? '1' : '0'}
      role="button"
      title={say(SAY, folded ? 'questCard.show' : 'questCard.fold')}
      data-quest-hud-folded={folded ? '1' : '0'}
      /* v2.3.1714: the world listens for taps under the HUD; stop the press
         here or the tap also walks the bro to the top-left corner */
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        const next = !folded;
        setFolded(next);
        try { localStorage.setItem(FOLD_KEY, next ? '1' : '0'); } catch (e2) { /* private mode */ }
      }}
      style={boxStyle({
        /* an ancestor turns pointer events off so the world stays tappable */
        pointerEvents: 'auto',
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        border: '1px solid ' + (done ? 'rgba(61,220,151,.3)' : 'rgba(255,255,255,.1)'),
        /* UI-BIBLE Part 2: a 44pt hit area even when the card looks smaller */
        minHeight: 44,
        boxSizing: 'border-box',
      })}
    >
      <div style={titleRow(done ? GREEN : GOLD)}>
        {/* v2.3.3048: the owner's green check -- now ONLY when ready (v2.3.3918) */}
        <img
          src={done ? QUEST_ART.check : '/icons/ui/panel-quests.webp'}
          alt={say(SAY, done ? 'questCard.markReady' : 'questCard.markQuest')}
          draggable={false}
          data-quest-hud-mark={done ? 'ready' : 'quest'}
          className={done ? 'bt-quest-hud-ready' : undefined}
          style={markStyle}
        />
        <span style={{ flex: 1, minWidth: 0 }}>{w.title}</span>
        {w.count && (
          <span data-quest-hud-count={w.count}
            style={{ flex: '0 0 auto', fontVariantNumeric: 'tabular-nums', color: done ? GREEN : '#fff' }}>
            {w.count}
          </span>
        )}
      </div>
      {!folded && (
        <div data-quest-hud-line="1" style={done ? { ...stepLine, color: GREEN } : stepLine}>
          {w.line}
        </div>
      )}
      {!folded && (
        <div
          data-quest-hud-open="1" role="button" aria-label={say(SAY, 'questCard.openAria')}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openQuestPage(q.id); }}
          style={{ ...subLine, color: GOLD, textAlign: 'right', touchAction: 'manipulation', padding: '2px 0' }}>
          {say(SAY, 'questCard.open')}
        </div>
      )}
    </div>
  );
}
