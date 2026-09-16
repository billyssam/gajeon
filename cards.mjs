// 섹션 카드 이미지 — 🔴 구글 1위(그돈이면)가 실제로 쓰는 방식 그대로다(2026-09-13 실측).
//    1200×675 · 왼쪽 위에 그 섹션 문구 한 줄 · 제품 이미지 한 장 · 배경색만 바꿔 재활용 · 연한 워터마크.
//    도면을 새로 발명하지 않는다. 상위가 하는 것을 그대로 한다.
// 🔴 글자는 이미지 생성이 아니라 HTML/CSS 조판이다 — 재현성 100%.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
const RENDERER_VERSION=createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url))).digest("hex").slice(0,16);

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SITE = "고르는 기준";
const esc = s => String(s ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// 배경은 섹션마다 돌려 쓴다. 그돈이면도 같은 제품 사진에 배경만 바꿨다.
const BG = [
  ["#fffdf5", "#fdf0cf"], ["#fbfaff", "#e9e6fb"], ["#f7fbff", "#dceaf7"],
  ["#fffaf8", "#fbe3da"], ["#f8fdfa", "#daf0e4"], ["#fcfaff", "#efe4f7"],
];

function cardHTML(title, i, art) {
  const [a, b] = BG[i % BG.length];
  return `<div class="card" style="background:linear-gradient(135deg,${a} 0%,${b} 100%)">
    <h1>${title}</h1><div class="art">${art}</div><div class="wm">${SITE}</div></div>`;
}
function pageHTML(titles, art, offset=0) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;font-family:"Apple SD Gothic Neo","Pretendard",-apple-system,sans-serif}
.card{width:1200px;height:675px;position:relative;overflow:hidden}
h1{position:absolute;left:64px;top:56px;font-size:46px;font-weight:800;color:#17181a;
  letter-spacing:-.035em;line-height:1.25;word-break:keep-all;max-width:620px}
.art{position:absolute;left:110px;top:180px;width:290px;height:330px;
  display:flex;align-items:center;justify-content:center}
.wm{position:absolute;right:56px;bottom:44px;font-size:20px;font-weight:600;
  color:#17181a;opacity:.14;letter-spacing:-.02em}
</style></head><body>${titles.map((t, i) => cardHTML(t, i+offset, art)).join("")}</body></html>`;
}

export function topicArt(slug,index=0) {
  if(/도마/.test(slug)) {
    const colors=["#bd9165","#87a69b","#b99572","#a3a48e"];
    const board=(x,y,w,h,c)=>`<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="20" fill="${c}" stroke="#695443" stroke-width="3"/><rect x="14" y="14" width="${w-28}" height="${h-28}" rx="12" fill="none" stroke="#fff" opacity=".35" stroke-width="2"/><path d="M30 55 H${w-30} M30 86 H${w-30} M30 117 H${w-30}" stroke="#614e3f" opacity=".15" stroke-width="2"/></g>`;
    let art=index===1?board(15,25,145,195,colors[0])+board(140,90,140,195,colors[1]):board(30,30,225,260,colors[index%4]);
    if(index===2) art+='<path d="M40 310 H245 M40 303 V317 M245 303 V317" stroke="#655a4c" stroke-width="3"/>';
    if(index===3) art+='<path d="M15 300 H280 M260 65 V300" stroke="#655a4c" stroke-width="5" fill="none"/><path d="M260 270 L282 300" stroke="#655a4c" stroke-width="5"/>';
    return `<svg viewBox="0 0 290 330" width="290" height="330" role="img" aria-label="도마 선택 기준 개념 그림">${art}</svg>`;
  }
  if(/유모차/.test(slug)) {
    const art = [
      '<rect x="48" y="45" width="190" height="230" rx="8" fill="#fff" stroke="#59636b" stroke-width="4"/><path d="M48 90 H238 M95 45 V90" stroke="#59636b" stroke-width="4"/><path d="M72 310 V265 M215 310 V265 M60 300 H228" stroke="#748b91" stroke-width="5"/><path d="M72 292 H215" stroke="#c2cdd0" stroke-width="3"/>',
      '<path d="M70 75 H205 L235 205 H90 Z" fill="#dbe8ee" stroke="#59636b" stroke-width="4"/><path d="M70 75 L48 45" stroke="#59636b" stroke-width="7"/><circle cx="110" cy="235" r="27" fill="#fff" stroke="#59636b" stroke-width="5"/><circle cx="210" cy="235" r="27" fill="#fff" stroke="#59636b" stroke-width="5"/><path d="M85 190 H230" stroke="#8a9aa0" stroke-width="4"/>',
      '<path d="M90 70 H205 L238 180 H112 Z" fill="#d9e3e8" stroke="#59636b" stroke-width="4"/><path d="M90 70 L58 40" stroke="#59636b" stroke-width="8"/><path d="M115 180 L75 285 M212 180 L230 285" stroke="#59636b" stroke-width="7"/><circle cx="75" cy="290" r="20" fill="#fff" stroke="#59636b" stroke-width="5"/><circle cx="230" cy="290" r="20" fill="#fff" stroke="#59636b" stroke-width="5"/>',
      '<path d="M52 85 H238 M52 85 V250 M52 250 H238" stroke="#59636b" stroke-width="5" fill="none"/><path d="M88 85 V104 M124 85 V113 M160 85 V104 M196 85 V113 M232 85 V104" stroke="#71888d" stroke-width="4"/><path d="M88 205 H230" stroke="#e2b36b" stroke-width="8"/><circle cx="88" cy="205" r="10" fill="#59636b"/><circle cx="230" cy="205" r="10" fill="#59636b"/>'
    ][index % 4];
    return `<svg viewBox="0 0 290 330" width="290" height="330" role="img" aria-label="유모차 선택 기준 개념 그림">${art}</svg>`;
  }
  if(/에너지/.test(slug)) {
    const art = [
      '<rect x="52" y="35" width="185" height="260" rx="16" fill="#fff" stroke="#69766c" stroke-width="4"/><path d="M80 90 H210 M80 135 H210 M80 180 H210" stroke="#b6c1ba" stroke-width="8"/><path d="M80 235 l22 22 l45 -56" stroke="#668f7a" stroke-width="8" fill="none"/>',
      '<path d="M55 275 V65 M55 275 H245" stroke="#69766c" stroke-width="5"/><rect x="80" y="190" width="32" height="85" fill="#9bb3a9"/><rect x="135" y="140" width="32" height="135" fill="#769d8c"/><rect x="190" y="90" width="32" height="185" fill="#587d6d"/>',
      '<path d="M145 35 V105 L108 170 H155 L132 285 L205 150 H160 L185 35 Z" fill="#e4b862" stroke="#7a6743" stroke-width="4"/>',
      '<circle cx="145" cy="165" r="100" fill="#fff" stroke="#69766c" stroke-width="4"/><path d="M145 165 L95 115" stroke="#668f7a" stroke-width="9" stroke-linecap="round"/><circle cx="145" cy="165" r="12" fill="#69766c"/><path d="M82 260 H208" stroke="#b6c1ba" stroke-width="8"/>'
    ][index % 4];
    return `<svg viewBox="0 0 290 330" width="290" height="330" role="img" aria-label="에너지 효율 선택 기준 개념 그림">${art}</svg>`;
  }
  if(/젖병/.test(slug)) {
    const art = [
      '<path d="M125 40 H175 V78 L195 105 V270 Q145 300 95 270 V105 L115 78 V40 Z" fill="#fff" stroke="#69766c" stroke-width="4"/><path d="M117 78 H183" stroke="#69766c" stroke-width="5"/><path d="M110 185 H180" stroke="#b6c1ba" stroke-width="8"/>',
      '<path d="M45 110 H115 V270 H45 Z M175 110 H245 V270 H175 Z" fill="#fff" stroke="#69766c" stroke-width="4"/><path d="M68 75 H92 V110 H68 Z M198 75 H222 V110 H198 Z" fill="#9bb3a9" stroke="#69766c" stroke-width="4"/><path d="M130 170 H160" stroke="#668f7a" stroke-width="7"/>',
      '<path d="M120 70 Q145 35 170 70 V110 H120 Z" fill="#d8e6ee" stroke="#69766c" stroke-width="4"/><path d="M120 110 Q145 125 170 110 V240 Q145 275 120 240 Z" fill="#fff" stroke="#69766c" stroke-width="4"/><path d="M145 150 V225" stroke="#e4b862" stroke-width="8"/>',
      '<path d="M80 65 H210 V260 H80 Z" fill="#fff" stroke="#69766c" stroke-width="4"/><path d="M105 95 V230 M145 95 V230 M185 95 V230" stroke="#b6c1ba" stroke-width="5"/><path d="M65 260 H225" stroke="#668f7a" stroke-width="8"/><path d="M110 285 Q145 305 180 285" stroke="#69766c" stroke-width="4" fill="none"/>'
    ][index % 4];
    return `<svg viewBox="0 0 290 330" width="290" height="330" role="img" aria-label="젖병 선택 기준 개념 그림">${art}</svg>`;
  }
  // No verified product image: show an editorial checklist, never an unrelated appliance.
  return `<svg viewBox="0 0 290 330" width="290" height="330" role="img" aria-label="구매 조건 확인 체크리스트"><rect x="35" y="22" width="220" height="280" rx="18" fill="#fff" stroke="#69766c" stroke-width="3"/><rect x="85" y="10" width="120" height="32" rx="12" fill="#69766c"/>${[90,160,230].map(y=>`<path d="M65 ${y} l12 12 l22 -26" stroke="#668f7a" stroke-width="6" fill="none"/><path d="M125 ${y} H220 M125 ${y+16} H195" stroke="#b6c1ba" stroke-width="7"/>`).join("")}</svg>`;
}

// 🔴 PNG 로 두면 27편 × 5장 = 31MB 다. 평면 그림이라 JPEG 로 바꾸면 3MB —
//    배포도 빠르고 폰에서 먼저 뜬다. 글자 선명도는 q82 에서 눈에 띄지 않는다(실측).
export function makeCards(slug, titles, outDir = `dist/img/${slug}`) {
  fs.mkdirSync(outDir, { recursive: true });
  // 🔴 카드 한 장에 헤드리스 크롬을 한 번 띄운다 — 27편 × 4장이면 빌드가 3분을 넘긴다.
  //    제목이 그대로면 다시 찍지 않는다. 캐시는 dist 밖에 둔다(build 가 dist 를 지운다).
  const cacheDir = path.join(".cache/cards", slug);
  const stamp = path.join(cacheDir, "titles.json");
  const want = JSON.stringify({titles,topic:slug,renderer:RENDERER_VERSION,site:SITE});
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, "utf-8") === want) {
    const files = titles.map((_, i) => `${i + 1}.jpg`);
    if (files.every(f => fs.existsSync(path.join(cacheDir, f)))) {
      for (const f of files) fs.copyFileSync(path.join(cacheDir, f), path.join(outDir, f));
      return files.map(f => path.join(outDir, f));
    }
  }
  const tmp = fs.mkdtempSync("/tmp/cards-");
  // 🔴 한 장짜리 띠로 찍고 sips 로 잘라 보려 했는데 --cropOffset 이 제대로 안 자른다
  //    (오프셋 1350 은 아예 안 잘렸다, 2026-09-13 실측). 낱장으로 찍는다.
  //    크롬 한 번이 2.4초다. 27편 × 4장이면 4분 남짓 — 그래서 캐시가 필요하다.
  const made = [];
  titles.forEach((t, i) => {
    const f = path.join(tmp, `c${i}.html`);
    fs.writeFileSync(f, pageHTML([t], topicArt(slug,i),i));
    const png = path.join(tmp, `${i + 1}.png`);
    const out = path.join(outDir, `${i + 1}.jpg`);
    try {
      execFileSync(CHROME, ["--headless", "--disable-gpu", "--hide-scrollbars",
        "--no-sandbox", `--user-data-dir=${path.join(tmp, `profile-${i}`)}`,
        `--screenshot=${png}`, "--window-size=1200,675", `file://${f}`],
        { stdio: "ignore", timeout: 60000 });
      execFileSync("/usr/bin/sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82",
        png, "--out", out], { stdio: "ignore" });
    } catch {
      // Chrome headless가 macOS 세션에서 SIGABRT를 내도 카드 생성 전체를 중단하지 않는다.
      // 동일한 SVG를 Quick Look+ffmpeg로 렌더링해 제목·개념 그림을 보존한다.
      const [a,b] = BG[i % BG.length];
      const lines = [];
      let line = "";
      for (const word of String(t).split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (next.length > 17 && line) { lines.push(line); line = word; }
        else line = next;
      }
      if (line) lines.push(line);
      const ts = lines.slice(0,2).map((x,j) => `<text x="64" y="${106+j*58}" font-family="Arial,sans-serif" font-size="46" font-weight="700" fill="#17181a">${esc(x)}</text>`).join("");
      const inner = topicArt(slug,i).replace(/^<svg[^>]*>/,"").replace(/<\/svg>$/,"");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/>${ts}<g transform="translate(110 180)">${inner}</g><text x="1080" y="630" text-anchor="end" font-family="Arial,sans-serif" font-size="20" font-weight="600" fill="#17181a" opacity=".14">${SITE}</text></svg>`;
      const base = path.join(tmp, `fallback-${i}`);
      fs.writeFileSync(`${base}.svg`, svg);
      const qlDir = fs.mkdtempSync(path.join(tmp, "ql-"));
      execFileSync("/usr/bin/qlmanage", ["-t", "-s", "1200", "-o", qlDir, `${base}.svg`], { stdio: "ignore" });
      const qlPng = fs.readdirSync(qlDir).find(x => x.endsWith(".png"));
      if (!qlPng) throw new Error(`Quick Look fallback 렌더 결과 없음: ${slug}/${i+1}`);
      execFileSync("/opt/homebrew/bin/ffmpeg", ["-loglevel", "error", "-y", "-i", path.join(qlDir, qlPng), "-vf", "crop=1200:1050:0:0,scale=1200:675", "-frames:v", "1", "-q:v", "2", out], { stdio: "ignore" });
    }
    made.push(out);
  });
  // 다음 빌드에서 다시 찍지 않게 남긴다
  fs.mkdirSync(cacheDir, { recursive: true });
  made.forEach(f => fs.copyFileSync(f, path.join(cacheDir, path.basename(f))));
  fs.writeFileSync(stamp, want);
  return made;
}

if (process.argv[1] && new URL(import.meta.url).pathname===process.argv[1] && process.argv[2] === "--demo") {
  const t = ["용량보다 수납 구조", "설치 전 확인할 것", "건조 방식이 만족도를 가른다",
             "우리 집에서 재야 할 다섯 곳", "12인용으로 시작해도 되는 집"];
  const m = makeCards("demo", t, "/tmp/carddemo");
  console.log(`카드 ${m.length}장 · ${m[0]}`);
}
