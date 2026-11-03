/* ═══ v2.3.3954: MONSTERS DIE IN PIECES THAT FIT THEM ═══
 *
 * The owner: "Make actual monster death animations", and "Death animation
 * idea label zones for each monster that can apply physics and effects for."
 *
 * The cut deaths (rendering/monsterDeathFx.js, v2.3.2913) guess where a
 * monster's parts are: a neck at 0.28 of the body's height, a hip at 0.68,
 * the same for a snowman, a skeleton and a fire goblin.  This table is where
 * each LOOK's parts really are, labelled by hand from its own frames, and
 * what each part does when the monster dies: the snowman's head rolls, its
 * twig arms fly and its body bursts into snow; a slime splats; a fire goblin
 * drops its torch, crumples and its flame gutters out; a rock monster
 * crumbles; a skeleton's bones scatter; a fishman flops; a thorn shambler
 * splinters; a bog lurker sinks into a puddle.  rendering/monsterDeathZonesFx.js
 * plays them (docs/specs/monster-death-zones.md: the table explained, how the
 * zones were measured, how to add a monster).
 *
 * UNITS.  A zone is in fractions (0..1) of the BODY BOX: the box round the
 * pixels of the frame the monster died on that are at least a quarter
 * opaque (monsterDeathFx coverage(), alpha > 60) -- the same box whatever
 * the frame's padding, so one table serves every frame of a look.  x runs
 * left to right and y top to bottom IN THE PICTURE'S OWN SPACE: a monster
 * facing left is the same picture mirrored, and its pieces are drawn under
 * the same mirror, so its zones mirror with it for free.  An edge at 0 or 1
 * reaches out to the frame's own edge, so a faint pixel outside the box
 * (a spark, a snowflake) still goes with its zone.
 *
 * THE ZONES OF A VIEW TILE THE BOX: every point of it in exactly one zone
 * (server/test/death-zones.test.mjs samples it), so the pieces together are
 * the whole picture, drawn once.  At most MAX_PIECES zones a view.
 *
 * A ZONE:
 *   id      its name, unique in its view
 *   part    what it is: head, torso, base, arms, legs, prop, core
 *   rect    [x0, y0, x1, y1] -- drawn as a piece of the frame itself (a
 *           sub-frame of the same picture: no mask, so it batches)
 *   poly    [[x, y], ...] instead -- a ragged edge (a rock's break, a
 *           slime's tear), drawn through a Graphics mask (TRAPS §221)
 *   mat     what it is made of: snow, goo, flesh, bone, stone, wood, cloth,
 *           flame (its spray, its burst; flame also gutters out)
 *   off     how it comes off:
 *             fly      thrown out from the body's middle, spinning
 *             pop      thrown up, as a head pops off
 *             crumble  drops where it was, a little outward, tumbling
 *             slump    stays and sags flat (every slump zone of a death
 *                      about ONE point under the body, so they sag as one)
 *             hinge    tips over about its foot, like a felled tree
 *             stays    stays put (the snow a snowman stands in)
 *   mass    0.2 (a twig) .. 4 (a boulder): a heavy piece is thrown slower
 *           and spins less
 *   bounce  0 .. 0.9: how much of its fall it bounces back
 *   roll    0 .. 1: how far it rolls once down (a snowman's head: far)
 * and, where it needs one:
 *   dir     -1 | 1, the side it is thrown to in the picture's own space
 *           (default: away from the body's middle; for a hinge, a roll)
 *   push, lift   multiply its sideways and upward speed (default 1)
 *   delay   ms after the opening beat before it goes
 *   squash  slump: how flat it sags (0.45 default; 0.9 nearly flat)
 *   lean    slump: how far it leans over as it sags (radians)
 *   sink    slump: how far into the ground it sinks, in body heights
 *   flop    hinge: how many times it flops once down
 *   fx      the burst it throws, where its material's is not the one
 *           (hitMaterialFx's kinds: snow, goo, bone, stone, wood, leaf, ash,
 *           ember, goblin)
 *
 * A LOOK may also say: blob (a slime-sheet body: the cut deaths treat it as
 * one), puddle (a pool of its colour spreads under it), and a `side` view for
 * when it faces east or west (its `front` view otherwise: north, south and
 * the diagonals).
 *
 * No imports: the server's suites test this in node.
 */

export const DEATH_PARTS = Object.freeze(['head', 'eyes', 'torso', 'base', 'arms', 'legs', 'prop', 'core']);
export const DEATH_MATERIALS = Object.freeze(['snow', 'goo', 'flesh', 'bone', 'stone', 'wood', 'cloth', 'flame']);
export const DEATH_OFFS = Object.freeze(['fly', 'pop', 'crumble', 'slump', 'hinge', 'stays']);
export const DEATH_FX = Object.freeze(['snow', 'goo', 'bone', 'stone', 'wood', 'leaf', 'ash', 'ember', 'goblin']);

/* the caps (the owner's PR: "at most 8 zone-deaths at once and at most 8
   pieces each; beyond that, today's simpler death plays") */
export const MAX_PIECES = 8;
export const MAX_LIVE = 8;
/* the opening beat: a hit-flash and a squash, then the zones part */
export const BEAT_MS = 120;

/* ── the rock monster's break (the thorn shambler wears the same frames) ──
   Five stones off an egg of rock and the dust it stands in, the breaks
   ragged so they read as a fracture and not a grid.  v2.3.3954 (the eyes):
   the crack between the two middle stones runs down between the eyes and
   the cap's break passes over them, so each glowing eye sits wholly inside
   one stone (a zone's `cut` is a hole in it: never across its edge). */
const ROCK_TOP = [[0, 0], [1, 0], [1, 0.3], [0.7, 0.25], [0.5, 0.21], [0.3, 0.25], [0, 0.3]];
const ROCK_MID_L = [[0, 0.3], [0.3, 0.25], [0.5, 0.21], [0.49, 0.34], [0.47, 0.48], [0.52, 0.62], [0, 0.58]];
const ROCK_MID_R = [[0.5, 0.21], [0.7, 0.25], [1, 0.3], [1, 0.6], [0.52, 0.62], [0.47, 0.48], [0.49, 0.34]];
const ROCK_LOW_L = [[0, 0.58], [0.52, 0.62], [0.45, 0.86], [0, 0.84]];
const ROCK_LOW_R = [[0.52, 0.62], [1, 0.6], [1, 0.85], [0.45, 0.86]];
const ROCK_BASE = [[0, 0.84], [0.45, 0.86], [1, 0.85], [1, 1], [0, 1]];
/* its glowing eyes (walk-south: a red glow round (0.38, 0.35) and (0.61, 0.35)) */
const ROCK_EYE_L = [0.31, 0.27, 0.46, 0.42];
const ROCK_EYE_R = [0.53, 0.27, 0.68, 0.42];

/* ── the slime's tear: its crown in two gobs, the rest of it the splat ── */
const SLIME_TOP_L = [[0, 0], [0.5, 0], [0.46, 0.12], [0.53, 0.22], [0.5, 0.31], [0.37, 0.36], [0.25, 0.29], [0.12, 0.35], [0, 0.3]];
const SLIME_TOP_R = [[0.5, 0], [1, 0], [1, 0.32], [0.88, 0.35], [0.75, 0.3], [0.62, 0.37], [0.5, 0.31], [0.53, 0.22], [0.46, 0.12]];
const SLIME_BASE = [[0, 0.3], [0.12, 0.35], [0.25, 0.29], [0.37, 0.36], [0.5, 0.31], [0.62, 0.37], [0.75, 0.3], [0.88, 0.35], [1, 0.32], [1, 1], [0, 1]];

/* the facings a picture shows its face in (the eyes are labelled there) */
const FACE_S = Object.freeze(['south']);
const FACE_S3 = Object.freeze(['south', 'southwest', 'southeast']);
/* the facings drawn from a file that is the front picture mirrored (the
   fishman's and the rock monster's walk-west.png: WALK_MAP west, northwest
   and southwest), where the renderer does no mirroring of its own */
const WEST_FILE = Object.freeze(['west', 'northwest', 'southwest']);

/* An eye: a little piece of its own that pops out and bounces (the owner:
   "premade sections like head, eyes, arms, torso, legs"). */
const eye = (id, rect, mat, dir, more) => Object.assign({ id, part: 'eyes', rect, mat, off: 'pop', big: 'fly', mass: 0.2, bounce: 0.6, roll: 0.5, lift: 0.8, delay: 10 }, dir ? { dir } : null, more || null);

/* Measured from each look's frames (slime-idle-v5; snowman/snowman-s, -n,
   -sw, -e and snowman-hit; fire-goblin walk-s, -n, -sw, -e and hit-s;
   skeleton run-s, -sw, -w; mummy walk-s, -w; fishman and rockmonster
   walk-south): each frame cropped to its body box and laid under a 10% grid
   (the spec, "How the zones were measured"); v2.3.3954's eyes under a 5%
   one, and each look's eye pixels found by colour on every frame of its
   strip (the snowman's and the mummy's red, the goblin's yellow).
   `off` is the ORDINARY death's (the gentler collapse); `big` the off in a
   big one (a crit, an ability, an Element Burst, a special: the explosion),
   where it is not bigOff()'s default. */
export const DEATH_ZONES = {
  /* A slime (and every look drawn on its sheets: the moss and blue slimes,
     the mire wisp): its crown tears off in two gobs of goo that slop off
     its sides -- flung, on a big blow -- and the rest splats flat where it
     sat.  No eyes on its sheets. */
  slime: {
    blob: true,
    bigFx: ['goo'],
    front: [
      { id: 'gobL', part: 'head', poly: SLIME_TOP_L, mat: 'goo', off: 'crumble', big: 'fly', mass: 0.5, bounce: 0.15, roll: 0.1, dir: -1, lift: 1.1 },
      { id: 'gobR', part: 'head', poly: SLIME_TOP_R, mat: 'goo', off: 'crumble', big: 'fly', mass: 0.5, bounce: 0.15, roll: 0.1, dir: 1, lift: 1.1 },
      { id: 'splat', part: 'core', poly: SLIME_BASE, mat: 'goo', off: 'slump', big: 'slump', mass: 2, bounce: 0, roll: 0, squash: 0.7 },
    ],
  },

  /* The snowman: his hat and head pop off and the head ROLLS, his coal eyes
     pop out and bounce, his twig arms drop off (fly, on a big blow), his
     body sags into a heap (bursts, on a big blow), the snow he stands in
     stays.  Front (snowman-s/-n/-sw, the hit strip): the hat 0-0.13 of the
     height over the middle 40%, the head to 0.40, the eyes 0.19-0.275 each
     side of the carrot (snowman-s and -sw: south and the southern
     diagonals; the north has none), an arm each side out past 30% / 70%
     from the top to ~0.6, the body under them, the drift from 0.90. */
  snowman: {
    bigFx: ['snow'],
    front: [
      { id: 'hat', part: 'prop', rect: [0.3, 0, 0.7, 0.13], mat: 'cloth', off: 'pop', mass: 0.4, bounce: 0.25, roll: 0.2, lift: 1.15 },
      { id: 'head', part: 'head', rect: [0.3, 0.13, 0.7, 0.4], cut: ['eyeL', 'eyeR'], mat: 'snow', off: 'pop', mass: 1.2, bounce: 0.3, roll: 0.9, delay: 30 },
      eye('eyeL', [0.38, 0.19, 0.48, 0.275], 'stone', -1, { faces: FACE_S3 }),
      eye('eyeR', [0.5, 0.19, 0.6, 0.275], 'stone', 1, { faces: FACE_S3 }),
      { id: 'armL', part: 'arms', rect: [0, 0, 0.3, 0.62], mat: 'wood', off: 'crumble', big: 'fly', mass: 0.5, bounce: 0.35, roll: 0.1, dir: -1 },
      { id: 'armR', part: 'arms', rect: [0.7, 0, 1, 0.62], mat: 'wood', off: 'crumble', big: 'fly', mass: 0.5, bounce: 0.35, roll: 0.1, dir: 1 },
      { id: 'body', part: 'torso', poly: [[0.3, 0.4], [0.7, 0.4], [0.7, 0.62], [1, 0.62], [1, 0.9], [0, 0.9], [0, 0.62], [0.3, 0.62]], mat: 'snow', off: 'slump', big: 'crumble', mass: 2, bounce: 0.05, roll: 0.1, squash: 0.55, delay: 40 },
      { id: 'drift', part: 'base', rect: [0, 0.9, 1, 1], mat: 'snow', off: 'stays', mass: 4, bounce: 0, roll: 0 },
    ],
    /* side (snowman-e; west is it mirrored): one twig arm reaching forward
       past 72% of the width, the carrot just inside that, the one eye over
       it (0.52-0.575, 0.215-0.265) */
    side: [
      { id: 'hat', part: 'prop', rect: [0, 0, 0.72, 0.16], mat: 'cloth', off: 'pop', mass: 0.4, bounce: 0.25, roll: 0.2, lift: 1.15 },
      { id: 'head', part: 'head', rect: [0, 0.16, 0.72, 0.42], cut: ['eye'], mat: 'snow', off: 'pop', mass: 1.2, bounce: 0.3, roll: 0.9, delay: 30 },
      eye('eye', [0.5, 0.2, 0.6, 0.28], 'stone', 1),
      { id: 'arm', part: 'arms', rect: [0.72, 0, 1, 0.62], mat: 'wood', off: 'crumble', big: 'fly', mass: 0.5, bounce: 0.35, roll: 0.1, dir: 1 },
      { id: 'chest', part: 'torso', rect: [0, 0.42, 0.72, 0.62], mat: 'snow', off: 'crumble', mass: 1.5, bounce: 0.05, roll: 0.15, delay: 40 },
      { id: 'bellyL', part: 'torso', rect: [0, 0.62, 0.5, 0.9], mat: 'snow', off: 'crumble', big: 'crumble', mass: 2, bounce: 0.05, roll: 0.1 },
      { id: 'bellyR', part: 'torso', rect: [0.5, 0.62, 1, 0.9], mat: 'snow', off: 'crumble', big: 'crumble', mass: 2, bounce: 0.05, roll: 0.1 },
      { id: 'drift', part: 'base', rect: [0, 0.9, 1, 1], mat: 'snow', off: 'stays', mass: 4, bounce: 0, roll: 0 },
    ],
  },

  /* The fire goblin: he lets his torch fall (it is in his left hand in every
     direction he is drawn: the left quarter of the box, top to bottom),
     crumples where he stands, his yellow eyes pop (facing you: walk-s,
     0.40-0.455 and 0.615-0.665 across, 0.43-0.51 down, over its frames),
     and the flame of his hair (the top 27%) gutters out.  On a big blow
     the torch is flung, the flame leaps off his head guttering and he
     topples over the way he was hit, in smoke. */
  fireGoblin: {
    bigFx: ['ash'],
    front: [
      { id: 'torch', part: 'prop', rect: [0, 0, 0.25, 1], mat: 'wood', off: 'fly', mass: 3, bounce: 0.2, roll: 0.1, dir: -1, push: 0.55, lift: 0.25, fx: 'ember' },
      { id: 'flame', part: 'head', rect: [0.25, 0, 1, 0.27], mat: 'flame', off: 'slump', big: 'pop', mass: 0.5, bounce: 0, roll: 0, squash: 0.5, lean: 0.45 },
      { id: 'body', part: 'core', rect: [0.25, 0.27, 1, 1], cut: ['eyeL', 'eyeR'], mat: 'flesh', off: 'slump', big: 'hinge', mass: 2, bounce: 0, roll: 0, squash: 0.5, lean: 0.45 },
      eye('eyeL', [0.385, 0.42, 0.47, 0.52], 'flesh', -1, { faces: FACE_S }),
      eye('eyeR', [0.6, 0.42, 0.68, 0.52], 'flesh', 1, { faces: FACE_S }),
    ],
  },

  /* The skeleton (the mummy's second form): on an ordinary kill its bones
     come down in a heap -- the skull pops and rolls, the rest clatters down
     where it stood; on a big blow every bone goes its own way.  Front
     (run-s, -sw): the skull to 0.17 over the middle half, the arms outside
     25% / 75% down to 0.58, the ribs to 0.42, the pelvis to 0.58, then a
     leg each side.  No eyes (its sockets are the skull's). */
  skeleton: {
    bigFx: ['bone'],
    front: [
      { id: 'skull', part: 'head', rect: [0.25, 0, 0.75, 0.17], mat: 'bone', off: 'pop', mass: 0.6, bounce: 0.5, roll: 0.7 },
      { id: 'armL', part: 'arms', rect: [0, 0, 0.25, 0.58], mat: 'bone', off: 'crumble', big: 'fly', mass: 0.4, bounce: 0.5, roll: 0.2, dir: -1 },
      { id: 'armR', part: 'arms', rect: [0.75, 0, 1, 0.58], mat: 'bone', off: 'crumble', big: 'fly', mass: 0.4, bounce: 0.5, roll: 0.2, dir: 1 },
      { id: 'ribs', part: 'torso', rect: [0.25, 0.17, 0.75, 0.42], mat: 'bone', off: 'crumble', mass: 1, bounce: 0.4, roll: 0.3 },
      { id: 'pelvis', part: 'torso', rect: [0.25, 0.42, 0.75, 0.58], mat: 'bone', off: 'crumble', mass: 0.8, bounce: 0.4, roll: 0.3, delay: 20 },
      { id: 'legL', part: 'legs', rect: [0, 0.58, 0.5, 1], mat: 'bone', off: 'crumble', big: 'fly', mass: 0.8, bounce: 0.45, roll: 0.3, dir: -1, push: 0.55, lift: 0.45 },
      { id: 'legR', part: 'legs', rect: [0.5, 0.58, 1, 1], mat: 'bone', off: 'crumble', big: 'fly', mass: 0.8, bounce: 0.45, roll: 0.3, dir: 1, push: 0.55, lift: 0.45 },
    ],
    /* side (run-w; east is it mirrored): running, so the skull is forward
       (the left 45% of the top quarter), the ribs an L behind it, an arm
       each side of them, the legs split at the middle */
    side: [
      { id: 'skull', part: 'head', rect: [0, 0, 0.45, 0.25], mat: 'bone', off: 'pop', mass: 0.6, bounce: 0.5, roll: 0.7 },
      { id: 'armA', part: 'arms', rect: [0, 0.25, 0.33, 0.55], mat: 'bone', off: 'crumble', big: 'fly', mass: 0.4, bounce: 0.5, roll: 0.2, dir: -1 },
      { id: 'ribs', part: 'torso', poly: [[0.45, 0], [0.66, 0], [0.66, 0.55], [0.33, 0.55], [0.33, 0.25], [0.45, 0.25]], mat: 'bone', off: 'crumble', mass: 1, bounce: 0.4, roll: 0.3 },
      { id: 'armB', part: 'arms', rect: [0.66, 0, 1, 0.55], mat: 'bone', off: 'crumble', big: 'fly', mass: 0.4, bounce: 0.5, roll: 0.2, dir: 1 },
      { id: 'legA', part: 'legs', rect: [0, 0.55, 0.5, 1], mat: 'bone', off: 'crumble', big: 'fly', mass: 0.8, bounce: 0.45, roll: 0.3, dir: -1, push: 0.55, lift: 0.45 },
      { id: 'legB', part: 'legs', rect: [0.5, 0.55, 1, 1], mat: 'bone', off: 'crumble', big: 'fly', mass: 0.8, bounce: 0.45, roll: 0.3, dir: 1, push: 0.55, lift: 0.45 },
    ],
  },

  /* The mummy (killed before it sheds into a skeleton): its head pops off,
     its red eyes pop out of the wrappings, its arms fall away trailing
     linen, its middle comes down in a heap of wrappings and its legs give
     way under it (walk-s: the head to 0.2 over the middle 60%, the eyes
     0.385-0.634 across and 0.115-0.146 down over its frames, arms outside
     20% / 80% to 0.6, the legs from 0.6). */
  mummy: {
    bigFx: ['ash'],
    front: [
      { id: 'head', part: 'head', rect: [0.2, 0, 0.8, 0.2], cut: ['eyeL', 'eyeR'], mat: 'cloth', off: 'pop', mass: 0.7, bounce: 0.15, roll: 0.4 },
      eye('eyeL', [0.37, 0.095, 0.49, 0.165], 'flesh', -1, { faces: FACE_S, bounce: 0.5, roll: 0.4 }),
      eye('eyeR', [0.51, 0.095, 0.645, 0.165], 'flesh', 1, { faces: FACE_S, bounce: 0.5, roll: 0.4 }),
      { id: 'armL', part: 'arms', rect: [0, 0, 0.2, 0.6], mat: 'cloth', off: 'crumble', big: 'fly', mass: 0.5, bounce: 0.1, roll: 0.05, dir: -1, push: 0.7, lift: 0.6 },
      { id: 'armR', part: 'arms', rect: [0.8, 0, 1, 0.6], mat: 'cloth', off: 'crumble', big: 'fly', mass: 0.5, bounce: 0.1, roll: 0.05, dir: 1, push: 0.7, lift: 0.6 },
      { id: 'torso', part: 'torso', rect: [0.2, 0.2, 0.8, 0.6], mat: 'cloth', off: 'crumble', mass: 1.5, bounce: 0.05, roll: 0.1, delay: 60 },
      { id: 'legs', part: 'legs', rect: [0, 0.6, 1, 1], mat: 'cloth', off: 'slump', mass: 2, bounce: 0, roll: 0, squash: 0.75 },
    ],
  },

  /* The fishman: one still pose, so one body -- he goes over like a landed
     fish and flops on the ground, wet, and his red eye pops out (walk-south:
     0.30-0.37 across, 0.16-0.24 down; his west file is the same picture
     mirrored, `flip`).  A big blow throws him over harder, in a splash. */
  fishman: {
    flip: WEST_FILE,
    bigFx: ['goo'],
    front: [
      { id: 'body', part: 'core', rect: [0, 0, 1, 1], cut: ['eye'], mat: 'flesh', off: 'hinge', mass: 2, bounce: 0, roll: 0, flop: 3, fx: 'goo' },
      eye('eye', [0.295, 0.16, 0.37, 0.24], 'flesh', 0, { lift: 0.9 }),
    ],
  },

  /* The bog lurker (the fishman's frames, in the bog's colour): it sinks
     into a spreading pool of its own mud, its eye popping free. */
  bogLurker: {
    puddle: true,
    flip: WEST_FILE,
    bigFx: ['goo'],
    front: [
      { id: 'body', part: 'core', rect: [0, 0, 1, 1], cut: ['eye'], mat: 'goo', off: 'slump', big: 'slump', mass: 2, bounce: 0, roll: 0, squash: 0.35, sink: 0.9 },
      eye('eye', [0.295, 0.16, 0.37, 0.24], 'goo', 0, { lift: 0.9 }),
    ],
  },

  /* The rock monster: it crumbles -- five stones off its egg of rock come
     down where they were, the top one last, its two glowing eyes pop out,
     and its dust stays.  On a big blow the stones are thrown. */
  rockmonster: {
    flip: WEST_FILE,
    bigFx: ['stone'],
    front: [
      { id: 'cap', part: 'head', poly: ROCK_TOP, mat: 'stone', off: 'crumble', mass: 3, bounce: 0.15, roll: 0.2, delay: 90 },
      { id: 'midL', part: 'torso', poly: ROCK_MID_L, cut: ['eyeL'], mat: 'stone', off: 'crumble', mass: 3, bounce: 0.15, roll: 0.2, dir: -1, delay: 40 },
      { id: 'midR', part: 'torso', poly: ROCK_MID_R, cut: ['eyeR'], mat: 'stone', off: 'crumble', mass: 3, bounce: 0.15, roll: 0.2, dir: 1, delay: 40 },
      eye('eyeL', ROCK_EYE_L, 'stone', -1, { fx: 'ember', mass: 0.3, bounce: 0.4, roll: 0.3 }),
      eye('eyeR', ROCK_EYE_R, 'stone', 1, { fx: 'ember', mass: 0.3, bounce: 0.4, roll: 0.3 }),
      { id: 'lowL', part: 'torso', poly: ROCK_LOW_L, mat: 'stone', off: 'crumble', mass: 4, bounce: 0.1, roll: 0.1, dir: -1 },
      { id: 'lowR', part: 'torso', poly: ROCK_LOW_R, mat: 'stone', off: 'crumble', mass: 4, bounce: 0.1, roll: 0.1, dir: 1 },
      { id: 'dust', part: 'base', poly: ROCK_BASE, mat: 'stone', off: 'stays', mass: 4, bounce: 0, roll: 0 },
    ],
  },

  /* The thorn shambler (the rock monster's frames, mossed over): it
     splinters -- the same breaks, but wood and thorn, its eyes popping,
     thrown in leaves on a big blow. */
  thornShambler: {
    flip: WEST_FILE,
    bigFx: ['leaf', 'wood'],
    front: [
      { id: 'crown', part: 'head', poly: ROCK_TOP, mat: 'wood', off: 'crumble', big: 'fly', mass: 1.2, bounce: 0.25, roll: 0.2, lift: 1.2, fx: 'leaf' },
      { id: 'midL', part: 'torso', poly: ROCK_MID_L, cut: ['eyeL'], mat: 'wood', off: 'crumble', big: 'fly', mass: 1.2, bounce: 0.25, roll: 0.2, dir: -1, delay: 30 },
      { id: 'midR', part: 'torso', poly: ROCK_MID_R, cut: ['eyeR'], mat: 'wood', off: 'crumble', big: 'fly', mass: 1.2, bounce: 0.25, roll: 0.2, dir: 1, delay: 30, fx: 'leaf' },
      eye('eyeL', ROCK_EYE_L, 'wood', -1, { mass: 0.3, bounce: 0.4, roll: 0.3 }),
      eye('eyeR', ROCK_EYE_R, 'wood', 1, { mass: 0.3, bounce: 0.4, roll: 0.3 }),
      { id: 'lowL', part: 'legs', poly: ROCK_LOW_L, mat: 'wood', off: 'crumble', mass: 2, bounce: 0.2, roll: 0.15, dir: -1, delay: 60 },
      { id: 'lowR', part: 'legs', poly: ROCK_LOW_R, mat: 'wood', off: 'crumble', mass: 2, bounce: 0.2, roll: 0.15, dir: 1, delay: 60 },
      { id: 'roots', part: 'base', poly: ROCK_BASE, mat: 'wood', off: 'stays', mass: 4, bounce: 0, roll: 0 },
    ],
  },
};

/* the looks drawn from another's frames, and so cut by its zones */
export const DEATH_ZONE_ALIAS = Object.freeze({
  fodder: 'slime', mossSlime: 'slime', blueSlime: 'slime', mireWisp: 'slime',
});

/** The zone table of a look (a variant key, the snowman, or a slime's
 *  'fodder'), or null: a look without one dies today's way. */
export function deathZoneLook(key) {
  if (!key) return null;
  const k = Object.prototype.hasOwnProperty.call(DEATH_ZONE_ALIAS, key) ? DEATH_ZONE_ALIAS[key] : key;
  return Object.prototype.hasOwnProperty.call(DEATH_ZONES, k) ? DEATH_ZONES[k] : null;
}

/** Which view a look is cut by, facing `facing` (entityRenderer's
 *  SECTORS name: 'east', 'southwest', ...): its side view east and west,
 *  where it has one, else its front. */
export function deathZoneView(look, facing) {
  if (!look) return null;
  return (look.side && (facing === 'east' || facing === 'west')) ? 'side' : 'front';
}

/* entityRenderer's SECTORS: the facings a monster is drawn in */
export const DEATH_FACINGS = Object.freeze(['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast']);

function shapeHas(z, x, y) {
  if (z.rect) return x >= z.rect[0] && x < z.rect[2] && y >= z.rect[1] && y < z.rect[3];
  return inPoly(x, y, z.poly || []);
}
const mirrorZone = (z) => Object.assign({}, z, z.rect ? { rect: [1 - z.rect[2], z.rect[1], 1 - z.rect[0], z.rect[3]] } : { poly: z.poly.map((p) => [1 - p[0], p[1]]) },
  z.dir ? { dir: -z.dir } : null);

/* v2.3.3954: a view as it is facing `facing` -- the zones seen that way
   (an eye only where the picture shows the face: `faces`), each `cut` (a
   hole: the eyes in a head) only of the zones that are there, and mirrored
   where the facing is drawn from a mirrored file (`flip`).  Made once a look
   and facing (no allocation per death). */
const _resolved = new Map();
function resolveView(lookKey, look, view, facing) {
  const ck = `${lookKey}|${view}|${facing}`;
  const hit = _resolved.get(ck);
  if (hit) return hit;
  const raw = look[view] || null;
  if (!raw) return null;
  const flip = !!(look.flip && look.flip.indexOf(facing) >= 0);
  let zs = raw.filter((z) => !z.faces || z.faces.indexOf(facing) >= 0).map((z) => (flip ? mirrorZone(z) : Object.assign({}, z)));
  const byId = Object.create(null);
  for (const z of zs) byId[z.id] = z;
  for (const z of zs) {
    const cuts = (z.cut || []).filter((id) => byId[id]);
    if (cuts.length) { z.cut = cuts; z.cutZones = cuts.map((id) => byId[id]); } else { delete z.cut; delete z.cutZones; }
  }
  zs = Object.freeze(zs.map((z) => Object.freeze(z)));
  _resolved.set(ck, zs);
  return zs;
}

/** The zones a dying `key` facing `facing` comes apart in, or null (v2.3.3954:
 *  resolved for that facing: its eyes where its face shows, mirrored where
 *  its file is). */
export function deathZonesFor(key, facing) {
  const look = deathZoneLook(key);
  if (!look) return null;
  const k = Object.prototype.hasOwnProperty.call(DEATH_ZONE_ALIAS, key) ? DEATH_ZONE_ALIAS[key] : key;
  return resolveView(k, look, deathZoneView(look, facing), DEATH_FACINGS.indexOf(facing) >= 0 ? facing : 'south');
}

/* ═══ v2.3.3954: ORDINARY OR BIG ═══
   The owner: "Death animations are just fun part of the game loop".  An
   ordinary kill is the gentler collapse (each zone's own `off`); a big
   finishing blow (a crit, an ability, an Element Burst, a special or a
   charged shot: game/deathBlow.js) is the explosion -- every zone that can
   move goes, its own `big` where it names one, else: what crumbles is
   thrown, a light sagging piece is thrown and a heavy one topples over (the
   way it was hit), and the rest as it was. */
export function bigOff(z) {
  if (z.big) return z.big;
  switch (z.off) {
    case 'crumble': return 'fly';
    case 'slump': return (z.mass || 1) >= 2 ? 'hinge' : 'fly';
    default: return z.off;
  }
}
/** How a zone comes off in an ordinary (`big` false) or a big death. */
export function zoneOff(z, big) { return big ? bigOff(z) : z.off; }
/** How many of `zones` are thrown (fly or pop) -- the unit test's count. */
export function thrownCount(zones, big) {
  let n = 0;
  for (const z of zones || []) { const o = zoneOff(z, big); if (o === 'fly' || o === 'pop') n++; }
  return n;
}

/** A zone's box, [x0, y0, x1, y1], whichever shape it is (its outline: a
 *  cut out of it is still inside the box). */
export function zoneBox(z) {
  if (z.rect) return z.rect.slice();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of z.poly || []) {
    if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
  }
  return [x0, y0, x1, y1];
}

/** Where the cut deaths should cut a look that has zones, instead of
 *  guessing: the neck is the bottom of its head zones (its `head` part), the
 *  hip the top of its legs (fractions of the body box), each null when the
 *  look has no such part.  A blob's "neck" stays its own (no head to lose). */
export function deathCutLines(key, facing) {
  const zs = deathZonesFor(key, facing);
  if (!zs) return { neck: null, hip: null };
  let neck = null, hip = null;
  for (const z of zs) {
    const b = zoneBox(z);
    if (z.part === 'head' && z.off !== 'slump') neck = neck == null ? b[3] : Math.max(neck, b[3]);
    if (z.part === 'legs') hip = hip == null ? b[1] : Math.min(hip, b[1]);
  }
  const look = deathZoneLook(key);
  if (look && look.blob) neck = null;
  return { neck, hip };
}

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
/** Is the point (box fractions) inside the zone (and not in a hole cut out
 *  of it)? */
export function zoneHas(z, x, y) {
  if (!shapeHas(z, x, y)) return false;
  for (const c of z.cutZones || []) if (shapeHas(c, x, y)) return false;
  return true;
}

/** Everything wrong with the table, as words (empty: nothing).  The unit
 *  test's; `n` samples a side when checking that a view tiles its box --
 *  every facing's view, as it is resolved for that facing. */
export function checkDeathZones(n = 64) {
  const out = [];
  const num = (v) => typeof v === 'number' && isFinite(v);
  for (const [key, look] of Object.entries(DEATH_ZONES)) {
    if (!look.front) out.push(`${key}: no front view`);
    for (const f of look.flip || []) if (DEATH_FACINGS.indexOf(f) < 0) out.push(`${key}: flip facing ${f}`);
    for (const k of look.bigFx || []) if (DEATH_FX.indexOf(k) < 0) out.push(`${key}: bigFx ${k}`);
    for (const view of ['front', 'side']) {
      const zs = look[view];
      if (!zs) continue;
      const where = `${key}.${view}`;
      if (!Array.isArray(zs) || !zs.length) { out.push(`${where}: no zones`); continue; }
      const ids = new Set();
      for (const z of zs) {
        const w = `${where}.${z.id}`;
        if (!z.id || ids.has(z.id)) out.push(`${w}: id missing or repeated`);
        ids.add(z.id);
        if (DEATH_PARTS.indexOf(z.part) < 0) out.push(`${w}: part ${z.part}`);
        if (DEATH_MATERIALS.indexOf(z.mat) < 0) out.push(`${w}: material ${z.mat}`);
        if (DEATH_OFFS.indexOf(z.off) < 0) out.push(`${w}: off ${z.off}`);
        if (z.big != null && DEATH_OFFS.indexOf(z.big) < 0) out.push(`${w}: big ${z.big}`);
        if (z.fx != null && DEATH_FX.indexOf(z.fx) < 0) out.push(`${w}: fx ${z.fx}`);
        if (!num(z.mass) || z.mass < 0.2 || z.mass > 4) out.push(`${w}: mass ${z.mass}`);
        if (!num(z.bounce) || z.bounce < 0 || z.bounce > 0.9) out.push(`${w}: bounce ${z.bounce}`);
        if (!num(z.roll) || z.roll < 0 || z.roll > 1) out.push(`${w}: roll ${z.roll}`);
        if (z.dir != null && z.dir !== -1 && z.dir !== 1) out.push(`${w}: dir ${z.dir}`);
        if (z.faces != null && (!Array.isArray(z.faces) || !z.faces.length || z.faces.some((f) => DEATH_FACINGS.indexOf(f) < 0))) out.push(`${w}: faces ${z.faces}`);
        if (!!z.rect === !!z.poly) out.push(`${w}: a rect or a poly, exactly one`);
        const pts = z.rect ? [[z.rect[0], z.rect[1]], [z.rect[2], z.rect[3]]] : (z.poly || []);
        if (z.poly && z.poly.length < 3) out.push(`${w}: a poly of ${z.poly.length} points`);
        for (const p of pts) if (!num(p[0]) || !num(p[1]) || p[0] < 0 || p[0] > 1 || p[1] < 0 || p[1] > 1) out.push(`${w}: point ${p} outside 0..1`);
        if (z.rect && !(z.rect[2] > z.rect[0] && z.rect[3] > z.rect[1])) out.push(`${w}: empty rect`);
      }
      for (const z of zs) for (const id of z.cut || []) {
        const c = zs.find((q) => q.id === id);
        if (!c || c === z) { out.push(`${where}.${z.id}: cut ${id} is no zone of the view`); continue; }
        /* a hole sits wholly inside its zone's outline, clear of its edge
           (a Graphics hole across an edge triangulates into garbage) */
        const b = zoneBox(c), m = 0.004;
        let outside = 0;
        for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
          const x = b[0] + m + (b[2] - b[0] - 2 * m) * i / 8, y = b[1] + m + (b[3] - b[1] - 2 * m) * j / 8;
          if (shapeHas(c, x, y) && !shapeHas(z, x, y)) outside++;
        }
        if (outside) out.push(`${where}.${z.id}: its hole ${id} reaches out of it`);
      }
      /* each facing this view is used for: at most MAX_PIECES zones, and
         every sample point of the box in exactly one zone */
      for (const facing of DEATH_FACINGS) {
        if (deathZoneView(look, facing) !== view) continue;
        const rz = resolveView(key, look, view, facing);
        const fw = `${where}@${facing}`;
        if (rz.length > MAX_PIECES) out.push(`${fw}: ${rz.length} zones, more than ${MAX_PIECES}`);
        let none = 0, many = 0;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const x = (i + 0.5) / n, y = (j + 0.5) / n;
            let k = 0;
            for (const z of rz) if (zoneHas(z, x, y)) k++;
            if (k === 0) none++; else if (k > 1) many++;
          }
        }
        if (none) out.push(`${fw}: ${none} of ${n * n} points in no zone`);
        if (many) out.push(`${fw}: ${many} of ${n * n} points in more than one zone`);
      }
    }
  }
  for (const [a, b] of Object.entries(DEATH_ZONE_ALIAS)) if (!DEATH_ZONES[b]) out.push(`alias ${a}: no look ${b}`);
  return out;
}
