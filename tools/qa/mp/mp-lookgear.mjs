/* ═══ v2.3.4998: THE COMBAT POSES' ARMOUR FROM THE COLOUR NUMBERS -- ITS ORACLE ═══
 *
 * The owner, 2026-11-12: "Do armor and weapons as 256 color pictures."  The
 * armour of the swing, the bow's draw, the chop, the cook, the fire and the
 * farmer's three poses is drawn from the `gear` look set (gearLookFrame.js,
 * lookSets/gear.js) instead of its RGBA strips.  One phone, `?lookprobe`:
 *
 *   1. the look program and its shine are built, and the armour is drawn
 *      from the numbers (window.__btGearLook().on);
 *   2. THE ORACLE (gearLookProbe.js): every frame of all 42 strips drawn the
 *      old way and the new, through the game's own batchers, compared texel
 *      for texel (premultiplied): with no shine, under a steel shine, and
 *      under a copper tint with its shine.  The bar is the bake's: no colour
 *      past 16 levels of 255 save the few the shine lifts on a colour the cut
 *      moved (under 0.5% of a sheet's texels), the mean under 4;
 *   3. (v2.3.4999) the walking armour the same way (gearWalkFrame.js,
 *      lookSets/gearwalk.js): every frame of its 44 sheets, the RGBA sheet the
 *      game builds against the numbers, at full size and at half (the mip);
 *   4. (v2.3.5000) the walking armour's RGBA not loaded at all, and the body
 *      under it baked from the armour's numbers as from its RGBA
 *      (__btArmourOracle.compareGear), every frame of five poses;
 *   5. (v2.3.5002) the swing's blade and the bow's draw (weaponLookFrame.js,
 *      lookSets/weapons.js): before any oracle fetches them, their eight RGBA
 *      strips were never fetched nor cut by the game, nor are they on the
 *      chip, and every draw site's strip is the numbers'; then every frame of
 *      the eight drawn the old way and the new -- as drawn, the swing under
 *      the steel shine, in copper with its shine, mirrored (a west swing), and
 *      at half size -- to the armour's bar;
 *   6. no page errors.
 *
 *   node tools/qa/mp/run.mjs lookgear
 */
import * as H from './harness.mjs';

const VIEW = { width: 390, height: 844 };
const COPPER = [212, 140, 96];

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  /* v2.3.5002: room for every resource timing the loading screen makes (250
     by default), so a weapon strip fetched is seen (mp-bagicons' way) */
  const P = await H.newPlayer(browser, { name: 'Armour', wsPort, webPort, world: 'wheel', viewport: VIEW, touch: true, query: 'lookprobe',
    init: 'try{performance.setResourceTimingBufferSize(20000)}catch(e){}' });
  P.page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await H.enterWorld(P);
  let ready = null;
  for (let i = 0; i < 120; i++) {
    ready = await P.page.evaluate(() => ({
      gear: window.__btGearLook ? window.__btGearLook() : null,
      lp: window.__btLookPalette ? (({ on, ok, okSheen, sheets }) => ({ on, ok, okSheen, sheets }))(window.__btLookPalette()) : null,
      oracle: !!window.__btGearOracle,
    }));
    if (ready.gear && ready.gear.on && ready.oracle) break;
    await P.page.waitForTimeout(500);
  }
  rec.ok('the look program and its shine are built, and the armour is drawn from the numbers', !!(ready && ready.gear && ready.gear.on && ready.lp && ready.lp.okSheen === true && ready.oracle), ready);
  if (!(ready && ready.gear && ready.gear.on && ready.oracle)) return;

  /* v2.3.4999: before the oracle draws any RGBA sheet -- the walking chest,
     greaves and full-set figure were held back from the chip by the loading
     screen's upload (gearSheets.js setGearDrawnElsewhere), and nothing put
     them there since (the shine's answer waited for, gearWalkFrame.js) */
  const chip = await P.page.evaluate(() => {
    const g = window.__btGpuTex ? window.__btGpuTex(600) : null;
    const rows = (g && g.list) || [];
    const walk = rows.filter((x) => /sprites\/gear\/(chest|legs|fullset|belt)\//.test(x.label));
    return { up: window.__btGearUpload ? window.__btGearUpload() : null, mb: +walk.reduce((a, x) => a + x.mb, 0).toFixed(2), n: walk.length, first: walk.slice(0, 4).map((x) => x.label) };
  });
  rec.ok(`the walking armour's RGBA is not on the chip (${chip.n} sheets, ${chip.mb} MB)`, !!chip.up && chip.n === 0, chip);
  console.log('    the bake worker: ' + JSON.stringify(await P.page.evaluate(() => window.__btBakeWorker ? (({ worker, inline, failed, raw, skipped }) => ({ worker, inline, failed, raw, skipped }))(window.__btBakeWorker()) : null)));
  /* v2.3.5000: the sword's and the bow's stand-in bodies drawn from the
     numbers, none left baked the old way by the race of TRAPS §340 */
  const fx = await P.page.evaluate(() => (window.__btFxBakes ? window.__btFxBakes() : null));
  rec.ok(`the stand-ins' bodies are drawn from the numbers (${fx && fx.bodyLook} of them; ${fx && fx.bodyRgba} baked in RGBA)`,
    !!fx && fx.bodyLook > 0 && fx.bodyRgba === 0, fx);
  /* v2.3.5000: ...nor loaded at all: the bakes and the fishing grip read the
     numbers (gearNumbers.js), so the loading screen skips those sheets */
  const loaded = await P.page.evaluate(() => (window.__btGearSheets ? window.__btGearSheets() : null));
  const walkLoaded = (loaded || []).filter((k) => /^(?:(?:chest|legs)\/[^/]+\/(?:stand|jog|hit|dodge|mine|fish|pickup)|fullset\/steel\/jog)\//.test(k));
  rec.ok(`the walking armour's RGBA is not even loaded (${walkLoaded.length} of its sheets in the gear cache)`, !!loaded && walkLoaded.length === 0, walkLoaded.slice(0, 6));

  /* ── v2.3.5002: the weapon strips, BEFORE any oracle loads them itself ── */
  const wl = await P.page.evaluate(() => {
    const RGBA = /\/sprites\/player\/(sword|bow)-[a-z]+-weapon\.(png|webp)/;
    const fetched = performance.getEntriesByType('resource').map((e) => e.name.replace(/^https?:\/\/[^/]+/, '')).filter((u) => RGBA.test(u));
    const g = window.__btGpuTex ? window.__btGpuTex(2000) : null;
    const onChip = ((g && g.list) || []).filter((x) => RGBA.test(x.label)).map((x) => x.label);
    const strips = window.__btWeaponStrips ? window.__btWeaponStrips(false) : null;
    return { look: window.__btWeaponLook ? window.__btWeaponLook() : null, fetched, onChip, strips };
  });
  rec.ok(`the swing's blade and the bow's draw are drawn from the numbers, and their RGBA strips were never fetched (${wl.fetched.length}), cut (${wl.strips ? Object.keys(wl.strips.rgba).length : '?'}) nor put on the chip (${wl.onChip.length})`,
    !!(wl.look && wl.look.on && wl.strips) && wl.fetched.length === 0 && wl.onChip.length === 0 && wl.strips.asked.length === 0 && Object.keys(wl.strips.rgba).length === 0, wl);
  /* what every draw site gets (they all ask _weaponStrip): the numbers' frames */
  const ws = await P.page.evaluate(() => (window.__btWeaponStrips ? window.__btWeaponStrips(true) : null));
  rec.ok('every draw site\'s weapon strip is the numbers\' (the swing\'s three facings, the bow\'s five), and asking loaded no RGBA',
    !!ws && ws.drawn.length === 8 && ws.drawn.every((d) => d.look && d.frames > 0) && ws.asked.length === 0, ws);

  const ways = [
    { name: 'no shine, steel', opts: { sheen: null, tint: null } },
    { name: 'the steel shine', opts: { sheen: [1, 1, 1, 0.55], tint: null } },
    { name: 'copper and its shine', opts: { sheen: [1, 0.78, 0.6, 0.55], tint: COPPER } },
  ];
  for (const w of ways) {
    const res = await P.page.evaluate((o) => window.__btGearOracle.compare(o), w.opts);
    let frames = 0, drawn = 0, over16 = 0, worst = 0, meanW = 0;
    const bad = [];
    for (const r of res) {
      if (r.error) { bad.push(r); continue; }
      frames += r.frames; drawn += r.drawn; over16 += r.over16; worst = Math.max(worst, r.worst); meanW += r.mean * r.drawn;
      if (r.frames < 1 || r.mean > 4 || r.over16 > r.drawn * 0.005) bad.push(r);
    }
    const mean = drawn ? +(meanW / drawn).toFixed(2) : 0;
    console.log(`  lookgear, ${w.name}: ${res.length} sheets, ${frames} frames, ${drawn} px, mean ${mean}, worst ${worst}, over 16 ${over16}`);
    for (const r of res.slice().sort((a, b) => (b.worst || 0) - (a.worst || 0)).slice(0, 3)) console.log('    ' + JSON.stringify(r));
    rec.ok(`THE ORACLE, ${w.name}: all 42 strips (${frames} frames, ${drawn} px) the same to the eye -- mean ${mean} levels, ${over16} px past 16 (worst ${worst})`,
      res.length === 42 && bad.length === 0, bad.slice(0, 4));
  }

  /* ── v2.3.4999: the walking armour (gearWalkFrame.js, lookSets/gearwalk.js) ── */
  const walk = await P.page.evaluate(() => (window.__btGearWalk ? window.__btGearWalk() : null));
  rec.ok('the walking armour is drawn from the numbers too', !!(walk && walk.on), walk);
  if (walk && walk.on) {
    const n = await P.page.evaluate(() => window.__btGearOracle.walkSheets().length);
    const wways = [
      { name: 'walking, no shine, steel', bar: 0.005, opts: { sheen: null, tint: null, scale: 1 } },
      { name: 'walking, the steel shine', bar: 0.005, opts: { sheen: [1, 1, 1, 0.55], tint: null, scale: 1 } },
      { name: 'walking, copper and its shine', bar: 0.005, opts: { sheen: [1, 0.78, 0.6, 0.55], tint: COPPER, scale: 1 } },
      /* a computer's window draws the armour smaller than its texels: the
         chip's mip chain against the look program's first level */
      { name: 'walking at half size, no shine', bar: 0.01, opts: { sheen: null, tint: null, scale: 0.5 } },
    ];
    for (const w of wways) {
      const res = await P.page.evaluate((o) => window.__btGearOracle.compareWalk(o), w.opts);
      let frames = 0, drawn = 0, over16 = 0, worst = 0, meanW = 0;
      const bad = [];
      for (const r of res) {
        if (r.error) { bad.push(r); continue; }
        frames += r.frames; drawn += r.drawn; over16 += r.over16; worst = Math.max(worst, r.worst); meanW += r.mean * r.drawn;
        if (r.frames < 1 || r.mean > 4 || r.over16 > r.drawn * w.bar) bad.push(r);
      }
      const mean = drawn ? +(meanW / drawn).toFixed(2) : 0;
      console.log(`  lookgear, ${w.name}: ${res.length} sheets, ${frames} frames, ${drawn} px, mean ${mean}, worst ${worst}, over 16 ${over16}`);
      for (const r of res.slice().sort((a, b) => (b.worst || 0) - (a.worst || 0)).slice(0, 3)) console.log('    ' + JSON.stringify(r));
      rec.ok(`THE ORACLE, ${w.name}: all ${n} sheets (${frames} frames, ${drawn} px) the same to the eye -- mean ${mean} levels, ${over16} px past 16 (worst ${worst})`,
        res.length === n && bad.length === 0, bad.slice(0, 4));
    }
  }
  /* ── v2.3.5002: the weapons' oracle (gearLookProbe.js compareWeapons) ── */
  if (wl.look && wl.look.on) {
    const all = await P.page.evaluate(() => window.__btGearOracle.weaponSheets());
    const swing = all.filter((k) => /^swing-/.test(k));
    const wways = [
      { name: 'the blade and the bow, as drawn', n: all.length, bar: 0.005, opts: { sheen: null, tint: null } },
      { name: 'the blade under the steel shine', n: swing.length, bar: 0.005, opts: { sheets: swing, sheen: [1, 1, 1, 0.55], tint: null } },
      { name: 'the blade in copper and its shine', n: swing.length, bar: 0.005, opts: { sheets: swing, sheen: [1, 0.8, 0.58, 0.55], tint: COPPER } },
      { name: 'the blade mirrored (a west swing)', n: swing.length, bar: 0.005, opts: { sheets: swing, sheen: null, tint: null, mirror: true } },
      /* drawn smaller than its texels: neither has a mip chain, both read
         their first level (the walking armour's half-size bar) */
      { name: 'the blade and the bow at half size', n: all.length, bar: 0.01, opts: { sheen: null, tint: null, scale: 0.5 } },
    ];
    for (const w of wways) {
      const res = await P.page.evaluate((o) => window.__btGearOracle.compareWeapons(o), w.opts);
      let frames = 0, drawn = 0, over16 = 0, worst = 0, meanW = 0;
      const bad = [];
      for (const r of res) {
        if (r.error) { bad.push(r); continue; }
        frames += r.frames; drawn += r.drawn; over16 += r.over16; worst = Math.max(worst, r.worst); meanW += r.mean * r.drawn;
        if (r.frames < 1 || r.mean > 4 || r.over16 > r.drawn * w.bar) bad.push(r);
      }
      const mean = drawn ? +(meanW / drawn).toFixed(2) : 0;
      console.log(`  lookgear, weapons, ${w.name}: ${res.length} sheets, ${frames} frames, ${drawn} px, mean ${mean}, worst ${worst}, over 16 ${over16}`);
      for (const r of res.slice().sort((a, b) => (b.worst || 0) - (a.worst || 0)).slice(0, 3)) console.log('    ' + JSON.stringify(r));
      rec.ok(`THE ORACLE, weapons, ${w.name}: all ${w.n} strips (${frames} frames, ${drawn} px) the same to the eye -- mean ${mean} levels, ${over16} px past 16 (worst ${worst})`,
        res.length === w.n && w.n > 0 && bad.length === 0, bad.slice(0, 4));
    }
  }
  /* ── v2.3.5000: the body under armour baked from the armour's numbers ── */
  for (const look of [['default', 'default', 'default', 'default'], ['honey', 'navy', 'tan', 'default']]) {
    const g = await P.page.evaluate((look) => window.__btArmourOracle && window.__btArmourOracle.compareGear
      ? window.__btArmourOracle.compareGear({ look, set: ['steelplate', 'steelgreaves'] }) : { error: 'no oracle' }, look);
    console.log(`  lookgear, the bake fed the numbers (${look.join('/')}): ${JSON.stringify(g)}; the page's expansions ${JSON.stringify(await P.page.evaluate(() => window.__btGearNumbers && window.__btGearNumbers()))}`);
    rec.ok(`the body under steel baked from the armour's numbers as from its RGBA (${look[0]}): ${g.cells} frames, ${g.differ} of ${g.drawn} px past 2 levels, ${g.over16} past 16 (worst ${g.worst})`,
      !g.error && g.cells >= 80 && g.missing === 0 && g.over16 <= g.drawn * 0.002, g);
  }
  rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
}
