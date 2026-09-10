/* READY-MADE DESIGNS, AND WHAT PICKING ONE ACTUALLY DOES (v2.3.2444).
 *
 * Owner: "Can you make some pre-done tattoo designs to choose from? ... (launch
 * its own window to choose from within the editor)".
 *
 * Every assertion here reads the 256-character art string out of localStorage,
 * or the op blob beside it -- never the gallery's own markup.  A scenario that
 * checked for a grid of buttons would pass on a gallery whose tiles do nothing,
 * which is exactly the failure mode of a feature that is mostly a picker: the
 * thumbnails are the easy half and what lands on the character is the half that
 * can silently be wrong.
 *
 * The catalogue is imported HERE, from the same module the client bundles, so
 * "the gallery shows every design" is checked against the real table rather
 * than against a number typed into this file -- and the entry count is the
 * thing that catches designCatalog's own validity filter quietly dropping a
 * malformed design instead of shipping it.
 *
 *   1. the gallery opens from the editor and shows the WHOLE catalogue
 *   2. applying one puts EXACTLY that design's string on the canvas
 *   3. it arrives as one piece per colour, so Select has something to pick up
 *   4. ONE tap of Undo puts back exactly what was there before
 *   5. it survives closing and reopening the panel
 *   6. Cancel changes nothing
 */
import { DESIGN_CATALOG, DESIGN_COUNT_AUTHORED, DESIGN_CATEGORIES } from '../../../src/rendering/traits/designCatalog.js';

const openCreator = async (P) => {
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await P.page.waitForTimeout(2400);
};

/* Into the Skin tab's editor, which is the tattoo canvas. */
const openPaint = async (P) => {
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-cc-tabs .bt-cc-tab')]
      .find((x) => (x.textContent || '').trim() === 'Skin');
    if (b) b.click();
  });
  await P.page.waitForTimeout(600);
  await P.page.click('button.bt-cc-ink-pane');
  await P.page.waitForSelector('.bt-paint', { timeout: 15000 });
  await P.page.waitForTimeout(500);
};

const openGallery = (P) => P.page.evaluate(() => {
  const b = [...document.querySelectorAll('.bt-paint-note button')]
    .find((x) => /designs/i.test(x.textContent || ''));
  if (!b) return false;
  b.click(); return true;
});

/* The gallery is the LAST scrim on screen -- it layers over the panel's own. */
const gallery = (P, fn) => P.page.evaluate(fn);

/* A canvas that has never been written has NO key; one that has been cleared
   holds 256 zeros.  Both mean "nothing drawn", so read them as the same thing
   -- comparing the raw values made a correct Undo of the first design a player
   ever applies look like a failure. */
const BLANK = '0'.repeat(256);
const art = (P) => P.page.evaluate(() => localStorage.getItem('bt-tattooart') || '')
  .then((v) => (v.length === 256 ? v : BLANK));
const ops = (P) => P.page.evaluate(() => {
  const b = JSON.parse(localStorage.getItem('bt-artops') || '{}');
  return (b.tattoo && b.tattoo.o) || [];
});

/* The gate's guarantees, checked against the module the client bundles.  These
   need no browser -- they are what stops a pasted-in design shipping broken,
   and v2.3.2445 found the gate joining rows BEFORE validating them, which
   turned a malformed paste into a blank screen at boot rather than a drop. */
function catalogueInvariants(rec, tag) {
  const ids = new Set(), names = new Set();
  const cats = new Set(DESIGN_CATEGORIES.map((c) => c.id));
  let dupId = 0, dupName = 0, orphanCat = 0, unfrozen = 0, badArt = 0;
  for (const d of DESIGN_CATALOG) {
    if (ids.has(d.id)) dupId++; ids.add(d.id);
    if (names.has(d.name)) dupName++; names.add(d.name);
    if (!cats.has(d.cat)) orphanCat++;
    if (!Object.isFrozen(d) || !Object.isFrozen(d.rows)) unfrozen++;
    if (d.art.length !== 256 || d.rows.join('') !== d.art) badArt++;
  }
  rec.ok(`${tag}: every design id is unique -- a duplicate is a duplicate React `
    + `key, and reconciliation stops being reliable across a filter change`, dupId === 0);
  rec.ok(`${tag}: every design name is unique -- this scenario picks its tile by `
    + `visible text, so a duplicate would assert against the wrong design`, dupName === 0);
  rec.ok(`${tag}: every design's category is one a filter chip offers -- an orphan `
    + `category is reachable only under All, which looks like nothing is wrong`, orphanCat === 0);
  rec.ok(`${tag}: catalogue entries are frozen, so a consumer cannot mutate the `
    + `table and leave rows disagreeing with art`, unfrozen === 0);
  rec.ok(`${tag}: every entry's rows still join to exactly its art string`, badArt === 0);
}

export async function run({ browser, wsPort, webPort, rec }) {
  catalogueInvariants(rec, 'designs');
  const P = await (await import('./harness.mjs')).newPlayer(browser, {
    name: 'Ink', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  const tag = 'designs';

  await openCreator(P);
  await openPaint(P);

  /* ── 0. the button is REACHABLE, not merely present ──
     TRAPS #67: el.click() inside page.evaluate does not hit-test, so every
     other assertion in this file would stay green with the button rendered
     below the panel's fold -- which is exactly what happened to the front/back
     switch at v2.3.2414, in this same panel.  So: measure where it sits, then
     drive it with a real hit-tested click. */
  const reach = await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-paint-note button')]
      .find((x) => /designs/i.test(x.textContent || ''));
    if (!b) return null;
    const panel = document.querySelector('.bt-paint');
    const r = b.getBoundingClientRect(), p = panel.getBoundingClientRect();
    const cs = getComputedStyle(b);
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      insideFold: r.top >= p.top - 1 && r.bottom <= p.bottom + 1,
      onScreen: r.top >= 0 && r.bottom <= window.innerHeight,
      visible: cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0,
      hit: (() => { const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                    return !!e && (e === b || b.contains(e)); })(),
    };
  });
  rec.ok(`${tag}: the Designs button is inside the panel's fold and on screen `
    + `(${reach && reach.w}x${reach && reach.h})`,
    !!reach && reach.insideFold && reach.onScreen && reach.visible);
  rec.ok(`${tag}: a real tap lands on it -- elementFromPoint at its centre IS the `
    + `button, so nothing is covering it`, !!reach && reach.hit);

  /* ── 1. the window opens and holds the whole catalogue ── */
  const opened = await openGallery(P);
  rec.ok(`${tag}: the editor has a Designs button and it opens a window`, opened);
  await P.page.waitForTimeout(600);

  const shape = await gallery(P, () => {
    const s = [...document.querySelectorAll('.bt-modal-scrim')];
    const g = s[s.length - 1];
    return {
      scrims: s.length,
      tiles: g ? [...g.querySelectorAll('button')].filter((b) => b.querySelector('canvas')).length : -1,
      names: g ? [...g.querySelectorAll('button')].filter((b) => b.querySelector('canvas'))
        .map((b) => (b.textContent || '').trim()) : [],
    };
  });
  rec.ok(`${tag}: it is its OWN window over the editor, not a takeover of it `
    + `(${shape.scrims} scrims)`, shape.scrims === 2);
  rec.ok(`${tag}: every one of the ${DESIGN_CATALOG.length} catalogue designs has a tile `
    + `(saw ${shape.tiles})`, shape.tiles === DESIGN_CATALOG.length);
  /* The tile count alone cannot catch a design the validity gate DROPPED: this
     scenario imports the filtered list, so both sides shrink together and stay
     equal.  Only the authored count can see it. */
  rec.ok(`${tag}: the validity gate dropped nothing -- ${DESIGN_CATALOG.length} designs `
    + `survive of ${DESIGN_COUNT_AUTHORED} authored`,
    DESIGN_CATALOG.length === DESIGN_COUNT_AUTHORED);
  rec.ok(`${tag}: the tiles are the catalogue, in its order`,
    shape.names.join('|') === DESIGN_CATALOG.map((d) => d.name).join('|'));

  /* ── 2 + 3. apply a MULTI-COLOUR design ── */
  const target = DESIGN_CATALOG.find((d) => new Set([...d.art].filter((c) => c !== '0')).size >= 3);
  rec.ok(`${tag}: the catalogue has a multi-colour design to test the piece split with`, !!target);
  const before = await art(P);
  rec.ok(`${tag}: the canvas starts blank, so the Undo assertion below is not vacuous`,
    before === BLANK);

  await P.page.evaluate((name) => {
    const s = [...document.querySelectorAll('.bt-modal-scrim')];
    const g = s[s.length - 1];
    const t = [...g.querySelectorAll('button')]
      .find((b) => b.querySelector('canvas') && (b.textContent || '').trim() === name);
    if (t) t.click();
  }, target.name);
  await P.page.waitForTimeout(900);

  const after = await art(P);
  rec.ok(`${tag}: applying "${target.name}" puts EXACTLY that design on the canvas `
    + `(not merged, not resampled)`, after === target.art);

  const gone = await P.page.evaluate(() => document.querySelectorAll('.bt-modal-scrim').length);
  rec.ok(`${tag}: the window closes on the tap that applies`, gone === 1);

  const colours = new Set([...target.art].filter((c) => c !== '0')).size;
  const o = await ops(P);
  rec.ok(`${tag}: it lands as one piece per colour (${o.length} pieces for ${colours} colours), `
    + `so Select has something to pick up -- a flat base would leave nothing`,
    o.length === colours);
  rec.ok(`${tag}: every piece is a freehand op, the kind a brush stroke already makes `
    + `-- no new op kind reached the store`, o.every((x) => x.k === 'c'));

  /* ── 3b. re-applying the SAME design must bank nothing ──
     v2.3.2445: a pre-merge review found applyDesign always banked a history
     entry, so an accidental double-tap on a tile left one tap of Undo that
     visibly did nothing -- what `unbank` exists to prevent for the shape
     tools.  The proof is the Undo assertion immediately below: if this second
     apply banked, one tap would land on the design again, not on blank. */
  await openGallery(P);
  await P.page.waitForTimeout(500);
  await P.page.evaluate((name) => {
    const s = [...document.querySelectorAll('.bt-modal-scrim')];
    const g = s[s.length - 1];
    const t = [...g.querySelectorAll('button')]
      .find((b) => b.querySelector('canvas') && (b.textContent || '').trim() === name);
    if (t) t.click();
  }, target.name);
  await P.page.waitForTimeout(800);
  rec.ok(`${tag}: re-applying the design already on the canvas leaves it unchanged`,
    (await art(P)) === target.art);

  /* ── 4. ONE undo, not one per piece ── */
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-paint-btn button, .bt-paint button')]
      .find((x) => /^undo$/i.test((x.textContent || '').trim()));
    if (b) b.click();
  });
  await P.page.waitForTimeout(700);
  const undone = await art(P);
  rec.ok(`${tag}: ONE tap of Undo restores exactly what was there before, though the `
    + `design added ${o.length} pieces AND was applied twice -- the second apply `
    + `banked no dead history entry`, undone === before);

  /* ── 5. it persists across a panel close and reopen ── */
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-paint button')]
      .find((x) => /^redo$/i.test((x.textContent || '').trim()));
    if (b) b.click();
  });
  await P.page.waitForTimeout(700);
  rec.ok(`${tag}: Redo puts the design back`, (await art(P)) === target.art);

  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-paint button')]
      .find((x) => /^done$/i.test((x.textContent || '').trim()));
    if (b) b.click();
  });
  await P.page.waitForTimeout(700);
  await openPaint(P);
  rec.ok(`${tag}: the design is still there after the panel is closed and reopened`,
    (await art(P)) === target.art);

  /* ── 7. the gallery names the CANVAS it writes, not the screen ──
     v2.3.2445: it named the screen, so on Face + Back the Clear button said
     "the whole back of head" while the gallery offered to ink "your tattoo" --
     two controls on one screen giving different answers. */
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-paint-tabs .bt-cc-tab')]
      .find((x) => /face/i.test((x.textContent || '').trim()));
    if (b) b.click();
  });
  await P.page.waitForTimeout(500);
  await P.page.click('[data-ink-side-btn="back"]').catch(() => {});
  await P.page.waitForTimeout(500);
  const naming = await P.page.evaluate(() => {
    const clear = [...document.querySelectorAll('.bt-paint button')]
      .map((b) => b.getAttribute('title') || '')
      .find((t) => /^Erase the whole /.test(t)) || '';
    return { clear: clear.replace('Erase the whole ', '').trim() };
  });
  await openGallery(P);
  await P.page.waitForTimeout(500);
  const galleryCopy = await P.page.evaluate(() => {
    const s = [...document.querySelectorAll('.bt-modal-scrim')];
    return s[s.length - 1].textContent || '';
  });
  rec.ok(`${tag}: the gallery names the canvas it writes ("${naming.clear}"), the same `
    + `one the Clear button beside it names -- not the screen`,
    !!naming.clear && galleryCopy.includes(naming.clear));
  await P.page.evaluate(() => {
    const s = [...document.querySelectorAll('.bt-modal-scrim')];
    const b = [...s[s.length - 1].querySelectorAll('button')].find((x) => /cancel/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await P.page.waitForTimeout(500);
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-paint-tabs .bt-cc-tab')]
      .find((x) => /body/i.test((x.textContent || '').trim()));
    if (b) b.click();
  });
  await P.page.waitForTimeout(500);
  await P.page.click('[data-ink-side-btn="front"]').catch(() => {});
  await P.page.waitForTimeout(500);

  /* ── 8. Cancel is inert ── */
  await openGallery(P);
  await P.page.waitForTimeout(500);
  await P.page.evaluate(() => {
    const s = [...document.querySelectorAll('.bt-modal-scrim')];
    const g = s[s.length - 1];
    const b = [...g.querySelectorAll('button')].find((x) => /cancel/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await P.page.waitForTimeout(600);
  rec.ok(`${tag}: Cancel closes the window and changes nothing`,
    (await art(P)) === target.art
    && (await P.page.evaluate(() => document.querySelectorAll('.bt-modal-scrim').length)) === 1);

  await P.ctx.close();
}
