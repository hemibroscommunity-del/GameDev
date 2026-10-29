/* ═══ THE TOWN HALL'S BOARD, ON A PHONE AND A COMPUTER (v2.3.3766) ═══
 *
 * The owner: "at the town hall it was just a big menu board of all the things
 * to do (dungeon, gambling, arena, woodworking, etc) with a page that
 * describes what each thing does and pin drop you can put on the map to go to
 * the one you want (two pins can be active at once - red pin and blue pin).
 * When you "enter it" it brings up the board."
 *
 * In the world's BroTown, a 390 x 844 phone held upright, then a computer
 * (wide: the sideways layout):
 *   1. at the Town Hall's door, "Enter" opens the BOARD: tiles under their
 *      headings, the dungeons, the arena, the forge and the Gambling Den among
 *      them, and the Leaderboard and World map at its foot;
 *      v2.3.3779: the Dungeons under their own heading, every tile its own
 *      picture (each drawn), a land's name the world's own;
 *   2. a tile opens its PAGE: its words, where it is, Red pin and Blue pin;
 *   3. RED on the arena, BLUE on the forge: the board's tiles wear them, and
 *      both are on the minimap (the forge's in the box, near the Town Hall);
 *   4. red MOVED to the Gambling Den: one red pin, there now;
 *   5. blue LIFTED (its button again on the forge's page);
 *   6. a RELOAD: the red pin is still on the Gambling Den, on the minimap and
 *      the world map; blue still lifted;
 *   7. the computer: the board opens, a page pins, the minimap shows it;
 *   8. no page errors.
 * Pictures: tools/qa/mp/out/townboard-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name, clip) => P.page.screenshot({ path: join(OUT, `townboard-${name}.png`), clip }).catch(() => {});
  const errors = [];

  const standAt = async (P, x, bootsY) => {
    for (let k = 0; k < 4; k++) {
      const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
      await H.hopTo(P, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
      await P.page.waitForTimeout(800);
      const g = await P.page.evaluate(() => window.__btPlayerGround());
      if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
    }
    return false;
  };
  const waitSel = async (P, sel, ms = 5000) => {
    for (let t0 = Date.now(); Date.now() - t0 < ms;) {
      const ok = await P.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 20; }, sel);
      if (ok) return true;
      await P.page.waitForTimeout(200);
    }
    return false;
  };
  /* a real touch (or click, on the computer) on what `sel` finds */
  const press = async (P, sel, wide) => {
    const at = await P.page.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, sel);
    if (!at) return false;
    await P.page.waitForTimeout(150);
    if (wide) await P.page.mouse.click(at.x, at.y); else await P.page.touchscreen.tap(at.x, at.y);
    await P.page.waitForTimeout(250);
    return true;
  };
  const closeCard = async (P) => { await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); }); await P.page.waitForTimeout(500); };
  /* a new character's welcome card, put away (it sits over the window) */
  const skipTutorial = async (P) => {
    for (let i = 0; i < 10; i++) {
      const hit = await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((q) => /Skip tutorial/.test(q.textContent || '')); if (b) { b.click(); return true; } return false; });
      if (hit) { await P.page.waitForTimeout(400); return true; }
      await P.page.waitForTimeout(300);
    }
    return false;
  };
  const doorsOf = async (P) => {
    let doors = [];
    for (let i = 0; i < 40 && !doors.some((d) => d.id === 'townhall'); i++) {
      doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (!doors.some((d) => d.id === 'townhall')) await P.page.waitForTimeout(500);
    }
    return doors;
  };
  /* the Town Hall's board: to its door, Enter */
  const openBoard = async (P, th, wide) => {
    await closeCard(P);
    await standAt(P, th.x, th.y + 30);
    let btn = null;
    for (let i = 0; i < 20 && !btn; i++) {
      btn = await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); return b ? (b.textContent || '').trim() : null; });
      if (!btn) await P.page.waitForTimeout(250);
    }
    await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
    const open = await waitSel(P, '[data-wheel-hall="townhall"] [data-town-board]');
    return { btn, open, wide };
  };
  const board = (P) => P.page.evaluate(() => {
    const b = document.querySelector('[data-town-board]');
    if (!b) return null;
    return {
      tiles: Array.from(b.querySelectorAll('[data-board-tile]')).map((t) => {
        const img = t.querySelector('img');
        /* v2.3.3779: each tile's name and its picture, drawn (not the emoji a broken one falls back to) */
        return { id: t.getAttribute('data-board-tile'), pins: t.getAttribute('data-board-pins'), name: (t.textContent || '').trim(),
          pic: img ? img.getAttribute('src') : null, drawn: !!img && img.complete && img.naturalWidth > 0 };
      }),
      groups: Array.from(b.querySelectorAll('[data-board-group]')).map((g) => g.getAttribute('data-board-group')),
      foot: Array.from(b.querySelectorAll('[data-hall-row]')).map((x) => x.getAttribute('data-hall-row')),
    };
  });
  const pageOf = (P) => P.page.evaluate(() => {
    const p = document.querySelector('[data-board-page]');
    if (!p) return null;
    return { id: p.getAttribute('data-board-page'), text: (p.textContent || '').replace(/\s+/g, ' ').trim(),
      btns: Array.from(p.querySelectorAll('[data-pin-btn]')).map((b) => ({ k: b.getAttribute('data-pin-btn'), on: b.getAttribute('data-pin-on'), text: (b.textContent || '').trim() })) };
  });
  const pinIt = async (P, tile, color, wide) => {
    await press(P, `[data-board-tile="${tile}"]`, wide);
    const pg = await waitSel(P, `[data-board-page="${tile}"]`);
    await press(P, `[data-pin-btn="${color}"]`, wide);
    const after = await pageOf(P);
    await press(P, '[data-board-back]', wide);
    await waitSel(P, '[data-town-board]');
    return { pg, after };
  };
  const pinsState = (P) => P.page.evaluate(() => { const S = window._gameState.current; const p = S._mapPins; return p ? { red: p.red, blue: p.blue } : null; });
  const miniPins = async (P) => {
    let v = null;
    for (let i = 0; i < 16; i++) {
      v = await P.page.evaluate(() => (window.__btMinimap && window.__btMinimap.mapPins ? window.__btMinimap.mapPins.map((m) => ({ ...m })) : null));
      if (v) break;
      await P.page.waitForTimeout(250);
    }
    return v;
  };

  /* ── the phone ── */
  const A = await H.newPlayer(browser, { name: 'Boardbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  A.page.on('pageerror', (e) => errors.push(`phone: ${String((e && e.message) || e).slice(0, 200)}`));
  let C = null;
  try {
    await H.enterWorld(A);
    await skipTutorial(A);
    const doors = await doorsOf(A);
    const th = doors.find((d) => d.id === 'townhall');
    rec.ok('the Town Hall is a door of the world\'s BroTown (guard)', !!th && th.hall === 'townhall', th);
    if (!th) return;

    /* 1. the board */
    const o1 = await openBoard(A, th, false);
    /* v2.3.3779: the pictures have loaded before the board is read */
    await A.page.waitForFunction(() => Array.from(document.querySelectorAll('[data-board-tile] img')).every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
    const b1 = await board(A);
    await shot(A, '1-board');
    const ids = b1 ? b1.tiles.map((t) => t.id) : [];
    rec.ok(`1. at the Town Hall's door, "${o1.btn}" opens the board: ${ids.length} tiles under ${b1 ? b1.groups.length : 0} headings, the Leaderboard and World map at its foot`,
      o1.open && !!b1 && ids.length >= 20 && ['goo-grotto', 'arena', 'nomansland', 'forge', 'gambling', 'woodworker', 'land-verdant'].every((id) => ids.includes(id))
        && b1.groups.join() === 'fight,dungeons,lands,make,money,people' && b1.foot.join() === 'leaderboard,map',
      { btn: o1.btn, open: o1.open, n: ids.length, groups: b1 && b1.groups, foot: b1 && b1.foot });
    /* v2.3.3779, the owner: "classified by 'dungeon' not by 'fight' ... Also use better icons for each one" */
    const pics = b1 ? b1.tiles.map((t) => t.pic) : [];
    const verd = b1 ? b1.tiles.find((t) => t.id === 'land-verdant') : null;
    rec.ok('...every tile wears its own picture, each drawn, and a land\'s name is the world\'s (never "{verdant}" or the stand-in "The flora land")',
      pics.length === ids.length && new Set(pics).size === pics.length && b1.tiles.every((t) => t.drawn)
        && !!verd && verd.name.length > 3 && !/[{}]/.test(verd.name) && !/flora land/i.test(verd.name),
      { undrawn: b1 && b1.tiles.filter((t) => !t.drawn).map((t) => t.id), verd: verd && verd.name, dup: pics.filter((p, i) => pics.indexOf(p) !== i) });

    /* 2. a page */
    await press(A, '[data-board-tile="arena"]', false);
    await waitSel(A, '[data-board-page="arena"]');
    const p2 = await pageOf(A);
    await shot(A, '2-page');
    rec.ok('2. the arena\'s tile opens its page: what it is (100 gold, up to 8 fighters), where (the Sheriff\'s Office), Red pin and Blue pin',
      !!p2 && /100 gold/.test(p2.text) && /Sheriff/.test(p2.text) && p2.btns.map((b) => b.k + ':' + b.on).join() === 'red:0,blue:0', p2);
    await press(A, '[data-board-back]', false);
    await waitSel(A, '[data-town-board]');
    /* v2.3.3766: No man's land is everywhere past the safe ground: a page, no pins */
    await press(A, '[data-board-tile="nomansland"]', false);
    await waitSel(A, '[data-board-page="nomansland"]');
    const p2b = await pageOf(A);
    rec.ok('...and No man\'s land, under Fight, has a page (fights between players, the skulls, what you lose) and no pins',
      !!p2b && /red skull/.test(p2b.text) && /safe ground/.test(p2b.text) && p2b.btns.length === 0, p2b && { text: p2b.text.slice(0, 200), btns: p2b.btns });
    await press(A, '[data-board-back]', false);
    await waitSel(A, '[data-town-board]');
    /* v2.3.3779: a dungeon's page names its land as the world does */
    await press(A, '[data-board-tile="goo-grotto"]', false);
    await waitSel(A, '[data-board-page="goo-grotto"]');
    const p2c = await pageOf(A);
    await shot(A, '2-dungeon');
    rec.ok('...and the Goo Grotto\'s page, under Dungeons, says its land by the world\'s own name, with Red pin and Blue pin',
      !!p2c && !!verd && p2c.text.includes(verd.name) && !/[{}]/.test(p2c.text) && p2c.btns.length === 2, p2c && { text: p2c.text.slice(0, 240), verd: verd && verd.name });
    await press(A, '[data-board-back]', false);
    await waitSel(A, '[data-town-board]');

    /* 3. red on the arena, blue on the forge */
    const r3 = await pinIt(A, 'arena', 'red', false);
    const b3 = await pinIt(A, 'forge', 'blue', false);
    const t3 = await board(A);
    const tilePins = Object.fromEntries((t3 ? t3.tiles : []).map((t) => [t.id, t.pins]));
    await shot(A, '3-board-pinned');
    rec.ok('3. Red pin on the arena and Blue pin on the forge: each button says "Lift", and the board\'s tiles wear them',
      r3.after && r3.after.btns[0].on === '1' && /Lift red/.test(r3.after.btns[0].text) && b3.after && b3.after.btns[1].on === '1'
        && tilePins.arena === 'red' && tilePins.forge === 'blue', { red: r3.after && r3.after.btns, blue: b3.after && b3.after.btns, arena: tilePins.arena, forge: tilePins.forge });
    await closeCard(A);
    const m3 = await miniPins(A);
    const mini = await A.page.evaluate(() => window.__btWheelMini || null);
    await shot(A, '3-minimap', mini ? { x: Math.max(0, mini.left - 8), y: Math.max(0, mini.top - 8), width: mini.w + 16, height: mini.h + 40 } : undefined);
    const red3 = m3 && m3.find((m) => m.color === 'red'), blue3 = m3 && m3.find((m) => m.color === 'blue');
    rec.ok('...and both are on the minimap: red on the arena (the Sheriff\'s Office), blue on the forge',
      !!red3 && red3.id === 'arena' && !!blue3 && blue3.id === 'forge', m3);

    /* 4. red moved */
    await openBoard(A, th, false);
    const r4 = await pinIt(A, 'gambling', 'red', false);
    const s4 = await pinsState(A);
    const t4 = await board(A);
    const pins4 = Object.fromEntries((t4 ? t4.tiles : []).map((t) => [t.id, t.pins]));
    rec.ok('4. red pinned on the Gambling Den MOVES there: one red pin, the arena\'s tile bare',
      r4.after && r4.after.btns[0].on === '1' && s4 && s4.red === 'gambling' && pins4.gambling === 'red' && pins4.arena === '', { s4, gambling: pins4.gambling, arena: pins4.arena });

    /* 5. blue lifted */
    const b5 = await pinIt(A, 'forge', 'blue', false);
    const s5 = await pinsState(A);
    rec.ok('5. Blue pin pressed again on the forge LIFTS it (its button says "Blue pin" again)',
      b5.after && b5.after.btns[1].on === '0' && /^Blue pin/.test(b5.after.btns[1].text) && s5 && s5.blue === null, { s5, btn: b5.after && b5.after.btns[1] });
    await closeCard(A);

    /* 6. a reload */
    await A.page.reload();
    await H.enterWorld(A);
    await A.page.waitForTimeout(1500);
    const m6 = await miniPins(A);
    const s6 = await pinsState(A);
    rec.ok('6. after a reload the red pin is still on the Gambling Den, on the minimap; blue is still lifted',
      s6 && s6.red === 'gambling' && s6.blue === null && !!m6 && m6.length === 1 && m6[0].color === 'red' && m6[0].id === 'gambling', { s6, m6 });
    await A.page.keyboard.press('m').catch(() => {});
    await A.page.evaluate(() => { if (!(window.__btWorldMap && window.__btWorldMap.open)) { const b = document.querySelector('[data-world-map-btn], .bt-worldmap-btn'); if (b) b.click(); } });
    let wm = null;
    for (let i = 0; i < 20 && !(wm && wm.open); i++) {
      wm = await A.page.evaluate(() => (window.__btWorldMap ? { open: window.__btWorldMap.open, pins: (window.__btWorldMap.more && window.__btWorldMap.more.mapPins) || null } : null));
      if (!(wm && wm.open)) {
        if (i === 6) await A.page.evaluate(() => { const r = window.__btWheelMini; if (r) { const x = r.left + r.w / 2, y = r.top + r.h / 2; const el = document.elementFromPoint(x, y); if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y })); } });
        await A.page.waitForTimeout(400);
      }
    }
    await A.page.waitForTimeout(800);
    wm = await A.page.evaluate(() => (window.__btWorldMap ? { open: window.__btWorldMap.open, pins: (window.__btWorldMap.more && window.__btWorldMap.more.mapPins) || null } : null));
    await shot(A, '6-worldmap');
    rec.ok('...and on the world map', !!wm && wm.open && Array.isArray(wm.pins) && wm.pins.length === 1 && wm.pins[0].color === 'red' && wm.pins[0].id === 'gambling', wm);
    await A.page.keyboard.press('Escape').catch(() => {});

    /* ── 7. the computer ── */
    C = await H.newPlayer(browser, { name: 'Deskbro', wsPort, webPort, world: 'wheel', wide: true });
    C.page.on('pageerror', (e) => errors.push(`computer: ${String((e && e.message) || e).slice(0, 200)}`));
    await H.enterWorld(C);
    await skipTutorial(C);
    const cdoors = await doorsOf(C);
    const cth = cdoors.find((d) => d.id === 'townhall');
    const o7 = cth ? await openBoard(C, cth, true) : { open: false };
    const b7 = await board(C);
    const hint = await C.page.evaluate(() => { const b = document.querySelector('[data-town-board]'); return !!b && (b.textContent || '').indexOf('Click one to read about it') >= 0; });
    await shot(C, '7-desk-board');
    const r7 = o7.open ? await pinIt(C, 'woodworker', 'blue', true) : null;
    await closeCard(C);
    const m7 = await miniPins(C);
    rec.ok('7. on a computer the board opens (its words say "click"), a page pins blue on the Woodworker, and the minimap shows it',
      o7.open && !!b7 && b7.tiles.length === b1.tiles.length && hint && !!r7 && r7.after && r7.after.btns[1].on === '1'
        && !!m7 && m7.some((m) => m.color === 'blue' && m.id === 'woodworker'), { open: o7.open, n: b7 && b7.tiles.length, m7, hint });

    rec.ok(`8. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    await A.ctx.close().catch(() => {});
    if (C) await C.ctx.close().catch(() => {});
  }
}
