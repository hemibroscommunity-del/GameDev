/* ═══ v2.3.6680: THE NEW DASHBOARD'S KIT AT THE PHONE'S REAL SIZE (card UI2, the build's step 1) ═══
 *
 * `?uikit=1` lays the kit's page over the game (src/ui/kit/UiKitPage.jsx):
 * every piece in every state and two samples (the Bro landing, the
 * Character page), each inside a box of the dashboard's real size on that
 * screen.  A phone in the world (so the Character sample has a player's real
 * data), upright at 390 x 844 and 375 x 667 and sideways at 844 x 390:
 *
 *   1. each box is the band's real size (the game's own sheetGeometry), and
 *      every piece in it is inside it: nothing past the box, nothing past
 *      its page, no text cut or run out of its own box;
 *   2. every control you press in a box is at least 44 x 44;
 *   3. pressed and selected differ from the default by more than colour
 *      (the shadow's shape, the place), and selected keeps the footprint;
 *   4. the Character sample shows this player (the name the door was given),
 *      the state handed in by the harness (`__btUiKitHand`: the page never
 *      takes the game's global, open-hand.test);
 *   5. the serif came, and its figures are of equal width (tabular);
 * and on a second page (no world needed):
 *   6. `?ui2shine=0` puts the gloss out, and raised still reads apart from
 *      recessed (a drop shadow under one, an inner shadow in the other);
 *   7. reduced motion stops every loop (the pending ring, the loading sweep)
 *      and every move, which run without it.
 * The pictures (deviceScaleFactor 2) go to docs/shots/ui2-kit-*.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');
const NAME = 'Kitbro';

/* the audit of every box on the page: run in the page */
export function audit() {
  const out = { frames: 0, boxes: [], overflow: [], clipped: [], small: [], buttons: 0, texts: 0 };
  const say = (el) => (el.getAttribute('data-u2-demo') || el.getAttribute('data-u2') || el.className || el.tagName) + ' "' + (el.textContent || '').trim().slice(0, 24) + '"';
  const inside = (r, R) => r.left >= R.left - 0.5 && r.right <= R.right + 0.5 && r.top >= R.top - 0.5 && r.bottom <= R.bottom + 0.5;
  for (const fr of document.querySelectorAll('.u2-frame')) {
    out.frames++;
    const R = fr.getBoundingClientRect();
    out.boxes.push([Math.round(R.width), Math.round(R.height)]);
    const page = fr.querySelector('.u2-page');
    const P = page.getBoundingClientRect();
    for (const el of fr.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (!inside(r, R) || (page.contains(el) && !inside(r, P))) out.overflow.push(say(el) + ` [${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}]`);
    }
    /* every run of words: its own drawn box inside its block's box and the page's */
    const walk = document.createTreeWalker(fr, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent.trim()) continue;
      out.texts++;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      const tr = rg.getBoundingClientRect();
      let blk = n.parentElement;
      while (blk && getComputedStyle(blk).display === 'inline') blk = blk.parentElement;
      const B = blk.getBoundingClientRect();
      const sc = blk.scrollWidth > blk.clientWidth + 1;
      /* across: inside its own block (a cut or an ellipsis shows here, and in scrollWidth); down: the
         serif's glyphs stand taller than a tight line, so the page and the frame (which cut) are the test */
      const across = tr.left >= B.left - 1 && tr.right <= B.right + 1;
      if (!across || sc || !inside(tr, R) || (page.contains(blk) && !inside(tr, P))) out.clipped.push(`"${n.textContent.trim().slice(0, 30)}" [${Math.round(tr.width)} in ${Math.round(B.width)}]`);
    }
    for (const b of fr.querySelectorAll('button, a[href]')) {
      out.buttons++;
      const r = b.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) out.small.push(say(b) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }
  return out;
}

/* the shape of a shadow with its colours taken out: depth, not colour */
export function looks() {
  const shape = (s) => String(s).replace(/rgba?\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  const at = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { shadow: shape(cs.boxShadow), transform: cs.transform, bg: cs.backgroundImage, w: Math.round(r.width), h: Math.round(r.height) };
  };
  return {
    tile: at('[data-u2-demo="Default"]'), tilePressed: at('[data-u2-demo="Pressed"]'), tileSel: at('[data-u2-demo="Selected"]'),
    act: at('[data-u2-demo="gold"]'), actPressed: at('[data-u2-demo="gold pressed"]'),
  };
}

async function shotPlates(P, file, ids) {
  const els = [];
  for (const id of ids) els.push(await P.page.$(`[data-u2-plate="${id}"]`));
  if (els.some((e) => !e)) return false;
  if (ids.length === 1) { await els[0].screenshot({ path: path.join(SHOTS, file) }); return true; }
  /* several plates: one picture from the first's top to the last's bottom */
  const a = await els[0].boundingBox();
  const b = await els[els.length - 1].boundingBox();
  await P.page.evaluate((y) => { document.querySelector('[data-u2-kit]').scrollTop = y; }, 0);
  const vh = P.page.viewportSize().height;
  const h = b.y + b.height - a.y;
  if (h > vh) await P.page.setViewportSize({ width: P.page.viewportSize().width, height: Math.ceil(a.y + h + 20) });
  await P.page.waitForTimeout(500);
  await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: a.x, y: a.y, width: a.width, height: h } });
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const P = await H.newPlayer(browser, { name: NAME, wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2, query: 'uikit=1' });
  try {
    /* the kit lies over the door: put it aside while the player walks in */
    await P.page.waitForSelector('#bt-uikit', { state: 'attached', timeout: 60000 }).catch(() => null);
    await P.page.evaluate(() => { const k = document.getElementById('bt-uikit'); if (k) k.style.display = 'none'; });
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.evaluate(() => { const k = document.getElementById('bt-uikit'); if (k) k.style.display = ''; });
    /* the QA page hands the kit the game's state (the page never takes it: open-hand.test) */
    const handed = await P.page.waitForFunction(() => {
      if (typeof window.__btUiKitHand !== 'function') return false;
      window.__btUiKitHand(window._gameState && window._gameState.current);
      return true;
    }, null, { timeout: 30000 }).then(() => true, () => false);
    const ready = handed && await P.page.waitForFunction(() => window.__btUiKit && window.__btUiKit.ready && window.__btUiKit.player, null, { timeout: 30000 }).then(() => true, () => false);
    rec.ok('the kit\'s page is up, with the player', ready, await P.page.evaluate(() => window.__btUiKit));
    if (!ready) return;

    const SHAPES = [
      { w: 390, h: 844, band: [390, 243], head: 52, tag: '390x844' },
      { w: 375, h: 667, band: [375, 235], head: 48, tag: '375x667' },
      { w: 844, h: 390, band: [844, 130], head: 48, tag: '844x390' },
    ];
    for (const s of SHAPES) {
      await P.page.setViewportSize({ width: s.w, height: s.h });
      await P.page.waitForFunction((w) => window.__btUiKit && window.__btUiKit.room.w === w, s.w, { timeout: 10000 }).catch(() => null);
      await P.page.waitForTimeout(1200);
      const k = await P.page.evaluate(() => window.__btUiKit);
      const A = await P.page.evaluate(audit);
      /* v2.3.6688: nine plates, the workspace (two panels, the one grid of item cells: card UI2-gear PR 2) the ninth */
      const sizeOk = A.frames === 9 && A.boxes.every(([w, h]) => w === s.band[0] && h === s.band[1]) && k.room.head === s.head;
      rec.ok(`1a. ${s.tag}: eight boxes (v2.3.6681: + the headers), each the band's real size ${s.band[0]} x ${s.band[1]} with a ${s.head} px header row`, sizeOk, { boxes: A.boxes, room: k.room });
      rec.ok(`1b. ${s.tag}: every piece inside its box and its page (${A.texts} runs of words read)`, A.overflow.length === 0, A.overflow.slice(0, 8));
      rec.ok(`1c. ${s.tag}: no text cut or run out of its box`, A.clipped.length === 0 && A.texts > 80, A.clipped.slice(0, 8));
      rec.ok(`2. ${s.tag}: every control in a box is at least 44 x 44 (${A.buttons} controls)`, A.small.length === 0 && A.buttons > 40, A.small.slice(0, 8));
      if (s.tag === '390x844') {
        const L = await P.page.evaluate(looks);
        const ok3a = L.tile && L.tilePressed && (L.tilePressed.shadow !== L.tile.shadow) && (L.tilePressed.transform !== L.tile.transform);
        const ok3b = L.tileSel && L.tileSel.shadow !== L.tile.shadow && /inset/.test(L.tileSel.shadow) && L.tileSel.w === L.tile.w && L.tileSel.h === L.tile.h && L.tileSel.bg !== L.tile.bg;
        const ok3c = L.act && L.actPressed && L.actPressed.shadow !== L.act.shadow && L.actPressed.transform !== L.act.transform;
        rec.ok('3a. a pressed tile differs from the default by its shadow\'s shape and its place, not only colour', !!ok3a, { tile: L.tile, pressed: L.tilePressed });
        rec.ok('3b. a selected tile is pushed in (an inner shadow, its light inverted) on the same footprint', !!ok3b, { tile: L.tile, sel: L.tileSel });
        rec.ok('3c. a pressed action differs from the default by its shadow and its place', !!ok3c, { act: L.act, pressed: L.actPressed });
        const who = await P.page.evaluate(() => { const n = document.querySelector('[data-u2-name]'); return n ? n.textContent : null; });
        const doors = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-u2-door]')).map((d) => d.getAttribute('data-u2-door')));
        rec.ok(`4. the Character sample shows this player ("${who}"); the Bro landing's six doors`, who === NAME && doors.join(',') === 'Character,Combat,Equipment,Life Skills,Feats,Pets', { who, doors });
        const F = await P.page.evaluate(() => {
          const s1 = document.createElement('span');
          const s2 = document.createElement('span');
          s1.textContent = '1111111111';
          s2.textContent = '0000000000';
          const host = document.querySelector('.u2-frame');
          for (const x of [s1, s2]) { x.style.cssText = 'position:absolute;font-size:16px;font-weight:700;white-space:nowrap'; host.appendChild(x); }
          const w1 = s1.getBoundingClientRect().width;
          const w2 = s2.getBoundingClientRect().width;
          s1.remove(); s2.remove();
          return { loaded: document.fonts.check('700 16px Merriweather') && document.fonts.check('400 16px Merriweather'), w1, w2, family: getComputedStyle(host).fontFamily };
        });
        rec.ok('5. the serif (Merriweather 400 and 700) came, and its figures are of equal width', F.loaded && Math.abs(F.w1 - F.w2) < 0.5, F);
        await P.page.setViewportSize({ width: 390, height: 844 });
        await P.page.waitForTimeout(600);
        const shots = [
          await shotPlates(P, 'ui2-kit-bro.png', ['bro']),
          await shotPlates(P, 'ui2-kit-character.png', ['character']),
          await shotPlates(P, 'ui2-kit-pieces.png', ['tiles', 'actions', 'use', 'info', 'slots']),
        ];
        await P.page.setViewportSize({ width: 390, height: 844 });
        rec.ok('the pictures at 390 x 844 (docs/shots/ui2-kit-bro, -character, -pieces)', shots.every(Boolean), shots);
      }
      if (s.tag === '844x390') {
        const ok = await shotPlates(P, 'ui2-kit-sideways.png', ['bro', 'character']);
        rec.ok('the sideways picture (docs/shots/ui2-kit-sideways)', ok, ok);
      }
    }
  } finally { await P.ctx.close().catch(() => {}); }

  /* 6 and 7: the switch and reduced motion, on a page of their own (no world needed) */
  const Q = await H.newPlayer(browser, { name: 'Kitshine', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'uikit=1' });
  try {
    const gloss = () => Q.page.evaluate(() => {
      const t = document.querySelector('[data-u2-demo="Default"]');
      const g = document.querySelector('.u2-group');
      const spin = document.querySelector('.u2-spin');
      const sk = document.querySelector('.u2-skel-row');
      return {
        shine: t ? getComputedStyle(t, '::before').opacity : null,
        tileShadow: t ? getComputedStyle(t).boxShadow : null,
        groupShadow: g ? getComputedStyle(g).boxShadow : null,
        spin: spin ? getComputedStyle(spin).animationName : null,
        sweep: sk ? getComputedStyle(sk, '::after').animationName : null,
        move: t ? getComputedStyle(t).transitionDuration : null,
      };
    });
    const up = () => Q.page.waitForFunction(() => window.__btUiKit && window.__btUiKit.ready, null, { timeout: 30000 }).then(() => true, () => false);
    await up();
    const on = await gloss();
    await Q.page.goto(Q.page.url().replace('uikit=1', 'uikit=1&ui2shine=0'), { waitUntil: 'domcontentloaded' });
    await up();
    const off = await gloss();
    /* an outer shadow is one without `inset`; split on the commas between shadows */
    const outer = (s) => String(s).split(/,(?![^(]*\))/).some((x) => !/inset/.test(x) && !/^\s*none\s*$/.test(x));
    const inner = (s) => String(s).split(/,(?![^(]*\))/).every((x) => /inset/.test(x));
    rec.ok(`6. ?ui2shine=0 puts the gloss out (${on.shine} -> ${off.shine}); raised keeps its drop shadow, recessed its inner one`,
      Number(on.shine) > 0 && Number(off.shine) === 0 && outer(off.tileShadow) && inner(off.groupShadow), { on, off });
    await Q.page.emulateMedia({ reducedMotion: 'reduce' });
    await Q.page.waitForTimeout(300);
    const still = await gloss();
    rec.ok(`7. reduced motion stops the loops (ring ${on.spin} -> ${still.spin}, sweep ${on.sweep} -> ${still.sweep}) and the moves (${on.move} -> ${still.move})`,
      on.spin === 'u2-turn' && on.sweep === 'u2-sweep' && still.spin === 'none' && still.sweep === 'none' && /^0s/.test(still.move) && !/^0s/.test(on.move), { on, still });
  } finally { await Q.ctx.close().catch(() => {}); }
}
