// 배포 전 전수 검사. 🔴 하나라도 걸리면 exit 1 — 배포 자체가 안 된다.
//    "내가 검수해서 막는다" 는 언젠가 깜빡한다. 게이트가 막아야 한다.
//    각 항목은 실제 거절·정지 사유다(2026-09-13 실측으로 찾은 것들).
import fs from "node:fs";
import path from "node:path";

const OUT = "dist";
const AD = "ca-pub-8092073462948926";
const CP = "AF2403241";
const CP_NOTE = "쿠팡 파트너스 활동의 일환";
const MUST = ["privacy", "contact", "about"];
const MIN_CHARS = 1700, MAX_DUP = 15;   // 중복 15% 넘으면 중복 콘텐츠로 걸린다

const strip = h => h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "")
                    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const fail = [], pass = [];
const check = (cond, msg) => (cond ? pass : fail).push(msg);

if (!fs.existsSync(OUT)) { console.error("dist 가 없다 — build 부터"); process.exit(1); }
const dirs = fs.readdirSync(OUT, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
const posts = dirs.filter(d => !MUST.includes(d));
const html = d => fs.readFileSync(path.join(OUT, d, "index.html"), "utf-8");

// ① 필수 페이지 — 애드센스 거절 사유 1순위
for (const m of MUST) check(dirs.includes(m), `필수 페이지 ${m}`);

// ② 광고 코드가 전 페이지에
const noAd = [...dirs.map(d => [d, html(d)]), ["(홈)", fs.readFileSync(path.join(OUT, "index.html"), "utf-8")]]
  .filter(([, h]) => !h.includes(AD)).map(([d]) => d);
check(noAd.length === 0, `애드센스 코드 전 페이지(빠진 곳: ${noAd.join(" ") || "없음"})`);

// ③ 쿠팡 배너가 있으면 고지 문구가 반드시 같이 — 없으면 수익금 지급이 중단된다
const noNote = posts.filter(d => { const h = html(d); return h.includes(CP) && !h.includes(CP_NOTE); });
check(noNote.length === 0, `쿠팡 고지 문구(누락: ${noNote.join(" ") || "없음"})`);

// ④ 정책 페이지에 제휴 배너가 새지 않았나
const leak = MUST.filter(m => dirs.includes(m) && html(m).includes(CP));
check(leak.length === 0, `정책 페이지에 제휴 배너 없음(샌 곳: ${leak.join(" ") || "없음"})`);

// ⑤ 글 길이
const thin = posts.map(d => [d, strip(html(d)).replace(/\s/g, "").length]).filter(([, n]) => n < MIN_CHARS);
check(thin.length === 0, `글 ${MIN_CHARS}자 이상(미달: ${thin.map(([d, n]) => `${d} ${n}`).join(", ") || "없음"})`);

// ⑥ 중복 콘텐츠 — 편 대부분에 똑같이 나오는 문장의 비율
const cnt = new Map();
for (const d of posts)
  for (const s of new Set(strip(html(d)).split(/(?<=다\.)\s+/).map(x => x.trim()).filter(x => x.length > 15)))
    cnt.set(s, (cnt.get(s) || 0) + 1);
const dup = [...cnt].filter(([, n]) => n >= posts.length * 0.8);
const dupChars = dup.reduce((a, [s]) => a + s.replace(/\s/g, "").length, 0);
const avg = posts.reduce((a, d) => a + strip(html(d)).replace(/\s/g, "").length, 0) / posts.length;
const dupPct = Math.round(dupChars / avg * 100);
check(dupPct <= MAX_DUP, `편 간 중복 ${dupPct}% (상한 ${MAX_DUP}%)`);

// ⑦ 사이트맵이 실제 페이지를 다 담았나
const sm = fs.readFileSync(path.join(OUT, "sitemap.xml"), "utf-8");
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].length;
check(locs === dirs.length + 1, `사이트맵 ${locs}개 = 페이지 ${dirs.length + 1}개`);

// ⑧ 내부 링크가 실제 파일을 가리키나(깨진 링크는 심사·사용자 양쪽에 나쁘다)
const broken = [];
for (const d of dirs) {
  for (const m of html(d).matchAll(/href="(\.\.\/[^"#?]+)"/g)) {
    const target = path.join(OUT, decodeURIComponent(m[1].replace(/^\.\.\//, "")));
    if (!fs.existsSync(target) && !fs.existsSync(path.join(target, "index.html"))) broken.push(`${d} → ${m[1]}`);
  }
}
check(broken.length === 0, `내부 링크(깨짐: ${broken.slice(0, 3).join(", ") || "없음"})`);

// ⑨ robots 가 크롤러를 막지 않나
const rb = fs.readFileSync(path.join(OUT, "robots.txt"), "utf-8");
check(!/Disallow:\s*\/\s*$/m.test(rb), "robots.txt 가 전체를 막지 않음");

// 결과를 파일로도 남긴다 — 콘솔이 이걸 읽어 대표에게 보여 준다.
fs.writeFileSync(path.join(OUT, "check.json"), JSON.stringify({
  checked_at: new Date().toISOString(),
  total: pass.length + fail.length, passed: pass.length, failed: fail.length,
  items: [...pass.map(t => ({ t, ok: true })), ...fail.map(t => ({ t, ok: false }))],
}, null, 1) + "\n");

console.log(`검사 ${pass.length + fail.length}항목 · 통과 ${pass.length} · 실패 ${fail.length}`);
for (const p of pass) console.log(`  ✓ ${p}`);
for (const f of fail) console.error(`  ✗ ${f}`);
if (fail.length) { console.error("\n배포를 멈춘다. 위 항목을 고치고 다시 돌려라."); process.exit(1); }
