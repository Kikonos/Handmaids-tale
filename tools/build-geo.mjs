// Builds js/data/geo.js: projected SVG paths for US states (Albers USA, 975x610 space),
// Canada & Mexico context land, and projected city coordinates.
import { readFileSync, writeFileSync } from 'node:fs';
import { feature, mesh, neighbors } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { geoPath, geoAlbers, geoAlbersUsa } from 'd3-geo';

const load = p => JSON.parse(readFileSync(new URL('../node_modules/' + p, import.meta.url)));

const round = s => s.replace(/(\d+\.\d+)/g, m => (+m).toFixed(1));

// ---- States (pre-projected) ----
let us = load('us-atlas/states-albers-10m.json');
us = presimplify(us);
us = simplify(us, quantile(us, 0.12));
const path = geoPath();
const states = feature(us, us.objects.states).features.map(f => ({
  id: f.id,
  name: f.properties.name,
  d: round(path(f)),
  c: path.centroid(f).map(v => +v.toFixed(1)),
  b: path.bounds(f).flat().map(v => +v.toFixed(1)),
}));
const nb = neighbors(us.objects.states.geometries);
const geoms = us.objects.states.geometries;
states.forEach((s, i) => { s.n = nb[i].map(j => geoms[j].id); });
const borders = round(path(mesh(us, us.objects.states, (a, b) => a !== b)));
const nation = round(path(mesh(us, us.objects.nation)));

// ---- Context: Canada, Mexico (projected with the lower-48 Albers used by albersUsa) ----
const albers = geoAlbers().scale(1300).translate([487.5, 305]);
const ctxPath = geoPath(albers);
let world = load('world-atlas/countries-50m.json');
world = presimplify(world);
world = simplify(world, quantile(world, 0.3));
const countries = feature(world, world.objects.countries).features;
const geomsW = world.objects.countries.geometries;
// Densify long edges in lon/lat so straight borders (the 49th parallel) project as curves, not chords.
const densify = ring => {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[i + 1];
    out.push(a);
    if (!b) continue;
    const n = Math.floor(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 0.5);
    for (let k = 1; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  return out;
};
for (const f of countries) {
  const g = f.geometry; if (!g) continue;
  if (g.type === 'Polygon') g.coordinates = g.coordinates.map(densify);
  if (g.type === 'MultiPolygon') g.coordinates = g.coordinates.map(p => p.map(densify));
}
const ctx = {};
const nameOf = g => g.properties && g.properties.name;
const borderOf = (a, b) => {
  const m = mesh(world, world.objects.countries, (x, y) => (nameOf(x) === a && nameOf(y) === b) || (nameOf(x) === b && nameOf(y) === a));
  m.coordinates = m.coordinates.map(densify);
  return round(ctxPath(m) || '');
};
for (const [key, name] of [['canada', 'Canada'], ['mexico', 'Mexico'], ['cuba', 'Cuba'], ['bahamas', 'Bahamas']]) {
  const f = countries.find(c => c.properties.name === name);
  if (f) ctx[key] = round(ctxPath(f) || '');
}

// ---- Cities ----
const usa = geoAlbersUsa().scale(1300).translate([487.5, 305]);
const cityList = [
  // id, name, lon, lat, kind
  ['boston', 'Boston', -71.06, 42.36],
  ['dc', 'Washington, D.C.', -77.04, 38.91],
  ['nyc', 'New York', -74.0, 40.71],
  ['philly', 'Philadelphia', -75.16, 39.95],
  ['baltimore', 'Baltimore', -76.61, 39.29],
  ['pittsburgh', 'Pittsburgh', -79.99, 40.44],
  ['cleveland', 'Cleveland', -81.69, 41.5],
  ['columbus', 'Columbus', -82.99, 39.96],
  ['detroit', 'Detroit', -83.05, 42.33],
  ['chicago', 'Chicago', -87.63, 41.88],
  ['indianapolis', 'Indianapolis', -86.16, 39.77],
  ['stlouis', 'St. Louis', -90.2, 38.63],
  ['kansascity', 'Kansas City', -94.58, 39.1],
  ['minneapolis', 'Minneapolis', -93.27, 44.98],
  ['milwaukee', 'Milwaukee', -87.91, 43.04],
  ['nashville', 'Nashville', -86.78, 36.16],
  ['atlanta', 'Atlanta', -84.39, 33.75],
  ['charlotte', 'Charlotte', -80.84, 35.23],
  ['richmond', 'Richmond', -77.44, 37.54],
  ['miami', 'Miami', -80.19, 25.76],
  ['jacksonville', 'Jacksonville', -81.66, 30.33],
  ['neworleans', 'New Orleans', -90.07, 29.95],
  ['memphis', 'Memphis', -90.05, 35.15],
  ['dallas', 'Dallas', -96.8, 32.78],
  ['houston', 'Houston', -95.37, 29.76],
  ['sanantonio', 'San Antonio', -98.49, 29.42],
  ['oklahomacity', 'Oklahoma City', -97.52, 35.47],
  ['denver', 'Denver', -104.99, 39.74],
  ['coloradosprings', 'Colorado Springs', -104.82, 38.83],
  ['saltlake', 'Salt Lake City', -111.89, 40.76],
  ['phoenix', 'Phoenix', -112.07, 33.45],
  ['albuquerque', 'Albuquerque', -106.65, 35.08],
  ['lasvegas', 'Las Vegas', -115.14, 36.17],
  ['la', 'Los Angeles', -118.24, 34.05],
  ['sandiego', 'San Diego', -117.16, 32.72],
  ['sf', 'San Francisco', -122.42, 37.77],
  ['portland', 'Portland', -122.68, 45.52],
  ['seattle', 'Seattle', -122.33, 47.61],
  ['boise', 'Boise', -116.2, 43.62],
  ['omaha', 'Omaha', -95.93, 41.26],
  ['wichita', 'Wichita', -97.34, 37.69],
  ['buffalo', 'Buffalo', -78.88, 42.89],
  ['hartford', 'Hartford', -72.68, 41.76],
  ['providence', 'Providence', -71.41, 41.82],
  ['bridgeport', 'Bridgeport', -73.2, 41.19],
  ['worcester', 'Worcester', -71.8, 42.26],
  ['portlandme', 'Portland, ME', -70.26, 43.66],
  ['albany', 'Albany', -73.76, 42.65],
  ['billings', 'Billings', -108.5, 45.78],
  ['fargo', 'Fargo', -96.79, 46.88],
  ['anchorage', 'Anchorage', -149.9, 61.22],
  ['honolulu', 'Honolulu', -157.86, 21.31],
  ['norfolk', 'Norfolk', -76.29, 36.85],
  ['raleigh', 'Raleigh', -78.64, 35.78],
  ['louisville', 'Louisville', -85.76, 38.25],
  ['cincinnati', 'Cincinnati', -84.51, 39.1],
  ['elpaso', 'El Paso', -106.49, 31.76],
  ['cheyenne', 'Cheyenne', -104.82, 41.14],
];
const cities = {};
for (const [id, name, lon, lat] of cityList) {
  const p = usa([lon, lat]);
  if (!p) { console.warn('unprojected', id); continue; }
  cities[id] = { name, x: +p[0].toFixed(1), y: +p[1].toFixed(1) };
}
const foreign = {};
for (const [id, name, lon, lat] of [
  ['toronto', 'Toronto', -79.38, 43.65], ['ottawa', 'Ottawa', -75.7, 45.42], ['montreal', 'Montreal', -73.57, 45.5],
  ['vancouver', 'Vancouver', -123.12, 49.28], ['winnipeg', 'Winnipeg', -97.14, 49.9], ['mexicocity', 'Mexico City', -99.13, 19.43],
  ['monterrey', 'Monterrey', -100.32, 25.69],
]) {
  const p = albers([lon, lat]);
  foreign[id] = { name, x: +p[0].toFixed(1), y: +p[1].toFixed(1) };
}

const out = `// AUTO-GENERATED by tools/build-geo.mjs — do not edit by hand.
// Map space: Albers USA, 975 x 610 (us-atlas). Alaska & Hawaii are drawn as insets.
export const STATE_SHAPES = ${JSON.stringify(states)};
export const STATE_BORDERS = ${JSON.stringify(borders)};
export const NATION_OUTLINE = ${JSON.stringify(nation)};
export const CONTEXT_LAND = ${JSON.stringify(ctx)};
export const CANADA_BORDER = ${JSON.stringify(borderOf('Canada', 'United States of America'))};
export const MEXICO_BORDER = ${JSON.stringify(borderOf('Mexico', 'United States of America'))};
export const CITY_POS = ${JSON.stringify(cities)};
export const FOREIGN_CITIES = ${JSON.stringify(foreign)};
`;
writeFileSync(new URL('../js/data/geo.js', import.meta.url), out);
console.log('geo.js', (out.length / 1024).toFixed(1) + 'KB', states.length, 'states');
