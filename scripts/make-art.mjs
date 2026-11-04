// Generates flat SVG "product drawings" used as placeholder product imagery until real photography is uploaded.
import { writeFileSync, mkdirSync } from "node:fs";
const out = "public/images/products";
mkdirSync(out, { recursive: true });

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const label = (x, y, w, h, title, sub, ink, paper) => `
  <path d="M${x + 10} ${y}h${w - 20}l10 10v${h - 20}l-10 10h-${w - 20}l-10-10v-${h - 20}z" fill="${paper}"/>
  <text x="${x + w / 2}" y="${y + 30}" text-anchor="middle" font-family="Georgia,serif" font-size="13" letter-spacing="3" fill="${ink}" opacity=".75">ARCHAIC</text>
  <text x="${x + w / 2}" y="${y + h / 2 + 10}" text-anchor="middle" font-family="Georgia,serif" font-size="${title.length > 14 ? 20 : 25}" fill="${ink}">${esc(title)}</text>
  <text x="${x + w / 2}" y="${y + h - 22}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="13" fill="${ink}" opacity=".8">${esc(sub)}</text>`;

const flame = (cx, top) => `
  <ellipse cx="${cx}" cy="${top - 4}" rx="22" ry="34" fill="#f6c46a" opacity=".18"/>
  <path d="M${cx} ${top - 40}c10 14 14 24 9 33-3 6-15 6-18 0-5-9-1-19 9-33z" fill="#f2b24e"/>
  <path d="M${cx} ${top - 26}c5 8 6 13 3 17-2 3-6 3-7 0-2-4 0-9 4-17z" fill="#fff1c7"/>
  <rect x="${cx - 1.2}" y="${top - 8}" width="2.4" height="10" fill="#2a1f14"/>`;

function jar({ file, bg, wax, glass = "#d8cbb5", title, sub, lid = false }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <rect width="800" height="1000" fill="${bg}"/>
  <rect x="0" y="780" width="800" height="220" fill="#000" opacity=".07"/>
  ${lid ? `<rect x="250" y="250" width="300" height="46" fill="#3a2e20"/><rect x="262" y="296" width="276" height="14" fill="#2a2116"/>` : flame(400, 330)}
  <path d="M240 330h320v20c20 0 30 14 30 34v380c0 26-20 46-46 46H256c-26 0-46-20-46-46V384c0-20 10-34 30-34z" fill="${glass}" opacity=".55"/>
  <path d="M228 420h344v344c0 20-16 36-36 36H264c-20 0-36-16-36-36z" fill="${wax}"/>
  <path d="M228 420h344v18H228z" fill="#fff" opacity=".18"/>
  <path d="M250 360h14v400h-14z" fill="#fff" opacity=".22"/>
  ${label(268, 500, 264, 200, title, sub, "#2b2216", "#f4ecdd")}
</svg>`;
  writeFileSync(`${out}/${file}.svg`, svg);
}

function pillar({ file, bg, wax, title }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <rect width="800" height="1000" fill="${bg}"/>
  <rect x="0" y="800" width="800" height="200" fill="#000" opacity=".07"/>
  ${flame(250, 520)}${flame(400, 380)}${flame(550, 600)}
  <rect x="190" y="520" width="120" height="280" fill="${wax}"/>
  <rect x="330" y="380" width="140" height="420" fill="${wax}"/>
  <rect x="490" y="600" width="120" height="200" fill="${wax}"/>
  <rect x="330" y="380" width="140" height="12" fill="#fff" opacity=".2"/>
  <path d="M342 560h116v120h-116z" fill="#f4ecdd"/>
  <text x="400" y="612" text-anchor="middle" font-family="Georgia,serif" font-size="12" letter-spacing="2" fill="#2b2216">ARCHAIC</text>
  <text x="400" y="645" text-anchor="middle" font-family="Georgia,serif" font-size="16" fill="#2b2216">${esc(title)}</text>
</svg>`;
  writeFileSync(`${out}/${file}.svg`, svg);
}

function bubble({ file, bg, wax }) {
  let cubes = "";
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cubes += `<circle cx="${300 + c * 100}" cy="${430 + r * 100}" r="58" fill="${wax}"/><circle cx="${285 + c * 100}" cy="${412 + r * 100}" r="16" fill="#fff" opacity=".22"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><rect width="800" height="1000" fill="${bg}"/><rect x="0" y="780" width="800" height="220" fill="#000" opacity=".07"/>${flame(400, 380)}${cubes}</svg>`;
  writeFileSync(`${out}/${file}.svg`, svg);
}

function box({ file, bg, boxc, ribbon, title, sub }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <rect width="800" height="1000" fill="${bg}"/><rect x="0" y="790" width="800" height="210" fill="#000" opacity=".07"/>
  <rect x="150" y="360" width="500" height="430" fill="${boxc}"/>
  <rect x="130" y="300" width="540" height="90" fill="${boxc}"/><rect x="130" y="380" width="540" height="12" fill="#000" opacity=".15"/>
  <rect x="375" y="300" width="50" height="490" fill="${ribbon}"/>
  <path d="M400 300c-60-70-140-60-120-10 15 35 90 20 120 10zM400 300c60-70 140-60 120-10-15 35-90 20-120 10z" fill="${ribbon}"/>
  ${label(200, 470, 160, 150, title, sub, "#2b2216", "#f4ecdd").replace(/font-size="25"/, 'font-size="19"').replace(/font-size="20"/, 'font-size="16"')}
</svg>`;
  writeFileSync(`${out}/${file}.svg`, svg);
}

function tool({ file, bg, kind }) {
  const body = kind === "trimmer"
    ? `<path d="M300 760l200-420" stroke="#c9a46a" stroke-width="14" stroke-linecap="round"/><path d="M500 760l-200-420" stroke="#c9a46a" stroke-width="14" stroke-linecap="round"/><circle cx="300" cy="780" r="34" fill="none" stroke="#c9a46a" stroke-width="12"/><circle cx="500" cy="780" r="34" fill="none" stroke="#c9a46a" stroke-width="12"/><path d="M370 300h60l-10 50h-40z" fill="#c9a46a"/>`
    : `<rect x="230" y="380" width="340" height="240" fill="#2b2216"/><rect x="230" y="380" width="340" height="40" fill="#e0a46a"/><text x="400" y="530" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#f4ecdd">Archaic</text><text x="400" y="570" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="18" fill="#f4ecdd" opacity=".8">long matches</text>${[0, 1, 2, 3, 4].map((i) => `<rect x="${280 + i * 50}" y="250" width="8" height="140" fill="#d9c3a0"/><ellipse cx="${284 + i * 50}" cy="248" rx="8" ry="11" fill="#8c2f22"/>`).join("")}`;
  writeFileSync(`${out}/${file}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><rect width="800" height="1000" fill="${bg}"/><rect x="0" y="800" width="800" height="200" fill="#000" opacity=".07"/>${body}</svg>`);
}

const WAX = { ivory: "#efe6d2", amber: "#d9a05b", walnut: "#7a5634", sage: "#a9b59a", rose: "#d9a6a0", charcoal: "#3b3633", saffron: "#e6b04a" };
const BG = ["#cdbba3", "#b9a68c", "#d6c7b0", "#a89478", "#c4b39a"];

const jars = [
  ["oud-amber", "Oud & Amber", "resin · smoke · honey"],
  ["monsoon", "Monsoon", "wet earth · vetiver"],
  ["sandalwood", "Sandalwood", "Mysore sandal · musk"],
  ["rose-saffron", "Rose & Saffron", "damask · kesar"],
  ["jasmine", "Night Jasmine", "mogra · white tea"],
];
jars.forEach(([slug, title, sub], i) => {
  for (const [c, wax] of Object.entries(WAX)) if (["ivory", "amber", "walnut", "sage", "rose"].includes(c)) jar({ file: `${slug}-${c}`, bg: BG[i % BG.length], wax, title, sub });
  jar({ file: `${slug}-lid`, bg: BG[(i + 2) % BG.length], wax: WAX.ivory, title, sub, lid: true });
});
pillar({ file: "pillar-trio-ivory", bg: BG[1], wax: WAX.ivory, title: "Pillar trio" });
pillar({ file: "pillar-trio-charcoal", bg: BG[2], wax: WAX.charcoal, title: "Pillar trio" });
pillar({ file: "pillar-trio-sage", bg: BG[0], wax: WAX.sage, title: "Pillar trio" });
bubble({ file: "bubble-ivory", bg: BG[3], wax: WAX.ivory });
bubble({ file: "bubble-rose", bg: BG[0], wax: WAX.rose });
bubble({ file: "bubble-sage", bg: BG[2], wax: WAX.sage });
box({ file: "box-diwali", bg: BG[0], boxc: "#6e2b22", ribbon: "#e6b04a", title: "Diwali box", sub: "three pours" });
box({ file: "box-selfcare", bg: BG[2], boxc: "#a9b59a", ribbon: "#efe6d2", title: "Slow evening", sub: "self-care set" });
box({ file: "box-wedding", bg: BG[1], boxc: "#efe6d2", ribbon: "#c9a46a", title: "Shubh vivah", sub: "wedding hamper" });
box({ file: "box-birthday", bg: BG[4], boxc: "#d9a6a0", ribbon: "#3b3633", title: "Birthday", sub: "gift box" });
tool({ file: "trimmer", bg: BG[2], kind: "trimmer" });
tool({ file: "matches", bg: BG[0], kind: "matches" });
writeFileSync("public/images/placeholder.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#cdbba3"/><path d="M400 380c18 24 24 40 16 56-5 10-27 10-32 0-8-16-2-32 16-56z" fill="#2b2216" opacity=".35"/><rect x="330" y="450" width="140" height="200" fill="#2b2216" opacity=".2"/></svg>`);
console.log("art generated");
