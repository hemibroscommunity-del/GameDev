/* ═══ v2.3.5306: THE PAGE'S ONE READER OF ITS SWITCHES (grand plan step 7.1, card T PR 6) ═══
 *
 * Every `?name=` the page reads, read here: the address is read at each ask
 * and parsed once for each address it holds (a page may change its own:
 * history.replaceState), and a read anywhere else asks this file by the
 * switch's name.
 * The table of names is tools/guards/lib/switches.mjs (docs/SWITCHES.md);
 * the rules: docs/specs/switch-table.md, "The page's one reader".
 *
 * ONE FUNCTION A FORM (the row's `thrown` on the page):
 *   sw(name)       a switch's row form, `=0` and the words its read takes
 *                  (`=0, off, false`), `=1`, `=all`, or `present`: true when
 *                  this address throws it, or throws a switch it NEEDS (rule
 *                  4: a dependent turns off with what it needs);
 *   swHas(name)    the name in the address at all (`?x`, `?x=`, `?x=7`);
 *   swValue(name)  the name's value as written ('' for `?x`), or null.
 *   thrown()       the names thrown on this page, for the report's `sw`
 *                  (SHAPES part 5).
 * A name is written as the row's, with or without its `?`.
 *
 * A MOVE CHANGES NO ADDRESS'S MEANING.  A read moved here is held by the
 * guard (tools/guards/switch-reader.test.mjs) to give the same answer as its
 * old test on a fixed set of addresses: the name absent, present, `=0`,
 * `=1`, `=off`, `=false`, a value, and the name inside a longer one.
 *
 * NO IMPORTS: node tests it (switch-reader.test), and any file may ask it.
 * The forms and needs below are the table's, written by
 * `node tools/guards/switches.test.mjs --write` between the markers and held
 * equal by the guard: one source (the plan's rule 2).  Never edited by hand.
 */

/* ── made by tools/guards/switches.test.mjs --write: the page's forms (the
   words that throw a switch; '' its presence; '*' a value: read by swValue)
   and the needs the page can see.  Do not edit. ── */
/* @@switch-forms */
const FORMS = {
  'codelazy': '0|off|false',
  'gfxlean': '0|off|false',
  'govern': '*',
  'groundkeep': '0|off|false',
  'groundlean': '0',
  'heaplean': '0|off|false',
  'lookarmour': '0',
  'lookfolk': '0',
  'lookpalette': '0',
  'lookshirt': '0',
  'onecopy': '0',
  'picnumbers': '0',
  'sfxcache': '0|off',
  'soundgate': '0|off|false|no',
  'viewcap': '0',
  'voicecap': '0|off',
  'afterpaint': '0',
  'aimcaret': '0',
  'allydrafts': '0',
  'alphaclip': '',
  'arenadoor': '0',
  'audioreset': '0',
  'autohold': '*',
  'avatarholdms': '*',
  'bakekeep': '0',
  'bakeread': '0',
  'bakeurl': '0',
  'bandbeat': '0|off|false',
  'bandgrip': '1',
  'banners': 'all',
  'barretry': '0',
  'beathold': '0',
  'beltstandin': '0|off|false',
  'bigtown': '',
  'bindfix': '0',
  'bladesoft': '*',
  'boardroll': '0|off|false',
  'bodyhere': '0',
  'bodyretry': '0',
  'bodyworker': '0',
  'bowfeel': '0',
  'bropages': '0',
  'burnfire': '0',
  'burstidle': '0',
  'burstnumbers': '0',
  'camfollow': '0',
  'camsnap': '0',
  'canvascheck': '0',
  'capehood': '0',
  'caperetry': '0',
  'caustics': '*',
  'chargebtn': '0',
  'coinflip': '0',
  'combatreset': '0',
  'conndoor': '0',
  'create': '1',
  'crowd': '*',
  'ctxbuttons': '0',
  'dashgrow': '0',
  'dbltap': '0',
  'deathbig': '*',
  'deathkind': '*',
  'deathstrip': '0',
  'deathzones': '0',
  'debug': '1',
  'depthbuf': '',
  'deskwide': '0|off|false',
  'dev': '1',
  'diet': '*',
  'dmgscale': '*',
  'dmgwords': '0',
  'droplines': '0',
  'dtsmooth': '0|off|false',
  'dueldoor': '0',
  'dungeondoor': '0',
  'dyingdoor': '0',
  'elemicons': '0',
  'equiplook': '0',
  'equipredraw': '0',
  'figround': '1',
  'fill': '0',
  'firelegless': '0',
  'firelit': '0',
  'firelog': '0',
  'fishgrip': '1',
  'fishgriptrousers': '1',
  'fishspot': '0',
  'flipbake': '0',
  'foldgentle': '0|off|false',
  'folkbake': '0',
  'folksheets': '0',
  'folkskills': '0',
  'folkwalk': '0',
  'folkwork': '0',
  'framepack': '0|off|false',
  'framesteps': '0',
  'freefire': '0',
  'fullpush': '0',
  'fxmade': '0',
  'fxsheets': '0',
  'garmentspecks': '0',
  'gearadopt': '0',
  'gearlook': '0',
  'gearpackgentle': '0|off|false',
  'gearretry': '0',
  'gearwalk': '0',
  'govcool': '0',
  'gpucopies': '',
  'gripguess': '0',
  'groundbg': '1',
  'groundsend': '0',
  'groundwait': '0',
  'guarddoor': '0',
  'guest': '1',
  'guidearrow': '0',
  'hairmasks': '0',
  'halloween': '*',
  'harvestdoor': '0',
  'headframes': '',
  'headlook': '0|off|false',
  'healms': '*',
  'heaptrim': '0|off|false',
  'held': '0',
  'hemiface': '1',
  'herecells': '0',
  'holdauto': '0',
  'hud': '0',
  'hudart': '0',
  'hudbars': '0',
  'iconretry': '0',
  'jumpbtn': '0',
  'jumpicon': '*',
  'jumpms': '*',
  'keepimage': '0',
  'laddercrowd': '0|off|false',
  'ladderpass': '0|off|false',
  'ladderpix': '0|off|false',
  'ladderrate': '0|off|false',
  'lane': '*',
  'layerpush': '',
  'legslook': '0|off|false',
  'legsync': '0',
  'lightfx': '*',
  'locknear': '0',
  'login': '1',
  'loginspin': '*',
  'lookatlas': '0',
  'lookform': '0',
  'lookinline': '',
  'lookprobe': '',
  'lootbeam': '0',
  'lootpop': '0',
  'loudclear': '',
  'magicburst': '0',
  'manual': '*',
  'mappin': '0',
  'memalarm': '0',
  'movementreset': '0',
  'musicdecode': '',
  'narrow': '',
  'nearpick': '0',
  'nmlask': '0',
  'nmlaskms': '*',
  'noauras': '',
  'nobeds': '',
  'nobuildingfire': '',
  'nodebug': '1',
  'nofade': '',
  'noforge': '',
  'noheal': '',
  'nolandmusic': '',
  'nolayergroups': '',
  'nolife': '',
  'nomapdetail': '',
  'noobjects': '',
  'nopalette': '',
  'nopeercull': '',
  'norendergroups': '',
  'noresume': '1',
  'nosilhouette': '',
  'nospawn': '',
  'nostormfx': '',
  'noswim': '',
  'nowaterfx': '',
  'nowaves': '',
  'nowindupfx': '',
  'npcheads': '0',
  'npcprox': '',
  'oneband': '0',
  'onebatch': '*',
  'onepic': '0',
  'onepicnear': '*',
  'orebreakms': '*',
  'owedrebuild': '0',
  'ownplate': '1',
  'p256': '*',
  'p3colour': '0',
  'p3cols': '1',
  'pace': '0|off|false',
  'packworker': '0',
  'padgold': '1',
  'padskin': '0',
  'pagebases': '0|off|false',
  'partydoor': '0',
  'perf': '1',
  'petsheet': '0',
  'phoneres': '0',
  'pickwood': '0',
  'picsretry': '0',
  'pixbudget': '*',
  'pixidelay': '*',
  'placing': '2',
  'plaintee': '0',
  'plaintown': '',
  'platelayer': '0',
  'playvwlive': '1',
  'pointsfly': '0',
  'poolkeep': '',
  'popupworld': '',
  'portraitgentle': '0|off|false',
  'posedoor': '0',
  'questline': '1',
  'questpages': '0',
  'questpath': '',
  'racedoor': '0',
  'rangedstick': '0',
  'rankstyle': '0',
  'reachspecials': '0',
  'repairms': '*',
  'report': '0',
  'res': '*',
  'retrylooks': '0',
  'ridecoast': '0|off|false',
  'ridedoor': '0',
  'rimsprint': '0',
  'room': '*',
  'rostercookie': '0|off|false',
  'seacover': '0',
  'selftest': '*',
  'sfxahead': '0|off',
  'shade': '0',
  'shadowhp': '0',
  'shadowlock': '0',
  'shadowpass': '',
  'shadowsnap': '1',
  'sharp': '0',
  'sheen': '*',
  'sheenpass': '',
  'sheetfetch': '0',
  'shieldaim': 'mouse',
  'shieldretry': '0',
  'shine': '*',
  'shirtworker': '0|off|false',
  'shotimage': '0',
  'sightline': '1',
  'skillsreset': '0',
  'skulldoor': '0',
  'slimesplat': '*',
  'slimewalk': '0|off|false',
  'socialreset': '0',
  'sootms': '*',
  'sounds': '',
  'sparelater': '0',
  'specialnow': '0',
  'speedms': '*',
  'stafffeel': '0',
  'standinlegs': '0',
  'starcue': '0',
  'stepvol': '*',
  'stereosfx': '',
  'stripgentle': '0|off|false',
  'stripslice': '*',
  'stripworker': '0|off|false',
  'swingbonus': '0',
  'swordfeel': '0',
  'tabid': '0',
  'tapms': '*',
  'tapthrough': '',
  'targetframe': '0',
  'teechip': '0',
  'textkeep': '',
  'thawjudge': '0',
  'threatblock': '0',
  'thumbarc': '0',
  'tod': '*',
  'toolsolid': '0|off|false',
  'topgold': '0',
  'townchat': '0',
  'townparts': '0',
  'townsfolkreset': '0',
  'tradedoor': '0',
  'tradeside': '*',
  'traitretry': '0',
  'traittimeoutms': '*',
  'treefade': '0',
  'treenumbers': '0',
  'trial': '',
  'trialhud': '',
  'turnzone': '*',
  'ui2': '0',
  'ui2look': '0',
  'ui2shine': '0',
  'uikit': '1',
  'uploadicons': '0',
  'v17look': '0',
  'v17wide': '0',
  'veildoor': '0',
  'warmonce': '0',
  'waves': '*',
  'wayback': '',
  'wdgeterror': '',
  'weaponlook': '0',
  'weaponretry': '0',
  'webskip': '0',
  'wheelwhole': '',
  'windowdoor': '0',
  'wirereset': '0',
  'worldicons': '0',
  'worldreset': '0',
  'xpfly': '0',
  'zindexall': '',
  'zoom': '*',
};
const NEEDS = {
  'lookarmour': ['lookpalette'],
  'lookfolk': ['lookpalette'],
  'lookshirt': ['lookpalette'],
  'barretry': ['retrylooks'],
  'beathold': ['pace'],
  'bodyretry': ['retrylooks'],
  'caperetry': ['retrylooks'],
  'folksheets': ['lookfolk'],
  'folkskills': ['lookfolk'],
  'gearlook': ['lookpalette'],
  'gearretry': ['retrylooks'],
  'gearwalk': ['lookpalette'],
  'govcool': ['govern'],
  'headlook': ['lookpalette'],
  'hudart': ['hud'],
  'iconretry': ['retrylooks'],
  'laddercrowd': ['govern'],
  'ladderpass': ['govern'],
  'ladderpix': ['govern'],
  'ladderrate': ['govern'],
  'legslook': ['lookpalette'],
  'lookatlas': ['lookpalette'],
  'memalarm': ['govern'],
  'padgold': ['padskin'],
  'picsretry': ['retrylooks'],
  'plaintee': ['lookshirt'],
  'shieldretry': ['retrylooks'],
  'teechip': ['plaintee'],
  'traitretry': ['retrylooks'],
  'weaponlook': ['lookpalette'],
  'weaponretry': ['retrylooks'],
};
/* @@end */

const bare = (name) => String(name || '').replace(/^\?/, '');

/** A reader over one address (`?a=1&b`): its own answers, nothing cached
 *  beyond it.  The page's is made once, from location.search (below). */
export function readerFor(search) {
  let params;
  try { params = new URLSearchParams(String(search || '')); } catch (e) { params = new URLSearchParams(''); }
  const has = (name) => params.has(bare(name));
  const value = (name) => { const v = params.get(bare(name)); return v === null ? null : v; };
  const own = (name) => {
    const n = bare(name);
    const form = Object.prototype.hasOwnProperty.call(FORMS, n) ? FORMS[n] : null;
    if (form === null || form === '*') return false;   /* no row form: swValue's */
    if (!params.has(n)) return false;
    if (form === '') return true;                        /* present */
    return form.split('|').includes(params.get(n));
  };
  const memo = new Map();
  const thrownHere = (name, path) => {
    const n = bare(name);
    if (memo.has(n)) return memo.get(n);
    if (path.has(n)) return false;                       /* no cycle (the guard's check 11) */
    path.add(n);
    let on = own(n);
    if (!on && Object.prototype.hasOwnProperty.call(NEEDS, n)) on = NEEDS[n].some((m) => thrownHere(m, path));
    path.delete(n);
    memo.set(n, on);
    return on;
  };
  return {
    sw: (name) => thrownHere(name, new Set()),
    swHas: has,
    swValue: value,
    thrown: () => Object.keys(FORMS).filter((n) => (FORMS[n] === '*' ? params.has(n) : thrownHere(n, new Set()))).map((n) => '?' + n),
  };
}

/* the page's: the address read at every ask, parsed again only when it
   changed.  v2.3.5306 (the gatekeeper's medium, sitting 18): the page DOES
   change its own address (BroTown.jsx drops `create`, `login` and
   `noresume` with history.replaceState; tests flip a switch mid-page), so
   one copy kept from the first ask would answer for an address gone.  A
   string compare an ask; a parse only on a change. */
let _page = null;
let _search = null;

/** v2.3.5311: the page's address as it is now ('?a=1&b', or '' with no page
 *  or no address): THE one read of location.search.  A rule that is handed
 *  the whole address (`killXpOn(search)`, `q ?? address` for its tests) is
 *  handed this, so its meaning is unchanged (the planning session's answer,
 *  2026-11-17: one read here, the sites call it). */
export function pageAddress() {
  /* v2.3.5313: `location`, else `window.location` (one object on a page; a
     node suite that stubs only `window` -- banner-reach -- reads as before) */
  try {
    const loc = typeof location !== 'undefined' ? location : (typeof window !== 'undefined' && window ? window.location : null);
    return (loc && loc.search) || '';
  } catch (e) { return ''; }
}

function page() {
  const s = pageAddress();
  if (_page && s === _search) return _page;
  _search = s;
  _page = readerFor(s);
  return _page;
}

export function sw(name) { return page().sw(name); }
export function swHas(name) { return page().swHas(name); }
export function swValue(name) { return page().swValue(name); }
export function thrown() { return page().thrown(); }
