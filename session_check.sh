#!/bin/bash
# 각인 ② — 세션이 시작될 때마다 규정을 눈앞에 밀어넣는다.
# 🔴 내 기억에 기대면 실패한다. 2026-09-13 에 게이트 11항목이 전부 초록불인 채로
#    법정 고지 위치(A1)·거짓 제목(B4)·템플릿 복제(C1)·깨진 조사(E3) 네 규정을 동시에 어기고 있었다.
G="$HOME/gajeon"
[ -d "$G" ] || exit 0
CJ="$G/dist/check.json"
N=$(/opt/homebrew/bin/node -e 'import("'"$G"'/rules.mjs").then(m=>console.log(m.RULES.length))' 2>/dev/null || echo "?")
if [ ! -f "$CJ" ]; then
  echo "════ 가전 블로그 규정 ════"
  echo "🔴 검사 기록이 없다 — 배포 전에 'node build.mjs && node check.mjs' 를 돌려라. 정본: gajeon/RULES.md"
  exit 0
fi
FAIL=$(/usr/bin/python3 -c "import json;d=json.load(open('$CJ'));print(d.get('failed',0))" 2>/dev/null || echo "?")
WHEN=$(/usr/bin/python3 -c "import json;print(json.load(open('$CJ'))['checked_at'][:16].replace('T',' '))" 2>/dev/null || echo "?")
echo "════ 가전 블로그 규정 $N 개 ════"
if [ "$FAIL" = "0" ]; then
  echo "🟢 마지막 검사($WHEN UTC) 위반 0 · 정본 gajeon/RULES.md — 고치기 전에 먼저 읽어라"
else
  echo "🔴🔴 규정 위반 $FAIL 건 — 발행 전에 고쳐라"
  /usr/bin/python3 -c "
import json
for i in json.load(open('$CJ'))['items']:
    if not i['ok']: print('   ✗', i['t'][:100])" 2>/dev/null
fi
exit 0
