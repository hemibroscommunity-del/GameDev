/* ═══ v2.3.6683: THE ONE CONFIRMATION (card UI2-bro, the build's step 3) ═══
 * The specification's 1.2.3: "Confirm consequential, costly or irreversible
 * actions; routine reversible operations can execute immediately with
 * feedback."  So this asks ONLY for an action src/game/screenZones.js's
 * needsConfirm says costs or cannot be undone; asked for a routine one it
 * draws nothing and the caller's action goes at once.  It sits in the
 * actions' zone (no overlay over the world): the question, the action again
 * in its own colour, and Cancel. */
import React from 'react';
import { needsConfirm } from '@/game/screenZones.js';
import { Ui2Action } from './Action.jsx';
import { SAY } from '@/data/say/ui2Kit.js';
import { say } from '@/game/say.js';

/**
 * action  the screenZones.js action ({ id, cost, label, c })
 * words   the question (default "Are you sure?")
 * onYes, onNo
 */
export function Ui2Confirm({ action, words, onYes, onNo }) {
  if (!needsConfirm(action)) return null;
  return (
    <div className="u2-confirm" role="alertdialog" aria-label={words || say(SAY, 'ui2Kit.sure')} data-u2-confirm={action.id}>
      <span className="u2-confirm-q">{words || say(SAY, 'ui2Kit.sure')}</span>
      <Ui2Action c={action.c || (action.cost === 'irreversible' ? 'red' : 'gold')} label={action.label} data-enter="" onClick={onYes} />
      <Ui2Action c="silver" label={say(SAY, 'ui2Kit.cancel')} data-esc="" onClick={onNo} />
    </div>
  );
}
