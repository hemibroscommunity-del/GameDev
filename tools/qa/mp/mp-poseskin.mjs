/* ═══ v2.3.2861: HIT, MINING AND DODGE WEAR THE WALKING SKIN ═══
 *
 * Owner: "fix the orange head during hits/mining to be whatever color the
 * character color should be."  With the default skin nothing is recoloured,
 * and the hit, mine and dodge sheets were painted a more orange skin than
 * walking (playerSkins POSE_SKIN_FLOOR has the measurement).  Now the default
 * skin bakes those three to the walking skin, as v2.3.1788 did for the sword
 * and bow.  This checks, on a player who never picked a skin:
 *
 *   - the three are baked during the loading screen, before the first hit --
 *     otherwise the first one would flash the painted orange while it baked;
 *   - the body the renderer draws for each, and the hit and mining heads drawn
 *     over armour, carry the walking skin: their mean green-over-red matches the
 *     standing body's, where the painted sheets sit 0.03-0.09 lower;
 *   - the monkey's fur over a hit (painted in the same orange) follows it;
 *   - another player, on a skin of their own, sees the same: the default
 *     player's hit is baked for them and drawn in the walking skin.
 *
 * Measured on the frame the renderer holds (cropped frames rebuilt whole), so
 * the ground and the effects around the figure cannot enter it.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

/* Pictures of the figure for the PR (tools/qa/mp/out, git-ignored); the
   checks never read them.  `poke` holds a pose, as in mp-headink. */
const SHOTS = H.REPO + '/tools/qa/mp/out';
const shot = async (P, name, poke) => {
  if (poke) {
    await P.page.evaluate((code) => {
      window.__qaShotPoke = new Function('S', code);
      const tick = () => {
        if (!window.__qaShotPoke) return;
        try { window.__qaShotPoke(window._gameState.current); } catch (e) { /* ignore */ }
        requestAnimationFrame(tick);
      };
      tick();
    }, poke);
    await P.page.waitForTimeout(700);
  }
  const box = await H.figureBox(P, { pad: 24 }).catch(() => null);
  if (box) await P.page.screenshot({ path: `${SHOTS}/poseskin-${name}.png`, clip: box }).catch(() => {});
  if (poke) await P.page.evaluate(() => { window.__qaShotPoke = null; });
};

const COACH_OFF = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}`;

/* The mean skin colour of the body sprite and of the head overlay, for every
   distinct frame drawn in `ms`, while `poke` holds the pose. */
const sampleSkin = (P, ms, poke) => P.page.evaluate(async ({ dur, poke }) => {
  const R = window._pixiRenderer;
  const pokeFn = poke ? new Function('S', poke) : null;
  /* playerSkins' own skin test, and its v2.3.2860 eye-white rule when it has
     it -- the mean is of the skin, not of the eyes */
  const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25 && g < 0.8 * r;
  const meanOf = (spr) => {
    const t = spr && spr.visible && spr.texture;
    if (!t || !t.source || !t.source.resource) return null;
    const f = t.frame, tr = t.trim || { x: 0, y: 0 }, orig = t.orig || f;
    const W = Math.round(orig.width), Hh = Math.round(orig.height);
    const c = document.createElement('canvas'); c.width = W; c.height = Hh;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(t.source.resource, f.x, f.y, f.width, f.height, tr.x, tr.y, f.width, f.height);
    const d = g.getImageData(0, 0, W, Hh).data;
    let n = 0, sr = 0, sg = 0, sb = 0;
    for (let o = 0; o < d.length; o += 4) {
      if (!isSkin(d[o], d[o + 1], d[o + 2], d[o + 3])) continue;
      n++; sr += d[o]; sg += d[o + 1]; sb += d[o + 2];
    }
    return n ? { n, gr: +(sg / sr).toFixed(3) } : { n: 0, gr: null };
  };
  const out = [];
  const seen = new Set();
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      try { if (pokeFn && S) pokeFn(S); } catch (e) { /* the pose holds or it does not */ }
      const disp = R.playerDisplayRaw && R.playerDisplayRaw();
      const body = disp && disp._spriteBody, head = disp && disp._bodyHead;
      const pose = disp ? disp._animPose : null, dir = disp ? disp._animDir : null;
      const bt = body && body.visible && body.texture;
      const ht = head && head.visible && head.texture;
      const key = (bt ? bt.uid : 'x') + ':' + (ht ? ht.uid : 'x') + ':' + pose;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ t: Math.round(performance.now() - t0), pose, dir, body: meanOf(body), head: meanOf(head) });
      }
      if (performance.now() - t0 < dur) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
  return out;
}, { dur: ms, poke: poke || null });

const settle = async (P, wsPort) => {
  await H.clickText(P, 'CLOSE').catch(() => {});
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id).catch(() => {});
  await P.page.waitForTimeout(1000);
  await H.closeNpcDialogue(P).catch(() => {});
};

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  mkdirSync(SHOTS, { recursive: true });
  /* the plain player alone first: their pictures are taken before the watcher
     arrives, so no second figure or name plate stands in them */
  const A = await H.newPlayer(browser, { name: 'Plain', wsPort, webPort, dpr: 2, init: COACH_OFF });
  opened.push(A);
  await H.enterWorld(A);
  await A.page.waitForTimeout(2500);
  await settle(A, wsPort);

  const look = await A.page.evaluate(() => ({ skin: localStorage.getItem('bt-skin') || 'default' }));
  rec.ok('the player never picked a skin (guard)', look.skin === 'default', look);

  /* ── BAKED BEFORE THE FIRST HIT ── */
  const keys = await A.page.evaluate(() => (window.__btBodySheetKeys ? window.__btBodySheetKeys() : null));
  const want = ['hit/south', 'hit/southwest', 'hit/east', 'hit/northeast', 'hit/north', 'mine/south', 'dodge/south', 'dodge/east'];
  const missing = want.filter((w) => !(keys || []).some((k) => k.startsWith('default/default/default/') && k.endsWith('|' + w)));
  rec.ok('the default skin\'s hit, mining and dodge sheets are baked during the loading screen, before any is used',
    !!keys && missing.length === 0, { missing, sample: (keys || []).slice(0, 12) });
  /* what they cost: the default combo baked nothing before this, so every byte
     here is new.  Frames are cropped to the figure (v2.3.2791). */
  const cost = await A.page.evaluate((w) => {
    if (!window.__btBodySheetKeys || !window.__btBodySheetBytes) return null;
    const ks = window.__btBodySheetKeys().filter((k) => k.startsWith('default/default/default/'));
    const per = {};
    let total = 0;
    for (const k of ks) {
      const pd = k.slice(k.lastIndexOf('|') + 1);
      if (w.indexOf(pd) === -1) continue;
      const b = window.__btBodySheetBytes(k);
      per[pd] = (per[pd] || 0) + b; total += b;
    }
    return { total, per, n: ks.length };
  }, want);
  console.log(`    the new bakes hold ${cost ? (cost.total / 1e6).toFixed(2) : '?'} MB (${cost ? Object.entries(cost.per).map(([k, v]) => `${k} ${Math.round(v / 1e3)} KB`).join(', ') : ''}); default-combo sheets baked: ${cost ? cost.n : '?'}`);
  rec.ok('...and nothing else is baked for the default combo (the walking sheets stay the shipped art)',
    !!cost && cost.n === want.length, cost && cost.n);

  /* face the camera: the south sheets are the ones measured below */
  await A.page.keyboard.down('s');
  await A.page.waitForTimeout(220);
  await A.page.keyboard.up('s');
  await A.page.waitForTimeout(700);
  const stand = (await sampleSkin(A, 900)).filter((s) => s.pose === 'stand' && s.body && s.body.gr != null);
  const walk = stand.length ? stand.reduce((a, s) => a + s.body.gr, 0) / stand.length : null;
  console.log(`    standing, green/red per frame: ${stand.map((s) => s.body.gr).join(' ')}`);
  rec.ok('the standing body is drawn and measurable (guard)', stand.length >= 1 && walk != null, stand.slice(0, 3));
  await shot(A, 'stand');
  const close = (gr) => walk != null && gr != null && Math.abs(gr - walk) <= 0.025;

  /* ── A HIT ── (the pose lasts 250 ms from S._hitFlash; set ahead and swept, as mp-headink does) */
  const HIT = 'const k = (performance.now() / 5) % 300; S._hitFlash = Date.now() + 400 - k;';
  const hit = (await sampleSkin(A, 1800, HIT)).filter((s) => s.pose === 'hit' && s.body && s.body.gr != null);
  console.log(`    hit, green/red per frame: ${hit.map((s) => s.body.gr).join(' ')} (standing ${walk && walk.toFixed(3)})`);
  rec.ok('a hit is drawn (guard)', hit.length >= 1, hit.length);
  await shot(A, 'hit', 'S._hitFlash = Date.now() + 300;');
  rec.ok('a HIT wears the walking skin on every frame, not the painted orange',
    hit.length > 0 && hit.every((s) => close(s.body.gr)), hit.map((s) => s.body.gr));

  /* ── MINING ── */
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const node = { id: 'qa_node_poseskin', nodeType: 'oreVein', tierLvl: 1, x: S.player.x, y: S.player.y + 20,
      alive: true, hp: 999, maxHp: 999, r: 40 };
    S.gatherNodes = (S.gatherNodes || []).filter((n) => n && n.id !== node.id).concat([node]);
    S._extraction = { skill: 'mining', status: 'waiting', nodeRef: node, nodeId: node.id,
      startedAt: Date.now(), windowOpensAt: Date.now() + 600000 };
  });
  const mine = (await sampleSkin(A, 2500)).filter((s) => s.pose === 'mine' && s.body && s.body.gr != null);
  await shot(A, 'mine');
  await A.page.evaluate(() => { const S = window._gameState.current; S._extraction = null; });
  console.log(`    mining, green/red per frame: ${mine.map((s) => s.body.gr).join(' ')}`);
  rec.ok('mining is drawn (guard)', mine.length >= 3, mine.length);
  rec.ok('MINING wears the walking skin on every frame of the swing',
    mine.length > 0 && mine.every((s) => close(s.body.gr)), mine.map((s) => s.body.gr));

  /* ── A DODGE ──
     The roll lasts 250 ms and the game clears it the first tick after that --
     and a loaded test box draws a frame every few hundred ms, so a roll started
     "now" is over before it is ever drawn.  So it is started ahead of the clock
     by the last frame's length, which the next tick will spend, and swept
     through its 250 ms from there: the frame after sees ages 0-250 ms. */
  const DODGE = `const now = performance.now();
    const dt = window.__qaPoseskinLast ? Math.min(1000, now - window.__qaPoseskinLast) : 16;
    window.__qaPoseskinLast = now;
    const u = (now / 3) % 250;
    S._dodgeRoll = { angle: Math.PI / 2, startTime: Date.now() - u + dt };`;
  const dodgeAll = await sampleSkin(A, 2200, DODGE);
  const dodge = dodgeAll.filter((s) => s.pose === 'dodge' && s.body && s.body.gr != null && s.body.n > 200);
  await A.page.evaluate(() => { const S = window._gameState.current; S._dodgeRoll = null; });
  console.log(`    dodge, green/red per frame: ${dodge.map((s) => s.body.gr).join(' ')}  [all: ${dodgeAll.map((s) => `${s.pose}/${s.dir}/${s.body ? s.body.n : '-'}`).join(' ')}]`);
  rec.ok('a dodge is drawn (guard)', dodge.length >= 2, dodge.length);
  rec.ok('a DODGE wears the walking skin on every frame of the roll',
    dodge.length > 0 && dodge.every((s) => close(s.body.gr)), dodge.map((s) => s.body.gr));

  /* ── THE MONKEY'S FUR ──
     The fur over the head is shipped as bare skin and recoloured like the body;
     its hit frames were painted in the hit sheets' orange (0.58-0.62), so on the
     default skin it has to follow the body to the walking skin.  Measured on the
     fur's own pixels: the fur image says where they are in the strip. */
  await A.page.evaluate(() => { if (window.__btSetSpecies) window.__btSetSpecies('monkey'); });
  await A.page.waitForTimeout(1200);
  /* The fur has its own frame only on hit frames 1-5 facing south (frame 0
     draws the plain head piece), and HIT above holds the flash ahead of the
     clock, which mostly shows frame 0.  So this sweeps the hit's 250 ms the way
     the roll does: started the last frame's length early, so the next frame
     sees an age of 0-240 ms. */
  const HIT_SWEEP = `const now = performance.now();
    const dt = window.__qaPoseskinLast ? Math.min(1000, now - window.__qaPoseskinLast) : 16;
    window.__qaPoseskinLast = now;
    S._hitFlash = Date.now() - ((now / 3) % 240) + dt;`;
  const fur = await A.page.evaluate(async ({ dur, poke }) => {
    const R = window._pixiRenderer;
    const pokeFn = new Function('S', poke);
    const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
    /* dir -> every canvas the fur sprite drew from.  A hit frame with no
       overlay of its own falls back to the plain head piece (speciesArt's
       frameOverlays cover 196 of 231 frames), so the strip is picked below by
       its size. */
    const strips = new Map();
    const t0 = performance.now();
    await new Promise((done) => {
      const tick = () => {
        const S = window._gameState && window._gameState.current;
        try { if (S) pokeFn(S); } catch (e) { /* ignore */ }
        const disp = R.playerDisplayRaw && R.playerDisplayRaw();
        const sp = disp && disp._speciesSprite;
        if (sp && sp.visible && disp._animPose === 'hit' && sp.texture && sp.texture.source && sp.texture.source.resource) {
          const set = strips.get(disp._animDir) || new Set();
          set.add(sp.texture.source.resource);
          strips.set(disp._animDir, set);
        }
        if (performance.now() - t0 < dur) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    const load = (u) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; });
    const out = [];
    for (const [dir, set] of strips) {
      const furImg = await load(`/sprites/traits/species/monkey/frames/hit-${dir}.fur.png?v=2.3.2682`);
      if (!furImg) { out.push({ dir, err: 'no fur image' }); continue; }
      const cvs = [...set].find((c) => c.width === furImg.naturalWidth && c.height === furImg.naturalHeight);
      if (!cvs) { out.push({ dir, err: 'the hit strip was not drawn', sizes: [...set].map((c) => `${c.width}x${c.height}`) }); continue; }
      const W = cvs.width, Hh = cvs.height;
      const a = document.createElement('canvas'); a.width = W; a.height = Hh;
      const ga = a.getContext('2d', { willReadFrequently: true }); ga.drawImage(furImg, 0, 0);
      const b = document.createElement('canvas'); b.width = W; b.height = Hh;
      const gb = b.getContext('2d', { willReadFrequently: true }); gb.drawImage(cvs, 0, 0);
      const fd = ga.getImageData(0, 0, W, Hh).data, sd = gb.getImageData(0, 0, W, Hh).data;
      let n = 0, sr = 0, sg = 0, nr = 0, ng = 0;
      for (let o = 0; o < fd.length; o += 4) {
        if (fd[o + 3] < 250 || !isSkin(fd[o], fd[o + 1], fd[o + 2], fd[o + 3])) continue;
        n++; sr += sd[o]; sg += sd[o + 1]; nr += fd[o]; ng += fd[o + 1];
      }
      out.push({ dir, n, gr: n ? +(sg / sr).toFixed(3) : null, painted: n ? +(ng / nr).toFixed(3) : null });
    }
    return out;
  }, { dur: 2400, poke: HIT_SWEEP });
  await A.page.evaluate(() => { if (window.__btSetSpecies) window.__btSetSpecies('none'); });
  console.log(`    monkey hit fur, green/red: ${fur.map((f) => `${f.dir} ${f.gr} (painted ${f.painted})`).join(', ')}`);
  rec.ok('a monkey\'s hit draws the fur (guard)', fur.length >= 1 && fur.every((f) => f.n > 50), fur);
  rec.ok('...and the FUR wears the walking skin too, not the painted orange',
    fur.length > 0 && fur.every((f) => close(f.gr)), fur);

  /* ── THE HEADS DRAWN OVER ARMOUR ── */
  await A.page.evaluate(() => { if (window.__btSetGear) window.__btSetGear('chest', 'steelplate'); });
  await A.page.waitForTimeout(1500);
  const hitHead = (await sampleSkin(A, 1800, HIT)).filter((s) => s.pose === 'hit' && s.head && s.head.gr != null);
  console.log(`    hit in armour, head green/red per frame: ${hitHead.map((s) => s.head.gr).join(' ')}`);
  rec.ok('a hit in armour draws the head overlay (guard)', hitHead.length >= 1, hitHead.length);
  await shot(A, 'hit-armour', 'S._hitFlash = Date.now() + 300;');
  rec.ok('...and the HEAD wears the walking skin too -- the owner\'s orange head',
    hitHead.length > 0 && hitHead.every((s) => close(s.head.gr)), hitHead.map((s) => s.head.gr));
  await A.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const node = { id: 'qa_node_poseskin', nodeType: 'oreVein', tierLvl: 1, x: S.player.x, y: S.player.y + 20,
      alive: true, hp: 999, maxHp: 999, r: 40 };
    S.gatherNodes = (S.gatherNodes || []).filter((n) => n && n.id !== node.id).concat([node]);
    S._extraction = { skill: 'mining', status: 'waiting', nodeRef: node, nodeId: node.id,
      startedAt: Date.now(), windowOpensAt: Date.now() + 600000 };
  });
  const mineHead = (await sampleSkin(A, 2500)).filter((s) => s.pose === 'mine' && s.head && s.head.gr != null);
  await shot(A, 'mine-armour');
  await A.page.evaluate(() => { const S = window._gameState.current; S._extraction = null; });
  console.log(`    mining in armour, head green/red per frame: ${mineHead.map((s) => s.head.gr).join(' ')}`);
  rec.ok('mining in armour draws the head overlay (guard)', mineHead.length >= 3, mineHead.length);
  rec.ok('...and that head wears the walking skin on every frame',
    mineHead.length > 0 && mineHead.every((s) => close(s.head.gr)), mineHead.map((s) => s.head.gr));

  /* ── THE WATCHER ARRIVES ──
     On a skin of their own, so the plain player's hit sheets are not the
     watcher's own bake: they have to be made for the peer. */
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, dpr: 2,
    init: COACH_OFF + ` try { localStorage.setItem('bt-skin', 'olive'); } catch (e) {}` });
  opened.push(B);
  await H.enterWorld(B);
  await B.page.waitForTimeout(2500);
  await settle(B, wsPort);
  /* the yardstick for the cost above: what the watcher, who picked a skin,
     already holds for the same job -- every pose they can take, in their colour */
  const picked = await B.page.evaluate(() => {
    if (!window.__btBodySheetKeys || !window.__btBodySheetBytes) return null;
    const ks = window.__btBodySheetKeys().filter((k) => k.startsWith('olive/'));
    let total = 0;
    for (const k of ks) total += window.__btBodySheetBytes(k);
    return { total, n: ks.length };
  });
  console.log(`    a player who picked a skin holds ${picked ? (picked.total / 1e6).toFixed(2) : '?'} MB of bakes (${picked ? picked.n : '?'} sheets)`);
  rec.ok('the new bakes cost well under half of what any player who picked a skin already holds',
    !!cost && !!picked && cost.total > 0 && cost.total < 0.5 * picked.total, { cost: cost && cost.total, picked });
  /* out of the armour, so the watcher measures the plain player's skin */
  await A.page.evaluate(() => { if (window.__btSetGear) window.__btSetGear('chest', 'none'); });
  await A.page.waitForTimeout(1000);

  /* ── ANOTHER PLAYER'S SCREEN ──
     The watcher's own skin is olive, so the plain player's hit sheets are made
     for them the first time they see each facing: its first frame may still be
     the painted sheet while it bakes (a peer's look cannot be known at load).
     Every frame of that facing from then on has to wear the walking skin. */
  const aId = await H.readState(A, (S) => S.myId);
  await H.waitMutualSight(A, B).catch(() => {});
  await A.page.keyboard.down('s');
  await A.page.waitForTimeout(220);
  await A.page.keyboard.up('s');
  await A.page.waitForTimeout(800);
  const peerAll = await B.page.evaluate(async ({ pid, dur }) => {
    const R = window._pixiRenderer;
    const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25 && g < 0.8 * r;
    const meanOf = (spr) => {
      const t = spr && spr.visible && spr.texture;
      if (!t || !t.source || !t.source.resource) return null;
      const f = t.frame, tr = t.trim || { x: 0, y: 0 }, orig = t.orig || f;
      const W = Math.round(orig.width), Hh = Math.round(orig.height);
      const c = document.createElement('canvas'); c.width = W; c.height = Hh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      g.drawImage(t.source.resource, f.x, f.y, f.width, f.height, tr.x, tr.y, f.width, f.height);
      const d = g.getImageData(0, 0, W, Hh).data;
      let n = 0, sr = 0, sg = 0;
      for (let o = 0; o < d.length; o += 4) {
        if (!isSkin(d[o], d[o + 1], d[o + 2], d[o + 3])) continue;
        n++; sr += d[o]; sg += d[o + 1];
      }
      return n ? { n, gr: +(sg / sr).toFixed(3) } : { n: 0, gr: null };
    };
    const out = [];
    const seen = new Set();
    const t0 = performance.now();
    await new Promise((done) => {
      const tick = () => {
        const S = window._gameState && window._gameState.current;
        const o = S && S.others && S.others[pid];
        const k = (performance.now() / 5) % 300;
        if (o) o._hitFlash = Date.now() + 400 - k;
        const disp = R.peerDisplayRaw && R.peerDisplayRaw(pid);
        const body = disp && disp._spriteBody;
        const bt = body && body.visible && body.texture;
        const pose = disp ? disp._animPose : null;
        const key = (bt ? bt.uid : 'x') + ':' + pose;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ t: Math.round(performance.now() - t0), pose, dir: disp ? disp._animDir : null, body: meanOf(body) });
        }
        if (performance.now() - t0 < dur) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    return out;
  }, { pid: aId, dur: 3500 });
  const peerHit = peerAll.filter((s) => s.pose === 'hit' && s.body && s.body.gr != null);
  /* per facing: the frames before its sheet is made for the watcher are the
     painted art; from the first walking-skin frame on, every one must be */
  const byDir = {};
  for (const s of peerHit) (byDir[s.dir] = byDir[s.dir] || []).push(s);
  const settled = Object.keys(byDir).map((dir) => {
    const arr = byDir[dir];
    const i = arr.findIndex((s) => close(s.body.gr));
    return { dir, whileMade: arr.slice(0, Math.max(0, i)).map((s) => s.body.gr),
      after: i < 0 ? null : arr.slice(i).map((s) => s.body.gr) };
  });
  console.log(`    the watcher's view of the hit, green/red per frame: ${peerHit.map((s) => `${s.body.gr}@${s.t}/${s.dir}`).join(' ')}  [all: ${peerAll.map((s) => `${s.pose}/${s.dir}@${s.t}`).join(' ')}]`);
  rec.ok('the watcher sees the plain player\'s hit (guard)', peerHit.length >= 2, peerAll.slice(0, 6));
  rec.ok('...and in every facing, once it is made for them, every frame wears the walking skin',
    settled.length > 0 && settled.every((d) => d.after && d.after.every((g) => close(g))), settled);

  const errs = [...A.logs, ...B.logs].filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors on either client', errs.length === 0, errs.slice(0, 3));
}
