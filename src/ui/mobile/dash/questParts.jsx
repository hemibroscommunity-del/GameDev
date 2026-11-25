/* ═══ v2.3.6620: THE QUESTS PAGE'S SHARED PARTS (card QP) ═══
 * The pills of a quest (its giver's face, his pin, the brass star of the one
 * you track), the quest path switch, and the Completed list, moved here from
 * QuestsPanel.jsx so that the old page (`?questpages=0`) and the pages
 * (QuestPages.jsx) draw the same ones.  Moved as they were: the notes are
 * theirs. */
import React, { useState } from 'react';
import { COL } from './common.js';
import { deskWords } from '@/game/deskWords.js';
import { DailyRewardsCard } from './DailyRewardsCard.jsx'; /* v2.3.3140: the way into the daily quests and the season */
import { TRAIL_STYLES, isTrailOff, getShownTrailStyle, setTrailShown, GROUND_PATH } from '@/game/questTrailStyle.js'; /* v2.3.2896; v2.3.2992 GROUND_PATH */
import { useScrollTap } from '../sheet/scrollTap.js'; /* v2.3.2896: the switch sits in a scroller */
import { npcPortrait } from './QuestJournalPage.jsx';
import { apTotalText } from '@/game/questJournal.js';
import { QUEST_PIN, OWNER_ICON } from '@/data/ownerIcons.js';   /* v2.3.4394: the givers' own pins, on the list's pills; the prize wheel on Daily */
import { SAY } from '@/data/say/questsPanel.js';   /* v2.3.6350: its words, in the one table (docs/specs/player-words.md, W1) */
import { say } from '@/game/say.js';

/* ═══ v2.3.2896: THE QUEST PATH SWITCH, WHERE THE QUESTS ARE ═══
   Owner: "Allow an option to switch off the footprints from the quest
   dashboard button too."  Settings -> Quest path already had Off as one of
   its chips, but Settings is two taps deep behind More, and the Quests
   button is where a player's head is when the road under their feet is the
   thing in the way.  So the same setting is reachable here as a plain
   on/off -- not a second copy of the style picker: Off writes the very 'off'
   the Settings row stores, and On brings back whichever look was last showing
   (questTrailStyle.setTrailShown), so the two places can never disagree.

   The whole row is the target, not just the pill: a 44px row is the touch
   floor, and a 46px pill at the edge of a skinny landscape column is not.
   Through useScrollTap because the row lives inside the panel's scroller,
   where a thumb that drifts ~15px has its tap confiscated (scrollTap.js). */
export const PathSwitch = () => {
  const [, force] = useState(0);
  const scrollTap = useScrollTap();
  /* Read every render, not cached in state: it is a variable read, and the
     Settings row can change it while this panel is unmounted. */
  const on = !isTrailOff();
  const look = TRAIL_STYLES.find((s) => s.id === getShownTrailStyle());
  return (
    <div
      role="switch" aria-checked={on} aria-label={say(SAY, 'questsPanel.path')}
      data-questpath-switch={on ? 'on' : 'off'}
      /* role="switch" is not one the click-sound delegate recognises
         (button / role="button"), so the row says so itself */
      data-uisfx="click"
      {...scrollTap(() => { setTrailShown(!on); force((v) => v + 1); })}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        minHeight: 44, padding: '4px 4px',
        borderBottom: `1px solid ${COL.divider}`,
        cursor: 'pointer', touchAction: 'manipulation',
      }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: COL.text }}>{say(SAY, 'questsPanel.path')}</span>
        <span style={{
          display: 'block', fontSize: 14, color: COL.text2, marginTop: 1,   /* v2.3.3944: 13.5 / 11.5 were, the journal's floor is 13 */
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{on ? say(SAY, 'questsPanel.pathOn', { look: look ? look.label : say(SAY, 'questsPanel.pathOnWord') }) : say(SAY, 'questsPanel.pathHidden')}</span>
      </span>
      {/* The Settings Toggle's pill, same sizes and states (brass-soft fill +
          brass knob when on, raised + muted knob when off). */}
      <span aria-hidden="true" style={{
        display: 'block', flex: 'none',
        width: 46, height: 26,
        borderRadius: 999,
        background: on ? COL.accentFill : COL.raised,
        border: `1px solid ${on ? COL.accent : COL.borderStrong}`,
        boxSizing: 'border-box',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute',
          top: 2, left: on ? 22 : 2,
          width: 20, height: 20,
          borderRadius: '50%',
          background: on ? COL.accent : COL.muted,
          boxShadow: '0 1px 2px rgba(0,0,0,.35)',
          transition: 'left .15s',
        }} />
      </span>
    </div>
  );
};


/* a pill's picture: the giver's pin for a quest (ownerIcons QUEST_PIN, the
   ones over heads and on the maps, behind the loading screen already), a
   brass star on the one you track, a green tick for Done, the prize wheel
   for the daily rewards */
/* ═══ v2.3.4394: THE GIVER'S FACE ON HIS QUEST ═══
   The owner: "it would be a nice touch to display the profile picture of each
   NPC beside the quest."  A quest's pill wears its giver's portrait (the head
   the dialogue and the journal's WHO already show: QuestJournalPage
   npcPortrait), with the quest's state as a small mark on its corner -- the
   pin he wears in the world, or the brass star of the quest you track -- so
   one glance says whose quest it is and how it stands.  A giver with no
   portrait keeps the pin alone. */
export const FaceIcon = ({ npc, kind }) => {
  const face = npc ? npcPortrait(npc) : null;
  if (!face) return <PinIcon kind={kind} px={18} />;
  return (
    <span data-quest-pill-face={npc} style={{ position: 'relative', flex: 'none', width: 26, height: 26, display: 'block' }}>
      <img src={face} alt="" draggable={false} style={{
        width: 26, height: 26, display: 'block', objectFit: 'contain', imageRendering: 'pixelated',
        borderRadius: 13, background: COL.well, border: `1px solid ${COL.borderStrong}`, boxSizing: 'border-box',
      }} />
      <span style={{ position: 'absolute', right: -5, bottom: -4, display: 'flex' }}><PinIcon kind={kind} px={14} /></span>
    </span>
  );
};

export const PinIcon = ({ kind, px }) => {
  if (kind === 'tracked') return <span aria-hidden="true" data-quest-pill-icon="tracked" style={{ flex: 'none', width: px, textAlign: 'center', fontSize: Math.max(13, px), lineHeight: 1, color: COL.accent, textShadow: '0 0 2px #0B161B, 0 0 2px #0B161B' }}>★</span>;
  if (kind === 'done') return <span aria-hidden="true" data-quest-pill-icon="done" style={{ flex: 'none', width: px, textAlign: 'center', fontSize: px - 2, lineHeight: 1, fontWeight: 800, color: '#7FD6AC' }}>✓</span>;
  /* the daily rewards wear the owner's prize wheel (the Daily Rewards window's own), never a second star */
  const src = kind === 'daily' ? OWNER_ICON.prizeWheel.src : kind === 'ready' ? QUEST_PIN.ready : kind === 'offer' ? QUEST_PIN.offer : QUEST_PIN.waiting;
  return <img data-quest-pill-icon={kind} src={src} alt="" draggable={false} style={{ flex: 'none', width: px, height: px, objectFit: 'contain' }} />;
};

export const pillStyle = (on, warm) => ({
  display: 'flex', alignItems: 'center', gap: 7, width: '100%', height: 36, padding: '0 8px 0 4px', boxSizing: 'border-box',
  borderRadius: 999,
  /* a lit pill is a tint over the same well, never a hole (NavRail, v2.3.2176) */
  background: on ? `linear-gradient(0deg, ${COL.accentFill}, ${COL.accentFill}), ${COL.wellSoft}` : COL.wellSoft,
  border: `1px solid ${on ? COL.accent : warm ? COL.edgeWarm : COL.tileBor}`,
  color: on ? COL.accent : COL.text, fontSize: 13, fontWeight: 700, textAlign: 'left',
});
export const pillHit = (row) => ({
  display: 'flex', alignItems: 'center', minHeight: 44, margin: 0, padding: 0, flex: row ? '0 0 auto' : undefined, width: row ? undefined : '100%',
  background: 'transparent', border: 'none', fontFamily: 'inherit', cursor: 'pointer', touchAction: 'manipulation',
});


/* ═══ v2.3.6620: THE COMPLETED LIST, ONE COPY ═══
   What the old page's Done opened (v2.3.3944 / v2.3.4394), as a component the
   pages' Completed tab draws too: the points your quests have paid, then each
   quest handed in with its +5 AP; a tap opens it (`onPick(id)`).  `tap` is
   the page's journal tap (QuestJournalPage useJournalTap). */
export const DonePane = ({ L, tap, onPick }) => (
  <div data-quest-pane="done">
    {/* v2.3.3944: the points every hand-in pays (server quests.js
        QUEST_AP_REWARD), added up */}
    <div data-journal-ap={L.apTotal} style={{ padding: '4px 2px 6px', fontSize: 15, fontWeight: 800, color: COL.text }}>
      <span style={{ color: COL.accent }}>★</span> {apTotalText(L.apTotal)}
    </div>
    {L.done.map((r) => (
      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${COL.divider}` }}>
        <button type="button" data-quest-done-row={r.id} {...tap(() => onPick(r.id))} style={{
          display: 'block', flex: 1, minWidth: 0, minHeight: 44, padding: '6px 2px', background: 'transparent', border: 'none',
          color: COL.text, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation',
        }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: COL.text2, lineHeight: 1.3 }}><span style={{ color: '#7FD6AC' }}>✓</span> {r.title}</span>
        </button>
        <span data-quest-done-ap={r.ap} style={{ flex: 'none', fontSize: 14, fontWeight: 800, color: COL.text, padding: '0 4px' }}>{say(SAY, 'questsPanel.doneAp', { ap: r.ap })}</span>
      </div>
    ))}
    {/* v2.3.2992: the road on the ground is put away -- the way is on the
        minimap (questTrailStyle.js GROUND_PATH) -- so its switch goes
        with it, back with `?questpath` */}
    {GROUND_PATH && <PathSwitch />}
  </div>
);

/* v2.3.6620: what Daily opened on the old page, one copy (the pages' Daily tab draws it too) */
export const DailyPane = () => (
  <div data-quest-pane="daily">
    <div style={{ padding: '4px 2px 8px', fontSize: 15, lineHeight: 1.4, color: COL.text2 }}>{deskWords('Your free spin and the day\'s rewards. Tap to open them.')}</div>
    {/* v2.3.3140: the daily quests and the season, one line */}
    <DailyRewardsCard />
  </div>
);
