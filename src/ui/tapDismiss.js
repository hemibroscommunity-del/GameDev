/* ═══ v2.3.2284: A TAP THAT MEANS "I HAVE READ THIS" ═══
 *
 * Owner: "During tutorial allow the user to just tap on the messages to
 * dismiss it" and "allow that tap to proceed (or close) for dialogue window
 * behavior too (unless it requires the user to press an accept button or make
 * a decision.)"
 *
 * OPT-IN, ALWAYS. This is a helper you call, never a class rule and never a
 * wrapper with a `dismissOnTap={false}` escape hatch -- so a panel added
 * tomorrow that nobody thought about gets NO body tap. That asymmetry is the
 * whole design: a forgotten opt-IN costs a convenience (the ✕ every panel
 * already has), a forgotten opt-OUT costs a quest reward or a wagered duel.
 * This repo has the receipt for the other direction -- the death sweep was a
 * hand-written hide list until v2.3.1887, and it missed the slung shield for
 * two months. A list of "these are decisions, skip them" is that list again,
 * and it is already incomplete today: useModalGuard is exactly such a
 * declaration and QuestOfferPanel, DuelRequestPanel and ThreatIncomingPanel
 * are all decisions that never declare it.
 *
 * WHY onClick AND NOT pointerdown/pointerup. Dismissing on pointerdown
 * unmounts the surface before the browser dispatches the synthesised click,
 * and that click then lands on whatever is underneath -- here, the world tap
 * layer, where a tap locks a monster or restarts an extraction, and where iOS
 * already needed the _touchHandledAt workaround. Several existing surfaces
 * close on pointerdown; copying that idiom for a NEW dismiss sitting over the
 * play area is how a "tap to close" turns into a phantom attack.
 *
 * WHY THE MOVEMENT THRESHOLD. "Swipe anywhere to dodge-roll" is a real
 * gesture, and the collect toast sits at 30% height -- dead centre of the play
 * area. A dodge that happens to begin on a message must not be counted as
 * reading it. Same idea as the tap-vs-swipe discriminator the world layer
 * already uses.
 *
 * The onPointerDown stopPropagation is the KeyboardHintsPanel idiom ("a bare
 * onClick here would also swing the sword"); it lives in here so it does not
 * have to be remembered at each site. */
export function tapDismiss(fn, opts) {
  const slop = (opts && typeof opts.slop === 'number') ? opts.slop : 12;
  const st = { x: 0, y: 0, moved: false };
  return {
    onPointerDown: (e) => {
      st.x = e.clientX; st.y = e.clientY; st.moved = false;
      e.stopPropagation();
    },
    onPointerMove: (e) => {
      if (Math.abs(e.clientX - st.x) > slop || Math.abs(e.clientY - st.y) > slop) st.moved = true;
    },
    onClick: (e) => {
      e.stopPropagation();
      if (!st.moved) fn(e);
    },
  };
}

/* The look half, kept separate because two of the three call sites already
   build a style object inline and spreading a second one would clobber it. */
export const TAP_DISMISS_STYLE = { cursor: 'pointer', touchAction: 'manipulation' };
