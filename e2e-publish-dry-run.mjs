// 승인 직후 발행 흐름의 안전한 드라이런.
// 실제 GitHub 쓰기·광고 삽입·발행은 하지 않고, 발행 직전에 필요한 입력과 차단 조건만 검증한다.
import { execFileSync } from 'node:child_process';
import { ready, link } from './shop.mjs';

const SITE = 'https://billyssam.github.io/gajeon/';
const HOST = 'https://billyssam.github.io';
const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });

const get = async url => {
  const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  return { res, text: await res.text() };
};

let data = {};
let reviewOk = false;
try {
  const file = JSON.parse(execFileSync('gh', ['api', 'repos/billyssam/gonghak-ops/contents/blog-review.json'], { encoding: 'utf8' }));
  data = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
  reviewOk = true;
} catch {}
check('운영 검수 데이터 접근', reviewOk, reviewOk ? 'GitHub API read' : 'GitHub API read 실패');
const drafts = Array.isArray(data.drafts) ? data.drafts : [];
check('원고 검수 증거', drafts.length > 0 && drafts.every(d => {
  const c = d.check || {};
  return c.total > 0 && c.passed === c.total && c.failed === 0 && c.pending === 0;
}), `${drafts.length}개 원고`);
check('사용자 승인 잠금 유지', drafts.every(d => d.status !== 'published'), '드라이런은 실제 발행하지 않음');

for (const [label, url] of [
  ['홈', SITE], ['사이트맵', `${SITE}sitemap.xml`], ['robots', `${SITE}robots.txt`], ['ads.txt', `${HOST}/ads.txt`]
]) {
  const { res } = await get(`${url}${url.includes('?') ? '&' : '?'}dryrun=${Date.now()}`);
  check(`공개 ${label}`, res.ok, `${res.status}`);
}

check('제휴 링크 차단 게이트', !ready() && link('테스트') === null, '승인 전 링크 0개');
check('실제 발행 호출', true, '의도적으로 호출하지 않음');

const failed = checks.filter(x => !x.ok);
console.log(`발행 E2E 드라이런 ${checks.length}항목 · 통과 ${checks.length - failed.length} · 미흡 ${failed.length}`);
for (const x of checks) console.log(`${x.ok ? '✓' : '✗'} ${x.name} — ${x.detail}`);
if (failed.length) process.exitCode = 1;
