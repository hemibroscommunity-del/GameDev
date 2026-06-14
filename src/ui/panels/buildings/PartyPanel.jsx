import React from 'react';
import { ARENA_BET_MAX, ARENA_BET_MIN, ARENA_CHAMPION_REWARD, ARENA_ENTRY_FEE, ARENA_POLL_INTERVAL, BT_AUDIO } from '@/data/index.js';
import { BT_API_BASE } from '@/networking/index.js';
import { _asyncToGenerator, _objectSpread, _regenerator, _toConsumableArray } from '@/lib/babelHelpers.js';

/* === PartyPanel — buildingPanel === 'party' sub-panel === */
/* v2.3.881: extracted verbatim from the buildingPanel === 'party'
   clause in BroTown.jsx (the Arena: live tournament bracket, betting
   on matches, champion rewards, polling the worker for arena state).
   The largest sub-panel. Behavior-frozen UI decomposition; the gate
   stays in BroTown. 15 props (rpgState, stateRef, setRpgState plus the
   6 arena* state values and their 6 setters). Data imports verified
   real exports; BT_API_BASE re-imported from @/networking (byte-
   identical to BroTown's local var); async/regenerator + spread/
   spread-array babel helpers imported; the hoisted optional-chaining
   temp set declared locally. encodeURIComponent and fetch are browser
   globals. */
export function PartyPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    setRpgState = props.setRpgState,
    arenaBetAmount = props.arenaBetAmount,
    arenaBetTarget = props.arenaBetTarget,
    arenaBets = props.arenaBets,
    arenaHistory = props.arenaHistory,
    arenaStatus = props.arenaStatus,
    arenaTournament = props.arenaTournament,
    setArenaBetAmount = props.setArenaBetAmount,
    setArenaBetTarget = props.setArenaBetTarget,
    setArenaBets = props.setArenaBets,
    setArenaHistory = props.setArenaHistory,
    setArenaStatus = props.setArenaStatus,
    setArenaTournament = props.setArenaTournament;
  var _activePlayers$find, _arenaStatus$currentM, _arenaStatus$currentM2, _arenaTournament$cham, _arenaTournament$play, _arenaTournament$play2, _arenaTournament$play3, _arenaTournament$play4, _arenaTournament$play5, _arenaTournament$play6, _arenaTournament$rece, _remaining$find, _remaining$find2;
  return React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#ff5e6c',
      marginBottom: 2
    }
  }, "\uD83C\uDFDF\uFE0F Gladiator Arena"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.35)',
      marginBottom: 6
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, "G \xB7 Entry fee: ", ARENA_ENTRY_FEE, "G \xB7 10 rounds \xB7 Single elimination \xB7 No healing"), function () {
    var S = stateRef.current;
    /* Poll arena status periodically */
    if (!S._arenaLastPoll || Date.now() - S._arenaLastPoll > ARENA_POLL_INTERVAL) {
      S._arenaLastPoll = Date.now();
      fetch(BT_API_BASE + '/api/arena/status?playerId=' + encodeURIComponent(S.myId)).then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok) {
          setArenaStatus(d);
          if (d.tournament) setArenaTournament(d.tournament);
        }
      }).catch(function () {});
      fetch(BT_API_BASE + '/api/arena/tournament').then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok && d.tournament) setArenaTournament(d.tournament);
      }).catch(function () {});
    }
    return null;
  }(), (!arenaStatus || arenaStatus.status === 'none') && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8,
      lineHeight: 1.5
    }
  }, "Enter the arena for a 10-round single elimination tournament. Blind matchups \u2014 any level can face any level. No food or healing allowed. Only the final victor earns the Gladiator title and ", ARENA_CHAMPION_REWARD.ap, " AP!"), /*#__PURE__*/React.createElement("button", {
    onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
      var S, R, res, data, _t7;
      return _regenerator().w(function (_context8) {
        while (1) switch (_context8.p = _context8.n) {
          case 0:
            S = stateRef.current, R = S.rpg;
            if (!(!R || R.coins < ARENA_ENTRY_FEE)) {
              _context8.n = 1;
              break;
            }
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Need ' + ARENA_ENTRY_FEE + 'G!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context8.a(2);
          case 1:
            R.coins -= ARENA_ENTRY_FEE;
            if (R._compStats) R._compStats.totalGoldSpent += ARENA_ENTRY_FEE;
            _context8.p = 2;
            _context8.n = 3;
            return fetch(BT_API_BASE + '/api/arena/join', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                playerId: S.myId,
                name: S.myName,
                level: R.level,
                color: S.myColor
              })
            });
          case 3:
            res = _context8.v;
            _context8.n = 4;
            return res.json();
          case 4:
            data = _context8.v;
            if (data.ok) {
              _context8.n = 5;
              break;
            }
            R.coins += ARENA_ENTRY_FEE;
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: data.error || 'Failed',
              color: '#ff5e6c',
              ts: Date.now()
            });
            return _context8.a(2);
          case 5:
            setArenaStatus({
              ok: true,
              status: 'queued',
              position: data.queuePosition || 1,
              queueSize: data.queueSize || 1
            });
            if (data.started && data.tournament) setArenaTournament(data.tournament);
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Entered arena queue!',
              color: '#ff5e6c',
              ts: Date.now()
            });
            BT_AUDIO.beep(500, 0.08, 0.1, 'sine');
            _context8.n = 7;
            break;
          case 6:
            _context8.p = 6;
            _t7 = _context8.v;
            R.coins += ARENA_ENTRY_FEE;
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Server error',
              color: '#ff5e6c',
              ts: Date.now()
            });
          case 7:
            setRpgState(_objectSpread({}, R));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(R));
            } catch (_unused31) {}
          case 8:
            return _context8.a(2);
        }
      }, _callee8, null, [[2, 6]]);
    })),
    style: {
      width: '100%',
      padding: '10px 0',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 800,
      border: '2px solid rgba(255,94,108,.5)',
      background: 'rgba(255,94,108,.15)',
      color: '#ff5e6c',
      cursor: 'pointer',
      marginBottom: 8
    }
  }, "\uD83C\uDFDF\uFE0F Enter Arena (", ARENA_ENTRY_FEE, "G)")), (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'queued' && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 8,
      background: 'rgba(245,197,66,.08)',
      border: '1px solid rgba(245,197,66,.2)',
      marginBottom: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\u23F3 In Queue"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)'
    }
  }, "Position: ", arenaStatus.position, "/", arenaStatus.queueSize, " \xB7 Waiting for ", arenaStatus.queueSize < 4 ? '4' : '16', " players..."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.25)',
      marginTop: 4
    }
  }, "You can close this panel \u2014 you'll be notified when matched!"), /*#__PURE__*/React.createElement("button", {
    onClick: /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
      var S, _t8;
      return _regenerator().w(function (_context9) {
        while (1) switch (_context9.p = _context9.n) {
          case 0:
            S = stateRef.current;
            _context9.p = 1;
            _context9.n = 2;
            return fetch(BT_API_BASE + '/api/arena/leave', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                playerId: S.myId
              })
            });
          case 2:
            S.rpg.coins += ARENA_ENTRY_FEE; /* refund */
            setArenaStatus({
              ok: true,
              status: 'none'
            });
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 30,
              text: 'Left arena queue (+' + ARENA_ENTRY_FEE + 'G)',
              color: 'rgba(255,255,255,.5)',
              ts: Date.now()
            });
            setRpgState(_objectSpread({}, S.rpg));
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
            } catch (_unused32) {}
            _context9.n = 4;
            break;
          case 3:
            _context9.p = 3;
            _t8 = _context9.v;
          case 4:
            return _context9.a(2);
        }
      }, _callee9, null, [[1, 3]]);
    })),
    style: {
      marginTop: 6,
      padding: '4px 12px',
      borderRadius: 4,
      fontSize: 8,
      fontWeight: 700,
      border: '1px solid rgba(255,94,108,.2)',
      background: 'rgba(255,94,108,.08)',
      color: '#ff5e6c',
      cursor: 'pointer'
    }
  }, "Leave Queue (refund ", ARENA_ENTRY_FEE, "G)")), (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'fighting' && arenaStatus.currentMatch && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 8,
      background: 'rgba(255,94,108,.1)',
      border: '2px solid rgba(255,94,108,.4)',
      marginBottom: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 900,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\u2694\uFE0F FIGHT! Round ", arenaStatus.round), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 16,
      background: arenaStatus.currentMatch.p1Color || '#5b52ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 900,
      color: '#fff',
      margin: '0 auto'
    }
  }, ((_arenaStatus$currentM = arenaStatus.currentMatch.p1Name) === null || _arenaStatus$currentM === void 0 ? void 0 : _arenaStatus$currentM.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#fff',
      marginTop: 2
    }
  }, arenaStatus.currentMatch.p1Name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Lv", arenaStatus.currentMatch.p1Level)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: 'rgba(255,255,255,.3)'
    }
  }, "VS"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 16,
      background: arenaStatus.currentMatch.p2Color || '#ff5e6c',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 900,
      color: '#fff',
      margin: '0 auto'
    }
  }, ((_arenaStatus$currentM2 = arenaStatus.currentMatch.p2Name) === null || _arenaStatus$currentM2 === void 0 ? void 0 : _arenaStatus$currentM2.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#fff',
      marginTop: 2
    }
  }, arenaStatus.currentMatch.p2Name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Lv", arenaStatus.currentMatch.p2Level))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginTop: 6
    }
  }, "Find and defeat your opponent! PvP in any zone counts."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.15)',
      marginTop: 4
    }
  }, "If opponent doesn't show within 2 min, win is auto-awarded.")), (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'eliminated' && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 8,
      background: 'rgba(255,255,255,.03)',
      border: '1px solid rgba(255,255,255,.08)',
      marginBottom: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      marginBottom: 4
    }
  }, "\uD83D\uDC80"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      color: 'rgba(255,255,255,.5)'
    }
  }, "Eliminated \u2014 Round ", arenaStatus.round), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.25)',
      marginTop: 2
    }
  }, arenaStatus.wins, " wins \xB7 You can spectate the rest!")), arenaTournament && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#ff5e6c',
      marginBottom: 4
    }
  }, "\uD83C\uDFDF\uFE0F Tournament \u2014 Round ", arenaTournament.round, "/", arenaTournament.maxRounds, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginLeft: 4
    }
  }, arenaTournament.remaining, "/", arenaTournament.playerCount, " remaining")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, arenaTournament.players.map(function (p) {
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        background: p.eliminated ? 'rgba(255,255,255,.01)' : 'rgba(61,212,151,.08)',
        border: '1px solid ' + (p.eliminated ? 'rgba(255,255,255,.04)' : 'rgba(61,212,151,.2)'),
        color: p.eliminated ? 'rgba(255,255,255,.15)' : p.color || '#fff',
        textDecoration: p.eliminated ? 'line-through' : 'none',
        opacity: p.eliminated ? 0.4 : 1
      }
    }, p.eliminated ? '💀' : '⚔️', " ", p.name, " ", p.wins > 0 && '(' + p.wins + 'W)');
  })), arenaTournament.currentMatches.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Current Matches"), arenaTournament.currentMatches.map(function (m) {
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 6px',
        borderRadius: 4,
        background: m.resolved ? 'rgba(255,255,255,.02)' : 'rgba(255,94,108,.05)',
        border: '1px solid ' + (m.resolved ? 'rgba(255,255,255,.04)' : 'rgba(255,94,108,.15)'),
        marginBottom: 2,
        fontSize: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: m.p1Color || '#5b52ff',
        fontWeight: 700
      }
    }, m.p1Name), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'rgba(255,255,255,.2)'
      }
    }, "vs"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: m.p2Color || '#ff5e6c',
        fontWeight: 700
      }
    }, m.p2Name), m.resolved && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        fontSize: 7,
        color: '#3dd497'
      }
    }, "Winner: ", m.winnerId === m.p1 ? m.p1Name : m.p2Name), !m.resolved && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        fontSize: 7,
        color: '#f5c542'
      }
    }, "\u2694\uFE0F Fighting"));
  })), arenaTournament.status === 'complete' && arenaTournament.champion && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderRadius: 8,
      background: 'rgba(245,197,66,.1)',
      border: '2px solid rgba(245,197,66,.4)',
      textAlign: 'center',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28
    }
  }, "\uD83C\uDFC6"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: '#f5c542'
    }
  }, "GLADIATOR CHAMPION"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: '#fff',
      marginTop: 2
    }
  }, arenaTournament.champion.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: 'rgba(255,255,255,.4)'
    }
  }, arenaTournament.champion.wins, " wins \xB7 Lv", arenaTournament.champion.level), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: '#f5c542',
      marginTop: 4
    }
  }, "+", ARENA_CHAMPION_REWARD.gold, "G +", ARENA_CHAMPION_REWARD.ap, "AP + \"Gladiator\" title")), arenaTournament.recentMatches.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.3)',
      marginTop: 6,
      marginBottom: 2
    }
  }, "Recent Results"), arenaTournament.recentMatches.slice(-5).reverse().map(function (m, i) {
    var _arenaTournament$play, _arenaTournament$play2;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)',
        padding: '1px 0'
      }
    }, "R", m.round, ": ", m.winnerId === m.p1 ? '✅' : '❌', " ", ((_arenaTournament$play = arenaTournament.players.find(function (p) {
      return p.id === m.p1;
    })) === null || _arenaTournament$play === void 0 ? void 0 : _arenaTournament$play.name) || '?', " vs ", ((_arenaTournament$play2 = arenaTournament.players.find(function (p) {
      return p.id === m.p2;
    })) === null || _arenaTournament$play2 === void 0 ? void 0 : _arenaTournament$play2.name) || '?', " ", m.winnerId === m.p2 ? '✅' : '❌');
  }))), arenaTournament && arenaTournament.status === 'active' && (!arenaStatus || arenaStatus.status === 'none' || arenaStatus.status === 'eliminated') && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(245,197,66,.05)',
      border: '1px solid rgba(245,197,66,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83C\uDFB2 Spectator Betting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Bet on who wins the tournament. Blind \u2014 you can't see others' bets. Winner takes the pot!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Bet on:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, arenaTournament.players.filter(function (p) {
    return !p.eliminated;
  }).map(function (p) {
    var sel = arenaBetTarget === p.id;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: function onClick() {
        return setArenaBetTarget(sel ? null : p.id);
      },
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        border: '1.5px solid ' + (sel ? '#f5c542' : 'rgba(255,255,255,.08)'),
        background: sel ? 'rgba(245,197,66,.15)' : 'rgba(255,255,255,.02)',
        color: sel ? '#f5c542' : p.color || 'rgba(255,255,255,.5)',
        cursor: 'pointer'
      }
    }, p.name, " (Lv", p.level, ")");
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542'
    }
  }, "Amount:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: ARENA_BET_MIN,
    max: ARENA_BET_MAX,
    value: arenaBetAmount,
    onChange: function onChange(e) {
      return setArenaBetAmount(Math.max(ARENA_BET_MIN, Math.min(ARENA_BET_MAX, +e.target.value || ARENA_BET_MIN)));
    },
    style: {
      width: 70,
      padding: '3px 6px',
      borderRadius: 4,
      border: '1px solid rgba(255,255,255,.15)',
      background: 'rgba(255,255,255,.05)',
      color: '#f5c542',
      fontSize: 11,
      fontWeight: 800,
      fontFamily: 'Source Sans 3,sans-serif',
      textAlign: 'right',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "G (\uD83D\uDCB0", rpgState.coins, ")")), /*#__PURE__*/React.createElement("button", {
    disabled: !arenaBetTarget || rpgState.coins < arenaBetAmount,
    onClick: function onClick() {
      var _arenaTournament$play3;
      var S = stateRef.current,
        R = S.rpg;
      if (!R || !arenaBetTarget || R.coins < arenaBetAmount) return;
      R.coins -= arenaBetAmount;
      if (R._compStats) R._compStats.totalGoldSpent += arenaBetAmount;
      var bet = {
        playerId: S.myId,
        amount: arenaBetAmount,
        targetPlayerId: arenaBetTarget,
        tournamentId: arenaTournament.id,
        ts: Date.now()
      };
      if (!R._arenaBets) R._arenaBets = [];
      R._arenaBets.push(bet);
      setArenaBets([].concat(_toConsumableArray(arenaBets), [bet]));
      /* Track for achievements */
      if (!S.stats._betsMade) S.stats._betsMade = 0;
      S.stats._betsMade++;
      var targetName = ((_arenaTournament$play3 = arenaTournament.players.find(function (p) {
        return p.id === arenaBetTarget;
      })) === null || _arenaTournament$play3 === void 0 ? void 0 : _arenaTournament$play3.name) || '???';
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Bet ' + arenaBetAmount + 'G on ' + targetName + '!',
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (_unused34) {}
      /* Broadcast bet (server can validate later) */
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'arena_bet',
        payload: bet
      });
    },
    style: {
      width: '100%',
      padding: '6px 0',
      borderRadius: 5,
      fontSize: 10,
      fontWeight: 800,
      border: '1.5px solid ' + (arenaBetTarget ? 'rgba(245,197,66,.4)' : 'rgba(255,255,255,.06)'),
      background: arenaBetTarget ? 'rgba(245,197,66,.15)' : 'rgba(255,255,255,.02)',
      color: arenaBetTarget ? '#f5c542' : 'rgba(255,255,255,.15)',
      cursor: arenaBetTarget ? 'pointer' : 'not-allowed'
    }
  }, "\uD83C\uDFB2 Place Bet (", arenaBetAmount, "G)"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      color: 'rgba(255,255,255,.3)'
    }
  }, "Your Bets:"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).map(function (b, i) {
    var target = arenaTournament.players.find(function (p) {
      return p.id === b.targetPlayerId;
    });
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        padding: '1px 0'
      }
    }, b.amount, "G on ", (target === null || target === void 0 ? void 0 : target.name) || '???', " ", target !== null && target !== void 0 && target.eliminated ? '💀 (eliminated)' : '⚔️');
  }))), arenaTournament && arenaTournament.status === 'active' && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(245,197,66,.06)',
      border: '1px solid rgba(245,197,66,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83C\uDFB2 Place a Bet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 6
    }
  }, "Blind bet on who wins the tournament. Payout: pot split among winners. Min ", ARENA_BET_MIN, "G, Max ", ARENA_BET_MAX, "G."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Pick a Fighter"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, arenaTournament.players.filter(function (p) {
    return !p.eliminated;
  }).map(function (p) {
    var sel = arenaBetTarget === p.id;
    var isMe = p.id === stateRef.current.myId;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: function onClick() {
        return !isMe && setArenaBetTarget(sel ? null : p.id);
      },
      style: {
        padding: '3px 6px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        border: '1.5px solid ' + (sel ? '#f5c542' : 'rgba(255,255,255,.08)'),
        background: sel ? 'rgba(245,197,66,.15)' : 'rgba(255,255,255,.02)',
        color: sel ? '#f5c542' : isMe ? 'rgba(255,255,255,.15)' : p.color || 'rgba(255,255,255,.4)',
        cursor: isMe ? 'not-allowed' : 'pointer',
        opacity: isMe ? 0.3 : 1
      }
    }, p.name, " ", p.wins > 0 && '(' + p.wins + 'W)', isMe && ' (you)');
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: '#f5c542'
    }
  }, "Bet:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: ARENA_BET_MIN,
    max: ARENA_BET_MAX,
    value: arenaBetAmount,
    onChange: function onChange(e) {
      return setArenaBetAmount(Math.max(ARENA_BET_MIN, Math.min(ARENA_BET_MAX, +e.target.value || ARENA_BET_MIN)));
    },
    style: {
      width: 60,
      padding: '3px 6px',
      borderRadius: 4,
      border: '1px solid rgba(245,197,66,.3)',
      background: 'rgba(255,255,255,.05)',
      color: '#f5c542',
      fontSize: 10,
      fontWeight: 800,
      fontFamily: 'Source Sans 3,sans-serif',
      textAlign: 'right',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "gold"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.15)',
      marginLeft: 'auto'
    }
  }, "\uD83D\uDCB0 ", rpgState.coins, "G")), /*#__PURE__*/React.createElement("button", {
    disabled: !arenaBetTarget || rpgState.coins < arenaBetAmount,
    onClick: function onClick() {
      var _arenaTournament$play4;
      var S = stateRef.current,
        R = S.rpg;
      if (!R || !arenaBetTarget || R.coins < arenaBetAmount) return;
      /* Check not already bet on this tournament */
      if (arenaBets.find(function (b) {
        return b.tournamentId === arenaTournament.id && b.playerId === S.myId;
      })) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Already bet on this tournament!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      R.coins -= arenaBetAmount;
      if (R._compStats) R._compStats.totalGoldSpent += arenaBetAmount;
      var bet = {
        playerId: S.myId,
        playerName: S.myName,
        targetPlayerId: arenaBetTarget,
        targetName: ((_arenaTournament$play4 = arenaTournament.players.find(function (p) {
          return p.id === arenaBetTarget;
        })) === null || _arenaTournament$play4 === void 0 ? void 0 : _arenaTournament$play4.name) || '???',
        amount: arenaBetAmount,
        tournamentId: arenaTournament.id,
        ts: Date.now()
      };
      setArenaBets(function (prev) {
        return [].concat(_toConsumableArray(prev), [bet]);
      });
      /* Broadcast bet to others */
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'arena_bet',
        payload: bet
      });
      if (!S.stats._betsMade) S.stats._betsMade = 0;
      S.stats._betsMade++;
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Bet ' + arenaBetAmount + 'G on ' + bet.targetName + '!',
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (_unused35) {}
    },
    style: {
      width: '100%',
      padding: '6px 0',
      borderRadius: 5,
      fontSize: 9,
      fontWeight: 800,
      border: '1.5px solid ' + (arenaBetTarget ? 'rgba(245,197,66,.4)' : 'rgba(255,255,255,.06)'),
      background: arenaBetTarget ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
      color: arenaBetTarget ? '#f5c542' : 'rgba(255,255,255,.15)',
      cursor: arenaBetTarget ? 'pointer' : 'not-allowed'
    }
  }, "\uD83C\uDFB2 Place Bet ", arenaBetTarget ? '(' + arenaBetAmount + 'G on ' + (((_arenaTournament$play5 = arenaTournament.players.find(function (p) {
    return p.id === arenaBetTarget;
  })) === null || _arenaTournament$play5 === void 0 ? void 0 : _arenaTournament$play5.name) || '???') + ')' : ''), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 2
    }
  }, "Active Bets"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).map(function (b, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        padding: '1px 0'
      }
    }, b.playerName, " bet ", b.amount, "G on ", b.targetName);
  }))), (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.status) === 'complete' && arenaBets.length > 0 && function (_arenaTournament$cham) {
    var S = stateRef.current;
    if (S._betsResolved === arenaTournament.id) return null;
    S._betsResolved = arenaTournament.id;
    var myBets = arenaBets.filter(function (b) {
      return b.playerId === S.myId && b.tournamentId === arenaTournament.id;
    });
    var allBets = arenaBets.filter(function (b) {
      return b.tournamentId === arenaTournament.id;
    });
    var totalPot = allBets.reduce(function (s, b) {
      return s + b.amount;
    }, 0);
    var winnerId = (_arenaTournament$cham = arenaTournament.champion) === null || _arenaTournament$cham === void 0 ? void 0 : _arenaTournament$cham.id;
    var winningBets = allBets.filter(function (b) {
      return b.targetPlayerId === winnerId;
    });
    var winningTotal = winningBets.reduce(function (s, b) {
      return s + b.amount;
    }, 0);
    myBets.forEach(function (bet) {
      if (bet.targetPlayerId === winnerId && winningTotal > 0) {
        var payout = Math.floor(totalPot * (bet.amount / winningTotal));
        S.rpg.coins += payout;
        if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += payout;
        if (!S.stats._betsWon) S.stats._betsWon = 0;
        S.stats._betsWon++;
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 60,
          text: 'Bet WON! +' + payout + 'G',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.collect();
      } else {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 60,
          text: 'Bet lost (-' + bet.amount + 'G)',
          color: '#ff5e6c',
          ts: Date.now()
        });
      }
    });
    if (myBets.length > 0) {
      setRpgState(_objectSpread({}, S.rpg));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
      } catch (_unused36) {}
    }
    return null;
  }(), arenaTournament && arenaTournament.status === 'active' && (!arenaStatus || arenaStatus.status === 'none' || arenaStatus.status === 'eliminated') && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      padding: 8,
      borderRadius: 6,
      background: 'rgba(245,197,66,.06)',
      border: '1px solid rgba(245,197,66,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: '#f5c542',
      marginBottom: 4
    }
  }, "\uD83C\uDFB2 Spectator Betting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 4
    }
  }, "Bet blind on who wins! Gold paid out proportionally if your pick wins the tournament."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Pick Winner"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 4
    }
  }, arenaTournament.players.filter(function (p) {
    return !p.eliminated;
  }).map(function (p) {
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: function onClick() {
        return setArenaBetTarget(p.id);
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1.5px solid ' + (arenaBetTarget === p.id ? '#f5c542' : 'rgba(255,255,255,.08)'),
        background: arenaBetTarget === p.id ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
        color: arenaBetTarget === p.id ? '#f5c542' : p.color || 'rgba(255,255,255,.4)',
        cursor: 'pointer'
      }
    }, p.name, " (Lv", p.level, ")");
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)'
    }
  }, "Amount:"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: ARENA_BET_MIN,
    max: ARENA_BET_MAX,
    value: arenaBetAmount,
    onChange: function onChange(e) {
      return setArenaBetAmount(Math.max(ARENA_BET_MIN, Math.min(ARENA_BET_MAX, +e.target.value || ARENA_BET_MIN)));
    },
    style: {
      width: 60,
      padding: '3px 5px',
      borderRadius: 3,
      border: '1px solid rgba(255,255,255,.15)',
      background: 'rgba(255,255,255,.05)',
      color: '#f5c542',
      fontSize: 10,
      fontWeight: 800,
      fontFamily: 'Source Sans 3,sans-serif',
      textAlign: 'right',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 7,
      color: 'rgba(255,255,255,.25)'
    }
  }, "G (\uD83D\uDCB0", rpgState.coins, ")")), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      var _arenaTournament$play6;
      var S = stateRef.current,
        R = S.rpg;
      if (!R || !arenaBetTarget) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Pick a player!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      if (R.coins < arenaBetAmount) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Not enough gold!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      /* Check if already bet on this tournament */
      if (arenaBets.find(function (b) {
        return b.tournamentId === arenaTournament.id && b.playerId === S.myId;
      })) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Already placed a bet!',
          color: '#ff5e6c',
          ts: Date.now()
        });
        return;
      }
      R.coins -= arenaBetAmount;
      if (R._compStats) R._compStats.totalGoldSpent += arenaBetAmount;
      var bet = {
        playerId: S.myId,
        amount: arenaBetAmount,
        targetPlayerId: arenaBetTarget,
        targetName: ((_arenaTournament$play6 = arenaTournament.players.find(function (p) {
          return p.id === arenaBetTarget;
        })) === null || _arenaTournament$play6 === void 0 ? void 0 : _arenaTournament$play6.name) || '???',
        tournamentId: arenaTournament.id,
        ts: Date.now()
      };
      setArenaBets(function (prev) {
        return [].concat(_toConsumableArray(prev), [bet]);
      });
      /* Broadcast bet to other spectators */
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'arena_bet',
        payload: bet
      });
      /* Track stats */
      if (!S.stats._betsMade) S.stats._betsMade = 0;
      S.stats._betsMade++;
      S.dmgNumbers.push({
        x: S.player.x,
        y: S.player.y - 30,
        text: 'Bet ' + arenaBetAmount + 'G on ' + bet.targetName,
        color: '#f5c542',
        ts: Date.now()
      });
      BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (_unused37) {}
    },
    style: {
      width: '100%',
      padding: '5px 0',
      borderRadius: 4,
      fontSize: 9,
      fontWeight: 800,
      border: '1px solid rgba(245,197,66,.3)',
      background: 'rgba(245,197,66,.1)',
      color: '#f5c542',
      cursor: 'pointer'
    }
  }, "\uD83C\uDFB2 Place Bet (", arenaBetAmount, "G)"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 7,
      fontWeight: 700,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 2
    }
  }, "Active Bets"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).map(function (b, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.25)',
        padding: '1px 0'
      }
    }, b.playerId === stateRef.current.myId ? 'You' : b.playerId.slice(0, 4), " \u2192 ", b.targetName, ": ", b.amount, "G");
  }))), arenaTournament && arenaTournament.status === 'complete' && arenaTournament.champion && function () {
    var S = stateRef.current;
    /* Check if we have a winning bet */
    if (!S._betPayoutChecked || S._betPayoutChecked !== arenaTournament.id) {
      S._betPayoutChecked = arenaTournament.id;
      var myBet = arenaBets.find(function (b) {
        return b.tournamentId === arenaTournament.id && b.playerId === S.myId;
      });
      if (myBet && myBet.targetPlayerId === arenaTournament.champion.id) {
        /* Winner! Payout 2x */
        var payout = myBet.amount * 2;
        S.rpg.coins += payout;
        if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += payout;
        if (!S.stats._betsWon) S.stats._betsWon = 0;
        S.stats._betsWon++;
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 60,
          text: 'BET WON! +' + payout + 'G',
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.levelUp();
        setRpgState(_objectSpread({}, S.rpg));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
        } catch (_unused38) {}
      } else if (myBet) {
        S.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 60,
          text: 'Bet lost (-' + myBet.amount + 'G)',
          color: '#ff5e6c',
          ts: Date.now()
        });
      }
    }
    return null;
  }(), arenaTournament && arenaTournament.status === 'active' && ((arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'none' || (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'eliminated') && function (_remaining$find) {
    var S = stateRef.current;
    var remaining = arenaTournament.players.filter(function (p) {
      return !p.eliminated;
    });
    var myBet = arenaBets.find(function (b) {
      return b.round === arenaTournament.round;
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        padding: 8,
        borderRadius: 8,
        background: 'rgba(245,197,66,.06)',
        border: '1px solid rgba(245,197,66,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: '#f5c542',
        marginBottom: 4
      }
    }, "\uD83C\uDFB2 Spectator Betting"), myBet ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.4)'
      }
    }, "Bet placed: ", myBet.amount, "G on ", ((_remaining$find = remaining.find(function (p) {
      return p.id === myBet.targetPlayerId;
    })) === null || _remaining$find === void 0 ? void 0 : _remaining$find.name) || '???', /*#__PURE__*/React.createElement("br", null), "Round ", arenaTournament.round, " \u2014 waiting for results...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 4
      }
    }, "Blind bet \u2014 pick who you think will win this round. ", remaining.length, " players left."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        marginBottom: 6
      }
    }, remaining.map(function (p) {
      return /*#__PURE__*/React.createElement("button", {
        key: p.id,
        onClick: function onClick() {
          return setArenaBetTarget(arenaBetTarget === p.id ? null : p.id);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1.5px solid ' + (arenaBetTarget === p.id ? '#f5c542' : 'rgba(255,255,255,.08)'),
          background: arenaBetTarget === p.id ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
          color: arenaBetTarget === p.id ? '#f5c542' : p.color || '#fff',
          cursor: 'pointer'
        }
      }, p.name, " (Lv", p.level, ")");
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: '#f5c542'
      }
    }, "Bet:"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: ARENA_BET_MIN,
      max: Math.min(ARENA_BET_MAX, rpgState.coins),
      value: arenaBetAmount,
      onChange: function onChange(e) {
        return setArenaBetAmount(Math.max(ARENA_BET_MIN, Math.min(ARENA_BET_MAX, +e.target.value || ARENA_BET_MIN)));
      },
      style: {
        width: 60,
        padding: '3px 5px',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.05)',
        color: '#f5c542',
        fontSize: 10,
        fontWeight: 800,
        textAlign: 'right',
        outline: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)'
      }
    }, "G (max ", Math.min(ARENA_BET_MAX, rpgState.coins), ")")), /*#__PURE__*/React.createElement("button", {
      disabled: !arenaBetTarget || rpgState.coins < arenaBetAmount,
      onClick: function onClick() {
        var _remaining$find2;
        var S2 = stateRef.current,
          R = S2.rpg;
        if (!R || !arenaBetTarget || R.coins < arenaBetAmount) return;
        R.coins -= arenaBetAmount;
        if (R._compStats) R._compStats.totalGoldSpent += arenaBetAmount;
        var bet = {
          playerId: S2.myId,
          amount: arenaBetAmount,
          targetPlayerId: arenaBetTarget,
          round: arenaTournament.round,
          ts: Date.now()
        };
        setArenaBets(function (prev) {
          return [].concat(_toConsumableArray(prev), [bet]);
        });
        if (!S2.stats._betsMade) S2.stats._betsMade = 0;
        S2.stats._betsMade++;
        S2.dmgNumbers.push({
          x: S2.player.x,
          y: S2.player.y - 30,
          text: 'Bet ' + arenaBetAmount + 'G on ' + ((_remaining$find2 = remaining.find(function (p) {
            return p.id === arenaBetTarget;
          })) === null || _remaining$find2 === void 0 ? void 0 : _remaining$find2.name),
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.beep(600, 0.05, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused39) {}
      },
      style: {
        width: '100%',
        padding: '6px 0',
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 800,
        border: '1.5px solid ' + (arenaBetTarget ? 'rgba(245,197,66,.4)' : 'rgba(255,255,255,.06)'),
        background: arenaBetTarget ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
        color: arenaBetTarget ? '#f5c542' : 'rgba(255,255,255,.15)',
        cursor: arenaBetTarget ? 'pointer' : 'not-allowed'
      }
    }, "\uD83C\uDFB2 Place Bet")));
  }(), function () {
    var S = stateRef.current;
    if (arenaTournament && arenaBets.length > 0) {
      var lastBet = arenaBets[arenaBets.length - 1];
      /* Check if the round the bet was for has completed */
      if (lastBet.round < arenaTournament.round || arenaTournament.status === 'complete') {
        var _arenaTournament$rece;
        var betRound = lastBet.round;
        var matchResult = (_arenaTournament$rece = arenaTournament.recentMatches) === null || _arenaTournament$rece === void 0 ? void 0 : _arenaTournament$rece.find(function (m) {
          return m.round === betRound && (m.p1 === lastBet.targetPlayerId || m.p2 === lastBet.targetPlayerId);
        });
        if (matchResult && !lastBet._resolved) {
          lastBet._resolved = true;
          var won = matchResult.winnerId === lastBet.targetPlayerId;
          if (won) {
            var payout = Math.ceil(lastBet.amount * 1.8); /* 1.8x payout */
            S.rpg.coins += payout;
            if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += payout;
            if (!S.stats._betsWon) S.stats._betsWon = 0;
            S.stats._betsWon++;
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 50,
              text: 'BET WON! +' + payout + 'G',
              color: '#3dd497',
              ts: Date.now()
            });
            BT_AUDIO.collect();
          } else {
            S.dmgNumbers.push({
              x: S.player.x,
              y: S.player.y - 50,
              text: 'Bet lost (-' + lastBet.amount + 'G)',
              color: '#ff5e6c',
              ts: Date.now()
            });
          }
          setRpgState(_objectSpread({}, S.rpg));
          try {
            localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
          } catch (_unused40) {}
        }
      }
    }
    return null;
  }(), function () {
    var S = stateRef.current;
    if (!S._arenaHistoryLoaded) {
      S._arenaHistoryLoaded = true;
      fetch(BT_API_BASE + '/api/arena/history').then(function (r) {
        return r.json();
      }).then(function (d) {
        if (d.ok) setArenaHistory(d.champions || []);
      }).catch(function () {});
    }
    return arenaHistory.length > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: '#f5c542',
        marginBottom: 3
      }
    }, "\uD83C\uDFC6 Hall of Fame"), arenaHistory.slice(0, 10).map(function (c, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          borderRadius: 4,
          background: 'rgba(245,197,66,.04)',
          border: '1px solid rgba(245,197,66,.1)',
          marginBottom: 2,
          fontSize: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10
        }
      }, i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'), /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 700,
          color: '#f5c542'
        }
      }, c.championName), /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'rgba(255,255,255,.3)',
          marginLeft: 'auto'
        }
      }, c.wins, "W \xB7 ", c.totalPlayers, "P"));
    })) : null;
  }(), arenaTournament && arenaTournament.status === 'active' && function () {
    var S = stateRef.current;
    var myPlayer = arenaTournament.players.find(function (p) {
      return p.id === S.myId;
    });
    var isSpectator = !myPlayer || myPlayer.eliminated;
    var activePlayers = arenaTournament.players.filter(function (p) {
      return !p.eliminated;
    });
    var myBets = arenaBets.filter(function (b) {
      return b.bettorId === S.myId;
    });
    if (!isSpectator && !(myPlayer !== null && myPlayer !== void 0 && myPlayer.eliminated)) return null; /* can't bet while fighting */

    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: 8,
        borderRadius: 8,
        background: 'rgba(245,197,66,.05)',
        border: '1px solid rgba(245,197,66,.15)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: '#f5c542',
        marginBottom: 4
      }
    }, "\uD83C\uDFB2 Spectator Betting"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        marginBottom: 6
      }
    }, "Blind bet on who wins the tournament. Payout: pot \xF7 winners. \uD83D\uDCB0 ", rpgState.coins, "G"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: 'rgba(255,255,255,.4)',
        marginBottom: 2
      }
    }, "Bet on Champion"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        marginBottom: 6
      }
    }, activePlayers.map(function (p) {
      return /*#__PURE__*/React.createElement("button", {
        key: p.id,
        onClick: function onClick() {
          return setArenaBetTarget(p.id);
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1.5px solid ' + (arenaBetTarget === p.id ? '#f5c542' : 'rgba(255,255,255,.08)'),
          background: arenaBetTarget === p.id ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
          color: arenaBetTarget === p.id ? '#f5c542' : p.color || 'rgba(255,255,255,.4)',
          cursor: 'pointer'
        }
      }, p.name, " (Lv", p.level, ")");
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: 'rgba(255,255,255,.4)'
      }
    }, "Amount:"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: ARENA_BET_MIN,
      max: Math.min(ARENA_BET_MAX, rpgState.coins),
      value: arenaBetAmount,
      onChange: function onChange(e) {
        return setArenaBetAmount(Math.max(ARENA_BET_MIN, +e.target.value || ARENA_BET_MIN));
      },
      style: {
        width: 60,
        padding: '3px 6px',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.05)',
        color: '#f5c542',
        fontSize: 10,
        fontWeight: 800,
        fontFamily: 'Source Sans 3,sans-serif',
        textAlign: 'right',
        outline: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.2)'
      }
    }, "G"), [50, 100, 500].map(function (v) {
      return /*#__PURE__*/React.createElement("button", {
        key: v,
        onClick: function onClick() {
          return setArenaBetAmount(Math.min(v, rpgState.coins));
        },
        style: {
          padding: '2px 5px',
          borderRadius: 3,
          fontSize: 7,
          fontWeight: 700,
          border: '1px solid rgba(255,255,255,.08)',
          background: 'rgba(255,255,255,.03)',
          color: 'rgba(255,255,255,.3)',
          cursor: 'pointer'
        }
      }, v, "G");
    })), /*#__PURE__*/React.createElement("button", {
      onClick: function onClick() {
        var _activePlayers$find;
        var R = stateRef.current.rpg;
        if (!R || !arenaBetTarget) return;
        var amt = Math.min(arenaBetAmount, R.coins, ARENA_BET_MAX);
        if (amt < ARENA_BET_MIN) {
          stateRef.current.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Min bet ' + ARENA_BET_MIN + 'G',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        if (R.coins < amt) {
          stateRef.current.dmgNumbers.push({
            x: S.player.x,
            y: S.player.y - 30,
            text: 'Not enough gold!',
            color: '#ff5e6c',
            ts: Date.now()
          });
          return;
        }
        R.coins -= amt;
        if (R._compStats) R._compStats.totalGoldSpent += amt;
        var bet = {
          bettorId: S.myId,
          targetPlayerId: arenaBetTarget,
          targetName: ((_activePlayers$find = activePlayers.find(function (p) {
            return p.id === arenaBetTarget;
          })) === null || _activePlayers$find === void 0 ? void 0 : _activePlayers$find.name) || '???',
          amount: amt,
          tournamentId: arenaTournament.id,
          ts: Date.now()
        };
        setArenaBets(function (prev) {
          return [].concat(_toConsumableArray(prev), [bet]);
        });
        /* Persist bet for payout logic */
        if (!R._arenaBets) R._arenaBets = [];
        R._arenaBets.push(bet);
        if (!stateRef.current.stats._betsMade) stateRef.current.stats._betsMade = 0;
        stateRef.current.stats._betsMade++;
        /* Broadcast bet (for pot tracking) */
        if (S.channel) S.channel.send({
          type: 'broadcast',
          event: 'arena_bet',
          payload: bet
        });
        stateRef.current.dmgNumbers.push({
          x: S.player.x,
          y: S.player.y - 30,
          text: 'Bet ' + amt + 'G on ' + bet.targetName,
          color: '#f5c542',
          ts: Date.now()
        });
        BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused41) {}
      },
      disabled: !arenaBetTarget,
      style: {
        width: '100%',
        padding: '6px 0',
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 800,
        border: '1.5px solid ' + (arenaBetTarget ? 'rgba(245,197,66,.4)' : 'rgba(255,255,255,.06)'),
        background: arenaBetTarget ? 'rgba(245,197,66,.12)' : 'rgba(255,255,255,.02)',
        color: arenaBetTarget ? '#f5c542' : 'rgba(255,255,255,.15)',
        cursor: arenaBetTarget ? 'pointer' : 'not-allowed'
      }
    }, "\uD83C\uDFB2 Place Bet (", arenaBetAmount, "G)"), myBets.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        fontWeight: 700,
        color: 'rgba(255,255,255,.3)',
        marginTop: 6,
        marginBottom: 2
      }
    }, "Your Bets"), myBets.map(function (b, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          fontSize: 8,
          color: 'rgba(255,255,255,.4)',
          padding: '2px 0'
        }
      }, b.amount, "G on ", b.targetName);
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.15)',
        marginTop: 2
      }
    }, "Total wagered: ", myBets.reduce(function (s, b) {
      return s + b.amount;
    }, 0), "G")));
  }());
}
