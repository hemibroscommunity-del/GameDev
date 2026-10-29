/* ═══ E DOES WHAT THE PROMPT SAYS; THE BOARD'S BUTTON; A CLICK ON A PLAYER (v2.3.3834) ═══
 *
 * From the judge pass of 2026-10-29 (a judge's first twenty minutes, on a
 * computer), the three items the orchestrator gave lane A:
 *   1. at the Town Hall's door with Mayor Bro beside it, his quest under way,
 *      the prompt reads "E  ENTER TOWN HALL" -- and E talked to him.  Now E
 *      does what the prompt says (desktopControls.js doorPromptUp): the Town
 *      Hall opens; a step away from the door, the prompt gone, E talks to him
 *      (his quest before a door, v2.3.3583, everywhere else).
 *      v2.3.3868 (the owner: "When you're next to mayor bro ... you would
 *      actually open the door"): a townsperson in talk range comes before
 *      a door, and the computer's prompt says "Talk to <name>" meanwhile --
 *      next to the Mayor "Talk to Mayor Bro" and E talks; at the hall's door
 *      out of his range "Enter Town Hall" and E opens it; and at every open
 *      door the same;
 *   2. the skateboard's button (Z on a computer) is drawn on the safe ground,
 *      where the board rides, and nowhere past it: in the Earth Forest no
 *      button -- on a computer (wide) and on an upright phone;
 *   3. a click on another player (v2.3.3837; #1259's re-check): both bros on
 *      a quiet spot of No man's land's first ring, a real click on the other
 *      bro's BODY and on his HEAD each raises "Attack <name>?" and takes no
 *      monster as the click's pick (a player was found only within 25 px of
 *      his feet); with a third bro a step (about 30 px) from him, a click on
 *      the third's body asks about the third (the nearest, as the press asks);
 *      and with a monster beside him, the pointer on the monster locks the
 *      monster, no "Attack?";
 *   4. no page errors.
 * Pictures: tools/qa/mp/out/mayordoor-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const WIDE = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `mayordoor-${name}.png`) }); } catch (e) { /* a picture only */ } };

async function into(browser, wsPort, webPort, name, opts) {
  const P = await H.newPlayer(browser, Object.assign({ name, wsPort, webPort, world: 'wheel' }, opts));
  P.errors = [];
  P.page.on('pageerror', (e) => P.errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
    { timeout: 150000, label: name + ' into the world' }).catch(() => null);
  await H.closeNpcDialogue(P).catch(() => {});
  await P.page.addStyleTag({ content: '*:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  return P;
}
/* put the bro at an offset from a townsperson (mp-questprox's place) */
const place = (P, id, dx, dy) => P.page.evaluate(({ who, ox, oy }) => {
  const S = window._gameState && window._gameState.current;
  const npc = ((S && S.npcs) || []).find((n) => n && n.id === who);
  if (!S || !npc || !S.player) return null;
  S.player.x = npc.x + ox; S.player.y = npc.y + oy;
  return true;
}, { who: id, ox: dx, oy: dy });
const here = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  const b = document.querySelector('.bt-interact-prompt');
  return {
    npc: S && S._nearNpc ? S._nearNpc.id : null,
    up: !!(S && (S.nearBuilding != null || (S._nearWheelBuilding && S._nearWheelBuilding.hall))),
    prompt: b ? b.innerText.replace(/\s+/g, ' ').trim() : null,
    building: !!document.querySelector('[data-building-panel]'),
    dialogue: !!document.querySelector('.bt-npcdlg-name'),
  };
});
const rideBtn = (P) => P.page.evaluate(() => (window.__btRideBtn ? window.__btRideBtn() : null));

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await into(browser, wsPort, webPort, 'Doorbro', { viewport: WIDE, wide: true });
  const C = await into(browser, wsPort, webPort, 'Doorphone', { viewport: PHONE, touch: true });
  try {
    /* ── 1. E at the Town Hall's door, the Mayor's quest under way ── */
    await A.page.evaluate(() => { const S = window._gameState.current; if (S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    await H.waitFor(A, (S) => (S.rpg && S.rpg._quests && S.rpg._quests.tut_1) || null, (v) => v === 'active', { timeout: 10000, label: 'tut_1 taken' }).catch(() => null);
    await A.page.waitForTimeout(800);
    /* v2.3.3868: the owner, on a computer: "When you're next to mayor bro
       (intending to accept the first quest by 'interacting') you would
       actually open the door to the building right next to him (town hall)."
       A townsperson in talk range comes before a door (desktopControls.js
       talkBeforeDoor), and the computer's prompt says "Talk to <name>".
       Each door's spot: in its reach (__btWheelTownDoors.at) and out of
       every townsperson's (S._nearNpc null) -- searched round its foot. */
    const doorSpot = (doorId) => A.page.evaluate(async (id) => {
      const S = window._gameState.current;
      const d = window.__btWheelTownDoors.doors().find((x) => x.id === id);
      if (!d) return null;
      for (const r of [40, 70, 100, 125]) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          S.player.x = d.x + Math.cos(a) * r; S.player.y = d.y - 52 + Math.sin(a) * r;
          await new Promise((res) => setTimeout(res, 250));
          if (window.__btWheelTownDoors.at() === id && !S._nearNpc) return { x: Math.round(S.player.x), y: Math.round(S.player.y) };
        }
      }
      return null;
    }, doorId);
    /* next to the Mayor, his door's reach and all */
    await place(A, 'mayor_bro', 0, 34);
    await A.page.waitForTimeout(600);
    const h0 = await here(A);
    await shot(A, '1-beside-mayor');
    await A.page.keyboard.press('e');
    await A.page.waitForTimeout(1500);
    const h1 = await here(A);
    await shot(A, '1-talk');
    rec.ok(`1. next to Mayor Bro, in the Town Hall door's reach (${h0.up ? 'yes' : 'NO'}): the prompt reads "${h0.prompt}", and E opens his dialogue, not the door`,
      h0.up && h0.npc === 'mayor_bro' && !!h0.prompt && /talk to mayor bro/i.test(h0.prompt) && h1.dialogue && !h1.building, { h0, h1 });
    await H.closeNpcDialogue(A).catch(() => {});
    await A.page.waitForTimeout(600);
    /* a step aside, out of his range: the door's button, and E opens it */
    const th = await doorSpot('townhall');
    await A.page.waitForTimeout(500);
    const h2 = await here(A);
    await shot(A, '1-door-prompt');
    await A.page.keyboard.press('e');
    await A.page.waitForTimeout(1500);
    const h3 = await here(A);
    await shot(A, '1-door-opened');
    rec.ok(`1. at the Town Hall's door out of anyone's talk range (${JSON.stringify(th)}): the button reads "${h2.prompt}" and E opens the Town Hall`,
      !!th && !!h2.prompt && /town hall/i.test(h2.prompt) && h3.building && !h3.dialogue, { th, h2, h3 });
    await A.page.keyboard.press('Escape');
    await A.page.waitForTimeout(800);
    /* every open door: a spot at it out of everyone's range shows its
       button; and each townsperson whose range reaches its doorstep, stood
       beside, shows none (E talks) */
    const doors = await A.page.evaluate(() => {
      const S = window._gameState.current;
      return window.__btWheelTownDoors.doors().filter((d) => d.index >= 0 || d.hall).map((d) => ({
        id: d.id, npcs: (S.npcs || []).filter((n) => n && n.alive !== false && Math.hypot(n.x - d.x, n.y - 52 - d.y) < 230).map((n) => n.id),
      }));
    });
    const checks = [];
    for (const d of doors) {
      const spot = await doorSpot(d.id);
      await A.page.waitForTimeout(300);
      const at = spot ? await here(A) : null;
      const people = [];
      for (const id of d.npcs) {
        await place(A, id, 0, 30);
        await A.page.waitForTimeout(350);
        const h = await here(A);
        people.push({ id, near: h.npc, prompt: h.prompt });
      }
      checks.push({ door: d.id, spot, button: at && at.prompt, people });
    }
    /* beside a townsperson the prompt (if a door's reach puts one up) says
       Talk, never Enter */
    const bad = checks.filter((c) => !c.spot || !c.button || !/enter/i.test(c.button) || c.people.some((p) => !p.near || (p.prompt !== null && !/^E ?Talk to /i.test(p.prompt))));
    rec.ok(`1. every open door (${checks.length}): out of everyone's range its Enter button is up; beside each townsperson near it (${checks.reduce((n, c) => n + c.people.length, 0)}) the prompt says Talk, never Enter`,
      checks.length >= 5 && bad.length === 0, { bad, checks: checks.map((c) => [c.door, !!c.spot, c.button, c.people.map((p) => p.id + ':' + (p.prompt === null ? 'none' : p.prompt)).join(' ')]) });

    /* ── 2. the board's button: on the safe ground, and not past it ── */
    const town = { A: await rideBtn(A), C: await rideBtn(C) };
    rec.ok(`2. in BroTown the board's button is drawn (computer ${!!(town.A && town.A.shown)}, phone ${!!(town.C && town.C.shown)})`,
      !!(town.A && town.A.shown) && !!(town.C && town.C.shown), town);
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const pt = WHEEL_SPAWNS.verdant.points[0];
    /* the Mayor's first quest opens the Earth Forest (QUEST_ZONE_GATE): the
       worker stops a bro without it at the commons' edge */
    await C.page.evaluate(() => { const S = window._gameState.current; if (S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    await H.waitFor(C, (S) => (S.rpg && S.rpg._quests && S.rpg._quests.tut_1) || null, (v) => !!v, { timeout: 10000, label: 'the phone takes tut_1' }).catch(() => null);
    for (const P of [A, C]) {
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
    }
    await H.hopTo(A, pt[0] + 200, pt[1] + 150, { tries: 260 });
    await H.hopTo(C, pt[0] + 260, pt[1] + 150, { tries: 260 });
    await A.page.waitForTimeout(2000);
    const forest = { A: await rideBtn(A), C: await rideBtn(C) };
    const btnEl = async (P) => P.page.evaluate(() => { const b = document.querySelector('.bt-ride-btn'); return b ? { shown: getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().width > 0 } : null; });
    const elA = await btnEl(A), elC = await btnEl(C);
    await shot(A, '2-forest-computer');
    await shot(C, '2-forest-phone');
    rec.ok('2. in the Earth Forest no board button, on the computer nor on the phone',
      !(forest.A && forest.A.shown) && !(forest.C && forest.C.shown) && !(elA && elA.shown) && !(elC && elC.shown), { forest, elA, elC });

    /* ── 3. a click on another player's BODY and HEAD in No man's land
          (v2.3.3837; #1259's re-check), and a monster beside a player ── */
    /* the other bro is the phone (C), already out in the Earth Forest: a
       fresh page's hops from the square stall at the commons' water */
    const B = C;
    {
      const aId = await H.readState(A, (S) => S.myId), bId = await H.readState(B, (S) => S.myId);
      for (const id of [aId, bId]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
      /* a dry, quiet spot on No man's land 1's ring (mp-nmlask's search) */
      const LONG = (await H.wheelGeom()).long;
      const { WHEEL_CENTRE } = await import(H.REPO + '/server/src/wheelspawns.js');
      const { NML } = await import(H.REPO + '/src/data/noMansLandRings.js');
      const T = NML.TIER * LONG;
      const monsterPts = [];
      for (const k of Object.keys(WHEEL_SPAWNS)) {
        for (const p of WHEEL_SPAWNS[k].points) monsterPts.push(p);
        for (const d of Object.values(WHEEL_SPAWNS[k].deeper || {})) for (const p of d.points) monsterPts.push(p);
      }
      const cands = [];
      for (const land of ['verdant']) {   /* the land tut_1 opens for both */
        const a = WHEEL_SPAWNS[land].anchor;
        const Ln = Math.hypot(a[0] - WHEEL_CENTRE[0], a[1] - WHEEL_CENTRE[1]);
        const ux = (a[0] - WHEEL_CENTRE[0]) / Ln, uy = (a[1] - WHEEL_CENTRE[1]) / Ln;
        for (let r = Math.max(NML.SAFE_R || 0, NML.HUB + (NML.FIRST_TIER - 1) * T) + 160; r <= NML.HUB + NML.FIRST_TIER * T - 160; r += 50 * LONG) {
          for (let lat = -600; lat <= 600; lat += 50) {
            const x = WHEEL_CENTRE[0] + ux * r - uy * lat, y = WHEEL_CENTRE[1] + uy * r + ux * lat;
            let md = Infinity;
            for (const p of monsterPts) md = Math.min(md, Math.hypot(p[0] - x, p[1] - y));
            cands.push({ land, x: Math.round(x), y: Math.round(y), md: Math.round(md) });
          }
        }
      }
      cands.sort((p, q) => q.md - p.md);
      const perLand = Object.create(null), tryList = [];
      for (const c of cands) { perLand[c.land] = (perLand[c.land] || 0) + 1; if (perLand[c.land] <= 12) tryList.push(c); }
      let spot = null;
      for (const c of tryList.slice(0, 12)) {
        await H.hopTo(A, c.x, c.y, { tries: 90 });
        await A.page.waitForTimeout(1200);
        const ok = await A.page.evaluate(({ x, y }) => {
          const S = window._gameState.current;
          const dry = (px, py) => !(window.__btIsSolid && window.__btIsSolid(px, py)) && !(window.__btSwimAt && window.__btSwimAt(px, py).swim);
          const near = (S.monsters || []).filter((m) => m && m.alive !== false && Math.hypot(m.x - x, m.y - y) < 300).length;
          let clear = true;
          for (let k = 0; k <= 90; k += 10) clear = clear && dry(x + k, y);
          return { dry: clear, near };
        }, c);
        if (ok.dry && ok.near === 0) { spot = c; break; }
      }
      await H.hopTo(B, spot ? spot.x + 90 : 0, spot ? spot.y : 0, { tries: 260 });
      for (let i = 0; i < 2; i++) {   /* a step each, so each is heard where they are */
        await B.page.keyboard.down('d'); await B.page.waitForTimeout(150); await B.page.keyboard.up('d');
        await B.page.keyboard.down('a'); await B.page.waitForTimeout(150); await B.page.keyboard.up('a');
      }
      /* until A hears B where B is (a far hop is told within a roster) */
      const seen = await H.waitFor(A, () => {
        const S = window._gameState.current, ids = Object.keys(S.others || {});
        return ids.length ? ids.map((id) => [id, Math.round(Math.hypot(S.others[id].x - S.player.x, S.others[id].y - S.player.y))]) : null;
      }, (v) => !!v && v.some((e) => e[1] < 200), { timeout: 20000, label: 'A hears B beside them' }).catch(() => null);
      const bAt = await B.page.evaluate(() => { const S = window._gameState.current; return [Math.round(S.player.x), Math.round(S.player.y), S._nmlLevel || 0]; });
      const can = await A.page.evaluate((bid) => !!(window.__btNmlAsk && window.__btNmlAsk.about(bid) && window.__btNmlAsk.about(bid).can), bId);
      rec.ok(`3. both in No man's land on a quiet spot (${spot ? spot.land : 'none'}), the other bro one you may fight (guard)`, !!spot && can, { spot, can, bAt, seen });
      /* where on the page a point `up` game px over the other bro's feet is */
      const peerAt = (up) => A.page.evaluate(([bid, u]) => {
        const S = window._gameState.current, o = (S.others || {})[bid];
        if (!o) return null;
        const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
        return { x: cv.left + (o.renderX - S.camera.x) * S._worldScaleX, y: cv.top + (o.renderY - u - S.camera.y) * S._worldScaleY };
      }, [bId, up]);
      const clickRead = async (pt) => {
        await A.page.evaluate(() => { const S = window._gameState.current; S.lockedTarget = null; window.__btProbe = true; });
        if (pt) await A.page.mouse.click(pt.x, pt.y, { delay: 60 });
        await A.page.waitForTimeout(1300);
        return A.page.evaluate(() => {
          const S = window._gameState.current, lt = S.lockedTarget, ask = document.querySelector('[data-nml-ask]');
          return { ask: ask ? (ask.querySelector('[data-nml-ask-name]') || ask).innerText.replace(/\s+/g, ' ').trim() : null,
            lock: lt ? { type: lt.type, id: String(lt.id), src: lt.src || null } : null };
        });
      };
      const ignore = async () => {
        await A.page.evaluate(() => { const b = document.querySelector('[data-nml-ask-ignore]'); if (b) b.click(); });
        await A.page.waitForTimeout(800);
      };
      /* the body (30 game px over the feet) and the head (50) */
      for (const [part, up] of [['body', 30], ['head', 50]]) {
        const r = await clickRead(await peerAt(up));
        if (part === 'body') await shot(A, '3-click-body');
        rec.ok(`3. a real click on the other bro's ${part} raises "${r.ask}" (Attack?) and takes no monster as the click's pick (${JSON.stringify(r.lock)})`,
          !!r.ask && /doorphone/i.test(r.ask) && !(r.lock && r.lock.type === 'monster' && r.lock.src === 'tap'), r);
        await ignore();
      }
      /* two bros a step apart (about 30 px): a click on the far one's body
         picks the far one -- the nearest to the pointer, not the first one
         the page knows (v2.3.3837; the press and the click name the same) */
      const D = await into(browser, wsPort, webPort, 'Doorfar', { viewport: { width: 900, height: 700 }, wide: true });
      try {
        const dId = await H.readState(D, (S) => S.myId);
        await D.page.evaluate(() => { const S = window._gameState.current; if (S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
        await H.waitFor(D, (S) => (S.rpg && S.rpg._quests && S.rpg._quests.tut_1) || null, (v) => !!v, { timeout: 10000, label: 'the third takes tut_1' }).catch(() => null);
        await H.devOp(wsPort, 'vitals', dId, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
        await H.hopTo(D, pt[0] + 200, pt[1] + 150, { tries: 260 });
        const cAt = await B.page.evaluate(() => { const p = window._gameState.current.player; return [p.x, p.y]; });
        await H.hopTo(D, cAt[0] + 30, cAt[1], { tries: 260 });
        for (let i = 0; i < 2; i++) { await D.page.keyboard.down('d'); await D.page.waitForTimeout(60); await D.page.keyboard.up('d'); }
        let two = null;
        for (let i = 0; i < 40 && !(two != null && two < 60); i++) {
          two = await A.page.evaluate((ids) => {
            const S = window._gameState.current, o1 = (S.others || {})[ids[0]], o2 = (S.others || {})[ids[1]];
            return o1 && o2 ? Math.round(Math.hypot(o1.x - o2.x, o1.y - o2.y)) : null;
          }, [bId, dId]);
          if (!(two != null && two < 60)) await A.page.waitForTimeout(500);
        }
        const dAt = await A.page.evaluate(([cid, did]) => {
          const S = window._gameState.current, oc = (S.others || {})[cid], od = (S.others || {})[did];
          if (!oc || !od) return null;
          const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
          return { far: od.renderX >= oc.renderX ? did : cid, gap: Math.round(Math.hypot(oc.renderX - od.renderX, oc.renderY - od.renderY)),
            d: { x: cv.left + (od.renderX - S.camera.x) * S._worldScaleX, y: cv.top + (od.renderY - 30 - S.camera.y) * S._worldScaleY } };
        }, [bId, dId]);
        const rD = dAt ? await clickRead(dAt.d) : { ask: null };
        await shot(A, '3-click-near-pair');
        rec.ok(`3. two bros ${dAt && dAt.gap} px apart: a click on Doorfar's body picks Doorfar, not Doorphone ("${rD.ask}")`,
          !!dAt && dAt.gap < 60 && !!rD.ask && /doorfar/i.test(rD.ask), { dAt, rD, two });
        await ignore();
        if (D.errors.length) rec.ok('3. ...no page errors on the third bro\'s page', false, D.errors.slice(0, 3));
      } finally {
        await D.ctx.close().catch(() => {});
      }
      /* a monster standing beside a player: the pointer ON the monster takes the monster */
      const mon = await A.page.evaluate(() => {
        const S = window._gameState.current, p = S.player;
        const m = (S.monsters || []).filter((q) => q && q.alive !== false && (q.curHp == null || q.curHp > 0))
          .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        return m ? { id: String(m.id), x: m.x, y: m.y } : null;
      });
      if (mon) {
        await H.hopTo(A, mon.x - 110, mon.y + 10, { tries: 120 });
        await H.hopTo(B, mon.x + 30, mon.y + 6, { tries: 120 });
        for (let i = 0; i < 2; i++) { await B.page.keyboard.down('a'); await B.page.waitForTimeout(80); await B.page.keyboard.up('a'); }
        await A.page.waitForTimeout(1500);
      }
      const onMon = await A.page.evaluate(([mid, bid]) => {
        const S = window._gameState.current, m = (S.monsters || []).find((q) => q && String(q.id) === mid), o = (S.others || {})[bid];
        if (!m) return null;
        const cv = document.querySelector('canvas.brotown-canvas').getBoundingClientRect();
        return { x: cv.left + (m.x - S.camera.x) * S._worldScaleX, y: cv.top + (m.y - 12 - S.camera.y) * S._worldScaleY,
          gap: o ? Math.round(Math.hypot(o.x - m.x, o.y - m.y)) : null };
      }, [mon ? mon.id : '', bId]);
      const rm = await clickRead(onMon);
      await shot(A, '3-click-monster');
      rec.ok(`3. a monster beside the other bro (${onMon && onMon.gap} px apart): the pointer on the monster locks the monster (${JSON.stringify(rm.lock)}), no "Attack?"`,
        !!onMon && !!rm.lock && rm.lock.type === 'monster' && rm.lock.id === (mon && mon.id) && !rm.ask, { mon, onMon, rm });
    }
    const errs = [].concat(A.errors, C.errors);
    rec.ok('4. no page errors', errs.length === 0, errs.slice(0, 3));
  } finally {
    for (const P of [A, C]) await P.ctx.close().catch(() => {});
  }
}
