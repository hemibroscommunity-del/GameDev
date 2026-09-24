/* ═══ v2.3.2887: THE METAL SHINE ON EVERY ARMOUR ANIMATION, IN EVERY METAL ═══
 *
 * Owner: "Push the metal shine to main and I'll revert it if I don't like it.
 * The previews looked much better.  But make sure the shine stays on through
 * every armor animation and through different recolors (like copper recolored
 * from the original steel)".
 *
 * HOW IT KNOWS WHAT IS METAL.  Not from glint.js's list of sprites -- a test
 * that asks the code under test where the metal is can only ever agree with
 * it, and the gaps this version closes were exactly sprites that list did not
 * have.  Every metal armour piece in the game is cut from one of three steel
 * art sets (/sprites/gear/chest/steelplate/, legs/steelgreaves/,
 * fullset/steel/ -- copper and iron are the same files under a tint), and
 * every texture made from those files carries the file's URL as its source's
 * label (gearSheets v2.3.2750 and v2.3.2887, the stand-in strips v2.3.2887).
 * So the sweep walks the WHOLE stage, and any sprite that is actually drawn
 * (it and every parent visible) showing one of those files is metal armour on
 * screen -- whoever drew it, whichever pose.  Each one must:
 *   - carry the shine's filter with the sheen on (uSheen > 0), and
 *   - have that filter reading the tint the sprite is drawn with (uTint ==
 *     sprite.tint) -- the shader divides the tint back out to find where the
 *     steel art was bright, so this is what makes a copper highlight come out
 *     bright COPPER rather than the wrong colour;
 *   - and the tint is the metal actually worn (materialTints.js).
 * It is checked on EVERY frame drawn, including the first frame of each
 * animation and the first frame after it, so a shine that blinks off as a
 * pose starts or ends fails here.  The file name names the pose (swing-east,
 * cook-south, jog-west ...), so a failure names the animation.
 *
 * WHAT IS DRIVEN, in steel, iron and copper sets and a mixed copper-plate +
 * iron-greaves set (a matched set walks as the one-piece knight on the body
 * sprite; a mixed one walks as two layers in two metals):
 *   you:        standing, walking, hit, mining, dodge, pickup, fishing, sword
 *               swing (standing and on the move), bow shot (standing and on
 *               the move), shield block, chopping, cooking, lighting a fire;
 *   another     walking (really walking, on their own client), hit, dodge,
 *   player:     mining, fishing, sword swing and bow shot (standing and on the
 *               move), chopping, cooking, lighting a fire.
 * The short ones (a 250 ms hit, a 300 ms swing) are re-armed every frame,
 * aimed so the NEXT frame lands inside them (mp-peerattackink's method: this
 * box can take longer than a swing between two frames).
 *
 * GUARDS: every animation must actually have put its armour on screen, and a
 * control run with the shine switched off must see the sweep flag every piece
 * -- otherwise "nothing failed" could mean "nothing was looked at".
 */
import * as H from './harness.mjs';
import { materialTint } from '../../../src/rendering/traits/materialTints.js';

const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
      'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const d = {}; for (const k of l) d[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  } catch (e) { /* private mode */ }
};

const SETS = [
  { label: 'steel', chest: 'steelplate', legs: 'steelgreaves', cm: 'steel', lm: 'steel' },
  { label: 'iron', chest: 'ironplate', legs: 'irongreaves', cm: 'iron', lm: 'iron' },
  { label: 'copper', chest: 'copperplate', legs: 'coppergreaves', cm: 'copper', lm: 'copper' },
  { label: 'copper plate + iron greaves', chest: 'copperplate', legs: 'irongreaves', cm: 'copper', lm: 'iron' },
];
const matched = (set) => set.cm === set.lm;
const WALK = (set) => (matched(set) ? ['fullset|jog'] : ['chest|jog', 'legs|jog']);
const both = (pose) => ['chest|' + pose, 'legs|' + pose];

/* `want`: the armour files this animation must put on screen, as slot|pose. */
const SELF = [
  { name: 'standing', arm: 'stand', want: () => both('stand') },
  { name: 'walking', arm: 'stand', walk: true, want: WALK },
  { name: 'hit', arm: 'hit', want: () => both('hit') },
  { name: 'mining', arm: 'mine', want: () => both('mine') },
  { name: 'dodge', arm: 'dodge', want: () => both('dodge') },
  { name: 'pickup', arm: 'pickup', want: () => both('pickup') },
  { name: 'fishing', arm: 'fish', want: () => both('fish') },
  { name: 'sword swing', arm: 'swing', want: () => both('swing') },
  { name: 'sword swing on the move', arm: 'swing', walk: true, want: () => ['chest|swing', 'legs|jog'] },
  { name: 'bow shot', arm: 'bow', want: () => both('bowshot') },
  { name: 'bow shot on the move', arm: 'bow', walk: true, want: () => ['chest|bowshot', 'legs|jog'] },
  { name: 'shield block', arm: 'block', want: () => both('bowshot') },
  { name: 'chopping', arm: 'chop', want: () => both('chop') },
  { name: 'cooking', arm: 'cook', want: () => both('cook') },
  { name: 'lighting a fire', arm: 'fire', want: () => both('fire') },
];
const PEER = [
  { name: 'walking', arm: 'stand', walk: true, want: WALK },
  { name: 'hit', arm: 'peerHit', want: () => both('hit') },
  { name: 'dodge', arm: 'peerDodge', want: () => both('dodge') },
  { name: 'mining', arm: 'peerMine', want: () => both('mine') },
  { name: 'fishing', arm: 'peerFish', want: () => both('fish') },
  { name: 'sword swing', arm: 'peerSwing', want: () => both('swing') },
  { name: 'sword swing on the move', arm: 'peerSwing', walk: true, want: () => ['chest|swing', 'legs|jog'] },
  { name: 'bow shot', arm: 'peerBow', want: () => both('bowshot') },
  { name: 'bow shot on the move', arm: 'peerBow', walk: true, want: () => ['chest|bowshot', 'legs|jog'] },
  { name: 'chopping', arm: 'peerChop', want: () => both('chop') },
  { name: 'cooking', arm: 'peerCook', want: () => both('cook') },
  { name: 'lighting a fire', arm: 'peerFire', want: () => both('fire') },
];

/* ── in the page: the pose drivers, and the sweep ── */
function install() {
  /* `-220`: the chop strips ship a smaller twin (effectsRenderer GEAR_STRIP_TWIN),
     chop-west-220.png -- the first run of this test missed every chopper
     because the pattern ended at the facing */
  const METAL = /\/sprites\/gear\/(chest\/steelplate|legs\/steelgreaves|fullset\/steel)\/([a-z]+)-([a-z]+)(?:-\d+)?\./;
  const ANG4 = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const gather = (S, skill, id, type) => {
    let n = (S.gatherNodes || []).find((g) => g && g.id === id);
    if (!n) {
      n = { id, nodeType: type, tierLvl: 1, x: S.player.x + 16, y: S.player.y + 8,
        alive: true, hp: 999, maxHp: 999, r: 40, respawnAt: 0 };
      S.gatherNodes = (Array.isArray(S.gatherNodes) ? S.gatherNodes : []).concat([n]);
    }
    if (skill === 'cooking') S._campfire = n;
    if (!S._extraction || S._extraction.skill !== skill) {
      S._extraction = { skill, status: 'waiting', nodeRef: n, nodeId: n.id, startedAt: Date.now(),
        windowOpensAt: Date.now() + 600000, windowClosesAt: Date.now() + 600000, swipeSamples: [] };
    }
  };
  /* a point inside a `win`-ms animation, swept tick by tick and aimed so that
     the next frame -- `lead` ms away -- lands on it */
  const at = (lead, n, win) => Date.now() + lead - (20 + ((n * 67) % Math.max(40, win - 60)));
  const ARM = {
    stand() {},
    hit(S, o, lead, n) { S._hitFlash = at(lead, n, 250); },
    dodge(S, o, lead, n) { S._dodgeRoll = { angle: n % 2 ? 0 : Math.PI / 2, startTime: at(lead, n, 250) }; },
    pickup(S) { S._lootFreezeUntil = Date.now() + 700; },
    mine(S) { gather(S, 'mining', 'qa_sheen_ore', 'oreVein'); },
    fish(S) {
      S.rpg.inventory = S.rpg.inventory || {};
      S.rpg.inventory.fishing_pole = Math.max(1, S.rpg.inventory.fishing_pole || 0);
      gather(S, 'fishing', 'qa_sheen_fish', 'fishSpot');
    },
    swing(S, o, lead, n) { S.isSwinging = true; S.swingTimer = at(lead, n, 300); S._aimAngle = ANG4[Math.floor(n / 3) % 4]; },
    bow(S, o, lead, n) {
      const a = ANG4[Math.floor(n / 3) % 4];
      S.rpg.activeSlot = 'ranged';
      S._bowShotAt = at(lead, n, 360); S._bowShotAng = a; S._aimAngle = a;
    },
    block(S, o, lead, n) {
      if (!S.rpg.shield) S.rpg.shield = { name: 'QA Buckler', id: 'woodshield' };
      S._shieldUp = true; S.lockedTarget = null;
      S._shieldAngle = [0, Math.PI, 3 * Math.PI / 4, Math.PI / 4][Math.floor(n / 3) % 4];   /* E, W, SW, SE */
    },
    chop(S) { gather(S, 'woodcutting', 'qa_sheen_tree', 'tree'); },
    cook(S) { gather(S, 'cooking', 'qa_sheen_fire', 'fire'); },
    fire(S) {
      S._campfire = null;
      if (!S._firemaking) S._firemaking = { x: S.player.x, y: S.player.y + 6, startedAt: Date.now(), doneAt: Date.now() + 600000 };
    },
    /* the other player, on this screen: the same fields the network sets */
    peerHit(S, o, lead, n) { o._hitFlash = at(lead, n, 250); },
    peerDodge(S, o, lead, n) { o._dodgeRoll = { angle: n % 2 ? 0 : Math.PI / 2, startTime: at(lead, n, 250) }; },
    peerMine(S, o) { o._ex = 'mine'; },
    peerFish(S, o) { o._ex = 'fish'; },
    peerChop(S, o) { o._ex = 'chop'; },
    peerCook(S, o) { o._ex = 'cook'; },
    peerFire(S, o) { o._ex = 'fire'; },
    peerSwing(S, o, lead, n) { o._swingTs = at(lead, n, 300); o._swingAng = ANG4[Math.floor(n / 3) % 4]; o._swingWpn = 'sword'; },
    peerBow(S, o, lead, n) { o._bowShotAt = at(lead, n, 360); o._bowShotAng = ANG4[Math.floor(n / 3) % 4]; },
  };
  const clear = (S, o) => {
    S.isSwinging = false; S._bowShotAt = 0; S._shieldUp = false; S._hitFlash = 0; S._dodgeRoll = null;
    S._lootFreezeUntil = 0; S._extraction = null; S._campfire = null; S._firemaking = null;
    if (S.rpg) S.rpg.activeSlot = 'melee';
    S.gatherNodes = (S.gatherNodes || []).filter((g) => !(g && /^qa_sheen_/.test(g.id)));
    if (o) { o._hitFlash = 0; o._dodgeRoll = null; o._ex = null; o._swingTs = 0; o._bowShotAt = 0; }
  };

  window.__qaSheenAll = ({ ms, arm, peerId }) => new Promise((done) => {
    const R = window._pixiRenderer;
    const fn = ARM[arm] || null;
    const pd = R.playerDisplayRaw();
    let root = pd;
    while (root && root.parent) root = root.parent;
    const out = { ticks: 0, swept: 0, sprites: 0, seen: {}, bad: [], err: null };
    let lastT = 0, gap = 100, n = 0;
    const t0 = performance.now();
    const sweep = (S, o) => {
      const k = S._worldScaleX || 1;
      const cam = S.camera || { x: 0, y: 0 };
      const me = { x: (S.player.x - cam.x) * k, y: (S.player.y - cam.y) * k };
      const them = o ? { x: (((o.renderX != null ? o.renderX : o.x) || 0) - cam.x) * k,
        y: (((o.renderY != null ? o.renderY : o.y) || 0) - cam.y) * k } : null;
      const visit = (c) => {
        if (!c || c.destroyed || c.visible === false || c.renderable === false || !(c.alpha > 0.01)) return;
        /* The sun's shadows (lightfx/shadows.js) are copies of the figure's
           own sprites -- the same armour textures -- drawn through the shadow
           layer's filter as one dark silhouette on the ground.  No metal
           shows in a shadow, so it is not armour on screen; the first run of
           this test counted every one of them as unshined steel. */
        if (c.label === 'shadows') return;
        const t = c.texture;
        const m = t && t.source && t.source.label ? METAL.exec(String(t.source.label)) : null;
        if (m) {
          const slot = m[1].slice(0, m[1].indexOf('/'));   /* chest | legs | fullset */
          const p = c.getGlobalPosition();
          const dMe = Math.hypot(p.x - me.x, p.y - me.y);
          const dThem = them ? Math.hypot(p.x - them.x, p.y - them.y) : Infinity;
          const who = Math.min(dMe, dThem) > 120 * k ? 'other' : (dMe <= dThem ? 'self' : 'peer');
          const f = Array.isArray(c.filters) ? c.filters.find((x) => x && x.resources && x.resources.glintUniforms) : null;
          const u = f ? f.resources.glintUniforms.uniforms : null;
          const tint = (typeof c.tint === 'number' ? c.tint : 0xffffff) & 0xffffff;
          const ut = u ? ((Math.round(u.uTint[0] * 255) << 16) | (Math.round(u.uTint[1] * 255) << 8) | Math.round(u.uTint[2] * 255)) : null;
          const ok = !!u && u.uSheen > 0 && ut === tint;
          const key = who + '|' + slot + '|' + m[2];
          const e = out.seen[key] || (out.seen[key] = { n: 0, bad: 0, tints: [], dirs: [] });
          e.n++;
          if (!ok) e.bad++;
          if (!e.tints.includes(tint)) e.tints.push(tint);
          if (!e.dirs.includes(m[3])) e.dirs.push(m[3]);
          out.sprites++;
          if (!ok && out.bad.length < 10) {
            /* where it hangs in the scene, so a failure says WHICH sprite */
            const path = [];
            for (let q = c; q && path.length < 5; q = q.parent) path.unshift(q.label || (q.constructor && q.constructor.name) || '?');
            const pdp = peerId ? R.peerDisplayRaw(peerId) : null;
            out.bad.push({ key, file: m[1] + '/' + m[2] + '-' + m[3], tint: tint.toString(16), glint: !!f,
              sheen: u ? +u.uSheen.toFixed(3) : 0, uTint: ut == null ? null : ut.toString(16),
              filters: Array.isArray(c.filters) ? c.filters.length : 0, path: path.join('>'),
              body: c === pd._spriteBody ? 'mine' : (pdp && c === pdp._spriteBody ? 'theirs' : 'no'),
              fullsetOn: [!!pd._fullsetOn, !!(pdp && pdp._fullsetOn)], dMe: Math.round(dMe), dThem: Math.round(dThem),
              lit: (window.__btLightFx.probe().glint.keys || []).join(',') });
          }
        }
        const ch = c.children;
        if (ch) for (let i = 0; i < ch.length; i++) visit(ch[i]);
      };
      visit(root);
      out.swept++;
    };
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      const o = S && peerId && S.others ? S.others[peerId] : null;
      const now = Date.now();
      if (lastT) gap = gap * 0.7 + (now - lastT) * 0.3;
      lastT = now;
      try {
        /* the frame drawn since the last arm -- the first tick still shows
           the previous animation, so it is not swept */
        if (S && n > 0) sweep(S, o);
        if (S && fn) fn(S, o, gap, n);
      } catch (e) { out.err = String((e && e.stack) || e).slice(0, 300); }
      n++;
      out.ticks = n;
      if (performance.now() - t0 < ms) { requestAnimationFrame(tick); return; }
      try { if (S) clear(S, o); } catch (e) { /* the next phase re-arms */ }
      done(out);
    };
    requestAnimationFrame(tick);
  });
}

/* Walk P back and forth (east, west) for the length of fn(). */
async function walking(P, fn) {
  let stop = false;
  const loop = (async () => {
    for (let i = 0; !stop; i++) {
      const key = i % 2 ? 'a' : 'd';
      await P.page.keyboard.down(key);
      await P.page.waitForTimeout(450);
      await P.page.keyboard.up(key);
    }
  })().catch(() => {});
  await P.page.waitForTimeout(350);   /* up to speed before the sample starts */
  try { return await fn(); } finally { stop = true; await loop; }
}

const dress = (P, set) => P.page.evaluate(({ c, l, m }) => {
  if (!window.__btSetGear) return 'missing';
  window.__btSetGear('chest', c);
  window.__btSetGear('legs', l);
  const R = window._gameState.current.rpg;
  /* the sword in the same metal, so the whole figure is one material (the
     sword's own shine is mp-sheen's) */
  if (R && R.weapon) R.weapon.gearBase = m;
  return 'ok';
}, { c: set.chest, l: set.legs, m: set.cm });

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

/* In the world AND playable: the renderer's light hooks are up and the game
   has its connection.  The second run of this file got past enterWorld and
   then found neither -- the page had dropped back to the door (a cold room's
   first join retries its loading screen, CLAUDE.md "Deployment") -- and every
   check after it read an empty page. */
const playable = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  return !!(S && S.myId && S.channel && S.rpg && window.__btLightFx && window._pixiRenderer);
}).catch(() => false);
async function enterPlayable(P) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await H.enterWorld(P);
    for (let i = 0; i < 20; i++) {
      await P.page.waitForTimeout(500);
      if (await playable(P)) return true;
    }
  }
  return false;
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  const A = await H.newPlayer(browser, { name: 'Polished', wsPort, webPort, init: COACH_OFF });
  opened.push(A);
  const B = await H.newPlayer(browser, { name: 'Plated', wsPort, webPort, guest: true, init: COACH_OFF });
  opened.push(B);
  const inA = await enterPlayable(A);
  const inB = await enterPlayable(B);
  rec.ok('both players are in the world and playable (guard)', inA && inB,
    { inA, inB, logsA: (A.logs || []).slice(-4), logsB: (B.logs || []).slice(-4) });
  await A.page.waitForTimeout(2000);
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  await H.devOp(wsPort, 'kit', aId, { what: 'weapons' });
  await A.page.waitForTimeout(1200);
  const sword = await H.equipWeapon(A, 'greatsword', 'weapon', 'melee');
  await A.page.waitForTimeout(800);
  const bow = await H.equipWeapon(A, 'bow', 'rangedWeapon', 'melee');
  await A.page.waitForTimeout(1200);
  rec.ok('you hold a sword and a bow (guard: the swing and the shot need them)', !!(sword && sword.ok && bow && bow.ok), { sword, bow });
  for (const P of [A, B]) { await H.clickText(P, 'CLOSE').catch(() => {}); await H.closeNpcDialogue(P).catch(() => {}); }
  /* the open cobble mp-sheen and mp-lightfx use, the other player a figure's
     width and more to the east, both on screen.  Each piece is credited to
     whichever figure it is nearest, so both go back to these marks after
     every walk: the third run of this file let the walker drift over several
     walks until the other player stood on top of you, and their fire figure
     was counted as yours. */
  const home = async (who) => {
    if (who !== 'peer') await H.hopTo(A, 1105, 1085).catch(() => {});
    if (who !== 'self') {
      await H.hopTo(B, 1245, 1085).catch(() => {});
      await A.page.waitForTimeout(2200);   /* a standing player's position reaches the other screen on the next relay */
    }
  };
  await home();
  await H.waitMutualSight(A, B).catch(() => {});
  await A.page.waitForTimeout(1200);
  await A.page.evaluate(install);
  const sheenOn = await A.page.evaluate(() => {
    const p = window.__btLightFx && window.__btLightFx.probe();
    return p ? p.glint.sheenOn : null;
  });
  rec.ok('the shine is on without asking for it (v2.3.2887)', sheenOn === true, sheenOn);

  const sample = (arm, ms) => A.page.evaluate((a) => window.__qaSheenAll(a), { ms, arm, peerId: bId });
  const results = [];
  let controlDone = false;
  for (const set of SETS) {
    const okA = await dress(A, set);
    const okB = await dress(B, set);
    /* the other player's armour reaches this screen on their next relay */
    let seenB = null;
    for (let i = 0; i < 40; i++) {
      await A.page.waitForTimeout(250);
      seenB = await A.page.evaluate((id) => {
        const o = window._gameState.current.others[id];
        return o && o.equip ? { chest: o.equip.chest, legs: o.equip.legs } : null;
      }, bId);
      if (seenB && seenB.chest === set.chest && seenB.legs === set.legs) break;
    }
    const worn = await A.page.evaluate(() => (window.__btGearCatalog ? window.__btGearCatalog().worn : null));
    await home();
    rec.ok(`${set.label}: both players are wearing it (guard)`,
      okA === 'ok' && okB === 'ok' && !!worn && worn.chest === set.chest && worn.legs === set.legs
        && !!seenB && seenB.chest === set.chest && seenB.legs === set.legs,
      { worn, seenB });
    await A.page.waitForTimeout(1000);

    /* ── THE CONTROL: switched off, every piece on screen must be flagged ── */
    if (!controlDone) {
      controlDone = true;
      await A.page.evaluate(() => window.__btLightFx.sheen(false));
      const off = await sample('stand', 900);
      await A.page.evaluate(() => window.__btLightFx.sheen(true));
      const offKeys = Object.keys(off.seen);
      rec.ok('control: with the shine switched off, the sweep flags every metal piece on screen, yours and theirs',
        off.sprites > 0 && Object.values(off.seen).every((e) => e.bad === e.n)
          && offKeys.some((k) => k.startsWith('self|')) && offKeys.some((k) => k.startsWith('peer|')),
        { sprites: off.sprites, seen: off.seen });
      await A.page.waitForTimeout(400);
    }

    const expectTint = { chest: materialTint(set.cm) & 0xffffff, legs: materialTint(set.lm) & 0xffffff, fullset: materialTint(set.cm) & 0xffffff };
    for (const [who, list, walker] of [['self', SELF, A], ['peer', PEER, B]]) {
      for (const ph of list) {
        const ms = ph.walk ? 1600 : 1100;
        const r = ph.walk ? await walking(walker, () => sample(ph.arm, ms)) : await sample(ph.arm, ms);
        if (ph.walk) await home(who);
        const want = ph.want(set).map((w) => who + '|' + w);
        const missing = want.filter((k) => !(r.seen[k] && r.seen[k].n > 0));
        /* a piece in the wrong metal: any tint on this figure's armour that is
           not the metal of the slot it is cut from */
        const wrong = Object.entries(r.seen)
          .filter(([k]) => k.startsWith(who + '|'))
          .filter(([k, e]) => e.tints.some((t) => t !== expectTint[k.split('|')[1]]))
          .map(([k, e]) => ({ k, tints: e.tints.map((t) => t.toString(16)) }));
        results.push({ set: set.label, who, phase: ph.name, swept: r.swept, sprites: r.sprites,
          bad: r.bad, missing, wrong, err: r.err, seen: r.seen });
        await A.page.waitForTimeout(150);
      }
    }
  }

  /* ── the verdicts ── */
  const line = (r) => `${r.set} / ${r.who} / ${r.phase}`;
  const badRuns = results.filter((r) => r.bad.length);
  const missingRuns = results.filter((r) => r.missing.length);
  const wrongRuns = results.filter((r) => r.wrong.length);
  const errRuns = results.filter((r) => r.err);
  const total = results.reduce((s, r) => s + r.sprites, 0);
  const frames = results.reduce((s, r) => s + r.swept, 0);
  console.log(`    ${results.length} animation runs, ${frames} frames swept, ${total} metal pieces checked on them`);
  for (const r of results) {
    const keys = Object.keys(r.seen).filter((k) => k.startsWith(r.who + '|')).join(' ');
    console.log(`      ${line(r).padEnd(52)} frames ${String(r.swept).padStart(3)}  pieces ${String(r.sprites).padStart(4)}  ${keys}`);
  }
  rec.ok('the pose drivers ran without a page error (guard)', errRuns.length === 0,
    errRuns.slice(0, 3).map((r) => ({ run: line(r), err: r.err })));
  rec.ok('every animation, yours and theirs, in every set, put its armour on screen (guard: nothing is judged on an empty frame)',
    missingRuns.length === 0,
    missingRuns.slice(0, 8).map((r) => ({ run: line(r), missing: r.missing, saw: Object.keys(r.seen) })));
  rec.ok('EVERY metal armour piece on screen carried the shine on EVERY frame, in every animation and every metal',
    total > 0 && badRuns.length === 0,
    badRuns.slice(0, 6).map((r) => ({ run: line(r), bad: r.bad.slice(0, 4) })));
  rec.ok('...and each piece is in the metal worn -- copper stays copper, iron stays iron, a mixed set keeps both',
    wrongRuns.length === 0,
    wrongRuns.slice(0, 6).map((r) => ({ run: line(r), wrong: r.wrong })));

  const errs = (A.logs || []).filter((l) => /lightFx threw|glint|TypeError|ReferenceError/.test(l));
  rec.ok('no light errors on the client', errs.length === 0, errs.slice(0, 4));
}
