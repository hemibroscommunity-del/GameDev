/* ═══ v2.3.6688: TWO PANELS SIDE BY SIDE (card UI2-gear PR 2, the build's step 5) ═══
 * The owner's specification, part 5: "Keep the source panel in its original
 * location during quick inspection; the opposite panel is replaced with the
 * summary."  A side (left, right) holds its panel or, during a look, the
 * summary: what each side shows is src/game/workspace.js wsPanels', handed
 * in; this piece only draws it.  Gear is its first user; the shop, the bank,
 * a bench and a trade are the plan's step 8.  Each side: `label` (the
 * panel's name in its label row), `head` (more of the label row: gold, a
 * filter, a close), `kind` ('storage' | 'worn' | 'summary'), `children`. */
import React from 'react';

function Side({ side, s }) {
  if (!s) return null;
  const summary = s.kind === 'summary';
  return (
    <section className={'u2-pane is-' + (s.kind || 'storage')} data-ws-side={side} data-ws-show={summary ? 'summary' : 'panel'}
      aria-label={s.label || undefined} style={s.style || undefined}>
      {(s.label || s.head) ? (
        <div className="u2-pane-head" style={{ height: s.headH || undefined }}>
          {s.label ? <span className="u2-pane-title">{s.label}</span> : null}
          {s.head || null}
        </div>
      ) : null}
      <div className="u2-pane-body">{s.children}</div>
    </section>
  );
}

export function Ui2TwoPanel({ left, right, height, style }) {
  return (
    <div className="u2-two" data-u2-two="" style={{ height: height || '100%', ...(style || null) }}>
      <Side side="left" s={left} />
      <Side side="right" s={right} />
    </div>
  );
}
