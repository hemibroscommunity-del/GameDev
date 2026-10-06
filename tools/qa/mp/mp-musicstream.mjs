/* ═══ THE MUSIC IS STREAMED, NOT DECODED (v2.3.3073) ═══
 *
 * Every music track used to be decoded whole into raw PCM -- the session track
 * 23 MB, the town's 40 -- and held.  Now one <audio> element (the deck,
 * gameDisplay.js _deckSync) plays whichever track is audible straight from its
 * file through the music bus, so nothing of the music is decoded.
 * `?musicdecode` is the old way, for comparison.
 *
 * An init script keeps a weak reference to every AudioBuffer the page decodes.
 * Two phones (390 x 844) in the Wheel:
 *   1. streaming: music plays, from the deck, heard at its tap -- and none of
 *      it is decoded (no music-length AudioBuffer alive), where `?musicdecode`
 *      holds tens of MB of it (the saving, measured);
 *   2. a zone with a track takes the deck (frost.mp3), up to its level; a zone
 *      with none hands it back to the session track; with the Wheel's land
 *      watch back on (v2.3.3064), Brotown's track again;
 *   3. the track loops at its end and plays on;
 *   4. the mute and the music slider still silence it (the music bus);
 *   5. a rebuilt AudioContext (the iOS recovery path) gets a deck of its own,
 *      and the music plays again;
 *   6. a deck that fails turns streaming off for the session and the tracks
 *      come back decoded, as before -- never silence;
 *   7. no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const INIT = () => {
  window.__ab = [];
  const B = window.BaseAudioContext || window.AudioContext;
  if (!B || !B.prototype) return;
  const dad = B.prototype.decodeAudioData;
  B.prototype.decodeAudioData = function () {
    const p = dad.apply(this, arguments);
    if (p && p.then) p.then((b) => { try { window.__ab.push(new WeakRef(b)); } catch (e) { /* none */ } }, () => {});
    return p;
  };
  window.__abHeld = () => {
    let all = 0, music = 0, n = 0, nm = 0;
    for (const r of window.__ab) {
      const b = r.deref();
      if (!b) continue;
      const mb = b.length * b.numberOfChannels * 4 / 1048576;
      all += mb; n++;
      if (b.duration >= 30) { music += mb; nm++; }   /* music: the longest effect is ~29 s of wind */
    }
    return { all: +all.toFixed(1), music: +music.toFixed(1), n, nm };
  };
};

const deck = (P) => P.page.evaluate(() => (window.__btMusicDeck ? window.__btMusicDeck() : null));
const held = async (P) => {
  const cdp = await P.ctx.newCDPSession(P.page);
  await cdp.send('HeapProfiler.enable').catch(() => {});
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  await cdp.detach().catch(() => {});
  return P.page.evaluate(() => window.__abHeld());
};
async function waitDeck(P, pred, ms = 15000) {
  const t0 = Date.now();
  let v = null;
  while (Date.now() - t0 < ms) {
    v = await deck(P);
    if (v && pred(v)) return v;
    await P.page.waitForTimeout(250);
  }
  return null;
}
const tap = (P) => P.page.touchscreen.tap(PHONE.width / 2, PHONE.height * 0.35).catch(() => {});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'tunestream', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', init: INIT });
  const B = await H.newPlayer(browser, { name: 'tunedecode', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', init: INIT, query: 'musicdecode' });
  try {
    await H.enterWorld(P);
    await H.enterWorld(B);
    const inWheel = (Q) => H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    const okP = await inWheel(P), okB = await inWheel(B);
    rec.ok('both phones in the Wheel (guard)', !!okP && !!okB, { okP, okB });
    if (!okP || !okB) return;
    await tap(P); await tap(B);
    await P.page.waitForTimeout(8000);

    /* 1 */
    const d1 = await waitDeck(P, (v) => v.el && !v.el.paused && v.proven && v.gain > 0, 20000);
    console.log(`    streaming: ${JSON.stringify(d1)}`);
    rec.ok(`streaming: the music plays from the deck (${d1 && d1.cur && d1.cur.url}), heard at its tap, faded up (gain ${d1 && d1.gain})`,
      !!d1 && d1.streaming === true && /\/audio\/music\/(village|login-theme)\.mp3/.test((d1.cur && d1.cur.url) || ''), d1);
    const hp = await held(P), hb = await held(B);
    const bd = await B.page.evaluate(() => ({ global: !!BT_AUDIO._globalMusicBuffer, zones: Object.keys(BT_AUDIO._zoneMusicBuffers || {}).length, stream: BT_AUDIO._streamMusic() }));
    console.log(`    decoded sound held: streaming ${JSON.stringify(hp)}, ?musicdecode ${JSON.stringify(hb)} ${JSON.stringify(bd)}`);
    rec.ok(`...and none of the music is decoded: ${hp.music} MB of music-length AudioBuffers (?musicdecode: ${hb.music} MB in ${hb.nm}), all decoded sound ${hp.all} MB against ${hb.all} MB`,
      hp.music === 0 && hp.nm === 0 && d1 && d1.decoded.global === false && d1.decoded.zones === 0 && hb.music >= 20 && bd.stream === false, { hp, hb, bd });
    await B.ctx.close().catch(() => {});

    /* 2 -- asked for directly.  The Wheel's land watch (game/wheelMusic.js,
       v2.3.3064) puts the land's own track back on every frame it is not
       playing, so it is turned off for these asks, as `?nolandmusic` does;
       mp-landmusic walks the lands with the deck as it is. */
    await P.page.evaluate(() => { BT_AUDIO.wheelLandMusic = false; BT_AUDIO.startZoneAmbient('frost'); });
    const d2 = await waitDeck(P, (v) => v.cur && /frost\.mp3/.test(v.cur.url) && !v.el.paused && v.gain > 0.03, 8000);
    rec.ok(`a zone with a track takes the deck: ${d2 && d2.cur.url}, up to its level (${d2 && d2.gain})`, !!d2 && d2.zone && /frost\.mp3/.test(d2.zone), d2);
    await P.page.evaluate(() => BT_AUDIO.startZoneAmbient('wheel'));
    const d3 = await waitDeck(P, (v) => v.cur && /login-theme\.mp3/.test(v.cur.url) && !v.el.paused && v.gain > 0.02, 8000);
    rec.ok(`...a zone with none hands it back to the session track: ${d3 && d3.cur.url} (gain ${d3 && d3.gain}, ducked ${d3 && d3.ducked})`, !!d3 && d3.zone === null && d3.ducked === false, d3);
    /* the land watch back on: Brotown's track, which it asks for itself */
    await P.page.evaluate(() => { BT_AUDIO.wheelLandMusic = true; });
    const d4 = await waitDeck(P, (v) => v.cur && /village\.mp3/.test(v.cur.url) && !v.el.paused && v.gain > 0.03, 12000);
    rec.ok(`...and with the land watch back on, Brotown's track again: ${d4 && d4.cur.url}`, !!d4, d4);

    /* 3 */
    const dur = await waitDeck(P, (v) => v.el && v.el.dur > 0, 8000);
    rec.ok(`the track's length is known, as on the real host (byte ranges): ${dur && dur.el.dur} s (guard)`, !!dur, dur);
    if (!dur) return;
    await P.page.evaluate(() => { const el = BT_AUDIO._deck.el; el.currentTime = Math.max(0, el.duration - 1); });
    await P.page.waitForTimeout(2500);
    const d5 = await deck(P);
    rec.ok(`the track loops at its end and plays on (at ${d5 && d5.el.t} s of ${d5 && d5.el.dur} after being sent to its last second)`,
      !!d5 && d5.el.loop && !d5.el.paused && d5.el.t < 3 && /village\.mp3/.test(d5.cur.url), d5);

    /* 4 */
    await P.page.evaluate(() => BT_AUDIO.setMuted(true));
    await P.page.waitForTimeout(600);
    const muted = await P.page.evaluate(() => +BT_AUDIO._musicBus.gain.value.toFixed(4));
    await P.page.evaluate(() => BT_AUDIO.setMuted(false));
    await P.page.evaluate(() => BT_AUDIO.setLevels(0.5, 1));
    await P.page.waitForTimeout(600);
    const half = await P.page.evaluate(() => +BT_AUDIO._musicBus.gain.value.toFixed(4));
    await P.page.evaluate(() => BT_AUDIO.setLevels(1, 1));
    const d6 = await waitDeck(P, (v) => !v.el.paused && /village\.mp3/.test(v.cur.url), 6000);
    rec.ok(`the mute and the music slider still rule it (the music bus: muted ${muted}, at half ${half}), and it plays on after`, muted === 0 && Math.abs(half - 0.5) < 0.02 && !!d6, { muted, half, d6 });

    /* 5 */
    const ctx0 = await P.page.evaluate(() => { window.__ctx0 = BT_AUDIO.ctx; BT_AUDIO._rebuildContext(); BT_AUDIO._rebuildSources(); return true; });
    await tap(P);
    const d7 = await waitDeck(P, (v) => v.el && !v.el.paused && v.proven && v.gain > 0, 15000);
    const fresh = await P.page.evaluate(() => !!BT_AUDIO._deck && BT_AUDIO._deck.ctx === BT_AUDIO.ctx && BT_AUDIO.ctx !== window.__ctx0);
    rec.ok(`a rebuilt AudioContext gets a deck of its own and the music plays again (${d7 && d7.cur && d7.cur.url})`, ctx0 && fresh && !!d7, { fresh, d7 });

    /* 6 */
    await P.page.evaluate(() => BT_AUDIO._deckFail('qa'));
    const back = await H.waitFor(P, () => ({ src: !!BT_AUDIO._zoneMusicSource, stream: !!(BT_AUDIO._zoneMusicSource && BT_AUDIO._zoneMusicSource._stream),
      zones: Object.keys(BT_AUDIO._zoneMusicBuffers || {}).length, on: BT_AUDIO._streamMusic(), deck: !!BT_AUDIO._deck }),
    (v) => v.src && !v.stream && v.zones >= 1 && !v.deck, { timeout: 15000, label: 'decoded again' }).catch(() => null);
    rec.ok(`a deck that fails turns streaming off and the town's track comes back DECODED, as before (${JSON.stringify(back)})`, !!back && back.on === false, back);

    const errors = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    await P.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
