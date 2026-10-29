/* BroTown's new cast -- v2.3.3833 (docs/specs/npc-cast.md).
 *
 * The owner, of the thirteen drafted: "Keep all as you have them for now
 * (NPCs)".  Ten keepers at the doors that had nobody, three locals; chatter
 * only for now.  Read in node with the real tables:
 *
 *   1. every townsperson's lines can be said: a non-empty list of plain
 *      strings (the AI loop indexes `phrases` unguarded), no names twice;
 *   2. the thirteen: each a Wheel-only row with four to six lines, short
 *      enough for a bubble, plain words (no markdown stars: a bubble prints
 *      them), ASCII but for the avatar;
 *   3. chatter only: none of them is a quest's giver, so none has a
 *      wisecrack before an offer to need;
 *   4. where they stand and what they open: each a WHEEL_TOWNSFOLK row, the
 *      ten keepers each opening the building he stands at, no building with
 *      two; their looks are NPC_LOOKS rows; their pictures on disk;
 *   5. talking is a tap: none of them opens anything by walking up.
 */
import fs from 'fs';
import { NPC_DATA } from '../../src/data/gameDisplay.js';
import { QUEST_CHAINS } from '../../src/data/gameSystems.js';
import { WHEEL_TOWNSFOLK, WHEEL_KEEPERS, WHEEL_BUILDING_DOORS, WHEEL_HALL_DOORS } from '../../src/data/wheelBuildingDoors.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const KEEPERS = { Sterling: 'bank', Slim: 'saloon', 'Chef Blaze': 'cookhouse', Glint: 'gemcutter', 'Postmaster Pete': 'post',
  'Deed Dave': 'landoffice', Benny: 'hotel', 'Guildmaster Gary': 'guildhall', 'Sheriff Buck': 'sheriff', 'Gavel Greg': 'auction' };
const LOCALS = ['Bean', 'Old Man Reel', 'Tourist Terry'];
const CAST = [...Object.keys(KEEPERS), ...LOCALS];
/* the NPC_LOOKS key each is baked from (P5's live drawing reads the same rows) */
const LOOK = { Sterling: 'banker', Slim: 'barkeep', 'Chef Blaze': 'chef', Glint: 'gemguru', 'Postmaster Pete': 'postman',
  'Deed Dave': 'realtor', Benny: 'bellhop', 'Guildmaster Gary': 'guildmaster', 'Sheriff Buck': 'sheriff', 'Gavel Greg': 'auctioneer',
  'Old Man Reel': 'fisher', Bean: 'streamer', 'Tourist Terry': 'tourist' };
const row = (n) => NPC_DATA.find((r) => r.name === n);

/* ── 1. every townsperson's lines ─────────────────────────────────────────── */
{
  const bad = NPC_DATA.filter((r) => !Array.isArray(r.phrases) || r.phrases.length === 0 || r.phrases.some((p) => typeof p !== 'string' || !p.trim()));
  check(`1a every townsperson (${NPC_DATA.length}) has lines to say, each a plain string`, bad.length === 0, bad.map((r) => r.name));
  const names = NPC_DATA.map((r) => r.name), ids = NPC_DATA.map((r) => r.id);
  check('1b no name and no id twice (a quest and a keeper are keyed on the name)', new Set(names).size === names.length && new Set(ids).size === ids.length);
}

/* ── 2. the thirteen ──────────────────────────────────────────────────────── */
{
  const missing = CAST.filter((n) => !row(n));
  check('2a all thirteen are NPC_DATA rows', missing.length === 0, missing);
  const notWheel = CAST.filter((n) => row(n) && (row(n).wheelOnly !== true || row(n).noHp !== true || row(n).pathRadius !== 0));
  check('2b each the Wheel\'s only, with no health bar, standing still (P5\'s walking will move them)', notWheel.length === 0, notWheel);
  const counts = CAST.map((n) => [n, row(n) ? row(n).phrases.length : 0]);
  check(`2c four to six lines each (${counts.map((c) => c[1]).join(', ')})`, counts.every((c) => c[1] >= 4 && c[1] <= 6), counts);
  const lines = CAST.flatMap((n) => (row(n) ? row(n).phrases.map((p) => [n, p]) : []));
  const long = lines.filter(([, p]) => p.length > 130);
  check(`2d every line fits a bubble (the longest ${Math.max(...lines.map(([, p]) => p.length))} characters, 130 at most)`, long.length === 0, long);
  const stars = lines.filter(([, p]) => /\*/.test(p));
  check('2e plain words: no markdown stars (a bubble prints them as they are)', stars.length === 0, stars);
  const ascii = lines.filter(([, p]) => /[^\x20-\x7e]/.test(p));
  check('2f every line is plain ASCII (the game\'s script is ASCII)', ascii.length === 0, ascii);
  const dup = lines.filter(([, p], i) => lines.findIndex(([, q]) => q === p) !== i);
  check('2g no line said twice', dup.length === 0, dup);
  check('2h Bean is a kid, Lil Bro\'s size (figureSize 0.8)', row('Bean') && row('Bean').figureSize === 0.8 && row('Lil Bro').figureSize === 0.8);
  const plates = CAST.filter((n) => row(n) && !(typeof row(n).plateRole === 'string' && row(n).plateRole));
  check('2i each wears a role on his name plate', plates.length === 0, plates);
}

/* ── 3. chatter only ──────────────────────────────────────────────────────── */
{
  const givers = new Set(Object.values(QUEST_CHAINS).map((q) => q.npc));
  const giving = CAST.filter((n) => givers.has(n));
  check('3a none of the thirteen gives a quest yet (the owner: "chatter only for now"), so none needs a wisecrack before an offer', giving.length === 0, giving);
  const quest = CAST.filter((n) => row(n) && (row(n).needsCap || row(n).quietProgress || row(n).flip || row(n).pets));
  check('3b ...and none carries a giver\'s or a game\'s flags', quest.length === 0, quest);
}

/* ── 4. where they stand, what they open, how they look ─────────────────── */
{
  const folk = Object.fromEntries(WHEEL_TOWNSFOLK.map((f) => [f.name, f]));
  const unplaced = CAST.filter((n) => !folk[n]);
  check('4a each stands somewhere: a WHEEL_TOWNSFOLK row', unplaced.length === 0, unplaced);
  const wrong = Object.entries(KEEPERS).filter(([n, plot]) => WHEEL_KEEPERS[n] !== plot || !folk[n] || folk[n].door !== plot
    || !(own(WHEEL_BUILDING_DOORS, plot) || own(WHEEL_HALL_DOORS, plot)));
  check('4b each keeper opens the building at whose door he stands, one with a window', wrong.length === 0, wrong);
  const plots = Object.values(WHEEL_KEEPERS);
  check('4c no building has two keepers', new Set(plots).size === plots.length, plots);
  const localKeep = LOCALS.filter((n) => own(WHEEL_KEEPERS, n));
  check('4d the three locals keep nothing', localKeep.length === 0, localKeep);
  const capped = CAST.filter((n) => folk[n] && folk[n].cap);
  check('4e none waits on a worker\'s cap (client only: they stand against any worker)', capped.length === 0, capped);
  const looks = read('../../src/data/npcLooks.js');   /* v2.3.3809: the table moved there (the game draws them live) */
  const noLook = CAST.filter((n) => !new RegExp('\\n  ' + LOOK[n] + ': \\{\\s*\\n\\s*name: \'' + n + '\'').test(looks));
  check('4f each look is an NPC_LOOKS row named for him (the rows P5\'s live drawing takes over)', noLook.length === 0, noLook);
  const still = CAST.filter((n) => {
    const r = row(n);
    const m = new RegExp('\\n  ' + LOOK[n] + ': \\{[\\s\\S]*?still: \'([\\w-]+)\'').exec(looks);
    return !r || !m || r.sprite !== '/sprites/npc/' + m[1] + '.webp' || r.portrait !== '/sprites/npc/' + m[1] + '-head.webp';
  });
  check('4g each row\'s picture and portrait are the files his look bakes (`still`)', still.length === 0, still);
  const files = CAST.filter((n) => row(n) && !(fs.existsSync(new URL('../../public' + row(n).sprite, import.meta.url))
    && fs.existsSync(new URL('../../public' + row(n).portrait, import.meta.url))));
  check('4h ...and both are on disk', files.length === 0, files);
  const ps = read('../../tools/qa/nft_portraits.py');
  const noBust = CAST.filter((n) => row(n) && !ps.includes("'" + row(n).portrait.replace(/^.*\//, '').replace(/\.webp$/, '') + "': dict(look='" + LOOK[n] + "'"));
  check('4i each portrait is a Hemi Bros bust from his look (nft_portraits.py PORTRAITS)', noBust.length === 0, noBust);
}

/* ── 5. talking is a tap ──────────────────────────────────────────────────── */
{
  const walkUp = CAST.filter((n) => row(n) && (row(n).proximity || row(n).opener || row(n).shop || row(n).canFollow));
  check('5a none opens anything by walking up, follows you, or keeps a shop (talking is a tap)', walkUp.length === 0, walkUp);
}

console.log(`\nnpc-cast: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
