/* ═══ v2.3.3375: THE SHEEN'S OWN LINES, IN ONE PLACE ═══
 * From a piece's colour as drawn (`c`, premultiplied) at `p` in its frame, the
 * straight colour lifted by the permanent sheen (`col`, v2.3.2864 / v2.3.2914 /
 * v2.3.3321) and the art's highlight mask (`hi`), from uTint, uFig, uSun,
 * uSheen, uColor and SHEEN_CEIL.  The metal shine's filter (glint.js FRAG)
 * and the batcher that draws the shine in the frame (sheenBatch.js, whose
 * fragment gives its own inputs those names) are the SAME TEXT, so they
 * cannot drift apart.  Moved out of FRAG unchanged: its source is what it was.
 * A module of its own, as each of the two imports it. */
export const SHEEN_LIFT = `    /* v2.3.2864: the sheen.  How bright the ART was here, before the metal's
       tint multiplied it down: the drawn colour divided by the tint. */
    vec3 art = c.a > 0.0 ? clamp(c.rgb / c.a / max(uTint, vec3(0.05)), 0.0, 1.0) : vec3(0.0);
    /* only the art's real highlights: a broad mask lifted the midtones too,
       and the metal read as lighter rather than shinier */
    float hi = smoothstep(0.55, 0.96, dot(art, vec3(0.299, 0.587, 0.114)));
    /* the sprite's frame is mostly empty margin around the figure, so the
       gradient is steep enough to swing across the metal itself.
       v2.3.3321: laid across the FIGURE's frame (uFig, the body sprite's
       frame in this sprite's own 0-1 units), not this sprite's -- a held
       greatsword's picture is a big frame of its own, turned and flipped in
       the hand, and across it the blade's highlight sat on the side away from
       the sun (mp-sheen: 0.35 of the figure's left third lit by a left sun).
       uFig.z 0: no figure to lay it on, this sprite's frame as before. */
    vec2 q = uFig.z > 0.0 ? (p - uFig.xy) / uFig.zw : p;
    float side = clamp(0.5 + dot(q - 0.5, uSun) * 3.0, 0.0, 1.0);
    float s = uSheen * hi * (0.35 + 0.65 * side);
    /* v2.3.2914: the sheen ROLLS OFF below white instead of being added and
       clipped.  Per channel, head is the room left under the ceiling; the
       lift is that room x (1 - e^(-added/room)), which is the old added light
       while it is small against the room and approaches the ceiling as it
       grows.  A pixel already above the ceiling (the art's own brightest
       paint) is left exactly as drawn.  Worked in straight colour, not
       premultiplied, so a soft edge pixel rolls off the same way. */
    vec3 col = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
    vec3 head = max(uColor * SHEEN_CEIL - col, vec3(0.0));
    col += head * (vec3(1.0) - exp(-(uColor * s) / max(head, vec3(0.001))));
`;

