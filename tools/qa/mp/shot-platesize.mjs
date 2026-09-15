/* v2.3.2590: photograph the plate at the sizes and over the grounds it is
 * actually judged on.
 *
 * Owner: "The name plates are also a bit too large and distracting. Maybe more
 * muted background color and smaller overall."
 *
 * "Distracting" is an AGGREGATE judgement -- it is about a field of plates over
 * a moving scene, not about one plate on a clean background, which is the whole
 * argument v2.3.2530 records for why the mockup was right and the shipped plate
 * still felt wrong.  So this captures SEVERAL plates at once, at both common
 * phone widths, in portrait AND landscape, over the two grounds the plate
 * composites most differently against:
 *
 *   frost  -- the brightest ground in the game.  A translucent dark plate is
 *             at its most visible here, and its NAME contrast at its worst.
 *   verdant -- mid-tone green.  NOT 'meadow': the Starting Meadow is not a
 *             spoke on the World View map (effects.js WORLDVIEW_EXITS), so the
 *             dev warp has no route to it and the first cut of this reported
 *             "could not reach meadow" twice before that was checked rather
 *             than assumed.  Verdant Wilds is the reachable grass zone.
 *
 * Run: node tools/qa/mp/shot-platesize.mjs <outDir>
 */
import { mkdirSync } from 'node:fs';
import * as H from './harness.mjs';

const OUT = process.argv[2] || 'tools/qa/out/platesize';

const VIEWS = [
  { key: 'p360', w: 360, h: 800, label: '360x800 portrait' },
  { key: 'p390', w: 390, h: 844, label: '390x844 portrait' },
  { key: 'land', w: 844, h: 390, label: '844x390 landscape' },
];
/* A spread of levels so several BANDS are on screen at once -- the plate's
   loudness is partly its ring, and a field of one colour would understate it. */
const CAST = [
  { arch: 'fodder', level: 1 },
  { arch: 'brute', level: 3 },
  { arch: 'snowman', level: 5 },
  { arch: 'brute', level: 9 },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const wsPort = await H.freePort(), webPort = await H.freePort();
  const worker = await H.startWorker(wsPort);
  const srv = await H.serveDist(webPort);
  const browser = await H.launch();
  const done = async () => {
    await browser.close().catch(() => {});
    try { srv.close(); } catch { /* best effort */ }
    await H.stopWorker(worker).catch(() => {});
  };
  try {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
      isMobile: true, hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.addInitScript((p) => { window.BROTOWN_WS_URL = `ws://127.0.0.1:${p}`; }, wsPort);
    await page.goto(`http://localhost:${webPort}/`, { waitUntil: 'domcontentloaded' });
    const P = { ctx, page, logs: [], name: 'Hunter' };
    await H.enterWorld(P);
    await page.waitForTimeout(2500);

    /* The town gate is the tut_1 quest record -- the dev warp walks the real
       hub graph and a gated player never leaves town, which is why the first
       cut of this silently produced no shots at all.  "Finish all quests" is
       the same admin route the dev panel calls, and it clears the town gate
       and the per-zone quest gates together (the mp-lootzone precedent). */
    const myId = await H.readState(P, (S) => S.myId);
    await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/quests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${H.ADMIN_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myId }),
    }).then((r) => r.json()).catch((e) => ({ err: String(e) }));
    await H.waitFor(P, (S) => !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1), (v) => v,
      { timeout: 10000, label: 'tut_1 echoed' }).catch(() => {});
    /* ...and survive the trip.  HP is server-authoritative, so topping it up on
       the client is overwritten by the next player_state -- the first cut of
       this photographed "YOU DIED" over the snowfield twice before that was
       traced rather than patched client-side.  /dev/vitals is the admin route
       the test panel uses, and its god mode is bounded server-side so it cannot
       be left on. */
    const godOn = () => fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/vitals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${H.ADMIN_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myId, heal: true, god: true, godMinutes: 10 }),
    }).then((r) => r.json()).catch((e) => ({ err: String(e) }));
    console.log('  vitals:', JSON.stringify(await godOn()));

    for (const zone of ['verdant', 'frost']) {
      /* Hand the world back before travelling.  The shots below inject fake
         monsters and switch `_serverMonsters` off; leaving that in place across
         a zone change means warping with a stale entity list the new zone never
         owned, and the second warp of the first cut of this silently never
         arrived.  The viewport goes back to portrait for the same reason the
         monsters do -- the warp is measured from a known state, not from
         whatever the last shot left behind. */
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => {
        const S = window._gameState.current;
        S.monsters = [];
        S._serverMonsters = true;
        S._devWarp = null;
      });
      await page.waitForTimeout(900);
      /* The dev warp walks the hub graph a leg at a time behind the per-zone
         loading overlay; touching the player mid-load orphans the gate
         (v2.3.1406), so this waits it out rather than poking. */
      await page.evaluate((z) => {
        window._gameState.current._devWarp = { to: z, legs: 0, t: Date.now(), nextAt: 0 };
      }, zone);
      const got = await H.waitFor(P, (S) => S.currentZone, (z) => z === zone,
        { timeout: 45000, label: 'warp ' + zone }).catch(() => null);
      if (got !== zone) { console.log(`  !! could not reach ${zone}, skipping`); continue; }
      await H.waitFor(P, (S) => !S._zoneLoading, (v) => v,
        { timeout: 15000, label: zone + ' loaded' }).catch(() => {});
      await page.waitForTimeout(1200);
      await godOn();            /* a zone change can outlast a heal */

      for (const v of VIEWS) {
        await page.setViewportSize({ width: v.w, height: v.h });
        await page.waitForTimeout(700);        /* let the camera re-fit */
        /* Injected rather than travelled to: the plate has to be photographed
           with a KNOWN spread of levels, and whatever the zone happened to
           spawn would make the bands on screen a matter of luck. */
        await page.evaluate(async (cast) => {
          const S = window._gameState.current;
          S._serverMonsters = false;
          /* Keep the character ALIVE and whole.  The zone's own monsters are
             still simulated server-side even with the client list replaced, so
             the first cut of this photographed a corpse with an empty HP bar --
             which is a picture of the death screen, not of the name plates. */
          if (S.rpg) { S.rpg.hp = S.rpg.maxHp || 100; S._dying = false; S._deathStart = 0; }
          S.monsters = cast.map((c, i) => {
            /* Two rows of two, tight enough that all four plates stay inside a
               360px-wide frame -- at ±120 the outer pair clipped the screen
               edge and the shot showed half a plate. */
            const cols = 2;
            const x = S.player.x + (i % cols === 0 ? -88 : 88);
            const y = S.player.y - 155 + Math.floor(i / cols) * 78;
            return {
              id: 'sz_' + i, arch: c.arch, archetype: c.arch, type: c.arch,
              x, y, renderX: x, renderY: y, spawnX: x, spawnY: y, targetX: x, targetY: y,
              hp: 500, curHp: 500, maxHp: 500, dmg: 0, level: c.level, gold: 0,
              alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
              respawnAt: 0, moveTimer: 0, _stuckArrows: [],
            };
          });
          await new Promise((r) => setTimeout(r, 1500));
          if (S.rpg) S.rpg.hp = S.rpg.maxHp || 100;   /* and still alive at the shutter */
          await new Promise((r) => setTimeout(r, 400));
        }, CAST);
        await page.screenshot({ path: `${OUT}/${zone}-${v.key}.png` });
        console.log(`  shot ${zone} ${v.label}`);
      }
    }

    /* The numbers behind the picture, read off the renderer so the caption on
       the contact sheet is measured rather than asserted. */
    const soft = await page.evaluate(() => {
      const p = ((window.__btMonsterPlates || {}).plates || []).find((x) => x.soft);
      return p ? { fillAlpha: p.soft.fillAlpha, pillH: p.soft.pillH,
        type: p.soft.pillTypePx, stroke: p.soft.levelStroke,
        strokePx: p.soft.levelStrokePx, cssSize: p.cssSize } : null;
    });
    console.log('\n  as drawn:', JSON.stringify(soft));
  } finally {
    await done();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
