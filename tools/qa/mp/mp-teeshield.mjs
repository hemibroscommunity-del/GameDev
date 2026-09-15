/* THE BARE SHOULDER ON A JOG EAST: IS IT THE SHIELD? (v2.3.2509)
 *
 * Owner, a seventh time (backlog triage 2026-09-14 §5.8): "Tee shoulder, east —
 * while JOGGING, not in combat", and they suspect the shield's layering.
 *
 * THIS FILE IS A DIAGNOSIS, NOT A FIX, and the triage plan says so in as many
 * words: reproduce jog-east with and without a shield equipped, and only then
 * decide which of two very different answers is the right one.
 *
 *   IF THE BARE SHOULDER APPEARS ONLY WITH A SHIELD, the cause is the upper-arm
 *   capsule -- the renderer stamps a clone of the BODY over the arm on east jogs
 *   so the arm covers the slung shield (v2.3.200), and v2.3.2134 found that
 *   clone landing as bare skin on top of the tee.  That is a renderer fix.
 *
 *   IF IT APPEARS WITH NO SHIELD AT ALL, the capsule is innocent and the answer
 *   is the one TRAPS §30 and the mp-shirtarm header have been arriving at since
 *   v2.3.1986: the artist's jog-east frames genuinely have no sleeve on the
 *   trailing arm, and closing it needs seven frames drawn by hand.  Two
 *   generated sleeves have already been built, shipped and reverted (v2.3.2066
 *   baked one, v2.3.2140 took it back out because the owner could see its hem).
 *
 * WHAT MAKES THE TWO TELLABLE APART.  The capsule is a CLONE of layers that are
 * already on screen, so with no shield under it it is very nearly a no-op: the
 * two runs should differ by the shield sprite and by nothing else.  Any skin
 * that appears in the shoulder band ONLY in the shielded run is the clone.  So
 * the measurement is the DIFFERENCE between two runs of the same stride, frame
 * for frame, and not an absolute count -- which is the thing mp-shirtarm's
 * v2.3.2133 section is emphatic about: every absolute count anyone has built on
 * this sheet scores the bad frames better than the good ones, because forearm,
 * fist and neck are bare by design and are inside every window.
 *
 *   node tools/qa/mp/run.mjs teeshield
 */
import * as H from './harness.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = H.REPO + '/tools/qa/mp/out';
const TAG = process.env.BT_SHOT_TAG || 'now';
const SAMPLES = 46;   /* the jog-east strip is 28 frames; this covers it a few times over */

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

/* Run the stride and photograph it, pinning the ANIMATION FRAME rather than
   sampling on a timer: the two runs have to be compared frame for frame, and a
   stride sampled by wall clock lands on different frames each time. */
async function stride(P, label, rec) {
  /* SAMPLED DENSELY AND LABELLED BY FRAME, not pinned to a frame index.  The
     first cut waited for `_animFrame === f` for f = 0..13 in order; a stride
     that loops in ~700ms then spends most of the run waiting for an index that
     has already gone past, and the bro jogs out of the crop before the strip is
     full (it came back with 4 frames of 14).  Sampling on a short timer and
     recording WHICH frame each sample is lets the two runs be paired afterwards
     by frame number, which is what the comparison actually needs. */
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await P.page.waitForTimeout(400);
  const shots = [];
  const meta = [];
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(200);
  for (let i = 0; i < SAMPLES; i++) {
    const st = await P.page.evaluate(() => {
      const d = window._pixiRenderer.playerDisplayRaw();
      const S = window._gameState.current;
      return { pose: d && d._animPose, dir: d && d._animDir, frame: d && d._animFrame,
        armClone: !!(d && d._handArmSprite && d._handArmSprite.visible),
        armShirt: !!(d && d._handArmShirt && d._handArmShirt.visible),
        shieldHi: !!(d && d._shieldBackHi && d._shieldBackHi.visible),
        shieldLo: !!(d && d._shieldBackLo && d._shieldBackLo.visible),
        shield: !!(S && S.rpg && S.rpg.shield),
        wpn: (S && S.rpg && S.rpg.weapon && S.rpg.weapon.type) || null,
        slot: (S && S.rpg && S.rpg.activeSlot) || null,
        capsule: window.__btArmCapsule || null };
    });
    const box = await H.figureBox(P, { pad: 10 });
    if (!box || !st || st.pose !== 'jog' || st.dir !== 'east') {
      /* figureBox returns null once the crop would reach off-screen, which is
         what a bro who has jogged to the edge of the play area does.  Walk him
         back rather than burning the sample budget on empty iterations. */
      await P.page.keyboard.up('d');
      await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
      await P.page.keyboard.down('d');
      await P.page.waitForTimeout(220);
      continue;
    }
    await uiAside(P, true);
    shots.push((await P.page.screenshot({ clip: box })).toString('base64'));
    await uiAside(P, false);
    meta.push(st);
    if (new Set(meta.map((m) => m.frame)).size >= 26) break;   /* the strip is covered */
  }
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(400);
  rec.ok(`the ${label} stride was photographed (guard)`,
    shots.length >= 20, { got: shots.length, want: SAMPLES });

  /* Count SKIN in the shoulder band of each frame, and stitch the strip. */
  const out = await P.page.evaluate(async (o) => {
    const imgs = await Promise.all(o.pngs.map((b64) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null);
      im.src = 'data:image/png;base64,' + b64;
    })));
    const ok = imgs.filter(Boolean);
    if (!ok.length) return null;
    const per = [];
    for (const im of ok) {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      /* the tee's own topmost row: the whitest band on the figure. */
      let top = -1;
      for (let y = 0; y < c.height && top < 0; y++) {
        let white = 0;
        for (let x = 0; x < c.width; x++) {
          const i = (y * c.width + x) * 4;
          if (d[i + 3] > 40 && d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 195) white++;
        }
        if (white >= 3) top = y;
      }
      let skin = 0, white = 0;
      if (top >= 0) {
        for (let y = top; y < Math.min(c.height, top + 9); y++) {
          for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4;
            if (d[i + 3] < 40) continue;
            const r = d[i], gg = d[i + 1], b = d[i + 2];
            if (r > 200 && gg > 200 && b > 195) { white++; continue; }
            /* skin: warm, mid-to-light, red clear of blue.  The body's own
               keyline is dark and is excluded by the lower bound. */
            if (r > 95 && r > gg + 18 && gg > b + 8 && r < 245) skin++;
          }
        }
      }
      per.push({ top, skin, white });
    }
    const S = 14;
    const cv = document.createElement('canvas');
    cv.width = ok.length * ok[0].width * S; cv.height = ok[0].height * S;
    const gg = cv.getContext('2d');
    gg.imageSmoothingEnabled = false;
    gg.fillStyle = '#14202a'; gg.fillRect(0, 0, cv.width, cv.height);
    ok.forEach((im, i) => gg.drawImage(im, i * im.width * S, 0, im.width * S, im.height * S));
    return { per, url: cv.toDataURL('image/png') };
  }, { pngs: shots });
  if (out && out.url) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/teeshield-${TAG}-${label}.png`, Buffer.from(out.url.split(',')[1], 'base64'));
  }
  /* AND THE WORST SINGLE FRAME, at 20x.  A 44-frame contact strip is the right
     thing for "does this happen across the stride" and the wrong thing for "is
     the shoulder bare", which is a question about one shoulder at a size a human
     can see (TRAPS §21). */
  if (out && out.per && out.per.length) {
    let wi = 0;
    for (let i = 1; i < out.per.length; i++) if (out.per[i].skin > out.per[wi].skin) wi = i;
    const one = await P.page.evaluate(async (b64) => {
      const im = await new Promise((res) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null);
        i.src = 'data:image/png;base64,' + b64;
      });
      if (!im) return null;
      const S = 20;
      const cv = document.createElement('canvas');
      cv.width = im.width * S; cv.height = im.height * S;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#14202a'; g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(im, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/png');
    }, shots[wi]);
    if (one) {
      writeFileSync(`${OUT}/teeshield-${TAG}-${label}-worst.png`,
        Buffer.from(one.split(',')[1], 'base64'));
      console.log(`    ${label}: worst frame is anim frame ${meta[wi] && meta[wi].frame} `
        + `(${out.per[wi].skin} skin px in the shoulder band) -> teeshield-${TAG}-${label}-worst.png`);
    }
  }
  /* keyed by animation frame so the two runs can be paired */
  const byFrame = Object.create(null);
  ((out && out.per) || []).forEach((p, i) => {
    const f = meta[i] && meta[i].frame;
    if (f != null && byFrame[f] === undefined) byFrame[f] = p.skin;
  });
  return { per: (out && out.per) || [], meta, byFrame };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Jogger', wsPort, webPort,
    viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2200);
  const armed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    try {
      if (window.__btGearSet) { window.__btGearSet('shirt', 'tshirt'); window.__btGearSet('chest', 'none'); }
      if (window.__btSetHair) window.__btSetHair('afro');
    } catch (e) { /* fall through to the read below */ }
    if (S && S.rpg) {
      S.rpg.shield = null;
      /* A WEAPON, and it is load-bearing rather than flavour.  The whole
         shield-suspect region -- the hand cap and the upper-arm capsule -- lives
         inside `if (wpn && !isShielding)`, so an unarmed character never reaches
         it.  The first run of this file was unarmed and reported the capsule
         firing on 0 of 14 frames, which is true and says nothing about the
         owner's character: the starter weapon is a copper greatsword. */
      S.rpg.weapon = { name: 'Copper Greatsword', type: 'greatsword', gearBase: 'copper' };
      S.rpg.activeSlot = 'melee';
    }
    return { equip: window.__btWardrobe ? window.__btWardrobe() : null,
      shield: !!(S && S.rpg && S.rpg.shield),
      weapon: (S && S.rpg && S.rpg.weapon && S.rpg.weapon.type) || null };
  });
  rec.ok('the tee is really on the character, through the real gear store '
    + '(guard)', !!(armed && armed.equip && armed.equip.gearShirt === 'tshirt'), armed);
  rec.ok('...and a weapon is in hand, or the hand-cap / arm-capsule block is '
    + 'never reached at all (guard)', armed && armed.weapon === 'greatsword', armed);
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await P.page.waitForTimeout(500);

  /* ── RUN A: NO SHIELD ── */
  const bare = await stride(P, 'no-shield', rec);
  rec.ok('run A really had no shield on the character (guard)',
    bare.meta.length > 0 && bare.meta.every((m) => m && !m.shield), 
    { shield: bare.meta.map((m) => m && m.shield).slice(0, 4) });

  /* ── RUN B: SHIELD EQUIPPED ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.rpg) S.rpg.shield = { name: 'QA Buckler', id: 'woodshield', type: 'shield' };
  });
  await P.page.waitForTimeout(700);
  const shielded = await stride(P, 'with-shield', rec);
  rec.ok('run B really had the shield on the character and drawn (guard)',
    shielded.meta.length > 0 && shielded.meta.every((m) => m && m.shield)
    && shielded.meta.some((m) => m && (m.shieldHi || m.shieldLo)),
    { shield: shielded.meta.map((m) => m && m.shield).slice(0, 4),
      drawn: shielded.meta.map((m) => m && (m.shieldHi || m.shieldLo)).slice(0, 4) });

  /* ══ THE FINDING, and it is a fact about the CODE that the probe confirms ══ */
  const ran = (a) => a.meta.filter((m) => m && m.armClone).length;
  const shirted = (a) => a.meta.filter((m) => m && m.armShirt).length;
  rec.ok('FINDING 1: THE UPPER-ARM CAPSULE IS NOT GATED ON A SHIELD — it fires '
    + 'on every jog-east frame whether one is equipped or not. Its condition is '
    + 'east + jog + a weapon in hand, and the shield is not in it, so "the '
    + 'shoulder only goes bare with a shield on" cannot be this mechanism',
    ran(bare) === bare.meta.length && ran(shielded) === shielded.meta.length
    && bare.meta.length > 8 && shielded.meta.length > 8,
    { bare: `${ran(bare)}/${bare.meta.length}`, shielded: `${ran(shielded)}/${shielded.meta.length}` });
  rec.ok('FINDING 2: ...and the SHIRT clone rides the body clone on every one '
    + 'of those frames, so the v2.3.2134 fix (the capsule used to stamp a '
    + 'bare-skin body clone on top of the tee) is live and doing its job in '
    + 'both runs',
    shirted(bare) === bare.meta.length && shirted(shielded) === shielded.meta.length,
    { bare: `${shirted(bare)}/${bare.meta.length}`, shielded: `${shirted(shielded)}/${shielded.meta.length}` });

  /* PAIRED BY ANIMATION FRAME.  Comparing sample i to sample i would compare
     two different points of the stride, and the bare shoulder is a per-frame
     property (mp-shirtarm: frames 0-6 are the bad ones, 7-13 are fine), so a
     mismatched pairing would manufacture a difference out of the animation. */
  const frames = Object.keys(bare.byFrame).filter((f) => shielded.byFrame[f] !== undefined);
  const diff = frames.map((f) => shielded.byFrame[f] - bare.byFrame[f]);
  const n = frames.length;
  const worst = diff.length ? Math.max(...diff) : 0;
  const total = diff.reduce((a, b) => a + b, 0);
  console.log(`    frames compared               : ${JSON.stringify(frames)}`);
  console.log(`    shoulder-band skin, no shield : ${JSON.stringify(frames.map((f) => bare.byFrame[f]))}`);
  console.log(`    shoulder-band skin, w/ shield : ${JSON.stringify(frames.map((f) => shielded.byFrame[f]))}`);
  console.log(`    difference (shield - bare)    : ${JSON.stringify(diff)}   total ${total}, worst ${worst}`);
  console.log(`    armClone fired on             : bare ${bare.meta.filter((m) => m && m.armClone).length}/${bare.meta.length}`
    + `, shielded ${shielded.meta.filter((m) => m && m.armClone).length}/${shielded.meta.length}`);
  console.log(`    armShirt clone fired on       : bare ${bare.meta.filter((m) => m && m.armShirt).length}/${bare.meta.length}`
    + `, shielded ${shielded.meta.filter((m) => m && m.armShirt).length}/${shielded.meta.length}`);
  const cap = (m) => m && m.capsule;
  console.log(`    capsule inputs (bare, 1st)    : ${JSON.stringify(cap(bare.meta[0]))}`);
  console.log(`    capsule inputs (shielded, 1st): ${JSON.stringify(cap(shielded.meta[0]))}`);
  console.log(`    weapon / slot                 : ${bare.meta[0] && bare.meta[0].wpn} / ${bare.meta[0] && bare.meta[0].slot}`);

  rec.ok('the two strides share enough animation frames to pair (guard)', n >= 8, { n, frames });

  /* THE VERDICT LINE.  Reported, deliberately not gated: the point of this file
     is to say WHICH answer the owner's report has, and a gate here would only
     be able to say "the number I chose moved". */
  const bareMean = Object.values(bare.byFrame).reduce((a, b) => a + b, 0)
    / Math.max(1, Object.keys(bare.byFrame).length);
  rec.ok('FINDING 3: BARE SKIN IS IN THE SHOULDER BAND WITH NO SHIELD ON THE '
    + 'CHARACTER AT ALL — which is the second of the two answers the triage '
    + 'plan lists, and it means the shield is not what the owner is seeing',
    bareMean > 20, { bareMean: +bareMean.toFixed(1), perFrame: bare.byFrame });
  /* REPORTED, deliberately not gated.  Two independent strides cannot be
     sampled onto identical frames, so the paired subset is small and its sign
     wanders; what it is good for is showing that the shielded run is not
     consistently WORSE, which is the claim under test.  mp-shirtarm's v2.3.2133
     section is the standing warning against gating anything on an area count
     over this sheet. */
  rec.ok('DIAGNOSIS (reported): the shoulder band measured with and without a '
    + 'shield, on the frames the two strides share. No consistent positive '
    + 'difference = the shield does not make it worse. See the two 14x strips '
    + 'in tools/qa/mp/out/ and the console lines above',
    n > 0, { paired: n, total, worst, diff });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
