// What the wire door lets through for a field its row NAMES (run from the worktree's server/).
const ROOT = process.cwd().replace(/\/server$/, '') + '/server/src/';
const { wireDoorJudge } = await import(ROOT + 'wire/door.js');
const { WIRE_DOOR_ROWS } = await import(ROOT + 'wire/lists.js');
const show = (label, msg) => console.log((wireDoorJudge(msg) || 'LET IN').padEnd(16) + label);
console.log('bank_deposit row:', JSON.stringify(WIRE_DOOR_ROWS.SOCKET.get('bank_deposit')));
const base = { kind: 'gold', n: 5, opId: 'op_1', reqId: 'r1' };
for (const [label, n] of [['n: 5 (honest)', 5], ['n: "5" (a string)', '5'], ['n: -5', -5], ['n: 1.5', 1.5], ['n: 1e308', 1e308], ['n: true', true], ['n: {} ', {}], ['n: [1,2]', [1, 2]], ['n: {valueOf-shaped}', { v: 1 }], ['n: 1e999 (Infinity)', Infinity]]) {
  show('bank_deposit ' + label, { type: 'bank_deposit', payload: { ...base, n } });
}
show('bank_deposit kind: {a:1}', { type: 'bank_deposit', payload: { ...base, kind: { a: 1 } } });
show('bank_deposit opId: [..1000 items]', { type: 'bank_deposit', payload: { ...base, opId: new Array(1000).fill('x') } });
show('bank_deposit id: a 15,000-char string (trust request, not words)', { type: 'bank_deposit', payload: { ...base, kind: 'item', id: 'x'.repeat(15000) } });
console.log('area_chat row:', JSON.stringify(WIRE_DOOR_ROWS.SOCKET.get('area_chat')));
show('area_chat text: 2001 chars', { type: 'area_chat', payload: { text: 'x'.repeat(2001) } });
show('area_chat text: {a:1}', { type: 'area_chat', payload: { text: { a: 1 } } });
console.log('player_attack row:', JSON.stringify(WIRE_DOOR_ROWS.SOCKET.get('player_attack')));
show('player_attack dmgBase: 1e999 (NOT named in the row)', { type: 'player_attack', payload: { kind: 'melee', dmgBase: Infinity, critChance: Infinity } });
show('player_attack dmgBase: "abc"', { type: 'player_attack', payload: { kind: 'melee', dmgBase: 'abc' } });
show('player_attack range: 1e999 (named)', { type: 'player_attack', payload: { kind: 'melee', range: Infinity } });
show('move dead: true (NOT named)', { type: 'move', x: 1, y: 2, dead: true });
// how many named fields get any check beyond "not 1e999"
let all = 0, words = 0;
for (const rows of [WIRE_DOOR_ROWS.SOCKET, WIRE_DOOR_ROWS.ROUTES]) for (const pairs of rows.values()) for (const [, t] of pairs) { all++; if (t === 'words') words++; }
console.log('fields the door has rows for: ' + all + '; held to a type (words: a string of at most 2000): ' + words + '; the rest: only "no number that is not finite"');
