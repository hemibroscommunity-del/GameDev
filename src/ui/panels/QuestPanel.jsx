import React from 'react';
import { acceptQuest, turnInQuest } from '@/game/quests.js';
import { NPC_DATA } from '@/data/gameDisplay.js';
import { prog3Live, PROG3_SKILL_META } from '@/data/prog3.js';

/* v2.3.1681 (owner: "Add thumbnail of mayor bro's profile picture in quest
   dialog box and also thumbnail of the quest items (sword and shield)").
   Looked up by the NAME the quest chain stores — the same key getNpcQuest
   matches on — so there is no second id to keep in sync.  Null for a giver
   with no art, which falls back to the initial-letter disc below. */
function npcPortrait(name) {
  const npc = (NPC_DATA || []).find((n) => n && n.name === name);
  return (npc && npc.portrait) || null;
}

/* One item chip: art over its name.  Small (40px) — this is a "here is what
   it looks like" cue beside the text, not a shop listing.  A missing file
   removes the whole chip rather than leaving a broken-image glyph in the
   middle of the dialogue. */
function ItemChip(props) {
  const it = props.item;
  return React.createElement('div', {
    style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 52 },
  }, React.createElement('img', {
    src: it.icon,
    alt: it.label || '',
    draggable: false,
    style: {
      width: 40, height: 40, objectFit: 'contain',
      borderRadius: 9,
      background: '#121B20',
      /* Same recessed well as the objective block, so the chips read as part
         of the panel's material rather than pasted on. */
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
      padding: 3,
    },
    onError: function onError(e) {
      const box = e.currentTarget.parentNode;
      if (box && box.parentNode) box.parentNode.removeChild(box);
    },
  }), React.createElement('div', {
    style: { fontSize: 9, lineHeight: 1.15, color: '#96A2A0', textAlign: 'center' },
  }, it.label || ''));
}

/* === QuestPanel — NPC quest accept / turn-in dialog === */
/* v2.3.870: moved verbatim from BroTown.jsx's JSX tree (UI-panel
   decomposition; behavior-frozen). createElement subtree unchanged. The
   accept/turn-in transition logic already lives in src/game/quests.js
   (REBUILD-PLAN Phase 3) and is imported here. 5 props (rpgState,
   stateRef, questPanel, setQuestPanel, setRpgState). The
   `_questPanel$npcRef` babel optional-chaining temp was hoisted to
   BroTown top; declared locally. */
/* ═══ v2.3.1685: THE XP CHOOSER (owner: "Add chooser to dialog") ═══
   Under prog3 there is no generic XP bar — every point of XP belongs to
   Melee, Bow or Magic — so an XP-paying turn-in has to name one, and the
   worker REFUSES one that doesn't (`_needsCat`, server/src/quests.js).
   The quest LOG has had this picker since v2.3.1669; this in-world dialogue
   never did, so turning in at the giver could not succeed: before v2.3.1684
   the message never reached the worker at all, and after it was refused for
   the missing category. Either way the reward silently never arrived while
   the client had already congratulated you locally.
   Same keys, labels and icons as the log's picker so the two doors into one
   action agree. This is the mechanism, not a courtesy — with no choice
   there is no reward — so the Turn In button below stays inert until one of
   these is pressed, rather than firing a turn-in that cannot pay. */
/* ═══ v2.3.1793: THE SKILL CHOICE IS PART OF THE PRIZE, NOT A FORM ═══
 * Owner: "For the choose a skill to train turning in a quest should feel more
 * obviously like a reward turning it in in the UI quest menu."
 *
 * The chooser read as an administrative gate standing between the player and
 * their reward: an 11px muted uppercase form label ("Train 250 XP into") over
 * three outline buttons.  Everything about that says SETTING.  But this is the
 * payout — the XP is already earned, and all that is left is deciding where it
 * lands.  Same reasoning v2.3.1764 applied to the button when the owner said
 * turning in "needs to be more obvious that you're redeeming a reward".
 *
 * So the amount is stated as a prize: large, and in the XP semantic green the
 * spec reserves for it (#61B06B), with the instruction demoted beside it.  The
 * whole group sits on a `raised` card, which is the spec's actionable surface —
 * it lifts out of the footer instead of lying flat in it.
 *
 * NO BRASS HERE, deliberately.  The spec locks brass to focus/selection/premium
 * and there is already exactly one brass thing in this footer: the Redeem
 * button, and the selected skill tile.  A brass edge on the card as well would
 * put three competing gold elements in a 120px strip and cost the button its
 * primacy.  Green carries "reward"; brass stays "the thing to press".
 *
 * SAME HEIGHT, near enough.  v2.3.1685 recorded that this card already
 * overflowed its box before the picker existed and that the picker added ~74px
 * more, so a taller reward banner is not free here.  The payout and the
 * instruction share ONE row rather than stacking, and the group's bottom
 * margin comes down to pay for the card padding — net ~+8px. */
function XpChooser(props) {
  var xp = props.xp, xpCat = props.xpCat, setXpCat = props.setXpCat;
  return React.createElement("div", {
    style: {
      marginTop: 2, marginBottom: 8,
      /* ═══ v2.3.1795: THE PAYOUT CARD IS GREEN ═══
         Owner: "Maybe breathing effect text for the plus xp and a green
         coloured modal or something."
         The surface underneath was the plain raised slate every actionable
         group in this panel uses, so the one card that HANDS YOU SOMETHING
         looked like the ones that merely describe the job.  Green is already
         this UI's word for a gain — the XP number here, the QUEST COMPLETED!
         banner, the Positive token — so tinting the surface with it says
         "reward" in a colour the player has been taught, rather than
         introducing an accent (Lantern Slate's do-not-drift list forbids new
         ones).  A WASH, not a fill: the slate still shows through, so the
         brass selection on the buttons below stays the brightest thing in
         the card and keeps reading as the choice you are making. */
      background: 'linear-gradient(180deg, rgba(97,176,107,.16), rgba(97,176,107,.05)), #2B3940',
      border: '1px solid rgba(97,176,107,.34)',
      borderRadius: 10,
      padding: '8px 9px 9px',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 6px 14px rgba(5,8,10,.18)',
    },
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex', alignItems: 'baseline', gap: 7,
      marginBottom: 6, minWidth: 0,
    },
  }, /*#__PURE__*/React.createElement("span", {
    /* v2.3.1795: breathes three times as the payout appears, then rests —
       see .bt-xp-payout in game.css for why it is finite rather than ambient. */
    className: 'bt-xp-payout',
    style: { fontSize: 17, fontWeight: 700, color: '#61B06B', flex: 'none', lineHeight: 1 },
  }, '+' + xp + ' XP'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11, fontWeight: 600, letterSpacing: '.06em',
      textTransform: 'uppercase', color: 'rgba(238,242,235,.55)',
      minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    },
  }, 'choose where to train it')), /*#__PURE__*/React.createElement("div", {
    style: { display: 'flex', gap: 5 },
  }, PROG3_SKILL_META.map(function (sk) {
    var on = xpCat === sk.key;
    return /*#__PURE__*/React.createElement("button", {
      key: sk.key,
      'aria-pressed': on,
      onClick: function onClick(e) { e.stopPropagation(); setXpCat(sk.key); },
      style: {
        flex: '1 1 0', minWidth: 0, minHeight: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        background: on ? 'rgba(216,168,95,.18)' : 'transparent',
        border: '1px solid ' + (on ? '#D8A85F' : 'rgba(238,242,235,.18)'),
        borderRadius: 10,
        color: on ? '#D8A85F' : '#EEF2EB',
        fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', touchAction: 'manipulation',
      },
    }, /*#__PURE__*/React.createElement("img", {
      src: sk.iconSrc, alt: "", draggable: false,
      style: { width: 18, height: 18, objectFit: 'contain', flex: 'none', pointerEvents: 'none' },
    }), sk.label);
  })));
}

/* v2.3.1232: Lantern Slate restyle (docs/LANTERN-SLATE-SPEC.md) — panel
   surface + 11/600 section headers + recessed objective well + 44px
   brass primary. Styles/structure only; handlers untouched. */
export function QuestPanel(props) {
  var rpgState = props.rpgState,
    stateRef = props.stateRef,
    questPanel = props.questPanel,
    setQuestPanel = props.setQuestPanel,
    setRpgState = props.setRpgState;
  /* v2.3.1685: which skill this turn-in's XP trains (see XpChooser). Local
     to the open dialogue — closing it and coming back asks again, which is
     right: it is a decision about THIS payout, not a saved preference. */
  var _xpCatState = React.useState(null),
    xpCat = _xpCatState[0],
    setXpCat = _xpCatState[1];
  var _xpAmt = (questPanel.quest.reward && questPanel.quest.reward.xp) || 0;
  /* ═══ v2.3.1764: SAY WHAT THE BUTTON DOES ═══
     Owner: "When you turn in a quest it needs to be more obvious that you're
     redeeming a reward."  "Turn In Quest" describes handing something OVER —
     the half of the trade the player already did.  The button is the moment
     they COLLECT, so it says so, and it names the payout: the reward chips
     above are what you will get, and this is the same fact on the control that
     grants it, where nobody has to scroll to find it. */
  var _rwd = questPanel.quest.reward || {};
  var _redeemBits = [];
  if (_rwd.gold) _redeemBits.push(_rwd.gold + 'g');
  if (_rwd.xp) _redeemBits.push(_rwd.xp + ' XP');
  if (_rwd.item) _redeemBits.push(String(_rwd.item));
  var _redeemLabel = _redeemBits.length
    ? 'Redeem Reward · ' + _redeemBits.join(' · ')
    : 'Redeem Reward';
  /* Read the LIVE rpg (stateRef), not the React copy: prog3 arrives on a
     player_state and the copy can lag a tick, which would render the wrong
     branch for exactly the character the picker exists for. */
  var _liveRpg = (stateRef && stateRef.current && stateRef.current.rpg) || rpgState;
  var _needsXpChoice = prog3Live(_liveRpg) && _xpAmt > 0;
  var _questPanel$npcRef;
  /* v2.3.1681: the giver's face, and the kit on offer. */
  var _portrait = npcPortrait(questPanel.npc);
  /* ═══ v2.3.1710: THE OFFER SHOWS WHAT YOU ARE WORKING TOWARD ═══
     Owner: "Quest item thumbnail rewards are not shown in the quest panel
     until after you accept the quest (only xp and gold are shown)."

     Until now this card illustrated ONE payout moment: `accept` while the
     quest was on offer, `complete` once it was active.  The reasoning
     (v2.3.1681) was that drawing the turn-in reward on an offer "would
     promise a reward you have not earned".  The owner has now looked at the
     other side of that: on tut_4 and life_2 every `gives` entry is a
     turn-in reward, so their offer cards showed NO art at all — gold and XP
     and nothing else — and on tut_1 the bow and staff appeared out of
     nowhere after accepting.  You could not see what the job paid before
     taking it, which is the one thing a quest offer is for.

     So the offer draws BOTH moments — but as two separately captioned
     groups, never as one row.  That distinction is the whole v2.3.1704
     lesson ("say WHEN, not who"): the same chip style in the same slot has
     to state its payout moment or a player cannot tell a promise from a
     hand-over.  The accept group keeps its existing caption; the turn-in
     group carries the same "for finishing this quest" wording it already
     has on the active card, so one string means one thing on both cards.
     An ACTIVE card still shows only the turn-in group — the kit is already
     in your bag by then, and re-drawing it would read as a second payout. */
  var _byWhen = function (when) {
    return (questPanel.quest.gives || []).filter(function (g) {
      return g && g.icon && g.when === when;
    });
  };
  var _giveGroups = (questPanel.status === 'available'
    ? [{ when: 'accept', label: 'He hands you now', items: _byWhen('accept') },
       { when: 'complete', label: 'For finishing this quest', items: _byWhen('complete') }]
    : [{ when: 'complete', label: 'For finishing this quest', items: _byWhen('complete') }]
  ).filter(function (g) { return g.items.length > 0; });
  /* ═══ v2.3.1704: SAY WHEN, NOT WHO ═══
     Owner: "The quest UI is a little confusing what's rewards for the next
     quests vs what's rewarded for the current quest."
     This card draws a quest's payout moments in the SAME slot, in the same
     chip style: a sword and a shield on the way out, a bow and a staff on the
     way back.  The only thing distinguishing them was the caption, and the
     captions were "He gives you" and "You receive" — two phrasings of the
     giver's grammar that say nothing at all about WHEN, so a player who saw a
     sword promised and later received a bow had no way to tell whether the bow
     belonged to this quest or the next one.
     Timing is the distinction that matters, so the captions state it — and
     since v2.3.1710 the offer shows both moments at once, which is only
     readable BECAUSE each group states its own. */
  return React.createElement("div", {
    className: "bt-inspect",
    onClick: function onClick() {
      return setQuestPanel(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-inspect-card",
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    style: {
      width: 'min(360px, calc(100vw - 24px))', /* v2.3.1234: was 300 fixed — fill narrow phones, never overflow */
      /* v2.3.1685: the card's height is left to the stylesheet's
         `max-height:100%` (game.css .bt-inspect-card) ON PURPOSE — that
         resolves against the overlay region ABOVE the dashboard, so the card
         never slides under the band.  An explicit taller cap was tried and
         put the primary button behind the dashboard, which is worse than
         scrolling.  What this card needed instead was for its ACTION to stay
         reachable while the body scrolls — see the sticky button below.
         `overscrollBehavior` keeps that scroll from chaining into the page
         behind it on iOS. */
      overscrollBehavior: 'contain',
      /* v2.3.1232: override legacy navy card with Lantern panel surface */
      background: '#202C32',
      border: '1px solid rgba(238,242,235,.14)',
      borderRadius: 14,
      boxShadow: '0 14px 30px rgba(4,7,9,.38)',
      padding: 16,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "bt-inspect-close",
    onClick: function onClick() {
      return setQuestPanel(null);
    }
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: panel title row — UI-Bible icon + 13/700 uppercase title */
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
      paddingBottom: 8,
      borderBottom: '1px solid rgba(238,242,235,.10)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "/icons/ui/panel-quests.webp",
    alt: "",
    draggable: false,
    style: {
      width: 24,
      height: 24,
      objectFit: 'contain'
    },
    onError: function onError(e) {
      e.currentTarget.replaceWith(document.createTextNode('📜'));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.10em',
      color: '#F7F2E7'
    }
  }, "Quest")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 44,
      marginBottom: 8
    }
  }, _portrait ? /*#__PURE__*/React.createElement("img", {
    /* v2.3.1681: his actual face.  Same head crop the sheet's quest page
       uses, so the portrait can never drift from the figure in the street.
       On error the <img> swaps itself for the letter disc rather than leaving
       a broken-image icon where the quest giver should be. */
    src: _portrait,
    alt: questPanel.npc,
    draggable: false,
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      objectFit: 'cover',
      background: '#121B20',
      border: '1px solid rgba(238,242,235,.16)',
      flexShrink: 0
    },
    onError: function onError(e) {
      var d = document.createElement('div');
      d.textContent = questPanel.npc.charAt(0);
      d.setAttribute('style', 'width:44px;height:44px;border-radius:50%;background:'
        + (((_questPanel$npcRef = questPanel.npcRef) === null || _questPanel$npcRef === void 0 ? void 0 : _questPanel$npcRef.color) || '#888')
        + ';display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#F7F2E7;flex-shrink:0');
      e.currentTarget.replaceWith(d);
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: ((_questPanel$npcRef = questPanel.npcRef) === null || _questPanel$npcRef === void 0 ? void 0 : _questPanel$npcRef.color) || '#888',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      fontWeight: 900,
      color: '#F7F2E7',
      flexShrink: 0
    }
  }, questPanel.npc.charAt(0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: '#F7F2E7'
    }
  }, questPanel.npc), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#96A2A0'
    }
  }, questPanel.status === 'available' ? 'New Quest!' : questPanel.status === 'active' ? 'Quest Active' : ''))), _giveGroups.length > 0 && /*#__PURE__*/React.createElement("div", {
    /* v2.3.1681: the kit, pictured.  Sits high — directly under his name,
       above the dialogue — because the card scrolls on a phone and anything
       below the quest text is behind the fold.  The owner asked to SEE the
       sword and shield; putting them where the reward line goes would have
       meant scrolling to find them.  v2.3.1710 keeps them here for the same
       reason, and it is the reason the second group is affordable: "what does
       this quest pay" has to be answerable without scrolling, or it has not
       been answered. */
    /* v2.3.1704: the caption moved from BESIDE the chips to ABOVE them.  It
       used to be a `flexShrink:0` column next to them, which was fine for two
       words ("You receive") and would have eaten most of a 390px card now that
       it states the payout moment.  Stacked, the caption gets a full line, the
       chips keep the full width, and the paddingTop:12 that was faking optical
       centring against the chips is no longer needed — so this costs about six
       pixels, not a row. */
    /* v2.3.1710: now a LIST of captioned groups (usually one; two on an offer
       that pays at both moments).  The 8px gap between groups is deliberately
       tighter than the 12px below the block, so the two groups read as one
       "what this pays" region rather than as two unrelated rows. */
    style: {
      marginBottom: 12,
      paddingTop: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, _giveGroups.map(function (grp) {
    return /*#__PURE__*/React.createElement("div", {
      key: grp.when,
      /* A stable hook for mp-questui, which has to prove the bow is drawn
         under the FINISHING caption and not under the hand-over one — the
         two groups are otherwise identical markup and a text search of the
         card cannot tell which chip belongs to which caption. */
      'data-gives': grp.when,
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.12em',
        color: '#96A2A0',
        marginBottom: 5
      }
    }, grp.label), /*#__PURE__*/React.createElement("div", {
      style: { display: 'flex', gap: 8, flexWrap: 'wrap' }
    }, grp.items.map(function (g, i) {
      return /*#__PURE__*/React.createElement(ItemChip, { key: g.icon + i, item: g });
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: '#F7F2E7',
      marginBottom: 4
    }
  }, questPanel.quest.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: '#B9C1BF',
      lineHeight: 1.5,
      marginBottom: 10
    }
  }, questPanel.status === 'available' ? questPanel.quest.dialogue.start : questPanel.quest.check(rpgState, stateRef.current) ? questPanel.quest.dialogue.complete : questPanel.quest.dialogue.progress), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1232: objective sits in a recessed well */
    style: {
      padding: 10,
      borderRadius: 8,
      background: '#121B20',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0',
      marginBottom: 3
    }
  }, "Objective"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: '#F7F2E7'
    }
  }, questPanel.quest.desc), questPanel.quest.check(rpgState, stateRef.current) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: '#59BF91',
      marginTop: 4
    }
  }, "✓ Complete!")), /*#__PURE__*/React.createElement("div", {
    /* ═══ v2.3.1704: THE NUMBERS NAME THEIR OWN QUEST ═══
       Owner: "The quest UI is a little confusing what's rewards for the next
       quests vs what's rewarded for the current quest."
       This line said "REWARD  💰25g · ⭐40XP" and nothing else.  On an OFFER
       card it sits below the chip row that has just shown a sword and a shield
       under a caption of its own, so the card holds two payouts with only one
       of them attributed — and because tut_1's dialogue carries the whole
       control tutorial, this line is below the fold on a 390px phone, so the
       only "reward" a new player ever actually sees for the quest they are
       accepting is the accept kit.  Saying WHICH quest and WHEN, right here on
       the numbers, is what makes the two unmistakable; it wraps to a second
       line on a narrow card rather than truncating, which is why the row is
       `flexWrap` now instead of a single baseline run. */
    style: {
      display: 'flex',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '.12em',
      color: '#96A2A0'
    }
  }, 'For finishing “' + questPanel.quest.title + '”'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: '#F7F2E7'
    }
  }, "💰", questPanel.quest.reward.gold, "g \xB7 ⭐", questPanel.quest.reward.xp, "XP")), /*#__PURE__*/React.createElement("div", {
    /* ═══ v2.3.1681: THE BUTTON STAYS ON SCREEN ═══
       The card is already a scroll container (game.css clamps it to the game
       area, above the dashboard band).  That was fine when the dialogue was
       three lines; it is not fine now that the opening quest carries the
       control instructions AND a row of item thumbnails, which push "Accept
       Quest" below the fold on a phone.  It was still reachable by scrolling,
       and the scrollbar is deliberately hidden, so the very first interaction
       in the game was a button a new player had no reason to believe existed.
       Sticky footer instead: the text scrolls, the one action never leaves.
       The negative margins bleed the card's own surface to the card's edges
       so scrolling text passes UNDER an opaque strip rather than beside it. */
    style: {
      position: 'sticky',
      bottom: -16,
      background: '#202C32',
      marginLeft: -16, marginRight: -16, marginBottom: -16,
      padding: '8px 16px 16px',
      boxShadow: '0 -10px 12px rgba(32,44,50,.92)'
    }
  }, questPanel.status === 'available' && /*#__PURE__*/React.createElement("button", {
    style: {
      /* v2.3.1232: brass primary — the region's one primary action */
      width: '100%',
      minHeight: 44,
      padding: '10px',
      borderRadius: 11,
      border: 'none',
      background: (_needsXpChoice && !xpCat) ? '#293B41' : '#D8A85F',
      color: (_needsXpChoice && !xpCat) ? '#F4F0E7' : '#20170D',
      boxShadow: (_needsXpChoice && !xpCat) ? 'inset 0 0 0 1px #D8A85F' : 'none',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer'
    },
    onClick: function onClick() {
      /* v2.3.782: body moved to src/game/quests.js (Phase 3). */
      acceptQuest(stateRef.current, questPanel, { setRpgState: setRpgState, setQuestPanel: setQuestPanel });
    }
  }, "Accept Quest"), questPanel.status === 'active' && questPanel.quest.check(rpgState, stateRef.current) && /*#__PURE__*/React.createElement(React.Fragment, null,
    /* v2.3.1685: the picker sits ABOVE the button it unlocks, so the reason
       the button is dim is the thing you just read. */
    _needsXpChoice && /*#__PURE__*/React.createElement(XpChooser, {
      xp: _xpAmt, xpCat: xpCat, setXpCat: setXpCat,
    }),
    /*#__PURE__*/React.createElement("button", {
    /* v2.3.1765: A STABLE HOOK, BECAUSE THE LABEL IS NOT ONE.
       Renaming this button from "Turn In Quest" to "Redeem Reward" in
       v2.3.1764 broke three QA scenarios at once — each clicked it by the word
       "Turn In", each swallowed the miss with .catch(), and the questline run
       then failed eight quests downstream with "the WORKER marked it turned
       in {tut_1: active}", which points at the server and not at a button
       caption.  The label is owner-facing copy and will be reworded again;
       this class is the contract the harnesses hold. */
    className: 'bt-quest-turnin',
    'aria-disabled': _needsXpChoice && !xpCat,
    style: {
      /* v2.3.1232: brass primary (only one button renders per status) */
      width: '100%',
      minHeight: 44,
      padding: '10px',
      borderRadius: 11,
      border: 'none',
      background: (_needsXpChoice && !xpCat) ? '#293B41' : '#D8A85F',
      color: (_needsXpChoice && !xpCat) ? '#F4F0E7' : '#20170D',
      boxShadow: (_needsXpChoice && !xpCat) ? 'inset 0 0 0 1px #D8A85F' : 'none',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer',
      /* ═══ v2.3.1764: NOT-READY IS NOT THE SAME AS NOT-VISIBLE ═══
         Owner: "the choose a skill to train button is all faded like you can
         barely see it."  v2.3.1685 dimmed the whole control to opacity .5 to
         say "not ready" — but this is dark text on brass over a dark card, so
         halving the opacity took the LABEL with it and the instruction telling
         you what to do became the hardest thing on the card to read.
         The not-ready state is now a secondary SURFACE instead: full opacity,
         bright text on the card's own secondary fill with a brass edge.  It
         still reads as "this is not the gold button yet" — which was the real
         intent — while the words stay legible. */
      /* v2.3.1685: PINNED.  This dialogue's content already overflowed its
         box before the picker existed (441px of content in 423px on main —
         the rewards row was the casualty), and the picker adds ~74px more.
         Sticky keeps the one action the card exists for on screen while the
         body scrolls under it, which beats both a button below the fold and
         a taller card sliding under the dashboard.  The brass fill is opaque,
         so scrolled content passes behind it cleanly. */
      position: 'sticky',
      bottom: 0
    },
    onClick: function onClick() {
      /* v2.3.1685: refuse locally what the worker would refuse anyway.
         Without this the client runs its own congratulation path — gold,
         XP and 'turnedIn' all applied locally — for a turn-in the worker
         throws away, and the next player_state quietly takes it all back. */
      if (_needsXpChoice && !xpCat) return;
      /* v2.3.782: body moved to src/game/quests.js (Phase 3). */
      turnInQuest(stateRef.current, questPanel, { setRpgState: setRpgState, setQuestPanel: setQuestPanel }, xpCat);
    }
  }, _needsXpChoice && !xpCat ? "Choose a skill to train" : _redeemLabel)))));
}
