// The six phases of Gilead (after the research doc's "Six phases carry Gilead from purge to decapitation").
// Goals marked `key` must all be met to advance. Each check(G, H) returns [current, target].

export const PHASES = [
  { id: 0, name: 'The Sons of Jacob', sub: 'Pre-Gilead · Plot the takeover', theme: 'conspiracy', accent: '#9a8f7a',
    intro: 'The birth rate is collapsing. Pollution, radiation, a dying world. Few are listening. You are the Committee of the Sons of Jacob — twelve seats, one purpose. Build chapters in every state. Infiltrate the military. Prepare the three strikes. And stay out of sight of the FBI.' },
  { id: 1, name: 'The Republic of Gilead', sub: 'Consolidation', theme: 'republic', accent: '#b3202a',
    intro: 'Congress is dead. The White House burns. "Terrorists," say the screens. The Constitution is suspended — temporarily. Now the real work begins: strip women of money, work and property, proclaim the Republic, and gather the fertile.' },
  { id: 2, name: 'Under His Eye', sub: 'Hardening & outreach', theme: 'eye', accent: '#7a1a1a',
    intro: 'The Republic stands. Now it must be held. Raise the Wall, unleash the Eyes, and show the world a flourishing utopia — while Mayday whispers in every kitchen.' },
  { id: 3, name: 'The War', sub: 'Isolation & war', theme: 'war', accent: '#c0471f',
    intro: 'Sanctions tighten into a chokehold. Chicago still holds out. Canada shelters the escaped. The Republic must fight for every mile — and for every child.' },
  { id: 4, name: 'New Bethlehem', sub: 'Reform & soft power', theme: 'bethlehem', accent: '#7aa0b8',
    intro: 'Lawrence argues for a gentler face. "No Handmaids, no hangings." A cosmetic reform — or a trap. The world is watching, and the world has money.' },
  { id: 5, name: 'The Reckoning', sub: 'Hold the Republic', theme: 'reckoning', accent: '#e0e0e0',
    intro: 'Mayday has learned the Republic\'s great weakness: power held by a few dozen men, who all attend the same weddings. Hold Boston. Hold Washington. Survive.' },
];

const held = (G, min = 99.5) => Object.values(G.st).filter(s => s.hold >= min && !s.exile).length;

export const GOALS = [
  // Phase 0
  { id: 'g_chapters', phase: 0, key: true, name: 'Chapters in 30 states', hint: 'Tap a state and Found / Grow a chapter (strength ≥ 25).',
    check: G => [Object.values(G.st).filter(s => s.chapter >= 25).length, 30], reward: { influence: 15 } },
  { id: 'g_committee', phase: 0, key: true, name: 'Seat 8 founders on the Committee', hint: 'Councils → recruit named men to the Committee.',
    check: G => [Object.values(G.cmd).filter(c => c.seat).length, 8], reward: { funds: 30 } },
  { id: 'g_infil', phase: 0, key: true, name: 'Infiltrate the military (35%)', hint: 'Infiltrate bases in states with military installations.',
    check: (G, H) => [Math.round(H.infiltration(G)), 35], reward: { influence: 10 } },
  { id: 'g_plot', phase: 0, key: true, name: 'Prepare the Three Strikes', hint: 'Fund the Congress, White House and Court plots to 100%.',
    check: G => [Math.round((G.plot.congress + G.plot.whitehouse + G.plot.court) / 3), 100], reward: {} },
  { id: 'g_book', phase: 0, name: 'Publish "A Woman\'s Place"', hint: 'Serena Joy\'s book of domestic feminism.',
    check: G => [G.plot.book ? 1 : 0, 1], reward: { members: 20000 } },
  { id: 'g_funds', phase: 0, name: 'A $250M war chest', hint: 'Fundraise among the faithful.',
    check: G => [Math.round(G.res.funds), 250], reward: { influence: 10 } },
  { id: 'g_members', phase: 0, name: '250,000 Sons of Jacob', hint: 'Chapters, sermons and jobless recruits.',
    check: G => [Math.round(G.res.members), 250000], reward: { funds: 25 } },

  // Phase 1
  { id: 'p1_republic', phase: 1, key: true, name: 'Proclaim the Republic', hint: 'Decrees: Freeze accounts → Work ban → Assets → Protests → Republic.',
    check: G => [G.decrees.d_republic ? 1 : 0, 1], reward: { power: 20 } },
  { id: 'p1_states', phase: 1, key: true, name: 'Hold 20 states', hint: 'Launch offensives from the Military tab or by tapping contested states.',
    check: G => [held(G), 20], reward: { power: 25 } },
  { id: 'p1_redcenter', phase: 1, key: true, name: 'Open the Rachel and Leah Center', hint: 'Build a Handmaid Training Centre in a held city.',
    check: G => [G.bld.some(b => b.type === 'redcenter' && b.done == null) ? 1 : 0, 1], reward: { piety: 5 } },
  { id: 'p1_ceremony', phase: 1, key: true, name: 'Institute the Ceremony', hint: 'Decree: The Ceremony.',
    check: G => [G.decrees.d_ceremony ? 1 : 0, 1], reward: { power: 10 } },
  { id: 'p1_handmaids', phase: 1, name: '2,000 Handmaids', hint: 'Red Centres turn fertile women into Handmaids.',
    check: G => [Math.round(G.pop.cls.handmaids), 2000], reward: { power: 20 } },
  { id: 'p1_council', phase: 1, name: 'Seat 8 on the High Council', hint: 'Councils → appoint named Commanders.',
    check: G => [Object.values(G.cmd).filter(c => c.seat).length, 8], reward: { power: 15 } },
  { id: 'p1_birth', phase: 1, name: 'The first Birth Day', hint: 'A Handmaid must carry a child to term.',
    check: G => [Math.min(1, G.pop.births), 1], reward: { piety: 8, stability: 5 } },
  { id: 'p1_core', phase: 1, name: 'Secure Boston and Washington', hint: 'Massachusetts and D.C. fully held.',
    check: G => [(G.st.MA.hold >= 99.5 ? 1 : 0) + (G.st.DC.hold >= 99.5 ? 1 : 0), 2], reward: { power: 15 } },

  // Phase 2
  { id: 'p2_wall', phase: 2, key: true, name: 'Raise the Wall', hint: 'Decree The Wall, then build one in a city.',
    check: G => [G.bld.some(b => b.type === 'wall' && b.done == null) ? 1 : 0, 1], reward: { fear: 5 } },
  { id: 'p2_handmaids', phase: 2, key: true, name: '12,000 Handmaids', hint: 'More Red Centres; purpose-built ones are larger.',
    check: G => [Math.round(G.pop.cls.handmaids), 12000], reward: { power: 30 } },
  { id: 'p2_births', phase: 2, key: true, name: '400 births in a year', hint: 'Handmaids + the Ceremony + Birthing Houses.',
    check: G => [Math.round(G.pop.birthsYear), 400], reward: { piety: 8 } },
  { id: 'p2_states', phase: 2, key: true, name: 'Hold 26 states', hint: 'Air strikes and offensives.',
    check: G => [held(G), 26], reward: { power: 30 } },
  { id: 'p2_eyes', phase: 2, name: '5,000 Eyes', hint: 'Build a Bureau of the Eyes.',
    check: G => [Math.round(G.pop.cls.eyes), 5000], reward: { resistance: -8 } },
  { id: 'p2_trade', phase: 2, name: 'Sign the Mexican trade deal', hint: 'Decree a Trade Mission, then receive the delegation.',
    check: G => [G.flags.mexicoDeal ? 1 : 0, 1], reward: { treasury: 100 } },
  { id: 'p2_mayday', phase: 2, name: 'Mayday below 30', hint: 'Eyes, detention and checkpoints.',
    check: G => [G.res.resistance <= 30 ? 1 : 0, 1], reward: { stability: 5 } },
  { id: 'p2_council', phase: 2, name: 'A full High Council (15)', hint: 'Appoint every seat.',
    check: G => [Object.values(G.cmd).filter(c => c.seat).length, 15], reward: { power: 40 } },

  // Phase 3
  { id: 'p3_chicago', phase: 3, key: true, name: 'Take Chicago', hint: 'Illinois must be fully held.',
    check: G => [Math.round(G.st.IL.hold), 100], reward: { power: 40, fear: 5 } },
  { id: 'p3_states', phase: 3, key: true, name: 'Hold 34 states', hint: 'The war must be won state by state.',
    check: G => [held(G), 34], reward: { power: 40 } },
  { id: 'p3_stability', phase: 3, key: true, name: 'Stability 45+ under sanctions', hint: 'Markets, supplies and fear keep order.',
    check: G => [Math.round(G.res.stability), 45], reward: { treasury: 80 } },
  { id: 'p3_guardians', phase: 3, name: '600,000 Guardians', hint: 'Barracks; Total Conscription.',
    check: G => [Math.round(G.pop.cls.guardians), 600000], reward: { power: 20 } },
  { id: 'p3_colonies', phase: 3, name: '3 Colonies operating', hint: 'Toxic or agricultural.',
    check: G => [G.bld.filter(b => (b.type === 'colony' || b.type === 'agricolony') && b.done == null).length, 3], reward: { supplies: 400 } },
  { id: 'p3_births', phase: 3, name: '1,500 births in a year', hint: 'The Republic must be fruitful.',
    check: G => [Math.round(G.pop.birthsYear), 1500], reward: { piety: 10 } },

  // Phase 4
  { id: 'p4_bethlehem', phase: 4, key: true, name: 'Open New Bethlehem', hint: 'Decree, then build it at Boston.',
    check: G => [G.bld.some(b => b.type === 'newbethlehem' && b.done == null) ? 1 : 0, 1], reward: { standing: 8 } },
  { id: 'p4_standing', phase: 4, key: true, name: 'International standing ≥ 0', hint: 'Fewer hangings, more diplomacy.',
    check: G => [Math.round(G.res.standing), 0], cmp: 'ge0', reward: { treasury: 120 } },
  { id: 'p4_states', phase: 4, key: true, name: 'Hold 40 states', hint: 'Keep pushing west.',
    check: G => [held(G), 40], reward: { power: 50 } },
  { id: 'p4_returnees', phase: 4, name: '5,000 returnees', hint: 'Amnesty and Pearl Girls.',
    check: G => [Math.round(G.pop.returnees), 5000], reward: { standing: 5 } },
  { id: 'p4_births', phase: 4, name: '3,000 births in a year', hint: 'Attendants, Birthing Houses, reclaimed land.',
    check: G => [Math.round(G.pop.birthsYear), 3000], reward: { piety: 10 } },

  // Phase 5
  { id: 'p5_wedding', phase: 5, key: true, name: 'Survive the Wedding', hint: 'Mayday is planning something. Prepare.',
    check: G => [G.flags.weddingSurvived ? 1 : 0, 1], reward: { power: 50 } },
  { id: 'p5_boston', phase: 5, key: true, name: 'Hold Boston for a year', hint: 'Days in Phase 5 with Massachusetts held.',
    check: G => [Math.min(365, G.flags.bostonDays || 0), 365], reward: {} },
  { id: 'p5_states', phase: 5, key: true, name: 'Hold 46 states', hint: 'Dominion from sea to sea.',
    check: G => [held(G), 46], reward: {} },
  { id: 'p5_births', phase: 5, name: '6,000 births in a year', hint: 'Fruitfulness is victory.',
    check: G => [Math.round(G.pop.birthsYear), 6000], reward: { piety: 10 } },
];

export const goalDone = (g, G, H) => {
  const [c, t] = g.check(G, H);
  return g.cmp === 'ge0' ? c >= 0 : c >= t;
};
