/**
 * Trait category rules — the modular paper-doll registry.
 *
 * Each trait sprite belongs to a category (headwear, eyes, mouth, etc.).
 * The category declares HOW the trait attaches to the body, in semantic
 * terms — never per-direction or per-pixel coordinates.
 *
 * - attachAt   : which body anchor zone the trait latches onto
 * - spriteAnchor: which point in the trait sprite's own image space is
 *                 the attachment landmark
 * - widthRatio : how wide the trait should render relative to head width
 *                (1.0 = same as head width; 1.1 = 10% wider)
 *
 * Adding a new trait category? Add a row here.
 * Adding a new sprite to an existing category? Just drop in the PNG —
 *   no per-direction config needed as long as the AI prompt drew it
 *   with its alignment landmark at the expected sprite-anchor position.
 */
export const TRAIT_CATEGORIES = {
  headwear: {
    /* Helmet's head-cutout wraps the head -- center the trait sprite
     * on the head's center so cutout aligns with the head silhouette.
     * v2.3.272: widthRatio dropped 1.10 -> 0.55 because user-uploaded
     * helmet sprite was drawn ~2x larger than the source image's helmet
     * relative to body.  This compensates at the renderer until the
     * trait gen prompt enforces consistent scale (see below).
     *
     * Going forward, the AI prompt for standalone items should say
     * something like: "draw the helmet at the same pixel scale as it
     * appears on the original combined character image" or "helmet
     * should be approximately {N} pixels wide".  Once that's enforced
     * upstream, this ratio can move back toward 1.0. */
    attachAt: 'head.center',
    spriteAnchor: [0.5, 0.5],
    widthRatio: 0.55,
  },
  eyes: {
    attachAt: 'head.eyes',
    /* Eyes pupils at sprite center. */
    spriteAnchor: [0.5, 0.5],
    widthRatio: 0.70,
  },
  mouth: {
    attachAt: 'head.mouth',
    spriteAnchor: [0.5, 0.5],
    widthRatio: 0.50,
  },
  eyewear: {
    attachAt: 'head.eyes',
    spriteAnchor: [0.5, 0.5],
    widthRatio: 0.85,
  },
};

/**
 * Map a semantic anchor name (e.g. 'head.top') to frame-pixel coords,
 * given the body's head-box for the current pose-dir-frame.
 *
 * 'head.eyes' = 40% down from head top (eye line).
 * 'head.mouth' = 70% down from head top.
 */
export function resolveBodyAnchor(headBox, anchorName) {
  if (!headBox) return null;
  const cx = headBox.center[0];
  const top = headBox.top[1];
  const bot = headBox.bottom[1];
  const h = bot - top + 1;
  switch (anchorName) {
    case 'head.top':    return [cx, top];
    case 'head.center': return [cx, headBox.center[1]];
    case 'head.bottom': return [cx, bot];
    case 'head.eyes':   return [cx, top + Math.round(h * 0.40)];
    case 'head.mouth':  return [cx, top + Math.round(h * 0.70)];
    default:            return null;
  }
}
