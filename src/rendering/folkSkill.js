/* ═══ v2.3.5462: A TOWNSPERSON AT HIS OWN WORK, FROM THE COLOUR NUMBERS ═══
 *
 * The owner, 2026-11-14: "make sure all NPCs do things that match their
 * characters. Like chef blaze should cook, not hammer like an anvil" (card TF,
 * docs/specs/townsfolk-work.md).  Chef Blaze cooks, Woodworker Bro chops and
 * Farmer Bro hoes, waters and kneels in the player's own skill figures -- the
 * cook's crouch with his pan, the lumberjack's swing with his axe, the
 * farmer's three moves with his hoe and can -- drawn the way another player's
 * are (effectsRenderer _updateRemoteExtraction, _drawPeerFarmer): the figure,
 * his tee over it, his head at the figure's crown.  But not baked as theirs
 * are (a recoloured copy of the strip per look, 1 to 5 MB each,
 * effectsRenderer PEER_FIG_EST): each figure is kept ONCE as colour numbers
 * (lookSets/skills.js, public/sprites/look/skills/, made offline by
 * tools/art/role-bake.mjs --set skills) and his colours are a row of the look
 * palette, as his walking body is (rendering/lookPalette.js).  So:
 *   - THE MEMORY: the `skills` set, about 2.7 MB of numbers on a phone's
 *     graphics chip, loaded behind the loading screen with the other look
 *     sets (registerLookSheets, below; PRELOADING IS LAW), and nothing on a
 *     computer, which draws the townsfolk's photographs (no look palette:
 *     lookPaletteChoice.js).  No bake in play: his tee is the `gear` set's
 *     strip in its colour (gearLookFrame.js, loaded already), his head the
 *     shared pieces every player wears.
 *   - THE SWITCH: `?folkwork=0` stands him at his stops, as every work pose
 *     (folkPose.js), and loads none of this set: that phone holds none of its
 *     memory.  `?lookpalette=0`, a set not in, or a part not read: he stands
 *     where he would have worked.
 *   - THE HEAD: the figure's crown, frame by frame: the cook's and the
 *     lumberjack's copied from crowns.json (below: nothing to load, so
 *     nothing to wait for or to fail; townsfolk-walk.test 6 holds the copy to
 *     the file), the farmer's from his strips' own table (data/farmAnims.js).
 *     His pieces are placed by entityRenderer's placeSkillTraitsFor, handed
 *     in (this module is imported by that one: no cycle).
 *   - THE PLACE: his boots on his spot (the figure's own boot point), at his
 *     size against a player's (Lil Bro's 0.8, the Mayor's 1.1), the figure's
 *     height a player's as the stand-ins are matched (COOK_STANDIN_H,
 *     CHOP_STANDIN_H, FARM_ANIM_HEAD_WORLD: copied here, held to effectsRenderer
 *     by townsfolk-walk.test 6, as this module cannot import that one).
 * The sprites are a container of his display's (drawFolkSkill): entityRenderer
 * _drawFolk asks for it, and keeps only the hooks (its file is at its line:
 * tools/guards/lib/fourLines.mjs). */
import { registerLookSheets, getLookPartFrame, lookHas, lookPaletteOn, lookPaletteWanted, lookPose } from './lookPalette.js';
import { gearStripFrames } from './gearLookFrame.js';
import { skinTarget, pantsTarget, shoesTarget, DEFAULT_SKIN_TARGET } from './playerSkins.js';
import { FARM_ANIMS, FARM_ANIM_HEAD } from '@/data/farmAnims.js';
import { FARM_ANIM_HEAD_WORLD } from '@/data/farmLayout.js';
import { FARM_ANIM_TURN } from '@/game/farmWork.js';
import { folkBeatOf } from '@/game/townsfolkWalk.js';
import { Container, Sprite, Texture } from 'pixi.js';
import { shirtFill } from './traits/shirtColorCatalog.js';

/* `?folkwork=0` (folkPose.js's switch, read the same way): no work poses on
   this phone, so none of these figures is loaded either.  `?folkskills=0`
   (v2.3.5462, its row in tools/guards/lib/switches.mjs): these figures alone
   off, none of the set loaded, and the three back in card TF PR 1's poses
   (FOLK_SKILL_FALLBACK) */
const _workOff = (() => { try { return /(^|[?&])folkwork=0(&|$)/.test(window.location.search || ''); } catch (e) { return false; } })();
const _skillsOff = (() => { try { return /(^|[?&])folkskills=0(&|$)/.test(window.location.search || ''); } catch (e) { return false; } })();
const _off = _workOff || _skillsOff;
const _reg = (!_off && lookPaletteWanted()) ? registerLookSheets('skills', '/sprites/look/skills/roles.json') : Promise.resolve(false);

/* effectsRenderer's numbers (held to it by townsfolk-walk.test 6) */
export const FOLK_COOK_H = 73.9;    /* COOK_STANDIN_H: the crouching cook, world px */
export const FOLK_CHOP_H = 136.8;   /* CHOP_STANDIN_H: the lumberjack */
/* the head's size against a walking body's (effectsRenderer _skillTraitMul):
   the cook's head is 85 art px to the walking 51, the lumberjack's 46, the
   farmer's FARM_ANIM_HEAD */
const TRAIT_MUL = { cook: 1.65, chop: 0.91, farm: FARM_ANIM_HEAD / 51 };

/* pose -> how he is drawn in it */
const SPEC = Object.freeze({
  cook: Object.freeze({ sheet: 'cook-south', prop: null, fw: 213, fh: 220, n: 24, ms: 60,
  /* his boots, frame px: measured off the strip (every frame's soles on its
     last row, their middle at x 49.5 -- the pan reaches out to his right) */
  foot: [49.5, 220], scale: FOLK_COOK_H / 220, traitDir: 'south', traitMul: TRAIT_MUL.cook,
  crownKey: 'cook', gearPose: 'cook', gearDir: 'south',
  /* the tee pinned to one frame, as another player's is (effectsRenderer
     _shirtIx: the 24 tee frames are 24 different garments -- the owner's
     "flashing shirt", v2.3.1710) */
  shirtAt: () => 22 }),
  chop: Object.freeze({ sheet: 'chop-west', prop: null, fw: 240, fh: 220, n: 12, ms: 45,
  /* the twelve played frames (12-23 of the strip); his boots at the frame's
     middle, as the lumberjack is placed (anchor 0.5, 1) */
  foot: [120, 220], scale: FOLK_CHOP_H / 220, traitDir: 'east', traitMul: TRAIT_MUL.chop,
  crownKey: 'chop', gearPose: 'chop', gearDir: 'west', shirtAt: (fi) => fi }),
  /* the farmer's three, from his strips' own table */
  ...Object.fromEntries(Object.keys(FARM_ANIMS).map((a) => {
    const A = FARM_ANIMS[a];
    return [A.pose, Object.freeze({ sheet: `${A.pose}-south`, prop: A.prop ? `${A.pose}-prop-south` : null, fw: A.fw, fh: A.fh, n: A.n,
      turn: FARM_ANIM_TURN[a], foot: A.foot, scale: FARM_ANIM_HEAD_WORLD / FARM_ANIM_HEAD, traitDir: 'south', traitMul: TRAIT_MUL.farm,
      crowns: A.crowns, gearPose: A.pose, gearDir: 'south', shirtAt: (fi) => fi })];
  })),
});
/* ═══ WHEN HIS TRADE'S FIGURE IS NOT DRAWN ═══
   (`?folkskills=0`, or a part not in): card TF PR 1's pose -- the cook and
   the woodworker the pickup, the farmer standing (the pickup's sheet blanks
   his wide eyes: a bake of his look).  townsfolk-walk.test 2j and 2k hold
   these as they hold every job. */
const FOLK_SKILL_FALLBACK = Object.freeze({ cook: 'pickup', chop: 'pickup', farmhoe: null, farmwater: null, farmkneel: null });
/** The body pose he works in when his trade's figure is not drawn, or null
 *  (he stands): only one the look palette has in numbers (folkPose.js's rule). */
export function folkSkillFallback(pose) {
  const f = isFolkSkill(pose) ? FOLK_SKILL_FALLBACK[pose] : null;
  return f && lookPose(f) ? f : null;
}

/** The skill figures a townsperson can work in. */
export const FOLK_SKILL_POSES = Object.freeze(Object.keys(SPEC));
export function isFolkSkill(pose) { return typeof pose === 'string' && Object.prototype.hasOwnProperty.call(SPEC, pose); }
export function folkSkillSpec(pose) { return isFolkSkill(pose) ? SPEC[pose] : null; }

/* ── the crowns of the cook and the lumberjack: public/sprites/skills/
   crowns.json's, frame px (the lumberjack's twelve played frames, 12-23),
   copied (townsfolk-walk.test 6 holds them to the file) ── */
const CROWNS = {
  cook: Array(24).fill([84, 5]),
  chop: [[106, 53], [108, 57], [108, 57], [109, 60], [108, 60], [110, 53], [108, 52], [110, 52], [111, 52], [114, 52], [116, 52], [117, 52]],
};
/** Behind the world's loading screen (entityRenderer prewarmFolkBodies): the
 *  set in.  Resolves whatever happens: a figure whose part is missing is not
 *  drawn (he stands). */
export function folkSkillPrepare() {
  if (_off || !lookPaletteWanted()) return Promise.resolve(false);
  return _reg.then((r) => !!r, () => false);
}

/** His figure's head, frame px, at frame `fi` of the pose (null: not known). */
export function folkSkillCrown(pose, fi) {
  const s = SPEC[pose];
  if (!s) return null;
  const list = s.crowns || CROWNS[s.crownKey];
  if (!list || !list.length) return null;
  return list[Math.min(list.length - 1, Math.max(0, fi))] || null;
}

/** The frame at `t` ms of his own beat: the cook's stir and the lumberjack's
 *  swing at the player's pace, the farmer's moves turn by turn (farmWork.js
 *  FARM_ANIM_TURN), round and round. */
export function folkSkillFrame(pose, t) {
  const s = SPEC[pose];
  if (!s) return 0;
  const tt = t > 0 ? t : 0;
  if (s.turn) {
    let total = 0;
    for (const f of s.turn) total += f;
    let u = tt % total;
    for (let f = 0; f < s.turn.length; f++) { if (u < s.turn[f]) return f; u -= s.turn[f]; }
    return s.turn.length - 1;
  }
  return Math.floor(tt / s.ms) % s.n;
}

/* his colours as the stand-ins' row takes them (effectsRenderer _standInLook):
   the skin always (the strips are painted another orange), his trousers, his
   boots */
function entriesOf(look) {
  return [[1, skinTarget(look.skin) || DEFAULT_SKIN_TARGET], [2, pantsTarget(look.pants)], [3, shoesTarget(look.shoes)]];
}
const wearsTee = (look) => !!(look && look.equip && look.equip.shirt && look.equip.shirt !== 'none');

/** Can he be drawn in this figure now: the switch, the look palette on, the
 *  figure's numbers in, its crowns read, and (in a tee) his tee's strip in the
 *  numbers.  Else he stands where he would have worked. */
export function folkSkillReady(pose, look) {
  const s = SPEC[pose];
  if (!s || _off || !look || !lookPaletteOn() || !lookHas('skills', s.sheet)) return false;
  if (s.prop && !lookHas('skills', s.prop)) return false;
  if (!folkSkillCrown(pose, 0)) return false;
  if (wearsTee(look) && !Array.isArray(gearStripFrames('shirt', 'tshirt', s.gearPose, s.gearDir))) return false;
  return true;
}

/** Frame `fi`'s pictures in his colours: { body, prop, shirt } (each a
 *  texture or null; `shirt` untinted -- the caller tints it his tee's colour). */
export function folkSkillTextures(pose, look, fi) {
  const s = SPEC[pose];
  if (!s || !look) return null;
  const e = entriesOf(look);
  const body = getLookPartFrame('skills', s.sheet, fi, e);
  const prop = s.prop ? getLookPartFrame('skills', s.prop, fi, e) : null;
  let shirt = null;
  if (wearsTee(look)) {
    const list = gearStripFrames('shirt', 'tshirt', s.gearPose, s.gearDir);
    if (Array.isArray(list) && list.length) shirt = list[Math.min(list.length - 1, s.shirtAt(fi))] || null;
  }
  return { body, prop, shirt };
}

/* ═══ THE FIGURE, IN HIS DISPLAY ═══
   Drawn as another player's is (effectsRenderer _updateRemoteExtraction,
   _drawPeerFarmer): the body in his colours, his tee over it in its colour
   (no print, as at any work), the farmer's tool over that, his head's pieces
   last (FARM_PEER_LAYERS; the gathering figures' trait set) -- in a
   container of his display's own, behind his bars and labels as his walking
   figure is, which is hidden while this is up.  `size` his against a
   player's (entityRenderer _drawFolk's); `placeTraits` is entityRenderer's
   placeSkillTraitsFor.  False when a part is not in: he stands instead. */
function miss(display, why) {
  display._folkSkillMiss = why;
  display._folkSkillMisses = (display._folkSkillMisses || 0) + 1;
  return false;
}
export function drawFolkSkill(display, npc, look, pose, now, size, placeTraits) {
  if (_off) return false;   /* switched off: PR 1's pose, not a miss */
  if (!folkSkillReady(pose, look)) return miss(display, 'ready');
  const spec = SPEC[pose];
  if (display._folkBeat == null) display._folkBeat = folkBeatOf(npc.id);
  const fi = folkSkillFrame(pose, now + display._folkBeat);
  const tex = folkSkillTextures(pose, look, fi);
  const cr = folkSkillCrown(pose, fi);
  if (!tex || !tex.body) return miss(display, 'body');
  if (!cr) return miss(display, 'crown');
  let F = display._folkSkill;
  if (!F) {
    F = new Container();
    F.label = 'npc_folk_skill';
    const mk = (anchored) => { const sp = new Sprite(Texture.EMPTY); if (anchored) sp.anchor.set(0.5, 1); sp.visible = false; F.addChild(sp); return sp; };
    F._body = mk(true); F._shirt = mk(true); F._prop = mk(true);
    F._traits = { hair: mk(false), beard: mk(false), species: mk(false), eyestyle: mk(false), eyewear: mk(false), hat: mk(false) };
    display.addChildAt(F, 0);
    display._folkSkill = F;
  }
  const k = spec.scale * size;
  const body = F._body;
  if (body.texture !== tex.body) body.texture = tex.body;
  body.scale.set(k, k);
  /* his boots (the figure's own boot point) on his spot */
  body.x = -(spec.foot[0] - spec.fw / 2) * k;
  body.y = (spec.fh - spec.foot[1]) * k;
  body.visible = true;
  const place = (sp, t) => {
    if (!t) { if (sp.visible) sp.visible = false; return; }
    if (sp.texture !== t) sp.texture = t;
    sp.scale.set(k, k); sp.x = body.x; sp.y = body.y;
    if (!sp.visible) sp.visible = true;
  };
  place(F._shirt, tex.shirt);
  if (tex.shirt) {
    const t = shirtFill(look.shirt || 'tshirt', look.shirtColor);
    F._shirt.tint = t ? ((t[0] << 16) | (t[1] << 8) | t[2]) : 0xffffff;
  }
  place(F._prop, tex.prop);
  /* his head at the figure's crown (effectsRenderer _placeSkillTraitsOnFor's
     arithmetic), his own hat nudge with it (Farmer Bro's bucket hat down on
     his brow, as his walking figure wears it: npcLooks hatDy256) */
  const cwx = body.x + (cr[0] - spec.fw / 2) * k;
  const cwy = body.y + (cr[1] - spec.fh) * k;
  placeTraits(F._traits, {
    hair: look.hair, hairColor: look.hairColor,
    facialhair: look.facialhair, facialHairColor: look.facialHairColor,
    eyewear: look.eyewear, eyewearColor: look.eyewearColor,
    eyeStyle: look.eyeStyle, eyeColor: look.eyeColor,
    species: look.species, skin: look.skin,
    headwear: look.headwear, hatColor: look.hatColor, hatDy256: look.hatDy256 || 0,
  }, cwx, cwy, spec.traitDir, false, k * spec.traitMul);
  if (!F.visible) F.visible = true;
  const folk = display._folk;
  if (folk) {
    if (folk.visible) folk.visible = false;
    folk._animPose = pose; folk._animDir = 'south'; folk._animFrame = fi;   /* the probe's (mp-folkwork) */
  }
  display._walkIdx = fi;
  display._folkSkillAt = { pose, frame: fi, look: !!tex.body._btLook, shirt: !!tex.shirt, prop: !!tex.prop,
    height: Math.round(spec.fh * k), crown: [Math.round(cwx), Math.round(cwy)] };
  return true;
}
/** Not at his trade this frame: the figure put away (a visible changed only
 *  when it was up: TRAPS §218). */
export function hideFolkSkill(display) {
  if (display && display._folkSkill && display._folkSkill.visible) display._folkSkill.visible = false;
}
/** Past the view, his figures go (v2.3.3809's rule): this one with them. */
export function dropFolkSkill(display) {
  if (!display || !display._folkSkill) return;
  display.removeChild(display._folkSkill);
  display._folkSkill.destroy({ children: true });
  display._folkSkill = null;
}
/** The probe's (entityRenderer __btNpcSprites `skill`): which figure of his
 *  is on the screen, and his trade's while it is. */
export function folkSkillProbe(display, live) {
  if (!live) return { shown: 'photo' };
  const up = !!(display._folkSkill && display._folkSkill.visible);
  return { shown: up ? 'skill' : (display._folk && display._folk.visible ? 'figure' : 'none'),
    ...(up ? display._folkSkillAt : {}), misses: display._folkSkillMisses || 0, miss: display._folkSkillMiss || null };
}

if (typeof window !== 'undefined') {
  /* QA (mp-folkwork): is this phone drawing them, and which parts are in */
  window.__btFolkSkill = () => ({ off: _off, skillsOff: _skillsOff, on: lookPaletteOn(),
    sheets: FOLK_SKILL_POSES.map((p) => [p, lookHas('skills', SPEC[p].sheet)]) });
}
