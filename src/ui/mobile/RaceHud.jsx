/* ═══ v2.3.3514: LIL BRO'S RACE, ON THE SCREEN ═══
 *
 * The tour's race_1 (game/race.js has the rules, server/src/race.js the
 * judging).  Three faces, all small, none covering the world:
 *   - the COUNTDOWN: 3, 2, 1, GO! in the middle of the play area, big, taking
 *     no taps;
 *   - while you RUN: a pill at the top -- the flags touched of the four and
 *     the clock, Lil Bro's time beside it to beat;
 *   - the RESULT: a small card where the pill was -- won or lost, both times,
 *     and on a loss a hint and "Race again"; OK closes it, and it goes by
 *     itself after RACE_RESULT_MS.
 * At the top, under the Wheel's minimap, out of the thumbs' way, where the
 * "Attack <name>?" window goes (NmlAskCard's cardPlace), portalled to the body
 * at the prompt layer.  It reads the race off the game's state ten times a
 * second while one is on, and the race bus wakes it.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Z_ABOVE_DASH_PROMPT } from '@/ui/zLayers.js';
import { raceBus, raceView, dismissRace, requestRace, raceOn, RACE_ERR_WORDS } from '@/game/race.js';
import { cardPlace } from './NmlAskCard.jsx';

const BTN = {
  font: 'inherit', flex: 1, minWidth: 0, minHeight: 40, padding: '0 6px', borderRadius: 11,
  fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap',
};
const PRIMARY = { background: 'linear-gradient(180deg,#E2B866,#C9973F)', color: '#1A1408', border: '1px solid #F0CF86' };
const QUIET = { background: 'transparent', color: '#B9C1BF', border: '1px solid rgba(238,242,235,.10)' };
const CARD = {
  position: 'fixed', boxSizing: 'border-box', borderRadius: 12,
  background: 'rgba(17,25,29,.94)', border: '1px solid rgba(238,242,235,.24)',
  boxShadow: '0 14px 30px rgba(4,7,9,.38)', color: '#F7F2E7', textAlign: 'center',
};
const secs = (s) => (Math.round(s * 10) / 10).toFixed(1) + ' s';

/* the play area's middle, for the countdown (.brotown-wrap's rect) */
function middle() {
  try {
    const w = document.querySelector('.brotown-wrap');
    if (w) { const r = w.getBoundingClientRect(); if (r.width > 0) return { x: r.left + r.width / 2, y: r.top + r.height * 0.38 }; }
  } catch (e) { /* the viewport */ }
  return { x: (window.innerWidth || 390) / 2, y: (window.innerHeight || 800) * 0.38 };
}

export default function RaceHud({ stateRef }) {
  const [, setTick] = useState(0);
  const S = stateRef && stateRef.current;
  const v = raceView(S);
  useEffect(() => raceBus.sub(() => setTick((n) => n + 1)), []);
  const live = !!v;
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [live]);
  if (!v || v.phase === 'asked') return null;
  const stop = (e) => { e.stopPropagation(); };
  const pl = cardPlace();

  if (v.phase === 'count') {
    const m = middle();
    const word = v.count > 0 ? String(v.count) : 'GO!';
    return createPortal(
      <div data-race="count" data-race-count={v.count} aria-live="assertive"
        style={{
          position: 'fixed', left: m.x, top: m.y, transform: 'translate(-50%,-50%)', zIndex: Z_ABOVE_DASH_PROMPT,
          pointerEvents: 'none', fontSize: 72, fontWeight: 900, color: '#F6D38B', lineHeight: 1,
          textShadow: '0 3px 0 #5A3D10, 0 0 18px rgba(0,0,0,.55)', fontVariantNumeric: 'tabular-nums',
        }}>
        <div key={word} className="bt-race-beat">{word}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#F7F2E7', marginTop: 10, textShadow: '0 2px 4px rgba(0,0,0,.7)' }}>
          Touch all {v.of - 1} flags, then back here
        </div>
      </div>,
      document.body
    );
  }

  if (v.phase === 'run') {
    const touched = Math.min(v.next, v.of - 1);
    return createPortal(
      <div data-race="run" data-race-next={v.next}
        style={Object.assign({}, CARD, {
          left: pl.left, top: pl.top, width: pl.w, zIndex: Z_ABOVE_DASH_PROMPT, padding: '8px 10px',
          pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        })}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>
          🏁 {touched < v.of - 1 ? 'Flags ' + touched + '/' + (v.of - 1) : 'Back to the start!'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#F6D38B', fontVariantNumeric: 'tabular-nums' }}>{secs(v.secs)}</span>
        <span style={{ fontSize: 11, color: '#B9C1BF', fontVariantNumeric: 'tabular-nums' }}>Lil Bro {secs(v.lilSecs)}</span>
      </div>,
      document.body
    );
  }

  /* the result */
  const r = v.result || {};
  const won = !!r.won;
  const lost = !won && !r.err;
  const title = won ? 'You beat Lil Bro!' : lost ? 'Lil Bro wins!' : (RACE_ERR_WORDS[r.err] || 'No race.');
  const close = (e) => { e.preventDefault(); e.stopPropagation(); dismissRace(stateRef.current); };
  const again = (e) => {
    e.preventDefault(); e.stopPropagation();
    const St = stateRef.current;
    dismissRace(St);
    requestRace(St);
  };
  const canAgain = !won && raceOn(S) && r.err !== 'quest' && r.err !== 'off' && r.err !== 'where';
  return createPortal(
    <div data-race="done" data-race-won={won ? '1' : '0'} data-race-err={r.err || undefined} role="dialog" aria-label={title}
      onPointerDown={stop} onTouchStart={stop} onMouseDown={stop} onClick={stop}
      style={Object.assign({}, CARD, { left: pl.left, top: pl.top, width: pl.w, zIndex: Z_ABOVE_DASH_PROMPT, padding: '10px 10px 8px' })}>
      <div style={{ fontSize: 15, fontWeight: 900, color: won ? '#8FD39A' : '#F6D38B' }}>{title}</div>
      {(won || lost) && (
        <div style={{ fontSize: 12, color: '#D9DEDB', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
          You {secs((r.ms || 0) / 1000)} · Lil Bro {secs((r.lilMs || 0) / 1000)}
        </div>
      )}
      {won && <div style={{ fontSize: 11, color: '#B9C1BF', marginTop: 4 }}>Talk to Lil Bro for your reward.</div>}
      {lost && <div style={{ fontSize: 11, color: '#B9C1BF', marginTop: 4 }}>Sprint, and drink Zoom Juice at the start line.</div>}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {canAgain && <button type="button" data-race-again="" onClick={again} style={Object.assign({}, BTN, PRIMARY)}>Race again</button>}
        <button type="button" data-race-ok="" data-esc="" onClick={close} style={Object.assign({}, BTN, QUIET)}>OK</button>
      </div>
    </div>,
    document.body
  );
}
