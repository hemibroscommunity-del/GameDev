/* ═══ PLAYER ACTIONS — swing / special attack / shield raise ═══ */
/* v2.3.819: moved verbatim from the useCallback bodies in
   src/ui/BroTown.jsx (behavior-frozen). These were `useCallback`s that
   read `stateRef.current`; the component keeps thin useCallback wrappers
   (so referential identity for JSX/handlers is unchanged) and the bodies
   live here as `(S, …)` functions — S is stateRef.current passed at call
   time, identical to the originals. specialAttack's one
   `stateRef.current._tutorialStep` read became `S._tutorialStep` (same
   object). raiseShield takes setShieldUp via deps (its only React
   setter). All other references are module imports below. */
import { STAFF_RANGE_PX, staffRangeMult, bowRangeMult, STAFF_BIG_BOLT_ORBS, STAFF_BIG_BOLT_BAND } from '@/data/gameSystems.js'; /* v2.3.2387; v2.3.2592: the RANGE stat; v2.3.2842: the one-bolt special; v2.3.2849: its band */
import { depthK } from '@/data/zones.js';   /* v2.3.2790 */
import { ARROW_SPEED_PX } from '@/game/projectiles.js';   /* v2.3.2848: the volley's stagger is sized from it */
import { BOW_VOLLEY, newVolley, volleyDelayMs } from '@/game/bowVolley.js';   /* v2.3.2848 */
import { SWING_COOLDOWN, weaponSwingMult, SPECIAL_ATK_MULT, specialAtkMultFor, BT_AUDIO, meleeSwingSfx, getActiveWeapon, calcSpecialDmg, calcWeaponDmg, swingCooldownMult, specialManaCost, burstRefusal, burstWeapon, PROG3, ELEMENTS, LEGACY_BURST_MIN_CHAR_LEVEL } from '@/data/index.js';
import { addBuildUse, clearSwingHitFlags, pushDmgPopup, isPlayerDead, lockShotPoint } from '@/game/combatHelpers.js';   /* v2.3.2845: lockShotPoint, the torso */
import { dropShield } from '@/game/shieldToggle.js'; /* v2.3.2248: attacking breaks the hold */

export function swingAttack(S) {
    /* v2.3.1473: a corpse doesn't swing (see isPlayerDead). */
    if (isPlayerDead(S)) return;
    /* v2.3.1500 (owner): no attacking while a life-skill animation is
       playing.  The harvest pose and a swing pose are the same body, so a tap
       mid-chop used to swap the character to a swing for a frame and leave the
       harvest running underneath. */
    if (S._extraction) return;
    /* ═══ v2.3.2246: YOU DO NOT SWING AND BLOCK AT THE SAME TIME ═══
       Owner: "you can both swing and block at the same time. That is not
       right."  This overrules control-redesign.md §5.4, which allowed it on
       the argument that the two controls no longer share one stick.  Held
       here (and in specialAttack, and at the auto-attack gate in
       monsterCombat) rather than in the button handler for the same reason
       the _extraction gate above is: this loop is what fires bow and staff
       shots, so gating only the press would have left ranged builds
       shooting from behind a raised shield.
       The other half of the exclusion is in shieldToggle.raiseShieldToggle,
       which cancels an attack already in flight -- so whichever of the two
       the player asks for LAST is the one they get.

       ═══ v2.3.2248: ATTACKING BREAKS THE HOLD, IT NO LONGER BOUNCES ═══
       Owner: "the shield just stays up until you attack (thus breaking the
       shield hold) or you tap the shield button again."  So this stopped
       being a REFUSAL and became a TRANSITION: the guard comes down and the
       swing goes through on the same press, rather than the press being
       swallowed and the player pressing twice.

       The exclusion the owner asked for in v2.3.2246 is untouched by that --
       the shield is down BEFORE the swing starts, so the two still never
       overlap for a single frame.  What changed is which one yields. */
    if (S._shieldUp) dropShield(S, 'attack');

    /* v2.3.1134: the manual tap gate honors Tempo like the auto-attack loop
       does, else tap-attackers get no benefit from the channel.  (The amulet
       atkSpd bonus was never applied here — unchanged, out of scope.) */
    if (!S.rpg || Date.now() - S.swingTimer < SWING_COOLDOWN * swingCooldownMult(S.rpg) * weaponSwingMult(S.rpg && S.rpg.activeSlot)) return;   /* v2.3.2265: the bow's 25% */
    if (S._playerStunUntil && Date.now() < S._playerStunUntil) return;
    var slot = S.rpg.activeSlot || 'melee';
    /* Ranged/staff: let the auto-attack loop fire the projectile on the
       next frame so the first shot matches the equipped weapon. Resetting
       swingTimer here would force a melee swing AND delay the projectile
       by the full swing cooldown. */
    if (slot === 'ranged' || slot === 'staff') return;
    /* v2.3.1682 (owner: "the character can still make an initial swing
       without a sword").  The auto-attack loop has refused to fire on an
       empty slot since v2.3.212 (monsterCombat's `_eqWpn` gate), but this
       MANUAL tap path never checked -- so a weaponless character could tap
       out one full swing (animation, sfx, hit sweep) and only the FOLLOW-UP
       swings were suppressed by the loop.  That read as "the first swing is
       free" and became visible to everyone once v2.3.1676 made every fresh
       character start with all three weapon slots empty.
       Only the melee arm needs the check here: ranged/staff returned above
       and are gated in the loop.  S.rpg.weapon mirrors what getActiveWeapon
       resolves for the melee slot. */
    if (!S.rpg.weapon) return;
    S.swingTimer = Date.now();
    S.isSwinging = true;
    S._specialAttack = false;
    clearSwingHitFlags(S); /* v2.3.1421: fresh dedup per swing (quick re-tap fix) */
    /* v2.3.1798: rotate the owner's three swing samples (level-matched in
       BT_AUDIO.swordSwing); bamboo keeps its own.
       v2.3.2450: the whoosh fires on the first tick of the swing, not at
       contact — monsterCombat plays the pending flag as soon as it sees it.
       v2.3.2202 had deferred it to the contact frame to re-stack it with the
       hit, which was right while both were percussive metallic samples and
       wrong once one of them is a whoosh: the sound of a blade travelling
       has to start when the blade starts, or its body lands after the
       impact (owner: "it plays the sound after the hit so it's delayed").
       The flag is still a flag rather than a play() here, so raising the
       shield in the same frame can still cancel it. */
    S._swingSfxKey = meleeSwingSfx(S.rpg);
    S._swingSfxPending = true;
}

export function specialAttack(S) {
    if (!S.rpg) return;
    /* v2.3.1473: no specials during the death animation either. */
    if (isPlayerDead(S)) return;
    /* v2.3.1500 (owner): no attacking while a life-skill animation is
       playing.  The harvest pose and a swing pose are the same body, so a tap
       mid-chop used to swap the character to a swing for a frame and leave the
       harvest running underneath. */
    if (S._extraction) return;
    /* v2.3.2246: ...and no special from behind a raised shield either (see
       swingAttack above).  The flick lives on the same button as the swing,
       so exempting it would just move the owner's complaint.
       v2.3.2248: and like the swing, it now BREAKS the hold rather than
       bouncing off it -- a special is an attack, and the owner's rule names
       attacking as the thing that ends a block. */
    if (S._shieldUp) dropShield(S, 'attack');

    var R = S.rpg;
    var now = Date.now();

    /* ═══ v2.3.2473: A BOW SPECIAL WAITS FOR THE LINE, IT IS NOT WASTED ═══
       Owner (backlog §2.5): with the bow now only loosing when its sight line
       is on something (monsterCombat's gate), "a pressed special sets a flag
       consumed at that same site so it fires on the next lined-up shot."

       ABOVE EVERY REFUSAL AND EVERY SPEND, deliberately: a queued special has
       not happened yet, so it must not take the mana, must not start the 1.5s
       cooldown and must not stamp the swing clock.  All three are charged when
       it actually goes out, because the fire site calls this function AGAIN on
       the frame the line lands -- by then `_bowSight.d` is a number, this
       branch is skipped, and the ordinary body below charges for a special
       that is genuinely leaving.

       BELOW the shield drop, though, and that is not an accident: pressing the
       special is a request to attack whatever else happens, and "attacking" is
       the owner's own first-named exit from a raised guard.  A queue that left
       the shield up would also never fire, since the fire gate refuses while
       `_shieldUp`.

       BOW ONLY.  The staff is not gated by the sight line (its bolts splash
       and home), and melee has no line to speak of, so neither can ever be in
       a state this would defer.  `_bowSight` is null on those weapons anyway,
       which is why the slot is tested rather than the field. */
    if ((R.activeSlot === 'ranged') && !(S._bowSight && S._bowSight.d != null)) {
      S._bowSpecialQueued = now;
      /* ═══ v2.3.2543: THE QUEUE IS SHOWN ON THE BUTTON, NOT SAID IN A POPUP ═══
         Owner, after playing the merged rework: swiping the bow's special on a
         monster "often pops a message saying the ability is queued", and "the
         player does not need telling every time; they swiped, they expect a
         shot."

         v2.3.2473 floated a 'Lining up...' popup here for a good reason, which
         still holds: a control that silently does nothing is indistinguishable
         from a broken one, and that is the courtesy the no-weapon and no-mana
         refusals get.  What was wrong was the FORM, not the feedback.  Those
         two refusals are dead ends -- the press achieved nothing and the player
         must change something -- so a one-off message is the right shape for
         them.  A queued special is the opposite: it is a request that is still
         alive and about to be granted, so its feedback belongs in the STATE of
         the control that is holding it, where the player can glance at it, and
         not in a line of text over their character that they must read while
         aiming.  A popup per swipe is also per SWIPE: the flick is the fastest
         input in the game and the owner can issue several a second.

         So the feedback moved rather than being deleted: SpecialButton reads
         `_bowSpecialQueued` (through specialQueued(), which applies the same
         BOW_SPECIAL_QUEUE_MS expiry the fire site does) and holds a brass ring
         and an AIM label for as long as the request stands.  See its header.

         Worth recording that this is now a RARE state as well as a quiet one.
         The reason the message fired so often was item 1 of the same report:
         the gate was testing a ray from wherever the player last fired, so a
         special swiped with the line plainly on a monster queued instead of
         firing, and kept queueing until the player walked back. With the gate
         reading the live grip (bowGripPoint, combatHelpers) a swipe that looks
         on target IS on target, and the queue resolves on the next frame.  It
         still earns a visible state: the genuine case it was built for -- a
         special pressed while the line is on empty ground -- is unchanged. */
      return;
    }
    /* A special that IS firing consumes any standing request, so a queued one
       cannot go off a second time behind it. */
    S._bowSpecialQueued = 0;

    /* §4.5 Swipe cooldown check */
    if (now - (S._lastSwipe || 0) < 1500) return;

    /* §4.5 Mana cost.
       v2.3.172: cost = floor(maxMana / 5) so the 5-segment MP bar
       drained exactly one segment per special.  Tier still affects
       damage via SPECIAL_ATK_MULT downstream; it no longer affects
       cost.  Old formula was `15 + tierIdx * 3` (15-24).
       v2.3.1734: FLAT (PROG3.SPECIAL_MANA_COST) against a worker that
       advertises caps.elemBurst.  A cost that was a fraction of max
       meant five casts per bar at Magic 1 and five at Magic 100 —
       training Magic bought nothing.  specialManaCost() keeps the old
       formula against an old worker so the prediction still matches
       what THAT worker charges (rule 19); see src/data/prog3.js. */
    var activeWpn = getActiveWeapon(R);
    /* v2.3.212: no weapon equipped in active slot -> special disabled.
       v2.3.1716: ...but SAY SO.  This returned in total silence, and since
       v2.3.1715 the desktop hints strip advertises "R-Click Special" and
       "F Special" on screen, so a new player reads those, presses them at
       spawn with an empty slot, and gets nothing at all -- indistinguishable
       from a broken game.  A fresh character IS bare (weapons start in the
       bag, unequipped), so this is the FIRST thing a new player hits.  The
       no-mana branch a few lines below already floats a popup; this is the
       same courtesy for the other refusal. */
    if (!activeWpn) {
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'No weapon equipped!', '#D8A94D', { ts: now });
      return;
    }
    var tierIdx = {
      common: 0,
      elemental: 1,
      fusion: 2,
      shift: 3
    }[activeWpn.tier] || 0;
    var manaCost = specialManaCost(R);
    /* During tutorial step 4, make swipe free so player can learn */
    var isTutorialSwipe = (S._tutorialStep || 0) === 4;
    if (!isTutorialSwipe && (R.mana || 0) < manaCost) {
      pushDmgPopup(S, S.player.x, S.player.y - 30, 'No mana!', '#3498DB', { ts: now });
      return;
    }
    if (!isTutorialSwipe) {
      /* Server-authoritative mana in MP: predict the deduction locally
         for snappy bar feedback, then send ability_use so the worker
         validates + applies.  player_state arrives shortly with the
         authoritative value. */
      R.mana -= manaCost;
      /* v2.3.1702: `_serverMonsters` removed — it is a "this zone's monsters
         are server-driven" flag, FALSE in town and in every hub, so the
         worker never heard about a special / dodge / lunge / retreat used
         there.  The client predicted the spend, the worker's pool never
         moved, and its next player_state echo refunded it: a free ability
         anywhere outside a spoke zone.  _handleAbilityUse is zone-agnostic
         (it only reads the pool), so `S.channel` is the whole gate. */
      if (S.channel) {
        try { S.channel.send({ type: 'ability_use', payload: { type: 'swipe', tier: tierIdx } }); } catch (e) {}
      }
      /* GDD §1.2 Mind: spending mana on swipe triggers. */
      addBuildUse(R, 'mind', manaCost);
    }
    S._lastSwipe = now;
    S._hasUsedSwipe = true;
    /* ═══ v2.3.2464: THE SPECIAL IS THIS BEAT'S ATTACK, NOT AN EXTRA ONE ═══
       Owner: "is there a way to disable a normal attack that flies along with
       a special attack?  When I do the special attack it's usually a normal
       attack and special attack bundled together (happens to both magic and
       bow)."

       It was both of those weapons and never the sword, and the reason is two
       lines apart in this function.  The MELEE arm below stamps
       `S.swingTimer = now` -- it has to, because the swing animation and the
       hit sweep are driven off that clock.  The BOW and STAFF arms push their
       projectiles straight into S.arrows and never touched it.

       And `S.swingTimer` is exactly what the auto-attack loop's cadence gate
       reads (monsterCombat.js `Date.now() - S.swingTimer >= effectiveSwingCd`).
       So for a ranged or staff build the special left that gate wide open and
       the loop fired an ORDINARY shot beside it on the next frame it was
       eligible -- which, since the loop runs whenever the player is holding
       attack or is engaged, is the whole of a fight.  That is the "usually".
       Measured before the fix (tools/qa/mp/mp-solospecial.mjs): one press of
       the bow special put 1 special arrow and 2 ordinary ones in the air; one
       press of the magic special put 3 orbs and 1 ordinary bolt.

       Stamped HERE rather than in each arm, and stamped as the ordinary swing
       clock rather than as a new suppression flag: the cadence that decides
       when the next normal shot may go out is the thing that should have been
       spent, so spending it is the fix.  The melee arm re-stamps the identical
       value a few lines down (same `now`), so nothing about the sword moves.

       Above every refusal gate this is not: `_lastSwipe` is the commit point,
       so by this line the special is paid for and certain to fire.  A special
       that was refused never reaches here and never spends the swing. */
    S.swingTimer = now;
    var hasElement = activeWpn.element2 || activeWpn.element1;
    /* Aim direction — use finger swipe direction from right joystick, or locked target, or facing */
    /* ═══ v2.3.2260: THE SPECIAL HAD ITS OWN FALLBACK, AND IT WAS DUE EAST ═══
       The comment above says "or facing" and the code never did: `|| 0` is 0
       RADIANS, so a bow or magic player who had never dragged the right stick
       and had no lock fired every special horizontally, to the right.  That is
       the second half of the owner's "stuck in a straight path either
       vertically or horizontally" -- the ordinary auto-attack supplied the
       vertical-or-horizontal (monsterCombat's 4-way `_facing` fallback) and
       THIS supplied the horizontal, by a different code path with a different
       floor, in the same fight.
       Fixing only the auto-attack would have left the specials pointing east,
       which is why this is here and not in a follow-up.  Same ladder as the
       fire site and as the renderer's own body-facing: the aim you last set,
       else the smoothed continuous heading, and 0 only if the player has
       genuinely never faced anywhere.  The lock override below still wins. */
    /* v2.3.2261: ...and the same ladder as the fire site, for the same reason --
       a lock-derived _aimAngle outlives its monster and nothing ever nulls it,
       so a stale read of it fires the special at a ghost.  _lastAimAngle is the
       player's own stick and only that. */
    var aimAng = (S._aiming && S._aimAngle != null) ? S._aimAngle
      : (S._lastAimAngle != null) ? S._lastAimAngle
      : (typeof S._facingAngle === 'number' ? S._facingAngle : 0);
    /* v2.3.1111: aim at the body centre (see monsterCombat aim note).
       v2.3.1979: through lockAimPoint, which reads the RENDERED position the
       hit-test uses and returns null (rather than the world origin) when the
       target has no usable position.  Both specials launch from the player at
       dist 14 -- no grip offset to correct for, unlike the auto-attack. */
    /* v2.3.2845: at the torso, as every locked shot is (combatHelpers lockShotPoint) */
    var _sLock = lockShotPoint(S.lockedTarget && S.lockedTarget.ref, S.currentZone);
    if (_sLock) aimAng = Math.atan2(_sLock.y - S.player.y, _sLock.x - S.player.x);
    if (activeWpn.type === 'bow') {
      /* BOW heavy — large elemental arrow in swipe direction.  Renders
         in effectsRenderer as a regular arrow with a bright halo ring;
         no `ice` flag (that flag is the "draw as orb" toggle and is
         reserved for staff/ice specials now).  pierce:true keeps the
         arrow alive after each hit so it travels through every monster
         it overlaps -- hitIds prevents double-hits on the same target. */
      if (!S.arrows) S.arrows = [];
      /* v2.3.234 (Phase 4): specials scale with Mind, not weapon stat. */
      var wpnDmg = calcSpecialDmg(activeWpn.type, R || {}, activeWpn.tierMult, activeWpn);
      /* v2.3.1402 (owner): capture a NORMAL bow hit's damage at fire time
         so the landed arrow's lingering ground-tick (projectiles.js) deals
         base damage, immune to a later weapon swap. */
      var _bowBase = Math.max(1, Math.round(calcWeaponDmg(activeWpn.type, R || {}, activeWpn.tierMult, activeWpn)));
      var _bowFull = Math.round(wpnDmg * specialAtkMultFor('bow', R || {})); /* v2.3.1397: bow special 3x (owner); v2.3.2592: × the SPECIAL stat */
      /* ═══ v2.3.2848: THREE WHITE-HOT ARROWS, ONE SHOT ═══
         Owner: "the bow special should be 3 white hot arrows that follow each
         other closely.  One shot for all 3 arrows" -- a third of the damage
         each, and "Burn, but no blast".  The rules the three share (one
         train, one burn, one shove) are in bowVolley.js.
         GATED ON THE WORKER, the whole volley and never a part of it: each
         arrow tells the worker `part: 3` (projectiles.js) and only a worker
         advertising caps.bowvolley divides by it.  Against an OLD worker this
         is still the one arrow with its burn and its blast, because that
         worker would roll all three at full strength.
         ONE PRESS, ONE PRICE: the mana, the cooldown and the swing clock above
         are spent once, for the volley. */
      var _bowVolley = !!(S._serverCaps && S._serverCaps.bowvolley);
      var _bowN = _bowVolley ? BOW_VOLLEY.N : 1;
      var _bowVol = _bowVolley ? newVolley() : null;
      var _bowStat = bowRangeMult(R || {}) || 1;
      var _bowRange = _bowStat * depthK(S.currentZone, S.player.y);
      /* v2.3.2891: a volley flies slower than a plain arrow (BOW_VOLLEY.SPEED_K)
         so its three arrows read as three; a lone arrow (old worker) keeps the
         bow's own speed */
      var _bowSpd = _bowVolley ? ARROW_SPEED_PX * _bowRange * BOW_VOLLEY.SPEED_K : null;
      for (var bvi = 0; bvi < _bowN; bvi++) {
        S.arrows.push({
          ang: aimAng,
          dist: 14,
          /* v2.3.2848: sized from the arrow's own speed so the train is GAP_PX
             apart however fast Longshot makes it (projectiles.js catches the
             frame it overstays back up).  v2.3.2891: from the speed it really
             flies at, `speedPx` */
          launchDelayMs: volleyDelayMs(bvi, _bowSpd || ARROW_SPEED_PX * _bowStat),
          speedPx: _bowSpd,
          dmg: _bowVolley ? Math.max(1, Math.round(_bowFull * BOW_VOLLEY.WORTH / BOW_VOLLEY.N)) : _bowFull,   /* v2.3.2848: a third each; v2.3.2849: two-thirds (the volley is worth WORTH specials) */
          part: _bowVolley ? BOW_VOLLEY.N : 0,   /* v2.3.2848: the worker gives each arrow WORTH / part of its own roll (v2.3.2849) */
          volley: _bowVol, volleyIx: bvi,
          baseDmg: _bowBase, /* v2.3.1402: lingering ground-tick base damage */
          life: 150, /* v2.3.1335: range -25% (the 675px plant cap governs reach) */
          maxLife: 150,
          hitIds: new Set(),
          isSpecial: true,
          isStaff: false,
          pierce: true,
          _rangeMult: _bowRange, /* v2.3.2592: the special reaches as far as an ordinary arrow does; v2.3.2790 x depth */
          element: hasElement || null
        });
      }
      /* v2.3.840: broadcast the bow special so peers see the big golden
         arrow fly (mirrors the regular-arrow player_projectile path).
         v2.3.2848: one per arrow of the volley, staggered on the peer's own
         arrow speed (BOW_VOLLEY.PEER_PX_PER_FRAME) so the gap they see is the
         gap you see -- the staff volley's `delayMs` (v2.3.2259), which a peer
         already honours for any projectile. */
      if (S.channel) {
        for (var bvj = 0; bvj < _bowN; bvj++) {
          S.channel.send({ type: 'broadcast', event: 'player_projectile', payload: {
            id: S.myId, x: Math.round(S.player.x), y: Math.round(S.player.y), ang: aimAng, isStaff: false, isSpecial: true, ts: now, el: hasElement || undefined,   /* v2.3.2919: the element these shots are drawn in (hasElement above: the second element first); see monsterCombat's player_projectile */
            delayMs: Math.round(volleyDelayMs(bvj, BOW_VOLLEY.PEER_PX_PER_FRAME)),
            volley: _bowVolley ? 1 : undefined,   /* v2.3.2849: additive -- a peer burns it out on the volley's 2.5 s, not the lone arrow's 4 */
            life: Math.round(90 * _bowStat * depthK(S.currentZone, S.player.y)), /* v2.3.2592: peers see the stat's reach too; v2.3.2790 x depth */
          }});
        }
      }
      BT_AUDIO.beep(400, 0.12, 0.15, 'sine');
      setTimeout(function () {
        return BT_AUDIO.beep(600, 0.08, 0.1, 'sine');
      }, 60);
    } else if (activeWpn.type === 'staff') {
      /* STAFF heavy — burst of 3 projectiles in a cone.  isStaff:true so
         the hit handler picks the 'spell' popup icon (vs 'arrow' for
         bows) and the projectile renders as magic, not a physical arrow. */
      if (!S.arrows) S.arrows = [];
      /* v2.3.234 (Phase 4): staff special damage scales with Mind. */
      var _wpnDmg = calcSpecialDmg(activeWpn.type, R || {}, activeWpn.tierMult, activeWpn);
      /* v2.3.1426: the v2.3.1425 stuck-orb chip base is retired -- the
         owner meant the BOW special sticks (projectiles.js), and its
         _bowBase above already carries the chip base.  Orbs die on
         their first hit again. */
      /* ═══ v2.3.2259: ONE LINE, THREE ORBS, THREE HITS ═══
         Owner: "Instead of the current behavior I want the 3 orbs to follow
         the same linear path in quick succession.  So that way a monster can
         get hit 3 times in a row with the orbs instead of it going 3
         different directions."

         TWO things made the cone a cone, and a change to either one alone
         does nothing:
           - the ±0.25 rad fan on `ang`, now one shared aim angle;
           - `volleyHitIds` (v2.3.1435), a hit set SHARED by the three orbs
             so a monster could eat at most ONE of them.  That was the answer
             to "magic special is overpowered — often 4 hits on one monster",
             and it is exactly the behaviour being asked back for now, so the
             shared set is gone.  Each orb keeps its own `hitIds`, which is
             what stops one orb hitting one monster twice.

         SUCCESSION IS A LAUNCH DELAY, NOT A TIMER.  Each orb waits
         ORB_GAP_MS longer than the one before at the caster's hand
         (projectiles.js honours `launchDelayMs`), so they peel off in order
         ~100 ms apart along the same ray.  setTimeout would have spawned the
         trailing orbs into whatever zone and state the player was in 100 ms
         later — three arrows born on one frame cannot.

         THE SERVER WAS ALREADY SIZED FOR THIS, which is why no mirror moves:
         combat.js's special hit-cadence lane allows 3 hits per 1200 ms per
         monster and its own comment names this exact case ("a 3-bolt cone
         that can land all 3 on one target within ~100ms").  Checked, not
         assumed. */
      var _ORB_GAP_MS = 200;   /* v2.3.2464: 100 -> 200, the owner's "one every .2 seconds" */
      /* ═══ v2.3.2464: EVENLY SPACED, WHICH TAKES BOTH HALVES ═══
         Owner: "I want magic special to change to 3 evenly spaced out orbs.
         Maybe like one every .2 seconds until it hits the 3rd orb."

         This replaces v2.3.2262's "first orb fast, second medium, third slow"
         (speeds 8 / 5 / 3.2), and BOTH numbers have to move or the ask is not
         met.  An even launch gap on uneven speeds is a fan, not a line: the
         orbs leave 200ms apart and then keep drawing apart for the whole
         flight, because the lead one is travelling 2.5x the speed of the tail.
         Measured on the old constants at ~1s of flight: gaps of 132px and 84px
         between consecutive orbs, from a volley that left evenly.

         So: ONE speed, and the spacing is the launch stagger alone -- which is
         then constant for the whole flight, which is what "evenly spaced"
         means.  At 5 px/frame and 200ms that is 60px of daylight between
         orbs, held all the way out.

         THE SPEED IS THE STAFF'S OWN, not a new number.  An ordinary staff
         bolt flies at 5 (projectiles.js: `a.isStaff ? 5 : 8`), so the special
         now reads as three of YOUR orbs launched a fifth of a second apart,
         rather than three orbs that behave like nothing else the staff fires.
         It is also the one constant here a reader can change alone: raise it
         and the volley snaps, and the spacing stays even either way.

         RANGE IS HELD EQUAL, and now trivially so.  `life` is spent in TICKS,
         so the old three speeds each needed their own life solved from the
         same reach or the slow orb would have died short -- a spacing request
         turning into a range nerf on the third hit.  With one speed there is
         one life and all three plainly reach STAFF_RANGE_PX.

         THE SERVER NEEDS NO MIRROR, checked rather than assumed.  Its special
         lane admits 3 hits per 1200ms per monster (combat.js): the filter
         drops stamps older than 1200ms and refuses at >=3, so exactly three
         pass.  At a typical 200px engagement the orbs now land about 0.67s,
         0.87s and 1.07s out -- a 400ms spread where the old spread was 820ms,
         so all three stamps are live at once where the first used to have aged
         out.  Three is still three, and the next cast is 1500ms away behind
         the swipe cooldown, by which time the first stamp has expired. */
      /* v2.3.2387: 560 -> STAFF_RANGE_PX (675), so the special reaches exactly
         as far as the basic orb and as far as an arrow. */
      var _ORB_RANGE_PX = STAFF_RANGE_PX * staffRangeMult(R || {}) * depthK(S.currentZone, S.player.y); /* v2.3.2592: × the Magic lane's RANGE stat; v2.3.2790: × your depth */
      var _ORB_SPEED = 5;              /* the staff's own bolt speed */
      var _ORB_SPEEDS = [_ORB_SPEED, _ORB_SPEED, _ORB_SPEED];
      /* ═══ v2.3.2842: ONE BIG BOLT (gameSystems STAFF_BIG_BOLT_*) ═══
         Owner: "Instead of the current special attack with 3 orbs I want to
         see what just one moderately larger bolt attack would look like."
         The basic bolt's own art and flight, drawn STAFF_BIG_BOLT_SCALE
         bigger, leaving the crystal with a heavier kick and release
         (staffCastFx).  Same speed and reach as the orbs it replaces, so
         nothing about where the special can land moves.
         Its damage is the three orbs' damage: `dmg` here is the local number
         (client-only zones and a duel's dmgBase), `orbs` tells the worker how
         many special rolls to sum.  ONLY against a worker that says it can
         (caps.bigorb): an older one would roll this as one orb, a third of the
         special, so there the volley below still fires. */
      if (S._serverCaps && S._serverCaps.bigorb) {
        var _bigLife = Math.round(_ORB_RANGE_PX / _ORB_SPEED);
        S.arrows.push({
          ang: aimAng,
          dist: 14,
          speedPx: _ORB_SPEED,
          /* v2.3.2849: one draw from the bolt's own band, the worker's shape */
          dmg: Math.round(calcSpecialDmg('staff', R || {}, activeWpn.tierMult, activeWpn, STAFF_BIG_BOLT_BAND) * specialAtkMultFor('staff', R || {}) * STAFF_BIG_BOLT_ORBS),
          life: _bigLife,
          maxLife: _bigLife,
          hitIds: new Set(),
          isSpecial: true,
          isStaff: true,
          big: true,
          orbs: STAFF_BIG_BOLT_ORBS,
          element: hasElement || null
        });
        /* The staff kicks and the crystal flashes (entityRenderer, staffCastFx),
           the basic cast's stamps -- plus _staffCastBig, which makes it the
           heavy version.  NOT S.swingTimer's job: that clock is the special's
           own spend (v2.3.2464, above) and already stamped. */
        S._staffCastAt = now;
        S._staffCastAng = aimAng;
        S._staffCastBig = now;
        if (S.channel) {
          S.channel.send({ type: 'broadcast', event: 'player_projectile', payload: {
            id: S.myId, x: Math.round(S.player.x), y: Math.round(S.player.y), ang: aimAng, isStaff: true, isSpecial: true, el: hasElement || undefined,   /* v2.3.2919: the element these shots are drawn in (hasElement above: the second element first); see monsterCombat's player_projectile */
            big: true,   /* additive: an older peer draws one charged orb, which is what one bolt is */
            speedPx: _ORB_SPEED,
            life: _bigLife,
            ts: now
          }});
        }
        BT_AUDIO.beep(420, 0.18, 0.2, 'square');
        setTimeout(function () {
          return BT_AUDIO.beep(620, 0.12, 0.14, 'square');
        }, 60);
        S.screenShake = 4;
      } else {
        /* The three-orb volley: an older worker, which has no caps.bigorb. */
        for (var si = 0; si < 3; si++) {
          var _spd = _ORB_SPEEDS[si];
          var _life = Math.round(_ORB_RANGE_PX / _spd);
          S.arrows.push({
            ang: aimAng,
            dist: 14,
            launchDelayMs: si * _ORB_GAP_MS,
            speedPx: _spd,
            dmg: Math.round(_wpnDmg * specialAtkMultFor('staff', R || {})), /* v2.3.1397: 2x per orb, 0.6 haircut dropped (owner); v2.3.2592: × the SPECIAL stat */
            life: _life,      /* v2.3.1335's 560px reach, solved per speed */
            maxLife: _life,
            hitIds: new Set(),
            isSpecial: true,
            isStaff: true,
            element: hasElement || null,
            ice: true
          });
        }
        /* v2.3.840: broadcast the staff special so peers see it.
           v2.3.2259: same ray, same stagger — `delayMs` rides the payload so a
           peer's three orbs arrive in the same order yours do.  Additive field:
           an older client ignores it and draws all three at once, which is what
           it drew before. */
        if (S.channel) {
          for (var _bcj = 0; _bcj < 3; _bcj++) {
            S.channel.send({ type: 'broadcast', event: 'player_projectile', payload: {
              id: S.myId, x: Math.round(S.player.x), y: Math.round(S.player.y), ang: aimAng, isStaff: true, isSpecial: true, el: hasElement || undefined,   /* v2.3.2919: the element these shots are drawn in (hasElement above: the second element first); see monsterCombat's player_projectile */
              delayMs: _bcj * _ORB_GAP_MS,
              speedPx: _ORB_SPEEDS[_bcj],   /* v2.3.2262: peers see the same fast/medium/slow spread */
              life: Math.round(_ORB_RANGE_PX / _ORB_SPEEDS[_bcj]), /* v2.3.2592: ...and the same reach */
              ts: now
            }});
          }
        }
        BT_AUDIO.beep(500, 0.15, 0.18, 'square');
        setTimeout(function () {
          return BT_AUDIO.beep(700, 0.1, 0.12, 'square');
        }, 50);
        S.screenShake = 3;
      }
    } else {
      /* SWORD/GREATSWORD heavy — melee elemental swing */
      S.swingTimer = now;
      S.isSwinging = true;
      S._specialAttack = true;
      clearSwingHitFlags(S); /* v2.3.1421: the special is a NEW swing — without this a special fired <450ms after a normal swing inherited its "already hit" flags and never registered (owner report) */
      if (hasElement) S._iceAttack = true;
      /* Broadcast the special swing so peers render the wider arc +
         gold halo.  The regular auto-swing broadcast path is skipped
         because isSwinging is already true here. */
      if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_swing', payload: { id: S.myId, ts: now, special: true, wpn: (activeWpn && activeWpn.type) || 'sword', ang: aimAng } });
    }

    /* ═══ v2.3.1798: THE SPECIAL HAS A REAL SOUND ═══
       Owner supplied it: "The last one is special attack sound."
       This replaces a three-beep sawtooth/square arpeggio — a synth stand-in
       from before there were samples for any of this.  It fires for EVERY
       weapon, which is what the old arpeggio did: the per-weapon layers a few
       lines up (the bow's two sine beeps, the staff's) are flavour on top and
       are left alone, so a bow special still reads as a bow. */
    BT_AUDIO.specialSwipe({ vol: 0.55 });
}

export function raiseShield(S, deps) {
  var setShieldUp = deps.setShieldUp;
    var now = Date.now();
    if (S._shieldCdUntil && now < S._shieldCdUntil) return;
    if ((S._shieldStamina || 3000) <= 0) return;
    /* v2.3.212: no shield equipped -> block is disabled. */
    if (!S.rpg || !S.rpg.shield) return;
    S._shieldUp = true;
    setShieldUp(true);
    S.shieldActive = now;
    if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_shield', payload: { id: S.myId, up: true }});
    BT_AUDIO.beep(500, 0.1, 0.15, 'sine');
    setTimeout(function () {
      return BT_AUDIO.beep(700, 0.08, 0.1, 'sine');
    }, 60);
    /* Cooldown starts when shield drops (on touch release) */
    setTimeout(function () {
      return BT_AUDIO.beep(1000, 0.12, 0.08, 'sine');
    }, 120);
}

/* ═══ v2.3.1734: ELEMENT BURST (COMBAT-OVERHAUL-PLAN PR 6) ═══
 *
 * Cast your weapon's element as a short-range nova.  100% SERVER-RESOLVED:
 * this function spends no mana locally, rolls no damage, and picks no
 * targets — it sends an EMPTY `element_burst` and the worker does all of
 * it (server/src/burst.js).  That is a deliberate departure from the
 * special attack's predict-then-send shape.  The special predicts because
 * it has an animation to start on the same frame as the tap; the burst's
 * whole visual is the nova ring, which arrives with the server's
 * `element_nova` a round-trip later, so predicting anything here would
 * only create a second source of truth to disagree with.
 *
 * The refusal popups mirror v2.3.1716's lesson: a control that does
 * nothing and says nothing is indistinguishable from a broken game, and
 * this one is doubly at risk because it is gated on THREE things a new
 * player has no reason to connect (character level, an enchanted weapon,
 * mana).  The button is normally hidden when ineligible — these fire for
 * the desktop key, which is always live.
 */
export function elementBurst(S) {
  if (!S || !S.rpg) return;
  if (isPlayerDead(S)) return;
  if (S._extraction) return;   /* parity with swing/special */
  var R = S.rpg;
  var now = Date.now();
  var wpn = burstWeapon(R);   /* NOT getActiveWeapon — see burstWeapon's note */
  var refusal = burstRefusal(R, wpn, S._lastBurstAt);
  if (refusal) {
    var msg = {
      caps: null,   /* old worker: the ability doesn't exist there — stay silent */
      level: 'Element Burst unlocks at level ' + LEGACY_BURST_MIN_CHAR_LEVEL,   /* v2.3.2662: old workers only */
      no_weapon: 'No weapon equipped!',
      no_element: 'Element Burst needs an enchanted weapon',
      mana: 'Not enough mana!',
      cooldown: null,   /* a timer the player can see; nagging about it is noise */
    }[refusal];
    if (msg && now - (S._burstMsgAt || 0) > 700) {
      S._burstMsgAt = now;
      pushDmgPopup(S, S.player.x, S.player.y - 30, msg, '#8E44AD', { ts: now });
    }
    return;
  }
  /* Local cooldown stamp so the button greys out on the tap rather than
     on the echo.  The SERVER's stamp is the one that decides; this only
     stops the HUD lying for a round-trip. */
  S._lastBurstAt = now;
  var elemColor = (ELEMENTS[wpn.element1] && ELEMENTS[wpn.element1].color) || '#8E44AD';
  BT_AUDIO.beep(220, 0.10, 0.16, 'sawtooth');
  setTimeout(function () { BT_AUDIO.beep(520, 0.08, 0.10, 'triangle'); }, 70);
  /* A tiny local tell at the caster's feet so the tap feels instant even
     on a slow connection; the real nova is drawn by the element_nova
     handler (src/networking/gameEvents.js) at the server's position. */
  if (S._impactRings) {
    S._impactRings.push({ x: S.player.x, y: S.player.y, ts: now, duration: 220, maxR: 18, color: elemColor });
  }
  if (S.channel) {
    try { S.channel.send({ type: 'element_burst', payload: {} }); } catch (e) {}
  }
}
