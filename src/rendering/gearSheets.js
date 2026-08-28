/* Layered gear sheets (paper-doll equipment).
 *
 * Each gear piece is a transparent sprite sheet that shares the body's exact
 * frame layout: public/sprites/gear/<slot>/<item>/<pose>-<dir>.png, a strip of
 * 256x256 frames in the same count/order as the body's <pose>-<dir>.png.  Frame
 * i of the gear is pixel-aligned to frame i of the body, so the renderer draws
 * it with the SAME transform as the body sprite -- no anchors, no angles.
 *
 * This module just loads + slices + caches frame textures (mirror of
 * playerSkins.buildBodySheet).  Mirroring of west/nw/se is handled by the caller
 * copying the body sprite's (negative) scale.x, so we always load the BASE dir.
 *
 * See gear-layer-spec.md.
 */

import { Rectangle, Texture } from 'pixi.js';
import { composeShirt } from './playerDecal.js';   /* v2.3.1938 drawn shirts; v2.3.1941 colour + pattern + print, in one place */
import { artHash } from './traits/playerArt.js';   /* v2.3.1940: shared drawing key */
import { GEAR_SLOTS, GEAR_CATALOG } from './gearCatalog.js';
import { upscaleToFrameHeight, antialiasUpscaledCanvas, downscaleByFactor, DISPLAY_DS } from './spriteScale.js'; /* v2.3.1110 upscale; v2.3.1341 AA; v2.3.1408 fullset display-downscale */
import { loadWebpOrPng } from './webpImage.js'; /* v2.3.1122: prefer lossless WebP, fall back to PNG */
import { gearArt } from './gearVariants.js'; /* v2.3.1757: recoloured sets share their donor's sheets */

const FRAME_W = 256;
const FRAME_H = 256;
/* v2.3.708: NE jog gear re-painted on the new 24-frame body cycle (see
   playerSprites VERSION 69); chain belt re-baked into the chest sheet. */
/* v2.3.748: + shirt/tshirt white-base sheets (all 5 base dirs by v2.3.754). */
/* v2.3.1053: + pickup-south sheets for chest/steelplate, legs/steelgreaves,
   and shirt/tshirt -- the loot-pickup freeze pose now shows the recoloured
   shirt + equipped plate instead of the bare body (owner-drawn art). */
/* v2.3.1054: pickup greaves rescaled +25% (owner) -- bump to refetch the PNG. */
/* v2.3.1123: + fish-south sheets for chest/steelplate, legs/steelgreaves, and
   shirt/tshirt -- the fishing pose now shows the equipped plate/greaves and the
   recoloured shirt (paper-doll, mirrors the cook stand-in). Each is a 4096x128
   32-frame strip aligned to fish-south.png; the armor tracks the body's per-
   frame lean, the shirt is a grayscale tint base with a 1px outline. */
const GEAR_VERSION = '2.3.2078' /* v2.3.2078: shirt/tshirt jog-east RE-SEALED after the sleeve bake (tools/gear/seal-shirt-edges.mjs --src=<the shipped sheet>).  v2.3.2066 drew the trailing sleeve ON TOP of art that v2.3.1995 had already sealed, and its cut -- perpendicular to the arm's axis, on a pixel grid -- left a stair-step of 1-2px skin runs along the tee's edge.  mp-southshirt measures exactly that and went from 0.21 px/frame to 8.29, on every one of the 28 frames, while every other facing stayed at 0-0.65: a 13x outlier that arrived with the sleeve.  The reseal is purely ADDITIVE -- 270 pixels added, 0 removed, 0 recoloured, and not one of them over transparent body, so the silhouette and the sleeve itself are untouched -- and takes the measure to 0.00/frame, better sealed than the pre-sleeve art it regressed from.  Bump also refetches the PNG, which has no .webp beside it. */ /* v2.3.2066: shirt/tshirt jog-east re-baked with a SLEEVE on the trailing arm (tools/gear/draw-trailing-sleeve.mjs).  Owner, four times: "The bare arm showing while jogging east wearing t shirt is still an issue."  The artist drew a sleeve on the near arm and none on the far one, so on frames 0-6 the trailing arm butts bare against the shirt's back edge -- measured, 13/28/30/39/22/19/14 px of bare skin in the 8 rows below the shirt's top row against 0/3/0/0/0/2/6 on frames 7-13, which reproduces v2.3.1999's split.  The sleeve is cut PERPENDICULAR TO THE ARM'S AXIS (TRAPS §30: a band along the shirt's edge instead is what made v2.3.2016's attempt look worse than the bug) and every written pixel takes THE BODY'S OWN ALPHA, so the character's silhouette is unchanged and the antialiased fringe cannot turn into pips.  Bare shoulder over one cycle 176px -> 19px.  jog-east only, which is also jog-west (mirrored); the other facings are measured in mp-shirtarm and left alone.  Bump also refetches the PNG, which has no .webp beside it. */ /* v2.3.1995: shirt stand/jog sheets re-sealed from the ORIGINAL art with the run scan measured on the whole frame instead of inside the shirt's bounding box (tools/gear/seal-shirt-edges.mjs) -- v2.3.1873's box-clipped scan mistook the tee's OPENINGS (neck hole, hem at the belly, the shoulder line where the body rises past the sleeve) for 2px slivers and filled them from the pixel they touch, which at an opening is the tee's own black keyline: the collar, the northeast waistline and the southwest shoulder caps all went 1px -> 3px and the owner reported all three off the character preview.  4176 of that pass's 6267 written pixels were near-black; this one writes 3684 (2261 near-black) and seals the real slivers BETTER by the untruncated measure (0-0.65px/frame residual against 1.4-4.2).  Bump also refetches the PNGs, which have no .webp beside them. */ /* v2.3.1873: shirt stand/jog sheets sealed at the edges (tools/gear/seal-shirt-edges.mjs) -- the tee was a pixel or two narrower than the body beneath it, so skin slivered along its edge as the frames changed; the stale .webp copies were deleted with the re-bake, so this bump also stops a CDN edge serving the old pair. */ /* NE jog gear sheets gain restored frame 23 in lockstep with the body (see playerSprites VERSION 99) */; /* v2.3.1573: NEW dodge-south/-east sheets for chest/steelplate, legs/steelgreaves and shirt/tshirt (tools/build-dodge-gear.mjs).  v2.3.1534 shipped the dodge roll body-only, so getGearFrame 404'd for the pose and a fully plated knight went BARE for the whole ~300ms tumble -- the same gap the hit-react pose had before v2.3.1477.  Split and sealed like the hit sheets, but the seal's neck-line rule was replaced: the roll INVERTS the body, so "below the neck" is meaningless on frame 5 where the head is the lowest thing on screen.  The protected set is instead the armoured art's own bare skin (head + hands, dilated 3px) and everything else uncovered is sealed, which also catches the edge slivers an enclosure test misses.  Keyline detection is structural rather than a brightness cut -- the armoured boots shade to (20,20,20) and a darkness threshold classified them as outline, leaving the boot out of the mask and sealing the body's boot to a black donor (a black slab on every standing frame).  v2.3.1481: east-jog fullset gorget trimmed on frames 3 and 15 (tools/fix_east_jog_collar.py) — owner: "there's a frame on armor east jog that looks like it rides too high up into the characters face".  Measured with each frame's own crown as the datum so the run bob can't confuse the reading: the collar's top edge sits at crown+19..22 on all 23 other frames and at crown+17 (f3) / crown+18 (f15), 16 columns wide, right across the jaw and past the ear.  Nothing else was wrong — the sheet never rises above the eye line, the head overlay draws ON TOP of the figure, and the FULLSET_HEAD_RES residuals are sub-pixel — so this is two frames of art, not a placement bug.  Trimmed to crown+19, which is also where the head sheet's chin ends on those frames, so no seam opens; the new top row is re-darkened to the sheet's own keyline value. v2.3.1480: NEW shirt/tshirt hit-<dir> (all five base dirs) + mine-south sheets (tools/fit_shirt_art.py, owner-generated art) — the SHIRT slot was the last gap in these two poses, and it is the one most players actually wear, so an unarmoured bro still flashed bare-chested on every hit taken and every ore swing.  Fitted like the plate but with two deliberate differences: the target is the TRUNK ONLY (erode the arms off the skin mask, keep the core that meets the trousers, grow it back geodesically) because a tee that chases the whole upper body ends up sleeved to the wrist; and there is NO seal, because a tee is SUPPOSED to leave the forearms and belly bare.  Head is cut out of every frame, and on mining so are the pickaxe and boulder (they draw in front — see v2.3.1478). v2.3.1478: NEW mine-south chest/legs sheets (tools/fit_mine_armor_art.py, owner-generated art) — the pickaxe swing had never shipped gear either, so the player mined bare-chested whatever they wore (owner: "it looked like there was no chest armor while I was mining the ore").  Same fit/split/seal as the hit sheets, plus two things this pose needs: the pickaxe and the ore boulder are BAKED INTO the body sheet and draw in FRONT of the character, so they are cut back out of the finished plate instead of being swallowed by it; and the pickaxe shaft is skin-coloured to the shared classifier (measured (165,116,70) vs skin (237,133,55)), so the skin rule there carries an extra red-minus-green test. v2.3.1477: NEW hit-<dir> chest/legs sheets for all five base dirs (tools/fit_hit_armor_art.py, owner-generated art). The 250 ms hit-react pose had never shipped gear, so getGearFrame 404'd and a fully plated knight flashed BARE every time they took a hit. The art is keyed, overlap-fitted at one constant scale per direction, split into chest/legs by the body region each pixel sits on, and SEALED: any body pixel below the neck the art misses is filled from the nearest lit armour pixel, so with both pieces worn there is zero uncovered body on all 30 frames (owner: "make sure you remove the body beneath completely ... otherwise AI drift will make the naked body beneath poke out"). v2.3.1471: fish chest/shirt re-placed — v2.3.1461's silhouette-correlation fit left ~2x the original's uncovered skin at the collar and rod hand (owner: "bare hand coming through the armor near the hand"); the plate now rides the body's own motion track (same de-wobble) and the residual exposure is sealed INTO the plate, so zero body skin shows under the armor on all 32 frames. v2.3.1462: stand-south/-northeast waist gaps steel-filled in the chest sheets (patch_stand_gear_gaps.py) — uncovered skin/pants strips between sleeve and cuirass at sword-grip height read as a "hole around the right hand" (owner); neck opening + between-leg shadows deliberately kept. v2.3.1461: fish re-bake take 2 — RIGID integer tracking (owner: v1459's per-row shear read "jittery and wobbly"; a plate is a shell, not rubber): one np.roll'd (dx,dy) per frame from the torso correlation track, median-cleaned, zero resampling; legs fully constant on the feet. v2.3.1459: fish-south chest/shirt/legs re-baked to TRACK the body (rebake_fish_gear.py) — the shipped sheets were ONE stamp translated with ~2.1x the body's sway; the v2.3.1216 runtime chest de-jitter table is deleted with it. v2.3.1457: SW fullset re-cut with the north/south protections — RELIEF 2px, connectivity-gated shelf erase, band-limited round-top (owner: backswing "shoulder ... clipped at the top"); jog-southwest-head.png regenerated from the same rows. v2.3.1456: east fullset edge cleanup — detached flecks + helmet antenna stubs removed, 1px notches filled, staircase corners soft-AA'd (owner: "lines look chewed up in the back"). v2.3.1393: east collar slit-fill under the jaw (fix_east_neck_collar.py). v2.3.1381: south fullset rebuilt on armor-anchored cuts (shoulder slivers). v2.3.1380: SW f1 two-band cut — face clear, pauldron kept (owner). v2.3.1379: north rebuilt on armor-anchored cuts (sliver flicker); SW f1 gray arcs stripped. v2.3.1378: SW f0-f2/f13-f14 helmet-edge leftovers shaved to the armor shelf (owner). v2.3.1377: southwest fullset rebuilt on armor-anchored per-frame neck cuts (owner frame list). v2.3.1373: chest hem belt extended a few px down (south/southwest/  v2.3.1559: the shirt's stranded hem line -- owner, reporting the belly line STILL there after v2.3.1557: it was never the greaves.  The shirt sheet's own bottom row is a solid black hem outline (stand-south row 70: 21 of 21 pixels below luminance 70), and it is deliberate art -- almost every shirt sheet has one.  With no leg armour it reads correctly as the shirt's edge against the pants.  With greaves on, the greaves' top edge sits BELOW it, so the hem is left stranded as a black bar floating across the belly with a sliver of pants under it -- which is what the owner has been looking at.  Confirmed by their own observation that the line is absent during a sword swing: the swing composites through a different path with its own torso art.  Each stranded hem pixel is replaced by the pixel directly ABOVE it, so it inherits the shirt's shading and tints with the player's chosen colour -- literally "fill that with the shirt color".  Only a bottom row that is >80% near-black is touched, and only on stand + jog (the poses you move around in): 1022px over 10 sheets.  NOTE this also removes the hem outline when NO leg armour is worn; white-on-green still separates cleanly by colour, but it is a change to the unarmoured look too.  v2.3.1557: the greaves' detached belly keyline removed -- owner: "while only wearing leg armor a line appears on idle south around the belly button: can you fill that with the shirt color".  Measured: legs/steelgreaves/stand-south carries TWO connected components at rows 64-65, 14px and 16px, 79% and 75% near-black, sitting FIVE rows above the greaves proper (which start at row 70) with nothing between them.  A detached dark bar floating above the armour is a keyline remnant, not armour, and because the legs layer draws AFTER the shirt it was painting a black line straight across the shirt at belly height.  Removing it does exactly what the owner asked without special-casing a colour: the shirt's own pixels now show through there and carry the player's tint automatically.  Swept every legs sheet on the same rule -- a component entirely above the main mass, under 40px, at least 60% near-black -- which also clears 1-2px black specks on four jog sheets and mine-south.  57px over 6 sheets; nothing connected to the armour is touched.  v2.3.1556: east collar trimmed off the FACE -- owner: "I'm seeing junk on the character's chin area.  It looks like an overly thick black outline of the shoulder pauldron slivering against the head upon movement".  Direct consequence of v2.3.1553 putting the head BEHIND the armour: the collar's own dark keyline reaches 7-8 rows above the head's bottom on most frames -- into the JAW, not just the neck -- and with the head no longer on top that black line now draws across the chin, moving frame to frame as the collar bobs.  Measured per frame: 22-73px of armour sit inside the head silhouette, 4-33px of it near-black.  Fixed by removing armour ONLY where it overlaps the head silhouette and only above the head's lowest 3 rows -- the chin and jaw are cleared, the collar still overlaps the neck so the head is not left floating.  This is the one cut in this whole sheet that CANNOT open a hole: every removed pixel has the head directly behind it by construction, and the composite silhouette is verified byte-for-byte unchanged (0 pixels lost).  K=4 and K=6 were rendered too and still leave black on the chin; K=3 clears it.  702px removed across 25 frames.  0 seams on all four directions.  v2.3.1554: jog-east back to its ORIGINAL 25-frame cycle -- owner: "I think the original jog cycle probably looked better but would it keep your progress with the pauldron rounding and correcting the head layer?".  It does, because those three fixes are independent of frame selection: the pauldron restore lives in the PIXELS of each frame (verified: +955px still present against the pre-restore sheet, 0 lost), the head-behind-shoulder fix is a DRAW-ORDER change in entityRenderer that never touches the sheets, and the head razor fix is a per-frame re-cut (H=24) that re-applies to whatever frames ship -- bottom-row flat run 3.9px here against 7.7px razored.  Only the frame SELECTION is reverted: v2.3.1550/1551/1553 dropped and re-picked frames to kill an arm bounce, and the owner judged the original cadence better in play.  The measurement work stands and is recorded in those commits if it is ever wanted back; the stride-position map (the board covers only 11 of 14 positions, missing 2, 3 and 12) is the durable finding and is what the ChatGPT template was built from.  v2.3.1553: east frame choice re-decided on the WHOLE FIGURE, and the head moved BEHIND the armour.  Owner: "you also didn't get the frame sequencing right due to a common problem with AI not being able to follow arm strides that alternate layers in that direction" -- correct, and it is a real flaw in what I measured.  v2.3.1551 picked between same-stride-position candidates by the rightmost pixel in the arm band, calling it 'the front fist'.  On a PROFILE that pixel belongs to whichever hand is furthest right, and the near and far hand SWAP across the cycle, so the signal jumps between two different arms and cannot order anything.  Re-deciding by whole-figure IoU against the body frame at that stride position -- which contains both arms and cannot be fooled by the swap -- independently reproduces the same 10 picks, so the selection itself was right; but it also says stride position 4 should NOT have been dropped (f3 scores 0.704 against the body, in range with the rest).  It was dropped only because the bogus fist signal dipped there.  East now ships all 11 stride positions the board draws: frames 0,1,3,5,19,20,8,9,10,11,13, doubled to 22, one frame per position with no duplicates (v2.3.1550's 22 doubled up positions 8 and 11, which was the 'not smooth' report).  Still 11 of 14 positions -- 2, 3 and 12 are simply not drawn on the board.  v2.3.1551: jog-east cadence, rebuilt on STRIDE POSITION -- owner: "do the frames selected need to be in the original sequence or can you reorder them?".  They can, and asking that is what found the real defect.  Matching each armour frame's LEG silhouette against the body's known-smooth 14-frame cycle gives every frame a stride position, and the board's 25 frames do not cover that cycle evenly: they land on only 11 of the 14 positions (2, 3 and 12 are never drawn) and pile 2-4 frames onto others.  Position 1 alone holds f1, f2, f15, f16 with the fist at 89, 84, 88 and 84 -- same legs, arm 5px apart.  Playing those consecutively is exactly the reported bounce: the legs stall while the arm jumps backwards.  v2.3.1550's contiguous drop missed this; its 11 frames still doubled up positions 8 and 11, which is the 'not very smooth' half of the report.  The sheet is now ONE frame per stride position, each chosen as the candidate whose fist best matches the body's at that position, ordered by position: frames 0,1,5,19,20,8,9,10,11,13 -- note 19 and 20 come from the board's second lap, which is legitimate because it is the same cycle and they carry the better arm.  Position 4 is dropped: its only art (f3/f17) has the fist at 85 where the body is at 90, an internal arm/leg mismatch no selection can fix.  Result: 10 poses, fist track 87 89 88 89 86 80 75 71 75 85, 2 reversals at a 2px deadband -- one peak, one trough, no leg stall.  Shipped doubled (20 frames) to hold the body's 2 swings per cycle.  Head sheet and both renderer tables take the identical selection.  CEILING: the board only draws 11 of 14 stride positions, so east can never be as smooth as the body without new art for positions 2, 3, 4 and 12.  v2.3.1550: jog-east cadence -- owner: "the back arm bounces off the back to go all the way behind the character again before swinging in front ... wondering if that can be achieved by just removing frames that don't align with the smooth cycle".  It can, and the frames are identifiable by measurement.  Tracking the front fist's X per frame, the BODY's own 14-frame cycle has exactly 2 direction reversals (one peak, one trough) -- a clean swing.  The 25-frame fullset had 10.  It is ~1.8 laps of that same 14-frame cycle (the body and chest sheets are literally 14 unique frames doubled to 28), and armour frames 2, 3 and 4 are drawn with the fist further back than the body has it at that phase -- 89 -> 84 -> 85 -> 86 -> 88 where the body runs 89 -> 90 -> 90 -> 90 -> 89 -- so the arm visibly retreats and re-advances mid-swing.  That is the bounce.  Dropping exactly {2,3,4} takes all three motion signals (fist X, arm span, leg stride) to 2 reversals; every other combination of drops leaves 4, which is the evidence those three frames are the defect and not a threshold choice.  The sheet ships as that smooth 11-frame cycle DOUBLED -- 22 frames -- because getGearFramePhased spreads a sheet evenly over one cycle, so two laps keeps the armoured run at the body's own 2 swings per cycle rather than the 1.79 the 25-frame sheet was giving.  Armoured and unarmoured now run at the same rate.  jog-east-head.png and FULLSET_CROWN/FULLSET_HEAD_RES east take the identical selection, so every head-to-armour pairing is preserved exactly.  v2.3.1549: east pauldrons restored FROM THE ORIGINAL BOARD -- the owner still had the full-armour jog-east sprite sheet and sent it (archived at assets/armor boards/fullset-steel-jog-east.png).  That is the actual source these figures were imported from in v2.3.1366, helmet and all, so it is the ground truth the chest sheet never was: re-imported through tools/import_fullset_board.py at the board's own 25 frames, it covers the shipped armour frame-for-frame at 0.97-0.99 (mean 0.988).  Restoring the missing armour then needs only to separate pauldron from helmet, and the data does that by itself -- measuring, per column, how far the board rises above the shipped top edge gives a cleanly bimodal split with ZERO columns at 8 or 9px: 473 columns rise 1-7px (the razored shoulder cap) and the rest rise 10px or more (the helmet).  MAXFILL=7 is that gap.  +778px over all 25 frames, 0 removed, and unlike the chest-sheet attempts 751 of those 778 are VISIBLE in play rather than 38, because this is the real outline rather than a cap hidden behind the head.  0 seams on all four directions after.  v2.3.1548: east joins the pauldron restore, on a correspondence that was MEASURED rather than assumed -- owner: "you have the original jog east torso armor sprites still.  Retrieve it" + "what if you took out the 3 frames from the torso sheet?".  Both right.  v2.3.1546 (reverted as v2.3.1547) paired the 25-frame fullset with the 28-frame chest sheet by scoring how much of the torso plate landed INSIDE the fullset -- worthless here, because a small plate scores ~1.00 against any frame it happens to fit inside, and rendered side by side the "matches" were unrelated poses.  The correspondence has to be measured against what BOTH sheets are registered to, the body: the chest sits inside its own body frame at 0.94 index-for-index, and the fullset is that same figure at the same scale, just headless (bbox 63px vs the body's 84, and 84-63 = 21 = exactly the east head height).  Matching the fullset's silhouette against the head-stripped body gives fullset 0..13 -> body 0..13 one-to-one, and fullset 14..24 -> the same cycle WITH THREE FRAMES DROPPED (3, 10, 13) -- the owner's three frames, found rather than guessed.  Mean silhouette agreement 0.94 (worst 0.88) at a constant (0,+2) offset, against 0.93-0.97 for the three directions that restored cleanly.  Still band-limited to the 8 rows below the figure's top edge, because even on the right map the chest sheet's sleeve edges differ by a pixel or two from the fullset's arm: 177px over 15 frames, of which 38 are visible in play (the head overlay covers the rest -- which is also why east never read as broken as north).  v2.3.1545: the jog fullset figures get back the armour the HELMET cuts took (tools/restore_fullset_pauldrons.py) -- owner, on jog north: "the very tips of the shoulder pauldron outlines get cut off in some frames ... the defect is in the standalone torso armor. It is not supposed to have that jagged chunk missing. The original sprite sheet art did not have that for jog north ... or maybe you cut it with the helmet still on it."  That last guess is right.  These figures were baked WITH a helmet and v2.3.1368-1379 cut it back off so the player's own head could show; the cuts were horizontal, so they took the tops of the PAULDRONS with the helmet and the domes came out razored flat with their keyline outline sliced away.  v2.3.1386 already answered one round of this ("pauldrons rounded -- no more razored flat line on jog north/south"), which is the tell that the CUT, not the art, is at fault.  The intact art was never lost: the same plate ships as its own torso sheet under gear/chest/steelplate for a partially-armoured player (v2.3.1372), with whole rounded pauldrons.  Measured, the two sheets are registered -- 93-97% of the torso's pixels land inside the fullset silhouette -- so the missing armour is put back from it.  STRICTLY ADDITIVE: written only where the fullset is transparent and the torso sheet has armour, so nothing else tuned into these sheets can regress and the helmet cannot return (the torso sheet has none in it).  north was losing 77px/frame, southwest 52, south 40.  EAST is skipped: its fullset plays 25 frames against the chest sheet's 28, so frame i is not the same pose in both.  After the restore the only armour outline the head still covers is the collar arch directly behind the neck, which is correct occlusion, and the seal re-check reports 0 seams on all four directions.  v2.3.1540: southwest fullset KEYLINED where it meets the jaw (tools/keyline_jaw.py) -- owner: "his chin turning into metal armor".  Removing the armour there is the instinctive fix and it does clear the jaw, but rendered on magenta it opens holes: the fullset REPLACES the body, so the armour touching the chin is the only thing drawn there.  Nothing is removed -- the armour pixels touching the head, in the jaw half only, are recoloured to the sheet's OWN darkest opaque value, the keyline it is already drawn with everywhere else.  The chin then has a clean dark edge instead of two mid-greys blending; no pixel loses alpha so no hole is possible, and the value is sampled rather than invented.  v2.3.1481: east-jog fullset gorget trimmed on frames 3 and 15 (tools/fix_east_jog_collar.py) — owner: "there's a frame on armor east jog that looks like it rides too high up into the characters face".  Measured with each frame's own crown as the datum so the run bob can't confuse the reading: the collar's top edge sits at crown+19..22 on all 23 other frames and at crown+17 (f3) / crown+18 (f15), 16 columns wide, right across the jaw and past the ear.  Nothing else was wrong — the sheet never rises above the eye line, the head overlay draws ON TOP of the figure, and the FULLSET_HEAD_RES residuals are sub-pixel — so this is two frames of art, not a placement bug.  Trimmed to crown+19, which is also where the head sheet's chin ends on those frames, so no seam opens; the new top row is re-darkened to the sheet's own keyline value. v2.3.1480: NEW shirt/tshirt hit-<dir> (all five base dirs) + mine-south sheets (tools/fit_shirt_art.py, owner-generated art) — the SHIRT slot was the last gap in these two poses, and it is the one most players actually wear, so an unarmoured bro still flashed bare-chested on every hit taken and every ore swing.  Fitted like the plate but with two deliberate differences: the target is the TRUNK ONLY (erode the arms off the skin mask, keep the core that meets the trousers, grow it back geodesically) because a tee that chases the whole upper body ends up sleeved to the wrist; and there is NO seal, because a tee is SUPPOSED to leave the forearms and belly bare.  Head is cut out of every frame, and on mining so are the pickaxe and boulder (they draw in front — see v2.3.1478). v2.3.1478: NEW mine-south chest/legs sheets (tools/fit_mine_armor_art.py, owner-generated art) — the pickaxe swing had never shipped gear either, so the player mined bare-chested whatever they wore (owner: "it looked like there was no chest armor while I was mining the ore").  Same fit/split/seal as the hit sheets, plus two things this pose needs: the pickaxe and the ore boulder are BAKED INTO the body sheet and draw in FRONT of the character, so they are cut back out of the finished plate instead of being swallowed by it; and the pickaxe shaft is skin-coloured to the shared classifier (measured (165,116,70) vs skin (237,133,55)), so the skin rule there carries an extra red-minus-green test. v2.3.1477: NEW hit-<dir> chest/legs sheets for all five base dirs (tools/fit_hit_armor_art.py, owner-generated art). The 250 ms hit-react pose had never shipped gear, so getGearFrame 404'd and a fully plated knight flashed BARE every time they took a hit. The art is keyed, overlap-fitted at one constant scale per direction, split into chest/legs by the body region each pixel sits on, and SEALED: any body pixel below the neck the art misses is filled from the nearest lit armour pixel, so with both pieces worn there is zero uncovered body on all 30 frames (owner: "make sure you remove the body beneath completely ... otherwise AI drift will make the naked body beneath poke out"). v2.3.1471: fish chest/shirt re-placed — v2.3.1461's silhouette-correlation fit left ~2x the original's uncovered skin at the collar and rod hand (owner: "bare hand coming through the armor near the hand"); the plate now rides the body's own motion track (same de-wobble) and the residual exposure is sealed INTO the plate, so zero body skin shows under the armor on all 32 frames. v2.3.1462: stand-south/-northeast waist gaps steel-filled in the chest sheets (patch_stand_gear_gaps.py) — uncovered skin/pants strips between sleeve and cuirass at sword-grip height read as a "hole around the right hand" (owner); neck opening + between-leg shadows deliberately kept. v2.3.1461: fish re-bake take 2 — RIGID integer tracking (owner: v1459's per-row shear read "jittery and wobbly"; a plate is a shell, not rubber): one np.roll'd (dx,dy) per frame from the torso correlation track, median-cleaned, zero resampling; legs fully constant on the feet. v2.3.1459: fish-south chest/shirt/legs re-baked to TRACK the body (rebake_fish_gear.py) — the shipped sheets were ONE stamp translated with ~2.1x the body's sway; the v2.3.1216 runtime chest de-jitter table is deleted with it. v2.3.1457: SW fullset re-cut with the north/south protections — RELIEF 2px, connectivity-gated shelf erase, band-limited round-top (owner: backswing "shoulder ... clipped at the top"); jog-southwest-head.png regenerated from the same rows. v2.3.1456: east fullset edge cleanup — detached flecks + helmet antenna stubs removed, 1px notches filled, staircase corners soft-AA'd (owner: "lines look chewed up in the back"). v2.3.1393: east collar slit-fill under the jaw (fix_east_neck_collar.py). v2.3.1381: south fullset rebuilt on armor-anchored cuts (shoulder slivers). v2.3.1380: SW f1 two-band cut — face clear, pauldron kept (owner). v2.3.1379: north rebuilt on armor-anchored cuts (sliver flicker); SW f1 gray arcs stripped. v2.3.1378: SW f0-f2/f13-f14 helmet-edge leftovers shaved to the armor shelf (owner). v2.3.1377: southwest fullset rebuilt on armor-anchored per-frame neck cuts (owner frame list). v2.3.1373: chest hem belt extended a few px down (south/southwest/
   north) so chest-only wear never flashes tan belly between hem and trousers; east fullset interior
   seam lines lifted toward soft gray ("too thick of black outlines"). */
/* v2.3.1372: hip-skirt (thigh plate) pixels stripped BACK OUT of the
   south/southwest/north jog chest sheets (restored to the v2.3.1345b belt-stripped originals).  The
   v2.3.1348b "restored hip skirt" baked the mannequin's silver skirt into the CHEST sheet, so a player
   wearing ONLY the chest plate showed leg armor on bare thighs (owner report).  Full-set on these dirs
   uses the fullset figure and never draws this sheet; NE/NW full-set gets its thigh cover from the
   LEGS sheet, so nothing else changes. */
/* v2.3.1345: baked jog belts STRIPPED from all five chest sheets — the
   chain belt is now a runtime layer (see getJogBeltTexture + entityRenderer._placeGear); six rounds of
   baking/sealing it into the sheets each produced a new on-device artifact.
   BUMP THIS on EVERY gear-art regen — v2.3.1342c changed the PNGs without bumping, so
   previews served the cached old art and the change was invisible on-device. */

/* `${slot}/${item}/${pose}/${dir}` -> [Texture] | 'loading' | [] (missing) */
const _sheets = {};

/* v2.3.1122: WebP-preferring load (PNG fallback) for the gear sheets. */
function loadImg(url) { return loadWebpOrPng(url); }

/* v2.3.1305: bounded retry on gear-sheet load failure.  A flaked request
   (deploy-day cold CDN edge / dropped mobile request) used to cache []
   permanently and hide that gear slot for that (pose,dir) all session —
   part of the owner's "clothes missing depending on the angle" report.
   The entry stays 'loading' across the backoff so callers keep their
   graceful null fallback; the retry URL appends &r=N to bypass a
   poisoned cache entry.  Deliberately NO crash-telemetry here: partial
   pose sets are by design (fish/pickup ship south only), so a final
   failure is only distinguishable from expected-missing art by eye —
   flip window.__spriteLog = true to see them. */
const _GEAR_RETRY_MS = [2000, 6000];
function buildSheet(key, slot, item, pose, dir, attempt = 0, stampArt = null) {
  _sheets[key] = 'loading';
  /* Returns a promise that ALWAYS resolves (missing sheet -> []), so callers
     that want to await a full preload don't hang on a 404. */
  const bust = attempt > 0 ? `&r=${attempt}` : '';
  return loadImg(`/sprites/gear/${slot}/${item}/${pose}-${dir}.png?v=${GEAR_VERSION}${bust}`).then(rawImg => {
    /* restore a downscaled-on-disk gear sheet to the 256px frame (no-op for any
       native >=256 sheet, so the variable-height combat poses are untouched) */
    const rawH = rawImg.naturalHeight || rawImg.height || 0;
    /* v2.3.1120: gear stays at the FULL 256 frame (NOT display-downscaled like the
       body).  Gear is also consumed by the combat swing/bowshot stand-ins
       (effectsRenderer) at 256, so downscaling it here would shrink the legs there;
       instead the MAIN renderer's _placeGear divides the body transform by
       DISPLAY_DS to render this 256 gear at the right size over the smaller body.
       v2.3.1341 (owner: the chain belt / armor edges SHIMMER while jogging): the
       v2.3.1237 anti-alias cure was only ever applied to the BODY sheets, so
       128px-on-disk gear rendered with raw nearest-upscale stair-steps that
       crawl sub-pixel in motion.  antialiasUpscaledCanvas is the SAME resample,
       but size-preserving — the 256 contract above still holds (unlike
       bakeDisplayCanvas, which would shrink gear if DISPLAY_DS ever went back
       to 2).  Native >=256 sheets pass through untouched. */
    /* v2.3.1408 (DISPLAY_DS=2): the FULLSET figure sheets are display-
       downscaled like the body, NOT kept at the 256 gear contract.  The
       figure texture is assigned directly onto the body sprite
       (entityRenderer _fullsetFrame -> spriteBody.texture), whose
       transform expects display-sized frames — this is exactly why the
       figure path used to be guarded to DISPLAY_DS === 1.  Storing the
       fullset at display size makes the figure a drop-in body frame at
       any DS, so the guards lift and the painted knight stays on the
       figure path.  Overlay/combat gear sheets keep the full-256
       contract (the note above still holds for them).  fw/fh track the
       scaled frame for slicing. */
    /* v2.3.1434 (frost OOM report: "crashed after harvesting different
       resources over a short period"): the exact-texel treatment extends
       from the fullset figures to EVERY gear sheet that ships at the
       display size on disk (jog/stand/pickup/fish steel sheets are all
       128px-tall art; the "full 256" was always a nearest-neighbour
       pixel-double of these texels).  Storing them raw at 128 removes
       ~60MB of resident upscale canvases at DS=2 with the artist's
       exact pixels — the same owner-approved recipe as v2.3.1412 —
       and halves the lazy fish/mine harvest-pose loads that stacked
       the frost-zone peak back to the iOS kill line.  Consumers are
       size-agnostic: the masked bake stretch-draws by source rect, and
       _placeGear (entityRenderer) now normalizes by the texture's own
       frame width.  Sheets shipping any OTHER height (bowshot/cook/
       chop combat stand-in strips, 256-native art) keep the full-256
       contract unchanged. */
    const _fsDs = (slot === 'fullset' || (DISPLAY_DS > 1 && rawH === FRAME_H / DISPLAY_DS)) ? DISPLAY_DS : 1;
    let img;
    if (_fsDs > 1 && rawH === FRAME_H / _fsDs) {
      /* v2.3.1412 (owner: "the half res texture looks soft — it's a very
         simple armor sprite, maybe it can be compressed differently").
         The steel figure sheets ship 128px ON DISK — the 256 "full res"
         was always a nearest-neighbour 2x pixel-double of these texels.
         The v2.3.1408 pipeline (NN-upscale 128->256, anti-alias, Lanczos
         back down to 128) double-resampled the art into mush.  When the
         on-disk height already IS the display size, slice the RAW image
         untouched: the texture is the artist's exact pixels, same memory,
         no resampling anywhere. */
      img = rawImg;
    } else {
      img = antialiasUpscaledCanvas(upscaleToFrameHeight(rawImg, FRAME_H), rawH);
      if (_fsDs > 1) img = downscaleByFactor(img, _fsDs);
    }
    const fw = FRAME_W / _fsDs, fh = FRAME_H / _fsDs;
    /* v2.3.1938: the player's drawing, stamped into the sheet itself.  Baked
       here rather than drawn as a second sprite because the decal has to follow
       the torso through ~20 pose sheets x 5 facings x up to 26 frames — as part
       of the sheet it inherits every transform the shirt already gets, and the
       renderer keeps treating the shirt as one texture. */
    /* v2.3.1941: and the shirt COLOUR and PATTERN with it.  The colour used to
       be a multiplicative sprite tint applied to the finished texture, which
       multiplied the print too (a drawing on a black shirt came out black) and
       made a pattern impossible: a pattern is colour, and colour times a dark
       shirt is nothing.  composeShirt does tint -> pattern -> print in that
       order and the draw site uses no tint on the result. */
    if (stampArt) img = composeShirt(img, fh, stampArt);
    const src = Texture.from(img).source;
    src.scaleMode = 'linear';
    /* v2.3.1385: the v2.3.1384 fullset mips-off (invisible-knight memory
       guess) came RIGHT BACK as "lines are blurry and wobbly behind the
       character while running east" — on a 3x-DPR phone the strip renders
       slightly minified in device pixels, exactly where mips matter.
       Restored; the invisible-knight hunt rides on the v2.3.1384 telemetry
       (gear-sheet-failed / body-sheet-failed + GL caps) instead. */
    src.autoGenerateMipmaps = true;
    const frames = Math.max(1, Math.floor(img.width / fw));
    const out = [];
    for (let i = 0; i < frames; i++) {
      out.push(new Texture({ source: src, frame: new Rectangle(i * fw, 0, fw, fh) }));
    }
    _sheets[key] = out;
  }).catch(() => {
    if (attempt < _GEAR_RETRY_MS.length) {
      /* v2.3.1398: retry CHAINS into the returned promise so the intro
         gate (preloadGear/preloadFullsetFigures awaiters) waits through
         the backoff instead of passing with a sheet still re-fetching. */
      return new Promise((res) => setTimeout(res, _GEAR_RETRY_MS[attempt]))
        .then(() => buildSheet(key, slot, item, pose, dir, attempt + 1, stampArt));
    }
    _sheets[key] = []; /* missing -> caller hides the slot */
    try { if (window.__spriteLog) console.warn('[sprite] gear sheet failed', key); } catch (e) { /* ignore */ }
    /* v2.3.1384: a FINAL failure on a sheet that must exist (the fullset
       knights and their jog belts) is real evidence for an invisible /
       misdressed character — land it in the crash ring so on-device
       reports arrive with facts.  Poses that legitimately 404 (fish/
       pickup non-south) never reach here with these slots. */
    if (slot === 'fullset' || slot === 'belt') {
      try { import('../debug/crashTrap.js').then(ct => ct.recordCrash('gear-sheet-failed', key)).catch(() => {}); } catch (e) { /* ignore */ }
    }
  });
}

/** Frame texture for an equipped piece, or null while loading / if missing /
 *  if nothing is equipped in the slot.  Lazy-baked + cached per (slot,item,
 *  pose,dir).  The caller (entityRenderer) passes the BASE dir + body frameIdx
 *  and copies the body sprite's transform, which carries mirror + bodyScale. */
/* v2.3.1757: QA probe — how many distinct sheets have been built.  The
   material pipeline's whole claim is that a recoloured set adds none. */
if (typeof window !== 'undefined') {
  window.__btGearSheets = () => Object.keys(_sheets);
  /* v2.3.2078: and the cache-bust the client is actually asking for.  A
     scenario that fetches a gear sheet by URL had GEAR_VERSION copied into
     it by hand (mp-shirtarm), which silently went stale on every re-bake —
     the fetch still resolved (the ?v= is only a cache-bust on a static
     file), so the test kept measuring art while claiming to prove the bust
     shipped.  Read it from here instead. */
  window.__btGearVersion = () => GEAR_VERSION;
}
export function getGearFrame(slot, item, pose, dir, frameIdx) {
  if (!item || item === 'none') return null;
  /* v2.3.1757: a recoloured set resolves to its DONOR art here, so the cache
     key — and therefore the TextureSource — is shared with the piece it was
     recoloured from.  Keying on the variant id instead would load a second
     identical copy of every sheet and hand back the memory the tint pipeline
     exists to save.  The colour is applied by the draw site (gearTint). */
  item = gearArt(item);
  const key = slot + '/' + item + '/' + pose + '/' + dir;
  const entry = _sheets[key];
  if (entry === undefined) { buildSheet(key, slot, item, pose, dir); return null; }
  if (entry === 'loading' || !entry.length) return null;
  return entry[((frameIdx % entry.length) + entry.length) % entry.length];
}

/* ═══ v2.3.1938: DRAWN SHIRTS ═══
 *
 * A drawn shirt is a SECOND bake of the same sheet, keyed by the drawing, so
 * two players wearing the same tee with different prints do not share a texture
 * while everyone with no drawing keeps sharing the original.
 *
 * CAPPED, and that is not optional.  These sheets are keyed by a string that
 * arrives from other players, and this game has a documented history of iOS
 * losing the WebGL context to texture memory (v2.3.1117, v2.3.1434).  Without a
 * bound, a busy town of players with distinct drawings would grow the cache
 * until something died.  Least-recently-used wins; a dropped sheet simply
 * re-bakes if that player is still on screen.
 */
const _artSeen = new Map();          /* artKey -> last use (a counter, not a clock) */
let _artTick = 0;
const MAX_ART_KEYS = 8;              /* distinct drawings kept baked at once */

/* v2.3.1940: the drawing key moved to playerArt.js — the BODY sheet caches by
   it now too (pants prints and tattoos), and one spelling is the point. */

function touchArt(k) {
  _artSeen.set(k, ++_artTick);
  if (_artSeen.size <= MAX_ART_KEYS) return;
  let oldest = null, oldestAt = Infinity;
  for (const [key, at] of _artSeen) if (at < oldestAt) { oldestAt = at; oldest = key; }
  if (oldest === null) return;
  _artSeen.delete(oldest);
  const pre = 'shirtart/' + oldest + '/';
  for (const key of Object.keys(_sheets)) {
    if (!key.startsWith(pre)) continue;
    const entry = _sheets[key];
    if (Array.isArray(entry) && entry[0] && entry[0].source) {
      try { entry[0].source.destroy(); } catch (e) { /* already gone */ }
    }
    delete _sheets[key];
  }
}

/** A DRESSED shirt frame — colour, pattern and print baked in — or null while
 *  it bakes (the caller falls back to the plain tinted shirt for those frames,
 *  so putting a pattern on never blinks the shirt off).
 *
 *  v2.3.1941: `look` is `{ art, pattern, tint, mirror }`.  Returns null when
 *  there is nothing to bake, i.e. a plain coloured shirt keeps the shared sheet
 *  and the plain sprite tint exactly as before this version. */
export function getShirtLookFrame(item, pose, dir, frameIdx, look) {
  if (!item || item === 'none' || !look) return null;
  if (!look.art && !look.pattern) return null;
  item = gearArt(item);
  /* ONE cache identity for the whole dressed look.  The drawing is hashed
     because it is 256 characters; the pattern and the tint are already short,
     so they go in as they are and stay readable in the QA sheet dump.
     The mirror flag is part of it too: a mirrored facing bakes a pre-flipped
     print AND a pre-flipped tile, and the two must not share a texture. */
  const ak = (look.art ? artHash(look.art) : 'x')
    + '.' + (look.pattern ? (look.pattern.id + '-' + look.pattern.colorIdx) : 'x')
    + '.' + (look.tint ? look.tint.join('_') : 'x');
  const key = 'shirtart/' + ak + '/' + (look.mirror ? 'm' : 'n') + '/' + item + '/' + pose + '/' + dir;
  const entry = _sheets[key];
  if (entry === undefined) {
    touchArt(ak);
    buildSheet(key, 'shirt', item, pose, dir, 0, {
      art: look.art || null, pattern: look.pattern || null,
      tint: look.tint || null, mirror: !!look.mirror,
    });
    return null;
  }
  touchArt(ak);
  if (entry === 'loading' || !entry.length) return null;
  return entry[((frameIdx % entry.length) + entry.length) % entry.length];
}

/** v2.3.1367: frame by CYCLE PHASE (0..1) instead of a body frame index —
 *  for sheets whose frame count differs from the body cycle's (the east
 *  fullset ships its native 25 frames vs the 28-frame body cycle; owner:
 *  "cut the animation cycle down to the frame count instead of extending
 *  it").  Each sheet frame plays exactly once per cycle, evenly spaced on
 *  the same clock, so there are no held/duplicated frames and no wrap
 *  jump. */
export function getGearFramePhased(slot, item, pose, dir, phase) {
  if (!item || item === 'none') return null;
  item = gearArt(item); /* v2.3.1757: see getGearFrame */
  const key = slot + '/' + item + '/' + pose + '/' + dir;
  const entry = _sheets[key];
  if (entry === undefined) { buildSheet(key, slot, item, pose, dir); return null; }
  if (entry === 'loading' || !entry.length) return null;
  const p = ((phase % 1) + 1) % 1;
  return entry[Math.min(entry.length - 1, Math.floor(p * entry.length))];
}

/* v2.3.1345: the jog chain belt ships as its own gear sheet
   (belt/chainbelt/jog-<dir>.png, generated by tools/gen_jog_belt_table.py,
   clipped to the body silhouette per frame) and loads through the normal
   buildSheet path above — entityRenderer requests
   getGearFrame('belt', 'chainbelt', 'jog', dir, frameIdx) and draws it on a
   dedicated sprite BELOW gearLegs.  A missing sheet degrades gracefully
   (belt hidden; the pants band still covers the seam). */

/** v2.3.1376: preload the pre-composed FULLSET knight figures (jog
 *  south/southwest/north/east) — they replace the whole armored body when
 *  the full steel set is worn, and a lazy first fetch hitched the first
 *  armored jog per direction (animation-preload law, CLAUDE.md v2.3.1358).
 *  Missing dirs (northeast keeps the classic composite) resolve to [] and
 *  cost one 404 at load time. */
export function preloadFullsetFigures() {
  const tasks = [];
  for (const dir of ['south', 'southwest', 'north', 'east']) {
    const key = 'fullset/steel/jog/' + dir;
    if (_sheets[key] === undefined) tasks.push(buildSheet(key, 'fullset', 'steel', 'jog', dir));
  }
  return Promise.all(tasks);
}

/** Unique TextureSources of every gear sheet baked so far (idle/jog stand sets).
 *  Lets the renderer force-GPU-upload them during the loading screen (mirrors
 *  the masked-body uploadBakedTextures) so a first armored turn doesn't pay a
 *  lazy first-draw upload.  All frames of a sheet share one source. */
export function getLoadedGearSources() {
  const sources = new Set();
  for (const entry of Object.values(_sheets)) {
    if (Array.isArray(entry) && entry.length && entry[0] && entry[0].source) {
      sources.add(entry[0].source);
    }
  }
  return sources;
}

/** Pre-bake a slot's spawn-pose sheets (all base dirs) to avoid a first-frame
 *  gap, mirroring playerSkins.prewarmBody. */
export function prewarmGear(slot, item) {
  if (!item || item === 'none') return;
  for (const dir of ['east', 'north', 'northeast', 'south', 'southwest']) {
    const key = slot + '/' + item + '/stand/' + dir;
    if (_sheets[key] === undefined) buildSheet(key, slot, item, 'stand', dir);
  }
}

/** Preload EVERY (pose, dir) sheet for EVERY catalog gear item so the
 *  armoured figure never falls back to the bare body when the player first
 *  turns/jogs in a fresh direction (the gear sheets were previously lazy-
 *  loaded on first use, which read as an armour->unarmoured flicker).
 *  Returns a promise that resolves once all sheets are baked (or 404'd).
 *  Poses limited to those the gear set actually ships to avoid spurious 404s.
 *  v2.3.1477: + 'hit' — the 250 ms recoil now ships chest/legs sheets for all
 *  five base dirs, and a lazy first fetch would drop the armour for the whole
 *  first hit (animation-preload law, CLAUDE.md). */
export function preloadGear() {
  const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
  /* (pose, dirs) pairs, not pose x dirs: the gather poses are authored
     south-only, so v2.3.1478's mine sheets would 404 four times per slot on
     every load if they rode the full DIRS loop. */
  const SETS = [['stand', DIRS], ['jog', DIRS], ['hit', DIRS],
    ['mine', ['south']]];
  const tasks = [];
  for (const slot of GEAR_SLOTS) {
    /* v2.3.1197: preload EVERY catalog item per slot, not just the currently
       equipped one. Equipping owned armour after spawn used to fetch+slice the
       sheet on the main thread (the equip stutter / armour flicker). The gear
       catalog is tiny (one armour set), so this adds little to the loading
       screen and matches what preloadCombatGear() already does for swings. */
    /* v2.3.1757: a recoloured variant preloads its DONOR art, so a new metal
       adds nothing to the loading screen — the sheets are already in flight for
       the piece it borrows from, and the seen-check below drops the duplicate.
       This is what makes the material pipeline free against the preload law
       (CLAUDE.md): there is no new asset to register. */
    for (const c of (GEAR_CATALOG[slot] || [])) {
      const item = c && gearArt(c.id);
      if (!item || item === 'none') continue;
      for (const [pose, dirs] of SETS) {
        for (const dir of dirs) {
          const key = slot + '/' + item + '/' + pose + '/' + dir;
          if (_sheets[key] === undefined) tasks.push(buildSheet(key, slot, item, pose, dir));
        }
      }
    }
  }
  return Promise.all(tasks);
}
