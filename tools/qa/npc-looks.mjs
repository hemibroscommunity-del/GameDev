/* ═══ v2.3.3576: EVERY TOWNSPERSON IS A BRO FROM THE CHARACTER CREATOR ═══
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
 *
 * Writes one PNG a townsperson (standing, facing south, no name plate) and
 * sheet.png, all of them side by side. */
import * as H from './mp/harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/* The looks.  Ids are the creator's catalogs (src/rendering/traits/*,
   playerSkins.js).  `why` is the joke each look tells, from the satire
   pass's stereotype line. */
export const NPC_LOOKS = {
  mayor: {
    name: 'Mayor Bro', why: 'small-town politician: top hat, monocle, the grey beard he always had',
    skin: 'fair', hair: 'slick-back-hair', hairColor: 'gray', beard: 'beard', beardColor: 'gray',
    hat: 'top-hat', hatColor: 'black', eyewear: 'golden-monocle', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'navy', pants: 'black', shoes: 'black',
    patterns: { shirt: 'stripe-v:2' },
  },
  blacksmith: {
    name: 'Blacksmith Bro', why: 'gym bro: shirtless, sweatband, flat-top, grey sweatpants',
    skin: 'tan', hair: 'flat-top', hairColor: 'black', beard: 'beard', beardColor: 'black',
    hat: 'bandana-2', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'none', shirtColor: 'default', pants: 'gray', shoes: 'white',
    patterns: { pants: 'stripe-v:2' },
  },
  diego: {
    name: 'Diego', why: 'hustle guy: slicked hair, gold glasses, loud purple tee, white kicks',
    skin: 'brown', hair: 'slick-back-hair', hairColor: 'black', beard: 'none', beardColor: 'default',
    hat: 'none', hatColor: 'default', eyewear: 'golden-glasses', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'purple', pants: 'white', shoes: 'white',
    patterns: { shirt: 'diag:5' },
  },
  farmer: {
    name: 'Farmer Bro', why: 'paranoid dirt hippie: bucket hat, scraggly beard, wide eyes, earth tones',
    skin: 'sand', hair: 'dirty-blonde', hairColor: 'default', beard: 'beard', beardColor: 'brown',
    hat: 'bucket-hat', hatColor: 'green', eyewear: 'none', eyes: 'wtf',
    shirt: 'tshirt', shirtColor: 'yellow', pants: 'brown', shoes: 'brown',
    patterns: { shirt: 'chevron:11' },
  },
  woodworker: {
    name: 'Woodworker Bro', why: 'overthinking genius: workshop goggles, wild grey hair, white lab-ish tee',
    skin: 'pale', hair: 'wavy', hairColor: 'gray', beard: 'none', beardColor: 'default',
    hat: 'none', hatColor: 'default', eyewear: 'goggles', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'white', pants: 'navy', shoes: 'brown',
    patterns: { shirt: 'grid:9' },
  },
  beastmaster: {
    name: 'Beastmaster Bro', why: 'survival-show host: brown hat, beard, khaki-green, sleepless eyes',
    skin: 'olive', hair: 'none', hairColor: 'default', beard: 'beard', beardColor: 'brown',
    hat: 'cowboy-hat', hatColor: 'default', eyewear: 'none', eyes: 'sleepy',
    shirt: 'tshirt', shirtColor: 'green', pants: 'brown', shoes: 'black',
    patterns: { shirt: 'camo:12' },
  },
  lilbro: {
    name: 'Lil Bro', why: 'iPad kid: gamer headphones, bright tee, red sneakers (drawn smaller in town)',
    skin: 'honey', hair: 'blonde-hair', hairColor: 'default', beard: 'none', beardColor: 'default',
    hat: 'headphones', hatColor: 'default', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'orange', pants: 'blue', shoes: 'red',
    patterns: { shirt: 'stripe-h:2' },
  },
  ace: {
    name: 'Ace', why: 'back-alley bookie: derby, slicked hair, green felt-table tee, black',
    skin: 'rosy', hair: 'slick-back-hair', hairColor: 'black', beard: 'none', beardColor: 'default',
    hat: 'fedora', hatColor: 'black', eyewear: 'none', eyes: 'none',
    shirt: 'tshirt', shirtColor: 'green', pants: 'black', shoes: 'black',
    patterns: { shirt: 'diamond:5' },
  },
};

const OUT = join(H.REPO, 'tools', 'qa', 'out', 'npc-looks');

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
      shirt: call(w.__btSetShirt, L.shirt), shirtColor: call(w.__btSetShirtColor, L.shirtColor),
    };
    for (const slot of ['shirt', 'pants', 'shoes']) r['pattern-' + slot] = call((v) => w.__btSetPattern(slot, v), (L.patterns || {})[slot] || '');
    return r;
  }, L);
}

/* the player's figure, standing, the name plate and bars hidden, read off
   the GPU as a PNG data URL */
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

const webPort = await H.freePort();
const srv = await H.serveDist(webPort);
const wsPort = await H.freePort();
const worker = await H.startWorker(wsPort);
const browser = await H.launch();
try {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Looks', wsPort, webPort, world: 'wheel', viewport: { width: 420, height: 860 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
  for (const [id, L] of Object.entries(NPC_LOOKS)) {
    if (only.length && !only.includes(id)) continue;
    const r = await dress(P.page, L);
    const bad = Object.entries(r).filter(([, v]) => v !== true);
    if (bad.length) console.log(id, 'setter trouble:', JSON.stringify(bad));
    await P.page.waitForTimeout(+(process.env.NPC_LOOK_WAIT || 6000));   /* the bakes: hair, hat, recolours */
    const url = await photograph(P.page);
    if (!url) { console.log(id, 'NO PICTURE'); continue; }
    writeFileSync(join(OUT, id + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote', id);
  }
} finally {
  await browser.close().catch(() => {});
  await H.stopWorker(worker).catch(() => {});
  try { srv.close(); } catch (e) {}
}
