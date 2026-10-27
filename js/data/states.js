// State metadata. Keyed by postal abbreviation; `fips` joins to geo.js shapes.
// pop: 2014 population in millions. faith: share of highly religious adults (0-1, approx. Pew 2014).
// bases: major military installations [name, weight 1-3] — targets for pre-coup infiltration.

export const STATES = {
  AL: { fips: '01', name: 'Alabama', pop: 4.85, faith: 0.77, bases: [['Redstone Arsenal', 2], ['Fort Rucker', 1]] },
  AK: { fips: '02', name: 'Alaska', pop: 0.74, faith: 0.45, bases: [['JB Elmendorf-Richardson', 2]], exile: true },
  AZ: { fips: '04', name: 'Arizona', pop: 6.73, faith: 0.53, bases: [['Fort Huachuca', 1], ['Luke AFB', 2]] },
  AR: { fips: '05', name: 'Arkansas', pop: 2.97, faith: 0.7, bases: [['Little Rock AFB', 1]] },
  CA: { fips: '06', name: 'California', pop: 38.8, faith: 0.49, bases: [['Camp Pendleton', 3], ['Naval Base San Diego', 3], ['Travis AFB', 1]] },
  CO: { fips: '08', name: 'Colorado', pop: 5.36, faith: 0.47, bases: [['Fort Carson', 3], ['Peterson AFB', 2], ['USAF Academy', 1]] },
  CT: { fips: '09', name: 'Connecticut', pop: 3.59, faith: 0.43, bases: [['Naval Sub Base New London', 2]] },
  DE: { fips: '10', name: 'Delaware', pop: 0.94, faith: 0.51, bases: [['Dover AFB', 1]] },
  DC: { fips: '11', name: 'District of Columbia', pop: 0.66, faith: 0.48, bases: [['Fort McNair', 2], ['The Pentagon', 3]] },
  FL: { fips: '12', name: 'Florida', pop: 19.9, faith: 0.56, bases: [['Eglin AFB', 2], ['MacDill AFB', 2], ['NAS Jacksonville', 1]] },
  GA: { fips: '13', name: 'Georgia', pop: 10.1, faith: 0.66, bases: [['Fort Benning', 3], ['Fort Stewart', 2]] },
  HI: { fips: '15', name: 'Hawaii', pop: 1.42, faith: 0.46, bases: [['Pearl Harbor', 3]], exile: true },
  ID: { fips: '16', name: 'Idaho', pop: 1.63, faith: 0.6, bases: [['Mountain Home AFB', 1]] },
  IL: { fips: '17', name: 'Illinois', pop: 12.88, faith: 0.52, bases: [['Naval Station Great Lakes', 2], ['Scott AFB', 1]] },
  IN: { fips: '18', name: 'Indiana', pop: 6.6, faith: 0.6, bases: [['Camp Atterbury', 1]] },
  IA: { fips: '19', name: 'Iowa', pop: 3.11, faith: 0.55, bases: [] },
  KS: { fips: '20', name: 'Kansas', pop: 2.9, faith: 0.6, bases: [['Fort Riley', 2], ['Fort Leavenworth', 1]] },
  KY: { fips: '21', name: 'Kentucky', pop: 4.41, faith: 0.66, bases: [['Fort Campbell', 3], ['Fort Knox', 2]] },
  LA: { fips: '22', name: 'Louisiana', pop: 4.65, faith: 0.71, bases: [['Fort Polk', 2], ['Barksdale AFB', 2]] },
  ME: { fips: '23', name: 'Maine', pop: 1.33, faith: 0.34, bases: [['Portsmouth Naval Shipyard', 1]] },
  MD: { fips: '24', name: 'Maryland', pop: 5.98, faith: 0.54, bases: [['Fort Meade', 2], ['JB Andrews', 2]] },
  MA: { fips: '25', name: 'Massachusetts', pop: 6.75, faith: 0.33, bases: [['Hanscom AFB (Bedford)', 2], ['Fort Devens', 1]] },
  MI: { fips: '26', name: 'Michigan', pop: 9.91, faith: 0.53, bases: [['Selfridge ANGB', 1]] },
  MN: { fips: '27', name: 'Minnesota', pop: 5.46, faith: 0.5, bases: [] },
  MS: { fips: '28', name: 'Mississippi', pop: 2.99, faith: 0.77, bases: [['Keesler AFB', 1], ['Camp Shelby', 1]] },
  MO: { fips: '29', name: 'Missouri', pop: 6.06, faith: 0.6, bases: [['Fort Leonard Wood', 2], ['Whiteman AFB', 1]] },
  MT: { fips: '30', name: 'Montana', pop: 1.02, faith: 0.49, bases: [['Malmstrom AFB', 1]] },
  NE: { fips: '31', name: 'Nebraska', pop: 1.88, faith: 0.58, bases: [['Offutt AFB', 2]] },
  NV: { fips: '32', name: 'Nevada', pop: 2.84, faith: 0.45, bases: [['Nellis AFB', 2]] },
  NH: { fips: '33', name: 'New Hampshire', pop: 1.33, faith: 0.33, bases: [] },
  NJ: { fips: '34', name: 'New Jersey', pop: 8.94, faith: 0.5, bases: [['JB McGuire-Dix-Lakehurst', 2]] },
  NM: { fips: '35', name: 'New Mexico', pop: 2.09, faith: 0.55, bases: [['Kirtland AFB', 1], ['White Sands', 1]] },
  NY: { fips: '36', name: 'New York', pop: 19.75, faith: 0.46, bases: [['Fort Drum', 3], ['West Point', 2]] },
  NC: { fips: '37', name: 'North Carolina', pop: 9.94, faith: 0.65, bases: [['Fort Bragg', 3], ['Camp Lejeune', 3]] },
  ND: { fips: '38', name: 'North Dakota', pop: 0.74, faith: 0.55, bases: [['Minot AFB', 1]] },
  OH: { fips: '39', name: 'Ohio', pop: 11.59, faith: 0.55, bases: [['Wright-Patterson AFB', 2]] },
  OK: { fips: '40', name: 'Oklahoma', pop: 3.88, faith: 0.68, bases: [['Fort Sill', 2], ['Tinker AFB', 1]] },
  OR: { fips: '41', name: 'Oregon', pop: 3.97, faith: 0.47, bases: [] },
  PA: { fips: '42', name: 'Pennsylvania', pop: 12.79, faith: 0.54, bases: [['Carlisle Barracks', 1], ['Letterkenny Depot', 1]] },
  RI: { fips: '44', name: 'Rhode Island', pop: 1.06, faith: 0.44, bases: [['Naval Station Newport', 1]] },
  SC: { fips: '45', name: 'South Carolina', pop: 4.83, faith: 0.7, bases: [['Fort Jackson', 2], ['Parris Island', 2]] },
  SD: { fips: '46', name: 'South Dakota', pop: 0.85, faith: 0.6, bases: [['Ellsworth AFB', 1]] },
  TN: { fips: '47', name: 'Tennessee', pop: 6.55, faith: 0.73, bases: [['Arnold AFB', 1]] },
  TX: { fips: '48', name: 'Texas', pop: 26.96, faith: 0.64, bases: [['Fort Hood', 3], ['Fort Bliss', 3], ['JB San Antonio', 2]] },
  UT: { fips: '49', name: 'Utah', pop: 2.94, faith: 0.64, bases: [['Hill AFB', 2]] },
  VT: { fips: '50', name: 'Vermont', pop: 0.63, faith: 0.33, bases: [] },
  VA: { fips: '51', name: 'Virginia', pop: 8.33, faith: 0.6, bases: [['Naval Station Norfolk', 3], ['Quantico', 2]] },
  WA: { fips: '53', name: 'Washington', pop: 7.06, faith: 0.46, bases: [['JB Lewis-McChord', 3]] },
  WV: { fips: '54', name: 'West Virginia', pop: 1.85, faith: 0.64, bases: [] },
  WI: { fips: '55', name: 'Wisconsin', pop: 5.76, faith: 0.5, bases: [['Fort McCoy', 1]] },
  WY: { fips: '56', name: 'Wyoming', pop: 0.58, faith: 0.54, bases: [['F.E. Warren AFB', 1]] },
};

export const FIPS_TO_ABBR = Object.fromEntries(Object.entries(STATES).map(([a, s]) => [s.fips, a]));

// Gilead's districts. Boston sat first in the "New Gilead District", later the "Eastern District";
// the High Council sits in Washington. Others are the game's administrative regions, drawn
// from the official 2019/2022 Gilead maps' loyal / conflict / colonies zones.
export const DISTRICTS = {
  capital: { name: 'Capital District', seat: 'dc', seats: 61, states: ['DC', 'MD', 'VA', 'DE', 'WV'] },
  eastern: { name: 'New Gilead District', later: 'Eastern District', seat: 'boston', seats: 49, states: ['MA', 'RI', 'CT', 'NH', 'VT', 'ME'], council: 'Bostonian Council' },
  hudson: { name: 'Hudson District', seat: 'nyc', seats: 45, states: ['NY', 'NJ', 'PA'] },
  lakes: { name: 'Great Lakes District', seat: 'cleveland', seats: 41, states: ['OH', 'MI', 'IN', 'IL', 'WI'] },
  heartland: { name: 'Heartland District', seat: 'stlouis', seats: 33, states: ['MO', 'IA', 'MN', 'KY', 'TN'] },
  southern: { name: 'Southern District', seat: 'atlanta', seats: 45, states: ['NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'LA', 'AR'] },
  frontier: { name: 'Frontier District', seat: 'dallas', seats: 33, states: ['TX', 'OK', 'NM'] },
  mountain: { name: 'Western District', seat: 'coloradosprings', seats: 29, states: ['CO', 'WY', 'MT', 'ID', 'UT'] },
  plains: { name: 'Wasteland Colonies District', seat: 'wichita', seats: 21, states: ['KS', 'NE', 'SD', 'ND', 'NV'] },
  pacific: { name: 'Pacific District', seat: 'sf', seats: 41, states: ['CA', 'OR', 'WA', 'AZ'] },
};
export const STATE_DISTRICT = {};
for (const [id, d] of Object.entries(DISTRICTS)) for (const s of d.states) STATE_DISTRICT[s] = id;

// Cities that can host buildings. `rank`: 3 capital-class, 2 major, 1 regional.
export const CITIES = {
  dc: { st: 'DC', rank: 3 }, boston: { st: 'MA', rank: 3 }, nyc: { st: 'NY', rank: 3 },
  philly: { st: 'PA', rank: 2 }, baltimore: { st: 'MD', rank: 2 }, pittsburgh: { st: 'PA', rank: 1 },
  cleveland: { st: 'OH', rank: 2 }, columbus: { st: 'OH', rank: 1 }, detroit: { st: 'MI', rank: 2 },
  chicago: { st: 'IL', rank: 3 }, indianapolis: { st: 'IN', rank: 1 }, stlouis: { st: 'MO', rank: 2 },
  kansascity: { st: 'MO', rank: 1 }, minneapolis: { st: 'MN', rank: 2 }, milwaukee: { st: 'WI', rank: 1 },
  nashville: { st: 'TN', rank: 1 }, atlanta: { st: 'GA', rank: 2 }, charlotte: { st: 'NC', rank: 1 },
  richmond: { st: 'VA', rank: 1 }, miami: { st: 'FL', rank: 2 }, jacksonville: { st: 'FL', rank: 1 },
  neworleans: { st: 'LA', rank: 1 }, memphis: { st: 'TN', rank: 1 }, dallas: { st: 'TX', rank: 2 },
  houston: { st: 'TX', rank: 2 }, sanantonio: { st: 'TX', rank: 1 }, oklahomacity: { st: 'OK', rank: 1 },
  denver: { st: 'CO', rank: 2 }, coloradosprings: { st: 'CO', rank: 1 }, saltlake: { st: 'UT', rank: 1 },
  phoenix: { st: 'AZ', rank: 2 }, albuquerque: { st: 'NM', rank: 1 }, lasvegas: { st: 'NV', rank: 1 },
  la: { st: 'CA', rank: 3 }, sandiego: { st: 'CA', rank: 1 }, sf: { st: 'CA', rank: 2 },
  portland: { st: 'OR', rank: 1 }, seattle: { st: 'WA', rank: 2 }, boise: { st: 'ID', rank: 1 },
  omaha: { st: 'NE', rank: 1 }, wichita: { st: 'KS', rank: 1 }, buffalo: { st: 'NY', rank: 1 },
  hartford: { st: 'CT', rank: 1 }, providence: { st: 'RI', rank: 1 }, bridgeport: { st: 'CT', rank: 1 },
  worcester: { st: 'MA', rank: 1 }, portlandme: { st: 'ME', rank: 1 }, albany: { st: 'NY', rank: 1 },
  billings: { st: 'MT', rank: 1 }, fargo: { st: 'ND', rank: 1 }, anchorage: { st: 'AK', rank: 2 },
  honolulu: { st: 'HI', rank: 2 }, norfolk: { st: 'VA', rank: 1 }, raleigh: { st: 'NC', rank: 1 },
  louisville: { st: 'KY', rank: 1 }, cincinnati: { st: 'OH', rank: 1 }, elpaso: { st: 'TX', rank: 1 },
  cheyenne: { st: 'WY', rank: 1 },
};

// Rail network (city pairs). In Gilead most traffic moves by rail (troop trains to Chicago, the milk train).
export const RAILS = [
  ['boston', 'providence'], ['providence', 'hartford'], ['boston', 'worcester'], ['worcester', 'hartford'],
  ['hartford', 'bridgeport'], ['bridgeport', 'nyc'], ['boston', 'portlandme'], ['worcester', 'albany'],
  ['nyc', 'philly'], ['philly', 'baltimore'], ['baltimore', 'dc'], ['nyc', 'albany'], ['albany', 'buffalo'],
  ['buffalo', 'cleveland'], ['cleveland', 'detroit'], ['cleveland', 'chicago'], ['detroit', 'chicago'],
  ['philly', 'pittsburgh'], ['pittsburgh', 'cleveland'], ['pittsburgh', 'columbus'], ['dc', 'pittsburgh'],
  ['columbus', 'indianapolis'], ['columbus', 'cincinnati'], ['cincinnati', 'indianapolis'], ['cincinnati', 'louisville'],
  ['indianapolis', 'chicago'], ['indianapolis', 'stlouis'], ['chicago', 'milwaukee'], ['milwaukee', 'minneapolis'],
  ['minneapolis', 'fargo'], ['fargo', 'billings'], ['billings', 'seattle'], ['chicago', 'omaha'],
  ['omaha', 'cheyenne'], ['cheyenne', 'denver'], ['cheyenne', 'saltlake'], ['saltlake', 'sf'], ['saltlake', 'boise'],
  ['boise', 'portland'], ['portland', 'seattle'], ['portland', 'sf'], ['sf', 'la'], ['la', 'sandiego'],
  ['la', 'lasvegas'], ['lasvegas', 'saltlake'], ['la', 'phoenix'], ['phoenix', 'albuquerque'], ['phoenix', 'elpaso'],
  ['elpaso', 'sanantonio'], ['albuquerque', 'denver'], ['denver', 'coloradosprings'], ['coloradosprings', 'wichita'],
  ['denver', 'kansascity'], ['kansascity', 'stlouis'], ['kansascity', 'omaha'], ['kansascity', 'wichita'],
  ['wichita', 'oklahomacity'], ['oklahomacity', 'dallas'], ['dallas', 'houston'], ['houston', 'sanantonio'],
  ['dallas', 'sanantonio'], ['houston', 'neworleans'], ['neworleans', 'memphis'], ['memphis', 'stlouis'],
  ['memphis', 'nashville'], ['nashville', 'louisville'], ['nashville', 'atlanta'], ['atlanta', 'charlotte'],
  ['charlotte', 'raleigh'], ['raleigh', 'richmond'], ['richmond', 'dc'], ['richmond', 'norfolk'],
  ['atlanta', 'jacksonville'], ['jacksonville', 'miami'], ['atlanta', 'neworleans'], ['memphis', 'dallas'],
  ['stlouis', 'chicago'],
];
