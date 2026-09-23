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

/* ═══ v2.3.2695: THE +/- STEPPER ═══
 * Owner: "Instead of one button for 'spend point' make it so you can add
 * points more quickly using +/- buttons then confirm spend button to the
 * right of it."
 * "More quickly" is the point, so a held button keeps stepping: one step on
 * press (a tap is exactly one), then a repeat after a beat.  The timers stop
 * on every way a finger can leave -- up, cancel, and sliding off -- because a
 * repeat that outlives its press counts on by itself. */
const StepBtn = ({ label, glyph, disabled, onStep }) => {
  const timers = React.useRef({ hold: 0, rep: 0 });
  const stop = () => {
    clearTimeout(timers.current.hold); clearInterval(timers.current.rep);
    timers.current = { hold: 0, rep: 0 };
  };
  React.useEffect(() => stop, []);
  return (
    <button type="button" aria-label={label}
      data-infopopup-step={glyph === '+' ? 'up' : 'down'}
      aria-disabled={disabled}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (disabled) return;
        stop();
        onStep();
        timers.current.hold = setTimeout(() => {
          timers.current.rep = setInterval(onStep, 70);
        }, 380);
      }}
      onPointerUp={(e) => { e.stopPropagation(); stop(); }}
      onPointerCancel={stop} onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        flex: 'none', width: 44, height: 40, padding: 0,
        background: 'rgba(9,14,17,.42)',
        color: disabled ? 'rgba(141,155,152,.45)' : COL.text,
        border: `1px solid ${COL.border}`, borderRadius: 9,
        fontSize: 20, fontWeight: 900, lineHeight: '38px',
        cursor: disabled ? 'default' : 'pointer',
        touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}>{glyph}</button>
  );
};

export const InfoPopup = () => {
  const [, bump] = React.useState(0);
  React.useEffect(() => infoPopupBus.subscribe(() => bump((v) => v + 1)), []);
  const cur = infoPopupBus.current();
  /* v2.3.2695: the stepper's count belongs to the window it was set in -- a
     new window (another stat, or a lane tab, which reopens) starts at 1. */
  const [stepState, setStepState] = React.useState({ of: null, n: 1 });
  /* v2.3.2696: which "tap to read more" chip is open, per window */
  const [chipState, setChipState] = React.useState({ of: null, key: null });

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
  const stepMax = (cur.action && !cur.action.blocked && cur.action.stepMax > 0) ? cur.action.stepMax : 0;
  const stepN = stepMax ? Math.min(stepMax, Math.max(1, stepState.of === cur ? stepState.n : 1)) : 1;
  const stepBy = (d) => setStepState((prev) => {
    const base = prev.of === cur ? prev.n : 1;
    return { of: cur, n: Math.min(stepMax, Math.max(1, base + d)) };
  });
  /* v2.3.2696: a window that carries a `hook` is a STAT window and takes
     the short layout; every other caller keeps the one it had. */
  const compact = !!cur.hook;
  const openChip = chipState.of === cur ? chipState.key : null;
  const meter = cur.meterFor ? (() => { try { return cur.meterFor(stepMax ? stepN : 1); } catch (_e) { return null; } })() : null;
  /* the scene's "+1" becomes "+n" as the stepper moves */
  const demoNode = React.isValidElement(cur.demo) ? React.cloneElement(cur.demo, { n: stepMax ? stepN : 1 }) : cur.demo;
  /* the rows show what the WHOLE batch buys (rowsFor, HeroExpanded) */
  let rows = cur.rows;
  if (stepN > 1 && cur.rowsFor) { try { rows = cur.rowsFor(stepN) || rows; } catch (_e) {} }
  const rowsEl = (<>
  {rows && rows.length > 0 && (
    <div data-infopopup-rows style={{
      marginTop: compact ? 8 : 10, padding: '7px 10px',
      background: 'rgba(9,14,17,.42)',
      border: '1px solid rgba(255,255,255,.06)',
      borderRadius: 9, fontVariantNumeric: 'tabular-nums',
    }}>
      {rows.map((r, i) => {
        /* v2.3.2696: in a stat window the first row is the answer --
           drawn big, first thing under the title */
        const big = compact && i === 0;
        return (
        <div key={i} data-infopopup-row={i} style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          /* wrap, never overflow: a value the label leaves no room for
             drops under it instead of running off the card */
          flexWrap: 'wrap',
          gap: '0 10px', padding: big ? '1px 0 4px' : '3px 0', fontSize: big ? 21 : 12.5,
        }}>
          <span style={{ color: COL.muted, fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{r.label}</span>
          <span style={{ color: COL.text, fontWeight: big ? 900 : 800, whiteSpace: 'nowrap', textAlign: 'right' }}>
            {r.now}
            {r.after != null && <> → <span style={{ color: '#59BF91' }}>{r.after}</span></>}
            {r.delta && <span style={{ color: r.after != null ? '#59BF91' : COL.muted, fontWeight: 700 }}> ({r.delta})</span>}
          </span>
        </div>
        );
      })}
      {cur.capped && (
        <div style={{ marginTop: 4, fontSize: 11, color: COL.muted }}>At its cap — no more points can go here.</div>
      )}
    </div>
  )}
  </>);
  const lanesEl = (<>
  {/* ═══ v2.3.2684: WHICH WEAPON THIS POINT GOES INTO ═══
      Owner, with a mockup: "The button to change which of the 3 combat
      skills it's applied to ... It's a tab in the confirm window.  This
      should be for every allocable stat."

      It belongs here rather than on the grid for the reason the mockup
      makes obvious: the choice and its CONSEQUENCE are the same glance.
      Each tab carries that lane's spendable count, so picking Bow and
      seeing "1" is one read, and the commit button below names the lane
      it will charge -- the owner's stated reason the confirm exists at
      all is "so the user doesn't accidentally spend the wrong weapon
      point type".

      A tab is a real 44px target and the row is scrollable sideways
      rather than squeezing three of them into whatever is left: on a
      320px card three tabs plus their gaps is tight, and a tab too
      small to hit is worse than one you have to nudge to. */}
  {cur.lanes && cur.lanes.options && cur.lanes.options.length > 0 && (
    <div data-infopopup-lanes style={{
      marginTop: compact ? 0 : 10, display: 'flex', gap: 6,
      overflowX: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      {cur.lanes.options.map((o) => {
        const on = o.key === cur.lanes.active;
        return (
          <div key={o.key} role="button"
            data-infopopup-lane={o.key}
            aria-pressed={on}
            aria-label={`${o.label}, ${o.pts} point${o.pts === 1 ? '' : 's'} to spend`}
            onPointerUp={(e) => { e.stopPropagation(); if (!on && cur.lanes.onPick) cur.lanes.onPick(o.key); }}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: '1 1 0', minWidth: 92, minHeight: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '6px 8px', boxSizing: 'border-box',
              border: `${on ? 2 : 1}px solid ${on ? COL.accent : 'rgba(229,237,233,0.20)'}`,
              borderRadius: 10,
              background: on ? 'rgba(216,170,88,.12)' : 'rgba(9,14,17,.42)',
              cursor: 'pointer', touchAction: 'manipulation',
            }}>
            {o.icon && <img src={o.icon} alt="" draggable={false} style={{
              width: 22, height: 22, objectFit: 'contain', flex: 'none', pointerEvents: 'none',
            }} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
              <span style={{
                fontSize: 10.5, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase',
                color: on ? COL.accent : COL.muted,
              }}>{o.label}</span>
              <span style={{
                fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
                color: on ? COL.text : COL.muted,
              }}>{o.pts}</span>
            </div>
          </div>
        );
      })}
    </div>
  )}
  </>);
  const spend = () => {
    if (!cur.action || cur.action.blocked) return;
    const run = cur.action.run;
    infoPopupBus.close();
    try { if (run) run(stepN); } catch (_e) {}
  };

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
          /* ═══ v2.3.2616: THE CARD FITS THE SCREEN NOW ═══
             It had no height limit, and the scrim centres it — so a card
             taller than the viewport hung off BOTH ends equally and its
             buttons went with it.  Measured at 360x360 (a phone in
             landscape): "Spend point" and "Got it" sat 13 to 44px below the
             bottom edge on every stat whose window carries a scene, and the
             title was cut off above.  Unreachable, not just ugly — a tap at
             the button's centre lands outside the viewport.
             This PRE-DATES the new scenes: dmg, aspd, luck, hp and def have
             had one since v2.3.2222 and all five overflowed.  It surfaced now
             because Range is the first row of the Bow card and, until this
             PR, was the one that had no scene and therefore a short window.
             Capping the card and scrolling its middle is the fix rather than
             shrinking the scene, because the scene is what the owner asked
             for and the next long body would put it right back. */
          maxHeight: '100%',
          display: 'flex', flexDirection: 'column', minHeight: 0,
        }}>
        <button type="button" aria-label="Close" onPointerUp={close} data-infopopup-x
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 30, height: 30, lineHeight: '30px',
            background: 'transparent', border: 0, padding: 0,
            color: COL.muted, fontSize: 18, fontWeight: 700,
            cursor: 'pointer', touchAction: 'manipulation',
          }}>×</button>

        {/* ═══ v2.3.2685: THE TITLE CAN CARRY ITS OWN PICTURES ═══
            Owner: "on the confirmation window where it names the stat and
            combat type ('power - melee') also include its icon after each
            label.  So power icon after power and the melee icon after
            melee."
            `titleParts` is optional and `title` stays the plain string --
            it is what `data-infopopup` is keyed on and what a screen reader
            reads, and three QA scenarios match the window by the words in
            it.  So the icons are added BESIDE the text rather than in place
            of any of it. */}
        <div data-infopopup-title style={{
          flex: 'none',
          fontSize: 15, fontWeight: 900, color: COL.accent,
          letterSpacing: '.01em', paddingRight: 28, marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
        }}>
          {cur.titleParts && cur.titleParts.length
            ? cur.titleParts.map((part, i) => (
                <React.Fragment key={(part.label || '') + i}>
                  {i > 0 && <span style={{ opacity: 0.5, fontWeight: 700 }}>·</span>}
                  <span>{part.label}</span>
                  {part.icon && (
                    <img src={part.icon} alt="" draggable={false} style={{
                      width: 19, height: 19, objectFit: 'contain', flex: 'none',
                      /* the portrait is a photo-ish tile, the stat glyphs are
                         flat art -- the radius only shows on the former */
                      borderRadius: part.round ? 4 : 0,
                      pointerEvents: 'none',
                    }} />
                  )}
                </React.Fragment>
              ))
            : cur.title}
        </div>

        {/* v2.3.2616: everything between the title and the buttons scrolls.
            The title stays because it names what you are reading; the action
            row stays because it is the way out, and the way out is the thing
            that must never be off-screen.  The negative margin lets the
            scrolled content keep the card's own 14px gutter while the
            scrollbar rides the card's edge. */}
        <div data-infopopup-scroll style={{
          flex: '0 1 auto', minHeight: 0, overflowY: 'auto',
          margin: '0 -14px', padding: '0 14px',
          WebkitOverflowScrolling: 'touch',
        }}>
        {compact ? (<>
          {/* ═══ v2.3.2696: A STAT WINDOW YOU DO NOT HAVE TO READ ═══
              Owner: "It's a lot of words but good information.  What's a
              better solution to make the user understand without reading a
              manual?"  So the window leads with what the stat DOES in about
              six words, then the answer in numbers -- big, and moving as the
              stepper moves, so pressing + is how you learn it -- then a bar
              that fills by less with every point (the curve, drawn instead of
              explained).  The explainer and the fade rule are still here, one
              tap away behind two chips, for the player who wants them. */}
          <div data-infopopup-hook style={{
            fontSize: 13.5, lineHeight: 1.35, fontWeight: 700, color: COL.text,
          }}>{cur.hook}</div>
          {rowsEl}

          {meter && (
            <div data-infopopup-meter data-now={meter.now.toFixed(3)} data-after={meter.after.toFixed(3)}
              style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                position: 'relative', flex: '1 1 auto', height: 8, borderRadius: 4,
                background: 'rgba(9,14,17,.55)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (meter.now * 100) + '%', background: COL.accent }} />
                <div data-infopopup-meter-gain style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: (meter.now * 100) + '%', width: (Math.max(0, meter.after - meter.now) * 100) + '%',
                  background: '#59BF91', transition: 'width .12s ease-out',
                }} />
              </div>
              <span style={{ flex: 'none', fontSize: 10, fontWeight: 900, letterSpacing: '.08em', color: COL.muted }}>MAX</span>
            </div>
          )}
          {cur.chips && cur.chips.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cur.chips.map((c) => {
                  const on = openChip === c.key;
                  return (
                    <button type="button" key={c.key} data-infopopup-chip={c.key} aria-expanded={on}
                      onPointerUp={(e) => { e.stopPropagation(); setChipState({ of: cur, key: on ? null : c.key }); }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        minHeight: 30, padding: '4px 9px', boxSizing: 'border-box',
                        background: on ? 'rgba(216,170,88,.12)' : 'rgba(9,14,17,.42)',
                        border: `1px solid ${on ? COL.accent : COL.border}`, borderRadius: 999,
                        color: c.warn ? COL.accent : COL.muted,
                        fontSize: 11, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
                      }}>
                      <span aria-hidden="true" style={{ fontSize: 12 }}>{c.icon}</span>{c.label}
                    </button>
                  );
                })}
              </div>
              {openChip && (() => {
                const c = cur.chips.find((x) => x.key === openChip);
                return c ? (
                  <div data-infopopup-chip-text={c.key} style={{
                    marginTop: 7, fontSize: 12, lineHeight: 1.4, color: COL.muted,
                  }}>{c.text}</div>
                ) : null;
              })()}
            </div>
          )}
          {cur.demo && (
            <div data-infopopup-demo style={{ marginTop: 10 }}>{demoNode}</div>
          )}
        </>) : (<>
        <div data-infopopup-body style={{
          fontSize: 13, lineHeight: 1.42, color: COL.text,
        }}>{cur.body}</div>

        {/* ═══ v2.3.2222: THE POINTS SCREEN'S ℹ️ ═══
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
        {lanesEl}
        {cur.demo && (
          <div data-infopopup-demo style={{ marginTop: 10 }}>{demoNode}</div>
        )}
        {rowsEl}

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

        </>)}

        {/* v2.3.2695: the "Melee points available: 2" line is retired (owner:
            "Remove the redundant 'shared points available'") -- the
            highlighted lane tab carries the same number. */}
        {cur.action && cur.action.blocked && (
          <div data-infopopup-blocked style={{
            marginTop: 9, fontSize: 11.5, fontWeight: 700, color: COL.accent, lineHeight: 1.3,
          }}>{cur.action.blocked}</div>
        )}

        </div>{/* data-infopopup-scroll */}

        {/* v2.3.2696: in a stat window the pool tabs sit with the stepper --
            which pool, how many, spend: the three controls in one place, and
            pinned, so they never scroll away from the button they feed. */}
        {compact && (
          <div style={{ flex: 'none', marginTop: 10 }}>
            {lanesEl}
          </div>
        )}
        {stepMax > 0 ? (
          /* v2.3.2695: [-] n [+] [Spend n points].  "Got it" steps aside for
             the width -- the x, the scrim and Escape still close it, which
             keeps three of v2.3.2131's four ways out on a spend window. */
          <div data-infopopup-stepper style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <StepBtn label="One fewer point" glyph="−" disabled={stepN <= 1} onStep={() => stepBy(-1)} />
            <span data-infopopup-count={stepN} aria-live="polite"
              style={{
                flex: 'none', minWidth: 30, textAlign: 'center',
                fontSize: 18, fontWeight: 900, color: COL.text,
                fontVariantNumeric: 'tabular-nums',
              }}>{stepN}</span>
            <StepBtn label="One more point" glyph="+" disabled={stepN >= stepMax} onStep={() => stepBy(1)} />
            <button type="button"
              data-infopopup-action
              onPointerUp={(e) => { e.stopPropagation(); spend(); }}
              style={{
                flex: '1 1 auto', minWidth: 0, height: 40, padding: '0 10px',
                background: COL.goldBg, color: COL.goldText,
                border: 0, borderRadius: 9,
                fontSize: 12.5, fontWeight: 900, whiteSpace: 'nowrap',
                cursor: 'pointer', touchAction: 'manipulation',
              }}>{`Spend ${stepN} point${stepN === 1 ? '' : 's'}`}</button>
          </div>
        ) : (
        <div style={{ flex: 'none', display: 'flex', gap: 8, marginTop: 12 }}>
          {cur.action && (
            <button type="button"
              data-infopopup-action
              /* ═══ v2.3.2597: A BLOCKED ACTION STAYS AND SAYS WHY ═══
                 This window is the spend confirm now (the owner: "the
                 confirmation window be the same as the informational window"),
                 so it opens on a capped or unaffordable stat by design —
                 explaining is its first job — and it is the BUTTON that
                 refuses.  It keeps its name and carries no `disabled`
                 attribute and no pointer-events block: either would make it
                 look right and be unreachable, which is the failure mode
                 TRAPS §67 is about. */
              aria-disabled={!!cur.action.blocked}
              onPointerUp={(e) => { e.stopPropagation(); spend(); }}
              style={{
                flex: '1 1 auto', padding: '9px 10px',
                background: cur.action.blocked ? 'transparent' : COL.goldBg,
                color: cur.action.blocked ? COL.muted : COL.goldText,
                border: cur.action.blocked ? `1px solid ${COL.border}` : 0,
                borderRadius: 9,
                fontSize: 12.5, fontWeight: 900,
                cursor: cur.action.blocked ? 'default' : 'pointer',
                touchAction: 'manipulation',
              }}>{cur.action.label}</button>
          )}
          <button type="button" onPointerUp={close}
            data-infopopup-close
            style={{
              flex: cur.action ? '0 0 auto' : '1 1 auto',
              padding: '9px 14px',
              background: 'transparent', color: COL.muted,
              border: `1px solid ${COL.border}`, borderRadius: 9,
              fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
              touchAction: 'manipulation',
            }}>Got it</button>
        </div>
        )}
      </div>
    </div>
  );
};
