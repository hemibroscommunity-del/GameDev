import React from 'react';

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

/* Bigger than the old 40px chip: this screen exists to show the items, so
   they are the largest thing on it after the title. */
function ItemChip({ item }) {
  return (
    <div className="bt-qoffer-chip">
      <img
        src={item.icon}
        alt={item.label || ''}
        draggable={false}
        className="bt-qoffer-chipimg"
        /* A missing file removes the whole chip rather than leaving a broken
           image where a reward should be. */
        onError={(e) => {
          const box = e.currentTarget.parentNode;
          if (box && box.parentNode) box.parentNode.removeChild(box);
        }}
      />
      <div className="bt-qoffer-chiplabel">{item.label || ''}</div>
    </div>
  );
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
  } = props;
  const offering = mode !== 'reward';
  const items = (quest && quest.gives || []).filter(
    (g) => g && g.icon && g.when === (offering ? 'accept' : 'complete'),
  );

  return (
    <div className="bt-npcdlg-scrim" onClick={onClose}>
      <div className="bt-qoffer" onClick={(e) => e.stopPropagation()}>
        <div className="bt-qoffer-kicker">{offering ? 'New Quest' : 'Quest Complete'}</div>
        <div className="bt-qoffer-title">{quest && quest.title}</div>

        {/* The errand itself, on the accept screen only — on the reward screen
            you have just done it, and repeating it there reads as a task you
            still owe. */}
        {offering && quest && quest.desc && (
          <div className="bt-qoffer-desc">{quest.desc}</div>
        )}

        {items.length > 0 && (
          <>
            <div className="bt-qoffer-caption">
              {offering ? 'He hands you now' : 'For finishing this quest'}
            </div>
            <div className="bt-qoffer-items">
              {items.map((it, n) => <ItemChip key={n} item={it} />)}
            </div>
          </>
        )}

        {/* Gold and XP are numbers rather than art, so they sit apart from the
            chips instead of being faked into the same row. */}
        {!offering && (gold || xp) ? (
          <div className="bt-qoffer-pay">
            {gold ? <span className="bt-qoffer-gold">+{gold} gold</span> : null}
            {xp ? <span className="bt-qoffer-xp">+{xp} XP</span> : null}
          </div>
        ) : null}

        {extra || null}

        <div className="bt-qoffer-actions">
          <button
            type="button"
            className={'button-primary bt-qoffer-go' + (confirmClass ? ' ' + confirmClass : '')}
            data-tut="qoffer-confirm"
            aria-disabled={!!confirmDisabled}
            onClick={(e) => {
              e.stopPropagation();
              if (confirmDisabled) return;
              onConfirm && onConfirm();
            }}
            style={confirmDisabled ? { background: '#293B41', color: '#F4F0E7', boxShadow: 'inset 0 0 0 1px #D8A85F' } : null}
          >
            {offering ? 'Accept Quest' : 'Claim Reward'}
          </button>
          {/* Only the OFFER is declinable.  A finished quest's reward is
              already earned, so a "not now" there is a way to lose track of
              payment you are owed. */}
          {offering && (
            <button
              type="button"
              className="bt-cc-btn bt-qoffer-later"
              onClick={(e) => { e.stopPropagation(); onClose && onClose(); }}
            >
              Not now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
