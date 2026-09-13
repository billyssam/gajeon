import fs from "node:fs";
import path from "node:path";
import { makeTitle, slugify, groupBySeed, YEAR } from "./writer.mjs";
import { buildPost } from "./post.mjs";
import { SPECS } from "./specs.mjs";
import { DETAIL } from "./detail.mjs";
import { PAGES } from "./pages.mjs";
import { 각인 } from "./rules.mjs";

각인("빌드 시작");

const OUT = "dist", DATA = "data";
const SITE = "가전 고르는 기준";
const TAGLINE = "사기 전에 무엇을 봐야 하는지부터 정리합니다";
const SITE_URL = process.env.SITE_URL || "https://billyssam.github.io/gajeon";

const TODAY = new Date().toISOString().slice(0, 10);
// 🔴 첫 발행일은 한 번 정해지면 안 바뀐다. 없던 주소만 오늘로 찍고 파일에 남긴다.
const PUBFILE = path.join(DATA, "published.json");
const PUBDATE = fs.existsSync(PUBFILE) ? JSON.parse(fs.readFileSync(PUBFILE, "utf-8")) : {};

export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
export const n = x => (x==null||isNaN(x)) ? "—" : Number(x).toLocaleString("ko-KR");

// 🔴 한국 독자는 대부분 폰으로 본다. 본문 폭·글자 크기를 거기 맞춘다.
//    값의 종류를 적게 유지한다 — 간격 6종, 크기 6종.
const CSS = `
:root{
  --bg:#fff; --ink:#17181a; --ink2:#54585e; --ink3:#8a8f96;
  --line:#e6e8ea; --band:#f6f7f8; --accent:#1a56db;
  --s1:4px; --s2:8px; --s3:16px; --s4:24px; --s5:40px; --s6:64px;
  --sans:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard",
         "Malgun Gothic",system-ui,sans-serif;
}
*{box-sizing:border-box}
html,body{overflow-x:hidden}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
  font-size:17px;line-height:1.75;word-break:keep-all;-webkit-text-size-adjust:100%}
.wrap{max-width:720px;margin:0 auto;padding:0 var(--s3)}
header{border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:baseline;gap:var(--s2);padding:var(--s3) var(--s3)}
header b{font-size:17px;font-weight:700;letter-spacing:-.02em}
header span{font-size:13px;color:var(--ink3)}
header a{color:inherit;text-decoration:none}
main{padding:var(--s5) 0 var(--s6)}
h1{font-size:28px;font-weight:800;line-height:1.35;letter-spacing:-.03em;margin:0 0 var(--s3)}
h2{font-size:21px;font-weight:700;line-height:1.4;letter-spacing:-.02em;
  margin:var(--s5) 0 var(--s3);padding-top:var(--s3);border-top:1px solid var(--line)}
h3{font-size:17px;font-weight:700;margin:var(--s4) 0 var(--s2)}
p{margin:0 0 var(--s3)}
.lede{font-size:19px;color:var(--ink2);margin-bottom:var(--s4)}
.meta{font-size:13px;color:var(--ink3);margin-bottom:var(--s4)}
ul,ol{margin:0 0 var(--s3);padding-left:1.25em}
li{margin-bottom:var(--s2)}
.toc{background:var(--band);border-radius:8px;padding:var(--s3);margin:0 0 var(--s4)}
.toc b{display:block;font-size:14px;margin-bottom:var(--s2)}
.toc ol{margin:0;padding-left:1.2em;font-size:15px}
.faq{border-top:1px solid var(--line);padding-top:var(--s3);margin-top:var(--s2)}
.faq h3{margin-top:0;font-size:16px}
.faq p{color:var(--ink2);font-size:16px}
/* 🔴 쿠팡 배너는 680px 고정 iframe 이다. 폰(375px)에서 그대로 두면
   페이지 전체가 696px 로 가로 스크롤된다(실측). 배너만 제 칸 안에서 밀리게 가둔다. */
.cp{margin-top:var(--s5);padding-top:var(--s3);border-top:1px solid var(--line);
  overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}
.cp iframe{display:block}
.cpnote.top{font-size:13px;color:var(--ink2);background:var(--band);
  border-radius:6px;padding:var(--s2) var(--s3);margin:0 0 var(--s4)}
.cpnote{font-size:12px;color:var(--ink3);margin:var(--s2) 0 0;line-height:1.6;
  position:sticky;left:0}
/* 전환 다리 — 기준을 다 읽은 사람이 목록으로 가는 자리. 승인 전에는 아예 안 그려진다. */
.shop{border:1px solid var(--line);border-radius:8px;padding:var(--s3);margin:var(--s4) 0 0}
.shop b{display:block;font-size:14px;margin-bottom:var(--s2)}
.shop a{display:inline-block;margin:0 var(--s2) var(--s2) 0;padding:6px var(--s3);
  border:1px solid var(--line);border-radius:999px;font-size:14px}
.shop p{margin:var(--s1) 0 0;font-size:12px;color:var(--ink3)}
.rel{background:var(--band);border-radius:8px;padding:var(--s3);margin-top:var(--s5)}
.rel b{display:block;font-size:14px;margin-bottom:var(--s2)}
.rel a{display:block;padding:var(--s1) 0;font-size:15px}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.why{border-left:2px solid var(--line);padding-left:var(--s3);
  font-size:15px;color:var(--ink2);margin:0 0 var(--s4)}
.note{background:var(--band);border-left:3px solid var(--ink3);padding:var(--s3);
  font-size:15px;color:var(--ink2);margin:0 0 var(--s3)}
.fnav{display:flex;flex-wrap:wrap;gap:var(--s3);margin-bottom:var(--s2)}
.fnav a{font-size:13px}
.contact{font-size:18px;font-weight:700;margin:var(--s2) 0 var(--s4)}
footer{border-top:1px solid var(--line);padding:var(--s4) 0 var(--s6);
  font-size:13px;color:var(--ink3)}
@media(max-width:640px){body{font-size:16px}h1{font-size:24px}h2{font-size:19px}.lede{font-size:17px}}
`;

// 애드센스 심사·게재 코드. 🔴 화면으로 읽지 않고 복사 버튼 → 클립보드로 받은 값이다(2026-09-13).
//    심사는 이 스크립트가 사이트에 실제로 있어야 시작된다.
// 쿠팡 파트너스 다이나믹 배너(카테고리 베스트 · 가전디지털). 복사 버튼으로 받은 값이다.
// 🔴 이 배너를 넣는 글에는 **경제적 이해관계 표시가 법으로 의무**다(표시광고법).
//    쿠팡 화면 문구 그대로: "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
//    문구 없이 배너만 달면 수익금 지급이 중단될 수 있다고 쿠팡이 명시한다.
const CP_ID = 1028910, CP_TRACK = "AF2403241";
// 🔴 규정 A1 — 공정위 추천·보증 심사지침(2024-12-01 시행)은 블로그 등 문자 중심 매체에서
//    표시문구를 "반드시 게시물의 제목 또는 첫 부분에" 게재하도록 한다. 끝에만 두면 안 된다.
//    2026-09-13 까지 20편 전부 맨 아래에만 있었다 — 위반이었다.
// 🔴 규정 A2 — "받을 수 있음" 같은 조건부·불확정 표현은 불명확 표시로 본다. 확정형으로 쓴다.
export const CP_NOTE = "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";
const COUPANG = `<div class="cp"><script src="https://ads-partners.coupang.com/g.js"><\/script>
<script>new PartnersCoupang.G({"id":${CP_ID},"template":"carousel","trackingCode":"${CP_TRACK}","width":"680","height":"140","tsource":""});<\/script>
<p class="cpnote">${CP_NOTE}</p></div>`;

const ADS_CLIENT = "ca-pub-8092073462948926";
const ADS = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}" crossorigin="anonymous"></script>`;

// 🔴🔴 2026-09-13 대표: "승인 전까지 모든걸 다 세팅해놔. 승인 시 해야하는것만 입히면
//    될 수 있게 구성하면 되잖아."
//    승인이 나면 애드센스에서 **광고 단위**를 만들고 슬롯 ID 를 받는다.
//    그때 아래 두 줄에 ID 만 채우면 전 편에 광고가 들어간다 — 코드는 더 안 고친다.
//    비어 있으면 아무것도 내보내지 않는다. 빈 광고 자리는 규정 B3(얇은 페이지) 위반이고
//    보기에도 흉하다. "미구현은 성공을 흉내내지 않는다".
export const ADS_SLOTS = {
  본문중간: "",   // ← 승인 뒤 여기에 슬롯 ID (예: "1234567890")
  글끝: "",       // ←
};

// 🔴 방문 측정. 2026-09-13 실측: **아무것도 안 붙어 있었다** — 그래서 화면이 "7일 방문 미측정" 이었다.
//    승인 뒤에 붙이면 그때부터 0 에서 시작한다. **승인 전부터 쌓여 있어야** 승인 직후
//    "어느 글이 먹히는지" 를 보고 다음 글을 정할 수 있다. 그게 이 사이트의 목적이다.
//    측정 ID 한 줄만 채우면 전 쪽에 들어간다. 비어 있으면 아무것도 안 나간다.
export const GA_ID = "";   // ← analytics.google.com 에서 받은 "G-XXXXXXXXXX"
const GA = GA_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>`
  + `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}`
  + `gtag('js',new Date());gtag('config','${GA_ID}');</script>` : "";

// 규정 B2 — 메뉴·내비게이션으로 오인하게 두지 않는다. 본문 안·글 끝만 쓴다.
// 규정 B3 — 개인정보처리방침·문의·소개에는 넣지 않는다(글 페이지에서만 부른다).
export function 광고자리(자리) {
  const id = ADS_SLOTS[자리];
  if (!id) return "";
  return `\n<div class="adbox"><span class="adlab">광고</span>`
    + `<ins class="adsbygoogle" style="display:block" data-ad-client="${ADS_CLIENT}"`
    + ` data-ad-slot="${id}" data-ad-format="auto" data-full-width-responsive="true"></ins>`
    + `<script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>\n`;
}

// 🔴 2026-09-13 실측: 발행된 24쪽 전부 doctype 이 없어 브라우저가 **쿼크 모드**로 그렸다
//    (document.compatMode === "BackCompat"). 박스 모델과 상속 규칙이 달라져 조판이 조용히 틀어진다.
//    lang·canonical·og 도 없었다 — 한국어인지, 정본 주소가 뭔지 검색엔진이 알 길이 없었다.
// 🔴 FAQPage 구조화 데이터는 넣지 않는다. 구글이 2026-06 에 FAQ 리치결과를 없앴다(문서에서 삭제).
//    안 나오는 걸 넣고 "리치결과 준비" 라고 적으면 그건 거짓말이다.
//    지금도 검색 결과에 실제로 나오는 것은 BreadcrumbList 다 — 그것과 Article 만 넣는다.
export function page({ title, desc, body, up = "", ad = false, path = "", crumb = "" }) {
  const url = `${SITE_URL}/${path}`;
  const first = PUBDATE[path] || TODAY;
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement:
      [{ "@type": "ListItem", position: 1, name: SITE, item: `${SITE_URL}/` }]
        .concat(crumb ? [{ "@type": "ListItem", position: 2, name: crumb, item: url }] : []) },
  ];
  if (crumb) ld.push({ "@context": "https://schema.org", "@type": "Article",
    headline: title, description: desc, inLanguage: "ko-KR",
    datePublished: first, dateModified: TODAY, mainEntityOfPage: url,
    author: { "@type": "Organization", name: SITE }, publisher: { "@type": "Organization", name: SITE } });

  // 규정 A1 — 제휴가 붙는 글은 첫 부분에 고지가 있어야 한다. 여기 한 자리에서 꽂는다.
  if (ad) {
    const i = body.indexOf("</h1>");
    if (i < 0) throw new Error("h1 이 없어 고지를 첫 부분에 넣을 수 없다 — 규정 A1");
    body = body.slice(0, i + 5) + `\n<p class="cpnote top">${CP_NOTE}</p>` + body.slice(i + 5);
  }
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="description" content="${esc(desc)}">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="canonical" href="${esc(url)}">
<title>${esc(title)}</title>
<meta property="og:type" content="${crumb ? "article" : "website"}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:site_name" content="${esc(SITE)}">
<meta property="og:locale" content="ko_KR">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${ADS}${GA}
<style>${CSS}</style>
</head>
<body>
<header><div class="wrap"><b><a href="${up || "./"}">${SITE}</a></b><span>${TAGLINE}</span></div></header>
<main><div class="wrap">${body}${ad ? COUPANG : ""}</div></main>
<footer><div class="wrap">
<nav class="fnav"><a href="${up || "./"}">홈</a><a href="${up}about/">소개</a><a href="${up}contact/">문의</a><a href="${up}privacy/">개인정보처리방침</a></nav>
<p>${SITE} · 이 글은 제품을 직접 써 보고 쓴 후기가 아니라, 고르는 기준을 정리한 글입니다.</p>
</div></footer>
</body>
</html>`;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const kwFiles = fs.readdirSync(DATA).filter(f => /^keywords-/.test(f)).sort();
if (!kwFiles.length) { console.error("키워드 파일이 없다 — keywords.mjs 를 먼저 돌려라"); process.exit(1); }
const kw = JSON.parse(fs.readFileSync(path.join(DATA, kwFiles.at(-1)), "utf-8"));
// 🔴 씨드 수확과 발행을 분리한다. 키워드는 27개 제품군을 모으지만,
//    글은 SPECS·DETAIL 이 둘 다 준비된 것만 나간다 — 준비 안 된 씨드가 빈 글을 만들지 않게.
const groups = groupBySeed(kw.rows).filter(g => SPECS[g.seed] && DETAIL[g.seed]);
const skipped = groupBySeed(kw.rows).filter(g => !(SPECS[g.seed] && DETAIL[g.seed]));
if (skipped.length) console.log(`대기 중인 제품군 ${skipped.length}: ${skipped.map(g => g.seed).join(" ")}`);

// 🔴 제목 틀을 넷으로 돌린다(규정 C1 — 같은 틀을 찍어내지 않는다).
//    순서를 고정해 두면 매 빌드마다 같은 제목이 나온다(주소·제목이 흔들리면 색인이 손해다).
groups.forEach((g, i) => { g.variant = i % 4; });

const posts = [];
for (const g of groups) {
  const post = buildPost(g, groups, { esc, n, makeTitle, slugify, YEAR, 광고자리 });
  const dir = path.join(OUT, slugify(g.seed));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"),
    page({ title: post.title, desc: post.desc, body: post.body, up: "../", ad: true,
           path: encodeURI(slugify(g.seed)) + "/", crumb: g.seed }));
  posts.push({ ...post, slug: slugify(g.seed), seed: g.seed });
}

const list = posts.map(p => `<li><a href="${encodeURI(p.slug)}/">${esc(p.title)}</a></li>`).join("\n");
fs.writeFileSync(path.join(OUT, "index.html"), page({
  title: `${SITE} — ${YEAR}년 가전 고르는 기준 정리`,
  desc: `로봇청소기·건조기·공기청정기 등 ${posts.length}종을 고를 때 무엇을 봐야 하는지 기준부터 정리했습니다.`,
  body: `<h1>${SITE}</h1>
<p class="lede">가전을 살 때 제일 어려운 건 "뭐가 좋은가"가 아니라 <b>"무엇을 기준으로 봐야 하는가"</b>입니다.
제품군마다 정작 중요한 값이 다른데, 매장에서는 그 값을 잘 알려주지 않습니다.</p>
<p>여기서는 제품군별로 <b>사기 전에 확인할 기준</b>을 정리합니다. 광고 문구에 자주 나오지만 실제로는 덜 중요한 값,
반대로 잘 안 보이는데 써 보면 크게 갈리는 값을 나눠서 적었습니다.</p>
<h2>제품군 ${posts.length}가지</h2>
<ol>${list}</ol>`,
}));

// 필수 페이지. 🔴 애드센스 거절 사유 1순위가 "이 페이지들이 없음" 이다.
for (const pg of PAGES) {
  const dir = path.join(OUT, pg.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"),
    page({ title: `${pg.title} — ${SITE}`, desc: pg.desc, body: pg.body, up: "../",
           path: pg.slug + "/", crumb: pg.title }));
}
console.log(`필수 페이지 ${PAGES.length}쪽`);

// 첫 발행일을 남긴다(없던 주소만 오늘로). 🔴 기존 값은 절대 덮지 않는다.
for (const u of ["", ...PAGES.map(pg => pg.slug + "/"), ...posts.map(p => encodeURI(p.slug) + "/")])
  if (!PUBDATE[u]) PUBDATE[u] = TODAY;
fs.writeFileSync(PUBFILE, JSON.stringify(PUBDATE, null, 1) + "\n");

// 사이트맵 · robots — 크롤러가 이 사이트를 아는 유일한 길
const today = TODAY;
const urls = ["", ...PAGES.map(pg => pg.slug + "/"), ...posts.map(p => encodeURI(p.slug) + "/")]
  .map(u => `  <url><loc>${SITE_URL}/${u}</loc><lastmod>${today}</lastmod></url>`).join("\n");
fs.writeFileSync(path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
// IndexNow 키 파일 — 이 파일이 사이트에 있어야 제출이 인증된다(계정 없이 되는 유일한 경로)
if (fs.existsSync(".indexnow-key")) {
  const key = fs.readFileSync(".indexnow-key", "utf-8").trim();
  if (key) fs.writeFileSync(path.join(OUT, key + ".txt"), key + "\n");
}
if (fs.existsSync("public")) for (const f of fs.readdirSync("public")) fs.copyFileSync(path.join("public", f), path.join(OUT, f));

// 🔴 게이트 — 짧은 글은 색인에서 버려진다. 조용히 발행하지 않고 여기서 멈춘다.
const MIN = 1700;
const thin = posts.filter(p => p.chars < MIN).map(p => `${p.seed} ${p.chars}자`);
if (thin.length) { console.error(`너무 짧다(${MIN}자 미만): ${thin.join(", ")}`); process.exit(1); }

// 편별 실측을 파일로 남긴다 — 콘솔 상황판이 이걸 읽는다. 추정값을 쓰지 않는다.
{
  const stats = {
    measured_at: new Date().toISOString(),
    site: SITE_URL,
    target_posts: 20,          // 애드센스 심사 기준
    target_chars: 2000,
    posts: posts.map(p => ({
      seed: p.seed, slug: p.slug, title: p.title,
      chars: p.chars, faqs: p.faqs,
      kws: (groups.find(g => g.seed === p.seed)?.kws || []).length,
    })).sort((a, b) => a.chars - b.chars),
  };
  fs.writeFileSync(path.join(OUT, "stats.json"), JSON.stringify(stats, null, 1) + "\n");
}

const chars = posts.reduce((a, p) => a + p.chars, 0);
// 🔴 사이트맵 수를 posts+1 로 찍고 있었다 — 정책 3쪽이 빠진 값이라 로그가 거짓말이었다.
//    실제로 쓴 파일을 세서 찍는다.
const smCount = (fs.readFileSync(path.join(OUT, "sitemap.xml"), "utf-8").match(/<loc>/g) || []).length;
console.log(`dist · ${posts.length}편 · 평균 ${Math.round(chars / posts.length)}자 · 사이트맵 ${smCount}개`);
