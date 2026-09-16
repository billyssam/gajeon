const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../worker-blog.mjs'),'utf8');
const body=source.slice(source.indexOf('function autoPick(data)'),source.indexOf('\nasync function run()'));
const context={Date};vm.runInNewContext(body,context);
const today=new Date().toISOString();
const topics=[{cat:'home',topic:'홈 신규'},{cat:'baby',topic:'육아 신규'}];
test('today review output occupies its category production slot without requiring public release',()=>{
 const result=context.autoPick({topics,cats:[{key:'home'},{key:'baby'}],drafts:[{cat:'home',title:'이미 만든 원고',status:'review',created:today}],today:{goal:1,done:{}}});
 assert.equal(result.cat,'baby');
});
test('queued work prevents a second automatic selection for its category',()=>{
 assert.equal(context.autoPick({topics:topics.slice(0,1),picks:[{topic:'기존 원고',cat:'home',status:'queued'}],today:{goal:1,done:{}}}),null);
});
