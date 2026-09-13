import { SPECS, GENERIC } from "./specs.mjs";
import { DETAIL, FIT } from "./detail.mjs";
import { bridge } from "./shop.mjs";

// 키워드를 사람이 묻는 문장으로 바꾼다. 🔴 억지로 만들지 않는다 —
//    질문으로 읽히지 않는 키워드는 버린다(빈 FAQ가 깨진 FAQ보다 낫다).
//    🔴 2026-09-13: 생성된 76개 질문을 전부 읽고 고쳤다. 깨지는 유형이 여섯 가지였다 —
//    씨드 중복("로봇청소기 로봇청소기는"), 조사("인덕션는"), 치환 잔해("기능와(과) 는"),
//    브랜드명(답할 수 없는 질문이 된다), 다른 제품군(야채 건조기), 붙어 있는 키워드("김치냉장고가격").

// 받침 유무로 조사를 고른다. 한글이 아니면 null — 그런 단어는 질문으로 안 만든다.
function jong(word) {
  const ch = word.trim().slice(-1);
  const c = ch.charCodeAt(0);
  if (c < 0xAC00 || c > 0xD7A3) return null;
  return (c - 0xAC00) % 28 !== 0;
}
function josa(word, withJong, withoutJong) {
  const j = jong(word);
  return j === null ? null : (j ? withJong : withoutJong);
}
function 은는(w) { const j = josa(w, "은", "는"); return j && w + j; }
function 와과(w) { const j = josa(w, "과", "와"); return j && w + j; }
function 을를(w) { const j = josa(w, "을", "를"); return j ? w + j : w; }
function 은는S(w) { const j = josa(w, "은", "는"); return j ? w + j : w; }

// 브랜드·모델명이 들어간 검색어는 질문으로 만들지 않는다.
// 브랜드를 물어 놓고 일반론으로 답하면 그건 낚시다.
const BRAND = /lg|엘지|삼성|위니아|딤채|쿠쿠|쿠첸|로보락|로борock|roborock|닌자|ninja|신일|샤오미|xiaomi|다이슨|dyson|드리미|dreame|에코백스|테팔|필립스|코웨이|청호|sk매직|위닉스|winix|캐리어|한일|보국|리홈|휴롬|드롱기|네스프레소|브레빌|일리|미쿠|클라쎄|디오스|비스포크|그랑데|오브제/i;
// 이름은 비슷하지만 다른 제품군인 검색어 — 이 글이 답할 수 있는 범위가 아니다.
const OTHER = /야채|과일|식품|건조식품|초음파\s*세척|안경|생수통|차량용|자동차|반려동물\s*드라이|천연/i;
// 🔴 수식어는 "버릴 것"이 아니라 "쓸 것"만 정한다. 블랙리스트로는 끝이 없었다 —
//    "렌지추천 인덕션", "요리들 에어프라이어", "용 냄비 세트 인덕션" 이 그렇게 새어 나왔다.
//    아래는 제품의 형태·크기·방식을 가리키는 말들이다. 그 밖의 말은 수식어로 쓰지 않는다.
const ALLOW = /^(미니|소형|중형|대형|대용량|소용량|슬림|벽걸이|스탠드형|뚜껑형|빌트인|프리스탠딩|무선|유선|휴대용|가정용|업소용|원룸|1인|2인|물걸레|직수|저수조|히트펌프|하이브리드|하이라이트|전자동|반자동|캡슐|수동|자동|가열식|기화식|압축식|저소음|겸용|\d+인용|\d+구)$/i;

function toQuestion(kw, seed) {
  let k = kw.replace(/\s+/g, " ").trim();
  if (BRAND.test(k) || OTHER.test(k)) return null;
  // 붙어 있는 키워드를 띄운다: "김치냉장고가격" → "김치냉장고 가격"
  k = k.split(seed).join(` ${seed} `).replace(/\s+/g, " ").trim();

  // "A B 차이" — 비교 대상이 둘일 때만 질문이 된다. 하나뿐이면 무엇과 비교하는지 알 수 없다.
  if (/차이/.test(k)) {
    // 양쪽 다 제품 이름이어야 한다. "기능"·"냄비" 같은 두 글자 속성어가 비교 대상으로 들어가면
    // "스타일러와 기능은 뭐가 다른가요?" 같은 문장이 나온다 — 세 글자 이상만 받는다.
    const parts = k.replace(/차이/g, "").trim().split(" ").filter(w => w && w.length > 2);
    const uniq = [...new Set(parts)];
    if (uniq.length !== 2) return null;
    const a = 와과(uniq[0]), b = 은는(uniq[1]);
    return a && b ? `${a} ${b} 뭐가 다른가요?` : null;
  }

  // 수식어는 허용 목록에 있는 것 하나만 쓴다. 없으면 씨드 자체가 주어다.
  const mod = k.split(" ").find(w => w !== seed && ALLOW.test(w));
  const subject = mod ? `${mod} ${seed}` : seed;

  if (/비교/.test(k))      { const w = 은는(subject); return w && `${w} 어떤 기준으로 비교해야 하나요?`; }
  if (/가격|얼마/.test(k)) { const w = 은는(subject); return w && `${w} 어느 정도 값을 봐야 하나요?`; }
  if (/가성비/.test(k))    return `가성비로 고른다면 ${seed}에서 뭘 포기해도 되나요?`;
  if (/순위/.test(k))      return `${seed} 순위는 그대로 믿어도 되나요?`;
  if (/추천/.test(k))      { const w = 은는(subject); return w && `${w} 어떤 사람에게 맞나요?`; }
  if (/\d+\s*인용|\d+\s*구|\d+\s*L/i.test(k)) { const w = 은는(subject); return w && `${w} 우리 집에 맞는 크기인가요?`; }
  return null;
}

export function buildPost(group, allGroups, U) {
  const { esc, makeTitle, slugify, YEAR } = U;
  const seed = group.seed;
  const spec = SPECS[seed] || GENERIC;
  // 제목 틀은 제품군마다 돌려 쓴다(규정 C1). variant 는 build 가 넘긴다.
  const title = makeTitle(seed, spec, group.variant || 0);

  // FAQ — 실제 검색어에서만 뽑는다
  const faqs = [];
  for (const kw of group.kws) {
    const q = toQuestion(kw, seed);
    if (!q || faqs.some(f => f.q === q)) continue;
    // 🔴 답까지 만들어 보고 담는다. 답이 없거나(E3) 이미 나온 답과 같으면 버린다 —
    //    질문만 다르고 답이 같은 FAQ 는 읽는 사람에게 아무것도 주지 않는다.
    const a = faqAnswer({ q, kw }, seed, spec);
    if (!a || faqs.some(f => f.a === a)) continue;
    faqs.push({ q, kw, a });
    if (faqs.length >= 6) break;
  }

  // 🔴 제품군별 상세가 없으면 멈춘다. 짧은 글을 조용히 발행하면 색인에서 버려진다.
  const det = DETAIL[seed];
  if (!det) throw new Error(`detail.mjs 에 "${seed}" 가 없다`);
  if (det.why.length !== spec.axes.length)
    throw new Error(`"${seed}" why ${det.why.length}개 ≠ axes ${spec.axes.length}개`);

  const axes = spec.axes.map(([t, d], i) =>
    `<h3>${i + 1}. ${esc(t)}</h3>\n<p>${esc(d)}</p>\n<p class="why">${esc(det.why[i])}</p>`).join("\n");
  const toc = spec.axes.map(([t]) => `<li>${esc(t)}</li>`).join("");

  const faqHtml = faqs.length ? `
<h2>자주 묻는 것</h2>
<div class="faq">
${faqs.map(f => `<h3>${esc(f.q)}</h3>
<p>${esc(f.a)}</p>`).join("\n")}
</div>` : "";

  // 내부링크 — 같은 사이트의 다른 제품군으로. 촘촘히 잇는다.
  const rel = allGroups.filter(g => g.seed !== seed).slice(0, 5);
  const relHtml = rel.length ? `
<div class="rel"><b>다른 제품군 기준도 보기</b>
${rel.map(g => `<a href="../${encodeURI(slugify(g.seed))}/">${esc(g.seed)} 고르는 기준</a>`).join("\n")}
</div>` : "";

  const body = `
<h1>${esc(title)}</h1>
<p class="lede">${esc(spec.one)}</p>
<p class="meta">${YEAR}년 기준 · ${esc(seed)} ${group.kws.length}개 검색어에서 추린 기준 ${spec.axes.length}가지 · 직접 써 본 후기가 아니라 <b>고르는 기준</b>을 정리한 글입니다.</p>

<p>${esc(을를(seed))} 알아보기 시작하면 비슷한 제품이 수십 개씩 나옵니다.
그런데 ${esc(seed)}에서 실제로 갈리는 건 <b>${esc(spec.axes[0][0])}</b>·<b>${esc(spec.axes[1][0])}</b> 쪽이고,
비교표에 크게 적힌 값이 늘 그 자리에 있는 것은 아닙니다.
아래 ${spec.axes.length}가지는 ${esc(을를(seed))} 살 때 만족도를 가르는 항목만 추린 것입니다.</p>

<div class="toc"><b>이 글에서 다루는 기준</b><ol>${toc}</ol></div>

<h2>고르는 기준 ${spec.axes.length}가지</h2>
${axes}

<h2>${esc(seed)}, 우리 집은 어느 쪽인가</h2>
<p>같은 ${esc(seed)}라도 조건이 다르면 봐야 할 항목이 달라집니다. 해당하는 줄만 보셔도 됩니다.</p>
<ul>
${[[2, "혼자 살거나 공간이 좁다면"], [1, "가족이 많거나 매일 쓴다면"], [0, "예산을 줄여야 한다면"]]
  .map(([i, when]) => {
    const ax = spec.axes[i] || spec.axes[0];
    // 🔴 설명을 템플릿으로 쓰지 않는다 — 그 제품군 축의 실제 설명 첫 문장을 끌어온다.
    //    그래야 20편이 같은 문장을 쓰지 않는다(중복 콘텐츠는 심사에서 걸린다).
    const first = String(ax[1]).split(/(?<=다\.)\s/)[0];
    return `<li><b>${esc(when)}</b> — ${esc(ax[0])}. ${esc(first)}</li>`;
  }).join("\n")}
</ul>

<h2>사기 전 확인할 것</h2>
<p>${esc(seed)}에서는 특히 이 ${det.checks.length}가지를 직접 확인하는 편이 좋습니다.
${esc(spec.axes[0][0])}처럼 크게 적히는 값과 달리, 아래는 받고 나서야 알게 되는 쪽입니다.</p>
<ol>
${det.checks.map(c => `<li>${esc(c)}</li>`).join("\n")}
</ol>

<h2>자주 나오는 실패</h2>
<p>${esc(seed)}에서 같은 실수가 반복됩니다. ${det.wrong.length}가지에 해당하지 않는지만 봐도 큰 실패는 피합니다.</p>
<ul>
${det.wrong.map(w => `<li>${esc(w)}</li>`).join("\n")}
</ul>

<h2>흔한 오해 하나</h2>
<div class="note">${esc(spec.myth)}</div>

<h2>정리하면</h2>
<p>${esc(은는S(seed))} <b>${esc(spec.axes[0][0])}</b>에서 만족도가 가장 크게 갈립니다.
예산이 빠듯하다면 여기에 먼저 쓰고, ${esc(spec.axes[spec.axes.length-1][0])}처럼 나중에 익숙해지는 항목은 낮춰도 됩니다.
${esc(spec.one)}</p>
${bridge(seed, esc)}
${faqHtml}
${relHtml}
`;
  const chars = body.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
  return { title, desc: spec.one, body, chars, faqs: faqs.length };
}

// 답은 기준에서 끌어온다. 🔴 제품명·가격을 지어내지 않는다.
function faqAnswer(f, seed, spec) {
  // 실제 검색어 1위 유형("추천" → 누구에게 맞나). 제품군마다 답이 다르다 — detail.mjs 에 손으로 쓴다.
  if (/맞나요/.test(f.q)) return FIT[seed] || null;
  if (/다른가요/.test(f.q))
    return `쓰는 목적이 다릅니다. 하나로 두 가지를 다 하려는 겸용 제품도 있지만, 각각의 전용 제품보다 성능이 낮은 경우가 많습니다. 겸용은 공간과 값을 아끼는 대신 어느 쪽도 충분하지 않을 수 있다는 뜻입니다. 둘 다 자주 필요하다면 방을 나눠 따로 두는 편이 결과적으로 낫습니다.`;
  if (/비교해야/.test(f.q))
    return `위에 적은 ${spec.axes.length}가지 중 우리 집 조건에 해당하는 항목만 비교하면 선택지가 몇 개로 줄어듭니다. 모든 항목을 다 비교하면 오히려 못 고릅니다.`;
  if (/값을 봐야/.test(f.q))
    return `값은 시기와 유통 경로에 따라 자주 바뀌어 여기에 적지 않습니다. 다만 본체 값만 보지 말고 소모품·전기요금을 1년 기준으로 더해 보면 순위가 달라지는 경우가 있습니다.`;
  if (/포기해도/.test(f.q))
    return `편의 기능부터 포기하는 게 낫습니다. ${spec.axes[0][0]}처럼 기본 성능을 가르는 항목은 나중에 보완할 수 없지만, 편의 기능은 없어도 쓸 수 있습니다.`;
  if (/순위는/.test(f.q))
    return `순위는 판매량이나 광고 집행을 반영하는 경우가 많아 우리 집 조건과는 무관합니다. 순위를 후보를 좁히는 용도로만 쓰고, 결정은 위 기준으로 하는 편이 낫습니다.`;
  if (/맞는 크기/.test(f.q))
    return `표기 용량은 기준 조건에서의 값입니다. 실제로 쓰는 양보다 한 단계 넉넉한 쪽이 여유가 있고, 꽉 채워 쓰면 성능이 떨어지는 제품군이 많습니다.`;
  // 🔴 2026-09-13: 여기에 만능 답이 있었다. `을(를)` 을 그대로 찍어 18/20편이 깨졌고,
  //    질문이 달라도 답이 같아 78개 중 24개가 겹쳤다. 규정 E3 — 빈 것이 깨진 것보다 낫다.
  //    답을 못 만드는 질문은 만들지 않는다.
  return null;
}
