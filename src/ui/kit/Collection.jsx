/* ═══ v2.3.6693: THE COLLECTION (card UI2-codex, the build's step 6) ═══
 * The specification's Q73: "Use illustrated entity cards, with artwork as the
 * dominant visual and a small amount of essential information that depends
 * on the entity type. Avoid a dense database-style directory as the general
 * collection layout"; bounded scrolling: the cards scroll INSIDE their zone.
 * `Ui2Collection`: the kinds in one row at the top (a column at the left when
 * `side`, a phone on its side), each a raised door to its shelf, the chosen
 * one pushed in; under them its `head` (a count) and its cards or its empty
 * state (`children`).  `Ui2CollectionCard`: one entry, a raised door (it
 * opens the entry's page): its picture first and largest (`art`, a node the
 * caller draws), its name, a line under it (`sub`, with a small picture
 * `subArt`), a last line (`line`), NEW (`mark`), greyed when `dim`.  The
 * cards lie three across (one row that scrolls sideways when `side`), or with
 * the picture over the words on a computer's tall column (`big`).  The kit
 * imports no game: the caller hands in every word and picture. */
import React from 'react';
import { Ui2Tile } from './Tile.jsx';
import './collection.css';

export function Ui2Collection({ shelves = [], shelf, onShelf, side, big, head, label, children, className, ...rest }) {
  return (
    <div className={'u2-coll' + (side ? ' is-side' : '') + (big ? ' is-big' : '') + (className ? ' ' + className : '')} {...rest}>
      <div className="u2-coll-shelves" role="group" aria-label={label}>
        {shelves.map((s) => (
          <Ui2Tile key={s.id} size="compact" label={s.word} selected={s.id === shelf} className="u2-coll-shelf"
            data-u2-shelf={s.id} onClick={() => { if (onShelf) onShelf(s.id); }} />
        ))}
      </div>
      <div className="u2-coll-body" data-u2-coll-body="">
        {head ? <div className="u2-coll-head">{head}</div> : null}
        {children}
      </div>
    </div>
  );
}

export function Ui2CollectionCard({ art, name, sub, subArt, line, mark, dim, onClick, className, ...rest }) {
  return (
    <button type="button" className={'u2-raised u2-cc' + (dim ? ' is-dim' : '') + (className ? ' ' + className : '')} onClick={onClick} {...rest}>
      <span className="u2-cc-art">{art}{mark ? <span className="u2-cc-mark">{mark}</span> : null}</span>
      <span className="u2-cc-words">
        <span className="u2-cc-name">{name}</span>
        {sub ? <span className="u2-cc-sub">{subArt ? <img className="u2-cc-subart" src={subArt} alt="" draggable={false} /> : null}<span className="u2-cc-subword">{sub}</span></span> : null}
        {line ? <span className="u2-cc-line">{line}</span> : null}
      </span>
    </button>
  );
}
