/* THE FACE TATTOO ON A BOW SHOT (v2.3.2472).
 *
 * Owner (backlog triage 2026-09-14, art item 4): on the jog SOUTH and EAST
 * bow-shot frames the face tattoo covers only the top half of the face.
 *
 * WHY THIS IS PHOTOGRAPHED AND MEASURED OFF THE PHOTOGRAPH, rather than off the
 * bake's own region probe.  `window.__btSkinRegions` reports the face region per
 * frame, and it is keyed by `_bakeTag` -- which only the WALKING bake sets
 * (playerSkins' buildBodySheet).  The attack stand-ins are baked by their own
 * loader in effectsRenderer, the second bake site TRAPS §73 is about, so their
 * regions file themselves under whatever sheet the walking path baked last.
 * Reading that would be measuring the wrong sheet, confidently.
 *
 * So the instrument is the screen: a face tattoo in a colour nothing else on the
 * character can produce, and a count of where its pixels land on the head.  The
 * owner's report is about what the composite LOOKS like, which is the same
 * argument mp-shirtarm's v2.3.2133 section makes after four versions of trusting
 * a number that could not see the defect.
 *
 * THE INK IS MAGENTA ON PURPOSE.  It is the one hue the figure cannot make:
 * skin and hair are warm browns, the tee is white, the trousers olive, and the
 * crimson cape is red-dominant with no blue in it.  "r and b both well above g"
 * therefore means ink and nothing else, which is what lets the count below be a
 * count rather than an estimate.
 *
 *   node tools/qa/mp/run.mjs facebow
 */
import * as H from './harness.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = H.REPO + '/tools/qa/mp/out';
const TAG = process.env.BT_SHOT_TAG || 'now';

/* EVERY cell inked, palette 'b' (#d76ba8).  A full grid is the right probe for
   "which part of the face does the region reach": a band would leave the answer
   dependent on where the band happened to fall. */
const FACE_ART = 'b'.repeat(256);

const uiAside = (P, hide) => P.page.evaluate((v) => {
  if (!v) {
    for (const el of document.querySelectorAll('[data-bt-shot-hidden]')) {
      el.style.visibility = el.dataset.btShotVis || '';
      delete el.dataset.btShotHidden; delete el.dataset.btShotVis;
    }
    return;
  }
  let el = document.querySelector('canvas');
  while (el && el.parentElement) {
    for (const sib of el.parentElement.children) {
      if (sib === el || sib.dataset.btShotHidden) continue;
      sib.dataset.btShotHidden = '1';
      sib.dataset.btShotVis = sib.style.visibility || '';
      sib.style.visibility = 'hidden';
    }
    el = el.parentElement;
  }
}, hide);

/* One crop, returned BOTH as a 20x picture and as the ink measurement, so the
   number and the render can never be of different frames. */
async function sample(P, tag, rec) {
  const box = await H.figureBox(P, { pad: 10 });
  if (!box) { rec.ok(`a crop of the figure for "${tag}" (guard)`, false, null); return null; }
  await uiAside(P, true);
  const png = await P.page.screenshot({ clip: box });
  await uiAside(P, false);
  const res = await P.page.evaluate(async (b64) => {
    const im = await new Promise((res2) => {
      const i = new Image(); i.onload = () => res2(i); i.onerror = () => res2(null);
      i.src = 'data:image/png;base64,' + b64;
    });
    if (!im) return null;
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const rows = new Array(c.height).fill(0);
    let ink = 0, top = -1, bot = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if (d[i + 3] < 40) continue;
        /* magenta: red AND blue both clear of green. */
        if (d[i] > d[i + 1] + 22 && d[i + 2] > d[i + 1] + 22) {
          rows[y]++; ink++;
          if (top < 0) top = y;
          bot = y;
        }
      }
    }
    const S = 20;
    const big = document.createElement('canvas');
    big.width = im.width * S; big.height = im.height * S;
    const bg = big.getContext('2d');
    bg.imageSmoothingEnabled = false;
    bg.fillStyle = '#14202a'; bg.fillRect(0, 0, big.width, big.height);
    bg.drawImage(im, 0, 0, big.width, big.height);
    return { ink, top, bot, h: c.height, w: c.width, rows, url: big.toDataURL('image/png') };
  }, png.toString('base64'));
  if (!res) { rec.ok(`a 20x render for "${tag}" (guard)`, false, null); return null; }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/facebow-${TAG}-${tag}.png`, Buffer.from(res.url.split(',')[1], 'base64'));
  delete res.url;
  return res;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort,
    viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);
  const set = await P.page.evaluate((face) => {
    try {
      localStorage.setItem('bt-facetattoo', face);
      /* BALD, and it is not a detail: hair covers the forehead, which is the
         half that already worked, and would hide the control. */
      if (window.__btSetHair) window.__btSetHair('none');
    } catch (e) { return { ok: false }; }
    return { ok: true, len: face.length };
  }, FACE_ART);
  rec.ok('a full-coverage face tattoo is set (guard)', !!(set && set.ok), set);
  /* THE RELOAD IS WHAT MAKES THE INK TAKE.  playerArt reads its canvases from
     localStorage once at module init and exposes no window-side setter, so a
     write without a reload changes the store and not the character.
     Straight back through enterWorld and nothing else: this device now HAS a
     character, so it is a RETURNING device, and enterWorld has walked that road
     since v2.3.2447 (Continue, then its own row).  Clicking Create first -- what
     the first cut of this file did, copying an older scenario -- puts the creator
     on screen instead and the run reads as "the player never joined". */
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(1500);
  await H.enterWorld(P).catch((e) => { rec.ok('re-entry after the reload threw', false, String(e)); });
  await P.page.waitForTimeout(2500);
  /* THE RE-ENTRY IS ASSERTED, not assumed.  The reload above is what makes the
     ink take (playerArt reads localStorage once at module init and has no
     window-side setter), and a reload that lands back on the login screen
     leaves a page with `_gameState.current` present and `rpg` null -- which
     reads downstream as "the character has no tattoo" rather than as "there is
     no character". */
  let inWorld = null;
  for (let i = 0; i < 12; i++) {
    inWorld = await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      return { has: !!(S && S.rpg && S.player), zone: S && S.zone,
        route: window.__btBootRoute || null };
    });
    if (inWorld && inWorld.has) break;
    await P.page.waitForTimeout(800);
  }
  rec.ok('the character is back in the world after the reload that applied the '
    + 'ink (guard)', !!(inWorld && inWorld.has), inWorld);
  if (!inWorld || !inWorld.has) { await P.ctx.close().catch(() => {}); return; }
  await P.page.evaluate(() => { try { if (window.__btSetHair) window.__btSetHair('none'); } catch (e) {} });
  await P.page.waitForTimeout(600);

  /* ── THE CONTROL: the WALKING body, which the owner says is fine ──
     Every claim about the bow frames is a comparison against this. */
  await P.page.keyboard.down('s'); await P.page.waitForTimeout(400);
  await P.page.keyboard.up('s'); await P.page.waitForTimeout(800);
  const idle = await sample(P, 'control-idle-south', rec);
  rec.ok('CONTROL: the walking body carries the face tattoo (guard — with no '
    + 'ink on screen at all, every count below would be zero and every claim '
    + 'would pass)', !!(idle && idle.ink > 30), idle && { ink: idle.ink });

  /* The bow shot, re-armed every frame: the window is ~400ms and nothing on the
     player display says a shot is happening (mp-capeattack's v2.3.2190 note). */
  await P.page.evaluate(() => {
    window.__pinBow = { a: null };
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      const p = window.__pinBow;
      if (S && S.rpg && S.player && p && p.a !== null) {
        S.rpg.rangedWeapon = S.rpg.rangedWeapon || { name: 'Pine Bow', type: 'bow' };
        S.rpg.activeSlot = 'ranged';
        S._facingAngle = p.a; S._targetFacingAngle = p.a;
        S._aimAngle = p.a; S._mouseAimAngle = p.a;
        S._bowShotAt = Date.now(); S._bowShotAng = p.a;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const out = {};
  /* south = sector 2, east = sector 0 — the two the owner named.  Each is taken
     JOGGING (the key stays down), which is the state in the report: the moving
     bow shot is the one that draws the leg-erased torso strip whose top row
     lands at jaw height. */
  for (const [tag, sector, key] of [['jog-south', 2, 's'], ['jog-east', 0, 'd']]) {
    await P.page.evaluate((a) => { window.__pinBow = { a }; }, sector * Math.PI / 4);
    await P.page.keyboard.down(key);
    await P.page.waitForTimeout(900);
    out[tag] = await sample(P, tag, rec);
    await P.page.keyboard.up(key);
    await P.page.evaluate(() => { window.__pinBow = { a: null }; });
    await P.page.waitForTimeout(700);
  }

  for (const k of Object.keys(out)) {
    const s = out[k];
    console.log(`    ${k}: ${s && s.ink} ink px, rows ${s && s.top}..${s && s.bot} `
      + `of ${s && s.h}  (idle control: ${idle && idle.ink} px, rows ${idle && idle.top}..${idle && idle.bot})`);
  }

  rec.ok('both bow-shot frames were photographed with ink on them (guard)',
    Object.values(out).every((s) => s && s.ink > 0),
    Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v && v.ink])));

  /* THE CLAIM.  The face region used to end at the torso band's topmost row,
     which on a bow strip is the JAW -- so the drawing was fitted into the
     forehead and everything below it went bare.  A full-coverage grid on a head
     should therefore reach roughly as far down the figure as it does standing;
     measured against the idle control rather than against an absolute, because
     the bow poses are their own art at their own scale. */
  const reach = (s) => (s && s.bot >= 0 && s.top >= 0) ? (s.bot - s.top + 1) : 0;
  const idleReach = reach(idle);
  rec.ok('THE FACE TATTOO REACHES THE JAW ON A MOVING BOW SHOT — the region is '
    + 'seeded from the head\'s own box now, not from the torso band\'s first '
    + 'row, which on these strips sits at jaw height because the bow arms are '
    + 'raised',
    idleReach > 0 && ['jog-south', 'jog-east'].every((k) => reach(out[k]) >= idleReach * 0.75),
    { idleReach, south: reach(out['jog-south']), east: reach(out['jog-east']),
      ratioSouth: idleReach ? +(reach(out['jog-south']) / idleReach).toFixed(2) : null,
      ratioEast: idleReach ? +(reach(out['jog-east']) / idleReach).toFixed(2) : null });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
