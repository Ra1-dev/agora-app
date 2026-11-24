#!/usr/bin/env node
/*
 * AGORA default event cover generator (sheet 16, approved 2026-11-24).
 * Builds the cover an event gets when the organizer did not upload one:
 * one marble shard, two riso ink shapes, grain and the event name.
 * The same event name always gives the same cover; --variant picks another composition.
 *
 * Usage:
 *   node agora-cover.mjs "STEPPE AI Summit 2027" --meta "May 14–16, Astana" [--ink agora|org|tracks] [--org #5B3DF5]
 *                        [--theme light|dark] [--variant 0] [--out ./covers] [--png]
 *
 * Output: <slug>-wide.svg (1200×400, 3:1), <slug>-square.svg (800×800), <slug>-story.svg (720×1280, 9:16).
 * --png renders PNGs too when @resvg/resvg-js is installed (npm i @resvg/resvg-js); fonts Forum and
 * Source Sans 3 must be installed on the machine for text to match.
 * No other dependencies.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MARBLE = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='v' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='0.0045 0.013' numOctaves='4' seed='21' result='t1'/><feTurbulence type='turbulence' baseFrequency='0.0061 0.0173' numOctaves='3' seed='4' result='t2'/><feComposite in='t1' in2='t2' operator='arithmetic' k1='0' k2='0.62' k3='0.62' k4='0' result='s'/><feColorMatrix in='s' type='matrix' values='0 0 0 0 0.34  0 0 0 0 0.33  0 0 0 0 0.31  1 0 0 0 0' result='a'/><feComponentTransfer in='a'><feFuncA type='table' tableValues='0.85 0.55 0.22 0.06 0 0 0 0 0 0 0 0'/></feComponentTransfer></filter><filter id='c' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='3' seed='5'/><feColorMatrix values='0 0 0 0 0.72  0 0 0 0 0.71  0 0 0 0 0.68  0 0 0 -1.1 0.62'/></filter><rect width='100%' height='100%' fill='#EEECE7'/><rect width='100%' height='100%' filter='url(#c)' opacity='0.55'/><rect width='100%' height='100%' filter='url(#v)'/></svg>`;
const MURL = 'data:image/svg+xml;base64,' + Buffer.from(MARBLE).toString('base64');
const C = { paper: '#F2F2F0', ink: '#151618', paperD: '#111110', inkD: '#F0EDE6', muted: '#5C5E63', mutedD: '#A39E94',
  blue: '#3255A4', blueD: '#516FB2', pink: '#FF48B0', green: '#00A95C', yellow: '#FFE800' };

/* ---------- seeded random ---------- */
function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/* ---------- primitives ---------- */
function shard(r, cx, cy, rad) {
  const n = r() < .5 ? 5 : 6; const start = r() * Math.PI * 2; const pts = [];
  for (let i = 0; i < n; i++) { const a = start + i * 2 * Math.PI / n + (r() - .5) * .7; const d = rad * (.72 + r() * .38); pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
  return pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
}
function shape(kind, x, y, s, color, blend, rot = 0) {
  const st = `fill:${color};mix-blend-mode:${blend}`;
  const tr = rot ? ` transform="rotate(${rot} ${(x + s / 2).toFixed(1)} ${(y + s / 2).toFixed(1)})"` : '';
  const f = v => v.toFixed(1);
  if (kind === 'circle') return `<circle cx="${f(x + s / 2)}" cy="${f(y + s / 2)}" r="${f(s / 2)}" style="${st}"/>`;
  if (kind === 'half') return `<path d="M${f(x)} ${f(y + s / 2)}a${f(s / 2)} ${f(s / 2)} 0 0 1 ${f(s)} 0z"${tr} style="${st}"/>`;
  if (kind === 'quarter') return `<path d="M${f(x)} ${f(y + s)}V${f(y)}a${f(s)} ${f(s)} 0 0 1 ${f(s)} ${f(s)}z"${tr} style="${st}"/>`;
  if (kind === 'bar') return `<rect x="${f(x)}" y="${f(y + s * .36)}" width="${f(s * 1.6)}" height="${f(s * .28)}"${tr} style="${st}"/>`;
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s * .78)}"${tr} style="${st}"/>`;
}
function wrap(t, max) { const words = t.split(/\s+/); const lines = []; let cur = ''; for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) lines.push(cur); return lines.slice(0, 3); }

/* ---------- composition (identical to the sheet) ---------- */
export function cover({ name, meta = '', ink = 'agora', org = '#5B3DF5', theme = 'light', variant = 0, format = 'wide' }) {
  const SIZE = { wide: [1200, 400], square: [800, 800], story: [720, 1280] };
  const [W, H] = SIZE[format];
  const dark = theme === 'dark';
  const r = rng(hash(name + '|' + variant));
  const pairs = { agora: [C.blue, C.pink], org: [org, C.pink], tracks: [C.green, C.yellow] };
  const [a, b] = pairs[ink].map(c => dark && c === C.blue ? C.blueD : c);
  const bg = dark ? C.paperD : C.paper, txt = dark ? C.inkD : C.ink;
  const unit = W / 12;
  let s = `<rect width="${W}" height="${H}" fill="${bg}"/>`;
  const mx = format === 'story' ? W * (.45 + r() * .35) : W * (.66 + r() * .22);
  const my = format === 'story' ? H * (.2 + r() * .12) : H * (format === 'wide' ? .3 + r() * .3 : .28 + r() * .14);
  const mr = (format === 'wide' ? H * .78 : format === 'square' ? W * .42 : W * .62) * (.9 + r() * .2);
  s += `<clipPath id="shard"><polygon points="${shard(r, mx, my, mr)}"/></clipPath>`;
  s += `<image href="${MURL}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" clip-path="url(#shard)"${dark ? ' filter="url(#dim)"' : ''}/>`;
  const kinds = ['circle', 'half', 'quarter', 'bar', 'block'];
  const k1 = kinds[Math.floor(r() * 3)], k2 = kinds[2 + Math.floor(r() * 3)];
  const rot = k => k === 'bar' ? [0, 180][Math.floor(r() * 2)] : [0, 90, 180, 270][Math.floor(r() * 4)];
  let big, bx, by, sm, sx, sy;
  if (format === 'wide') { big = unit * (3 + r()); bx = unit * (6.6 + r() * 2.2); by = -big * .25 + r() * big * .35; sm = unit * (1.3 + r() * .8); sx = unit * (9.2 + r() * 1.4); sy = H * (.58 + r() * .14); }
  else if (format === 'square') { big = unit * (4.5 + r() * 1.5); bx = unit * (4.2 + r() * 3); by = -big * .2 + r() * big * .25; sm = unit * (1.8 + r() * 1.2); sx = unit * (.8 + r() * 2); sy = H * (.12 + r() * .16); }
  else { big = unit * (5.5 + r() * 1.5); bx = unit * (2.5 + r() * 4); by = H * (.08 + r() * .16); sm = unit * (2 + r() * 1.2); sx = unit * (.8 + r() * 2.2); sy = H * (.46 + r() * .08); }
  const blend = dark ? 'normal' : 'multiply';
  s += `<g opacity="${dark ? .92 : 1}">${shape(k1, bx, by, big, a, blend, rot(k1))}${shape(k2, sx, sy, sm, b, blend, rot(k2))}</g>`;
  const fs = format === 'wide' ? 58 : format === 'square' ? 72 : 82;
  const lines = wrap(name || 'Your event', format === 'wide' ? 18 : format === 'square' ? 14 : 12);
  const pad = format === 'wide' ? 48 : 56;
  const baseY = H - pad - 34;
  s += lines.map((l, i) => `<text x="${pad}" y="${(baseY - (lines.length - 1 - i) * fs * 1.02).toFixed(1)}" font-family="Forum, 'Times New Roman', serif" font-size="${fs}" fill="${txt}">${esc(l)}</text>`).join('');
  if (meta) s += `<text x="${pad}" y="${H - pad + 4}" font-family="'Source Sans 3', 'Segoe UI', sans-serif" font-weight="600" font-size="${(fs * .34).toFixed(1)}" letter-spacing="1" fill="${dark ? C.mutedD : C.muted}">${esc(meta)}</text>`;
  s += `<rect width="${W}" height="${H}" filter="url(#grain)" style="mix-blend-mode:${dark ? 'screen' : 'multiply'}" opacity="${dark ? .18 : .42}"/>`;
  const defs = `<defs><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .42  0 0 0 0 .38  0 0 0 -1.5 1"/></filter>` +
    `<filter id="dim"><feComponentTransfer><feFuncR type="linear" slope=".86"/><feFuncG type="linear" slope=".86"/><feFuncB type="linear" slope=".86"/></feComponentTransfer></filter></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)}">${defs}${s}</svg>\n`;
}

/* ---------- CLI ---------- */
const isMain = (process.argv[1] || '').replace(/\\/g, '/').endsWith('agora-cover.mjs');
if (isMain) {
  const argv = process.argv.slice(2);
  const opt = { name: '', meta: '', ink: 'agora', org: '#5B3DF5', theme: 'light', variant: 0, out: '.', png: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--png') opt.png = true;
    else if (k.startsWith('--')) opt[k.slice(2)] = argv[++i];
    else opt.name = k;
  }
  if (!opt.name) { console.error('Usage: node agora-cover.mjs "Event name" [--meta "..."] [--ink agora|org|tracks] [--org #hex] [--theme light|dark] [--variant n] [--out dir] [--png]'); process.exit(1); }
  opt.variant = Number(opt.variant) || 0;
  const slug = opt.name.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') + (opt.theme === 'dark' ? '-night' : '');
  mkdirSync(opt.out, { recursive: true });
  let resvg = null;
  if (opt.png) { try { resvg = (await import('@resvg/resvg-js')).Resvg; } catch { console.error('PNG skipped: run `npm i @resvg/resvg-js` first.'); } }
  for (const format of ['wide', 'square', 'story']) {
    const svg = cover({ ...opt, format });
    const f = join(opt.out, `${slug}-${format}.svg`);
    writeFileSync(f, svg);
    console.log('wrote', f);
    if (resvg) { const png = new resvg(svg, { font: { loadSystemFonts: true } }).render().asPng(); writeFileSync(f.replace(/\.svg$/, '.png'), png); console.log('wrote', f.replace(/\.svg$/, '.png')); }
  }
}
