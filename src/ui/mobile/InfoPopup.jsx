import React from 'react';
import { infoPopupBus } from './infoPopupBus.js';

/* ═══ THE "WHAT IS THIS?" POPUP (v2.3.2131) ═══
 *
 * Owner: "get rid of the xp numbers in the 3 combat skills and put them as
 * some kind of pop up when you tap on it.  Also more pop ups for things users
 * want to learn more about on the character equip menu (labels tapped on and
 * such)."
 *
 * ONE overlay for both asks.  A tapped combat card and a tapped stat label
 * are the same event -- a player pointing at something and asking what it is
 * -- and answering them with two components would mean two sets of wording,
 * sizing and dismissal rules to keep level.
 *
 * IT IS DISMISSABLE FOUR WAYS, and that is deliberate rather than generous.
 * The owner has reported undismissable UI twice (the world chat over the
 * joystick, and the coach tips a demo player left up for an entire session),
 * so: the scrim, the x, the button, and Escape.  A popup that teaches you
 * something and then will not leave has taught you that tapping things is
 * dangerous.
 *
 * z 9400 -- above MoreOverlay (9200) and ControlsTutorial (9300), because it
 * is opened from panels that live inside the first and must not be buried by
 * the second; below the name and account modals, which are flows rather than
 * asides.  Registered in src/ui/zLayers.js.
 */

const COL = {
  dim:    'rgba(4,9,12,0.58)',
  card:   '#1E2E34',
  border: 'rgba(229,237,233,0.20)',
  accent: '#D8AA58',
  text:   '#F4F0E7',
  muted:  '#8D9B98',
  goldText: '#172126',
  goldBg: 'linear-gradient(180deg,#E2B765,#D2A14D)',
};

export const InfoPopup = () => {
  const [, bump] = React.useState(0);
  React.useEffect(() => infoPopupBus.subscribe(() => bump((v) => v + 1)), []);
  const cur = infoPopupBus.current();

  /* Escape closes.  Bound only while open, so this adds no always-on key
     listener to a game whose own controls are keyboard-driven on desktop. */
  React.useEffect(() => {
    if (!cur) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') infoPopupBus.close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cur]);

  if (!cur) return null;
  const close = () => infoPopupBus.close();

  return (
    <div data-infopopup={cur.title || ''}
      onPointerUp={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 9400,
        background: COL.dim,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 18, boxSizing: 'border-box',
      }}>
      {/* The card swallows its own taps so a tap INSIDE does not close --
          only the scrim around it does. */}
      <div data-infopopup-card
        onPointerUp={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 320,
          background: COL.card,
          border: `1px solid ${COL.border}`,
          borderRadius: 14,
          padding: '14px 14px 12px',
          boxShadow: '0 18px 40px rgba(4,9,12,.55)',
          position: 'relative',
        }}>
        <button type="button" aria-label="Close" onPointerUp={close}
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 30, height: 30, lineHeight: '30px',
            background: 'transparent', border: 0, padding: 0,
            color: COL.muted, fontSize: 18, fontWeight: 700,
            cursor: 'pointer', touchAction: 'manipulation',
          }}>×</button>

        <div data-infopopup-title style={{
          fontSize: 15, fontWeight: 900, color: COL.accent,
          letterSpacing: '.01em', paddingRight: 28, marginBottom: 6,
        }}>{cur.title}</div>

        <div data-infopopup-body style={{
          fontSize: 13, lineHeight: 1.42, color: COL.text,
        }}>{cur.body}</div>

        {/* ═══ v2.3.2216: THE POINTS SCREEN'S ℹ️ ═══
            Owner: "Tapping it launches into a new window that describes its
            effect.  It also has a preview of what the effect does
            (exaggerated)."  Three optional slots, all of them absent for
            every caller that predates this: the DEMO (a React node -- the
            two-pane StatDemo), the per-point RATE line, and the ROWS of
            real numbers (this stat now -> after one point, and the DPS that
            point buys).  Same card, same four ways out, same z; the only new
            thing on screen is what the stat does. */}
        {cur.perText && (
          <div data-infopopup-rate style={{
            marginTop: 6, fontSize: 11.5, fontWeight: 800, color: COL.accent,
            letterSpacing: '.02em',
          }}>{cur.perText}</div>
        )}
        {cur.demo && (
          <div data-infopopup-demo style={{ marginTop: 10 }}>{cur.demo}</div>
        )}
        {cur.rows && cur.rows.length > 0 && (
          <div data-infopopup-rows style={{
            marginTop: 10, padding: '7px 10px',
            background: 'rgba(9,14,17,.42)',
            border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 9, fontVariantNumeric: 'tabular-nums',
          }}>
            {cur.rows.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                gap: 10, padding: '3px 0', fontSize: 12.5,
              }}>
                <span style={{ color: COL.muted, fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{r.label}</span>
                <span style={{ color: COL.text, fontWeight: 800, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {r.now}
                  {r.after != null && <> → <span style={{ color: '#59BF91' }}>{r.after}</span></>}
                  {r.delta && <span style={{ color: r.after != null ? '#59BF91' : COL.muted, fontWeight: 700 }}> ({r.delta})</span>}
                </span>
              </div>
            ))}
            {cur.capped && (
              <div style={{ marginTop: 4, fontSize: 10.5, color: COL.muted }}>At its cap — no more points can go here.</div>
            )}
          </div>
        )}

        {cur.note && (
          <div data-infopopup-note style={{
            fontSize: 11.5, lineHeight: 1.4, color: COL.muted, marginTop: 7,
          }}>{cur.note}</div>
        )}

        {/* The numbers, when there are numbers.  Given their own row rather
            than folded into the body: this is the readout that left the card
            face, and it is the reason a player opened this. */}
        {cur.stat && (
          <div data-infopopup-stat style={{
            marginTop: 10, padding: '8px 10px',
            background: 'rgba(9,14,17,.42)',
            border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 9,
            fontSize: 14, fontWeight: 900, color: COL.text,
            fontVariantNumeric: 'tabular-nums', textAlign: 'center',
          }}>{cur.stat}</div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {cur.action && (
            <button type="button"
              data-infopopup-action
              onPointerUp={(e) => {
                e.stopPropagation();
                const run = cur.action.run;
                infoPopupBus.close();
                try { if (run) run(); } catch (_e) {}
              }}
              style={{
                flex: '1 1 auto', padding: '9px 10px',
                background: COL.goldBg, color: COL.goldText,
                border: 0, borderRadius: 9,
                fontSize: 12.5, fontWeight: 900, cursor: 'pointer',
                touchAction: 'manipulation',
              }}>{cur.action.label}</button>
          )}
          <button type="button" onPointerUp={close}
            style={{
              flex: cur.action ? '0 0 auto' : '1 1 auto',
              padding: '9px 14px',
              background: 'transparent', color: COL.muted,
              border: `1px solid ${COL.border}`, borderRadius: 9,
              fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
              touchAction: 'manipulation',
            }}>Got it</button>
        </div>
      </div>
    </div>
  );
};
