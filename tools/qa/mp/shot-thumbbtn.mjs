/* ═══ THE THUMB BUTTONS, PHOTOGRAPHED AND MEASURED (v2.3.3740) ═══
 *
 * The owner, 2026-10-28, on an iPhone the night before the judges: "move the
 * contextual button slightly down and to the right more.  Move the jump
 * button more to the left. ... Just make sure the change doesn't overlap any
 * buttons there though (some appear only during combat).  This is portrait on
 * mobile" (docs/specs/jumping.md, "v2.3.3740").
 *
 * Like shot-btnmove (v2.3.2574) it asserted nothing about WHERE the buttons
 * are (v2.3.3799: it does now, below) -- but it prints every pair of touch
 * boxes that comes closer than 8 px, and
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
 *
 * ═══ v2.3.3799: JUMP ON THE DISC'S ORBIT, SOUTH-WEST ═══
 * The owner, 2026-10-29: "I do want a change to the placement on the jump
 * button. It should be positioned orbiting southwest of the large contextual
 * button."  At 320 x 568 up to 430 x 932 upright, and 844 x 390 sideways,
 * out of a fight at a door and in one (the guard down and up), this asserts:
 *   - Jump's centre lies south-west of the disc's (upright 225 deg +-20;
 *     sideways down and to the left), its edge 8-14 px off the disc's ring
 *     (round touch areas measured as circles: both are border-radius 50%,
 *     and a browser takes a touch by that rounded shape -- checked too, by
 *     elementFromPoint over Jump's box: its corners never reach it);
 *   - every other button 8 px clear of Jump, and the doors' Enter button too;
 *   - no two touch areas overlap at all (the 4 px pairs printed are older,
 *     and by design: ctlColumn's air beside the disc);
 *   - the doors' Enter button, risen over Jump upright, 8 px clear of the
 *     move stick, the disc, Burst, Sprint, the board and Jump -- and back
 *     down where it was when Jump is not drawn (?jumpbtn=0);
 *   - Jump wholly on the screen and above the bottom band.
 * The old layout fails these (the "before" pictures came from main).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/* v2.3.3799: + the smallest phone and one sideways (the owner's "positioned
   orbiting southwest of the large contextual button", upright and sideways) */
const PHONES = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 844, height: 390 },
];
const AIR = 8;   /* the least clear air between two touch boxes */

/* every touch control's box, named, with what the page paints of it */
const NAMED = [
  ['disc', '.bt-rjoy-base'], ['move', '.bt-joystick-base'], ['jump', '[data-jump]'], ['block', '[data-shield]'],
  ['bash', '[data-ability="bash"]'], ['whirl', '[data-ability="whirl"]'], ['special', '[data-special]'],
  ['sprint', '[data-sprint]'], ['trap', '[data-trap-button]'], ['eat', '.bt-quickeat-btn'], ['burst', '.bt-burst-btn'],
  ['weapon', '[data-weapon-chip]'], ['bell', '[data-world-chat-toggle]'], ['door', '#thumb-door'],
  /* v2.3.3799: the skateboard (RideButton) and the band's fold chip (OPEN) */
  ['ride', '[data-ride]'], ['fold', '[data-dash-fold]'],
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
    /* v2.3.3799: a round button (border-radius half its width or more) is
       touched by its circle, not its box */
    const rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const round = Math.abs(r.width - r.height) <= 2 && rad >= r.width / 2 - 1;
    out.push({ n, l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), round,
      painted: Number(getComputedStyle(el).opacity) > 0.05 });
  }
  let dash = null;
  for (const s of ['.bt-dashboard', '.bt-bottom-dashboard']) {
    const el = document.querySelector(s);
    if (shown(el)) { dash = Math.round(el.getBoundingClientRect().top); break; }
  }
  /* v2.3.3799: who a touch over Jump's box reaches -- inside its circle
     always Jump; in the box's corners outside it, never the disc */
  let hit = null;
  const jb = document.querySelector('.bt-jump-btn');
  if (shown(jb)) {
    const r = jb.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
    hit = { inside: 0, insideJump: 0, corner: 0, cornerJump: 0 };
    for (let x = r.left + 1; x < r.right; x += 3) for (let y = r.top + 1; y < r.bottom; y += 3) {
      const d = Math.hypot(x - cx, y - cy);
      const t = document.elementFromPoint(x, y);
      if (d <= R - 2) { hit.inside++; if (t && jb.contains(t)) hit.insideJump++; }
      else if (d >= R + 3) { hit.corner++; if (t && jb.contains(t)) hit.cornerJump++; }
    }
  }
  return { vw: innerWidth, vh: innerHeight, dash, list: out, hit };
}, NAMED);

const ctr = (a) => ({ x: (a.l + a.r) / 2, y: (a.t + a.b) / 2, R: (a.r - a.l) / 2 });
/* the air between two touch areas: boxes by their edges, a round one by its
   circle (v2.3.3799); -1 an overlap */
const gapOf = (a, b) => {
  if (a.round || b.round) {
    const [c, o] = a.round ? [a, b] : [b, a];
    const k = ctr(c);
    let d;
    if (o.round) { const m = ctr(o); d = Math.hypot(k.x - m.x, k.y - m.y) - k.R - m.R; }
    else {
      const nx = Math.max(o.l, Math.min(k.x, o.r)), ny = Math.max(o.t, Math.min(k.y, o.b));
      d = Math.hypot(k.x - nx, k.y - ny) - k.R;
    }
    return d < 0 ? -1 : Math.round(d);
  }
  const dx = Math.max(a.l - b.r, b.l - a.r), dy = Math.max(a.t - b.b, b.t - a.b);
  return dx < 0 && dy < 0 ? -1 : Math.max(dx, dy);
};
/* v2.3.3799: the asserts on Jump's place in one state */
function judge(rec, tag, st, d, upright) {
  const by = (n) => d.list.find((q) => q.n === n);
  const j = by('jump'), disc = by('disc');
  if (!j || !disc) { rec.ok(`${tag} ${st}: Jump and the disc are both up (guard)`, false, d); return; }
  const cj = ctr(j), cd = ctr(disc);
  const ang = Math.round(Math.atan2(cj.y - cd.y, cd.x - cj.x) * 180 / Math.PI);   /* 0 = west, 90 = south */
  const ring = gapOf(j, disc);
  const sw = upright ? ang >= 25 && ang <= 65 : ang > 0 && ang < 90;
  rec.ok(`${tag} ${st}: Jump orbits the disc south-west -- ${ang} deg below west (${upright ? '45 +-20' : 'between west and south'}), ${ring} px off its ring, both round (${j.round}, ${disc.round})`,
    sw && ring >= AIR && ring <= 14 && j.round && disc.round, { j, disc, ang, ring });
  const near = d.list.filter((q) => q !== j && q !== disc).map((q) => ({ n: q.n, g: gapOf(j, q) })).filter((q) => q.g < AIR);
  rec.ok(`${tag} ${st}: every other button (and a door's Enter) at least ${AIR} px clear of Jump${near.length ? ' -- ' + near.map((q) => q.n + ' ' + q.g).join(', ') : ''}`,
    near.length === 0, near);
  const over = [];
  for (let a = 0; a < d.list.length; a++) for (let b = a + 1; b < d.list.length; b++) {
    if (gapOf(d.list[a], d.list[b]) < 0) over.push(d.list[a].n + '/' + d.list[b].n);
  }
  /* the doors' Enter button, risen over Jump: clear of the move stick, the
     disc, Burst, Sprint and the board (the orchestrator's list) */
  const door = by('door');
  if (door) {
    const near2 = d.list.filter((q) => ['move', 'disc', 'burst', 'sprint', 'ride', 'jump'].includes(q.n)).map((q) => ({ n: q.n, g: gapOf(door, q) })).filter((q) => q.g < AIR);
    rec.ok(`${tag} ${st}: the doors' Enter button (x ${door.l}..${door.r}, y ${door.t}..${door.b}) stands ${AIR} px or more clear of the move stick, the disc, Burst, Sprint, the board and Jump${near2.length ? ' -- ' + near2.map((q) => q.n + ' ' + q.g).join(', ') : ''}`,
      near2.length === 0 && door.l >= 0 && door.r <= d.vw, { door, near2 });
  }
  rec.ok(`${tag} ${st}: no two touch areas overlap${over.length ? ' -- ' + over.join(', ') : ''}`, over.length === 0, over);
  rec.ok(`${tag} ${st}: Jump wholly on the screen and above the band (x ${j.l}..${j.r} of ${d.vw}, y ${j.t}..${j.b}, the band at ${d.dash})`,
    j.l >= 0 && j.r <= d.vw && j.t >= 0 && (d.dash == null || j.b <= d.dash), { j, dash: d.dash });
  const h = d.hit;
  rec.ok(`${tag} ${st}: a touch inside Jump's circle reaches Jump (${h && h.insideJump}/${h && h.inside}), one in its box's corners never does (${h && h.cornerJump}/${h && h.corner})`,
    !!h && h.inside > 0 && h.insideJump === h.inside && h.cornerJump === 0, h);
}
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
  b.innerHTML = '<img alt="" style="width:16px;height:16px;object-fit:contain;margin-right:3px;background:#a87" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><span style="display:block"><span style="display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;opacity:.7"> Enter </span><span style="display:block">AUCTION HOUSE</span></span>';
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
    o.style.cssText = `position:fixed;left:${q.l}px;top:${q.t}px;width:${q.r - q.l}px;height:${q.b - q.t}px;outline:2px solid ${c};box-sizing:border-box${q.round ? `;border-radius:50%;outline:none;border:2px solid ${c}` : ''}`;
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
      const upright = ph.height > ph.width;
      judge(rec, tag, 'calm, at a door', calm, upright);
      /* v2.3.3799: Jump gone (?jumpbtn=0, read again on a resize), the
         Enter button goes back down to its old place; Jump back, up again */
      const doorAt = () => P.page.evaluate(() => { const b = document.getElementById('thumb-door'); const r = b.getBoundingClientRect();
        return { b: Math.round(r.bottom), jump: !!document.querySelector('.bt-jump-btn'), flag: document.documentElement.getAttribute('data-jump-clear') }; });
      const setQ = (q) => P.page.evaluate((qq) => { history.replaceState(null, '', location.pathname + qq); window.dispatchEvent(new Event('resize')); }, q);
      const q0 = await P.page.evaluate(() => location.search);
      await setQ((q0 ? q0 + '&' : '?') + 'jumpbtn=0');
      await P.page.waitForTimeout(700);
      const gone = await doorAt();
      await setQ(q0);
      await P.page.waitForTimeout(700);
      const back = await doorAt();
      const dashB = calm.dash;
      if (upright) {
        rec.ok(`${tag}: Jump gone, the Enter button is back down in its strip (its foot ${dashB - gone.b} px over the band, flag ${gone.flag}); Jump back, it rises again (${dashB - back.b} px)`,
          !gone.jump && gone.flag == null && dashB - gone.b >= 20 && dashB - gone.b <= 30 && back.jump && back.flag != null && dashB - back.b > 60, { gone, back, dashB });
      } else {
        rec.ok(`${tag}: sideways the Enter button never rises (flag ${calm && back.flag})`, back.flag == null, { back });
      }
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
        judge(rec, tag, st, d, upright);
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
