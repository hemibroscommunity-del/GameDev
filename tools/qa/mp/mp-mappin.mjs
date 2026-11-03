/* ═══ v2.3.3879: YOUR OWN PIN ON THE MAP ═══
 * ═══ v2.3.4027: TWO PINS, BLUE AND RED, WITH A LINE TO EACH ═══
 *
 * The owner: "Add a line path when you drop pins on your minimap. When you
 * get near the pin (in game) make a window pop up asking if you want to remove
 * pin. A no just makes it stay up until you drop a new pin and get close to it
 * again. To turn off the pin just tap it on minimap and choose remove pin. If
 * there's already 2 pins on map ask if you want to remove one of the pins
 * (give choice of which to remove - blue or red)."  (game/pinSlots.js,
 * ui/PinCards.jsx, ui/worldMapPins.js, ui/WorldMapOverlay.jsx, the Wheel's
 * minimap.)  On an upright phone (touch) and a computer (wide, a mouse):
 *   1. on the World map a drag drops nothing;
 *   2. a tap (a click) on open ground drops the BLUE pin there, drawn,
 *      "Remove pin" at the top;
 *   3. a second drops the RED one: both drawn, a dashed line to each, a chip
 *      for each;
 *   4. a third, with both up, asks "Replace which pin?" (a ghost pin there):
 *      Cancel (Esc on the computer) changes nothing; Red moves the red pin
 *      there;
 *   5. a tap on the blue pin lifts it; the red one's chip lifts it;
 *   6. the minimap: a pin in the box and one far off, each with a solid line,
 *      the far one on the box's edge with its arrow; standing still redraws
 *      no line;
 *   7. a tap on a pin on the minimap asks "Remove the blue pin?": Cancel
 *      keeps it, Remove lifts it; a tap elsewhere on the box opens the map;
 *   8. a reload keeps the pins (this character, this device);
 *   9. walking up to a pin (within ~160 px, from further than ~240) asks
 *      "You reached the blue pin. Remove it?": Keep leaves it and it never
 *      asks again; a new pin in that colour asks afresh, and Remove (Enter on
 *      the computer) lifts it.
 * Pictures: tools/qa/mp/out/mappin-{phone,desk}-{map,replace,minimap,arrive}.png.
 */
import * as H from './harness.mjs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const OUT = join(H.REPO, 'tools/qa/mp/out');
const st = (P) => P.page.evaluate(() => {
  const wm = window.__btWorldMap || {}, mm = window.__btMinimap || {};
  const cv = document.querySelector('[data-world-map-canvas]');
  const r = cv ? cv.getBoundingClientRect() : null;
  const pins = window.__btMapPin ? window.__btMapPin.slots() : null;
  const ask = document.querySelector('[data-pin-ask]');
  return { pins, open: !!wm.open, drawn: (wm.more && wm.more.mapPins) || [], mini: mm.mapPins || [], lineDraws: mm.pinLineDraws || 0,
    chips: Array.from(document.querySelectorAll('[data-world-map-unpin]')).map((b) => ({ k: b.getAttribute('data-world-map-unpin'), text: (b.textContent || '').trim() })),
    hint: (document.querySelector('[data-world-map-pinhint]') || {}).textContent || null,
    replace: !!document.querySelector('[data-pin-replace]'),
    ask: ask ? { kind: ask.getAttribute('data-pin-ask'), color: ask.getAttribute('data-pin-ask-color'), at: ask.getAttribute('data-pin-ask-at'), text: (ask.textContent || '').trim() } : null,
    mini0: window.__btWheelMini ? { ...window.__btWheelMini } : null,
    me: window._gameState && window._gameState.current && window._gameState.current.player ? { x: Math.round(window._gameState.current.player.x), y: Math.round(window._gameState.current.player.y) } : null,
    cv: r ? { l: r.left, t: r.top, w: r.width, h: r.height } : null };
});
const openMap = async (P) => { await P.page.evaluate(() => window.__btWorldMapOpen(true)); await P.page.waitForTimeout(1500); return st(P); };
const closeMap = async (P) => { await P.page.evaluate(() => window.__btWorldMapOpen(false)); await P.page.waitForTimeout(1200); };
/* a real tap (phone) or click (computer) at a screen spot */
const tapAt = async (P, touch, x, y) => { if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y); await P.page.waitForTimeout(500); };
const tapSel = async (P, touch, sel) => {
  const b = await P.page.$(sel);
  const bb = b && await b.boundingBox();
  if (!bb) return false;
  await tapAt(P, touch, bb.x + bb.width / 2, bb.y + bb.height / 2);
  return true;
};
/* a drag across the canvas, as pointer events (one finger / the mouse) */
const dragOn = (P, x, y) => P.page.evaluate(({ x, y }) => {
  const cv = document.querySelector('[data-world-map-canvas]');
  const ev = (t, dx) => cv.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 7, isPrimary: true, button: 0, clientX: x + dx, clientY: y }));
  ev('pointerdown', 0); for (let i = 1; i <= 6; i++) ev('pointermove', i * 20); ev('pointerup', 120);
}, { x, y });
const near = (a, x, y, px = 3) => !!a && Math.abs(a.x - x) <= px && Math.abs(a.y - y) <= px;
const pinSet = (P, dx, dy, color) => P.page.evaluate(({ dx, dy, color }) => { const S = window._gameState.current; return window.__btMapPin.set(S.player.x + dx, S.player.y + dy, color); }, { dx, dy, color });
const waitAsk = async (P, ms = 6000) => { const t0 = Date.now(); let s = await st(P); while (!s.ask && Date.now() - t0 < ms) { await P.page.waitForTimeout(250); s = await st(P); } return s; };

async function device(P, label, touch, rec) {
  await H.enterWorld(P);
  const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${label}: in the world (guard)`, !!inW, inW);
  if (!inW) return;
  const stopAlive = H.keepAlive(P);
  try {
    let s = await openMap(P);
    const mx = s.cv.l + s.cv.w / 2, my = s.cv.t + s.cv.h / 2;
    /* 1 */
    await dragOn(P, mx - 60, my + 40);
    await P.page.waitForTimeout(500);
    s = await st(P);
    rec.ok(`${label} 1. a drag on the World map drops nothing (hint "${s.hint}")`, !s.pins.blue && !s.pins.red && !s.chips.length && /drop a pin/.test(s.hint || '') && (touch ? /Tap/.test(s.hint) : /Click/.test(s.hint)), s);
    /* 2 */
    await tapAt(P, touch, mx + 50, my - 50);
    s = await st(P);
    const b2 = s.drawn.find((d) => d.color === 'blue');
    rec.ok(`${label} 2. a ${touch ? 'tap' : 'click'} drops the BLUE pin there (${JSON.stringify(s.pins.blue && s.pins.blue.at)}), drawn, "Remove pin" up`,
      !!s.pins.blue && !s.pins.red && !!b2 && !b2.edge && near({ x: s.cv.l + b2.x, y: s.cv.t + b2.y }, mx + 50, my - 50) && s.chips.length === 1 && s.chips[0].k === 'blue' && /Remove pin/.test(s.chips[0].text), s);
    /* 3 */
    await tapAt(P, touch, mx - 70, my + 60);
    s = await st(P);
    await P.page.screenshot({ path: join(OUT, `mappin-${label}-map.png`) }).catch(() => {});
    const r3 = s.drawn.find((d) => d.color === 'red'), b3 = s.drawn.find((d) => d.color === 'blue');
    rec.ok(`${label} 3. a second drops the RED pin; both drawn with a dashed line from you to each, a chip for each (${s.chips.map((c) => c.text).join(' | ')})`,
      !!s.pins.red && !!s.pins.blue && !!r3 && !!b3 && near({ x: s.cv.l + r3.x, y: s.cv.t + r3.y }, mx - 70, my + 60)
        && !!(r3.line && r3.line.dashed && b3.line && b3.line.dashed) && r3.line.x1 === r3.x && b3.line.y1 === b3.y
        && s.chips.map((c) => c.k).join() === 'blue,red' && /Remove blue/.test(s.chips[0].text) && /Remove red/.test(s.chips[1].text), s);
    /* 4 */
    const blueAt = s.pins.blue.at, redAt = s.pins.red.at;
    await tapAt(P, touch, mx + 60, my + 90);
    s = await st(P);
    await P.page.screenshot({ path: join(OUT, `mappin-${label}-replace.png`) }).catch(() => {});
    const asked4 = s.replace;
    if (touch) await tapSel(P, touch, '[data-pin-replace-cancel]');
    else { await P.page.keyboard.press('Escape'); await P.page.waitForTimeout(500); }
    const c4 = await st(P);
    rec.ok(`${label} 4a. with both up a third ${touch ? 'tap' : 'click'} asks "Replace which pin?"; ${touch ? 'Cancel' : 'Esc'} changes nothing (the map stays open)`,
      asked4 && !c4.replace && c4.open && c4.pins.red && c4.pins.red.at.x === redAt.x && c4.pins.blue.at.x === blueAt.x, { asked4, c4: { replace: c4.replace, open: c4.open, pins: c4.pins } });
    await tapAt(P, touch, mx + 60, my + 90);
    await tapSel(P, touch, '[data-pin-replace-pick="red"]');
    s = await st(P);
    const r4 = s.drawn.find((d) => d.color === 'red');
    rec.ok(`${label} 4b. ...asked again, Red moves the red pin there; blue stays`,
      !s.replace && !!r4 && near({ x: s.cv.l + r4.x, y: s.cv.t + r4.y }, mx + 60, my + 90) && s.pins.blue && s.pins.blue.at.x === blueAt.x && s.pins.red.at.x !== redAt.x, s);
    /* 5 */
    const b5 = s.drawn.find((d) => d.color === 'blue');
    if (b5) await tapAt(P, touch, s.cv.l + b5.x, s.cv.t + b5.y - 22);
    const off5 = await st(P);
    await tapSel(P, touch, '[data-world-map-unpin="red"]');
    const none5 = await st(P);
    rec.ok(`${label} 5. a ${touch ? 'tap' : 'click'} on the blue pin lifts it (one chip left: "${off5.chips.map((c) => c.text).join()}"); the red one's chip lifts it`,
      !!b5 && !off5.pins.blue && !!off5.pins.red && off5.chips.length === 1 && /Remove pin/.test(off5.chips[0].text) && !none5.pins.red && !none5.chips.length, { off5: off5.pins, chips: off5.chips, none5: none5.pins });
    await closeMap(P);

    /* 6 */
    await pinSet(P, 520, -340, 'blue');
    await pinSet(P, 6000, 2400, 'red');
    await P.page.waitForTimeout(1200);
    s = await st(P);
    await P.page.screenshot({ path: join(OUT, `mappin-${label}-minimap.png`) }).catch(() => {});
    const mb = s.mini.find((m) => m.color === 'blue'), mr = s.mini.find((m) => m.color === 'red');
    const d0 = s.lineDraws;
    await P.page.waitForTimeout(1500);
    const d1 = (await st(P)).lineDraws;
    rec.ok(`${label} 6. the minimap: the blue pin in the box with a solid line, the far red one on its edge with a line and an arrow; standing still redraws no line (${d0} -> ${d1})`,
      !!mb && !mb.edge && !!mb.line && !mb.line.arrow && !!mr && mr.edge && !!mr.line && mr.line.arrow && d0 > 0 && d1 === d0, { mb, mr, d0, d1 });
    /* 7 */
    const R = s.mini0;
    const head = mb ? { x: R.left + mb.x * ((R.k || 1)), y: R.top + mb.y * ((R.k || 1)) - 9 * (R.k || 1) } : null;
    if (head) await tapAt(P, touch, head.x, head.y);
    let a7 = await waitAsk(P, 2000);
    const ask7 = a7.ask;
    await tapSel(P, touch, '[data-pin-ask-keep]');
    const kept7 = await st(P);
    if (head) await tapAt(P, touch, head.x, head.y);
    a7 = await waitAsk(P, 2000);
    await tapSel(P, touch, '[data-pin-ask-remove]');
    const gone7 = await st(P);
    rec.ok(`${label} 7a. a ${touch ? 'tap' : 'click'} on the blue pin on the minimap asks "${ask7 && ask7.text}" (map shut); Cancel keeps it; asked again, Remove lifts it`,
      !!ask7 && ask7.kind === 'remove' && ask7.color === 'blue' && /Remove the blue pin\?/.test(ask7.text) && !a7.open && !kept7.ask && !!kept7.pins.blue && !!a7.ask && !gone7.ask && !gone7.pins.blue && !gone7.open,
      { ask7, kept: { ask: kept7.ask, blue: kept7.pins.blue }, gone: { ask: gone7.ask, blue: gone7.pins.blue } });
    /* a spot of the box clear of the red pin's edge mark (it is to the south-east) */
    await tapAt(P, touch, R.left + 24 * (R.k || 1), R.top + 24 * (R.k || 1));
    await P.page.waitForTimeout(800);
    const o7 = await st(P);
    rec.ok(`${label} 7b. a ${touch ? 'tap' : 'click'} elsewhere on the minimap opens the World map, no card`, o7.open && !o7.ask, { open: o7.open, ask: o7.ask });
    await closeMap(P);

    /* 8 */
    const before = (await st(P)).pins;
    await P.page.reload();
    await H.enterWorld(P).catch(() => {});
    await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'back in the world' }).catch(() => null);
    await P.page.waitForTimeout(1500);
    s = await st(P);
    rec.ok(`${label} 8. a reload keeps them (${JSON.stringify(s.pins)})`, !!s.pins && !s.pins.blue && !!s.pins.red && !!before.red && s.pins.red.at.x === before.red.at.x && s.pins.red.at.y === before.red.at.y, { s: s.pins, before });

    /* 9 */
    await P.page.evaluate(() => window.__btMapPin.clear());
    s = await st(P);
    const home = s.me;
    await pinSet(P, 520, 0, 'blue');
    await P.page.waitForTimeout(800);   /* seen far: armed */
    const noAsk0 = (await st(P)).ask;
    await H.glideTo(P, home.x + 420, home.y);
    const a9 = await waitAsk(P);
    await P.page.screenshot({ path: join(OUT, `mappin-${label}-arrive.png`) }).catch(() => {});
    const ask9 = a9.ask;
    await tapSel(P, touch, '[data-pin-ask-keep]');
    const k9 = await st(P);
    await H.glideTo(P, home.x, home.y);
    await H.glideTo(P, home.x + 420, home.y);
    await P.page.waitForTimeout(1500);
    const again9 = await st(P);
    rec.ok(`${label} 9a. walking up to the blue pin asks "${ask9 && ask9.text}" (${ask9 && ask9.at}); Keep leaves it up, and walking off and back it never asks again`,
      !noAsk0 && !!ask9 && ask9.kind === 'arrive' && ask9.color === 'blue' && /You reached the blue pin\. Remove it\?/.test(ask9.text) && !k9.ask && !!k9.pins.blue && k9.pins.blue.asked && !again9.ask && !!again9.pins.blue,
      { noAsk0, ask9, k9: { ask: k9.ask, blue: k9.pins.blue }, again: { ask: again9.ask, blue: again9.pins.blue } });
    await H.glideTo(P, home.x, home.y);
    await pinSet(P, 520, 0, 'blue');   /* a new pin in that colour: unasked */
    await P.page.waitForTimeout(800);
    await H.glideTo(P, home.x + 420, home.y);
    const b9 = await waitAsk(P);
    if (touch) await tapSel(P, touch, '[data-pin-ask-remove]');
    else { await P.page.keyboard.press('Enter'); await P.page.waitForTimeout(500); }
    const r9 = await st(P);
    rec.ok(`${label} 9b. a new blue pin asks afresh; ${touch ? 'Remove' : 'Enter (Remove)'} lifts it`,
      !!b9.ask && b9.ask.kind === 'arrive' && b9.ask.color === 'blue' && !r9.ask && !r9.pins.blue, { ask: b9.ask, after: { ask: r9.ask, blue: r9.pins.blue } });
    await H.glideTo(P, home.x, home.y);
  } finally { stopAlive(); }
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Pinner', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try { await device(A, 'phone', true, rec); } finally { await A.ctx.close().catch(() => {}); }
  const B = await H.newPlayer(browser, { name: 'DeskPinner', wsPort, webPort, world: 'wheel', viewport: { width: 1440, height: 900 }, wide: true });
  try { await device(B, 'desk', false, rec); } finally { await B.ctx.close().catch(() => {}); }
}
