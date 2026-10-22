/* ═══ v2.3.3566: AN ARENA WALLED WITH THE OWNER'S PICTURES ═══
 *
 * The owner, of the dungeons' bare arenas: "instead of code drawn walls give
 * prompt for me to give chatGPT to draw dungeon walls" -- and the Goo Grotto's
 * came back as two strips (src/data/dungeonArt.js `walls`): the wall's FRONT,
 * a little taller than a person, and its TOP seen from above, each made to
 * repeat along its length (tools/world/add-dungeon-art.mjs).  Drawn here, on
 * the tile layer under everyone, as a 3/4 view draws walls:
 *
 *   north   its top along the map's top edge (under the top bar) and its front
 *           standing below it, its foot at ARENA_WALLS.FACE_FOOT, a shadow
 *           falling onto the floor in front of it;
 *   sides   the top, turned so its front-facing edge meets the floor, SIDE
 *           thick, over the ends of the front;
 *   bottom  the top again, turned to face the floor, with a gap where the way
 *           out is -- a dark passage going on down, between the two torch posts
 *           that stand at it (rendering/arenaWorld.js).
 *
 * Every piece is a Sprite of the strip at its own resolution (2 picture px a
 * game px, drawn at half), laid end to end -- through the batcher every other
 * picture in the world goes through, so the wall is as sharp as the things in
 * front of it -- and the pieces run on past the map's edges, where the camera
 * never looks, rather than being cut.  The walls' footprints (your boots stop
 * at them) are data/dungeonArena.js arenaWallBlockers.
 */
import { Sprite, Graphics, Container } from 'pixi.js';
import { ARENA_WALLS, ARENA_EXIT } from '@/data/dungeonArena.js';

const ART = 0.5;   /* game px a picture px */

/* a row of the strip's pieces from `x0` to `x1` along its length, each piece's
   transform made by `place(sprite, k)` for the k-th */
function row(parent, tex, n, place) {
  for (let k = 0; k < n; k++) {
    const s = new Sprite(tex);
    s.scale.set(ART);
    s.label = 'arenaWallPiece';
    place(s, k);
    parent.addChild(s);
  }
}

/* a shadow cast onto the floor: `steps` bands fading out from `a0` */
function fade(g, x, y, w, h, alongY, a0, steps = 6) {
  for (let i = 0; i < steps; i++) {
    const k = i / steps, a = a0 * (1 - k) * (1 - k);
    if (alongY) g.rect(x, y + h * k, w, h / steps).fill({ color: 0x000000, alpha: a });
    else g.rect(x + w * k, y, w / steps, h).fill({ color: 0x000000, alpha: a });
  }
}

/** Draw the walls of a W x H (game px) arena from its art record (game/
    dungeonArt.js: `front`, `top` textures) into `parent`.  Returns the
    Container, or null when the record has no walls to draw. */
export function drawArenaWalls(parent, art, W, H, wallColor) {
  if (!art || !art.front || !art.top || art.front.destroyed || art.top.destroyed) return null;
  const { FACE_FOOT, SIDE, BOTTOM, GAP } = ARENA_WALLS;
  const c = new Container();
  c.label = 'arenaArtWalls';
  const front = art.front, top = art.top;
  const fW = front.width * ART, fH = front.height * ART;   /* one piece of the front, game px */
  const tW = top.width * ART, tH = top.height * ART;       /* one piece of the top: its length, its thickness */
  const dark = wallColor != null ? wallColor : 0x111316;

  /* under it all, the wall's own dark where a piece's ragged edge lets the
     floor show: the north band to the front's foot, the sides, the bottom */
  const under = new Graphics();
  under.rect(0, 0, W, FACE_FOOT - fH + 12).fill({ color: dark });
  under.rect(0, 0, SIDE * 0.5, H).fill({ color: dark });
  under.rect(W - SIDE * 0.5, 0, SIDE * 0.5, H).fill({ color: dark });
  under.rect(0, BOTTOM + tH * 0.5, W, H).fill({ color: dark });
  c.addChild(under);

  /* the north wall's top, along the map's top edge */
  row(c, top, Math.ceil(W / tW) + 1, (s, k) => { s.x = k * tW; s.y = Math.max(0, FACE_FOOT - fH - tH * 0.6); });
  /* ...and its front, standing on FACE_FOOT, from the west wall to the east */
  row(c, front, Math.ceil((W - 2 * SIDE) / fW) + 1, (s, k) => { s.x = SIDE * 0.5 + k * fW; s.y = FACE_FOOT - fH; });

  const shade = new Graphics();
  /* the front's shadow on the floor before it */
  fade(shade, 0, FACE_FOOT, W, 36, true, 0.42);
  c.addChild(shade);

  /* the sides: the top turned so its long front edge meets the floor --
     west by a quarter turn back (it runs up from each piece's foot), east by
     a quarter turn on (it runs down) */
  row(c, top, Math.ceil(H / tW) + 1, (s, k) => { s.rotation = -Math.PI / 2; s.x = SIDE - tH; s.y = (k + 1) * tW; });
  row(c, top, Math.ceil(H / tW) + 1, (s, k) => { s.rotation = Math.PI / 2; s.x = W - SIDE + tH; s.y = k * tW; });
  const sideShade = new Graphics();
  fade(sideShade, SIDE, FACE_FOOT, 22, H - FACE_FOOT, false, 0.3);
  /* the east wall's shadow falls back toward it (fade() runs outward) */
  for (let i = 0; i < 6; i++) {
    const k = i / 6, a = 0.3 * (1 - k) * (1 - k);
    sideShade.rect(W - SIDE - 22 * (k + 1 / 6), FACE_FOOT, 22 / 6, H - FACE_FOOT).fill({ color: 0x000000, alpha: a * 0.6 });
  }
  c.addChild(sideShade);

  /* the bottom: the top turned half round to face the floor, laid outward
     from the gap at the way out, either side */
  const gx0 = ARENA_EXIT.x - GAP, gx1 = ARENA_EXIT.x + GAP;
  const by = BOTTOM - 6 + tH;   /* each piece's far (south) edge */
  row(c, top, Math.ceil(gx0 / tW) + 1, (s, k) => { s.rotation = Math.PI; s.x = gx0 - k * tW; s.y = by; });
  row(c, top, Math.ceil((W - gx1) / tW) + 1, (s, k) => { s.rotation = Math.PI; s.x = gx1 + (k + 1) * tW; s.y = by; });
  /* the way out: a passage going on down, darker as it goes */
  const pass = new Graphics();
  pass.rect(gx0, BOTTOM - 6, gx1 - gx0, H - BOTTOM + 6).fill({ color: dark, alpha: 0.35 });
  for (let i = 0; i < 8; i++) {
    const k = i / 8;
    pass.rect(gx0, BOTTOM + (H - BOTTOM) * k, gx1 - gx0, (H - BOTTOM) / 8).fill({ color: 0x000000, alpha: 0.12 + 0.6 * k });
  }
  /* its two jambs, the wall's ends either side of it in shadow */
  pass.rect(gx0, BOTTOM - 6, 6, H - BOTTOM + 6).fill({ color: 0x000000, alpha: 0.35 });
  pass.rect(gx1 - 6, BOTTOM - 6, 6, H - BOTTOM + 6).fill({ color: 0x000000, alpha: 0.35 });
  c.addChild(pass);

  parent.addChild(c);
  return c;
}
