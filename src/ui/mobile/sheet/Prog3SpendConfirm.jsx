import React from 'react';
import { prog3SpendBus } from './prog3SpendBus.js';

/* ═══ v2.3.2595: "ARE YOU SURE?" FOR A POINT SPEND ═══
 *
 * Owner: "Add a second window asking if they're sure they want to spend the
 * point."
 *
 * A point is permanent — nothing in the game refunds one short of a
 * migration — and the [+] that spends it is now flush against the edge of a
 * 48px cell, which is exactly the control a thumb brushes on the way past.
 * So the spend asks first, and the question carries the two numbers that
 * make it answerable: what the stat is now, and what it becomes.
 *
 * IT DOES NOT SPEND ANYTHING ITSELF.  It calls back into the row that opened
 * it, which sends `prog3_allocate`; the worker's echo is the only thing that
 * may move a count (prog3.js: "allocation is a server endpoint, not
 * client-applied-and-clamped").  That is the whole reason this is not the
 * retired `SpendPointConfirm`, which writes the number locally.
 *
 * DISMISSABLE FOUR WAYS, the InfoPopup rule (v2.3.2131) and for the same
 * recorded reason — the owner has reported undismissable UI twice: the
 * scrim, Cancel, Escape, and the × .  A confirm you cannot back out of turns
 * "are you sure" into "too late".
 *
 * z 9450 — one above InfoPopup (9400), because the explainer for a stat and
 * the confirm for that same stat can both be open in a fumbled double tap and
 * the QUESTION must be the one on top.  Registered in src/ui/zLayers.js.
 */

const COL = {
  dim:    'rgba(4,9,12,0.58)',
  card:   '#1E2E34',
  border: 'rgba(229,237,233,0.20)',
  well:   '#111E23',
  accent: '#D8AA58',
  text:   '#F4F0E7',
  text2:  '#B6C1BE',
  muted:  '#8D9B98',
  goldText: '#172126',
  goldBg: 'linear-gradient(180deg,#E2B765,#D2A14D)',
};

export const Prog3SpendConfirm = () => {
  const [, bump] = React.useState(0);
  React.useEffect(() => prog3SpendBus.subscribe(() => bump((v) => v + 1)), []);
  const cur = prog3SpendBus.current();

  /* Escape closes.  Bound only while open, so this adds no always-on key
     listener to a game whose own controls are keyboard-driven on desktop. */
  React.useEffect(() => {
    if (!cur) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') prog3SpendBus.close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cur]);

  if (!cur) return null;
  const close = () => prog3SpendBus.close();
  const confirm = () => {
    const run = cur.run;
    prog3SpendBus.close();
    /* After the close, so a handler that throws cannot leave the dialog up
       over a screen the player can no longer reach (the infoPopupBus
       action pattern). */
    try { if (typeof run === 'function') run(); } catch (e) { /* the row reports its own refusals */ }
  };

  return (
    <div data-prog3-spend={cur.stat || ''}
      onPointerUp={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 9450,
        background: COL.dim,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 18, boxSizing: 'border-box',
      }}>
      {/* The card swallows its own taps; only the scrim around it closes. */}
      <div data-prog3-spend-card
        onPointerUp={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 320, boxSizing: 'border-box',
          background: COL.card, border: `1px solid ${COL.border}`, borderRadius: 14,
          boxShadow: '0 14px 30px rgba(4,7,9,.38)',
          padding: '14px 14px 12px', position: 'relative',
        }}>
        <button type="button" aria-label="Close"
          onPointerUp={(e) => { e.stopPropagation(); close(); }}
          style={{
            position: 'absolute', top: 6, right: 6, width: 30, height: 30,
            borderRadius: 999, padding: 0, background: 'transparent',
            border: 'none', color: COL.muted, fontSize: 17, lineHeight: 1,
            cursor: 'pointer', touchAction: 'manipulation',
          }}>×</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingRight: 30 }}>
          {cur.iconSrc && (
            <img src={cur.iconSrc} alt="" draggable={false}
              style={{ width: 26, height: 26, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div data-prog3-spend-title style={{
              fontSize: 14, fontWeight: 800, color: COL.text, lineHeight: 1.15,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{cur.label}{cur.laneLabel ? ' · ' + cur.laneLabel : ''}</div>
            <div style={{ fontSize: 11.5, color: COL.muted, lineHeight: 1.2, marginTop: 1 }}>
              Spend 1 {cur.poolLabel || 'point'}?
            </div>
          </div>
        </div>

        {/* WHAT THE POINT BUYS.  The same now -> after pair the explainer
            prints, because a confirm that only says "are you sure" is asking
            a question it has not given you the means to answer. */}
        {(cur.nowText != null) && (
          <div data-prog3-spend-rows style={{
            marginTop: 11, padding: '8px 10px', borderRadius: 9,
            background: COL.well, border: `1px solid ${COL.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: COL.muted, whiteSpace: 'nowrap' }}>{cur.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {cur.nowText}
              {cur.afterText != null && <span style={{ color: COL.muted, padding: '0 5px' }}>→</span>}
              {cur.afterText != null && <span style={{ color: COL.accent }}>{cur.afterText}</span>}
            </span>
          </div>
        )}
        {cur.perText && (
          <div style={{ marginTop: 7, fontSize: 11.5, color: COL.text2, lineHeight: 1.3 }}>{cur.perText}</div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
          <button type="button" data-prog3-spend-cancel
            onPointerUp={(e) => { e.stopPropagation(); close(); }}
            style={{
              flex: '1 1 0', minHeight: 44, borderRadius: 11,
              background: 'transparent', border: `1px solid ${COL.border}`,
              color: COL.text2, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>Cancel</button>
          <button type="button" data-prog3-spend-confirm
            onPointerUp={(e) => { e.stopPropagation(); confirm(); }}
            style={{
              flex: '1 1 0', minHeight: 44, borderRadius: 11,
              background: COL.goldBg, border: 'none',
              color: COL.goldText, fontSize: 13, fontWeight: 800,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>Spend point</button>
        </div>
      </div>
    </div>
  );
};
