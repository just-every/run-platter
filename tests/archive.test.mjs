import { PDFDocument, StandardFonts } from 'pdf-lib'
import { documentFixture } from './document-fixture.mjs'
import { inboundMailFixture } from './inbound-mail-fixture.mjs'
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
  const started=performance.now()
  // These commands own a separate checkout, not the parent verify operation.
  const env = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' }
  delete env.RER_LOCAL_OPERATION
  delete env.RER_LOCAL_STATE_PATH
  try { result = { ...await exec(process.execPath, [cli, ...args], { cwd, env, maxBuffer: 2e6 }), code: 0 } }
  catch (error) { result = error }
  console.log('Archive CLI '+args[0]+' completed in '+Math.round(performance.now()-started)+' ms')
  assert.equal(result.code, expected, `${args[0]}: ${result.stdout ?? ''} ${result.stderr ?? ''}`)
}
async function checkout(root) {
  await mkdir(root)
  for (const name of ['package.json','pnpm-lock.yaml','OPERATIONS.json','RUN-LOCALLY.md','ACCEPTANCE.md','SEED-COMMAND-CONTRACT.md','OPERATIONS.md','.node-version','wrangler.jsonc','deploy.json','rer-setup.json','scripts','src','migrations']) await cp(name, join(root,name), { recursive: true })
  await symlink(resolve('node_modules'), join(root,'node_modules'), 'dir')
}
// This journey follows every business record currently creatable in Platter.
// Future product capabilities extend this fixture when their public doors ship.
test('FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences', { timeout: 240_000 }, async () => {
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
    const offer={document:documentFixture(),clientId:client.id,title:'Campaign agreement',scope:'Studio photographs and usage licence',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'}
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
    const business=state=>({clients:state.clients,proposals:state.proposals.map(({delivery,deliveries,shareToken,...proposal})=>proposal),importJobs:state.importJobs,templates:state.templates})
    const withdrawn=await h.cmd('proposal.prepare',{...offer,title:'Withdrawn offer'})
    await h.cmd('proposal.approve',{id:withdrawn.id,version:1,revision:1});const withdrawnShare=await h.cmd('proposal.send',{id:withdrawn.id,version:2})
    await h.cmd('proposal.withdraw',{id:withdrawn.id,version:3,reason:'Sent to the wrong client'})
    const declined=await h.cmd('proposal.prepare',{...offer,title:'Declined budget'})
    await h.cmd('proposal.approve',{id:declined.id,version:1,revision:1});const declinedShare=await h.cmd('proposal.send',{id:declined.id,version:2}),declinedPath=new URL(declinedShare.shareUrl).pathname
    await h.send(declinedPath+'/action?name=code.request',{})
    const declinedCode=(await h.state()).outbox.find(m=>m.proposal_id===declined.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    const declinedSession=await h.send(declinedPath+'/action?name=code.verify',{code:declinedCode})
    assert.equal((await h.send(declinedPath+'/action?name=decline',{revision:1,reason:'Budget'},declinedSession.cookie)).status,410)
    const lost=await h.cmd('proposal.prepare',{...offer,title:'Lost project'})
    await h.cmd('proposal.approve',{id:lost.id,version:1,revision:1});await h.cmd('proposal.send',{id:lost.id,version:2});await h.cmd('proposal.lose',{id:lost.id,version:3,reason:'Project cancelled'})
    const outcomeHistory=(await h.state()).proposals.filter(p=>[declined.id,lost.id].includes(p.id)).map(p=>({id:p.id,outcomes:p.outcomes,pipelineStatus:p.pipelineStatus}))
    const withdrawalHistory=(await h.state()).proposals.find(p=>p.id===withdrawn.id).withdrawals
    const duplicate=await h.cmd('proposal.duplicate',{id:work.id,version:4})
    const duplicateBefore=(await h.state()).proposals.find(p=>p.id===duplicate.id)
    assert.deepEqual(JSON.parse(duplicateBefore.section_conditions),{terms:'two'},'EDIT-009 duplicate preserves conditional sections')
    const clientPreview=await h.send(`/app/preview/client?id=${duplicate.id}&revision=1&optionId=two`,undefined,h.owner);assert.equal(clientPreview.status,200);assert.match(clientPreview.text,/Preview only/)
    await h.cmd('followup.schedule',{id:pending.id,action:'Call Avery about scope',dueDate:'2027-03-10'})
    await h.cmd('followup.schedule',{id:duplicate.id,action:'Review new scope',dueDate:'2027-03-11'})
    await h.cmd('followup.complete',{id:duplicate.id,action:'Reviewed scope with Avery by phone'})
    const starterBefore = await h.cmd('template.start', { id: 'starter:consultancy', version: 1, clientId: client.id })
    const starterSnapshot = (await h.state()).proposals.find(p => p.id === starterBefore.id)
    assert.match(starterSnapshot.scope, /Northstar Coffee/)
    assert.ok(starterSnapshot.options.every(o => o.tables[0].lines.length === 2))
    const followupsBefore=(await h.state()).followups.rows.map(({sentAt,...r})=>r)
    const actionsBefore=(await h.state()).followupActions
    const {packageFixture,packageSelection:packageItems,packageExpected,scheduleFixture}=await import('./packages-fixture.mjs')
    const packages=await h.cmd('proposal.prepare',{...offer,title:'Archived package choices',paymentTerms:scheduleFixture(),packages:packageFixture(),terms:'Rush delivery terms apply.',sectionConditions:{terms:'item:rush'}})
    await h.cmd('proposal.approve',{id:packages.id,version:1,revision:1});const packageShare=await h.cmd('proposal.send',{id:packages.id,version:2}),packagePath=new URL(packageShare.shareUrl).pathname
    await h.send(packagePath+'/action?name=code.request',{})
    const packageCode=(await h.state()).outbox.find(x=>x.proposal_id===packages.id&&x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    const packageVerified=await h.send(packagePath+'/action?name=code.verify',{code:packageCode})
    const packagePdf=await h.mf.dispatchFetch(h.origin+packagePath+'/download.pdf?optionId=two&items='+encodeURIComponent(JSON.stringify(packageItems)),{headers:{host:new URL(h.origin).host,cookie:packageVerified.cookie}});assert.equal(packagePdf.status,200);await packagePdf.arrayBuffer()
    assert.equal((await h.send(packagePath+'/action?name=accept',{name:'Avery Chen',optionId:'two',items:packageItems,consent:true},packageVerified.cookie)).status,200)
    const packagesBefore=(await h.state()).proposals.find(x=>x.id===packages.id),scheduleBytes=(await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(packages.id).first()).snapshot
    assert.equal(packagesBefore.acceptance.totalCents,packageExpected.totalCents);assert.equal(packagesBefore.acceptance.depositCents,packageExpected.depositCents)
    // PRICE-002 / SIGN-008: uploaded-paper choices and original file are product records too.
    const paper=await h.cmd('proposal.prepare',{...offer,title:'Archived signed-copy package',paymentTerms:{...scheduleFixture(),depositFixed:'500'},packages:packageFixture()})
    await h.cmd('proposal.approve',{id:paper.id,version:1,revision:1});await h.cmd('proposal.send',{id:paper.id,version:2})
    const paperBytes=new TextEncoder().encode('%PDF Growth plus Rush delivery quantity four'),paperForm=new FormData()
    for(const [key,value]of Object.entries({id:paper.id,version:3,optionId:'two',items:JSON.stringify(packageItems),signer:'Morgan Lee',signedOn:'2026-10-15',attest:'yes'}))paperForm.set(key,String(value))
    paperForm.set('file',new File([paperBytes],'archived-package-signed.pdf',{type:'application/pdf'}))
    const paperRequest=new Request(h.origin+'/app/paper-acceptance',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner},body:paperForm})
    const paperResponse=await h.mf.dispatchFetch(paperRequest.url,{method:'POST',headers:paperRequest.headers,body:await paperRequest.arrayBuffer()});assert.equal(paperResponse.status,200,await paperResponse.text())
    const paperBefore=(await h.state()).proposals.find(x=>x.id===paper.id)
    assert.equal(paperBefore.acceptance.method,'upload');assert.equal(paperBefore.acceptance.totalCents,packageExpected.totalCents);assert.equal(paperBefore.acceptance.depositCents,50000);assert.equal(paperBefore.acceptance.selection.items[0].quantity,4)
    const paperInvoice=await h.cmd('invoice.export',{id:paper.id}),paperInvoicePath='/api/platter/invoices/'+paperInvoice.id+'.csv',paperCsv=(await h.send(paperInvoicePath,undefined,h.owner)).text
    assert.match(paperCsv,/500\.00/)
    const templateSource=(await h.state()).proposals.find(p=>p.id===work.id)
    const template=await h.cmd('template.save',{id:work.id,version:templateSource.version,name:'Restorable campaign'})
    const beforeVendorDocuments=(await h.state()).vendorDocuments
    const before=business(await h.state())
    const acceptedThread=before.proposals.find(p=>p.id===proposal.id).questions
    const openThread=before.proposals.find(p=>p.id===pending.id).questions
    assert.equal(acceptedThread.length,1)
    assert.equal(acceptedThread[0].answers.length,1)
    assert.equal(acceptedThread[0].answers[0].text,'Yes, delivery is included in the campaign price.')
    assert.equal(openThread.length,1)
    assert.equal(openThread[0].answers.length,0)
    const beforeAuditView=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
    // The API joins withdrawal reasons and sender attribution. Compare stored
    // audit rows exactly here, then assert the complete joined view on restore.
    const beforeAudit=beforeAuditView.map(({reason,mail_route,sender_address,...row})=>row)
    assert.ok(beforeAudit.some(row=>row.action==='proposal.preview'&&row.subject===duplicate.id&&row.actor_role==='owner'),'EDIT-018 / TEAM-004 preview action is retained without payload or invitation authority')
    assert.deepEqual(before.proposals.map(p=>p.status).sort(),['accepted','accepted','accepted','approved','draft','draft','draft','withdrawn','withdrawn','withdrawn'])
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
    const retainedAuditIds=new Set(beforeAuditView.map(row=>row.id)),restoredAuditView=(await h.send('/api/platter/audit',undefined,restoredOwner)).value.rows.filter(row=>retainedAuditIds.has(row.id))
    assert.deepEqual(restoredAuditView,beforeAuditView,'TEAM-004 restores the complete audit view including reasons and sender routes/addresses')
    assert.deepEqual(business(restoredState),before)
    assert.deepEqual(restoredState.proposals.find(p=>p.id===proposal.id).document,documentFixture(),'EDIT-001 ordered document and brand survive the public CLI archive exactly')
    const completedRestoreSetup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:restoredOwner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(completedRestoreSetup.status,303)
    const restoredDocumentPage=await h.send('/app/proposal?id='+proposal.id,undefined,restoredOwner);assert.equal(restoredDocumentPage.status,200);assert.match(restoredDocumentPage.text,/Two perspectives/)
    assert.equal(archived.filter(item=>item.table==='p_personal_templates').length,1,'EDIT-002 personal template snapshot and defaults survive CLI restore')
    assert.deepEqual(restoredState.followupActions,actionsBefore,'FOLLOW-002 logged actions survive public CLI restore exactly')
    assert.deepEqual(restoredState.followups.rows.map(({sentAt,...r})=>r),followupsBefore,'FOLLOW-002 open and completed actions survive public CLI restore')
    assert.deepEqual(restoredState.proposals.find(p=>p.id===proposal.id).questions,acceptedThread,'FOLLOW-004 agreement thread survives public CLI restore exactly')
    assert.deepEqual(restoredState.proposals.find(p=>p.id===pending.id).questions,openThread,'FOLLOW-004 unanswered question survives public CLI restore exactly')
    assert.equal((await h.db.prepare('SELECT COUNT(*) AS count FROM p_question_reply_keys').first()).count,0,'restoring business threads never restores email reply authority')
    assert.deepEqual(restoredState.proposals.find(p=>p.id===withdrawn.id).withdrawals,withdrawalHistory,'SEND-010 history survives CLI restore without invitation authority')
    assert.equal(restoredState.proposals.find(p=>p.id===withdrawn.id).status,'withdrawn')
    assert.deepEqual(restoredState.proposals.filter(p=>[declined.id,lost.id].includes(p.id)).map(p=>({id:p.id,outcomes:p.outcomes,pipelineStatus:p.pipelineStatus})),outcomeHistory,'FOLLOW-005 reasons, actors, times and report outcomes survive public CLI restore')
    assert.equal((await h.send(declinedPath,undefined,declinedSession.cookie)).status,404,'restoring a decline never restores its invitation or verified session')
    await h.cmd('proposal.negotiate',{...offer,id:declined.id,version:4},restoredOwner)
    const reopened=(await h.state(restoredOwner)).proposals.find(p=>p.id===declined.id)
    assert.equal(reopened.status,'draft');assert.deepEqual(reopened.outcomes,outcomeHistory.find(p=>p.id===declined.id).outcomes)
    await h.cmd('proposal.send',{id:declined.id,version:reopened.version},restoredOwner,409)
    await h.cmd('proposal.send',{id:withdrawn.id,version:4},restoredOwner,409)
    assert.equal(archived.filter(item=>item.table==='p_withdrawn_links').length,0)
    assert.deepEqual(restoredState.proposals.find(p=>p.id===duplicate.id),duplicateBefore,'EDIT-012 copied content, files and delivery configuration survive CLI restore exactly')
    assert.equal(restoredState.proposals.find(p=>p.id===work.id).options[0].cents,pricingExpected.grandCents,'PRICE-001 server totals survive public CLI restore')
    assert.deepEqual(restoredState.proposals.find(p=>p.id===work.id).options, before.proposals.find(p=>p.id===work.id).options,'PRICE-001 all table, line, quantity, unit, group and subtotal fields survive public CLI restore exactly')
    assert.equal((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(packages.id).first()).snapshot,scheduleBytes,'Frozen schedule snapshot survives restore byte-identically');assert.deepEqual(restoredState.proposals.find(x=>x.id===packages.id).acceptance,packagesBefore.acceptance,'PRICE-002 immutable selected quantities and totals survive public CLI restore')
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
    const restoredDraft=await h.cmd('template.start',{id:template.id,version:1,clientId:client.id},restoredOwner)
    const started=(await h.state(restoredOwner)).proposals.find(p=>p.id===restoredDraft.id)
    assert.equal(started.status,'draft');assert.equal(started.approved_by,null);assert.equal(started.shareToken,undefined)
    for(const field of ['scope','terms','options','attachments','section_conditions','deposit_bps'])assert.deepEqual(started[field],templateSource[field],'EDIT-002 restored template starts independent content: '+field)
    const restoredStarter = (await h.state(restoredOwner)).proposals.find(p => p.id === starterBefore.id)
    for (const field of ['scope', 'terms', 'options', 'deposit_bps', 'attachments']) assert.deepEqual(restoredStarter[field], starterSnapshot[field], 'EDIT-002 filled starter draft survives public CLI restore: ' + field)
    assert.equal((await h.state(restoredOwner)).starterTemplates.length, 5)
    const restarted = await h.cmd('template.start', { id: 'starter:consultancy', version: 1, clientId: client.id }, restoredOwner)
    assert.equal((await h.state(restoredOwner)).proposals.find(p => p.id === restarted.id).scope, starterSnapshot.scope, 'EDIT-002 built-in starter remains usable after CLI restore')
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
    const paperPage=await h.send('/app/proposal?id='+paper.id,undefined,restoredOwner);assert.equal(paperPage.status,200);assert.match(paperPage.text,/2,301\.00/);assert.match(paperPage.text,/500\.00/);assert.match(paperPage.text,/Rush delivery/)
    const standard=await h.send(`/app/preview/client?id=${duplicate.id}&revision=1&optionId=one`,undefined,restoredOwner),premium=await h.send(`/app/preview/client?id=${duplicate.id}&revision=1&optionId=two`,undefined,restoredOwner)
    assert.match(standard.text,/403\.89/);assert.match(standard.text,/Project services/);assert.equal(standard.status,200);assert.equal(premium.status,200);assert.ok(!standard.text.includes('Premium timeline: four weeks.'));assert.ok(premium.text.includes('Premium timeline: four weeks.'),'EDIT-009 restored conditions remain functional')
    await h.close();h=null
  } finally { if(h)await h.close();await rm(temporary,{recursive:true,force:true}) }
})

test('PORT-001 public CLI refuses corrupt and pre-erasure archives and retains accepted money through the later erasure journal', {timeout:240000}, async()=>{
 const temporary=await mkdtemp(join(tmpdir(),'platter-erasure-')),source=join(temporary,'source'),erased=join(temporary,'erased');let h
 try{
  for(const path of [source,erased])await checkout(path)
  await exec(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','foundation','--local'],{cwd:source,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},maxBuffer:2e6})
  h=await harness({root:source})
  const p=await h.cmd('client.save',{name:'Temporary joiner',email:'synthetic-platter-8200@example.com'}),client=await h.cmd('client.save',{name:'Retained client',email:'synthetic-platter-8201@example.com'})
  const proposal=await h.cmd('proposal.prepare',{clientId:client.id,title:'Retained agreement',scope:'Retained business record',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
  await h.cmd('proposal.approve',{id:proposal.id,version:1,revision:1});const sent=await h.cmd('proposal.send',{id:proposal.id,version:2}),path=new URL(sent.shareUrl).pathname
  await h.send(path+'/action?name=code.request',{});const code=(await h.state()).outbox.find(x=>x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0],verified=await h.send(path+'/action?name=code.verify',{code})
  assert.equal((await h.send(path+'/action?name=accept',{name:'Synthetic signer',optionId:'two',consent:true},verified.cookie)).status,200);await h.cmd('invoice.export',{id:proposal.id})
  const identity={auth:h.auth,owner:h.owner};await h.close();h=null
  const old=join(temporary,'before.rer'),later=join(temporary,'later.rer');await command(source,['export','--output',old,'--no-queue']);const bytes=await readFile(old,'utf8')
    const corrupt=join(temporary,'corrupt.rer');await writeFile(corrupt,bytes.replace('Temporary joiner','Changed joiner'),{mode:0o600})
    // These operations own different checkouts. Finish both before using
    // the erasure journal; keep every refusal and custody assertion intact.
    const independent=await Promise.allSettled([
      // Checksum damage is a transfer failure (1); policy conflicts remain 4.
      command(erased,['import','--input',corrupt,'--yes','--no-queue'],1),
      (async()=>{h=await harness({root:source,...identity});try{await h.cmd('client.erase',{id:p.id,confirmName:'Temporary joiner'},await h.signIn(h.auth.OWNER_EMAIL))}finally{await h.close();h=null}await command(source,['export','--output',later,'--no-queue'])})(),
    ])
    for(const result of independent)if(result.status==='rejected')throw result.reason
    await command(erased,['import','--input',old,'--journal',later,'--yes','--no-queue'],4)
    await command(erased,['import','--input',later,'--yes','--no-queue'])
    await command(erased,['import','--input',later,'--yes','--no-queue'],4)
    const proxy=await getPlatformProxy({configPath:join(erased,'wrangler.jsonc'),persist:{path:join(erased,'.wrangler/state/v3')},remoteBindings:false})
    try { assert.equal(await proxy.env.DB.prepare('SELECT name FROM p_clients WHERE id=?').bind(p.id).first(),null);assert.equal((await proxy.env.DB.prepare('SELECT total_cents,deposit_cents FROM p_acceptances WHERE proposal_id=?').bind(proposal.id).first()).deposit_cents,105000);assert.match((await proxy.env.DB.prepare('SELECT csv FROM p_invoices WHERE proposal_id=?').bind(proposal.id).first()).csv,/1050\.00/) }
    finally { await proxy.dispose() }
 }finally{await h?.close();await rm(temporary,{recursive:true,force:true})}
})

test('PRICE-002 / EDIT-012 / REPORT-001 / PRICE-008 public CLI restores re-exported first-release AUD bytes and new proposals and acceptances use USD without conversion', { timeout: 180_000 }, async () => {
 const temporary=await mkdtemp(join(tmpdir(),'platter-currency-')),target=join(temporary,'target')
 let h
 try {
  const input=join(temporary,'first-release-aud.rer'),records=text=>text.split('\n').filter(Boolean).map(JSON.parse).filter(item=>item.kind==='part').flatMap(part=>part.items).filter(item=>item.kind==='row')
  await writeFile(input,await readFile('fixtures/first-release-aud.ndjson'),{mode:0o600})
  // Keep the original business-row expectations separate from the fresh archive inventory.
  const legacy=JSON.parse(await readFile('fixtures/first-release-aud-rows.json','utf8')),accepted=legacy.find(item=>item.table==='p_acceptances').row,invoice=legacy.find(item=>item.table==='p_invoices').row,oldProposal=legacy.find(item=>item.table==='p_proposals').row
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
   const {currency,document,payment_terms,previous_sent_revision,sales_owner_id,sales_owner_name,terms,attachments,section_conditions,...unchanged}=matches[0].row
   if(original.table==='p_proposals'){assert.equal(payment_terms,null,'Legacy payment terms stay absent');assert.deepEqual(JSON.parse(document),{},'EDIT-001 legacy proposals have no added blocks');assert.deepEqual(JSON.parse(section_conditions),{},'EDIT-009 legacy proposals remain unconditional');assert.equal(terms,'');assert.deepEqual(JSON.parse(attachments),[]);assert.equal(previous_sent_revision,null,'legacy proposal has no earlier sent revision');assert.equal(sales_owner_id,null);assert.equal(sales_owner_name,null,'legacy sales ownership is not inferred')}
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


test('SEND-006 public CLI retains real invitation text, excludes rehearsal content and preserves its test-send audit without invitation authority', {timeout:180000},async()=>{
 const temporary=await mkdtemp(join(tmpdir(),'platter-test-mail-archive-')),source=join(temporary,'source'),restored=join(temporary,'restored')
 let h
 try{
  for(const path of [source,restored])await checkout(path)
  await exec(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','foundation','--local'],{cwd:source,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},maxBuffer:2e6})
  h=await harness({root:source,assetsDirectory:'public'})
  const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
  const p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Email rehearsal',scope:'A photography session',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
  await h.cmd('proposal.test-mail',{id:p.id,version:1,subject:'Archive rehearsal only',message:'Test-only message never in the agreement package'})
  const real=await h.cmd('proposal.prepare',{clientId:client.id,title:'Retained invitation',scope:'A second photography session',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
  await h.cmd('proposal.approve',{id:real.id,version:1,revision:1})
  const invitation=await h.cmd('proposal.send',{id:real.id,version:2,mailSubject:'Your photography agreement',mailMessage:'Hi Avery, please review the agreed session.'})
  const before=await h.state(),proposal=before.proposals.find(row=>row.id===p.id)
  let retained=before.proposals.find(row=>row.id===real.id).invitationMessages
  assert.equal(retained.length,1)
  assert.equal(proposal.testMail.length,1);assert.equal(before.outbox.length,2)
  const replacement=await h.cmd('signer.replace',{id:real.id,version:3,recipient:'coo@northstar.example',reason:'COO signs this agreement',mailSubject:'COO invitation',mailMessage:'Please sign the unchanged offer.'})
  const replacementPath=new URL(replacement.shareUrl).pathname
  retained=(await h.state()).proposals.find(row=>row.id===real.id).invitationMessages
  const replacements=(await h.state()).proposals.find(row=>row.id===real.id).signerReplacements
  assert.equal(replacements.length,1);assert.equal(replacements[0].signing_position,1)
  assert.equal((await h.send(replacementPath+'/action?name=code.request',{})).status,200)
  const code=(await h.state()).outbox.find(m=>m.proposal_id===real.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
  const verified=await h.send(replacementPath+'/action?name=code.verify',{code});assert.equal(verified.status,200)
  assert.equal((await h.send(replacementPath+'/action?name=accept',{name:'Northstar COO',optionId:'two',consent:true},verified.cookie)).status,200)
  const certificate=await h.send(replacementPath+'/certificate.json',undefined,verified.cookie);assert.equal(certificate.status,200,certificate.text)
  const artifacts=(await h.db.prepare('SELECT * FROM p_agreement_artifacts WHERE proposal_id=?').bind(real.id).all()).results

  await h.close();h=null
  const archive=join(temporary,'source.rer')
  await command(source,['export','--output',archive])
  const bytes=await readFile(archive,'utf8'),parts=bytes.split('\n').filter(Boolean).map(JSON.parse).filter(item=>item.kind==='part'),records=parts.flatMap(part=>part.items).filter(item=>item.kind==='row')
  assert.ok(!bytes.includes('Test-only message never in the agreement package'))
  assert.ok(!bytes.includes('[Test] Archive rehearsal only'))
  assert.ok(!bytes.includes(new URL(invitation.shareUrl).pathname))
  assert.ok(!bytes.includes(replacementPath))
  assert.equal(records.filter(item=>item.table==='p_replaced_links').length,0)
  assert.deepEqual(records.filter(item=>item.table==='p_signer_replacements').map(item=>item.row),replacements)
  assert.deepEqual(records.filter(item=>item.table==='p_invitation_messages').map(item=>item.row).sort((a,b)=>a.id.localeCompare(b.id)),[...retained].sort((a,b)=>a.id.localeCompare(b.id)))
  assert.equal(records.filter(item=>item.table==='p_mail').length,0)
  const tests=records.filter(item=>item.table==='p_audit'&&item.row.action==='proposal.test-mail')
  assert.equal(tests.length,1)
  assert.equal(tests[0].row.subject,p.id);assert.equal(tests[0].row.actor_role,'owner')
  await command(restored,['import','--input',archive,'--yes'])
  h=await harness({root:restored,unclaimed:true,assetsDirectory:'public'})
  const owner=await h.signIn(h.auth.OWNER_EMAIL),after=await h.state(owner)
  assert.deepEqual(after.proposals.find(row=>row.id===p.id),proposal)
  assert.deepEqual(after.proposals.find(row=>row.id===real.id).invitationMessages,retained)
  assert.equal((await h.send(new URL(invitation.shareUrl).pathname)).status,404)
  assert.equal((await h.send(replacementPath)).status,404)
  assert.deepEqual(after.proposals.find(row=>row.id===real.id).signerReplacements,replacements)
  assert.deepEqual((await h.db.prepare('SELECT * FROM p_agreement_artifacts WHERE proposal_id=?').bind(real.id).all()).results,artifacts)
  assert.equal((await h.send('/api/platter/certificate.json?id='+real.id,undefined,owner)).text,certificate.text)
  assert.equal((await h.db.prepare('SELECT count(*) n FROM p_mail').first()).n,0)
  const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})
  assert.equal(setup.status,303)
  const history=await h.send('/app/proposal?id='+real.id,undefined,owner)
  assert.equal(history.status,200)
  assert.match(history.text,/Your photography agreement/);assert.match(history.text,/Hi Avery, please review the agreed session\./)
  assert.deepEqual(after.outbox,[])
  assert.ok(after.proposals.every(row=>!row.shareToken))
  await h.cmd('proposal.send',{id:p.id,version:1},owner,409)
  await h.cmd('proposal.test-mail',{id:p.id,version:1,subject:'Restored rehearsal',message:'Review the restored draft'},owner)
  const restoredMail=(await h.state(owner)).outbox
  assert.equal(restoredMail.length,1);assert.equal(restoredMail[0].recipient,h.auth.OWNER_EMAIL)
 }finally{await h?.close();await rm(temporary,{recursive:true,force:true})}
})

test('TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items', {timeout:180000},async()=>{
 const inbound=inboundMailFixture(),mailboxWires=[]
 const disputeDeadline=Math.floor(Date.now()/1000)+86400
 const temporary=await mkdtemp(join(tmpdir(),'platter-team-archive-')),source=join(temporary,'source'),restored=join(temporary,'restored')
 let h
 try{
  for(const path of [source,restored])await checkout(path)
  await exec(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','foundation','--local'],{cwd:source,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},maxBuffer:2e6})
  h=await harness({root:source,origin:'https://platter.example',assetsDirectory:'public',auth:{...inbound.settings,AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-5600',GOOGLE_MAIL_CLIENT_ID:'synthetic-platter-5601',GOOGLE_MAIL_CLIENT_SECRET:'synthetic-platter-5602'},outboundService:async request=>{const url=new URL(request.url);if(url.hostname==='oauth2.googleapis.com')return Response.json({access_token:'synthetic-platter-5603',refresh_token:'synthetic-platter-5604',scope:'openid email https://www.googleapis.com/auth/gmail.send'});if(url.hostname==='openidconnect.googleapis.com')return Response.json({sub:'synthetic-platter-5605',email:'archive-mailbox@synthetic-platter.example',email_verified:true});if(url.hostname==='gmail.googleapis.com'){mailboxWires.push(Buffer.from((await request.json()).raw,'base64url').toString('utf8'));return Response.json({id:'synthetic-platter-'+(8000+mailboxWires.length)})}if(url.hostname==='api.resend.com'&&request.method==='GET')return Response.json(inbound.messages.get(url.pathname.split('/').at(-1)));if(url.hostname==='api.resend.com')return Response.json({id:'synthetic-platter-5607'});if(url.hostname==='files.stripe.com'){const upload=await request.formData();assert.equal(upload.get('purpose'),'dispute_evidence');return Response.json({id:'synthetic-platter-3700'})}if(url.hostname==='api.hubapi.com'){if(url.pathname==='/account-info/v3/details')return Response.json({portalId:'synthetic-platter-4120'});if(url.pathname==='/crm/v3/pipelines/deals')return Response.json({results:[{id:'synthetic-platter-9961',stages:[{id:'synthetic-platter-9962',metadata:{isClosed:'true',probability:'1'}},{id:'synthetic-platter-9963',metadata:{isClosed:'true',probability:'0'}}]}]});const id=url.pathname.split('/').at(-1);return Response.json({id,properties:request.method==='PATCH'?(await request.json()).properties:{pipeline:'synthetic-platter-9961'}})};if(url.hostname==='quickbooks.api.intuit.com')return Response.json({CompanyInfo:{CompanyName:'Synthetic company'}});assert.equal(url.hostname,'api.stripe.com');if(url.pathname==='/v1/account')return Response.json({id:'synthetic-platter-2800'});if(url.pathname.includes('/disputes/')){const id=url.pathname.split('/').at(-1);if(request.method==='POST')return Response.json({id,status:'under_review'});const accepted=await h.db.prepare('SELECT * FROM p_acceptances LIMIT 1').first();return Response.json({id,charge:'synthetic-platter-2801',amount:accepted.deposit_cents,currency:accepted.currency.toLowerCase(),status:'needs_response',evidence_details:{due_by:disputeDeadline}})}if(request.method==='GET'){const accepted=await h.db.prepare('SELECT * FROM p_acceptances LIMIT 1').first();return Response.json({id:'synthetic-platter-2801',paid:true,status:'succeeded',amount:accepted.deposit_cents,amount_refunded:0,currency:accepted.currency.toLowerCase(),metadata:{platter_proposal_id:accepted.proposal_id,platter_revision:String(accepted.revision)}})}const amount=Number(new URLSearchParams(await request.text()).get('amount'));return Response.json({id:'synthetic-platter-2802',charge:'synthetic-platter-2801',amount,status:'succeeded'})}})
  const people={}
  for(const role of ['sales','manager','other']){
   const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner)
   const cookie=await h.signIn(email);people[role]={cookie,...(await h.state(cookie)).actor}
  }
  await h.cmd('provider.connect',{provider:'quickbooks',version:0,realmId:'synthetic-platter-2300',token:'synthetic-platter-2301',consent:true})
  await h.cmd('provider.connect',{provider:'hubspot',version:0,token:'synthetic-platter-4121',consent:true})
  await h.cmd('workspace.defaults',{version:0,reminderDays:[2,5],expiryDays:30,paymentMethods:['card']})
  const team=await h.cmd('team.create',{name:'Archive team'})
  for(const role of ['sales','manager'])await h.cmd('member.set',{operatorId:people[role].id,version:0,role,teams:[team.id]})
  await h.cmd('member.zone',{timeZone:'America/New_York'},people.sales.cookie)
  await h.cmd('approval.policy',{version:0,required:false,defaultRole:'manager'})
  await h.cmd('approval.rule',{version:1,name:'High value manager',position:0,condition:{kind:'totalOver',cents:2500000,currency:'USD'},approvers:['role:manager']})
  const client=await h.cmd('client.save',{name:'Synthetic client',email:'client@synthetic-platter.example',segment:'Enterprise'})
  const p=await h.cmd('proposal.prepare',{clientId:client.id,document:documentFixture(),title:'Archive routed offer',scope:'An audited scope',optionOne:'First',priceOne:'28000',optionTwo:'Second',priceTwo:'30000',depositPercent:'25',pricingTables:[{optionId:'one',name:'Services',lines:[{name:'Delivery',description:'Public scope',unit:'project',quantity:'1',unitPrice:'28000'}]}]},people.sales.cookie)
  await h.cmd('proposal.share',{id:p.id,operatorId:people.other.id},people.sales.cookie)
  const line=(await h.state()).proposals.find(r=>r.id===p.id).internalPricing.lines[0];await h.cmd('pricing.cost',{id:p.id,version:1,lineKey:line.key,unitCost:'7000'},people.manager.cookie)
  await h.cmd('template.save',{id:p.id,version:2,name:'Private cost template'},people.sales.cookie)
  const templateFolder=await h.cmd('folder.save',{name:'East templates',kind:'template',teams:[team.id],shareConsent:true}),libraryFolder=await h.cmd('folder.save',{name:'East library',kind:'library',teams:[team.id],shareConsent:true})
  const shared=await h.cmd('template.save',{id:p.id,version:2,name:'Shared locked cost template',shared:true,folderId:templateFolder.id,shareConsent:true});await h.cmd('template.locks',{id:shared.id,version:1,sections:['terms','block:columns','block:terms']})
  const lockedCopy=await h.cmd('template.start',{id:shared.id,version:2,clientId:client.id},people.sales.cookie)
  const archivedLibrary=await h.cmd('library.save',{title:'Synthetic case study',kind:'case_study',content:'An archived text library item',folderId:libraryFolder.id})
  const libraryCopy=await h.cmd('proposal.prepare',{clientId:client.id,title:'Archived library uses',scope:'Library custody',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'})
  for(const [index,mode] of ['linked','detached'].entries())await h.cmd('library.insert',{id:libraryCopy.id,version:index+1,itemId:archivedLibrary.id,itemVersion:1,mode,consent:true})
  await h.cmd('proposal.approve',{id:p.id,version:2,revision:2},people.manager.cookie)
  const paid=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic paid proposal',scope:'Synthetic scope',optionOne:'First',priceOne:'2400',optionTwo:'Second',priceTwo:'4200',depositPercent:'25'})
  const catalog=await h.cmd('catalog.save',{name:'Archived service',sku:'synthetic-platter-3300',description:'Reviewed service',unit:'hour',unitPrice:'100',unitCost:'25'});await h.cmd('catalog.insert',{id:paid.id,version:1,catalogId:catalog.id,catalogVersion:1,optionId:'one',quantity:'2'})
  const paidPath=new URL((await h.cmd('proposal.send',{id:paid.id,version:2})).shareUrl).pathname
  await h.send(paidPath+'/action?name=code.request',{});const code=(await h.db.prepare("SELECT body FROM p_mail WHERE subject='Your Platter verification code' ORDER BY created_at DESC").first()).body.match(/\b\d{6}\b/)[0],verified=(await h.send(paidPath+'/action?name=code.verify',{code})).cookie;assert.equal((await h.send(paidPath+'/action?name=accept',{name:'Synthetic client',optionId:'one',consent:true},verified)).status,200)
  await h.cmd('provider.connect',{provider:'stripe',version:0,token:'synthetic-platter-2803',webhookSecret:'synthetic-platter-2804',consent:true});const payment=await h.cmd('payment.bind',{id:paid.id,chargeId:'synthetic-platter-2801',consent:true}),refund={paymentId:payment.id,amount:'100',reason:'Synthetic partial refund',requestId:'synthetic-platter-2805',consent:true};await h.cmd('payment.refund',refund)
  await h.cmd('payment.record',{id:paid.id,amount:'50',method:'check',reference:'synthetic-platter-2806',receivedOn:'2026-10-21',consent:true})
  await h.cmd('dispute.import',{paymentId:payment.id,disputeId:'synthetic-platter-3701'});const packet=await h.cmd('dispute.prepare',{disputeId:'synthetic-platter-3701',version:1,note:'Archived response'});const submission={disputeId:'synthetic-platter-3701',packetId:packet.id,documentHash:packet.documentHash,requestId:'synthetic-platter-3702'};await h.cmd('dispute.authorize',{...submission,consent:true});assert.equal((await h.cmd('dispute.submit',submission)).status,'submitted');const sourceEvidence=await h.mf.dispatchFetch(h.origin+'/api/platter/disputes/'+submission.disputeId+'/evidence.pdf?submission='+submission.requestId,{headers:{host:new URL(h.origin).host,cookie:h.owner}});assert.equal(sourceEvidence.status,200);const evidenceBytes=new Uint8Array(await sourceEvidence.arrayBuffer())
  assert.equal((await h.cmd('member.invite',{email:'unjoined@synthetic-platter.example',displayName:'Unjoined member',role:'sales',teams:[team.id]},people.manager.cookie)).status,'invited')
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_member_invitations').first()).n,1)
  const optional=await h.cmd('proposal.prepare',{clientId:client.id,title:'Archived optional costing',scope:'Public delivery',depositPercent:'25',packages:[{id:'main',label:'Delivery',price:'100',optionalItems:[{id:'rush',label:'Rush delivery',unitPrice:'10',min:1,max:5,quantity:2,editable:true}]}]},people.sales.cookie);let costRow=(await h.state()).proposals.find(r=>r.id===optional.id);await h.cmd('pricing.cost',{id:optional.id,version:1,lineKey:costRow.internalPricing.lines[0].key,unitCost:'40'});costRow=(await h.state()).proposals.find(r=>r.id===optional.id);await h.cmd('pricing.cost',{id:optional.id,version:2,lineKey:costRow.internalPricing.lines.find(l=>l.kind==='optional').key,unitCost:'3.17'});await h.cmd('template.save',{id:optional.id,version:3,name:'Archived optional costs'},people.sales.cookie)
  const discounted=await h.cmd('proposal.prepare',{clientId:client.id,title:'Archived discount',scope:'Public scope',depositPercent:'25',packages:[{id:'main',label:'Delivery',price:'100',discountPercent:'20',discountAmount:'5',showDiscount:false,discountExpiresOn:'2099-05-01'}],pricingTables:[{optionId:'main',name:'Services',lines:[{name:'Work',quantity:'1',unit:'project',unitPrice:'100',group:'Delivery',discountPercent:'10',discountAmount:'2',groupDiscountPercent:'5',groupDiscountAmount:'1'}]}]},people.sales.cookie);await h.cmd('template.save',{id:discounted.id,version:1,name:'Archived discount template'},people.sales.cookie)
  for(const [index,condition] of [{kind:'discountOver',bps:1500},{kind:'marginBelow',bps:2000},{kind:'paymentTerms',minimumDepositBps:5000,standardTerms:'Net 30'},{kind:'template'},{kind:'termsEdited'}].entries()){const version=(await h.state()).approvalSettings.policy.version;await h.cmd('approval.rule',{version,name:'Archived condition '+condition.kind,position:10+index,condition,approvers:['role:owner'],templates:['starter:consultancy']})}
  const scopedTemplate=await h.cmd('template.start',{id:'starter:consultancy',version:1,clientId:client.id},people.sales.cookie);await h.cmd('proposal.approve',{id:p.id,version:3,revision:2},people.manager.cookie)
  await h.cmd('report.schedule',{filters:'view=recorded-revenue&sort=value',cadence:'daily',hour:8,recipients:[h.auth.OWNER_EMAIL]})
  const oauthStart=await h.send('/api/platter/mailbox/authorize',{provider:'gmail',consent:true},people.sales.cookie);assert.equal(oauthStart.status,303)
  const oauthState=new URL(oauthStart.headers.get('location')).searchParams.get('state')
  assert.equal((await h.send('/api/platter/mailbox/callback?'+new URLSearchParams({state:oauthState,code:'synthetic-platter-5608'}),undefined,people.sales.cookie)).status,303)
  const mailboxDraft=await h.cmd('proposal.prepare',{clientId:client.id,title:'Archive mailbox receipt',scope:'Public scope',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'},people.sales.cookie)
  await h.cmd('proposal.send',{id:mailboxDraft.id,version:1,mailRepliesConsent:true},people.sales.cookie)
  const mailboxReceipt=(await h.state(people.sales.cookie)).proposals.find(r=>r.id===mailboxDraft.id).mailAttributions
  assert.equal(mailboxReceipt[0].route,'gmail');assert.equal(mailboxReceipt[0].outcome,'accepted')
  const replyAddress=mailboxWires.at(-1).match(/\r\nReply-To: ([^\r\n]+)/)[1]
  const incoming=await inbound.deliver(h,replyAddress,'client@synthetic-platter.example','Keep this client reply with the proposal.',{message:{authentication:{spf:'fail',dkim:'processing_failed'}}})
  assert.equal(incoming.status,201,incoming.text)
  const replyReceipt=(await h.state()).proposals.find(r=>r.id===mailboxDraft.id).mailReplies
  assert.equal(replyReceipt[0].claimed_from,'client@synthetic-platter.example');assert.equal(replyReceipt[0].spf_result,'fail');assert.equal(replyReceipt[0].dkim_result,'processing_failed')
  for(let i=0;i<2;i++)assert.equal((await inbound.deliver(h,replyAddress,'client@synthetic-platter.example','Over the cap')).status,409)
  assert.equal((await h.state()).replyCapNotices.length,1)
  let reminderOffer=(await h.state(people.sales.cookie)).proposals.find(r=>r.id===mailboxDraft.id)
  await h.cmd('reminder.configure',{id:mailboxDraft.id,version:reminderOffer.version,enabled:false,timeZone:'America/Los_Angeles'},people.sales.cookie)
  await h.cmd('reminder.send',{id:mailboxDraft.id,requestId:'synthetic-platter-6500',subject:'Archived manual reminder',message:'Keep this exact reminder text.'},people.sales.cookie)
  const futureReminder=await h.cmd('proposal.prepare',{clientId:client.id,title:'Archived future reminder',scope:'Public scope',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'},people.sales.cookie)
  const reminderMessage=await h.cmd('reminder-template.save',{name:'Archived reminder message',subject:'Review {client.company}',message:'Keep this exact shared message.',locked:true,isDefault:false})
  await h.cmd('reminder.configure',{id:futureReminder.id,version:1,enabled:true,consent:true,timeZone:'America/Los_Angeles',afterDays:[2],beforeDays:[],cap:1,messageTemplateId:reminderMessage.id},people.sales.cookie)
  await h.cmd('proposal.send',{id:futureReminder.id,version:2},people.sales.cookie)
  assert.equal((await h.state(people.sales.cookie)).proposals.find(r=>r.id===futureReminder.id).reminderSettings.authorized,1)
  const deliveryTemplate=await h.cmd('template.save',{id:futureReminder.id,version:(await h.state()).proposals.find(r=>r.id===futureReminder.id).version,name:'Archived delivery sources'});await h.cmd('template.delivery',{id:deliveryTemplate.id,version:1,remindersSource:'inherit',expirySource:'override',expiryDays:14,warningSource:'inherit',reminderTemplateId:reminderMessage.id,paymentMethods:['card','ach']})
  const pendingOAuth=await h.send('/api/platter/mailbox/authorize',{provider:'gmail',consent:true},people.sales.cookie);assert.equal(pendingOAuth.status,303)
  await h.cmd('outcome.settings',{version:0,reasons:['Budget','Won by phone']})
  const outcomeDraft=await h.cmd('proposal.prepare',{clientId:client.id,title:'Archived explicit won outcome',scope:'Public scope',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'})
  await h.cmd('outcome.crm',{id:outcomeDraft.id,version:1,bindingVersion:0,dealId:'synthetic-platter-9964',pipelineId:'synthetic-platter-9961',wonStage:'synthetic-platter-9962',lostStage:'synthetic-platter-9963',consent:true})
  await h.cmd('proposal.send',{id:outcomeDraft.id,version:1});await h.cmd('proposal.win',{id:outcomeDraft.id,version:2,reason:'Won by phone'})
  assert.equal((await h.state()).crmOutcomes.attempts.find(r=>r.proposal_id===outcomeDraft.id).status,'confirmed')
  const suggested=await h.cmd('proposal.prepare',{clientId:client.id,title:'Archived suggested revision',scope:'Suggestion custody',depositPercent:'25',packages:[{id:'one',label:'Service',price:'500'}],pricingTables:[{optionId:'one',name:'Services',lines:[{catalogId:catalog.id,name:'Archived service',unit:'hour',unitPrice:'500',quantity:'1'}]}]})
  const suggestion=await h.send('/api/platter/price-suggestions?id='+suggested.id,undefined,h.owner);assert.equal(suggestion.status,200);assert.deepEqual(suggestion.value.suggestions.map(s=>[s.lowCents,s.highCents,s.sampleSize]),[[10000,10000,1]])
  await h.cmd('pricing.suggest.apply',{id:suggested.id,version:1,tableIndex:0,lineIndex:0,unitCents:10000})
  const suggestionAudit=(await h.send('/api/platter/audit?'+new URLSearchParams({action:'pricing.suggest.apply',subject:suggested.id}),undefined,h.owner)).value.rows;assert.equal(suggestionAudit.length,1);assert.equal(suggestionAudit[0].actor_role,'owner')
  await h.cmd('report.schedule',{filters:'view=sales-performance&group=segment&quarter=2099-Q1',cadence:'weekly',weekday:1,hour:9,recipients:[h.auth.OWNER_EMAIL]})
  const beforePerformance=await h.send('/api/platter/sales-performance?group=segment',undefined,h.owner);assert.equal(beforePerformance.status,200)
  const beforeRevenue=await h.send('/api/platter/pipeline?view=recorded-revenue&sort=value',undefined,h.owner);assert.equal(beforeRevenue.status,200)
  const before=await h.state(),tables=['p_outcome_settings','p_outcomes','p_outcome_records','p_crm_outcome_bindings','p_crm_outcome_consents','p_crm_outcome_attempts','p_reminder_templates','p_template_reminder_messages','p_delivery_changes','p_reminder_policy','p_reminder_settings','p_reminder_runs','p_reminder_optouts','p_mail_reply_cap_notices','p_mail_replies','p_mail_attributions','p_report_schedules','p_report_runs','p_template_sources','p_disputes','p_dispute_packets','p_dispute_packet_parts','p_dispute_authorizations','p_dispute_submissions','p_dispute_documents','p_priced_catalog','p_resource_folders','p_folder_teams','p_template_locks','p_proposal_locks','p_template_block_locks','p_proposal_block_locks','p_personal_templates','p_payment_records','p_refunds','p_connections','p_members','p_teams','p_team_members','p_collaborators','p_approval_policy','p_approval_rules','p_approval_decisions','p_internal_costs','p_template_costs','p_library_items','p_library_uses','p_workspace_defaults','p_proposal_defaults','p_template_defaults']
  const canonical=rows=>rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
  const rows=await Promise.all(tables.map(t=>h.db.prepare('SELECT * FROM '+t).all().then(r=>canonical(r.results))))
  await h.close();h=undefined
  const archive=join(temporary,'teams.rer');await command(source,['export','--output',archive]);await command(restored,['import','--input',archive,'--yes'])
  const restoredCalls=[]
  h=await harness({root:restored,unclaimed:true,outboundService:async request=>{restoredCalls.push(new URL(request.url).hostname);throw new Error('Restore must not call a provider')}})
  const owner=await h.signIn(h.auth.OWNER_EMAIL),after=await h.state(owner)
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_member_invitations').first()).n,0,'pending delegated authority is excluded from archives');assert.equal((await h.db.prepare('SELECT status FROM oa_operators WHERE email=?').bind('unjoined@synthetic-platter.example').first()).status,'invited');assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_connection_secrets').first()).n,0);assert.ok(after.connections.every(c=>c.status==='needs_reconnection'));assert.deepEqual(after.paymentRecords,before.paymentRecords);assert.equal((await h.cmd('payment.refund',refund,owner)).status,'succeeded','restored historical refund retries never issue another provider call');assert.doesNotMatch(JSON.stringify(after),/synthetic-platter-(2301|4121|2803|2804)/);assert.equal(after.connections.find(c=>c.provider==='hubspot').status,'needs_reconnection')
  assert.deepEqual(after.outcomeSettings,before.outcomeSettings);assert.deepEqual(after.proposals.find(r=>r.id===outcomeDraft.id).outcomes,before.proposals.find(r=>r.id===outcomeDraft.id).outcomes)
  assert.equal(after.proposals.find(r=>r.id===outcomeDraft.id).pipelineStatus,'won');assert.equal(after.proposals.find(r=>r.id===outcomeDraft.id).acceptance,undefined)
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_crm_outcome_authority').first()).n,0);assert.ok(after.crmOutcomes.bindings.every(b=>b.authorized===0));assert.deepEqual(after.crmOutcomes.attempts,before.crmOutcomes.attempts)
  await h.cmd('outcome.crm.sync',{id:outcomeDraft.id},owner);assert.deepEqual(restoredCalls,[],'restored CRM business metadata carries no outbound authority')
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_reminder_authority').first()).n,0);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_reminder_transport').first()).n,0)
  const archivedReminder=after.proposals.find(r=>r.id===mailboxDraft.id).reminderRuns[0];assert.equal(archivedReminder.message,'Keep this exact reminder text.');assert.equal(archivedReminder.transport_status,null)
  assert.equal(after.proposals.find(r=>r.id===futureReminder.id).reminderSettings.authorized,0,'restored schedule needs explicit consent again')
  assert.deepEqual(after.proposals.find(r=>r.id===futureReminder.id).deliveryChanges,before.proposals.find(r=>r.id===futureReminder.id).deliveryChanges);assert.equal(after.proposals.find(r=>r.id===futureReminder.id).deliveryChanges.length,1)
  assert.deepEqual(after.templates.find(t=>t.id===deliveryTemplate.id).deliverySources,{reminders:'inherit',expiry:'override',warning:'inherit'});assert.equal(after.templates.find(t=>t.id===deliveryTemplate.id).reminderTemplateId,reminderMessage.id);assert.equal(after.reminderTemplates.find(t=>t.id===reminderMessage.id).locked,1)
  const retainedReminders=(await h.db.prepare('SELECT count(*) AS n FROM p_reminder_runs').first()).n
  assert.deepEqual(after.replyCapNotices,before.replyCapNotices);assert.equal(after.replyCapNotices.length,1)
  assert.deepEqual(after.proposals.find(r=>r.id===mailboxDraft.id).mailReplies,replyReceipt);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_mail_reply_keys').first()).n,0);assert.deepEqual(after.proposals.find(r=>r.id===mailboxDraft.id).mailAttributions,before.proposals.find(r=>r.id===mailboxDraft.id).mailAttributions);assert.deepEqual(after.proposals.find(r=>r.id===mailboxDraft.id).mailAttributions.find(m=>m.mail_id===mailboxReceipt[0].mail_id),mailboxReceipt[0]);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_mailbox_oauth').first()).n,0);assert.doesNotMatch(JSON.stringify(after),/synthetic-platter-560[234]/)
  assert.equal(after.clients.find(c=>c.id===client.id).segment,'Enterprise');assert.equal(after.proposals.find(r=>r.id===paid.id).options[0].tables.at(-1).lines.at(-1).catalogId,catalog.id);const performanceBefore=await h.send('/api/platter/sales-performance?group=segment',undefined,owner);assert.equal(performanceBefore.status,200);assert.deepEqual(performanceBefore.value.rows,beforePerformance.value.rows);assert.equal(performanceBefore.value.rows[0].label,'Enterprise');assert.deepEqual(performanceBefore.value.totals,beforePerformance.value.totals);assert.equal(after.proposals.find(p=>p.id===suggested.id).options[0].tables[0].lines[0].unitPrice,'100.00');assert.equal(after.proposals.find(p=>p.id===suggested.id).revision,2);assert.deepEqual((await h.send('/api/platter/audit?'+new URLSearchParams({action:'pricing.suggest.apply',subject:suggested.id}),undefined,owner)).value.rows,suggestionAudit);assert.ok(after.reportSchedules.some(s=>s.filters==='group=segment&quarter=2099-Q1&view=sales-performance'&&s.cadence==='weekly'));assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_report_mail').first()).n,0,'report transport mail is excluded from restoration');
  assert.deepEqual(after.proposals.find(r=>r.id===discounted.id).options,before.proposals.find(r=>r.id===discounted.id).options);assert.deepEqual(after.proposals.find(r=>r.id===scopedTemplate.id).approval,before.proposals.find(r=>r.id===scopedTemplate.id).approval);assert.deepEqual(after.proposals.find(r=>r.id===optional.id).internalPricing,before.proposals.find(r=>r.id===optional.id).internalPricing);assert.deepEqual(after.disputes,before.disputes);assert.equal((await h.cmd('dispute.submit',submission,owner)).status,'submitted','restored submission retries issue no provider call');const retainedEvidence=await h.mf.dispatchFetch(h.origin+'/api/platter/disputes/'+submission.disputeId+'/evidence.pdf?submission='+submission.requestId,{headers:{host:new URL(h.origin).host,cookie:owner}});assert.equal(retainedEvidence.status,200);assert.deepEqual(new Uint8Array(await retainedEvidence.arrayBuffer()),evidenceBytes);assert.deepEqual(after.catalogItems,before.catalogItems);assert.deepEqual(after.workspaceDefaults,before.workspaceDefaults);assert.deepEqual(after.approvalSettings,before.approvalSettings);assert.deepEqual(after.proposals.find(r=>r.id===p.id).internalPricing,before.proposals.find(r=>r.id===p.id).internalPricing);assert.deepEqual(after.libraryItems,before.libraryItems)
  const restoredRevenue=await h.send('/api/platter/pipeline?view=recorded-revenue&sort=value',undefined,owner);assert.equal(restoredRevenue.status,200);assert.deepEqual(restoredRevenue.value.rows,beforeRevenue.value.rows);assert.deepEqual(restoredRevenue.value.totals,beforeRevenue.value.totals);assert.deepEqual(after.reportSchedules,before.reportSchedules)
  for(const [i,t] of tables.entries())assert.deepEqual(canonical((await h.db.prepare('SELECT * FROM '+t).all()).results),rows[i],t)
  assert.deepEqual(restoredCalls,[],'archive restoration and dispute replay make no provider call')
  assert.deepEqual(after.templates.find(t=>t.id===deliveryTemplate.id).deliveryDefaults.paymentMethods,['card','ach'])
  const restoredPaymentDraft=await h.cmd('template.start',{id:deliveryTemplate.id,version:2,clientId:client.id},owner)
  assert.deepEqual((await h.state(owner)).proposals.find(p=>p.id===restoredPaymentDraft.id).collectionPolicy,{enabled:false,completion:'off',methods:['card','ach']})
  const sales=await h.signIn(people.sales.email),manager=await h.signIn(people.manager.email),other=await h.signIn(people.other.email)
  assert.deepEqual((await h.state(sales)).proposals.find(r=>r.id===lockedCopy.id).lockedSections,['block:columns','block:terms','terms']);await h.cmd('proposal.revise',{id:lockedCopy.id,version:1,clientId:client.id,title:'Archive routed offer',scope:'An audited scope',optionOne:'First',priceOne:'28000',optionTwo:'Second',priceTwo:'30000',depositPercent:'25',terms:'Changed locked terms'},sales,403)
  const restoredLocked=(await h.state(sales)).proposals.find(r=>r.id===lockedCopy.id)
  assert.deepEqual(restoredLocked.document,before.proposals.find(r=>r.id===lockedCopy.id).document)
  const changed=structuredClone(restoredLocked.document);changed.blocks.find(b=>b.id==='columns').second='Forbidden after restore'
  await h.cmd('proposal.document',{id:lockedCopy.id,version:1,document:changed},sales,403)
  await h.cmd('proposal.unlock',{id:lockedCopy.id,version:1,section:'block:columns'},sales,403)
  const moved=structuredClone(restoredLocked.document);moved.blocks.reverse()
  await h.cmd('proposal.document',{id:lockedCopy.id,version:1,document:moved},sales)
  assert.deepEqual((await h.state(sales)).proposals.find(r=>r.id===lockedCopy.id).document,moved)
  await h.cmd('proposal.unlock',{id:lockedCopy.id,version:2,section:'block:columns'},manager)
  assert.equal((await h.state(sales)).actor.role,'sales');assert.equal((await h.state(manager)).actor.role,'manager')
  assert.equal((await h.state(sales)).followups.timeZone,'America/New_York')
  assert.equal((await h.state(other)).proposals.some(r=>r.id===p.id),true)
  assert.deepEqual(after.proposals.find(r=>r.id===p.id).approval,before.proposals.find(r=>r.id===p.id).approval)
  assert.equal((await h.send('/api/platter/state',undefined,people.sales.cookie)).status,401,'source sessions confer no restored authority')
  await h.cmd('proposal.send',{id:p.id,version:4},sales)
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(Date.now()+10*86400000),cron:'*/15 * * * *'})
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_reminder_runs').first()).n,retainedReminders,'restored reminders never resume or replay outbound email')
  assert.deepEqual(restoredCalls,[],'the restored scheduler makes no provider call')
  await h.cmd('library.save',{id:archivedLibrary.id,version:1,title:'Synthetic case study',kind:'case_study',content:'Restored linked story'},owner)
  const restoredLibrary=(await h.state(owner)).proposals.find(r=>r.id===libraryCopy.id)
  assert.equal(restoredLibrary.document.blocks[0].text,'Restored linked story');assert.equal(restoredLibrary.document.blocks[1].text,'An archived text library item')
 }finally{await h?.close();await rm(temporary,{recursive:true,force:true})}
})


test('APPROVE-002 / AUTO-003 / FOLLOW-003 public CLI retains notification business history without credentials, queued messages or restored outbound authority', {timeout:180000},async()=>{
 const temporary=await mkdtemp(join(tmpdir(),'platter-notification-archive-')),source=join(temporary,'source'),restored=join(temporary,'restored');let h
 try{
  for(const path of [source,restored])await checkout(path)
  await exec(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','foundation','--local'],{cwd:source,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},maxBuffer:2e6})
  h=await harness({root:source,assetsDirectory:'public',outboundService:()=>Response.json({ok:true,team_id:'synthetic-platter-7100',channel:{id:'synthetic-platter-7101',is_member:true}})})
  const client=await h.cmd('client.save',{name:'Synthetic client',email:'client@synthetic-platter.example',segment:'Enterprise'})
  const p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Archive notification',scope:'Exact retained scope',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'})
  await h.cmd('provider.connect',{provider:'slack',version:0,token:'synthetic-platter-7102',consent:true})
  const collaborationRoute=await h.cmd('notification.route',{provider:'slack',event:'signed',kind:'channel',destination:'synthetic-platter-7101',consent:true})
  await h.cmd('collaboration.route',{routeId:collaborationRoute.id,consent:true})
  const person=(await h.state()).actor
  const comment=await h.cmd('collaboration.comment',{id:p.id,version:1,blockId:'pricing',text:'synthetic-platter-private-custody',recipientId:person.id,consent:true})
  await h.cmd('collaboration.resolve',{id:p.id,version:1,threadId:comment.threadId,threadVersion:1})
  await h.cmd('collaboration.assign',{id:p.id,version:1,blockId:'scope',recipientId:person.id,dueDate:'2030-03-04',consent:true})
  await h.cmd('notification.request',{id:p.id,version:1,consent:true});await h.cmd('notification.expiry',{id:p.id,version:1,consent:true})
  const expiry=await h.cmd('proposal.prepare',{clientId:client.id,title:'Archived sender notice',scope:'Exact expiry scope',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'})
  await h.cmd('expiry.set',{id:expiry.id,version:1,mode:'days',days:4,warningDays:1});await h.cmd('notification.expiry',{id:expiry.id,version:2,consent:true});await h.cmd('proposal.approve',{id:expiry.id,version:3,revision:1});await h.cmd('proposal.send',{id:expiry.id,version:4})
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(Date.now()+2*86400000),cron:'*/15 * * * *'})
  const signed=await h.cmd('proposal.prepare',{clientId:client.id,title:'Archived signed agreement',scope:'Exact signed scope',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'})
  await h.cmd('proposal.approve',{id:signed.id,version:1,revision:1});const signedShare=await h.cmd('proposal.send',{id:signed.id,version:2}),signedPath=new URL(signedShare.shareUrl).pathname
  await h.send(signedPath+'/action?name=code.request',{})
  const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code'").bind(signed.id).first()).body.match(/\b\d{6}\b/)[0]
  const verified=await h.send(signedPath+'/action?name=code.verify',{code});assert.equal(verified.status,200)
  assert.equal((await h.send(signedPath+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true},verified.cookie)).status,200)
  const certificate=await h.send(signedPath+'/certificate.json',undefined,verified.cookie);assert.equal(certificate.status,200,certificate.text);assert.equal(certificate.value.signers[0].method,'mailbox code')
  await h.cmd('notification.watch',{id:expiry.id,email:true,events:['comment','signed','paid'],consent:true})
  const smsRow=(await h.state()).proposals.find(row=>row.id===expiry.id)
  await h.cmd('sms.configure',{id:expiry.id,version:smsRow.version,consent:true,phone:'+12025550127',timeZone:'America/Los_Angeles',evidence:'synthetic-platter-7103'})
  await h.cmd('sms.send',{id:expiry.id,message:'Review the archived proposal',requestId:'synthetic-platter-7104'})
  const tables=['p_internal_threads','p_collaboration_events','p_signer_methods','p_signature_facts','p_agreement_artifacts','p_watchers','p_sms_consent','p_sms_runs','p_sms_optouts','p_sender_notice_runs','p_followups','p_followup_actions','p_approval_requests','p_notification_routes','p_sender_notice_defaults','p_sender_notice_settings'],before=Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await h.db.prepare('SELECT * FROM '+table+' ORDER BY 1').all()).results])))
  assert.equal(before.p_sender_notice_runs.length,1);assert.equal(before.p_followups[0].action,'Review approaching expiry');assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_notification_outbox').first()).n,7)
  await h.close();h=undefined
  const archive=join(temporary,'notifications.rer');await command(source,['export','--output',archive]);const bytes=await readFile(archive,'utf8');assert.ok(!bytes.includes('synthetic-platter-7102'))
  const records=bytes.split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.kind==='part').flatMap(p=>p.items).filter(r=>r.kind==='row')
  for(const table of ['p_collaboration_authority','p_collaboration_routes','p_watcher_authority','p_sms_authority','p_notification_outbox','p_notification_authority','p_notification_route_authority','p_sender_notice_authority','p_connection_secrets'])assert.equal(records.filter(r=>r.table===table).length,0,table+' stays local')
  await command(restored,['import','--input',archive,'--yes'])
  const calls=[];h=await harness({root:restored,unclaimed:true,assetsDirectory:'public',outboundService:request=>{calls.push(request.url);return Response.json({ok:true})}})
  for(const table of tables)assert.deepEqual((await h.db.prepare('SELECT * FROM '+table+' ORDER BY 1').all()).results,before[table],table+' retains exact business history')
  for(const table of ['p_collaboration_authority','p_collaboration_routes','p_watcher_authority','p_sms_authority','p_notification_outbox','p_notification_authority','p_notification_route_authority','p_sender_notice_authority','p_connection_secrets'])assert.equal((await h.db.prepare('SELECT count(*) AS n FROM '+table).first()).n,0)
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(Date.now()+10*86400000),cron:'*/15 * * * *'})
  const restoredOwner=await h.signIn(h.auth.OWNER_EMAIL)
  const restoredCertificate=await h.send('/api/platter/certificate.json?id='+signed.id,undefined,restoredOwner);assert.equal(restoredCertificate.status,200,restoredCertificate.text);assert.deepEqual(restoredCertificate.value,certificate.value)
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_sms_authority').first()).n,0,'restored SMS consent never restores sending authority')
  assert.deepEqual(calls,[],'restored historical requests and routes cannot reactivate outbound work')
 }finally{await h?.close();await rm(temporary,{recursive:true,force:true})}
})

test('EDIT-001 public CLI retains displayed media bytes, Client field values, block questions and suggestions without restoring client authority', {timeout:240000},async()=>{
 const temporary=await mkdtemp(join(tmpdir(),'platter-doc-archive-')),source=join(temporary,'source'),target=join(temporary,'target');let h
 try{
  await checkout(source);await checkout(target)
  await exec(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','foundation','--local'],{cwd:source,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},maxBuffer:2e6})
  h=await harness({root:source,assetsDirectory:'public'})
  const completedSetup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(completedSetup.status,303)
  const fields={clientId:(await h.cmd('client.save',{name:'Synthetic Platter client',email:'synthetic-platter-1@example.com'})).id,title:'Document custody',scope:'A reviewed project.',optionOne:'Studio',priceOne:'1000',optionTwo:'Campaign',priceTwo:'2000',depositPercent:'25',pricingTables:[{optionId:'one',name:'Library services',lines:[{name:'Workshop',quantity:'2',unit:'hour',unitPrice:'10.01'}]}]},created=await h.cmd('proposal.prepare',fields)
  const bytes=await readFile('public/brand/apple-touch-icon.png'),form=new FormData();form.set('id',created.id);form.set('version','1');form.set('consent','yes');form.set('file',new File([bytes],'synthetic-platter-1.png',{type:'image/png'}))
  const request=new Request(h.origin+'/app/document-media',{method:'POST',headers:{origin:h.origin,cookie:h.owner,accept:'application/json'},body:form}),upload=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});assert.equal(upload.status,200);const media=(await upload.json()).media
  const videoBytes=await readFile('fixtures/editor/synthetic-platter-1.webm'),videoForm=new FormData();videoForm.set('id',created.id);videoForm.set('version','1');videoForm.set('consent','yes');videoForm.set('file',new File([videoBytes],'synthetic-platter-1.webm',{type:'video/webm'}))
  const videoRequest=new Request(h.origin+'/app/document-media',{method:'POST',headers:{origin:h.origin,cookie:h.owner,accept:'application/json'},body:videoForm}),videoUpload=await h.mf.dispatchFetch(videoRequest.url,{method:'POST',headers:videoRequest.headers,body:await videoRequest.arrayBuffer()});assert.equal(videoUpload.status,200);const video=(await videoUpload.json()).media
  const document=documentFixture();document.brand.logoId=media.id;document.blocks.push({id:'image',type:'image',title:'Retained image',text:'Exact original.',assetId:media.id,alt:'Synthetic studio mark'},{id:'film',type:'video',title:'Retained film',text:'Exact video original.',assetId:video.id,posterId:media.id,alt:'Synthetic studio film'},{id:'pricing',type:'pricing',title:'Services',text:'Reusable pricing',optionId:'one',tableIndex:0},{id:'po',type:'field',title:'Purchase order',text:'',recipientRole:'client',fieldKind:'text',required:true},{id:'signature',type:'signature',title:'Client signature',text:'',recipientRole:'client'})
  document.blocks.push({id:'gallery',type:'gallery',title:'Retained gallery',text:'',images:[{assetId:media.id,alt:'Archived studio mark'}]},{id:'loom',type:'embed',title:'Retained external content',text:'',url:'https://www.loom.com/embed/'+'a'.repeat(32),posterId:media.id,alt:'Archived external poster',consent:true})
  document.blocks.push({id:'booking',type:'embed',title:'Retained booking',text:'',url:'https://calendly.com/synthetic-platter-1/review',posterId:media.id,alt:'Booking poster',consent:true},{id:'pdf-preview',type:'embed',title:'Retained PDF preview',text:'',url:'https://drive.google.com/file/d/synthetic-platter-1/preview',posterId:media.id,alt:'PDF poster',consent:true})
  await h.cmd('proposal.document',{id:created.id,version:1,document});await h.cmd('proposal.approve',{id:created.id,version:2,revision:2})
  const invitation=await h.cmd('proposal.send',{id:created.id,version:3}),path=new URL(invitation.shareUrl).pathname
  await h.send(path+'/action?name=code.request',{});const code=(await h.state()).outbox.find(r=>r.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0],verified=await h.send(path+'/action?name=code.verify',{code})
  await h.send(path+'/action?name=question.create',{revision:2,section:'block:story',text:'Is delivery included?'},verified.cookie)
  await h.cmd('suggestions.allow',{id:created.id,version:4,section:'block:story:text',enabled:true})
  assert.equal((await h.send(path+'/action?name=suggestion.create',{revision:2,section:'block:story:text',original:'clear',replacement:'weekly'},verified.cookie)).status,200)
  assert.equal((await h.send(path+'/action?name=accept',{optionId:'two',name:'Synthetic signer',consent:true,'field:po':'synthetic-platter-2','signature:signature':'Synthetic signer'},verified.cookie)).status,200)
  let before=(await h.state()).proposals.find(p=>p.id===created.id)
  const template=await h.cmd('template.save',{id:created.id,version:before.version,name:'Retained document'})
  const richItems=[]
  for(const [kind,blockId] of [['image','image'],['video','film'],['pricing','pricing']])richItems.push({...await h.cmd('library.save',{title:'Archived '+kind,kind,sourceRef:created.id+':'+blockId,shareConsent:true,tags:['custody']}),kind})
  const libraryDraft=await h.cmd('proposal.prepare',{...fields,title:'Retained library copies',pricingTables:[]})
  let libraryVersion=1
  for(const item of richItems)for(const mode of ['linked','detached'])await h.cmd('library.insert',{id:libraryDraft.id,version:libraryVersion++,itemId:item.id,itemVersion:1,mode,consent:true})
  const searchable=await PDFDocument.create(),searchFont=await searchable.embedFont(StandardFonts.Helvetica);searchable.addPage().drawText('Synthetic Platter retained PDF search',{font:searchFont,x:48,y:700,size:12});const searchBytes=await searchable.save(),searchForm=new FormData();searchForm.set('id',libraryDraft.id);searchForm.set('version',String(libraryVersion));searchForm.set('file',new File([searchBytes],'synthetic-platter-8400.pdf',{type:'application/pdf'}));const searchRequest=new Request(h.origin+'/app/attachment',{method:'POST',headers:{origin:h.origin,cookie:h.owner},body:searchForm}),searchUpload=await h.mf.dispatchFetch(searchRequest.url,{method:'POST',headers:searchRequest.headers,body:await searchRequest.arrayBuffer()});assert.equal(searchUpload.status,200)
  const libraryBefore=(await h.state()).libraryItems,libraryDocBefore=(await h.state()).proposals.find(p=>p.id===libraryDraft.id)
  const folder=await h.cmd('folder.save',{kind:'proposal',name:'Archived proposal folder',teams:[],shareConsent:true});await h.cmd('proposal.folder',{id:created.id,version:before.version,folderId:folder.id,shareConsent:true});before=(await h.state()).proposals.find(p=>p.id===created.id)
  const identity={auth:h.auth,owner:h.owner};await h.close();h=undefined
  const archive=join(temporary,'document.rer');await command(source,['export','--output',archive,'--no-queue']);await command(target,['import','--input',archive,'--yes','--no-queue'])
  h=await harness({root:target,...identity,assetsDirectory:'public'});const owner=await h.signIn(h.auth.OWNER_EMAIL),after=(await h.state(owner)).proposals.find(p=>p.id===created.id)
  for(const key of ['document','documentMedia','acceptance','questions','suggestions','suggestionSections','folderId','folderVersion'])assert.deepEqual(after[key],before[key],'public CLI retains '+key)
  assert.deepEqual((await h.state(owner)).libraryItems,libraryBefore,'rich item payloads, tags, usages and change times survive the public CLI')
  assert.deepEqual((await h.state(owner)).proposals.find(p=>p.id===libraryDraft.id).document,libraryDocBefore.document)
  for(const item of richItems)await h.cmd('library.save',{id:item.id,version:1,title:'Restored '+item.kind,kind:item.kind},owner)
  const restoredSearch=await h.send('/api/platter/pipeline?q='+encodeURIComponent('Synthetic Platter retained PDF search'),undefined,owner);assert.equal(restoredSearch.status,200);assert.deepEqual(restoredSearch.value.rows.map(p=>p.id),[libraryDraft.id],'PDF content remains searchable after public CLI restore')
  const restoredLibrary=(await h.state(owner)).proposals.find(p=>p.id===libraryDraft.id)
  for(const [index,item] of richItems.entries()){assert.equal(restoredLibrary.document.blocks[index*2].title,'Restored '+item.kind);assert.equal(restoredLibrary.document.blocks[index*2+1].title,'Archived '+item.kind)}
  for(const [file,original] of [[media,bytes],[video,videoBytes]]){const response=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+libraryDraft.id+'/'+file.id,{headers:{cookie:owner}});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),original)}
  const newDraft=await h.cmd('proposal.prepare',{...fields,title:'New restored library use',pricingTables:[]},owner)
  await h.cmd('library.insert',{id:newDraft.id,version:1,itemId:richItems[0].id,itemVersion:2,mode:'linked',consent:true},owner)
  assert.equal((await h.send('/api/platter/document-media/'+newDraft.id+'/'+media.id,undefined,owner)).status,200,'restored library media can be inserted independently of its source')
  const image=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+created.id+'/'+media.id,{headers:{cookie:owner}});assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),bytes)
  const restoredVideo=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+created.id+'/'+video.id,{headers:{cookie:owner}});assert.equal(restoredVideo.status,200);assert.deepEqual(Buffer.from(await restoredVideo.arrayBuffer()),videoBytes,'video bytes survive the public CLI exactly')
  assert.equal((await h.send(path+'/media/'+media.id,undefined,verified.cookie)).status,404,'restore never reinstates invitation/media authority')
  const started=await h.cmd('template.start',{id:template.id,version:template.version,clientId:fields.clientId},owner)
  assert.equal((await h.send('/api/platter/document-media/'+started.id+'/'+media.id,undefined,owner)).status,200,'template media mapping survives the same CLI round trip')
 }finally{await h?.close();await rm(temporary,{recursive:true,force:true})}
})
