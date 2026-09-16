// 한 주제의 "자료 브리프" 를 만든다 — 시장조사 · 벤치마킹까지.
// 🔴 대표가 정한 공정: 시장조사 → 검증 → 실시간 자료조사 → 벤치마킹 → 우리 특성 → 제작.
//    앞의 넷은 기계가 한다. 제작은 이 브리프를 받아서 한다.
import fs from "node:fs";
import { CATS } from "./seeds.mjs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0 Safari/537.36";
const get = async u => { const r=await fetch(u,{headers:{"User-Agent":UA},signal:AbortSignal.timeout(20000)});if(!r.ok) throw Error(`브리프 자료 요청 실패 ${r.status}`);return await r.text(); };
const strip = h => h.replace(/<(script|style|nav|footer|header|aside)[\s\S]*?<\/\1>/g, "")
                    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// ── 시장조사: 그 주제에 붙은 실제 검색어
function keywords(topic, seed, cat) {
  const f = fs.readdirSync("data").filter(x => x.startsWith(`kw-${cat}-`)
    || (cat === "home" && x.startsWith("keywords-"))).sort().at(-1);
  if (!f) return [];
  const rows = JSON.parse(fs.readFileSync(`data/${f}`, "utf-8")).rows;
  return rows.filter(r => r.seed === seed || r.kw.includes(seed)).map(r => r.kw)
    .filter(kw => seed!=="도마" || !/(도마뱀|사육장|개코|도마29|인사동)/.test(kw));
}

// ── 벤치마킹: 네이버 블로그탭 상위 제목 + 글 한 편 실측
async function bench(query) {
  const enc = encodeURIComponent(query);
  const html = await get(`https://search.naver.com/search.naver?ssc=tab.blog.all&query=${enc}`);
  const titles = [...html.matchAll(/sds-comps-text-type-headline[^>]*>([\s\S]*?)<\/span>/g)]
    .map(m => strip(m[1])).filter(t => t.length > 8).slice(0, 8);
  const links = [...new Set([...html.matchAll(/https:\/\/blog\.naver\.com\/([a-z0-9_]+)\/(\d+)/g)]
    .map(m => [m[1], m[2]].join("/")))].slice(0, 3);
  const posts = [];
  for (const l of links) {
    const [id, no] = l.split("/");
    const h = await get(`https://blog.naver.com/PostView.naver?blogId=${id}&logNo=${no}&redirect=Dlog&widgetTypeCall=true&directAccess=false`);
    const i = h.indexOf("se-main-container");
    const b = i > 0 ? h.slice(i) : h;
    const txt = strip(b);
    const imgs = (b.match(/postfiles\.pstatic\.net|dthumb-phinf/g) || []).length;
    posts.push({ id, chars: txt.replace(/\s/g, "").length, imgs });
  }
  return { titles, posts };
}

export async function makeBrief(pick) {
  const cat = CATS.find(c => c.key === pick.cat) || CATS[0];
  const seed = (pick.seed || pick.topic.split(" ")[0]).trim();
  const kws = keywords(pick.topic, seed, cat.key);
  const b = await bench(pick.topic.replace(/ —.*$/, ""));
  const avg = b.posts.length ? Math.round(b.posts.reduce((a, p) => a + p.chars, 0) / b.posts.length) : 0;
  const img = b.posts.length ? Math.round(b.posts.reduce((a, p) => a + p.imgs, 0) / b.posts.length) : 0;
  return {
    topic: pick.topic, seed, cat: cat.key, catName: cat.name,
    keywords: kws.slice(0, 60), kwTotal: kws.length,
    benchTitles: b.titles, benchChars: avg, benchImgs: img,
    target: { chars: Math.max(4500, avg), cards: 4 },
  };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1] && process.argv[2]) {
  const brief = await makeBrief({ topic: process.argv[2], cat: process.argv[3] || "home" });
  console.log(JSON.stringify(brief, null, 1).slice(0, 1800));
}
