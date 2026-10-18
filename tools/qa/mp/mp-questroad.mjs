/* THE GOLD ROAD AND THE FIRST-JOIN WELCOME — v2.3.2121.
 *
 * Owner: "make it so that during quests there's a light gold path to the next
 * area you're supposed to go to.  Also first time upon joining the game you
 * get a message about welcome to bro town and find the mayor because he wants
 * to speak with you."
 *
 * ASSERTED ON STATE, NOT PIXELS.  The road is drawn into a WebGL canvas, so a
 * scenario cannot look at it, and "are there gold pixels" was never the claim
 * worth testing anyway.  tileRenderer publishes window.__btQuestRoad every
 * frame — where the road points, how many motes it drew, how far it got and
 * whether something stopped it — and that is the claim: is it pointing at the
 * right thing.
 *
 * The probe is deliberately RESET to {to:null, motes:0} at the top of the draw
 * rather than left stale, so "no route" and "the trail code never ran" are
 * distinguishable here.  Several assertions below depend on that: a check that
 * the road is ABSENT is worthless if absent and never-ran look the same.
 *
 * THE WELCOME IS ONCE PER BROWSER, and "once" is a claim about the SECOND
 * time, so the scenario takes this context back through the door: reload,
 * re-arm the observer, enter the world again, and expect silence.  The flag
 * it writes on the first join (localStorage bt_welcome_seen) is checked
 * directly too, but the flag existing and the banner staying away are two
 * different assertions and the second is the one that matters.
 */
import * as H from './harness.mjs';

const road = (P) => P.page.evaluate(() => window.__btQuestRoad || null);

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── A BRAND-NEW BRO, which is the whole premise of the welcome ── */
  /* v2.3.2992: the road on the ground is put away (the way is on the
     minimap now: questTrailStyle.js GROUND_PATH) -- `?questpath` brings it
     back, and this keeps testing it that way, as the edge pieces are */
  const P = await H.newPlayer(browser, {
    name: 'Roadie', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 }, query: 'questpath',
  });

  /* The banner fires 1.2s after the intro lifts and holds 5.2s (questMsgMs's
     long hold, which 'welcome' joined in this version).  Recorded by observer
     rather than polled, for the reason mp-questbanner.mjs spells out: a poll
     races the fade and goes red on a slow box while passing locally. */
  await P.page.evaluate(() => {
    window.__wb = [];
    const obs = new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        const el = n.matches && n.matches('.bt-quest-banner')
          ? n : (n.querySelector && n.querySelector('.bt-quest-banner'));
        if (el) {
          const plate = el.querySelector('.bt-quest-plate');
          window.__wb.push({
            kind: el.getAttribute('data-quest-banner'),
            /* textContent, not innerText: this reads in the mutation tick,
               before the node has been laid out, and innerText forces (and
               depends on) layout that has not happened. */
            text: plate ? plate.textContent.replace(/\s+/g, ' ').trim() : null,
          });
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });

  await H.enterWorld(P);
  await P.page.waitForTimeout(4000);

  /* ── THE WELCOME ── */
  const banners = await P.page.evaluate(() => window.__wb || []);
  console.log('    banners: ' + JSON.stringify(banners));
  const welcome = banners.find((b) => b && b.kind === 'welcome') || null;
  rec.ok('a first-time player gets a welcome banner', !!welcome, banners);
  rec.ok('...headlined WELCOME, not QUEST ACCEPTED!',
    !!welcome && /WELCOME/.test(welcome.text || ''), welcome);
  /* The owner asked for two things in one message and both have to survive
     the copy: where you are, and who wants you. */
  rec.ok('...it names the town', !!welcome && /Bro Town/i.test(welcome.text || ''), welcome);
  rec.ok('...and sends you to the Mayor',
    !!welcome && /Mayor Bro/i.test(welcome.text || ''), welcome);
  /* v2.3.2992: ...along the gold road on the map, where the way is now */
  rec.ok('...along the gold road on your map', !!welcome && /gold road on your map/i.test(welcome.text || ''), welcome);
  /* v2.3.2890: its own, longer hold -- it carries the Skip tutorial button,
     and a button needs time to be reached (mp-tutskip) */
  rec.ok('...and it holds at least as long as a completion',
    await P.page.evaluate(() => window.__questMsgMs && window.__QUEST_MSG_LONG_MS
      && window.__questMsgMs('welcome') >= window.__QUEST_MSG_LONG_MS));
  rec.ok('...and the once-per-browser flag is set',
    await P.page.evaluate(() => {
      try { return localStorage.getItem('bt_welcome_seen') === '1'; } catch (e) { return false; }
    }));

  /* ── THE ROAD, with nothing accepted ──
     This is the case questRouteExit deliberately cannot answer: you are in
     town, no quest is running, and the minimap stars nothing (mp-queststar
     asserts exactly that as its control).  The road has to point at the man
     anyway, or the welcome's "find Mayor Bro" is a sentence with no world
     behind it. */
  const fresh = await road(P);
  console.log('    road: ' + JSON.stringify(fresh));
  rec.ok('the road probe is live (guard)', !!fresh, fresh);
  rec.ok('a brand-new player is pointed at Mayor Bro',
    !!fresh && !!fresh.to && fresh.to.npc === 'Mayor Bro', fresh);
  rec.ok('...and the road is actually drawn', !!fresh && fresh.motes > 0, fresh);
  /* The heading, not the whole route: it stops after TRAIL_TILES (7) or at
     the Mayor, whichever is nearer.  A road longer than that is the "stripe
     across the map art" the constants block rules out. */
  rec.ok('...and stops within the seven-tile heading',
    !!fresh && fresh.limitTiles > 0 && fresh.limitTiles <= 7.01, fresh);
  /* ═══ THE REGRESSION THIS SCENARIO EXISTS FOR ═══
     A new bro spawns at (910, 1130); Mayor Bro stands at (900, 780), eleven
     tiles due north — with a building squarely between them.  The first cut
     drew a straight line and stopped at the first blocked cell, so it died
     after ONE tile and the feature was invisible on its own opening screen.
     A road here that has no bend in it is that bug coming back. */
  /* v2.3.3340: ...asked from BEHIND a building.  Today's town (68 x 72 tiles
     since v2.3.2628) puts open ground between a new bro and Mayor Bro, so the
     road from there is one straight leg with its whole seven-tile heading, as
     it should be (the sweep of 2026-10-17: legs 1, limitTiles 7) -- and this
     check failed for want of a building.  So the scenario finds a spot whose
     straight line to the Mayor runs into a wall within the heading, on the
     grid the road itself walks (S._tiledWalkable, tileRenderer _questPath),
     stands there, reads the road, and goes back to where it was. */
  const fromBehind = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const zone = S.currentZone;
    const grid = S._tiledWalkable && S._tiledWalkable[zone];
    const Z = window.__btZones && window.__btZones[zone];
    const npc = (S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (!grid || !grid.length || !Z || !npc) return null;
    const TILE = 32;
    const gh = grid.length, gw = grid[0].length;
    const cw = (Z.w * TILE) / gw, ch = (Z.h * TILE) / gh;
    const open = (x, y) => {
      const gx = Math.floor(x / cw), gy = Math.floor(y / ch);
      const row = grid[gy];
      return !!row && gx >= 0 && gx < gw && row[gx] !== false && row[gx] !== 0;
    };
    const was = { x: S.player.x, y: S.player.y };
    const spots = [];
    for (let r = 9 * TILE; r <= 14 * TILE && spots.length < 8; r += TILE) {
      for (let a = 0; a < 72 && spots.length < 8; a++) {
        const t = (a / 72) * Math.PI * 2;
        const x = npc.x + Math.cos(t) * r, y = npc.y + Math.sin(t) * r;
        if (!open(x, y)) continue;
        let wall = false;
        for (let d = TILE; d <= 6 * TILE; d += Math.min(cw, ch) / 2) {
          const k = d / r;
          if (!open(x + (npc.x - x) * k, y + (npc.y - y) * k)) { wall = true; break; }
        }
        /* one spot a direction, so the tries are round different buildings */
        if (wall && !spots.some((p) => Math.hypot(p.x - x, p.y - y) < 4 * TILE)) {
          spots.push({ x: Math.round(x), y: Math.round(y), r: Math.round(r / TILE) });
        }
      }
    }
    return { was, spots };
  });
  rec.ok('spots behind a building, Mayor Bro beyond it, are found on the road\'s own grid (guard)',
    !!fromBehind && fromBehind.spots.length > 0, fromBehind);
  /* The road is asked from each until one bends: a building too wide for the
     road's search box (the heading plus 4 cells) leaves its nearest reach in
     front of the wall, which is a straight road and not this check's bug --
     the bug was a road dying after ONE tile where a way round existed. */
  let bentRoad = null;
  const tries = [];
  for (const at of (fromBehind && fromBehind.spots) || []) {
    await P.page.evaluate((p) => {
      const S = window._gameState.current;
      S.player.x = p.x; S.player.y = p.y;
    }, at);
    await P.page.waitForTimeout(700);
    const r = await road(P);
    tries.push({ at, legs: r && r.legs, bent: r && r.bent, limitTiles: r && r.limitTiles, motes: r && r.motes });
    if (r && r.to && r.to.npc === 'Mayor Bro' && r.bent && r.legs >= 2 && r.limitTiles >= 5 && r.motes > 0) { bentRoad = r; break; }
  }
  console.log('    roads from behind a building: ' + JSON.stringify(tries));
  if (fromBehind) {
    await P.page.evaluate((w) => {
      const S = window._gameState.current;
      S.player.x = w.x; S.player.y = w.y;
    }, fromBehind.was);
    await P.page.waitForTimeout(600);
  }
  rec.ok('...and it BENDS round the building instead of dying at it',
    !!bentRoad, { bentRoad, tries, fresh });

  /* The star's control still holds — the road is a SEPARATE export precisely
     so the minimap's portals-only contract did not change under it. */
  const star = await P.page.evaluate(() => {
    const m = window.__btMinimap;
    return m ? { route: m.questRoute, zone: m.zone } : null;
  });
  rec.ok('...while the minimap star is still silent (its contract is unchanged)',
    !!star && star.route === null && star.zone === 'town', star);

  /* ── ACCEPT: the road turns around and heads for the way out ──
     tut_1 sends you to Frost Ridge, which is behind the World View, so the
     next step from town is the town exit — the same routing questRouteExit
     has done since v2.3.1817, now with a road on it. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(2500);
  const going = await road(P);
  console.log('    road after accept: ' + JSON.stringify(going));
  rec.ok('accepting a quest re-points the road at the way OUT of town',
    !!going && !!going.to && going.to.zoneId === 'worldview', going);
  rec.ok('...and it is no longer pointing at the Mayor',
    !!going && !!going.to && !going.to.npc, going);
  rec.ok('...and it is still drawn', !!going && going.motes > 0, going);

  /* ── THE ARCH IT MEANS ── */
  const portals = await P.page.evaluate(() => window.__btPortals || null);
  console.log('    portals: ' + JSON.stringify(portals));
  /* The tint rides the BEAM sprite, and the beam has a Graphics fallback for
     a texture that did not load (v2.3.2070) — which would report questGold
     nowhere and turn every assertion below into a silent pass-by-absence.
     Guard on the key being present at all, so "the beams did not draw" reads
     as itself rather than as "no exit is gold". */
  const beamRan = (portals || []).some((p) => p && 'questGold' in p);
  rec.ok('the beam path ran, so the tint is measurable (guard)', beamRan, portals);
  const gold = (portals || []).filter((p) => p && p.questGold);
  rec.ok('exactly one exit beam burns gold — the quest\'s own',
    beamRan && gold.length === 1, portals);
  rec.ok('...and it is the one that leads where the road is pointing',
    gold.length === 1 && gold[0].zoneId === 'worldview', gold);
  rec.ok('...and no LOCKED exit was ever chosen',
    !(portals || []).some((p) => p && p.questGold && p.locked), portals);

  /* ── THE SECOND JOIN ──
     The welcome is once per BROWSER, so the proof is this same context coming
     back through the door: the flag written on the first join is the only
     thing standing between it and a second banner. */
  await P.page.reload();
  await P.page.evaluate(() => {
    window.__wb = [];
    const obs = new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        const el = n.matches && n.matches('.bt-quest-banner')
          ? n : (n.querySelector && n.querySelector('.bt-quest-banner'));
        if (el) window.__wb.push({ kind: el.getAttribute('data-quest-banner') });
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(4000);
  const again = await P.page.evaluate(() => window.__wb || []);
  console.log('    banners on rejoin: ' + JSON.stringify(again));
  rec.ok('the welcome does not fire a second time on the same browser',
    !again.some((b) => b && b.kind === 'welcome'), again);

  await P.ctx.close();
}
