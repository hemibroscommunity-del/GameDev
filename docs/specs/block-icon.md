# The Block button's shield on a calm disc (v2.3.3677)

The owner, 2026-10-27:

> I want a different icon for the shield block (the light explosion makes it
> look like an attach)

## What changed

The Block button wore the owner's gold shield on a yellow-white **starburst**
(their UI sheet `brotown-rpg-ui-asset-sheet-1.png`, cut in v2.3.3522). The
right-hand buttons that attack wear gold bursts and swooshes too (the sword's
special, the bow's volley, Shield Bash's impact), so Block looked like one more
attack.

Every shield button on the owner's thirteen sheets stands on a burst, so there
was no calm one to pick. The tool now **lifts the owner's own shield off its
burst** and sets it on a still **steel-blue disc**: a soft lighter middle, a
faint pale halo behind the shield, the shield's own shadow under it. Block is
the one blue button on the right: guarding, not striking.

The grey copy for the cooldown is made the same way. The button's gold ring,
its cooldown arc and its lit "shield up" state are the game's, unchanged.

## How it is made

`tools/ui/cut-owner-icons.py`, the `abil-block` piece's `calm` settings
(`--only abil-block --force`):

- **The shield** is what a flood from the disc's edge cannot reach. The flood
  runs through everything except the shield's own dark outline, so the outline,
  the steel rim and the face stay whole, and the burst goes, however bright it
  is against the outline.
- **The disc**: a radial gradient (`stops`), a pale-blue halo (`halo`), the
  shield's shadow, then the shield at 1.13x its sheet size (`scale`), centred
  (the burst had pushed it right of the middle). All at the button's 160 px.
- The tool refuses to write if the shield it found is not shield-sized (a leak
  or a broken outline).

A change of look is a change to those settings and a re-run, never a hand edit
of the picture. The picture is asked for at `?v=2.3.3677` (`BLOCK_ART_V`), so
no phone keeps the old one.

## Checked

`mp-blockface`, on a phone in the world: with a shield worn and a fight on,
the Block button wears the new picture at its new address, loaded whole (160 px);
round the shield the disc is blue (479 of 480 pixels sampled) with none of the
burst's yellow, the shield's gold in the middle; a tap raises the shield and the
button lights, the same picture; no page errors. The same colour check on the old
picture finds no blue and 350 burst pixels.

If you'd rather have a new painting, a ChatGPT prompt for one: "A round game UI
button icon, 1:1, painted fantasy style matching the attached buttons: a gold
heater shield with a steel rim, centred, on a calm deep steel-blue disc with a
soft lighter centre; no rays, no sparks, no burst, no glow behind it; no ring
or border (the game draws its own)." Attach the current Block and Special
buttons for the style.
