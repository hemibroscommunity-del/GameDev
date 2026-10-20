import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState, QUALITY_PRISM, qualityInk } from './common.js';
import { panelVw } from '../playViewport.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { ACHV_TIERS, ACHV_MEDAL_SRC } from '@/data/achievements.js';
import { achvLive, achvSummary, achvRows, achvProgress, achvProgressShort, achvSplitWords, achvDateWords, ACHV_FILTERS, sendAchvTitle, achvTitleWaiting } from '@/game/achievements.js';
import { achvById } from '@/data/achievements.js';

/* ═══ v2.3.3527: THE ACHIEVEMENTS PAGE ═══
 * The owner, 2026-10-19: "Achievement points are something I'd like in the
 * game. You get it by completing the game. Some of them are through super
 * rare achievements. Although not as rare, an arena winner should be included
 * in that."  To the plan's six questions, "Go recommended on everything":
 * the More page's always-empty Journey tile becomes this page (decision 6),
 * and the super-rares are SHOWN before they are earned, never "???"
 * (decision 3) -- players hunt what they can see, as the kill roll's numbers.
 *
 * What it shows is the WORKER's (server/src/achievements.js, through
 * game/achievements.js S._achv): your AP, how many of the 23 you have, how
 * much of the AP they are worth beside the quests' and guild rungs', and a
 * row for each -- its picture, its name, how to earn it, its points in its
 * tier's colour (the armour's grade colours, v2.3.3142: common grey, rare
 * blue, the arena's orange, super-rare a rainbow) and the day you earned it,
 * or a lock.  A row that counts says how many times ("×3"); one you have not
 * earned says how far along you are where the worker already said
 * (game/achievements.js achvProgress).  Nothing here decides anything.
 *
 * Lantern Slate (docs/LANTERN-SLATE-SPEC.md): 48 px rows, 32 px chips in 44 px
 * hit boxes, the tier a thin EDGE on the pill (never a fill), the rainbow in
 * CSS (a gradient ring, the godly grade's own QUALITY_PRISM / qualityInk),
 * no filter.  Sideways the side column is ~238 px: the chips go two by two,
 * and nothing scrolls sideways.
 * Its own clock: it re-reads the record a few times a second (PetsPanel's).
 *
 * THE TITLE (the plan's Phase 3): an EARNED row offers "Use as title" -- the
 * achievement your card wears under your name (ui/panels/PlayerProfilePanel
 * .jsx), in place of the placeholder "Fishing Master" -- and the one you wear
 * says "Your title" with "Remove title" beside it; a row you have not earned
 * never offers it.  Each tap asks the worker (game/achievements.js
 * sendAchvTitle) and the buttons wait for its answer, a fresh achv_state:
 * the page never shows a title the worker did not keep (past ten changes in
 * a burst it keeps the old one, and the page says so by showing it).
 *
 * ═══ AND AFTER THE OWNER'S CHATGPT REVIEW (2026-10-19) ═══
 * "Keep the system; compact the overview, not the world": on the QA phone the
 * page showed about ONE of the 23 rows when it opened -- three lines of summary
 * and the chips over 191 px.  Each finding was checked against the code and
 * the owner's decisions before anything changed (docs/UI-DESIGN-NOTES.md
 * "Achievements"):
 *   - the AP, "9/23" and the title ride the drilled page's OWN header row, in
 *     the empty space right of "◂ ACHIEVEMENTS" (AchievementsHead, PANELS'
 *     `Head` in BottomDashboard.jsx); sideways that row is too narrow and the
 *     summary goes under it.  Opened with no header (a root page) the summary
 *     is the page's first line, as before;
 *   - a row is ONE line under its name, 48 px: the achievement's `clue` and
 *     its progress short ("4/9"), the rest cut with an ellipsis; a tap OPENS
 *     it in place (no card, no window): the whole of `how`, the progress in
 *     words, and on an earned row its title buttons -- the buttons no longer
 *     add a line to every earned row.  One row open at a time;
 *   - every name in the warm white (an unearned name in the muted grey read
 *     as "can't have it"), the picture still dimmed and the lock still there;
 *   - the AP split ("Achievements 1,840 AP · quests, guilds and more 0 AP")
 *     is one sentence at the END of the list and the total's tooltip;
 *   - NOT built: a "Closest first" sort (only six of the 23 rows have
 *     progress the worker sends), and the banner's smaller type (14/13 px
 *     would make the name smaller than its 16). */
const POLL_MS = 400;

const fmt = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US');

/* LeaderboardPanel's chip, the spec's: a 32 px pill in a 44 px hit box */
const chipHit = {
  minHeight: 44, padding: 0, margin: 0, background: 'transparent', border: 'none',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', touchAction: 'manipulation', minWidth: 0,
};
const chip = (active) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 32, padding: '0 12px',
  background: active ? COL.accentFill : 'transparent',
  color: active ? COL.accent : COL.text2,
  border: `1px solid ${active ? COL.accent : COL.border}`,
  borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
});

/* a tier's points as a pill: its colour as the edge and the words, the
   super-rare a rainbow ring round rainbow words */
function ApPill({ tier }) {
  const t = ACHV_TIERS[tier];
  const words = fmt(t.ap) + ' AP';
  const base = { flex: 'none', borderRadius: 999, fontSize: 11, fontWeight: 800, lineHeight: '15px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
  if (t.color === 'prismatic') {
    return (
      <span data-achv-pill={tier} title={t.label + ' · ' + words} style={{ ...base, display: 'inline-block', padding: 1.5, background: QUALITY_PRISM }}>
        <span style={{ display: 'block', padding: '0 7px', borderRadius: 999, background: COL.bg }}>
          <span style={qualityInk('godly')}>{words}</span>
        </span>
      </span>
    );
  }
  return (
    <span data-achv-pill={tier} title={t.label + ' · ' + words}
      style={{ ...base, padding: '0 7px', border: '1.5px solid ' + t.color, color: t.color }}>{words}</span>
  );
}

const Lock = () => (
  <svg data-achv-lock="" viewBox="0 0 12 14" width="11" height="13" role="img" aria-label="Not earned yet"
    style={{ flex: 'none', marginTop: 2 }}>
    <path d="M3.2 6.2V4.4a2.8 2.8 0 0 1 5.6 0v1.8" fill="none" stroke={COL.muted} strokeWidth="1.6" strokeLinecap="round" />
    <rect x="1.5" y="6" width="9" height="7.2" rx="1.6" fill={COL.muted} />
  </svg>
);

const Tick = ({ size = 11 }) => (
  <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true" style={{ flex: 'none' }}>
    <path d="M2 6.4l2.6 2.5L10 3.2" fill="none" stroke={COL.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* the title's buttons: a quiet 34 px pill in a 44 px hit box (the review:
   every control 44 px to the finger, the chips' own pattern) */
const titleHit = {
  minHeight: 44, padding: 0, margin: 0, background: 'transparent', border: 'none',
  display: 'inline-flex', alignItems: 'center', fontFamily: 'inherit', touchAction: 'manipulation',
};
const titlePill = (on) => ({
  display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 12px', borderRadius: 999, boxSizing: 'border-box',
  border: '1px solid ' + (on ? COL.borderStrong : COL.border), background: on ? COL.raised : 'transparent',
  color: on ? COL.text : COL.muted, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
});

/* an earned row's title line, on the OPENED row: "Use as title", or on the
   one you wear "Your title" and "Remove title"; `wait` is a title ask with no
   answer yet */
function TitleLine({ S, id, wearing, wait }) {
  const busy = !!wait;
  const mine = busy && (wait.id === id || (wait.id === null && wearing));
  const ask = (want) => (e) => { e.stopPropagation(); if (!busy) sendAchvTitle(S, want); };
  return (
    <div data-achv-title-line={wearing ? 'on' : 'off'} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
      {wearing ? (
        <>
          <span data-achv-title-on="" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: COL.accent }}>
            <Tick />
            Your title
          </span>
          <button type="button" data-achv-title-off={id} disabled={busy} onClick={ask(null)}
            style={{ ...titleHit, cursor: busy ? 'default' : 'pointer' }}>
            <span style={titlePill(!busy)}>{mine ? 'Removing…' : 'Remove title'}</span>
          </button>
        </>
      ) : (
        <button type="button" data-achv-title-use={id} disabled={busy} onClick={ask(id)}
          style={{ ...titleHit, cursor: busy ? 'default' : 'pointer' }}>
          <span style={titlePill(!busy)}>{mine ? 'Saving…' : 'Use as title'}</span>
        </button>
      )}
    </div>
  );
}

function Row({ r, S, now, wait, open, onToggle }) {
  const { def, got, at, n } = r;
  const [bad, setBad] = useState(false);
  const short = got ? '' : achvProgressShort(S, def.id);
  const words = got ? '' : achvProgress(S, def.id);
  const wearing = got && !!(S && S._achv && S._achv.t === def.id);
  const toggle = (e) => { e.stopPropagation(); onToggle(def.id); };
  const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(def.id); } };
  return (
    <div data-achv-row={def.id} data-achv-got={got ? 1 : 0} data-achv-tier={def.tier} data-achv-open={open ? 1 : 0}
      role="button" tabIndex={0} aria-expanded={open} onClick={toggle} onKeyDown={key}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minHeight: 48, padding: '7px 2px', boxSizing: 'border-box',
        borderBottom: `1px solid ${COL.divider}`, cursor: 'pointer', touchAction: 'manipulation', outline: 'none',
        background: open ? 'rgba(229,237,233,.035)' : 'transparent' }}>
      <div style={{ flex: 'none', width: 30, height: 30, display: 'grid', placeItems: 'center', opacity: got ? 1 : 0.38 }}>
        {bad ? <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>{def.glyph}</span> : (
          <img src={def.icon} alt="" draggable={false} width={30} height={30}
            onError={() => setBad(true)}
            style={{ width: 30, height: 30, objectFit: 'contain' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* the name is never cut: in the ~238 px side column "Breaking the
              House" takes two lines rather than an ellipsis */}
          <span data-achv-name="" style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: COL.text,
            overflowWrap: 'anywhere' }}>
            {def.name}
            {n > 1 ? <span data-achv-times={n} style={{ marginLeft: 5, color: COL.accent, fontVariantNumeric: 'tabular-nums' }}>×{fmt(n)}</span> : null}
            {wearing ? <span data-achv-wearing="" title="Your title" style={{ marginLeft: 6, verticalAlign: '-1px' }}><Tick size={10} /></span> : null}
          </span>
          <ApPill tier={def.tier} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 2 }}>
          {open ? (
            /* OPENED, the line shows WHOLE in place: the achievement's own
               words (`how`), and how far along in words -- never the clue
               again under itself */
            <span data-achv-how="" style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.35, color: COL.text2 }}>
              {def.how}
              {words ? <span data-achv-progress="" style={{ color: COL.text }}> · {words}</span> : null}
              {got && n > 1 ? <span style={{ color: COL.text }}> · {fmt(n)} times</span> : null}
            </span>
          ) : (
            /* one line: the clue, and how far along where the worker said */
            <span data-achv-clue="" style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.3, color: COL.text2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {def.clue || def.how}
              {short ? <span data-achv-progress-short="" style={{ color: COL.text }}> · {short}</span> : null}
            </span>
          )}
          {got
            ? <span data-achv-date="" style={{ flex: 'none', fontSize: 11, fontWeight: 600, color: COL.text2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{achvDateWords(at, now)}</span>
            : <Lock />}
        </div>
        {/* an earned row, opened: its title buttons -- a plain continuation
            of the row, no card inside a card */}
        {open && got ? <div data-achv-detail=""><TitleLine S={S} id={def.id} wearing={wearing} wait={wait} /></div> : null}
      </div>
    </div>
  );
}

/* the page with nothing to list: a line and a smaller one (the spec's empty
   state, the page's medal at .4; was the journey scroll) */
function Note({ id, title, sub }) {
  return (
    <div data-achv-note={id} style={{ textAlign: 'center', padding: '16px 8px' }}>
      <img src={ACHV_MEDAL_SRC} alt="" draggable={false} width={40} height={40}
        style={{ width: 40, height: 40, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* img{display:block} in game.css */ }} />
      <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2, marginTop: 6 }}>{title}</div>
      {sub ? <div style={{ fontSize: 12, color: COL.muted, marginTop: 3, lineHeight: 1.35 }}>{sub}</div> : null}
    </div>
  );
}

/* re-read the record a few times a second, as PetsPanel does; `extra` adds
   what else the caller draws from (the width, the drill) */
function useAchvClock(extra) {
  const [, force] = useState(0);
  useEffect(() => {
    let last = '';
    const id = setInterval(() => {
      const S = getState();
      const a = S && S._achv;
      /* a title ask that waited past TITLE_ASK_MS is let go here, so the
         buttons come back without a tap */
      const waiting = S ? (achvTitleWaiting(S) ? 1 : 0) : 0;
      const key = S ? [a ? a.rev : -1, S._codex ? S._codex.rev : -1, achvLive(S) ? 1 : 0, achvSummary(S).apTotal, waiting, extra ? extra() : ''].join('|') : '';
      if (key !== last) { last = key; force((v) => (v + 1) % 1e9); }
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);
}

/* drilled from More (or the AP button, or a card): the dashboard draws the
   "◂ ACHIEVEMENTS" header and AchievementsHead in it */
const drilled = () => {
  try { return dashboardPanelBus.state.mode === 'expanded' && dashboardPanelBus.state.stack.length > 1; } catch (_e) { return false; }
};

/* the summary's two lines: "0 AP · 9/23" over the title.  `head`: on the
   drilled header (smaller type); `end`: lined up on the right, as on the
   upright header row -- sideways it is its own line under the title, on the
   left, as the page's own first lines are */
function Summary({ S, head, end }) {
  const a = S && S._achv;
  const sum = achvSummary(S);
  const titleDef = a && a.t ? achvById(a.t) : null;
  return (
    <div data-achv-summary={head ? 'head' : 'page'} style={{ minWidth: 0, textAlign: end ? 'right' : 'left', lineHeight: 1.2 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: end ? 'flex-end' : 'flex-start', whiteSpace: 'nowrap' }}>
        <span data-achv-ap-total={sum.apTotal} title={achvSplitWords(sum)}
          style={{ fontSize: head ? 14 : 18, fontWeight: 800, color: COL.gold, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(sum.apTotal)} AP
        </span>
        <span data-achv-count={sum.earned} style={{ fontSize: 12.5, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
          {sum.earned}/{sum.total}
        </span>
      </div>
      {/* the title your card wears, or how to choose one once you can */}
      {sum.earned > 0 ? (
        <div data-achv-title-current={titleDef ? titleDef.id : 'none'}
          style={{ fontSize: 11.5, color: COL.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
          {titleDef
            ? <>Title: <b style={{ color: COL.accent }}>{titleDef.name}</b></>
            : 'No title yet: tap one you have'}
        </div>
      ) : null}
    </div>
  );
}

/* PANELS.achievements.Head: the summary in the drilled page's header row,
   right of "◂ ACHIEVEMENTS" (BottomDashboard.jsx), or under it sideways
   (`side`); nothing while the page itself says it is off or unreadable */
export const AchievementsHead = ({ side }) => {
  useAchvClock();
  const S = getState();
  if (!achvLive(S) || (S && S._achv && S._achv.unavailable)) return null;
  return <Summary S={S} head end={!side} />;
};

export const AchievementsPanel = () => {
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);
  useAchvClock(() => [panelVw() < 260 ? 1 : 0, drilled() ? 1 : 0].join(''));
  const S = getState();
  const narrow = panelVw() < 260;
  const box = { ...panelStyle, overflowY: 'auto', overflowX: 'hidden', padding: narrow ? '6px 6px 12px' : '4px 8px 12px' };
  if (!achvLive(S)) {
    return (
      <div data-achv-panel="off" style={box}>
        <Note id="off" title="Achievements aren't on yet." sub="This server doesn't keep them yet." />
      </div>
    );
  }
  const a = S && S._achv;
  if (a && a.unavailable) {
    return (
      <div data-achv-panel="unavailable" style={box}>
        <Note id="unavailable" title="Achievements can't be read right now."
          sub="Nothing you have earned is lost: they come back when the server can read them." />
      </div>
    );
  }
  const sum = achvSummary(S);
  const rows = achvRows(S, filter);
  const now = Date.now();
  const wait = achvTitleWaiting(S, now);
  const toggle = (id) => setOpen((cur) => (cur === id ? null : id));
  return (
    <div data-achv-panel="1" style={box}>
      {/* no header row to ride (a root page): the summary is the page's own
          first lines, as it was */}
      {drilled() ? null : <div style={{ marginBottom: 2 }}><Summary S={S} /></div>}
      <div role="group" aria-label="Show" style={narrow
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 6, margin: '0 0 2px' }
        : { display: 'flex', flexWrap: 'wrap', columnGap: 6, margin: '0 0 2px' }}>
        {ACHV_FILTERS.map((f) => (
          <button key={f.id} type="button" data-achv-chip={f.id} aria-pressed={f.id === filter}
            onClick={(e) => { e.stopPropagation(); setFilter(f.id); setOpen(null); }}
            style={narrow ? { ...chipHit, width: '100%' } : chipHit}>
            <span style={narrow ? { ...chip(f.id === filter), width: '100%', boxSizing: 'border-box', padding: '0 6px' } : chip(f.id === filter)}>{f.label}</span>
          </button>
        ))}
      </div>
      <div data-achv-list={filter}>
        {rows.map((r) => <Row key={r.def.id} r={r} S={S} now={now} wait={wait} open={open === r.def.id} onToggle={toggle} />)}
      </div>
      {/* why the total is more than the achievements' own sum: story quests
          pay +5 each and the guild ladder pays AP too (the split line was
          the page's third line; it is the page's last now) */}
      {sum.apTotal > 0 ? (
        <div data-achv-split={sum.achvPts + '/' + sum.otherPts} style={{ fontSize: 11.5, color: COL.muted, lineHeight: 1.35, marginTop: 8, padding: '0 2px' }}>
          {achvSplitWords(sum)}
        </div>
      ) : null}
    </div>
  );
};

export default AchievementsPanel;
