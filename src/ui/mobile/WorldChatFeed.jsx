import React, { useEffect, useRef, useState } from 'react';
import { chatLogBus } from './chatLogBus.js';
import { uiBusyBus } from './uiBusyBus.js';   /* v2.3.2085 */

/* ═══ v2.3.2037: WORLD CHAT, AS ITS OWN SECTION ═══
 *
 * Owner: "Remove the world chat (everything should be world chat). Just have
 * the chat appear in the lower left area above the dashboards in a new
 * 'World Chat' section" -- and, clarifying, "by chat appear I mean sent
 * messages. Keep chat window where it is."
 *
 * So the FEED moves and the composer does not. Until now the feed lived
 * inside the composer card behind a "World chat" toggle (v2.3.1980), which
 * meant sent messages were only visible while you had the chat window open --
 * exactly backwards for the one thing you want to keep half an eye on while
 * playing. The toggle goes with it: there is nothing left to switch between
 * once every line is world chat, and a control that only ever has one setting
 * is a control that reads as a choice and isn't one.
 *
 * PLACEMENT follows zLayers.js rule 2 rather than a guessed number: the
 * BottomDashboard is `position:fixed; bottom:0; height:var(--dash-h)`, so a
 * bottom-anchored panel has to clear the BAND geometrically with
 * `bottom: calc(var(--dash-h) + N)`. A high z-index alone would float this
 * ON TOP of the dashboard, covering the controls -- which is the exact bug
 * that made someone write that file.
 *
 * IT DOES NOT EAT TAPS. pointerEvents is 'none' on the shell so the world
 * behind it stays draggable, and 'auto' only on the scrollable list. A chat
 * feed that swallowed a joystick drag in the lower left would be a worse
 * problem than the one this solves.
 *
 * ...AND IT NO LONGER EATS A PANEL'S EITHER (v2.3.2085). The sentence above
 * was true of the WORLD behind the feed and false of anything ABOVE it. The
 * scrollable list has to be pointerEvents:'auto' to be scrollable, and it is
 * a 260x104 rectangle in the same lower-left corner as the inspect card's
 * action row -- so the card's single most important button, Trade, could not
 * be pressed while any chat line was on screen. mp-trade had been failing on
 * exactly that for weeks behind a message that reads as innocent ("element is
 * visible, enabled and stable", then a timeout); H.clickText naming what
 * elementFromPoint finds at the button's centre (v2.3.2084) answered it in
 * one run.
 *
 * A z-index cannot settle it: the card already claims 99800 against this
 * feed's 25 and loses anyway, because this shell is styled `left: 8px` and
 * renders at x=295 -- its `position: fixed` is captured by a transformed
 * ancestor, which also scopes its z-index inside that ancestor's stacking
 * context (TRAPS §20). What settles it is the feed declining the tap while a
 * panel is open, which is the same thing it already does for the world.
 *
 * QUIET WHEN EMPTY: with nothing said, it renders nothing at all rather than
 * an empty box captioned "Nothing said yet." A permanent widget explaining
 * that it is empty is worse than the space it would occupy, and on a phone
 * that space is the world.
 */

/* Matches the feed cap the composer used, so moving it did not silently
   change how much history you can scroll back through. */
const KEEP = 40;

export function WorldChatFeed() {
  const [, setV] = useState(0);
  const listRef = useRef(null);
  const stuckRef = useRef(true);

  useEffect(() => chatLogBus.subscribe(() => setV((n) => n + 1)), []);

  /* v2.3.2085: "is a panel open on top of me?"  Initialised from the bus
     rather than to false, because this component can mount after a panel is
     already up (a reconnect while the inspect card is open) and a first paint
     that swallows taps is the whole bug. */
  const [busy, setBusy] = useState(() => uiBusyBus.busy);
  useEffect(() => uiBusyBus.subscribe(setBusy), []);

  const S = (typeof window !== 'undefined' && window._gameState && window._gameState.current) || null;
  const lines = ((S && S.chatLog) || []).slice(-KEEP);

  /* Follow new lines only when the player is already at the bottom. Scrolling
     up to read something and having it yanked away by the next arrival is the
     classic chat-feed annoyance, and it is one comparison to avoid. */
  useEffect(() => {
    const el = listRef.current;
    if (el && stuckRef.current) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stuckRef.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < 24;
  };

  if (!lines.length) return null;

  return (
    <div
      data-world-chat=""
      style={{
        position: 'fixed',
        left: 8,
        /* Clears the dashboard band. See the note above: the band height is
           the CSS var, and 8px of air keeps the panel off its edge. */
        bottom: 'calc(var(--dash-h, 135px) + 8px)',
        /* Narrow on purpose: this is the LOWER LEFT corner, not a column.
           Capped in vw so it cannot swallow a landscape screen. */
        width: 'min(58vw, 260px)',
        zIndex: 25,
        pointerEvents: 'none',
        fontFamily: 'Source Sans 3, sans-serif',
      }}
    >
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: '#8FA3A0',
        margin: '0 0 3px 2px',
        textShadow: '0 1px 2px rgba(4,7,9,.9)',
      }}>
        World Chat
      </div>
      <div
        ref={listRef}
        onScroll={onScroll}
        data-world-chat-lines={lines.length}
        style={{
          /* v2.3.2085: 'auto' so the log can be scrolled, 'none' while a panel
             is open on top of it -- see the header. */
          pointerEvents: busy ? 'none' : 'auto',
          maxHeight: 'min(26vh, 150px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          padding: '6px 8px',
          /* The established world-chrome recipe (Lantern Slate): an anchored
             surface over the world, hairline, soft lift. Slightly more
             transparent than the composer card -- this one is always present,
             and the world has to stay readable through it. */
          background: 'rgba(13,22,27,.72)',
          border: '1px solid rgba(229,237,233,.14)',
          borderRadius: 8,
          boxShadow: '0 8px 20px rgba(4,7,9,.30)',
          fontSize: 12,
          lineHeight: 1.35,
          scrollbarWidth: 'none',
        }}
      >
        {lines.map((m, i) => (
          /* ts+i, not ts: two lines can land in the same millisecond, and an
             index alone re-keys every row when the log rolls over. Carried
             over from the composer's copy of this list. */
          <div key={(m.ts || 0) + '-' + i} style={{ marginBottom: 3, wordBreak: 'break-word' }}>
            {m.name ? (
              <span style={{ color: m.color || '#8FB8C9', fontWeight: 700 }}>{m.name}: </span>
            ) : null}
            <span style={{ color: m.muted ? '#667875' : (m.name ? '#F4F0E7' : '#EAC675') }}>{m.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
