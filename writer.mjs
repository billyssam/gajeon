// 글 한 편을 만든다. 형식은 29개 성공 사례에서 뽑은 것을 그대로 박는다.
//   제목 50~60자 · 본문 2,000자 이상 · FAQ 5~8문항 · 내부링크 1,000자당 3~5
// 🔴 제품의 성능·가격을 지어내지 않는다. 내가 확인하지 못한 값은 쓰지 않고,
//    대신 "무엇을 기준으로 고르는가" 를 쓴다 — 그건 지어내는 게 아니라 판단 기준이다.
import fs from "node:fs";

export const YEAR = new Date().getFullYear();

// 제목 공식: 숫자 + 강한 말 + 키워드 + 연도 (50~60자를 노린다)
export function makeTitle(kw, n = 5) {
  const base = kw.replace(/\s*(추천|순위|가격|후기|리뷰|비교)\s*/g, "").trim();
  const cands = [
    `${base} 추천 ${n}가지와 고르는 기준 — ${YEAR}년 살 때 확인할 것 정리`,
    `${YEAR}년 ${base} 고르는 법 ${n}가지 — 사기 전에 꼭 확인해야 할 기준`,
    `${base} 살 때 놓치기 쉬운 ${n}가지 — ${YEAR}년 기준으로 다시 정리했다`,
    `${base} 어떤 걸 사야 하나 — ${YEAR}년 기준 ${n}가지로 좁히는 법`,
  ];
  // 50~60자에 가장 가까운 것을 고른다
  return cands.map(t => [Math.abs(t.length - 55), t]).sort((a, b) => a[0] - b[0])[0][1];
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
