# Gilead: Under His Eye

**v1.5.1 "The Road to Canada"** is a grand strategy game set in the world of Hulu's *The Handmaid's Tale* (2017–2025) and *The Testaments* (2026). It is built for an **iPad in landscape**.

You are the Committee of the Sons of Jacob in 2012. You plot the takeover of the United States, carry out the Three Strikes, and then build, run and defend the Republic of Gilead through six eras that follow the show's arc:

| Era | Name | What you do |
|---|---|---|
| 1 | **The Sons of Jacob** | Found chapters in 30 states, infiltrate military bases, seat the Committee, publish *A Woman's Place*, prepare the Three Strikes and keep the FBI from raiding you. |
| 2 | **The Republic of Gilead** | Pass the decrees in the order the show depicts them (frozen accounts, the work ban, property to male kin), proclaim the Republic, open the Rachel and Leah Center and institute the Ceremony. |
| 3 | **Under His Eye** | Raise the Wall, build up the Eyes, sign the Mexican trade deal and survive the Center bombing. |
| 4 | **The War** | Take Chicago, live under sanctions, face Angels' Flight and the Waterfords' arrest in Toronto. |
| 5 | **New Bethlehem** | Run Lawrence's soft-power reform, or spring the hardliners' trap. |
| 6 | **The Reckoning** | Survive the wedding, hold Boston for a year and rule from sea to sea. |

## What's new in v1.5 "The Road to Canada"

- **Winding roads and railways.** Every road and railway is routed over land by pathfinding with its own terrain noise, so routes wind across the country in straight runs with sharp bends. They go round the lakes, the coast and the other cities.
- **No overlaps.** A road or railway never runs alongside another; they only cross at a single point, or meet in a city. Building sites keep the whole building, its height included, clear of every road and track.
- **Depots and checkpoints built into the line.** A Rail Depot stands on one of its city's tracks, with a pitched train shed over the line, a platform and a goods shed alongside. Supply trains slow down, pull in under the shed, stop and pull out again. A checkpoint stands across its road with a canopy, a guard booth, concrete blocks and red-and-white barrier arms. Each car stops, the barrier lifts, and the car drives through under the canopy.
- 72 road crossings of state lines (none inside a city) are the places checkpoints can be built. Saves from 1.4 move their checkpoints onto the new crossings.

## What's new in v1.4 "Mayday"

- **Institutions spread around their city.** Each stands on its own site around its city, always inside the city's state: never in the sea and never across a state line. Sites are precomputed from the state outlines. Washington, D.C. is too small to hold any, so its institutions fill the Capital District, and Rhode Island and Connecticut get smaller models so they fit.
- **Roads and border checkpoints.** A road network (asphalt with a dashed centre line) joins the cities and never crosses water. Checkpoints can now only be built where a road crosses a state line, which leaves 89 crossings in the whole country. Each state's panel lists its crossings under **Border checkpoints**, and the Advisor picks crossings that face enemy territory or lead north to Canada. Little 3D cars (the Eyes' black vans, sedans and Guardian trucks) drive the roads and stop at every checkpoint for their papers.
- **Railways and trains.** Railways now have ballast, sleepers and two steel rails. Supply trains with six carriages run between your Rail Depots along the network, and local freight trains work the other open lines.
- **Airfields and planes.** Airfields have a long runway. A plane at each one rolls down the runway, takes off and climbs (its shadow falls away beneath it), flies to another Airfield, lines up on final approach, lands and taxis back. With a single Airfield it flies a circuit.
- Saves from earlier versions are migrated: institutions get sites, and old city checkpoints move to the nearest free crossing of their state.

## What's new in v1.3 "Nolite Te Bastardes"

- **3D institutions on the map.** Each of the 18 institution types has its own isometric miniature: the red-brick Rachel and Leah Center with its clock tower, the classical portico of Ardua Hall, quonset-hut barracks, the black tower of the Eyes, the Wall with its hanging condemned, the domed Prayvaganza arena, airfields, rail yards, colonies and New Bethlehem's island. Zoomed out, each city shows its principal institution with a count; zoomed in, every institution stands on a small isometric block. Buildings under construction appear in scaffolding with a crane. The same models appear in the city panel, the build list, the People screen, info sheets and the Codex.
- **The Advisor.** A new map-toolbar button opens a national list of what to build and where, with numbered gold markers on the map. Each recommendation comes with its reason: fertile women waiting, Red Centres short of Aunts, Commander households without Marthas, Mayday, detainees, Unwomen held in camps with no colony to work in, falling supplies, fronts without a Rail Depot or Airfield in range, and babies lost for want of Birthing Houses. It warns when upkeep outruns income, when supplies run out and when standing blocks New Bethlehem, and it advises taking down Walls that cost the Republic its standing. Every city you hold also lists its best options under **Recommended here**.
- **Replace and upgrade.** Any institution can be replaced with another (salvaging a quarter of its cost, or half if it is unfinished), or upgraded to its purpose-built version while keeping its name and trainees.
- Map labels and markers no longer balloon when you zoom in, and the zoom buttons move aside when a panel is open.

## What's new in v1.2 "Praise Be"

- **Tap anything to learn about it.** The top-bar numbers, census rows, classes, institutions, decrees, goals, eras, Commanders, portfolios and district councils each open an information sheet. A sheet explains what the thing is, how to get it and what it does, shows its current values, and links to related entries. Sheets can be followed from one to the next, with a Back button.
- **The Codex.** A new tab holding every mechanic, class, institution, decree and term from the show, with search and categories.
- **Decrees open a sheet before enacting.** It shows the decree's immediate and permanent effects, its prerequisites, the institutions it unlocks and the decrees it leads to, with an Enact button.
- **"?" helpers** on section headers, and an info button beside every build and operation.
- **Top bar fits on every iPad.** The stats strip compacts step by step (smaller icons, then no labels) instead of running off the edge of the screen.

## What's new in v1.1 "Blessed Be the Fruit"

- **Complete art overhaul.** A new design system: dark glass panels, Inter for the interface, Instrument Serif for titles and JetBrains Mono for every number.
- **No emoji anywhere.** About 110 icons were drawn for the game on a single 24px grid. Class avatars and Commander dossier portraits were redrawn too.
- **Dashboards.** Area charts, gauges, a population donut and progress meters on the People, War, Plot and state screens.
- **Responsive taps.** The interface used to rebuild its buttons about 10 times a second, so taps on iPad were lost. Panels are now patched in place, and taps are dispatched on finger-up from the element you touched.
- **Smoother map.** All map motion (trains, helicopters, strikes, front-line fire) now runs on a canvas layer. The census card collapses and sits clear of New England, the legend is a toggle, and the map pans so the state you open stays visible.

## Features

- **World map of the United States** with Canada, Mexico and an inset for the government-in-exile in Alaska and Hawaii. Pinch to zoom and drag to pan. Animated features include:
  - railways with moving trains
  - supply routes from rail depots
  - offensive arrows across front lines
  - burning conflict zones
  - air strikes, drone strikes and helicopter patrols
  - No Man's Land along the Canadian border
- **71 location events** pinned on the map, many taken from the show: the march, Logan Airport, the stadium selections, the Mexican delegation, the Rachel and Leah Center bombing, the Putnam affair, the letters, Angels' Flight, the Chicago ceasefire, New Bethlehem, the wedding and the plane. Urgent events pause the game.
- **Population and classes.** Everyone in territory you hold is counted and processed into a Gilead class:
  - Commanders, Wives, Widows, Daughters and Sons
  - Aunts, Handmaids and Marthas
  - Econowives, Economen and their children
  - Guardians, Eyes and Jezebels
  - Unwomen

  A census panel and the People tab show who is being converted right now.
- **Conversion centres you can build**, each with biblical names:
  - Red Centres, the first being the *Rachel and Leah Center*, followed by Bilhah, Zilpah, Hagar…
  - Martha Houses (Bethany, Dorcas…)
  - Aunts' Halls (Ardua Hall…)
  - Guardian barracks (Fort Stevens…)
  - Bureaus of the Eyes (Mizpah…)
  - Detention centres (Achor, Marah…)
  - The Colonies (Gomorrah, Admah…)
  - Agricultural colonies (Goshen, Canaan Fields…)
  - Wife schools, Jezebels, the Wall, Loaves and Fishes, Prayvaganza halls, airfields, rail depots, checkpoints, birthing houses and New Bethlehem

  You start by converting existing buildings, such as a high school turned into a Red Centre. Purpose-built centres unlock later.
- **Named Commanders and their households.** Waterford, Lawrence, Pryce, Putnam, Judd, Cushing, Winslow, Calhoun, MacKenzie, Wharton, Nick Blaine and others, each with stats, loyalty and portfolios.
- **Councils drawn as semicircle seat charts** showing filled and empty seats: the 12-seat Committee, the 15-seat High Council and 10 district councils.
- **Decree tree** with 44 decrees across five eras, unlocking institutions and abilities as the Republic establishes itself.
- **Goals** for every era. Key goals advance you to the next era.
- **The Codex and information sheets.** Tap almost anything to see how it works and how to get it.
- **Game speed** of pause, 1×, 2× or 4×.
- **Generative soundtrack** with a theme for each era (*The Committee*, *Under the Laws of God*, *Under His Eye*, *The Chicago Front*, *No Hangings*, *Mayday*) plus sound effects. It is all synthesised live, with no audio files.
- **Saving.** The game autosaves every month and when you leave, and there are 3 manual save slots. It also works offline as a PWA.

## Playing on iPad

The game is a static web app with no build step, so any static host works.

1. In the GitHub repository, open **Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**. Pick **main** and **/ (root)**, then save.
3. On the iPad, open `https://<your-user>.github.io/<repo>/` in Safari.
4. Tap **Share → Add to Home Screen**. The game then launches full-screen in landscape and keeps working offline.

The home-screen app is called **Gilead**. Its icon is a Handmaid in profile beneath the Eye, and it opens on a launch screen of Handmaids walking in pairs. Launch screens are included for the iPad (A16), iPad Air, iPad Pro, iPad mini and the 10.2" iPad, in both orientations.

> If there is no sound, check the iPad's volume and silent mode, then tap the screen once. iOS only allows audio after a tap.

## Running locally

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

## Development

```bash
npm install              # only needed for the map build and tests
npm run build:geo        # regenerates js/data/geo.js from us-atlas / world-atlas
npm run build:brand      # regenerates icons and iPad launch screens in assets/brand/
npm run build:sites      # routes roads and railways, places depots, checkpoint crossings and building sites (js/data/sites.js)
npm test                 # headless simulation: bots play full games, checking for errors and NaNs
```

Code layout:

- `js/data/`: game content (states, commanders, buildings, decrees, phases and goals, events)
- `js/engine/`: the simulation, with no DOM dependencies (core state, daily tick, actions, events, save)
- `js/ui/`: the map, panels, art and widgets
- `js/audio/`: the generative music and sound effects

## Disclaimer

This is a fan-made, non-commercial game. It is not affiliated with or endorsed by Hulu, MGM Television or Margaret Atwood. It puts you in charge of an authoritarian theocracy so you can see how such regimes are built and how they break. It does not endorse them.
