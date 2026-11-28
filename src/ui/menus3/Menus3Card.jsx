/* ═══ v2.3.6871: THE ONE CARD (card MN step 3, the Card) ═══
 *
 * The owner's "one compact card with at most 2 buttons" (SPEC.md section
 * 5), drawn as the wireframe's `.modalcard`: a small card in the middle of
 * the screen over a dim, its title bold, a muted line, the game's fine
 * print if today's prompt had one, and ONE row of the two answers -- the
 * quiet one left (Esc: data-esc), the lead one right (Enter: data-enter),
 * each 44 tall, in the kit's action faces (src/ui/kit/Action.jsx).
 *
 * The words and the answers are the rule's (src/game/menus3Card.js); what
 * an answer DOES is the prompt's own: `onAnswer('yes' | 'no')` calls
 * today's handler, so the request and its payload are today's.  The dim is
 * inert, as today's duel and clan cards are (a stray tap must not answer
 * for you).  `mark` carries today's hooks (data-party-invite, ...) so what
 * finds today's card finds this one.  Nothing loads: no picture, no icon
 * file. */
import { createPortal } from 'react-dom';
import { cardOf, cardAnswer } from '@/game/menus3Card.js';
import { Ui2Action } from '@/ui/kit/Action.jsx';
import { ui2RootClass } from '@/ui/kit/shine.js';
import './menus3.css';

const stop = (e) => { e.stopPropagation(); };

export function Menus3Card({ kind, args, onAnswer, mark }) {
  const card = cardOf(kind, args);
  if (!card || typeof document === 'undefined') return null;
  const answer = (id) => { const a = cardAnswer(card, id); if (a && onAnswer) onAnswer(a); };
  return createPortal(
    <div className={'m3-card-dim ' + ui2RootClass()} data-menus3-card={card.kind} {...(mark || {})}
      onClick={stop} onPointerDown={stop}>
      <div className="m3-card" role="alertdialog" aria-label={card.title}>
        <b className="m3-card-title" data-menus3-card-title="">{card.title}</b>
        {card.line ? <div className="m3-card-line">{card.line}</div> : null}
        {card.fine ? <div className="m3-card-fine">{card.fine}</div> : null}
        <div className="m3-card-row">
          {card.answers.map((a) => (
            <Ui2Action key={a.id} intent={a.role} label={a.label} style={{ flex: '1 1 0', minHeight: 44 }}
              data-menus3-card-answer={a.id} {...(a.id === 'no' ? { 'data-esc': '' } : { 'data-enter': '' })}
              onClick={(e) => { e.stopPropagation(); answer(a.id); }} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
