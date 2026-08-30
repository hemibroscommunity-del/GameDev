import React from 'react';
import { acceptQuest, turnInQuest } from '@/game/quests.js';
import { NPC_DATA } from '@/data/gameDisplay.js';
import { prog3Live, PROG3_SKILL_META } from '@/data/prog3.js';
import { questObjectiveDone } from '@/data/index.js'; /* v2.3.1914 */
/* v2.3.1820: the two screens this panel now drives — he talks, then you
   choose.  See the note above the render for why the old single card was
   split rather than restyled. */
import { NpcDialogue } from './NpcDialogue.jsx';
import { QuestOfferPanel } from './QuestOfferPanel.jsx';

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
      /* v2.3.2154: 7 -> 9. At 11px the caption read as a footnote and the gap
         did not matter; at 13px it sits shoulder to shoulder with the payout
         and "+70 XPCHOOSE WHERE TO TRAIN IT" runs together. 11 was the first
         try and it cost 2px more than the row had -- the caption carries an
         ellipsis, so it paid for the gap by truncating to "...TRAIN I…", which
         is a worse outcome than the small type it replaced. 9, with the
         letter-spacing trimmed a notch below, buys the separation and keeps
         the whole sentence. mp-questxp asserts BOTH, so the next size bump
         cannot quietly spend the sentence again. */
      display: 'flex', alignItems: 'baseline', gap: 9,
      marginBottom: 6, minWidth: 0,
    },
  }, /*#__PURE__*/React.createElement("span", {
    /* v2.3.1795: breathes three times as the payout appears, then rests —
       see .bt-xp-payout in game.css for why it is finite rather than ambient. */
    className: 'bt-xp-payout',
    style: { fontSize: 17, fontWeight: 700, color: '#61B06B', flex: 'none', lineHeight: 1 },
  }, '+' + xp + ' XP'), /*#__PURE__*/React.createElement("span", {
    /* v2.3.2154: a stable hook. This span and the three buttons below have no
       id of their own, and a size is only a size if something measures it. */
    'data-xp-caption': '',
    style: {
      /* v2.3.2154 (owner: "Make the 'choose where to train it' font size and
         icon labels larger"). 11 -> 13, and the muted grey lifts with it: this
         line is the INSTRUCTION for the only decision on the screen, and at
         11px in 55% white it read as a footnote to the XP number beside it. It
         keeps its ellipsis, so a narrow phone truncates rather than reflowing
         the row the payout sits on. */
      fontSize: 13, fontWeight: 600, letterSpacing: '.04em',
      textTransform: 'uppercase', color: 'rgba(238,242,235,.72)',
      minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    },
  }, 'choose where to train it')), /*#__PURE__*/React.createElement("div", {
    style: { display: 'flex', gap: 5 },
  }, PROG3_SKILL_META.map(function (sk) {
    var on = xpCat === sk.key;
    return /*#__PURE__*/React.createElement("button", {
      key: sk.key,
      'data-xp-skill': sk.key,     /* v2.3.2154: see the caption's note */
      'aria-pressed': on,
      onClick: function onClick(e) { e.stopPropagation(); setXpCat(sk.key); },
      style: {
        flex: '1 1 0', minWidth: 0, minHeight: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        background: on ? 'rgba(216,168,95,.18)' : 'transparent',
        border: '1px solid ' + (on ? '#D8A85F' : 'rgba(238,242,235,.18)'),
        borderRadius: 10,
        color: on ? '#D8A85F' : '#EEF2EB',
        /* v2.3.2154: 12 -> 14 on the label, 18 -> 22 on the icon below.
           These three buttons are where the quest's XP actually goes, and
           Melee / Bow / Magic were set two sizes under the panel's own body
           text. Both move together on purpose: enlarging the label alone
           leaves an icon that reads as a bullet point beside it.
           `nowrap` because this is a three-across row on a 390px phone, and
           bigger type is exactly how a label starts wrapping -- mp-questxp
           measures the rendered line count rather than trusting that. */
        fontFamily: 'inherit', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
        cursor: 'pointer', touchAction: 'manipulation',
      },
    }, /*#__PURE__*/React.createElement("img", {
      src: sk.iconSrc, alt: "", draggable: false,
      style: { width: 22, height: 22, objectFit: 'contain', flex: 'none', pointerEvents: 'none' },
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
  React.useEffect(function () { setStage('talk'); }, [_subject]);

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
      onClose: function () { return setQuestPanel(null); },
      onDone: function () {
        if (_hasDecision) setStage('act');
        else setQuestPanel(null);
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
    onClose: function () { return setQuestPanel(null); },
    onConfirm: function () {
      if (_isOffer) {
        acceptQuest(stateRef.current, questPanel,
          { setRpgState: setRpgState, setQuestPanel: setQuestPanel });
        return;
      }
      turnInQuest(stateRef.current, questPanel,
        { setRpgState: setRpgState, setQuestPanel: setQuestPanel }, xpCat);
    },
  });
}
