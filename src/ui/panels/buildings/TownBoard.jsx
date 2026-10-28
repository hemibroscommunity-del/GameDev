import React from 'react';
import { deskWords } from '@/game/deskWords.js';
import { GROUPS, boardEntry, boardPinnable } from '@/data/townBoard.js';
import { boardRows } from '@/game/mapPinPlaces.js';
import { loadPins, pinsOn, togglePin, PIN_CSS, PIN_KEYS } from '@/game/mapPins.js';

/* ═══ v2.3.3766: THE TOWN HALL'S BOARD ═══
 *
 * The owner: "at the town hall it was just a big menu board of all the things
 * to do (dungeon, gambling, arena, woodworking, etc) with a page that
 * describes what each thing does and pin drop you can put on the map to go to
 * the one you want (two pins can be active at once - red pin and blue pin).
 * When you "enter it" it brings up the board."
 *
 *   THE BOARD   a tile a thing to do (data/townBoard.js, only what this worker
 *               opens: game/mapPinPlaces.js boardRows), under a few plain
 *               headings; a tile wears the pins that are on it;
 *   A PAGE      what it is, in 2-4 short sentences, where it is, and two
 *               buttons, Red pin and Blue pin (game/mapPins.js: on it, moved
 *               from wherever it was; pressed where it already is, lifted);
 *   THE FOOT    the Town Hall's two rows of v2.3.3258, the owner's choice
 *               (the trophy case is the leaderboard, the painted map the world
 *               map), as two small buttons.
 * The pins show on the minimap and the world map, until lifted, per
 * character.  Lantern Slate, as WheelHallPanel's halls (its tokens). */
const LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98',
  strip: '#27393F', raised: '#293B41', well: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)',
  brass: '#D8AA58'
};
const MOD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3, margin: '4px 0 0' };
const TAP = { touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', font: 'inherit', cursor: 'pointer' };

function Icon({ src, emoji, size }) {
  return (
    <img src={src} alt="" draggable={false}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      onError={function (e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }} />
  );
}

/* the little pins a tile wears, in its corner */
function PinDots({ on }) {
  if (!on.length) return null;
  return (
    <span aria-hidden="true" style={{ position: 'absolute', top: 5, right: 5, display: 'flex', gap: 3 }}>
      {on.map(function (k) {
        return <span key={k} data-tile-pin={k} style={{ width: 10, height: 10, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: PIN_CSS[k], boxShadow: '0 0 0 1.5px #0b161b' }} />;
      })}
    </span>
  );
}

export function TownBoard(props) {
  const S = (props.stateRef && props.stateRef.current) || {};
  const [page, setPage] = React.useState(null);
  const [, bump] = React.useState(0);
  loadPins(S, null, boardPinnable);
  const rows = boardRows(S);
  const e = page ? boardEntry(page) : null;

  if (e) {
    const on = pinsOn(S, e.id);
    return (
      <div data-board-page={e.id} style={{ display: 'grid', gap: 10 }}>
        <button type="button" data-board-back="" onClick={function () { setPage(null); }}
          style={Object.assign({}, TAP, { justifySelf: 'start', minHeight: 36, padding: '6px 12px 6px 8px', borderRadius: 999, background: 'transparent', color: LS.brass, border: '1px solid ' + LS.borderStrong, fontSize: 13, fontWeight: 700 })}>
          ‹ All things to do
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon src={e.icon} emoji={e.emoji} size={44} />
          <div style={{ fontSize: 19, fontWeight: 800, color: LS.txt1, lineHeight: 1.2 }}>{e.name}</div>
        </div>
        <div style={{ background: LS.well, border: '1px solid ' + LS.border, borderRadius: 10, padding: '10px 12px', display: 'grid', gap: 6 }}>
          {e.page.map(function (line, i) {
            return <div key={i} style={{ fontSize: 13.5, color: LS.txt1, lineHeight: 1.45 }}>{line}</div>;
          })}
          <div data-board-where="" style={{ fontSize: 12.5, color: LS.txt2, lineHeight: 1.4, marginTop: 2 }}>
            <span style={{ color: LS.brass, fontWeight: 700 }}>Where: </span>{e.where}
          </div>
        </div>
        {/* v2.3.3766: a place that is nowhere in particular (No man's land) has no pins */}
        {boardPinnable(e.id) ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {PIN_KEYS.map(function (k) {
            const here = on.indexOf(k) >= 0;
            const name = k === 'red' ? 'Red pin' : 'Blue pin';
            return (
              <button key={k} type="button" data-pin-btn={k} data-pin-on={here ? 1 : 0}
                onClick={function () { togglePin(S, k, e.id); bump(function (n) { return n + 1; }); }}
                style={Object.assign({}, TAP, { minHeight: 48, borderRadius: 10, fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: here ? PIN_CSS[k] : LS.raised, color: here ? '#FFFFFF' : LS.txt1, border: '1.5px solid ' + PIN_CSS[k] })}>
                <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: here ? '#FFFFFF' : PIN_CSS[k] }} />
                {here ? 'Lift ' + name.toLowerCase() : name}
              </button>
            );
          })}
        </div> : null}
        {boardPinnable(e.id) ? <div style={{ fontSize: 11.5, color: LS.txt3, lineHeight: 1.4 }}>
          A pin shows on your minimap and the world map, and stays until you lift it.
        </div> : null}
      </div>
    );
  }

  return (
    <div data-town-board={rows.length} style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 12.5, color: LS.txt2, lineHeight: 1.4 }}>
        {deskWords('Everything to do in the world. Tap one to read about it and pin it on your map.')}
      </div>
      {GROUPS.map(function (g) {
        const list = rows.filter(function (r) { return r.group === g.id; });
        if (!list.length) return null;
        return (
          <React.Fragment key={g.id}>
            <div style={MOD}>{g.name}</div>
            <div data-board-group={g.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(98px, 1fr))', gap: 6 }}>
              {list.map(function (r) {
                const on = pinsOn(S, r.id);
                return (
                  <button key={r.id} type="button" data-board-tile={r.id} data-board-pins={on.join(',')}
                    onClick={function () { setPage(r.id); }}
                    style={Object.assign({}, TAP, { position: 'relative', minHeight: 78, padding: '10px 6px 8px', borderRadius: 10, background: LS.raised, color: LS.txt1,
                      border: '1px solid ' + (on.length ? PIN_CSS[on[0]] : LS.borderStrong), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 })}>
                    <Icon src={r.icon} emoji={r.emoji} size={30} />
                    <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, textAlign: 'center' }}>{r.name}</span>
                    <PinDots on={on} />
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
        <button type="button" data-hall-row="leaderboard" onClick={props.onLeaderboard}
          style={Object.assign({}, TAP, { minHeight: 44, borderRadius: 10, background: LS.strip, color: LS.txt1, border: '1px solid ' + LS.borderStrong, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 })}>
          <Icon src="/icons/ui/panel-leaderboard.webp" emoji="🏆" size={20} />Leaderboard
        </button>
        <button type="button" data-hall-row="map" onClick={props.onMap}
          style={Object.assign({}, TAP, { minHeight: 44, borderRadius: 10, background: LS.strip, color: LS.txt1, border: '1px solid ' + LS.borderStrong, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 })}>
          <Icon src="/icons/ui/nav-map.webp" emoji="🗺" size={20} />World map
        </button>
      </div>
    </div>
  );
}
