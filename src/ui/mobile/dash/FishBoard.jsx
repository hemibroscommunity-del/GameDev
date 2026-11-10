import React, { useEffect, useState } from 'react';
import { COL, getState } from './common.js';
import { FISH_SPECIES, fishKg } from '@/data/fishVariants.js';
import { askFishBoard, subscribeFishWeigh } from '@/game/fishWeigh.js';
import { deskWords } from '@/game/deskWords.js';
import { BoardRow, BoardEmpty, useBoardFaces } from './BoardRow.jsx';   /* v2.3.4389 */

/* ═══ v2.3.4036: THE BIGGEST FISH -- RANKS' FISH TAB ═══
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
  const faces = useBoardFaces(rows);
  return (
    <div data-fish-board={sp}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4, overflowX: 'auto', padding: '0 0 2px' }}>
        {FISH_SPECIES.map((f) => (
          <button key={f.id} type="button" data-fish-board-sp={f.id} onClick={() => setSp(f.id)} style={chipHit}>
            {/* v2.3.4389: each kind's own picture on its pill (the bag's fish) */}
            <span style={{ ...chip(f.id === sp), gap: 5, padding: '0 11px 0 7px' }}>
              <img src={'/icons/items/fish-' + f.id + '.webp'} alt="" draggable={false} style={{ width: 20, height: 20, objectFit: 'contain', flex: 'none' }} />
              {f.name}
            </span>
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <BoardEmpty text={!fb ? 'Loading…' : fb.off ? 'The scales are closed for now.' : fb.unavailable ? "The records can't be read right now."
          : deskWords('Nobody has weighed a ' + name + ' yet. Tap a fish in your bag, then Inspect.')} />
      ) : rows.map((r, i) => (
        /* v2.3.4389: the one row every board draws (BoardRow): the face and
           the level it was weighed with, a deleted character's row grey */
        <BoardRow key={r.pid || i} rank={i + 1} row={r} face={faces[i]} mine={!!meId && r.pid === meId}
          hook={{ 'data-fish-board-row': i + 1 }}
          line={TAG[r.v] ? <span data-fish-board-tag={r.v} style={{ fontSize: 12, fontWeight: 800, color: r.gone ? COL.muted : TAG[r.v].color }}>{TAG[r.v].word}</span> : null}
          value={fishKg(r.g)} />
      ))}
    </div>
  );
}

export default FishBoard;
