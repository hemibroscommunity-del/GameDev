/* Town's NPCs and buildings load and free with town (v2.3.2859).
 *
 * Owner: "Is there any other memory savings ... (Or removed from the mostly
 * costly memory?)" -- then "Yeah do that".
 *
 * npcSprites.loadTownScenery used to be global: sixteen NPC walk strips, the
 * fountain and four buildings, 35MB held in every field zone that can never
 * draw them.  Now they load with town and free a beat after you leave, and the
 * walk strips load cropped.  The claim has three halves, checked here:
 *
 *   SMALLER IN THE FIELD -- out of town, not one NPC figure, walk strip,
 *   town prop or town's ground map is resident (__btTex).
 *
 *   SMALLER IN TOWN -- the walk strips are held cropped, under half their
 *   whole-strip bytes (__btTownScenery).
 *
 *   NEVER SEEN WITHOUT ITS ART -- the risk.  There are many ways into town and
 *   each could draw the NPCs as emoji stand-ins for a second.  An in-page
 *   sampler watches EVERY animation frame through two re-entries (a death
 *   respawn, and the worldview exit) and fails on any frame that is in town,
 *   without town's art, and not under the loading veil.  Then the NPCs must be
 *   drawn with real art again.
 */
import * as H from './harness.mjs';

const TILE = 32;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

async function goto(P, list, zoneId) {
  const mark = await P.page.evaluate(({ which, z }) => {
    const f = window._gameFns || {};
    const arr = (which === 'town' ? f.TOWN_EXITS : f.WORLDVIEW_EXITS) || [];
    const e = arr.find((x) => x.zoneId === z);
    return e ? { tx: e.tx, ty: e.ty } : null;
  }, { which: list, z: zoneId });
  if (!mark) return null;
  await stand(P, mark.tx * TILE + 16, mark.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === zoneId, { timeout: 40000 }).catch(() => {});
  await P.page.waitForTimeout(4000);   /* past the overlay and the one-beat free */
  return H.readState(P, (S) => S.currentZone);
}

const scenery = (P) => P.page.evaluate(() => (window.__btTownScenery ? window.__btTownScenery() : null));

/* Town-only art still resident: NPC figures and walk strips (not the dialogue
   portraits, "-head", which stay global) and town's props. */
const townKeys = (P) => P.page.evaluate(() => {
  const t = window.__btTex ? window.__btTex(true) : null;
  if (!t) return null;
  const hit = t.list.filter((r) => (/\/sprites\/npc\//.test(r.k) && !/-head\.webp/.test(r.k))
    || /\/sprites\/props\/(fountain|mayor-house|bank|auction-house|forge|market-stall|anvil|bench|lamp-post)/.test(r.k)
    || /\/maps\/town_/.test(r.k));   /* town's own ground map frees with it too */
  return { mb: t.mb, keys: hit.map((r) => r.k), keyMb: +hit.reduce((a, r) => a + r.mb, 0).toFixed(2) };
});

/* The sampler: every rAF, is the player in town without its art and without
   the veil?  Installed before a re-entry, read after. */
const armSampler = (P) => P.page.evaluate(() => {
  const w = window;
  window.__tsSample = { frames: 0, townFrames: 0, bare: 0, veiled: 0, firstBare: null };
  const tick = () => {
    const s = w.__tsSample;
    if (!s || s.stop) return;
    const S = w._gameState && w._gameState.current;
    s.frames++;
    if (S && S.currentZone === 'town') {
      s.townFrames++;
      const veil = !!document.querySelector('.bt-zone-loading');
      let ready = w.__btTownScenery && w.__btTownScenery().ready;
      if (ready && !veil) {
        /* ...and the ground: town's map must be resident too */
        const t = w.__btTex ? w.__btTex(true) : null;
        ready = !!(t && t.list.some((r) => /\/maps\/town_/.test(r.k)));
      }
      if (veil) s.veiled++;
      if (!ready && !veil) { s.bare++; if (!s.firstBare) s.firstBare = { t: Date.now(), npcs: (S.npcs || []).length }; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
/* v2.3.2859: the frame floor is a guard that the sampler RAN, not a rate --
   under software GL a respawn draws a few frames a second, and a floor of 30
   failed with zero bare frames seen.  bare === 0 is the check. */
const readSampler = (P) => P.page.evaluate(() => { const s = window.__tsSample; if (s) s.stop = true; return s; });

/* Each NPC display on the stage right now: drawn with real art means the
   figure's texture has a live source and the emoji stand-in is hidden.  Read
   off the live scene graph, because the renderer's __btNpcSprites record is
   never cleared and would still hold the last visit's figures. */
const npcArt = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  const R = window._pixiRenderer;
  const stage = R && R.app && R.app.stage;
  const found = [];
  const walk = (c, d) => {
    if (!c || d > 10) return;
    if (c._fig && c._avatar) found.push(c);
    for (const k of c.children || []) walk(k, d + 1);
  };
  walk(stage, 0);
  const real = found.filter((c) => {
    const t = c._fig.texture;
    return t && t.source && !t.source.destroyed && (t.source.width || 0) > 1 && !c._avatar.visible;
  });
  return { npcs: (S && S.npcs || []).length, displays: found.length, drawn: real.length,
    walkers: (window.__btTownScenery && window.__btTownScenery().walkers) || 0 };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Townie', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const s0 = await scenery(P);
  rec.ok('town\'s art is loaded on arrival from the loading screen', !!(s0 && s0.ready && s0.walkers >= 3), s0);
  const a0 = await npcArt(P);
  rec.ok('...and the townsfolk are drawn with it', a0.npcs > 0 && a0.drawn >= a0.npcs, a0);
  rec.ok('the walk strips are held cropped, under half their whole bytes',
    !!(s0 && s0.crops >= 12 && s0.cropMb > 0 && s0.wholeMb > 0 && s0.cropMb < s0.wholeMb / 2), s0);
  const k0 = await townKeys(P);
  console.log(`INFO  townscenery :: town ${k0.mb} MB, town-only art ${k0.keyMb} MB in ${k0.keys.length} keys, walk crops ${s0 && s0.cropMb} MB of ${s0 && s0.wholeMb} MB whole`);

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1500);

  const hub = await goto(P, 'town', 'worldview');
  rec.ok('reached the worldview hub (guard)', hub === 'worldview', { hub });
  if (hub !== 'worldview') { await P.ctx.close().catch(() => {}); return; }
  const s1 = await scenery(P);
  const k1 = await townKeys(P);
  rec.ok('out of town, town\'s art is released', !!(s1 && !s1.ready && s1.crops === 0 && !s1.bundle) && k1.keys.length === 0,
    { s1, left: k1.keys });

  const inZone = await goto(P, 'worldview', 'ember');
  rec.ok('reached ember (guard)', inZone === 'ember', { inZone });
  if (inZone !== 'ember') { await P.ctx.close().catch(() => {}); return; }
  const k2 = await townKeys(P);
  rec.ok('...and stays released in a field zone', k2.keys.length === 0, { left: k2.keys });
  console.log(`INFO  townscenery :: ember ${k2.mb} MB with no town art resident`);

  /* Re-entry 1: die in ember, respawn in town (not through any gate). */
  await armSampler(P);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.hp = 0; S._dying = true; S._deathStart = Date.now() - 21000;
    S.rpg.hp = S.rpg.maxHp || 50;
  });
  const back = await H.waitFor(P, (S) => (S._dying ? null : S.currentZone),
    (z) => z === 'town', { timeout: 40000, label: 'respawn into town' }).catch(() => null);
  rec.ok('the death respawned us in town (guard)', back === 'town', { back });
  await P.page.waitForTimeout(4000);
  const d1 = await readSampler(P);
  rec.ok('after a respawn, town is never on screen without its art or the veil',
    !!(d1 && d1.townFrames >= 10 && d1.bare === 0), d1);
  const s3 = await scenery(P);
  const a3 = await npcArt(P);
  rec.ok('...and the art is back, the townsfolk drawn with it', !!(s3 && s3.ready) && a3.drawn >= a3.npcs && a3.npcs > 0, { s3, a3 });
  const held = await H.readState(P, (S) => !!S._townArtHold);
  rec.ok('...and the hold on the player is lifted', held === false, { held });

  /* Re-entry 2: out to worldview, back in through the hub gate. */
  const hub2 = await goto(P, 'town', 'worldview');
  rec.ok('back out to worldview (guard)', hub2 === 'worldview', { hub2 });
  if (hub2 === 'worldview') {
    const s4 = await scenery(P);
    rec.ok('released again on the second exit', !!(s4 && !s4.ready), s4);
    await armSampler(P);
    const town2 = await goto(P, 'worldview', 'town');
    const d2 = await readSampler(P);
    rec.ok('walked back into town through the worldview exit (guard)', town2 === 'town', { town2 });
    rec.ok('through the worldview exit, town is never on screen without its art or the veil',
      !!(d2 && d2.townFrames >= 10 && d2.bare === 0), d2);
    const a5 = await npcArt(P);
    const s5 = await scenery(P);
    rec.ok('...and the townsfolk are drawn with real art', !!(s5 && s5.ready) && a5.drawn >= a5.npcs && a5.npcs > 0, { s5, a5 });
  }

  await P.ctx.close().catch(() => {});
}
