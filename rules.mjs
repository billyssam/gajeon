// 규정 — 코드가 읽는 단일 소스. 정본은 RULES.md 이고, 이 파일은 그 표와 같아야 한다.
// 🔴 둘이 어긋나면 check.mjs 가 배포를 막는다(RULES.md 의 ID 와 여기 ID 를 맞춰 본다).
// 🔴 gate:true 인데 검사가 없으면 그것도 실패다 — "규정만 적고 안 막는" 상태를 금지한다.
export const RULES = [
  // A. 쿠팡 파트너스 · 공정거래위원회 — 어기면 수익금 몰수·계정 해지
  { id: "A1", text: "경제적 이해관계 표시 문구를 제목 또는 글 첫 부분에 둔다",
    src: "공정위 추천·보증 심사지침 (2024-12-01 시행)", gate: true },
  { id: "A2", text: "조건부·불확정 표현 금지 — '받을 수 있음' 같은 문구는 불명확 표시",
    src: "같은 지침", gate: true },
  { id: "A3", text: "제휴 배너가 있는 모든 페이지에 고지 문구",
    src: "쿠팡 파트너스 운영정책", gate: true },
  { id: "A4", text: "정책 페이지(개인정보·문의·소개)에는 제휴 배너를 넣지 않는다",
    src: "애드센스·쿠팡 공통", gate: true },
  { id: "A5", text: "자동 리디렉션·클릭 유도 금지",
    src: "쿠팡 무관용 원칙", gate: true },
  { id: "A6", text: "가격·재고·순위를 글에 박지 않는다",
    src: "프로젝트 원칙 + 쿠팡 표기 제한", gate: true },
  { id: "A7", text: "승인 전에는 제휴 링크를 내보내지 않는다. 승인 뒤에는 전 편에 다리가 있어야 한다",
    src: "쿠팡 파트너스 가입 단계 + 프로젝트 원칙(미구현을 성공이라 하지 않는다)", gate: true },

  // B. 구글 애드센스 — 어기면 심사 거절·게재 중지
  { id: "B1", text: "개인정보처리방침·문의·소개 페이지가 있어야 한다",
    src: "AdSense 프로그램 정책", gate: true },
  { id: "B2", text: "광고를 메뉴·내비게이션으로 오인하게 배치하지 않는다",
    src: "AdSense 프로그램 정책", gate: true },
  { id: "B3", text: "광고를 보이려는 목적만의 얇은 페이지에 광고를 넣지 않는다",
    src: "AdSense 프로그램 정책", gate: true },
  { id: "B4", text: "제목이 약속한 것을 본문이 준다",
    src: "AdSense 방문 페이지 품질", gate: true },
  { id: "B5", text: "자기 광고 클릭·클릭 유도·보상 금지",
    src: "AdSense 프로그램 정책", gate: false },
  { id: "B6", text: "광고 슬롯은 **글 페이지에만**. 정책·문의·소개·홈에 새면 안 된다",
    src: "AdSense 프로그램 정책 + 대표 2026-09-13 \"승인 시 해야하는것만 입히면 되게\"", gate: true },
  { id: "B7", text: "최소 분량을 못 넘긴 글에는 광고 슬롯을 넣지 않는다",
    src: "AdSense 방문 페이지 품질", gate: true },

  // C. 구글 검색 스팸정책 — 어기면 색인에서 빠진다
  { id: "C1", text: "얇은 제휴 금지 — 같은 틀을 찍어낸 페이지를 만들지 않는다",
    src: "구글 스팸정책 thin affiliation", gate: true },
  { id: "C2", text: "대량 생성 금지 — 가치 없이 페이지 수만 늘리지 않는다",
    src: "구글 스팸정책 scaled content abuse", gate: true },
  { id: "C3", text: "키워드를 부자연스럽게 반복하지 않는다",
    src: "구글 스팸정책 keyword stuffing", gate: true },
  { id: "C4", text: "편 간 중복 문장 비율 상한 15%",
    src: "구글 중복 콘텐츠", gate: true },

  // D. 네이버 — 원문 확인 못 함
  { id: "D1", text: "자동 프로그램으로 대량 발행하지 않는다 (하루 1건·사람 속도)",
    src: "⚠️ 공식 가이드 원문 미확인 — searchadvisor.naver.com 접근 차단", gate: false },

  // E. 이 프로젝트의 원칙 — 대표가 정한 것
  { id: "E1", text: "확인하지 못한 값은 쓰지 않는다 — 제품명·브랜드를 넣지 않는다", gate: true },
  { id: "E2", text: "잰 것만 말한다. 어그로는 되고 거짓은 안 된다", gate: true },
  { id: "E3", text: "빈 것이 깨진 것보다 낫다 — 깨진 조사·겹치는 답은 버린다", gate: true },
  { id: "E4", text: "게이트가 막는다. 우회 경로를 두지 않는다", gate: true },
  { id: "E5", text: "화면이 거짓말하지 않는다. 못 잰 것은 '미측정' 이라 적는다", gate: false },
  { id: "E6", text: "워커는 자기 저장소에서만 돈다", gate: true },
  { id: "E7", text: "모든 쪽에 doctype·lang·canonical·구조화 데이터가 있어야 한다",
    src: "쿼크 모드로 그려지던 것을 2026-09-13 에 발견", gate: true },
  { id: "E8", text: "글마다 섹션 카드 이미지가 3장 이상 · alt 는 비어 있지 않다",
    src: "구글 상위 실측 — 본문 이미지 1~17장, 우리는 0장이었다(2026-09-13)", gate: true },
];

// 각인 ① — 무슨 일을 하든 규정을 먼저 찍고 시작한다.
export function 각인(왜 = "") {
  const g = RULES.filter(r => r.gate).length;
  console.log(`\n── 규정 ${RULES.length}개 · 게이트가 막는 것 ${g}개 · 사람이 지키는 것 ${RULES.length - g}개${왜 ? " · " + 왜 : ""}`);
  for (const r of RULES) console.log(`   ${r.gate ? "■" : "□"} ${r.id} ${r.text}`);
  console.log("   정본: RULES.md — 여기와 어긋나면 배포가 막힌다\n");
}
