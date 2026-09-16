const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../watch.mjs'),'utf8').replace(/^import .*;$/gm,'').replace('new URL(".", import.meta.url).pathname','"/fixture/"');
function run(options={}) {
 let data={jobs:[{id:'a',action:options.action||'verify',status:'queued'}]},sha=1,writes=0,commands=0,conflicted=false;
 const files=new Map(),process={pid:456,exitCode:0,exit(c){throw Error('exit '+c)},kill(){const e=Error();e.code='ESRCH';throw e}};
 const execFileSync=(bin,args)=>{
  if(bin==='/usr/bin/git') return 'https://github.com/billyssam/gajeon.git';
  if(bin==='/opt/homebrew/bin/gh') {
   if(options.unreadable) throw Error('GitHub unavailable');
   if(!args.includes('PUT')) return JSON.stringify({sha:String(sha),content:Buffer.from(JSON.stringify(data)).toString('base64')});
   if(options.conflict&&!conflicted) {conflicted=true;data.jobs.push({id:'b',action:'measure',status:'queued'});sha++;const e=Error('HTTP 409');e.stderr='HTTP 409';throw e;}
   const content=args.find(a=>a.startsWith('content=')).slice(8);
   data=JSON.parse(Buffer.from(content,'base64'));writes++;sha++;return '';
  }
  commands++;return 'PASS';
 };
 vm.runInNewContext(source,{execFileSync,mkdirSync(){},readFileSync(p){return files.get(p)},writeFileSync(p,v,o){if(o?.flag==='wx'&&files.has(p)){const e=Error();e.code='EEXIST';throw e;}files.set(p,v)},unlinkSync(p){files.delete(p)},process,Buffer,Date,console:{log(){},error(){}}});
 return {data,writes,commands,exit:process.exitCode,files};
}
test('GitHub read failure is an error and never overwrites the queue',()=>{
 const result=run({unreadable:true});assert.equal(result.exit,1);assert.equal(result.writes,0);assert.equal(result.commands,0);assert.equal(result.files.size,0);
});
test('claim conflict preserves newly queued jobs and executes each command once',()=>{
 const result=run({conflict:true});assert.equal(result.exit,0);assert.equal(result.commands,2);assert.equal(result.data.jobs[0].status,'done');assert.equal(result.data.jobs[1].status,'queued');
});
test('unknown command is rejected without launching a process',()=>{
 const result=run({action:'other-project'});assert.equal(result.exit,1);assert.equal(result.commands,0);assert.equal(result.data.jobs[0].code,'invalid_action');
});
