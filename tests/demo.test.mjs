import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { cp, mkdtemp, readFile, rm, stat, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './harness.mjs'

test('the demo opens on a lived-in studio and a send completes as mocked success',async()=>{
 const h=await harness({entry:'tests/demo-worker.ts',auth:{RER_DEMO:'1'}})
 try{
  const state=await h.state()
  assert.equal(state.clients.length,15);assert.equal(state.proposals.length,18);assert.deepEqual(state.outbox,[])
  const by=s=>state.proposals.filter(p=>p.status===s)
  assert.deepEqual(['draft','approved','sent','accepted'].map(s=>by(s).length),[4,2,4,8])
  assert.equal(by('accepted').filter(p=>p.acceptance&&p.invoice).length,6);assert.ok(state.proposals.some(p=>p.preparedByName==='Agent'&&p.status==='draft'))
  const pecan=state.proposals.find(p=>p.title==='Pecan Street Bakery · packaging refresh');assert.equal(pecan.acceptance.name,'Lucy Tran');assert.equal(pecan.acceptance.depositCents,230000)
  const page=await h.send('/app',undefined,h.owner);assert.equal(page.status,200);assert.equal(page.text.match(/<[a-z]+[^>]*\sdata-rer-name/g).length,1);assert.match(page.text,/<title>Proposals · Platter Demo<\/title>/);assert.doesNotMatch(page.text,/Demo Demo|Local development mail/)
  const ready=by('approved')[0];const share=await h.cmd('proposal.send',{id:ready.id,version:ready.version})
  const shared=await h.send(new URL(share.shareUrl).pathname,undefined,h.owner);assert.equal(shared.status,200,shared.text);assert.match(shared.text,new RegExp(ready.title))
  assert.equal((await h.state()).proposals.find(p=>p.id===ready.id).delivery,'accepted')
  const draft=by('draft')[0];await h.cmd('proposal.approve',{id:draft.id,version:draft.version,revision:draft.revision})
  const csv=await h.send(`/api/platter/invoices/${pecan.invoice.id}.csv`,undefined,h.owner);assert.equal(csv.status,200);assert.match(csv.text,/Lucy Tran|Pecan Street Bakery/)
  assert.equal((await h.state()).proposals.length,18,'the seed runs once')
 }finally{await h.close()}
})


test('hosting preflight refuses incomplete account access before any build or deployment', {timeout:30000},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'platter-preflight-'))
 try{
  for(const name of ['package.json','pnpm-lock.yaml','OPERATIONS.json','RUN-LOCALLY.md','ACCEPTANCE.md','SEED-COMMAND-CONTRACT.md','OPERATIONS.md','.node-version','wrangler.jsonc','deploy.json','rer-setup.json','scripts','src','migrations'])await cp(name,join(directory,name),{recursive:true})
  await symlink(resolve('node_modules'),join(directory,'node_modules'),'dir')
  const env={...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}
  const inputs=JSON.parse(await readFile('OPERATIONS.json','utf8')).requiredEnvironment
  for(const key of [...inputs,'RER_LOCAL_OPERATION','RER_LOCAL_STATE_PATH'])delete env[key]
  for(const args of [['deploy','--dry-run'],['deploy','--non-interactive']]){
   let result
   try{result=await promisify(execFile)(process.execPath,[resolve('node_modules/@runeditrun/rer/global/rer.mjs'),...args,'--no-queue'],{cwd:directory,env,maxBuffer:2e6})}catch(error){result=error}
   assert.equal(result.code,3,result.stdout+' '+result.stderr)
   const output=result.stdout+' '+result.stderr
   for(const name of inputs)assert.ok(output.split('\n').some(line=>line.includes(name)&&line.length>name.length+12),'the preflight explains each absent account input: '+output)
   assert.match(output,/rer deploy --dry-run/,'the refusal gives a command that can check the completed configuration without uploading')
   assert.ok(!await stat(join(directory,'dist')).catch(()=>null),'missing inputs stop before the build')
   assert.ok(!await stat(join(directory,'.rer/deploy')).catch(()=>null),'no deployment record or private deployment secrets were created')
  }
 }finally{await rm(directory,{recursive:true,force:true})}
})
