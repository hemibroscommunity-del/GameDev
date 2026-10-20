/* ═══ v2.3.3495: THE ARMOUR RIDES THE ARM CAPSULE -- THE COPPER SHOULDER ═══
 *
 * The owner: the east jog's armour shoulder on a COPPER torso, "fix it for all
 * future tiers" ("it was solved for iron").  The arm capsule (entityRenderer,
 * v2.3.200) re-draws a clone of the BODY from shoulder to hand over everything
 * on an east jog with a weapon out, so the arm covers a slung shield; the shirt
 * (v2.3.2134) and cape (v2.3.2138) clones ride along over it, and since
 * v2.3.3495 the greaves' and the plate's do too.  Iron "was solved" only as a
 * full iron SET, which jogs as the knight figure (its body texture IS the
 * armour); any other outfit jogs layered, and its body clone is the masked
 * bake, whose shoulders are bare.
 *
 * Measured on the real figure, in one held frame of the stride: the player's
 * display drawn with the capsule's clones and without them (extract, the
 * same frame and state).  The clones copy what is drawn under them, so with
 * no shield slung the two must be the SAME picture.  For each outfit --
 *
 *   a. a copper torso alone,
 *   b. a copper torso and iron greaves,
 *   c. a black steel torso and copper greaves,
 *   d. a full iron set (the knight: nothing to fix, and nothing changed),
 *
 * -- the bare SKIN the capsule lays over the figure (with the fix: a few
 * pixels a frame at most, the hand), and, as the proof the measure sees the
 * bug, the skin it laid without the armour's clones (the code before this
 * version): dozens to hundreds a frame, the bare arm and shoulder over the
 * plate.  The capsule still changes some pixels that are not skin -- the arm
 * lying over what is behind it, the job it exists for -- in every outfit, the
 * knight's included, so the measure is the skin, not every pixel.
 *
 *   BT_ARMCAP_DUMP=1  writes each outfit's first frame, as drawn, without the
 *   clones and without the armour's (out/armcapsule-<key>.png, 4x).
 *
 *   node tools/qa/mp/run.mjs armcapsule
 */
import fs from 'node:fs';
import path from 'node:path';
import * as H from './harness.mjs';

const DUMP = !!process.env.BT_ARMCAP_DUMP;
/* the hand: bare in every outfit but the knight's, and lying over the blade's
   grip on purpose (the capsule's job) -- a few pixels of skin a frame */
const HAND_SKIN = 16;

const OUTFITS = [
  { key: 'a', label: 'copper torso alone', chest: 'copperplate', legs: 'none', knight: false },
  { key: 'b', label: 'copper torso + iron greaves', chest: 'copperplate', legs: 'irongreaves', knight: false },
  { key: 'c', label: 'black steel torso + copper greaves', chest: 'blacksteelplate', legs: 'coppergreaves', knight: false },
  { key: 'd', label: 'full iron set (the knight)', chest: 'ironplate', legs: 'irongreaves', knight: true },
];

/* one held frame: the figure with the capsule's clones as drawn, without any,
   and without the armour's (the old code) -- pixels that differ from "without" */
const measure = (P, dump) => P.page.evaluate((dump) => {
  const d = window._pixiRenderer && window._pixiRenderer.playerDisplayRaw();
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  if (!d || !R) return { why: 'no display' };
  if (d._animPose !== 'jog' || d._animDir !== 'east') return { why: 'not jogging east', pose: d._animPose, dir: d._animDir };
  if (!(d._handArmSprite && d._handArmSprite.visible)) return { why: 'capsule off' };
  const all = [d._handArmSprite, d._handArmShirt, d._handArmLegs, d._handArmChest, d._handArmCape].filter(Boolean);
  const armour = [d._handArmLegs, d._handArmChest].filter(Boolean);
  const vis = all.map((s) => s.visible);
  const ui = d._uiLayer, wc = d._weaponContainer;
  const uiV = ui ? ui.visible : null, wcV = wc ? wc.visible : null;
  if (ui) ui.visible = false;
  if (wc) wc.visible = false;   /* the blade is drawn over the capsule on purpose; it is not under test */
  try {
    const frame = d._spriteBody.getBounds().rectangle;   /* world space */
    const lb = d.getLocalBounds().rectangle;
    const grab = () => R.extract.pixels({ target: d, frame: lb, resolution: 1 });
    const on = grab();
    for (const s of all) s.visible = false;
    const off = grab();
    for (let i = 0; i < all.length; i++) all[i].visible = vis[i];
    for (const s of armour) s.visible = false;
    const old = grab();
    for (let i = 0; i < all.length; i++) all[i].visible = vis[i];
    const differ = (a, b) => {
      let n = 0, skin = 0;
      const A = a.pixels, B = b.pixels;
      for (let i = 0; i < A.length; i += 4) {
        if (A[i + 3] < 20 && B[i + 3] < 20) continue;
        if (Math.abs(A[i] - B[i]) > 24 || Math.abs(A[i + 1] - B[i + 1]) > 24 || Math.abs(A[i + 2] - B[i + 2]) > 24 || Math.abs(A[i + 3] - B[i + 3]) > 24) {
          n++;
          const r = A[i], g = A[i + 1], bb = A[i + 2];
          if (r > 95 && r > g + 18 && g > bb + 8 && r < 245) skin++;
        }
      }
      return { n, skin };
    };
    /* three pictures side by side, 4x, for a look by eye */
    let png = null;
    if (dump) {
      const k = 4, W = on.width, Hh = on.height;
      const cv = document.createElement('canvas'); cv.width = W * 3 * k + 2 * k; cv.height = Hh * k;
      const cx = cv.getContext('2d');
      cx.fillStyle = '#3a6b45'; cx.fillRect(0, 0, cv.width, cv.height);
      [on, off, old].forEach((img, j) => {
        const t = document.createElement('canvas'); t.width = W; t.height = Hh;
        t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(img.pixels), W, Hh), 0, 0);
        cx.imageSmoothingEnabled = false;
        cx.drawImage(t, j * (W * k + k), 0, W * k, Hh * k);
      });
      png = cv.toDataURL('image/png');
    }
    return { frame: d._animFrame, fullset: !!d._fullsetOn, chestClone: !!(d._handArmChest && d._handArmChest.visible),
      legsClone: !!(d._handArmLegs && d._handArmLegs.visible), w: on.width, h: on.height, bodyW: Math.round(frame.width),
      now: differ(on, off), before: differ(old, off), png };
  } catch (e) {
    return { why: 'extract: ' + String(e).slice(0, 120) };
  } finally {
    if (ui) ui.visible = uiV;
    if (wc) wc.visible = wcV;
  }
}, dump);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Plated', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2200);
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  const armed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.rpg) {
      S.rpg.shield = null;
      /* a weapon in hand: the capsule lives inside `if (wpn && !isShielding)` (mp-teeshield) */
      S.rpg.weapon = { name: 'Copper Greatsword', type: 'greatsword', gearBase: 'copper' };
      S.rpg.activeSlot = 'melee';
    }
    return { weapon: S && S.rpg && S.rpg.weapon && S.rpg.weapon.type, gear: !!window.__btGearSet };
  });
  rec.ok('setup: a greatsword in hand, no shield, the gear store there (guard)', armed.weapon === 'greatsword' && armed.gear, armed);

  for (const o of OUTFITS) {
    await P.page.evaluate((o) => {
      window.__btGearSet('shirt', 'none');
      window.__btGearSet('chest', o.chest);
      window.__btGearSet('legs', o.legs);
    }, o);
    await P.page.waitForTimeout(1800);   /* the masked bakes for the new outfit */
    await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
    await P.page.waitForTimeout(400);
    const got = [];
    await P.page.keyboard.down('d');
    await P.page.waitForTimeout(400);
    for (let i = 0; i < 40 && got.length < 8; i++) {
      const m = await measure(P, DUMP && !got.length);
      if (m && m.now) {
        if (m.png) {
          const out = path.join(path.dirname(new URL(import.meta.url).pathname), 'out', `armcapsule-${o.key}.png`);
          try { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(m.png.split(',')[1], 'base64')); console.log('    wrote ' + out); } catch (e) { console.log('    dump failed: ' + e); }
        }
        delete m.png;
        if (!got.some((g) => g.frame === m.frame)) got.push(m);
      }
      else if (m && m.why === 'not jogging east' && i % 6 === 5) {
        await P.page.keyboard.up('d');
        await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
        await P.page.keyboard.down('d');
      }
      await P.page.waitForTimeout(140);
    }
    await P.page.keyboard.up('d');
    await P.page.waitForTimeout(300);
    const now = got.map((g) => g.now.n), before = got.map((g) => g.before.n);
    const skinNow = got.map((g) => g.now.skin), skinBefore = got.map((g) => g.before.skin);
    const maxSkin = skinNow.length ? Math.max(...skinNow) : -1;
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    console.log(`    ${o.label}: frames ${JSON.stringify(got.map((g) => g.frame))}, knight ${got.map((g) => g.fullset ? 1 : 0).join('')}, `
      + `changed now ${JSON.stringify(now)} (skin ${JSON.stringify(skinNow)}), without the armour's clones ${JSON.stringify(before)} (skin ${JSON.stringify(skinBefore)})`);
    if (o.knight) {
      rec.ok(`${o.key}. ${o.label}: jogs as the knight, no armour clone needed, the armour's clones change nothing and no skin is laid over it (${maxSkin} px at most over ${got.length} frames)`,
        got.length >= 3 && got.every((g) => g.fullset && !g.chestClone && !g.legsClone && g.now.n === g.before.n) && maxSkin <= 4, got);
    } else {
      rec.ok(`${o.key}. ${o.label}: the capsule lays the plate back over its own arm -- at most ${maxSkin} px of skin a frame, the hand (${sum(skinNow)} over ${got.length} frames; without the armour's clones, as before this version, ${sum(skinBefore)}: the bare arm over the plate)`,
        got.length >= 3 && got.every((g) => !g.fullset && g.chestClone) && maxSkin <= HAND_SKIN
          && sum(skinBefore) > 40 * got.length && sum(skinNow) * 5 < sum(skinBefore), got);
    }
  }
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
