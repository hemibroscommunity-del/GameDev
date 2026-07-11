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
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md §10) —
   world-card gradient + strong border on the score banner (the old
   backdrop-filter blur is removed: iOS hard lock), modal scrim +
   world card on the result overlay, spec text/semantic tokens.
   Styles + static JSX only; war reads and timers unchanged. */
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
        borderRadius: 12,
        overflow: 'hidden',
        /* v2.3.1232: world-card surface; blur removed (no backdrop-filter) */
        background: 'linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94))',
        border: '1px solid rgba(238,242,235,.24)',
        boxShadow: '0 14px 30px rgba(4,7,9,.38)',
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
        fontSize: 10,
        fontWeight: 600,
        color: us.color || '#D8A85F',
        letterSpacing: '.05em'
      }
    }, "[", us.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: '#F7F2E7',
        lineHeight: 1
      }
    }, us.score)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '4px 8px',
        textAlign: 'center',
        borderLeft: '1px solid rgba(238,242,235,.10)',
        borderRight: '1px solid rgba(238,242,235,.10)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 600,
        color: '#96A2A0',
        letterSpacing: '.12em'
      }
    }, "VS"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: timeLeft < 120 ? '#D95C54' : '#B9C1BF',
        fontFamily: 'Source Sans 3,sans-serif'
      }
    }, mins, ":", secs < 10 ? '0' + secs : secs), !inWarZone && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#96A2A0'
      }
    }, "Go to ", (_ZONES$war$zone2 = ZONES[war.zone]) === null || _ZONES$war$zone2 === void 0 ? void 0 : _ZONES$war$zone2.name), inWarZone && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#D95C54',
        fontWeight: 700
      }
    }, "⚔️ FIGHT!")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '6px 10px',
        textAlign: 'center',
        minWidth: 60,
        background: them.score > us.score ? 'rgba(217,92,84,.1)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 600,
        color: them.color || '#D95C54',
        letterSpacing: '.05em'
      }
    }, "[", them.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: '#F7F2E7',
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
        /* v2.3.1232: spec modal scrim; blur removed (no backdrop-filter) */
        background: 'rgba(8,16,20,.56)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        /* v2.3.1232: result content sits on a world card (scoreboard
           stays centered — it's a verdict readout, not a toast) */
        textAlign: 'center',
        padding: 24,
        maxWidth: 320,
        background: 'linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94))',
        border: '1px solid rgba(238,242,235,.24)',
        borderRadius: 12,
        boxShadow: '0 14px 30px rgba(4,7,9,.38)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 40,
        marginBottom: 8
      }
    }, isTie ? '⚔️' : isWinner ? '🏆' : '💀'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 700,
        color: isTie ? '#B9C1BF' : isWinner ? '#D8A85F' : '#D95C54',
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
        fontWeight: 600,
        color: us.color || '#D8A85F'
      }
    }, "[", us.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: '#F7F2E7'
      }
    }, us.score)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: 'rgba(238,242,235,.24)',
        fontWeight: 600
      }
    }, "—"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: them.color || '#D95C54'
      }
    }, "[", them.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: '#F7F2E7'
      }
    }, them.score))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#96A2A0',
        fontVariantNumeric: 'tabular-nums'
      }
    }, war.killLog.length, " total kills · ", (_ZONES$war$zone3 = ZONES[war.zone]) === null || _ZONES$war$zone3 === void 0 ? void 0 : _ZONES$war$zone3.name), war.killLog.length > 0 && function () {
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
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '.12em',
          color: '#96A2A0',
          marginBottom: 2
        }
      }, "TOP KILLERS"), sorted.map(function (_ref29, i) {
        var _ref30 = _slicedToArray(_ref29, 2),
          name = _ref30[0],
          pts = _ref30[1];
        return /*#__PURE__*/React.createElement("div", {
          key: i,
          style: {
            fontSize: 11,
            color: '#B9C1BF',
            fontVariantNumeric: 'tabular-nums'
          }
        }, ['🥇', '🥈', '🥉'][i], " ", name, ": ", pts, "pts");
      }));
    }(), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: '#96A2A0',
        marginTop: 8
      }
    }, "Closing in a few seconds...")));

}
