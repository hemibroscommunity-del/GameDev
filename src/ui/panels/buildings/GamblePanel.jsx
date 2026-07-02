import React from 'react';
import { BT_AUDIO, GAMBLE_MIN_BET, GAMBLE_WIN_CHANCE, JACKPOT_MIN_DEPOSIT, createDefaultCompStats } from '@/data/index.js';
import { _objectSpread } from '@/lib/babelHelpers.js';

/* === GamblePanel — buildingPanel === 'gamble' sub-panel === */
/* v2.3.880: extracted verbatim from the buildingPanel === 'gamble'
   clause in BroTown.jsx (the casino: coin-flip bet + jackpot deposit).
   Behavior-frozen UI decomposition; the gate stays in BroTown. 3 props
   (rpgState, stateRef, setRpgState). Data imports verified real exports
   (createDefaultCompStats from items via the @/data barrel); the
   _objectSpread babel helper imported; the hoisted _compStats
   optional-chaining temps declared locally. setTimeout is a browser
   global. */
export function GamblePanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState;
  var _rpgState$_compStats, _rpgState$_compStats2, _rpgState$_compStats3, _rpgState$_compStats4, _rpgState$_compStats5, _rpgState$_compStats6, _rpgState$_compStats7, _rpgState$_compStats8;
  return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\uD83C\uDFB0 Gambling Den"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, "g \xB7 AP: \u2B50", rpgState.achievementPoints || 0), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      background: 'rgba(255,94,108,.06)',
      border: '1px solid rgba(255,94,108,.2)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\uD83C\uDFB2 Double or Nothing"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 6
    }
  }, "40% chance to double your wager. 60% chance to lose it all. House always wins... eventually."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 3,
      marginBottom: 6,
      flexWrap: 'wrap'
    }
  }, [10, 50, 100, 500, 1000, 5000].filter(function (v) {
    return v <= rpgState.coins;
  }).map(function (amt) {
    return /*#__PURE__*/React.createElement("button", {
      key: amt,
      style: {
        padding: '3px 8px',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer',
        background: stateRef.current._gambleWager === amt ? 'rgba(255,94,108,.3)' : 'rgba(255,255,255,.06)',
        border: stateRef.current._gambleWager === amt ? '1px solid rgba(255,94,108,.5)' : '1px solid rgba(255,255,255,.08)',
        color: stateRef.current._gambleWager === amt ? '#ff5e6c' : 'rgba(255,255,255,.5)'
      },
      onClick: function onClick() {
        stateRef.current._gambleWager = amt;
        setRpgState(_objectSpread({}, stateRef.current.rpg));
      }
    }, amt, "g");
  })), stateRef.current._gambleResult && Date.now() - stateRef.current._gambleResult.ts < 3000 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 6,
      borderRadius: 6,
      marginBottom: 6,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 900,
      background: stateRef.current._gambleResult.won ? 'rgba(61,220,151,.15)' : 'rgba(255,94,108,.15)',
      border: stateRef.current._gambleResult.won ? '1px solid rgba(61,220,151,.3)' : '1px solid rgba(255,94,108,.3)',
      color: stateRef.current._gambleResult.won ? '#3dd497' : '#ff5e6c'
    }
  }, stateRef.current._gambleResult.won ? '🎉 WON! +' + stateRef.current._gambleResult.amount + 'g' : '💸 LOST! -' + stateRef.current._gambleResult.amount + 'g'), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '8px 0',
      borderRadius: 6,
      border: 'none',
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '.03em',
      cursor: 'pointer',
      background: stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager ? '#ff5e6c' : 'rgba(255,255,255,.08)',
      color: stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager ? '#fff' : 'rgba(255,255,255,.3)'
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
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: '+' + winnings + 'g!',
          color: '#3dd497',
          ts: Date.now()
        });
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
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: '-' + wager + 'g',
          color: '#ff5e6c',
          ts: Date.now()
        });
        BT_AUDIO.beep(150, 0.1, 0.15, 'sawtooth');
      }
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (e) {}
    }
  }, "\uD83C\uDFB2 ROLL! (", stateRef.current._gambleWager || '—', "g)")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      background: 'rgba(245,197,66,.06)',
      border: '1px solid rgba(245,197,66,.2)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83C\uDFC6 Weekly Jackpot"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 4
    }
  }, "Server-wide pool. All deposits collected. One random winner each week. 10% house cut."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: '#f5c542',
      textAlign: 'center',
      marginBottom: 6
    }
  }, "\uD83C\uDFC6 ", stateRef.current._jackpotPool || '???', "g"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      textAlign: 'center',
      marginBottom: 6
    }
  }, "Your deposits this week: ", ((_rpgState$_compStats = rpgState._compStats) === null || _rpgState$_compStats === void 0 ? void 0 : _rpgState$_compStats.jackpotDeposited) || 0, "g \xB7 Min deposit: ", JACKPOT_MIN_DEPOSIT, "g"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, [50, 100, 500, 1000].filter(function (v) {
    return v <= rpgState.coins;
  }).map(function (amt) {
    return /*#__PURE__*/React.createElement("button", {
      key: amt,
      style: {
        flex: 1,
        padding: '4px 0',
        borderRadius: 5,
        fontSize: 8,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(245,197,66,.3)',
        background: 'rgba(245,197,66,.1)',
        color: '#f5c542'
      },
      onClick: function onClick() {
        var R = stateRef.current.rpg;
        if (R.coins < amt) return;
        R.coins -= amt;
        if (!R._compStats) R._compStats = createDefaultCompStats();
        R._compStats.jackpotDeposited += amt;
        R._compStats.totalGoldSpent += amt;
        /* In production this would be a Supabase RPC call to add to server pool */
        stateRef.current._jackpotPool = (stateRef.current._jackpotPool || 0) + amt;
        stateRef.current.dmgNumbers.push({
          x: stateRef.current.player.x,
          y: stateRef.current.player.y - 30,
          text: 'Deposited ' + amt + 'g to jackpot',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (e) {}
      }
    }, amt, "g");
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 8,
      background: 'rgba(255,255,255,.03)',
      border: '1px solid rgba(255,255,255,.08)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#8890b8',
      marginBottom: 4
    }
  }, "\uD83D\uDCCA Gambling Stats"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", null, "Total wagered:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#fff',
      textAlign: 'right'
    }
  }, ((_rpgState$_compStats2 = rpgState._compStats) === null || _rpgState$_compStats2 === void 0 ? void 0 : _rpgState$_compStats2.totalGambled) || 0, "g"), /*#__PURE__*/React.createElement("span", null, "Total won:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#3dd497',
      textAlign: 'right'
    }
  }, ((_rpgState$_compStats3 = rpgState._compStats) === null || _rpgState$_compStats3 === void 0 ? void 0 : _rpgState$_compStats3.totalGambleWon) || 0, "g"), /*#__PURE__*/React.createElement("span", null, "Total lost:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#ff5e6c',
      textAlign: 'right'
    }
  }, ((_rpgState$_compStats4 = rpgState._compStats) === null || _rpgState$_compStats4 === void 0 ? void 0 : _rpgState$_compStats4.totalGambleLost) || 0, "g"), /*#__PURE__*/React.createElement("span", null, "Net:"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: (((_rpgState$_compStats5 = rpgState._compStats) === null || _rpgState$_compStats5 === void 0 ? void 0 : _rpgState$_compStats5.totalGambleWon) || 0) - (((_rpgState$_compStats6 = rpgState._compStats) === null || _rpgState$_compStats6 === void 0 ? void 0 : _rpgState$_compStats6.totalGambleLost) || 0) >= 0 ? '#3dd497' : '#ff5e6c',
      textAlign: 'right'
    }
  }, (((_rpgState$_compStats7 = rpgState._compStats) === null || _rpgState$_compStats7 === void 0 ? void 0 : _rpgState$_compStats7.totalGambleWon) || 0) - (((_rpgState$_compStats8 = rpgState._compStats) === null || _rpgState$_compStats8 === void 0 ? void 0 : _rpgState$_compStats8.totalGambleLost) || 0), "g"))));
}
