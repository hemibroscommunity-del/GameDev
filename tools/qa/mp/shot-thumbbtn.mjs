/* ═══ THE THUMB BUTTONS, PHOTOGRAPHED AND MEASURED (v2.3.3740) ═══
 *
 * The owner, 2026-10-28, on an iPhone the night before the judges: "move the
 * contextual button slightly down and to the right more.  Move the jump
 * button more to the left. ... Just make sure the change doesn't overlap any
 * buttons there though (some appear only during combat).  This is portrait on
 * mobile" (docs/specs/jumping.md, "v2.3.3740").
 *
 * Like shot-btnmove (v2.3.2574) this asserts nothing about WHERE the buttons
 * are -- it runs unchanged on the old code for the "before" pictures -- but
 * it does print every pair of touch boxes that comes closer than 8 px, and
 * takes two pictures of each phone in a fight with EVERY combat button up at
 * once (Special, Whirlwind, Block, Shield Bash, TRAP, quick eat, Element
 * Burst, Sprint, Jump), plus one out of a fight:
 *   tools/qa/mp/out/thumbbtn-<label>-<w>x<h>-<fight|calm>.png
 *   tools/qa/mp/out/thumbbtn-<label>-<w>x<h>-fight-boxes.png  (each touch box outlined)
 * The fight is set on the page (a still monster, the lock, the guard pinned
 * up, a box trap and a fish in the bag, a fire sword), as shot-btnmove does:
 * these are layout pictures, not a fight.
 *
 *   THUMBBTN_LABEL=before node tools/qa/mp/run.mjs thumbbtn
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONES = [
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];
const AIR = 8;   /* the least clear air between two touch boxes */

/* every touch control's box, named, with what the page paints of it */
const NAMED = [
  ['disc', '.bt-rjoy-base'], ['move', '.bt-joystick-base'], ['jump', '[data-jump]'], ['block', '[data-shield]'],
  ['bash', '[data-ability="bash"]'], ['whirl', '[data-ability="whirl"]'], ['special', '[data-special]'],
  ['sprint', '[data-sprint]'], ['trap', '[data-trap-button]'], ['eat', '.bt-quickeat-btn'], ['burst', '.bt-burst-btn'],
  ['weapon', '[data-weapon-chip]'], ['bell', '[data-world-chat-toggle]'], ['door', '#thumb-door'],
];
const boxes = (P) => P.page.evaluate((named) => {
  const shown = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  };
  const out = [];
  for (const [n, sel] of named) {
    const el = document.querySelector(sel);
    if (!shown(el)) continue;
    const r = el.getBoundingClientRect();
    out.push({ n, l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom),
      painted: Number(getComputedStyle(el).opacity) > 0.05 });
  }
  let dash = null;
  for (const s of ['.bt-dashboard', '.bt-bottom-dashboard']) {
    const el = document.querySelector(s);
    if (shown(el)) { dash = Math.round(el.getBoundingClientRect().top); break; }
  }
  return { vw: innerWidth, vh: innerHeight, dash, list: out };
}, NAMED);

const gapOf = (a, b) => {
  const dx = Math.max(a.l - b.r, b.l - a.r), dy = Math.max(a.t - b.b, b.t - a.b);
  return dx < 0 && dy < 0 ? -1 : Math.max(dx, dy);
};
function report(tag, d) {
  console.log(`\n### ${tag}  (${d.vw}x${d.vh}, dashboard top ${d.dash})`);
  for (const q of d.list) console.log(`      ${q.n.padEnd(8)} x ${q.l}..${q.r}  y ${q.t}..${q.b}${q.painted ? '' : '  (box only, not painted)'}${d.dash != null && q.b > d.dash ? '  <-- UNDER THE DASHBOARD' : ''}`);
  const tight = [];
  for (let i = 0; i < d.list.length; i++) for (let j = i + 1; j < d.list.length; j++) {
    const g = gapOf(d.list[i], d.list[j]);
    if (g < AIR) tight.push(`${d.list[i].n}/${d.list[j].n} ${g < 0 ? 'OVERLAP' : g + ' px'}`);
  }
  console.log(`      under ${AIR} px of air: ${tight.length ? tight.join(', ') : 'none'}`);
  return tight;
}

/* the fight, on the page (shot-btnmove's fixture, with TRAP, quick eat and
   the jump's neighbours added) */
const seed = (P, fight, guard) => P.page.evaluate(([on, up]) => {
  const S = window._gameState.current, R = S.rpg;
  R.shield = R.shield || { name: 'Pine Shield', type: 'shield' };
  R.weapon = { type: 'sword', name: 'Ember Sword', gearBase: 'copper', dmg: 5, element1: 'fire' };
  R.activeSlot = 'melee';
  R.inventory = R.inventory || {};
  window.__thumbFight = !!on;
  window.__thumbGuard = !!up;
  if (!window.__thumbPinned) {
    window.__thumbPinned = true;
    const tick = () => {
      const s = window._gameState.current, r = s && s.rpg;
      if (r) {
        const f = window.__thumbFight;
        s._shieldUp = f && window.__thumbGuard; s._shieldKb = false;
        r.stamina = r.maxStamina || 100; r.mana = r.maxMana || 100;
        r.inventory.trap_box = f ? 3 : 0;
        r.inventory.cooked_fish_minnow = f ? 3 : 0;
        if (f && r.maxHp) r.hp = Math.max(1, r.maxHp - 50);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  if (!R.prog3) R.prog3 = {};
  if (!R.prog3.sk) R.prog3.sk = {};
  for (const k of ['sword', 'bow', 'staff']) if (!R.prog3.sk[k]) R.prog3.sk[k] = { level: 1, xp: 0 };
  R.prog3.sk.sword.level = 6;
  S._serverMonsters = false;
  if (on) {
    const mx = S.player.x + 70, my = S.player.y;
    const mon = { id: 'thumb_fodder', arch: 'fodder', archetype: 'fodder', type: 'fodder',
      x: mx, y: my, renderX: mx, renderY: my, spawnX: mx, spawnY: my, targetX: mx, targetY: my,
      hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0, spd: 0, vx: 0, vy: 0,
      home: 'frost', alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
      respawnAt: 0, moveTimer: 0, _stuckArrows: [] };
    S.monsters = [mon];
    S.lockedTarget = { type: 'monster', id: mon.id, ref: mon, src: 'tap' };
  } else {
    S.monsters = [];
    S.lockedTarget = null;
  }
  if (R) { R._quests = R._quests || {}; R._quests.tut_4 = 'turnedIn'; }
}, [fight, guard]);

/* a building's "Enter" button as the game draws it at a Wheel door (BroTown,
   v2.3.3032: two lines, a little left of the middle, over the band) -- the
   one always-on button the JUMP button must keep clear of at the band's foot */
const door = (P, on) => P.page.evaluate((show) => {
  const old = document.getElementById('thumb-door');
  if (old) old.remove();
  if (!show) return;
  const b = document.createElement('button');
  b.id = 'thumb-door';
  b.className = 'bt-interact-prompt';
  b.style.cssText = 'left:calc(50% - 10px);display:flex;align-items:center;gap:5px;padding:6px 12px;line-height:1.15;text-align:left';
  b.innerHTML = '<span style="width:16px;height:16px;display:inline-block;margin-right:3px;background:#a87"></span><span style="display:block"><span style="display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;opacity:.7"> Enter </span><span style="display:block">AUCTION HOUSE</span></span>';
  (document.querySelector('.brotown-wrap') || document.body).appendChild(b);
}, on);

/* each touch box outlined, its name over it */
const outline = (P, d) => P.page.evaluate((list) => {
  const host = document.createElement('div');
  host.id = 'thumb-outlines';
  host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999';
  for (const q of list) {
    const o = document.createElement('div');
    const c = q.n === 'jump' ? '#ff3b3b' : q.n === 'disc' ? '#ffd400' : '#3bf0ff';
    o.style.cssText = `position:fixed;left:${q.l}px;top:${q.t}px;width:${q.r - q.l}px;height:${q.b - q.t}px;outline:2px solid ${c};box-sizing:border-box`;
    const t = document.createElement('span');
    t.textContent = q.n;
    t.style.cssText = `position:absolute;left:1px;top:1px;font:bold 10px sans-serif;color:${c};text-shadow:0 0 2px #000,0 0 2px #000`;
    o.appendChild(t);
    host.appendChild(o);
  }
  document.body.appendChild(host);
}, d.list);
const unoutline = (P) => P.page.evaluate(() => { const h = document.getElementById('thumb-outlines'); if (h) h.remove(); });

export async function run({ browser, wsPort, webPort, rec }) {
  const label = process.env.THUMBBTN_LABEL || 'after';
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  console.log(`\n═══════ THUMB BUTTONS: ${label.toUpperCase()} ═══════`);
  const tightAll = [];
  for (const ph of PHONES) {
    const tag = `${ph.width}x${ph.height}`;
    const P = await H.newPlayer(browser, { name: 'Thumb' + ph.width, wsPort, webPort, viewport: { width: ph.width, height: ph.height }, touch: true, dpr: 2, world: 'wheel' });
    try {
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
        (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
      rec.ok(`${tag}: in the world (guard)`, !!inW, inW);
      if (!inW) continue;
      const me = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
      await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
      await P.page.waitForTimeout(1500);

      await seed(P, false, false);
      await door(P, true);
      await P.page.waitForTimeout(1200);
      const calm = await boxes(P);
      tightAll.push(...report(`${label} / ${tag} / out of a fight, at a door`, calm).map((t) => tag + ' calm ' + t));
      await P.page.screenshot({ path: join(OUT, `thumbbtn-${label}-${tag}-calm.png`) });
      await outline(P, calm);
      await P.page.screenshot({ path: join(OUT, `thumbbtn-${label}-${tag}-calm-boxes.png`) });
      await unoutline(P);
      await door(P, false);

      /* the guard down (Special up) and up (Shield Bash in its place) */
      let d = null;
      for (const up of [false, true]) {
        const st = up ? 'fight-guard' : 'fight';
        await seed(P, true, up);
        await P.page.waitForTimeout(1500);
        d = await boxes(P);
        tightAll.push(...report(`${label} / ${tag} / in a fight, ${up ? 'the guard up' : 'the guard down'}`, d).map((t) => tag + ' ' + st + ' ' + t));
        await P.page.screenshot({ path: join(OUT, `thumbbtn-${label}-${tag}-${st}.png`) });
        await outline(P, d);
        await P.page.screenshot({ path: join(OUT, `thumbbtn-${label}-${tag}-${st}-boxes.png`) });
        await unoutline(P);
      }
      const names = d.list.map((q) => q.n);
      rec.ok(`${tag}: in the fight every combat button is up (${names.join(', ')})`,
        ['jump', 'block', 'bash', 'whirl', 'trap', 'eat', 'sprint'].every((n) => names.includes(n)), names);
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
  console.log(`\n  pairs under ${AIR} px, all phones: ${tightAll.length ? tightAll.join('; ') : 'none'}`);
  rec.ok(`thumbbtn: captured the ${label} layout at every phone (pictures in tools/qa/mp/out)`, true, { label });
}
