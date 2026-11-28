/* ═══ v2.3.6847: THE ATTACK BUTTON AND THE HUD, ABOUT TWICE AS BIG -- ITS RULES (card UI4) ═══
 *
 *   node tools/guards/big-hud.test.mjs
 *
 * The owner, about 07:05 UTC 2026-11-28: "Attack button and HUD need to be
 * about twice as big."  What src/game/bigHud.js DOES (run in node) and how
 * the page wires it (by its text):
 *   1. the switch: on by default, `?bighud=0` off and remembered, `?bighud=1`
 *      forgets;
 *   2. hudScale: off, today's (1, sideways .92); on, never under today's,
 *      never over twice, never wider than the room left of the minimap (its
 *      132 and 8 px of air) at 390, 375, 320 and sideways; twice where the
 *      room is (a wide world); sideways never taller than the room over the
 *      stick's lobe; the stack under it its height and 4;
 *   3. bigAttack (on padSkin.js padLayout at 430, 390, 375, 320 and 752):
 *      the face between today's and twice; its touch box the face (44 at
 *      least); over no other well's box (the big button, the top row, the
 *      weapon wells, the stick); inside the column and above the band; every
 *      other well's art where it was, and a top-row box still holding its art;
 *      the layout handed in never changed;
 *   4. the wiring: padSpot.js's padNow grows Attack only under bigHudOn();
 *      HudArt.jsx sets --ha-k from the rule only when it says so and
 *      measures nothing; game.css's own numbers untouched;
 *   5. THE PLANTS: each dodge below is planted into a copy and seen red.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 900))); }
}
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const url = (rel) => pathToFileURL(path.join(ROOT, rel)).href;

const PS = await import(url('src/game/padSkin.js'));
const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const cross = (a, b) => Math.abs(a.box.x - b.box.x) < (a.box.size + b.box.size) / 2 - 0.01 && Math.abs(a.box.y - b.box.y) < (a.box.size + b.box.size) / 2 - 0.01;

/* every rule of the module, as a list of what is wrong (empty: right) */
function behave(M) {
  const bad = [];
  /* 1. the switch */
  try {
    if (M.bigHudWanted('', store()) !== true) bad.push('1 not on by default');
    const ls = store();
    if (M.bigHudWanted('?bighud=0', ls) !== false) bad.push('1 ?bighud=0 not off');
    if (ls.m.get(M.BIG_HUD_KEY) !== '0') bad.push('1 ?bighud=0 not remembered');
    if (M.bigHudWanted('', ls) !== false) bad.push('1 off not remembered on the next visit');
    if (M.bigHudWanted('?bighud=1', ls) !== true || ls.m.has(M.BIG_HUD_KEY)) bad.push('1 ?bighud=1 does not forget');
    if (M.bigHudWanted('', null) !== true) bad.push('1 no storage: not on');
  } catch (e) { bad.push('1 threw ' + e.message); }
  /* 2. the HUD's scale */
  try {
    const B = M.BIG_HUD;
    const off = M.hudScale({ worldW: 390, on: false }), offS = M.hudScale({ worldW: 752, worldL: 46, short: true, worldH: 300, on: false });
    if (off.k !== 1 || offS.k !== 0.92) bad.push('2 off is not today\'s (' + off.k + ', ' + offS.k + ')');
    for (const w of [390, 375, 320, 430]) {
      const s = M.hudScale({ worldW: w });
      if (!(s.k >= 1) || !(s.k <= 2)) bad.push('2 ' + w + ': k ' + s.k + ' outside today\'s to twice');
      const right = B.LEFT + B.HUD_W * s.k, mini = w - B.MINI;
      if (s.k > 1 && right > mini - B.AIR + 0.01) bad.push('2 ' + w + ': the HUD (to ' + right + ') over the minimap\'s air (' + (mini - B.AIR) + ')');
      if (Math.abs(s.w - B.HUD_W * s.k) > 0.02 || Math.abs(s.h - B.HUD_H * s.k) > 0.02) bad.push('2 ' + w + ': the box is not the scale\'s');
    }
    if (!(M.hudScale({ worldW: 390 }).k > 1.2)) bad.push('2 390: not bigger than today\'s');
    if (M.hudScale({ worldW: 320 }).k !== 1) bad.push('2 320: not today\'s where no room is');
    if (M.hudScale({ worldW: 1200 }).k !== 2) bad.push('2 a wide world: not twice');
    const side = M.hudScale({ worldW: 752, worldL: 46, short: true, worldH: 300 });
    if (!(side.k > 0.92) || side.k > 1.84 + 1e-9) bad.push('2 sideways: k ' + side.k + ' outside .92 to 1.84');
    const lobe = (B.REF_H - B.LOBE_TOP) * (430 / 920);
    const low = M.hudScale({ worldW: 752, worldL: 46, short: true, worldH: 250 });
    if (B.BASE + B.HUD_H * low.k > 250 - lobe - B.AIR + 0.02 && low.k > 0.92) bad.push('2 sideways: taller than the room over the stick\'s lobe');
    if (M.hudStack(1) !== 56 || M.hudStack(0.92) !== 52) bad.push('2 the stack is not today\'s at today\'s scale (' + M.hudStack(1) + ', ' + M.hudStack(0.92) + ')');
  } catch (e) { bad.push('2 threw ' + e.message); }
  /* 3. Attack */
  try {
    for (const [land, w] of [[false, 430], [false, 390], [false, 375], [false, 320], [true, 752]]) {
      const L = PS.padLayout(land, w);
      const before = JSON.stringify(L);
      const G = M.bigAttack(L, 2);
      if (JSON.stringify(L) !== before) bad.push('3 ' + w + ': the layout handed in was changed');
      const a0 = L.wells.attack, a = G.wells.attack;
      if (!(a.d >= a0.d - 1e-9) || a.d > 2 * a0.d + 1e-9) bad.push('3 ' + w + ': the face ' + a.d + ' outside today\'s ' + a0.d + ' to twice');
      if (!(a.d > a0.d * 1.1)) bad.push('3 ' + w + ': not bigger (' + a0.d + ' -> ' + a.d + ')');
      if (Math.abs(a.box.size - Math.max(44, a.d)) > 1e-9 || a.box.x !== a.x || a.box.y !== a.y) bad.push('3 ' + w + ': the touch box is not the face');
      for (const n of Object.keys(G.wells)) {
        if (n === 'attack') continue;
        if (cross(a, G.wells[n])) bad.push('3 ' + w + ': Attack\'s box over ' + n + '\'s');
        const o = L.wells[n], g = G.wells[n];
        if (o.x !== g.x || o.y !== g.y || o.d !== g.d) bad.push('3 ' + w + ': ' + n + '\'s art moved');
        if (g.box.y - g.box.size / 2 > g.y - g.d / 2 + 1e-6 || g.box.y + g.box.size / 2 < g.y + g.d / 2 - 1e-6) bad.push('3 ' + w + ': ' + n + '\'s box no longer holds its art');
      }
      if (a.x + a.d / 2 > G.shell.w || a.y - a.d / 2 < 0) bad.push('3 ' + w + ': Attack past the column\'s edge or under the band');
      if (!G.grow || Math.abs(G.grow.to - a.d) > 0.01) bad.push('3 ' + w + ': no grow record');
    }
    /* a roomy lobe: twice exactly */
    const L = PS.padLayout(false, 390);
    const roomy = { ...L, wells: { ...L.wells, attack: { ...L.wells.attack, d: 20, box: { ...L.wells.attack.box, size: 44 } } } };
    const R = M.bigAttack(roomy, 2);
    if (Math.abs(R.wells.attack.d - 40) > 1e-9) bad.push('3 room for twice: not twice (' + R.wells.attack.d + ')');
  } catch (e) { bad.push('3 threw ' + e.message); }
  return bad;
}

/* a copy of the module with `src` for its text, its imports made absolute */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bighud-'));
let nTmp = 0;
async function moduleOf(src) {
  const abs = src.replace(/from '(\.\.?\/[^']+)'/g, (m0, rel) => `from '${pathToFileURL(path.join(ROOT, 'src/game', rel)).href}'`);
  const f = path.join(TMP, 'm' + (nTmp++) + '.mjs');
  fs.writeFileSync(f, abs);
  return import(pathToFileURL(f).href);
}

const MOD = 'src/game/bigHud.js';
const modSrc = read(MOD);
const M = await import(url(MOD));
const bad = behave(M);
check('1-3. the rules do what the owner asked (the switch, the HUD\'s scale, Attack\'s well)', bad.length === 0, bad.join('\n     '));
{
  const b2 = behave(await moduleOf(modSrc));
  check('1-3. ...and the same from a copy (the plants below are read the same way)', b2.length === 0, b2.join('; '));
}

/* ── 4. the wiring, by its text ── */
const padSrc = read('src/ui/panels/padSpot.js');
const artSrc = read('src/ui/hud/HudArt.jsx');
const cssSrc = read('src/styles/game.css');
const hudCss = read('src/ui/hud/hudArt.css');
const padOk = (s) => /if \(!bigHudOn\(\)\) return L;\s*\n\s*const G = bigAttack\(L, BIG_HUD\.WANT\);/.test(s)
  && /export function padNow\(isLandscape\) \{\s*\n\s*if \(!padLive\(\)\) return null;/.test(s);
check('4. padSpot.js padNow grows Attack only under bigHudOn() (and never on a computer: padLive first)', padOk(padSrc));
const artOk = (s) => /if \(!bigHudOn\(\) \|\| fineInput\(\)\) return null;/.test(s)
  && /if \(big\) \{ vars\['--ha-k'\] = String\(big\.k\);/.test(s)
  && !/getBoundingClientRect|clientWidth|clientHeight|offsetWidth|offsetHeight|innerWidth|innerHeight|getComputedStyle/.test(s);
check('4. HudArt.jsx: today\'s under ?bighud=0 and on a computer, --ha-k from the rule, nothing measured', artOk(artSrc));
check('4. game.css keeps today\'s stack (56, sideways 52) and party chip (192): the switch writes over them, never them',
  /html\[data-charhud="1"\]\{--bt-charhud-h:56px;/.test(cssSrc) && /--bt-charhud-h:52px;\s*\n\s*--bt-party-top:var\(--bt-hud-base\);--bt-party-left:192px\}/.test(cssSrc));
check('4. hudArt.css keeps today\'s scale (1, sideways .92)', /\.bt-hudart\{--ha-k:1;/.test(hudCss) && /@media \(max-height:480px\)\{\.bt-hudart\{--ha-k:\.92\}\}/.test(hudCss));

/* ── 5. THE PLANTS ── */
async function plantModule(name, pairs) {
  let src = modSrc;
  for (const [from, to] of pairs) {
    if (src.indexOf(from) < 0) { check('5 plant "' + name + '" finds its text', false, from); return; }
    src = src.split(from).join(to);
  }
  const b = behave(await moduleOf(src));
  check('5 plant red: ' + name, b.length > 0);
}
const plantSrc = (name, src, from, to, test) => {
  if (src.indexOf(from) < 0) { check('5 plant "' + name + '" finds its text', false, from); return; }
  check('5 plant red: ' + name, !test(src.split(from).join(to)));
};
await plantModule('off by default', [["  try { return !(ls && ls.getItem(BIG_HUD_KEY) === '0'); } catch (e) { return true; }", "  try { return !!(ls && ls.getItem(BIG_HUD_KEY) === '1'); } catch (e) { return false; }"]]);
await plantModule('?bighud=0 not remembered', [["if (v === '0') ls.setItem(BIG_HUD_KEY, '0'); else ls.removeItem(BIG_HUD_KEY);", 'void 0;']]);
await plantModule('the HUD twice whatever the room', [['    k = Math.max(today, Math.min(want, wide, tall));', '    k = want;']]);
await plantModule('the HUD under today\'s on a narrow phone', [['    k = Math.max(today, Math.min(want, wide, tall));', '    k = Math.min(want, wide, tall);']]);
await plantModule('the HUD past twice', [['    k = Math.max(today, Math.min(want, wide, tall));', '    k = Math.max(today, Math.min(want * 1.5, wide, tall));']]);
await plantModule('the minimap\'s air forgotten', [['worldW - B.MINI - B.AIR - B.LEFT)', 'worldW - B.MINI + B.AIR - B.LEFT)']]);
await plantModule('sideways taller than the room', [['      tall = (worldH - lobe - B.AIR - B.BASE) / B.HUD_H;', '      tall = Infinity;']]);
await plantModule('Attack twice whatever the room', [['  const d = Math.max(a.d, Math.min(target, room));', '  const d = target;']]);
await plantModule('Attack over the big button', [['  const cx = Math.min(Math.max(a.x, left + d / 2), right - d / 2);', '  const cx = big.box.x + 20;']]);
await plantModule('Attack over the top row', [['    top = Math.min(top, w.y - w.d / 2 - 1);', '    top = Math.min(top, w.y + w.d / 2);']]);
await plantModule('a top-row box not risen off Attack', [['    if (low < aTop + 1) w.box.y', '    if (false) w.box.y']]);
await plantModule('Attack\'s touch box smaller than its face', [['  const size = Math.max(44, d);', '  const size = Math.max(44, a.d);']]);
await plantModule('Attack past the column\'s edge', [['  const cx = Math.min(Math.max(a.x, left + d / 2), right - d / 2);', '  const cx = L.shell.w;']]);
await plantModule('the layout handed in changed', [['  return { ...L, wells, grow:', '  L.wells.attack = wells.attack; return { ...L, wells, grow:']]);
plantSrc('padNow growing Attack under ?bighud=0', padSrc, '  if (!bigHudOn()) return L;\n', '', padOk);
plantSrc('the HUD bigger on a computer', artSrc, 'if (!bigHudOn() || fineInput()) return null;', 'if (!bigHudOn()) return null;', artOk);
plantSrc('the HUD measuring the page', artSrc, '  const col = playVw();', '  const col = document.body.clientWidth;', artOk);
plantSrc('today\'s stack rewritten in game.css', cssSrc, 'html[data-charhud="1"]{--bt-charhud-h:56px;', 'html[data-charhud="1"]{--bt-charhud-h:112px;',
  (s) => /html\[data-charhud="1"\]\{--bt-charhud-h:56px;/.test(s));

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* the system's */ }
console.log(`\nbig-hud: ${failed ? failed + ' FAILED' : 'all passed'}`);
if (failed) process.exit(1);
