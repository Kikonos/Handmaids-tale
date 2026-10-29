// Location events. Scripted events follow the Hulu series; random events keep the map alive.
// Fields: id, title, icon, phase [min,max], loc (city id, state abbr or fn), urgent (pauses game),
// random (rolled ~every 2-3 weeks), weight, once (default true), cooldown, when(G,H), text (string|fn),
// choices: [{ t, fx: {res deltas}, cost: {res}, req(G,H), run(G,H,q) -> outcome text, note }]
// The LAST choice is the default if a non-urgent event is ignored until it expires.

const heldAdjacentToEnemy = (G, H) => H.heldList().filter(a => a !== 'DC');
const anyContested = (G, H) => H.contested().filter(a => !G.st[a].exile);

export const EVENTS = [
  // ======================= PHASE 0: THE SONS OF JACOB =======================
  { id: 'e_birthrate', title: 'The Birth Rate Report', icon: 'chart-down', phase: [0, 0], loc: 'dc', minDay: 6,
    text: 'A federal report confirms what every maternity ward already knows: live births have fallen by half in a decade. Stillbirths, sterility, the poisoned ground. The networks call it a crisis. Our pastors call it a judgement.',
    choices: [
      { t: 'Seize the narrative: it is God\'s judgement', fx: { influence: 8, members: 6000, suspicion: 2 } },
      { t: 'Fund "independent" research blaming pollution', cost: { funds: 10 }, fx: { influence: 12, suspicion: 0 } },
      { t: 'Say nothing yet', fx: {} },
    ] },
  { id: 'e_pryce_detroit', title: 'A Job Centre in Detroit', icon: 'factory', phase: [0, 0], loc: 'detroit', minDay: 40,
    text: 'Andrew Pryce works as a career counsellor. Every day, young men come in with nothing — no job, families falling apart. One of them, a quiet man named Nick Blaine, has just thrown a chair. Pryce says: "We\'re going to set things right."',
    choices: [
      { t: 'Recruit Nick — and a hundred like him', fx: { members: 9000 }, run: (G, H) => { G.st.MI.chapter = Math.min(100, G.st.MI.chapter + 15); H.flag('nick'); return 'Nick Blaine joins the Sons of Jacob. He will drive, and watch, and listen.'; } },
      { t: 'Too risky — the man has a temper', fx: { members: 3000 } },
    ] },
  { id: 'e_book_tour', title: 'Serena Joy on Campus', icon: 'mic', phase: [0, 0], loc: 'boston', when: G => G.plot.book,
    text: 'Serena Joy\'s talk on "A Woman\'s Place" is drowned out by protesters. "Shame! Shame!" She keeps speaking — calm, smiling, relentless. The footage is everywhere by nightfall.',
    choices: [
      { t: 'Buy airtime: make her the face of the movement', cost: { funds: 12 }, fx: { influence: 14, members: 15000, suspicion: 2 } },
      { t: 'Keep her on the speaking circuit', fx: { influence: 6, members: 6000 } },
    ] },
  { id: 'e_serena_shot', title: 'Shots on Campus', icon: 'drop', phase: [0, 0], loc: 'boston', urgent: true,
    when: G => G.plot.book && G.day > 260 && (G.events.done.e_book_tour || 0) > 0,
    text: 'A gunman opens fire at Serena Joy\'s campus talk. Her assistant is dead. Serena is wounded — and will live. Fred is white with rage. He knows who the shooter is, and where his family lives.',
    choices: [
      { t: 'Let Fred handle it — quietly', fx: { members: 30000, influence: 10, suspicion: 9 },
        run: (G, H) => { H.flag('fredRevenge'); H.loyalty('waterford', 15); return 'Fred makes the shooter watch his wife die. Serena is a martyr. Recruiting surges — and so does the FBI\'s interest.'; } },
      { t: 'Let the police do their work; milk the martyrdom', fx: { members: 20000, influence: 12, suspicion: 2 }, out: 'Serena, bandaged, on every channel: a victim of terrorism. The movement grows.' },
    ] },
  { id: 'e_lawrence', title: 'The Economist', icon: 'book', phase: [0, 0], loc: 'boston', minDay: 90, when: (G, H) => !H.seated('lawrence'),
    text: 'Joseph Lawrence, a brilliant economist, has written a treatise on a post-carbon, labour-intensive economy. He has no faith to speak of. He sees the religious right as "a delivery system" for his ideas. He is willing to talk.',
    choices: [
      { t: 'Bring him onto the Committee (free)', run: (G, H) => { const c = G.cmd.lawrence; if (G.cmd && Object.values(G.cmd).filter(x => x.seat).length < 12) { c.seat = true; return 'Lawrence takes a seat. "Better me than some idiot."'; } return 'No empty seats; he waits in the wings.'; } },
      { t: 'Use his ideas, keep him at arm\'s length', fx: { influence: 6 }, run: (G, H) => { H.loyalty('lawrence', -10); } },
    ] },
  { id: 'e_lydia', title: 'A Schoolteacher', icon: 'apple', phase: [0, 0], loc: 'boston', minDay: 150,
    text: 'A devout, lonely elementary-school teacher, Lydia Clements, has had a pupil removed from his mother — whom she judged unfit. She has a gift for order. She would make a formidable instructor of young women.',
    choices: [
      { t: 'Recruit her to the cause', fx: { members: 500 }, run: (G, H) => { H.flag('lydia'); return 'Lydia Clements will be Aunt Lydia. The Aunts will train faster.'; } },
      { t: 'Note the name', fx: {} },
    ] },
  { id: 'e_fbi_probe', title: 'The FBI Opens a File', icon: 'folder', phase: [0, 0], loc: 'dc', when: G => G.res.suspicion >= 40,
    text: 'A friend in the Bureau warns: a preliminary inquiry has been opened into "a network of Christian militia-adjacent organisations". Our name is on the whiteboard.',
    choices: [
      { t: 'Retain the best lawyers money can buy', cost: { funds: 20 }, fx: { suspicion: -10 } },
      { t: 'Sacrifice the most exposed chapter', run: (G, H) => { let best = null; for (const [a, s] of Object.entries(G.st)) if (!best || s.chapter > G.st[best].chapter) best = a; G.st[best].chapter = Math.round(G.st[best].chapter * 0.4); H.add('suspicion', -14); return `The ${best} chapter is thrown to the wolves.`; } },
      { t: 'Carry on regardless', fx: { suspicion: 4 } },
    ] },
  { id: 'e_fbi_closing', title: 'The FBI Is Closing In', icon: 'siren', phase: [0, 0], loc: 'dc', urgent: true, when: G => G.res.suspicion >= 78,
    text: 'Search warrants are being drafted. Within weeks, the Committee will be in handcuffs. In the show, this is the moment the Committee gave the order: the Three Strikes, now.',
    choices: [
      { t: 'Strike NOW — whatever is ready', req: G => (G.plot.congress + G.plot.whitehouse + G.plot.court) / 3 >= 50,
        note: 'Requires the plot ≥50% prepared. A weaker coup.', run: (G, H) => { H.flag('earlyCoup'); return 'The order is given.'; } },
      { t: 'Go dark: dissolve chapters, burn the lists', fx: { suspicion: -28, members: -40000 }, run: (G, H) => { H.chapterAll(0.7); return 'A third of the movement vanishes into silence. The Bureau loses the scent.'; } },
      { t: 'Burn the evidence and pray', cost: { funds: 45 }, fx: { suspicion: -16 } },
    ] },
  { id: 'p_donor', title: 'A Wealthy Donor', icon: 'briefcase', phase: [0, 0], random: true, weight: 3, once: false, cooldown: 120,
    text: 'An oil heir with a dying wife and no grandchildren wants to give. He wants something in return: a seat at the table, someday.',
    choices: [
      { t: 'Promise him a seat (someday)', fx: { funds: 30, suspicion: 1 } },
      { t: 'Take the money, promise nothing', fx: { funds: 15 } },
    ] },
  { id: 'p_leak', title: 'A Membership List Leaks', icon: 'file', phase: [0, 0], random: true, weight: 2, once: false, cooldown: 150,
    text: 'A disgruntled volunteer has posted part of a membership list online. A blogger is cross-referencing names with military rosters.',
    choices: [
      { t: 'Discredit the blogger', cost: { influence: 6 }, fx: { suspicion: 1 } },
      { t: 'Pay for the post to disappear', cost: { funds: 12 }, fx: {} },
      { t: 'Ignore it', fx: { suspicion: 7 } },
    ] },
  { id: 'p_militia', title: 'A Militia Offers Arms', icon: 'crosshair', phase: [0, 0], random: true, weight: 2, loc: 'TX',
    text: 'A Texas militia — men who drill on weekends and dream of the end times — offer rifles, training grounds and sixty veterans.',
    choices: [
      { t: 'Accept', fx: { suspicion: 7 }, run: (G, H) => { G.st.TX.infil = Math.min(100, G.st.TX.infil + 20); H.plot('congress', 10); return 'Gunmen for the Capitol galleries.'; } },
      { t: 'Decline — amateurs get noticed', fx: {} },
    ] },
  { id: 'p_megachurch', title: 'A Pulpit in Atlanta', icon: 'church', phase: [0, 0], random: true, weight: 2, loc: 'atlanta',
    text: 'A megachurch pastor with 40,000 congregants and a television ministry offers his pulpit for a Sons of Jacob sermon series.',
    choices: [
      { t: 'Accept the pulpit', fx: { members: 25000, funds: 10, suspicion: 2 }, run: G => { G.st.GA.chapter = Math.min(100, G.st.GA.chapter + 15); } },
      { t: 'Too visible', fx: {} },
    ] },
  { id: 'p_journalist', title: 'A Globe Reporter Is Digging', icon: 'newspaper', phase: [0, 0], random: true, weight: 2, loc: 'boston',
    text: 'A Boston Globe reporter is asking questions about the Committee\'s funding. She has a source. She has a deadline.',
    choices: [
      { t: 'Flood her editors with lawyers', cost: { funds: 10 }, fx: { suspicion: -1 } },
      { t: 'Find out who her source is', cost: { influence: 5 }, fx: { suspicion: -3 }, out: 'The source is found. He stops talking.' },
      { t: 'Let her write', fx: { suspicion: 8 } },
    ] },
  { id: 'p_rustbelt', title: 'Plant Closures', icon: 'factory', phase: [0, 0], random: true, weight: 2, loc: 'cleveland',
    text: 'Three plants close in a single week. Men stand in the parking lots with nothing to do. Somebody should talk to them.',
    choices: [
      { t: 'Send recruiters with hot meals', cost: { funds: 6 }, fx: { members: 14000 }, run: G => { for (const a of ['OH', 'MI', 'PA']) G.st[a].chapter = Math.min(100, G.st[a].chapter + 6); } },
      { t: 'Not our concern', fx: {} },
    ] },
  { id: 'p_officer', title: 'A Colonel Wants to Talk', icon: 'medal', phase: [0, 0], random: true, weight: 3, once: false, cooldown: 120,
    loc: (G, H) => H.pick(Object.keys(G.st).filter(a => G.st[a].chapter > 0 && !G.st[a].exile)) || 'VA',
    text: 'A colonel, devout and disillusioned, believes the country is dying of its own decadence. He commands men. He wants to know what we are really planning.',
    choices: [
      { t: 'Tell him enough', fx: { suspicion: 3 }, run: (G, H, q) => { const a = q.loc.length === 2 ? q.loc : 'VA'; if (G.st[a]) G.st[a].infil = Math.min(100, G.st[a].infil + 15); return 'His battalion will be ours on the day.'; } },
      { t: 'Tell him nothing', fx: {} },
    ] },
  { id: 'p_defector', title: 'A Founder Gets Cold Feet', icon: 'snowflake', phase: [0, 0], random: true, weight: 1,
    when: G => Object.values(G.cmd).filter(c => c.seat).length >= 6,
    text: 'One of the Committee wants to know whether "strike" might be a metaphor. It is not. He is frightened, and frightened men talk.',
    choices: [
      { t: 'Reassure him — and have him watched', cost: { influence: 6 }, fx: {} },
      { t: 'An accident on the highway', fx: { suspicion: 6, fear: 0 }, out: 'A tragic accident. The Committee is quieter now.' },
    ] },

  // ======================= PHASE 1: THE REPUBLIC =======================
  { id: 'e_aftermath', title: 'The Morning After', icon: 'tv', phase: [1, 1], loc: 'dc', urgent: true, when: G => G.plot.coupDay != null && G.day >= G.plot.coupDay,
    text: 'Gunmen in the Capitol galleries. A bomb in the White House. Martial law. The National Guard on every corner. The screens say "terrorists". The Constitution is suspended — temporarily. The country holds its breath. What do we tell them?',
    choices: [
      { t: '"Terrorists" — unnamed, everywhere', fx: { stability: 8, fear: 6 }, out: 'Fear is the glue of the first weeks.' },
      { t: 'A national day of prayer', fx: { piety: 10, stability: 4 } },
      { t: 'Promise elections "when it is safe"', fx: { standing: 8, stability: 6, power: -10 } },
    ] },
  { id: 'e_logan', title: 'Logan Airport', icon: 'plane', phase: [1, 1], loc: 'boston', when: (G) => G.day > G.plot.coupDay + 8,
    text: 'Families crowd the departure gates. A professor, Emily Malek, is stopped with her wife and son: her marriage is no longer recognised. She may not leave. Her wife and child board without her.',
    choices: [
      { t: 'Close every airport and border crossing', fx: { standing: -6, fear: 4 }, run: (G, H) => { H.pop('fertile', 400); return 'No one leaves. The fertile are counted.'; } },
      { t: 'Let foreigners go; hold our own', fx: { standing: 2 } },
      { t: 'Let them flee — fewer mouths', fx: { standing: 6, resistance: 3 }, run: (G, H) => { H.pop('escaped', 200000); H.pop('women', -120000); H.pop('fertile', -1500); } },
    ] },
  { id: 'e_march', title: 'The March', icon: 'fist', phase: [1, 1], loc: 'boston', urgent: true, when: G => G.decrees.d_employment_ban != null,
    text: 'Tens of thousands march through Boston against the new laws. June Osborne and Moira are among them. Soldiers line the street. Their commander asks for orders.',
    choices: [
      { t: 'Fire into the crowd', fx: { fear: 14, resistance: -8, standing: -10, stability: 3 }, run: (G, H) => { H.discount('d_crush_protests', 0.3); return 'Live rounds. The crowd breaks and runs. The world sees the footage.'; } },
      { t: 'Tear gas and mass arrests', fx: { fear: 6, resistance: -3, standing: -3 }, run: (G, H) => { H.pop('detainees', 6000); } },
      { t: 'Let them march', fx: { resistance: 8, stability: -5 } },
    ] },
  { id: 'e_stadium', title: 'The Stadium Selections', icon: 'stadium', phase: [1, 1], loc: 'boston', when: G => G.decrees.d_roundups != null,
    text: 'Women are rounded up into the stadium and sorted. Michael Judd\'s officers sort the fertile from the "unredeemable". Some who will become Aunts are made to watch.',
    choices: [
      { t: 'Process them all', fx: { fear: 6, standing: -4 }, run: (G, H) => { H.pop('fertile', 4000); H.pop('aunts', 60); H.pop('unwomen', 8000); return 'The fertile to the Centres, the "unredeemable" to the Colonies.'; } },
      { t: 'Select the Aunts first', fx: { piety: 3 }, run: (G, H) => { H.pop('aunts', 200); H.pop('women', -200); return 'Two hundred new Aunts, chosen in the stands.'; } },
    ] },
  { id: 'e_globe', title: 'The Boston Globe', icon: 'newspaper', phase: [1, 1], loc: 'boston', when: G => G.day > G.plot.coupDay + 25,
    text: 'The Boston Globe\'s staff are still at their desks, still filing. Their archive is labelled "Origins of Gilead", "Militarization", "Curtailment of Civil Rights".',
    choices: [
      { t: 'Purge the newsroom', fx: { fear: 10, standing: -8, resistance: -4 }, run: (G, H) => { H.flag('globePurged'); return 'The staff are executed. The building is abandoned — for now.'; } },
      { t: 'Seize the presses for state messaging', fx: { piety: 6, stability: 4, resistance: 2 } },
      { t: 'Arrest the editors', fx: { fear: 4 }, run: (G, H) => { H.pop('detainees', 300); } },
    ] },
  { id: 'e_cathedral', title: 'St. Patrick\'s Cathedral', icon: 'church', phase: [1, 2], loc: 'nyc', when: (G, H) => H.held('NY'),
    text: 'New York\'s great Catholic cathedral still holds Mass. The priests preach mercy. Our theology has no room for Rome.',
    choices: [
      { t: 'Destroy it', fx: { fear: 6, piety: 4, standing: -6, resistance: 3 } },
      { t: 'Convert it for our rites', fx: { piety: 8, resistance: 2 } },
      { t: 'Leave it — for now', fx: { standing: 2 } },
    ] },
  { id: 'e_first_center', title: 'The Rachel and Leah Center', icon: 'school', phase: [1, 1], loc: (G) => (G.bld.find(b => b.type === 'redcenter')?.city) || 'boston',
    when: G => G.bld.some(b => b.type === 'redcenter' && b.done == null),
    text: 'A converted high school, its gym hung with red. The first class of Handmaids sits in a circle on the floor. Aunt Lydia raises her cattle prod. "Blessed be the fruit."',
    choices: [
      { t: 'Give Aunt Lydia a free hand', fx: { fear: 4 }, run: (G, H) => { H.pop('aunts', 40); return 'Order. Discipline. An eye for an eye — Janine\'s, as it happens.'; } },
      { t: 'Insist on "gentle" methods', fx: { piety: 3, standing: 2 } },
    ] },
  { id: 'e_birthday', title: 'Birth Day', icon: 'baby', phase: [1, 5], loc: 'boston', urgent: true, when: G => G.pop.births >= 1,
    text: 'The siren. The van. The Handmaids chanting around Janine in the Putnams\' bedroom while Naomi mimics the contractions downstairs among Wives eating macarons. A girl — healthy. Naomi names her Angela.',
    choices: [
      { t: 'Broadcast it: proof that Gilead works', fx: { piety: 10, stability: 8, standing: 3 } },
      { t: 'A private blessing for the household', fx: { piety: 6 }, run: (G, H) => H.loyalty('putnam', 10) },
    ] },
  { id: 'e_holdout_base', title: 'A Base Holds Out', icon: 'medal', phase: [1, 2], urgent: false,
    loc: (G, H) => H.pick(anyContested(G, H).filter(a => G.st[a].hold > 30) || []) || null,
    when: (G, H) => anyContested(G, H).some(a => G.st[a].hold > 30),
    text: q => 'Regular Army units loyal to the old government refuse our orders and dig in.',
    choices: [
      { t: 'Offer amnesty — conscript them as Guardians', cost: { power: 15 }, run: (G, H, q) => { H.pop('guardians', 20000); H.hold(q.loc, 12); return 'They are conscripted as Guardians. Within a week they are hanging "gender traitors".'; } },
      { t: 'Storm the base', fx: { supplies: -20 }, run: (G, H, q) => { H.hold(q.loc, 18); H.pop('guardians', -8000); return 'The base falls. The cost is high.'; } },
      { t: 'Contain them', run: (G, H, q) => { H.hold(q.loc, -6); } },
    ] },
  { id: 'e_little_america', title: 'Little America', icon: 'maple', phase: [1, 3], loc: 'NY', when: G => G.day > G.plot.coupDay + 60,
    text: 'Refugees stream north into Toronto, where an enclave called Little America has formed around the government-in-exile\'s consulate. Canada will not send them back.',
    choices: [
      { t: 'Pressure Ottawa diplomatically', cost: { power: 15 }, fx: { standing: -2 }, run: (G, H) => H.usa(-3) },
      { t: 'Seal the northern border', fx: { standing: -4, fear: 3 }, run: (G, H) => H.mod('escape', -0.1) },
      { t: 'Good riddance', fx: { resistance: 2 } },
    ] },

  // ======================= PHASE 2: UNDER HIS EYE =======================
  { id: 'e_mexico', title: 'The Mexican Delegation', icon: 'coins', phase: [2, 3], loc: 'boston', urgent: true, when: G => G.decrees.d_trade_mission != null,
    text: 'Ambassador Castillo tours Boston: the clean streets, the "completely organic" produce, the Handmaids. No child has been born alive in her home city in six years. "My country is dying." She is not here for oranges.',
    choices: [
      { t: 'Offer Handmaids for export', req: G => G.pop.cls.handmaids >= 300, note: 'Needs 300 Handmaids', fx: { treasury: 180, standing: -6 }, run: (G, H) => { H.flag('mexicoDeal'); H.pop('handmaids', -300); return '"They\'re not looking to trade oranges — they\'re trading Handmaids." The deal is signed.'; } },
      { t: 'Parade the children; trade only goods', fx: { standing: 4 }, run: (G, H) => { if (H.chance(0.55)) { H.flag('mexicoDeal'); return 'A modest deal: oranges after all.'; } return 'Castillo leaves unconvinced. Her assistant whispered to a Handmaid on the way out.'; } },
      { t: 'Cancel the visit', fx: { standing: -2 } },
    ] },
  { id: 'e_bombing_warn', title: 'Chatter Before the Opening', icon: 'bomb', phase: [2, 2], loc: 'boston', urgent: true,
    when: G => G.pop.cls.handmaids >= 100 && (G.bld.some(b => b.type === 'redcenter' && b.tier === 1) || G.day > (G.plot.coupDay || 0) + 900),
    text: 'The new Rachel and Leah Center — purpose-built, glass and red brick — opens on Sunday with every Commander in Boston in attendance. The Eyes report chatter. A Handmaid, Ofglen, has been seen near the building.',
    choices: [
      { t: 'Grand opening — Gilead will not cower', fx: { piety: 6 }, run: (G, H) => {
        H.flag('bombing');
        H.pop('handmaids', -31); H.pop('commanders', -26); H.pop('widows', 26);
        let dead = [];
        if (H.alive('pryce')) { H.kill('pryce', 'killed in the bombing of the Rachel and Leah Center'); dead.push('Pryce'); }
        H.add('stability', -10); H.add('fear', 6); H.add('resistance', 6);
        return `Ofglen detonates a bomb at the opening. 31 Handmaids and 26 Commanders are dead${dead.length ? ' — Pryce among them' : ''}.`; } },
      { t: 'Sweep the building with the Eyes', cost: { power: 25 }, run: (G, H) => { H.add('resistance', -6); H.flag('bombingFoiled'); return 'A Handmaid is seized at the door with a bomb under her cloak. The opening proceeds in triumph.'; } },
    ] },
  { id: 'e_cushing', title: 'Cushing\'s Crackdown', icon: 'barrier', phase: [2, 3], loc: 'boston', urgent: true, when: (G, H) => H.has('bombing') && H.alive('cushing'),
    text: 'With Pryce gone, Commander Cushing takes the Eyes. Checkpoints on every corner, executions in the street. Even Commanders are afraid. Fred Waterford quietly suggests Cushing could be charged with apostasy.',
    choices: [
      { t: 'Back Cushing', fx: { fear: 12, resistance: -8, stability: -6, standing: -5 }, run: (G, H) => { H.grant('d_checkpoints'); return 'Checkpoints become law.'; } },
      { t: 'Let Waterford have him arrested', fx: { stability: 5 }, run: (G, H) => { H.status('cushing', 'arrested'); H.loyalty('waterford', 10); return 'Cushing is stripped of rank for apostasy and treason.'; } },
    ] },
  { id: 'e_colony_return', title: 'Recalled from the Colonies', icon: 'radiation', phase: [2, 3], loc: 'KS', when: (G, H) => H.has('bombing') && G.pop.cls.unwomen > 5000,
    text: 'The dead Handmaids must be replaced. In the Colonies, a few women are still fertile — Emily and Janine among them. Their teeth are loose; their skin is peeling. They can still bear children.',
    choices: [
      { t: 'Return them to service', req: (G, H) => H.bld('redcenter').length > 0, note: 'Needs a Red Centre', run: (G, H) => { const n = Math.min(G.pop.cls.unwomen * 0.02, 800); H.pop('unwomen', -n); H.pop('fertile', n); return `${Math.round(n)} women brought back for the Red Centres.`; } },
      { t: 'Leave them where they are', fx: {} },
    ] },
  { id: 'e_putnam', title: 'The Putnam Affair', icon: 'scales', phase: [2, 3], loc: 'boston', when: (G, H) => H.alive('putnam') && G.pop.births >= 1,
    text: 'Commander Putnam promised his Handmaid, Janine, that they would run away together. Naomi Putnam is humiliated and demands the harshest sentence. Pryce presides.',
    choices: [
      { t: 'The left hand (Naomi\'s request)', fx: { piety: 6, fear: 3 }, run: (G, H) => { H.loyalty('putnam', -25); return 'Putnam loses his hand. The law applies even to Commanders — this once.'; } },
      { t: 'A private reprimand', fx: { piety: -4 }, run: (G, H) => { H.loyalty('putnam', 15); } },
      { t: 'Execution for adultery', fx: { fear: 5, piety: 4 }, run: (G, H) => { H.kill('putnam', 'executed for adultery'); } },
    ] },
  { id: 'e_stoning', title: 'They Will Not Throw', icon: 'stone', phase: [2, 3], loc: 'boston', when: (G, H) => (G.events.done.e_putnam || 0) > 0 && G.pop.cls.handmaids >= 50,
    text: 'Janine is sentenced to stoning for endangering a child. The Handmaids stand in a circle with stones in their hands. June drops hers. "I\'m sorry, Aunt Lydia." One by one, every stone falls.',
    choices: [
      { t: 'Punish them all', fx: { fear: 6, resistance: 6 }, run: (G, H) => { H.pop('handmaids', -20); return 'Burned hands, cattle prods, a mock hanging at Fenway. "Just a warning."'; } },
      { t: 'Quietly let it go', fx: { resistance: 3, piety: -3 } },
    ] },
  { id: 'e_letters', title: 'The Letters', icon: 'mail', phase: [2, 3], loc: 'boston', when: G => G.bld.some(b => b.type === 'jezebels' && b.done == null),
    text: 'A package of letters from Handmaids has passed through Jezebels and a butcher\'s van into Mayday hands. If it reaches Canada, the world will read them: "I\'m Ofjohn… I\'m Ofwarren… We are not okay."',
    choices: [
      { t: 'Raid the butcher, the Martha, the bar', cost: { power: 20 }, fx: { resistance: -6, fear: 4 }, run: (G, H) => H.chance(0.5) ? 'The package is recovered.' : (H.add('standing', -14), 'Too late: the letters are published in Toronto. "We believe the women."') },
      { t: 'Too late to stop it', fx: { standing: -14, resistance: 4 } },
    ] },
  { id: 'e_omar', title: 'The Economan', icon: 'truck', phase: [2, 3], loc: 'worcester', when: G => G.day > (G.plot.coupDay || 0) + 500,
    text: 'An Economan named Omar sheltered a runaway and tried to fly her out from a private airstrip west of Worcester. He has been caught. His wife and son are in an Econo apartment.',
    choices: [
      { t: 'Hang him; his wife to the Colonies', fx: { fear: 8, resistance: -4 }, run: (G, H) => { H.pop('unwomen', 1); } },
      { t: 'Hang him; spare the family', fx: { fear: 5, resistance: -2 } },
      { t: 'Turn him — let him smuggle for the Eyes', cost: { power: 10 }, fx: { resistance: -6 } },
    ] },
  { id: 'e_eden', title: 'Eden and Isaac', icon: 'drop', phase: [2, 3], loc: 'boston', when: G => G.decrees.d_prayvaganza != null,
    text: 'Eden — fifteen, married to Nick Blaine at a Prayvaganza — has run away with a Guardian named Isaac. They are found. She clutches a Bible, which she has been reading.',
    choices: [
      { t: 'Drown them in the pool, chained', fx: { fear: 12, piety: 5, standing: -5, resistance: 3 }, out: '"A caution, a warning." The Wives watch from the bleachers.' },
      { t: 'Send them to the Colonies', fx: { fear: 4 } },
      { t: 'Annul the marriage quietly', fx: { piety: -5, standing: 2 } },
    ] },
  { id: 'e_serena_reads', title: 'Serena Reads Aloud', icon: 'book-open', phase: [2, 4], loc: 'boston', when: G => G.decrees.d_wife_schools != null,
    text: 'The Wives bring a petition to the Council: let girls read Scripture. Serena Joy stands and reads it aloud, from the Bible. The room goes very still.',
    choices: [
      { t: 'The law is the law: a finger', fx: { piety: 6, fear: 4 }, run: (G, H) => { H.loyalty('waterford', -5); return 'Serena loses a finger. The Wives go home in silence.'; } },
      { t: 'Refer the petition to committee', fx: { standing: 3, piety: -3 }, run: (G, H) => { H.discount('d_scripture', 0.4); return 'The reform is now cheaper to enact (Decrees).'; } },
    ] },
  { id: 'e_dc_model', title: 'An Invitation to Washington', icon: 'columns', phase: [2, 3], loc: 'dc', when: (G, H) => H.alive('winslow') && G.phase >= 2,
    text: 'High Commander Winslow hosts the Waterfords in D.C. The Washington Monument is a cross. Handmaids\' lips are sealed with rings. "You could make it big." He wants Boston to follow the Washington model.',
    choices: [
      { t: 'Embrace the Washington model', fx: { piety: 4 }, run: (G, H) => { H.discount('d_muzzles', 0.3); H.loyalty('winslow', 15); return 'The muzzles decree is now far cheaper.'; } },
      { t: 'Boston keeps its own ways', run: (G, H) => H.loyalty('winslow', -10) },
    ] },
  { id: 'e_chicago_captives', title: 'Women from Chicago', icon: 'train', phase: [2, 4], loc: 'chicago', when: (G, H) => G.st.IL.hold > 20,
    text: 'A train arrives from the Chicago front carrying captured women. Lawrence hands June a list. "You decide: Marthas, or the Colonies."',
    choices: [
      { t: 'Marthas', run: (G, H) => { H.pop('marthas', 3000); } },
      { t: 'Test them for the Red Centres', run: (G, H) => { H.pop('fertile', 150); H.pop('unwomen', 2850); } },
      { t: 'The Colonies', fx: { fear: 3 }, run: (G, H) => { H.pop('unwomen', 3000); } },
    ] },

  // ======================= PHASE 3: THE WAR =======================
  { id: 'e_angels_flight', title: 'Angels\' Flight', icon: 'plane', phase: [3, 3], loc: 'worcester', urgent: true, minDay: 0,
    when: G => G.phase === 3 && G.day > (G.flags.phase3Day || 0),
    text: 'Night. Marthas lead dozens of children through the woods to a plane on an airstrip outside Boston. Lawrence has drawn the Guardians away. Fifty-two were planned. Eighty-six are running.',
    choices: [
      { t: 'Scramble jets — shoot it down', req: (G, H) => H.bld('airfield').length > 0, note: 'Requires an Airfield',
        fx: { standing: -30, fear: 10, resistance: 10 }, out: 'The plane goes down in the dark. The world will never forgive it.' },
      { t: 'Let it go; hunt the Marthas', fx: { standing: -6, resistance: -6, stability: -6 }, run: (G, H) => { H.pop('daughters', -86); H.flag('angelsFlight'); return '86 children reach Canada. Gilead demands them back.'; } },
    ] },
  { id: 'e_lydia_interrogated', title: 'Nineteen Days', icon: 'lamp', phase: [3, 4], loc: 'boston', when: (G, H) => H.has('angelsFlight') && H.has('lydia'),
    text: 'Aunt Lydia is interrogated by the Eyes for nineteen days. Calhoun finds her innocent. "This is not an exoneration," he warns, citing her womanly frailties.',
    choices: [
      { t: 'Restore her to the Red Centre', fx: { piety: 3 }, run: (G, H) => H.pop('aunts', 50) },
      { t: 'Keep her on a short leash', fx: { fear: 3 } },
    ] },
  { id: 'e_fred_canada', title: 'Arrested in Toronto', icon: 'maple', phase: [3, 4], loc: 'NY', urgent: true, when: (G, H) => H.alive('waterford') && G.cmd.waterford.status === 'free' && G.phase >= 3,
    text: 'On a diplomatic trip to Canada, Fred and Serena Waterford are arrested on war-crimes charges. Fred offers the Americans information in exchange for Geneva.',
    choices: [
      { t: 'Trade 22 women for him', req: G => G.pop.cls.handmaids >= 22, note: 'Needs 22 Handmaids', fx: { standing: 4 }, run: (G, H) => { H.pop('handmaids', -22); H.status('waterford', 'free'); if (H.chance(0.7)) { H.kill('waterford', 'beaten to death by former Handmaids in No Man\'s Land; his body hung on a wall'); H.flag('fredDead'); return 'Fred is handed over in No Man\'s Land. He never arrives.'; } return 'Fred returns, diminished.'; } },
      { t: 'Disown him', fx: { standing: -2 }, run: (G, H) => { H.status('waterford', 'abroad'); H.flag('fredDead'); return 'Fred is left to the Canadians — and later dies in No Man\'s Land.'; } },
    ] },
  { id: 'e_ceasefire', title: 'Ceasefire in Chicago?', icon: 'dove', phase: [3, 4], loc: 'chicago', urgent: true, when: G => G.st.IL.hold > 0 && G.st.IL.hold < 99.5 && G._sanctions > 0.2,
    text: 'Sanctions have Gilead in a chokehold. Lawrence proposes an aid ceasefire in Chicago to unlock international funds. Calhoun refuses — until Lawrence produces some compromising photographs.',
    choices: [
      { t: 'Bomb Chicago before the ceasefire begins', fx: { standing: -15, fear: 6 }, run: (G, H) => { H.hold('IL', 25); H.fxMap('airstrike', { st: 'IL', from: 'cleveland' }); return 'The bombs fall hours before the truce. Chicago burns.'; } },
      { t: 'Honour the ceasefire', fx: { standing: 14, treasury: 160 }, run: (G, H) => { H.flag('ceasefire'); H.loyalty('lawrence', 10); return 'Aid flows. The front goes quiet.'; } },
      { t: 'Refuse the ceasefire', fx: { standing: -4 } },
    ] },
  { id: 'e_texas', title: 'The Republic of Texas', icon: 'star', phase: [3, 5], loc: 'TX', when: G => G.st.TX.hold < 99.5,
    text: 'Texas declares itself an independent republic. Gilead\'s maps will call it "rebel occupation". Its president offers a border treaty.',
    choices: [
      { t: 'Sign a ceasefire on the Texas front', fx: { standing: 5 }, run: (G, H) => { H.resist('TX', 20); H.flag('texasTreaty'); return 'The Texas front freezes.'; } },
      { t: 'Invade', fx: { standing: -4 }, run: (G, H) => { H.resist('TX', -15); H.hold('TX', 8); } },
      { t: 'Ignore them', fx: {} },
    ] },
  { id: 'e_marthas_killed', title: 'Reprisal', icon: 'flame', phase: [3, 4], loc: 'boston', when: (G, H) => G.res.resistance > 45 && G.pop.cls.marthas >= 200 && G.pop.cls.handmaids > 0,
    text: 'After a Handmaid escape, the Eyes have a list of Marthas who helped. Lawrence says killing them would be a waste of "useful resources". Calhoun says it would be a lesson.',
    choices: [
      { t: 'Execute them', fx: { fear: 10, resistance: -10, standing: -6 }, run: (G, H) => H.pop('marthas', -200) },
      { t: 'Send them to the Colonies', fx: { resistance: -4 }, run: (G, H) => { H.pop('marthas', -200); H.pop('unwomen', 200); } },
    ] },
  { id: 'e_colorado_raid', title: 'Raid on the Wife School', icon: 'plane', phase: [3, 5], loc: 'coloradosprings', urgent: true,
    when: (G, H) => H.held('CO') && G.bld.some(b => b.type === 'wifeschool' && b.done == null && ['coloradosprings', 'denver'].includes(b.city)),
    text: 'Three aircraft cross the border at low altitude, bound for the Colorado Wife school where thirty girls — Agnes MacKenzie among them — are sleeping.',
    choices: [
      { t: 'Shoot them down', req: (G, H) => H.bld('airfield').length > 0, note: 'Requires an Airfield', fx: { standing: -6, fear: 4 }, out: 'All three aircraft are destroyed. The girls never knew.' },
      { t: 'Too late', fx: { standing: 2, resistance: 5 }, run: (G, H) => { H.pop('daughters', -30); return 'The girls are gone. MacKenzie is beside himself.'; } },
    ] },

  // ======================= PHASE 4: NEW BETHLEHEM =======================
  { id: 'e_funeral', title: 'A State Funeral', icon: 'coffin', phase: [4, 5], loc: 'dc', when: (G, H) => H.has('fredDead'),
    text: 'Fred Waterford\'s body is returned. Serena wants a televised state funeral — a martyr for the world to see. Lawrence thinks it\'s an opportunity.',
    choices: [
      { t: 'A grand televised funeral', cost: { treasury: 30 }, fx: { standing: 6, piety: 8 } },
      { t: 'Bury him quietly', fx: {} },
    ] },
  { id: 'e_putnam_end', title: 'Apostasy', icon: 'scales', phase: [4, 5], loc: 'boston', when: (G, H) => H.alive('putnam') && G.phase >= 4,
    text: 'Putnam has become inconvenient. An overnight special session finds him guilty of apostasy and "the rape of unassigned property" — the child-bride Esther. Lawrence wants to make an example.',
    choices: [
      { t: 'Execute him; hang him on the Wall', fx: { standing: 6, piety: 3 }, run: (G, H) => { H.kill('putnam', 'shot by Nick Blaine and hung on the Wall'); if (G.cmd.lawrence.alive) G.cmd.lawrence.loyalty += 5; } },
      { t: 'Spare him', fx: { standing: -3 }, run: (G, H) => H.loyalty('putnam', 20) },
    ] },
  { id: 'e_nb_trap', title: 'The New Bethlehem Trap', icon: 'web', phase: [4, 5], loc: 'boston', urgent: true, when: G => G.bld.some(b => b.type === 'newbethlehem' && b.done == null) && G.day > (G.flags.nbDay || 0),
    text: 'The hardliners on the Council have a plan: once enough refugees return to New Bethlehem, close the doors. Arrest them all. And hang Lawrence on the Wall for his softness.',
    choices: [
      { t: 'Spring the trap', fx: { standing: -25, fear: 10, resistance: -6 }, run: (G, H) => { H.pop('detainees', 4000); H.flag('lawrenceTraitor'); H.loyalty('lawrence', -60); return 'The doors close. Somewhere, Lawrence starts talking to Mayday.'; } },
      { t: 'Keep the promise', fx: { standing: 10 }, run: (G, H) => { G.flags.hardline = Math.max(0.2, G.flags.hardline - 0.1); H.loyalty('wharton', -15); H.loyalty('calhoun', -15); return 'New Bethlehem stays open. The hardliners seethe.'; } },
    ] },
  { id: 'e_lawrence_up', title: 'Promotion', icon: 'star', phase: [4, 5], loc: 'dc', when: (G, H) => H.alive('lawrence') && G.bld.some(b => b.type === 'newbethlehem' && b.done == null),
    text: 'On the propaganda success of New Bethlehem, Washington proposes to make Joseph Lawrence a High Commander.',
    choices: [
      { t: 'Promote him', fx: { power: 20, standing: 4 }, run: (G, H) => { H.loyalty('lawrence', 15); G.flags.hardline = Math.max(0.2, G.flags.hardline - 0.05); } },
      { t: 'Promote a hardliner instead', fx: { power: 10 }, run: (G, H) => H.loyalty('lawrence', -20) },
    ] },
  { id: 'e_wheeler', title: 'Friends in Canada', icon: 'maple', phase: [4, 5], loc: 'NY', when: G => G.decrees.d_cultural_center != null,
    text: 'Commander Wheeler, a wealthy Canadian sympathiser with a private army, offers to make life uncomfortable for refugees — and for June Osborne in particular.',
    choices: [
      { t: 'Fund him', cost: { treasury: 40 }, fx: { standing: -4 }, run: (G, H) => H.usa(-5) },
      { t: 'Too dangerous', fx: { standing: 2 } },
    ] },

  // ======================= PHASE 5: THE RECKONING =======================
  { id: 'e_jezebels_purge', title: 'Wharton\'s Order', icon: 'wine', phase: [5, 5], loc: 'boston', when: (G, H) => G.phase === 5,
    text: 'High Commander Wharton has decided the Jezebels are an abomination — and a security risk. He wants every woman there shot.',
    choices: [
      { t: 'Carry out the order', fx: { fear: 8, piety: 4, resistance: 8 }, run: (G, H) => { for (const b of H.bld('jezebels')) H.removeBld(b); H.pop('jezebels', -G.pop.cls.jezebels * 0.95); return 'A firing squad. Janine is spared by Commander Bell.'; } },
      { t: 'Close them quietly', fx: { piety: 2 }, run: (G, H) => { for (const b of H.bld('jezebels')) H.removeBld(b); H.pop('marthas', G.pop.cls.jezebels * 0.9); H.pop('jezebels', -G.pop.cls.jezebels); } },
    ] },
  { id: 'e_wedding', title: 'The Wedding', icon: 'ring', phase: [5, 5], loc: 'boston', urgent: true, when: (G, H) => G.phase === 5 && (G.events.done.e_jezebels_purge || 0) > 0 && G.day > (G.flags.phase5Day || 0) + 40,
    text: 'Serena Joy is to marry High Commander Wharton in Boston. Every Commander in the city will attend. The Handmaids will serve. The Eyes report nothing unusual — which is unusual.',
    choices: [
      { t: 'A grand wedding — let the city see', fx: { piety: 6 }, run: (G, H) => wedding(G, H, 1) },
      { t: 'A guarded ceremony: Eyes on every Handmaid', cost: { power: 40 }, run: (G, H) => wedding(G, H, 0.35) },
      { t: 'Postpone — and purge the Handmaid households first', cost: { power: 25 }, fx: { resistance: -10, fear: 6 }, run: (G, H) => wedding(G, H, 0.15) },
    ] },
  { id: 'e_plane', title: 'The Plane to Washington', icon: 'plane', phase: [5, 5], loc: 'boston', urgent: true, when: (G, H) => H.has('massacre') && !H.has('planeDone'),
    text: 'The surviving Commanders will fly from Bedford to Washington to ask the High Council to "rain down terror" on Boston. Lawrence asks to come along. He is carrying a briefcase.',
    choices: [
      { t: 'Welcome him aboard', run: (G, H) => { H.flag('planeDone'); if (H.has('lawrenceTraitor') || H.chance(0.6)) { const dead = []; for (const id of ['lawrence', 'wharton', 'calhoun', 'blaine', 'reynolds', 'chapin']) if (H.kill(id, 'killed when an altitude-triggered bomb destroyed the plane to Washington')) dead.push(id); H.add('stability', -20); H.hold('MA', -45); H.usa(15); H.flag('weddingSurvived'); return 'At altitude, the briefcase explodes. Boston has no Commanders left. U.S. Marines land in South Boston.'; } H.flag('weddingSurvived'); return 'The flight lands safely in Washington.'; } },
      { t: 'Search everyone — Lawrence stays behind', cost: { power: 20 }, run: (G, H) => { H.flag('planeDone'); H.flag('weddingSurvived'); if (H.alive('lawrence')) H.kill('lawrence', 'arrested at Bedford with a bomb and hanged'); H.add('resistance', -8); return 'The bomb is found. The High Council will remember who saved them.'; } },
    ] },
  { id: 'e_marines', title: 'The Marines Land', icon: 'anchor', phase: [5, 5], loc: 'boston', urgent: true, when: (G, H) => H.has('planeDone') && G.st.MA.hold < 99.5 && !H.has('marinesDone'),
    text: 'United States Marines come ashore in South Boston. The Econopeople join them in the streets. Gilead is withdrawing. Someone must decide whether to fight for the city.',
    choices: [
      { t: 'Fight street by street', fx: { supplies: -60 }, run: (G, H) => { H.flag('marinesDone'); H.hold('MA', 20); H.pop('guardians', -40000); return 'The battle for Boston has begun.'; } },
      { t: 'Bomb the city', fx: { standing: -30, fear: 10 }, run: (G, H) => { H.flag('marinesDone'); H.hold('MA', 30); G.st.MA.popLoss += 200000; return 'Boston burns. Gilead holds the ruins.'; } },
      { t: 'Withdraw to Rhode Island', run: (G, H) => { H.flag('marinesDone'); H.hold('MA', -60); return 'Boston is free. "Wounded, but not destroyed," says June Osborne. The new front runs along the Rhode Island line.'; } },
    ] },
  { id: 'e_hannah', title: 'A Transfer to Washington', icon: 'child', phase: [5, 5], loc: 'coloradosprings', when: (G, H) => H.alive('mackenzie') && G.phase === 5 && (G.events.done.e_wedding || 0) > 0,
    text: 'An odd request through diplomatic channels: Commander MacKenzie should be reassigned to Washington. His household — and the girl Agnes — would move 2,000 miles east.',
    choices: [
      { t: 'Approve the transfer', fx: { standing: 3 } },
      { t: 'Deny it', fx: {} },
    ] },

  // ======================= RANDOM: ANY PHASE AFTER THE COUP =======================
  { id: 'r_cell', title: 'Mayday Cell Located', icon: 'radio', phase: [1, 5], random: true, weight: 5, once: false, cooldown: 120,
    loc: (G, H) => H.pick(H.heldList()),
    text: 'The Eyes have located a Mayday cell — a butcher, a Martha, a Guardian who looks the other way. They meet in a basement and say "Mayday" at the door.',
    choices: [
      { t: 'Raid with the Eyes', req: G => G.pop.cls.eyes > 300, note: 'Needs 300+ Eyes', fx: { resistance: -6, fear: 2 }, run: (G, H) => { H.pop('detainees', 40); } },
      { t: 'Drone strike', req: G => G.decrees.d_drones != null, note: 'Requires Drone Programme', fx: { resistance: -8, standing: -2 }, run: (G, H, q) => H.fxMap('drone', { st: q.loc, from: q.loc }) },
      { t: 'Turn an informant — watch and wait', cost: { power: 6 }, fx: { resistance: -4 } },
      { t: 'Ignore it', fx: { resistance: 4 } },
    ] },
  { id: 'r_sabotage', title: 'Rail Sabotage', icon: 'rails', phase: [1, 5], random: true, weight: 3, once: false, cooldown: 150,
    when: (G, H) => H.bld('depot').length > 0, loc: (G, H) => H.pick(H.bld('depot')).city,
    text: 'A troop train has derailed. The rails were cut in the night. Supplies for the front are stuck in the sidings.',
    choices: [
      { t: 'Repair crews, double shifts', cost: { treasury: 15 }, fx: {} },
      { t: 'Hang the nearest Economan crew', fx: { fear: 5, supplies: -20, resistance: 2 } },
      { t: 'Let it wait', fx: { supplies: -45 } },
    ] },
  { id: 'r_bomb', title: 'A Bomb in the Market', icon: 'blast', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 200,
    when: (G, H) => H.bld('market').length > 0, loc: (G, H) => H.pick(H.bld('market')).city,
    text: 'An explosion tears through a Loaves and Fishes. Marthas and Handmaids were shopping. Mayday claims it.',
    choices: [
      { t: 'Retaliate: a Salvaging', fx: { fear: 8, resistance: -4, standing: -3 } },
      { t: 'Blame foreign agents', fx: { piety: 3, stability: -2 } },
      { t: 'Clear the rubble', fx: { stability: -4, resistance: 3 } },
    ] },
  { id: 'r_blight', title: 'Blight', icon: 'wheat', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 300,
    when: (G, H) => H.bld('agricolony').length > 0, loc: (G, H) => H.pick(H.bld('agricolony')).city,
    text: 'A blight in the organic fields. Without pesticides, the crop is lost across a whole county.',
    choices: [
      { t: 'Import grain through Mexico', req: G => !!G.flags.mexicoDeal, cost: { treasury: 30 }, fx: {} },
      { t: 'Ration harder', fx: { supplies: -60, stability: -3 } },
      { t: 'Pray', fx: { supplies: -90, piety: 4 } },
    ] },
  { id: 'r_colony_revolt', title: 'Colony Uprising', icon: 'radiation', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 240,
    when: (G, H) => H.bld('colony').length > 0, loc: (G, H) => H.bld('colony')[0].city,
    text: 'In a Colony, the Unwomen refuse to fill their bags. An Aunt is dead. A "doctor" among them — a woman everyone calls Holly — is said to be the ringleader.',
    choices: [
      { t: 'Send the Guardians', fx: { fear: 5, resistance: -2 }, run: (G, H) => H.pop('unwomen', -500) },
      { t: 'Cut their rations until they work', fx: { resistance: 3 }, run: (G, H) => H.pop('unwomen', -1500) },
      { t: 'Let them be', fx: { resistance: 4 } },
    ] },
  { id: 'r_escape', title: 'A Handmaid Escapes', icon: 'run', phase: [1, 5], random: true, weight: 4, once: false, cooldown: 150,
    when: G => G.pop.cls.handmaids >= 100, loc: (G, H) => H.pick(H.heldList()),
    text: 'A Handmaid has vanished from her posting. The Martha network is moving her north. Her tracking tag was found cut from her ear.',
    choices: [
      { t: 'Helicopters and dogs', req: G => G.decrees.d_helicopters != null, note: 'Requires Helicopter Patrols', fx: { resistance: -3, fear: 2 }, out: 'She is caught at the border fence.' },
      { t: 'Punish her household\'s Martha', fx: { fear: 3, resistance: 1 }, run: (G, H) => { H.pop('handmaids', -1); H.pop('escaped', 1); } },
      { t: 'She is gone', fx: { resistance: 2 }, run: (G, H) => { H.pop('handmaids', -1); H.pop('escaped', 1); } },
    ] },
  { id: 'r_scandal', title: 'A Commander\'s Indiscretion', icon: 'glass', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 200,
    when: G => Object.values(G.cmd).some(c => c.alive && c.seat),
    loc: 'boston',
    text: 'One of the High Council has been seen at Jezebels with a foreign diplomat\'s wife — or perhaps it\'s Scrabble with a Handmaid in his study. The Eyes have photographs.',
    choices: [
      { t: 'Keep the photographs. Leverage is power.', fx: { power: 12 } },
      { t: 'Discipline him publicly', fx: { piety: 5, stability: -2 } },
      { t: 'Burn the photographs', fx: { power: -2 } },
    ] },
  { id: 'r_aid', title: 'The UN Offers Aid', icon: 'globe', phase: [2, 5], random: true, weight: 2, once: false, cooldown: 365,
    when: (G, H) => H.bld('redcenter').length > 0,
    text: 'The UN offers humanitarian aid — food, medicine — in exchange for inspectors visiting a Red Centre.',
    choices: [
      { t: 'Accept; stage the visit', fx: { supplies: 120, standing: 6, resistance: 2 } },
      { t: 'Refuse', fx: { standing: -3 } },
    ] },
  { id: 'r_desertion', title: 'Desertion at the Front', icon: 'flag', phase: [1, 5], random: true, weight: 3, once: false, cooldown: 150,
    when: G => G.ops.length > 0, loc: G => G.ops[0].st,
    text: 'A whole company of Guardians has deserted to the rebels, taking their rifles with them.',
    choices: [
      { t: 'Decimate the regiment', fx: { fear: 5 }, run: (G, H) => H.pop('guardians', -3000) },
      { t: 'Raise their rations', fx: { supplies: -30 } },
      { t: 'Let them go', run: (G, H, q) => { H.pop('guardians', -6000); H.hold(q.loc, -4); } },
    ] },
  { id: 'r_counter', title: 'U.S. Counter-offensive', icon: 'flag', phase: [1, 5], random: true, weight: 3, once: false, cooldown: 120, urgent: true,
    when: (G, H) => H.contested().length > 0,
    loc: (G, H) => H.pick(H.contested()),
    text: q => 'Loyalist U.S. forces — what\'s left of the Army, supplied from Alaska and abroad — have launched an offensive.',
    choices: [
      { t: 'Air strikes on their columns', req: (G, H) => G.decrees.d_air_war != null && H.bld('airfield').length > 0, note: 'Air doctrine + Airfield', fx: { treasury: -15, standing: -3 }, run: (G, H, q) => { H.hold(q.loc, -3); H.fxMap('airstrike', { st: q.loc, from: q.loc }); return 'The columns are broken from the air.'; } },
      { t: 'Rush reserves by rail', fx: { supplies: -35 }, run: (G, H, q) => { H.hold(q.loc, -6); } },
      { t: 'Fall back', run: (G, H, q) => { H.hold(q.loc, -16); return 'The front gives way.'; } },
    ] },
  { id: 'r_miracle', title: 'A Healthy Son', icon: 'baby', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 240, when: G => G.pop.births > 5 && G.pop.cls.handmaids > 0,
    loc: 'dc',
    text: 'A healthy boy is born to a Handmaid in a Washington household — no defects, strong lungs. The Wives weep.',
    choices: [
      { t: 'Celebrate at a Prayvaganza', fx: { piety: 6, stability: 3 } },
      { t: 'A private blessing', fx: { piety: 3 } },
    ] },
  { id: 'r_unbaby', title: 'Unbaby', icon: 'candle', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 240, when: G => G.pop.unbabies > 3,
    text: 'A child is born "wrong". The word is Unbaby. The Handmaid will be reassigned; the Wife will not be consoled.',
    choices: [
      { t: 'Blame the Handmaid\'s sins', fx: { piety: 2, resistance: 2 } },
      { t: 'Blame the poisoned land; fund the Colonies', cost: { treasury: 20 }, run: (G, H) => H.pop('reclaimed', 20) },
    ] },
  { id: 'r_refugees', title: 'Refugee Column', icon: 'walk', phase: [1, 4], random: true, weight: 3, once: false, cooldown: 200,
    loc: (G, H) => H.pick(['NY', 'VT', 'ME', 'MI', 'MN', 'WA'].filter(a => G.st[a] && G.st[a].hold > 50)) || 'NY',
    text: 'A column of refugees is heading for the Canadian border on foot — women, children, a few men. Some of the women are of childbearing age.',
    choices: [
      { t: 'Intercept them', fx: { standing: -4, fear: 3 }, run: (G, H) => { H.pop('fertile', 60); H.pop('women', 1500); } },
      { t: 'Let No Man\'s Land take them', fx: { standing: -1 }, run: (G, H) => H.pop('escaped', 2000) },
    ] },
  { id: 'r_heli_down', title: 'Helicopter Down', icon: 'helicopter', phase: [2, 5], random: true, weight: 2, once: false, cooldown: 200,
    when: G => Object.values(G.st).some(s => s.heli),
    loc: G => Object.keys(G.st).find(a => G.st[a].heli),
    text: 'A patrol helicopter has been shot down by rebels with a shoulder-fired missile.',
    choices: [
      { t: 'Reprisals in the nearest town', fx: { fear: 6, standing: -4, resistance: -2 } },
      { t: 'Pull back the patrol', run: (G, H, q) => { if (G.st[q.loc]) G.st[q.loc].heli = false; } },
      { t: 'Carry on', fx: { treasury: -10 } },
    ] },
  { id: 'r_martha_cell', title: 'Scones Mean No', icon: 'cupcake', phase: [1, 5], random: true, weight: 3, once: false, cooldown: 180,
    when: G => G.pop.cls.marthas >= 500, loc: (G, H) => H.pick(H.heldList()),
    text: 'An Eye notices Marthas passing baked goods between households with odd regularity. Scones. Muffins. It looks like a code.',
    choices: [
      { t: 'Arrest the Marthas', req: G => G.pop.cls.marthas >= 40, fx: { resistance: -5, stability: -2 }, run: (G, H) => { H.pop('marthas', -40); H.pop('detainees', 40); } },
      { t: 'Feed false information into the network', cost: { power: 10 }, fx: { resistance: -7 } },
      { t: 'They\'re just baking', fx: { resistance: 3 } },
    ] },
  { id: 'r_coup_plot', title: 'Whispers on the Council', icon: 'dagger', phase: [2, 5], random: true, weight: 2, once: false, cooldown: 240,
    when: G => Object.entries(G.cmd).some(([, c]) => c.alive && c.loyalty < 25),
    loc: 'dc',
    text: G => 'The Eyes report that a disloyal Commander is sounding out others about "a change of leadership".',
    choices: [
      { t: 'Arrest him for apostasy', fx: { fear: 4 }, run: (G, H) => { const id = Object.keys(G.cmd).filter(k => G.cmd[k].alive && G.cmd[k].loyalty < 25).sort((a, b) => G.cmd[a].loyalty - G.cmd[b].loyalty)[0]; if (id) { H.status(id, 'arrested'); return `${id[0].toUpperCase() + id.slice(1)} is arrested.`; } } },
      { t: 'Buy him off', cost: { power: 20 }, run: (G, H) => { for (const k of Object.keys(G.cmd)) if (G.cmd[k].loyalty < 25) H.loyalty(k, 25); } },
      { t: 'Do nothing', fx: { stability: -6, power: -10 } },
    ] },
  // ---- Treasury, trade and the household economy (more variety, and ways to raise money) ----
  { id: 'r_tithe', title: 'The Tithe Is Due', icon: 'coins', phase: [1, 5], random: true, weight: 3, once: false, cooldown: 300,
    when: G => G.decrees.d_republic != null, loc: 'boston',
    text: 'The households of the faithful owe the Republic a tenth of all they hold. The Commanders grumble that their Wives\' gardens and their Marthas\' wages are already the Lord\'s.',
    choices: [
      { t: 'Collect it to the last coin', fx: { treasury: 55, stability: -3 }, run: (G, H) => { for (const id of Object.keys(G.cmd)) if (G.cmd[id].seat) H.loyalty(id, -2); return 'The coffers fill. The Council is sour.'; } },
      { t: 'Collect from the Econopeople only', fx: { treasury: 30, resistance: 3 } },
      { t: 'Waive it this year', fx: { piety: 2, stability: 2 } },
    ] },
  { id: 'r_oranges', title: 'Oranges on the Black Market', icon: 'truck', phase: [2, 5], random: true, weight: 2, once: false, cooldown: 300,
    when: G => G.decrees.d_tokens != null, loc: (G, H) => H.pick(H.heldList()),
    text: 'Mexican oranges, real coffee, lipstick. A Guardian at a Loaves and Fishes loading dock is running a black market, and half the Commanders\' Wives are his customers.',
    choices: [
      { t: 'Take a cut, quietly', fx: { treasury: 35, resistance: 2 }, out: 'The trade goes on. The Republic takes its share.' },
      { t: 'Hang him on the Wall', fx: { fear: 4, piety: 2 } },
      { t: 'Look the other way', fx: { stability: 1, resistance: 2 } },
    ] },
  { id: 'r_strike', title: 'The Econopeople Down Tools', icon: 'factory', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 300,
    when: G => G.pop.cls.economen >= 50000, loc: (G, H) => H.pick(H.heldList()),
    text: 'At a seized textile mill, the Economen have stopped work. Their rations were cut again, and a foreman was taken in the night. They stand at the gates in their grey and say nothing.',
    choices: [
      { t: 'Double their rations', cost: { supplies: 40 }, fx: { stability: 3 }, out: 'The looms start again by noon.' },
      { t: 'Send in the Guardians', fx: { fear: 4, resistance: 4, treasury: -10 }, run: (G, H) => { H.pop('detainees', 200); } },
      { t: 'Let the mill stand idle', fx: { treasury: -30, stability: -2 } },
    ] },
  { id: 'r_buyer', title: 'A Buyer from Abroad', icon: 'briefcase', phase: [2, 5], random: true, weight: 3, once: false, cooldown: 240,
    when: (G, H) => H.bld('agricolony').length > 0 && G.res.standing > -70, loc: (G, H) => H.pick(H.bld('agricolony')).city,
    text: 'A European grocery chain wants Gilead\'s "completely organic" produce, sanctions or not. They will pay in hard currency, through a shell company in Panama. They want it by the shipload.',
    choices: [
      { t: 'Sell a large shipment', cost: { supplies: 150 }, fx: { treasury: 120, standing: 2 } },
      { t: 'Sell a small shipment', cost: { supplies: 60 }, fx: { treasury: 45 } },
      { t: 'Our harvest feeds the faithful', fx: { piety: 1 } },
    ] },
  { id: 'r_fortune', title: 'An Apostate\'s Fortune', icon: 'key', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 300,
    when: G => G.pop.cls.eyes >= 1000, loc: 'dc',
    text: 'The Eyes have traced a disgraced Commander\'s money to accounts in the Caymans: tens of millions, put by for the day he meant to run.',
    choices: [
      { t: 'Seize it for the Treasury', fx: { treasury: 60, fear: 2 } },
      { t: 'Keep the file. Leverage is power.', fx: { power: 15 } },
      { t: 'Return it to his widow', fx: { piety: 2, standing: 1 } },
    ] },
  { id: 'r_drought', title: 'A Dry Summer', icon: 'drop', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 360,
    loc: (G, H) => H.pick(H.heldList()),
    text: 'No rain since May. The reservoirs are low, the fields are cracked, and without fertiliser the yields were thin to begin with.',
    choices: [
      { t: 'Buy grain abroad', cost: { treasury: 40 }, fx: { stability: 1 } },
      { t: 'Open the reserves', cost: { supplies: 50 }, fx: { stability: 2 } },
      { t: 'Ration and pray', fx: { supplies: -40, stability: -3, piety: 2 } },
    ] },
  { id: 'r_guardian_pay', title: 'The Guardians Grumble', icon: 'shield', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 300,
    when: G => G.pop.cls.guardians >= 150000, loc: (G, H) => H.pick(H.heldList()),
    text: 'Guardians at a checkpoint have been heard complaining: no wives, thin rations, months on the line. "They promised us a Handmaid."',
    choices: [
      { t: 'Pay a bonus', cost: { treasury: 35 }, fx: { stability: 2 } },
      { t: 'Promise Econowives to the loyal', fx: { piety: -1, stability: 1 }, run: (G, H) => H.pop('econowives', -2000) },
      { t: 'Remind them of their oath', fx: { stability: -3, resistance: 2 } },
    ] },
  { id: 'r_requisition', title: 'Aunt Lydia\'s Requisition', icon: 'book-open', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 300,
    when: (G, H) => H.bld('redcenter').length > 0, loc: (G, H) => H.pick(H.bld('redcenter')).city,
    text: 'Aunt Lydia has written to the Council in her careful hand. The Centres need more Aunts, more beds and more cattle prods. "The girls will not train themselves."',
    choices: [
      { t: 'Grant everything she asks', cost: { treasury: 40 }, run: (G, H) => { H.pop('aunts', 80); return '80 new Aunts take up their posts.'; } },
      { t: 'Grant half', cost: { treasury: 15 }, run: (G, H) => { H.pop('aunts', 25); } },
      { t: 'The Centres must make do', fx: { piety: -1 } },
    ] },
  { id: 'r_pilgrims', title: 'Pilgrims from Abroad', icon: 'globe', phase: [2, 5], random: true, weight: 2, once: false, cooldown: 360,
    when: G => G.res.standing > -50, loc: 'boston',
    text: 'A tour group of believers from overseas wants to see the "city on a hill": the Wall, the Prayvaganzas, the clean streets. They will pay handsomely, and they will go home and talk.',
    choices: [
      { t: 'Welcome them; stage the tour', fx: { treasury: 30, standing: 3, resistance: 1 } },
      { t: 'Admit them, but no cameras', fx: { treasury: 15, standing: 1 } },
      { t: 'Gilead is not a museum', fx: { piety: 1 } },
    ] },
  { id: 'r_screening', title: 'The Medical Screenings', icon: 'heart-plus', phase: [1, 5], random: true, weight: 2, once: false, cooldown: 300,
    when: (G, H) => H.bld('redcenter').length > 0 && G.pop.women > 100000, loc: (G, H) => H.pick(H.heldList()),
    text: 'The doctors propose a second round of fertility screenings among women already registered as Econowives and Marthas. Some of them, they say, were misjudged.',
    choices: [
      { t: 'Screen them all', cost: { treasury: 30 }, fx: { fear: 2 }, run: (G, H) => { H.pop('fertile', 150); H.pop('women', -150); return '150 women are reclassified as fertile and taken to the Red Centres.'; } },
      { t: 'Screen only the youngest', cost: { treasury: 10 }, run: (G, H) => { H.pop('fertile', 40); H.pop('women', -40); } },
      { t: 'The first screening stands', fx: {} },
    ] },
];

function wedding(G, H, risk) {
  const disp = G.decrees.d_dispersal != null ? 0.3 : 1;
  const p = Math.min(0.95, risk * (0.35 + G.res.resistance / 80)) * disp;
  if (!H.chance(p)) { H.flag('weddingSurvived'); H.add('piety', 6); return 'The vows are spoken. The Handmaids serve and smile. Nothing happens. Mayday has missed its chance.'; }
  H.flag('massacre');
  const killed = Math.round(37 * disp);
  H.pop('commanders', -killed); H.pop('widows', killed);
  const dead = [];
  for (const id of ['calhoun', 'reynolds', 'chapin', 'deeds', 'bell']) if (H.alive(id) && G.cmd[id].status === 'free' && H.chance(0.5 * disp)) { H.kill(id, 'killed by Handmaids at the wedding massacre'); dead.push(id); }
  H.add('stability', -18); H.add('fear', -10); H.add('resistance', 12); H.hold('MA', -10);
  return `The Handmaids strike during the reception. ${killed} Commanders are dead. Boston\'s government is gone in an afternoon.`;
}

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));
