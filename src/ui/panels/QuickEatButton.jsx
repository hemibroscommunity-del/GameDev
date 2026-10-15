import React from 'react';
import { leftCluster, LCTL_SLOT, ctlBottom } from './ShieldButton.jsx';
import { Skin, PaintedIcon, pressOn, pressOff, useReadyFlash } from './controlSkin.jsx';
import { quickEatView } from '@/game/quickEat.js';
import { calcDisplayHeal } from '@/data/gameSystems.js';
import { eatBus } from '@/ui/mobile/eatBus.js';
import { thumbFor, iconFor } from '@/ui/mobile/dash/InventoryPanel.jsx';

/* ═══ v2.3.3260: QUICK EAT, OVER THE MOVEMENT STICK ═══
 * (game/quickEat.js has the why and the rules; docs/specs/pvp-fights.md)
 *
 * One tap eats the right food: the heal eaten at once that fills what you are
 * missing, else the biggest you carry -- in a fight with a player a quarter of it,
 * as the worker heals it.  It goes through eatBus, the bag's own Eat, so the
 * one-bite rule ("Eat again in Ns") and the worker's say are exactly the
 * bag's.
 *
 * WHERE: the left cluster's slot 1 (LCTL_SLOT.eat), up and to the right of
 * the Element Burst button over the movement disc -- the left thumb's, while
 * the right one keeps attacking.  The cluster's own arithmetic keeps half a
 * button of clear air from Burst, and combatBandTopPx counts it.
 *
 * WHAT IT SHOWS: the food's own bag picture and how many you carry.  While
 * the one-bite rule holds the next bite back in a fight with a player, the
 * skin's cooldown arc runs round the ring until you may eat again, and the
 * ring flashes once when you may.  Nothing else: no words.
 *
 * WHEN: only while you carry such a heal and are missing HP (quickEatView) --
 * hidden at full health, dead, or with nothing to eat.  Hidden on a keyboard
 * (bt-desktop-hide), where V eats (desktopControls.js).
 *
 * IT FIRES ON THE PRESS and swallows its touches -- the Element Burst
 * button's three guards (ElementBurstButton.jsx): the movement half listens
 * on the window, so a press that leaked would also start a walk. */

const POLL_MS = 150;

export function QuickEatButton(props) {
  var stateRef = props.stateRef;
  var isLandscape = props.isLandscape;
  var _t = React.useState(0);
  var setTick = _t[1];
  var keyRef = React.useRef('');

  React.useEffect(function () {
    var id = setInterval(function () {
      var v = quickEatView(stateRef && stateRef.current, calcDisplayHeal);
      var k = v ? v.renderKey : '';
      if (k !== keyRef.current) {
        keyRef.current = k;
        setTick(function (x) { return (x + 1) % 1000000; });
      }
    }, POLL_MS);
    return function () { clearInterval(id); };
  }, [stateRef]);

  var S = stateRef && stateRef.current;
  var view = quickEatView(S, calcDisplayHeal);
  /* above the early return, like every hook */
  var flash = useReadyFlash(!!(view && view.wait > 0));
  /* QA probe (house style: __btSprintBtn) */
  if (typeof window !== 'undefined') {
    window.__btQuickEat = function () {
      var s2 = stateRef && stateRef.current;
      return quickEatView(s2, calcDisplayHeal);
    };
  }
  if (!view) return null;

  var clu = leftCluster(isLandscape);
  var size = clu.size;
  var icon = Math.round(size * 0.66);
  var waiting = view.wait > 0;

  var press = function (e) {
    e.preventDefault();
    e.stopPropagation();
    pressOn(e);
    var s = stateRef && stateRef.current;
    var v = quickEatView(s, calcDisplayHeal);
    if (!v) return;
    /* the bag's own Eat (BroTown's handler): the one-bite rule says "Eat
       again in Ns" there, so a press while waiting is answered, not lost */
    eatBus.open(v.key);
    keyRef.current = '';
  };
  var swallowEnd = function (e) { e.preventDefault(); e.stopPropagation(); pressOff(e); };
  var swallowMove = function (e) { e.stopPropagation(); };

  return React.createElement('div', {
    className: 'bt-desktop-hide bt-quickeat-btn',
    'data-quickeat': view.key,
    'data-wait': waiting ? String(Math.ceil(view.wait / 1000)) : '0',
    'data-uisfx': 'off',
    role: 'button',
    'aria-label': 'Eat',
    onTouchStart: press,
    onTouchMove: swallowMove,
    onTouchEnd: swallowEnd,
    onTouchCancel: swallowEnd,
    onMouseDown: press,
    onMouseUp: swallowEnd,
    onContextMenu: function (e) { e.preventDefault(); },
    style: {
      position: 'fixed',
      left: clu.leftPx(LCTL_SLOT.eat) + 'px',
      bottom: ctlBottom(clu.bottomPx(LCTL_SLOT.eat)),
      width: size, height: size,
      zIndex: 31,
      touchAction: 'none',
      WebkitTapHighlightColor: 'transparent',
      WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
    },
  },
  React.createElement(Skin, {
    size: size, tone: 'slate', state: waiting ? 'cooldown' : 'normal',
    progress: waiting ? 1 - view.waitFrac : null, flash: flash,
  }, thumbFor(view.key)
    ? React.createElement(PaintedIcon, { src: thumbFor(view.key), name: 'food', size: icon, dim: waiting })
    /* the Garden Stew has no picture yet: the bag's glyph (data/dishes.js) */
    : React.createElement('span', {
      'data-icon': 'food',
      style: { fontSize: Math.round(icon * 0.72), lineHeight: 1, opacity: waiting ? 0.45 : 1, pointerEvents: 'none' },
    }, iconFor(view.key))),
  /* how many you carry, on the ring's lower right: the bag tile's own badge */
  React.createElement('span', {
    className: 'bt-item-qty',
    'data-quickeat-count': view.count,
    style: { right: -3, bottom: -3 },
  }, view.count > 99 ? '99+' : String(view.count)));
}
