/* ═══ A FIGHT WITH THE FIRE GOBLINS, THE SCREEN WATCHED (v2.3.3017) ═══
 *
 * Owner, 2026-10-04: "I like it but I was fighting fire goblins and my screen
 * went black."
 *
 * A phone in the Wheel walks out to the Flame Fields and fights its fire
 * goblins through the real controls -- the stick (keys), the attack disc, the
 * jump button -- taking their burns and their burning ground, until it dies,
 * comes back, walks out again and fights on.  All the while the page itself
 * records, every half second, what the screen shows: how much of the world is
 * lit (the black-screen watchdog's own 32 x 18 sample, BroTown.jsx
 * _sampleLit), what lies over the middle of it, the zone, any loading veil,
 * the renderer's error streak, and what the textures cost; and every few
 * seconds a screenshot is measured from outside, page and all.
 *
 * Then: was the screen ever black, for how long, and what was in front of it?
 * Pictures of every dark moment: tools/qa/mp/out/firefight-*.png, and the
 * whole record in firefight-log.json.
 *
 *   FF_MS=180000 (how long to fight), FF_HOME=ember (which land's monsters)
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const FIGHT_MS = +(process.env.FF_MS || 180000);
const HOME = process.env.FF_HOME || 'ember';

/* the page's own recorder: every 500 ms, what the screen shows */
const SAMPLER = () => {
  if (window.__ffOn) return;
  window.__ffOn = true;
  window.__ff = [];
  const sample = () => {
    const cv = document.querySelector('canvas');
    if (!cv || !cv.width) return -1;
    try {
      const g = cv.getContext('webgl2') || cv.getContext('webgl');
      if (g && g.isContextLost && g.isContextLost()) return -2;
    } catch (e) { /* fall through */ }
    try {
      const c2 = document.createElement('canvas');
      c2.width = 32; c2.height = 18;
      const g2 = c2.getContext('2d');
      g2.drawImage(cv, 0, 0, 32, 18);
      const d = g2.getImageData(0, 0, 32, 18).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 30) lit++;
      return Math.round(100 * lit / (32 * 18));
    } catch (e) { return -3; }
  };
  /* sampled in an animation frame: a callback queued from here runs after
     the game's own frame callback (queued a frame earlier), so it reads the
     frame just drawn -- read from a timer, a WebGL canvas without
     preserveDrawingBuffer is already cleared and every sample says black */
  setInterval(() => requestAnimationFrame(() => {
    try {
      const S = window._gameState && window._gameState.current;
      if (!S) return;
      const el = document.elementFromPoint(innerWidth / 2, innerHeight * 0.42);
      const top = el ? (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : '')) : null;
      const tex = window.__btTex ? window.__btTex(true) : null;
      const veil = document.querySelector('.bt-zone-loading');
      const R = S.rpg || {};
      window.__ff.push({
        t: Date.now(), lit: sample(), zone: S.currentZone, loading: !!S._zoneLoading, net: !!S._netHold, townArt: !!S._townArtHold,
        veil: !!veil, top, dying: !!S._dying, hp: R.hp, maxHp: R.maxHp, x: S.player ? Math.round(S.player.x) : null, y: S.player ? Math.round(S.player.y) : null,
        mb: tex ? Math.round(tex.mb) : null, mons: (S.monsters || []).length, err: !!window.__pixiUpdateErrLogged, streak: S.__pixiErrStreak || 0,
        wd: S.__wdDark || 0, air: !!S._jump, swim: !!(S._swim && S._swim.on), burn: !!(S._elemStatus && S._elemStatus.burn),
        cam: S.camera ? [Math.round(S.camera.x), Math.round(S.camera.y)] : null,
      });
      if (window.__ff.length > 3000) window.__ff.shift();
    } catch (e) { window.__ffErr = String(e && e.message || e); }
  }), 500);
};

/* the nearest living monster of HOME, and where the player is */
const nearest = (P) => P.page.evaluate((home) => {
  const S = window._gameState.current;
  if (!S.player) return null;
  const ms = (S.monsters || []).filter((m) => m && m.home === home && m.alive !== false && m.hp > 0);
  ms.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
  const m = ms[0];
  return { px: S.player.x, py: S.player.y, zone: S.currentZone, loading: !!(S._zoneLoading || S._townArtHold || S._netHold), dying: !!S._dying, hp: S.rpg && S.rpg.hp,
    m: m ? { id: m.id, x: m.x, y: m.y, d: Math.hypot(m.x - S.player.x, m.y - S.player.y) } : null, n: ms.length };
}, HOME);

/* a finger on an element: touchstart, then touchend */
const tapSel = (P, sel, id, fx = 0.5, fy = 0.5) => P.page.evaluate(({ sel, id, fx, fy }) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const b = el.getBoundingClientRect(), x = b.left + b.width * fx, y = b.top + b.height * fy;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart'));
  el.dispatchEvent(mk('touchend'));
  return true;
}, { sel, id, fx, fy });

/* hold the keys that walk toward (dx, dy) for ms */
async function stepToward(P, dx, dy, ms) {
  const keys = [];
  if (dy < -12) keys.push('w'); else if (dy > 12) keys.push('s');
  if (dx < -12) keys.push('a'); else if (dx > 12) keys.push('d');
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  for (const k of keys) await P.page.keyboard.up(k);
}

/* the mean brightness (0-255) of a screenshot, and the share of near-black pixels */
async function shotLuma(P) {
  const buf = await P.page.screenshot({ type: 'png' });
  const img = H.decodePng(buf);
  let sum = 0, black = 0, n = 0;
  const { width, height, data } = img;
  const ch = data.length / (width * height);
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const i = (y * width + x) * ch;
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += l; n++;
      if (l < 12) black++;
    }
  }
  return { buf, luma: +(sum / n).toFixed(1), black: Math.round(100 * black / n) };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Emberbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push({ t: Date.now(), kind: 'pageerror', m: String((e && e.stack) || (e && e.message) || e).slice(0, 600) }));
  P.page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || /threw|bt-crash|watchdog|contextlost|context lost|gl-rebuild/i.test(t)) errors.push({ t: Date.now(), kind: m.type(), m: t.slice(0, 600) });
  });
  const shots = [];
  try {
    await body({ P, wsPort, rec, OUT, errors, shots });
  } finally {
    const ff = await P.page.evaluate(() => window.__ff || []).catch(() => []);
    writeFileSync(join(OUT, 'firefight-log.json'), JSON.stringify({ errors, shots, ff }, null, 1));
    await P.ctx.close().catch(() => {});
  }
}

async function body({ P, wsPort, rec, OUT, errors, shots }) {
  await H.enterWorld(P);
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
    { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
  rec.ok('in the Wheel (guard)', !!inWheel, inWheel);
  if (!inWheel) return;
  const myId = await H.readState(P, (S) => S.myId);

  /* the test panel's "Finish all quests": armed by Mayor Bro, the commons gate open */
  const holdTitle = (ms) => P.page.evaluate(async (hold) => {
    const el = document.querySelector('.bt-zone-header__title');
    if (!el) return 'no title element';
    const r = el.getBoundingClientRect();
    const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    await new Promise((res) => setTimeout(res, hold));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    return 'ok';
  }, ms);
  const tapText = (t) => P.page.evaluate((t) => {
    const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
    if (!b) return false;
    b.click();
    return true;
  }, t);
  await P.page.waitForTimeout(2000);
  await holdTitle(1500);
  await P.page.waitForTimeout(900);
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tapText('Save key on this device');
  await P.page.waitForTimeout(1500);
  await tapText('Finish all quests');
  await P.page.waitForTimeout(2500);
  await tapText('Close');
  await P.page.waitForTimeout(800);
  const kit = await H.readState(P, (S) => ({ weapon: S.rpg && S.rpg.weapon && S.rpg.weapon.type, level: S.rpg && S.rpg.level, tut1: !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1) }));
  console.log('    kit: ' + JSON.stringify(kit));

  await P.page.evaluate(SAMPLER);
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const at = WHEEL_SPAWNS[HOME] && WHEEL_SPAWNS[HOME].points[0];
  rec.ok(`the ${HOME} land's monsters have a place (guard)`, !!at, at);
  if (!at) return;

  /* walk out (untouchable on the way: the fight is the test, not the road) */
  const goOut = async () => {
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 3 });
    await H.hopTo(P, at[0] + 200, at[1] + 200, { tries: 220 });
    await P.page.waitForTimeout(800);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: false });
  };
  await goOut();

  const t0 = Date.now();
  let lastJump = 0, lastShot = 0, deaths = 0, swings = 0, jumps = 0, wasDying = false, darkShots = 0, outings = 1;
  let lastPick = null;
  while (Date.now() - t0 < FIGHT_MS) {
    const s = await nearest(P).catch(() => null);
    const now = Date.now();
    /* a screenshot every ~3 s, measured; kept when dark */
    if (now - lastShot > 3000) {
      lastShot = now;
      const L = await shotLuma(P).catch(() => null);
      /* the veil, read right after the picture (the state above was read
         before it: a respawn's veil can go up in between) */
      const veil = await P.page.evaluate(() => !!document.querySelector('.bt-zone-loading')).catch(() => false);
      if (L) {
        const row = { t: now, luma: L.luma, black: L.black, zone: s && s.zone, loading: s && s.loading, dying: s && s.dying, hp: s && s.hp, veil };
        shots.push(row);
        if (L.luma < 25 || L.black > 70) {
          darkShots++;
          if (darkShots <= 12) writeFileSync(join(OUT, `firefight-dark-${darkShots}.png`), L.buf);
          console.log('    DARK screenshot: ' + JSON.stringify(row));
        }
        if (shots.length % 20 === 1) writeFileSync(join(OUT, `firefight-${shots.length}.png`), L.buf);
      }
    }
    if (!s) { await P.page.waitForTimeout(400); continue; }
    if (s.dying || (typeof s.hp === 'number' && s.hp <= 0)) {
      if (!wasDying) { deaths++; wasDying = true; console.log(`    died (${deaths}) at ${Math.round((now - t0) / 1000)} s`); }
      await P.page.waitForTimeout(500);
      continue;
    }
    if (wasDying) {
      /* back on our feet: wait to be in the Wheel again, then out to the fight */
      const back = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
        { timeout: 60000, label: 'back in the Wheel' }).catch(() => null);
      console.log(`    respawned -> ${JSON.stringify(back)} at ${Math.round((Date.now() - t0) / 1000)} s`);
      wasDying = false;
      if (back && Date.now() - t0 < FIGHT_MS - 20000) { outings++; await goOut(); }
      continue;
    }
    if (s.zone !== 'wheel' || s.loading) { await P.page.waitForTimeout(400); continue; }
    if (!s.m) { await P.page.waitForTimeout(500); continue; }
    if (lastPick !== s.m.id) lastPick = s.m.id;
    /* a jump now and then, as a player does in a fight */
    if (now - lastJump > 1700) {
      lastJump = now;
      if (await tapSel(P, '[data-jump]', 41)) jumps++;
    }
    if (s.m.d > 70) {
      await stepToward(P, s.m.x - s.px, s.m.y - s.py, Math.min(450, 60 + s.m.d * 1.2));
    } else {
      if (await tapSel(P, '[data-joyzone="R"]', 52, 0.5, 0.4)) swings++;
      await P.page.waitForTimeout(220);
    }
  }
  /* let the last of it settle */
  await P.page.waitForTimeout(1500);
  const ff = await P.page.evaluate(() => window.__ff || []);
  const ffErr = await P.page.evaluate(() => window.__ffErr || null);

  /* dark spells: consecutive samples under 1% lit (the watchdog's line) */
  const spells = [];
  let cur = null;
  for (const r of ff) {
    const dark = r.lit >= 0 ? r.lit < 1 : r.lit === -2;
    if (dark) {
      if (!cur) cur = { from: r.t, to: r.t, n: 0, rows: [] };
      cur.to = r.t; cur.n++;
      if (cur.rows.length < 6) cur.rows.push(r);
    } else if (cur) { spells.push(cur); cur = null; }
  }
  if (cur) spells.push(cur);
  const veiled = (sp) => sp.rows.every((r) => r.loading || r.veil || r.net || r.townArt || r.dying);
  const unexplained = spells.filter((sp) => !veiled(sp));
  const longest = spells.reduce((a, sp) => Math.max(a, sp.to - sp.from), 0);
  const mbs = ff.map((r) => r.mb).filter((v) => typeof v === 'number');
  console.log('    fight: ' + JSON.stringify({ secs: Math.round((Date.now() - t0) / 1000), swings, jumps, deaths, outings, samples: ff.length, darkShots,
    spells: spells.map((sp) => ({ s: Math.round((sp.from - t0) / 1000), ms: sp.to - sp.from, first: sp.rows[0] })),
    mb: mbs.length ? [Math.min(...mbs), Math.max(...mbs)] : null, ffErr }));
  /* (an unarmed level-3 character mostly chases and dies: the fight is the
     monsters' blows, burns and burning ground, and the deaths' way back) */
  rec.ok(`a fight with the ${HOME} land's monsters went on (${swings} swings, ${jumps} jumps, ${deaths} deaths, ${outings} outings)`, swings >= 5 && jumps >= 10, { swings, jumps, deaths });
  rec.ok(`the world was never dark but behind a loading veil or a death (${spells.length} dark spells, ${unexplained.length} unexplained, the longest ${longest} ms)`,
    unexplained.length === 0, unexplained.slice(0, 4));
  /* a death's way back is dark by design (the respawn's veils); anything else is not */
  const darkRows = shots.filter((r) => r.luma < 25 || r.black > 70);
  /* (today's town is only ever the way back: a death's respawn passes through it) */
  const darkOdd = darkRows.filter((r) => !r.dying && !r.loading && !r.veil && r.zone === 'wheel');
  rec.ok(`no screenshot came out black but on a death's way back (${darkRows.length} of ${shots.length} dark, ${darkOdd.length} of them otherwise)`, darkOdd.length === 0, darkRows.slice(0, 6));
  const renderErr = ff.some((r) => r.err || r.streak > 0);
  rec.ok('the renderer never threw', !renderErr, ff.filter((r) => r.err || r.streak).slice(0, 3));
  rec.ok(`no page errors (${errors.length} error lines)`, errors.filter((e) => e.kind === 'pageerror').length === 0, errors.slice(0, 8));
}
