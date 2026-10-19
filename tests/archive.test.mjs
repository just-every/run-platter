import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { getPlatformProxy } from 'wrangler'
import { harness } from './harness.mjs'
const exec = promisify(execFile)
const cli = resolve('node_modules/@runeditrun/rer/global/rer.mjs')
const command = async (cwd, args, expected = 0) => {
  let result
  // These commands own a separate checkout, not the parent verify operation.
  const env = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' }
  delete env.RER_LOCAL_OPERATION
  delete env.RER_LOCAL_STATE_PATH
  try { result = { ...await exec(process.execPath, [cli, ...args], { cwd, env, maxBuffer: 2e6 }), code: 0 } }
  catch (error) { result = error }
  assert.equal(result.code, expected, `${args[0]}: ${result.stdout ?? ''} ${result.stderr ?? ''}`)
}
async function checkout(root) {
  await mkdir(root)
  for (const name of ['package.json','pnpm-lock.yaml','OPERATIONS.json','RUN-LOCALLY.md','ACCEPTANCE.md','SEED-COMMAND-CONTRACT.md','OPERATIONS.md','.node-version','wrangler.jsonc','deploy.json','rer-setup.json','scripts','src','migrations']) await cp(name, join(root,name), { recursive: true })
  await symlink(resolve('node_modules'), join(root,'node_modules'), 'dir')
}
// This journey follows every business record currently creatable in Platter.
// Future product capabilities extend this fixture when their public doors ship.
test('PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences', { timeout: 240_000 }, async () => {
  const temporary = await mkdtemp(join(tmpdir(),'platter-archive-')), source=join(temporary,'source'), restored=join(temporary,'restored'), erased=join(temporary,'erased')
  let h
  try {
    for (const path of [source,restored,erased]) await checkout(path)
    await exec(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','foundation','--local'], { cwd:source, env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}, maxBuffer:2e6 })
    h=await harness({root:source})
    const p=await h.cmd('client.save',{name:'Temporary joiner',email:'temporary@studio.example'})
    const key=await h.cmd('agent.create',{label:'Excluded secret'})
    assert.equal((await h.send('/api/platter/agent/context',undefined,'',{authorization:'Bearer '+key.token})).status,200)
    const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
    const offer={clientId:client.id,title:'Campaign agreement',scope:'Studio photographs and usage licence',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'}
    const proposal=await h.cmd('proposal.prepare',offer)
    await h.cmd('proposal.approve',{id:proposal.id,version:1,revision:1})
    await h.cmd('proposal.revise',{...offer,id:proposal.id,version:2,scope:'Studio photographs, usage licence and delivery'})
    await h.cmd('proposal.approve',{id:proposal.id,version:3,revision:2})
    const shared=await h.cmd('proposal.send',{id:proposal.id,version:4}),path=new URL(shared.shareUrl).pathname
    assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
    const code=(await h.state()).outbox.find(x=>x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    const verified=await h.send(path+'/action?name=code.verify',{code})
    assert.equal(verified.status,200)
    assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},verified.cookie)).status,200)
    const invoice=await h.cmd('invoice.export',{id:proposal.id})
    const invoicePath='/api/platter/invoices/'+invoice.id+'.csv'
    const invoiceCsv=(await h.send(invoicePath,undefined,h.owner)).text
    const pending=await h.cmd('proposal.prepare',{...offer,title:'Pending client decision'})
    await h.cmd('proposal.approve',{id:pending.id,version:1,revision:1})
    const pendingShare=await h.cmd('proposal.send',{id:pending.id,version:2})
    await h.cmd('proposal.prepare',{...offer,title:'Work in progress'})
    const csv='client_id,name,email\narchive-import,Imported studio,imported@studio.example'
    const preview=await h.cmd('import.preview',{csv})
    assert.equal(preview.canApply,true)
    const imported=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint})
    assert.equal(imported.job.state,'completed')
    const journal=await h.cmd('import.journal',{id:imported.job.id})
    assert.ok(journal.originals.length>0)
    assert.ok(journal.batches.length>0)
    assert.ok(journal.provenance.length>0)
    const business=state=>({clients:state.clients,proposals:state.proposals.map(({delivery,shareToken,...proposal})=>proposal),importJobs:state.importJobs})
    const before=business(await h.state())
    assert.deepEqual(before.proposals.map(p=>p.status).sort(),['accepted','draft','sent'])
    const identity={auth:h.auth,owner:h.owner}
    await h.close();h=null
    const old=join(temporary,'before.rer'),later=join(temporary,'later.rer'),again=join(temporary,'again.rer')
    await command(source,['export','--output',old,'--no-queue'])
    const bytes=await readFile(old,'utf8')
    assert.ok(bytes.includes('Temporary joiner'))
    for(const excluded of ['Excluded secret','token_hash',key.token,createHash('sha256').update(key.token).digest('hex'),new URL(shared.shareUrl).pathname.slice(3),new URL(pendingShare.shareUrl).pathname.slice(3),verified.cookie.split('=')[1],identity.owner.split('=')[1]])assert.ok(!bytes.includes(excluded),'credentials and private invitations stay local')
    await command(restored,['import','--input',old,'--yes','--no-queue'])
    await command(restored,['export','--output',again,'--no-queue'])
    const rows=text=>text.split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.kind==='part')
    assert.ok(rows(bytes).length>0);assert.deepEqual(rows(await readFile(again,'utf8')),rows(bytes))
    const archived=rows(bytes).flatMap(part=>part.items).filter(item=>item.kind==='row')
    const revisions=archived.filter(item=>item.table==='p_revisions'&&item.row.proposal_id===proposal.id)
    const approvals=archived.filter(item=>item.table==='p_approvals'&&item.row.proposal_id===proposal.id)
    assert.equal(revisions.length,2)
    assert.equal(approvals.length,2)
    assert.ok(approvals.every(item=>item.row.actor_id===journal.job.principalId))
    h=await harness({root:restored,...identity})
    await h.state(identity.owner,401)
    assert.equal((await h.send('/api/platter/agent/context',undefined,'',{authorization:'Bearer '+key.token})).status,401)
    assert.equal((await h.send(path,undefined,verified.cookie)).status,404)
    const restoredOwner=await h.signIn(h.auth.OWNER_EMAIL)
    const restoredState=await h.state(restoredOwner)
    assert.deepEqual(business(restoredState),before)
    assert.deepEqual(restoredState.agentKeys,[])
    assert.deepEqual(restoredState.outbox,[])
    assert.ok(restoredState.proposals.every(p=>!p.shareToken&&!p.delivery))
    assert.deepEqual(await h.cmd('import.journal',{id:imported.job.id},restoredOwner),journal)
    assert.equal((await h.send(invoicePath,undefined,restoredOwner)).text,invoiceCsv)
    const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:restoredOwner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})
    assert.equal(setup.status,303)
    assert.equal((await h.send('/app/proposal?id='+proposal.id,undefined,restoredOwner)).status,200)
    await h.close();h=null
    await command(restored,['import','--input',old,'--yes','--no-queue'],4)
    const corrupt=join(temporary,'corrupt.rer');await writeFile(corrupt,bytes.replace('Temporary joiner','Changed joiner'),{mode:0o600})
    // Checksum damage is a transfer failure (1); restore policy conflicts remain 4.
    await command(erased,['import','--input',corrupt,'--yes','--no-queue'],1)
    h=await harness({root:source,...identity});await h.cmd('client.erase',{id:p.id,confirmName:'Temporary joiner'},await h.signIn(h.auth.OWNER_EMAIL));await h.close();h=null
    await command(source,['export','--output',later,'--no-queue'])
    await command(erased,['import','--input',old,'--journal',later,'--yes','--no-queue'],4)
    await command(erased,['import','--input',later,'--yes','--no-queue'])
    const proxy=await getPlatformProxy({configPath:join(erased,'wrangler.jsonc'),persist:{path:join(erased,'.wrangler/state/v3')},remoteBindings:false})
    try { assert.equal(await proxy.env.DB.prepare('SELECT name FROM p_clients WHERE id=?').bind(p.id).first(),null);assert.equal((await proxy.env.DB.prepare('SELECT total_cents,deposit_cents FROM p_acceptances WHERE proposal_id=?').bind(proposal.id).first()).deposit_cents,105000);assert.match((await proxy.env.DB.prepare('SELECT csv FROM p_invoices WHERE proposal_id=?').bind(proposal.id).first()).csv,/1050\.00/) }
    finally { await proxy.dispose() }
  } finally { if(h)await h.close();await rm(temporary,{recursive:true,force:true}) }
})

test('PRICE-008 public CLI restores first-release AUD bytes and new proposals and acceptances use USD without conversion', { timeout: 180_000 }, async () => {
 const temporary=await mkdtemp(join(tmpdir(),'platter-currency-')),target=join(temporary,'target')
 let h
 try {
  const input=join(temporary,'first-release-aud.rer'),records=text=>text.split('\n').filter(Boolean).map(JSON.parse).filter(item=>item.kind==='part').flatMap(part=>part.items).filter(item=>item.kind==='row')
  await writeFile(input,await readFile('fixtures/first-release-aud.rer'),{mode:0o600})
  const legacy=records(await readFile(input,'utf8')),accepted=legacy.find(item=>item.table==='p_acceptances').row,invoice=legacy.find(item=>item.table==='p_invoices').row,oldProposal=legacy.find(item=>item.table==='p_proposals').row
  const ownerEmail=legacy.find(item=>item.table==='oa_operators').row.email
  await checkout(target)
  await command(target,['import','--input',input,'--yes','--no-queue'])
  h=await harness({root:target,unclaimed:true,auth:{OWNER_EMAIL:ownerEmail}})
  const cookie=await h.signIn(ownerEmail),cmd=(name,input)=>h.cmd(name,input,cookie)
  const restored=(await h.state(cookie)).proposals.find(p=>p.id===accepted.proposal_id)
  assert.equal(restored.currency,'AUD');assert.equal(restored.acceptance.currency,'AUD')
  assert.equal(restored.acceptance.totalCents,accepted.total_cents);assert.equal(restored.acceptance.depositCents,accepted.deposit_cents)
  const retained=await cmd('invoice.export',{id:restored.id});assert.equal(retained.id,invoice.id);assert.equal(retained.currency,'AUD')
  assert.equal((await h.send('/api/platter/invoices/'+invoice.id+'.csv',undefined,cookie)).text,invoice.csv)
  const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
  const agreement=await h.send('/app/proposal?id='+restored.id,undefined,cookie);assert.equal(agreement.status,200);assert.match(agreement.text,/GST-free in AUD/);assert.match(agreement.text,/\$4,200\.00 AUD/);assert.match(agreement.text,/\$1,050\.00 AUD/)
  const created=await cmd('proposal.prepare',{clientId:oldProposal.client_id,title:'New USD campaign',scope:'One US campaign.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
  await cmd('proposal.revise',{clientId:oldProposal.client_id,id:created.id,version:1,title:'New USD campaign',scope:'One US campaign and handoff.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
  await cmd('proposal.approve',{id:created.id,version:2,revision:2})
  const shared=await cmd('proposal.send',{id:created.id,version:3}),path=new URL(shared.shareUrl).pathname
  let response=await h.send(path);assert.equal(response.status,200);assert.match(response.text,/USD/);assert.ok(!response.text.includes('GST-free'))
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
  const code=(await h.state(cookie)).outbox.find(message=>message.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
  const verified=await h.send(path+'/action?name=code.verify',{code});assert.equal(verified.status,200)
  response=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},verified.cookie);assert.equal(response.status,200);assert.match(response.text,/\$4,200\.00 USD/);assert.match(response.text,/\$1,050\.00 USD/)
  const current=(await h.state(cookie)).proposals.find(p=>p.id===created.id);assert.equal(current.currency,'USD');assert.equal(current.acceptance.currency,'USD');assert.equal(current.acceptance.totalCents,420000);assert.equal(current.acceptance.depositCents,105000)
  const usdInvoice=await cmd('invoice.export',{id:created.id});assert.equal(usdInvoice.currency,'USD');assert.match((await h.send('/api/platter/invoices/'+usdInvoice.id+'.csv',undefined,cookie)).text,/No Tax,USD/)
  await h.close();h=undefined
  const output=join(temporary,'after.rer');await command(target,['export','--output',output,'--no-queue'])
  const after=records(await readFile(output,'utf8'))
  for(const original of legacy.filter(item=>['p_proposals','p_revisions','p_acceptances','p_invoices'].includes(item.table))){
   const restored=after.find(item=>item.table===original.table&&(item.row.id===original.row.id&&original.row.id||item.row.proposal_id===original.row.proposal_id&&item.row.revision===original.row.revision))
   assert.ok(restored,original.table+' retained');const {currency,...unchanged}=restored.row
   assert.equal(currency,'AUD');assert.deepEqual(unchanged,original.row,original.table+' first-release bytes and amounts unchanged')
  }
 } finally {await h?.close();await rm(temporary,{recursive:true,force:true})}
})
