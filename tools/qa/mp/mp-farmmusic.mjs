/* ═══ THE FARM'S OWN MUSIC, ON A PHONE (v2.3.3672) ═══
 *
 * The owner, 2026-10-27: "Now just a mental note to add farming sound effects
 * and music track for that later" -- the sounds came first (#1151), then
 * "Homestead Morning", made with Suno and uploaded the same afternoon.  The
 * farm played the game's theme until now (it had no ZONE_MUSIC entry).
 *
 * On a phone (390 x 844) in the world, against a real worker:
 *   1. in BroTown, after the first tap: the town's track (village.mp3);
 *   2. through the Feed & Seed's "Visit Your Farm", onto the farm: the music
 *      deck streams farm.mp3 at its new address -- playing, the clock moving,
 *      1:51 long, nothing decoded into memory -- and the theme ducked under it;
 *   3. the Sound Studio's Music tab names it as what plays here ("Homestead
 *      Morning", Your farm);
 *   4. out through the farm's gate: back in the world, the town's track again
 *      and the farm's let go;
 *   5. no page errors.
 */
import * as H from './harness.mjs';
import { FARM_GATE } from '../../../src/data/farmLayout.js';

const PHONE = { width: 390, height: 844 };
const FOOT_DY = 52;   /* a body's middle to its boots on the farm (mp-farmwalk's) */
const FARM_URL = '/audio/music/farm.mp3?v=2.3.3672';

const lm = (P) => P.page.evaluate(() => (window.__btLandMusic ? window.__btLandMusic() : null));
const deck = (P) => P.page.evaluate(() => (window.__btMusicDeck ? window.__btMusicDeck() : null));

async function until(fn, pred, ms = 15000, gap = 250) {
  let v = null;
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    v = await fn().catch(() => null);
    if (v && pred(v)) return v;
    await new Promise((r) => setTimeout(r, gap));
  }
  return v;
}

async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) {
      await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {});
      continue;
    }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it']) {
      const btn = P.page.locator('button:visible', { hasText: t }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) return;
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tunefarmer', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: 'window.__btProbe = true;' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  /* the file itself, as the phone asked for it */
  const served = [];
  P.page.on('response', (r) => { if (/\/audio\/music\/farm\.mp3/.test(r.url())) served.push({ url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status() }); });
  let stop = false;
  (async () => {
    while (!stop) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stop; i++) await new Promise((r) => setTimeout(r, 500));
    }
  })();
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    /* a tap on the world: the first gesture wakes the game's sound */
    await P.page.touchscreen.tap(PHONE.width / 2, PHONE.height * 0.35).catch(() => {});
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await H.devOp(wsPort, 'quests', myId);
    await closeTalk(P);
    /* the quest plate and the coach's card take no taps here (mp-farmiron's
       way): the Feed & Seed's "Visit Your Farm" lies under them on a phone */
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    /* ── 1. BroTown ── */
    const town = await until(() => lm(P), (v) => v.ctx === 'running' && v.playing === 'town' && v.source && /village\.mp3/.test(v.url || ''), 20000);
    rec.ok(`1. in BroTown the town's track plays (${town && town.url})`, !!town && /village\.mp3/.test(town.url || '') && town.playing === 'town', town && { playing: town.playing, url: town.url });

    /* ── 2. onto the farm ── */
    await P.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
    const visit = await until(() => P.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }), (v) => !!v, 8000);
    if (visit) await P.page.touchscreen.tap(visit.x, visit.y);
    const onFarm = await until(() => H.readState(P, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') })),
      (v) => v.zone === 'farm_home' && !v.hold && !v.veil, 45000);
    if (!onFarm || onFarm.zone !== 'farm_home') await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/farmmusic-noway.png` }).catch(() => {});
    rec.ok('onto the farm through "Visit Your Farm" (guard)', !!onFarm && onFarm.zone === 'farm_home', { onFarm, visit });
    if (!onFarm || onFarm.zone !== 'farm_home') return;
    const fm = await until(() => lm(P), (v) => v.playing === 'farm_home' && v.source && v.url === FARM_URL, 20000);
    rec.ok(`2. on the farm the farm's own track is asked for (${fm && fm.url}), the theme ducked under it`,
      !!fm && fm.playing === 'farm_home' && fm.url === FARM_URL && fm.themeDucked === true, fm && { playing: fm.playing, url: fm.url, themeDucked: fm.themeDucked });
    /* streamed: the deck's element plays the file, its clock moving */
    const d1 = await until(() => deck(P), (v) => v.el && v.el.src === FARM_URL && !v.el.paused && v.el.t > 0.3 && v.el.dur, 20000);
    await P.page.waitForTimeout(1500);
    const d2 = await deck(P);
    rec.ok(`2. ...streamed by the music deck: ${d2 && d2.el && d2.el.src}, playing, its clock ${d1 && d1.el && d1.el.t} -> ${d2 && d2.el && d2.el.t} s of ${d2 && d2.el && d2.el.dur} (Homestead Morning is 1:51), looping, nothing decoded`,
      !!d1 && !!d2 && d2.el && d2.el.src === FARM_URL && !d2.el.paused && d2.el.t > d1.el.t && Math.abs((d2.el.dur || 0) - 111) < 3 && d2.el.loop === true
        && d2.el.error === null && !d2.failed && d2.decoded && d2.decoded.zones === 0 && d2.cur && d2.cur.kind !== 'global',
      d2 && { el: d2.el, cur: d2.cur, failed: d2.failed, decoded: d2.decoded, gain: d2.gain });
    const ok = served.filter((s) => s.status === 200 || s.status === 206 || s.status === 304);
    rec.ok(`2. ...the file served at its new address (${served.map((s) => s.status).join(', ')})`, ok.length >= 1 && ok.every((s) => s.url === FARM_URL), served);
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/farmmusic-farm.png` }).catch(() => {});

    /* ── 3. the Sound Studio names it ── */
    await P.page.evaluate(() => window.__btSoundStudio && window.__btSoundStudio.open({ tab: 'music' }));
    const st = await until(() => P.page.evaluate(() => {
      const now = document.querySelector('[data-studio-music-now]');
      const row = document.querySelector('[data-studio-music] [data-studio-row="music:farm_home"]');
      const theme = document.querySelector('[data-studio-music] [data-studio-row="music:theme"]');
      return { now: now ? now.getAttribute('data-studio-music-now') : null, nowText: now ? now.textContent : '',
        row: row ? row.textContent.replace(/\s+/g, ' ') : null, theme: theme ? theme.textContent.replace(/\s+/g, ' ') : null };
    }), (v) => !!v.row && !!v.now, 8000);
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/farmmusic-studio.png` }).catch(() => {});
    rec.ok(`3. the Sound Studio's Music tab: "${st && st.row}", named as what plays here ("${st && st.nowText}"), and the theme's line no longer says the farm`,
      !!st && st.now === 'farm_home' && /Homestead Morning/.test(st.row || '') && /Your farm/.test(st.row || '') && !/farm/i.test(st.theme || ''), st);
    await P.page.evaluate(() => window.__btSoundStudio && window.__btSoundStudio.close());
    await P.page.waitForTimeout(500);

    /* ── 4. out through the gate ── */
    await H.hopTo(P, FARM_GATE.x, 1376 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    const out = await until(() => H.readState(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading })), (v) => v.zone === 'wheel' && !v.loading, 40000);
    rec.ok(`out through the farm's gate, back in the world (${out && out.zone}) (guard)`, !!out && out.zone === 'wheel', out);
    const back = await until(() => lm(P), (v) => v.playing === 'town' && v.source && /village\.mp3/.test(v.url || ''), 25000);
    const d3 = await until(() => deck(P), (v) => v.el && /village\.mp3/.test(v.el.src || ''), 10000);
    rec.ok(`4. ...the town's track again (${back && back.url}), the farm's let go (the deck plays ${d3 && d3.el && d3.el.src})`,
      !!back && /village\.mp3/.test(back.url || '') && !!d3 && !/farm\.mp3/.test((d3.el && d3.el.src) || '') && !/farm\.mp3/.test(d3.zone || ''), { lm: back && { playing: back.playing, url: back.url }, deck: d3 && { el: d3.el, zone: d3.zone } });

    rec.ok('5. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    stop = true;
    await P.ctx.close().catch(() => {});
  }
}
