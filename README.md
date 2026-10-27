# Gilead: Under His Eye

**v1.0.1 "Under His Eye"** is a grand strategy game set in the world of Hulu's *The Handmaid's Tale* (2017–2025) and *The Testaments* (2026). It is built for an **iPad in landscape**.

You are the Committee of the Sons of Jacob in 2012. You plot the takeover of the United States, carry out the Three Strikes, and then build, run and defend the Republic of Gilead through six eras that follow the show's arc:

| Era | Name | What you do |
|---|---|---|
| 1 | **The Sons of Jacob** | Found chapters in 30 states, infiltrate military bases, seat the Committee, publish *A Woman's Place*, prepare the Three Strikes and keep the FBI from raiding you. |
| 2 | **The Republic of Gilead** | Pass the decrees in the order the show depicts them (frozen accounts, the work ban, property to male kin), proclaim the Republic, open the Rachel and Leah Center and institute the Ceremony. |
| 3 | **Under His Eye** | Raise the Wall, build up the Eyes, sign the Mexican trade deal and survive the Center bombing. |
| 4 | **The War** | Take Chicago, live under sanctions, face Angels' Flight and the Waterfords' arrest in Toronto. |
| 5 | **New Bethlehem** | Run Lawrence's soft-power reform, or spring the hardliners' trap. |
| 6 | **The Reckoning** | Survive the wedding, hold Boston for a year and rule from sea to sea. |

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
npm test                 # headless simulation: bots play full games, checking for errors and NaNs
```

Code layout:

- `js/data/`: game content (states, commanders, buildings, decrees, phases and goals, events)
- `js/engine/`: the simulation, with no DOM dependencies (core state, daily tick, actions, events, save)
- `js/ui/`: the map, panels, art and widgets
- `js/audio/`: the generative music and sound effects

## Disclaimer

This is a fan-made, non-commercial game. It is not affiliated with or endorsed by Hulu, MGM Television or Margaret Atwood. It puts you in charge of an authoritarian theocracy so you can see how such regimes are built and how they break. It does not endorse them.
