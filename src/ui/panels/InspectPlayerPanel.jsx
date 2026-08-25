import React from 'react';
import { BT_AUDIO, PVP_THREAT_BASE_COUNTDOWN, PVP_THREAT_COOLDOWN, REPUTATION, ZONES } from '@/data/index.js';
import { _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* v2.3.1235: Checkpoint B — real pixel-portrait generator + the color-id →
   RGB target transforms it expects (same set the BottomDashboard player
   card uses). */
import { portraitDataUrl } from '../../rendering/characterPortrait.js';
import { hairColorTarget } from '../../rendering/traits/hairColorCatalog.js';
import { hatColorTarget } from '../../rendering/traits/hatColorCatalog.js';
import { facialHairColorTarget } from '../../rendering/traits/facialHairColorCatalog.js';
import { shirtColorTarget } from '../../rendering/traits/shirtColorCatalog.js';

/* v2.3.1917: mirrors GameRoom.OPEN_PVP (server/src/index.js).  While it is
   false the worker refuses pvp_threat and every non-consensual hit, so the
   Threat button below is not rendered.  One constant on each side, named
   the same, so re-enabling is two edits and a search finds both. */
var PVP_OPEN = false;
/* === InspectPlayerPanel — the inspectPlayer modal === */
/* v2.3.887: extracted verbatim from the inspectPlayer JSX subtree in
   BroTown.jsx (the player-inspect / social-actions popup: view another
   player's gear and reputation, friend / mute / block them, or open a
   trade). Behavior-frozen UI decomposition; the `inspectPlayer &&` gate
   stays in BroTown. 13 props: stateRef, inspectPlayer/blockedList/
   clanData/friendsList/mutedList (state) and setBlockedList/
   setFriendsList/setInspectPlayer/setMutedList/setShowTrade/
   setTradeOffer/setTradeTarget (setters). Data imports verified real
   exports; slice/spread-array babel helpers imported; the hoisted
   optional-chaining temp set declared locally. */
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   presentation only: every social/trade/duel/threat handler and every
   caps gate is unchanged. Equipment/stats/record become header+well
   groups instead of outlined boxes; Trade is the region's single brass
   primary; Threat/Block speak the destructive language; the old indigo
   (#a78bfa) and amber (#fbbf24) accents map to the spec magic/stamina
   colors. Player/clan/reputation colors stay — they are content color. */
/* v2.3.1235: owner-approved design correction (§7) — presentation only,
   every handler/state read/send byte-identical. Real pixel portrait at
   56px (letter tile only as fallback), compressed header row, Trade is
   the single gold primary, TP/Duel secondaries, Threat becomes a danger
   OUTLINE (never a filled red block), sections keep label+divider
   grouping with quieter cells. Committed tokens: sheet #1E2E34, raised
   #293B41, lines rgba(229,237,233,.11/.20), brass #D8AA58. */

/* v2.3.1232: Lantern Slate style tokens — local, no shared module. */
var LS_HEADER = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  color: '#8D9B98' /* v2.3.1235: muted token */
};
var LS_DIVIDER = '1px solid rgba(229,237,233,0.11)'; /* v2.3.1235: hairline token */
/* full-width secondary action button */
var LS_SECONDARY = {
  minHeight: 44,
  padding: '0 12px',
  borderRadius: 10, /* v2.3.1235: card radius */
  border: '1px solid rgba(229,237,233,0.20)', /* v2.3.1235: strong hairline */
  background: '#293B41', /* v2.3.1235: raised */
  color: '#F4F0E7',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer'
};

export function InspectPlayerPanel(props) {
  var stateRef = props.stateRef,
    inspectPlayer = props.inspectPlayer,
    blockedList = props.blockedList,
    clanData = props.clanData,
    friendsList = props.friendsList,
    mutedList = props.mutedList,
    setBlockedList = props.setBlockedList,
    setFriendsList = props.setFriendsList,
    setInspectPlayer = props.setInspectPlayer,
    setMutedList = props.setMutedList,
    setShowTrade = props.setShowTrade,
    setTradeOffer = props.setTradeOffer,
    setTradeTarget = props.setTradeTarget;
  /* v2.3.1235: Checkpoint B — generate the game's REAL pixel portrait of
     the inspected player.  NOTE: inspectPlayer.bro is NFT metadata
     (ID/diScore/rank), NOT appearance — the inspected player's live
     cosmetics are the flat fields on stateRef.current.others[id]
     (skin/hair/hairColor/facialhair/facialHairColor/headwear/hatColor/
     shirt/shirtColor/pants/shoes, filled at player_join/state_sync from
     the wire's sk/hr/hc/fh/fhc/hw/htc/st/stc/pt/sh).  These are the SAME
     fields entityRenderer draws, so the portrait matches the in-game
     figure.  portraitDataUrl is ASYNC (Promise of a data URL); color ids
     go through the *Target() transforms exactly like the BottomDashboard
     player-card portrait (~line 537).  Fallback chain when the others
     entry is gone (player left / placeholder peer) or generation fails:
     inspectPlayer.avatar img → 56px letter tile. */
  var _pp = React.useState(null);
  var genPortrait = _pp[0],
    setGenPortrait = _pp[1];
  React.useEffect(function () {
    var alive = true;
    setGenPortrait(null);
    var o = null;
    try {
      o = inspectPlayer && stateRef.current && stateRef.current.others ? stateRef.current.others[inspectPlayer.id] : null;
    } catch (e) {}
    /* tick-created placeholder peers carry all-null cosmetics — skip so
       the avatar / letter-tile fallbacks show instead of a default body */
    if (o && (o.skin || o.hair || o.shirt || o.headwear || o.facialhair || o.pants)) {
      try {
        portraitDataUrl({
          skin: o.skin,
          pants: o.pants,
          shoes: o.shoes,
          hair: o.hair,
          hairColor: hairColorTarget(o.hairColor),
          facialHair: o.facialhair,
          facialHairColor: facialHairColorTarget(o.facialHairColor),
          headwear: o.headwear,
          hatColor: hatColorTarget(o.hatColor, o.headwear), /* v2.3.1927 */
          shirt: o.shirt,
          shirtColor: shirtColorTarget(o.shirtColor),
          eyeColor: o.eyeColor   /* v2.3.1930: THEIR eyes, off the wire */
        }, true).then(function (url) {
          if (alive && url) setGenPortrait(url);
        }).catch(function () {});
      } catch (e) {}
    }
    return function () {
      alive = false;
    };
  }, [inspectPlayer]);
  /* v2.3.1235: rollout micro-fix §1 — the scrollable body hides its
     scrollbar (no permanent scrollbar on the modal) and shows a 24px
     bottom fade above the sticky action row ONLY while more content
     exists below the fold, so short-phone users know Add Friend / Mute /
     Block are reachable by scrolling. */
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
  }, [inspectPlayer, genPortrait, measureFade]);
  var _REPUTATION$inspectPl, _REPUTATION$inspectPl2, _S$rpg26, _ZONES$stateRef$curre, _inspectPlayer$bro$di, _inspectPlayer$rpgDat, _stateRef$current39;
  /* v2.3.1743: is this person already on my roster?  The party action at
     the top of the card reads as an invite otherwise, and inviting someone
     you are already partied with just earns an 'already partied' error from
     the worker — which is a confusing thing to hand the owner now that
     tapping a teammate opens this card (v2.3.1742). */
  var _partyMate = false;
  try {
    var _pmL = stateRef.current && stateRef.current._party && stateRef.current._party.members;
    if (_pmL && _pmL.length) {
      for (var _pmJ = 0; _pmJ < _pmL.length; _pmJ++) {
        if (_pmL[_pmJ] && String(_pmL[_pmJ].id) === String(inspectPlayer.id)) { _partyMate = true; break; }
      }
    }
  } catch (e) { _partyMate = false; }
  return React.createElement("div", {
    className: "bt-inspect",
    style: {
      background: 'rgba(4,9,12,0.38)' /* v2.3.1235: ordinary modal scrim */
    },
    onClick: function onClick() {
      return setInspectPlayer(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      /* v2.3.1235: Checkpoint B — ONE responsive layout at every width.
         Grid rows: header (auto) / scrollable body (minmax(0,1fr)) /
         PINNED TP-Trade-Duel-Threat row (auto, never scrolled away).
         The card itself no longer scrolls (overflowY hidden overrides
         the .bt-inspect-card CSS auto); the body row does.  QA saw
         "different content at different widths" because lower rows
         clipped under the old card-level maxHeight+scroll. */
      width: 'calc(100% - 24px)',
      maxWidth: 408,
      /* v2.3.1235: Checkpoint B round 3 — ALSO cap at 100% of the
         .bt-inspect content box (which reserves the HUD chip strip and
         the dashboard band): at 390×844 the 72dvh cap exceeded the box
         and the flex-centered card overflowed BOTH ends — ✕ under the
         chip, action row flush against the band. */
      maxHeight: 'min(calc(72dvh - 24px), 100%)',
      overflowY: 'hidden',
      display: 'grid',
      /* v2.3.1743: FOUR rows now — header / party action / scrollable body /
         pinned action row.  The party row is a wrapper that ALWAYS renders
         (it collapses to 0 height when there is nothing to show), because
         this template assigns rows by child ORDER: a conditionally-absent
         child would hand `minmax(0, 1fr)` to the wrong element and the body
         would stop being the part that scrolls.  That is exactly what the
         first cut of this change did — the invite button took the flexible
         row and drew itself on top of the Equipment section. */
      gridTemplateRows: 'auto auto minmax(0, 1fr) auto',
      background: '#1E2E34', /* v2.3.1235: sheet surface */
      border: '1px solid rgba(229,237,233,0.20)',
      borderRadius: 14,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setInspectPlayer(null);
    }
  }, "✕"), /* v2.3.1235: compressed header — real 56px pixel portrait
    (inspectPlayer.avatar, same field the plist rows / dashboard card
    render) with the letter tile demoted to fallback; name + Lv stack to
    its right; the old centered 64px circle + oversized padding is gone.
    The divider below comes from the first section's borderTop. */
  /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      textAlign: 'left',
      paddingRight: 24,
      marginBottom: 10
    }
  }, /* v2.3.1235: Checkpoint B — portrait chain: generated pixel
    portrait → inspectPlayer.avatar img → 56px letter tile. */
  genPortrait ? /*#__PURE__*/React.createElement("img", {
    src: genPortrait,
    alt: "",
    draggable: false,
    style: {
      width: 56,
      height: 56,
      borderRadius: 10,
      objectFit: 'cover',
      flexShrink: 0,
      border: '1px solid rgba(229,237,233,0.20)',
      background: '#111E23'
    }
  }) : inspectPlayer.avatar ? /*#__PURE__*/React.createElement("img", {
    src: inspectPlayer.avatar,
    alt: "",
    draggable: false,
    style: {
      width: 56,
      height: 56,
      borderRadius: 10,
      objectFit: 'cover',
      flexShrink: 0,
      border: '1px solid rgba(229,237,233,0.20)',
      background: '#111E23'
    },
    onError: function onError(e) {
      /* v2.3.1235: broken avatar URL → swap in the letter tile */
      var el = document.createElement('div');
      el.style.cssText = 'width:56px;height:56px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#F4F0E7;background:' + (inspectPlayer.color || '#293B41');
      el.textContent = inspectPlayer.name.charAt(0).toUpperCase();
      e.currentTarget.replaceWith(el);
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 10,
      background: inspectPlayer.color,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 22,
      fontWeight: 700,
      color: '#F4F0E7'
    }
  }, inspectPlayer.name.charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: '#F4F0E7', /* v2.3.1235: Checkpoint B — text token always, never a per-player tint */
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, inspectPlayer.clanTag && /*#__PURE__*/React.createElement("span", {
    style: {
      color: inspectPlayer.clanColor1 || '#9A76D3'
    }
  }, "[", inspectPlayer.clanTag, "] "), inspectPlayer.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
      fontSize: 12,
      color: '#8D9B98'
    }
  }, inspectPlayer.rpgLv && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums'
    }
  }, "Lv ", inspectPlayer.rpgLv), inspectPlayer.rep && inspectPlayer.rep !== 'neutral' && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: ((_REPUTATION$inspectPl = REPUTATION[inspectPlayer.rep]) === null || _REPUTATION$inspectPl === void 0 ? void 0 : _REPUTATION$inspectPl.color) || '#8D9B98'
    }
  }, ((_REPUTATION$inspectPl2 = REPUTATION[inspectPlayer.rep]) === null || _REPUTATION$inspectPl2 === void 0 ? void 0 : _REPUTATION$inspectPl2.label) || inspectPlayer.rep), inspectPlayer.pet && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    }
  }, inspectPlayer.pet)))),
  /* ═══ v2.3.1743: THE PARTY ACTION LIVES AT THE TOP ═══
     Owner: "party should be moved to the top part of the modal".  It used
     to sit INSIDE the scroll body, below Equipment, Tier 1 Stats and the
     whole Record block — on a phone that is below the fold, so the single
     most useful thing you can do with another player was the one thing you
     had to go looking for, while TP (which the owner does not even use)
     was pinned in plain sight.
     Pinned OUTSIDE the scroll body for the same reason the TP/Trade/Duel
     row is: a top-of-card action that scrolls away is not a top-of-card
     action.  Caps-gated exactly as before (v2.3.1185: an old worker would
     rebroadcast party_invite as an unknown type instead of validating it),
     so a worker without parties still shows nothing here. */
  /*#__PURE__*/React.createElement("div", {
    style: { minWidth: 0 }
  }, stateRef.current && stateRef.current._serverCaps && stateRef.current._serverCaps.party && (_partyMate
    ? /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_SECONDARY, {
        width: '100%',
        marginTop: 8,
        marginBottom: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8D9B98',
        opacity: 0.85
      })
    }, "🎟️ In your party")
    : /*#__PURE__*/React.createElement("button", {
      style: Object.assign({}, LS_SECONDARY, {
        width: '100%',
        marginTop: 8,
        marginBottom: 2,
        color: '#D8A94D'
      }),
      onClick: function onClick() {
        var S = stateRef.current;
        if (S.channel) S.channel.send({
          type: 'broadcast',
          event: 'party_invite',
          payload: {
            target: inspectPlayer.id
          }
        });
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Party invite sent', '#fbbf24');
        setInspectPlayer(null);
      }
    }, "🎟️ Invite to Party"))),
  /* v2.3.1235: Checkpoint B — row 2: the ONE
    scrollable body (sections + social rows).  Row 3 (the TP/Trade/Duel/
    Threat action row) is pinned OUTSIDE this wrapper so it can never be
    scrolled away. */
  /*#__PURE__*/React.createElement("div", {
    ref: scrollBodyRef,
    onScroll: measureFade,
    className: "ls-scrollbody" /* v2.3.1235: hides the scrollbar (game.css) */,
    style: {
      overflowY: 'auto',
      paddingBottom: 16,
      touchAction: 'pan-y',
      minHeight: 0
    }
  }, inspectPlayer.rpgData && function () {
    var d = inspectPlayer.rpgData;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'left',
        borderTop: LS_DIVIDER,
        paddingTop: 10,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6
      })
    }, "Equipment"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '5px 10px',
        fontSize: 12,
        color: '#96A2A0'
      }
    }, /*#__PURE__*/React.createElement("span", null, "⚔️ Weapon"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#F7F2E7',
        fontWeight: 600,
        textAlign: 'right'
      }
    }, d.weapon), /*#__PURE__*/React.createElement("span", null, "🛡️ Armor"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#F7F2E7',
        fontWeight: 600,
        textAlign: 'right'
      }
    }, d.armor), d.shield && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "🛡️ Shield"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#F7F2E7',
        fontWeight: 600,
        textAlign: 'right'
      }
    }, d.shield)), d.amulet && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "📿 Amulet"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#F7F2E7',
        fontWeight: 600,
        textAlign: 'right'
      }
    }, d.amulet)))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'left',
        borderTop: LS_DIVIDER,
        paddingTop: 10,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6
      })
    }, "Tier 1 Stats"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        justifyContent: 'center',
        flexWrap: 'wrap'
      }
    }, /* v2.3.1232: stat accents mapped onto the semantic set (info
         replaces the old sky, magic replaces indigo) */
    [['POW', d.power, '#D95C54'], ['VIT', d.vitality, '#59BF91'], ['END', d.endurance, '#D8A94D'], ['AGI', d.agility, '#5D93D2'], ['MND', d.mind, '#9A76D3']].map(function (_ref194) {
      var _ref195 = _slicedToArray(_ref194, 3),
        l = _ref195[0],
        v = _ref195[1],
        c = _ref195[2];
      return /*#__PURE__*/React.createElement("div", {
        key: l,
        style: {
          padding: '5px 6px',
          borderRadius: 8,
          background: '#293B41', /* v2.3.1235: quiet raised cell */
          border: '1px solid rgba(229,237,233,0.11)',
          textAlign: 'center',
          minWidth: 44
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: c,
          fontWeight: 600,
          letterSpacing: '.08em'
        }
      }, l), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: '#F7F2E7'
        }
      }, v));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'left',
        borderTop: LS_DIVIDER,
        paddingTop: 10,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6
      })
    }, "Record"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 4,
        textAlign: 'center'
      }
    }, [['💀', d.kills, 'Kills'], ['⚔️', d.pvpKills, 'PvP Kills'], ['☠️', d.deaths, 'Deaths'], ['🏆', d.quests, 'Quests'], ['⭐', d.ap, 'AP'], ['⏱️', d.playtime + 'm', 'Played']].map(function (_ref196) {
      var _ref197 = _slicedToArray(_ref196, 3),
        icon = _ref197[0],
        val = _ref197[1],
        label = _ref197[2];
      return /*#__PURE__*/React.createElement("div", {
        key: label,
        style: {
          padding: '6px 0' /* v2.3.1235: unboxed — plain cells under the
            section label instead of nested filled tiles */
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13
        }
      }, icon), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: '#F7F2E7'
        }
      }, val), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 600,
          color: '#96A2A0'
        }
      }, label));
    }))), d.clanName && /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: 32,
        boxSizing: 'border-box',
        padding: '6px 10px',
        borderRadius: 999,
        background: '#293B41', /* v2.3.1235: raised chip */
        border: '1px solid rgba(229,237,233,0.11)',
        marginBottom: 10,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: '#9A76D3'
      }
    }, "🏰 [", d.clanTag, "] ", d.clanName)));
  }(), inspectPlayer.bro && /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-pill"
  }, "Bro #", inspectPlayer.bro.ID), /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-pill",
    style: {
      color: 'var(--teal)'
    }
  }, "DI ", (_inspectPlayer$bro$di = inspectPlayer.bro.diScore) !== null && _inspectPlayer$bro$di !== void 0 && _inspectPlayer$bro$di.toFixed ? inspectPlayer.bro.diScore.toFixed(1) : inspectPlayer.bro.diScore), /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-pill",
    style: {
      color: 'var(--pop)'
    }
  }, "Rank #", inspectPlayer.bro.rank)), /* v2.3.1235: Checkpoint B — the
     TP/Trade/Duel/Threat action row moved OUT of the scroll body to the
     pinned grid row 3 (end of the card).  Everything below stays in the
     scrollable body. */
  /* v2.3.1743: the party invite that used to sit here moved to the pinned
     top of the card (owner: "party should be moved to the top part of the
     modal").  The CLAN invite stays in the scroll body — it is the rarer
     action and only appears when you lead a clan the target isn't in. */
  clanData && !((_inspectPlayer$rpgDat = inspectPlayer.rpgData) !== null && _inspectPlayer$rpgDat !== void 0 && _inspectPlayer$rpgDat.clanTag) && /*#__PURE__*/React.createElement("button", {
    style: Object.assign({}, LS_SECONDARY, {
      width: '100%',
      marginTop: 6,
      color: '#9A76D3'
    }),
    onClick: function onClick() {
      var S = stateRef.current;
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'clan_invite',
        payload: {
          target: inspectPlayer.id,
          from: S.myId,
          fromName: S.myName,
          clanName: clanData.name,
          clanTag: clanData.tag
        }
      });
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Clan invite sent', '#a78bfa');
      setInspectPlayer(null);
    }
  }, "🏰 Invite to [", clanData.tag, "]"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 6
    }
  }, function () {
    var isFriend = friendsList.some(function (f) {
      return f.id === inspectPlayer.id;
    });
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        minHeight: 44,
        padding: '0 4px',
        borderRadius: 10, /* v2.3.1235: secondary tokens */
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(229,237,233,0.20)',
        background: '#293B41',
        color: isFriend ? '#59BF91' : '#B6C1BE'
      },
      onClick: function onClick() {
        if (isFriend) {
          var updated = friendsList.filter(function (f) {
            return f.id !== inspectPlayer.id;
          });
          setFriendsList(updated);
          try {
            localStorage.setItem('bt_friends', JSON.stringify(updated));
          } catch (e) {}
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Removed friend', '#D95C54');
        } else {
          var _updated = [].concat(_toConsumableArray(friendsList), [{
            id: inspectPlayer.id,
            name: inspectPlayer.name,
            color: inspectPlayer.color,
            addedAt: Date.now()
          }]);
          setFriendsList(_updated);
          try {
            localStorage.setItem('bt_friends', JSON.stringify(_updated));
          } catch (e) {}
          /* v2.3.1324: with a friends-capable server this ALSO sends a
             real friend_request — accepted requests become mutual
             server friendships (requests + DMs).  The local write above
             stays as the legacy-path fallback (rule 19). */
          try {
            var _S9 = stateRef.current;
            if (_S9 && _S9._serverCaps && _S9._serverCaps.friends && _S9.channel) {
              _S9.channel.send({ type: 'broadcast', event: 'friend_request', payload: { target: inspectPlayer.id, name: inspectPlayer.name } });
            }
          } catch (e) {}
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Friend request sent!', '#59BF91');
          BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
        }
      }
    }, isFriend ? '💚 Friend' : '➕ Add Friend');
  }(), function () {
    var isMuted = mutedList.includes(inspectPlayer.id);
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 0.7,
        minHeight: 44,
        padding: '0 4px',
        borderRadius: 10, /* v2.3.1235: secondary tokens */
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid rgba(229,237,233,0.20)',
        background: '#293B41',
        color: isMuted ? '#D8AA58' : '#B6C1BE'
      },
      onClick: function onClick() {
        if (isMuted) {
          var updated = mutedList.filter(function (m) {
            return m !== inspectPlayer.id;
          });
          setMutedList(updated);
          try {
            localStorage.setItem('bt_muted', JSON.stringify(updated));
          } catch (e) {}
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Unmuted', '#D8A94D');
        } else {
          var _updated2 = [].concat(_toConsumableArray(mutedList), [inspectPlayer.id]);
          setMutedList(_updated2);
          try {
            localStorage.setItem('bt_muted', JSON.stringify(_updated2));
          } catch (e) {}
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Muted', '#D8A94D');
        }
      }
    }, isMuted ? '🔇 Muted' : '🔇 Mute');
  }(), function (_ZONES$stateRef$curre, _stateRef$current39) {
    var isBlocked = blockedList.includes(inspectPlayer.id);
    var isLawless = (_ZONES$stateRef$curre = ZONES[(_stateRef$current39 = stateRef.current) === null || _stateRef$current39 === void 0 ? void 0 : _stateRef$current39.currentZone]) === null || _ZONES$stateRef$curre === void 0 ? void 0 : _ZONES$stateRef$curre.lawless;
    return /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 0.7,
        minHeight: 44,
        padding: '0 4px',
        borderRadius: 10, /* v2.3.1235: danger is an OUTLINE, never a fill */
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        border: '1px solid ' + (isBlocked ? '#D8635D' : 'rgba(229,237,233,0.20)'),
        background: isBlocked ? 'transparent' : '#293B41',
        color: isBlocked ? '#D8635D' : '#B6C1BE',
        opacity: !isBlocked && isLawless ? 0.3 : 1
      },
      onClick: function onClick() {
        if (isBlocked) {
          var updated = blockedList.filter(function (b) {
            return b !== inspectPlayer.id;
          });
          setBlockedList(updated);
          try {
            localStorage.setItem('bt_blocked', JSON.stringify(updated));
          } catch (e) {}
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Unblocked', '#59BF91');
        } else {
          if (isLawless) {
            pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Can\'t block in lawless zone!', '#D95C54');
            return;
          }
          var _updated3 = [].concat(_toConsumableArray(blockedList), [inspectPlayer.id]);
          setBlockedList(_updated3);
          try {
            localStorage.setItem('bt_blocked', JSON.stringify(_updated3));
          } catch (e) {}
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Blocked - no interactions', '#D95C54');
        }
      }
    }, isBlocked ? '🚫 Blocked' : '🚫 Block');
  }()), /* v2.3.1235: rollout micro-fix §1 — sticky 24px fade pinned to the
    visible bottom of the scroll body; visible only while content remains
    below (showFade), so reachability is signalled without a scrollbar.
    pointerEvents none — purely a visual cue. */
  /*#__PURE__*/React.createElement("div", {
    "aria-hidden": true,
    style: {
      position: 'sticky',
      bottom: 0,
      height: 24,
      marginTop: -24,
      flexShrink: 0,
      background: 'linear-gradient(180deg, rgba(30,46,52,0), #1E2E34)',
      opacity: showFade ? 1 : 0,
      transition: 'opacity 160ms ease',
      pointerEvents: 'none'
    }
  })), /* v2.3.1235: Checkpoint B — row 3 (auto, PINNED): the Trade/Duel/
    Threat action row sits outside the scroll body so it is always
    visible.
    v2.3.1744: TP is GONE (owner: "remove it", after asking what it did).
    It wrote your own x/y to the inspected player's + 40 and closed the
    card — no cost, no cooldown, no gate, and no server call at all.  The
    worker's anti-teleport speed cap (movement.js, 500 px/s + 80 px burst)
    then refused any jump long enough to be worth taking, so it worked over
    a few tiles and rubber-banded over a screen.  A convenience button whose
    behaviour depends on distance is worse than no button. */
  /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 10
    }
  }, /* v2.3.1235: action row correction — Trade is the surface's single
    gold primary (flex 1.4); Duel is a secondary; Threat is a danger
    OUTLINE, not a filled red block. Labels drop emoji per the design
    correction; the handlers are byte-identical. */
  /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1.4,
      marginTop: 0,
      minHeight: 44,
      padding: '0 4px',
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 700,
      border: '1px solid #EAC675',
      background: 'linear-gradient(180deg, #E2B765, #D2A14D)',
      color: '#172126'
    },
    onClick: function onClick() {
      /* v2.3.1132: two-sided trade window when the worker supports it
         (trade2_open handshake; both stage, both confirm, server swaps
         atomically).  The one-directional gift panel stays for old
         workers. */
      var _St2 = stateRef.current;
      if (_St2._serverCaps && _St2._serverCaps.trade2 && _St2.channel) {
        try {
          _St2.channel.send({ type: 'broadcast', event: 'trade2_open', payload: { target: inspectPlayer.id } });
        } catch (e) {}
        setInspectPlayer(null);
        return;
      }
      setTradeTarget({
        id: inspectPlayer.id,
        name: inspectPlayer.name
      });
      setTradeOffer({});
      setShowTrade(true);
      setInspectPlayer(null);
    }
  }, "Trade"), /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      marginTop: 0,
      minHeight: 44,
      padding: '0 4px',
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 700,
      border: '1px solid rgba(229,237,233,0.20)',
      background: '#293B41',
      color: '#F4F0E7'
    },
    onClick: function onClick() {
      var S = stateRef.current;
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'duel_wager_request',
        payload: {
          target: inspectPlayer.id,
          from: S.myId,
          fromName: S.myName,
          wager: 0
        }
      });
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Duel sent', '#a78bfa');
      setInspectPlayer(null);
    }
  }, "Duel"), /* ═══ v2.3.1917: THREAT IS GONE FROM THE CARD ═══
    Owner: "Also remove the option to kill other players for now."  Threat
    was the button that started a non-consensual fight: ignore it (or let
    the countdown run out) and the pair could damage each other anywhere.
    The worker refuses pvp_threat outright now (GameRoom.OPEN_PVP, and
    server/src/threat.js), so leaving the button would post a message into
    a void and light a red skull over a head nobody can act on.  Duel is
    the remaining way to fight someone, which is the point — it needs their
    yes.  The handler is kept below the flag rather than deleted so turning
    the system back on is one constant. */
  false && /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-tp",
    style: {
      flex: 1,
      marginTop: 0,
      minHeight: 44,
      padding: '0 4px',
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 700,
      border: '1px solid #D8635D', /* v2.3.1235: danger outline */
      background: 'transparent',
      color: '#D8635D'
    },
    onClick: function onClick() {
      var _S$rpg26;
      var S = stateRef.current;
      if (S._pvpThreatCdUntil && Date.now() < S._pvpThreatCdUntil) {
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Threat on cooldown', '#D95C54');
        setInspectPlayer(null);
        return;
      }
      if (S.channel) S.channel.send({
        type: 'broadcast',
        event: 'pvp_threat',
        payload: {
          target: inspectPlayer.id,
          from: S.myId,
          fromName: S.myName,
          fromLevel: ((_S$rpg26 = S.rpg) === null || _S$rpg26 === void 0 ? void 0 : _S$rpg26.level) || 1
        }
      });
      /* v2.3.1193: no longer orphaned — entityRenderer draws my own red
         skull from these anchors.  This write is OPTIMISTIC (base
         countdown, instant feedback); the relayed pvp_threat echo
         replaces it with the server's authoritative level-scaled
         countdown, or — if the server drops the threat (cooldown/
         forged) — nothing arrives and the base window just ages out. */
      S._pvpSkullType = 'red';
      S._pvpSkullUntil = Date.now() + PVP_THREAT_BASE_COUNTDOWN;
      S._pvpThreatCdUntil = Date.now() + PVP_THREAT_COOLDOWN;
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'Threat issued!', '#D95C54');
      BT_AUDIO.beep(150, 0.15, 0.2, 'sawtooth');
      setInspectPlayer(null);
    }
  }, "Threat"))));
}
