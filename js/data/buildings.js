// Buildable institutions. Conversion centres move people from the unprocessed pools into Gilead's classes.
// from: pool or class consumed; to: class produced; cap: trainees at once; days: course length.
// tiers: [converted building, purpose-built]. Converted buildings are cheap and fast; new builds unlock later.
// names: biblical names used in order for each new institution of that type.

export const BUILDINGS = {
  redcenter: {
    label: 'Handmaid Training Centre', short: 'Red Centre', icon: 'school', color: '#d1343b', cls: 'handmaids',
    from: 'fertile', to: 'handmaids', unlock: 'd_roundups',
    desc: 'Fertile women are "re-educated" by the Aunts into Handmaids. Staffed by Aunts.',
    tiers: [
      { name: 'Converted high school', cost: 60, build: 20, cap: 160, days: 60, upkeep: 0.3 },
      { name: 'Purpose-built Centre', cost: 220, build: 60, cap: 700, days: 45, upkeep: 0.9, unlock: 'd_new_centres' },
    ],
    names: ['Rachel and Leah Center', 'Bilhah Center', 'Zilpah Center', 'Hagar Center', 'Hannah Center', 'Sarah Center', 'Rebekah Center', 'Elisabeth Center', 'Rachel and Leah Center II', 'Hannah Center II'],
    needsAunts: 6,
  },
  marthahouse: {
    label: 'Martha House', short: 'Martha House', icon: 'home', color: '#7c8b67', cls: 'marthas',
    from: 'women', to: 'marthas', unlock: 'd_republic',
    desc: 'Infertile women trained for domestic service in the houses of the faithful.',
    tiers: [
      { name: 'Converted convent', cost: 35, build: 14, cap: 900, days: 30, upkeep: 0.2 },
      { name: 'Purpose-built House', cost: 140, build: 45, cap: 3500, days: 25, upkeep: 0.5, unlock: 'd_new_centres' },
    ],
    names: ['Bethany House', 'Martha and Mary House', 'Dorcas House', 'Tabitha House', 'Priscilla House', 'Lois House', 'Eunice House', 'Ruth House'],
  },
  ardua: {
    label: 'Aunts\' Hall', short: 'Aunts\' Hall', icon: 'book-open', color: '#a07a52', cls: 'aunts',
    from: 'women', to: 'aunts', unlock: 'd_republic',
    desc: 'The only women permitted to read. Aunts staff every Red Centre, Colony and Wife school.',
    tiers: [
      { name: 'Converted college library', cost: 50, build: 20, cap: 120, days: 90, upkeep: 0.2 },
      { name: 'Purpose-built Hall', cost: 160, build: 50, cap: 450, days: 75, upkeep: 0.5, unlock: 'd_new_centres' },
    ],
    names: ['Ardua Hall', 'Deborah Hall', 'Huldah Hall', 'Miriam Hall', 'Anna Hall', 'Jael Hall'],
  },
  barracks: {
    label: 'Guardian Barracks', short: 'Barracks', icon: 'tent', color: '#4a6cc4', cls: 'guardians',
    from: 'men', to: 'guardians', unlock: 'd_martial_law',
    desc: 'Trains Guardians of the Faith — the regime\'s physical muscle. Troops move to the front by rail.',
    tiers: [
      { name: 'Seized army base', cost: 70, build: 15, cap: 5000, days: 30, upkeep: 0.6 },
      { name: 'New fort', cost: 240, build: 50, cap: 14000, days: 28, upkeep: 1.4, unlock: 'd_new_centres' },
    ],
    names: ['Fort Stevens', 'Fort Gideon', 'Fort Joshua', 'Camp Caleb', 'Fort Jehu', 'Camp Samson', 'Fort Barak', 'Fort Joab'],
  },
  eyes: {
    label: 'Bureau of the Eyes', short: 'Eyes Bureau', icon: 'eye', color: '#8b93a1', cls: 'eyes',
    from: 'men', to: 'eyes', unlock: 'd_black_vans',
    desc: 'The regime\'s mental muscle. Eyes infiltrate households, run black vans and hunt Mayday.',
    tiers: [
      { name: 'Converted field office', cost: 80, build: 20, cap: 600, days: 60, upkeep: 0.5 },
      { name: 'Watch House', cost: 220, build: 50, cap: 2000, days: 45, upkeep: 1.0, unlock: 'd_new_centres' },
    ],
    names: ['Mizpah Station', 'Ezekiel Watch House', 'Habakkuk Station', 'Zophim House', 'Jezreel Station', 'Shamah Station'],
  },
  detention: {
    label: 'Detention Centre', short: 'Detention', icon: 'bars', color: '#5d6470', cls: 'detainees',
    from: 'detainees', to: 'processed', unlock: 'd_martial_law',
    desc: 'Where the Eyes extract information. Detainees yield intelligence on Mayday, then go to the Colonies or the Wall.',
    tiers: [
      { name: 'Converted prison', cost: 50, build: 12, cap: 2500, days: 20, upkeep: 0.4 },
      { name: 'Maximum-security facility', cost: 180, build: 40, cap: 9000, days: 18, upkeep: 0.9, unlock: 'd_new_centres' },
    ],
    names: ['Achor Detention Center', 'Marah Detention Center', 'Gehenna Detention Center', 'Jericho Detention Center', 'Shinar Detention Center'],
  },
  colony: {
    label: 'The Colonies', short: 'Colony', icon: 'radiation', color: '#b39a3e', cls: 'unwomen', housing: true,
    unlock: 'd_colonies',
    desc: 'Unwomen shovel radioactive topsoil until they die. Reclaimed land slowly restores fertility. Lawrence called the difference from execution "a technical distinction".',
    tiers: [
      { name: 'Toxic cleanup colony', cost: 60, build: 15, cap: 40000, upkeep: 0.3 },
      { name: 'Expanded colony', cost: 160, build: 40, cap: 120000, upkeep: 0.6, unlock: 'd_new_centres' },
    ],
    names: ['Gomorrah Colony', 'Admah Colony', 'Zeboim Colony', 'Zoar Colony', 'Sodom Colony', 'Bela Colony'],
  },
  agricolony: {
    label: 'Agricultural Colony', short: 'Agri-Colony', icon: 'wheat', color: '#7f9a45', cls: 'unwomen', housing: true,
    unlock: 'd_organic',
    desc: 'Mandatory organic agriculture worked by Unwomen and Econopeople. Feeds Gilead — and is sold abroad as "completely organic".',
    tiers: [
      { name: 'Seized farmland', cost: 50, build: 15, cap: 30000, upkeep: 0.2 },
      { name: 'Model farm colony', cost: 150, build: 40, cap: 90000, upkeep: 0.5, unlock: 'd_new_centres' },
    ],
    names: ['Goshen Agricultural Colony', 'Canaan Fields', 'Eshcol Vineyards', 'Sharon Plains Colony', 'Gilgal Farms', 'Jezreel Valley Colony'],
  },
  wifeschool: {
    label: 'Wife School', short: 'Wife School', icon: 'flower', color: '#d987a8', cls: 'daughters',
    from: 'daughters', to: 'wives', unlock: 'd_wife_schools',
    desc: 'Daughters — "Plums" in pink, then green — are prepared for marriage to Commanders. They are not taught to read.',
    tiers: [
      { name: 'Converted girls\' academy', cost: 70, build: 20, cap: 300, days: 180, upkeep: 0.3 },
      { name: 'Premarital Preparatory Academy', cost: 200, build: 50, cap: 900, days: 150, upkeep: 0.6, unlock: 'd_new_centres' },
    ],
    names: ['Rubies Premarital Preparatory', 'Esther Academy', 'Abigail School', 'Rebekah Preparatory', 'Aunt Lydia Premarital Preparatory Academy'],
  },
  jezebels: {
    label: 'Jezebels', short: 'Jezebels', icon: 'wine', color: '#9b4f8b', cls: 'jezebels',
    from: 'women', to: 'jezebels', unlock: 'd_jezebels',
    desc: 'A secret club for Commanders and foreign delegates. Buys loyalty — and leaks secrets to Mayday.',
    tiers: [{ name: 'Seized hotel', cost: 60, build: 10, cap: 150, days: 30, upkeep: 0.3 }],
    names: ['Jezebels'], unique: 'city',
  },
  wall: {
    label: 'The Wall', short: 'The Wall', icon: 'wall', color: '#8a6e58', unlock: 'd_wall',
    desc: 'Salvagings and hangings on the old Harvard wall. Fear rises, unrest falls — the world watches.',
    tiers: [{ name: 'Brick wall', cost: 15, build: 5 }], names: ['The Wall'], unique: 'city',
  },
  market: {
    label: 'Loaves and Fishes', short: 'Market', icon: 'fish', color: '#c49a4a', unlock: 'd_tokens',
    desc: 'Token market with pictogram signs (women may not read). Distributes supplies; steadies the city.',
    tiers: [{ name: 'Seized supermarket', cost: 25, build: 7 }], names: ['Loaves and Fishes'], unique: 'city',
  },
  church: {
    label: 'Prayvaganza Hall', short: 'Prayvaganza', icon: 'church', color: '#c9b27a', unlock: 'd_prayvaganza',
    desc: 'Mass prayer and arranged mass weddings. Piety rises; Econowives are matched.',
    tiers: [{ name: 'Converted arena', cost: 40, build: 12 }], names: ['Prayvaganza Hall'], unique: 'city',
  },
  airfield: {
    label: 'Airfield', short: 'Airfield', icon: 'plane', color: '#6f8fb8', unlock: 'd_martial_law',
    desc: 'Gilead\'s air force. Enables air strikes, drone strikes and helicopter patrols within range.',
    tiers: [{ name: 'Seized airbase', cost: 90, build: 15 }], names: ['Airfield'], unique: 'city', range: 330,
  },
  depot: {
    label: 'Rail Depot', short: 'Depot', icon: 'train', color: '#a8835a', unlock: 'd_martial_law',
    desc: 'Rail yard and supply hub. Fronts within reach of a depot are supplied; troop trains run from here.',
    tiers: [{ name: 'Rail yard', cost: 40, build: 10 }], names: ['Rail Depot'], unique: 'city', range: 260,
  },
  checkpoint: {
    label: 'Checkpoints', short: 'Checkpoints', icon: 'barrier', color: '#c48a3a', unlock: 'd_checkpoints',
    desc: 'Papers, please. Fewer escapes to Canada, less Mayday traffic — and resentment.',
    tiers: [{ name: 'Checkpoint ring', cost: 20, build: 4 }], names: ['Checkpoints'], unique: 'city',
  },
  birthcenter: {
    label: 'Birthing House', short: 'Birthing House', icon: 'heart-plus', color: '#e8a0b0', unlock: 'd_birth_day',
    desc: 'Birth Day rites and the best neonatal care left in Gilead. More babies survive.',
    tiers: [{ name: 'Converted hospital wing', cost: 80, build: 20 }], names: ['Shiphrah and Puah Birthing House'], unique: 'city',
  },
  newbethlehem: {
    label: 'New Bethlehem', short: 'New Bethlehem', icon: 'dove', color: '#7fb8d8', unlock: 'd_new_bethlehem',
    desc: '"No Handmaids, no hangings." A softer enclave to lure refugees home and show the world Gilead\'s compassion.',
    tiers: [{ name: 'Island enclave', cost: 400, build: 60 }], names: ['New Bethlehem'], unique: 'nation', cities: ['boston'],
  },
};

export const BUILD_ORDER = ['redcenter', 'marthahouse', 'ardua', 'barracks', 'eyes', 'detention', 'colony', 'agricolony',
  'wifeschool', 'jezebels', 'wall', 'market', 'church', 'airfield', 'depot', 'checkpoint', 'birthcenter', 'newbethlehem'];
