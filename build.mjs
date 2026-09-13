import fs from "node:fs";
import path from "node:path";
import { makeTitle, slugify, groupBySeed, YEAR } from "./writer.mjs";
import { buildPost } from "./post.mjs";
import { SPECS } from "./specs.mjs";
import { DETAIL } from "./detail.mjs";

const OUT = "dist", DATA = "data";
const SITE = "가전 고르는 기준";
const TAGLINE = "사기 전에 무엇을 봐야 하는지부터 정리합니다";
const SITE_URL = process.env.SITE_URL || "https://billyssam.github.io/gajeon";

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
.rel{background:var(--band);border-radius:8px;padding:var(--s3);margin-top:var(--s5)}
.rel b{display:block;font-size:14px;margin-bottom:var(--s2)}
.rel a{display:block;padding:var(--s1) 0;font-size:15px}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.why{border-left:2px solid var(--line);padding-left:var(--s3);
  font-size:15px;color:var(--ink2);margin:0 0 var(--s4)}
.note{background:var(--band);border-left:3px solid var(--ink3);padding:var(--s3);
  font-size:15px;color:var(--ink2);margin:0 0 var(--s3)}
footer{border-top:1px solid var(--line);padding:var(--s4) 0 var(--s6);
  font-size:13px;color:var(--ink3)}
@media(max-width:640px){body{font-size:16px}h1{font-size:24px}h2{font-size:19px}.lede{font-size:17px}}
`;

// 애드센스 심사·게재 코드. 🔴 화면으로 읽지 않고 복사 버튼 → 클립보드로 받은 값이다(2026-09-13).
//    심사는 이 스크립트가 사이트에 실제로 있어야 시작된다.
const ADS_CLIENT = "ca-pub-8092073462948926";
const ADS = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}" crossorigin="anonymous"></script>`;

export function page({ title, desc, body, up = "" }) {
  return `<meta name="description" content="${esc(desc)}">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${ADS}
<style>${CSS}</style>
<header><div class="wrap"><b><a href="${up || "./"}">${SITE}</a></b><span>${TAGLINE}</span></div></header>
<main><div class="wrap">${body}</div></main>
<footer><div class="wrap">${SITE} · 이 글은 제품을 직접 써 보고 쓴 후기가 아니라, 고르는 기준을 정리한 글입니다.</div></footer>`;
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

const posts = [];
for (const g of groups) {
  const post = buildPost(g, groups, { esc, n, makeTitle, slugify, YEAR });
  const dir = path.join(OUT, slugify(g.seed));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"),
    page({ title: post.title, desc: post.desc, body: post.body, up: "../" }));
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

// 사이트맵 · robots — 크롤러가 이 사이트를 아는 유일한 길
const today = new Date().toISOString().slice(0, 10);
const urls = ["", ...posts.map(p => encodeURI(p.slug) + "/")]
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
console.log(`dist · ${posts.length}편 · 평균 ${Math.round(chars / posts.length)}자 · 사이트맵 ${posts.length + 1}개`);
