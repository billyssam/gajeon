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
    execFileSync(CHROME, ["--headless", "--disable-gpu", "--hide-scrollbars",
      `--screenshot=${png}`, "--window-size=1200,675", `file://${f}`],
      { stdio: "ignore", timeout: 60000 });
    execFileSync("/usr/bin/sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82",
      png, "--out", out], { stdio: "ignore" });
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
