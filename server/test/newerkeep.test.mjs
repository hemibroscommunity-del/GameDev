/* ═══ v2.3.5704: A SAVE FROM A NEWER WORKER KEEPS THE FIELDS THIS WORKER DOES NOT KNOW (card SEC PR 5) ═══
 * (docs/specs/migrations.md "A newer worker's record"; docs/OPERATIONS.md, the rollback's step 2)
 *
 * With `newersave: false` (the rollback's step 2, which says nothing is
 * lost) an older worker lets a newer worker's character in and wrote the
 * record again from ITS field list (persistence.js _saveRpg), keeping the
 * newer `_v` (_rpgSaveVFor): a field the newer version added was dropped,
 * and the kept `_v` means no migration ever puts it back.  Now the stored
 * record is kept at the load, by player, and the save writes its fields
 * through under the known list (the known fields this worker's, as before).
 *
 *   1. A record at a newer `_v` with fields this worker does not know keeps
 *      them through a join, a save and a leave, with `newersave: false`; the
 *      newer `_v` is kept as before.
 *   2. A known field still saves as today (the purse moved by the worker).
 *   3. A record at this worker's `_v` writes no stranger field (nothing kept
 *      for it), and a field the join never read is not invented.
 *   4. Without `newersave: false` the join is refused, as today.
 *   5. `newerkeep: false`: the old way (the unknown fields dropped).
 *
 * BREAK PROOF (rule 8), tried by hand: `_rpgNewerKeep` answering {} always
 * (main's way) -> FAIL 1 (the unknown fields gone after the save).
 * Not a phone test: node, the shared test room (testroom.mjs). */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { RPG_SCHEMA_VERSION } from '../src/migrations.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const PID = 'bp_newerkeep';
const NEWER = RPG_SCHEMA_VERSION + 1;
const record = (v) => ({ _v: v, coins: 500, inventory: { wood_oak: 3 }, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} },
  futureSkill: { level: 7, xp: 120 }, futureList: ['a', 'b'], futureFlag: true });
async function played(flags, v) {
  const st = makeStorage(new Map([['rpg:' + PID, record(v)]]));
  const room = await openRoom(st, flags);
  const ws = fakeWs('p');
  const back = [console.warn, console.error]; console.warn = () => {}; console.error = () => {};
  let joined = false, ps = null, afterSave = null;
  try {
    await join(room, ws, PID, { loginTaken: true });
    ps = room.playerState[PID];
    joined = !!ps && ws.sent.some((m) => m.type === 'state_sync');
    if (joined) {
      room._goldGive(ps, 25, 'bank_withdraw');   /* a known field the worker moves */
      await room._saveRpg(PID, ps);
      await settle();
      afterSave = structuredClone(st._store.get('rpg:' + PID));
      await room.webSocketClose(ws, 1000, 'bye', true);
      await settle();
    }
  } finally { [console.warn, console.error] = back; }
  return { st, room, ws, joined, afterSave, afterLeave: st._store.get('rpg:' + PID) };
}
const kept = (r) => !!r && r.futureFlag === true && Array.isArray(r.futureList) && r.futureList.join() === 'a,b' && r.futureSkill && r.futureSkill.level === 7 && r.futureSkill.xp === 120;

/* 1 + 2. newersave: false, a newer record */
{
  const r = await played({ newersave: false }, NEWER);
  check('1. newersave: false lets the newer character in (guard)', r.joined);
  check('1. the save keeps every field this worker does not know', kept(r.afterSave), r.afterSave);
  check('1. ...and the newer _v, as before', r.afterSave && r.afterSave._v === NEWER, r.afterSave && r.afterSave._v);
  check('1. ...and so does the leave (and every save after)', kept(r.afterLeave) && r.afterLeave._v === NEWER, r.afterLeave);
  check('2. a known field still saves as today: the purse the worker moved (525)', r.afterSave && r.afterSave.coins === 525 && r.afterLeave.coins === 525, { s: r.afterSave && r.afterSave.coins, l: r.afterLeave && r.afterLeave.coins });
}

/* 3. a record at this worker's own _v: nothing strange written */
{
  const st = makeStorage(new Map([['rpg:' + PID, { _v: RPG_SCHEMA_VERSION, coins: 500, inventory: {}, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } }]]));
  const room = await openRoom(st, { newersave: false });
  const ws = fakeWs('q');
  await join(room, ws, PID, { loginTaken: true });
  await room._saveRpg(PID, room.playerState[PID]);
  await settle();
  const f = st._store.get('rpg:' + PID);
  check('3. a current record keeps nothing aside, and its save holds no field the newer one had', !room._rpgNewerKept || !room._rpgNewerKept.has(PID), [...(room._rpgNewerKept || new Map()).keys()]);
  check('3. ...and invents none', f && !('futureFlag' in f) && f._v === RPG_SCHEMA_VERSION, f && Object.keys(f).filter((k) => k.startsWith('future')));
}

/* 4. the refusal without the switch, unchanged */
{
  const r = await played({}, NEWER);
  check('4. without newersave: false, the newer character is refused at the join, as today', !r.joined && r.ws.sent.every((m) => m.type !== 'state_sync'));
  check('4. ...and the record stands as it was', kept(r.afterLeave) && r.afterLeave.coins === 500 && r.afterLeave._v === NEWER, r.afterLeave);
}

/* 5. the switch thrown */
{
  const r = await played({ newersave: false, newerkeep: false }, NEWER);
  check('5. newerkeep: false: the old way (the unknown fields dropped by the save)', r.joined && r.afterSave && !('futureFlag' in r.afterSave) && !('futureSkill' in r.afterSave), r.afterSave && Object.keys(r.afterSave).filter((k) => k.startsWith('future')));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
