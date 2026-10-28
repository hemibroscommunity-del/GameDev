/* ═══ THE MONKEY, END TO END (v2.3.2682) ═══
 *
 * Owner: "Push to main!  Make sure it's available in trait picker."
 *
 * ═══ v2.3.3589: AND THE ALIEN, ON A TAB OF ITS OWN ═══
 *
 * Owner: "Yes make species it's own button.  And add alien."  The species left
 * the Skin tab for a Species tab, and the Alien joined the monkey: its pointed
 * ears (the species piece), Alien Cyan (the skin it presets) and its eyes (the
 * eye style 'alien', which it presets; since v2.3.3590 the Hemi Bros
 * collection's, §5).  Moved to the world (`world: 'wheel'`) when it was
 * touched, the oldMap.mjs rule.
 *
 * What this asserts, against a real worker and a real Chromium:
 *
 * 1. THE SPECIES TAB.  The creator opens on it; its icon decoded; its strip
 *    offers Human, Monkey and Alien, in that order, and no colour row (the
 *    skin is one tab along).  The Skin tab beside it has the skin tones --
 *    the fur colours and both species' tones among them -- and the tattoo card.
 * 2. PICKING A SPECIES MOVES THE SKIN AND THE EYES, AND ONLY WHEN THEY ARE ITS.
 *    Every branch of the Species tab's `set`, read from the stores:
 *      Human -> Alien: Alien Cyan and the alien's eyes (from a human tone and
 *        the bro's own eyes);
 *      Alien -> Monkey: Monkey Brown (one species' preset to the next's), the
 *        eyes back to his own (the alien's eyes go with the alien);
 *      Monkey, Purple -> Alien: still Purple (a colour the player picked), the
 *        alien's eyes;
 *      Alien -> Human: the default skin and his own eyes.
 *    Each pick changes the creator's figure.
 * 3. THE MUZZLE AND EARS STAY TAN ON A PURPLE MONKEY.  Owner: "I want that and
 *    the muzzle to stay" the exact tan.  The art's tan (149,116,89) is counted
 *    on the creator canvas on Monkey Brown and again on Purple; the fur changes,
 *    so the counts must stay close and non-zero on both.
 * 4. THE WORLD DRAWS THE ALIEN, FOR YOU AND FOR A PEER.  The world renderer's
 *    species builds (window.__btSpeciesArt) name the alien on Alien Cyan, its
 *    per-frame strips loaded; the body sheets are baked with the bro's own eyes
 *    painted out under the style (`es:alien` in their keys,
 *    __btBodySheetKeys); and a second player, joining after, has the first
 *    one's species and eye style on its S.others entry and a build of its own
 *    for that peer's skin -- which is what the 'sc' and 'es' keys on both
 *    server gates buy.
 * 5. THE EYES ARE THE COLLECTION'S (v2.3.3590; owner: "Biggest difference for
 *    alien is the alien eyes.  Those weren't made the same").  The shipped
 *    pictures are the Alien Bro's checker on every face facing, and the Eyes
 *    tab's colour paints only its dark squares: a green swatch's bake (the
 *    probe's `pixels`) turns every whole pixel green and leaves the
 *    see-through shadow as drawn.  (Run before 4, on the creator.)
 * Screenshots of the creator and both world views are written to
 * /tmp/qa-species-*.png for a human to look at.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const TAN = [149, 116, 89];
const ALIEN_CYAN = '191,231,231';

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
const onTab = (P) => P.page.evaluate(() => {
  const b = document.querySelector('.bt-cc-tab--on');
  return b ? (b.textContent || '').trim() : null;
});
const stripTitles = (P) => P.page.evaluate(() =>
  [...document.querySelectorAll('.bt-cc-strip > *')].map((x) => x.getAttribute('title')));
const pickTile = (P, title) => P.page.evaluate((t) => {
  const el = [...document.querySelectorAll('.bt-cc-strip > *')]
    .find((x) => (x.getAttribute('title') || '').toLowerCase() === t.toLowerCase());
  if (!el) return false; el.click(); return true;
}, title);
const colourRow = (P) => P.page.evaluate(() => {
  const el = document.querySelector('.bt-cc-colors');
  if (!el) return { present: false };
  return { present: true, ghost: el.className.indexOf('bt-cc-ghost') >= 0,
    titles: [...el.querySelectorAll('.bt-cc-colors-row button')].map((b) => b.getAttribute('title')).filter(Boolean) };
});
const stores = (P) => P.page.evaluate(() => {
  const g = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  return { species: g('bt-species'), skin: g('bt-skin'), eyes: g('bt-eyestyle') };
});
function diffN(a, b) {
  if (!a || !b || a.err || b.err || a.w !== b.w || a.h !== b.h) return -1;
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
  const A = await H.newPlayer(browser, { name: 'Alien', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  await A.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await A.page.click('[data-tut="login-create"]');
  await A.page.waitForSelector('.bt-cc-stage canvas', { timeout: 30000 });
  await A.page.waitForTimeout(2500);
  const settle = () => A.page.waitForTimeout(2500);
  /* a pick on the Species tab, and the stores and the figure after it */
  const pickSpecies = async (name) => {
    await pickTab(A, 'Bro type');   /* v2.3.3772: the tab's words (the owner: "Change species to bro type") */
    await A.page.waitForTimeout(500);
    const ok = await pickTile(A, name);
    await settle();
    return { ok, st: await stores(A), cap: await grab(A) };
  };

  /* ── 1 ── the Species tab */
  const opened = await onTab(A);
  rec.ok(`the creator opens on the Bro type tab (on "${opened}")`, opened === 'Bro type', { opened });
  const icon = await A.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-cc-tabs .bt-cc-tab')].find((x) => (x.textContent || '').trim() === 'Bro type');
    const img = b && b.querySelector('img.bt-cc-tab-icon');
    return img ? { src: img.getAttribute('src'), nat: img.naturalWidth } : null;
  });
  rec.ok(`...its icon is the three bro types' heads, and it decoded (${JSON.stringify(icon)})`,   /* v2.3.3772 */
    !!icon && /cc-tab-brotype\.png/.test(icon.src) && icon.nat > 0, icon);
  const titles = await stripTitles(A);
  rec.ok(`the Bro type tab offers Human, Monkey and Alien, in that order (saw ${JSON.stringify(titles)})`,
    JSON.stringify(titles) === JSON.stringify(['Human', 'Monkey', 'Alien']), { titles });
  const rowS = await colourRow(A);
  rec.ok('...and no colour row: the skin is the next tab along', !rowS.present || rowS.ghost, rowS);
  const human = await grab(A);
  await A.page.screenshot({ path: '/tmp/qa-species-creator-human.png' });

  rec.ok('the Skin tab opens (guard)', await pickTab(A, 'Skin'), null);
  await A.page.waitForTimeout(800);
  const tones = await stripTitles(A);
  rec.ok(`the Skin tab is the skin tones, the fur colours and both species' tones among them (${tones.length} tones)`,
    ['Purple', 'Yellow', 'Monkey Brown', 'Alien Cyan'].every((t) => tones.includes(t)) && tones.length >= 20, { tones });
  const card = await A.page.evaluate(() => !!document.querySelector('.bt-cc-ink-pane'));
  rec.ok('...with the tattoo card under them', card, { card });

  /* ── 2 ── every way a pick moves the skin and the eyes */
  const toAlien = await pickSpecies('Alien');
  rec.ok('Alien is pickable (guard)', toAlien.ok, null);
  rec.ok(`Human -> Alien: Alien Cyan and the alien's eyes (${JSON.stringify(toAlien.st)})`,
    toAlien.st.species === 'alien' && toAlien.st.skin === 'aliencyan' && toAlien.st.eyes === 'alien', toAlien.st);
  const dAlien = diffN(human, toAlien.cap);
  rec.ok(`...and the figure changed (${dAlien}px)`, dAlien > 200, { dAlien });
  await A.page.screenshot({ path: '/tmp/qa-species-creator-alien.png' });

  const toMonkey = await pickSpecies('Monkey');
  rec.ok(`Alien -> Monkey: Monkey Brown, one species' preset to the next's, and his own eyes back (${JSON.stringify(toMonkey.st)})`,
    toMonkey.st.species === 'monkey' && toMonkey.st.skin === 'monkeybrown' && toMonkey.st.eyes === 'none', toMonkey.st);
  const dMonkey = diffN(toAlien.cap, toMonkey.cap);
  rec.ok(`...and the figure changed (${dMonkey}px)`, dMonkey > 200, { dMonkey });
  const tanBrown = countTan(toMonkey.cap);
  await A.page.screenshot({ path: '/tmp/qa-species-creator-monkey.png' });

  /* ── 3 ── the muzzle's tan on a purple monkey */
  await pickTab(A, 'Skin');
  await A.page.waitForTimeout(600);
  rec.ok('Purple is pickable on the Skin tab (guard)', await pickTile(A, 'Purple'), null);
  await settle();
  const purple = await grab(A);
  const tanPurple = countTan(purple);
  const furChanged = diffN(toMonkey.cap, purple);
  rec.ok(`the fur recoloured to purple (${furChanged}px changed)`, furChanged > 500, { furChanged });
  rec.ok(`the muzzle and ears kept the art's exact tan on purple (${tanBrown} tan px on Monkey Brown, ${tanPurple} on Purple)`,
    tanBrown > 50 && tanPurple > 50 && Math.abs(tanPurple - tanBrown) <= 0.15 * tanBrown, { tanBrown, tanPurple });
  await A.page.screenshot({ path: '/tmp/qa-species-creator-purple.png' });

  const purpleAlien = await pickSpecies('Alien');
  rec.ok(`Monkey, Purple -> Alien: still Purple, a colour the player picked, and the alien's eyes (${JSON.stringify(purpleAlien.st)})`,
    purpleAlien.st.species === 'alien' && purpleAlien.st.skin === 'purple' && purpleAlien.st.eyes === 'alien', purpleAlien.st);
  await A.page.screenshot({ path: '/tmp/qa-species-creator-purple-alien.png' });

  const backHuman = await pickSpecies('Human');
  rec.ok(`Alien -> Human: the default skin and his own eyes (${JSON.stringify(backHuman.st)})`,
    backHuman.st.species === 'none' && (backHuman.st.skin === 'default' || backHuman.st.skin === null) && backHuman.st.eyes === 'none', backHuman.st);
  const dHome = diffN(human, backHuman.cap);
  rec.ok(`...the very bro we started with (${dHome}px differ)`, dHome >= 0 && dHome < 50, { dHome });

  const again = await pickSpecies('Alien');
  rec.ok(`Human -> Alien again, for the world (${JSON.stringify(again.st)})`,
    again.st.species === 'alien' && again.st.skin === 'aliencyan' && again.st.eyes === 'alien', again.st);

  /* ── 5 ── v2.3.3590: the eyes are the collection's ──
     The shipped pictures, read in the page: on every facing that shows a face,
     one 4 x 4 block per eye (two, or one in profile) of four 2 x 2 cells, the
     dark (31,13,27) drawn whole on the "/" diagonal and see-through (alpha 38)
     on the other -- the Alien Bro's checker, cell for cell. */
  const art = await A.page.evaluate(async () => {
    const out = {};
    for (const dir of ['south', 'southwest', 'east']) {
      const im = new Image();
      im.src = `/sprites/traits/eyestyle/alien/${dir}.png?qa=${Date.now()}`;
      try { await im.decode(); } catch (e) { out[dir] = { err: String(e) }; continue; }
      const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height;
      const ctx = cv.getContext('2d');
      ctx.drawImage(im, 0, 0);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const at = (x, y) => { const i = (y * cv.width + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
      const cols = [];
      let y0 = 1e9, y1 = -1;
      for (let x = 0; x < cv.width; x++) {
        for (let y = 0; y < cv.height; y++) {
          if (at(x, y)[3]) { if (!cols.includes(x)) cols.push(x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        }
      }
      const eyes = [];
      for (const x of cols) {
        const last = eyes[eyes.length - 1];
        if (last && x === last[1] + 1) last[1] = x; else eyes.push([x, x]);
      }
      const checker = eyes.map(([x0, x1]) => {
        if (x1 - x0 !== 3 || y1 - y0 !== 3) return { x0, x1, y0, y1, ok: false, why: 'not 4 x 4' };
        let ok = true;
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 4; dx++) {
            const [r, g, b, a] = at(x0 + dx, y0 + dy);
            const dark = (dx >= 2) !== (dy >= 2);           /* the "/" diagonal: top right, bottom left */
            if (a !== (dark ? 255 : 38)) ok = false;
            if (Math.abs(r - 31) > 4 || Math.abs(g - 13) > 4 || Math.abs(b - 27) > 4) ok = false;
          }
        }
        return { x0, y0, ok };
      });
      out[dir] = { eyes: checker };
    }
    return out;
  });
  const want = { south: 2, southwest: 2, east: 1 };
  rec.ok(`the Alien Eyes are the collection's: on each face facing, an eye per 4 x 4 block of 2 x 2 cells, `
       + `the dark whole on one diagonal and see-through on the other (${JSON.stringify(art)})`,
    Object.keys(want).every((dir) => art[dir] && art[dir].eyes && art[dir].eyes.length === want[dir]
      && art[dir].eyes.every((e) => e.ok)), art);
  /* ...and the Eyes tab's colour paints only the dark: the see-through shadow
     is the skin's, so a swatch that tinted it would veil the skin, not shade it */
  const prof = await A.page.evaluate(() => (window.__btEyeStyleColor ? window.__btEyeStyleColor.ref('alien') : null));
  rec.ok(`the colour row's rule for them: replace outright, and only what is drawn whole (${JSON.stringify(prof && { flat: prof.flat, solid: prof.solid })})`,
    !!prof && prof.flat === true && prof.solid === true, prof);
  const baked = await A.page.evaluate(async () => {
    const P = window.__btEyeStyleColor;
    if (!P) return null;
    P.textures('alien', 'green');                   /* kicks the bake */
    for (let i = 0; i < 40 && !P.textures('alien', 'green'); i++) await new Promise((r) => setTimeout(r, 150));
    const px = P.pixels('alien', 'green');
    if (!px) return null;
    const out = {};
    for (const dir of Object.keys(px)) {
      const whole = px[dir].filter((p) => p[3] === 255);
      const see = px[dir].filter((p) => p[3] < 255);
      out[dir] = {
        whole: whole.length, green: whole.filter((p) => p[0] === 70 && p[1] === 150 && p[2] === 90).length,
        see: see.length, stillDark: see.filter((p) => p[0] + p[1] + p[2] < 120 && p[1] < 40).length,
      };
    }
    return out;
  });
  rec.ok(`a green swatch paints every whole pixel green and leaves every see-through one the dark it was, `
       + `on all three facings (${JSON.stringify(baked)})`,
    !!baked && ['south', 'southwest', 'east'].every((dir) => baked[dir] && baked[dir].whole > 0
      && baked[dir].green === baked[dir].whole && baked[dir].see > 0 && baked[dir].stillDark === baked[dir].see), baked);

  /* ── 4 ── the world */
  await H.enterWorld(A);
  await A.page.waitForTimeout(2500);
  const artA = await A.page.evaluate(() => (window.__btSpeciesArt ? window.__btSpeciesArt() : null));
  rec.ok(`the world has the alien's art and a build on Alien Cyan (${JSON.stringify(artA)})`,
    !!artA && artA.loaded.includes('alien') && artA.builds.some((b) => b.startsWith('alien|' + ALIEN_CYAN))
      && (artA.strips.alien || 0) >= 10, artA);
  const self = await A.page.evaluate(() => {
    const S = window._gameState.current;
    return { species: localStorage.getItem('bt-species'), eyes: localStorage.getItem('bt-eyestyle'), myId: S.myId,
      zone: S.currentZone, keys: window.__btBodySheetKeys ? window.__btBodySheetKeys() : null };
  });
  rec.ok(`the species and its eyes survived the join, in the world (zone ${self.zone})`,
    self.species === 'alien' && self.eyes === 'alien' && self.zone === 'wheel', { species: self.species, eyes: self.eyes, zone: self.zone });
  const withEyes = (self.keys || []).filter((k) => k.indexOf('es:alien') >= 0);
  rec.ok(`the world's body sheets are baked with the bro's own eyes painted out under the alien's (${withEyes.length} keyed es:alien)`,
    withEyes.length > 0, { withEyes: withEyes.slice(0, 4), total: self.keys && self.keys.length });
  const boxA = await H.figureBox(A, { pad: 30 }).catch(() => null);
  await A.page.screenshot(boxA ? { path: '/tmp/qa-species-world-self.png', clip: boxA } : { path: '/tmp/qa-species-world-self.png' });

  /* Walking: every jog-south and jog-north frame is a baked per-frame overlay
     placed in body space, so a wrong corner formula would show here as ears
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
  const B = await H.newPlayer(browser, { name: 'Viewer', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  await H.enterWorld(B);
  await H.waitMutualSight(A, B);
  await B.page.waitForTimeout(3000);
  const seen = await B.page.evaluate((aid) => {
    const S = window._gameState.current;
    const o = S.others && S.others[aid];
    return { species: o && o.species, skin: o && o.skin, eyeStyle: o && o.eyeStyle,
      art: window.__btSpeciesArt ? window.__btSpeciesArt() : null };
  }, self.myId);
  rec.ok(`the peer sees the alien on the first player (species=${seen.species}, skin=${seen.skin}, eyes=${seen.eyeStyle})`,
    seen.species === 'alien' && seen.skin === 'aliencyan' && seen.eyeStyle === 'alien', seen);
  rec.ok(`...and built it on THEIR skin (${JSON.stringify(seen.art && seen.art.builds)})`,
    !!seen.art && seen.art.builds.some((b) => b.startsWith('alien|' + ALIEN_CYAN)), seen.art);
  const boxB = await H.figureBox(B, { pad: 30, peerId: self.myId }).catch(() => null);
  await B.page.screenshot(boxB ? { path: '/tmp/qa-species-world-peer.png', clip: boxB } : { path: '/tmp/qa-species-world-peer.png' });

  const errs = [...A.logs, ...B.logs].filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors on either phone', errs.length === 0, errs.slice(0, 3));
  console.log('    screenshots: /tmp/qa-species-{creator-human,creator-alien,creator-monkey,creator-purple,creator-purple-alien,world-self,world-peer}.png');
}
