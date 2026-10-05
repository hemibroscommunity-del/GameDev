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
  return Texture.from(cv);
}

function load(key) {
  if (typeof Image === 'undefined') return Promise.resolve();
  const { url, box } = SRC[key];
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => { try { NODE_LABEL_ICONS[key] = shrink(img, box); } catch (e) { /* the label shows without it */ } resolve(); };
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
  root._nl = { bg, icon, name, lv, key: '', scale: 0, res: 0 };
  return root;
}

/* lay the pill out in CSS px around (0, -PILL_H/2): its foot at the origin */
function _layout(root, nameStr, lvStr, low) {
  const p = root._nl;
  const key = nameStr + '|' + lvStr + '|' + (low ? 1 : 0);
  if (p.key === key) return;
  p.key = key;
  p.name.text = nameStr;
  p.lv.text = lvStr;
  p.lv.style.fill = low ? LV_LOW : LV_OK;
  const iconW = p.icon ? ICON_PX + GAP : 0;
  const w = PAD_X + iconW + p.name.width + GAP + p.lv.width + PAD_X;
  const x0 = -w / 2, cy = -PILL_H / 2;
  p.bg.clear();
  p.bg.roundRect(x0, -PILL_H, w, PILL_H, PILL_H / 2);
  p.bg.fill({ color: INK, alpha: 0.82 });
  p.bg.stroke({ color: low ? 0xD95C54 : BRASS, width: 1, alpha: low ? 0.85 : 0.55 });
  let x = x0 + PAD_X;
  if (p.icon) { p.icon.x = x; p.icon.y = cy; x += ICON_PX + GAP; }
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

/** Draw, place or hide the label of one resource.  `at` is the world point
 *  its foot sits on ({x, y}), or null to hide it this frame. */
export function updateNodeLabel(layer, node, S, at) {
  if (!layer || !node) return;
  let root = node._pixiLabel;
  if (!at) { if (root && !root.destroyed) root.visible = false; return; }
  if (!root || root.destroyed) {
    root = _build(node);
    node._pixiLabel = root;
    layer.addChild(root);
  } else if (root.parent !== layer) {
    layer.addChild(root);
  }
  const t = nodeLabelText(S, node);
  _layout(root, t.name, 'Lv ' + t.lvl, t.low);
  /* screen-sized: one CSS px of label is 1/worldScale world px */
  const ws = (S && S._worldScaleX) || 1;
  const s = Math.min(SCALE_MAX, Math.max(SCALE_MIN, 1 / ws));
  const p = root._nl;
  if (p.scale !== s) { p.scale = s; root.scale.set(s); }
  const res = Math.min(4, Math.max(1, _dpr() * s * ws));
  if (p.res !== res) { p.res = res; p.name.resolution = res; p.lv.resolution = res; }
  root.x = at.x;
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
