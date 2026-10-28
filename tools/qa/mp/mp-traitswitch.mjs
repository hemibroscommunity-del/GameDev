/* ═══ YOUR HEAD PIECES, THE MOMENT YOU SWITCH TO ANOTHER CHARACTER (v2.3.3689) ═══
 *
 * The owner, 2026-10-28, on a computer: "I logged in as another character and
 * traits were missing when jogging in certain directions", then "Nevermind
 * there's still issues with the disappearing traits I still see it."
 *
 * The loading screen (and, on the picker's road, the veil that stands in for
 * it: avatarHold.js) waits for every picture of YOUR bro -- each head piece's
 * eight facings, its colour, a hat's hair-clip shape (preloadTraits) -- made
 * from the look in this device's stores at the moment it runs.  On a switch
 * from the picker those stores still hold the character being LEFT: the new
 * character's look arrives with the worker's state_sync, after the preload
 * has run, and what it wears is made the first time each facing is drawn.
 *
 * On a computer playing wide (the owner's), as players switch:
 *   1. (guard) character B is made with a coloured clipping hat, coloured
 *      hair, a coloured beard, goggles and an eye style; character A plain;
 *   2. A plays; B is picked from A's list (the logout chip's road: the door,
 *      the picker, B's row) and the world comes up as B;
 *   3. from the first frame the world shows, jogging all eight facings, every
 *      piece B wears is drawn in every facing its picture ships, IN ITS
 *      COLOUR, on every sample (each facing sampled through its jog);
 *   4. the same for B entered straight (its own look in the stores): the
 *      control;
 *   5. no page errors;
 *   6. a STALLED picture (TRAPS §257): C wears B's look, and every first ask
 *      for the hat's north picture is left hanging -- no answer, no error.
 *      The game gives up on it after ?traittimeoutms (3 s) and asks again
 *      past the cache, and the hat is drawn, red, facing north from the first
 *      frame.  On the build before nothing ever asked again: off facing
 *      north for the session (the loading screen waiting out its 20 s first).
 *   QA_TS_LOOKROW=1 gives B's row its look first, as a device that has asked
 *   the door about it has (the picker shows its portrait from it).
 *
 *   node tools/qa/mp/run.mjs traitswitch
 */
import { readFileSync, existsSync } from 'node:fs';
import * as H from './harness.mjs';

const DESK = { width: 1440, height: 900 };
const FACINGS = {
  east: ['d'], northeast: ['w', 'd'], north: ['w'], northwest: ['w', 'a'],
  west: ['a'], southwest: ['s', 'a'], south: ['s'], southeast: ['s', 'd'],
};
const LOOK_B = { 'bt-headwear': 'cowboy-hat', 'bt-hatcolor': 'red', 'bt-hair': 'wavy', 'bt-haircolor': 'blue',
  'bt-facialhair': 'beard', 'bt-beardcolor': 'blonde', 'bt-eyewear': 'goggles', 'bt-eyestyle': 'sleepy' };
const LOOK_A = { 'bt-headwear': 'none', 'bt-hatcolor': 'default', 'bt-hair': 'afro', 'bt-haircolor': 'default',
  'bt-facialhair': 'none', 'bt-beardcolor': 'default', 'bt-eyewear': 'none', 'bt-eyestyle': 'none' };
/* the display's sprite for each piece, its catalog folder and its look key */
const PIECES = {
  hat: { sprite: '_headwearSprite', dir: 'headwear', id: LOOK_B['bt-headwear'], colour: 'red' },
  hair: { sprite: '_hairSprite', dir: 'hair', id: LOOK_B['bt-hair'], colour: 'blue' },
  beard: { sprite: '_facialHairSprite', dir: 'facialhair', id: LOOK_B['bt-facialhair'], colour: 'blonde' },
  eyewear: { sprite: '_eyewearSprite', dir: 'eyewear', id: LOOK_B['bt-eyewear'], colour: null },
  eyes: { sprite: '_eyeStyleSprite', dir: 'eyestyle', id: LOOK_B['bt-eyestyle'], colour: null },
};
/* which facings each piece's picture ships (its meta.json `anchors`): hidden
   elsewhere by design (a beard from behind, eyes from behind) */
const ROOT = new URL('../../../', import.meta.url);
function shipped(dir, id) {
  const p = new URL(`public/sprites/traits/${dir}/${id}/meta.json`, ROOT);
  if (!existsSync(p)) return null;
  try { const m = JSON.parse(readFileSync(p, 'utf8')); return m && m.anchors ? Object.keys(m.anchors) : null; } catch (e) { return null; }
}
/* a colour's own test, on a piece's mean opaque colour */
const COLOUR_OK = {
  red: (c) => c.r > c.g + 35 && c.r > c.b + 35,
  blue: (c) => c.b > c.r + 30 && c.b > c.g + 10,
  blonde: (c) => c.r > c.b + 45 && c.g > c.b + 25,
};

/* a look into the creator's stores before the page's first load, once a tab
   (sessionStorage: the reloads the game makes itself keep what the game wrote
   since) -- an init script's text, for newPlayer's `init` */
const seedLook = (look) => `(function(){try{if(sessionStorage.getItem('qa_ts_seeded'))return;sessionStorage.setItem('qa_ts_seeded','1');`
  + `var L=${JSON.stringify(look)};for(var k in L)localStorage.setItem(k,L[k]);}catch(e){}})();`;

/* the pieces now, each: shown, its picture read back off the graphics chip,
   and that picture's mean opaque colour */
const sample = (P, names) => P.page.evaluate((spec) => {
  const R = window._pixiRenderer;
  const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
  if (!d) return null;
  const r = R.app.renderer;
  const out = { dir: d._animDir, pose: d._animPose };
  for (const [k, prop] of spec) {
    const s = d[prop];
    if (!s) { out[k] = null; continue; }
    const t = s.texture, src = t && t.source;
    const o = { vis: !!s.visible && s.worldVisible !== false, alpha: s.worldAlpha, dead: !!(t && t.destroyed) || !!(src && src.destroyed) };
    if (o.vis && t && src && !o.dead && t !== t.constructor.EMPTY) {
      try {
        const probe = new s.constructor(t);
        const px = r.extract.pixels({ target: probe, clearColor: [0, 0, 0, 0] });
        probe.destroy();
        const a = px.pixels || px;
        let n = 0, sr = 0, sg = 0, sb = 0;
        for (let i = 0; i < a.length; i += 4) if (a[i + 3] > 160) { n++; sr += a[i]; sg += a[i + 1]; sb += a[i + 2]; }
        o.px = n;
        if (n) o.c = { r: Math.round(sr / n), g: Math.round(sg / n), b: Math.round(sb / n) };
      } catch (e) { o.err = String(e && e.message || e).slice(0, 80); }
    }
    out[k] = o;
  }
  return out;
}, names.map((k) => [k, PIECES[k].sprite]));

/* every facing, jogged 900 ms and sampled every ~120 ms; a sample is wrong
   when a piece that ships this facing is not drawn, or not in its colour */
async function sweep(P, label, expect) {
  const names = Object.keys(PIECES);
  const bad = [];
  let samples = 0;
  for (const [face, keys] of Object.entries(FACINGS)) {
    for (const k of keys) await P.page.keyboard.down(k);
    const t0 = Date.now();
    while (Date.now() - t0 < 900) {
      const s = await sample(P, names).catch(() => null);
      samples++;
      if (s && s.dir === face) {
        for (const n of names) {
          if (!expect[n] || !expect[n].includes(face)) continue;
          const o = s[n];
          const colourOk = !PIECES[n].colour || (o && o.c && COLOUR_OK[PIECES[n].colour](o.c));
          if (!o || !o.vis || o.dead || !(o.px > 0) || !colourOk) bad.push({ face, piece: n, at: Date.now() - t0, o });
        }
      }
      await P.page.waitForTimeout(100);
    }
    for (const k of keys) await P.page.keyboard.up(k);
    await P.page.waitForTimeout(150);
  }
  const byFace = {}, how = {};
  for (const b of bad) {
    const key = `${b.face} ${b.piece}`;
    byFace[key] = (byFace[key] || 0) + 1;
    /* what the first wrong sample of each was: not drawn, or drawn in the wrong colour */
    if (!how[key]) how[key] = !b.o || !b.o.vis || !(b.o.px > 0) ? 'not drawn' : b.o.dead ? 'dead texture' : `drawn rgb(${b.o.c ? [b.o.c.r, b.o.c.g, b.o.c.b].join(',') : '?'})`;
  }
  console.log(`    [${label}] ${samples} samples; ${bad.length ? bad.length + ' wrong: ' + JSON.stringify(byFace) + '\n      how: ' + JSON.stringify(how) : 'every piece drawn, in its colour, in every facing it ships'}`);
  return { bad, byFace, samples };
}

async function waitWorld(P, label) {
  await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, hold: S._avatarArtHold ? (S._avatarArtHold.liftedAt || 0) : -1 }),
    (v) => v.zone === 'wheel' && !v.loading && v.hold !== 0, { timeout: 150000, label }).catch(() => null);
  /* the veils are gone: nothing dark over the world */
  await P.page.waitForFunction(() => !document.querySelector('.bt-avatar-hold') && !document.querySelector('.bt-intro-overlay, [data-intro]'),
    null, { timeout: 60000, polling: 100 }).catch(() => {});
}

export async function run({ browser, wsPort, webPort, rec }) {
  const expect = {};
  for (const [n, p] of Object.entries(PIECES)) expect[n] = shipped(p.dir, p.id) || [];
  console.log('    shipped facings: ' + JSON.stringify(expect));

  /* ── 1. B, made with its look, then put away ── */
  const B = await H.newPlayer(browser, { name: 'Bravo', wsPort, webPort, viewport: DESK, world: 'wheel', wide: true, init: seedLook(LOOK_B) });
  let keyB = null, idB = null;
  try {
    await H.enterWorld(B);
    await waitWorld(B, 'B into the world');
    idB = await H.readState(B, (S) => S.myId);
    await B.page.waitForTimeout(2500);   /* the handed new key (key_new) lands */
    keyB = (await H.keyAndDevice(B)).phrase;
    const look = await B.page.evaluate(() => (window.__btCharRecord ? window.__btCharRecord() : null));
    console.log('    B\'s record: ' + JSON.stringify(look && look.look));
    console.log('    B\'s stores: ' + JSON.stringify(await B.page.evaluate((ks) => { const o = {}; for (const k of ks) o[k] = localStorage.getItem(k); return o; }, Object.keys(LOOK_B))));
    rec.ok('character B made: a red cowboy hat, blue wavy hair, a blonde beard, goggles and sleepy eyes (guard)',
      !!idB && !!keyB && !!look && !!look.look && look.look.hw === LOOK_B['bt-headwear'] && look.look.hr === LOOK_B['bt-hair'],
      { idB, keyB: !!keyB, look: look && look.look });
    /* the control: B straight in, its own look in the stores */
    const ctl = await sweep(B, 'B entered straight', expect);
    rec.ok('B entered straight: every piece drawn in its colour in every facing it ships (control)', ctl.bad.length === 0, ctl.byFace);
  } finally {
    await B.ctx.close().catch(() => {});
  }

  /* ── 2. A plays, then picks B ── */
  const A = await H.newPlayer(browser, { name: 'Alpha', wsPort, webPort, viewport: DESK, world: 'wheel', wide: true, init: seedLook(LOOK_A) });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(A);
    await waitWorld(A, 'A into the world');
    const hwA = await A.page.evaluate(() => localStorage.getItem('bt-headwear'));
    rec.ok('character A plays, with no hat (guard)', hwA === 'none' || hwA === null, { hwA });
    /* B on this device's list, and this device let in for B's key */
    const withLook = process.env.QA_TS_LOOKROW === '1';
    await A.page.evaluate(({ k, id, look }) => {
      window.__btRoster.remember(k, { id, name: 'Bravo', level: 1, look: look || undefined });
    }, { k: keyB, id: idB, look: withLook ? { hw: LOOK_B['bt-headwear'], htc: 'red', hr: LOOK_B['bt-hair'], hc: 'blue', fh: 'beard', fhc: 'blonde', ew: 'goggles', es: 'sleepy' } : null });
    await H.letDeviceIn(wsPort, idB).catch(() => null);
    /* the logout chip's road: the door, with the list up */
    await A.page.goto(`http://localhost:${webPort}/?noresume=1&login=1`, { waitUntil: 'domcontentloaded' });
    await A.page.waitForSelector('[data-tut="char-row"]', { timeout: 30000 }).catch(() => null);
    if (!(await A.page.$('[data-tut="char-row"][data-char-name="Bravo"]'))) await H.openPicker(A.page).catch(() => false);
    const row = await A.page.$('[data-tut="char-row"][data-char-name="Bravo"]');
    rec.ok('B is on A\'s list, and its row is there to pick (guard)', !!row);
    if (row) await row.click();
    await A.page.waitForLoadState('domcontentloaded').catch(() => {});
    await waitWorld(A, 'B, picked, into the world');
    const who = await H.readState(A, (S) => S.myId);
    rec.ok('the world comes up as B (guard)', who === idB, { who, idB });
    /* ── 3. the sweep, from the first frame ── */
    const sw = await sweep(A, 'B picked from A\'s list', expect);
    rec.ok('B picked from the list: every piece drawn in its colour in every facing it ships, from the first frame',
      sw.bad.length === 0, { byFace: sw.byFace, first: sw.bad.slice(0, 3) });
    /* and once it has all settled (a minute's play), still */
    const sw2 = await sweep(A, 'B picked, a second round', expect);
    rec.ok('...and still on a second round', sw2.bad.length === 0, sw2.byFace);
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await A.ctx.close().catch(() => {});
  }

  /* ── 4. a stalled picture: the hat's north facing never answers ── */
  /* Every request for the cowboy hat's north picture that is not a retry
     (no `r=`) is left hanging -- no answer, no error, as a flaky Wi-Fi can
     leave one.  The game gives up on it after ?traittimeoutms (3 s here) and
     asks again past the cache; on the build before, nothing ever asked again
     and the hat was off facing north for the session. */
  const C = await H.newPlayer(browser, { name: 'Charlie', wsPort, webPort, viewport: DESK, world: 'wheel', wide: true, query: 'traittimeoutms=3000', init: seedLook(LOOK_B) });
  const errorsC = [];
  C.page.on('pageerror', (e) => errorsC.push(String((e && e.message) || e).slice(0, 200)));
  let hung = 0, retried = 0;
  await C.ctx.route(/\/sprites\/traits\/headwear\/cowboy-hat\/north\.png/, (route) => {
    if (/[?&]r=\d/.test(route.request().url())) { retried++; return route.continue(); }
    hung++;   /* never answered */
  });
  try {
    await H.enterWorld(C);
    await waitWorld(C, 'C into the world');
    const stall = await sweep(C, 'the hat\'s north picture stalled', { hat: expect.hat });
    rec.ok('a stalled picture: the first ask for the hat\'s north facing hung, and the game asked again (guard)', hung > 0 && retried > 0, { hung, retried });
    rec.ok('...and the hat is drawn in its colour in every facing, north too, from the first frame', stall.bad.length === 0,
      { byFace: stall.byFace, first: stall.bad.slice(0, 3), cache: await C.page.evaluate(() => (window.__btTraitCache ? window.__btTraitCache().worn.headwear : null)).catch(() => null) });
    rec.ok('...no page errors', errorsC.length === 0, errorsC.slice(0, 5));
  } finally {
    await C.ctx.close().catch(() => {});
  }
}
