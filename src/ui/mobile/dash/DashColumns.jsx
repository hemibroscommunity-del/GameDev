import React from 'react';
import { COL } from './common.js';
import { getBagEntries } from './bagModel.js';
import { BagTile } from './InventoryPanel.jsx';
import { BagFilterChips } from './BagFilterChips.jsx';
import { bagFilterBus } from './bagFilterBus.js';
import { COMBAT_SKILLS, skillLevel, weaponSkillProgress } from '../sheet/heroModel.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { requestT2Category } from './T2Panel.jsx';
import { heroSectionBus } from '../sheet/heroSectionBus.js';
import { prog3Live, prog3HasSkills, prog3Pool, prog3SkillLevel, prog3CatFor } from '../../../data/prog3.js';
import { buildSkillUnspent, STAT_TO_WEAPON_CAT } from '../../../data/gameSystems.js';
import { registerXpCard, displayXp, xpCounting } from '../../xpLanding.js'; /* v2.3.1874 */
import { dashTileSize, dashPanelWidths, combatPillWidth, combatPillHeight, BAG_VIEW_COLS, DASH_GAP, DASH_ROWS, BAG_HEADER_H } from '../sheet/sheetGeometry.js';
import { playVw } from '../playViewport.js';

/* v2.3.1636 (owner, with a reference screenshot of the pre-v2.3.1287
   dashboard): the THREE-COLUMN ROW — BAG / LOADOUT / BUILD restored as
   persistent chrome, replacing the nine-cell quick bar in the same slot.

   "I wanted something like this but even spacing between the 3 columns
   and using the UI theme."  Those two corrections are the whole brief and
   both are load-bearing:
     - EVEN SPACING.  The original columns were content-sized, so BAG came
       out narrow and LOADOUT wide and the row read as three unrelated
       widgets.  repeat(3, 1fr) with one gap value; every column gets the
       same width at every viewport, and the tile size is derived from
       that third (dashTileSize) rather than each column picking its own.
     - THE UI THEME.  The reference is the old navy build with a red bag
       panel; this is Lantern Slate (docs/LANTERN-SLATE-SPEC.md) —
       raised cards on the band, one bgStrong header strip each, brass
       reserved for the ONE thing that is a call to action (unspent
       points).  No second accent colour anywhere in the row.

   THE LABELS ARE THE GAME'S OWN WORDS (owner: "the shortest most
   meaningful labels that a broad audience would understand").  The
   originals were BAG / LOADOUT / BUILD; two of those are genre jargon
   that a first-time player has no way to decode.  Rather than invent
   plainer ones, each column takes the name this game ALREADY uses for
   exactly that thing on a screen one tap away:
     BAG       the nav button directly below it says "Bag" and opens the
               panel this column taps into.  Naming the column
               "Inventory" would make the column and the button look like
               two different destinations.
     EQUIPPED  the Bag panel's own segmented tab (v2.3.1326, owner's
               naming) for the worn six.  Columns one and two are, quite
               literally, that panel's two tabs.
     COMBAT    NOT "Skills" — that word is spoken for by the nav button
               for LIFE skills (cooking/fishing/mining), and pointing two
               controls with one name at different panels is worse than
               any amount of jargon.  Not "Stats" either: these are
               levelled skills you spend points into, not passive
               readouts.
   Shortest that stay meaningful, and nothing here teaches a word that
   is used nowhere else.

   WHY IT REPLACES THE QUICK BAR RATHER THAN JOINING IT (owner's call,
   asked directly): the quick bar showed three bag entries, worn
   chest/legs/weapon and three skills — a strict subset of what these
   columns show, at nine cells the width of a fingertip.  Keeping both
   would have put the same data on screen twice and pushed the band past a
   third of the phone.  The identity row (v2.3.1635) stays: it carries
   name/level/XP/gold, which no column shows.

   EVERY TAP ROUTES THROUGH THE SAME BUS its full-size counterpart uses —
   the rule the quick bar set at v2.3.1560 and the reason this row cannot
   drift from the panels it summarises.  Nothing here can change game
   state on its own; it is read-only state plus a bus call. */

/* v2.3.1639 (owner: "get rid of the labels for bag, equipped, and combat
   and use the extra space to fit the 6 slots as evenly as you can").  The
   header strip is gone; each panel is now nothing but its six slots.

   The labels were doing real work at v2.3.1636 — they are how you learn
   which third is which — but they cost 17px of a ~85px panel to say
   something the CONTENTS say once you have looked twice: items, worn
   gear, skill icons.  With them gone the grid distributes over the whole
   panel instead of a strip beneath a caption. */
const Column = ({ children, onTap, label, stretch }) => (
  <div
    role={onTap ? 'button' : undefined}
    aria-label={label}
    onPointerUp={onTap ? (e) => { e.stopPropagation(); onTap(); } : undefined}
    style={{
      background: COL.raised,
      border: `1px solid ${COL.border}`,
      borderRadius: 9,
      display: 'flex', flexDirection: 'column',
      /* v2.3.1640: ONE gap value on every axis — the panel's own padding
         and the space between its two tile rows are the same DASH_GAP the
         frame and the tile rows use.  space-evenly is gone with it: the
         panel is now exactly as tall as its contents, so there is no
         surplus left to distribute and 'evenly' would only reintroduce
         the uneven edges this removes. */
      /* v2.3.1654: `stretch` opts the BAG panel out of centring — its
         scroller has to be told a height to scroll inside, and a centred
         flex child sizes to its content instead. */
      alignItems: 'center', justifyContent: stretch ? 'flex-start' : 'center',
      padding: DASH_GAP, gap: DASH_GAP,
      minWidth: 0, overflow: 'hidden',
      cursor: onTap ? 'pointer' : 'default',
    }}>{children}</div>
);

/* Both grid columns lay their tiles out three across, two down — the same
   rhythm, so the eye reads one row of six per column rather than three
   different grids. */
const tileRow = { display: 'flex', gap: DASH_GAP, justifyContent: 'center' };

export const DashColumns = ({ R }) => {
  const vw = playVw();   /* v2.3.1715: the shell, not the window */
  const t = dashTileSize(vw);
  const panelW = dashPanelWidths(vw);
  const rpg = R || {};
  const [bagFilter, setBagFilter] = React.useState(bagFilterBus.get());
  React.useEffect(() => bagFilterBus.subscribe(setBagFilter), []);
  /* ═══ v2.3.1874: RE-RENDER WHILE A NUMBER IS COUNTING ═══
     The count-up is computed in render (displayXp reads a clock), so without
     something to drive frames it would show one value and stop.  This ticks
     ONLY while xpLanding says a card is held or mid-count — a few hundred ms
     after a kill — and otherwise the dashboard renders exactly as often as it
     did before.  A permanent rAF here would be the whole dashboard
     re-rendering forever for an animation that runs for a fraction of a
     second, on the platform whose frame budget everything else in this file
     is tuned around. */
  const [, _xpTick] = React.useState(0);
  React.useEffect(() => {
    let raf = 0, alive = true;
    const step = () => {
      if (!alive) return;
      if (xpCounting()) { _xpTick((v) => (v + 1) % 1000000); }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);

  /* ── BAG ── */
  /* v2.3.1653: the dashboard's bag IS the bag now, so it obeys the filter
     its own header sets — a header that changed a different screen's list
     would be the worst of both. */
  const entries = getBagEntries(R).filter(e => bagFilter === 'all' || e.cat === bagFilter);
  /* v2.3.1654 (owner: "make the bag slots scrollable downward same as bag
     view was").  The dashboard's bag stops being a PREVIEW with a +N
     overflow chip and becomes the list itself: every entry renders, two
     rows are visible, and the rest is a scroll away behind the same bottom
     fade the open Bag view uses.

     THE +N CHIP IS GONE WITH THE TRUNCATION IT ANNOUNCED.  It existed to
     say "there are more items than fit"; when the answer to that is
     "scroll", a cell that spends a slot saying so is a slot not showing an
     item.  The peek row under the fade says the same thing and costs
     nothing.

     A FLOOR OF THREE ROWS, not two: with only two the grid exactly fills
     its scroller, nothing moves, and the fade sits over blank tray. */
  /* v2.3.1704 (owner: "you can add two more rows of inventory space (it's
     just scrollable so it shouldn't change the look)"): the floor goes from
     three rows to FIVE.

     THIS IS THE SURFACE THE OWNER IS LOOKING AT.  v2.3.1654 retired the Bag
     destination — "the resting dashboard IS the bag" — so nothing opens the
     expanded InventoryPanel any more and this grid is the bag a player
     actually sees.  Its twin floor in InventoryPanel.jsx moves by the same
     two rows in the same change, so the surfaces stay identical if that
     button ever comes back.

     THE PANEL'S FOOTPRINT IS UNCHANGED, which is the half of the request
     that matters: the scroller below is `flex: 1; minHeight: 0; overflowY:
     auto` inside a band sized by the sheet geometry, so more rows means more
     to scroll, not a taller band.  Measured before/after at 390x844: the
     dashboard band stays 390x243 and the scroller stays 142px tall; only the
     grid's own height grows (197 -> 331). */
  const bagRows = Math.max(DASH_ROWS + 3, Math.ceil(entries.length / BAG_VIEW_COLS));
  const bagCellCount = bagRows * BAG_VIEW_COLS;
  const gridW = BAG_VIEW_COLS * t + (BAG_VIEW_COLS - 1) * DASH_GAP;

  /* ── LOADOUT ── */
  /* v2.3.1653 (owner: "move the equipped view to be merged with the
     character overview so the equipped slots are grouped on the left and
     the player stats are shown on the right").  The EQUIPPED panel is gone
     from the band; its slots, its picker wiring and its stat cards now
     live in Hero > Overview (HeroExpanded), where there is width for the
     numbers that were never shown beside them here.

     THAT MOVE REVIVES DEAD CODE rather than writing new: getEquipContribs
     (v2.3.1328) built per-item contribution cards and an equipment TOTALS
     readout that have not rendered anywhere since the Bag's Equipped tab
     was retired at v2.3.1639.  They are what "the player stats ...
     contextually changes if you are selecting an equipped item" asks for,
     and they were already correct — only unreachable. */

  /* ── COMBAT ── */
  /* v2.3.1648 (owner: "the combat skills can be changed into just 3: bow,
     melee, and magic.  The hp, defense, and stamina/energy can just be
     reflected in total hp, energy points ... make the three combat skills a
     different shape that fits the space better, does not need to be
     square"):  THREE WIDE PILLS, one per row, replacing six 35px squares.

     WHY THE THREE THAT LEFT ARE NOT MISSED: Vitality, Defense and Stamina
     are the three whose whole output is a resource number, and those
     numbers already read live on the world HUD (the HP and energy bars) —
     which is the owner's own reasoning.  Melee / Bow / Magic are the three
     that answer a question no bar can: which weapon class am I actually
     built for.

     COMBAT_SKILLS ITSELF STILL HAS ALL SIX and must keep them — Hero's
     build cards and the T2 spend screens enumerate that array, and dropping
     entries there would make three skills unspendable.  This is a
     presentation slice (0..3), nothing more.

     THE PILL IS WHERE THE LEGIBILITY COMES FROM.  A square in a narrow
     column held a 28px icon and a 9px corner digit; the pill's 82px of
     width holds a 33px icon AND the level at 16px — bigger than anything
     else on the band, for the one number this panel exists to tell you.

     NO TEXT LABEL, tried and measured: "MELEE" at 10px beside a 26px icon
     needed ~87px and rendered ellipsised to "M…" — which is worse than no
     label at all, since Melee and Magic both truncate to the same letter.
     Widening the column enough to fit the words costs the bag squares 3px
     each, and the squares are what the owner's complaint is about.  The
     three glyphs (sword / bow / wand) are the same ones Hero's build cards
     label in full, one tap away, and both aria-label and title spell it
     out here for anyone who needs it read aloud. */
  /* Four digits do not fit a 40px bar, and a level-20 skill needs 4,800 XP.
     Thousands collapse to one decimal so the pair stays inside its bar for
     the whole level range rather than only the early one. */
  const xpShort = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k`
    : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  const pillW = combatPillWidth(vw);
  const pillH = combatPillHeight(vw);
  /* v2.3.1853: the pill now carries THREE things across, so the icon stops
     taking the pill's whole height.  MEASURED against the narrowest phone
     the layout supports: at 360 the pill is 80px wide and 68 of that is
     content once the padding is paid, which has to hold the icon, the bar
     and the level.  Everything below is sized from that budget and asserted
     by mp-bandsummary at 360 / 390 / 430. */
  /* MEASURED, in the harness, at the width that binds.  The first cut of
     this sized the three children by estimate and the bar came out 2px
     short of its own text at 390 — mp-bandsummary reports "needs 36, has
     34" rather than just "clipped", which is what turned four unknowns into
     one arithmetic problem.  Note the level can read "+2" (an unspent-point
     badge), not just a digit, so the budget is set against the WIDER of the
     two things that span can hold. */
  const tight = pillW < 88;
  /* ═══ v2.3.1858 ═══ HALF THE CARD, MEASURED.
     "Half" is of the card's own width — 47% of it, which is half less the
     gap and the padding it has to share with the column beside it.  At 390
     that is a 45px icon in a 94px card (was 17); at 360, 38 in 80.

     Everything else is sized against the NARROWER phone, because the right
     column is where the squeeze lands: 80 - 38 - gap - padding leaves ~28px
     to hold "LV 1", the XP pair and the bar.  mp-bandsummary reports each
     row's needed vs available width at both widths — four earlier passes
     over this card were sized by eye and every one came out over. */
  const iconPx = Math.round(pillW * (tight ? 0.40 : 0.45));
  /* ═══ v2.3.1859: BIGGER TYPE, TO THE CEILING THE COLUMN ALLOWS ═══
     Owner: "combat icons are perfect size just make the other font bigger."
     So the icon share above is frozen and only the type moves.

     LV and the badge had real room and take it: 11 -> 13.5 and 10 -> 12 at
     390.  THE XP PAIR DID NOT, and the number is worth recording rather than
     rediscovering: at 11px it needs 50px and its box is 41, so the ceiling
     is 41/50 x 11 = 9.0 — it goes 8.5 -> 8.8 and no further.  Its box is the
     right-hand column, and the column is what is left of a 94px card after a
     frozen 42px icon.  Growing it further needs width the card does not
     have: either the icon gives some back, or the COMBAT column takes it
     from the bag.  Both are the owner's call, so neither is made here. */
  const lvlFs = tight ? 12 : 13.5;
  const badgeFs = tight ? 10.5 : 12;
  /* v2.3.1862: the pair spans the card now, not the column — ~88px at 390
     instead of 41 — so this is sized against the CARD.  Measured, as ever:
     mp-bandsummary reports needed-vs-available for every text node.
     ═══ v2.3.1920: 12 -> 14 (10.5 -> 12 tight), and 800 -> 900 ═══
     Owner: "It looks like there's room to make the 3 combat skill xp numbers
     a little bigger and chunkier."  There is, and the reason is v2.3.1862:
     moving the pair out of the 41px right-hand column and across the whole
     card left it sized for the box it used to live in.
     Sized against the WIDEST pair the formatter can produce, not against the
     "0/280" a fresh character shows: xpShort caps each side at four
     characters ("9.9k"), so the worst case is ~9 glyphs — and at 14px/900
     with tabular figures that is ~72px against the card's ~88 at 390 and
     ~74 at 360.  mp-bandsummary now drives those numbers rather than
     trusting the arithmetic. */
  const chipFs = tight ? 12 : 14;
  const barH = tight ? 5 : 6;
  const combatPill = (s) => {
    /* ═══ v2.3.1668: these pills were the last live route into the
       retired tier-2 screen ═══
       They were entirely prog3-blind: the level came from the frozen
       legacy T1 stats (R.power/agility/mind), the badge from the frozen
       legacy per-weapon pools, and the tap pushed T2Panel — which still
       SPENDS from those pools and persists the result client-side.  So
       under prog3 a player could tap Melee and pour points into a
       system nothing reads.
       Now: real trained level, the real shared pool, and a tap that
       opens Hero's Build section with this combat type selected. */
    const p3 = prog3Live(rpg);
    const cat = STAT_TO_WEAPON_CAT[s.key];
    const p3cat = cat ? prog3CatFor(cat) : null;
    /* ═══ v2.3.1922: THE LEVEL READS THE BLOB, NOT THE CAP ═══
       Owner, on a returning character: "the combat stats appear as 0 (this
       is an old character reload that I haven't seen in a while)" — three
       cards reading LV 0 while the Build panel beside them said Lv 3.

       The two halves of this card disagreed about what to trust.  The XP
       below is keyed on `p3cat` alone and so came from the prog3 blob (a
       real 68/455); the LEVEL was keyed on `p3` — prog3Live, which is cap
       AND blob — and with the cap not yet in fell back to skillLevel()
       reading the legacy `weaponSkills` corpse, which prog3 characters
       carry zeroed.  Hence a real XP bar under a level of nothing.  Note
       prog3SkillLevel floors at 1, so a rendered 0 could ONLY have come
       from the legacy branch.

       The cap is genuinely absent for a moment on every load: `_enabled`
       is a module variable set from state_sync, and flipping it does not
       re-render anything, so whatever painted first keeps its answer.
       prog3HasSkills asks the only question a READOUT has — is the level
       in the blob — and has no timing hole.  Same correction as v2.3.1902
       made to the stat screen; this card was missed then. */
    const p3Read = prog3HasSkills(rpg);
    const lvl = (p3Read && p3cat) ? prog3SkillLevel(rpg, p3cat) : skillLevel(rpg, s.key);
    /* ═══ v2.3.1687: THE +1 BELONGS TO THE SKILL THAT EARNED IT ═══
       Owner: "When I level up it shows melee, bow, and magic as +1
       simultaneously. This is not correct. Only the combat skill that
       leveled up should show."
       This used to read the shared pool on all three pills, and the note
       that stood here defended it — "every pill shows the same number,
       which is honest" — but honest about the wrong thing. Three chips
       lighting up for one level-up says three skills levelled; the player
       reads a call-to-action per skill, not a shared balance. `_p3PoolFrom`
       is stamped from the worker's prog3_level event (wsClient), so the
       badge sits on the skill that actually levelled.
       The pool itself is still SHARED — that is the prog3 design, and
       restricting where the points may be spent would be a progression
       redesign, not a display fix. Raised with the owner separately.
       Fallback: with no stamp (an older save, or points from some other
       source) show it on all three rather than hide unspent points
       entirely — a missed badge costs the player their level-up. */
    /* v2.3.1853: this skill's own progress toward its next level.  null at
       the level cap, where "how far to the next level" has no answer and the
       pill shows the icon and the level alone. */
    const xp = p3cat ? weaponSkillProgress(rpg, p3cat) : null;
    const p3Pool = p3 ? prog3Pool(rpg) : 0;
    const p3From = rpg && rpg._p3PoolFrom;
    const unspent = p3
      ? ((!p3From || p3From === p3cat) ? p3Pool : 0)
      : buildSkillUnspent(rpg, s.key);
    return (
      <div key={s.key}
        role="button"
        /* v2.3.1856: the level-up flash is back on the CARD.  It is a
           box-shadow glow and the card paints a border again, so the glow
           has an edge to sit on — which it did not in v2.3.1854/1855, where
           the row drew nothing and the halo floated around empty space. */
        className={unspent > 0 ? 'bt-build-flash' : undefined}
        onPointerUp={(e) => {
          e.stopPropagation();
          dashboardPanelBus.open('hero');
          if (p3) {
            heroSectionBus.request('Build', p3cat);
          } else if (cat) {
            requestT2Category(cat); dashboardPanelBus.push('t2');
          }
        }}
        /* v2.3.1874: the card publishes its own rect each render, so an XP
           label can fly to where the card ACTUALLY is.  A ref callback rather
           than a measured constant: the dashboard's card geometry changes
           with viewport width (dashPanelWidths) and with the sheet's state,
           and a hard-coded point would be right on one phone and wrong on the
           next.  Cheap — getBoundingClientRect on three small elements, on a
           component that only re-renders when the dashboard does. */
        ref={p3cat ? ((el) => { if (el) registerXpCard(p3cat, el.getBoundingClientRect()); }) : undefined}
        aria-label={`${s.label} level ${lvl}`}
        title={`${s.label} — Lv ${lvl}${unspent > 0 ? `, ${unspent} unspent` : ''}`}
        style={{
          /* ═══ v2.3.1858: THE ICON TAKES HALF THE CARD ═══
             Owner: "the 3 combat icons need to take up half of the pill
             space.  You can shrink down the xp bar to make room for that."

             So the card turns on its side: the icon claims the left half at
             the card's full height, and everything that was stacked down the
             middle — level, XP pair, bar — stacks in the right half instead.
             The bar pays for it, exactly as offered: it was the card's full
             width at v2.3.1856 and is now half of it.

             That is the whole reason this reads as a bigger picture rather
             than a bigger box.  An icon grown in place, inside the old top
             row, could only reach ~26px before it pushed "LV 1" off the
             line; given its own column it is 45px at 390 — more than double,
             on a card that did not change size.

             (v2.3.1856's note, still true: the skill NAME stays off the
             card.  "MELEE" at a readable size needs ~40px, and there is now
             half a card to hold three readouts.  The icon is the name; the
             aria-label spells it out.) */
          width: pillW, height: pillH, flex: 'none', boxSizing: 'border-box',
          position: 'relative',
          display: 'flex', flexDirection: 'row', alignItems: 'center',
          gap: 3, padding: '3px 3px',
          background: COL.wellSoft,
          border: `1px solid ${unspent > 0 ? COL.accent : COL.tileBor}`,
          borderRadius: 8,
          cursor: 'pointer', touchAction: 'manipulation',
        }}>
        {/* LEFT — the half the owner asked for. */}
        <img src={s.iconSrc} alt="" draggable={false}
          style={{
            width: iconPx, height: iconPx,
            flex: 'none', objectFit: 'contain', pointerEvents: 'none',
          }} />
        {/* RIGHT — the three readouts, stacked in what is left. */}
        <div style={{
          flex: '1 1 auto', minWidth: 0,
          /* v2.3.1862: the pair left this column for the card's bottom edge,
             so what remains sits clear of it. */
          display: 'flex', flexDirection: 'column', gap: 3,
          paddingBottom: chipFs + 2,
        }}>
          <span aria-hidden="true" style={{
            fontSize: lvlFs, fontWeight: 900, lineHeight: 1,
            color: unspent > 0 ? COL.accent : COL.text,
            fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
          }}>LV {lvl}</span>
          {/* The bar, now the right column's width rather than the card's
              — the room the icon was given came from here.  Still a plain
              track carrying no text, so the fill stays solid and readable
              instead of washing out under digits. */}
          {xp && (
            <div aria-hidden="true" style={{
              height: barH, borderRadius: barH / 2, overflow: 'hidden',
              background: COL.wellDeep,
              border: '1px solid rgba(255,255,255,.06)',
            }}>
              <div style={{
                width: `${Math.min(100, (xp.prog / xp.thresh) * 100)}%`,
                height: '100%', background: '#8AA9F9',
              }} />
            </div>
          )}
        </div>
        {/* The unspent-points badge, back in the card's corner.  It rode the
            old top row on a `marginLeft: auto`, and that row is gone — the
            right column has three readouts in ~28px at 360 and no width to
            lend a fourth.  The corner costs none: it is the one place on a
            card this full that was still empty.
            v2.3.1853's rule holds — it must not REPLACE the level, which is
            what it did before the owner asked for the level to be shown. */}
        {/* ═══ v2.3.1862: THE XP PAIR TAKES THE WHOLE CARD ═══
            Owner: "try to make the xp text just wider."

            It could not get wider where it was.  Boxed in the right-hand
            column it had 41px, and at 8.8px the text needed all 41 — the
            measured ceiling was 9.0 (v2.3.1859), which is not a change
            anyone would notice.  Every pixel of that column is spoken for by
            an icon the owner has called the right size, so the width had to
            come from somewhere else.

            The card's own width was free.  The pair sits ACROSS THE BOTTOM
            now — absolutely positioned, so it costs the icon no height
            either — which takes it from 41px to the full ~88 and the type
            from 8.8 to 12.  Same card, same icon, half again the size.

            It overlaps the icon's bottom edge, and that is the trade: these
            three sprites (sword, bow, staff) are drawn on the diagonal with
            an empty lower-left, and the shadow below keeps the digits
            legible over whatever art does fall behind them.  mp-bandsummary
            asserts the numbers still fit at 360 as well as 390. */}
        {xp && (
          <div aria-hidden="true" style={{
            /* v2.3.1863 (owner: "shift it all the way to the right so the
               second number is almost touching the gold border").  Right-
               aligned rather than centred, and hard against the rim: the
               denominator is the fixed half of the pair, so anchoring THAT
               edge keeps the numbers still while the numerator grows — a
               centred pair slides left every time the first number gains a
               digit.  3px of inset, which is the card's own padding. */
            position: 'absolute', left: 3, right: 3, bottom: 1,
            textAlign: 'right',
            fontSize: chipFs, fontWeight: 900, lineHeight: 1,  /* v2.3.1920: chunkier */
            color: COL.text, fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
            textShadow: '0 1px 3px rgba(9,14,17,.92), 0 0 2px rgba(9,14,17,.9)',
            whiteSpace: 'nowrap', overflow: 'hidden',
            pointerEvents: 'none',
          }}
          /* v2.3.1874: names the XP pair so it can be read on its own.  The
             card's textContent runs "LV 1" straight into "0/280", and a regex
             over the whole card splices those into "10/280" — which is how
             mp-xpfly first read a fresh character's 0 XP as 10. */
          data-xppair={p3cat || undefined}
          >{xpShort(displayXp(p3cat, xp.prog))}<span style={{ opacity: .62 }}>/{xpShort(xp.thresh)}</span></div>
        )}
        {unspent > 0 && (
          <span aria-hidden="true" style={{
            /* ═══ v2.3.1859: THE BADGE MOVES OFF THE TEXT COLUMN ═══
               It sat in the card's top-RIGHT corner, which is the same
               corner "LV n" starts from — fine while the level was 11px and
               a collision the moment it grew to 13.5: the card rendered
               "LV ǂ2", the badge sitting on top of the digit.

               Overlap is not clipping, so the width checks had nothing to
               say about it (mp-bandsummary now asserts the two boxes do not
               intersect).  There is no size that fixes it either: "LV 1" at
               13.5px needs ~28px and the badge ~18, in a 41px column.

               So it moves to the top-LEFT, over the icon's own corner —
               a call-to-action pip on the skill's picture, which is where
               these read naturally anyway, and the one part of the card
               with no text to fight. */
            position: 'absolute', top: 1, left: 3,
            fontSize: badgeFs, fontWeight: 900, lineHeight: 1,
            color: COL.accent, fontVariantNumeric: 'tabular-nums',
            textShadow: '0 1px 2px rgba(9,14,17,.85)',
            pointerEvents: 'none',
          }}>+{unspent}</span>
        )}
      </div>
    );
  };

  return (
    <div className="bt-dashcols" style={{
      display: 'grid',
      /* v2.3.1636's "three equal thirds" is now WIDE / WIDE / NARROW — see
         dashPanelWidths.  Equal thirds capped the bag square at 35px, and
         the owner's legibility complaint outranks the visual rule the
         equality was there to serve.  The two panels that hold squares are
         still exactly equal to each other; only COMBAT, whose contents are
         a different shape on purpose, is narrower. */
      gridTemplateColumns: `${panelW.wide}px ${panelW.narrow}px`,
      justifyContent: 'center',
      gap: DASH_GAP,
      height: '100%', boxSizing: 'border-box',
      padding: DASH_GAP,
      /* The bottom rule is the ONLY chrome — the row must read as part of
         the band, not as three floating widgets over the world. */
      borderBottom: `1px solid ${COL.divider}`,
    }}>
      {/* v2.3.1653: the BAG panel is the dashboard's main event now —
          BAG_VIEW_COLS across with its own filter header, which is the
          "make the dashboard view the main bag view" ask plus "the
          dashboard view's bag slots also get the filters as the headers"
          in one panel.  The header is sized from the same COLS/TILE the
          rows use, so each chip lands one slot wide. */}
      <Column label="Bag" stretch>
        <BagFilterChips width={gridW} height={BAG_HEADER_H} />
        {/* The scroller.  It is the ONLY thing on this row that scrolls —
            the world behind never does (the v2.3.1285 rule), and the panel
            itself stays exactly as tall as the band. */}
        <div style={{
          width: gridW, flex: 1, minHeight: 0,
          overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch',
          WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 9px), transparent)',
          maskImage: 'linear-gradient(180deg, #000 calc(100% - 9px), transparent)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${BAG_VIEW_COLS}, ${t}px)`,
            gridAutoRows: `${t}px`,
            gap: DASH_GAP,
          }}>
            {Array.from({ length: bagCellCount }, (_, i) => (
              entries[i]
                ? <BagTile key={`bag-${i}`} entry={entries[i]} style={{ aspectRatio: 'auto', height: '100%' }} />
                : <div key={`bag-${i}`} aria-hidden="true" style={{
                    background: COL.well, border: `1px solid ${COL.tileBor}`, borderRadius: 6,
                  }} />
            ))}
          </div>
        </div>
      </Column>

      {/* v2.3.1648: three pills stacked over the same inner height the
          bag's rows occupy, so both panels end on one baseline even though
          neither holds the same number of things.
          v2.3.1653 (owner: "the combat stats stay on the right in their own
          column"): unchanged, and now the only company the bag has. */}
      <Column label="Combat">
        {COMBAT_SKILLS.slice(0, 3).map(combatPill)}
      </Column>
    </div>
  );
};
