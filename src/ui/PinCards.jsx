/* ═══ v2.3.3987: THE MAP PINS' THREE SMALL CARDS ═══
 *
 * The owner: "When you get near the pin (in game) make a window pop up asking
 * if you want to remove pin. A no just makes it stay up until you drop a new
 * pin and get close to it again. To turn off the pin just tap it on minimap
 * and choose remove pin. If there's already 2 pins on map ask if you want to
 * remove one of the pins (give choice of which to remove - blue or red)."
 * The rules are game/pinSlots.js's (its header); these are the cards.
 *
 *   - ARRIVE (PinAskCard, kind 'arrive'): "You reached the blue pin. Remove
 *     it?"  [Remove] [Keep].  Asked on its own clock (every 250 ms): a pin you
 *     came within PIN.ARRIVE_PX of (pinArrival) -- never while you are
 *     fighting (pinsFighting), never while the World map is open, and never
 *     over another card (OTHER_CARDS): it waits until they are gone, and goes
 *     if one comes up (it asks again when you next arrive).  Keep (and its ✕)
 *     marks the pin asked, so it never asks again; walking off without an
 *     answer (past PIN.LEAVE_PX) lets it go unasked.
 *   - REMOVE (PinAskCard, kind 'remove'): a tap on a pin on the minimap
 *     (WorldMapOverlay.jsx's button over the box, pinSlots.js miniPinAt):
 *     "Remove the red pin?"  [Remove] [Cancel].  A tap anywhere else on the
 *     box still opens the map.
 *   - REPLACE (PinReplaceCard, in the World map): a tap on open ground with
 *     both pins up: "Replace which pin?"  [Blue] [Red] [Cancel], a white
 *     ghost pin on the map where you tapped (ui/worldMapPins.js).
 *
 * Placed as No man's land's "Attack?" window is (NmlAskCard.jsx cardPlace):
 * beside the minimap when the strip left of it holds it, else under it --
 * out of the thumbs' way, never over the minimap.  Portalled to the body at
 * the prompt layer (Z_ABOVE_DASH_PROMPT), no scrim, taking only its own taps.
 * Every button acts on the finger's lift (swallowTapClick: the tap's click
 * that follows lands on nothing, TRAPS §247), and on a click a key made
 * (Enter, data-enter; Esc presses the ✕, data-esc="up"; each wears its key
 * on a computer, data-key); words through
 * deskWords.  `?mappin=0`: no cards.
 *
 * QA: window.__btMapPin.ask() (game/pinSlots.js), [data-pin-ask],
 * [data-pin-replace]. */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Z_ABOVE_DASH_PROMPT } from '@/ui/zLayers.js';
import { cardPlace } from '@/ui/mobile/NmlAskCard.jsx';
import { swallowTapClick } from '@/ui/swallowTapClick.js';
import { deskWords } from '@/game/deskWords.js';
import { boardPlaceAt } from '@/game/mapPinPlaces.js';
import {
  PIN, PIN_CSS, PIN_SLOTS, PIN_NAME, mapPinsOn, pinOf, pinArrival, pinDistance, pinsFighting,
  liftPin, markPinAsked, pinAskNow, pinAskOpen, pinAskClose, pinAskSubscribe,
} from '@/game/pinSlots.js';

/* the cards that sit where this one would, or cover the game: while one is
   up, no pin card comes (and one that is up goes) */
const OTHER_CARDS = '[data-nml-ask], [data-party-invite], [data-death-card], [data-world-map], .bt-inspect, .bt-npcdlg-scrim, [role="dialog"]:not([data-pin-ask])';
function otherCardUp() {
  try {
    const list = document.querySelectorAll(OTHER_CARDS);
    for (let i = 0; i < list.length; i++) {
      const r = list[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return true;
    }
  } catch (e) { /* no page */ }
  return false;
}

/* Lantern Slate's buttons (NmlAskCard's, at the 44 px touch guide), the font shorthand FIRST */
const BTN = {
  font: 'inherit', flex: 1, minWidth: 0, minHeight: 44, padding: '0 6px', borderRadius: 11,
  fontSize: 13, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap',
};
const PRIMARY = { background: '#D8A85F', color: '#20170D', border: '1px solid #D8A85F' };
const QUIET = { background: 'transparent', color: '#B9C1BF', border: '1px solid rgba(238,242,235,.14)' };
const colorBtn = (k) => ({ background: PIN_CSS[k], color: '#FFFFFF', border: '1px solid ' + PIN_CSS[k] });
const CARD = {
  boxSizing: 'border-box', padding: '6px 8px 8px 10px', borderRadius: 12,
  background: 'rgba(17,25,29,.95)', border: '1px solid rgba(238,242,235,.24)',
  boxShadow: '0 14px 30px rgba(4,7,9,.38)', color: '#F7F2E7', textAlign: 'left', touchAction: 'manipulation',
};
const X_BTN = {
  position: 'relative', font: 'inherit', flex: 'none', width: 44, height: 44, margin: '-6px -8px -4px 2px', padding: 0, border: 0, borderRadius: 10,
  background: 'transparent', color: '#B9C1BF', fontSize: 20, lineHeight: 1, cursor: 'pointer', touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
};

/* a pin in its colour, the maps' shape */
function PinMark({ color, size = 14 }) {
  return (
    <svg viewBox="-9 -26 18 27" width={size} height={Math.round(size * 1.5)} aria-hidden="true" style={{ flex: '0 0 auto', marginRight: 6 }}>
      <path d="M0 0 L-7 -13 A8 8 0 1 1 7 -13 Z" fill={PIN_CSS[color] || '#F4F0E7'} stroke="rgba(11,22,27,0.92)" strokeWidth="1.6" />
      <circle cx="0" cy="-16" r="3.2" fill="#FFFFFF" />
    </svg>
  );
}

/* A button that acts on the lift of a press that began on it (swallowTapClick
   eats the click that follows, TRAPS §247), and on a click a key made (detail
   0: Enter's data-enter, a focused button's own key). */
function useAct() {
  const down = useRef(null);
  return (key, fn) => ({
    onPointerDown: (e) => { e.stopPropagation(); down.current = key; },
    onPointerUp: (e) => {
      e.stopPropagation();
      if (down.current !== key || (e.button !== undefined && e.button > 0)) return;
      down.current = null;
      swallowTapClick(e);
      fn();
    },
    onClick: (e) => { e.stopPropagation(); if (e.detail === 0) fn(); },
  });
}

/** The arrive and remove cards: mounted while you are in the world
 *  (WorldMapOverlay.jsx); `mapOpen` while the World map is. */
export function PinAskCard({ stateRef, mapOpen }) {
  const [ask, setAsk] = useState(() => pinAskNow());
  const [place, setPlace] = useState(null);
  const mapRef = useRef(!!mapOpen);
  mapRef.current = !!mapOpen;
  const act = useAct();
  useEffect(() => pinAskSubscribe(() => setAsk(pinAskNow())), []);
  /* the clock: asks on arriving, and lets a card go when it no longer holds */
  useEffect(() => {
    if (!mapPinsOn()) return undefined;
    let at = null;
    const tick = () => {
      const S = stateRef && stateRef.current;
      const P = S && S.player;
      if (!S || !P) return;
      const resolve = (id) => boardPlaceAt(S, id);
      const now = Date.now();
      /* always asked, so a pin far away arms (pinSlots.js pinArrival) */
      const hit = pinArrival(S, P, resolve);
      const cur = pinAskNow();
      if (cur) {
        const pin = pinOf(S, cur.color);
        const gone = !pin || (cur.kind === 'arrive' && (pin.asked || pinDistance(S, cur.color, P, resolve) > PIN.LEAVE_PX));
        if (gone || mapRef.current || otherCardUp()) { pinAskClose(); at = null; return; }
        const nx = cardPlace();
        if (!at || nx.top !== at.top || nx.left !== at.left || nx.w !== at.w) { at = nx; setPlace(nx); }
        return;
      }
      if (!hit || mapRef.current || S._zoneLoading || pinsFighting(S, now) || otherCardUp()) return;
      at = cardPlace();
      setPlace(at);
      pinAskOpen('arrive', hit);
    };
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [stateRef]);
  /* a card opened from outside the clock (the minimap's tap) is placed now */
  useEffect(() => { if (ask) setPlace(cardPlace()); }, [ask]);
  if (!ask || !mapPinsOn() || typeof document === 'undefined') return null;
  const pl = place || cardPlace();
  const name = PIN_NAME[ask.color].toLowerCase();
  const S = () => stateRef && stateRef.current;
  const remove = () => { const s = S(); if (s) liftPin(s, ask.color); pinAskClose(); };
  const keep = () => { const s = S(); if (s && ask.kind === 'arrive') markPinAsked(s, ask.color); pinAskClose(); };
  const title = ask.kind === 'arrive' ? `You reached the ${name} pin. Remove it?` : `Remove the ${name} pin?`;
  const stop = (e) => { e.stopPropagation(); };
  return createPortal(
    <div data-pin-ask={ask.kind} data-pin-ask-color={ask.color} data-pin-ask-at={pl.at || ''} role="dialog" aria-label={title}
      onPointerDown={stop} onTouchStart={stop} onMouseDown={stop} onClick={stop}
      style={{ ...CARD, position: 'fixed', left: pl.left, top: pl.top, width: pl.w, zIndex: Z_ABOVE_DASH_PROMPT }}>
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 34 }}>
        <PinMark color={ask.color} />
        <div data-pin-ask-title="" style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{deskWords(title)}</div>
        <button type="button" data-pin-ask-x="" data-esc="up" data-key="Esc" data-key-at="hang" aria-label={ask.kind === 'arrive' ? 'Keep the pin' : 'Cancel'}
          {...act('x', keep)} style={X_BTN}>×</button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button type="button" data-pin-ask-remove="" data-enter="" data-key="Enter" data-key-at="inline" {...act('remove', remove)} style={{ ...BTN, ...PRIMARY }}>Remove</button>
        <button type="button" data-pin-ask-keep="" {...act('keep', keep)} style={{ ...BTN, ...QUIET }}>{ask.kind === 'arrive' ? 'Keep' : 'Cancel'}</button>
      </div>
    </div>,
    document.body,
  );
}

/** "Replace which pin?" -- in the World map (its own box, so the map's
 *  canvas never sees its taps); `onPick(color)` or `onCancel()`. */
export function PinReplaceCard({ onPick, onCancel }) {
  const act = useAct();
  const stop = (e) => { e.stopPropagation(); };
  return (
    <div data-pin-replace="" role="dialog" aria-label="Replace which pin?"
      onPointerDown={stop} onPointerUp={stop} onTouchStart={stop} onMouseDown={stop} onClick={stop}
      style={{ ...CARD, position: 'absolute', left: '50%', top: 60, transform: 'translateX(-50%)', width: 264, maxWidth: 'calc(100% - 32px)', zIndex: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 34 }}>
        <div data-pin-replace-title="" style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700 }}>{deskWords('Replace which pin?')}</div>
        <button type="button" data-pin-replace-x="" data-esc="up" data-key="Esc" data-key-at="hang" aria-label="Cancel" {...act('x', onCancel)} style={X_BTN}>×</button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {PIN_SLOTS.map((k, i) => (
          <button key={k} type="button" data-pin-replace-pick={k} data-enter={i === 0 ? '' : undefined} data-key={i === 0 ? 'Enter' : undefined} data-key-at={i === 0 ? 'inline' : undefined} {...act(k, () => onPick(k))}
            style={{ ...BTN, ...colorBtn(k), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {PIN_NAME[k]}
          </button>
        ))}
        <button type="button" data-pin-replace-cancel="" {...act('cancel', onCancel)} style={{ ...BTN, ...QUIET }}>Cancel</button>
      </div>
    </div>
  );
}

/* for the World map's chips and key */
export { PinMark };
