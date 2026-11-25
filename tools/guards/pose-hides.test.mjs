/* ═══ v2.3.6208: WHAT A BODY'S POSE HIDES (card EN, PR 2) ═══
 *
 * The owner, 2026-11-25: a peer's sword "floating mid air while he fished".
 * src/game/poseHides.js says ONCE what a pose whose picture holds its tool
 * puts away; my own bro's draw and a peer's both ask it (entityRenderer).
 *   1. a peer's harvest maps to its body pose: fish and mine, nothing else;
 *   2. my own bro's pose: smithing first, then fishing and mining;
 *   3. those poses, and only those, hide what the hand holds;
 *   4. hideHeld hides every held piece my own bro hid before (the weapon,
 *      the held shield, the hand's cap, the five arm clones), skips a field
 *      the display lacks, and writes only where `visible` changes (TRAPS
 *      §218: a write rebuilds the layer's draw list);
 *   5. both render paths ask it (the phone test mp-fishpeer plays it).
 * In tools/guards, not server/test: a new file there deploys the worker on
 * merge (TRAPS §277), and this is the page's rule.
 */
import { findIn } from './lib/filesOf.mjs';
import { exBodyPose, ownToolPose, poseHidesHeld, hideHeld, HELD_PIECES, TOOL_POSES } from '../../src/game/poseHides.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. a peer's harvest to its body pose ── */
{
  check('1a fish -> fish', exBodyPose('fish') === 'fish');
  check('1b mine -> mine', exBodyPose('mine') === 'mine');
  for (const ex of ['chop', 'cook', 'fire', 'farm:water:1', 'smith', null, undefined, '', 'Fish'])
    check(`1c ${JSON.stringify(ex)} -> no body pose`, exBodyPose(ex) === null, exBodyPose(ex));
  /* only the wire's own strings: a thing that merely prints as one is not a pose */
  check('1d an object printing "mine" is no pose', exBodyPose({ toString: () => 'mine' }) === null && exBodyPose({ toString: () => 'fish' }) === null);
}

/* ── 2. my own bro's pose ── */
{
  check('2a fishing -> fish', ownToolPose('fishing', false) === 'fish');
  check('2b mining -> mine', ownToolPose('mining', false) === 'mine');
  check('2c smithing -> smith', ownToolPose(null, true) === 'smith');
  check('2d smithing wins over a skill', ownToolPose('fishing', true) === 'smith');
  for (const sk of ['woodcutting', 'cooking', 'firemaking', null, undefined, ''])
    check(`2e ${JSON.stringify(sk)} -> none`, ownToolPose(sk, false) === null, ownToolPose(sk, false));
}

/* ── 3. which poses hide what the hand holds ── */
{
  for (const p of ['fish', 'mine', 'smith']) check(`3a ${p} hides`, poseHidesHeld(p) === true);
  for (const p of [null, undefined, 'stand', 'jog', 'dodge', 'chop', 'cook', '', 'fishing'])
    check(`3b ${JSON.stringify(p)} does not`, poseHidesHeld(p) === false, poseHidesHeld(p));
  check('3c the list is the three', JSON.stringify([...TOOL_POSES].sort()) === JSON.stringify(['fish', 'mine', 'smith']), TOOL_POSES);
  /* the two mappings and the rule agree end to end */
  check('3d a peer fishing hides', poseHidesHeld(exBodyPose('fish')) && poseHidesHeld(exBodyPose('mine')));
  check('3e a peer chopping does not (a stand-in hides the whole display)', !poseHidesHeld(exBodyPose('chop')));
  check('3f my bro fishing, mining, smithing hide', poseHidesHeld(ownToolPose('fishing')) && poseHidesHeld(ownToolPose('mining')) && poseHidesHeld(ownToolPose(null, true)));
}

/* ── 4. hideHeld ── */
const MY_OLD_LIST = ['_weaponContainer', '_shieldSprite', '_handCapSprite',
  '_handArmSprite', '_handArmShirt', '_handArmLegs', '_handArmChest', '_handArmCape'];
function piece(vis) {
  let v = vis; const p = { writes: 0 };
  Object.defineProperty(p, 'visible', { get: () => v, set: (x) => { v = x; p.writes++; } });
  return p;
}
{
  const d = {};
  for (const k of MY_OLD_LIST) d[k] = piece(true);
  d._body = piece(true); d._spriteBody = piece(true); d._shieldBackLo = piece(true); d._nameText = piece(true);
  const n = hideHeld(d);
  for (const k of MY_OLD_LIST) check(`4a ${k} hidden`, d[k].visible === false && d[k].writes === 1, d[k].writes);
  check('4b the body, the slung shield and the name stay', d._body.visible && d._spriteBody.visible && d._shieldBackLo.visible && d._nameText.visible
    && d._body.writes + d._spriteBody.writes + d._shieldBackLo.writes + d._nameText.writes === 0);
  check('4c it counts what it hid', n === MY_OLD_LIST.length, n);
  check('4d the list is my bro\'s old list', JSON.stringify([...HELD_PIECES].sort()) === JSON.stringify([...MY_OLD_LIST].sort()), HELD_PIECES);
  /* a second frame of the same pose writes nothing (TRAPS §218) */
  const n2 = hideHeld(d);
  check('4e the next frame writes nothing', n2 === 0 && MY_OLD_LIST.every((k) => d[k].writes === 1), n2);
  /* a peer's display: the weapon and the shield only */
  const peer = { _weaponContainer: piece(true), _shieldSprite: piece(false) };
  check('4f a peer: the weapon hidden, the hidden shield untouched, no throw',
    hideHeld(peer) === 1 && peer._weaponContainer.visible === false && peer._shieldSprite.writes === 0);
  check('4g no display', hideHeld(null) === 0 && hideHeld(undefined) === 0);
}

/* ── 5. both render paths ask the rule (read by system: tools/guards/lib/filesOf.mjs) ── */
{
  const has = (rx) => findIn('render', rx).length > 0;
  check('5a the renderer imports the rule', has(/import \{[^}]*\bexBodyPose\b[^}]*\bhideHeld\b[^}]*\} from '..\/..\/game\/poseHides\.js'/));
  check('5b my bro asks it', has(/const _fishingPose = poseHidesHeld\(ownToolPose\(/) && has(/if \(_fishingPose \|\| _swordSwing \|\| _bowShot\) hideHeld\(display\)/));
  check('5c a peer asks it', has(/const _oHeldOff = poseHidesHeld\(exBodyPose\(other\._ex\)\)/) && has(/if \(_oHeldOff\) hideHeld\(display\)/));
  check('5d the peer\'s body pose is the rule\'s mapping', has(/const _rexBodyPose = exBodyPose\(_rex\)/));
  check('5e no second copy of the mapping', !has(/_rex === 'mine' \? 'mine'/));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
