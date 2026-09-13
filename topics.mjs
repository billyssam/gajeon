// 주제 후보 — 키워드를 "한 편이 먹을 수 있는 묶음"으로 만든다.
// 🔴 점수 = 구매의도 키워드 수 × (1 − 브랜드 지배율). 브랜드가 곧 카테고리인 곳은
//    우리가 제품명을 못 써서 쓸 말이 없다(가전 스타일러 44% → 꼴찌였다).
import fs from "node:fs";
import { CATS } from "./seeds.mjs";
const BRAND = /lg|엘지|삼성|위니아|딤채|쿠쿠|쿠첸|로보락|샤오미|다이슨|드리미|에코백스|테팔|필립스|코웨이|청호|sk매직|위닉스|캐리어|한일|보국|리홈|휴롬|드롱기|네스프레소|일리|발뮤다|닌자|ninja|미닉스|신일|한경희|비스포크|디오스|그랑데|오브제|브레빌|부가부|스토케|요요|사이벡스|조이|브라이택스|뉴나|에이스|리안|순성|다이치|페도라|아넥스|실버크로스|락앤락|글라스락|해피콜|네오플램|키친아트|쿡셀|휘슬러|실리트|쯔비링|헨켈|스탠리|써모스/i;
// 묶음 뽑기 — 숫자·조건·겸용처럼 "한 질문"이 되는 말끼리 모은다.
// 🔴 씨드 이름 안에 축 글자가 들어 있으면 오작동한다 —
//    "식기세척기" 의 "세척" 을 축으로 잡아 "식기세척기 세척" 이라는 헛 주제가 나왔다.
//    씨드를 지운 나머지에서만 축을 찾는다.
const AXES = [
  ["인용","몇 인용을 사야 하나"], ["리터","몇 리터가 맞나"], ["kg","몇 kg이 맞나"],
  ["cm","몇 cm까지 되나"], ["평","몇 평까지 되나"], ["개월","몇 개월부터 쓰나"],
  ["등급","등급이 값을 하나"], ["겸용","겸용 사도 되나"], ["같이","같이 써도 되나"],
  ["호환","호환은 어떻게 보나"], ["차이","뭐가 다른가"], ["전기요금","전기요금이 얼마나 되나"],
  ["소음","소음은 어느 정도인가"], ["설치","설치 전에 뭘 확인하나"], ["무게","무게는 어디까지 괜찮나"],
  ["크기","크기는 어떻게 고르나"], ["용량","용량은 어떻게 고르나"], ["재질","재질은 뭐가 나은가"],
  ["사이즈","사이즈는 어떻게 고르나"], ["안전","안전기준은 무엇인가"], ["높이","높이는 어떻게 보나"],
  ["세척","세척은 어떻게 하나"], ["단계","몇 단계면 되나"], ["신생아","신생아부터 쓰나"],
  ["분리","분리는 되나"], ["각도","각도는 어떻게 보나"], ["소독","소독은 어떻게 하나"],
];
const out = [];
// 이미 쓴 글(가전 27편)은 후보에서 뺀다
const written = new Set(fs.existsSync("dist") ? fs.readdirSync("dist", { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name) : []);

for (const c of CATS) {
  const f = fs.readdirSync("data").filter(x => x.startsWith(`kw-${c.key}-`)
    || (c.key === "home" && x.startsWith("keywords-"))).sort().at(-1);
  if (!f) continue;
  const rows = JSON.parse(fs.readFileSync(`data/${f}`, "utf-8")).rows;

  for (const seed of c.seeds) {
    const mine = rows.filter(r => r.seed === seed || r.kw.includes(seed));
    if (!mine.length) continue;
    const brand = mine.filter(r => BRAND.test(r.kw)).length;
    const buy = mine.filter(r => r.buy || /추천|비교|차이|가격|어떤/.test(r.kw)).length;
    const score = +(buy * (1 - brand / mine.length)).toFixed(1);

    // ① 기둥 글 — 그 제품군의 "고르는 기준". 아직 안 쓴 것만.
    if (!written.has(seed)) {
      out.push({ cat: c.key, catName: c.name, seed, kind: "기둥", n: mine.length, score,
                 topic: `${seed} 고르는 기준` });
    }
    // ② 질문형 — 실제 키워드가 3개 이상 모인 축만. 씨드를 지운 나머지에서 찾는다.
    for (const [ax, q] of AXES) {
      const hit = mine.filter(r => r.kw.split(seed).join(" ").includes(ax));
      if (hit.length < 3) continue;
      const b2 = hit.filter(r => BRAND.test(r.kw)).length;
      const bu2 = hit.filter(r => r.buy || /추천|비교|차이|가격|어떤/.test(r.kw)).length;
      const sc2 = +(bu2 * (1 - b2 / hit.length)).toFixed(1);
      if (sc2 < 1.5) continue;
      out.push({ cat: c.key, catName: c.name, seed, kind: "질문", axis: ax, n: hit.length,
                 score: sc2, topic: `${seed} ${q}` });
    }
  }
}
out.sort((a, b) => b.score - a.score);
fs.writeFileSync("data/topics.json", JSON.stringify({ at: new Date().toISOString(), topics: out }, null, 1) + "\n");
const byCat = {};
for (const t of out) (byCat[t.catName] ||= []).push(t);
for (const [k, v] of Object.entries(byCat)) {
  console.log(`\n${k} — 후보 ${v.length}개 · 기둥 ${v.filter(x=>x.kind==="기둥").length} · 질문 ${v.filter(x=>x.kind==="질문").length} (상위 5)`);
  for (const t of v.slice(0, 5)) console.log(`   ${String(t.score).padStart(5)}  [${t.kind}] ${t.topic}  (키워드 ${t.n})`);
}
console.log(`\n전체 ${out.length}개 → data/topics.json`);
