/* v2.3.3580: THE TOWNSFOLK ARE BROS FROM THE CHARACTER CREATOR -- on a phone.
 *
 * The owner: "generate the art for the characters described in the document
 * using the Brotown character creator ... NPCs should look like normal bro
 * characters."  Every townsperson's picture is now the player's own figure
 * in a creator look, photographed by tools/qa/npc-looks.mjs (see there).
 * In the Wheel's BroTown:
 *
 *   1. every townsperson's picture comes in at the new art's version
 *      (NPC_ART_VERSION, 2.3.3587 since the collection's pieces), none at
 *      an old one;
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
 *  4c. v2.3.3585, the owner: "modify the existing portraits to look like how
 *      you designed them in the game (mayor bro suspenders, larger beard,
 *      etc)" -- every portrait wears his world look: the shirt colour of his
 *      creator look on his chest (the Blacksmith his bare skin), a bearded
 *      one's beard running down to the bust's foot, and the Mayor's monocle
 *      glass blue -- v2.3.3587: clear, the collection's, as the world's is now;
 *  4d. v2.3.3587, the owner: "Game matches collection" -- the Mayor wears the
 *      collection's monocle in the world, round the eye his portrait wears it
 *      on (the viewer's right), where the old piece sat on the other eye;
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/npclooks-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const ART_V = '2.3.3587';   /* NPC_ART_VERSION (npcSprites.js): v2.3.3587 the collection's pieces */
/* world px of a townsperson's 256 px cell: NPC_SPRITE_SCALE (120/256) x his
   size (entityRenderer NPC_SCALE_MULT) -- Lil Bro's cell too: he is
   photographed small, not drawn small */
const BRO = 256 * (120 / 256) * 1.25;
const SIZE = { 'Mayor Bro': BRO * 1.10 };
/* his tell: a colour of his creator look his old picture never had (the
   old ones: a purple-shorted mayor, an aproned smith, long coats on Diego,
   the farmer and the beastmaster, a white-teed Lil Bro, a green-suited
   Ace).  Ratios, not levels: the town's light and the form shading move the
   levels.  null: no colour of his is safe from the grass behind him. */
const TELL = {
  'Mayor Bro': ['navy pinstriped tee', (r, g, b) => b > r + 35 && b > g + 20 && r < 110],
  'Blacksmith Bro': ['red sweatband', (r, g, b) => r > g + 80 && r > b + 80],
  'Diego': ['purple and gold tee', (r, g, b) => b > g + 40 && r > g + 30],
  'Farmer Bro': ['pink zig-zag', (r, g, b) => r > g + 50 && b > g + 20 && r > 150],
  'Woodworker Bro': ['graph-paper tee', (r, g, b) => b > r + 35 && b > g + 20 && r < 110],
  'Lil Bro': ['orange stripes', (r, g, b) => r > g + 50 && g > b + 30 && r > 160],
  'Ace': null,
  'Beastmaster Bro': null,
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
    /* v2.3.5421 (card J2): drawn live, his height is his facing's (a bro is
       taller turned three-quarters than square on): every one turned south,
       as the photographs were taken, through the game's own QA lever
       (lookFolk.js __btLookFolkFace, mp-lookfolk's facings); their own
       again after check 3 */
    const faced = await P.page.evaluate(() => typeof window.__btLookFolkFace === 'function' ? window.__btLookFolkFace('south') : null);
    for (const n of cast) {
      /* beside him, not in front: your own figure and plate stay out of his
         box, and Diego's drawer (90 px) stays shut */
      await H.hopTo(P, n.x + 120, n.y + 40, { step: 100, gap: 260, tries: 90 });
      await P.page.waitForTimeout(900);
      await P.page.evaluate(() => { const b = document.querySelector('[data-shop-close]'); if (b) b.click(); });
      await H.closeNpcDialogue(P).catch(() => {});
      await P.page.waitForTimeout(500);
      await cameraStill(P);
      /* v2.3.5421 (card J2): drawn live (v2.3.3809) he walks his day
         (v2.3.4058): read him once he has stopped (a stand or his work, not
         the jog), and his feet against where he stands NOW, not where the
         cast was read */
      const look = () => P.page.evaluate((nm) => {
        const S = window._gameState.current;
        const s = (window.__btNpcSprites ? window.__btNpcSprites() : []).find((q) => q.name === nm);
        const here = (S.npcs || []).find((q) => q.name === nm);
        const c = document.querySelector('canvas'), r = c.getBoundingClientRect();
        if (!s || !S.camera) return null;
        const k = S._worldScaleX || 1;
        return { h: s.height, x: s.x, y: s.y, footY: s.footY, frame: s.frame, src: s.src, size: s.size, paintTop: s.paintTop,
          live: !!s.live, pose: s.pose || null, nowY: here ? here.y : null,
          sx: r.left + (s.x - S.camera.x) * k, sy: r.top + (s.y - S.camera.y) * (S._worldScaleY || k), k };
      }, n.name);
      let d = await look();
      for (let i = 0; i < 20 && d && d.live && d.pose === 'jog'; i++) { await P.page.waitForTimeout(500); d = await look(); }
      const row = NPC_DATA.find((q) => q.name === n.name);
      const want = SIZE[n.name] || BRO;
      sized.push({ name: n.name, h: d && +d.h.toFixed(1), want: +want.toFixed(1), frame: d && d.frame,
        size: d && d.size, paintTop: d && d.paintTop != null ? +d.paintTop.toFixed(1) : null,
        live: !!(d && d.live), pose: d && d.pose, rel: (want / BRO) * ((d && d.size) || 1),
        feet: !!d && Math.abs(d.footY - (d.nowY != null ? d.nowY : n.y)) < 1,
        /* the photographs' way (?lookfolk=0): his cell's own height and his
           stand cell, as v2.3.3580 had them; live, judged across the cast
           below */
        ok: !!d && (d.live || (Math.abs(d.h - want) < 0.6 && (!(row && row.walk) || d.frame === row.walk.stand))) });
      const tag = n.name.toLowerCase().replace(/\s+/g, '-');
      if (d) {
        /* the figure's box on the screen: his cell's width a third either
           side, from his feet up 0.8 of the cell */
        const fh = d.h * 0.8 * d.k, fw = d.h * 0.34 * d.k;
        const clip = { x: Math.max(0, Math.round(d.sx - fw)), y: Math.max(0, Math.round(d.sy - fh)), width: Math.round(fw * 2), height: Math.round(fh) };
        await P.page.screenshot({ path: join(OUT, `npclooks-${tag}.png`), clip }).catch(() => {});
        const t = TELL[n.name];
        if (t) {
          let count = (await H.screenshotPixels(P, clip)).count(t[1]);
          /* v2.3.5421 (card J2): he walks his day (v2.3.4058), and where he
             stops the scenery may stand in front of him -- Diego, 2 runs of
             5, under the General Store's sign, his head alone in the crop
             (census row 6; Found).  A crop that reads nothing of his look is
             read again once he has moved on, beside where he is then, the
             same bar (25 px) each time: up to four looks, 4 s apart. */
          let tries = 1;
          for (; count <= 25 && tries < 4; tries++) {
            await P.page.waitForTimeout(4000);
            const at = await P.page.evaluate((nm) => { const q = (window._gameState.current.npcs || []).find((m) => m.name === nm); return q ? { x: q.x, y: q.y } : null; }, n.name);
            if (at) await H.hopTo(P, at.x + 120, at.y + 40, { step: 100, gap: 260, tries: 90 });
            await P.page.evaluate(() => { const b = document.querySelector('[data-shop-close]'); if (b) b.click(); });
            await H.closeNpcDialogue(P).catch(() => {});
            await cameraStill(P);
            const d2 = await look();
            if (!d2) continue;
            const fh2 = d2.h * 0.8 * d2.k, fw2 = d2.h * 0.34 * d2.k;
            const clip2 = { x: Math.max(0, Math.round(d2.sx - fw2)), y: Math.max(0, Math.round(d2.sy - fh2)), width: Math.round(fw2 * 2), height: Math.round(fh2) };
            await P.page.screenshot({ path: join(OUT, `npclooks-${tag}-${tries + 1}.png`), clip: clip2 }).catch(() => {});
            count = (await H.screenshotPixels(P, clip2)).count(t[1]);
          }
          tells.push({ name: n.name, what: t[0], count, tries, ok: count > 25 });
        }
      } else tells.push({ name: n.name, what: 'not drawn', count: 0, ok: false });
    }
    await P.page.evaluate(() => { if (typeof window.__btLookFolkFace === 'function') window.__btLookFolkFace(null); });
    /* v2.3.5421 (card J2): since v2.3.3809 (the owner's rule for the memory
       work: ON by default, `?lookfolk=0` the photographs) each is drawn live
       from his look as a player is (rendering/lookFolk.js), his size the
       photographs' own table (entityRenderer _drawFolk: NPC_SCALE_MULT, the
       mayor 10% over, times npcFigureSize).  His body's height then is a
       player's in that pose, not a 256 px cell: so, standing and facing
       south (above), each one's
       height over his size is the SAME bro's (within 3% of the cast's
       middle), the mayor 1.1 and Lil Bro 0.8 of it; one at his work (the
       chef's pose) is drawn, feet on his spot, his height his pose's.  Red
       on main since v2.3.3809: the TEST's (docs/plan/census/red.md row 6). */
    const standing = sized.filter((s) => s.live && s.pose === 'stand' && s.h > 0);
    const per = standing.map((s) => s.h / s.rel).sort((a, b) => a - b);
    const mid = per.length ? per[Math.floor(per.length / 2)] : 0;
    for (const s of sized) if (s.live) s.ok = s.ok && s.h > 0 && (s.pose !== 'stand' || Math.abs(s.h / s.rel - mid) <= mid * 0.03);
    rec.ok(`2. each is a bro's size, feet on his spot, a walker on his standing cell (live: ${standing.length} standing, turned ${faced || 'their own way'}, a bro ${mid ? mid.toFixed(1) : '?'} px): ${sized.map((s) => `${s.name} ${s.h}${s.live ? ' ' + s.pose + ' x' + s.rel.toFixed(2) : ' (' + s.want + ')'}${!s.live && s.frame != null ? ' cell ' + s.frame : ''}`).join(', ')}`,
      sized.length === cast.length && sized.every((s) => s.ok && s.feet) && (!sized.some((s) => s.live) || (standing.length >= 6 && faced === 'south')), sized);
    /* a grown Lil Bro would be painted ~1.08 of Diego's height (his
       figure 196 picture px to Diego's 186): 0.8 of it is ~0.87.  Live
       (v2.3.5421): his body drawn 0.8 of Diego's, both standing */
    const lil = sized.find((q) => q.name === 'Lil Bro'), dg = sized.find((q) => q.name === 'Diego');
    const both = !!(lil && dg && lil.live && dg.live && lil.pose === 'stand' && dg.pose === 'stand');
    const kid = !lil || !dg ? null
      : (both && dg.h ? +(lil.h / dg.h).toFixed(3) : (lil.paintTop && dg.paintTop ? +(lil.paintTop / dg.paintTop).toFixed(3) : null));
    rec.ok(`2b. Lil Bro is a child: figure size ${lil && lil.size}, ${both ? `drawn ${lil.h} world px to Diego's ${dg.h}` : `painted ${lil && lil.paintTop} world px over his feet to Diego's ${dg && dg.paintTop}`} (${kid})`,
      !!lil && lil.size === 0.8 && kid != null && (both ? (kid > 0.77 && kid < 0.83) : (kid > 0.8 && kid < 0.92)), { lil, dg });
    rec.ok(`3. each one's creator look is what is painted: ${tells.map((t) => `${t.name}'s ${t.what} ${t.count} px${t.tries > 1 ? ' (look ' + t.tries + ')' : ''}`).join(', ')}`,
      tells.length >= 6 && tells.every((t) => t.ok), tells);

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

    /* ── 4c. every portrait wears his world look (v2.3.3585) ── */
    const dressed = await P.page.evaluate(async ({ v }) => {
      /* a bust pixel's colour: the middle of its 6 x 6 block */
      const px = (d, x, y) => { const i = ((y * 6 + 3) * 192 + (x * 6 + 3)) * 4; return [d[i], d[i + 1], d[i + 2]]; };
      const out = {};
      for (const h of ['mayor-bro', 'blacksmith-bro', 'shopkeeper-bro', 'farmer-bro', 'woodworker-bro', 'beastmaster-bro', 'lil-bro', 'cardsharp-bro']) {
        const r = await fetch(`/sprites/npc/${h}-head.webp?v=${v}`);
        const bmp = await createImageBitmap(await r.blob());
        const c = document.createElement('canvas'); c.width = 192; c.height = 192;
        const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
        const d = g.getImageData(0, 0, 192, 192).data;
        /* the chest: the bust's last three rows, from x 6 to 27; the beard's
           foot: the last row's middle */
        const chest = [];
        for (let y = 29; y < 32; y++) for (let x = 6; x < 28; x++) chest.push(px(d, x, y));
        out[h] = { chest, foot: [px(d, 12, 31), px(d, 14, 31)], lens: px(d, 14, 15) };
      }
      return out;
    }, { v: ART_V });
    const has = (cs, f) => cs.filter(([r, g, b]) => f(r, g, b)).length;
    const SHIRT = {
      'mayor-bro': ['navy and white', (r, g, b) => b > r + 35 && b > g + 20 && r < 110],
      'blacksmith-bro': ['bare skin', (r, g, b) => r > g + 40 && g > b + 30 && r > 150],
      'shopkeeper-bro': ['purple', (r, g, b) => b > g + 40 && r > g + 30],
      'farmer-bro': ['yellow', (r, g, b) => r > 150 && g > 120 && b < 100],
      'woodworker-bro': ['navy and white', (r, g, b) => b > r + 35 && b > g + 20 && r < 110],
      'beastmaster-bro': ['green camo', (r, g, b) => g > r + 25 && g > b + 15],
      'lil-bro': ['orange bands', (r, g, b) => r > g + 50 && g > b + 30 && r > 160],
      'cardsharp-bro': ['green felt', (r, g, b) => g > r + 25 && g > b + 15],
    };
    const BEARD = {
      'mayor-bro': ['grey', (r, g, b) => Math.abs(r - g) < 14 && Math.abs(g - b) < 16 && r > 80],
      'blacksmith-bro': ['black', (r, g, b) => Math.max(r, g, b) < 75],
      'farmer-bro': ['brown', (r, g, b) => r > b + 25 && r < 200 && g < 150],
      'beastmaster-bro': ['brown', (r, g, b) => r > b + 25 && r < 200 && g < 150],
    };
    const dressedRows = Object.entries(dressed).map(([h, q]) => {
      const [what, f] = SHIRT[h];
      const shirt = has(q.chest, f);
      const beard = BEARD[h] ? q.foot.every(([r, g, b]) => BEARD[h][1](r, g, b)) : null;
      return { h, what, shirt, beard, ok: shirt >= 4 && beard !== false };
    });
    const lens = dressed['mayor-bro'] && dressed['mayor-bro'].lens;
    /* v2.3.3587: the collection's clear glass (its glint over the eye), no
       longer v2.3.3585's blue: the world's monocle is the collection's now */
    const clear = !!lens && Math.min(...lens) > 200 && Math.max(...lens) - Math.min(...lens) < 30;
    rec.ok(`4c. every portrait wears his world look: ${dressedRows.map((t) => `${t.h.replace('-bro', '')} ${t.what} ${t.shirt} px${t.beard === null ? '' : t.beard ? ', beard to his chest' : ', NO long beard'}`).join('; ')}; the Mayor's monocle glass ${lens}, clear`,
      dressedRows.length === 8 && dressedRows.every((t) => t.ok) && clear, { dressedRows, lens });

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
