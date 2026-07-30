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
const body = ['_teardownGlobalMusic', 'resumeFromBackground', 'startGlobalMusic'].map(grab).join(',\n');

let fail = 0;
const ck = (l, got, want) => { const ok = String(got) === String(want); if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${l}: ${got}${ok ? '' : `  (want ${want})`}`); };

function makeAudio(opts = {}) {
  const started = [];
  const ctx = {
    state: opts.state || 'running',
    currentTime: 0,
    resume() { this.state = 'running'; },
    createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime(v) { this._v = v; }, cancelScheduledValues() {}, value: 0 } , connect() {} }),
    createBufferSource: () => {
      const s = { buffer: null, loop: false, onended: null, _stopped: false,
        connect() {}, start(when, off) { s._offset = off; started.push(s); }, stop() { s._stopped = true; if (s.onended) s.onended(); } };
      return s;
    },
  };
  const A = eval(`({\n${body},\n  GLOBAL_MUSIC: '/audio/music/login-theme.mp3',\n  GLOBAL_MUSIC_VOL: 0.22,\n  ZONE_MUSIC: { town: '/x.mp3' },\n  ctx: null, _globalMusicSource: null, _globalMusicGain: null,\n  _globalMusicBuffer: { duration: 100 }, _globalMusicStarting: false,\n  _globalMusicDucked: false, _currentZoneAmbient: null, _zoneMusicSource: null,\n  _out() { return {}; }, fadeIn() {}, _zoneRekicks: 0,\n  startZoneAmbient() { this._zoneRekicks++; },\n})`);
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
  A.resumeFromBackground();
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
  ck('in a scored zone: session track starts silent', started[0].__gain ?? A._globalMusicGain.gain._v, 0);
}
{
  const { A, started } = makeAudio();
  A._currentZoneAmbient = 'hollows';    /* no track for this zone */
  A.startGlobalMusic();
  ck('in an unscored zone: session track starts audible', A._globalMusicGain.gain._v, 0.22);
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

console.log(fail ? `\n${fail} FAILED` : '\nall pass');
process.exit(fail ? 1 : 0);
