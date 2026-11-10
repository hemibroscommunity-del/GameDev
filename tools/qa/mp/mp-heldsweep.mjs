/* ═══ THE WHOLE-GAME SWEEP: EVERYTHING THAT HOLDS THE PAGE, BY NAME (v2.3.4460) ═══
 *
 * The owner, 2026-11-10, after a week of catching them one at a time on his
 * iPhone (the townsfolk's bakes, the Blacksmith's fire goblin, the uneven
 * rate): "You do a sweep of everything because I keep catching performance
 * issues piecemeal and I want to make sure the optimizations are everywhere
 * in the game."
 *
 * A hitch is the page's one thread held by a job: a picture prepared the
 * first time it is seen, a window laid out, a message worked through.  Each
 * was found by riding into it.  This rides into ALL of them on purpose, with
 * Chrome's profiler on the phone, and names what it finds:
 *
 *   a phone plays a tour of the game, a station at a time -- standing in the
 *   town, the ride through it, the edge of every land (its monsters' looks
 *   load there), a fight with its hits, kills and loot, each of the band's
 *   windows, a townsperson's dialogue, a dressed and armoured player riding
 *   up, circling, swinging and shooting, and the phone's own armour put on
 *   and taken off.
 *
 * For every station the profile says how long the page was held OUTSIDE the
 * game's frame (a promise, a timer, a message, a window's redraw) and which
 * frames ran long INSIDE it, and the stack of each says whose work it was.
 * The jobs are grouped into families (FAMILIES below) and ranked: how often,
 * how long in all, the longest single hold.
 *
 * It is a MEASURING tool and a budget in one:
 *   - the report: tools/qa/mp/out/heldsweep.json and the table it prints
 *     (docs/specs/held-sweep.md keeps the last full run's);
 *   - the budget: no hold in play longer than HOLD_MAX_MS except the
 *     families listed in tools/qa/mp/held-budget.mjs, each with its own line
 *     -- a line may be lowered to lock a fix in, and a NEW family past the
 *     line fails the run (the memory budget's way).
 *
 * The functions must read by name, so it wants an unminified build:
 *
 *   NODE_OPTIONS=--max-old-space-size=8192 npx vite build --minify false --outDir dist-prof && mv src/dist-prof dist-prof
 *   QA_DIST=dist-prof node tools/qa/mp/run.mjs heldsweep
 *   BT_HS_STATIONS=town,lands   only these (see STATION_NAMES)
 *
 * This box draws in software a few frames a second, so the FRAME's own
 * length here says nothing about a phone's; the page's own JavaScript does
 * (a bake measured 91 ms here was 101 on the owner's iPhone), and that is
 * what is counted: time in the browser's own drawing calls is left out.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOLD_MAX_MS, FRAME_JS_MAX_MS, WINDOW_MAX_MS, KNOWN, judgeHeld } from './held-budget.mjs';

const PHONE = { width: 430, height: 932 };
const STATION_NAMES = ['stand', 'town', 'lands', 'fight', 'windows', 'folk', 'peer', 'armour'];
const WANT = (process.env.BT_HS_STATIONS || STATION_NAMES.join(',')).split(',').map((s) => s.trim()).filter(Boolean);

/* ── the families: whose work a stack is.  First match wins; `key` is what the budget lists. ── */
const FAMILIES = [
  ['body-bake', "a body or head sheet recoloured on the page for one look (another player's, a townsperson's)", /\bbuildBodySheet\b|\brecolorBodyToCanvas\b/],
  ['standin-bake', 'a swing, bow or tool stand-in recoloured on the page', /\brecolorStandInSkin\b|\bbuildStandIn\w*|\b_bakeStandIn\w*/],
  ['gear-sheet', 'a gear or shirt sheet built on the page', /\bbuildSheet\b|\bcomposeShirt\b|\b_gearStripFrame\b|\bloadCroppedStrip\b/],
  ['head-piece', 'a head piece (hair, hat, beard, eyes) coloured or cut', /\b_buildPickupHeadSheet\b|\brecolorTrait\w*|\bbuildHead\w*|\b_bakeHair\w*/],
  ['masked-bake', 'armour cut to the body on the page', /\b_runLookBakeInline\b|\bbakeMaskedCanvas\b|\b_maskedBodyFrameInner\b|\b_runBake\b/],
  ['strip-page', "a monster's strip unpacked on the page", /\b_stripGently\b|\b_stripByImage\b|\b_stripFrames\b/],
  ['pack-page', 'a sheet cropped and packed on the page (a gear sheet, a stand-in strip)', /\bpackTrimmed\w*\b|\btrimScanCell\b|\bnumbersOf\w*\b|\bsliceCropped\b/],
  ['strip-made', "a monster strip's texture made (read off the page)", /\b_stripOfNumbers\b/],
  ['monster-recolour', 'a monster recoloured on the page', /\bloadMonsterRecolor\b|\bretintToCanvas\b|\b_recolou?r\w*Monster\w*|\brecolorFamily\w*/],
  ['object-bases', "an object page's ground lines read", /\breadPageBottoms\b/],
  ['object-page', 'an object page loaded or placed', /\bwheelObjects\b|\b_placePage\b|\bloadPage\b/],
  ['screen-check', 'the black-screen check reading the canvas', /\b_wdThumbCollect\b|\b_sampleLit\b|\b_wdThumbAsk\b|\b_wdThumbImage\b/],
  ['portrait', 'a portrait drawn', /\bcharacterPortrait\b|\brenderPortrait\w*|\bportrait\w*\b/i],
  ['map', 'the World map redrawn', /\bpaletteThumb\b|\bMapPanel\b|\bWorldMapOverlay\b|\bdrawWorldMap\w*/],
  ['codex', "the Codex's stage", /\bCodexStage\b|\bcodexStage\w*/],
  ['ground', 'the ground laid or uploaded', /\bwheelGround\b|\bcomposeGround\b|\b_onChunk\b|\bwheelChunk\b/],
  ['sound', 'a sound decoded or started', /\bdecodeAudioData\b|\bcopyFromChannel\b|\bcreateBufferSource\b/],
  ['text', 'words drawn on a canvas (a name plate, a number)', /\bCanvasTextSystem\b|\bCanvasTextMetrics\b|\b_attachNamePill\b/],
  ['server-message', 'a message from the server worked through', /\bws\.onmessage\b|\bonmessage\b|\b_handleMsg\w*|\bbundleOn\b/],
  ['gc', 'garbage collection', /\(garbage collector\)/],
];
/* a window or the band redrawn by React: the outermost of the game's own components on the stack */
/* (the World map's own redraw loop has no family name on its stack: `loop` > `draw` in WorldMapOverlay.jsx) */
const COMPONENT = /^[A-Z][A-Za-z0-9]+(Panel|Tab|View|Page|Dashboard|Window|Card|Sheet|Stage|Band|Row|List|Bar|Hud|Modal|Dialog|Overlay|Menu)$/;

function familyOf(names) {
  const joined = names.join(' ');
  for (const [key, label, re] of FAMILIES) if (re.test(joined)) return { key, label };
  for (let i = names.length - 1; i >= 0; i--) if (COMPONENT.test(names[i])) return { key: 'ui:' + names[i], label: `the ${names[i]} redrawn (a window or the band)` };
  return null;
}

/* ── the profile ── */
function analyse(profile) {
  const byId = new Map();
  for (const n of profile.nodes) byId.set(n.id, n);
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const info = new Map();
  const infoOf = (id) => {
    let v = info.get(id);
    if (v) return v;
    const stack = [];
    for (let i = id; i != null; i = parent.get(i)) stack.push(byId.get(i));
    const names = stack.map((n) => n.callFrame.functionName || '');
    const leaf = byId.get(id).callFrame;
    const top = leaf.functionName || '';
    const fam = familyOf(names);
    /* what started it, when no family claims it: the two outermost named frames of the game's own */
    /* (the game's own chunk, not the libraries': React's scheduler is `R > J > Gk` on every redraw, and names nothing) */
    const mine = (n) => n.callFrame.functionName && /assets\/index-/.test(n.callFrame.url || '');
    const lib = (n) => n.callFrame.functionName && /assets\//.test(n.callFrame.url || '');
    let own = stack.slice(0, -1).reverse().filter(mine).map((n) => n.callFrame.functionName);
    if (!own.length) own = stack.slice(0, -1).reverse().filter(lib).map((n) => n.callFrame.functionName);
    /* the path to it, for whoever fixes it: outside the frame the three outermost of the game's own; inside it, the
       three under the loop */
    /* BT_HS_STACKS=1: the whole path, every named function (for whoever is hunting one hold) */
    const full = process.env.BT_HS_STACKS ? stack.slice(0, -1).reverse().map((n) => n.callFrame.functionName || '?').filter((x) => !/^\(/.test(x)).slice(-14).join(' > ') : '';
    const li = own.indexOf('gameLoop');
    const chain = (li >= 0 ? own.slice(li + 1, li + 4) : own.slice(0, 3)).join(' > ') || top || '(anonymous)';
    /* (a line written to the console costs this page what the harness makes of it -- Playwright reads every one --
       not what it costs a phone: counted as the browser's own) */
    /* a call that WAITS for the graphics chip (it returns when the chip has worked through all it was sent) holds
       the page as surely as script does, wherever it runs: counted, though it is the browser's own function.  The
       first tours missed it inside the frame -- the screen check's collect, moved to the top of the frame, read as
       gone when it had only moved. */
    const chipWait = /^(getBufferSubData|readPixels|finish|clientWaitSync|getError)$/.test(top);
    v = { idle: top === '(idle)', program: top === '(program)' || /^console\./.test(top), chipWait, gc: top === '(garbage collector)', inLoop: names.includes('gameLoop'),
      js: !!leaf.url, fam, from: own.slice(0, 2).join(' > ') || top || '(anonymous)', chain: full || chain, leaf: top || '(anonymous)' };
    info.set(id, v);
    return v;
  };
  const dt = profile.timeDeltas || [];
  const stretches = [], frames = [];
  let cur = null, fr = null, total = 0, sawLoop = false;
  const add = (m, k, ms) => m.set(k, (m.get(k) || 0) + ms);
  for (let i = 0; i < profile.samples.length; i++) {
    const ms = (dt[i] || 0) / 1000;
    const v = infoOf(profile.samples[i]);
    total += ms;
    if (v.inLoop) sawLoop = true;
    if (v.idle) { cur = null; fr = null; continue; }
    if (v.program) continue;                       /* the browser's own: ends nothing, counts for nothing */
    if (v.inLoop) {
      cur = null;
      if (!fr) { fr = { js: 0, by: new Map(), leaf: new Map(), chain: new Map() }; frames.push(fr); }
      if (v.js || v.gc || v.chipWait) { fr.js += ms; add(fr.by, v.fam ? v.fam.key : 'the frame itself', ms); add(fr.leaf, v.leaf, ms); add(fr.chain, v.chain, ms); }
    } else {
      fr = null;
      if (!cur) { cur = { ms: 0, by: new Map(), from: new Map(), leaf: new Map(), chain: new Map() }; stretches.push(cur); }
      cur.ms += ms;
      add(cur.chain, v.chain, ms);
      add(cur.by, v.fam ? v.fam.key : 'other', ms);
      add(cur.from, v.fam ? v.fam.label : v.from, ms);
      add(cur.leaf, v.leaf, ms);
    }
  }
  const topOf = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0] || ['?', 0];
  const top3 = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, ms]) => `${k} ${ms.toFixed(0)}`).join(', ');
  const js = frames.map((f) => f.js).sort((a, b) => a - b);
  const med = js.length ? js[js.length >> 1] : 0;
  return { total: Math.round(total), sawLoop,
    /* a hold is the family's whose work is the most of it; when no one family's is, but the biggest single piece
       IS a family's (a garbage collection among several small jobs), it is that family's, not "other" under its name */
    held: stretches.map((s) => {
      const what = topOf(s.from)[0];
      const byLabel = FAMILIES.find((f) => f[1] === what);
      return { ms: +s.ms.toFixed(1), key: byLabel ? byLabel[0] : topOf(s.by)[0], what, in: top3(s.leaf), via: topOf(s.chain)[0] };
    }),
    frames: { n: frames.length, medJs: +med.toFixed(1),
      /* a long frame is a family's when that family is a third or more of the frame's own code; else the frame's own */
      long: frames.filter((f) => f.js >= Math.max(FRAME_JS_MAX_MS, med * 3)).map((f) => {
        const fam = topOf(new Map([...f.by].filter(([k]) => k !== 'the frame itself')));
        return { ms: +f.js.toFixed(1), key: fam[1] >= f.js * 0.33 ? fam[0] : 'the frame itself', in: top3(f.leaf), via: top3(f.chain) };
      }) } };
}

/* ── small helpers of the tour ── */
const tapSel = (P, sel, id, fx = 0.5, fy = 0.5) => P.page.evaluate(({ sel, id, fx, fy }) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const b = el.getBoundingClientRect(), x = b.left + b.width * fx, y = b.top + b.height * fy;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart'));
  el.dispatchEvent(mk('touchend'));
  return true;
}, { sel, id, fx, fy });
const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S || !S.player) return null;
  let m = null, d = Infinity;
  for (const x of S.monsters || []) {
    if (!x || x.alive === false || x.dead) continue;
    const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y);
    if (dd < d) { d = dd; m = { x: x.x, y: x.y, d: dd, arch: x.arch || x.type || '' }; }
  }
  return { px: S.player.x, py: S.player.y, m, n: (S.monsters || []).length };
});
async function stepToward(P, dx, dy, ms) {
  const keys = [];
  if (dy < -12) keys.push('w'); else if (dy > 12) keys.push('s');
  if (dx < -12) keys.push('a'); else if (dx > 12) keys.push('d');
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  for (const k of keys) await P.page.keyboard.up(k);
}
/* a window shut the way a player shuts it: its own X (the World map is a window of its own, over the band: the first
   tour left it open and every later station was measured with a map redrawing behind it), then the band folded back */
async function shut(P) {
  for (let i = 0; i < 3; i++) {
    const had = await P.page.evaluate(() => { const x = document.querySelector('[data-esc]'); if (!x) return false; x.click(); return true; }).catch(() => false);
    if (!had) break;
    await P.page.waitForTimeout(350);
  }
  await H.closeDest(P, { timeout: 3000 }).catch(() => {});
  await P.page.waitForTimeout(500);
}
async function circle(P, ms) {
  for (const keys of [['w'], ['w', 'd'], ['d'], ['s', 'd'], ['s'], ['s', 'a'], ['a'], ['w', 'a']]) {
    for (const k of keys) await P.page.keyboard.down(k);
    await P.page.waitForTimeout(ms);
    for (const k of keys) await P.page.keyboard.up(k);
  }
}
const dress = (who) => `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  for (const [k, v] of ${JSON.stringify(Object.entries(who))}) localStorage.setItem('bt-' + k, v);
} catch (e) {}`;

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  /* the old tap to swing for this page (`?manual=0`): the tour's fight is scripted with it */
  const A = await H.newPlayer(browser, { name: 'Sweeper', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', query: 'manual=0' + (process.env.BT_HS_QUERY ? '&' + process.env.BT_HS_QUERY : '') });
  let B = null;
  const stopA = H.keepAlive(A, 15000);
  let stopB = null;
  const report = { stations: [] };
  try {
    await H.enterWorld(A);
    const ok = await H.waitFor(A, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the world' }).then(() => true).catch(() => false);
    rec.ok('the phone is in BroTown (guard)', ok);
    if (!ok) return;
    const me = await H.readState(A, (S) => S.myId);
    await A.page.evaluate(() => { const S = window._gameState.current; const R = S.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; }).catch(() => {});
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 40 }).catch(() => null);
    await A.page.waitForTimeout(6000);
    const G = await H.wheelGeom();
    const home = { x: G.arrival.x, y: G.arrival.y };
    const cdp = await A.page.context().newCDPSession(A.page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 400 });

    const station = async (name, label, drive) => {
      if (!WANT.includes(name)) return;
      await A.page.evaluate(() => { window.__btMade = []; });
      await cdp.send('Profiler.start');
      const t0 = Date.now();
      let note = null;
      try { note = await drive(); } catch (e) { note = { error: String((e && e.message) || e).slice(0, 200) }; }
      const prof = (await cdp.send('Profiler.stop')).profile;
      const an = analyse(prof);
      const made = await A.page.evaluate(() => (window.__btMade || []).slice()).catch(() => []);
      const named = [];
      for (let i = 0; i < made.length; i += 2) named.push([String(made[i]).replace(/^(\w+ ?\w*) .*\/sprites\//, '$1 ').slice(0, 60), Math.round(made[i + 1])]);
      const held = an.held.filter((s) => s.ms >= 4).sort((a, b) => b.ms - a.ms);
      const row = { name, label, secs: Math.round((Date.now() - t0) / 1000), note, readable: an.sawLoop, held, frames: an.frames,
        heldSum: Math.round(an.held.reduce((t, s) => t + s.ms, 0)), named: named.sort((a, b) => b[1] - a[1]).slice(0, 12) };
      report.stations.push(row);
      console.log(`\n  ── ${label} (${row.secs} s)${note ? ' ' + JSON.stringify(note).slice(0, 160) : ''}`);
      console.log(`     outside the frame: ${row.heldSum} ms in all; holds of 4 ms or more: ${held.length}, the longest ${held[0] ? held[0].ms : 0} ms`);
      for (const s of held.slice(0, 8)) console.log(`       ${String(s.ms).padStart(6)} ms  [${s.key}] ${s.what}   (${s.in})  via ${s.via}`);
      console.log(`     in the frame: ${an.frames.n} frames, the middle one ${an.frames.medJs} ms of the game's own code; long ones: ${an.frames.long.length}`);
      for (const f of an.frames.long.sort((a, b) => b.ms - a.ms).slice(0, 6)) console.log(`       ${String(f.ms).padStart(6)} ms  [${f.key}]   (${f.in})  via ${f.via}`);
      return row;
    };

    await station('stand', 'standing in the town', async () => { await A.page.waitForTimeout(10000); });

    await station('town', 'the ride through the town', async () => {
      await A.page.keyboard.press('z');
      await H.waitFor(A, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === true, { timeout: 8000, label: 'on the board' }).catch(() => null);
      for (const [x, y] of [[G.cx - 1500, G.arrival.y], [G.cx + 1500, G.arrival.y], [G.cx + 1500, G.arrival.y - 1200], [G.cx - 1500, G.arrival.y - 1200], [G.cx, G.arrival.y]]) {
        await H.glideTo(A, x, y, { speed: 300, timeoutMs: 60000 });
      }
      await A.page.keyboard.press('z');
    });

    /* the edge of every land: its monsters' looks load as you come (wheelMonsterArt.js) */
    const lands = Object.keys(G.W.byId || {});
    for (const id of lands) {
      await station('lands', `to the edge of a land: ${id}`, async () => {
        const to = G.along(id, 1);
        await H.glideTo(A, to.x, to.y, { speed: 700, timeoutMs: 90000 });
        /* its looks, ready (or 20 s) */
        const ready = await H.waitFor(A, () => { const S = window._gameState.current; return { n: (S.monsters || []).length, strips: window.__btStripTrim ? window.__btStripTrim().length : 0 }; },
          (v) => v.n > 0, { timeout: 20000, label: 'monsters told of' }).catch(() => null);
        await A.page.waitForTimeout(6000);
        const s = await near(A).catch(() => null);
        return { monsters: s ? s.n : 0, nearest: s && s.m ? Math.round(s.m.d) : null, kind: s && s.m ? s.m.arch : null, strips: ready ? ready.strips : null };
      });
    }

    await station('fight', 'a fight: swings, hits taken, kills, loot', async () => {
      let swings = 0;
      const t0 = Date.now();
      while (Date.now() - t0 < 25000) {
        const s = await near(A).catch(() => null);
        if (!s || !s.m || s.m.d > 1200) { await A.page.waitForTimeout(300); continue; }
        if (s.m.d > 70) await stepToward(A, s.m.x - s.px, s.m.y - s.py, Math.min(450, 60 + s.m.d * 1.2)).catch(() => {});
        else { await tapSel(A, '[data-joyzone="R"]', 52, 0.5, 0.4).catch(() => {}); swings++; await A.page.waitForTimeout(220); }
      }
      return { swings };
    });

    /* back to the town for the rest (a glide: no walls) */
    if (WANT.some((w) => ['windows', 'folk', 'peer', 'armour'].includes(w))) {
      await H.glideTo(A, home.x, home.y, { speed: 2500, timeoutMs: 120000 }).catch(() => {});
      await A.page.waitForTimeout(5000);
    }

    await station('windows', "the band's windows, each opened and closed", async () => {
      await H.unfoldBand(A).catch(() => null);
      const opened = [];
      for (const t of ['Gear', 'Character', 'Quests', 'Codex', 'Map', 'Bag', 'Skills', 'Friends']) {
        const okW = await H.openDest(A, t, { timeout: 4000 }).then(() => true).catch(() => false);
        if (okW) opened.push(t);
        await A.page.waitForTimeout(2500);
        await shut(A);
      }
      return { opened, left: await A.page.evaluate(() => document.querySelectorAll('[data-esc]').length).catch(() => -1) };
    });

    await station('folk', "a townsperson's dialogue", async () => {
      await shut(A);
      const open = await H.approachNpc(A, 'mayor_bro').catch(() => false);
      await A.page.waitForTimeout(2500);
      await H.closeNpcDialogue(A).catch(() => {});
      await A.page.waitForTimeout(800);
      return { open: !!open };
    });

    if (WANT.includes('peer')) {
      const here = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
      B = await H.newPlayer(browser, { name: 'Rider', wsPort, webPort, viewport: { width: 390, height: 600 }, touch: false, world: 'wheel', query: 'manual=0',
        init: dress({ skin: 'ebony', pants: 'red', shoes: 'blue', hair: 'long', haircolor: 'red', headwear: 'red-cap' }) });
      stopB = H.keepAlive(B, 15000);
      await H.enterWorld(B);
      await H.waitFor(B, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'peer into the world' }).catch(() => null);
      const bid = await H.readState(B, (S) => S.myId).catch(() => null);
      await H.devOp(wsPort, 'kit', bid, { what: 'weapons' }).catch(() => null);
      await B.page.evaluate(() => { try { window._gameFns.setEquip('chest', 'copperplate'); window._gameFns.setEquip('legs', 'coppergreaves'); } catch (e) { /* bare */ } }).catch(() => {});
      await H.glideTo(B, here.x + 1400, here.y, { speed: 800, timeoutMs: 30000 }).catch(() => {});
      await A.page.waitForTimeout(3000);
      await station('peer', 'a dressed and armoured player rides up, circles, swings', async () => {
        await B.page.mouse.click(195, 300).catch(() => {});
        await B.page.keyboard.press('Escape').catch(() => {});
        await B.page.keyboard.press('z');
        await H.glideTo(B, here.x + 70, here.y - 40, { speed: 300, timeoutMs: 30000 });
        await circle(B, 800);
        await B.page.keyboard.press('z');
        await circle(B, 600);
        for (let i = 0; i < 5; i++) { await B.page.mouse.click(120 + i * 40, 420).catch(() => {}); await B.page.waitForTimeout(650); }
        await A.page.waitForTimeout(2000);
        return { seen: await A.page.evaluate(() => Object.keys(window._gameState.current.others || {}).length).catch(() => 0) };
      });
    }

    await station('armour', "the phone's own armour on, a walk round, and off", async () => {
      const wear = (c, l) => A.page.evaluate(({ c, l }) => { try { window._gameFns.setEquip('chest', c); window._gameFns.setEquip('legs', l); return true; } catch (e) { return false; } }, { c, l });
      const on = await wear('copperplate', 'coppergreaves');
      await A.page.waitForTimeout(1500);
      await circle(A, 700);
      await wear('none', 'none');
      await A.page.waitForTimeout(1500);
      await circle(A, 500);
      return { on };
    });

    /* ── the ranking, and the budget (held-budget.mjs judgeHeld: the lines, the debt list, the noise rule) ── */
    const { ranked, over } = judgeHeld(report.stations);
    report.ranked = ranked;
    report.over = over;
    writeFileSync(join(OUT, 'heldsweep.json'), JSON.stringify(report, null, 1));
    console.log('\n  ══ EVERYTHING THAT HELD THE PAGE FOR 4 ms OR MORE, WORST FIRST ══');
    console.log('     longest   times   in all   where                          what');
    for (const f of ranked.slice(0, 40)) console.log(`     ${String(f.longest).padStart(6)} ms ${String(f.n).padStart(5)} ${String(f.sum).padStart(7)} ms  ${f.where.padEnd(30).slice(0, 30)} [${f.key}] ${f.what === f.key ? '' : f.what}${f.via ? '   via ' + f.via : ''}`);
    const readable = report.stations.every((s) => s.readable);
    rec.ok(`the profile reads by name (an unminified build: the game's loop found in ${report.stations.filter((s) => s.readable).length} of ${report.stations.length} stations)`, readable && report.stations.length >= 1,
      'build with: npx vite build --minify false --outDir dist-prof, and run with QA_DIST=dist-prof');
    const listed = over.filter((o) => o.listed), fresh = over.filter((o) => !o.listed);
    const say = (l) => l.slice(0, 6).map((o) => `${o.key} ${o.longest} ms > ${o.line} (${o.where}${o.times > 1 ? ', ' + o.times + ' times' : ''})`).join('; ');
    rec.ok(`the budget: nothing NEW holds the page past its line -- ${HOLD_MAX_MS} ms a job outside the frame, ${FRAME_JS_MAX_MS} ms of the game's own code inside one, ${WINDOW_MAX_MS} ms at a window (${fresh.length} over${fresh.length ? ': ' + say(fresh) : ''})`,
      fresh.length === 0, fresh);
    rec.ok(`...and nothing on the debt list has grown past its own line (${Object.keys(KNOWN).length} listed; ${listed.length} over${listed.length ? ': ' + say(listed) : ''})`,
      listed.length === 0, listed);
    rec.ok(`every station asked for was played (${report.stations.map((s) => s.name).filter((v, i, a) => a.indexOf(v) === i).join(', ')})`, WANT.every((w) => report.stations.some((s) => s.name === w)), WANT);
  } finally {
    stopA();
    if (stopB) stopB();
    await A.ctx.close().catch(() => {});
    if (B) await B.ctx.close().catch(() => {});
  }
}
