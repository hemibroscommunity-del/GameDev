/* ═══ mp-dmgsize (v2.3.3033): DAMAGE NUMBERS, 1.5-2x BIGGER ═══
 *
 * Owner, 2026-10-04: "Damage numbers for players and monsters needs to be
 * about anywhere from 1.5-2x bigger".
 *
 * On a phone (390 x 844, dpr 3), in the Wheel, read off the LIVE pixi objects
 * the renderer drew (the record is not what the screen shows -- mp-critpreview's
 * lesson):
 *   1. a hit you deal (the sword's number) and a crit: each drawn at DMG_SCALE
 *      times the size it was (21 / 38 world px), the crit still 1.8x the plain
 *      one, each icon in proportion (the 22 px cap scaled), the gap after the
 *      number scaled so the mark never touches the digits;
 *   2. a hit taken, through the game's own dispatcher: the same size, spawned
 *      over your head's band and clear of it (the bigger glyph's extra half
 *      height is lifted, not spent on the HP bar);
 *   3. a stack of numbers at one spot: none lies on another (spacing follows
 *      the sizes), and a kill's XP and gold stack above the number;
 *   4. what is NOT a damage number is the size it was: "Blocked!", "Dodged",
 *      "+30 XP", "+25 G", a heal's "+12";
 *   5. pictures: tools/qa/mp/out/dmgsize-<tag>-*.png (run against another
 *      build with QA_DIST and they are the "before").
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const TAG = process.env.DMGSIZE_TAG || (process.env.QA_DIST ? 'before' : 'after');
/* what a number was before this change: effectsRenderer DMG_FONT_PX / DMG_CRIT_FONT_PX, and the icon cap */
const OLD = { font: 21, crit: 38, cap: 22 };

/* One monster_attack on you, through the game's own dispatcher (mp-elemhits' way). */
const hitMe = (P, p) => P.page.evaluate((p) => {
  const S = window._gameState.current;
  window.__btDispatch({ type: 'monster_attack', payload: Object.assign({
    monsterId: 'qa-dmg', targetId: S.myId, dmg: 4, dmgTaken: 4, zone: S.currentZone,
    attackerX: S.player.x + 24, attackerY: S.player.y, ability: 'qa' }, p) });
}, p);

/* Popups as pushDmgPopup builds them (the shape is {x, y, text, color, ts} + extras), at the
   anchor a number spawns at over your head's band -- combatHelpers heroPopupY. */
const pushAt = (P, list) => P.page.evaluate((list) => {
  const S = window._gameState.current;
  const top = S._selfBandTopY;
  const y0 = (typeof top === 'number' ? top : S.player.y - 102) - 34;
  const now = Date.now();
  list.forEach((p, i) => {
    S.dmgNumbers.push(Object.assign({ x: S.player.x + (p.dx || 0), y: y0 + (p.dy || 0), color: '#fff', ts: now + (p.tsAdd || 0), ttl: 12, rise: 0 }, p.rec));
  });
  return { y0, top: typeof top === 'number' ? top : null };
}, list);

/* A screenshot takes seconds on this box's software renderer: hold every live number still (no rise, a long
   life) so the picture shows where it spawned and the measurement does not depend on how late it is read. */
const hold = (P) => P.page.evaluate(() => { for (const d of window._gameState.current.dmgNumbers) { d.rise = 0; d.ttl = 12; } });
/* Clear the numbers the way the game does -- age them out, and the renderer destroys their Texts (emptying the
   array leaves the Texts drawn where they were). */
const clearPops = async (P) => {
  await P.page.evaluate(() => { for (const d of window._gameState.current.dmgNumbers) { d.ts = 0; d.ttl = 0.001; } });
  for (let i = 0; i < 40; i++) {
    const n = await P.page.evaluate(() => window._gameState.current.dmgNumbers.length);
    if (!n) break;
    await P.page.waitForTimeout(250);
  }
};

/* What the renderer drew for the live popups (those with a Text), by text. */
const drawn = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const band = typeof S._selfBandTopY === 'number' ? S._selfBandTopY : null;
  const rows = [];
  for (const d of (S.dmgNumbers || [])) {
    const t = d._pixiText;
    if (!t || t.destroyed) continue;
    const ic = d._pixiIcon && !d._pixiIcon.destroyed ? d._pixiIcon : null;
    /* a glyph-atlas number is a BitmapText at the bake's size (style.fontSize) scaled down to its font */
    const font = t._bmpBaseScale ? t._bmpBaseScale * (+t.style.fontSize || 100) : (t.style && +t.style.fontSize) || null;
    rows.push({
      text: String(d.text), crit: !!d.crit, taken: !!d.taken, icon: d.iconKey || null, ts: d.ts,
      font: font == null ? null : +font.toFixed(2),
      x: +t.x.toFixed(1), y: +t.y.toFixed(1), w: +t.width.toFixed(1), h: +t.height.toFixed(1),
      iconX: ic ? +ic.x.toFixed(1) : null, iconW: ic ? +ic.width.toFixed(1) : null, iconH: ic ? +ic.height.toFixed(2) : null,
      stroke: !t._bmpBaseScale && t.style && t.style.stroke ? +(+t.style.stroke.width || 0).toFixed(2) : null,
      halo: !t._bmpBaseScale && t.style && t.style.dropShadow ? +(+t.style.dropShadow.blur || 0).toFixed(2) : null,
      age: +((Date.now() - d.ts) / 1000).toFixed(2), band, lift: +((d._lift || 0)).toFixed(1),
      /* where it was spawned (before any rise), and the air between the glyph box's bottom edge and the band's top */
      spawnY: +(d.y + (d._stackOffset || 0) - (d._lift || 0)).toFixed(1),
      air: band == null ? null : +(band - ((d.y + (d._stackOffset || 0) - (d._lift || 0)) + t.height / 2)).toFixed(1),
    });
  }
  return rows;
});
const by = (rows, text) => rows.find((r) => r.text === text) || null;

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Bigdigits', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  let stopAlive = false;
  try {
    await H.enterWorld(P);
    let zone = null;
    for (let i = 0; i < 120; i++) {
      zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      if (zone === 'wheel') break;
      await P.page.waitForTimeout(500);
    }
    await P.page.waitForTimeout(2500);
    await P.page.keyboard.press('Escape').catch(() => {});
    await P.page.waitForTimeout(400);
    /* A real keystroke on a loop (mp-elemhits'): the page logs itself out after two minutes without REAL input,
       and this scenario ends with a walk to a land. */
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    const myId = await H.readState(P, (S) => S.myId);
    const scale = await P.page.evaluate(() => (typeof window.__btDmgScale === 'number' ? window.__btDmgScale : null));
    const k = scale || 1;
    rec.ok(`setup: in the Wheel (${zone}); the number scale is ${scale == null ? 'not published (an older build)' : scale}`, zone === 'wheel', { zone, scale });

    const frame = async (name, rows) => {
      /* framed from the renderer's own bounds, the player's body below the numbers */
      const box = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const parts = [];
        for (const d of (S.dmgNumbers || [])) for (const o of [d._pixiText, d._pixiIcon]) {
          if (o && !o.destroyed) { const b = o.getBounds(); if (b.width) parts.push(b); }
        }
        if (!parts.length) return null;
        const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect();
        return { left: r.left, top: r.top, x0: Math.min(...parts.map((b) => b.x)), x1: Math.max(...parts.map((b) => b.x + b.width)),
          y0: Math.min(...parts.map((b) => b.y)), y1: Math.max(...parts.map((b) => b.y + b.height)), vw: innerWidth, vh: innerHeight };
      });
      if (!box) return;
      const padX = 70, padTop = 40, padBot = 150;
      const x = Math.max(0, Math.round(box.left + box.x0 - padX));
      const y = Math.max(0, Math.round(box.top + box.y0 - padTop));
      const clip = { x, y, width: Math.min(box.vw - x, Math.round(box.x1 - box.x0 + padX * 2)), height: Math.min(box.vh - y, Math.round(box.y1 - box.y0 + padTop + padBot)) };
      await P.page.screenshot({ path: join(OUT, `dmgsize-${TAG}-${name}.png`), clip }).catch(() => {});
    };

    /* ── 1. hits you deal: a plain one and a crit (the preview hook spawns them through pushDmgPopup) ── */
    await clearPops(P);
    const sp = await H.callFn(P, 'previewCritVsNormal', 12, 41);
    rec.ok('the preview hook spawned a plain hit and a crit (guard)', !!sp && !sp.__missing, sp);
    await P.page.waitForTimeout(450);
    await hold(P);
    let rows = await drawn(P);
    const n1 = by(rows, '12'), c1 = by(rows, '41');
    console.log('    dealt: ' + JSON.stringify({ plain: n1, crit: c1 }));
    rec.ok('both numbers reached the renderer (guard)', !!n1 && !!c1, rows);
    if (n1 && c1) {
      const near = (a, b, e = 0.6) => a != null && Math.abs(a - b) <= e;
      rec.ok(`a plain hit is ${scale || '?'}x its old ${OLD.font} px (drawn ${n1.font}) and a crit ${scale || '?'}x its old ${OLD.crit} px (drawn ${c1.font}), the scale between 1.5 and 2`,
        scale != null && scale >= 1.5 && scale <= 2 && near(n1.font, OLD.font * k) && near(c1.font, OLD.crit * k), { n: n1.font, c: c1.font, scale });
      rec.ok(`...the crit still ${(OLD.crit / OLD.font).toFixed(2)}x the plain one (the gap v2.3.2211 asked for is kept)`,
        near(c1.font / n1.font, OLD.crit / OLD.font, 0.02), { ratio: +(c1.font / n1.font).toFixed(3) });
      rec.ok(`the sword mark grew with it: ${n1.iconH} px, the number's height capped at ${OLD.cap * k} (was ${OLD.cap})`,
        near(n1.iconH, Math.min(n1.font, OLD.cap * k)), { iconH: n1.iconH, cap: OLD.cap * k });
      rec.ok(`...the crit mark at 1.15x its number (${c1.iconH} for ${c1.font})`, near(c1.iconH, Math.round(c1.font * 1.15)), { iconH: c1.iconH, font: c1.font });
      const gapN = n1.iconX - (n1.x + n1.w / 2), gapC = c1.iconX - (c1.x + c1.w / 2);
      rec.ok(`the gap after the digits grew too (${gapN.toFixed(1)} px, was 10; the crit's ${gapC.toFixed(1)}, was 13.3), so a mark never touches a digit`,
        gapN >= Math.max(10, OLD.font * 0.35 * k) - 0.6 && gapC >= Math.max(10, OLD.crit * 0.35 * k) - 0.6, { gapN, gapC });
    }

    /* the same two numbers as they stand over a monster: at the spawn height a monster's number has
       (band top - 34, combatHelpers monsterPopupY / heroPopupY), side by side, for the picture */
    await clearPops(P);
    await pushAt(P, [
      { rec: { text: '63', iconKey: 'sword', color: '#fff' }, dx: -58, tsAdd: 0 },
      { rec: { text: '152', iconKey: 'crit', crit: true, color: '#FFF27A' }, dx: 58, tsAdd: 1 },
    ]);
    await P.page.waitForTimeout(450);
    await frame('dealt', await drawn(P));

    /* ── 2. hits you take, through the real dispatcher ── */
    await clearPops(P);
    await hitMe(P, { dmg: 7, dmgTaken: 7 });
    await hitMe(P, { dmg: 9, dmgTaken: 9, elem: 'frost' });
    await P.page.waitForTimeout(420);
    await hold(P);
    rows = await drawn(P);
    const taken = rows.filter((r) => r.taken);
    console.log('    taken: ' + JSON.stringify(taken));
    rec.ok('two hits on you reached the renderer (guard)', taken.length >= 2, rows);
    if (taken.length >= 2) {
      const t0 = taken[0];
      rec.ok(`a hit on you is the same size (${t0.font} px), its mark ${t0.iconH} px`, Math.abs(t0.font - OLD.font * k) <= 0.6 && t0.iconH != null && Math.abs(t0.iconH - Math.min(t0.font, OLD.cap * k)) <= 0.7, t0);
      /* spawned at the band's top less 34 (heroPopupY): the old 21 px number's box left 34 - 24.1/2 = 21.9 px of air */
      const oldAir = 34 - (OLD.font * 1.15) / 2;
      rec.ok(`...and as clear of your band as before: ${t0.air} px of air between its glyph box and the band's top (was ${oldAir.toFixed(1)})`,
        t0.air != null && t0.air >= oldAir - 1, t0);
    }
    await frame('taken', rows);

    /* ── 3. a stack at one spot: numbers do not lie on each other (three deep -- the neighbour window reaches two
          steps up; a fourth in one frame lay on the third before this change too) ── */
    const stackCheck = async (label, list) => {
      await clearPops(P);
      const A = await pushAt(P, list);
      await P.page.waitForTimeout(450);
      const rows = await drawn(P);
      const texts = list.map((p) => p.rec.text);
      const st = texts.map((t) => by(rows, t)).filter(Boolean);
      console.log(`    stack ${label}: ` + JSON.stringify(st.map((r) => ({ t: r.text, y: r.y, h: r.h, font: r.font }))));
      rec.ok(`${label}: all ${texts.length} reached the renderer (guard)`, st.length === texts.length, rows.map((r) => r.text));
      if (st.length === texts.length) {
        const sorted = st.slice().sort((a, b) => a.y - b.y);
        let worst = Infinity;
        for (let i = 1; i < sorted.length; i++) {
          /* centre to centre against the two numbers' glyph heights (about 0.62 of the font's em is the digits' own
             height): a kiss is fine, one number lying on another is not */
          worst = Math.min(worst, (sorted[i].y - sorted[i - 1].y) - (sorted[i - 1].font + sorted[i].font) / 2 * 0.62);
        }
        rec.ok(`${label}: the stack climbs without one number lying on another (least slack ${worst.toFixed(1)} px), all above where they spawned`,
          worst >= 0 && st.every((r) => r.y <= A.y0 + 1), { y0: A.y0, ys: sorted.map((r) => r.y) });
      }
      return rows;
    };
    rows = await stackCheck('three plain hits', [
      { rec: { text: '501', iconKey: 'sword' }, tsAdd: 0 },
      { rec: { text: '502', iconKey: 'sword' }, tsAdd: 1 },
      { rec: { text: '503', iconKey: 'arrow' }, tsAdd: 2 },
    ]);
    await frame('stack', rows);
    rows = await stackCheck('a crit between two plain hits', [
      { rec: { text: '601', iconKey: 'sword' }, tsAdd: 0 },
      { rec: { text: '777', iconKey: 'crit', crit: true, color: '#FFF27A' }, tsAdd: 1 },
      { rec: { text: '602', iconKey: 'sword' }, tsAdd: 2 },
    ]);
    await frame('stackcrit', rows);

    /* ── 3b. consecutive hits (a swing every ~0.7 s): the older climbs away from the newer.  Pushed 0.75 s apart, as
          they arrive, so the second finds the first too old to stack on; both are read in one frame, so the gap is
          the climb times the time between them -- the same at any frame rate ── */
    await clearPops(P);
    await pushAt(P, [{ rec: { text: '801', iconKey: 'sword', rise: undefined }, tsAdd: 0 }]);
    await P.page.waitForTimeout(750);
    await pushAt(P, [{ rec: { text: '802', iconKey: 'sword', rise: undefined }, tsAdd: 0 }]);
    await P.page.waitForTimeout(450);
    rows = await drawn(P);
    const h1 = by(rows, '801'), h2 = by(rows, '802');
    console.log('    consecutive: ' + JSON.stringify({ h1: h1 && { y: h1.y, ts: h1.ts, font: h1.font }, h2: h2 && { y: h2.y, ts: h2.ts, font: h2.font } }));
    rec.ok('two hits 0.75 s apart reached the renderer (guard)', !!h1 && !!h2, rows.map((r) => r.text));
    if (h1 && h2) {
      const gap = h2.y - h1.y;
      const climb = 40 * k * (h2.ts - h1.ts) / 1000;   /* what the older one has climbed over the newer */
      rec.ok(`...the older one has climbed ${gap.toFixed(1)} px clear of the newer (${climb.toFixed(1)} expected at ${40 * k} px a second; a digit is about ${(0.62 * h1.font).toFixed(1)} px tall), so they do not touch`,
        Math.abs(gap - climb) <= 3 && gap >= 0.62 * h1.font, { gap, climb, font: h1.font });
    }

    /* ── 4. a kill: the number, then the XP and the gold stack above it ── */
    await clearPops(P);
    const B = await pushAt(P, [
      { rec: { text: '63', iconKey: 'sword' }, tsAdd: 0 },
      { rec: { text: '+30 XP', color: '#60a5fa' }, tsAdd: 1 },
      { rec: { text: '+25 G', color: '#f5c542' }, tsAdd: 2 },
    ]);
    await P.page.waitForTimeout(450);
    rows = await drawn(P);
    const dm = by(rows, '63'), xp = by(rows, '+30 XP'), gd = by(rows, '+25 G');
    console.log('    kill: ' + JSON.stringify({ dm, xp, gd }));
    rec.ok('a kill\'s number, XP and gold reached the renderer (guard)', !!dm && !!xp && !!gd, rows.map((r) => r.text));
    if (dm && xp && gd) {
      rec.ok(`the XP and gold stay at the notice size (${xp.font} / ${gd.font} px), the damage number at ${dm.font}`,
        Math.abs(xp.font - OLD.font) <= 0.6 && Math.abs(gd.font - OLD.font) <= 0.6 && Math.abs(dm.font - OLD.font * k) <= 0.6, { dm: dm.font, xp: xp.font, gd: gd.font });
      const sorted = [dm, xp, gd].sort((a, b) => a.y - b.y);
      let worst = Infinity;
      for (let i = 1; i < sorted.length; i++) worst = Math.min(worst, (sorted[i].y - sorted[i - 1].y) - (sorted[i - 1].font + sorted[i].font) / 2 * 0.62);
      rec.ok(`...and none lies on another (least slack ${worst.toFixed(1)} px)`, worst >= 0, { dm: dm.y, xp: xp.y, gd: gd.y });
    }
    await frame('kill', rows);

    /* ── 5. the two numbers drawn as classic Text, not from the glyph atlas: a special attack's (a halo) and
          thorns' "-12 🌵" (an emoji, so no outline) ── */
    await clearPops(P);
    await pushAt(P, [
      { rec: { text: '88', iconKey: 'sword', special: true, color: '#ffd08a' }, dx: -58, tsAdd: 0 },
      { rec: { text: '-12 \u{1F335}', color: '#a3e635' }, dx: 58, tsAdd: 1 },
    ]);
    await P.page.waitForTimeout(450);
    rows = await drawn(P);
    const sp88 = by(rows, '88'), thorn = by(rows, '-12 \u{1F335}');
    console.log('    classic: ' + JSON.stringify({ sp88, thorn }));
    rec.ok('a special attack\'s number and a thorns number reached the renderer (guard)', !!sp88 && !!thorn, rows.map((r) => r.text));
    if (sp88 && thorn) {
      rec.ok(`the special's number is ${OLD.font * k} px with its outline (${sp88.stroke}, was 3) and halo (${sp88.halo}, was 8) in step`,
        Math.abs(sp88.font - OLD.font * k) <= 0.6 && Math.abs(sp88.stroke - 3 * k) <= 0.3 && Math.abs(sp88.halo - 8 * k) <= 0.3, sp88);
      rec.ok(`...and thorns' number is ${OLD.font * k} px too (an emoji number: no outline)`, Math.abs(thorn.font - OLD.font * k) <= 0.6, thorn);
    }
    await frame('classic', rows);

    /* ── 6. words are not damage numbers ── */
    await clearPops(P);
    await pushAt(P, [
      { rec: { text: 'Blocked!', color: '#60a5fa' }, tsAdd: 0, dx: -80 },
      { rec: { text: 'Dodged', color: '#9ca3af', taken: true }, tsAdd: 1, dx: 80 },
      { rec: { text: '+12', color: '#22c55e' }, tsAdd: 2, dx: -80, dy: -60 },
      { rec: { text: 'Swimming!', color: '#9ae0ff' }, tsAdd: 3, dx: 80, dy: -60 },
    ]);
    await P.page.waitForTimeout(450);
    rows = await drawn(P);
    const words = ['Blocked!', 'Dodged', '+12', 'Swimming!'].map((t) => by(rows, t));
    console.log('    words: ' + JSON.stringify(words.map((r) => r && { t: r.text, font: r.font })));
    rec.ok(`"Blocked!", "Dodged", a heal's "+12" and "Swimming!" keep the ${OLD.font} px they had`,
      words.every((r) => r && Math.abs(r.font - OLD.font) <= 0.6), words);
    await frame('words', rows);

    /* ── 7. over a real monster: a fire goblin of the Flame Fields takes a hit through the worker ──
          (the same `monster_damage` the game sends -- mp-wheelmonsters' fight).  Its number spawns where a monster's
          do, over ITS bar (monsterPopupY: the band's top less 34), and the lift must keep the glyph clear of it. */
    await clearPops(P);
    let real = null;
    try {
      await H.devOp(wsPort, 'quests', myId);                                   /* past the Mayor's gate: the lands are open */
      await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 5 });
      const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
      const at = WHEEL_SPAWNS.ember.points[0];
      await H.hopTo(P, at[0] + 260, at[1] + 260, { tries: 200 });
      const nearest = () => P.page.evaluate(() => {
        const S = window._gameState.current;
        const m = (S.monsters || []).filter((x) => x && x.home === 'ember' && x.alive !== false && x.hp > 0 && !/-t\d+-\d+$/.test(x.id))
          .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0];
        return m ? { id: m.id, x: m.x, y: m.y, zone: S.currentZone } : null;
      });
      let tgt = await nearest();
      if (tgt) { await H.hopTo(P, tgt.x, tgt.y + 40, { step: 60, tries: 40 }); await P.page.waitForTimeout(1500); tgt = await nearest(); }
      rec.ok('a fire goblin of the Flame Fields is in reach (guard)', !!tgt, tgt);
      if (tgt) {
        /* The goblin walks, so "where its bar is now" is not where it was when the number was made. Tag each number
           with the bar's top AT THE MOMENT it is pushed (QA only: a field on the record, nothing the game reads). */
        await P.page.evaluate((id) => {
          const S = window._gameState.current;
          const arr = S.dmgNumbers;
          if (arr.__qaTag) return;
          const orig = arr.push.bind(arr);
          arr.push = function (...a) {
            try {
              const m = (S.monsters || []).find((x) => x && x.id === id);
              if (m && m._bandTopOff != null) for (const p of a) p._qaBarTop = m.y + m._bandTopOff;
            } catch (e) { /* QA only */ }
            return orig(...a);
          };
          arr.__qaTag = true;
        }, tgt.id);
        for (let i = 0; i < 4 && !real; i++) {
          await H.sendEvent(P, 'monster_damage', { monsterId: tgt.id, zone: tgt.zone, slot: 'melee' });
          await P.page.waitForTimeout(700);
          real = await P.page.evaluate((id) => {
            const S = window._gameState.current;
            const m = (S.monsters || []).find((x) => x && x.id === id);
            if (!m) return null;
            const nums = (S.dmgNumbers || []).filter((d) => d._pixiText && !d._pixiText.destroyed && !d.taken && d._qaBarTop != null && Math.abs(d.x - m.x) < 60 && /\d/.test(String(d.text)));
            if (!nums.length) return null;
            const d = nums[nums.length - 1], t = d._pixiText;
            const top = d._qaBarTop;
            const spawnY = d.y + (d._stackOffset || 0) - (d._lift || 0);
            const font = t._bmpBaseScale ? t._bmpBaseScale * (+t.style.fontSize || 100) : (+t.style.fontSize || null);
            /* the number may be caught inside its spawn pop (1.6x for 120 ms) or the crit's wiggle: measure it at rest */
            const anim = t._bmpBaseScale ? t.scale.x / t._bmpBaseScale : 1;
            const hRest = t.height / anim;
            return { text: String(d.text), font: +font.toFixed(2), lift: +(d._lift || 0).toFixed(1), h: +hRest.toFixed(1), anim: +anim.toFixed(2),
              barTop: +top.toFixed(1), spawnY: +spawnY.toFixed(1), air: +(top - (spawnY + hRest / 2)).toFixed(1), mx: +m.x.toFixed(0), my: +m.y.toFixed(0), dy: +(d.y - top).toFixed(1) };
          }, tgt.id);
        }
        console.log('    real monster: ' + JSON.stringify(real));
        rec.ok('a hit on it reached the renderer as a number over its bar (guard)', !!real, real);
        if (real) {
          const oldAir = 34 - (OLD.font * 1.15) / 2;
          rec.ok(`the number is ${OLD.font * k} px and clear of the goblin's bar: ${real.air} px of air under its glyph box (was ${oldAir.toFixed(1)}), spawned ${(-real.dy).toFixed(1)} px over the bar's top`,
            Math.abs(real.font - OLD.font * k) <= 0.6 && real.air >= oldAir - 1, real);
          await hold(P);
          await frame('monster', await drawn(P));
        }
      }
    } catch (e) {
      rec.ok('over a real monster: no error on the way (guard)', false, String(e && e.message || e).slice(0, 300));
    }

    rec.ok('no page errors', errors.length === 0, errors);
  } finally {
    stopAlive = true;   /* the keep-alive keystrokes */
    await P.ctx.close().catch(() => {});
  }
}
