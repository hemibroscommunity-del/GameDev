/* ═══ v2.3.3768: THE PARTY STRIP FOLDS TO A CHIP ═══
 *
 * The owner: "Also is partying unobtrusive right now? Just wanting to make sure
 * the screen isn't cluttered with party stuff".  src/game/partyChip.js holds
 * the chip's rules, run here in node as the page runs them:
 *   1. a member's pip is their health bar's colour (offline grey, down red);
 *   2. what opens the list by itself: a member joining or leaving, going
 *      down, or dropping under a quarter of their health -- never the first
 *      roster, never you, never an offline member's health, and only on the
 *      change (a member who stays low opens it once);
 *   3. the list is open while you opened it, or until its attention time;
 *   4. the HUD uses them: folded by default, the kick two taps.
 */
import { readFileSync } from 'node:fs';
import { LIST_KEY, ATTN_MS, LOW_FRAC, KICK_ARM_MS, PIP_COLOR, pipOf, partyAttention, listOpen } from '../../src/game/partyChip.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const M = (id, hp, extra) => Object.assign({ id, name: id, hp, maxHp: 100 }, extra || {});

/* ── 1. pips ── */
check('1a health over half green, over a quarter amber, under red', pipOf(M('a', 80)) === 'ok' && pipOf(M('a', 40)) === 'mid' && pipOf(M('a', 20)) === 'low');
check('1b down is down, whatever the number', pipOf(M('a', 0, { dead: true })) === 'down' && pipOf(M('a', 90, { dead: true })) === 'down');
check('1c offline or away is grey, never a health colour', pipOf(M('a', 10, { off: true })) === 'off' && pipOf(M('a', 90, { away: true })) === 'off' && pipOf(null) === 'off');
check('1d every pip has a colour, the bars\' own', ['ok', 'mid', 'low', 'down', 'off'].every((k) => /^#[0-9A-F]{6}$/i.test(PIP_COLOR[k])) && PIP_COLOR.ok === '#59BF91' && PIP_COLOR.low === '#D95C54');
check('1e no health on file reads low, not a crash', pipOf({ id: 'a' }) === 'low');

/* ── 2. attention ── */
const step = (rosters, me = 'me') => {
  let seen = null; const whys = [];
  for (const r of rosters) { const o = partyAttention(seen, r, me); seen = o.seen; whys.push(o.why); }
  return whys;
};
const base = [M('me', 100), M('b', 100), M('c', 100)];
check('2a the first roster is never news', step([base])[0] === null);
check('2b a member joins: join', step([base, base.concat([M('d', 100)])])[1] === 'join');
check('2c a member leaves: leave', step([base, base.slice(0, 2)])[1] === 'leave');
check('2d a member goes down: down', step([base, [M('me', 100), M('b', 0, { dead: true }), M('c', 100)]])[1] === 'down');
check('2e a member drops under a quarter: low', LOW_FRAC === 0.25 && step([base, [M('me', 100), M('b', 20), M('c', 100)]])[1] === 'low');
check('2f ...once: staying low is no news, nor getting lower', step([base, [M('me', 100), M('b', 20), M('c', 100)], [M('me', 100), M('b', 10), M('c', 100)]]).join() === ',low,');
check('2g ...healed and low again: news again', step([base, [M('me', 100), M('b', 20), M('c', 100)], base, [M('me', 100), M('b', 20), M('c', 100)]]).join() === ',low,,low');
check('2h you are never news to yourself (your own bar says it)', step([base, [M('me', 10), M('b', 100), M('c', 100)], [M('me', 0, { dead: true }), M('b', 100), M('c', 100)]]).join() === ',,');
check('2i an offline member\'s health is not news; their going offline is not a leave', step([base, [M('me', 100), M('b', 0, { off: true }), M('c', 100)]])[1] === null);
check('2j down outranks a join in the same roster', step([base, [M('me', 100), M('b', 0, { dead: true }), M('c', 100), M('d', 100)]])[1] === 'down');
check('2k healthy moves are no news', step([base, [M('me', 100), M('b', 60), M('c', 40)]])[1] === null);
check('2l a member down then up then low: down, then low is news again only after', step([base, [M('me', 100), M('b', 0, { dead: true }), M('c', 100)], [M('me', 100), M('b', 20), M('c', 100)]]).join() === ',down,');
check('2m odd rosters do not throw', partyAttention(null, null, 'me').why === null && partyAttention({}, [null, { id: 5 }], 'me').why === null);
const proto = partyAttention(null, [M('__proto__', 100), M('constructor', 100)], 'me');
check('2n ids like __proto__ are kept (a map with no prototype)', Object.keys(proto.seen).length === 2 && partyAttention(proto.seen, [M('__proto__', 100), M('constructor', 100)], 'me').why === null);

/* ── 3. open ── */
check('3a open while you opened it; else until the attention time', listOpen(true, 0, 5) && !listOpen(false, 0, 5) && listOpen(false, 10, 5) && !listOpen(false, 10, 10));
check('3b the times', ATTN_MS >= 3000 && ATTN_MS <= 6000 && KICK_ARM_MS === 3000 && LIST_KEY === 'bt_party_list');

/* ── 4. the HUD ── */
const hud = readFileSync(new URL('../../src/ui/panels/PartyHUD.jsx', import.meta.url), 'utf8');
check('4a the HUD reads the device\'s choice, folded unless it says open', /localStorage\.getItem\(LIST_KEY\) === 'open'/.test(hud) && /if \(!open\) \{[\s\S]{0,200}data-party-chip': 'folded'/.test(hud));
check('4b the kick is two taps: the first arms it, the second sends', /if \(armed\) \{ setKickArmed\(null\); send\('party_kick'/.test(hud) && /setKickArmed\(m\.id\)/.test(hud)
  && !/onClick: function onClick\(\) \{ send\('party_kick'/.test(hud));
check('4c the kick is only in the opened list (the chip has no button but itself)', (() => {
  const chip = (/if \(!open\) \{([\s\S]*?)\n  \}\n/.exec(hud) || [])[1] || '';
  return chip.length > 0 && !/party_kick|party_leave/.test(chip);
})());
check('4d the chip\'s words go through deskWords', /deskWords\('Tap to see your party'\)/.test(hud));

console.log(`\nparty-chip: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
