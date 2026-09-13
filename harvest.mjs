// 카테고리별 키워드 수확 — 네이버 자동완성(무료·키 불필요). keywords.mjs 와 같은 방법이다.
// 🔴 주제를 지어내지 않는다. 여기 없는 말로는 글을 쓰지 않는다.
import fs from "node:fs";
import { CATS } from "./seeds.mjs";
const BUY = /추천|순위|가격|후기|리뷰|비교|차이|어떤|best|저렴|싼|가성비/i;
const DROP = /디시|내돈내산|중고|당근|렌탈|렌털|as|a\/s|고장|수리|오류|에러|분해|뜻|원리/i;
const SUF = ["", " 추천", " 고르는법", " 비교", " 차이", " 가격", " 사이즈", " 기준"];
const ac = async q => {
  const u = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&con=0&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
  try { const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
        const d = await r.json();
        return [...new Set((d.items || []).flat().map(i => i[0]).filter(Boolean))]; }
  catch { return []; }
};
const only = process.argv[2];
for (const c of CATS) {
  if (only && c.key !== only) continue;
  const rows = new Map();
  for (const s of c.seeds) {
    for (const suf of SUF) {
      for (const kw of await ac(s + suf)) {
        if (DROP.test(kw) || rows.has(kw)) continue;
        rows.set(kw, { kw, seed: s, buy: BUY.test(kw) });
      }
      await new Promise(r => setTimeout(r, 110));
    }
  }
  const arr = [...rows.values()];
  const f = `data/kw-${c.key}-${new Date().toISOString().slice(0, 10)}.json`;
  // 🔴 이번 수확이 지난번보다 적으면 덮지 않는다 — 한 번 실패한 수확이 재고를 깎는다.
  const prev = fs.readdirSync("data").filter(x => x.startsWith(`kw-${c.key}-`)).sort().at(-1);
  if (prev) {
    const old = JSON.parse(fs.readFileSync(`data/${prev}`, "utf-8"));
    if (arr.length < old.rows.length) {
      console.error(`${c.name}: 이번 ${arr.length} < 지난번 ${old.rows.length} — 덮지 않는다`);
      continue;
    }
  }
  fs.writeFileSync(f, JSON.stringify({ at: new Date().toISOString(), cat: c.key, rows: arr }, null, 1) + "\n");
  console.log(`${c.name}: 씨드 ${c.seeds.length} · 키워드 ${arr.length} · 구매의도 ${arr.filter(r => r.buy).length} → ${f}`);
}
