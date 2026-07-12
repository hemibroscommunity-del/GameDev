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
import { HEADWEAR_CATALOG, setHeadwear } from '@/rendering/traits/headwearCatalog.js';
import { SHIRT_CATALOG, setShirt } from '@/rendering/traits/shirtCatalog.js';
import { SHIRT_COLOR_CATALOG, setShirtColor } from '@/rendering/traits/shirtColorCatalog.js';

/* === NameModal — the character-creator / name-entry splash screen === */
/* v2.3.888: extracted verbatim from the `if (showNameModal) { ... }`
   early-return render path in BroTown.jsx (the vertical guided
   character creator: banner, showcase, name row, customization drawer,
   Randomize, PLAY). Render-only — no effects or game-loop logic moved.
   The `if (showNameModal)` gate stays in BroTown; the whole render body
   (local tile/category helpers + the returned JSX) becomes this
   component. Trait catalogs and their sprite setters are imported from
   @/rendering/* (where they live, same modules BroTown imports);
   BUILD_INFO from BuildBadge. 41 props carry the React selection state,
   its setters, the preview refs, and the BroTown handler closures
   (joinTown, randomizeWithFlair, rollRandomName, rotatePreview,
   markObjPicked, _swatchTile, _thumbTile, _dragRotX). LONG_HAIR_COLORS
   is a frozen literal redeclared locally. */
/* v2.3.1232: Lantern Slate touch-up — world-circle rotate buttons
   (rgba(17,25,29,.88) + strong border, 44pt), brass caret on the name
   input, Randomize moved off the old navy onto the raised secondary
   surface.  The parchment scroll, painted PLAY art and all bt-cc-*
   class-driven chrome are owner art and stay; inline overrides only.
   Zero logic changes — tab structure and every handler byte-identical. */
/* v2.3.1235: Lantern Slate correction pass (owner-approved) — the ornate
   chrome around the owner art is retired: parchment name scroll → dark
   recessed well, purple gem frame → plain sheet card (both in game.css),
   painted PLAY art → the standard primary gold button, Randomize → plain
   secondary, dice emoji → text "Roll", quill img removed.  The sky/stage/
   logo art is untouched — the logo is the screen's only ornate element.
   Handlers, validation and the join call are byte-identical. */
export function NameModal(props) {
  var _dragRotX = props._dragRotX,
    _swatchTile = props._swatchTile,
    _thumbTile = props._thumbTile,
    activeCat = props.activeCat,
    beardColorSel = props.beardColorSel,
    colOpen = props.colOpen,
    facialHairSel = props.facialHairSel,
    hairColorSel = props.hairColorSel,
    hairSel = props.hairSel,
    hatColorSel = props.hatColorSel,
    headwearSel = props.headwearSel,
    joinTown = props.joinTown,
    markObjPicked = props.markObjPicked,
    nameInput = props.nameInput,
    objOpen = props.objOpen,
    objPicked = props.objPicked,
    pantsSel = props.pantsSel,
    previewCanvasRef = props.previewCanvasRef,
    previewDir = props.previewDir,
    randomizeWithFlair = props.randomizeWithFlair,
    rollRandomName = props.rollRandomName,
    rotatePreview = props.rotatePreview,
    setActiveCat = props.setActiveCat,
    setBeardColorSel = props.setBeardColorSel,
    setColOpen = props.setColOpen,
    setFacialHairSel = props.setFacialHairSel,
    setHairColorSel = props.setHairColorSel,
    setHairSel = props.setHairSel,
    setHatColorSel = props.setHatColorSel,
    setHeadwearSel = props.setHeadwearSel,
    setNameInput = props.setNameInput,
    setObjOpen = props.setObjOpen,
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
      /* v2.3.797: character creator refactored to a VERTICAL GUIDED FLOW
       (owner's spec, second attempt — the v2.3.799-792 run was reverted
       at v2.3.796 for viewport overflow): banner, CTA, landscape
       character SHOWCASE (the character is the star of the screen), name
       row, text-only category tabs fused to ONE customization drawer,
       Randomize, PLAY.  The screen is LOCKED — nothing page-scrolls; the
       drawer absorbs the leftover height and its columns scroll
       internally (the old rail's job, moved down a level), so PLAY is
       always on screen.  Layout verified against to-scale 390x844 and
       375x667 renders before shipping.  Future categories just append a
       tab + a _ccCats entry. */
    /* v2.3.835: collapse-on-select pickers.  _objTiles/_colTiles render the
       full catalog when the grid is open, or just the current pick (with
       its checkmark) when collapsed; the lone collapsed tile re-expands on
       tap.  Picking a real object collapses the object grid and opens the
       colors; picking a color collapses the color grid. */
    var _setOpen = function (setter, k, v) { setter(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); };
    var _objTiles = function (k, catalog, kind, spriteCat, sel, setSel) {
      var real = sel && sel !== 'none';
      var collapsed = real && objOpen[k] === false;
      var list = collapsed ? catalog.filter(function (o) { return o.id === sel; }) : catalog;
      if (collapsed && !list.length) { collapsed = false; list = catalog; }
      return list.map(function (o) {
        var onSet = function (id) {
          if (collapsed) { _setOpen(setObjOpen, k, true); return; }
          setSel(id); markObjPicked(k);
          /* v2.3.1015: only recolorable categories (those with a spriteCat /
             colors step) collapse the item grid and advance to colors; the
             color-only swatch grids (skin/pants/shoes) stay open so the whole
             row of swatches remains pickable. */
          if (id !== 'none' && spriteCat) { _setOpen(setObjOpen, k, false); _setOpen(setColOpen, k, true); }
          else { _setOpen(setObjOpen, k, true); }
        };
        return kind === 'thumb' ? _thumbTile(spriteCat, o, sel, onSet, 44) : _swatchTile(o, sel, onSet, 40);
      });
    };
    var _colTiles = function (k, colCat, sel, setSel, spriteCat, objId) {
      var collapsed = colOpen[k] === false;
      var list = collapsed ? colCat.filter(function (o) { return o.id === sel; }) : colCat;
      if (collapsed && !list.length) { collapsed = false; list = colCat; }
      return list.map(function (o) {
        var onSet = function (id) {
          if (collapsed) { _setOpen(setColOpen, k, true); return; }
          setSel(id); _setOpen(setColOpen, k, false);
        };
        return _swatchTile(o, sel, onSet, undefined, spriteCat, objId);
      });
    };
    var _hairColCat = hairSel === 'long' ? HAIR_COLOR_CATALOG.filter(function (c) { return LONG_HAIR_COLORS.indexOf(c.id) >= 0; }) : HAIR_COLOR_CATALOG;
    /* Body-color categories (skin/pants/shoes): the swatches ARE the object
       grid (their catalog 'default' entries carry the sprite's native
       colors), so they have no separate Colors column. */
    /* v2.3.1036: the picker is a horizontal SWIPE strip (see game.css
       .bt-cc-drawer-grid) AND keeps a page indicator: the ‹ 1/3 › pager is
       driven by the strip's scroll position — arrows scroll by one viewport,
       the count reflects where you are.  Native scroll keeps tap-vs-swipe clean
       (a swipe never fires a tile's click). */
    var _itemStrip = React.useRef(null);
    var _colorStrip = React.useRef(null);
    var _ipS = React.useState({ p: 1, n: 1 }), itemPg = _ipS[0], setItemPg = _ipS[1];
    var _cpS = React.useState({ p: 1, n: 1 }), colorPg = _cpS[0], setColorPg = _cpS[1];
    /* v2.3.1143: Login Key overlay toggle (self-contained -- no BroTown prop). */
    var _acS = React.useState(false), showAccount = _acS[0], setShowAccount = _acS[1];
    /* Item-ALIGNED page metrics: pages map to whole tiles (perView = how many
       tiles fit a viewport) so the last page always has real tiles -- no blank
       trailing page from a few px of overflow. */
    var _metrics = function (el) {
      if (!el || !el.children || el.children.length === 0) return { perView: 1, step: 1, p: 1, n: 1 };
      var cw = Math.max(1, el.clientWidth);
      var k0 = el.children[0];
      var pitch = el.children.length >= 2 ? Math.max(1, el.children[1].offsetLeft - k0.offsetLeft) : Math.max(1, k0.offsetWidth + 6);
      var perView = Math.max(1, Math.floor((cw + 6) / pitch));
      var step = perView * pitch;
      var n = Math.max(1, Math.ceil(el.children.length / perView));
      /* The last page's reachable scrollLeft (scrollWidth-clientWidth) is short
         of (n-1)*step when the final page is partial, so floor(scrollLeft/step)
         never reaches n -- snap to the last page once scrolled to the end. */
      var maxScroll = Math.max(0, el.scrollWidth - cw);
      var p = (el.scrollLeft >= maxScroll - 2) ? n : Math.min(n, Math.floor(el.scrollLeft / step + 0.5) + 1);
      return { perView: perView, step: step, p: p, n: n };
    };
    var _pageOf = function (el) { var m = _metrics(el); return { p: m.p, n: m.n }; };
    var _onStripScroll = function (setFn) { return function (e) { setFn(_pageOf(e.currentTarget)); }; };
    /* Re-measure (and reset to page 1) when the category or the item/color step
       changes — the strip's content width changes with it. */
    React.useEffect(function () {
      var el = _itemStrip.current; if (el) { el.scrollLeft = 0; setItemPg(_pageOf(el)); }
      var ce = _colorStrip.current; if (ce) { ce.scrollLeft = 0; setColorPg(_pageOf(ce)); }
    }, [activeCat, objOpen]);
    /* Scroll-driven pager: same .bt-cc-pager chrome, arrows scroll the strip by
       one page-worth of tiles; the (empty) placeholder keeps the drawer height
       when there's only one page. */
    var _mkScrollPager = function (ref, pg) {
      if (pg.n <= 1) return /*#__PURE__*/React.createElement("div", { className: "bt-cc-pager bt-cc-pager--empty", "aria-hidden": true });
      var _go = function (dir) { return function () {
        var el = ref.current; if (!el) return;
        var m = _metrics(el);
        var target = Math.min(m.n - 1, Math.max(0, (m.p - 1) + dir));
        var maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
        el.scrollTo({ left: Math.min(target * m.step, maxLeft), behavior: 'smooth' });
      }; };
      return /*#__PURE__*/React.createElement("div", { className: "bt-cc-pager" },
        /*#__PURE__*/React.createElement("button", { type: 'button', className: "bt-cc-pager-arrow", disabled: pg.p <= 1, "aria-label": 'Previous', onClick: _go(-1) }, "‹"),
        /*#__PURE__*/React.createElement("span", { className: "bt-cc-pager-count" }, pg.p + "/" + pg.n),
        /*#__PURE__*/React.createElement("button", { type: 'button', className: "bt-cc-pager-arrow", disabled: pg.p >= pg.n, "aria-label": 'More', onClick: _go(1) }, "›"));
    };
    var _catDefs = {
      hat: { label: 'Hat', build: function () { return {
        items: _objTiles('hat', HEADWEAR_CATALOG, 'thumb', 'headwear', headwearSel, function (id) { setHeadwear(id); setHeadwearSel(id); }),
        colors: (objPicked['hat'] && headwearSel !== 'none') ? _colTiles('hat', HAT_COLOR_CATALOG, hatColorSel, function (id) { setHatColor(id); setHatColorSel(id); }, 'headwear', headwearSel) : null }; } },
      hair: { label: 'Hair', build: function () { return {
        items: _objTiles('hair', HAIR_CATALOG, 'thumb', 'hair', hairSel, function (id) { setHair(id); setHairSel(id); }),
        colors: (objPicked['hair'] && hairSel !== 'none') ? _colTiles('hair', _hairColCat, hairColorSel, function (id) { setHairColor(id); setHairColorSel(id); }, 'hair', hairSel) : null }; } },
      beard: { label: 'Beard', build: function () { return {
        items: _objTiles('beard', FACIALHAIR_CATALOG, 'thumb', 'facialhair', facialHairSel, function (id) { setFacialHair(id); setFacialHairSel(id); }),
        colors: (objPicked['beard'] && facialHairSel !== 'none') ? _colTiles('beard', FACIALHAIR_COLOR_CATALOG, beardColorSel, function (id) { setFacialHairColor(id); setBeardColorSel(id); }, 'facialhair', facialHairSel) : null }; } },
      skin: { label: 'Skin', build: function () { return {
        items: _objTiles('skin', SKIN_CATALOG, 'swatch', null, skinSel, function (id) { setSkin(id); setSkinSel(id); }), colors: null }; } },
      shirt: { label: 'Shirt', build: function () { return {
        items: _objTiles('shirt', SHIRT_CATALOG, 'thumb', 'shirt', shirtSel, function (id) { setShirt(id); setShirtSel(id); }),
        colors: (objPicked['shirt'] && shirtSel !== 'none') ? _colTiles('shirt', SHIRT_COLOR_CATALOG, shirtColorSel, function (id) { setShirtColor(id); setShirtColorSel(id); }, 'shirt', shirtSel) : null }; } },
      pants: { label: 'Pants', build: function () { return {
        items: _objTiles('pants', PANTS_CATALOG, 'swatch', null, pantsSel, function (id) { setPants(id); setPantsSel(id); }), colors: null }; } },
      shoes: { label: 'Shoes', build: function () { return {
        items: _objTiles('shoes', SHOES_CATALOG, 'swatch', null, shoesSel, function (id) { setShoes(id); setShoesSel(id); }), colors: null }; } }
    };
    var _catOrder = ['hat', 'hair', 'beard', 'skin', 'shirt', 'pants', 'shoes'];
    var _ccCats = _catOrder.map(function (k) { return { key: k, label: _catDefs[k].label, icon: '/ui/welcome/cat/' + k + '.webp?v=' + BUILD_INFO.version }; });
    var _activeKey = _catDefs[activeCat] ? activeCat : 'hat';
    var _built = _catDefs[_activeKey].build();
    var _ccActive = { key: _activeKey, label: _catDefs[_activeKey].label, items: _built.items, colors: _built.colors };
    /* v2.3.1036: all items live in one horizontal swipe strip; the scroll-driven
       pager (above) supplies the page count + arrows. */
    var _allItems = _ccActive.items || [];
    /* The colors step is its own swipe strip of swatches, shown ONLY after an
       item is picked (objOpen[key] === false).  Color-only categories
       (skin/pants/shoes) have no colors step. */
    var _allColors = _ccActive.colors || [];
    var _showColors = _allColors.length > 0 && objOpen[_activeKey] === false;
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
      /* v2.3.801: tavern-banner art retired (owner) — back to the painted
         gold BRO TOWN lettering (logo-brotown.webp, the main piece of the
         pre-v2.3.790 lockup) in the banner's slot at the top of the
         screen.  Width-driven sizing in .bt-cc-logo.
         v2.3.806: owner's gem sword flanks the lettering (the wrap is the
         position context; the sword hangs off its left edge, tilted). */
      className: "bt-cc-logo-wrap"
    }, /*#__PURE__*/React.createElement("img", {
      src: '/ui/welcome/sword.webp', alt: '', className: "bt-cc-logo-sword"
    }), /*#__PURE__*/React.createElement("div", {
      /* v2.3.827: CSS specular shine — a light band swept across the
         sword, masked to its shape (sits below the letters like the sword
         itself, so the glint shows on the grip/blade/gem-in-the-O). */
      className: "bt-cc-sword-shine", "aria-hidden": true
    }), /*#__PURE__*/React.createElement("img", {
      src: '/ui/welcome/logo-brotown.webp', alt: 'BRO TOWN', className: "bt-cc-logo"
    }), /*#__PURE__*/React.createElement("div", {
      /* v2.3.827: matching shine over the gold lettering (masked to the
         logo), staggered so the two don't glint in unison. */
      className: "bt-cc-logo-shine", "aria-hidden": true
    })), /*#__PURE__*/React.createElement("div", {
      className: "bt-name-box bt-cc-box"
    }, /* v2.3.1034: "CREATE YOUR CHARACTER" caption removed (owner: self-
         explanatory + distracting). */
    /*#__PURE__*/React.createElement("section", {
      /* Character SHOWCASE — full-card-width LANDSCAPE stage (spec §3:
         the character is the star; the wide panel leaves negative space
         for future equipped-item previews / ambient effects beside the
         figure).  Replaces the v2.3.724 3:4 portrait window.
         v2.3.720: DARK window interior per the owner's mockup.  Known
         tradeoff, owner-approved: some trait sprites carry white
         extraction residue that a dark backdrop can expose — the floor
         glow masks the worst of it.
         v2.3.743: owner's storm-light void painting (an IMAGE, not video
         — the v2.3.736 cyan-tint lesson: device video compositing isn't
         color-exact). */
      /* Height lives in .bt-cc-stage (game.css) — v2.3.798: flex-driven,
         not aspect-ratio: the stage and the menu share the real viewport
         with guaranteed minimums.
         v2.3.801: framed dark box (border, void painting, inset shadow,
         star layers) removed — the character floats directly on the
         painted page backdrop (owner).  The element keeps its size and
         position so the pedestal/figure/rotate geometry is untouched. */
      className: "bt-cc-stage",
      style: { position: 'relative', width: '100%', boxSizing: 'border-box' }
    }, /*#__PURE__*/React.createElement("div", {
      /* v2.3.799: pedestal sized by stage HEIGHT, bottom-center anchored —
         it was %-of-WIDTH while the figure scaled with height, so the
         flexing stage broke the boots/platform contact differently on
         every device (owner screenshot: floating player).  Both now
         scale off the same axis, so the contact point is proportional
         everywhere.
         v2.3.802: promoted to a GROUP (aspect-ratio supplies the width
         from the 34% height) so the braziers can stand ON the disc and
         track it at every stage size (owner: goblets on the platform).
         DOM order keeps them behind the character canvas. */
      style: { position: 'absolute', bottom: '3%', left: '50%', height: '34%', aspectRatio: '480 / 165', transform: 'translateX(-50%)', pointerEvents: 'none' }
    }, /*#__PURE__*/React.createElement("img", {
      src: '/ui/welcome/platform.webp', alt: '',
      /* v2.3.825: drop-shadow grounds the disc against the now-animated
         vista (owner saw it wash out over the bright video). */
      style: { position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.6))' }
    }), /*#__PURE__*/React.createElement("div", { className: "bt-cc-brazier bt-cc-brazier--left" }),
    /*#__PURE__*/React.createElement("div", { className: "bt-cc-brazier bt-cc-brazier--right" })),
    /*#__PURE__*/React.createElement("canvas", {
      ref: previewCanvasRef,
      title: 'Live preview',
      /* v2.3.711: drag-to-rotate.  Pointer capture keeps the gesture alive
         when the finger drifts off the canvas mid-swipe. */
      onPointerDown: function (e) { _dragRotX.current = e.clientX; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} },
      /* v2.3.723: drag mapping reverted to dx>0 -> +1 (owner: only the
         BUTTONS were backwards; the drag felt right as originally shipped). */
      onPointerMove: function (e) { if (_dragRotX.current === null) return; var dx = e.clientX - _dragRotX.current; if (Math.abs(dx) >= 26) { rotatePreview(dx > 0 ? 1 : -1); _dragRotX.current = e.clientX; } },
      onPointerUp: function () { _dragRotX.current = null; },
      onPointerCancel: function () { _dragRotX.current = null; },
      /* No width/height attributes: drawCharacterPortrait force-sets the
         bitmap to 256x256 on every draw, so attributes here would be dead
         weight.  The bitmap upscales via CSS — object-fit keeps it square
         (never stretched) whatever shape the frame takes, and pixelated
         keeps the pixel-art upscale sharp instead of blurry. */
      style: {
        /* v2.3.799: SQUARE canvas sized by stage HEIGHT and bottom-center
           anchored (was width:100%/height:100% + contain + scale, whose
           figure position depended on the stage's flex-variable shape).
           88% height with a 1:1 aspect keeps the square bitmap exactly
           filling the element — no object-fit cropping at all — and the
           bottom offset plants the boots (≈89% down the bitmap, per the
           v2.3.725 ~83%-of-window tuning) on the pedestal's top face. */
        position: 'absolute',
        left: '50%',
        bottom: '14.5%',
        height: '88%',
        aspectRatio: '1 / 1',
        objectFit: 'contain',
        imageRendering: 'pixelated',
        borderRadius: 8,
        display: 'block',
        touchAction: 'none',
        cursor: 'grab',
        /* v2.3.744: per-angle drop — the SW and E source frames sit higher
           in their 256 box than the others, so those facings (and their
           mirrors) floated above the pedestal (owner: SW/SE down ~20px,
           E/W down ~10px). */
        transform: 'translateX(-50%) translateY(' + ({ southwest: 15, southeast: 15, east: 10, west: 10, northeast: 5, northwest: 5 }[previewDir] || 0) + 'px)', /* v2.3.745: SW/SE 20->15, NE/NW 0->5 per owner */
        /* v2.3.717: transparent — trait sprites carry white extraction
           residue that any dark/colored backdrop would expose.  No
           z-index: DOM order already stacks pillars < canvas < rotate
           buttons, and a z-index here would put the canvas over the
           buttons and eat their taps. */
        background: 'transparent'
      }
    }), /*#__PURE__*/React.createElement("button", {
      /* v2.3.712: circular spin arrows replaced the triangle glyphs -- the
         triangles read like the accordion chevrons in the rail (owner
         feedback), and rotation is a different verb than expand/collapse.
         v2.3.722: signs INVERTED (owner: "they're backwards") -- stepping
         +1 walks the dir list clockwise, but on screen that reads as the
         character turning the other way. */
      type: 'button', title: 'Rotate left', onClick: function () { rotatePreview(1); },
      /* v2.3.1232: spec §10 world circle — rgba(17,25,29,.88) + strong border, 44pt */
      style: { position: 'absolute', left: 6, bottom: 6, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
        background: 'rgba(17,25,29,.88)', border: '1px solid rgba(238,242,235,.24)', color: 'var(--txt)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
    }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 21, fontWeight: 700, lineHeight: 1, transform: 'translateY(-1px)' } }, "↺")),
    /*#__PURE__*/React.createElement("button", {
      type: 'button', title: 'Rotate right', onClick: function () { rotatePreview(-1); },
      /* v2.3.1232: spec §10 world circle — rgba(17,25,29,.88) + strong border, 44pt */
      style: { position: 'absolute', right: 6, bottom: 6, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
        background: 'rgba(17,25,29,.88)', border: '1px solid rgba(238,242,235,.24)', color: 'var(--txt)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
    }, /*#__PURE__*/React.createElement("span", { style: { fontSize: 21, fontWeight: 700, lineHeight: 1, transform: 'translateY(-1px)' } }, "↻"))), /*#__PURE__*/React.createElement("div", {
      /* Name row — DIRECTLY beneath the showcase (v2.3.800: negative
         margin tucks the scroll against the stage frame per owner; the
         card gap alone read as loose).  The dice rerolls the NAME only;
         appearance Randomize lives under the drawer. */
      style: { position: 'relative', width: '100%', marginTop: -2 }
    }, /*#__PURE__*/React.createElement("input", {
      value: nameInput,
      onChange: function onChange(e) {
        return setNameInput(e.target.value);
      },
      onKeyDown: function onKeyDown(e) {
        return e.key === 'Enter' && joinTown();
      },
      placeholder: "Name…",
      maxLength: 20,
      autoFocus: true,
      /* v2.3.1235: parchment retired — .bt-cc-name is now the standard
         recessed well (recipe + ::placeholder in game.css); the quill
         "sign here" img went with the scroll art. */
      className: "bt-cc-name",
      style: {
        width: '100%',
        /* v2.3.1235: symmetric side padding clears the Roll button on the
           right while keeping the centered text centered (no scroll caps
           to dodge anymore). */
        padding: '0 56px',
        /* v2.3.710: 16px floor — iOS Safari auto-zooms inputs with a smaller
           font on focus, leaving visualViewport.scale > 1, which trips the
           joinTown pinch-zoom gate. */
        fontSize: 16,
        fontWeight: 700,
        outline: 'none',
        textAlign: 'center',
        boxSizing: 'border-box',
        /* v2.3.1235: brass-highlight caret on the dark well. */
        caretColor: '#EAC675',
        minHeight: 44
      }
    }), /*#__PURE__*/React.createElement("button", {
      type: 'button', title: 'Random name', onClick: rollRandomName,
      /* v2.3.1235: dice emoji → plain-text "Roll" secondary button (hard
         rule: no platform emoji; no die icon exists in /icons/ui yet).
         44pt-wide target now fits — the scroll cap that clipped long
         names (v2.3.722) is gone; the input's 56px side padding clears it.
         top:50% (the old -3px offset compensated the parchment tail). */
      /* v2.3.1235: Checkpoint B — Roll bumped to the 44pt touch floor. */
      style: { position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', minWidth: 44, minHeight: 44, borderRadius: 8, cursor: 'pointer',
        background: '#293B41', border: '1px solid rgba(229,237,233,0.20)', color: '#F4F0E7',
        fontFamily: 'Source Sans 3, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '.02em', padding: '0 8px', lineHeight: 1 }
    }, "Roll")), /*#__PURE__*/React.createElement("div", {
      /* Tabs + drawer share one wrapper so the card's gap can't split
         them — they must read as a single component (spec §5).  The
         wrapper is also the card's ONE flexing child: the drawer absorbs
         the leftover viewport height. */
      className: "bt-cc-menu"
    }, /*#__PURE__*/React.createElement("span", {
      /* v2.3.1013: gold section header above the tabs (mockup). */
      className: "bt-cc-cust-head"
    }, "Customize Your Bro"), /*#__PURE__*/React.createElement("nav", {
      className: "bt-cc-tabs"
    }, _ccCats.map(function (c) {
      var on = c.key === activeCat;
      /* Tab semantics: tapping activates it (and only it); tapping the
         active tab is a no-op rather than a close — the drawer always
         shows SOMETHING, so the layout never reflows under PLAY. */
      return /*#__PURE__*/React.createElement("button", {
        key: c.key, type: 'button',
        className: 'bt-cc-tab' + (on ? ' bt-cc-tab--on' : ''),
        onClick: function () { setActiveCat(c.key); }
      }, /*#__PURE__*/React.createElement("img", { className: "bt-cc-tab-icon", src: c.icon, alt: '', draggable: false }),
         /*#__PURE__*/React.createElement("span", { className: "bt-cc-tab-label" }, c.label));
    })), /*#__PURE__*/React.createElement("section", {
      /* Customization drawer — ONE panel, ONE step at a time (owner,
         v2.3.1015): there isn't room to show the item grid and the color
         swatches together, so the drawer shows the item row until an item is
         picked, then swaps to the color row (with a ‹ Change … button back to
         the items).  Color-only categories (skin/pants/shoes) never reach the
         colors step — their swatch row is the whole picker. */
      className: "bt-cc-drawer"
    }, _showColors
      ? /*#__PURE__*/React.createElement("div", { className: "bt-cc-drawer-items bt-cc-step-colors" },
          /*#__PURE__*/React.createElement("button", {
            type: 'button', className: "bt-cc-back",
            onClick: function () { _setOpen(setObjOpen, _activeKey, true); }
          }, "‹ Change " + _ccActive.label),
          /*#__PURE__*/React.createElement("span", { className: "bt-cc-drawer-head" }, "— COLORS —"),
          /*#__PURE__*/React.createElement("div", { className: "bt-cc-drawer-grid bt-cc-grid-colors", ref: _colorStrip, onScroll: _onStripScroll(setColorPg) }, _allColors),
          _mkScrollPager(_colorStrip, colorPg))
      : /*#__PURE__*/React.createElement("div", { className: "bt-cc-drawer-items" },
          /* v2.3.1014: the per-category items header ("— HAT —") is dropped —
             the active tab already names the category. */
          /*#__PURE__*/React.createElement("div", { className: "bt-cc-drawer-grid", ref: _itemStrip, onScroll: _onStripScroll(setItemPg) }, _allItems),
          _mkScrollPager(_itemStrip, itemPg)))), /*#__PURE__*/React.createElement("button", {
      /* Appearance RANDOMIZE — full-width gold row directly under the
         menu it acts on (owner placement, v2.3.794); the name dice above
         rerolls just the name. */
      type: 'button', onClick: randomizeWithFlair, className: "bt-cc-rand",
      /* v2.3.800: slimmed with the rest of the vertical rhythm. */
      /* v2.3.1235: ornate treatment dropped — Randomize is the standard
         SECONDARY button (raised fill, strong hairline via .bt-cc-rand,
         Source Sans 3); the one gold element on this screen is PLAY. */
      /* v2.3.1235: Checkpoint B — the fate-orb medallion is removed too:
         no dice/reroll asset exists, so Randomize is text-only. */
      style: { width: '100%', padding: '8px', minHeight: 44, cursor: 'pointer', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#293B41', color: '#F4F0E7',
        fontSize: 14, fontWeight: 700, letterSpacing: '.02em', fontFamily: "'Source Sans 3',sans-serif" }
    }, /*#__PURE__*/React.createElement("span", null, "Randomize")), /*#__PURE__*/React.createElement("button", {
      onClick: joinTown,
      /* v2.3.725→v2.3.1235: the painted PLAY art is retired; the button is
         the screen's ONE primary gold button (recipe + :active press live
         in .bt-cc-play, game.css) with a real text label — no invisible-
         button mode if an asset fails (v2.3.740 incident).
         v2.3.797: flow endpoint — the final action once the character is
         ready (spec §8); the locked layout keeps it on screen. */
      className: "bt-cc-play",
      "aria-label": 'Play',
      style: {
        marginTop: 6,
        width: '100%',
        cursor: 'pointer'
      }
    }, "Play"), /*#__PURE__*/React.createElement("button", {
      /* v2.3.1143: returning-player door.  Text link under PLAY -- the
         quiet counterpart to the big CTA, for the player who already
         has a character and just needs to enter their Login Key. */
      type: 'button',
      onClick: function () { setShowAccount(true); },
      /* v2.3.1235: Checkpoint B — footer link at 12px secondary (#B6C1BE)
         with tightened copy; same setShowAccount handler. */
      style: {
        marginTop: 4,
        background: 'none',
        border: 'none',
        color: '#B6C1BE',
        fontFamily: 'Source Sans 3, sans-serif',
        fontSize: 12,
        textDecoration: 'underline',
        cursor: 'pointer',
        padding: '6px 0',
        /* v2.3.1232: quiet-button 44pt target */
        minHeight: 44
      }
    }, "Have a character? Enter your Login Key"), /*#__PURE__*/React.createElement("div", {
      /* v2.3.797: build tag moved out of the header to the scroll's tail
         end (header px now belongs to the drawer).
         v2.3.1235: 9px → 11px (type floor: no text under 11px). */
      style: {
        fontSize: 11,
        color: 'var(--txt2)',
        fontFamily: 'Source Sans 3, sans-serif',
        letterSpacing: '.06em',
        textAlign: 'center'
      }
    }, "v" + BUILD_INFO.version + " · " + BUILD_INFO.sha)), showAccount && /*#__PURE__*/React.createElement(AccountModal, {
      onClose: function () { setShowAccount(false); }
    }));
}
