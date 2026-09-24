/* Monster strips, cropped (v2.3.2864).
 *
 * Owner: "find out how to reduce memory in ember too".
 *
 * zoneTextures.loadTrackedStrip crops every monster animation cell to its art
 * (the fire goblin was Ember's largest cost, 35MB decoded, 27-40% of every
 * cell empty) and hands back Textures whose `orig` is the whole cell.  Checked
 * here in Ember (the 256px goblin), Desert Winds (mummy) and Frost (the 128px
 * snowman, whose art nearly fills its cells, so most of it is declined):
 *
 *   SMALLER -- each zone's strips hold well under their whole bytes.
 *   IDENTICAL -- every cropped frame, drawn back at its trim, is byte-for-byte
 *   the cell of the served file (__btTrimVerify keeps the frames for this).
 *   DRAWN -- live monsters are drawn from cropped, live textures.
 *   FREED -- leaving the zone destroys the cropped canvases (the bundle is
 *   empty), and coming back loads them again, identical again.
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
  await P.page.waitForTimeout(5000);
  return H.readState(P, (S) => S.currentZone);
}

/* Bytes and identity for one bundle's strips, against the served files. */
const check = (P, bundle) => P.page.evaluate(async (b) => {
  const stats = (window.__btStripTrim ? window.__btStripTrim() : []).filter((s) => s.bundle === b);
  const byUrl = Object.create(null);
  for (const s of stats) byUrl[s.url] = s;   /* a reload re-records; the last one is live */
  const list = (window.__btStripTrimFrames ? window.__btStripTrimFrames() : null) || [];
  const out = { bundle: b, strips: 0, full: 0, packed: 0, frames: 0, trimmed: 0, dead: 0, mismatched: [] };
  const load = (u) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
  for (const url in byUrl) {
    out.strips++; out.full += byUrl[url].fullBytes; out.packed += byUrl[url].packedBytes;
    const rec = list.find((r) => r.url === url);
    if (!rec) { out.mismatched.push(url + ' no frames'); continue; }
    let img; try { img = await load(url); } catch (e) { out.mismatched.push(url + ' reload failed'); continue; }
    const { frames, fw, fh } = rec;
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      if (!f.source || f.source.destroyed || !f.source.resource) { out.dead++; continue; }
      if (f.trim) out.trimmed++;
      const a = document.createElement('canvas'); a.width = fw; a.height = fh;
      const ag = a.getContext('2d', { willReadFrequently: true }); ag.imageSmoothingEnabled = false;
      ag.drawImage(img, i * fw, 0, fw, fh, 0, 0, fw, fh);
      const c = document.createElement('canvas'); c.width = fw; c.height = fh;
      const cg = c.getContext('2d', { willReadFrequently: true }); cg.imageSmoothingEnabled = false;
      if (f.trim) cg.drawImage(f.source.resource, f.frame.x, f.frame.y, f.frame.width, f.frame.height, f.trim.x, f.trim.y, f.frame.width, f.frame.height);
      else cg.drawImage(f.source.resource, f.frame.x, f.frame.y, fw, fh, 0, 0, fw, fh);
      const da = ag.getImageData(0, 0, fw, fh).data, db = cg.getImageData(0, 0, fw, fh).data;
      let d = 0; for (let k = 0; k < da.length; k++) if (da[k] !== db[k]) d++;
      out.frames++;
      if (d) out.mismatched.push(`${url.split('?')[0]}#${i} ${d} bytes`);
    }
  }
  out.fullMb = +(out.full / 1048576).toFixed(2); out.packedMb = +(out.packed / 1048576).toFixed(2);
  return out;
}, bundle);

/* Live monsters in the zone, as the renderer draws them. */
const drawn = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  const out = { monsters: 0, sprites: 0, trimmed: 0, dead: 0 };
  for (const m of (S && S.monsters) || []) {
    if (!m || m.dead) continue;
    out.monsters++;
    const r = window.__btMonsterSprite ? window.__btMonsterSprite(m.id) : null;
    if (!r || !r.visible) continue;
    out.sprites++;
    if (r.trimmed) out.trimmed++;
    if (!r.texAlive) out.dead++;
  }
  return out;
});

const bundles = (P) => P.page.evaluate(() => (window.__btBundles ? window.__btBundles() : null));
const tex = (P) => P.page.evaluate(() => (window.__btTex ? window.__btTex() : null));

/* Leave a spoke the way a player does: its return trail-head is a map tile
   of value 9 (as mp-texdrift finds it). */
async function leaveSpoke(P) {
  const found = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.map) return null;
    for (let ty = 0; ty < S.map.length; ty++) {
      const row = S.map[ty];
      if (!row) continue;
      for (let tx = 0; tx < row.length; tx++) if (row[tx] === 9) return { tx, ty };
    }
    return null;
  });
  if (!found) return null;
  await stand(P, found.tx * TILE + 16, found.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview' || z === 'town', { timeout: 40000 }).catch(() => {});
  await P.page.waitForTimeout(3000);   /* past the one-beat free */
  return H.readState(P, (S) => S.currentZone);
}

async function zoneRound(P, rec, zone, bundle, label, expectCrop = true) {
  let at = await goto(P, 'worldview', zone);
  /* The worldview exits sit close together and a teleport onto one can land
     the player on a neighbour's trigger -- seen as arriving in town.  Walk
     back to worldview and try once more: the scenario tests the art, not the
     travel. */
  if (at !== zone && at === 'town') {
    if (await goto(P, 'town', 'worldview') === 'worldview') at = await goto(P, 'worldview', zone);
  }
  rec.ok(`${label}: reached ${zone} (guard)`, at === zone, { at });
  if (at !== zone) return false;
  const t = await tex(P);
  const c = await check(P, bundle);
  console.log(`INFO  monstertrim :: ${label} ${zone}: ${c.strips} strips ${c.packedMb} MB of ${c.fullMb} MB whole, resident total ${t && t.mb} MB`);
  if (expectCrop) {
    rec.ok(`${label}: ${zone}'s monster strips load cropped, well under their whole bytes`,
      c.strips > 0 && c.trimmed > 0 && c.packed < c.full * 0.85, c);
  } else {
    /* art that fills its cells: the packer declines it (its 90% rule), and
       what it does take must never cost more than the whole strip */
    rec.ok(`${label}: ${zone}'s strips go through the loader and never cost more than whole`,
      c.strips > 0 && c.packed <= c.full, c);
  }
  rec.ok(`${label}: every cropped frame is byte-identical to the served file`,
    c.frames > 0 && c.mismatched.length === 0 && c.dead === 0, { frames: c.frames, dead: c.dead, first: c.mismatched.slice(0, 5) });
  const d = await drawn(P);
  rec.ok(`${label}: the live monsters are drawn from ${expectCrop ? 'cropped, ' : ''}live textures`,
    d.sprites > 0 && (!expectCrop || d.trimmed > 0) && d.dead === 0, d);
  const back = await leaveSpoke(P);
  rec.ok(`${label}: back out of ${zone} (guard)`, back === 'worldview', { back });
  const b = await bundles(P);
  rec.ok(`${label}: leaving ${zone} frees its cropped strips`, !!b && !b[bundle], b);
  return back === 'worldview';
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tamer', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, init: () => { window.__btTrimVerify = true; } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1500);
  const hub = await goto(P, 'town', 'worldview');
  rec.ok('reached worldview (guard)', hub === 'worldview', { hub });
  if (hub !== 'worldview') { await P.ctx.close().catch(() => {}); return; }

  /* the order mp-texdrift tours reliably; ember again LAST -- the free must
     leave it loadable, not merely gone */
  await zoneRound(P, rec, 'ember', 'fireGoblin', 'first visit');
  /* sky: the mummy (and the skeleton it becomes) */
  await zoneRound(P, rec, 'sky', 'mummy', 'first visit');
  /* frost: the snowman's 128px cells are nearly full, so most strips are
     declined -- checked for identity and for never costing more */
  await zoneRound(P, rec, 'frost', 'snowman', 'first visit', false);
  await zoneRound(P, rec, 'ember', 'fireGoblin', 'second visit');
  await P.ctx.close().catch(() => {});
}
