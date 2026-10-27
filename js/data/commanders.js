// Named Commanders: the key men of Gilead who sit on the Committee / High Council.
// Everyone below them is counted, not named. Facts follow the Hulu series (and The Testaments, 2026).
// stats 1-10: adm (administration), mil (military), int (intelligence), dip (diplomacy), zeal (piety)
// faction: 'hard' (hardliner) | 'prag' (pragmatist)
// joins: phase in which he becomes available (0 = pre-coup founder)

export const COMMANDERS = {
  waterford: {
    name: 'Fred Waterford', first: 'Frederick', title: 'Commander', city: 'boston', faction: 'hard', joins: 0,
    stats: { adm: 6, mil: 3, int: 4, dip: 7, zeal: 7 }, loyalty: 70, ambition: 9,
    bio: 'Former media and marketing consultant. An architect of the Sons of Jacob\'s proposals — "It\'s what we proposed." Hungry for a seat in Washington.',
    household: { wife: 'Serena Joy Waterford', handmaid: 'Offred (June Osborne)', marthas: ['Rita'], guardians: ['Nick Blaine', 'Isaac'], children: ['Nichole (Holly)'] },
    portfolio: 'dip',
  },
  lawrence: {
    name: 'Joseph Lawrence', first: 'Joseph', title: 'Commander', city: 'boston', faction: 'prag', joins: 0,
    stats: { adm: 10, mil: 4, int: 6, dip: 6, zeal: 2 }, loyalty: 45, ambition: 4,
    bio: 'Economist and author; the prime architect of Gilead\'s economy and of the Colonies. Treats the faith as "a delivery system" for his ideas.',
    household: { wife: 'Eleanor Lawrence', handmaid: 'Ofjoseph', marthas: ['Cora', 'Beth', 'Sienna'], guardians: [], children: [] },
    portfolio: 'adm',
  },
  pryce: {
    name: 'Andrew Pryce', first: 'Andrew', title: 'Commander', city: 'detroit', faction: 'hard', joins: 0,
    stats: { adm: 5, mil: 5, int: 10, dip: 3, zeal: 6 }, loyalty: 85, ambition: 6,
    bio: 'A Detroit career counsellor who recruited the jobless for the Sons of Jacob — Nick among them. Head of the Eyes.',
    household: { wife: 'Mrs. Pryce', handmaid: null, marthas: [], guardians: [], children: [] },
    portfolio: 'int',
  },
  putnam: {
    name: 'Warren Putnam', first: 'Warren', title: 'Commander', city: 'boston', faction: 'hard', joins: 0,
    stats: { adm: 5, mil: 6, int: 6, dip: 3, zeal: 5 }, loyalty: 70, ambition: 6,
    bio: 'Led a unit of the Eyes. Weak where his appetites are concerned — a liability waiting to be found out.',
    household: { wife: 'Naomi Putnam', handmaid: 'Ofwarren (Janine Lindo)', marthas: [], guardians: [], children: ['Angela (Charlotte)'] },
    portfolio: 'int',
  },
  judd: {
    name: 'Michael Judd', first: 'Michael', title: 'Commander', city: 'dc', faction: 'hard', joins: 0,
    stats: { adm: 7, mil: 7, int: 5, dip: 4, zeal: 8 }, loyalty: 80, ambition: 8,
    bio: 'A Sons of Jacob coup leader. Ran the stadium selections in the first days of the Republic.',
    household: { wife: 'Penny Judd', handmaid: null, marthas: [], guardians: [], children: [] },
    portfolio: 'mil',
  },
  guthrie: {
    name: 'Commander Guthrie', first: '—', title: 'Field Commander', city: 'nyc', faction: 'hard', joins: 0,
    stats: { adm: 4, mil: 8, int: 3, dip: 2, zeal: 4 }, loyalty: 55, ambition: 7,
    bio: 'The field commander who "took New York". Later a corrupt transportation minister.',
    household: { wife: 'Mrs. Guthrie', handmaid: null, marthas: [], guardians: [], children: [] },
    portfolio: 'mil',
  },
  cushing: {
    name: 'Ray Cushing', first: 'Raymond', title: 'Commander', city: 'boston', faction: 'hard', joins: 0,
    stats: { adm: 4, mil: 6, int: 7, dip: 5, zeal: 9 }, loyalty: 65, ambition: 8,
    bio: 'A zealot of checkpoints and street executions. Envoy to Canada. Would take the Eyes if Pryce fell.',
    household: { wife: 'Sonia Cushing', handmaid: null, marthas: [], guardians: [], children: [] },
    portfolio: 'int',
  },
  winslow: {
    name: 'George Winslow', first: 'George', title: 'High Commander', city: 'dc', faction: 'hard', joins: 0,
    stats: { adm: 8, mil: 6, int: 5, dip: 8, zeal: 8 }, loyalty: 75, ambition: 8,
    bio: 'Washington\'s smiling face. Leads talks with the Swiss and Canada. "You could make it big."',
    household: { wife: 'Olivia Winslow', handmaid: null, marthas: [], guardians: [], children: ['Polly', '5 others'] },
    portfolio: 'dip',
  },
  calhoun: {
    name: 'Matthew Calhoun', first: 'Matthew', title: 'Commander', city: 'boston', faction: 'hard', joins: 0,
    stats: { adm: 7, mil: 5, int: 6, dip: 4, zeal: 7 }, loyalty: 70, ambition: 7,
    bio: 'The Bostonian Council\'s leading voice once Waterford is gone. Judges even Aunt Lydia.',
    household: { wife: 'Mrs. Calhoun', handmaid: 'Ofmatthew (Natalie)', marthas: [], guardians: [], children: [] },
    portfolio: 'adm',
  },
  mackenzie: {
    name: 'Commander MacKenzie', first: '—', title: 'Commander', city: 'coloradosprings', faction: 'hard', joins: 0,
    stats: { adm: 6, mil: 6, int: 7, dip: 5, zeal: 7 }, loyalty: 80, ambition: 5,
    bio: 'Holds Colorado. Charged with security against "heretics and Mayday". His household raises a girl named Agnes.',
    household: { wife: 'Tabitha MacKenzie', handmaid: null, marthas: ['Rosa', 'Zilla'], guardians: ['Jonathan', 'Garth'], children: ['Agnes Jemima (Hannah)'] },
    portfolio: 'int',
  },
  deeds: {
    name: 'Glen Deeds', first: 'Glen', title: 'Commander', city: 'boston', faction: 'prag', joins: 0,
    stats: { adm: 5, mil: 3, int: 3, dip: 5, zeal: 5 }, loyalty: 60, ambition: 3,
    bio: 'The Waterfords\' neighbour. His Handmaids walk the market as "Ofglen".',
    household: { wife: 'Mrs. Deeds', handmaid: 'Ofglen (Emily Malek)', marthas: [], guardians: [], children: [] },
    portfolio: 'adm',
  },
  bell: {
    name: 'Paul Bell', first: 'Paul', title: 'Commander', city: 'dc', faction: 'prag', joins: 2,
    stats: { adm: 6, mil: 5, int: 4, dip: 6, zeal: 5 }, loyalty: 65, ambition: 5,
    bio: 'A Washington man with a rare streak of mercy.',
    household: { wife: 'Mrs. Bell', handmaid: null, marthas: [], guardians: [], children: [] },
    portfolio: 'dip',
  },
  blaine: {
    name: 'Nick Blaine', first: 'Nick', title: 'Commander', city: 'chicago', faction: 'prag', joins: 2,
    stats: { adm: 5, mil: 8, int: 8, dip: 4, zeal: 2 }, loyalty: 40, ambition: 3,
    bio: 'Sons of Jacob recruit, driver, Eye, then a junior Commander posted to the Chicago front. Quiet. Hard to read.',
    household: { wife: 'Rose Blaine', handmaid: null, marthas: [], guardians: [], children: [] },
    portfolio: 'mil',
  },
  wharton: {
    name: 'Gabriel Wharton', first: 'Gabriel', title: 'High Commander', city: 'dc', faction: 'hard', joins: 3,
    stats: { adm: 7, mil: 7, int: 6, dip: 6, zeal: 9 }, loyalty: 75, ambition: 9,
    bio: 'Plays the progressive when it suits him. Underneath: the hardest of the hardliners.',
    household: { wife: '—', handmaid: null, marthas: [], guardians: [], children: ['Rose (wife of Nick Blaine)'] },
    portfolio: 'mil',
  },
  weston: {
    name: 'Seth Weston', first: 'Seth', title: 'Commander', city: 'dc', faction: 'hard', joins: 3,
    stats: { adm: 5, mil: 5, int: 9, dip: 4, zeal: 7 }, loyalty: 75, ambition: 7,
    bio: 'A rising star of the Eyes.',
    household: { wife: '—', handmaid: null, marthas: [], guardians: [], children: [] },
    portfolio: 'int',
  },
  reynolds: {
    name: 'Commander Reynolds', first: '—', title: 'Commander', city: 'boston', faction: 'hard', joins: 3,
    stats: { adm: 4, mil: 7, int: 4, dip: 2, zeal: 7 }, loyalty: 70, ambition: 6,
    bio: 'Believes every problem has an aerial solution.',
    household: { wife: 'Mrs. Reynolds', handmaid: null, marthas: [], guardians: [], children: [] },
    portfolio: 'mil',
  },
  chapin: {
    name: 'Commander Chapin', first: '—', title: 'Commander', city: 'boston', faction: 'hard', joins: 4,
    stats: { adm: 6, mil: 8, int: 5, dip: 3, zeal: 6 }, loyalty: 80, ambition: 5,
    bio: 'A soldier\'s Commander. His son Garth serves as a Guardian.',
    household: { wife: 'Mrs. Chapin', handmaid: null, marthas: [], guardians: ['Garth Chapin'], children: ['Garth'] },
    portfolio: 'mil',
  },
};

export const PORTFOLIOS = {
  adm: { name: 'Economy & Administration', icon: '⚖', desc: 'Treasury, supplies and construction speed' },
  mil: { name: 'War & the Guardians', icon: '⚔', desc: 'Offensives and defence of the front' },
  int: { name: 'The Eyes', icon: '👁', desc: 'Suppression of Mayday and detention yield' },
  dip: { name: 'Foreign Affairs', icon: '✉', desc: 'International standing and trade' },
  faith: { name: 'Faith & Rites', icon: '✝', desc: 'Piety, the Ceremony, Prayvaganzas' },
};

export const AUNTS = ['Aunt Lydia', 'Aunt Elizabeth', 'Aunt Ruth', 'Aunt Vidala', 'Aunt Gabbana', 'Aunt Estée', 'Aunt Sara', 'Aunt Kimberly'];
