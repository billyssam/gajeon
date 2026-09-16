// 콘솔 「블로그&구글」 탭에서 누른 명령을 가져와 실행한다. launchd 가 5분마다 부른다.
// 🔴 상태를 먼저 claimed 로 바꾸고 나서 일한다 — 안 그러면 다음 호출이 같은 일을 또 시작한다.
//
// 🔴🔴 2026-09-13: 이 워커가 원래 ~/agent-bench 에 있었고, 거기 스크립트를 돌렸다.
//    블로그가 ~/gajeon 으로 옮겨간 뒤에도 배선이 안 따라와서, 대표가 「지금 발행」을 누르면
//    가전 블로그가 아니라 옛 벤치마크 사이트가 올라갔다(08:57 · sitemap 20건).
//    그런데 콘솔에는 "발행 끝남 · 20건" 이라고 떴다 — 화면이 거짓말을 했다.
//    그래서 아래 GUARD 를 둔다. 엉뚱한 저장소에서 돌면 일하기 전에 죽는다.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";

const REPO = "billyssam/gonghak-ops";
const FILE = "blog-queue.json";
const HERE = new URL(".", import.meta.url).pathname;
const NODE = "/opt/homebrew/bin/node";
const gh = (...a) => execFileSync("/opt/homebrew/bin/gh", a, { encoding: "utf-8", maxBuffer: 8 << 20, timeout: 30000 });

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
  const j = JSON.parse(gh("api", `repos/${REPO}/contents/${FILE}`));
  const data = JSON.parse(Buffer.from(j.content, "base64").toString("utf-8"));
  if (!j.sha || !Array.isArray(data.jobs)) throw new Error("명령 상태 형식 오류");
  return { sha: j.sha, data };
}
function write(data, sha, msg) {
  gh("api", "-X", "PUT", `repos/${REPO}/contents/${FILE}`, "-f", `message=${msg}`,
    "-f", "branch=main", "-f", `content=${Buffer.from(JSON.stringify(data, null, 1) + "\n").toString("base64")}`,
    "-f", `sha=${sha}`);
}
// Each retry reads the latest queue and changes only this job. A competing claim wins.
function transition(id, expected, changes) {
  for (let attempt=0; attempt<3; attempt++) {
    const cur=read(), job=cur.data.jobs.find(x=>x.id===id);
    if (!job || job.status!==expected) return false;
    Object.assign(job, changes, {updated:new Date().toISOString()});
    try { write(cur.data,cur.sha,`worker: ${changes.status} ${job.action}`); return true; }
    catch(e) { if (!/409|conflict/i.test(String(e.stderr||e.message)) || attempt===2) throw e; }
  }
  return false;
}
const LOCK=HERE+".cache/blog-command.lock";
mkdirSync(HERE+".cache",{recursive:true});
function acquire() {
  try {writeFileSync(LOCK,String(process.pid),{flag:"wx"});return true;}
  catch(e) {
    if(e.code!=="EEXIST") throw e;
    const pid=Number(readFileSync(LOCK,"utf8"));
    if(!Number.isInteger(pid)||pid<=0) throw new Error("명령 잠금 형식 오류");
    try {process.kill(pid,0);return false;} catch(ex) {if(ex.code!=="ESRCH") throw ex;}
    unlinkSync(LOCK);
    try {writeFileSync(LOCK,String(process.pid),{flag:"wx"});return true;}
    catch(ex) {if(ex.code==="EEXIST") return false;throw ex;}
  }
}
// Paths are passed as arguments with cwd, never interpolated into shell command text.
const CMD = {
  measure: [NODE,["keywords.mjs"]],
  publish: ["/bin/bash",["deploy-pages.sh"]],
  verify: [NODE,["build.mjs"]],
};
let locked=false;
try {
  locked=acquire();
  if(!locked) {console.log("다른 명령 실행 중");process.exitCode=0;}
  else {
    const initial=read();
    // A dead process may have performed an external operation before dying. Do not duplicate it.
    for(const j of initial.data.jobs.filter(x=>x.status==="claimed")) {
      transition(j.id,"claimed",{status:"failed",note:"이전 명령 실행기가 종료됐습니다. 실제 결과 확인 전 중복 실행을 차단했습니다.",code:"execution_interrupted"});
    }
    const job=read().data.jobs.find(j=>j.status==="queued");
    if(!job) console.log("대기 중인 명령 없음");
    else if(!CMD[job.action]) {
      transition(job.id,"queued",{status:"failed",note:"지원하지 않는 블로그 명령",code:"invalid_action"});process.exitCode=1;
    } else if(transition(job.id,"queued",{status:"claimed",owner:process.pid,started:new Date().toISOString()})) {
      let ok=true,note="";
      try {
        const [bin,args]=CMD[job.action];
        const opts={cwd:HERE,encoding:"utf8",maxBuffer:16<<20,timeout:50*60*1000};
        let out=execFileSync(bin,args,opts);
        if(job.action==="verify") out+=execFileSync(NODE,["check.mjs"],opts);
        note=out.trim().split("\n").slice(-1)[0].slice(0,160);
      } catch(e) {
        ok=false;note=String(e.stderr||e.stdout||e.message||e).trim().split("\n").slice(-1)[0].slice(0,160);
      }
      if(!transition(job.id,"claimed",{status:ok?"done":"failed",note})) throw new Error("실행 결과 저장 전 명령 상태가 변경됐습니다");
      console.log(`${ok?"끝":"실패"}: ${note}`);process.exitCode=ok?0:1;
    }
  }
} catch(e) {console.error(`명령 실행기 장애: ${e.message}`);process.exitCode=1;}
finally {if(locked) unlinkSync(LOCK);}
