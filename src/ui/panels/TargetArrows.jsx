import React from 'react';
import { cycleTarget } from '@/game/targeting.js';
import { RBTN } from './ShieldButton.jsx';

/* ═══ v2.3.2230: THE TARGET-SWITCH ARROWS ═══
 *
 * Owner: "If multiple monsters in same perimeter there will be arrows above
 * the dashboard on that right side beneath the right button that allows you
 * to switch targets. Otherwise the target stays locked on the same monster."
 *
 * Two round arrow buttons that exist ONLY while two or more monsters are in
 * the targeting perimeter (S._targetCands, refreshed by updateTargeting each
 * frame).  They flank the shield button in the band under the right button
 * -- the owner put the shield "below the right button" and the arrows
 * "beneath the right button", and the 70px band has room for all three
 * (control-redesign.md §5.6): [◀] [shield] [▶].
 *
 * They step in SCREEN-X order (targeting.js candidatesByX), so ◀ is always
 * the monster to the left of the one you have.  Polled at the same 200ms
 * the other HUD buttons use; every touch stops the event so it never
 * reaches the canvas beneath as a lock-on tap.
 */
const SIZE = { p: 40, l: 44 };
const GAP = 8;

export function TargetArrows(props) {
  var stateRef = props.stateRef;
  var isLandscape = props.isLandscape;
  var _tick = React.useState(0);
  var setTick = _tick[1];
  React.useEffect(function () {
    var id = setInterval(function () { setTick(function (v) { return (v + 1) % 1000000; }); }, 200);
    return function () { clearInterval(id); };
  }, [setTick]);

  var S = stateRef && stateRef.current;
  if (!S || !S.rpg) return null;
  var cands = S._targetCands || [];
  if (cands.length < 2) return null;

  var size = isLandscape ? SIZE.l : SIZE.p;
  var shieldSize = isLandscape ? 54 : 48;
  var discW = isLandscape ? RBTN.wLand : RBTN.w;
  /* The shield button sits centred under the disc; the arrows sit either
     side of it with GAP between.  `right` grows leftward. */
  var shieldRight = RBTN.right + (discW - shieldSize) / 2;
  var nextRight = shieldRight - GAP - size;              /* ▶ to the RIGHT of the shield */
  var prevRight = shieldRight + shieldSize + GAP;        /* ◀ to the LEFT */
  var lockedId = S.lockedTarget && S.lockedTarget.type === 'monster' ? S.lockedTarget.id : null;

  var mk = function (dir, right, glyph, key) {
    var press = function (e) {
      e.preventDefault(); e.stopPropagation();
      try { cycleTarget(stateRef.current, dir); } catch (err) { /* no candidates: nothing to do */ }
      setTick(function (v) { return v + 1; });
    };
    return React.createElement('div', {
      key: key,
      'data-target': key,
      onTouchStart: press,
      onMouseDown: press,
      onContextMenu: function (e) { e.preventDefault(); },
      style: {
        position: 'fixed',
        right: right,
        bottom: 'calc(var(--sheet-h, var(--dash-h)) + ' + (12 + (shieldSize - size) / 2) + 'px)',
        width: size, height: size, borderRadius: '50%',
        zIndex: 31,
        touchAction: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        /* Lantern Slate: raised slate, brass edge -- the same chrome as the
           ability buttons and the shield, so the band reads as one cluster. */
        background: 'radial-gradient(circle, #34444B 0%, #202C32 100%)',
        border: '2px solid #D8A85F',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
        color: '#F7F2E7',
        fontSize: isLandscape ? 18 : 16,
        fontWeight: 700,
        WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
      },
    }, glyph);
  };

  return React.createElement(React.Fragment, null,
    React.createElement('div', {
      /* A tiny count pill above the shield: "2/3" -- which of the N in range
         you have, so switching has a visible frame of reference. */
      'data-target': 'count',
      style: {
        position: 'fixed',
        right: shieldRight - 2,
        bottom: 'calc(var(--sheet-h, var(--dash-h)) + ' + (12 + shieldSize + 2) + 'px)',
        width: shieldSize + 4, textAlign: 'center',
        fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
        color: '#B9C1BF', pointerEvents: 'none', zIndex: 31,
        textShadow: '0 1px 2px rgba(0,0,0,.85)',
      },
    }, (function () {
      var idx = -1;
      var ordered = cands.slice().sort(function (a, b) { return (a.x - b.x) || (a.y - b.y); });
      for (var i = 0; i < ordered.length; i++) if (ordered[i].m && ordered[i].m.id === lockedId) { idx = i; break; }
      return (idx >= 0 ? (idx + 1) : '-') + '/' + cands.length;
    })()),
    mk(-1, prevRight, '◀', 'prev'),
    mk(+1, nextRight, '▶', 'next'));
}
