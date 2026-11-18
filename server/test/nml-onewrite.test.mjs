/* ═══ v2.3.5804 (card RV, PR 5): NO MAN'S LAND PAYS THE KILLER IN THE VICTIM'S OWN WRITE ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), finding MS-1.  A kill under No man's land's
 * rule empties the victim's purse and stashes, saved by the death in one
 * write, but paid the killer a credit a piece in LATER writes: a restart
 * between (every merge touching server/ restarts the room) left the victim
 * at nothing and the killer unpaid, and nothing on file said what was owed.
 * Now the gold and the weapons go to a killer in the room in the same
 * synchronous run as the victim's save (nomansland.js _nmlOnDeath, through
 * inbox.js _creditLiveTogether): both, or neither (`nmlonewrite`).
 *
 *   1. the kill, whole: the killer holds the 500 and the blade, live;
 *   2. the kill cut before each write: the gold and the blade on file are
 *      what they were, never less (paid to nobody), never more;
 *   3. a killer no longer in the room: paid by the old road (the mail);
 *   4. `nmlonewrite: false`: the old road, a cut after the victim's save
 *      loses the purse (what the finding was).
 *
 * Red on main before this change: check 2 fails.
 */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const settleN = async (n) => { for (let i = 0; i < n; i++) await settle(); };
const V = 'bp_rvnmlvic1', K = 'bp_rvnmlkil1';
const BLADE = 'RV Iron Blade';

/* gold and blades on file: purses, and the mail waiting */
function onFile(store) {
  let gold = 0, blades = 0;
  for (const [k, v] of store) {
    if (k.startsWith('rpg:')) {
      gold += Math.floor((v && v.coins) || 0);
      for (const w of (v && v.weaponStash) || []) if (w && w.name === BLADE) blades++;
    } else if (k.startsWith('inbox:')) {
      for (const e of v || []) {
        if (e.kind === 'gold') gold += Math.floor(e.payload.amount || 0);
        if (e.kind === 'weapon' && e.payload && e.payload.weapon && e.payload.weapon.name === BLADE) blades++;
      }
    }
  }
  return { gold, blades };
}

async function kill(flags, opts = {}) {
  const st = makeStorage();
  const room = await openRoom(st, flags);
  const wv = fakeWs('v'), wk = fakeWs('k');
  await join(room, wv, V, { loginTaken: true });
  await join(room, wk, K, { loginTaken: true });
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const pv = room.playerState[V], pk = room.playerState[K];
  room._goldSet(pv, 500, 'restore'); room._goldSet(pk, 0, 'restore');
  pv.weaponStash = [{ name: BLADE, type: 'greatsword', gearBase: 'iron', tier: 'common', tierMult: 1 }];
  room._saveRpg(V, pv); room._saveRpg(K, pk);
  await settleN(3);
  const before = onFile(st._store);
  if (opts.killerGone) delete room.playerState[K];
  if (opts.cut !== undefined) st.crashAt(st.batches() + opts.cut);
  pv._nmlLastHitBy = K; pv._nmlLastHitAt = Date.now();
  room._handlePlayerDeath(pv, V, 'pvp:' + K);
  await settleN(10);
  return { st, room, before, after: onFile(st._store), pk: room.playerState[K] };
}

/* ── 1. the kill, whole ── */
{
  const r = await kill(null);
  check('1. (setup) the kill took the victim\'s purse and blade', (r.room.playerState[V].coins || 0) === 0 && (r.room.playerState[V].weaponStash || []).length === 0);
  check('1. the killer holds the 500 and the blade, live; nothing lost on file', r.pk.coins === 500 && r.pk.weaponStash.some((w) => w && w.name === BLADE) && r.after.gold === r.before.gold && r.after.blades === r.before.blades, { coins: r.pk.coins, before: r.before, after: r.after });
}

/* ── 2. cut before each write ── */
{
  const bad = [];
  for (let cut = 0; cut <= 6; cut++) {
    const r = await kill(null, { cut });
    if (r.after.gold !== r.before.gold || r.after.blades !== r.before.blades) bad.push({ cut, before: r.before, after: r.after });
  }
  check('2. the kill cut before each write: the gold and the blade on file never less, never more', bad.length === 0, bad);
}

/* ── 3. a killer no longer in the room ── */
{
  const r = await kill(null, { killerGone: true });
  check('3. a killer gone from the room is paid by the old road (the mail)', r.after.gold === r.before.gold && r.after.blades === r.before.blades && !!r.st._store.get('inbox:' + K), { before: r.before, after: r.after });
}

/* ── 4. the kill switch ── */
{
  let lost = false;
  for (let cut = 0; cut <= 6 && !lost; cut++) {
    const r = await kill({ nmlonewrite: false }, { cut });
    if (r.after.gold < r.before.gold) lost = true;
  }
  check('4. `nmlonewrite: false`: the old road, and a cut after the victim\'s save loses the purse', lost);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
