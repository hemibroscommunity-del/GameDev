/* ═══ THE MONSTER CODEX, ON A PHONE (v2.3.3153) ═══
 *
 * Owner, 2026-10-12: "Begin working on the monster section of the codex.
 * After you kill a monster you learn more about it, what it does, where it's
 * from, elemental type, special attack, (make up a backstory) etc. it'll be
 * another dashboard section that just displays information.  Maybe an
 * animation similar to how the skills preview window currently works."
 *
 * A real player in the Wheel, a real worker, real kills (the test kit's
 * `kill`, which kills through _resolveMonsterKill, the path every kill takes):
 *   1. the worker says it counts (caps.codex) and sends the codex at join;
 *      More -> Codex opens on Monsters: nine cards, every one a shape;
 *   2. a snowman's kill: counted (snowling 1), said over your head, its card
 *      known and NEW, and its page open -- what it does and where it is from,
 *      the rest locked -- with its stage loaded and playing its throw;
 *   3. two more: its ELEMENT opens, and the stage's hit says "Chill";
 *   4. the dev lever (25 kills, one past 20): its special attack plays on the
 *      stage (the burrow), its story and its elder form open, and the elder
 *      toggle names it a Glacier Snowman;
 *   5. every one of the nine pages, all open: its stage loads, and plays its
 *      own special (lunge, slam, unwrap, burst, burrow), what it throws in
 *      before its first flight, and nothing standing over your character --
 *      pictures in tools/qa/mp/out/codex-<kind>.png;
 *   6. closed, nothing is left behind: every picture a stage baked revoked;
 *   7. a reload: the counts come back from the worker;
 *   8. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const KINDS = ['snowling', 'gobling', 'mumling', 'pebbling', 'sparklet', 'finling', 'wisplet', 'lurkling', 'dewdrop'];
/* the phase each kind's special shows on its stage (CodexStage planFor) */
const SPECIAL_PHASE = { snowling: 'pile', gobling: 'dash', mumling: 'unwrap', pebbling: 'slam', sparklet: 'dash', finling: 'slam', wisplet: 'dash', lurkling: 'slam', dewdrop: 'swell' };

/* every blob picture made and let go, counted from the page's start */
const BLOB_INIT = () => {
  const made = new Set();
  const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function (o) { const u = c(o); try { made.add(u); } catch (e) { /* count only */ } return u; };
  URL.revokeObjectURL = function (u) { try { made.delete(u); } catch (e) { /* count only */ } return r(u); };
  window.__qaBlobs = () => made.size;
};

const codex = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, c = S._codex;
  return { caps: !!(S._serverCaps && S._serverCaps.codex), known: !!(c && c.known), k: c ? JSON.parse(JSON.stringify(c.k)) : null,
    fresh: c ? JSON.parse(JSON.stringify(c.fresh)) : null };
});
const said = (P, re) => P.page.evaluate((src) => {
  const S = window._gameState.current;
  const rx = new RegExp(src);
  return (S.dmgNumbers || []).map((d) => d && (d.text || d.str || d.label)).filter((t) => typeof t === 'string' && rx.test(t));
}, re.source);
const kill = async (wsPort, me, id) => H.devOp(wsPort, 'trapping', me, { kill: id });
const openCodex = async (P) => {
  await H.openDest(P, 'More').catch(() => {});
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => { const b = document.querySelector('[data-more-tile="encyclopedia"]'); if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
  return P.page.waitForSelector('[data-cx-grid]', { timeout: 6000 }).then(() => true).catch(() => false);
};
const cards = (P) => P.page.evaluate(() => [...document.querySelectorAll('[data-cx-card]')].map((b) => ({ kind: b.dataset.cxCard, known: b.dataset.cxKnown === '1', fresh: b.dataset.cxFresh === '1', text: b.innerText.replace(/\s+/g, ' ') })));
const openPage = async (P, kind) => {
  await P.page.evaluate((k) => { const b = document.querySelector(`[data-cx-card="${k}"]`); if (b) b.click(); }, kind);
  return P.page.waitForSelector(`[data-cx-page="${kind}"]`, { timeout: 4000 }).then(() => true).catch(() => false);
};
const back = (P) => P.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /All monsters/.test(x.innerText)); if (b) b.click(); });
const facts = (P) => P.page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-cx-fact]')].map((f) => [f.dataset.cxFact, f.dataset.cxOpen === '1'])));
/* every phase the stage passes through in `ms` -- watched as it changes (a
   MutationObserver), so a 0.2 s dash on a page drawing a few frames a second
   is never missed between two looks.  Also:
     shots  each throw's picture as its flight BEGINS: in and decoded ('in'),
            not yet ('late': it would cross the gap undrawn), or a drawn ball;
     gap    the nearest the monster's art ever came to your character's
            middle, px (sampled every 50 ms: a swelling slime or the mummy's
            bigger bones standing over you reads below 0) */
const watchStage = (P, ms) => P.page.evaluate((ms) => new Promise((resolve) => {
  const seen = new Set(); const pops = new Set(); const labels = new Set(); const zones = new Set();
  const shots = [];
  let ready = false, lastPhase = null, gap = Infinity, gapAt = null;
  const look = () => {
    const st = document.querySelector('[data-cx-stage]');
    if (!st) return;
    const ph = st.dataset.cxPhase;
    seen.add(ph);
    if (st.dataset.cxReady === '1') ready = true;
    if (ph === 'fly' && lastPhase !== 'fly') {
      const sh = st.querySelector('.bt-cx-shot');
      shots.push(!sh ? 'none' : sh.tagName !== 'IMG' ? 'ball' : (sh.complete && sh.naturalWidth > 0 ? 'in' : 'late'));
    }
    lastPhase = ph;
    for (const p of st.querySelectorAll('[data-cx-pop]')) pops.add(p.dataset.cxPop + ':' + p.innerText.trim());
    for (const l of st.querySelectorAll('[data-cx-label]')) labels.add(l.innerText.trim());
    for (const z of st.querySelectorAll('[data-cx-zone]')) zones.add(z.dataset.cxZone);
  };
  const measure = () => {
    const st = document.querySelector('[data-cx-stage]');
    if (!st || st.dataset.cxReady !== '1') return;
    const hero = st.querySelector('.bt-cx-hero');
    const strip = st.querySelector('.bt-cx-mon .bt-cx-strip');
    if (!hero || !strip) return;
    const hr = hero.getBoundingClientRect(), sr = strip.getBoundingClientRect();
    const g = (sr.left + (+strip.dataset.cxX0 || 0) * sr.width) - (hr.left + hr.width / 2);
    if (g < gap) { gap = g; gapAt = st.dataset.cxPhase; }
  };
  const mo = new MutationObserver(look);
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-cx-phase', 'data-cx-ready'] });
  const iv = setInterval(measure, 50);
  look();
  setTimeout(() => {
    mo.disconnect(); clearInterval(iv); look();
    const st = document.querySelector('[data-cx-stage]');
    resolve({ phases: [...seen], ready, pops: [...pops], labels: [...labels], zones: [...zones], strips: st ? st.querySelectorAll('.bt-cx-strip').length : 0,
      shots, gap: Number.isFinite(gap) ? Math.round(gap) : null, gapAt });
  }, ms);
}), ms);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Codexbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', init: '(' + BLOB_INIT.toString() + ')();' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { god: true, godMinutes: 60 }).catch(() => {});
    await P.page.waitForTimeout(3000);

    /* ── 1 ── */
    const c0 = await codex(P);
    rec.ok('the worker counts (caps.codex) and sent the codex at join, empty', c0.caps && c0.known && c0.k && Object.keys(c0.k).length === 0, c0);
    /* the blob pictures alive before any codex page opens: the stat preview's
       baked blue slime (statDemoPreload, kept for the session) and whatever
       else the game made -- what the codex leaves is counted against this */
    const blobs0 = await P.page.evaluate(() => (window.__qaBlobs ? window.__qaBlobs() : null));
    const opened = await openCodex(P);
    const cs0 = await cards(P);
    rec.ok(`More -> Codex opens on Monsters: nine cards, every one a shape (${cs0.filter((c) => !c.known).length} unknown)`,
      opened && cs0.length === 9 && cs0.every((c) => !c.known) && KINDS.every((k) => cs0.some((c) => c.kind === k)), cs0);
    await P.page.screenshot({ path: join(OUT, 'codex-0-grid.png') });

    /* ── 2 ── */
    const k1 = await kill(wsPort, me, 'wm-frost-0');
    await H.waitFor(P, (S) => (S._codex && S._codex.k.snowling ? S._codex.k.snowling[0] : 0), (v) => v >= 1, { timeout: 8000, label: 'the first kill counted' }).catch(() => null);
    const c1 = await codex(P);
    const s1 = await said(P, /New in the Codex: Snowman/);
    rec.ok(`a snowman's kill is counted (snowling ${c1.k && c1.k.snowling ? c1.k.snowling.join('/') : '-'}) and said over your head ("${s1[0] || '?'}")`,
      k1 && k1.ok && c1.k && c1.k.snowling && c1.k.snowling[0] === 1 && s1.length >= 1, { k1, c1, s1 });
    await P.page.waitForTimeout(700);
    const cs1 = await cards(P);
    const snowCard = cs1.find((c) => c.kind === 'snowling');
    rec.ok(`...its card is known and NEW ("${snowCard && snowCard.text}")`, !!snowCard && snowCard.known && snowCard.fresh && /Snowman/.test(snowCard.text) && /1 defeated/.test(snowCard.text), snowCard);
    const pg1 = await openPage(P, 'snowling');
    const f1 = await facts(P);
    const w1 = await watchStage(P, 7000);
    rec.ok('...its page: what it does open; element, special attack, story and elder form locked', pg1 && f1.page && !f1.element && !f1.special && !f1.story && !f1.elder, f1);
    rec.ok(`...its stage loads its strips and plays its throw (${w1.phases.join(' > ')})`,
      w1.ready && w1.strips >= 1 && ['throw', 'fly', 'impact'].every((p) => w1.phases.includes(p)) && w1.pops.length === 0, w1);
    await P.page.screenshot({ path: join(OUT, 'codex-1-snowman.png') });
    const fr1 = await codex(P);
    rec.ok('...and opening it clears its NEW', !(fr1.fresh && fr1.fresh.snowling), fr1.fresh);

    /* ── 3 ── */
    await kill(wsPort, me, 'wm-frost-1');
    await kill(wsPort, me, 'wm-frost-2');
    await H.waitFor(P, (S) => (S._codex && S._codex.k.snowling ? S._codex.k.snowling[0] : 0), (v) => v >= 3, { timeout: 8000, label: 'three kills counted' }).catch(() => null);
    const s3 = await said(P, /Codex: Snowman - its element/);
    await P.page.waitForTimeout(600);
    const f3 = await facts(P);
    const w3 = await watchStage(P, 7000);
    rec.ok(`three kills open its ELEMENT ("${s3[0] || '?'}"), and the stage's hit says Chill (${w3.pops.join(', ')})`,
      s3.length >= 1 && f3.element && !f3.special && w3.pops.some((p) => /^frost:.*Chill/.test(p)), { s3, f3, w3 });

    /* ── 4 ── */
    const d4 = await H.devOp(wsPort, 'codex', me, { kind: 'snowling', n: 25, n2: 1 });
    await H.waitFor(P, (S) => (S._codex && S._codex.k.snowling ? S._codex.k.snowling[0] : 0), (v) => v >= 25, { timeout: 8000, label: 'the dev lever' }).catch(() => null);
    await P.page.waitForTimeout(600);
    const f4 = await facts(P);
    const w4 = await watchStage(P, 16000);
    rec.ok('the dev lever (25, one past 20): special attack, story and elder form open', d4 && d4.ok && f4.special && f4.story && f4.elder, { d4, f4 });
    rec.ok(`...and the stage plays the burrow: ${w4.labels.join(', ') || 'no word'} (${w4.phases.join(' > ')})`,
      ['burrow', 'pile', 'touch', 'emerge'].every((p) => w4.phases.includes(p)) && w4.labels.includes('BURROW!'), w4);
    await P.page.evaluate(() => { const b = document.querySelector('[data-cx-elder-toggle="1"]'); if (b) b.click(); });
    await P.page.waitForTimeout(400);
    const elderName = await P.page.evaluate(() => { const n = document.querySelector('[data-cx-name]'); return n ? n.innerText : ''; });
    const w4b = await watchStage(P, 5000);
    rec.ok(`...the elder toggle names it "${elderName}", its stage re-coloured and playing`, elderName === 'Glacier Snowman' && w4b.ready, { elderName, w4b });
    await P.page.screenshot({ path: join(OUT, 'codex-2-snowman-elder.png') });
    await back(P);

    /* ── 5 ── */
    await H.devOp(wsPort, 'codex', me, { all: true, n: 25, n2: 1 });
    await P.page.waitForTimeout(700);
    const every = [];
    for (const kind of KINDS) {
      const ok = await openPage(P, kind);
      const w = await watchStage(P, kind === 'snowling' ? 15000 : 12000);
      every.push({ kind, ok, ready: w.ready, special: w.phases.includes(SPECIAL_PHASE[kind]), phases: w.phases, labels: w.labels, pops: w.pops,
        zones: w.zones, shots: w.shots, gap: w.gap, gapAt: w.gapAt });
      await P.page.screenshot({ path: join(OUT, 'codex-' + kind + '.png') });
      await back(P);
      await P.page.waitForTimeout(300);
    }
    const bad = every.filter((e) => !e.ok || !e.ready || !e.special);
    rec.ok(`every page's stage loads and plays its own special (${every.filter((e) => e.special).length}/9)`, bad.length === 0, bad.length ? bad : every.map((e) => e.kind + ':' + e.labels.join('/')));
    rec.ok('...and every hit there says its element', every.every((e) => e.pops.length >= 1), every.map((e) => e.kind + ' ' + e.pops.join(',')));
    /* a throw's picture is in before its first flight (it loads with the
       strips), and nothing ever stands over your character -- the swelling
       slime backs off as it grows, the mummy's bones keep their own reach */
    /* a slam or a lunge marks the ground under you as it winds up, the
       world's own warning circle; nothing else draws one */
    const ZONED = { gobling: 'lunge', pebbling: 'slam', sparklet: 'lunge', finling: 'slam', wisplet: 'lunge', lurkling: 'slam' };
    rec.ok(`...a slam or a lunge marks the ground under you as it winds up (${every.filter((e) => e.zones.length).map((e) => e.kind + ':' + e.zones.join('/')).join(', ')})`,
      every.every((e) => (ZONED[e.kind] ? e.zones.length === 1 && e.zones[0] === ZONED[e.kind] : e.zones.length === 0)), every.map((e) => e.kind + ' ' + e.zones.join('/')));
    const thrown = every.filter((e) => e.shots.length);
    rec.ok(`...every thrown picture is in as its first flight begins (${thrown.map((e) => e.kind + ' ' + e.shots.join('/')).join(', ')})`,
      thrown.length >= 5 && thrown.every((e) => e.shots.every((x) => x === 'in' || x === 'ball')), thrown.map((e) => ({ kind: e.kind, shots: e.shots })));
    rec.ok(`...and no monster ever stands over your character (nearest ${Math.min(...every.map((e) => (e.gap == null ? 99 : e.gap)))} px from its middle)`,
      every.every((e) => e.gap != null && e.gap >= 0), every.map((e) => e.kind + ' ' + e.gap + ' at ' + e.gapAt));

    /* ── 6 ── */
    await H.closeDest(P).catch(() => {});
    await P.page.waitForTimeout(800);
    const left = await P.page.evaluate(() => ({ blobs: window.__qaBlobs ? window.__qaBlobs() : null, stage: !!document.querySelector('[data-cx-stage]') }));
    rec.ok(`closed, nothing is left behind: no stage, and every picture the stages baked revoked (${left.blobs} blob(s) alive, ${blobs0} before the codex opened)`,
      !left.stage && left.blobs != null && blobs0 != null && left.blobs <= blobs0, { left, blobs0 });

    /* ── 7 ── */
    await P.page.reload();
    await H.enterWorld(P).catch(() => {});
    const back7 = await H.waitFor(P, (S) => (S._codex && S._codex.known ? S._codex.k : null), (v) => !!v && v.snowling && v.snowling[0] === 25, { timeout: 90000, label: 'the codex after a reload' }).catch(() => null);
    rec.ok('a reload: the counts come back from the worker', !!back7 && KINDS.every((k) => back7[k] && back7[k][0] === 25 && back7[k][1] === 1), back7);

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
