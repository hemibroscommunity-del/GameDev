import React from 'react';
import { BT_AUDIO, CLAN_COLORS, CLAN_CREATE_COST, CLAN_LOGO_SIZE, CLAN_MAX_MEMBERS, CLAN_NAME_MAX, CLAN_TAG_MAX, CLAN_WAR_ZONES, ELEMENTS, ZONES, createClanWar } from '@/data/index.js';
import { _objectSpread, _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
import { clanPartyOn } from '@/game/alliance.js';   /* v2.3.3321: clans are parties now */
import { act } from '@/game/actions.js';   /* v2.3.5190: the page's requests leave through the action door (card K PR 7) */
import { SAY } from '@/data/say/clan.js';   /* v2.3.6329: its words, in the one table (docs/specs/player-words.md, W1) */
import { say } from '@/game/say.js';
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
/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) —
   presentation only: every clan op (create / accept invite / paint /
   save / declare war / leave) keeps its exact handler and conditionals.
   Create Clan is the region's one brass primary; Declare War / Leave
   Clan use the destructive language; war-zone + target chips follow the
   32px pill spec (brass-fill selection instead of per-element colors);
   inputs move onto #111E23 wells. */

/* v2.3.1235: batch-2 rollout — correction-pass compliance
   (docs/LANTERN-SLATE-SPEC.md + game.css :root). Presentation only,
   every clan handler byte-identical. v2.3.1232 tokens remapped onto
   the approved v2.3.1235 set (sheet #1E2E34, raised #293B41, well
   #111E23, well-deep #0B161B, text #F4F0E7/#B6C1BE/#8D9B98, faint
   #667875, lines rgba(229,237,233,.11/.20), brass #D8AA58, brass-soft,
   danger #D8635D); primaries adopt the shared .button-primary class;
   Declare War becomes a danger OUTLINE like Leave Clan (filled red is
   never a routine action); chrome emoji dropped (✅/⭐/⚔️ — clan logo
   pixels and element dots are game data and stay); chips gain 44px
   transparent hit wrappers (mobile-dash chipHit pattern); maxHeight
   caps at the .bt-inspect content box. */

/* v2.3.1232: Lantern Slate style tokens — local, no shared module. */
/* v2.3.1235: batch-2 rollout — sheet surface, strong hairline and the
   shared .ui-panel shadow recipe for the floating modal card. */
var LS_CARD = {
  background: '#1E2E34',
  border: '1px solid rgba(229,237,233,.20)',
  borderRadius: 14,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045), 0 14px 36px rgba(3,8,10,0.30)',
  textAlign: 'left'
};
/* v2.3.1235: batch-2 rollout — section headers are 11/700 uppercase
   .14em muted per the locked contract. */
var LS_HEADER = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.14em',
  color: '#8D9B98'
};
var LS_DIVIDER = '1px solid rgba(229,237,233,.11)'; /* v2.3.1235: batch-2 rollout — hairline token */
/* v2.3.1235: batch-2 rollout — LAYOUT ONLY: the gold look now comes from
   the shared .button-primary class (game.css) so this file mints no
   gradient of its own; one gold primary per surface. */
var LS_PRIMARY = {
  width: '100%',
  minHeight: 44,
  padding: '0 12px',
  fontSize: 13
};
/* v2.3.1235: batch-2 rollout — secondary = raised fill + strong
   hairline, 10px button radius. */
var LS_SECONDARY = {
  minHeight: 44,
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid rgba(229,237,233,.20)',
  background: '#293B41',
  color: '#F4F0E7',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer'
};
/* v2.3.1235: batch-2 rollout — inputs sit on the well with a strong
   hairline; brass-highlight caret. */
var LS_INPUT = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid rgba(229,237,233,.20)',
  background: '#111E23',
  color: '#F4F0E7',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  caretColor: '#EAC675'
};
/* selectable 32px pill chip (selected = brass-soft fill + brass label) */
/* v2.3.1235: batch-2 rollout — brass-soft token replaces the old
   #3B3427 accent-fill; line/muted tokens for the idle state. */
var lsChip = function lsChip(sel) {
  return {
    minHeight: 32,
    boxSizing: 'border-box',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid ' + (sel ? '#D8AA58' : 'rgba(229,237,233,.11)'),
    background: sel ? 'rgba(216,170,88,.15)' : 'transparent',
    color: sel ? '#D8AA58' : '#8D9B98',
    cursor: 'pointer'
  };
};
/* v2.3.1235: batch-2 rollout — 44px transparent hit wrapper for the
   32px chip visuals (contract: every interactive element ≥44×44; same
   chipHit pattern as src/ui/mobile/dash/EncyclopediaPanel.jsx). */
var LS_CHIPHIT = {
  flex: '0 0 auto',
  minHeight: 44,
  padding: 0,
  margin: 0,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center'
};
/* v2.3.1232: UI-Bible icon with emoji fallback (onError replaceWith
   pattern from src/ui/mobile/dash/SkillsPanel.jsx) */
var lsIcon = function lsIcon(src, emoji, size) {
  return React.createElement('img', {
    src: src,
    alt: '',
    draggable: false,
    style: { width: size || 18, height: size || 18, objectFit: 'contain', flex: 'none' },
    onError: function (e) { e.currentTarget.replaceWith(document.createTextNode(emoji)); }
  });
};
var lsTitleRow = function lsTitleRow(label) {
  return React.createElement('div', {
    style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, minHeight: 24 }
  }, lsIcon('/icons/ui/panel-clan.webp?v=2.3.1232', '🏰', 20), React.createElement('span', {
    style: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: '#F4F0E7' }
  }, label));
};

export function ClanPanel(props) {
  var rpgState = props.rpgState,
    clanCreateMode = props.clanCreateMode,
    setClanCreateMode = props.setClanCreateMode,
    clanData = props.clanData,
    setClanData = props.setClanData,
    setRpgState = props.setRpgState,
    setShowClanPanel = props.setShowClanPanel,
    stateRef = props.stateRef;
  /* ═══ v2.3.2289: LEAVING ARMS BEFORE IT FIRES ═══
     Leave Clan was one tap and irreversible from the player's side: it drops
     clanData, clears the bt_clan cache and walks you out, with no undo and no
     way back in without an invite.  Same second-tap gate as the forge's
     salvage, for the same reason and in the same shape -- see the note there.
     Expires after 4s so an armed button does not sit waiting for a later
     stray tap. */
  var _lv = React.useState(false);
  var leaveArmed = _lv[0],
    setLeaveArmed = _lv[1];
  React.useEffect(function () {
    if (!leaveArmed) return undefined;
    var t = setTimeout(function () {
      setLeaveArmed(false);
    }, 4000);
    return function () {
      clearTimeout(t);
    };
  }, [leaveArmed]);
  /* ═══ v2.3.3321: CLANS ARE PARTIES NOW (server clanparty.js) ═══
     Against a worker with caps.clanparty no clan can be made, joined or taken
     to war, and every clan has become a party -- so this window, wherever it
     is opened from (the Guild Hall, the dashboard, a stale menu), says so and
     opens the player list, where a party starts.  After the hooks above, so
     their order never changes. */
  if (clanPartyOn(stateRef && stateRef.current)) {
    var _closeCp = function () { setShowClanPanel(false); setClanCreateMode(false); };
    return React.createElement("div", { className: "bt-inspect", onClick: _closeCp },
      React.createElement("div", {
        className: "bt-inspect-card", "data-panel": "clan", "data-clanparty": "1",
        onClick: function (e) { e.stopPropagation(); },
        style: Object.assign({}, LS_CARD, { width: 'min(360px, calc(100vw - 24px))', maxHeight: 'min(80vh, 100%)', overflowY: 'auto', padding: 16 })
      },
      React.createElement("button", { className: "bt-inspect-close", onClick: _closeCp }, "✕"),
      lsTitleRow(say(SAY, 'clan.partyTitle')),
      React.createElement("div", { style: { fontSize: 13, color: '#B6C1BE', marginBottom: 14, lineHeight: 1.5 } },
        say(SAY, 'clan.partyAbout')),
      React.createElement("button", {
        className: "button-primary", "data-clanparty-find": "",
        style: Object.assign({}, LS_PRIMARY, { marginBottom: 8 }),
        onClick: function () { _closeCp(); var ui = typeof window !== 'undefined' ? window.__broLegacyUI : null; if (ui && typeof ui.playersOpen === 'function') ui.playersOpen(); }
      }, /* v2.3.3481: the 2026-10-19 UI review -- "Find a party" -> "Invite a
            player": it opens the player list, where you invite someone (the
            worker refuses an invite to anyone already in a party) */
      say(SAY, 'clan.invitePlayer')),
      React.createElement("button", { style: Object.assign({}, LS_SECONDARY, { width: '100%' }), onClick: _closeCp }, say(SAY, 'clan.close'))));
  }
  var _clanData$members, _clanData$members2;
  var createDefaultClan; /* phantom: undefined in BroTown too — see header */
  /* v2.3.1614: A SERVER-CREATED CLAN HAS NO LOGO, and this panel used to
     assume one.  clans.js stores `logo: Array.isArray(payload.logo) ? … : null`
     and clan_create never sends one, so the clan_state echo (and therefore the
     bt_clan cache the boot path restores from) carries `logo: null` — while the
     logo editor below did a bare `clanData.logo.map(...)`.  That threw
     "Cannot read properties of null (reading 'map')", which in React means the
     WHOLE TREE UNMOUNTS: blank screen, WebGL context lost, game over until
     reload.  It was reachable before v2.3.1611 too — found a clan, reload, open
     the panel — and the v2.3.1611 echo makes it immediate, so it is fixed here
     in the same change.  The display badge above keeps its own `clanData.logo &&`
     guard; the EDITOR needs a real paintable grid, so give it an empty one
     (-1 = blank cell, the same value the display treats as transparent). */
  var logoGrid = (clanData && Array.isArray(clanData.logo)) ? clanData.logo
    : Array.from({ length: CLAN_LOGO_SIZE }, function () {
      return new Array(CLAN_LOGO_SIZE).fill(-1);
    });
  /* v2.3.2301: is this player the last one in? Read from the SERVER-truth
     roster (clan_state -> S._clanData -> clanData), never from a local guess:
     the server dissolves a clan whose last member leaves, and the armed Leave
     label has to say "DISBAND" in exactly the case the server will delete.
     `|| 1` matches every other members.length read in this file -- a clan you
     are in always contains at least you, even before the roster arrives. */
  var soloInClan = !!clanData && (((clanData.members || []).length || 1) <= 1);
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      setShowClanPanel(false);
      setClanCreateMode(false);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    "data-panel": "clan" /* v2.3.3066: opened from the Wheel's Guild Hall (mp-wheelhalls) */,
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: Object.assign({}, LS_CARD, {
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 320 fixed — fill narrow phones, never overflow */
      /* v2.3.1235: batch-2 rollout — also cap at 100% of the .bt-inspect
         content box (it reserves dashboard clearance); a bare 80vh can
         exceed the box on short phones and slide under the band. */
      maxHeight: 'min(80vh, 100%)',
      overflowY: 'auto',
      padding: 16
    })
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      setShowClanPanel(false);
      setClanCreateMode(false);
    }
  }, "✕"), !clanData && !clanCreateMode && /*#__PURE__*/React.createElement(React.Fragment, null, lsTitleRow(say(SAY, 'clan.clansTitle')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13 /* v2.3.1235: batch-2 rollout — body 13, no half-sizes */,
      color: '#B6C1BE',
      marginBottom: 14,
      lineHeight: 1.5
    }
  }, say(SAY, 'clan.clansAbout', { max: CLAN_MAX_MEMBERS })), /*#__PURE__*/React.createElement("button", {
    className: "button-primary" /* v2.3.1235: batch-2 rollout — shared gold primary, the surface's only one */,
    style: Object.assign({}, LS_PRIMARY, {
      marginBottom: 8
    }),
    onClick: function onClick() {
      return setClanCreateMode(true);
    }
  }, say(SAY, 'clan.createButton', { cost: CLAN_CREATE_COST })), (function () {
    /* v2.3.1125: incoming invite acceptance.  clan_invite broadcasts
       used to go nowhere -- no client handler existed, so joining a
       clan was impossible.  gameEvents now parks the invite on
       S._pendingClanInvite; this button sends the server-validated
       clan_join_accept (clans.md).  Registry-capable workers echo
       clan_state on success. */
    var _inv = stateRef.current._pendingClanInvite;
    if (!_inv || Date.now() - _inv.ts > 120000) return null;
    return /*#__PURE__*/React.createElement("button", {
      style: Object.assign({}, LS_SECONDARY, {
        width: '100%',
        color: '#55B98A' /* v2.3.1235: batch-2 rollout — positive token */,
        marginBottom: 8
      }),
      onClick: function onClick() {
        var S = stateRef.current;
        if (S.channel) act('clan_join_accept', { inviter: _inv.inviter });   /* v2.3.5190: through the action door (actions.js) */
        S._pendingClanInvite = null;
        pushDmgPopup(S, S.player.x, S.player.y - 30, say(SAY, 'clan.joining', { tag: _inv.clanTag }), '#59BF91');
      }
    }, say(SAY, 'clan.acceptInvite', { tag: _inv.clanTag, clan: _inv.clanName, from: _inv.fromName })); /* v2.3.1235: batch-2 rollout — ✅ dropped, no emoji in chrome */
  })(), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12 /* v2.3.1235: batch-2 rollout — descriptive copy floor is 12 */,
      color: '#8D9B98',
      lineHeight: 1.4
    }
  }, say(SAY, 'clan.howToJoin'))), !clanData && clanCreateMode && function () {
    var nameRef = React.createRef();
    var tagRef = React.createRef();
    return /*#__PURE__*/React.createElement(React.Fragment, null, lsTitleRow(say(SAY, 'clan.createTitle')), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6
      })
    }, say(SAY, 'clan.nameLabel')), /*#__PURE__*/React.createElement("input", {
      ref: nameRef,
      maxLength: CLAN_NAME_MAX,
      placeholder: say(SAY, 'clan.namePlaceholder'),
      style: LS_INPUT
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: Object.assign({}, LS_HEADER, {
        marginBottom: 6
      })
    }, say(SAY, 'clan.tagLabel', { max: CLAN_TAG_MAX })), /*#__PURE__*/React.createElement("input", {
      ref: tagRef,
      maxLength: CLAN_TAG_MAX,
      placeholder: say(SAY, 'clan.tagPlaceholder'),
      style: Object.assign({}, LS_INPUT, {
        textTransform: 'uppercase'
      })
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      /* v2.3.1235: batch-2 rollout — shared gold primary (the surface's
         only one); when unaffordable the inline overrides flatten it to
         the raised/disabled tokens instead of minting a third look. */
      className: "button-primary",
      style: Object.assign({
        flex: 1,
        minHeight: 44,
        padding: '0 12px',
        fontSize: 13
      }, rpgState.coins >= CLAN_CREATE_COST ? null : {
        background: '#293B41',
        border: '1px solid rgba(229,237,233,.11)',
        boxShadow: 'none',
        color: '#667875'
      }),
      onClick: function onClick() {
        var _nameRef$current, _tagRef$current;
        var name = (_nameRef$current = nameRef.current) === null || _nameRef$current === void 0 || (_nameRef$current = _nameRef$current.value) === null || _nameRef$current === void 0 ? void 0 : _nameRef$current.trim();
        var tag = (_tagRef$current = tagRef.current) === null || _tagRef$current === void 0 || (_tagRef$current = _tagRef$current.value) === null || _tagRef$current === void 0 || (_tagRef$current = _tagRef$current.trim()) === null || _tagRef$current === void 0 ? void 0 : _tagRef$current.toUpperCase();
        if (!name || name.length < 3) {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, say(SAY, 'clan.nameShort'), '#D95C54');
          return;
        }
        if (!tag || tag.length < 1) {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, say(SAY, 'clan.needTag'), '#D95C54');
          return;
        }
        var R = stateRef.current.rpg;
        if (R.coins < CLAN_CREATE_COST) {
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, say(SAY, 'clan.needGold', { cost: CLAN_CREATE_COST }), '#D95C54');
          return;
        }
        /* v2.3.1125: registry-capable workers own clan creation -- the
           server validates name/tag uniqueness, debits the 500g, and
           echoes clan_state (which gameEvents caches to S._clanData +
           bt_clan).  The local debit+mint below is the legacy-worker
           path only. */
        if (stateRef.current._serverCaps && stateRef.current._serverCaps.clans) {
          if (stateRef.current.channel) act('clan_create', {   /* v2.3.5190: through the action door (actions.js) */
            name: name,
            tag: tag,
            color1: CLAN_COLORS[2],
            color2: CLAN_COLORS[3]
          });
          setClanCreateMode(false);
          pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 40, say(SAY, 'clan.founding', { tag: tag }), '#a78bfa');
          return;
        }
        /* v2.3.4912: the page's own founding (its own 500g debit and a clan
           only this page knew) for a worker without caps.clans is gone: gold
           is the worker's (CLAUDE.md §5), so such a worker founds none.  (It
           threw anyway, after the debit: createDefaultClan is the phantom
           above.) */
        pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 40, say(SAY, 'clan.closed'), '#D95C54');
      }
    }, say(SAY, 'clan.createConfirm', { cost: CLAN_CREATE_COST })), /*#__PURE__*/React.createElement("button", {
      style: Object.assign({}, LS_SECONDARY, {
        flex: 0.5,
        color: '#B6C1BE'
      }),
      onClick: function onClick() {
        return setClanCreateMode(false);
      }
    }, say(SAY, 'clan.cancel'))));
  }(), clanData && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 44,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      flex: 'none',
      border: '1px solid rgba(229,237,233,.11)',
      borderRadius: 8,
      overflow: 'hidden',
      background: '#111E23',
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
      fontWeight: 700,
      color: '#F4F0E7'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#9A78D0'
    }
  }, "[", clanData.tag, "] "), clanData.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8D9B98',
      fontVariantNumeric: 'tabular-nums'
    }
  }, say(SAY, 'clan.memberCount', { n: ((_clanData$members = clanData.members) === null || _clanData$members === void 0 ? void 0 : _clanData$members.length) || 1, max: CLAN_MAX_MEMBERS, level: clanData.clanLevel || 1 })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 6
    })
  }, say(SAY, 'clan.logoHeader')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 6,
      flexWrap: 'wrap'
    }
  }, /* v2.3.1235: batch-2 rollout — palette swatches keep their small
     visuals but the tappable element grows to a 44×44 transparent hit
     box (chipHit pattern); selection ring moves to brass-highlight.
     Swatch colors themselves are CLAN_COLORS game data. */
  /*#__PURE__*/React.createElement("div", {
    key: "eraser",
    style: {
      width: 44,
      height: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      background: 'transparent'
    },
    onClick: function onClick() {
      stateRef.current._clanPaintColor = -1;
      setRpgState(_objectSpread({}, rpgState));
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 4,
      border: stateRef.current._clanPaintColor === -1 ? '2px solid #EAC675' : '1px solid rgba(229,237,233,.11)',
      background: 'repeating-conic-gradient(rgba(255,255,255,.1) 0% 25%, transparent 0% 50%) 50% / 8px 8px'
    }
  })), CLAN_COLORS.map(function (c, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        background: 'transparent'
      },
      onClick: function onClick() {
        stateRef.current._clanPaintColor = i;
        setRpgState(_objectSpread({}, rpgState));
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 22,
        height: 22,
        borderRadius: 4,
        background: c,
        border: stateRef.current._clanPaintColor === i ? '2px solid #EAC675' : '1px solid rgba(229,237,233,.11)'
      }
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-grid',
      gridTemplateColumns: "repeat(".concat(CLAN_LOGO_SIZE, ",1fr)"),
      gap: 1,
      /* v2.3.1235: batch-2 rollout — corrected well token + shared
         .ui-well shadow recipe on the editor tray */
      background: '#111E23',
      padding: 4,
      borderRadius: 10,
      boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)'
    }
  }, logoGrid.map(function (row, ri) {
    return row.map(function (ci, ci2) {
      return /*#__PURE__*/React.createElement("div", {
        key: ri + '-' + ci2,
        style: {
          width: 24,
          height: 24,
          cursor: 'pointer',
          borderRadius: 2,
          /* v2.3.1235: batch-2 rollout — empty pixels read as well-deep
             inside the well tray (painted pixels are game data) */
          background: ci >= 0 ? CLAN_COLORS[ci] || '#fff' : '#0B161B',
          border: '1px solid rgba(229,237,233,.11)'
        },
        onClick: function onClick() {
          var _stateRef$current$_cl;
          var paint = (_stateRef$current$_cl = stateRef.current._clanPaintColor) !== null && _stateRef$current$_cl !== void 0 ? _stateRef$current$_cl : 0;
          var newLogo = logoGrid.map(function (r) {
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
          var newLogo = logoGrid.map(function (r) {
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
      gap: 6,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1235: batch-2 rollout — 44px danger outline (destructive
         action), 10px button radius, corrected danger token */
      minHeight: 44,
      padding: '0 12px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      border: '1px solid #D8635D',
      background: 'transparent',
      color: '#D8635D'
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
  }, say(SAY, 'clan.clearLogo')), /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1235: batch-2 rollout — 44px secondary (raised fill +
         strong hairline, 10px button radius) per the hitbox floor */
      minHeight: 44,
      padding: '0 12px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      border: '1px solid rgba(229,237,233,.20)',
      background: '#293B41',
      color: '#F4F0E7'
    },
    onClick: function onClick() {
      try {
        localStorage.setItem('bt_clan', JSON.stringify(clanData));
      } catch (e) {}
      pushDmgPopup(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 30, say(SAY, 'clan.logoSaved'), '#a78bfa');
      BT_AUDIO.collect();
    }
  }, say(SAY, 'clan.saveLogo')))), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 4
    })
  }, say(SAY, 'clan.membersCount', { n: ((_clanData$members2 = clanData.members) === null || _clanData$members2 === void 0 ? void 0 : _clanData$members2.length) || 1 })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#B6C1BE',
      marginBottom: 12
    }
  }, (clanData.members || []).map(function (m, i) {
    var _stateRef$current29;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        borderBottom: LS_DIVIDER
      }
    }, m === ((_stateRef$current29 = stateRef.current) === null || _stateRef$current29 === void 0 ? void 0 : _stateRef$current29.myId) ? say(SAY, 'clan.youFounder') : m); /* v2.3.1235: batch-2 rollout — ⭐ dropped, no emoji in chrome */
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: LS_DIVIDER,
      paddingTop: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      marginBottom: 8
    })
  }, say(SAY, 'clan.warsHeader')), stateRef.current._activeClanWar ? function (_ZONES$war$zone4, _ZONES$war$zone5) { /* v2.3.1235: batch-2 rollout — ⚔️ dropped, no emoji in chrome */
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
        gap: 14,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: us.color || '#B6C1BE'
      }
    }, "[", us.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18 /* v2.3.1235: batch-2 rollout — key numbers cap at 18/700 tabular */,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: '#F4F0E7'
      }
    }, us.score)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.12em'
      }
    }, say(SAY, 'clan.versus')), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: them.color || '#D8635D' /* v2.3.1235: batch-2 rollout — danger-token fallback (clan color itself is game data) */
      }
    }, "[", them.tag, "]"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18 /* v2.3.1235: batch-2 rollout — key numbers cap at 18/700 tabular */,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: '#F4F0E7'
      }
    }, them.score))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums'
      }
    }, say(SAY, 'clan.warStatus', { zone: ((_ZONES$war$zone4 = ZONES[war.zone]) === null || _ZONES$war$zone4 === void 0 ? void 0 : _ZONES$war$zone4.name) || war.zone, left: timeLeft, kills: war.killLog.length })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#8D9B98',
        textAlign: 'center',
        marginTop: 3
      }
    }, say(SAY, 'clan.warTravel', { zone: (_ZONES$war$zone5 = ZONES[war.zone]) === null || _ZONES$war$zone5 === void 0 ? void 0 : _ZONES$war$zone5.name })), war.killLog.slice(-3).reverse().map(function (k, i) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          fontSize: 11,
          color: '#8D9B98',
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums'
        }
      }, say(SAY, 'clan.warKill', { killer: k.killer, victim: k.victim, points: k.points }));
    }));
  }() : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#8D9B98',
      marginBottom: 8,
      lineHeight: 1.4
    }
  }, say(SAY, 'clan.warAbout')), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      fontSize: 11,
      marginBottom: 4
    })
  }, say(SAY, 'clan.warZoneHeader')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 10
    }
  }, CLAN_WAR_ZONES.map(function (zId) {
    var _ELEMENTS$z$element;
    var z = ZONES[zId];
    var sel = stateRef.current._warZone === zId;
    return /*#__PURE__*/React.createElement("button", {
      key: zId,
      onClick: function onClick() {
        stateRef.current._warZone = zId;
        setRpgState(_objectSpread({}, rpgState));
      },
      /* v2.3.1235: batch-2 rollout — the button is now a 44px transparent
         hit wrapper; the 32px pill visual moves to an inner span
         (chipHit pattern, hitbox floor). Handler unchanged. */
      style: LS_CHIPHIT
    }, /*#__PURE__*/React.createElement("span", {
      style: Object.assign({}, lsChip(sel), {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5
      })
    }, /* v2.3.1232: element identity kept as a content-color dot; selection
         itself is the spec brass pill */
    /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: 4,
        flex: 'none',
        display: 'inline-block',
        background: ((_ELEMENTS$z$element = ELEMENTS[z.element]) === null || _ELEMENTS$z$element === void 0 ? void 0 : _ELEMENTS$z$element.color) || '#8D9B98'
      }
    }), z.name));
  })), /*#__PURE__*/React.createElement("div", {
    style: Object.assign({}, LS_HEADER, {
      fontSize: 11,
      marginBottom: 4
    })
  }, say(SAY, 'clan.warTargetHeader')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: 10
    }
  }, function () {
    var S = stateRef.current;
    /* v2.3.2301: Object.create(null), not {} -- this map is keyed by
       o.rpgData.clanTag, a CLIENT-SUPPLIED string the server never stamps
       (_clanStampTag only touches the top-level data.clanTag).  A peer
       reporting the tag '__proto__' would silently no-op the assignment on a
       plain object.  Same defect class as duel.away, party meta and amulet
       tiers -- three separate incidents in one day. */
    var otherClans = Object.create(null);
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
        fontSize: 12 /* v2.3.1235: batch-2 rollout — descriptive empty note at the 12px floor, muted */,
        color: '#8D9B98',
        fontStyle: 'italic',
        padding: '4px 0'
      }
    }, say(SAY, 'clan.noOtherClans'));
    return clans.map(function (c) {
      var sel = S._warTarget === c.tag;
      return /*#__PURE__*/React.createElement("button", {
        key: c.tag,
        onClick: function onClick() {
          S._warTarget = c.tag;
          S._warTargetData = c;
          setRpgState(_objectSpread({}, rpgState));
        },
        /* v2.3.1235: batch-2 rollout — 44px transparent hit wrapper, pill
           visual on an inner span (chipHit pattern). Handler unchanged. */
        style: LS_CHIPHIT
      }, /*#__PURE__*/React.createElement("span", {
        style: lsChip(sel)
      }, "[", c.tag, "] ", c.name));
    });
  }()), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      var _ZONES$zone;
      var S = stateRef.current;
      var zone = S._warZone || CLAN_WAR_ZONES[0];
      var target = S._warTargetData;
      if (!target) {
        pushDmgPopup(S, S.player.x, S.player.y - 30, say(SAY, 'clan.pickTarget'), '#D95C54');
        return;
      }
      /* v2.3.1125: referee-capable workers BUILD the war themselves
         (authoritative id/clock/scores) and broadcast it back in this
         same shape -- setting a local war object here would leave this
         client tracking a war id the server's clan_war_kill events
         never match.  Send the declare and let the echo set
         S._activeClanWar (gameEvents challenger branch). */
      if (S._serverCaps && S._serverCaps.clans) {
        if (S.channel) act('clan_war_declare', {   /* v2.3.5190: through the action door (actions.js) */
          defenderTag: target.tag,
          zone: zone
        });
      } else {
        var war = createClanWar(clanData, target, zone);
        /* Add self to war */
        war.challenger.members.push(S.myId);
        S._activeClanWar = war;
        /* Broadcast war declaration */
        if (S.channel) act('clan_war_declare', {   /* v2.3.5190: through the action door (actions.js) */
          war: war,
          challengerTag: clanData.tag,
          defenderTag: target.tag
        });
      }
      pushDmgPopup(S, S.player.x, S.player.y - 40, say(SAY, 'clan.warDeclared', { tag: target.tag }), '#D95C54');
      pushDmgPopup(S, S.player.x, S.player.y - 25, say(SAY, 'clan.warZonePopup', { zone: (_ZONES$zone = ZONES[zone]) === null || _ZONES$zone === void 0 ? void 0 : _ZONES$zone.name }), 'rgba(255,255,255,.5)');
      BT_AUDIO.beep(200, 0.15, 0.2, 'sawtooth');
      setTimeout(function () {
        return BT_AUDIO.beep(150, 0.2, 0.25, 'sawtooth');
      }, 100);
      S.screenShake = 6;
      setRpgState(_objectSpread({}, rpgState));
    },
    style: {
      /* v2.3.1235: batch-2 rollout — destructive actions are danger
         OUTLINES (border+text #D8635D on transparent), never a filled
         red block; ⚔️ dropped (no emoji in chrome); 10px button radius */
      width: '100%',
      minHeight: 44,
      padding: '0 12px',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      border: '1px solid #D8635D',
      background: 'transparent',
      color: '#D8635D',
      cursor: 'pointer'
    }
  }, say(SAY, 'clan.declareWar')))), /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1235: batch-2 rollout — danger outline on the corrected
         danger token; 10px button radius */
      width: '100%',
      minHeight: 44,
      padding: '0 12px',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
      border: '1px solid #D8635D',
      /* v2.3.2289: the armed fill is the danger tint already in use elsewhere
         (InventoryPanel/CookPanel); still an outline button, since filled red
         was retired at v2.3.1235. */
      background: leaveArmed ? 'rgba(216,99,93,.15)' : 'transparent',
      color: '#D8635D'
    },
    'data-leave-armed': leaveArmed ? '1' : '0',
    onClick: function onClick() {
      /* v2.3.2289: first tap arms, second tap leaves. */
      if (!leaveArmed) {
        setLeaveArmed(true);
        return;
      }
      setLeaveArmed(false);
      var S = stateRef.current;
      /* ═══ v2.3.2301: LEAVING NOW REACHES THE SERVER ═══
         This button was local-only since it was written: it nulled clanData
         and S._clanData and dropped the bt_clan cache, while the room's
         registry still held you as a member.  So the clan came BACK on the
         next reload -- and worse, in between, Create Clan bounced "Already in
         a clan" and accepting an invite failed silently, with the UI insisting
         you had left.  The server command has existed since v2.3.1125; only
         the send was missing.

         Deliberately NO optimistic local clear on the server path: the worker
         can now REFUSE (you cannot desert mid-war), and wiping the UI over a
         refusal is exactly the lying UI this change exists to remove.  The
         clan_state {clan:null} echo does all three writebacks. */
      if (S._serverCaps && S._serverCaps.clans) {
        if (S.channel) act('clan_leave', {});   /* v2.3.5190: through the action door (actions.js) */
        pushDmgPopup(S, S.player.x, S.player.y - 30, say(SAY, 'clan.leaving'), '#D95C54');
        return;
      }
      /* Legacy-worker path (a worker rolled back past v2.3.1125, or one where
         live-ops has forced caps.clans off): unchanged local wipe, so the
         button is never dead.  The war objects are clan-scoped, so they go
         with it -- without that, a stale _activeClanWar keeps ticking toward a
         phantom "WAR WON!" for a clan you are no longer in. */
      setClanData(null);
      S._clanData = null;
      S._activeClanWar = null;
      S._warTarget = null;
      S._warTargetData = null;
      try {
        localStorage.removeItem('bt_clan');
      } catch (e) {}
      pushDmgPopup(S, S.player.x, S.player.y - 30, say(SAY, 'clan.left'), '#D95C54');
    }
    /* v2.3.2301: the armed label tells the truth about what the second tap
       actually does.  For the LAST member the server dissolves the clan and
       frees its name and tag for anyone to take -- "leave" is much too gentle
       a word for a one-way delete, and this is the only moment the player is
       told. */
  }, leaveArmed
    ? (soloInClan ? say(SAY, 'clan.disbandArmed', { tag: clanData.tag || '' })
      : say(SAY, 'clan.leaveArmed'))
    : say(SAY, 'clan.leaveButton')))));
}
