/* ═══ v2.3.2975: THE GAME'S SPRITE SHEETS, A FEW OBJECTS A PAGE ═══
 *
 * "Download for the game" (objects/app.js atlasFiles) packs the finished
 * objects into sprite sheets the game loads, and tools/world/repack-objects.mjs
 * packs a game zip the studio made before this the same way.  Both use this
 * file, so the two can never pack differently.  Pure: no page, no canvas.
 *
 * v2.3.2965 packed each land's objects into as few pictures as held them.
 * Every object has 64 colours of its own (PIXEL.ownColours), so a land's
 * sheet of five to fourteen objects had hundreds of colours and went out as
 * a full-colour PNG: 15.7 MB for the owner's 75 objects, 7.5 MB of it the
 * sixteen buildings.  A PAGE now takes objects only while their colours
 * together fit a palette PNG (PAGE_COLOURS, 255: number 0 is see-through),
 * so three objects a page, and every page is palette numbers: one byte a
 * pixel before compression, the same pixels -- 5.0 MB for the same 75
 * (measured on the owner's zip of 2026-10-02).
 *
 * Smaller pages are also what the Wheel wants: the game loads the pages
 * whose objects stand near you (src/rendering/wheelObjects.js), so a page
 * of three kinds is loaded for three kinds, not for fourteen -- and a
 * building is a page of its own (PAGE_KINDS).
 */
export const ATLAS_MAX = 2048;   /* px a side at most: every iPhone takes a texture this big */
export const ATLAS_PAD = 2;      /* clear px between two objects, so the game's smoothing never bleeds one into the next */
export const PAGE_COLOURS = 255; /* colours a page may hold and still be a palette PNG */
/* The most kinds a page holds, by group: a building is a page of its own.
   They are the biggest pictures in the game (772 px wide, 4.6 MB a page of
   two once decoded), and the Wheel loads a page for any one of its kinds
   standing near you: one a page, and only the buildings near you are in
   memory (half the town's object memory, measured at the arrival). */
export const PAGE_KINDS = { buildings: 1 };

/* Shelves, tallest first, ATLAS_PAD between any two, at most `max` px a
   side: as many pages as the items need (one, unless they are too big for
   one).  Each item comes back with its x and y on its page. */
export function packAtlas(items, max = ATLAS_MAX, pad = ATLAS_PAD) {
  const sorted = [...items].sort((a, b) => b.h - a.h || b.w - a.w);
  const area = sorted.reduce((t, it) => t + (it.w + pad) * (it.h + pad), 0);
  const widest = Math.max(...sorted.map((it) => it.w));
  const W = Math.min(max, Math.max(widest, Math.ceil(Math.sqrt(area * 1.15) / 4) * 4));
  const pages = [];
  let page = null, x = 0, y = 0, rowH = 0;
  const newPage = () => { page = { items: [], w: 0, h: 0 }; pages.push(page); x = 0; y = 0; rowH = 0; };
  newPage();
  for (const it of sorted) {
    if (x && x + it.w > W) { y += rowH + pad; x = 0; rowH = 0; }
    /* (v2.3.2971: never an empty page -- a piece taller than a page used to
       leave one behind, whose 0 px width stopped "Download for the game") */
    if (y + it.h > max && page.items.length) newPage();
    page.items.push({ ...it, x, y });
    x += it.w + pad;
    if (it.h > rowH) rowH = it.h;
    page.w = Math.max(page.w, x - pad); page.h = Math.max(page.h, y + it.h);
  }
  return pages;
}

/* The colours of a picture's solid pixels (RGBA, 4 bytes a pixel), as
   24-bit numbers.  `into` adds them to a set already made. */
export function coloursIn(rgba, into = new Set()) {
  for (let o = 0; o < rgba.length; o += 4) {
    if (rgba[o + 3] === 0) continue;
    into.add((rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2]);
  }
  return into;
}

/* Objects onto pages: each object's pieces stay together, in the order
   given, and a page takes the next object only while all their colours
   together are PAGE_COLOURS or fewer and they still fit one page.  An object
   with more colours than that on its own gets a page of its own (full
   colour).  `objs`: [{ id, colours: Set, items: [{ w, h, ... }] }].
   Returns pages: { items (each with x, y), w, h, objects: [ids], colours }. */
export function pagesByColour(objs, { colours = PAGE_COLOURS, max = ATLAS_MAX, pad = ATLAS_PAD, kinds = Infinity } = {}) {
  const out = [];
  let cur = null;
  const close = () => {
    if (!cur) return;
    const packed = packAtlas(cur.items, max, pad);
    /* one page by construction, but a single object too big for a page
       comes back on as many as it needs */
    for (const p of packed) out.push({ ...p, objects: cur.objects.slice(), colours: cur.set.size });
    cur = null;
  };
  for (const o of objs) {
    if (!o.items.length) continue;
    if (cur) {
      const union = new Set(cur.set);
      for (const c of o.colours) union.add(c);
      const fits = union.size <= colours && cur.objects.length < kinds && packAtlas([...cur.items, ...o.items], max, pad).length === 1;
      if (fits) { cur.set = union; cur.items.push(...o.items); cur.objects.push(o.id); continue; }
      close();
    }
    cur = { set: new Set(o.colours), items: [...o.items], objects: [o.id] };
  }
  close();
  return out;
}
