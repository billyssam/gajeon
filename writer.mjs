// 글 한 편을 만든다. 형식은 29개 성공 사례에서 뽑은 것을 그대로 박는다.
//   제목 50~60자 · 본문 2,000자 이상 · FAQ 5~8문항 · 내부링크 1,000자당 3~5
// 🔴 제품의 성능·가격을 지어내지 않는다. 내가 확인하지 못한 값은 쓰지 않고,
//    대신 "무엇을 기준으로 고르는가" 를 쓴다 — 그건 지어내는 게 아니라 판단 기준이다.
import fs from "node:fs";

export const YEAR = new Date().getFullYear();

// 제목. 🔴 규정 B4 — 제목이 약속한 것을 본문이 준다.
//    2026-09-13 까지 20편 전부 "추천 5가지" 였다. 이 글에는 추천 제품이 한 개도 없다.
//    제목이 약속한 것을 본문이 주지 않으면 애드센스 방문페이지 품질 위반이고, 그 전에 거짓말이다.
// 🔴 규정 C1 — 같은 틀을 찍어내지 않는다. 20편이 제품명만 바뀐 한 문장이면
//    구글이 말하는 cookie-cutter template(얇은 제휴)이다. 그래서 틀을 넷으로 나누고,
//    축 이름을 끌어와 제품군마다 실제로 다른 문장이 되게 한다(지어내는 값이 아니다).
export function makeTitle(seed, spec, variant = 0) {
  const base = seed.replace(/\s*(추천|순위|가격|후기|리뷰|비교)\s*/g, "").trim();
  const ax = (spec && spec.axes) || [];
  const n = ax.length || 5;
  // 🔴 축 이름에 이미 가운뎃점이 들어 있는 제품군이 있다("가열식 · 초음파 · 기화식").
  //    그걸 제목에 넣으면 "가열식 · 초음파 · 기화식·세척 편의에서 갈립니다" 처럼 읽히지 않는다.
  //    그런 축은 제목에 쓰지 않는다 — 틀을 억지로 채우지 않고 다른 틀로 넘어간다.
  const clean = i => (ax[i] && !/[·,]/.test(ax[i][0]) && ax[i][0].length <= 12) ? ax[i][0] : null;
  const a1 = clean(0), a2 = clean(1);
  const cands = [
    `${base} 고르는 기준 ${n}가지 — 사기 전 확인할 것 정리`,
    `${base}, 무엇을 기준으로 골라야 할까? — ${YEAR}년 확인 항목 ${n}가지`,
    a1 ? `${base} 살 때 놓치기 쉬운 ${n}가지 — ${a1}부터 봅니다` : null,
    (a1 && a2) ? `${YEAR}년 ${base} 고르는 법 — ${a1}·${a2}에서 갈립니다` : null,
  ].filter(Boolean);
  return cands[((variant % cands.length) + cands.length) % cands.length];
}

// 같은 시드(제품군)의 다른 키워드로 내부링크를 만든다 — 촘촘히 연결된 10편이 흩어진 30편을 이긴다
export function relatedLinks(kw, all, slugOf, max = 4) {
  const me = all.find(r => r.kw === kw);
  if (!me) return [];
  return all.filter(r => r.seed === me.seed && r.kw !== kw && r.buy)
            .slice(0, max).map(r => ({ kw: r.kw, slug: slugOf(r.kw) }));
}

export function slugify(kw) {
  return kw.trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 60);
}

// 🔴 키워드를 그대로 제목에 넣으면 "로봇청소기디시" 같은 말이 박힌다.
//    커뮤니티 은어·중고·수리 문의는 살 사람의 말이 아니다 — 걸러낸다.
export const DROP = /디시|내돈내산|중고|당근|렌탈|렌털|as|a\/s|고장|수리|오류|에러|소음\s*원인|분해|뜻|원리/i;

// 480개를 480편으로 쪼개지 않는다. 제품군 하나에 한 편을 쓰고,
// 그 제품군의 키워드들을 그 한 편 안에서 다룬다(촘촘한 10편 > 흩어진 30편).
export function groupBySeed(rows) {
  const g = new Map();
  for (const r of rows) {
    if (!r.buy || DROP.test(r.kw)) continue;
    if (!g.has(r.seed)) g.set(r.seed, []);
    g.get(r.seed).push(r.kw);
  }
  return [...g].map(([seed, kws]) => ({ seed, kws, n: kws.length }))
               .sort((a, b) => b.n - a.n);
}
