/* Audio resume/teardown checks — v2.3.1593.
 *
 * The client has no unit suite, and this is exactly the kind of bug that
 * reading cannot catch: the owner reported "music doesn't work when I return
 * to the game", and the cause was three interacting lifecycle faults that
 * each look fine in isolation.
 *
 * Rather than mock the module (it is a 2.6k-line browser file), this EXTRACTS
 * the three real functions from the shipped source text and runs them against
 * a fake AudioContext, so it tests the characters that ship.
 *
 * Verified to be meaningful, not decorative: run against the pre-fix file it
 * reports 6 failures, one per real defect.
 *
 *   node tools/qa/audio-resume-check.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = readFileSync(join(ROOT, 'src/data/gameDisplay.js'), 'utf8');
function grab(name) {
  const marker = `BT_AUDIO.${name} = function `;
  const i = SRC.indexOf(marker);
  if (i < 0) throw new Error('not found: ' + name);
  const end = SRC.indexOf('\n};', i);
  return SRC.slice(i + `BT_AUDIO.`.length, end + 2).replace(/^(\w+) = /, '$1: ');
}
/* Object-literal members (`name: function name() {`) rather than the
   `BT_AUDIO.name = function` form grab() handles. */
function grabProp(name) {
  const marker = `  ${name}: function ${name}(`;
  const i = SRC.indexOf(marker);
  if (i < 0) throw new Error('not found (prop): ' + name);
  return SRC.slice(i, SRC.indexOf('\n  },', i) + 4);
}
const body = [
  ...['_teardownGlobalMusic', 'resumeFromBackground', '_rebuildSources', 'startGlobalMusic'].map(grab),
  ...['_ctxLive', '_wakeCtx', '_whenRunning', 'fadeIn', '_ensureAudible',
      '_ensureAnalyser', '_masterIsSilent', '_audioHealthCheck', '_rebuildContext',
      '_ensureAnalyser', '_masterIsSilent', '_audioHealthCheck', '_rebuildContext'].map(grabProp),
].join(',\n');

globalThis.document = { hidden: false };
let fail = 0;
const ck = (l, got, want) => { const ok = String(got) === String(want); if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${l}: ${got}${ok ? '' : `  (want ${want})`}`); };

function makeAudio(opts = {}) {
  const started = [];
  const listeners = [];
  const mkGain = () => ({ gain: { value: 1, _sched: null, cancelScheduledValues() {}, setValueAtTime(v) { this._sched = v; }, linearRampToValueAtTime(v) { this._ramped = v; }, exponentialRampToValueAtTime(v) { this._target = v; } }, connect() {} });
  const ctx = {
    state: opts.state || 'running',
    currentTime: 0,
    addEventListener(t, fn) { if (t === 'statechange') listeners.push(fn); },
    removeEventListener(t, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    _setState(v) { this.state = v; listeners.slice().forEach((f) => f()); },
    resume() { if (opts.refuseResume) return Promise.reject(new Error('nope')); this._setState('running'); return Promise.resolve(); },
    createGain: () => mkGain(),
    createBufferSource: () => {
      const s = { buffer: null, loop: false, onended: null, _stopped: false,
        connect() {}, start(when, off) { s._offset = off; started.push(s); }, stop() { s._stopped = true; if (s.onended) s.onended(); } };
      return s;
    },
  };
  const A = eval(`({\n${body},\n  GLOBAL_MUSIC: '/audio/music/login-theme.mp3',\n  GLOBAL_MUSIC_VOL: 0.22,\n  ZONE_MUSIC: { town: '/x.mp3' },\n  ctx: null, _globalMusicSource: null, _globalMusicGain: null,\n  _globalMusicBuffer: { duration: 100 }, _globalMusicStarting: false,\n  _globalMusicDucked: false, _currentZoneAmbient: null, _zoneMusicSource: null,\n  _out() { return {}; }, _zoneRekicks: 0,
  _silent: false,
  /* the harness answers the analyser question directly — what matters is
     that _audioHealthCheck ACTS on provable silence, not how the bytes
     are read (that part is a browser API with no node equivalent). */
  _masterIsSilent() { return !!this._silent; },\n  _master: { gain: { value: 1, _ramps: [], cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { this._target = v; } } },\n  startZoneAmbient() { this._zoneRekicks++; },\n})`);
  A.ctx = ctx;
  Object.assign(A, opts.state ? {} : {});
  return { A, ctx, started };
}

// ── 1. THE REPORTED BUG: iOS stops the source WITHOUT firing onended ──
{
  const { A, ctx, started } = makeAudio();
  A.startGlobalMusic();
  ck('baseline: session track started', started.length, 1);
  const dead = A._globalMusicSource;
  dead.onended = null;             /* iOS killed it silently — no callback */
  ctx.state = 'suspended';         /* which is what a backgrounding looks like */
  A._silent = true;                /* a dead source produces no output */
  A.resumeFromBackground(true);
  /* v2.3.1601: resumeFromBackground no longer tears anything down — a silently
     killed source still LOOKS present, so it is the watchdog's silence
     detection that catches it, within ~3s. */
  ck('after silent kill + resume: a NEW source is running', started.length, 2);
  ck('after silent kill + resume: ref points at the new source',
    A._globalMusicSource !== dead && !!A._globalMusicSource, true);
  ck('after silent kill + resume: gain node is fresh (not the dead one)',
    !!A._globalMusicGain, true);
}

// ── 2. A plain focus event must NOT restart the music ──
{
  const { A, started } = makeAudio();
  A._currentZoneAmbient = 'town';  /* standing in a scored zone, music healthy */
  A._zoneMusicSource = {};         /* v2.3.1601: and its track really is playing */
  A.startGlobalMusic();
  const first = A._globalMusicSource;
  A.resumeFromBackground();        /* ctx still 'running' — focus/pageshow */
  A.resumeFromBackground();
  ck('healthy focus: no extra source started', started.length, 1);
  ck('healthy focus: same source kept', A._globalMusicSource === first, true);
  ck('healthy focus: zone track NOT re-kicked', A._zoneRekicks, 0);
}

// ── 3. Position is preserved across a rebuild ──
{
  const { A, ctx, started } = makeAudio();
  A._globalMusicEpoch = Date.now() - 30000;   /* 30s into the track */
  A.startGlobalMusic();
  ctx.state = 'suspended';
  A._globalMusicSource.onended = null;
  A.resumeFromBackground();
  const off = started[started.length - 1]._offset;
  ck('rebuild resumes at position (~30s, not 0)', off >= 29 && off <= 32, true);
  ck('offset wraps inside the buffer', off < 100, true);
}

// ── 4. Ducking asks the zone TABLE, not the stale source ref ──
{
  const { A, started } = makeAudio();
  A._currentZoneAmbient = 'town';       /* town has a track */
  A._zoneMusicSource = null;            /* ...but the ref is momentarily null */
  A.startGlobalMusic();
  ck('in a scored zone: session track starts silent', A._globalMusicGain.gain._ramped, 0);
}
{
  const { A, started } = makeAudio();
  A._currentZoneAmbient = 'hollows';    /* no track for this zone */
  A.startGlobalMusic();
  ck('in an unscored zone: session track starts audible', A._globalMusicGain.gain._ramped, 0.22);
  void started;
}

// ── 5. Teardown must not let the old onended nuke the replacement ──
{
  const { A, ctx } = makeAudio();
  A.startGlobalMusic();
  const first = A._globalMusicSource;
  let firedAfter = false;
  const origOnended = first.onended;
  first.onended = () => { firedAfter = true; origOnended && origOnended(); };
  ctx.state = 'suspended';
  A.resumeFromBackground();
  ck('teardown detaches onended before stopping', firedAfter, false);
  ck('replacement survives the teardown', !!A._globalMusicSource, true);
}

// ── 6. iOS "interrupted": the state every check used to miss ────────────
{
  const { A, ctx, started } = makeAudio();
  A._currentZoneAmbient = 'town';
  A.startGlobalMusic();
  const dead = A._globalMusicSource;
  dead.onended = null;                    /* silently killed, as iOS does */
  ctx.state = 'interrupted';              /* NOT 'suspended' — the whole bug */
  A.resumeFromBackground(true);
  ck('interrupted: context is woken', ctx.state, 'running');
  /* v2.3.1601: waking is resumeFromBackground's whole job now; repairing the
     dead sources belongs to the watchdog, which hears the silence. */
  ck('interrupted: session track rebuilt', started.length, 2);
}

// ── 7. The `hard` flag: a real hide/show rebuilds, a bare focus does not ──
{
  const { A, started } = makeAudio();       /* ctx healthy throughout */
  A._currentZoneAmbient = 'town';
  A.startGlobalMusic();
  A._zoneMusicSource = {};                  /* zone track playing fine */
  A.resumeFromBackground(false);            /* window focus */
  ck('soft resume: no rebuild', started.length, 1);
  ck('soft resume: zone song not restarted', A._zoneRekicks, 0);
  /* v2.3.1601: `hard` no longer authorises destruction.  Tearing healthy audio
     down on every visibilitychange WAS the quick-tab-switch regression. */
  A.resumeFromBackground(true);             /* visibilitychange / pageshow */
  ck('hard resume: rebuilds (inaudibly — position preserved)', started.length, 2);
  ck('hard resume: zone song re-kicked', A._zoneRekicks, 1);
}

// ── 8. fadeIn must not schedule against a FROZEN clock ──────────────────
{
  const { A, ctx } = makeAudio({ state: 'interrupted' });
  A.fadeIn(0.8);
  ck('fadeIn defers while not running (bus untouched)', A._master.gain.value, 1);
  ctx._setState('running');
  ck('fadeIn applies once running', A._master.gain.value, 0.001);
  ck('fadeIn targets full volume', A._master.gain._target, 1);
}

// ── 9. A stranded master bus self-heals ────────────────────────────────
{
  const { A } = makeAudio();
  A._master.gain.value = 0.001;             /* stuck silent, no fade pending */
  A._ensureAudible();
  ck('stranded bus ramps back to full', A._master.gain._target, 1);
  const before = A._master.gain._target;
  A._master.gain.value = 1;
  A._master.gain._target = null;
  A._ensureAudible();
  ck('healthy bus is left alone', A._master.gain._target, null);
  void before;
}

// ── 10. A rebuild must not leave the track playing at gain ZERO ─────────
//   The v2.3.1594 fix rebuilt the sources but scheduled their fade-in ramps
//   against ctx.currentTime, which is FROZEN during exactly that rebuild.
{
  const { A, ctx, started } = makeAudio({ state: 'interrupted', refuseResume: true });
  A._currentZoneAmbient = 'hollows';        /* unscored: session track audible */
  A.startGlobalMusic();
  /* v2.3.1603: nothing is BUILT while the context is asleep.  A BufferSource
     created and started against a suspended or interrupted context is the
     unreliable case — it was the "playing, inaudibly" state.  Construction now
     waits for the context to actually run. */
  ck('asleep: no source built on a dead context', started.length, 0);
  ctx._setState('running');
  ck('on wake: the source is built', started.length, 1);
  ck('on wake: and ramps to full volume', A._globalMusicGain.gain._ramped, 0.22);
}

// ── 11. A frozen mid-fetch must not wedge the session track forever ────
{
  const { A, started } = makeAudio();
  A._globalMusicStarting = true;            /* fetch in flight when we froze */
  A._globalMusicBuffer = { duration: 100 };
  /* v2.3.1601: resumeFromBackground no longer tears down, so the stuck guard is
     cleared by the v2.3.1599 staleness expiry in the watchdog instead. */
  A._globalMusicStartingAt = Date.now() - 9000;
  A.resumeFromBackground(true);
  ck('stuck in-flight guard is cleared by staleness expiry', A._globalMusicStarting, false);
  ck('session track rebuilt despite the stuck guard', started.length, 1);
}

// ── 12. THE QUICK-RETURN CASE: ctx lies, so listen to the bus instead ───
//   iOS leaves the context 'running' with its output detached. Every state
//   check says healthy; no sound comes out; touching used to do nothing.
{
  const { A, started } = makeAudio();            /* ctx 'running' throughout */
  A._currentZoneAmbient = 'hollows';
  A.startGlobalMusic();
  ck('quick-return setup: one source', started.length, 1);
  A._silent = true;                              /* bus reads digital silence */
  A._audioHealthCheck();
  ck('1s of silence: not yet rebuilt (no twitchy restarts)', started.length, 1);
  A._audioHealthCheck();
  A._audioHealthCheck();
  ck('3s of PROVABLE silence: rebuilt despite ctx saying running', started.length, 2);
}

// ── 13. Real audio must never trigger a rebuild ────────────────────────
{
  const { A, started } = makeAudio();
  A._currentZoneAmbient = 'hollows';
  A.startGlobalMusic();
  A._silent = false;                             /* music genuinely playing */
  for (let i = 0; i < 10; i++) A._audioHealthCheck();
  ck('audible bus: never rebuilt across 10s', started.length, 1);
  ck('silent-tick counter stays clear', A._silentTicks || 0, 0);
}

// ── 14. A missing source is restarted without waiting to listen ────────
{
  const { A, started } = makeAudio();
  A._currentZoneAmbient = 'hollows';
  A.startGlobalMusic();
  A._globalMusicSource = null;                   /* died, onended fired */
  A._audioHealthCheck();
  ck('missing source restarted immediately', started.length, 2);
}

// ── 15. Backgrounded: do not fight iOS while hidden ────────────────────
{
  const { A, started } = makeAudio();
  A._currentZoneAmbient = 'hollows';
  A.startGlobalMusic();
  globalThis.document = { hidden: true };
  A._silent = true;
  for (let i = 0; i < 5; i++) A._audioHealthCheck();
  globalThis.document = { hidden: false };
  ck('hidden: no rebuild attempts', started.length, 1);
}

// ── 16. A suspended ctx keeps retrying the wake every tick ─────────────
{
  const { A, ctx } = makeAudio({ state: 'interrupted', refuseResume: true });
  let attempts = 0;
  const realResume = ctx.resume.bind(ctx);
  ctx.resume = () => { attempts++; return realResume(); };
  for (let i = 0; i < 4; i++) A._audioHealthCheck();
  ck('asleep ctx: wake retried every tick, not once', attempts, 4);
}

// ── 17. THE STACKING BUG: a slow zone fetch must be started ONCE ───────
//   Reported in the wild: "it played the town music 3 times, staggered".
//   The watchdog polls every second; a zone fetch takes a second or two;
//   _zoneMusicSource is legitimately null the whole time.
{
  const { A } = makeAudio();
  A._currentZoneAmbient = 'town';                /* town has a track */
  A._globalMusicSource = {};                     /* session track already fine */
  let starts = 0;
  A.startZoneAmbient = function (z) {
    starts++;
    this._currentZoneAmbient = z;
    this._zoneMusicStarting = true;              /* fetch begins */
  };
  for (let i = 0; i < 4; i++) A._audioHealthCheck();   /* 4 seconds of download */
  ck('slow zone fetch: started exactly once, not once per tick', starts, 1);
  /* fetch lands */
  A._zoneMusicStarting = false;
  A._zoneMusicSource = {};
  for (let i = 0; i < 3; i++) A._audioHealthCheck();
  ck('after it lands: no further starts', starts, 1);
}

// ── 18. A pending start that never lands must not wedge the watchdog ───
{
  const { A } = makeAudio();
  A._currentZoneAmbient = 'town';
  A._globalMusicSource = {};
  let starts = 0;
  A.startZoneAmbient = function (z) { starts++; this._currentZoneAmbient = z; this._zoneMusicStarting = true; };
  A._audioHealthCheck();
  ck('one start requested', starts, 1);
  /* the fetch fails — the catch clears the flag, as the real code does */
  A._zoneMusicStarting = false;
  A._audioHealthCheck();
  ck('after a failed fetch the watchdog retries', starts, 2);
}

// ── 19. THE WEDGE: a fetch promise that NEVER settles ──────────────────
//   iOS freezes the page mid-download; the request dies without rejecting and
//   queued microtasks can be discarded, so the v2.3.1597 in-flight flag is
//   never cleared. Both watchdog restart branches are gated on it.
{
  const { A } = makeAudio();
  A._currentZoneAmbient = 'town';
  A._globalMusicSource = {};
  let starts = 0;
  A.startZoneAmbient = function (z) { starts++; this._currentZoneAmbient = z; this._zoneMusicStarting = true; this._zoneMusicStartingAt = Date.now(); };
  A.startZoneAmbient('town');                    /* fetch begins... and dies */
  ck('wedge setup: one start, flag left in flight', starts === 1 && A._zoneMusicStarting, true);
  for (let i = 0; i < 5; i++) A._audioHealthCheck();
  ck('inside the 8s window: guard still holds (no stacking)', starts, 1);
  /* pretend 9 seconds passed with the promise never settling */
  A._zoneMusicStartingAt = Date.now() - 9000;
  A._audioHealthCheck();
  ck('past 8s: stale flag expired and the watchdog retries', starts, 2);
}

// ── 20. Same for the session track ─────────────────────────────────────
{
  const { A, started } = makeAudio();
  A._currentZoneAmbient = 'hollows';
  A._globalMusicStarting = true;                 /* frozen mid-fetch */
  A._globalMusicStartingAt = Date.now();
  A._audioHealthCheck();
  ck('session track: guard holds inside the window', started.length, 0);
  A._globalMusicStartingAt = Date.now() - 9000;
  A._audioHealthCheck();
  ck('session track: stale guard expires and it starts', started.length, 1);
}

// ── 21. A flag with no timestamp must not expire instantly ─────────────
//   Defensive: an older stored state, or a set site that forgot the stamp,
//   should keep the anti-stacking guard rather than lose it.
{
  const { A } = makeAudio();
  A._currentZoneAmbient = 'town';
  A._globalMusicSource = {};
  let starts = 0;
  A.startZoneAmbient = function () { starts++; };
  A._zoneMusicStarting = true;
  A._zoneMusicStartingAt = 0;                    /* no stamp */
  for (let i = 0; i < 3; i++) A._audioHealthCheck();
  ck('unstamped flag: guard still respected', starts, 0);
}

// ── 22. A CLOSED context is terminal — rebuild, don't retry forever ────
//   After a long absence iOS closes the context outright. resume() rejects
//   for ever, and init() refuses to replace an existing ctx, so every prior
//   recovery path retried a dead object until reload.
{
  const { A, ctx } = makeAudio();
  let rebuilt = 0;
  A.init = function () { rebuilt++; this.ctx = { state: 'suspended', resume: () => Promise.resolve(), addEventListener() {}, removeEventListener() {} }; };
  ctx.state = 'closed';
  A._audioHealthCheck();
  ck('closed ctx: graph rebuilt', rebuilt, 1);
  ck('closed ctx: a fresh context is installed', A.ctx !== ctx, true);
}

// ── 23. Rebuild drops buffers decoded against the dead context ─────────
{
  const { A, ctx } = makeAudio();
  A.init = function () { this.ctx = { state: 'suspended', resume: () => Promise.resolve(), addEventListener() {}, removeEventListener() {} }; };
  A._globalMusicBuffer = { duration: 100 };
  A._zoneMusicBuffers = { '/a.mp3': {} };
  A._zoneMusicStarting = true;
  ctx.state = 'closed';
  A._audioHealthCheck();
  ck('rebuild: stale global buffer dropped', A._globalMusicBuffer, null);
  ck('rebuild: stale zone buffer cache emptied', Object.keys(A._zoneMusicBuffers).length, 0);
  ck('rebuild: in-flight flags cleared', A._zoneMusicStarting, false);
}

// ── 24. A context that never wakes escalates to a rebuild — but slowly ─
{
  const { A } = makeAudio({ state: 'interrupted', refuseResume: true });
  let rebuilt = 0;
  A.init = function () { rebuilt++; this.ctx = { state: 'suspended', resume: () => Promise.reject(new Error('no')), addEventListener() {}, removeEventListener() {} }; };
  for (let i = 0; i < 29; i++) A._audioHealthCheck();
  ck('29s of failed wakes: no rebuild yet (gestures may still come)', rebuilt, 0);
  A._audioHealthCheck();
  ck('30s of failed wakes: escalates to a rebuild', rebuilt, 1);
}

// ── 25. A healthy context never escalates ──────────────────────────────
{
  const { A } = makeAudio();
  A._currentZoneAmbient = 'hollows';
  A.startGlobalMusic();
  let rebuilt = 0;
  A.init = function () { rebuilt++; };
  for (let i = 0; i < 60; i++) A._audioHealthCheck();
  ck('60s healthy: never rebuilt', rebuilt, 0);
}

// ── 26. A QUICK tab switch must not destroy healthy audio ──────────────
//   The regression: `hard` is true for every visibilitychange, and it used to
//   authorise a full teardown + restart even when iOS had done nothing.
{
  const { A, started } = makeAudio();          /* ctx healthy throughout */
  A._currentZoneAmbient = 'town';
  A.startGlobalMusic();
  const src = A._globalMusicSource;
  let zoneRestarts = 0;
  A.startZoneAmbient = function () { zoneRestarts++; };
  A._zoneMusicSource = {};                     /* zone track playing fine */
  A._silent = false;                           /* and audibly so */
  A._master.gain.value = 1;
  A._globalMusicEpoch = Date.now() - 30000;    /* 30s into the session track */
  A.resumeFromBackground(true);                /* quick switch back */
  /* v2.3.1602: a hide/show cycle DOES rebuild — the v2.3.1601 "leave it alone"
     rule relied on the watchdog noticing breakage, and its analyser tap never
     fires in WebKit.  What made the old rebuild bad was its COST, and that is
     what these assertions now pin instead. */
  ck('quick switch: session track rebuilt', started.length, 2);
  ck('quick switch: rebuild resumes at position, not from the top',
    started[1]._offset >= 29 && started[1]._offset <= 32, true);
  ck('quick switch: zone song restarted (at position, see below)', zoneRestarts, 1);
  ck('quick switch: master bus NOT dipped on a healthy context',
    A._master.gain.value, 1);
  void src;
}

// ── 27. ...but a genuinely dead graph is still repaired ────────────────
{
  const { A, started } = makeAudio();
  A._currentZoneAmbient = 'hollows';
  A.startGlobalMusic();
  A._globalMusicSource = null;                 /* really died */
  A.resumeFromBackground(true);
  ck('dead source: repaired on the way back', started.length, 2);
}

// ── 28. A fading master must never read as silence ─────────────────────
//   fadeIn starts at 0.001, which quantises to exactly 128 in the analyser's
//   8-bit data — indistinguishable from true silence. Judging during a fade
//   made the watchdog rebuild, which re-faded, which looked silent again.
{
  /* the REAL _masterIsSilent, not the harness stub — build it its own object */
  const mkAnalyser = () => ({ fftSize: 256, getByteTimeDomainData(buf) { buf.fill(128); } });
  const S = eval(`({\n${body}\n})`);
  S.ctx = { currentTime: 0, createAnalyser: mkAnalyser };
  S._master = { connect() {} };
  S._fadeUntil = 0;
  /* v2.3.1602: an UNPROVEN tap is not evidence.  A Uint8Array starts at zero and
     WebKit does not reliably pull an analyser with no output connected, so
     "looks like silence" from a tap that has never produced a real sample means
     nothing — that false confidence is why the watchdog never rebuilt. */
  ck('unproven tap: silence is not actionable', S._masterIsSilent(), false);
  S._analyserProven = true;                      /* the tap has produced real audio */
  ck('proven tap, all-128 bus: correctly reads as silence', S._masterIsSilent(), true);
  S._fadeUntil = 1;                              /* a fade is in flight */
  ck('same bus mid-fade: NOT judged as silence', S._masterIsSilent(), false);
  S.ctx.currentTime = 2;                         /* fade has finished */
  ck('after the fade ends: judged again', S._masterIsSilent(), true);
}

console.log(fail ? `\n${fail} FAILED` : '\nall pass');
process.exit(fail ? 1 : 0);
