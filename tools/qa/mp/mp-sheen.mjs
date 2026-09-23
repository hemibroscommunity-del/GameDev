/* ═══ v2.3.2736: A PERMANENT SOFT SHINE ON METAL (PREVIEW, ?sheen=1) ═══
 *
 * Owner: "aside from the glint can you see what adding a permanent soft shine
 * to armor and sword (and other metals) would look like?"
 *
 * What is proven here, and the pictures taken for the owner (the verdict on
 * the LOOK is theirs):
 *   1. the switch: OFF on a fresh device, so nothing changes for anyone who
 *      has not asked for it;
 *   2. switched on, every metal piece on the figure carries the shine on EVERY
 *      frame -- not only while a glint sweep crosses it -- and a figure with no
 *      metal on it carries nothing;
 *   3. it lights the art's own highlights: the armour gets brighter, and
 *      copper stays copper-coloured while it does (the tint cannot do this on
 *      its own: it only ever multiplies the art darker);
 *   4. jogging in a full set of one metal, the armour is ONE figure drawn on
 *      the body sprite (entityRenderer _fullsetFrame), and the shine stays on
 *      it -- the place the glint had never reached;
 *   5. what it costs: filter passes per figure, and the frame time on and off
 *      on this machine (a software GPU, so the RATIO is the useful number).
 *
 * Pictures: /tmp/qa-sheen/.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const DIR = '/tmp/qa-sheen';
const PHONE = { width: 390, height: 844 };
const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
      'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const d = {}; for (const k of l) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
};

const probe = (P) => P.page.evaluate(() => (window.__btLightFx ? window.__btLightFx.probe() : null));
const setSheen = (P, on) => P.page.evaluate((v) => { if (window.__btLightFx) window.__btLightFx.sheen(v); }, on);
const setScale = (P, k) => P.page.evaluate((v) => { if (window.__btLightFx) window.__btLightFx.sheenScale(v); }, k);
const setSun = (P, v) => P.page.evaluate((x) => { if (window.__btLightFx) window.__btLightFx.sheenSun(x); }, v);
const glintAt = (P, p) => P.page.evaluate((v) => { if (window.__btLightFx) window.__btLightFx.glint(v); }, p);
const setGear = (P, slot, id) => P.page.evaluate(({ s, i }) => { if (window.__btSetGear) window.__btSetGear(s, i); }, { s: slot, i: id });
/* A RENDER test: the metal and grade are set on this client only; the worker
   never sees them (same as mp-lightfx's godly picture). */
const setWeapon = (P, base, quality) => P.page.evaluate(([b, q]) => {
  const w = window._gameState.current.rpg.weapon;
  if (!w) return false;
  w.gearBase = b;
  w.quality = q;
  return true;
}, [base, quality]);
const setArmourGrade = (P, q) => P.page.evaluate((v) => {
  const R = window._gameState.current.rpg;
  R.armor = Object.assign({}, R.armor || {}, { quality: v });
  R.legsArmor = Object.assign({}, R.legsArmor || {}, { quality: v });
}, q);
const frames = (P, n = 3) => P.page.evaluate((k) => new Promise((res) => {
  let i = 0; const f = () => { if (++i >= k) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f);
}), n);

/* Mean frame interval over `ms`, and the worst one. */
const frameTime = (P, ms) => P.page.evaluate((dur) => new Promise((res) => {
  const ts = [];
  const t0 = performance.now();
  const f = (t) => { ts.push(t); if (t - t0 < dur) requestAnimationFrame(f); else {
    const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
    d.sort((x, y) => x - y);
    res({ mean: +(d.reduce((s, x) => s + x, 0) / d.length).toFixed(2), p95: +d[Math.floor(d.length * 0.95)].toFixed(2), n: d.length });
  } };
  requestAnimationFrame(f);
}), ms);

/* ═══ THE SHINE, MEASURED ON ONE FRAME ═══
   Screenshots a few hundred ms apart catch different frames of the standing
   figure's breathing, and that difference swamps the shine: the first cut of
   the sun-direction check read 0.62 against 0.59 for exactly that reason.
   So the game loop is held (its next requestAnimationFrame is kept back) and
   the renderer is run by hand at ONE fixed time for each setting -- the real
   pipeline, the same frame of every animation, only the shine changing.
   (Reading one sprite back through extract.pixels was tried first: it draws
   the sprite without its own filter, so every difference came out 0.) */
const freeze = async (P) => {
  /* capture the game's own arguments to the renderer (view size, nfts) off
     one real frame, then hold the loop */
  await P.page.evaluate(() => new Promise((res) => {
    const R = window._pixiRenderer;
    if (!R.__shWrapped) {
      const orig = R.update;
      R.update = function (...args) { window.__shArgs = args; return orig.apply(this, args); };
      R.__shWrapped = true;
    }
    window.__shArgs = null;
    const wait = () => (window.__shArgs ? res() : setTimeout(wait, 16));
    wait();
  }));
  await P.page.evaluate(() => {
    if (window.__shHeld) return;
    window.__shReal = window.requestAnimationFrame.bind(window);
    window.__shHeld = [];
    window.requestAnimationFrame = (cb) => { window.__shHeld.push(cb); return 0; };
    window.__shT = Date.now();
    window.__shPT = performance.now();
  });
};
const thaw = (P) => P.page.evaluate(() => {
  if (!window.__shHeld) return;
  const held = window.__shHeld;
  window.requestAnimationFrame = window.__shReal;
  window.__shHeld = null;
  for (const cb of held) window.requestAnimationFrame(cb);
});
/* One draw of the whole scene at the frozen instant: the renderer reads the
   clock itself (Date.now, and performance.now for some effects), so both are
   pinned for the length of the call. */
const drawFrozen = (P) => P.page.evaluate(() => {
  const dn = Date.now, pn = performance.now.bind(performance);
  Date.now = () => window.__shT;
  performance.now = () => window.__shPT;
  try { window._pixiRenderer.update(...window.__shArgs); } finally { Date.now = dn; performance.now = pn; }
});

function lumaOf(img) {
  const ch = img.channels;
  const out = new Float32Array(img.width * img.height);
  for (let i = 0; i < out.length; i++) out[i] = 0.299 * img.data[i * ch] + 0.587 * img.data[i * ch + 1] + 0.114 * img.data[i * ch + 2];
  return out;
}
/* The light `on` adds over `off` (same crop, same frame): in total, on each
   half, and the colour of the pixels it brightens by 6 levels or more. */
function added(off, on) {
  const a = lumaOf(off), b = lumaOf(on);
  const ch = on.channels;
  let sum = 0, lit = 0, left = 0, right = 0, r = 0, g = 0, bl = 0;
  for (let i = 0; i < a.length; i++) {
    const d = b[i] - a[i];
    if (d <= 0) continue;
    sum += d;
    if ((i % off.width) < off.width / 2) left += d; else right += d;
    if (d >= 6) { lit++; r += on.data[i * ch]; g += on.data[i * ch + 1]; bl += on.data[i * ch + 2]; }
  }
  return { sum: Math.round(sum), lit, left: Math.round(left), right: Math.round(right),
    rgb: lit ? [Math.round(r / lit), Math.round(g / lit), Math.round(bl / lit)] : null };
}

/* Off, on, lit from the left, lit from the right -- all one frame. */
async function measureSheen(P, box) {
  await freeze(P);
  await P.page.waitForTimeout(120);          /* let the frame in flight finish */
  const shot = async () => { await drawFrozen(P); return H.decodePng(await P.page.screenshot({ clip: box })); };
  await setSheen(P, false);
  const off = await shot();
  await setSheen(P, true);
  const now = await shot();
  await setSun(P, [-1, 0]);
  const fromLeft = await shot();
  await setSun(P, [1, 0]);
  const fromRight = await shot();
  await setSun(P, null);
  await thaw(P);
  return { now: added(off, now), fromLeft: added(off, fromLeft), fromRight: added(off, fromRight),
    swing: sunSwing(off, fromLeft, fromRight) };
}

/* Per pixel, which sun lit it more.  On the figure's left third most of its
   lit pixels should be brighter with the sun on the left, and on its right
   third with the sun on the right -- robust to where the art's own highlights
   happen to be painted, which a half-and-half sum is not. */
function sunSwing(off, fromLeft, fromRight) {
  const o = lumaOf(off), l = lumaOf(fromLeft), r = lumaOf(fromRight);
  const W = off.width;
  let x0 = Infinity, x1 = -Infinity;
  for (let i = 0; i < o.length; i++) {
    if (Math.max(l[i], r[i]) - o[i] >= 6) { const x = i % W; if (x < x0) x0 = x; if (x > x1) x1 = x; }
  }
  if (!(x1 > x0)) return null;
  const third = (x1 - x0) / 3;
  let leftN = 0, leftL = 0, rightN = 0, rightR = 0;
  for (let i = 0; i < o.length; i++) {
    if (Math.max(l[i], r[i]) - o[i] < 6 || l[i] === r[i]) continue;
    const x = i % W;
    if (x <= x0 + third) { leftN++; if (l[i] > r[i]) leftL++; }
    else if (x >= x1 - third) { rightN++; if (r[i] > l[i]) rightR++; }
  }
  return { left: leftN ? +(leftL / leftN).toFixed(2) : null, right: rightN ? +(rightR / rightN).toFixed(2) : null, leftN, rightN };
}

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  mkdirSync(DIR, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Polish', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, init: COACH_OFF });
  opened.push(A);
  await H.enterWorld(A);
  await A.page.waitForTimeout(2000);
  const myId = await H.readState(A, (S) => S.myId);
  await H.devOp(wsPort, 'kit', myId, { what: 'weapons' });
  await A.page.waitForTimeout(1200);
  await H.equipWeapon(A, 'greatsword', 'weapon', 'melee');
  await A.page.waitForTimeout(1200);
  /* the open cobble mp-lightfx takes its pictures on */
  await H.hopTo(A, 1105, 1085).catch(() => {});
  await A.page.waitForTimeout(1500);
  await H.clickText(A, 'CLOSE').catch(() => {});
  await A.page.waitForTimeout(600);

  /* ── 1. the switch ── */
  const p0 = await probe(A);
  rec.ok('the light probe is present (guard)', !!(p0 && p0.glint), p0);
  rec.ok('the shine is OFF on a fresh device', !!p0 && p0.glint.sheenOn === false && p0.glint.sheen === 0, p0 && p0.glint);

  /* dressed in plate and greaves, a sword in hand, every sweep held off so
     each picture is the shine alone */
  await setGear(A, 'chest', 'copperplate');
  await setGear(A, 'legs', 'coppergreaves');
  const wOk = await setWeapon(A, 'copper', 'normal');
  rec.ok('a metal sword is in hand (guard)', wOk);
  await glintAt(A, -1);
  await A.page.waitForTimeout(800);
  /* the whole figure, head to boots, and nothing above it: figureBox
     anchors on the body's centre, so drop the box by its own half-height */
  const fb = await H.figureBox(A, { pad: 34 });
  const box = fb ? { x: fb.x + Math.round(fb.width * 0.17), y: fb.y + Math.round(fb.height * 0.33), width: Math.round(fb.width * 0.44), height: Math.round(fb.height * 0.78) } : null;
  rec.ok('the figure is on screen to be pictured (guard)', !!box, box);

  /* ── 2. on, every metal piece every frame ── */
  await setSheen(A, true);
  const counts = [];
  for (let i = 0; i < 10; i++) {
    await A.page.waitForTimeout(200);
    const p = await probe(A);
    counts.push(p ? p.glint.keys.slice().sort().join(',') : 'none');
  }
  rec.ok('on, the sword, the plate and the greaves all carry the shine on every frame sampled (2 s)',
    counts.every((c) => c === 'self:c,self:l,self:w'), counts);

  /* ── 3 + pictures: each metal, off / soft / stronger ── */
  const shots = {};
  for (const metal of ['copper', 'iron', 'steel']) {
    await setGear(A, 'chest', metal === 'steel' ? 'steelplate' : metal + 'plate');
    await setGear(A, 'legs', metal === 'steel' ? 'steelgreaves' : metal + 'greaves');
    await setWeapon(A, metal, 'normal');
    await setArmourGrade(A, 'normal');
    await A.page.waitForTimeout(500);
    shots[metal] = await measureSheen(A, box);
    /* the pictures, one frozen frame: off, the soft sheen, a stronger cut */
    await freeze(A);
    await A.page.waitForTimeout(120);
    await setSheen(A, false); await drawFrozen(A);
    await A.page.screenshot({ path: `${DIR}/${metal}-off.png`, clip: box });
    await setSheen(A, true); await setScale(A, 1); await drawFrozen(A);
    await A.page.screenshot({ path: `${DIR}/${metal}-soft.png`, clip: box });
    await setScale(A, 1.5); await drawFrozen(A);
    await A.page.screenshot({ path: `${DIR}/${metal}-strong.png`, clip: box });
    await setScale(A, null);
    await thaw(A);
  }
  console.log('    light the shine adds to the figure, one frame: '
    + JSON.stringify(Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, v && v.now]))));
  rec.ok('on, the metal on the figure is brighter than off, in every metal (one frame)',
    ['copper', 'iron', 'steel'].every((m) => shots[m] && shots[m].now.lit > 20 && shots[m].now.sum > 0), shots);
  const cu = shots.copper && shots.copper.now.rgb;
  rec.ok('...and copper stays copper: the pixels it brightens are warm (red over green over blue)',
    !!cu && cu[0] > cu[1] && cu[1] > cu[2], { rgb: cu });

  /* it follows the sun: the same frame of the steel set, lit from the left
     and then from the right, compared pixel by pixel */
  const sw = shots.steel && shots.steel.swing;
  console.log('    steel, the share of lit pixels each sun brightens more: left third by the left sun '
    + (sw && sw.left) + ', right third by the right sun ' + (sw && sw.right));
  rec.ok('it follows the sun: on the figure\'s left third the left sun lights most pixels more, and on its right third the right sun does (one frame)',
    !!sw && sw.left > 0.7 && sw.right > 0.7, sw);

  /* godly: gold, and brighter */
  await setGear(A, 'chest', 'steelplate');
  await setGear(A, 'legs', 'steelgreaves');
  await setWeapon(A, 'steel', 'godly');
  await setArmourGrade(A, 'godly');
  await A.page.waitForTimeout(400);
  await freeze(A);
  await A.page.waitForTimeout(120);
  await setSheen(A, false); await drawFrozen(A);
  await A.page.screenshot({ path: `${DIR}/godly-off.png`, clip: box });
  await setSheen(A, true); await drawFrozen(A);
  await A.page.screenshot({ path: `${DIR}/godly-soft.png`, clip: box });
  await thaw(A);
  await setWeapon(A, 'steel', 'normal');
  await setArmourGrade(A, 'normal');

  /* ── nothing without metal ── */
  await setGear(A, 'chest', 'none');
  await setGear(A, 'legs', 'none');
  await setWeapon(A, 'ww_oak', 'normal');
  await A.page.waitForTimeout(500);
  const pn = await probe(A);
  rec.ok('a figure with no metal on it carries no shine (shirt, bare legs, a wooden weapon)',
    !!pn && pn.glint.keys.length === 0 && pn.glint.sheen === 0, pn && pn.glint);

  /* ── 4. jogging in a full set ── */
  await setGear(A, 'chest', 'copperplate');
  await setGear(A, 'legs', 'coppergreaves');
  await setWeapon(A, 'copper', 'normal');
  await A.page.waitForTimeout(500);
  await A.page.keyboard.down('s');
  let bodyLit = 0, samples = 0, jogShot = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 1600) {
    await A.page.waitForTimeout(120);
    const p = await probe(A);
    samples++;
    if (p && p.glint.body > 0) bodyLit++;
    if (!jogShot && Date.now() - t0 > 700) {
      const jf = await H.figureBox(A, { pad: 34 });
      const jb = jf ? { x: jf.x, y: jf.y + Math.round(jf.height * 0.36), width: jf.width, height: Math.round(jf.height * 0.92) } : null;
      if (jb) { await A.page.screenshot({ path: `${DIR}/jog-copper-soft.png`, clip: jb }); jogShot = true; }
    }
  }
  await A.page.keyboard.up('s');
  rec.ok('jogging in a full copper set, the armour figure on the body sprite carries the shine',
    bodyLit >= Math.ceil(samples / 2), { bodyLit, samples });
  await A.page.waitForTimeout(600);

  /* ── 5. the cost ── */
  await H.hopTo(A, 1105, 1085).catch(() => {});
  await A.page.waitForTimeout(600);
  await setSheen(A, false);
  await A.page.waitForTimeout(400);
  const fOff = await frameTime(A, 2500);
  await setSheen(A, true);
  await A.page.waitForTimeout(400);
  const fOn = await frameTime(A, 2500);
  const pc = await probe(A);
  console.log('    frame time, shine off: ' + JSON.stringify(fOff) + '  on: ' + JSON.stringify(fOn)
    + '  filter passes on this figure: ' + (pc && pc.glint.sheen));
  rec.ok('the cost is one filter pass per metal piece: three for plate, greaves and a sword',
    !!pc && pc.glint.sheen === 3, pc && pc.glint);

  await setSheen(A, false);
  await glintAt(A, null);
  const errs = (A.logs || []).filter((l) => /lightFx threw|glint|TypeError|ReferenceError/.test(l));
  rec.ok('no light errors on the client', errs.length === 0, errs.slice(0, 4));
}
