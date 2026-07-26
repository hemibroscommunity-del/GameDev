import React from 'react';
import { BUILD_INFO } from '../BuildBadge.jsx';
/* v2.3.1143: account login -- "Already have a character?" entry point
   for a player on a NEW device, who lands on this splash with a fresh
   silent identity and needs a way in with their saved Login Key before
   pressing PLAY (which would start binding progress to the fresh one). */
import { AccountModal } from '../account/AccountModal.jsx';
import { PANTS_CATALOG, SHOES_CATALOG, SKIN_CATALOG, setPants, setShoes, setSkin } from '@/rendering/playerSkins.js';
import { FACIALHAIR_CATALOG, setFacialHair } from '@/rendering/traits/facialHairCatalog.js';
import { FACIALHAIR_COLOR_CATALOG, setFacialHairColor } from '@/rendering/traits/facialHairColorCatalog.js';
import { HAIR_CATALOG, setHair } from '@/rendering/traits/hairCatalog.js';
import { HAIR_COLOR_CATALOG, setHairColor } from '@/rendering/traits/hairColorCatalog.js';
import { HAT_COLOR_CATALOG, setHatColor } from '@/rendering/traits/hatColorCatalog.js';
import { HEADWEAR_CATALOG, headwearIsSolid, setHeadwear } from '@/rendering/traits/headwearCatalog.js';
import { SHIRT_CATALOG, setShirt } from '@/rendering/traits/shirtCatalog.js';
import { SHIRT_COLOR_CATALOG, setShirtColor } from '@/rendering/traits/shirtColorCatalog.js';
import { recolorEnabled } from '@/rendering/traits/recolorOptions.js';

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
export function NameModal(props) {
  var _dragRotX = props._dragRotX,
    _swatchTile = props._swatchTile,
    _thumbTile = props._thumbTile,
    activeCat = props.activeCat,
    beardColorSel = props.beardColorSel,
    facialHairSel = props.facialHairSel,
    hairColorSel = props.hairColorSel,
    hairSel = props.hairSel,
    hatColorSel = props.hatColorSel,
    headwearSel = props.headwearSel,
    joinTown = props.joinTown,
    nameInput = props.nameInput,
    pantsSel = props.pantsSel,
    previewCanvasRef = props.previewCanvasRef,
    previewDir = props.previewDir,
    randomizeWithFlair = props.randomizeWithFlair,
    rollRandomName = props.rollRandomName,
    rotatePreview = props.rotatePreview,
    setActiveCat = props.setActiveCat,
    setBeardColorSel = props.setBeardColorSel,
    setFacialHairSel = props.setFacialHairSel,
    setHairColorSel = props.setHairColorSel,
    setHairSel = props.setHairSel,
    setHatColorSel = props.setHatColorSel,
    setHeadwearSel = props.setHeadwearSel,
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
      colors: (recolorEnabled('hat') && headwearIsSolid(headwearSel)) ? HAT_COLOR_CATALOG : null,
      colorSel: hatColorSel, setColor: function (id) { setHatColor(id); setHatColorSel(id); } },
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
      set: function (id) { setShoes(id); setShoesSel(id); }, colors: null }
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
  var _GROUPS = [
    { key: 'head', label: 'Head', icon: 'skin',
      types: ['hair', 'hat'].concat(recolorEnabled('skin') ? ['skin'] : []).concat(['beard']) },
    { key: 'shirt', label: 'Shirt', icon: 'shirt', types: ['shirt'] }
  ].concat(recolorEnabled('pants') ? [{ key: 'pants', label: 'Pants', icon: 'pants', types: ['pants'] }] : [])
   .concat(recolorEnabled('shoes') ? [{ key: 'shoes', label: 'Shoes', icon: 'shoes', types: ['shoes'] }] : []);
  var _groupOfType = {};
  _GROUPS.forEach(function (g) { g.types.forEach(function (t) { _groupOfType[t] = g.key; }); });
  /* v2.3.1494: drop disabled recolor-only types from the defs too, not just
     from the group lists -- activeCat is remembered across opens, so a stale
     'skin' would otherwise still open the drawer the tab no longer offers. */
  ['skin', 'pants', 'shoes'].forEach(function (t) {
    if (!recolorEnabled(t)) delete _typeDefs[t];
  });
  var _activeType = _typeDefs[activeCat] ? activeCat : 'hair';
  var _activeGroupKey = _groupOfType[_activeType];
  var _activeGroup = _GROUPS.find(function (g) { return g.key === _activeGroupKey; }) || _GROUPS[0];
  /* Most-recently-used subtype per group (handoff: re-opening a group
     lands on its last-used subtype; first-listed otherwise).  View-only
     session memory — plain React state, keyed by OUR group keys, never
     by client/network input. */
  var _mruS = React.useState({}), typeMemo = _mruS[0], setTypeMemo = _mruS[1];
  var _openType = function (g, t) {
    setActiveCat(t);
    setTypeMemo(function (p) { var n = Object.assign({}, p); n[g] = t; return n; });
  };
  var _def = _typeDefs[_activeType];
  var _onPick = function (id) { _def.set(id); };
  var _items = _def.catalog.map(function (o) {
    return _def.kind === 'thumb'
      ? _thumbTile(_def.spriteCat, o, _def.sel, _onPick, 44)
      : _swatchTile(o, _def.sel, _onPick, 40);
  });
  /* Colors sit DIRECTLY below the options (handoff) and go blank when
     the type has none or the pick is 'none'.  v2.3.1253: the 'default'
     entry gets NO tile at all (owner) — no color selected IS the
     default; tapping the selected swatch again unselects it, which
     sets the store back to 'default' (the sprite's native color). */
  var _colorList = _def.colors ? _def.colors.filter(function (o) { return o.id !== 'default'; }) : null;
  var _colors = (_colorList && _colorList.length > 0 && _def.sel !== 'none')
    ? _colorList.map(function (o) {
        return _swatchTile(o, _def.colorSel, function (id) {
          _def.setColor(id === _def.colorSel ? 'default' : id);
        });
      })
    : null;
  /* Reset both strips to their start whenever the type changes — the
     content width changes with the catalog. */
  var _stripRef = React.useRef(null);
  var _colorRowRef = React.useRef(null);
  /* v2.3.1254: scroll affordance — per-strip "more content to the
     right" flags drive the fade+chevron overlays (.bt-cc-more).
     Measured on scroll and whenever the strip contents change; the
     setter bails when nothing changed so scrolling doesn't re-render
     every frame. */
  var _moreS = React.useState({ items: false, colors: false }), scrollMore = _moreS[0], setScrollMore = _moreS[1];
  var _measureMore = function () {
    var i = _stripRef.current, c = _colorRowRef.current;
    var next = {
      items: !!(i && i.scrollWidth - i.clientWidth - i.scrollLeft > 2),
      colors: !!(c && c.scrollWidth - c.clientWidth - c.scrollLeft > 2)
    };
    setScrollMore(function (p) { return (p.items === next.items && p.colors === next.colors) ? p : next; });
  };
  React.useEffect(function () {
    if (_stripRef.current) _stripRef.current.scrollLeft = 0;
    if (_colorRowRef.current) _colorRowRef.current.scrollLeft = 0;
    _measureMore();
  }, [activeCat]);
  /* Re-measure without a scroll reset when the pick changes — the color
     row appears/disappears with it and the user may be mid-browse. */
  React.useEffect(function () { _measureMore(); }, [_def.sel]);
  /* v2.3.1143: Login Key overlay toggle (self-contained -- no BroTown prop). */
  var _acS = React.useState(false), showAccount = _acS[0], setShowAccount = _acS[1];
  /* v2.3.1276: Customize drawer toggle (view-only, like showAccount). */
  var _dwS = React.useState(false), drawerOpen = _dwS[0], setDrawerOpen = _dwS[1];
  /* v2.3.1307 (ChatGPT round-7): preview zoom — tapping the character
     toggles full-body <-> close-up (swipes still rotate at either zoom;
     a tap is a pointer journey under 8px with no rotation fired). */
  var _zmS = React.useState(false), previewZoom = _zmS[0], setPreviewZoom = _zmS[1];
  var _dragMoved = React.useRef(false);
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
  var _drawerRef = React.useRef(null);
  var _dbS = React.useState(null), drawerBpx = _dbS[0], setDrawerBpx = _dbS[1];
  React.useLayoutEffect(function () {
    var measure = function () {
      var st = _stageRef.current, dr = _drawerRef.current;
      if (!drawerOpen || !st || !dr || !dr.offsetParent) { setDrawerBpx(null); return; }
      var stR = st.getBoundingClientRect();
      var modalTop = dr.offsetParent.getBoundingClientRect().top;
      var drawerTop = modalTop + dr.offsetTop;
      /* CSS bottom for the canvas, relative to the STAGE's bottom edge
         (negative = below it): canvas bottom lands 24px past the sheet. */
      setDrawerBpx(Math.round(stR.bottom - (drawerTop + 24)));
    };
    measure();
    window.addEventListener('resize', measure);
    return function () { window.removeEventListener('resize', measure); };
  }, [drawerOpen]);
  var _frame = { h: 54.5, b: '18.2%' };                    /* full body (rest) */
  /* drawerBpx IS the CSS bottom (stage-bottom-relative; negative =
     below the stage, i.e. behind the sheet). */
  var _behindDrawer = (drawerBpx != null) ? drawerBpx + 'px' : '-13%';
  if (previewZoom) {
    _frame = drawerOpen
      ? { h: 96, b: _behindDrawer }                        /* close-up, legs behind drawer */
      : { h: 92, b: '2%' };                                /* hero zoom: whole body, no crop */
  } else if (drawerOpen) {
    var _g = _activeGroupKey;
    if (_g === 'head') _frame = { h: 96, b: _behindDrawer };   /* upper body, legs behind drawer */
    else if (_g === 'shirt') _frame = { h: 78, b: _behindDrawer }; /* torso, dips behind the sheet */
    /* pants/shoes: full body — the default frame already centers them. */
  }
  /* v2.3.1307: name validity gates ENTER (round-7).  Local rules only:
     names are not unique server-side, so there is no availability
     check to run — trimmed length is the honest contract. */
  var _trimmedName = (nameInput || '').trim();
  var _nameValid = _trimmedName.length >= 2;
  /* v2.3.1307: iOS keyboard — reserve its height at the bottom of the
     box (visualViewport), so the name field + validation and the
     controls stay visible while typing. */
  var _kbS = React.useState(0), kbPad = _kbS[0], setKbPad = _kbS[1];
  React.useEffect(function () {
    var vv = window.visualViewport;
    if (!vv) return undefined;
    var onR = function () {
      var kb = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      setKbPad(kb > 100 ? kb : 0);
    };
    vv.addEventListener('resize', onR);
    return function () { vv.removeEventListener('resize', onR); };
  }, []);
  /* v2.3.1235 rollout micro-fix §2's inline-SVG die (currentColor — no
     new hex, no emoji, no asset), shared by the name dice + Randomize. */
  var _dieSvg = function (sz) {
    return /*#__PURE__*/React.createElement("svg", {
      width: sz, height: sz, viewBox: "0 0 20 20", "aria-hidden": true,
      style: { display: 'block', flexShrink: 0 }
    }, /*#__PURE__*/React.createElement("rect", {
      x: 2.5, y: 2.5, width: 15, height: 15, rx: 3.5,
      fill: 'none', stroke: 'currentColor', strokeWidth: 1.6
    }), /*#__PURE__*/React.createElement("circle", { cx: 6.8, cy: 6.8, r: 1.5, fill: 'currentColor' }),
    /*#__PURE__*/React.createElement("circle", { cx: 13.2, cy: 6.8, r: 1.5, fill: 'currentColor' }),
    /*#__PURE__*/React.createElement("circle", { cx: 10, cy: 10, r: 1.5, fill: 'currentColor' }),
    /*#__PURE__*/React.createElement("circle", { cx: 6.8, cy: 13.2, r: 1.5, fill: 'currentColor' }),
    /*#__PURE__*/React.createElement("circle", { cx: 13.2, cy: 13.2, r: 1.5, fill: 'currentColor' }));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bt-name-modal"
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
  })), /*#__PURE__*/React.createElement("div", {
    className: "bt-name-box bt-cc-box",
    /* v2.3.1307: keyboard reservation — the box gives up its bottom to
       the iOS keyboard so the name field + hint stay visible. */
    style: kbPad ? { paddingBottom: kbPad } : undefined
  }, /*#__PURE__*/React.createElement("section", {
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
    onPointerMove: function (e) { if (_dragRotX.current === null) return; var dx = e.clientX - _dragRotX.current; if (Math.abs(dx) >= 26) { _dragMoved.current = true; rotatePreview(dx > 0 ? 1 : -1); _dragRotX.current = e.clientX; } },
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
  }), /*#__PURE__*/React.createElement("button", {
    /* v2.3.712/722 rotate circles.  v2.3.1251: 44 → 50px (handoff
       48–52px) and dropped to the platform's baseline so they read as
       part of the pedestal, not the stage corners. */
    type: 'button', title: 'Rotate left', onClick: function () { rotatePreview(1); },
    /* v2.3.1254: inset top-light / bottom-shade bevel — the hairline-
       gradient recipe reads as a sliver on a circle, so circles use
       soft inset shadows instead. */
    style: { position: 'absolute', left: 8, bottom: '3%', width: 50, height: 50, borderRadius: '50%', cursor: 'pointer',
      background: 'rgba(17,25,29,.88)', border: '1px solid rgba(238,242,235,.24)', color: 'var(--txt)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.10), inset 0 -2px 3px rgba(0,0,0,.38), 0 2px 6px rgba(3,8,12,.30)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
  }, /*#__PURE__*/React.createElement("img", {
    /* v2.3.1307 (round-7): the owner's painted rotate icons replace the
       ↺/↻ glyphs, which read as Undo/Redo. */
    src: '/ui/welcome/cc/cc-rotate-left.webp?v=' + BUILD_INFO.version, alt: 'Rotate left', draggable: false,
    style: { width: 32, height: 32, objectFit: 'contain', pointerEvents: 'none' }
  })),
  /*#__PURE__*/React.createElement("button", {
    type: 'button', title: 'Rotate right', onClick: function () { rotatePreview(-1); },
    style: { position: 'absolute', right: 8, bottom: '3%', width: 50, height: 50, borderRadius: '50%', cursor: 'pointer',
      background: 'rgba(17,25,29,.88)', border: '1px solid rgba(238,242,235,.24)', color: 'var(--txt)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.10), inset 0 -2px 3px rgba(0,0,0,.38), 0 2px 6px rgba(3,8,12,.30)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
  }, /*#__PURE__*/React.createElement("img", {
    src: '/ui/welcome/cc/cc-rotate-right.webp?v=' + BUILD_INFO.version, alt: 'Rotate right', draggable: false,
    style: { width: 32, height: 32, objectFit: 'contain', pointerEvents: 'none' }
  }))),
  /* v2.3.1276: the always-visible sheet (.bt-cc-menu) is retired — the
     hero screen shows only the control cluster below; the pickers live
     in the slide-up drawer after the box. */
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
    style: { display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
      color: '#B6C1BE', fontFamily: 'Source Sans 3, sans-serif',
      textTransform: 'uppercase', padding: '0 2px 3px', textAlign: 'left' }
  }, "Bro Name"), /*#__PURE__*/React.createElement("input", {
    id: 'bt-cc-name-input',
    value: nameInput,
    onChange: function onChange(e) {
      return setNameInput(e.target.value);
    },
    onKeyDown: function onKeyDown(e) {
      return e.key === 'Enter' && _nameValid && joinTown();
    },
    placeholder: "Name your Bro…",
    maxLength: 20,
    autoFocus: true,
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
  }, _dieSvg(18)), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1307: inline validation line — green check once the name
       clears the local rules, quiet guidance otherwise.  Fixed height
       so the cluster never jumps.  (Names are not unique server-side,
       so length is the honest contract — no availability check.) */
    "aria-live": 'polite',
    style: { height: 15, fontSize: 11, fontFamily: 'Source Sans 3, sans-serif',
      textAlign: 'center', paddingTop: 2,
      color: _nameValid ? '#55B98A' : '#8D9B98' }
  }, _trimmedName.length === 0 ? '' : _nameValid ? '✓ Ready to go' : 'At least 2 characters')), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1276: hero action row — Customize slides the drawer up;
       Random rerolls the whole look (same randomizeWithFlair the
       drawer's die cell uses). */
    className: "bt-cc-actions"
  }, /*#__PURE__*/React.createElement("button", {
    type: 'button', className: "bt-cc-btn",
    "aria-expanded": drawerOpen ? 'true' : 'false',
    onClick: function () { setDrawerOpen(true); }
  }, /*#__PURE__*/React.createElement("img", {
    /* v2.3.1307 (round-7): "Customize Appearance" with the painted
       brush-portrait icon — the shirt icon read clothing-specific. */
    className: "bt-cc-action-icon", src: '/ui/welcome/cc/cc-customize.webp?v=' + BUILD_INFO.version, alt: '', draggable: false }),
  /*#__PURE__*/React.createElement("span", null, "Customize Appearance")),
  /*#__PURE__*/React.createElement("button", {
    type: 'button', className: "bt-cc-btn", onClick: randomizeWithFlair
  }, /*#__PURE__*/React.createElement("img", {
    /* v2.3.1307: "Randomize Look" with the sparkle-character icon — a
       second die next to the name die was the round-7 ambiguity. */
    className: "bt-cc-action-icon", src: '/ui/welcome/cc/cc-random-look.webp?v=' + BUILD_INFO.version, alt: '', draggable: false }),
  /*#__PURE__*/React.createElement("span", null, "Randomize Look"))),
  /*#__PURE__*/React.createElement("button", {
    onClick: function () { if (_nameValid) joinTown(); },
    disabled: !_nameValid,
    /* v2.3.1251: PLAY → ENTER BRO TOWN, the screen's one dominant gold
       action.  v2.3.1307: gated on a valid name (round-7). */
    className: "bt-cc-play",
    "aria-label": 'Enter Bro Town',
    style: {
      width: '100%',
      cursor: _nameValid ? 'pointer' : 'default',
      opacity: _nameValid ? 1 : 0.55
    }
  }, "Enter Bro Town"), /*#__PURE__*/React.createElement("button", {
    /* v2.3.1143: returning-player door.  v2.3.1307 (round-7): promoted
       from footer text to a real secondary action \u2014 full-width 44px
       bordered row with the painted key icon. */
    type: 'button',
    onClick: function () { setShowAccount(true); },
    style: {
      width: '100%',
      background: 'rgba(17,25,29,.55)',
      border: '1px solid rgba(238,242,235,.22)',
      borderRadius: 10,
      color: '#E8E4DA',
      fontFamily: 'Source Sans 3, sans-serif',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      padding: '0 10px',
      minHeight: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: '/ui/welcome/cc/cc-login-key.webp?v=' + BUILD_INFO.version, alt: '', draggable: false,
    style: { width: 20, height: 20, objectFit: 'contain' }
  }), /*#__PURE__*/React.createElement("span", null, "Already have a Bro?"),
  /*#__PURE__*/React.createElement("span", {
    style: { color: '#EAC675', fontWeight: 700 }
  }, "Log in with key")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--txt2)',
      fontFamily: 'Source Sans 3, sans-serif',
      letterSpacing: '.06em',
      textAlign: 'center'
    }
    /* v2.3.1307: the commit sha leaves the splash (round-7) \u2014 support
       reads it from the console BUILD_INFO when needed. */
  }, "v" + BUILD_INFO.version)), drawerOpen && /*#__PURE__*/React.createElement("div", {
    /* v2.3.1276: light tap-to-close scrim under the drawer — the world
       stays visible; tapping it is the "put the drawer away" gesture. */
    className: "bt-cc-drawer-scrim",
    onClick: function () { setDrawerOpen(false); }
  }), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1276: the Customize DRAWER — always mounted (the strip refs
       and scroll positions persist), slid off-screen + pointer-inert
       when closed (transform, not display: layout stays measurable for
       _measureMore).  Absolute overlay: nothing in here can move the
       stage. */
    className: "bt-cc-drawer" + (drawerOpen ? " bt-cc-drawer--open" : ""),
    ref: _drawerRef,
    "aria-hidden": drawerOpen ? undefined : true
  }, /*#__PURE__*/React.createElement("nav", {
    className: "bt-cc-tabs", role: 'tablist', "aria-label": 'Appearance category'
  }, _GROUPS.map(function (g) {
    var on = g.key === _activeGroupKey;
    /* Tapping a group opens its most-recently-used subtype (or the
       first).  Tapping the active group is a no-op — the strip always
       shows SOMETHING, so the layout never reflows under the CTA. */
    return /*#__PURE__*/React.createElement("button", {
      key: g.key, type: 'button', role: 'tab', "aria-selected": on ? 'true' : 'false',
      className: 'bt-cc-tab' + (on ? ' bt-cc-tab--on' : ''),
      onClick: function () { _openType(g.key, typeMemo[g.key] || g.types[0]); }
    }, /*#__PURE__*/React.createElement("img", {
      /* v2.3.1308 (round-7): the generic white category art gives way to
         the owner's painted set — same style as the in-game nav icons. */
      className: "bt-cc-tab-icon", src: '/ui/welcome/cc/cc-' + g.key + '.webp?v=' + BUILD_INFO.version, alt: '', draggable: false }),
    /*#__PURE__*/React.createElement("span", { className: "bt-cc-tab-label" }, g.label));
  })
  /* v2.3.1308 (round-7): the v2.3.1272 fifth Random die cell is retired
     — randomization is an ACTION, not a body region, and the hero
     screen's "Randomize Look" already owns it.  Four equal category
     tabs remain. */
  ), /*#__PURE__*/React.createElement("div", {
    /* Secondary tabs — visible only for Head (Hair/Hats) and Face
       (Skin/Beard).  v2.3.1252: single-type groups render the row as an
       invisible GHOST instead of omitting it — the sheet is the flex
       stage's height budget, so any row that comes and goes with the
       category made the character preview grow/shrink on every tab
       change (owner: keep the character ONE size, even if smaller). */
    className: "bt-cc-subtabs" + (_activeGroup.types.length > 1 ? "" : " bt-cc-ghost"),
    "aria-hidden": _activeGroup.types.length > 1 ? undefined : true
  }, _activeGroup.types.length > 1
    ? _activeGroup.types.map(function (t) {
        var on = t === _activeType;
        return /*#__PURE__*/React.createElement("button", {
          key: t, type: 'button', "aria-pressed": on ? 'true' : 'false',
          className: 'bt-cc-subtab' + (on ? ' bt-cc-subtab--on' : ''),
          onClick: function () { _openType(_activeGroup.key, t); }
        }, _typeDefs[t].label);
      })
    : /*#__PURE__*/React.createElement("button", {
        type: 'button', className: "bt-cc-subtab", tabIndex: -1, disabled: true
      }, " ")), /*#__PURE__*/React.createElement("div", { className: "bt-cc-scroll" },
  /*#__PURE__*/React.createElement("div", {
    /* Option strip — exactly five complete tiles at rest; extra options
       scroll horizontally (sizing in .bt-cc-strip, game.css).  The whole
       catalog is always rendered: the v2.3.835 collapse-on-select
       machinery is retired with the pager. */
    className: "bt-cc-strip", ref: _stripRef, onScroll: _measureMore, role: 'listbox', "aria-label": _def.label + ' options'
  }, _items), /*#__PURE__*/React.createElement("span", {
    /* v2.3.1254: fade + chevron while more tiles wait off-screen. */
    className: "bt-cc-more" + (scrollMore.items ? " bt-cc-more--on" : ""), "aria-hidden": true
  }, "›")), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1252: like the subtabs, the color block always occupies its
       row — an invisible ghost (with one placeholder tile so the row
       keeps its swatch height) when the type/pick has no colors.  This
       plus the ghost subtabs makes the sheet height IDENTICAL across
       every category and pick, so the stage — and the character — never
       change size. */
    className: "bt-cc-colors" + (_colors ? "" : " bt-cc-ghost"),
    "aria-hidden": _colors ? undefined : true,
    style: { position: 'relative' }
  }, /* v2.3.1272: the — COLOR — header is retired (space).
        v2.3.1308 tried a tiny absolute contextual label here; v2.3.1310
        removes it (owner: redundant, overlapped the swatches, barely
        readable).  The swatch row reads as colors on its own. */
  /*#__PURE__*/React.createElement("div", { className: "bt-cc-scroll" },
  /*#__PURE__*/React.createElement("div", {
    className: "bt-cc-colors-row", ref: _colorRowRef, onScroll: _measureMore, role: _colors ? 'radiogroup' : undefined, "aria-label": _colors ? _def.label + ' colors' : undefined
  }, _colors || /*#__PURE__*/React.createElement("div", null)), /*#__PURE__*/React.createElement("span", {
    className: "bt-cc-more" + (scrollMore.colors ? " bt-cc-more--on" : ""), "aria-hidden": true
  }, "›"))), /*#__PURE__*/React.createElement("button", {
    /* v2.3.1276: closes the drawer; the hero screen (with ENTER) is
       right behind it. */
    type: 'button', className: "bt-cc-btn bt-cc-done",
    onClick: function () { setDrawerOpen(false); }
  }, "Done")), showAccount && /*#__PURE__*/React.createElement(AccountModal, {
    onClose: function () { setShowAccount(false); }
  }));
}
