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
/* v2.3.1235: batch-3 rollout — correction-pass token remap (game.css
   :root). The v2.3.1232 literals were the superseded v2.3.1227
   palette; same roles, approved values. Four depth roles only, so
   wellSoft folds into the well, and the off-token .08/.14 hairlines
   fold into the approved .11 line (.20 borderStrong added for
   secondary buttons). Header strip adopts the #27393F header token. */
/* v2.3.1235: state-correction — §7 wager/jackpot states + §10 scroll.
   The ROLL primary reads "Select a wager" (approved disabled recipe,
   real disabled prop) until a chip is picked, then "Roll · 10G" — the
   "ROLL! (—g)" placeholder is gone; the top balance is labelled "Your
   gold: NG"; deposit chips read "Deposit 50G" and an unaffordable
   jackpot states "Need 50G" in a 12px danger line. Panel root becomes
   a flex column (fixed header + ls-scrollbody body + sticky 24px
   bottom fade on the sheet #1E2E34) so the Gambling Stats rows are
   always reachable by scrolling. Handlers byte-identical. */
var LS = {
  txt1: '#F4F0E7', txt2: '#B6C1BE', txt3: '#8D9B98', dis: '#667875',
  panel: '#1E2E34', strip: '#27393F', raised: '#293B41', well: '#111E23', wellSoft: '#111E23',
  border: 'rgba(229,237,233,.11)', borderStrong: 'rgba(229,237,233,.20)', divider: 'rgba(229,237,233,.11)', wellBorder: 'rgba(229,237,233,.11)',
  brass: '#D8AA58', brassFill: 'rgba(216,170,88,.15)', onBrass: '#172126'
};
/* v2.3.1232: -20 margin counters .bt-inspect-card's 20px padding so the
   panel owns its full surface (header strip flush to the card edge). */
var LS_WRAP = { margin: -20, background: LS.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
var LS_BODY = { padding: '12px 14px 14px' };
var LS_MOD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: LS.txt3, margin: '0 0 6px' }; /* v2.3.1235: batch-3 rollout — section headers are 11/700 .14em muted per the locked contract */
var LS_DIV = { borderTop: '1px solid rgba(229,237,233,.11)', margin: '12px 0' }; /* v2.3.1235: batch-3 rollout — approved .11 hairline */
function lsHeader(icon, emoji, title, subtitle) {
  return React.createElement("div", {
    style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: LS.strip, borderBottom: '1px solid ' + LS.border, flex: 'none' /* v2.3.1235: state-correction §10 — header row stays fixed above the scroll body */ }
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
  /* v2.3.1235: state-correction §10 — bottom-fade scroll affordance
     (the InspectPlayerPanel pattern): the fade shows ONLY while more
     content exists below the fold, so the Gambling Stats rows are
     visibly reachable by scrolling on short phones. */
  var _sf = React.useState(false);
  var showFade = _sf[0],
    setShowFade = _sf[1];
  var scrollBodyRef = React.useRef(null);
  var measureFade = React.useCallback(function () {
    var el = scrollBodyRef.current;
    if (el) setShowFade(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);
  React.useEffect(function () {
    measureFade();
  }, [rpgState, measureFade]);
  return React.createElement("div", { style: _objectSpread(_objectSpread({}, LS_WRAP), {}, { display: 'flex', flexDirection: 'column', maxHeight: '100%' }) /* v2.3.1235: state-correction §10 — flex column: fixed header + ONE scroll body */ },
    lsHeader('gamble', '🎰', "Gambling Den", "Coin flips & the weekly jackpot"),
    React.createElement("div", {
      ref: scrollBodyRef,
      onScroll: measureFade,
      className: "ls-scrollbody" /* v2.3.1235: state-correction §10 — hides the scrollbar (game.css); reachability is signalled by the sticky fade */,
      style: _objectSpread(_objectSpread({}, LS_BODY), {}, { overflowY: 'auto', touchAction: 'pan-y', flex: '1 1 auto', minHeight: 0, paddingBottom: 12 })
    },
      React.createElement("div", {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }
      }, React.createElement("span", {
        /* v2.3.1235: state-correction §7 — the top balance is labelled
           ("Your gold: 75G"), never a bare unexplained number. */
        style: { display: 'inline-flex', alignItems: 'center', gap: 6 }
      }, React.createElement("span", { style: { fontSize: 12, color: LS.txt2 } }, "Your gold:"),
      lsGold(rpgState.coins + 'G', 16) /* v2.3.1235: batch-3 rollout — key numbers are 16-18/700 tabular */),
      React.createElement("span", { style: { fontSize: 12, color: LS.txt2, fontVariantNumeric: 'tabular-nums' } },
        rpgState.achievementPoints || 0, " AP") /* v2.3.1235: batch-3 rollout — ⭐ dropped, no emoji in chrome */),
      React.createElement("div", { style: LS_MOD }, "Double or Nothing"),
      React.createElement("div", {
        style: { fontSize: 11, color: LS.txt3, marginBottom: 8, lineHeight: 1.5 }
      }, "40% chance to double your wager. 60% chance to lose it all. House always wins... eventually."),
      React.createElement("div", {
        style: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }
      }, [10, 50, 100, 500, 1000, 5000].filter(function (v) {
        return v <= rpgState.coins;
      }).map(function (amt) {
        /* v2.3.1235: batch-3 rollout — 44px transparent hit wrapper
           around the 32px chip visual (contract hitbox floor; the
           established chipHit pattern). Selected fill is the approved
           brass-soft token via LS.brassFill. */
        return /*#__PURE__*/React.createElement("button", {
          key: amt,
          style: {
            minHeight: 44,
            padding: 0,
            margin: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center'
          },
          onClick: function onClick() {
            stateRef.current._gambleWager = amt;
            setRpgState(_objectSpread({}, stateRef.current.rpg));
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 12px',
            minHeight: 32,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            background: stateRef.current._gambleWager === amt ? LS.brassFill : LS.raised,
            border: stateRef.current._gambleWager === amt ? '1px solid ' + LS.brass : '1px solid ' + LS.border,
            color: stateRef.current._gambleWager === amt ? LS.brass : LS.txt2
          }
        }, amt, "g"));
      })), stateRef.current._gambleResult && Date.now() - stateRef.current._gambleResult.ts < 3000 && /*#__PURE__*/React.createElement("div", {
        style: {
          padding: 8,
          borderRadius: 8,
          marginBottom: 8,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          /* v2.3.1235: batch-3 rollout — result banner moves off the
             unapproved rgba tints onto a well + semantic OUTLINE
             (positive #55B98A / danger #D8635D, danger fills are never
             chrome); 🎉/💸 dropped, no emoji in chrome. */
          background: LS.well,
          border: stateRef.current._gambleResult.won ? '1px solid #55B98A' : '1px solid #D8635D',
          color: stateRef.current._gambleResult.won ? '#55B98A' : '#D8635D'
        }
      }, stateRef.current._gambleResult.won ? 'WON! +' + stateRef.current._gambleResult.amount + 'g' : 'LOST! -' + stateRef.current._gambleResult.amount + 'g'), /*#__PURE__*/React.createElement("button", {
        /* v2.3.1235: batch-3 rollout — the surface's single gold
           primary adopts the shared .button-primary recipe (game.css)
           instead of a flat brass fill; 10px radius (11 is off the
           approved set). Disabled state stays readable on the well. */
        className: stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager ? 'button-primary' : undefined,
        /* v2.3.1235: state-correction §7 — real disabled prop (the
           onClick guards are unchanged underneath) + the approved
           disabled recipe (#1A292F fill, #8D9B98 text, .11 hairline,
           opacity 1, 44px) while no wager chip is selected. */
        disabled: !(stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager),
        style: {
          width: '100%',
          minHeight: 44,
          padding: '10px 0',
          borderRadius: 10,
          border: stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager ? undefined : '1px solid ' + LS.border,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '.03em',
          fontVariantNumeric: 'tabular-nums',
          cursor: stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager ? 'pointer' : 'default',
          background: stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager ? undefined : '#1A292F',
          color: stateRef.current._gambleWager && rpgState.coins >= stateRef.current._gambleWager ? undefined : '#8D9B98',
          opacity: 1
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
      }, stateRef.current._gambleWager ? "Roll \xB7 " + stateRef.current._gambleWager + "G" : "Select a wager") /* v2.3.1235: state-correction §7 — never a "—g" placeholder: "Select a wager" until a chip is picked, then "Roll · 10G" */,
      React.createElement("div", { style: LS_DIV }),
      React.createElement("div", { style: LS_MOD }, "Weekly Jackpot"),
      React.createElement("div", {
        style: { fontSize: 11, color: LS.txt3, marginBottom: 6, lineHeight: 1.5 }
      }, "Server-wide pool. All deposits collected. One random winner each week. 10% house cut."),
      React.createElement("div", {
        style: { fontSize: 18, fontWeight: 700, color: LS.brass, textAlign: 'center', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }
      }, stateRef.current._jackpotPool || '???', "g") /* v2.3.1235: batch-3 rollout — 🏆 dropped, no emoji in chrome */,
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
          /* v2.3.1235: batch-3 rollout — secondary recipe (raised +
             strong hairline, 10px radius — 11 is off the approved set)
             and the 44px hitbox floor (was 36); deposit amounts keep
             the brass gold-value color. */
          style: {
            flex: 1,
            minHeight: 44,
            padding: '6px 0',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            cursor: 'pointer',
            border: '1px solid ' + LS.borderStrong,
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
        }, "Deposit ", amt, "G" /* v2.3.1235: state-correction §7 — verb + amount ("Deposit 50G", not a bare "50g") */);
      })),
      rpgState.coins < JACKPOT_MIN_DEPOSIT && React.createElement("div", {
        /* v2.3.1235: state-correction §7 — when no deposit chip is
           affordable the affordability filter above leaves the row
           empty; state WHY in a 12px danger line instead of silence.
           Same read (coins vs the JACKPOT_MIN_DEPOSIT floor = the
           smallest chip) the filter and the handler guard use. */
        style: { fontSize: 12, color: '#D8635D', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }
      }, "Need ", JACKPOT_MIN_DEPOSIT, "G"),
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
          color: '#55B98A' /* v2.3.1235: batch-3 rollout — approved positive token */,
          fontWeight: 700,
          textAlign: 'right'
        }
      }, ((_rpgState$_compStats3 = rpgState._compStats) === null || _rpgState$_compStats3 === void 0 ? void 0 : _rpgState$_compStats3.totalGambleWon) || 0, "g"), /*#__PURE__*/React.createElement("span", null, "Total lost:"), /*#__PURE__*/React.createElement("span", {
        style: {
          color: '#D8635D' /* v2.3.1235: batch-3 rollout — approved danger token */,
          fontWeight: 700,
          textAlign: 'right'
        }
      }, ((_rpgState$_compStats4 = rpgState._compStats) === null || _rpgState$_compStats4 === void 0 ? void 0 : _rpgState$_compStats4.totalGambleLost) || 0, "g"), /*#__PURE__*/React.createElement("span", null, "Net:"), /*#__PURE__*/React.createElement("span", {
        style: {
          color: (((_rpgState$_compStats5 = rpgState._compStats) === null || _rpgState$_compStats5 === void 0 ? void 0 : _rpgState$_compStats5.totalGambleWon) || 0) - (((_rpgState$_compStats6 = rpgState._compStats) === null || _rpgState$_compStats6 === void 0 ? void 0 : _rpgState$_compStats6.totalGambleLost) || 0) >= 0 ? '#55B98A' : '#D8635D' /* v2.3.1235: batch-3 rollout — approved positive/danger tokens */,
          fontWeight: 700,
          textAlign: 'right'
        }
      }, (((_rpgState$_compStats7 = rpgState._compStats) === null || _rpgState$_compStats7 === void 0 ? void 0 : _rpgState$_compStats7.totalGambleWon) || 0) - (((_rpgState$_compStats8 = rpgState._compStats) === null || _rpgState$_compStats8 === void 0 ? void 0 : _rpgState$_compStats8.totalGambleLost) || 0), "g"))),
      React.createElement("div", {
        /* v2.3.1235: state-correction §10 — sticky 24px bottom fade
           (last child of the scroll body); the gradient resolves to
           the sheet #1E2E34 this body sits on. Visible only while
           content remains below the fold (showFade). */
        "aria-hidden": true,
        style: { position: 'sticky', bottom: 0, height: 24, marginTop: -24, flexShrink: 0, background: 'linear-gradient(180deg, rgba(30,46,52,0), #1E2E34)', opacity: showFade ? 1 : 0, transition: 'opacity 160ms ease', pointerEvents: 'none' }
      })));
}
