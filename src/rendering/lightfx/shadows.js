/* ═══ v2.3.2710: SHADOWS CAST BY EACH MAP'S OWN SUN ═══
 *
 * Owner: "subtle shadowing to make things pop" -- and, from the depth work
 * before it, "the elliptical shadows put in the game looked worse than
 * nothing so those need to be out" (v2.3.2632).  Both are satisfied by the
 * same design, and the second is why it is built the way it is.
 *
 * WHAT A SHADOW IS HERE.  Every piece of a figure that is on screen this frame
 * -- body, armour, hair, hat, cape, weapon, the swing stand-in when one is up --
 * is drawn a second time into the `shadows` layer, under everything that
 * stands on the ground, projected onto the ground along the zone's light
 * (zoneLight.js).  So the shadow IS the figure: it swings the sword, lifts the
 * shield and flaps the cape because the figure does, and it points the way
 * the painting's own shadows point -- which is the property the ellipse could
 * never have (docs/DEPTH-ROADMAP.md, "Why the ellipse was removed").
 *
 * THE PROJECTION.  A point `h` pixels above the figure's feet lands at
 * (lx*h, ly*h) from them; the feet stay put.  That is one affine map per
 * figure, pivoted on its ground point:
 *
 *     x' = x - lx*(y - py)          y' = py - ly*(y - py)
 *
 * applied on top of each piece's own transform.  Nothing is rasterised on the
 * CPU and no texture is made: a shadow piece is a Sprite sharing the figure
 * piece's texture, so it batches with every other shadow piece.
 *
 * ONE PASS FOR THE WHOLE LAYER.  The pieces are drawn opaque and the layer
 * carries a single filter that turns "covered" into the shade colour at the
 * zone's alpha.  Doing the alpha per piece instead would darken every overlap
 * -- the arm over the torso, two players standing together -- and a shadow
 * with darker patches inside it reads as a stain, not a shadow.  The filter
 * also softens the edge by a pixel, and it runs at CSS resolution (the Pixi
 * default), so on a 3x iPhone it touches a ninth of the pixels a full-res
 * pass would.  No shadows on screen -> no filter -> no pass at all.
 */
import { Filter, Matrix, MeshSimple, Sprite, Texture } from 'pixi.js';
import { profileAtU } from '../propGround.js';

const FRAG = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
/* highp: the vertex stage declares the same uniform at highp, and a uniform
   whose precision differs between the two stages fails to LINK -- which Pixi
   reports only as "Could not initialize shader" and then draws nothing. */
uniform highp vec4 uInputSize;
uniform float uAlpha;
uniform vec3 uColor;
uniform float uSoft;

void main()
{
    vec2 d = uInputSize.zw * uSoft;
    float a = texture(uTexture, vTextureCoord).a * 0.36;
    a += texture(uTexture, vTextureCoord + vec2(d.x, 0.0)).a * 0.16;
    a += texture(uTexture, vTextureCoord - vec2(d.x, 0.0)).a * 0.16;
    a += texture(uTexture, vTextureCoord + vec2(0.0, d.y)).a * 0.16;
    a += texture(uTexture, vTextureCoord - vec2(0.0, d.y)).a * 0.16;
    a = min(a, 1.0) * uAlpha;
    finalColor = vec4(uColor * a, a);
}
`;
const VERT = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}
`;

function makeShadowFilter() {
  return Filter.from({
    gl: { vertex: VERT, fragment: FRAG, name: 'bt-shadow-filter' },
    resources: {
      shadowUniforms: {
        uAlpha: { value: 0.3, type: 'f32' },
        uColor: { value: new Float32Array([0, 0, 0]), type: 'vec3<f32>' },
        uSoft: { value: 0.5, type: 'f32' },
      },
    },
    /* The blur reaches one texel past the covered area, so the filter needs
       that much room or the soft edge is clipped flat on the frame's side. */
    padding: 2,
  });
}

/* How long a figure's last shadow is held when the figure has vanished but
   its owner has not -- a stand-in this module does not know about yet (a new
   cast pose, say) hides the body for a moment, and a shadow that blinks off
   every attack is worse than one that holds still for that moment. */
const HOLD_MS = 1500;

/* Walk from `node` up to `root`, returning node's transform in root's space,
   or null if the node is hidden anywhere on the way (or is not under root).
   Walked by hand rather than via getGlobalTransform twice and an inverse:
   the layers sit directly under the world container with identity
   transforms, so stopping there IS world space, and it is half the work. */
const _chain = [];
function relTransform(node, root, out) {
  _chain.length = 0;
  let cur = node;
  while (cur && cur !== root) {
    if (!cur.visible || cur.renderable === false || cur.alpha <= 0.02) return null;
    _chain.push(cur);
    cur = cur.parent;
  }
  if (cur !== root) return null;
  out.identity();
  for (let i = _chain.length - 1; i >= 0; i--) {
    const c = _chain[i];
    c.updateLocalTransform();
    out.append(c.localTransform);
  }
  return out;
}

function usableTexture(t) {
  return !!(t && t !== Texture.EMPTY && !t.destroyed && t.source && !t.source.destroyed);
}

export class ShadowSystem {
  constructor(layer, root) {
    this.layer = layer;
    this.root = root;
    this.pool = [];
    this.used = 0;
    this.meshPool = [];          /* v2.3.2719: the buildings' depth-aware shadows (placeDepth) */
    this.meshUsed = 0;
    this.filter = null;
    this._held = new Map();      /* caster key -> { t, items: [{tex, ax, ay, m}] } */
    this._m = new Matrix();
    this._p = new Matrix();
    this._f = new Matrix();
    /* v2.3.2719: `keys` -- EVERY caster drawn this frame, by key, so a test
       can ask "does each monster on screen cast" without the 16-entry cap on
       `list`.  One array, cleared and refilled in place: the keys are strings
       the casters already carry, so this allocates nothing per frame. */
    this.stats = { casters: 0, pieces: 0, held: 0, self: null, list: [], keys: [] };
  }

  _piece() {
    let s = this.pool[this.used];
    if (!s) {
      s = new Sprite();
      this.layer.addChild(s);
      this.pool.push(s);
    }
    this.used++;
    return s;
  }

  /* Place one shadow piece: texture + anchor from the source, transform =
     projection (about the pivot) x the source's world transform. */
  _place(tex, ax, ay, world, proj) {
    const s = this._piece();
    if (s.texture !== tex) s.texture = tex;
    if (s.anchor.x !== ax || s.anchor.y !== ay) s.anchor.set(ax, ay);
    this._f.copyFrom(proj).append(world);
    s.setFromMatrix(this._f);
    if (!s.visible) s.visible = true;
  }

  /* ═══ v2.3.2719: A BUILDING'S SHADOW, COLUMN BY COLUMN ═══
     A figure is a billboard: every pixel of it stands on the same spot, so
     one projection pivoted on its feet is right.  A building is not.  Its
     picture is a front wall at the bottom and a roof, towers and signs
     higher up that stand over ground up to 220 px further BACK -- and the
     picture cannot say how far back any one pixel is.  One pivot for all of
     it put the auction house's back-left tower's shadow on the cobble in
     front of its sunlit left wall: pushed forward by the depth it was
     wrongly assumed not to have.

     So each column of the picture gets its own ground, and it moves up the
     column: a pixel on the column's base row stands on the base the art
     shows there (propGround.profileAtU -- the diamond's V), and the column's
     top stands on the footprint's BACK edge, with the rows between moving
     back in step.  Front walls cast from the front, roofs and towers from
     further back, and nothing is ever lifted less than zero, so no shadow
     can fall toward the sun.  Linear in y within a column, so a two-row mesh
     is exact: (cols + 1) x 2 vertices, recomputed per frame from the sprite
     (it only moves when its zone does).  The pieces are MeshSimple sharing
     the building's own texture, in the same filtered layer as the figures,
     so a figure standing in a building's shadow darkens nothing twice. */
  placeDepth(spr, g, back, lx, ly) {
    const tex = spr.texture;
    if (!usableTexture(tex) || !g) return false;
    const COLS = 16;
    let m = this.meshPool[this.meshUsed];
    if (!m) {
      const n = (COLS + 1) * 2;
      const uvs = new Float32Array(n * 2);
      const idx = new Uint32Array(COLS * 6);
      for (let i = 0; i <= COLS; i++) {
        uvs[i * 4] = i / COLS; uvs[i * 4 + 1] = 0;        /* top of the column */
        uvs[i * 4 + 2] = i / COLS; uvs[i * 4 + 3] = 1;    /* bottom */
        if (i < COLS) {
          const a = i * 2;
          idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
        }
      }
      m = new MeshSimple({ texture: tex, vertices: new Float32Array(n * 2), uvs, indices: idx });
      this.layer.addChild(m);
      this.meshPool.push(m);
    }
    this.meshUsed++;
    if (m.texture !== tex) m.texture = tex;
    const v = m.vertices;
    const fw = tex.frame.width, fh = tex.frame.height;
    const sx = spr.scale.x, sy = spr.scale.y;
    const yB = spr.y;                                  /* anchor (0.5, 1): the frame's bottom */
    const yT = spr.y - fh * sy;                        /* ...and its top */
    for (let i = 0; i <= COLS; i++) {
      const u = i / COLS;
      const x = spr.x + (u - 0.5) * fw * sx;           /* a mirrored prop maps mirrored */
      const f = profileAtU(g, u);                      /* this TEXTURE column's base, off the art */
      const b = Math.min(back, f);
      /* the ground under a pixel at y moves from f (base row) to b (frame
         top), linearly; its height is ground - y; its shadow is ground +
         (lx, ly) * height */
      const r = (f - yT) > 1 ? (f - b) / (f - yT) : 0;
      const zT = b, hT = zT - yT;
      const zB = f + (yB - f) * r, hB = zB - yB;       /* below the base row: empty art, extrapolated */
      v[i * 4] = x + lx * hT;     v[i * 4 + 1] = zT + ly * hT;
      v[i * 4 + 2] = x + lx * hB; v[i * 4 + 3] = zB + ly * hB;
    }
    if (!m.visible) m.visible = true;
    return true;
  }

  clear() {
    /* Hidden is not enough: drop the texture too.  clear() runs on every zone
       change, and a zone's monster art is FREED on exit (preloadZoneAssets /
       freeZoneMap) -- a pooled piece still holding it is the v2.3.2651 shape
       (CLAUDE.md, the zone-asset exception), where a hidden sprite came back
       on the next visit pointing at a destroyed source. */
    for (let i = 0; i < this.pool.length; i++) {
      const s = this.pool[i];
      s.visible = false;
      if (s.texture !== Texture.EMPTY) s.texture = Texture.EMPTY;
    }
    this.used = 0;
    for (let i = 0; i < this.meshPool.length; i++) {
      const m = this.meshPool[i];
      m.visible = false;
      if (m.texture !== Texture.EMPTY) m.texture = Texture.EMPTY;
    }
    this.meshUsed = 0;
    if (this.layer.filters) this.layer.filters = null;
    this._held.clear();
    this.stats.casters = 0; this.stats.pieces = 0; this.stats.held = 0; this.stats.self = null; this.stats.list.length = 0; this.stats.keys.length = 0;
  }

  /**
   * @param {Array} casters  [{ key, px, py, sprites: Sprite[], alive }]
   * @param {object|null} light  zoneLight() entry
   * @param {number} fade  sunLeft(), 0-1
   * @param {number} now
   */
  update(casters, light, fade, now) {
    this.used = 0;
    this.meshUsed = 0;
    const st = this.stats;
    st.casters = 0; st.pieces = 0; st.held = 0; st.self = null; st.list.length = 0; st.keys.length = 0;
    if (!light || !(fade > 0.02) || !casters || !casters.length) {
      this.clear();
      return;
    }
    const { lx, ly } = light;
    const P = this._p, M = this._m;
    for (let c = 0; c < casters.length; c++) {
      const cs = casters[c];
      if (cs.depth) {
        /* v2.3.2719: a building -- see placeDepth */
        if (this.placeDepth(cs.depth.spr, cs.depth.g, cs.depth.back, lx, ly)) {
          st.casters++; st.pieces++; st.keys.push(cs.key);
          if (st.list.length < 16) st.list.push({ key: cs.key, px: cs.depth.spr.x, py: cs.depth.back, pieces: 1 });
        }
        continue;
      }
      const px = cs.px, py = cs.py;
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      /* the ground projection about this figure's feet (see header) */
      P.set(1, 0, -lx, -ly, lx * py, py * (1 + ly));
      let placed = 0;
      const items = [];
      const list = cs.sprites || [];
      for (let i = 0; i < list.length; i++) {
        const sp = list[i];
        if (!sp || sp.destroyed || !usableTexture(sp.texture)) continue;
        /* a sprite doing duty as a MASK (the hair-under-hat clip, the hood
           clip) is not part of the figure -- Pixi flags it exactly this way
           when it is assigned -- and a glow drawn additively is light, not
           something that stops it */
        if (sp.includeInBuild === false) continue;
        if (sp.blendMode === 'add' || sp.blendMode === 'screen') continue;
        if (!relTransform(sp, this.root, M)) continue;
        this._place(sp.texture, sp.anchor.x, sp.anchor.y, M, P);
        placed++;
        /* remembered relative to the feet, so a held shadow follows the
           figure if it moves while its body is hidden */
        items.push({ tex: sp.texture, ax: sp.anchor.x, ay: sp.anchor.y,
          m: new Matrix(M.a, M.b, M.c, M.d, M.tx - px, M.ty - py) });
      }
      if (placed) {
        this._held.set(cs.key, { t: now, items });
        st.casters++; st.pieces += placed; st.keys.push(cs.key);
        if (cs.key === 'self') st.self = { px, py, pieces: placed, held: false, standIns: cs.standIns || 0 };
        if (st.list.length < 16) st.list.push({ key: cs.key, px, py, pieces: placed });
        continue;
      }
      /* nothing visible: hold the last shadow for a moment if the owner is
         still here (see HOLD_MS) */
      const h = cs.alive ? this._held.get(cs.key) : null;
      if (h && now - h.t < HOLD_MS) {
        for (let i = 0; i < h.items.length; i++) {
          const it = h.items[i];
          if (!usableTexture(it.tex)) continue;
          M.set(it.m.a, it.m.b, it.m.c, it.m.d, it.m.tx + px, it.m.ty + py);
          this._place(it.tex, it.ax, it.ay, M, P);
          st.pieces++;
        }
        st.casters++; st.held++; st.keys.push(cs.key);
        if (cs.key === 'self') st.self = { px, py, pieces: h.items.length, held: true };
      } else if (h) {
        this._held.delete(cs.key);
      }
    }
    for (let i = this.used; i < this.pool.length; i++) {
      if (this.pool[i].visible) this.pool[i].visible = false;
    }
    for (let i = this.meshUsed; i < this.meshPool.length; i++) {
      if (this.meshPool[i].visible) this.meshPool[i].visible = false;
    }
    if (!this.used && !this.meshUsed) {
      if (this.layer.filters) this.layer.filters = null;
      return;
    }
    if (!this.filter) this.filter = makeShadowFilter();
    const u = this.filter.resources.shadowUniforms.uniforms;
    u.uAlpha = Math.max(0, Math.min(1, light.alpha * fade));
    const col = light.color >>> 0;
    u.uColor[0] = ((col >> 16) & 255) / 255;
    u.uColor[1] = ((col >> 8) & 255) / 255;
    u.uColor[2] = (col & 255) / 255;
    if (!this.layer.filters || this.layer.filters[0] !== this.filter) this.layer.filters = [this.filter];
    /* forget figures that have been gone longer than the hold */
    if (this._held.size > casters.length + 8) {
      for (const [k, h] of this._held) if (now - h.t > HOLD_MS) this._held.delete(k);
    }
  }
}
