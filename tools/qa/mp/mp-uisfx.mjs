/* ═══ v2.3.2637: THE THREE OWNER SOUNDS ACTUALLY DECODE ═══
   Owner supplied ui-equip, ui-close and a new quest-completion sound.

   WHY THIS SCENARIO EXISTS AT ALL. v2.3.1610's incident is the reason:
   NINETEEN sfx shipped MUTE because the registry listed them and nobody
   checked that the file behind the key decoded. A key in SFX_URLS proves
   a string exists, not that a sound plays. So this asks the running game
   to decode each one and report the buffer's duration -- a number you
   cannot get from a file that is missing, misnamed, or not audio. */
import * as H from './harness.mjs';

/* v2.3.2658: 'ui-click' joins them -- the owner's menu-navigation sound.
   Same reason as the original three: a key in the registry proves a string
   exists, not that a sound plays. */
const KEYS = ['ui-equip', 'ui-close', 'ui-click', 'quest-complete-v2'];

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Ears', wsPort, webPort });
  await H.enterWorld(P);

  /* The registry half: the keys exist and point somewhere plausible. */
  const urls = await P.page.evaluate((keys) => {
    const A = window.BT_AUDIO;
    if (!A) return null;
    const map = A.SFX_MANIFEST || null;
    const out = {};
    for (const k of keys) out[k] = map ? map[k] : undefined;
    return out;
  }, KEYS);
  rec.ok('BT_AUDIO is reachable from the page (guard)', urls !== null, urls);

  /* The half that matters: fetch each file and DECODE it. A 404, an HTML
     error page served as audio, or a truncated upload all fail here and all
     of them look fine in the registry. */
  const decoded = await P.page.evaluate(async (keys) => {
    const A = window.BT_AUDIO;
    const map = (A && A.SFX_MANIFEST) || {};
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const out = {};
    for (const k of keys) {
      const url = map[k];
      if (!url) { out[k] = { err: 'no url in registry' }; continue; }
      try {
        const r = await fetch(url);
        if (!r.ok) { out[k] = { err: 'http ' + r.status, url }; continue; }
        const buf = await r.arrayBuffer();
        const audio = await ctx.decodeAudioData(buf.slice(0));
        out[k] = { url, bytes: buf.byteLength, seconds: +audio.duration.toFixed(2), ch: audio.numberOfChannels };
      } catch (e) { out[k] = { err: String(e && e.message || e), url }; }
    }
    try { ctx.close(); } catch (e) { /* ignore */ }
    return out;
  }, KEYS);

  for (const k of KEYS) {
    const d = decoded[k] || {};
    rec.ok(`${k} decodes to real audio (not a 404 or a stub)`,
      !d.err && d.seconds > 0.05 && d.seconds < 12, d);
  }

  /* The two UI ticks must be SHORT -- they fire on every tap, and a sound
     that outlasts the gesture stacks on itself. The quest sound is allowed
     to be a fanfare, so it is deliberately not held to this. */
  /* ═══ v2.3.2641: A UI TICK IS SHORT, AND THAT IS MEASURED ═══
     The owner asked whether the files were too large. They were not -- but
     measuring answered a question nobody had asked: ui-equip was 0.94s, of
     which only the first 0.34s was audible and the rest digital silence.
     A sample longer than a gesture is what makes rapid taps pile up, so the
     length is now a TESTED property rather than an accident of the upload.
     0.6s is generous for a UI tick and still well under the old 0.94. */
  for (const k of ['ui-equip', 'ui-close', 'ui-click']) {
    const d = decoded[k] || {};
    rec.ok(`...and ${k} is a tick, not a tune (under 0.6s)`,
      !d.err && d.seconds > 0.05 && d.seconds < 0.6, d);
  }

  await P.ctx.close().catch(() => {});
}
