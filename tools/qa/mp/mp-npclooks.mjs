/* v2.3.3580: THE TOWNSFOLK ARE BROS FROM THE CHARACTER CREATOR -- on a phone.
 *
 * The owner: "generate the art for the characters described in the document
 * using the Brotown character creator ... NPCs should look like normal bro
 * characters."  Every townsperson's picture is now the player's own figure
 * in a creator look, photographed by tools/qa/npc-looks.mjs (see there).
 * In the Wheel's BroTown:
 *
 *   1. every townsperson's picture comes in at the new art's version
 *      (NPC_ART_VERSION 2.3.3580), none at an old one;
 *   2. each is drawn a bro's size -- the player's own PLAYER_SIZE_MULT, the
 *      mayor 10% over it (the owner's v2.3.1822) -- his feet on his spot, a
 *      walker on his standing cell (8); and Lil Bro a child: his cell drawn
 *      at a bro's scale like everyone's, his figure PHOTOGRAPHED 0.8 of a
 *      bro in it (NPC_DATA figureSize), so it is painted shorter than
 *      Diego's;
 *   3. each one's look is what is painted: a colour his creator look has and
 *      his old picture did not, counted on the screen beside him;
 *   4. Mayor Bro's dialogue shows his Hemi Bros portrait (tools/qa/
 *      nft_portraits.py): 192 px, on the collection's Purple Navy, and every
 *      one of its 32 x 32 pixels a flat 6 x 6 block -- the owner found the
 *      headshot before it "fuzzy";
 *  4b. and crisp wherever else it is shown: Diego's in his shop (32 px) and
 *      Ace's in his coin flip (64 px), each a whole number of CSS px a
 *      portrait pixel, drawn pixelated (smoothed, they blurred);
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/npclooks-*.png.
 *
 * v2.3.3588: EACH WEARS WHAT HIS PORTRAIT WEARS (tools/qa/npc-looks.mjs's
 * header: the owner's "make the characters in game just look more like the
 * portraits").  The art version is 2.3.3588, and 3's tells are the new
 * looks': a colour each new outfit has and his v2.3.3580 picture did not,
 * counted where it is worn (`band`: a share of the crop's height from its
 * top, `mid`: the middle of its width) -- the Mayor's red tie, Blacksmith Bro's
 * chest bare under his short beard, Diego's navy bomber, Farmer Bro's orange
 * shirt, Woodworker Bro's black stripes, the zips of Beastmaster Bro's and Lil
 * Bro's jackets, Ace's teal wool shirt.  And 4d (v2.3.3587, the collection's
 * eyewear): the Mayor wears the collection's monocle round his right-hand
 * eye, as his portrait does.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const ART_V = '2.3.3588';
/* world px of a townsperson's 256 px cell: NPC_SPRITE_SCALE (120/256) x his
   size (entityRenderer NPC_SCALE_MULT) -- Lil Bro's cell too: he is
   photographed small, not drawn small */
const BRO = 256 * (120 / 256) * 1.25;
const SIZE = { 'Mayor Bro': BRO * 1.10 };
/* his tell: a colour of his creator look his old picture never had.
   Ratios, not levels: the town's light and the form shading move the
   levels.  `band` [top, bottom] as shares of the crop's height from its top
   (the crop runs from his feet up 0.8 of his cell, so his torso is about
   0.36-0.62 of it), `mid` the middle half of its width: where the outfit is,
   and where the grass, the street and his own outline are not.
   v2.3.3588: the looks of his portrait (see the header); the old pictures are
   v2.3.3580's -- a navy-striped mayor, a long-bearded smith, Diego's purple
   and gold tee, the farmer's yellow and pink, a windowpane tee, brown camo, an
   orange-and-white banded Lil Bro, Ace's green and yellow. */
const dark = (r, g, b) => r < 70 && g < 70 && b < 70;
const zipGrey = (r, g, b) => r > 115 && r < 195 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18;
const TELL = {
  'Mayor Bro': ['red tie', (r, g, b) => r > g + 70 && r > b + 70 && g < 110, { band: [0.36, 0.62], mid: true }],
  'Blacksmith Bro': ['bare chest under a short beard', (r, g, b) => r > 120 && r > g + 25 && g > b + 15, { band: [0.36, 0.5], mid: true }],
  'Diego': ['navy bomber', (r, g, b) => b > r + 40 && b > g + 30 && r < 80 && g < 90, { band: [0.36, 0.62] }],
  'Farmer Bro': ['orange shirt', (r, g, b) => r > 170 && g > 85 && g < 150 && b < 70, { band: [0.36, 0.62] }],
  'Woodworker Bro': ['black stripes', dark, { band: [0.36, 0.62], mid: true }],
  'Beastmaster Bro': ['jacket zip', zipGrey, { band: [0.36, 0.62], mid: true }],
  'Lil Bro': ['jacket zip', zipGrey, { band: [0.36, 0.62], mid: true }],
  'Ace': ['teal wool shirt', (r, g, b) => g > r + 70 && b > r + 60 && b > 115, { band: [0.36, 0.62] }],
};

/* the welcome and the coach's tips seen (mp-mayorart's, the game's own
   flags): the welcome rides a banner over the middle of the screen */
const SEEN = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt_welcome_seen', '1');
} catch (e) {}`;

/* until the camera has stopped (rounded, eight frames running): the crop is
   worked out from it, and a camera still easing toward you puts the crop
   beside him (mp-mayorart's lesson) */
const cameraStill = (P) => P.page.evaluate(() => new Promise((res) => {
  const S = window._gameState.current;
  let last = null, still = 0, n = 0;
  const tick = () => {
    const now = Math.round(S.camera.x) + ',' + Math.round(S.camera.y);
    still = (now === last) ? still + 1 : 0;
    last = now;
    if (still >= 8 || ++n > 600) return res();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const { NPC_DATA } = await import(H.REPO + '/src/data/gameDisplay.js');

  const P = await H.newPlayer(browser, { name: 'Looksbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, init: SEEN });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  /* every townsperson picture the page asks for, with its version */
  const figureFiles = new Set();
  for (const n of NPC_DATA) {
    if (n.sprite) figureFiles.add(n.sprite.replace(/^.*\/sprites\/npc\//, ''));
    if (n.walk && n.walk.base) for (const d of n.walk.dirs || []) figureFiles.add(n.walk.base.replace(/^.*\/sprites\/npc\//, '') + d + '.webp');
    if (n.portrait) figureFiles.add(n.portrait.replace(/^.*\/sprites\/npc\//, ''));
  }
  const asked = [];
  P.page.on('request', (r) => {
    const u = r.url();
    if (!/\/sprites\/npc\//.test(u)) return;
    const f = u.split('?')[0].replace(/^.*\/sprites\/npc\//, '');
    if (figureFiles.has(f)) { const m = /[?&]v=([^&]+)/.exec(u); asked.push({ f, v: m ? m[1] : null }); }
  });
  const stopAlive = H.keepAlive(P);

  try {
    await H.enterWorld(P);
    const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inWheel, inWheel);
    if (!inWheel) return;
    const id = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    const cast = await H.waitFor(P, (S) => (S.npcs || []).map((n) => ({ name: n.name, id: n.id, x: n.x, y: n.y })),
      (v) => v.length >= 6, { timeout: 20000, label: 'the cast' }).catch(() => []);
    rec.ok(`the townsfolk stand in BroTown (${cast.map((n) => n.name).join(', ')}) (guard)`, cast.length >= 6, cast);

    /* ── 1. the new pictures, at their version ── */
    await P.page.waitForTimeout(1000);
    const stale = asked.filter((q) => q.v !== ART_V);
    rec.ok(`every townsperson picture came in at the new art's version (${asked.length} asked, ${stale.length} not at ${ART_V})`,
      asked.length >= cast.length && stale.length === 0, { stale, asked });

    /* ── 2 and 3. each one: his size, his spot, his cell, his look ── */
    const sized = [], tells = [];
    for (const n of cast) {
      /* beside him, not in front: your own figure and plate stay out of his
         box, and Diego's drawer (90 px) stays shut */
      await H.hopTo(P, n.x + 120, n.y + 40, { step: 100, gap: 260, tries: 90 });
      await P.page.waitForTimeout(900);
      await P.page.evaluate(() => { const b = document.querySelector('[data-shop-close]'); if (b) b.click(); });
      await H.closeNpcDialogue(P).catch(() => {});
      await P.page.waitForTimeout(500);
      await cameraStill(P);
      const d = await P.page.evaluate((nm) => {
        const S = window._gameState.current;
        const s = (window.__btNpcSprites ? window.__btNpcSprites() : []).find((q) => q.name === nm);
        const c = document.querySelector('canvas'), r = c.getBoundingClientRect();
        if (!s || !S.camera) return null;
        const k = S._worldScaleX || 1;
        return { h: s.height, x: s.x, y: s.y, footY: s.footY, frame: s.frame, src: s.src, size: s.size, paintTop: s.paintTop,
          sx: r.left + (s.x - S.camera.x) * k, sy: r.top + (s.y - S.camera.y) * (S._worldScaleY || k), k };
      }, n.name);
      const row = NPC_DATA.find((q) => q.name === n.name);
      const want = SIZE[n.name] || BRO;
      sized.push({ name: n.name, h: d && +d.h.toFixed(1), want: +want.toFixed(1), frame: d && d.frame,
        size: d && d.size, paintTop: d && d.paintTop != null ? +d.paintTop.toFixed(1) : null,
        ok: !!d && Math.abs(d.h - want) < 0.6 && Math.abs(d.footY - n.y) < 1
          && (!(row && row.walk) || d.frame === row.walk.stand) });
      const tag = n.name.toLowerCase().replace(/\s+/g, '-');
      if (d) {
        /* the figure's box on the screen: his cell's width a third either
           side, from his feet up 0.8 of the cell */
        const fh = d.h * 0.8 * d.k, fw = d.h * 0.34 * d.k;
        const clip = { x: Math.max(0, Math.round(d.sx - fw)), y: Math.max(0, Math.round(d.sy - fh)), width: Math.round(fw * 2), height: Math.round(fh) };
        await P.page.screenshot({ path: join(OUT, `npclooks-${tag}.png`), clip }).catch(() => {});
        const t = TELL[n.name];
        if (t) {
          const px = await H.screenshotPixels(P, clip);
          const where = t[2] || {};
          const [b0, b1] = where.band || [0, 1];
          const inside = (x, y) => y >= b0 * px.height && y < b1 * px.height
            && (!where.mid || (x >= px.width * 0.25 && x < px.width * 0.75));
          const count = px.count((r, g, b, x, y) => inside(x, y) && t[1](r, g, b));
          tells.push({ name: n.name, what: t[0], count, ok: count > 25 });
        }
      } else tells.push({ name: n.name, what: 'not drawn', count: 0, ok: false });
    }
    rec.ok(`2. each is a bro's size, feet on his spot, a walker on his standing cell: ${sized.map((s) => `${s.name} ${s.h} (${s.want})${s.frame != null ? ' cell ' + s.frame : ''}`).join(', ')}`,
      sized.length === cast.length && sized.every((s) => s.ok), sized);
    /* a grown Lil Bro would be painted ~1.08 of Diego's height (his
       figure 196 picture px to Diego's 186): 0.8 of it is ~0.87 */
    const lil = sized.find((q) => q.name === 'Lil Bro'), dg = sized.find((q) => q.name === 'Diego');
    const kid = lil && dg && lil.paintTop && dg.paintTop ? +(lil.paintTop / dg.paintTop).toFixed(3) : null;
    rec.ok(`2b. Lil Bro is a child: figure size ${lil && lil.size}, painted ${lil && lil.paintTop} world px over his feet to Diego's ${dg && dg.paintTop} (${kid})`,
      !!lil && lil.size === 0.8 && kid != null && kid > 0.8 && kid < 0.92, { lil, dg });
    rec.ok(`3. each one's creator look is what is painted: ${tells.map((t) => `${t.name}'s ${t.what} ${t.count} px`).join(', ')}`,
      tells.length >= 8 && tells.every((t) => t.ok), tells);

    /* ── 4. the Mayor's head in his dialogue ── */
    const opened = await H.approachNpc(P, 'mayor_bro');
    const head = await P.page.evaluate(async () => {
      const img = document.querySelector('.bt-npcdlg-img');
      if (!img) return null;
      if (!img.complete) await new Promise((r) => { img.onload = r; img.onerror = r; setTimeout(r, 4000); });
      const out = { src: img.getAttribute('src'), w: img.naturalWidth, h: img.naturalHeight };
      if (!out.w) return out;
      /* its own pixels: the corner is the bust's background, and a 6 x 6
         block that is not one colour is a pixel smoothed */
      const c = document.createElement('canvas');
      c.width = out.w; c.height = out.h;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, out.w, out.h).data;
      let mixed = 0;
      for (let by = 0; by + 6 <= out.h; by += 6) {
        for (let bx = 0; bx + 6 <= out.w; bx += 6) {
          const i0 = (by * out.w + bx) * 4;
          let flat = true;
          for (let y = by; y < by + 6 && flat; y++) {
            for (let x = bx; x < bx + 6; x++) {
              const i = (y * out.w + x) * 4;
              if (d[i] !== d[i0] || d[i + 1] !== d[i0 + 1] || d[i + 2] !== d[i0 + 2]) { flat = false; break; }
            }
          }
          if (!flat) mixed++;
        }
      }
      out.corner = [d[0], d[1], d[2]];
      out.mixed = mixed;
      return out;
    });
    await P.page.screenshot({ path: join(OUT, 'npclooks-mayor-dialogue.png') }).catch(() => {});
    const navy = head && head.corner && Math.abs(head.corner[0] - 86) + Math.abs(head.corner[1] - 85) + Math.abs(head.corner[2] - 142) <= 6;
    rec.ok(`4. Mayor Bro's dialogue shows his Hemi Bros portrait (${head ? head.src + ' ' + head.w + ' x ' + head.h + ', corner ' + head.corner + ', ' + head.mixed + ' blocks not flat' : 'none'})`,
      !!opened && !!head && head.src.endsWith('mayor-bro-head.webp?v=' + ART_V) && head.w === 192 && head.h === 192
        && navy && head.mixed === 0, { opened, head });

    /* ── 4b. crisp wherever else he is shown ── */
    const crisp = await P.page.evaluate(async () => {
      window.__broShopBus.setOpen(true);
      window.__btAceFlipBus.setOpen(true);
      const read = (sel) => {
        const img = document.querySelector(sel);
        if (!img) return null;
        const r = img.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), render: getComputedStyle(img).imageRendering,
          nat: img.naturalWidth, src: img.getAttribute('src') };
      };
      let out = null;
      for (let i = 0; i < 40; i++) {
        out = { shop: read('[data-shop-panel] img[src*="shopkeeper-bro-head"]'), ace: read('img[src*="cardsharp-bro-head"]') };
        if (out.shop && out.ace && out.shop.nat && out.ace.nat) break;
        await new Promise((r) => setTimeout(r, 150));
      }
      window.__broShopBus.setOpen(false);
      window.__btAceFlipBus.setOpen(false);
      return out;
    });
    const sharp = (q, w) => !!q && q.render === 'pixelated' && q.w === w && q.h === w && q.nat === 192 && w % 32 === 0;
    rec.ok(`4b. his portrait is crisp wherever else it is shown: Diego's shop ${crisp.shop ? crisp.shop.w + ' px ' + crisp.shop.render : 'none'}, `
         + `Ace's coin flip ${crisp.ace ? crisp.ace.w + ' px ' + crisp.ace.render : 'none'}`,
      sharp(crisp.shop, 32) && sharp(crisp.ace, 64), crisp);

    /* ── 4d. the world wears the collection's monocle (v2.3.3587) ──
       Its gold, above his shoulders, sits on the viewer's right of his
       figure's middle, round the eye his portrait wears it on; the old piece's
       sat left of it. */
    const mono = await P.page.evaluate(async ({ v }) => {
      const r = await fetch(`/sprites/npc/mayor-bro.webp?v=${v}`);
      const bmp = await createImageBitmap(await r.blob());
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let l = c.width, rr = -1, sx = 0, n = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if (d[i + 3] < 100) continue;
        if (x < l) l = x; if (x > rr) rr = x;
        if (y < 100 && d[i] > 200 && d[i + 1] > 140 && d[i + 2] < 90) { sx += x; n++; }
      }
      return { gold: n, goldX: n ? Math.round(sx / n) : null, mid: (l + rr) / 2 };
    }, { v: ART_V });
    rec.ok(`4d. the Mayor wears the collection's monocle in the world, round his right-hand eye as his portrait does (its gold at x ${mono.goldX}, his middle ${mono.mid}, ${mono.gold} px)`,
      mono.gold > 40 && mono.goldX > mono.mid, mono);

    rec.ok('5. no page errors', errors.length === 0, errors);
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
