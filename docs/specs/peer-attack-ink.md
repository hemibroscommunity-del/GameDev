# Another player's swing and bow shot wear their drawings (v2.3.2821)

Owner: *"Yea do woodcutting and missing ones."* This is the second of the
missing ones.

## What was wrong

When you swing a sword, shoot a bow or raise a shield, the game swaps your body
for a pre-drawn attack figure. v2.3.2429 put your drawings on that figure
("make sure during shield block … the custom designs show up"). But the
figures the game draws for **other players** are baked by two different
functions (`_remoteBodyFramesFor` / `_remoteSheetFramesFor`), and those never
got the drawings. So on your screen, another player's tattoos, trouser prints
and patterns vanished every time they attacked, which is exactly when you are
looking at them.

Looking into it turned up a second bug in the same place. Those two functions
saved their bakes under the **facing** alone (`south|skin|pants|shoes`). The
sword and the bow both have a south, an east and a north sheet, so whichever of
the two a player used first was reused for the other. Another player shooting a
bow was drawn in their **sword** pose, with no bow in their hands.

The frame your screen draws for another player (blue block drawn on their
chest, green on their back), on main and on this change:

![before and after](img/peer-attack-ink/before-after.jpg)

## What changed

Everything `_bakeBodyStrip` already did for your own attack figure, it now does
for theirs:

- **their drawings**, through the same sanitiser every other peer drawing goes
  through (entityRenderer's `remoteBodyArt`), resolved for the sheet's own
  direction (`artForFacing`, so a back view shows their back drawings);
- **the sheet's own frame width**, so the drawing is placed frame by frame
  where the sheet's frames are (v2.3.2431 measured what the default 256 px
  windows do to these sheets);
- **a pre-flipped copy** for the facings drawn flipped (west is east flipped),
  made only when a drawing would read backwards (`_twinWouldDiffer`, now shared
  at module scope);
- **the default skin target**: v2.3.1788 ("the attack stand-ins wear the WALKING
  skin") was applied to your figure only, so a default-skin player still
  turned the painted orange of these sheets mid-swing on everyone else's
  screen.

The cache key names the **sheet** now, not the facing, so the bow and the sword
can no longer be swapped. A player with no drawings gets exactly the bake they
had before, under the new key. The cache keeps its existing limit of 24 bakes
(`REMOTE_BAKE_CACHE_MAX`), least recently seen evicted, and the bakes are
cropped (#728), so drawings add at most one bake per sheet per drawn player
on screen.

## How it is checked

`mp-peerattackink` (new, 25 checks) has three players: the tattooed one, a
watcher, and a **plain control** with no drawings. The sword and bow art have
some blue of their own (up to about 190 pixels a frame on the east sword), so a
raw count is not enough. The watcher's screen shows both attackers on the same
frame of the same sheet at the same moment, and the drawing is judged by the
difference between them.

- every sword and bow facing is drawn from its **own** sheet, never the other
  weapon's (the swapped-sheet bug);
- facing you and facing east: his chest drawing is on every frame, over the
  plain player's on the same frame;
- facing away: his back drawing, and not the chest;
- the flip: both bakes of every frame are read directly. On each frame the
  pre-flipped copy has the drawing mirrored, 11 to 41 px further right in the
  texture. Facing west, the frames on screen are drawn from that copy;
- no page errors on any of the three clients.

Against main's code, 15 of the 25 fail, every bow facing among them (drawn from
the sword's sheet). Your own attack figures are unchanged: `mp-standinart`,
`mp-standinskin`, `mp-capeattack`, `mp-backshield`, `mp-facebow` and
`mp-geartrim` pass, 508 of 508.
