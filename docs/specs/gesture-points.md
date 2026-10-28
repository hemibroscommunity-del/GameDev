# The harvest's raw gesture, and the computer's E key (v2.3.3725)

The plan is `docs/HIDDEN-SERVER-PLAN.md`, "The anti-bot plan" 2 and 3.

**NOT BEFORE THE SHOWING.** This changes how a computer harvests with E, and
the judges harvest with E.

## Why

Since v2.3.694 the phone has sent a **summary** of each harvest gesture
(`node_strike.swipeFp`: path length, entropy, timing variance, speed change,
a replay hash), computed on the phone, and `botfp.js` judged it. A script
sends whatever summary passes (`antibot-review.md` §2).

## What the phone sends now

To a worker that says **`caps.gesturepts`**, the strike carries:

- **`g: {v: 1, b}`, the gesture's own points.** Each sample's step from the
  last: x and y rounded to whole px as signed bytes, the time in ms as an
  unsigned byte, base64 (`src/game/gesturePoints.js`).
  - Steps are taken between rounded places, so rounding never adds up.
  - A step past a byte is held to it.
  - More than 160 points are thinned evenly, first and last kept.
  - About 400 characters for a 95-point gesture. The message gets bigger,
    not more frequent: Cloudflare bills incoming messages by count.
  - No `swipeFp` is sent alongside.
- **`k: [[start, held], ...]`** for a harvest E worked: each press's start in
  ms from the first, and how long it was held (at most 24).

`strikePayload` (lifeSkillRewards.js) builds the payload for all three
gathering skills. A worker without the cap gets the summary, as before.

## What the worker does

- `gesturefp.js` decodes `g` and computes the summary **itself**, with the
  phone's own arithmetic. `gesture-points.test` §2 holds the four functions to
  the phone's, line for line.
- botfp judges that summary instead of the phone's: the entropy floor on a
  claimed perfect, the scripted floors, the replay ring and the variance
  checks.
- A `g` that does not decode is a strike with **no fingerprint**: counted,
  never perfect (harvest-proof's rule).
- An old phone's `swipeFp` still judges its strike, and the v1 protocol is
  unchanged.
- `k` feeds botsig's `keys` signal (server-botsig.md).
- **`gesturepts: false`** in the live flags un-advertises the cap (phones send
  the summary again) and ignores any `g` that still arrives.

## The computer

- **Dragging the gesture with the mouse is the full harvest.** Its points go
  as `g`, it is graded as the phone's (perfect is possible), and the worker
  judges the points.
- **Holding E is the slower, lesser harvest**:
  - it works at half a quick hand's pace (`KEY_WORK.slow` 0.5), about 3 s of
    holding where the drawn gesture takes 1.5 s;
  - it is never 'perfect' (no path), as since v2.3.3407;
  - its presses go as `k`, and the server measures their rhythm.
  - A strike with no drawn gesture is never timed by botsig's `gesture`
    signal: E's even time is the client's, not a script's.

## Test mode

The owner's test mode supersedes all of it. botfp returns before judging a
test-mode strike, and botsig's `_sigSkip` measures no presses (both listed in
testmode.js).

## Tests

- `server/test/gesture-points.test.mjs`: the packing, both ways; malformed
  points; the arithmetic is the phone's; the strike (a thumb's perfect kept, a
  timer's drag scored scripted and a straight line's perfect taken, whatever
  summary rides beside them); an old phone; the switch; E's rhythm; test
  mode; the payload with and without the cap.
- `tools/qa/mp/mp-deskharvest.mjs`: on a computer against the real worker:
  - E is about 3 s of work and its strike carries `k`, no `g`, no summary;
  - the mouse's strike carries `g`, no summary, and the worker read it.
- `tools/qa/load/bot-lab.mjs`: `points-pine`, a script sending a timer's drag
  as points.

## Owner's choices

- E's pace: half speed (`KEY_WORK.slow`).
- Whether, once old phones are gone, to refuse a strike that carries only a
  summary.
