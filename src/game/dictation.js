/* ═══ v2.3.4411: WHEN THE CHAT BOX'S MICROPHONE IS LIVE ═══
 *
 * The chat box's dictation (ui/mobile/ChatBubble.jsx) holds one browser
 * recogniser at a time in a ref.  ChatBubble is ALWAYS mounted (GameApp.jsx;
 * it draws nothing while shut), so its unmount-only abort never ran when the
 * box was CLOSED mid-sentence: the recogniser kept listening (iOS shows the
 * recording dot over the game) until it decided by itself, and its words then
 * landed in the next draft (the state-machine sweep, M4-2).
 *
 * The rule, exactly: the microphone is live from a tap on the mic button
 * until the first of: a second tap (stop: the words still arrive), the
 * recogniser's own end, or the chat box closing for ANY reason (the ✕, a tap
 * outside, a trade or other panel taking the screen, Esc) -- which ABORTS it
 * and throws its words away.  A recogniser the box has let go of owns
 * nothing: its late result, error or end changes neither the draft nor the
 * button.  No imports, so node can test it (server/test/dictation.test.mjs). */

/** Let go of the running recogniser, if any: abort it (the microphone closes
    and no words come).  Returns true when one was running. */
export function dictationClose(ref) {
  const rec = ref && ref.current;
  if (!rec) return false;
  ref.current = null;
  try { rec.abort(); } catch (e) { /* already gone */ }
  return true;
}

/** Is `rec` still the recogniser the box holds?  A late event from one it let
    go of is ignored. */
export function dictationOwns(ref, rec) {
  return !!(ref && rec && ref.current === rec);
}
