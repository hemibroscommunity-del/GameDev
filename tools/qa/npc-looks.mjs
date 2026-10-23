/* ═══ v2.3.3578: EVERY TOWNSPERSON IS A BRO FROM THE CHARACTER CREATOR ═══
 *
 * The owner: "generate the art for the characters described in the document
 * using the Brotown character creator ... NPCs should look like normal bro
 * characters."  Each townsperson's look is written here in the creator's
 * own words (its catalog ids), and this tool dresses a real player in it,
 * in the real game, and photographs him: the same body, hair, hat, beard,
 * shirt and colours a player picks, drawn by the game's own renderer.
 *
 *   npm run build
 *   node tools/qa/npc-looks.mjs            # previews -> tools/qa/out/npc-looks/
 *   node tools/qa/npc-looks.mjs --bake     # the game's pictures -> public/sprites/npc/
 *   node tools/qa/npc-looks.mjs --bake --only=mayor,ace
 *
 * --bake photographs each townsperson as the world draws a player
 * (window.__btCaptureLook, rendering/fighterCapture.js): standing facing
 * south, and a walker standing and jogging all eight ways; then
 * tools/qa/npc_looks_bake.py lays the frames into the townsfolk's 256 px
 * cells (soles on row 222, the cell's middle on the figure's own origin, as
 * the player's sheets are laid out) and writes them over the old pictures:
 *   a standing townsperson   <file>.webp            one 256 x 256 picture
 *   a walker                 <file><dir>.webp       eight strips of nine cells:
 *                                                  his jog in eight, then his stand
 * A change of look here is a re-bake; the townsfolk's code reads only the
 * files (and NPC_DATA's `walk`, whose shape this keeps).  Their dialogue
 * heads are not photographs: they are Hemi Bros portraits, made by
 * tools/qa/nft_portraits.py.
 *
 * The frames are taken at UNIT_PX caller px per figure unit, 256/120: the
 * townsfolk's pictures are drawn at NPC_SPRITE_SCALE (120/256 world px a
 * pixel), so at the player's own PLAYER_SIZE_MULT (1.25, entityRenderer
 * NPC_SCALE_MULT) a grown townsperson stands exactly as tall as a player,
 * and the tallest hat here still clears the cell's top.  A townsperson with
 * a `figureSize` in NPC_DATA (Lil Bro, 0.8) is photographed at that times it:
 * his cell is drawn at a bro's scale like everyone's, and his picture holds
 * only the pixels it shows. */
import * as H from './mp/harness.mjs';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { NPC_DATA } from '../../src/data/gameDisplay.js';

/* The looks.  Ids are the creator's catalogs (src/rendering/traits/*,
   playerSkins.js).  `why` is the joke each look tells, from the satire
   pass's stereotype line.  `still` / `walk` name the files NPC_DATA already
   points at (a standing townsperson's one picture, a walker's strip base). */
export const NPC_LOOKS = {
  mayor: {
    name: 'Mayor Bro', why: 'small-town politician: top hat, monocle, the grey beard he always had',
    skin: 'fair', hair: 'slick-back-hair', hairColor: 'gray', beard: 'beard', beardColor: 'gray',
    hat: 'top-hat', hatColor: 'black', eyewear: 'golden-monocle', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'navy', pants: 'black', shoes: 'black',
    patterns: { shirt: 'stripe-v:2' },
    still: 'mayor-bro',
  },
  blacksmith: {
    name: 'Blacksmith Bro', why: 'gym bro: shirtless, sweatband, flat-top, grey sweatpants',
    skin: 'tan', hair: 'flat-top', hairColor: 'black', beard: 'beard', beardColor: 'black',
    hat: 'bandana-2', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'none', shirtColor: 'default', pants: 'gray', shoes: 'white',
    patterns: { pants: 'stripe-v:2' },
    still: 'blacksmith-bro',
  },
  diego: {
    name: 'Diego', why: 'hustle guy: slicked hair, gold glasses, loud purple tee, white kicks',
    skin: 'brown', hair: 'slick-back-hair', hairColor: 'black', beard: 'none', beardColor: 'default',
    hat: 'none', hatColor: 'default', eyewear: 'golden-glasses', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'purple', pants: 'white', shoes: 'white',
    patterns: { shirt: 'diag:5' },
    walk: 'shopkeeper-bro-walk-',
  },
  farmer: {
    name: 'Farmer Bro', why: 'paranoid dirt hippie: bucket hat, scraggly beard, wide eyes, earth tones',
    skin: 'sand', hair: 'dirty-blonde', hairColor: 'default', beard: 'beard', beardColor: 'brown',
    hat: 'bucket-hat', hatColor: 'green', eyewear: 'none', eyes: 'wtf',
    shirt: 'tshirt', shirtColor: 'yellow', pants: 'brown', shoes: 'brown',
    patterns: { shirt: 'chevron:11' },
    still: 'farmer-bro',
  },
  woodworker: {
    name: 'Woodworker Bro', why: 'overthinking genius: workshop goggles, wild grey hair, graph-paper tee',
    skin: 'pale', hair: 'wavy', hairColor: 'gray', beard: 'none', beardColor: 'default',
    hat: 'none', hatColor: 'default', eyewear: 'goggles', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'white', pants: 'navy', shoes: 'brown',
    patterns: { shirt: 'grid:9' },
    still: 'woodworker-bro',
  },
  beastmaster: {
    name: 'Beastmaster Bro', why: 'survival-show host: brown hat, beard, camo, sleepless eyes',
    skin: 'olive', hair: 'none', hairColor: 'default', beard: 'beard', beardColor: 'brown',
    hat: 'cowboy-hat', hatColor: 'default', eyewear: 'none', eyes: 'sleepy',
    shirt: 'tshirt', shirtColor: 'green', pants: 'brown', shoes: 'black',
    patterns: { shirt: 'camo:12' },
    still: 'beastmaster-bro',
  },
  lilbro: {
    name: 'Lil Bro', why: 'iPad kid: gamer headphones, bright tee, red sneakers (a child: NPC_DATA figureSize 0.8)',
    skin: 'honey', hair: 'blonde-hair', hairColor: 'default', beard: 'none', beardColor: 'default',
    hat: 'headphones', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'orange', pants: 'blue', shoes: 'red',
    patterns: { shirt: 'stripe-h:2' },
    walk: 'lil-bro-walk-',
  },
  ace: {
    name: 'Ace', why: 'back-alley bookie: derby, slicked hair, green felt-table tee, black',
    skin: 'rosy', hair: 'slick-back-hair', hairColor: 'black', beard: 'none', beardColor: 'default',
    hat: 'fedora', hatColor: 'black', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'green', pants: 'black', shoes: 'black',
    patterns: { shirt: 'diamond:5' },
    walk: 'cardsharp-bro-walk-',
  },
};

/* caller px per figure unit: see the header */
export const UNIT_PX = 256 / 120;
/* ...times his figure's size in his cell (NPC_DATA `figureSize`, which the
   renderer reads too: one number for both) */
const unitFor = (L) => {
  const row = NPC_DATA.find((n) => n && n.name === L.name);
  return UNIT_PX * (row && row.figureSize > 0 ? row.figureSize : 1);
};
const DIRS8 = ['south', 'southwest', 'west', 'northwest', 'north', 'northeast', 'east', 'southeast'];

const OUT = join(H.REPO, 'tools', 'qa', 'out', 'npc-looks');
const BAKE = process.argv.includes('--bake');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

async function dress(page, L) {
  return page.evaluate(async (L) => {
    const w = window, f = w._gameFns || {};
    const call = (fn, v) => { try { if (typeof fn === 'function') fn(v); return true; } catch (e) { return String(e && e.message); } };
    const r = {
      skin: call(w.__btSetSkin, L.skin), pants: call(w.__btSetPants, L.pants), shoes: call(w.__btSetShoes, L.shoes),
      hair: call(w.__btSetHair, L.hair), hairColor: call(w.__btSetHairColor, L.hairColor),
      hat: call(w.__btSetHeadwear || f.setHeadwear, L.hat), hatColor: call(w.__btSetHatColor, L.hatColor),
      beard: call(w.__btSetFacialHair || f.setFacialHair, L.beard), beardColor: call(w.__btSetFacialHairColor, L.beardColor),
      eyewear: call(w.__btSetEyewear || f.setEyewear, L.eyewear), eyes: call(w.__btSetEyeStyle || f.setEyeStyle, L.eyes),
      shirt: call(w.__btSetShirt, L.shirt),
    };
    /* the pattern before the shirt's colour (the order the dashboard's
       headshot once needed; harmless) */
    for (const slot of ['shirt', 'pants', 'shoes']) r['pattern-' + slot] = call((v) => w.__btSetPattern(slot, v), (L.patterns || {})[slot] || '');
    r.shirtColor = call(w.__btSetShirtColor, L.shirtColor);
    /* the shirt is TWO stores: the creator's pick and the gear slot that
       draws it (gearCatalog follows the pick, but only on a change).  A
       join's restore can set the slot back alone -- then the pick reads
       'none', setShirt('none') is a no-op, and he is photographed in a white
       tee -- so the slot is set outright, and no armour on */
    r.gearShirt = call((v) => w.__btGearSet('shirt', v), L.shirt === 'none' ? 'none' : 'tshirt');
    for (const slot of ['chest', 'legs', 'shoulders']) r['gear-' + slot] = call((v) => w.__btGearSet(slot, v), 'none');
    return r;
  }, L);
}

/* the player's figure, standing, the name plate and bars hidden, read off
   the GPU as a PNG data URL (the preview) */
async function photograph(page) {
  return page.evaluate(() => {
    const R = window._pixiRenderer;
    const pd = R && R.playerDisplayRaw && R.playerDisplayRaw();
    if (!pd) return null;
    const app = R.app;
    const hidden = [];
    const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
    hide(pd._uiLayer); hide(pd._skullText);
    try {
      const tex = app.renderer.generateTexture({ target: pd, resolution: 3 });
      const c = app.renderer.extract.canvas({ target: tex });
      tex.destroy(true);
      return c.toDataURL('image/png');
    } finally { for (const o of hidden) o.visible = true; }
  });
}

/* one pose one way, as the world draws a player: frames + where the figure's
   own origin lies in them.  Form shading off for the photograph: the town
   shades each townsperson's picture as it draws it (formShade `_vShade`), and
   a photograph that carried the player's own gradient would be shaded twice */
const CLOCK = Math.floor(Date.now() / 60000) * 60000;   /* one moment for every photograph */
async function capture(page, kind, dir, unit) {
  return page.evaluate(({ kind, dir, unit, clock }) => {
    const was = window.__btShadeOff;
    window.__btShadeOff = true;
    try { return window.__btCaptureLook && window.__btCaptureLook(kind, { dir, unitPx: unit, res: 1, weapon: null, clock }); }
    finally { window.__btShadeOff = was; }
  }, { kind, dir, unit, clock: CLOCK });
}
/* The look's recolours (skin, trousers, shoes, the shirt and its pattern) are
   baked per pose and facing the first time they are drawn, in the background:
   a photograph taken before the bake lands shows the plain body.  So each
   pose is photographed until two in a row are the same picture -- the clock
   is pinned (CLOCK), so only a bake still landing can change it. */
async function stableCapture(page, kind, dir, unit) {
  let prev = null;
  for (let t = 0; t < 12; t++) {
    const cap = await capture(page, kind, dir, unit);
    if (cap && cap.frames && cap.frames.length) {
      const key = cap.frames.join('|');
      if (prev && prev.key === key) return cap;
      prev = { key, cap };
    }
    await page.waitForTimeout(t < 2 ? 1500 : 2500);
  }
  return prev ? Object.assign({}, prev.cap, { unstable: true }) : null;
}

const png = (url) => Buffer.from(url.split(',')[1], 'base64');

/* is his look the one worn?  The stores' own saved values (each setter
   writes its key), read back: anything that put the plain look back (a
   reload's rejoin) shows here.  A store never changed has written nothing:
   its key missing is its default, 'none' (a setter asked for the value it
   holds writes nothing either) */
async function lookIsOn(page, L) {
  return page.evaluate((L) => {
    const g = (k) => { try { return localStorage.getItem(k) || 'none'; } catch (e) { return 'none'; } };
    const wd = window.__btWardrobe ? window.__btWardrobe() : {};
    return g('bt-hair') === L.hair && g('bt-headwear') === L.hat && g('bt-facialhair') === L.beard
      && wd.gearShirt === (L.shirt === 'none' ? 'none' : 'tshirt')
      && wd.gearChest === 'none' && wd.gearLegs === 'none' && wd.gearShoulders === 'none';
  }, L);
}


const webPort = await H.freePort();
const srv = await H.serveDist(webPort);
const wsPort = await H.freePort();
const worker = await H.startWorker(wsPort);
const browser = await H.launch();
let failed = false;
try {
  mkdirSync(OUT, { recursive: true });
  const RAW = join(OUT, 'raw');
  if (BAKE) { rmSync(RAW, { recursive: true, force: true }); mkdirSync(RAW, { recursive: true }); }
  const P = await H.newPlayer(browser, { name: 'Looks', wsPort, webPort, world: 'wheel', viewport: { width: 420, height: 860 } });
  /* a reload (the black-screen watchdog's last resort, which this box's
     software graphics can trip) rejoins with the character's stored plain
     look: every photograph since is of nobody.  Counted, so a townsperson
     photographed across one is photographed again */
  let reloads = 0;
  P.page.on('framenavigated', (f) => { if (f === P.page.mainFrame()) { reloads++; console.log('page navigated:', f.url().slice(0, 90)); } });
  await H.enterWorld(P);
  /* a real keystroke every 20 s: two minutes without one logs the page out,
     and the join back restores the character's stored (plain) look -- a
     walker's eight ways take longer than that */
  const stopAlive = H.keepAlive(P);
  await P.page.waitForTimeout(2500);
  const meta = {};
  const ids = Object.keys(NPC_LOOKS).filter((id) => !only.length || only.includes(id));
  for (let q = 0, tries = 0; q < ids.length; q++) {
    const id = ids[q], L = NPC_LOOKS[id];
    const reloadsAtStart = reloads;
    if (await P.page.evaluate(() => !(window._gameState && window._gameState.current && window._gameState.current.player))) await H.enterWorld(P);
    const r = await dress(P.page, L);
    const bad = Object.entries(r).filter(([, v]) => v !== true);
    if (bad.length) { console.log(id, 'setter trouble:', JSON.stringify(bad)); failed = true; }
    await P.page.waitForTimeout(+(process.env.NPC_LOOK_WAIT || 6000));   /* the bakes: hair, hat, recolours */
    if (!BAKE) {
      const url = await photograph(P.page);
      if (!url) { console.log(id, 'NO PICTURE'); failed = true; continue; }
      writeFileSync(join(OUT, id + '.png'), png(url));
      console.log('wrote', id);
      continue;
    }
    const m = { name: L.name, still: L.still || null, walk: L.walk || null, dirs: {} };
    const dirs = L.walk ? DIRS8 : ['south'];
    for (const dir of dirs) {
      if (!(await lookIsOn(P.page, L))) {   /* put back since: dress him again, and let the bakes land */
        console.log(id, dir, 'look was off: dressed again');
        await dress(P.page, L);
        await P.page.waitForTimeout(6000);
      }
      const d = {};
      for (const kind of (L.walk ? ['stand', 'jog'] : ['stand'])) {
        const cap = await stableCapture(P.page, kind, dir, unitFor(L));
        if (!(cap && cap.frames && cap.frames.length)) { console.log(id, kind, dir, 'NO CAPTURE', JSON.stringify(cap)); failed = true; continue; }
        if (cap.unstable) { console.log(id, kind, dir, 'never settled'); failed = true; continue; }
        if (cap.dir !== dir) { console.log(id, kind, dir, 'drew facing', cap.dir); failed = true; continue; }
        const files = cap.frames.map((url, i) => {
          const f = `${id}-${kind}-${dir}-${i}.png`;
          writeFileSync(join(RAW, f), png(url));
          return f;
        });
        d[kind] = { files, origin: cap.origin, times: cap.times, dur: cap.dur };
      }
      m.dirs[dir] = d;
    }
    const stillOn = await lookIsOn(P.page, L);
    if (reloads !== reloadsAtStart || !stillOn) {
      console.log(id, reloads !== reloadsAtStart ? 'the page reloaded while he was photographed: again' : 'his look was put back while he was photographed: again');
      if (++tries > 3) { console.log(id, 'reloads every time'); failed = true; continue; }
      q--;
      continue;
    }
    meta[id] = m;
    console.log('photographed', id);
  }
  stopAlive();
  if (BAKE) {
    writeFileSync(join(RAW, 'meta.json'), JSON.stringify(meta, null, 1));
    if (!failed) {
      execFileSync('python3', [join(H.REPO, 'tools', 'qa', 'npc_looks_bake.py'), RAW, join(H.REPO, 'public', 'sprites', 'npc'), OUT], { stdio: 'inherit' });
    }
  }
} finally {
  await browser.close().catch(() => {});
  await H.stopWorker(worker).catch(() => {});
  try { srv.close(); } catch (e) {}
}
if (failed) { console.log('FAILED: nothing written to public/'); process.exit(1); }
