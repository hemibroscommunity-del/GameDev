/* Minimal correctness-only lint (v2.3.765).
 *
 * Purpose-built after the v2.3.756 incident: a block-scoped const referenced
 * from a sibling scope shipped to production as a per-frame ReferenceError
 * (`_layerShirt`) -- the exact class `no-undef` catches at build time.
 *
 * Deliberately NO style rules: most of src/ui is pre-transpiled legacy code
 * that would generate thousands of useless warnings.  Only rules that flag
 * REAL bugs with near-zero false positives are enabled.  Add rules only with
 * a clean run.
 */
import globals from 'globals';

/* LEGACY DEBT REGISTER — RETIRED (v2.3.1189).  The per-file `globals`
 * blocks that used to sit at the bottom grandfathered identifiers the
 * legacy monoliths referenced without a binding.  All 35 entries were
 * burned down in the FINAL PLAN v2 session-3 cleanup: 21 of BroTown's
 * 27 had no remaining references (panel extractions removed the code),
 * a scope scan proved every `R` use is locally declared, and the 13
 * genuinely-referenced symbols got explicit imports (gameSystems 7,
 * lifeSkills 1, BroTown 5).  Every file now lints with ZERO
 * grandfathered globals — keep it that way: fix = import the symbol
 * where it lives, never re-add a globals entry. */
export default [
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        /* vite compile-time defines (vite.config.js `define`) */
        __BUILD_VERSION__: 'readonly',
        __BUILD_SHA__: 'readonly',
        __BUILD_TIME__: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',            // undeclared / out-of-scope references
      'no-dupe-keys': 'error',        // duplicate object keys (silent clobber)
      'no-dupe-args': 'error',
      'no-duplicate-case': 'error',   // v2.3.1176: a shadowing duplicate case in the
                                      // gameEvents switch silently ate arena_bet events

      'no-unreachable': 'error',
      'no-self-assign': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
  /* v2.3.784: gameLoop.js / wsClient.js LEGACY DEBT blocks removed
     (Phase 1 deletion / Phase 5 rewrite with explicit imports).
     v2.3.1189: gameSystems.js (7), lifeSkills.js (1), and BroTown.jsx
     (27) blocks removed — the register is empty. */
];
