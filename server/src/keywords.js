/* ═══ v2.3.3355: THE WORDS A NEW LOGIN KEY IS MADE OF ═══
 *
 * A new Login Key is EIGHT words drawn from this list by the worker
 * (loginkeys.js `makeLoginKey`), each from crypto.getRandomValues, uniform:
 * 1,422 words, so 8 x log2(1422) = 83.8 bits -- far past any guessing, online
 * (the join's and the door's limits) or off (a key is kept only as its
 * fingerprint).
 *
 * The words are the EFF Long Wordlist's (2016, https://www.eff.org/dice) of
 * five letters or fewer, licensed CC BY 3.0 US
 * (https://creativecommons.org/licenses/by/3.0/us/), with 55 taken out: brand
 * names, illness and body words, insults, and the one with a dash (a key's
 * words are joined by dashes).  Short, common, easy to type on a phone, and
 * no two alike.  Credited in CREDITS.md.
 *
 * Never reorder or change this list: a key is checked by its fingerprint, not
 * its words, so a change would not break old keys -- but the list is what the
 * keys a player holds are made of, and the shape test below is all the phone
 * needs to know.
 */

export const KEY_WORDS = Object.freeze([
  'abide', 'able', 'acid', 'acorn', 'acre', 'acts', 'afar', 'affix', 'afoot',
  'aged', 'agent', 'agile', 'aging', 'agony', 'ahead', 'ahoy', 'aide', 'aim',
  'ajar', 'alarm', 'album', 'alias', 'alibi', 'alike', 'alive', 'aloe',
  'aloft', 'aloha', 'alone', 'aloof', 'alto', 'amaze', 'amber', 'amid',
  'amigo', 'amino', 'amiss', 'among', 'ample', 'amply', 'amuck', 'anew',
  'anger', 'anime', 'ankle', 'annex', 'antsy', 'anvil', 'aorta', 'apple',
  'apply', 'april', 'apron', 'aptly', 'aqua', 'area', 'arena', 'argue',
  'arise', 'armed', 'army', 'aroma', 'arose', 'array', 'arson', 'art', 'ashen',
  'ashes', 'ashy', 'aside', 'askew', 'atlas', 'atom', 'atop', 'attic', 'audio',
  'avert', 'avid', 'avoid', 'await', 'award', 'aware', 'awoke', 'awry', 'axis',
  'bacon', 'badge', 'badly', 'bagel', 'baggy', 'baked', 'balmy', 'banjo',
  'barge', 'barn', 'bash', 'basil', 'basin', 'basis', 'batch', 'bath', 'baton',
  'bats', 'blade', 'blah', 'blame', 'blank', 'blast', 'bleak', 'bleep',
  'blend', 'bless', 'blimp', 'bling', 'blip', 'blitz', 'blob', 'blog', 'blot',
  'bluff', 'blunt', 'blurb', 'blurt', 'blush', 'boat', 'body', 'bogus', 'boil',
  'bolt', 'boned', 'boney', 'bonus', 'bony', 'book', 'booth', 'boots', 'boozy',
  'borax', 'boss', 'botch', 'both', 'boxer', 'boxy', 'briar', 'bribe', 'brick',
  'bride', 'brim', 'bring', 'brink', 'brook', 'broom', 'brunt', 'brush',
  'brute', 'buddy', 'buggy', 'bulb', 'bulge', 'bulk', 'bully', 'bunch',
  'bunny', 'bunt', 'bush', 'buzz', 'cable', 'cache', 'cacti', 'caddy', 'cadet',
  'cage', 'cake', 'calm', 'cameo', 'canal', 'candy', 'cane', 'canon', 'cape',
  'carat', 'cargo', 'carol', 'carry', 'carve', 'case', 'cash', 'cause',
  'cedar', 'chafe', 'chain', 'chair', 'chant', 'chaos', 'chaps', 'charm',
  'chase', 'cheek', 'cheer', 'chef', 'chess', 'chest', 'chewy', 'chief',
  'chili', 'chill', 'chimp', 'chip', 'chive', 'chomp', 'chop', 'chuck', 'chug',
  'chunk', 'churn', 'chute', 'cider', 'cinch', 'city', 'civic', 'civil',
  'clad', 'claim', 'clamp', 'clang', 'clash', 'clasp', 'class', 'claw', 'clay',
  'clean', 'clear', 'cleat', 'cleft', 'clerk', 'cling', 'clip', 'cloak',
  'clock', 'clone', 'cloud', 'clump', 'coach', 'coat', 'cocoa', 'cod', 'coil',
  'cola', 'cold', 'colt', 'coma', 'come', 'comfy', 'comic', 'comma', 'conch',
  'cone', 'cope', 'copy', 'coral', 'cork', 'corny', 'cost', 'couch', 'cough',
  'could', 'cover', 'cozy', 'cramp', 'crane', 'crank', 'crate', 'crave',
  'crazy', 'creed', 'creme', 'crepe', 'crept', 'crib', 'cried', 'crier',
  'crimp', 'croak', 'crock', 'crook', 'croon', 'crop', 'cross', 'crowd',
  'crown', 'crumb', 'crust', 'crux', 'cube', 'cupid', 'cure', 'curly', 'curry',
  'curse', 'curve', 'curvy', 'cushy', 'cusp', 'cut', 'cycle', 'dab', 'dad',
  'daily', 'dairy', 'daisy', 'dance', 'dandy', 'dares', 'darn', 'dart', 'dash',
  'data', 'dawn', 'dealt', 'dean', 'debit', 'debug', 'decaf', 'decal', 'decay',
  'deck', 'decoy', 'deed', 'deem', 'defog', 'defy', 'deity', 'delay', 'delta',
  'denim', 'dense', 'deny', 'depth', 'derby', 'deuce', 'dial', 'diary', 'dice',
  'dig', 'dill', 'dime', 'dimly', 'diner', 'dingo', 'dingy', 'dish', 'disk',
  'ditch', 'ditto', 'dizzy', 'dock', 'dodge', 'dodgy', 'doily', 'doing',
  'dole', 'dolly', 'donor', 'donut', 'doozy', 'dose', 'dove', 'down', 'dowry',
  'doze', 'drab', 'drank', 'draw', 'dress', 'drew', 'dried', 'drier', 'drift',
  'drone', 'drool', 'droop', 'drove', 'drown', 'drum', 'dry', 'ducky', 'duct',
  'dude', 'duh', 'duke', 'duly', 'duo', 'dupe', 'dusk', 'dust', 'duty',
  'duvet', 'dwarf', 'each', 'eagle', 'early', 'easel', 'eaten', 'eats',
  'ebony', 'ebook', 'ecard', 'echo', 'edge', 'edgy', 'eel', 'eject', 'elbow',
  'elf', 'elite', 'elk', 'elm', 'elope', 'elude', 'elves', 'email', 'ember',
  'emcee', 'emit', 'emote', 'empty', 'emu', 'ended', 'envoy', 'envy', 'epic',
  'equal', 'error', 'erupt', 'essay', 'ether', 'evade', 'even', 'evict',
  'evil', 'evoke', 'exact', 'exert', 'exes', 'exile', 'exit', 'expel', 'fable',
  'fade', 'fall', 'false', 'fame', 'fancy', 'fang', 'fax', 'feast', 'feed',
  'feel', 'femur', 'fence', 'ferry', 'fetch', 'fever', 'fiber', 'fifth',
  'fifty', 'film', 'finch', 'finer', 'fit', 'five', 'flail', 'flaky', 'flame',
  'flap', 'flask', 'fled', 'flick', 'flier', 'fling', 'flint', 'flip', 'flirt',
  'float', 'flock', 'flop', 'floss', 'flyer', 'foam', 'foe', 'fog', 'foil',
  'folic', 'folk', 'font', 'food', 'fool', 'fox', 'foyer', 'frail', 'frame',
  'frays', 'fresh', 'fried', 'frill', 'frisk', 'from', 'front', 'froth',
  'frown', 'fruit', 'gab', 'gaffe', 'gag', 'gains', 'gala', 'game', 'gamma',
  'gap', 'gas', 'gauze', 'gave', 'gawk', 'gear', 'gecko', 'geek', 'gem',
  'genre', 'gents', 'getup', 'giant', 'giddy', 'gift', 'gills', 'given',
  'giver', 'gizmo', 'glade', 'glare', 'glass', 'glory', 'gloss', 'glove',
  'glue', 'gnat', 'goal', 'goes', 'going', 'golf', 'gone', 'gong', 'good',
  'gooey', 'goofy', 'gout', 'gown', 'grab', 'grain', 'grant', 'grape', 'graph',
  'grasp', 'grass', 'gravy', 'gray', 'green', 'grew', 'grid', 'grief', 'grill',
  'grime', 'grimy', 'grip', 'grit', 'groom', 'grout', 'grove', 'growl', 'grub',
  'grunt', 'guide', 'guise', 'gulf', 'gully', 'gulp', 'gummy', 'guru', 'gush',
  'gusto', 'gusty', 'guts', 'guy', 'had', 'haiku', 'half', 'halt', 'hanky',
  'happy', 'hardy', 'harsh', 'hash', 'haste', 'hasty', 'haunt', 'haven',
  'hazy', 'heap', 'heat', 'heave', 'hedge', 'hefty', 'hence', 'henna', 'herbs',
  'hertz', 'huff', 'hug', 'hula', 'hulk', 'hull', 'human', 'humid', 'hunk',
  'hurry', 'hurt', 'hush', 'hut', 'ice', 'icing', 'icky', 'icon', 'icy',
  'idiom', 'idly', 'igloo', 'image', 'imply', 'ion', 'irate', 'irk', 'iron',
  'issue', 'item', 'ivory', 'ivy', 'jab', 'jam', 'jaunt', 'java', 'jawed',
  'jaws', 'jazz', 'jeep', 'jelly', 'jet', 'jiffy', 'jimmy', 'jinx', 'job',
  'john', 'jolly', 'jolt', 'jot', 'judge', 'judo', 'juice', 'juicy', 'july',
  'jumbo', 'jump', 'june', 'juror', 'jury', 'kabob', 'karma', 'kebab', 'keep',
  'keg', 'kelp', 'kept', 'kick', 'kiln', 'kilt', 'king', 'kite', 'kitty',
  'kiwi', 'knee', 'knelt', 'knoll', 'koala', 'kooky', 'kudos', 'ladle', 'lair',
  'lake', 'lance', 'lanky', 'lapel', 'lard', 'large', 'lark', 'lash', 'lasso',
  'last', 'latch', 'late', 'lazy', 'left', 'legal', 'lemon', 'lend', 'lens',
  'lent', 'level', 'lid', 'life', 'lilac', 'lilly', 'lily', 'limb', 'limes',
  'limit', 'line', 'lingo', 'lint', 'lion', 'lip', 'lisp', 'list', 'lived',
  'liver', 'lucid', 'lunar', 'lung', 'lurch', 'lure', 'lurk', 'lying', 'macaw',
  'mace', 'magma', 'maker', 'malt', 'mama', 'mango', 'manly', 'manor', 'many',
  'map', 'march', 'mardi', 'marry', 'math', 'mauve', 'maybe', 'mocha', 'molar',
  'mold', 'mom', 'moody', 'mop', 'morse', 'mossy', 'most', 'motor', 'motto',
  'mouse', 'mousy', 'mouth', 'move', 'movie', 'mower', 'much', 'muck', 'mud',
  'mug', 'mulch', 'mule', 'mumbo', 'mummy', 'mural', 'murky', 'mushy', 'music',
  'musky', 'musty', 'mute', 'mutt', 'myth', 'nacho', 'nag', 'nail', 'name',
  'nanny', 'nape', 'navy', 'neon', 'nervy', 'nest', 'net', 'never', 'next',
  'niece', 'nifty', 'ninja', 'ninth', 'nutty', 'nylon', 'oak', 'oasis', 'oat',
  'oboe', 'ocean', 'oil', 'oink', 'okay', 'old', 'olive', 'omega', 'omen',
  'omit', 'onion', 'only', 'onset', 'onto', 'onyx', 'oops', 'ooze', 'oozy',
  'opal', 'open', 'opt', 'other', 'otter', 'ouch', 'ought', 'ounce', 'outer',
  'oval', 'oven', 'owl', 'ozone', 'paced', 'pager', 'palm', 'panda', 'pang',
  'panic', 'pants', 'paper', 'parka', 'party', 'pasta', 'pasty', 'path',
  'patio', 'paver', 'payee', 'payer', 'pecan', 'pelt', 'penny', 'pep', 'perch',
  'perky', 'perm', 'pesky', 'peso', 'petal', 'petri', 'petty', 'phony',
  'photo', 'plank', 'plant', 'plaza', 'pleat', 'plod', 'plop', 'plot', 'plow',
  'ploy', 'pluck', 'plug', 'plus', 'poach', 'pod', 'poem', 'poet', 'pogo',
  'poise', 'poker', 'polar', 'polka', 'polo', 'pond', 'pony', 'poppy', 'pork',
  'poser', 'posh', 'pouch', 'pound', 'pout', 'power', 'press', 'pried',
  'primp', 'print', 'prior', 'prism', 'prize', 'probe', 'prone', 'prong',
  'props', 'proud', 'proxy', 'prude', 'prune', 'pry', 'pug', 'pull', 'pulp',
  'pulse', 'puma', 'punch', 'punk', 'pupil', 'puppy', 'purge', 'purr', 'purse',
  'pushy', 'putt', 'quack', 'quail', 'quake', 'qualm', 'query', 'quiet',
  'quill', 'quilt', 'quirk', 'quit', 'quote', 'rabid', 'race', 'rack', 'radar',
  'radio', 'raft', 'rage', 'rake', 'rally', 'ramp', 'ranch', 'rants', 'rare',
  'rash', 'raven', 'reach', 'ream', 'rebel', 'relax', 'relay', 'relic', 'rely',
  'remix', 'reply', 'reps', 'rerun', 'reset', 'retry', 'reuse', 'rhyme',
  'rice', 'ride', 'rift', 'rigid', 'rigor', 'rind', 'rink', 'rinse', 'riot',
  'rise', 'risk', 'ritzy', 'rival', 'roast', 'robe', 'robin', 'rocky', 'rogue',
  'roman', 'romp', 'rope', 'rosy', 'rover', 'royal', 'ruby', 'rug', 'rule',
  'rumor', 'runny', 'rural', 'ruse', 'rush', 'rust', 'rut', 'sadly', 'saga',
  'sage', 'saggy', 'said', 'saint', 'sake', 'salad', 'salon', 'salsa', 'salt',
  'same', 'sandy', 'sank', 'santa', 'sappy', 'sash', 'sassy', 'satin', 'saucy',
  'sauna', 'saved', 'savor', 'say', 'scale', 'scam', 'scant', 'scarf', 'scary',
  'scion', 'scoff', 'scone', 'scoop', 'scope', 'scorn', 'scrap', 'scuba',
  'scuff', 'sedan', 'self', 'send', 'sepia', 'serve', 'setup', 'shack',
  'shady', 'shaft', 'shaky', 'shale', 'shame', 'shank', 'shape', 'share',
  'shawl', 'shed', 'sheep', 'sheet', 'shelf', 'shell', 'shine', 'shiny',
  'ship', 'shirt', 'shock', 'shone', 'shore', 'shout', 'shove', 'shown',
  'showy', 'shrug', 'shun', 'shush', 'shut', 'shy', 'sift', 'silk', 'silly',
  'silo', 'silt', 'sip', 'siren', 'sixth', 'size', 'skid', 'skied', 'skier',
  'skies', 'skirt', 'slab', 'slain', 'slam', 'slang', 'slate', 'slaw', 'sled',
  'sleek', 'sleep', 'sleet', 'slept', 'slick', 'slimy', 'slip', 'slot', 'slug',
  'slurp', 'slush', 'sly', 'small', 'smell', 'smile', 'smirk', 'smite',
  'smith', 'smock', 'smog', 'smoky', 'snack', 'snap', 'snare', 'snarl',
  'sneak', 'sneer', 'snide', 'sniff', 'snore', 'snort', 'snout', 'snowy',
  'snub', 'snuff', 'speak', 'speed', 'spent', 'spew', 'spied', 'spill',
  'spilt', 'spiny', 'spoof', 'spool', 'spoon', 'spore', 'spout', 'spray',
  'spree', 'sprig', 'spry', 'spud', 'spur', 'squad', 'squid', 'stack', 'staff',
  'stage', 'stamp', 'stand', 'stank', 'stark', 'stash', 'state', 'stays',
  'steam', 'steed', 'steep', 'stem', 'step', 'stew', 'stick', 'stilt', 'stir',
  'stock', 'stoic', 'stoke', 'stole', 'stomp', 'stony', 'stood', 'stool',
  'stoop', 'storm', 'stout', 'stove', 'straw', 'stray', 'strum', 'strut',
  'stuck', 'study', 'stump', 'stung', 'stunt', 'suave', 'such', 'suds',
  'sugar', 'suing', 'sulk', 'sushi', 'swab', 'swan', 'swarm', 'sway', 'swear',
  'sweat', 'sweep', 'swell', 'swept', 'swipe', 'swirl', 'swoop', 'swore',
  'sworn', 'swung', 'syrup', 'tabby', 'tacky', 'taco', 'tag', 'take', 'tall',
  'talon', 'tamer', 'tank', 'taps', 'tarot', 'task', 'taste', 'tasty', 'taunt',
  'thank', 'that', 'thaw', 'thee', 'theft', 'theme', 'these', 'thigh', 'thing',
  'think', 'thorn', 'those', 'thud', 'thumb', 'thus', 'tiara', 'tibia',
  'tidal', 'tidy', 'tiger', 'tile', 'till', 'tilt', 'timid', 'tint', 'tiny',
  'trace', 'track', 'trade', 'train', 'traps', 'trash', 'tray', 'treat',
  'tree', 'trend', 'trial', 'tried', 'trio', 'trout', 'truce', 'truck',
  'truth', 'try', 'tubby', 'tug', 'tulip', 'tummy', 'turf', 'tusk', 'tutor',
  'tutu', 'tux', 'tweak', 'tweed', 'tweet', 'twice', 'twig', 'twine', 'twins',
  'twirl', 'tying', 'tyke', 'udder', 'ultra', 'uncle', 'uncut', 'unify',
  'union', 'unit', 'unlit', 'untie', 'until', 'unwed', 'unzip', 'upon',
  'upper', 'urban', 'usage', 'used', 'user', 'usher', 'usual', 'utter',
  'valid', 'value', 'veal', 'vegan', 'venue', 'venus', 'verse', 'very', 'vest',
  'veto', 'vibes', 'vice', 'video', 'viper', 'viral', 'virus', 'visa', 'visor',
  'vista', 'vixen', 'voice', 'void', 'voter', 'vowed', 'vowel', 'wad', 'wafer',
  'waged', 'wager', 'wages', 'wagon', 'wake', 'walk', 'waltz', 'wand', 'wasp',
  'watch', 'water', 'wavy', 'wham', 'wharf', 'wheat', 'whiff', 'whole', 'why',
  'wick', 'widen', 'widow', 'width', 'wife', 'wifi', 'wilt', 'wince', 'wind',
  'wing', 'wipe', 'wired', 'wiry', 'wise', 'wish', 'wispy', 'wok', 'wolf',
  'woof', 'wool', 'woozy', 'word', 'work', 'worry', 'worst', 'wound', 'woven',
  'wow', 'wrath', 'wrist', 'yam', 'yard', 'yarn', 'yeah', 'yeast', 'yelp',
  'yen', 'yield', 'yin', 'yodel', 'yoga', 'yoyo', 'yummy', 'zap', 'zebra',
  'zen', 'zero', 'zesty', 'zippy', 'zips', 'zone', 'zoom',
]);

/** How many words a new key has. */
export const KEY_LEN = 8;

/** The shape of a new key, typed or stored: eight words of 3-5 letters
 *  joined by dashes (after normalizeKeyText).  An old key is four words and a
 *  number, so the two never look alike. */
export const NEW_KEY_RE = /^[a-z]{3,5}(?:-[a-z]{3,5}){7}$/;

/** A key as typed ("Lemon Tango ...", "lemon_tango") in its one spelling:
 *  lower case, every run of spaces, dashes or underscores one dash. */
export function normalizeKeyText(s) {
  if (typeof s !== 'string') return '';
  return s.trim().toLowerCase().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Is this (normalised) text a new key's shape? */
export function isNewKeyShape(s) {
  return typeof s === 'string' && NEW_KEY_RE.test(s);
}

/** Eight words, each drawn uniformly (rejection sampling over 32-bit draws). */
export function makeLoginKey(rand) {
  const n = KEY_WORDS.length;
  const lim = Math.floor(0x100000000 / n) * n;
  const out = [];
  const buf = new Uint32Array(1);
  while (out.length < KEY_LEN) {
    let v;
    if (typeof rand === 'function') v = rand() >>> 0;
    else { crypto.getRandomValues(buf); v = buf[0]; }
    if (v >= lim) continue;
    out.push(KEY_WORDS[v % n]);
  }
  return out.join('-');
}
