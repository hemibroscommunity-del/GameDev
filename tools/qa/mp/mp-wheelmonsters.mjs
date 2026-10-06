/* ═══ THE WHEEL'S MONSTERS, MET (v2.3.2978) ═══
 *
 * Owner, 2026-10-02: "can you place the monsters where they belong in their
 * zones (on the ends closest to the central map)?"
 *
 * On a phone viewport, against a real worker, in `?trial=wheel`:
 *   1. town's World View stairs lead into the Wheel's own zone, 'wheel' (the
 *      worker advertises caps.wheelmonsters), and the worker agrees;
 *   2. every element zone's monsters are there, each saying its home, each
 *      skinned as at home (fire goblins, snowmen, fishmen, rock monsters,
 *      mummies, wisps and lurkers, blue slimes, slimes);
 *   3. each land's stand at the inner end of its own spoke, past the commons;
 *   4. their art was loaded on the way in, behind the overlay: walk up to the
 *      snowmen and the fire goblins and every body is drawn from a live
 *      texture on the first frame -- since v2.3.2989 (the owner: "Yes only
 *      load as you walk towards it") the Wheel arrives with NONE of their
 *      looks, and a land's loads on the way toward it, before any of its
 *      monsters is on screen (wheelMonsterArt.js);
 *   5. one of them fights back and dies to you, and the kill pays (XP);
 *   6. back in town the Wheel's monster art is let go;
 *   7. no page errors, and no render errors.
 * Pictures in tools/qa/mp/out/wheelmonsters-*.png.
 *
 * v2.3.3013: the lands' next three stretches have monsters too (levels 6-20,
 * mp-wheeldeep), 192 in all; what this scenario says of "each land's six" is
 * said of the first stretch's, the ones at the inner end.  v2.3.3093: and the
 * second stage's four (levels 21-40, mp-wheelpast20), 384 in all.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
/* v2.3.2978: the Wheel is its own zone, 'wheel', against a worker that runs
   its monsters (server/src/wheelzone.js) */
const SKIN = { frost: ['snowman'], ember: ['fireGoblin'], sky: ['mummy', 'skeleton'], hollows: ['rockmonster'],
  thunder: ['fodder'], tidal: ['fishman'], mist: ['mireWisp', 'bogLurker'], verdant: ['blueSlime'] };
/* v2.3.3013: the first stretch's (ids wm-<home>-<k>; the deeper ones' are
   wm-<home>-t<tier>-<k>) */
const isFirst = (m) => !/-t\d+-\d+$/.test(m.id);

const holdTitle = (P, ms) => P.page.evaluate(async (hold) => {
  const el = document.querySelector('.bt-zone-header__title');
  if (!el) return 'no title element';
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  await new Promise((res) => setTimeout(res, hold));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  return 'ok';
}, ms);
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);
const waitZone = async (P, want, n = 60, gap = 1000) => {
  let zone = null;
  for (let i = 0; i < n; i++) {
    zone = await H.readState(P, (S) => S.currentZone);
    if (zone === want && !(await H.readState(P, (S) => !!S._zoneLoading))) return zone;
    await P.page.waitForTimeout(gap);
  }
  return zone;
};
/* the monsters the client holds, with what the renderer drew for each */
const monsters = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return (S.monsters || []).map((m) => {
    const sp = window.__btMonsterSprite ? window.__btMonsterSprite(m.id) : null;
    return { id: m.id, home: m.home || null, arch: m.arch || m.archetype, type: m.type, x: Math.round(m.x), y: Math.round(m.y),
      alive: m.alive, hp: m.hp, level: m.level, sprite: sp ? { visible: sp.visible, texAlive: sp.texAlive, texW: sp.texW } : null };
  });
});

/* decoded monster art resident: the cropped strips of every monster bundle
   still held (zoneTextures: __btBundles says which are, __btStripTrim what
   each strip cost once packed), plus any sheet loaded whole under
   /sprites/monsters/ (__btTex, w*h*4, the GPU's measure) -- less the slime,
   which is global */
const monsterMb = (P) => P.page.evaluate(() => {
  const t = window.__btTex ? window.__btTex(true) : null;
  const held = window.__btBundles ? window.__btBundles() : {};
  const byUrl = new Map();
  for (const st of (window.__btStripTrim ? window.__btStripTrim() : [])) byUrl.set(st.url, st);
  let strips = 0;
  const byBundle = {};
  for (const st of byUrl.values()) {
    if (!held[st.bundle] || st.bundle === 'slime') continue;
    strips += st.packedBytes / 1048576;
    byBundle[st.bundle] = +((byBundle[st.bundle] || 0) + st.packedBytes / 1048576).toFixed(1);
  }
  let whole = 0;
  for (const r of (t && t.list) || []) if (r.k.indexOf('/sprites/monsters/') >= 0 && r.k.indexOf('/sprites/monsters/slime-') < 0) whole += r.mb;
  return { all: t ? t.mb : null, monsters: +(strips + whole).toFixed(1), whole: +whole.toFixed(1), byBundle };
});

let firstThrow = null, phase = 'start';
export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `wheelmonsters-${name}.png`) });
  const { TOWN_EXITS } = await import(H.REPO + '/src/data/effects.js');
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');

  const P = await H.newPlayer(browser, { name: 'Ranger', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel' });
  P.page.on('console', (m) => { if (!firstThrow && /app\.render threw/.test(m.text())) firstThrow = '[during: ' + phase + '] ' + m.text(); });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  if (!(await panelUp(P))) { await holdTitle(P, 1500); await P.page.waitForTimeout(900); }
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1500);
  await tap(P, 'Finish all quests');
  await P.page.waitForTimeout(2000);
  await tap(P, 'Close');
  await P.page.waitForTimeout(600);
  const myId = await H.readState(P, (S) => S.myId);

  /* ── 1. the way in ── */
  phase = 'the way in';
  const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.wheelmonsters));
  const door = TOWN_EXITS.find((e) => e.zoneId === 'worldview');
  const mem0 = await monsterMb(P);
  const tIn = Date.now();
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  const zone = await waitZone(P, 'wheel', 120, 250);
  const wayInS = +((Date.now() - tIn) / 1000).toFixed(1);
  rec.ok(`the worker runs the Wheel's monsters (caps.wheelmonsters) and town's stairs lead into its own zone, 'wheel' (${zone}, ${wayInS} s from the stairs, overlay and all)`,
    caps && zone === 'wheel', { caps, zone, wayInS });

  /* ── 2. every land's own ── */
  phase = 'the list';
  await P.page.waitForTimeout(1500);
  const every = await monsters(P);
  const all = every.filter(isFirst);   /* v2.3.3013: the inner end's */
  const byHome = {};
  for (const m of all) (byHome[m.home] = byHome[m.home] || []).push(m);
  rec.ok(`every element zone's monsters are there, each saying its home (${all.length} at the inner ends: ${Object.entries(byHome).map(([h, a]) => `${h} ${a.length}`).join(', ')}; ${every.length} in all with the deeper stretches)`,
    all.length === 48 && every.length === 384 && Object.keys(SKIN).every((h) => (byHome[h] || []).length === 6), Object.keys(byHome));
  const wrongSkin = every.filter((m) => !(SKIN[m.home] || []).includes(m.arch));
  rec.ok('...each skinned as at home: fire goblins, snowmen, fishmen, rock monsters, mummies, wisps and lurkers, blue slimes, slimes',
    wrongSkin.length === 0, wrongSkin.slice(0, 6).map((m) => ({ id: m.id, home: m.home, arch: m.arch })));
  const mem1 = await monsterMb(P);
  /* v2.3.2989: ...and none of their looks is loaded yet -- they come as you
     walk toward a land */
  const art1 = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null));
  rec.ok(`...and the Wheel arrives with none of their looks: monster sheets ${mem0 && mem0.monsters} MB in town, ${mem1 && mem1.monsters} MB here (until v2.3.2989 all eight lands', loaded on the way in)`,
    !!art1 && art1.zone === 'wheel' && Object.keys(art1.looks).length === 0 && !!(mem0 && mem1) && mem1.monsters <= mem0.monsters + 1, { art1, mem0, mem1 });
  /* v2.3.2978: ...and from Brotown's square, 3,000 px and more from every one
     of them, none is drawn: the renderer leaves a monster far off screen
     undrawn in the Wheel (entityRenderer, FAR_MARGIN) */
  const farHidden = await H.readState(P, (S) => S._monstersFarHidden);
  rec.ok(`...and from Brotown's square, far off screen, none of them is drawn (${farHidden} of ${every.length} left undrawn)`,
    farHidden === every.length && every.length === 384, farHidden);
  /* ── 3. at the inner end of their own spoke ── */
  const C = 21504;
  const misplaced = all.filter((m) => {
    const at = WHEEL_SPAWNS[m.home];
    if (!at) return true;
    const r = Math.hypot(m.x - C, m.y - C);
    const ax = at.anchor[0] - C, ay = at.anchor[1] - C;
    const cos = ((m.x - C) * ax + (m.y - C) * ay) / (r * Math.hypot(ax, ay));
    return r < at.band[0] - 500 || r > at.band[1] + 500 || cos < 0.9;
  });
  rec.ok(`...each land's at the inner end of its own spoke, just past the commons (${Math.round(Math.min(...all.map((m) => Math.hypot(m.x - C, m.y - C))))} px from the centre at the nearest)`,
    misplaced.length === 0, misplaced.slice(0, 4));

  /* ── 4. drawn from art loaded on the way in ── */
  const drawnNear = async (home) => {
    const at = WHEEL_SPAWNS[home].points[0];
    phase = 'walk to ' + home;
    await H.hopTo(P, at[0] + 260, at[1] + 260, { tries: 200 });
    /* ...then into the middle of the land's six, where they are, so the
       picture shows them */
    const mid = await P.page.evaluate((h) => {
      const ms = (window._gameState.current.monsters || []).filter((m) => m.home === h && m.alive !== false && !/-t\d+-\d+$/.test(m.id));
      if (!ms.length) return null;
      return { x: ms.reduce((a, m) => a + m.x, 0) / ms.length, y: ms.reduce((a, m) => a + m.y, 0) / ms.length };
    }, home);
    if (mid) await H.hopTo(P, mid.x, mid.y + 40, { tries: 40 });
    await P.page.waitForTimeout(1200);
    const ms = (await monsters(P)).filter((m) => m.home === home && isFirst(m));
    return ms;
  };
  /* v2.3.2996: untouchable for the walk (the dev panel's own god mode: hits
     still come, and land as 0).  It stands you in the middle of each land's
     six without fighting back, which was always a thin margin -- six
     snowmen's 14s and six goblins' 10s -- and since a goblin's hit also sets
     you burning (server/src/monsterstatus.js) it stopped surviving: the art
     is under test here, not how long you last standing still.  Off again,
     at full health, for the fight below. */
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 5 });
  const snow = await drawnNear('frost');
  await shot(P, 'frost');
  /* v2.3.3017: read here, on Frost Ridge -- the looks are by land now
     (wheelMonsterArt.js foreignBox), so on the Flame Fields the snowman's
     is let go behind you */
  const artFrost = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null));
  const snowDrawn = snow.filter((m) => m.sprite && m.sprite.visible && m.sprite.texAlive);
  rec.ok(`on Frost Ridge's inner end the snowmen are drawn from live art (${snowDrawn.length} of ${snow.length} bodies)`,
    snow.length === 6 && snowDrawn.length >= 1 && snow.filter((m) => m.sprite).every((m) => m.sprite.texAlive), snow.map((m) => m.sprite));
  const gob = await drawnNear('ember');
  await shot(P, 'ember');
  const gobDrawn = gob.filter((m) => m.sprite && m.sprite.visible && m.sprite.texAlive);
  rec.ok(`...and on the Flame Fields' the fire goblins (${gobDrawn.length} of ${gob.length})`,
    gob.length === 6 && gobDrawn.length >= 1 && gob.filter((m) => m.sprite).every((m) => m.sprite.texAlive), gob.map((m) => m.sprite));

  const memWalk = await monsterMb(P);   /* after two lands' objects and ground came in too */
  /* v2.3.2989: their looks came on the way, before any of their monsters was
     on screen (the renderer counts a monster in view it could not draw yet,
     and how long the longest wait lasted) */
  const art2 = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null));
  rec.ok(`walking out to Frost Ridge and the Flame Fields, their looks loaded on the way, before any of their monsters was on screen (${art2 && art2.loads} loaded, the slowest in ${art2 && art2.maxMs} ms; the longest a monster in view waited: ${art2 && art2.waitedMs} ms)`,
    !!artFrost && artFrost.looks.snowman === 'ready' && artFrost.land === 'frost'
      && !!art2 && art2.looks.fireGoblin === 'ready' && art2.land === 'ember' && art2.waitedMs === 0 && !!memWalk && memWalk.monsters > mem0.monsters + 3, { artFrost, art2, memWalk });
  /* v2.3.3017: ...and on the Flame Fields only its own: the Wind Dunes'
     mummies and skeletons, ~1,600 px off across the water, are not loaded
     (the owner's black screen: four looks were held there, ~57 MB) */
  rec.ok(`...and on the Flame Fields only the land's own look is wanted: not the Wind Dunes' mummy and skeleton across the water (looks: ${art2 ? Object.keys(art2.looks).join(', ') : '?'}; another land's load within ${art2 && art2.near ? art2.near.join(' x ') : '?'} px of you, across x up-and-down)`,
    !!art2 && !art2.looks.mummy && !art2.looks.skeleton && !!art2.near && art2.near[0] >= 1000 && art2.near[1] >= 1000, art2);
  /* ── 5. a fight ── */
  phase = 'the fight';
  /* v2.3.2996: and mortal again, at full health, for a fight that answers back */
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: false });
  /* The swing is the same `monster_damage` the game sends (mp-capekill), stood
     on the goblin: the server gates melee on PVE_MELEE_RANGE and recomputes
     the damage, so this is intent and repetition, exactly as a player's client
     sends it.  (Space is the DODGE -- the first run of this test pressed it
     thirty times and fought nothing.) */
  const xpOf = () => H.readState(P, (S) => (S.rpg && S.rpg.xp) || 0);
  const xp0 = await xpOf();
  let killed = null, target = null, rounds = 0;
  const near = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).filter((x) => x && x.home === 'ember' && x.alive !== false && x.hp > 0)
      .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
    return m ? { x: m.x, y: m.y } : null;
  });
  if (near) await H.hopTo(P, near.x, near.y + 20, { tries: 40 });
  const devState = async (id) => (await (await fetch(
    'http://127.0.0.1:' + wsPort + '/api/admin/dev/state?id=' + encodeURIComponent(id),
    { headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } })).json());
  const trace = [];
  for (; rounds < 12 && !killed; rounds++) {
    target = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = (S.monsters || []).filter((x) => x && x.home === 'ember' && x.alive !== false && x.hp > 0)
        .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
      if (!m) return null;
      return { id: m.id, zone: S.currentZone, hp: m.hp, x: m.x, y: m.y };
    });
    if (!target) { await P.page.waitForTimeout(500); continue; }
    /* walk onto it at a pace the worker accepts (its anti-teleport cap is
       500 px/s + 80): a jump it refuses leaves you out of reach on its side,
       and every swing then misses -- what one run on a loaded box did */
    await H.hopTo(P, target.x, target.y + 10, { step: 60, tries: 20 });
    if (trace.length < 4) {
      const sv = await devState(myId).catch(() => null);
      const cl = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
      trace.push({ round: rounds, client: cl, server: sv && { z: sv.zone || sv.z, x: sv.x, y: sv.y } });
    }
    for (let swing = 0; swing < 12; swing++) {
      await H.sendEvent(P, 'monster_damage', { monsterId: target.id, zone: target.zone, slot: 'melee' });
      await P.page.waitForTimeout(120);
    }
    killed = await P.page.evaluate((id) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x && x.id === id);
      return !m ? { id, gone: true } : (m.alive === false || m.hp <= 0) ? { id, home: m.home, arch: m.arch } : null;
    }, target.id);
  }
  await P.page.waitForTimeout(1200);
  const xp1 = await xpOf();
  const me = await H.readState(P, (S) => ({ zone: S.currentZone, hp: S.rpg && S.rpg.hp, dead: !!(S.player && S.player.dead) }));
  console.log('    fight: ' + JSON.stringify({ rounds, trace }));
  await shot(P, 'fight');
  rec.ok(`a fire goblin of the Wheel fights and dies to you, and the kill pays (xp ${xp0} -> ${xp1})`,
    !!killed && !killed.gone && killed.home === 'ember' && xp1 > xp0, { killed, xp0, xp1, rounds, target, me, trace });

  /* ── 6. home, and the art let go ── */
  phase = 'home';
  /* back to the square first, then onto the marker beside where you landed
     (mp-wheeltrial step 5) */
  const exit = await P.page.evaluate(() => {
    const S = window._gameState.current;
    for (let y = 0; y < S.map.length; y++) { const row = S.map[y]; const x = row.indexOf(8); if (x >= 0) return { tx: x, ty: y }; }
    return null;
  });
  if (exit) {
    await H.hopTo(P, exit.tx * 32 + 16 + 200, exit.ty * 32 + 16, { step: 200, tries: 200 });
    await H.hopTo(P, exit.tx * 32 + 16 + 40, exit.ty * 32 + 16, { tries: 20 });
  }
  const homeZone = await waitZone(P, 'town', 40, 700);
  await P.page.waitForTimeout(1500);
  const after = await monsters(P);
  const where = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y), dead: !!S.player.dead, hp: S.rpg && S.rpg.hp }));
  rec.ok(`back in town, none of the Wheel's monsters is held (${after.length} in town)`, homeZone === 'town' && after.every((m) => !m.home),
    { homeZone, n: after.length, exit, where });
  const mem2 = await monsterMb(P);
  /* the looks loaded on the way -- let go on the way out (freeZoneAssets, by
     ZONES.wheel.homes), and the loader no longer running */
  const art3 = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null));
  rec.ok(`...and their art is let go: monster sheets ${mem0 && mem0.monsters} MB in town, ${mem1 && mem1.monsters} MB on arriving in the Wheel, ${memWalk && memWalk.monsters} MB after two lands, ${mem2 && mem2.monsters} MB back home (all textures ${mem0 && mem0.all} -> ${mem1 && mem1.all} on arrival, ${memWalk && memWalk.all} after two lands -> ${mem2 && mem2.all} MB; the ground's pieces are not in these)`,
    !!(mem0 && mem1 && mem2 && memWalk) && memWalk.monsters > mem0.monsters + 3 && mem2.monsters <= mem0.monsters + 1 && !!art3 && art3.zone === null, { mem0, mem1, memWalk, mem2, art3 });

  const pageErrors = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok('no page errors, and no render errors', pageErrors.length === 0 && !firstThrow, { errors: pageErrors.slice(0, 5), firstThrow: firstThrow && firstThrow.slice(0, 600) });
  void myId;
}
