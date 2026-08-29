import React from 'react';
import { chatChannelBus } from '@/game/chatChannel.js';

/* ═══ THE CHANNEL PICKER (v2.3.2139) ═══
 *
 * A chip per lane the worker can carry, plus a name field when the lane is
 * Whisper.  Rendered by BOTH composers -- the legacy ChatPanel and the mobile
 * ChatBubble -- because a picker on one of them is a picker a player learns
 * and then loses.
 *
 * WHY THE CURRENT LANE IS SHOUTED, not merely indicated: the whole risk of a
 * channel selector is saying something in a lane you did not think you were
 * in.  So the selected chip is filled in its lane's own colour rather than
 * outlined, and the composer's placeholder changes with it (see the callers).
 * Two cues, because the demo told us one is not enough.
 *
 * A lane whose cap is absent is not drawn at all -- chatChannelBus.available()
 * decides -- so against an older worker this is silently just the All chip,
 * which is exactly the behaviour that surface had before this shipped.
 */
export const ChatChannelChips = ({ compact }) => {
  const [, bump] = React.useState(0);
  React.useEffect(() => chatChannelBus.subscribe(() => bump((v) => v + 1)), []);
  const lanes = chatChannelBus.available();
  const mode = chatChannelBus.mode();
  /* One lane is not a choice -- and an old worker offers exactly one.  Drawing
     a lone "All" chip would be chrome pretending to be a control (the same
     argument ChatBubble's own note makes about a one-setting toggle). */
  if (lanes.length < 2) return null;
  const cur = lanes.find((l) => l.id === mode) || lanes[0];

  return React.createElement('div', {
    'data-chatlanes': mode,
    style: {
      display: 'flex', alignItems: 'center', gap: 6,
      flexWrap: 'wrap', width: '100%',
      marginBottom: compact ? 4 : 6,
    },
  },
    lanes.map((l) => {
      const on = l.id === mode;
      return React.createElement('button', {
        key: l.id,
        type: 'button',
        'data-chatlane': l.id,
        'aria-pressed': on,
        title: l.hint,
        onPointerUp: (e) => { e.stopPropagation(); chatChannelBus.setMode(l.id); },
        style: {
          /* 32px, not the 44pt floor: these sit directly above a 44px input
             inside an already tight composer, and the row would push the
             textarea into the iOS keyboard.  They are a mode strip, not a
             primary action. */
          minHeight: 32, padding: '0 12px',
          borderRadius: 8, cursor: 'pointer',
          fontSize: 12, fontWeight: 800,
          fontFamily: 'Source Sans 3,sans-serif',
          background: on ? l.color : '#293B41',
          color: on ? '#172126' : '#B6C1BE',
          border: '1px solid ' + (on ? l.color : 'rgba(229,237,233,.20)'),
          touchAction: 'manipulation',
        },
      }, l.label);
    }),
    mode === 'whisper' && React.createElement('input', {
      key: '_to',
      'data-chatlane-to': '',
      value: chatChannelBus.to(),
      onChange: (e) => chatChannelBus.setTo(e.target.value),
      placeholder: 'who?',
      autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'off', spellCheck: 'false',
      maxLength: 24,
      style: {
        flex: '1 1 90px', minWidth: 70, height: 32,
        padding: '0 10px', boxSizing: 'border-box',
        background: '#111E23',
        WebkitAppearance: 'none', appearance: 'none',
        /* Same inset guard the composers use: a UA that force-paints the
           field white would otherwise make warm-white text invisible. */
        WebkitBoxShadow: 'inset 0 0 0 100px #111E23',
        boxShadow: 'inset 0 0 0 100px #111E23',
        border: '1px solid rgba(229,237,233,.11)',
        borderRadius: 8,
        color: '#F4F0E7', WebkitTextFillColor: '#F4F0E7', caretColor: '#EAC675',
        /* 16px everywhere else in this UI stops iOS zooming the page on
           focus; 13 is deliberate here because this field sits in a 32px
           strip and never receives focus before the composer does. */
        fontSize: 13, outline: 'none',
      },
    }),
    React.createElement('span', {
      key: '_hint',
      style: { fontSize: 10.5, color: '#8D9B98', flex: '0 1 auto', whiteSpace: 'nowrap' },
    }, cur ? cur.hint : ''),
  );
};

/** The composer's placeholder, so the lane is stated in the field the player
 *  is actually looking at as well as on the chip. */
export function lanePlaceholder(fallback) {
  const lanes = chatChannelBus.available();
  if (lanes.length < 2) return fallback;
  const m = chatChannelBus.mode();
  if (m === 'area') return 'Say it to this zone…';
  if (m === 'whisper') {
    const to = chatChannelBus.to().trim();
    return to ? ('Whisper to ' + to + '…') : 'Whisper — pick a name first…';
  }
  return fallback;
}
