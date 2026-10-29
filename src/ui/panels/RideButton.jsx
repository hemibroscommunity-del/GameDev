import React from 'react';
import { ctlColumn, ctlBottom, CTL_SLOT } from './ShieldButton.jsx';
import { rideSupported, rideButtonWanted, isRiding, toggleRide, rideOffLine, ASK_MS } from '@/game/ride.js';
import { rideGround } from '@/game/rideGround.js';
import { shieldButtonLive } from '@/game/shieldToggle.js';
import { TARGET_PERIMETER_PX } from '@/data/index.js';
import { RIDE_KEY } from '@/game/deskKeys.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { Skin, pressOn, pressOff } from './controlSkin.jsx';
import { RIDE_ICON_URL } from '@/rendering/rideFx.js';

/* ═══ v2.3.3776: THE SKATEBOARD BUTTON ═══
 *
 * The owner, 2026-10-28: "I want to be able to ride around on this just in the
 * safe Brotown area.  You can tap it to ride (maybe a button somewhere on
 * screen).  When outside of town it makes you get off."
 *
 * A TAP asks the worker to put you on the board, a tap again to take you off
 * (game/ride.js toggleRide; server/src/ride.js decides and answers
 * `ride_state`).  Z on a keyboard (desktopControls.js), worn as `data-key`.
 * Its face is the board itself, from above (the owner's "tap it to ride"),
 * lit warm while you ride.
 *
 * WHEN: only against a worker that carries boards (caps.ride), in the Wheel
 * on its safe ground -- BroTown and its commons -- alive and dry
 * (rideButtonWanted).  And NEVER while a fight is near: the shield up, the
 * Block button live, or a monster targeted.  That is what lets it share a
 * place with the fight's buttons without ever lying on one:
 *
 * WHERE: Shield Bash's place (ctlColumn, CTL_SLOT.bash) -- upright beside
 * Sprint, up and left of the attack disc (v2.3.3740), sideways and on a
 * computer beside the disc, level with its middle.  Bash shows only with the
 * shield up, TRAP only with a monster targeted, Block only with a fight near;
 * this only with none of them.  Nothing else is ever drawn there.
 *
 * IT MUST SWALLOW ITS OWN TOUCHES (SprintButton's way): it lies on
 * [data-joyzone="R"], where a touch begins an attack; every touch is stopped
 * here, and it toggles on a real TAP.  `touch-action: manipulation`
 * (TRAPS §229), and it closes nothing, so no swallowTapClick (TRAPS §247). */

const TAP_SLOP_PX = 14;
const TAP_MAX_MS = 600;
const POLL_MS = 120;
const GHOST_MS = 700;

/** What the button draws, as plain data (and its re-render key), or null
    when it is not drawn. */
export function rideButtonView(S) {
  if (!S || !S.rpg || !rideSupported(S)) return null;
  var g = rideGround(S);
  if (!rideButtonWanted(S, g)) return null;
  /* a fight near: the fight's buttons have this place */
  if (S._shieldUp || (S.lockedTarget && S.lockedTarget.type === 'monster')) return null;
  if (shieldButtonLive(S, TARGET_PERIMETER_PX)) return null;
  var on = isRiding(S);
  var r = S._ride;
  var asking = !!(r && r.asked && Date.now() - r.asked < ASK_MS);
  return { on: on, asking: asking, key: (on ? 1 : 0) + '|' + (asking ? 1 : 0) };
}

export function RideButton(props) {
  var stateRef = props.stateRef;
  var isLandscape = props.isLandscape;
  var _t = React.useState(0);
  var setTick = _t[1];
  var keyRef = React.useRef('');
  var touchRef = React.useRef(null);
  var lastTouchEndRef = React.useRef(0);
  var mouseDownRef = React.useRef(false);

  React.useEffect(function () {
    var id = setInterval(function () {
      var v = rideButtonView(stateRef && stateRef.current);
      var k = v ? v.key : '';
      if (k !== keyRef.current) {
        keyRef.current = k;
        setTick(function (x) { return (x + 1) % 1000000; });
      }
    }, POLL_MS);
    return function () { clearInterval(id); };
  }, [stateRef]);

  /* QA probe (house style: __btSprintBtn): what the button and the ride think */
  if (typeof window !== 'undefined') {
    window.__btRideBtn = function () {
      var s2 = stateRef && stateRef.current;
      var v = rideButtonView(s2);
      var r = s2 && s2._ride;
      return { shown: !!v, supported: rideSupported(s2), on: isRiding(s2), why: r ? r.why : null, n: r ? r.n : 0,
        others: s2 && s2.others ? Object.keys(s2.others).filter(function (id) { return s2.others[id] && s2.others[id]._brd; }) : [] };
    };
  }

  var S = stateRef && stateRef.current;
  var view = rideButtonView(S);
  if (!view) return null;

  var col = ctlColumn(isLandscape);
  var size = col.size;

  var tap = function () {
    var s = stateRef && stateRef.current;
    if (!s) return;
    var asked = toggleRide(s, Date.now(), function (type, payload) { if (s.channel) s.channel.send({ type: type, payload: payload }); });
    if (asked === null && s.player) pushDmgPopup(s, s.player.x, s.player.y - 70, rideOffLine('off'), '#F4E7C8');
    keyRef.current = '';
    setTick(function (x) { return (x + 1) % 1000000; });
  };
  var onTouchStart = function (e) {
    e.preventDefault(); e.stopPropagation();
    pressOn(e);
    var t = e.changedTouches && e.changedTouches[0];
    touchRef.current = t ? { x: t.clientX, y: t.clientY, at: Date.now(), id: t.identifier } : null;
  };
  var onTouchEnd = function (e) {
    e.preventDefault(); e.stopPropagation();
    pressOff(e);
    lastTouchEndRef.current = Date.now();
    var st = touchRef.current;
    touchRef.current = null;
    if (!st) return;
    var t = null;
    var list = e.changedTouches || [];
    for (var i = 0; i < list.length; i++) if (list[i].identifier === st.id) t = list[i];
    if (!t) return;
    var dx = t.clientX - st.x, dy = t.clientY - st.y;
    if (dx * dx + dy * dy <= TAP_SLOP_PX * TAP_SLOP_PX && Date.now() - st.at <= TAP_MAX_MS) tap();
  };
  var onMouseDown = function (e) { e.preventDefault(); e.stopPropagation(); pressOn(e); mouseDownRef.current = true; };
  var onMouseUp = function (e) {
    e.preventDefault(); e.stopPropagation();
    pressOff(e);
    var pressed = mouseDownRef.current;
    mouseDownRef.current = false;
    if (!pressed || Date.now() - lastTouchEndRef.current < GHOST_MS) return;
    tap();
  };

  var on = view.on;
  var pic = Math.round(size * 0.74);
  return React.createElement('div', {
    className: 'bt-ride-btn',
    'data-ride': on ? 'on' : (view.asking ? 'asking' : 'off'),
    'data-key': RIDE_KEY,
    'data-uisfx': 'off',
    role: 'button',
    'aria-label': on ? 'Get off the skateboard' : 'Ride the skateboard',
    'aria-pressed': on ? 'true' : 'false',
    onTouchStart: onTouchStart,
    onTouchMove: function (e) { e.stopPropagation(); },
    onTouchEnd: onTouchEnd,
    onTouchCancel: function (e) { e.stopPropagation(); pressOff(e); touchRef.current = null; },
    onMouseDown: onMouseDown,
    onMouseUp: onMouseUp,
    onContextMenu: function (e) { e.preventDefault(); },
    style: {
      position: 'fixed',
      right: col.right,
      bottom: ctlBottom(col.bottomPx(CTL_SLOT.bash)),
      width: size, height: size, borderRadius: '50%',
      zIndex: 31,
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
      WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
    },
  },
  React.createElement(Skin, { size: size, tone: on ? 'warm' : 'slate', state: on ? 'on' : (view.asking ? 'cooldown' : 'normal') },
    /* the board from above, turned across the button: the owner's own
       picture (public/sprites/ride/skateboard-top.png), loaded with the
       rider's art behind the loading screen (rideFx.js preloadRideArt) */
    React.createElement('img', {
      src: RIDE_ICON_URL, alt: '', draggable: false, 'data-icon': 'board',
      style: { display: 'block', width: Math.round(pic * 0.59), height: pic, objectFit: 'contain', pointerEvents: 'none',
        imageRendering: 'pixelated', transform: 'rotate(-35deg)' },
    })));
}
