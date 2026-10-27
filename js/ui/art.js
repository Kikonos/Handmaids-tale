// Procedural SVG art: the Gilead seal, class figures (costume colours after Ane Crabtree's designs), portraits.

export const CLASS_INFO = {
  commanders: { label: 'Commanders', color: '#2a2a2a', ink: '#bdbdbd', desc: 'Rule. Black: "a non-colour that is all-powerful".', fig: 'commander' },
  wives: { label: 'Wives', color: '#1f7a83', desc: 'Teal. Run households; may not read.', fig: 'wife' },
  widows: { label: 'Widows', color: '#151515', ink: '#999', desc: 'Black. Wives in mourning.', fig: 'widow' },
  daughters: { label: 'Daughters', color: '#c07a9a', desc: 'Pink "Plums", then green when marriageable.', fig: 'daughter' },
  sons: { label: 'Sons', color: '#7aa6c8', desc: 'Light blue. Groomed to be Commanders.', fig: 'son' },
  aunts: { label: 'Aunts', color: '#7a5a3a', desc: 'Brown. The only women permitted to read.', fig: 'aunt' },
  handmaids: { label: 'Handmaids', color: '#b3202a', desc: 'Red, white wings. Bear children for the elite.', fig: 'handmaid' },
  marthas: { label: 'Marthas', color: '#6f7d5a', desc: 'Faded green. Unpaid domestic servants.', fig: 'martha' },
  econowives: { label: 'Econowives', color: '#7d7f83', desc: 'Grey. Wife, Martha and Handmaid in one.', fig: 'econowife' },
  economen: { label: 'Economen', color: '#5d6066', desc: 'The default class of ordinary men.', fig: 'economan' },
  econochildren: { label: 'Econo children', color: '#8f9296', desc: 'Children of the working class.', fig: 'child' },
  guardians: { label: 'Guardians', color: '#31477a', desc: 'Navy. Soldiers and police — physical muscle.', fig: 'guardian' },
  eyes: { label: 'Eyes', color: '#111', ink: '#aaa', desc: 'Secret police — mental muscle.', fig: 'eye' },
  jezebels: { label: 'Jezebels', color: '#6a2a5a', desc: 'Hidden women of the Commanders\' club.', fig: 'jezebel' },
  unwomen: { label: 'Unwomen', color: '#6b5a3a', desc: 'The "unredeemable", worked to death in the Colonies.', fig: 'unwoman' },
};
export const POOL_INFO = {
  men: { label: 'Unprocessed men', color: '#3d3a36' },
  women: { label: 'Unprocessed women', color: '#4a4540' },
  fertile: { label: 'Fertile women (unassigned)', color: '#e0526a' },
  children: { label: 'Unregistered children', color: '#55504a' },
  detainees: { label: 'Detainees', color: '#2c2c34' },
};

export function seal(size = 38, color = '#b3202a') {
  return `<svg class="seal" viewBox="0 0 100 100" width="${size}" height="${size}" style="width:${size}px;height:${size}px" aria-hidden="true">
  <defs><radialGradient id="sg" cx="50%" cy="40%"><stop offset="0" stop-color="#2a0b0d"/><stop offset="1" stop-color="#0b0a09"/></radialGradient></defs>
  <circle cx="50" cy="50" r="47" fill="url(#sg)" stroke="${color}" stroke-width="3"/>
  <circle cx="50" cy="50" r="40" fill="none" stroke="#c9a227" stroke-width=".8" stroke-dasharray="2 2"/>
  <path d="M10 52 Q25 34 40 46 Q30 42 22 52 Q30 48 38 52 Q28 54 22 60 Q32 54 40 58Z" fill="#c9a227"/>
  <path d="M90 52 Q75 34 60 46 Q70 42 78 52 Q70 48 62 52 Q72 54 78 60 Q68 54 60 58Z" fill="#c9a227"/>
  <path d="M30 50 Q50 30 70 50 Q50 70 30 50Z" fill="#eadfca" stroke="${color}" stroke-width="2"/>
  <circle cx="50" cy="50" r="9" fill="${color}"/><circle cx="50" cy="50" r="4" fill="#0b0a09"/><circle cx="47" cy="47" r="1.8" fill="#fff"/>
  </svg>`;
}

// Stylised full-length figure. viewBox 0 0 40 64
export function figure(kind, w = 34, h = 54) {
  const c = CLASS_INFO[Object.keys(CLASS_INFO).find(k => CLASS_INFO[k].fig === kind)] || {};
  const col = c.color || '#777';
  const skin = '#d9b99b';
  let head = `<circle cx="20" cy="11" r="5.2" fill="${skin}"/>`;
  let body = `<path d="M11 20 Q20 15 29 20 L33 60 L7 60Z" fill="${col}"/>`;
  let extra = '';
  switch (kind) {
    case 'handmaid':
      head = `<circle cx="20" cy="12" r="4.6" fill="${skin}"/><path d="M8 4 L20 8 L32 4 L29 18 L20 14 L11 18Z" fill="#f4efe6" stroke="#cfc6b5" stroke-width=".5"/>`;
      body = `<path d="M12 19 Q20 15 28 19 L34 61 L6 61Z" fill="${col}"/><path d="M14 19 Q20 22 26 19 L25 28 Q20 30 15 28Z" fill="#8f141b"/>`; break;
    case 'wife':
      body = `<path d="M12 19 Q20 15 28 19 L32 61 L8 61Z" fill="${col}"/><path d="M12 19 L28 19 L27 23 L13 23Z" fill="#16595f"/>`;
      head += `<path d="M14 9 Q20 2 26 9 L26 12 Q20 8 14 12Z" fill="#5a3b25"/>`; break;
    case 'widow':
      head = `<circle cx="20" cy="11" r="5" fill="${skin}"/><path d="M12 6 Q20 0 28 6 L30 22 L10 22Z" fill="#000" opacity=".85"/>`; break;
    case 'aunt':
      head += `<path d="M13 9 Q20 1 27 9 L28 16 Q20 13 12 16Z" fill="#4e3a26"/>`;
      body = `<path d="M11 19 Q20 15 29 19 L31 61 L9 61Z" fill="${col}"/><rect x="12" y="25" width="16" height="2.5" fill="#4e3a26"/><circle cx="20" cy="30" r="1" fill="#c9a227"/>`; break;
    case 'martha':
      head += `<path d="M13 10 Q20 2 27 10 L27 13 L13 13Z" fill="#59654a"/>`;
      body = `<path d="M11 19 Q20 15 29 19 L32 61 L8 61Z" fill="${col}"/><path d="M14 26 L26 26 L27 54 L13 54Z" fill="#b8b49f"/>`; break;
    case 'daughter':
      head += `<path d="M14 9 Q20 3 26 9 L27 15 Q20 12 13 15Z" fill="#e8a8c0"/>`;
      body = `<path d="M13 21 Q20 17 27 21 L30 56 L10 56Z" fill="${col}"/>`; break;
    case 'son':
      body = `<path d="M13 21 Q20 17 27 21 L28 40 L12 40Z" fill="${col}"/><rect x="13" y="40" width="5.5" height="16" fill="#3c4a5a"/><rect x="21.5" y="40" width="5.5" height="16" fill="#3c4a5a"/>`; break;
    case 'econowife':
      head += `<path d="M14 9 Q20 3 26 9 L26 12 Q20 9 14 12Z" fill="#555"/>`;
      body = `<path d="M11 19 Q20 15 29 19 L32 61 L8 61Z" fill="${col}"/>`; break;
    case 'economan':
      body = `<path d="M11 19 Q20 15 29 19 L30 38 L10 38Z" fill="${col}"/><rect x="11" y="38" width="8" height="23" fill="#3a3c40"/><rect x="21" y="38" width="8" height="23" fill="#3a3c40"/>`; break;
    case 'child':
      head = `<circle cx="20" cy="22" r="4.5" fill="${skin}"/>`;
      body = `<path d="M14 29 Q20 26 26 29 L28 58 L12 58Z" fill="${col}"/>`; break;
    case 'commander':
      body = `<path d="M10 19 Q20 15 30 19 L31 40 L9 40Z" fill="#141414"/><rect x="10" y="40" width="9" height="21" fill="#0c0c0c"/><rect x="21" y="40" width="9" height="21" fill="#0c0c0c"/><path d="M18 19 L20 30 L22 19Z" fill="#ddd"/><path d="M11 21 l2 -1 l.6 1.6 l1.7 0 l-1.3 1 l.5 1.6 l-1.5 -1 l-1.4 1 l.5 -1.6 l-1.3 -1 l1.7 0Z" fill="#c9a227"/>`;
      head += `<path d="M15 8 Q20 4 25 8 L25 10 L15 10Z" fill="#5a5a5a"/>`; break;
    case 'guardian':
      head += `<path d="M13 8 L27 8 L28 10 L12 10Z M15 8 Q20 2 25 8Z" fill="#1d2b4d"/>`;
      body = `<path d="M10 19 Q20 15 30 19 L31 40 L9 40Z" fill="${col}"/><rect x="10" y="40" width="9" height="21" fill="#22335a"/><rect x="21" y="40" width="9" height="21" fill="#22335a"/><rect x="27" y="22" width="3" height="18" fill="#222" transform="rotate(12 28 30)"/>`; break;
    case 'eye':
      head += `<rect x="15" y="9.5" width="10" height="2.6" rx="1" fill="#000"/>`;
      body = `<path d="M10 19 Q20 15 30 19 L32 61 L8 61Z" fill="#111"/><path d="M18 19 L20 26 L22 19Z" fill="#333"/>`;
      extra = `<g transform="translate(26 44)"><path d="M-5 0 Q0 -4 5 0 Q0 4 -5 0Z" fill="#eadfca"/><circle r="1.6" fill="#b3202a"/></g>`; break;
    case 'jezebel':
      head += `<path d="M14 10 Q20 2 26 10 L27 18 Q20 13 13 18Z" fill="#2a1a10"/>`;
      body = `<path d="M13 19 Q20 16 27 19 L29 46 L11 46Z" fill="${col}"/><rect x="13" y="46" width="5" height="15" fill="${skin}"/><rect x="22" y="46" width="5" height="15" fill="${skin}"/>`; break;
    case 'unwoman':
      head += `<path d="M13 9 Q20 3 27 9 L27 13 Q20 10 13 13Z" fill="#4a3e2c"/>`;
      body = `<path d="M11 19 Q20 15 29 19 L32 61 L8 61Z" fill="${col}"/><path d="M8 50 L32 52 L32 61 L8 61Z" fill="#3a2f20" opacity=".7"/>`;
      extra = `<rect x="27" y="36" width="9" height="12" rx="1" fill="#8b7d55" stroke="#4a3e2c" stroke-width=".6"/>`; break;
  }
  return `<svg class="fig" viewBox="0 0 40 64" width="${w}" height="${h}" aria-hidden="true">${body}${head}${extra}</svg>`;
}

export function portrait(id, name, faction, stars = 1, dead = false) {
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hair = ['#2b2118', '#4a3a2a', '#777', '#9a9a9a', '#3a2a1a'][h % 5];
  const skin = ['#d9b99b', '#c9a183', '#e2c3a5', '#b98a6a'][(h >>> 3) % 4];
  const bg = faction === 'hard' ? '#3a0d0f' : '#1d2a33';
  const jaw = 10 + (h % 3);
  const initials = name.replace(/Commander /, '').split(' ').map(s => s[0]).join('').slice(0, 2);
  let st = '';
  for (let i = 0; i < stars; i++) st += `<path transform="translate(${10 + i * 7} 56) scale(.9)" d="M0 -3 L.9 -.9 L3 -.9 L1.3 .4 L1.9 2.6 L0 1.3 L-1.9 2.6 L-1.3 .4 L-3 -.9 L-.9 -.9Z" fill="#c9a227"/>`;
  return `<svg class="portrait" viewBox="0 0 54 64" aria-hidden="true">
    <rect width="54" height="64" fill="${bg}"/>
    <text x="50" y="12" font-size="9" text-anchor="end" fill="#ffffff22" font-family="serif">${initials}</text>
    <path d="M6 64 Q8 46 27 44 Q46 46 48 64Z" fill="#111"/>
    <path d="M23 44 L27 54 L31 44Z" fill="#ddd"/><path d="M26 46 L27 56 L28 46Z" fill="#7a1a1a"/>
    <ellipse cx="27" cy="${21 - (h % 3)}" rx="${jaw + 1.5}" ry="10" fill="${hair}"/>
    <rect x="${25}" y="38" width="4" height="7" fill="${skin}"/>
    <ellipse cx="27" cy="29" rx="${jaw}" ry="12.5" fill="${skin}"/>
    <path d="M${27 - jaw} 25 Q27 ${15 + (h % 4)} ${27 + jaw} 25 Q${27 + jaw} ${17 - (h % 2) * 2} 27 ${16 - (h % 3)} Q${27 - jaw} ${17 - (h % 2) * 2} ${27 - jaw} 25Z" fill="${hair}"/>
    <rect x="${21}" y="27" width="3" height="1.4" fill="#222"/><rect x="${30}" y="27" width="3" height="1.4" fill="#222"/>
    <path d="M23 36 Q27 ${37 + (h % 2)} 31 36" stroke="#5a3a2a" stroke-width="1" fill="none"/>
    ${st}${dead ? '<path d="M0 0 L54 64 M54 0 L0 64" stroke="#b3202a" stroke-width="2" opacity=".7"/>' : ''}
  </svg>`;
}

// Handmaid in profile, walking right (same drawing as the app icon).
export function handmaidProfile(w = 40, h = 80) {
  return `<svg viewBox="0 0 200 400" width="${w}" height="${h}" aria-hidden="true"><g transform="rotate(-5 110 110)">
    <path d="M72 126 C42 150 30 240 16 400 L178 400 C174 320 168 232 152 162 C146 140 132 132 118 134 Z" fill="#9c151b"/>
    <path d="M78 150 C62 220 54 300 46 400 M120 150 C118 240 120 320 124 400" stroke="#000" stroke-opacity=".22" stroke-width="5" fill="none"/>
    <path d="M58 132 C30 110 36 56 80 42 C110 33 150 40 172 54 L190 60 C196 100 194 150 184 192 L160 178 C136 158 108 152 90 154 C74 154 64 146 58 132 Z" fill="#efe8da"/>
    <path d="M110 42 C114 86 120 126 130 160" stroke="#cfc6b5" stroke-width="3" fill="none"/>
  </g></svg>`;
}
