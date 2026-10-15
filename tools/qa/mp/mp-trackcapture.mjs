/* ═══ v2.3.3240: A REAL PHONE'S 2-SECOND LOOK, FOR THE LOAD TEST'S BOTS ═══
 *
 * Every phone sends `track` every 2 s (BroTown.jsx): its whole look, level,
 * HP, weapon and the inspect card's stats.  The worker relays each one to
 * every other player as a message of its own (index.js case 'track',
 * broadcastExcept), so what it weighs matters at scale.  This opens a phone
 * page in the Wheel, catches the first `track` it sends, and writes its
 * payload to tools/qa/load/track-sample.json, which tools/qa/load/bots.mjs
 * sends (`--track`) with each bot's own name and place put in.  Re-run it when
 * the payload changes:
 *
 *   node tools/qa/mp/run.mjs trackcapture
 *
 * The character is a fresh one with nothing drawn, so the sample is the
 * plainest look: each drawing a player has made (shirt, trousers, tattoos)
 * adds up to 256 characters more.
 */
import * as H from './harness.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

function catchTrack() {
  window.__btTrackSeen = [];
  const send = WebSocket.prototype.send;
  WebSocket.prototype.send = function (d) {
    /* v2.3.3254: a frame may be a bundle (a JSON array of messages): the
       track is caught out of it, as it would have gone alone */
    if (typeof d === 'string' && d.indexOf('"type":"track"') >= 0 && window.__btTrackSeen.length < 4) {
      try {
        const v = JSON.parse(d);
        for (const m of Array.isArray(v) ? v : [v]) if (m && m.type === 'track' && window.__btTrackSeen.length < 4) window.__btTrackSeen.push(JSON.stringify(m));
      } catch (e) { /* not ours */ }
    }
    return send.call(this, d);
  };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Sampler', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, init: catchTrack });
  await H.enterWorld(P);
  let got = null;
  for (let i = 0; i < 60 && !got; i++) {
    await P.page.waitForTimeout(1000);
    got = await P.page.evaluate(() => (window.__btTrackSeen && window.__btTrackSeen.length > 1 ? window.__btTrackSeen[window.__btTrackSeen.length - 1] : null));
  }
  rec.ok('the phone sent its 2 s look (track) at least twice', !!got);
  if (!got) return;
  const msg = JSON.parse(got);
  const data = msg.data || {};
  /* the bot puts in its own; the rest is the phone's */
  delete data.x; delete data.y; delete data.name;
  const out = join(H.REPO, 'tools', 'qa', 'load', 'track-sample.json');
  writeFileSync(out, JSON.stringify(data, null, 1) + '\n');
  console.log(`  trackcapture: ${got.length} bytes on the wire, ${Object.keys(data).length} fields; written to ${out}`);
  rec.ok('the sample has the look and the inspect card (rpgData)', !!data.rpgData && typeof data.sk !== 'undefined', Object.keys(data).slice(0, 12));
}
