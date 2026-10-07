/**
 * ═══ v2.3.2966: THE WHEEL'S MINIMAP ═══
 *
 * Owner, 2026-10-01: "I'm thinking the minimap will need to be larger and
 * the most informative and intuitive it can be for navigation purposes.
 * Maybe tapping it brings up an overlay of a labelled world map.  It would
 * probably help to have areas labelled so players can start memorizing the
 * territory."
 *
 * Only in the Wheel (`?trial=wheel`): MinimapRenderer hands the box over
 * while you are there, and today's zones keep their own (52 px, a flat slab
 * with icons, as the owner asked for them in v2.3.1792 / v2.3.2247).  The
 * Wheel is 42 zones across, and a slab with icons says nothing about where
 * you are in it.  So this one:
 *
 *   - is BOX px (2.5x the zones'), flush in the same top-right corner;
 *   - shows WINDOW game px round you, about three zones across: the land
 *     itself from the worker's overview (its own ground colours, a touch
 *     darker so the marks stand out), the sea, and the roads, the river and
 *     the railway as clean lines over it (wheelmap.js);
 *   - marks the town, the camps, the passes, the gates and the landmarks,
 *     you (a chevron the way you face), other bros and monsters;
 *   - said under it where you are, in words: the land, its stage and the
 *     levels there ("Frost Ridge / the thaw line · Lv 6-10"), from the
 *     worker's answer for the spot under you (wheelHere).  v2.3.3009: the
 *     TOP BAR says it now, in place of "The Wheel (Lv1-2)" (ZoneHeader.jsx
 *     wheelWhere) -- the owner: "It'll free up more room around the
 *     minimap".  The probe below still carries the words;
 *   - v2.3.3009: wears a THICK FRAME, the owner's "give the minimap thicker
 *     borders so it's not confused with game screen area": a dark keyline, a
 *     slate band the colour of the bars, and the brass line it always had,
 *     inside, FRAME px in all, drawn over the map's edge (the box stays BOX
 *     px, the map centred in it as before), and the box is opaque;
 *   - carries a small "expand" mark: tapping the box opens the world map
 *     (src/ui/WorldMapOverlay.jsx, a DOM button laid exactly over this box,
 *     whose place is published here as window.__btWheelMini).
 *   - v2.3.2990: stars the quest's way (questRoute.js questRoutePoint): the
 *     Wheel's Mayor Bro for the welcome or a hand-in, or the middle of a
 *     land's monsters for a quest that names the land.  While the spot is off
 *     the box, the star waits at its edge on the line from you, so the box
 *     says which way however far.  Today's zones star their portals, and the
 *     Wheel has none to star.
 *   - v2.3.2992: and draws the GOLD ROAD to it, from you to the star.  The
 *     owner: "I think I want to remove the footsteps and just rely on the
 *     gold road on the minimap of where to go".  The road on the ground is put
 *     away (questTrailStyle.js GROUND_PATH), so this is the way now.
 *
 *   - v2.3.3108: and SAYS WHERE YOU ARE AGAIN, on a NAME PLATE under the map
 *     -- the owner: "move the zone name and level band beneath the minimap but
 *     I want to reduce the size of the minimap to make room for it (rather
 *     than enlargen it further)", choosing the shorter rectangle.  The box
 *     keeps its 132 x 132 on the page: the map is cut to MAP_BOT px tall and
 *     the frame's slate runs on below it as the plate, two lines -- the
 *     land's element icon and its name in its colour (as the top bar had
 *     them, v2.3.3024), and the level band in gold ("safe" at home).  The
 *     stage's name ("the thaw line") did not fit a phone's 11 px floor in
 *     the 118 px across, so it stays on the world map.  The top bar says
 *     "BroTown" in the Wheel now (ZoneHeader.jsx), and a land's banner docks
 *     into the plate (zoneBannerOverlay.js titleRect, window.__btWheelPlate).
 *
 *   - v2.3.3145: and draws THE TOWN'S BUILDINGS -- the owner: "Also all the
 *     buildings in town should show on the minimap".  The town was one white
 *     square at its middle; now each of its buildings is drawn where it
 *     stands, the ground it stands on (its footprint, from the ground worker's
 *     placed objects: about 17 x 9 px here, the Town Hall 21 x 11) in a roof's
 *     colour, a shut one grey (as the world map has them), each with a light
 *     mark at its door.  The white square stays only for a Wheel whose
 *     buildings are not known (`?noobjects`).
 *
 * PRELOADING: nothing to load.  The overview is a canvas the worker made
 * before the Wheel opened (behind its loading screen); the lines and marks
 * are drawn once from numbers.
 */
import { Container, Graphics, Sprite, Texture, CanvasSource, Text } from 'pixi.js';
import { wheelOverviewLands, wheelMapInfo, wheelHere, wheelObjectsInfo } from '@/game/wheelTrial.js';
import { wheelTownDoors } from '@/game/wheelTownDoors.js';   /* v2.3.3145: the town's buildings */
import { questRoutePoint } from '@/game/questRoute.js';   /* v2.3.2990: the quest's way */
import { hasGatherTool } from '@/data/lifeSkills.js';      /* v2.3.3012: a node is marked as the world draws it */
import { noteWheelLand } from '@/ui/zoneBannerOverlay.js';  /* v2.3.3024: a land's banner as you cross into it */
import { noteNoMansLand } from '@/game/noMansLand.js';       /* v2.3.3058: No man's land's banner */
import { noteWheelMusic } from '@/game/wheelMusic.js';      /* v2.3.3064: ...and its music */
import { BT_AUDIO } from '@/data/gameDisplay.js';
import { landLook } from '@/data/wheelLands.js';           /* v2.3.3108: the plate's land colour */
import { landIconTexture, holdLandIcons, releaseLandIcons } from '../wheelSignposts.js';   /* v2.3.3108: the plate's icon */

export const WHEEL_BOX = 132;      /* CSS px a side (v2.3.3108: across; and tall, the plate included) */
/* v2.3.3108: THE NAME PLATE (the header's note).  The map's window ends
   MAP_BOT px down the box (was the box's own 132 - FRAME); the plate is the
   frame's slate below it, PLATE_PAD in from the box's sides and bottom. */
export const WHEEL_H = WHEEL_BOX;
const MAP_BOT = 92, PLATE_GAP = 3, PLATE_PAD = 4;
const TITLE_PX = 13, SUB_PX = 11, MIN_PX = 11, ICON_PX = 14, ICON_GAP = 4;
const C_PLATE = 0x141d22, C_SUB = 0xeac675, C_TITLE = 0xf7f2e7;
export const WHEEL_WINDOW = 3200;  /* game px across the box: about three zones */
const SCALE = WHEEL_BOX / WHEEL_WINDOW;

const C_SEA = 0x16324a, C_FRAME = 0xd8aa58, C_ROAD = 0xf2e4c2, C_PATH = 0xe6d5ae, C_RIVER = 0x5aaee8, C_RAIL = 0x2b2320;
const C_TOWN = 0xf4f0e7, C_CAMP = 0xeac675, C_GATE = 0xc58cff, C_PASS = 0xf4f0e7, C_LANDMARK = 0x9fe0c0;
const C_PLAYER = 0xf4f0e7, C_OTHER = 0x58b97b, C_MONSTER = 0xe35d5b;
/* v2.3.3009: the frame -- its width over the map's edge, CSS px: a dark
   keyline, a slate band (the bars' panel colour, LANTERN-SLATE) and the brass
   line inside it */
const FRAME = 7, R_BOX = 8, R_IN = 4, C_KEYLINE = 0x0b161b, C_SLATE = 0x202c32, C_SLATE_HI = 0x3a4b55;
/* v2.3.2990: as the zones' minimap stars, held this far in from the box's
   edge -- v2.3.3009: and clear of the frame (was 10) */
const C_QUEST_STAR = 0xf5ce3c, QUEST_STAR_PX = 17, QUEST_EDGE = FRAME + 9;
/* v2.3.2992: the gold road -- its width and its dark casing, CSS px; it
   starts clear of your chevron and is not drawn when the spot is this close */
const ROAD_W = 2.5, ROAD_CASE = 5, ROAD_FROM = 8, ROAD_MIN = 12, C_ROAD_CASE = 0x0b161b;
const FACING_SECTORS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
/* ═══ v2.3.3012: THE RESOURCES NEAR YOU ═══
   Owner: "Show nodes on minimap".  One glyph a kind (minimapRenderer mints
   'ore', 'tree', 'fish'), tinted by its tier as the world draws it: the
   vein's flecks (copper, rust-red iron, black steel -- a blued slate light
   enough to read on the map), the tree's tint (pine, pale softwood, olive
   hardwood), the fish in the water (silver minnows, orange clownfish, olive
   trout).  Small: they sit under the bros, monsters and the quest's star. */
const NODE_ICON = { oreVein: 'ore', tree: 'tree', fishSpot: 'fish' };
/* v2.3.3094: + the second stage's: titanium and obsidian, cedar and maple,
   salmon and pike */
const C_NODE = {
  oreVein: { 1: 0xe08a45, 6: 0xc65f45, 11: 0x8e9ab8, 16: 0xc8d0dc, 21: 0x7a55b5 },
  tree: { 1: 0x58b85a, 6: 0xc6dc6c, 11: 0xa08c52, 16: 0xc0786a, 21: 0xf09a40 },
  fishSpot: { 1: 0xd6e8f5, 6: 0xff8a3a, 11: 0xc4b46a, 16: 0xf09080, 21: 0x8aaa50 },
};
const NODE_PX = 10;
/* ═══ v2.3.3023: THE WAY HOME ═══
   Owner, 2026-10-04: "Right now the world feels hard to navigate without
   losing your sense of position relative to the town center."  The box shows
   about 1,400 game px round you, so Brotown's square left it at the town's
   own gates and nothing on screen said where town was.  Now, whenever town is
   off the box, a HOME BADGE rides the box's inner edge on the line from you
   to the town's centre -- the house on a dark disc, a point on its outer
   side aimed at town -- the way the quest's star rides it (v2.3.2990).  When
   the quest's own way leads to Mayor Bro, in town, the star says it, and the
   badge stands aside. */
const HOME_R = 10, HOME_ICON_PX = 13, C_HOME = 0xf4f0e7, C_HOME_BG = 0x0b161b, C_HOME_RING = 0xd8aa58;
/* ═══ v2.3.3065: NORTH ═══
   Asked how to make the Wheel easier to find your way round, the owner said to
   go on building the list ("Continue building recommended"), and a north mark
   was on it.  The box never turns -- up is always north -- and nothing said so;
   the lands are named by where they lie (Frost Ridge north-west, the Water
   Caves south).  A brass N on a slate bead, set in the middle of the frame's
   top band, where a compass bezel has it.  Its middle is on the band: it
   stands NORTH_UP above the box and reaches 3 px past the band into the map,
   so the quest's star riding the top edge (QUEST_EDGE in) loses only its
   tip under it. */
const NORTH_R = 6.5, NORTH_Y = FRAME / 2, NORTH_FONT = 9, NORTH_UP = NORTH_R - NORTH_Y;
/* ═══ v2.3.3145: THE TOWN'S BUILDINGS (the header's note) ═══
   A roof's terracotta on the town's tan ground, under a dark keyline; a shut
   one (nothing behind its door yet) the world map's grey; the door a light
   notch on the footprint's front edge, where the building's steps are. */
const C_BUILDING = 0xa4553a, C_BUILDING_SHUT = 0x7d8a88, C_BUILDING_KEY = 0x0b161b, C_DOOR = 0xf2e4c2;
const DOOR_W = 3.5, DOOR_H = 2;

/* v2.3.3108: the land's colour lifted toward white to read on the dark plate,
   as the top bar had it (ZoneHeader.jsx landTint, k 0.42) */
function landTintHex(hex, k = 0.42) {
  const v = parseInt(String(hex).slice(1), 16);
  const f = (c) => Math.round(c + (255 - c) * k);
  return (f((v >> 16) & 255) << 16) | (f((v >> 8) & 255) << 8) | f(v & 255);
}

export class WheelMinimap {
  constructor(hudLayer, icons, dotTex) {
    this.icons = icons || {};
    this.dotTex = dotTex;
    this.root = new Container();
    this.root.label = 'wheel-minimap';
    this.root.visible = false;
    /* v2.3.3009: opaque (was 0.92): the world showing through it is part of
       what made it read as more of the game screen */
    this.root.alpha = 1;
    hudLayer.addChild(this.root);

    const shadow = new Graphics().roundRect(-2, -2, WHEEL_BOX + 4, WHEEL_H + 4, R_BOX + 2).fill({ color: 0x000000, alpha: 0.45 });
    const bg = new Graphics().roundRect(0, 0, WHEEL_BOX, MAP_BOT + R_IN, R_BOX).fill(C_SEA);
    this.root.addChild(shadow, bg);
    this.clip = new Container();
    this.root.addChild(this.clip);
    this.pan = new Container();
    this.clip.addChild(this.pan);
    /* v2.3.3108: the map's window only -- the plate below is the frame's */
    const mask = new Graphics().roundRect(0, 0, WHEEL_BOX, MAP_BOT + R_IN, R_BOX).fill(0xffffff);
    this.root.addChild(mask);
    this.clip.mask = mask;
    this.lines = new Graphics();     /* roads, river, railway: drawn once */
    this.buildings = new Graphics(); /* v2.3.3145: the town's buildings: drawn once their places are known */
    this.places = new Graphics();    /* camps, passes, gates, landmarks: drawn once */
    this.townMark = new Graphics();  /* the town's square: v2.3.3145, only while its buildings are not known */
    this.marks = new Container();    /* bros and monsters: every frame */
    this.road = new Graphics();      /* v2.3.2992: the gold road to the quest's star: every frame */
    this.pan.addChild(this.lines, this.buildings, this.places, this.townMark, this.road, this.marks);
    this.player = new Sprite(this.icons.self || this.dotTex);
    this.player.anchor.set(0.5);
    this.player.width = 15; this.player.height = 15;
    this.player.tint = C_PLAYER;
    this.pan.addChild(this.player);
    /* v2.3.3009: the thick frame (was one 1.5 px brass line at 0.85): a
       ring FRAME px wide drawn over the map's edge -- the slate band with a
       lighter top-left lip, a dark keyline outside and in, and the brass line
       just inside it -- so the box reads as a panel, not a hole in the world */
    /* v2.3.3108: the box is B across and WHEEL_H tall; the map's window
       (the cut) ends at MAP_BOT and the slate runs on below it as the plate */
    const B = WHEEL_BOX, H = WHEEL_H, IN = B - 2 * FRAME, MH = MAP_BOT - FRAME;
    const border = new Graphics();
    border.roundRect(0, 0, B, H, R_BOX).fill(C_SLATE)
      .roundRect(FRAME, FRAME, IN, MH, R_IN).cut();
    border.moveTo(2.25, H - R_BOX).lineTo(2.25, R_BOX).arcTo(2.25, 2.25, R_BOX, 2.25, R_BOX - 2.25).lineTo(B - R_BOX, 2.25)
      .stroke({ width: 1.5, color: C_SLATE_HI, cap: 'round' });
    border.roundRect(0.75, 0.75, B - 1.5, H - 1.5, R_BOX).stroke({ width: 1.5, color: C_KEYLINE });
    border.roundRect(FRAME - 0.9, FRAME - 0.9, IN + 1.8, MH + 1.8, R_IN + 1).stroke({ width: 1.8, color: C_FRAME });
    border.roundRect(FRAME + 0.5, FRAME + 0.5, IN - 1, MH - 1, R_IN).stroke({ width: 1, color: C_KEYLINE, alpha: 0.55 });
    /* the plate: a darker well in the slate, as the bars' inset readouts */
    const PT = MAP_BOT + PLATE_GAP, PH = H - PLATE_PAD - PT;
    border.roundRect(PLATE_PAD, PT, B - 2 * PLATE_PAD, PH, R_IN).fill(C_PLATE)
      .stroke({ width: 1, color: C_KEYLINE, alpha: 0.8 });
    this._plateBox = { x: PLATE_PAD, y: PT, w: B - 2 * PLATE_PAD, h: PH };
    /* the "tap me" mark: two corner arrows, bottom left (v2.3.3009: inside
       the frame) */
    const expand = new Graphics();
    const ex = FRAME + 5, ey = MAP_BOT - 17;   /* v2.3.3108: the map's corner (was the box's) */
    expand.roundRect(ex - 2, ey - 2, 16, 16, 4).fill({ color: 0x0b161b, alpha: 0.7 });
    expand.moveTo(ex + 2, ey + 6).lineTo(ex + 2, ey + 2).lineTo(ex + 6, ey + 2)
      .moveTo(ex + 10, ey + 6).lineTo(ex + 10, ey + 10).lineTo(ex + 6, ey + 10)
      .moveTo(ex + 2, ey + 2).lineTo(ex + 5, ey + 5).moveTo(ex + 10, ey + 10).lineTo(ex + 7, ey + 7)
      .stroke({ width: 1.5, color: C_FRAME, cap: 'round', join: 'round' });
    this.root.addChild(border, expand);
    /* v2.3.3065: north (NORTH, above) -- fixed to the box, over the frame */
    this.north = new Container();
    this.north.label = 'wheel-minimap-north';
    const nBead = new Graphics();
    nBead.circle(0, 0, NORTH_R + 0.75).fill(C_KEYLINE)
      .circle(0, 0, NORTH_R).fill(C_SLATE).stroke({ width: 1.4, color: C_FRAME });
    const nRes = Math.min(4, Math.max(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
    const nText = new Text({ text: 'N', resolution: nRes, style: {
      fontFamily: 'Source Sans 3, sans-serif', fontSize: NORTH_FONT, fontWeight: '900', fill: C_FRAME,
    } });
    nText.anchor.set(0.5, 0.5);
    nText.y = 0.25;
    this.north.addChild(nBead, nText);
    this.north.x = WHEEL_BOX / 2;
    this.north.y = NORTH_Y;
    this.root.addChild(this.north);
    /* v2.3.3023: the way home (THE WAY HOME, above) -- over the frame, as the
       badge rides its inner edge */
    this.home = new Container();
    this.home.label = 'wheel-minimap-home';
    this.homeDisc = new Graphics();
    this.homeDisc.circle(0, 0, HOME_R).fill({ color: C_HOME_BG, alpha: 0.88 }).stroke({ width: 1.5, color: C_HOME_RING });
    this.homePoint = new Graphics();
    this.homePoint.poly([HOME_R + 5.5, 0, HOME_R - 1, -4.5, HOME_R - 1, 4.5]).fill(C_HOME_RING).stroke({ width: 1, color: C_HOME_BG });
    this.homeIcon = new Sprite(this.icons.house || this.dotTex);
    this.homeIcon.anchor.set(0.5);
    this.homeIcon.width = HOME_ICON_PX; this.homeIcon.height = HOME_ICON_PX;
    this.homeIcon.tint = C_HOME;
    this.home.addChild(this.homePoint, this.homeDisc, this.homeIcon);
    this.home.visible = false;
    this.root.addChild(this.home);

    /* v2.3.3009: the words that were printed under the box went to the top
       bar (ZoneHeader.jsx wheelWhere) -- and v2.3.3108 brought them back, on
       the plate: the land's icon and name, then the level band */
    const tRes = Math.min(4, Math.max(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
    this.plate = new Container();
    this.plate.label = 'wheel-minimap-plate';
    this.plateIcon = new Sprite(Texture.EMPTY);
    this.plateIcon.anchor.set(0, 0.5);
    this.plateIcon.visible = false;
    this.plateTitle = new Text({ text: '', resolution: tRes, style: {
      fontFamily: 'Source Sans 3, sans-serif', fontSize: TITLE_PX, fontWeight: '800', fill: C_TITLE,
    } });
    this.plateTitle.anchor.set(0, 0.5);
    this.plateSub = new Text({ text: '', resolution: tRes, style: {
      fontFamily: 'Source Sans 3, sans-serif', fontSize: SUB_PX, fontWeight: '700', fill: C_SUB,
    } });
    this.plateSub.anchor.set(0.5, 0.5);
    this.plate.addChild(this.plateIcon, this.plateTitle, this.plateSub);
    this.root.addChild(this.plate);
    this._plateKey = '';
    this._plateOut = null;
    this._lastWords = null;
    /* the icons are the signposts' and go when you leave the Wheel: let go of
       ours first (a sprite on a destroyed texture throws in the next render) */
    this._iconHold = { clear: () => { this.plateIcon.texture = Texture.EMPTY; this.plateIcon.visible = false; this._plateKey = ''; } };
    holdLandIcons(this._iconHold);

    this.pool = [];
    this.used = 0;
    this._doorsFor = null;  /* v2.3.3145: the doors the buildings were drawn from */
    this._bld = [];         /* ...and what was drawn, for the probe */
    this.built = null;      /* the map the lines were drawn from */
    this.under = null;      /* the overview sprite */
    this._rectFor = '';
  }

  hide() {
    if (this.root.visible) this.root.visible = false;
    this._lastWords = null;
    try { if (window.__btWheelMini) window.__btWheelMini = null; } catch (e) { /* no page */ }
    try { if (window.__btWheelPlate) window.__btWheelPlate = null; } catch (e) { /* no page */ }
  }

  /* v2.3.3108: the name plate's two lines, redrawn only when they change.
     `w` the worker's words for the spot under you ({title, sub}), kept while
     you are over open water (no land, no words) so the plate never blinks;
     `region` its land.  No man's land is its own badge over the dashboard's
     middle (v2.3.3107, ui/mobile/NmlBadge.jsx), so the plate keeps the
     level band there too. */
  _plate(w, region) {
    if (w && w.title) this._lastWords = { title: w.title, sub: w.sub || '', region: region || null };
    const at = this._lastWords;
    const look = at ? landLook(at.region) : null;
    const icon = look && look.element ? landIconTexture(at.region) : null;
    /* the level band alone: the stage's name before it did not fit (the
       header's note); "safe" and "safe, no monsters" at home as they were */
    let sub = at ? at.sub : '';
    const lv = /Lv \d+[–-]\d+/.exec(sub);
    if (lv) sub = lv[0];
    const key = at ? `${at.title}|${sub}|${at.region}|${icon ? 1 : 0}` : '';
    if (key === this._plateKey) return this._plateOut;
    this._plateKey = key;
    const P = this._plateBox, avail = P.w - 8;
    const T = this.plateTitle, U = this.plateSub, I = this.plateIcon;
    T.text = at ? at.title : '';
    T.style.fill = look && look.element ? landTintHex(look.color) : C_TITLE;
    U.text = sub;
    U.style.fill = C_SUB;
    I.visible = !!icon;
    if (icon) { I.texture = icon; I.width = ICON_PX; I.height = ICON_PX; }
    /* fit: a long name ("Electric Foundry") steps down to the 11 px floor,
       and only past that is it narrowed */
    const iconW = icon ? ICON_PX + ICON_GAP : 0;
    let px = TITLE_PX;
    T.style.fontSize = px; T.scale.x = 1;
    while (px > MIN_PX && iconW + T.width > avail) { px -= 0.5; T.style.fontSize = px; }
    if (iconW + T.width > avail) T.scale.x = (avail - iconW) / T.width;
    U.style.fontSize = SUB_PX; U.scale.x = 1;
    if (U.width > avail) U.scale.x = avail / U.width;
    const rowW = iconW + T.width;
    const x0 = P.x + (P.w - rowW) / 2, y1 = P.y + P.h * 0.32, y2 = P.y + P.h * 0.74;
    I.x = Math.round(x0); I.y = Math.round(y1);
    T.x = Math.round(x0 + iconW); T.y = Math.round(y1);
    U.x = Math.round(P.x + P.w / 2); U.y = Math.round(y2);
    this._plateOut = { title: T.text, sub: U.text, land: at ? at.region : null, icon: !!icon, red: false,
      color: '#' + Number(T.style.fill).toString(16).padStart(6, '0'),
      titlePx: px, subPx: SUB_PX, squeezed: T.scale.x < 1 || U.scale.x < 1,
      fits: rowW <= avail + 0.5 && U.width <= avail + 0.5, y: P.y, h: P.h };
    return this._plateOut;
  }

  /* the lines and places, once per map */
  _build(map) {
    this.built = map;
    const L = this.lines;
    L.clear();
    const path = (pts) => { L.moveTo(pts[0] * SCALE, pts[1] * SCALE); for (let i = 2; i < pts.length; i += 2) L.lineTo(pts[i] * SCALE, pts[i + 1] * SCALE); };
    const draw = (want, style) => {
      let any = false;
      for (const r of map.routes) if (want(r) && r.pts.length >= 4) { path(r.pts); any = true; }
      if (any) L.stroke({ cap: 'round', join: 'round', ...style });
    };
    draw((r) => r.kind === 'river', { width: 2.6, color: C_RIVER, alpha: 0.95 });
    draw((r) => r.kind === 'rail', { width: 1.2, color: C_RAIL, alpha: 0.9 });
    draw((r) => r.kind === 'road' && !r.trunk, { width: 1.4, color: C_PATH, alpha: 0.85 });
    draw((r) => r.kind === 'road' && r.trunk, { width: 2.2, color: C_ROAD, alpha: 0.95 });
    const P = this.places;
    P.clear();
    for (const p of map.places) {
      const x = p.x * SCALE, y = p.y * SCALE;
      if (p.kind === 'camp') P.poly([x, y - 5, x + 5, y + 4, x - 5, y + 4]).fill(C_CAMP).stroke({ width: 1, color: 0x0b161b });
      else if (p.kind === 'gate') P.circle(x, y, 5).fill(C_GATE).stroke({ width: 1.2, color: 0x0b161b });
      else if (p.kind === 'pass') P.poly([x, y - 4, x + 4, y, x, y + 4, x - 4, y]).fill(C_PASS).stroke({ width: 1, color: 0x0b161b });
      else if (p.kind === 'landmark') P.circle(x, y, 4).fill(C_LANDMARK).stroke({ width: 1, color: 0x0b161b });
    }
    /* the town's square: v2.3.3145, only while its buildings are not known
       (_buildTown draws them, and puts it away) */
    const t = map.hub.town;
    this.townMark.clear();
    this.townMark.rect(t.x * SCALE - 5, t.y * SCALE - 5, 10, 10).fill(C_TOWN).stroke({ width: 1.2, color: 0x0b161b });
    this.townMark.visible = !this._bld.length;
  }

  /* ═══ v2.3.3145: THE TOWN'S BUILDINGS (the header's note) ═══
     Once per set of doors the ground worker posts (wheelTownDoors, one per
     standing building, the foot of its steps): each building's footprint --
     its placed object's boxes, the ground it stops you on, which is the
     ground it stands on -- and its door.  [] before the worker has posted
     its objects, or with `?noobjects`: then the town is its square again. */
  _buildTown(doors) {
    this._doorsFor = Array.isArray(doors) && doors.length ? doors : null;
    const G = this.buildings;
    G.clear();
    this._bld = [];
    const info = wheelObjectsInfo();
    if (info && info.kinds && info.boxOf && info.boxes && Array.isArray(doors) && doors.length) {
      /* each building kind's first placed object: a building stands once */
      const want = new Map(doors.map((d) => [info.kinds.indexOf(d.id), d]));
      want.delete(-1);
      const seen = new Set();
      for (let i = 0; i < info.n && seen.size < want.size; i++) {
        const k = info.kind[i];
        const d = want.get(k);
        if (!d || seen.has(k)) continue;
        seen.add(k);
        const b0 = info.boxOf[i], b1 = info.boxOf[i + 1];
        if (!(b1 > b0)) continue;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let b = b0; b < b1; b++) {
          const q = 4 * b;
          x0 = Math.min(x0, info.boxes[q]); y0 = Math.min(y0, info.boxes[q + 1]);
          x1 = Math.max(x1, info.boxes[q + 2]); y1 = Math.max(y1, info.boxes[q + 3]);
        }
        if (!isFinite(x0) || !(x1 > x0) || !(y1 > y0)) continue;
        const bx = x0 * SCALE, by = y0 * SCALE, bw = (x1 - x0) * SCALE, bh = (y1 - y0) * SCALE;
        G.rect(bx, by, bw, bh).fill(d.closed ? C_BUILDING_SHUT : C_BUILDING)
          .stroke({ width: 1, color: C_BUILDING_KEY, alpha: 0.9 });
        /* the door: a notch on the front edge, at the foot of its steps */
        const dx = Math.max(bx + 1, Math.min(bx + bw - 1 - DOOR_W, d.x * SCALE - DOOR_W / 2));
        G.rect(dx, by + bh - DOOR_H, DOOR_W, DOOR_H).fill(C_DOOR);
        this._bld.push({ id: d.id, closed: !!d.closed, x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1),
          w: +bw.toFixed(1), h: +bh.toFixed(1), doorX: Math.round(d.x), doorY: Math.round(d.y) });
      }
    }
    this.townMark.visible = !this._bld.length;
  }

  _placeUnder(map) {
    if (this.under) return;
    /* v2.3.3024: each land one flat colour (wheelTrial.js landsCanvas; the
       owner: "There might need to be flat colors on the minimap to help
       orient you to what elemental zone you're in") */
    const c = wheelOverviewLands();
    if (!c || !c.width) return;
    /* a fresh source, as wheelGround.js makes its own (never Texture.from
       a canvas: that one is cached by the canvas and shared) */
    const tex = new Texture({ source: new CanvasSource({ resource: c, width: c.width, height: c.height, resolution: 1, scaleMode: 'linear' }) });
    const s = new Sprite(tex);
    s.width = map.worldW * SCALE; s.height = map.worldH * SCALE;
    /* a touch darker than the ground, so every mark on it reads --
       v2.3.3024: the flat land colours a lighter touch (they are mid-tones
       already) */
    s.tint = 0xdadada;
    this.pan.addChildAt(s, 0);
    this.under = s;
  }

  _dropUnder() {
    if (!this.under) return;
    const s = this.under;
    this.under = null;
    try { s.destroy({ texture: true, textureSource: true }); } catch (e) { /* gone */ }
  }

  _mark(x, y, icon, color, px) {
    let s = this.pool[this.used];
    if (!s) { s = new Sprite(this.dotTex); s.anchor.set(0.5); this.marks.addChild(s); this.pool.push(s); }
    s.texture = (icon && this.icons[icon]) || this.dotTex;
    s.width = px; s.height = px;
    s.tint = color;
    s.x = x * SCALE; s.y = y * SCALE;
    s.visible = true;
    this.used++;
  }

  update(S, cssW, cssH, canvas, topInset) {
    const P = S && S.player;
    const map = wheelMapInfo();
    if (!P || !map) { this.hide(); return; }
    /* a new map is a new Wheel (left and come back): its overview is a new
       canvas too */
    if (this.built !== map) { this._build(map); this._dropUnder(); }
    this._placeUnder(map);
    /* v2.3.3145: the town's buildings, once their doors are known (the same
       array until the worker posts new objects) */
    let doors = [];
    try { doors = wheelTownDoors(); } catch (e) { doors = []; }
    /* (none yet is a fresh [] on every call: nothing to redraw for it) */
    if ((doors.length ? doors : null) !== this._doorsFor) this._buildTown(doors);

    /* centred on you, held at the world's edge like the camera */
    const spanW = map.worldW * SCALE, spanH = map.worldH * SCALE;
    /* v2.3.3108: centred in the map's window, above the plate */
    const winMidY = (FRAME + MAP_BOT) / 2;
    this.pan.x = Math.max(WHEEL_BOX - spanW, Math.min(0, WHEEL_BOX / 2 - P.x * SCALE));
    this.pan.y = Math.max(MAP_BOT - spanH, Math.min(0, winMidY - P.y * SCALE));
    this.root.x = Math.round(cssW - WHEEL_BOX);
    this.root.y = topInset;
    this.root.visible = true;

    this.used = 0;
    /* v2.3.3012: the resources first, under everything else -- the live ones
       you hold the tool for, as the world draws them (effectsRenderer,
       v2.3.1680: a node you cannot work is not drawn), and only those the box
       can reach (it shows WHEEL_WINDOW round you) */
    let nodeMarks = 0;
    const nodes = S.gatherNodes || [];
    const reach = WHEEL_WINDOW * 0.6;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n || !n.alive || !NODE_ICON[n.nodeType]) continue;
      if (Math.abs(n.x - P.x) > reach || Math.abs(n.y - P.y) > reach) continue;
      if (!hasGatherTool(S.rpg || null, n.nodeType)) continue;
      const lvl = n.gatherLvl || 1, tier = lvl >= 21 ? 21 : lvl >= 16 ? 16 : lvl >= 11 ? 11 : lvl >= 6 ? 6 : 1;   /* v2.3.3094: + 16, 21 */
      this._mark(n.x, n.y, NODE_ICON[n.nodeType], C_NODE[n.nodeType][tier], NODE_PX);
      nodeMarks++;
    }
    /* other bros and monsters */
    const others = S.others;
    if (others) for (const id in others) { const o = others[id]; if (o && (o.zone || o.z) === S.currentZone) this._mark(o.x, o.y, 'player', C_OTHER, 13); }
    const mons = S.monsters || [];
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (!m || m.alive === false || m.dead || (m.hp != null && m.hp <= 0)) continue;
      this._mark(m.x, m.y, 'monster', C_MONSTER, 12);
    }
    /* v2.3.2990: the quest's way (above the bros and monsters: drawn last) */
    let quest = null;
    try { quest = questRoutePoint(S.currentZone, S.rpg || null, S); } catch (e) { quest = null; }
    let questEdge = false, road = null;
    this.road.clear();
    if (quest) {
      const pbx = P.x * SCALE + this.pan.x, pby = P.y * SCALE + this.pan.y;
      const dx = quest.x * SCALE + this.pan.x - pbx, dy = quest.y * SCALE + this.pan.y - pby;
      const lo = QUEST_EDGE, hi = WHEEL_BOX - QUEST_EDGE, hiY = MAP_BOT - (QUEST_EDGE - FRAME);   /* v2.3.3108: the map's bottom */
      let t = 1;
      if (dx > 0) t = Math.min(t, (hi - pbx) / dx); else if (dx < 0) t = Math.min(t, (lo - pbx) / dx);
      if (dy > 0) t = Math.min(t, (hiY - pby) / dy); else if (dy < 0) t = Math.min(t, (lo - pby) / dy);
      t = Math.max(0, t);
      questEdge = t < 1;
      /* v2.3.2992: the gold road, you to the star (in the pan's own px, as
         everything here is), cased dark so it reads on any ground */
      const L = Math.hypot(dx, dy) * t;
      if (L > ROAD_MIN) {
        const ux = dx / Math.hypot(dx, dy), uy = dy / Math.hypot(dx, dy);
        const x0 = P.x * SCALE + ux * ROAD_FROM, y0 = P.y * SCALE + uy * ROAD_FROM;
        const x1 = P.x * SCALE + dx * t, y1 = P.y * SCALE + dy * t;
        this.road.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: ROAD_CASE, color: C_ROAD_CASE, alpha: 0.55, cap: 'round' });
        this.road.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: ROAD_W, color: C_QUEST_STAR, alpha: 0.95, cap: 'round' });
        road = { len: Math.round(L - ROAD_FROM), x0: Math.round(x0 + this.pan.x), y0: Math.round(y0 + this.pan.y), x1: Math.round(x1 + this.pan.x), y1: Math.round(y1 + this.pan.y) };
      }
      this._mark((pbx + dx * t - this.pan.x) / SCALE, (pby + dy * t - this.pan.y) / SCALE, 'star', C_QUEST_STAR, QUEST_STAR_PX);
    }
    for (let i = this.used; i < this.pool.length; i++) this.pool[i].visible = false;
    /* v2.3.3023: the way home -- when the town's centre is off the box, its
       badge on the box's inner edge, on the line from you to it (the quest's
       clamp, a badge's width further in), its point aimed at town; aside
       while the quest's star leads to Mayor Bro, who stands there */
    let home = null;
    {
      const T = map.hub.town;
      const pbx = P.x * SCALE + this.pan.x, pby = P.y * SCALE + this.pan.y;
      const dx = (T.x - P.x) * SCALE, dy = (T.y - P.y) * SCALE;
      const lo = QUEST_EDGE + 1, hi = WHEEL_BOX - QUEST_EDGE - 1, hiY = MAP_BOT - (QUEST_EDGE - FRAME) - 1;   /* v2.3.3108 */
      let t = 1;
      if (dx > 0) t = Math.min(t, (hi - pbx) / dx); else if (dx < 0) t = Math.min(t, (lo - pbx) / dx);
      if (dy > 0) t = Math.min(t, (hiY - pby) / dy); else if (dy < 0) t = Math.min(t, (lo - pby) / dy);
      t = Math.max(0, t);
      const mayor = !!(quest && quest.npc === 'Mayor Bro');
      const show = t < 1 && !mayor && Math.hypot(dx, dy) > 1;
      this.home.visible = show;
      if (show) {
        let hx = pbx + dx * t, hy = pby + dy * t;
        /* clear of the "tap me" mark in the bottom-left corner: slid along
           the edge it rides, away from the corner */
        const ex1 = FRAME + 5 + 14 + HOME_R + 2, ey0 = MAP_BOT - 17 - 2 - HOME_R - 2;   /* v2.3.3108: the map's corner */
        if (hx < ex1 && hy > ey0) {
          if (hy >= hiY - 0.5) hx = ex1; else hy = ey0;
        }
        this.home.x = Math.round(hx);
        this.home.y = Math.round(hy);
        this.homePoint.rotation = Math.atan2(T.y * SCALE + this.pan.y - hy, T.x * SCALE + this.pan.x - hx);
      }
      const deg = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360);
      home = { edge: t < 1, shown: show, x: show ? this.home.x : null, y: show ? this.home.y : null, deg, dist: Math.round(Math.hypot(T.x - P.x, T.y - P.y)), aside: mayor && t < 1 };
    }
    const f = FACING_SECTORS.indexOf(S._renderFacing || 'south');
    this.player.x = P.x * SCALE; this.player.y = P.y * SCALE;
    this.player.rotation = f >= 0 ? f * Math.PI / 4 + Math.PI / 2 : 0;

    /* where you are, in words: v2.3.3108 on the plate again (the top bar had
       them from v2.3.3009) */
    const here = wheelHere(P.x, P.y);
    const w = here && here.words;
    let plate = null;
    try { plate = this._plate(w, here ? here.region : null); } catch (e) { plate = null; }
    /* v2.3.3024: crossing into an elemental land plays its banner
       (zoneBannerOverlay.js noteWheelLand; this frame is the one that asks
       where you are every frame) */
    try { noteWheelLand(here ? here.region : null, w ? w.title : null, S); } catch (e) { /* never breaks the frame */ }
    /* v2.3.3058: and No man's land's banner and lines (src/game/noMansLand.js) */
    try { noteNoMansLand(S); } catch (e) { /* never breaks the frame */ }
    /* v2.3.3064: ...and its music (game/wheelMusic.js) */
    try { noteWheelMusic(here, S, BT_AUDIO); } catch (e) { /* sound only */ }

    /* the box's place on the page, for the button that opens the world map */
    try {
      const rk = `${cssW}x${cssH}x${this.root.y}`;
      if (rk !== this._rectFor) {
        this._rectFor = rk;
        const c = (canvas || document.querySelector('canvas')).getBoundingClientRect();
        this._rect = { left: Math.round(c.left + this.root.x), top: Math.round(c.top + this.root.y), w: WHEEL_BOX, h: WHEEL_H };
        /* v2.3.3108: the plate's own box, where a land's banner docks */
        const pb = this._plateBox;
        this._plateRect = { left: this._rect.left + pb.x, top: this._rect.top + pb.y, width: pb.w, height: pb.h };
      }
      window.__btWheelMini = this._rect;
      window.__btWheelPlate = this._plateRect;
      /* QA probe (tools/qa/mp/mp-wheelmap.mjs) */
      window.__btMinimap = {
        wheel: true, visible: true, zone: S.currentZone, box: WHEEL_BOX, window: WHEEL_WINDOW,
        rootX: this.root.x, topInset: this.root.y, panX: this.pan.x, panY: this.pan.y,
        playerBoxX: P.x * SCALE + this.pan.x, playerBoxY: P.y * SCALE + this.pan.y,
        facingRot: this.player.rotation, markers: this.used, under: !!this.under,
        routes: map.routes.length, places: map.places.length, words: w ? { ...w } : null,
        nodes: nodeMarks,   /* v2.3.3012: the resources marked */
        frame: FRAME, label: false,   /* v2.3.3009: the frame's width; nothing printed under the box */
        /* v2.3.3108: the map's window ends here, and the plate's two lines */
        h: WHEEL_H, mapBottom: MAP_BOT, plate: plate ? { ...plate, rect: this._plateRect || null } : null,
        quest: quest ? { x: Math.round(quest.x), y: Math.round(quest.y), npc: quest.npc || null, zoneId: quest.zoneId || null, edge: questEdge, road } : null,
        /* v2.3.3023: the way home: whether town is off the box, whether its
           badge shows (and where, in the box), town's bearing from you
           (degrees, 0 east, 90 south) and how far, game px */
        home,
        /* v2.3.3065: the north bead, in the box (its middle and radius) */
        north: { x: this.north.x, y: this.north.y, r: NORTH_R, up: NORTH_UP, text: 'N', visible: !!this.north.visible },
        /* v2.3.3145: the town's buildings drawn (game px boxes, their size in
           the box, their doors), and whether the town's square still shows */
        buildings: this._bld.map((b) => ({ ...b })), townMark: !!this.townMark.visible,
        scale: SCALE,
      };
    } catch (e) { /* never breaks the frame */ }
  }

  destroy() {
    releaseLandIcons(this._iconHold);
    try { if (window.__btWheelPlate) window.__btWheelPlate = null; } catch (e) { /* no page */ }
    this._dropUnder();
    try { this.root.destroy({ children: true }); } catch (e) { /* gone */ }
    this.pool = [];
  }
}
