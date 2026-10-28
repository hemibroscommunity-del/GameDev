/* ═══ v2.3.3727: A CROWD OF ONE SOUND STARTS AS A FEW (`?voicecap`) ═══
 *
 * The owner asked about many copies of the SAME sound starting at nearly the
 * same moment in a crowd.  With `?voicecap` (data/voiceCap.js) at most N
 * copies of one recording start within W ms; the first always plays;
 * different recordings never hold each other back.
 *
 * Two phones in the world's BroTown, one as the game is and one `?voicecap`,
 * each playing through the game's own BT_AUDIO:
 *   1. the sounds in on both (guard);
 *   2. A WHIRLWIND INTO A PACK: ten monsters hit at once (materialHit, the
 *      call every hit on a monster makes) and then ten deaths (monsterDeath):
 *      as the game is, ten copies of one recording start in one instant; with
 *      the switch, at most N of any recording start within W ms;
 *   3. THE FIRST BLOW IS NEVER SILENT: after a quiet beat, one hit starts
 *      every layer of its voice, on both;
 *   4. A NORMAL FLURRY IS UNCHANGED: eight swings and their hits a quarter of
 *      a second apart, and the three swing recordings at one instant, start
 *      the same on both phones, nothing held back;
 *   5. no memory changes: the sound held decoded is the same on both;
 *   6. no page errors.
 *
 *   node tools/qa/mp/run.mjs voicecap
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const settle = (P) => P.page.evaluate(async () => {
  const t0 = Date.now();
  const A = () => window.BT_AUDIO;
  try { if (A() && !A().ctx && A().unlock) A().unlock(); } catch (e) { /* */ }
  const want = ['monster-hit', 'sword-hit2', 'sword-hit3', 'sword-swing-1', 'sword-swing-2', 'sword-swing-3', 'skeleton-death', 'pan-sizzle'];
  while (Date.now() - t0 < 90000) {
    const a = A();
    if (a && a.ctx && want.every((k) => a._samples[k]) && !Object.keys(a._sampleLoading || {}).length) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const a = A();
  try { if (a.ctx.state !== 'running') await a.ctx.resume(); } catch (e) { /* */ }
  return { have: want.filter((k) => a._samples[k]).length, of: want.length, on: !!a.VOICE_CAP, cap: a.VOICE_CAP, mb: a.decodedMB(), state: a.ctx.state };
});

/* run `body` on the page with every start counted by recording: the starts
   play() let through (a handle back), by key */
const startsOf = (P, body) => P.page.evaluate(async (src) => {
  const A = window.BT_AUDIO;
  window.__btVoiceCap(true);
  const orig = A._startOn, starts = [];
  A._startOn = function (buf, o, g) {
    const r = orig.call(this, buf, o, g);
    if (r) starts.push({ key: Object.keys(A._samples).find((k) => A._samples[k] === buf) || '?', at: performance.now() + ((o && o.delay) || 0) * 1000 });
    return r;
  };
  try { await (new Function('A', 'return (' + src + ')(A)'))(A); } finally { A._startOn = orig; }
  const byKey = {};
  for (const s of starts) byKey[s.key] = (byKey[s.key] || 0) + 1;
  return { n: starts.length, byKey, vc: window.__btVoiceCap() };
}, body.toString());

const pack = async (A) => {
  for (let i = 0; i < 10; i++) A.materialHit('flesh', { vol: 0.05 });
  for (let i = 0; i < 10; i++) A.monsterDeath('skeleton', { vol: 0.05 });
  for (let i = 0; i < 10; i++) A.monsterDeath('fireGoblin', null, 0.05);
};
const firstBlow = async (A) => {
  await new Promise((r) => setTimeout(r, 400));
  A.materialHit('flesh', { vol: 0.05 });
};
const flurry = async (A) => {
  for (let i = 0; i < 8; i++) {
    A.swordSwing('sword-swing', { vol: 0.05 });
    A.materialHit('flesh', { vol: 0.05 });
    await new Promise((r) => setTimeout(r, 250));
  }
  A.play('sword-swing-1', { vol: 0.05 }); A.play('sword-swing-2', { vol: 0.05 }); A.play('sword-swing-3', { vol: 0.05 });
};

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Allvoices', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const B = await H.newPlayer(browser, { name: 'Fewvoices', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'voicecap' });
  const errs = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(A);
    await H.enterWorld(B);
    await A.page.mouse.click(195, 300).catch(() => {});
    await B.page.mouse.click(195, 300).catch(() => {});
    const a = await settle(A), b = await settle(B);
    rec.ok(`1. the sounds in on both phones (${a.have}/${a.of}, ${b.have}/${b.of}), the switch off on the first and on at ${b.cap && b.cap.n} a ${b.cap && b.cap.w} ms on the second (guard)`,
      a.have === a.of && b.have === b.of && !a.on && b.on, { a, b });
    const N = b.cap.n, W = b.cap.w;

    /* 2. a whirlwind into a pack */
    const pa = await startsOf(A, pack), pb = await startsOf(B, pack);
    const worst = (r) => Math.max(0, ...Object.values(r.byKey));
    rec.ok(`2. a whirlwind into a pack of ten (ten hits, then ten deaths of two kinds): as the game is ${pa.n} sounds start, ${worst(pa)} copies of one recording at once (${pa.vc.maxWindowKeyName}); with the switch ${pb.n}, at most ${worst(pb)} of one (${pb.vc.held} held back)`,
      worst(pa) >= 10 && worst(pb) <= N && pb.vc.maxWindowKey <= N && pb.vc.held > 0 && Object.keys(pb.byKey).length === Object.keys(pa.byKey).length,
      { off: pa, on: pb });

    /* 3. the first blow */
    const fa = await startsOf(A, firstBlow), fb = await startsOf(B, firstBlow);
    const hitN = (r) => r.byKey['monster-hit'] || 0;
    rec.ok(`3. the first blow after a quiet beat is never silent: one hit starts its voice (${hitN(fb)}) with the switch, as the game is (${hitN(fa)})`,
      hitN(fb) === 1 && hitN(fa) === 1 && fb.vc.held === 0, { fa, fb });

    /* 4. a normal flurry */
    /* (the fight's own recordings: a townsperson's laugh or a pond's plop
       may start in the same two seconds on either phone) */
    const la = await startsOf(A, flurry), lb = await startsOf(B, flurry);
    const fight = (r) => Object.entries(r.byKey).filter(([k]) => /^(sword-|monster-hit|snowman-hit|armor-hit)/.test(k)).sort().map(([k, n]) => k + ':' + n).join(' ');
    rec.ok(`4. a flurry (eight swings and hits, a quarter second apart, then the three swing recordings at once) unchanged: ${fight(lb)} with the switch, ${fight(la)} as the game is, none held back`,
      fight(lb) === fight(la) && lb.vc.held === 0 && (lb.byKey['sword-swing-1'] || 0) >= 1 && (lb.byKey['sword-swing-2'] || 0) >= 1 && (lb.byKey['sword-swing-3'] || 0) >= 1, { la, lb });

    /* 5. memory */
    const ma = await A.page.evaluate(() => window.BT_AUDIO.decodedMB()), mb = await B.page.evaluate(() => window.BT_AUDIO.decodedMB());
    rec.ok(`5. no memory changes: the sound held decoded ${ma.mb} MB as the game is, ${mb.mb} MB with the switch (each copy plays one decoded recording)`,
      Math.abs(ma.mb - mb.mb) < 0.2, { ma, mb });

    rec.ok(`6. no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  } finally {
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
