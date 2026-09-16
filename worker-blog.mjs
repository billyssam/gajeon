// 블로그 워커 — 대표가 주제를 누르면 여기서 제작까지 간다.
// 🔴 대표 지시(2026-09-13): "그 앞에 있는건 니가 다 그냥 내 손 안가게 컨트롤해.
//    나는 주제선택 > 검수 > 피드백 or 승인 만 하게 해"
// 공정: 시장조사 → 검증 → 자료조사 → 벤치마킹 → 우리 특성 → 제작 → (대표 검수) → 발행
// 🔴 실패를 성공으로 적지 않는다. 못 만들면 picks 에 failed 와 이유를 남긴다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { mergeChanges } from "./state-merge.mjs";
const readBases = new Map();
import { makeBrief } from "./brief.mjs";
import { makeCards } from "./cards.mjs";

const R = "billyssam/gonghak-ops", F = "blog-review.json";
const LOCK = ".cache/worker.lock";
const gh = (...a) => execFileSync("/opt/homebrew/bin/gh", a, { encoding: "utf-8", maxBuffer: 16 << 20, timeout:30000 });
const token = () => gh("auth", "token").trim();

async function read() {
  const j = JSON.parse(gh("api", `repos/${R}/contents/${F}`));
  const data = JSON.parse(Buffer.from(j.content, "base64").toString("utf-8"));
  readBases.set(j.sha, structuredClone(data));
  if (readBases.size > 20) readBases.delete(readBases.keys().next().value);
  return { sha: j.sha, data };
}
// 🔴 2026-09-13: 15분 걸려 쓴 글이 마지막 업로드 한 번에 날아갔다("fetch failed").
//    네트워크는 가끔 끊긴다. 세 번까지 다시 시도한다.
async function write(data, sha, message) {
  let last;
  const base = readBases.get(sha);
  const intended = structuredClone(data);
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`https://api.github.com/repos/${R}/contents/${F}`, {
        method: "PUT", signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${token()}`, Accept: "application/vnd.github+json",
                   "Content-Type": "application/json", "User-Agent": "gajeon-worker" },
        body: JSON.stringify({ message, branch: "main", sha,
          content: Buffer.from(JSON.stringify(data, null, 1) + "\n").toString("base64") }),
      });
      if (res.ok) return;
      last = new Error(`PUT ${res.status} ${(await res.text()).slice(0, 160)}`);
      if (res.status === 409 || res.status === 422) { // 남이 먼저 썼다 — 다시 읽어서 붙인다
        const fresh = await read(); sha = fresh.sha;
        if (!base) throw new Error("갱신 기준 문서가 없어 충돌을 안전하게 병합할 수 없습니다");
        data = mergeChanges(base, intended, fresh.data);
      }
    } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  throw last;
}
async function setStage(id, stage, note = "") {
  const { sha, data } = await read();
  const p = (data.picks || []).find(x => x.id === id);
  if (p) { p.stage = stage; p.status = "running"; p.note = note; p.updated = new Date().toISOString(); }
  await write(data, sha, `worker: ${stage}`);
}

// ── 제작. 규정과 브리프를 주고 글을 받는다. 🔴 형식이 안 맞으면 실패로 남긴다 — 지어내지 않는다.
function writePost(brief) {
  const rules = fs.readFileSync("RULES.md", "utf-8");
  const prompt = `너는 "고르는 기준" 사이트의 글을 쓴다. 아래 규정을 어기면 배포가 막힌다.

<규정>
${rules}
</규정>

<주제>${brief.topic}</주제>
<제품군>${brief.seed}</제품군>

<실제 검색어 ${brief.kwTotal}개 중 일부>
${brief.keywords.join(" · ")}
</실제 검색어>

<벤치마크 실측>
상위 글 평균 ${brief.benchChars}자 · 이미지 ${brief.benchImgs}장
상위 제목:
${brief.benchTitles.map(t => "- " + t).join("\n")}
</벤치마크>

지켜라:
0. 🔴 문체 — 이 사이트의 다른 글과 같아야 한다. **"~합니다 / ~입니다" 체로 쓴다.**
   "~다" 로 끝나는 단정체로 쓰면 이 사이트 글이 아니게 된다.
1. 본문 ${brief.target.chars}자 이상(공백 제외). 벤치마크를 넘겨야 한다.
2. 제품명·브랜드·모델명·가격·순위를 쓰지 않는다. 확인하지 못한 수치를 지어내지 않는다.
3. 직접 써 본 후기처럼 쓰지 않는다. "고르는 기준"을 쓴다.
4. 제목이 약속한 것을 본문이 준다. "추천 N가지" 같이 못 주는 약속을 하지 않는다.
5. 소제목(h2) 6개 이상. 각 소제목은 관점이 있어야 한다("용량보다 수납 구조" 처럼).
6. 읽고 바로 줄자를 들 수 있게, 확인할 항목을 목록으로 준다.
7. 조사를 받침에 맞춘다.
8. 🔴 확인할 수 있는 수치는 넣는다 — 법정 기준, 공개된 규격, 일반적으로 통용되는 치수 단위(cm·mm·kg·L·개월).
   "문 폭을 재라" 로 끝내지 말고 "승강기 출입구는 흔히 80cm 안팎" 처럼 기준점을 준다.
   다만 특정 제품의 값은 쓰지 않는다. 확인하지 못한 값은 아예 쓰지 않는다.

아래 JSON 만 출력한다. 설명·코드펜스 없이 JSON 하나만.
{"title":"...","desc":"한 문장","lede":"한 문장","body":"<h2>..</h2><p>..</p> 형태의 HTML"}`;

  let out;
  try {
    out = execFileSync("/opt/homebrew/bin/claude",
      ["-p", prompt, "--output-format", "text"],
      { encoding: "utf-8", maxBuffer: 32 << 20, timeout: 15 * 60 * 1000 });
  } catch (e) {
    const stderr = Buffer.isBuffer(e.stderr) ? e.stderr.toString("utf-8") : String(e.stderr || "");
    const detail = stderr.replace(/\s+/g, " ").trim().slice(0, 320);
    throw new Error(detail ? `원고 생성기 접근 실패: ${detail}` : `원고 생성기 실행 실패: ${e.message}`);
  }
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("글 형식이 JSON 이 아니다");
  const post = JSON.parse(m[0]);
  for (const k of ["title", "desc", "lede", "body"]) if (!post[k]) throw new Error(`${k} 가 없다`);
  return post;
}

// ── 초안 점검. 규정 중 초안 단계에서 잴 수 있는 것만 본다.
function inspect(post, brief) {
  const text = post.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const chars = text.replace(/\s/g, "").length;
  const bad = [];
  if (chars < brief.target.chars * 0.95) bad.push(`${chars}자 (목표 ${brief.target.chars})`);
  // 🔴 2026-09-13 QA: 첫 글이 "~다" 체로 나왔다. 사이트 27편은 "~입니다" 체다 — 문체가 튀면 남의 글이다.
  const ends = text.match(/[가-힣][다요][.!?]/g) || [];
  const polite = (text.match(/(습니다|입니다|됩니다|합니다|십시오)[.!?]/g) || []).length;
  if (ends.length && polite / ends.length < 0.7) bad.push(`문체가 다르다(존댓말 ${Math.round(polite / ends.length * 100)}%)`);
  // 🔴 수치가 하나도 없으면 "재라" 고만 하고 기준을 안 주는 글이다. 벤치마크는 43~85건이다.
  const nums = (text.match(/\d+\s*(cm|mm|kg|L\b|리터|개월|인용|평)/g) || []).length;
  if (nums < 8) bad.push(`구체 수치 ${nums}건 (8건 이상)`);
  if ((post.body.match(/<h2>/g) || []).length < 6) bad.push("소제목 6개 미만");
  if (/추천\s*\d|BEST|베스트\s*\d|순위\s*\d|최저가/i.test(post.title)) bad.push("제목이 못 줄 약속을 한다");
  if (/LG|엘지|삼성|위니아|딤채|쿠쿠|다이슨|샤오미|부가부|스토케|사이벡스|락앤락|해피콜/i.test(text)) bad.push("브랜드가 들어갔다");
  if (/\d{1,3}(,\d{3})+\s*원|\d+\s*만\s*원/.test(text)) bad.push("가격이 들어갔다");
  if (/직접\s*(써|사용)\s*(보|해)|사용해\s*본\s*결과/.test(text)) bad.push("체험 주장이 들어갔다");
  if (/을\(를\)|이\(가\)|은\(는\)/.test(text)) bad.push("조사가 깨졌다");
  return { chars, bad };
}

// 초안 하나를 검수함에 올린다. 성공하면 로컬 표시를 지운다.
async function upload(d, pickId) {
  const cur = await read();
  cur.data.drafts = (cur.data.drafts || []).filter(x => x.slug !== d.slug).concat([d]);
  const p = (cur.data.picks || []).find(x => x.id === pickId);
  if (p) { p.status = "done"; p.stage = ""; p.note = `${d.chars}자 · 검수 대기`; p.updated = new Date().toISOString(); }
  await write(cur.data, cur.sha, `worker: 초안 올림 ${d.title}`);
  const f = path.join("drafts", d.slug, "draft.json");
  if (fs.existsSync(f)) fs.renameSync(f, f + ".올림");
}

// 지난번에 못 올린 초안이 있으면 먼저 올린다 — 쓴 글을 잃지 않는다.
async function flush() {
  if (!fs.existsSync("drafts")) return 0;
  let n = 0;
  for (const slug of fs.readdirSync("drafts")) {
    const f = path.join("drafts", slug, "draft.json");
    if (!fs.existsSync(f)) continue;
    const d = JSON.parse(fs.readFileSync(f, "utf-8"));
    try { await upload(d, d.pickId); console.log(`밀린 초안 올림: ${d.title}`); n++; }
    catch (e) { console.error(`밀린 초안 올리기 실패: ${String(e.message || e).slice(0, 120)}`); }
  }
  return n;
}

// 대표가 매번 주제를 누르지 않아도 된다. 오늘 목표가 비어 있는 카테고리에서
// 아직 쓰지 않은 후보를 하나씩 골라 큐에 넣는다. 하루 3개(카테고리당 1개)는
// blog-review.json의 cats/today 설정을 따른다. 검수·승인·발행 게이트는 그대로 둔다.
function autoPick(data) {
  const topics = Array.isArray(data.topics) ? data.topics : [];
  const cats = Array.isArray(data.cats) ? data.cats : [];
  const today = data.today || { goal: 1, done: {} };
  const goal = Number(today.goal || 1);
  const picks = data.picks || [];
  const drafts = data.drafts || [];
  const used = new Set([
    ...picks.map(p => p.topic),
    ...drafts.map(d => d.title),
  ]);
  const runningCats = new Set(picks.filter(p => ["queued", "running"].includes(p.status)).map(p => p.cat));
  const done = today.done || {};
  const order = cats.length ? cats : [...new Map(topics.map(t => [t.cat || "", { key: t.cat || "", name: t.cat || "" }])).values()];
  for (const cat of order) {
    const key = cat.key || "";
    if (Number(done[key] || 0) >= goal || runningCats.has(key)) continue;
    const t = topics.find(x => (x.cat || "") === key && x.topic && !used.has(x.topic));
    if (t) return { topic: t.topic, cat: key, kind: t.kind || "", auto: true };
  }
  return null;
}

async function run() {
  fs.mkdirSync(".cache", { recursive: true });
  if (fs.existsSync(LOCK)) {
    const rawPid = fs.readFileSync(LOCK, "utf-8").trim();
    const pid = Number(rawPid);
    let alive = false;
    if (Number.isInteger(pid) && pid > 1) {
      try { process.kill(pid, 0); alive = true; } catch {}
    }
    if (alive) {
      console.log(`이미 도는 중 (PID ${pid})`); return;
    }
    // 비정상 종료로 남은 잠금은 다음 실행을 막지 않도록 정리한다.
    fs.rmSync(LOCK, { force: true });
    console.log("오래된 잠금 정리");
  }
  try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); }
  catch(e) { if(e.code === "EEXIST") { console.log("다른 실행이 먼저 잠금을 획득했습니다"); return; } throw e; }
  try {
    const healthOnly=process.argv.includes("--health-only");
    if(!healthOnly) await flush();
    let { sha, data } = await read();
    let auth;
    try { auth = JSON.parse(execFileSync("/opt/homebrew/bin/claude", ["auth", "status"], {encoding:"utf-8",timeout:15000})); }
    catch(e) {
      try { auth = JSON.parse(String(e.stdout || "")); } catch { auth = {loggedIn:false}; }
    }
    if (!auth.loggedIn && !process.env.ANTHROPIC_API_KEY) {
      const health = {project:"blog",status:"blocked",code:"writer_auth",note:"원고 생성기 인증 없음 · 새 후보를 소모하지 않고 보존했습니다",action:"인증 복구 필요",at:new Date().toISOString()};
      fs.writeFileSync(".cache/worker-health.json", JSON.stringify(health,null,2));
      if (data.worker?.code !== health.code) { data.worker = health; await write(data,sha,"worker: 원고 생성기 인증 장애"); }
      console.error(health.note); process.exitCode = 1; return;
    }
    fs.writeFileSync(".cache/worker-health.json", JSON.stringify({project:"blog",status:"ready",at:new Date().toISOString()}));
    if(data.worker?.status==="blocked") {
      data.worker={project:"blog",status:"ready",note:"원고 생성기 인증 확인됨",at:new Date().toISOString()};
      await write(data,sha,"worker: 원고 생성기 인증 복구");
      ({sha,data}=await read());
    }
    if(healthOnly) return;
    let pick = (data.picks || []).find(p => p.status === "queued");
    if (!pick) {
      const next = autoPick(data);
      if (!next) { console.log("자동 선정할 후보 없음"); return; }
      pick = { id: `p${Date.now().toString(36)}`, ...next,
        status: "queued", stage: "", note: "자동 선정 · 워커 대기", created: new Date().toISOString(), updated: new Date().toISOString() };
      data.picks = (data.picks || []).concat([pick]).slice(-20);
      await write(data, sha, `worker: 자동 선정 ${pick.topic}`);
      ({ sha, data } = await read());
      pick = (data.picks || []).find(p => p.id === pick.id) || pick;
      console.log(`자동 선정: ${pick.topic}`);
    }
    pick.status = "running"; pick.stage = "market"; pick.updated = new Date().toISOString();
    await write(data, sha, `worker: 가져감 ${pick.topic}`);
    console.log(`가져감: ${pick.topic}`);

    await setStage(pick.id, "bench", "상위 글을 재는 중");
    const brief = await makeBrief(pick);
    console.log(`브리프: 키워드 ${brief.kwTotal} · 벤치 ${brief.benchChars}자`);

    await setStage(pick.id, "write", `목표 ${brief.target.chars}자`);
    const post = writePost(brief);
    const chk = inspect(post, brief);
    if (chk.bad.length) throw new Error(`초안 점검 실패: ${chk.bad.join(" · ")}`);

    // 카드 — 소제목에서 제목을 가져온다
    const slug = brief.topic.replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 60);
    const heads = [...post.body.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map(m => m[1].replace(/<[^>]+>/g, "")).slice(0, 4);
    makeCards(slug, heads, path.join("drafts", slug));

    const md = post.body.replace(/<h2>/g, "\n## ").replace(/<\/h2>/g, "\n")
      .replace(/<li>/g, "- ").replace(/<\/li>/g, "\n")
      .replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();

    const d0 = {
      id: "d" + Date.now().toString(36), title: post.title, slug, status: "review",
      cat: brief.cat, catName: brief.catName, chars: chk.chars, keywords: brief.kwTotal,
      bench: brief.benchChars, cards: heads.length, md, desc: post.desc, lede: post.lede,
      html: post.body, feedback: [], created: new Date().toISOString(), updated: new Date().toISOString(),
    };
    // 🔴 올리기 전에 먼저 남긴다. 업로드가 실패해도 글은 살아 있고 다음 실행이 이어받는다.
    fs.mkdirSync(path.join("drafts", slug), { recursive: true });
    fs.writeFileSync(path.join("drafts", slug, "draft.json"),
      JSON.stringify({ ...d0, pickId: pick.id }, null, 1) + "\n");
    await upload(d0, pick.id);
    console.log(`끝: ${post.title} · ${chk.chars}자 · 카드 ${heads.length}장`);
  } catch (e) {
    const msg = String(e.message || e).slice(0, 200);
    console.error(`실패: ${msg}`);
    try {
      const { sha, data } = await read();
      const p = (data.picks || []).find(x => x.status === "running");
      if (p) { p.status = "failed"; p.note = msg; p.stage = ""; p.updated = new Date().toISOString(); }
      await write(data, sha, "worker: 실패");
    } catch {}
    process.exitCode = 1;
  } finally { fs.rmSync(LOCK, { force: true }); }
}
run();
