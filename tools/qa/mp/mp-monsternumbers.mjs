/* ═══ A MONSTER'S PICTURE HELD ONCE, ITS COLOURS AS NUMBERS (v2.3.3699) ═══
 *
 * The owner, 2026-10-28: "Keep running tests through the night on memory
 * fixes/improvements".  src/rendering/heldNumbers.js reads each monster strip
 * into its colour numbers once it has been drawn and empties its canvas: the
 * picture stays on the graphics chip.  Proven here on a phone (390 x 844 at
 * 3x), with a bow:
 *   1. at the Flame Fields' fire goblins (packed strips on 256 colours, as the
 *      mummy's and the skeleton's are; the snowman's walks fill their cells and
 *      are not packed): once drawn, their strips are held as numbers and their
 *      canvases emptied -- and every goblin drawn from one still draws whole
 *      (read back from the graphics chip);
 *   2. arrows into them: the stuck arrows read the goblins from their numbers
 *      (arrowPin frameData through readSourceRect), with no page error;
 *   3. a black screen's rebuild (window._rebuildRenderer): the new renderer
 *      gets each strip back from its numbers as it first draws it, every goblin
 *      drawn from one draws whole again, and its canvas is emptied again;
 *      and a hit's chips are cut from a held goblin's numbers (hitMaterialFx
 *      bakeChips through readSourceRect, asked for directly: a goblin's own
 *      hits throw none);
 *   4. at the Wind Dunes' mummies: their strips held too, arrows into them
 *      reading them from their numbers;
 *   5. what it saved: the canvases emptied and the numbers kept, in MB.
 *
 *   node tools/qa/mp/run.mjs monsternumbers
 *   BT_MN_QUERY=held=0    the game as it was, to compare (1-5 then fail) */
import * as H from './harness.mjs';
import { MEM_INIT, memSampler } from './memprobe.mjs';

const PHONE = { width: 390, height: 844 };
const QUERY = process.env.BT_MN_QUERY || '';

/* every sprite on the stage drawn from a held strip, and what each draws:
   the opaque pixels the renderer gives back for it (the chip's copy) */
const heldSprites = (P) => P.page.evaluate(() => {
  const app = window._pixiRenderer && window._pixiRenderer.app;
  const R = app && app.renderer;
  if (!R || !app.stage || !R.extract) return null;
  const found = [];
  const walk = (c) => {
    if (!c || c.destroyed || !c.visible) return;
    const s = c.texture && c.texture.source;
    if (s && !s.destroyed && s._btNumbers && c.alpha > 0.5) found.push(c);
    for (const k of c.children || []) walk(k);
  };
  walk(app.stage);
  const res = [];
  /* each drawn by itself, as monsterDeathFx's coverage reads a monster's
     frame: a fresh Sprite of the same texture (a sprite inside the scene's
     layers belongs to their render groups, and extracting it there reads
     blank whatever it holds) */
  const Sprite = found.length ? found[0].constructor : null;
  for (const spr of found.slice(0, 16)) {
    let opaque = -1;
    let probe = null;
    try {
      probe = new Sprite(spr.texture);
      const px = R.extract.pixels({ target: probe, resolution: 1 });
      const d = px.pixels;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 60) n++;
      opaque = n;
    } catch (e) { opaque = -2; }
    try { if (probe) probe.destroy(); } catch (e) { /* gone */ }
    const cv = spr.texture.source.resource;
    res.push({ canvasW: cv ? cv.width : null, opaque, label: String(spr.texture.source.label || '').slice(-48) });
  }
  return { n: found.length, res, held: window.__btHeld ? window.__btHeld() : null, appUid: R.uid };
});

/* a picture of the screen round the nearest monsters, for the eye (tools/qa/mp/out/monsternumbers-*.png) */
async function shotAround(P, name) {
  try {
    const { mkdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const OUT = join(H.REPO, 'tools/qa/mp/out');
    mkdirSync(OUT, { recursive: true });
    await P.page.screenshot({ path: join(OUT, `monsternumbers-${name}.png`) });
  } catch (e) { /* a picture only */ }
}
/* how much of each nearby monster's drawn box differs from plain ground, read
   off the composited screen (no extract): the monster sprite probe's bounds */
const drawnBoxes = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const out = [];
  for (const m of (S.monsters || [])) {
    if (!m || m.alive === false || m.dead) continue;
    const p = window.__btMonsterSprite ? window.__btMonsterSprite(m.id) : null;
    if (p && p.bounds) out.push({ id: m.id, b: p.bounds, visible: p.visible, texAlive: p.texAlive });
  }
  return out.slice(0, 6);
});

const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S || !S.player) return null;
  let m = null, d = Infinity;
  for (const x of S.monsters || []) {
    if (!x || x.alive === false || x.dead) continue;
    const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y);
    if (dd < d) { d = dd; m = { id: x.id, x: x.x, y: x.y, d: dd }; }
  }
  return { px: S.player.x, py: S.player.y, m };
});

async function stepToward(P, dx, dy, ms) {
  const keys = [];
  if (dy < -12) keys.push('w'); else if (dy > 12) keys.push('s');
  if (dx < -12) keys.push('a'); else if (dx > 12) keys.push('d');
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  for (const k of keys) await P.page.keyboard.up(k);
}

/* mp-battlemem's fight: the auto attack on the nearest monster, the aim kept
   on it, walking in when it is out of reach */
async function fightWith(P, slot, ms) {
  const reach = slot === 'melee' ? 70 : 420;
  const t0 = Date.now();
  let fired = 0;
  while (Date.now() - t0 < ms) {
    const s = await near(P).catch(() => null);
    if (!s || !s.m || s.m.d > 1200) { await P.page.waitForTimeout(300); continue; }
    if (s.m.d > reach) {
      await P.page.evaluate(() => { window._gameState.current.autoAttack = false; });
      await stepToward(P, s.m.x - s.px, s.m.y - s.py, Math.min(450, 60 + s.m.d * 1.1));
      continue;
    }
    fired += await P.page.evaluate(({ id, slot }) => new Promise((resolve) => {
      const S = window._gameState.current;
      const n0 = (S.arrows || []).length, sw0 = S.swingTimer || 0;
      const aim = () => {
        const m = (S.monsters || []).find((x) => x.id === id);
        if (!m || !S.player) return;
        const b = slot === 'ranged' ? S._bowSight : null;
        const ox = b && typeof b.ox === 'number' ? b.ox : S.player.x;
        const oy = b && typeof b.oy === 'number' ? b.oy : S.player.y;
        const ang = Math.atan2((typeof m.renderY === 'number' ? m.renderY : m.y) - 30 - oy, (typeof m.renderX === 'number' ? m.renderX : m.x) - ox);
        S._aimAngle = ang; S._lastAimAngle = ang; S._aiming = slot !== 'melee';
        S._facingAngle = ang; S._targetFacingAngle = ang;
      };
      aim();
      S.autoAttack = true;
      const iv = setInterval(aim, 60);
      setTimeout(() => {
        clearInterval(iv);
        resolve(((S.arrows || []).length > n0 || (S.swingTimer || 0) > sw0) ? 1 : 0);
      }, 900);
    }), { id: s.m.id, slot });
  }
  await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S._aiming = false; });
  return fired;
}

/* whole: some drawn from a held strip, each read back (no error), and at most
   one of them blank (a dying monster's emptied last cell may be) */
const whole = (h) => !!h && h.n > 0 && h.res.some((r) => r.opaque > 200) && h.res.every((r) => r.opaque !== -2)
  && h.res.filter((r) => r.opaque === 0).length <= 1;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'monsternum', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: MEM_INIT, query: QUERY || undefined });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stop = false;
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the world' }).catch(() => null);
    rec.ok(`in the world${QUERY ? ` (?${QUERY})` : ''} (guard)`, !!ok, ok);
    if (!ok) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', me).catch(() => null);
    await P.page.evaluate(() => {
      const keep = () => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return;
        if (!R._quests || typeof R._quests !== 'object') R._quests = {};
        if (!R._quests.tut_1) R._quests.tut_1 = true;
      };
      keep();
      window.__mnGateOpen = setInterval(keep, 100);
    });
    (async () => {
      while (!stop) {
        await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 8 }).catch(() => null);
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 4 && !stop; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    const armed = await H.armWorker(P, wsPort, me, ['bow']).catch(() => []);
    rec.ok(`a bow in hand, the worker's (guard: ${armed.join(', ') || 'none'})`, armed.includes('bow'), armed);
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const { sample } = await memSampler(P, browser);

    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const looksIn = async () => {
      const t0 = Date.now();
      while (Date.now() - t0 < 45000) {
        const a = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null)).catch(() => null);
        if (!a || (a.ready > 0 && a.loading === 0)) return;
        await P.page.waitForTimeout(500);
      }
    };
    const shoot = async (ms) => {
      await P.page.keyboard.press('Digit2');
      await P.page.waitForTimeout(500);
      return fightWith(P, 'ranged', ms);
    };

    /* ── 1. AT THE FLAME FIELDS, THE GOBLINS DRAWN ── */
    const at = WHEEL_SPAWNS.ember.points[0];
    await H.glideTo(P, at[0], at[1] + 40);
    await looksIn();
    const there = await near(P);
    rec.ok(`at the Flame Fields' goblins (guard: the nearest ${there && there.m ? Math.round(there.m.d) : '-'} px off)`, !!(there && there.m && there.m.d < 1200), there);
    if (!there || !there.m) return;
    await P.page.waitForTimeout(4000);   /* drawn, then the sweep (every 500 ms) */
    const h1 = await heldSprites(P);
    await shotAround(P, '1-goblins');
    console.log('    boxes:', JSON.stringify(await drawnBoxes(P).catch(() => null)));
    const m1 = await sample('at the fight, before it');
    console.log('    held:', JSON.stringify(h1 && h1.held), 'sprites:', h1 && h1.n, JSON.stringify(h1 && h1.res.slice(0, 4)));
    rec.ok('the goblins\' strips, once drawn, are held as colour numbers, their canvases emptied',
      !!h1 && !!h1.held && h1.held.held > 0 && h1.res.some((r) => r.canvasW === 0), h1 && { held: h1.held, sprites: h1.n });
    rec.ok('...and every goblin drawn from one still draws whole (the chip\'s copy read back)', whole(h1), h1 && h1.res);

    /* ── 2. ARROWS INTO THEM ── */
    const reads0 = (h1 && h1.held && h1.held.reads) || 0;
    const shots = await shoot(9000);
    const h2 = await heldSprites(P);
    console.log('    arrows:', shots, 'rounds;', JSON.stringify(h2 && h2.held));
    rec.ok(`arrows into the goblins (guard: ${shots} rounds fired)`, shots > 0, { shots });
    rec.ok('...the stuck arrows read the goblins from their numbers', !!h2 && !!h2.held && h2.held.reads > reads0, { reads0, held: h2 && h2.held });
    rec.ok('...and the goblins still draw whole after it', whole(h2), h2 && h2.res);
    /* a hit's chips, cut from a held goblin's picture by the very chipsFor a
       burst calls: a fire goblin's own hits throw no chips (its fx is
       'goblin'), so it is asked for bone's -- a skeleton's, the mummy's second
       form, whose strips are held the same way */
    const chip = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const before = window.__btHeld ? window.__btHeld().readsBy.chips || 0 : 0;
      for (const m of S.monsters || []) {
        if (!m || m.alive === false || m.dead) continue;
        const r = window.__btHitFxChips ? window.__btHitFxChips(m.id, 'bone') : null;
        if (r && r.held) return { id: m.id, ...r, before, after: window.__btHeld().readsBy.chips || 0 };
      }
      return null;
    });
    rec.ok('...a hit\'s chips are cut from a held goblin\'s numbers (the chip cutter itself)',
      !!chip && chip.chips > 0 && chip.after > chip.before, chip);
    rec.ok('...no page error in the fight', errors.length === 0, errors.slice(0, 5));

    /* ── 3. A BLACK SCREEN'S REBUILD ── */
    const refills0 = (h2 && h2.held && h2.held.refills) || 0;
    const oldUid = h2 && h2.appUid;
    await P.page.evaluate(() => { window.__mnOldApp = window._pixiRenderer && window._pixiRenderer.app; if (window._rebuildRenderer) window._rebuildRenderer('qa: monster numbers'); });
    const rebuilt = await H.waitFor(P, () => {
      const a = window._pixiRenderer && window._pixiRenderer.app;
      return { fresh: !!a && a !== window.__mnOldApp && !!a.renderer };
    }, (v) => v.fresh, { timeout: 30000, label: 'a new renderer' }).catch(() => null);
    rec.ok('a black screen\'s rebuild: a new renderer (guard)', !!rebuilt, rebuilt);
    await P.page.waitForTimeout(5000);
    const h3 = await heldSprites(P);
    await shotAround(P, '3-rebuilt');
    console.log('    after the rebuild:', JSON.stringify(h3 && h3.held), 'sprites:', h3 && h3.n, JSON.stringify(h3 && h3.res.slice(0, 4)));
    rec.ok('...the new renderer got each strip back from its numbers as it drew it',
      !!h3 && !!h3.held && h3.held.refills > refills0 && h3.appUid !== oldUid, h3 && { held: h3.held, appUid: h3.appUid, oldUid });
    rec.ok('...and every goblin drawn from one draws whole again', whole(h3), h3 && h3.res);
    await P.page.waitForTimeout(2000);
    const h4 = await heldSprites(P);
    rec.ok('...and once drawn, its canvases are emptied again', !!h4 && h4.res.length > 0 && h4.res.every((r) => r.canvasW === 0), h4 && h4.res);

    /* ── 4. AT THE WIND DUNES, A MUMMY'S BONE CHIPS ── */
    const sky = WHEEL_SPAWNS.sky.points[0];
    await H.glideTo(P, sky[0], sky[1] + 40);
    await looksIn();
    const thereS = await near(P);
    rec.ok(`at the Wind Dunes' mummies (guard: the nearest ${thereS && thereS.m ? Math.round(thereS.m.d) : '-'} px off)`, !!(thereS && thereS.m && thereS.m.d < 1200), thereS);
    await P.page.waitForTimeout(4000);
    const h5 = await heldSprites(P);
    const reads1 = (h5 && h5.held && h5.held.reads) || 0;
    const bursts0 = await P.page.evaluate(() => (window.__btHitFx ? window.__btHitFx() : null)).catch(() => null);
    const shotsS = await shoot(9000);
    const h6 = await heldSprites(P);
    await shotAround(P, '4-mummies');
    const bursts1 = await P.page.evaluate(() => (window.__btHitFx ? window.__btHitFx() : null)).catch(() => null);
    console.log('    mummies:', shotsS, 'rounds;', JSON.stringify(h6 && h6.held), 'bursts', JSON.stringify(bursts1 && bursts1.byFx));
    rec.ok(`...arrows into them read the mummies from their numbers (guard: ${shotsS} rounds fired)`,
      shotsS > 0 && !!h6 && !!h6.held && h6.held.reads > reads1, { reads1, held: h6 && h6.held, bursts0: bursts0 && bursts0.byFx, bursts1: bursts1 && bursts1.byFx });
    rec.ok('...and the mummies draw whole', whole(h6), h6 && h6.res);

    /* ── 5. WHAT IT SAVED ── */
    const m2 = await sample('after the fights and the rebuild');
    const hh = h6 && h6.held;
    console.log(`    saved: ${hh && hh.heldMb} MB of canvases emptied, ${hh && hh.numbersMb} MB of numbers kept; canvases ${m1.canvasMB} -> ${m2.canvasMB} MB, buffers ${m1.buffersMB} -> ${m2.buffersMB} MB`);
    rec.ok(`what it saved: ${hh && hh.heldMb} MB of the page's canvases let go of, ${hh && hh.numbersMb} MB of numbers kept in their place`,
      !!hh && hh.heldMb > 0 && hh.numbersMb > 0 && hh.numbersMb < hh.heldMb, hh);
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stop = true;
    await P.ctx.close().catch(() => {});
  }
}
