/* ═══ THE COMBAT-BUTTON LAYOUT, MEASURED AND PHOTOGRAPHED (v2.3.2574) ═══
 *
 * The owner asked to be shown, not told: "Measure, don't estimate."  So this
 * captures the same eight states on BOTH sides of the change -- 360 and 390
 * wide, portrait and landscape, in combat and out of it -- writes a real PNG
 * for each, and prints the full pairwise gap table between every combat
 * control that is actually painted.
 *
 * WHY IT IS A SEPARATE SCRIPT and not more rows in mp-abilslot: it has to run
 * unchanged against the OLD code to produce the "before" column, and a file of
 * assertions cannot do that (every one of them would fail, which is the point
 * of the change and useless as evidence).  This prints numbers and takes
 * pictures; it asserts nothing.  Copy it into a worktree at the base commit,
 * run it there, and the two runs are directly comparable because it is the
 * same file.
 *
 * IN COMBAT vs OUT OF COMBAT IS NOT COSMETIC.  Whirlwind is gone entirely out
 * of combat (v2.3.2561) and Bash only exists with the guard raised, so the SET
 * of visible buttons changes -- a layout that only looks right with everything
 * on screen is not checked.  Both are captured.
 *
 *   node tools/qa/mp/run.mjs btnmove
 */
import * as H from './harness.mjs';

const VIEWS = [
  { w: 390, h: 844, tag: '390-portrait' },
  { w: 360, h: 800, tag: '360-portrait' },
  { w: 844, h: 390, tag: 'landscape', enterAt: { width: 390, height: 844 } },
];

/* Every combat control, by the attribute it actually carries. */
const read = (P) => P.page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0.05) return null;
    if (r.width <= 0) return null;
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      r2: Math.round(r.right), b2: Math.round(r.bottom),
      cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
  };
  const dash = document.querySelector('.bt-dashboard');
  return {
    vw: window.innerWidth, vh: window.innerHeight,
    dashTop: dash ? Math.round(dash.getBoundingClientRect().top) : null,
    engaged: !!(window._gameState.current && window._gameState.current.lockedTarget
      && window._gameState.current.lockedTarget.ref),
    Block: box('[data-shield]'),
    Bash: box('[data-ability="bash"]'),
    Whirl: box('[data-ability="whirl"]'),
    Special: box('[data-special]'),
    Burst: box('.bt-burst-btn'),
    AttackDisc: box('.bt-rjoy-base'),
    MoveDisc: box('.bt-joystick-base'),
    CoachCard: box('[data-coach-card]'),
  };
});

const BUTTONS = ['Block', 'Bash', 'Whirl', 'Special', 'Burst'];
const gap = (a, b) => {
  const dx = Math.max(0, Math.max(a.x - b.r2, b.x - a.r2));
  const dy = Math.max(0, Math.max(a.y - b.b2, b.y - a.b2));
  if (dx === 0 && dy === 0) return -1;
  return Math.round(Math.hypot(dx, dy));
};
const c2c = (a, b) => Math.round(Math.hypot(a.cx - b.cx, a.cy - b.cy));

function report(label, d) {
  const live = BUTTONS.filter((n) => d[n]);
  const rows = [];
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = d[live[i]], b = d[live[j]];
    rows.push({ pair: `${live[i]}/${live[j]}`, c2c: c2c(a, b), edge: gap(a, b) });
  }
  rows.sort((x, y) => x.edge - y.edge);
  console.log(`\n### ${label}  (${d.vw}x${d.vh}, engaged=${d.engaged}, dashTop=${d.dashTop})`);
  console.log(`    visible buttons: ${live.length ? live.join(', ') : 'NONE'}`);
  for (const n of live) console.log(`      ${n.padEnd(8)} x ${d[n].x}..${d[n].r2}  y ${d[n].y}..${d[n].b2}  (${d[n].w}x${d[n].h})`);
  for (const n of ['AttackDisc', 'MoveDisc', 'CoachCard']) {
    if (d[n]) console.log(`      ${n.padEnd(11)} x ${d[n].x}..${d[n].r2}  y ${d[n].y}..${d[n].b2}`);
  }
  if (!rows.length) console.log('      (fewer than two buttons painted -- no pairs)');
  for (const r of rows) console.log(`      GAP ${r.pair.padEnd(16)} centre-to-centre ${String(r.c2c).padStart(4)}px   edge-to-edge ${r.edge < 0 ? 'OVERLAP' : String(r.edge).padStart(3) + 'px'}`);
  if (rows.length) console.log(`      >>> TIGHTEST PAIR: ${rows[0].pair} at ${rows[0].edge < 0 ? 'OVERLAP' : rows[0].edge + 'px'} edge-to-edge`);
  /* The tallest control, against the landscape "up among the health bars"
     ceiling v2.3.2542 set at ~283px above the band. */
  const tops = live.map((n) => ({ n, above: (d.dashTop || d.vh) - d[n].y }));
  tops.sort((a, b) => b.above - a.above);
  if (tops.length) console.log(`      tallest control: ${tops[0].n} at ${tops[0].above}px above the dashboard band`);
  /* Does the coach card clear the whole band?  (v2.3.2564's rule.) */
  if (d.CoachCard) {
    const hit = live.filter((n) => !(d[n].r2 <= d.CoachCard.x || d[n].x >= d.CoachCard.r2
      || d[n].b2 <= d.CoachCard.y || d[n].y >= d.CoachCard.b2));
    console.log(`      coach card overlaps: ${hit.length ? hit.join(', ') + '  <-- BAD' : 'nothing'}`);
  }
}

/* Combat state, shaped exactly like mp-abilslot's fixture so the two agree. */
const seed = (P, o) => P.page.evaluate((opt) => {
  const S = window._gameState.current;
  S.rpg.shield = { name: 'Pine Shield', type: 'shield' };
  S.rpg.weapon = { type: 'sword', name: 'Ember Sword', gearBase: 'copper', dmg: 5, element1: 'fire' };
  S.rpg.activeSlot = 'melee';
  S.rpg.stamina = S.rpg.maxStamina || 100;
  S.rpg.mana = S.rpg.maxMana || 100;
  S.rpg.level = 20;
  /* prog3CharLevel is the SUM of the three skill levels (each floored at 1),
     and it is what the burst gate reads when the blob is live -- so sword 6
     puts the character at 8.  `rpg.level` covers the non-prog3 path. */
  if (!S.rpg.prog3) S.rpg.prog3 = {};
  if (!S.rpg.prog3.sk) S.rpg.prog3.sk = {};
  for (const k of ['sword', 'bow', 'staff']) {
    if (!S.rpg.prog3.sk[k]) S.rpg.prog3.sk[k] = { level: 1, xp: 0 };
  }
  S.rpg.prog3.sk.sword.level = 6;
  /* The shield is pinned on a rAF loop: the game rewrites `_shieldUp` every
     frame from its own toggle, so one assignment is gone before the shot. */
  window.__pin = !!opt.shieldUp;
  if (!window.__pinned) {
    window.__pinned = true;
    const tick = () => { const S2 = window._gameState.current;
      if (S2) { S2._shieldUp = !!window.__pin; S2._shieldKb = false; }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  S._serverMonsters = false;
  if (opt.engaged) {
    const mx = S.player.x + 90, my = S.player.y;
    const mon = { id: 'shot_fodder', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: mx, y: my, renderX: mx, renderY: my, spawnX: mx, spawnY: my, targetX: mx, targetY: my,
      hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0, spd: 0, vx: 0, vy: 0,
      alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [] };
    S.monsters = [mon];
    S.lockedTarget = { type: 'monster', id: mon.id, ref: mon, src: 'tap' };
  } else {
    /* OUT of combat: no monster anywhere near, and the lock dropped.  This is
       the state Whirlwind vanishes in (v2.3.2561). */
    S.monsters = [];
    S.lockedTarget = null;
  }
  /* Retire the onboarding coach for the layout shots, the way mp-joyfade does
     -- except in the coach pass, which wants it. */
  if (opt.retireCoach && S.rpg) { S.rpg._quests = S.rpg._quests || {}; S.rpg._quests.tut_4 = 'turnedIn'; }
}, o);

export async function run({ browser, wsPort, webPort, rec }) {
  const label = process.env.BTNMOVE_LABEL || 'after';
  console.log(`\n═══════ COMBAT BUTTON LAYOUT: ${label.toUpperCase()} ═══════`);
  for (const V of VIEWS) {
    const P = await H.newPlayer(browser, { name: `Shot${V.w}`, wsPort, webPort,
      touch: true, viewport: V.enterAt || { width: V.w, height: V.h } });
    await H.enterWorld(P);
    if (V.enterAt) {
      await P.page.setViewportSize({ width: V.w, height: V.h });
      await P.page.waitForTimeout(1200);
    }
    await P.page.waitForTimeout(2200);
    /* IN COMBAT, guard raised: every button that can coexist is on screen at
       once, which is the worst case for crowding. */
    await seed(P, { engaged: true, shieldUp: true, retireCoach: true });
    await P.page.waitForTimeout(1100);
    report(`${label} / ${V.tag} / IN COMBAT, shield UP`, await read(P));
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/btnmove-${label}-${V.tag}-combat.png` });
    /* IN COMBAT, guard down: Bash goes, Special arrives. */
    await seed(P, { engaged: true, shieldUp: false, retireCoach: true });
    await P.page.waitForTimeout(900);
    report(`${label} / ${V.tag} / IN COMBAT, shield DOWN`, await read(P));
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/btnmove-${label}-${V.tag}-combat-down.png` });
    /* OUT of combat: Whirlwind is gone entirely.  The layout has to read
       correctly with a hole in it. */
    await seed(P, { engaged: false, shieldUp: false, retireCoach: true });
    await P.page.waitForTimeout(1100);
    report(`${label} / ${V.tag} / OUT OF COMBAT`, await read(P));
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/btnmove-${label}-${V.tag}-idle.png` });
    await P.ctx.close().catch(() => {});
  }
  rec.ok(`btnmove: captured the ${label} layout at every view (measurement only -- see stdout)`, true, { label });
}
