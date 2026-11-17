/* ═══ v2.3.5713: THE DEV CONSOLE SHOWS NO KEY (card SEC PR 14) ═══
 *
 * src/debug/blankSecrets.js is what the developer console (`?dev=1&debug=1`)
 * blanks: the WS tab's recorded frames (debugBus.js pushWS), the State tab
 * (DebugOverlay.jsx StatePanel) and the console's `state` command.  This holds:
 *
 *   1. a recorded `join` frame shows no Login Key (`phrase`), no device pass
 *      (`device`) and no account-check token (`verify`); every other field
 *      as sent; the frame the page sent is not touched (a copy is blanked);
 *   2. `key_new`'s key and `state_sync`'s httpToken are blanked too; any
 *      other frame comes back as it was (the same object);
 *   3. the State tab and `state`: this tab's keys and tokens (`_tabKey`,
 *      `_tabKeyOld`, `_joinKey`, `_verifyToken`, `_httpToken`) blanked by
 *      their field, at the root and when the path points straight at one;
 *      an empty one stays empty; other fields as they are;
 *   4. the console uses it: pushWS records `blankFrame`'s copy, the State
 *      tab draws through `blankStateValue` and `blankAtPath`, and `state`
 *      returns through `blankShallow`.
 *
 * BREAK PROOF (rule 8), tried by hand: debugBus.js recording `parsed` as
 * before -> FAIL 4; blankFrame returning the frame -> FAIL 1 and 2.
 *
 * Run from the repository's root: node tools/guards/devblank.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { BLANK, blankFrame, blankStateValue, blankAtPath, blankShallow } from '../../src/debug/blankSecrets.js';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};
const KEY = 'blaze-frost-nova-titan-ember-crown-river-stone';

/* 1. the join frame */
{
  const sent = { type: 'join', id: 'bp_x', phrase: KEY, kv: 2, name: 'Pat', verify: 'tok-123', device: { id: 'dev-abc', env: 'ios' }, protocolVersion: 2, data: { x: 1, y: 2 } };
  const before = JSON.stringify(sent);
  const rec = blankFrame(sent);
  const shown = JSON.stringify(rec);
  check('1: the recorded join shows no Login Key, device pass or account token', !shown.includes(KEY) && !shown.includes('dev-abc') && !shown.includes('tok-123') && rec.phrase === BLANK && rec.device === BLANK && rec.verify === BLANK, rec);
  check('1: ...and every other field as sent', rec.id === 'bp_x' && rec.kv === 2 && rec.name === 'Pat' && rec.protocolVersion === 2 && rec.data.x === 1, rec);
  check('1: the frame the page sent is not touched (a copy is blanked)', JSON.stringify(sent) === before && rec !== sent);
  const guest = blankFrame({ type: 'join', id: 'g_1', name: 'Guest' });
  check('1: a guest\'s join (no key) has nothing to blank', !('phrase' in guest) && guest.id === 'g_1', guest);
}

/* 2. the other frames */
{
  const kn = blankFrame({ type: 'key_new', id: 'bp_x', key: KEY });
  check('2: key_new\'s key is blanked', kn.key === BLANK && kn.id === 'bp_x' && !JSON.stringify(kn).includes(KEY), kn);
  const ss = blankFrame({ type: 'state_sync', httpToken: 'h-secret', you: { id: 'bp_x' } });
  check('2: state_sync\'s httpToken is blanked', ss.httpToken === BLANK && ss.you.id === 'bp_x', ss);
  const nested = blankFrame({ type: 'key_new', payload: { key: KEY, id: 'bp_x' } });
  check('2: a key riding in a payload is blanked too', nested.payload.key === BLANK && nested.payload.id === 'bp_x', nested);
  const tick = { type: 'player_state', hp: 50 };
  check('2: any other frame comes back as it was (the same object)', blankFrame(tick) === tick && blankFrame('raw text') === 'raw text' && blankFrame(null) === null);
}

/* 3. the State tab and `state` */
{
  const S = { myId: 'bp_x', _tabKey: KEY, _tabKeyOld: 'old-key-words', _joinKey: KEY, _verifyToken: null, _httpToken: 'h-secret', hp: 40 };
  const shown = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, blankStateValue(k, v)]));
  check('3: the State tab blanks this tab\'s keys and tokens by their field', shown._tabKey === BLANK && shown._tabKeyOld === BLANK && shown._joinKey === BLANK && shown._httpToken === BLANK, shown);
  check('3: ...an empty one stays empty, and other fields are as they are', shown._verifyToken === null && shown.myId === 'bp_x' && shown.hp === 40, shown);
  check('3: a path pointed straight at one is blanked', blankAtPath('_tabKey', KEY) === BLANK && blankAtPath('hp', 40) === 40 && blankAtPath('', S) === S);
  const st = blankShallow(S);
  check('3: `state` on an object blanks its keys, the state itself untouched', st._tabKey === BLANK && st.hp === 40 && S._tabKey === KEY, st);
}

/* 4. the console uses it */
{
  const bus = readFileSync(join(ROOT, 'src/debug/debugBus.js'), 'utf8');
  const ov = readFileSync(join(ROOT, 'src/debug/DebugOverlay.jsx'), 'utf8');
  check('4: the WS tab records blankFrame\'s copy', /raw:\s*parsed != null \? blankFrame\(parsed\) : data/.test(bus) && !/raw:\s*parsed \?\? data/.test(bus));
  check('4: `state` returns through blankShallow and blankAtPath', /return blankShallow\(blankAtPath\(args\[0\], cur\)\)/.test(bus));
  check('4: the State tab draws through blankStateValue, and a path through blankAtPath', /render\(blankStateValue\(k, vv\), depth \+ 1\)/.test(ov) && /target = blankAtPath\(path, target\)/.test(ov));
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
