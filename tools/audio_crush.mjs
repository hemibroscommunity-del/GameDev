/* audio_crush.mjs — render a "what would low-bit sound like" preview of a music
 * track, so an audio question can be answered by LISTENING rather than by me
 * describing it (owner: "I want it to sound more like NES instead of an epic
 * orchestra.  Is there a way I can just convert it to lower bit music
 * somehow?").
 *
 * There is no ffmpeg in this sandbox, so the decode, the processing and the
 * render all happen inside the headless Chromium that tools/audio_analyze.mjs
 * already drives — OfflineAudioContext at a low sample rate, a WaveShaper that
 * quantises to N bits, mono, then written out as a WAV here.
 *
 * WHAT THIS IS AND IS NOT.  It is a bit-crush: the same performance, coarser.
 * It is NOT chiptune.  NES music is three or four SYNTHESISED voices (two
 * pulse, a triangle, a noise channel) playing a written part; crushing an
 * orchestral recording gives you a lo-fi orchestra, which reads as a damaged
 * recording rather than as a NES game.  This tool exists to make that
 * difference audible before anyone commits to a direction.
 *
 * Usage: node tools/audio_crush.mjs <in.mp3> <out.wav> [rateHz] [bits]
 */
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const [src, dst, rateArg, bitsArg] = process.argv.slice(2);
if (!src || !dst || !existsSync(src)) { console.error('usage: audio_crush.mjs <in> <out.wav> [rate] [bits]'); process.exit(1); }
const RATE = parseInt(rateArg || '11025', 10);
const BITS = parseInt(bitsArg || '5', 10);

let result = null;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(page()); }
  else if (u.pathname === '/audio') { res.writeHead(200, { 'content-type': 'audio/mpeg' }); res.end(await readFile(src)); }
  else if (u.pathname === '/cfg') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ rate: RATE, bits: BITS })); }
  else if (u.pathname === '/result' && req.method === 'POST') {
    const chunks = []; for await (const c of req) chunks.push(c);
    result = JSON.parse(Buffer.concat(chunks).toString());
    res.writeHead(200); res.end('ok');
  } else { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
  '--autoplay-policy=no-user-gesture-required', `--user-data-dir=/tmp/audio-crush-${port}`,
  `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
const t0 = Date.now();
await new Promise((resolve, reject) => {
  const iv = setInterval(() => {
    if (result) { clearInterval(iv); resolve(); }
    else if (Date.now() - t0 > 180000) { clearInterval(iv); reject(new Error('timeout')); }
  }, 200);
});
chrome.kill(); server.close();
if (result.error) { console.error('ERROR', result.error); process.exit(1); }

/* WAV, 16-bit mono — the SAMPLES are quantised to BITS, the container is not.
   A 5-bit container is not a thing any player opens. */
const pcm = Int16Array.from(result.samples.map((v) => Math.max(-1, Math.min(1, v)) * 32767));
const bytes = Buffer.alloc(44 + pcm.length * 2);
bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + pcm.length * 2, 4); bytes.write('WAVE', 8);
bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(RATE, 24); bytes.writeUInt32LE(RATE * 2, 28);
bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
bytes.write('data', 36); bytes.writeUInt32LE(pcm.length * 2, 40);
Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength).copy(bytes, 44);
await writeFile(dst, bytes);
console.log(`${dst}: ${result.duration.toFixed(1)}s @ ${RATE}Hz, ${BITS}-bit, mono — ${(bytes.length / 1024).toFixed(0)}KB`);
process.exit(0);

function page() { return `<!doctype html><meta charset=utf8><body><script>
async function run(){
  let out={};
  try{
    const cfg = await (await fetch('/cfg')).json();
    const ab = await (await fetch('/audio')).arrayBuffer();
    const dec = new (window.AudioContext||window.webkitAudioContext)();
    const buf = await dec.decodeAudioData(ab);
    /* Render at the LOW rate: the resample is half the effect, and doing it in
       the context rather than by dropping samples avoids the aliasing hash a
       naive decimation adds. */
    const off = new OfflineAudioContext(1, Math.ceil(buf.duration*cfg.rate), cfg.rate);
    const s = off.createBufferSource(); s.buffer = buf;
    /* Quantise to cfg.bits via a WaveShaper: a staircase curve maps the input
       range onto 2^bits levels, which is what "lower bit" means. */
    const steps = Math.pow(2, cfg.bits);
    const curve = new Float32Array(4096);
    for (let i=0;i<curve.length;i++){
      const x = (i/(curve.length-1))*2-1;
      curve[i] = Math.round(x*(steps/2))/(steps/2);
    }
    const ws = off.createWaveShaper(); ws.curve = curve; ws.oversample='none';
    const g = off.createGain(); g.gain.value = 0.9;
    s.connect(ws); ws.connect(g); g.connect(off.destination);
    s.start();
    const rendered = await off.startRendering();
    out.samples = Array.from(rendered.getChannelData(0));
    out.duration = rendered.duration;
  }catch(e){ out.error=String(e); }
  await fetch('/result',{method:'POST',body:JSON.stringify(out)});
}
run();
</script></body>`; }
