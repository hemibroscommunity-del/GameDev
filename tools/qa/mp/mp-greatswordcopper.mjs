/* ═══ OLD WOODEN GREATSWORDS BECOME COPPER, AND COPPER LOOKS LIKE COPPER (v2.3.4000) ═══
 *
 * The owner: "'Copper great sword' when Smithed looks gray in color like
 * iron.  Fix that.  Also just remove any of the 'wooden' swords.  Right now
 * it's just called 'great sword'."  (server/src/gscopper.js, migration v20;
 * docs/specs/greatsword-copper.md.)
 *
 * A DEPLOY, PLAYED.  Two workers on one storage folder: first the worker
 * before this change (a git archive of GSC_BASE, the commit this branched
 * from), then the repo's own.  On the first, a character smiths a wood
 * greatsword (the old ladder, `forgeladder: false`: the only way one is made
 * now) and then a copper one, so the record on file holds both, at the old
 * schema.  The first worker stops; the second starts on the same storage and
 * the character comes back (its key and its device) -- the load runs
 * migration v20, the way every player's next login will.
 *
 * Then, a computer (wide, the sideways layout) and a phone, in BroTown:
 *   1. the old wood greatsword came back a copper one (gearBase copper,
 *      tierMult 1.12, named "Copper Great Sword", its grade kept, marked
 *      `was`), and nothing wood is left among the weapons;
 *   2. the smithed copper greatsword is tinted copper in your own hand
 *      (__btWeaponTint().local 0xFF9E58), standing, jogging and swinging;
 *   3. the other player (the phone) sees it in copper too, drawn with the
 *      per-facing greatsword art (__btPeerSword `art`), not the bare sheet;
 *   4. no page errors.
 * Pictures: tools/qa/mp/out/gscopper-<label>-*.png (GSC_LABEL=before: both
 * workers are GSC_BASE's, with a build of GSC_BASE's client in dist/, so the
 * pictures are the game as it was; checks 1 and 3 fail there, as on main).
 *
 *   node tools/qa/mp/run.mjs greatswordcopper
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const OUT = join(H.REPO, 'tools/qa/mp/out');
const COPPER = 0xFF9E58;
const BASE = process.env.GSC_BASE || 'f2b4c6ab';   /* main before v2.3.4000 */

/* the worker of commit `rev`, unpacked into a folder of its own */
async function workerAt(rev) {
  const dir = await mkdtemp(join(tmpdir(), 'bt-gsc-worker-'));
  execSync(`git -C "${H.REPO}" archive ${rev} server | tar -x -C "${dir}"`, { stdio: 'pipe' });
  return { dir, cwd: join(dir, 'server') };
}

const held = (P) => P.page.evaluate(() => {
  const R = window._gameState.current.rpg || {};
  const pick = (w) => (w ? { type: w.type, gearBase: w.gearBase || null, tierMult: w.tierMult, name: w.name, quality: w.quality || null, was: w.was || null } : null);
  return { weapon: pick(R.weapon), stash: (R.weaponStash || []).map(pick) };
});

const forge = async (P, tierKey) => {
  const before = await held(P);
  await P.page.evaluate((t) => window._gameState.current.channel.send({ type: 'forge_weapon', payload: { weaponType: 'greatsword', tierKey: t } }), tierKey);
  for (let i = 0; i < 60; i++) {
    const h = await held(P);
    if (h.weapon && h.weapon.gearBase === tierKey && h.stash.length >= before.stash.length) return h;
    await P.page.waitForTimeout(250);
  }
  return null;
};

const face = (P, idx, swing = false) => P.page.evaluate(({ i, swing }) => {
  const S = window._gameState.current;
  S._facingAngle = i * Math.PI / 4; S._aimAngle = i * Math.PI / 4; S.lockedTarget = null; S.autoAttack = false;
  if (swing) { S.isSwinging = true; S.swingTimer = Date.now(); S._swingAng = i * Math.PI / 4; } else { S.isSwinging = false; S.swingTimer = 0; }
}, { i: idx, swing });

const shot = async (P, name, peerId = null) => {
  const box = await H.figureBox(P, { pad: 26, peerId });
  await P.page.screenshot({ path: join(OUT, name + '.png'), ...(box ? { clip: box } : {}) }).catch(() => {});
};
/* the phone's whole screen (the peer is cut from it for docs/shots) */
const peerShot = (P, name) => P.page.screenshot({ path: join(OUT, name + '.png') }).catch(() => {});
/* the left-hand window of a computer (the character window, the bag) */
const PANEL = { x: 0, y: 0, width: 392, height: 470 };

const intoTown = async (P, rec, who) => {
  await H.enterWorld(P);
  let last = null;
  const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => { last = v; return v.z === 'wheel' && !v.l; },
    { timeout: 240000, label: who + ' into BroTown' }).then(() => true).catch(() => false);
  rec.ok(`${who} is in BroTown (guard)`, ok, { last, logs: (P.logs || []).slice(-12) });
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  return ok;
};

export async function run({ browser, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const label = process.env.GSC_LABEL || 'after';
  const errors = [];
  const state = await mkdtemp(join(tmpdir(), 'bt-gsc-state-'));
  const oldW = await workerAt(BASE);
  const newW = label === 'before' ? oldW : null;   /* before: the old worker both times */
  let w1 = null, w2 = null, A = null, A2 = null, B = null;
  try {
    /* ── on the worker before this change: smith a wood greatsword, then a copper one ── */
    const p1 = await H.freePort();
    w1 = await H.startWorker(p1, { cwd: oldW.cwd, state });
    A = await H.newPlayer(browser, { name: 'Smith', wsPort: p1, webPort, viewport: { width: 1440, height: 900 }, world: 'wheel', wide: true, dpr: 2 });
    if (!(await intoTown(A, rec, 'the smith (old worker)'))) return;
    const me = await H.readState(A, (S) => S.myId);
    await H.liveFlag(p1, 'forgeladder', false);   /* the old ladder: the wood tier is forged */
    await H.grant(p1, me, 'gold', { amount: 500 });
    await H.grant(p1, me, 'item', { invKey: 'wood_pine_log', count: 3 });
    await H.grant(p1, me, 'item', { invKey: 'bar_copper', count: 5 });
    await A.page.waitForTimeout(1500);
    const wood = await forge(A, 'wood');
    rec.ok('the old worker smiths a wood greatsword (guard: one to convert)', !!wood && wood.weapon.gearBase === 'wood', wood);
    await H.liveFlag(p1, 'forgeladder', null);   /* back on the new ladder: copper at Smithing 1 (the old one asks 6) */
    await A.page.waitForTimeout(500);
    const both = await forge(A, 'copper');
    rec.ok('...and then a copper one, the wood one into the bag (guard)',
      !!both && both.weapon.gearBase === 'copper' && both.stash.some((w) => w && w.gearBase === 'wood'), both);
    const kd = await H.keyAndDevice(A);
    await A.page.waitForTimeout(1500);
    await A.ctx.close().catch(() => {}); A = null;
    await new Promise((r) => setTimeout(r, 2500));
    await H.stopWorker(w1, { keepState: true }); w1 = null;

    /* ── the deploy: this worker on the same storage, the smith back ── */
    const p2 = await H.freePort();
    w2 = await H.startWorker(p2, { cwd: newW ? newW.cwd : undefined, state });
    A2 = await H.newPlayer(browser, { name: 'Smith', wsPort: p2, webPort, viewport: { width: 1440, height: 900 }, world: 'wheel', wide: true, dpr: 2, ...kd });
    A2.page.on('pageerror', (e) => errors.push('A: ' + String((e && e.message) || e).slice(0, 200)));
    if (!(await intoTown(A2, rec, 'the smith (this worker)'))) return;
    const me2 = await H.readState(A2, (S) => S.myId);
    await H.devOp(p2, 'vitals', me2, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    const G = await H.wheelGeom();
    await H.glideTo(A2, G.arrival.x - 120, G.arrival.y + 140, { speed: 900, timeoutMs: 20000 });
    await A2.page.waitForTimeout(2000);

    /* 1. the record's weapons after the load */
    const h = await held(A2);
    const conv = h.stash.find((w) => w && w.was);
    console.log('    weapons', JSON.stringify(h));
    rec.ok('1. the old wood greatsword came back a Copper Great Sword (copper, 1.12, its grade kept, marked `was`)',
      !!conv && conv.type === 'greatsword' && conv.gearBase === 'copper' && conv.tierMult === 1.12
        && conv.name === 'Copper Great Sword' && conv.was.gearBase === 'wood' && conv.quality === (wood && wood.weapon.quality), { conv, wood });
    rec.ok('1. nothing wood is left among the weapons',
      ![h.weapon, ...h.stash].some((w) => w && w.gearBase === 'wood'), h);

    /* 2. your own hand: standing, jogging, swinging -- copper */
    const tints = {};
    await face(A2, 1); await A2.page.waitForTimeout(900);
    tints.stand = await A2.page.evaluate(() => window.__btWeaponTint().local);
    await shot(A2, `gscopper-${label}-self-stand`);
    await face(A2, 0); await A2.page.keyboard.down('d'); await A2.page.waitForTimeout(700);
    tints.jog = await A2.page.evaluate(() => window.__btWeaponTint().local);
    await shot(A2, `gscopper-${label}-self-jog`);
    await A2.page.keyboard.up('d'); await A2.page.waitForTimeout(500);
    await face(A2, 1, true); await A2.page.waitForTimeout(120);
    tints.swing = await A2.page.evaluate(() => window.__btWeaponTint().local);
    await shot(A2, `gscopper-${label}-self-swing`);
    await face(A2, 1); await A2.page.waitForTimeout(600);
    rec.ok('2. the smithed copper greatsword is copper in your hand, standing, jogging and swinging (0xFF9E58)',
      tints.stand === COPPER && tints.jog === COPPER && tints.swing === COPPER, tints);

    /* the character window (P) and the bag (I) */
    await A2.page.keyboard.press('p'); await A2.page.waitForTimeout(2500);
    await A2.page.screenshot({ path: join(OUT, `gscopper-${label}-portrait.png`), clip: PANEL }).catch(() => {});
    await A2.page.keyboard.press('Escape'); await A2.page.waitForTimeout(800);
    await A2.page.keyboard.press('i'); await A2.page.waitForTimeout(2500);
    await A2.page.screenshot({ path: join(OUT, `gscopper-${label}-bag.png`), clip: PANEL }).catch(() => {});
    await A2.page.keyboard.press('Escape'); await A2.page.waitForTimeout(800);

    /* the old wood one, in hand */
    const idx = h.stash.findIndex((w) => w && (w.was || w.gearBase === 'wood'));
    if (idx >= 0) {
      await A2.page.evaluate((i) => window._gameState.current.channel.send({ type: 'equip_request', payload: { stashIdx: i, slot: 'weapon' } }), idx);
      await A2.page.waitForTimeout(2000);
      await face(A2, 1); await A2.page.waitForTimeout(900);
      await shot(A2, `gscopper-${label}-old-wood-held`);
      const back = (await held(A2)).stash.findIndex((w) => w && w.gearBase === 'copper' && !w.was);
      if (back >= 0) await A2.page.evaluate((i) => window._gameState.current.channel.send({ type: 'equip_request', payload: { stashIdx: i, slot: 'weapon' } }), back);
      await A2.page.waitForTimeout(2000);
    }

    /* 3. the other player's view, on a phone */
    B = await H.newPlayer(browser, { name: 'Onlooker', wsPort: p2, webPort, guest: true, touch: true, viewport: { width: 390, height: 844 }, world: 'wheel', dpr: 2 });
    B.page.on('pageerror', (e) => errors.push('B: ' + String((e && e.message) || e).slice(0, 200)));
    if (!(await intoTown(B, rec, 'the onlooker (phone)'))) return;
    await B.page.evaluate(() => { window.__btProbe = true; });
    await H.glideTo(B, G.arrival.x - 260, G.arrival.y + 150, { speed: 900, timeoutMs: 20000 });
    const seen = await H.waitMutualSight(A2, B, 40000).then(() => true).catch(() => false);
    rec.ok('the phone sees the smith (guard)', seen);
    const peerRead = () => B.page.evaluate((id) => ({ tint: window.__btWeaponTint().peer, sword: (window.__btPeerSword || {})[id] || null }), me2);
    /* until the smith's weapon has reached the phone (its look comes after the sight) */
    for (let i = 0; i < 80; i++) {
      const r = await peerRead();
      if (r.sword && r.sword.wpnType === 'greatsword') break;
      await B.page.waitForTimeout(250);
    }
    /* standing, facing south (a step that way, then still: a peer's facing is its walk's) */
    await A2.page.keyboard.down('s'); await A2.page.waitForTimeout(250); await A2.page.keyboard.up('s');
    await B.page.waitForTimeout(3000);
    const peer = await peerRead();
    await peerShot(B, `gscopper-${label}-peer-stand`, me2);
    await A2.page.keyboard.down('d'); await B.page.waitForTimeout(1200);
    const peerJog = await peerRead();
    await peerShot(B, `gscopper-${label}-peer-jog`, me2);
    await A2.page.keyboard.up('d');
    console.log('    peer', JSON.stringify({ peer, peerJog }));
    rec.ok('3. the phone sees the smith\'s greatsword in copper, standing and jogging',
      peer.tint === COPPER && peerJog.tint === COPPER, { peer: peer.tint, jog: peerJog.tint });
    rec.ok('3. ...drawn with the per-facing greatsword art, not the bare sheet',
      !!(peer.sword && peer.sword.art && peer.sword.art !== 'greatsword') && !!(peerJog.sword && peerJog.sword.art && peerJog.sword.art !== 'greatsword'),
      { stand: peer.sword, jog: peerJog.sword });

    rec.ok('4. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    for (const P of [A, A2, B]) if (P) await P.ctx.close().catch(() => {});
    if (w1) await H.stopWorker(w1, { keepState: true });
    if (w2) await H.stopWorker(w2, { keepState: true });
    await rm(state, { recursive: true, force: true }).catch(() => {});
    await rm(oldW.dir, { recursive: true, force: true }).catch(() => {});
  }
}
