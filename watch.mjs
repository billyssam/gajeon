// 콘솔 「블로그&구글」 탭에서 누른 명령을 가져와 실행한다. launchd 가 5분마다 부른다.
// 🔴 상태를 먼저 claimed 로 바꾸고 나서 일한다 — 안 그러면 다음 호출이 같은 일을 또 시작한다.
//
// 🔴🔴 2026-09-13: 이 워커가 원래 ~/agent-bench 에 있었고, 거기 스크립트를 돌렸다.
//    블로그가 ~/gajeon 으로 옮겨간 뒤에도 배선이 안 따라와서, 대표가 「지금 발행」을 누르면
//    가전 블로그가 아니라 옛 벤치마크 사이트가 올라갔다(08:57 · sitemap 20건).
//    그런데 콘솔에는 "발행 끝남 · 20건" 이라고 떴다 — 화면이 거짓말을 했다.
//    그래서 아래 GUARD 를 둔다. 엉뚱한 저장소에서 돌면 일하기 전에 죽는다.
import { execFileSync } from "node:child_process";

const REPO = "billyssam/gonghak-ops";
const FILE = "blog-queue.json";
const HERE = new URL(".", import.meta.url).pathname;
const NODE = "/opt/homebrew/bin/node";
const gh = (...a) => execFileSync("/opt/homebrew/bin/gh", a, { encoding: "utf-8", maxBuffer: 8 << 20 });

// ── GUARD. 내가 어느 저장소 안에 있는지 확인하고 시작한다.
const MUST_REMOTE = "billyssam/gajeon";
try {
  const remote = execFileSync("/usr/bin/git", ["-C", HERE, "remote", "get-url", "origin"], { encoding: "utf-8" }).trim();
  if (!remote.includes(MUST_REMOTE)) {
    console.error(`저장소가 다르다: ${remote} — ${MUST_REMOTE} 에서만 돈다`);
    process.exit(1);
  }
} catch (e) {
  console.error(`저장소 확인 실패: ${e.message}`);
  process.exit(1);
}

function read() {
  try {
    const j = JSON.parse(gh("api", `repos/${REPO}/contents/${FILE}`));
    return { sha: j.sha, data: JSON.parse(Buffer.from(j.content, "base64").toString("utf-8")) };
  } catch { return { sha: null, data: { jobs: [] } }; }
}
function write(data, sha, msg) {
  const args = ["api", "-X", "PUT", `repos/${REPO}/contents/${FILE}`, "-f", `message=${msg}`,
    "-f", "branch=main", "-f", `content=${Buffer.from(JSON.stringify(data, null, 1) + "\n").toString("base64")}`];
  if (sha) args.push("-f", `sha=${sha}`);
  gh(...args);
}

const { sha, data } = read();
const job = (data.jobs || []).find(j => j.status === "queued");
if (!job) { console.log("대기 중인 명령 없음"); process.exit(0); }

console.log(`가져감: ${job.action} (${job.id})`);
job.status = "claimed"; job.updated = new Date().toISOString();
write(data, sha, `worker: claim ${job.action}`);

// 실제 실행. 🔴 전부 ~/gajeon 의 스크립트다. 실패는 숨기지 않고 note 에 남긴다.
const CMD = {
  measure: ["/bin/bash", ["-lc", `cd ${HERE} && ${NODE} keywords.mjs`]],
  publish: ["/bin/bash", ["-lc", `cd ${HERE} && bash deploy-pages.sh`]],
  verify:  ["/bin/bash", ["-lc", `cd ${HERE} && ${NODE} build.mjs && ${NODE} check.mjs`]],
};
let ok = true, note = "";
try {
  const [bin, args] = CMD[job.action];
  const out = execFileSync(bin, args, { encoding: "utf-8", maxBuffer: 16 << 20, timeout: 50 * 60 * 1000 });
  note = out.trim().split("\n").slice(-1)[0].slice(0, 160);
} catch (e) {
  ok = false;
  note = String(e.stdout || e.message || e).trim().split("\n").slice(-1)[0].slice(0, 160);
}

const cur = read();
const j2 = (cur.data.jobs || []).find(x => x.id === job.id);
if (j2) { j2.status = ok ? "done" : "failed"; j2.note = note; j2.updated = new Date().toISOString(); }
write(cur.data, cur.sha, `worker: ${ok ? "done" : "failed"} ${job.action}`);
console.log(`${ok ? "끝" : "실패"}: ${note}`);
process.exit(ok ? 0 : 1);
