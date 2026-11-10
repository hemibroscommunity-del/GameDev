/* WHAT AN AUDIO REBUILD BRINGS BACK -- v2.3.4422 (sweep VB-2, PHONE only).
 *
 * On an iPhone, switch to another app for 2 s or more, come back and tap:
 * that tap rebuilds the audio context (BT_AUDIO.reclaimIfNeeded ->
 * _rebuildContext; the watchdog does the same for a closed context or one
 * asleep 30 s).  The rebuild empties every decode made in the old context.
 *   1. the Wheel's ground steps are asked for again while the Wheel wants
 *      them (they used to play dirt until the player left the Wheel and came
 *      back), and not when it does not;
 *   2. the slime's hum (src/game/slimeAudio.js) notices its source and gain
 *      belong to the dead context and makes ONE new source in the new one
 *      (it used to stay silent until a reload): never two playing, and the
 *      old decode let go, so one decoded copy is held (the memory law).
 * The code is cut from src/: gameDisplay.js imports in node (farmwalk does);
 * slimeAudio.js is read as text (its '@/' import needs Vite). */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* a small stand-in for Web Audio: enough nodes for init() and the hum */
let ctxCount = 0;
class FakeParam { constructor() { this.value = 1; } setValueAtTime() {} linearRampToValueAtTime() {} setTargetAtTime() {} cancelScheduledValues() {} exponentialRampToValueAtTime() {} }
class FakeNode {
  constructor(ctx) { this.context = ctx; this.gain = new FakeParam(); this.connected = []; this.stopped = false; this.started = false; }
  connect(n) { this.connected.push(n); return n; }
  disconnect() { this.connected = []; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
class FakeCtx {
  constructor() { this.id = ++ctxCount; this.state = 'running'; this.currentTime = 0; this.destination = new FakeNode(this); this.sources = []; this.decodes = 0; }
  createGain() { return new FakeNode(this); }
  createBufferSource() { const s = new FakeNode(this); this.sources.push(s); return s; }
  createAnalyser() { const a = new FakeNode(this); a.fftSize = 256; a.getByteTimeDomainData = () => {}; return a; }
  resume() { return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  addEventListener() {}
  removeEventListener() {}
  decodeAudioData(ab) { this.decodes++; return Promise.resolve({ ctxId: this.id, length: 1, numberOfChannels: 1, sampleRate: 48000, duration: 1 }); }
}
globalThis.window = globalThis.window || {};
globalThis.window.AudioContext = FakeCtx;

/* ── 1. the ground steps after a rebuild ── */
const { BT_AUDIO } = await import('../../src/data/gameDisplay.js');
const { FOOTSTEP_CLIPS } = await import('../../src/data/footstepClips.js');
const stepKeys = [...new Set(Object.values(FOOTSTEP_CLIPS).map((c) => c.key))];
const asked = [];
BT_AUDIO.loadSample = function (key) { asked.push(key); return Promise.resolve(); };
BT_AUDIO.loadSfxManifest = function () {};
BT_AUDIO._wakeCtx = function () {};
BT_AUDIO._deckDrop = function () {};
BT_AUDIO.init();
check('1a. a context is made in node', BT_AUDIO.ctx instanceof FakeCtx);

BT_AUDIO._groundStepsWanted = true;   /* in the Wheel: preloadWheel asked */
const before = BT_AUDIO.ctx;
asked.length = 0;
BT_AUDIO._rebuildContext();
check('1b. the rebuild made a new context', BT_AUDIO.ctx && BT_AUDIO.ctx !== before && before.state === 'closed');
check('1c. in the Wheel, every ground step is asked for again after a rebuild',
  stepKeys.length > 0 && stepKeys.every((k) => asked.includes(k)), { stepKeys, asked });

BT_AUDIO._groundStepsWanted = false;  /* out of the Wheel: dropGroundSteps */
asked.length = 0;
BT_AUDIO._rebuildContext();
check('1d. out of the Wheel, a rebuild asks for no ground step', !stepKeys.some((k) => asked.includes(k)), asked);

/* ── 2. the slime's hum after a rebuild ── */
const SRC = readFileSync(new URL('../../src/game/slimeAudio.js', import.meta.url), 'utf8')
  .replace(/^import .*$/m, '')
  .replace('export function wireSlimeAudio', 'function wireSlimeAudio');
const A = { ctx: new FakeCtx(), muted: false, _out() { return new FakeNode(A.ctx); } };
let tick = null;
const fakeFetch = () => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
const wire = new Function('BT_AUDIO', 'fetch', 'setInterval', 'clearInterval',
  SRC + '\nreturn wireSlimeAudio;')(A, fakeFetch, (fn) => { tick = fn; return 1; }, () => {});
const slot = { buffer: null, source: null, gain: null };
const stateRef = { current: { player: { x: 0, y: 0 }, monsters: [{ alive: true, archetype: 'fodder', x: 50, y: 0 }] } };
const flush = () => new Promise((r) => setTimeout(r, 0));

const stop = wire(stateRef, { current: slot });
await flush(); await flush();
tick();
const ctx1 = A.ctx;
check('2a. near a slime, the hum plays in the first context', slot.source && slot.source.context === ctx1 && slot.source.started && slot.gain.gain.value > 0);

/* the rebuild: the old context closes, a new one takes its place */
ctx1.state = 'closed';
A.ctx = new FakeCtx();
const ctx2 = A.ctx;
for (let i = 0; i < 4; i++) { tick(); await flush(); await flush(); }
check('2b. after a rebuild the hum plays again, in the new context',
  slot.source && slot.source.context === ctx2 && slot.source.started && slot.gain && slot.gain.context === ctx2 && slot.gain.gain.value > 0,
  { src: slot.source && slot.source.context && slot.source.context.id });
check('2c. the old source was stopped and let go', ctx1.sources.length === 1 && ctx1.sources[0].stopped);
check('2d. never two: one source made in the new context however many ticks', ctx2.sources.length === 1, ctx2.sources.length);
check('2e. one decoded copy held: the buffer is the new context\'s, decoded once there',
  slot.buffer && slot.buffer.ctxId === ctx2.id && ctx2.decodes === 1, { buf: slot.buffer, decodes: ctx2.decodes });

for (let i = 0; i < 5; i++) tick();
check('2f. steady in the new context: no further source or decode', ctx2.sources.length === 1 && ctx2.decodes === 1);
stop();
check('2g. the cleanup stops the live source', !!ctx2.sources[0] && ctx2.sources[0].stopped && slot.source === null);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
