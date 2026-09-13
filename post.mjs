import { SPECS, GENERIC } from "./specs.mjs";

// 키워드를 사람이 묻는 문장으로 바꾼다. 🔴 억지로 만들지 않는다 —
//    질문으로 읽히지 않는 키워드는 버린다(빈 FAQ가 지어낸 FAQ보다 낫다).
function toQuestion(kw, seed) {
  const k = kw.replace(/\s+/g, " ").trim();
  if (/차이/.test(k))       return `${k.replace(/\s*차이\s*/, "와(과) ")}는 뭐가 다른가요?`;
  if (/비교/.test(k))       return `${k.replace(/\s*비교\s*/, "")}, 어떤 기준으로 비교해야 하나요?`;
  if (/가격|얼마/.test(k))  return `${k.replace(/\s*(가격비교|가격|얼마)\s*/, "")}는 어느 정도 값을 봐야 하나요?`;
  if (/가성비/.test(k))     return `가성비로 고른다면 ${seed}에서 뭘 포기해도 되나요?`;
  if (/순위/.test(k))       return `${seed} 순위는 그대로 믿어도 되나요?`;
  if (/추천/.test(k))       return `${k.replace(/\s*추천\s*/, "")} ${seed}는 어떤 사람에게 맞나요?`.replace(/\s+/g, " ");
  if (/\d+\s*인용|\d+구|\d+L/.test(k)) return `${k}, 우리 집에 맞는 크기인가요?`;
  return null;
}

export function buildPost(group, allGroups, U) {
  const { esc, makeTitle, slugify, YEAR } = U;
  const seed = group.seed;
  const spec = SPECS[seed] || GENERIC;
  const title = makeTitle(seed);

  // FAQ — 실제 검색어에서만 뽑는다
  const faqs = [];
  for (const kw of group.kws) {
    const q = toQuestion(kw, seed);
    if (q && !faqs.some(f => f.q === q)) faqs.push({ q, kw });
    if (faqs.length >= 6) break;
  }

  const axes = spec.axes.map(([t, d], i) =>
    `<h3>${i + 1}. ${esc(t)}</h3>\n<p>${esc(d)}</p>`).join("\n");
  const toc = spec.axes.map(([t]) => `<li>${esc(t)}</li>`).join("");

  const faqHtml = faqs.length ? `
<h2>자주 묻는 것</h2>
<div class="faq">
${faqs.map(f => `<h3>${esc(f.q)}</h3>
<p>${esc(faqAnswer(f, seed, spec))}</p>`).join("\n")}
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
<p class="meta">${YEAR}년 기준 · 이 글은 제품을 직접 써 본 후기가 아니라 <b>고르는 기준</b>을 정리한 글입니다.</p>

<p>${esc(seed)}를 알아보기 시작하면 비슷한 제품이 수십 개씩 나옵니다. 그런데 비교표에 적힌 값들이
전부 똑같이 중요한 건 아닙니다. 어떤 값은 광고에 크게 나오지만 실제로 써 보면 별 차이가 없고,
어떤 값은 잘 안 보이는데 만족도를 크게 가릅니다.</p>

<div class="toc"><b>이 글에서 다루는 기준</b><ol>${toc}</ol></div>

<h2>고르는 기준 ${spec.axes.length}가지</h2>
${axes}

<h2>우리 집은 어느 쪽인가</h2>
<p>같은 제품군이라도 집 조건에 따라 봐야 할 항목이 달라집니다. 아래에서 해당하는 줄만 보면 됩니다.</p>
<ul>
<li><b>혼자 살거나 공간이 좁다면</b> — ${esc(spec.axes[2] ? spec.axes[2][0] : spec.axes[0][0])}을(를) 먼저 봅니다. 큰 모델을 들여도 놓을 자리가 없으면 성능은 의미가 없고, 작은 집에서는 소음이 더 크게 느껴집니다.</li>
<li><b>가족이 많거나 매일 쓴다면</b> — ${esc(spec.axes[1] ? spec.axes[1][0] : spec.axes[0][0])}에서 차이가 누적됩니다. 하루에 한 번 겪는 불편은 참을 만하지만 매일 여러 번이면 결국 안 쓰게 됩니다.</li>
<li><b>예산을 줄여야 한다면</b> — ${esc(spec.axes[0][0])}만 지키고 나머지는 낮춰도 됩니다. 기본 성능을 가르는 항목은 나중에 보완할 수 없지만 편의 기능은 없어도 쓸 수 있습니다.</li>
</ul>

<h2>사기 전 확인할 것</h2>
<p>매장이나 상세페이지에서 이 네 가지는 직접 확인하는 편이 좋습니다. 설명에 잘 안 적히거나 작게 적히는 값들입니다.</p>
<ol>
<li>놓을 자리의 <b>가로·세로·높이</b>와 문이 열리는 공간까지 재 두기</li>
<li><b>소모품 값과 교체 주기</b> — 본체 값이 싸고 소모품이 비싼 구조가 흔합니다</li>
<li><b>가장 낮은 단계의 소음</b> — 최대 단계 수치만 적힌 경우가 많습니다</li>
<li><b>반품 조건</b> — 설치형 제품은 설치 후 반품이 어려운 경우가 있습니다</li>
</ol>

<h2>흔한 오해 하나</h2>
<div class="note">${esc(spec.myth)}</div>

<h2>정리하면</h2>
<p>${esc(seed)}는 <b>${esc(spec.axes[0][0])}</b>에서 만족도가 가장 크게 갈립니다.
예산이 빠듯하다면 여기에 먼저 쓰고, 나머지는 우리 집 조건(공간·가족 수·쓰는 시간대)에 맞춰
필요한 것만 고르면 됩니다. 쓰지 않을 기능에 값을 치르는 것이 가장 흔한 실수입니다.</p>
${faqHtml}
${relHtml}
`;
  const chars = body.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
  return { title, desc: spec.one, body, chars, faqs: faqs.length };
}

// 답은 기준에서 끌어온다. 🔴 제품명·가격을 지어내지 않는다.
function faqAnswer(f, seed, spec) {
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
  return `${spec.axes[0][0]}을(를) 먼저 확인하는 것을 권합니다. 이 항목에서 만족도가 가장 크게 갈립니다.`;
}
