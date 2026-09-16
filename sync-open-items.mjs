import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const path = 'repos/billyssam/gonghak-ops/contents/blog.json';
const remote = JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8' }));
const data = JSON.parse(Buffer.from(remote.content.replace(/\n/g, ''), 'base64').toString('utf8'));
data.open_items = JSON.parse(fs.readFileSync('/Users/billy/gajeon/open-items-20260916.json', 'utf8'));
data.open_items_checked_at = '2026-09-16T23:20:00+09:00';
const body = { message: 'ops: record current unresolved items', content: Buffer.from(JSON.stringify(data, null, 1) + '\n').toString('base64'), sha: remote.sha };
console.log(execFileSync('gh', ['api', '--method', 'PUT', path, '-H', 'Content-Type: application/json', '--input', '-'], { input: JSON.stringify(body), encoding: 'utf8' }));
