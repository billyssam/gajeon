// AdSense가 심사한 호스트 루트의 랜딩 페이지에서 광고 코드를 제거한다.
// 생활가전 콘텐츠는 /gajeon/에만 있고, 승인 전에는 어떤 루트 광고도 남기지 않는다.
import { execFileSync } from 'node:child_process';

const path = 'repos/billyssam/billyssam.github.io/contents/index.html';
const remote = JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8' }));
const old = Buffer.from(remote.content.replace(/\n/g, ''), 'base64').toString('utf8');
const exact = /\s*<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-8092073462948926" crossorigin="anonymous"><\/script>/g;
const next = old.replace(exact, '');
if (next === old) throw new Error('루트 광고 스크립트를 찾지 못해 쓰기를 중단함');
const body = {
  message: 'policy: remove AdSense code from host landing page',
  content: Buffer.from(next).toString('base64'),
  sha: remote.sha,
  branch: 'main'
};
console.log(execFileSync('gh', ['api', '--method', 'PUT', path, '-H', 'Content-Type: application/json', '--input', '-'], { input: JSON.stringify(body), encoding: 'utf8' }));
