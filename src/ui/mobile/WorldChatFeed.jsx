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

/* ═══ v2.3.2099: THE FEED FOLDS TO ONE LINE ═══
 * Owner: "add a tap to close world chat button that takes up a single line
 * and maybe just has a number next to unread messages".
 *
 * The header was a caption. It is a button now, it is the whole control when
 * the feed is shut, and it carries the count of what you have not read.
 *
 * WHY THE STATE IS REMEMBERED. A player who shuts the chat to see the world
 * means it, and this component remounts on a reconnect -- which is exactly
 * when someone is least pleased to have their screen covered again. One
 * localStorage key, read defensively: a private window or a browser blocking
 * site data throws on access, and a chat panel is not worth a boot failure.
 *
 * WHY UNREAD IS COUNTED FROM A TIMESTAMP rather than a running tally. The log
 * is capped at KEEP and rolls over, and lines arrive while this component is
 * unmounted; a counter incremented on arrival would drift from what is
 * actually on screen every time either happens. The mark is "the newest line I
 * had shown you", and unread is however many are newer than it -- which stays
 * true across a remount, a rollover and a zone change without any bookkeeping.
 */
const SHUT_KEY = 'bt_worldchat_shut';
const readShut = () => {
  try { return localStorage.getItem(SHUT_KEY) === '1'; } catch (e) { return false; }
};
const writeShut = (v) => {
  try { localStorage.setItem(SHUT_KEY, v ? '1' : '0'); } catch (e) { /* private window */ }
};

export function WorldChatFeed() {
  const [, setV] = useState(0);
  const listRef = useRef(null);
  const stuckRef = useRef(true);
  const [shut, setShut] = useState(readShut);
  /* The newest ts the player has been shown. 0 until the first paint marks it,
     so a first-ever open does not claim a backlog of unread. */
  const seenRef = useRef(0);

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

  /* Newer than the mark = unread. Own lines count as read the moment they are
     shown, which the mark handles for free: the effect below runs on the same
     render that paints them. */
  const unread = shut ? lines.filter((m) => (m.ts || 0) > seenRef.current).length : 0;

  /* Open means you have seen the newest line.
     KEYED ON THE NEWEST TIMESTAMP, NOT ON lines.length. The log is capped at
     KEEP and rolls over, so in a busy chat the length pins at 40 and stops
     changing while messages keep arriving -- an effect keyed on it would stop
     advancing the mark, and the next time the player folded the feed every
     line they had just read would be counted unread. Caught by looking at the
     dependency rather than by the badge, which reads correctly right up until
     the fortieth message. */
  const newestTs = lines.length ? (lines[lines.length - 1].ts || 0) : 0;
  useEffect(() => {
    if (!shut && newestTs) seenRef.current = Math.max(seenRef.current, newestTs);
  }, [shut, newestTs]);

  if (!lines.length) return null;

  const toggle = () => {
    setShut((wasShut) => {
      const next = !wasShut;
      /* Opening clears the badge in the same act that reveals the lines. */
      if (!next && newestTs) seenRef.current = Math.max(seenRef.current, newestTs);
      writeShut(next);
      return next;
    });
  };

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
      <button
        type="button"
        data-world-chat-toggle=""
        aria-expanded={!shut}
        onClick={toggle}
        style={{
          /* The wrapper is pointerEvents:none so the world stays draggable
             around the feed; this control opts back in. 'none' while a panel
             is over it, for the same reason the list does it (v2.3.2085) --
             a button under a sheet that still takes the tap is the bug that
             file's header is about. */
          pointerEvents: busy ? 'none' : 'auto',
          /* ONE LINE, and it has to stay one line on the narrowest phone:
             fixed height, nothing wraps, the label truncates before the count
             does. 28px keeps the shut state compact while staying a real
             touch target at this width. */
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          height: 28,
          padding: '0 8px',
          margin: '0 0 3px 0',
          boxSizing: 'border-box',
          /* Reads as part of the feed, not as a separate widget: the same
             surface recipe as the list below it. */
          background: 'rgba(13,22,27,.72)',
          border: '1px solid rgba(229,237,233,.14)',
          borderRadius: 8,
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: '#8FA3A0',
          textShadow: '0 1px 2px rgba(4,7,9,.9)',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          World Chat
        </span>
        {unread > 0 ? (
          <span
            data-world-chat-unread={unread}
            style={{
              flex: '0 0 auto',
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 999,
              background: 'var(--ui-brass, #D8AA58)',
              color: '#20170D',
              fontSize: 11,
              fontWeight: 800,
              lineHeight: '18px',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
        {/* The chevron is the affordance: it says this folds, which a bare
            label never did. Inline, because it is two lines of SVG and a
            texture that loads on first use is the regression CLAUDE.md names. */}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"
          style={{ flex: '0 0 auto', transform: shut ? 'rotate(180deg)' : 'none' }}>
          <path d="M1 3.5 L5 7 L9 3.5" fill="none" stroke="#8FA3A0"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {shut ? null : (
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
      )}
    </div>
  );
}
