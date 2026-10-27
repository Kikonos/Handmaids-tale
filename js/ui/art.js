// Procedural art: brand mark, class avatars (costume colours after Ane Crabtree's designs), dossier portraits.

export const CLASS_INFO = {
  commanders: { label: 'Commanders', color: '#c9ced6', desc: 'Rule. Black: a non-colour that is all-powerful.', fig: 'commander' },
  wives: { label: 'Wives', color: '#2c9aa6', desc: 'Teal. Run households; may not read.', fig: 'wife' },
  widows: { label: 'Widows', color: '#6b7078', desc: 'Black. Wives in mourning.', fig: 'widow' },
  daughters: { label: 'Daughters', color: '#e08aab', desc: 'Pink "Plums", then green when marriageable.', fig: 'daughter' },
  sons: { label: 'Sons', color: '#86b1dd', desc: 'Light blue. Groomed to be Commanders.', fig: 'son' },
  aunts: { label: 'Aunts', color: '#b08455', desc: 'Brown. The only women permitted to read.', fig: 'aunt' },
  handmaids: { label: 'Handmaids', color: '#e5484d', desc: 'Red, white wings. Bear children for the elite.', fig: 'handmaid' },
  marthas: { label: 'Marthas', color: '#8fa274', desc: 'Faded green. Unpaid domestic servants.', fig: 'martha' },
  econowives: { label: 'Econowives', color: '#9aa0a8', desc: 'Grey. Wife, Martha and Handmaid in one.', fig: 'econowife' },
  economen: { label: 'Economen', color: '#7d848e', desc: 'The default class of ordinary men.', fig: 'economan' },
  econochildren: { label: 'Econo children', color: '#a9aeb5', desc: 'Children of the working class.', fig: 'child' },
  guardians: { label: 'Guardians', color: '#5b7fd6', desc: 'Navy. Soldiers and police: physical muscle.', fig: 'guardian' },
  eyes: { label: 'Eyes', color: '#8d95a3', desc: 'Secret police: mental muscle.', fig: 'eye' },
  jezebels: { label: 'Jezebels', color: '#b45fa3', desc: 'Hidden women of the Commanders\' club.', fig: 'jezebel' },
  unwomen: { label: 'Unwomen', color: '#b39a5e', desc: 'The "unredeemable", worked to death in the Colonies.', fig: 'unwoman' },
};
export const POOL_INFO = {
  men: { label: 'Unprocessed men', color: '#3a3f47' },
  women: { label: 'Unprocessed women', color: '#4a505a' },
  fertile: { label: 'Fertile women (unassigned)', color: '#ff7a80' },
  children: { label: 'Unregistered children', color: '#5c636e' },
  detainees: { label: 'Detainees', color: '#2c3038' },
};

// Brand mark: the Eye in a crimson tile.
export function mark(size = 36) {
  return `<svg class="mark" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">
    <defs><linearGradient id="mk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e5484d"/><stop offset="1" stop-color="#7a1218"/></linearGradient></defs>
    <rect width="40" height="40" rx="11" fill="url(#mk)"/>
    <path d="M7 20s5-7.5 13-7.5S33 20 33 20s-5 7.5-13 7.5S7 20 7 20z" fill="#fff" fill-opacity=".95"/>
    <circle cx="20" cy="20" r="4.6" fill="#7a1218"/><circle cx="20" cy="20" r="1.9" fill="#0b0c0f"/>
  </svg>`;
}

// Class avatar: a bust silhouette on a tinted disc. Faces are left blank on purpose.
const SKIN = '#d9cfc4';
export function figure(kind, size = 44) {
  const key = Object.keys(CLASS_INFO).find(k => CLASS_INFO[k].fig === kind);
  const c = CLASS_INFO[key]?.color || '#888';
  let body = '', head = `<circle cx="24" cy="20" r="7.2" fill="${SKIN}"/>`, over = '';
  const bust = fill => `<path d="M7.5 48c.6-10 7.7-16.4 16.5-16.4S39.9 38 40.5 48z" fill="${fill}"/>`;
  switch (kind) {
    case 'handmaid':
      body = bust('#c8262d') + '<path d="M18 32.5l6 6 6-6" fill="none" stroke="#8f141b" stroke-width="1.6"/>';
      head = `<circle cx="24" cy="21" r="6.6" fill="${SKIN}"/>`;
      over = '<path d="M11.5 11.5L24 14.5l12.5-3-2.6 17.2L24 25.5l-9.9 3.2z" fill="#f6f2ea"/><path d="M24 14.5v11" stroke="#d6cfc2" stroke-width="1"/>'; break;
    case 'wife':
      body = bust('#1f7f8a') + '<path d="M17 33.5c2 2.2 4.3 3.3 7 3.3s5-1.1 7-3.3" fill="none" stroke="#155b63" stroke-width="2"/>';
      over = '<path d="M16.6 20a7.4 7.4 0 0 1 14.8 0c-1.6-3.4-4.3-4.8-7.4-4.8s-5.8 1.4-7.4 4.8z" fill="#4a3426"/><circle cx="24" cy="11.6" r="3" fill="#4a3426"/>'; break;
    case 'widow':
      body = bust('#141518');
      over = '<path d="M15 25c-1-9 3.2-14 9-14s10 5 9 14l2.5 9h-23z" fill="#0a0b0d" opacity=".92"/>'; break;
    case 'aunt':
      body = bust('#7d5a36') + '<path d="M18.5 31.8h11v3.4h-11z" fill="#5b3f24"/>';
      over = '<path d="M15.8 22c0-5.6 3.6-9.4 8.2-9.4s8.2 3.8 8.2 9.4c-2-1.8-4.8-2.6-8.2-2.6s-6.2.8-8.2 2.6z" fill="#5b3f24"/>'; break;
    case 'martha':
      body = bust('#6c7b58') + '<path d="M19 34l5 10 5-10" fill="#c9c4b0"/>';
      over = '<path d="M16 22.5c0-6 3.6-10 8-10s8 4 8 10c-2-2-4.6-3-8-3s-6 1-8 3z" fill="#56633f"/>'; break;
    case 'daughter':
      body = bust('#d77ea0');
      over = '<path d="M15.6 24c-.6-7.4 3.4-12.4 8.4-12.4s9 5 8.4 12.4c-1.6-3.6-4.8-5.6-8.4-5.6s-6.8 2-8.4 5.6z" fill="#f0b8cc"/>'; break;
    case 'son':
      body = bust('#7aa6d4');
      over = '<path d="M16.8 19.2a7.2 7.2 0 0 1 14.4 0c-2.4-2-4.6-2.6-7.2-2.6s-4.8.6-7.2 2.6z" fill="#5a4030"/>'; break;
    case 'econowife':
      body = bust('#8a9098');
      over = '<path d="M16 22c0-5.8 3.6-9.6 8-9.6s8 3.8 8 9.6c-2-1.6-4.6-2.4-8-2.4s-6 .8-8 2.4z" fill="#6d737b"/>'; break;
    case 'economan':
      body = bust('#6c737d') + '<path d="M20 32l4 4.5 4-4.5" fill="none" stroke="#4d535c" stroke-width="1.6"/>';
      over = '<path d="M16.9 19a7.1 7.1 0 0 1 14.2 0c-2-1.7-4.4-2.4-7.1-2.4s-5.1.7-7.1 2.4z" fill="#3b3029"/>'; break;
    case 'child':
      body = '<path d="M12 48c.5-7.6 5.6-12.2 12-12.2S35.5 40.4 36 48z" fill="#959ba4"/>';
      head = `<circle cx="24" cy="27" r="6" fill="${SKIN}"/>`; break;
    case 'commander':
      body = bust('#18191d') + '<path d="M20.4 31.8L24 40.5l3.6-8.7z" fill="#eceae6"/><path d="M23.1 33.5h1.8l.5 6-1.4 2-1.4-2z" fill="#8f141b"/><path d="M11.5 36.5l2 .3.5 1.8" fill="none" stroke="#d9b566" stroke-width="1.2"/>';
      over = '<path d="M16.9 18.6a7.1 7.1 0 0 1 14.2 0c-2-1.4-4.4-2-7.1-2s-5.1.6-7.1 2z" fill="#6e6a66"/>'; break;
    case 'guardian':
      body = bust('#2c4688') + '<path d="M24 32v16" stroke="#1d3168" stroke-width="1.6"/><circle cx="24" cy="37" r=".9" fill="#d9b566"/><circle cx="24" cy="42" r=".9" fill="#d9b566"/>';
      over = '<path d="M15.5 16.5c1.4-3.6 4.6-5.4 8.5-5.4s7.1 1.8 8.5 5.4z" fill="#1d3168"/><path d="M14.5 16.5h19l-1.6 2.4H16.1z" fill="#14254f"/>'; break;
    case 'eye':
      body = bust('#0e0f12') + '<path d="M21 32l3 6 3-6" fill="#2a2d33"/>';
      over = '<path d="M16.9 18.6a7.1 7.1 0 0 1 14.2 0c-2-1.4-4.4-2-7.1-2s-5.1.6-7.1 2z" fill="#26211d"/><rect x="17.6" y="19.3" width="12.8" height="3.2" rx="1.4" fill="#0b0c0f"/>'; break;
    case 'jezebel':
      body = `<path d="M10 48c.6-9 6.6-14.4 14-14.4S37.4 39 38 48z" fill="${SKIN}"/><path d="M13 48c.4-5 2-7.6 4.5-9.5h13c2.5 1.9 4.1 4.5 4.5 9.5z" fill="#8e3d7f"/><path d="M19 35.6c1.5 1.6 3.2 2.3 5 2.3s3.5-.7 5-2.3" fill="none" stroke="#d9b566" stroke-width="1"/>`;
      over = '<path d="M16 22c-.4-6.4 3.4-10.6 8-10.6s8.4 4.2 8 10.6c-1-3-3-5-8-5s-7 2-8 5z" fill="#2c1a14"/>'; break;
    case 'unwoman':
      body = bust('#7f6a40') + '<path d="M8.5 44.5c4-2 9-2.6 15.5-1.4 6.6 1.2 11.6.4 15.5-1.1L40.5 48h-33z" fill="#5c4b2c"/>';
      over = '<path d="M16 22c0-5.8 3.6-9.6 8-9.6s8 3.8 8 9.6c-2-1.6-4.6-2.4-8-2.4s-6 .8-8 2.4z" fill="#5c4b2c"/>'; break;
  }
  return `<svg class="fig" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
    <defs><clipPath id="fc-${kind}"><circle cx="24" cy="24" r="23"/></clipPath></defs>
    <circle cx="24" cy="24" r="23" fill="${c}" fill-opacity=".16"/>
    <g clip-path="url(#fc-${kind})">${body}${head}${over}</g>
    <circle cx="24" cy="24" r="23" fill="none" stroke="${c}" stroke-opacity=".45" stroke-width="1"/>
  </svg>`;
}

// Dossier portrait for named Commanders: duotone bust, monogram, rank pips.
export function portrait(id, name, faction, stars = 1, dead = false) {
  const hard = faction === 'hard';
  const a = hard ? '#3a1013' : '#11202d', b = hard ? '#0e0708' : '#070a0e', rim = hard ? '#e5484d' : '#5b8def';
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const initials = name.replace(/Commander /, '').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const hw = 9 + (h % 3), hy = 25 + (h >>> 3) % 3;
  let pips = '';
  for (let i = 0; i < stars; i++) pips += `<rect x="${41 - i * 6}" y="55" width="4" height="4" rx="1" transform="rotate(45 ${43 - i * 6} 57)" fill="#d9b566"/>`;
  return `<svg class="portrait ${dead ? 'dead' : ''}" viewBox="0 0 54 64" aria-hidden="true">
    <defs><linearGradient id="pg-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="54" height="64" fill="url(#pg-${id})"/>
    <path d="M0 16h54M0 32h54M0 48h54M18 0v64M36 0v64" stroke="#fff" stroke-opacity=".035"/>
    <radialGradient id="ph-${id}" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#3a3f48"/><stop offset="1" stop-color="#15171c"/></radialGradient>
    <path d="M4 64c1.2-12.5 10-19 23-19s21.8 6.5 23 19z" fill="url(#ph-${id})" stroke="${rim}" stroke-opacity=".6" stroke-width=".8"/>
    <path d="M22.4 45.4L27 55.5l4.6-10.1z" fill="#d8d6d2"/><path d="M26 47.5h2l.6 6.5-1.6 2.2-1.6-2.2z" fill="${rim}"/>
    <path d="M23.2 ${hy + 9}h7.6v${(45.5 - hy - 9).toFixed(1)}h-7.6z" fill="#2a2e35"/>
    <ellipse cx="27" cy="${hy}" rx="${hw}" ry="11.2" fill="url(#ph-${id})" stroke="${rim}" stroke-opacity=".6" stroke-width=".8"/>
    <path d="M${27 - hw} ${hy - 1}c0-7 4.2-11.6 ${hw}-11.6s${hw} 4.6 ${hw} 11.6c-2-3.2-5.4-4.8-${hw}-4.8s-${hw - 2} 1.6-${hw} 4.8z" fill="#0b0c0f" opacity=".85"/>
    <text x="5" y="10" font-family="JetBrains Mono, monospace" font-size="7" font-weight="600" fill="#fff" fill-opacity=".55">${initials}</text>
    ${pips}
    ${dead ? '<rect width="54" height="64" fill="#000" fill-opacity=".5"/><rect y="27" width="54" height="10" fill="#e5484d" fill-opacity=".9"/><text x="27" y="34.2" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="5.6" font-weight="700" letter-spacing=".8" fill="#fff">DECEASED</text>' : ''}
  </svg>`;
}

// Handmaid in profile, walking right (same drawing as the app icon).
export function handmaidProfile(w = 40, h = 80) {
  return `<svg viewBox="0 0 200 400" width="${w}" height="${h}" aria-hidden="true"><g transform="rotate(-5 110 110)">
    <path d="M72 126 C42 150 30 240 16 400 L178 400 C174 320 168 232 152 162 C146 140 132 132 118 134 Z" fill="#a8161d"/>
    <path d="M78 150 C62 220 54 300 46 400 M120 150 C118 240 120 320 124 400" stroke="#000" stroke-opacity=".22" stroke-width="5" fill="none"/>
    <path d="M58 132 C30 110 36 56 80 42 C110 33 150 40 172 54 L190 60 C196 100 194 150 184 192 L160 178 C136 158 108 152 90 154 C74 154 64 146 58 132 Z" fill="#efe9de"/>
    <path d="M110 42 C114 86 120 126 130 160" stroke="#cfc6b5" stroke-width="3" fill="none"/>
  </g></svg>`;
}
