import React, { useLayoutEffect, useRef, useState } from 'react';
import { BT_AUDIO } from '@/data/index.js'; /* v2.3.2639: the tab-tap sound */
import { COL } from './common.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashMinBus } from '../dashMinBus.js'; /* v2.3.3897: the bag button unfolds the band */
import { playIsLandscape } from '../playViewport.js'; /* v2.3.2158: the tap decides by shape */
import { navButtonSize } from '../sheet/sheetGeometry.js';
import { NAV_KEYS } from '@/game/deskKeys.js'; /* v2.3.3407: each button's key, shown on a computer */

/* v2.3.1637 (owner mockup): the NAV RAIL — the destinations as icon-only
   buttons down the band's left edge, replacing the full-width bottom
   toolbar ribbon.  Owner: "get rid of the toolbar button on the bottom
   and just make them ... on the leftmost handed side", and on the width,
   "just the size of the icons".

   SEVEN buttons, not six.  The owner's own correction to their mockup:
   "it is incorrect to show the bag as the active.  It should be a new
   icon that represent a dashboard".  The resting band IS a destination —
   the three-column dashboard — and until now it was the one state the
   toolbar could not show you were in, because bar mode lights nothing.
   DASHBOARD is that state's button: lit whenever no panel is open, and
   tapping it closes back to rest.  v2.3.3784: its picture is the sack
   with the sword, bow and staff small across it (nav-dashboard.png, the
   owner: "a bag icon mini combat icons"), what it opens -- the bag's slots
   and the three combat cards; it was panel-stats, the bar chart.

   NO LABELS.  The ribbon had them because six buttons across the full
   width had the room; a rail sized to its icon does not, and stacking a
   7px caption under each icon would eat the height the seventh button
   needs.  Every icon here is one a player has already learned from the
   ribbon, in the same order.

   THE RAIL PERSISTS IN BOTH MODES, unlike the identity and columns rows.
   This is not a style choice: the ribbon it replaces stayed visible
   under an open panel (the sheet reserved var(--nav-h) for exactly that),
   and it is how you switch destinations or get out.  A rail that hid with
   the rest of the band would leave an open panel with no navigation. */

/* ═══ v2.3.4172: FIVE BUTTONS -- GEAR, BRO, QUESTS, CODEX, MORE ═══
   The owner's consolidation ("limit lots of buttons to switch between
   different context"): the Skills button went inside Bro (a page under it).
   Then his drawing of the row (61C354F2-...png and D474F679-...png in the
   repo root): CLOSE at the left, then each button its picture AND its word,
   the open one gold-bordered -- "Keep the 5 buttons".  So the words come
   back, wherever they fit at 11 px (navLabelMode, from each button's real
   width, measured: the side dock's buttons flex):
     beside  86 px and wider: the picture, then the word (the drawing; a
             tablet, a computer's one band);
     stack   46 px and wider: the word under the picture (an upright phone,
             58 px at 390: "Quests" beside its picture needs ~70);
     icon    narrower (a 320 px phone, 44 px; a phone on its side, ~30):
             the picture alone, the word its aria-label and title.
   The key cap stays on a computer. */
export const NAV_WORDS_BESIDE = 86;
/* v2.3.4355: 46 -> 44 with the sixth button: a 375 px iPhone's buttons are 45
   px, and "Quests", the longest word, is ~38 px in the 11 px badge (measured
   by mp-boards: no word is cut) -- so the words stay on every iPhone and on
   a 360 px phone (44); a 320 one shows the pictures alone, as it always has */
export const NAV_WORDS_STACK = 44;
/* v2.3.4243: each picture's opaque box [x0, y0, x1, y1] in its 256 px file
   (alpha > 24), so the button can show the art alone, edge to edge */
/* v2.3.4273, the owner: "'gear' font color is orange make it a bright yellow
   instead and a border to match when any dashboard button selected": the
   open button's name and its border are this bright yellow, not the brass */
const NAV_YELLOW = '#FFE23A';
const NAV_TRIM = {
  'nav-dashboard.png': [28, 2, 234, 255], 'panel-self.webp': [37, 35, 219, 220],
  'panel-quests.webp': [47, 60, 208, 217], 'panel-encyclopedia.webp': [35, 44, 222, 211],
  'nav-more.webp': [53, 62, 203, 218], 'nav-inventory.webp': [40, 32, 216, 217],
  'panel-leaderboard.webp': [31, 35, 225, 220],   /* v2.3.4355: the Leaderboards' button */
};
const navTrim = (src) => NAV_TRIM[String(src || '').split('?')[0].split('/').pop()] || [0, 0, 256, 256];
export function navLabelMode(btnW) {
  if (!(btnW > 0)) return 'icon';
  return btnW >= NAV_WORDS_BESIDE ? 'beside' : btnW >= NAV_WORDS_STACK ? 'stack' : 'icon';
}
export const NavRail = ({ items, litId, atRest, vw, vh, dots, profilePortrait, btnW, fill, landLit, btnH, iconPx }) => {
  /* v2.3.2166: `btnW` narrows the buttons for the landscape dock — the
     five of them must fit inside the side container's width (owner: the
     dashboard buttons "should all be included in that container on that
     whole right side"), and every 2px on a button is 10px off the world.
     Height keeps the derived rule; portrait passes nothing and is
     untouched. */
  /* v2.3.2170 (owner, with a zoomed screenshot of slack left of the row:
     "room to expand just the dashboard navigation buttons ... the left
     side of the buttons has space to fill"): `fill` stretches the group
     across its parent and lets each button flex into an equal share —
     btnW becomes the floor the geometry planned for, not the ceiling the
     render stops at. */
  const base = navButtonSize(vw, vh);
  /* v2.3.3687: a computer's buttons are taller, their pictures nearly twice a
     phone's (`btnH`, `iconPx`: sheetGeometry DESK_NAV_BTN_H / DESK_NAV_ICON) */
  const size = btnW ? { w: btnW, h: btnH || base.h } : base;
  /* v2.3.4172: each button's real width -- `fill` flexes them past btnW --
     measured from the group, so the words show wherever they fit */
  const railRef = useRef(null);
  const [realW, setRealW] = useState(0);
  useLayoutEffect(() => {
    const el = railRef.current;
    if (!el) return undefined;
    const n = Math.max(1, items.length);
    const measure = () => {
      const w = Math.floor((el.clientWidth - 8 - 4 * (n - 1)) / n);
      if (w > 0) setRealW(w);
    };
    measure();
    let ro = null;
    try { ro = new ResizeObserver(measure); ro.observe(el); } catch (e) { ro = null; }
    return () => { try { if (ro) ro.disconnect(); } catch (e) { /* gone */ } };
  }, [items.length]);
  const words = navLabelMode(fill ? (realW || size.w) : size.w);
  /* v2.3.4273, the owner: "Also make the button labels larger": the name badge is
     as large as the button fits -- up to 15 px beside the picture's room (a
     computer), 14 over it on a phone -- by the longest name ("Quests", "Codex"
     six letters at ~0.6 em each, a 3 px rim), never under the old 11 px: "More"
     and "Quests" stay whole at 320 px */
  const btnPx = fill ? (realW || size.w) : size.w;
  const badgePx = Math.max(11, Math.min(words === 'beside' ? 15 : 14, Math.floor((btnPx - 10) / 3.7)));
  /* stacked, the picture gives the word its line (the row's height is
     today's); beside, a little smaller than alone */
  const icon0 = iconPx || 24;
  const icon = words === 'stack' ? Math.max(18, Math.min(icon0, size.h - 22)) : words === 'beside' ? Math.min(icon0, Math.max(24, size.h - 20)) : icon0;
  return (
    <div className="bt-navrail" ref={railRef} data-nav-words={words} style={{
      /* v2.3.1642: a ROW at the band's top-left, in its own bordered
         section, with the identity strip beside it. */
      /* v2.3.1644 (owner: "make the buttons fill in the extra space").
         The group is CONTENT-SIZED and its buttons carry the new width
         explicitly (navButtonSize).  Letting the group flex:1 and the
         buttons flex inside it was the obvious reading and it was wrong:
         measured, the buttons took every spare pixel and grew to 58 while
         the name and XP bar were crushed to a 25px column.  A number the
         geometry owns can be balanced against what the strip needs; a
         flex grab cannot. */
      flex: 'none',
      width: fill ? '100%' : undefined, /* v2.3.2170: the dock's whole row */
      boxSizing: 'border-box',
      /* v2.3.1650 (owner: "remove the darker background behind the 3
         dashboard buttons").  The well + border + radius were the
         "its own little section" from v2.3.1642, and they have stopped
         earning their keep: the buttons carry their own fill, their own
         border and a brass active state, so the container was a second
         box drawn around three boxes.  Padding and gap stay — they are
         what keeps the group off the frame edge and off each other. */
      background: 'transparent',
      border: 'none',
      /* v2.3.1637b: BOTTOM-anchored, not centred.  The rail is 189px tall
         at rest and ~439 with a panel open, so centring moved every
         button ~110px up the screen the moment you opened one — the
         controls sliding out from under the thumb that just tapped them.
         This is the same failure v2.3.1307b pinned the old ribbon to fix
         ("toolbar bounces ~20-30px after closing"); bottom-anchoring puts
         each button at the SAME screen position in both modes. */
      display: 'flex', flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center',
      gap: 4, padding: 4,
    }}>
      {items.map((d) => {
        /* v2.3.2176: `landLit` is the sideways rule.  In portrait the chart
           lights AT REST, because rest IS the dashboard there (the columns
           row).  Sideways the buttons only exist while a destination is
           open, so `atRest` can never be true here -- the chart would be the
           one button with no lit state at all.  There it lights for the
           DASHBOARD destination like any other. */
        const on = landLit
          ? litId === d.id
          : (d.id === 'dashboard' ? atRest : (!atRest && litId === d.id));
        const count = dots && dots[d.id];
        return (
          <div key={d.id}
            /* v2.3.2017: a hook that is the destination ID, not its LABEL.
               The label is owner-facing copy and has been rewritten many times
               (Hero -> Character is the one that matters here), and a test that
               selects UI by a renamed label does not fail loudly — it stops
               finding anything and quietly asserts nothing.  That is TRAPS §29,
               and mp-hudface is the fifth scenario it killed. */
            data-nav={d.id}
            /* v2.3.4355: a button whose word is short for its page ("Ranks")
               is named in full where there is room for it (`title`) */
            role="button" aria-label={d.title || d.label} aria-pressed={on}
            /* ═══ v2.3.3407: ITS KEY IN THE CORNER, ON A COMPUTER ═══
               The owner: "For computer usage if there's a key that makes
               sense to use for a certain action just put the letter next to
               the icon".  I P J L K O (game/deskKeys.js, which
               desktopControls.js binds): drawn by game.css's [data-key] only
               under a mouse, as generated content, never a text node; the
               hover's tooltip says it too. */
            data-key={NAV_KEYS[d.id] || undefined}
            title={NAV_KEYS[d.id] ? (d.title || d.label) + ' (' + NAV_KEYS[d.id] + ')' : (d.title || d.label)}
            onPointerUp={(e) => {
              e.stopPropagation();
              /* ═══ v2.3.2639: THE TAB TAP, WHERE THE TAP ACTUALLY IS ═══
                 Owner: "the tapping other tabs did not play any sound."
                 v2.3.2637 put it on dashboardPanelBus.tapDestination, which
                 reads like the right chokepoint and has NO CALLERS -- this
                 rail calls open() and toBar() directly.  So the sound went on
                 dead code and the tabs were silent.
                 Here instead: this handler IS the gesture the owner described,
                 it fires for every one of the rail's buttons and for both
                 outcomes (open a destination, or drop back to rest), and it
                 cannot be reached by the programmatic open() calls that would
                 have made open() itself a noisy place to put it.
                 Deduped by uiTick, so the pointer event firing twice on a
                 slow tap still makes one sound.

                 ═══ v2.3.2658: THE CLICK, NOT THE CLOSE ═══
                 Owner: "Use the click sound for navigating through the menus
                 (tapping the dashboard buttons ...)".  These ARE the dashboard
                 buttons.  v2.3.2639 played 'ui-close' here because a close
                 sound was the only UI sound the game had; navigation has its
                 own voice now, and ui-close goes back to meaning a window
                 shutting.

                 KEPT EXPLICIT even though src/ui/uiSfxDelegate.js would now
                 catch this tap on its own (these are role="button"): this is
                 the ONE control the owner has already reported silent once,
                 and uiClickNow fires on the frame the finger lifts instead of
                 the delegate's 60ms.  The delegate's offer for the same tap
                 lands inside uiTick's same-key window and collapses into this
                 one, so belt-and-braces costs a duplicate CALL, never a
                 duplicate SOUND -- and if the delegate ever regresses, the
                 rail is the one thing that does not go quiet with it. */
              BT_AUDIO.uiClickNow();
              /* ═══ v2.3.2158: SIDEWAYS, THE DASHBOARD BUTTON IS THE BAG ═══
                 Owner, on a real iPhone in landscape: "The one thing I don't
                 understand is where my bag went.  I see the thin bar at the
                 bottom but no inventory slots when dashboard is active."

                 In portrait this button's job is "go to rest", because rest
                 IS the dashboard -- the columns row with the bag preview.
                 Landscape has no columns row (the whole point of the 48px
                 strip), so toBar() here was a lit button that showed
                 nothing: the one thing it promised -- your slots -- was the
                 one thing it could not produce.  Sideways it opens the Bag
                 sheet instead, and a second tap (or tapping it with ANY
                 sheet open) still rests -- so it is the same "give me the
                 world back" button the moment something is open, which is
                 the half of toBar() worth keeping.
                 Decided at TAP TIME from playIsLandscape() rather than from
                 subscribed state: the handler needs the answer only when the
                 finger lands. */
              if (d.id === 'dashboard') {
                if (playIsLandscape() && dashboardPanelBus.state.mode === 'bar') {
                  /* v2.3.2163: the destination is the DASHBOARD view now —
                     bag grid + combat pills stacked (PANELS.dashboard) —
                     not the bare bag; the owner named both halves. */
                  dashboardPanelBus.open('dashboard');
                  return;
                }
                dashboardPanelBus.toBar();
                /* v2.3.3897: UPRIGHT, THE BAG BUTTON UNFOLDS A FOLDED BAND.
                   Owner: "If you try to tap the bag dashboard button while
                   playing with the menu minimized it doesn't expand the
                   dashboard into the bag.  It should.  All the other buttons
                   do."  Every other button calls open(), and the band's
                   expanded-mode effect clears the fold; toBar() at rest
                   returns at once, so the fold (bt_dash_min) stayed and the
                   bag tiles never showed.  Unfold here too.  It only unfolds
                   -- a tap on an unfolded band is a no-op as before, never a
                   fold (the I key toggles; the grip folds).
                   v2.3.4172: kept for Gear, the same button renamed. */
                if (!playIsLandscape()) dashMinBus.set(false);
                return;
              }
              dashboardPanelBus.open(d.id);
            }}
            style={{
              position: 'relative',
              /* v2.3.1639 (owner): VERTICAL PILL — taller than wide with
                 fully-rounded ends, icon centred on both axes.
                 v2.3.1642: still a vertical pill, now in a horizontal
                 row — navButtonSize returns {w,h} with h from the
                 identity row so the shape survives the move. */
              /* v2.3.2170: under `fill` each button takes an equal share of
                 the row instead of the fixed floor width. */
              ...(fill ? { flex: '1 1 0', minWidth: size.w } : { width: size.w, flex: 'none' }),
              height: size.h,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              /* v2.3.4172: the word under the picture, or beside it */
              flexDirection: words === 'stack' ? 'column' : 'row',
              gap: words === 'stack' ? 1 : words === 'beside' ? 6 : 0,
              boxSizing: 'border-box', minWidth: 0,
              padding: words === 'beside' ? '0 6px' : 0,
              /* ═══ v2.3.2176: A LIT BUTTON IS NOT A TRANSPARENT ONE ═══
                 Owner, of the landscape dock: "the main dashboard button
                 (the chart) is transparent but should have the same
                 background as the other buttons."  It was: COL.accentFill
                 is rgba(216,170,88,0.15) -- a translucent brass TINT, which
                 over a dark band reads as a fill and over the bright world
                 reads as a hole.  Composited over the same opaque wellSoft
                 every other button carries, the lit state is the tint it
                 was always meant to be and the solidity matches. */
              background: on
                ? `linear-gradient(0deg, ${COL.accentFill}, ${COL.accentFill}), ${COL.wellSoft}`
                : COL.wellSoft,
              border: `${on ? 2 : 1}px solid ${on ? NAV_YELLOW : COL.tileBor}`,
              /* ═══ v2.3.2321: ROUNDED RECTANGLES, NOT CIRCLES ═══
                 Owner: "I want to see what rectangular shaped buttons with
                 rounded edges looks like for the navigation buttons instead of
                 the current circular ones.  The circular ones can't take
                 advantage of the extra space afforded by moving the gold to
                 the top bar."

                 He is right, and it is not a matter of taste: CSS
                 border-radius CLIPS HIT-TESTING, so a circle's corners are not
                 merely unpainted, they are dead.  Measured on a 390px phone,
                 elementFromPoint 6px in from a button's own top-left corner
                 returns the ROW, not the button.  At 999 on a 44x44 box that
                 is pi*22^2 = 1521px^2 of live target inside a 1936px^2 box --
                 21% of every button thrown away, and thrown away at the edges,
                 which is exactly where a thumb aiming at a neighbour lands.

                 11px is the house button radius (docs/LANTERN-SLATE-SPEC.md's
                 --radius-button, and the same 11 its 44px primary button
                 uses), so this is the scale the rest of the UI already wears
                 rather than a number picked to look right in one screenshot. */
              borderRadius: 11,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>
            {/* The Hero button is the player's own bust when it has
                rendered — the v2.3.1294 rule, kept: nothing says "my
                character" better than the character. */}
            {/* v2.3.4243 (owner: "for all of the dashboard buttons I want those
                button images to be blown up to fill the full button space.
                You can put the name labels on top of the picture similar to
                the badge you have for counting quantities"): the picture is
                trimmed of its empty margins (NAV_TRIM, measured from the
                256 px files' alpha) and scaled to the button's whole face
                (contain, a 2 px rim); the name is a badge over it, the
                bag's own .bt-item-qty look, bottom centre -- the key cap
                (top-left) and the red count (top-right) stay clear of it. */}
            <span aria-hidden="true" data-nav-art={d.id} style={{
              position: 'absolute', inset: 1, overflow: 'hidden', borderRadius: 9, pointerEvents: 'none',
              opacity: on ? 1 : 0.9,
            }}>
              {d.id === 'hero' && profilePortrait ? (
                <img src={profilePortrait} alt="" draggable={false}
                  style={{ position: 'absolute', left: '50%', top: 0, height: '100%', aspectRatio: '1', transform: 'translateX(-50%)', maxWidth: 'none', objectFit: 'contain', imageRendering: 'pixelated' }} />
              ) : (() => {
                const k = navTrim(d.icon);
                const bw = Math.max(8, (fill ? (realW || size.w) : size.w) - 6);
                const bh = Math.max(8, size.h - 6);
                const sc = Math.min(bw / (k[2] - k[0]), bh / (k[3] - k[1]));
                const cx = bw / 2 + 2, cy = bh / 2 + 2;
                return (
                  <img src={d.icon} alt="" draggable={false} style={{
                    position: 'absolute', maxWidth: 'none', imageRendering: 'auto',
                    width: 256 * sc, height: 256 * sc,
                    left: cx - ((k[0] + k[2]) / 2) * sc, top: cy - ((k[1] + k[3]) / 2) * sc,
                  }} />
                );
              })()}
            </span>
            {words !== 'icon' ? (
              <span className="bt-item-qty bt-nav-word" data-nav-word={d.id} aria-hidden="true" style={{
                right: 'auto', left: '50%', bottom: 2, transform: 'translateX(-50%)',
                height: Math.round(badgePx * 1.3), padding: '0 3px', fontSize: badgePx, maxWidth: 'calc(100% - 4px)', overflow: 'hidden', whiteSpace: 'nowrap',
                color: on ? NAV_YELLOW : '#F2F3EF', borderColor: on ? NAV_YELLOW : undefined,
                pointerEvents: 'none',
              }}>{d.label}</span>
            ) : null}
            {/* v2.3.1649 (owner: "on the active navigation button remove
                the tiny arrow chip but leave the active gold/yellow
                circle"): the chevron is gone.  It was a second active
                marker on a button that already states the same thing three
                ways — brass fill, brass border, aria-pressed — and a 8x5px
                triangle is precisely the size of detail the owner has been
                asking this band to stop relying on. */}
            {/* ═══ v2.3.3004: POINTS TO SPEND, THE CHARACTER TAB GLOWS ═══
                Owner: "when you level up make the character tab do a light
                flashing effect ... until all points are spent".  Same number
                as the badge below (BottomDashboard's dots.hero is
                unspentPointsTotal), so the two start and stop together.
                Before the badge in the DOM so the count stays on top of the
                light; the icon underneath takes a gentle gold wash with it.
                game.css .bt-pts-glow. */}
            {d.id === 'hero' && typeof count === 'number' && count > 0 ? (
              <span className="bt-pts-glow" data-pts-glow="nav" aria-hidden="true" />
            ) : null}
            {count ? (
              <span aria-hidden="true" style={{
                position: 'absolute', top: -3, right: -3,
                minWidth: 13, height: 13, padding: '0 3px',
                borderRadius: 7, background: COL.accent, color: COL.onAccent,
                fontSize: 11, fontWeight: 900, lineHeight: '13px', textAlign: 'center',
                fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
              }}>{count > 9 ? '9+' : count}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
