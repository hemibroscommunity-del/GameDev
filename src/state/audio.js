/* ═══ v2.3.5160: THE STATE LEDGER, system `audio` (grand plan step 5.3; card U) ═══
 *
 * Every field of the state `S` and every top-of-file variable of the system
 * `audio` (card B's map, docs/SYSTEMS.md), one row a line.  The columns
 * are in src/state/README.md.
 *
 * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger audio --write
 * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never
 * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs
 * holds it.  No imports, plain data: nothing in the game imports it yet.
 */
export const SYSTEM = 'audio';
export const ROWS = [
  { field: '_shotEnds', system: 'audio', lifetime: 'sitting', suggested: 'zone', born: 'fly src/game/hitSounds.js shotEnds', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/hitSounds.js'] },
  { variable: '_noise', file: 'src/data/bowFeelSound.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'var null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/data/bowFeelSound.js'] },
  { variable: 'FOOTSTEP_CLIPS', file: 'src/data/footstepClips.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/data/footstepClips.js'] },
  { variable: '_a', file: 'src/data/soundFold.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/data/soundFold.js'] },
  { variable: '_b', file: 'src/data/soundFold.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/data/soundFold.js'] },
  { variable: '_m', file: 'src/data/soundFold.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/data/soundFold.js'] },
  { variable: '_sa', file: 'src/data/soundFold.js', system: 'audio', lifetime: 'sitting', suggested: '?', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/data/soundFold.js'] },
  { variable: '_sb', file: 'src/data/soundFold.js', system: 'audio', lifetime: 'sitting', suggested: '?', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/data/soundFold.js'] },
  { variable: '_slicedLine', file: 'src/data/soundFold.js', system: 'audio', lifetime: 'sitting', suggested: '?', born: 'let call', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/data/soundFold.js'] },
  { variable: '_sm', file: 'src/data/soundFold.js', system: 'audio', lifetime: 'sitting', suggested: '?', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/data/soundFold.js'] },
  { variable: '_noise', file: 'src/data/weaponFeelSound.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'var null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/data/weaponFeelSound.js'] },
  { variable: 'st', file: 'src/game/ambientBeds.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/ambientBeds.js'] },
  { variable: '_lastAt', file: 'src/game/eventSounds.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'const Map', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/eventSounds.js'] },
  { variable: '_peerAt', file: 'src/game/eventSounds.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let array', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/eventSounds.js'] },
  { variable: '_stepAt', file: 'src/game/eventSounds.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let array', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/eventSounds.js'] },
  { variable: 'cueStats', file: 'src/game/eventSounds.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/eventSounds.js'] },
  { variable: '_echoAt', file: 'src/game/hitSounds.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let array', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/hitSounds.js'] },
  { variable: 'hitSoundStats', file: 'src/game/hitSounds.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/hitSounds.js'] },
  { variable: 'st', file: 'src/game/npcVoices.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/npcVoices.js'] },
  { variable: 'st', file: 'src/game/ownSounds.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/ownSounds.js'] },
  { variable: 'st', file: 'src/game/rideSound.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/rideSound.js'] },
  { variable: '_host', file: 'src/game/soundStudio.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/soundStudio.js'] },
  { variable: '_installed', file: 'src/game/soundStudio.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let bool', twoFiles: '', noRead: false, phase: null, flag: true, neverChanged: false, writers: ['src/game/soundStudio.js'] },
  { variable: '_next', file: 'src/game/soundStudio.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let number', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/soundStudio.js'] },
  { variable: '_opening', file: 'src/game/soundStudio.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/soundStudio.js'] },
  { variable: '_ring', file: 'src/game/soundStudio.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'const array', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/soundStudio.js'] },
  { variable: '_root', file: 'src/game/soundStudio.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let null', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/soundStudio.js'] },
  { variable: '_seq', file: 'src/game/soundStudio.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let number', twoFiles: '', noRead: true, phase: null, flag: false, neverChanged: false, writers: ['src/game/soundStudio.js'] },
  { variable: 'st', file: 'src/game/townAmbience.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/townAmbience.js'] },
  { variable: 'st', file: 'src/game/waterAmbience.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/waterAmbience.js'] },
  { variable: '_m', file: 'src/game/wheelMusic.js', system: 'audio', lifetime: 'sitting', suggested: 'zone', born: 'const object', twoFiles: '', noRead: false, phase: null, flag: false, neverChanged: false, writers: ['src/game/wheelMusic.js'] },
  { variable: 'installed', file: 'src/ui/uiSfxDelegate.js', system: 'audio', lifetime: 'sitting', suggested: 'never', born: 'let bool', twoFiles: '', noRead: false, phase: null, flag: true, neverChanged: false, writers: ['src/ui/uiSfxDelegate.js'] },
];
