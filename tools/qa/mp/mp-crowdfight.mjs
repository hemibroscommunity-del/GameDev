/* ═══ v2.3.3754: WHAT A CROWDED FIGHT COSTS A PHONE'S MEMORY ═══
 *
 * The owner's black screens are iPhone Safari running out of memory (about
 * 250 MB) in big battles.  mp-battlemem fights alone; mp-crowdbots counts a
 * crowd's frame time, every bot in ONE look.  This stands a phone (390 x 844,
 * dpr 3, the Wheel) among 10, then 20, then 30 load bots (tools/qa/load/
 * bots.mjs), EACH IN A DIFFERENT LOOK (LOOKS below: skin, trousers, shoes,
 * eyes, hair and its colour from the creator's own catalogs), twice:
 *
 *   1. town:  BroTown's square, the bots walking round the phone;
 *   2. fight: the Flame Fields' first stretch, the bots fighting its monsters
 *             (the client's own monster_damage, and the swing or arrow a
 *             phone shows the others: `relays`, half of them archers with a
 *             bow in their look), the phone in god mode swinging at the
 *             nearest monster too.
 *
 * At each step, after the page knows (nearly) all the bots:
 *   - the page's memory, memprobe's ruler (mp-membudget's): the asset cache
 *     (__btTex), the graphics chip (__btGpuTex, as it is and as Pixi's
 *     collector leaves it a minute later), the 2D canvases, decoded sound, the
 *     heap and its buffers -- and the chip by kind, and its biggest labels;
 *   - draw calls and GL calls a frame, counted on the renderer's own context
 *     (TRAPS §225: judged by those, never by this box's fps);
 *   - the voices: the most sounds playing at once and the most starting in
 *     one 50 ms window (__btVoiceCap; counted on a QA page whether or not
 *     the cap is on);
 *   - the crowd cap: the players drawn, hidden far off and hidden past the
 *     cap (crowdCap.js);
 *   - the look palette, where the page has one (rendering/lookPalette.js,
 *     docs/specs/look-palette.md): its rows in use and rowsFull (must stay 0:
 *     one row a distinct look).
 *
 * Not in the per-PR set: it runs 30 bots and a worker beside a page (minutes).
 *
 *   BT_NO_TRACE=1 node tools/qa/mp/run.mjs crowdfight             # today's way
 *   BT_NO_TRACE=1 BT_CF_QUERY=lookpalette=0 node tools/qa/mp/run.mjs crowdfight
 *   BT_CF_STEPS=10,30      the crowd steps (10,20,30)
 *   BT_CF_PLACES=fight     town, fight or both (town,fight)
 *   BT_CF_SAMPLE_MS=ms     the frame and voice window at each step (6000)
 *   BT_CF_QUERY=x          a URL switch on the page (?lookpalette, ?voicecap...)
 * BT_NO_TRACE=1 as mp-crowdbots (TRAPS §168).  Results:
 * tools/qa/mp/out/crowdfight[-<query>].json.
 */
import * as H from './harness.mjs';
import { fork } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MEM_INIT, memSampler } from './memprobe.mjs';

const ROOM = 'crowdfight';
const PHONE = { width: 390, height: 844 };
const STEPS = (process.env.BT_CF_STEPS || '10,20,30').split(',').map(Number).filter((n) => n >= 0);
const PLACES = (process.env.BT_CF_PLACES || 'town,fight').split(',').filter((p) => p === 'town' || p === 'fight');
const SAMPLE_MS = +(process.env.BT_CF_SAMPLE_MS || 6000);
const QUERY = process.env.BT_CF_QUERY || '';

/* 30 looks, all different: the creator's catalogs (playerSkins.js SKIN_ /
   PANTS_ / SHOES_CATALOG, traits/eyeColorCatalog, hairCatalog,
   hairColorCatalog), on top of a real phone's look (track-sample.json).  An
   odd bot (k) is an archer when it relays (bots.mjs), so it holds a bow. */
const SKINS = ['alabaster', 'porcelain', 'ivory', 'rosy', 'pale', 'fair', 'sand', 'honey', 'tan', 'olive', 'brown', 'deep', 'ebony', 'green', 'blue'];
const PANTS = ['black', 'gray', 'white', 'brown', 'red', 'navy', 'teal'];
const SHOES = ['black', 'brown', 'tan', 'white', 'red', 'blue'];
const EYES = ['default', 'brown', 'amber'];
const HAIR = ['wavy', 'long', 'split-hair', 'afro', 'flat-top', 'slick-back-hair'];
const HAIRC = ['black', 'brown', 'auburn', 'blonde', 'gray', 'red', 'blue', 'pink'];
const N_LOOKS = 30;
export const LOOKS = [];
for (let i = 0; i < N_LOOKS; i++) {
  LOOKS.push({
    sk: SKINS[i % SKINS.length], pt: PANTS[(i * 3) % PANTS.length], sh: SHOES[(i * 5) % SHOES.length],
    ec: EYES[i % EYES.length], hr: HAIR[(i * 7) % HAIR.length], hc: HAIRC[(i * 11) % HAIRC.length],
    wpnType: i % 2 ? 'bow' : 'greatsword',
  });
}
if (new Set(LOOKS.map((L) => [L.sk, L.pt, L.sh].join('/'))).size !== N_LOOKS) throw new Error('mp-crowdfight: the looks are not all different bodies');

/* the bots, one process (30 sockets: mp-crowdbots split 110 into three) */
function startBots(wsPort, { fighters, homes, fightAt }) {
  const child = fork(join(H.REPO, 'tools', 'qa', 'load', 'bots.mjs'), [], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
  const g = { last: null, deaths: 0 };
  child.on('message', (m) => { if (m && m.type === 'report') { g.last = m.data; g.deaths += m.data.deaths || 0; } });
  child.send({ cmd: 'config', cfg: {
    url: `ws://127.0.0.1:${wsPort}/ws?room=${ROOM}&rf=1`, wireUrl: null, fighters, homes, tag: fighters ? 'f' : 't',
    idle: false, walkR: 300, track: true, relays: true, looks: LOOKS,
    /* the fighters round the phone, chasing only the monsters on its screen */
    fightAt: fightAt || null, chaseR: 380,
  } });
  return {
    add: (n) => child.send({ cmd: 'add', n, spreadMs: Math.max(1000, n * 150) }),
    states: () => (g.last && g.last.states) || {},
    deaths: () => g.deaths,
    stop: () => new Promise((resolve) => {
      try { child.send({ cmd: 'stop' }); } catch { /* gone */ }
      setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } resolve(); }, 1500);
    }),
  };
}

/* the renderer's own context, its calls counted while __btCfGlOn
   (mp-phoneframe's GL_INSTALL, the few this reads) */
const GL_INSTALL = () => {
  const r = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  const gl = r && r.gl;
  if (!gl) return false;
  if (gl.__btCfCount) return true;
  const c = Object.create(null);
  gl.__btCfCount = c;
  window.__btCfGl = c;
  window.__btCfGlOn = false;
  const DRAW = { drawElements: 1, drawArrays: 1, drawElementsInstanced: 1, drawArraysInstanced: 1 };
  const proto = Object.getPrototypeOf(gl);
  const orig = Object.create(null);
  for (const name of Object.getOwnPropertyNames(proto)) {
    let f;
    try { f = gl[name]; } catch (e) { continue; }
    if (typeof f !== 'function' || name === 'constructor') continue;
    /* an own wrapper (the game's or a probe's) is put back as it was */
    orig[name] = Object.prototype.hasOwnProperty.call(gl, name) ? f : null;
    gl[name] = function () {
      if (window.__btCfGlOn) {
        c.all = (c.all || 0) + 1;
        if (DRAW[name]) c.draws = (c.draws || 0) + 1;
        if (name === 'bindTexture' || name === 'useProgram' || name === 'texImage2D' || name === 'texSubImage2D' || name === 'bindFramebuffer') c[name] = (c[name] || 0) + 1;
      }
      return f.apply(this, arguments);
    };
  }
  window.__btCfGlUninstall = () => {
    for (const name of Object.keys(orig)) { if (orig[name]) gl[name] = orig[name]; else delete gl[name]; }
    delete gl.__btCfCount;
  };
  return true;
};

/* the GPU a minute later, as Pixi's collector would leave it (mp-battlemem) */
const settledGpu = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  if (!R || !R.texture || !R.gc || !R.gc.run || !window.__btGpuTex) return null;
  const now = R.gc.now != null ? R.gc.now : performance.now();
  for (const src of R.texture.managedTextures || []) {
    if (src && !src.destroyed && src._gcLastUsed >= 0 && now - src._gcLastUsed > 2000) src._gcLastUsed = now - 61000;
  }
  R.gc.run();
  const g = window.__btGpuTex(100000);
  return g && typeof g.mb === 'number' ? g : null;
});

/* the chip's textures grouped by where they came from: a file's folder, or a
   canvas's or buffer's size class */
const groupGpu = (g) => {
  const by = Object.create(null);
  for (const r of (g && g.list) || []) {
    const k = r.kind === 'file' || r.label ? `${r.kind} ${String(r.label || '').split('/').slice(0, 4).join('/') || '-'}` : `${r.kind} (no label)`;
    by[k] = (by[k] || 0) + r.mb;
  }
  return Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, mb]) => [k, +mb.toFixed(1)]);
};

/* H.devOp in this test's own room (the admin levers follow ?room=, index.js):
   the main room's god mode would not cover the phone here */
const devOp = (wsPort, op, playerId, body) => fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/${op}?room=${ROOM}`, {
  method: 'POST', headers: { Authorization: `Bearer ${H.ADMIN_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(Object.assign({ playerId }, body || {})),
}).then((r) => r.json());

const q = (arr, p) => {
  if (!arr.length) return 0;
  const v = [...arr].sort((a, b) => a - b);
  return +v[Math.min(v.length - 1, Math.floor(v.length * p))].toFixed(1);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'crowdfight', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel',
    init: MEM_INIT, query: 'room=' + ROOM + (QUERY ? '&' + QUERY : '') });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  /* a render that throws (a sprite drawing a freed picture: a dark screen
     until the rebuild) -- the whole line, and what the dead sprites are */
  const threw = [];
  P.page.on('console', (m) => { const t = m.text(); if (/\[pixi-render\] app\.render threw/.test(t) && threw.length < 3) threw.push(t.slice(0, 3000)); });
  const out = { query: QUERY, steps: STEPS, rows: [] };
  let stopAlive = false;
  let bots = null;
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the world' }).catch(() => null);
    rec.ok(`in the world${QUERY ? ` (?${QUERY})` : ''} (guard)`, !!ok, ok);
    if (!ok) return;
    const me = await H.readState(P, (S) => S.myId);
    /* past the Mayor's gate, and untouchable (mp-battlemem) */
    await devOp(wsPort, 'quests', me).catch(() => null);
    await P.page.evaluate(() => {
      const keep = () => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return;
        if (!R._quests || typeof R._quests !== 'object') R._quests = {};
        if (!R._quests.tut_1) R._quests.tut_1 = true;
      };
      keep();
      window.__cfGateOpen = setInterval(keep, 100);
    });
    (async () => {
      while (!stopAlive) {
        await devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 8 }).catch(() => null);
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 4 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const { sample } = await memSampler(P, browser);
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));

    const { WHEEL_SPAWNS, WHEEL_CENTRE } = await import(H.REPO + '/server/src/wheelspawns.js');
    /* the fighters' anchor: their land's monster nearest the square
       (bots.mjs pickAnchor) */
    const arrival = [WHEEL_CENTRE[0], WHEEL_CENTRE[1] + 288];
    const fightAt = WHEEL_SPAWNS.ember.points.slice().sort((a, b) => Math.hypot(a[0] - arrival[0], a[1] - arrival[1]) - Math.hypot(b[0] - arrival[0], b[1] - arrival[1]))[0];

    for (const place of PLACES) {
      if (place === 'fight') {
        const went = await H.glideTo(P, fightAt[0], fightAt[1] + 60);
        await P.page.waitForTimeout(1500);
        const at = await H.readState(P, (S) => [Math.round(S.player.x), Math.round(S.player.y), S.currentZone]);
        console.log(`    to the fight: ${went} -> ${JSON.stringify(at)} (wanted ${fightAt})`);
        /* the monsters' looks load as you walk (wheelMonsterArt.js) */
        for (let t0 = Date.now(); Date.now() - t0 < 45000;) {
          const a = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null)).catch(() => null);
          if (!a || (a.ready > 0 && a.loading === 0)) break;
          await P.page.waitForTimeout(500);
        }
      } else {
        await H.glideTo(P, home.x, home.y).catch(() => null);
      }
      const base = await sample(`${place}, alone`);
      base.gpuSettled = ((await settledGpu(P)) || {}).mb;
      out.rows.push({ place, bots: 0, mem: base });
      console.log(`    ${place}, alone: GPU ${base.gpu} (settled ${base.gpuSettled}), cache ${base.cache}, canvases ${base.canvasMB}, heap ${base.heapMB}`);

      bots = startBots(wsPort, place === 'fight' ? { fighters: 1, homes: ['ember'], fightAt: { x: fightAt[0], y: fightAt[1] + 60 } } : { fighters: 0, homes: ['ember'] });
      let have = 0;
      for (const want of STEPS) {
        if (want > have) { bots.add(want - have); have = want; }
        const t0 = Date.now();
        let known = 0;
        while (Date.now() - t0 < 60000) {
          known = await H.readState(P, (S) => Object.keys(S.others || {}).length);
          if (known >= Math.floor(want * 0.95)) break;
          await P.page.waitForTimeout(1000);
        }
        /* every look seen and baked, the fighters at their monsters */
        await P.page.waitForTimeout(place === 'fight' ? 12000 : 6000);
        /* the window: frames, GL calls and voices; the phone fights too */
        const glOk = await P.page.evaluate(GL_INSTALL);
        await P.page.evaluate(({ fight }) => {
          window.perfTracker && window.perfTracker.reset();
          if (window.__btVoiceCap) window.__btVoiceCap(true);
          for (const k in (window.__btCfGl || {})) delete window.__btCfGl[k];
          window.__btCfGlOn = true;
          if (fight) {
            const S = window._gameState.current;
            window.__cfAim = setInterval(() => {
              let m = null, d = Infinity;
              for (const x of S.monsters || []) {
                if (!x || x.alive === false || x.dead) continue;
                const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y);
                if (dd < d) { d = dd; m = x; }
              }
              if (!m || d > 400) { S.autoAttack = false; return; }
              const ang = Math.atan2(m.y - S.player.y, m.x - S.player.x);
              S._aimAngle = ang; S._lastAimAngle = ang; S._facingAngle = ang; S._targetFacingAngle = ang;
              S.autoAttack = true;
            }, 80);
          }
        }, { fight: place === 'fight' });
        await P.page.waitForTimeout(SAMPLE_MS);
        const w = await P.page.evaluate(() => {
          window.__btCfGlOn = false;
          clearInterval(window.__cfAim);
          const S = window._gameState.current;
          S.autoAttack = false;
          const a = (window.perfTracker && window.perfTracker.getSamples && window.perfTracker.getSamples()) || [];
          const frames = a.length || 1;
          const c = window.__btCfGl || {};
          const per = (k) => +((c[k] || 0) / frames).toFixed(1);
          const me = S.player || {};
          let near = 0;
          for (const id in (S.others || {})) {
            const o = S.others[id];
            if (o && Math.abs(o.x - me.x) < 340 && Math.abs(o.y - me.y) < 700) near++;
          }
          /* read by name: the look palette's probe lands with it (PR #1212);
             before that a row says "no palette" */
          const lp = window['__btLook' + 'Palette'];
          const ox = [];
          for (const id in (S.others || {})) { const o = S.others[id]; if (o) ox.push([Math.round(o.x), Math.round(o.y)]); }
          return {
            frames: a.length, work: a.map((s) => s.workMs || 0),
            gl: { draws: per('draws'), calls: per('all'), bindTexture: per('bindTexture'), useProgram: per('useProgram'),
              uploads: per('texImage2D') + per('texSubImage2D'), targets: per('bindFramebuffer') },
            voices: window.__btVoiceCap ? window.__btVoiceCap(false) : null,
            known: Object.keys(S.others || {}).length, near,
            farHidden: S._peersFarHidden || 0, crowdHidden: S._peersCrowdHidden || 0,
            monsters: (S.monsters || []).filter((m) => m && m.alive !== false && !m.dead && Math.hypot(m.x - me.x, m.y - me.y) < 700).length,
            palette: typeof lp === 'function' ? lp() : null,
            me: [Math.round(me.x), Math.round(me.y)], others: ox.slice(0, 6),
          };
        });
        if (glOk) await P.page.evaluate(() => window.__btCfGlUninstall && window.__btCfGlUninstall());
        const mem = await sample(`${place}, ${want} bots`);
        const sg = await settledGpu(P);
        mem.gpuSettled = sg ? sg.mb : null;
        const row = {
          place, bots: want, known: w.known, onScreen: w.near, farHidden: w.farHidden, crowdHidden: w.crowdHidden, monstersNear: w.monsters,
          gpu: mem.gpu, gpuSettled: mem.gpuSettled, gpuByKind: sg ? sg.byKind : null, gpuTop: groupGpu(sg),
          cache: mem.cache, canvasMB: mem.canvasMB, canvasN: mem.canvasN, decodedMB: mem.decodedMB, heapMB: mem.heapMB, buffersMB: mem.buffersMB,
          frames: w.frames, workP50: q(w.work, 0.5), workP95: q(w.work, 0.95), gl: w.gl,
          voices: w.voices ? { starts: w.voices.starts, maxPlaying: w.voices.maxPlaying, maxWindow: w.voices.maxWindow, maxWindowKey: w.voices.maxWindowKey,
            key: w.voices.maxWindowKeyName, held: w.voices.held, capOn: w.voices.on } : null,
          palette: w.palette ? { on: w.palette.on, ok: w.palette.ok, rows: w.palette.rows, looks: w.palette.looks, rowsFull: w.palette.rowsFull, drawn: w.palette.drawn } : null,
          botStates: bots.states(), botDeaths: bots.deaths(), me: w.me, othersAt: w.others,
        };
        out.rows.push(row);
        console.log('  crowdfight', JSON.stringify({ ...row, gpuTop: undefined }));
        console.log('    the chip, biggest:', JSON.stringify(row.gpuTop));
      }
      await bots.stop();
      bots = null;
      /* the page lets the bots go before the next place */
      for (let t0 = Date.now(); Date.now() - t0 < 30000;) {
        if ((await H.readState(P, (S) => Object.keys(S.others || {}).length)) === 0) break;
        await P.page.waitForTimeout(1000);
      }
    }

    if (threw.length) {
      out.threw = threw;
      out.deadSprites = await P.page.evaluate(() => {
        const res = [];
        const walk = (c, path, depth) => {
          if (!c || res.length >= 8 || depth > 14) return;
          const t = c.texture;
          if (t && t.frame && typeof t.frame === 'object' && !c.context && (t.destroyed || !t.source || t.source.destroyed)) {
            const own = {};
            for (const k of Object.keys(c)) if (/^_bt|^_peer|^_kind|^_tag|^_role|^_wpn|^_layer/.test(k)) own[k] = String(c[k]).slice(0, 60);
            res.push({ path, w: c.width, h: c.height, visible: c.visible, alpha: c.alpha, own, texDestroyed: !!t.destroyed, uid: t.uid });
          }
          (c.children || []).forEach((k, i) => walk(k, path + '/' + (k.label || i), depth + 1));
        };
        walk(window._pixiRenderer.app.stage, '', 0);
        return res;
      }).catch((e) => String(e));
      console.log('    RENDER THREW:', threw[0].slice(0, 2500));
      console.log('    dead sprites now:', JSON.stringify(out.deadSprites));
    }
    const rows = out.rows.filter((r) => r.gl);   /* the steps (a 0 step too), not the alone readings */
    console.log('\n  place | bots | known | on screen | hidden far/cap | GPU MB (settled) | cache | canvases | heap | draws/frame | programs/frame | binds/frame | GL calls/frame | work ms p50 | voices max playing / in 50 ms | palette rows (full)');
    for (const r of rows) {
      console.log(`  ${r.place.padEnd(5)} | ${String(r.bots).padStart(4)} | ${String(r.known).padStart(5)} | ${String(r.onScreen).padStart(9)} | ${String(r.farHidden).padStart(5)}/${String(r.crowdHidden).padEnd(4)} | ${String(r.gpu).padStart(6)} (${r.gpuSettled}) | ${r.cache} | ${r.canvasMB} | ${r.heapMB} | ${r.gl.draws} | ${r.gl.useProgram} | ${r.gl.bindTexture} | ${r.gl.calls} | ${r.workP50} | ${r.voices ? `${r.voices.maxPlaying} / ${r.voices.maxWindow}` : '-'} | ${r.palette ? `${r.palette.rows} (${r.palette.rowsFull})` : 'no palette'}`);
    }
    const last = rows[rows.length - 1];
    rec.ok('the phone knew (nearly) every bot at each step', rows.every((r) => r.known >= Math.floor(r.bots * 0.9)), rows.map((r) => [r.place, r.bots, r.known]));
    rec.ok('frames and GL calls were counted at every step', rows.every((r) => r.frames > 0 && r.gl.draws > 0), rows.map((r) => [r.frames, r.gl.draws]));
    const pal = rows.filter((r) => r.palette && r.palette.on);
    if (pal.length) rec.ok(`the look palette never ran out of rows (rowsFull ${pal.map((r) => r.palette.rowsFull).join(', ')})`, pal.every((r) => r.palette.rowsFull === 0), pal.map((r) => r.palette));
    rec.ok(`the peak: GPU ${Math.max(...rows.map((r) => r.gpu || 0))} MB with ${last && last.bots} bots (a reading)`, true);
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    if (bots) await bots.stop();
    const tag = QUERY ? '-' + QUERY.replace(/[^a-z0-9=]+/gi, '_') : '';
    writeFileSync(join(OUT, `crowdfight${tag}.json`), JSON.stringify(out, null, 2));
    await P.ctx.close().catch(() => {});
  }
}
