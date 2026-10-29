import React from 'react';
import { boardPinnable, boardWords, boardName } from '@/data/townBoard.js';
import { boardPage, boardSub } from '@/game/mapPinPlaces.js';
import { pinsOn, togglePin, PIN_CSS, PIN_KEYS } from '@/game/mapPins.js';
import { rideButtonWanted, isRiding, toggleRide } from '@/game/ride.js';
import { rideGround } from '@/game/rideGround.js';
import { Icon, LS, TAP } from './TownBoard.jsx';

/* ═══ v2.3.3801: A TILE'S PAGE, AND THE BOARD'S FOOT ═══
 *
 * Out of TownBoard.jsx so the board's grid, header and nav strip (lane G) and
 * the page and its words (this file, with data/townBoard.js) are changed
 * apart.  The owner's review of the board (ChatGPT's, adopted):
 *   A PAGE     what it is, where it is, and two buttons, Red pin and Blue pin
 *              (v2.3.3766).  A page with no one place has ONE action button
 *              instead (the row's `action`): Town Quests "Open Quests" (your
 *              Quests page), the Skateboard "Ride now" (only where you may
 *              ride: game/ride.js rideButtonWanted); No man's land none;
 *   THE FOOT   the Leaderboard and the World map (v2.3.3258, the owner's
 *              choice), and small Codex and Journey shortcuts, each opening
 *              its dashboard page (BroTown's onDash: the dashboard's bus). */

/* the styles are made when drawn, never at load: this file and TownBoard.jsx
   import each other, so LS and TAP are not there yet while this one loads */
const btn = () => Object.assign({}, TAP, { minHeight: 48, borderRadius: 10, fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 });

/* the page's one button for a row with no place, or null for none now */
function actionOf(S, e) {
  if (e.action === 'quests') return { id: 'quests', label: 'Open Quests' };
  if (e.action === 'ride') {
    /* only where the board would let you on, and not already riding */
    return rideButtonWanted(S, rideGround(S)) && !isRiding(S) ? { id: 'ride', label: 'Ride now' } : null;
  }
  return null;
}

export function BoardPage(props) {
  const S = props.S;
  const e = props.entry;
  const names = props.names;
  const on = pinsOn(S, e.id);
  const sub = boardSub(S, e);
  const act = boardPinnable(e.id) ? null : actionOf(S, e);
  const doAct = function () {
    if (!act) return;
    if (act.id === 'quests') { if (props.onDash) props.onDash('quests'); return; }
    if (act.id === 'ride') {
      toggleRide(S, Date.now(), function (type, payload) { if (S.channel) S.channel.send({ type: type, payload: payload }); });
      if (props.onClose) props.onClose();
    }
  };
  return (
    <div data-board-page={e.id} style={{ display: 'grid', gap: 10 }}>
      <button type="button" data-board-back="" onClick={props.onBack}
        style={Object.assign({}, TAP, { justifySelf: 'start', minHeight: 36, padding: '6px 12px 6px 8px', borderRadius: 999, background: 'transparent', color: LS.brass, border: '1px solid ' + LS.borderStrong, fontSize: 13, fontWeight: 700 })}>
        ‹ All things to do
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon src={e.icon} emoji={e.emoji} size={44} aspect={e.iconAspect} />
        <div style={{ display: 'grid', gap: 2 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: LS.txt1, lineHeight: 1.2 }}>{boardName(e, names)}</div>
          {sub ? <div data-board-page-sub="" style={{ fontSize: 12.5, fontWeight: 600, color: LS.txt2, lineHeight: 1.3 }}>{sub}</div> : null}
        </div>
      </div>
      <div style={{ background: LS.well, border: '1px solid ' + LS.border, borderRadius: 10, padding: '10px 12px', display: 'grid', gap: 6 }}>
        {boardPage(S, e).map(function (line, i) {
          return <div key={i} style={{ fontSize: 13.5, color: LS.txt1, lineHeight: 1.45 }}>{boardWords(line, names)}</div>;
        })}
        <div data-board-where="" style={{ fontSize: 12.5, color: LS.txt2, lineHeight: 1.4, marginTop: 2 }}>
          <span style={{ color: LS.brass, fontWeight: 700 }}>Where: </span>{boardWords(e.where, names)}
        </div>
      </div>
      {/* v2.3.3766: a place that is nowhere in particular has no pins; v2.3.3801: its one action, if it has one */}
      {boardPinnable(e.id) ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PIN_KEYS.map(function (k) {
          const here = on.indexOf(k) >= 0;
          const name = k === 'red' ? 'Red pin' : 'Blue pin';
          return (
            <button key={k} type="button" data-pin-btn={k} data-pin-on={here ? 1 : 0}
              onClick={function () { togglePin(S, k, e.id); props.bump(); }}
              style={Object.assign(btn(), { background: here ? PIN_CSS[k] : LS.raised, color: here ? '#FFFFFF' : LS.txt1, border: '1.5px solid ' + PIN_CSS[k] })}>
              <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: here ? '#FFFFFF' : PIN_CSS[k] }} />
              {here ? 'Lift ' + name.toLowerCase() : name}
            </button>
          );
        })}
      </div> : null}
      {boardPinnable(e.id) ? <div style={{ fontSize: 11.5, color: LS.txt3, lineHeight: 1.4 }}>
        A pin shows on your minimap and the world map, and stays until you lift it.
      </div> : null}
      {act ? <button type="button" data-board-action={act.id} onClick={doAct}
        style={Object.assign(btn(), { background: LS.brass, color: '#1B140A', border: '1.5px solid ' + LS.brass })}>
        {act.label}
      </button> : null}
    </div>
  );
}

export function BoardFoot(props) {
  const FOOT = Object.assign({}, TAP, { minHeight: 44, borderRadius: 10, background: LS.strip, color: LS.txt1, border: '1px solid ' + LS.borderStrong, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 });
  const FOOT_SMALL = Object.assign({}, FOOT, { minHeight: 38, fontSize: 12, fontWeight: 600, color: LS.txt2 });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
      <button type="button" data-hall-row="leaderboard" onClick={props.onLeaderboard} style={FOOT}>
        <Icon src="/icons/ui/panel-leaderboard.webp" emoji="🏆" size={20} />Leaderboard
      </button>
      <button type="button" data-hall-row="map" onClick={props.onMap} style={FOOT}>
        <Icon src="/icons/ui/nav-map.webp" emoji="🗺" size={20} />World map
      </button>
      {/* v2.3.3801: the owner's review -- the Codex and your Journey, a press away */}
      <button type="button" data-hall-row="codex" onClick={function () { if (props.onDash) props.onDash('encyclopedia'); }} style={FOOT_SMALL}>
        <Icon src="/icons/ui/panel-encyclopedia.webp?v=2.3.1224" emoji="📖" size={18} />Codex
      </button>
      <button type="button" data-hall-row="journey" onClick={function () { if (props.onDash) props.onDash('more', 'journey'); }} style={FOOT_SMALL}>
        <Icon src="/icons/ui/journey.webp?v=2.3.1224" emoji="🛤" size={18} />Journey
      </button>
    </div>
  );
}
