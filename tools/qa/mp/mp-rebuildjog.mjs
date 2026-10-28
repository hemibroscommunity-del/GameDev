/* ═══ v2.3.3701: EVERY LAYER OF AN ARMOURED BRO, JOGGING EVERY WAY, AFTER A BLACK SCREEN ═══
 *
 * The owner, 2026-10-27: "Northwest jog has trouble loading reloading textures
 * after recovering from black screen".  A black screen on an iPhone is the
 * graphics chip reset (the WebGL context lost): the game rebuilds its renderer
 * 2.5 s later on a fresh canvas (crashTrap watchContextLoss -> BroTown
 * _rebuildRenderer), and every picture is sent to the new chip again from
 * where the page keeps it.  It comes from memory pressure, and iPhone Safari
 * may empty the page's canvases at the same moment (TRAPS §250).
 *
 * A phone in the world, a pattern on the trousers (so west, northwest and
 * southeast are drawn from a body picture of their own: playerSkins
 * localBodyArt(true)), hair, a hat and glasses, a copper torso and copper
 * greaves worn the real way.  Then, jogging each of the eight ways in turn,
 * every layer of the figure -- the body, the shirt, the plate, the greaves,
 * the hair, the hat, the glasses and the head -- read back off the graphics
 * chip (a sprite of its texture drawn on nothing), and whether the body was
 * drawn plain under the armour (its masked bake missing):
 *   1. (guard) before anything happens, every layer drawn every way;
 *   2. the context lost as a black screen loses it (WEBGL_lose_context), the
 *      game's own rebuild, then every layer drawn every way;
 *   3. the canvases emptied as Safari empties them under memory pressure, and
 *      the context lost again: the rebuild notices the emptied pictures and
 *      reloads the page instead (BroTown _rebuildRenderer, v2.3.3701), within
 *      seconds -- not a rebuild of blanks waited out by the watchdog;
 *   3b. back in the world, every layer drawn every way;
 *   4. no page errors.
 * Each step also watches every frame of the jog for a layer that blinks off
 * and on, and for plain body frames, by facing.
 *
 *   node tools/qa/mp/run.mjs rebuildjog
 *   BT_RJ_PLAIN=1   no trouser pattern (every facing from the one picture)
 *   BT_RJ_SHOTS=1   a picture of the bro at each facing of each step
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const FACINGS = {
  south: ['s'], southeast: ['s', 'd'], east: ['d'], northeast: ['w', 'd'],
  north: ['w'], northwest: ['w', 'a'], west: ['a'], southwest: ['s', 'a'],
};
const LAYERS = { body: '_spriteBody', shirt: '_gearShirt', chest: '_gearChest', legs: '_gearLegs',
  hair: '_hairSprite', hat: '_headwearSprite', eye: '_eyewearSprite', head: '_bodyHead' };
/* drawn off by design: the glasses have no north picture; the head overlay
   exists only for the facings with a head sheet (jog-*-head.png: south, east,
   north, southwest and their mirrors); the shirt is under the plate */
const MAY_BE_OFF = new Set(['eye/north', 'shirt/*', 'head/*']);
const mayBeOff = (k, dir) => MAY_BE_OFF.has(k + '/' + dir) || MAY_BE_OFF.has(k + '/*');
const LOOK = { hair: 'wavy', hat: 'bandana-2', eye: 'golden-glasses' };

const INIT = (look, plain) => {
  try {
    if (!localStorage.getItem('qa-rj-seeded')) {
      localStorage.setItem('bt-hair', look.hair);
      localStorage.setItem('bt-headwear', look.hat);
      localStorage.setItem('bt-eyewear', look.eye);
      if (!plain) localStorage.setItem('bt-pantspat', 'check:3');
      localStorage.setItem('qa-rj-seeded', '1');
    }
  } catch (e) { /* reported below */ }
};

/* every layer now: shown, its picture's opaque pixels read back off the chip */
const layersNow = (P) => P.page.evaluate((LAYERS) => {
  const R = window._pixiRenderer;
  const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
  if (!d) return null;
  const r = R.app.renderer;
  const shown = (s) => { for (let c = s; c; c = c.parent) { if (!c.visible || c.renderable === false) return false; if (c.parent == null) return true; } return true; };
  const masked = new Set((window.__btMaskedSources ? window.__btMaskedSources() : []).map((x) => x.uid));
  const out = { pose: d._animPose, dir: d._animDir, flip: !!(d.scale && d.scale.x < 0), fs: !!d._fullsetOn };
  for (const [k, prop] of Object.entries(LAYERS)) {
    const s = d[prop];
    if (!s) { out[k] = null; continue; }
    const t = s.texture, src = t && t.source;
    const o = { vis: !!(s.visible && shown(s) && s.alpha > 0.02), uid: src ? src.uid : null,
      dead: !!(t && t.destroyed) || !!(src && src.destroyed) };
    if (k === 'body') o.masked = !!(src && masked.has(src.uid));
    const res = src && src.resource;
    o.cv = res ? (res.tagName === 'IMG' ? 'img' : (typeof res.getContext === 'function' ? (res.width > 0 ? 'canvas' : 'emptied') : 'other')) : null;
    if (o.vis && t && src && !o.dead && t !== t.constructor.EMPTY && t.width > 2) {
      try {
        const probe = new s.constructor(t);
        const px = r.extract.pixels({ target: probe, clearColor: [0, 0, 0, 0] });
        probe.destroy();
        const a = px.pixels || px;
        let op = 0;
        for (let i = 3; i < a.length; i += 4) if (a[i] > 40) op++;
        o.px = op;
      } catch (e) { o.err = String(e && e.message || e).slice(0, 80); }
    }
    out[k] = o;
  }
  return out;
}, LAYERS);

/* watch every frame: a layer that goes off and on again, the plain body frames */
const startWatch = (P) => P.page.evaluate((LAYERS) => {
  const t0 = performance.now();
  const hist = Object.create(null);
  for (const k of Object.keys(LAYERS)) hist[k] = [];
  const plainBy = Object.create(null);
  const bw = () => (window.__btBakeWorker ? window.__btBakeWorker().local : null);
  let lastPlain = (bw() || {}).plain || 0;
  const shown = (s) => { for (let c = s; c; c = c.parent) { if (!c.visible || c.renderable === false) return false; if (c.parent == null) return true; } return true; };
  window.__qaRjStop = false; window.__qaRj = null;
  let frames = 0;
  const tick = () => {
    const R = window._pixiRenderer;
    const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
    const t = Math.round(performance.now() - t0);
    if (d) {
      frames++;
      for (const [k, prop] of Object.entries(LAYERS)) {
        const s = d[prop];
        const on = !!(s && s.visible && shown(s) && s.alpha > 0.02 && s.texture && s.texture.width > 2);
        const h = hist[k];
        const last = h[h.length - 1];
        if (!last || last.on !== on) h.push({ t, on, dir: d._animDir, pose: d._animPose });
      }
      const b = bw();
      if (b && b.plain !== lastPlain) { const key = d._animPose + '/' + d._animDir; plainBy[key] = (plainBy[key] || 0) + (b.plain - lastPlain); lastPlain = b.plain; }
    }
    if (!window.__qaRjStop) { requestAnimationFrame(tick); return; }
    const out = { frames, ms: t, plainBy, blinks: Object.create(null) };
    for (const k of Object.keys(LAYERS)) {
      const h = hist[k]; const ev = [];
      for (let i = 2; i < h.length; i++) {
        const a = h[i - 2], b = h[i - 1], c = h[i];
        if (a.on && !b.on && c.on && c.t - a.t < 400 && b.pose === 'jog') ev.push(`${b.pose}/${b.dir}@${b.t}`);
      }
      if (ev.length) out.blinks[k] = ev.slice(0, 8);
    }
    window.__qaRj = out;
  };
  requestAnimationFrame(tick);
  return true;
}, LAYERS);
const stopWatch = async (P) => {
  await P.page.evaluate(() => { window.__qaRjStop = true; });
  return H.waitFor(P, () => window.__qaRj, (v) => !!v, { timeout: 10000, label: 'the watch stops' });
};

async function shot(P, name) {
  if (!process.env.BT_RJ_SHOTS) return;
  const at = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const cv = document.querySelector('canvas');
    const rc = cv.getBoundingClientRect();
    return { x: rc.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: rc.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
  });
  await P.page.screenshot({ path: `tools/qa/mp/out/rebuildjog-${name}.png`, clip: { x: Math.max(0, at.x - 70), y: Math.max(0, at.y - 95), width: 140, height: 140 } }).catch(() => {});
}

/* jog each way in turn, every layer read while jogging */
async function sweep(P, label) {
  const bad = [];
  const rows = [];
  await startWatch(P);
  for (const [dir, keys] of Object.entries(FACINGS)) {
    for (const k of keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(900);
    let p = await layersNow(P).catch((e) => ({ err: String(e) }));
    await shot(P, `${label.replace(/\W+/g, '-')}-${dir}`);
    /* a second look a moment later: a layer still loading has had its chance */
    await P.page.waitForTimeout(500);
    const p2 = await layersNow(P).catch(() => null);
    for (const k of keys) await P.page.keyboard.up(k);
    await P.page.waitForTimeout(250);
    /* a matched set jogs as ONE painted figure (the knight, _fullsetFrame) in
       every facing but northeast and its mirror northwest: the figure is the
       body sprite, the plate and greaves layers are off; northeast and
       northwest are the body baked under the armour (masked) with the layers
       over it */
    const fs = !!(p && p.fs);
    const row = { dir, at: p && p.dir, flip: p && p.flip, fs };
    for (const k of Object.keys(LAYERS)) {
      const a = p && p[k], b = p2 && p2[k];
      const drawn = (o) => !!(o && o.vis && !o.dead && o.px > 0);
      row[k] = a ? (drawn(a) ? a.px : (a.vis ? 'BLANK' : 'off')) + (k === 'body' ? (fs ? ' figure' : (a.masked ? ' masked' : ' PLAIN')) : '') + ` ${a.cv || ''}` : '-';
      if (mayBeOff(k, dir)) continue;
      if (fs && (k === 'chest' || k === 'legs')) continue;
      if (!drawn(a) || !drawn(b)) bad.push(`${dir} ${k}: first ${JSON.stringify(a)} then ${JSON.stringify(b)}`);
      if (k === 'body' && !fs && a && b && !a.masked && !b.masked) bad.push(`${dir} body drawn PLAIN under the armour (both looks)`);
    }
    rows.push(row);
  }
  const w = await stopWatch(P);
  console.log(`    [${label}] ${bad.length ? bad.length + ' wrong' : 'every layer drawn every way'}; ${w.frames} frames watched`);
  for (const r of rows) console.log(`      ${r.dir.padEnd(9)} (${r.at}${r.flip ? ' flipped' : ''}${r.fs ? ', figure' : ''}) ` + Object.keys(LAYERS).map((k) => `${k} ${r[k]}`).join(' | '));
  if (Object.keys(w.plainBy).length) console.log('      plain body frames by facing: ' + JSON.stringify(w.plainBy));
  if (Object.keys(w.blinks).length) console.log('      blinks: ' + JSON.stringify(w.blinks));
  for (const b of bad.slice(0, 12)) console.log('      ! ' + b);
  return { bad, rows, watch: w };
}

/* the canvases emptied, as Safari empties them (mp-tabwipe's walk) */
const WIPE = () => {
  const out = new Set();
  try { for (const s of (window.__btGpuTexSources ? window.__btGpuTexSources() : [])) if (s) out.add(s); } catch (e) { /* none */ }
  const R = window._pixiRenderer;
  const walk = (c) => { if (!c) return; if (c.texture && c.texture.source) out.add(c.texture.source); for (const k of (c.children || [])) walk(k); };
  try { walk(R && R.app && R.app.stage); } catch (e) { /* none */ }
  try { for (const s of (window.__btMaskedSources ? window.__btMaskedSources() : [])) out.add(s); } catch (e) { /* none */ }
  const r = R && R.app && R.app.renderer;
  let canvases = 0, onChip = 0;
  const seen = new Set();
  for (const s of out) {
    const cv = s && s.resource;
    if (!cv || seen.has(cv) || typeof cv.getContext !== 'function' || !(cv.width > 0) || !(cv.height > 0)) continue;
    if (cv === (r && r.canvas)) continue;
    let g = null;
    try { g = cv.getContext('2d'); } catch (e) { g = null; }
    if (!g) continue;
    seen.add(cv);
    canvases++;
    if (s._gpuData && r && s._gpuData[r.uid]) onChip++;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.restore();
  }
  return { canvases, onChip };
};

/* the graphics chip reset as a black screen resets it: the game's own way back
   (crashTrap's contextlost, the rebuild 2.5 s on) */
async function blackScreen(P, label) {
  await P.page.evaluate(() => { window.__btLastGlRebuild = 0; window.__qaOldR = window._pixiRenderer; });
  const lost = await P.page.evaluate(() => {
    const R = window._pixiRenderer;
    const gl = R && R.app && R.app.renderer && R.app.renderer.gl;
    const ext = gl && gl.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    return true;
  });
  const navigated = P.page.waitForEvent('framenavigated', { timeout: 15000 }).then(() => true).catch(() => false);
  const back = await H.waitFor(P, () => {
    const R = window._pixiRenderer;
    return { fresh: !!(R && R !== window.__qaOldR && R.playerDisplayRaw && R.playerDisplayRaw()) };
  }, (v) => v && v.fresh, { timeout: 60000, label: label + ': the renderer rebuilt' }).catch(() => null);
  const reloaded = await Promise.race([navigated, new Promise((r) => setTimeout(() => r(false), 500))]);
  return { lost, back: !!back, reloaded };
}

async function inWheel(P) {
  for (let i = 0; i < 160; i++) {
    if ((await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel') return true;
    await P.page.waitForTimeout(500);
  }
  return false;
}

async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) { await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {}); continue; }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it']) {
      const btn = P.page.locator('button:visible', { hasText: t }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) return;
  }
}

async function bakesSettled(P, maxMs) {
  let last = -1, same = 0, s = null;
  for (let t = 0; t < maxMs; t += 500) {
    s = await P.page.evaluate(() => {
      const st = window.__btMaskedStats ? window.__btMaskedStats() : null;
      const bw = window.__btBakeWorker ? window.__btBakeWorker() : null;
      const cov = window.__btMaskedCoverage ? window.__btMaskedCoverage() : null;
      return { n: st ? st.frames : 0, queued: bw ? bw.queued : 0, busy: bw ? bw.busy : 0, have: cov && cov.have, want: cov && cov.want, missing: cov ? cov.missing.slice(0, 6) : [] };
    });
    same = (s.n === last && !s.queued && !s.busy) ? same + 1 : 0;
    last = s.n;
    if (same >= 4 && s.n > 0 && s.have === s.want) break;
    await P.page.waitForTimeout(500);
  }
  return s;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const plain = !!process.env.BT_RJ_PLAIN;
  const P = await H.newPlayer(browser, {
    name: 'Rebuildbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel',
    init: `(${INIT.toString()})(${JSON.stringify(LOOK)}, ${plain})`,
  });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  let stop = null;
  try {
    await H.enterWorld(P);
    rec.ok('in the world (guard)', await inWheel(P));
    stop = H.keepAlive(P);
    await P.page.waitForTimeout(1500);
    const myId = await H.readState(P, (S) => S.myId);

    /* a copper torso and copper greaves, worn the real way (mp-armourflash's) */
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' });
    let pieces = null;
    for (let i = 0; i < 40 && !pieces; i++) {
      pieces = await P.page.evaluate(() => {
        const R = window._gameState.current.rpg || {};
        const t = (R.armorStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        const l = (R.legsStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        return t && l ? { t: t.gid, l: l.gid } : null;
      });
      if (!pieces) await P.page.waitForTimeout(300);
    }
    if (pieces) {
      await P.page.evaluate((p) => {
        const S = window._gameState.current;
        const R = S.rpg;
        const ti = (R.armorStash || []).findIndex((x) => x && x.gid === p.t);
        const li = (R.legsStash || []).findIndex((x) => x && x.gid === p.l);
        if (ti >= 0) { R.armor = R.armorStash[ti]; R.armorStash.splice(ti, 1); }
        if (li >= 0) { R.legsArmor = R.legsStash[li]; R.legsStash.splice(li, 1); }
        if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
        S.channel.send({ type: 'stats_update', payload: { armorRef: p.t, legsArmorRef: p.l } });
      }, pieces);
    }
    const worn = await H.waitFor(P, () => ({
      chest: window.__btGetGear ? window.__btGetGear('chest') : null, legs: window.__btGetGear ? window.__btGetGear('legs') : null,
    }), (v) => v && v.chest === 'copperplate' && v.legs === 'coppergreaves', { timeout: 15000, label: 'the armour worn' }).catch(() => null);
    const baked = await bakesSettled(P, 240000);
    const look = await P.page.evaluate(() => { const r = window.__btCharRecord && window.__btCharRecord(); return r && r.look ? { hr: r.look.hr, hw: r.look.hw, ew: r.look.ew, pp: r.look.pp || r.look.pantsPattern || null } : null; });
    console.log('    worn:', JSON.stringify(worn), 'bakes:', JSON.stringify(baked), 'look:', JSON.stringify(look));
    rec.ok(`dressed: copper torso and greaves worn, every jog frame baked under them (${baked && baked.have} of ${baked && baked.want}) (guard)`,
      !!worn && !!baked && baked.want > 50 && baked.have === baked.want, { worn, baked });

    await closeTalk(P);
    /* off the square, clear of the Mayor */
    await P.page.keyboard.down('s'); await P.page.waitForTimeout(1200); await P.page.keyboard.up('s');
    await closeTalk(P);

    /* ── 1. before ── */
    const s1 = await sweep(P, 'before');
    rec.ok(`1. (guard) before anything happens, every layer is drawn jogging every way (${s1.bad.length} wrong)`, s1.bad.length === 0, s1.bad.slice(0, 8));

    /* ── 2. a black screen: the context lost, the game's own rebuild ── */
    const b2 = await blackScreen(P, 'step 2');
    console.log('    black screen:', JSON.stringify(b2));
    await P.page.waitForTimeout(2500);
    await closeTalk(P);
    const s2 = await sweep(P, 'after a black screen');
    rec.ok(`2. after a black screen (the context lost, the game's own rebuild: ${b2.back ? 'rebuilt' : 'NOT rebuilt'}), every layer is drawn jogging every way (${s2.bad.length} wrong)`,
      b2.lost && b2.back && s2.bad.length === 0, s2.bad.slice(0, 8));
    /* and once more: a facing drawn plain once may be baked by now */
    const s2b = await sweep(P, 'after a black screen, again');
    rec.ok(`2b. ...and the second time round too (${s2b.bad.length} wrong)`, s2b.bad.length === 0, s2b.bad.slice(0, 8));

    /* ── 3. memory pressure: the canvases emptied, then the black screen ──
       Safari may empty the page's canvases when memory runs short (TRAPS
       §250), the same pressure that resets the graphics chip.  A rebuild
       cannot give those pictures back (it uploads them again FROM the
       canvases), so the game must notice at the rebuild and reload into the
       same spot (BroTown _rebuildRenderer, v2.3.3701). */
    const pre3 = await P.page.evaluate(() => {
      let rl = null; try { rl = JSON.parse(sessionStorage.getItem('bt-reloads') || '[]').map((t) => Math.round((Date.now() - t) / 1000) + ' s ago'); } catch (e) { rl = 'unreadable'; }
      window.__qaRjT3 = Date.now();
      try { sessionStorage.setItem('qa-rj-t3', String(window.__qaRjT3)); } catch (e) { /* none */ }
      const S = window._gameState && window._gameState.current;
      return { t3: window.__qaRjT3, recoveryReload: typeof window.__btRecoveryReload, reloads: rl,
        spot: S && S.player ? { x: Math.round(S.player.x), y: Math.round(S.player.y), zone: S.currentZone } : null };
    });
    console.log('    before the wipe: ' + JSON.stringify(pre3));
    const w = await P.page.evaluate(WIPE);
    console.log('    wipe:', JSON.stringify(w));
    const lostAt = Date.now();
    const navigated = P.page.waitForEvent('framenavigated', { timeout: 40000 }).then(() => Date.now()).catch(() => 0);
    const lost3 = await P.page.evaluate(() => {
      window.__btLastGlRebuild = 0;
      const R = window._pixiRenderer;
      const gl = R && R.app && R.app.renderer && R.app.renderer.gl;
      const ext = gl && gl.getExtension('WEBGL_lose_context');
      if (!ext) return false;
      ext.loseContext();
      return true;
    });
    const navAt = await navigated;
    console.log(`    black screen: lost ${lost3}, ${navAt ? 'the page reloaded ' + ((navAt - lostAt) / 1000).toFixed(1) + ' s after it' : 'no reload in 40 s'}`);
    let back3 = null;
    if (navAt) {
      back3 = await H.waitFor(P, (S) => (S && !S._zoneLoading && S.currentZone === 'wheel' && (!window.__btAvatarHold || window.__btAvatarHold.liftedAt) && window._pixiRenderer && window._pixiRenderer.playerDisplayRaw && window._pixiRenderer.playerDisplayRaw() ? { x: Math.round(S.player.x), y: Math.round(S.player.y) } : null),
        (v) => !!(v && v.x != null), { timeout: 240000, label: 'back in the world after the reload' }).catch(() => null);
      const baked3 = await bakesSettled(P, 240000);
      console.log('    back in the world: ' + JSON.stringify(back3) + ', bakes ' + JSON.stringify(baked3));
    }
    await P.page.waitForTimeout(2500);
    await closeTalk(P);
    const s3 = await sweep(P, 'after the canvases emptied and a black screen');
    const log = await P.page.evaluate(() => {
      let t3 = 0; try { t3 = +sessionStorage.getItem('qa-rj-t3') || 0; } catch (e) { /* none */ }
      try { return JSON.parse(localStorage.getItem('bt-crashlog') || '[]').filter((e) => !t3 || Date.parse(e.t) >= t3 - 1000).map((e) => ({ at: (e.t || '').slice(11, 19), kind: e.kind, msg: String(e.msg).slice(0, 110) })); } catch (e) { return []; }
    });
    console.log('    crash log since the wipe:\n      ' + log.map((e) => `${e.at} ${e.kind}: ${e.msg}`).join('\n      '));
    const purgeAt = log.findIndex((e) => e.kind === 'canvas-purge');
    const caught = purgeAt >= 0 && /^rebuild \(/.test(log[purgeAt].msg);
    const rebuiltFirst = log.some((e, i) => e.kind === 'gl-rebuild' && (purgeAt < 0 || i < purgeAt));
    rec.ok(`3. with the canvases emptied, the black screen's rebuild notices and reloads the page instead (${caught ? 'caught at the rebuild' : purgeAt >= 0 ? 'caught later: ' + log[purgeAt].msg.slice(0, 40) : 'not caught'}${rebuiltFirst ? ', after a rebuild of blanks' : ''}; ${navAt ? ((navAt - lostAt) / 1000).toFixed(1) + ' s' : 'no reload'})`,
      w.canvases > 20 && lost3 && caught && !rebuiltFirst && !!navAt && navAt - lostAt <= 15000, log);
    const moved3 = back3 && pre3.spot ? Math.round(Math.hypot(back3.x - pre3.spot.x, back3.y - pre3.spot.y)) : null;
    rec.ok(`3b. ...back on the same spot (${moved3 == null ? '?' : moved3} px from it), every layer drawn jogging every way (${s3.bad.length} wrong)`,
      !!back3 && moved3 != null && moved3 <= 64 && s3.bad.length === 0, { spot: pre3.spot, back: back3, bad: s3.bad.slice(0, 8) });
    rec.ok('4. no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    if (stop) stop();
  }
}
