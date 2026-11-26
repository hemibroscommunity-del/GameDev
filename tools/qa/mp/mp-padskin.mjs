/* ═══ v2.3.6641: THE CONTROLLER, ONE SHELL, PLAYED ON A PHONE (card PAD part 3; `?padskin=0` today's look) ═══
 *
 * The owner, 2026-11-25: "The controller is too large and doesn't connect in
 * a seamless way to the dashboard. ... Make the jump button turn into the
 * shield button while in combat. Tapping attack button or shield button
 * again lowers it".  In the Wheel (BroTown), 430 x 775 upright and 844 x 390
 * sideways at 2x, real touches (CDP):
 *
 *   0. `&padskin=0` is today's look: no shell, no painted face, the pill;
 *   1. THE SHELL: one, as wide as the play column, its bottom edge ON the
 *      band's top edge (0 px) with the band open and folded, its height the
 *      layout's both times;
 *   2. EVERY SHOWN CONTROL IN ITS WELL (1.5 px): Jump the big well, Attack,
 *      Skate the mobility well, the three weapon wells, the stick's base;
 *      every face inside the shell; the mobility well never shows two;
 *   3. TOUCH BOXES at least 44 px, none over another;
 *   4. AN EMPTY WELL takes no touch: the middle and Special wells in town
 *      reach the world (the R zone);
 *   5. THE WEAPON WELLS select as the pill did: a tap on the bow's well puts
 *      the bow in hand and lights that well, the sword's puts it back;
 *   5b. v2.3.6641 (the gatekeeper's sitting 67), on a page of the two
 *      buttons (`manual=5`): ON THE BOARD with the sword near the safe
 *      ground's edge, turned to a monster: sighted, Charge in
 *      the mobility well and the board's face NOT drawn over it;
 *   5c. ...turned away, the sighting gone, still riding: the board's
 *      button back in the mobility well (the way off), Charge gone;
 *   6. IN A FIGHT (a shield worn, a monster near): the big well is Block,
 *      wearing the shield, and Jump is the middle well; a TAP raises the
 *      guard and it stays up with no finger on it; a second tap lowers it; a
 *      tap on Attack lowers it; OUT of the fight (back in town) the big well
 *      is Jump again;
 *   7. no page errors;
 *   8. (part 6) Whirlwind and Shield Bash in the tier; 8g (part 11) the
 *      steel in a fight at 390 x 844, 375 x 667 and 844 x 390;
 *   9. (v2.3.6646, part 11) `&padgold=1`: the gold for one phone.
 *   PAD_SHOTS=<dir>: the pictures of the PR (town, the fight with the shield
 *   up, the band folded, sideways).
 *
 *   node tools/qa/mp/run.mjs padskin
 */
import * as H from './harness.mjs';
export const lane = 'full';

const UPRIGHT = { width: 430, height: 775 };
const SIDEWAYS = { width: 844, height: 390 };   /* v2.3.6641 (part 4): an iPhone's sideways, where the one band's bars narrow the world (it was 775 x 430, which has none) */
const SEL = {
  jump: '[data-jump]', skate: '[data-ride]', attack: '.bt-rjoy-base', block: '[data-shield]', special: '[data-special]', charge: '[data-charge]',
  w1: '[data-pad-well="w1"]', w2: '[data-pad-well="w2"]', w3: '[data-pad-well="w3"]', stick: '[data-well-pic="stick"]',
};
const FACE = { jump: '.bt-pad-face', skate: '.bt-pad-face', attack: '.bt-pad-face', block: '.bt-pad-face', special: '.bt-pad-face', charge: '.bt-pad-face', w1: 'img', w2: 'img', w3: 'img', stick: null };

/* the page as the test reads it: the shell, each control's box and face, the band's top */
const LOOK = (P) => P.page.evaluate(([sel, face]) => {
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  const vis = (el) => { if (!el) return false; let e = el; while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; e = e.parentElement; } return true; };
  const cs = getComputedStyle(document.documentElement);
  const band = parseFloat(cs.getPropertyValue('--sheet-h')) || parseFloat(cs.getPropertyValue('--dash-h')) || 0;
  const out = { vw: window.innerWidth, vh: window.innerHeight, pad: window.__btPad ? window.__btPad.layout : null, c: {} };
  out.shell = rect(document.querySelector('[data-padhousing="shell"]'));
  out.shellShown = vis(document.querySelector('[data-padhousing="shell"]'));
  out.bandTop = window.innerHeight - band;
  out.pill = !!document.querySelector('[data-weapon-pill]:not([data-pad])');
  for (const k of Object.keys(sel)) {
    const el = document.querySelector(sel[k]);
    if (!el || !vis(el)) { out.c[k] = null; continue; }
    const f = face[k] ? el.querySelector(face[k]) : el;
    out.c[k] = { box: rect(el), face: rect(f), pic: el.querySelector('img[data-pic]') ? el.querySelector('img[data-pic]').getAttribute('data-pic') : null };
  }
  out.faces = document.querySelectorAll('.bt-pad').length;
  return out;
}, [SEL, FACE]);

/* a well's centre on the page: x from the column's left (the shell's), y up from the band */
const WELL = (L, k) => { const w = L.pad.wells[k]; return { x: L.shell.l + w.x, y: L.bandTop - w.y, d: w.d }; };
const SAFE_R = 2937;   /* zones.js wheel.safeR, the town's safe ground (mp-skateboard's); the centre is wheelGeom's */
const near = (a, b, tol) => !!a && !!b && Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;
/* v2.3.6642: a real touch's tap (CDP), and the worker's own stamina */
const tapAt = async (P, b, id) => {
  const cdp = P.__cdp || (P.__cdp = await P.page.context().newCDPSession(P.page));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y, id }] });
  await P.page.waitForTimeout(70);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
const srvStamina = async (wsPort, id) => { const v = await H.serverPlayer(wsPort, id).catch(() => null); return v && typeof v.stamina === 'number' ? Math.round(v.stamina) : null; };
const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.5 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 0.5;

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  const keeps = [];
  const shots = process.env.PAD_SHOTS || null;
  try {
    /* PAD_ONLY=rider: the rider's page alone (5b/5c), for a quick look */
    for (const [label, viewport] of (process.env.PAD_ONLY ? [] : [['upright', UPRIGHT], ['sideways', SIDEWAYS]])) {
      /* ── 0: today's look, on a page with the switch thrown ── */
      const O = await H.newPlayer(browser, { name: label === 'upright' ? 'Padoff' : 'Padoffs', wsPort, webPort, viewport, touch: true, dpr: 2, world: 'wheel', query: 'padskin=0' });
      players.push(O);
      O.page.on('pageerror', (e) => errs.push(label + ' off: ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(O);
      const inO = await H.waitFor(O, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      rec.ok(`${label}: the page with \`&padskin=0\` is in the Wheel (guard)`, !!inO, inO);
      await O.page.waitForTimeout(2500);
      const off = await LOOK(O);
      rec.ok(`0. ${label}: \`&padskin=0\` is today's look: no shell, no painted face, the weapon pill`, !off.shell && off.faces === 0 && off.pill && !off.c.w1, { shell: off.shell, faces: off.faces, pill: off.pill });
      await O.ctx.close().catch(() => {});

      /* ── the controller ── `tapms`: this box hands the page a touch's start
         and end about a second apart (70 ms sent; part 4 measured 1036 ms
         between the two events' stamps), past the weapon pill's 600 ms tap,
         so the well's tap read as a hold and never swapped (5, qa.taps 0):
         the window stretched as mp-weaponswap and mp-swaphint stretch it.
         No player's tap is touched (WeaponPill tapMaxMs, tapJump.js). */
      const P = await H.newPlayer(browser, { name: label === 'upright' ? 'Padbro' : 'Padside', wsPort, webPort, viewport, touch: true, dpr: 2, world: 'wheel', query: 'wheelwhole&tapms=4000' });
      players.push(P);
      P.page.on('pageerror', (e) => errs.push(label + ': ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      rec.ok(`${label}: in the Wheel (guard)`, !!inW, inW);
      if (!inW) continue;
      const me = await H.readState(P, (S) => S.myId);
      /* the bow owned (armed the worker's way: harness armWorker, TRAPS 207),
         the sword in hand (5 swaps between them) */
      const armed = await H.armWorker(P, wsPort, me, ['bow']).catch(() => []);
      const eqS = await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch((e) => ({ ok: false, why: String(e) }));
      rec.ok(`${label}: a bow owned and the sword in hand (guard)`, armed.includes('bow') && !!(eqS && eqS.ok), { armed, eqS });
      await H.unfoldBand(P).catch(() => null);
      await P.page.waitForTimeout(2500);
      const O1 = await LOOK(P);

      /* 1 */
      rec.ok(`1a. ${label}: one shell, as wide as the column, its bottom on the band's top (${O1.shell && (O1.shell.b - O1.bandTop).toFixed(1)} px)`,
        !!O1.shell && !!O1.pad && Math.abs(O1.shell.b - O1.bandTop) <= 0.5 && Math.abs(O1.shell.w - O1.pad.shell.w) <= 0.5 && Math.abs(O1.shell.h - O1.pad.shell.h) <= 0.5,
        { shell: O1.shell, bandTop: O1.bandTop, pad: O1.pad && O1.pad.shell });
      if (!O1.shell || !O1.pad) continue;
      if (shots && label === 'upright') await P.page.screenshot({ path: shots + '/pad3-town.png' });
      const folded = await H.foldBand(P).catch(() => null);
      await P.page.waitForTimeout(800);
      const F = await LOOK(P);
      if (shots) await P.page.screenshot({ path: shots + '/pad3-' + (label === 'upright' ? 'folded' : 'sideways') + '.png' });
      rec.ok(`1b. ${label}: the band folded (${folded && folded.now}), the shell still on its top edge (${F.shell && (F.shell.b - F.bandTop).toFixed(1)} px), the same height`,
        !!F.shell && Math.abs(F.shell.b - F.bandTop) <= 0.5 && Math.abs(F.shell.h - O1.shell.h) <= 0.5 && F.bandTop !== O1.bandTop, { folded, F: F.shell, bandTop: [O1.bandTop, F.bandTop] });
      /* upright the controls ride the band with the shell; sideways the open
         band is a page over the world and every control (the shell too) steps
         aside under it, as today (game.css html.bt-band-side-open) */
      const KS = ['jump', 'attack', 'w1', 'w2', 'w3', 'stick'];
      const near2 = label === 'upright'
        ? KS.filter((k) => !F.c[k] || !O1.c[k] || Math.abs((F.c[k].face.y - F.bandTop) - (O1.c[k].face.y - O1.bandTop)) > 1)
        : KS.filter((k) => !F.c[k] || O1.c[k] || O1.shellShown);
      rec.ok(`1c. ${label}: ${label === 'upright' ? 'the controls ride the band with the shell' : 'the open band hides the shell and the controls, the folded one shows them'}`, near2.length === 0, near2);
      /* the rest on the band as a player plays: upright open, sideways folded */
      if (label === 'upright') { await H.unfoldBand(P).catch(() => null); await P.page.waitForTimeout(800); }
      const L = label === 'upright' ? await LOOK(P) : F;

      /* 2 */
      const at = [['jump', 'big'], ['attack', 'attack'], ['w1', 'w1'], ['w2', 'w2'], ['w3', 'w3'], ['stick', 'stick']];
      if (L.c.skate) at.push(['skate', 'mobility']);
      const miss = at.filter(([k, w]) => { const c = L.c[k], W0 = WELL(L, w); return !c || !near(c.face, W0, 1.5) || (k !== 'stick' && k[0] !== 'w' && Math.abs(c.face.w - W0.d) > 1.5); })
        .map(([k, w]) => [k, w, L.c[k] && L.c[k].face, WELL(L, w)]);
      rec.ok(`2a. ${label}: every shown control in its well (Jump the big one; skate ${L.c.skate ? 'shown' : 'not offered'})`, miss.length === 0, miss);
      const outside = Object.keys(L.c).filter((k) => L.c[k] && k !== 'stick' && (L.c[k].face.l < L.shell.l - 0.5 || L.c[k].face.r > L.shell.r + 0.5 || L.c[k].face.t < L.shell.t - 0.5 || L.c[k].face.b > L.shell.b + 0.5));
      rec.ok(`2b. ${label}: every face inside the shell`, outside.length === 0, outside);
      rec.ok(`2c. ${label}: the mobility well shows one control at most`, !(L.c.skate && L.c.charge));
      rec.ok(`2d. ${label}: the weapon in hand's well lit, its icon in it`, !!L.c.w1 && L.c.w1.pic === 'slot-on', [L.c.w1 && L.c.w1.pic, L.c.w2 && L.c.w2.pic]);

      /* 3 */
      const shown = Object.keys(L.c).filter((k) => L.c[k] && k !== 'stick');
      const small = shown.filter((k) => L.c[k].box.w < 43.5 || L.c[k].box.h < 43.5).map((k) => [k, L.c[k].box.w]);
      const over = [];
      for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) if (overlap(L.c[shown[i]].box, L.c[shown[j]].box)) over.push([shown[i], shown[j]]);
      rec.ok(`3. ${label}: every touch box 44 px or more, none over another`, small.length === 0 && over.length === 0, { small, over });

      /* 4 */
      const empty = await P.page.evaluate((pts) => pts.map(([k, x, y]) => {
        const el = document.elementFromPoint(x, y);
        return { k, joyzone: el ? el.getAttribute('data-joyzone') : null, tag: el ? String(el.className || el.tagName).slice(0, 40) : null };
      }), [['mid', WELL(L, 'mid').x, WELL(L, 'mid').y], ['special', WELL(L, 'special').x, WELL(L, 'special').y]]);
      rec.ok(`4. ${label}: the middle and Special wells empty in town, a touch there reaches the world`,
        !L.c.block && !L.c.special && empty.every((e) => e.joyzone === 'R'), { empty });

      /* 5 */
      const cdp = await P.ctx.newCDPSession(P.page);
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
      const tap = async (b, id) => { await touch('touchStart', [{ x: b.x, y: b.y, id }]); await P.page.waitForTimeout(70); await touch('touchEnd', [{ x: b.x, y: b.y, id }]); };
      const under = await P.page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el ? String(el.getAttribute('data-pad-well') || el.className || el.tagName).slice(0, 50) : null; }, [L.c.w2.box.x, L.c.w2.box.y]);
      await tap(L.c.w2.box, 3);
      const bow = await H.waitFor(P, (S) => S.rpg && S.rpg.activeSlot, (v) => v === 'ranged', { timeout: 6000, label: 'bow in hand' }).catch(() => null);
      await P.page.waitForTimeout(400);
      const B = await LOOK(P);
      await tap(L.c.w1.box, 4);
      const sword = await H.waitFor(P, (S) => S.rpg && S.rpg.activeSlot, (v) => v === 'melee', { timeout: 6000, label: 'sword in hand' }).catch(() => null);
      rec.ok(`5. ${label}: the bow's well puts the bow in hand and lights (${B.c.w2 && B.c.w2.pic}), the sword's puts it back`,
        bow === 'ranged' && B.c.w2 && B.c.w2.pic === 'slot-on' && B.c.w1 && B.c.w1.pic === 'slot' && sword === 'melee',
        { bow, sword, under, qa: await P.page.evaluate(() => { const q = window.__btWeaponPill; return q ? { taps: q.taps, last: q.last, notes: q.notes } : null; }),
          held: await H.readState(P, (S) => S.rpg ? { r: !!S.rpg.rangedWeapon, slot: S.rpg.activeSlot } : null) });

      /* 6: a fight, the band folded as in the owner's mockup.  The kit's
         shield lands in the stash: worn the bag's way (mp-twobuttons 3's) */
      await H.foldBand(P).catch(() => null);
      await H.devOp(wsPort, 'kit', me, { what: 'shield' }).catch(() => null);
      const wear = () => P.page.evaluate(() => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return false;
        if (R.shield) return true;
        if (!Array.isArray(R.shieldStash) || !R.shieldStash.length) return false;
        const sh = R.shieldStash.shift();
        R.shield = sh;
        if (S.channel && S._serverCaps && S._serverCaps.shieldwear) {
          const payload = (typeof sh.gid === 'string' && sh.gid) ? { gid: sh.gid } : { sig: [sh.name || '', sh.gearBase || '', sh.tierMult == null ? '' : sh.tierMult, sh.tier || ''].join('|') };
          try { S.channel.send({ type: 'shield_wear', payload }); } catch (e) { /* the next change reports it */ }
        }
        return true;
      });
      let shieldOn = false;
      for (let k = 0; k < 60 && !shieldOn; k++) { shieldOn = await wear(); if (!shieldOn) await P.page.waitForTimeout(250); }
      rec.ok(`6. ${label}: a shield in hand (guard)`, !!shieldOn);
      const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      const mon = await H.readState(P, (S) => {
        const p = S.player; let best = null;
        for (const m of S.monsters || []) {
          if (!m || m.dead || !(m.hp > 0)) continue;
          const d = Math.hypot(m.x - p.x, m.y - p.y);
          if (!best || d < best.d) best = { id: m.id, x: m.x, y: m.y, d: Math.round(d) };
        }
        return best;
      });
      rec.ok(`6. ${label}: a live monster known (guard)`, !!mon, mon);
      if (!mon) { await P.ctx.close().catch(() => {}); continue; }
      await H.hopTo(P, Math.round(mon.x - 130), Math.round(mon.y), { tries: 260 }).catch(() => null);
      const fight = await P.page.waitForFunction(() => !!document.querySelector('[data-shield]'), null, { timeout: 20000 }).then(() => true).catch(() => false);
      await P.page.waitForTimeout(600);
      const G = await LOOK(P);
      rec.ok(`6a. ${label}: in a fight the big well is Block, wearing the shield, and Jump the middle well`,
        fight && !!G.c.block && near(G.c.block.face, WELL(G, 'big'), 1.5) && !!G.c.jump && near(G.c.jump.face, WELL(G, 'mid'), 1.5)
        && !!G.c.block.box && Math.abs(G.c.block.box.w - L.c.jump.box.w) <= 0.5,
        { fight, block: G.c.block && G.c.block.face, jump: G.c.jump && G.c.jump.face, big: WELL(G, 'big'), mid: WELL(G, 'mid') });
      const up = () => H.readState(P, (S) => !!S._shieldUp);
      let u1 = null, u2 = null, u3 = null, u4 = null, u5 = null;
      if (G.c.block) {
        await tap(G.c.block.box, 5);
        await P.page.waitForTimeout(1200);   /* no finger on it */
        u1 = await up();
        if (shots && label === 'upright') await P.page.screenshot({ path: shots + '/pad3-fight-shield-up.png' });
        await tap(G.c.block.box, 6);
        await P.page.waitForTimeout(600);
        u2 = await up();
        await tap(G.c.block.box, 7);
        await P.page.waitForTimeout(600);
        u3 = await up();
        const A = (await LOOK(P)).c.attack;
        if (A) { await tap(A.box, 8); await P.page.waitForTimeout(600); u4 = await up(); }
        u5 = await H.readState(P, (S) => S._shieldDroppedWhy || null);
      }
      rec.ok(`6b. ${label}: a tap raises the guard and it stays up with no finger on it (${u1})`, u1 === true);
      rec.ok(`6c. ${label}: a second tap lowers it (${u2})`, u1 === true && u2 === false);
      rec.ok(`6d. ${label}: a tap on Attack lowers it (${u3} then ${u4}, why ${u5})`, u3 === true && u4 === false, { u5 });
      await H.hopTo(P, home.x, home.y, { tries: 260 }).catch(() => null);
      const calm = await P.page.waitForFunction(() => !document.querySelector('[data-shield]'), null, { timeout: 30000 }).then(() => true).catch(() => false);
      await P.page.waitForTimeout(600);
      const C = await LOOK(P);
      rec.ok(`6e. ${label}: out of the fight the big well is Jump again`, calm && !!C.c.jump && near(C.c.jump.face, WELL(C, 'big'), 1.5) && !C.c.block, { calm, jump: C.c.jump && C.c.jump.face });
      await P.ctx.close().catch(() => {});
    }

    /* ── 5b/5c (v2.3.6641, the gatekeeper's sitting 67): a rider with a
       sword rides INTO a sighting and OUT of it.  The mobility well is the
       board's or Charge's (padSkin.js ctxFor); the board's poll redrew only
       when the ride's own key moved, so Charge's coming left the board drawn
       over it, or a redraw during the sighting left no way off after it.
       Charge is the two buttons' (`manual=5`; the page above plays today's
       held combat, `manual=4`, which has none): a page of its own.  On the
       board in town (a click: the button's mouse way; a touch here lasts
       past its 600 ms tap), hopped out on the line to the monster nearest
       the safe ground's edge, to 250 px from it (inside the sight's 440 and
       the view), its back to it; turned TO it, then away.  The turn is
       written, the body's (S._facingAngle, what a still bro is drawn by: the
       sight takes the DRAWN facing, sight.js drawnFace), held while the well
       is read: a board's stick would roll the rider off the safe ground. ── */
    for (const [label, viewport] of (process.env.PAD_ONLY && process.env.PAD_ONLY !== 'rider' ? [] : [['upright', UPRIGHT], ['sideways', SIDEWAYS]])) {
      const P = await H.newPlayer(browser, { name: label === 'upright' ? 'Padride' : 'Padrides', wsPort, webPort, viewport, touch: true, dpr: 2, world: 'wheel', query: 'manual=5&wheelwhole&tapms=4000' });
      players.push(P);
      P.page.on('pageerror', (e) => errs.push(label + ' rider: ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      const me = inW ? await H.readState(P, (S) => S.myId) : null;
      if (me) await H.armWorker(P, wsPort, me, ['bow']).catch(() => []);   /* the weapons owned, the worker's way (step 0's) */
      const eqS = me ? await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch((e) => ({ ok: false, why: String(e) })) : null;
      if (label === 'sideways') await H.foldBand(P).catch(() => null);   /* sideways the open band is a page over the controls */
      await P.page.waitForTimeout(2000);
      rec.ok(`5b. ${label} rider: in the Wheel with the two buttons, the sword in hand (guard)`, !!inW && !!(eqS && eqS.ok), { inW, eqS });
      if (!inW || !(eqS && eqS.ok)) continue;
      const G5 = await H.wheelGeom();
      const K0 = await LOOK(P);
      if (K0.c.skate) await P.page.mouse.click(K0.c.skate.box.x, K0.c.skate.box.y);
      const rideOn = await H.waitFor(P, (S) => !!(S._ride && S._ride.on), (v) => v, { timeout: 8000, label: 'on the board' }).catch(() => null);
      const pick5 = await P.page.evaluate(([cx, cy, R]) => {
        const S = window._gameState.current; let best = null;
        for (const m of S.monsters || []) {
          if (!m || !m.alive) continue;
          const d = Math.hypot(m.x - cx, m.y - cy) - R;
          if (d > 0 && (!best || d < best.d)) best = { id: String(m.id), x: m.x, y: m.y, d: Math.round(d) };
        }
        return best;
      }, [G5.cx, G5.cy, SAFE_R]);
      rec.ok(`5b. ${label} rider: on the board in town (the board's button in the mobility well), a monster within 230 px of the safe ground's edge (${pick5 && pick5.d}; guard)`,
        !!rideOn && !!K0.c.skate && near(K0.c.skate.face, WELL(K0, 'mobility'), 1.5) && !!pick5 && pick5.d <= 230, { rideOn, skate: K0.c.skate && K0.c.skate.face, pick5 });
      if (!rideOn || !pick5 || pick5.d > 230) continue;
      /* face the monster (`to` true) or turn the back on it, every 100 ms */
      const turn5 = (to) => P.page.evaluate(([id, to]) => {
        const S = window._gameState.current;
        const face = () => { const m = (S.monsters || []).find((x) => x && String(x.id) === id); if (m && S.player) S._facingAngle = Math.atan2(m.y - S.player.y, m.x - S.player.x) + (to ? 0 : Math.PI); };
        face(); clearInterval(window.__padFace); window.__padFace = setInterval(face, 100);
      }, [pick5.id, to]);
      const where5 = () => P.page.evaluate((id) => {
        const S = window._gameState.current, m = (S.monsters || []).find((x) => x && String(x.id) === id);
        return { riding: !!(S._ride && S._ride.on), sight: S._sightPhase || 'none', thumb: S._thumbPhase || 'calm', d: m && S.player ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null };
      }, pick5.id);
      const a = Math.atan2(pick5.y - G5.cy, pick5.x - G5.cx);
      await turn5(false);
      await H.hopTo(P, Math.round(pick5.x - 250 * Math.cos(a)), Math.round(pick5.y - 250 * Math.sin(a)), { tries: 260 }).catch(() => null);
      await P.page.waitForTimeout(1000);
      await turn5(true);
      const ch = await P.page.waitForFunction(() => !!document.querySelector('[data-charge]'), null, { timeout: 10000 }).then(() => true).catch(() => false);
      await P.page.waitForTimeout(800);   /* several of the board's polls (120 ms) */
      const I = await LOOK(P);
      const inS = { ch, charge: !!I.c.charge, skate: !!I.c.skate, inWell: !!I.c.charge && near(I.c.charge.face, WELL(I, 'mobility'), 1.5), at: await where5() };
      if (shots) await P.page.screenshot({ path: shots + '/pad3-rider-sighted-' + label + '.png' });
      rec.ok(`5b. ${label}: a rider with a sword sighted (${inS.at.d} px): Charge in the mobility well, the board's face not drawn over it`,
        inS.ch && inS.at.riding && inS.charge && inS.inWell && !inS.skate, inS);
      await turn5(false);
      const gone = await P.page.waitForFunction(() => !document.querySelector('[data-charge]'), null, { timeout: 15000 }).then(() => true).catch(() => false);
      await P.page.waitForTimeout(800);
      const Q = await LOOK(P);
      const outS = { gone, charge: !!Q.c.charge, skate: !!Q.c.skate, inWell: !!Q.c.skate && near(Q.c.skate.face, WELL(Q, 'mobility'), 1.5), at: await where5() };
      rec.ok(`5c. ${label}: turned away, the sighting gone, still riding: the board's button back in the mobility well (the way off), Charge gone`,
        outS.gone && outS.at.riding && outS.skate && outS.inWell && !outS.charge, outS);
      await P.page.evaluate(() => clearInterval(window.__padFace));
      await P.ctx.close().catch(() => {});
    }

    /* ── 8 (v2.3.6642, card PAD part 6): WHIRLWIND AND SHIELD BASH in the
       right lobe's tier (padSkin.js specialLayout).  A sword and a shield, in
       a fight (today's held combat: the lock at 220 px brings Whirlwind), the
       guard raised by a tap (Bash comes with it):
         8a. both shown, each face in its tier well (1.5 px), inside the
             tier's housing, the shell's bottom on the band as before;
         8b. every touch box on the page 44 px at least and none over
             another (the socketed ones, the two, Sprint, Quick eat, Burst,
             the trap, the board, Charge; v2.3.6644, card PAD part 9: Sprint
             is not drawn on a touch screen now, the stick's rim sprints, so
             8b reads it only where it is drawn, under `?rimsprint=0`);
         8c. with the tier drawn every socketed control shown is in its
             well (nothing moved for it); the read waits for Attack's
             socket first (v2.3.6643);
         8d. a tap on Shield Bash sends the old button's request (`ability`,
             bash) and the WORKER answers it (its stamina spent, or its
             refusal named); 8e the same for Whirlwind;
         8f. the bow in hand, the guard down: neither drawn, no tier, and
             every socketed control in its well;
         8g. (v2.3.6646, part 11) the tier's rings, Attack's and Special's
             ready glow and the energy strip in the steel, not the gold.
       PAD_ONLY=specials: this alone. ── */
    /* v2.3.6646 (card PAD part 11): at the card's three sizes, the steel's
       too (8g): an iPhone upright 390 x 844 and 375 x 667, sideways 844 x 390 */
    const SPEC_VIEWS = [['upright', { width: 390, height: 844 }], ['small', { width: 375, height: 667 }], ['sideways', SIDEWAYS]];
    const SPEC_NAME = { upright: 'Padspec', small: 'Padspecm', sideways: 'Padspecs' };
    for (const [label, viewport] of (process.env.PAD_ONLY && process.env.PAD_ONLY !== 'specials' ? [] : SPEC_VIEWS)) {
      const P = await H.newPlayer(browser, { name: SPEC_NAME[label], wsPort, webPort, viewport, touch: true, dpr: 2, world: 'wheel', query: 'wheelwhole&tapms=4000' });
      players.push(P);
      P.page.on('pageerror', (e) => errs.push(label + ' specials: ' + String((e && e.message) || e).slice(0, 200)));
      /* v2.3.6642: a real keystroke every 20 s.  The page hangs itself up after two minutes without
         real input (wsClient idleLogout, v2.3.1913); this page waits that long for the shield, the
         hop and the fight on the slow box, and sideways the first tap was then only "I'm back"
         (v2.3.3034): the worker had no player, nothing heard Whirlwind (stamina null, no answer). */
      keeps.push(H.keepAlive(P));
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      const me = inW ? await H.readState(P, (S) => S.myId) : null;
      if (me) await H.armWorker(P, wsPort, me, ['bow']).catch(() => []);
      const eqS = me ? await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch((e) => ({ ok: false, why: String(e) })) : null;
      if (me) await H.devOp(wsPort, 'kit', me, { what: 'shield' }).catch(() => null);
      let shieldOn = false;
      for (let k = 0; k < 60 && !shieldOn && me; k++) {
        shieldOn = await P.page.evaluate(() => {
          const S = window._gameState && window._gameState.current, R = S && S.rpg;
          if (!R) return false;
          if (R.shield) return true;
          if (!Array.isArray(R.shieldStash) || !R.shieldStash.length) return false;
          const sh = R.shieldStash.shift();
          R.shield = sh;
          if (S.channel && S._serverCaps && S._serverCaps.shieldwear) {
            const payload = (typeof sh.gid === 'string' && sh.gid) ? { gid: sh.gid } : { sig: [sh.name || '', sh.gearBase || '', sh.tierMult == null ? '' : sh.tierMult, sh.tier || ''].join('|') };
            try { S.channel.send({ type: 'shield_wear', payload }); } catch (e) { /* the next change reports it */ }
          }
          return true;
        });
        if (!shieldOn) await P.page.waitForTimeout(250);
      }
      await H.foldBand(P).catch(() => null);
      await P.page.waitForTimeout(1500);
      rec.ok(`8. ${label}: the sword in hand and a shield worn (guard)`, !!inW && !!(eqS && eqS.ok) && shieldOn, { inW, eqS, shieldOn });
      if (!inW || !shieldOn) continue;
      /* the requests the page sends, kept (the old button's is `ability`) */
      await P.page.evaluate(() => {
        const S = window._gameState.current; window.__padSent = [];
        const ch = S.channel; if (!ch || ch.__padSpy) return;
        const send = ch.send.bind(ch); ch.__padSpy = true;
        ch.send = (m) => { try { if (m && m.type === 'ability') window.__padSent.push(String(m.payload && m.payload.kind)); } catch (e) { /* kept */ } return send(m); };
      });
      const mon = await H.readState(P, (S) => {
        const p = S.player; let best = null;
        for (const m of S.monsters || []) {
          if (!m || m.dead || !(m.hp > 0)) continue;
          const d = Math.hypot(m.x - p.x, m.y - p.y);
          if (!best || d < best.d) best = { id: m.id, x: m.x, y: m.y, d: Math.round(d) };
        }
        return best;
      });
      if (!mon) { rec.ok(`8. ${label}: a live monster known (guard)`, false); continue; }
      await H.hopTo(P, Math.round(mon.x - 130), Math.round(mon.y), { tries: 260 }).catch(() => null);
      const fight = await P.page.waitForFunction(() => !!document.querySelector('[data-shield]') && !!document.querySelector('[data-ability="whirl"]'), null, { timeout: 20000 }).then(() => true).catch(() => false);
      await P.page.waitForTimeout(600);
      const SPEC = Object.assign({}, SEL, { whirl: '[data-ability="whirl"]', bash: '[data-ability="bash"]', sprint: '[data-sprint]', eat: '[data-quickeat]', burst: '.bt-burst-btn', trap: '[data-trap-round]' });
      const SFACE = Object.assign({}, FACE, { whirl: '[data-ability-face]', bash: '[data-ability-face]', sprint: null, eat: null, burst: null, trap: null });
      const LOOK8 = () => P.page.evaluate(([sel, face]) => {
        const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, l: r.left, r: r.right, t: r.top, b: r.bottom }; };
        const vis = (el) => { if (!el) return false; let e = el; while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; e = e.parentElement; } return true; };
        const cs = getComputedStyle(document.documentElement);
        const band = parseFloat(cs.getPropertyValue('--sheet-h')) || parseFloat(cs.getPropertyValue('--dash-h')) || 0;
        const out = { bandTop: window.innerHeight - band, pad: window.__btPad || null, c: {} };
        out.shell = rect(document.querySelector('[data-padhousing="shell"]'));
        const t = document.querySelector('[data-padhousing="tier"]');
        out.tier = t && vis(t) ? rect(t) : null;
        for (const k of Object.keys(sel)) {
          const el = document.querySelector(sel[k]);
          if (!el || !vis(el)) { out.c[k] = null; continue; }
          const f = face[k] ? el.querySelector(face[k]) : el;
          out.c[k] = { box: rect(el), face: rect(f) };
        }
        return out;
      }, [SPEC, SFACE]);
      const D = await LOOK8();   /* the guard down: Whirlwind alone */
      const up = () => H.readState(P, (S) => !!S._shieldUp);
      /* the presses: the worker's stamina full first, then the button's tap
         (a raised guard spends stamina a tick, so Whirlwind first, the guard
         down, then Bash with it up) */
      const press = async (k, id) => {
        /* v2.3.6642: a press waits for the page's link to read 'connected' AND the worker to hold
           the player (a stamina to read) before it tops the stamina up: a page that has gone idle
           (see the keystroke above) has no player there, and its detail says so */
        const ready = async () => {
          const t = Date.now(); let st = null, v = null;
          while (Date.now() - t < 45000) {
            st = await H.readState(P, (S) => ({ link: S._realtimeStatus || null, dead: !!(S.player && S.player.dead), id: S.myId })).catch(() => null);
            v = await srvStamina(wsPort, me);
            if (st && st.link === 'connected' && !st.dead && v != null) break;
            await P.page.waitForTimeout(500);
          }
          return { st, v, waited: Date.now() - t };
        };
        const rd = await ready();
        await H.devOp(wsPort, 'vitals', me, { stamina: 100 }).catch(() => null);
        await H.waitFor(P, (S) => (S.rpg ? S.rpg.stamina : 0), (v) => v >= 90, { timeout: 15000, label: 'stamina full' }).catch(() => null);
        const s0 = await srvStamina(wsPort, me);
        await P.page.evaluate(() => { window.__padSent = []; });
        const t0 = await P.page.evaluate(() => Date.now());   /* a refusal after the tap (the page's field is read, never written) */
        const L9 = await LOOK8();
        if (L9.c[k]) await tapAt(P, L9.c[k].box, id);
        const sent0 = Date.now();
        /* the worker's answer: its stamina spent (the press pays at once, and a guard-down pool
           fills again within a second on this box, so the lowest reading since the tap counts), or
           its refusal of that cast (ability_rejected: it heard it).  Up to 8 s of the renderer's
           clock, never a 60 fps window (TRAPS section 200). */
        let s1 = null, nope = null, heard = null, low = s0;
        while (Date.now() - sent0 < 8000) {
          s1 = await srvStamina(wsPort, me);
          if (s1 != null && (low == null || s1 < low)) low = s1;
          nope = await H.readState(P, (S) => S._lastAbilityReject || null);
          heard = (s0 != null && low != null && low < s0 - 2) ? 'spent' : (nope && nope.kind === k && nope.at >= t0 ? 'refused: ' + nope.reason : null);
          if (heard && Date.now() - sent0 > 1500) break;
          await P.page.waitForTimeout(150);
        }
        const sent = await P.page.evaluate(() => window.__padSent.slice());
        return { shown: !!L9.c[k], sent, s0, s1, low, heard, ready: rd };
      };
      const pw = await press('whirl', 23);
      rec.ok(`8e. ${label}: a tap on Whirlwind sends the old button's request (${pw.sent.join(',')}) and the worker answers it (${pw.heard}; stamina ${pw.s0} -> ${pw.s1})`,
        pw.shown && pw.sent.includes('whirl') && !!pw.heard, pw);
      const D2 = await LOOK8();
      if (D2.c.block) await tapAt(P, D2.c.block.box, 21);
      const raised = await P.page.waitForFunction(() => !!document.querySelector('[data-ability="bash"]'), null, { timeout: 8000 }).then(() => true).catch(() => false);
      await P.page.waitForTimeout(600);
      /* v2.3.6643 (card PAD part 8): the read waits for Attack's socket first.
         8c was red one run in three upright (part 22's runs on e1467159: its
         list lacked `attack`): the Attack button was not yet seated (shown,
         its face in the attack well) when the step read, after the guard's
         tap.  Up to 8 s; a button that never seats still fails 8c below. */
      await P.page.waitForFunction(() => {
        const el = document.querySelector('.bt-rjoy-base');
        const f = el && el.querySelector('.bt-pad-face');
        const sh = document.querySelector('[data-padhousing="shell"]');
        const L = window.__btPad && window.__btPad.layout;
        if (!f || !sh || !L || !L.wells || !L.wells.attack) return false;
        for (let e = el; e && e !== document.body; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
        }
        const cs = getComputedStyle(document.documentElement);
        const band = parseFloat(cs.getPropertyValue('--sheet-h')) || parseFloat(cs.getPropertyValue('--dash-h')) || 0;
        const r = f.getBoundingClientRect(), s = sh.getBoundingClientRect(), w = L.wells.attack;
        return Math.abs(r.left + r.width / 2 - (s.left + w.x)) <= 1.5 && Math.abs(r.top + r.height / 2 - (window.innerHeight - band - w.y)) <= 1.5;
      }, null, { timeout: 8000, polling: 100 }).catch(() => null);
      const G = await LOOK8();
      if (shots) await P.page.screenshot({ path: shots + '/pad6-specials-' + label + '.png' });
      const T = G.pad && G.pad.tier, L8 = G.pad && G.pad.layout;
      const tw = (k) => (T && T.wells[k] && G.shell ? { x: G.shell.l + T.wells[k].x, y: G.bandTop - T.wells[k].y } : null);
      const inTier = (k) => !!G.c[k] && !!G.tier && G.c[k].face.l >= G.tier.l - 0.5 && G.c[k].face.r <= G.tier.r + 0.5 && G.c[k].face.t >= G.tier.t - 0.5;
      rec.ok(`8a. ${label}: in a fight with the guard up (${fight}, ${raised}, ${await up()}) Whirlwind and Shield Bash in the tier's wells (Whirlwind over Special, Bash over the mobility well), inside its housing, the shell on the band`,
        fight && raised && !!G.c.whirl && !!G.c.bash && near(G.c.whirl.face, tw('whirl'), 1.5) && near(G.c.bash.face, tw('bash'), 1.5)
        && inTier('whirl') && inTier('bash') && !!G.tier && Math.abs(G.tier.b - G.bandTop) <= 0.5 && Math.abs(G.shell.b - G.bandTop) <= 0.5
        && !!L8 && Math.abs(G.c.whirl.face.x - (G.shell.l + L8.wells.special.x)) <= 1.5 && Math.abs(G.c.bash.face.x - (G.shell.l + L8.wells.mobility.x)) <= 1.5,
        { whirl: G.c.whirl && G.c.whirl.face, bash: G.c.bash && G.c.bash.face, at: [tw('whirl'), tw('bash')], tier: G.tier, rise: T && T.rise });
      const boxes = Object.keys(G.c).filter((k) => G.c[k] && G.c[k].box && k !== 'stick').map((k) => [k, G.c[k].box]);
      const small8 = boxes.filter(([k, b]) => b.w < 44 - 0.5 || b.h < 44 - 0.5).map(([k, b]) => [k, b.w, b.h]);
      const over8 = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlap(boxes[i][1], boxes[j][1])) over8.push([boxes[i][0], boxes[j][0]]);
      rec.ok(`8b. ${label}: every touch box shown 44 px at least, none over another (${boxes.map((b) => b[0]).join(' ')})`, small8.length === 0 && over8.length === 0, { small8, over8 });
      /* a control shown both times in the same place (Special hides while
         the guard is up, today's rule: a control the game hides is not a
         control moved) */
      const moved = (A, B) => ['attack', 'block', 'jump', 'special', 'skate', 'charge', 'w1', 'w2', 'w3'].filter((k) => A.c[k] && B.c[k] && !near(A.c[k].face, B.c[k].face, 0.5));
      /* with the tier drawn every socketed control shown is in its well, where part 4 measured it */
      const WELLS8 = { attack: 'attack', block: 'big', jump: 'mid', special: 'special', skate: 'mobility', charge: 'mobility', w1: 'w1', w2: 'w2', w3: 'w3' };
      const GW = { pad: G.pad && G.pad.layout, shell: G.shell, bandTop: G.bandTop };   /* WELL's shape (the probe holds { layout, tier }) */
      const off8 = GW.pad && G.shell ? Object.keys(WELLS8).filter((k) => G.c[k] && !near(G.c[k].face, WELL(GW, WELLS8[k]), 1.5)) : ['no layout'];
      rec.ok(`8c. ${label}: with the tier drawn every socketed control is in its well (${Object.keys(WELLS8).filter((k) => G.c[k]).join(' ')}; off: ${off8.join(' ') || 'none'})`,
        !!G.tier && off8.length === 0 && !!G.c.attack && !!G.c.block, off8);
      /* v2.3.6646 (card PAD part 11; the owner: "Turn steel"): in this fight
         the three places wear the steel sheet's colours, never the gold:
         8g. Whirlwind's and Shield Bash's ring the steel gradient (data-metal,
             the ring's computed stroke; its cooldown's grey as before); Attack's ready glow, and Special's,
             the cold light DEEBF6 (its --pad-acc and the glow's box-shadow);
             the energy strip loaded is the steel one, the gold never asked */
      const ST = await P.page.evaluate(() => {
        const ring = (k) => { const e = document.querySelector('[data-ability="' + k + '"] .bt-skin'); const c = e && e.querySelector('.bt-skin-ringc');
          return e ? { metal: e.getAttribute('data-metal'), stroke: c ? getComputedStyle(c).stroke : null } : null; };
        const acc = (k) => { const e = document.querySelector('.bt-pad[data-pad="' + k + '"]'); const g = e && e.querySelector('.bt-pad-glow');
          return e ? { acc: (e.style.getPropertyValue('--pad-acc') || '').trim().toUpperCase(), shadow: g ? getComputedStyle(g).boxShadow : null } : null; };
        /* the strip is read off the page's thread (p256.js, stripRead.js), in
           no resource list: fxStrips.js's probe names the one asked for */
        const bb = window.__btBlockBars ? window.__btBlockBars() : null;
        return { whirl: ring('whirl'), bash: ring('bash'), attack: acc('attack'), special: acc('special'), strip: bb };
      });
      /* a ring in the tier is steel, or the grey its cooldown or Disabled
         wears as before (btSkinDim, btSkinGrey), never a gold gradient */
      const steelRing = (r) => !!r && r.metal === 'steel' && /btSkin(Steel|Dim|Grey|Quiet)/.test(String(r.stroke)) && !/btSkin(Gold|Lit|Press)\b/.test(String(r.stroke));
      const coldGlow = (a) => !a || (a.acc === '#DEEBF6' && /rgb\(222, 235, 246\)/.test(String(a.shadow)));
      rec.ok(`8g. ${label}: steel, not gold: the tier's rings (${ST.whirl && ST.whirl.metal}, ${ST.bash && ST.bash.metal}), Attack's glow ${ST.attack && ST.attack.acc}, Special's ${ST.special ? ST.special.acc : 'not shown'}, the energy strip ${ST.strip ? ST.strip.stamina.replace(/^.*\//, '') + (ST.strip.cut ? ' (cut)' : ' (not cut)') : 'none'}`,
        steelRing(ST.whirl) && steelRing(ST.bash) && !!ST.attack && coldGlow(ST.attack) && coldGlow(ST.special)
        && !!ST.strip && /\/blocks-stam-steel\.webp\b/.test(ST.strip.stamina) && ST.strip.cut, ST);
      const pb = await press('bash', 22);
      rec.ok(`8d. ${label}: a tap on Shield Bash sends the old button's request (${pb.sent.join(',')}) and the worker answers it (${pb.heard}; stamina ${pb.s0} -> ${pb.s1})`,
        pb.shown && pb.sent.includes('bash') && !!pb.heard, pb);
      /* the bow, the guard down */
      if (await up()) { const B0 = await LOOK8(); if (B0.c.block) await tapAt(P, B0.c.block.box, 24); await P.page.waitForTimeout(800); }
      const B1 = await LOOK8();
      if (B1.c.w2) await tapAt(P, B1.c.w2.box, 25);
      const bow = await H.waitFor(P, (S) => S.rpg && S.rpg.activeSlot, (v) => v === 'ranged', { timeout: 8000, label: 'bow in hand' }).catch(() => null);
      await P.page.waitForTimeout(1200);
      const W = await LOOK8();
      const bowUp = await up();
      /* every socketed control shown in its well (Jump the big well once
         the fight's Block is gone: the bow locks nothing, today's rule) */
      const WW = { pad: W.pad && W.pad.layout, shell: W.shell, bandTop: W.bandTop };
      const wellOfW = (k) => (k === 'jump' ? (W.c.block ? 'mid' : 'big') : WELLS8[k]);
      const offW = WW.pad && W.shell ? Object.keys(WELLS8).filter((k) => W.c[k] && !near(W.c[k].face, WELL(WW, wellOfW(k)), 1.5)) : ['no layout'];
      rec.ok(`8f. ${label}: the bow in hand, the guard down (${bowUp}): neither drawn, no tier, every socketed control in its well (off: ${offW.join(' ') || 'none'})`,
        bow === 'ranged' && !bowUp && !W.c.whirl && !W.c.bash && !W.tier && !(W.pad && W.pad.tier) && offW.length === 0,
        { bow, whirl: !!W.c.whirl, bash: !!W.c.bash, tier: W.tier, offW });
      await P.ctx.close().catch(() => {});
    }
    /* ── 9 (v2.3.6646, card PAD part 11): `&padgold=1`, the gold for one
       phone: Attack's accent the gold of 2026-11-25 (FFB347), the energy
       strip the owner's gold one, the controller otherwise as without it.
       PAD_ONLY=gold: this alone. ── */
    for (const [label, viewport] of (process.env.PAD_ONLY && process.env.PAD_ONLY !== 'gold' ? [] : [['upright', { width: 390, height: 844 }]])) {
      const P = await H.newPlayer(browser, { name: 'Padgold', wsPort, webPort, viewport, touch: true, dpr: 2, world: 'wheel', query: 'wheelwhole&padgold=1' });
      players.push(P);
      P.page.on('pageerror', (e) => errs.push(label + ' gold: ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(P);
      await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      await P.page.waitForTimeout(1500);
      const GD = await P.page.evaluate(() => {
        const e = document.querySelector('.bt-pad[data-pad="attack"]');
        return { shell: !!document.querySelector('[data-padhousing]'), acc: e ? (e.style.getPropertyValue('--pad-acc') || '').trim().toUpperCase() : null,
          strip: window.__btBlockBars ? window.__btBlockBars() : null };
      });
      rec.ok(`9. ${label}: &padgold=1 gives the gold back: the controller drawn (${GD.shell}), Attack's accent ${GD.acc}, the energy strip ${GD.strip && GD.strip.stamina.replace(/^.*\//, '')}`,
        GD.shell && GD.acc === '#FFB347' && !!GD.strip && /\/blocks-stam\.webp\b/.test(GD.strip.stamina), GD);
      await P.ctx.close().catch(() => {});
    }
  } finally {
    for (const stop of keeps) { try { stop(); } catch (e) { /* the page's own end */ } }
    for (const P of players) await P.ctx.close().catch(() => {});
  }
  rec.ok('7. no page errors', errs.length === 0, errs.slice(0, 5));
}
