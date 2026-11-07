import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const source=fs.readFileSync('scripts/verification/run.mjs','utf8');
const prior=execFileSync('git',['show','31a16502e6e3f1333d29bee7ce0096216adde95d:scripts/verification/run.mjs'],{encoding:'utf8'});
const final=execFileSync('git',['show','2ca0bde5b85e32134bb2b987debaaaf6ee79c193:scripts/verification/run.mjs'],{encoding:'utf8'});
assert.equal(source,final,'script must equal final saved composition');
function commands(src,shard){const rows=[];vm.runInNewContext(src.replace("import { spawnSync } from 'node:child_process'",''),{process:{env:{PLATTER_VERIFY_SHARD:shard},exit:code=>{throw Error('exit '+code)}},spawnSync:cmd=>{rows.push(cmd);return {status:0}}});return rows;}
const shards=['runtime','browser_documents','browser_commercial','business_authoring','business_lifecycle','archive_custody','archive_restore','archive_media'];
const routes=Object.fromEntries(shards.map(s=>[s,commands(source,s)]));
for(const shard of shards)assert.deepEqual(routes[shard],commands(prior,shard),'measured shard commands preserved: '+shard);
const all=commands(source,undefined);
assert.equal(all.filter(c=>c.includes('PLATTER_BROWSER_SHARD=lifecycle')).length,1);
assert.equal(all.filter(c=>c==='pnpm test:platter').length,1);
assert.equal(all.filter(c=>c==='pnpm test:archive').length,1);
const check=(files,suffix)=>{
 const names=[];
 for(const file of files){const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/\btest\(\s*(['"`])([^\n]*?)\1/g))names.push({file,name:m[2]});}
 const cmds=Object.values(routes).flat().filter(c=>c.endsWith(suffix));
 for(const item of names){const matches=cmds.filter(c=>{const include=c.match(/--test-name-pattern='([^']+)'/);const exclude=c.match(/--test-skip-pattern='([^']+)'/);return (!include||new RegExp(include[1]).test(item.name))&&(!exclude||!new RegExp(exclude[1]).test(item.name));});assert.equal(matches.length,1,JSON.stringify(item));}
 return {literalTestNames:names.length,commands:cmds.length};
};
const business=check(['tests/platter.test.mjs','tests/demo.test.mjs','tests/mail.test.mjs'],'tests/platter.test.mjs tests/demo.test.mjs tests/mail.test.mjs');
const archive=check(['tests/archive.test.mjs'],'tests/archive.test.mjs');
const workflow=fs.readFileSync('.github/workflows/verify.yml','utf8');
assert.match(workflow,/timeout-minutes: 17/);
assert.equal(workflow.match(/shard: \[([^\]]+)\]/)[1].split(',').length,8);
assert.equal(execFileSync('git',['diff','origin/main','--','tests'],{encoding:'utf8'}),'');
console.log(JSON.stringify({status:'passed',matrixShards:8,business,archive,measuredShardCommands:'identical to 31a16502',finalSavedScript:'identical to 2ca0bde5',unshardedCommands:all,routes},null,2));
