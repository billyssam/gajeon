// 품목 후보를 같은 잣대로 재 본다 — 네이버 자동완성(무료·키 불필요).
// 🔴 감으로 고르지 않는다. 가전을 고를 때 쓴 것과 똑같은 방법이다.
const ac = async q => {
  const u = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&con=0&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
  try { const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
        const d = await r.json();
        return [...new Set((d.items || []).flat().map(i => i[0]).filter(Boolean))]; }
  catch { return []; }
};
const BUY = /추천|순위|가격|후기|리뷰|비교|차이|어떤|best|저렴|싼|가성비/i;
// 브랜드가 곧 카테고리인 곳은 우리가 쓸 말이 없다. 품목마다 흔한 브랜드를 넣어 잰다.
const BRAND = /lg|엘지|삼성|다이슨|샤오미|나이키|아디다스|뉴발란스|룰루레몬|에이블리|무신사|설화수|이니스프리|닥터자르트|헤라|랑콤|시슬리|에스티|맥|퓨어|유한|하기스|팸퍼스|마미포코|페리오|로얄캐닌|힐스|네츄럴|오리젠|블랙워터|코스트코|이케아|한샘|시디즈|듀오백|일룸|로지텍|앱코|한성|커세어|스탠리|콜맨|코베아|스노우피크|헬리녹스|아디닥스/i;
const CATS = {
  "가전(지금)":      ["로봇청소기", "식기세척기", "공기청정기"],
  "주방·생활용품":    ["프라이팬", "압력솥", "도마", "수납장", "빨래건조대"],
  "육아용품":        ["유모차", "카시트", "아기침대", "젖병", "기저귀"],
  "반려동물":        ["강아지 사료", "고양이 화장실", "자동급식기", "펫드라이룸"],
  "캠핑·아웃도어":    ["텐트", "캠핑의자", "코펠", "침낭", "타프"],
  "사무·홈오피스":    ["사무용 의자", "모니터암", "책상", "기계식 키보드"],
  "운동·홈트":       ["런닝머신", "실내자전거", "덤벨", "요가매트"],
  "뷰티":           ["선크림", "클렌징오일", "쿠션", "헤어드라이어"],
};
const SUF = ["", " 추천", " 고르는법", " 비교", " 차이", " 가격", " 사이즈"];
const out = [];
for (const [cat, seeds] of Object.entries(CATS)) {
  const all = new Set();
  for (const s of seeds) for (const suf of SUF) {
    for (const k of await ac(s + suf)) all.add(k);
    await new Promise(r => setTimeout(r, 120));
  }
  const arr = [...all];
  const buy = arr.filter(k => BUY.test(k)).length;
  const brand = arr.filter(k => BRAND.test(k)).length;
  const score = +(buy * (1 - brand / Math.max(arr.length, 1))).toFixed(1);
  out.push({ cat, n: arr.length, buy, brandPct: Math.round(brand / arr.length * 100), score, seeds: seeds.length });
}
out.sort((a, b) => b.score - a.score);
console.log(`\n${"품목".padEnd(16)}${"씨드".padStart(4)}${"키워드".padStart(6)}${"구매의도".padStart(8)}${"브랜드".padStart(7)}${"점수".padStart(7)}`);
for (const o of out)
  console.log(`${o.cat.padEnd(16)}${String(o.seeds).padStart(4)}${String(o.n).padStart(6)}${String(o.buy).padStart(8)}${(o.brandPct + "%").padStart(7)}${String(o.score).padStart(7)}`);
console.log("\n※ 씨드 수가 달라 절대 비교는 못 한다 — 씨드당 값으로 같이 본다");
for (const o of out) console.log(`  ${o.cat.padEnd(16)} 씨드당 키워드 ${(o.n / o.seeds).toFixed(1)} · 구매의도 ${(o.buy / o.seeds).toFixed(1)}`);
