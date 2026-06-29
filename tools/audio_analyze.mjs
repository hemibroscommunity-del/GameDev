/* audio_analyze.mjs — decode audio files via headless Chromium's Web Audio and
 * report duration + an RMS amplitude envelope, so we can find where a sound
 * (e.g. a single footstep) actually sits inside a clip and isolate it at
 * runtime via start(offset, duration). No ffmpeg needed. Read-only analysis.
 *
 * Usage: node tools/audio_analyze.mjs FILE...
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const files = process.argv.slice(2).filter((f) => existsSync(f));
if (!files.length) { console.error('no files'); process.exit(1); }

const results = [];
let done = 0;

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(pageHtml());
  } else if (u.pathname === '/list') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(files.map((f, i) => ({ i, name: path.basename(f) }))));
  } else if (u.pathname === '/audio') {
    const buf = await readFile(files[parseInt(u.searchParams.get('i'), 10)]);
    res.writeHead(200, { 'content-type': 'audio/mpeg' });
    res.end(buf);
  } else if (u.pathname === '/result' && req.method === 'POST') {
    const chunks = []; for await (const c of req) chunks.push(c);
    results.push(JSON.parse(Buffer.concat(chunks).toString()));
    done++;
    res.writeHead(200); res.end('ok');
  } else { res.writeHead(404); res.end(); }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const profile = `/tmp/audio-analyze-${port}`;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
  '--autoplay-policy=no-user-gesture-required', `--user-data-dir=${profile}`,
  `http://127.0.0.1:${port}/`], { stdio: 'ignore' });

const t0 = Date.now();
await new Promise((resolve, reject) => {
  const iv = setInterval(() => {
    if (done >= files.length) { clearInterval(iv); resolve(); }
    else if (Date.now() - t0 > 60000) { clearInterval(iv); reject(new Error('timeout')); }
  }, 200);
});
chrome.kill(); server.close();

results.sort((a, b) => a.i - b.i);
for (const r of results) {
  if (r.error) { console.log(`\n${r.name}: ERROR ${r.error}`); continue; }
  console.log(`\n=== ${r.name} ===`);
  console.log(`duration: ${r.duration.toFixed(3)}s  sampleRate: ${r.sampleRate}  channels: ${r.channels}`);
  console.log(`peak amplitude: ${r.peak.toFixed(3)}  win=${r.winMs}ms`);
  // envelope: print as a bar per window, with time labels
  const env = r.env;
  const max = Math.max(...env, 1e-6);
  console.log('time(s)  rms   ' );
  for (let i = 0; i < env.length; i++) {
    const t = (i * r.winMs / 1000).toFixed(2);
    const v = env[i] / max;
    const bar = '#'.repeat(Math.round(v * 40));
    console.log(`${t.padStart(6)}  ${env[i].toFixed(3)} ${bar}`);
  }
  // suggest onset/offset using a threshold of 8% of peak
  const thr = max * 0.08;
  let on = -1, off = -1;
  for (let i = 0; i < env.length; i++) { if (env[i] > thr) { on = i; break; } }
  for (let i = env.length - 1; i >= 0; i--) { if (env[i] > thr) { off = i; break; } }
  if (on >= 0) {
    const onS = on * r.winMs / 1000, offS = (off + 1) * r.winMs / 1000;
    console.log(`>> active region (8% thr): ${onS.toFixed(3)}s -> ${offS.toFixed(3)}s  (dur ${(offS - onS).toFixed(3)}s)`);
  }
}
process.exit(0);

function pageHtml() { return `<!doctype html><meta charset=utf8><body><script>
async function run(){
  const list = await (await fetch('/list')).json();
  for(const it of list){
    let out={i:it.i,name:it.name};
    try{
      const ab = await (await fetch('/audio?i='+it.i)).arrayBuffer();
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const buf = await ctx.decodeAudioData(ab);
      const ch0 = buf.getChannelData(0);
      const winMs = 20;
      const win = Math.floor(buf.sampleRate * winMs/1000);
      const env=[]; let peak=0;
      for(let i=0;i<ch0.length;i+=win){
        let s=0,n=0;
        for(let j=i;j<i+win && j<ch0.length;j++){ s+=ch0[j]*ch0[j]; n++; if(Math.abs(ch0[j])>peak)peak=Math.abs(ch0[j]); }
        env.push(Math.sqrt(s/Math.max(1,n)));
      }
      out.duration=buf.duration; out.sampleRate=buf.sampleRate; out.channels=buf.numberOfChannels;
      out.env=env; out.winMs=winMs; out.peak=peak;
    }catch(e){ out.error=String(e); }
    await fetch('/result',{method:'POST',body:JSON.stringify(out)});
  }
}
run();
</script></body>`; }
