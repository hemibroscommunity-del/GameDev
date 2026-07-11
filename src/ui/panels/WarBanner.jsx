import React from 'react';
import { ZONES } from '@/data/index.js';
import { _slicedToArray } from '@/lib/babelHelpers.js';
/* v2.3.1205: z registry — war banners are player-facing war state and
   must never stack under dashboard chrome (see src/ui/zLayers.js). */
import { Z_ABOVE_DASH_PROMPT } from '../zLayers.js';

/* === War banners — the clan-war HUD banners === */
/* v2.3.893: extracted verbatim from the two clan-war banner IIFEs in
   BroTown.jsx's render (an `function (_temp) { ... }()` pattern called
   with no arg — the param was just a babel optional-chaining temp). Each
   IIFE body becomes a stateRef-only component that reads
   stateRef.current._activeClanWar at render and returns its banner or
   null. Behavior-frozen (same read-at-render timing). ZONES imported;
   the babel temp is a local var. */
export function ActiveWarBanner(props) {
  var stateRef = props.stateRef;
  var _ZONES$war$zone2;

    var S = stateRef.current;
    var war = S._activeClanWar;
    if (!war || war.status !== 'active' || !S._clanData) return null;
    var isChallenger = war.challenger.tag === S._clanData.tag;
    var us = isChallenger ? war.challenger : war.defender;
    var them = isChallenger ? war.defender : war.challenger;
    var timeLeft = Math.max(0, Math.ceil((war.endTime - Date.now()) / 1000));
    var mins = Math.floor(timeLeft / 60);
    var secs = timeLeft % 60;
    var inWarZone = S.currentZone === war.zone;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 44,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: Z_ABOVE_DASH_PROMPT /* v2.3.1205: was 22 */,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        borderRadius: 10,
        overflow: 'hidden',
        background: 'rgba(0,0,0,.75)',
        border: '1.5px solid rgba(217,92,84,.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 2px 12px rgba(217,92,84,.15)',
        minWidth: 200
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '6px 10px',
        textAlign: 'center',
        minWidth: 60,
        background: us.score > them.score ? 'rgba(89,191,145,.1)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 800,
        color: us.color || '#D8A85F',
        letterSpacing: '.05em'
      }
    }, "[", us.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: '#fff',
        lineHeight: 1
      }
    }, us.score)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '4px 8px',
        textAlign: 'center',
        borderLeft: '1px solid rgba(255,255,255,.06)',
        borderRight: '1px solid rgba(255,255,255,.06)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        fontWeight: 800,
        color: 'rgba(255,255,255,.25)',
        letterSpacing: '.1em'
      }
    }, "VS"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: timeLeft < 120 ? '#D95C54' : 'rgba(255,255,255,.5)',
        fontFamily: 'Source Sans 3,sans-serif'
      }
    }, mins, ":", secs < 10 ? '0' + secs : secs), !inWarZone && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 6,
        color: 'rgba(255,255,255,.2)'
      }
    }, "Go to ", (_ZONES$war$zone2 = ZONES[war.zone]) === null || _ZONES$war$zone2 === void 0 ? void 0 : _ZONES$war$zone2.name), inWarZone && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 6,
        color: '#D95C54',
        fontWeight: 700
      }
    }, "\u2694\uFE0F FIGHT!")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '6px 10px',
        textAlign: 'center',
        minWidth: 60,
        background: them.score > us.score ? 'rgba(217,92,84,.1)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 800,
        color: them.color || '#D95C54',
        letterSpacing: '.05em'
      }
    }, "[", them.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: '#fff',
        lineHeight: 1
      }
    }, them.score)));
  
}

export function EndedWarBanner(props) {
  var stateRef = props.stateRef;
  var _ZONES$war$zone3;

    var S = stateRef.current;
    var war = S._activeClanWar;
    if (!war || war.status !== 'ended' || !S._clanData) return null;
    var isChallenger = war.challenger.tag === S._clanData.tag;
    var us = isChallenger ? war.challenger : war.defender;
    var them = isChallenger ? war.defender : war.challenger;
    var isWinner = war.winner === S._clanData.tag;
    var isTie = war.winner === 'tie';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        /* v2.3.1205: was 28 — the full-screen war-result overlay ended
           under the dashboard band (z 30); registry z lifts it clear. */
        zIndex: Z_ABOVE_DASH_PROMPT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        padding: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 40,
        marginBottom: 8
      }
    }, isTie ? '⚔️' : isWinner ? '🏆' : '💀'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: isTie ? 'rgba(255,255,255,.5)' : isWinner ? '#D8A94D' : '#D95C54',
        marginBottom: 4
      }
    }, isTie ? 'DRAW!' : isWinner ? 'VICTORY!' : 'DEFEAT'), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: us.color || '#D8A85F'
      }
    }, "[", us.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        fontWeight: 900,
        color: '#fff'
      }
    }, us.score)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: 'rgba(255,255,255,.2)',
        fontWeight: 800
      }
    }, "\u2014"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: them.color || '#D95C54'
      }
    }, "[", them.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        fontWeight: 900,
        color: '#fff'
      }
    }, them.score))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'rgba(255,255,255,.4)'
      }
    }, war.killLog.length, " total kills \xB7 ", (_ZONES$war$zone3 = ZONES[war.zone]) === null || _ZONES$war$zone3 === void 0 ? void 0 : _ZONES$war$zone3.name), war.killLog.length > 0 && function () {
      var killsByPlayer = {};
      war.killLog.forEach(function (k) {
        killsByPlayer[k.killer] = (killsByPlayer[k.killer] || 0) + k.points;
      });
      var sorted = Object.entries(killsByPlayer).sort(function (a, b) {
        return b[1] - a[1];
      }).slice(0, 3);
      return /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 8,
          fontWeight: 700,
          color: 'rgba(255,255,255,.3)',
          marginBottom: 2
        }
      }, "TOP KILLERS"), sorted.map(function (_ref29, i) {
        var _ref30 = _slicedToArray(_ref29, 2),
          name = _ref30[0],
          pts = _ref30[1];
        return /*#__PURE__*/React.createElement("div", {
          key: i,
          style: {
            fontSize: 9,
            color: 'rgba(255,255,255,.5)'
          }
        }, ['🥇', '🥈', '🥉'][i], " ", name, ": ", pts, "pts");
      }));
    }(), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.2)',
        marginTop: 8
      }
    }, "Closing in a few seconds...")));
  
}
