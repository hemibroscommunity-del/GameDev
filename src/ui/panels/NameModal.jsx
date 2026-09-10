import React from 'react';
import { PlayerPaint, WornPreview, PatternSwatch } from './PlayerPaint.jsx';   /* v2.3.1938; v2.3.1940 pants + tattoos; v2.3.2414 WornPreview + PatternSwatch for the inline tools */
/* v2.3.2414: the ink card reads the drawing stores directly.  It shows what
   you ALREADY wear, so it has to repaint when the editor closes having changed
   it -- `onArtChange`/`onPatternChange` are the stores' own subscriptions
   (playerArt.js:287, patternCatalog.js:206) and returning their unsubscribers
   is the whole of the wiring.  `artHasInk` answers the other question the card
   asks: is this a blank body, which is the state the empty-state hint is for. */
import { artHasInk, getArt, onArtChange, ART_PALETTE } from '@/rendering/traits/playerArt.js';
import { BRUSH_SIZES } from '@/rendering/traits/artTools.js';   /* v2.3.2415: the inline width row offers the editor's own three */
import { getPattern, onPatternChange, patternsFor, formatPattern, parsePattern, setPattern } from '@/rendering/traits/patternCatalog.js';
/* v2.3.2414: the inline tool row and the editor share one ink/brush store, so
   a colour picked under the character is the colour the editor opens with. */
import { getInk, getBrush, setInk, setBrush, onToolsChange } from './paintTools.js';
/* v2.3.1947: the designer shows the character wearing what you are making, and
   it has to be the SAME character the stage behind it is showing -- so it gets
   the look from the one function that builds it, not a second copy. */
import { portraitLook, categoryCrops } from '@/game/characterCreatorEffects.js';
import { BUILD_INFO } from '../BuildBadge.jsx';
import { joinBlockReason } from '@/data/joinGate.js';   /* v2.3.2388 */
/* v2.3.1143: account login -- "Already have a character?" entry point
   for a player on a NEW device, who lands on this splash with a fresh
   silent identity and needs a way in with their saved Login Key before
   pressing PLAY (which would start binding progress to the fresh one). */
import { PANTS_CATALOG, SHOES_CATALOG, SKIN_CATALOG, setPants, setShoes, setSkin } from '@/rendering/playerSkins.js';
import { FACIALHAIR_CATALOG, setFacialHair } from '@/rendering/traits/facialHairCatalog.js';
import { EYEWEAR_CATALOG, setEyewear, eyewearHasOptions } from '@/rendering/traits/eyewearCatalog.js';   /* v2.3.2361 */
import { FACIALHAIR_COLOR_CATALOG, setFacialHairColor } from '@/rendering/traits/facialHairColorCatalog.js';
import { HAIR_CATALOG, setHair } from '@/rendering/traits/hairCatalog.js';
import { HAIR_COLOR_CATALOG, setHairColor } from '@/rendering/traits/hairColorCatalog.js';
import { HAT_COLOR_CATALOG, hatColorsFor, setHatColor } from '@/rendering/traits/hatColorCatalog.js';
import { EYE_COLOR_CATALOG, setEyeColor } from '@/rendering/traits/eyeColorCatalog.js'; /* v2.3.1928 */
import { HEADWEAR_CATALOG, headwearIsSolid, setHeadwear } from '@/rendering/traits/headwearCatalog.js';
import { SHIRT_CATALOG, setShirt } from '@/rendering/traits/shirtCatalog.js';
import { SHIRT_COLOR_CATALOG, setShirtColor } from '@/rendering/traits/shirtColorCatalog.js';
import { recolorEnabled, SOLID_ONLY_HAT_COLOR } from '@/rendering/traits/recolorOptions.js';
import { HEIGHT_CATALOG } from '@/rendering/traits/buildCatalog.js';   /* v2.3.1953; v2.3.1996: frame picker removed; v2.3.2268: the tab went with the height axis, so `setBuildHeight` has no caller left here -- HEIGHT_CATALOG stays because the unreached _buildTile branch below still names it, and that branch is the restoration path */

/* === NameModal — the character-creator / name-entry splash screen === */
/* v2.3.888: extracted verbatim from the `if (showNameModal) { ... }`
   early-return render path in BroTown.jsx. Render-only — no effects or
   game-loop logic moved. Trait catalogs and their sprite setters are
   imported from @/rendering/*; BUILD_INFO from BuildBadge. Props carry
   the React selection state, its setters, the preview refs, and the
   BroTown handler closures (joinTown, randomizeWithFlair,
   rollRandomName, rotatePreview, _swatchTile, _thumbTile, _dragRotX). */
/* v2.3.1232/1235: Lantern Slate passes — standard recessed name well,
   plain sheet card, one gold primary, world-circle rotate buttons. */
/* v2.3.1251: approved creator-mockup redesign (owner handoff doc).
   The seven flat category tabs become FIVE primary groups — Hair
   (Hair/Hats), Face (Skin/Beard), Top (Shirt), Bottom (Pants), Feet
   (Shoes) — with compact secondary tabs only where a group has two
   underlying types.  One unified sheet now holds title, name input
   (dice icon replaces the "Roll" text button), tabs, a five-tiles-at-
   rest option strip, the color swatches DIRECTLY below the options
   (the v2.3.1015 one-step-at-a-time swap + ‹ Change back button and
   the v2.3.1036 ‹ 1/2 › pager are retired), and a quiet Randomize.
   PLAY becomes the dominant gold ENTER BRO TOWN.  All seven types,
   every catalog entry, and every handler survive — this is a
   presentation reshuffle only; selection state still lives in BroTown
   (activeCat now always holds a TYPE key; the group is derived). */
/* v2.3.1252: owner feedback round — first group renamed Hair → Head;
   the subtabs and colors rows are ALWAYS reserved (invisible ghosts
   when unused) so the sheet height is constant and the flex stage
   never resizes the character between categories; the color row's
   'default' tile shows the catalog swatch, not the item icon again. */
/* v2.3.1253: owner reported a residual subtle grow/shrink when the
   color row toggled.  The strip/color rows now have EXPLICIT viewport-
   derived heights in game.css (no aspect-ratio, no content-derived
   sizing), so no sheet content can move the stage at all.  The
   'default' color also loses its swatch entirely: unpicked = default,
   and re-tapping the picked swatch unselects back to default. */
/* v2.3.1254: owner round 3 — beveled buttons (dice/Randomize share the
   .bt-cc-btn micro-bevel, rotate circles get inset shadows, ENTER gets
   the historical chunky border-bottom bevel, selected subtab raised)
   and a scroll affordance: each strip sits in .bt-cc-scroll with a
   sheet-colored fade + › chevron that shows while more items wait
   off-screen (scrollMore state, measured on scroll/content change). */
/* v2.3.1256: owner round 4 — FOUR primary categories: Head (subtype
   buttons Hair/Hats/Skin/Beard), Shirt, Pants, Shoes.  The subtabs row
   stays permanently reserved (real for Head, ghost elsewhere), so the
   constant-size guarantee from v2.3.1252/1253 is untouched. */
/* v2.3.1257: owner round 5 — the whole sheet shrinks ~30% in each
   dimension's internals (≈ half the on-screen area at full width;
   agreed floors: 10px text, ~35px taps, 16px input font for the iOS
   zoom gate).  Tiles go 5-at-rest → 7, swatches 6 → 8; the flex stage
   absorbs the freed height, so the character grows substantially. */
/* v2.3.1276: owner round 7 — GROUND-UP RETHINK (owner picked the
   slide-up drawer from three offered models).  The always-visible
   sheet is retired: at REST the screen is a hero (huge character,
   name well, Customize + Random actions, gold ENTER); the pickers
   (tabs / subtype chips / tiles / colors) live in a fixed slide-up
   DRAWER over the bottom half, opened by Customize and closed by
   Done or a scrim tap.  The drawer is an absolute overlay, so the
   character's size/position is structurally untouchable by anything
   in it.  All state, handlers, catalogs and the join flow are
   byte-identical — presentation only. */
/* v2.3.1272: owner round 6 — "best logical use of space with adequate
   touch targets".  The v2.3.1257 shrink squeezed CONTROLS; this pass
   removes low-value ROWS instead and spends the savings on target
   size: the sheet title is dropped (v2.3.1034 precedent — the screen
   is self-explanatory), the — COLOR — header is dropped (the swatch
   row reads as colors on its own), and Randomize moves into the tab
   row as a fifth beveled die cell.  Every control returns to ≥32px
   with the primary ones at 44px+; the sheet ends up SHORTER than
   v2.3.1257 anyway (three rows removed vs one control-height added). */
/* ═══ v2.3.2414: TWO CONSTANT TABLES, AT MODULE SCOPE ═══
   Both were written inside the component and BOTH had to come out, for the
   same reason the look is memoised a few hundred lines down: NameModal is an
   unmemoised function component that re-renders on every keystroke in the name
   field, so an object literal in its body is a NEW object every render.
   _CARD_FOCUS is the one with teeth -- it is handed to WornPreview as `focus`,
   which is in that component's `blit` dependency list, so a fresh identity
   re-composited the whole character through drawCharacterPortrait on every
   render while the Shoes tab was open.  _INK_SOURCES has no such consumer
   today and is hoisted beside it anyway, so that adding one later cannot
   quietly reintroduce the same bug.
   Neither closes over anything, which is what makes this a pure move. */
/* ═══ v2.3.2414: WHICH DRAWINGS EACH CARD IS SHOWING YOU ═══
   The card's empty state (see .bt-cc-ink below) turns on "do you already
   wear anything here", and that is a question about the STORES, not about
   this tab: one target can span several canvases.  A tattoo spans five
   (playerArt.js:165 CANVASES; PlayerPaint's TATTOO_SPOT/TAB_SPOTS tables
   reach all of them), a shirt two, pants one, and shoes none at all --
   shoes are pattern-only (v2.3.1944), which is why `pattern` is a separate
   column rather than a flag.
   Kept HERE beside _PAINT_FROM_TAB rather than exported from PlayerPaint:
   it is the same four keys read one row further along, and a reader who has
   understood the row above has understood this one. */
var _INK_SOURCES = {
  shirt: { canvases: ['shirtFront', 'shirtBack'], pattern: 'shirt' },
  pants: { canvases: ['pants'], pattern: 'pants' },
  tattoo: { canvases: ['tattoo', 'tattooBack', 'tattooFace', 'tattooArm', 'tattooHeadBack'], pattern: null },
  shoes: { canvases: [], pattern: 'shoes' },
};

/* ═══ v2.3.2414: THE CARD IS NOT THE EDITOR'S PREVIEW PANE'S SIZE ═══
   Every window in PlayerPaint's FOCUS table was measured against
   .bt-paint-pv, which is square and about 126px wide at 390 (it is
   `--paint-size * .62` and moves with the viewport, so that is one screen's
   number, not the class's).  The card is 170.4 x 214 at 390x844
   -- roughly twice the area -- and three of the four targets survive that
   unchanged, because they frame a chunk of body: chest-and-head for a tattoo,
   hips-and-thighs for pants, chest for a shirt.
   SHOES do not.  A boot is about eight pixels of art, so the editor's window
   (cy .865, h .27) is already a tight crop at 125px; at card size it became a
   2.5x blow-up of two grey blocks with no character attached to them, which
   is a picture of nothing.  So the card takes a wider window for that one
   target: knee-to-sole, with the legs in it, so the thing on screen is
   recognisably a pair of boots on a person.
   A window rather than a zoom multiplier because focusFor applies the
   feet-anchored build correction to whatever it is given, and a zoom applied
   after that correction would point at a tall bro's shins. */
var _CARD_FOCUS = { shoes: { cy: 0.82, h: 0.38 } };

export function NameModal(props) {
  var onBack = props.onBack,          /* v2.3.2219 */
    _dragRotX = props._dragRotX,
    _swatchTile = props._swatchTile,
    _thumbTile = props._thumbTile,
    _buildTile = props._buildTile,           /* v2.3.1953 */
    heightSel = props.heightSel,
    setHeightSel = props.setHeightSel,
    frameSel = props.frameSel,          /* v2.3.1996: read-only now — locked to medium, no picker */
    activeCat = props.activeCat,
    beardColorSel = props.beardColorSel,
    facialHairSel = props.facialHairSel,
    hairColorSel = props.hairColorSel,
    hairSel = props.hairSel,
    hatColorSel = props.hatColorSel,
    eyeColorSel = props.eyeColorSel,
    setEyeColorSel = props.setEyeColorSel,
    headwearSel = props.headwearSel,
    eyewearSel = props.eyewearSel,          /* v2.3.2361 */
    joinTown = props.joinTown,
    nameInput = props.nameInput,
    pantsSel = props.pantsSel,
    previewCanvasRef = props.previewCanvasRef,
    previewDir = props.previewDir,
    randomizeWithFlair = props.randomizeWithFlair,
    resetLook = props.resetLook,          /* v2.3.2036 */
    rollRandomName = props.rollRandomName,
    rotatePreview = props.rotatePreview,
    setActiveCat = props.setActiveCat,
    setBeardColorSel = props.setBeardColorSel,
    setFacialHairSel = props.setFacialHairSel,
    setHairColorSel = props.setHairColorSel,
    setHairSel = props.setHairSel,
    setHatColorSel = props.setHatColorSel,
    setHeadwearSel = props.setHeadwearSel,
    setEyewearSel = props.setEyewearSel,   /* v2.3.2361 */
    setNameInput = props.setNameInput,
    setPantsSel = props.setPantsSel,
    setShirtColorSel = props.setShirtColorSel,
    setShirtSel = props.setShirtSel,
    setShoesSel = props.setShoesSel,
    setSkinSel = props.setSkinSel,
    shirtColorSel = props.shirtColorSel,
    shirtSel = props.shirtSel,
    shoesSel = props.shoesSel,
    skinSel = props.skinSel;
  var LONG_HAIR_COLORS = ['black'];
  /* The long-hair sprite is ~88% pure black — light colors over-process
     into a black band (see characterPortrait recolor note), so that one
     style is dark-only.  Mirrors the clamp effect in BroTown.jsx. */
  var _hairColCat = hairSel === 'long' ? HAIR_COLOR_CATALOG.filter(function (c) { return LONG_HAIR_COLORS.indexOf(c.id) >= 0; }) : HAIR_COLOR_CATALOG;
  /* v2.3.1251: per-TYPE defs — catalog, tile kind, current pick + setter,
     and the color step (null for the body categories whose swatch row IS
     the picker: their catalog 'default' entries carry the sprite's native
     colors).  Same setter pairs (sprite store + React mirror) as ever. */
  var _typeDefs = {
    hair: { label: 'Hair', kind: 'thumb', spriteCat: 'hair', catalog: HAIR_CATALOG, sel: hairSel,
      set: function (id) { setHair(id); setHairSel(id); },
      colors: recolorEnabled('hair') ? _hairColCat : null, colorSel: hairColorSel, setColor: function (id) { setHairColor(id); setHairColorSel(id); } },
    /* v2.3.1493: the color row only appears for hats flagged `solid`.  It used
       to appear for all of them, which is what the owner hit -- recoloring a
       multi-tone hat flattens its accents, and recoloring one of the generated
       hats repaints the head still baked into its frame, so the hidden head
       became a solid-colored second head.  Four hats are solid and keep it. */
    hat: { label: 'Hats', kind: 'thumb', spriteCat: 'headwear', catalog: HEADWEAR_CATALOG, sel: headwearSel,
      set: function (id) { setHeadwear(id); setHeadwearSel(id); },
      /* v2.3.1927: hatColorsFor drops the colours this particular hat does not
         offer -- the crown's yellow, which is the colour it already is. */
      colors: (recolorEnabled('hat') && (!SOLID_ONLY_HAT_COLOR || headwearIsSolid(headwearSel))) ? hatColorsFor(headwearSel) : null,
      colorSel: hatColorSel, setColor: function (id) { setHatColor(id); setHatColorSel(id); } },
    /* v2.3.2361: eyewear.  A thumb category like Hats with no colour row --
       a pair of glasses is the colour it was drawn.  Deleted a few lines
       down while the catalog holds nothing but 'none', so it costs nothing
       on screen until the first pair is imported. */
    eyewear: { label: 'Eyewear', kind: 'thumb', spriteCat: 'eyewear', catalog: EYEWEAR_CATALOG, sel: eyewearSel,
      set: function (id) { setEyewear(id); setEyewearSel(id); }, colors: null },
    /* v2.3.1928: eye colour.  A swatch-only category like Skin Tone -- there is
       no sprite to pick, only a colour, and the iris it paints is found from a
       reviewed mask rather than searched for at runtime.
       v2.3.1929: SHIPPED UNREACHABLE, and this is the shape mistake that did it.
       It was built as a COLORS row hanging off an empty catalog -- the shape a
       trait with a sprite uses, where you pick a hairstyle and then a colour for
       it.  A swatch-only category has no sprite step: its picker IS the item
       strip, which is how Skin Tone, Pants and Shoes are built.  With
       `catalog: null` the strip below had nothing to map, so the tab could not
       have rendered even if one existed -- and none did, because the entry was
       never added to _TABS either.  Two halves of one wrong shape, and because
       the second half hid the first, nothing threw and it looked shipped.
       Now the same shape as skin: catalog + sel + set, no colors row. */
    eyes: { label: 'Eyes', kind: 'swatch', spriteCat: null, catalog: EYE_COLOR_CATALOG, sel: eyeColorSel,
      set: function (id) { setEyeColor(id); setEyeColorSel(id); }, colors: null },
    /* v2.3.1308 (round-7): 'Skin' → 'Skin Tone' — it recolors the whole
       body, and the plain label read as head-only inside the Head group. */
    skin: { label: 'Skin Tone', kind: 'swatch', spriteCat: null, catalog: SKIN_CATALOG, sel: skinSel,
      set: function (id) { setSkin(id); setSkinSel(id); }, colors: null },
    beard: { label: 'Beard', kind: 'thumb', spriteCat: 'facialhair', catalog: FACIALHAIR_CATALOG, sel: facialHairSel,
      set: function (id) { setFacialHair(id); setFacialHairSel(id); },
      colors: recolorEnabled('beard') ? FACIALHAIR_COLOR_CATALOG : null, colorSel: beardColorSel, setColor: function (id) { setFacialHairColor(id); setBeardColorSel(id); } },
    shirt: { label: 'Shirts', kind: 'thumb', spriteCat: 'shirt', catalog: SHIRT_CATALOG, sel: shirtSel,
      set: function (id) { setShirt(id); setShirtSel(id); },
      colors: recolorEnabled('shirt') ? SHIRT_COLOR_CATALOG : null, colorSel: shirtColorSel, setColor: function (id) { setShirtColor(id); setShirtColorSel(id); } },
    pants: { label: 'Pants', kind: 'swatch', spriteCat: null, catalog: PANTS_CATALOG, sel: pantsSel,
      set: function (id) { setPants(id); setPantsSel(id); }, colors: null },
    shoes: { label: 'Shoes', kind: 'swatch', spriteCat: null, catalog: SHOES_CATALOG, sel: shoesSel,
      set: function (id) { setShoes(id); setShoesSel(id); }, colors: null },
    /* ═══ v2.3.2268: THE BUILD TAB IS GONE ═══
       Owner: "I changed my mind on the build sizes during the create a
       character.  It looks bad.  Use the medium (default) character only.
       Remove it as an option in the trait picker and remove the tall and short
       build from the game."

       v2.3.1996 locked the FRAME axis to medium and left the tab standing on
       its height row; with HEIGHT_CATALOG now locked to average as well
       (buildCatalog, v2.3.2268) the tab's only control would be one
       already-selected option, which is worse than no tab.

       THE TAB LIST NEEDS NO EDIT: it ends in
       `.filter(function (x) { return !!_typeDefs[x.t]; })`, so a type with no
       definition here drops out of the strip on its own.  That filter was put
       there for exactly this and is why removing the entry is the whole change.
       The grid goes 9 tabs -> 8, so the clean 3x3 the v2.3.1953 note mentions
       becomes 3+3+2; the tabs keep their width and their touch target, which is
       what that note was actually protecting.
       `kind: 'build'` and its _buildTile renderer are LEFT IN PLACE, unreached:
       they are what a future height axis would switch back on, and deleting
       them would make restoring the feature a rebuild rather than two lines. */
  };
  /* v2.3.1251: primary groups reuse the existing painted category art
     in /ui/welcome/cat/ — no emoji, no new assets.  A group with one
     type shows no secondary tabs.
     v2.3.1256: FOUR primary groups (owner) — the old Head (hair/hats)
     and Face (skin/beard) merge into one HEAD group whose subtype row
     carries all four buttons; the garment groups drop the body-part
     names for the garment itself: Shirt / Pants / Shoes. */
  /* v2.3.1494: Skin Tone, Pants and Shoes are recolor-only categories -- their
     swatch row IS the picker, there is no separate garment to pick -- so a
     disabled recolor leaves nothing for the tab to do and it is dropped rather
     than shown empty.  Restoring them is the same one-line flip in
     recolorOptions.js that restores the recolor itself. */
  /* v2.3.1494: drop disabled recolor-only types from the defs -- activeCat is
     remembered across sessions, so a stale 'skin' would otherwise select a tab
     that is no longer offered. */
  ['skin', 'pants', 'shoes', 'eyes'].forEach(function (t) {
    if (!recolorEnabled(t)) delete _typeDefs[t];
  });
  /* v2.3.2361: no Eyewear tab until there is eyewear to pick.  A tab whose
     only option is the one already selected is worse than no tab (the
     v2.3.2268 reasoning that removed Build), so the def goes the same way the
     disabled recolor types do: _TABS ends in `.filter(!!_typeDefs[x.t])`, and
     a remembered activeCat of 'eyewear' falls back to 'hair' through
     _activeType below.  Importing the first pair is what brings the tab in --
     eyewearHasOptions reads the catalog, so no second switch to remember. */
  if (!eyewearHasOptions()) delete _typeDefs.eyewear;
  /* v2.3.1525: the tabs are FLAT (owner). Head was a container for four
     subtypes and nothing else -- one tap to open it, a second to pick what you
     actually wanted -- so it is gone and Hair, Hats, Skin and Beard are tabs in
     their own right alongside Shirt, Pants and Shoes. The subtype row, the
     group<->type mapping and the most-recently-used-subtype memory all go with
     it; activeCat was always a TYPE key, so nothing downstream changes.

     Icons: Shirt/Pants/Shoes/Skin keep their painted art (the bald head reads
     as skin tone better than it ever read as "Head"). Hair, Hats and Beard have
     no painted icon and are not worth inventing one for -- they show the first
     real entry from their own catalog, which is both self-explanatory and
     stays correct if the catalogs change. */
  /* v2.3.1940: which customiser tabs offer a drawing, and what the button says.
     'skin' maps to the TATTOO drawing -- the tab is where you pick your skin
     tone, so it is where "something drawn on your skin" belongs. */
  var _PAINT_FROM_TAB = {
    /* v2.3.1941: "Design" rather than "Draw" for the two garments -- the panel
       behind this button now offers ready-made patterns as well as freehand
       drawing, and most people will want the patterns. */
    /* ═══ v2.3.2414: `noun` IS WHAT THE CARD SHOWS; `label` IS WHAT IT SAYS ═══
       These sentences were written for a lone button with a whole row to
       itself.  In the card's footer -- 109px of usable width -- they wrap to
       three lines and eat the picture: measured at 390x664 on Pants, a 54px
       footer over an 89px sliver of thigh.
       So the footer reads `(inked ? 'Edit ' : 'Add ') + noun`, one line, and
       the sentence becomes the button's aria-label, where length costs nothing.
       Nothing is lost by that trade because the PICTURE now carries what the
       sentence was carrying: v2.3.1949 spelled the tattoo one out as "a face
       tattoo nobody knows exists is a face tattoo nobody draws", and the card
       faces the character south on the FOCUS.tattoo window, which puts the face
       in shot.  Do not restore the sentences to the footer without also
       explaining what shows the face instead.
       The verb doubles as the empty state in words, beside the + on the
       picture -- the same idea arriving on two channels. */
    shirt: { target: 'shirt', label: 'Pattern or draw on this shirt' },
    pants: { target: 'pants', label: 'Pattern or draw on these pants' },
    /* v2.3.1949: one button, three canvases -- the panel's mode strip picks
       chest, face or arms.  The label says so, because a face tattoo nobody
       knows exists is a face tattoo nobody draws. */
    /* v2.3.2008: `icon` is the owner's painted art for the two tabs whose
       drawing is not a pencil stroke -- a tattoo gun for skin, a patterned
       sneaker for shoes.  shirt and pants keep the inline pencil: a print on a
       garment IS drawing, and the pencil says that better than a second shirt
       icon would beside a tab already showing shirts. */
    skin: { target: 'tattoo', label: 'Tattoo your body or face', icon: 'cc-draw-tattoo' },   /* v2.3.1978: two screens, not three */
    /* v2.3.1944: shoes are pattern-only — no drawing on an eight-pixel boot,
       which is also why the noun is 'pattern' and never 'design': "draw" would
       be a lie on this tab. */
    shoes: { target: 'shoes', label: 'Pattern these shoes', icon: 'cc-draw-shoes' },
  };
  /* v2.3.2415: the pattern currently on a slot, parsed.  patternCatalog
     stores "<id>:<colourIndex>" as one string and the shoes tool row needs
     both halves -- which tile is lit, and what colour to draw the others in. */
  var _patNow = function (slot) {
    return parsePattern(getPattern(slot), slot) || { id: '', colorIdx: 1 };
  };
  var _wearsInk = function (target) {
    var src = _INK_SOURCES[target];
    if (!src) return false;
    if (src.pattern && getPattern(src.pattern)) return true;
    return src.canvases.some(function (id) { return artHasInk(getArt(id)); });
  };
  var _TAB_ICON = function (n) { return '/ui/welcome/cc/cc-tab-' + n + '.png?v=' + BUILD_INFO.version; };
  var _TABS = [
    { t: 'hair', label: 'Hair', img: _TAB_ICON('hair') },
    { t: 'hat', label: 'Hats', img: _TAB_ICON('hat') },
    { t: 'skin', label: 'Skin', img: _TAB_ICON('skin') },
    /* v2.3.1929: Eyes sits with the face traits, and lands the row at a clean
       four-and-four in the 4-column grid rather than the old 4+3. */
    { t: 'eyes', label: 'Eyes', img: _TAB_ICON('eyes') },
    /* v2.3.2361: eyewear, beside Eyes.  Nine tabs is the clean 3x3 again.
       v2.3.2389: the owner drew the icon ("Use this for the eyewear thumbnail
       for the trait picker category"), so the placeholder inline glyph this
       tab shipped with is gone and it wears painted art like the other eight.
       Section 7 of docs/specs/eyewear.md, which held the recipe for making
       one, is closed by this. */
    { t: 'eyewear', label: 'Eyewear', img: _TAB_ICON('eyewear') },
    { t: 'beard', label: 'Beard', img: _TAB_ICON('beard') },
    { t: 'shirt', label: 'Shirt', img: _TAB_ICON('shirt') },
    { t: 'pants', label: 'Pants', img: _TAB_ICON('pants') },
    { t: 'shoes', label: 'Shoes', img: _TAB_ICON('shoes') },
    /* v2.3.1953: the ninth tab.  No painted icon — there is no art for
       "build" and inventing a ninth sheet entry for two numbers is not worth
       it, so it draws its own two-figure glyph inline (same reasoning as the
       designer's pencil, v2.3.1946).  Nine tabs also lands the grid on a clean
       3x3 rather than the 4+4+1 an eighth-plus-one would have made; the tabs
       get WIDER in three columns, which is a better touch target than they had
       (see .bt-cc-tabs in game.css). */
    { t: 'build', label: 'Build', img: null, glyph: 'build' }
  ].filter(function (x) { return !!_typeDefs[x.t]; });
  var _activeType = _typeDefs[activeCat] ? activeCat : 'hair';
  var _def = _typeDefs[_activeType];
  var _onPick = function (id) { _def.set(id); };
  /* ═══ v2.3.1953: BOTH BUILD ROWS LIVE IN THE OPTIONS GRID ═══
     The first cut put heights in the strip and frames in the colour row.  It
     worked and it read badly: the colour row is pinned near the BOTTOM of the
     pane (that is what makes every tab the same height, v2.3.1252), so the two
     halves of one control sat 700px apart with nothing between them, and the
     frame tiles came out swatch-sized because .bt-cc-colors-row forces
     --cc-swatch on its children.
     Six tiles in one grid instead: the strip is a 3-wide wrapping grid at this
     column width, so heights land on the first row and frames on the second,
     adjacent, same size, and reading top to bottom as one control.  The
     captions say which is which — no header row needed, and none available
     without breaking the constant-height rule. */
  var _items = (_def.kind === 'build')
    /* v2.3.1996: one row of three heights.  Was six tiles wrapping onto two
       rows; the second row was the frame axis, now locked to medium. */
    ? HEIGHT_CATALOG.map(function (o) { return _buildTile(o, heightSel, _def.set, 'height'); })
    : _def.catalog.map(function (o) {
      return _def.kind === 'thumb'
        ? _thumbTile(_def.spriteCat, o, _def.sel, _onPick, 44)
        : _swatchTile(o, _def.sel, _onPick, 40);
    });
  /* Colors sit DIRECTLY below the options (handoff) and go blank when
     the type has none or the pick is 'none'.  v2.3.1253: the 'default'
     entry gets NO tile at all (owner) — no color selected IS the
     default; tapping the selected swatch again unselects it, which
     sets the store back to 'default' (the sprite's native color). */
  /* ═══ v2.3.2007: THE DEFAULT COLOUR IS BACK IN THE ROW ═══
     Owner: "I don't see a way to get a hat color back to its default color.
     Add that to color picker."

     There has always BEEN a way -- v2.3.1253 removed the tile on the reasoning
     that "unpicked = default, and re-tapping the picked swatch unselects back
     to default".  The gesture works.  Nothing on the screen says it exists,
     which is the same thing as it not existing: the owner went looking for the
     control and could not find it, and he wrote this picker's requirements.

     `_swatchTile` has rendered this entry properly since v2.3.711 -- for a
     trait colour it draws the ITEM'S OWN thumbnail in its original colours
     ("this is what you get") rather than a swatch, and titles it "Original
     color".  So this is one filter coming off, not a control being built.

     The row's height is fixed in game.css (v2.3.1253's constant-height rule),
     and it already scrolls horizontally, so one more tile cannot move the
     stage -- which was the whole reason the tile was dropped. */
  /* v2.3.2414: is the ink card live on this tab?  Computed HERE, above the
     render, because two places need the same answer: the card itself, and the
     colour block, which gives its reserved height to the card on a tab that
     has no colours to put in it (see .bt-cc-colors--yield below). */
  var _cardDef = _PAINT_FROM_TAB[_activeType] || null;
  /* v2.3.2416: EVERY paint tab has a card now.  Owner: "Add shirt editor under
     shirt."  Until now the Shirt tab withheld it while no shirt was worn --
     v2.3.1938's rule that "a print with nothing to print on is a dead button"
     -- and since a fresh character wears none, the tab that most obviously
     ought to have an editor was the one tab with nothing under it at all.
     The rule was right about the symptom and wrong about the fix: what made it
     a dead control was that the drawing had nowhere visible to land, not that
     the player had not chosen yet.  WornPreview puts the catalogue's first
     shirt on when none is worn (see its shirt branch), so the design always has
     a garment, and the drawing is kept whichever shirt is picked later. */
  var _cardLive = !!_cardDef;
  var _colorList = _def.colors || null;
  /* v2.3.1953: on the Build tab this row is the FRAME, not a colour, and two
     of the rules above do not apply to it.  There is no 'default' entry to
     drop (medium is a real option you can pick, not the absence of one), and
     tap-the-pick-again-to-unset would set the store to 'default', which is not
     a frame id — the figure would keep its width and the tile would lose its
     ring, which reads as a broken button.  So the build row is always the full
     catalog and always a plain set. */
  var _colors = (_def.kind === 'build')
    /* Both build rows are up in the grid (see _items).  The block still
       renders — ghosted — because every tab must reserve the same height. */
    ? null
    : (_colorList && _colorList.length > 0 && _def.sel !== 'none')
    /* v2.3.2035: the 'default' entry is FILTERED OUT of the swatch row -- the
       text button above is what picks it now.
       This is the owner's actual complaint, not tidiness.  Every catalog's
       default entry carries a HARD-CODED swatch that has nothing to do with
       the item you picked: shirt is #3a5bd0 (blue), hat is #7c6cff (purple),
       hair and beard #5a3a22 (brown).  So the Shirt tab drew a solid blue
       square labelled Default over a shirt that is not blue -- "a random
       color like blue even if it doesn't match default item color".
       _swatchTile CAN draw the item's own thumbnail for the default tile
       instead (its thumbCat/thumbItem branch, "this is what you get"), but
       this call site never passed them, so it always fell through to the
       flat swatch.  Wiring those args would fix the lie for trait colours and
       leave it for the body ones, and would still spend a swatch-sized tile
       saying "no colour".  A word says it for every category at once. */
    ? _colorList.filter(function (o) { return o && o.id !== 'default'; })
      .map(function (o) {
        return _swatchTile(o, _def.colorSel, function (id) {
          _def.setColor(id === _def.colorSel ? 'default' : id);
        });
      })
    : null;
  /* Reset both strips to their start whenever the type changes — the
     content width changes with the catalog. */
  /* v2.3.1938: the shirt designer opens as a modal OVER the creator rather than
     as a row inside the drawer -- a 16x16 grid needs thumb-sized cells, and the
     drawer's height is fixed by the constant-size guarantee (v2.3.1252). */
  /* v2.3.1940: which designer is open ('shirt' | 'pants' | 'tattoo'), or null. */
  var _paintState = React.useState(null), showPaint = _paintState[0], setShowPaint = _paintState[1];
  /* ═══ v2.3.2414: THE CARD HAS TO HEAR THE EDITOR IT OPENED ═══
     The card draws the player's CURRENT drawings, which it gets for free --
     drawCharacterPortrait falls back to the live store for any drawing the
     caller omits (characterPortrait.js:574-580) and the card omits all of
     them.  What it does NOT get for free is a repaint: the store write happens
     inside PlayerPaint, React has no reason to re-render this component for
     it, and the card would go on showing the chest you had before you opened
     the editor.  So: one revision counter, bumped by the stores' own
     subscriptions, threaded into the look below so the preview's effect sees a
     new dependency and recomposites.
     It is a COUNTER rather than the drawings themselves on purpose -- a
     tattoo is five 256-char strings and a shirt two more, and none of them is
     read here; the only question is "did any of them move". */
  var _inkState = React.useState(0), inkRev = _inkState[0], setInkRev = _inkState[1];
  React.useEffect(function () {
    var bump = function () { setInkRev(function (n) { return n + 1; }); };
    var offArt = onArtChange(bump);
    var offPat = onPatternChange(bump);
    /* v2.3.2414: and the TOOL store, so the inline row shows the colour and
       width the editor is actually armed with -- change them in there, close
       it, and the row under the character agrees. */
    var offTools = onToolsChange(bump);
    return function () { offArt(); offPat(); offTools(); };
  }, []);
  /* v2.3.2414: ONE look object for the card and the editor, memoised.
     It was built inline at the PlayerPaint call site, which handed a fresh
     object identity to WornPreview on every render of this component -- fine
     for a modal that opens over a frozen screen, wrong for a card that lives
     on it: WornPreview's effect lists `look` in its deps (PlayerPaint.jsx),
     so an unstable identity would re-composite the whole character on every
     scroll-affordance measurement.  Memoising on the SELECTIONS makes the
     preview repaint when the player changes something and not otherwise.
     `inkRev` is in the dep list, not in the object: it is not part of the
     look, it is the reason to look again. */
  var _paintLook = React.useMemo(function () {
    return portraitLook({
      skinSel: skinSel, pantsSel: pantsSel, shoesSel: shoesSel,
      hairSel: hairSel, hairColorSel: hairColorSel,
      facialHairSel: facialHairSel, beardColorSel: beardColorSel,
      headwearSel: headwearSel, hatColorSel: hatColorSel, eyeColor: eyeColorSel,
      eyewearSel: eyewearSel,   /* v2.3.2361 */
      shirtSel: shirtSel, shirtColorSel: shirtColorSel,
      buildHeight: heightSel, buildFrame: frameSel   /* v2.3.1953 */
    });
  }, [skinSel, pantsSel, shoesSel, hairSel, hairColorSel, facialHairSel, beardColorSel,
    headwearSel, hatColorSel, eyeColorSel, eyewearSel, shirtSel, shirtColorSel,
    heightSel, frameSel, inkRev]);
  var _stripRef = React.useRef(null);
  var _colorRowRef = React.useRef(null);
  /* v2.3.1254: scroll affordance — per-strip "more content waiting"
     flags drive the fade+chevron overlays (.bt-cc-more).
     Measured on scroll and whenever the strip contents change; the
     setter bails when nothing changed so scrolling doesn't re-render
     every frame.

     ═══ v2.3.2205: IT WAS MEASURING THE AXIS THE STRIP NO LONGER SCROLLS ═══
     Owner, on the Hats tab: "additional hat options don't surface the
     shadowed effect to cue additional options anymore."

     Correct, and it has been that way since v2.3.1524 — not something this
     round broke. v2.3.1254 built this for a HORIZONTAL row of five tiles,
     so it asks `scrollWidth - clientWidth - scrollLeft`. The two-column
     rewrite turned both strips into vertical grids with `overflow-x:hidden`,
     which pins scrollWidth to clientWidth: the expression is 0 forever, the
     flag never goes true, and the overlay never fades in. The overlay
     element, its state and its wiring all survived the rewrite intact —
     only the axis was left pointing the old way, which is exactly why this
     was invisible for so long. Nothing looked missing in the code.

     So the same three reads, on the axis that actually moves. Note the
     scroll RESET below had the identical bug in the identical place:
     `scrollLeft = 0` on a category change is a no-op on an overflow-x:hidden
     box, so switching from Hats back to Hair left you wherever you had
     scrolled to. Both are fixed here because both are the same mistake, and
     splitting them would leave half of it. */
  var _moreS = React.useState({ items: false, colors: false }), scrollMore = _moreS[0], setScrollMore = _moreS[1];
  var _measureMore = function () {
    var i = _stripRef.current, c = _colorRowRef.current;
    /* The 2px slack absorbs sub-pixel layout: a grid whose rows sum to a
       fraction over its box would otherwise cue "more" with nothing there. */
    var next = {
      items: !!(i && i.scrollHeight - i.clientHeight - i.scrollTop > 2),
      colors: !!(c && c.scrollHeight - c.clientHeight - c.scrollTop > 2)
    };
    setScrollMore(function (p) { return (p.items === next.items && p.colors === next.colors) ? p : next; });
  };
  React.useEffect(function () {
    if (_stripRef.current) _stripRef.current.scrollTop = 0;
    if (_colorRowRef.current) _colorRowRef.current.scrollTop = 0;
    _measureMore();
  }, [activeCat]);
  /* v2.3.2205: vertical overflow depends on the strip's HEIGHT, which the
     category change can't tell us about — rotating the phone or the software
     keyboard opening resizes the pane under a catalogue that never changed.
     The category effects cover content changes; this covers box changes. The
     observer watches the scrollers themselves and is created once: React
     keeps the same two DOM nodes across category switches, so re-observing
     per render would be churn for no signal. */
  var _measureRef = React.useRef(null);
  _measureRef.current = _measureMore;
  React.useEffect(function () {
    if (typeof ResizeObserver === 'undefined') return undefined;
    var ro = new ResizeObserver(function () { if (_measureRef.current) _measureRef.current(); });
    if (_stripRef.current) ro.observe(_stripRef.current);
    if (_colorRowRef.current) ro.observe(_colorRowRef.current);
    return function () { ro.disconnect(); };
  }, []);
  /* Re-measure without a scroll reset when the pick changes — the color
     row appears/disappears with it and the user may be mid-browse. */
  React.useEffect(function () { _measureMore(); }, [_def.sel]);
  /* v2.3.1143: Login Key overlay toggle (self-contained -- no BroTown prop). */
  /* v2.3.1524: the Customize DRAWER is retired. The pickers are the point of
     this screen (owner), so they now own a permanent right-hand column instead
     of hiding behind a button; there is no open/closed state left to hold. */
  /* v2.3.1307 (ChatGPT round-7): preview zoom — tapping the character
     toggles full-body <-> close-up (swipes still rotate at either zoom;
     a tap is a pointer journey under 8px with no rotation fired). */
  /* v2.3.1951: lifted to BroTown — it now also drives the preview camera, and
     that wiring lives up there beside activeCat. */
  var previewZoom = props.previewZoom, setPreviewZoom = props.setPreviewZoom;
  /* v2.3.2393: the spin cue's resting opacity, named because two places care
     -- the style below, and tools/qa/mp/mp-ccspin.mjs, which pins it. */
  var SPIN_CUE_OPACITY = 0.5;
  var _dragMoved = React.useRef(false);
  /* v2.3.2391: has this player turned the bro yet?  State, not a ref, because
     the spin cue below has to REPAINT when it flips -- a ref would flip
     silently and the cue would sit there after the thing it teaches has been
     learned.  One-way: it never comes back within a session. */
  var _spunS = React.useState(false), _hasSpun = _spunS[0], _setHasSpun = _spunS[1];
  /* v2.3.1308: category-aware framing — while the drawer is open the
     preview frames the region being edited (round-7 §preview).  Tap
     zoom overrides to close-up; everything transitions in ~180ms.
     Frames solve b + k·h = contact/center lines against the v2.3.799
     geometry (boots ≈11% up the bitmap, head ≈78%). */
  /* v2.3.1309 (owner): no frame may CROP the sprite against thin air —
     the stage no longer clips (overflow visible).  Drawer frames MEASURE
     where the drawer's resting top edge is (offsetTop ignores the slide
     transform) and drop the canvas so its bottom sits ~24px BEHIND the
     sheet — the legs visibly continue under a real surface instead of
     ending at an invisible line (or floating, the first fix's bug).
     On the hero screen (no drawer to hide behind) the tap-zoom uses a
     full-body frame that stays entirely inside the stage. */
  var _stageRef = React.useRef(null);
  /* v2.3.1524: only two frames survive the two-column rebuild. The old
     category-aware frames existed to slide the legs behind a drawer that
     covered the character; the pickers now sit BESIDE it in their own column
     and never overlap it, so there is nothing to hide behind and nothing to
     measure. Rest, and the tap zoom. */
  /* v2.3.2021: the short frame is for a CROPPED camera, and only 'eyes' crops
     now.  Keyed on previewZoom alone, picking any other tab would shrink the
     character in a shorter box rather than zoom to anything — see
     categoryCrops(). */
  /* ═══ v2.3.2151: HE WAS STANDING IN FRONT OF THE PEDESTAL, NOT ON IT ═══
     Owner: "move the character to the center of the pedestal on the character
     creation screen."

     HORIZONTALLY he was already centred -- canvas and pedestal group are both
     `left:50%; translateX(-50%)` on the same stage, and measured ink agrees to
     within 2.5px (mp-ccstand). The miss was VERTICAL, and it was big: his
     boots landed at page y 510-529 on a 390x844 phone while the pedestal's
     whole image ends at 513. He was planted on the rock in FRONT of the disc.

     WHY THE ALGEBRA DRIFTED. Every frame here solves `contact = b + k*h`
     against the v2.3.799 geometry, and `k` -- how far up its own bitmap the
     boots sit -- was fixed at 0.11 when the preview bitmap was 256x256 with
     the figure inset. The bitmap is 631x631 now and drawCharacterPortrait
     fills it: measured boots sit at y 608-623 of 631, so k is 0.011, an order
     of magnitude smaller. With `b:2%` that put contact at ~3% of stage instead
     of the 24.2% the pedestal art is drawn for, which is exactly the ~78px
     drop measured. Nothing "moved" -- the constant stopped describing the
     picture, and the frame quietly followed it down.

     So `b` is re-solved from the same target: 24.2% of stage for the contact
     line, minus 0.011*92 for the bitmap footing, is 23.2% -- rounded to 24.7%
     because the per-angle translateY nudge below drops the box by up to 8px
     and the mean of the three measured facings is what should sit on the
     disc, not the highest of them. mp-ccstand asserts the boots land inside
     the top face for every facing, so the day the bitmap changes again this
     fails instead of sliding. */
  /* ═══ v2.3.2201: HE HAD GROWN INTO THE LOGO ═══
     Owner, with a screenshot of the trait picker: "the character is up
     against the logo. What's the best way to handle this? Shrink character,
     move him down, remove floating effect, etc."

     MEASURED, at 390x844 with the tallest hair and the tallest hat: the head
     ink topped out 9px under the sword's tip. Nine pixels is the gap the
     owner is looking at, and on a slightly taller phone it closes.

     WHY IT COLLIDES WITH THE SWORD RATHER THAN THE WORDMARK, and why nothing
     caught it: .bt-cc-logo-sword hangs BELOW the logo image (top:19% of a
     115%-tall sprite, so its tip reaches ~134% of the wordmark's height), and
     mp-ccstand's only headroom assertion was `ink.pageTop >= stage.top` --
     the STAGE, which the logo was later moved on top of (v2.3.1527). The
     guard was true and the picture was still wrong.

     WHY SHRINKING, and not the owner's other two options:
       - "move him down" undoes v2.3.2151. His boots were planted on the
         pedestal's top face two rounds ago at the owner's own request; the
         only way down is back onto the rock in front of it.
       - "remove floating effect" -- there is no float. Nothing bobs here.
         What reads as one is the v2.3.1300 contact shadow, a 52%-black
         ellipse the owner asked to be made STRONGER twice (v2.3.1300b/c).
     Shrinking is the one lever that buys headroom without spending either.

     92 -> 84 (a ~9% trim) puts 35px under the sword's tip in that same
     worst case. The contact line is `b + k*h` with k = 0.011 (v2.3.2151), so
     holding it fixed only moves `b` by 0.09% -- his boots land 2px lower and
     0.355 down the disc, still deep inside the 0.12-0.72 top face
     mp-ccstand pins. Measured, not predicted: 88 gives 22px, 84 gives 35,
     80 gives 48, and the feet never move more than 3px across all of them. */
  /* ═══ v2.3.2203: AND DOWN A BIT, BECAUSE TALL IS A THING ═══
     Owner, with a screenshot of a TALL bro whose hair still reached the
     wordmark: "Can you just move the char down a lil."

     v2.3.2201 shrank him and I checked the worst case by walking all 9 hairs
     and all 40 hats -- and never touched BUILD, which is a third multiplier
     sitting right there in the same picker (heightMul, via focusForCat).
     Measured: Tall costs 30px of headroom on its own, taking the tallest
     hair-and-hat combination from 51px under the sword to 21. Same gap I had
     just called comfortable, on a build I never rendered.

     v2.3.2204 (owner, still with a tall afro on the sword: "Shrink the
     character a bit (maybe 10%) and move him down some pixels"): 84 -> 76,
     the owner's 10%, and b 20 -> 18.

     THE DROP IS THE HALF THAT HAS A CEILING. Shrinking barely moves his
     feet (k = 0.011), but every point off `b` walks his boots toward the
     front lip of the disc -- b:17 put the DEFAULT build at 0.70 of the
     pedestal, two points from standing in front of it again, and
     mp-ccstand caught it. So the shrink does the work and the drop is the
     small part, which is also why the two worst cases differ: a TALL bro
     gets a zoomed-out camera and his feet ride HIGHER in frame, so
     `default` is the worst case for the disc while `tall` is the worst
     case for the logo. Both are measured.

     AND IT WAS NEVER A DEVICE-WIDTH PROBLEM, which is what I assumed when
     his own screenshot disagreed with my measurement. Swept at dpr 3 across
     390x844, 402x874 and 430x932: the gap GROWS with width (37 / 47 / 64 on
     the previous numbers), because the logo is capped at 168px while the
     stage scales with the column. 390 is the worst case, so measuring there
     is measuring the floor -- not a lucky viewport.

     The earlier step: `b` dropped 24.8 -> 20, which lowered him ~16px and
     took that worst case to 37. His boots land 0.488 down the pedestal's top face --
     nearer its middle than the 0.347 they sat at, and still inside the
     0.12-0.72 band mp-ccstand pins, so v2.3.2151's "on the disc, not in
     front of it" is untouched. Measured across the range: 22 gives 31px,
     20 gives 37, 18 gives 44, and the disc fraction climbs 0.43 / 0.49 /
     0.55 in step. */
  var _frame = (previewZoom || !categoryCrops(_activeType))
    ? { h: 76, b: '18%' } : { h: 54.5, b: '18.2%' };
  /* v2.3.1307: name validity gates ENTER (round-7).  Local rules only:
     names are not unique server-side, so there is no availability
     check to run — trimmed length is the honest contract. */
  var _trimmedName = (nameInput || '').trim();
  var _nameValid = _trimmedName.length >= 2;
  /* ═══ v2.3.2388: THE BUTTON SAYS WHY IT WILL NOT GO ═══
     Owner: "if someone tries to press the shared 'join brotown button' make it
     give the reason it can't join (need name first) etc."
     `_blockReason` is null when the player may enter; the string otherwise.
     It comes from data/joinGate.js so the button explains the SAME rule
     joinTown enforces -- including the pinch-zoom one, which used to reach the
     player only as a window.alert() and only after the name was already valid.
     `_pressMsg` holds it once they have actually pressed, so the screen stays
     quiet until they ask. */
  var _blockReason = joinBlockReason(nameInput);
  var _pressS = React.useState(''), _pressMsg = _pressS[0], _setPressMsg = _pressS[1];
  /* Clear the moment the reason stops being true -- a stale "name your bro
     first" sitting under a filled field is worse than nothing. */
  React.useEffect(function () {
    if (!_blockReason && _pressMsg) _setPressMsg('');
  }, [_blockReason, _pressMsg]);
  var _nameFieldRef = React.useRef(null);
  /* v2.3.1307: iOS keyboard — reserve its height at the bottom of the
     box (visualViewport), so the name field + validation and the
     controls stay visible while typing.

     ═══ v2.3.2391: TWO BUGS IN THAT RESERVATION, AND THE REASON IT NEVER WORKED ═══
     Owner: "Can you make it so the name input doesn't shift the screen down to
     the keyboard when you put the cursor there (this is an IOS issue)."

     This effect was ALREADY here and already meant to prevent exactly that.
     Measured against the built client, it moved the name field 18px at
     390x745 — the commonest real Safari viewport — leaving its bottom edge
     below the keyboard line, so Safari panned the page anyway and the owner
     saw the shove. Three separate faults:

     1. `- (vv.offsetTop || 0)` made it fight itself.  offsetTop is how far
        Safari has ALREADY panned; subtracting it means the more the screen
        shifts, the LESS padding this asks for.  A negative feedback loop
        against its own purpose.  The keyboard's height is innerHeight minus
        visualViewport.height, full stop.
     2. It listened to `resize` only.  The pan is delivered as a visualViewport
        `scroll` event, so once Safari panned, the correction never re-ran.
        BroTown.jsx's own resizer (v2.3.1533) takes both events; this is that
        omission fixed, and the two screens now agree.
     3. Even corrected, the padding could not REACH the field: .bt-cc-stage is
        flex:1 with min-height:110px and .bt-cc-namewrap has margin-top:auto,
        so the column bottomed out at a hard floor of 428px however much
        padding it was given.  The stage now yields while the keyboard is up
        (see .bt-name-box[data-kb] in game.css) — the bro gives up the room,
        which is the right thing to give up while you are typing your name.

     NOT DONE, and deliberately: setting the modal's height to
     visualViewport.height.  It looks like the obvious fix and it re-flows the
     column beautifully, but .bt-name-modal is overflow:hidden, and an
     overflow:hidden box whose content no longer fits becomes a real scroll
     container.  Shrinking it to 400px makes the modal scrollable by 228px, and
     a plain focus() on a below-the-fold control then scrolls the entire
     creator off the top — logo at -218px — with no way back, because the same
     rule sets touch-action:none and overscroll-behavior:none.  That is a
     WORSE version of the reported bug, reachable from the home-screen install
     where iOS really does resize the layout viewport.  The overflow:clip and
     the scrollTop guard below exist to make that unreachable at all. */
  var _kbS = React.useState(0), kbPad = _kbS[0], setKbPad = _kbS[1];
  React.useEffect(function () {
    var vv = window.visualViewport;
    if (!vv) return undefined;
    var onR = function () {
      var kb = Math.max(0, window.innerHeight - vv.height);
      setKbPad(kb > 100 ? kb : 0);
    };
    onR();
    vv.addEventListener('resize', onR);
    vv.addEventListener('scroll', onR);
    return function () {
      vv.removeEventListener('resize', onR);
      vv.removeEventListener('scroll', onR);
    };
  }, []);
  /* v2.3.2391: the belt to overflow:clip's braces.  `overflow:clip` makes the
     modal un-scrollable outright, but it is Safari 16+, and this game's floor
     is iOS 14 (see the WebP note in BroTown.jsx).  On 14 and 15 the rule falls
     back to overflow:hidden, which IS programmatically scrollable, so a focus()
     can still shove the screen off the top there.  Putting it straight back is
     one line and costs nothing on the browsers that never scroll at all. */
  var _modalRef = React.useRef(null);
  React.useEffect(function () {
    var el = _modalRef.current;
    if (!el) return undefined;
    var onScroll = function () {
      if (el.scrollTop) el.scrollTop = 0;
      if (el.scrollLeft) el.scrollLeft = 0;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return function () { el.removeEventListener('scroll', onScroll); };
  }, []);
  /* v2.3.1576: the v2.3.1235 inline-SVG die is retired — its last caller
     (the name-reroll button) now renders the owner's painted
     cc-random-name.webp, matching cc-random-look.webp on the Randomize
     button below it. */
  return /*#__PURE__*/React.createElement("div", {
    className: "bt-name-modal",
    ref: _modalRef   /* v2.3.2391: the keyboard-height effect writes to this */
  }, /*#__PURE__*/React.createElement("video", {
    /* v2.3.824: animated splash backdrop — the owner's painted vista as a
       seamless 4.5s crossfade loop (built from the 6s source so its end
       frame matches its start, no visible cut).  bg.webp stays the
       poster + the modal's CSS fallback, so a blocked-autoplay or
       decode-failure path still shows the painted still.  Muted +
       playsInline + loop is the iOS inline-autoplay contract.
       NOTE (CLAUDE.md / v2.3.736): iOS Safari's video compositor once
       cyan-tinted a behind-character clip — that was a must-be-black
       starfield; a full-colour vista tolerates a slight shift, but this
       is the surface to eyeball on iPhone. */
    className: "bt-cc-bgvideo",
    src: '/ui/welcome/bg-loop.mp4',
    poster: '/ui/welcome/bg.webp',
    autoPlay: true, muted: true, playsInline: true, loop: true, preload: 'auto',
    "aria-hidden": true
  }), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1524: the creator is one SHELL now — a title band across the top,
       then two columns under it: the character (and everything that commits
       you: name, ENTER, login key) on the left, the pickers on the right.
       Owner's reasoning, and it is right: the character picker IS the purpose
       of this screen, so it gets the room instead of a button that hides it. */
    className: "bt-cc-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-cc-cols"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-name-box bt-cc-box bt-cc-col-left",
    /* v2.3.1307: keyboard reservation — the column gives up its bottom to the
       iOS keyboard so the name field + hint stay visible.
       v2.3.2391: and says so in an attribute, so the stage can shrink with it
       — reserving the room is useless if nothing above it will yield. */
    "data-kb": kbPad ? '1' : undefined,
    style: kbPad ? { paddingBottom: kbPad } : undefined
  }, /*#__PURE__*/React.createElement("div", {
    /* v2.3.1527: the logo sits over the CHARACTER column now (owner) rather
       than spanning the whole screen — it belongs with the bro, and the space
       it was taking across the top is space the picker can have. */
    className: "bt-cc-title"
  }, /*#__PURE__*/React.createElement("div", {
    /* v2.3.801: painted gold BRO TOWN lettering.  v2.3.806: gem sword
       flanks the lettering.  v2.3.1251: ~22% smaller (handoff) — size
       lives in .bt-cc-logo; the sword tracks it via wrap-relative %. */
    className: "bt-cc-logo-wrap"
  }, /*#__PURE__*/React.createElement("img", {
    src: '/ui/welcome/sword.webp', alt: '', className: "bt-cc-logo-sword"
  }), /*#__PURE__*/React.createElement("div", {
    className: "bt-cc-sword-shine", "aria-hidden": true
  }), /*#__PURE__*/React.createElement("img", {
    src: '/ui/welcome/logo-brotown.webp', alt: 'BRO TOWN', className: "bt-cc-logo"
  }), /*#__PURE__*/React.createElement("div", {
    className: "bt-cc-logo-shine", "aria-hidden": true
  }))), /*#__PURE__*/React.createElement("section", {
    /* Character SHOWCASE — the character is the star; flex-driven height
       (see .bt-cc-stage in game.css).  The pedestal group / braziers /
       canvas geometry is the v2.3.799-802 system, untouched except the
       v2.3.1251 sizes below.  v2.3.1309: overflow stays VISIBLE — the
       v2.3.1307 overflow:hidden clipped the zoomed sprite at the stage
       edge, which read as an invisible layer cutting the body (owner).
       The drawer frames now let the legs slide behind the drawer
       sheet; the hero tap-zoom keeps the whole body inside the stage. */
    className: "bt-cc-stage",
    ref: _stageRef,
    style: { position: 'relative', width: '100%', boxSizing: 'border-box' }
  }, /*#__PURE__*/React.createElement("div", {
    /* Pedestal GROUP (v2.3.802): platform + braziers scale together off
       stage height; DOM order keeps them behind the character canvas. */
    style: { position: 'absolute', bottom: '3%', left: '50%', height: '34%', aspectRatio: '480 / 165', transform: 'translateX(-50%)', pointerEvents: 'none' }
  }, /*#__PURE__*/React.createElement("img", {
    src: '/ui/welcome/platform.webp', alt: '',
    style: { position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.6))' }
  }), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1300: firelight cast shadows — two soft skewed ellipses on the
       disc's top face, each leaning AWAY from its brazier and flickering
       with the flame cadence (opacity/transform-only animation: the CSS
       filter route is banned near the video surface — the iOS grainy-
       static incident, SpecialChargePie v2.3.948).  DOM-ordered under
       the character canvas. */
    className: "bt-cc-castshadow bt-cc-castshadow--l", "aria-hidden": true
  }), /*#__PURE__*/React.createElement("div", {
    className: "bt-cc-castshadow bt-cc-castshadow--r", "aria-hidden": true
  }), /*#__PURE__*/React.createElement("div", { className: "bt-cc-brazier bt-cc-brazier--left" }),
  /*#__PURE__*/React.createElement("div", { className: "bt-cc-brazier bt-cc-brazier--right" })),
  /*#__PURE__*/React.createElement("div", {
    /* v2.3.1307 (round-7): crisp contact shadow under the boots — the
       missing ground contact was what read as "pasted on".  Anchored to
       the platform contact line (24.2% of stage, v2.3.799 algebra);
       hidden while a zoom/category frame moves the boots off the line. */
    "aria-hidden": true,
    style: {
      position: 'absolute', left: '50%', bottom: '22.4%',
      width: '15%', height: '2.4%',
      transform: 'translateX(-50%)',
      borderRadius: '50%',
      background: 'radial-gradient(ellipse at center, rgba(0,0,0,.44) 0%, rgba(0,0,0,.20) 55%, transparent 72%)',
      pointerEvents: 'none',
      opacity: (_frame.h === 54.5) ? 1 : 0,
      transition: 'opacity .18s ease'
    }
  }),
  /*#__PURE__*/React.createElement("canvas", {
    ref: previewCanvasRef,
    title: 'Live preview — tap to zoom',
    /* v2.3.711: drag-to-rotate.  Pointer capture keeps the gesture alive
       when the finger drifts off the canvas mid-swipe.  v2.3.1307: a
       pointer journey with no rotation is a TAP — toggles the zoom. */
    onPointerDown: function (e) { _dragRotX.current = e.clientX; _dragMoved.current = false; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} },
    onPointerMove: function (e) { if (_dragRotX.current === null) return; var dx = e.clientX - _dragRotX.current; if (Math.abs(dx) >= 26) { _dragMoved.current = true; _setHasSpun(true); /* v2.3.2391: the cue has done its job */ rotatePreview(dx > 0 ? 1 : -1); _dragRotX.current = e.clientX; } },
    onPointerUp: function () { _dragRotX.current = null; if (!_dragMoved.current) setPreviewZoom(function (z) { return !z; }); },
    onPointerCancel: function () { _dragRotX.current = null; },
    /* No width/height attributes: drawCharacterPortrait force-sets the
       bitmap to 256x256 on every draw.  The bitmap upscales via CSS —
       object-fit keeps it square and pixelated keeps the upscale sharp. */
    style: {
      /* v2.3.799: SQUARE canvas sized by stage HEIGHT, bottom-center
         anchored so the boots plant on the pedestal's top face.
         v2.3.1251: 88% → 97% (+10%); bottom 14.5% → 13.5%.
         v2.3.1276b: 97% → 48.5% (owner: half-size character on the
         hero screen).  The platform contact line lives at ≈24.2% of
         stage (13.5 + 0.11×97, boots ≈11% up the bitmap).
         v2.3.1307 (round-7): rest frame +12% → 54.5% (bottom = 24.2 −
         0.11×54.5 ≈ 18.2%); height/bottom now come from the _frame
         presets (tap zoom + drawer category framing) with a 180ms
         ease. */
      position: 'absolute',
      left: '50%',
      bottom: _frame.b,
      height: _frame.h + '%',
      transition: 'height .18s ease, bottom .18s ease',
      aspectRatio: '1 / 1',
      objectFit: 'contain',
      imageRendering: 'pixelated',
      borderRadius: 8,
      display: 'block',
      touchAction: 'none',
      cursor: 'grab',
      /* v2.3.744/745: per-angle drop — SW/E source frames sit higher in
         their 256 box than the others.  v2.3.1276b: px offsets halve
         with the bitmap's on-screen scale. */
      transform: 'translateX(-50%) translateY(' + ({ southwest: 8, southeast: 8, east: 5, west: 5, northeast: 3, northwest: 3 }[previewDir] || 0) + 'px)',
      /* v2.3.717: transparent — trait sprites carry white extraction
         residue that any dark backdrop would expose.  No z-index: DOM
         order stacks pillars < canvas < rotate buttons. */
      background: 'transparent'
    }
  }),
  /* ═══ v2.3.2391: THE SPIN CUE ═══
     Owner: "Can you put a little white arc with two dots at the end as a
     visual cue that the character can spin around if you drag your finger on
     him?", with the art attached and a sketch of it drawn at the bro's feet.

     v2.3.2006 removed the two rotate CIRCLES, correctly -- they were 50px
     targets sitting on top of the character.  But they were also the only
     thing that said the drag existed, and the note there admits as much
     ("the circles were the discoverability crutch for it").  This is that
     crutch put back as a PICTURE rather than a control: no hit target, no
     pixels over his face, and it leaves once it has been read.

     LAST CHILD of the stage, so it paints in FRONT of the boots the way the
     owner drew it, and pointerEvents:none so the drag it advertises still
     lands on the canvas underneath -- an affordance that eats the gesture it
     teaches is worse than none.

     It stands down once the player has actually turned him (_hasSpun),
     because a cue that outlives its lesson is clutter on the character, and
     it is hidden from a screen reader, which has the drag described in words.

     IT DOES NOT COPY THE CONTACT SHADOW'S GATE, though that was the first
     thing I wrote.  That shadow is drawn only while `_frame.h === 54.5`,
     and 54.5 is the CATEGORY-CROP frame -- measured, not read off the
     v2.3.1307 comment, which describes the numbers the other way round and
     is stale.  The frame the player actually ARRIVES on is h:76 (Hair is
     the opening tab and has no crops), so borrowing that condition hid the
     cue in the one state it exists for.  The two frames put the boot
     contact line at 26.4% and 24.2% of stage height respectively -- 2.2%
     apart, about 7px here -- so one anchor serves both and the cue simply
     stays up until it is earned. */
  /*#__PURE__*/React.createElement("img", {
    src: '/ui/welcome/cc/cc-spin-cue.png',
    alt: '',
    "aria-hidden": true,
    draggable: false,
    className: "bt-cc-spincue",
    "data-spun": _hasSpun ? '1' : undefined,
    style: {
      /* v2.3.2393 (owner: "make the new touch spin art 50% transparent though
         so it doesn't take up too much attention").  Half opacity, not a
         redraw of the art at half alpha: the cue has to be able to go to 0
         when it is earned, and one property doing both keeps the fade it
         already has honest.  It sits over his boots, so at 0.5 he reads
         through it and the arrows stay legible against the pedestal. */
      opacity: _hasSpun ? 0 : SPIN_CUE_OPACITY
    }
  })),
  /* ═══ v2.3.2006: THE ROTATE CIRCLES ARE GONE — DRAG THE BRO ═══
     Owner: "Remove the two buttons for turning the bro on trait picker page
     and just keep behavior for using finger to turn."

     The drag has been the real control since v2.3.711 (horizontal swipe on
     the stage, one facing per 26px of travel); the circles were the discover-
     ability crutch for it and they cost the stage two 50px targets sitting on
     top of the character.  `rotatePreview` is untouched and still the only
     way a facing changes -- the drag handler on .bt-cc-stage calls it, so
     nothing about the rotation itself moved.

     The painted icons (cc-rotate-left/right.webp) stay on disk: they are
     slices of the owner's title sheet, not generated, and deleting art to
     save two files nobody serves is not worth the regret if this comes back.
     .bt-cc-rot's rules stay in game.css for the same reason. */
  /* v2.3.1276: the always-visible sheet (.bt-cc-menu) was retired for a
     slide-up drawer.  v2.3.1524: the drawer is retired in turn — the pickers
     are the permanent right-hand column (.bt-cc-panel) further down. */
  /* v2.3.2361: the name block and the two action buttons are ONE thing now --
     they share the carved backplate the owner mocked up, so they share a
     wrapper.  Exactly these two: ENTER BRO TOWN is the next sibling and stays
     OUTSIDE the frame, which is how the mockup draws it and also what keeps
     the screen's one gold plate from being swallowed by a gold frame.
     .bt-cc-cluster in game.css paints the frame; the two `>` rules up in the
     v2.3.1527 block had to follow this nesting or the sprite draws over the
     controls again. */
  /*#__PURE__*/React.createElement("div", {
    className: "bt-cc-cluster",
    /* v2.3.2378: the validation line borrows the divider's slot rather than
       taking a row of its own (see .bt-cc-namewrap>[aria-live] in game.css).
       While it has something to say, the rail steps aside; the flag says so
       in one place so the CSS can do it without a second state. */
    /* v2.3.2388: ...or while the button is answering a press.  Without this
       the flag stayed undefined with an empty field -- exactly the state the
       owner pressed in -- so the slot the message needs was not claimed. */
    "data-msg": (_trimmedName.length === 0 && !_pressMsg) ? undefined : '1'
  },
  /*#__PURE__*/React.createElement("div", {
    /* Name row — the dice ICON rerolls the NAME only.  .bt-cc-namewrap's
       margin-top:auto pins the whole control cluster to the bottom, so
       the capped stage floats in the upper space (hero composition). */
    className: "bt-cc-namewrap",
    style: { position: 'relative', width: '100%', flex: '0 0 auto' }
  }, /*#__PURE__*/React.createElement("label", {
    /* v2.3.1307 (round-7): persistent field label — the placeholder
       vanishes the moment you type; the label doesn't. */
    htmlFor: 'bt-cc-name-input',
    /* ═══ v2.3.2151: THE NAME FIELD ASKS FOR SOMETHING, SO IT SHOULD LOOK
           LIKE A QUESTION ═══
       Owner: "Make the name your character area more obvious. Maybe center
       and large and in all caps put the BRO NAME label."

       It was a 10px grey caption in the corner of a screen whose other three
       controls are 48px plates -- it read as a field label on a form, not as
       the one thing the screen needs from you. Centred over the well, at 15px
       in the brass the ENTER plate uses, it reads as the heading of the
       cluster instead. The caps were already there (textTransform); what was
       missing was the size, the centring and a colour that belongs to the
       screen's primary action rather than to its captions. */
    /* v2.3.2359: the inline face moved to .bt-cc-namehead in game.css.  It
       had to: the heading is flanked by the owner's sparkles now, which
       needs display:flex, and an inline `display:block` beats any stylesheet
       that tries.  Same size, weight, tracking and caps as v2.3.2151 set
       them -- only the paint and the ornaments are new. */
    className: "bt-cc-namehead"
  }, "Bro Name"), /*#__PURE__*/React.createElement("input", {
    id: 'bt-cc-name-input',
    ref: _nameFieldRef,   /* v2.3.2388: the blocked button focuses this */
    value: nameInput,
    onChange: function onChange(e) {
      return setNameInput(e.target.value);
    },
    onKeyDown: function onKeyDown(e) {
      return e.key === 'Enter' && _nameValid && joinTown();
    },
    /* v2.3.2151: "Name your Bro…" did not fit the column -- the well is ~172px
       wide with 46px reserved on the right for the die, and the field
       ellipsised its own placeholder to "Name your ...", which reads as a
       broken string rather than as an invitation. The heading above says whose
       name it is now, so the placeholder only has to say what to do. */
    placeholder: "Tap to name",
    maxLength: 20,
    /* ═══ v2.3.1818: NO AUTOFOCUS ═══
       Owner: "Immediately after tapping new character from splash screen the
       iOS keyboard scrolls you to this view.  Don't make it jump to the name
       right away."

       On a phone, focusing an input IS opening the keyboard.  iOS then
       scrolls the focused field into the shrunken viewport, which drags the
       creator up and takes the character — the whole point of this screen —
       off the top of it.  So the first thing a player saw of their new bro
       was a name box and a keyboard.

       Deliberately not replaced with a scroll-into-view or a delayed focus:
       both still open the keyboard, and the keyboard is the thing that
       breaks the layout.  The field is one tap away and reads "Name your
       Bro…", so nothing is hidden — you just get to look at the character
       first, and pick the name when you are ready.

       Desktop loses a small convenience (click before typing).  Accepted:
       iPhone Safari is the primary platform per CLAUDE.md, and a
       pointer-fine-only autofocus would put the two platforms on different
       code paths for a keystroke. */
    className: "bt-cc-name",
    style: {
      width: '100%',
      /* symmetric side padding clears the dice on the right while
         keeping the centered text centered. */
      padding: '0 42px',
      /* v2.3.710: 16px floor — iOS Safari auto-zooms inputs with a smaller
         font on focus, leaving visualViewport.scale > 1, which trips the
         joinTown pinch-zoom gate.  Survives the v2.3.1257 sheet shrink. */
      fontSize: 16,
      fontWeight: 700,
      outline: 'none',
      textAlign: 'center',
      boxSizing: 'border-box',
      caretColor: '#EAC675',
      /* v2.3.1272: back to the 44px comfort floor. */
      minHeight: 44
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: 'button', title: 'Random name', "aria-label": 'Generate a random name', onClick: rollRandomName,
    /* v2.3.1251: "Roll" text → dice icon inside the input (handoff).
       44pt touch target, inline-SVG die (no emoji / no asset).
       v2.3.1254: chrome moved to .bt-cc-btn (micro-bevel); the inline
       styles left are layout-only.  No :active translate here — the
       button sits inside the input, so it presses via the class's
       reversed bevel instead of moving. */
    className: "bt-cc-btn",
    /* v2.3.1272: 40px target inside the 44px name well. */
    style: { position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 8, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
    /* v2.3.1576: the owner PAINTED cc-random-name.webp and it was sitting
       unreferenced in public/ui/welcome/cc/ while this button drew the
       v2.3.1235 inline SVG die.  Its sibling cc-random-look.webp was
       already wired to the Randomize Look button right below, so the two
       reroll actions were rendering in two different visual languages.
       Painted icon wins; _dieSvg is retired with its last caller. */
  }, /*#__PURE__*/React.createElement("img", {
    className: "bt-cc-action-icon",
    src: '/ui/welcome/cc/cc-random-name.webp?v=' + BUILD_INFO.version,
    alt: '', draggable: false,
    style: { width: 22, height: 22, objectFit: 'contain' }
  })), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1307: inline validation line — green check once the name
       clears the local rules, quiet guidance otherwise.  Fixed height
       so the cluster never jumps.  (Names are not unique server-side,
       so length is the honest contract — no availability check.) */
    /* v2.3.2388: assertive while it is answering a press.  'polite' waits for
       a pause in the screen reader's queue, which is right for guidance that
       appeared on its own and wrong for a direct reply to a button the player
       just pushed. */
    "aria-live": _pressMsg ? 'assertive' : 'polite',
    className: "bt-cc-namemsg",
    /* v2.3.2388: the pressed reason is amber -- it is neither the green all-
       clear nor the grey hint that was already sitting there, and the change
       of colour is part of what makes it register as a REPLY. */
    style: { color: _pressMsg ? '#E5B45C' : (_nameValid ? '#55B98A' : '#8D9B98') }
  }, _pressMsg
      || (_trimmedName.length === 0 ? '' : _nameValid ? '✓ Ready to go' : 'At least 2 characters'))), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1524: one action left. "Customize Appearance" opened the drawer,
       and the drawer is now a permanent column, so the button had nothing to
       open. Randomize rerolls the whole look. */
    className: "bt-cc-actions"
  }, /* v2.3.2036: Reset joins Randomize as the SECOND child of this grid --
        no wrapper.  Checked rather than assumed: .bt-cc-actions holds only the
        Randomize button (ENTER BRO TOWN is its sibling, not its child), so
        making it two columns pairs exactly these two and moves nothing else.
        The wrapper this replaced was written on the assumption that ENTER was
        inside, and the paren it added did not balance -- the build said so. */
  /*#__PURE__*/React.createElement("button", {
    /* v2.3.2006: --hero, not a change to .bt-cc-btn itself -- that class is
       also the account modal's action and the quest claim screen's "Later",
       and neither of those is a screen's headline control. */
    /* v2.3.2151: --randomize carries the colour (owner: "Make the randomize
       look, reset buttons different colors with larger font"); --hero still
       carries the bevel, so the two buttons differ in hue and in nothing
       else. */
    type: 'button', className: "bt-cc-btn bt-cc-btn--hero bt-cc-randomize", onClick: randomizeWithFlair,
    /* v2.3.2114: a stable hook for mp-inkreset.  Both of these change the
       whole character at once, which is exactly the kind of button whose
       coverage is easy to believe in and hard to check by eye. */
    'data-tut': 'cc-randomize'
  }, /*#__PURE__*/React.createElement("img", {
    /* v2.3.2008: the owner's painted randomize icon (a bro inside two turning
       arrows) replaces cc-random-look.webp, which was a generic pair of
       arrows with no bro in it. */
    className: "bt-cc-action-icon", src: '/ui/welcome/cc/cc-randomize.png?v=' + BUILD_INFO.version, alt: '', draggable: false,
    /* v2.3.2035 (owner: "make the randomize look icon larger").  20 -> 30,
       stated HERE rather than on .bt-cc-action-icon: that class is shared with
       the name-reroll die above, which the owner did not ask to change and
       which pins its own 22px inline.  Sizing the shared class appeared to
       work only because that inline style masked it.
       v2.3.2361: 30 -> 28, which is the whole of what the carved backplate
       took from this icon.  The frame's rails cost the row ~36px and the
       ledger in game.css spends the button's border, its side padding, the
       icon gap, the plate's own margin and a bleed past the column to get it
       back; 28 is the last 2px of a 157.9px row that has 160.3px to sit in.
       It is still the size mp-ccsize guards, and still 8px up on the icon the
       owner asked to grow -- hiding it, which is what a frame with generous
       rails wants you to do, would have reversed that ask outright.
       v2.3.2416: 28 -> 34 (owner, on the name cluster: "Icon too small").  The
       binding constraint has always been the ROW, not the button's height: the
       label has to stay on one line beside it, which is what mp-ccbuttons 3
       pins.  The 6px comes off the button's own side padding and its icon gap
       rather than off the label (see .bt-cc-actions>button in game.css) --
       shrinking the words to grow the picture would have traded one half of
       this control for the other. */
    style: { width: 34, height: 34, objectFit: 'contain' } }),
  /*#__PURE__*/React.createElement("span", null, "Randomize Look")),
  /* ═══ v2.3.2036: RESET ═══
     Owner: "add a reset button so you can make the character back to the
     default" -- and, asked which default, "the look you opened with".
     Beside Randomize rather than under it: they are the same kind of action
     (change the whole character at once) and the pair reads as roll / undo.
     Narrower than Randomize on purpose -- it is the escape hatch, not the
     thing you are meant to reach for first. */
  /*#__PURE__*/React.createElement("button", {
    /* Not --hero: that is the headline treatment, and Reset is the quiet
       escape hatch below it. */
    type: 'button', className: "bt-cc-btn bt-cc-reset", 'data-tut': 'cc-reset',   /* v2.3.2114 */
    onClick: resetLook, title: 'Back to the look you started with'
  }, /*#__PURE__*/React.createElement("span", null, "Reset")))),
  /*#__PURE__*/React.createElement("button", {
    /* ═══ v2.3.2388: IT TAKES THE PRESS SO IT CAN ANSWER IT ═══
       `disabled` is gone and aria-disabled takes its place.  That is the
       whole mechanism: a natively disabled button fires NO click event, so
       there was never a moment at which the screen could explain itself --
       the button dimmed and that was the entire answer.  aria-disabled keeps
       the state announced to screen readers and keeps it out of nothing else,
       while letting the press through to be answered.
       Still visibly not-ready (0.55, no pointer cursor): the press is for
       asking why, not a hidden way in.  joinTown is only ever called when
       there is no reason not to. */
    onClick: function () {
      if (!_blockReason) { joinTown(); return; }
      _setPressMsg(_blockReason);
      /* Put them where the fix is.  The name is the step they control from
         this screen, and focusing the field also raises the keyboard on a
         phone -- so the answer and the means to act on it arrive together. */
      if (!_trimmedName && _nameFieldRef.current) {
        try { _nameFieldRef.current.focus(); } catch (e) {}
      }
    },
    "aria-disabled": _blockReason ? 'true' : undefined,
    /* v2.3.1251: PLAY → ENTER BRO TOWN, the screen's one dominant gold
       action.  v2.3.1307: gated on a valid name (round-7). */
    className: "bt-cc-play",
    "aria-label": 'Enter Bro Town',
    style: {
      width: '100%',
      cursor: _blockReason ? 'default' : 'pointer',
      opacity: _blockReason ? 0.55 : 1
    }
    /* v2.3.1577 (owner: "make the Enter Bro Town text subtly grow and
       shrink").  The label is wrapped so the breath animates the TEXT
       rather than the button: scaling the button itself would fight its
       own :active translateY(2px), and scaling a child by transform
       reflows nothing.  See .bt-cc-play-label in game.css for why it
       only breathes once the name is valid. */
  },
  /* v2.3.2008: the town gate, left of the label.  It rides INSIDE the
     breathing label's row but is not part of the label span -- v2.3.1577's
     animation scales that span, and a scaling gate would pulse against a
     static one on the plate beside it. */
  /*#__PURE__*/React.createElement("img", {
    className: "bt-cc-play-icon",
    /* v2.3.2359: the crest from the owner's gold sheet, which is what the
       mockup puts here.  cc-enter-town.png (the painted gate) stays on disk
       -- this is a swap of which emblem the plate wears, not a deletion. */
    src: '/ui/welcome/title/crest.webp?v=2.3.2359',
    alt: '', draggable: false, "aria-hidden": true
  }),
  /*#__PURE__*/React.createElement("span", { className: "bt-cc-play-label" }, "Enter Bro Town")),
  /* ═══ v2.3.2219: THE WAY BACK ═══
     Owner: "Create a character need a back button to main menu."  The
     creator is reached deliberately (CREATE CHARACTER on the splash), and
     before this the only ways out of it were finishing a character or
     reloading the page -- so changing your mind meant committing to a bro
     you did not want.

     This does NOT reopen what v2.3.2006 closed below.  That was a second
     ENTRY -- a returning player asked the same question twice.  This is an
     EXIT, and it is the only one.

     Deliberately the same quiet text treatment as the roster's Back button
     (CharacterPicker) rather than a plate: the gold action above it is meant
     to be the thing you reach for, and a way out that competes with it is a
     way out that gets pressed by accident. */
  onBack ? /*#__PURE__*/React.createElement("button", {
    type: 'button', className: "bt-cc-back",
    onClick: onBack,
    "aria-label": 'Back to the main menu',
    style: {
      /* v2.3.2378: the 10px top margin is gone.  It sat on top of the
         column's own 4-6px gap, so Back was the one child with two spacings
         above it, and those 10px are the other half of what pays for the
         plate's new top margin (game.css, .bt-cc-col-left>.bt-cc-cluster) --
         a pixel taken from a gap nobody was reading is a pixel of his boots
         back.  The gap alone still separates it from ENTER BRO TOWN, and the
         34px target is untouched. */
      display: 'block', margin: '0 auto', minHeight: 34, padding: 0,
      background: 'none', border: 'none', cursor: 'pointer',
      fontSize: 14, fontWeight: 700, color: '#8B9895',
      fontFamily: 'Source Sans 3, sans-serif',
      WebkitTapHighlightColor: 'transparent',
    }
  }, "Back") : null,
  /* ═══ v2.3.2006: THE RETURNING-PLAYER ROW IS GONE FROM HERE ═══
     Owner: "Remove button already have bro on trait creator screen."

     It was never the only door and it is not the door anyone arrives at: you
     reach this screen by pressing CREATE CHARACTER on the splash, and the
     splash's other plate -- the gold one, "Continue" -- is the returning
     player's way in.  Offering it again at the bottom of the creator asked a
     player who has already answered that question to answer it twice.

     The AccountModal it opened goes with it (nothing else in this file set
     showAccount), so the state and its render are removed too rather than
     left as a modal no gesture can reach. */
  /*#__PURE__*/React.createElement("div", {
    /* v2.3.1675 (owner: "put the little Hemi bros logo to the left of the
       version number").  Mark and version share one baseline row now — it
       reads as a single signature line rather than two stacked scraps, which
       is what it looked like when the mark sat above on its own. */
    style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }
  }, /*#__PURE__*/React.createElement("img", {
    /* v2.3.1674: the HEMI BROS maker's mark.  Its glow is baked into the art
       (the black was keyed out by LUMINANCE, so the halo feathers to
       transparent instead of leaving a box) — hence no CSS glow here. */
    src: '/ui/hemi-bros-logo.webp?v=' + BUILD_INFO.version,
    alt: 'Hemi Bros', className: "bt-cc-hemi", draggable: false
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--txt2)',
      fontFamily: 'Source Sans 3, sans-serif',
      letterSpacing: '.06em',
      textAlign: 'center'
    }
    /* v2.3.1307: the commit sha leaves the splash (round-7) \u2014 support
       reads it from the console BUILD_INFO when needed. */
  }, "v" + BUILD_INFO.version))), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1524: the picker COLUMN. Was the v2.3.1276 slide-up drawer, and
       before that an always-visible sheet under the character; it is now a
       permanent pane to the character's right, running from under the title
       to the bottom of the screen. The tap-to-close scrim and the Done button
       go with the drawer — there is nothing left to dismiss. */
    className: "bt-cc-panel"
  }, /*#__PURE__*/React.createElement("h2", {
    /* v2.3.1527: the pane says what it is (owner). It used to be introduced by
       a "Customize Appearance" button; without that button it arrived unlabelled. */
    className: "bt-cc-panel-title"
  }, "Trait Picker"), /*#__PURE__*/React.createElement("nav", {
    className: "bt-cc-tabs", role: 'tablist', "aria-label": 'Appearance category'
  }, _TABS.map(function (x) {
    var on = x.t === _activeType;
    return /*#__PURE__*/React.createElement("button", {
      key: x.t, type: 'button', role: 'tab', "aria-selected": on ? 'true' : 'false',
      className: 'bt-cc-tab' + (on ? ' bt-cc-tab--on' : ''),
      onClick: function () { setActiveCat(x.t); }
    }, x.glyph === 'build' ? /*#__PURE__*/React.createElement("svg", {
      /* v2.3.1953: two figures, one short and one tall, which is the whole
         idea of the tab in one glyph.  currentColor, so it dims and brightens
         with the tab exactly as the painted icons' opacity does. */
      className: "bt-cc-tab-icon", viewBox: '0 0 30 30', "aria-hidden": true, focusable: 'false'
    },
    /*#__PURE__*/React.createElement("g", { fill: 'currentColor' },
      /*#__PURE__*/React.createElement("circle", { cx: 9, cy: 11, r: 3 }),
      /*#__PURE__*/React.createElement("rect", { x: 5.5, y: 15, width: 7, height: 11, rx: 2.4 }),
      /*#__PURE__*/React.createElement("circle", { cx: 21, cy: 6.5, r: 3.4 }),
      /*#__PURE__*/React.createElement("rect", { x: 17, y: 11, width: 8, height: 15, rx: 2.6 }))
    /* v2.3.2389: the eyewear branch that stood here is gone with the tab's
       placeholder glyph -- it drew two stroked rims in currentColor, and the
       owner's painted frames replace it.  Every tab that RENDERS is painted
       art now; the build branch above outlives its tab on purpose (v2.3.2268
       dropped Build from _typeDefs, so the filter never emits it) and stays as
       the restoration path, same as _buildTile and HEIGHT_CATALOG. */
    ) : x.img ? /*#__PURE__*/React.createElement("img", {
      /* v2.3.1308: the owner's painted category art.
         v2.3.1931: one sheet for all eight, and no per-tab pixel flag — the
         catalog-thumb tabs that needed `pixelated` are gone (see _TABS). */
      className: "bt-cc-tab-icon",
      src: x.img, alt: '', draggable: false, decoding: 'async'
    }) : null,
    /*#__PURE__*/React.createElement("span", { className: "bt-cc-tab-label" }, x.label));
  })), /*#__PURE__*/React.createElement("div", { className: "bt-cc-scroll" },
  /*#__PURE__*/React.createElement("div", {
    /* Option strip — exactly five complete tiles at rest; extra options
       scroll horizontally (sizing in .bt-cc-strip, game.css).  The whole
       catalog is always rendered: the v2.3.835 collapse-on-select
       machinery is retired with the pager. */
    className: "bt-cc-strip", ref: _stripRef, onScroll: _measureMore, role: 'listbox', "aria-label": _def.label + ' options'
  }, _items), /*#__PURE__*/React.createElement("span", {
    /* v2.3.1254: fade + chevron while more tiles wait off-screen.
       v2.3.2205: the arrow points DOWN now, at the direction the grid
       actually scrolls -- a › over a vertical list points at a wall. */
    className: "bt-cc-more" + (scrollMore.items ? " bt-cc-more--on" : ""), "aria-hidden": true
  }, "▾")), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1252: like the subtabs, the color block always occupies its
       row — an invisible ghost (with one placeholder tile so the row
       keeps its swatch height) when the type/pick has no colors.  This
       plus the ghost subtabs makes the sheet height IDENTICAL across
       every category and pick, so the stage — and the character — never
       change size. */
    /* v2.3.2414: `--yield` on a tab where this block is a GHOST and the ink
       card below is live.  The band is 100.5px of `visibility:hidden` nothing
       on Skin, Pants and Shoes -- all three have `colors: null` unconditionally
       (their swatch row IS their option strip), so it is not empty because of
       what you picked, it is empty always -- and the card is the thing that
       needs the room.  It was reserved for v2.3.1252's constant-sheet-height
       rule, which the v2.3.1524 two-column split retired in practice: the stage
       is a sibling now and measures the same 172/120px on every tab regardless.
       Shirt keeps its band: with a shirt on, that block holds twelve real
       swatches. */
    className: "bt-cc-colors" + (_colors ? "" : " bt-cc-ghost")
      + ((!_colors && _cardLive) ? " bt-cc-colors--yield" : ""),
    "aria-hidden": _colors ? undefined : true,
    style: { position: 'relative' }
  }, /* v2.3.1272: the — COLOR — header is retired (space).
        v2.3.1308 tried a tiny absolute contextual label here; v2.3.1310
        removes it (owner: redundant, overlapped the swatches, barely
        readable).  The swatch row reads as colors on its own. */
  /* ═══ v2.3.2035: DEFAULT IS A BUTTON YOU CAN SEE ═══
     Owner: "make the default color its own text button above the color
     options (right now it's a random color like blue even if it doesn't
     match default item color)".

     v2.3.1253 removed the default SWATCH and made the rule "unpicked =
     default, re-tap your pick to unselect".  That is tidy and undiscoverable:
     nothing on screen says a default exists, the only way back is to remember
     which swatch you chose and tap it again, and -- the owner's actual
     complaint -- the swatch row offers no tile that means "however this item
     was painted", so the eye reads the nearest blue as if it were that.

     A TEXT button, not a swatch, on purpose: the whole point is that the
     default is not one of these colours.  Any tile we drew would have to be
     SOME colour and would lie about that for every item whose art is not that
     colour, which is the bug being fixed rather than a fix for it.

     Placed above the row rather than absolutely positioned over it -- v2.3.1310
     retired an absolute label here precisely because it overlapped the
     swatches.  The constant-sheet-height guarantee (v2.3.1252/1253) survives
     because this row is ALWAYS rendered, and the whole block already ghosts
     as a unit on categories with no colours, so no category differs from
     another.  It costs the stage ~22px once, on every tab equally. */
  /*#__PURE__*/React.createElement("div", { className: "bt-cc-colors-head" },
    /*#__PURE__*/React.createElement("button", {
      type: 'button',
      className: "bt-cc-defcolor" + ((!_def.colorSel || _def.colorSel === 'default') ? " bt-cc-defcolor--on" : ""),
      /* Not aria-pressed: this is one option in the same radiogroup as the
         swatches below, and a toggle-shaped label beside radio-shaped ones
         reads wrong to a screen reader. */
      role: _colors ? 'radio' : undefined,
      "aria-checked": _colors ? (!_def.colorSel || _def.colorSel === 'default') : undefined,
      tabIndex: _colors ? 0 : -1,
      onClick: function () { if (_colors) _def.setColor('default'); }
    }, "Default")),
  /*#__PURE__*/React.createElement("div", { className: "bt-cc-scroll" },
  /*#__PURE__*/React.createElement("div", {
    className: "bt-cc-colors-row", ref: _colorRowRef, onScroll: _measureMore, role: _colors ? 'radiogroup' : undefined, "aria-label": _colors ? _def.label + ' colors' : undefined
  }, _colors || /*#__PURE__*/React.createElement("div", null)), /*#__PURE__*/React.createElement("span", {
    className: "bt-cc-more" + (scrollMore.colors ? " bt-cc-more--on" : ""), "aria-hidden": true
  }, "▾"))),
  /* ═══ v2.3.1938: THE WAY IN TO THE DESIGNER ═══
     v2.3.1940 moved it OUT of the colour block and made it always present.
     Two bugs, one cause: the colour block renders as a `.bt-cc-ghost`
     (visibility:hidden) on any category that has no colour row, and SKIN is
     exactly such a category -- its swatches ARE its options -- so "Draw a
     tattoo" was in the DOM, clickable by script, and invisible to a human.
     Three categories have a drawing: shirt, pants, and skin (whose drawing is a
     tattoo).  The shirt's is live only when a shirt is actually worn -- a print
     with nothing to print on is a dead button -- and it ghosts the same way.

     ═══ v2.3.2414: THE BUTTON IS THE CARD NOW ═══
     Owner: "I'd rather make the tattoo editor simplified, just a preview of the
     body you'd be editing right there in the panel.  I don't really want a
     button to launch the editor anymore.  Every time somebody playtests the
     game they always never notice it."

     That last sentence is the requirement.  It is a DISCOVERABILITY report,
     not a layout preference, and the button was not failing for want of
     shouting -- v2.3.1946 already made it 54px of brass with a 34px painted
     icon and a sentence-long label.  It was failing for where it stood.
     Measured at 390x844 on Skin: the swatch grid ends at 501.9, then 100.5px
     of `visibility:hidden` colour block (this tab has `colors: null`, so that
     band is reserved and permanently empty), then the button at 624.4, then
     147.6px more empty panel under it.  248.1px of dead height around it.  So
     the eye reads the grid, finds nothing under it, and leaves for ENTER BRO
     TOWN -- the button sits in the gap between two things, which is the one
     place nothing gets looked at.

     The card takes that dead height and puts the PLAYER'S OWN BODY in it,
     wearing the drawing they already have, directly under the grid.  Three
     things make it read as a control rather than as a thumbnail, and all three
     are needed:
       - it IS a <button>, the whole card, so press-scale and the brass rim
         apply to the picture as well as to the words (the rim and the
         brass-soft face are v2.3.1946's own treatment, moved, not a new
         accent -- ENTER BRO TOWN stays the screen's one gold action);
       - the old button survives as the card's FOOTER, same icon, same label,
         so nothing that made it legible is lost -- only its isolation;
       - the picture is of YOU and it changes when you change, which a
         decorative thumbnail cannot do.

     WHY THE GHOST ROW ON THE OTHER FIVE TABS IS RETIRED WITH IT.  v2.3.1938
     rendered this on all eight tabs and ghosted five, to keep v2.3.1252's
     constant-sheet-height rule -- which existed so the flex STAGE could not
     resize the character.  That rule stopped binding at v2.3.1524, when the
     two-column split moved the stage into the sibling .bt-cc-col-left:
     measured, .bt-cc-stage's offsetHeight is 172 at 390x844 and 120 at 390x664
     on all nine tabs, while this control's own y already ranges 397.6 -> 770
     across them.  It has not been providing that guarantee for a long time.
     So a tab with nothing to draw on now renders nothing here and gives the
     room back to its option strip -- which Hats badly needed (it was hiding
     365px of its catalogue at 844 and 527px at 664).
     (Measure .bt-cc-stage with offsetHeight, never getBoundingClientRect: it
     carries transform:scale(2) and the rect is double the layout box.
     docs/TRAPS.md 65.) */
  (function () {
    var _p = _cardDef;
    /* NOT RENDERED AT ALL where there is nothing to decorate -- neither on the
       five tabs with no drawing, nor on Shirt with no shirt on.  v2.3.1938
       ghosted this control everywhere instead, to hold the sheet's height
       constant for v2.3.1252; that rule stopped binding at v2.3.1524 (the stage
       is a sibling column now and measures the same on every tab), and a
       GHOSTED card is a much more expensive thing to reserve than a ghosted
       button was -- 260px of invisible panel where the button cost 62.  Dead
       height is the bug being fixed here, so reintroducing 260px of it on the
       Shirt tab to avoid a reflow would be a poor trade: picking a shirt
       already reveals its twelve-swatch colour row on the same tap, so the
       card arriving with it reads as one thing unlocking, not as a jump. */
    if (!_cardLive) return null;
    var _inked = _wearsInk(_p.target);
    var _toolInk = getInk();
    var _toolBrush = getBrush();
    /* ═══ v2.3.2415: THE TOOLS SIT UNDER HIM, NOT A LABEL ═══
       Owner, on the first cut of this card: "Instead of using space for
       'tattoo your body or face' I'd rather you just have the tools for
       tattooing right there beneath the character."

       So the footer that carried the old button's sentence is gone and the
       real palette is in its place.  Three consequences worth stating, because
       each one is a decision:

       1. THE CARD IS NO LONGER ONE BUTTON.  It holds buttons now, and a button
          inside a button is invalid markup that browsers un-nest in ways you
          cannot predict.  The PICTURE is the button; the tools are their own.
          Every one of them opens the editor, so the whole card is still a
          door -- there is just no longer any part of it that is only a label.
       2. THE TOOLS ARE THE EDITOR'S TOOLS, not a lookalike row.  Ink and brush
          come from paintTools.js, which PlayerPaint seeds from and writes back
          to, so picking a colour here arms the editor with it and changing it
          in there updates this row.  Shoes are the exception and take pattern
          tiles instead: they are pattern-only (v2.3.1944), so an ink palette
          would be a row of controls that do nothing on that tab.
       3. NOTHING SAYS "TATTOO" IN WORDS ANY MORE.  The tab says Skin, the
          picture is your own bare chest and there is a palette under it; the
          sentence survives as the picture's aria-label, where length is free.
          If a future session finds playtesters still missing it, the thing to
          add back is a cue, not the sentence -- the sentence was there for two
          years and is what the owner asked to remove. */
    var _tools = _INK_SOURCES[_p.target];
    var _open = function () { setShowPaint(_p.target); };
    return /*#__PURE__*/React.createElement("div", {
      className: 'bt-cc-ink',
    },
    /*#__PURE__*/React.createElement("button", {
      type: 'button', className: 'bt-cc-ink-pane',
      /* The <canvas> inside is aria-hidden (WornPreview's `label: null`), so
         this button's own name is the whole accessible name.  It keeps the
         full sentence the footer used to show: a screen reader pays nothing
         for its length, and it is the one place left that says the face is
         reachable too. */
      "aria-label": _p.label,
      onClick: _open
    },
      /*#__PURE__*/React.createElement(WornPreview, {
        look: _paintLook, target: _p.target, side: 'front',
        className: 'bt-cc-ink-pv', label: null,
        /* ── `contain`, AND WHICH TAB IT IS ACTUALLY FOR ──
           WornPreview pins the window's HEIGHT and derives its width from the
           box.  For a box that is square or WIDER than tall that is fine -- the
           window just opens sideways.  For a PORTRAIT box it narrows, and on a
           figure that means slicing the sides off.
           Which tab is portrait is not obvious and is worth writing down,
           because getting it wrong nearly deleted this prop.  It depends on how
           tall that tab's TOOL block is: Skin, Shirt and Pants carry three rows
           of palette plus the brush widths, so their pane comes out about
           168x169 at 390x844 -- square, where the two rules agree exactly.
           SHOES carries one row of pattern tiles, so its pane is 168x247 --
           firmly portrait, and it is the tab this option is really for.
           Measured on the Shoes card, with and without: 13.4% of the canvas
           clear either side of him against 0%, i.e. legs jammed edge to edge.
           A first mutation run reported this prop as dead because the framing
           assertion only ever looked at the SKIN tab, where it genuinely
           changes nothing.  mp-ccink checks Shoes now too, which is what makes
           the claim testable. */
        fit: 'contain',
        focus: _CARD_FOCUS[_p.target]
      }),
      /* ── the empty state ──
         A blank body in a frame reads as a picture of your chest, which is the
         failure this change exists to fix wearing new clothes.  A PLUS, not a
         sentence: it means "add" in every app a player has already used, it is
         an invitation where a status line ("Nothing here yet", which is what
         this shipped with for an afternoon) is only a report, and it needs no
         string that has to be true on four different tabs.  (It was also the
         mark the editor's design slots drew for an empty one; those went at
         v2.3.2416, so this is the only place it appears now.)
         It goes the moment there is a single inked cell anywhere on this
         target's canvases -- which is also the moment the picture starts
         speaking for itself. */
      _inked ? null : /*#__PURE__*/React.createElement("span", {
        className: 'bt-cc-ink-empty', "aria-hidden": true
      }, '+'),
      /* ── v2.3.2415: the owner's painted icon, kept ──
         It was the label bar's icon (v2.3.2008 painted it; v2.3.2035 took it
         26 -> 34 because the owner asked for it bigger), and the label bar is
         gone.  Deleting an asset the owner asked for twice to make room for
         the tools they asked for once is not a trade worth making, so it
         becomes a badge ON the picture: it costs no layout height, it says
         "tattoo gun" / "patterned sneaker" without a word, and it keeps the
         tab's purpose on screen now that nothing spells it out.
         pointer-events:none and aria-hidden -- the picture behind it is the
         button and the button already has a name.  Only the two tabs with
         painted art carry one; shirt and pants had the inline pencil, which
         was a stand-in for a missing asset rather than an asset, and a pencil
         floating on a pair of trousers says less than the trousers do. */
      _p.icon ? /*#__PURE__*/React.createElement("img", {
        className: 'bt-cc-ink-badge',
        src: '/ui/welcome/cc/' + _p.icon + '.png?v=' + BUILD_INFO.version,
        alt: '', draggable: false, "aria-hidden": true
      }) : null),
    /*#__PURE__*/React.createElement("div", {
      className: 'bt-cc-ink-tools',
      /* A group, not a toolbar: `toolbar` promises arrow-key roving focus that
         nothing here implements, and these are ordinary buttons in reading
         order. */
      role: 'group', "aria-label": _p.label
    },
    (_tools && _tools.pattern && !_tools.canvases.length)
      /* ── SHOES: pattern tiles, because there is nothing to draw on ──
         patternsFor('shoes') is the four that still read at eight pixels of
         boot.  Writing straight to patternCatalog's own store rather than
         through a second one: a pattern is part of the garment, it is already
         persisted there, and the editor seeds from it. */
      ? [/*#__PURE__*/React.createElement("div", { className: 'bt-cc-ink-pats', key: 'pats' },
          [/*#__PURE__*/React.createElement(PatternSwatch, {
            key: 'plain', tile: null, color: null,
            on: !_patNow(_tools.pattern).id,
            onPick: function () { setPattern(_tools.pattern, ''); _open(); }
          })].concat(patternsFor(_tools.pattern).map(function (t) {
            var cur = _patNow(_tools.pattern);
            return /*#__PURE__*/React.createElement(PatternSwatch, {
              key: t.id, tile: t, color: ART_PALETTE[cur.colorIdx || 1],
              on: cur.id === t.id,
              onPick: function () { setPattern(_tools.pattern, formatPattern(t.id, cur.colorIdx || 1)); _open(); }
            });
          })))]
      /* ── EVERYTHING ELSE: the ink palette and the brush widths ──
         Index 0 is the eraser and is drawn as a hole rather than as a colour,
         exactly as the editor draws it -- the same control has to look like
         the same control in both places or the shared store is a lie. */
      : [/*#__PURE__*/React.createElement("div", { className: 'bt-cc-ink-pal', key: 'pal' },
          ART_PALETTE.map(function (c, i) {
            return /*#__PURE__*/React.createElement("button", {
              key: i, type: 'button',
              className: 'bt-cc-ink-chip' + (_toolInk === i ? ' bt-cc-ink-chip--on' : '')
                + (c ? '' : ' bt-cc-ink-chip--erase'),
              style: c ? { background: c } : undefined,
              "aria-label": (i === 0 ? 'Eraser' : 'Colour ' + i) + ', and open the editor',
              "aria-pressed": _toolInk === i,
              onClick: function () { setInk(i); _open(); }
            });
          })),
        /*#__PURE__*/React.createElement("div", { className: 'bt-cc-ink-widths', key: 'w' },
          BRUSH_SIZES.map(function (n) {
            return /*#__PURE__*/React.createElement("button", {
              key: n, type: 'button',
              className: 'bt-cc-ink-width' + (_toolBrush === n ? ' bt-cc-ink-width--on' : ''),
              "aria-label": 'Brush ' + n + ' wide, and open the editor',
              "aria-pressed": _toolBrush === n,
              onClick: function () { setBrush(n); _open(); }
            },
            /*#__PURE__*/React.createElement("span", {
              className: 'bt-cc-ink-dot',
              style: { width: 4 + (n - 1) * 5, height: 4 + (n - 1) * 5 }
            }));
          }))]));
  }())))),
  showPaint && /*#__PURE__*/React.createElement(PlayerPaint, {
    target: showPaint,
    /* v2.3.1947: no `previewDir` -- the designer points the figure itself (a
       shirt BACK has to face away), so it supplies its own facing. */
    /* v2.3.2414: the same memoised object the card draws from, so the panel
       and the card behind it can never disagree about who they are showing. */
    look: _paintLook,
    onClose: function () { setShowPaint(null); }
  }));
}
