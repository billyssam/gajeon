// 주제 후보를 검수함으로 올린다. 🔴 drafts·picks 는 절대 덮지 않는다.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { CATS } from "./seeds.mjs";
const gh = (...a) => execFileSync("/opt/homebrew/bin/gh", a, { encoding: "utf-8", maxBuffer: 16 << 20 });
const R = "billyssam/gonghak-ops", F = "blog-review.json";
const j = JSON.parse(gh("api", `repos/${R}/contents/${F}`));
const cur = JSON.parse(Buffer.from(j.content, "base64").toString("utf-8"));

const fresh = JSON.parse(fs.readFileSync("data/topics.json", "utf-8")).topics;
// 손으로 묶어 둔 가전 질문형 후보는 살린다(자동으로는 안 나오는 묶음이다)
const hand = (cur.topics || []).filter(t => !t.cat).map(t => ({ ...t, cat: "home", catName: "가전", kind: "질문" }));
const all = [...hand, ...fresh];
// 같은 주제는 한 번만
const seen = new Set();
cur.topics = all.filter(t => !seen.has(t.topic) && seen.add(t.topic))
                .sort((a, b) => b.score - a.score);

const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
cur.cats = CATS.map(c => ({
  key: c.key, name: c.name, score: c.score, why: c.why,
  topics: cur.topics.filter(t => t.cat === c.key).length,
}));
// 오늘 카테고리별로 몇 편 갔는지. 하루 목표는 카테고리당 1편.
if (!cur.today || cur.today.date !== today) cur.today = { date: today, goal: 1, done: { home: 0, baby: 0, kitchen: 0 } };
cur.updated_at = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace("T", " ");

// 🔴 -f content=... 은 본문이 커서 명령줄이 터지고, gh --input 은 정상 JSON 에도
//    "unexpected end of JSON input" 으로 죽는다(2026-09-13 실측). REST 를 직접 부른다.
const token = gh("auth", "token").trim();
const res = await fetch(`https://api.github.com/repos/${R}/contents/${F}`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json",
             "Content-Type": "application/json", "User-Agent": "gajeon-sync" },
  body: JSON.stringify({ message: "카테고리 3개 · 주제 후보 올림", branch: "main",
    content: Buffer.from(JSON.stringify(cur, null, 1) + "\n").toString("base64"), sha: j.sha }),
});
if (!res.ok) { console.error(`PUT 실패 ${res.status}: ${(await res.text()).slice(0, 200)}`); process.exit(1); }
for (const c of cur.cats) console.log(`${c.name.padEnd(8)} 후보 ${String(c.topics).padStart(3)}개`);
console.log(`초안 ${(cur.drafts||[]).length}건 · 명령 ${(cur.picks||[]).length}건 (건드리지 않음)`);
