/* ═══ A LOOK THAT LOADS AS YOU RIDE COSTS THE PAGE ALMOST NOTHING (v2.3.4400, v2.3.4470) ═══
 *
 * The owner's iPhone 14 Pro Max: "It noticeably slowed when I rode by the
 * blacksmith hammering."  Not the hammer.  The Blacksmith stands on the
 * Flame Fields' side of the town, and riding up to him is where the fire
 * goblin's look starts to load (wheelMonsterArt.js): fourteen strips.  Each
 * is a 256-colour file and is held as colour numbers, but the way in
 * unpacked the file to full colour, cropped and packed it on a canvas and
 * read every pixel back to find the numbers the file had held all along.
 * And the owner, told so: "I thought fire goblin strips were converted into
 * 256 color art like everything should be ... make sure that's a system
 * going forward so it doesn't happen again."
 *
 * Three ways in, the same ride up to the Blacksmith each time:
 *   - AS IT SHIPS (v2.3.4470): the reader's worker reads the file's own
 *     numbers and crops and packs them (stripRead.js, stripPack.js); the
 *     page makes the texture;
 *   - `?stripworker=0` (v2.3.4400): the page unpacks it, a few ms a frame;
 *   - `?stripworker=0&stripgentle=0`: the page unpacks each strip in one go,
 *     as before either.
 * The first two with `?stripslice=4`, a 60-a-second phone's slice (this
 * box's own frames are 200 ms).  Every job that holds the page names itself
 * (window.__btMade).  Asserted:
 *   - all at once: ten or more strips unpacked in one job each, the longest
 *     OLD_HOLD_MS or more (the fault);
 *   - a few ms a frame: none in one job; slices, none past SLICE_MAX_MS;
 *   - as it ships: every strip read by the worker, none unpacked on the page
 *     at all, and the page's own work a strip (its texture made) at most
 *     MADE_MAX_MS, MADE_SUM_MS for the whole look;
 *   - all three end with the same look: every strip the same size, the same
 *     pixels see-through, the same colour wherever a pixel is solid;
 *   - and, in one browser, each strip both ways (window.__btStripCompare):
 *     the same size and the same cells, no pixel's see-through differing, no
 *     solid pixel's colour differing, and a partly see-through pixel drawn
 *     within PARTLY_MAX of a step (the file's own colour, where a canvas gave
 *     back that colour rounded through its store);
 *   - the eight snowman strips put on 256 colours in v2.3.4470 read the same
 *     way.
 *
 *   node tools/qa/mp/run.mjs stripgentle
 */
import * as H from './harness.mjs';

const PHONE = { width: 430, height: 932 };
const OLD_HOLD_MS = 10;       /* this box: 13 to 39 ms a strip in one go */
const SLICE_MAX_MS = 22;      /* a 4 ms slice and the one piece of work that ran past it (a band read, a strip's last step): 10 to 15 ms on this box over five runs, the 15 with two other scenarios before it */
const WANT = 14;              /* the fire goblin's strips: walk, attack and hit by facing, and its death */
const MADE_MAX_MS = 8;        /* the page's work for one strip read by the worker: its numbers on the bundle's row, its texture */
const MADE_SUM_MS = 40;       /* ...and for the whole look (the page's way: 137 to 247 ms) */
const PARTLY_MAX = 2;         /* a partly see-through pixel, as drawn: steps of 255 between the two ways */

async function ride(browser, wsPort, webPort, rec, label, query) {
  const P = await H.newPlayer(browser, { name: 'sg' + (/gentle=0/.test(query) ? 'old' : /worker=0/.test(query) ? 'mid' : 'new'), wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query });
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok(`${label}: in BroTown (guard)`, ok);
    if (!ok) return null;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
    await P.page.waitForTimeout(4000);
    const at = await P.page.evaluate(() => { const f = (window._gameState.current.npcs || []).find((x) => x.name === 'Blacksmith Bro'); return f ? { x: f.x, y: f.y } : null; });
    const before = await P.page.evaluate(() => (window.__btStripTrim ? window.__btStripTrim().filter((s) => /fire-goblin/.test(s.url)).length : -1));
    rec.ok(`${label}: the Blacksmith is found, and no fire goblin strip is loaded at the town's arrival (guard)`, !!at && before === 0, { at, before });
    if (!at) return null;
    await P.page.evaluate(() => { window.__btMade = []; });
    await P.page.keyboard.press('z');
    await H.glideTo(P, at.x, at.y + 270, { speed: 300, timeoutMs: 60000 });
    const got = await H.waitFor(P, () => (window.__btStripTrim ? window.__btStripTrim().filter((s) => /fire-goblin/.test(s.url)).length : 0), (n) => n >= WANT, { timeout: 180000, label: 'the fire goblin\'s strips' }).then(() => true).catch(() => false);
    await P.page.waitForTimeout(1500);
    const made = await P.page.evaluate(() => window.__btMade.slice());
    const jobs = [];
    for (let i = 0; i < made.length; i += 2) jobs.push({ name: String(made[i]), ms: made[i + 1] });
    /* each strip as the game holds it: its packed picture's size, which pixels are see-through, and each solid
       pixel's colour (the numbers' own order in a row of colours depends on which strip came first, so colours are
       compared, not numbers; a partly see-through pixel is compared by its alpha here and as drawn below) */
    const looks = await P.page.evaluate(() => {
      const out = {};
      for (const src of (window.__btPicNumSources ? window.__btPicNumSources() : [])) {
        const label = String(src.label || '');
        if (!/fire-goblin/.test(label)) continue;
        const nums = src._btNumbers;
        let h = 2166136261 >>> 0, solid = 0;
        if (nums) {
          const { idx, pal } = nums;
          for (let i = 0; i < idx.length; i++) {
            const c = pal[idx[i]], al = c >>> 24;
            if (al === 255) solid++;
            h = Math.imul(h ^ (al === 255 ? c : al), 16777619) >>> 0;
          }
        }
        out[label.replace(/^.*\//, '').replace(/[?#].*$/, '')] = { numbers: !!nums, w: nums ? nums.w : 0, h: nums ? nums.h : 0, px: nums ? nums.idx.length : 0, solid, hash: h };
      }
      return out;
    });
    /* as it ships only: each strip both ways in this one browser */
    let both = null;
    if (!/worker=0/.test(query)) {
      both = await P.page.evaluate(async () => {
        const out = [];
        for (const s of window.__btStripTrim().filter((x) => /fire-goblin/.test(x.url))) {
          const r = await window.__btStripCompare(s.url, 256, 256);
          out.push({ name: s.url.replace(/^.*\//, '').replace(/[?#].*$/, ''), ...r });
        }
        return out;
      });
    }
    const read = await P.page.evaluate(() => (window.__btStripRead ? window.__btStripRead() : null));
    /* ...and the snowman's eight strips put on 256 colours in v2.3.4470 (128 x 128 frames): read by the same worker,
       against the page's packer on the same file */
    let snow = null;
    if (!/worker=0/.test(query)) {
      snow = await P.page.evaluate(async () => {
        const out = [];
        for (const n of ['snowman-attack-e', 'snowman-attack-n', 'snowman-attack-ne', 'snowman-attack-s', 'snowman-attack-sw', 'snowman-burrow', 'snowman-emerge', 'snowman-pile']) {
          const r = await window.__btStripCompare('/sprites/monsters/snowman/' + n + '.png?v=qa', 128, 128).catch((e) => ({ ok: false, error: String(e) }));
          out.push({ name: n, ...r });
        }
        return out;
      });
    }
    const slices = await P.page.evaluate(() => (window.__btStripSlices ? window.__btStripSlices() : null));
    return { got, jobs, looks, slices, both, read, snow };
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const now = await ride(browser, wsPort, webPort, rec, 'as it ships', 'stripslice=4');
  const mid = await ride(browser, wsPort, webPort, rec, 'the page, a few ms a frame (?stripworker=0)', 'stripworker=0&stripslice=4');
  const old = await ride(browser, wsPort, webPort, rec, 'the page, all at once (?stripworker=0&stripgentle=0)', 'stripworker=0&stripgentle=0');
  if (!now || !mid || !old) return;
  const whole = (r) => r.jobs.filter((j) => /^strip .*fire-goblin/.test(j.name) && !/^strip made /.test(j.name));
  const sl = (r) => r.jobs.filter((j) => j.name === 'strip slice');
  const made = (r) => r.jobs.filter((j) => /^strip made .*fire-goblin/.test(j.name));
  const sum = (a) => Math.round(a.reduce((t, j) => t + j.ms, 0)), top = (a) => Math.round(Math.max(0, ...a.map((j) => j.ms)) * 10) / 10;
  const ow = whole(old), ms = sl(mid), nm = made(now);
  console.log(`    all at once:        ${ow.length} strips unpacked in one job each, ${sum(ow)} ms of the page in all, the longest ${top(ow)} ms`);
  console.log(`    a few ms a frame:   ${whole(mid).length} in one job; ${ms.length} slices, ${sum(ms)} ms in all, the longest ${top(ms)} ms`);
  console.log(`    as it ships:        ${whole(now).length} unpacked on the page, ${sl(now).length} slices; ${nm.length} textures made, ${sum(nm)} ms of the page in all, the longest ${top(nm)} ms; the reader ${JSON.stringify(now.read)}`);
  rec.ok(`all three pages loaded the fire goblin's ${WANT} strips (guard)`, now.got && mid.got && old.got && [now, mid, old].every((r) => Object.keys(r.looks).length >= WANT), [now, mid, old].map((r) => Object.keys(r.looks).length));
  rec.ok(`all at once: riding up to the Blacksmith unpacks ${ow.length} strips in one job each, ${sum(ow)} ms of the page held, the longest ${top(ow)} ms (the fault: at least ten, the longest ${OLD_HOLD_MS} ms or more)`,
    ow.length >= 10 && top(ow) >= OLD_HOLD_MS && sl(old).length === 0 && made(old).length === 0, { n: ow.length, top: top(ow) });
  rec.ok(`a few ms a frame (v2.3.4400, now the way for a strip the reader cannot read): none in one job (${whole(mid).length}); ${ms.length} slices, none past ${SLICE_MAX_MS} ms (the longest ${top(ms)})`,
    whole(mid).length === 0 && ms.length >= 8 && top(ms) <= SLICE_MAX_MS && made(mid).length === 0 && !!mid.read && mid.read.off === true, { top: top(ms), read: mid.read });
  rec.ok(`as it ships: all ${nm.length} strips read from their files' own numbers off the page's thread (the reader: ${now.read && now.read.read} read, ${now.read && now.read.failed} failed); none unpacked on the page (${whole(now).length}, ${sl(now).length} slices)`,
    nm.length >= WANT && whole(now).length === 0 && sl(now).length === 0 && !!now.read && now.read.read >= WANT && now.read.failed === 0, now.read);
  rec.ok(`as it ships: the page's own work a strip is at most ${top(nm)} ms (${MADE_MAX_MS} at most; ${top(ow)} all at once), ${sum(nm)} ms for the whole look (${MADE_SUM_MS} at most; ${sum(ow)} before)`,
    top(nm) <= MADE_MAX_MS && sum(nm) <= MADE_SUM_MS, { top: top(nm), sum: sum(nm) });
  const names = Object.keys(old.looks).sort();
  const diff = names.filter((k) => JSON.stringify(now.looks[k]) !== JSON.stringify(old.looks[k]) || JSON.stringify(mid.looks[k]) !== JSON.stringify(old.looks[k]));
  console.log(`    a strip (${names[0]}): ${JSON.stringify(old.looks[names[0]])}`);
  rec.ok(`all three end with the same look: ${names.length} strips held as colour numbers, each the same size, the same pixels see-through, the same colour wherever solid (${diff.length} differ)`,
    names.length >= WANT && diff.length === 0 && names.every((k) => old.looks[k].numbers && old.looks[k].solid > 0), diff.slice(0, 3).map((k) => ({ k, now: now.looks[k], mid: mid.looks[k], old: old.looks[k] })));
  const both = now.both || [];
  const bad = both.filter((r) => !r.ok || !r.sameSize || !r.sameCells || r.alphaDiffers || r.solidDiffers || r.partlyDrawnMax > PARTLY_MAX);
  const partly = both.reduce((t, r) => t + (r.partly || 0), 0), px = both.reduce((t, r) => t + (r.px || 0), 0), worst = Math.max(0, ...both.map((r) => r.partlyDrawnMax || 0));
  console.log(`    each strip both ways in one browser: ${both.length} strips, ${px} pixels; partly see-through pixels whose stored colour differs ${partly}, drawn at most ${worst} of 255 apart`);
  rec.ok(`each of the ${both.length} strips both ways in one browser: the same size and cells, no pixel's see-through or solid colour differing; ${partly} partly see-through pixels of ${px} keep the file's own colour, drawn at most ${worst} of 255 apart (${PARTLY_MAX} at most)`,
    both.length >= WANT && bad.length === 0, bad.slice(0, 3));
  const snow = now.snow || [];
  const sbad = snow.filter((r) => !r.ok || !r.sameSize || !r.sameCells || r.alphaDiffers || r.solidDiffers || r.partlyDrawnMax > PARTLY_MAX);
  rec.ok(`the snowman's ${snow.length} strips put on 256 colours in this version are read by the worker too, each the same size, cells and pixels as the page's packer makes of the same file (${snow.map((r) => (r.colours ? r.colours[1] : '?')).join(', ')} colours)`,
    snow.length === 8 && sbad.length === 0, sbad.slice(0, 2));
}
