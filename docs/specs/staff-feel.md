# The staff's feel: gathering power and blasting the orb (v2.3.4803)

> The owner, 2026-11-11: *"Instead of just copying what other games do I want
> to think about the 'feel' of the combat. Think about the sword swing. The
> bow pull back and release. The staff building power and blasting the
> orb."* Approving the design: *"Yes remove the timing bar ... and yes but
> build all of them (sword, bow, magic)."* Of magic's timing window: *"For
> magic I think it should be skipped for now."*

The staff is the third weapon of the feel rebuild. The sword went first
(`docs/specs/sword-feel.md`, which also has the shared kit's API); the
worker's half of the staff's gather is `server/src/drawgather.js`
(`docs/specs/manual-combat.md`, "The bow's draw and the staff's gather").
This page is the phone's half.

## What a player feels

Every attack has four beats: **touch**, **build**, **release**, **contact**.

### Touch: thumb down starts gathering

- The moment the thumb lands on the right side (or the attack disc, or the
  left mouse button on a computer), the staff starts gathering: a **spark**
  lights at its crystal, its first note sounds, specks of light start being
  pulled into the crystal, and a **low hum** begins.
- **The bro plants his feet**: while gathering he walks at 0.55 of his pace.
  (Slower is always inside the worker's move bound; nothing is asked of it.)

### Build: spark, orb, sphere

- The orb grows in **three clear stages**, each landing with a pulse at the
  crystal (a ring that swells and fades) and a **deeper note**, and the orb
  swelling a moment past its new size:

  | stage | from (share of a full gather) | a new character | the bolt |
  |---|---|---|---|
  | spark | the touch | 0 ms | small, quick (1.5x the staff's speed), no splash |
  | orb | 0.4 | 360 ms | today's bolt size and speed, 0.6 of its splash, a small ring of force |
  | sphere | 0.8 | 720 ms | big, heavy and slow (0.7x the speed, its reach kept), today's full splash, the full ring of force |

- The thresholds are the **worker's** (`src/game/drawGather.js`
  `gatherStage`): the stage you see is the stage it judges. A full gather is
  the held staff's own cycle, 900 ms on a new character (faster with the
  Speed stat and a storm amulet).
- The hum rises an octave as the gather fills. Held past full, nothing more
  happens: **no timing window** (the owner). The skill is when to commit.
- **Drag while gathering to aim**: the orb at the crystal leans toward where
  it will go. On the right side the drag aims as the stick always did; on the
  attack disc the drag from where the thumb touched aims. A still press goes
  the way the bro faces. On a computer, the cursor aims.

### Release: lift to blast

- Lifting the thumb (or the mouse button) **blasts the orb** at once:
  - a **spark** snaps away with a little puff of air;
  - an **orb** or a **sphere**: the air swells inward a split second, then a
    boom (deeper and longer for a sphere, with a crack); a flash runs along
    its way; the staff kicks (harder for a sphere), and **the bro is pushed
    back a step**. That push is a LOOK only: his figure is drawn back a few
    pixels for a quarter of a second; his place never moves (nothing for the
    worker to judge, TRAPS §231).
- **Quick taps fire small fast sparks.** Each is worth its share of a full
  gather: tapping shares the damage out, it never adds to it.
- The staff's **special stays its button** (the Special button). A flick no
  longer makes it: a quick drag-and-lift is an aimed blast.

### Contact: the ring of force

- Where an orb or a sphere lands, a **ring of force** swells out to the
  splash's reach (36 px an orb, 60 a sphere, plus the shove) with a second
  ring inside a sphere's, the contact's heavier sound layer, and a small push
  of the camera along the bolt's way.
- **The shove itself is the worker's**: it throws the monsters the splash
  took outward from the impact (15 px an orb, 30 a sphere), monsters only
  (the owner's rule on knock-back). The screen shows them where the worker
  put them.
- The damage is the worker's: the bolt's share of a full gather, its stage
  setting its splash (`gs` and `pw` come back on `monster_hit`, and the
  number is drawn sized by the share). The best damage a second is today's:
  a full gather every cycle is exactly today's held staff (draw-gather.test
  §9 has the minute against a dummy).

### Other players

- They see your bolt at its stage's size and speed: the relay carries the
  bolt's speed and the gather the worker counted (`ga`), and their screen
  sizes it from that (on a new character's full gather: the look only).
- They see the staff kick and the cast's flash as before; they do not see
  your gathering orb (the gather is not on the wire until the blast).

## Switches

- **On for everyone** in the game's own combat (the default), with a staff
  in hand, against a worker advertising `caps.staffGather`.
- **`?stafffeel=0`** in the address turns it off on that one phone or
  computer, remembered (`localStorage` `bt_stafffeel`); **`?stafffeel=1`**
  brings it back. Off, the staff is today's held staff exactly: it fires by
  itself while the thumb is held, its tap a bolt, its flick its special.
- **The worker's `staffgather: false`** (a live flag) takes the cap away
  from every phone at once: each plays today's held staff.
- `?manual=0`, `?manual=1` and `?manual=2` keep the held staff, as they are.

## How it is built

| file | what |
|---|---|
| `src/game/staffFeel.js` | THE RULES AND THE STATE (pure: imports only the kit's rules, `drawGather.js` and the manual-combat rules, so node tests it). The gather (`staffGatherStart` / `staffGatherAim` / `staffGatherEnd` / `staffGatherAbort`), its numbers bounded the worker's way (`staffGatherNow`), the lift's bolt (`staffFireWaiting` / `staffFireTake` / `staffFireCancel`), the frame (`staffFeelFrame`: the stage crossings, the hum, the view the renderer draws), the walk (`staffFeelMoveK`), the claims' name (`staffSw`), the impact (`staffFeelImpact`), the worker's verdict (`staffFeelHit`), another's bolt's size (`staffPeerK`). State on `S._stf`. |
| `src/rendering/systems/staffFeelFx.js` | a DRAWER of the feel kit (its own world layer): the orb at the crystal, stepped by stage and leaning to the aim, and the push back a step (the figure drawn back, put back the next frame) |
| `src/rendering/staffCastFx.js` | `staffCharge`: the crystal's light and the specks pulled inward fill with the gather (dark between gathers) |
| `src/rendering/systems/effectsRenderer.js` | the bolt drawn its stage's size (`_gk`), yours and another's |
| `src/data/weaponFeelSound.js` | the `blast` sound (the swell and boom, synthesised); the hum is the kit's `build` tone at 130 Hz; the stage notes the kit's `stage` |
| `src/game/monsterCombat.js` | the loop fires only a lift's bolt with the feel on (no sooner than 150 ms after the last: the worker's 100 and the network's 50), and that bolt carries the shot: `ga` and its speed on the relay, its stage, size and reach |
| `src/game/projectiles.js` | a gathered bolt's claims carry `sw` on `monster_damage` and the duel's `player_attack`; the ring at the impact |
| `src/networking/gameEvents.js` | your bolt's `monster_hit` (`gs`, `pw`) kept; another's bolt sized |
| `src/ui/BroTown.jsx` | the presses (the stick, the disc, the left mouse button), the disc's aim, the lifts, a tap another job took (a resource, a townsperson, a door, the chat circle: no bolt), any other end of a press (nothing), the game loop's frame, the walk |
| `src/ui/mobile/ControlsTutorial.jsx` | the controls tour's words for the staff |

The numbers are `STAFF_FEEL` at the top of `staffFeel.js`; every staff
number the worker judges by comes from `src/game/drawGather.js` (the kit's
`feelClaimMs` allowance of 150 ms is not used: the worker's is 100).

## Art the owner could draw later

Each picture is a soft placeholder tinted in code (the kit's minted dot, the
staff cast's sparks). To replace one, draw it and say which; it would load
behind the loading screen (256 colours):

- **the gathering orb**, three sizes: a spark, an orb, a sphere (now the
  soft dot, `staff:orb` / `staff:core` / `staff:halo`, in the element's
  colours), ideally a few frames each so it swirls;
- **the stage's landing**: a ring of light (now the kit's ring);
- **the blast's flash**: a short burst at the crystal along the shot;
- **the ring of force**: a wave of air swelling out over the ground, in two
  sizes;
- **the sounds** are made in code: a recording of a low magical hum, a
  rising swell into a boom, and a deep crack would replace them (with its
  licence in CREDITS.md).

## Not built, and why

- **Moving the bro back a real step**: the brief says a look only (a real
  move is one the worker judges and the ground's collision decides); his
  figure is drawn back instead.
- **Other players seeing your gathering orb**: the gather is not on the wire
  until the blast; a relay while gathering would be a message a press.
- **A computer's keys**: none is new (the left button gathers).

## Tests

- `server/test/staff-feel.test.mjs`: the numbers (mirrors of the worker's),
  the gather (its share and stage at the worker's thresholds, bounded the
  worker's way), the stages landing once each in order with their notes and
  pulses, the hum, the planted feet, the aim (the disc's drag, a still press,
  the cursor), the claim sent (`ga`) and taken once, a lost bolt, a cancelled
  tap, taps as sparks, the sphere, no timing window, every way it is off, the
  claims' `sw`, another's bolt's size, the impact's ring, the worker's
  verdict kept, the blast's sound letting every node go, the Sound Studio
  rows, and the wiring.
- `server/test/draw-gather.test.mjs` (the worker's half, unchanged here),
  `server/test/caps-audit.test.mjs` (`staffGather` is read now).
- `node tools/qa/mp/run.mjs stafffeel` (`mp-stafffeel.mjs`): an upright
  phone in the Wheel playing the default combat with a staff the worker
  holds -- the gather on a real touch, the three stages and their crossings,
  the drag aiming, the orb drawn, the lift's bolt carrying `ga` and a slow
  sphere's speed, a tap's spark, a real hit at Frost Ridge naming its shot
  and the worker's `gs` / `pw` coming back (a sphere's and a spark's), the
  ring drawn, the feel's work a frame within budget, a computer's left
  button, `?stafffeel=0` today's held staff.
