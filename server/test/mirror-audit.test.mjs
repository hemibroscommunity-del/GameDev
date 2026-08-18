/* Client/server mirror-table conformance audit (v2.3.1151; spec:
 * docs/specs/conformance-audit.md).
 *
 * server/src/data.js opens with a list of "keep in sync with the
 * client" obligations that, until now, were enforced by memory — and
 * table drift is invisible in play until someone notices damage
 * prediction desyncing or a vendor charging the wrong price (the sky
 * spawn-table drift caught in v2.3.1147 is the incident that motivated
 * making this mechanical).  This suite imports BOTH sides (every
 * client data module is plain-node importable — the balance sim and
 * tick.test already rely on that) and compares the LOAD-BEARING
 * fields: server fields are the authoritative subset, client entries
 * may carry extra presentation fields (label/color/desc) that are not
 * compared.
 *
 * ZONES level-band lockstep is deliberately NOT here — tick.test.mjs
 * already asserts it (server ZONES vs client zones.js, including the
 * spawn tables); this suite covers everything else data.js mirrors.
 *
 * The variant-map and speed exemptions are SELF-PRUNING: each asserts
 * the divergence still exists, so when someone closes it server-side
 * the exemption fails loudly and gets deleted instead of rotting.   */
import * as SRV from '../src/data.js';
import { GameRoom } from '../src/index.js';
/* v2.3.1734: the prog3 constant mirror the plan already claimed was
   enforced here.  See check 12 at the bottom. */
import { PROG3 as SRV_PROG3 } from '../src/prog3.js';
import { PROG3 as CLIENT_PROG3 } from '../../src/data/prog3.js';
import {
  ARCHETYPES, MONSTER_HP_CURVE, COOKING_RECIPES, QUEST_CHAINS,
  BLACKSMITH_TIERS, WOODWORKING_TIERS, SKILL_GUILDS, GUILD_QUESTS,
  QUALITY_MULTS, RARITY_TIERS,
  DAMAGE_CHANNEL_FLAT, WEAPON_CHANNELS, T2_UNITS as CLIENT_T2_UNITS,
  GEM_CUT_TIERS, WEAPON_TYPES,
  /* v2.3.1451: bench-locked T2 mirrors */
  T2_BENCH as CLIENT_T2_BENCH, T2_BENCH_CANONICAL as CLIENT_T2_BENCH_CANONICAL,
  t2BenchStats as clientT2BenchStats, t2PointValue as clientT2PointValue,
  t2BenchLevel as clientT2BenchLevel, t2SpendLevel as clientT2SpendLevel,
  t2ReplayFlat as clientT2ReplayFlat,
  /* v2.3.1765: the two life-skill numbers the owner just retuned.  Both are
     hand-copied mirrors whose comments tell the next reader to "keep in
     lockstep" — which is exactly the obligation this suite exists to stop
     enforcing by memory. */
  getFishHealAmount as clientFishHeal,
  /* v2.3.1765: the equip gate.  The two sides reach the same number by
     DIFFERENT roads — the worker by tier index, the client by statReq/2 — so
     they can drift without either looking wrong on its own. */
  canEquipItem as clientCanEquip,
} from '../../src/data/gameSystems.js';
/* The client's prog3 gate is DORMANT until the worker advertises caps.prog3
   (deploy-order safety, prog3.js `_enabled`) — without this the comparison
   below silently exercises the legacy raw-stat path on the client and the
   prog3 path on the server, which are not mirrors of each other and never
   were. */
import { setProg3Enabled } from '../../src/data/prog3.js';
import { createGatherNode as clientGatherNode, WOODCUTTING_TIERS as CLIENT_WOOD_TIERS } from '../../src/data/lifeSkills.js';
import { FISHING_TIERS } from '../../src/data/lifeSkills.js';
import { AMULET_TIERS, NUGGETS_PER_BAR, GOLD_NUGGET_DROP, GEM_DROP_RATES, GEM_EXTRACT_BASE_COST } from '../../src/data/items.js';
import { MONSTER_VARIANTS, ZONE_VARIANT_MAP } from '../../src/data/monsterVariants.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

// _variantForArchInZone/_variantSpeed touch no instance state — call
// them off the prototype so this suite needs no mock DO plumbing.
const room = Object.create(GameRoom.prototype);

// ── 1. ARCHETYPES: combat scalars must agree (server is authoritative
// for HP/damage; the client predicts with its copy) ──
{
  const bad = [];
  for (const [k, sv] of Object.entries(SRV.ARCHETYPES)) {
    const cv = ARCHETYPES[k];
    if (!cv) { bad.push({ arch: k, missing: 'client' }); continue; }
    for (const f of ['hpMult', 'dmgMult', 'spdMult']) {
      if (sv[f] !== cv[f]) bad.push({ arch: k, field: f, server: sv[f], client: cv[f] });
    }
  }
  check('ARCHETYPES combat scalars mirror (client may have EXTRA variant archetypes; server keys are the contract)', bad.length === 0, bad);
}

// ── 2. MONSTER_HP_CURVE: exact — this is BF-1's centralized curve ──
{
  const bad = Object.keys(SRV.MONSTER_HP_CURVE).filter((f) => SRV.MONSTER_HP_CURVE[f] !== MONSTER_HP_CURVE[f]);
  check('MONSTER_HP_CURVE identical (a drifted curve desyncs every kill-time expectation)', bad.length === 0, bad);
}

// ── 3. FISH_TIERS: level gates + names (server name is the client
// name lowercased — the heal path resolves inventory keys from it) ──
{
  const bad = [];
  SRV.FISH_TIERS.forEach((t, i) => {
    const c = FISHING_TIERS[i];
    if (!c || c.lvl !== t.lvl || c.name.toLowerCase() !== t.name) bad.push({ i, server: t, client: c && { lvl: c.lvl, name: c.name } });
  });
  check('FISH_TIERS lvl+name mirror (server = client lowercased)', bad.length === 0, bad);
}

// ── 4. COOKING_RECIPES: INDEX-ALIGNED (the wire sends recipe indexes;
// reordering either side changes what players cook) ──
{
  const bad = [];
  SRV.COOKING_RECIPES.forEach((r, i) => {
    const c = COOKING_RECIPES[i];
    if (!c || c.buff !== r.buff || c.power !== r.power || c.duration !== r.duration
      || c.tier !== r.tier || JSON.stringify(c.ingredients) !== JSON.stringify(r.ingredients)) {
      bad.push({ i, server: r, client: c });
    }
  });
  check('COOKING_RECIPES per-index mirror (order is the wire format)', bad.length === 0, bad);
}

// ── 5. QUEST_REWARDS vs QUEST_CHAINS: payouts + chain links, BOTH
// directions (a client-only quest could never be paid; a server-only
// entry is dead) ──
{
  const bad = [];
  for (const [k, sv] of Object.entries(SRV.QUEST_REWARDS)) {
    const c = QUEST_CHAINS[k];
    if (!c) { bad.push({ quest: k, missing: 'client' }); continue; }
    if (c.reward.gold !== sv.gold || c.reward.xp !== sv.xp || (c.next || null) !== (sv.next || null)) {
      bad.push({ quest: k, server: { gold: sv.gold, xp: sv.xp, next: sv.next }, client: { ...c.reward, next: c.next } });
    }
  }
  for (const k of Object.keys(QUEST_CHAINS)) if (!SRV.QUEST_REWARDS[k]) bad.push({ quest: k, missing: 'server' });
  check('QUEST_REWARDS <-> QUEST_CHAINS gold/xp/next mirror, both directions', bad.length === 0, bad);
}

// ── 5b. v2.3.1681: the quest dialog's item THUMBNAILS (`gives`) are display
// only, but showing a player a picture of a sword the server will not hand
// over is the worst kind of wrong.  Assert that a promised payout moment
// really exists server-side: when:'accept' needs grantOnAccept, when:'complete'
// needs reward.item.  (The reverse is deliberately NOT asserted — a granted
// item with no art in the repo, like the axe, is allowed to go unillustrated.)
{
  const bad = [];
  for (const [k, c] of Object.entries(QUEST_CHAINS)) {
    if (!Array.isArray(c.gives) || !c.gives.length) continue;
    const sv = SRV.QUEST_REWARDS[k];
    if (!sv) { bad.push({ quest: k, missing: 'server' }); continue; }
    for (const g of c.gives) {
      if (!g || !g.icon) { bad.push({ quest: k, reason: 'gives entry has no icon' }); continue; }
      if (g.when === 'accept' && !Array.isArray(sv.grantOnAccept)) {
        bad.push({ quest: k, icon: g.icon, reason: 'promises an item on accept, server has no grantOnAccept' });
      }
      if (g.when === 'complete' && !sv.item) {
        bad.push({ quest: k, icon: g.icon, reason: 'promises an item on turn-in, server pays no item' });
      }
      if (g.when !== 'accept' && g.when !== 'complete') {
        bad.push({ quest: k, when: g.when, reason: "when must be 'accept' or 'complete'" });
      }
    }
  }
  check('QUEST_CHAINS.gives thumbnails match a real server payout moment', bad.length === 0, bad);
}

// ── 5c. Every icon named by `gives` is a file that exists.  A 404 here is a
// blank square in the tutorial's first dialogue, which no unit test over data
// alone would ever notice.
{
  const bad = [];
  const pub = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');
  for (const [k, c] of Object.entries(QUEST_CHAINS)) {
    for (const g of (c.gives || [])) {
      if (!g || !g.icon) continue;
      try { readFileSync(join(pub, g.icon.replace(/^\//, '').split('?')[0])); }
      catch (_e) { bad.push({ quest: k, icon: g.icon }); }
    }
  }
  check('QUEST_CHAINS.gives icons exist on disk', bad.length === 0, bad);
}

// ── 6. BLACKSMITH/WOODWORKING: every server field of every tier (the
// client entries carry extra label/color/desc presentation) ──
function tierMirror(name, srv, cli) {
  const bad = [];
  const sk = Object.keys(srv), ck = Object.keys(cli);
  if (JSON.stringify(sk) !== JSON.stringify(ck)) bad.push({ keyOrder: { server: sk, client: ck } });
  for (const k of sk) {
    for (const f of Object.keys(srv[k] || {})) {
      if (!cli[k] || srv[k][f] !== cli[k][f]) bad.push({ tier: k, field: f, server: srv[k] && srv[k][f], client: cli[k] && cli[k][f] });
    }
  }
  check(name + ' tiers mirror (key order + every server field; forge mints must match client previews)', bad.length === 0, bad.slice(0, 5));
}
tierMirror('BLACKSMITH', SRV.BLACKSMITH_TIERS, BLACKSMITH_TIERS);
tierMirror('WOODWORKING', SRV.WOODWORKING_TIERS, WOODWORKING_TIERS);

// ── 7. GUILD_SKILLS vs SKILL_GUILDS keys; GUILD_QUESTS per-index (the
// index IS the claims ladder under guild_claims:<pid> — never reorder) ──
{
  const ck = Object.keys(SKILL_GUILDS);
  check('GUILD_SKILLS === SKILL_GUILDS keys (a skill on one side only can\'t claim quests)',
    JSON.stringify([...SRV.GUILD_SKILLS].sort()) === JSON.stringify([...ck].sort()),
    { server: SRV.GUILD_SKILLS, client: ck });
  const bad = [];
  if (SRV.GUILD_QUESTS.length !== GUILD_QUESTS.length) bad.push({ len: { server: SRV.GUILD_QUESTS.length, client: GUILD_QUESTS.length } });
  SRV.GUILD_QUESTS.forEach((q, i) => {
    const c = GUILD_QUESTS[i];
    if (!c || c.checkLvl !== q.checkLvl || c.reward.gold !== q.gold || c.reward.ap !== q.ap) {
      bad.push({ i, server: q, client: c && { checkLvl: c.checkLvl, ...c.reward } });
    }
  });
  check('GUILD_QUESTS ladder mirrors per-index (checkLvl/gold/ap)', bad.length === 0, bad);
}

// ── 8. QUALITY / AMULET / RARITY multipliers ──
{
  const bad = Object.entries(SRV.QUALITY_GRADES).filter(([k, v]) => QUALITY_MULTS[k] !== v.mult).map(([k]) => k);
  check('QUALITY_GRADES <-> QUALITY_MULTS', bad.length === 0, bad);
}
{
  const bad = Object.entries(SRV.AMULET_TIER_POWER).filter(([k, v]) => !AMULET_TIERS[k] || AMULET_TIERS[k].basePower !== v).map(([k]) => k);
  check('AMULET_TIER_POWER <-> AMULET_TIERS basePower (drives the flame-gem elemDmg roll)', bad.length === 0, bad);
}
{
  const bad = Object.entries(SRV.RARITY_TIERS).filter(([k, v]) => !RARITY_TIERS[k] || RARITY_TIERS[k].mult !== v.mult).map(([k]) => k);
  check('RARITY_TIERS mults mirror (labels/colors are client-only presentation)', bad.length === 0, bad);
}

// ── 8c. v2.3.1192 server amulet forge: the mint tables (amulet.js) vs
// the client's AMULET_TIERS / NUGGETS_PER_BAR / GOLD_NUGGET_DROP.  A
// drifted cost table would let the forge charge a different price than
// the client previews (or deny crafts the client thinks it can afford). ──
tierMirror('AMULET_FORGE', SRV.AMULET_FORGE_TIERS, AMULET_TIERS);
check('NUGGETS_PER_BAR mirror (the smelt op consumes the server constant)',
  SRV.NUGGETS_PER_BAR === NUGGETS_PER_BAR,
  { server: SRV.NUGGETS_PER_BAR, client: NUGGETS_PER_BAR });
check('GOLD_NUGGET_MONSTER_DROP <-> GOLD_NUGGET_DROP.monsterKill (server rolls the kill drop now)',
  SRV.GOLD_NUGGET_MONSTER_DROP === GOLD_NUGGET_DROP.monsterKill,
  { server: SRV.GOLD_NUGGET_MONSTER_DROP, client: GOLD_NUGGET_DROP.monsterKill });

// ── 8d. v2.3.1198 server gem income (amulet.js successor slice): the
// cut-success ladder and the kill drop rate vs the client tables.  A
// drifted ladder would make the Gem Cutter's success preview lie about
// what the server-rolled cut actually pays.  The client's
// GEM_DROP_RATES.woodcutting/fishing/mining are DEAD DATA (no roll
// site ever read them, back to the original index.html) -- deliberately
// not mirrored, the GOLD_NUGGET_DROP.lifeSkill precedent above. ──
tierMirror('GEM_CUT', SRV.GEM_CUT_TIERS, GEM_CUT_TIERS);
check('GEM_RAW_MONSTER_DROP <-> GEM_DROP_RATES.monsterKill (server rolls the kill drop now)',
  SRV.GEM_RAW_MONSTER_DROP === GEM_DROP_RATES.monsterKill,
  { server: SRV.GEM_RAW_MONSTER_DROP, client: GEM_DROP_RATES.monsterKill });

// ── 8e. v2.3.1209 server gem EXTRACTION (amulet.js op:'extract'): the
// cost constant and the display-name label tables.  The client
// wholesale-replaces the gear blob (name included) from the extraction
// echo, so a drifted label would flip the weapon/shield/amulet name on
// every extract; a drifted cost would reject spends the button
// previewed.  The label tables are a compact server-side mirror of the
// client tier/weapon .label fields (only the extraction name rebuild
// needs them server-side). ──
check('GEM_EXTRACT_BASE_COST server <-> client (the extract coin gate)',
  SRV.GEM_EXTRACT_BASE_COST === GEM_EXTRACT_BASE_COST,
  { server: SRV.GEM_EXTRACT_BASE_COST, client: GEM_EXTRACT_BASE_COST });
function labelMirror(name, srvLabels, cliTable) {
  const bad = [];
  const sk = Object.keys(srvLabels), ck = Object.keys(cliTable);
  if (JSON.stringify(sk) !== JSON.stringify(ck)) bad.push({ keyOrder: { server: sk, client: ck } });
  for (const k of sk) {
    if (!cliTable[k] || srvLabels[k] !== cliTable[k].label) {
      bad.push({ key: k, server: srvLabels[k], client: cliTable[k] && cliTable[k].label });
    }
  }
  check(name + ' extraction labels mirror the client .label (name rebuild parity)', bad.length === 0, bad.slice(0, 5));
}
labelMirror('BLACKSMITH', SRV.BLACKSMITH_TIER_LABELS, BLACKSMITH_TIERS);
labelMirror('WOODWORKING', SRV.WOODWORKING_TIER_LABELS, WOODWORKING_TIERS);
labelMirror('WEAPON_TYPE', SRV.WEAPON_TYPE_LABELS, WEAPON_TYPES);

// ── 8b. v2.3.1153 damage-channel reprice: the server coefficient, the
// client coefficient, and the allocation-panel perPt (percent per point)
// must all describe the same multiplier, or the panel readout lies about
// what the authoritative roll pays. ──
{
  // v2.3.1343 (kid-simple reprice): the damage channel is FLAT
  // +DAMAGE_CHANNEL_FLAT/pt (post-tier post-variance); the mirror tie
  // moves from PCT/100 to the flat constant itself.
  check('DAMAGE_CHANNEL_FLAT server <-> client', SRV.DAMAGE_CHANNEL_FLAT === DAMAGE_CHANNEL_FLAT,
    { server: SRV.DAMAGE_CHANNEL_FLAT, client: DAMAGE_CHANNEL_FLAT });
  // v2.3.1345: the accelerating-flat UNIT table must match exactly —
  // a one-sided retune silently splits prediction from settlement.
  check('T2_UNITS server <-> client (accelerating-flat units)',
    JSON.stringify(SRV.T2_UNITS) === JSON.stringify(CLIENT_T2_UNITS),
    { server: SRV.T2_UNITS, client: CLIENT_T2_UNITS });
  const bad = [];
  for (const [cat, defs] of Object.entries(WEAPON_CHANNELS)) {
    for (const d of defs) {
      if (d.role === 'damage' && Math.abs((d.perPt || 0) - DAMAGE_CHANNEL_FLAT) > 1e-12) {
        bad.push({ cat, key: d.key, perPt: d.perPt });
      }
    }
  }
  check('WEAPON_CHANNELS damage-role perPt ties to DAMAGE_CHANNEL_FLAT', bad.length === 0, bad);

  // ── v2.3.1451: BENCH-LOCKED T2 mirrors.  The tuning table, the
  // canonical channel order, and every pricing function must agree
  // between server data.js and client gameSystems.js — a one-sided
  // retune splits the client's spend-time prediction from the
  // server's authoritative accumulator (grids.js _t2BenchReprice),
  // and a canonical-order drift makes replays diverge. ──
  check('T2_BENCH server <-> client (bench-locked tuning table)',
    JSON.stringify(SRV.T2_BENCH) === JSON.stringify(CLIENT_T2_BENCH),
    { server: SRV.T2_BENCH, client: CLIENT_T2_BENCH });
  check('T2_BENCH_CANONICAL server <-> client (channel order + roles)',
    JSON.stringify(SRV.T2_BENCH_CANONICAL) === JSON.stringify(CLIENT_T2_BENCH_CANONICAL),
    { server: SRV.T2_BENCH_CANONICAL.length, client: CLIENT_T2_BENCH_CANONICAL.length });
  {
    const fnBad = [];
    for (const B of [1, 2, 8, 25, 65, 80, 100]) {
      if (JSON.stringify(SRV.t2BenchStats(B)) !== JSON.stringify(clientT2BenchStats(B))) fnBad.push({ B, fn: 't2BenchStats' });
      for (const role of Object.keys(SRV.T2_BENCH)) {
        if (SRV.t2PointValue(role, B) !== clientT2PointValue(role, B)) fnBad.push({ B, role, fn: 't2PointValue' });
      }
    }
    for (const L of [1, 5, 10, 11, 250, 991, 1000]) {
      if (SRV.t2BenchLevel(L) !== clientT2BenchLevel(L)) fnBad.push({ L, fn: 't2BenchLevel' });
      if (SRV.t2SpendLevel(L) !== clientT2SpendLevel(L)) fnBad.push({ L, fn: 't2SpendLevel' });
    }
    // Replay parity on a mixed build — the migration/boundary path and
    // the client's fixture builder must agree byte-for-byte.
    const mixed = {
      weaponSpecs: { sword: { edge: 60, executioner: 30 }, bow: { drawPower: 15 } },
      defenseSpec: { ironskin: 40, secondwind: 25, bulwark: 50 },
      hpSpec: { vigor: 70, lifeblood: 10, laststand: 20 },
      enduranceSpec: { stamina: 35, swiftness: 45 },
    };
    if (JSON.stringify(SRV.t2ReplayFlat(mixed)) !== JSON.stringify(clientT2ReplayFlat(mixed))) fnBad.push({ fn: 't2ReplayFlat' });
    check('bench-locked pricing functions server <-> client (probes at several benchmarks)', fnBad.length === 0, fnBad);
  }
}

// ── 9. Variant map: server _variantForArchInZone vs client
// ZONE_VARIANT_MAP.  Two documented exemptions where the server
// deliberately has NO entry (legacy tidal/hollows brutes predate the
// server-side variant resolution; their remains keys were never
// variant-scoped).  Each exemption asserts the server STILL returns
// null so it self-prunes when someone closes the gap. ──
{
  const EXEMPT = new Set(['tidal.brute', 'hollows.brute']);
  const bad = [];
  for (const [zone, m] of Object.entries(ZONE_VARIANT_MAP)) {
    for (const [arch, variant] of Object.entries(m)) {
      const srv = room._variantForArchInZone(arch, zone);
      if (EXEMPT.has(zone + '.' + arch)) {
        if (srv !== null) bad.push({ zone, arch, exemptionStale: 'server now maps this — delete the exemption', server: srv });
      } else if (srv !== variant) {
        bad.push({ zone, arch, server: srv, client: variant });
      }
    }
  }
  check('ZONE_VARIANT_MAP <-> _variantForArchInZone (self-pruning exemptions: tidal/hollows brute)', bad.length === 0, bad);
}

// ── 10. Variant speeds: every client variant that declares spd must
// match server _variantSpeed — except fishman/rockmonster, the
// documented pre-existing divergence (server has no entry; those
// brutes move at brute base 0.35 server-side while the client cfg
// says 0.5 — left alone to preserve shipped zones' feel).  The
// exemption self-prunes the same way. ──
{
  const EXEMPT = new Set(['fishman', 'rockmonster']);
  const bad = [];
  for (const [k, v] of Object.entries(MONSTER_VARIANTS)) {
    if (v.spd == null) continue;
    const srv = room._variantSpeed(k);
    if (EXEMPT.has(k)) {
      if (srv !== undefined) bad.push({ variant: k, exemptionStale: 'server now has a speed — delete the exemption', server: srv });
    } else if (srv !== v.spd) {
      bad.push({ variant: k, server: srv, client: v.spd });
    }
  }
  check('variant speeds mirror (self-pruning exemptions: fishman/rockmonster)', bad.length === 0, bad);
}

// ── 11. SHOP_ITEMS vs the VendorPanel item array.  The client table
// is inline JSX (src/ui/panels/buildings/VendorPanel.jsx), so extract
// {id, cost, effect} triples by regex — and hard-fail if extraction
// finds nothing (panel moved/renamed → update the path here AND the
// pointer comment in server/src/data.js). ──
{
  const panelPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'ui', 'panels', 'buildings', 'VendorPanel.jsx');
  const src = readFileSync(panelPath, 'utf8');
  const re = /id:\s*'(\w+)',[\s\S]*?cost:\s*(\d+),[\s\S]*?effect:\s*'(\w+)'/g;
  const found = {};
  let m;
  while ((m = re.exec(src))) found[m[1]] = { cost: Number(m[2]), effect: m[3] };
  check('VendorPanel extraction found items (zero = regex rot or the panel moved)', Object.keys(found).length >= 3, Object.keys(found));
  const bad = [];
  for (const [id, sv] of Object.entries(SRV.SHOP_ITEMS)) {
    const c = found[id];
    if (!c) { bad.push({ id, missing: 'client' }); continue; }
    if (c.cost !== sv.cost || c.effect !== sv.effect) bad.push({ id, server: sv, client: c });
  }
  for (const id of Object.keys(found)) if (!SRV.SHOP_ITEMS[id]) bad.push({ id, missing: 'server (client sells something the server won\'t settle)' });
  check('SHOP_ITEMS <-> VendorPanel cost/effect mirror, both directions', bad.length === 0, bad);
}

// ── 12. PROG3 scalar constants (v2.3.1734).  COMBAT-OVERHAUL-PLAN's
// standing constraints assert these are "CI-enforced by
// mirror-audit.test.mjs" — they were NOT.  The client half
// (src/data/prog3.js) is a hand-copied mirror whose only job is to
// predict the numbers the wire will confirm, so drift here is silent
// until a player notices the HUD promising casts the worker refuses.
// Comparing the SCALARS the client mirror actually declares: it is a
// subset by design (the server owns curve functions the client never
// evaluates), so this checks every key present on BOTH sides. ──
{
  const flat = (obj, prefix, out) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object') flat(v, prefix + k + '.', out);
      else out[prefix + k] = v;
    }
    return out;
  };
  const srv = flat(SRV_PROG3, '', {});
  const cli = flat(CLIENT_PROG3, '', {});
  const shared = Object.keys(cli).filter((k) => k in srv);
  check('PROG3 mirror extraction found the scalar set (zero = the mirror moved)', shared.length >= 15, shared.length);
  const bad = shared.filter((k) => String(srv[k]) !== String(cli[k])).map((k) => ({ key: k, server: srv[k], client: cli[k] }));
  check('PROG3 constants mirror server<->client (a drifted one desyncs every predicted number — the v2.3.1451 rule)',
    bad.length === 0, bad);
  /* The four v2.3.1734 additions by name, so a mirror that silently
     LOSES one fails here rather than quietly passing the subset check. */
  const required = ['SPECIAL_MANA_COST', 'MANA_PER_MAGIC_LEVEL', 'BURST_MANA_COST', 'BURST_MIN_CHAR_LEVEL', 'BURST_CD_MS', 'BURST_RADIUS', 'BURST_DMG_MULT'];
  const missing = required.filter((k) => !(k in cli) || !(k in srv));
  check('the mana-rework / Element Burst constants exist on BOTH sides', missing.length === 0, missing);
}

// ── 13. Life-skill retune mirrors (v2.3.1765).  Two numbers the owner
// asked for by hand — "Fish heal needs to be closer to 100" and
// "Lifeskills xp is far too slow ... increase it by about 5x" — each
// written twice, once in the worker (authoritative) and once on the
// client (prediction).  A drift is invisible in play: the client shows
// its own number and the next player_state quietly takes it back, which
// reads as the game stuttering rather than as a mismatch. ──
{
  const room = new GameRoom(
    { storage: { get: async () => null, put: async () => {}, list: async () => new Map(), delete: async () => {} },
      blockConcurrencyWhile: async (f) => f() },
    { ROOM_NAME: 'mirror-audit' });
  const fishBad = [];
  for (const key of ['cooked_fish_minnow', 'cooked_fish_trout', 'cooked_fish_nonesuch']) {
    const srvHeal = room._fishHealAmount(key);
    const cliHeal = clientFishHeal(key);
    if (srvHeal !== cliHeal) fishBad.push({ key, server: srvHeal, client: cliHeal });
  }
  check('fish heal mirrors server<->client, unmapped default included', fishBad.length === 0, fishBad);
  check('...and tier one lands on the owner\'s number', room._fishHealAmount('cooked_fish_minnow') === 100,
    room._fishHealAmount('cooked_fish_minnow'));

  /* createGatherNode is the client half of _harvestXpForTier's base.  Driven
     through the real function rather than by re-typing its formula here: a
     test that recomputes the expression it is checking mirrors the typo too. */
  /* The REAL tier levels off WOODCUTTING_TIERS, not invented ones: forcedTierLvl
     falls back to a depth roll when no tier matches, so [1,2,5] silently
     compared tier one three times — the first cut of this check did exactly
     that and reported a drift that was its own doing. */
  const xpBad = [];
  const seenXp = [];
  for (const lvl of CLIENT_WOOD_TIERS.map((t) => t.lvl)) {
    const node = clientGatherNode('meadow', 'shallow', 0, 0, 'tree', lvl);
    const srvBase = room._harvestXpForTier(lvl, 'ok');   /* 'ok' = 1.0x, the base */
    seenXp.push(node && node.xp);
    if (!node || node.xp !== srvBase) xpBad.push({ lvl, server: srvBase, client: node && node.xp });
  }
  /* GUARD, and not a theoretical one — the first cut of this check swept
     [1, 2, 5] and got tier one back three times: forcedTierLvl silently falls
     back to a depth roll when no tier carries that lvl, so a sweep that looks
     broad can compare the same tier over and over and pass on a mirror that
     has drifted everywhere above the floor.  If the tiers really were swept,
     the client's XP must VARY. */
  check('the tier sweep actually swept distinct tiers (guard)',
    new Set(seenXp).size === CLIENT_WOOD_TIERS.length, seenXp);
  check('harvest XP base mirrors server<->client across tiers', xpBad.length === 0, xpBad);
  check('...and a tier-one harvest pays the retuned 25x base (owner: x5 again)',
    room._harvestXpForTier(1, 'ok') === 163, room._harvestXpForTier(1, 'ok'));
}

// ── 14. Equip-gate mirror (v2.3.1765).  Owner: "Copper counts as rung
// zero."  The worker scores a weapon by its POSITION in the forge table;
// the client scores the same weapon by statReq/2.  Both had to learn that
// the ladder starts at copper, and a one-sided edit is invisible in play
// until a player watches a weapon refuse to stay equipped. ──
{
  const room = new GameRoom(
    { storage: { get: async () => null, put: async () => {}, list: async () => new Map(), delete: async () => {} },
      blockConcurrencyWhile: async (f) => f() },
    { ROOM_NAME: 'mirror-audit-equip' });
  /* Swept across REAL tier keys off both tables rather than a hand-picked
     few — the drift this catches is per-tier. */
  setProg3Enabled(true);
  const metals = Object.keys(SRV.BLACKSMITH_TIERS);
  const woods = Object.keys(SRV.WOODWORKING_TIERS);
  const cases = [];
  for (const k of metals) cases.push({ type: 'greatsword', gearBase: k, slot: 'weapon', tierMult: 1 });
  for (const k of woods) cases.push({ type: 'bow', gearBase: 'ww_' + k, slot: 'rangedWeapon', tierMult: 1 });
  const bad = [];
  /* Every trained level from 0 to 30: agreeing at one level proves nothing,
     since the two formulas could differ by a constant and still match where
     both say yes. */
  for (let lvl = 0; lvl <= 30; lvl += 1) {
    const ps = { prog3: { sk: { sword: { level: lvl }, bow: { level: lvl }, staff: { level: lvl } },
      alloc: {}, atk: {}, pool: {}, ms: {} } };
    const rpg = { prog3: ps.prog3 };
    for (const c of cases) {
      const item = { type: c.type, gearBase: c.gearBase, tierMult: c.tierMult, name: 'x' };
      const srvOk = room._prog3EquipOk(ps, c.slot, item);
      const cliOk = clientCanEquip(rpg, item, c.type);
      if (srvOk !== cliOk) bad.push({ lvl, gearBase: c.gearBase, server: srvOk, client: cliOk });
    }
  }
  check('equip gate agrees server<->client across every tier and level 0-30',
    bad.length === 0, bad.slice(0, 8));
  /* GUARD: the sweep is only meaningful if the gate ever says NO.  If
     prog3Live() or the prog3 branch stopped firing on this fixture, every
     comparison would be true===true and the check above would pass on a
     mirror that had drifted everywhere. */
  const anyRefusal = cases.some((c) => room._prog3EquipOk(
    { prog3: { sk: { sword: { level: 0 }, bow: { level: 0 }, staff: { level: 0 } }, alloc: {}, atk: {}, pool: {}, ms: {} } },
    c.slot, { type: c.type, gearBase: c.gearBase, tierMult: 1, name: 'x' }) === false);
  check('...and the gate does refuse SOMETHING at level 0 (guard: an always-yes gate agrees trivially)',
    anyRefusal === true);
  /* The owner's rule itself, on both sides. */
  const lvl1 = { prog3: { sk: { sword: { level: 1 }, bow: { level: 1 }, staff: { level: 1 } }, alloc: {}, atk: {}, pool: {}, ms: {} } };
  check('copper is rung zero on the CLIENT too (owner\'s call, both sides)',
    clientCanEquip({ prog3: lvl1.prog3 }, { type: 'greatsword', gearBase: 'copper', tierMult: 1 }, 'greatsword') === true);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
