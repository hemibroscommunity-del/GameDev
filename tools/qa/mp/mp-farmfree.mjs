/* ═══ v2.3.3705: THE FARM TRIP LETS GO OF THE WHEEL ═══
 *
 * The owner, 2026-10-28: "Memory seems to be the persistent bottleneck in
 * terms of performance in this game.  Getting that to run as low as possible
 * without sacrificing performance is the goal."
 *
 * Every way onto your farm from the Wheel -- the Feed & Seed's "Visit Your
 * Farm", the old Farm window, the Land Office -- sets the farm straight in,
 * with no zone change, so the Wheel's own pictures stayed for the whole
 * visit: its lands' banner strips, the signposts' icons, the buildings'
 * pictures and every monster look loaded near you.  A dungeon's way in lets
 * them go (gameEvents' dungeon_started, releaseLeftZoneArt), and now the
 * farm's hold does too (game/farmTrip.js).
 *
 * One phone, in the world, against a real worker:
 *   1. the Wheel's own pictures in, in BroTown (guard): the buildings'
 *      pictures, the signposts' icons (v2.3.5003: and no land's banner strip,
 *      held only near its land since the owner's "Yes do it",
 *      zoneBannerPreload.js -- they were all four here before);
 *   2. out at the Flame Fields' first monsters, their look loaded (guard);
 *      v2.3.4640: then back just inside the safe ground's edge, the look
 *      still loaded -- the farm trip is the safe ground's (zonejudge.js);
 *      v2.3.5003: and the Flame Fields' banner strip held there (guard);
 *   3. the Feed & Seed's "Visit Your Farm" (a real touch) takes you onto the
 *      farm, all of it drawn (guard);
 *   4. ON THE FARM, NONE OF THE WHEEL'S PICTURES ARE HELD: no banner strip,
 *      no building's picture, no signpost icon, no monster look -- and what
 *      the page holds, against what it held at the Flame Fields;
 *   5. back out through the farm's gate: in the Wheel again, every one of
 *      them loaded again behind its loading screen, the minimap wearing the
 *      buildings' pictures, the monsters' look back;
 *   6. no page errors.
 *
 *   node tools/qa/mp/run.mjs farmfree
 * On the build before it, step 4 finds all of them still held.  The memory
 * read at each stop goes to tools/qa/mp/out/farmfree.json.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FARM_GATE, FARM_THINGS } from '../../../src/data/farmLayout.js';

const PHONE = { width: 390, height: 844 };
const FOOT_DY = 52;   /* a body's middle to its boots on the farm (mp-farmwalk) */

/* what the page holds of the Wheel's own pictures, and in all */
const held = (P) => P.page.evaluate(() => {
  const zb = window.__btZoneBanner;
  const bi = window.__btBuildingIcons ? window.__btBuildingIcons() : null;
  const bundles = window.__btBundles ? window.__btBundles() : {};
  const g = window.__btGpuTex ? window.__btGpuTex(1) : null;
  const bh = window.__btBanners ? window.__btBanners() : null;   /* v2.3.5003 */
  return {
    banners: zb ? zb.resident().slice().sort() : null,
    bannerWant: bh ? bh.want.slice().sort() : null,   /* v2.3.5003: the strips wanted where you stand */
    bld: bi ? { loaded: bi.loaded, grey: bi.grey, textures: bi.textures } : null,
    /* the build before had only the signposts' own probe, written while the
       Wheel draws them (on the farm, the last count it wrote) */
    posts: window.__btSignpostIconsHeld ? window.__btSignpostIconsHeld() : (typeof window.__btSignpostIcons === 'number' ? window.__btSignpostIcons : null),
    bundles,
    gpu: g && !g.err ? g.mb : null,
    cached: g && !g.err && g.cacheNotOnGpu ? g.cacheNotOnGpu.mb : null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Farmfree', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await A.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const until = async (fn, pred, ms) => {
    let v = null;
    for (let t0 = Date.now(); Date.now() - t0 < ms;) { v = await fn().catch(() => null); if (v && pred(v)) return v; await A.page.waitForTimeout(300); }
    return v;
  };
  const mem = {};
  try {
    await H.enterWorld(A);
    const wa = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!wa, wa);
    if (!wa) return;
    const id = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    /* ── 1. the Wheel's own pictures, in BroTown ── */
    /* v2.3.5003: no land's banner strip in BroTown (held only near its land;
       mp-wheelmap holds that) -- the guard is the buildings and signposts */
    const town = await until(() => held(A), (h) => h.banners && h.bld && h.bld.loaded >= 10 && h.posts >= 8, 30000);
    mem.town = town;
    rec.ok(`1. in BroTown the Wheel's own pictures are in: banner strips ${JSON.stringify(town && town.banners)}, ${town && town.bld && town.bld.loaded} buildings' pictures, ${town && town.posts} signpost icons (guard)`,
      !!town && !!town.banners && town.bld.loaded >= 10 && town.posts >= 8, town);

    /* ── 2. out at the Flame Fields' first monsters, their look loaded ── */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.ember.points[0];
    await H.glideTo(A, at[0], at[1] + 40, { speed: 450, timeoutMs: 120000 });
    const out = await until(() => held(A), (h) => Object.keys(h.bundles || {}).length >= 1, 60000);
    const looks = Object.keys((out && out.bundles) || {});
    mem.wilds = out;
    rec.ok(`2. at the Flame Fields' first monsters, their look loaded: ${looks.join(', ') || 'none'} (guard)`, looks.length >= 1, out);
    /* v2.3.4640: the farm trip is taken from the safe ground, where the
       Feed & Seed's door is -- the worker refuses a way out of the world
       from anywhere else (server/src/zonejudge.js).  A few steps back
       toward BroTown, just inside its edge: the first stretch's monsters
       stand a few hundred px outside it, so their look stays loaded */
    const { WHEEL_CENTRE, WHEEL_SAFE_R } = await import(H.REPO + '/server/src/wheelspawns.js');
    const ra = Math.hypot(at[0] - WHEEL_CENTRE[0], at[1] - WHEEL_CENTRE[1]);
    const ke = (WHEEL_SAFE_R - 150) / ra;
    await H.glideTo(A, WHEEL_CENTRE[0] + (at[0] - WHEEL_CENTRE[0]) * ke, WHEEL_CENTRE[1] + (at[1] - WHEEL_CENTRE[1]) * ke, { speed: 450, timeoutMs: 60000 });
    const edge = await until(() => held(A), (h) => looks.every((k) => h.bundles && h.bundles[k]) && h.banners && h.banners.includes('fire'), 15000);
    rec.ok(`2b. back on the safe ground's edge, their look still loaded (guard)`, !!edge && looks.every((k) => edge.bundles && edge.bundles[k]), edge && edge.bundles);
    /* v2.3.5003: and the Flame Fields' banner strip, the land you are on the
       edge of, held (the one the farm trip must let go) */
    rec.ok(`2c. ...and the Flame Fields' banner strip held there (${JSON.stringify(edge && edge.banners)}) (guard)`, !!edge && !!edge.banners && edge.banners.includes('fire'), edge && { banners: edge.banners, want: edge.bannerWant });

    /* ── 3. the Feed & Seed's "Visit Your Farm", a real touch ── */
    await A.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
    const visit = await until(() => A.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }), (v) => !!v, 8000);
    if (visit) await A.page.touchscreen.tap(visit.x, visit.y);
    const onFarm = await until(() => H.readState(A, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') })),
      (v) => v.zone === 'farm_home' && !v.hold && !v.veil, 30000);
    const world = await until(() => A.page.evaluate(() => (window.__btFarmWorld ? window.__btFarmWorld() : null)), (w) => w.built, 10000);
    rec.ok(`3. "Visit Your Farm" takes you onto the farm, all of it drawn (${world && world.things} things of ${FARM_THINGS.length}) (guard)`,
      !!onFarm && onFarm.zone === 'farm_home' && !!world && world.built && world.things === FARM_THINGS.length, { onFarm, world });

    /* ── 4. on the farm, none of the Wheel's pictures held ── */
    /* the release runs a beat after the warp (the renderer has not yet seen
       the flip), and a sheet's unload is a promise: give it a moment */
    await A.page.waitForTimeout(2000);
    const farm = await held(A);
    mem.farm = farm;
    const lookLeft = looks.filter((k) => farm.bundles && farm.bundles[k]);
    /* v2.3.5003: no land's strip at all (the farm has none of its own) --
       measured against the four, not the town's (none there now) */
    const bannersLeft = (farm.banners || []).filter((b) => ['desert', 'fire', 'forest', 'frost'].includes(b));
    rec.ok(`4. on the farm none of the Wheel's pictures are held: banner strips ${JSON.stringify(bannersLeft)}, buildings' pictures ${farm.bld && farm.bld.loaded}/${farm.bld && farm.bld.textures}, signpost icons ${farm.posts}, monster looks ${JSON.stringify(lookLeft)} -- the page ${farm.gpu} MB on the GPU and ${farm.cached} cached (at the Flame Fields ${out && out.gpu} and ${out && out.cached})`,
      bannersLeft.length === 0 && farm.bld && farm.bld.loaded === 0 && farm.bld.textures === 0 && farm.posts === 0 && lookLeft.length === 0, { farm, looks, edge: edge && edge.banners });

    /* ── 5. back out through the gate: all of it loaded again ── */
    await H.hopTo(A, FARM_GATE.x, 1376 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    const back = await until(() => H.readState(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, veil: !!document.querySelector('.bt-zone-loading') })),
      (v) => v.zone === 'wheel' && !v.loading && !v.veil, 60000);
    rec.ok(`5a. the farm's gate takes you back out to the world (${back && back.zone}) (guard)`, !!back && back.zone === 'wheel' && !back.loading, back);
    /* v2.3.5003: the banner strips: the ones wanted where you came back in */
    const bannersBack = (h) => !!h.banners && !!h.bannerWant && h.bannerWant.every((b) => h.banners.includes(b));
    const again = await until(() => held(A), (h) => h.banners && h.bld && h.bld.loaded >= (town ? town.bld.loaded : 10) && h.posts >= 8
      && bannersBack(h), 30000);
    mem.back = again;
    rec.ok(`5b. in the world again every one of them is loaded again: banner strips ${JSON.stringify(again && again.banners)} (wanted there ${JSON.stringify(again && again.bannerWant)}), ${again && again.bld && again.bld.loaded} buildings' pictures, ${again && again.posts} signpost icons`,
      !!again && !!town && bannersBack(again) && again.bld.loaded >= town.bld.loaded && again.posts >= 8, again);
    const mini = await until(() => A.page.evaluate(() => (window.__btMinimap && window.__btMinimap.buildingIcons) || null), (b) => b.n >= 10, 20000);
    rec.ok(`5c. the minimap wears the buildings' pictures again (${mini && mini.n})`, !!mini && mini.n >= 10, mini);
    const lookBack = await until(() => held(A), (h) => looks.every((k) => h.bundles && h.bundles[k]), 60000);
    rec.ok(`5d. the monsters' look loaded again where you left (${looks.filter((k) => lookBack && lookBack.bundles && lookBack.bundles[k]).join(', ') || 'none'})`,
      !!lookBack && looks.every((k) => lookBack.bundles && lookBack.bundles[k]), lookBack && lookBack.bundles);

    try { writeFileSync(join(OUT, 'farmfree.json'), JSON.stringify(mem, null, 1)); } catch (e) { /* the checks say */ }
    console.log('    held (MB on the GPU / cached): BroTown', town && town.gpu, '/', town && town.cached,
      '· the Flame Fields', out && out.gpu, '/', out && out.cached, '· the farm', farm.gpu, '/', farm.cached, '· back', again && again.gpu, '/', again && again.cached);
    rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive = true;
    await A.ctx.close().catch(() => {});
  }
}
