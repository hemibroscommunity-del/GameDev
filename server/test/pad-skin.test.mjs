/* ═══ v2.3.6640: THE CONTROLLER (card PAD; src/game/padSkin.js) ═══
 *
 * The owner, 2026-11-25: "Also want a redesign of the controls area to be
 * more like a controller."  What the controller's rules DO, over the phones
 * a player holds (upright 360 to 430 wide, sideways 667 to 932 wide), played
 * on the module with the art's own measured numbers (src/data/padArt.js):
 *
 *   1. THE SOCKETS BY PLACE: Attack the biggest, low and right; Jump left of
 *      it in the bottom row; the top row ctx, Block, Special left to right;
 *      the art listed in any order names the same sockets; art without five
 *      sockets (or not two rows of them) has no layout.
 *   2. THE HOUSINGS: both docked to the band, each flush to its side, never
 *      overlapping, together no wider than the screen; the right one's
 *      Attack socket is ATTACK_PX; the stick's ring is STICK_PX where there
 *      is room, and only the left housing gives up width.
 *   3. NO TOUCH BOX SMALLER THAN TODAY'S, AND NONE OVER ANOTHER: each box is
 *      the larger of today's (both control modes' sizes) and its socket,
 *      centred on the socket; no two boxes overlap (the round boxes a browser
 *      touches by); every box inside the screen and over the band, and in
 *      the right half (upright under 430 wide, within NARROW_OVER of it).
 *   4. FIXED PLACES: a control's spot depends on the screen alone, never on
 *      which others show; Skate and Charge share the one context socket.
 *   5. MIRRORED: the sides swap, every number the same.
 *   6. FACES: one picture an action and its grey twin for Disabled; the
 *      cooldown's wash and sweep; the ready glow; Attack's idle is grey, its
 *      hot glows, a harvest's tool sits on the empty socket.
 *   7. THE SWITCH: on unless `?padskin=0` is thrown; every picture named.
 *   8. THE ART: the pictures are on disk, 256 colours or fewer, 2 px a CSS
 *      px at their biggest and no bigger, under 200 kB in all.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAD, PAD_NAMES, PAD_ACCENT, namedSockets, padLayout, socketOf, padSpot, padFace, attackFace, padOn, padPictures, swordIcon, ctxFor } from '../../src/game/padSkin.js';
import { PAD_ART, PAD_ART_BYTES } from '../../src/data/padArt.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const SCREENS = [
  [false, 430], [false, 414], [false, 393], [false, 390], [false, 375], [false, 360],
  [true, 932], [true, 896], [true, 852], [true, 844], [true, 775], [true, 667],
];
/* today's boxes, the larger of the two control modes' (ShieldButton.jsx's
   anchors in the held combat, thumbArc.js's in the two buttons) */
const TODAY = {
  up: { attack: 84, jump: 64, block: 56, special: 52, skate: 48, charge: 52 },
  side: { attack: 94, jump: 68, block: 56, special: 54, skate: 54, charge: 52 },
};
const NARROW_OVER = 36;
const PAD_SWORD_ICONS_CSS = ['', 'none', 'melee', 'ranged', 'staff'];
const CONTROLS = ['attack', 'jump', 'block', 'special', 'skate', 'charge'];
const ctr = (b, vw) => ({ x: b.side === 'right' ? vw - b.edge - b.size / 2 : b.edge + b.size / 2, y: b.bottom + b.size / 2 });

/* ── 1. the sockets by place ── */
{
  const S = PAD_ART['housing-r'].sockets;
  const n = namedSockets(S);
  check('1a. the art holds five sockets, named', !!n && Object.keys(n).length === 5, S);
  check('1b. Attack the biggest', !!n && ['jump', 'ctx', 'block', 'special'].every((k) => n.attack.d > n[k].d), n);
  check('1c. Attack and Jump in the bottom row, Jump left of Attack', !!n && n.attack.cy > 0.5 && n.jump.cy > 0.5 && n.jump.cx < n.attack.cx, n);
  check('1d. the top row: ctx, Block, Special, left to right', !!n && n.ctx.cy < 0.5 && n.block.cy < 0.5 && n.special.cy < 0.5
    && n.ctx.cx < n.block.cx && n.block.cx < n.special.cx, n);
  const shuffled = [S[3], S[0], S[4], S[2], S[1]];
  check('1e. the art listed in another order names the same sockets', JSON.stringify(namedSockets(shuffled)) === JSON.stringify(n));
  check('1f. not five sockets: no names', namedSockets(S.slice(0, 4)) === null && namedSockets(null) === null && namedSockets(S.concat([S[0]])) === null);
  const allTop = S.map((o) => Object.assign({}, o, { cy: 0.3 }));
  const twoLow = S.map((o, i) => Object.assign({}, o, { cy: i < 2 || o.d === Math.max(...S.map((q) => q.d)) ? 0.8 : 0.3 }));
  check('1g. not one socket below the big one and three above: no names', namedSockets(allTop) === null && namedSockets(twoLow) === null);
  const noHole = Object.assign({}, PAD_ART, { 'housing-l': Object.assign({}, PAD_ART['housing-l'], { hole: null }) });
  check('1h. no hole in the stick housing, or no sockets: no layout', padLayout(false, 430, false, noHole) === null
    && padLayout(false, 430, false, Object.assign({}, PAD_ART, { 'housing-r': Object.assign({}, PAD_ART['housing-r'], { sockets: [] }) })) === null);
}

/* ── 2. the housings ── */
for (const [land, vw] of SCREENS) {
  const L = padLayout(land, vw, false);
  const key = land ? 'side' : 'up';
  const tag = (land ? 'sideways ' : 'upright ') + vw;
  check(`2a. ${tag}: the right housing right, the left left, together within the screen`,
    !!L && L.right.side === 'right' && L.left.side === 'left' && L.right.w + L.left.w <= vw && L.left.w > 0, L && { r: L.right, l: L.left });
  check(`2b. ${tag}: Attack's socket is ATTACK_PX (${PAD.ATTACK_PX[key]})`, !!L && Math.abs(L.sockets.attack.d - PAD.ATTACK_PX[key]) <= 1, L && L.sockets.attack);
  const room = vw - L.right.w >= Math.round(PAD.STICK_PX[key] / PAD.RING_OVER_HOLE / PAD_ART['housing-l'].hole.d);
  check(`2c. ${tag}: the stick's ring is STICK_PX where there is room (${room ? 'room' : 'narrow'}); its pieces in its proportions`,
    !!L && (room ? Math.abs(L.stick.d - PAD.STICK_PX[key]) <= 1 : L.stick.d < PAD.STICK_PX[key])
    && Math.abs(L.stick.disc - L.stick.d * PAD.DISC) <= 1 && Math.abs(L.stick.knob - L.stick.d * PAD.KNOB) <= 1
    && Math.abs(L.stick.d - L.stick.hole * PAD.RING_OVER_HOLE) <= 1.5, L && L.stick);
  check(`2d. ${tag}: the housings keep the art's shape`, !!L
    && Math.abs(L.right.h / L.right.w - PAD_ART['housing-r'].h / PAD_ART['housing-r'].w) < 0.01
    && Math.abs(L.left.h / L.left.w - PAD_ART['housing-l'].h / PAD_ART['housing-l'].w) < 0.02, L && [L.right, L.left]);
  check(`2e. ${tag}: the stick inside its housing`, !!L && L.stick.x - L.stick.d / 2 >= 0 && L.stick.x + L.stick.d / 2 <= L.left.w + 2
    && L.stick.y - L.stick.d / 2 >= -2 && L.stick.y + L.stick.d / 2 <= L.left.h + 2, L && [L.stick, L.left]);
}
{
  const wide = padLayout(false, 430, false), narrow = padLayout(false, 360, false);
  check('2f. a narrow phone: only the left housing gives up width', wide.right.w === narrow.right.w && narrow.left.w < wide.left.w
    && narrow.right.w + narrow.left.w <= 360, [wide.left, narrow.left]);
  check('2g. no screen width given: the owner\'s phone\'s', JSON.stringify(padLayout(false, undefined, false)) === JSON.stringify(padLayout(false, 430, false)));
  check('2h. the owner\'s phone upright: the middle is open (40 px or more)', 430 - wide.right.w - wide.left.w >= 40, 430 - wide.right.w - wide.left.w);
}

/* ── 2i. the owner's phone, exactly (430 x 932: upright and sideways), as
   measured in the game (mp-padskin 1, 2); a change here is a change the owner
   sees: say it in the PR ── */
{
  const UP = {"right":{"side":"right","w":239,"h":206},"left":{"side":"left","w":141,"h":114},"sockets":{"attack":{"side":"right","x":90,"y":60,"d":92},"jump":{"side":"right","x":167,"y":77,"d":57},"ctx":{"side":"right","x":189,"y":134,"d":44},"block":{"side":"right","x":129,"y":139,"d":58},"special":{"side":"right","x":64,"y":136,"d":59}},"stick":{"side":"left","x":60,"y":51,"d":83,"hole":70,"disc":76,"knob":37}};
  const SIDE = {"right":{"side":"right","w":249,"h":214},"left":{"side":"left","w":167,"h":136},"sockets":{"attack":{"side":"right","x":94,"y":62,"d":96},"jump":{"side":"right","x":174,"y":80,"d":60},"ctx":{"side":"right","x":197,"y":139,"d":46},"block":{"side":"right","x":134,"y":144,"d":60},"special":{"side":"right","x":67,"y":141,"d":61}},"stick":{"side":"left","x":71,"y":60,"d":98,"hole":83,"disc":89,"knob":43}};
  check('2i. the owner\'s phone upright, exactly', JSON.stringify(padLayout(false, 430, false)) === JSON.stringify(UP), padLayout(false, 430, false));
  check('2j. the owner\'s phone sideways, exactly', JSON.stringify(padLayout(true, 932, false)) === JSON.stringify(SIDE), padLayout(true, 932, false));
  /* the stick's walking reach is read off the arrow disc's drawn width
     (BroTown's left handlers: half the base's rect less 20): the disc is
     today's base, 75 upright and 90 sideways, within a pixel */
  check('2k. the arrow disc is today\'s stick base (75 / 90, within 1 px)', Math.abs(UP.stick.disc - 75) <= 1 && Math.abs(SIDE.stick.disc - 90) <= 1);
  check('2l. a width that is not a width is the owner\'s phone\'s', [0, -5, NaN, '430', null].every((w) => JSON.stringify(padLayout(false, w, false)) === JSON.stringify(UP)));
  const n360 = padLayout(false, 360, false);
  check('2m. a narrow phone: the left housing gives up just what is needed (the two meet)', n360.right.w + n360.left.w === 360, n360);
}

/* ── 3. boxes ── */
for (const [land, vw] of SCREENS) {
  const L = padLayout(land, vw, false);
  const T = TODAY[land ? 'side' : 'up'];
  const tag = (land ? 'sideways ' : 'upright ') + vw;
  const B = {};
  for (const c of CONTROLS) B[c] = padSpot(c, L, T[c]);
  check(`3a. ${tag}: every box at least today's and its socket's, the face its socket's`,
    CONTROLS.every((c) => B[c] && B[c].size >= T[c] && B[c].size >= L.sockets[socketOf(c)].d && B[c].face === L.sockets[socketOf(c)].d), B);
  check(`3b. ${tag}: each box centred on its socket`, CONTROLS.every((c) => {
    const s = L.sockets[socketOf(c)], o = ctr(B[c], vw);
    return Math.abs(o.x - (vw - s.x)) <= 1 && Math.abs(o.y - s.y) <= 1;
  }), B);
  /* every pair that can show together (Skate and Charge never do: one socket) */
  const bad = [];
  for (let i = 0; i < CONTROLS.length; i++) for (let j = i + 1; j < CONTROLS.length; j++) {
    const a = CONTROLS[i], b = CONTROLS[j];
    if (socketOf(a) === socketOf(b)) continue;
    const p = ctr(B[a], vw), q = ctr(B[b], vw);
    const gap = Math.hypot(p.x - q.x, p.y - q.y) - B[a].size / 2 - B[b].size / 2;
    if (gap < 0) bad.push([a, b, Math.round(gap * 10) / 10]);
  }
  check(`3c. ${tag}: no two boxes overlap`, bad.length === 0, bad);
  check(`3d. ${tag}: every box on the screen, over the band`, CONTROLS.every((c) => {
    const o = ctr(B[c], vw);
    return o.x - B[c].size / 2 >= 0 && o.x + B[c].size / 2 <= vw && B[c].bottom >= 0;
  }), B);
  /* the right housing keeps its size on a narrow phone (its sockets are the
     boxes), so upright under 430 the context socket's box reaches a little
     past the middle into the stick's half: never more than NARROW_OVER */
  const over = Math.max(...CONTROLS.map((c) => vw / 2 - (ctr(B[c], vw).x - B[c].size / 2)));
  const allowed = !land && vw < 430 ? NARROW_OVER : 1;
  check(`3e. ${tag}: every box in the right half (the stick's is the left)${allowed > 1 ? ', or within ' + NARROW_OVER + ' px of it' : ''}`, over <= allowed, { over, B });
}
{
  const L = padLayout(false, 430, false);
  check('3f. a box with no size today is its socket', padSpot('jump', L, 0).size === L.sockets.jump.d && padSpot('jump', L).size === L.sockets.jump.d);
  check('3g. a box bigger today stays bigger', padSpot('attack', L, 200).size === 200);
  const j = padSpot('jump', L, 63);
  check('3h. an odd box is centred to the nearest pixel', j.size === 63 && j.edge === Math.round(L.sockets.jump.x - 31.5) && j.bottom === Math.round(L.sockets.jump.y - 31.5), j);
  check('3i. today\'s size to the nearest pixel; a size that is not a number is none', padSpot('jump', L, 63.6).size === 64 && padSpot('jump', L, '200').size === L.sockets.jump.d);
}

/* ── 4. fixed places ── */
{
  const L = padLayout(false, 430, false);
  check('4a. Skate and Charge share the context socket', socketOf('skate') === 'ctx' && socketOf('charge') === 'ctx'
    && JSON.stringify(padSpot('skate', L, 50)) === JSON.stringify(padSpot('charge', L, 50)));
  check('4b. a control with no socket has no spot (it keeps today\'s place)', ['sprint', 'whirl', 'bash', 'trap', 'eat', 'ctx', '', null].every((n) => padSpot(n, L, 50) === null && socketOf(n) === null));
  check('4c. no layout: no spot', padSpot('jump', null, 50) === null);
  check('4d. the same screen gives the same spots', JSON.stringify(padLayout(true, 852, false)) === JSON.stringify(padLayout(true, 852, false)));
  check('4e. the five names', PAD_NAMES.join() === 'attack,jump,ctx,block,special' && ['attack', 'jump', 'block', 'special'].every((n) => socketOf(n) === n));
}

/* ── 5. mirrored ── */
for (const [land, vw] of SCREENS) {
  const L = padLayout(land, vw, false), M = padLayout(land, vw, true);
  const flip = (o) => Object.assign({}, o, { side: o.side === 'right' ? 'left' : 'right' });
  const same = JSON.stringify(flip(L.right)) === JSON.stringify(M.right) && JSON.stringify(flip(L.left)) === JSON.stringify(M.left)
    && PAD_NAMES.every((n) => JSON.stringify(flip(L.sockets[n])) === JSON.stringify(M.sockets[n]))
    && JSON.stringify(flip(L.stick)) === JSON.stringify(M.stick);
  check(`5. ${land ? 'sideways' : 'upright'} ${vw}: mirrored, the sides swap and every number stays`, same, { L: L.sockets.attack, M: M.sockets.attack });
}

/* ── 6. faces ── */
{
  const n = padFace('jump', 'normal');
  check('6a. normal: the face, no wash, no sweep, no glow', n.pic === 'jump' && n.shade === 0 && n.sweep === 0 && n.glow === false, n);
  const d = padFace('block', 'disabled');
  check('6b. disabled: the grey twin, nothing over it', d.pic === 'block-off' && d.shade === 0 && d.sweep === 0 && !d.glow, d);
  const c = padFace('special', 'cooldown', 0.4);
  check('6c. cooldown: the face washed dark, the sweep at its share', c.pic === 'special' && c.shade > 0.3 && c.sweep === 0.4 && !c.glow, c);
  check('6d. cooldown with no share, or a share over one: no sweep, or the whole ring', padFace('special', 'cooldown').sweep === 0
    && padFace('special', 'cooldown', 0.0005).sweep === 0 && padFace('special', 'cooldown', 1.7).sweep === 1 && padFace('jump', 'normal', 0.5).sweep === 0);
  check('6d2. the sweep starts past a thousandth, and shows a small share as it is', padFace('special', 'cooldown', 0.001).sweep === 0 && padFace('special', 'cooldown', 0.05).sweep === 0.05);
  check('6d3. the washes: cooldown 0.45, quiet 0.25', padFace('jump', 'cooldown', 0.5).shade === 0.45 && padFace('jump', 'quiet').shade === 0.25);
  check('6e. ready and on: the glow', padFace('charge', 'ready').glow === true && padFace('skate', 'on').glow === true && padFace('skate', 'on').shade === 0);
  const q = padFace('block', 'quiet');
  check('6f. quiet: the face a little washed, no glow', q.pic === 'block' && q.shade > 0 && q.shade < c.shade && !q.glow, q);
  check('6g. Attack idle: the grey sword; lit: the sword; hot: the sword glowing; ghost: the sword',
    attackFace('idle', 'melee').pic === 'attack-off' && !attackFace('idle').glow && attackFace('lit', 'melee').pic === 'attack'
    && !attackFace('lit', 'w-sword').glow && attackFace('hot', 'melee').glow === true && attackFace('ghost', 'ranged').pic === 'attack' && !attackFace('ghost').glow);
  const TOOLS = ['mining', 'woodcutting', 'fishing', 'cooking', 'door', 'sleep', 'farm-dig', 'farm-plant'];
  check('6h. any picture but an attack\'s on Attack sits on the empty socket, glowing when hot', TOOLS.every((t) => attackFace('lit', t).pic === 'socket' && !attackFace('lit', t).glow)
    && attackFace('hot', 'mining').glow === true && attackFace('idle', 'fishing').pic === 'socket');
  check('6i2. an attack\'s pictures are the sword\'s', ['', 'none', 'melee', 'ranged', 'staff', 'w-sword', 'w-great-sword-iron', 'w-bow', undefined, null].every((r) => swordIcon(r))
    && !swordIcon('sword') && !swordIcon('mining') && !swordIcon('xw-sword'));
  check('6i. every action has its accent', ['attack', 'jump', 'block', 'special', 'skate', 'charge'].every((k) => /^#[0-9A-F]{6}$/.test(PAD_ACCENT[k])));
}

/* ── 6j. game.css draws attackFace's table on the attack disc ── */
{
  const css = fs.readFileSync(path.join(REPO, 'src/styles/game.css'), 'utf8');
  const has = (sel) => css.indexOf(sel) >= 0;
  check('6j. game.css: the idle disc wears the grey sword, a hot one glows, a non-attack picture the empty socket',
    has('.bt-rjoy-base[data-pad][data-rstate="idle"] .bt-pad-face>img[data-pic="off"]{display:block}')
    && has('.bt-rjoy-base[data-pad][data-rstate="hot"] .bt-pad-glow{opacity:1}')
    && PAD_SWORD_ICONS_CSS.every((r) => has(`:not([data-ricon="${r}"])`)) && has(':not([data-ricon^="w-"])'));
}

/* ── 6k. the context socket's one control ── */
check('6k. the context socket: Charge when it shows, else Skate, else empty; never both',
  ctxFor(true, true) === 'charge' && ctxFor(false, true) === 'charge' && ctxFor(true, false) === 'skate' && ctxFor(false, false) === null
  && ctxFor(1, 1) === null);

/* ── 7. the switch, the pictures ── */
{
  check('7a. on unless thrown', padOn(false) === true && padOn(undefined) === true && padOn(true) === false);
  const pics = padPictures();
  const want = ['housing-r', 'housing-l', 'ring', 'disc', 'knob', 'attack', 'attack-off', 'socket'];
  for (const a of ['jump', 'block', 'special', 'skate', 'charge']) want.push(a, a + '-off');
  check('7b. every picture the faces name is listed', want.every((w) => pics.indexOf(w) >= 0) && pics.length === want.length, pics);
}

/* ── 8. the art ── */
{
  let total = 0, worst = 0;
  const bad = [];
  for (const name of padPictures()) {
    const f = path.join(REPO, 'public/ui/pad', name + '.png');
    if (!fs.existsSync(f)) { bad.push(name + ': missing'); continue; }
    const b = fs.readFileSync(f);
    total += b.length;
    /* a palette PNG: its PLTE chunk's length / 3 is its colours */
    const at = b.indexOf('PLTE');
    const colours = at > 0 ? b.readUInt32BE(at - 4) / 3 : 999;
    if (colours > 256) bad.push(name + ': ' + colours + ' colours');
    if (b.readUInt32BE(16) !== PAD_ART[name].w || b.readUInt32BE(20) !== PAD_ART[name].h) bad.push(name + ': not its listed size');
    worst = Math.max(worst, colours);
  }
  check('8a. every picture on disk, a palette of 256 colours or fewer, its listed size', bad.length === 0, bad);
  check(`8b. under 200 kB in all (${total} bytes), as listed`, total < 200 * 1024 && total === PAD_ART_BYTES, { total, PAD_ART_BYTES });
  /* 2 px a CSS px at the biggest drawn, and no bigger */
  const S = padLayout(true, 932, false), U = padLayout(false, 430, false);
  const biggest = {
    'housing-r': Math.max(S.right.w, U.right.w), 'housing-l': Math.max(S.left.w, U.left.w),
    ring: S.stick.d, disc: S.stick.disc, knob: S.stick.knob, attack: S.sockets.attack.d, 'attack-off': S.sockets.attack.d, socket: S.sockets.attack.d,
  };
  const small = Math.max(...['jump', 'ctx', 'block', 'special'].map((k) => Math.max(S.sockets[k].d, U.sockets[k].d)));
  for (const a of ['jump', 'block', 'special', 'skate', 'charge']) { biggest[a] = small; biggest[a + '-off'] = small; }
  const off = Object.keys(biggest).filter((k) => Math.abs(PAD_ART[k].w - 2 * biggest[k]) > 6).map((k) => [k, PAD_ART[k].w, 2 * biggest[k]]);
  check('8c. each picture 2 px a CSS px at its biggest (within 3 CSS px)', off.length === 0, off);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
