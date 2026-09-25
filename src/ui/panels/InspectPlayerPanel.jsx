import React from 'react';
import { useModalGuard } from '../mobile/modalGuardBus.js'; /* v2.3.2276 */
import { BT_AUDIO, PVP_THREAT_BASE_COUNTDOWN, PVP_THREAT_COOLDOWN, REPUTATION, ZONES } from '@/data/index.js';
import { _toConsumableArray } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
/* v2.3.1981: server-backed mute + the report send (server/src/chatmod.js).
   setMuted still writes the localStorage list this panel's mutedList prop
   is built from, so nothing here changed shape — it just persists now. */
import { setMuted, reportPlayer, chatMuteSettled } from '@/game/chatMute.js';
/* v2.3.1235: Checkpoint B — real pixel-portrait generator + the color-id →
   RGB target transforms it expects (same set the BottomDashboard player
   card uses). */
import { portraitDataUrl, portraitOptsFromPeer, portraitHasSubject } from '../../rendering/characterPortrait.js'; /* v2.3.2193: one shared recipe */
import { hairColorTarget } from '../../rendering/traits/hairColorCatalog.js';
import { hatColorTarget } from '../../rendering/traits/hatColorCatalog.js';
import { facialHairColorTarget } from '../../rendering/traits/facialHairColorCatalog.js';
import { shirtColorTarget } from '../../rendering/traits/shirtColorCatalog.js';
import { PlayerProfilePanel } from './PlayerProfilePanel.jsx'; /* v2.3.2926 */

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
   caps gate is unchanged. */
/* v2.3.1235: owner-approved design correction (§7) — presentation only,
   every handler/state read/send byte-identical. Real pixel portrait
   (letter tile only as fallback), Trade the single gold primary, Threat a
   danger OUTLINE. */
/* ═══ v2.3.2926: REBUILT FROM THE OWNER'S MOCKUP ═══
   Owner, first: "Assess the structure of the menu ... a layout and
   representation that would take the least amount of time to make the other
   player understand pertinent information and in the smallest arrangement
   that is still clear and legible."  Then, with a mockup and an icon sheet:
   "Change of plans. like this better."  And for the stats the mockup leaves
   out: "Tapping the character profile picture will bring up a new menu that
   shows stats and equipment.  Don't build it out completely but leave a
   placeholder."
   What the assessment measured, on a real worker with two clients at 390x844
   (the owner's phone) -- the owner's own screenshots showed the SHORT card,
   a peer whose 2s track relay had not landed:
   - with the relay landed (an active player) the old card was 584px, 69% of
     the screen, and hid 88px more under its own fold: Add Friend, Mute, Block
     and Report were all off screen until you scrolled a body with no
     scrollbar; a clan leader lost the clan invite too.  In landscape it was
     257px of card with 415px hidden.
   - actions lived in three places (party top, friend/mute/block and report
     mid-scroll, trade/duel bottom), and "are we friends" existed only as a
     button's wording.
   The mockup, top to bottom:
     head    72px portrait (now the door to the stats menu), name, an LV pill,
             and the relationship as a badge beside it (🙂 Friend / In party)
     ─ ◆ ─
     tiles   2x2: Invite to Party · Trade / Friend · Duel, the owner's icons
             (public/icons/ui/soc-*.webp, cut by tools/ui/slice-social-icons.mjs)
             -- all four the same weight: the mockup has no gold primary
     ─ ◆ ─
     safety  Mute · Block · Report, outlined, icon + word
   The card no longer carries Equipment / Tier 1 Stats / Record at all; they
   belong to PlayerProfilePanel (a placeholder for now -- its header note maps
   the rpgData fields for whoever builds it).  With the sheet gone there is no
   scroll body, so the v2.3.1235 fade and the v2.3.1743 four-row grid it
   needed are gone with it.
   Corner brackets and the ◆ dividers are the mockup's, drawn in CSS; they are
   the owner's deliberate exception to Lantern Slate's "no decorative
   corners" (recorded in docs/LANTERN-SLATE-SPEC.md, do-not-drift list).
   Presentation only: every click handler below is the code it replaces,
   verbatim; every caps gate is the same gate; every wire send is the same
   send.  Every control carries a stable data-act (TRAPS §29): the mp
   scenarios select by that id, not by the display copy. */

/* v2.3.2926: one of the owner's icons, with the emoji the card used before
   as the fallback if the webp fails (the pattern PartyHUD / TradePanel use).
   A SPAN, not a bare text node, so the fallback keeps the icon's box. */
function socIcon(name, glyph) {
  return /*#__PURE__*/React.createElement("img", {
    className: "bt-pcard-ic",
    src: '/icons/ui/soc-' + name + '.webp',
    alt: "",
    draggable: false,
    onError: function onError(e) {
      var s = document.createElement('span');
      s.className = 'bt-pcard-ic bt-pcard-glyph';
      s.textContent = glyph;
      e.currentTarget.replaceWith(s);
    }
  });
}

export function InspectPlayerPanel(props) {
  /* v2.3.2276: stand the transient world chrome down while this is up.  The
     guard had only ever been pushed by the three trade panels, so the chat
     composer's full-play-area dismiss layer stayed live over a PLAYER menu --
     which is one of the two the owner named. */
  useModalGuard(React);
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
     the inspected player.  NOTE: inspectPlayer.bro is a verified Hemi Bro
     token id, NOT appearance — the inspected player's live cosmetics are
     the flat fields on stateRef.current.others[id]
     (skin/hair/hairColor/facialhair/facialHairColor/headwear/hatColor/
     shirt/shirtColor/pants/shoes, filled at player_join/state_sync from
     the wire's sk/hr/hc/fh/fhc/hw/htc/st/stc/pt/sh).  These are the SAME
     fields entityRenderer draws, so the portrait matches the in-game
     figure.  portraitDataUrl is ASYNC (Promise of a data URL).  Fallback
     chain when the others entry is gone (player left / placeholder peer)
     or generation fails: inspectPlayer.avatar img → letter tile. */
  var _pp = React.useState(null);
  var genPortrait = _pp[0],
    setGenPortrait = _pp[1];
  /* v2.3.1981: the report row's two states — collapsed to one line, or
     open showing the reason chips.  Kept in the panel (not in S) because
     it is pure UI and must reset when the card closes, which it does:
     BroTown unmounts this component with `inspectPlayer &&`. */
  var _rp = React.useState(false);
  var reportOpen = _rp[0],
    setReportOpen = _rp[1];
  var _rs = React.useState(false);
  var reportSent = _rs[0],
    setReportSent = _rs[1];
  /* v2.3.2926: the stats-and-equipment menu the portrait opens.  Panel
     state for the same reason as the report row: it resets when the card
     closes, so the next player you tap opens on their card, not on a menu
     left over from the last one. */
  var _pv = React.useState(false);
  var showProfile = _pv[0],
    setShowProfile = _pv[1];
  React.useEffect(function () {
    var alive = true;
    setGenPortrait(null);
    var o = null;
    try {
      o = inspectPlayer && stateRef.current && stateRef.current.others ? stateRef.current.others[inspectPlayer.id] : null;
    } catch (e) {}
    /* v2.3.2193: the mapping moved to characterPortrait's portraitOptsFromPeer
       so the character picker draws its rows through the identical recipe --
       the long note there says why a second hand-written copy is the shape
       this repo keeps paying for.  The guard moved with it: a tick-created
       placeholder peer carries all-null cosmetics, and drawing one produces a
       default body rather than a person, so the avatar / letter-tile fallbacks
       show instead. */
    if (portraitHasSubject(o)) {
      try {
        portraitDataUrl(portraitOptsFromPeer(o), true).then(function (url) {
          if (alive && url) setGenPortrait(url);
        }).catch(function () {});
      } catch (e) {}
    }
    return function () {
      alive = false;
    };
  }, [inspectPlayer]);
  var _REPUTATION$inspectPl, _REPUTATION$inspectPl2, _S$rpg26, _ZONES$stateRef$curre, _inspectPlayer$rpgDat, _stateRef$current39;
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
  /* v2.3.2926: the four relationship reads, hoisted out of the IIFEs each
     button used to compute its own in -- same expressions, same names, so
     the handlers below that read them are the old handlers verbatim.  They
     are up here because the header now shows them too (the mockup's
     "🙂 Friend" badge beside the level). */
  var isFriend = friendsList.some(function (f) {
    return f.id === inspectPlayer.id;
  });
  var isMuted = mutedList.includes(inspectPlayer.id);
  var isBlocked = blockedList.includes(inspectPlayer.id);
  var isLawless = (_ZONES$stateRef$curre = ZONES[(_stateRef$current39 = stateRef.current) === null || _stateRef$current39 === void 0 ? void 0 : _stateRef$current39.currentZone]) === null || _ZONES$stateRef$curre === void 0 ? void 0 : _ZONES$stateRef$curre.lawless;
  /* v2.3.1743: caps-gated exactly as before (v2.3.1185: an old worker would
     rebroadcast party_invite as an unknown type instead of validating it),
     so a worker without parties shows no party tile at all. */
  var hasPartyCap = !!(stateRef.current && stateRef.current._serverCaps && stateRef.current._serverCaps.party);
  /* v2.3.1981: hidden entirely against a worker that cannot store a report --
     a report button that quietly does nothing is worse than no button. */
  var canReport = chatMuteSettled(stateRef.current);
  /* v2.3.1743: the CLAN invite only appears when you lead a clan the target
     isn't in.  v2.3.2926: and not while the report reasons are up, which
     would otherwise stack a fifth row onto a landscape phone's 257px card. */
  var showClanInvite = clanData && !((_inspectPlayer$rpgDat = inspectPlayer.rpgData) !== null && _inspectPlayer$rpgDat !== void 0 && _inspectPlayer$rpgDat.clanTag) && !reportOpen;
  var closeCard = function onClick() {
    return setInspectPlayer(null);
  };
  /* v2.3.1235: Checkpoint B — portrait chain: generated pixel portrait →
     inspectPlayer.avatar img → letter tile.  v2.3.2926: built once and
     shown by both the card and the stats menu. */
  var face = genPortrait ? /*#__PURE__*/React.createElement("img", {
    src: genPortrait,
    alt: "",
    draggable: false
  }) : inspectPlayer.avatar ? /*#__PURE__*/React.createElement("img", {
    src: inspectPlayer.avatar,
    alt: "",
    draggable: false,
    onError: function onError(e) {
      /* v2.3.1235: broken avatar URL → swap in the letter tile */
      var el = document.createElement('div');
      el.className = 'bt-pcard-letter';
      el.style.background = inspectPlayer.color || '#293B41';
      el.textContent = inspectPlayer.name.charAt(0).toUpperCase();
      e.currentTarget.replaceWith(el);
    }
  }) : /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-letter",
    style: {
      background: inspectPlayer.color
    }
  }, inspectPlayer.name.charAt(0).toUpperCase());
  return React.createElement("div", {
    className: "bt-inspect",
    style: {
      background: 'rgba(4,9,12,0.38)' /* v2.3.1235: ordinary modal scrim */
    },
    onClick: closeCard
  }, showProfile ? /*#__PURE__*/React.createElement(PlayerProfilePanel, {
    inspectPlayer: inspectPlayer,
    face: face,
    onBack: function onBack() {
      setShowProfile(false);
    },
    onClose: closeCard
  }) : /*#__PURE__*/React.createElement("div", {
    /* v2.3.2926: the whole look is game.css `.bt-pcard` -- the mockup's
       gradient, brackets and dividers, the pressed states, and the landscape
       phone's one-row tiles, none of which an inline style can say.
       ls-scrollbody: the card only scrolls as a last resort, on a screen too
       short for it, and then without a bar (TRAPS §64 -- a clipped card is
       still a scroll container, just one a finger cannot move). */
    className: "bt-inspect-card bt-pcard ls-scrollbody",
    onClick: function onClick(e) {
      return e.stopPropagation();
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    "aria-label": "Close",
    onClick: function onClick() {
      return setInspectPlayer(null);
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/soc-close.webp",
    alt: "",
    draggable: false
  })),
  /* ═══ HEAD ═══
     The portrait is a BUTTON now -- the owner's door to the stats menu. */
  /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-pcard-face",
    "data-act": "profile",
    "aria-label": "Stats and equipment",
    title: "Stats & equipment",
    onClick: function onClick() {
      setShowProfile(true);
    }
  }, face), /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-who"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-name" /* v2.3.1235: Checkpoint B — text token always, never a per-player tint */
  }, inspectPlayer.clanTag && /*#__PURE__*/React.createElement("span", {
    style: {
      color: inspectPlayer.clanColor1 || '#9A76D3'
    }
  }, "[", inspectPlayer.clanTag, "] "), inspectPlayer.name), /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-meta"
  }, inspectPlayer.rpgLv && /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-lv"
  }, "LV ", inspectPlayer.rpgLv),
  /* v2.3.2926: the relationship, where the eye lands first -- the mockup's
     "🙂 Friend" beside the level, and the party membership the same way. */
  _partyMate && /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-rel",
    "data-rel": "party"
  }, socIcon('party', '🎟️'), "In party"), isFriend && /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-rel",
    "data-rel": "friend"
  }, socIcon('friend', '🙂'), "Friend"), inspectPlayer.rep && inspectPlayer.rep !== 'neutral' && /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-rep",
    style: {
      color: ((_REPUTATION$inspectPl = REPUTATION[inspectPlayer.rep]) === null || _REPUTATION$inspectPl === void 0 ? void 0 : _REPUTATION$inspectPl.color) || '#8D9B98'
    }
  }, ((_REPUTATION$inspectPl2 = REPUTATION[inspectPlayer.rep]) === null || _REPUTATION$inspectPl2 === void 0 ? void 0 : _REPUTATION$inspectPl2.label) || inspectPlayer.rep), inspectPlayer.pet && /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-pet"
  }, inspectPlayer.pet)))), /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-rule",
    "aria-hidden": true
  }),
  /* ═══ TILES ═══
     v2.3.1743: THE PARTY ACTION LIVES AT THE TOP.  Owner: "party should be
     moved to the top part of the modal" -- it used to sit below the whole
     stat block, off the bottom of a phone.  v2.3.2926: it is the first tile,
     top left, as the mockup draws it.  A worker without parties draws three
     tiles; game.css stretches an odd last tile across both columns. */
  /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-tiles"
  }, hasPartyCap && (_partyMate
  /* v2.3.1743: someone already on your roster is not invitable -- the tile
     says so and takes no tap. */
  ? /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-tile is-static",
    "data-act": "party",
    "data-state": "member",
    "aria-disabled": "true"
  }, socIcon('party', '🎟️'), /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-lb"
  }, "In party"))
  : /*#__PURE__*/React.createElement("button", {
    className: "bt-pcard-tile",
    "data-act": "party",
    "data-state": "invite",
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
  }, socIcon('party', '🎟️'), /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-lb"
  }, "Invite to Party"))),
  /* v2.3.1744: TP is GONE (owner: "remove it", after asking what it did).
     It wrote your own x/y to the inspected player's + 40 and closed the
     card — no cost, no cooldown, no gate, and no server call at all.  The
     worker's anti-teleport speed cap (movement.js, 500 px/s + 80 px burst)
     then refused any jump long enough to be worth taking, so it worked over
     a few tiles and rubber-banded over a screen.  A convenience button whose
     behaviour depends on distance is worse than no button.
     v2.3.2926: Trade is no longer the gold primary -- the mockup draws the
     four actions at one weight. */
  /*#__PURE__*/React.createElement("button", {
    className: "bt-pcard-tile",
    "data-act": "trade",
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
  }, socIcon('trade', '🤝'), /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-lb"
  }, "Trade")),
  /* v2.3.2926: Friend is a tile now (it was the most-hidden control -- the
     old card's social row sat below the fold).  Tapping it when you are
     already friends still removes the friend, as the old "💚 Friend" button
     did; the header badge is what says you are friends. */
  /*#__PURE__*/React.createElement("button", {
    className: "bt-pcard-tile",
    "data-act": "friend",
    "aria-pressed": isFriend ? "true" : "false",
    title: isFriend ? "Friends — tap to remove" : "Add friend",
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
  }, socIcon('friend', isFriend ? '💚' : '🙂'), /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-lb"
  }, isFriend ? 'Friend' : 'Add Friend')), /*#__PURE__*/React.createElement("button", {
    className: "bt-pcard-tile",
    "data-act": "duel",
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
  }, socIcon('duel', '⚔️'), /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-lb"
  }, "Duel")),
  /* ═══ v2.3.1917: THREAT IS GONE FROM THE CARD ═══
    Owner: "Also remove the option to kill other players for now."  Threat
    was the button that started a non-consensual fight: ignore it (or let
    the countdown run out) and the pair could damage each other anywhere.
    The worker refuses pvp_threat outright now (GameRoom.OPEN_PVP, and
    server/src/threat.js), so leaving the button would post a message into
    a void and light a red skull over a head nobody can act on.  Duel is
    the remaining way to fight someone, which is the point — it needs their
    yes.  The handler is kept below the flag rather than deleted so turning
    the system back on is one constant.  v2.3.2926: it would come back as a
    tile in the danger outline. */
  false && /*#__PURE__*/React.createElement("button", {
    className: "bt-pcard-tile is-danger",
    "data-act": "threat",
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
  }, /*#__PURE__*/React.createElement("img", {
    className: "bt-pcard-ic",
    src: "/icons/ui/evt-threat.webp",
    alt: "",
    draggable: false
  }), /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-lb"
  }, "Threat")),
  /* v2.3.1743: the CLAN invite -- the rarer action, only when you lead a
     clan the target isn't in.  v2.3.2926: a fifth tile after the mockup's
     four (full width under them on a phone held upright, one more in the row
     sideways).  The owner's sheet has no clan icon, so it keeps the painted
     clan shield from the older set. */
  showClanInvite && /*#__PURE__*/React.createElement("button", {
    className: "bt-pcard-tile is-clan",
    "data-act": "clan",
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
  }, /*#__PURE__*/React.createElement("img", {
    className: "bt-pcard-ic",
    src: "/icons/ui/panel-clan.webp",
    alt: "",
    draggable: false
  }), /*#__PURE__*/React.createElement("span", {
    className: "bt-pcard-lb"
  }, "Invite to [", clanData.tag, "]"))), /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-rule",
    "aria-hidden": true
  }),
  /* ═══ SAFETY ═══
     Mute · Block · Report, outlined, under their own divider -- apart from
     the tiles, so a thumb aimed at Duel does not land on Block.  The
     on-states keep the colours the old buttons used: Muted amber, Blocked
     the red danger outline. */
  /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-safe" + (reportOpen ? " is-report" : "")
  }, !reportOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "bt-pcard-q" + (isMuted ? " is-warn" : ""),
    "data-act": "mute",
    "aria-pressed": isMuted ? "true" : "false",
    onClick: function onClick() {
      /* v2.3.1981: the mute goes to the WORKER now (chatMute.js
         setMuted), which writes it to Durable Object storage against
         this player's `bp_` identity and stops fanning the muted
         player's chat out to this socket at all.  setMuted still
         writes the localStorage list first — that is the prediction,
         the legacy fallback against a worker without caps.chatMute,
         and what this panel's `mutedList` prop is built from — so the
         button behaves identically either way, it just no longer
         forgets on the next device. */
      var _mS = stateRef.current;
      var _mNext = setMuted(_mS, inspectPlayer.id, !isMuted, inspectPlayer.name);
      setMutedList(_mNext);
      var _mDurable = chatMuteSettled(_mS);
      pushDmgPopup(_mS, _mS.player.x, _mS.player.y - 30,
        isMuted ? 'Unmuted' : (_mDurable ? 'Muted — their chat stops here' : 'Muted'), '#D8A94D');
    }
  }, socIcon('mute', '🔇'), isMuted ? 'Muted' : 'Mute'), /*#__PURE__*/React.createElement("button", {
    className: "bt-pcard-q" + (isBlocked ? " is-danger" : ""),
    "data-act": "block",
    "aria-pressed": isBlocked ? "true" : "false",
    style: {
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
  }, socIcon('block', '🚫'), isBlocked ? 'Blocked' : 'Block'),
  /* ═══ v2.3.1981: REPORT ═══
    Until now a player being harassed on a public server had exactly one
    tool — hide it from themselves — and no way to tell the operator
    anything at all.  This sends a report the WORKER writes to storage
    with its own copy of what the reported player said (chatmod.js): the
    payload carries only who and why, so nothing typed here can end up
    as evidence against somebody else.
    Two taps by design (row opens -> reason chip commits): a one-tap
    report next to Mute would be mis-fired constantly on a 390px phone,
    and the reason is what makes the record actionable.  Hidden entirely
    against a worker that cannot store it, for the reason in
    chatMute.js — a report button that quietly does nothing is worse
    than no button.  v2.3.2926: "Report", the mockup's word. */
  canReport && /*#__PURE__*/React.createElement("button", {
    className: "bt-pcard-q",
    "data-act": "report",
    disabled: reportSent,
    onClick: function onClick() {
      if (!reportSent) setReportOpen(true);
    }
  }, socIcon('report', '⚑'), reportSent ? 'Reported' : 'Report')), reportOpen && /*#__PURE__*/React.createElement(React.Fragment, null,
  /* v2.3.2926: the reasons replace the safety row in place.  That row is
     never scrolled away now, so the v2.3.1981 scrollIntoView that fetched
     the old in-body report row from below the fold has nothing to fetch.
     On a phone held sideways game.css lays the question, the four reasons
     and Cancel out as ONE row, so the card does not grow. */
  /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-rq"
  }, /*#__PURE__*/React.createElement("span", null, "Why are you reporting ", inspectPlayer.name, "?"), /*#__PURE__*/React.createElement("button", {
    className: "bt-pcard-cancel",
    "data-act": "report-cancel",
    onClick: function onClick() {
      setReportOpen(false);
    }
  }, "Cancel")), /*#__PURE__*/React.createElement("div", {
    className: "bt-pcard-reasons"
  }, [['spam', 'Spam'], ['abuse', 'Abuse'], ['harassment', 'Harassment'], ['cheating', 'Cheating']].map(function (r) {
    return /*#__PURE__*/React.createElement("button", {
      key: r[0],
      className: "bt-pcard-q bt-pcard-reason",
      "data-act": "report-" + r[0],
      onClick: function onClick() {
        var _rS = stateRef.current;
        /* The ack (chat_report_ack -> gameEvents.js) is the real
           confirmation; this only closes the row so the card can't be
           used to fire a second one on the same tap-through. */
        reportPlayer(_rS, inspectPlayer.id, r[0]);
        setReportOpen(false);
        setReportSent(true);
      }
    }, r[1]);
  }))))));
}
