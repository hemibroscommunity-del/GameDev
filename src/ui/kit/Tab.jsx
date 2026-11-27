/* ═══ v2.3.6840: THE TAB (card UI4 PR 1, the owner's V17) ═══
 * V17:42, "Selected tab/filter: Slate with gold border/underline, persistent
 * text cue and selected semantics" (Drops, Active quests, a chat channel).
 * Today's look (PR 2 gives V17's): a compact raised tile, the chosen one
 * pushed in (the kit's selected state, read by ui2.css on aria-selected), so
 * the cue is never colour alone.  Its semantics are a real tab's: the row is
 * a `tablist`, each tab a button with role="tab" and aria-selected; Left and
 * Right move between them (the browser's focus, nothing measured).  The
 * screens' own tabs (RanksPage.jsx, BagFilterChips.jsx) are NOT moved here
 * in this PR.  Role: 'selected' for the chosen one, 'go' for the others
 * (src/game/uiRoles.js; `selected` says which, never a guess). */
import React from 'react';
import { ui2Role } from '@/game/uiRoles.js';
import { stateClass } from './shine.js';
import { Ui2Badge } from './Badge.jsx';

/** the row: `label` names it to a screen reader */
export function Ui2Tabs({ label, children, className, ...rest }) {
  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const row = e.currentTarget;
    const tabs = Array.prototype.slice.call(row.querySelectorAll('[role="tab"]'));
    const at = tabs.indexOf(document.activeElement);
    if (at < 0) return;
    const next = tabs[(at + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    if (next) { e.preventDefault(); next.focus(); }
  };
  return (
    <div className={'u2-tabs' + (className ? ' ' + className : '')} role="tablist" aria-label={label} onKeyDown={onKey} {...rest}>
      {children}
    </div>
  );
}

/** one tab: `label` its word (always written: the cue is never colour alone), `art` a small picture, `badge` a count */
export function Ui2Tab({ label, art, badge, dot, selected, state, onClick, className, ...rest }) {
  const r = ui2Role('Ui2Tab', { selected, onClick });
  const cls = 'u2-raised u2-tile is-compact u2-tab' + stateClass(state) + (className ? ' ' + className : '');
  return (
    <button type="button" role="tab" className={cls} data-u2-role={r.role} aria-selected={selected ? 'true' : 'false'}
      tabIndex={selected ? 0 : -1} onClick={onClick} {...rest}>
      {art ? <img className="u2-tile-art" src={art} alt="" draggable={false} /> : null}
      <span className="u2-tile-words"><span className="u2-tile-label">{label}</span></span>
      <Ui2Badge count={badge} dot={dot} />
    </button>
  );
}
