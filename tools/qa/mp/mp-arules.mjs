/* THE SPRITE-ART RULE FIXES, PHOTOGRAPHED AND MEASURED (v2.3.2509).
 *
 * Five owner reports from the 2026-09-14 backlog triage (§5.8 D6, §5.8 D7, and
 * art items 8, 9, 10) are all the same KIND of bug: the art is right and a
 * placement rule in the renderer puts it in the wrong place or takes it away.
 * None of them needs a sheet redrawn.  This file is the evidence for all five.
 *
 * WHY ONE SCENARIO AND NOT FIVE.  Every case here costs the same 40-second
 * loading screen (the animation-preloading law, working as intended), and the
 * box has four vCPUs -- CLAUDE.md is explicit that one browser harness at a
 * time is the budget.  Five files would be five workers and five Chromiums for
 * assertions that share one character wearing one cape.
 *
 * EVERY CASE PHOTOGRAPHS AS WELL AS ASSERTS, and that is not decoration.
 * docs/TRAPS.md §21 is the standing rule that art is never signed off by eye,
 * and the mp-shirtarm header is four versions of what happens when a number is
 * trusted that cannot see the defect: the scenario stays green while the owner
 * reports the same bug a sixth time.  So each case writes a 20x crop to
 * tools/qa/mp/out/ and the assertion beside it names what to look for.
 *
 *   node tools/qa/mp/run.mjs arules
 */
import * as H from './harness.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = H.REPO + '/tools/qa/mp/out';
const TAG = process.env.BT_SHOT_TAG || 'now';

/* The cape is the SERVER's to give: seeding bt_cape alone leaves the character
   bare, which is how a cape scenario can pass every z-order claim about a cape
   that is not there.  Same grant + redeem + equip path mp-cape and mp-capeattack
   walk, kept here rather than imported because those files own their own. */
async function wearCape(P, wsPort, rec) {
  const pid = await P.page.evaluate(
    () => (window._gameState && window._gameState.current && window._gameState.current.myId) || null);
  rec.ok('the player has an id to grant the cape against (guard)', !!pid, { pid });
  await H.grant(wsPort, pid, 'item', { invKey: 'goldticket_crimson', count: 1 }).catch(() => null);
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) {
      S.channel.send({ type: 'cape_redeem',
        payload: { invKey: 'goldticket_crimson', opId: 'mp-arules-' + Date.now() } });
    }
  });
  await P.page.waitForTimeout(2500);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'cape_equip', payload: { worn: true } });
  });
  await P.page.waitForTimeout(2000);
  return pid;
}

/* The walking cape, read off the LIVE sprites.  __btCapeHair is the existing
   v2.3.2153 probe and it exists because that bug passed every scene-graph
   assertion while drawing nothing: a cached snapshot reports on the placement
   that was intended, not on the frame that was painted. */
const capeState = (P) => P.page.evaluate(() => {
  const d = window._pixiRenderer.playerDisplayRaw ? window._pixiRenderer.playerDisplayRaw() : null;
  const ch = window.__btCapeHair ? window.__btCapeHair() : null;
  return {
    pose: d && d._animPose, dir: d && d._animDir, frame: d && d._animFrame,
    bodyVisible: !!(d && d._spriteBody && d._spriteBody.visible),
    southTop: !!(d && d._southTop && d._southTop.visible),
    capeBack: !!(ch && ch.capeBackOn), capeFront: !!(ch && ch.capeFrontOn),
    weapon: window.__btWeapon ? {
      visible: window.__btWeapon.visible, wcIdx: window.__btWeapon.wcIdx,
      bodyIdx: window.__btWeapon.spriteBodyIdx, facing: window.__btWeapon.facing,
      facingSrc: (window._gameState.current || {})._facingSrc || null,
    } : null,
    standIn: window.__btStandInCape ? window.__btStandInCape() : null,
  };
});

/* A 20x nearest-neighbour blow-up of the figure, written where a human can open
   it.  20x because TRAPS §21's rule is the owner's -- these are decided on a
   render, and at 1x a cape hem is three pixels. */
/* Shoot on a CONDITION, not on a timer.  A roll is ~500ms and a node round trip
   is ~20ms, so polling for the pose and firing on it is reliable where
   `waitForTimeout(160)` is a coin flip -- the first cut of this file
   photographed a standing character and filed it as "the roll". */
async function shotWhen(P, tag, rec, probe, pred, { tries = 40, gap = 25, pad = 8 } = {}) {
  for (let i = 0; i < tries; i++) {
    const st = await probe(P);
    if (pred(st)) { const ok = await shot(P, tag, rec, { pad }); return ok ? st : null; }
    await P.page.waitForTimeout(gap);
  }
  rec.ok(`the "${tag}" frame was reached to photograph it (guard)`, false, { tries });
  return null;
}

/* THE DOM GETS OUT OF THE WAY FOR THE PHOTOGRAPH.
   page.screenshot composites the whole page, so a tutorial card or an ability
   tooltip that happens to be open lands ON TOP of the character -- measured:
   three of the greatsword crops came back as a wall of white UI text with the
   bro somewhere behind it.  Every ancestor of the world canvas keeps its
   siblings, so this hides the overlays without touching layout (visibility, not
   display) and puts them straight back. */
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

async function shot(P, tag, rec, { pad = 8 } = {}) {
  const box = await H.figureBox(P, { pad });
  if (!box) { rec.ok(`a crop of the figure for "${tag}" (guard)`, false, { box: null }); return false; }
  await uiAside(P, true);
  const png = await P.page.screenshot({ clip: box });
  await uiAside(P, false);
  const big = await P.page.evaluate(async (b64) => {
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
  }, png.toString('base64'));
  if (!big) { rec.ok(`a 20x render for "${tag}" (guard)`, false, {}); return false; }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/arules-${TAG}-${tag}.png`, Buffer.from(big.split(',')[1], 'base64'));
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Caper', wsPort, webPort,
    viewport: { width: 390, height: 844 },
    init: () => { try { localStorage.setItem('bt-hair', 'afro'); } catch (e) { /* bald is still a run */ } } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);
  await wearCape(P, wsPort, rec);
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await P.page.waitForTimeout(600);

  /* ── THE CONTROL, taken first ──
     Every "the cape is gone" claim below is worthless without a frame where it
     is plainly there, on this character, in this session.  This is also what
     catches a grant that silently failed. */
  await P.page.keyboard.down('s'); await P.page.waitForTimeout(400);
  await P.page.keyboard.up('s'); await P.page.waitForTimeout(900);
  const standing = await capeState(P);
  await shot(P, 'control-stand-south', rec);
  rec.ok('CONTROL: the cape is on the character standing south, so every '
    + '"it is hidden" claim below is about a cape that exists',
    !!(standing.capeFront || standing.capeBack) && standing.pose === 'stand', standing);

  /* ══ D6, half one: THE ROLL ══ */
  const rollSamples = await P.page.evaluate(async () => {
    const out = [];
    window._gameFns.contextualDodge(0);
    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        const d = window._pixiRenderer.playerDisplayRaw();
        const ch = window.__btCapeHair ? window.__btCapeHair() : null;
        out.push({ pose: d && d._animPose,
          capeBack: !!(ch && ch.capeBackOn), capeFront: !!(ch && ch.capeFrontOn) });
        if (performance.now() - t0 > 800) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return out;
  });
  const rolling = rollSamples.filter((s) => s.pose === 'dodge');
  rec.ok('the roll actually played, so the claim below is about a rolling '
    + 'character (guard)', rolling.length > 0,
    { rolling: rolling.length, poses: [...new Set(rollSamples.map((s) => s.pose))] });
  rec.ok('D6a: NO CAPE ON THE ROLL — not one frame of the dodge draws either '
    + 'half of it (v2.3.2129 had it riding the tumble, hanging in mid-air while '
    + 'the bro crouched)',
    rolling.length > 0 && rolling.every((s) => !s.capeBack && !s.capeFront),
    { frames: rolling.length, drawn: rolling.filter((s) => s.capeBack || s.capeFront).length });

  /* Photographed mid-roll: the assertion says "no sprite", the picture says
     "and the figure still reads as a bro tucking into a roll". */
  await P.page.evaluate(() => { window._gameFns.contextualDodge(Math.PI / 2); });
  await shotWhen(P, 'roll', rec, capeState, (st) => st.pose === 'dodge');
  await P.page.waitForTimeout(900);

  /* ══ D6, half two: THE LOOT BEND ══
     Driven through the renderer's own gate rather than by dropping real loot:
     `_lootFreezeUntil` is the ONLY thing that selects the pickup pose
     (entityRenderer ~9789), and a scenario that walked a pile would be testing
     groundLoot -- lane L's file -- to get at a z-order rule here. */
  const bend = await P.page.evaluate(async () => {
    const S = window._gameState.current;
    S._lootFreezeUntil = Date.now() + 1400;
    const out = [];
    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        const d = window._pixiRenderer.playerDisplayRaw();
        const ch = window.__btCapeHair ? window.__btCapeHair() : null;
        out.push({ pose: d && d._animPose,
          capeBack: !!(ch && ch.capeBackOn), capeFront: !!(ch && ch.capeFrontOn) });
        if (performance.now() - t0 > 1000) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return out;
  });
  const bending = bend.filter((s) => s.pose === 'pickup');
  rec.ok('the loot bend actually played (guard)', bending.length > 0,
    { bending: bending.length, poses: [...new Set(bend.map((s) => s.pose))] });
  rec.ok('D6b: NO CAPE ON THE LOOT BEND — the owner asked for the roll '
    + '"INCLUDING the loot bend", and `pickup` is a separate pose string from '
    + '`dodge`, so naming only the roll would have left this exactly as reported',
    bending.length > 0 && bending.every((s) => !s.capeBack && !s.capeFront),
    { frames: bending.length, drawn: bending.filter((s) => s.capeBack || s.capeFront).length });
  await P.page.evaluate(() => { window._gameState.current._lootFreezeUntil = Date.now() + 2500; });
  await shotWhen(P, 'loot-bend', rec, capeState, (st) => st.pose === 'pickup');
  await P.page.evaluate(() => { window._gameState.current._lootFreezeUntil = 0; });
  await P.page.waitForTimeout(600);

  /* ══ THE CAPE IS NOT SIMPLY OFF NOW ══
     A one-line table edit that hid the cape everywhere would pass both claims
     above.  This is the claim that costs it. */
  await P.page.keyboard.down('s'); await P.page.waitForTimeout(500);
  const jogging = await capeState(P);
  await shot(P, 'jog-south-cape-on', rec);
  await P.page.keyboard.up('s'); await P.page.waitForTimeout(500);
  rec.ok('...and the cape is STILL THERE on an ordinary jog — the two poses '
    + 'above are hidden, the wardrobe is not',
    !!(jogging.capeFront || jogging.capeBack), jogging);

  /* ══ ITEM 9: THE SOUTH SHIELD BLOCK KEEPS THE CAPE ══
     South is the ONE facing that blocks on the real body (the bow stand-in's
     south frames are holed through the face, v2.3.1805).  Moving with the
     shield up there, _placeSouthBlockLegs splits the figure into a frozen
     standing top band and a striding jog band and hides the body sprite so it
     cannot draw a second pair of legs -- and _placeCape, reading `sb.visible`,
     concluded the character was not on screen. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg) S.rpg.shield = S.rpg.shield || { name: 'QA Buckler', id: 'woodshield' };
  });
  await P.page.waitForTimeout(400);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._shieldUp = true; S.lockedTarget = null;
  });
  await P.page.keyboard.down('s');
  const blocked = await shotWhen(P, 'south-block-moving', rec, capeState,
    (st) => st.southTop === true, { tries: 60 });
  await P.page.keyboard.up('s');
  await P.page.evaluate(() => { window._gameState.current._shieldUp = false; });
  await P.page.waitForTimeout(500);
  rec.ok('the south block really was on the BAND COMPOSITE — body sprite '
    + 'hidden, frozen top band drawn (guard; without this the claim below is '
    + 'about an ordinary jog)',
    !!(blocked && blocked.southTop && blocked.bodyVisible === false), blocked);
  rec.ok('ITEM 9: THE CAPE SURVIVES THE SOUTH SHIELD BLOCK — it is seated from '
    + 'the band composite now instead of bailing on a body sprite that is '
    + 'hidden only so it cannot draw a second pair of legs',
    !!(blocked && (blocked.capeFront || blocked.capeBack)), blocked);

  /* ══ D7: THE GREATSWORD AT SOUTHWEST ══
     Two halves, and the report is about both: the carried blade on jog/idle
     (entityRenderer's heldWeaponInFront) and the SWUNG blade (effectsRenderer's
     _orderSwingWeapon).  Southeast and east are the control -- the owner's
     answer names them as unchanged, and a fix that swept them along would be
     the v2.3.1787 mistake in the other direction. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.weapon = { name: 'Copper Greatsword', type: 'greatsword', gearBase: 'copper' };
    S.rpg.activeSlot = 'melee';
  });
  await P.page.waitForTimeout(500);

  /* PINNED EVERY FRAME, not written once.  The facing resolver has a whole
     ladder of sources (bash > shield > aim > stick > moving > facingAngle,
     v2.3.1807) and the resting angle SLEWS toward its target, so a single write
     is overtaken before the next read -- measured: a southwest write read back
     as 'south'.  `_facingSrc` comes back with every sample so a facing that
     came from the wrong branch says so in one word rather than looking like a
     broken z-order rule. */
  await P.page.evaluate(() => {
    window.__pinFace = { a: null };
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      const p = window.__pinFace;
      if (S && p && p.a !== null) {
        S._facingAngle = p.a; S._targetFacingAngle = p.a;
        S._aimAngle = p.a; S._mouseAimAngle = p.a;
        if (S.player) { S.player.vx = 0; S.player.vy = 0; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const faceAndRead = async (ang, tag) => {
    await P.page.evaluate((a) => { window.__pinFace = { a }; }, ang);
    await P.page.waitForTimeout(600);
    const st = await capeState(P);
    await shot(P, `greatsword-${tag}`, rec, { pad: 26 });
    return st;
  };
  /* Sector 3 is southwest, 1 is southeast, 0 is east (SECTORS8). */
  const gsSW = await faceAndRead(3 * Math.PI / 4, 'carry-southwest');
  const gsSE = await faceAndRead(1 * Math.PI / 4, 'carry-southeast');
  const gsE  = await faceAndRead(0, 'carry-east');
  const zOf = (st) => (st && st.weapon && st.weapon.wcIdx >= 0 && st.weapon.bodyIdx >= 0)
    ? (st.weapon.wcIdx > st.weapon.bodyIdx ? 'front' : 'behind') : null;
  console.log(`    carried greatsword z-order: SW=${zOf(gsSW)} (facing `
    + `${gsSW && gsSW.weapon && gsSW.weapon.facing}/${gsSW && gsSW.weapon && gsSW.weapon.facingSrc}), `
    + `SE=${zOf(gsSE)} (${gsSE && gsSE.weapon && gsSE.weapon.facing}), `
    + `E=${zOf(gsE)} (${gsE && gsE.weapon && gsE.weapon.facing})`);
  rec.ok('all three carry facings reported a weapon z-order (guard)',
    [gsSW, gsSE, gsE].every((st) => zOf(st) !== null),
    { sw: zOf(gsSW), se: zOf(gsSE), east: zOf(gsE),
      facings: [gsSW, gsSE, gsE].map((st) => st && st.weapon && st.weapon.facing) });
  rec.ok('the three carry samples really were taken at southwest, southeast '
    + 'and east — the facing resolver SLEWS and has six sources, so a pin that '
    + 'silently fell through would make every z-order claim below a claim about '
    + 'the wrong facing (guard)',
    gsSW && gsSW.weapon && gsSW.weapon.facing === 'southwest'
    && gsSE && gsSE.weapon && gsSE.weapon.facing === 'southeast'
    && gsE && gsE.weapon && gsE.weapon.facing === 'east',
    { sw: gsSW && gsSW.weapon && gsSW.weapon.facing, se: gsSE && gsSE.weapon && gsSE.weapon.facing,
      east: gsE && gsE.weapon && gsE.weapon.facing });
  rec.ok('D7a: THE CARRIED GREATSWORD IS BEHIND THE BODY AT SOUTHWEST — it is '
    + 'in the far hand there, so the character occludes it instead of the blade '
    + 'passing through him (this retires the SW half of v2.3.1787)',
    zOf(gsSW) === 'behind', { sw: zOf(gsSW), probe: gsSW && gsSW.weapon });
  rec.ok('D7b: ...and SOUTHEAST AND EAST ARE UNCHANGED, in front, exactly as '
    + 'the owner\'s answer says — the blade is on the camera side on those two',
    zOf(gsSE) === 'front' && zOf(gsE) === 'front',
    { se: zOf(gsSE), east: zOf(gsE) });

  await P.page.evaluate(() => { window.__pinFace = { a: null }; });   /* hand the facing back */

  /* The SWING, pinned frame by frame from inside the page: the window is ~300ms
     and `pose` reads 'stand' throughout it (v2.3.1784), so nothing on the
     player display says an attack is happening.  Same shape mp-capeattack
     settled on, and for the same reason. */
  await P.page.evaluate(() => {
    window.__pinAtk = { i: 0, kind: 'sword', on: false };
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      const p = window.__pinAtk;
      if (S && p && p.on) {
        const a = p.i * Math.PI / 4;
        S._facingAngle = a; S._aimAngle = a; S._mouseAimAngle = a;
        S._shieldKb = false; S.lockedTarget = null;
        if (S.player) { S.player.vx = 0; S.player.vy = 0; }
        if (p.kind === 'sword') { S.isSwinging = true; S.swingTimer = Date.now(); S._swingAng = a; }
        else { S._bowShotAt = Date.now(); S._bowShotAng = a; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const swings = {};
  for (const [tag, i] of [['southwest', 3], ['southeast', 1], ['east', 0]]) {
    await P.page.evaluate((v) => { window.__pinAtk = { i: v, kind: 'sword', on: true }; }, i);
    await P.page.waitForTimeout(700);
    swings[tag] = await P.page.evaluate(() => window.__btSwingZ || null);
    await shot(P, `greatsword-swing-${tag}`, rec, { pad: 26 });
    await P.page.evaluate(() => { window.__pinAtk.on = false; });
    await P.page.waitForTimeout(450);
  }
  const swZ = (r) => (r && r.weaponIdx >= 0 && r.bodyIdx >= 0)
    ? (r.weaponIdx > r.bodyIdx ? 'front' : 'behind') : null;
  console.log(`    swung greatsword z-order: `
    + ['southwest', 'southeast', 'east'].map((k) => `${k}=${swZ(swings[k])}`
      + ` (facing ${swings[k] && swings[k].facing}, swingDir ${swings[k] && swings[k].swingDir}`
      + `, sheet ${swings[k] && swings[k].sheet}${swings[k] && swings[k].mirror ? ' mirrored' : ''})`).join('  '));
  rec.ok('every swing sample was taken on a real stand-in with a drawn blade '
    + '(guard)',
    ['southwest', 'southeast', 'east'].every((k) => swings[k] && swings[k].weaponVisible && swZ(swings[k])),
    Object.fromEntries(Object.entries(swings).map(([k, v]) => [k, v && { facing: v.facing, sheet: v.sheet, z: swZ(v) }])));
  rec.ok('the swing samples really were taken at southwest, southeast and east '
    + '(guard — same slewing resolver)',
    swings.southwest && swings.southwest.facing === 'southwest'
    && swings.southeast && swings.southeast.facing === 'southeast'
    && swings.east && swings.east.facing === 'east',
    Object.fromEntries(Object.entries(swings).map(([k, v]) => [k, v && v.facing])));
  rec.ok('D7c: THE SWUNG GREATSWORD IS ALSO BEHIND AT SOUTHWEST — the owner '
    + 'asked for jog/idle AND the attack swing, and the swing is a separate '
    + 'z-order rule in another file',
    swZ(swings.southwest) === 'behind',
    { southwest: swings.southwest });
  rec.ok('D7d: ...and the swing at SOUTHEAST and EAST still draws in front. '
    + 'This is the claim the sheet key could not satisfy: southwest, southeast '
    + 'and south all map to the SAME south swing sheet, so the rule had to be '
    + 'asked of the true 8-way facing',
    swZ(swings.southeast) === 'front' && swZ(swings.east) === 'front',
    { southeast: swZ(swings.southeast), east: swZ(swings.east) });

  /* ══ ITEM 8: THE CAPE ON THE EAST BOW STAND-IN ══
     Owner: on the east jog bow attack the cape "should drape over the waist,
     not behind".  East is the only PROFILE the stand-ins have, and side-on
     "behind the body" and "behind in the world" stop being the same picture. */
  const standIn = {};
  for (const [tag, kind, i] of [['bow-east', 'bow', 0], ['bow-south', 'bow', 2], ['sword-east', 'sword', 0]]) {
    await P.page.evaluate((v) => { window.__pinAtk = { i: v.i, kind: v.kind, on: true }; }, { i, kind });
    await P.page.waitForTimeout(700);
    standIn[tag] = await P.page.evaluate(() => ({
      cape: window.__btStandInCape ? window.__btStandInCape() : null,
      bodyVisible: (() => {
        const pd = window._pixiRenderer.playerDisplayRaw ? window._pixiRenderer.playerDisplayRaw() : null;
        return !!(pd && pd._spriteBody && pd._spriteBody.visible);
      })(),
    }));
    await shot(P, `standin-cape-${tag}`, rec, { pad: 26 });
    await P.page.evaluate(() => { window.__pinAtk.on = false; });
    await P.page.waitForTimeout(450);
  }
  rec.ok('every stand-in sample was taken with the real body HIDDEN and the '
    + 'cape drawn on the stand-in (guard) — `pose` never says an attack is '
    + 'happening, so this is the only honest gate',
    Object.values(standIn).every((s) => s && s.bodyVisible === false && s.cape && s.cape.on),
    Object.fromEntries(Object.entries(standIn).map(([k, v]) => [k, v && { body: v.bodyVisible, on: v.cape && v.cape.on }])));
  rec.ok('ITEM 8: THE PANELS DRAPE OVER THE WAIST ON THE EAST BOW SHOT — they '
    + 'sit ABOVE the stand-in body there instead of being forced under it',
    !!(standIn['bow-east'] && standIn['bow-east'].cape
       && standIn['bow-east'].cape.overBody === true
       && standIn['bow-east'].cape.backUnderBody === false),
    standIn['bow-east'] && standIn['bow-east'].cape);
  rec.ok('...and EVERY OTHER stand-in keeps the v2.3.2186 split, panels under '
    + 'the body. The exception is keyed by (stand-in, direction), so the south '
    + 'bow shot and the east SWORD swing — which the owner did not report and '
    + 'whose blade sweeps that exact region — are untouched',
    ['bow-south', 'sword-east'].every((k) => standIn[k] && standIn[k].cape
      && standIn[k].cape.overBody === false && standIn[k].cape.backUnderBody === true),
    Object.fromEntries(['bow-south', 'sword-east'].map((k) => [k, standIn[k] && {
      over: standIn[k].cape && standIn[k].cape.overBody,
      under: standIn[k].cape && standIn[k].cape.backUnderBody }])));

  /* ══ ITEM 10: THE CAPE IN THE EQUIPMENT PREVIEW ══
     characterPortrait.js had no cape code at all, so the cosmetic rendered in
     the world and nowhere the player chooses it.  Counted rather than eyeballed:
     the crimson cape is the only deep red on the figure, so "red pixels on the
     preview canvas" separates a drawn cape from a missing one exactly. */
  const portrait = await P.page.evaluate(async () => {
    window.__broDashPanelBus.open('hero');
    await new Promise((r) => setTimeout(r, 1800));
    const cvs = Array.from(document.querySelectorAll('canvas'))
      .filter((c) => c.width > 40 && c.height > 40 && c.getContext('2d'));
    if (!cvs.length) return null;
    const c = cvs[cvs.length - 1];
    let d;
    try { d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; } catch (e) { return null; }
    let red = 0, opaque = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] <= 8) continue;
      opaque++;
      /* the cape's crimson: strongly red-dominant and dark, which nothing else
         on a bro in a white tee and grey-green trousers is. */
      if (d[i] > 90 && d[i] > d[i + 1] * 2 + 20 && d[i] > d[i + 2] * 2 + 20) red++;
    }
    return { red, opaque, w: c.width, h: c.height,
      dir: c.__btDir || null, dataUrl: c.toDataURL('image/png') };
  });
  rec.ok('the equipment preview canvas is readable and has a figure on it '
    + '(guard)', !!(portrait && portrait.opaque > 200),
    portrait && { opaque: portrait.opaque, w: portrait.w, h: portrait.h, dir: portrait.dir });
  if (portrait && portrait.dataUrl) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/arules-${TAG}-portrait.png`,
      Buffer.from(portrait.dataUrl.split(',')[1], 'base64'));
  }
  console.log(`    equipment preview: ${portrait && portrait.red} cape-red px of `
    + `${portrait && portrait.opaque} opaque, facing ${portrait && portrait.dir}`);
  rec.ok('ITEM 10: THE WORN CAPE IS IN THE EQUIPMENT PREVIEW — the screen pins '
    + 'itself to southwest, a SPLIT facing, so the hood draws in front of the '
    + 'skull and the panels behind the torso exactly as they do in the world',
    !!(portrait && portrait.red > 60), portrait && { red: portrait.red, opaque: portrait.opaque });
  rec.ok('...and it is the SOUTHWEST figure that was measured, not a fallback '
    + 'facing (southwest and south are not tellable apart by eye at this size — '
    + 'v2.3.1815 stamped the facing on the canvas for exactly this)',
    !!(portrait && portrait.dir === 'southwest'), portrait && { dir: portrait.dir });

  await P.ctx.close();
}
