/* ═══ A KILL'S ONE ROLL, ON A PHONE (v2.3.3209) ═══
 *
 * The owner, on the monster codex's Roll column: "Shouldn't these numbers not
 * overlap each other? Getting a roll of 1 implies you'd get all the loot with
 * 1, but it's really just the gold nugget. I think these should be number
 * ranges. That way a player hunting for something can also be looking for a
 * roll number within that range".
 *
 * So the worker rolls each kill ONCE, 1 to 10,000, each drop owning its own
 * numbers (server/src/killroll.js), and the phone shows the roll over the
 * monster (src/game/killRoll.js).  A real player in the Wheel, a real worker,
 * real kills (the test lever /dev/killroll: `next` is the next kill's roll,
 * `kill` kills through _resolveMonsterKill, the path every kill takes):
 *   1. the worker rolls once a kill (caps.killroll);
 *   2. walked out to Frost Ridge's first snowmen, a kill shows its own roll
 *      over the snowman, the dice in front of it;
 *   3. a roll on no drop's numbers (7,431): "7,431" in a quiet grey, no name;
 *   4. on the Frost Shard's (640): "640 Frost Shard" in gold, held longer, and
 *      the shard in the pile on the ground; on the raw gem's (300): "300 Raw
 *      Frost Gem", the gem in the bag; on the nugget's (1): "1 Gold Nugget";
 *   5. drawn as a message, not a damage number: the plain hit's size, its own
 *      colour (never a number's white), the dice drawn and IN FRONT of it;
 *   6. a kill off your screen (a fishman across the sea) still shows its
 *      roll, over you;
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/killroll-*.png. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const MISS = '#C9D2D0', HIT = '#FFD54A';

const rolls = (P) => P.page.evaluate(() => (window.__btKillRolls || []).slice());
/* the popup a roll made, as the renderer drew it */
const popupOf = (P, text) => P.page.evaluate((t) => {
  const S = window._gameState.current;
  const d = (S.dmgNumbers || []).find((x) => x && x.roll && x.text === t);
  if (!d) return null;
  const tx = d._pixiText, ic = d._pixiIcon;
  const tint = tx && typeof tx.tint === 'number' ? '#' + tx.tint.toString(16).padStart(6, '0').toUpperCase() : null;
  const fill = tx && tx.style && typeof tx.style.fill === 'string' ? tx.style.fill.toUpperCase() : null;
  return { text: d.text, color: d.color, msg: d._msg === true, fs: d._fs, base: d._base, ttl: d.ttl || 1.5, hold: d.hold || 0, iconKey: d.iconKey,
    drawn: !!tx, drawnColor: fill && fill !== '#FFFFFF' ? fill : tint,
    iconLeft: tx && ic ? Math.round((ic.x + ic.width) * 10) / 10 : null, textLeft: tx ? Math.round((tx.x - tx.width / 2) * 10) / 10 : null,
    iconH: ic ? Math.round(ic.height * 10) / 10 : null,
    age: Math.round((Date.now() - d.ts) / 100) / 10, alpha: tx ? Math.round(tx.alpha * 100) / 100 : null };
}, text);
/* a picture of a popup: this box takes ~3 s over one (a WebGL canvas read on
   a software chip), longer than a popup lives -- so the page's clock, which
   the renderer reads once a frame (pixiRenderer `Date.now()`), is held still
   while it is taken, and let go after */
const snap = async (P, path) => {
  await P.page.evaluate(() => { if (!window.__qaRealNow) { const t = Date.now(); window.__qaRealNow = Date.now; Date.now = () => t; } });
  try { await P.page.screenshot({ path }); }
  finally { await P.page.evaluate(() => { if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } }); }
};
/* (its own loop: H.waitFor runs its function in the page, without these) */
const waitRoll = async (P, monsterId, roll) => {
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const r = await P.page.evaluate(({ id, n }) => (window.__btKillRolls || []).find((x) => x.monsterId === id && (n == null || x.roll === n)) || null,
      { id: monsterId, n: roll == null ? null : roll });
    if (r) return r;
    await P.page.waitForTimeout(150);
  }
  return null;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  /* v2.3.3616: the dice roll over the monster is drawn only with the drops
     off (since v2.3.3627 a line of words each, game/dropLines.js;
     mp-droplines is the lines) */
  const P = await H.newPlayer(browser, { name: 'Rollbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'droplines=0' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);

    /* ── 1 ── */
    const caps = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.killroll));
    rec.ok('the worker rolls once a kill (caps.killroll)', caps === true, caps);

    /* out of the commons (the Mayor's gate opens with the quests done) to the
       first snowmen, untouchable on the way */
    await H.devOp(wsPort, 'vitals', me, { god: true, godMinutes: 30 }).catch(() => {});
    await H.devOp(wsPort, 'quests', me, {}).catch(() => {});
    await H.waitFor(P, (S) => !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1), (v) => v, { timeout: 8000, label: 'the quests done' }).catch(() => null);
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
    await H.hopTo(P, at[0] + 150, at[1] + 220, { tries: 260 });
    await P.page.waitForTimeout(1500);
    const near = () => P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      return (S.monsters || []).filter((m) => m && m.alive !== false && m.home === 'frost' && !m.tier)
        .map((m) => ({ id: m.id, x: Math.round(m.x), y: Math.round(m.y), d: Math.round(Math.hypot(m.x - p.x, m.y - p.y)) }))
        .sort((a, b) => a.d - b.d);
    });
    const close = await near();
    rec.ok(`at Frost Ridge's first snowmen (${close.length} in sight, the nearest ${close[0] && close[0].d} px off)`, close.length >= 4 && close[0].d < 700, close.slice(0, 5));
    if (close.length < 4) return;
    const ids = close.map((m) => m.id);
    /* each forced kill on a snowman in view: stand 200 px below it first */
    const used = new Set();
    const nextNear = async () => {
      const list = (await near()).filter((m) => !used.has(m.id));
      const m = list[0];
      if (!m) return null;
      used.add(m.id);
      await H.hopTo(P, m.x, m.y + 200, { tries: 30 });
      await P.page.waitForTimeout(400);
      return m.id;
    };

    /* ── 2 ── a kill rolls its own */
    ids[0] = await nextNear();
    await H.devOp(wsPort, 'killroll', me, { kill: ids[0] });
    const r0 = await waitRoll(P, ids[0]);
    const want0 = r0 ? r0.roll.toLocaleString('en-US') + (r0.name ? ' ' + r0.name : '') : null;
    rec.ok(`a snowman's kill shows its own roll over it ("${r0 && r0.text}", over the ${r0 && r0.over})`,
      !!r0 && r0.roll >= 1 && r0.roll <= 10000 && r0.over === 'monster' && r0.text === want0 && (!!r0.rh === !!r0.name), r0);

    /* ── 3 ── nothing more */
    ids[1] = await nextNear();
    await H.devOp(wsPort, 'killroll', me, { next: 7431, kill: ids[1] });
    const r1 = await waitRoll(P, ids[1], 7431);
    await P.page.waitForTimeout(150);
    const p1 = await popupOf(P, '7,431');   /* before the picture: this box takes a second over one */
    await snap(P, join(OUT, 'killroll-1-nothing.png'));
    rec.ok(`a roll on no drop's numbers: "${r1 && r1.text}" in grey (${p1 && p1.drawnColor}) over the snowman, no drop named, held ${p1 && p1.hold} s of ${p1 && p1.ttl} (a damage number fades from its first frame)`,
      !!r1 && r1.text === '7,431' && !r1.rh && r1.over === 'monster' && !!p1 && p1.color === MISS && p1.drawnColor === MISS && p1.hold >= 1 && p1.ttl > 2, { r1, p1 });

    /* ── 4 ── the Frost Shard's numbers */
    const loot0 = await H.readState(P, (S) => (S.groundLoot || []).filter((l) => l.shard === 'shard_frost').length);
    ids[2] = await nextNear();
    await H.devOp(wsPort, 'killroll', me, { next: 640, kill: ids[2] });
    const r2 = await waitRoll(P, ids[2], 640);
    await P.page.waitForTimeout(150);
    const p2 = await popupOf(P, '640 Frost Shard');
    await snap(P, join(OUT, 'killroll-2-shard.png'));
    const loot1 = await H.waitFor(P, (S) => (S.groundLoot || []).filter((l) => l.shard === 'shard_frost').length, (v) => v > loot0, { timeout: 5000, label: 'the shard on the ground' }).catch(() => null);
    rec.ok(`a roll of 640, the Frost Shard's numbers: "${r2 && r2.text}" in gold (${p2 && p2.drawnColor}), held ${p2 && p2.hold} s of ${p2 && p2.ttl}, and the shard on the ground`,
      !!r2 && r2.rh === 'shard' && r2.text === '640 Frost Shard' && r2.over === 'monster' && !!p2 && p2.color === HIT && p2.drawnColor === HIT && p2.ttl > 3 && p2.hold > 1.5 && loot1 > loot0, { r2, p2, loot0, loot1 });

    /* v2.3.3516: no raw gem off a kill -- shards are cracked for them at the
       Gem Works (server/src/shardcrack.js; the gem plan's decision 1) -- so
       300, the raw gem's number before, is the Frost Shard's (112-1,111) and
       no raw gem lands in the bag */
    const g0 = await H.readState(P, (S) => ((S.rpg && S.rpg.inventory) || {}).gem_raw_frost || 0);
    ids[3] = await nextNear();
    await H.devOp(wsPort, 'killroll', me, { next: 300, kill: ids[3] });
    const r3 = await waitRoll(P, ids[3], 300);
    await P.page.waitForTimeout(600);
    const g1 = await H.readState(P, (S) => ((S.rpg && S.rpg.inventory) || {}).gem_raw_frost || 0);
    rec.ok(`a roll of 300 is the Frost Shard's now ("${r3 && r3.text}"): no raw gem off a kill, none in the bag (${g0} -> ${g1})`,
      !!r3 && r3.rh === 'shard' && r3.text === '300 Frost Shard' && g1 === g0, { r3, g0, g1 });

    /* the nugget's one number */
    const nId = (await nextNear()) || ids[0];
    const n0 = await H.readState(P, (S) => (S.rpg && S.rpg.goldNuggets) || 0);
    const k4 = await H.devOp(wsPort, 'killroll', me, { next: 1, kill: nId });
    const r4 = k4 && k4.ok ? await waitRoll(P, nId, 1) : null;
    rec.ok(`a roll of 1, the nugget's one number: "${r4 && r4.text}"`, !!r4 && r4.rh === 'nugget' && r4.text === '1 Gold Nugget', { k4, r4, n0 });

    /* ── 5 ── drawn as a message, the dice in front */
    const icons = await P.page.evaluate(() => Object.assign({}, window.__btPopupIconsDrawn || {}));
    rec.ok(`drawn as a message, the plain hit's size (${p2 && p2.fs} px), the dice drawn (${icons.dice || 0} times) and in FRONT of the number (its right edge ${p2 && p2.iconLeft}, the text's left ${p2 && p2.textLeft})`,
      !!p1 && !!p2 && p1.msg && p2.msg && p1.fs === p2.fs && p2.fs > 30 && p2.iconKey === 'dice' && (icons.dice || 0) >= 2
        && p2.iconLeft != null && p2.textLeft != null && p2.iconLeft <= p2.textLeft + 0.5 && p2.iconH > 10, { p1, p2, icons });

    /* ── 6 ── a kill the phone is not drawing: over you */
    /* v2.3.3318: a phone holds only the monsters it came near
       (server/src/wheelnear.js), so one across the sea is usually not in its
       list at all -- the worker's first Tidal monster by its own id then,
       a kill the phone cannot draw at all */
    const far = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => x && x.home === 'tidal' && x.alive !== false);
      return m ? m.id : 'wm-tidal-0';
    });
    const k5 = far ? await H.devOp(wsPort, 'killroll', me, { next: 5000, kill: far }) : null;
    const r5 = k5 && k5.ok ? await waitRoll(P, far, 5000) : null;
    rec.ok(`a kill off your screen (${far}, across the sea) still shows its roll, over you ("${r5 && r5.text}", over ${r5 && r5.over})`,
      !!r5 && r5.over === 'you' && r5.text === '5,000', { far, k5, r5 });

    /* ── 7 ── */
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
