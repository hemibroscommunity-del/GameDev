import React, { useEffect, useRef, useState } from 'react';
import { chromeSilenced, onGuardChange } from './modalGuardBus.js'; /* v2.3.2145 */
import { chatLogBus } from './chatLogBus.js';
import { uiBusyBus } from './uiBusyBus.js';   /* v2.3.2085 */
import { capeStatusBus } from './capeStatusBus.js'; /* v2.3.2118 */

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
 * IT DOES NOT EAT TAPS -- and as of v2.3.2123 that is finally true rather
 * than intended. pointerEvents is 'none' on the shell AND on the line list;
 * the fold header is the only interactive thing here, and it sits above the
 * joystick disc. A chat feed that swallowed a joystick drag in the lower left
 * would be a worse problem than the one this solves, and for two versions it
 * WAS that problem: see the note on the list's style, and mp-chatjoy, which
 * measures it at the disc rather than trusting this paragraph.
 *
 * ...AND IT NO LONGER EATS A PANEL'S EITHER (v2.3.2085). The sentence above
 * was true of the WORLD behind the feed and false of anything ABOVE it. The
 * list was pointerEvents:'auto' back then so that it could be scrolled, and it
 * is a rectangle in the same lower-left corner as the inspect card's action
 * row -- so the card's single most important button, Trade, could not be
 * pressed while any chat line was on screen. mp-trade had been failing on
 * exactly that for weeks behind a message that reads as innocent ("element is
 * visible, enabled and stable", then a timeout); H.clickText naming what
 * elementFromPoint finds at the button's centre (v2.3.2084) answered it in
 * one run. v2.3.2123 removes the cause rather than the symptom -- an inert
 * list cannot cover anything -- but the `busy` gate stays on the header,
 * which is still a real button in that same corner.
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
/* ═══ v2.3.2155: THE CORNER RESTS AS A BELL ═══
 * Owner: "collapse all notifications (chat, special events, etc, into a little
 * notification bell on the bottom left corner above the dashboard)."
 *
 * So SHUT is the default, not open: only an explicit '0' -- a player who has
 * opened the feed and left it open -- keeps the list up. A first-ever session
 * now starts with a quiet corner and a bell, which is the ask.
 *
 * This changes what four scenarios see on boot (the list only exists while
 * open), and they are updated to press the bell rather than the default being
 * bent back to suit them. */
const SHUT_KEY = 'bt_worldchat_shut';
const readShut = () => {
  try { return localStorage.getItem(SHUT_KEY) !== '0'; } catch (e) { return true; }
};
const writeShut = (v) => {
  try { localStorage.setItem(SHUT_KEY, v ? '1' : '0'); } catch (e) { /* private window */ }
};

export function WorldChatFeed() {
  const [, setV] = useState(0);
  const listRef = useRef(null);
  const [shut, setShut] = useState(readShut);
  /* The newest ts the player has been shown. 0 until the first paint marks it,
     so a first-ever open does not claim a backlog of unread. */
  const seenRef = useRef(0);
  /* v2.3.2175: the bell's tap origin.  Declared HERE, with the other hooks
     and above this component's early `return null` -- the first cut put it
     down beside the handler that uses it and turned a quiet corner into
     React error #310 (a hook behind a conditional return), which took the
     whole feed off the screen.  Handlers may live anywhere; hooks may not. */
  const tapRef = useRef(null);

  useEffect(() => chatLogBus.subscribe(() => setV((n) => n + 1)), []);
  /* v2.3.2145: and repaint when the silence control or a trade guard flips,
     or the feed keeps talking after the player has asked it not to. */
  useEffect(() => onGuardChange(() => setV((n) => n + 1)), []);

  /* v2.3.2085: "is a panel open on top of me?"  Initialised from the bus
     rather than to false, because this component can mount after a panel is
     already up (a reconnect while the inspect card is open) and a first paint
     that swallows taps is the whole bug. */
  const [busy, setBusy] = useState(() => uiBusyBus.busy);
  useEffect(() => uiBusyBus.subscribe(setBusy), []);

  /* ═══ v2.3.2118: THE TICKET COUNT, BACK AS ONE LINE ═══
     Owner: "Can you just include one line near chat like #/# golden tickets
     left?" — after v2.3.2117 pulled the full status sentence off this board
     for covering the joystick.  The chip is the size the objection allows: a
     single fit-content line, pointerEvents:'none' so it can never eat a drag,
     and rendered ONLY while the worker says the contest is live — outside an
     event this corner goes back to empty, which is what v2.3.2117 bought.
     Initialised from the bus, same reason as `busy` above: cape_status
     arrives once, on join, usually before this component mounts. */
  const [capeSt, setCapeSt] = useState(() => capeStatusBus.payload);
  useEffect(() => capeStatusBus.subscribe(setCapeSt), []);
  const _crimson = (capeSt && capeSt.live && capeSt.capes && capeSt.capes.crimson) || null;
  /* remaining === null is the ledger still warming ("unknown", not "none
     left" — eventcapes.js draws that line and the chip keeps it): no chip
     beats a wrong number.  0 stays visible on purpose — "0/20 left" is the
     contest ending in public view, and it leaves when the event flag does. */
  /* ═══ v2.3.2266: THE CONTEST IS OVER, SO ITS SCOREBOARD COMES DOWN ═══
     Owner: "you can remove the golden ticket left notification.  The event is
     over."

     The chip was written to leave on its own -- the note above says "it leaves
     when the event flag does" -- and it did not, so the flag it reads is still
     set somewhere upstream and a running scoreboard for a finished contest was
     taking a line off the top of his screen.  Turned off HERE rather than
     chased upstream: the ledger, the bus and the server's cape accounting are
     all still correct and still feed the cape itself, and the one thing that
     was wrong was a permanent chip.
     Kept as a constant rather than deleted so the next event is one word: the
     render below and the empty-feed guard both read it, and both stay wired. */
  const TICKET_CHIP_ENABLED = false;
  const ticketChip = (TICKET_CHIP_ENABLED && _crimson && typeof _crimson.remaining === 'number')
    ? `${_crimson.remaining}/${_crimson.cap} golden tickets left`
    : null;

  const S = (typeof window !== 'undefined' && window._gameState && window._gameState.current) || null;
  const lines = ((S && S.chatLog) || []).slice(-KEEP);

  /* Follow the newest line.  v2.3.2123: unconditionally, because the list is
     pointerEvents:'none' now and there is no longer any way for the player to
     scroll away from the bottom — the "don't yank it away from someone reading
     history" comparison this used to make had nothing left to protect.  See
     the note on the list's own style for why it stopped being interactive. */
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

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

  /* Quiet when empty (see header) — but the ticket chip may stand alone
     during an event.  One 20px line in an otherwise clear corner is the
     thing the owner asked for; the 260px board it replaces is the thing
     they asked to remove (v2.3.2117). */
  if (!lines.length && !ticketChip) return null;

  /* ═══ v2.3.2175: A FINGER THAT MOVES 4px IS STILL A TAP ═══
     Owner: "Make it so when you tap on the alert bell it pops back up with
     the notifications."  It was already wired to do exactly that -- and it
     did not, for a reason mp-notifbell could not see: the test drove
     page.click(), which SYNTHESISES a click whatever the touch did, while a
     real finger produces touchstart -> touchmove -> touchend.  Measured in
     the harness with real CDP touch events: a pixel-perfect tap opened it,
     a tap with 4px of drift did nothing.  Every real tap drifts.

     The click never arrives because this corner sits over the movement pad:
     the global touchmove guard (BroTown's gM) preventDefaults the drifted
     move and the joystick claims the sequence, so the browser never
     synthesises the click this button was listening for.  Pointer events do
     not depend on that synthesis, which is why the rest of this codebase
     taps with onPointerUp -- the bell was the odd one out.

     The drag guard keeps the other half honest: the bell is ON the movement
     pad, so a real DRAG that happens to start on it must still steer the
     character rather than toggling the feed.  12px is the same order as the
     joystick's own tap/drag split. */
  const onTapDown = (e) => { tapRef.current = { x: e.clientX, y: e.clientY }; };
  const onTapUp = (e) => {
    const s = tapRef.current;
    tapRef.current = null;
    if (!s) return;                       /* the gesture did not start here */
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if ((dx * dx + dy * dy) > (12 * 12)) return;   /* a drag: leave it to the pad */
    e.stopPropagation();
    toggle();
  };

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
        /* v2.3.2174: pinned to the WORLD's left edge, not the screen's.  In
           landscape the dashboard may now take the left edge (owner: the
           punch hole "goes right through the menus"), and this shell -- the
           chat feed and the v2.3.2155 notification bell it carries -- sat
           underneath it.  --world-x is 0 in portrait and whenever the panel
           is on the right, so this is the `left: 8` it replaces everywhere
           else. */
        /* v2.3.2176b: ...and clear of the landscape fold chip.  At rest
           the dashboard is minimised to that one ▴ button, --world-x drops
           to 0, and this shell landed underneath it -- the bell unreadable
           and untappable in the one state the player spends most of their
           time in.  --land-fold-w is 0 everywhere else (BroTown resize()),
           so this is the same `left` in portrait and with any sheet open. */
        left: 'calc(var(--world-x, 0px) + var(--land-fold-w, 0px) + 8px)',
        /* Clears the dashboard band. See the note above: the band height is
           the CSS var, and 8px of air keeps the panel off its edge. */
        bottom: 'calc(var(--dash-h, 135px) + 8px)',
        /* Narrow on purpose: this is the LOWER LEFT corner, not a column.
           Capped in vw so it cannot swallow a landscape screen.
           v2.3.2155: and while shut it is the BELL's width and nothing more.
           The shell is pointerEvents:'none', so this is not about taps -- it is
           so the button inside cannot inherit a 260px line box and go on
           covering the joystick with an invisible strip. */
        width: shut ? 'auto' : 'min(58vw, 260px)',
        /* v2.3.2145: already under .bt-inspect (32) and already unable to eat a
           tap, so the trade guard costs it nothing -- but it is the surface the
           owner NAMED ("chat, etc"), and it is what the silence control has to
           actually silence. One flag answers both. */
        zIndex: 25,
        pointerEvents: 'none',
        fontFamily: 'Source Sans 3, sans-serif',
      }}
    >
      {/* v2.3.2155: the golden-ticket line is a "special event" in the owner's
          words, so it folds into the bell with the rest rather than standing
          outside it. Shut, the corner is one 36px button and nothing else. */}
      {(ticketChip && !shut) ? (
        <div
          data-cape-chip={_crimson.remaining}
          style={{
            /* fit-content, not the shell's 260px: the width complaint IS the
               v2.3.2117 incident.  Inherits the shell's pointerEvents:'none'
               — a readout, never a tap target over the joystick. */
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            width: 'fit-content',
            maxWidth: '100%',
            height: 20,
            padding: '0 7px',
            margin: '0 0 3px 0',
            boxSizing: 'border-box',
            /* The feed's own surface recipe, so it reads as this corner's
               chrome and not a new widget. */
            background: 'rgba(13,22,27,.72)',
            border: '1px solid rgba(229,237,233,.14)',
            borderRadius: 8,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: '#8FA3A0',
            textShadow: '0 1px 2px rgba(4,7,9,.9)',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 11 }}>{'\u{1F39F}️'}</span>
          <span style={{ color: 'var(--ui-brass, #D8AA58)', fontVariantNumeric: 'tabular-nums' }}>
            {_crimson.remaining}/{_crimson.cap}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>golden tickets left</span>
        </div>
      ) : null}
      {lines.length ? (
      <button
        type="button"
        data-world-chat-toggle=""
        aria-expanded={!shut}
        /* v2.3.2175: pointer events, not onClick — see onTapUp above.  No
           onClick beside them: on a mouse both would fire and the feed would
           toggle twice back to where it started. */
        onPointerDown={onTapDown}
        onPointerUp={onTapUp}
        onPointerCancel={() => { tapRef.current = null; }}
        style={{
          /* The wrapper is pointerEvents:none so the world stays draggable
             around the feed; this control opts back in. 'none' while a panel
             is over it, for the same reason the list does it (v2.3.2085) --
             a button under a sheet that still takes the tap is the bug that
             file's header is about. */
          pointerEvents: busy ? 'none' : 'auto',
          /* ═══ v2.3.2155: SHUT IS A 36px BELL, OPEN IS THE OLD HEADER ═══
             This control has always been the one thing in this corner that
             takes a tap, and it sits at z-index 25 over [data-joyzone="L"] --
             the invisible full-left-half pad at z-index 6 that receives every
             movement drag. Anything here that opts back into pointer events
             takes that patch of screen away from movement, which is what made
             the v2.3.2145 silence chip unshippable three times over.
             The bell makes that patch SMALLER, not larger: measured on a
             390px phone the old header was 226x28 = 6328px of stolen drag
             area (the 260px shell cap only bites on a wider screen), and the
             bell is 36x36 = 1296 -- a 79% cut. That is the reason to prefer a
             bell here beyond the owner asking for one, and mp-notifbell
             measures the footprint rather than trusting the arithmetic.
             Open, it is the full-width header it has been since v2.3.2099 --
             a label and a chevron are what say "this folds", and a bell that
             stayed a bell would leave the open state with no way back. */
          display: 'flex',
          alignItems: 'center',
          justifyContent: shut ? 'center' : 'flex-start',
          gap: shut ? 0 : 6,
          position: 'relative',
          width: shut ? 36 : '100%',
          height: shut ? 36 : 28,
          padding: shut ? 0 : '0 8px',
          margin: shut ? 0 : '0 0 3px 0',
          boxSizing: 'border-box',
          /* Reads as part of the feed, not as a separate widget: the same
             surface recipe as the list below it. */
          /* v2.3.2155: the shut bell stands ON the world rather than inside a
             panel, so it carries a little more ground than the open header
             did -- at .72 over bright sand the glyph had nothing behind it. */
          background: shut ? 'rgba(13,22,27,.86)' : 'rgba(13,22,27,.72)',
          border: `1px solid ${shut ? 'rgba(229,237,233,.26)' : 'rgba(229,237,233,.14)'}`,
          borderRadius: shut ? 10 : 8,
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        {shut ? (
          /* The bell is INLINE SVG, like the chevron below it and for the same
             reason: a texture that loads on first use is the regression
             CLAUDE.md names by name, and this one would load the first time a
             player was ever notified of anything -- exactly the moment it must
             already be there. */
          <>
            <svg width="21" height="21" viewBox="0 0 20 20" aria-hidden="true"
              style={{ display: 'block' }}>
              <path
                d="M10 2.6a4.6 4.6 0 0 0-4.6 4.6v2.5L4.1 12.4a.7.7 0 0 0 .6 1.05h10.6a.7.7 0 0 0 .6-1.05L14.6 9.7V7.2A4.6 4.6 0 0 0 10 2.6Z"
                fill="none" stroke={unread > 0 ? 'var(--ui-brass, #D8AA58)' : '#8FA3A0'}
                strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M8.2 15.2a1.9 1.9 0 0 0 3.6 0"
                fill="none" stroke={unread > 0 ? 'var(--ui-brass, #D8AA58)' : '#8FA3A0'}
                strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {unread > 0 ? (
              /* Overlapping the bell's shoulder rather than sitting beside it:
                 the whole point of the shut state is that it is 36px wide, and
                 a badge on a row would spend that back. */
              <span
                data-world-chat-unread={unread}
                style={{
                  /* v2.3.2155b: 16px and overlapping at -3 put a 25px pill
                     across a 36px button and hid the bell behind its own
                     count -- the first render of this read as a brass blob.
                     14px, and pushed clear of the corner, so the glyph is
                     what you see and the number is what you check. */
                  position: 'absolute', top: -5, right: -5,
                  minWidth: 14, height: 14, padding: '0 3px',
                  borderRadius: 999,
                  background: 'var(--ui-brass, #D8AA58)',
                  color: '#20170D',
                  fontSize: 9, fontWeight: 800, lineHeight: '14px',
                  textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                  boxShadow: '0 0 0 2px rgba(13,22,27,.92)',
                }}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </>
        ) : (
          <>

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
          {/* ═══ v2.3.2266: IT POINTED THE WRONG WAY ═══
              Owner: "the down arrow makes me think it expands it."  It did,
              and the convention it was breaking is universal -- a chevron
              points the way the content is about to GO.  Open, this feed folds
              UPWARD into its own one-line header, so the arrow has to point up;
              shut, tapping brings the messages back DOWN, so it points down.
              It was exactly inverted: the rotation was keyed to `shut` when the
              glyph's resting direction is already down.  Dropping the rotation
              on `shut` and applying it while OPEN swaps the pair, which is one
              character of change and the whole of the complaint. */}
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"
            style={{ flex: '0 0 auto', transform: shut ? 'none' : 'rotate(180deg)' }}>
            <path d="M1 3.5 L5 7 L9 3.5" fill="none" stroke="#8FA3A0"
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          </>
        )}
      </button>
      ) : null}
      {(!lines.length || shut) ? null : (
      <div
        ref={listRef}
        data-world-chat-lines={lines.length}
        style={{
          /* ═══ v2.3.2123: THE LIST IS READ-ONLY, AND THAT IS THE FIX ═══
             All four demo reviewers reported this corner, and Uttam named the
             mechanism: "in phone worldchat cover left side of joystick, unable
             to move jotstick".  Measured (tools/qa/mp/mp-chatjoy.mjs): with a
             busy room's chat in it this panel is 204px tall at 389..593, the
             joystick disc lives at 452..527, elementFromPoint returns a chat
             <span> at every point on the disc, and a real touch drag moves the
             player ZERO pixels.  The joystick is simply dead.

             The header of this file claimed the opposite — "IT DOES NOT EAT
             TAPS ... a chat feed that swallowed a joystick drag in the lower
             left would be a worse problem than the one this solves".  That was
             true of the SHELL, which is pointerEvents:'none', and false of this
             list, which had to be 'auto' to be scrollable.  The shell being
             transparent buys nothing when its opaque child is the thing over
             the thumb.

             So the list stops being interactive at all.  What that costs is
             scrolling back through history; what it buys is the primary
             control of the game, in the corner the owner asked the feed to
             live in (v2.3.2037).  It is not a close trade — and it costs less
             than it looks, because the feed auto-follows the newest line, so
             the bottom is where it already sits.  A player who wants the
             corner back entirely still folds it with the header, which stays
             tappable and sits ABOVE the disc (measured at 412..440 against the
             disc's 452).

             `busy` no longer changes anything here and the prop is kept: it
             still gates the header below, which IS interactive, and that is
             the v2.3.2085 case (an inspect card's Trade button in this same
             corner). */
          pointerEvents: 'none',
          /* v2.3.2145: silenced means silent. The MESSAGES fade, not the
             shell, so the feed's fold header stays where it is and the corner
             does not reflow when you mute; the switch itself lives in Settings
             (see the note there for why it is not in this corner). */
          opacity: chromeSilenced() ? 0 : 1,
          transition: 'opacity 140ms ease',
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
