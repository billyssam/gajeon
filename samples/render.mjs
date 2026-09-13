// 샘플을 실제 사이트와 같은 틀로 그린다. 🔴 라이브에는 안 올린다 — 승인 전이고, 다리는 예시다.
import fs from "node:fs";
import { SAMPLE as S } from "./dishwasher.mjs";
process.env.COUPANG_APPROVED = "1";
process.env.COUPANG_LINK_TEMPLATE = "https://link.coupang.com/re/AFFSDP?lptag=AF2403241&pageKey={q}";
// 🔴 2026-09-13: build.mjs 를 import 하면 그 자리에서 dist 를 통째로 다시 만든다.
//    승인 전인데 다리가 켜진 채로 dist 가 만들어져 A7 게이트가 잡았다(가습기·건조기·공기청정기·김치냉장고).
//    샘플은 dist 를 건드리면 안 된다 — 그린 뒤 반드시 깨끗하게 되돌린다.
const { page, esc } = await import("../build.mjs");
const { bridge } = await import("../shop.mjs");

const toc = S.toc.map(t => `<li>${esc(t)}</li>`).join("");
const rel = ["로봇청소기", "건조기", "인덕션", "전자레인지", "냉장고"]
  .map(s => `<a href="../${encodeURI(s)}/">${esc(s)} 고르는 기준</a>`).join("\n");
const body = `
<h1>${esc(S.title)}</h1>
<p class="lede">${esc(S.lede)}</p>
<p class="meta">2026년 기준 · 식기세척기 15개 검색어에서 추린 질문 · 직접 써 본 후기가 아니라 <b>고르는 기준</b>을 정리한 글입니다.</p>
<div class="toc"><b>이 글에서 다루는 것</b><ol>${toc}</ol></div>
${S.body}
${bridge("식기세척기", esc)}
<div class="rel"><b>같은 제품군의 기둥 글</b>
<a href="../식기세척기/">식기세척기 고르는 기준 5가지</a>
${rel}
</div>`;
const html = page({ title: S.title, desc: S.desc, body, up: "../", ad: true,
                    path: encodeURI(S.slug) + "/", crumb: "식기세척기 12인용·14인용" })
  // 표 스타일은 아직 본 사이트 CSS 에 없다 — 샘플에서만 얹어 본다.
  .replace("</style>", `
.spec{width:100%;border-collapse:collapse;margin:0 0 var(--s4);font-size:15px}
.spec th,.spec td{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left}
.spec thead th{font-size:13px;color:var(--ink3);font-weight:600}
.spec td:first-child{color:var(--ink2);width:34%}
.src{font-size:13px;color:var(--ink3);margin:-8px 0 var(--s4)}
main img{display:block;width:100%;height:auto;border-radius:8px;margin:var(--s3) 0 var(--s4)}
</style>`);
// 🔴 실제 사이트와 같은 구조로 낸다(글은 /<slug>/, 이미지는 /img/<slug>/).
//    안 그러면 상대경로가 달라져 샘플에서만 이미지가 깨진다 — 그러면 검증이 거짓말이 된다.
fs.mkdirSync(`samples/out/${S.slug}`, { recursive: true });
fs.writeFileSync(`samples/out/${S.slug}/index.html`, html);
// 카드 이미지 — 구글 1위가 쓰는 방식 그대로(문구 한 줄 + 제품 이미지 + 배경색)
const { makeCards } = await import("../cards.mjs");
makeCards(S.slug, ["용량보다 수납 구조","설치 형태가 먼저다","설치 전 확인할 것",
  "건조 방식이 만족도를 가른다","우리 집에서 재야 할 다섯 곳"], `samples/out/img/${S.slug}`);
const chars = body.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
// 이미지가 실제로 그 자리에 있는지 세어 본다. 없으면 실패다.
const need = 5, have = fs.existsSync(`samples/out/img/${S.slug}`)
  ? fs.readdirSync(`samples/out/img/${S.slug}`).filter(f => f.endsWith(".jpg")).length : 0;
if (have !== need) { console.error(`🔴 카드 ${need}장이어야 하는데 ${have}장이다`); process.exit(1); }
console.log(`샘플 ${chars}자 · 카드 ${have}장 · samples/out/${S.slug}/index.html`);

// dist 를 승인 전 상태로 되돌린다. 안 그러면 다음 배포가 제휴 링크를 싣고 나간다.
delete process.env.COUPANG_APPROVED;
delete process.env.COUPANG_LINK_TEMPLATE;
const { execFileSync } = await import("node:child_process");
execFileSync("/opt/homebrew/bin/node", ["build.mjs"], { cwd: process.cwd(), stdio: "ignore" });
const leak = fs.readdirSync("dist", { withFileTypes: true }).filter(d => d.isDirectory())
  .filter(d => fs.readFileSync(`dist/${d.name}/index.html`, "utf-8").includes("link.coupang.com"));
if (leak.length) { console.error(`🔴 dist 에 제휴 링크가 남았다: ${leak.map(d => d.name).join(", ")}`); process.exit(1); }
console.log("dist 는 승인 전 상태로 되돌렸다(제휴 링크 0개)");
