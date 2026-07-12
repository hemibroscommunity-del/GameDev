import React from 'react';
import { ARENA_BET_MAX, ARENA_BET_MIN, ARENA_CHAMPION_REWARD, ARENA_ENTRY_FEE, ARENA_POLL_INTERVAL, BT_AUDIO } from '@/data/index.js';
import { BT_API_BASE } from '@/networking/index.js';
import { _asyncToGenerator, _objectSpread, _regenerator, _toConsumableArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
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
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) --
   style-only sweep: legacy white-alpha/gold-tint literals remapped to
   the LS tokens (nested #182227, wells #121B20/#19252A, text ladder
   #F7F2E7/#B9C1BF/#96A2A0, hairlines rgba(238,242,235,.14)/.10),
   module headers 11/600 uppercase .12em, pick-chips 32px/999 with
   #3B3427+brass selection, ONE brass #D8A85F primary per region,
   destructive #7C3431 leave-queue, gold shown as gold.webp icon +
   14/700 tabular brass, evt-duel/evt-party/evt-sponsorship header
   icons with emoji fallback (SkillsPanel pattern). ZERO logic changes:
   every handler, channel message, fetch, conditional and popup is
   untouched. */
/* v2.3.1235: batch-3 rollout — correction-pass compliance
   (docs/LANTERN-SLATE-SPEC.md + game.css :root). Presentation only,
   every handler/fetch/legacy-settlement branch byte-identical.
   v2.3.1232 tokens remapped onto the approved set (sheet #1E2E34,
   well #111E23, raised #293B41, card #24363C, text ladder
   #F4F0E7/#B6C1BE/#8D9B98/#667875, lines rgba(229,237,233,.11/.20),
   brass #D8AA58 / gradient primary on #172126 ink, positive #55B98A,
   danger #D8635D, stamina #DFAE4E); match/stake/hall-of-fame rows move
   off per-row cards into recessed wells with hairline dividers; the
   green-tint alive-chips and red-tint match rows lose their off-token
   screen-specific fills; Leave Queue becomes a danger OUTLINE (filled
   red retired); chrome emoji dropped from headers/buttons/labels
   (🏟️/⏳/⚔️/💀/🎲/💰/🏆/✅/❌ → text; player-chosen colors and the
   gold/evt icon imgs stay); chips/inputs/buttons hit the 44px hitbox
   floor. Bet-confirm primaries keep the gold recipe in each betting
   region; the duplicated legacy betting regions are frozen logic, so
   more than one gold confirm can still co-render (noted, not fixable
   style-side). */
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
  return React.createElement("div", {
    /* v2.3.1232: LS shared buildings kit -- full-bleed panel surface;
       -20px margin counters the legacy .bt-inspect-card padding */
    style: {
      margin: -20,
      /* v2.3.1235: batch-3 rollout — sheet token, 14px panel radius, and
         the Checkpoint-B 16px scroll tail. */
      padding: '16px 14px 32px',
      background: '#1E2E34',
      borderRadius: 14,
      textAlign: 'left',
      fontFamily: "'Source Sans 3',sans-serif"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
      paddingRight: 24
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/bldg-tavern.webp",
    alt: "",
    draggable: false,
    style: {
      width: 26,
      height: 26,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('\uD83C\uDFDF\uFE0F'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F7F2E7'
    }
  }, "Gladiator Arena")), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: batch-3 rollout — 11px floor on the meta row; the gold
       amount is a key number (16/700 tabular brass). */
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#96A2A0',
      marginBottom: 6,
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("img", { src: "/icons/popups/gold.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px' }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83D\uDCB0')); } }), /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 /* v2.3.1235: batch-3 rollout — key-number size */, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#D8AA58' } }, rpgState.coins, "G"), "\xB7 Entry fee: ", ARENA_ENTRY_FEE, "G \xB7 10 rounds \xB7 Single elimination \xB7 No healing"), function () {
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
      fontSize: 11,
      color: '#96A2A0',
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
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Need ' + ARENA_ENTRY_FEE + 'G!', '#D95C54');
            return _context8.a(2);
          case 1:
            /* v2.3.1126: arena-capable workers escrow the entry fee
               server-side (settled join responses) -- the local debit/
               refund pair below is the legacy-worker path only. */
            if (!(S._serverCaps && S._serverCaps.arena)) {
              R.coins -= ARENA_ENTRY_FEE;
              if (R._compStats) R._compStats.totalGoldSpent += ARENA_ENTRY_FEE;
            }
            _context8.p = 2;
            _context8.n = 3;
            return fetch(BT_API_BASE + '/api/arena/join', {
              method: 'POST',
              /* v2.3.1178: session token — the worker rejects economy
                 calls whose playerId isn't backed by the caller's own
                 state_sync token (forged entry-fee debit fix). Absent
                 against old workers (no token in state_sync). */
              headers: (function () {
                var _h = { 'Content-Type': 'application/json' };
                if (S._httpToken) _h['x-bt-auth'] = S._httpToken;
                return _h;
              })(),
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
            if (!(S._serverCaps && S._serverCaps.arena)) R.coins += ARENA_ENTRY_FEE;
            pushDmgPopup(S, S.player.x, S.player.y - 30, data.error || 'Failed', '#D95C54');
            return _context8.a(2);
          case 5:
            setArenaStatus({
              ok: true,
              status: 'queued',
              position: data.queuePosition || 1,
              queueSize: data.queueSize || 1
            });
            if (data.started && data.tournament) setArenaTournament(data.tournament);
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Entered arena queue!', '#D95C54');
            BT_AUDIO.beep(500, 0.08, 0.1, 'sine');
            _context8.n = 7;
            break;
          case 6:
            _context8.p = 6;
            _t7 = _context8.v;
            if (!(S._serverCaps && S._serverCaps.arena)) R.coins += ARENA_ENTRY_FEE;
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Server error', '#D95C54');
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
    /* v2.3.1235: batch-3 rollout \u2014 the region's gold primary adopts the
       committed gradient recipe (#EAC675 edge, #172126 ink, radius 10);
       button-label emoji dropped. */
    style: {
      width: '100%',
      minHeight: 44,
      padding: '12px 0',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      border: '1px solid #EAC675',
      background: 'linear-gradient(180deg,#E2B765,#D2A14D)',
      color: '#172126',
      cursor: 'pointer',
      marginBottom: 8
    }
  }, "Enter Arena (", ARENA_ENTRY_FEE, "G)")), (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'queued' && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 8,
      /* v2.3.1235: batch-3 rollout \u2014 card token + hairline; header
         emoji dropped (chrome). */
      background: '#24363C',
      border: '1px solid rgba(229,237,233,.11)',
      marginBottom: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700 /* v2.3.1235: batch-3 rollout \u2014 11/700 .14em muted headers */,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: '#8D9B98',
      marginBottom: 4
    }
  }, "In Queue"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0'
    }
  }, "Position: ", arenaStatus.position, "/", arenaStatus.queueSize, " \xB7 Waiting for ", arenaStatus.queueSize < 4 ? '4' : '16', " players..."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
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
              /* v2.3.1178: session token (see /join above). */
              headers: (function () {
                var _h = { 'Content-Type': 'application/json' };
                if (S._httpToken) _h['x-bt-auth'] = S._httpToken;
                return _h;
              })(),
              body: JSON.stringify({
                playerId: S.myId
              })
            });
          case 2:
            if (!(S._serverCaps && S._serverCaps.arena)) S.rpg.coins += ARENA_ENTRY_FEE; /* legacy refund; settling workers refund server-side */
            setArenaStatus({
              ok: true,
              status: 'none'
            });
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Left arena queue (+' + ARENA_ENTRY_FEE + 'G)', 'rgba(255,255,255,.5)');
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
    /* v2.3.1235: batch-3 rollout — danger is OUTLINE only (filled red
       retired); 44px hitbox floor. */
    style: {
      marginTop: 6,
      minHeight: 44,
      padding: '6px 14px',
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 700,
      border: '1px solid #D8635D',
      background: 'transparent',
      color: '#D8635D',
      cursor: 'pointer'
    }
  }, "Leave Queue (refund ", ARENA_ENTRY_FEE, "G)")), (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'fighting' && arenaStatus.currentMatch && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 10,
      background: '#182227', /* v2.3.1232: LS nested surface */
      border: '1px solid rgba(217,92,84,.4)',
      marginBottom: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#D95C54',
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
      background: arenaStatus.currentMatch.p1Color || '#D8A85F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 700,
      color: '#F7F2E7',
      margin: '0 auto'
    }
  }, ((_arenaStatus$currentM = arenaStatus.currentMatch.p1Name) === null || _arenaStatus$currentM === void 0 ? void 0 : _arenaStatus$currentM.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#F7F2E7',
      marginTop: 2
    }
  }, arenaStatus.currentMatch.p1Name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#96A2A0'
    }
  }, "Lv", arenaStatus.currentMatch.p1Level)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: '#96A2A0'
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
      background: arenaStatus.currentMatch.p2Color || '#D95C54',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 700,
      color: '#F7F2E7',
      margin: '0 auto'
    }
  }, ((_arenaStatus$currentM2 = arenaStatus.currentMatch.p2Name) === null || _arenaStatus$currentM2 === void 0 ? void 0 : _arenaStatus$currentM2.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#F7F2E7',
      marginTop: 2
    }
  }, arenaStatus.currentMatch.p2Name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#96A2A0'
    }
  }, "Lv", arenaStatus.currentMatch.p2Level))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
      marginTop: 6
    }
  }, "Find and defeat your opponent! PvP in any zone counts."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#687575',
      marginTop: 4
    }
  }, "If opponent doesn't show within 2 min, win is auto-awarded.")), (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'eliminated' && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 8,
      background: '#19252A',
      border: '1px solid rgba(238,242,235,.14)',
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
      fontSize: 12,
      fontWeight: 700,
      color: '#B9C1BF'
    }
  }, "Eliminated \u2014 Round ", arenaStatus.round), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
      marginTop: 2
    }
  }, arenaStatus.wins, " wins \xB7 You can spectate the rest!")), arenaTournament && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      /* v2.3.1232: LS module header */
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      fontVariantNumeric: 'tabular-nums',
      color: '#B9C1BF',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("img", { src: "/icons/ui/evt-party.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px', marginRight: 6 }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83C\uDFDF\uFE0F')); } }), "Tournament \u2014 Round ", arenaTournament.round, "/", arenaTournament.maxRounds, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
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
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        background: p.eliminated ? '#121B20' : 'rgba(89,191,145,.08)',
        border: '1px solid ' + (p.eliminated ? 'rgba(238,242,235,.10)' : 'rgba(89,191,145,.2)'),
        color: p.eliminated ? '#687575' : p.color || '#F7F2E7',
        textDecoration: p.eliminated ? 'line-through' : 'none',
        opacity: p.eliminated ? 0.4 : 1
      }
    }, p.eliminated ? '💀' : '⚔️', " ", p.name, " ", p.wins > 0 && '(' + p.wins + 'W)');
  })), arenaTournament.currentMatches.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#96A2A0',
      marginBottom: 2
    }
  }, "Current Matches"), arenaTournament.currentMatches.map(function (m) {
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        minHeight: 44,
        padding: '6px 10px',
        borderRadius: 8,
        background: m.resolved ? '#19252A' : 'rgba(217,92,84,.05)',
        border: '1px solid ' + (m.resolved ? 'rgba(238,242,235,.10)' : 'rgba(217,92,84,.15)'),
        marginBottom: 2,
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: m.p1Color || '#D8A85F',
        fontWeight: 700
      }
    }, m.p1Name), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#687575'
      }
    }, "vs"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: m.p2Color || '#D95C54',
        fontWeight: 700
      }
    }, m.p2Name), m.resolved && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        fontSize: 10,
        color: '#59BF91'
      }
    }, "Winner: ", m.winnerId === m.p1 ? m.p1Name : m.p2Name), !m.resolved && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        fontSize: 10,
        color: '#D8A85F'
      }
    }, "\u2694\uFE0F Fighting"));
  })), function () {
    /* v2.3.1210: spectator stake board -- server-summed totals per open
       match (arena_stake_board, gameEvents.js).  Display only; shows
       where the sponsorship money is without leaking who staked what.
       Reads the state slice the privileged event writes; re-renders on
       the arena panel's 3s poll. */
    var _board = (stateRef.current && stateRef.current._arenaStakeBoard) || [];
    if (!_board.length) return null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: '#96A2A0', marginTop: 4, marginBottom: 2 }
    }, "\uD83D\uDCB0 Spectator Stakes"), _board.map(function (b) {
      var _pot = (b.aTotal || 0) + (b.bTotal || 0);
      return /*#__PURE__*/React.createElement("div", {
        key: b.matchId,
        style: { display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, padding: '6px 10px', borderRadius: 8, background: '#19252A', border: '1px solid rgba(238,242,235,.10)', marginBottom: 2, fontSize: 11 }
      }, /*#__PURE__*/React.createElement("span", {
        style: { color: '#D8A85F', fontWeight: 700 }
      }, b.aName || '?'), /*#__PURE__*/React.createElement("span", {
        style: { color: '#D8A85F', fontWeight: 700 }
      }, (b.aTotal || 0) + 'G', b.aBackers ? ' \xB7' + b.aBackers : ''), /*#__PURE__*/React.createElement("span", {
        style: { color: '#687575' }
      }, "vs"), /*#__PURE__*/React.createElement("span", {
        style: { color: '#D95C54', fontWeight: 700 }
      }, b.bName || '?'), /*#__PURE__*/React.createElement("span", {
        style: { color: '#D8A85F', fontWeight: 700 }
      }, (b.bTotal || 0) + 'G', b.bBackers ? ' \xB7' + b.bBackers : ''), /*#__PURE__*/React.createElement("span", {
        style: { marginLeft: 'auto', fontSize: 10, color: '#96A2A0' }
      }, _pot + 'G pot'));
    }));
  }(), arenaTournament.status === 'complete' && arenaTournament.champion && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderRadius: 8,
      background: '#182227',
      border: '1px solid #D8A85F',
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
      fontWeight: 700,
      color: '#D8A85F'
    }
  }, "GLADIATOR CHAMPION"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#F7F2E7',
      marginTop: 2
    }
  }, arenaTournament.champion.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0'
    }
  }, arenaTournament.champion.wins, " wins \xB7 Lv", arenaTournament.champion.level), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#D8A85F',
      marginTop: 4
    }
  }, "+", ARENA_CHAMPION_REWARD.gold, "G +", ARENA_CHAMPION_REWARD.ap, "AP + \"Gladiator\" title")), arenaTournament.recentMatches.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#96A2A0',
      marginTop: 6,
      marginBottom: 2
    }
  }, "Recent Results"), arenaTournament.recentMatches.slice(-5).reverse().map(function (m, i) {
    var _arenaTournament$play, _arenaTournament$play2;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 10,
        color: '#687575',
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
      padding: 10,
      borderRadius: 10,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
      border: '1px solid rgba(238,242,235,.10)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#B9C1BF',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("img", { src: "/icons/ui/evt-sponsorship.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px', marginRight: 6 }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83C\uDFB2')); } }), "Spectator Betting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
      marginBottom: 6
    }
  }, "Bet on who wins the tournament. Blind \u2014 you can't see others' bets. Winner takes the pot!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#96A2A0',
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
        minHeight: 32,
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        border: '1px solid ' + (sel ? '#D8A85F' : 'rgba(238,242,235,.14)'),
        background: sel ? '#3B3427' : '#19252A',
        color: sel ? '#D8A85F' : p.color || '#B9C1BF',
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
      fontSize: 11,
      fontWeight: 700,
      color: '#D8A85F'
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
      width: 76,
      minHeight: 32,
      padding: '4px 8px',
      borderRadius: 8,
      border: '1px solid rgba(238,242,235,.14)',
      background: '#121B20',
      color: '#D8A85F',
      fontSize: 16 /* v2.3.1233b: iOS zoom guard */,
      fontWeight: 700,
      fontFamily: 'Source Sans 3,sans-serif',
      fontVariantNumeric: 'tabular-nums',
      textAlign: 'right',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#96A2A0'
    }
  }, "G (", /*#__PURE__*/React.createElement("img", { src: "/icons/popups/gold.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px' }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83D\uDCB0')); } }), /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 /* v2.3.1235: batch-3 rollout — key-number size */, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#D8AA58' } }, rpgState.coins, "G"), ")")), /*#__PURE__*/React.createElement("button", {
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Bet ' + arenaBetAmount + 'G on ' + targetName + '!', '#D8A94D');
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
      minHeight: 44,
      padding: '10px 0',
      borderRadius: 11,
      fontSize: 13,
      fontWeight: 700,
      /* v2.3.1233b: audit fix — visual now mirrors the FULL disabled gate (target AND coins); it previously keyed on target only, rendering a solid-brass primary that silently swallowed taps when broke. Style-only. */
      border: '1px solid ' + ((arenaBetTarget && rpgState.coins >= arenaBetAmount) ? '#D8A85F' : 'rgba(238,242,235,.14)'),
      background: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? '#D8A85F' : '#2B3940',
      color: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? '#20170D' : '#687575',
      cursor: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? 'pointer' : 'not-allowed'
    }
  }, "\uD83C\uDFB2 Place Bet (", arenaBetAmount, "G)"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#96A2A0'
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
        fontSize: 10,
        color: '#96A2A0',
        padding: '1px 0'
      }
    }, b.amount, "G on ", (target === null || target === void 0 ? void 0 : target.name) || '???', " ", target !== null && target !== void 0 && target.eliminated ? '💀 (eliminated)' : '⚔️');
  }))), arenaTournament && arenaTournament.status === 'active' && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      padding: 10,
      borderRadius: 10,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
      border: '1px solid rgba(238,242,235,.10)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#B9C1BF',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("img", { src: "/icons/ui/evt-sponsorship.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px', marginRight: 6 }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83C\uDFB2')); } }), "Place a Bet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0',
      marginBottom: 6
    }
  }, "Blind bet on who wins the tournament. Payout: pot split among winners. Min ", ARENA_BET_MIN, "G, Max ", ARENA_BET_MAX, "G."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#96A2A0',
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
        minHeight: 32,
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        border: '1px solid ' + (sel ? '#D8A85F' : 'rgba(238,242,235,.14)'),
        background: sel ? '#3B3427' : '#19252A',
        color: sel ? '#D8A85F' : isMe ? '#687575' : p.color || '#96A2A0',
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
      fontSize: 11,
      fontWeight: 700,
      color: '#D8A85F'
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
      width: 76,
      minHeight: 32,
      padding: '4px 8px',
      borderRadius: 8,
      border: '1px solid rgba(238,242,235,.14)',
      background: '#121B20',
      color: '#D8A85F',
      fontSize: 16 /* v2.3.1233b: iOS zoom guard */,
      fontWeight: 700,
      fontFamily: 'Source Sans 3,sans-serif',
      fontVariantNumeric: 'tabular-nums',
      textAlign: 'right',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#96A2A0'
    }
  }, "gold"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: '#687575',
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement("img", { src: "/icons/popups/gold.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px' }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83D\uDCB0')); } }), /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 /* v2.3.1235: batch-3 rollout — key-number size */, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#D8AA58' } }, rpgState.coins, "G"))), /*#__PURE__*/React.createElement("button", {
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
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Already bet on this tournament!', '#D95C54');
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Bet ' + arenaBetAmount + 'G on ' + bet.targetName + '!', '#D8A94D');
      BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (_unused35) {}
    },
    style: {
      width: '100%',
      minHeight: 44,
      padding: '10px 0',
      borderRadius: 11,
      fontSize: 13,
      fontWeight: 700,
      /* v2.3.1233b: audit fix — visual now mirrors the FULL disabled gate (target AND coins); it previously keyed on target only, rendering a solid-brass primary that silently swallowed taps when broke. Style-only. */
      border: '1px solid ' + ((arenaBetTarget && rpgState.coins >= arenaBetAmount) ? '#D8A85F' : 'rgba(238,242,235,.14)'),
      background: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? '#D8A85F' : '#2B3940',
      color: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? '#20170D' : '#687575',
      cursor: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? 'pointer' : 'not-allowed'
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
      fontSize: 10,
      fontWeight: 700,
      color: '#96A2A0',
      marginBottom: 2
    }
  }, "Active Bets"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).map(function (b, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 10,
        color: '#96A2A0',
        padding: '1px 0'
      }
    }, b.playerName, " bet ", b.amount, "G on ", b.targetName);
  }))), (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.status) === 'complete' && arenaBets.length > 0 && function (_arenaTournament$cham) {
    var S = stateRef.current;
    /* v2.3.1128: server-settled sponsorship -- stakes escrow at
       placement and pay off the server-observed result
       (arena_stake_result in gameEvents.js); the local pot-split
       mint below stays only for old workers. */
    if (S._serverCaps && S._serverCaps.sponsor) return null;
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
        pushDmgPopup(S, S.player.x, S.player.y - 60, 'Bet WON! +' + payout + 'G', '#D8A94D');
        BT_AUDIO.collect();
      } else {
        pushDmgPopup(S, S.player.x, S.player.y - 60, 'Bet lost (-' + bet.amount + 'G)', '#D95C54');
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
      padding: 10,
      borderRadius: 10,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
      border: '1px solid rgba(238,242,235,.10)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#B9C1BF',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("img", { src: "/icons/ui/evt-sponsorship.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px', marginRight: 6 }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83C\uDFB2')); } }), "Spectator Betting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#96A2A0',
      marginBottom: 4
    }
  }, "Bet blind on who wins! Gold paid out proportionally if your pick wins the tournament."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#96A2A0',
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
        minHeight: 32,
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        border: '1px solid ' + (arenaBetTarget === p.id ? '#D8A85F' : 'rgba(238,242,235,.14)'),
        background: arenaBetTarget === p.id ? '#3B3427' : '#19252A',
        color: arenaBetTarget === p.id ? '#D8A85F' : p.color || '#96A2A0',
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
      fontSize: 10,
      fontWeight: 700,
      color: '#96A2A0'
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
      width: 76,
      minHeight: 32,
      padding: '4px 8px',
      borderRadius: 8,
      border: '1px solid rgba(238,242,235,.14)',
      background: '#121B20',
      color: '#D8A85F',
      fontSize: 16 /* v2.3.1233b: iOS zoom guard */,
      fontWeight: 700,
      fontFamily: 'Source Sans 3,sans-serif',
      fontVariantNumeric: 'tabular-nums',
      textAlign: 'right',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: '#96A2A0'
    }
  }, "G (", /*#__PURE__*/React.createElement("img", { src: "/icons/popups/gold.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px' }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83D\uDCB0')); } }), /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 /* v2.3.1235: batch-3 rollout — key-number size */, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#D8AA58' } }, rpgState.coins, "G"), ")")), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      var _arenaTournament$play6;
      var S = stateRef.current,
        R = S.rpg;
      if (!R || !arenaBetTarget) {
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Pick a player!', '#D95C54');
        return;
      }
      if (R.coins < arenaBetAmount) {
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Not enough gold!', '#D95C54');
        return;
      }
      /* Check if already bet on this tournament */
      if (arenaBets.find(function (b) {
        return b.tournamentId === arenaTournament.id && b.playerId === S.myId;
      })) {
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Already placed a bet!', '#D95C54');
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
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Bet ' + arenaBetAmount + 'G on ' + bet.targetName, '#D8A94D');
      BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
      setRpgState(_objectSpread({}, R));
      try {
        localStorage.setItem('bt_rpg', JSON.stringify(R));
      } catch (_unused37) {}
    },
    style: {
      width: '100%',
      minHeight: 44,
      padding: '10px 0',
      borderRadius: 11,
      fontSize: 13,
      fontWeight: 700,
      border: 'none', /* v2.3.1232: LS brass primary */
      background: '#D8A85F',
      color: '#20170D',
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
      fontSize: 10,
      fontWeight: 700,
      color: '#96A2A0',
      marginBottom: 2
    }
  }, "Active Bets"), arenaBets.filter(function (b) {
    return b.tournamentId === (arenaTournament === null || arenaTournament === void 0 ? void 0 : arenaTournament.id);
  }).map(function (b, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 10,
        color: '#96A2A0',
        padding: '1px 0'
      }
    }, b.playerId === stateRef.current.myId ? 'You' : b.playerId.slice(0, 4), " \u2192 ", b.targetName, ": ", b.amount, "G");
  }))), arenaTournament && arenaTournament.status === 'complete' && arenaTournament.champion && function () {
    var S = stateRef.current;
    /* v2.3.1128: server-settled sponsorship -- see the pot-split gate
       above; this 2x champion mint is the same legacy-only fallback. */
    if (S._serverCaps && S._serverCaps.sponsor) return null;
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
        pushDmgPopup(S, S.player.x, S.player.y - 60, 'BET WON! +' + payout + 'G', '#D8A94D');
        BT_AUDIO.levelUp();
        setRpgState(_objectSpread({}, S.rpg));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
        } catch (_unused38) {}
      } else if (myBet) {
        pushDmgPopup(S, S.player.x, S.player.y - 60, 'Bet lost (-' + myBet.amount + 'G)', '#D95C54');
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
        padding: 10,
        borderRadius: 10,
        background: '#121B20',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
        border: '1px solid rgba(238,242,235,.10)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        color: '#B9C1BF',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("img", { src: "/icons/ui/evt-sponsorship.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px', marginRight: 6 }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83C\uDFB2')); } }), "Spectator Betting"), myBet ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#96A2A0'
      }
    }, "Bet placed: ", myBet.amount, "G on ", ((_remaining$find = remaining.find(function (p) {
      return p.id === myBet.targetPlayerId;
    })) === null || _remaining$find === void 0 ? void 0 : _remaining$find.name) || '???', /*#__PURE__*/React.createElement("br", null), "Round ", arenaTournament.round, " \u2014 waiting for results...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#96A2A0',
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
          minHeight: 32,
          padding: '6px 12px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid ' + (arenaBetTarget === p.id ? '#D8A85F' : 'rgba(238,242,235,.14)'),
          background: arenaBetTarget === p.id ? '#3B3427' : '#19252A',
          color: arenaBetTarget === p.id ? '#D8A85F' : p.color || '#F7F2E7',
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
        fontSize: 11,
        fontWeight: 700,
        color: '#D8A85F'
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
        width: 76,
        minHeight: 32,
        padding: '4px 8px',
        borderRadius: 8,
        border: '1px solid rgba(238,242,235,.14)',
        background: '#121B20',
        color: '#D8A85F',
        fontSize: 16 /* v2.3.1233b: iOS zoom guard */,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
        outline: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#96A2A0'
      }
    }, "G (max ", Math.min(ARENA_BET_MAX, rpgState.coins), ")")), /*#__PURE__*/React.createElement("button", {
      disabled: !arenaBetTarget || rpgState.coins < arenaBetAmount,
      onClick: function onClick() {
        var _remaining$find2;
        var S2 = stateRef.current,
          R = S2.rpg;
        if (!R || !arenaBetTarget || R.coins < arenaBetAmount) return;
        /* v2.3.1128: server-settled sponsorship (GDD §44).  The worker
           escrows the stake against the open current-round match
           containing the picked gladiator and pays 3x off the
           server-observed result; ack/outcome popups arrive via
           arena_stake_placed / arena_stake_result (gameEvents.js).
           The local debit + 1.8x self-mint below stay only for old
           workers. */
        if (S2._serverCaps && S2._serverCaps.sponsor && S2.channel) {
          try {
            S2.channel.send({ type: 'broadcast', event: 'arena_sponsor', payload: { targetId: arenaBetTarget, amount: arenaBetAmount } });
          } catch (e) {}
          setArenaBets(function (prev) {
            return [].concat(_toConsumableArray(prev), [{ playerId: S2.myId, amount: arenaBetAmount, targetPlayerId: arenaBetTarget, round: arenaTournament.round, ts: Date.now(), _serverStake: true, _resolved: true }]);
          });
          if (!S2.stats._betsMade) S2.stats._betsMade = 0;
          S2.stats._betsMade++;
          BT_AUDIO.beep(600, 0.05, 0.08, 'sine');
          return;
        }
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
        pushDmgPopup(S2, S2.player.x, S2.player.y - 30, 'Bet ' + arenaBetAmount + 'G on ' + ((_remaining$find2 = remaining.find(function (p) { return p.id === arenaBetTarget; })) === null || _remaining$find2 === void 0 ? void 0 : _remaining$find2.name), '#D8A94D');
        BT_AUDIO.beep(600, 0.05, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused39) {}
      },
      style: {
        width: '100%',
        minHeight: 44,
        padding: '10px 0',
        borderRadius: 11,
        fontSize: 13,
        fontWeight: 700,
      /* v2.3.1233b: audit fix — visual now mirrors the FULL disabled gate (target AND coins); it previously keyed on target only, rendering a solid-brass primary that silently swallowed taps when broke. Style-only. */
        border: '1px solid ' + ((arenaBetTarget && rpgState.coins >= arenaBetAmount) ? '#D8A85F' : 'rgba(238,242,235,.14)'),
        background: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? '#D8A85F' : '#2B3940',
        color: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? '#20170D' : '#687575',
        cursor: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? 'pointer' : 'not-allowed'
      }
    }, "\uD83C\uDFB2 Place Bet")));
  }(), function () {
    var S = stateRef.current;
    /* v2.3.1128: server-settled sponsorship -- the 1.8x self-mint
       below is legacy-only (see the caps gate on placement above). */
    if (S._serverCaps && S._serverCaps.sponsor) return null;
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
            pushDmgPopup(S, S.player.x, S.player.y - 50, 'BET WON! +' + payout + 'G', '#59BF91');
            BT_AUDIO.collect();
          } else {
            pushDmgPopup(S, S.player.x, S.player.y - 50, 'Bet lost (-' + lastBet.amount + 'G)', '#D95C54');
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
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        color: '#B9C1BF',
        marginBottom: 3
      }
    }, "\uD83C\uDFC6 Hall of Fame"), arenaHistory.slice(0, 10).map(function (c, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          minHeight: 44,
          padding: '6px 10px',
          borderRadius: 8,
          background: '#19252A',
          border: '1px solid rgba(238,242,235,.10)',
          marginBottom: 2,
          fontSize: 11
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12
        }
      }, i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'), /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 700,
          color: '#D8A85F'
        }
      }, c.championName), /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#96A2A0',
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
        padding: 10,
        borderRadius: 10,
        background: '#121B20',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
        border: '1px solid rgba(238,242,235,.10)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        color: '#B9C1BF',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("img", { src: "/icons/ui/evt-sponsorship.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px', marginRight: 6 }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83C\uDFB2')); } }), "Spectator Betting"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#96A2A0',
        marginBottom: 6
      }
    }, "Blind bet on who wins the tournament. Payout: pot \xF7 winners. ", /*#__PURE__*/React.createElement("img", { src: "/icons/popups/gold.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px' }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83D\uDCB0')); } }), /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 /* v2.3.1235: batch-3 rollout — key-number size */, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#D8AA58' } }, rpgState.coins, "G")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: '#96A2A0',
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
          minHeight: 32,
          padding: '6px 12px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid ' + (arenaBetTarget === p.id ? '#D8A85F' : 'rgba(238,242,235,.14)'),
          background: arenaBetTarget === p.id ? '#3B3427' : '#19252A',
          color: arenaBetTarget === p.id ? '#D8A85F' : p.color || '#96A2A0',
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
        fontSize: 11,
        fontWeight: 700,
        color: '#96A2A0'
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
        width: 76,
        minHeight: 32,
        padding: '4px 8px',
        borderRadius: 8,
        border: '1px solid rgba(238,242,235,.14)',
        background: '#121B20',
        color: '#D8A85F',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'Source Sans 3,sans-serif',
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
        outline: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#687575'
      }
    }, "G"), [50, 100, 500].map(function (v) {
      return /*#__PURE__*/React.createElement("button", {
        key: v,
        onClick: function onClick() {
          return setArenaBetAmount(Math.min(v, rpgState.coins));
        },
        style: {
          minHeight: 32,
          padding: '4px 12px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid rgba(238,242,235,.14)',
          background: '#2B3940',
          color: '#B9C1BF',
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
          pushDmgPopup(stateRef.current, S.player.x, S.player.y - 30, 'Min bet ' + ARENA_BET_MIN + 'G', '#D95C54');
          return;
        }
        if (R.coins < amt) {
          pushDmgPopup(stateRef.current, S.player.x, S.player.y - 30, 'Not enough gold!', '#D95C54');
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
        pushDmgPopup(stateRef.current, S.player.x, S.player.y - 30, 'Bet ' + amt + 'G on ' + bet.targetName, '#D8A94D');
        BT_AUDIO.beep(500, 0.06, 0.08, 'sine');
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_rpg', JSON.stringify(R));
        } catch (_unused41) {}
      },
      disabled: !arenaBetTarget,
      style: {
        width: '100%',
        minHeight: 44,
        padding: '10px 0',
        borderRadius: 11,
        fontSize: 13,
        fontWeight: 700,
        border: '1px solid ' + (arenaBetTarget ? '#D8A85F' : 'rgba(238,242,235,.14)'),
        background: arenaBetTarget ? '#D8A85F' : '#2B3940',
        color: arenaBetTarget ? '#20170D' : '#687575',
        cursor: arenaBetTarget ? 'pointer' : 'not-allowed'
      }
    }, "\uD83C\uDFB2 Place Bet (", arenaBetAmount, "G)"), myBets.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: '#96A2A0',
        marginTop: 6,
        marginBottom: 2
      }
    }, "Your Bets"), myBets.map(function (b, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          fontSize: 11,
          color: '#96A2A0',
          padding: '2px 0'
        }
      }, b.amount, "G on ", b.targetName);
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: '#687575',
        marginTop: 2
      }
    }, "Total wagered: ", myBets.reduce(function (s, b) {
      return s + b.amount;
    }, 0), "G")));
  }());
}
