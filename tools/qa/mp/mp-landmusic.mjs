/* ═══ EACH LAND OF THE WHEEL, ITS OWN MUSIC (v2.3.3060) ═══
 *
 * The owner, on the recommendations for finding your way round the Wheel:
 * "Continue building recommended" -- music by land among them.
 *
 * On a phone (390 x 844, 3x) in the Wheel, against a real worker:
 *   0. BEFORE, with `?nolandmusic` (the Wheel as it was): what Brotown plays
 *      -- recorded for the PR, asserted only as the old rule (the Wheel's own
 *      key, no zone track, the game's theme up);
 *   1. arriving in Brotown: the town's track (village.mp3), the theme ducked
 *      under it;
 *   2. into Frost Ridge: frost.mp3, a moment after its banner;
 *   3. a step back onto the safe ground is not coming home: 3 s there and
 *      Frost Ridge's music still plays (a fight on the line steps back and
 *      forth); the town's comes back only after MUSIC_HOME_MS there;
 *   4. the Flame Fields fire.mp3; on through the commons to the Wind Dunes
 *      without the town's in between (a short pass), desert.mp3 and the
 *      dunes' wind under it;
 *   5. the Hollows, with no track of its own: no zone track, the game's
 *      theme up; the dunes' wind stopped and its decoded loop let go;
 *   6. the Verdant Wilds: forest.mp3 (the old meadow's Floral);
 *   7. a death out there: back in Brotown through today's town, the town's
 *      track playing, and the theme not brought up over it on the way;
 *   8. no page errors.
 */
import * as H from './harness.mjs';
import { WHEEL_SPAWNS } from '../../../server/src/wheelspawns.js';

const PHONE = { width: 390, height: 844 };
const C = 21504;                   /* the Wheel's middle */
const IN_LAND = 3150;              /* past the safe ground, short of the monsters' middle (~3450) */
const COMMONS = 2450;              /* the commons, past the town */
const spot = (land, r) => {
  const [ax, ay] = WHEEL_SPAWNS[land].anchor;
  const d = Math.hypot(ax - C, ay - C);
  return { x: Math.round(C + ((ax - C) / d) * r), y: Math.round(C + ((ay - C) / d) * r) };
};

const lm = (P) => P.page.evaluate(() => (window.__btLandMusic ? window.__btLandMusic() : null));
const at = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const L = window.__btZoneBanner && window.__btZoneBanner.land ? window.__btZoneBanner.land() : {};
  return { zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y), region: L.cur || null, banner: L.shown || null,
    loading: !!S._zoneLoading, dying: !!S._dying, dead: !!(S.player && S.player.dead) };
});
const r = (p) => Math.round(Math.hypot(p.x - C, p.y - C));

async function waitMusic(P, pred, ms = 15000) {
  const t0 = Date.now();
  let v = null;
  while (Date.now() - t0 < ms) {
    v = await lm(P);
    if (v && pred(v)) return { v, ms: Date.now() - t0 };
    await P.page.waitForTimeout(250);
  }
  return { v, ms: null };
}

/* mp-harvestbar's walk: H.hopTo's hops, checked against the worker */
async function travel(P, wsPort, myId, tx, ty) {
  const worker = async () => {
    const a = await H.adminPlayer(wsPort, myId).catch(() => null);
    return (a && a.live) || {};
  };
  const here = () => H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const apart = (L, c) => typeof L.x === 'number' && Math.hypot(L.x - c.x, L.y - c.y) > 60;
  for (let leg = 0; leg < 300; leg++) {
    const L = await worker();
    const c = await here();
    if (apart(L, c)) {
      await P.page.waitForTimeout(900);
      const L2 = await worker();
      const c2 = await here();
      if (apart(L2, c2) && Math.hypot(L2.x - L.x, L2.y - L.y) < 2) {
        await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; }, { x: L2.x, y: L2.y });
        await P.page.waitForTimeout(500);
      }
      continue;
    }
    if (Math.hypot(tx - c.x, ty - c.y) < 6) return true;
    await H.hopTo(P, tx, ty, { tries: 4 });
  }
  return false;
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

/* a tap on the world: the first gesture wakes the game's audio */
const tapWorld = (P) => P.page.touchscreen.tap(PHONE.width / 2, PHONE.height * 0.35).catch(() => {});

async function keepAlive(P, stop) {
  while (!stop.v) {
    await P.page.keyboard.press('Control').catch(() => {});
    for (let i = 0; i < 40 && !stop.v; i++) await P.page.waitForTimeout(500).catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 0. before: the Wheel as it was ── */
  {
    const Q = await H.newPlayer(browser, { name: 'Hushbro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'nolandmusic', init: 'window.__btProbe = true;' });
    const stop = { v: false };
    keepAlive(Q, stop);
    try {
      await H.enterWorld(Q);
      const inW = await H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
        (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel (before)' }).catch(() => null);
      await tapWorld(Q);
      /* the way in asks for the Wheel's own music (none), then the loading
         screen's hand-over (IntroVideo.jsx) asks for the town's -- which then
         plays over the whole Wheel, everywhere, for the rest of the visit */
      const order = (v) => {
        const z = (v.asks || []).map((a) => a.zone);
        const w = z.lastIndexOf('wheel');
        return w >= 0 && z.indexOf('town', w) > w;
      };
      const b = await waitMusic(Q, (v) => v.ctx === 'running' && order(v) && v.playing === 'town' && v.source, 20000);
      const b2 = await lm(Q);
      rec.ok(`BEFORE (?nolandmusic, the Wheel as it was): the way in asks for the Wheel's own music, which has none, then the loading screen's hand-over asks for the town's, and that plays over the whole Wheel (asks: ${((b2 && b2.asks) || []).map((a) => a.zone).join(' -> ')}; playing "${b2 && b2.playing}")`,
        !!inW && !!b2 && b2.on === false && b.ms !== null && /village\.mp3/.test(b2.url || ''), { b2: b2 && Object.assign({}, b2, { asks: (b2.asks || []).map((a) => ({ zone: a.zone, was: a.was })) }), waited: b.ms });
    } finally {
      stop.v = true;
      await Q.ctx.close().catch(() => {});
    }
  }

  const P = await H.newPlayer(browser, { name: 'Tunebro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: 'window.__btProbe = true;' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stop = { v: false };
  keepAlive(P, stop);
  try {
    await H.enterWorld(P);
    await P.page.evaluate(() => { window.__btProbe = true; });
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await tapWorld(P);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await H.devOp(wsPort, 'quests', myId);   /* past the Mayor's gate: out of the commons */
    await closeTalk(P);

    /* ── 1. Brotown ── */
    const home = await waitMusic(P, (v) => v.ctx === 'running' && v.playing === 'town' && v.source, 20000);
    const h = home.v || {};
    rec.ok(`arriving in Brotown: the town's track (${h.url}), the theme ducked under it`,
      home.ms !== null && h.on === true && /village\.mp3/.test(h.url || '') && h.themeDucked === true, h);
    const there0 = await at(P);
    rec.ok(`...in the town's region (${there0.region}, ${r(there0)} px from the middle) (guard)`, there0.region === 'town' || there0.region === 'commons', there0);

    /* ── 2. Frost Ridge ── */
    const fr = spot('frost', IN_LAND);
    await travel(P, wsPort, myId, fr.x, fr.y);
    const tFrost = Date.now();
    const f = await waitMusic(P, (v) => v.playing === 'frost' && v.source, 15000);
    const fa = await at(P);
    rec.ok(`into Frost Ridge (${r(fa)} px out, region ${fa.region}): frost.mp3 (${f.v && f.v.url}), its banner played`,
      f.ms !== null && /frost\.mp3/.test((f.v && f.v.url) || '') && fa.region === 'frost' && fa.banner === 'frost', { music: f.v, at: fa });
    const fLog = (f.v && f.v.log) || [];
    rec.ok('...one change, to "frost", none on the way out of town (the commons is home ground)',
      fLog.length === 1 && fLog[0].key === 'frost', fLog);

    /* ── 3. a step back onto the safe ground ──
       Quick hops (no worker round trip a leg), then every quarter second what
       plays, timed from the moment the land watch saw the commons (`since`,
       the page's clock, this machine's) */
    const fc = spot('frost', COMMONS);
    await H.hopTo(P, fc.x, fc.y, { tries: 30 });
    const samples = [];
    let flip = null;
    const t3 = Date.now();
    while (Date.now() - t3 < 16000) {
      const v = await lm(P);
      if (v && v.want === 'town') flip = v.since;
      if (v && flip) samples.push({ t: Date.now() - flip, playing: v.playing, source: v.source });
      if (v && v.playing === 'town' && v.source) break;
      await P.page.waitForTimeout(250);
    }
    const ca = await at(P);
    const early = samples.filter((x) => x.t < 7500);
    const town = ((await lm(P)) || {}).log || [];
    const toTown = town.length && town[town.length - 1].key === 'town' ? town[town.length - 1].at - flip : null;
    rec.ok(`a step back onto the commons (${ca.region}, ${r(ca)} px out) is not coming home: Frost Ridge's music plays on through the first ${early.length ? (early[early.length - 1].t / 1000).toFixed(1) : '?'} s after the line`,
      ca.region === 'commons' && early.length >= 8 && early[0].t < 3000 && early.every((x) => x.playing === 'frost'), { early: early.filter((x, i) => i % 4 === 0), at: ca });
    rec.ok(`...and the town's track comes back once you have stayed: asked for ${toTown != null ? (toTown / 1000).toFixed(1) : '?'} s after the line (MUSIC_HOME_MS 8 s)`,
      toTown != null && toTown >= 7900 && toTown < 10000 && samples.some((x) => x.playing === 'town' && x.source), { toTown, last: samples.slice(-3) });

    /* ── 4. the Flame Fields, then on to the Wind Dunes by a short pass ── */
    const em = spot('ember', IN_LAND);
    await travel(P, wsPort, myId, spot('ember', COMMONS).x, spot('ember', COMMONS).y);
    await travel(P, wsPort, myId, em.x, em.y);
    const e = await waitMusic(P, (v) => v.playing === 'ember' && v.source, 15000);
    rec.ok(`the Flame Fields: fire.mp3 (${e.v && e.v.url})`, e.ms !== null && /fire\.mp3/.test((e.v && e.v.url) || ''), e.v);
    const nLog = ((e.v && e.v.log) || []).length;
    await travel(P, wsPort, myId, spot('ember', COMMONS).x, spot('ember', COMMONS).y);
    await travel(P, wsPort, myId, spot('sky', COMMONS).x, spot('sky', COMMONS).y);
    const sk = spot('sky', IN_LAND);
    await travel(P, wsPort, myId, sk.x, sk.y);
    const s = await waitMusic(P, (v) => v.playing === 'sky' && v.source && v.ambienceLoop, 15000);
    /* the changes on the way, for the record: a pass over the commons shorter
       than MUSIC_HOME_MS goes straight from one land's music to the next */
    const sLog = ((s.v && s.v.log) || []).slice(nLog);
    rec.ok(`the Wind Dunes: desert.mp3 (${s.v && s.v.url}) and the dunes' wind under it (${s.v && s.v.ambience}) (on the way: ${sLog.map((x) => x.key).join(' -> ')})`,
      s.ms !== null && /desert\.mp3/.test((s.v && s.v.url) || '') && s.v.ambience === 'zoneamb-sky', { music: s.v, changes: sLog });

    /* ── 5. the Hollows: no track of its own ── */
    await travel(P, wsPort, myId, spot('sky', COMMONS).x, spot('sky', COMMONS).y);
    await travel(P, wsPort, myId, spot('hollows', COMMONS).x, spot('hollows', COMMONS).y);
    const ho = spot('hollows', IN_LAND);
    await travel(P, wsPort, myId, ho.x, ho.y);
    const hw = await waitMusic(P, (v) => v.playing === 'hollows', 15000);
    await P.page.waitForTimeout(1200);
    const hv = await lm(P);
    rec.ok(`the Hollows, with no track of its own: no zone track, the game's theme up (playing "${hv && hv.playing}")`,
      hw.ms !== null && !!hv && hv.playing === 'hollows' && !hv.source && hv.themeDucked === false, hv);
    rec.ok('...the dunes\' wind stopped, and its decoded loop let go', !!hv && !hv.ambience && !hv.windKept, hv && { ambience: hv.ambience, windKept: hv.windKept });

    /* ── 6. the Verdant Wilds ── */
    await travel(P, wsPort, myId, spot('hollows', COMMONS).x, spot('hollows', COMMONS).y);
    await travel(P, wsPort, myId, spot('thunder', COMMONS).x, spot('thunder', COMMONS).y);
    await travel(P, wsPort, myId, spot('tidal', COMMONS).x, spot('tidal', COMMONS).y);
    await travel(P, wsPort, myId, spot('mist', COMMONS).x, spot('mist', COMMONS).y);
    await travel(P, wsPort, myId, spot('verdant', COMMONS).x, spot('verdant', COMMONS).y);
    const ve = spot('verdant', IN_LAND);
    await travel(P, wsPort, myId, ve.x, ve.y);
    const v = await waitMusic(P, (x) => x.playing === 'verdant' && x.source, 15000);
    rec.ok(`the Verdant Wilds: forest.mp3, the old meadow's Floral (${v.v && v.v.url})`, v.ms !== null && /forest\.mp3/.test((v.v && v.v.url) || ''), v.v);

    /* ── 7. a death out there: the Flame Fields' goblins, as mp-wheelhome ── */
    await travel(P, wsPort, myId, spot('verdant', COMMONS).x, spot('verdant', COMMONS).y);
    await travel(P, wsPort, myId, spot('frost', COMMONS).x, spot('frost', COMMONS).y);
    await travel(P, wsPort, myId, spot('ember', COMMONS).x, spot('ember', COMMONS).y);
    const gob = WHEEL_SPAWNS.ember.points[0];
    await travel(P, wsPort, myId, gob[0], gob[1] + 40);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: false });
    let died = false;
    const tDie = Date.now();
    while (Date.now() - tDie < 150000) {
      const st = await P.page.evaluate(() => {
        const S = window._gameState.current;
        if (S._dying || (S.player && S.player.dead)) return { dying: true };
        const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
        let best = null, bd = Infinity;
        for (const m of live) { const d = Math.hypot(m.x - S.player.x, m.y - S.player.y); if (d < bd) { bd = d; best = m; } }
        return { dying: false, best: best ? { x: best.x, y: best.y, d: bd } : null };
      });
      if (st.dying) { died = true; break; }
      if (st.best) await H.hopTo(P, st.best.x + 10, st.best.y, { tries: st.best.d > 150 ? 20 : 2, step: 80 });
      else await P.page.waitForTimeout(400);
    }
    rec.ok('died out there (guard)', died, { died });
    if (died) {
      const zones = [];
      const themeUp = [];
      let fin = null;
      for (let i = 0; i < 240; i++) {
        const a = await at(P);
        const m = await lm(P);
        if (!zones.length || zones[zones.length - 1] !== a.zone) zones.push(a.zone);
        if (m && !m.themeDucked && m.source === false) themeUp.push({ zone: a.zone, playing: m.playing });
        if (a.zone === 'wheel' && !a.loading && !a.dying && zones.includes('town')) { fin = a; break; }
        await P.page.waitForTimeout(500);
      }
      const m7 = await waitMusic(P, (x) => x.playing === 'town' && x.source, 15000);
      rec.ok(`...back in Brotown (${zones.join(' -> ')}): the town's track (${m7.v && m7.v.url})`,
        !!fin && r(fin) < 900 && m7.ms !== null && /village\.mp3/.test((m7.v && m7.v.url) || ''), { fin, music: m7.v });
      rec.ok(`...and the game's theme never brought up over the Wheel on the way (it was after any trip back) (${themeUp.filter((t) => t.zone === 'wheel').length} looks)`,
        themeUp.filter((t) => t.zone === 'wheel').length === 0, themeUp.slice(0, 6));
    }

    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stop.v = true;
    await P.ctx.close().catch(() => {});
  }
}
