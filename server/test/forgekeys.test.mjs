/* THE FORGE ASKS FOR SOMETHING THAT EXISTS (v2.3.2123).
 *
 * Demo feedback, Alix, with a screenshot circling both halves: the Greatsword's
 * "Wood" tier read `Wood 0/3` while four pine logs sat in the bag.
 *
 * The resource key was built as `ore_<oreName>_ore` for every blacksmith tier,
 * so the first row -- oreName 'wood' -- asked for `ore_wood_ore`.  Nothing in
 * the game produces that: gathering.js mints `ore_copper_ore` / `ore_iron_ore`
 * from rocks and `wood_pine_log` / `wood_softwood` from trees.  The one tier a
 * level-1 player can reach, and the first thing a new player tries, could not
 * be forged from anything obtainable.
 *
 * This is the SAME BUG v2.3.1763 found one table down: WOODWORKING_TIERS' first
 * tier asked for `wood_wood`, in that fix's own words "a key nothing in the
 * game has ever produced".  It was fixed for staves and bows and left live for
 * melee, which is why this suite tests the RULE rather than the one row --
 * "every tier asks for something a player can obtain" is the claim, and it
 * would have caught both.
 *
 * KEYS ARE DERIVED FROM THE GATHERER, not hardcoded here.  A test carrying its
 * own list of valid keys passes the day someone renames a log and the forge
 * stops matching it; deriving them from _harvestInvKey means the two move
 * together or the test goes red.
 */
import { GameRoom } from '../src/index.js';
import { BLACKSMITH_TIERS, WOODWORKING_TIERS } from '../src/data.js';
import { BLACKSMITH_TIERS as CLIENT_BS } from '../../src/data/gameSystems.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(makeState(), mockEnv);

/* ── EVERY KEY A PLAYER CAN ACTUALLY END UP HOLDING ───────────────────────
   Straight out of the gatherer, across every node type and every tier it
   knows, so this set IS what the game can put in a bag. */
const obtainable = new Set();
for (const nodeType of ['tree', 'fishSpot', 'oreVein']) {
  for (const tier of [1, 6]) obtainable.add(room._harvestInvKey(nodeType, tier));
}
check('the gatherer yields keys at all (guard)', obtainable.size >= 4, [...obtainable]);
check('...including the first log and the first ore (guard)',
  obtainable.has('wood_pine_log') && obtainable.has('ore_copper_ore'), [...obtainable]);

/* The resolver under test, in the shape gear.js uses it. */
const keyFor = (tier) => (tier.wood ? ('wood_' + tier.wood) : ('ore_' + tier.oreName + '_ore'));

/* ── THE FIRST TIER OF EACH BENCH IS REACHABLE ────────────────────────────
   These are the two rows a brand-new character can use, so a broken key here
   is not a rough edge, it is a wall on the tutorial path. */
const bsFirst = BLACKSMITH_TIERS.wood;
const wwFirst = WOODWORKING_TIERS.pine;
check('the blacksmith\'s first tier asks for something a player can gather',
  obtainable.has(keyFor(bsFirst)), { asked: keyFor(bsFirst), obtainable: [...obtainable] });
check('...and it is the pine log the first tree drops',
  keyFor(bsFirst) === 'wood_pine_log', keyFor(bsFirst));
check('the woodworking bench\'s first tier still does too (v2.3.1763, kept)',
  obtainable.has(keyFor(wwFirst)), { asked: keyFor(wwFirst) });

/* ── AND NO TIER ASKS FOR A KEY SHAPED LIKE NOTHING ───────────────────────
   The higher tiers consume metals no node drops yet (they come from the
   market and from smelting), so "obtainable today" is the wrong bar for
   them.  What IS wrong at every tier is the `ore_wood_ore` shape: a wood
   name run through the ore formula.  That is the bug, stated as a rule. */
for (const [name, tier] of Object.entries(BLACKSMITH_TIERS)) {
  const k = keyFor(tier);
  check(`blacksmith tier "${name}" does not ask for a wood-through-the-ore-formula key`,
    !/^ore_(wood|.*_log|softwood|hardwood)_ore$/.test(k), k);
}

/* ── THE TWO TABLES AGREE ─────────────────────────────────────────────────
   The client resolves this key itself (ForgePanel) off its own mirror of the
   table, so a fix applied to one side only shows up as the forge disagreeing
   with the worker about whether you can afford it — the button says Forge and
   the worker silently refuses. */
check('the client mirror carries the same first-tier row',
  !!CLIENT_BS && !!CLIENT_BS.wood && keyFor(CLIENT_BS.wood) === keyFor(bsFirst),
  { server: keyFor(bsFirst), client: CLIENT_BS && CLIENT_BS.wood && keyFor(CLIENT_BS.wood) });
for (const name of Object.keys(BLACKSMITH_TIERS)) {
  const a = BLACKSMITH_TIERS[name], b = CLIENT_BS && CLIENT_BS[name];
  if (!b) { check(`the client mirror has tier "${name}"`, false, name); continue; }
  check(`tier "${name}" resolves to the same key on both sides`, keyFor(a) === keyFor(b),
    { server: keyFor(a), client: keyFor(b) });
}

console.log(failures ? `\n${failures} FAILURES` : '\nall forge-key checks passed');
process.exit(failures ? 1 : 0);
