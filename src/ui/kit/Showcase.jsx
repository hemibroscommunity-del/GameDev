/* ═══ v2.3.6693: THE SHOWCASE (card UI2-codex, the build's step 6) ═══
 * The specification's Q74: "the actual animated monster sprite, name, short
 * description, level/element and essential combat stats are visible on the
 * first screen. Subject destinations summarize their own contents and expand
 * into dedicated detail views."  One entry, large: its `figure` (a node the
 * caller draws, moving) on the left; on the right its `doors`, each a raised
 * door with the summary of what is behind it; under them its `facts` (the
 * essentials, flat in one sunk strip).  The name is the frame's title.  When
 * `short` (a phone on its side: about 63 px of page) the three lie in one
 * row: what cannot fit becomes a door, never smaller words.  `locked` (a node)
 * stands in the doors' and facts' place for an entry not open yet. */
import React from 'react';
import { Ui2Tile } from './Tile.jsx';
import { Ui2Facts, Ui2Fact } from './Facts.jsx';
import './collection.css';

export function Ui2Showcase({ figure, doors = [], facts = [], short, locked, className, ...rest }) {
  return (
    <div className={'u2-show' + (short ? ' is-short' : '') + (locked ? ' is-locked' : '') + (className ? ' ' + className : '')} {...rest}>
      <div className="u2-show-figure" data-u2-show-figure="">{figure}</div>
      {locked ? <div className="u2-show-locked">{locked}</div> : (
        <>
          {doors.length ? (
            <div className="u2-show-doors" data-u2-show-doors={doors.length}>
              {doors.map((d) => (
                <Ui2Tile key={d.id} size="compact" label={d.label} sub={d.summary} className="u2-show-door"
                  data-u2-show-door={d.id} onClick={d.onClick} {...(d.attrs || {})} />
              ))}
            </div>
          ) : null}
          {facts.length ? (
            <Ui2Facts dir="row" className="u2-show-facts" data-u2-show-facts={facts.length}>
              {facts.map((f) => <Ui2Fact key={f.id || f.k} k={f.k} v={f.v} data-u2-show-fact={f.id || f.k} />)}
            </Ui2Facts>
          ) : null}
        </>
      )}
    </div>
  );
}
