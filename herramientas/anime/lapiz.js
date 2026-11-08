// Birome en primer plano, estilo anime (cel + brillos)
const O = '#2a2440';
export function birome(t, glow = 0) {
  let s = `<g><rect x="-380" y="-60" width="760" height="120" rx="60" fill="#e9eef7" stroke="${O}" stroke-width="7"/><rect x="-370" y="-16" width="720" height="32" fill="#3d63c9" opacity=".85"/><path d="M-370 -40 L360 -40" stroke="#fff" stroke-width="12" opacity=".8" stroke-linecap="round"/></g>`;
  s += `<g transform="translate(-420 0)"><rect x="-210" y="-86" width="300" height="172" rx="40" fill="#3d63c9" stroke="${O}" stroke-width="7"/><path d="M-190 -60 L60 -60" stroke="#8fb0ff" stroke-width="16" stroke-linecap="round"/><rect x="-60" y="-150" width="60" height="70" rx="12" fill="#3d63c9" stroke="${O}" stroke-width="7"/>
    <circle cx="-130" cy="0" r="22" fill="#121032" stroke="${O}" stroke-width="5"/>${glow ? `<circle cx="-130" cy="0" r="${40 + 30 * glow + Math.sin(t * 8) * 6}" fill="none" stroke="#ffe36a" stroke-width="8" opacity="${glow}"/>` + [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i / 8 * 6.283 + t; return `<path d="M${-130 + Math.cos(a) * 70} ${Math.sin(a) * 70} l${Math.cos(a) * 40 * glow} ${Math.sin(a) * 40 * glow}" stroke="#ffe36a" stroke-width="8" stroke-linecap="round" opacity="${glow}"/>`; }).join('') : ''}</g>`;
  return s;
}
