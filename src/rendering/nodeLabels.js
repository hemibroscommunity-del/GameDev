/* ═══ v2.3.3040: WHAT A RESOURCE IS, OVER IT ═══
 *
 * Owner, 2026-10-05: "Add hatchet icon above trees you can chop.  Add pickaxe
 * icon above ore you can mine with its name and level.  Same with fish and
 * tree resources to harvest."
 *
 * So every resource you can work -- the ones drawn at all, which is already
 * "you hold its tool" (effectsRenderer's hasGatherTool filter, v2.3.1680) --
 * carries a small dark pill over its art: the TOOL that works it (the bag's
 * own hatchet, pickaxe and rod pictures), WHAT it gives (Copper Ore, Pine
 * Log, Minnow -- the name the bag and the worker use), and the LEVEL it asks
 * (v2.3.3038's GATHER_REQ_LVL, not its tier number), the level in red while
 * yours is below it.
 *
 * WHAT IT REPLACES.  The node already had a tool emoji, a grey tier dot and
 * three proximity tips (effectsRenderer, v2.3.2xx), sized for the 6-12 px
 * resources drawn in code before v2.3.1275: on today's 132-168 px pictures
 * they sat at the art's foot at ~6 CSS px, and the tips at 7 world px.  None
 * of the three said the level a node ASKS, and the dot printed the tier.
 * They are retired in effectsRenderer; this is the one label.
 *
 * SIZED ON THE SCREEN, not in the world, like the monsters' name plates
 * (entityRenderer _fitPlateToZoom): the Wheel is drawn at ~0.6 of a world px
 * per CSS px and the old lands at 1+, and a label in world px would be a
 * different size in each.  `PILL_H` CSS px tall at any zoom, its text
 * rasterised at the screen's own density.
 *
 * NO EMOJI.  Emoji in a stroked Text is a known iOS crash (effectsRenderer's
 * DMG_STYLE_EMOJI note), and the owner's own pictures read better anyway:
 * the icons are the bag's, shrunk to 64 px once at load like lootIcons.js.
 *
 * PRELOADED (CLAUDE.md's law): preloadNodeLabelIcons() is registered in
 * preloadWorldAnimations -- a resource is on screen the moment the intro
 * lifts.  A failed icon never fails the gate: that label is drawn without it.
 *
 * ═══ v2.3.3059: AN ICON EACH, WORDS FOR ONE, GREY WHEN NOT YET ═══
 * Owner, 2026-10-06: "I also think a grayed out icon above whatever the
 * resource is (like pickaxe for lvl 5 blacksteel ore) would be a good cue that
 * it's harvestable but you're not high enough level yet.  I like the idea of
 * listing the name of the resource and what level it requires next to it.  I
 * just don't want the screen to be too busy with text though."  So:
 *   - every resource drawn carries its tool's picture alone, on a small dark
 *     disc (`full` false) -- in colour when your level works it, GREY (the
 *     same picture, greyed once at load: NODE_LABEL_ICONS_GRAY) when it asks
 *     more than you have;
 *   - ONE resource says its name and level beside that picture: the nearest to
 *     you within NODE_NAME_R (nodeNameNode) -- the one you are walking up to;
 *   - the level still red while yours is below it.
 * No filter (a greyed copy, not a ColorMatrixFilter per sprite), and nothing
 * new is loaded: the grey copies are made from the same three pictures.
 *
 * ═══ v2.3.3145: NO ROD OVER THE FISH ═══
 * Owner, 2026-10-07: "Remove the fishing icon above fish but leave the
 * proximity based nameplate in place."  A fishing spot is its fish, seen
 * swimming in the water (wheelNodes.js WheelFish), so a rod's disc over every
 * school only said again what the fish say.  A fishing spot's label is now
 * its NAME PLATE alone (NAME_PLATE_ONLY): the pill with the rod, the name and
 * the level while it is the one resource near you that says them
 * (nodeNameNode), and nothing otherwise.  Trees and veins keep their tool's
 * picture.
 */
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { gatherNeed } from '../data/lifeSkills.js';

const ICON_V = '?v=2.3.1774';   /* InventoryPanel ITEMS_V: the same files, the same cache */
/* The bag's tool pictures, and each one's opaque box in its own pixels
   (measured off the webps' alpha): the rod is a thin line in a wide margin
   and read as a sliver until cropped to it. */
const SRC = {
  tree:     { url: '/icons/items/woodcutting-axe.webp', box: [40, 0, 111, 192] },
  oreVein:  { url: '/icons/items/mining-pickaxe.webp',  box: [13, 0, 166, 192] },
  fishSpot: { url: '/icons/items/fishing-pole.webp',    box: [42, 31, 172, 194] },
};
const SIZE = 64;
export const NODE_LABEL_ICONS = Object.create(null);
/* v2.3.3059: the same pictures greyed, for a resource your level cannot work */
export const NODE_LABEL_ICONS_GRAY = Object.create(null);

function shrink(img, box) {
  const [bx, by, bw, bh] = box;
  const cv = document.createElement('canvas');
  cv.width = SIZE; cv.height = SIZE;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  /* fit the box, centred, keeping its shape */
  const k = Math.min(SIZE / bw, SIZE / bh);
  const w = bw * k, h = bh * k;
  c.drawImage(img, bx, by, bw, bh, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  return cv;
}

/* v2.3.3059: a flat mid grey of the picture -- its light kept, its colour
   gone, pulled toward the middle so it reads as "off" on the dark disc rather
   than as a darker tool -- its alpha untouched */
function greyed(cv) {
  const g = document.createElement('canvas');
  g.width = cv.width; g.height = cv.height;
  const c = g.getContext('2d');
  c.drawImage(cv, 0, 0);
  const d = c.getImageData(0, 0, g.width, g.height);
  const a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const l = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2];
    a[i] = a[i + 1] = a[i + 2] = Math.round(56 + l * 0.6);
  }
  c.putImageData(d, 0, 0);
  return g;
}

function load(key) {
  if (typeof Image === 'undefined') return Promise.resolve();
  const { url, box } = SRC[key];
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => {
        try {
          const cv = shrink(img, box);
          NODE_LABEL_ICONS[key] = Texture.from(cv);
          try { NODE_LABEL_ICONS_GRAY[key] = Texture.from(greyed(cv)); } catch (e) { /* the colour one, dimmed, stands in */ }
        } catch (e) { /* the label shows without it */ }
        resolve();
      };
      if (typeof img.decode === 'function') img.decode().then(done, done); else done();
    };
    img.onerror = () => resolve();
    img.src = url + ICON_V;
  });
}

let _p = null;
/** Registered in preloadWorldAnimations (the global gate). */
export function preloadNodeLabelIcons() {
  if (!_p) _p = Promise.all(Object.keys(SRC).map(load));
  return _p;
}

/* ── the look, in CSS px ── */
const PILL_H = 20;          /* the monsters' plates are 15; this has an icon in it */
const PAD_X = 6;
const ICON_PX = 16;
const GAP = 4;
const FONT = 'Source Sans 3, sans-serif';
const INK = 0x0B1F2D;       /* PLATE_INK, the plates' own */
const BRASS = 0xD8AA58;
const NAME_FILL = '#F4F0E7';
const LV_OK = '#D8AA58';
const LV_LOW = '#FF7A6E';   /* a little lighter than the plates' #D95C54 so it reads on the ink */
const GREY_EDGE = 0x8B9695;  /* v2.3.3059: a locked icon's ring -- the grey of the waiting quest mark */
/* v2.3.3059: how near (world px, to you) the one resource that says its name
   and level must be; the rest show their tool alone */
export const NODE_NAME_R = 260;
/* v2.3.3145: the kinds whose label is the name plate only -- no tool's disc
   when another resource is the one saying its name (the owner: "Remove the
   fishing icon above fish") */
export const NAME_PLATE_ONLY = Object.freeze(new Set(['fishSpot']));
/* v2.3.3059: your bro's box round S.player, world px (the body, and the name
   plate over it) -- a pill with words slides sideways out of it: the one
   resource that says its name is the one you stand at, and the labels' layer
   is under your bro (monsterUi), so at a fishing seat the level was behind
   your body */
const BODY_HALF_W = 20, BODY_UP = 92, BODY_DOWN = 48;
const CLEAR = 6;
const SCALE_MIN = 0.25, SCALE_MAX = 4;
/* how far over the art's top (or the school of fish) the pill's foot sits,
   world px */
export const NODE_LABEL_GAP = 6;

function _dpr() {
  return (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
}

/** The world height of a label at this zoom -- for anything that has to keep
 *  clear of it (the ore's stand-here mark, effectsRenderer). */
export function nodeLabelWorldH(S) {
  const ws = (S && S._worldScaleX) || 1;
  return PILL_H * Math.min(SCALE_MAX, Math.max(SCALE_MIN, 1 / ws));
}

function _build(node) {
  const root = new Container();
  root.label = 'nodeLabel';
  root.eventMode = 'none';
  const bg = new Graphics();
  root.addChild(bg);
  const tex = NODE_LABEL_ICONS[node.nodeType] || null;
  let icon = null;
  if (tex) {
    icon = new Sprite(tex);
    icon.anchor.set(0, 0.5);
    icon.width = ICON_PX; icon.height = ICON_PX;
    root.addChild(icon);
  }
  const name = new Text({ text: '', style: { fontFamily: FONT, fontSize: 12, fontWeight: '800', fill: NAME_FILL } });
  name.anchor.set(0, 0.5);
  root.addChild(name);
  const lv = new Text({ text: '', style: { fontFamily: FONT, fontSize: 11.5, fontWeight: '800', fill: LV_OK } });
  lv.anchor.set(0, 0.5);
  root.addChild(lv);
  root._nl = { bg, icon, name, lv, key: '', scale: 0, res: 0, type: node.nodeType, mode: '', gray: false };
  return root;
}

/* lay the label out in CSS px around (0, -PILL_H/2): its foot at the origin.
   `full`: the pill with the name and the level; else the tool alone on a disc
   (v2.3.3059).  `low`: your level is below the one it asks -- the picture
   grey, the level red. */
function _layout(root, nameStr, lvStr, low, full) {
  const p = root._nl;
  const key = nameStr + '|' + lvStr + '|' + (low ? 1 : 0) + '|' + (full ? 1 : 0);
  if (p.key === key) return;
  p.key = key;
  p.mode = full ? 'full' : 'icon';
  p.gray = !!low;
  const cy = -PILL_H / 2;
  if (p.icon) {
    const t = (low && NODE_LABEL_ICONS_GRAY[p.type]) || NODE_LABEL_ICONS[p.type] || p.icon.texture;
    if (t && p.icon.texture !== t) p.icon.texture = t;
    p.icon.width = ICON_PX; p.icon.height = ICON_PX;
    /* no grey copy (a canvas that would not read back): the colour one, dimmed */
    p.icon.alpha = low && !NODE_LABEL_ICONS_GRAY[p.type] ? 0.45 : 1;
  }
  p.bg.clear();
  if (!full) {
    p.name.visible = false;
    p.lv.visible = false;
    p.bg.circle(0, cy, PILL_H / 2);
    p.bg.fill({ color: INK, alpha: 0.72 });
    p.bg.stroke({ color: low ? GREY_EDGE : BRASS, width: 1, alpha: 0.6 });
    if (p.icon) { p.icon.anchor.set(0.5, 0.5); p.icon.x = 0; p.icon.y = cy; }
    p.w = PILL_H;
    return;
  }
  p.name.visible = true;
  p.lv.visible = true;
  p.name.text = nameStr;
  p.lv.text = lvStr;
  p.lv.style.fill = low ? LV_LOW : LV_OK;
  const iconW = p.icon ? ICON_PX + GAP : 0;
  const w = PAD_X + iconW + p.name.width + GAP + p.lv.width + PAD_X;
  const x0 = -w / 2;
  p.w = w;
  p.bg.roundRect(x0, -PILL_H, w, PILL_H, PILL_H / 2);
  p.bg.fill({ color: INK, alpha: 0.82 });
  p.bg.stroke({ color: low ? 0xD95C54 : BRASS, width: 1, alpha: low ? 0.85 : 0.55 });
  let x = x0 + PAD_X;
  if (p.icon) { p.icon.anchor.set(0, 0.5); p.icon.x = x; p.icon.y = cy; x += ICON_PX + GAP; }
  p.name.x = x; p.name.y = cy;
  x += p.name.width + GAP;
  p.lv.x = x; p.lv.y = cy;
}

/** What a label says for this node and this player: its name, the level it
 *  asks (only what the worker enforces -- gatherNeed reads caps.gatherreq;
 *  against an older worker everything is "Lv 1", which is what it allows),
 *  and whether yours is below it. */
export function nodeLabelText(S, node) {
  const need = gatherNeed(S, node);
  return {
    name: String((node && (node.name || node.baseName)) || ''),
    lvl: need ? need.need : 1,
    low: !!(need && !need.ok),
  };
}

/** v2.3.3059: the ONE resource that says its name and level this frame: the
 *  nearest of `nodes` (those drawn) to you, within NODE_NAME_R; or null. */
export function nodeNameNode(S, nodes) {
  const P = S && S.player;
  if (!P || !nodes || typeof P.x !== 'number') return null;
  let best = null, bd = NODE_NAME_R * NODE_NAME_R;
  for (const n of nodes) {
    if (!n || !n.alive) continue;
    const dx = n.x - P.x, dy = n.y - P.y;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

/** Draw, place or hide the label of one resource.  `at` is the world point
 *  its foot sits on ({x, y}), or null to hide it this frame.  `full`: say the
 *  name and the level too (v2.3.3059: only nodeNameNode's), else the tool
 *  alone -- or, for a NAME_PLATE_ONLY kind (v2.3.3145: a fishing spot),
 *  nothing. */
export function updateNodeLabel(layer, node, S, at, full = true) {
  if (!layer || !node) return;
  let root = node._pixiLabel;
  if (!at || (!full && NAME_PLATE_ONLY.has(node.nodeType))) { if (root && !root.destroyed) root.visible = false; return; }
  if (!root || root.destroyed) {
    root = _build(node);
    node._pixiLabel = root;
    layer.addChild(root);
  } else if (root.parent !== layer) {
    layer.addChild(root);
  }
  const t = nodeLabelText(S, node);
  _layout(root, t.name, 'Lv ' + t.lvl, t.low, !!full);
  /* screen-sized: one CSS px of label is 1/worldScale world px */
  const ws = (S && S._worldScaleX) || 1;
  const s = Math.min(SCALE_MAX, Math.max(SCALE_MIN, 1 / ws));
  const p = root._nl;
  if (p.scale !== s) { p.scale = s; root.scale.set(s); }
  const res = Math.min(4, Math.max(1, _dpr() * s * ws));
  if (p.res !== res) { p.res = res; p.name.resolution = res; p.lv.resolution = res; }
  /* v2.3.3059: a pill with words that would lie over your bro slides out to
     the side away from you, eased so walking past does not snap it */
  let want = 0;
  const P = S && S.player;
  if (full && P && typeof P.x === 'number' && p.mode === 'full') {
    const half = (p.w || 0) * s / 2, top = at.y - PILL_H * s, bot = at.y;
    const bx0 = P.x - BODY_HALF_W, bx1 = P.x + BODY_HALF_W;
    if (bot > P.y - BODY_UP && top < P.y + BODY_DOWN && at.x + half > bx0 && at.x - half < bx1) {
      want = P.x >= at.x ? (bx0 - CLEAR - half) - at.x : (bx1 + CLEAR + half) - at.x;
    }
  }
  p.dx = (p.dx || 0) + (want - (p.dx || 0)) * 0.35;
  if (Math.abs(want - p.dx) < 0.5) p.dx = want;
  root.x = at.x + p.dx;
  root.y = at.y;
  root.visible = true;
}

/** Free one resource's label (effectsRenderer._disposeNode). */
export function killNodeLabel(node) {
  const root = node && node._pixiLabel;
  if (root && !root.destroyed) {
    if (root.parent) root.parent.removeChild(root);
    /* the icon's texture is shared and kept; the Texts' are their own */
    root.destroy({ children: true, texture: false, textureSource: false });
  }
  if (node) node._pixiLabel = null;
}
