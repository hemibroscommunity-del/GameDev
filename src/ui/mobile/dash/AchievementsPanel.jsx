import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState, QUALITY_PRISM, qualityInk } from './common.js';
import { panelVw } from '../playViewport.js';
import { ACHV_TIERS } from '@/data/achievements.js';
import { achvLive, achvSummary, achvRows, achvProgress, achvDateWords, ACHV_FILTERS, sendAchvTitle, achvTitleWaiting } from '@/game/achievements.js';
import { achvById } from '@/data/achievements.js';

/* ═══ v2.3.3485: THE ACHIEVEMENTS PAGE ═══
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
 * Lantern Slate (docs/LANTERN-SLATE-SPEC.md): 44 px rows, 32 px chips in 44 px
 * hit boxes, the tier a thin EDGE on the pill (never a fill), the rainbow in
 * CSS (a gradient ring, the godly grade's own QUALITY_PRISM / qualityInk),
 * no filter.  Sideways the side column is ~238 px: the chips go two by two
 * and the rows wrap, and nothing scrolls sideways.
 * Its own clock: it re-reads the record a few times a second (PetsPanel's).
 *
 * THE TITLE (the plan's Phase 3): an EARNED row offers "Use as title" -- the
 * achievement your card wears under your name (ui/panels/PlayerProfilePanel
 * .jsx), in place of the placeholder "Fishing Master" -- and the one you wear
 * says "Your title" with "Remove title" beside it; a row you have not earned
 * never offers it.  Each tap asks the worker (game/achievements.js
 * sendAchvTitle) and the buttons wait for its answer, a fresh achv_state:
 * the page never shows a title the worker did not keep (past ten changes in
 * a burst it keeps the old one, and the page says so by showing it). */
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

/* the title's buttons: small, quiet (secondary), one row's worth */
const titleBtn = (on) => ({
  minHeight: 36, padding: '0 12px', margin: 0, borderRadius: 999, boxSizing: 'border-box',
  border: '1px solid ' + (on ? COL.borderStrong : COL.border), background: on ? COL.raised : 'transparent',
  color: on ? COL.text : COL.muted, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
  cursor: on ? 'pointer' : 'default', touchAction: 'manipulation',
});

/* an earned row's title line: "Use as title", or on the one you wear "Your
   title" and "Remove title"; `wait` is a title ask with no answer yet */
function TitleLine({ S, id, wearing, wait }) {
  const busy = !!wait;
  const mine = busy && (wait.id === id || (wait.id === null && wearing));
  const ask = (want) => (e) => { e.stopPropagation(); if (!busy) sendAchvTitle(S, want); };
  return (
    <div data-achv-title-line={wearing ? 'on' : 'off'} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 5 }}>
      {wearing ? (
        <>
          <span data-achv-title-on="" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: COL.accent }}>
            <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2 6.4l2.6 2.5L10 3.2" fill="none" stroke={COL.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Your title
          </span>
          <button type="button" data-achv-title-off={id} disabled={busy} onClick={ask(null)} style={titleBtn(!busy)}>
            {mine ? 'Removing…' : 'Remove title'}
          </button>
        </>
      ) : (
        <button type="button" data-achv-title-use={id} disabled={busy} onClick={ask(id)} style={titleBtn(!busy)}>
          {mine ? 'Saving…' : 'Use as title'}
        </button>
      )}
    </div>
  );
}

function Row({ r, S, now, wait }) {
  const { def, got, at, n } = r;
  const [bad, setBad] = useState(false);
  const prog = got ? '' : achvProgress(S, def.id);
  const wearing = got && !!(S && S._achv && S._achv.t === def.id);
  return (
    <div data-achv-row={def.id} data-achv-got={got ? 1 : 0} data-achv-tier={def.tier}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minHeight: 44, padding: '7px 2px', boxSizing: 'border-box', borderBottom: `1px solid ${COL.divider}` }}>
      <div style={{ flex: 'none', width: 30, height: 30, display: 'grid', placeItems: 'center', opacity: got ? 1 : 0.38 }}>
        {bad ? <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>{def.glyph}</span> : (
          <img src={def.icon} alt="" draggable={false} width={30} height={30}
            onError={() => setBad(true)}
            style={{ width: 30, height: 30, objectFit: 'contain' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span data-achv-name="" style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: got ? COL.text : COL.text2 }}>
            {def.name}
            {n > 1 ? <span data-achv-times={n} style={{ marginLeft: 5, color: COL.accent, fontVariantNumeric: 'tabular-nums' }}>×{fmt(n)}</span> : null}
          </span>
          <ApPill tier={def.tier} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 2 }}>
          <span data-achv-how="" style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.3, color: got ? COL.text2 : COL.muted }}>
            {def.how}
            {prog ? <span data-achv-progress="" style={{ color: COL.text2, whiteSpace: 'nowrap' }}> · {prog}</span> : null}
          </span>
          {got
            ? <span data-achv-date="" style={{ flex: 'none', fontSize: 11, fontWeight: 600, color: COL.text2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{achvDateWords(at, now)}</span>
            : <Lock />}
        </div>
        {got ? <TitleLine S={S} id={def.id} wearing={wearing} wait={wait} /> : null}
      </div>
    </div>
  );
}

/* the page with nothing to list: a line and a smaller one (the spec's empty
   state, the journey scroll at .4) */
function Note({ id, title, sub }) {
  return (
    <div data-achv-note={id} style={{ textAlign: 'center', padding: '16px 8px' }}>
      <img src="/icons/ui/journey.webp?v=2.3.1224" alt="" draggable={false} width={40} height={40}
        style={{ width: 40, height: 40, objectFit: 'contain', opacity: 0.4, margin: '0 auto' /* img{display:block} in game.css */ }} />
      <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2, marginTop: 6 }}>{title}</div>
      {sub ? <div style={{ fontSize: 12, color: COL.muted, marginTop: 3, lineHeight: 1.35 }}>{sub}</div> : null}
    </div>
  );
}

export const AchievementsPanel = () => {
  const [, force] = useState(0);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    let last = '';
    const id = setInterval(() => {
      const S = getState();
      const a = S && S._achv;
      /* a title ask that waited past TITLE_ASK_MS is let go here, so the
         buttons come back without a tap */
      const waiting = S ? (achvTitleWaiting(S) ? 1 : 0) : 0;
      const key = S ? [a ? a.rev : -1, S._codex ? S._codex.rev : -1, achvLive(S) ? 1 : 0, achvSummary(S).apTotal, panelVw() < 260 ? 1 : 0, waiting].join('|') : '';
      if (key !== last) { last = key; force((v) => (v + 1) % 1e9); }
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);
  const S = getState();
  const narrow = panelVw() < 260;
  const box = { ...panelStyle, overflowY: 'auto', overflowX: 'hidden', padding: narrow ? '6px 6px 12px' : '6px 8px 12px' };
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
  const titleDef = a && a.t ? achvById(a.t) : null;
  return (
    <div data-achv-panel="1" style={box}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span data-achv-ap-total={sum.apTotal} style={{ fontSize: 18, fontWeight: 800, color: COL.gold, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(sum.apTotal)} AP
        </span>
        <span data-achv-count={sum.earned} style={{ fontSize: 13, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums' }}>
          {sum.earned} of {sum.total}
        </span>
      </div>
      <div data-achv-split={sum.achvPts + '/' + sum.otherPts} style={{ fontSize: 12, color: COL.muted, lineHeight: 1.35, marginTop: 1 }}>
        Achievements {fmt(sum.achvPts)} AP · quests, guilds and more {fmt(sum.otherPts)} AP
      </div>
      {/* the title your card wears, or how to choose one once you can */}
      {sum.earned > 0 ? (
        <div data-achv-title-current={titleDef ? titleDef.id : 'none'} style={{ fontSize: 12, lineHeight: 1.35, marginTop: 2, color: COL.text2 }}>
          {titleDef
            ? <>Your title: <b style={{ color: COL.accent }}>{titleDef.name}</b></>
            : 'No title on your card: tap "Use as title" on one you have.'}
        </div>
      ) : null}
      <div role="group" aria-label="Show" style={narrow
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 6, margin: '2px 0 2px' }
        : { display: 'flex', flexWrap: 'wrap', columnGap: 6, margin: '2px 0 2px' }}>
        {ACHV_FILTERS.map((f) => (
          <button key={f.id} type="button" data-achv-chip={f.id} aria-pressed={f.id === filter}
            onClick={(e) => { e.stopPropagation(); setFilter(f.id); }}
            style={narrow ? { ...chipHit, width: '100%' } : chipHit}>
            <span style={narrow ? { ...chip(f.id === filter), width: '100%', boxSizing: 'border-box', padding: '0 6px' } : chip(f.id === filter)}>{f.label}</span>
          </button>
        ))}
      </div>
      <div data-achv-list={filter}>
        {rows.map((r) => <Row key={r.def.id} r={r} S={S} now={now} wait={wait} />)}
      </div>
    </div>
  );
};

export default AchievementsPanel;
