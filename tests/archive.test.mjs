import { pricingFixture, pricingExpected } from './pricing-fixture.mjs'
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
test('PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences', { timeout: 240_000 }, async () => {
  const temporary = await mkdtemp(join(tmpdir(),'platter-archive-')), source=join(temporary,'source'), restored=join(temporary,'restored'), erased=join(temporary,'erased')
  let h
  try {
    for (const path of [source,restored,erased]) await checkout(path)
    await exec(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','foundation','--local'], { cwd:source, env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}, maxBuffer:2e6 })
    h=await harness({root:source,assetsDirectory:'public'})
    const p=await h.cmd('client.save',{name:'Temporary joiner',email:'temporary@studio.example'})
    const key=await h.cmd('agent.create',{label:'Excluded secret'})
    assert.equal((await h.send('/api/platter/agent/context',undefined,'',{authorization:'Bearer '+key.token})).status,200)
    const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
    const offer={clientId:client.id,title:'Campaign agreement',scope:'Studio photographs and usage licence',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'}
    const finish=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(finish.status,303)
    const upload=async(fields,filename,bytes)=>{const form=new FormData();for(const [key,value] of Object.entries(fields))form.set(key,String(value));form.set('file',new File([bytes],filename,{type:'application/pdf'}));const request=new Request(h.origin+'/app/attachment',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner},body:form});const r=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});assert.equal(r.status,200);assert.match(await r.text(),/Document saved/)}
    const attachmentBytes=new Uint8Array(120000).map((_,i)=>i%256)
    await upload({kind:'w9'},'Northstar-W9.pdf',attachmentBytes)
    await upload({kind:'insurance'},'Northstar-insurance.pdf','%PDF insurance')
    const proposal=await h.cmd('proposal.prepare',offer)
    await h.cmd('proposal.approve',{id:proposal.id,version:1,revision:1})
    await h.cmd('proposal.revise',{...offer,id:proposal.id,version:2,scope:'Studio photographs, usage licence and delivery'})
    await h.cmd('proposal.approve',{id:proposal.id,version:3,revision:2})
    const shared=await h.cmd('proposal.send',{id:proposal.id,version:4}),path=new URL(shared.shareUrl).pathname
    assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
    const code=(await h.state()).outbox.find(x=>x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    const verified=await h.send(path+'/action?name=code.verify',{code})
    assert.equal(verified.status,200)
    assert.equal((await h.send(path+'/action?name=question.create',{revision:2,section:'pricing',text:'Does the campaign option include delivery?'},verified.cookie)).status,200)
    const answeredQuestion=(await h.state()).proposals.find(p=>p.id===proposal.id).questions[0]
    await h.cmd('question.answer',{id:proposal.id,questionId:answeredQuestion.id,text:'Yes, delivery is included in the campaign price.',requestId:crypto.randomUUID()})
    assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},verified.cookie)).status,200)
    const agreement=await h.send(path,undefined,verified.cookie)
    assert.match(agreement.text,/Does the campaign option include delivery\?/)
    assert.match(agreement.text,/Yes, delivery is included in the campaign price\./)
    const frozenAttachments=(await h.state()).proposals.find(p=>p.id===proposal.id).attachments
    await upload({kind:'w9'},'Northstar-W9-replacement.pdf','%PDF replacement')
    const invoice=await h.cmd('invoice.export',{id:proposal.id})
    const invoicePath='/api/platter/invoices/'+invoice.id+'.csv'
    const invoiceCsv=(await h.send(invoicePath,undefined,h.owner)).text
    const pending=await h.cmd('proposal.prepare',{...offer,title:'Pending client decision'})
    await h.cmd('proposal.approve',{id:pending.id,version:1,revision:1})
    const pendingShare=await h.cmd('proposal.send',{id:pending.id,version:2})
    await h.cmd('suggestions.allow',{id:pending.id,version:3,section:'scope',enabled:true})
    const suggestPath=new URL(pendingShare.shareUrl).pathname
    await h.send(suggestPath+'/action?name=code.request',{})
    const suggestCode=(await h.state()).outbox.find(x=>x.subject.includes('verification code')&&x.proposal_id===pending.id).body.match(/\b\d{6}\b/)[0]
    const suggestSession=await h.send(suggestPath+'/action?name=code.verify',{code:suggestCode})
    assert.equal((await h.send(suggestPath+'/action?name=question.create',{revision:1,section:'scope',text:'When will the first photographs be ready?'},suggestSession.cookie)).status,200)
    const unresolvedQuestion=(await h.state()).proposals.find(p=>p.id===pending.id).questions[0]
    assert.equal((await h.send(suggestPath+'/action?name=suggestion.create',{section:'scope',revision:1,original:'Studio photographs',replacement:'Negotiated campaign photographs'},suggestSession.cookie)).status,200)
    const suggestion=(await h.state()).proposals.find(p=>p.id===pending.id).suggestions[0]
    await h.cmd('suggestion.resolve',{id:pending.id,version:4,suggestionId:suggestion.id,decision:'accepted'})
    await h.cmd('proposal.approve',{id:pending.id,version:5,revision:2})
    const work=await h.cmd('proposal.prepare',{...offer,title:'Work in progress',pricingTables:pricingFixture(),terms:'Premium timeline: four weeks.',sectionConditions:{terms:'two'}})
    await upload({id:work.id,version:1},'Northstar-case-study.pdf','%PDF case study')
    const request=async()=>{const r=await h.send('/api/platter/agent/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'request_send',arguments:{id:work.id,revision:2}}},'',{authorization:'Bearer '+key.token});assert.equal(r.status,200);assert.ok(!r.value.result.isError);return JSON.parse(r.value.result.content[0].text).request}
    const dismissed=await request();await h.cmd('send-request.resolve',{id:dismissed.id,status:'dismissed'});await request()
    const pdf=await h.mf.dispatchFetch(h.origin+suggestPath+'/download.pdf?optionId=two',{headers:{cookie:suggestSession.cookie,host:new URL(h.origin).host}});assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');await pdf.arrayBuffer()
    await h.cmd('pdf.downloads',{id:work.id,version:2,enabled:false})
    await h.cmd('expiry.set',{id:work.id,version:3,mode:'days',days:14,warningDays:1})
    let live=(await h.state()).proposals.find(p=>p.id===pending.id)
    await h.cmd('expiry.set',{id:pending.id,version:live.version,mode:'date',date:'2020-01-01'})
    assert.equal((await h.send(suggestPath+'/action?name=expiry.reopen',{},suggestSession.cookie)).status,200)
    live=(await h.state()).proposals.find(p=>p.id===pending.id)
    await h.cmd('expiry.set',{id:pending.id,version:live.version,mode:'date',date:'2099-01-01',warningDays:1})
    const beforeReopen=(await h.state()).proposals.find(p=>p.id===pending.id).expiry.reopenRequests
    assert.equal(beforeReopen.length,1)
    const expiryRequests=(await h.state()).proposals.find(p=>p.id===work.id).expiry
    const beforeRequests=(await h.send('/api/platter/send-requests',undefined,h.owner)).value.requests
    const csv='client_id,name,email\narchive-import,Imported studio,imported@studio.example'
    const preview=await h.cmd('import.preview',{csv})
    assert.equal(preview.canApply,true)
    const imported=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint})
    assert.equal(imported.job.state,'completed')
    const journal=await h.cmd('import.journal',{id:imported.job.id})
    assert.ok(journal.originals.length>0)
    assert.ok(journal.batches.length>0)
    assert.ok(journal.provenance.length>0)
    // Create a genuine reply capability through the production mail path. Only
    // Resend's network edge is replaced; no credential is inserted into D1.
    const localIdentity={auth:h.auth,owner:h.owner},sourceOrigin=h.origin,submittedMail=[]
    await h.close();h=null
    h=await harness({root:source,origin:sourceOrigin.replace('http:','https:'),...localIdentity,auth:{...localIdentity.auth,AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'archive-question-network-edge',MAIL_WEBHOOK_KEY:'archive-question-webhook-edge',QUESTION_REPLY_DOMAIN:'replies.example.com'},outboundService:async request=>{submittedMail.push(await request.json());return Response.json({id:'archive-question-mail-'+submittedMail.length})}})
    // The native hosted cookie differs from the local cookie. Sign in through
    // Base's magic-link/confirmation doors and its captured auth-mail edge.
    const productionOwner=await h.signIn(localIdentity.auth.OWNER_EMAIL)
    await h.cmd('question.email',{id:pending.id,questionId:unresolvedQuestion.id},productionOwner)
    const replyAddress=submittedMail.find(message=>message.reply_to)?.reply_to
    assert.equal(typeof replyAddress,'string','FOLLOW-004 sends an actual provider Reply-To capability')
    const replyKey=replyAddress.match(/([a-f0-9]{64})@replies\.example\.com$/)?.[1]
    assert.ok(replyKey,'the provider receives the generated reply key')
    assert.ok((await h.db.prepare('SELECT COUNT(*) AS count FROM p_question_reply_keys').first()).count>0,'a reply capability exists before export')
    await h.close();h=null
    h=await harness({root:source,origin:sourceOrigin,assetsDirectory:'public',...localIdentity})
    const business=state=>({clients:state.clients,proposals:state.proposals.map(({delivery,deliveries,shareToken,...proposal})=>proposal),importJobs:state.importJobs})
    const withdrawn=await h.cmd('proposal.prepare',{...offer,title:'Withdrawn offer'})
    await h.cmd('proposal.approve',{id:withdrawn.id,version:1,revision:1});const withdrawnShare=await h.cmd('proposal.send',{id:withdrawn.id,version:2})
    await h.cmd('proposal.withdraw',{id:withdrawn.id,version:3,reason:'Sent to the wrong client'})
    const withdrawalHistory=(await h.state()).proposals.find(p=>p.id===withdrawn.id).withdrawals
    const duplicate=await h.cmd('proposal.duplicate',{id:work.id,version:4})
    const duplicateBefore=(await h.state()).proposals.find(p=>p.id===duplicate.id)
    assert.deepEqual(JSON.parse(duplicateBefore.section_conditions),{terms:'two'},'EDIT-009 duplicate preserves conditional sections')
    const clientPreview=await h.send(`/app/preview/client?id=${duplicate.id}&revision=1&optionId=two`,undefined,h.owner);assert.equal(clientPreview.status,200);assert.match(clientPreview.text,/Preview only/)
    await h.cmd('followup.schedule',{id:pending.id,action:'Call Avery about scope',dueDate:'2027-03-10'})
    await h.cmd('followup.schedule',{id:duplicate.id,action:'Review new scope',dueDate:'2027-03-11'})
    await h.cmd('followup.complete',{id:duplicate.id,action:'Reviewed scope with Avery by phone'})
    const followupsBefore=(await h.state()).followups.rows.map(({sentAt,...r})=>r)
    const actionsBefore=(await h.state()).followupActions
    const {packageFixture,packageSelection:packageItems,packageExpected}=await import('./packages-fixture.mjs')
    const packages=await h.cmd('proposal.prepare',{...offer,title:'Archived package choices',packages:packageFixture(),terms:'Rush delivery terms apply.',sectionConditions:{terms:'item:rush'}})
    await h.cmd('proposal.approve',{id:packages.id,version:1,revision:1});const packageShare=await h.cmd('proposal.send',{id:packages.id,version:2}),packagePath=new URL(packageShare.shareUrl).pathname
    await h.send(packagePath+'/action?name=code.request',{})
    const packageCode=(await h.state()).outbox.find(x=>x.proposal_id===packages.id&&x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    const packageVerified=await h.send(packagePath+'/action?name=code.verify',{code:packageCode})
    const packagePdf=await h.mf.dispatchFetch(h.origin+packagePath+'/download.pdf?optionId=two&items='+encodeURIComponent(JSON.stringify(packageItems)),{headers:{host:new URL(h.origin).host,cookie:packageVerified.cookie}});assert.equal(packagePdf.status,200);await packagePdf.arrayBuffer()
    assert.equal((await h.send(packagePath+'/action?name=accept',{name:'Avery Chen',optionId:'two',items:packageItems,consent:true},packageVerified.cookie)).status,200)
    const packagesBefore=(await h.state()).proposals.find(x=>x.id===packages.id)
    assert.equal(packagesBefore.acceptance.totalCents,packageExpected.totalCents);assert.equal(packagesBefore.acceptance.depositCents,packageExpected.depositCents)
    // PRICE-002 / SIGN-008: uploaded-paper choices and original file are product records too.
    const paper=await h.cmd('proposal.prepare',{...offer,title:'Archived signed-copy package',packages:packageFixture()})
    await h.cmd('proposal.approve',{id:paper.id,version:1,revision:1});await h.cmd('proposal.send',{id:paper.id,version:2})
    const paperBytes=new TextEncoder().encode('%PDF Growth plus Rush delivery quantity four'),paperForm=new FormData()
    for(const [key,value]of Object.entries({id:paper.id,version:3,optionId:'two',items:JSON.stringify(packageItems),signer:'Morgan Lee',signedOn:'2026-10-15',attest:'yes'}))paperForm.set(key,String(value))
    paperForm.set('file',new File([paperBytes],'archived-package-signed.pdf',{type:'application/pdf'}))
    const paperRequest=new Request(h.origin+'/app/paper-acceptance',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner},body:paperForm})
    const paperResponse=await h.mf.dispatchFetch(paperRequest.url,{method:'POST',headers:paperRequest.headers,body:await paperRequest.arrayBuffer()});assert.equal(paperResponse.status,200,await paperResponse.text())
    const paperBefore=(await h.state()).proposals.find(x=>x.id===paper.id)
    assert.equal(paperBefore.acceptance.method,'upload');assert.equal(paperBefore.acceptance.totalCents,packageExpected.totalCents);assert.equal(paperBefore.acceptance.depositCents,packageExpected.depositCents);assert.equal(paperBefore.acceptance.selection.items[0].quantity,4)
    const paperInvoice=await h.cmd('invoice.export',{id:paper.id}),paperInvoicePath='/api/platter/invoices/'+paperInvoice.id+'.csv',paperCsv=(await h.send(paperInvoicePath,undefined,h.owner)).text
    assert.match(paperCsv,/575\.25/)
    const beforeVendorDocuments=(await h.state()).vendorDocuments
    const before=business(await h.state())
    const acceptedThread=before.proposals.find(p=>p.id===proposal.id).questions
    const openThread=before.proposals.find(p=>p.id===pending.id).questions
    assert.equal(acceptedThread.length,1)
    assert.equal(acceptedThread[0].answers.length,1)
    assert.equal(acceptedThread[0].answers[0].text,'Yes, delivery is included in the campaign price.')
    assert.equal(openThread.length,1)
    assert.equal(openThread[0].answers.length,0)
    const beforeAudit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows.map(({reason,...row})=>row)
    assert.ok(beforeAudit.some(row=>row.action==='proposal.preview'&&row.subject===duplicate.id&&row.actor_role==='owner'),'EDIT-018 / TEAM-004 preview action is retained without payload or invitation authority')
    assert.deepEqual(before.proposals.map(p=>p.status).sort(),['accepted','accepted','accepted','approved','draft','draft','withdrawn'])
    const identity={auth:h.auth,owner:h.owner}
    await h.close();h=null
    const old=join(temporary,'before.rer'),later=join(temporary,'later.rer'),again=join(temporary,'again.rer')
    await command(source,['export','--output',old,'--no-queue'])
    const bytes=await readFile(old,'utf8')
    assert.ok(bytes.includes('Temporary joiner'))
    for(const excluded of [replyKey,replyAddress,createHash('sha256').update(replyKey).digest('hex'),productionOwner.split('=')[1]])assert.ok(!bytes.includes(excluded),'FOLLOW-004 reply capability, hosted session and transport stay local')
    for(const excluded of ['Excluded secret','token_hash',key.token,createHash('sha256').update(key.token).digest('hex'),new URL(withdrawnShare.shareUrl).pathname.slice(3),new URL(shared.shareUrl).pathname.slice(3),new URL(pendingShare.shareUrl).pathname.slice(3),verified.cookie.split('=')[1],identity.owner.split('=')[1]])assert.ok(!bytes.includes(excluded),'credentials and private invitations stay local')
    await command(restored,['import','--input',old,'--yes','--no-queue'])
    await command(restored,['export','--output',again,'--no-queue'])
    const rows=text=>text.split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.kind==='part')
    assert.ok(rows(bytes).length>0);assert.deepEqual(rows(await readFile(again,'utf8')),rows(bytes))
    const archived=rows(bytes).flatMap(part=>part.items).filter(item=>item.kind==='row')
    assert.equal(archived.filter(item=>item.table==='p_questions').length,2,'FOLLOW-004 retains answered and unanswered questions')
    assert.equal(archived.filter(item=>item.table==='p_question_answers').length,1,'FOLLOW-004 retains the answer')
    assert.equal(archived.filter(item=>item.table==='p_question_reply_keys').length,0,'FOLLOW-004 reply credentials are not archived')
    assert.deepEqual(archived.filter(item=>item.table==='p_audit').map(item=>item.row).sort((a,b)=>a.occurred_at-b.occurred_at||a.id.localeCompare(b.id)),beforeAudit,'TEAM-004 audit survives the public CLI archive exactly')
    const requests=archived.filter(item=>item.table==='p_send_requests').map(item=>item.row)
    assert.equal(requests.length,2)
    for(const row of requests)assert.deepEqual(row,Object.fromEntries(Object.keys(row).map(field=>[field,beforeRequests.find(r=>r.id===row.id)[field]])),'AI-003 request and resolution custody survives the CLI archive')
    const revisions=archived.filter(item=>item.table==='p_revisions'&&item.row.proposal_id===proposal.id)
    const approvals=archived.filter(item=>item.table==='p_approvals'&&item.row.proposal_id===proposal.id)
    assert.equal(revisions.length,2)
    assert.equal(approvals.length,2)
    assert.equal(archived.filter(item=>item.table==='p_negotiations').length,1)
    assert.equal(archived.filter(item=>item.table==='p_suggestions')[0].row.decision,'accepted','NEG-002 tracked decision survives CLI restore')
    assert.equal(archived.filter(item=>item.table==='p_suggestion_sections').length,1)
    assert.ok(approvals.every(item=>item.row.actor_id===journal.job.principalId))
    h=await harness({root:restored,...identity})
    await h.state(identity.owner,401)
    assert.equal((await h.send('/api/platter/agent/context',undefined,'',{authorization:'Bearer '+key.token})).status,401)
    assert.equal((await h.send(path,undefined,verified.cookie)).status,404)
    const restoredOwner=await h.signIn(h.auth.OWNER_EMAIL)
    const restoredState=await h.state(restoredOwner)
    assert.deepEqual(business(restoredState),before)
    assert.deepEqual(restoredState.followupActions,actionsBefore,'FOLLOW-002 logged actions survive public CLI restore exactly')
    assert.deepEqual(restoredState.followups.rows.map(({sentAt,...r})=>r),followupsBefore,'FOLLOW-002 open and completed actions survive public CLI restore')
    assert.deepEqual(restoredState.proposals.find(p=>p.id===proposal.id).questions,acceptedThread,'FOLLOW-004 agreement thread survives public CLI restore exactly')
    assert.deepEqual(restoredState.proposals.find(p=>p.id===pending.id).questions,openThread,'FOLLOW-004 unanswered question survives public CLI restore exactly')
    assert.equal((await h.db.prepare('SELECT COUNT(*) AS count FROM p_question_reply_keys').first()).count,0,'restoring business threads never restores email reply authority')
    assert.deepEqual(restoredState.proposals.find(p=>p.id===withdrawn.id).withdrawals,withdrawalHistory,'SEND-010 history survives CLI restore without invitation authority')
    assert.equal(restoredState.proposals.find(p=>p.id===withdrawn.id).status,'withdrawn')
    await h.cmd('proposal.send',{id:withdrawn.id,version:4},restoredOwner,409)
    assert.equal(archived.filter(item=>item.table==='p_withdrawn_links').length,0)
    assert.deepEqual(restoredState.proposals.find(p=>p.id===duplicate.id),duplicateBefore,'EDIT-012 copied content, files and delivery configuration survive CLI restore exactly')
    assert.equal(restoredState.proposals.find(p=>p.id===work.id).options[0].cents,pricingExpected.grandCents,'PRICE-001 server totals survive public CLI restore')
    assert.deepEqual(restoredState.proposals.find(p=>p.id===work.id).options, before.proposals.find(p=>p.id===work.id).options,'PRICE-001 all table, line, quantity, unit, group and subtotal fields survive public CLI restore exactly')
    assert.deepEqual(restoredState.proposals.find(x=>x.id===packages.id).acceptance,packagesBefore.acceptance,'PRICE-002 immutable selected quantities and totals survive public CLI restore')
    assert.deepEqual(restoredState.proposals.find(x=>x.id===packages.id).options,packagesBefore.options,'PRICE-002 package definitions and bounded optional items survive public CLI restore')
    assert.deepEqual(restoredState.proposals.find(x=>x.id===packages.id).pdfDownloads,packagesBefore.pdfDownloads,'PRICE-002 selected PDF timeline survives public CLI restore')
    assert.deepEqual(JSON.parse(restoredState.proposals.find(x=>x.id===packages.id).section_conditions),{terms:'item:rush'},'PRICE-002 / EDIT-009 optional-item section condition survives public CLI restore')
    assert.equal(JSON.parse((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(packages.id).first()).snapshot).terms,'Rush delivery terms apply.','PRICE-002 / EDIT-009 agreement keeps the section its added optional item showed')
    assert.deepEqual(restoredState.proposals.find(x=>x.id===paper.id).acceptance,paperBefore.acceptance,'PRICE-002 / SIGN-008 selected upload, attestation and file metadata survive public CLI restore')
    assert.equal((await h.send(paperInvoicePath,undefined,restoredOwner)).text,paperCsv,'PRICE-002 selected deposit invoice survives restore byte-identically')
    const paperFile=await h.mf.dispatchFetch(h.origin+'/api/platter/attachments/'+paper.id+'/'+paperBefore.acceptance.signedCopy.id,{headers:{host:new URL(h.origin).host,cookie:restoredOwner}});assert.equal(paperFile.status,200);assert.deepEqual(new Uint8Array(await paperFile.arrayBuffer()),paperBytes,'SIGN-008 original signed copy survives restore byte-identically')

    assert.deepEqual(restoredState.agentKeys,[])
    assert.deepEqual((await h.send('/api/platter/send-requests',undefined,restoredOwner)).value.requests,beforeRequests)
    assert.equal((await h.send('/api/platter/agent/mcp',{jsonrpc:'2.0',id:1,method:'ping'},'',{authorization:'Bearer '+key.token})).status,401)
    assert.deepEqual(restoredState.outbox,[])
    assert.ok(restoredState.proposals.every(p=>!p.shareToken&&!p.delivery&&p.deliveries.length===0))
    assert.deepEqual(await h.cmd('import.journal',{id:imported.job.id},restoredOwner),journal)
    assert.equal((await h.send(invoicePath,undefined,restoredOwner)).text,invoiceCsv)
    for(const file of frozenAttachments){const r=await h.mf.dispatchFetch(h.origin+'/api/platter/attachments/'+proposal.id+'/'+file.id,{headers:{cookie:restoredOwner,host:new URL(h.origin).host}});assert.equal(r.status,200);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),file.kind==='w9'?attachmentBytes:new TextEncoder().encode('%PDF insurance'))}
    assert.equal(restoredState.proposals.find(p=>p.id===pending.id).pdfDownloads.length,1,'EDIT-014 download timeline survives CLI restore')
    assert.deepEqual(restoredState.proposals.find(p=>p.id===pending.id).expiry.reopenRequests,beforeReopen,'SEND-004 reopen request and resolution survive CLI restore')
    assert.deepEqual(restoredState.proposals.find(p=>p.id===work.id).expiry,expiryRequests,'SEND-004 per-proposal expiry settings survive CLI restore')
    assert.equal(restoredState.proposals.find(p=>p.id===work.id).pdfDownloadsEnabled,false,'EDIT-014 per-proposal PDF policy survives CLI restore')
    assert.deepEqual(restoredState.vendorDocuments,beforeVendorDocuments,'EDIT-010 current defaults and all replaced originals survive CLI restore')
    const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:restoredOwner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})
    assert.equal(setup.status,303)
    assert.equal((await h.send('/app/proposal?id='+proposal.id,undefined,restoredOwner)).status,200)
    const paperPage=await h.send('/app/proposal?id='+paper.id,undefined,restoredOwner);assert.equal(paperPage.status,200);assert.match(paperPage.text,/2,301\.00/);assert.match(paperPage.text,/575\.25/);assert.match(paperPage.text,/Rush delivery/)
    const standard=await h.send(`/app/preview/client?id=${duplicate.id}&revision=1&optionId=one`,undefined,restoredOwner),premium=await h.send(`/app/preview/client?id=${duplicate.id}&revision=1&optionId=two`,undefined,restoredOwner)
    assert.match(standard.text,/403\.89/);assert.match(standard.text,/Project services/);assert.equal(standard.status,200);assert.equal(premium.status,200);assert.ok(!standard.text.includes('Premium timeline: four weeks.'));assert.ok(premium.text.includes('Premium timeline: four weeks.'),'EDIT-009 restored conditions remain functional')
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

test('PRICE-002 / EDIT-012 / REPORT-001 / PRICE-008 public CLI restores first-release AUD bytes and new proposals and acceptances use USD without conversion', { timeout: 180_000 }, async () => {
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
  const pipeline=await h.send('/api/platter/pipeline',undefined,cookie);assert.equal(pipeline.status,200)
  assert.equal(pipeline.value.rows.find(p=>p.id===oldProposal.id).ownerId,null);assert.equal(pipeline.value.rows.find(p=>p.id===oldProposal.id).owner,'Not recorded')
  assert.equal(pipeline.value.totals.find(t=>t.currency==='AUD').valueCents,accepted.total_cents);assert.equal(pipeline.value.totals.find(t=>t.currency==='USD').valueCents,420000)
  const usdInvoice=await cmd('invoice.export',{id:created.id});assert.equal(usdInvoice.currency,'USD');assert.match((await h.send('/api/platter/invoices/'+usdInvoice.id+'.csv',undefined,cookie)).text,/No Tax,USD/)
  const audCopy=await cmd('proposal.duplicate',{id:restored.id,version:restored.version}),copied=(await h.state(cookie)).proposals.find(p=>p.id===audCopy.id)
  const {packageFixture}=await import('./packages-fixture.mjs')
  await h.cmd('proposal.revise',{id:audCopy.id,version:1,packages:packageFixture()},cookie,409)
  assert.deepEqual((await h.state(cookie)).proposals.find(p=>p.id===audCopy.id).options,copied.options,'PRICE-002 cannot rewrite historical AUD pricing into the new package form')

  assert.equal(copied.currency,'AUD');assert.deepEqual(copied.options,restored.options);assert.equal(copied.deposit_bps,restored.deposit_bps);assert.equal(copied.acceptance,undefined);assert.equal(copied.status,'draft')
  await h.close();h=undefined
  const output=join(temporary,'after.rer');await command(target,['export','--output',output,'--no-queue'])
  const after=records(await readFile(output,'utf8'))
  for(const original of legacy.filter(item=>['p_proposals','p_revisions','p_acceptances','p_invoices'].includes(item.table))){
   const matches=after.filter(item=>item.table===original.table&&(Object.hasOwn(original.row,'id')
    ? item.row.id===original.row.id
    : item.row.proposal_id===original.row.proposal_id&&item.row.revision===original.row.revision))
   assert.equal(matches.length,1,original.table+' retained exactly once by its primary key')
   const {currency,previous_sent_revision,sales_owner_id,sales_owner_name,terms,attachments,section_conditions,...unchanged}=matches[0].row
   if(original.table==='p_proposals'){assert.deepEqual(JSON.parse(section_conditions),{},'EDIT-009 legacy proposals remain unconditional');assert.equal(terms,'');assert.deepEqual(JSON.parse(attachments),[]);assert.equal(previous_sent_revision,null,'legacy proposal has no earlier sent revision');assert.equal(sales_owner_id,null);assert.equal(sales_owner_name,null,'legacy sales ownership is not inferred')}
   assert.equal(currency,'AUD');assert.deepEqual(unchanged,original.row,original.table+' first-release bytes and amounts unchanged')
  }
 } finally {await h?.close();await rm(temporary,{recursive:true,force:true})}
})

test('SEND-002 public CLI preserves bounce follow-ups and logged action without provider events or invitation credentials', {timeout:180000}, async()=>{
 const {resendEvents}=await import('./delivery-provider.mjs')
 const temporary=await mkdtemp(join(tmpdir(),'platter-delivery-archive-')),source=join(temporary,'source'),restored=join(temporary,'restored')
 let h
 try{
  for(const path of [source,restored])await checkout(path)
  await exec(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','foundation','--local'],{cwd:source,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},maxBuffer:2e6})
  const events=resendEvents();let submitted=0
  h=await harness({root:source,origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'network-edge-key',MAIL_WEBHOOK_KEY:events.key},outboundService:()=>Response.json({id:'archive-provider-'+(++submitted)})})
  const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
  const offer={clientId:client.id,title:'Brand campaign',scope:'Studio photographs and usage licence',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'}
  const ids=[]
  for(let i=0;i<2;i++){const p=await h.cmd('proposal.prepare',offer);ids.push(p.id);await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});await h.cmd('proposal.send',{id:p.id,version:2});assert.equal((await events.emit(h,'archive-provider-'+(i+1),'email.bounced')).status,200)}
  let notices=(await h.state()).bounceNotices
  await h.cmd('delivery.read',{noticeId:notices[0].id})
  await h.cmd('delivery.dismiss',{noticeId:notices[0].id,reason:'Spoke with Avery; offer paused'})
  notices=(await h.state()).bounceNotices
  assert.equal(notices.length,2);assert.ok(notices.some(n=>n.closed_at));assert.ok(notices.some(n=>!n.closed_at))
  const identity={auth:h.auth,owner:h.owner};await h.close();h=null
  const file=join(temporary,'delivery.rer');await command(source,['export','--output',file,'--no-queue'])
  const bytes=await readFile(file,'utf8')
  assert.ok(bytes.includes('Spoke with Avery; offer paused'))
  assert.ok(!bytes.includes(events.key));assert.ok(!bytes.includes('archive-provider-'))
  await command(restored,['import','--input',file,'--yes','--no-queue'])
  h=await harness({root:restored,origin:'https://platter.example',...identity,outboundService:()=>Response.json({id:'restored-correction'})})
  const cookie=await h.signIn(identity.auth.OWNER_EMAIL)
  assert.deepEqual((await h.state(cookie)).bounceNotices,notices)
  assert.ok((await h.state(cookie)).proposals.every(p=>p.deliveries.length===0&&!p.shareToken))
  const open=notices.find(n=>!n.closed_at)
  await h.cmd('delivery.correct',{noticeId:open.id,email:'corrected@northstar.example'},cookie)
  assert.ok((await h.state(cookie)).bounceNotices.find(n=>n.id===open.id).closed_at)
 }finally{await h?.close();await rm(temporary,{recursive:true,force:true})}
})

test('MIG-006 public CLI archives imported business records, original CSV and image bytes with undo custody', {timeout:180000},async()=>{
 const {businessCsv,applyBusiness,undoBusiness,fileHost}=await import('./business-import-fixture.mjs')
 const temporary=await mkdtemp(join(tmpdir(),'platter-business-archive-')),source=join(temporary,'source'),restored=join(temporary,'restored')
 let h
 try{
  for(const path of [source,restored])await checkout(path)
  await exec(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','foundation','--local'],{cwd:source,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},maxBuffer:2e6})
  const options={alias:{'cloudflare:sockets':'./tests/catalog-socket-edge.ts'},outboundService:r=>fileHost(r)}
  h=await harness({root:source,...options})
  const contacts=await applyBusiness(h,{kind:'contacts',format:'platter',csv:await businessCsv('platter-contacts.csv')})
  const catalog=await applyBusiness(h,{kind:'catalog',format:'pandadoc',csv:await businessCsv('pandadoc-catalog.csv')})
  const before=(await h.state()).businessRecords,journal=await h.cmd('business-import.journal',{id:catalog.job.id})
  const identity={auth:h.auth,owner:h.owner};await h.close();h=null
  const file=join(temporary,'business.rer');await command(source,['export','--output',file,'--no-queue']);await command(restored,['import','--input',file,'--yes','--no-queue'])
  h=await harness({root:restored,...identity,...options})
  const cookie=await h.signIn(identity.auth.OWNER_EMAIL)
  assert.deepEqual((await h.state(cookie)).businessRecords,before)
  const after=await h.cmd('business-import.journal',{id:catalog.job.id},cookie)
  assert.deepEqual(after.originals,journal.originals);assert.deepEqual(after.provenance,journal.provenance)
  const image=before.catalog.find(c=>c.images.length).images[0]
  const original=after.originals.find(o=>o.name===image.artifact)
  assert.deepEqual(Buffer.from(original.original.base64,'base64'),await readFile('fixtures/business/brand.png'))
  await undoBusiness(h,catalog.job.id,cookie);await undoBusiness(h,contacts.job.id,cookie)
  assert.deepEqual((await h.state(cookie)).businessRecords,{companies:[],contacts:[],catalog:[]})
 }finally{await h?.close();await rm(temporary,{recursive:true,force:true})}
})
