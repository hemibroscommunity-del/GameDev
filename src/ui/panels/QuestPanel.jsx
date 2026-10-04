import React from 'react';
import { BT_AUDIO } from '@/data/index.js'; /* v2.3.2637: ui-close tick */
import { acceptQuest, turnInQuest } from '@/game/quests.js';
import { NPC_DATA } from '@/data/gameDisplay.js';
import { prog3Live, PROG3_SKILL_META } from '@/data/prog3.js';
import { questObjectiveDone } from '@/data/index.js'; /* v2.3.1914 */
/* v2.3.1820: the two screens this panel now drives — he talks, then you
   choose.  See the note above the render for why the old single card was
   split rather than restyled. */
import { NpcDialogue } from './NpcDialogue.jsx';
import { QuestOfferPanel } from './QuestOfferPanel.jsx';
import { QuestSkillChip } from './questArt.jsx'; /* v2.3.3030: the owner's skill chips */

/* v2.3.3030: how long the claim's confirmation ("Rewards claimed!") stays
   before he offers his next quest -- long enough for the coins and the items
   to land (game/questFly.js: ~1.5 s for the last), short enough that the
   next thing he says is not waited for.  A tap goes on at once. */
export var QUEST_CLAIMED_MS = 1900;

/* v2.3.1681 (owner: "Add thumbnail of mayor bro's profile picture in quest
   dialog box and also thumbnail of the quest items (sword and shield)").
   Looked up by the NAME the quest chain stores — the same key getNpcQuest
   matches on — so there is no second id to keep in sync.  Null for a giver
   with no art, which falls back to the initial-letter disc below. */
/* v2.3.1820: npcPortrait removed with the old card — NpcDialogue resolves its own art, and prefers the FULL figure over this head crop */

/* One item chip: art over its name.  Small (40px) — this is a "here is what
   it looks like" cue beside the text, not a shop listing.  A missing file
   removes the whole chip rather than leaving a broken-image glyph in the
   middle of the dialogue. */
/* v2.3.1820: ItemChip moved to QuestOfferPanel, where the items are the point of the screen and are drawn at 64px instead of 40 */

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
/* ═══ v2.3.3030: THE CHOICE ON THE OWNER'S GREEN PANEL, WITH THEIR CHIPS ═══
   Owner's mockup of the new quest windows: "PUT 30 WEAPON XP INTO -- Melee /
   Bow / Magic", each a chip with its weapon drawn in, the chosen one in a gold
   ring with a check.  The panel is the owner's green one (the v2.3.1795 green
   wash said "reward" in the same colour), the chips are theirs
   (questArt.jsx QuestSkillChip), and the +XP still breathes three times as
   it appears (.bt-xp-payout).  What the QA suite measures is kept:
   `data-xp-caption` on the instruction (13px, never ellipsised -- it wraps
   rather than truncating), `data-xp-skill` on each button with its label as
   the button's own text node, 14px, on one line, 44px tall at least. */
export function XpChooser(props) {
  var xp = props.xp, xpCat = props.xpCat, setXpCat = props.setXpCat;
  return React.createElement("div", { className: 'bt-qw-green' },
    React.createElement("div", { className: 'bt-qw-green-head' },
      React.createElement("b", { className: 'bt-xp-payout' }, '+' + xp + ' XP'),
      ' ',
      React.createElement("span", { 'data-xp-caption': '' }, 'Choose where to train it')),
    React.createElement("div", { className: 'bt-qw-chips' }, PROG3_SKILL_META.map(function (sk) {
      return React.createElement(QuestSkillChip, {
        key: sk.key, skill: sk.key, label: sk.label, selected: xpCat === sk.key,
        onClick: function () { setXpCat(sk.key); },
      });
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
  /* v2.3.2637: the quest pop-up is the owner's own example of the ui-close
     case ("closing a window (like quest pop up)").  ONE helper rather than
     the sound copied onto each exit: this panel closes from three places --
     the X, the backdrop, and the decline branch -- and three copies is three
     chances for the next exit added to be the silent one. */
  var _closeQuestPanel = function () {
    BT_AUDIO.uiTick('ui-close', 0.5);
    setQuestPanel(null);
  };
  /* v2.3.1685: which skill this turn-in's XP trains (see XpChooser). Local
     to the open dialogue — closing it and coming back asks again, which is
     right: it is a decision about THIS payout, not a saved preference. */
  var _xpCatState = React.useState(null),
    xpCat = _xpCatState[0],
    setXpCat = _xpCatState[1];
  var _xpAmt = (questPanel.quest.reward && questPanel.quest.reward.xp) || 0;
  /* v2.3.1820: restored verbatim — the tidy-up that removed the old card's
     redeem-label block took these two with it, and they are not part of it:
     they decide whether the CLAIM screen carries the XP-skill chooser
     (v2.3.1685).  Read from stateRef first because rpgState can lag a frame
     behind the worker's echo. */
  var _liveRpg = (stateRef && stateRef.current && stateRef.current.rpg) || rpgState;
  var _needsXpChoice = prog3Live(_liveRpg) && _xpAmt > 0;
  /* ═══ v2.3.1764: SAY WHAT THE BUTTON DOES ═══
     Owner: "When you turn in a quest it needs to be more obvious that you're
     redeeming a reward."  "Turn In Quest" describes handing something OVER —
     the half of the trade the player already did.  The button is the moment
     they COLLECT, so it says so, and it names the payout: the reward chips
     above are what you will get, and this is the same fact on the control that
     grants it, where nobody has to scroll to find it. */
  /* v2.3.1820: the v2.3.1710 note that stood here described the OLD card
     drawing both payout moments as two captioned groups inside one panel.
     They are on two screens now — the accept window shows what he hands you
     now, the claim window shows what finishing it paid — so each states its
     timing by BEING a different screen rather than by a caption alone.  The
     v2.3.1704 lesson it rested on is restated below and still holds. */
  /* v2.3.1820: the _byWhen / _giveGroups pair moved into QuestOfferPanel.
     It now picks ONE moment rather than grouping both, because the two
     moments are on two different screens: the accept window shows what he
     hands you now, and the claim window shows what finishing it paid.  The
     v2.3.1704 note below is why each still states its own timing. */
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
  /* ═══ v2.3.1820: TWO SCREENS, NOT ONE CARD ═══
     Owner: "Instead did the thumbnail and reading through the quest dialog
     menu I'd rather have an NPC message window that has a larger picture of
     him on the left side of the window and just the text of what he's saying
     in sequential order chunks.  Then a new 'Accept quest' window pops up
     with the items shown that will be handed over on accepting it (the 'the
     hands you now').  Same with claiming quest rewards."

     The old card did two jobs at once: a 40px head, everything he says, the
     objective, both payout moments as chips and the Accept button all shared
     one scrolling panel — so the thing you had to READ competed with the
     thing you had to DECIDE, and on a phone the deciding half was often below
     the fold.  Now: he talks (NpcDialogue), then you choose
     (QuestOfferPanel).

     `stage` is local to the open dialogue, like xpCat above and for the same
     reason: walking away and coming back should start the conversation over,
     because you may not remember what he said.

     NOTHING IS DROPPED IN THE SPLIT.  The XP-skill chooser rides onto the
     claim screen as `extra`, and the claim button keeps `bt-quest-turnin` —
     the class the QA harnesses click by (see QuestOfferPanel). */
  var _stageState = React.useState('talk'),
    stage = _stageState[0],
    setStage = _stageState[1];

  /* ═══ v2.3.1828: HE TALKS AGAIN WHEN THE SUBJECT CHANGES ═══
     Owner: "The quest complete loop is broken.  It says I finished the quest
     and rewards me."

     He was right, and this was the whole of it.  `stage` was state with no
     reset, and the panel deliberately STAYS OPEN across a change of subject:
     acceptQuest flips the same card to `active` (so he can answer you rather
     than the screen going blank), and turnInQuest re-opens it on his NEXT
     quest (v2.3.1713).  Both leave `stage` on 'act' — so the act screen
     re-rendered against a quest it had never introduced.

     On ACCEPT that is exactly what the owner saw: the quest is now `active`
     rather than `available`, so `_isOffer` goes false, and the act stage
     renders the REWARD face — "Quest Complete", the completion items, and a
     Claim Reward button — for a quest you have not started.  The claim is
     then refused by the worker (the objective is not met), so it is a dead
     end dressed as a payout.

     Keyed on the quest AND its status because both are a change of subject:
     a new quest needs its opening line, and the same quest going
     active/ready needs the line that goes with the new state.  NpcDialogue
     already does this for its own chunk index (`setI(0)` on `text`); this is
     the same rule one level up, and the level it was missing from.

     Every other scenario missed it by CLOSING the panel after accepting —
     mp-questloop now stays put, which is what a player does. */
  var _subject = questPanel.quest.id + ':' + questPanel.status;
  /* ═══ v2.3.3030: THE CLAIM'S CONFIRMATION, THEN HIS NEXT QUEST ═══
     Owner's mockup: after the claim, a window that "shows what was received"
     while "items and XP animate to inventory/HUD".  So a claim no longer
     re-opens on his next quest at once: turnInQuest pays (and predicts) as
     it always did and hands back the next panel, the window becomes the
     confirmation (QuestOfferPanel `claimed`), and QUEST_CLAIMED_MS later --
     or at a tap -- the next panel opens, the v2.3.1713 behaviour, one beat
     later.  `_claimRef` is also the once-only latch: a second tap, or the
     third of mp-questloop's triple click, finds a claim in flight and does
     nothing, so nothing can be sent twice. */
  var _claimedState = React.useState(null),
    claimed = _claimedState[0],
    setClaimed = _claimedState[1];
  var _claimRef = React.useRef(null);
  var _finishClaim = function () {
    var c = _claimRef.current;
    if (!c) return;
    if (c.timer) clearTimeout(c.timer);
    _claimRef.current = null;
    setQuestPanel(c.next || null);
  };
  React.useEffect(function () {
    setStage('talk');
    /* a change of subject from anywhere else ends a confirmation without
       opening what it was going to open */
    setClaimed(null);
    var c = _claimRef.current;
    if (c && c.timer) clearTimeout(c.timer);
    _claimRef.current = null;
  }, [_subject]);
  React.useEffect(function () {
    return function () { var c = _claimRef.current; if (c && c.timer) clearTimeout(c.timer); };
  }, []);

  var _isOffer = questPanel.status === 'available';
  /* v2.3.1914: the LIVE rpg, not the React snapshot — see questObjectiveDone.
     BroTown opened this panel because check(S.rpg) said the reward was ready;
     asking the snapshot the same question got a different answer and drew his
     progress line over a finished quest. */
  var _canTurnIn = questPanel.status === 'active'
    && questObjectiveDone(questPanel.quest, stateRef.current, rpgState);

  /* Which of the three things he says.  Same selection the old card made in
     one line, kept identical so no dialogue string changes meaning here. */
  var _speech = _isOffer
    ? questPanel.quest.dialogue.start
    : (_canTurnIn ? questPanel.quest.dialogue.complete : questPanel.quest.dialogue.progress);

  /* A quest in progress has nothing to decide — he tells you how it is going
     and that is the end of it, so his last button closes rather than opening
     an offer screen with no offer on it. */
  var _hasDecision = _isOffer || _canTurnIn;

  if (stage === 'talk') {
    return React.createElement(NpcDialogue, {
      npcName: questPanel.quest.npc,
      text: _speech,
      ctaLabel: _isOffer ? 'See the quest' : (_canTurnIn ? 'Claim reward' : 'Close'),
      /* v2.3.2289: lock the backdrop only on the face that leads to a payout.
         An offer stays dismissible (nothing is owed yet) and so does a
         progress check-in (there is nothing to lose and its CTA is 'Close'). */
      lockScrim: !_isOffer && _canTurnIn,
      onClose: function () { return _closeQuestPanel(); },
      onDone: function () {
        /* v2.3.3030: nothing to choose (no XP, or no prog3 to place it in) --
           the mockup's AUTO REWARD: no window at all, the rewards paid at
           once, the banner with its laurel check, the coins and items flying
           straight to the HUD (turnInQuest `auto`), and his next quest. */
        if (!_isOffer && _canTurnIn && !_needsXpChoice) {
          turnInQuest(stateRef.current, questPanel,
            { setRpgState: setRpgState, setQuestPanel: setQuestPanel }, undefined, { auto: true });
          return;
        }
        if (_hasDecision) setStage('act');
        else _closeQuestPanel();
      },
    });
  }

  return React.createElement(QuestOfferPanel, {
    mode: _isOffer ? 'offer' : 'reward',
    quest: questPanel.quest,
    gold: (questPanel.quest.reward && questPanel.quest.reward.gold) || 0,
    xp: _xpAmt,
    /* The chooser only exists when prog3 is live and there is XP to place —
       _needsXpChoice is computed above and unchanged. */
    extra: (!_isOffer && _needsXpChoice)
      ? React.createElement(XpChooser, { xp: _xpAmt, xpCat: xpCat, setXpCat: setXpCat })
      : null,
    confirmClass: _isOffer ? null : 'bt-quest-turnin',
    confirmDisabled: !_isOffer && _needsXpChoice && !xpCat,
    claimed: !_isOffer ? claimed : null,
    onClaimedDone: _finishClaim,
    onClose: function () { return _closeQuestPanel(); },
    onConfirm: function () {
      if (_isOffer) {
        acceptQuest(stateRef.current, questPanel,
          { setRpgState: setRpgState, setQuestPanel: setQuestPanel });
        return;
      }
      if (_claimRef.current) return;
      /* v2.3.3030: paid now, his next quest after the confirmation (above);
         `compact` puts the QUEST COMPLETE! banner at the top of the screen,
         clear of the confirmation window */
      var _next = turnInQuest(stateRef.current, questPanel,
        { setRpgState: setRpgState, setQuestPanel: setQuestPanel }, xpCat, { deferNext: true, compact: true });
      _claimRef.current = { next: _next, timer: setTimeout(_finishClaim, QUEST_CLAIMED_MS) };
      setClaimed({ xpCat: xpCat });
    },
  });
}
