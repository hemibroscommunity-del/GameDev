/* ═══ v2.3.6688: THE ONE GRID OF ITEM CELLS, AND ITS CELL (card UI2-gear PR 2, the build's step 5) ═══
 * One cell for every item square of the new screens: a recessed socket of
 * the game's grade, the kit's SELECTED state over it (pushed deep in, the
 * footprint and the rarity outline unchanged, a notch at the top as the cue
 * that is not colour; the specification's part 2).  A screen that already
 * draws its own tile (Gear's bag: the game's BagTile, its counts, pins and
 * "?" marks, the coach marks and phone tests that press `[data-bag-key]`)
 * hands it in as `children`, and the cell is then a frame, not a second
 * button; with none the cell draws the kit's slot and is itself the button.
 * The grid: square cells in even rows, `cols` across, scrolling inside its
 * panel (`scrollRef` for the panel's kept scroll: src/game/workspace.js). */
import React from 'react';
import { Ui2Slot } from './Slot.jsx';

export function Ui2ItemCell({ cell, size, selected, onPick, children, attrs, style }) {
  const c = cell || {};
  const cls = 'u2-cell' + (selected ? ' is-sel' : '') + (c.empty ? ' is-empty' : '');
  const box = { width: size, height: size, ...(style || null) };
  const own = { 'data-ws-key': c.key, 'data-grade': c.grade || 'normal', 'data-ws-sel': selected ? '1' : undefined, ...(attrs || null) };
  if (children) return <div className={cls} style={box} {...own}>{children}</div>;
  return (
    <button type="button" className={cls} style={box} {...own} data-u2-role="slot" aria-pressed={!!selected}
      aria-label={c.label || undefined} onClick={onPick ? () => onPick(c.key) : undefined}>
      <Ui2Slot grade={c.grade || 'normal'} art={c.art} size={size} empty={!!c.empty} />
    </button>
  );
}

export function Ui2ItemGrid({ cells, cols, size, gap, selectedKey, onPick, render, scrollRef, onScroll, height, fill }) {
  const list = Array.isArray(cells) ? cells : [];
  const n = Math.max(list.length, fill || 0);
  const g = gap == null ? 3 : gap;
  return (
    <div className="u2-grid" data-u2-grid="" ref={scrollRef || undefined} onScroll={onScroll || undefined} style={{ height: height || '100%' }}>
      <div className="u2-grid-in" style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)`, gridAutoRows: `${size}px`, gap: g }}>
        {Array.from({ length: n }, (_, i) => {
          const c = list[i];
          if (!c) return <Ui2ItemCell key={'empty' + i} cell={{ key: 'empty' + i, empty: true }} size={size} children={<span className="u2-slot is-empty" aria-hidden="true" />} />;
          return (
            <Ui2ItemCell key={c.key} cell={c} size={size} selected={selectedKey != null && c.key === selectedKey} onPick={onPick}>
              {render ? render(c) : null}
            </Ui2ItemCell>
          );
        })}
      </div>
    </div>
  );
}
