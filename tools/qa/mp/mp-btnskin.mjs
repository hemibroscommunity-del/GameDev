/* ═══ mp-btnskin (v2.3.3018): THE TOUCH CONTROLS IN THE OWNER'S MOCKUP'S LOOK ═══
 *
 * Owner: "Make the on screen buttons look more like the improved mockup."
 * (src/ui/panels/controlSkin.jsx -- one skin every control wears.)
 *
 * On a phone, in a fight, with every control on screen:
 *   1. EVERY control wears the skin: the attack disc, Spec, Whirl, Block,
 *      Shield Bash, Sprint, Jump (v2.3.3017's), the weapon button, Element
 *      Burst -- a gold ring (a gradient), and the movement stick its dark
 *      well with four arrows.
 *   2. NO CSS filter or backdrop-filter anywhere in any of them, in any state
 *      (the iOS grain over the WebGL canvas, TRAPS §42).
 *   3. A PICTURE, NOT A WORD: each shows its picture, decoded, and no visible
 *      word -- except where a word is an instruction (the bow's AIM, a
 *      harvest's CHOP); the disc's label still SAYS "ATTACK" in the DOM.
 *   4. The attack disc in a fight is Ready / Charged (hot): the face
 *      see-through, the sword at full strength; with a bow it shows the bow.
 *   5. The mockup's states: Cooldown (a blue arc, the picture grey), Disabled
 *      (no mana, no stamina), the toggles ON (shield up, sprint on) and Jump
 *      in the air lit and glowing, Pressed under a real finger (pushed in).
 *   6. A monster under the disc ghosts it to its outline.
 * Pictures of each state for the owner, portrait and sideways, in
 * tools/qa/mp/out/btnskin-*.png.  BTNSKIN_TAG=before (with QA_DIST pointed at
 * an older build) takes the same pictures of the old look; its assertions then
 * fail, which is the point of them.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUT = `${H.REPO}/tools/qa/mp/out`;
const TAG = process.env.BTNSKIN_TAG || 'after';

const SWORD = { type: 'greatsword', tier: 'common', tierMult: 1.12, gearBase: 'copper', name: 'Copper Great Sword', quality: 'normal', dmg: 5, element1: 'flame' };
const BOW = { type: 'bow', tier: 'common', tierMult: 1.12, gearBase: 'ww_pine', name: 'Pine Bow', quality: 'normal' };
const SHIELD = { type: 'shield', tier: 'common', tierMult: 1, name: 'QA Shield', quality: 'normal' };

/* A real finger (CDP), held until release() -- the browser hit-tests it. */
async function fingerDown(P, x, y, id = 1) {
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id }] });
  return {
    move: (mx, my) => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: mx, y: my, id }] }),
    release: async () => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); },
  };
}

const CONTROLS = {
  disc: '.bt-rjoy-base', special: '[data-special]', whirl: '[data-ability="whirl"]', bash: '[data-ability="bash"]',
  block: '[data-shield]', sprint: '[data-sprint]', weapon: '[data-weapon-chip]', burst: '.bt-burst-btn',
  jump: '[data-jump]',   /* v2.3.3017's JUMP, beneath the disc */
};

const look = (P) => P.page.evaluate((CONTROLS) => {
  const out = { vw: innerWidth, vh: innerHeight };
  const visible = (n) => {
    for (let e = n; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
    }
    return true;
  };
  for (const k of Object.keys(CONTROLS)) {
    const el = document.querySelector(CONTROLS[k]);
    if (!el) { out[k] = null; continue; }
    const r = el.getBoundingClientRect();
    const skin = el.querySelector('.bt-skin');
    const ring = skin && skin.querySelector('.bt-skin-ringc');
    const glow = skin && skin.querySelector('.bt-skin-glow');
    const all = [el, ...el.querySelectorAll('*')];
    const filtered = all.filter((n) => {
      const cs = getComputedStyle(n);
      return (cs.filter && cs.filter !== 'none') || (cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none');
    }).map((n) => String(n.className && n.className.baseVal != null ? n.className.baseVal : n.className));
    const imgs = [...el.querySelectorAll('img')].filter((i) => visible(i));
    const svgs = [...el.querySelectorAll('[data-icon]')].filter((i) => visible(i)).map((i) => i.getAttribute('data-icon'));
    /* every text node a player could actually see */
    const words = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t = tw.nextNode(); t; t = tw.nextNode()) {
      if (t.textContent.trim() && visible(t.parentElement)) words.push(t.textContent.trim());
    }
    out[k] = {
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      shown: visible(el) && r.width > 0,
      state: skin ? skin.getAttribute('data-state') : null, tone: skin ? skin.getAttribute('data-tone') : null,
      ring: ring ? getComputedStyle(ring).stroke : null,
      glowOp: glow ? Number(getComputedStyle(glow).opacity) : null,
      skinTf: skin ? getComputedStyle(skin).transform : null,
      filtered, imgs: imgs.length, imgsOk: imgs.every((i) => i.complete && i.naturalWidth > 0),
      imgSrc: imgs.map((i) => i.getAttribute('src')), svgs, words,
      arc: !!el.querySelector('[data-skin-arc]'), pressed: el.getAttribute('data-pressed'),
      text: el.textContent,
    };
  }
  const d = document.querySelector('.bt-rjoy-base');
  if (d && out.disc) {
    out.disc.rstate = d.getAttribute('data-rstate');
    out.disc.ricon = d.getAttribute('data-ricon');
    out.disc.iconShown = [...d.querySelectorAll('.bt-rjoy-icon')].filter((i) => getComputedStyle(i).display !== 'none').map((i) => i.getAttribute('data-ricon-img'));
    const face = d.querySelector('[data-rbody]');
    out.disc.faceOp = face ? Number(getComputedStyle(face).opacity) : null;
    const knob = d.querySelector('.bt-rjoy-knob');
    out.disc.knobOp = knob ? Number(getComputedStyle(knob).opacity) : null;
    const lbl = d.querySelector('.bt-rjoy-label');
    out.disc.label = lbl ? lbl.textContent : null;
    out.disc.labelOp = lbl ? Number(getComputedStyle(lbl).opacity) : null;
    out.disc.wrapOp = Number(getComputedStyle(d.parentElement).opacity);
    out.disc.orbit = !!d.parentElement.querySelector('.bt-rjoy-orbit');
  }
  const base = document.querySelector('.bt-joystick-base');
  if (base) {
    const cs = getComputedStyle(base);
    out.stick = { bg: cs.backgroundImage, arrows: !!base.querySelector('.bt-joystick-arrows'),
      knobBg: getComputedStyle(base.querySelector('.bt-joystick-knob')).backgroundImage,
      wrapOp: Number(getComputedStyle(base.parentElement).opacity), filter: cs.filter };
  }
  return out;
}, CONTROLS);

async function shot(P, name, h = 380) {
  const vp = P.page.viewportSize();
  const y = Math.max(0, vp.height - h - 260);
  await P.page.screenshot({ path: `${OUT}/btnskin-${TAG}-${name}.png`, clip: { x: 0, y, width: vp.width, height: Math.min(h + 260, vp.height - y) } });
}

/* the fight every control needs: a sword (enchanted, for Element Burst), a
   shield, full bars, and a monster close enough to be locked */
const arm = (P, extra) => P.page.evaluate(({ SWORD, SHIELD, extra }) => {
  const S = window._gameState.current;
  const R = S.rpg;
  R.weapon = Object.assign({}, SWORD);
  R.shield = Object.assign({}, SHIELD);
  R.activeSlot = 'melee';
  R.mana = R.maxMana || 100; R.stamina = R.maxStamina || 100;
  S._serverMonsters = false;
  const mon = (id, dx, dy) => ({
    id, arch: 'fodder', archetype: 'fodder', type: 'fodder',
    x: S.player.x + dx, y: S.player.y + dy, renderX: S.player.x + dx, renderY: S.player.y + dy,
    hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0, spd: 0, vx: 0, vy: 0,
    alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
    respawnAt: 0, moveTimer: 0, _stuckArrows: [],
  });
  /* one close enough to fight, and (for the ghost) one standing under the disc */
  S.monsters = [mon('skin_1', 90, -20)];
  if (extra && extra.under) S.monsters.push(mon('skin_2', extra.under.dx, extra.under.dy));
}, { SWORD, SHIELD, extra });

/* A test seam: pin a field to a getter (writes ignored) until __qaUnpin(),
   which puts back the value it had. */
const installPins = (P) => P.page.evaluate(() => {
  if (window.__qaPin) return;
  const pins = [];
  window.__qaPin = (obj, key, get) => {
    const had = Object.prototype.hasOwnProperty.call(obj, key);
    const was = obj[key];
    Object.defineProperty(obj, key, { configurable: true, enumerable: true, get, set: () => {} });
    pins.push(() => { delete obj[key]; if (had) obj[key] = was; });
  };
  window.__qaUnpin = () => { while (pins.length) pins.pop()(); };
});

/* Wait for the skin's eased changes (the glow's 180ms, the press's 90ms) to
   come to rest: a headless page under load draws a few frames a second, and
   a CSS transition only moves on a frame (TRAPS §44: "a value on its way",
   asserted as an end state). */
const settle = (P) => P.page.evaluate(() => new Promise((resolve) => {
  const t0 = Date.now();
  const tick = () => {
    const running = document.getAnimations().filter((a) => a.playState === 'running'
      && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.bt-skin'));
    if (!running.length || Date.now() - t0 > 2500) return resolve(Date.now() - t0);
    setTimeout(tick, 60);
  };
  setTimeout(tick, 60);
}));

const tapCentre = async (P, sel) => {
  const c = await P.page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!c) return false;
  const f = await fingerDown(P, c.x, c.y, 7);
  await P.page.waitForTimeout(60);
  await f.release();
  return true;
};

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, {
    name: 'Skinner', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 3,
    /* a jump long enough to read in the air on a page drawing a few frames a
       second (mp-jump's habit; 560 ms in the game) */
    query: 'jumpms=1800&jumpbtn',   /* v2.3.3105: the jump button is drawn only with ?jumpbtn */
  });
  /* Closed at the end, whatever happens: a 3x phone page left running keeps
     drawing the game in the background, and every scenario after it starves
     (found the hard way -- joyfade, rbutton and sprint failed their timing
     checks behind one). */
  try {
    await body(P, rec);
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

async function body(P, rec) {
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await arm(P);
  await P.page.waitForTimeout(1200);

  /* ── 1-4: a fight, every control up, a thumb on the movement stick ── */
  const vp0 = P.page.viewportSize();
  const thumb = await fingerDown(P, 70, vp0.height - 330, 3);
  await thumb.move(88, vp0.height - 336);
  await P.page.waitForTimeout(450);
  const A = await look(P);
  await shot(P, 'fight');
  await thumb.release();
  console.log('    BTNSKIN fight: ' + JSON.stringify(A));

  const named = ['disc', 'special', 'whirl', 'block', 'sprint', 'weapon', 'burst', 'jump'];
  for (const k of named) {
    const c = A[k];
    rec.ok(`${k}: on screen in the fight (guard)`, !!(c && c.shown), c);
    if (!c) continue;
    rec.ok(`${k}: wears the skin, its ring painted by one of the skin's gradients`, !!c.state && /url\(["']?#btSkin/.test(c.ring || ''), { state: c.state, ring: c.ring });
    rec.ok(`${k}: no CSS filter anywhere in it (iOS grain, TRAPS §42)`, c.filtered.length === 0, c.filtered);
    rec.ok(`${k}: shows its picture, decoded`, (c.imgs > 0 && c.imgsOk) || c.svgs.length > 0, { imgs: c.imgs, ok: c.imgsOk, svgs: c.svgs, src: c.imgSrc });
    rec.ok(`${k}: no word on it -- a picture, as the mockup draws it`, c.words.length === 0, c.words);
  }
  rec.ok('the movement stick is the mockup\'s dark well with four arrows and a grey thumb (no sprites)',
    !!A.stick && A.stick.arrows && /gradient/.test(A.stick.bg) && /gradient/.test(A.stick.knobBg) && !/webp/.test(A.stick.bg + A.stick.knobBg), A.stick);
  rec.ok('...and it is on screen under the thumb (guard)', !!A.stick && A.stick.wrapOp === 1, A.stick);
  rec.ok('...no CSS filter on it either', !!A.stick && A.stick.filter === 'none', A.stick);
  rec.ok('the attack disc in a fight is hot (Ready / Charged)', A.disc && A.disc.rstate === 'hot', A.disc && A.disc.rstate);
  rec.ok('...its face see-through (~0.45, v2.3.2263) and the sword at full strength',
    A.disc && A.disc.faceOp > 0.2 && A.disc.faceOp < 0.7 && A.disc.knobOp === 1, A.disc && { face: A.disc.faceOp, knob: A.disc.knobOp });
  /* v2.3.3105: the weapon in hand's own bag picture (controlSkin weaponDiscIcon) */
  rec.ok('...the picture is the sword in hand, and only it', A.disc && /^w-(great-)?sword/.test(A.disc.ricon) && A.disc.iconShown.join() === A.disc.ricon, A.disc && A.disc.iconShown);
  rec.ok('...the label still SAYS "ATTACK" for anything reading the page, and is not shown',
    A.disc && A.disc.label === 'ATTACK' && A.disc.labelOp === 0, A.disc && { label: A.disc.label, op: A.disc.labelOp });
  rec.ok('...the glow is lit round it', A.disc && A.disc.glowOp === 1, A.disc && A.disc.glowOp);
  /* v2.3.3105: the orbit is gone -- the owner: "remove the strange lines to
     the left and right of the button" */
  rec.ok('...and no orbit is drawn round it', A.disc && !A.disc.orbit, A.disc);
  rec.ok('Spec, Whirl, Block, Sprint, Jump are Normal when ready', ['special', 'whirl', 'block', 'sprint', 'jump'].every((k) => A[k] && A[k].state === 'normal'),
    ['special', 'whirl', 'block', 'sprint', 'jump'].map((k) => A[k] && A[k].state));
  rec.ok('Jump\'s picture is the mockup\'s blue arrow', A.jump && A.jump.svgs.join() === 'jump', A.jump && A.jump.svgs);

  /* ── 5: the mockup's other states ── */
  const flags = () => P.page.evaluate(() => {
    const S = window._gameState.current;
    return { up: !!S._shieldUp, why: S._shieldDroppedWhy || null, sprint: !!(S._sprint && S._sprint.on), swhy: (S._sprint && S._sprint.why) || null };
  });
  /* Cooldowns and the sprint ON, with the shield DOWN -- the game's own rules
     end a sprint when the guard goes up and hide Spec behind it.  The clocks
     are PINNED while they are read and photographed (a getter per field): a
     3x screenshot takes long enough for a 1.5s cooldown to finish, and a
     sprint standing still ends after 2s. */
  await installPins(P);
  await tapCentre(P, '[data-sprint]');            /* the sprint ON */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._abilCd = S._abilCd || {};
    window.__qaPin(S, '_lastSwipe', () => Date.now() - 500);      /* the special a third through its 1.5s */
    window.__qaPin(S._abilCd, 'whirl', () => Date.now() + 3000);  /* the whirlwind half through its 6s */
    window.__qaPin(S, '_lastBurstAt', () => Date.now() - 1200);
    if (S._sprint) window.__qaPin(S._sprint, 'on', () => true);
  });
  await P.page.waitForTimeout(320);
  await settle(P);
  const B = await look(P);
  await shot(P, 'states');
  await P.page.evaluate(() => window.__qaUnpin());
  console.log('    BTNSKIN states: ' + JSON.stringify(B) + ' ' + JSON.stringify(await flags()));
  rec.ok('the sprint ON is lit and glowing on the warm face', B.sprint && B.sprint.state === 'on' && B.sprint.tone === 'warm' && B.sprint.glowOp === 1, B.sprint);
  rec.ok('the special cooling down: Cooldown, a blue arc', B.special && B.special.state === 'cooldown' && B.special.arc, B.special);
  rec.ok('the whirlwind cooling down: Cooldown, a blue arc', B.whirl && B.whirl.state === 'cooldown' && B.whirl.arc, B.whirl);
  rec.ok('Element Burst cooling down: Cooldown, a blue arc', B.burst && B.burst.state === 'cooldown' && B.burst.arc, B.burst);
  /* Owner: "No cooldown for base attack though" -- the mockup's sheet used
     Attack as its example of a cooldown, and the base attack has none. */
  rec.ok('...while the ATTACK button, with everything round it cooling down, shows no cooldown (the base attack has none)',
    B.disc && B.disc.shown && !B.disc.arc && B.disc.state !== 'cooldown' && B.disc.rstate === 'hot', B.disc && { arc: B.disc.arc, state: B.disc.state, rstate: B.disc.rstate });
  rec.ok('...and still no words on any of them', ['special', 'whirl', 'sprint', 'burst'].every((k) => !B[k] || B[k].words.length === 0),
    ['special', 'whirl', 'sprint', 'burst'].map((k) => B[k] && B[k].words));
  await P.page.evaluate(() => { const S = window._gameState.current; S._lastSwipe = 0; S._abilCd = {}; S._lastBurstAt = 0; });
  await tapCentre(P, '[data-sprint]');            /* the sprint off again */
  await P.page.waitForTimeout(200);

  /* The shield UP: one real tap (the v2.3.3018 fix -- a real tap used to
     toggle it twice, see ShieldButton's onTouchEnd). */
  await tapCentre(P, '[data-shield]');
  await P.page.waitForTimeout(320);
  await settle(P);
  const U = await look(P);
  const uf = await flags();
  await shot(P, 'shield');
  console.log('    BTNSKIN shield: ' + JSON.stringify(U.block) + ' ' + JSON.stringify(uf));
  rec.ok('one real tap on Block raises the shield (not up-then-down)', uf.up === true, uf);
  rec.ok('the shield UP: Block is ON -- the warm face, the ring lit, the glow', U.block && U.block.state === 'on' && U.block.tone === 'warm' && U.block.glowOp === 1, U.block);
  rec.ok('...still the shield\'s own picture, unfiltered (mp-rbutton\'s check)', U.block && U.block.imgs === 1 && /wood-shield/.test(U.block.imgSrc[0] || '') && U.block.filtered.length === 0, U.block);
  rec.ok('...and Shield Bash is up beside it, in the skin, with its picture', U.bash && U.bash.shown && U.bash.state === 'normal' && U.bash.svgs.indexOf('bash') >= 0, U.bash);
  rec.ok('...neither with a word on it', ['block', 'bash'].every((k) => !U[k] || U[k].words.length === 0), ['block', 'bash'].map((k) => U[k] && U[k].words));
  await tapCentre(P, '[data-shield]');            /* and down */
  await P.page.waitForTimeout(260);
  const df = await flags();
  rec.ok('...and one more real tap lowers it', df.up === false, df);

  /* the bars empty: Disabled.  Pinned at zero while read: the worker owns
     stamina and mana, and its next echo would refill them. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._sprint) S._sprint.on = false;
    window.__qaPin(S.rpg, 'mana', () => 0);
    window.__qaPin(S.rpg, 'stamina', () => 0);
  });
  await P.page.waitForTimeout(450);
  const C = await look(P);
  await shot(P, 'empty');
  await P.page.evaluate(() => window.__qaUnpin());
  console.log('    BTNSKIN empty: ' + JSON.stringify(C));
  rec.ok('no mana: Spec is Disabled (grey)', C.special && C.special.state === 'disabled', C.special);
  rec.ok('no stamina: Whirl is Disabled', C.whirl && C.whirl.state === 'disabled', C.whirl);
  rec.ok('no stamina: Sprint is Disabled (tired)', C.sprint && C.sprint.state === 'disabled', C.sprint);
  rec.ok('no mana: Element Burst stays, Disabled', C.burst && C.burst.state === 'disabled', C.burst);

  /* Pressed, under a real finger on Spec (bars full again) */
  await P.page.evaluate(() => { const R = window._gameState.current.rpg; R.mana = R.maxMana || 100; R.stamina = R.maxStamina || 100; });
  await P.page.waitForTimeout(260);
  const sp = await P.page.evaluate(() => {
    const el = document.querySelector('[data-special]');
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const f = await fingerDown(P, sp.x, sp.y, 9);
  /* held long enough for the 90ms press transition to finish at the frame
     rate a headless page draws */
  await P.page.waitForTimeout(700);
  const D = await look(P);
  console.log('    BTNSKIN dbg pressed ' + JSON.stringify(await P.page.evaluate(() => {
    const el = document.querySelector('[data-special]');
    const sk = el && el.querySelector('.bt-skin');
    const cs = sk && getComputedStyle(sk);
    return { attr: el && el.getAttribute('data-pressed'), tf: cs && cs.transform, tr: cs && cs.transition, anims: document.getAnimations().length,
      vis: document.visibilityState, rm: matchMedia('(prefers-reduced-motion: reduce)').matches };
  })));
  await shot(P, 'pressed');
  await f.release();
  await P.page.waitForTimeout(120);
  const D2 = await look(P);
  rec.ok('a finger on Spec presses it in (data-pressed, the face scaled down)',
    D.special && D.special.pressed === '1' && /matrix\(0\.9/.test(D.special.skinTf || ''), D.special && { p: D.special.pressed, tf: D.special.skinTf });
  rec.ok('...and lets go when the finger does', D2.special && D2.special.pressed == null, D2.special && D2.special.pressed);

  /* Jump (v2.3.3017's button): a real tap takes off -- in the air it is lit
     on the warm face like the toggles (the sheet's Ready / Charged), and back
     on the ground it is Normal again */
  await tapCentre(P, '[data-jump]');
  /* Held in the air while it is read and photographed, as the cooldowns are
     above: the first run's guard, read after the picture, found the jump over
     (a 3x screenshot here outlasts even ?jumpms=1800's). */
  const jb = await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._jump) window.__qaPin(S._jump, 't0', () => Date.now() - 300);
    return window.__btJumpBtn && window.__btJumpBtn();
  });
  await P.page.waitForTimeout(250);
  await settle(P);
  const J = await look(P);
  await shot(P, 'jump');
  await P.page.evaluate(() => window.__qaUnpin());
  console.log('    BTNSKIN jump: ' + JSON.stringify(J.jump) + ' ' + JSON.stringify(jb));
  rec.ok('one real tap on Jump takes off (guard)', !!(jb && jb.air), jb);
  rec.ok('in the air Jump is lit: the warm face, the ring lit, the glow', J.jump && J.jump.state === 'on' && J.jump.tone === 'warm' && J.jump.glowOp === 1, J.jump);
  rec.ok('...still the arrow, no word, no filter', J.jump && J.jump.svgs.join() === 'jump' && J.jump.words.length === 0 && J.jump.filtered.length === 0, J.jump);
  await H.waitFor(P, () => window.__btJumpBtn().air, (v) => v === false, { timeout: 4000, label: 'down again' }).catch(() => null);
  await P.page.waitForTimeout(250);
  await settle(P);
  const J2 = await look(P);
  rec.ok('...and on the ground again it is Normal', J2.jump && J2.jump.state === 'normal' && J2.jump.tone === 'slate', J2.jump && { st: J2.jump.state, tone: J2.jump.tone });

  /* a bow in hand: the disc shows the bow */
  await P.page.evaluate((BOW) => {
    const S = window._gameState.current;
    S.rpg.rangedWeapon = Object.assign({}, BOW);
    S.rpg.activeSlot = 'ranged';
    /* a bow finds no targets by itself ("you must tap on the monster",
       v2.3.2258), so the disc comes up with a tapped lock */
    const m = S.monsters && S.monsters[0];
    if (m) S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
  }, BOW);
  await P.page.waitForTimeout(400);
  const E = await look(P);
  await shot(P, 'bow');
  rec.ok('a bow in hand: the attack disc shows the bow', E.disc && E.disc.ricon === 'w-bow' && E.disc.iconShown.join() === 'w-bow', E.disc && E.disc.iconShown);
  rec.ok('...and with a tapped lock it is on screen to press (guard for the picture)', E.disc && E.disc.wrapOp === 1, E.disc && E.disc.wrapOp);

  /* ── 6: a monster UNDER the disc ghosts it ── */
  const under = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'melee';
    const d = document.querySelector('.bt-rjoy-base').getBoundingClientRect();
    const cv = document.querySelector('canvas').getBoundingClientRect();
    const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
    /* the world point under the disc's centre, by the renderer's own transform */
    const wx = S.camera.x + (d.left + d.width / 2 - cv.left) / sx;
    const wy = S.camera.y + (d.top + d.height / 2 - cv.top) / sy;
    return { dx: wx - S.player.x, dy: wy - S.player.y };
  });
  await arm(P, { under: { dx: under.dx, dy: under.dy - 10 } });
  await P.page.waitForTimeout(900);
  const G = await look(P);
  await shot(P, 'ghost');
  rec.ok('a monster under the disc: it ghosts to its outline (the face nearly gone, the picture faded)',
    G.disc && G.disc.rstate === 'ghost' && G.disc.faceOp < 0.2 && G.disc.knobOp < 1, G.disc && { st: G.disc.rstate, face: G.disc.faceOp, knob: G.disc.knobOp });

  /* sideways */
  await arm(P);
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(1500);
  const L = await look(P);
  await P.page.screenshot({ path: `${OUT}/btnskin-${TAG}-sideways.png` });
  rec.ok('sideways: the controls still wear the skin', ['disc', 'special', 'block', 'sprint', 'jump'].every((k) => L[k] && L[k].state), ['disc', 'special', 'block', 'sprint', 'jump'].map((k) => L[k] && L[k].state));
  rec.ok('sideways: still no filter anywhere', named.every((k) => !L[k] || L[k].filtered.length === 0), named.map((k) => L[k] && L[k].filtered));

  rec.ok('no page errors through all of it', errs.length === 0, errs);
}
