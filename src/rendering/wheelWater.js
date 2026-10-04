/* ═══ v2.3.3019: THE WHEEL'S WATER MOVES ═══
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
 *   swell    the owner's own picture, its lines of light and its glints,
 *            swaying and stretching as swells pass under it: each water px
 *            drawn from up to 3 game px away along three waves of different
 *            length crossing different ways, never as far as the shore (where
 *            the land would be pulled into the water).  On the river the
 *            ripples ride downstream.
 *   sparkles a star of light that flashes and goes, here and there
 *   crests  short bowed lines of light coming up on the sea, the shallows
 *            and still fresh water, stretching, drifting downwind and going
 *   surf     on the sea's coasts, a line of foam riding in with a wash behind
 *            it, the shore's foam flaring as it lands and letting go, and a
 *            thinner line drawn back out as the next comes in -- each stretch
 *            of coast in its turn, never all at once; the banks of rivers and
 *            ponds lap too, smaller and softer
 *   flow     streaks of light and flecks of foam running down the Sweetwater
 *            River the way it flows, quicker mid-channel and upstream, dying
 *            away at its mouth
 *   rings    on still fresh water (ponds, lakes, oases), now and then a ring
 *            opening where something rose, a second after it
 *   caps     out on the open sea, a short whitecap now and then
 *   caustics v2.3.3021: the web of light the surface throws on the bottom,
 *            MOVING -- round cells swelling, shrinking and re-forming, their
 *            lines bending and breaking -- in place of the web ChatGPT drew
 *            into all three pictures, which held still read as a honeycomb
 *            (the owner: "The water has a honeycomb pattern that needs to
 *            change to mimic water movement").  The ground worker takes that
 *            one out of the pictures (ground.js CALM WATER) wherever this
 *            draws, and only there; `?caustics=k` (0 to 2) sets its brightness
 *
 * SIZED FOR A PHONE.  The first cut swayed the pictures a game px and drew
 * its foam and glints a game px wide, and the owner, on a phone: "I don't see
 * the water moving".  A game px there is under two device px, a tenth of a
 * millimetre: a line that thin does not read, and a picture moved one does
 * not look moved.  So the swell moves the picture up to 3 game px, about
 * 2 game px a second, every line is 2-3 picture px thick and the surf's
 * nearly 4, the sparkles have a 3 x 3 px heart and arms to 4 game px.
 * Everything but the swell is worked out a PICTURE px at a time (half a game
 * px), so it is pixel art at the pictures' own grain -- about one device px a
 * px on the owner's phone, which keeps its edges from crawling as the view
 * slides; the swell moves the picture smoothly, as the ground's own pieces
 * are drawn smooth (wheelGround.js).  The field and the piece's picture share
 * one set of texture coordinates: the field is a texel an art px, the picture
 * three px an art px, both with the piece's apron (3 art px since the swell
 * reads that far past a piece's edge), so 134 texels lie exactly over 402 px.
 *
 * COST.  Nothing to download: the program is built once behind the Wheel's
 * loading screen (prewarmWheelWater, the v2.3.2904 rule: a program is
 * compiled the first time it is DRAWN, so one is drawn there).  A field is
 * 134 x 134 texels, 70 KB of GPU memory a piece with water -- the pieces
 * standing are 1-3 MB -- and a piece of open sea with no shore in reach
 * shares one 1 x 1 texture with every other; the picture it moves is the
 * piece's own, already there.  The pixels of land under a quad cost one
 * texture read.  WebGL2 only (the game asks for WebGL, and every iPhone since
 * iOS 15 gives version 2); on anything else the water stays still, as before.
 *
 * Switches: `?nowaves` in the address keeps it still (the worker then lays
 * no fields at all, and keeps the pictures' own web of light), `?waves=1.5`
 * makes it half as strong again (0.25 to 3), `?caustics=0.5` the moving web
 * half as bright (0 to 2; 0 none), `window.__btWaves.off()` live.  Probe: `window.__btWaves.probe()`; the
 * trial readout (`?trialhud`) says "water moving" or why it is still.
 */
import { Container, Mesh, MeshGeometry, Shader, GlProgram, UniformGroup, Texture, BufferImageSource, Rectangle } from 'pixi.js';
import { setWheelWaterMoves } from '../game/wheelTrial.js';

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
uniform float uCaustics;

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
/* CAUSTICS (v2.3.3021): a cell's point, circling on its own clock */
vec2 cpt(vec2 c, float t)
{
    vec2 r = h22(c + 3.71);
    float a = 6.2832 * r.x + t * (0.45 + 0.5 * r.y);
    return c + 0.5 + 0.30 * vec2(cos(a), sin(a * 1.13 + r.y * 3.0));
}
/* how near p lies to the line between two cells: the nearest point's
   distance over the next nearest's -- 1 on the line.  Its lines of equal
   value round a point are circles (Apollonius), so the cells come out ROUND,
   as the light on a bottom does, not the straight-sided cells of the usual
   cellular noise (F2 - F1), a honeycomb again */
float cellEdge(vec2 p, float t)
{
    vec2 c = floor(p);
    float f1 = 9.0;
    float f2 = 9.0;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            float d = distance(p, cpt(c + vec2(float(i), float(j)), t));
            if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
        }
    }
    return f1 / max(f2, 1e-4);
}
/* how far from the drawn shore, in game px (ground.js: R = output px x 12,
   two output px a game px), at a world point near this fragment */
float shoreAt(vec2 w)
{
    return texture(uField, vUV + (w - vWorld) * uUvPerPx).r * 10.625;
}

void main(void)
{
    vec4 f = texture(uField, vUV);
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
    bool river = sp > 0.04;
    float t = uTime;
    float k = uStrength;

    /* SWELL: the picture drawn from up to 3 game px away along three waves
       of different length crossing different ways, a slow noise bending
       their fronts so they never line up into a grid.  The owner's lines of
       light sway and stretch as swells pass under them.  Never as far as the
       shore (0.9 of the way there at most), so no sand is pulled into the
       water; and never past the piece's 3 art px apron.  On a river one
       noise is carried downstream in two phases, as the streaks below. */
    float amp = k * (3.0 * sea + 2.6 * shallow + 2.1 * fresh);
    amp = min(min(amp, 0.9 * max(d - 0.6, 0.0)), 4.0);
    vec2 off = vec2(0.0);
    if (amp > 0.0) {
        if (river) {
            float Tr = 2.4;
            float r1 = fract(t / Tr);
            float r2 = fract(t / Tr + 0.5);
            float wr = 1.0 - abs(2.0 * r1 - 1.0);
            vec2 q = vWorld * 0.06;
            float run = 0.06 * 26.0 * sp * Tr;
            off = (vn2(q - dir * run * r1) * wr + vn2(q - dir * run * r2 + 5.7) * (1.0 - wr)) * 0.71;
        } else {
            float pn = vn(vWorld * 0.011) * 6.2832;
            vec2 d1 = vec2(0.80, 0.60);
            vec2 d2 = vec2(-0.50, 0.866);
            vec2 d3 = vec2(0.96, -0.28);
            off = (d1 * sin(dot(vWorld, d1) * 0.1122 - t * 1.571 + pn)
                + d2 * (0.7 * sin(dot(vWorld, d2) * 0.1848 - t * 2.027 + pn * 0.7))
                + d3 * (0.45 * sin(dot(vWorld, d3) * 0.2992 - t * 2.417 - pn * 0.6))) * 0.465;
        }
        off *= amp;
    }
    vec3 col = texture(uPiece, vUV + off * uUvPerPx).rgb;

    /* the rest an ART px at a time (half a game px, the pictures' own
       pixel): Pa is the middle of the one this fragment lies in, dq how far
       that is from the shore */
    vec2 Pa = (floor(vWorld * 2.0) + 0.5) * 0.5;
    float dq = shoreAt(Pa);
    float light = 0.0;
    float foam = 0.0;

    /* CAUSTICS (v2.3.3021): the light the surface's ripples throw on the
       bottom -- the web the owner's pictures held still, which read as a
       honeycomb ("needs to change to mimic water movement"), taken out of
       them by the ground worker (ground.js CALM WATER) and drawn here
       MOVING: round cells that swell, shrink and re-form, each cell's point
       circling on its own clock, their lines bent by a slow warp and a
       quicker wobble so they curve, and stretches of web fading out and back
       as a slow noise drifts over them -- never a whole honeycomb at once.
       One size of cell everywhere (42 game px), so the web runs on unbroken
       where the shallows meet the sea: brightest in the shallows, a little
       less on fresh water, on the open sea faint and in pieces (light fades
       with depth: a whole web out there read as cracked glass), none on a
       running river (its streaks and flecks, below).  Two shades
       a picture px, as the pictures drew theirs: a line and its glow. */
    float cg = (0.09 * sea + 0.46 * shallow + 0.38 * fresh) * (1.0 - smoothstep(0.02, 0.10, sp)) * uCaustics * min(k, 1.25);
    if (cg > 0.0) {
        vec2 p = Pa / 42.0;
        vec2 bend = vec2(vn(p * 0.45 + vec2(t * 0.05, 0.0)), vn(p * 0.45 + vec2(19.19, 7.73 - t * 0.04))) * 2.0 - 1.0;
        vec2 wob = vec2(vn(p * 2.1 + vec2(t * 0.21 + 5.1, 0.0)), vn(p * 2.1 + vec2(11.3, -t * 0.17))) * 2.0 - 1.0;
        float q = cellEdge(p + 0.30 * bend + 0.07 * wob, t);
        float web = step(0.90, q) + 0.45 * step(0.80, q) * step(q, 0.90);
        float brk = smoothstep(0.30 + 0.18 * sea, 0.70 + 0.10 * sea, vn(p * 0.9 + vec2(t * 0.10 + 3.3, -t * 0.06)));
        col = mix(col, vec3(0.86, 0.98, 1.0), clamp(web * brk * cg, 0.0, 0.9));
    }

    /* SPARKLES: one cell in three or so holds one, which flashes now and
       then -- a 3 x 3 px heart, arms that grow to 4 game px and the X's
       ticks at its brightest */
    vec2 gcs = vec2(26.0, 26.0);
    vec2 gc = floor(Pa / gcs);
    if (dq > 2.5 && h12(gc + 17.17) < 0.32) {
        vec2 gr = h22(gc);
        float per = 2.4 + 3.2 * gr.y;
        float u = fract(t / per + gr.x * 3.7);
        if (u < 0.12) {
            float lit = sin(3.14159 * u / 0.12);
            vec2 c = (floor((gc + 0.2 + 0.6 * gr) * gcs * 2.0) + 0.5) * 0.5;
            vec2 o = abs(Pa - c);
            float arm = 0.5 + 3.5 * lit;
            float core = step(o.x, 0.6) * step(o.y, 0.6);
            float bar = max(step(o.x, 0.1) * step(o.y, arm), step(o.y, 0.1) * step(o.x, arm));
            float tip = bar * (1.0 - 0.55 * max(o.x, o.y) / max(arm, 0.5));
            float tick = step(abs(o.x - o.y), 0.1) * step(0.4, o.x) * step(o.x, 1.1 * lit);
            light += max(core, max(tip, 0.6 * tick)) * lit * (river ? 0.6 : 1.0) * (1.0 * sea + 0.9 * shallow + 0.75 * fresh);
        }
    }

    /* CRESTS: on the sea, the shallows and still fresh water, short bowed
       lines of light come up, stretch, drift a few px downwind and go --
       in staggered rows, each in its own time */
    if (!river && dq > 3.0) {
        vec2 ccs = vec2(46.0, 21.0);
        float row = floor(Pa.y / ccs.y);
        float sh = fract(row * 0.5) * ccs.x;
        float cx = floor((Pa.x + sh) / ccs.x);
        vec2 cid = vec2(cx, row);
        if (h12(cid + 41.3) < 0.62) {
            vec2 r = h22(cid + 7.1);
            float per = 3.0 + 2.2 * r.x;
            float u = fract(t / per + r.y * 4.3);
            if (u < 0.66) {
                float s = u / 0.66;
                float a = sin(3.14159 * s);
                float L = (3.0 + 4.5 * h12(cid + 2.2)) * (0.4 + 0.6 * a);
                vec2 c = vec2((cx + 0.15 + 0.7 * r.x) * ccs.x - sh + 6.0 * (s - 0.5), (row + 0.3 + 0.4 * r.y) * ccs.y);
                vec2 o = Pa - c;
                float xn = o.x / L;
                float yy = o.y - 0.75 * xn * xn;
                float cr = step(abs(xn), 1.0) * step(abs(yy), 0.5) + 0.45 * step(abs(xn), 0.7) * step(abs(yy - 1.0), 0.3);
                light += cr * a * (0.42 * sea + 0.24 * shallow + 0.28 * fresh);
            }
        }
    }

    /* SURF: near the shore the waves come in -- each stretch of coast in its
       own turn (ph), a line of foam riding in from D0 game px out, quicker as
       it comes, broken into lengths that differ wave to wave; the shore's
       foam flaring as it lands and letting go; a thinner line drawn back out
       after.  Fresh water's banks lap too, smaller and softer.  (D0 plus the
       line's half-width and the wash behind it stay under the field's cap,
       10 game px: all open water reads exactly 10, and a line there would
       light it all.) */
    if (dq < 9.95) {
        float surf = 1.0 - fresh;
        float ph = vn(Pa * 0.006) * 1.6 + vn(Pa * 0.03 + 3.1) * 0.25;
        float T = mix(3.0, 4.6, surf);
        float cyc = t / T + ph;
        float u = fract(cyc);
        float D0 = mix(3.5, 8.6, surf);
        float ui = clamp(u / 0.6, 0.0, 1.0);
        float dc = D0 * (1.0 - ui * ui);
        float wC = mix(0.55, 1.1, surf);
        float seg = step(0.32, vn(Pa * 0.085 + vec2(floor(cyc) * 7.31, 0.0)));
        float rise = smoothstep(0.0, 0.12, u) * step(u, 0.6);
        foam += step(abs(dq - dc), wC) * rise * mix(0.45, 1.0, seg) * mix(0.55, 1.0, surf);
        /* the wave's wash behind its line as it comes, thin foam */
        foam += step(dc + wC, dq) * step(dq, dc + wC + 2.5 * ui) * rise * ui * 0.3 * surf;
        float landed = smoothstep(0.52, 0.62, u) * (1.0 - smoothstep(0.62, 1.0, u));
        foam += step(dq, mix(1.4, 3.2, surf)) * landed * mix(0.5, 1.0, surf);
        foam += step(dq, 1.0) * mix(0.25, 0.45, surf);
        float ub = clamp((u - 0.64) / 0.32, 0.0, 1.0);
        float back = step(abs(dq - (1.2 + 4.5 * ub)), 0.5) * (1.0 - ub) * step(0.64, u);
        foam += back * 0.6 * mix(seg, 1.0, 0.4) * mix(0.4, 1.0, surf);
    }

    /* FLOW: streaks of light and flecks of foam carried down a river, the
       classic two-phase flow map -- each phase slides the pattern along for
       Tf seconds and starts again, faded out as it does while the other is at
       its fullest, so the pattern never stretches and never visibly jumps */
    if (river) {
        vec2 nrm = vec2(-dir.y, dir.x);
        float Tf = 1.8;
        float run = 30.0 * sp * Tf;
        float t1 = fract(t / Tf);
        float t2 = fract(t / Tf + 0.5);
        vec2 p1 = Pa - dir * run * t1;
        vec2 p2 = Pa - dir * run * t2 + vec2(31.7, 17.3);
        vec2 a1 = vec2(dot(p1, dir), dot(p1, nrm));
        vec2 a2 = vec2(dot(p2, dir), dot(p2, nrm));
        float w1 = 1.0 - abs(2.0 * t1 - 1.0);
        /* v2.3.3024: softer -- the owner: "The water streaks are too harsh
           in the river over the bridge".  Fewer streaks (the noise's top
           fifth, was its top third), each a line and a faint edge, at about
           half the light; the flecks half as many and fainter */
        float n1 = vn(a1 * vec2(0.06, 0.38));
        float n2 = vn(a2 * vec2(0.06, 0.38));
        float s1 = step(0.80, n1) + 0.4 * step(0.73, n1) * step(n1, 0.80);
        float s2 = step(0.80, n2) + 0.4 * step(0.73, n2) * step(n2, 0.80);
        float st = s1 * w1 + s2 * (1.0 - w1);
        vec2 fsz = vec2(11.0, 4.0);
        vec2 fc1 = floor(a1 / fsz);
        vec2 fc2 = floor(a2 / fsz);
        vec2 fo1 = abs(a1 - (fc1 + 0.5) * fsz);
        vec2 fo2 = abs(a2 - (fc2 + 0.5) * fsz);
        float fl = step(h12(fc1 + 5.5), 0.11) * step(fo1.x, 0.75) * step(fo1.y, 0.3) * w1
                 + step(h12(fc2 + 5.5), 0.11) * step(fo2.x, 0.75) * step(fo2.y, 0.3) * (1.0 - w1);
        float g = min(1.0, sp * 1.5);
        light += st * 0.2 * g;
        foam += fl * 0.45 * g * step(1.5, dq);
    }

    /* RINGS: on still fresh water (ponds, lakes, oases), now and then a ring
       opens where something rose, a second one after it (the Wheel's
       fishing spots draw their own fish) */
    if (fresh > 0.5 && !river && dq > 3.5) {
        vec2 rc = floor(Pa / 40.0);
        if (h12(rc + 9.9) < 0.42) {
            vec2 rr = h22(rc + 3.3);
            float per = 4.5 + 4.0 * rr.y;
            float u = fract(t / per + rr.x * 5.1);
            if (u < 0.42) {
                float s = u / 0.42;
                vec2 c = (floor((rc + 0.25 + 0.5 * rr) * 80.0) + 0.5) * 0.5;
                float rad = length(Pa - c);
                float ring = step(abs(rad - (1.0 + 10.0 * s)), 0.5)
                           + 0.6 * step(0.28, s) * step(abs(rad - (1.0 + 10.0 * (s - 0.28))), 0.4);
                light += min(ring, 1.0) * (1.0 - s) * 0.5;
            }
        }
    }

    /* CAPS: out on the open sea, a short whitecap now and then, carried a
       few px downwind as it goes */
    if (sea > 0.5 && dq > 6.0) {
        vec2 ccs2 = vec2(52.0, 34.0);
        vec2 wc = floor(Pa / ccs2);
        if (h12(wc + 4.4) < 0.32) {
            vec2 wr = h22(wc + 1.7);
            float per = 3.6 + 3.6 * wr.x;
            float u = fract(t / per + wr.y * 2.9);
            if (u < 0.3) {
                float s = u / 0.3;
                float a = sin(3.14159 * s);
                vec2 o = Pa - (wc + 0.2 + 0.6 * wr) * ccs2 - vec2(5.0 * s, 0.0);
                float len = (1.5 + 2.5 * h12(wc + 8.8)) * (0.5 + 0.5 * a);
                float cap = step(abs(o.y), 0.5) * step(abs(o.x), len) + 0.55 * step(abs(o.y - 1.0), 0.3) * step(abs(o.x), len * 0.6);
                foam += min(cap, 1.0) * a * 0.8;
            }
        }
    }

    col += vec3(0.80, 0.95, 1.0) * light * k;
    col = mix(col, vec3(0.94, 0.97, 0.98), clamp(foam * k, 0.0, 0.92));
    col = min(col, vec3(1.0));
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
/* `?waves=k` in the address: the motion k times as strong, 0.25 to 3 (the
   owner can try it bolder or calmer on a phone, where there is no console) */
function wavesStrength() {
  try {
    const m = /(?:^|[?&])waves=([0-9.]+)(?:&|$)/.exec(window.location.search || '');
    const k = m ? Number(m[1]) : NaN;
    if (Number.isFinite(k)) return Math.max(0.25, Math.min(3, k));
  } catch (e) { /* no address */ }
  return 1;
}
/* v2.3.3021: `?caustics=k` -- the moving web of light k times as bright,
   0 to 2 (1 by default; 0 leaves the water calm, with no web at all) */
function causticsStrength() {
  try {
    const m = /(?:^|[?&])caustics=([0-9.]+)(?:&|$)/.exec(window.location.search || '');
    const k = m ? Number(m[1]) : NaN;
    if (Number.isFinite(k)) return Math.max(0, Math.min(2, k));
  } catch (e) { /* no address */ }
  return 1;
}
/* one clock and one strength for every piece's water */
const _uni = new UniformGroup({
  uTime: { value: 0, type: 'f32' },
  uStrength: { value: wavesStrength(), type: 'f32' },
  uUvPerPx: { value: 1 / 195, type: 'f32' },
  uCaustics: { value: causticsStrength(), type: 'f32' },
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
export function setWheelWaterRenderer(r) {
  _renderer = r || null;
  /* v2.3.3021: and the Wheel's ground worker, started later, whether the
     water is drawn moving here: it then takes the frozen web of light out of
     the water pictures (ground.js CALM WATER), as the web is drawn here */
  setWheelWaterMoves(wavesOn() && webgl2());
}

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
    probe: () => ({ ..._stats, ok: _ok, webgl2: webgl2(), on: wavesOn() && !_liveOff, strength: _uni.uniforms.uStrength, caustics: _uni.uniforms.uCaustics, time: _uni.uniforms.uTime }),
    off: () => { _liveOff = true; },
    on: () => { _liveOff = false; },
    strength: (k) => { _uni.uniforms.uStrength = Math.max(0, Math.min(4, +k || 0)); },
    /* v2.3.3021: the moving web of light alone, 0 to 2 */
    caustics: (k) => { _uni.uniforms.uCaustics = Math.max(0, Math.min(2, +k || 0)); },
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
