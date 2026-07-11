import React from 'react';
import { BT_AUDIO, GAMBLE_MIN_BET, GAMBLE_WIN_CHANCE, JACKPOT_MIN_DEPOSIT, createDefaultCompStats } from '@/data/index.js';
import { _objectSpread } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* === GamblePanel — buildingPanel === 'gamble' sub-panel === */
/* v2.3.880: extracted verbatim from the buildingPanel === 'gamble'
   clause in BroTown.jsx (the casino: coin-flip bet + jackpot deposit).
   Behavior-frozen UI decomposition; the gate stays in BroTown. 3 props
   (rpgState, stateRef, setRpgState). Data imports verified real exports
   (createDefaultCompStats from items via the @/data barrel); the
   _objectSpread babel helper imported; the hoisted _compStats
   optional-chaining temps declared locally. setTimeout is a browser
   global. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   header strip + building icon; module headers + dividers replace the
   tinted cards; wager chips as pills (brass-fill selection); ROLL is
   the region's single brass primary; stats in a recessed well.
   Style/JSX only; gamble_request / jackpot_deposit handlers and the
   legacy local rolls are byte-identical. LS token block duplicated per
   building panel to keep the decomposed files dependency-free. */
var LS = {
  txt1: '#F7F2E7', txt2: '#B9C1BF', txt3: '#96A2A0', dis: '#687575',
  panel: '#202C32', strip: '#182227', raised: '#2B3940', well: '#121B20', wellSoft: '#19252A',
  border: 'rgba(238,242,235,.14)', divider: 'rgba(238,242,235,.10)', wellBorder: 'rgba(238,242,235,.08)',
  brass: '#D8A85F', brassFill: '#3B3427', onBrass: '#20170D'
};
/* v2.3.1232: -20 margin counters .bt-inspect-card's 20px padding so the
   panel owns its full surface (header strip flush to the card edge). */
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
var LS_BODY = { padding: '12px 14px 14px' };
var LS_MOD = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: LS.txt3, margin: '0 0 6px' };
var LS_DIV = { borderTop: '1px solid rgba(238,242,235,.10)', margin: '12px 0' };
function lsHeader(icon, emoji, title, subtitle) {
  return React.createElement("div", {
    style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border }
  }, /* v2.3.1224 pattern: UI Bible icon with emoji fallback */
  React.createElement("img", {
    src: '/icons/ui/bldg-' + icon + '.webp', alt: '', draggable: false,
    style: { width: 26, height: 26, objectFit: 'contain', flexShrink: 0 },
    onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }
  }), React.createElement("div", { style: { minWidth: 0 } },
    React.createElement("div", { style: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: LS.txt1 } }, title),
    subtitle ? React.createElement("div", { style: { fontSize: 11, color: LS.txt3, marginTop: 1 } }, subtitle) : null));
}
function lsGold(amount, size) {
  return React.createElement("span", {
    style: { display: 'inline-flex', alignItems: 'center', gap: 4, color: LS.brass, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: size || 14 }
  }, React.createElement("img", {
    src: '/icons/popups/gold.webp', alt: '', draggable: false,
    style: { width: 16, height: 16, objectFit: 'contain' },
    onError: function onError(e) { e.currentTarget.replaceWith(document.createTextNode('🪙')); }
  }), amount);
}
export function GamblePanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  var _rpgState$_compStats, _rpgState$_compStats2, _rpgState$_compStats3, _rpgState$_compStats4, _rpgState$_compStats5, _rpgState$_compStats6, _rpgState$_compStats7, _rpgState$_compStats8;
  return React.createElement("div", { style: LS_WRAP },
    lsHeader('gamble', '🎰', "Gambling Den", "Coin flips & the weekly jackpot"),
    React.createElement("div", { style: LS_BODY },
      React.createElement("div", {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }
      }, lsGold(rpgState.coins),
      React.createElement("span", { style: { fontSize: 12, color: LS.txt2, fontVariantNumeric: 'tabular-nums' } },
        "⭐ ", rpgState.achievementPoints || 0, " AP")),
      React.createElement("div", { style: LS_MOD }, "Double or Nothing"),
      React.createElement("div", {
        style: { fontSize: 11, color: LS.txt3, marginBottom: 8, lineHeight: 1.5 }
      }, "40% chance to double your wager. 60% chance to lose it all. House always wins... eventually."),
      React.createElement("div", {
        style: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }
      }, [10, 50, 100, 500, 1000, 5000].filter(function (v) {
        return v <= rpgState.coins;
      }).map(function (amt) {
        return /*#__PURE__*/React.createElement("button", {
          key: amt,
          style: {
            padding: '6px 12px',
            minHeight: 32,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            cursor: 'pointer',
            background: stateRef.current._gambleWager === amt ? LS.brassFill : LS.raised,
            border: stateRef.current._gambleWager === amt ? '1px solid ' + LS.brass : '1px solid ' + LS.border,
            color: stateRef.current._gambleWager === amt ? LS.brass : LS.txt2
          },
          onClick: function onClick() {
            stateRef.current._gambleWager = amt;
            setRpgState(_objectSpread({}, stateRef.current.rpg));
          }
        }, amt, "g");
      })), stateRef.current._gambleResult && Date.now() - stateRef.current._gambleResult.ts < 3000 && /*#__PURE__*/React.createElement("div", {
        style: {
          padding: 8,
          borderRadius: 8,
          marginBottom: 8,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          background: stateRef.current._gambleResult.won ? 'rgba(89,191,145,.12)' : 'rgba(217,92,84,.12)',
          border: stateRef.current._gambleResult.won ? '1px solid rgba(89,191,145,.35)' : '1px solid rgba(217,92,84,.35)',
          color: stateRef.current._gambleResult.won ? '#59BF91' : '#D95C54'
        }
      }, stateRef.current._gambleResult.won ? '🎉 WON! +' + stateRef.current._gambleResult.amount + 'g' : '💸 LOST! -' + stateRef.current._gambleResult.amount + 'g'), /*#__PURE__*/React.createElement("button", {
        style: {
          width: '100%',
          minHeight: 44,
          padding: '10px 0',
          borderRadius: 11,
          border: 'none',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '.03em',
          fontVariantNumeric: 'tabular-nums',
          cursor: 'pointer',
          background: stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager ? LS.brass : LS.well,
          color: stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager ? LS.onBrass : LS.dis
        },
        onClick: function onClick() {
          var wager = stateRef.current._gambleWager;
          if (!wager || wager < GAMBLE_MIN_BET) return;
          var R = stateRef.current.rpg;
          if (R.coins < wager) return;
          /* v2.3.1124: gamble-settling workers (caps.gamble) roll and pay
             server-side -- send the request and let the private
             gamble_result event (gameEvents.js) drive the popups while the
             player_state echo carries the coins.  The local roll below was
             the player being their own house; it survives only for legacy
             workers. */
          if (stateRef.current._serverCaps && stateRef.current._serverCaps.gamble) {
            if (stateRef.current.channel) {
              stateRef.current.channel.send({
                type: 'broadcast',
                event: 'gamble_request',
                payload: { wager: wager }
              });
            }
            return;
          }
          if (!R._compStats) R._compStats = createDefaultCompStats();
          R.coins -= wager;
          R._compStats.totalGambled += wager;
          R._compStats.totalGoldSpent += wager;
          var won = Math.random() < GAMBLE_WIN_CHANCE;
          if (won) {
            var winnings = wager * 2;
            R.coins += winnings;
            R._compStats.totalGambleWon += winnings;
            R._compStats.totalGoldEarned += winnings;
            stateRef.current._gambleResult = {
              won: true,
              amount: winnings,
              ts: Date.now()
            };
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, '+' + winnings + 'g!', '#59BF91');
            stateRef.current.screenShake = 3;
            BT_AUDIO.collect();
            setTimeout(function () {
              return BT_AUDIO.beep(784, 0.1, 0.08, 'sine');
            }, 100);
          } else {
            R._compStats.totalGambleLost += wager;
            stateRef.current._gambleResult = {
              won: false,
              amount: wager,
              ts: Date.now()
            };
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, '-' + wager + 'g', '#D95C54');
            BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
          }
          setRpgState(_objectSpread({}, R));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(R));
          } catch (e) {}
        }
      }, "🎲 ROLL! (", stateRef.current._gambleWager || '—', "g)"),
      React.createElement("div", { style: LS_DIV }),
      React.createElement("div", { style: LS_MOD }, "Weekly Jackpot"),
      React.createElement("div", {
        style: { fontSize: 11, color: LS.txt3, marginBottom: 6, lineHeight: 1.5 }
      }, "Server-wide pool. All deposits collected. One random winner each week. 10% house cut."),
      React.createElement("div", {
        style: { fontSize: 18, fontWeight: 700, color: LS.brass, textAlign: 'center', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }
      }, "🏆 ", stateRef.current._jackpotPool || '???', "g"),
      React.createElement("div", {
        style: { fontSize: 11, color: LS.txt3, textAlign: 'center', marginBottom: 8, fontVariantNumeric: 'tabular-nums' }
      }, "Your deposits this week: ", ((_rpgState$_compStats = rpgState._compStats) === null || _rpgState$_compStats === void 0 ? void 0 : _rpgState$_compStats.jackpotDeposited) || 0, "g \xB7 Min deposit: ", JACKPOT_MIN_DEPOSIT, "g"),
      React.createElement("div", {
        style: { display: 'flex', gap: 6 }
      }, [50, 100, 500, 1000].filter(function (v) {
        return v <= rpgState.coins;
      }).map(function (amt) {
        return /*#__PURE__*/React.createElement("button", {
          key: amt,
          style: {
            flex: 1,
            minHeight: 36,
            padding: '6px 0',
            borderRadius: 11,
            fontSize: 12,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            cursor: 'pointer',
            border: '1px solid ' + LS.border,
            background: LS.raised,
            color: LS.brass
          },
          onClick: function onClick() {
            var R = stateRef.current.rpg;
            if (R.coins < amt) return;
            /* v2.3.1149: SERVER-SETTLED jackpot (caps-gated per the
               deploy-order convention).  The worker debits coins, grows
               the real jackpot:draw pool, and replies jackpot_state (the
               gameEvents handler shows the popup + updates the pool
               display); the player_state echo is the coins tiebreaker --
               no local mutation here.  Legacy stub below stays for old
               workers only. */
            if (stateRef.current._serverCaps && stateRef.current._serverCaps.jackpot) {
              if (stateRef.current.channel) {
                stateRef.current.channel.send({
                  type: 'broadcast',
                  event: 'jackpot_deposit',
                  payload: { amount: amt }
                });
                if (!R._compStats) R._compStats = createDefaultCompStats();
                R._compStats.jackpotDeposited += amt; /* label-only tally */
                BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
              }
              return;
            }
            R.coins -= amt;
            if (!R._compStats) R._compStats = createDefaultCompStats();
            R._compStats.jackpotDeposited += amt;
            R._compStats.totalGoldSpent += amt;
            /* Legacy local stub -- only reachable against pre-v2.3.1149 workers */
            stateRef.current._jackpotPool = (stateRef.current._jackpotPool || 0) + amt;
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Deposited ' + amt + 'g to jackpot', '#D8A94D');
            BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (e) {}
          }
        }, amt, "g");
      })),
      React.createElement("div", { style: LS_DIV }),
      React.createElement("div", { style: LS_MOD }, "Gambling Stats"),
      React.createElement("div", {
        style: { padding: 10, borderRadius: 8, background: LS.wellSoft, border: '1px solid ' + LS.wellBorder }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: LS.txt3,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          fontVariantNumeric: 'tabular-nums'
        }
      }, /*#__PURE__*/React.createElement("span", null, "Total wagered:"), /*#__PURE__*/React.createElement("span", {
        style: {
          color: LS.txt1,
          fontWeight: 700,
          textAlign: 'right'
        }
      }, ((_rpgState$_compStats2 = rpgState._compStats) === null || _rpgState$_compStats2 === void 0 ? void 0 : _rpgState$_compStats2.totalGambled) || 0, "g"), /*#__PURE__*/React.createElement("span", null, "Total won:"), /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#59BF91',
          fontWeight: 700,
          textAlign: 'right'
        }
      }, ((_rpgState$_compStats3 = rpgState._compStats) === null || _rpgState$_compStats3 === void 0 ? void 0 : _rpgState$_compStats3.totalGambleWon) || 0, "g"), /*#__PURE__*/React.createElement("span", null, "Total lost:"), /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#D95C54',
          fontWeight: 700,
          textAlign: 'right'
        }
      }, ((_rpgState$_compStats4 = rpgState._compStats) === null || _rpgState$_compStats4 === void 0 ? void 0 : _rpgState$_compStats4.totalGambleLost) || 0, "g"), /*#__PURE__*/React.createElement("span", null, "Net:"), /*#__PURE__*/React.createElement("span", {
        style: {
          color: (((_rpgState$_compStats5 = rpgState._compStats) === null || _rpgState$_compStats5 === void 0 ? void 0 : _rpgState$_compStats5.totalGambleWon) || 0) - (((_rpgState$_compStats6 = rpgState._compStats) === null || _rpgState$_compStats6 === void 0 ? void 0 : _rpgState$_compStats6.totalGambleLost) || 0) >= 0 ? '#59BF91' : '#D95C54',
          fontWeight: 700,
          textAlign: 'right'
        }
      }, (((_rpgState$_compStats7 = rpgState._compStats) === null || _rpgState$_compStats7 === void 0 ? void 0 : _rpgState$_compStats7.totalGambleWon) || 0) - (((_rpgState$_compStats8 = rpgState._compStats) === null || _rpgState$_compStats8 === void 0 ? void 0 : _rpgState$_compStats8.totalGambleLost) || 0), "g")))));
}
