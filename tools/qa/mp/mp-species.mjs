/* ═══ THE MONKEY, END TO END (v2.3.2681) ═══
 *
 * Owner: "Push to main!  Make sure it's available in trait picker."
 *
 * What this asserts, against a real worker and a real Chromium:
 *
 * 1. THE SKIN TAB OFFERS THE SPECIES.  Human first, then Monkey, in the option
 *    strip; the colour row live on Human (the pick it has always served) and on
 *    Monkey, carrying the v2.3.2680 fur colours.
 * 2. PICKING THE MONKEY CHANGES THE FIGURE AND PRESETS MONKEY BROWN.  Read off
 *    the creator canvas (a diff against the human) and the skin store.
 * 3. THE MUZZLE AND EARS STAY TAN ON A PURPLE MONKEY.  Owner: "I want that and
 *    the muzzle to stay" the exact tan.  The art's tan (149,116,89) is counted
 *    on the creator canvas on Monkey Brown and again on Purple; the fur changes,
 *    so the counts must stay close and non-zero on both.
 * 4. THE WORLD DRAWS IT, FOR YOU AND FOR A PEER.  The world renderer's species
 *    builds (window.__btSpeciesArt) name the monkey on the wearer's own skin,
 *    with the per-frame strips loaded; and a second player, joining after, has
 *    the first one's species on its S.others entry and a build of its own for
 *    that peer's skin -- which is what the 'sc' key on both server gates buys.
 * Screenshots of the creator and both world views are written to
 * /tmp/qa-species-*.png for a human to look at.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const TAN = [149, 116, 89];

const grab = (P) => P.page.evaluate(() => {
  const c = document.querySelector('.bt-cc-stage canvas');
  if (!c) return null;
  try {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return { w: c.width, h: c.height, data: Array.from(d) };
  } catch (e) { return { err: String(e) }; }
});
const pickTab = (P, label) => P.page.evaluate((l) => {
  const b = [...document.querySelectorAll('.bt-cc-tab')].find((x) => (x.textContent || '').trim() === l);
  if (!b) return false; b.click(); return true;
}, label);
const stripTitles = (P) => P.page.evaluate(() =>
  [...document.querySelectorAll('.bt-cc-strip > *')].map((x) => x.getAttribute('title')));
const pickTile = (P, title) => P.page.evaluate((t) => {
  const el = [...document.querySelectorAll('.bt-cc-strip > *')]
    .find((x) => (x.getAttribute('title') || '').toLowerCase() === t.toLowerCase());
  if (!el) return false; el.click(); return true;
}, title);
const colourTitles = (P) => P.page.evaluate(() => {
  const el = document.querySelector('.bt-cc-colors');
  if (!el) return { present: false };
  return { present: true, ghost: el.className.indexOf('bt-cc-ghost') >= 0,
    titles: [...el.querySelectorAll('button')].map((b) => b.getAttribute('title')).filter(Boolean) };
});
const pickColour = (P, title) => P.page.evaluate((t) => {
  const row = document.querySelector('.bt-cc-colors');
  const el = row && [...row.querySelectorAll('button')].find((b) => (b.getAttribute('title') || '') === t);
  if (!el) return false; el.click(); return true;
}, title);
function diffN(a, b) {
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > 40) n++;
  }
  return n;
}
function countTan(cap) {
  let n = 0;
  for (let i = 0; i < cap.data.length; i += 4) {
    if (cap.data[i + 3] < 200) continue;
    if (Math.abs(cap.data[i] - TAN[0]) <= 6 && Math.abs(cap.data[i + 1] - TAN[1]) <= 6 && Math.abs(cap.data[i + 2] - TAN[2]) <= 6) n++;
  }
  return n;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Monkey', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  await A.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await A.page.click('[data-tut="login-create"]');
  await A.page.waitForSelector('.bt-cc-stage canvas', { timeout: 30000 });
  await A.page.waitForTimeout(2500);

  /* ── 1 ── */
  rec.ok('the Skin tab opened (guard)', await pickTab(A, 'Skin'), null);
  await A.page.waitForTimeout(800);
  const titles = await stripTitles(A);
  rec.ok(`the Skin tab's strip offers Human then Monkey (saw ${JSON.stringify(titles)})`,
    titles[0] === 'Human' && titles.includes('Monkey'), { titles });
  const human = await grab(A);
  const rowH = await colourTitles(A);
  rec.ok('the skin-colour row is live on Human', rowH.present && !rowH.ghost && rowH.titles.length > 5, rowH);
  await A.page.screenshot({ path: '/tmp/qa-species-creator-human.png' });

  /* ── 2 ── */
  rec.ok('Monkey is pickable (guard)', await pickTile(A, 'Monkey'), null);
  await A.page.waitForTimeout(2500);
  const monkey = await grab(A);
  const changed = (human && monkey && !human.err && !monkey.err && human.w === monkey.w) ? diffN(human, monkey) : -1;
  rec.ok(`picking Monkey changed the creator figure (${changed}px)`, changed > 200, { changed });
  const skin = await A.page.evaluate(() => { try { return localStorage.getItem('bt-skin'); } catch (e) { return null; } });
  const sp = await A.page.evaluate(() => { try { return localStorage.getItem('bt-species'); } catch (e) { return null; } });
  rec.ok(`...stored the species and preset Monkey Brown (species=${sp}, skin=${skin})`, sp === 'monkey' && (skin === 'monkeybrown' || skin === null), { sp, skin });
  const rowM = await colourTitles(A);
  rec.ok('the colour row on Monkey carries the fur colours', rowM.present && !rowM.ghost
    && ['Purple', 'Yellow', 'Monkey Brown'].every((t) => rowM.titles.includes(t)), { titles: rowM.titles });
  const tanBrown = countTan(monkey);
  await A.page.screenshot({ path: '/tmp/qa-species-creator-monkey.png' });

  /* ── 3 ── */
  rec.ok('Purple is pickable (guard)', await pickColour(A, 'Purple'), null);
  await A.page.waitForTimeout(2500);
  const purple = await grab(A);
  const tanPurple = countTan(purple);
  const furChanged = diffN(monkey, purple);
  rec.ok(`the fur recoloured to purple (${furChanged}px changed)`, furChanged > 500, { furChanged });
  rec.ok(`the muzzle and ears kept the art's exact tan on purple (${tanBrown} tan px on Monkey Brown, ${tanPurple} on Purple)`,
    tanBrown > 50 && tanPurple > 50 && Math.abs(tanPurple - tanBrown) <= 0.15 * tanBrown, { tanBrown, tanPurple });
  await A.page.screenshot({ path: '/tmp/qa-species-creator-purple.png' });

  /* ── 4 ── */
  await H.enterWorld(A);
  await A.page.waitForTimeout(2500);
  const artA = await A.page.evaluate(() => (window.__btSpeciesArt ? window.__btSpeciesArt() : null));
  rec.ok(`the world has the monkey's art and a build on the wearer's skin (${JSON.stringify(artA)})`,
    !!artA && artA.loaded.includes('monkey') && artA.builds.some((b) => b.startsWith('monkey|120,72,180'))
      && (artA.strips.monkey || 0) >= 10, artA);
  const selfSprite = await A.page.evaluate(() => {
    const S = window._gameState.current;
    return { species: localStorage.getItem('bt-species'), myId: S.myId };
  });
  rec.ok('the species survived the join (guard)', selfSprite.species === 'monkey', selfSprite);
  const boxA = await H.figureBox(A, { pad: 30 }).catch(() => null);
  await A.page.screenshot(boxA ? { path: '/tmp/qa-species-world-self.png', clip: boxA } : { path: '/tmp/qa-species-world-self.png' });

  /* Walking: every jog-south and jog-north frame is a baked per-frame overlay
     placed in body space, so a wrong corner formula would show here as a face
     sliding off the head.  Captured mid-stride for a human to look at. */
  await A.page.mouse.click(195, 420).catch(() => {});
  for (const [key, tag] of [['s', 'south'], ['d', 'east'], ['w', 'north']]) {
    await A.page.keyboard.down(key);
    for (let k = 0; k < 3; k++) {
      await A.page.waitForTimeout(260);
      const bx = await H.figureBox(A, { pad: 30 }).catch(() => null);
      await A.page.screenshot(bx ? { path: `/tmp/qa-species-walk-${tag}-${k}.png`, clip: bx } : { path: `/tmp/qa-species-walk-${tag}-${k}.png` });
    }
    await A.page.keyboard.up(key);
    await A.page.waitForTimeout(400);
  }
  const B = await H.newPlayer(browser, { name: 'Viewer', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  await H.enterWorld(B);
  await H.waitMutualSight(A, B);
  await B.page.waitForTimeout(3000);
  const seen = await B.page.evaluate((aid) => {
    const S = window._gameState.current;
    const o = S.others && S.others[aid];
    return { species: o && o.species, skin: o && o.skin, art: window.__btSpeciesArt ? window.__btSpeciesArt() : null };
  }, selfSprite.myId);
  rec.ok(`the peer sees the monkey species on the first player (species=${seen.species}, skin=${seen.skin})`,
    seen.species === 'monkey' && seen.skin === 'purple', seen);
  rec.ok(`...and built it on THEIR skin (${JSON.stringify(seen.art && seen.art.builds)})`,
    !!seen.art && seen.art.builds.some((b) => b.startsWith('monkey|120,72,180')), seen.art);
  const boxB = await H.figureBox(B, { pad: 30, peerId: selfSprite.myId }).catch(() => null);
  await B.page.screenshot(boxB ? { path: '/tmp/qa-species-world-peer.png', clip: boxB } : { path: '/tmp/qa-species-world-peer.png' });
  console.log('    screenshots: /tmp/qa-species-{creator-human,creator-monkey,creator-purple,world-self,world-peer}.png');
}
