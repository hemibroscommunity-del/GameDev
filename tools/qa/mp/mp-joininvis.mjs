/* ═══ mp-joininvis (v2.3.6762, card LOAD): PARTS OF THE BRO INVISIBLE RIGHT AFTER A LOGIN? ═══
 *
 * The owner, 2026-11-28: "Also parts of char keep being invisible upon join
 * especially northwest".  A character in the copper torso and greaves (the
 * kit's, worn the real way, held by the worker) with a pattern on the
 * trousers (a drawn player's west, north-west and south-east are drawn from a
 * flipped body picture of its own: TRAPS §251), brought in:
 *   A. a returning login (the same browser, its bakes answered from the disk);
 *   B. a first login for the bakes (`?bakekeep=0`);
 *   C. a fresh browser on the same device (nothing cached at all);
 * and THE MOMENT the loading screen lifts, turned to each of the eight
 * facings (a short jog, then standing), each read twice: while jogging and
 * standing.  Each read: every layer of the figure (shown? its picture's
 * size and source) and the pixels it draws (the renderer's own extract),
 * then the same eight facings once everything has settled.  A facing whose
 * figure draws less than 85% of its settled pixels, or a layer drawn settled
 * and not at the lift, is a part gone.
 *
 *   node tools/qa/mp/run.mjs joininvis
 */
import * as H from './harness.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const OUT = 'tools/qa/mp/out/joininvis.txt';
const LAYERS = ['_spriteBody', '_hairSprite', '_headwearSprite', '_facialHairSprite', '_gearShirt', '_gearChest', '_gearLegs', '_bodyHead'];
const FACINGS = [
  ['south', ['s']], ['southeast', ['s', 'd']], ['east', ['d']], ['northeast', ['w', 'd']],
  ['north', ['w']], ['northwest', ['w', 'a']], ['west', ['a']], ['southwest', ['s', 'a']],
];
const log = [];
const note = (s) => { log.push(s); console.log('    ' + s.slice(0, 600)); };

/* every page load: the lift, the moment the bro's chain is done */
const WATCH = () => {
  try {
    if (!localStorage.getItem('qa-ji-ink')) { localStorage.setItem('bt-pantspat', 'check:3'); localStorage.setItem('qa-ji-ink', '1'); }
    window.__qaFrames = 0;
    const count = () => { window.__qaFrames++; requestAnimationFrame(count); };
    requestAnimationFrame(count);
    const t = setInterval(() => {
      const ev = window.__btIntro || [];
      if (!window.__qaLift && ev.find((e) => e && e.ev === 'finish')) window.__qaLift = { at: Math.round(performance.now()), steps: Object.assign({}, window.__btPreloadSteps || {}) };
      const s = window.__btPreloadSteps || {};
      if (!window.__qaDone && s.done) window.__qaDone = { at: Math.round(performance.now()) };
      if (window.__qaLift && window.__qaDone) clearInterval(t);
    }, 20);
  } catch (e) { /* reported below */ }
};

/* one read of the figure: each layer and the pixels it draws */
const read = (P, shot = false) => P.page.evaluate(async ({ LAYERS, shot }) => {
  const PR = window._pixiRenderer;
  const d = PR && PR.playerDisplayRaw && PR.playerDisplayRaw();
  const R = PR && PR.app && PR.app.renderer;
  if (!d || !R) return { why: 'no display' };
  const shown = (s) => { for (let c = s; c; c = c.parent) { if (!c.visible || c.renderable === false) return false; if (c === d) return true; } return true; };
  const opaque = (target) => {
    try {
      const lb = target.getLocalBounds().rectangle;
      if (!(lb.width > 0 && lb.height > 0)) return 0;
      const px = R.extract.pixels({ target, frame: lb, resolution: 1 }).pixels;
      let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 100) n++;
      return n;
    } catch (e) { return -1; }
  };
  const ui = d._uiLayer, uiV = ui ? ui.visible : null;
  if (ui) ui.visible = false;
  const out = { pose: d._animPose, dir: d._animDir, f: d._animFrame, all: opaque(d), layers: {} };
  if (shot) { try { out.png = await R.extract.base64({ target: d, resolution: 2 }); } catch (e) { out.png = null; } }
  for (const k of LAYERS) {
    const s = d[k];
    if (!s) { out.layers[k] = null; continue; }
    const t = s.texture;
    const on = !!(s.visible && shown(s) && s.alpha > 0.02);
    let px = 0;
    if (on && t && t.width > 2) {
      const wasV = []; /* the layer alone: its siblings hidden */
      for (const k2 of LAYERS) { const o = d[k2]; if (o && o !== s && o.visible) { o.visible = false; wasV.push(o); } }
      const kids = [];
      for (const c of d.children) if (c !== s && c.visible && !LAYERS.some((k2) => d[k2] === c) && !(s.parent && s.parent === c)) { c.visible = false; kids.push(c); }
      px = opaque(d);
      for (const o of wasV) o.visible = true;
      for (const c of kids) c.visible = true;
    }
    out.layers[k] = { on, w: t ? Math.round(t.width) : 0, src: t && t.source ? t.source.uid : null, res: !!(t && t.source && (t.source.resource || t.source._gpuData || t.source.uploadMethodId)), px };
  }
  if (ui) ui.visible = uiV;
  return out;
}, { LAYERS, shot });

const SHOTS = 'tools/qa/mp/out/joininvis';
const savePng = (file, png) => { try { if (png) { mkdirSync(SHOTS, { recursive: true }); writeFileSync(`${SHOTS}/${file}.png`, Buffer.from(String(png).split(',').pop(), 'base64')); } } catch (e) { /* the numbers have it */ } };
/* each facing: three reads jogging (the first with a picture), one standing */
async function turnAll(P, tag) {
  const res = [];
  for (const [name, keys] of FACINGS) {
    for (const k of keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(400);
    const jogs = [];
    for (let i = 0; i < 3; i++) { const r = await read(P, i === 0); if (i === 0) { savePng(`${tag}-${name}`, r.png); delete r.png; } jogs.push(r); }
    for (const k of keys) await P.page.keyboard.up(k);
    await P.page.waitForTimeout(350);
    const stand = await read(P);
    res.push({ name, jogs, jog: jogs[0], stand });
  }
  return res;
}

const fmt = (r) => r && r.layers ? `${r.pose}/${r.dir} all ${r.all}px: ` + Object.entries(r.layers).filter(([, v]) => v).map(([k, v]) => `${k.replace(/^_/, '')}${v.on ? '' : ' OFF'}${v.on && v.px === 0 ? ' BLANK' : ''} ${v.px}`).join(', ') : JSON.stringify(r);

/* what is missing at the lift against the settled reads, facing by facing */
function compare(label, early, late, rec) {
  const gone = [];
  const byKey = new Map();
  for (const l of late) for (const r of [...l.jogs, l.stand]) if (r && r.layers) byKey.set(`${r.pose}/${r.dir}/${r.f}`, r);
  for (let i = 0; i < early.length; i++) {
    const reads = [...early[i].jogs.map((r, j) => ['jog' + j, r]), ['stand', early[i].stand]];
    for (const [kind, a] of reads) {
      const b = a && byKey.get(`${a.pose}/${a.dir}/${a.f}`);
      if (!a || !b || !a.layers || !b.layers) continue;
      const parts = [];
      if (b.all > 0 && a.all < b.all * 0.85) parts.push(`the figure ${a.all} of ${b.all} px`);
      for (const k of Object.keys(b.layers)) {
        const x = a.layers[k], y = b.layers[k];
        if (y && y.on && y.px > 20 && (!x || !x.on || x.px < y.px * 0.5)) parts.push(`${k.replace(/^_/, '')} ${x ? (x.on ? x.px + ' px' : 'off') : 'none'} (settled ${y.px} px)`);
      }
      if (parts.length) gone.push(`${early[i].name} ${kind} (${a.pose}/${a.dir}/${a.f}): ${parts.join('; ')}`);
    }
  }
  note(`${label}: ${gone.length ? gone.length + ' reads with a part gone' : 'every facing whole'}`);
  for (const g of gone) note('  GONE ' + g);
  rec.ok(`${label}: every facing straight after the lift draws all the bro draws once settled (${gone.length} reads with a part gone)`, gone.length === 0, gone.slice(0, 8));
}

async function atLift(P, label, rec) {
  const lift = await H.waitFor(P, () => window.__qaLift || null, (v) => !!v, { timeout: 240000, label: 'the lift' }).catch(() => null);
  note(`${label}: the screen lifted at ${lift && lift.at} ms, the bro's steps then ${lift ? JSON.stringify(Object.keys(lift.steps)) : '?'}`);
  await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 60000, label: 'in the Wheel' }).catch(() => null);
  const tag = label.slice(0, 1);
  const early = await turnAll(P, tag + '-lift');
  const done = await H.waitFor(P, () => window.__qaDone || null, (v) => !!v, { timeout: 600000, label: 'the bro done' }).catch(() => null);
  await H.waitFor(P, () => !!(window.__btPreloadSteps || {}).alt, (v) => v, { timeout: 600000, label: 'the spare sets' }).catch(() => null);
  await P.page.waitForTimeout(3000);
  note(`${label}: the bro's chain done at ${done && done.at} ms`);
  const late = await turnAll(P, tag + '-settled');
  for (let i = 0; i < early.length; i++) {
    for (const r of early[i].jogs) note(`  ${early[i].name} at the lift   jog f${r.f} ${fmt(r)}`);
    note(`  ${early[i].name} at the lift stand ${fmt(early[i].stand)}`);
    for (const r of late[i].jogs) note(`  ${early[i].name} settled       jog f${r.f} ${fmt(r)}`);
    note(`  ${early[i].name} settled     stand ${fmt(late[i].stand)}`);
  }
  const lm = await P.page.evaluate(() => (window.__btLocalMisses ? window.__btLocalMisses() : null)).catch(() => null);
  if (lm) note(`  the cache: ${lm.size} of ${lm.cap}, the worn set ${lm.worn}; misses ${JSON.stringify(lm.misses.slice(-12).map((m) => m.pose + '/' + m.dir))}`);
  compare(label, early, late, rec);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const errs = [];
  const A = await H.newPlayer(browser, { name: 'Invisbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, init: WATCH });
  A.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  const stopA = H.keepAlive(A);
  try {
    await H.enterWorld(A, 240000);
    await A.page.waitForTimeout(1500);
    const myId = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'kit', myId, { what: 'armor' });
    let pieces = null;
    for (let i = 0; i < 40 && !pieces; i++) {
      pieces = await A.page.evaluate(() => {
        const R = window._gameState.current.rpg || {};
        const t = (R.armorStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        const l = (R.legsStash || []).find((x) => x && x.mat === 'copper' && x.gid);
        return t && l ? { t: t.gid, l: l.gid } : null;
      });
      if (!pieces) await A.page.waitForTimeout(300);
    }
    rec.ok('setup: the kit gave the copper pair (guard)', !!pieces, pieces);
    await A.page.evaluate((p) => {
      const S = window._gameState.current;
      const R = S.rpg;
      const ti = (R.armorStash || []).findIndex((x) => x && x.gid === p.t);
      const li = (R.legsStash || []).findIndex((x) => x && x.gid === p.l);
      if (ti >= 0) { R.armor = R.armorStash[ti]; R.armorStash.splice(ti, 1); }
      if (li >= 0) { R.legsArmor = R.legsStash[li]; R.legsStash.splice(li, 1); }
      if (window.__btSyncArmorLayers) window.__btSyncArmorLayers(R);
      S.channel.send({ type: 'stats_update', payload: { armorRef: p.t, legsArmorRef: p.l } });
    }, pieces);
    let onFile = false;
    for (let i = 0; i < 40 && !onFile; i++) {
      const rpg = (await H.adminPlayer(wsPort, myId)).rpg || {};
      onFile = !!(rpg.armorRef && rpg.legsArmorRef) || /copper/.test(JSON.stringify([rpg.armor, rpg.legsArmor]));
      if (!onFile) await A.page.waitForTimeout(500);
    }
    rec.ok('setup: the worker holds the copper pair worn (guard)', onFile);
    await A.page.waitForTimeout(4000);

    /* A. a returning login */
    await A.page.reload({ waitUntil: 'domcontentloaded' });
    await H.enterWorld(A, 240000);
    await atLift(A, 'A. a returning login', rec);

    /* B (a first login for the bakes, `?bakekeep=0`) is the same as C for the bakes */
    /* C. a fresh browser on the same device */
    const kd = await H.keyAndDevice(A);
    const C = await H.newPlayer(browser, { name: 'Invisbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, init: WATCH, phrase: kd.phrase, device: kd.device });
    C.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
    const stopC = H.keepAlive(C);
    try {
      await H.enterWorld(C, 240000);
      await atLift(C, 'C. a fresh browser', rec);
    } finally { stopC(); }
  } catch (e) { errs.push('scenario: ' + String(e && e.message || e).slice(0, 300)); }
  finally { stopA(); }
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 5));
  try { mkdirSync('tools/qa/mp/out', { recursive: true }); writeFileSync(OUT, log.join('\n') + '\n'); } catch (e) { /* the console has it */ }
}
