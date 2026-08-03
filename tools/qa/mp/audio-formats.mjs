/* Every SFX in the manifest must DECODE in a Chromium-class browser.
 *
 * v2.3.1610.  BT_AUDIO.playFile has exactly one decode path —
 * ctx.decodeAudioData — and a container that path refuses is not a degraded
 * sound, it is SILENCE, with no error anywhere a player or the owner would
 * see.  That is how 19 of 30 sfx shipped mute on Chrome, Edge and Android for
 * as long as they had been .m4a: iOS Safari, the primary test device, decodes
 * AAC natively, so the bug was invisible on the only phone anyone checked.
 *
 * This walks the LIVE manifest out of the built bundle (not a hand-kept list,
 * which would drift the moment someone adds a sound) and decodes every entry
 * for real.  Exits non-zero on the first refusal, so it can gate a push.
 *
 *   node tools/qa/mp/audio-formats.mjs        # needs dist/ built
 */
import * as H from './harness.mjs';

const WEB = 8083;
const srv = await H.serveDist(WEB);
const b = await H.launch();
let bad = 0;
try {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.goto(`http://localhost:${WEB}/`, { waitUntil: 'domcontentloaded' });

  /* The manifest lands on window.BT_AUDIO as the bundle evaluates. */
  await p.waitForFunction(() => !!(window.BT_AUDIO && window.BT_AUDIO.SFX_MANIFEST), null, { timeout: 30000 });
  const entries = await p.evaluate(() => Object.entries(window.BT_AUDIO.SFX_MANIFEST));
  if (!entries.length) throw new Error('SFX_MANIFEST is empty — did dist/ build?');

  const out = await p.evaluate(async (list) => {
    const ctx = new AudioContext();
    const res = [];
    for (const [k, u] of list) {
      try {
        const r = await fetch(u);
        if (!r.ok) { res.push([k, u, 'HTTP ' + r.status]); continue; }
        await ctx.decodeAudioData(await r.arrayBuffer());
        res.push([k, u, 'ok']);
      } catch (e) { res.push([k, u, 'FAIL ' + String(e).slice(0, 60)]); }
    }
    return res;
  }, entries);

  for (const [k, u, s] of out) {
    if (s !== 'ok') { bad++; console.log(`  ${s.padEnd(24)} ${k}  ${u}`); }
  }
  console.log(`${out.length} sfx checked, ${bad} undecodable`);
  if (errs.length) console.log(`(page errors: ${errs.slice(0, 3).join(' | ')})`);
} catch (e) {
  console.log('ERROR ' + String(e).slice(0, 400));
  bad = 1;
} finally {
  await b.close(); srv.close();
}
process.exit(bad ? 1 : 0);
