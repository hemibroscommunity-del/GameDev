import React from 'react';
import { createPortal } from 'react-dom';
import { PROG3_SKILL_META } from '@/data/prog3.js';
import { QuestFrame, QuestCloseX, QuestPay, QuestCaption, QuestSlot, QuestClaimButton, QuestClaimed, QUEST_COIN } from './questArt.jsx';
import { flyQuestRewards } from '@/game/questFly.js';

/* ═══ v2.3.1820: THE DECISION, ON ITS OWN SCREEN ═══
 *
 * Owner: "Then a new 'Accept quest' window pops up with the items shown that
 * will be handed over on accepting it (the 'the hands you now').  Same with
 * claiming quest rewards."
 *
 * The second half of splitting the old quest card in two.  NpcDialogue is him
 * talking; this is you choosing, and it carries only what the choice needs:
 * what the errand is, and what changes hands.
 *
 * ONE COMPONENT, TWO MOMENTS.  Accepting and claiming are the same shape —
 * a title, an objective line, a row of items, one button — and the owner
 * asked for them to match ("same with claiming quest rewards").  Writing them
 * as one component is how they stay matched; two files drift the moment one
 * gets a tweak.  `mode` picks the words and which payout moment is shown.
 *
 * "He hands you now" is the OWNER'S phrasing, and it predates this window:
 * v2.3.1704 already labelled the accept-time group that way, after they
 * reported the old card was confusing about which rewards belonged to which
 * quest.  Keeping the exact words means this screen answers a question they
 * have already had answered once.
 */

/* ═══ v2.3.3030: BOTH MOMENTS IN THE OWNER'S PAINTED FRAME, AND A THIRD ═══
 *
 * Owner, with three sheets of art and a mockup of the flow: "Add these for
 * the new quest windows."  The window is the owner's framed navy panel with
 * the crest (questArt.jsx QuestFrame), each reward in its painted slot and
 * drawn larger, the payout as the HUD's own coin and XP, the claim the
 * owner's gold bar (grey until it can be pressed), the close the round X.
 * Accept and claim stay ONE component in one frame, for the reason above.
 *
 * And the mockup's third step, the CLAIM CONFIRMATION: once you claim, the
 * window says what you got -- "Rewards claimed!", the slots glowing, where
 * the XP went -- while the coins fly into the purse and the items into the
 * bag (game/questFly.js), and a moment later he offers his next quest
 * (QuestPanel times it; a tap goes straight on).  It is drawn WITHOUT the
 * `.bt-qoffer` class, deliberately: every scenario and harness helper reads
 * `.bt-qoffer` as "an offer is on screen, act on it", and a confirmation is a
 * moment to look at, not a surface to act on (`data-qw-stage="done"`).
 *
 * The contracts the QA suite reads stay where they were: `.bt-qoffer`,
 * `.bt-qoffer-kicker`, `.bt-qoffer-title`, `.bt-qoffer-pay`, `[data-gives]`
 * with its caption first, `.bt-qoffer-go`, `.bt-quest-turnin`,
 * `[data-tut="qoffer-confirm"]` with aria-disabled, `[data-qa="dlg-close"]`
 * and its aria-label, and the words "Accept Quest", "Claim Rewards", "Quest
 * Complete", "For finishing “…”". */

/* v2.3.3030: the items of one moment, each in its slot.  Three or more get a
   size down so they still sit on one row. */
function Items({ list, glow }) {
  return (
    <div className={'bt-qw-items' + (list.length >= 3 ? ' bt-qw-items--3' : '')}>
      {list.map((it, n) => <QuestSlot key={n} item={it} glow={glow} />)}
    </div>
  );
}

/* v2.3.3030: the claim's confirmation (see the header). */
function Claimed(props) {
  const { quest, claimed, gold, xp, items, onDone } = props;
  const winRef = React.useRef(null);
  const skill = claimed && claimed.xpCat
    ? PROG3_SKILL_META.find((s) => s.key === claimed.xpCat) : null;
  /* the flights leave from where the reward is drawn, a beat after the
     window has turned into the confirmation */
  React.useEffect(() => {
    const t = setTimeout(() => {
      const w = winRef.current;
      if (!w) return;
      const goldEl = w.querySelector('[data-qw-gold] img') || w.querySelector('[data-qw-gold]');
      const slots = [...w.querySelectorAll('.bt-qw-slot-icon')];
      flyQuestRewards({
        gold, goldFrom: goldEl, goldSrc: QUEST_COIN,
        items: slots.map((el) => ({ el, src: el.getAttribute('src') })),
      });
    }, 260);
    return () => clearTimeout(t);
  }, []);
  return createPortal((
    /* the scrim lighter than the decision's: the purse and the dashboard the
       rewards fly to are under it, and should be seen to catch them */
    <div className="bt-npcdlg-scrim bt-noselect bt-qw-scrim--done" onClick={(e) => { e.stopPropagation(); onDone && onDone(); }}>
      <div ref={winRef} className="bt-qw-done-wrap" data-qw-stage="done">
        <QuestFrame className="bt-qw--done" onClick={(e) => { e.stopPropagation(); onDone && onDone(); }}>
          <div className="bt-qw-col bt-qw-col--a">
            <div className="bt-qw-kicker">Quest Complete</div>
            <div className="bt-qw-title">{quest && quest.title}</div>
            <QuestPay gold={gold} xp={xp} />
            {items.length > 0 && <QuestCaption>Your rewards</QuestCaption>}
            {items.length > 0 && <Items list={items} glow />}
          </div>
          <div className="bt-qw-col bt-qw-col--b">
            {skill && xp ? (
              <div className="bt-qw-xpline" data-qw-xpline={skill.key}>
                <img src={skill.iconSrc} alt="" draggable={false} />
                {'+' + xp + ' XP to ' + skill.label}
              </div>
            ) : null}
            <QuestClaimed>Rewards claimed!</QuestClaimed>
          </div>
        </QuestFrame>
      </div>
    </div>
  ), document.body);
}

export const QuestOfferPanel = (props) => {
  const {
    mode, quest, onConfirm, onClose, gold, xp,
    /* v2.3.1820: the claim screen carries two things the accept screen does
       not, and both are pre-existing contracts rather than decoration.
       `extra` is where the XP-skill chooser goes (v2.3.1685 — which skill
       this payout trains is a decision about THIS turn-in), and
       `confirmClass` keeps `bt-quest-turnin` on the button.  That class is
       what the QA harnesses click by: renaming the LABEL in v2.3.1764 broke
       three scenarios at once, each swallowing the miss with .catch() until
       the questline failed eight quests downstream pointing at the server.
       The caption is owner-facing copy and will change again; the class is
       the contract. */
    extra, confirmClass, confirmDisabled,
    /* v2.3.3030: set once the claim is made -- the window becomes the
       confirmation ({ xpCat }), and `onClaimedDone` moves on at once. */
    claimed, onClaimedDone,
  } = props;
  const offering = mode !== 'reward';
  const all = (quest && quest.gives || []).filter((g) => g && g.icon);
  const nowItems = all.filter((g) => g.when === 'accept');
  const endItems = all.filter((g) => g.when === 'complete');
  /* v2.3.1827: the ACCEPT screen shows BOTH moments again, captioned.
     v2.3.1820 cut it to the hands-you-now group because the owner named that
     group when asking for this panel — but they were asking for a clearer
     screen, not for less information, and the old card had shown both since
     v2.3.1710.  "What do I get for finishing this" is the other half of
     deciding whether to accept, and dropping it silently is the kind of
     quiet loss a rework is not entitled to make.
     The REWARD screen still shows only the completion group: the hands-you-
     now items have been in your bag since you accepted, and listing them
     under "for finishing this quest" would be claiming to pay them twice. */
  /* v2.3.1827: the completion caption NAMES the quest, as the old card did.
     With both groups on screen at once, "for finishing this quest" is
     ambiguous the moment he has a second one queued behind it — and the
     name is the thing that makes the promise concrete. */
  const finishing = `For finishing “${(quest && quest.title) || 'this quest'}”`;
  const groups = offering
    ? [['accept', 'He hands you now', nowItems], ['complete', finishing, endItems]]
      .filter(([, , list]) => list.length > 0)
    : [['complete', finishing, endItems]].filter(([, , list]) => list.length > 0);

  if (claimed) {
    return <Claimed quest={quest} claimed={claimed} gold={gold} xp={xp} items={endItems} onDone={onClaimedDone} />;
  }

  /* ═══ v2.3.1827: PORTALED, OR THE DASHBOARD EATS THE BUTTON ═══
     `.brotown-wrap` is position:fixed and therefore its own stacking
     context, so anything rendered inside it paints BELOW the dashboard band
     (fixed, z 30, outside the wrap) however high its own z-index goes —
     TRAPS §20, and the same reason DuelRequestPanel portals.

     The CSS for this window already said these must be SIBLINGS of the wrap.
     They were not, and the cost was not cosmetic: the dashboard covered the
     lower two thirds of the panel, so the CENTRE of Claude Reward sat under
     it and a real tap never reached the button.  The reward was unclaimable
     — caught by a Playwright click timing out where an in-page .click()
     (which skips hit-testing) had been passing. */
  return createPortal((
    /* ═══ v2.3.2289: THE BACKDROP HONOURS THE CARD'S OWN POLICY ═══
       Twenty lines below, this panel deliberately withholds a "Not now" from
       the reward face, and says why: "A finished quest's reward is already
       earned, so a 'not now' there is a way to lose track of payment you are
       owed." The scrim then handed that exact escape back -- a full-viewport
       dismiss with a live band right under the Claim button.

       Now the backdrop follows the same rule the buttons do: dismissible while
       he is offering, inert once you are owed. The reward is not destroyed
       either way (the worker keeps the quest claimable), so this is about not
       making you walk back for it. */
    /* v2.3.2311: `bt-noselect` for the same reason as NpcDialogue -- see the
       note there. This panel portals into document.body too, so it inherits
       nothing from .brotown-wrap and needs its own declaration. */
    <div className="bt-npcdlg-scrim bt-noselect" onClick={offering ? onClose : undefined}>
      <QuestFrame className={'bt-qoffer bt-qw--' + (offering ? 'offer' : 'reward')} onClick={(e) => e.stopPropagation()}>
        {!offering && (
          /* v2.3.2289: the deliberate exit that replaces the accidental one.
             Making the backdrop inert without this would leave the one screen
             you reach by finishing a quest with no way out but claiming, and a
             modal you cannot leave is a worse bug than the one being fixed. A
             44px corner control is not something a thumb aimed at the button
             below lands on by mistake, which was the whole complaint.
             v2.3.3030: the owner's round X.  Still a picture, not a "✕"
             character (v2.3.2289: a text glyph lands in the card's text, which
             the quest scenarios read). */
          <QuestCloseX qa="dlg-close" label="Close. Your reward stays waiting for you." onClick={() => onClose && onClose()} />
        )}
        <div className="bt-qw-col bt-qw-col--a">
          <div className="bt-qoffer-kicker bt-qw-kicker">{offering ? 'New Quest' : 'Quest Complete'}</div>
          <div className="bt-qoffer-title bt-qw-title">{quest && quest.title}</div>

          {/* The errand itself, on the accept screen only — on the reward screen
              you have just done it, and repeating it there reads as a task you
              still owe. */}
          {offering && quest && quest.desc && (
            <div className="bt-qoffer-desc bt-qw-desc">{quest.desc}</div>
          )}

          {/* Gold and XP are numbers rather than art, so they sit apart from the
              items instead of being faked into the same row.  v2.3.3030: under
              the title, with the HUD's own coin and XP pictures. */}
          {!offering && (gold || xp) ? <QuestPay className="bt-qoffer-pay" gold={gold} xp={xp} /> : null}

          {/* v2.3.3030: the two moments side by side on a sideways phone
              (game.css), one above the other upright */}
          <div className="bt-qw-groups">
            {groups.map(([when, caption, list]) => (
              /* data-gives is the QA hook the old card carried — a caption is
                 prose and gets reworded; which group a bow is under is the fact
                 worth pinning.  Its caption stays its FIRST child. */
              <div className="bt-qoffer-group" data-gives={when} key={when}>
                <QuestCaption className="bt-qoffer-caption">{caption}</QuestCaption>
                <Items list={list} />
              </div>
            ))}
          </div>
        </div>

        <div className="bt-qw-col bt-qw-col--b">
          {extra || null}

          <div className="bt-qoffer-actions">
            <QuestClaimButton
              className={'bt-qoffer-go' + (confirmClass ? ' ' + confirmClass : '')}
              tut="qoffer-confirm"
              disabled={!!confirmDisabled}
              onClick={() => { onConfirm && onConfirm(); }}
            >
              {offering ? 'Accept Quest' : 'Claim Rewards'}
            </QuestClaimButton>
            {/* Only the OFFER is declinable.  A finished quest's reward is
                already earned, so a "not now" there is a way to lose track of
                payment you are owed. */}
            {offering && (
              <button
                type="button"
                className="bt-qoffer-later bt-qw-later"
                onClick={(e) => { e.stopPropagation(); onClose && onClose(); }}
              >
                Not now
              </button>
            )}
          </div>
        </div>
      </QuestFrame>
    </div>
  ), document.body);
};
