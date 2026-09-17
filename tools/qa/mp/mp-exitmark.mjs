/* ═══ v2.3.2605: CAN YOU SEE THE WAY OUT? ═══
 *
 * Owner: "Exit areas aren't obvious enough once you're in that zone."
 *
 * The way out of a spoke is its RETURN MARKER — map tile 9 — and the world
 * already draws one: tileRenderer paints a green pulsing halo on the tile and,
 * since v2.3.2070, a PORTAL_BEAM plume rising from it.  So this is not a
 * missing feature, it is a legibility problem, and the only honest way to
 * argue about legibility is to measure it and to look.
 *
 * WHY TWO ZONES AND NOT ONE.  The owner's own warning applies: what reads over
 * sand can vanish over snow.  `ember` is a dark lava ridge and `frost` a bright
 * ice crag, and the marker's colour (0x3dd497, a mint green) sits at a
 * different distance from each.  A change that is judged on ember alone is a
 * change judged on the background that flatters it.
 *
 * WHAT IS ASSERTED.  Two things, both read from the renderer's own probes
 * (`__btZoneLabels`, `__btPortals`) rather than re-derived here — TRAPS §35:
 * a test that copies the value out of the game stops testing the game.
 *   1. The "Way Out" label lands ON THE MAP.  This is the whole item: the
 *      label existed, and `_exitLabelPos` put it in the black margin OUTSIDE
 *      the playfield, where it is on screen only once you have already walked
 *      to the edge of the map and found the exit yourself.
 *   2. The way-home beam wears the mint tint tile 9 already owns in the halo
 *      pass, instead of the plain white every other beam used.
 *
 * AND IT TAKES THE PICTURES, which are the honest artefact for a legibility
 * change — the design call is made by looking at them, not by a number.
 *
 * A NUMBER THAT WAS DELETED.  The first cut projected the marker into screen
 * space with its own camera arithmetic and sampled a contrast value there.  The
 * projection was a guess that fell back to zoom 1 — which the world is not
 * drawn at — so it sampled bare ground and reported a confident 13–29 for every
 * zone and viewport alike.  That is TRAPS §40 ("a screenshot is not in CSS
 * pixels, so a rect offset samples the wrong place").  It was removed rather
 * than tuned: a measurement nobody can site-check is worse than no measurement,
 * because it reads as evidence.
 *
 * THE PLAYER STANDS SIX TILES OFF, toward the zone centre.  RETURN_R is 2
 * (manhattan, zoneTransitions.js), so six is clear of the trigger with room to
 * spare — standing any closer ends the scenario by walking through the door it
 * is trying to photograph.
 *
 *   node tools/qa/mp/run.mjs exitmark
 *   ZM_TAG=after node tools/qa/mp/run.mjs exitmark     # name the shots
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUT = `${H.REPO}/tools/qa/mp/out`;
mkdirSync(OUT, { recursive: true });
const TILE = 32;
/* `before` unless told otherwise, so an unflagged run cannot silently
   overwrite the control shots it is meant to be compared against. */
const TAG = process.env.ZM_TAG || 'before';

/* The pair, and why: a dark zone and a bright one.  Both are live spokes with
   painted art (mp-zonebanner's note lists what a player can actually reach). */
const ZONES = ['ember', 'frost'];

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

/* Hub-hop to a zone by its declared exit, re-standing because a single
   placement can be walked off by the same frame's movement pass — and never
   while the per-zone gate is armed (mp-zonebanner's note, v2.3.1406). */
async function goto(P, list, zoneId, settle = 4200) {
  const mark = await P.page.evaluate(({ which, z }) => {
    const f = window._gameFns || {};
    const arr = (which === 'town' ? f.TOWN_EXITS : f.WORLDVIEW_EXITS) || [];
    const e = arr.find((x) => x.zoneId === z);
    return e ? { tx: e.tx, ty: e.ty } : null;
  }, { which: list, z: zoneId });
  if (!mark) return null;
  for (let i = 0; i < 6; i++) {
    const st = await H.readState(P, (S) => ({ z: S.currentZone, loading: !!S._zoneLoading }));
    if (st.z === zoneId) break;
    if (!st.loading) await stand(P, mark.tx * TILE + 16, mark.ty * TILE + 16);
    await H.waitFor(P, (S) => S.currentZone, (z) => z === zoneId, { timeout: 9000 }).catch(() => null);
  }
  await P.page.waitForTimeout(settle);
  return H.readState(P, (S) => S.currentZone);
}

async function leaveSpoke(P) {
  const was = await H.readState(P, (S) => S.currentZone);
  await P.page.evaluate(() => {
    const S = window._gameState.current, m = S && S.map;
    if (!m) return;
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < m[y].length; x++) {
        if (m[y][x] === 9) { S.player.x = x * 32 + 16; S.player.y = y * 32 + 16; return; }
      }
    }
  });
  await H.waitFor(P, (S) => S.currentZone, (z) => z !== was, { timeout: 30000 }).catch(() => {});
  await P.page.waitForTimeout(2200);
  return H.readState(P, (S) => S.currentZone);
}

async function toWorldview(P) {
  let z = await H.readState(P, (S) => S.currentZone);
  if (z !== 'town' && z !== 'worldview') z = await leaveSpoke(P);
  if (z === 'worldview') return z;
  if (z === 'town') return goto(P, 'town', 'worldview', 2500);
  return z;
}

/* Put the camera on the marker: stand SIX tiles from it toward the zone
   centre, so the marker sits between the player and the map edge and is on
   screen in every orientation. */
async function parkNearMarker(P) {
  return P.page.evaluate(() => {
    const S = window._gameState.current, m = S && S.map;
    if (!m || !S.player) return null;
    let best = null;
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < (m[y] || []).length; x++) if (m[y][x] === 9) { best = { tx: x, ty: y }; break; }
      if (best) break;
    }
    if (!best) return null;
    const cx = m[0].length / 2, cy = m.length / 2;
    const dx = cx - best.tx, dy = cy - best.ty;
    const len = Math.max(0.001, Math.hypot(dx, dy));
    S.player.x = (best.tx + (dx / len) * 6) * 32 + 16;
    S.player.y = (best.ty + (dy / len) * 6) * 32 + 16;
    return { marker: best, px: S.player.x, py: S.player.y };
  });
}

export async function run({ browser, wsPort, webPort, rec }) {
  for (const [label, vp, land, who] of [
    ['390-portrait', { width: 390, height: 844 }, false, 'Exita'],
    ['360-portrait', { width: 360, height: 800 }, false, 'Exitb'],
    ['390-landscape', { width: 844, height: 390 }, true, 'Exitc'],
    ['360-landscape', { width: 800, height: 360 }, true, 'Exitd'],
  ]) {
    /* Created in portrait always — the creator's Play button is below the fold
       in a 390-tall viewport, so a landscape context times out in enterWorld
       and it reads as a broken door (mp-catgrid's note). */
    const P = await H.newPlayer(browser, { name: who, wsPort, webPort,
      viewport: land ? { width: 390, height: 844 } : vp, touch: true });
    await H.enterWorld(P);
    await P.page.waitForTimeout(2400);
    if (land) { await P.page.setViewportSize(vp); await P.page.waitForTimeout(1200); }

    /* ═══ THE GATE OUT OF TOWN ═══
       A fresh character cannot leave town: the per-zone quest gate (v2.3.1817)
       bounces them back from the client side, silently.  The first run of this
       scenario spent 21 minutes discovering that -- every viewport reported
       `got: "town"` for both zones -- because a refused transition looks
       exactly like a slow one from here.  Accepting the tutorial quests opens
       it, the same way mp-zonebanner does. */
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
        S.channel.send({ type: 'quest_accept', payload: { questId: q } });
      }
    });
    await P.page.waitForTimeout(1500);

    const hub = await toWorldview(P);
    rec.ok(`${label}: reached the worldview hub (guard)`, hub === 'worldview', { hub });
    if (hub !== 'worldview') { await P.ctx.close().catch(() => {}); continue; }
    for (const zoneId of ZONES) {
      const here = await H.readState(P, (S) => S.currentZone);
      if (here !== 'worldview') await toWorldview(P);
      const got = await goto(P, 'worldview', zoneId, 5200);
      rec.ok(`${label}: reached ${zoneId} (guard)`, got === zoneId, { got, want: zoneId });
      if (got !== zoneId) continue;

      const parked = await parkNearMarker(P);
      rec.ok(`${label}/${zoneId}: the zone HAS a return marker (guard)`, !!parked, parked || {});
      if (!parked) continue;
      /* Let the pulse reach a consistent phase and the beam settle. */
      await P.page.waitForTimeout(1500);

      const name = `exitmark-${TAG}-${label}-${zoneId}`;
      await P.page.screenshot({ path: `${OUT}/${name}.png` });

      /* ═══ WHAT THE RENDERER SAYS IT DREW ═══
         The two claims below are read from the renderer's own probes rather
         than measured off the screenshot.  That is deliberate, and it is a
         correction: the first cut of this file projected the marker to screen
         space with its own camera arithmetic and sampled a contrast number
         from the pixels there.  The projection was a guess -- it fell back to
         zoom 1, which the world is not drawn at -- so it sampled bare ground
         and reported a confident 13-29 for every zone.  That is TRAPS §40
         exactly ("a screenshot is not in CSS pixels, so a rect offset samples
         the wrong place"), and the numbers were deleted rather than tuned.
         The screenshots are kept: they are the honest artefact, and the design
         call is made by looking at them. */
      const labels = await P.page.evaluate(() => window.__btZoneLabels || null);
      rec.ok(`${label}/${zoneId}: the renderer reports its zone labels (guard)`, !!labels, labels || {});
      if (labels) {
        const ways = labels.labels.filter((l) => l.text === 'Way Out');
        rec.ok(`${label}/${zoneId}: the way out is labelled`, ways.length >= 1,
          { ways, all: labels.labels });
        /* THE POINT OF THE WHOLE ITEM: a label in the black margin outside the
           map is a label you cannot see from inside the zone.
           TEXT-AGNOSTIC ON PURPOSE -- it checks EVERY visible label in the
           zone, not only the ones spelled "Way Out".  A spoke has no other
           labels (coming-soon marks are town/worldview only), and phrasing it
           this way is what makes the control run state the defect in its own
           numbers instead of merely coming up empty: against origin/main this
           row reports the old label at ember (528,1056) and frost (1064,912)
           on a 1024x1024 map -- 32px below the bottom edge and 40px past the
           right one, which is `_exitLabelPos`' margin arithmetic exactly. */
        const outside = labels.labels.filter((l) => l.x < 0 || l.y < 0 || l.x > labels.mapW || l.y > labels.mapH);
        rec.ok(`${label}/${zoneId}: ...on the map, not in the margin outside it`,
          labels.labels.length >= 1 && outside.length === 0,
          { outside, mapW: labels.mapW, mapH: labels.mapH, all: labels.labels });
      }
      const portals = await P.page.evaluate(() => window.__btPortals || null);
      rec.ok(`${label}/${zoneId}: the renderer reports its portals (guard)`, !!portals, { n: portals && portals.length });
      if (portals && portals.length) {
        /* A spoke's exits are all tile-9 ways home, so every beam here should
           wear the return tint -- 0x3dd497, the mint the halo pass already
           used; white (0xffffff) is what it used to be.
           EXCEPT THE ONE THE QUEST IS POINTING AT.  Quest gold outranks the
           return tint on purpose (see PORTAL_BEAM_RETURN_TINT's note), and the
           first version of this assertion demanded mint from EVERY beam --
           which failed in ember and passed in frost for a reason that had
           nothing to do with the change: ember's tutorial route happens to
           point at its way home, so that beam is legitimately gold.  A test
           that contradicts a rule the code states is a broken test, so the
           gold ones are excluded by the probe's own `questGold` flag rather
           than by a colour this file guesses at. */
        const beams = portals.filter((q) => q.beam);
        const plain = beams.filter((q) => !q.questGold);
        const tints = [...new Set(plain.map((q) => q.beam.tint))];
        rec.ok(`${label}/${zoneId}: the way-home beam is tinted mint, not white`,
          plain.length > 0 && tints.every((t) => t === 0x3dd497),
          { tints: tints.map((t) => '0x' + Number(t).toString(16)),
            goldCount: beams.length - plain.length, portals });
        /* ...and a gold one is still a REAL beam, not a dropped case. */
        const gold = beams.filter((q) => q.questGold);
        if (gold.length) {
          rec.ok(`${label}/${zoneId}: the exit the quest points at keeps quest gold`,
            gold.every((q) => q.beam.tint === 0xf5c542), { gold });
        }
      }
    }
    await P.ctx.close().catch(() => {});
  }
}
