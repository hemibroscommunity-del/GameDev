/* ═══ v2.3.3017: THE WHEEL'S WATER MOVES ═══
 *
 * Owner, 2026-10-04: "Does the water move yet".  It did not: the Wheel's
 * water was the owner's three still pictures (sea, shallows, fresh), laid
 * into the ground like the grass ("Moving water ... is a later round",
 * WORLD-MAP-PIPELINE).  Offered "glints and slow lines of light drifting
 * across the water; the white foam lapping in and out at the shore; a gentle
 * drift down the rivers", all drawn in code: "Yes".
 *
 * Over each piece of ground that has water lies one quad, drawn by the
 * shader below.  It reads the piece's WATER FIELD, laid by the ground worker
 * with the piece (public/tools/world/core/ground.js, WATER THAT MOVES): how
 * far each spot is from the shore as DRAWN, which water it is, and which way
 * a river runs there.  And it draws, on the water only --
 *
 *   ripple   the owner's own picture, the water's lines of light and its
 *            glints, gently swaying: each water px drawn from a px or so
 *            away, the offset wandering slowly, never at the shore (where the
 *            land would be pulled into the water).  The first try drew lines
 *            of light of its own over the pictures, and they read as
 *            scribbles beside the owner's: moving the pictures' own lines
 *            reads as water.  On the river the ripples ride downstream.
 *   surf     on the sea's coasts, a line of foam riding in, breaking into
 *            the shore's own foam line, which brightens and lets go, and a
 *            thinner line drawing back out as the next comes in -- each wave
 *            reaching each stretch of coast in its turn, never all at once;
 *            the banks of rivers and ponds lap too, small and soft
 *   glints   a cross of light that flashes and goes, here and there
 *   flow     streaks of light running down the Sweetwater River the way it
 *            flows, quicker mid-channel and upstream, dying away at its mouth
 *   rings    on still fresh water (ponds, lakes, oases), now and then a ring
 *            opening where something rose
 *   caps     out on the open sea, a short whitecap now and then
 *
 * The surf, glints, streaks, rings and caps are worked out a game px at a
 * time, so they stay pixel art; the ripple moves the picture smoothly, as
 * the ground's own pieces are drawn smooth (wheelGround.js).  The field and
 * the piece's picture share one set of texture coordinates: the field is a
 * texel an art px, the picture three px an art px, both with the piece's
 * apron, so 130 texels lie exactly over its 390 px.
 *
 * COST.  Nothing to download: the program is a few dozen lines, built once
 * behind the Wheel's loading screen (prewarmWheelWater, the v2.3.2904 rule:
 * a program is compiled the first time it is DRAWN, so one is drawn there).
 * A field is 130 x 130 texels, 66 KB of GPU memory a piece with water -- the
 * ~28-48 pieces standing are 2-3 MB at most -- and a piece of open sea with
 * no shore in reach shares one 1 x 1 texture with every other; the picture
 * it moves is the piece's own, already there.  The pixels of land under a
 * quad cost one texture read.  WebGL2 only (the game asks for WebGL, and
 * every iPhone since iOS 15 gives version 2); on anything else the water
 * stays still, as before.
 *
 * Off switches: `?nowaves` in the address (the worker then lays no fields at
 * all), `window.__btWaves.off()` live.  Probe: `window.__btWaves.probe()`.
 */
import { Container, Mesh, MeshGeometry, Shader, GlProgram, UniformGroup, Texture, BufferImageSource, Rectangle } from 'pixi.js';

const VERT = `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
out vec2 vWorld;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main(void)
{
    mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
    vUV = aUV;
    /* the quad is laid in world game px, so this is where on the Wheel */
    vWorld = aPosition;
}
`;

/* highp throughout (preferredFragmentPrecision): vWorld runs to 43,008 game
   px, which mediump -- a half float on an iPhone -- holds only to the
   nearest 32. */
const FRAG = `
in vec2 vUV;
in vec2 vWorld;
out vec4 finalColor;

uniform sampler2D uField;
uniform sampler2D uPiece;
uniform float uTime;
uniform float uStrength;
uniform float uUvPerPx;

float h12(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
vec2 h22(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}
float vn(vec2 p)
{
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = h12(i);
    float b = h12(i + vec2(1.0, 0.0));
    float c = h12(i + vec2(0.0, 1.0));
    float d = h12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
/* two value noises, -1..1 each way */
vec2 vn2(vec2 p)
{
    return vec2(vn(p), vn(p + vec2(19.19, 7.73))) * 2.0 - 1.0;
}

void main(void)
{
    vec4 f = texture(uField, vUV);
    /* how far from the drawn shore, in game px (ground.js: R = output px x 12,
       two output px a game px) */
    float d = f.r * 10.625;
    float wet = smoothstep(0.3, 0.9, d);
    if (wet <= 0.0) { finalColor = vec4(0.0); return; }
    /* which water (ground.js WF_KIND: fresh 85, shallows 170, sea 255) */
    float fresh = 1.0 - smoothstep(0.42, 0.58, f.g);
    float sea = smoothstep(0.76, 0.92, f.g);
    float shallow = clamp(1.0 - fresh - sea, 0.0, 1.0);
    vec2 flow = (f.ba * 255.0 - 128.0) / 127.0;
    float sp = length(flow);
    vec2 dir = sp > 0.001 ? flow / sp : vec2(1.0, 0.0);
    float t = uTime;
    float k = uStrength;

    /* RIPPLE: the picture drawn from a little way off, the offset wandering
       -- two noises of different size drifting different ways; on the river
       one noise carried downstream in two phases, as the streaks below --
       and none at the shore, so no sand is pulled into the water */
    float amp = k * (1.2 * sea + 1.0 * shallow + 0.8 * fresh) * smoothstep(1.2, 4.0, d);
    vec2 off = vec2(0.0);
    if (amp > 0.0) {
        if (sp > 0.04) {
            float Tr = 3.0;
            float r1 = fract(t / Tr);
            float r2 = fract(t / Tr + 0.5);
            float wr = 1.0 - abs(2.0 * r1 - 1.0);
            vec2 q = vWorld * 0.05;
            float run = 0.05 * 14.0 * sp * Tr;
            off = (vn2(q - dir * run * r1) * wr + vn2(q - dir * run * r2 + 5.7) * (1.0 - wr)) * 1.3;
        } else {
            off = vn2(vWorld * 0.028 + vec2(t * 0.21, t * 0.13)) + 0.5 * vn2(vWorld * 0.071 + vec2(-t * 0.33, t * 0.27));
        }
        off *= amp;
    }
    vec3 col = texture(uPiece, vUV + off * uUvPerPx).rgb;

    /* the rest a game px at a time: P is the game px this fragment lies in,
       and dq how far it is from the shore */
    vec2 P = floor(vWorld) + 0.5;
    float dq = texture(uField, vUV + (P - vWorld) * uUvPerPx).r * 10.625;
    float light = 0.0;
    float foam = 0.0;

    /* GLINTS: one cell in three or so holds a glint, which flashes now and
       then -- a cross of light that grows and goes */
    vec2 gc = floor(P / 30.0);
    if (dq > 2.0 && h12(gc + 17.17) < 0.35) {
        vec2 gr = h22(gc);
        float per = 3.0 + 5.0 * gr.y;
        float u = fract(t / per + gr.x * 3.7);
        if (u < 0.07) {
            float lit = sin(3.14159 * u / 0.07);
            vec2 o = P - (gc + 0.2 + 0.6 * gr) * 30.0;
            float arm = 0.5 + 2.0 * lit;
            float cross = max(step(abs(o.x), 0.5) * step(abs(o.y), arm), step(abs(o.y), 0.5) * step(abs(o.x), arm));
            light += cross * lit * (0.8 * sea + 0.7 * shallow + 0.55 * fresh);
        }
    }

    /* SURF: near the shore the waves come in -- each stretch of coast in its
       own turn (ph), a crest riding in from D0 game px out, broken into
       lengths of foam that differ wave to wave, the shore's foam line
       brightening as it lands and a thin line drawing back out after.
       Fresh water's banks lap too, small and soft. */
    /* (D0 plus the crest's width stays under the field's cap, 10 game px:
       all open water reads exactly 10, and a crest there would light it all) */
    if (dq < 9.5) {
        float surf = 1.0 - fresh;
        float ph = vn(P * 0.0045) * 1.7 + vn(P * 0.023 + 3.1) * 0.3;
        float T = mix(3.6, 6.0, surf);
        float cyc = t / T + ph;
        float u = fract(cyc);
        float D0 = mix(2.6, 8.0, surf);
        float dc = D0 * (1.0 - u);
        float crest = 1.0 - smoothstep(0.6, 1.25, abs(dq - dc));
        float seg = smoothstep(0.24, 0.40, vn(P * 0.07 + vec2(floor(cyc) * 7.31, 0.0)));
        float aC = smoothstep(0.0, 0.25, u) * (0.3 + 0.45 * u);
        foam += crest * seg * aC * mix(0.5, 1.0, surf);
        float flare = max(smoothstep(0.86, 1.0, u), 1.0 - smoothstep(0.0, 0.22, u));
        foam += (1.0 - smoothstep(0.8, 2.2, dq)) * flare * mix(0.25, 0.65, surf);
        float db = 0.9 + 4.0 * smoothstep(0.0, 0.5, u);
        float back = (1.0 - smoothstep(0.4, 1.0, abs(dq - db))) * (1.0 - smoothstep(0.1, 0.5, u));
        foam += back * 0.4 * surf * seg;
    }

    /* FLOW: streaks of light carried down a river, the classic two-phase
       flow map -- each phase slides the pattern along for Tf seconds and
       starts again, faded out as it does while the other is at its fullest,
       so the pattern never stretches and never visibly jumps */
    if (sp > 0.04) {
        vec2 nrm = vec2(-dir.y, dir.x);
        float Tf = 2.2;
        float run = 15.0 * sp * Tf;
        float t1 = fract(t / Tf);
        float t2 = fract(t / Tf + 0.5);
        vec2 p1 = P - dir * run * t1;
        vec2 p2 = P - dir * run * t2 + vec2(31.7, 17.3);
        float s1 = vn(vec2(dot(p1, dir) * 0.055, dot(p1, nrm) * 0.42));
        float s2 = vn(vec2(dot(p2, dir) * 0.055, dot(p2, nrm) * 0.42));
        float w1 = 1.0 - abs(2.0 * t1 - 1.0);
        light += (step(0.7, s1) * w1 + step(0.7, s2) * (1.0 - w1)) * 0.16 * sp;
    }

    /* RINGS: on still fresh water, now and then a ring opens where something
       rose (the Wheel's fishing spots draw their own fish) */
    if (fresh > 0.5 && sp < 0.04 && dq > 3.0) {
        vec2 rc = floor(P / 44.0);
        if (h12(rc + 9.9) < 0.35) {
            vec2 rr = h22(rc + 3.3);
            float per = 6.0 + 6.0 * rr.y;
            float u = fract(t / per + rr.x * 5.1);
            if (u < 0.32) {
                float s = u / 0.32;
                vec2 o = P - (rc + 0.25 + 0.5 * rr) * 44.0;
                float ring = 1.0 - smoothstep(0.35, 0.95, abs(length(o) - (1.0 + 9.0 * s)));
                light += ring * (1.0 - s) * 0.22;
            }
        }
    }

    /* CAPS: out on the open sea, a short whitecap now and then, carried a
       few px downwind as it goes */
    if (sea > 0.5 && dq > 5.0) {
        vec2 wc = floor(P / vec2(38.0, 26.0));
        if (h12(wc + 4.4) < 0.2) {
            vec2 wr = h22(wc + 1.7);
            float per = 5.0 + 5.0 * wr.x;
            float u = fract(t / per + wr.y * 2.9);
            if (u < 0.22) {
                float s = u / 0.22;
                vec2 o = P - (wc + 0.2 + 0.6 * wr) * vec2(38.0, 26.0) - vec2(3.0 * s, 0.0);
                float len = 2.0 + 3.0 * h12(wc + 8.8);
                foam += step(abs(o.y), 0.5) * step(abs(o.x), len) * sin(3.14159 * s) * 0.4;
            }
        }
    }

    col += vec3(0.82, 0.96, 1.0) * light * k;
    col = mix(col, vec3(0.886, 0.933, 0.941), clamp(foam * k, 0.0, 0.85));
    /* the water's own colours, moved and lit, over the piece's: premultiplied,
       and only as far as it is water */
    finalColor = vec4(col * wet, wet);
}
`;

let _program = null;
function program() {
  if (!_program) _program = GlProgram.from({ vertex: VERT, fragment: FRAG, name: 'bt-wheel-water', preferredFragmentPrecision: 'highp' });
  return _program;
}
/* one clock and one strength for every piece's water */
const _uni = new UniformGroup({
  uTime: { value: 0, type: 'f32' },
  uStrength: { value: 1, type: 'f32' },
  uUvPerPx: { value: 1 / 195, type: 'f32' },
});
/* the clock wraps every TIME_WRAP seconds: highp floats keep a thousandth
   of a second up there, and the wrap is a single frame of jump in two hours */
const TIME_WRAP = 7200;

let _renderer = null;
let _ok = null;              /* null: not built yet; true: built and linked; false: this device cannot */
let _liveOff = false;
let _held = null;            /* QA: the clock held at one moment, for pictures */
let _live = null;            /* QA: the WheelWater drawing now, for __btWaves.extract */
const _stats = { meshes: 0, fields: 0, uniform: 0, flowing: 0, fieldBytes: 0, made: 0, prewarmed: false, linkError: null };

/** The renderer, from initPixiRenderer: what builds the program, and says
 *  whether this is WebGL2. */
export function setWheelWaterRenderer(r) { _renderer = r || null; }

/** `?nowaves` in the address keeps the water still (the ground worker reads
 *  the same word: ground.js wavesOn). */
export function wavesOn() {
  try { return !/(^|[?&])nowaves(=|&|$)/.test(window.location.search || ''); } catch (e) { return true; }
}

function webgl2() {
  const r = _renderer;
  return !!(r && r.context && r.context.webGLVersion === 2 && r.gl);
}

/* did the program link?  Read off the GL program Pixi built for it */
function linked() {
  try {
    const r = _renderer, gl = r && r.gl;
    const pd = r && r.shader && typeof r.shader._getProgramData === 'function' ? r.shader._getProgramData(program()) : null;
    if (!gl || !pd || !pd.program) return false;
    return !!gl.getProgramParameter(pd.program, gl.LINK_STATUS);
  } catch (e) { return false; }
}

/* ── the textures ── */

function fieldTexture(wf) {
  const src = new BufferImageSource({
    resource: wf.data, width: wf.w, height: wf.h,
    format: 'rgba8unorm', scaleMode: 'linear', alphaMode: 'no-premultiply-alpha',
  });
  return new Texture({ source: src });
}
/* open sea all alike: one 1 x 1 texture each kind of field, shared */
const _uniformTex = new Map();
function uniformTexture(u) {
  const key = u.join(',');
  let t = _uniformTex.get(key);
  if (!t || t.destroyed) {
    t = new Texture({ source: new BufferImageSource({
      resource: new Uint8Array(u), width: 1, height: 1,
      format: 'rgba8unorm', scaleMode: 'linear', alphaMode: 'no-premultiply-alpha',
    }) });
    _uniformTex.set(key, t);
  }
  return t;
}

/* a quad over (x0, y0)-(x1, y1) in game px, its texture coordinates u0-u1 */
function quad(x0, y0, x1, y1, u0, v0, u1, v1) {
  return new MeshGeometry({
    positions: new Float32Array([x0, y0, x1, y0, x1, y1, x0, y1]),
    uvs: new Float32Array([u0, v0, u1, v0, u1, v1, u0, v1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  });
}

/* a quad let go whole: Mesh.destroy frees neither its geometry's buffers
   nor its shader's bindings, which are its own (the program is shared, and
   stays) */
function unmake(mesh) {
  if (!mesh) return;
  const g = mesh.geometry, sh = mesh.shader;
  try { mesh.destroy(); } catch (e) { /* gone */ }
  try { if (g) g.destroy(true); } catch (e) { /* gone */ }
  try { if (sh) sh.destroy(false); } catch (e) { /* gone */ }
}

/* the field's texture and the piece's own picture, over the piece's quad */
function meshFor(tex, pic, geometry) {
  const shader = new Shader({ glProgram: program(), resources: { uField: tex.source, uPiece: pic.source, waterUniforms: _uni } });
  return new Mesh({ geometry, shader });
}

/** Build the program behind the Wheel's loading screen: one small quad of
 *  still sea is drawn, which compiles and links it (src/game/worldTrial.js
 *  preloadWheel).  Says whether this device can draw moving water. */
export function prewarmWheelWater() {
  if (_ok != null) return _ok;
  if (!wavesOn() || !webgl2()) { _ok = false; return false; }
  let mesh = null;
  try {
    const sea = uniformTexture([240, 255, 128, 128]);
    mesh = meshFor(sea, sea, quad(0, 0, 8, 8, 0, 0, 1, 1));
    mesh.alpha = 0.001;
    _renderer.render({ container: mesh });
    _ok = linked();
  } catch (e) { _ok = false; }
  if (!_ok) _stats.linkError = 'the water program did not build on this device';
  unmake(mesh);
  _stats.prewarmed = true;
  return _ok;
}

/** The moving water over the Wheel's ground: one quad a piece that has
 *  water, made and freed with the piece (rendering/wheelGround.js). */
export class WheelWater {
  constructor(parent) {
    this.root = new Container();
    this.root.label = 'wheelWater';
    parent.addChild(this.root);
    this.meshes = new Map();   /* "i,j" -> { mesh, tex (its own, or null when shared), bytes } */
    this.dead = false;
    _live = this;
  }

  /** usable here at all: WebGL2, built (or not tried yet), and not switched off */
  static on() {
    if (!wavesOn() || !webgl2()) return false;
    if (_ok == null) prewarmWheelWater();
    return _ok === true;
  }

  /** The piece at (i, j) was laid (or laid again): its water's quad, or
   *  none.  `pic`: the piece's own picture, which the quad moves. */
  set(key, i, j, wf, info, pic) {
    if (this.dead) return;
    this.drop(key);
    if (!wf || (!wf.data && !wf.uniform) || !pic || !pic.source || !WheelWater.on()) return;
    const cs = info.chunk.gamePx, art = info.chunk.artPx;
    const ap = (wf.w - art) / 2;
    const x0 = i * cs, y0 = j * cs;
    const u0 = ap / wf.w, u1 = (ap + art) / wf.w, v0 = ap / wf.h, v1 = (ap + art) / wf.h;
    const own = wf.data ? fieldTexture(wf) : null;
    const tex = own || uniformTexture(wf.uniform);
    /* texture units a game px: the field is one texel an art px */
    _uni.uniforms.uUvPerPx = art / cs / wf.w;
    const mesh = meshFor(tex, pic, quad(x0, y0, x0 + cs, y0 + cs, u0, v0, u1, v1));
    this.root.addChild(mesh);
    const bytes = own ? wf.w * wf.h * 4 : 0;
    this.meshes.set(key, { mesh, tex: own, bytes, flowing: wf.flowing > 0 });
    _stats.made++;
    this._count();
  }

  drop(key) {
    const e = this.meshes.get(key);
    if (!e) return;
    this.meshes.delete(key);
    unmake(e.mesh);
    /* the field is this piece's alone: its GPU copy and its texels go with it */
    if (e.tex) { try { e.tex.destroy(true); } catch (err) { /* gone */ } }
    this._count();
  }

  /** Once a frame: the water's clock. */
  tick(now) {
    if (this.dead) return;
    const off = _liveOff;
    this.root.visible = !off;
    if (off || !this.meshes.size) return;
    _uni.uniforms.uTime = _held != null ? _held : (now / 1000) % TIME_WRAP;
  }

  _count() {
    let fields = 0, uni = 0, bytes = 0, flowing = 0;
    for (const e of this.meshes.values()) { if (e.tex) fields++; else uni++; bytes += e.bytes; if (e.flowing) flowing++; }
    _stats.meshes = this.meshes.size; _stats.fields = fields; _stats.uniform = uni; _stats.fieldBytes = bytes; _stats.flowing = flowing;
  }

  destroy() {
    if (this.dead) return;
    for (const key of [...this.meshes.keys()]) this.drop(key);
    this.dead = true;
    if (_live === this) _live = null;
    try { this.root.destroy(); } catch (e) { /* gone */ }
    _stats.meshes = 0; _stats.fields = 0; _stats.uniform = 0; _stats.fieldBytes = 0; _stats.flowing = 0;
  }
}

/* QA (mp-wheelwaves): what is drawn, a live switch, and the motion's
   strength (0 draws the pictures still, through the same quads) */
if (typeof window !== 'undefined') {
  window.__btWaves = {
    probe: () => ({ ..._stats, ok: _ok, webgl2: webgl2(), on: wavesOn() && !_liveOff, strength: _uni.uniforms.uStrength, time: _uni.uniforms.uTime }),
    off: () => { _liveOff = true; },
    on: () => { _liveOff = false; },
    strength: (k) => { _uni.uniforms.uStrength = Math.max(0, Math.min(4, +k || 0)); },
    /* hold the clock (pictures of one moment); null lets it run */
    hold: (sec) => { _held = sec == null ? null : +sec; },
    /* the water layer ALONE over a world rectangle, as RGBA px at `res` px a
       game px (mp-wheelwaves: where it draws, and that it moves) */
    extract: (x, y, w, h, res = 0.5) => {
      const W = _live;
      if (!W || W.dead || !_renderer) return null;
      try {
        _uni.uniforms.uTime = _held != null ? _held : (performance.now() / 1000) % TIME_WRAP;
        const out = _renderer.extract.pixels({ target: W.root, frame: new Rectangle(x, y, w, h), resolution: res });
        return { w: out.width, h: out.height, px: Array.from(out.pixels) };
      } catch (e) { return { error: String((e && e.message) || e) }; }
    },
  };
}
