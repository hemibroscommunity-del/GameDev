/* ═══ LIFE SKILLS AS APP TILES (v2.3.3522) ═══
 *
 * The owner, playtesting: "Make the lifeskills menu look more like iPhone
 * apps instead of elongated pills."  It reverses their own v2.3.1312b
 * ("make the expanded view pill shaped so they all fit without scrolling");
 * the other half of that ask -- all ten on one screen, no scrolling -- holds.
 *
 * A real phone, the dashboard's Life Skills page (src/ui/mobile/dash/
 * SkillsPanel.jsx):
 *   1. upright on a 390 and a 360 px phone: ten tiles, five across in two
 *      rows (gathering over crafting, the roster's order), each 52 px square
 *      with its name under it and its level on a chip, all inside the page,
 *      and the page does not scroll;
 *   2. a level-up you have not looked at puts the brass dot on that skill's
 *      tile alone, and looking clears it;
 *   3. a tap opens the skill's own page, and "All skills" brings the tiles
 *      back;
 *   4. sideways: three across, every tile reachable by the column's scroll;
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/skillapps-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ORDER = ['woodcutting', 'fishing', 'mining', 'farming', 'trapping', 'cooking', 'blacksmithing', 'woodworking', 'gemCutting', 'enchanting'];

const openSkills = async (P) => {
  await P.page.evaluate(() => window.__broDashPanelBus.open('skills'));
  await P.page.waitForSelector('[data-skill-grid]', { timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(700);
};
const closeDash = async (P) => {
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.toBar) b.toBar(); });
  await P.page.waitForTimeout(500);
};

/* the tiles as laid out: each button's box, its tile's box, its name, chip
   and dot, and the page that holds them */
const readGrid = (P) => P.page.evaluate(() => {
  const grid = document.querySelector('[data-skill-grid]');
  if (!grid) return null;
  let page = grid.parentElement;
  const box = (el) => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
  const tiles = [...grid.querySelectorAll('[data-skill]')].map((b) => {
    const tile = b.querySelector('[data-skill-tile]');
    const chip = b.querySelector('[data-skill-level]');
    const name = [...b.children].find((c) => c !== tile);
    return { key: b.getAttribute('data-skill'), btn: box(b), tile: tile ? box(tile) : null, chip: chip ? { text: chip.textContent, box: box(chip) } : null,
      name: name ? { text: name.textContent, cut: name.scrollWidth > name.clientWidth + 1, lines: Math.round(name.getBoundingClientRect().height / 13) } : null,
      dot: !!b.querySelector('[data-skill-new]'), radius: tile ? getComputedStyle(tile).borderRadius : null };
  });
  return { mode: grid.getAttribute('data-skill-grid'), page: box(page), scroll: { h: page.scrollHeight, client: page.clientHeight }, tiles, vw: innerWidth, vh: innerHeight };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Appster', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 300)));
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(1500);
    const me = await H.readState(P, (S) => S.myId);

    /* ── 1. upright, two phone widths ── */
    for (const w of [390, 360]) {
      await P.page.setViewportSize({ width: w, height: w === 390 ? 844 : 780 });
      await P.page.waitForTimeout(900);
      await openSkills(P);
      const g = await readGrid(P);
      const xs = g ? [...new Set(g.tiles.map((t) => t.tile && t.tile.l))].length : 0;
      const ys = g ? [...new Set(g.tiles.map((t) => t.tile && t.tile.t))].length : 0;
      const inside = !!g && g.tiles.every((t) => t.btn.l >= g.page.l - 1 && t.btn.r <= g.page.r + 1 && t.btn.t >= g.page.t - 1 && t.btn.b <= g.page.b + 1);
      rec.ok(`1. upright at ${w} px: ten app tiles, five across in two rows (${xs} x ${ys}), gathering over crafting in the roster's order, all inside the page`,
        !!g && g.mode === 'home' && g.tiles.length === 10 && xs === 5 && ys === 2 && g.tiles.map((t) => t.key).join() === ORDER.join() && inside
          && g.tiles.slice(0, 5).every((t) => t.tile.t === g.tiles[0].tile.t) && g.tiles.slice(5).every((t) => t.tile.t > g.tiles[0].tile.t),
        g && { mode: g.mode, xs, ys, keys: g.tiles.map((t) => t.key), page: g.page });
      rec.ok(`...each a ${g && g.tiles[0].tile ? `${g.tiles[0].tile.w} x ${g.tiles[0].tile.h}` : '?'} rounded square (${g && g.tiles[0].radius}) with its level on a chip ("${g && g.tiles[0].chip && g.tiles[0].chip.text}") and its name under it on one line`,
        !!g && g.tiles.every((t) => t.tile && t.tile.w === 52 && t.tile.h === 52 && t.chip && /^Lv \d+$/.test(t.chip.text) && t.name && t.name.lines === 1)
          && g.tiles.every((t) => t.chip.box.r <= g.vw && t.chip.box.t >= g.page.t - 8),
        g && g.tiles.map((t) => ({ k: t.key, tile: t.tile, chip: t.chip, name: t.name })));
      rec.ok(`...and the page does not scroll: all ten on one screen (${g && g.scroll.h} of ${g && g.scroll.client} px)`, !!g && g.scroll.h <= g.scroll.client + 1, g && g.scroll);
      await P.page.screenshot({ path: join(OUT, `skillapps-${w}.png`) }).catch(() => {});
      await closeDash(P);
    }

    /* ── 2. the dot for a level-up not yet looked at ── */
    await P.page.setViewportSize({ width: 390, height: 844 });
    await P.page.waitForTimeout(700);
    const lv = await H.devOp(wsPort, 'lifeskill', me, { skill: 'mining', level: 3 }).catch(() => null);
    await P.page.waitForFunction(() => { const R = window._gameState.current.rpg || {}; return ((R.lifeSkills || {}).mining || {}).level === 3; }, null, { timeout: 8000 }).catch(() => {});
    await openSkills(P);
    const g2 = await readGrid(P);
    rec.ok(`2. a level-up not yet looked at: the brass dot on Mining's tile alone (${g2 ? g2.tiles.filter((t) => t.dot).map((t) => t.key).join() || 'none' : '?'}), its chip "Lv 3"`,
      !!lv && lv.ok && !!g2 && g2.tiles.filter((t) => t.dot).map((t) => t.key).join() === 'mining'
        && g2.tiles.find((t) => t.key === 'mining').chip.text === 'Lv 3', g2 && g2.tiles.map((t) => [t.key, t.dot, t.chip && t.chip.text]));
    await P.page.screenshot({ path: join(OUT, 'skillapps-dot.png') }).catch(() => {});
    await closeDash(P);
    await openSkills(P);
    const g3 = await readGrid(P);
    rec.ok('...and looking at the page cleared it', !!g3 && g3.tiles.every((t) => !t.dot), g3 && g3.tiles.filter((t) => t.dot).map((t) => t.key));

    /* ── 3. a tap opens the skill, "All skills" brings the tiles back ── */
    await P.page.locator('[data-skill="mining"]').first().click();
    await P.page.waitForTimeout(800);
    const detail = await P.page.evaluate(() => ({ grid: !!document.querySelector('[data-skill-grid]'), head: [...document.querySelectorAll('div')].some((d) => /^Level 3$/.test((d.textContent || '').trim())),
      back: [...document.querySelectorAll('button')].some((b) => /All skills/.test(b.textContent || '')) }));
    await P.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((q) => /All skills/.test(q.textContent || '')); if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
    await P.page.waitForTimeout(700);
    const back = await readGrid(P);
    rec.ok('3. a tap on a tile opens the skill\'s own page (Mining, Level 3), and "All skills" brings the tiles back',
      !detail.grid && detail.head && detail.back && !!back && back.tiles.length === 10, { detail, back: !!back });
    await closeDash(P);

    /* ── 4. sideways ── */
    await P.page.setViewportSize({ width: 844, height: 390 });
    await P.page.waitForTimeout(1500);
    await openSkills(P);
    const gs = await readGrid(P);
    const cols = gs ? [...new Set(gs.tiles.map((t) => t.tile && t.tile.l))].length : 0;
    let reach = 0;
    const missed = [];
    if (gs) {
      for (const k of ORDER) {
        /* the TILE's middle (the picture a finger aims at), what is on top there */
        const seen = await P.page.evaluate((key) => {
          const b = document.querySelector(`[data-skill="${key}"]`);
          if (!b) return { ok: false, why: 'none' };
          b.scrollIntoView({ block: 'nearest' });
          const t = b.querySelector('[data-skill-tile]') || b;
          const r = t.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
          const top = document.elementFromPoint(x, y);
          const ok = !!top && (top === b || b.contains(top));
          return { ok, why: ok ? null : (top ? `${top.tagName.toLowerCase()}.${String(top.className || '').slice(0, 40)} ${(top.textContent || '').slice(0, 30)}` : 'nothing'), x: Math.round(x), y: Math.round(y) };
        }, k);
        if (seen.ok) reach++; else missed.push({ k, ...seen });
      }
    }
    rec.ok(`4. sideways: three across (${cols}), and every tile reachable in the column (${reach} of 10, scrolled to)`, !!gs && gs.mode === 'side' && cols === 3 && reach === 10,
      gs && { mode: gs.mode, cols, page: gs.page, scroll: gs.scroll, missed });
    await P.page.evaluate(() => { const g = document.querySelector('[data-skill-grid]'); if (g && g.parentElement) g.parentElement.scrollTop = 0; });
    await P.page.screenshot({ path: join(OUT, 'skillapps-side.png') }).catch(() => {});
    await closeDash(P);
    rec.ok('5. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
