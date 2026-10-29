/* ═══ v2.3.3752: THE ARMOURED LOOK'S ORACLE (QA only) ═══
 *
 * Installed by entityRenderer.js only when the address asks for it
 * (`?lookprobe`, `?lookpalette=1`), so a player's page never has it.
 * mp-lookarmour drives it:
 *
 *   window.__btArmourOracle.compare({ looks, sets, scale, frames, cols })
 *     for each look and worn set, every stand and jog frame in all eight
 *     facings (the flipped three as the game draws them) that is masked under
 *     that set (the knight figure's frames are its own art either way): the
 *     OLD masked frame (the bake over the look's recoloured picture,
 *     entityRenderer _maskedBodyFrame) and the NEW (the numbers, the mask's
 *     bits and the residue sprite, lookArmour.js), each drawn through the
 *     sharp read the body is drawn with, compared texel for texel.
 *
 * `looks` are [skinId, pantsId, shoesId, eyeId]; `sets` [chestId|null, legsId|null].
 */
import { Container, Sprite, RenderTexture } from 'pixi.js';
import { paletteRendererOf } from './paletteTex.js';
import { lookArmourFrame, lookArmourPrewarm } from './lookArmour.js';
import { lookHas } from './lookPalette.js';
import { gearTint } from './gearVariants.js';

const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const MIRRORED = ['east', 'northeast', 'southwest'];
/* a colour may be P1's bar (16 levels a channel of the art) and the residue's
   edge blend (2) from the old picture's */
const COLOUR_BAR = 18;

export function installArmourProbe(dep) {
  if (typeof window === 'undefined') return;
  const { getBodyFrame, getLookBodyEntries, getFrame, getGearFrame, playerFrameCount, maskedFrame, fullsetCovers, loadGear, reference, lookJob } = dep;
  const oldBody = (L, pose, dir, f) => getBodyFrame(L[0], L[1], L[2], pose, dir, f, null, 'none', L[3], null, undefined);
  const entriesOf = (L, pose, dir) => getLookBodyEntries(L[0], L[1], L[2], pose, dir, null, L[3], null, undefined);
  /* the old path's body bake for this look, waited for (getBodyFrame hands
     out the shipped frame while one runs) */
  async function baked(L, timeoutMs = 120000, poses = ['stand', 'jog']) {
    const t0 = Date.now();
    for (;;) {
      let pending = 0;
      for (const pose of poses) for (const dir of DIRS) {
        if (!lookHas('body', pose + '-' + dir)) continue;
        const t = oldBody(L, pose, dir, 0);
        const plain = L.slice(0, 3).every((x) => !x || x === 'default') && (!L[3] || L[3] === 'default');
        if (!plain && t === getFrame(pose, dir, 0)) pending++;
      }
      if (!pending) return true;
      if (Date.now() - t0 > timeoutMs) return false;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  function wornOf(set, pose, dir, f) {
    const worn = [];
    if (set[0]) { const t = getGearFrame('chest', set[0], pose, dir, f); if (t) worn.push({ k: 'chest:' + set[0], tex: t }); }
    if (set[1]) { const t = getGearFrame('legs', set[1], pose, dir, f); if (t) worn.push({ k: 'legs:' + set[1], tex: t }); }
    return worn;
  }
  function render(cells, pick, scale, cell, cols, withGear) {
    const r = paletteRendererOf();
    const rows = Math.ceil(cells.length / cols);
    const rt = RenderTexture.create({ width: cols * cell, height: Math.max(1, rows) * cell, resolution: 1 });
    const box = new Container();
    cells.forEach((c, i) => {
      const list = pick(c).slice();
      if (withGear) for (const w of c.worn) list.push({ tex: w.tex, tint: gearTint(w.k.slice(w.k.indexOf(':') + 1)) });
      for (const t of list) {
        if (!t) continue;
        const s = new Sprite(t.tex || t);
        if (t.tint != null) s.tint = t.tint;
        s._sharp = true;   /* drawn as the body is (sharpPixels.js) */
        s.anchor.set(0.5);
        s.scale.set((c.mirror ? -1 : 1) * scale, scale);
        s.position.set((i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2);
        box.addChild(s);
      }
    });
    r.render({ container: box, target: rt, clear: true, clearColor: [0, 0, 0, 0] });
    const px = r.extract.pixels(rt);
    box.destroy({ children: true });
    rt.destroy(true);
    return { data: px.pixels, w: px.width, h: px.height };
  }
  /* v2.3.3752: every pose the body has numbers for and the bake masks
     (P1's hit, roll and mining; the pickup draws the plain body under a full
     set and fishing is drawn the old way under armour) */
  async function compare({ looks, sets, scale = 1, frames = 0, cols = 16, poses = ['stand', 'jog', 'hit', 'dodge', 'mine'] } = {}) {
    await loadGear(sets);
    const out = [];
    for (const L of looks) {
      const ok = await baked(L, 120000, poses);
      for (const set of sets) {
        const cells = [];
        let notDecided = 0, oldPlain = 0, tOld = 0, tNew = 0;
        const refs = [];
        for (const pose of poses) {
          for (const dir of DIRS) {
            if (!lookHas('body', pose + '-' + dir)) continue;
            const ents = entriesOf(L, pose, dir);
            if (!ents) continue;
            const n = Math.max(1, playerFrameCount(pose, dir) || 1);
            for (let f = 0; f < n && f < (frames || n); f++) {
              const worn = wornOf(set, pose, dir, f);
              if (!worn.length || fullsetCovers(worn, pose, dir)) continue;
              const pi = { pose, dir, frameIdx: f };
              const ob = oldBody(L, pose, dir, f);
              let t0 = performance.now();
              const ot = maskedFrame(ob, worn, 6, pi);
              tOld += performance.now() - t0;
              if (ot === ob) oldPlain++;
              t0 = performance.now();
              await lookArmourPrewarm(ents, worn, pi);
              tNew += performance.now() - t0;
              const nw = lookArmourFrame(ents, worn, pi, 0);
              if (!nw) { notDecided++; continue; }
              /* the masked bake's own picture over the body as the numbers
                 draw it: what the new way must reproduce */
              const rf = await reference(lookJob(ents, worn, pi));
              if (rf) refs.push(rf);
              for (const mirror of MIRRORED.indexOf(dir) >= 0 ? [false, true] : [false]) {
                cells.push({ pose, dir, f, mirror, ot, rf, nt: nw.tex, res: nw.residue, worn });
              }
            }
          }
        }
        const cell = Math.ceil(128 * scale) + 4;
        const a = render(cells, (c) => [c.ot], scale, cell, cols);
        const b = render(cells, (c) => [c.nt, c.res], scale, cell, cols);
        const rr = render(cells, (c) => [c.rf], scale, cell, cols);
        /* what a player sees: the armour drawn over each way, the old picture
           against the new (P1's colours and the bake's decisions on them
           included) -- information */
        const seen = { drawn: 0, over18: 0, worst: 0, cells: Object.create(null) };
        {
          const ga = render(cells, (c) => [c.ot], scale, cell, cols, true);
          const gb = render(cells, (c) => [c.nt, c.res], scale, cell, cols, true);
          for (let p = 0; p < ga.data.length; p += 4) {
            if (!ga.data[p + 3] && !gb.data[p + 3]) continue;
            seen.drawn++;
            let m = 0;
            for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(ga.data[p + k] - gb.data[p + k]));
            if (m > seen.worst) seen.worst = m;
            if (m > 18) {
              seen.over18++;
              const q = p >> 2, x = q % ga.w, y = Math.floor(q / ga.w);
              const c = cells[Math.floor(y / cell) * cols + Math.floor(x / cell)];
              const name = c ? `${c.pose}-${c.dir}#${c.f}${c.mirror ? 'm' : ''}` : '?';
              seen.cells[name] = (seen.cells[name] || 0) + 1;
            }
          }
          seen.cells = Object.entries(seen.cells).sort((x, y) => y[1] - x[1]).slice(0, 6);
        }
        for (const t of refs) { try { t.destroy(true); } catch (e) { /* gone */ } }
        /* the verdict: the new way against the bake's own picture over the
           same body, every channel; and how far the new way is from the old
           picture's (P1's 256 colours: information) */
        const exact = { drawn: 0, over: 0, worst: 0, hist: {}, cells: Object.create(null), bad: [] };
        for (let p = 0; p < rr.data.length; p += 4) {
          if (!rr.data[p + 3] && !b.data[p + 3]) continue;
          exact.drawn++;
          let m = 0;
          for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(rr.data[p + k] - b.data[p + k]));
          if (!m) continue;
          exact.hist[m] = (exact.hist[m] || 0) + 1;
          if (m > exact.worst) exact.worst = m;
          if (m > 2) {
            exact.over++;
            const q = p >> 2, x = q % rr.w, y = Math.floor(q / rr.w);
            const c = cells[Math.floor(y / cell) * cols + Math.floor(x / cell)];
            const name = c ? `${c.pose}-${c.dir}#${c.f}${c.mirror ? 'm' : ''}` : '?';
            exact.cells[name] = (exact.cells[name] || 0) + 1;
            if (exact.bad.length < 4) exact.bad.push({ at: [x % cell, y % cell], cell: name, ref: Array.from(rr.data.slice(p, p + 4)), now: Array.from(b.data.slice(p, p + 4)) });
          }
        }
        exact.cells = Object.entries(exact.cells).sort((x, y) => y[1] - x[1]).slice(0, 6);
        const hist = {};
        let drawn = 0, differ = 0, worst = 0, residues = 0, alphaOver = 0, worstAlpha = 0, colourOver = 0, worstColour = 0;
        /* what each way holds on the chip for these frames: the old masked
           pictures (RGBA, a mip chain a third more), against the residues
           (the same) -- the bits are the book's, counted by __btLookArmour */
        const bytesOf = (t) => (t && t.source ? t.source.pixelWidth * t.source.pixelHeight * 4 * (t.source.autoGenerateMipmaps ? 4 / 3 : 1) : 0);
        const oldSeen = new Set(), resSeen = new Set();
        let oldBytes = 0, resBytes = 0;
        for (const c of cells) {
          if (c.res) residues++;
          if (c.ot && c.ot.source && !oldSeen.has(c.ot.source) && c.ot.source._btLook == null) { oldSeen.add(c.ot.source); oldBytes += bytesOf(c.ot); }
          if (c.res && !resSeen.has(c.res.source)) { resSeen.add(c.res.source); resBytes += bytesOf(c.res); }
        }
        const bad = [];
        const badCells = Object.create(null);
        for (let p = 0; p < a.data.length; p += 4) {
          if (!a.data[p + 3] && !b.data[p + 3]) continue;
          drawn++;
          let m = 0, mc = 0;
          for (let k = 0; k < 3; k++) mc = Math.max(mc, Math.abs(a.data[p + k] - b.data[p + k]));
          /* v2.3.3752: the SHAPE (alpha: what shows, the masks' job) apart
             from the colour, since P1 cut the body's sheets to 256 colours
             within 16 levels of the art (look-palette.md, the quality bar):
             a colour can be that far from the old picture's anywhere */
          const ma = Math.abs(a.data[p + 3] - b.data[p + 3]);
          if (ma > 2) alphaOver++;
          if (ma > worstAlpha) worstAlpha = ma;
          if (mc > COLOUR_BAR) colourOver++;
          if (mc > worstColour) worstColour = mc;
          m = Math.max(ma, mc);
          if (!m) continue;
          hist[m] = (hist[m] || 0) + 1;
          if (ma > 2 || mc > COLOUR_BAR) {
            differ++;
            const q = p >> 2, x = q % a.w, y = Math.floor(q / a.w);
            const ci = Math.floor(y / cell) * cols + Math.floor(x / cell);
            const c = cells[ci];
            const name = c ? `${c.pose}-${c.dir}#${c.f}${c.mirror ? 'm' : ''}` : '?';
            badCells[name] = (badCells[name] || 0) + 1;
            if (bad.length < 6) bad.push({ at: [x % cell, y % cell], cell: name, old: Array.from(a.data.slice(p, p + 4)), now: Array.from(b.data.slice(p, p + 4)) });
          }
          if (m > worst) worst = m;
        }
        out.push({ look: L.join('/'), set: set.join('+'), baked: ok, tOld: Math.round(tOld), tNew: Math.round(tNew), oldKB: Math.round(oldBytes / 1024), residueKB: Math.round(resBytes / 1024), frames: cells.length, residues, notDecided, oldPlain, drawn, differ, worst, hist, bad, exact, seen, alphaOver, worstAlpha, colourOver, worstColour,
          badCells: Object.entries(badCells).sort((x, y) => y[1] - x[1]).slice(0, 8) });
      }
    }
    return out;
  }
  /* the owner's side-by-side: for each (look, set, pose, dir, frame) the old
     way (left) and the new (right), each with the armour drawn over it as the
     game draws it (the pieces' own sheets, tinted), and the body alone under
     them; on a dark ground, `scale` x; a PNG data URL */
  async function picture({ rows, scale = 3 } = {}) {
    await loadGear(rows.map((r) => r.set));
    const r = paletteRendererOf();
    const cell = Math.ceil(128 * scale);
    const box = new Container();
    const { Graphics } = await import('pixi.js');
    const bg = new Graphics().rect(0, 0, cell * 4, cell * rows.length).fill(0x2a2f3a);
    box.addChild(bg);
    let y = 0;
    for (const row of rows) {
      const L = row.look, set = row.set, pose = row.pose, dir = row.dir, f = row.f || 0;
      await baked(L);
      const worn = wornOf(set, pose, dir, f);
      const pi = { pose, dir, frameIdx: f };
      const ob = oldBody(L, pose, dir, f);
      const ot = maskedFrame(ob, worn, 6, pi);
      const ents = entriesOf(L, pose, dir);
      await lookArmourPrewarm(ents, worn, pi);
      const nw = lookArmourFrame(ents, worn, pi, 0);
      const put = (tex, col, tint) => {
        if (!tex) return;
        const sp = new Sprite(tex);
        sp._sharp = true;
        sp.anchor.set(0.5);
        sp.scale.set((row.mirror ? -1 : 1) * scale, scale);
        sp.position.set(col * cell + cell / 2, y + cell / 2);
        if (tint != null) sp.tint = tint;
        box.addChild(sp);
      };
      const gear = (col) => { for (const w of worn) put(w.tex, col, gearTint(w.k.slice(w.k.indexOf(':') + 1))); };
      put(ot, 0); gear(0);
      if (nw) { put(nw.tex, 1); put(nw.residue, 1); gear(1); }
      put(ot, 2);
      if (nw) { put(nw.tex, 3); put(nw.residue, 3); }
      y += cell;
    }
    const rt = RenderTexture.create({ width: cell * 4, height: cell * rows.length, resolution: 1 });
    r.render({ container: box, target: rt, clear: true, clearColor: [0, 0, 0, 0] });
    const url = r.extract.base64 ? await r.extract.base64(rt) : r.extract.canvas(rt).toDataURL('image/png');
    box.destroy({ children: true });
    rt.destroy(true);
    return url;
  }
  window.__btArmourOracle = { compare, picture };
}
