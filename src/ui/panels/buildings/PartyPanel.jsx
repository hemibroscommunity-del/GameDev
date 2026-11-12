import { coinArtFor } from '@/game/coinArt.js';   /* v2.3.3734: the owner's coin piles */
import React from 'react';
import { ARENA_BET_MAX, ARENA_BET_MIN, ARENA_CHAMPION_REWARD, ARENA_ENTRY_FEE, ARENA_POLL_INTERVAL, BT_AUDIO } from '@/data/index.js';
import { BT_API_BASE } from '@/networking/index.js';
import { _asyncToGenerator, _objectSpread, _regenerator, _toConsumableArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
import { cue } from '@/game/eventSounds.js';   /* v2.3.3434: signing up heard */
import { OWNER_ICON } from '@/data/ownerIcons.js';   /* v2.3.3481: the arena's helmet */
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
  /* v2.3.1235: batch-3 rollout — shared list-well fragments (styles
     only): match/stake/hall-of-fame rows sit in ONE recessed well with
     hairline dividers instead of per-row cards. */
  var LS_WELL235 = {
    background: '#111E23',
    borderRadius: 10,
    padding: 4,
    boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)',
    marginBottom: 6
  };
  var LS_DIV235 = '1px solid rgba(229,237,233,.11)';
  /* ═══ v2.3.3481: THE 2026-10-19 UI REVIEW -- ONE BET, THE REAL ONE ═══
     During a tournament this window could show five "Place Bet" wells.  Only
     one of them (the round bet, "pick who you think will win this round")
     sends the worker's settled `arena_sponsor`; the other four took the bet
     off the PAGE's gold and sent `arena_bet`, a relay no worker settles, so
     they placed bets that did not exist.  Against a worker that settles
     stakes (caps.sponsor, which today's advertises) those four are not drawn.
     v2.3.4911: and now they are gone, with the page's own payouts for them:
     gold is the worker's (CLAUDE.md §5), so a worker without caps.sponsor
     shows the real well's "Betting is closed" rather than a bet on the page.
     And the real one was not drawn either: its gate asked arenaStatus.status
     for 'none' or 'eliminated', but a settling worker's /status sends no
     `status` (gladiator.js), so it showed only in the 3 s after you left the
     queue.  Against such a worker a SPECTATOR is read off the tournament's
     own roster instead -- not in it, or knocked out -- the rule the old
     fifth well used (isSpectator below); the worker refuses a stake on your
     own match anyway ('own-match'). */
  var _betCaps = stateRef.current && stateRef.current._serverCaps;
  var legacyBets = !(_betCaps && _betCaps.sponsor);
  var _betMe = !legacyBets && arenaTournament && Array.isArray(arenaTournament.players) && stateRef.current ? arenaTournament.players.find(function (p) {
    return p && p.id === stateRef.current.myId;
  }) : null;
  var sponsorSpectator = !legacyBets && !!arenaTournament && (!_betMe || !!_betMe.eliminated);
  /* v2.3.3481: the champion's ACHIEVEMENT POINTS are the worker's to pay, and
     since v2.3.3481 it pays them (server gladiator.js ARENA.CHAMPION_AP, 500,
     with the gold; inbox.js adds them to achievementPoints) and says so in
     caps.arenaap.  Before it no worker paid them (the page's own grant is the
     old path caps.arena turns off), so the window names the AP only against
     a worker that says it pays; an older one, or `arenaap: false`, pays none. */
  var arenaPaysAp = !!(stateRef.current && stateRef.current._serverCaps && stateRef.current._serverCaps.arenaap);
  /* v2.3.3488: ...on a character's FIRST win only (server inbox.js AP_ONCE) --
     the owner: "I don't want anyone exploiting the achievement points from
     it" -- which the window says against a worker that says it does */
  var arenaApFirst = arenaPaysAp && !!stateRef.current._serverCaps.arenaapfirst;
  /* v2.3.3527: and since achievements (server achievements.js, the owner's
     decision 2) the 500 are the GLADIATOR ACHIEVEMENT's, paid the FIRST time
     you win; a later crown pays its gold and counts on the achievement's row.
     `achvCaps` is the worker's word on achievements: true (the first win
     pays them), false (that worker's switch is off: no crown pays AP at
     all), or absent (a worker from before them, which paid 500 every crown,
     v2.3.3481). */
  var achvCaps = stateRef.current && stateRef.current._serverCaps ? stateRef.current._serverCaps.achievements : undefined;
  return React.createElement("div", {
    /* v2.3.3713: where this player stands, the worker's word (gladiator.js
       _arenaStatusFor) -- what mp-arena reads */
    "data-arena-state": arenaStatus && arenaStatus.status || 'none',
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
  }, /* v2.3.3481: the owner's gladiator helmet (their icon pick 2a), where the
        Saloon's beer mug was -- a leftover from when the arena lived in the
        Saloon (v2.3.3258 gave the Saloon its own window, which keeps the mug) */
  /*#__PURE__*/React.createElement("img", {
    src: OWNER_ICON.arenaHelmet.src,
    alt: "",
    draggable: false,
    width: OWNER_ICON.arenaHelmet.w,
    height: OWNER_ICON.arenaHelmet.h,
    "data-arena-icon": "helmet",
    style: {
      width: OWNER_ICON.arenaHelmet.w,
      height: OWNER_ICON.arenaHelmet.h,
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
      color: '#F4F0E7'
    }
  }, "Gladiator Arena")), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1235: batch-3 rollout — 11px floor on the meta row; the gold
       amount is a key number (16/700 tabular brass). */
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: '#8D9B98',
      marginBottom: 6,
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 4
    }
  }, /* v2.3.1235: state-correction: the bare balance beside a 100G fee was mistakable for the fee; label it. */ "Your gold: ", /*#__PURE__*/React.createElement("img", { src: coinArtFor(rpgState.coins) /* v2.3.3734: your gold, its pile */, alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px' }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83D\uDCB0')); } }), /*#__PURE__*/React.createElement("span", { style: { fontSize: 16 /* v2.3.1235: batch-3 rollout — key-number size */, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#D8AA58' } },
  /* v2.3.3481: the 2026-10-19 UI review -- "2550G" beside the top bar's
     "2,550": the HUD's own call (ZoneHeader.jsx), and no trailing G, as the
     coin already says what the number is (Diego's balance, v2.3.2060).  The
     100G entry stays a price. */
  Number(rpgState.coins || 0).toLocaleString()), "\xB7 ", ARENA_ENTRY_FEE,
  /* v2.3.3481: the review -- "10 rounds" was never true: a bracket is 2, 4
     or 8 fighters (server gladiator.js MAX_BRACKET 8, the largest power of
     two that fits the queue), so 1 to 3 rounds. */
  "G entry \xB7 Up to 8 fighters \xB7 Single elimination \xB7 No healing"), function () {
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
          /* v2.3.1623: the /tournament round-trip used to fire
             UNCONDITIONALLY beside this one, doubling the panel's arena
             requests.  Against the settled GameRoom route it is pure
             duplication: gladiator.js builds BOTH responses from the same
             _arenaWire(), so /status already carried the tournament above.
             It is NOT redundant against the legacy Arena DO, which put
             `tournament` in /status only when the caller was IN the
             tournament (arena.js getStatus) -- a spectator there gets
             nothing, which is why this fetch existed. So: keep it, but only
             when /status came back without one. Modern worker pays zero,
             legacy worker behaves exactly as before. */
          if (!d.tournament) {
            fetch(BT_API_BASE + '/api/arena/tournament').then(function (r2) {
              return r2.json();
            }).then(function (d2) {
              if (d2.ok && d2.tournament) setArenaTournament(d2.tournament);
            }).catch(function () {});
          }
        }
      }).catch(function () {});
    }
    return null;
  }(), /* v2.3.1235: state-correction §8 — the settled GameRoom /status
     route (server/src/gladiator.js) returns {ok,settled,queueSize,...}
     with NO `status` field, but this gate required status==='none' —
     so on every settled worker the ENTIRE arena UI went dark (QA found
     the building a dead end; reproduced against the live wire shape).
     A missing status now means "not in a tournament" = the Enter
     region. Old Arena-DO workers always sent an explicit status, so
     their queued/fighting/eliminated flows are unchanged. */
  (!arenaStatus || !arenaStatus.status || arenaStatus.status === 'none') && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
      marginBottom: 8,
      lineHeight: 1.5
    }
  },
  /* v2.3.3481: the 2026-10-19 UI review -- a bracket is 2, 4 or 8 fighters
     (1 to 3 rounds), never "10-round"; and the gold prize was never named.
     The worker pays the champion PRIZE_PER_ENTRANT 250 a fighter in the
     bracket (server gladiator.js _arenaPrize: 2,000 for a full 8), "up to"
     because the house's share is capped at 3,600 an hour game-wide.  The
     title stays, and the AP: the window always promised the champion 500
     AP, and since v2.3.3481 the worker really pays them, with the gold
     (server gladiator.js ARENA.CHAMPION_AP; inbox.js adds them to
     achievementPoints) -- the owner: "an arena winner should be included".
     So the AP are named only against a worker that says it pays them
     (`arenaPaysAp`, caps.arenaap); an older worker pays gold alone, and the
     line says the gold alone. */
  "Enter a single elimination tournament of up to 8 fighters. Blind matchups \u2014 any level can face any level. No food or healing allowed. ",
  /* v2.3.3527: against a worker with achievements the AP are the first
     win's (achvCaps above); the gold and the title every win.  v2.3.3488's
     worker (no achievements yet) paid them on the first win too, under its
     own mark (arenaApFirst above) */
  arenaPaysAp && achvCaps === true
    ? "Only the final victor earns the Gladiator title and up to 250G for every fighter in the bracket (2,000G for a full 8). Your first win also earns the Gladiator achievement and its " + ARENA_CHAMPION_REWARD.ap + " AP; later wins pay the gold."
    : arenaApFirst && achvCaps !== false
    ? "Only the final victor earns the Gladiator title and up to 250G for every fighter in the bracket (2,000G for a full 8), plus " + ARENA_CHAMPION_REWARD.ap + " AP for your first win."
    : arenaPaysAp && achvCaps !== false
    ? "Only the final victor earns the Gladiator title and " + ARENA_CHAMPION_REWARD.ap + " AP, plus up to 250G for every fighter in the bracket (2,000G for a full 8)."
    : "Only the final victor earns the Gladiator title and up to 250G for every fighter in the bracket (2,000G for a full 8)."), /*#__PURE__*/React.createElement("button", {
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
            /* v2.3.1126: the worker escrows the entry fee (settled join
               responses).  v2.3.4911: the page's own debit and refunds for
               a worker without caps.arena are gone: every worker says it,
               and gold is the worker's (CLAUDE.md §5). */
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
            pushDmgPopup(S, S.player.x, S.player.y - 30, data.error || 'Failed', '#D95C54');
            return _context8.a(2);
          case 5:
            setArenaStatus({
              ok: true,
              status: 'queued',
              position: data.queuePosition || 1,
              queueSize: data.queueSize || 1,
              startsAt: data.startsAt || 0   /* v2.3.3713 */
            });
            if (data.started && data.tournament) setArenaTournament(data.tournament);
            pushDmgPopup(S, S.player.x, S.player.y - 30, 'Entered arena queue!', '#D95C54');
            cue('arenaJoin');   /* v2.3.3434: a bell and a drum (a beep(), silent since v2.3.1103) */
            _context8.n = 7;
            break;
          case 6:
            _context8.p = 6;
            _t7 = _context8.v;
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
    /* v2.3.1235: state-correction §8 — explicit unaffordable state: the
       action stays visible but reads as a disabled secondary with a
       plain-language shortfall line beneath (the handler's own coin
       guard also still holds). */
    disabled: rpgState.coins < ARENA_ENTRY_FEE,
    style: rpgState.coins >= ARENA_ENTRY_FEE ? {
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
    } : {
      width: '100%',
      minHeight: 44,
      padding: '12px 0',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      border: '1px solid rgba(229,237,233,.11)',
      background: '#1A292F',
      color: '#8D9B98',
      cursor: 'default',
      marginBottom: 8
    }
  }, "Enter Arena \xB7 ", ARENA_ENTRY_FEE, "G"), rpgState.coins < ARENA_ENTRY_FEE && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#D8635D',
      textAlign: 'center',
      marginBottom: 8
    }
  }, "Need ", ARENA_ENTRY_FEE - rpgState.coins, "G more")), (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'queued' && /*#__PURE__*/React.createElement("div", {
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
      color: '#8D9B98'
    }
  }, "Position: ", arenaStatus.position, "/", arenaStatus.queueSize, " \xB7 ",
  /* v2.3.3713: the worker sends when the bracket starts (`startsAt`: a
     minute after the first entry, with 2 or more); "Waiting for 4/16
     players" was the old Arena DO's rule, never this worker's */
  arenaStatus.startsAt ? 'Bracket starts in ' + Math.max(0, Math.ceil((arenaStatus.startsAt - Date.now()) / 1000)) + 's' : 'Waiting for ' + (arenaStatus.queueSize < 4 ? '4' : '16') + ' players...'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
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
      /* v2.3.1235: batch-3 rollout \u2014 card token; the red-tint border was
         an off-token decorative border (danger stays on the text). */
      background: '#24363C',
      border: '1px solid rgba(229,237,233,.20)',
      marginBottom: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#D8635D' /* v2.3.1235: danger token */,
      marginBottom: 4
    }
  }, "FIGHT! Round ", arenaStatus.round), /*#__PURE__*/React.createElement("div", {
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
      borderRadius: 999 /* v2.3.1235: batch-3 rollout — pill radius (16 off the approved set) */,
      background: arenaStatus.currentMatch.p1Color || '#D8AA58' /* player color is game data; fallback → brass token */,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 700,
      color: '#F4F0E7',
      margin: '0 auto'
    }
  }, ((_arenaStatus$currentM = arenaStatus.currentMatch.p1Name) === null || _arenaStatus$currentM === void 0 ? void 0 : _arenaStatus$currentM.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#F4F0E7',
      marginTop: 2
    }
  }, arenaStatus.currentMatch.p1Name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor */,
      color: '#8D9B98'
    }
  }, "Lv", arenaStatus.currentMatch.p1Level)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: '#8D9B98'
    }
  }, "VS"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 999 /* v2.3.1235: batch-3 rollout — pill radius */,
      background: arenaStatus.currentMatch.p2Color || '#D8635D' /* player color is game data; fallback → danger token */,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 700,
      color: '#F4F0E7',
      margin: '0 auto'
    }
  }, ((_arenaStatus$currentM2 = arenaStatus.currentMatch.p2Name) === null || _arenaStatus$currentM2 === void 0 ? void 0 : _arenaStatus$currentM2.charAt(0)) || '?'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#F4F0E7',
      marginTop: 2
    }
  }, arenaStatus.currentMatch.p2Name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor */,
      color: '#8D9B98'
    }
  }, "Lv", arenaStatus.currentMatch.p2Level))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
      marginTop: 6
    }
  }, "Find and defeat your opponent!" /* v2.3.3713: a match counts wherever you meet */), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px text floor */,
      color: '#667875',
      marginTop: 4
    }
  }, "3 minutes on the clock: then the one with more health left wins." /* v2.3.3713: the worker's rule (gladiator.js MATCH_MS, _arenaTiebreak); "2 min ... auto-awarded" was the old Arena DO's */)), (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'eliminated' && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      borderRadius: 8,
      /* v2.3.1235: batch-3 rollout \u2014 card token + hairline (well-soft
         retired); the \uD83D\uDC80 chrome glyph is dropped. */
      background: '#24363C',
      border: '1px solid rgba(229,237,233,.11)',
      marginBottom: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#B6C1BE'
    }
  }, "Eliminated \u2014 Round ", arenaStatus.round), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
      marginTop: 2
    }
  }, arenaStatus.wins, " wins \xB7 You can spectate the rest!")), arenaTournament && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      /* v2.3.1235: batch-3 rollout — 11/700 .14em muted headers */
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      fontVariantNumeric: 'tabular-nums',
      color: '#8D9B98',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("img", { src: "/icons/ui/evt-party.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px', marginRight: 6 }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83C\uDFDF\uFE0F')); } }), "Tournament \u2014 Round ", arenaTournament.round, "/", arenaTournament.maxRounds, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
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
        fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px floor */,
        fontWeight: 600,
        /* v2.3.1235: batch-3 rollout — the green alive-tint was an
           off-token screen-specific fill; alive = plain line-bordered
           pill (player color is game data), eliminated = well fill at
           the .55 readability floor; status emoji dropped (chrome —
           line-through already encodes eliminated). */
        background: p.eliminated ? '#111E23' : 'transparent',
        border: '1px solid ' + (p.eliminated ? 'rgba(229,237,233,.11)' : 'rgba(229,237,233,.20)'),
        color: p.eliminated ? '#667875' : p.color || '#F4F0E7',
        textDecoration: p.eliminated ? 'line-through' : 'none',
        opacity: p.eliminated ? 0.55 : 1
      }
    }, p.name, " ", p.wins > 0 && '(' + p.wins + 'W)');
  })), arenaTournament.currentMatches.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#8D9B98',
      marginBottom: 2
    }
    /* v2.3.1235: batch-3 rollout — match rows move into one well with
       dividers; the red live-match tint was an off-token screen fill
       (the brass "Fighting" tag carries the live state). */
  }, "Current Matches"), /*#__PURE__*/React.createElement("div", {
    style: LS_WELL235
  }, arenaTournament.currentMatches.map(function (m, _mi) {
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        minHeight: 44,
        padding: '6px 10px',
        borderTop: _mi > 0 ? LS_DIV235 : 'none',
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: m.p1Color || '#D8AA58',
        fontWeight: 700
      }
    }, m.p1Name), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#667875'
      }
    }, "vs"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: m.p2Color || '#D8635D' /* v2.3.1235: danger token fallback */,
        fontWeight: 700
      }
    }, m.p2Name), m.resolved && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        fontSize: 11 /* v2.3.1235: batch-3 rollout \u2014 11px floor */,
        color: '#55B98A' /* v2.3.1235: positive token */
      }
    }, "Winner: ", m.winnerId === m.p1 ? m.p1Name : m.p2Name), !m.resolved && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        fontSize: 11 /* v2.3.1235: batch-3 rollout \u2014 11px floor */,
        color: '#D8AA58' /* v2.3.1235: brass token; status emoji dropped */
      }
    }, "Fighting"));
  }))), function () {
    /* v2.3.1210: spectator stake board -- server-summed totals per open
       match (arena_stake_board, gameEvents.js).  Display only; shows
       where the sponsorship money is without leaking who staked what.
       Reads the state slice the privileged event writes; re-renders on
       the arena panel's 3s poll. */
    var _board = (stateRef.current && stateRef.current._arenaStakeBoard) || [];
    if (!_board.length) return null;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      /* v2.3.1235: batch-3 rollout \u2014 11/700 .14em muted header, emoji
         dropped; stake rows move into one well with dividers; the two
         match sides keep the order-book brass/danger semantics. */
      style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: '#8D9B98', marginTop: 4, marginBottom: 2 }
    }, "Spectator Stakes"), /*#__PURE__*/React.createElement("div", {
      style: LS_WELL235
    }, _board.map(function (b, _bi) {
      var _pot = (b.aTotal || 0) + (b.bTotal || 0);
      return /*#__PURE__*/React.createElement("div", {
        key: b.matchId,
        style: { display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, padding: '6px 10px', borderTop: _bi > 0 ? LS_DIV235 : 'none', fontSize: 11 }
      }, /*#__PURE__*/React.createElement("span", {
        style: { color: '#D8AA58', fontWeight: 700 }
      }, b.aName || '?'), /*#__PURE__*/React.createElement("span", {
        style: { color: '#D8AA58', fontWeight: 700 }
      }, (b.aTotal || 0) + 'G', b.aBackers ? ' \xB7' + b.aBackers : ''), /*#__PURE__*/React.createElement("span", {
        style: { color: '#667875' }
      }, "vs"), /*#__PURE__*/React.createElement("span", {
        style: { color: '#D8635D', fontWeight: 700 }
      }, b.bName || '?'), /*#__PURE__*/React.createElement("span", {
        style: { color: '#D8AA58', fontWeight: 700 }
      }, (b.bTotal || 0) + 'G', b.bBackers ? ' \xB7' + b.bBackers : ''), /*#__PURE__*/React.createElement("span", {
        style: { marginLeft: 'auto', fontSize: 11, color: '#8D9B98' }
      }, _pot + 'G pot'));
    })));
  }(), arenaTournament.status === 'complete' && arenaTournament.champion && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      borderRadius: 8,
      /* v2.3.1235: batch-3 rollout \u2014 card token; the brass edge stays
         (champion = the premium moment brass is reserved for); \uD83C\uDFC6
         chrome glyph dropped. */
      background: '#24363C',
      border: '1px solid #D8AA58',
      textAlign: 'center',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: '#D8AA58'
    }
  }, "GLADIATOR CHAMPION"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#F4F0E7',
      marginTop: 2
    }
  }, arenaTournament.champion.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98'
    }
  }, arenaTournament.champion.wins, " wins \xB7 Lv", arenaTournament.champion.level), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#D8AA58' /* v2.3.1235: brass token */,
      marginTop: 4
    }
  }, "+", /* v2.3.3178: the prize the worker paid -- it follows the bracket
     now (250 a gladiator, at most 3,600 from the house an hour); a worker
     from before it never sends one, and paid the 2,000 */
  typeof arenaTournament.champion.prize === 'number' ? arenaTournament.champion.prize : ARENA_CHAMPION_REWARD.gold, "G +",
  /* v2.3.3481: the AP the worker PAID, as the prize above: `champion.ap`,
     which gladiator.js _arenaCrown puts on the record only when it pays them
     (caps.arenaap).  A record without it was paid gold alone -- an older
     worker, or `arenaap: false` -- and the box said "+500AP" for points
     nobody was given, so it names none.
     v2.3.3527: and since achievements a crown pays them only the first time
     (the Gladiator achievement): the worker sets `champion.ap` only on a
     crown that pays them (achievements.js _achvWouldPay), so a second
     crown's box says the gold and the title alone. */
  typeof arenaTournament.champion.ap === 'number' && arenaTournament.champion.ap > 0 ? arenaTournament.champion.ap + "AP + " : " ", "\"Gladiator\" title")), arenaTournament.recentMatches.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#8D9B98',
      marginTop: 6,
      marginBottom: 2
    }
  }, "Recent Results"), arenaTournament.recentMatches.slice(-5).reverse().map(function (m, i) {
    var _arenaTournament$play, _arenaTournament$play2;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 11 /* v2.3.1235: batch-3 rollout — 11px floor */,
        color: '#667875',
        padding: '1px 0'
      }
      /* v2.3.1235: batch-3 rollout — result marks become text glyphs
         (✅/❌ emoji are chrome) */
    }, "R", m.round, ": ", m.winnerId === m.p1 ? '✓' : '✗', " ", ((_arenaTournament$play = arenaTournament.players.find(function (p) {
      return p.id === m.p1;
    })) === null || _arenaTournament$play === void 0 ? void 0 : _arenaTournament$play.name) || '?', " vs ", ((_arenaTournament$play2 = arenaTournament.players.find(function (p) {
      return p.id === m.p2;
    })) === null || _arenaTournament$play2 === void 0 ? void 0 : _arenaTournament$play2.name) || '?', " ", m.winnerId === m.p2 ? '✓' : '✗');
  }))), /* v2.3.3481: THE REAL BET (arena_sponsor below), and the only one a
     settling worker draws.  `sponsorSpectator` (above) lets a spectator see
     it there, where /status carries no `status` for the two checks. */
  arenaTournament && arenaTournament.status === 'active' && ((arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'none' || (arenaStatus === null || arenaStatus === void 0 ? void 0 : arenaStatus.status) === 'eliminated' || sponsorSpectator) && function (_remaining$find) {
    var S = stateRef.current;
    var remaining = arenaTournament.players.filter(function (p) {
      return !p.eliminated;
    });
    var myBet = arenaBets.find(function (b) {
      return b.round === arenaTournament.round;
    });
    return /*#__PURE__*/React.createElement("div", {
      "data-arena-bet": "1" /* v2.3.3713: mp-arena's handles on the real bet */,
      style: {
        marginTop: 6,
        padding: 10,
        borderRadius: 10,
        background: '#111E23' /* v2.3.1235: batch-3 rollout — well token + shared .ui-well recipe */,
        boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)',
        border: '1px solid rgba(229,237,233,.11)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700 /* v2.3.1235: batch-3 rollout — 11/700 .14em muted headers */,
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        color: '#8D9B98',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("img", { src: "/icons/ui/evt-sponsorship.webp", alt: "", draggable: false, style: { width: 16, height: 16, objectFit: 'contain', verticalAlign: '-3px', marginRight: 6 }, onError: function (e) { e.currentTarget.replaceWith(document.createTextNode('\uD83C\uDFB2')); } }), "Spectator Betting"), myBet ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, "Bet placed: ", myBet.amount, "G on ", ((_remaining$find = remaining.find(function (p) {
      return p.id === myBet.targetPlayerId;
    })) === null || _remaining$find === void 0 ? void 0 : _remaining$find.name) || '???', /*#__PURE__*/React.createElement("br", null), "Round ", arenaTournament.round, " \u2014 waiting for results...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
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
        "data-arena-bet-target": p.id,
        onClick: function onClick() {
          return setArenaBetTarget(arenaBetTarget === p.id ? null : p.id);
        },
        style: {
          minHeight: 44 /* v2.3.1235: batch-3 rollout — 44px hitbox floor on pick chips */,
          padding: '6px 12px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid ' + (arenaBetTarget === p.id ? '#D8AA58' : 'rgba(229,237,233,.20)'),
          background: arenaBetTarget === p.id ? 'rgba(216,170,88,.15)' : 'transparent' /* v2.3.1235: batch-3 rollout — brass-soft selected chip, transparent idle */,
          color: arenaBetTarget === p.id ? '#D8AA58' : p.color || '#F4F0E7',
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
        color: '#D8AA58'
      }
    }, "Bet:"), /*#__PURE__*/React.createElement("input", {
      "data-arena-bet-amount": "1",
      type: "number",
      min: ARENA_BET_MIN,
      max: Math.min(ARENA_BET_MAX, rpgState.coins),
      value: arenaBetAmount,
      onChange: function onChange(e) {
        return setArenaBetAmount(Math.max(ARENA_BET_MIN, Math.min(ARENA_BET_MAX, +e.target.value || ARENA_BET_MIN)));
      },
      style: {
        width: 76,
        minHeight: 44 /* v2.3.1235: batch-3 rollout — 44px input height */,
        padding: '4px 8px',
        borderRadius: 8,
        border: '1px solid rgba(229,237,233,.20)',
        background: '#111E23',
        color: '#D8AA58',
        fontSize: 16 /* v2.3.1233b: iOS zoom guard */,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
        outline: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: '#8D9B98'
      }
    }, "G (max ", Math.min(ARENA_BET_MAX, rpgState.coins), ")")), /*#__PURE__*/React.createElement("button", {
      "data-arena-bet-place": "1",
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
           v2.3.4911: the page's own debit and 1.8x self-mint for a worker
           without caps.sponsor are gone (gold is the worker's, CLAUDE.md
           §5): such a worker takes no bet. */
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
        pushDmgPopup(S2, S2.player.x, S2.player.y - 30, 'Betting is closed', '#D95C54'); cue('denied');   /* heard (sound-cues 11x) */
      },
      style: {
        width: '100%',
        minHeight: 44,
        padding: '10px 0',
        borderRadius: 10 /* v2.3.1235: batch-3 rollout — 10px button radius (11 off the approved set) */,
        fontSize: 13,
        fontWeight: 700,
      /* v2.3.1233b: audit fix — visual now mirrors the FULL disabled gate (target AND coins); it previously keyed on target only, rendering a solid-brass primary that silently swallowed taps when broke. Style-only. */
        /* v2.3.1235: batch-3 rollout — gold-gradient primary when armed;
           disabled = secondary (see the confirm above). */
        border: '1px solid ' + ((arenaBetTarget && rpgState.coins >= arenaBetAmount) ? '#EAC675' : 'rgba(229,237,233,.20)'),
        background: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? 'linear-gradient(180deg,#E2B765,#D2A14D)' : '#293B41',
        color: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? '#172126' : '#667875',
        cursor: (arenaBetTarget && rpgState.coins >= arenaBetAmount) ? 'pointer' : 'not-allowed'
      }
    }, "Place Bet")));
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
        fontWeight: 700 /* v2.3.1235: batch-3 rollout \u2014 11/700 .14em muted headers */,
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        color: '#8D9B98',
        marginBottom: 3
      }
      /* v2.3.1235: batch-3 rollout \u2014 header emoji dropped; rows move
         into one well with dividers below. */
    }, "Hall of Fame"), /*#__PURE__*/React.createElement("div", {
      style: LS_WELL235
    }, arenaHistory.slice(0, 10).map(function (c, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          minHeight: 44,
          padding: '6px 10px',
          borderTop: i > 0 ? LS_DIV235 : 'none' /* v2.3.1235: divider rows */,
          fontSize: 11
        }
        /* v2.3.1235: batch-3 rollout — medal emoji chrome becomes a
           tabular rank number. */
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: '#8D9B98'
        }
      }, i + 1, "."), /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 700,
          color: '#D8AA58'
        }
      }, c.championName), /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#8D9B98',
          marginLeft: 'auto'
        }
      }, c.wins, "W \xB7 ", c.totalPlayers, "P"));
    })) /* v2.3.1235: batch-3 rollout — closes the hall-of-fame well */) : null;
  }());
}
