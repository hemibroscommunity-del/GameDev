/* ═══ v2.3.6687: THE ONE ITEM PAGE (card UI2-gear PR 1, the build's step 5) ═══
 *
 * What an item IS, the same from everywhere (the specification's part 5,
 * state 3: "Identity + ownership/context; Key information + drill-downs;
 * Relevant actions").  A page of the dashboard's frame ('item' in
 * BottomDashboard's PANELS), pushed on the workspace that opened it: its
 * header is the frame's (Back to where you were, the item's kind as the
 * title, Menu, Close).  The model is src/game/itemInspect.js; what it reads,
 * and how an action runs, dash/itemPageOpen.js.  The words: src/data/say/itemInspect.js.
 *
 * The identity: the picture in the kit's rarity slot (the game's grade by its
 * outline and its stars), the name, the grade's word and stars, whose it is
 * and where.  The facts: the item's own rows, three across.  The actions: the
 * one list's, the lead first and full width; an action that cannot be taken
 * stays in its place, off, with its reason beside it (the specification's
 * Q83).  Nothing here scrolls but the facts (docs/UI-DESIGN-NOTES.md, "The
 * one item page"). */
import React from 'react';
import { Ui2Slot, Ui2Group, Ui2Value, Ui2Action, Ui2Stat, ui2RootClass } from '@/ui/kit/index.js';
import { inspectItem } from '@/game/itemInspect.js';
import { SAY } from '@/data/say/itemInspect.js';
import { say } from '@/game/say.js';
import { itemPageBus, itemPageInput, runItemPageAction } from './itemPageOpen.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import './itemPage.css';

/** The page's model, read again each draw from what opened it (a pin, a
    count, the item card's live answer). */
function useItemPage() {
  const [, tick] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => itemPageBus.subscribe(() => tick()), []);
  const got = itemPageInput(itemPageBus.state);
  return { got, model: got ? inspectItem(got.input) : null };
}

/** The header's title for the page up ('item': the item's kind). */
export function itemPageTitle() {
  try {
    const got = itemPageInput(itemPageBus.state);
    return got ? inspectItem(got.input).title : say(SAY, 'itemInspect.kindItem');
  } catch (e) { return say(SAY, 'itemInspect.kindItem'); }
}

export function ItemPage() {
  const { got, model } = useItemPage();
  if (!model) {
    return (
      <div className={ui2RootClass('u2-item')} data-item-page="" data-item-gone="">
        <div className="u2-item-in"><p className="u2-item-line">{say(SAY, 'itemInspect.gone')}</p></div>
      </div>
    );
  }
  const m = model;
  const lead = m.actions.find((a) => a.lead) || null;
  const rest = m.actions.filter((a) => !a.lead);
  /* the one reason beside the row: the lead's, else the first other one's */
  const offRest = rest.find((a) => a.off);
  const why = lead && lead.off ? lead.why : offRest ? offRest.label + ': ' + offRest.why : '';
  const press = (a) => { if (!a.off) runItemPageAction(a.id, got); };
  const btn = (a) => (
    <Ui2Action key={a.id} c={a.face} label={a.label} disabled={a.off}
      data-item-act={a.id} data-item-off={a.off ? '' : undefined} aria-description={a.off ? a.why : undefined}
      style={a.lead ? { flex: '1 1 auto' } : undefined}
      {...(a.attrs || {})}
      onClick={(e) => { e.stopPropagation(); press(a); }} />
  );
  return (
    <div className={ui2RootClass('u2-item')} data-item-page="" data-item-place={got.place} data-item-grade={m.hidden ? 'hidden' : m.grade}>
      <div className="u2-item-in">
        <div className="u2-item-id" data-item-id="">
          <span className="u2-item-pic">
            <Ui2Slot grade={m.hidden ? 'normal' : m.grade} art={m.art} size={52} name={m.name} />
            {!m.art && m.glyph ? <span className="u2-item-glyph" aria-hidden="true">{m.glyph}</span> : null}
          </span>
          <span className="u2-item-words">
            <h3 className="u2-item-name" data-item-name={m.name}>{m.name}</h3>
            <span className="u2-item-sub" data-item-sub="">
              {m.gradeWord ? (
                <>
                  <span className="u2-item-grade" data-grade={m.grade} data-item-grade-word={m.gradeWord}>{m.gradeWord}</span>{' '}
                  <span className="u2-item-stars" data-item-stars={m.stars} aria-hidden="true">{'★'.repeat(m.stars)}</span>
                  {m.where ? ' · ' : null}
                </>
              ) : null}
              <span data-item-where={m.where}>{m.where}</span>
            </span>
          </span>
        </div>
        <div className="u2-item-body" data-item-body="">
          {m.facts.length ? (
            <div className="u2-item-facts" data-item-facts={m.facts.length}>
              {m.facts.map((f) => (
                <Ui2Group key={f.k} k={f.k} data-item-fact={f.k}><Ui2Value v={f.v} /></Ui2Group>
              ))}
            </div>
          ) : null}
          {m.line ? <p className="u2-item-line" data-item-line="">{m.line}</p> : null}
          {m.doors.length ? (
            <div className="u2-item-doors">
              {m.doors.map((d) => (
                <Ui2Stat key={d.id} v={d.label} k="" data-item-door={d.id}
                  onClick={() => { try { dashboardPanelBus.push(d.id); } catch (e) { /* no frame */ } }} />
              ))}
            </div>
          ) : null}
        </div>
        {m.readOnly ? <p className="u2-item-note" data-item-readonly="">{say(SAY, 'itemInspect.readOnly')}</p> : null}
        {m.actions.length ? (
          <div className="u2-item-acts" data-item-actions={m.actions.map((a) => a.id).join(' ')}>
            {lead ? btn(lead) : null}
            {why ? <span className="u2-why" data-item-why="">{why}</span> : null}
            {rest.map(btn)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
