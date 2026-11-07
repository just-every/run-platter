const fs=require('fs'),vm=require('vm'),cp=require('child_process'),ts=require('/workspace/run-platter/node_modules/typescript');
const packet=process.env.HOME+'/rer-consolidation/work/sx-platter-ci-critical-path-1/packet';
function tasks(path){
 const code=fs.readFileSync(path,'utf8').replace("import { spawnSync } from 'node:child_process'",'');
 const commands=[];
 vm.runInNewContext(code,{process:{env:{},exit:c=>{throw Error(c)}},spawnSync:command=>{commands.push(command);return {status:0}}});
 const definitions=vm.runInNewContext(code.replace(/if\(shard&&!Object[\s\S]*/,'')+';JSON.stringify(tasks)',{process:{env:{}}});
 const parsed=JSON.parse(definitions); parsed.fullRun=commands; return JSON.stringify(parsed);
}
function inventory(file){
 const src=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),rows=[];
 function walk(node,parents=[]){
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&['test','describe'].includes(node.expression.text)){
   const n=node.arguments[0];
   if(!ts.isStringLiteralLike(n))throw Error('dynamic test name in '+file);
   const name=[...parents,n.text].join(' ');
   const type=node.expression.text;
   if(type==='test')rows.push({file,name,line:src.getLineAndCharacterOfPosition(node.pos).line+1});
   for(const child of node.arguments.slice(1))walk(child,type==='describe'?[...parents,n.text]:parents);
   return;
  }
  ts.forEachChild(node,c=>walk(c,parents));
 }
 walk(src);
 return rows;
}
const before=JSON.parse(tasks('/tmp/platter-verification-before.mjs'));
const after=JSON.parse(tasks('scripts/verification/run.mjs'));
const shards=['runtime','browser_documents','browser_commercial','business_authoring','business_lifecycle','archive_custody','archive_restore','archive_media'];
const files=['tests/platter.test.mjs','tests/demo.test.mjs','tests/mail.test.mjs','tests/archive.test.mjs','tests/site-lifecycle.mjs','tests/site-documents.mjs','tests/site.test.mjs'];
function matches(command,row){
 if(!command.includes('node --test'))return false;
 if(row.file.includes('site')){
  if(!command.includes('tests/site.test.mjs'))return false;
  if(row.file==='tests/site-lifecycle.mjs'&&!command.includes('PLATTER_BROWSER_SHARD=lifecycle'))return false;
  if(row.file!=='tests/site-lifecycle.mjs'&&!command.includes('PLATTER_BROWSER_SHARD=documents'))return false;
 }else if(!command.includes(row.file))return false;
 const include=command.match(/--test-name-pattern='([^']*)'/)?.[1];
 const exclude=command.match(/--test-skip-pattern='([^']*)'/)?.[1];
 return (!include||new RegExp(include).test(row.name))&&(!exclude||!new RegExp(exclude).test(row.name));
}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const expand=command=>command.replace('pnpm test:platter',pkg.scripts['test:platter']).replace('pnpm test:archive',pkg.scripts['test:archive']);
const rows=files.flatMap(inventory).map(row=>{
 const assigned=t=>shards.flatMap(s=>t[s].filter(c=>matches(c,row)).map(()=>s));
 return {...row,before:assigned(before),after:assigned(after),fullRunBefore:before.fullRun.map(expand).filter(c=>matches(c,row)).length,fullRunAfter:after.fullRun.map(expand).filter(c=>matches(c,row)).length};
});
for(const r of rows)if(r.before.length!==1||r.after.length!==1||r.fullRunBefore!==1||r.fullRunAfter!==1)throw Error('bad occurrence '+JSON.stringify(r));
const hashes=Object.fromEntries(files.map(f=>[f,cp.execFileSync('git',['hash-object',f],{encoding:'utf8'}).trim()]));
for(const [file,blob] of Object.entries(hashes)){
 const original=cp.execFileSync('git',['rev-parse','HEAD:'+file],{encoding:'utf8'}).trim();
 if(blob!==original)throw Error('assertion-bearing source changed: '+file);
}
const counts=t=>Object.fromEntries(shards.map(s=>[s,rows.filter(r=>r[t][0]===s).length]));
fs.writeFileSync(packet+'/mapping.json',JSON.stringify({totalBefore:rows.length,totalAfter:rows.length,countsBefore:counts('before'),countsAfter:counts('after'),testSourceBlobs:hashes,commandsBefore:Object.fromEntries(shards.map(s=>[s,before[s]])),fullRunCommandsBefore:before.fullRun,fullRunCommandsAfter:after.fullRun,commandsAfter:{core:after.core,...Object.fromEntries(shards.map(s=>[s,after[s]]))},rows},null,2)+'\n');
fs.writeFileSync(packet+'/MAPPING.md','# Complete test and journey mapping\n\nOne occurrence per full push Verify before and after. Nested suite names are included so filters use full test names. Each test callback retains all existing assertions; no assertion-bearing file changes.\n\n| File:line | Test/journey | Before | After |\n| --- | --- | --- | --- |\n'+rows.map(r=>'| '+r.file+':'+r.line+' | '+r.name.replaceAll('|','\\|')+' | '+r.before[0]+' | '+r.after[0]+' |').join('\n')+'\n');
console.log(JSON.stringify({total:rows.length,before:counts('before'),after:counts('after')},null,2));
