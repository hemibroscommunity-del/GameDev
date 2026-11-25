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
 *   6. IN A FIGHT (a shield worn, a monster near): the big well is Block,
 *      wearing the shield, and Jump is the middle well; a TAP raises the
 *      guard and it stays up with no finger on it; a second tap lowers it; a
 *      tap on Attack lowers it; OUT of the fight (back in town) the big well
 *      is Jump again;
 *   7. no page errors.
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
const near = (a, b, tol) => !!a && !!b && Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;
const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.5 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 0.5;

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  const shots = process.env.PAD_SHOTS || null;
  try {
    for (const [label, viewport] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]]) {
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
  } finally {
    for (const P of players) await P.ctx.close().catch(() => {});
  }
  rec.ok('7. no page errors', errs.length === 0, errs.slice(0, 5));
}
