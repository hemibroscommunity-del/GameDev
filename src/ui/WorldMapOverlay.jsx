/* ═══ v2.3.2966: THE WORLD MAP — the whole Wheel, labelled ═══
 *
 * Owner, 2026-10-01: "Maybe tapping it brings up an overlay of a labelled
 * world map.  It would probably help to have areas labelled so players can
 * start memorizing the territory."
 *
 * Only in the Wheel (`?trial=wheel`), where the minimap is the Wheel's own
 * (src/rendering/systems/wheelMinimap.js).  Two parts:
 *
 *   - a see-through button laid exactly over that minimap (its place is
 *     published as window.__btWheelMini), so tapping the box opens the map --
 *     a DOM button, as the minimap is drawn in the game's WebGL canvas, which
 *     takes no taps;
 *   - the map: the whole Wheel from the worker's overview (its own ground
 *     colours), the roads, the river and the railway as clean lines, and
 *     labels that grow with the zoom -- the eight lands and their levels
 *     first, then each land's four stages, the gates and where they lead,
 *     then the camps and the passes with their levels, the landmarks, and
 *     the roads' names -- every label kept clear of the ones before it, so
 *     it never turns to mush.  You are an arrow the way you face, in a
 *     pulsing ring.  Drag to look round, pinch or + / - to zoom, the target
 *     button to come back to you.
 *
 * Everything it draws comes from public/tools/world/core/wheelmap.js (built
 * by the worker from the plan) and the overview the ground already uses, so
 * it never disagrees with the ground under your feet.  Nothing is loaded.
 *
 * QA: window.__btWorldMap (tools/qa/mp/mp-wheelmap.mjs).
 *
 * ═══ v2.3.3057: ZOOM IN, AND THERE IS MORE TO SEE ═══
 * Owner, 2026-10-05: "Make it so if you tap the minimap and zoom in you can
 * see more details."  It zooms twice as far (ZOOM_MAX 28: a building ~100
 * CSS px on a phone), and what the minimap knows and the map did not draw
 * comes in as the room grows (AT):
 *   - always: the quest's gold road and star (questRoutePoint, as the
 *     minimap's), so the map answers "where do I go" at a glance;
 *   - the other bros, then the monsters near you (S.others, S.monsters);
 *   - each land's LEVEL BANDS -- a tick across the spoke every five levels,
 *     then "Lv 6–10" in each band (the worker's `ticks`, wheelmap.js);
 *   - the resources: ore, trees and fish where they grow, tinted by tier as on
 *     the minimap, faint where you have no tool for them;
 *   - the bridges and Bro Pond, named;
 *   - in town, every building at its door, named (wheelTownDoors), a shut one
 *     dim and marked "shut".
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isWheelTrialZone, WHEELS } from '../game/worldTrial.js';
import { wheelMapInfo, wheelOverviewLands, wheelHere, wheelLocalLands } from '../game/wheelTrial.js';
import { ZONES } from '../data/zones.js';   /* v2.3.3039: the world's name (BroTown) */
import { questRoutePoint } from '../game/questRoute.js';          /* v2.3.3057: the quest's way, as the minimap's */
import { wheelTownDoors } from '../game/wheelTownDoors.js';       /* v2.3.3057: the buildings, named */
import { hasGatherTool } from '../data/lifeSkills.js';            /* v2.3.3057: faint where you have no tool */
import { sendMapWatch, PRESENCE2_CLIENT } from '../game/presence2.js';   /* v2.3.3250: far players come while the map is open */
import { peerDotAt } from '../game/peerDot.js';                    /* v2.3.3243: a far player's dot glides between rosters */
import { PARTY_MARK, partyIdsOf } from '../game/partyMarks.js';    /* v2.3.3277: your party, blue, at every zoom */
import { mapDetailFor, freeMapDetail } from './worldMapDetail.js';   /* v2.3.3319: the long Wheel's lands up close */
import { questPinsOf, MAP_PIN } from '../game/questPins.js';       /* v2.3.3525: the townsfolk's quest pins */
import { QUEST_PIN } from '../data/ownerIcons.js';                 /* v2.3.3525: ...in the owner's own pictures */
import { deskWideActive } from './deskWide.js';                    /* v2.3.3830: the key sized from the column on a computer */
import { GLYPHS, drawGlyph, glyphDetailColor } from './mapGlyphs.js';   /* v2.3.3780: each mark a little picture of what it is, the key the same */
import { wheelBuildingIconCanvas } from '../rendering/wheelBuildingIcons.js';   /* v2.3.3522: each building's picture at its door */
import { loadPins, pinsOf, PIN_KEYS, PIN_CSS } from '../game/mapPins.js';   /* v2.3.3766: the Town Hall board's red and blue pins */
import { boardPlaceAt } from '../game/mapPinPlaces.js';
import { boardPinnable } from '../data/townBoard.js';
import { wheelDungeonOpen, wheelDungeonLevelsLine } from '../game/wheelDungeons.js';                  /* v2.3.3540: which landmarks are dungeons this worker opens; v2.3.3573: + a party dungeon's level and players */

/* ═══ v2.3.3525: THE QUEST PINS' PICTURES ═══
   The owner's pins from over the townsfolk's heads (data/ownerIcons.js
   QUEST_PIN), drawn on the map's canvas: loaded as the map opens, as a window
   loads its pictures, and let go of as it closes (three 72 x 86 pictures); a
   drawn gold, grey or green disc until one is in (the loop redraws every
   120 ms). */
let _pinImgs = null;
function pinImg(state) {
  if (typeof Image === 'undefined' || !QUEST_PIN[state]) return null;
  if (!_pinImgs) _pinImgs = Object.create(null);
  let img = _pinImgs[state];
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = QUEST_PIN[state];
    _pinImgs[state] = img;
  }
  return img.complete && img.naturalWidth ? img : null;
}

const FACING = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
/* v2.3.3057: 12 -> 28, so the town's buildings can be read by name */
const ZOOM_MAX = 28;
/* v2.3.3315: zoom 1 is still the whole Wheel on screen, but the long Wheel
   (src/game/wheelSize.js) is ~4x as wide, so the zoom goes ~4x as far.  `rel`
   is the zoom the short Wheel would need to draw the world this big. */
function spanK(map) { return Math.max(1, Math.max(map.worldW, map.worldH) / WHEELS[1].worldW); }
/* what is labelled from which zoom (1 = the whole Wheel on screen).
   v2.3.3315: what lies ALONG the lands -- their names, stages, level bands,
   camps, passes, gates, landmarks and roads -- is as far apart as the lands
   are long, so it comes in at the map's own zoom, as it did; what is the
   size it is whichever Wheel it is -- the commons, the town's buildings, a
   bridge or a pond, a resource, a monster, a bro's name (commons, town,
   bridge, node, monster, otherName) -- at the short Wheel's (`rel`), so the
   town's buildings still come in at the same size on screen.  (All at `rel`
   left the long Wheel nine zoom-ins of the eight lands' names and nothing
   else.) */
/* v2.3.3522: a building's picture at its door up close, CSS px (the
   minimap's own, rendering/wheelBuildingIcons.js) */
const TOWN_ICON_PX = 20;
const AT = { landSub: 1.5, stage: 2.2, commons: 1.8, gateName: 1.6, camp: 3, pass: 3, site: 3.6, road: 4.6,
  /* v2.3.3057: the details that come in as you zoom */
  others: 1.5, tier: 2.6, node: 3, monster: 3, bridge: 3.6, tierLv: 4.2, town: 6, otherName: 6 };
/* v2.3.3057: the resources' tints, the minimap's (wheelMinimap.js C_NODE) */
const NODE_TINT = {   /* v2.3.3094: + 16, 21, the second stage's */
  oreVein: { 1: '#E08A45', 6: '#C65F45', 11: '#8E9AB8', 16: '#C8D0DC', 21: '#7A55B5' },
  tree: { 1: '#58B85A', 6: '#C6DC6C', 11: '#A08C52', 16: '#C0786A', 21: '#F09A40' },
  /* v2.3.3780: the first tier's fish a water blue, not near-white (the
     owner: "fish is white dot"); the rest as the minimap tints them */
  fishSpot: { 1: '#79C4F2', 6: '#FF8A3A', 11: '#C4B46A', 16: '#F09080', 21: '#8AAA50' },
};
/* v2.3.3780: which glyph a resource wears (mapGlyphs.js) */
const NODE_GLYPH = { oreVein: 'ore', tree: 'tree', fishSpot: 'fish' };
const C_STAR = '#F5CE3C';   /* v2.3.3780: the bros' and monsters' colours are their glyphs' (mapGlyphs.js) */
const INK = '#F4F0E7', BRASS = '#EAC675', HALO = 'rgba(11,22,27,0.92)';
/* v2.3.3780: the places' marks and colours are mapGlyphs.js's GLYPHS now */

/* v2.3.3258: the Town Hall's "World map" row opens the map from outside the
   minimap's button (BroTown.jsx onMap).  The overlay hands its opener to this
   module while it is mounted; false when it is not (nothing to open). */
let _openMap = null;
export function openWorldMap() {
  if (!_openMap) return false;
  _openMap();
  return true;
}
/* v2.3.3407: M on a computer (game/deskKeys.js MAP_KEY) opens it, and closes
   it again -- only where it is, the Wheel (false elsewhere: no map to open) */
let _toggleMap = null;
export function toggleWorldMap() {
  if (!_toggleMap) return false;
  return _toggleMap();
}

export function WorldMapOverlay({ stateRef }) {
  const [inWheel, setInWheel] = useState(false);
  const [rect, setRect] = useState(null);
  const [open, setOpen] = useState(false);
  const inWheelRef = useRef(false);   /* v2.3.3407: M asks it (toggleWorldMap) */
  useEffect(() => {
    const id = setInterval(() => {
      const S = stateRef && stateRef.current;
      const on = !!(S && isWheelTrialZone(S.currentZone) && wheelMapInfo());
      inWheelRef.current = on;
      setInWheel(on);
      const r = on ? window.__btWheelMini || null : null;
      setRect((old) => (old && r && old.left === r.left && old.top === r.top && old.w === r.w && old.h === r.h ? old : r));
      if (!on) setOpen(false);
    }, 300);
    return () => clearInterval(id);
  }, [stateRef]);
  useEffect(() => {
    /* QA: open and close it without a tap */
    window.__btWorldMapOpen = (v) => setOpen(v !== false);
    const opener = () => setOpen(true);
    _openMap = opener;
    const toggler = () => {
      if (!inWheelRef.current) return false;
      setOpen((v) => !v);
      return true;
    };
    _toggleMap = toggler;
    return () => {
      if (_openMap === opener) _openMap = null;
      if (_toggleMap === toggler) _toggleMap = null;
      try { delete window.__btWorldMapOpen; } catch (e) { /* gone */ }
    };
  }, []);
  if (!inWheel) return null;
  /* into the page's body, not the game's tree: the bottom dashboard (z 30)
     sits above everything inside the game's wrapper, whatever its z-index,
     and would cover the map's buttons (caught by mp-wheelmap) */
  return createPortal(
    <>
      {rect && !open && (
        <button
          type="button"
          aria-label="Open the world map"
          title="World map (M)"
          data-world-map-open=""
          /* v2.3.3407: on a computer its key, M, beside the minimap's "tap me"
             mark (game.css [data-key], drawn only under a mouse) */
          data-key="M"
          data-key-at="xy"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={() => setOpen(true)}
          style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.w, height: rect.h, zIndex: 45,
            background: 'transparent', border: 0, padding: 0, margin: 0, cursor: 'pointer', touchAction: 'manipulation',
            '--key-x': ((rect.mark ? rect.mark.x + rect.mark.w : 26) + 3) + 'px',
            '--key-y': (rect.mark ? rect.mark.y : 73) + 'px' }}
        />
      )}
      {open && <WorldMap stateRef={stateRef} onClose={() => setOpen(false)} />}
    </>,
    document.body,
  );
}

function WorldMap({ stateRef, onClose }) {
  const cvRef = useRef(null);
  const view = useRef({ zoom: 1, cx: null, cy: null });
  const ptrs = useRef(new Map());
  const pinch = useRef(null);
  const dirty = useRef(true);
  const [where, setWhere] = useState(null);
  /* v2.3.3315: the map's zoom and the short Wheel's (`rel`), for the key */
  const [zoomShown, setZoomShown] = useState([1, 1]);
  /* v2.3.3277: the key says "party" while one of yours is on the map */
  const [partyShown, setPartyShown] = useState(false);
  /* v2.3.3525: ...and "has a quest" while a townsperson's pin is */
  const [pinsShown, setPinsShown] = useState(false);
  /* v2.3.3481: the canvas's size in CSS px, for the key's width (below);
     set by the draw loop, so a turn of the phone moves the key too */
  const [cvBox, setCvBox] = useState(null);

  /* v2.3.3250: presence v2 (src/game/presence2.js) -- the worker sends the far
     players only while this map is open: say so now, keep saying so, and say
     when it shuts.  A worker without presence2 is told nothing. */
  useEffect(() => {
    const S0 = stateRef && stateRef.current;
    sendMapWatch(S0, true);
    const id = setInterval(() => sendMapWatch(stateRef && stateRef.current, true), PRESENCE2_CLIENT.MAP_HEARTBEAT_MS);
    return () => { clearInterval(id); sendMapWatch(stateRef && stateRef.current, false); };
  }, [stateRef]);

  useEffect(() => {
    const cv = cvRef.current;
    const map = wheelMapInfo();
    if (!cv || !map) return undefined;
    const V = view.current;
    if (V.cx == null) {
      /* ═══ v2.3.3522: IN TOWN, THE MAP OPENS ON THE TOWN ═══
         The owner, playtesting: "When you're in town make the expanded map
         zoomed in on the town so you can see which building is labeled where
         on the map."  It always opened on the whole Wheel, where the town is
         a dot and its buildings are named only past zoom 6 (AT.town) -- and
         the ◎ button stopped short of that too.  Standing in BroTown it opens
         on the town's buildings instead, every one of them on the screen
         with its picture and its name (townView); anywhere else, the whole
         Wheel as before. */
      const S0 = stateRef.current;
      const P0 = S0 && S0.player;
      const tv = P0 && inTownNow(P0) ? townView(map, cv.clientWidth, cv.clientHeight) : null;
      if (tv) {
        V.zoom = tv.zoom; V.cx = tv.cx; V.cy = tv.cy;
        setZoomShown([V.zoom, V.zoom / spanK(map)]);
      } else { V.cx = map.worldW / 2; V.cy = map.worldH / 2; }
    }
    let raf = 0, last = 0, lastP = '';
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        dirty.current = true;
      }
      return { w, h, dpr };
    };
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const S = stateRef.current;
      const P = S && S.player;
      const pk = P ? `${Math.round(P.x)},${Math.round(P.y)},${S._renderFacing}` : '';
      /* the ring pulses: a few frames a second is plenty */
      /* (v2.3.3057: the bros and monsters move too -- this 120 ms beat
         redraws them with the ring) */
      if (!dirty.current && pk === lastP && t - last < 120) return;
      lastP = pk; last = t; dirty.current = false;
      const { w, h, dpr } = size();
      /* v2.3.3830: + the map's whole box (#root's on a computer), for the key's size */
      const ob = cv.closest('[data-world-map]');
      const ow = ob ? ob.clientWidth : w, oh = ob ? ob.clientHeight : h;
      setCvBox((o) => (o && o.w === w && o.h === h && o.ow === ow && o.oh === oh ? o : { w, h, ow, oh }));
      const out = draw(cv.getContext('2d'), w, h, dpr, map, V, P, S && S._renderFacing, t, S);
      const here = P ? wheelHere(P.x, P.y) : null;
      const words = here && here.words ? `${here.words.title}${here.words.sub ? ` · ${here.words.sub}` : ''}` : '';
      setWhere((o) => (o === words ? o : words));
      const ps = !!(out && out.more && out.more.party > 0);
      setPartyShown((o) => (o === ps ? o : ps));
      const qs = !!(out && out.more && out.more.questPins > 0);
      setPinsShown((o) => (o === qs ? o : qs));
      try { window.__btWorldMap = { open: true, zoom: V.zoom, rel: V.zoom / spanK(map), cx: Math.round(V.cx), cy: Math.round(V.cy), ...out }; } catch (e) { /* no page */ }
    };
    raf = requestAnimationFrame(loop);
    const onResize = () => { dirty.current = true; };
    window.addEventListener('resize', onResize);
    /* the trial's own readout (worldTrial.js) sits above everything: it
       steps aside while the map is open */
    const readout = document.getElementById('bt-world-trial');
    const was = readout ? readout.style.visibility : '';
    if (readout) readout.style.visibility = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (readout) readout.style.visibility = was;
      try { window.__btWorldMap = { open: false }; } catch (e) { /* no page */ }
      /* v2.3.3070: the map's canvas is the whole screen at the device's
         pixels (390 x 844 at 3x: 11.3 MB) and goes with the map -- but its
         pixels went only when the garbage collector came round to it, so
         opening and closing the map a few times held a few dead copies.
         Emptied now, as it closes (docs/MEMORY-PLAN.md, freed on close;
         mp-worldmapfree). */
      try { cv.width = 0; cv.height = 0; } catch (e) { /* gone */ }
      /* v2.3.3319: and the lands' tiles it brought in up close go with it */
      freeMapDetail();
      /* v2.3.3525: and the quest pins' pictures */
      _pinImgs = null;
    };
  }, [stateRef]);

  /* zoom by `f` about a point on screen (CSS px) */
  const zoomAt = (f, sx, sy) => {
    const cv = cvRef.current, map = wheelMapInfo();
    if (!cv || !map) return;
    const V = view.current, k0 = baseScale(cv.clientWidth, cv.clientHeight, map) * V.zoom;
    const z = Math.max(1, Math.min(ZOOM_MAX * spanK(map), V.zoom * f));
    const k1 = baseScale(cv.clientWidth, cv.clientHeight, map) * z;
    /* the world point under (sx, sy) stays under it */
    const wx = V.cx + (sx - cv.clientWidth / 2) / k0, wy = V.cy + (sy - cv.clientHeight / 2) / k0;
    V.zoom = z;
    V.cx = wx - (sx - cv.clientWidth / 2) / k1;
    V.cy = wy - (sy - cv.clientHeight / 2) / k1;
    clampView(V, map);
    setZoomShown((o) => (o[0] === z ? o : [z, z / spanK(map)]));
    dirty.current = true;
  };
  const onDown = (e) => {
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
    }
  };
  const onMove = (e) => {
    const p = ptrs.current.get(e.pointerId);
    if (!p) return;
    const map = wheelMapInfo(), cv = cvRef.current;
    if (!map || !cv) return;
    const V = view.current, k = baseScale(cv.clientWidth, cv.clientHeight, map) * V.zoom;
    if (ptrs.current.size === 1) {
      V.cx -= (e.clientX - p.x) / k; V.cy -= (e.clientY - p.y) / k;
      clampView(V, map);
      dirty.current = true;
    }
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.current.size === 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const r = cv.getBoundingClientRect();
      zoomAt(d / pinch.current.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch.current.d = d;
    }
  };
  const onUp = (e) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinch.current = null; };
  const onWheel = (e) => { const r = cvRef.current.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top); };
  const centreOnMe = () => {
    const S = stateRef.current, map = wheelMapInfo();
    if (!S || !S.player || !map) return;
    const V = view.current;
    /* v2.3.3522: in town, ◎ is the town's view (every building named), as
       the map opens there -- 4x the short Wheel stopped short of the names */
    const cv = cvRef.current;
    const tv = cv && inTownNow(S.player) ? townView(map, cv.clientWidth, cv.clientHeight) : null;
    if (tv) { V.zoom = tv.zoom; V.cx = tv.cx; V.cy = tv.cy; }
    else {
      V.cx = S.player.x; V.cy = S.player.y;
      V.zoom = Math.max(V.zoom, 4 * spanK(map));
    }
    clampView(V, map);
    setZoomShown([V.zoom, V.zoom / spanK(map)]);
    dirty.current = true;
  };
  const zoomBtn = (f) => { const cv = cvRef.current; if (cv) zoomAt(f, cv.clientWidth / 2, cv.clientHeight / 2); };

  /* v2.3.3481: the 2026-10-19 UI review -- sideways the key, one row ~490 px
     wide, ran on across the Wheel's south end and its gate: the Wheel is
     drawn square, 0.96 x the canvas's height, in the middle (baseScale), and
     the key sat on top of it.  On a canvas wider than tall the key keeps to
     the empty margin left of the Wheel (8 px clear of it, never under 150 px)
     and wraps into rows there; upright it is as it was. */
  /* ═══ v2.3.3830: ON A COMPUTER, THE KEY SIZED FROM THE PLAY COLUMN ═══
     The judges' pass (1440 x 900): the key, drawn at the phone's 11 px, was
     small on a big computer window, where the map takes the whole window.
     Its size comes from the play COLUMN, never the window (TRAPS §214): the
     column a computer gives the phone's layout, min(the width, 390/715 of
     the height) -- game.css's --cc-colw, the creator's own -- over the
     phone's 390.  1.26x at 1440 x 900, 1.51x at 1920 x 1080, as it was at
     1280 x 720 (the column is a phone's there), never past 2x.  `zoom`, so
     the words, the little pictures and the rows grow together and its
     layout is the size it is drawn; its widths are divided by it to stay
     where they were (the margin left of the Wheel sideways).  Phones never:
     the computer's wide layout only (deskWide.js). */
  let keyK = deskWideActive() && cvBox && cvBox.oh
    ? Math.max(1, Math.min(2, Math.min(cvBox.ow, cvBox.oh * 390 / 715) / 390))
    : 1;
  if (keyK < 1.05) keyK = 1;   /* a step too small to see only blurs the words */
  const keyMaxW = cvBox && cvBox.w > cvBox.h
    ? Math.max(150, Math.floor((cvBox.w - 0.96 * cvBox.h) / 2) - 18) / keyK
    : (keyK > 1 ? `calc((100% - 90px) / ${keyK.toFixed(3)})` : 'calc(100% - 90px)');
  const btn = { appearance: 'none', width: 46, height: 46, borderRadius: 10, border: '1px solid rgba(216,170,88,0.55)', background: 'rgba(17,30,35,0.92)',
    color: INK, fontSize: 22, fontWeight: 700, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' };
  return (
    <div
      data-world-map=""
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{ position: 'fixed', inset: 0, zIndex: 9200, background: '#0B161B', display: 'flex', flexDirection: 'column', touchAction: 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px', background: '#111E23', borderBottom: '1px solid rgba(216,170,88,0.35)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: BRASS, fontWeight: 800, fontSize: 16, letterSpacing: '.04em' }}>{(ZONES.wheel && ZONES.wheel.name) || 'BroTown' /* v2.3.3039: the name players see */}</div>
          <div data-world-map-where="" style={{ color: INK, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{where ? `You are in ${where}` : 'Finding you…'}</div>
        </div>
        <button type="button" aria-label="Close the map" data-world-map-close="" onClick={onClose}
          data-esc="" data-key="Esc" data-key-at="hang"   /* v2.3.3407: Esc presses it (game/deskKeys.js) */
          style={{ ...btn, fontSize: 24, position: 'relative' }}>×</button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <canvas
          ref={cvRef}
          data-world-map-canvas=""
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        />
        {/* v2.3.3065: north, as on the minimap's frame -- the map never turns */}
        <svg data-world-map-north="" aria-label="North is up" role="img" viewBox="0 0 44 44" width="44" height="44"
          style={{ position: 'absolute', left: 10, top: 10, pointerEvents: 'none' }}>
          <circle cx="22" cy="22" r="20.5" fill="rgba(17,30,35,0.92)" stroke="rgba(216,170,88,0.55)" strokeWidth="1" />
          <text x="22" y="15.5" textAnchor="middle" fill={BRASS} fontSize="11.5" fontWeight="900" fontFamily="Source Sans 3, sans-serif">N</text>
          <path d="M22 18 L26 29 L22 27 L18 29 Z" fill={BRASS} />
          <path d="M22 38 L26 29 L22 31 L18 29 Z" fill="#5E6B70" />
        </svg>
        <div style={{ position: 'absolute', right: 12, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" aria-label="Zoom in" data-world-map-zoom-in="" onClick={() => zoomBtn(1.6)} style={btn}>+</button>
          <button type="button" aria-label="Zoom out" data-world-map-zoom-out="" onClick={() => zoomBtn(1 / 1.6)} style={btn}>−</button>
          <button type="button" aria-label="Back to you" data-world-map-me="" onClick={centreOnMe} style={{ ...btn, fontSize: 18 }}>◎</button>
        </div>
        <div data-world-map-legend="" style={{ position: 'absolute', left: 10, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', maxWidth: keyMaxW,
          padding: '6px 9px', borderRadius: 8, background: 'rgba(17,30,35,0.85)', color: INK, fontSize: 11,
          ...(keyK > 1 ? { zoom: +keyK.toFixed(3) } : null) }}>
          {/* v2.3.3780: the map's own glyphs (mapGlyphs.js), not dots */}
          <Key glyph="town">town</Key>
          <Key glyph="camp">camp</Key>
          <Key glyph="pass">pass</Key>
          <Key glyph="gate">gate</Key>
          <Key glyph="landmark">landmark</Key>
          <Key shape="line" color="#F2E4C2">road</Key>
          <Key shape="line" color="#5AAEE8">river</Key>
          <Key shape="star" color={C_STAR}>quest</Key>
          {pinsShown ? <Key shape="pin">has a quest</Key> : null}
          {partyShown ? <Key shape="dot" color={PARTY_MARK.CSS}>party</Key> : null}
          {zoomShown[0] >= AT.others ? <Key glyph="bro">bro</Key> : null}
          {zoomShown[1] >= AT.monster ? <Key glyph="monster">monster</Key> : null}
          {zoomShown[1] >= AT.node ? <Key glyph="ore">ore</Key> : null}
          {zoomShown[1] >= AT.node ? <Key glyph="tree">tree</Key> : null}
          {zoomShown[1] >= AT.node ? <Key glyph="fish">fish</Key> : null}
          {zoomShown[0] < AT.camp ? <span style={{ color: '#B6C1BE' }}>Zoom in for more</span> : null}
        </div>
      </div>
    </div>
  );
}

function Key({ shape, color, glyph, children }) {
  /* v2.3.3780: a glyph, drawn from the very paths the map draws (mapGlyphs.js) */
  if (glyph && GLYPHS[glyph]) {
    const G = GLYPHS[glyph];
    return <span data-world-map-key={glyph} style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
      <svg viewBox="-1 -1 18 18" width="15" height="15" aria-hidden="true" style={{ marginRight: 4, flex: '0 0 auto' }}>
        <path d={G.body} fill={G.color} stroke="rgba(11,22,27,0.92)" strokeWidth="2.2" strokeLinejoin="round" style={{ paintOrder: 'stroke' }} />
        {G.detail ? <path d={G.detail} fill={glyphDetailColor(glyph)} /> : null}
      </svg>{children}</span>;
  }
  const s = { display: 'inline-block', width: 9, height: 9, marginRight: 4, verticalAlign: -1, background: color };
  if (shape === 'dot') Object.assign(s, { borderRadius: 9 });
  if (shape === 'diamond') Object.assign(s, { transform: 'rotate(45deg) scale(.8)' });
  if (shape === 'tri') Object.assign(s, { background: 'none', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: `9px solid ${color}` });
  if (shape === 'line') Object.assign(s, { height: 3, width: 12, borderRadius: 2, verticalAlign: 2 });
  if (shape === 'star') return <span style={{ whiteSpace: 'nowrap' }}><span style={{ color, marginRight: 3, fontSize: 12, lineHeight: 1 }}>★</span>{children}</span>;
  /* v2.3.3525: the townsfolk's quest pin, the owner's picture */
  if (shape === 'pin') return <span data-world-map-key="pin" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}><img src={QUEST_PIN.offer} alt="" draggable={false} style={{ width: 10, height: 12, marginRight: 4, flex: '0 0 auto' }} />{children}</span>;
  return <span style={{ whiteSpace: 'nowrap' }}><span style={s} />{children}</span>;
}

/* CSS px per game px at zoom 1: the whole Wheel fits, with a little room */
function baseScale(w, h, map) { return (Math.min(w, h) * 0.96) / Math.max(map.worldW, map.worldH); }
function clampView(V, map) {
  V.cx = Math.max(0, Math.min(map.worldW, V.cx));
  V.cy = Math.max(0, Math.min(map.worldH, V.cy));
}

/* ═══ v2.3.3522: THE TOWN'S VIEW (the first effect's note) ═══
   Every building's door on the screen with room round each for its picture
   above and its name below, and clear of the map's own furniture -- the
   compass (top left), the zoom buttons (right), the key (bottom).  The
   buildings' doors (the feet of their steps, game px) are where the names
   hang; the roofs above them are the picture's, not the names'.  Never under
   the zoom the buildings are named from (AT.town, at the short Wheel's
   scale), never past ZOOM_MAX.  Null before the worker has said where the
   doors are (the map then opens as it always did). */
const TOWN_PAD = { l: 52, r: 66, t: 64, b: 86 };   /* CSS px kept clear round the doors */
function townDoorsBox() {
  let doors = [];
  try { doors = wheelTownDoors(); } catch (e) { doors = []; }
  if (!doors.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const d of doors) { x0 = Math.min(x0, d.x); x1 = Math.max(x1, d.x); y0 = Math.min(y0, d.y); y1 = Math.max(y1, d.y); }
  return { x0, y0, x1, y1, n: doors.length };
}
function townView(map, w, h) {
  const b = townDoorsBox();
  if (!b || !map || !(w > 0) || !(h > 0)) return null;
  const aw = Math.max(40, w - TOWN_PAD.l - TOWN_PAD.r), ah = Math.max(40, h - TOWN_PAD.t - TOWN_PAD.b);
  const k = Math.min(aw / Math.max(1, b.x1 - b.x0), ah / Math.max(1, b.y1 - b.y0));
  const base = baseScale(w, h, map);
  const zoom = Math.max(AT.town * spanK(map), Math.min(ZOOM_MAX * spanK(map), k / base));
  const kz = base * zoom;
  /* the padded box's middle on the screen's middle */
  return { zoom,
    cx: (b.x0 + b.x1) / 2 + (TOWN_PAD.r - TOWN_PAD.l) / 2 / kz,
    cy: (b.y0 + b.y1) / 2 + (TOWN_PAD.b - TOWN_PAD.t) / 2 / kz };
}
/* In BroTown: the worker's word for the spot under you, or -- before it has
   answered -- within a short walk of the town's doors */
function inTownNow(P) {
  try {
    const here = wheelHere(P.x, P.y);
    if (here && here.region) return here.region === 'town';
  } catch (e) { /* no answer yet */ }
  const b = townDoorsBox();
  return !!b && P.x >= b.x0 - 300 && P.x <= b.x1 + 300 && P.y >= b.y0 - 500 && P.y <= b.y1 + 300;
}
/* A building's name in two lines, split at the space nearest its middle
   ("Auction" / "House"), for a street where one line would not fit */
function twoLines(name) {
  const s = String(name || '');
  const sp = [];
  for (let i = 0; i < s.length; i++) if (s[i] === ' ') sp.push(i);
  if (!sp.length) return null;
  let at = sp[0];
  for (const i of sp) if (Math.abs(i - s.length / 2) < Math.abs(at - s.length / 2)) at = i;
  return [s.slice(0, at), s.slice(at + 1)];
}

/* v2.3.3319: the long Wheel's lands up close (src/ui/worldMapDetail.js), the
   tiles over the view, each to whole pixels so two side by side never leave a
   hairline of the coarse picture between them -- how many were drawn, or null
   when there are none to draw (not zoomed in that far, or none baked) */
function drawMapDetail(g, ov, map, V, k, w, h, X, Y, t) {
  const view = { x0: V.cx - w / 2 / k, y0: V.cy - h / 2 / k, x1: V.cx + w / 2 / k, y1: V.cy + h / 2 / k };
  const tiles = mapDetailFor(view, (map.worldW / ov.width) * k, t);
  if (!tiles) return null;
  for (const T of tiles) {
    const x0 = Math.floor(X(T.x)), y0 = Math.floor(Y(T.y)), x1 = Math.ceil(X(T.x + T.w)), y1 = Math.ceil(Y(T.y + T.h));
    if (T.bm) g.drawImage(T.bm, x0, y0, x1 - x0, y1 - y0);
    else { g.fillStyle = T.fill; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
  }
  return tiles.length;
}

/* ── drawing ── */
function draw(g, w, h, dpr, map, V, P, facing, t, S) {
  /* v2.3.3315: `z` the map's own zoom, for what lies along the lands; `zr`
     the short Wheel's, for what is the same size on either (AT_REL) */
  const k = baseScale(w, h, map) * V.zoom, z = V.zoom, zr = V.zoom / spanK(map);
  const X = (x) => (x - V.cx) * k + w / 2, Y = (y) => (y - V.cy) * k + h / 2;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#16324A';
  g.fillRect(0, 0, w, h);
  /* the land, a touch darker for the labels -- v2.3.3024: each land one
     flat colour, as on the minimap (wheelTrial.js landsCanvas) */
  const ov = wheelOverviewLands();
  let detailN = null;
  if (ov && ov.width) {
    g.imageSmoothingEnabled = true;
    g.drawImage(ov, X(0), Y(0), map.worldW * k, map.worldH * k);
    /* v2.3.3319: zoomed in, the long Wheel's lands as fine everywhere as
       round you (src/ui/worldMapDetail.js) */
    detailN = drawMapDetail(g, ov, map, V, k, w, h, X, Y, t);
    /* v2.3.3315: the long Wheel's whole-map picture is a pixel every 16
       cells; round you the blocks' lands are four times finer, as the
       short Wheel's whole picture is (wheelTrial.js wheelLocalLands) */
    const L = P ? wheelLocalLands(P.x, P.y) : null;
    if (L && L.canvas && L.canvas.width) g.drawImage(L.canvas, X(L.x), Y(L.y), L.w * k, L.h * k);
    g.fillStyle = 'rgba(8, 14, 20, 0.16)';
    g.fillRect(0, 0, w, h);
  }
  /* the lines */
  const line = (want, width, color, dash) => {
    g.beginPath();
    for (const r of map.routes) {
      if (!want(r) || r.pts.length < 4) continue;
      g.moveTo(X(r.pts[0]), Y(r.pts[1]));
      for (let i = 2; i < r.pts.length; i += 2) g.lineTo(X(r.pts[i]), Y(r.pts[i + 1]));
    }
    g.lineWidth = width; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
    g.setLineDash(dash || []);
    g.stroke();
    g.setLineDash([]);
  };
  const lw = Math.min(4, 1 + z * 0.22);
  line((r) => r.kind === 'river', lw * 1.25, '#5AAEE8');
  line((r) => r.kind === 'rail', Math.max(1, lw * 0.6), 'rgba(43,35,32,0.9)', [4, 3]);
  line((r) => r.kind === 'road' && !r.trunk, Math.max(1, lw * 0.7), 'rgba(230,213,174,0.85)');
  line((r) => r.kind === 'road' && r.trunk, lw, 'rgba(242,228,194,0.95)');

  /* ── v2.3.3057: the details, under every label ── */
  const more = { ticks: 0, nodes: 0, others: 0, monsters: 0, quest: null, buildings: 0, buildingIcons: 0, buildingsAt: 0, bridges: 0, ponds: 0, tierLabels: 0, party: 0, partyNames: 0,
    questPins: 0, questPinNames: 0, pins: [],   /* v2.3.3525: the townsfolk's quest pins */
    mapPins: [],   /* v2.3.3766: the board's red and blue pins */
    dungeons: 0,   /* v2.3.3540: the dungeons' mouths named with their levels */
    glyphs: { town: 0, camp: 0, pass: 0, gate: 0, landmark: 0, monster: 0, fish: 0, tree: 0, ore: 0, bro: 0 },   /* v2.3.3780: each glyph drawn (the probe's) */
    dungeonLines: [],   /* v2.3.3573: ...and what each says (the probe's; a party dungeon says its players) */
    detail: detailN };   /* v2.3.3319: the lands' tiles drawn up close (null: none to draw) */
  const onScreen = (x, y, pad = 30) => x > -pad && y > -pad && x < w + pad && y < h + pad;
  /* each land's level bands: a tick across the spoke every five levels */
  if (z >= AT.tier && map.spokeHalf) {
    g.beginPath();
    for (const L of map.lands) {
      const T = L.ticks || [];
      for (let i = 2; i + 1 < T.length; i += 2) {   /* the first is the commons' edge */
        const hx = -L.uy * map.spokeHalf, hy = L.ux * map.spokeHalf;
        const x0 = X(T[i] - hx), y0 = Y(T[i + 1] - hy), x1 = X(T[i] + hx), y1 = Y(T[i + 1] + hy);
        if (!onScreen(x0, y0, w) && !onScreen(x1, y1, w)) continue;
        g.moveTo(x0, y0); g.lineTo(x1, y1);
        more.ticks++;
      }
    }
    g.lineWidth = 1; g.strokeStyle = 'rgba(244,240,231,0.32)'; g.setLineDash([5, 4]); g.stroke(); g.setLineDash([]);
  }
  /* the resources, where they grow: tinted by tier, faint without the tool */
  if (zr >= AT.node && S && Array.isArray(S.gatherNodes)) {
    const r = Math.max(4.2, Math.min(7, 2 + zr * 0.25));   /* v2.3.3780: 11 px across at least, a glyph to read */
    for (const n of S.gatherNodes) {
      if (!n || !n.alive || !NODE_TINT[n.nodeType]) continue;
      const x = X(n.x), y = Y(n.y);
      if (!onScreen(x, y)) continue;
      const lvl = n.gatherLvl || 1, tier = lvl >= 21 ? 21 : lvl >= 16 ? 16 : lvl >= 11 ? 11 : lvl >= 6 ? 6 : 1;   /* v2.3.3094: + 16, 21 */
      let tool = true;
      try { tool = hasGatherTool(S.rpg || null, n.nodeType); } catch (e) { tool = true; }
      g.globalAlpha = tool ? 1 : 0.45;
      /* v2.3.3780: a rock with its metal's fleck, a tree, a fish -- tinted by
         tier (the ore's fleck), as the dots were */
      const kind = NODE_GLYPH[n.nodeType], tint = NODE_TINT[n.nodeType][tier];
      if (kind === 'ore') drawGlyph(g, 'ore', x, y, r * 2.6, null, tint);
      else drawGlyph(g, kind, x, y, r * 2.6, tint);
      g.globalAlpha = 1;
      more.nodes++;
      more.glyphs[kind]++;
    }
  }
  /* the monsters near you (the only ones you are told about), then the bros */
  if (zr >= AT.monster && S && Array.isArray(S.monsters)) {
    for (const m of S.monsters) {
      if (!m || m.alive === false || m.dead || (m.hp != null && m.hp <= 0)) continue;
      const x = X(m.x), y = Y(m.y);
      if (!onScreen(x, y)) continue;
      drawGlyph(g, 'monster', x, y, 12);   /* v2.3.3780: a horned head, not a red dot */
      more.monsters++;
      more.glyphs.monster++;
    }
  }
  const othersAt = [];
  /* v2.3.3277: your party is drawn on its own, below, at every zoom */
  const party = partyIdsOf(S);
  if (z >= AT.others && S && S.others) {
    /* v2.3.3243: where each is now -- a far one is sent about once a second
       (src/game/peerDot.js) */
    const now = Date.now(), at = { x: 0, y: 0 };
    for (const id in S.others) {
      const o = S.others[id];
      if (party && party.has(id)) continue;
      if (!o || (o.zone || o.z) !== S.currentZone || typeof o.x !== 'number') continue;
      /* v2.3.3250: a parked copy is nowhere real (src/game/presence2.js); the
         watch this map opened brings them all, where they are, within a
         roster */
      if (o._away) continue;
      peerDotAt(o, now, at);
      const x = X(at.x), y = Y(at.y);
      if (!onScreen(x, y)) continue;
      drawGlyph(g, 'bro', x, y, 13);   /* v2.3.3780: a little person, not a green dot */
      more.glyphs.bro++;
      othersAt.push({ x, y, name: o.name || '' });
      more.others++;
    }
  }
  /* ═══ v2.3.3277: YOUR PARTY (src/game/partyMarks.js) ═══
     In the party's blue with a light rim, bigger than a bro and at every
     zoom (the bros only from AT.others), and named -- the worker sends your
     party wherever they are in the Wheel (presence2.js), so this is where
     they really are. */
  const partyAt = [];
  if (party && S && S.others) {
    const now = Date.now(), at = { x: 0, y: 0 };
    for (const id of party) {
      const o = Object.prototype.hasOwnProperty.call(S.others, id) ? S.others[id] : null;
      if (!o || o._away || (o.zone || o.z) !== S.currentZone || typeof o.x !== 'number') continue;
      peerDotAt(o, now, at);
      const x = X(at.x), y = Y(at.y);
      if (!onScreen(x, y)) continue;
      g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI * 2);
      g.fillStyle = PARTY_MARK.CSS; g.fill();
      g.lineWidth = 2; g.strokeStyle = PARTY_MARK.RIM_CSS; g.stroke();
      g.beginPath(); g.arc(x, y, 8.4, 0, Math.PI * 2);
      g.lineWidth = 1.2; g.strokeStyle = HALO; g.stroke();
      partyAt.push({ x, y, name: o.name || '' });
      more.party++;
    }
  }
  /* the quest's way: the gold road from you to its star, cased dark */
  let quest = null;
  try { quest = S ? questRoutePoint(S.currentZone, S.rpg || null, S) : null; } catch (e) { quest = null; }
  if (quest && P && isFinite(quest.x) && isFinite(quest.y)) {
    const px = X(P.x), py = Y(P.y), qx = X(quest.x), qy = Y(quest.y);
    g.beginPath(); g.moveTo(px, py); g.lineTo(qx, qy);
    g.lineCap = 'round';
    g.lineWidth = 6; g.strokeStyle = 'rgba(11,22,27,0.55)'; g.stroke();
    g.lineWidth = 3; g.strokeStyle = C_STAR; g.setLineDash([9, 6]); g.stroke(); g.setLineDash([]);
    starAt(g, qx, qy, 9);
    more.quest = { x: Math.round(quest.x), y: Math.round(quest.y), qid: quest.qid || null, way: quest.way || null };   /* v2.3.3522: + whose road */
  }
  /* ═══ v2.3.3766: THE BOARD'S PINS (game/mapPins.js) ═══
     The red and blue pins from the Town Hall's board, at every zoom, the
     pin's point on the place (found where it stands: game/mapPinPlaces.js).
     Off the screen, at its edge on the line from the middle, smaller -- the
     way to go.  Drawn over the road and the star: they are where you chose to
     go. */
  if (S) {
    loadPins(S, null, boardPinnable);
    const pins = pinsOf(S);
    for (const kk of PIN_KEYS) {
      const id = pins[kk];
      if (!id) continue;
      let at = null;
      try { at = boardPlaceAt(S, id); } catch (e) { at = null; }
      if (!at) continue;
      let x = X(at.x), y = Y(at.y), edge = false;
      const m = 18;
      if (x < m || y < m + 18 || x > w - m || y > h - m) {
        const cx = w / 2, cy = h / 2, dx = x - cx, dy = y - cy;
        let t = 1;
        if (dx > 0) t = Math.min(t, (w - m - cx) / dx); else if (dx < 0) t = Math.min(t, (m - cx) / dx);
        if (dy > 0) t = Math.min(t, (h - m - cy) / dy); else if (dy < 0) t = Math.min(t, (m + 18 - cy) / dy);
        x = cx + dx * t; y = cy + dy * t; edge = true;
      }
      const sc = edge ? 0.8 : 1.15;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 7 * sc, y - 13 * sc);
      g.arc(x, y - 16 * sc, 8 * sc, Math.PI * 0.82, Math.PI * 0.18, false);
      g.closePath();
      g.fillStyle = PIN_CSS[kk]; g.fill();
      g.lineWidth = 1.8; g.strokeStyle = HALO; g.stroke();
      g.beginPath(); g.arc(x, y - 16 * sc, 3 * sc, 0, Math.PI * 2); g.fillStyle = '#0B161B'; g.fill();
      more.mapPins.push({ color: kk, id, edge, x: Math.round(x), y: Math.round(y) });
    }
  }
  /* ═══ v2.3.3525: THE QUEST PINS (src/game/questPins.js) ═══
     Every townsperson with a quest for you, in the pin over his head -- the
     owner: "Make the quest icons appear on the minimap and map too".  At every
     zoom (the town's few in the middle of the Wheel, zoomed out), bigger once
     the buildings are named, then named themselves (below); its tip just over
     where he stands, so the quest's star there still shows.  Found here,
     drawn with the buildings (drawPins, below). */
  const pinsAt = [];
  const pinBig = zr >= AT.town;
  const pw = pinBig ? MAP_PIN.TOWN_W : MAP_PIN.WORLD_W, ph = pinBig ? MAP_PIN.TOWN_H : MAP_PIN.WORLD_H;
  for (const q of questPinsOf(S)) {
    const x = X(q.x), y = Y(q.y) - 4;
    if (!onScreen(x, y, 40)) continue;
    pinsAt.push({ x, y, name: q.name, state: q.state });
  }

  /* labels: placed in order of importance, each only where it clears the
     ones before it */
  const placed = [];
  const free = (x0, y0, x1, y1) => {
    if (x1 < 0 || y1 < 0 || x0 > w || y0 > h) return false;
    for (const r of placed) if (x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]) return false;
    return true;
  };
  const counts = { lands: 0, stages: 0, camps: 0, passes: 0, gates: 0, sites: 0, roads: 0 };
  /* a label of one or two lines centred on (x, y); `mark` draws its icon
     just above it */
  const label = (x, y, lines, opts = {}) => {
    const size = opts.size || 12, sub = opts.subSize || Math.max(10, size - 2);
    g.font = `${opts.weight || 700} ${size}px system-ui, -apple-system, sans-serif`;
    const w0 = g.measureText(lines[0]).width;
    /* v2.3.3522: `same` -- a name wrapped onto two lines keeps its own look */
    g.font = opts.same ? `${opts.weight || 700} ${size}px system-ui, -apple-system, sans-serif` : `600 ${sub}px system-ui, -apple-system, sans-serif`;
    const w1 = lines[1] ? g.measureText(lines[1]).width : 0;
    const bw = Math.max(w0, w1), bh = size + (lines[1] ? (opts.same ? size : sub) + 3 : 0);
    /* `below`: (x, y) is the label's top middle, under an icon */
    const top = opts.below ? y : y - bh / 2;
    if (!opts.force && !free(x - bw / 2 - 3, top - 2, x + bw / 2 + 3, top + bh + 2)) return false;
    placed.push([x - bw / 2 - 3, top - 2, x + bw / 2 + 3, top + bh + 2]);
    g.textAlign = 'center'; g.textBaseline = 'top'; g.lineJoin = 'round';
    g.font = `${opts.weight || 700} ${size}px system-ui, -apple-system, sans-serif`;
    g.lineWidth = 3.5; g.strokeStyle = HALO; g.strokeText(lines[0], x, top);
    g.fillStyle = opts.color || INK; g.fillText(lines[0], x, top);
    if (lines[1]) {
      g.font = opts.same ? `${opts.weight || 700} ${size}px system-ui, -apple-system, sans-serif` : `600 ${sub}px system-ui, -apple-system, sans-serif`;
      g.strokeText(lines[1], x, top + size + 3);
      g.fillStyle = opts.same ? (opts.color || INK) : (opts.subColor || BRASS); g.fillText(lines[1], x, top + size + 3);
    }
    return true;
  };
  /* v2.3.3780: a tent, two peaks and their gap, an arch, a flag (mapGlyphs.js);
     a place of note wears the landmark's flag */
  const icon = (kind, x, y, s = 1) => {
    const gk = kind === 'site' ? 'landmark' : kind;
    if (!GLYPHS[gk]) return;
    drawGlyph(g, gk, x, y, (gk === 'gate' ? 16 : 14) * s);
    more.glyphs[gk]++;
  };

  /* v2.3.3525: the quest pins, drawn once the buildings' pictures are -- a
     keeper stands at his own door, under his building's picture -- with
     their room kept, and once the buildings are named each named before
     them (he is who you are looking for) */
  let pinsDrawn = false;
  const drawPins = () => {
    if (pinsDrawn) return;
    pinsDrawn = true;
    for (const p of pinsAt) {
      const img = pinImg(p.state);
      if (img) g.drawImage(img, p.x - pw / 2, p.y - ph, pw, ph);
      else {
        g.beginPath(); g.arc(p.x, p.y - ph / 2, pw / 2, 0, Math.PI * 2);
        g.fillStyle = p.state === 'ready' ? '#58B97B' : p.state === 'waiting' ? '#B0B0B0' : '#D8AA58';
        g.fill(); g.lineWidth = 1.5; g.strokeStyle = HALO; g.stroke();
      }
      placed.push([p.x - pw / 2, p.y - ph, p.x + pw / 2, p.y]);
      more.questPins++;
      more.pins.push({ name: p.name, state: p.state, x: Math.round(p.x), y: Math.round(p.y), w: pw, h: ph, art: !!img });
    }
    if (pinBig) {
      for (const p of pinsAt) {
        if (p.name && label(p.x, p.y + 2, [p.name], { size: 11, below: true, weight: 700, color: '#F2C14E' })) more.questPinNames++;
      }
    }
  };

  /* ═══ v2.3.3522: IN TOWN, THE BUILDINGS GO FIRST ═══
     The owner: "When you're in town make the expanded map zoomed in on the
     town so you can see which building is labeled where on the map", and of
     the minimap, "Have icons representing each building on each building".
     Up close (zr >= AT.town) each building wears its picture at its door --
     the minimap's (rendering/wheelBuildingIcons.js; v2.3.3057's little drawn
     house only while it has not loaded) -- and its name under it, placed
     BEFORE your own mark so a name keeps its room (your mark is drawn over,
     as it always is), and wrapped onto two lines (twoLines) where one line
     would run into its neighbour's.  A shut one is grey, "shut" under its
     name.
     Your mark's own room is kept first (you arrive just south of the Town
     Hall's door, where its name goes), and a name that finds no room under
     its picture goes over it: every building keeps its name. */
  if (zr >= AT.town) {
    if (P) placed.push([X(P.x) - 18, Y(P.y) - 18, X(P.x) + 18, Y(P.y) + 18]);
    let doors = [];
    try { doors = wheelTownDoors(); } catch (e) { doors = []; }
    const at = [];
    for (const d of doors) {
      const x = X(d.x), y = Y(d.y);
      if (!onScreen(x, y, 60)) continue;
      const pic = wheelBuildingIconCanvas(d.id, d.closed);
      const top = y - TOWN_ICON_PX - 2;
      if (pic) {
        g.save();
        if (d.closed) g.globalAlpha = 0.85;
        g.imageSmoothingEnabled = true;
        g.drawImage(pic, x - TOWN_ICON_PX / 2, top, TOWN_ICON_PX, TOWN_ICON_PX);
        g.restore();
        more.buildingIcons++;
      } else houseAt(g, x, y - 9, d.closed ? '#8D9B98' : '#E6D5AE');
      placed.push([x - TOWN_ICON_PX / 2, top, x + TOWN_ICON_PX / 2, y - 2]);
      at.push({ x, y, top, d });
    }
    more.buildingsAt = at.length;
    drawPins();   /* v2.3.3525: over the pictures, named before the buildings */
    for (const b of at) {
      const d = b.d;
      const opt = { size: 11, weight: 700, color: d.closed ? '#B6C1BE' : INK, subColor: '#8D9B98', subSize: 11 };
      /* one line, else two (a shut one is always its name over "shut");
         under the picture, else over it -- 11 px a line, 3 between */
      const two = d.closed ? null : twoLines(d.name);
      const tries = d.closed ? [[[d.name, 'shut'], false]] : [[[d.name], false]].concat(two ? [[two, true]] : []);
      let ok = false;
      for (const [lines, same] of tries) {
        if (ok) break;
        ok = label(b.x, b.y, lines, Object.assign({}, opt, { below: true, same }));
      }
      for (const [lines, same] of tries) {
        if (ok) break;
        const bh = lines.length > 1 ? 25 : 11;
        ok = label(b.x, b.top - 3 - bh / 2, lines, Object.assign({}, opt, { same }));
        if (ok) more.buildingsOver = (more.buildingsOver || 0) + 1;
      }
      if (ok) more.buildings++;
    }
  }
  drawPins();   /* v2.3.3525: farther out, where the buildings are not drawn */
  /* you, first, so nothing covers you (v2.3.3522: up close in town, after
     the buildings' names, above) */
  if (P) {
    const px = X(P.x), py = Y(P.y);
    const pulse = 10 + 6 * (0.5 + 0.5 * Math.sin(t / 260));
    g.beginPath(); g.arc(px, py, pulse, 0, Math.PI * 2);
    g.lineWidth = 2; g.strokeStyle = 'rgba(234,198,117,0.85)'; g.stroke();
    const f = FACING.indexOf(facing || 'south');
    const a = f >= 0 ? (f * Math.PI) / 4 : Math.PI / 2;
    g.save(); g.translate(px, py); g.rotate(a);
    g.beginPath(); g.moveTo(9, 0); g.lineTo(-6, -6); g.lineTo(-3, 0); g.lineTo(-6, 6); g.closePath();
    g.fillStyle = INK; g.fill(); g.lineWidth = 1.5; g.strokeStyle = HALO; g.stroke();
    g.restore();
    placed.push([px - 18, py - 18, px + 18, py + 18]);
    /* v2.3.3522: "You" under your mark where it clears what is placed (in
       town, the buildings' names), else over it, else under it anyway */
    if (!label(px, py + 12, ['You'], { size: 11, below: true, color: BRASS })
      && !label(px, py - 26.5, ['You'], { size: 11, color: BRASS })) {
      label(px, py + 12, ['You'], { size: 11, below: true, force: true, color: BRASS });
    }
  }
  /* v2.3.3057: the quest's star keeps its own room */
  if (more.quest) { const qx = X(more.quest.x), qy = Y(more.quest.y); placed.push([qx - 11, qy - 11, qx + 11, qy + 11]); }
  /* v2.3.3277: your party's names, next after yours (each under its mark,
     clear of the mark's own room: a label's box starts 2 px above its top) */
  for (const o of partyAt) {
    placed.push([o.x - 9, o.y - 9, o.x + 9, o.y + 9]);
    if (o.name && label(o.x, o.y + 12, [o.name], { size: 11, below: true, weight: 700, color: '#CFE0F7' })) more.partyNames++;
  }
  /* v2.3.3057: in town, every building at its door, named (a shut one dim)
     -- v2.3.3522: drawn first, above, with its picture */
  /* the town (v2.3.3522: its square only while its buildings are not drawn,
     as the minimap has it; its name where it clears theirs) */
  const T = map.hub.town;
  if (!more.buildingsAt) {
    drawGlyph(g, 'town', X(T.x), Y(T.y), 16);   /* v2.3.3780: a house, not a square */
    more.glyphs.town++;
  }
  label(X(T.x), Y(T.y) + 8, [T.name], { size: 13, below: true, color: INK });
  /* the lands, until their stages take over: one line while the whole
     Wheel is on a phone's screen (eight names round a 370 px wheel only fit
     that way, and every land is levels 1-80), their element and levels
     beneath once there is room */
  if (z < AT.stage) {
    for (const L of map.lands) {
      const lines = z < AT.landSub ? [L.name.toUpperCase()] : [L.name.toUpperCase(), `${L.element ? `${L.element} · ` : ''}Lv ${L.levels[0]}–${L.levels[1]}`];
      if (label(X(L.x), Y(L.y), lines, { size: z < AT.landSub ? 12 : 14, subSize: 11 })) counts.lands++;
    }
  }
  /* the gates, and where they lead */
  for (const p of map.places) {
    if (p.kind !== 'gate') continue;
    icon('gate', X(p.x), Y(p.y));
    if (z >= AT.gateName && label(X(p.x), Y(p.y) + 8, [p.name, p.to ? `to ${p.to} · Lv 80–100` : ''].filter(Boolean), { size: 11.5, below: true, subColor: '#D9B8FF' })) counts.gates++;
  }
  if (zr >= AT.commons) label(X(map.hub.commons.x), Y(map.hub.commons.y), [map.hub.commons.name, 'safe, no monsters'], { size: 11.5, weight: 600 });
  /* each land's stages */
  if (z >= AT.stage) {
    for (const st of map.stages) {
      const land = map.names[st.region] || '';
      if (label(X(st.x), Y(st.y), [st.name, `${land} · Lv ${st.levels[0]}–${st.levels[1]}`], { size: z < 3.4 ? 12 : 13.5, subSize: 10.5 })) counts.stages++;
    }
  }
  /* camps and passes, then the landmarks and other places */
  for (const p of map.places) {
    const x = X(p.x), y = Y(p.y);
    if (p.kind === 'camp' && z >= AT.camp) { icon('camp', x, y); if (label(x, y + 8, [p.name, `camp · Lv ${p.level}`], { size: 11, below: true })) counts.camps++; }
    else if (p.kind === 'pass' && z >= AT.pass) { icon('pass', x, y); if (label(x, y + 7, [p.name, `pass · Lv ${p.level}`], { size: 11, below: true, weight: 600 })) counts.passes++; }
    else if (p.kind === 'pass') icon('pass', x, y, 0.8);
    else if (p.kind === 'camp' && z >= 1.5) icon('camp', x, y, 0.8);
  }
  if (z >= AT.site) {
    for (const p of map.places) {
      if (p.kind !== 'landmark' && p.kind !== 'site' && p.kind !== 'falls') continue;
      const x = X(p.x), y = Y(p.y);
      icon(p.kind === 'falls' ? 'landmark' : p.kind, x, y);
      /* v2.3.3540: a dungeon's way in says what it is and its levels, as a
         camp and a pass do -- "the Goo Grotto / dungeon · Lv 1–5" (the
         owner: "I value SIMPLICITY and INTELLIGIBILITY") */
      const dungeon = p.kind === 'landmark' && Array.isArray(p.levels) && wheelDungeonOpen(S, p.region);
      /* v2.3.3573: a party dungeon (the Goo Grotto) says its own level and
         the players it is built for, not the place's levels */
      const lines = dungeon ? [p.name, wheelDungeonLevelsLine(S, p.region, p.levels)] : [p.name];
      if (label(x, y + 7, lines, { size: 11, below: true, weight: 600, color: '#CFF2DE' })) { counts.sites++; if (dungeon) { more.dungeons++; more.dungeonLines.push(lines[1]); } }
    }
  }
  /* v2.3.3057: the bridges and the ponds, named */
  if (zr >= AT.bridge) {
    for (const p of map.places) {
      if (p.kind !== 'bridge' && p.kind !== 'pond') continue;
      const x = X(p.x), y = Y(p.y);
      if (!onScreen(x, y)) continue;
      if (p.kind === 'bridge') {
        g.fillStyle = '#C9A46A'; g.fillRect(x - 6, y - 3, 12, 6);
        g.lineWidth = 1.2; g.strokeStyle = HALO; g.strokeRect(x - 6, y - 3, 12, 6);
        if (label(x, y + 6, [p.name.replace(/^the /, '').replace(/^a bridge$/, 'Bridge')], { size: 10.5, below: true, weight: 600, color: '#F2E4C2' })) more.bridges++;
      } else if (label(x, y, [p.name], { size: 11, weight: 700, color: '#BFE3FF' })) more.ponds++;
    }
  }
  /* v2.3.3057: the bros' names, close in */
  if (zr >= AT.otherName) for (const o of othersAt) if (o.name) label(o.x, o.y + 7, [o.name], { size: 10.5, below: true, weight: 600, color: '#BFF0C8' });
  /* v2.3.3057: "Lv 6–10" in each band, the last thing placed (any label
     above wins its room) */
  if (z >= AT.tierLv) {
    for (const L of map.lands) {
      const T = L.ticks || [];
      for (let i = 0; i + 3 < T.length; i += 2) {
        const t = i / 2 + 1, x = X((T[i] + T[i + 2]) / 2), y = Y((T[i + 1] + T[i + 3]) / 2);
        if (!onScreen(x, y)) continue;
        const lo = (t - 1) * (map.levelsPerTier || 5) + 1, hi = t * (map.levelsPerTier || 5);
        if (label(x, y, [`Lv ${lo}–${hi}`], { size: 10.5, weight: 700, color: '#EAC675' })) more.tierLabels++;
      }
    }
  }
  /* the roads' names, along each at its middle */
  if (z >= AT.road) {
    for (const r of map.routes) {
      if (r.kind === 'rail' || r.pts.length < 4) continue;
      const n = r.pts.length / 2, i = Math.max(0, Math.min(n - 2, Math.floor(n / 2)));
      const x0 = X(r.pts[i * 2]), y0 = Y(r.pts[i * 2 + 1]), x1 = X(r.pts[i * 2 + 2]), y1 = Y(r.pts[i * 2 + 3]);
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      let a = Math.atan2(y1 - y0, x1 - x0);
      if (a > Math.PI / 2) a -= Math.PI; else if (a < -Math.PI / 2) a += Math.PI;
      g.font = 'italic 600 11px system-ui, -apple-system, sans-serif';
      const tw = g.measureText(r.name).width;
      const ext = Math.abs(Math.cos(a)) * tw / 2 + 7, eyt = Math.abs(Math.sin(a)) * tw / 2 + 7;
      if (!free(mx - ext, my - eyt, mx + ext, my + eyt)) continue;
      placed.push([mx - ext, my - eyt, mx + ext, my + eyt]);
      g.save(); g.translate(mx, my); g.rotate(a);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = HALO;
      g.strokeText(r.name, 0, 0); g.fillStyle = r.kind === 'river' ? '#BFE3FF' : '#F2E4C2'; g.fillText(r.name, 0, 0);
      g.restore();
      counts.roads++;
    }
  }
  return { labels: counts, k, more };
}

/* v2.3.3057: a five-pointed star, the quest's (the minimap's gold) */
function starAt(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
  g.fillStyle = C_STAR; g.fill(); g.lineWidth = 1.6; g.strokeStyle = HALO; g.stroke();
}
/* v2.3.3057: a little house, a building's mark in town */
function houseAt(g, x, y, color) {
  g.beginPath();
  g.moveTo(x - 6, y - 1); g.lineTo(x, y - 7); g.lineTo(x + 6, y - 1);
  g.lineTo(x + 5, y - 1); g.lineTo(x + 5, y + 5); g.lineTo(x - 5, y + 5); g.lineTo(x - 5, y - 1);
  g.closePath();
  g.fillStyle = color; g.fill(); g.lineWidth = 1.4; g.strokeStyle = HALO; g.stroke();
}
