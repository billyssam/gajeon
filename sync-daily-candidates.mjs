import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const path = 'repos/billyssam/gonghak-ops/contents/blog.json';
const candidateFile = '/Users/billy/gajeon/daily-candidates-20260916.json';
const remote = JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8' }));
const data = JSON.parse(Buffer.from(remote.content.replace(/\n/g, ''), 'base64').toString('utf8'));
const slate = JSON.parse(fs.readFileSync(candidateFile, 'utf8'));
data.daily_candidates = slate;
if (Array.isArray(data.pipeline)) {
  const survey = data.pipeline.find(x => x.step === '조사');
  const pick = data.pipeline.find(x => x.step === '선정');
  if (survey) { survey.state = 'done'; survey.n = '3'; survey.note = '실시간 후보 조사 · 공식 사양·설치 조건 검증 대기'; }
  if (pick) { pick.state = 'done'; pick.n = '3'; pick.note = '오늘 후보 3개 · 최종 가격·재고는 발행 직전 재확인'; }
}
data.updated_at = '2026-09-16 23:05';
const body = { message: 'ops: prepare daily candidate slate', content: Buffer.from(JSON.stringify(data, null, 1) + '\n').toString('base64'), sha: remote.sha };
console.log(execFileSync('gh', ['api', '--method', 'PUT', path, '-H', 'Content-Type: application/json', '--input', '-'], { input: JSON.stringify(body), encoding: 'utf8' }));
