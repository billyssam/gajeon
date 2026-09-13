// 사람이 실제로 검색창에 친 말을 모은다. 네이버 자동완성 — 무료, 키 불필요.
// 🔴 주제를 지어내지 않는다. 여기 없는 말로는 글을 쓰지 않는다.
import fs from "node:fs";

const SEED = [
  // 1차 — 글을 쓴 제품군
  "로봇청소기","공기청정기","건조기","식기세척기","에어프라이어",
  "제습기","가습기","전기레인지","인덕션","커피머신",
  "무선청소기","스타일러","김치냉장고","전자레인지","정수기",
  // 2차 후보 — 아직 안 썼다. 수요를 재고 나서 고른다(감으로 고르지 않는다).
  "세탁기","냉장고","에어컨","전기밥솥","안마의자","비데",
  "음식물처리기","서큘레이터","전기포트","믹서기","오븐","제빙기",
];
// 구매 직전에 치는 말 — 제휴가 붙는 자리다
const BUY = /추천|순위|가격|후기|리뷰|비교|차이|어떤|best|저렴|싼|가성비/i;

const ac = async q => {
  const u = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&con=0&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
  try {
    const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
    const d = await r.json();
    return [...new Set((d.items || []).flat().map(i => i[0]).filter(Boolean))];
  } catch { return []; }
};

const found = new Map();   // 키워드 → { seed, buy, depth }
for (const seed of SEED) {
  const lv1 = await ac(seed);
  lv1.forEach(k => found.set(k, { seed, buy: BUY.test(k), depth: 1 }));
  for (const k of lv1.slice(0, 5)) {
    (await ac(k + " ")).forEach(x => {
      if (!found.has(x)) found.set(x, { seed, buy: BUY.test(x), depth: 2 });
    });
    await new Promise(r => setTimeout(r, 200));
  }
  await new Promise(r => setTimeout(r, 200));
  process.stdout.write(".");
}
console.log();

const rows = [...found].map(([kw, m]) => ({ kw, ...m }));
const buy = rows.filter(r => r.buy);
const out = { harvested_at: new Date().toISOString(), seeds: SEED.length,
              total: rows.length, buy_intent: buy.length, rows };
fs.mkdirSync("data", { recursive: true });
const f = `data/keywords-${new Date().toISOString().slice(0, 10)}.json`;

// 🔴 수집이 중간에 끊기면 어제 모은 것을 덮는다. 줄면 쓰지 않는다.
if (fs.existsSync(f)) {
  const prev = JSON.parse(fs.readFileSync(f, "utf-8"));
  if (rows.length < (prev.rows || []).length) {
    console.error(`덮지 않는다: 이번 ${rows.length}개 < 기존 ${prev.rows.length}개`);
    process.exit(1);
  }
}
fs.writeFileSync(f, JSON.stringify(out, null, 1) + "\n");
console.log(`키워드 ${rows.length}개 (구매의도 ${buy.length}개) → ${f}`);
console.log("구매의도 상위:", buy.slice(0, 8).map(r => r.kw).join(" · "));
