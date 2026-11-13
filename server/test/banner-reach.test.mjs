/* ═══ v2.3.5003: A LAND'S BANNER HELD ONLY NEAR ITS LAND ═══
 * The owner, 2026-11-12 ("Yes do it", docs/specs/pictures-256.md §7): the
 * Wheel held its four banner strips decoded for the whole visit (~15.7 MB).
 * Now src/game/bannerReach.js says which lands' banners are wanted from where
 * you stand, and src/rendering/zoneBannerPreload.js holds those and lets the
 * rest go (wheelBannerTick), `?banners=all` holding all four as before.
 *   1. the reach, on both Wheels, against the plan's own geometry: none in
 *      BroTown; a land's banner wanted well before its land begins (outward
 *      past the commons' wandering edge, and sideways past the wandering
 *      border between two lands); one out along a spoke, never more than two;
 *      kept a margin further than wanted;
 *   2. the hold, run with a stand-in <img>: held near, let go far (its element
 *      pointed at nothing); a load that lands after you walked away is not
 *      held; a load that never answers fails at its time limit and is asked
 *      again later; "on its way" for the land watch; a free while loading;
 *      `?banners=all` holds all four and lets none go;
 *   3. the wiring: the land watch ticks the hold and waits for a strip on its
 *      way; the Wheel's loading screen loads the banners near where it lands,
 *      not all four.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const ROOT = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

const B = await import(new URL('src/game/bannerReach.js', ROOT).href);
const Z = await import(new URL('src/data/zones.js', ROOT).href);
const ZB = await import(new URL('src/data/zoneBanner.js', ROOT).href);
const { PLAN, PLAN5 } = await import(new URL('public/tools/world/plan.js', ROOT).href);
const { wheelInfo } = await import(new URL('public/tools/world/core/wheel.js', ROOT).href);

const ART = Object.keys(ZB.ZONE_BANNER_THEME);   /* the lands with the owner's strips */
const themes = (lands) => [...new Set(lands.filter((l) => ZB.ZONE_BANNER_THEME[l]).map((l) => ZB.ZONE_BANNER_THEME[l]))].sort();

/* 1: the reach */
for (const [size, plan] of [[1, PLAN], [5, PLAN5]]) {
  const W = wheelInfo(plan), sq = plan.wheel.zonePx / W.Z;
  const G = Z.WHEEL_GEOM[size], c = (G.w * 32) / 2;
  const g = { cx: c, cy: c, edge: G.safeR, lands: G.lands };
  const hubPx = W.hub * sq, wobble = plan.commons.wobble * sq, warp = plan.regionWarp.amount * sq;
  const at = (id, r, side = 0) => { const s = W.byId[id]; return [c + s.ux * r - s.uy * side, c + s.uy * r + s.ux * side]; };
  const near = (x, y, region = null, extra = 0) => B.bannerLandsNear(g, x, y, region, extra);
  const L = `1 (the ${size === 5 ? 'long' : 'short'} Wheel)`;
  check(`${L}a. the town square, where you arrive, 288 px south of the middle: no land's banner`, near(c, c + 288, 'town').lands.length === 0, near(c, c + 288, 'town'));
  {
    let worst = 0;
    for (let a = 0; a < 360; a += 5) for (let r = 0; r <= 500; r += 50) {
      const x = c + r * Math.cos(a * Math.PI / 180), y = c + r * Math.sin(a * Math.PI / 180);
      worst = Math.max(worst, near(x, y).lands.length);
    }
    check(`${L}b. nowhere within 500 px of the middle (the town round its square) is any land's wanted`, worst === 0, { worst });
  }
  const start = g.edge - B.BANNER_LEAD, lead = hubPx - wobble - start;
  check(`${L}c. outward, a land's banner is wanted ${Math.round(lead)} px before its land can begin (the commons' edge ${Math.round(hubPx)} px, wandering ${Math.round(wobble)}): over 1,900, ~4 s at the worker's 500 px/s bound`,
    lead >= 1900, { start, hubPx, wobble, lead });
  check(`${L}d. sideways, the neighbour's banner is wanted ${B.BANNER_SIDE - Math.round(warp)} px before its land can begin (the border wanders ${Math.round(warp)} px from the line between them): over 1,400`,
    B.BANNER_SIDE - warp >= 1400, { side: B.BANNER_SIDE, warp });
  {
    /* walk out from the town square along each spoke's axis: its banner is
       wanted from `start` on, every step to the land and beyond */
    const bad = [];
    for (const id of ART) {
      for (let r = start + 1; r < hubPx + 3 * W.tierLen * sq; r += 97) {
        const [x, y] = at(id, r);
        if (!near(x, y).lands.includes(id)) { bad.push([id, Math.round(r)]); break; }
      }
      const [x0, y0] = at(id, start - 40);
      if (near(x0, y0).lands.includes(id)) bad.push([id, 'wanted before the lead']);
    }
    check(`${L}e. walking out along each of the four lands' spokes, its banner is wanted from ${Math.round(start)} px from the middle on, all the way out`, bad.length === 0, bad);
  }
  {
    /* one out along a spoke: the second tier's middle on the long Wheel, the
       third on the short (its tiers are a fifth as long) */
    const t = size === 5 ? 2 : 3, out = [];
    for (const id of ART) {
      const [x, y] = at(id, W.tierMid(t) * sq);
      const n = near(x, y, id);
      if (n.lands.join() !== id) out.push([id, n.lands, n.side]);
    }
    check(`${L}f. out on each of the four lands (tier ${t}'s middle, on its road) only that land's banner is wanted`, out.length === 0, out);
  }
  {
    /* the commons' edge, on the line between Frost Ridge (NW) and the Flame
       Fields (N): both; and a walk sideways along the commons' edge from
       frost's road to ember's: ember's wanted before the line, by more than
       the border's wander */
    const s1 = W.byId.frost, s2 = W.byId.ember;
    let mx = s1.ux + s2.ux, my = s1.uy + s2.uy;
    const ml = Math.hypot(mx, my); mx /= ml; my /= ml;
    const n = near(c + mx * hubPx, c + my * hubPx);
    check(`${L}g. at the commons' edge on the line between Frost Ridge and the Flame Fields both banners are wanted (${n.lands})`, themes(n.lands).join() === 'fire,frost', n);
    let firstAt = null;
    for (let k = 0; k <= 200; k++) {
      const f = k / 200;
      let dx = s1.ux * (1 - f) + s2.ux * f, dy = s1.uy * (1 - f) + s2.uy * f;
      const l = Math.hypot(dx, dy); dx /= l; dy /= l;
      const x = c + dx * hubPx, y = c + dy * hubPx;
      if (near(x, y).lands.includes('ember')) { firstAt = Math.abs(dx * my - dy * mx) * hubPx; break; }
    }
    check(`${L}h. walking sideways along the commons' edge from Frost Ridge's road, the Flame Fields' banner is wanted ${Math.round(firstAt)} px before the line between them (more than its ${Math.round(warp)} px wander)`,
      firstAt != null && firstAt > warp + 400, { firstAt, warp });
  }
  {
    let most = 0, mostAt = null, keepMiss = 0, n = 0;
    const R = Math.min(30000, W.tipR * sq);
    for (let r = 300; r <= R; r += 211) for (let a = 0; a < 360; a += 3) {
      const x = c + r * Math.cos(a * Math.PI / 180), y = c + r * Math.sin(a * Math.PI / 180);
      const w = near(x, y), k = near(x, y, null, B.BANNER_KEEP);
      const th = themes(w.lands).length;
      if (th > most) { most = th; mostAt = [Math.round(r), a]; }
      if (!w.lands.every((l) => k.lands.includes(l))) keepMiss++;
      n++;
    }
    check(`${L}i. over ${n} spots of the Wheel, never more than two banners wanted at once (at most ${most}), and every one wanted is kept`, most <= 2 && keepMiss === 0, { most, mostAt, keepMiss });
  }
  {
    /* the margin: a spot just past the lead outward is not wanted but kept */
    const [x, y] = at('frost', start - B.BANNER_KEEP / 2);
    check(`${L}j. a spot ${B.BANNER_KEEP / 2} px short of the lead: frost not wanted, but kept (let go only ${B.BANNER_KEEP} px further)`,
      !near(x, y).lands.includes('frost') && near(x, y, null, B.BANNER_KEEP).lands.includes('frost'));
  }
  check(`${L}k. standing in a land (the ground worker's region) always wants it, wherever its direction lies`, near(c + 6000, c, 'frost').lands.includes('frost'));
}
check('1l. no spot, bad input: nothing', B.bannerLandsNear(null, 1, 2).lands.length === 0 && B.bannerLandsNear({ cx: 0, cy: 0, edge: 10, lands: {} }, NaN, 0).lands.length === 0);

/* 2: the hold, with a stand-in <img> */
const made = [];
let mode = 'load';
class Img {
  constructor() { made.push(this); this.decoding = ''; this.onload = null; this.onerror = null; this._src = ''; }
  set src(u) {
    this._src = u;
    if (!u) return;
    if (mode === 'load') Promise.resolve().then(() => { if (this.onload) this.onload(); });
    else if (mode === 'error') Promise.resolve().then(() => { if (this.onerror) this.onerror(); });
    /* 'never': no answer, ever (TRAPS §257) */
  }
  get src() { return this._src; }
  decode() { return Promise.resolve(); }
}
globalThis.Image = Img;
Z.setWheelGeom(5);
const ZBP = await import(new URL('src/rendering/zoneBannerPreload.js', ROOT).href);
{
  const G = Z.WHEEL_GEOM[5], c = (G.w * 32) / 2;
  const W = wheelInfo(PLAN5), sq = PLAN5.wheel.zonePx / W.Z;
  const spot = (id, t) => { const s = W.byId[id], r = W.tierMid(t) * sq; return { x: c + s.ux * r, y: c + s.uy * r }; };
  const S = { currentZone: 'wheel', player: { x: c, y: c + 288 } };
  /* one hand-run clock for the module's every reading (a failure's time, the
     tick's) */
  const realNow = Date.now;
  let now = 1e6;
  Date.now = () => now;
  const tick = async (region = null) => { now += 1000; ZBP.wheelBannerTick(S, region); await flush(); };
  check('2a. the mode is "near" by default', ZBP.bannersAll() === false && ZBP.bannerHold().mode === 'near');
  await ZBP.preloadWheelBanners({ x: c, y: c + 288 });
  await tick('town');
  check('2b. arriving at the town square: no banner held, none loading', ZBP.bannerHold().held.length === 0 && ZBP.bannerHold().loading.length === 0, ZBP.bannerHold());
  const f = spot('frost', 2);
  S.player.x = f.x; S.player.y = f.y;
  now += 1000; ZBP.wheelBannerTick(S, 'frost');
  check('2c. out on Frost Ridge, its strip is on its way (the land watch waits for it)', ZBP.zoneBannerComing('frost') && !ZBP.zoneBannerReady('frost') && !ZBP.zoneBannerComing('ember'));
  await flush();
  const h = ZBP.bannerHold();
  check('2d. ...then held, decoded: frost alone', h.held.join() === 'frost' && ZBP.zoneBannerReady('frost') && !ZBP.zoneBannerComing('frost'), h);
  const frostImg = made[made.length - 1];
  S.player.x = c; S.player.y = c + 288;
  await tick('town');
  check('2e. back in BroTown, it is let go and its <img> pointed at nothing', ZBP.bannerHold().held.length === 0 && frostImg.src === '' && ZBP.bannerHold().frees >= 1, ZBP.bannerHold());
  /* walked away while it came: not held */
  const e = spot('ember', 2);
  S.player.x = e.x; S.player.y = e.y;
  now += 1000; ZBP.wheelBannerTick(S, 'ember');
  S.player.x = c; S.player.y = c + 288;
  now += 1000; ZBP.wheelBannerTick(S, 'town');
  await flush();
  const late = made[made.length - 1];
  check('2f. a strip that lands after you walked away is let go, not held (its <img> pointed at nothing)', ZBP.bannerHold().held.length === 0 && late.src === '', ZBP.bannerHold());
  /* a load that never answers: its time limit, then asked again later */
  mode = 'never';
  const timers = [];
  const realSet = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return 0; };
  const v = spot('verdant', 2);
  S.player.x = v.x; S.player.y = v.y;
  try { now += 1000; ZBP.wheelBannerTick(S, 'verdant'); } finally { globalThis.setTimeout = realSet; }
  const lim = timers.find((t) => t.ms === ZBP.WARM_LIMIT_MS);
  check('2g. a request that never answers has its time limit (WARM_LIMIT_MS, 20 s)', ZBP.WARM_LIMIT_MS === 20000 && !!lim && ZBP.zoneBannerComing('verdant'));
  const n0 = made.length;
  if (lim) lim.fn();
  await flush();
  check('2h. ...at which it counts as a failure: not on its way any more (the land plays the plaque alone), its <img> let go', !ZBP.zoneBannerComing('verdant') && !ZBP.zoneBannerReady('verdant') && made[n0 - 1].src === '' && ZBP.bannerHold().fails >= 1, ZBP.bannerHold());
  mode = 'load';
  await tick('verdant');
  check('2i. ...and is not asked again at once', made.length === n0 && !ZBP.zoneBannerReady('verdant'));
  now += ZBP.FAIL_RETRY_MS;
  await tick('verdant');
  check('2j. ...but FAIL_RETRY_MS later, while you are still near, it is asked again and held', made.length === n0 + 1 && ZBP.zoneBannerReady('verdant'), ZBP.bannerHold());
  /* leaving the Wheel with one held and one on its way: out on Frost Ridge
     (held), then at the commons' edge on the line to the Flame Fields (its
     strip asked for), and out */
  const fr = spot('frost', 2);
  S.player.x = fr.x; S.player.y = fr.y;
  await tick('frost');
  const s1 = W.byId.frost, s2 = W.byId.ember, hub = W.hub * sq;
  let mx = s1.ux + s2.ux, my = s1.uy + s2.uy;
  const ml = Math.hypot(mx, my);
  S.player.x = c + (mx / ml) * hub; S.player.y = c + (my / ml) * hub;
  now += 1000; ZBP.wheelBannerTick(S, 'frost');
  const both = ZBP.bannerHold();
  const freed = ['frost', 'ember', 'sky', 'verdant'].flatMap((l) => ZBP.freeZoneBanner(l, 'farm_home'));
  await flush();
  check(`2k. leaving the Wheel lets the held one go (${freed}) and the one still on its way lands let go`,
    both.held.join() === 'frost' && both.loading.join() === 'fire' && freed.join() === 'frost' && ZBP.bannerHold().held.length === 0 && made[made.length - 1].src === '', { both, freed, h: ZBP.bannerHold() });
  S.currentZone = 'farm_home';
  await tick(null);
  check('2l. off the Wheel the tick holds nothing', ZBP.bannerHold().held.length === 0 && ZBP.bannerHold().loading.length === 0);
  /* a dungeon's mouth out in a land: its banner behind the loading screen */
  S.currentZone = 'wheel';
  await ZBP.preloadWheelBanners(spot('ember', 2));
  check('2m. a trip that lands out on the Flame Fields loads its banner behind the loading screen', ZBP.bannerHold().held.join() === 'fire', ZBP.bannerHold());
  Date.now = realNow;
}
{
  /* `?banners=all`: a second copy of the module, read with that address */
  globalThis.window = { location: { search: '?guest=1&banners=all' } };
  const ALL = await import(new URL('src/rendering/zoneBannerPreload.js?all', ROOT).href);
  const G = Z.WHEEL_GEOM[5], c = (G.w * 32) / 2;
  await ALL.preloadWheelBanners({ x: c, y: c + 288 });
  ALL.wheelBannerTick({ currentZone: 'wheel', player: { x: c, y: c + 288 } }, 'town', 5e6);
  await flush();
  const h = ALL.bannerHold();
  check('2n. `?banners=all`: all four held at the town square, as before, and the tick lets none go', ALL.bannersAll() && h.mode === 'all' && h.held.join() === 'desert,fire,forest,frost', h);
  check('2o. the probe is on the page (window.__btBanners)', typeof globalThis.window.__btBanners === 'function');
  delete globalThis.window;
}

/* 3: the wiring */
{
  const ov = src('src/ui/zoneBannerOverlay.js'), pa = src('src/rendering/preloadAnimations.js');
  check('3a. the land watch ticks the hold every frame it runs (noteWheelLand -> wheelBannerTick)', /export function noteWheelLand\([^)]*\) \{\s*\/\*[^*]*\*\/\s*try \{ wheelBannerTick\(S, region\); \}/.test(ov));
  check('3b. ...and waits for a strip on its way, BANNER_WAIT_MS at most, before the plaque alone', /if \(zoneBannerComing\(region\) && now - _wl\.since < LAND_DWELL_MS \+ BANNER_WAIT_MS\) return false;/.test(ov));
  check('3c. the Wheel\'s loading screen loads the banners near where it lands, not all four', /preloadWheelBanners\(wheelArrivalPoint\(\)\)/.test(pa) && !/for \(const land of wheelBannerLands\(\)\) tasks\.push/.test(pa));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
