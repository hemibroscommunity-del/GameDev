import React, { useEffect, useState } from 'react';
import { COL, getState } from './common.js';
import { FISH_SPECIES, fishKg } from '@/data/fishVariants.js';
import { askFishBoard, subscribeFishWeigh } from '@/game/fishWeigh.js';
import { deskWords } from '@/game/deskWords.js';

/* ═══ v2.3.4032: THE BIGGEST FISH -- RANKS' FISH TAB ═══
 * The owner: "Include leaderboards for largest caught types of fish
 * (triggered by inspection)."  One board a species (server fishlog.js
 * `fish_board`): the ten heaviest weighed, one row a player (their best), the
 * name and the kilos, an albino or a large one said so.  Shown inside Ranks
 * (LeaderboardPanel) as its "Biggest fish" chip, against a worker that says
 * caps.fishweigh; the weigh-in card's Records opens it on the species weighed
 * (`initial`).  Asked for on opening and every REFRESH_MS while open (a
 * weigh-in is a tap, so a board moves rarely).  UI-DESIGN-NOTES "Biggest
 * fish"; states.mjs `fish-board`. */
const REFRESH_MS = 30000;

const chipHit = { flex: '0 0 auto', minHeight: 44, padding: 0, margin: 0, background: 'transparent', border: 'none', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', touchAction: 'manipulation' };
const chip = (active) => ({
  display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 11px',
  background: active ? COL.accentFill : 'transparent', color: active ? COL.accent : COL.text2,
  border: `1px solid ${active ? COL.accent : COL.border}`, borderRadius: 999,
  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
});
const TAG = { albino: { word: 'Albino', color: '#F6D9E4' }, large: { word: 'Large', color: '#F2C14E' } };

export function FishBoard({ initial }) {
  const [sp, setSp] = useState(() => (FISH_SPECIES.some((f) => f.id === initial) ? initial : 'minnow'));
  const [, setTick] = useState(0);
  useEffect(() => subscribeFishWeigh(() => setTick((x) => (x + 1) % 1000000)), []);
  useEffect(() => {
    const ask = () => askFishBoard(getState());
    ask();
    const id = setInterval(ask, REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  const S = getState();
  const meId = S && S.myId;
  const fb = S && S._fishBoard;
  const rows = fb && fb.boards && Array.isArray(fb.boards[sp]) ? fb.boards[sp] : [];
  const name = (FISH_SPECIES.find((f) => f.id === sp) || {}).name || 'fish';
  return (
    <div data-fish-board={sp}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4, overflowX: 'auto', padding: '0 0 2px' }}>
        {FISH_SPECIES.map((f) => (
          <button key={f.id} type="button" data-fish-board-sp={f.id} onClick={() => setSp(f.id)} style={chipHit}>
            <span style={chip(f.id === sp)}>{f.name}</span>
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div data-fish-board-empty="" style={{ textAlign: 'center', padding: '14px 8px', fontSize: 13, fontWeight: 700, color: COL.text2 }}>
          {!fb ? 'Loading…' : fb.off ? 'The scales are closed for now.' : fb.unavailable ? "The records can't be read right now."
            : deskWords('Nobody has weighed a ' + name + ' yet. Tap a fish in your bag, then Inspect.')}
        </div>
      ) : rows.map((r, i) => (
        <div key={r.pid || i} data-fish-board-row={i + 1} style={{
          display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 8px',
          borderBottom: `1px solid ${COL.divider}`,
          background: (meId && r.pid === meId) ? COL.accentFill : 'transparent',
        }}>
          <span style={{ width: 36, flex: '0 0 auto', fontSize: 16, fontWeight: 700, color: i < 3 ? COL.accent : COL.muted, fontVariantNumeric: 'tabular-nums' }}>#{i + 1}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.name || 'Bro'}
            {TAG[r.v] ? <span data-fish-board-tag={r.v} style={{ marginLeft: 6, fontSize: 11, fontWeight: 800, color: TAG[r.v].color }}>{TAG[r.v].word}</span> : null}
          </span>
          <span data-lb-value="" style={{ fontSize: 16, fontWeight: 700, color: COL.text, fontVariantNumeric: 'tabular-nums' }}>{fishKg(r.g)}</span>
        </div>
      ))}
    </div>
  );
}

export default FishBoard;
