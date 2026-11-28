# BroTown menu redesign — one-file Claude handoff (V17)

Start with `MASTER-IMPLEMENTATION.md`. It is the single governing design specification, incorporating the latest visual-first/action-first requirements and all previous accepted design constraints.

- `prototype.html`: latest interactive V17 prototype, with simulated data and provisional artwork. Open in a browser. The HTML has historical internal labels from earlier iterations; this file is the V17 export. It is a design reference, not production code.
- `visual-preview.png`: latest portrait/landscape comparison sheet.
- `reference/original-feature-inventory.md`: Claude's original source, retained only to check functionality and original constraints. Its old navigation hierarchy and Diego instant-sale behavior are superseded. Original screenshot archive is not duplicated; consult the existing repository and original screenshots if needed.

## Instruction to Claude

Use the master specification as the governing requirements for the menu redesign. Inspect the current BroTown repository and map existing features to the proposed structure. Use the prototype and preview for visual and interaction guidance, not implementation code or sample gameplay formulas. Start with reusable components, adaptive layout, Bro, Combat and Gear only. Keep the actual fixed menu allocation, comparable gameplay scale and visibility across devices, and the game server authoritative. Lead with recognizable visuals and actionable choices, keep critical decision context beside them, and move supporting facts later. Every menu must answer the two most frequent confusion questions without clutter, and visually distinguish information, inspection, preparation and commitment. Diego's player inventory is for putting items up for sale, not instant sale. Report conflicts, actual device tests and screenshots before rolling the redesign out to other menus.
