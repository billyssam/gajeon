// 섹션 카드 이미지 — 🔴 구글 1위(그돈이면)가 실제로 쓰는 방식 그대로다(2026-09-13 실측).
//    1200×675 · 왼쪽 위에 그 섹션 문구 한 줄 · 제품 이미지 한 장 · 배경색만 바꿔 재활용 · 연한 워터마크.
//    도면을 새로 발명하지 않는다. 상위가 하는 것을 그대로 한다.
// 🔴 글자는 이미지 생성이 아니라 HTML/CSS 조판이다 — 재현성 100%.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SITE = "가전 고르는 기준";
// 배경은 섹션마다 돌려 쓴다. 그돈이면도 같은 제품 사진에 배경만 바꿨다.
const BG = [
  ["#fffdf5", "#fdf0cf"], ["#fbfaff", "#e9e6fb"], ["#f7fbff", "#dceaf7"],
  ["#fffaf8", "#fbe3da"], ["#f8fdfa", "#daf0e4"], ["#fcfaff", "#efe4f7"],
];

function html(title, i, art) {
  const [a, b] = BG[i % BG.length];
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:675px;background:linear-gradient(135deg,${a} 0%,${b} 100%);
  font-family:"Apple SD Gothic Neo","Pretendard",-apple-system,sans-serif;position:relative;overflow:hidden}
h1{position:absolute;left:64px;top:56px;font-size:46px;font-weight:800;color:#17181a;
  letter-spacing:-.035em;line-height:1.25;word-break:keep-all;max-width:620px}
.art{position:absolute;left:110px;top:180px;width:290px;height:330px;
  display:flex;align-items:center;justify-content:center}
.wm{position:absolute;right:56px;bottom:44px;font-size:20px;font-weight:600;
  color:#17181a;opacity:.14;letter-spacing:-.02em}
</style></head><body><h1>${title}</h1><div class="art">${art}</div><div class="wm">${SITE}</div></body></html>`;
}

// 제품 이미지가 없을 때 쓰는 자리(승인 전). 쿠팡 승인이 나면 여기에 상품 이미지를 끼운다.
const placeholder = `<svg viewBox="0 0 290 330" width="290" height="330">
  <rect x="18" y="10" width="254" height="300" rx="6" fill="#fff" stroke="#c9ced6" stroke-width="2"/>
  <rect x="18" y="10" width="254" height="34" rx="6" fill="#2b2f36"/>
  <circle cx="248" cy="27" r="4" fill="#8a8f96"/>
  <rect x="34" y="60" width="222" height="234" rx="3" fill="#f4f6f8"/>
  <g stroke="#c9ced6" stroke-width="1.5">
    <line x1="34" y1="140" x2="256" y2="140"/><line x1="34" y1="218" x2="256" y2="218"/>
  </g>
  <g stroke="#dbe0e6" stroke-width="2">
    ${Array.from({length:7},(_,i)=>`<line x1="${52+i*30}" y1="228" x2="${52+i*30}" y2="284"/>`).join("")}
  </g>
  <rect x="18" y="310" width="254" height="12" rx="3" fill="#2b2f36"/>
</svg>`;

export function makeCards(slug, titles, outDir = `dist/img/${slug}`) {
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = fs.mkdtempSync("/tmp/cards-");
  const made = [];
  titles.forEach((t, i) => {
    const f = path.join(tmp, `c${i}.html`);
    fs.writeFileSync(f, html(t, i, placeholder));
    const out = path.join(outDir, `${i + 1}.png`);
    execFileSync(CHROME, ["--headless", "--disable-gpu", "--hide-scrollbars",
      `--screenshot=${out}`, "--window-size=1200,675", `file://${f}`], { stdio: "ignore" });
    made.push(out);
  });
  fs.rmSync(tmp, { recursive: true, force: true });
  return made;
}

if (process.argv[2] === "--demo") {
  const t = ["용량보다 수납 구조", "설치 전 확인할 것", "건조 방식이 만족도를 가른다",
             "우리 집에서 재야 할 다섯 곳", "12인용으로 시작해도 되는 집"];
  const m = makeCards("식기세척기-12인용-14인용", t, "samples/out/img");
  console.log(`카드 ${m.length}장 · ${m[0]}`);
}
