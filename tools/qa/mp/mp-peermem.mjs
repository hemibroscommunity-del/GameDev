/* ═══ WHAT ONE MORE BRO ON YOUR SCREEN COSTS YOUR PHONE (v2.3.3698) ═══
 *
 * The owner, 2026-10-27: "how does it strain the memory budget for NPCs to
 * walk around (they're created in-house through the trait picker?) if BroTown
 * can hold 120 players no problem?"  A townsperson walking about would be
 * drawn the way another player is: the shared body and clothes sheets in that
 * look's colours, its hair and hat, a jog in eight facings.  This measures
 * what that costs the phone watching: a phone in BroTown, then PEERS other
 * players in looks of their own (skin, trousers, boots, hair, hat) joining
 * beside it one at a time and walking round it in a circle (every facing of
 * the jog drawn), the watcher's memory read after each, mp-membudget's ruler
 * (memprobe.mjs, after forced GCs).
 *
 *   node tools/qa/mp/run.mjs peermem
 *   BT_PEERMEM_N=n     how many others (4)
 * Numbers: tools/qa/mp/out/peermem.json.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MEM_INIT, memSampler } from './memprobe.mjs';

const PHONE = { width: 390, height: 844 };
const N = +(process.env.BT_PEERMEM_N || 4);
/* ids from the creator's own catalogs (playerSkins.js SKIN/PANTS/SHOES_CATALOG,
   hairColorCatalog.js, public/sprites/traits/hair and headwear) */
const LOOKS = [
  { skin: 'pale', pants: 'teal', shoes: 'white', hair: 'afro', haircolor: 'blonde', headwear: 'none' },
  { skin: 'ebony', pants: 'red', shoes: 'blue', hair: 'long', haircolor: 'red', headwear: 'red-cap' },
  { skin: 'tan', pants: 'purple', shoes: 'brown', hair: 'flat-top', haircolor: 'black', headwear: 'none' },
  { skin: 'deep', pants: 'black', shoes: 'red', hair: 'none', haircolor: 'black', headwear: 'cowboy-hat' },
  { skin: 'olive', pants: 'white', shoes: 'black', hair: 'wavy', haircolor: 'gray', headwear: 'none' },
  { skin: 'fair', pants: 'blue', shoes: 'white', hair: 'split-hair', haircolor: 'brown', headwear: 'beanie' },
];
const dress = (who) => `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', ${JSON.stringify(who.skin)});
  localStorage.setItem('bt-pants', ${JSON.stringify(who.pants)});
  localStorage.setItem('bt-shoes', ${JSON.stringify(who.shoes)});
  localStorage.setItem('bt-hair', ${JSON.stringify(who.hair)});
  localStorage.setItem('bt-haircolor', ${JSON.stringify(who.haircolor)});
  localStorage.setItem('bt-headwear', ${JSON.stringify(who.headwear)});
} catch (e) {}`;

/* a walk round the watcher, a few seconds in each of eight headings */
async function circle(P) {
  const ways = [['w'], ['w', 'd'], ['d'], ['s', 'd'], ['s'], ['s', 'a'], ['a'], ['w', 'a']];
  for (const keys of ways) {
    for (const k of keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(700);
    for (const k of keys) await P.page.keyboard.up(k);
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: MEM_INIT });
  const peers = [];
  const out = { steps: [] };
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  /* every page kept from the 2-minute idle logout while the others load (a
     peer takes a minute or two to come in on this box, and a watcher logged
     out hears of nobody after: its first run saw only the first peer) --
     Control, the QA keep-alive key, as mp-battlemem */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      for (const Q of [A, ...peers]) await Q.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 4 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(A);
    const ok = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the world' }).catch(() => null);
    rec.ok('the watcher is in BroTown (guard)', !!ok, ok);
    if (!ok) return;
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const { sample } = await memSampler(A, browser);
    await A.page.waitForTimeout(4000);
    const base = await sample('alone');
    out.steps.push(base);
    console.log(`    alone: GPU ${base.gpu}, canvases ${base.canvasMB} (${base.canvasN}), cache ${base.cache}, heap ${base.heapMB}`);
    const here = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
    for (let i = 0; i < N; i++) {
      const look = LOOKS[i % LOOKS.length];
      const B = await H.newPlayer(browser, { name: 'Peer' + (i + 1), wsPort, webPort, viewport: { width: 390, height: 600 }, touch: false, world: 'wheel', init: dress(look) });
      peers.push(B);
      B.page.on('pageerror', (e) => errors.push('peer: ' + String((e && e.message) || e).slice(0, 160)));
      await H.enterWorld(B);
      await H.waitFor(B, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
        { timeout: 90000, label: 'peer into the world' }).catch(() => null);
      await H.hopTo(B, here.x + 60 + i * 30, here.y - 40, { step: 80, gap: 200, tries: 80 }).catch(() => null);
      const bid = await H.readState(B, (S) => S.myId);
      /* readState sends the function as its source, so the id goes in it */
      const seesB = new Function('S', `const o = S.others && S.others[${JSON.stringify(bid)}];
        return o ? { has: true, x: Math.round(o.x), y: Math.round(o.y) } : { has: false };`);
      const seen = await H.waitFor(A, seesB, (v) => v.has, { timeout: 30000, label: 'the watcher sees the peer' }).catch(() => null);
      if (!seen) {
        /* why not: where the peer is, and what the watcher holds */
        const bAt = await H.readState(B, (S) => ({ id: S.myId, zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y) })).catch((e) => String(e).slice(0, 120));
        const aKnows = await H.readState(A, (S) => Object.keys(S.others || {})).catch(() => null);
        console.log(`    peer ${i + 1} not seen: ${JSON.stringify(bAt)}; the watcher holds ${JSON.stringify(aKnows)}`);
      }
      await circle(B);
      await A.page.waitForTimeout(2500);
      const s = await sample(`with ${i + 1} other${i ? 's' : ''}`);
      s.look = look;
      s.seen = seen;
      out.steps.push(s);
      const prev = out.steps[out.steps.length - 2];
      console.log(`    with ${i + 1}: GPU ${s.gpu} (+${(s.gpu - prev.gpu).toFixed(1)}), canvases ${s.canvasMB} (+${(s.canvasMB - prev.canvasMB).toFixed(1)}, ${s.canvasN}), cache ${s.cache}, heap ${s.heapMB}; seen ${JSON.stringify(seen)}`);
    }
    const last = out.steps[out.steps.length - 1];
    const per = (k) => +((last[k] - base[k]) / N).toFixed(2);
    out.perPeer = { gpu: per('gpu'), canvasMB: per('canvasMB'), cache: per('cache'), heapMB: per('heapMB'), buffersMB: per('buffersMB') };
    rec.ok(`each other bro in view, in a look of their own, walking round: GPU +${out.perPeer.gpu}, canvases +${out.perPeer.canvasMB}, art +${out.perPeer.cache}, heap +${out.perPeer.heapMB} MB (a reading)`,
      out.steps.length === N + 1, out.perPeer);
    rec.ok(`the watcher saw every one of them (${out.steps.filter((x) => x.seen).length} of ${N})`,
      out.steps.slice(1).every((x) => x.seen), out.steps.slice(1).map((x) => !!x.seen));
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    writeFileSync(join(OUT, 'peermem.json'), JSON.stringify(out, null, 2));
    for (const B of peers) await B.ctx.close().catch(() => {});
    await A.ctx.close().catch(() => {});
  }
}
