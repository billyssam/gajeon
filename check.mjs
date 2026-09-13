// 배포 전 전수 검사. 🔴 하나라도 걸리면 exit 1 — 배포 자체가 안 된다(규정 E4).
//    "내가 검수해서 막는다" 는 언젠가 깜빡한다. 게이트가 막아야 한다.
// 🔴 검사는 규정 ID 로 붙는다. 규정(rules.mjs)에 gate:true 인데 검사가 없으면 그것도 실패다 —
//    "규정만 적어 두고 안 막는" 상태를 코드가 금지한다.
import fs from "node:fs";
import path from "node:path";
import { RULES, 각인 } from "./rules.mjs";
import { ready as shopReady } from "./shop.mjs";

각인("배포 전 검사");

const OUT = "dist";
const AD = "ca-pub-8092073462948926";
const CP = "AF2403241";
const CP_NOTE = "쿠팡 파트너스 활동의 일환";
const MUST = ["privacy", "contact", "about"];
const MIN_CHARS = 1700, MAX_DUP = 15, MAX_DENSITY = 6, MAX_ONE_TITLE = 60;

const strip = h => h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "")
                    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const list = a => a.length ? a.slice(0, 4).join(", ") : "없음";

if (!fs.existsSync(OUT)) { console.error("dist 가 없다 — build 부터"); process.exit(1); }
// 🔴 img 는 카드 이미지 폴더지 글이 아니다. 안 빼면 dist/img/index.html 을 열려다 죽는다.
const SKIP = new Set(["img"]);
const dirs = fs.readdirSync(OUT, { withFileTypes: true })
  .filter(d => d.isDirectory() && !SKIP.has(d.name)).map(d => d.name);
const posts = dirs.filter(d => !MUST.includes(d));
const html = d => fs.readFileSync(path.join(OUT, d, "index.html"), "utf-8");
const home = fs.readFileSync(path.join(OUT, "index.html"), "utf-8");
const title = h => (h.match(/<title>([\s\S]*?)<\/title>/) || [, ""])[1];
const chars = d => strip(html(d)).replace(/\s/g, "").length;

const done = new Map();                       // 규정 ID → {ok, msg}
const R = (id, ok, msg) => done.set(id, { ok, msg });

// ── A. 쿠팡 파트너스 · 공정거래위원회 ─────────────────────────────
// A1 고지를 제목 또는 첫 부분에. 🔴 맨 아래에만 두면 위반이다(2024-12-01 시행).
{
  const bad = posts.filter(d => !/<\/h1>\s*<p class="cpnote top">[^<]*쿠팡 파트너스 활동의 일환/.test(html(d)));
  R("A1", bad.length === 0, `고지가 글 첫 부분에(빠진 곳: ${list(bad)})`);
}
// A2 조건부·불확정 표현 금지
{
  const bad = posts.filter(d => /수수료를?\s*(지급)?받을\s*수\s*(도\s*)?있/.test(strip(html(d))));
  R("A2", bad.length === 0, `고지에 '받을 수 있음' 류 불확정 표현 없음(걸린 곳: ${list(bad)})`);
}
// A3 배너가 있는 모든 페이지에 고지
{
  const bad = [...dirs, "(홈)"].filter(d => {
    const h = d === "(홈)" ? home : html(d);
    return h.includes(CP) && !h.includes(CP_NOTE);
  });
  R("A3", bad.length === 0, `배너에 고지 문구(누락: ${list(bad)})`);
}
// A4 정책 페이지에 배너 금지
{
  const leak = MUST.filter(m => dirs.includes(m) && html(m).includes(CP));
  R("A4", leak.length === 0, `정책 페이지에 제휴 배너 없음(샌 곳: ${list(leak)})`);
}
// A5 자동 이동·클릭 유도 금지
{
  const bad = [...dirs, "(홈)"].filter(d => {
    const h = d === "(홈)" ? home : html(d);
    return /http-equiv=["']refresh|location\.(href|replace)\s*=|window\.open\s*\(/i.test(h)
        || /광고를?\s*클릭|여기를?\s*눌러\s*주세요/.test(strip(h));
  });
  R("A5", bad.length === 0, `자동 이동·클릭 유도 없음(걸린 곳: ${list(bad)})`);
}
// A6 가격·순위를 글에 박지 않는다
{
  const bad = posts.filter(d => /\d{1,3}(,\d{3})+\s*원|\d+\s*만\s*원|₩\s*\d|\d+\s*위\b/.test(strip(html(d))));
  R("A6", bad.length === 0, `가격·순위 표기 없음(걸린 곳: ${list(bad)})`);
}

// A7 승인 전에는 제휴 링크를 내보내지 않는다. 🔴 승인이 나면 반대로 전 편에 다리가 있어야 한다 —
//    스위치를 켰는데 조용히 아무 데도 안 붙는 상태를 "통과" 로 두지 않는다.
{
  const 다리 = posts.filter(d => /class="shop"/.test(html(d)));
  const 링크샘 = posts.filter(d => /link\.coupang\.com/.test(html(d)));
  if (shopReady()) R("A7", 다리.length === posts.length,
    `승인됨 — 전 편에 전환 다리(빠진 곳: ${list(posts.filter(d => !/class="shop"/.test(html(d))))})`);
  else R("A7", 다리.length === 0 && 링크샘.length === 0,
    `승인 전 — 제휴 링크 0개(샌 곳: ${list([...new Set([...다리, ...링크샘])])})`);
}

// ── B. 구글 애드센스 ─────────────────────────────────────────────
R("B1", MUST.every(m => dirs.includes(m)), `필수 페이지 ${MUST.join("·")}(빠진 곳: ${list(MUST.filter(m => !dirs.includes(m)))})`);
// B2 광고를 메뉴·내비게이션으로 오인하게 두지 않는다
{
  const bad = [...dirs, "(홈)"].filter(d => {
    const h = d === "(홈)" ? home : html(d);
    const nav = [...h.matchAll(/<(nav|footer)[\s\S]*?<\/\1>/g)].map(m => m[0]).join("");
    return nav.includes(AD) || nav.includes(CP);
  });
  R("B2", bad.length === 0, `메뉴·바닥글 안에 광고 없음(걸린 곳: ${list(bad)})`);
}
// B3 얇은 페이지에 광고를 넣지 않는다
{
  const bad = posts.filter(d => html(d).includes(CP) && chars(d) < MIN_CHARS);
  R("B3", bad.length === 0, `${MIN_CHARS}자 미만 글에 제휴 배너 없음(걸린 곳: ${list(bad)})`);
}
// B6 광고 슬롯은 **글 페이지에만**. 정책·문의·소개·홈에는 안 들어간다
//    🔴 2026-09-13 대표: "승인 전까지 모든걸 다 세팅해놔. 승인 시 해야하는것만 입히면 될 수 있게."
//       승인 뒤 build.mjs 의 ADS_SLOTS 에 ID 만 채우면 전 편에 광고가 들어간다.
//       그때 **정책 페이지에 새지 않는지**를 사람이 눈으로 확인하게 두면 안 된다 — 여기서 막는다.
//       (승인 전에는 슬롯이 비어 있어 어디에도 안 나간다. 그것도 같이 검사한다.)
{
  const SLOT = 'data-ad-slot="';
  // 정책·문의·소개(MUST) + 홈 — 여기에 슬롯이 있으면 안 된다
  const 샌곳 = MUST.filter(d => html(d).includes(SLOT));
  if (home.includes(SLOT)) 샌곳.push("홈");
  R("B6", 샌곳.length === 0, `광고 슬롯이 글 페이지 밖으로 새지 않음(샌 곳: ${list(샌곳)})`);
}
// B7 광고가 붙는 글은 최소 분량을 넘겨야 한다(규정 B3 의 슬롯판)
{
  const bad = posts.filter(d => html(d).includes('data-ad-slot="') && chars(d) < MIN_CHARS);
  R("B7", bad.length === 0, `${MIN_CHARS}자 미만 글에 광고 슬롯 없음(걸린 곳: ${list(bad)})`);
}
// B4 제목이 약속한 것을 본문이 준다.
//    🔴 이 사이트는 제품을 추천하지 않는다(기준만 쓴다). 그러니 제목이 추천·순위·최저가를
//       약속하면 본문이 그걸 줄 수 없다 — 2026-09-13 까지 20편 전부 "추천 5가지" 였다.
{
  const PROMISE = /추천\s*\d|\d\s*가지\s*추천|BEST|베스트\s*\d|순위\s*\d|랭킹|최저가|가격\s*비교/i;
  const bad = [...posts.map(d => [d, title(html(d))]), ["(홈)", title(home)]]
    .filter(([, t]) => PROMISE.test(t)).map(([d]) => d);
  R("B4", bad.length === 0, `제목이 본문에 없는 것을 약속하지 않음(걸린 곳: ${list(bad)})`);
}

// ── C. 구글 검색 스팸정책 ────────────────────────────────────────
// C1 얇은 제휴 — 같은 틀을 찍어내지 않는다
{
  const pats = posts.map(d => title(html(d)).replace(/^[^ ,]+/, "<X>"));
  const cnt = new Map();
  for (const p of pats) cnt.set(p, (cnt.get(p) || 0) + 1);
  const top = Math.max(...cnt.values()), pct = Math.round(top / posts.length * 100);
  R("C1", cnt.size >= 3 && pct <= MAX_ONE_TITLE, `제목 틀 ${cnt.size}종 · 최다 ${pct}% (상한 ${MAX_ONE_TITLE}%)`);
}
// C2 대량 생성 — 편마다 자기만의 문장이 절반은 넘어야 한다
{
  const sents = d => new Set(strip(html(d)).split(/(?<=다\.)\s+/).map(x => x.trim()).filter(x => x.length > 15));
  const all = new Map();
  const per = posts.map(d => [d, sents(d)]);
  for (const [, S] of per) for (const s of S) all.set(s, (all.get(s) || 0) + 1);
  const bad = per.filter(([, S]) => [...S].filter(s => all.get(s) === 1).length / S.size < 0.5).map(([d]) => d);
  R("C2", bad.length === 0, `편마다 고유 문장 절반 이상(미달: ${list(bad)})`);
}
// C3 키워드 스터핑
{
  const bad = posts.map(d => {
    const t = strip(html(d)), n = t.replace(/\s/g, "").length;
    const c = t.split(d).length - 1;
    return [d, Math.round(c * d.length / n * 1000) / 10];
  }).filter(([, p]) => p > MAX_DENSITY);
  R("C3", bad.length === 0, `씨드 밀도 ${MAX_DENSITY}% 이하(넘은 곳: ${list(bad.map(([d, p]) => `${d} ${p}%`))})`);
}
// C4 편 간 중복
{
  const cnt = new Map();
  for (const d of posts)
    for (const s of new Set(strip(html(d)).split(/(?<=다\.)\s+/).map(x => x.trim()).filter(x => x.length > 15)))
      cnt.set(s, (cnt.get(s) || 0) + 1);
  const dup = [...cnt].filter(([, n]) => n >= posts.length * 0.8);
  const dupChars = dup.reduce((a, [s]) => a + s.replace(/\s/g, "").length, 0);
  const avg = posts.reduce((a, d) => a + chars(d), 0) / posts.length;
  const pct = Math.round(dupChars / avg * 100);
  R("C4", pct <= MAX_DUP, `편 간 중복 ${pct}% (상한 ${MAX_DUP}%)`);
}

// ── E. 이 프로젝트의 원칙 ────────────────────────────────────────
// E1 브랜드·제품명을 쓰지 않는다
{
  const BRAND = /LG|엘지|삼성|위니아|딤채|쿠쿠|쿠첸|로보락|로보락|샤오미|다이슨|코웨이|청호|위닉스|한일|휴롬|드롱기|네스프레소|일리|비스포크|디오스|그랑데|오브제|스마트싱스/i;
  const bad = posts.filter(d => BRAND.test(strip(html(d))));
  R("E1", bad.length === 0, `브랜드·제품명 없음(걸린 곳: ${list(bad)})`);
}
// E2 잰 것만 말한다 — 써 보지 않았으면 써 봤다고 하지 않는다
{
  const CLAIM = /직접\s*(써|사용|테스트)\s*(보|해)|사용해\s*본\s*결과|테스트\s*결과|실제로\s*써\s*보니/;
  const bad = posts.filter(d => {
    const t = strip(html(d));
    // 🔴 고지 문장 자체가 "직접 써 본 후기가 아니라" 라서, 빼고 나서 검사한다.
    const 고지뺀본문 = t.replace(/직접\s*써\s*(본|보고\s*쓴)\s*후기가\s*아니라/g, "");
    return CLAIM.test(고지뺀본문) || !t.includes("후기가 아니라");
  });
  R("E2", bad.length === 0, `체험 주장 없음 + '후기가 아니라' 고지 있음(걸린 곳: ${list(bad)})`);
}
// E3 빈 것이 깨진 것보다 낫다 — 깨진 조사·겹치는 답을 발행하지 않는다
{
  const broken = [], dups = [], josaBad = [];
  // 받침으로 조사를 계산해 본다. 씨드 뒤에 틀린 조사가 붙으면 "인덕션를" 같은 말이 나간다.
  const 받침 = w => { const c = w.trim().slice(-1).charCodeAt(0);
    return (c < 0xAC00 || c > 0xD7A3) ? null : (c - 0xAC00) % 28 !== 0; };
  // 🔴 조사는 이것만이 아니다. "에어컨라도" 가 6편 나갔다(2026-09-13 정독에서 발견) —
  //    검사에 없던 조사였다. 새 조사를 쓰면 여기에도 같이 넣어라.
  const 짝 = { "을": true, "를": false, "은": true, "는": false, "이": true, "가": false,
               "과": true, "와": false, "으로": true, "로": false,
               "이라도": true, "라도": false, "이나": true, "나": false,
               "이랑": true, "랑": false, "이라는": true, "라는": false };
  for (const d of posts) {
    const h = html(d);
    if (/을\(를\)|이\(가\)|은\(는\)|와\(과\)|로\(으로\)/.test(strip(h))) broken.push(d);
    const j = 받침(d);
    if (j !== null) {
      const t = strip(h);
      for (const m of t.matchAll(new RegExp(`${d}(이라도|이라는|이랑|이나|라도|라는|으로|을|를|은|는|이|가|과|와|랑|나|로)(?![가-힣])`, "g")))
        if (짝[m[1]] !== j) { josaBad.push(`${d}${m[1]}`); break; }
    }
    const f = h.match(/<div class="faq">([\s\S]*?)<\/div>/);
    if (f) {
      const ans = [...f[1].matchAll(/<h3>[\s\S]*?<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map(m => m[1].trim());
      if (new Set(ans).size !== ans.length) dups.push(d);
    }
  }
  R("E3", broken.length === 0 && dups.length === 0 && josaBad.length === 0,
    `조사 깨짐 없음(괄호: ${list(broken)} · 받침: ${list(josaBad)}) · FAQ 답 중복 없음(${list(dups)})`);
}
// E4 우회 경로가 없다 — 배포 스크립트가 이 검사를 부르고, 실패하면 멈춰야 한다
{
  const sh = fs.existsSync("deploy-pages.sh") ? fs.readFileSync("deploy-pages.sh", "utf-8") : "";
  R("E4", /check\.mjs/.test(sh) && /검사 실패[\s\S]*exit 1/.test(sh), "배포 스크립트가 검사 실패 시 멈춤");
}
// E6 워커는 자기 저장소에서만 돈다
{
  const w = fs.existsSync("watch.mjs") ? fs.readFileSync("watch.mjs", "utf-8") : "";
  R("E6", /MUST_REMOTE/.test(w) && /process\.exit\(1\)/.test(w), "워커에 저장소 가드 있음");
}

// E7 머리말. 🔴 doctype 이 없으면 브라우저가 쿼크 모드로 그린다 — 조판이 조용히 틀어진다.
{
  const bad = [];
  for (const d of [...dirs, "(홈)"]) {
    const h = d === "(홈)" ? home : html(d);
    const miss = [];
    if (!/^<!doctype html>/i.test(h.trim())) miss.push("doctype");
    if (!/<html lang="ko">/.test(h)) miss.push("lang");
    if (!/<link rel="canonical" href="https?:\/\/[^"]+">/.test(h)) miss.push("canonical");
    if (!/application\/ld\+json/.test(h)) miss.push("구조화");
    if (!/<meta property="og:title"/.test(h)) miss.push("og");
    if (miss.length) bad.push(`${d}(${miss.join("·")})`);
  }
  R("E7", bad.length === 0, `머리말 전수(빠진 곳: ${list(bad)})`);
}

// E8 이미지. 🔴 상위 글은 본문 이미지가 1~17장인데 우리는 0장이었다.
//    파일이 실제로 있는지까지 본다 — 태그만 있고 파일이 없으면 깨진 그림이다.
{
  const bad = [];
  for (const d of posts) {
    const h = html(d);
    const tags = [...h.matchAll(/<img[^>]+>/g)].map(m => m[0]);
    const miss = [];
    if (tags.length < 3) miss.push(`${tags.length}장`);
    for (const t of tags) {
      const src = (t.match(/src="([^"]+)"/) || [])[1] || "";
      const alt = (t.match(/alt="([^"]*)"/) || [])[1] || "";
      if (!alt.trim()) miss.push("alt 빔");
      const f = path.join(OUT, decodeURIComponent(src.replace(/^\.\.\//, "")));
      if (src && !fs.existsSync(f)) miss.push(`파일 없음 ${src}`);
    }
    if (miss.length) bad.push(`${d}(${[...new Set(miss)].join("·")})`);
  }
  R("E8", bad.length === 0, `글마다 카드 3장 이상 + alt + 파일 존재(걸린 곳: ${list(bad)})`);
}

// ── 규정과 검사가 어긋나지 않는지 ────────────────────────────────
{
  const md = fs.existsSync("RULES.md") ? fs.readFileSync("RULES.md", "utf-8") : "";
  const mdIds = new Set([...md.matchAll(/^\|\s*\*?\*?([A-E]\d)\*?\*?\s*\|/gm)].map(m => m[1]));
  const jsIds = new Set(RULES.map(r => r.id));
  const 빠짐 = [...jsIds].filter(x => !mdIds.has(x)), 남음 = [...mdIds].filter(x => !jsIds.has(x));
  R("정본", 빠짐.length === 0 && 남음.length === 0,
    `RULES.md 와 rules.mjs 가 같음(md에 없음: ${list(빠짐)} · md에만: ${list(남음)})`);
  const 무검사 = RULES.filter(r => r.gate && !done.has(r.id)).map(r => r.id);
  R("구현", 무검사.length === 0, `gate:true 인 규정에 검사가 다 있음(없는 것: ${list(무검사)})`);
}

// ── 결과 ─────────────────────────────────────────────────────────
const rows = [...done].map(([id, v]) => ({ id, t: `${id} ${v.msg}`, ok: v.ok }));
const passed = rows.filter(r => r.ok).length, failed = rows.length - passed;
fs.writeFileSync(path.join(OUT, "check.json"), JSON.stringify({
  checked_at: new Date().toISOString(), rules: RULES.length,
  total: rows.length, passed, failed, items: rows,
}, null, 1) + "\n");

console.log(`검사 ${rows.length}항목 · 통과 ${passed} · 실패 ${failed}`);
for (const r of rows) (r.ok ? console.log(`  ✓ ${r.t}`) : console.error(`  ✗ ${r.t}`));
if (failed) { console.error("\n규정을 어긴다. 배포를 멈춘다."); process.exit(1); }
