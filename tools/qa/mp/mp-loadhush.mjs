/* ═══ v2.3.3800: NO SOUND OF THE WORLD UNDER THE LOADING SCREEN ═══
 *
 * The owner: "when first loading the game don't play any music or sound
 * effects until the world is fully loaded.  It's a bit creepy hearing the
 * crowd murmur when you're not seeing anything on screen yet."
 *
 * Every sound a page starts is recorded from its first instant (an init
 * script on the page: each AudioBufferSourceNode / oscillator start, named by
 * the BT_AUDIO sample it plays, and each <audio> element's play), against the
 * loading screen's own marks (IntroVideo's window.__btIntro: mount and finish)
 * and the game's world-ready moment (BT_AUDIO's sound gate, window.__btSoundGate).
 *
 *   1. a fresh load (the creator, PLAY, the loading screen, the world):
 *      the loading screen came and went (guard);
 *   2. NOTHING of the world starts while it is up: no music, no ambient bed,
 *      no world sound effect between the loading screen's mount and the
 *      world-ready moment (the start screen's own clicks and the splash's
 *      theme before PLAY are the start screen's);
 *   3. the town's sound starts after it: the town's music or bed within
 *      ~2 s of the loading screen lifting;
 *   4. A RECONNECT: the socket dropped and back (the world veiled while it
 *      is away): no world sound starts while the veil is up, and the town's
 *      sound is there after;
 *   5. the Test panel's live switch ("Sound waits for the world",
 *      off_soundgate): off opens a closed gate at once, on again closes it;
 *   6. the failsafe: a loading class stuck past GATE_FAILSAFE_MS (3 s here)
 *      opens the gate anyway, counted;
 *   7. no page errors.
 *
 *   node tools/qa/mp/run.mjs loadhush
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* every sound start, from the page's first instant */
const SOUND_LOG = () => {
  /* the harness quiets the world's beds for every other scenario
     (__btAmbienceOff): this one hears the world as a player does */
  window.__btAmbienceOff = false;
  const log = [];
  window.__btSoundLog = log;
  /* the player's taps: a sound a tap asks for is the player's own */
  const taps = [];
  window.__btTapLog = taps;
  ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, () => taps.push(Date.now()), true));
  /* a real drop (mp-joingate's way): for a while every reconnect is refused */
  const RealWS = window.WebSocket;
  window.__blockUntil = 0;
  const W = function (url, ...rest) {
    if (Date.now() < window.__blockUntil) {
      const fake = { url, readyState: 0, send() {}, close() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } };
      setTimeout(() => { fake.readyState = 3; try { fake.onclose && fake.onclose({ code: 1006, reason: '' }); } catch (e) { /* */ } }, 120);
      return fake;
    }
    const ws = new RealWS(url, ...rest);
    window.__btWs = ws;
    return ws;
  };
  W.prototype = RealWS.prototype;
  W.CONNECTING = 0; W.OPEN = 1; W.CLOSING = 2; W.CLOSED = 3;
  window.WebSocket = W;
  const keyOf = (buf) => {
    try {
      const A = window.BT_AUDIO;
      if (!A || !buf) return null;
      for (const k in (A._samples || {})) if (A._samples[k] === buf) return k;
      if (A._globalMusicBuffer === buf) return 'music:global';
      for (const k in (A._zoneMusicBuffers || {})) if (A._zoneMusicBuffers[k] === buf) return 'music:' + k;
    } catch (e) { /* */ }
    return null;
  };
  /* AudioBufferSourceNode has a start of its own (offset, duration): both */
  for (const C of [window.AudioBufferSourceNode, window.OscillatorNode, window.AudioScheduledSourceNode]) {
    const S = C && C.prototype;
    if (!S || !Object.prototype.hasOwnProperty.call(S, 'start')) continue;
    const st = S.start;
    S.start = function (when) {
      try {
        if (!this.__btLogged) {
          this.__btLogged = true;
          const buf = this.buffer || null;
          const kick = buf && buf.length <= 2;   /* the context's one-sample wake (BT_AUDIO._wakeCtx) */
          if (!kick) log.push({ t: Date.now(), kind: window.OscillatorNode && this instanceof window.OscillatorNode ? 'osc' : 'buf', key: keyOf(buf), loop: !!this.loop, dur: buf ? +buf.duration.toFixed(2) : null, delay: when > 0 ? +(when - this.context.currentTime).toFixed(2) : 0 });
        }
      } catch (e) { /* */ }
      return st.apply(this, arguments);
    };
  }
  const M = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
  if (M && M.play) {
    const pl = M.play;
    M.play = function () {
      try { if (!(this instanceof window.HTMLVideoElement)) log.push({ t: Date.now(), kind: 'media', key: String(this.src || this.currentSrc || '')   /* src first: just after a change of track, currentSrc still names the old one */.replace(/^https?:\/\/[^/]+/, ''), loop: !!this.loop, muted: !!this.muted, vol: +(this.volume || 0).toFixed(2) }); } catch (e) { /* */ }
      return pl.apply(this, arguments);
    };
  }
};

const read = (P) => P.page.evaluate(() => ({
  log: (window.__btSoundLog || []).slice(),
  taps: (window.__btTapLog || []).slice(),
  intro: (window.__btIntro || []).slice(),
  gate: window.__btSoundGate ? window.__btSoundGate() : null,
  zone: window._gameState && window._gameState.current && window._gameState.current.currentZone,
}));

/* the player's own: a menu sound, or one asked for within the gate's tap
   window (BT_AUDIO.GATE_TAP_MS) of a tap */
const isOwn = (e, taps) => (e.key && /^ui-/.test(e.key)) || taps.some((t) => e.t >= t && e.t - t < 1500);
/* the town's own sound: its music, or a bed / loop of the world */
const isTownSound = (e) => e.kind === 'media' || (e.key && /^(music:|zoneamb-|amb-)/.test(e.key)) || e.loop;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Hushear', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: SOUND_LOG });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(5000);
    const r = await read(P);
    const mount = (r.intro.find((x) => x.ev === 'mount') || {}).at;
    const fin = (r.intro.find((x) => x.ev === 'finish') || {}).at;
    const ready = r.gate && r.gate.openAt;
    rec.ok(`1. a fresh load: the loading screen came (${mount ? 'yes' : 'no'}) and went (${fin ? Math.round((fin - mount) / 100) / 10 + ' s later' : 'no'}), in ${r.zone} (guard)`,
      !!mount && !!fin && r.zone === 'wheel', { intro: r.intro, gate: r.gate });
    const lift = ready || fin;
    const under = r.log.filter((e) => e.t >= mount && e.t < lift && !isOwn(e, r.taps));
    rec.ok(`2. nothing of the world starts under the loading screen: ${under.length} sound start(s) between its mount and the world being ready${under.length ? ' -- ' + under.slice(0, 6).map((e) => (e.key || e.kind) + (e.loop ? ' (loop)' : '') + ' at +' + ((e.t - mount) / 1000).toFixed(1) + ' s').join(', ') : ''}`,
      under.length === 0, { under, gate: r.gate, fin, mount, all: r.log.slice(0, 30).map((e) => ({ ...e, at: +((e.t - mount) / 1000).toFixed(1) })) });
    const after = r.log.filter((e) => e.t >= lift && isTownSound(e));
    const first = after[0];
    rec.ok(`3. the town's sound starts after it: ${after.slice(0, 4).map((e) => (e.key || e.kind).replace(/\?.*$/, '') + ' at +' + ((e.t - lift) / 1000).toFixed(1) + ' s').join(', ') || 'nothing'} after the world was ready`,
      !!first && first.t - lift <= 2500, { after: after.slice(0, 6), lift });

    /* 4. a reconnect: the socket dropped for longer than a blip (refused
       for six seconds), the veil up, and back */
    const t0 = await P.page.evaluate(() => {
      window.__btSoundLog.length = 0;
      window.__blockUntil = Date.now() + 6000;
      const w = window.__btWs;
      const h = w && w.onclose;
      if (w) { w.onclose = null; w.onmessage = null; w.onerror = null; try { w.close(); } catch (e) { /* */ } }
      if (h) h.call(w, { code: 1006, reason: '' });
      return Date.now();
    });
    const shut = await H.waitFor(P, () => (window.__btSoundGate ? window.__btSoundGate() : null), (v) => v && !v.open && v.why === 'reconnecting', { timeout: 15000, label: 'the gate closed under the veil' }).catch(() => null);
    const back = await H.waitFor(P, () => {
      const g = window.__btSoundGate ? window.__btSoundGate() : null;
      return { open: !!(g && g.open), openAt: g && g.openAt, veil: !!document.querySelector('.bt-connect-veil') };
    }, (v) => v.open && !v.veil && v.openAt > 0, { timeout: 45000, label: 'the world back' }).catch(() => null);
    await P.page.waitForTimeout(3000);
    const r2 = await read(P);
    const closedAt = r2.gate && r2.gate.closedAt, openAt = r2.gate && r2.gate.openAt;
    const during = closedAt ? r2.log.filter((e) => e.t >= closedAt && e.t < openAt && !isOwn(e, r2.taps)) : [];
    const backSound = r2.log.filter((e) => e.t >= openAt && isTownSound(e));
    rec.ok(`4. a reconnect: the gate closed under the veil (${shut ? ((closedAt - t0) / 1000).toFixed(1) + ' s after the drop' : 'never'}), ${during.length} sound start(s) under it, open again ${back ? ((openAt - closedAt) / 1000).toFixed(1) + ' s later' : 'never'}, the town's sound back (${backSound[0] ? backSound[0].key || backSound[0].kind : 'none'})`,
      !!shut && !!back && openAt > closedAt && during.length === 0 && backSound.length > 0, { during: during.slice(0, 6), gate: r2.gate, backSound: backSound.slice(0, 4) });

    /* 5. the Test panel's live switch (off_soundgate, game/clientOff.js): a
       closed gate opens at once, and on again it closes */
    await P.page.evaluate(() => document.body.classList.add('bt-intro-up'));
    const shut5 = await H.waitFor(P, () => window.__btSoundGate(), (v) => !v.open && v.why === 'loading', { timeout: 8000, label: 'the gate shut by a loading class' }).catch(() => null);
    await H.liveFlag(wsPort, 'off_soundgate', true);
    const opened5 = await H.waitFor(P, () => window.__btSoundGate(), (v) => v.open && !v.on, { timeout: 15000, label: 'the switch opening it' }).catch(() => null);
    await H.liveFlag(wsPort, 'off_soundgate', null);
    const again5 = await H.waitFor(P, () => window.__btSoundGate(), (v) => v.on && !v.open, { timeout: 15000, label: 'on again: shut again' }).catch(() => null);
    await P.page.evaluate(() => document.body.classList.remove('bt-intro-up'));
    rec.ok(`5. the Test panel's "Sound waits for the world" off: a closed gate opens at once (${opened5 ? 'yes' : 'no'}); on again, it closes again (${again5 ? 'yes' : 'no'})`,
      !!shut5 && !!opened5 && !!again5, { shut5, opened5, again5 });

    /* 6. the failsafe: a loading class left behind (the wait shortened to 3 s
       for the test) opens the gate anyway, counted */
    await H.waitFor(P, () => window.__btSoundGate(), (v) => v.open, { timeout: 8000, label: 'open before the failsafe' }).catch(() => null);
    const f0 = await P.page.evaluate(() => { window.BT_AUDIO.GATE_FAILSAFE_MS = 3000; document.body.classList.add('bt-intro-up'); return window.__btSoundGate().failsafe; });
    const fired = await H.waitFor(P, () => window.__btSoundGate(), (v) => v.open && v.failsafe > f0, { timeout: 15000, label: 'the failsafe' }).catch(() => null);
    const after6 = await P.page.evaluate(() => { document.body.classList.remove('bt-intro-up'); window.BT_AUDIO.GATE_FAILSAFE_MS = 60000; return window.__btSoundGate(); });
    rec.ok(`6. the failsafe: a loading class stuck past its wait opens the gate anyway and is counted (failsafe ${fired ? fired.failsafe : f0})`,
      !!fired && after6.open, { fired, after6 });

    rec.ok(`7. no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
