import React from 'react';
import { BT_AUDIO, CLAN_COLORS, CLAN_CREATE_COST, CLAN_LOGO_SIZE, CLAN_MAX_MEMBERS, CLAN_NAME_MAX, CLAN_TAG_MAX, CLAN_WAR_ZONES, ELEMENTS, ZONES, createClanWar } from '@/data/index.js';
import { _objectSpread, _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* ═══ ClanPanel — clan create/manage/war screen ═══ */
/* v2.3.859: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. Props:
   rpgState, clanCreateMode, setClanCreateMode, clanData, setClanData,
   setRpgState, setShowClanPanel, stateRef. CLAN_* / ELEMENTS / ZONES /
   createClanWar / BT_AUDIO + babel helpers imported (CLAN_WAR_ZONES +
   createClanWar resolved via globalThis inline; imported explicitly here
   per the no-globals rule).
   `_clanData$members(2)` are babel optional-chaining temps that were
   hoisted to BroTown's top-level var list; declared locally here
   (reassigned before each read, so byte-equivalent).
   `createDefaultClan` is a PHANTOM: it's in BroTown's `= DATA` destructure
   but defined/exported nowhere, so inline it is `undefined` (the referencing
   code path is unreachable / never actually calls it). A named ESM import
   would hard-fail rollup, so it's declared as an undefined local to mirror
   the original behavior byte-for-byte. */
export function ClanPanel(props) {
  var rpgState = props.rpgState,
    clanCreateMode = props.clanCreateMode,
    setClanCreateMode = props.setClanCreateMode,
    clanData = props.clanData,
    setClanData = props.setClanData,
    setRpgState = props.setRpgState,
    setShowClanPanel = props.setShowClanPanel,
    stateRef = props.stateRef;
  var _clanData$members, _clanData$members2;
  var createDefaultClan; /* phantom: undefined in BroTown too — see header */
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      setShowClanPanel(false);
      setClanCreateMode(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 320,
      maxHeight: '80vh',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      setShowClanPanel(false);
      setClanCreateMode(false);
    }
  }, "\u2715"), !clanData && !clanCreateMode && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#a78bfa',
      marginBottom: 8
    }
  }, "\uD83C\uDFF0 Clans"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 12,
      lineHeight: 1.5
    }
  }, "Clans are groups of up to ", CLAN_MAX_MEMBERS, " players. Create one with a custom name, tag, and pixel logo that shows above your head."), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '10px',
      borderRadius: 8,
      border: 'none',
      fontSize: 12,
      fontWeight: 800,
      background: '#a78bfa',
      color: '#fff',
      cursor: 'pointer',
      marginBottom: 8
    },
    onClick: function onClick() {
      return setClanCreateMode(true);
    }
  }, "\uD83C\uDFF0 Create Clan (", CLAN_CREATE_COST, "g)"), (function () {
    /* v2.3.1125: incoming invite acceptance.  clan_invite broadcasts
       used to go nowhere -- no client handler existed, so joining a
       clan was impossible.  gameEvents now parks the invite on
       S._pendingClanInvite; this button sends the server-validated
       clan_join_accept (clans.md).  Registry-capable workers echo
       clan_state on success. */
    var _inv = stateRef.current._pendingClanInvite;
    if (!_inv || Date.now() - _inv.ts > 120000) return null;
    return /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        padding: '10px',
        borderRadius: 8,
        border: '1px solid #59BF91',
        fontSize: 12,
        fontWeight: 800,
        background: 'rgba(89,191,145,.15)',
        color: '#59BF91',
        cursor: 'pointer',
        marginBottom: 8
      },
      onClick: function onClick() {
        var S = stateRef.current;
        if (S.channel) S.channel.send({
          type: 'broadcast',
          event: 'clan_join_accept',
          payload: { inviter: _inv.inviter }
        });
        S._pendingClanInvite = null;
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Joining [' + _inv.clanTag + ']...', '#59BF91');
      }
    }, "\u2705 Accept invite: [", _inv.clanTag, "] ", _inv.clanName, " (from ", _inv.fromName, ")");
  })(), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)'
    }
  }, "To join a clan, have a clan member invite you by tapping your character.")), !clanData && clanCreateMode && function () {
    var nameRef = React.createRef();
    var tagRef = React.createRef();
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: '#a78bfa',
        marginBottom: 8
      }
    }, "\uD83C\uDFF0 Create Clan"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: 'rgba(255,255,255,.5)',
        marginBottom: 3
      }
    }, "Clan Name"), /*#__PURE__*/React.createElement("input", {
      ref: nameRef,
      maxLength: CLAN_NAME_MAX,
      placeholder: "My Awesome Clan",
      style: {
        width: '100%',
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.06)',
        color: '#fff',
        fontSize: 11,
        outline: 'none',
        boxSizing: 'border-box'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: 'rgba(255,255,255,.5)',
        marginBottom: 3
      }
    }, "Clan Tag (max ", CLAN_TAG_MAX, " chars)"), /*#__PURE__*/React.createElement("input", {
      ref: tagRef,
      maxLength: CLAN_TAG_MAX,
      placeholder: "CLAN",
      style: {
        width: '100%',
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.06)',
        color: '#fff',
        fontSize: 11,
        outline: 'none',
        boxSizing: 'border-box',
        textTransform: 'uppercase'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 1,
        padding: '10px',
        borderRadius: 8,
        border: 'none',
        fontSize: 11,
        fontWeight: 800,
        background: rpgState.coins >= CLAN_CREATE_COST ? '#a78bfa' : 'rgba(255,255,255,.08)',
        color: rpgState.coins >= CLAN_CREATE_COST ? '#fff' : 'rgba(255,255,255,.3)',
        cursor: 'pointer'
      },
      onClick: function onClick() {
        var _nameRef$current, _tagRef$current;
        var name = (_nameRef$current = nameRef.current) === null || _nameRef$current === void 0 || (_nameRef$current = _nameRef$current.value) === null || _nameRef$current === void 0 ? void 0 : _nameRef$current.trim();
        var tag = (_tagRef$current = tagRef.current) === null || _tagRef$current === void 0 || (_tagRef$current = _tagRef$current.value) === null || _tagRef$current === void 0 || (_tagRef$current = _tagRef$current.trim()) === null || _tagRef$current === void 0 ? void 0 : _tagRef$current.toUpperCase();
        if (!name || name.length < 3) {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Name too short (min 3)', '#D95C54');
          return;
        }
        if (!tag || tag.length < 1) {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Need a clan tag', '#D95C54');
          return;
        }
        var R = stateRef.current.rpg;
        if (R.coins < CLAN_CREATE_COST) {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Need ' + CLAN_CREATE_COST + 'g', '#D95C54');
          return;
        }
        /* v2.3.1125: registry-capable workers own clan creation -- the
           server validates name/tag uniqueness, debits the 500g, and
           echoes clan_state (which gameEvents caches to S._clanData +
           bt_clan).  The local debit+mint below is the legacy-worker
           path only. */
        if (stateRef.current._serverCaps && stateRef.current._serverCaps.clans) {
          if (stateRef.current.channel) stateRef.current.channel.send({
            type: 'broadcast',
            event: 'clan_create',
            payload: {
              name: name,
              tag: tag,
              color1: CLAN_COLORS[2],
              color2: CLAN_COLORS[3]
            }
          });
          setClanCreateMode(false);
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 40, 'Founding [' + tag + ']...', '#a78bfa');
          return;
        }
        R.coins -= CLAN_CREATE_COST;
        var newClan = createDefaultClan(name, tag, CLAN_COLORS[2], CLAN_COLORS[3], stateRef.current.myId);
        setClanData(newClan);
        stateRef.current._clanData = newClan;
        setClanCreateMode(false);
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 40, 'Clan [' + tag + '] Created!', '#a78bfa');
        BT_AUDIO.levelUp();
        setRpgState(_objectSpread({}, R));
        try {
          localStorage.setItem('bt_clan', JSON.stringify(newClan));
        } catch (e) {}
      }
    }, "Create (", CLAN_CREATE_COST, "g)"), /*#__PURE__*/React.createElement("button", {
      style: {
        flex: 0.5,
        padding: '10px',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,.15)',
        background: 'rgba(255,255,255,.06)',
        color: 'rgba(255,255,255,.6)',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer'
      },
      onClick: function onClick() {
        return setClanCreateMode(false);
      }
    }, "Cancel")));
  }(), clanData && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      border: '1px solid rgba(255,255,255,.15)',
      borderRadius: 4,
      overflow: 'hidden',
      background: 'rgba(0,0,0,.3)',
      position: 'relative'
    }
  }, clanData.logo && function () {
    var px3 = 40 / CLAN_LOGO_SIZE;
    return clanData.logo.map(function (row, ri) {
      return row.map(function (ci, ci2) {
        if (ci < 0) return null;
        return /*#__PURE__*/React.createElement("div", {
          key: ri + '-' + ci2,
          style: {
            position: 'absolute',
            left: ci2 * px3,
            top: ri * px3,
            width: px3 + 0.5,
            height: px3 + 0.5,
            background: CLAN_COLORS[ci] || '#fff'
          }
        });
      });
    });
  }()), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: '#a78bfa'
    }
  }, "[", clanData.tag, "] ", clanData.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)'
    }
  }, ((_clanData$members = clanData.members) === null || _clanData$members === void 0 ? void 0 : _clanData$members.length) || 1, "/", CLAN_MAX_MEMBERS, " members \xB7 Lv", clanData.clanLevel || 1))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 4
    }
  }, "\uD83C\uDFA8 Logo Editor"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 2,
      marginBottom: 4,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    key: "eraser",
    style: {
      width: 16,
      height: 16,
      borderRadius: 3,
      cursor: 'pointer',
      border: stateRef.current._clanPaintColor === -1 ? '2px solid #fff' : '1px solid rgba(255,255,255,.2)',
      background: 'repeating-conic-gradient(rgba(255,255,255,.1) 0% 25%, transparent 0% 50%) 50% / 8px 8px'
    },
    onClick: function onClick() {
      stateRef.current._clanPaintColor = -1;
      setRpgState(_objectSpread({}, rpgState));
    }
  }), CLAN_COLORS.map(function (c, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        width: 16,
        height: 16,
        borderRadius: 3,
        background: c,
        cursor: 'pointer',
        border: stateRef.current._clanPaintColor === i ? '2px solid #fff' : '1px solid rgba(255,255,255,.15)'
      },
      onClick: function onClick() {
        stateRef.current._clanPaintColor = i;
        setRpgState(_objectSpread({}, rpgState));
      }
    });
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-grid',
      gridTemplateColumns: "repeat(".concat(CLAN_LOGO_SIZE, ",1fr)"),
      gap: 1,
      background: 'rgba(255,255,255,.08)',
      padding: 2,
      borderRadius: 4
    }
  }, clanData.logo.map(function (row, ri) {
    return row.map(function (ci, ci2) {
      return /*#__PURE__*/React.createElement("div", {
        key: ri + '-' + ci2,
        style: {
          width: 24,
          height: 24,
          cursor: 'pointer',
          borderRadius: 1,
          background: ci >= 0 ? CLAN_COLORS[ci] || '#fff' : 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.06)'
        },
        onClick: function onClick() {
          var _stateRef$current$_cl;
          var paint = (_stateRef$current$_cl = stateRef.current._clanPaintColor) !== null && _stateRef$current$_cl !== void 0 ? _stateRef$current$_cl : 0;
          var newLogo = clanData.logo.map(function (r) {
            return _toConsumableArray(r);
          });
          newLogo[ri][ci2] = paint;
          var updated = _objectSpread(_objectSpread({}, clanData), {}, {
            logo: newLogo
          });
          setClanData(updated);
          stateRef.current._clanData = updated;
          try {
            localStorage.setItem('bt_clan', JSON.stringify(updated));
          } catch (e) {}
        },
        onMouseDown: function onMouseDown() {
          stateRef.current._clanPainting = true;
        },
        onMouseEnter: function onMouseEnter() {
          var _stateRef$current$_cl2;
          if (!stateRef.current._clanPainting) return;
          var paint = (_stateRef$current$_cl2 = stateRef.current._clanPaintColor) !== null && _stateRef$current$_cl2 !== void 0 ? _stateRef$current$_cl2 : 0;
          var newLogo = clanData.logo.map(function (r) {
            return _toConsumableArray(r);
          });
          newLogo[ri][ci2] = paint;
          var updated = _objectSpread(_objectSpread({}, clanData), {}, {
            logo: newLogo
          });
          setClanData(updated);
          stateRef.current._clanData = updated;
        }
      });
    });
  })), /*#__PURE__*/React.createElement("div", {
    onMouseUp: function onMouseUp() {
      stateRef.current._clanPainting = false;
    },
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '3px 8px',
      borderRadius: 4,
      fontSize: 7,
      fontWeight: 700,
      cursor: 'pointer',
      border: '1px solid rgba(217,92,84,.3)',
      background: 'rgba(217,92,84,.1)',
      color: '#D95C54'
    },
    onClick: function onClick() {
      var cleared = _objectSpread(_objectSpread({}, clanData), {}, {
        logo: Array(CLAN_LOGO_SIZE).fill(null).map(function () {
          return Array(CLAN_LOGO_SIZE).fill(-1);
        })
      });
      setClanData(cleared);
      stateRef.current._clanData = cleared;
      try {
        localStorage.setItem('bt_clan', JSON.stringify(cleared));
      } catch (e) {}
    }
  }, "Clear Logo"), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: '3px 8px',
      borderRadius: 4,
      fontSize: 7,
      fontWeight: 700,
      cursor: 'pointer',
      border: '1px solid rgba(61,220,151,.3)',
      background: 'rgba(61,220,151,.1)',
      color: '#59BF91'
    },
    onClick: function onClick() {
      try {
        localStorage.setItem('bt_clan', JSON.stringify(clanData));
      } catch (e) {}
      pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Logo saved!', '#a78bfa');
      BT_AUDIO.collect();
    }
  }, "Save Logo"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: 'rgba(255,255,255,.5)',
      marginBottom: 3
    }
  }, "Members (", ((_clanData$members2 = clanData.members) === null || _clanData$members2 === void 0 ? void 0 : _clanData$members2.length) || 1, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 8
    }
  }, (clanData.members || []).map(function (m, i) {
    var _stateRef$current29;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '2px 0',
        borderBottom: '1px solid rgba(255,255,255,.05)'
      }
    }, m === ((_stateRef$current29 = stateRef.current) === null || _stateRef$current29 === void 0 ? void 0 : _stateRef$current29.myId) ? '⭐ You (Founder)' : m);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      marginBottom: 8,
      padding: 8,
      borderRadius: 8,
      background: 'rgba(217,92,84,.05)',
      border: '1px solid rgba(217,92,84,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: '#D95C54',
      marginBottom: 4
    }
  }, "\u2694\uFE0F Clan Wars"), stateRef.current._activeClanWar ? function (_ZONES$war$zone4, _ZONES$war$zone5) {
    var war = stateRef.current._activeClanWar;
    var timeLeft = Math.max(0, Math.ceil((war.endTime - Date.now()) / 60000));
    var isChallenger = war.challenger.tag === clanData.tag;
    var us = isChallenger ? war.challenger : war.defender;
    var them = isChallenger ? war.defender : war.challenger;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: us.color || '#D8A85F'
      }
    }, "[", us.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: '#fff'
      }
    }, us.score)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: 'rgba(255,255,255,.3)',
        fontWeight: 700
      }
    }, "VS"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: them.color || '#D95C54'
      }
    }, "[", them.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: '#fff'
      }
    }, them.score))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: 'rgba(255,255,255,.3)',
        textAlign: 'center'
      }
    }, ((_ZONES$war$zone4 = ZONES[war.zone]) === null || _ZONES$war$zone4 === void 0 ? void 0 : _ZONES$war$zone4.name) || war.zone, " \xB7 ", timeLeft, "m remaining \xB7 ", war.killLog.length, " kills"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.2)',
        textAlign: 'center',
        marginTop: 2
      }
    }, "Travel to ", (_ZONES$war$zone5 = ZONES[war.zone]) === null || _ZONES$war$zone5 === void 0 ? void 0 : _ZONES$war$zone5.name, " to fight! PvP kills score points."), war.killLog.slice(-3).reverse().map(function (k, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          fontSize: 7,
          color: 'rgba(255,255,255,.2)',
          textAlign: 'center'
        }
      }, k.killer, " defeated ", k.victim, " (+", k.points, "pts)");
    }));
  }() : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: 'rgba(255,255,255,.3)',
      marginBottom: 4
    }
  }, "Challenge another clan to a 30-minute PvP battle in a zone. Most kills wins!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Battle Zone"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, CLAN_WAR_ZONES.map(function (zId) {
    var _ELEMENTS$z$element, _ELEMENTS$z$element2, _ELEMENTS$z$element3;
    var z = ZONES[zId];
    var sel = stateRef.current._warZone === zId;
    return /*#__PURE__*/React.createElement("button", {
      key: zId,
      onClick: function onClick() {
        stateRef.current._warZone = zId;
        setRpgState(_objectSpread({}, rpgState));
      },
      style: {
        padding: '2px 5px',
        borderRadius: 3,
        fontSize: 7,
        fontWeight: 700,
        border: '1px solid ' + (sel ? (((_ELEMENTS$z$element = ELEMENTS[z.element]) === null || _ELEMENTS$z$element === void 0 ? void 0 : _ELEMENTS$z$element.color) || '#D8A85F') + '60' : 'rgba(255,255,255,.06)'),
        background: sel ? (((_ELEMENTS$z$element2 = ELEMENTS[z.element]) === null || _ELEMENTS$z$element2 === void 0 ? void 0 : _ELEMENTS$z$element2.color) || '#D8A85F') + '15' : 'transparent',
        color: sel ? ((_ELEMENTS$z$element3 = ELEMENTS[z.element]) === null || _ELEMENTS$z$element3 === void 0 ? void 0 : _ELEMENTS$z$element3.color) || '#D8A85F' : 'rgba(255,255,255,.25)',
        cursor: 'pointer'
      }
    }, z.name);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      fontWeight: 700,
      color: 'rgba(255,255,255,.4)',
      marginBottom: 2
    }
  }, "Target Clan"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginBottom: 6
    }
  }, function () {
    var S = stateRef.current;
    var otherClans = {};
    Object.entries(S.others).forEach(function (_ref147) {
      var _o$rpgData;
      var _ref148 = _slicedToArray(_ref147, 2),
        id = _ref148[0],
        o = _ref148[1];
      var ct = (_o$rpgData = o.rpgData) === null || _o$rpgData === void 0 ? void 0 : _o$rpgData.clanTag;
      if (ct && ct !== clanData.tag && !otherClans[ct]) {
        var _o$rpgData2, _o$rpgData3;
        otherClans[ct] = {
          tag: ct,
          name: ((_o$rpgData2 = o.rpgData) === null || _o$rpgData2 === void 0 ? void 0 : _o$rpgData2.clanName) || ct,
          color: ((_o$rpgData3 = o.rpgData) === null || _o$rpgData3 === void 0 ? void 0 : _o$rpgData3.clanColor1) || '#888'
        };
      }
    });
    var clans = Object.values(otherClans);
    if (clans.length === 0) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 7,
        color: 'rgba(255,255,255,.15)',
        fontStyle: 'italic'
      }
    }, "No other clans online");
    return clans.map(function (c) {
      var sel = S._warTarget === c.tag;
      return /*#__PURE__*/React.createElement("button", {
        key: c.tag,
        onClick: function onClick() {
          S._warTarget = c.tag;
          S._warTargetData = c;
          setRpgState(_objectSpread({}, rpgState));
        },
        style: {
          padding: '3px 6px',
          borderRadius: 4,
          fontSize: 8,
          fontWeight: 700,
          border: '1.5px solid ' + (sel ? '#D95C54' : 'rgba(255,255,255,.08)'),
          background: sel ? 'rgba(217,92,84,.12)' : 'rgba(255,255,255,.02)',
          color: sel ? '#D95C54' : 'rgba(255,255,255,.4)',
          cursor: 'pointer'
        }
      }, "[", c.tag, "] ", c.name);
    });
  }()), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      var _ZONES$zone;
      var S = stateRef.current;
      var zone = S._warZone || CLAN_WAR_ZONES[0];
      var target = S._warTargetData;
      if (!target) {
        pushDmgPopup(S, S.player.x, S.player.y - 30, 'Select a target clan!', '#D95C54');
        return;
      }
      /* v2.3.1125: referee-capable workers BUILD the war themselves
         (authoritative id/clock/scores) and broadcast it back in this
         same shape -- setting a local war object here would leave this
         client tracking a war id the server's clan_war_kill events
         never match.  Send the declare and let the echo set
         S._activeClanWar (gameEvents challenger branch). */
      if (S._serverCaps && S._serverCaps.clans) {
        if (S.channel) S.channel.send({
          type: 'broadcast',
          event: 'clan_war_declare',
          payload: {
            defenderTag: target.tag,
            zone: zone
          }
        });
      } else {
        var war = createClanWar(clanData, target, zone);
        /* Add self to war */
        war.challenger.members.push(S.myId);
        S._activeClanWar = war;
        /* Broadcast war declaration */
        if (S.channel) S.channel.send({
          type: 'broadcast',
          event: 'clan_war_declare',
          payload: {
            war: war,
            challengerTag: clanData.tag,
            defenderTag: target.tag
          }
        });
      }
      pushDmgPopup(S, S.player.x, S.player.y - 40, 'WAR DECLARED vs [' + target.tag + ']!', '#D95C54');
      pushDmgPopup(S, S.player.x, S.player.y - 25, 'Battle zone: ' + ((_ZONES$zone = ZONES[zone]) === null || _ZONES$zone === void 0 ? void 0 : _ZONES$zone.name), 'rgba(255,255,255,.5)');
      BT_AUDIO.beep(200, 0.15, 0.2, 'sawtooth');
      setTimeout(function () {
        return BT_AUDIO.beep(150, 0.2, 0.25, 'sawtooth');
      }, 100);
      S.screenShake = 6;
      setRpgState(_objectSpread({}, rpgState));
    },
    style: {
      width: '100%',
      padding: '8px 0',
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 800,
      border: '1.5px solid rgba(217,92,84,.4)',
      background: 'rgba(217,92,84,.15)',
      color: '#D95C54',
      cursor: 'pointer'
    }
  }, "\u2694\uFE0F Declare War"))), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '6px',
      borderRadius: 6,
      fontSize: 9,
      fontWeight: 700,
      cursor: 'pointer',
      border: '1px solid rgba(217,92,84,.3)',
      background: 'rgba(217,92,84,.08)',
      color: '#D95C54'
    },
    onClick: function onClick() {
      setClanData(null);
      stateRef.current._clanData = null;
      try {
        localStorage.removeItem('bt_clan');
      } catch (e) {}
      pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, 'Left clan', '#D95C54');
    }
  }, "Leave Clan"))));
}
