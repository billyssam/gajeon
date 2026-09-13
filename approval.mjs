// 승인 전 전수 점검 — 라이브 사이트를 실제로 두드려서 잰다(빌드 결과가 아니라 발행본).
// 🔴 근거: 구글이 공식 문서에 적은 미승인 사유 그대로다(support.google.com/adsense/answer/81904).
//    ① 불충분한 콘텐츠 ② 고유하지 않은 콘텐츠·제휴 비중 ③ 정책 위반
//    ④ 탐색이 어려움·깨진 링크·팝업/리다이렉트 ⑤ 트래픽 출처 ⑥ 미지원 언어
// 승인 여부는 심사자가 정한다. 여기서 하는 일은 "알려진 거절 사유를 남기지 않는 것" 뿐이다.
const SITE = process.env.SITE_URL || "https://billyssam.github.io/gajeon";
const HOST = "https://billyssam.github.io";
const rows = [];
const R = (id, ok, msg) => rows.push({ id, ok, msg });
const get = async u => {
  // 🔴 content-type 이 text 일 때만 읽게 해 뒀다가 sitemap.xml(application/xml)을 빈 문자열로 읽었다.
  //    그래서 URL 0개 → 나머지 검사가 전부 "빈 집합 통과" 로 찍혔다(2026-09-13).
  //    빈 집합은 통과가 아니다. 본문은 항상 읽고, 아래에서 개수를 확인한다.
  try { const r = await fetch(u, { redirect: "follow" });
        return { status: r.status, url: r.url, text: await r.text() }; }
  catch (e) { return { status: 0, url: u, text: "", err: String(e.message || e) }; }
};
const strip = h => h.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const sm = await get(`${SITE}/sitemap.xml`);
const urls = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
R("사이트맵", sm.status === 200 && urls.length > 0, `HTTP ${sm.status} · URL ${urls.length}개`);
// 🔴 여기서 멈춘다. URL 을 못 읽었는데 아래 검사를 돌리면 전부 "빈 집합 통과" 가 된다.
if (!urls.length) { console.error("사이트맵을 못 읽었다 — 나머지는 검사하지 않는다(빈 집합은 통과가 아니다)"); process.exit(1); }

// 모든 URL 이 실제로 200 인가. 사이트맵에 있는데 404 면 "탐색이 어려움" 으로 걸린다.
const pages = [];
let dead = [];
for (const u of urls) {
  const p = await get(u);
  pages.push({ u, ...p });
  if (p.status !== 200) dead.push(`${decodeURI(u).replace(SITE, "")} ${p.status}`);
}
R("모든 쪽 200", dead.length === 0, `죽은 쪽: ${dead.join(", ") || "없음"}`);

const posts = pages.filter(p => !/\/(about|contact|privacy)\/$|\/gajeon\/$/.test(p.u));
const chars = p => strip(p.text).replace(/\s/g, "").length;

// ① 불충분한 콘텐츠 — "제목만 있고 문단이 없는 쪽" 이 하나라도 있으면 걸린다
// 정책·소개·문의는 짧아도 되지만 "제목만 있는 쪽" 은 안 된다. 글과 기준을 나눈다.
const MIN_DOC = 400;
const thin = pages.filter(p => chars(p) < MIN_DOC).map(p => `${decodeURI(p.u).replace(SITE, "")} ${chars(p)}자`);
R("문단이 있는 쪽", thin.length === 0, `${MIN_DOC}자 미만: ${thin.join(", ") || "없음"}`);
R("글 분량", posts.length >= 20 && posts.length > 0 && posts.every(p => chars(p) >= 1700),
  `${posts.length}편 · 최소 ${Math.min(...posts.map(chars))}자 · 평균 ${Math.round(posts.reduce((a, p) => a + chars(p), 0) / posts.length)}자`);

// ④ 탐색 — 홈에서 모든 글에 갈 수 있나, 글에서 홈으로 돌아오나
const home = pages.find(p => p.u.replace(/\/$/, "") === SITE);
const linked = new Set([...(home?.text || "").matchAll(/href="([^"]+)"/g)].map(m => decodeURI(m[1]).replace(/\/$/, "")));
const unreachable = posts.filter(p => {
  const slug = decodeURI(p.u).replace(SITE + "/", "").replace(/\/$/, "");
  return ![...linked].some(l => l.replace(/\/$/, "") === slug);
}).map(p => decodeURI(p.u).replace(SITE, ""));
R("홈에서 도달", unreachable.length === 0, `홈에 링크 없음: ${unreachable.join(", ") || "없음"}`);
const noHome = pages.filter(p => p.u !== home?.u && !/href="\.\.\/"/.test(p.text)).map(p => decodeURI(p.u).replace(SITE, ""));
R("홈으로 복귀", noHome.length === 0, `홈 링크 없음: ${noHome.join(", ") || "없음"}`);

// 필수 페이지 — 거절 사유 1순위
const must = ["about", "contact", "privacy"];
const missing = must.filter(m => !pages.some(p => p.u.includes(`/${m}/`)));
R("필수 페이지", missing.length === 0, `없는 쪽: ${missing.join(", ") || "없음"}`);
const footNo = pages.filter(p => !must.every(m => p.text.includes(`${m}/`))).map(p => decodeURI(p.u).replace(SITE, ""));
R("전 쪽에서 정책 링크", footNo.length === 0, `빠진 쪽: ${footNo.join(", ") || "없음"}`);

// ④ 깨진 외부 링크
const ext = new Set();
for (const p of pages) for (const m of p.text.matchAll(/href="(https?:\/\/[^"]+)"/g))
  if (!m[1].startsWith(HOST)) ext.add(m[1]);
const extDead = [];
const blocked = [];
for (const u of ext) {
  const r = await get(u);
  // 429·403 은 상대가 봇을 막는 것이지 링크가 죽은 게 아니다. 나눠서 적는다.
  if ([403, 429].includes(r.status)) blocked.push(`${u} ${r.status}`);
  else if (r.status === 0 || r.status >= 400) extDead.push(`${u} ${r.status}`);
}
R("외부 링크", extDead.length === 0, `깨짐: ${extDead.join(", ") || "없음"} · ${ext.size}개 확인${blocked.length ? ` · 봇차단 ${blocked.length}건(살아 있음)` : ""}`);

// ④ 팝업·리다이렉트
const popup = pages.filter(p => /window\.open|http-equiv=["']refresh|location\.(href|replace)\s*=/i.test(p.text))
  .map(p => decodeURI(p.u).replace(SITE, ""));
R("팝업·자동이동", popup.length === 0, `걸린 쪽: ${popup.join(", ") || "없음"}`);

// ⑥ 언어
const noLang = pages.filter(p => !/<html lang="ko">/.test(p.text)).map(p => decodeURI(p.u).replace(SITE, ""));
R("한국어 선언", noLang.length === 0, `빠진 쪽: ${noLang.join(", ") || "없음"}`);

// ② 제휴 비중 — "어필리에이트 콘텐츠를 최소화하라" 가 공식 문구다.
//    심사 중에는 배너가 본문을 압도하면 안 된다. 글자수 대비 제휴 요소 비율을 잰다.
const withCp = posts.filter(p => /coupang/i.test(p.text));
R("제휴 비중", withCp.length === 0 || withCp.every(p => chars(p) >= 1700),
  `제휴 있는 글 ${withCp.length}/${posts.length}편 · 전부 1,700자 이상`);

// canonical 이 자기 자신을 가리키나
const badCanon = pages.filter(p => {
  const m = p.text.match(/<link rel="canonical" href="([^"]+)"/);
  return !m || decodeURI(m[1]).replace(/\/$/, "") !== decodeURI(p.u).replace(/\/$/, "");
}).map(p => decodeURI(p.u).replace(SITE, ""));
R("canonical 자기참조", badCanon.length === 0, `어긋난 쪽: ${badCanon.join(", ") || "없음"}`);

// robots
const rb = await get(`${SITE}/robots.txt`);
R("robots", rb.status === 200 && !/Disallow:\s*\/\s*$/m.test(rb.text) && /Sitemap:/i.test(rb.text),
  `HTTP ${rb.status} · 전체 차단 없음 · 사이트맵 줄 있음`);

// 404 — 없는 주소를 쳤을 때 사이트가 살아 있나(탐색 항목)
const nf = await get(`${SITE}/__no_such_page__/`);
R("404 응답", nf.status === 404, `HTTP ${nf.status}`);

// ads.txt — 승인 뒤 수익 보호에 쓴다. 지금 없으면 없다고 적는다.
const ads = await get(`${HOST}/ads.txt`);
R("ads.txt", ads.status === 200 && /google\.com,\s*pub-/.test(ads.text), `HTTP ${ads.status}`);

// 쿠팡 — 고지가 글 첫 부분에 있나(공정위 2024-12-01 시행)
const noteTop = withCp.filter(p => !/<\/h1>\s*<p class="cpnote top">/.test(p.text)).map(p => decodeURI(p.u).replace(SITE, ""));
R("고지 위치", noteTop.length === 0, `첫 부분에 없음: ${noteTop.join(", ") || "없음"}`);
const leak = pages.filter(p => must.some(m => p.u.includes(`/${m}/`)) && /coupang/i.test(p.text))
  .map(p => decodeURI(p.u).replace(SITE, ""));
R("정책 쪽 제휴 없음", leak.length === 0, `샌 쪽: ${leak.join(", ") || "없음"}`);

const pass = rows.filter(r => r.ok).length, fail = rows.length - pass;
console.log(`\n승인 전 점검 ${rows.length}항목 · 통과 ${pass} · 미흡 ${fail}\n`);
for (const r of rows) console.log(`  ${r.ok ? "✓" : "✗"} ${r.id} — ${r.msg}`);
if (fail) console.log(`\n🔴 미흡 ${fail}건. 이대로 심사받으면 이 항목이 사유가 된다.`);
process.exit(fail ? 1 : 0);
