/* ═══ WORN ARMOUR SHOWS ITS GRADE (v2.3.3142) ═══
 *
 * Owner: "I also think the armor should be visibly different if you're
 * wearing rare, elite, or godly.  Wondering if you can change the outline hue
 * or something on the armor so it retains the color but has highlights.  So
 * rare is blue, elite is orange, godly is prismatic".
 *
 * The shine's own filter draws it (src/rendering/lightfx/glint.js GRADE_LOOK):
 * the piece's inner edge in the grade's colour and its highlights lit in it.
 *   1. on your own figure, every metal (copper, iron, steel) in every grade:
 *      the probe says each piece wears its grade and a normal piece none, and
 *      the pictures (one frozen frame each) show it -- the edge blue for rare,
 *      orange for elite, many hues for godly -- while the metal keeps its own
 *      colour (copper's highlights stay copper-warm);
 *   1b. jogging east with a sword out in a godly full set, the arm drawn
 *      again over the sword (a masked clone of the body) wears the body's own
 *      outline -- it changes the picture no more than in plain armour;
 *   2. a grade is drawn with the light effects switched OFF too, and only on
 *      the graded pieces;
 *   3. ANOTHER player sees it: A wears an elite iron torso and greaves the
 *      worker minted (the admin kit's `quality`), equipped by their ids; B is
 *      told `eqg: 'ee'` by the tick and draws A's two pieces elite;
 *   4. the bag says the same (v2.3.3142's colours): an elite piece's edge
 *      orange, a godly piece's ring a rainbow;
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/armorgrade-*.png, and the grid of all twelve.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
      'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const o = {}; for (const k of l) o[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(o));
  } catch (e) { /* private mode */ }
};
/* a new character's WELCOME plate (v2.3.2890) sits over the top of the
   screen; its own Skip tutorial button takes it down (mp-figureseam's way) */
const skipWelcome = async (P) => {
  for (let i = 0; i < 60; i++) {
    const up = await P.page.evaluate(() => {
      const b = document.querySelector('[data-skip-tutorial]');
      if (b) b.click();
      return !!document.querySelector('[data-quest-banner="welcome"]');
    }).catch(() => true);
    if (!up) break;
    await P.page.waitForTimeout(250);
  }
};
const probe = (P) => P.page.evaluate(() => (window.__btLightFx ? window.__btLightFx.probe() : null));
const setGear = (P, slot, id) => P.page.evaluate(({ s, i }) => { if (window.__btSetGear) window.__btSetGear(s, i); }, { s: slot, i: id });
/* a RENDER check of your own figure: the grade is set on this client only */
const setGrade = (P, q) => P.page.evaluate((v) => {
  const R = window._gameState.current.rpg;
  R.armor = Object.assign({}, R.armor || {}, { quality: v, prov: 'minted' });
  R.legsArmor = Object.assign({}, R.legsArmor || {}, { quality: v, prov: 'minted' });
}, q);
/* one frozen frame, the renderer driven by hand (mp-sheen's method) */
const freeze = async (P) => {
  await P.page.evaluate(() => new Promise((res) => {
    const R = window._pixiRenderer;
    if (!R.__agWrapped) {
      const orig = R.update;
      R.update = function (...args) { window.__agArgs = args; return orig.apply(this, args); };
      R.__agWrapped = true;
    }
    window.__agArgs = null;
    const wait = () => (window.__agArgs ? res() : setTimeout(wait, 16));
    wait();
  }));
  await P.page.evaluate(() => {
    if (window.__agHeld) return;
    window.__agReal = window.requestAnimationFrame.bind(window);
    window.__agHeld = [];
    window.requestAnimationFrame = (cb) => { window.__agHeld.push(cb); return 0; };
    window.__agT = Date.now();
    window.__agPT = performance.now();
  });
  await P.page.waitForTimeout(120);
};
const thaw = (P) => P.page.evaluate(() => {
  if (!window.__agHeld) return;
  const held = window.__agHeld;
  window.requestAnimationFrame = window.__agReal;
  window.__agHeld = null;
  for (const cb of held) window.requestAnimationFrame(cb);
});
const drawFrozen = (P) => P.page.evaluate(() => {
  const dn = Date.now, pn = performance.now.bind(performance);
  Date.now = () => window.__agT;
  performance.now = () => window.__agPT;
  try { window._pixiRenderer.update(...window.__agArgs); } finally { Date.now = dn; performance.now = pn; }
});

/* What a grade changed against the same frame in plain armour, in two groups:
   STRONG changes (the edge, drawn in the grade's colour: 120+ levels summed
   over the three channels) and LIGHT ones (30-120: the highlights lit in it).
   For each, how many pixels, their mean colour and how many distinct hues. */
function diff(base, img) {
  const ch = img.channels;
  const g = { strong: { n: 0, r: 0, g: 0, b: 0, hues: new Set() }, light: { n: 0, r: 0, g: 0, b: 0, hues: new Set() } };
  for (let i = 0; i < img.width * img.height; i++) {
    const o = i * ch;
    const d = Math.abs(img.data[o] - base.data[o]) + Math.abs(img.data[o + 1] - base.data[o + 1]) + Math.abs(img.data[o + 2] - base.data[o + 2]);
    const k = d >= 120 ? g.strong : d >= 30 ? g.light : null;
    if (!k) continue;
    k.n++; k.r += img.data[o]; k.g += img.data[o + 1]; k.b += img.data[o + 2];
    const R = img.data[o] / 255, G = img.data[o + 1] / 255, B = img.data[o + 2] / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    if (mx - mn > 0.25) {
      let h;
      if (mx === R) h = ((G - B) / (mx - mn)) % 6; else if (mx === G) h = (B - R) / (mx - mn) + 2; else h = (R - G) / (mx - mn) + 4;
      k.hues.add(Math.floor(((h * 60 + 360) % 360) / 30));   /* twelve 30-degree bins */
    }
  }
  const out = (k) => (k.n ? { n: k.n, rgb: [Math.round(k.r / k.n), Math.round(k.g / k.n), Math.round(k.b / k.n)], hues: k.hues.size } : { n: 0, rgb: null, hues: 0 });
  return { strong: out(g.strong), light: out(g.light) };
}

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  const A = await H.newPlayer(browser, { name: 'Gleam', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, init: COACH_OFF });
  opened.push(A);
  A.page.on('pageerror', (e) => errors.push('A: ' + String(e).slice(0, 200)));
  await H.enterWorld(A);
  await A.page.waitForTimeout(2000);
  const aId = await H.readState(A, (S) => S.myId);
  await H.hopTo(A, 1105, 1085).catch(() => {});
  await A.page.waitForTimeout(1500);
  await H.clickText(A, 'CLOSE').catch(() => {});
  await skipWelcome(A);
  await A.page.evaluate(() => { if (window.__btLightFx) window.__btLightFx.glint(-1); });
  await A.page.waitForTimeout(600);

  /* ── 1. your own figure, every metal in every grade ── */
  const fb = await H.figureBox(A, { pad: 34 });
  const box = fb ? { x: fb.x + Math.round(fb.width * 0.1), y: fb.y + Math.round(fb.height * 0.33), width: Math.round(fb.width * 0.58), height: Math.round(fb.height * 0.78) } : null;
  rec.ok('the figure is on screen to be pictured (guard)', !!box, box);
  if (!box) return;
  const GRADES = ['normal', 'rare', 'elite', 'godly'];
  const METALS = ['copper', 'iron', 'steel'];
  const shots = {};
  const probes = {};
  /* ONE frozen frame per metal, its four grades drawn on it in turn: between
     two frames the idle animation moves the figure, and a diff across frames
     counted that movement as the grade (copper's rare edge read grey once) */
  for (const metal of METALS) {
    await setGear(A, 'chest', metal === 'steel' ? 'steelplate' : metal + 'plate');
    await setGear(A, 'legs', metal === 'steel' ? 'steelgreaves' : metal + 'greaves');
    await setGrade(A, 'normal');
    await A.page.waitForTimeout(500);
    await freeze(A);
    for (const g of GRADES) {
      await setGrade(A, g);
      await drawFrozen(A);
      probes[metal + ':' + g] = (await probe(A)).glint;
      shots[metal + ':' + g] = H.decodePng(await A.page.screenshot({ path: join(OUT, `armorgrade-${metal}-${g}.png`), clip: box }));
    }
    await thaw(A);
  }
  const pr = (m, g) => probes[m + ':' + g] || {};
  rec.ok('a normal piece wears no grade; a rare, elite or godly one wears its own on both pieces',
    METALS.every((m) => Object.keys(pr(m, 'normal').grades || {}).length === 0
      && ['rare', 'elite', 'godly'].every((g) => (pr(m, g).grades || {})['self:c'] === g && (pr(m, g).grades || {})['self:l'] === g)),
    METALS.map((m) => GRADES.map((g) => pr(m, g).grades)));
  const d = {};
  for (const m of METALS) for (const g of ['rare', 'elite', 'godly']) d[m + ':' + g] = diff(shots[m + ':normal'], shots[m + ':' + g]);
  console.log('    what each grade changed on the figure -- the edge (strong) and the highlights (light):');
  for (const k of Object.keys(d)) console.log('      ' + k.padEnd(14) + ' ' + JSON.stringify(d[k]));
  const edge = (m, g) => d[m + ':' + g].strong;
  rec.ok('rare reads blue: its edge is bluer than it is red, in every metal',
    METALS.every((m) => { const x = edge(m, 'rare'); return x.n > 200 && x.rgb[2] > x.rgb[0] + 20; }), METALS.map((m) => edge(m, 'rare')));
  rec.ok('elite reads orange: its edge is red over green over blue, in every metal',
    METALS.every((m) => { const x = edge(m, 'elite'); return x.n > 200 && x.rgb[0] > x.rgb[1] && x.rgb[1] > x.rgb[2] && x.rgb[0] > x.rgb[2] + 80; }), METALS.map((m) => edge(m, 'elite')));
  rec.ok('godly reads prismatic: its edge spans at least five of twelve hues, in every metal',
    METALS.every((m) => { const x = edge(m, 'godly'); return x.n > 200 && x.hues >= 5; }), METALS.map((m) => edge(m, 'godly')));
  /* the metal keeps its colour: what a grade only lightens (the highlights)
     is still copper-warm on the copper set, in every grade */
  rec.ok('the metal keeps its own colour: on the copper set the highlights a grade lights stay copper-warm (red over blue), in every grade',
    ['rare', 'elite', 'godly'].every((g) => { const x = d['copper:' + g].light; return x.n > 0 && x.rgb[0] > x.rgb[2] + 40; }), ['rare', 'elite', 'godly'].map((g) => d['copper:' + g].light));

  /* the grid of all twelve, for the PR -- drawn on a scratch page of its own */
  const W = box.width, Hh = box.height;
  const scratch = await A.ctx.newPage();
  await scratch.setContent('<html><body style="margin:0;background:#1E2E34"><canvas id="c"></canvas></body></html>').catch(() => {});
  const tiles = [];
  for (const m of METALS) for (const g of GRADES) tiles.push(readFileSync(join(OUT, `armorgrade-${m}-${g}.png`)).toString('base64'));
  const grid = await scratch.evaluate(async ({ tiles, W, Hh }) => {
    const cv = document.getElementById('c');
    const S = 3, pad = 16, top = 46, left = 120;
    cv.width = left + 4 * (W * S + pad); cv.height = top + 3 * (Hh * S + pad);
    const x = cv.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#1E2E34'; x.fillRect(0, 0, cv.width, cv.height);
    x.fillStyle = '#F4F0E7'; x.font = '700 28px sans-serif'; x.textAlign = 'center';
    const G = ['Normal', 'Rare', 'Elite', 'Godly'], M = ['Copper', 'Iron', 'Steel'];
    G.forEach((g, i) => x.fillText(g, left + i * (W * S + pad) + (W * S) / 2, 32));
    x.textAlign = 'right';
    M.forEach((m, i) => x.fillText(m, left - 14, top + i * (Hh * S + pad) + (Hh * S) / 2));
    for (let i = 0; i < tiles.length; i++) {
      const im = new Image();
      await new Promise((r) => { im.onload = r; im.src = 'data:image/png;base64,' + tiles[i]; });
      x.drawImage(im, left + (i % 4) * (W * S + pad), top + Math.floor(i / 4) * (Hh * S + pad), W * S, Hh * S);
    }
    return cv.toDataURL('image/png');
  }, { tiles, W, Hh });
  writeFileSync(join(OUT, 'armorgrade-grid.png'), Buffer.from(grid.split(',')[1], 'base64'));
  await scratch.close().catch(() => {});

  /* ── 1b. the arm drawn again over the sword, in a graded full set ──
     On an east jog with a sword out the arm is re-drawn over the slung shield
     (a CLONE of the body under a mask; glint.js pins its filter to the whole
     frame, unmaskedArea).  Its outline must be the body's own -- the same
     pixels, the same rainbow -- or the arm reads as a patch.  Counted as
     mp-sheen counts it: the pixels the clone changes on one frozen frame,
     godly against plain (the clone's soft edges are drawn twice either way). */
  await H.devOp(wsPort, 'kit', aId, { what: 'weapons' });
  await A.page.waitForTimeout(1200);
  await H.equipWeapon(A, 'greatsword', 'weapon', 'melee').catch(() => {});
  await A.page.waitForTimeout(1200);
  /* every quest done, so the jog east does not walk into Mayor Bro's
     tutorial line -- its dialogue covered the figure and the count read 0
     (mp-figureseam's way) */
  await H.devOp(wsPort, 'quests', aId).catch(() => {});
  await A.page.waitForTimeout(800);
  for (let i = 0; i < 3; i++) { await H.closeNpcDialogue(A).catch(() => {}); await A.page.waitForTimeout(200); }
  await setGear(A, 'chest', 'copperplate');
  await setGear(A, 'legs', 'coppergreaves');
  const HIDE = ['_weaponContainer', '_shieldSprite', '_handCapSprite', '_handArmShirt', '_handArmCape'];
  const armChange = async (grade) => {
    await setGrade(A, grade);
    await A.page.keyboard.down('d');
    let capOn = false;
    for (let i = 0; i < 50 && !capOn; i++) {
      await A.page.waitForTimeout(60);
      capOn = await A.page.evaluate(() => !!(window.__btArmCapsule && window.__btArmCapsule.on));
    }
    await freeze(A);
    const armBox = await H.figureBox(A, { pad: 30 });
    const shot = async (alpha) => {
      await A.page.evaluate(({ a, hide }) => {
        const pd = window._pixiRenderer.playerDisplayRaw();
        for (const k of hide) if (pd[k]) pd[k].renderable = false;
        if (pd._handArmSprite) pd._handArmSprite.alpha = a;
      }, { a: alpha, hide: HIDE });
      await drawFrozen(A);
      const f = await A.page.evaluate(() => {
        const h = window._pixiRenderer.playerDisplayRaw()._handArmSprite;
        return { shown: !!(h && h.visible), filtered: !!(h && Array.isArray(h.filters) && h.filters.some((x) => x && x.resources && x.resources.glintUniforms)) };
      });
      return { f, img: armBox ? H.decodePng(await A.page.screenshot({ clip: armBox })) : null };
    };
    const s0 = await shot(0), s1 = await shot(1);
    const pr = (await probe(A)).glint;
    await A.page.evaluate((hide) => {
      const pd = window._pixiRenderer.playerDisplayRaw();
      for (const k of hide) if (pd[k]) pd[k].renderable = true;
      if (pd._handArmSprite) pd._handArmSprite.alpha = 1;
    }, HIDE);
    await thaw(A);
    await A.page.keyboard.up('d');
    let n = null;
    if (s0.img && s1.img) {
      n = 0;
      for (let i = 0; i < s0.img.data.length; i += s0.img.channels) {
        if (Math.abs(s0.img.data[i] - s1.img.data[i]) + Math.abs(s0.img.data[i + 1] - s1.img.data[i + 1]) + Math.abs(s0.img.data[i + 2] - s1.img.data[i + 2]) > 24) n++;
      }
    }
    return { capOn, clone: s1.f, n, grade: (pr.grades || {})['self:c'] || 'normal' };
  };
  const armPlain = await armChange('normal');
  const armGodly = await armChange('godly');
  console.log('    the arm re-drawn over the sword changes ' + armGodly.n + ' pixels in godly armour, ' + armPlain.n + ' in plain');
  /* guard: in plain armour the clone's soft edges, drawn twice, change some
     pixels (mp-sheen measured ~70) -- a 0 means the picture missed the arm
     and the comparison below would pass on nothing */
  rec.ok('the arm drawn again over the sword is on the picture (guard: drawn twice, its soft edges change some pixels in plain armour)',
    armPlain.capOn && armPlain.n != null && armPlain.n >= 20, armPlain);
  rec.ok('jogging east with a sword out in a godly full set, the arm drawn again over it wears the body\'s own outline: it changes the picture no more than in plain armour',
    armPlain.capOn && armGodly.capOn && armGodly.clone.shown && armGodly.clone.filtered && armGodly.grade === 'godly'
      && armPlain.n != null && armGodly.n != null && armGodly.n <= armPlain.n * 1.25 + 40, { plain: armPlain, godly: armGodly });
  await setGrade(A, 'normal');
  await H.hopTo(A, 1105, 1085).catch(() => {});
  await A.page.waitForTimeout(800);

  /* ── 2. the light effects off ── */
  await setGear(A, 'chest', 'ironplate');
  await setGear(A, 'legs', 'irongreaves');
  await setGrade(A, 'rare');
  await A.page.evaluate(() => { if (window.__btLightFx) window.__btLightFx.set(false); });
  await A.page.waitForTimeout(600);
  const off = await probe(A);
  await A.page.evaluate(() => { if (window.__btLightFx) window.__btLightFx.set(true); });
  rec.ok('with the light effects OFF a rare set still wears its grade, and only the graded pieces are filtered',
    !!off && off.on === false && off.glint.graded === 2 && (off.glint.grades || {})['self:c'] === 'rare' && off.glint.sheen === 0, off && off.glint);
  await setGrade(A, 'normal');

  /* ── 3. another player sees it ── */
  await H.devOp(wsPort, 'kit', aId, { what: 'armor', quality: 'elite' });
  let pieces = null;
  for (let i = 0; i < 30 && !pieces; i++) {
    pieces = await A.page.evaluate(() => {
      const R = window._gameState.current.rpg || {};
      const t = (R.armorStash || []).find((x) => x && x.name === 'Iron Torso' && x.quality === 'elite' && x.gid);
      const l = (R.legsStash || []).find((x) => x && x.name === 'Iron Greaves' && x.quality === 'elite' && x.gid);
      return t && l ? { t: t.gid, l: l.gid } : null;
    });
    if (!pieces) await A.page.waitForTimeout(300);
  }
  rec.ok('the admin kit hands out an elite iron torso and greaves the worker minted, into the bag with their grade', !!pieces, pieces);
  if (pieces) {
    /* worn by their ids, the real equip lane (grids.js armorRef) */
    await A.page.evaluate((p) => {
      const S = window._gameState.current;
      const R = S.rpg;
      R.armor = (R.armorStash || []).find((x) => x && x.gid === p.t) || R.armor;
      R.legsArmor = (R.legsStash || []).find((x) => x && x.gid === p.l) || R.legsArmor;
      if (window.__btSetGear) { window.__btSetGear('chest', 'ironplate'); window.__btSetGear('legs', 'irongreaves'); }
      S.channel.send({ type: 'stats_update', payload: { armorRef: p.t, legsArmorRef: p.l } });
    }, pieces);
    await A.page.waitForTimeout(800);
    /* at 3 device px a CSS px, an iPhone's -- so the picture shows the edge's
       width there too (GRADE_RIM is CSS px; A's grid is at 2) */
    const B = await H.newPlayer(browser, { name: 'Witness', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, init: COACH_OFF });
    opened.push(B);
    B.page.on('pageerror', (e) => errors.push('B: ' + String(e).slice(0, 200)));
    await H.enterWorld(B);
    await B.page.waitForTimeout(1500);
    await H.hopTo(B, 1105 + 70, 1085).catch(() => {});
    await H.clickText(B, 'CLOSE').catch(() => {});
    await skipWelcome(B);
    /* A steps about so the relay carries the plate's look and the tick its grade */
    await H.hopTo(A, 1105 - 20, 1085).catch(() => {});
    await H.hopTo(A, 1105, 1085).catch(() => {});
    let seen = null;
    for (let i = 0; i < 30; i++) {
      seen = await B.page.evaluate((id) => {
        const o = (window._gameState.current.others || {})[id];
        const p = window.__btLightFx ? window.__btLightFx.probe() : null;
        return o ? { eqg: o._eqg, equip: o.equip, grades: p && p.glint.grades } : null;
      }, aId);
      if (seen && seen.eqg === 'ee' && seen.grades && seen.grades[aId + ':c'] === 'elite' && seen.grades[aId + ':l'] === 'elite') break;
      await B.page.waitForTimeout(400);
    }
    /* the picture: both figures, A (elite, on the left) as B draws them --
       with the Mayor's welcome (B is new, and stands by him) put away */
    for (let i = 0; i < 3; i++) { await H.closeNpcDialogue(B).catch(() => {}); await B.page.waitForTimeout(300); }
    const pb = await H.figureBox(B, { pad: 34, peerId: aId }).catch(() => null);
    const sb = await H.figureBox(B, { pad: 34 }).catch(() => null);
    if (pb && sb) {
      const x0 = Math.max(0, Math.min(pb.x, sb.x) - 24), y0 = Math.max(0, Math.min(pb.y, sb.y) - 16);
      const x1 = Math.max(pb.x + pb.width, sb.x + sb.width) + 24, y1 = Math.max(pb.y + pb.height, sb.y + sb.height) + 16;
      await B.page.screenshot({ path: join(OUT, 'armorgrade-peer.png'), clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } }).catch(() => {});
    }
    rec.ok('another player is told the grade by the worker (eqg "ee") and draws both of A\'s pieces elite',
      !!seen && seen.eqg === 'ee' && !!seen.grades && seen.grades[aId + ':c'] === 'elite' && seen.grades[aId + ':l'] === 'elite', seen);
  }
  /* ── 4. the bag says the same: elite orange, godly a rainbow ring ── */
  await H.devOp(wsPort, 'kit', aId, { what: 'armor', quality: 'godly' });
  await A.page.waitForTimeout(1200);
  await A.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) { /* older build */ } });
  await A.page.waitForTimeout(1500);
  const bagTiles = await A.page.evaluate(() => [...document.querySelectorAll('[data-bag-key^="stashArmor-"], [data-bag-key^="stashLegs-"]')]
    .filter((el) => el.offsetParent)
    .map((el) => ({ name: el.title, border: getComputedStyle(el).borderTopColor, godly: el.classList.contains('ls-slot--godly'),
      ring: el.classList.contains('ls-slot--godly') ? getComputedStyle(el, '::after').backgroundImage : '' })));
  const eliteTiles = bagTiles.filter((t) => t.border === 'rgb(232, 137, 58)');
  const godlyTiles = bagTiles.filter((t) => t.godly);
  rec.ok('the bag: an elite piece\'s edge is orange (#E8893A), not the old purple', eliteTiles.length >= 2 && !bagTiles.some((t) => t.border === 'rgb(164, 119, 223)'), bagTiles);
  /* the ring a rainbow: red, yellow, green, blue and violet stops all in it */
  rec.ok('the bag: a godly piece wears the ring, and the ring is a rainbow',
    godlyTiles.length >= 2 && godlyTiles.every((t) => ['255, 107, 107', '255, 209, 102', '107, 255, 149', '92, 184, 255', '199, 125, 255'].every((c) => t.ring.includes(c))),
    godlyTiles);
  const bagBox = await A.page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-bag-key^="stashArmor-"], [data-bag-key^="stashLegs-"]')].filter((el) => el.offsetParent);
    if (!els.length) return null;
    const r = els.map((el) => el.getBoundingClientRect());
    const x0 = Math.min(...r.map((q) => q.left)), y0 = Math.min(...r.map((q) => q.top));
    const x1 = Math.max(...r.map((q) => q.right)), y1 = Math.max(...r.map((q) => q.bottom));
    return { x: Math.max(0, x0 - 12), y: Math.max(0, y0 - 12), width: Math.min(innerWidth, x1 + 12) - Math.max(0, x0 - 12), height: y1 - y0 + 24 };
  });
  if (bagBox && bagBox.width > 0 && bagBox.height > 0) await A.page.screenshot({ path: join(OUT, 'armorgrade-bag.png'), clip: bagBox }).catch(() => {});
  rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
}
