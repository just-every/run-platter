import { acceptRevenue } from './revenue-fixture.mjs'
import { collectionLifecycle, collectionFees, collectionMethodInheritance } from './collection-journey.mjs'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { richLibraryPropagation, richLibrarySource } from './library-fixture.mjs'
import { documentFixture } from './document-fixture.mjs'
import { templatesHttp } from './templates-http.mjs'
import { followupJourney } from './followup-journey.mjs'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { unstable_splitSqlQuery } from 'wrangler'
import { run, harness } from './harness.mjs'
import { pdfPages } from './pdf-document.mjs'
const offer={title:'Northstar brand photography',scope:'One studio shoot, edited photographs, and usage licence.',optionOne:'Studio essentials',priceOne:'2400.00',optionTwo:'Full campaign',priceTwo:'4200.00',depositPercent:'25'}
async function audited(h,action,actor,role,subject){const query=new URLSearchParams({action,actor,subject}),r=await h.send('/api/platter/audit?'+query,undefined,h.owner);assert.equal(r.status,200,r.text);assert.ok(r.value.rows.some(row=>row.action===action&&row.actor_id===actor&&row.actor_role===role&&row.subject===subject&&Number.isSafeInteger(row.occurred_at)&&row.occurred_at>0),'audit identifies the acting role and exact resource for '+action)}
async function draft(h){const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'});const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id});return{client,p}}
async function sent(h){const{client,p}=await draft(h);await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});const share=await h.cmd('proposal.send',{id:p.id,version:2});return{client,p,path:new URL(share.shareUrl).pathname}}
async function verified(h,path){let r=await h.send(path+'/action?name=code.request',{});assert.equal(r.status,200,r.text);const mail=(await h.state()).outbox.find(x=>x.subject.includes('verification code'));const code=mail.body.match(/\b\d{6}\b/)[0];r=await h.send(path+'/action?name=code.verify',{code});assert.equal(r.status,200,r.text);assert.ok(r.cookie);return r.cookie}
test('EDIT-017 Spanish mailbox journey preserves authority, verification limits, authored content and actual certificate language',async()=>{const h=await harness({assetsDirectory:'public'});try{
 const {client,p}=await draft(h)
 const at=Date.parse('2030-06-01T15:00:00Z'),tick=async time=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(time),cron:'*/15 * * * *'})
 await tick(at)
 const before=(await h.state()).proposals.find(row=>row.id===p.id)
 const memberEmail='synthetic-platter-9708'+String.fromCharCode(64)+'example.test'
 await h.send('/auth/invite',{email:memberEmail,displayName:'Client member',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn(memberEmail)
 await h.cmd('proposal.locale',{id:p.id,version:1,locale:'es'},member,403)
 await h.cmd('proposal.locale',{id:p.id,version:0,locale:'es'},h.owner,409)
 await h.cmd('proposal.locale',{id:p.id,version:1,locale:'fr'},h.owner,400)
 assert.deepEqual((await h.state()).proposals.find(row=>row.id===p.id),before)
 await h.cmd('proposal.locale',{id:p.id,version:1,locale:'es'})
 await h.cmd('proposal.approve',{id:p.id,version:2,revision:1})
 const invitation=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(invitation.shareUrl).pathname
 await h.cmd('proposal.locale',{id:p.id,version:4,locale:'en'},h.owner,409)
 await h.cmd('signer.method',{id:p.id,version:4,method:'SMS code'},h.owner,409)
 let r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true});assert.equal(r.status,401);assert.match(r.text,/Verifique su correo electrónico antes de aceptar/)
 r=await h.send(path,undefined,'',{'accept-language':'fr'});assert.match(r.text,/<html lang="es">/);assert.ok(r.text.includes(offer.scope));assert.ok(r.text.includes(offer.optionOne))
 assert.match(r.text,/Privacidad de las visitas/);assert.match(r.text,/No se utilizan rastreadores de terceros/)
 await h.cmd('tracking.settings',{enabled:'yes',alerts:'no',retentionDays:90,quietMinutes:30,consent:'yes'})
 r=await h.send(path);assert.match(r.text,/Se miden las visitas a esta página/);assert.match(r.text,/No se almacena la dirección IP completa/);assert.match(r.text,/¿Ha recibido un enlace reenviado\?/)
 r=await h.send(path+'/action?name=code.request',{});assert.equal(r.status,200)
 const code=(await h.state()).outbox.find(m=>m.subject==='Su código de verificación de Platter').body.match(/\b\d{6}\b/)[0],wrong=code==='000000'?'000001':'000000'
 assert.equal((await h.send(path+'/action?name=code.request',{})).status,429)
 for(let i=0;i<5;i++){r=await h.send(path+'/action?name=code.verify',{code:wrong});assert.equal(r.status,401);assert.match(r.text,/Código de verificación incorrecto/)}
 r=await h.send(path+'/action?name=code.verify',{code});assert.equal(r.status,401);assert.match(r.text,/límite de intentos/)
 await tick(at+60000)
 assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
 const next=(await h.state()).outbox.find(m=>m.subject==='Su código de verificación de Platter').body.match(/\b\d{6}\b/)[0]
 r=await h.send(path+'/action?name=code.verify',{code:next});assert.equal(r.status,200,r.text);const cookie=r.cookie
 assert.equal((await h.send(path+'/action?name=code.verify',{code:next})).status,401)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:false},cookie)).status,400)
 r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},cookie);assert.equal(r.status,200,r.text);assert.match(r.text,/Propuesta aceptada/)
 const accepted=(await h.state()).proposals.find(row=>row.id===p.id)
 assert.equal(accepted.acceptance.language,'es');assert.equal(accepted.acceptance.totalCents,420000);assert.equal(accepted.acceptance.depositCents,105000)
 const frozen=JSON.parse((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).snapshot)
 assert.equal(frozen.language,'es');assert.equal(frozen.scope,offer.scope);assert.equal(frozen.options[0].label,offer.optionOne)
 assert.equal((await h.send(path+'/certificate.json')).status,401)
 const certificate=await h.send(path+'/certificate.json',undefined,cookie);assert.equal(certificate.status,200,certificate.text);assert.equal(certificate.value.language,'es');assert.equal(certificate.value.signers[0].language,'es')
 const response=await h.mf.dispatchFetch(h.origin+path+'/certificate.pdf',{headers:{cookie}});assert.equal(response.status,200)
 assert.match((await pdfPages(new Uint8Array(await response.arrayBuffer()))).join(' '),/Language shown: Spanish \(es\)/)
 const legacyP=await h.cmd('proposal.prepare',{...offer,clientId:client.id})
 await h.cmd('proposal.approve',{id:legacyP.id,version:1,revision:1})
 const legacy={p:legacyP,path:new URL((await h.cmd('proposal.send',{id:legacyP.id,version:2})).shareUrl).pathname},legacyCookie=await verified(h,legacy.path)
 const historical=(await h.state()).proposals.find(row=>row.id===legacy.p.id)
 // Seed a retained pre-language agreement without changing any immutable fact.
 await h.db.batch([
  h.db.prepare('INSERT INTO p_acceptances(proposal_id,revision,snapshot,name,email,option_id,total_cents,deposit_cents,accepted_at,consent,currency) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(legacy.p.id,1,JSON.stringify(historical),'Avery Chen',historical.clientEmail??h.auth.OWNER_EMAIL,'one',240000,60000,at,'I accept the selected option, scope and deposit.','USD'),
  h.db.prepare('INSERT INTO p_signature_facts(proposal_id,revision,method,verified_at) VALUES(?,?,?,?)').bind(legacy.p.id,1,'mailbox code',at),
  h.db.prepare("UPDATE p_proposals SET status='accepted' WHERE id=?").bind(legacy.p.id)
 ])
 const old=await h.send(legacy.path+'/certificate.json',undefined,legacyCookie);assert.equal(old.status,200);assert.equal(old.value.language,undefined);assert.equal(old.value.signers[0].language,undefined)
 const limited=await h.cmd('proposal.prepare',{...offer,clientId:client.id})
 await h.cmd('payment.collection',{id:limited.id,version:1,completion:'required',paymentMethods:['card']})
 await h.cmd('proposal.locale',{id:limited.id,version:2,locale:'es'},h.owner,409)
 await h.cmd('payment.collection',{id:limited.id,version:2,completion:'off'})
 await h.cmd('proposal.locale',{id:limited.id,version:3,locale:'es'})
 await h.cmd('proposal.approve',{id:limited.id,version:4,revision:1})
 const limitedPath=new URL((await h.cmd('proposal.send',{id:limited.id,version:5})).shareUrl).pathname
 assert.equal((await h.send(limitedPath+'/action?name=code.request',{})).status,200)
 const expired=(await h.state()).outbox.find(m=>m.proposal_id===limited.id&&m.subject==='Su código de verificación de Platter').body.match(/\b\d{6}\b/)[0]
 let now=at+660000;await tick(now)
 assert.equal((await h.send(limitedPath+'/action?name=code.verify',{code:expired})).status,401,'a ten-minute-old code cannot verify a Spanish invitation')
 for(let generation=2;generation<=10;generation++){await tick(now+=60000);assert.equal((await h.send(limitedPath+'/action?name=code.request',{})).status,200)}
 await tick(now+=60000)
 const exhausted=await h.db.prepare('SELECT * FROM p_shares WHERE token=?').bind(limitedPath.split('/').at(-1)).first()
 r=await h.send(limitedPath+'/action?name=code.request',{});assert.equal(r.status,429);assert.match(r.text,/límite de solicitudes/)
 assert.deepEqual(await h.db.prepare('SELECT * FROM p_shares WHERE token=?').bind(limitedPath.split('/').at(-1)).first(),exhausted)
 const fresh=new URL((await h.cmd('proposal.send',{id:limited.id,version:6})).shareUrl).pathname
 assert.equal((await h.send(limitedPath+'/action?name=code.verify',{code:expired})).status,404)
 assert.equal((await h.send(limitedPath)).status,404)
 const freshRequest=await h.send(fresh+'/action?name=code.request',{});assert.equal(freshRequest.status,200)
 const freshCode=(await h.state()).outbox.find(m=>m.proposal_id===limited.id&&m.subject==='Su código de verificación de Platter').body.match(/\b\d{6}\b/)[0]
 const freshVerification=await h.send(fresh+'/action?name=code.verify',{code:freshCode});assert.equal(freshVerification.status,200)
 r=await h.send(fresh+'/action?name=decline',{revision:1,reason:'No se necesita',consent:true},freshVerification.cookie);assert.equal(r.status,410);assert.match(r.text,/Propuesta retirada/);assert.ok(!r.text.includes(offer.scope))
 r=await h.send(fresh,undefined,freshVerification.cookie);assert.equal(r.status,410);assert.match(r.text,/<html lang="es">/);assert.ok(!r.text.includes(offer.scope))
 }finally{await h.close()}
})
test('native auth, CSRF, roles and revocable agent boundary',()=>run(async h=>{
 await h.state('',401);await h.cmd('client.save',{name:'Unsafe',email:'a@b.example'},h.owner,403,{origin:'https://elsewhere.example'})
 const key=await h.cmd('agent.create',{label:'Draft assistant'});let r=await h.send('/api/platter/agent/command',{name:'client.save',input:{}},'',{authorization:'Bearer '+key.token});assert.equal(r.status,403)
 const c=await h.cmd('client.save',{name:'Northstar',email:'northstar@studio.example'});r=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{...offer,clientId:c.id}},'',{authorization:'Bearer '+key.token});assert.equal(r.status,200,r.text)
 r=await h.send('/api/platter/agent/command',{name:'proposal.approve',input:{id:r.value.id,version:1,revision:1}},'',{authorization:'Bearer '+key.token});assert.equal(r.status,403)
 await h.cmd('agent.revoke',{id:key.id});r=await h.send('/api/platter/agent/context',undefined,'',{authorization:'Bearer '+key.token});assert.equal(r.status,401)
 await h.send('/auth/invite',{email:'member@studio.example',displayName:'Studio colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('member@studio.example');await h.cmd('proposal.approve',{id:'anything',version:1,revision:1},member,403);await h.cmd('invoice.export',{id:'anything'},member,403);await h.cmd('import.preview',{csv:'client_id,name,email\na,A,a@b.example'},member,403)
}))
test('PROP-001 / PROP-002 exact approvals, frozen offers and fresh invitations invalidate old authority',()=>run(async h=>{
 const{client,p}=await draft(h);await h.cmd('proposal.approve',{id:p.id,version:1,revision:2},h.owner,409);await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:2,priceOne:'2600'});await h.cmd('proposal.send',{id:p.id,version:3},h.owner,409);await h.cmd('proposal.approve',{id:p.id,version:2,revision:1},h.owner,409);await h.cmd('proposal.approve',{id:p.id,version:3,revision:2});await h.cmd('proposal.send',{id:p.id,version:4});await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:5},h.owner,409)
 const state=await h.state();assert.equal(state.proposals[0].prepared_by,h.auth.OWNER_EMAIL);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_approvals').first()).n,2)
 const before=state.proposals.find(x=>x.id===p.id),oldPath='/p/'+before.shareToken,cookie=await verified(h,oldPath)
 const terms=({title,scope,options,deposit_bps,revision,approved_by,approved_at})=>({title,scope,options,deposit_bps,revision,approved_by,approved_at})
 const invitation=await h.cmd('proposal.send',{id:p.id,version:before.version}),newPath=new URL(invitation.shareUrl).pathname
 assert.notEqual(newPath,oldPath)
 assert.equal((await h.send(oldPath,undefined,cookie)).status,404)
 assert.equal((await h.send(oldPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,404)
 let response=await h.send(newPath,undefined,cookie);assert.equal(response.status,200);assert.match(response.text,/Verify your email/)
 response=await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie);assert.equal(response.status,401)
 const after=(await h.state()).proposals.find(x=>x.id===p.id)
 assert.deepEqual(terms(after),terms(before));assert.equal(after.status,'sent')
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_approvals WHERE proposal_id=?').bind(p.id).first()).n,2,'fresh invitation requires no new approval')
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:after.version,scope:'Changed scope',priceOne:'1'},h.owner,409)
 const newCookie=await verified(h,newPath)
 response=await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},newCookie);assert.equal(response.status,200)
 assert.deepEqual(terms((await h.state()).proposals.find(x=>x.id===p.id)),terms(before))
}))
test('email verification precedes acceptance, code is single-use, immutable option and deposit exported once',()=>run(async h=>{
 const{p,path}=await sent(h);let r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true});assert.equal(r.status,401)
 const cookie=await verified(h,path);r=await h.send(path+'/action?name=code.verify',{code:'000000'});assert.equal(r.status,401)
 r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'other',consent:true},cookie);assert.equal(r.status,400)
 r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:'yes'},cookie);assert.equal(r.status,200,r.text);assert.match(r.text,/Proposal accepted/)
 r=await h.send(path+'/action?name=accept',{name:'Changed',optionId:'one',consent:true},cookie);assert.equal(r.status,200)
 const state=await h.state();assert.equal(state.proposals[0].acceptance.name,'Avery Chen');assert.equal(state.proposals[0].acceptance.totalCents,420000);assert.equal(state.proposals[0].acceptance.depositCents,105000)
 const exports=await Promise.all([h.cmd('invoice.export',{id:p.id}),h.cmd('invoice.export',{id:p.id})]);assert.equal(exports[0].id,exports[1].id);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_invoices').first()).n,1)
 r=await h.send('/api/platter/invoices/'+exports[0].id+'.csv',undefined,h.owner);assert.equal(r.status,200);assert.match(r.text,/1050\.00/);assert.match(r.text,/No Tax,USD/);assert.match(r.text,/Northstar Coffee/)
}))
test('code attempt limits, resend throttling and revision-bound sessions',()=>run(async h=>{
 const{path}=await sent(h);await h.send(path+'/action?name=code.request',{});assert.equal((await h.send(path+'/action?name=code.request',{})).status,429)
 const code=(await h.state()).outbox.find(x=>x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0];const wrong=code==='000000'?'111111':'000000';for(let n=0;n<5;n++)assert.equal((await h.send(path+'/action?name=code.verify',{code:wrong})).status,401);assert.equal((await h.send(path+'/action?name=code.verify',{code})).status,401)
 const token=path.split('/').at(-1);await h.db.prepare('UPDATE p_shares SET code_expires=? WHERE token=?').bind(Date.now()-1,token).run();assert.equal((await h.send(path+'/action?name=code.verify',{code:'123456'})).status,401)
}))
test('money rejects malformed or unsafe prices and cannot export an unaccepted proposal',()=>run(async h=>{
 const{client,p}=await draft(h);for(const price of ['0','1.234','-4','NaN','10000001'])await h.cmd('proposal.prepare',{...offer,clientId:client.id,priceOne:price},h.owner,400);await h.cmd('invoice.export',{id:p.id},h.owner,409)
}))
test('Client CSV dry run, fingerprint custody, journal, replay and undo through HTTP',()=>run(async h=>{
 const csv=await readFile('fixtures/clients.csv','utf8'),preview=await h.cmd('import.preview',{csv});assert.equal(preview.canApply,true);assert.equal((await h.state()).clients.length,0)
 await h.cmd('import.apply',{csv:csv.replace('@','2@'),fingerprint:preview.fingerprint},h.owner,409)
 let result=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint});for(let n=0;n<20&&result.job.state!=='completed';n++)result=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint});assert.equal(result.job.state,'completed');const journal=await h.cmd('import.journal',{id:result.job.id});assert.ok(journal.originals.length>0);assert.equal((await h.state()).clients.length,3)
 const original='/api/platter/client-original?job='+encodeURIComponent(result.job.id)+'&name=clients.csv'
 assert.equal((await h.send(original,undefined,h.owner)).text,csv,'the journal downloads byte-identical original CSV')
 assert.equal((await h.send(original)).status,401)
 await h.send('/auth/invite',{email:'synthetic-platter-9100@example.com',displayName:'Import viewer',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('synthetic-platter-9100@example.com');assert.equal((await h.send(original,undefined,member)).status,403)
 assert.equal((await h.send(original.replace('clients.csv','missing.csv'),undefined,h.owner)).status,404)
 const missing=await h.cmd('import.journal',{id:'synthetic-platter-missing'},h.owner,404)
 assert.match(missing.error,/^[A-Z][^_]+[.!]$/,'a missing journal explains recovery instead of showing an internal code')
 const conflict=await h.cmd('import.preview',{csv});assert.equal(conflict.canApply,false)
 assert.ok(conflict.conflicts.every(row=>row.message&&row.message.includes('preview')),'each conflicting row explains the next action')

 const again=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint});assert.equal(again.job.id,result.job.id)
 let undone=await h.cmd('import.undo',{id:result.job.id});for(let n=0;n<20&&undone.job.state==='undoing';n++)undone=await h.cmd('import.undo',{id:result.job.id});assert.equal(undone.job.state,'undone');assert.equal((await h.state()).clients.length,0)
}))
test('import undo preserves clients with dependent proposals; owner erasure fences unused client',()=>run(async h=>{
 const{client}=await draft(h);await h.cmd('client.erase',{id:client.id,confirmName:'Northstar Coffee'},h.owner,409)
 const other=await h.cmd('client.save',{name:'Temporary enquiry',email:'temporary@studio.example'});await h.cmd('client.erase',{id:other.id,confirmName:'Wrong'},h.owner,400);await h.cmd('client.erase',{id:other.id,confirmName:'Temporary enquiry'});assert.ok(!(await h.state()).clients.some(c=>c.id===other.id));const csv='client_id,name,email\nimported,Longhouse Studio,hello@longhouse.example';const preview=await h.cmd('import.preview',{csv});const applied=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint});await h.cmd('proposal.prepare',{...offer,clientId:'imported'});await h.cmd('import.undo',{id:applied.job.id},h.owner,409);assert.ok((await h.state()).clients.some(c=>c.id==='imported'))
}))
test('COLLAB-003 every saved revision has an author/time, comparisons highlight changes, restore creates unapproved revision four',()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {client,p}=await draft(h)
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:1,scope:'Second draft: two studio shoots.',priceOne:'2800'})
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:2,scope:'Third draft: three shoots and social assets.',priceOne:'3600',optionOne:'Expanded studio'})
 await h.cmd('proposal.approve',{id:p.id,version:3,revision:3})
 const before=await h.state(), revisions=before.revisions.filter(r=>r.proposal_id===p.id)
 assert.deepEqual(revisions.map(r=>r.revision),[3,2,1])
 for(const revision of revisions){assert.equal(revision.prepared_by,h.auth.OWNER_EMAIL);assert.ok(revision.prepared_at>0)}
 const compared=await h.send(`/app/proposal?id=${p.id}&from=1&to=3`,undefined,h.owner)
 assert.equal(compared.status,200);assert.match(compared.text,/<del>One studio shoot, edited photographs, and usage licence\.<\/del>/);assert.match(compared.text,/<ins>Third draft: three shoots and social assets\.<\/ins>/);assert.match(compared.text,/<del>\$2,400\.00 USD<\/del>/);assert.match(compared.text,/<ins>\$3,600\.00 USD<\/ins>/);assert.match(compared.text,/<ins>Expanded studio<\/ins>/)
 await h.cmd('proposal.restore',{id:p.id,version:3,revision:1},h.owner,409)
 await h.send('/auth/invite',{email:'editor@studio.example',displayName:'Proposal editor',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('editor@studio.example')
 await h.cmd('proposal.share',{id:p.id,operatorId:(await h.state(member)).actor.id})
 await h.cmd('proposal.restore',{id:p.id,version:4,revision:1},member)
 const after=await h.state(), restored=after.proposals.find(row=>row.id===p.id)
 assert.equal(restored.prepared_by,'editor@studio.example');assert.equal(after.revisions.find(r=>r.proposal_id===p.id&&r.revision===4).prepared_by,'editor@studio.example')
 assert.equal(restored.revision,4);assert.equal(restored.version,5);assert.equal(restored.status,'draft');assert.equal(restored.approved_by,null);assert.equal(restored.approved_at,null)
 const fields=({title,scope,client_id,options,deposit_bps})=>({title,scope,client_id,options,deposit_bps})
 assert.deepEqual(fields(restored),fields(revisions.find(row=>row.revision===1).snapshot))
 assert.deepEqual(after.revisions.filter(r=>r.proposal_id===p.id&&r.revision<4),revisions)
 await h.cmd('proposal.send',{id:p.id,version:5},h.owner,409)
 const backwards=await h.send(`/app/proposal?id=${p.id}&from=3&to=2`,undefined,h.owner);assert.match(backwards.text,/<del>Third draft:/);assert.match(backwards.text,/<ins>Second draft:/)
 await h.cmd('proposal.approve',{id:p.id,version:5,revision:4});await h.cmd('proposal.send',{id:p.id,version:6});await h.cmd('proposal.restore',{id:p.id,version:7,revision:1},h.owner,409)
}))

test('NEG-001 negotiated offer requires exact approval, preserves the live offer until send, compares changes and accepts revision two',()=>run(async h=>{
 const {client,p,path}=await sent(h), cookie=await verified(h,path)
 const original=(await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=1').bind(p.id).first()).snapshot
 const negotiated=await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:3,scope:'Two studio shoots and a campaign licence.',priceOne:'2800'})
 assert.equal(negotiated.revision,2)
 const pending=(await h.state()).proposals.find(row=>row.id===p.id)
 assert.equal(pending.status,'draft');assert.equal(pending.approved_by,null);assert.equal(pending.sentRevision,1)
 let live=await h.send(path,undefined,cookie);assert.equal(live.status,200);assert.match(live.text,/One studio shoot/);assert.ok(!live.text.includes('Two studio shoots'))
 await h.cmd('proposal.send',{id:p.id,version:4},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:4,revision:1},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:4,revision:2})
 const shared=await h.cmd('proposal.send',{id:p.id,version:5}),replacement=new URL(shared.shareUrl).pathname
 assert.notEqual(replacement,path)
 assert.equal((await h.send(path,undefined,cookie)).status,404)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,404)
 live=await h.send(replacement,undefined,cookie);assert.equal(live.status,200);assert.match(live.text,/<del>\$2,400\.00 USD<\/del>/);assert.match(live.text,/<ins>\$2,800\.00 USD<\/ins>/);assert.match(live.text,/Two studio shoots/)
 assert.equal((await h.send(replacement+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,401)
 const fresh=await verified(h,replacement)
 assert.equal((await h.send(replacement+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},fresh)).status,200)
 const accepted=(await h.state()).proposals.find(row=>row.id===p.id)
 assert.equal(accepted.revision,2);assert.equal(accepted.acceptance.revision,2);assert.equal(accepted.acceptance.totalCents,280000);assert.equal(accepted.acceptance.depositCents,70000)
 const saved=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
 assert.equal(JSON.parse(saved.snapshot).scope,'Two studio shoots and a campaign licence.')
 assert.equal((await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=1').bind(p.id).first()).snapshot,original)
 assert.deepEqual((await h.db.prepare('SELECT revision FROM p_approvals WHERE proposal_id=? ORDER BY revision').bind(p.id).all()).results.map(r=>r.revision),[1,2])
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:accepted.version},h.owner,409)
 // A live offer accepted while its replacement is drafted wins atomically.
 const secondDraft=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Second campaign'})
 await h.cmd('proposal.approve',{id:secondDraft.id,version:1,revision:1})
 const secondShare=await h.cmd('proposal.send',{id:secondDraft.id,version:2})
 const second={p:secondDraft,client,path:new URL(secondShare.shareUrl).pathname}, priorCookie=await verified(h,second.path)
 await h.cmd('proposal.negotiate',{...offer,clientId:second.client.id,id:second.p.id,version:3,priceTwo:'5000'})
 await h.cmd('proposal.approve',{id:second.p.id,version:4,revision:2})
 await h.cmd('proposal.revise',{...offer,clientId:second.client.id,id:second.p.id,version:5,priceTwo:'5100'})
 const edited=(await h.state()).proposals.find(row=>row.id===second.p.id);assert.equal(edited.revision,3);assert.equal(edited.approved_by,null)
 await h.cmd('proposal.send',{id:second.p.id,version:6},h.owner,409)
 assert.equal((await h.send(second.path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},priorCookie)).status,200)
 const firstAccepted=(await h.state()).proposals.find(row=>row.id===second.p.id);assert.equal(firstAccepted.acceptance.revision,1);assert.equal(firstAccepted.acceptance.totalCents,420000)
 await h.cmd('proposal.send',{id:second.p.id,version:firstAccepted.version},h.owner,409)
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_negotiations WHERE proposal_id=?').bind(second.p.id).first()).n,0)
}))

test('FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership',()=>run(async h=>{
 await h.cmd('tracking.settings',{enabled:'yes',alerts:'no',retentionDays:90,quietMinutes:30,consent:'yes'})
 const clients=[]
 for(const [name,email] of [['Northstar Coffee','avery@northstar.example'],['Juniper Design','sam@juniper.example']])clients.push(await h.cmd('client.save',{name,email}))
 const people=[{email:h.auth.OWNER_EMAIL,cookie:h.owner,id:(await h.state()).actor.id}]
 for(const email of ['morgan@studio.example','casey@studio.example']){
  await h.send('/auth/invite',{email,displayName:email.split('@')[0],role:'member',returnTo:'/app'},h.owner)
  const cookie=await h.signIn(email);people.push({email,cookie,id:(await h.state(cookie)).actor.id})
 }
 const fixture=[]
 for(let i=0;i<30;i++){
  const person=people[i%3],client=clients[i%2],input={...offer,clientId:client.id,title:`Campaign ${String(i+1).padStart(2,'0')}`,priceOne:String(1000+i*10),priceTwo:String(2000+i*20)}
  const made=await h.cmd('proposal.prepare',input,person.cookie),status=i===22?'viewed':i===2?'expired':i===6?'withdrawn':i===10?'declined':i===14?'lost':i===18?'won':['draft','approved','sent','accepted'][i%4]
  let version=1
  if(status!=='draft'){await h.cmd('proposal.approve',{id:made.id,version:version++,revision:1})}
  if(['sent','viewed','accepted','expired','withdrawn','declined','lost','won'].includes(status)){
   const shared=await h.cmd('proposal.send',{id:made.id,version:version++})
   if(status==='viewed')assert.equal((await h.send(new URL(shared.shareUrl).pathname)).status,200)
   if(status==='won')await h.cmd('proposal.win',{id:made.id,version:version++,reason:'Signed outside'})
   if(status==='lost')await h.cmd('proposal.lose',{id:made.id,version:version++,reason:'Project cancelled'})
   if(status==='declined'){const path=new URL(shared.shareUrl).pathname,cookie=await verified(h,path);assert.equal((await h.send(path+'/action?name=decline',{revision:1,reason:'Budget'},cookie)).status,410)}
   if(status==='withdrawn')await h.cmd('proposal.withdraw',{id:made.id,version:version++,reason:'Client project cancelled',notice:false})
   if(status==='expired')await h.cmd('expiry.set',{id:made.id,version:version++,mode:'date',date:'2020-03-01'})
   if(status==='accepted'){
    const path=new URL(shared.shareUrl).pathname,cookie=await verified(h,path)
    assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)
   }
  }
  fixture.push({id:made.id,title:input.title,status:status==='draft'?'awaiting-approval':status,owner:person.id,client:client.id,valueCents:(status==='accepted'?1000+i*10:2000+i*20)*100,nextAction:status==='draft'?'approve':status==='approved'?'send':['sent','viewed'].includes(status)?'await-client':status==='expired'?'reopen':['withdrawn','declined','lost','won'].includes(status)?'withdrawn':'export-deposit'})
 }
 const scheduled=fixture.filter(p=>['sent','viewed'].includes(p.status)).slice(0,2)
 for(const [i,row] of scheduled.entries()){await h.cmd('followup.schedule',{id:row.id,action:'Call the client',dueDate:i?'2000-03-02':'2000-03-01'});row.nextAction='followup'}
 const aged=fixture.find(p=>p.status==='awaiting-approval')
 await h.db.prepare('UPDATE p_proposals SET created_at=? WHERE id=?').bind(Date.now()-3*86400000-3600000,aged.id).run()
 const report=async query=>{const r=await h.send('/api/platter/pipeline'+(query?'?'+query:''),undefined,h.owner);assert.equal(r.status,200,r.text);return r.value}
 const all=await report('sort=value&direction=desc')
 for(const expected of fixture){const actual=all.rows.find(p=>p.id===expected.id);assert.equal(actual.status,expected.status);assert.equal(actual.ownerId,expected.owner);assert.equal(actual.clientId,expected.client);assert.equal(actual.valueCents,expected.valueCents);assert.equal(actual.nextAction,expected.nextAction);assert.equal(actual.age,expected.id===aged.id?3:0)}
 assert.equal(all.count,30);assert.equal(all.totals[0].valueCents,fixture.reduce((n,p)=>n+p.valueCents,0));assert.equal(all.totals[0].count,30)
 assert.deepEqual(all.rows.map(p=>p.id),fixture.toSorted((a,b)=>b.valueCents-a.valueCents||a.title.localeCompare(b.title)).map(p=>p.id))
 const dueRows=(await report('dueFollowup=yes&sort=dueDate')).rows
 assert.ok(dueRows.every(r=>r.dueFollowup));assert.deepEqual(dueRows.slice(0,2).map(r=>r.id),scheduled.map(r=>r.id));assert.equal((await report('dueFollowup=no')).count,30-dueRows.length)
 assert.equal((await report('dueFollowup=yes')).totals[0].valueCents,fixture.filter(p=>dueRows.some(r=>r.id===p.id)).reduce((n,p)=>n+p.valueCents,0))
 assert.deepEqual((await report('nextAction=followup')).rows.map(r=>r.id).sort(),scheduled.map(r=>r.id).sort())
 const expired=await report('status=expired&sort=value');assert.equal(expired.count,1);assert.equal(expired.totals[0].count,1);assert.equal(expired.totals[0].valueCents,fixture.find(p=>p.status==='expired').valueCents)
 for(const status of ['viewed','declined','lost','won']){const reportRow=await report('status='+status+'&sort=value');const expected=fixture.filter(p=>p.status===status);assert.equal(reportRow.count,expected.length);assert.equal(reportRow.totals[0].count,expected.length);assert.equal(reportRow.totals[0].valueCents,expected.reduce((n,p)=>n+p.valueCents,0))}
 const selected=fixture.filter(p=>p.owner===people[1].id&&p.status==='viewed'),filtered=await report('owner='+people[1].id+'&status=viewed&sort=value')
 assert.deepEqual(filtered.rows.map(p=>p.id),selected.toSorted((a,b)=>a.valueCents-b.valueCents).map(p=>p.id));assert.equal(filtered.totals[0].valueCents,selected.reduce((n,p)=>n+p.valueCents,0))
 for(const [query,expected] of [
  ['status=withdrawn',fixture.filter(p=>p.status==='withdrawn')],['nextAction=withdrawn',fixture.filter(p=>['withdrawn','declined','lost','won'].includes(p.status))],
  ['status=declined',fixture.filter(p=>p.status==='declined')],['status=lost',fixture.filter(p=>p.status==='lost')],
  ['status=expired',fixture.filter(p=>p.status==='expired')],['nextAction=reopen',fixture.filter(p=>p.status==='expired')],
  ['client='+clients[0].id,fixture.filter(p=>p.client===clients[0].id)],
  ['minValue=2100&maxValue=2400',fixture.filter(p=>p.valueCents>=210000&&p.valueCents<=240000)],
  ['minAge=0&maxAge=0',fixture.filter(p=>p.id!==aged.id)],['minAge=3&maxAge=3',[aged]],['minAge=4',[]],['nextAction=approve',fixture.filter(p=>p.status==='awaiting-approval')],
 ])assert.deepEqual(new Set((await report(query)).rows.map(p=>p.id)),new Set(expected.map(p=>p.id)))
 for(const sort of ['status','owner','client','age','nextAction']){
  const rows=(await report('sort='+sort)).rows
  const field=sort==='age'?'age':sort
  for(let i=1;i<rows.length;i++)assert.ok(sort==='age'?rows[i-1][field]<=rows[i][field]:rows[i-1][field].localeCompare(rows[i][field])<=0)
 }
 for(const query of ['sort=invalid','status=paid','minValue=1.234','minAge=-1','minValue=20&maxValue=10'])assert.equal((await h.send('/api/platter/pipeline?'+query,undefined,h.owner)).status,400)
 assert.equal((await h.send('/api/platter/pipeline',undefined,people[1].cookie)).value.count,fixture.filter(p=>p.owner===people[1].id).length)
 const ownViewed=(await h.send('/api/platter/pipeline?status=viewed',undefined,people[1].cookie)).value;assert.deepEqual(ownViewed.rows.map(r=>r.id),[fixture[22].id]);assert.equal(ownViewed.totals[0].valueCents,244000)
 assert.equal((await h.send('/api/platter/pipeline')).status,401)
 const owned=fixture.find(p=>p.status==='awaiting-approval'&&p.owner===people[1].id)
 await h.cmd('proposal.revise',{...offer,clientId:owned.client,id:owned.id,version:1},h.owner)
 assert.equal((await report()).rows.find(p=>p.id===owned.id).ownerId,people[1].id,'later editor never becomes the sales owner')
 owned.valueCents=420000;owned.title=offer.title
 const key=await h.cmd('agent.create',{label:'Campaign assistant'})
 const agent=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{...offer,clientId:clients[0].id}},'',{authorization:'Bearer '+key.token});assert.equal(agent.status,200)
 assert.equal((await report()).rows.find(p=>p.id===agent.value.id).ownerId,people[0].id,'agent draft belongs to the recorded key owner')
 const accepted=fixture.find(p=>p.status==='accepted');await h.cmd('invoice.export',{id:accepted.id})
 assert.equal((await report()).rows.find(p=>p.id===accepted.id).nextAction,'complete')
 const team=await h.cmd('team.create',{name:'Report team'})
 await h.cmd('member.set',{operatorId:people[1].id,version:0,role:'sales',teams:[team.id]})
 for(const role of ['manager','viewer','admin']){
  const email=role+'@report.synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner)
  const cookie=await h.signIn(email),person=(await h.state(cookie)).actor
  await h.cmd('member.set',{operatorId:person.id,version:0,role,teams:[team.id]})
  const response=await h.send('/api/platter/pipeline?status=awaiting-approval&sort=value&direction=desc',undefined,cookie);assert.equal(response.status,200)
  const expected=fixture.filter(p=>p.status==='awaiting-approval'&&(role==='admin'||p.owner===people[1].id))
  const actual=response.value.rows.filter(p=>fixture.some(f=>f.id===p.id))
  assert.deepEqual(actual.map(p=>p.id),expected.toSorted((a,b)=>b.valueCents-a.valueCents||a.title.localeCompare(b.title)).map(p=>p.id))
  assert.equal(actual.length,expected.length);assert.equal(actual.reduce((n,r)=>n+r.valueCents,0),expected.reduce((n,r)=>n+r.valueCents,0))
  assert.equal(response.value.count,response.value.rows.length);assert.equal(response.value.totals[0].valueCents,response.value.rows.reduce((n,r)=>n+r.valueCents,0))
  const viewed=(await h.send('/api/platter/pipeline?status=viewed',undefined,cookie)).value;assert.deepEqual(viewed.rows.map(r=>r.id),[fixture[22].id]);assert.equal(viewed.totals[0].valueCents,244000);assert.equal((await h.state(cookie)).tracking,undefined)
 }

}))

test('TEAM-004 current person, agent, invitation, signature, native, import and invoice actions have searchable/exportable actors and times',()=>run(async h=>{
 const first=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 assert.ok(first.some(r=>r.action==='native.auth.bootstrap'&&r.actor_role==='owner'))
 const{client,p}=await draft(h)
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:1,scope:'A second draft'})
 await h.cmd('proposal.restore',{id:p.id,version:2,revision:1})
 await h.cmd('proposal.approve',{id:p.id,version:3,revision:3})
 const shared=await h.cmd('proposal.send',{id:p.id,version:4}),path=new URL(shared.shareUrl).pathname
 await h.send(path)
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:5,scope:'A negotiated draft'})
 const cookie=await verified(h,path)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)
 const invoice=await h.cmd('invoice.export',{id:p.id})
 await h.send('/api/platter/invoices/'+invoice.id+'.csv',undefined,h.owner)
 const key=await h.cmd('agent.create',{label:'Private credential label'})
 const agent=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{...offer,clientId:client.id}},'',{authorization:'Bearer '+key.token});assert.equal(agent.status,200)
 await h.cmd('agent.revoke',{id:key.id})
 const spare=await h.cmd('client.save',{name:'Unused person',email:'unused@studio.example'})
 await h.cmd('client.erase',{id:spare.id,confirmName:'Unused person'})
 const csv='client_id,name,email\naudit-import,Imported person,imported@studio.example'
 const preview=await h.cmd('import.preview',{csv}),applied=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint})
 await h.cmd('import.journal',{id:applied.job.id});await h.cmd('import.undo',{id:applied.job.id})
 await h.send('/auth/invite',{email:'member@studio.example',displayName:'Studio colleague',role:'member',returnTo:'/app'},h.owner)
 await h.signIn('member@studio.example')
 const operators=(await h.send('/auth/operators',undefined,h.owner)).value
 const memberId=(Array.isArray(operators)?operators:operators.operators).find(o=>o.email==='member@studio.example').id
 const roleChange=await h.send('/auth/operator/role',{operatorId:memberId,role:'admin'},h.owner);assert.equal(roleChange.status,200,roleChange.text)
 assert.equal((await h.send('/auth/operator/role',{operatorId:memberId,role:'member'},h.owner)).status,200)
 const settings=await h.send('/auth/settings/identity',{idpSignIn:false},h.owner);assert.equal(settings.status,200,settings.text)
 const member=await h.signIn('member@studio.example')
 const before=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const route of ['/api/platter/audit','/api/platter/audit.csv','/app/audit'])assert.equal((await h.send(route,undefined,member)).status,403)
 await h.cmd('proposal.approve',{id:agent.value.id,version:1,revision:1},member,403)
 const rows=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 assert.deepEqual(rows,before,'refusals have no write')
 const actions=['client.save','client.erase','proposal.prepare','proposal.revise','proposal.restore','proposal.approve','proposal.send','proposal.negotiate','proposal.view','code.request','code.verify','proposal.accept','invoice.export','invoice.download','agent.create','agent.revoke','import.preview','import.apply','import.journal','import.undo','native.auth.bootstrap','native.auth.invite','native.auth.magic-link','native.auth.confirm','native.auth.operator.role','native.auth.settings.identity']
 for(const action of actions){const found=rows.filter(r=>r.action===action);assert.ok(found.length,action);assert.ok(found.every(r=>r.actor_id&&r.actor_role&&r.subject&&Number.isSafeInteger(r.occurred_at)&&r.occurred_at>0),action)}
 assert.ok(rows.some(r=>r.action==='proposal.prepare'&&r.subject===agent.value.id&&r.actor_id==='agent:'+key.id&&r.actor_role==='agent'))
 assert.ok(rows.some(r=>r.action==='proposal.accept'&&r.subject===p.id&&r.actor_id===client.id&&r.actor_role==='client'))
 assert.ok(rows.some(r=>r.action==='proposal.view'&&r.subject===p.id&&r.actor_id==='unidentified'&&r.actor_role==='invitation'))
 const who=(await h.state()).actor.id
 assert.ok(rows.some(r=>r.action==='proposal.approve'&&r.actor_id===who&&r.actor_role==='owner'))
 for(const [query,expected] of [
  ['action=proposal.prepare',rows.filter(r=>r.action==='proposal.prepare')],
  ['actor='+encodeURIComponent('agent:'+key.id),rows.filter(r=>r.actor_id==='agent:'+key.id)],
  ['subject='+p.id,rows.filter(r=>r.subject===p.id)],
  ['q='+p.id,rows.filter(r=>[r.actor_id,r.action,r.subject].some(v=>v.toLowerCase().includes(p.id.toLowerCase())))],
  ['from='+rows[0].occurred_at+'&to='+rows[0].occurred_at,rows.filter(r=>r.occurred_at===rows[0].occurred_at)],
 ]){
  assert.deepEqual((await h.send('/api/platter/audit?'+query,undefined,h.owner)).value.rows,expected)
  const exported=await h.send('/api/platter/audit.csv?'+query,undefined,h.owner);assert.equal(exported.status,200)
  const fields=['id','actor_id','actor_role','action','subject','occurred_at','reason','mail_route','sender_address']
  const decoded=exported.text.trim().split('\r\n').slice(1).map(line=>line.slice(1,-1).split('","'))
  assert.deepEqual(decoded,expected.map(r=>fields.map(f=>String(r[f]??''))))
 }
 assert.ok(rows.some(r=>r.action==='native.auth.operator.role'&&r.subject===memberId&&r.actor_id===who))
 const serialized=JSON.stringify(rows)
 for(const sensitive of [key.token,cookie.split('=')[1],path.slice(3),'Private credential label','Unused person','imported@studio.example','A negotiated draft'])assert.ok(!serialized.includes(sensitive),'audit excludes credentials and input payloads')
 assert.equal((await h.send('/api/platter/audit?from=invalid',undefined,h.owner)).status,400)
 assert.equal((await h.send('/api/platter/audit',undefined,'')).status,401)
}))

test('AI-003 MCP client searches, drafts, reads engagement and queues exact revisions without authority to approve/send/sign/refund',()=>run(async h=>{
 const endpoint='/api/platter/agent/mcp',key=await h.cmd('agent.create',{label:'MCP assistant'})
 let sequence=0
 const transport=async(method,params={},token=key.token,extra={})=>h.send(endpoint,{jsonrpc:'2.0',id:++sequence,method,params},'',{authorization:'Bearer '+token,accept:'application/json, text/event-stream','mcp-protocol-version':'2025-06-18',...extra})
 const rpc=async(method,params={})=>{const r=await transport(method,params);assert.equal(r.status,200,r.text);assert.ok(!r.value.error,r.text);return r.value.result}
 const call=async(name,args={})=>{const result=await rpc('tools/call',{name,arguments:args});assert.ok(!result.isError,JSON.stringify(result));return JSON.parse(result.content[0].text)}
 assert.equal((await h.send(endpoint,{jsonrpc:'2.0',id:1,method:'ping'})).status,401)
 const initialized=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'Platter acceptance MCP client',version:'1'}})
 assert.equal(initialized.protocolVersion,'2025-06-18');assert.ok(initialized.capabilities.tools)
 const notified=await h.send(endpoint,{jsonrpc:'2.0',method:'notifications/initialized'},'',{authorization:'Bearer '+key.token});assert.equal(notified.status,202);assert.equal(notified.text,'')
 const listed=await rpc('tools/list');assert.ok(listed.tools.every(t=>t.inputSchema.type==='object'));assert.deepEqual(listed.tools.map(t=>t.name).sort(),['prepare_from_template','prepare_proposal','read_engagement','read_proposal','request_send','revise_proposal','search_proposals','search_templates'])
 const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
 const found=await call('search_proposals',{query:'Northstar'});assert.ok(found.clients.some(c=>c.id===client.id));assert.equal(found.proposalCount,0)
 const p=await call('prepare_proposal',{...offer,depositPercent:25,clientId:client.id})
 let current=await call('read_proposal',{id:p.id});assert.equal(current.status,'draft');assert.equal(current.prepared_by,'agent:'+key.id);assert.ok(!current.shareToken)
 assert.ok((await call('search_proposals',{query:'photography',status:'draft',limit:1})).proposals.some(x=>x.id===p.id))
 const engagement=await call('read_engagement',{id:p.id});assert.equal(engagement.viewTracking.available,false);assert.equal(engagement.sectionReading.available,false);assert.equal(engagement.acceptance,null);assert.equal(engagement.delivery,null)
 const before=await h.state(),requested=await call('request_send',{id:p.id,revision:1}),again=await call('request_send',{id:p.id,revision:1})
 assert.equal(again.request.id,requested.request.id)
 const queued=await h.send('/api/platter/send-requests',undefined,h.owner);assert.equal(queued.status,200);assert.equal(queued.value.requests.length,1);assert.equal(queued.value.requests[0].actionable,1)
 const after=await h.state();assert.deepEqual(after.proposals,before.proposals);assert.deepEqual(after.outbox,before.outbox)
 for(const name of ['approve','proposal.approve','send','proposal.send','sign','refund']){
  const refused=await rpc('tools/call',{name,arguments:{id:p.id}});assert.equal(refused.isError,true);assert.match(refused.content[0].text,/Forbidden/)
 }
 await h.cmd('proposal.send',{id:p.id,version:1},h.owner,409)
 await h.cmd('send-request.resolve',{id:requested.request.id,status:'fulfilled'},h.owner,409)
 const changed=await call('revise_proposal',{...offer,depositPercent:25,clientId:client.id,id:p.id,version:1,scope:'A revised campaign plan'})
 assert.equal(changed.revision,2);assert.equal((await h.send('/api/platter/send-requests',undefined,h.owner)).value.requests[0].actionable,0)
 const stale=await rpc('tools/call',{name:'request_send',arguments:{id:p.id,revision:1}});assert.equal(stale.isError,true)
 await h.cmd('send-request.resolve',{id:requested.request.id,status:'dismissed'})
 const next=await call('request_send',{id:p.id,revision:2})
 await h.cmd('proposal.approve',{id:p.id,version:2,revision:2});const sent=await h.cmd('proposal.send',{id:p.id,version:3})
 await h.cmd('send-request.resolve',{id:next.request.id,status:'fulfilled'})
 await h.cmd('tracking.settings',{enabled:'yes',alerts:'yes',retentionDays:90,quietMinutes:30,consent:'yes'});await h.send(new URL(sent.shareUrl).pathname)
 const privateEngagement=await call('read_engagement',{id:p.id});assert.equal(privateEngagement.viewTracking.available,false);assert.match(privateEngagement.viewTracking.reason,/only.*owner/);assert.ok(!JSON.stringify(privateEngagement).includes('avery@northstar.example'));assert.equal((await h.state()).tracking.views.length,1)
 current=await call('read_proposal',{id:p.id});assert.equal(current.status,'sent');assert.ok(!JSON.stringify(current).includes(new URL(sent.shareUrl).pathname.slice(3)))
 const finalQueue=(await h.send('/api/platter/send-requests',undefined,h.owner)).value.requests
 assert.deepEqual(finalQueue.map(r=>r.status).sort(),['dismissed','fulfilled'])
 const malformed=await transport('tools/call',{name:'prepare_proposal',arguments:{...offer,depositPercent:25,clientId:client.id,extra:'refused'}});assert.equal(malformed.value.error.code,-32602)
 assert.equal((await transport('ping',{},key.token,{origin:'https://foreign.example'})).status,403)
 assert.equal((await transport('ping',{},key.token,{'mcp-protocol-version':'unsupported'})).status,400)
 assert.equal((await h.send(endpoint,undefined,'',{authorization:'Bearer '+key.token})).status,405)
 await h.send('/auth/invite',{email:'mcp-member@studio.example',displayName:'MCP member',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('mcp-member@studio.example')
 assert.equal((await h.send('/api/platter/send-requests',undefined,member)).status,403)
 await h.cmd('send-request.resolve',{id:next.request.id,status:'dismissed'},member,403)
 const audit=(await h.send('/api/platter/audit?actor='+encodeURIComponent('agent:'+key.id),undefined,h.owner)).value.rows
 for(const action of ['mcp.search_proposals','mcp.prepare_proposal','mcp.read_proposal','mcp.read_engagement','mcp.request_send','mcp.revise_proposal'])assert.ok(audit.some(row=>row.action===action&&row.actor_role==='agent'),action)
 await h.cmd('agent.revoke',{id:key.id});assert.equal((await transport('ping')).status,401)
}))

test('NEG-002 / TEAM-004 opt-in tracked terms edits accept one/reject one into revision two, preserve offer and require fresh approval',()=>run(async h=>{
 const {client,p}=await draft(h)
 await h.cmd('proposal.revise',{...offer,terms:'Delivery in 14 days. Usage for one year.',clientId:client.id,id:p.id,version:1})
 await h.cmd('proposal.approve',{id:p.id,version:2,revision:2})
 const shared=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(shared.shareUrl).pathname,cookie=await verified(h,path)
 const input={section:'terms',revision:2,original:'14 days',replacement:'21 days'}
 assert.equal((await h.send(path+'/action?name=suggestion.create',input,cookie)).status,409)
 await h.cmd('suggestions.allow',{id:p.id,version:4,section:'terms',enabled:true})
 assert.equal((await h.send(path+'/action?name=suggestion.create',input)).status,401)
 assert.equal((await h.send(path+'/action?name=suggestion.create',{...input,section:'priceOne'},cookie)).status,400)
 assert.equal((await h.send(path+'/action?name=suggestion.create',{...input,revision:1},cookie)).status,409)
 assert.equal((await h.send(path+'/action?name=suggestion.create',input,cookie)).status,200)
 assert.equal((await h.send(path+'/action?name=suggestion.create',{...input,original:'one year',replacement:'forever'},cookie)).status,200)
 let row=(await h.state()).proposals.find(x=>x.id===p.id)
 assert.equal(row.suggestions.length,2);assert.ok(row.suggestions.every(s=>s.client_id===client.id&&s.revision===2&&s.created_at))
 const good=row.suggestions.find(s=>s.replacement==='21 days'),bad=row.suggestions.find(s=>s.replacement==='forever')
 const frozen=(await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(p.id).first()).snapshot
 await h.cmd('suggestion.resolve',{id:p.id,version:row.version,suggestionId:good.id,decision:'accepted'})
 row=(await h.state()).proposals.find(x=>x.id===p.id)
 await h.cmd('suggestion.resolve',{id:p.id,version:row.version,suggestionId:bad.id,decision:'rejected'})
 row=(await h.state()).proposals.find(x=>x.id===p.id)
 assert.equal(row.revision,3);assert.equal(row.terms,'Delivery in 21 days. Usage for one year.');assert.equal(row.approved_by,null);assert.deepEqual(row.options,JSON.parse(frozen).options)
 const live=await h.send(path,undefined,cookie);assert.match(live.text,/Delivery in 14 days/)
 await h.cmd('proposal.send',{id:p.id,version:row.version},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:row.version,revision:3})
 row=(await h.state()).proposals.find(x=>x.id===p.id)
 const next=await h.cmd('proposal.send',{id:p.id,version:row.version}),nextPath=new URL(next.shareUrl).pathname
 assert.equal((await h.send(path,undefined,cookie)).status,404)
 assert.match((await h.send(nextPath)).text,/Delivery in 21 days\. Usage for one year\./)
 assert.equal((await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(p.id).first()).snapshot,frozen)
 // The stated acceptance journey starts from a terms-bearing first revision.
 const q=await h.cmd('proposal.prepare',{...offer,clientId:client.id,terms:'Delivery in 14 days. Usage for one year.'})
 await h.cmd('proposal.approve',{id:q.id,version:1,revision:1});const s=await h.cmd('proposal.send',{id:q.id,version:2}),qpath=new URL(s.shareUrl).pathname,qcookie=await verified(h,qpath)
 await h.cmd('suggestions.allow',{id:q.id,version:3,section:'terms',enabled:true})
 for(const edit of [input,{...input,original:'one year',replacement:'forever'}])assert.equal((await h.send(qpath+'/action?name=suggestion.create',{...edit,revision:1},qcookie)).status,200)
 let r=(await h.state()).proposals.find(x=>x.id===q.id)
 for(const replacement of ['21 days','forever']){await h.cmd('suggestion.resolve',{id:q.id,version:r.version,suggestionId:r.suggestions.find(x=>x.replacement===replacement).id,decision:replacement==='21 days'?'accepted':'rejected'});r=(await h.state()).proposals.find(x=>x.id===q.id)}
 assert.equal(r.revision,2);assert.equal(r.terms,'Delivery in 21 days. Usage for one year.');assert.equal(r.suggestions.find(x=>x.replacement==='forever').decision,'rejected')
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const action of ['suggestions.allow','suggestion.create','suggestion.resolve']){const rows=audit.filter(x=>x.action===action);assert.ok(rows.length);assert.ok(rows.every(x=>x.subject&&x.occurred_at&&x.actor_id));if(action==='suggestion.create')assert.ok(rows.every(x=>x.actor_role==='client'&&x.actor_id===client.id))}
 assert.ok(!JSON.stringify(audit).includes('21 days'))
}))

test('EDIT-010 / TEAM-004 defaults and arbitrary files freeze with approval, download exact bytes and remain in the signed package after replacement',()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const upload=async(fields,filename,bytes,cookie=h.owner)=>{
  const form=new FormData();for(const [key,value] of Object.entries(fields))form.set(key,String(value));form.set('file',new File([bytes],filename,{type:'application/pdf'}))
  const request=new Request(h.origin+'/app/attachment',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie},body:form});const r=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});const body=await r.text();if(fields.kind&&cookie===h.owner)assert.ok(body.includes('Document saved.'),body);return {status:r.status,text:body}
 }
 const w9=new Uint8Array([37,80,68,70,0,255,13,10]),insurance=new Uint8Array(120000).map((_,i)=>i%256),msa=new TextEncoder().encode('%PDF Northstar MSA\n')
 assert.equal((await upload({kind:'w9'},'studio-w9.pdf',w9)).status,200)
 assert.equal((await upload({kind:'insurance'},'insurance.pdf',insurance)).status,200)
 const {client,p}=await draft(h)
 let row=(await h.state()).proposals.find(x=>x.id===p.id);assert.deepEqual(row.attachments.map(f=>f.kind).sort(),['insurance','w9'])
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
 assert.equal((await upload({id:p.id,version:2},'client-msa.pdf',msa)).status,200)
 row=(await h.state()).proposals.find(x=>x.id===p.id);assert.equal(row.revision,2);assert.equal(row.approved_by,null);assert.equal(row.attachments.length,3)
 await h.cmd('proposal.send',{id:p.id,version:row.version},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:row.version,revision:2});row=(await h.state()).proposals.find(x=>x.id===p.id)
 const shared=await h.cmd('proposal.send',{id:p.id,version:row.version}),path=new URL(shared.shareUrl).pathname
 const before=await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(p.id).first()
 const late=await upload({id:p.id,version:row.version+1},'late.pdf',msa);assert.equal(late.status,409);assert.match(late.text,/Upload attachments before sending/)
 assert.equal((await h.state()).proposals.find(x=>x.id===p.id).attachments.length,3)
 assert.equal((await upload({kind:'w9'},'studio-w9-new.pdf','%PDF replacement')).status,200)
 assert.equal((await upload({kind:'insurance'},'insurance-new.pdf','%PDF replacement insurance')).status,200)
 for(const file of row.attachments){
  const r=await h.mf.dispatchFetch(h.origin+path+'/attachments/'+file.id)
  assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/^attachment;/);assert.match(r.headers.get('content-security-policy'),/sandbox/)
  assert.deepEqual(new Uint8Array(await r.arrayBuffer()),file.kind==='w9'?w9:file.kind==='insurance'?insurance:msa)
 }
 const defaults=(await h.state()).vendorDocuments
 assert.equal((await h.send(path+'/attachments/'+defaults[0].id)).status,404)
 const cookie=await verified(h,path)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)
 const accepted=await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
 assert.deepEqual(JSON.parse(accepted.snapshot).attachments,row.attachments)
 const page=await h.send(path,undefined,cookie);assert.match(page.text,/Signed agreement package attachments/);for(const file of row.attachments)assert.ok(page.text.includes(file.filename))
 assert.equal((await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(p.id).first()).snapshot,before.snapshot)
 await h.send('/auth/invite',{email:'colleague@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('colleague@studio.example')
 const forbidden=await upload({kind:'w9'},'forbidden.pdf',msa,member);assert.equal(forbidden.status,403);assert.match(forbidden.text,/Only the owner/)
 const q=await h.cmd('proposal.prepare',{...offer,clientId:client.id});let next=(await h.state()).proposals.find(x=>x.id===q.id)
 assert.deepEqual(next.attachments.map(x=>x.id),defaults.map(x=>x.id))
 await upload({kind:'w9'},'studio-w9-latest.pdf','%PDF latest default')
 await h.cmd('attachments.refresh',{id:q.id,version:1});next=(await h.state()).proposals.find(x=>x.id===q.id);assert.equal(next.revision,2);assert.notDeepEqual(next.attachments,defaults);const refreshed=next.attachments
 await h.cmd('proposal.restore',{id:q.id,version:2,revision:1});assert.deepEqual((await h.state()).proposals.find(x=>x.id===q.id).attachments,defaults)
 next=(await h.state()).proposals.find(x=>x.id===q.id)
 await h.cmd('proposal.approve',{id:q.id,version:next.version,revision:3});await h.cmd('proposal.send',{id:q.id,version:next.version+1})
 next=(await h.state()).proposals.find(x=>x.id===q.id)
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:q.id,version:next.version,scope:'A negotiated campaign.'})
 next=(await h.state()).proposals.find(x=>x.id===q.id)
 await h.cmd('proposal.restore',{id:q.id,version:next.version,revision:2})
 assert.deepEqual((await h.state()).proposals.find(x=>x.id===q.id).attachments,refreshed,'COLLAB-003 restores file versions into an unapproved negotiated revision')
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const action of ['vendor-document.save','attachment.upload','attachment.download','attachments.refresh'])assert.ok(audit.some(x=>x.action===action&&x.subject&&x.actor_id&&x.occurred_at),'TEAM-004 '+action)
 assert.ok(!JSON.stringify(audit).includes('studio-w9.pdf'))
}))

test('MIG-006 imports 200 contacts across 60 companies with reviewed custody, resumable apply and complete undo', {timeout:120000}, async()=>run(async h=>{
 const {businessCsv,applyBusiness,undoBusiness}=await import('./business-import-fixture.mjs')
 const csv=await businessCsv('platter-contacts.csv'),input={kind:'contacts',format:'platter',csv}
 const preview=await h.cmd('business-import.preview',input)
 assert.equal(preview.report.contacts,200);assert.equal(preview.report.companies,60);assert.equal(preview.canApply,true)
 assert.equal((await h.state()).businessRecords.contacts.length,0,'preview writes no native records')
 await h.cmd('business-import.apply',{...input,csv:csv.replace('Dana','Dani'),fingerprint:preview.fingerprint},h.owner,409)
 await h.cmd('business-import.apply',{...input,mapping:{companyIds:{Acme:'other-company'}},fingerprint:preview.fingerprint},h.owner,409)
 const {job}=await applyBusiness(h,input)
 const data=(await h.send('/api/platter/business-records',undefined,h.owner)).value
 assert.equal(data.companies.length,60);assert.equal(data.contacts.length,200)
 const dana=data.contacts.find(c=>c.id==='contact-1')
 assert.equal(dana.company_id,'company-1');assert.equal(dana.first_name,'Dana');assert.equal(dana.last_name,'Chen');assert.equal(dana.title,'Finance Manager');assert.equal(dana.phone,'+1 212 555 0100');assert.equal(dana.tax_exempt,true)
 assert.match(dana.billing_address,/Market Street/);assert.match(dana.service_address,/Studio Road/)
 const company=data.companies.find(c=>c.id==='company-1');assert.equal(company.tax_exempt,true);assert.equal(company.name,'Northstar Studio 1');assert.equal(company.billing_address,dana.billing_address);assert.equal(company.service_address,dana.service_address);assert.equal(dana.email,'dana.chen.1@studio1.example')
 const replay=await h.cmd('business-import.apply',{...input,fingerprint:preview.fingerprint});assert.equal(replay.job.id,job.id);assert.equal((await h.state()).businessRecords.contacts.length,200)
 const journal=await h.cmd('business-import.journal',{id:job.id})
 assert.equal(journal.provenance.length,260);assert.ok(journal.batches.length>1)
 const original=journal.originals.find(o=>o.name==='contacts.csv');assert.equal(Buffer.from(original.original.base64,'base64').toString('utf8'),csv)
 const download=await h.mf.dispatchFetch(h.origin+'/api/platter/business-original?job='+job.id+'&name=contacts.csv',{headers:{cookie:h.owner,host:new URL(h.origin).host}})
 assert.equal(download.status,200);assert.equal(await download.text(),csv)
 await undoBusiness(h,job.id)
 assert.deepEqual((await h.state()).businessRecords,{companies:[],contacts:[],catalog:[]})
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const action of ['business-import.preview','business-import.apply','business-import.journal','business-import.undo'])assert.ok(audit.some(r=>r.action===action))
}))

test('MIG-006 / CAT-001 unchanged PandaDoc catalog and contact layouts preserve exact prices, packages, image bytes and explicit company associations', {timeout:120000}, async()=>{
 const {harness}=await import('./harness.mjs'),{businessCsv,applyBusiness,undoBusiness,fileHost}=await import('./business-import-fixture.mjs'),{readFile}=await import('node:fs/promises')
 const calls=[],h=await harness({alias:{'cloudflare:sockets':'./tests/catalog-socket-edge.ts'},outboundService:r=>fileHost(r,calls)})
 try{
  const input={kind:'catalog',format:'pandadoc',csv:await businessCsv('pandadoc-catalog.csv')}
  const {preview,job}=await applyBusiness(h,input)
  assert.equal(preview.report.catalog,50);assert.equal(preview.report.retainedImages,1)
  assert.ok(preview.diagnostics.some(d=>d.code==='non_usd_currency'));assert.ok(preview.diagnostics.some(d=>d.code==='unmapped_source_column'))
  const catalog=(await h.state()).businessRecords.catalog
  assert.equal(catalog.length,50)
  const first=catalog.find(c=>c.sku==='SKU001'),bundle=catalog.find(c=>c.sku==='SKU050')
  assert.equal(first.price,'100.12345');assert.equal(first.cost,'50.00001');assert.equal(first.currency,'AUD');assert.equal(first.billing_frequency,'monthly');assert.deepEqual(first.category_path,['Services','Creative']);assert.equal(first.source_fields['Internal code'],'creative-1')
  assert.equal(bundle.package,true);assert.equal(bundle.bundle_components[0].catalog_id,first.id);assert.equal(bundle.bundle_components[0].quantity,'2')
  assert.ok(calls.length>0);assert.ok(calls.every(c=>c.address.hostname==='93.184.216.34'&&c.address.port===443&&c.tls.expectedServerHostname==='files.vendor.example'))
  const originals=(await h.cmd('business-import.journal',{id:job.id})).originals,image=originals.find(o=>o.name===first.images[0].artifact)
  assert.deepEqual(Buffer.from(image.original.base64,'base64'),await readFile('fixtures/business/brand.png'))
  assert.equal(Buffer.from(originals.find(o=>o.name==='catalog.csv').original.base64,'base64').toString(),input.csv)
  const privatePreview=await h.cmd('business-import.preview',{...input,csv:input.csv.replace('files.vendor.example','private.vendor.example')})
  assert.equal(privatePreview.canApply,false);assert.ok(privatePreview.diagnostics.some(d=>d.code==='image_acquisition_failed'))
  const omit={kind:'catalog',format:'platter',csv:'id,name,images\nexplicit-omission,Imported artwork,https://private.vendor.example/brand.png'}
  const blocked=await h.cmd('business-import.preview',omit);assert.equal(blocked.canApply,false)
  const confirmed=await applyBusiness(h,{...omit,omitUnfetchedImages:true})
  const omitted=(await h.state()).businessRecords.catalog.find(c=>c.id==='explicit-omission')
  assert.equal(omitted.images[0].status,'not-fetched');assert.equal(omitted.images[0].url,'https://private.vendor.example/brand.png')
  await h.cmd('business-import.apply',{...omit,fingerprint:confirmed.preview.fingerprint},h.owner,409)
  await undoBusiness(h,confirmed.job.id)
  const contactInput={kind:'contacts',format:'pandadoc',csv:await businessCsv('pandadoc-contacts.csv')}
  const missing=await h.cmd('business-import.preview',contactInput);assert.equal(missing.canApply,false);assert.ok(missing.diagnostics.some(d=>d.code==='company_id_required'))
  const contacts=await applyBusiness(h,{...contactInput,mapping:{companyIds:{Acme:'acme-source-id'}}})
  const dana=(await h.state()).businessRecords.contacts[0]
  assert.equal(dana.company_id,'acme-source-id');assert.equal(dana.title,'Finance Director');assert.equal(dana.phone,'+1 212 555 0101');assert.deepEqual(dana.billing_address,{street_address:'12 Market St',city:'New York',postal_code:'10001',country:'US',state:'NY'})
  await undoBusiness(h,contacts.job.id);await undoBusiness(h,job.id)
 }finally{await h.close()}
})

test('MIG-006 reviewed mapper supports original incumbent CSVs and holds identity conflicts without merging', {timeout:90000},async()=>run(async h=>{
 const {applyBusiness,undoBusiness}=await import('./business-import-fixture.mjs')
 const layouts=[
  ['betterproposals','"ProductID (Do not edit existing ID\'s, leave blank for new products)",Product Name,Product Code,Product Type (Optional/Choice/Normal),Price,Price Type (Amount/Percentage),Description,Recurring Type (One-off/Monthly/Quarterly/Annual),Tax Exempt (Yes/No)\nbp-1,Creative retainer,RET,Choice,12.50000,Percentage,Creative direction,Monthly,Yes',r=>{assert.equal(r.price_type,'Percentage');assert.equal(r.price,'12.50000');assert.equal(r.type,'Choice');assert.equal(r.tax_exempt,true)}],
  ['qwilr','Description,Quantity,Cost Per Item,Unit Name,RecurringFrequency\nCreative support,2,125.00001,hour,fortnightly',r=>{assert.equal(r.quantity,'2');assert.equal(r.price,'125.00001');assert.equal(r.billing_frequency,'fortnightly')}],
  ['ignition','#ID,Service Name,Service Description,Price Type,Billing Mode,Price,Unit Name,Min Price,Max Price,Service Terms,Service Category\nign-1,Studio,Creative direction,Range,Recurring,,hour,100.10001,200.20002,Monthly terms,Creative',r=>{assert.equal(r.min_price,'100.10001');assert.equal(r.max_price,'200.20002');assert.equal(r.terms,'Monthly terms')}],
  ['proposify','Name,Price,Quantity,Description,Type,Optional for clients,Adjustable,Tags\nStudio hours,150.50000,3,Creative direction,Recurring,Yes,Yes,Brand',r=>{assert.equal(r.optional,'Yes');assert.equal(r.adjustable,'Yes');assert.equal(r.price,'150.50000')}],
 ]
 for(const [format,csv,check]of layouts){const {job}=await applyBusiness(h,{kind:'catalog',format,csv});check((await h.state()).businessRecords.catalog[0]);await undoBusiness(h,job.id)}
 const mapped={kind:'contacts',format:'mapping',csv:'Customer Key|First|Last|Mail|Business|Business Key|Role|Telephone|Exempt\ncontact-1|Dana|Chen|dana@acme.example|Acme|acme|CFO|+1 212 555 0101|yes'.replaceAll('|','\t'),mapping:{delimiter:'\t',columns:{contact_id:'Customer Key',first_name:'First',last_name:'Last',email:'Mail',company_name:'Business',company_id:'Business Key',title:'Role',phone:'Telephone',tax_exempt:'Exempt'}}}
 const first=await applyBusiness(h,mapped)
 const d=(await h.state()).businessRecords.contacts[0];assert.equal(d.company_id,'acme');assert.equal(d.title,'CFO');assert.equal(d.tax_exempt,true)
 const conflict=await h.cmd('business-import.preview',{...mapped,csv:mapped.csv.replace('contact-1','contact-2')})
 assert.equal(conflict.canApply,false);assert.ok(conflict.diagnostics.some(d=>d.code==='existing_contact_email'))
 // A second import explicitly links a new person to the existing company.
 const dependent={...mapped,csv:'Customer Key\tFirst\tLast\tMail\tBusiness Key\tRole\tTelephone\tExempt\ncontact-2\tAvery\tChen\tavery@acme.example\tacme\tManager\t+1 212 555 0102\tno',mapping:{...mapped.mapping,columns:{...mapped.mapping.columns}}}
 delete dependent.mapping.columns.company_name
 const second=await applyBusiness(h,dependent)
 await h.cmd('business-import.undo',{id:first.job.id},h.owner,409)
 assert.equal((await h.state()).businessRecords.contacts.length,2,'dependent contact prevents partial company erasure')
 await undoBusiness(h,second.job.id);await undoBusiness(h,first.job.id)
 await h.send('/auth/invite',{email:'member@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('member@studio.example')
 await h.cmd('business-import.preview',mapped,member,403)
 assert.equal((await h.send('/api/platter/business-records',undefined,member)).status,403)
}))
test('SIGN-008 / TEAM-004 owner records a client-signed copy as accepted by upload, distinct from e-signature, then exports the deposit',()=>run(async h=>{
 const record=async(fields,bytes,cookie=h.owner)=>{
  const form=new FormData();for(const [key,value] of Object.entries(fields))form.set(key,String(value));if(bytes)form.set('file',new File([bytes],'Northstar-signed.pdf',{type:'application/pdf'}))
  const request=new Request(h.origin+'/app/paper-acceptance',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie},body:form});const r=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});return {status:r.status,text:await r.text()}
 }
 assert.equal((await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
 const signed=new Uint8Array([...new TextEncoder().encode('%PDF-1.7 Northstar countersigned\n'),0,255,13,10])
 const{p,path}=await sent(h),fields={id:p.id,version:3,optionId:'two',signer:'Morgan Lee',signedOn:'2026-10-15',attest:'yes'}
 await h.send('/auth/invite',{email:'colleague@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('colleague@studio.example')
 let r=await record(fields,signed,member);assert.equal(r.status,403);assert.match(r.text,/Only the owner records acceptance/)
 r=await record({...fields,version:2},signed);assert.equal(r.status,409)
 r=await record({...fields,attest:''},signed);assert.equal(r.status,400);assert.match(r.text,/Confirm that the file is the client/)
 r=await record(fields,undefined);assert.equal(r.status,400);assert.match(r.text,/Choose the client-signed file/)
 r=await record(fields,new Uint8Array(10*1024*1024+1));assert.equal(r.status,413);assert.match(r.text,/10 MB or smaller/)
 r=await record({...fields,signedOn:new Date(Date.now()+3*86400000).toISOString().slice(0,10)},signed);assert.equal(r.status,400);assert.match(r.text,/cannot be in the future/)
 r=await record({...fields,signedOn:'2026-02-30'},signed);assert.equal(r.status,400);assert.match(r.text,/YYYY-MM-DD/)
 r=await record({...fields,optionId:'three'},signed);assert.equal(r.status,400)
 const pending=await h.cmd('proposal.prepare',{...offer,clientId:(await h.state()).clients[0].id})
 r=await record({...fields,id:pending.id,version:1},signed);assert.equal(r.status,409);assert.match(r.text,/only for a sent proposal/)
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_acceptances').first()).n,0)
 r=await record(fields,signed);assert.equal(r.status,200,r.text);assert.match(r.text,/Accepted by upload\. The deposit invoice is ready to export\./)
 assert.match(r.text,/Accepted by upload: signed outside Platter\. Platter did not verify this signature\./);assert.match(r.text,/Northstar-signed\.pdf/)
 const accepted=(await h.state()).proposals.find(x=>x.id===p.id),a=accepted.acceptance
 assert.equal(accepted.status,'accepted');assert.equal(a.method,'upload');assert.equal(a.name,'Morgan Lee');assert.equal(a.signedOn,'2026-10-15');assert.equal(a.attestedBy,'owner@studio.example');assert.equal(a.optionId,'two');assert.equal(a.totalCents,420000);assert.equal(a.depositCents,105000);assert.equal(a.revision,1)
 assert.match((await h.db.prepare('SELECT consent FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).consent,/did not verify the signature/)
 const file=await h.mf.dispatchFetch(h.origin+'/api/platter/attachments/'+p.id+'/'+a.signedCopy.id,{headers:{cookie:h.owner}});assert.equal(file.status,200);assert.deepEqual(new Uint8Array(await file.arrayBuffer()),signed);assert.match(file.headers.get('content-disposition'),/^attachment;.*Northstar-signed\.pdf/);assert.equal(file.headers.get('x-content-type-options'),'nosniff')
 assert.equal((await record(fields,signed)).status,409,'a recorded acceptance is never replaced')
 const cookie=await verified(h,path)
 r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie);assert.equal(r.status,200);assert.match(r.text,/Accepted by upload: signed outside Platter/);assert.match(r.text,/Morgan Lee/);assert.ok(!r.text.includes('Morgan Lee · avery@'),'the client mailbox is not shown as the paper signer');assert.ok(!r.text.includes('Northstar-signed.pdf'),'the client page does not serve the uploaded copy')
 assert.equal((await h.send(path+'/attachments/'+a.signedCopy.id)).status,404)
 assert.equal((await h.state()).proposals.find(x=>x.id===p.id).acceptance.name,'Morgan Lee')
 const invoice=await h.cmd('invoice.export',{id:p.id});r=await h.send('/api/platter/invoices/'+invoice.id+'.csv',undefined,h.owner);assert.equal(r.status,200);assert.match(r.text,/1050\.00/);assert.match(r.text,/Deposit: Northstar brand photography/)
 const other=await h.cmd('proposal.prepare',{...offer,clientId:(await h.state()).clients[0].id,title:'E-signed shoot'});await h.cmd('proposal.approve',{id:other.id,version:1,revision:1});const share=await h.cmd('proposal.send',{id:other.id,version:2}),otherPath=new URL(share.shareUrl).pathname
 await h.db.prepare("DELETE FROM p_mail WHERE subject='Your Platter verification code'").run()
 assert.equal((await h.send(otherPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},await verified(h,otherPath))).status,200)
 assert.equal((await h.state()).proposals.find(x=>x.id===other.id).acceptance.method,'platter')
 await h.cmd('proposal.share',{id:p.id,operatorId:(await h.state(member)).actor.id})
 assert.equal((await h.state(member)).proposals.find(x=>x.id===p.id).acceptance.signedCopy.id,a.signedCopy.id)
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows;assert.ok(audit.some(x=>x.action==='acceptance.upload'&&x.subject===p.id&&x.actor_id&&x.occurred_at),'TEAM-004 acceptance.upload')
}))
test('FOLLOW-005 / EDIT-016 / REPORT-005 / FOLLOW-002 / TEAM-004 pipeline exports to CSV as filtered and emails weekly to two named people with the screen figures',{timeout:60000},()=>run(async h=>{
 assert.equal((await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
 await h.send('/auth/invite',{email:'colleague@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('colleague@studio.example')
 const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
 await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Draft only',scope:'No seasonal engagement.'})
 for(const [title,priceTwo] of [['Spring catalogue','3234.56'],['Autumn campaign','4200.00']]){const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title,priceTwo,scope:'Seasonal [campaign] scope.'});await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});await h.cmd('proposal.send',{id:p.id,version:2})}
 const unrelated=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Unrelated sent proposal',scope:'A separate engagement.'});await h.cmd('proposal.approve',{id:unrelated.id,version:1,revision:1});await h.cmd('proposal.send',{id:unrelated.id,version:2})
 const filters='q=seasonal+%5Bcampaign%5D&status=sent&sort=value&direction=desc',screen=(await h.send('/api/platter/pipeline?'+filters,undefined,h.owner)).value
 let r=await h.send('/api/platter/pipeline.csv?'+filters,undefined,h.owner);assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/platter-pipeline\.csv/)
 const lines=r.text.trim().split('\r\n');assert.equal(lines[0],'Title,Client,Owner,Status,Next action,Currency,Value,Age in days,Follow-up due')
 assert.deepEqual(lines.slice(1,3),screen.rows.map(x=>[x.title,x.client,x.owner,x.status,'Await client decision',x.currency,(x.valueCents/100).toFixed(2),x.age,x.dueDate].join(',')))
 assert.deepEqual(lines.slice(1,3).map(l=>l.split(',')[0]),['Autumn campaign','Spring catalogue']);assert.equal(lines[3],'Total (2 proposals),,,,,USD,7434.56,,');assert.equal(lines.length,4)
 assert.equal((await h.send('/api/platter/pipeline.csv',undefined,member)).status,403)
 assert.equal((await h.state()).timeZone,'UTC','schedules use UTC until the owner sets a time zone')
 await h.cmd('report.time-zone',{timeZone:'America/New_York'},member,403);await h.cmd('report.time-zone',{timeZone:'Mars/Olympus'},h.owner,400)
 await h.cmd('report.time-zone',{timeZone:'America/New_York'});assert.equal((await h.state()).timeZone,'America/New_York')
 assert.equal((await h.send('/api/platter/pipeline?q='+encodeURIComponent('.*'),undefined,h.owner)).value.count,0,'search punctuation is literal')
 assert.equal((await h.send('/api/platter/pipeline?q='+encodeURIComponent('x'.repeat(201)),undefined,h.owner)).status,400)
 assert.equal((await h.send('/api/platter/pipeline?q=seasonal',undefined,member)).value.count,0)
 assert.equal((await h.send('/api/platter/pipeline?q=seasonal')).status,401)
 const newYork=at=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hourCycle:'h23',weekday:'long',hour:'numeric',minute:'numeric'}).formatToParts(at).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]))
 const schedule={cadence:'weekly',weekday:1,hour:8,filters,recipients:['owner@studio.example','colleague@studio.example']}
 await h.cmd('report.schedule',schedule,member,403)
 await h.cmd('report.schedule',{...schedule,recipients:['partner@outside.example']},h.owner,400)
 await h.cmd('report.schedule',{...schedule,recipients:[]},h.owner,400)
 await h.cmd('report.schedule',{...schedule,hour:24},h.owner,400)
 await h.cmd('report.schedule',{...schedule,filters:'status=unsupported-outcome'},h.owner,400)
 const created=await h.cmd('report.schedule',schedule);let s=(await h.state()).reportSchedules.find(x=>x.id===created.id)
 const next=s.nextRunAt;assert.deepEqual(newYork(next),{weekday:'Monday',hour:'08',minute:'00'});assert.ok(next>Date.now()&&next<=Date.now()+7*86400000+3600000)
 assert.deepEqual(s.recipients,schedule.recipients);assert.equal(s.filters,filters)
 const worker=await h.mf.getWorker(),fire=at=>worker.scheduled({scheduledTime:new Date(at),cron:'0 * * * *'})
 await fire(s.nextRunAt-3600000);assert.equal((await h.state()).reportOutbox.length,0,'nothing runs before its time')
 await fire(s.nextRunAt);await fire(s.nextRunAt);const outbox=(await h.state()).reportOutbox
 assert.deepEqual(outbox.map(m=>m.recipient).sort(),['colleague@studio.example','owner@studio.example'],'one email each, never twice for the same run');assert.ok(outbox.every(m=>m.status==='local'))
 const page=(await h.send('/app?'+filters,undefined,h.owner)).text,shown=page.match(/data-pipeline-total="USD">([^<]+)</)[1].replaceAll('&#39;',"'")
 assert.equal(shown,'$7,434.56 USD')
 for(const mail of outbox){
  assert.match(mail.body,/2 proposals match\./);assert.ok(mail.body.includes(`USD total · 2 proposals: ${shown}`),mail.body)
  for(const row of screen.rows){const age=Math.floor((s.nextRunAt-(await h.state()).proposals.find(p=>p.id===row.id).created_at)/86400000);assert.ok(mail.body.includes(`${row.title} · sent · ${page.match(new RegExp(`data-proposal-id="${row.id}"[\\s\\S]*?(\\$[\\d,.]+ USD)`))[1]} · ${row.owner} · ${row.client} · ${age} days`),mail.body)}
  assert.ok(mail.body.includes('Total (2 proposals),,,,,USD,7434.56,'))
 }
 s=(await h.state()).reportSchedules.find(x=>x.id===created.id); assert.ok([7*86400000,7*86400000-3600000,7*86400000+3600000].includes(s.nextRunAt-next));assert.equal(s.runs.length,1);assert.equal(s.runs[0].count,2)
 const gaps=[];for(let i=0;i<30&&!gaps.some(g=>g!==7*86400000);i++){const before=s.nextRunAt;await fire(before);s=(await h.state()).reportSchedules.find(x=>x.id===created.id);gaps.push(s.nextRunAt-before);assert.deepEqual(newYork(s.nextRunAt),{weekday:'Monday',hour:'08',minute:'00'},'every run stays at 8 a.m. New York time')}
 assert.ok(gaps.some(g=>g===7*86400000+3600000||g===7*86400000-3600000),'a daylight saving change moves the UTC instant by one hour')
 await h.db.prepare("UPDATE oa_operators SET status='inactive' WHERE email='colleague@studio.example'").run()
 await fire(s.nextRunAt);s=(await h.state()).reportSchedules.find(x=>x.id===created.id);assert.deepEqual(s.runs[0].skipped,['no longer active']);assert.deepEqual(s.runs[0].mail.map(m=>m.recipient),['owner@studio.example'])
 await h.cmd('report.unschedule',{id:created.id});assert.equal((await h.state()).reportSchedules.length,0)
 // FOLLOW-005: newly valid outcome filters must also work in scheduled delivery.
 await h.cmd('proposal.lose',{id:unrelated.id,version:3,reason:'Project cancelled'})
 const autumn=(await h.state()).proposals.find(p=>p.title==='Autumn campaign'),path='/p/'+autumn.shareToken,cookie=await verified(h,path)
 assert.equal((await h.send(path+'/action?name=decline',{revision:1,reason:'Budget'},cookie)).status,410)
 for(const [kind,title]of [['lost','Unrelated sent proposal'],['declined','Autumn campaign']]){
  const filtered=(await h.send('/api/platter/pipeline?status='+kind,undefined,h.owner)).value
  assert.deepEqual(filtered.rows.map(p=>p.title),[title]);assert.equal(filtered.count,1);assert.equal(filtered.totals[0].valueCents,420000)
  const outcomeSchedule=await h.cmd('report.schedule',{...schedule,filters:'status='+kind,recipients:['owner@studio.example']})
  const saved=(await h.state()).reportSchedules.find(p=>p.id===outcomeSchedule.id);assert.equal(saved.filters,'status='+kind)
  const mailBefore=(await h.state()).reportOutbox.map(m=>m.id)
  await fire(saved.nextRunAt)
  const delivered=(await h.state()).reportOutbox.filter(m=>!mailBefore.includes(m.id))
  assert.equal(delivered.length,1);assert.equal(delivered[0].recipient,'owner@studio.example')
  assert.ok(delivered[0].body.includes(title+' · '+kind+' · $4,200.00 USD'));assert.match(delivered[0].body,/1 proposals match/);assert.match(delivered[0].body,/USD total · 1 proposals: \$4,200\.00 USD/)
  await h.cmd('report.unschedule',{id:outcomeSchedule.id})
 }

 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows;for(const action of ['report.export','report.schedule','report.unschedule'])assert.ok(audit.some(x=>x.action===action&&x.actor_id&&x.occurred_at),'TEAM-004 '+action)
}))


test('EDIT-014 / TEAM-004 exact unsigned revision PDF keeps selected prices and every page marked; disabling refuses download without a write', {timeout:60000}, async()=>{
 const h=await harness({assetsDirectory:'public'})
 try {
  const finish=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(finish.status,303)
  const {client,p}=await draft(h),scope='Café · 東京 · 😀.\n'+Array.from({length:70},(_,i)=>`Deliverable ${i+1}: Studio photographs and campaign usage rights.`).join('\n'),terms='Payment follows the chosen option. Final term marker.'
  await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:1,scope,terms,depositPercent:'33.33',priceTwo:'111.11'})
  await h.cmd('proposal.approve',{id:p.id,version:2,revision:2})
  const share=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(share.shareUrl).pathname
  const before=await h.state(),beforeRow=before.proposals.find(row=>row.id===p.id)
  assert.equal((await h.send(path+'/download.pdf?optionId=two')).status,401)
  const cookie=await verified(h,path)
  const fetchPdf=async(optionId,session=cookie)=>h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId='+optionId,{headers:{host:new URL(h.origin).host,cookie:session}})
  let response=await fetchPdf('unknown');assert.equal(response.status,400)
  assert.equal((await h.state()).proposals.find(row=>row.id===p.id).pdfDownloads.length,0)
  response=await fetchPdf('two');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');assert.match(response.headers.get('content-disposition'),/attachment/);assert.equal(response.headers.get('cache-control'),'no-store')
  const pages=await pdfPages(await response.arrayBuffer()),text=pages.join(' ')
  assert.ok(pages.length>=2);for(const page of pages)assert.ok(page.includes('Not signed, revision 2'))
  for(const value of [offer.title,'Northstar Coffee','avery@northstar.example','Café','東京','😀','Deliverable 1:','Deliverable 70:','Final term marker.','Selected option: Full campaign','Selected option total: USD 111.11','Deposit due: USD 37.03','Studio essentials','USD 2,400.00'])assert.ok(text.includes(value),value+' is preserved')
  response=await fetchPdf('one');assert.equal(response.status,200);assert.ok((await pdfPages(await response.arrayBuffer())).join(' ').includes('Selected option total: USD 2,400.00'))
  const after=(await h.state()).proposals.find(row=>row.id===p.id)
  assert.equal(after.version,beforeRow.version);assert.equal(after.revision,2);assert.equal(after.status,'sent');assert.equal(after.acceptance,undefined);assert.equal(after.approved_at,beforeRow.approved_at);assert.equal(after.pdfDownloads.length,2)
  assert.deepEqual(after.pdfDownloads.map(d=>[d.revision,d.option_id,d.client_id]),[[2,'two',client.id],[2,'one',client.id]])
  const timeline=await h.send('/app/proposal?id='+p.id,undefined,h.owner);assert.match(timeline.text,/PDF download timeline/);assert.match(timeline.text,/Engagement timeline/);assert.equal((timeline.text.match(/Verified PDF download/g)??[]).length,2)
  await h.send('/auth/invite',{email:'pdf-member@studio.example',displayName:'Studio colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('pdf-member@studio.example')
  await h.cmd('pdf.downloads',{id:p.id,version:after.version,enabled:false},member,403)
  await h.cmd('pdf.downloads',{id:p.id,version:after.version-1,enabled:false},h.owner,409)
  await h.cmd('pdf.downloads',{id:p.id,version:after.version,enabled:false},h.owner,403,{origin:'https://foreign.example'})
  await h.cmd('pdf.downloads',{id:p.id,version:after.version,enabled:false})
  const auditBefore=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
  assert.equal((await fetchPdf('two')).status,403)
  assert.deepEqual((await h.send('/api/platter/audit',undefined,h.owner)).value.rows,auditBefore)
  assert.ok(!(await h.send(path,undefined,cookie)).text.includes('Download unsigned proposal PDF'))
  assert.equal((await h.state()).proposals.find(row=>row.id===p.id).pdfDownloads.length,2)
  const current=(await h.state()).proposals.find(row=>row.id===p.id)
  await h.cmd('pdf.downloads',{id:p.id,version:current.version,enabled:true})
  const fresh=await h.cmd('proposal.send',{id:p.id,version:current.version+1})
  assert.equal((await fetchPdf('two')).status,404,'rotated invitation never downloads old bytes')
  const newPath=new URL(fresh.shareUrl).pathname,newCookie=await verified(h,newPath)
  await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},newCookie)
  assert.equal((await h.send(newPath+'/download.pdf?optionId=two',undefined,newCookie)).status,409,'unsigned download is not a signed agreement PDF')
  const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
  assert.equal(audit.filter(r=>r.action==='proposal.pdf.download').length,2)
  for(const row of audit.filter(r=>r.action==='proposal.pdf.download')){assert.equal(row.actor_id,client.id);assert.equal(row.actor_role,'client');assert.equal(row.subject,p.id);assert.ok(row.occurred_at)}
  assert.ok(audit.some(r=>r.action==='pdf.downloads'&&r.actor_role==='owner'))
 } finally { await h.close() }
})


test('SEND-004 / TEAM-004 calendar expiry warns unsigned only, supports same-link reopening and reissue, and never expires accepted agreements', {timeout:60000}, ()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303);await setup.text()
 const worker=await h.mf.getWorker(),fire=async at=>worker.scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'}),at=value=>Date.parse(value)
 await fire(at('2027-03-01T15:00:00Z'))
 await h.cmd('report.time-zone',{timeZone:'America/New_York'})
 const {client}=await draft(h)
 const make=async(title,days,warningDays='')=>{const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title});await h.cmd('expiry.set',{id:p.id,version:1,mode:'days',days,warningDays});await h.cmd('proposal.approve',{id:p.id,version:2,revision:1});const shared=await h.cmd('proposal.send',{id:p.id,version:3});return {...p,path:new URL(shared.shareUrl).pathname}}
 const seven=await make('Seven day campaign',7),fourteen=await make('Fourteen day campaign',14,1),signed=await make('Already agreed campaign',14,1),moved=await make('Extended before warning',14,1)
 let row=(await h.state()).proposals.find(p=>p.id===seven.id);assert.equal(row.expiry.date,'2027-03-08');assert.equal(row.expiry.deadlineAt,at('2027-03-08T05:00:00Z'))
 assert.match((await h.send(seven.path)).text,/2027-03-08.*America\/New_York/)
 const signedCookie=await verified(h,signed.path);assert.equal((await h.send(signed.path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},signedCookie)).status,200)
 const accepted=await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(signed.id).first()
 row=(await h.state()).proposals.find(p=>p.id===moved.id);await h.cmd('expiry.set',{id:moved.id,version:row.version,mode:'date',date:'2027-03-22',warningDays:1})
 assert.equal((await h.state()).proposals.find(p=>p.id===fourteen.id).expiry.deadlineAt,at('2027-03-15T04:00:00Z'),'DST changes the UTC midnight')
 await fire(at('2027-03-08T04:59:59Z'));assert.equal((await h.state()).proposals.find(p=>p.id===seven.id).status,'sent')
 await fire(at('2027-03-08T05:00:00Z'));assert.equal((await h.state()).proposals.find(p=>p.id===seven.id).status,'expired')
 let page=await h.send(seven.path);assert.match(page.text,/This proposal has expired/);assert.ok(!page.text.includes('<button>Accept proposal</button>'))
 assert.equal((await h.send(seven.path+'/action?name=expiry.reopen',{})).status,401)
 const cookie=await verified(h,seven.path)
 assert.equal((await h.send(seven.path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,409)
 assert.equal((await h.send(seven.path+'/action?name=expiry.reopen',{},cookie)).status,200);assert.equal((await h.send(seven.path+'/action?name=expiry.reopen',{},cookie)).status,200)
 row=(await h.state()).proposals.find(p=>p.id===seven.id);assert.equal(row.expiry.reopenRequests.length,1)
 await h.cmd('expiry.set',{id:seven.id,version:row.version,mode:'date',date:'2027-03-12'})
 assert.equal((await h.send(seven.path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200,'same invitation/session reopens')
 assert.equal((await h.state()).proposals.find(p=>p.id===seven.id).expiry.reopenRequests[0].resolution,'extended')
 await fire(at('2027-03-14T04:59:59Z'));assert.equal((await h.state()).outbox.filter(m=>m.subject.startsWith('Expiry warning:')).length,0)
 await fire(at('2027-03-14T05:00:00Z'));await fire(at('2027-03-14T05:00:00Z'))
 let mail=(await h.state()).outbox.filter(m=>m.subject.startsWith('Expiry warning:'));assert.equal(mail.length,1);assert.equal(mail[0].proposal_id,fourteen.id);assert.equal(mail[0].recipient,'avery@northstar.example');assert.match(mail[0].body,/2027-03-15.*America\/New_York/);assert.equal(mail[0].status,'local')
 await fire(at('2027-03-15T04:00:00Z'));row=(await h.state()).proposals.find(p=>p.id===fourteen.id);assert.equal(row.status,'expired')
 const lateCookie=await verified(h,fourteen.path);assert.equal((await h.send(fourteen.path+'/action?name=expiry.reopen',{},lateCookie)).status,200)
 await h.cmd('expiry.set',{id:fourteen.id,version:row.version,mode:'date',date:'2027-03-22',warningDays:1})
 assert.equal((await h.send(fourteen.path,undefined,lateCookie)).status,200);assert.equal((await h.state()).proposals.find(p=>p.id===fourteen.id).status,'sent')
 row=(await h.state()).proposals.find(p=>p.id===fourteen.id)
 const fresh=await h.cmd('proposal.send',{id:fourteen.id,version:row.version});assert.equal((await h.state()).proposals.find(p=>p.id===fourteen.id).expiry.date,'2027-03-22','fresh invitation preserves expiry')
 assert.equal((await h.send(fourteen.path)).status,404)
 await fire(at('2027-03-21T04:00:00Z'));mail=(await h.state()).outbox.filter(m=>m.subject.startsWith('Expiry warning:'));assert.equal(mail.length,2);assert.ok(mail.some(m=>m.proposal_id===moved.id));assert.equal(mail.filter(m=>m.proposal_id===fourteen.id).length,1,'extension does not repeat warning for same revision')
 await fire(at('2027-03-22T04:00:00Z'))
 row=(await h.state()).proposals.find(p=>p.id===fourteen.id);assert.equal(row.status,'expired')
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:fourteen.id,version:row.version,scope:'Reissued campaign with revised scope.'})
 row=(await h.state()).proposals.find(p=>p.id===fourteen.id);await h.cmd('expiry.set',{id:fourteen.id,version:row.version,mode:'days',days:7});row=(await h.state()).proposals.find(p=>p.id===fourteen.id)
 await h.cmd('proposal.approve',{id:fourteen.id,version:row.version,revision:row.revision});row=(await h.state()).proposals.find(p=>p.id===fourteen.id)
 const reissued=await h.cmd('proposal.send',{id:fourteen.id,version:row.version}),newPath=new URL(reissued.shareUrl).pathname
 row=(await h.state()).proposals.find(p=>p.id===fourteen.id);assert.equal(row.revision,2);assert.equal(row.expiry.date,'2027-03-29');assert.equal(row.status,'sent');assert.equal(row.expiry.reopenRequests[0].resolution,'extended');assert.equal((await h.send(new URL(fresh.shareUrl).pathname)).status,404)
 const reissuedCookie=await verified(h,newPath);assert.equal((await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},reissuedCookie)).status,200)
 const noExpiry=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'No deadline'});await h.cmd('expiry.set',{id:noExpiry.id,version:1,mode:'days',days:7});await h.cmd('expiry.remove',{id:noExpiry.id,version:2});assert.equal((await h.state()).proposals.find(p=>p.id===noExpiry.id).expiry.mode,'never')
 await h.cmd('expiry.set',{id:noExpiry.id,version:3,mode:'date',date:'2027-02-30'},h.owner,400)
 await h.cmd('expiry.set',{id:signed.id,version:(await h.state()).proposals.find(p=>p.id===signed.id).version,mode:'days',days:1},h.owner,409)
 await h.send('/auth/invite',{email:'expiry-member@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('expiry-member@studio.example')
 await h.cmd('expiry.set',{id:noExpiry.id,version:3,mode:'days',days:1},member,403)
 await fire(at('2027-04-01T04:00:00Z'));assert.equal((await h.state()).proposals.find(p=>p.id===signed.id).status,'accepted');assert.deepEqual(await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(signed.id).first(),accepted)
 const {recipientExpiryHttp}=await import('./recipients-http.mjs');await recipientExpiryHttp(h)
 // Historical sent-offer fixture: the old schema had no expiry/send-time record.
 const legacy=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Legacy offer without send-time custody'})
 await h.cmd('proposal.approve',{id:legacy.id,version:1,revision:1});await h.cmd('proposal.send',{id:legacy.id,version:2})
 await h.db.prepare('DELETE FROM p_expiry WHERE proposal_id=?').bind(legacy.id).run()
 await h.cmd('expiry.set',{id:legacy.id,version:3,mode:'days',days:7},h.owner,409)
 assert.equal((await h.state()).proposals.find(p=>p.id===legacy.id).expiry.sentAt,null)
 assert.match((await h.send('/app/proposal?id='+legacy.id,undefined,h.owner)).text,/No original send time is recorded/)
 await h.cmd('expiry.set',{id:legacy.id,version:3,mode:'date',date:'2027-04-08'})
 let historical=(await h.state()).proposals.find(p=>p.id===legacy.id);assert.equal(historical.expiry.date,'2027-04-08');assert.equal(historical.expiry.deadlineAt,at('2027-04-08T04:00:00Z'));assert.equal(historical.expiry.sentAt,null)
 await h.cmd('proposal.send',{id:legacy.id,version:historical.version})
 historical=(await h.state()).proposals.find(p=>p.id===legacy.id);assert.equal(historical.expiry.deadlineAt,at('2027-04-08T04:00:00Z'));assert.equal(historical.expiry.sentAt,null,'fresh invitation does not invent the original send time')
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const action of ['expiry.set','expiry.remove','expiry.reopen','expiry.warning'])assert.ok(audit.some(a=>a.action===action&&a.subject&&a.actor_id&&a.occurred_at),action+' is audited')
}))


test('SEND-010 / FOLLOW-002 withdrawal revokes every current public door, preserves history, notifies optionally and reissues only with approval',()=>run(async h=>{
 const {p,path}=await sent(h),cookie=await verified(h,path)
 await h.send('/auth/invite',{email:'sales@studio.example',displayName:'Sales colleague',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('sales@studio.example')
 await h.cmd('proposal.withdraw',{id:p.id,version:3,reason:'Sent to wrong client'},member,403)
 await h.cmd('proposal.withdraw',{id:p.id,version:3,reason:''},h.owner,400)
 await h.cmd('expiry.set',{id:p.id,version:3,mode:'days',days:14,warningDays:1})
 await h.send(path+'/action?name=question.create',{revision:1,section:'scope',text:'When can you begin?'},cookie)
 await h.cmd('followup.schedule',{id:p.id,action:'Call client about start date',dueDate:'2027-03-10'})
 assert.ok((await h.send('/api/platter/followups',undefined,h.owner)).value.rows.some(r=>r.id===p.id))
 const before=(await h.state()).proposals.find(x=>x.id===p.id)
 await h.cmd('proposal.withdraw',{id:p.id,version:4,reason:'Sent to the wrong client'})
 for(const suffix of ['', '/action?name=accept','/action?name=code.request','/action?name=code.verify','/action?name=question.create','/action?name=suggestion.create','/action?name=expiry.reopen','/download.pdf?optionId=one','/data.json','/payment.json','/payment-status.json','/payment-consent.json','/action?name=payment.refresh','/attachments/any-file']){
  const r=await h.send(path+suffix,(suffix.includes('/action')||suffix.includes('/payment'))?{name:'Avery',optionId:'one',consent:true,code:'123456'}:undefined,cookie)
  assert.equal(r.status,410,r.text);assert.match(r.text,/Proposal withdrawn/);assert.match(r.text,/owner@studio.example/)
  for(const secret of [offer.title,offer.scope,offer.optionOne,'2400','When can you begin?'])assert.ok(!r.text.includes(secret),'withdrawn response reveals none of the proposal')
 }
 const after=(await h.state()).proposals.find(x=>x.id===p.id)
 assert.ok(!(await h.send('/api/platter/followups',undefined,h.owner)).value.rows.some(r=>r.id===p.id),'SEND-010 closes every general sales follow-up')
 assert.equal(after.status,'withdrawn');assert.deepEqual(after.options,before.options);assert.equal(after.withdrawals[0].reason,'Sent to the wrong client');assert.equal(after.withdrawals[0].actor_email,h.auth.OWNER_EMAIL);assert.ok(after.withdrawals[0].withdrawn_at>0)
 assert.equal((await h.state()).outbox.filter(m=>m.proposal_id===p.id&&m.subject.startsWith('Proposal withdrawn:')).length,1)
 assert.equal((await h.send('/api/platter/questions',undefined,h.owner)).value.questions.length,0)
 for(const [name,input] of [['proposal.send',{}],['proposal.revise',{...offer,clientId:before.client_id}],['expiry.remove',{}],['pdf.downloads',{enabled:false}],['suggestions.allow',{section:'scope',enabled:true}],['question.answer',{questionId:after.questions[0].id,text:'Tomorrow'}],['question.email',{questionId:after.questions[0].id}]])await h.cmd(name,{...input,id:p.id,version:5},h.owner,409)
 const audit=(await h.send('/api/platter/audit?action=proposal.withdraw',undefined,h.owner)).value.rows
 assert.equal(audit.length,1);assert.equal(audit[0].reason,'Sent to the wrong client');assert.equal(audit[0].actor_id,(await h.state()).actor.id);assert.equal(audit[0].occurred_at,after.withdrawals[0].withdrawn_at)
 await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(Date.now()+13*86400000),cron:'*/15 * * * *'})
 assert.equal((await h.state()).outbox.filter(m=>m.proposal_id===p.id&&m.subject.startsWith('Expiry warning:')).length,0,'withdrawal cancels the current scheduled warning')
 const report=(await h.send('/api/platter/pipeline?status=withdrawn&sort=value',undefined,h.owner)).value
 assert.equal(report.count,1);assert.equal(report.rows[0].id,p.id);assert.equal(report.rows[0].nextAction,'withdrawn');assert.equal(report.totals[0].valueCents,420000)
 const n=await h.cmd('proposal.negotiate',{...offer,clientId:before.client_id,id:p.id,version:5,scope:'Corrected client offer'})
 assert.ok((await h.send('/api/platter/followups',undefined,h.owner)).value.rows.some(r=>r.id===p.id&&r.revision===2),'new negotiated revision has a new sales action')
 await h.cmd('followup.schedule',{id:p.id,action:'Review corrected offer with client',dueDate:'2027-03-11'})
 assert.equal((await h.send('/api/platter/followups',undefined,h.owner)).value.rows.find(r=>r.id===p.id).action,'Review corrected offer with client','a negotiated draft keeps an actionable sales follow-up before resend')
 assert.equal(n.revision,2);await h.cmd('proposal.send',{id:p.id,version:6},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:6,revision:2});const replacement=await h.cmd('proposal.send',{id:p.id,version:7})
 const newPath=new URL(replacement.shareUrl).pathname
 for(const name of ['question.answer','question.email'])await h.cmd(name,{id:p.id,questionId:after.questions[0].id,text:'Old thread'},h.owner,409)
 assert.equal((await h.send(path,undefined,cookie)).status,410);assert.equal((await h.send(newPath,undefined,cookie)).status,200)
 const session=await verified(h,newPath);assert.equal((await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},session)).status,200)
 await h.cmd('proposal.withdraw',{id:p.id,version:9,reason:'Too late'},h.owner,409)
 const {recipientWithdrawalHttp}=await import('./recipients-http.mjs');await recipientWithdrawalHttp(h)
 const secondProposal=await h.cmd('proposal.prepare',{...offer,clientId:before.client_id,title:'Cancelled campaign'});await h.cmd('proposal.approve',{id:secondProposal.id,version:1,revision:1});const secondShare=await h.cmd('proposal.send',{id:secondProposal.id,version:2});const second={p:secondProposal,path:new URL(secondShare.shareUrl).pathname},mailBefore=(await h.state()).outbox.length
 await h.cmd('proposal.withdraw',{id:second.p.id,version:3,reason:'Deal cancelled',notice:false})
 assert.equal((await h.state()).outbox.length,mailBefore);assert.equal((await h.send(second.path)).status,410)
}))


test('EDIT-012 duplicate accepted content into an independent member-owned draft for another client without changing the source',()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {client,p}=await draft(h),beta=await h.cmd('client.save',{name:'Beta Co',email:'contact@beta.example'})
 const form=new FormData();form.set('id',p.id);form.set('version','1');form.set('file',new File(['%PDF exact retained source bytes'],'statement.pdf',{type:'application/pdf'}))
 const uploadRequest=new Request(h.origin+'/app/attachment',{method:'POST',headers:{origin:h.origin,cookie:h.owner},body:form});const uploaded=await h.mf.dispatchFetch(uploadRequest.url,{method:'POST',headers:uploadRequest.headers,body:await uploadRequest.arrayBuffer()});assert.equal(uploaded.status,200);assert.match(await uploaded.text(),/Document saved/)
 const get=async id=>(await h.state()).proposals.find(p=>p.id===id)
 await h.cmd('pdf.downloads',{id:p.id,version:2,enabled:false});await h.cmd('expiry.set',{id:p.id,version:3,mode:'days',days:14,warningDays:1})
 await h.cmd('proposal.approve',{id:p.id,version:4,revision:2});const share=await h.cmd('proposal.send',{id:p.id,version:5}),path=new URL(share.shareUrl).pathname,cookie=await verified(h,path)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)
 await h.cmd('invoice.export',{id:p.id})
 await h.send('/auth/invite',{email:'sales@studio.example',displayName:'Morgan Sales',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('sales@studio.example'),actor=(await h.state(member)).actor
 const before=await get(p.id),accepted=(await h.send(path,undefined,cookie)).text
 await h.cmd('proposal.share',{id:p.id,operatorId:actor.id})
 await h.cmd('proposal.duplicate',{id:p.id,version:1,clientId:beta.id},member,409)
 const copy=await h.cmd('proposal.duplicate',{id:p.id,version:before.version,clientId:beta.id},member),after=await get(copy.id)
 assert.notEqual(copy.id,p.id);assert.equal(after.status,'draft');assert.equal(after.revision,1);assert.equal(after.version,1);assert.equal(after.client_id,beta.id);assert.equal(after.clientName,'Beta Co');assert.equal(after.clientEmail,'contact@beta.example');assert.equal(after.sales_owner_id,actor.id);assert.equal(after.prepared_by,actor.email)
 for(const field of ['scope','terms','options','currency','deposit_bps','attachments','pdfDownloadsEnabled'])assert.deepEqual(after[field],before[field],field+' copied exactly')
 assert.equal(after.expiry.mode,'days');assert.equal(after.expiry.days,14);assert.equal(after.expiry.warningDays,1);assert.equal(after.expiry.sentAt,null);assert.equal(after.expiry.deadlineAt,null);assert.equal(after.expiry.date,null);assert.equal(after.expiry.warningSentAt,null)
 assert.equal(after.approved_by,null);assert.equal(after.approved_at,null);assert.equal(after.acceptance,undefined);assert.equal(after.invoice,undefined);assert.equal(after.shareToken,undefined);assert.deepEqual(after.questions,[]);assert.deepEqual(after.suggestions,[]);assert.deepEqual(after.deliveries,[]);assert.deepEqual(after.pdfDownloads,[]);assert.deepEqual(after.withdrawals,[])
 assert.ok(!(await h.state()).outbox.some(m=>m.proposal_id===copy.id));assert.equal((await h.send('/api/platter/audit?subject='+copy.id,undefined,h.owner)).value.rows.filter(r=>r.action==='proposal.view').length,0)
 const file=await h.send('/api/platter/attachments/'+copy.id+'/'+after.attachments[0].id,undefined,member);assert.equal(file.text,'%PDF exact retained source bytes')
 await h.cmd('proposal.send',{id:copy.id,version:1},h.owner,409);await h.cmd('proposal.approve',{id:copy.id,version:1,revision:1},member,403);await h.cmd('proposal.approve',{id:copy.id,version:1,revision:1});await h.cmd('proposal.send',{id:copy.id,version:2})
 assert.deepEqual(await get(p.id),before);assert.equal((await h.send(path,undefined,cookie)).text,accepted,'source accepted agreement remains byte-identical')
 const same=await h.cmd('proposal.duplicate',{id:p.id,version:before.version});assert.equal((await get(same.id)).client_id,client.id)
 const states=['draft','approved','sent','expired','withdrawn']
 for(const status of states){
  const source=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Source '+status})
  if(status!=='draft')await h.cmd('proposal.approve',{id:source.id,version:1,revision:1})
  if(['sent','expired','withdrawn'].includes(status))await h.cmd('proposal.send',{id:source.id,version:2})
  if(status==='expired')await h.cmd('expiry.set',{id:source.id,version:3,mode:'date',date:'2020-01-01'})
  if(status==='withdrawn')await h.cmd('proposal.withdraw',{id:source.id,version:3,reason:'Cancelled',notice:false})
  const old=await get(source.id);assert.equal(old.status,status)
  const next=await h.cmd('proposal.duplicate',{id:source.id,version:old.version});const copied=await get(next.id);assert.equal(copied.status,'draft');for(const field of ['mode','days','date','warningDays'])assert.deepEqual(copied.expiry[field],field==='date'&&old.expiry.mode==='days'?null:old.expiry[field],'expiry '+field+' copied from '+status);assert.deepEqual(await get(source.id),old)
 }
 const draftSource=await get(same.id);await h.cmd('proposal.approve',{id:same.id,version:draftSource.version,revision:1});await h.cmd('proposal.send',{id:same.id,version:2});await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:same.id,version:3,scope:'Unsent negotiated scope'})
 const negotiated=await h.cmd('proposal.duplicate',{id:same.id,version:4});assert.equal((await get(negotiated.id)).scope,'Unsent negotiated scope')
 const key=await h.cmd('agent.create',{label:'Draft only'});assert.equal((await h.send('/api/platter/agent/command',{name:'proposal.duplicate',input:{id:p.id,version:before.version}},'',{authorization:'Bearer '+key.token})).status,403)
}))

test('EDIT-018 member-only exact-revision previews share selection math and never change business state',()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {p,client}=await draft(h)
 const upload=new FormData();upload.set('id',p.id);upload.set('version','1');upload.set('file',new File(['%PDF preview attachment'],'campaign.pdf',{type:'application/pdf'}))
 const uploadRequest=new Request(h.origin+'/app/attachment',{method:'POST',headers:{origin:h.origin,cookie:h.owner},body:upload});const uploaded=await h.mf.dispatchFetch(uploadRequest.url,{method:'POST',headers:uploadRequest.headers,body:await uploadRequest.arrayBuffer()});assert.equal(uploaded.status,200);assert.match(await uploaded.text(),/Document saved/)
 await h.cmd('expiry.set',{id:p.id,version:2,mode:'days',days:14,warningDays:1})
 await h.send('/auth/invite',{email:'previewer@studio.example',displayName:'Previewer',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('previewer@studio.example')
 await h.cmd('proposal.share',{id:p.id,operatorId:(await h.state(member)).actor.id})
 const key=await h.cmd('agent.create',{label:'Preview boundary'})
 const url=`/app/preview?id=${p.id}&revision=2`,inner=url.replace('/app/preview?','/app/preview/client?')
 const unchanged=()=>h.state(),audit=async()=>(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 await h.cmd('tracking.settings',{enabled:'yes',alerts:'yes',retentionDays:90,quietMinutes:30,consent:'yes'})
 const initialAudit=await audit(),before=await unchanged()
 for(const cookie of [h.owner,member]){
  for(const width of [1440,390]){
   const wrapper=await h.send(url+`&width=${width}`,undefined,cookie);assert.equal(wrapper.status,200);assert.match(wrapper.text,new RegExp(`width="${width}"`));assert.match(wrapper.text,/Viewing as Northstar Coffee/)
   for(const [optionId,total,deposit] of [['one','2,400.00','600.00'],['two','4,200.00','1,050.00']]){
    const r=await h.send(inner+`&width=${width}&optionId=${optionId}`,undefined,cookie)
    assert.equal(r.status,200,r.text);assert.match(r.text,/One studio shoot, edited photographs, and usage licence/);assert.match(r.text,/campaign.pdf/);assert.match(r.text,/Expires 14 calendar days after sending/)
    assert.ok(r.text.includes(`aria-label="Selected total">$${total} USD`));assert.ok(r.text.includes(`aria-label="Selected deposit">$${deposit} USD`))
    assert.match(r.text,/Views of this page are measured/);assert.match(r.text,/<fieldset disabled>/);assert.ok(!r.text.includes('/p/'));assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'self'/)
   }
  }
 }
 const viewedAudit=await audit(),previewRows=viewedAudit.filter(row=>row.action==='proposal.preview')
 assert.equal(previewRows.length,12);for(const row of previewRows){assert.equal(row.subject,p.id);assert.ok(row.actor_id);assert.ok(['owner','sales'].includes(row.actor_role));assert.ok(Number.isFinite(row.occurred_at))}
 assert.deepEqual(viewedAudit.filter(row=>row.action!=='proposal.preview'),initialAudit)
 for(const path of [url,inner]){
  assert.equal((await h.send(path)).status,401)
  assert.equal((await h.send(path,undefined,'',{authorization:'Bearer '+key.token})).status,401)
  for(const name of ['accept','pay','decline','question.create','suggestion.create','code.request','code.verify'])assert.equal((await h.send(path.split('?')[0]+'/action?'+path.split('?')[1]+'&name='+name,{name,optionId:'two',consent:true},h.owner)).status,403)
 }
 assert.equal((await h.send(inner+'&optionId=unknown',undefined,h.owner)).status,400)
 assert.equal((await h.send(inner+'&width=500',undefined,h.owner)).status,400)
 assert.equal((await h.send(inner.replace('revision=2','revision=3'),undefined,h.owner)).status,409)
 assert.deepEqual(await unchanged(),before);assert.deepEqual(await audit(),viewedAudit)
 const attachment=before.proposals.find(row=>row.id===p.id).attachments[0]
 const download=await h.send(`/app/preview/client/attachments/${attachment.id}?id=${p.id}&revision=2`,undefined,member);assert.equal(download.status,200);assert.equal(download.text,'%PDF preview attachment');assert.deepEqual(await unchanged(),before)
 assert.equal((await h.send(`/app/preview/client/attachments/${attachment.id}?id=${p.id}&revision=1`,undefined,member)).status,409)
 await h.cmd('proposal.approve',{id:p.id,version:3,revision:2})
 const approved=await unchanged();assert.equal((await h.send(inner,undefined,member)).status,200);assert.deepEqual(await unchanged(),approved)
 const sentOffer=await h.cmd('proposal.send',{id:p.id,version:4}),path=new URL(sentOffer.shareUrl).pathname
 const cookie=await verified(h,path)
 assert.equal((await h.send(inner,undefined,cookie)).status,401)
 assert.equal((await h.send(inner,undefined,h.owner)).status,409)
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:5,scope:'New negotiated scope for preview.',priceTwo:'4300.03',depositPercent:'33.33'})
 const negotiationUrl=inner.replace('revision=2','revision=3')+'&optionId=two',pendingBefore=await unchanged()
 const pending=await h.send(negotiationUrl,undefined,member);assert.equal(pending.status,200);assert.match(pending.text,/New negotiated scope for preview/);assert.match(pending.text,/Changes since your previous offer/);assert.match(pending.text,/Selected total">\$4,300.03 USD/);assert.match(pending.text,/Selected deposit">\$1,433.20 USD/)
 assert.deepEqual(await unchanged(),pendingBefore)
 const old=await h.send(path,undefined,cookie);assert.match(old.text,/One studio shoot/);assert.ok(!old.text.includes('New negotiated scope'))
 await h.cmd('proposal.approve',{id:p.id,version:6,revision:3});const next=await h.cmd('proposal.send',{id:p.id,version:7}),nextPath=new URL(next.shareUrl).pathname,nextCookie=await verified(h,nextPath)
 await h.send(nextPath+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},nextCookie)
 const final=(await h.state()).proposals.find(row=>row.id===p.id);assert.equal(final.acceptance.totalCents,430003);assert.equal(final.acceptance.depositCents,143320);assert.equal(final.scope,'New negotiated scope for preview.')
}))

test('FOLLOW-002 sales queue orders current reasons and separates notification, logged completion, correction and withdrawal',()=>run(h=>followupJourney(h,{offer,verified})))

test('EDIT-009 conditional sections match selected preview, client, PDF and immutable agreement; revisions, copies and negotiations retain rules',async()=>{
 const h=await harness({assetsDirectory:'public'});try{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
 const fields={...offer,clientId:client.id,optionOne:'Standard',optionTwo:'Premium',terms:'Premium timeline: strategy in week one, delivery in week four.',sectionConditions:{terms:'two'}}
 for(const invalid of [{terms:'missing'},{price:'two'},{scope:'one',terms:1}])await h.cmd('proposal.prepare',{...fields,sectionConditions:invalid},h.owner,400)
 const original=await h.cmd('proposal.prepare',fields)
 const copy=await h.cmd('proposal.duplicate',{id:original.id,version:1})
 await h.cmd('proposal.revise',{...fields,id:copy.id,version:1,sectionConditions:{scope:'one'}})
 await h.cmd('proposal.restore',{id:copy.id,version:2,revision:1})
 assert.deepEqual((await h.state()).revisions.find(r=>r.proposal_id===copy.id&&r.revision===3).snapshot.section_conditions,{terms:'two'})
 for(const [p,optionId] of [[original,'one'],[copy,'two']]){
  const current=(await h.state()).proposals.find(r=>r.id===p.id)
  for(const id of ['one','two']){
   const preview=await h.send(`/app/preview/client?id=${p.id}&revision=${current.revision}&optionId=${id}`,undefined,h.owner)
   assert.equal(preview.status,200);assert.equal(preview.text.includes(fields.terms),id==='two')
  }
  await h.cmd('proposal.approve',{id:p.id,version:current.version,revision:current.revision})
  const share=await h.cmd('proposal.send',{id:p.id,version:current.version+1}),path=new URL(share.shareUrl).pathname,cookie=await verified(h,path)
  for(const id of ['one','two']){
   const page=await h.send(path+'?optionId='+id,undefined,cookie);assert.equal(page.status,200);assert.equal(page.text.includes(fields.terms),id==='two')
   const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId='+id,{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,200)
   const text=(await pdfPages(await pdf.arrayBuffer())).join(' ');assert.equal(text.includes(fields.terms),id==='two');assert.ok(text.includes(offer.scope))
  }
  const accepted=await h.send(path+'/action?name=accept',{optionId,name:'Avery Chen',consent:true},cookie);assert.equal(accepted.status,200);assert.equal(accepted.text.includes(fields.terms),optionId==='two')
  const row=await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first(),frozen=JSON.parse(row.snapshot)
  assert.equal(frozen.terms??'',optionId==='two'?fields.terms:'');assert.equal(frozen.scope,offer.scope)
  assert.ok(!row.snapshot.includes('section_conditions'));assert.equal(row.snapshot.includes(fields.terms),optionId==='two')
  assert.equal((await h.send(path+'?optionId='+(optionId==='one'?'two':'one'),undefined,cookie)).text.includes(fields.terms),optionId==='two','accepted selection cannot change through a query')
  await h.cmd('proposal.revise',{...fields,id:p.id,version:current.version+3},h.owner,409)
 }
 const next=await h.cmd('proposal.prepare',fields);await h.cmd('proposal.approve',{id:next.id,version:1,revision:1});const share=await h.cmd('proposal.send',{id:next.id,version:2})
 await h.cmd('proposal.negotiate',{...fields,id:next.id,version:3,sectionConditions:{scope:'two',terms:'one'}})
 await h.cmd('proposal.approve',{id:next.id,version:4,revision:2});const replacement=await h.cmd('proposal.send',{id:next.id,version:5})
 assert.equal((await h.send(new URL(share.shareUrl).pathname)).status,404)
 const premium=await h.send(new URL(replacement.shareUrl).pathname+'?optionId=two');assert.ok(premium.text.includes(offer.scope));assert.ok(!premium.text.includes(fields.terms))
 const standard=await h.send(new URL(replacement.shareUrl).pathname+'?optionId=one');assert.ok(!standard.text.includes(offer.scope));assert.ok(standard.text.includes(fields.terms))
 const changes=await h.send(`/app/proposal?id=${next.id}&from=1&to=2`,undefined,h.owner);assert.match(changes.text,/scope visibility/);assert.match(changes.text,/terms visibility/)
 }finally{await h.close()}
})

test('PRICE-001 / COLLAB-003 / EDIT-009 / EDIT-012 / EDIT-014 / EDIT-018 / PROP-001 / TEAM-004 tables recompute twelve grouped lines, preserve every carrier and refuse malformed prices and quantities',async()=>{const h=await harness({assetsDirectory:'public'});try{
 const {pricingFixture,pricingExpected:expected}=await import('./pricing-fixture.mjs')
 const tables=pricingFixture(),client=await h.cmd('client.save',{name:'Northstar tables',email:'tables@studio.example'})
 const input={...offer,clientId:client.id,pricingTables:tables,priceOne:'9999999',terms:'Premium only',sectionConditions:{terms:'two'}}
 const p=await h.cmd('proposal.prepare',input)
 const current=async()=> (await h.state()).proposals.find(x=>x.id===p.id)
 let row=await current();assert.equal(row.currency,'USD');assert.equal(row.options[0].cents,expected.grandCents)
 assert.deepEqual(row.options[0].tables.map(t=>t.subtotalCents),expected.tableCents)
 assert.deepEqual(row.options[0].tables.map(t=>t.groups.map(g=>g.subtotalCents)),expected.groupCents)
 for(let t=0;t<2;t++)for(let i=0;i<6;i++){
  const line=row.options[0].tables[t].lines[i],source=tables[t].lines[i]
  for(const field of ['name','description','quantity','unit','unitPrice','group'])assert.equal(line[field],source[field])
  assert.equal(line.lineTotalCents,source.expected)
 }
 const key=await h.cmd('agent.create',{label:'PRICE-001 table assistant'})
 const rpc=await h.send('/api/platter/agent/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'prepare_proposal',arguments:{clientId:client.id,title:'Agent table draft',scope:'Source-defined services',depositPercent:25,optionOne:'Project',priceOne:'1',optionTwo:'Campaign',priceTwo:'4200',pricingTables:tables}}},'',{authorization:'Bearer '+key.token})
 assert.equal(rpc.status,200);assert.ok(!rpc.value.result.isError,JSON.stringify(rpc.value));const agentDraft=JSON.parse(rpc.value.result.content[0].text);assert.equal((await h.state()).proposals.find(x=>x.id===agentDraft.id).options[0].cents,expected.grandCents)
 const before=await h.state()
 for(const [field,values] of [['quantity',['0','-1','1.0001','NaN','Infinity','1e2','1000001',{},null]],['unitPrice',['0','-1','1.001','NaN','1e2','10000001',{},null]]])for(const value of values){
  const bad=pricingFixture();bad[0].lines[0][field]=value
  await h.cmd('proposal.prepare',{...input,pricingTables:bad},h.owner,400)
 }
 for(const bad of ['invalid',{},[{optionId:'missing',name:'Bad',lines:tables[0].lines}],[{optionId:'one',name:'Empty',lines:[]} ]])await h.cmd('proposal.prepare',{...input,pricingTables:bad},h.owner,400)
 const overflow=pricingFixture();overflow[0].lines[0].quantity='1000000';overflow[0].lines[0].unitPrice='10000000';await h.cmd('proposal.prepare',{...input,pricingTables:overflow},h.owner,400)
 assert.deepEqual((await h.state()).proposals,before.proposals,'bad inputs write no proposals')
 const changed=pricingFixture();changed[0].lines[0].description='Revised description at the same price'
 await h.cmd('proposal.revise',{...input,id:p.id,version:1,pricingTables:changed})
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 let response=await h.send(`/app/proposal?id=${p.id}&from=1&to=2`,undefined,h.owner);assert.match(response.text,/Revised description at the same price/);assert.match(response.text,/<del>[^]*Agreed discovery service/)
 await h.cmd('proposal.restore',{id:p.id,version:2,revision:1})
 row=await current();assert.deepEqual(row.options[0].tables,before.proposals.find(x=>x.id===p.id).options[0].tables)
 const copied=await h.cmd('proposal.duplicate',{id:p.id,version:3});assert.deepEqual((await h.state()).proposals.find(x=>x.id===copied.id).options,row.options)
 response=await h.send(`/app/preview/client?id=${p.id}&revision=3&optionId=one`,undefined,h.owner);assert.equal(response.status,200);assert.match(response.text,/403\.89/);assert.match(response.text,/Project services/);assert.doesNotMatch(response.text,/Premium only/)
 await h.cmd('proposal.approve',{id:p.id,version:3,revision:3});const share=await h.cmd('proposal.send',{id:p.id,version:4}),path=new URL(share.shareUrl).pathname,cookie=await verified(h,path)
 for(let reload=0;reload<2;reload++){response=await h.send(path+'?optionId=one',undefined,cookie);assert.match(response.text,/403\.89/);for(const table of tables)for(const line of table.lines)assert.ok(response.text.includes(line.description))}
 const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=one',{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,200)
 const pages=await pdfPages(await pdf.arrayBuffer()),content=pages.join(' ')
 for(const table of tables)for(const line of table.lines){assert.ok(content.includes(line.description));assert.ok(content.includes(line.quantity+' '+line.unit))}
 for(const value of ['403.89','330.03','73.86','100.97'])assert.ok(content.includes(value))
 for(const page of pages)assert.match(page,/Not signed, revision 3/)
 await h.cmd('proposal.negotiate',{...input,id:p.id,version:5,pricingTables:changed})
 assert.deepEqual((await current()).options[0].tables[0].lines[0].description,changed[0].lines[0].description)
 response=await h.send(path,undefined,cookie);assert.match(response.text,/Agreed discovery service/);assert.doesNotMatch(response.text,/Revised description at the same price/)
 response=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie);assert.equal(response.status,200)
 const accepted=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
 assert.equal(accepted.total_cents,expected.grandCents);assert.equal(accepted.deposit_cents,expected.depositCents);assert.deepEqual(JSON.parse(accepted.snapshot).options[0].tables,before.proposals.find(x=>x.id===p.id).options[0].tables)
 await h.cmd('proposal.revise',{...input,id:p.id,version:7},h.owner,409)
 const audit=(await h.send('/api/platter/audit?subject='+p.id,undefined,h.owner)).value.rows
 assert.ok(audit.some(r=>r.kind==='proposal.prepare'||r.action==='proposal.prepare'))
}finally{await h.close()}})

test('PRICE-002 / EDIT-009 / EDIT-012 / EDIT-014 / EDIT-018 / COLLAB-003 / PORT-002 arbitrary packages and bounded optional quantities share server totals and immutable selection',async()=>{
 const h=await harness({assetsDirectory:'public'});try{
  const {packageFixture,packageSelection:items,packageExpected:expected,scheduleFixture,scheduleExpected}=await import('./packages-fixture.mjs')
  const client=await h.cmd('client.save',{name:'Package client',email:'packages@studio.example'})
  const input={...offer,paymentTerms:scheduleFixture(),clientId:client.id,packages:packageFixture(),terms:'Complete package only',sectionConditions:{terms:'three'}}
  const p=await h.cmd('proposal.prepare',input),current=async()=> (await h.state()).proposals.find(x=>x.id===p.id)
  const key=await h.cmd('agent.create',{label:'PRICE-002 package drafter'}),rpc=await h.send('/api/platter/agent/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'prepare_proposal',arguments:{clientId:client.id,title:'Agent package draft',scope:'Defined services',depositPercent:25,packages:packageFixture()}}},'',{authorization:'Bearer '+key.token})
  assert.equal(rpc.status,200);assert.ok(!rpc.value.result.isError,JSON.stringify(rpc.value));const agentDraft=JSON.parse(rpc.value.result.content[0].text);assert.equal((await h.state()).proposals.find(x=>x.id===agentDraft.id).options.length,3)
  let row=await current();assert.equal(row.options.length,3);assert.equal(row.options[1].optionalItems[0].unitCents,7525)
  const before=await h.state()
  for(const change of [p=>p[1].optionalItems[0].max=0,p=>p[1].optionalItems[0].min=11,p=>p[1].id='one',p=>p[1].optionalItems[0].unitPrice='1.001',p=>p[1].optionalItems.push({...p[1].optionalItems[0]})]){
   const packages=packageFixture();change(packages);await h.cmd('proposal.prepare',{...input,packages},h.owner,400)
  }
  await h.cmd('proposal.prepare',{...input,packages:[]},h.owner,400)
  assert.deepEqual((await h.state()).proposals,before.proposals)
  const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
  const query='&optionId=two&items='+encodeURIComponent(JSON.stringify(items)),preview=`/app/preview/client?id=${p.id}&revision=1${query}`
  let r=await h.send(preview,undefined,h.owner);assert.equal(r.status,200,r.text);assert.match(r.text,/2,301\.00/);assert.match(r.text,/575\.25/);assert.doesNotMatch(r.text,/Complete package only/)
  assert.deepEqual((await current()).options,row.options);assert.equal((await current()).version,1);assert.deepEqual((await h.state()).outbox,before.outbox)
  for(const optionId of ['one','two','three']){r=await h.send(`/app/preview/client?id=${p.id}&revision=1&optionId=${optionId}`,undefined,h.owner);assert.equal(r.status,200);assert.equal(r.text.includes('Complete package only'),optionId==='three')}
  r=await h.send(preview.replace('quantity%22%3A4','quantity%22%3A11'),undefined,h.owner);assert.equal(r.status,400)
  const records=({proposals,revisions,outbox})=>({proposals,revisions,outbox}),unchanged=records(await h.state())
  r=await h.send(`/app/preview/client/action?id=${p.id}&revision=1&name=accept${query}`,{name:'Avery Chen',optionId:'two',items,consent:true},h.owner);assert.equal(r.status,403);assert.deepEqual(records(await h.state()),unchanged,'a preview selection cannot accept or write')
  const changed=packageFixture();changed[1].optionalItems[0].unitPrice='80'
  await h.cmd('proposal.revise',{...input,id:p.id,version:1,packages:changed})
  r=await h.send(`/app/proposal?id=${p.id}&from=1&to=2`,undefined,h.owner);assert.match(r.text,/optional items/);assert.match(r.text,/80\.00/)
  await h.cmd('proposal.restore',{id:p.id,version:2,revision:1});row=await current();assert.deepEqual(row.options,before.proposals.find(x=>x.id===p.id).options)
  const copy=await h.cmd('proposal.duplicate',{id:p.id,version:3});assert.deepEqual((await h.state()).proposals.find(x=>x.id===copy.id).options,row.options)
  const copied=()=>h.state().then(s=>s.proposals.find(x=>x.id===copy.id))
  await h.cmd('proposal.revise',{...offer,clientId:client.id,id:copy.id,version:1,title:'Legacy command updates first package',priceOne:'1200'})
  assert.equal((await copied()).options[0].cents,120000);assert.equal((await copied()).options.length,3);assert.deepEqual((await copied()).options[1].optionalItems,row.options[1].optionalItems)

  // A single package is valid too; no fixed two-package limit remains.
  const single=await h.cmd('proposal.prepare',{...input,packages:[packageFixture()[0]],sectionConditions:{}});assert.equal((await h.state()).proposals.find(x=>x.id===single.id).options.length,1)
  // PRICE-001 inheritance: any package can be priced by tables, and its selected optional items add to the table total.
  const tabled=await h.cmd('proposal.prepare',{...input,sectionConditions:{},pricingTables:[{optionId:'three',name:'Delivery',lines:[{name:'Sprint',quantity:'2',unit:'week',unitPrice:'1500.50'}]}]})
  r=await h.send(`/app/preview/client?id=${tabled.id}&revision=1&optionId=three&items=`+encodeURIComponent(JSON.stringify([{id:'rush',quantity:2}])),undefined,h.owner);assert.equal(r.status,200,r.text);assert.match(r.text,/3,151\.50/);assert.match(r.text,/787\.88/)
  await h.cmd('proposal.approve',{id:p.id,version:3,revision:3});const share=await h.cmd('proposal.send',{id:p.id,version:4}),path=new URL(share.shareUrl).pathname,cookie=await verified(h,path)
  const offerBefore=await current()
  for(const invalid of [[{id:'rush',quantity:11}],[{id:'rush',quantity:0}],[{id:'rush',quantity:'1.5'}],[{id:'unknown',quantity:1}],[{id:'rush',quantity:1},{id:'rush',quantity:1}],[{id:'training',quantity:2}],{},null]){
   const q='?optionId=two&items='+encodeURIComponent(JSON.stringify(invalid))
   assert.equal((await h.send(path+q,undefined,cookie)).status,400)
   const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf'+q,{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,400)
   assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items:invalid,consent:true},cookie)).status,400)
  }
  assert.deepEqual(await current(),offerBefore,'refused selections write nothing')
  r=await h.send(path+'?optionId=two&items='+encodeURIComponent(JSON.stringify(items)),undefined,cookie);assert.equal(r.status,200);assert.match(r.text,/2,301\.00/);assert.match(r.text,/575\.25/)
  const removed=await h.send(path+'?optionId=two',undefined,cookie);assert.match(removed.text,/2,000\.00/)
  for(const [optionId,choices,total] of [['one',[],100000],['two',[],200000],['two',[{id:'rush',quantity:1}],207525],['two',items,230100]]){const query='?optionId='+optionId+'&items='+encodeURIComponent(JSON.stringify(choices)),data=await h.send(path+'/data.json'+query,undefined,cookie);assert.equal(data.status,200);assert.deepEqual(data.value.paymentSchedule,scheduleExpected(total,Math.round(total*.25)),'Every schedule amount follows the selected package and quantity');const preview=await h.send(`/app/preview/client?id=${copy.id}&revision=2&optionId=${optionId}&items=`+encodeURIComponent(JSON.stringify(choices)),undefined,h.owner);assert.equal(preview.status,200)}
  // PRICE-002: native review forms discard the previous package's checked items on a switch.
  for(const route of [path+'?optionId=one',`/app/preview/client?id=${copy.id}&revision=2&optionId=one`]){
   const review=await h.send(route+'&itemsOptionId=two&add.rush=yes&qty.rush=4',undefined,route.startsWith('/app/')?h.owner:cookie)
   assert.equal(review.status,200,review.text);assert.match(review.text,route.startsWith('/app/')?/1,200\.00/:/1,000\.00/)
  }
  const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=two&items='+encodeURIComponent(JSON.stringify(items)),{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,200)
  const pages=await pdfPages(await pdf.arrayBuffer());for(const page of pages)assert.match(page,/Not signed, revision 3/)
  const pdfText=pages.join(' ');for(const text of ['2,301.00','575.25','Rush delivery: 4 x USD 75.25 = USD 301.00'])assert.ok(pdfText.includes(text),pdfText);assert.ok(!pdfText.includes('Complete package only'))
  const downloads=(await current()).pdfDownloads;assert.deepEqual(JSON.parse(downloads[0].selection).map(x=>({id:x.id,quantity:x.quantity})),items)
  await h.cmd('proposal.negotiate',{...input,id:p.id,version:5,packages:changed})
  r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items,consent:true,totalCents:1,depositCents:1},cookie);assert.equal(r.status,200,r.text)
  const accepted=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first(),snapshot=JSON.parse(accepted.snapshot)
  assert.deepEqual(snapshot.paymentSchedule,scheduleExpected(230100,57525));const publicAgreement=await h.send(path+'/data.json',undefined,cookie);assert.deepEqual(publicAgreement.value.paymentSchedule,snapshot.paymentSchedule);assert.deepEqual(publicAgreement.value.acceptance.paymentSchedule,snapshot.paymentSchedule)
  for(const amount of ['862.88','862.87','230.10','2099-02-28','Design approval','net 15'])assert.ok(pdfText.includes(amount),'PDF schedule '+amount)
  assert.ok((await h.send(path,undefined,cookie)).text.includes('2099-02-28'))
  assert.equal(accepted.total_cents,expected.totalCents);assert.equal(accepted.deposit_cents,expected.depositCents);assert.equal(snapshot.selection.optionId,'two');assert.equal(snapshot.selection.items[0].quantity,4);assert.equal(snapshot.selection.items[0].totalCents,30100);assert.ok(!snapshot.terms);assert.deepEqual(snapshot.options,row.options)
  await h.send(path+'/action?name=accept',{name:'Another signer',optionId:'one',items:[],consent:true},cookie);assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first(),accepted)
  r=await h.send(path,undefined,cookie);assert.match(r.text,/2,301\.00/);assert.match(r.text,/Rush delivery/)
  const invoice=await h.cmd('invoice.export',{id:p.id});assert.match((await h.send('/api/platter/invoices/'+invoice.id+'.csv',undefined,h.owner)).text,/575\.25/)

  // Terms copy independently; fixed deposits and date or event schedules use the same selected money.
  const termSource=await h.cmd('proposal.prepare',{...input,depositPercent:'30'});await h.cmd('template.save',{id:termSource.id,version:1,name:'Schedule template'});const template=(await h.state()).templates.find(t=>t.name==='Schedule template'),templateBytes=JSON.stringify(template.snapshot)
  const fromTemplate=await h.cmd('template.start',{id:template.id,version:template.version,clientId:client.id});await h.cmd('proposal.revise',{...input,id:fromTemplate.id,version:1,depositPercent:'25'});assert.equal(JSON.stringify((await h.state()).templates.find(t=>t.id===template.id).snapshot),templateBytes);assert.equal(template.snapshot.deposit_bps,3000)
  await h.cmd('proposal.restore',{id:fromTemplate.id,version:2,revision:1});assert.equal((await h.state()).proposals.find(t=>t.id===fromTemplate.id).deposit_bps,3000)
  const invoiceCount=(await h.state()).proposals.filter(p=>p.invoice).length
  for(const [fixed,netDays] of [[null,15],[null,30],['500',30]]){
   const terms={...scheduleFixture(),depositFixed:fixed,netDays},f=await h.cmd('proposal.prepare',{...input,paymentTerms:terms,depositPercent:'30'}),q='?optionId=two&items='+encodeURIComponent(JSON.stringify(items)),expectedSchedule={...scheduleExpected(230100,fixed?50000:69030),netDays};expectedSchedule.rows=expectedSchedule.rows.map(r=>({...r,netDays:r.kind==='deposit'?0:netDays}))
   const preview=await h.send(`/app/preview/client?id=${f.id}&revision=1&optionId=two&items=`+encodeURIComponent(JSON.stringify(items)),undefined,h.owner);assert.equal(preview.status,200,preview.text);assert.ok(preview.text.includes('net '+netDays))
   const defaults=await h.send(`/app/preview/client?id=${f.id}&revision=1&optionId=one`,undefined,h.owner);assert.equal(defaults.status,200);assert.match(defaults.text,fixed?/500\.00/:/300\.00/)
   await h.cmd('proposal.approve',{id:f.id,version:1,revision:1});const fpath=new URL((await h.cmd('proposal.send',{id:f.id,version:2})).shareUrl).pathname;await h.send(fpath+'/action?name=code.request',{});const code=(await h.state()).outbox.find(x=>x.proposal_id===f.id&&x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0],session=await h.send(fpath+'/action?name=code.verify',{code});assert.equal(session.status,200)
   const selected=await h.send(fpath+'/data.json'+q,undefined,session.cookie);assert.deepEqual(selected.value.paymentSchedule,expectedSchedule)
   const fp=await h.mf.dispatchFetch(h.origin+fpath+'/download.pdf'+q,{headers:{host:new URL(h.origin).host,cookie:session.cookie}});assert.equal(fp.status,200);const ftext=(await pdfPages(await fp.arrayBuffer())).join(' ');assert.ok(ftext.includes(fixed?'500.00':'690.30'));assert.ok(ftext.includes('net '+netDays))
   assert.equal((await h.send(fpath+'/action?name=accept',{name:'Avery Chen',optionId:'two',items,consent:true},session.cookie)).status,200);assert.deepEqual((await h.send(fpath+'/data.json',undefined,session.cookie)).value.paymentSchedule,expectedSchedule)
  }
  assert.equal((await h.state()).proposals.filter(p=>p.invoice).length,invoiceCount,'Schedules do not create invoices')
  const beforeInvalid=await h.state();for(const paymentTerms of [{...scheduleFixture(),depositFixed:'1001'}, {...scheduleFixture(),netDays:7}, {...scheduleFixture(),milestones:[{label:'Invalid',percent:60,date:'2099-02-30'}]}, {...scheduleFixture(),milestones:[{label:'Underallocated',percent:60,event:'Approval'}]}])await h.cmd('proposal.prepare',{...input,paymentTerms},h.owner,400);assert.deepEqual((await h.state()).proposals,beforeInvalid.proposals)
  await h.send('/auth/invite',{email:'schedule-sales@studio.example',displayName:'Schedule sales',role:'member',returnTo:'/app'},h.owner);const sales=await h.signIn('schedule-sales@studio.example');await h.cmd('proposal.prepare',{...input},sales,403)
  await h.cmd('proposal.share',{id:termSource.id,operatorId:(await h.state(sales)).actor.id});await h.cmd('proposal.revise',{...input,id:termSource.id,version:1,paymentTerms:{...scheduleFixture(),netDays:30}},sales,403);await h.cmd('proposal.revise',{...input,id:termSource.id,version:1,depositPercent:'25'},sales,403)
  // EDIT-009 inheritance: a section shown only while an optional item is added, in whichever package offers it.
  const rushTerms='Rush delivery terms apply.',rushInput={...input,title:'Rush-dependent terms',terms:rushTerms,sectionConditions:{terms:'item:rush'}},withRush='&items='+encodeURIComponent(JSON.stringify(items)),beforeRush=await h.state()
  for(const terms of ['item:absent','item:','item:rush:extra','rush'])await h.cmd('proposal.prepare',{...rushInput,sectionConditions:{terms}},h.owner,400)
  assert.deepEqual((await h.state()).proposals,beforeRush.proposals,'unknown optional-item conditions write nothing')
  const rush=await h.cmd('proposal.prepare',rushInput),rushCopy=await h.cmd('proposal.duplicate',{id:rush.id,version:1}),conditions=async id=>JSON.parse((await h.state()).proposals.find(x=>x.id===id).section_conditions)
  assert.deepEqual(await conditions(rushCopy.id),{terms:'item:rush'})
  await h.cmd('proposal.revise',{...rushInput,id:rushCopy.id,version:1,sectionConditions:{terms:'item:training'}});await h.cmd('proposal.restore',{id:rushCopy.id,version:2,revision:1});assert.deepEqual(await conditions(rushCopy.id),{terms:'item:rush'})
  for(const [selection,shown] of [['&optionId=two',false],['&optionId=two'+withRush,true],['&optionId=three&items='+encodeURIComponent(JSON.stringify([{id:'rush',quantity:1}])),true],['&optionId=one&items='+encodeURIComponent(JSON.stringify([{id:'training',quantity:1}])),false]]){
   r=await h.send(`/app/preview/client?id=${rush.id}&revision=1${selection}`,undefined,h.owner);assert.equal(r.status,200,r.text);assert.equal(r.text.includes(rushTerms),shown,selection)
  }
  const sendRush=async(id,version,revision)=>{
   await h.cmd('proposal.approve',{id,version,revision});const path=new URL((await h.cmd('proposal.send',{id,version:version+1})).shareUrl).pathname
   assert.equal((await h.send(path+'/action?name=code.request',{})).status,200);const code=(await h.state()).outbox.find(x=>x.proposal_id===id&&x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
   const v=await h.send(path+'/action?name=code.verify',{code});assert.equal(v.status,200,v.text);return {path,cookie:v.cookie}
  }
  const added=await sendRush(rush.id,1,1),omitted=await sendRush(rushCopy.id,3,3)
  for(const [selection,shown] of [['?optionId=two',false],['?optionId=two'+withRush,true]]){
   assert.equal((await h.send(added.path+selection,undefined,added.cookie)).text.includes(rushTerms),shown,selection)
   const pdf=await h.mf.dispatchFetch(h.origin+added.path+'/download.pdf'+selection,{headers:{host:new URL(h.origin).host,cookie:added.cookie}});assert.equal(pdf.status,200)
   assert.equal((await pdfPages(await pdf.arrayBuffer())).join(' ').includes(rushTerms),shown,'PDF '+selection)
  }
  assert.equal((await h.send(added.path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items,consent:true},added.cookie)).status,200)
  assert.equal((await h.send(omitted.path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items:[],consent:true},omitted.cookie)).status,200)
  const agreement=async id=>JSON.parse((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(id).first()).snapshot)
  assert.equal((await agreement(rush.id)).terms,rushTerms);assert.ok(!(await agreement(rushCopy.id)).terms,'the agreement omits a section whose optional item was not added')
  assert.ok((await h.send(added.path,undefined,added.cookie)).text.includes(rushTerms));assert.ok(!(await h.send(omitted.path,undefined,omitted.cookie)).text.includes(rushTerms))
 }finally{await h.close()}
})


test('PRICE-002 / SIGN-008 / TEAM-004 signed-upload selections use sent prices, refuse invalid quantities without writes, and freeze the exact agreement and invoice',()=>run(async h=>{
 assert.equal((await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
 const {packageFixture,packageSelection:items,packageExpected:expected,scheduleFixture,scheduleExpected}=await import('./packages-fixture.mjs')
 const client=await h.cmd('client.save',{name:'Paper package client',email:'paper@studio.example'})
 const input={...offer,paymentTerms:scheduleFixture(),clientId:client.id,packages:packageFixture(),terms:'Complete package only',sectionConditions:{terms:'three'}}
 const p=await h.cmd('proposal.prepare',input)
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});const share=await h.cmd('proposal.send',{id:p.id,version:2}),path=new URL(share.shareUrl).pathname
 const fields={id:p.id,version:3,optionId:'two',signer:'Morgan Lee',signedOn:'2026-10-15',attest:'yes',items:JSON.stringify(items),totalCents:1,depositCents:1}
 const bytes=new TextEncoder().encode('%PDF package Growth with Rush delivery quantity four')
 const record=async(values,cookie=h.owner)=>{
  const form=new FormData();for(const [k,v]of Object.entries(values))form.set(k,String(v));form.set('file',new File([bytes],'packages-signed.pdf',{type:'application/pdf'}))
  const request=new Request(h.origin+'/app/paper-acceptance',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie},body:form})
  const r=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});return {status:r.status,text:await r.text()}
 }
 const current=async()=>(await h.state()).proposals.find(x=>x.id===p.id)
 const before=await current(),filesBefore=(await h.db.prepare('SELECT * FROM p_attachment_files').all()).results,auditBefore=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const invalid of [[{id:'rush',quantity:11}],[{id:'rush',quantity:0}],[{id:'rush',quantity:'1.5'}],[{id:'unknown',quantity:1}],[{id:'rush',quantity:1},{id:'rush',quantity:1}],[{id:'training',quantity:2}],{},null])assert.equal((await record({...fields,items:JSON.stringify(invalid)})).status,400)
 assert.equal((await record({...fields,items:'not JSON'})).status,400)
 assert.equal((await record({...fields,optionId:'absent'})).status,400)
 assert.equal((await record({...fields,version:2})).status,409)
 await h.send('/auth/invite',{email:'paper-member@studio.example',displayName:'Member',role:'member',returnTo:'/app'},h.owner)
 assert.equal((await record(fields,await h.signIn('paper-member@studio.example'))).status,403)
 assert.deepEqual(await current(),before)
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_attachment_files').all()).results,filesBefore,'invalid selections retain no uploaded files')
 assert.deepEqual((await h.send('/api/platter/audit',undefined,h.owner)).value.rows.filter(x=>x.action==='acceptance.upload'),auditBefore.filter(x=>x.action==='acceptance.upload'))
 for(const quantity of [1,10]){const r=await h.send(`/app/proposal?id=${p.id}&paperOption=two&add.rush=yes&qty.rush=${quantity}`,undefined,h.owner);assert.equal(r.status,200,r.text)}
 const review=await h.send(`/app/proposal?id=${p.id}&paperOption=two&add.rush=yes&qty.rush=4`,undefined,h.owner)
 assert.equal(review.status,200);assert.match(review.text,/2,301\.00/);assert.match(review.text,/575\.25/);assert.equal((await current()).version,3)
 // A negotiation cannot substitute its higher prices for the already sent paper.
 const changed=packageFixture();changed[1].optionalItems[0].unitPrice='80'
 await h.cmd('proposal.negotiate',{...input,id:p.id,version:3,packages:changed})
 const r=await record({...fields,version:4});assert.equal(r.status,200,r.text)
 const accepted=await current(),a=accepted.acceptance
 assert.equal(a.method,'upload');assert.equal(a.optionId,'two');assert.equal(a.totalCents,expected.totalCents);assert.equal(a.depositCents,expected.depositCents);assert.equal(a.selection.items[0].quantity,4);assert.equal(a.selection.items[0].unitCents,7525)
 const frozen=JSON.parse((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).snapshot)
 assert.equal(frozen.selection.items[0].totalCents,30100);assert.equal(frozen.terms,'');assert.deepEqual(frozen.options,before.options);assert.equal(accepted.negotiating,undefined)
 assert.equal((await record({...fields,version:5,optionId:'one',items:'[]'})).status,409);assert.deepEqual((await current()).acceptance,a)
 const cookie=await verified(h,path),clientView=await h.send(path,undefined,cookie);assert.match(clientView.text,/2,301\.00/);assert.match(clientView.text,/575\.25/);assert.match(clientView.text,/Rush delivery/);assert.doesNotMatch(clientView.text,/Complete package only|packages-signed.pdf/)
 const file=await h.mf.dispatchFetch(h.origin+'/api/platter/attachments/'+p.id+'/'+a.signedCopy.id,{headers:{cookie:h.owner}});assert.equal(file.status,200);assert.deepEqual(new Uint8Array(await file.arrayBuffer()),bytes)
 const invoice=await h.cmd('invoice.export',{id:p.id});assert.match((await h.send('/api/platter/invoices/'+invoice.id+'.csv',undefined,h.owner)).text,/575\.25/)
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows.filter(x=>x.action==='acceptance.upload'&&x.subject===p.id);assert.equal(audit.length,1);assert.equal(audit[0].actor_role,'owner');assert.ok(audit[0].occurred_at)
}))

test('EDIT-002 / MOB-001 five starter and personal templates start independent drafts, guard ownership and versions, and retain agent approval boundaries',async()=>{const h=await harness({assetsDirectory:'public'});try{await templatesHttp(h)}finally{await h.close()}})


test('EDIT-016 body phrase search returns exactly three of 500 proposals including an uploaded PDF with live folder permissions', {timeout:120000}, ()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const client=await h.cmd('client.save',{name:'Search client',email:'search@studio.example'}),matches=[];let pricedId,oldLink
 for(let n=0;n<500;n++){
  const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:`Proposal ${String(n).padStart(3,'0')}`,scope:n===0?'Delivery includes literal [50%_budget] review.':offer.scope,terms:n===1?'Confirm literal [50%_budget] review before delivery.':'',...(n===2?{pricingTables:[{optionId:'one',name:'Services',lines:[{name:'Painting',description:'Weatherproof copper finish',quantity:'1',unit:'project',unitPrice:'1200'}]}]}:{})})
  if(n<2)matches.push(p.id)
  if(n===2){pricedId=p.id;const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);pdf.addPage().drawText('literal [50%_budget] review',{font,x:48,y:700,size:12});const form=new FormData();form.set('id',p.id);form.set('version','1');form.set('file',new File([await pdf.save()],'synthetic-platter-8300.pdf',{type:'application/pdf'}));const request=new Request(h.origin+'/app/attachment',{method:'POST',headers:{origin:h.origin,cookie:h.owner},body:form}),uploaded=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});assert.equal(uploaded.status,200);const indexed=(await h.state()).proposals.find(row=>row.id===p.id);assert.match(indexed.attachmentText,/literal \[50%_budget\] review/,'uploaded PDF bytes are indexed as content');matches.push(p.id)}
  if(n===0){await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});const share=await h.cmd('proposal.send',{id:p.id,version:2});oldLink=new URL(share.shareUrl).pathname;const cookie=await verified(h,oldLink);assert.equal((await h.send(oldLink+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)}
 }
 const started=performance.now(),r=await h.send('/api/platter/pipeline?q='+encodeURIComponent('LITERAL   [50%_budget] REVIEW'),undefined,h.owner)
 const elapsed=performance.now()-started;console.log('EDIT-016 500-proposal HTTP search elapsed ms:',Math.round(elapsed));assert.ok(elapsed<1000,'the exact three-result 500-proposal search completes within one second')
 assert.equal(r.status,200,r.text);assert.deepEqual(new Set(r.value.rows.map(p=>p.id)),new Set(matches));assert.equal(r.value.count,3)
 assert.deepEqual(r.value.totals,[{currency:'USD',count:3,valueCents:1080000}])
 const priced=await h.send('/api/platter/pipeline?q='+encodeURIComponent('weatherproof copper finish'),undefined,h.owner);assert.equal(priced.status,200);assert.deepEqual(priced.value.rows.map(p=>p.id),[pricedId])
 const credential=await h.send('/api/platter/pipeline?q='+oldLink.split('/').at(-1),undefined,h.owner);assert.equal(credential.status,200);assert.equal(credential.value.count,0,'invitation credentials never participate in search')
 const source=(await h.state()).proposals.find(p=>p.id===matches[1]),template=await h.cmd('template.save',{id:source.id,version:source.version,name:'Body-search template'}),hidden=await h.cmd('template.save',{id:source.id,version:source.version,name:'Personal template excluded from another member'})
 let result=await h.send('/api/platter/template-search?q='+encodeURIComponent('LITERAL   [50%_budget] REVIEW'),undefined,h.owner);assert.equal(result.status,200);assert.deepEqual(new Set(result.value.rows.map(t=>t.id)),new Set([template.id,hidden.id]),'template body text uses the same literal phrase semantics')
 await h.send('/auth/invite',{email:'synthetic-platter-7@example.com',displayName:'Unshared sales member',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('synthetic-platter-7@example.com');result=await h.send('/api/platter/template-search?q='+encodeURIComponent('literal [50%_budget] review'),undefined,member);assert.equal(result.status,200);assert.deepEqual(result.value.rows,[],'personal template search does not grant another member access')
 const team=await h.cmd('team.create',{name:'Template search team'}),folder=await h.cmd('folder.save',{kind:'template',name:'Team search folder',teams:[team.id],shareConsent:true})
 const shared=await h.cmd('template.save',{id:source.id,version:source.version,name:'Restricted shared search template',shared:true,folderId:folder.id,shareConsent:true})
 result=await h.send('/api/platter/template-search?q='+encodeURIComponent('literal [50%_budget] review'),undefined,member);assert.deepEqual(result.value.rows,[],'team folder search excludes nonmembers')
 const memberId=(await h.state(member)).actor.id;await h.cmd('team.member',{operatorId:memberId,teamId:team.id})
 result=await h.send('/api/platter/template-search?q='+encodeURIComponent('literal [50%_budget] review'),undefined,member);assert.deepEqual(result.value.rows.map(t=>t.id),[shared.id],'live team membership grants exactly the shared template')
 const memberRecord=(await h.state()).teamPeople.find(p=>p.id===memberId);await h.cmd('member.set',{operatorId:memberId,role:'sales',version:memberRecord.version,teams:[]})
 result=await h.send('/api/platter/template-search?q='+encodeURIComponent('literal [50%_budget] review'),undefined,member);assert.deepEqual(result.value.rows,[],'revoked team membership removes search access on the next request')
 assert.equal((await h.send('/api/platter/template-search?q='+encodeURIComponent('x'.repeat(201)),undefined,h.owner)).status,400)
 assert.equal((await h.send('/api/platter/template-search')).status,401)
 for(const filter of ['maxValue=1','minAge=1','owner='+encodeURIComponent(memberId)])assert.deepEqual((await h.send('/api/platter/template-search?q='+encodeURIComponent('literal [50%_budget] review')+'&'+filter,undefined,h.owner)).value.rows,[],'template metadata filters combine with body text')
 const proposalFolder=await h.cmd('folder.save',{kind:'proposal',name:'Search review folder',teams:[team.id],shareConsent:true})
 for(const id of matches){await h.cmd('proposal.share',{id,operatorId:memberId});const row=(await h.state()).proposals.find(p=>p.id===id);await h.cmd('proposal.folder',{id,version:row.version,folderId:proposalFolder.id,shareConsent:true})}
 const folderQuery='/api/platter/pipeline?'+new URLSearchParams({q:'literal [50%_budget] review',folder:proposalFolder.id})
 assert.deepEqual((await h.send(folderQuery,undefined,member)).value.rows,[],'outside-team members find no filed proposal by text or folder')
 assert.ok(!(await h.state(member)).resourceFolders.some(f=>f.id===proposalFolder.id));assert.equal((await h.send('/app/proposal?id='+matches[0],undefined,member)).status,403)
 await h.cmd('team.member',{operatorId:memberId,teamId:team.id});assert.deepEqual(new Set((await h.send(folderQuery,undefined,member)).value.rows.map(p=>p.id)),new Set(matches),'folder access still requires existing proposal permissions and live team membership')
 const currentMember=(await h.state()).teamPeople.find(p=>p.id===memberId);await h.cmd('member.set',{operatorId:memberId,role:'sales',version:currentMember.version,teams:[]});assert.deepEqual((await h.send(folderQuery,undefined,member)).value.rows,[],'revocation immediately removes folder search and detail access')


}))


test('SEND-006 self-test mail uses only the active sign-in address, previews an unsent revision and atomically limits daily rehearsals without sending an offer',()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {client,p}=await draft(h)
 const input={id:p.id,version:1,subject:'Proposal for Northstar',message:'Hi Avery,\nPlease review the photography scope.'}
 const lifecycle=async()=>{
  const state=await h.state(),proposal=state.proposals.find(row=>row.id===p.id)
  const {testMail,...content}=proposal
  return {proposal:content,revisions:state.revisions,followups:state.followups,actions:state.followupActions,
   shares:(await h.db.prepare('SELECT * FROM p_shares').all()).results,
   approvals:(await h.db.prepare('SELECT * FROM p_approvals').all()).results,
   expiry:(await h.db.prepare('SELECT * FROM p_expiry').all()).results}
 }
 const before=await lifecycle()
 await h.send('/api/platter/command',{name:'proposal.test-mail',input},'',{}).then(r=>assert.equal(r.status,401))
 await h.cmd('proposal.test-mail',input,h.owner,403,{origin:'https://foreign.example'})
 const key=await h.cmd('agent.create',{label:'No test-mail authority'})
 assert.equal((await h.send('/api/platter/agent/command',{name:'proposal.test-mail',input},'',{authorization:'Bearer '+key.token})).status,403)
 for(const recipient of ['recipient','to','email','cc','bcc'])await h.cmd('proposal.test-mail',{...input,[recipient]:'someone@else.example'},h.owner,400)
 await h.cmd('proposal.test-mail',{...input,subject:'Bad\nHeader'},h.owner,400)
 await h.cmd('proposal.test-mail',{...input,message:'Hi {client.first_name}'},h.owner,400)
 await h.cmd('proposal.test-mail',{...input,version:0},h.owner,409)
 assert.equal((await h.state()).outbox.length,0)
 const result=await h.cmd('proposal.test-mail',input)
 assert.equal(result.recipient,h.auth.OWNER_EMAIL)
 const mail=(await h.state()).outbox
 assert.equal(mail.length,1);assert.equal(mail[0].recipient,h.auth.OWNER_EMAIL)
 assert.equal(mail[0].subject,'[Test] Proposal for Northstar')
 const preview=h.origin+'/app/preview?'+new URLSearchParams({id:p.id,revision:'1'})
 assert.equal(mail[0].body,input.message+'\n\nPreview this revision (sign-in required):\n'+preview)
 assert.ok(!mail[0].body.includes('/p/'))
 assert.deepEqual(await lifecycle(),before)
 assert.equal((await h.send(preview.slice(h.origin.length))).status,401)
 const view=await h.send(preview.slice(h.origin.length),undefined,h.owner)
 assert.equal(view.status,200);assert.match(view.text,/Preview · Revision 1/)
 const context=await h.send('/app/preview/client?id='+p.id+'&revision=1',undefined,h.owner)
 assert.equal(context.status,200);assert.match(context.text,/Preview only/)
 assert.equal((await h.send('/app/preview/client?id='+p.id+'&revision=1',{name:'accept'},h.owner)).status,403)
 let state=await h.state();assert.equal(state.proposals.find(row=>row.id===p.id).testMail.length,1)
 assert.equal((await h.db.prepare("SELECT COUNT(*) AS n FROM p_audit WHERE action='proposal.view' AND subject=?").bind(p.id).first()).n,0)
 // The tenth slot is shared atomically; concurrent eleventh requests cannot queue mail.
 for(let n=1;n<9;n++)await h.cmd('proposal.test-mail',input)
 const raced=await Promise.all([h.send('/api/platter/command',{name:'proposal.test-mail',input},h.owner),h.send('/api/platter/command',{name:'proposal.test-mail',input},h.owner)])
 assert.deepEqual(raced.map(r=>r.status).sort(),[200,429])
 await h.cmd('proposal.test-mail',input,h.owner,429)
 assert.equal((await h.state()).outbox.length,10)
 // Another member has an independent quota and receives only their own rehearsal.
 await h.send('/auth/invite',{email:'editor@studio.example',displayName:'Editor',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('editor@studio.example')
 await h.cmd('proposal.share',{id:p.id,operatorId:(await h.state(member)).actor.id})
 await h.cmd('proposal.test-mail',input,member)
 const memberState=await h.state(member)
 assert.equal(memberState.proposals.find(row=>row.id===p.id).testMail.length,1)
 const memberMail=(await h.state()).outbox.find(m=>m.recipient==='editor@studio.example')
 assert.equal(memberMail.subject,'[Test] Proposal for Northstar')
 // The quota uses installation calendar days, even across DST, rather than a rolling 24h window.
 await h.db.prepare("INSERT INTO p_installation_settings(singleton,time_zone) VALUES(1,'America/New_York') ON CONFLICT(singleton) DO UPDATE SET time_zone=excluded.time_zone").run()
 const future=Date.parse('2030-03-10T05:00:00Z')
 await h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(future).run()
 for(let n=0;n<10;n++)await h.cmd('proposal.test-mail',input)
 await h.cmd('proposal.test-mail',input,h.owner,429)
 await h.db.prepare('UPDATE p_expiry_clock SET observed_at=? WHERE singleton=1').bind(Date.parse('2030-03-11T03:59:59Z')).run()
 await h.cmd('proposal.test-mail',input,h.owner,429)
 await h.db.prepare('UPDATE p_expiry_clock SET observed_at=? WHERE singleton=1').bind(Date.parse('2030-03-11T04:00:00Z')).run()
 await h.cmd('proposal.test-mail',input)
 // Test mail does not approve or freeze: ordinary approval/send remains mandatory.
 await h.cmd('proposal.send',{id:p.id,version:1},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
 await h.cmd('proposal.test-mail',{...input,version:2})
 const shared=await h.cmd('proposal.send',{id:p.id,version:2}),oldPath=new URL(shared.shareUrl).pathname
 await h.cmd('proposal.test-mail',{...input,version:3},h.owner,409)
 const negotiated=await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:3,scope:'Expanded photography scope'})
 await h.cmd('proposal.test-mail',{...input,version:negotiated.version})
 const pendingMail=(await h.state()).outbox.find(m=>m.subject===input.subject.replace(/^/,'[Test] ')&&m.body.includes('revision=2'))
 assert.ok(pendingMail,'test opens the pending revision, never the still-live client offer')
 assert.equal((await h.send(oldPath)).status,200)
 const proposal=(await h.state()).proposals.find(row=>row.id===p.id)
 assert.equal(proposal.revision,2);assert.equal(proposal.status,'draft');assert.equal(proposal.sentRevision,1)
 const audit=(await h.send('/api/platter/audit?action=proposal.test-mail',undefined,h.owner)).value.rows
 assert.ok(audit.every(row=>row.subject===p.id&&['owner','sales'].includes(row.actor_role)&&row.occurred_at>0))
 assert.ok(!JSON.stringify(audit).includes(input.message))
}))


test('FOLLOW-005 / SEND-010 / FOLLOW-002 verified decline and owner loss close offers, retain reasons and reopen only through fresh approval',async()=>{
 const patches=[],reads=[],crm={timeout:false,revoke:null,pipeline:'synthetic-platter-9901'};let h
 h=await harness({outboundService:async request=>{const url=new URL(request.url);assert.equal(url.hostname,'api.hubapi.com');if(url.pathname==='/account-info/v3/details')return Response.json({portalId:'synthetic-platter-9900'});if(url.pathname==='/crm/v3/pipelines/deals')return Response.json({results:[{id:'synthetic-platter-9901',stages:[{id:'synthetic-platter-9902',metadata:{isClosed:'true',probability:'1.0'}},{id:'synthetic-platter-9903',metadata:{isClosed:'true',probability:'0.0'}},{id:'synthetic-platter-9982',metadata:{isClosed:'true',probability:'1.0'}},{id:'synthetic-platter-9983',metadata:{isClosed:'true',probability:'0.0'}}]}]});const id=url.pathname.split('/').at(-1);if(request.method==='GET'){reads.push(id);if(crm.revoke){const revoke=crm.revoke;crm.revoke=null;await revoke()}return Response.json({id,properties:{pipeline:crm.pipeline}})}assert.equal(request.method,'PATCH');const body=await request.json();patches.push({id,body});if(crm.timeout)throw Error('Synthetic uncertain CRM response');return Response.json({id,properties:body.properties})}})
 try{
 await h.cmd('provider.connect',{provider:'hubspot',version:0,token:'synthetic-platter-9904',consent:true})
 let destination=9910
 const bindingInput=(id,version,bindingVersion=0,extra={})=>({id,version,bindingVersion,dealId:'synthetic-platter-'+destination++,pipelineId:'synthetic-platter-9901',wonStage:'synthetic-platter-9902',lostStage:'synthetic-platter-9903',consent:true,...extra})
 const bind=async(id,version,bindingVersion=0,extra={})=>h.cmd('outcome.crm',bindingInput(id,version,bindingVersion,extra))
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {p,path,client}=await sent(h),cookie=await verified(h,path)
 const current=async id=>(await h.state()).proposals.find(x=>x.id===id)
 await h.send(path+'/action?name=question.create',{revision:1,section:'scope',text:'Could this wait until next quarter?'},cookie)
 await h.cmd('followup.schedule',{id:p.id,action:'Call about budget',dueDate:'2027-03-10'})
 await bind(p.id,3)
 const before=await current(p.id),beforeMail=(await h.state()).outbox.map(m=>m.id)
 const unchanged=async()=>{assert.deepEqual(await current(p.id),before);assert.deepEqual((await h.state()).outbox.map(m=>m.id),beforeMail)}
 for(const [input,session,status,headers] of [
  [{revision:1,reason:'Budget'},'',401,{}],
  [{revision:2,reason:'Budget'},cookie,409,{}],
  [{revision:1,reason:''},cookie,400,{}],
  [{revision:1,reason:'x'.repeat(1001)},cookie,400,{}],
  [{revision:1,reason:'Budget'},cookie,403,{origin:'https://elsewhere.example'}],
 ]){assert.equal((await h.send(path+'/action?name=decline',input,session,headers)).status,status);await unchanged()}
 const declined=await h.send(path+'/action?name=decline',{revision:1,reason:'Budget'},cookie)
 assert.equal(declined.status,410,declined.text);assert.match(declined.text,/Proposal withdrawn/)
 const after=await current(p.id)
 assert.equal(patches.length,1);assert.deepEqual(patches[0].body,{properties:{dealstage:'synthetic-platter-9903'}});assert.equal((await h.state()).crmOutcomes.attempts[0].status,'confirmed')
 assert.equal(after.pipelineStatus,'declined');assert.equal(after.status,'withdrawn');assert.equal(after.outcomes[0].reason,'Budget');assert.equal(after.outcomes[0].actor_role,'client');assert.equal(after.outcomes[0].actor_email,'avery@northstar.example');assert.ok(after.outcomes[0].occurred_at>0)
 assert.deepEqual(after.options,before.options);assert.equal(after.revision,before.revision);assert.equal(after.approved_at,before.approved_at);assert.equal(after.acceptance,undefined);assert.equal(after.invoice,undefined)
 assert.ok(!(await h.send('/api/platter/followups',undefined,h.owner)).value.rows.some(r=>r.id===p.id))
 assert.ok(!(await h.send('/api/platter/questions',undefined,h.owner)).value.questions.some(q=>q.proposal_id===p.id))
 await h.cmd('followup.schedule',{id:p.id,action:'Call again',dueDate:'2027-03-11'},h.owner,409)
 for(const suffix of ['', '/action?name=accept','/action?name=decline','/action?name=code.request','/action?name=question.create','/action?name=expiry.reopen','/download.pdf?optionId=one','/data.json','/payment.json','/payment-status.json','/payment-consent.json','/action?name=payment.refresh','/attachments/any-file']){
  const response=await h.send(path+suffix,(suffix.includes('/action')||suffix.includes('/payment'))?{name:'Avery',optionId:'one',consent:true,reason:'Changed reason',revision:1}:undefined,cookie)
  assert.equal(response.status,410,response.text);assert.ok(!response.text.includes(offer.scope));assert.ok(!response.text.includes('Budget'))
 }
 assert.deepEqual((await current(p.id)).outcomes,after.outcomes,'replay does not replace the reason or add another outcome')
 const audit=(await h.send('/api/platter/audit?action=proposal.decline',undefined,h.owner)).value.rows
 assert.equal(audit.length,1);assert.equal(audit[0].actor_role,'client');assert.equal(audit[0].actor_id,client.id);assert.equal(audit[0].subject,p.id);assert.equal(audit[0].reason,'Budget');assert.equal(audit[0].occurred_at,after.outcomes[0].occurred_at)
 await h.cmd('proposal.send',{id:p.id,version:after.version},h.owner,409)
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:after.version,scope:'A smaller project within the new budget'})
 let pending=await current(p.id)
 assert.equal((await h.send('/app/preview/client/action?name=decline&id='+p.id+'&revision='+pending.revision,{reason:'Preview attempt'},h.owner)).status,403)
 await h.cmd('proposal.send',{id:p.id,version:pending.version},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:pending.version,revision:pending.revision});pending=await current(p.id)
 const newShare=await h.cmd('proposal.send',{id:p.id,version:pending.version}),newPath=new URL(newShare.shareUrl).pathname
 assert.notEqual(newPath,path);assert.equal((await h.send(path,undefined,cookie)).status,410)
 assert.equal((await h.send(newPath+'/action?name=decline',{revision:2,reason:'Budget'},cookie)).status,401,'new revision requires fresh mailbox verification')
 const newCookie=await verified(h,newPath)
 assert.equal((await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},newCookie)).status,200)
 assert.equal((await h.send(newPath+'/action?name=decline',{revision:2,reason:'Too late'},newCookie)).status,409)
 assert.equal((await current(p.id)).pipelineStatus,'accepted');assert.deepEqual((await current(p.id)).outcomes,after.outcomes)
 assert.equal((await h.state()).crmOutcomes.bindings.find(r=>r.proposal_id===p.id).authorized,0,'the new sent revision does not inherit CRM consent');await h.cmd('outcome.crm.sync',{id:p.id});assert.equal(patches.length,1,'a new acceptance cannot replay the prior revision outcome')

 const otherDraft=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Cancelled campaign'});await h.cmd('proposal.approve',{id:otherDraft.id,version:1,revision:1});const otherShare=await h.cmd('proposal.send',{id:otherDraft.id,version:2});const other={p:otherDraft,path:new URL(otherShare.shareUrl).pathname},otherCookie=await verified(h,other.path)
 await h.send('/auth/invite',{email:'outcomes-member@studio.example',displayName:'Sales colleague',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('outcomes-member@studio.example')
 await h.cmd('proposal.lose',{id:other.p.id,version:3,reason:'Cancelled'},member,403)
 await h.cmd('proposal.lose',{id:other.p.id,version:2,reason:'Cancelled'},h.owner,409)
 await h.cmd('proposal.lose',{id:other.p.id,version:3,reason:''},h.owner,400)
 const clock=Date.now()+3600000;await h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?)').bind(clock).run()
 const mailBefore=(await h.state()).outbox.map(m=>m.id)
 await h.cmd('proposal.lose',{id:other.p.id,version:3,reason:'Project cancelled'})
 const lost=await current(other.p.id)
 assert.equal(lost.pipelineStatus,'lost');assert.equal(lost.outcomes[0].kind,'lost');assert.equal(lost.outcomes[0].actor_role,'owner');assert.equal(lost.outcomes[0].reason,'Project cancelled');assert.equal(lost.withdrawals[0].notice,0)
 assert.deepEqual((await h.state()).outbox.map(m=>m.id),mailBefore,'marking lost sends no recipient notice by default')
 assert.ok(!(await h.send('/api/platter/followups',undefined,h.owner)).value.rows.some(r=>r.id===lost.id))
 for(const suffix of ['', '/action?name=accept','/action?name=code.request','/download.pdf?optionId=one','/data.json','/payment.json','/payment-status.json','/payment-consent.json','/action?name=payment.refresh','/attachments/any-file'])assert.equal((await h.send(other.path+suffix,(suffix.includes('/action')||suffix.includes('/payment'))?{name:'Avery',optionId:'one',consent:true}:undefined,otherCookie)).status,410)
 const lostAudit=(await h.send('/api/platter/audit?action=proposal.lose',undefined,h.owner)).value.rows
 assert.equal(lostAudit.length,1);assert.equal(lostAudit[0].actor_id,(await h.state()).actor.id);assert.equal(lostAudit[0].occurred_at,lost.outcomes[0].occurred_at)
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:lost.id,version:lost.version})
 let retry=await current(lost.id);await h.cmd('proposal.approve',{id:retry.id,version:retry.version,revision:retry.revision});retry=await current(lost.id)
 await h.cmd('proposal.send',{id:retry.id,version:retry.version});retry=await current(lost.id)
 await h.cmd('proposal.lose',{id:retry.id,version:retry.version,reason:'Funding withdrawn'})
 const sameTimeAudit=(await h.send('/api/platter/audit?action=proposal.lose&subject='+lost.id,undefined,h.owner)).value.rows
 assert.equal(sameTimeAudit.length,2);assert.ok(sameTimeAudit.every(row=>row.occurred_at===clock));assert.deepEqual(sameTimeAudit.map(row=>row.reason).sort(),['Funding withdrawn','Project cancelled'],'separate outcomes at the same server time retain their own audit reason')
 const accepted=await current(p.id);await h.cmd('proposal.lose',{id:p.id,version:accepted.version,reason:'Too late'},h.owner,409)

 await h.cmd('outcome.settings',{version:0,reasons:['Budget','Timing','Signed outside']},member,403)
 await h.cmd('outcome.settings',{version:0,reasons:['Budget','budget']},h.owner,400)
 await h.cmd('outcome.settings',{version:0,reasons:['Budget','Timing','Signed outside']})
 await h.cmd('outcome.settings',{version:0,reasons:['Changed']},h.owner,409)
 const make=async title=>{const made=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title});await h.cmd('proposal.approve',{id:made.id,version:1,revision:1});return {...made,path:new URL((await h.cmd('proposal.send',{id:made.id,version:2})).shareUrl).pathname}}
 const won=await make('Explicit won override');await h.cmd('followup.schedule',{id:won.id,action:'Call client',dueDate:'2027-03-11'})
 await h.cmd('proposal.win',{id:won.id,version:3,reason:'Signed outside'},member,403)
 await h.cmd('proposal.win',{id:won.id,version:3,reason:'Unconfigured reason'},h.owner,400)
 await h.cmd('outcome.crm',{id:won.id,version:3,bindingVersion:0,dealId:'synthetic-platter-9990',pipelineId:'synthetic-platter-9901',wonStage:'synthetic-platter-9902',lostStage:'synthetic-platter-9903',consent:true},member,403)
 await bind(won.id,3)
 const mailIds=(await h.state()).outbox.map(r=>r.id),beforeWonPatches=patches.length
 await h.cmd('proposal.win',{id:won.id,version:3,reason:'Signed outside'})
 const wonRow=await current(won.id);assert.equal(wonRow.pipelineStatus,'won');assert.equal(wonRow.outcomes[0].reason,'Signed outside');assert.equal(wonRow.outcomes[0].actor_role,'owner');assert.equal(wonRow.acceptance,undefined);assert.equal(wonRow.invoice,undefined)
 assert.deepEqual((await h.state()).outbox.map(r=>r.id),mailIds);assert.equal((await h.send(won.path)).status,410);assert.ok(!(await h.send('/api/platter/followups',undefined,h.owner)).value.rows.some(r=>r.id===won.id));await h.cmd('invoice.export',{id:won.id},h.owner,409)
 assert.equal(patches.length,beforeWonPatches+1);assert.deepEqual(patches.at(-1).body,{properties:{dealstage:'synthetic-platter-9902'}})
 await h.cmd('outcome.crm.sync',{id:won.id});assert.equal(patches.length,beforeWonPatches+1,'confirmed outcome writes are not replayed')
 const wonReport=(await h.send('/api/platter/pipeline?status=won&sort=value',undefined,h.owner)).value;assert.equal(wonReport.count,1);assert.equal(wonReport.totals[0].valueCents,420000)
 const uncertain=await make('Uncertain CRM outcome');await bind(uncertain.id,3);crm.timeout=true
 await h.cmd('proposal.lose',{id:uncertain.id,version:3,reason:'Timing'});crm.timeout=false;const uncertainCount=patches.length
 assert.equal((await h.state()).crmOutcomes.attempts.find(r=>r.proposal_id===uncertain.id).status,'uncertain');await h.cmd('outcome.crm.sync',{id:uncertain.id});assert.equal(patches.length,uncertainCount)
 const revoked=await make('Consent revoked during CRM preflight');await bind(revoked.id,3)
 crm.revoke=()=>h.cmd('outcome.crm',{id:revoked.id,version:4,bindingVersion:1,enabled:false})
 await h.cmd('proposal.lose',{id:revoked.id,version:3,reason:'Budget'})
 assert.equal(patches.length,uncertainCount);assert.equal((await h.state()).crmOutcomes.attempts.find(r=>r.proposal_id===revoked.id).status,'withheld')
 const off=await make('CRM off by default'),offCount=patches.length;await h.cmd('proposal.lose',{id:off.id,version:3,reason:'Budget'});assert.equal(patches.length,offCount)
 const racing=await make('Revocation invalidates in-flight authorization');await bind(racing.id,3)
 const authorizeRace={id:racing.id,version:3,bindingVersion:1,dealId:'synthetic-platter-9991',pipelineId:'synthetic-platter-9901',wonStage:'synthetic-platter-9902',lostStage:'synthetic-platter-9903',consent:true}
 crm.revoke=()=>h.cmd('outcome.crm',{id:racing.id,version:3,bindingVersion:1,enabled:false})
 await h.cmd('outcome.crm',authorizeRace,h.owner,409)
 const revokedBinding=(await h.state()).crmOutcomes.bindings.find(r=>r.proposal_id===racing.id);assert.equal(revokedBinding.version,2);assert.equal(revokedBinding.authorized,0)
 await h.cmd('outcome.crm',authorizeRace,h.owner,409)
 await h.cmd('outcome.crm',{...authorizeRace,bindingVersion:2});const beforeRacing=patches.length
 await h.cmd('proposal.lose',{id:racing.id,version:3,reason:'Budget'});assert.equal(patches.length,beforeRacing+1,'fresh consent after revocation authorizes only the new binding')
 const initialRace=await make('Revocation before initial CRM consent')
 crm.revoke=()=>h.cmd('outcome.crm',{id:initialRace.id,version:3,bindingVersion:0,enabled:false})
 await h.cmd('outcome.crm',{...authorizeRace,id:initialRace.id,bindingVersion:0},h.owner,409)
 assert.ok(!(await h.state()).crmOutcomes.bindings.some(r=>r.proposal_id===initialRace.id),'revoking an initial in-flight request leaves execution off')
 const protectedState=async()=>({state:await h.state(),consents:(await h.db.prepare('SELECT * FROM p_crm_outcome_consents ORDER BY audit_id').all()).results,audit:(await h.send('/api/platter/audit',undefined,h.owner)).value})
 const scoped=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Outcome administrative boundaries'},member);await h.cmd('proposal.approve',{id:scoped.id,version:1,revision:1});await h.cmd('proposal.send',{id:scoped.id,version:2})
 const memberId=(await h.state(member)).actor.id
 await h.cmd('proposal.share',{id:scoped.id,operatorId:memberId})
 for(const role of ['sales','manager','content_editor','viewer','billing']){
  const person=(await h.state()).teamPeople.find(r=>r.id===memberId)
  await h.cmd('member.set',{operatorId:memberId,version:person.version,role,teams:[]})
  const unchanged=await protectedState(),calls=reads.length,writeCount=patches.length
  await h.cmd('outcome.settings',{version:1,reasons:['Changed']},member,403)
  await h.cmd('proposal.win',{id:scoped.id,version:3,reason:'Signed outside'},member,403)
  await h.cmd('outcome.crm',bindingInput(scoped.id,3),member,403)
  await h.cmd('outcome.crm.sync',{id:scoped.id},member,403)
  assert.deepEqual(await protectedState(),unchanged,role+' cannot change reason settings, override won, or grant CRM authority');assert.equal(reads.length,calls);assert.equal(patches.length,writeCount)
 }
 const person=(await h.state()).teamPeople.find(r=>r.id===memberId)
 await h.cmd('member.set',{operatorId:memberId,version:person.version,role:'admin',teams:[]})
 await h.cmd('outcome.settings',{version:1,reasons:['Budget','Timing','Signed outside']},member)
 await h.cmd('proposal.win',{id:scoped.id,version:3,reason:'Signed outside'},member)
 assert.equal((await current(scoped.id)).outcomes[0].actor_role,'admin')
 const noCrm=async(id,baseline)=>{await h.cmd('outcome.crm.sync',{id});assert.equal(patches.length,baseline);assert.ok(!(await h.state()).crmOutcomes.attempts.some(r=>r.proposal_id===id),'unconsented revisions do not claim a remote write')}
 for(const restore of [false,true]){
  const made=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:restore?'Restored consent remains off':'Revised consent remains off'});await bind(made.id,1)
  await h.cmd('proposal.revise',{...offer,clientId:client.id,id:made.id,version:1,scope:'Changed after CRM consent'})
  if(restore)await h.cmd('proposal.restore',{id:made.id,version:2,revision:1})
  let row=await current(made.id);assert.equal((await h.state()).crmOutcomes.bindings.find(r=>r.proposal_id===made.id).authorized,0)
  const baseline=patches.length;await noCrm(made.id,baseline)
  await h.cmd('proposal.approve',{id:row.id,version:row.version,revision:row.revision});row=await current(row.id);await h.cmd('proposal.send',{id:row.id,version:row.version});row=await current(row.id)
  await h.cmd('proposal.lose',{id:row.id,version:row.version,reason:'Budget'});await noCrm(row.id,baseline)
 }
 const source=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Consent stays with its source'});await bind(source.id,1)
 const copied=await h.cmd('proposal.duplicate',{id:source.id,version:1}),copyBaseline=patches.length
 assert.ok(!(await h.state()).crmOutcomes.bindings.some(r=>r.proposal_id===copied.id));await h.cmd('proposal.approve',{id:copied.id,version:1,revision:1});await h.cmd('proposal.send',{id:copied.id,version:2});await h.cmd('proposal.lose',{id:copied.id,version:3,reason:'Budget'});await noCrm(copied.id,copyBaseline)
 const mapped=await make('Exact CRM destination and stage consent');await bind(mapped.id,3)
 const original=(await h.state()).crmOutcomes.bindings.find(r=>r.proposal_id===mapped.id)
 const reconfigure=bindingInput(mapped.id,3,1,{dealId:'synthetic-platter-9992',wonStage:'synthetic-platter-9982',lostStage:'synthetic-platter-9983'})
 const mappingBefore=await protectedState(),calls=reads.length
 await h.cmd('outcome.crm',{...reconfigure,consent:false},h.owner,400);assert.deepEqual(await protectedState(),mappingBefore);assert.equal(reads.length,calls,'changed destination and map require explicit consent before provider reads')
 crm.pipeline='synthetic-platter-9993';await h.cmd('outcome.crm',reconfigure,h.owner,400);crm.pipeline='synthetic-platter-9901';assert.deepEqual(await protectedState(),mappingBefore,'an unverified destination cannot replace the consented mapping')
 await h.cmd('outcome.crm',reconfigure)
 const history=(await h.db.prepare('SELECT s.*,a.actor_id,a.action FROM p_crm_outcome_consents s JOIN p_audit a ON a.id=s.audit_id WHERE s.proposal_id=? ORDER BY s.binding_version').bind(mapped.id).all()).results
 assert.equal(history.length,2);assert.equal(history[0].deal_id,original.deal_id);assert.equal(history[0].revision,1);assert.equal(history[1].deal_id,reconfigure.dealId);assert.equal(history[1].won_stage,reconfigure.wonStage);assert.equal(history[1].lost_stage,reconfigure.lostStage);const author=(await h.state()).actor.id;assert.ok(history.every(r=>r.action==='outcome.crm.authorize'&&r.actor_id===author))
 const mapBaseline=patches.length;await h.cmd('proposal.lose',{id:mapped.id,version:3,reason:'Budget'});assert.equal(patches.length,mapBaseline+1);assert.deepEqual(patches.at(-1),{id:reconfigure.dealId,body:{properties:{dealstage:reconfigure.lostStage}}})
 const moved=await make('Destination moved after consent');await bind(moved.id,3);const movedBaseline=patches.length;crm.pipeline='synthetic-platter-9993';await h.cmd('proposal.lose',{id:moved.id,version:3,reason:'Budget'});crm.pipeline='synthetic-platter-9901';assert.equal(patches.length,movedBaseline);assert.equal((await h.state()).crmOutcomes.attempts.find(r=>r.proposal_id===moved.id).status,'withheld');await h.cmd('outcome.crm.sync',{id:moved.id});assert.equal(patches.length,movedBaseline,'a repaired destination never retries a held write')
 const reconnect=await make('Reconnected provider requires fresh consent');await bind(reconnect.id,3);await h.cmd('provider.connect',{provider:'hubspot',version:1,token:'synthetic-platter-9994',consent:true});assert.equal((await h.state()).crmOutcomes.bindings.find(r=>r.proposal_id===reconnect.id).authorized,0);const reconnectBaseline=patches.length;await h.cmd('proposal.lose',{id:reconnect.id,version:3,reason:'Budget'});await noCrm(reconnect.id,reconnectBaseline)
 assert.ok((await h.send('/api/platter/audit?action=outcome.crm.authorize',undefined,h.owner)).value.rows.some(r=>r.subject===won.id))

 }finally{await h.close()}
})

test('TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP',()=>run(async h=>{
 assert.equal((await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
 const people={owner:{cookie:h.owner,...(await h.state()).actor}},red=await h.cmd('team.create',{name:'Sales East'}),blue=await h.cmd('team.create',{name:'Sales West'})
 for(const role of ['admin','manager','sales','content_editor','viewer','billing','other','billing2']){
  const email=role+'@synthetic-platter.example';assert.equal((await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner)).status,202)
  const cookie=await h.signIn(email),actor=(await h.state(cookie)).actor
  assert.equal(actor.role,'sales','new native members default to scoped sales')
  await h.cmd('member.set',{operatorId:actor.id,version:0,role:role==='other'?'sales':role==='billing2'?'billing':role,teams:[role==='other'?blue.id:red.id]})
  people[role]={cookie,...(await h.state(cookie)).actor}
 }
 await h.cmd('team.member',{operatorId:people.owner.id,teamId:red.id})
 const client=await h.cmd('client.save',{name:'Synthetic client',email:'client@synthetic-platter.example'})
 const prepare=(person='sales',extra={})=>h.cmd('proposal.prepare',{...offer,clientId:client.id,...extra},people[person].cookie)
 const current=async id=>(await h.state()).proposals.find(p=>p.id===id)
 const unchanged=async fn=>{const tables=['p_proposals','p_revisions','p_approvals','p_approval_decisions','p_mail','p_audit','p_collaborators','p_personal_templates','p_agent_keys'];const read=()=>Promise.all(tables.map(t=>h.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all().then(r=>r.results)));const before=await read();await fn();assert.deepEqual(await read(),before,'refusal writes neither business state nor audit/mail')}
 const outside=await prepare('other',{title:'Private west proposal'}),inside=await prepare('sales',{title:'East proposal'})
 assert.equal((await h.send('/app/proposal?id='+outside.id,undefined,people.manager.cookie)).status,403)
 assert.equal((await h.send('/app/proposal?id='+inside.id,undefined,people.manager.cookie)).status,200)
 for(const [role,expected] of [['owner',true],['admin',true],['manager',false],['sales',false],['content_editor',false],['viewer',false],['billing',true]]){
  const s=await h.state(people[role].cookie);assert.equal(s.proposals.some(p=>p.id===outside.id),expected,role+' view scope');assert.equal(s.revisions.some(r=>r.proposal_id===outside.id),expected,role+' revision scope')
  if(!expected)await unchanged(()=>h.cmd('proposal.revise',{...offer,clientId:client.id,id:outside.id,version:1},people[role].cookie,403))
 }
 assert.equal((await h.send('/api/platter/pipeline?q=Private',undefined,people.sales.cookie)).value.count,0)
 await h.cmd('proposal.share',{id:outside.id,operatorId:people.sales.id},people.other.cookie)
 assert.equal((await h.state(people.sales.cookie)).proposals.some(p=>p.id===outside.id),true)
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:outside.id,version:1},people.sales.cookie)
 await h.cmd('proposal.approve',{id:outside.id,version:2,revision:2})
 await h.cmd('proposal.send',{id:outside.id,version:3},people.sales.cookie)
 await h.cmd('proposal.share',{id:outside.id,operatorId:people.sales.id,shared:false},people.other.cookie)
 assert.equal((await h.state(people.sales.cookie)).proposals.some(p=>p.id===outside.id),false)
 // Out-of-team shares widen View/Edit only; every authority and removal is checked through HTTP.
 const sharedOutside=await prepare('other',{title:'Shared west collaborator'})
 const lockedTemplate=await h.cmd('template.save',{id:sharedOutside.id,version:1,name:'West locked',shared:true,shareConsent:true})
 await h.cmd('template.locks',{id:lockedTemplate.id,version:1,sections:['terms']})
 const sharedLocked=await h.cmd('template.start',{id:lockedTemplate.id,version:2,clientId:client.id},people.other.cookie)
 for(const role of ['manager','viewer']){
  await h.cmd('proposal.share',{id:sharedLocked.id,operatorId:people[role].id},people.other.cookie)
  assert.ok((await h.state(people[role].cookie)).proposals.some(p=>p.id===sharedLocked.id))
  assert.ok((await h.send('/api/platter/pipeline?q=Shared%20west',undefined,people[role].cookie)).value.rows.some(p=>p.id===sharedLocked.id))
  assert.equal((await h.send('/app/proposal?id='+sharedLocked.id,undefined,people[role].cookie)).status,200)
 }
 await h.cmd('proposal.revise',{...offer,title:'Shared west collaborator',clientId:client.id,id:sharedLocked.id,version:1},people.manager.cookie)
 const sharedNow=await current(sharedLocked.id)
 for(const name of ['proposal.send','proposal.share','proposal.approve','proposal.unlock'])await unchanged(()=>h.cmd(name,{id:sharedLocked.id,version:sharedNow.version,revision:sharedNow.revision,operatorId:people.sales.id,section:'terms'},people.manager.cookie,403))
 await unchanged(()=>h.cmd('proposal.revise',{...offer,clientId:client.id,id:sharedLocked.id,version:sharedNow.version},people.viewer.cookie,403))
 for(const role of ['manager','viewer']){
  const visible=(await h.state(people[role].cookie)).proposals.find(p=>p.id===sharedLocked.id)
  assert.equal(visible.canSend,false);assert.equal(visible.canApprove,false);assert.equal(visible.canUnlock,false)
  await h.cmd('proposal.share',{id:sharedLocked.id,operatorId:people[role].id,shared:false},people.other.cookie)
  assert.ok(!(await h.state(people[role].cookie)).proposals.some(p=>p.id===sharedLocked.id))
  assert.ok(!(await h.send('/api/platter/pipeline?q=Shared%20west',undefined,people[role].cookie)).value.rows.some(p=>p.id===sharedLocked.id))
  assert.equal((await h.send('/app/proposal?id='+sharedLocked.id,undefined,people[role].cookie)).status,403)
 }
 await unchanged(()=>h.cmd('proposal.revise',{...offer,clientId:client.id,id:sharedLocked.id,version:sharedNow.version},people.manager.cookie,403))
 const library=await h.cmd('library.save',{title:'Synthetic case study',kind:'case_study',content:'An independently reusable case study.'})
 const matrixKey=await h.cmd('agent.create',{label:'Synthetic matrix revocation'})
 // Existing send/edit/template/report/audit/policy/key doors exercise every current role.
 for(const role of ['owner','admin','manager','sales','content_editor','viewer','billing']){
  const person=people[role],made=await prepare('sales',{title:'Matrix '+role});await h.cmd('proposal.share',{id:made.id,operatorId:person.id})
  const canEdit=['owner','admin','manager','sales','content_editor'].includes(role)
  if(canEdit){await h.cmd('proposal.revise',{...offer,clientId:client.id,id:made.id,version:1},person.cookie);await h.cmd('template.save',{id:made.id,version:2,name:'Personal '+role},person.cookie)}
  else await unchanged(()=>h.cmd('proposal.revise',{...offer,clientId:client.id,id:made.id,version:1},person.cookie,403))
  if(!canEdit)await unchanged(()=>h.cmd('template.save',{id:made.id,version:1,name:'Forbidden personal template'},person.cookie,403))
  if(['owner','admin','manager','sales'].includes(role)){await h.cmd('proposal.share',{id:made.id,operatorId:people.other.id},person.cookie);assert.ok((await h.state(people.other.cookie)).proposals.some(p=>p.id===made.id));await h.cmd('proposal.share',{id:made.id,operatorId:people.other.id,shared:false},person.cookie);assert.ok(!(await h.state(people.other.cookie)).proposals.some(p=>p.id===made.id))}
  else await unchanged(()=>h.cmd('proposal.share',{id:made.id,operatorId:people.other.id},person.cookie,403))
  if(['owner','admin'].includes(role))assert.equal((await h.send('/api/platter/audit.csv',undefined,person.cookie)).status,200)
  else await unchanged(async()=>assert.equal((await h.send('/api/platter/audit.csv',undefined,person.cookie)).status,403))
  if(role!=='owner')await unchanged(()=>h.cmd('agent.revoke',{id:matrixKey.id},person.cookie,403))
  let row=await current(made.id)
  if(role!=='owner')await unchanged(()=>h.cmd('proposal.approve',{id:row.id,version:row.version,revision:row.revision},person.cookie,403))
  await h.cmd('proposal.approve',{id:row.id,version:row.version,revision:row.revision});row=await current(made.id)
  if(['owner','admin','manager','sales'].includes(role))await h.cmd('proposal.send',{id:row.id,version:row.version},person.cookie)
  else await unchanged(()=>h.cmd('proposal.send',{id:row.id,version:row.version},person.cookie,403))
  const defaults=(await h.state()).workspaceDefaults
  if(['owner','admin'].includes(role)){await h.cmd('workspace.defaults',{version:defaults.version,reminderDays:[2,5],expiryDays:30,paymentMethods:['card','ach']},person.cookie);assert.deepEqual((await h.state()).workspaceDefaults.reminderDays,[2,5]);const inherited=await prepare('sales',{title:'Workspace defaults '+role});const configured=await current(inherited.id);assert.equal(configured.expiry.mode,'days');assert.equal(configured.expiry.days,30);assert.deepEqual(configured.deliveryDefaults,{remindersEnabled:true,reminderDays:[2,5],beforeExpiryDays:[3],reminderCap:3,paymentMethods:['card','ach']})}
  else{await unchanged(()=>h.cmd('workspace.defaults',{version:defaults.version,reminderDays:[1],expiryDays:1,paymentMethods:[]},person.cookie,403));assert.deepEqual((await h.state()).workspaceDefaults,defaults)}
  const libraryBefore=(await h.db.prepare('SELECT * FROM p_library_items WHERE id=?').bind(library.id).first())
  if(['owner','admin','manager','content_editor'].includes(role))await h.cmd('library.save',{id:library.id,version:libraryBefore.version,title:'Synthetic case study',kind:'case_study',content:'Edited by '+role},person.cookie)
  else{await h.cmd('library.save',{id:library.id,version:libraryBefore.version,title:'Forbidden',kind:'case_study',content:'Not allowed'},person.cookie,403);assert.deepEqual(await h.db.prepare('SELECT * FROM p_library_items WHERE id=?').bind(library.id).first(),libraryBefore)}
  assert.equal((await h.send('/api/platter/audit',undefined,person.cookie)).status,['owner','admin'].includes(role)?200:403)
  assert.equal((await h.send('/api/platter/pipeline',undefined,person.cookie)).status,['owner','admin','manager','sales','viewer'].includes(role)?200:403)
  if(role!=='owner')await h.cmd('agent.create',{label:'synthetic-platter-denied'},person.cookie,403)
 }
 await h.cmd('agent.revoke',{id:matrixKey.id});assert.ok((await h.db.prepare('SELECT revoked_at FROM p_agent_keys WHERE id=?').bind(matrixKey.id).first()).revoked_at)
 const policy=async(required,defaultRole='owner')=>h.cmd('approval.policy',{version:(await h.state()).approvalSettings.policy.version,required,defaultRole})
 const rule=async condition=>h.cmd('approval.rule',{version:(await h.state()).approvalSettings.policy.version,name:'Manager above $25,000',position:0,condition,approvers:['role:manager']})
 await policy(false);await rule({kind:'totalOver',cents:2500000,currency:'USD'})
 const small=await prepare('sales',{priceOne:'2000',priceTwo:'3000'});assert.equal((await h.send('/api/platter/pipeline?nextAction=send',undefined,people.sales.cookie)).value.rows.some(r=>r.id===small.id),true);await h.cmd('proposal.send',{id:small.id,version:1},people.sales.cookie)
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_approvals WHERE proposal_id=?').bind(small.id).first()).n,0)
 const large=await prepare('sales',{priceOne:'28000',priceTwo:'30000'});await h.cmd('proposal.send',{id:large.id,version:1},people.sales.cookie,409)
 await h.cmd('proposal.approve',{id:large.id,version:1,revision:1},people.sales.cookie,403)
 await h.cmd('proposal.approve',{id:large.id,version:1,revision:1},people.manager.cookie)
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:large.id,version:2,priceOne:'29000',priceTwo:'31000'},people.sales.cookie)
 await h.cmd('proposal.send',{id:large.id,version:3},people.sales.cookie,409)
 await h.cmd('proposal.approve',{id:large.id,version:3,revision:2},people.manager.cookie);await h.cmd('proposal.send',{id:large.id,version:4},people.sales.cookie)
 const foreign=await prepare('other',{priceOne:'28000',priceTwo:'30000'});await unchanged(()=>h.cmd('proposal.approve',{id:foreign.id,version:1,revision:1},people.manager.cookie,403))
 const key=await h.cmd('agent.create',{label:'synthetic-platter-agent'})
 const agent=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{...offer,clientId:client.id,priceOne:'2000',priceTwo:'3000'}},'',{authorization:'Bearer '+key.token});assert.equal(agent.status,200)
 await h.cmd('proposal.send',{id:agent.value.id,version:1},h.owner,409);await h.cmd('proposal.approve',{id:agent.value.id,version:1,revision:1},people.manager.cookie)
 const agentRow=await current(agent.value.id);await h.cmd('proposal.send',{id:agentRow.id,version:agentRow.version})
 await h.cmd('approval.policy',{version:(await h.state()).approvalSettings.policy.version,required:true,defaultRole:'owner'},people.sales.cookie,403)
 await policy(true)
 const required=await prepare('sales',{priceOne:'2000',priceTwo:'3000'});await h.cmd('proposal.send',{id:required.id,version:1},people.sales.cookie,409);await h.cmd('proposal.approve',{id:required.id,version:1,revision:1});await h.cmd('proposal.send',{id:required.id,version:2},people.sales.cookie)
 for(const defaultRole of ['manager','admin']){
  await policy(true,defaultRole);const p=await prepare('sales',{priceOne:'2000',priceTwo:'3000'})
  if(defaultRole==='admin')await h.cmd('proposal.approve',{id:p.id,version:1,revision:1},people.manager.cookie,403)
  await h.cmd('proposal.approve',{id:p.id,version:1,revision:1},people[defaultRole].cookie);await h.cmd('proposal.send',{id:p.id,version:2},people.sales.cookie)
 }
 await policy(false)
 const approvalVersion=async()=> (await h.state()).approvalSettings.policy.version
 await h.cmd('approval.rule',{version:await approvalVersion(),name:'Legal review',position:1,condition:{kind:'termsEdited'},approvers:['person:'+people.admin.id,'person:'+people.billing.id]})
 await h.cmd('approval.rule',{version:await approvalVersion(),name:'Invalid sales approver',position:3,condition:{kind:'termsEdited'},approvers:['person:'+people.sales.id]},h.owner,400)
 for(const order of [['admin','billing'],['billing','admin']]){
  const p=await prepare('sales',{terms:'Original terms',priceOne:'28000',priceTwo:'30000'})
  await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:1,terms:'Edited legal terms',priceOne:'28000',priceTwo:'30000'},people.sales.cookie)
  await h.cmd('proposal.approve',{id:p.id,version:2,revision:2},people.admin.cookie,403)
  await h.cmd('proposal.approve',{id:p.id,version:2,revision:2},people.manager.cookie)
  await unchanged(()=>h.cmd('proposal.approve',{id:p.id,version:3,revision:2},people.billing2.cookie,403))
  await h.cmd('proposal.approve',{id:p.id,version:3,revision:2},people[order[0]].cookie)
  assert.equal((await current(p.id)).approval.complete,false)
  await h.cmd('proposal.send',{id:p.id,version:4},people.sales.cookie,409)
  await h.cmd('proposal.approve',{id:p.id,version:4,revision:2},people[order[1]].cookie)
  assert.equal((await current(p.id)).approval.complete,true);await h.cmd('proposal.send',{id:p.id,version:5},people.sales.cookie)
 }
 const raced=await prepare('sales',{terms:'Original'})
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:raced.id,version:1,terms:'New legal terms'},people.sales.cookie)
 const concurrent=await Promise.all(['admin','billing'].map(role=>h.send('/api/platter/command',{name:'proposal.approve',input:{id:raced.id,version:2,revision:2}},people[role].cookie)))
 assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409])
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_approval_decisions WHERE proposal_id=?').bind(raced.id).first()).n,1,'the refused concurrent decision writes nothing')
 const loser=concurrent[0].status===409?'admin':'billing'
 await h.cmd('proposal.approve',{id:raced.id,version:3,revision:2},people[loser].cookie)
 assert.equal((await current(raced.id)).approval.complete,true)
 const reject=await prepare('sales',{terms:'Original'});await h.cmd('proposal.revise',{...offer,clientId:client.id,id:reject.id,version:1,terms:'Legal change'},people.sales.cookie)
 await h.cmd('proposal.reject',{id:reject.id,version:2,revision:2,note:'Review needed'},people.billing.cookie)
 await h.cmd('proposal.approve',{id:reject.id,version:3,revision:2},people.admin.cookie,403)
 await h.cmd('proposal.send',{id:reject.id,version:3},people.sales.cookie,409)
 await policy(false);await h.cmd('proposal.send',{id:reject.id,version:3},people.sales.cookie,409)
 await h.cmd('member.zone',{timeZone:'America/Los_Angeles'},people.sales.cookie)
 assert.equal((await h.state(people.sales.cookie)).followups.timeZone,'America/Los_Angeles')
 // Duplication inherits the live approval policy and never copies approval authority.
 const unruled=await prepare('sales',{priceOne:'2000',priceTwo:'3000'})
 const immediate=await h.cmd('proposal.duplicate',{id:unruled.id,version:1},people.sales.cookie)
 await h.cmd('proposal.send',{id:immediate.id,version:1},people.sales.cookie)
 const immediatePath='/p/'+(await current(immediate.id)).shareToken,immediateCookie=await verified(h,immediatePath)
 assert.equal((await h.send(immediatePath+'/action?name=accept',{name:'Synthetic client',optionId:'one',consent:true},immediateCookie)).status,200,'an unruled sent offer remains signable without inventing an approval')
 assert.equal((await current(immediate.id)).acceptance.revision,1);assert.equal((await current(immediate.id)).approved_by,null)
 await policy(true,'manager')
 const renewed=await h.cmd('proposal.duplicate',{id:unruled.id,version:1},people.sales.cookie)
 await h.cmd('proposal.send',{id:renewed.id,version:1},people.sales.cookie,409)
 await h.cmd('proposal.approve',{id:renewed.id,version:1,revision:1},people.manager.cookie)
 await h.cmd('proposal.send',{id:renewed.id,version:2},people.sales.cookie)
 // Sales negotiation and manager approval keep the earlier live offer frozen.
 const sentCopy=await current(renewed.id),oldLink='/p/'+sentCopy.shareToken
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:renewed.id,version:sentCopy.version,priceOne:'2000',priceTwo:'3000',scope:'Revised by its sales owner'},people.sales.cookie)
 let negotiated=await current(renewed.id)
 assert.equal((await h.send(oldLink)).status,200)
 await h.cmd('proposal.send',{id:renewed.id,version:negotiated.version},people.sales.cookie,409)
 await h.cmd('proposal.approve',{id:renewed.id,version:negotiated.version,revision:negotiated.revision},people.manager.cookie)
 negotiated=await current(renewed.id);await h.cmd('proposal.send',{id:renewed.id,version:negotiated.version},people.sales.cookie)
 assert.equal((await h.send(oldLink)).status,404)
 await policy(false)
 // Agent provenance survives a human revision, and optional maxima cannot evade amount review.
 const agentDraft=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{...offer,clientId:client.id}},'',{authorization:'Bearer '+key.token})
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:agentDraft.value.id,version:1})
 await h.cmd('proposal.send',{id:agentDraft.value.id,version:2},h.owner,409)
 const optional=await prepare('sales',{packages:[{id:'one',label:'Base',price:'2000',optionalItems:[{id:'extra',label:'Optional delivery',unitPrice:'1000',min:1,max:30,quantity:1,editable:true}]}]})
 await h.cmd('proposal.send',{id:optional.id,version:1},people.sales.cookie,409)
 await h.cmd('member.zone',{timeZone:'Asia/Tokyo'},people.other.cookie)
 await h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(Date.parse('2027-03-10T01:00:00Z')).run()
 const pacific=await prepare('sales',{title:'Pacific calendar'}),tokyo=await prepare('other',{title:'Tokyo calendar'})
 const zoneRows=(await h.state()).followups.rows
 for(const [id,date,zone] of [[pacific.id,'2027-03-09','America/Los_Angeles'],[tokyo.id,'2027-03-10','Asia/Tokyo']]){const row=zoneRows.find(r=>r.id===id);assert.equal(row.dueDate,date);assert.equal(row.period,'today');assert.equal(row.timeZone,zone)}
 await h.cmd('member.set',{operatorId:people.sales.id,version:(await h.state()).teamPeople.find(p=>p.id===people.sales.id).version,role:'viewer',teams:[]})
 await unchanged(()=>h.cmd('proposal.revise',{...offer,clientId:client.id,id:pacific.id,version:1},people.sales.cookie,403))
 const audit=(await h.send('/api/platter/audit?action=approval.policy',undefined,h.owner)).value.rows;assert.ok(audit.length>=5);assert.ok(audit.every(r=>r.actor_id===people.owner.id&&r.occurred_at>0))
}))

test('TEAM-001 / PRICE-006 internal line costs round exactly, follow revisions and templates, and stay out of sales/client data and public PDFs',async()=>{
 const h=await harness({assetsDirectory:'public'})
 try{
  const team=await h.cmd('team.create',{name:'Pricing team'}),people={}
  for(const role of ['admin','sales','manager','billing','viewer','content_editor']){
   const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner)
   const cookie=await h.signIn(email),actor=(await h.state(cookie)).actor
   await h.cmd('member.set',{operatorId:actor.id,version:0,role,teams:[team.id]});people[role]={cookie,...actor}
  }
  const client=await h.cmd('client.save',{name:'Synthetic client',email:'client@synthetic-platter.example'})
  const input={clientId:client.id,title:'Private-cost proposal',scope:'Public delivery scope',depositPercent:'25',packages:[{id:'main',label:'Delivery',price:'350'}],pricingTables:[{optionId:'main',name:'Services',lines:[{name:'First line',description:'Public first description',unit:'hour',quantity:'1.5',unitPrice:'100'},{name:'Second line',description:'Public second description',unit:'hour',quantity:'2',unitPrice:'100'}]}]}
  const p=await h.cmd('proposal.prepare',input,people.sales.cookie);await h.cmd('proposal.share',{id:p.id,operatorId:people.content_editor.id});const current=async(cookie=h.owner)=>(await h.state(cookie)).proposals.find(r=>r.id===p.id)
  assert.equal((await current(people.sales.cookie)).internalPricing,undefined)
  let row=await current(people.manager.cookie)
  assert.equal(row.internalPricing.packages[0].marginCents,null,'missing costs are never inferred as zero')
  await h.cmd('pricing.cost',{id:p.id,version:1,lineKey:row.internalPricing.lines[0].key,unitCost:'40.01'},people.manager.cookie)
  row=await current(people.manager.cookie);await h.cmd('pricing.cost',{id:p.id,version:2,lineKey:row.internalPricing.lines[1].key,unitCost:'80'},people.manager.cookie)
  row=await current(people.manager.cookie)
  assert.equal(row.revision,3);assert.equal(row.approved_by,null)
  assert.deepEqual(row.internalPricing.lines.map(l=>[l.costCents,l.marginCents]),[[6002,8998],[16000,4000]])
  assert.deepEqual([row.internalPricing.packages[0].costCents,row.internalPricing.packages[0].marginCents,row.internalPricing.packages[0].marginBps],[22002,12998,3714])
  for(const role of ['admin','manager','billing'])assert.deepEqual((await current(people[role].cookie)).internalPricing,row.internalPricing)
  for(const role of ['sales','viewer','content_editor'])assert.equal((await current(people[role].cookie)).internalPricing,undefined)
  for(const person of [people.sales,people.viewer,people.content_editor,people.billing])await h.cmd('pricing.cost',{id:p.id,version:3,lineKey:row.internalPricing.lines[0].key,unitCost:'0'},person.cookie,403)
  await h.cmd('pricing.cost',{id:p.id,version:3,lineKey:row.internalPricing.lines[0].key,unitCost:'-1'},people.manager.cookie,400)
  await h.cmd('pricing.cost',{id:p.id,version:3,lineKey:row.internalPricing.lines[0].key,unitCost:'NaN'},people.manager.cookie,400)
  const before=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
  for(const role of ['sales','viewer','content_editor'])assert.equal((await h.send(`/api/platter/internal-pricing.pdf?id=${p.id}&revision=3`,undefined,people[role].cookie)).status,403)
  assert.deepEqual((await h.send('/api/platter/audit',undefined,h.owner)).value.rows,before)
  const privateFile=await h.mf.dispatchFetch(h.origin+`/api/platter/internal-pricing.pdf?id=${p.id}&revision=3`,{headers:{cookie:people.manager.cookie}});assert.equal(privateFile.status,200)
  const privateText=(await pdfPages(await privateFile.arrayBuffer())).join(' ');assert.match(privateText,/Internal cost: USD 60.02/);assert.match(privateText,/margin: USD 89.98/)
  const sales=await current(people.sales.cookie);assert.ok(!JSON.stringify(sales).includes('unitCostCents'));assert.ok(!JSON.stringify(sales).includes('marginCents'))
  const template=await h.cmd('template.save',{id:p.id,version:3,name:'Cost-preserving personal template'},people.sales.cookie)
  const started=await h.cmd('template.start',{id:template.id,version:1,clientId:client.id},people.sales.cookie)
  assert.deepEqual((await h.state()).proposals.find(r=>r.id===started.id).internalPricing,row.internalPricing)
  const duplicate=await h.cmd('proposal.duplicate',{id:p.id,version:3},people.sales.cookie)
  assert.deepEqual((await h.state()).proposals.find(r=>r.id===duplicate.id).internalPricing,row.internalPricing)
  await h.cmd('proposal.approve',{id:p.id,version:3,revision:3});await h.cmd('proposal.send',{id:p.id,version:4},people.sales.cookie)
  row=await current();const path='/p/'+row.shareToken,cookie=await verified(h,path)
  const structured=await h.send(path+'/data.json',undefined,cookie);assert.equal(structured.status,200,structured.text);assert.doesNotMatch(structured.text,/unitCostCents|marginCents|internalPricing/);const publicPage=await h.send(path,undefined,cookie);assert.equal(publicPage.status,200);assert.ok(!publicPage.text.includes('Internal cost'));assert.ok(!publicPage.text.includes('unitCostCents'));assert.ok(!publicPage.text.includes('marginCents'))
  const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=main',{headers:{cookie}});assert.equal(pdf.status,200)
  const publicText=(await pdfPages(await pdf.arrayBuffer())).join(' ');assert.ok(!/internal cost|margin/i.test(publicText));assert.match(publicText,/350.00/)
  await h.cmd('proposal.negotiate',{...input,id:p.id,version:5,scope:'A negotiated public scope'},people.sales.cookie)
  row=await current();assert.equal(row.internalPricing.packages[0].costCents,22002)
  await h.cmd('pricing.cost',{id:p.id,version:6,lineKey:row.internalPricing.lines[0].key,unitCost:'50'},people.manager.cookie)
  row=await current();assert.equal(row.internalPricing.lines[0].costCents,7500);assert.equal(row.approved_by,null)
  await h.cmd('proposal.restore',{id:p.id,version:7,revision:3},people.sales.cookie)
  assert.equal((await current()).internalPricing.lines[0].costCents,6002)
  for(const cookie of [h.owner,people.admin.cookie,people.manager.cookie]){row=await current(cookie);await h.cmd('pricing.cost',{id:p.id,version:row.version,lineKey:row.internalPricing.lines[0].key,unitCost:'40.01'},cookie);assert.equal((await current(cookie)).internalPricing.lines[0].costCents,6002)}
  const tiny=await h.cmd('proposal.prepare',{...input,title:'Fractional costs',pricingTables:[{optionId:'main',name:'Rounding',lines:[{name:'Priced line',description:'Positive package revenue',unit:'unit',quantity:'1',unitPrice:'1'},{name:'Fraction',description:'Revenue rounds to zero',unit:'unit',quantity:'0.001',unitPrice:'0.01'}]}]},people.sales.cookie);let fractional=(await h.state()).proposals.find(r=>r.id===tiny.id);const fraction=fractional.internalPricing.lines.find(l=>l.name==='Fraction');await h.cmd('pricing.cost',{id:tiny.id,version:1,lineKey:fraction.key,unitCost:'10'},people.manager.cookie);fractional=(await h.state()).proposals.find(r=>r.id===tiny.id);const zero=fractional.internalPricing.lines.find(l=>l.name==='Fraction');assert.deepEqual([zero.revenueCents,zero.costCents,zero.marginCents,zero.marginBps],[0,1,-1,null])
 }finally{await h.close()}
})

test('TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens',async()=>{
 const calls=[];let mailbox='sales@synthetic-platter.example',providerRefusal=false
 const h=await harness({outboundService:async request=>{const url=new URL(request.url);calls.push({url:url.href,authorization:request.headers.get('authorization')});if(providerRefusal)return new Response(null,{status:302,headers:{location:'https://untrusted.synthetic-platter.example/'}});if(url.hostname==='api.hubapi.com')return Response.json({portalId:'synthetic-platter-4100'});if(url.hostname==='login.salesforce.com')return Response.json({organization_id:'synthetic-platter-4101',user_id:'synthetic-platter-4102'});if(url.hostname==='www.googleapis.com')return Response.json({user:{permissionId:'synthetic-platter-4103',emailAddress:'owner@synthetic-platter.example'}});if(url.hostname==='slack.com')return Response.json({ok:true,team_id:'synthetic-platter-4104'});if(url.hostname==='api.stripe.com')return Response.json({id:'synthetic-platter-2100'});if(url.hostname==='quickbooks.api.intuit.com')return Response.json({CompanyInfo:{CompanyName:'Synthetic company'}});if(url.hostname==='openidconnect.googleapis.com')return Response.json({sub:'synthetic-platter-2101',email:mailbox,email_verified:true});if(url.hostname==='graph.microsoft.com')return Response.json({id:'synthetic-platter-2102',mail:mailbox});throw Error('Unexpected provider') }})
 try{
  const people={};for(const role of ['admin','manager','sales','content_editor','viewer','billing']){const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id;await h.cmd('member.set',{operatorId:id,version:0,role,teams:[]});people[role]={cookie,id,email}}
  const connect={provider:'quickbooks',version:0,realmId:'synthetic-platter-2103',token:'synthetic-platter-2104',consent:true}
  for(const role of ['manager','sales','content_editor','viewer','billing']){await h.cmd('provider.connect',connect,people[role].cookie,403);assert.equal(calls.length,0)}
  await h.cmd('provider.connect',connect,people.admin.cookie);assert.equal(calls.length,1);assert.equal((await h.state()).connections[0].accountId,connect.realmId)
  const stored=await h.db.prepare('SELECT sealed FROM p_connection_secrets').first();assert.ok(stored.sealed);assert.equal(stored.sealed.includes(connect.token),false)
  for(const role of ['manager','sales','content_editor','viewer','billing'])assert.deepEqual((await h.state(people[role].cookie)).connections,[])
  const before=JSON.stringify((await h.db.prepare('SELECT * FROM p_connections').all()).results)
  await h.cmd('provider.disconnect',{provider:'quickbooks',version:1},people.sales.cookie,403);assert.equal(JSON.stringify((await h.db.prepare('SELECT * FROM p_connections').all()).results),before);assert.equal(calls.length,1)
  await h.cmd('provider.disconnect',{provider:'quickbooks',version:1},people.admin.cookie);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_connection_secrets').first()).n,0);assert.equal((await h.state()).connections[0].status,'disconnected')
  for(const role of ['owner','admin','manager','sales','billing']){mailbox=role==='owner'?h.auth.OWNER_EMAIL:people[role].email;await h.cmd('provider.connect',{provider:'gmail',version:0,token:'synthetic-platter-2105',consent:true},role==='owner'?h.owner:people[role].cookie)}
  for(const role of ['content_editor','viewer'])await h.cmd('provider.connect',{provider:'gmail',version:0,token:'synthetic-platter-2105',consent:true},people[role].cookie,403)
  const total=calls.length;await h.cmd('provider.disconnect',{provider:'gmail',id:'mailbox:gmail:'+people.sales.id,version:1},people.manager.cookie,403);assert.equal(calls.length,total)
  mailbox=people.sales.email;await h.cmd('provider.connect',{provider:'microsoft',version:0,token:'synthetic-platter-2106',consent:true},people.manager.cookie,403)
  assert.equal((await h.db.prepare("SELECT count(*) AS n FROM p_connections WHERE provider='microsoft'").first()).n,0)
  await h.cmd('provider.connect',{provider:'stripe',version:0,token:'synthetic-platter-2107',webhookSecret:'synthetic-platter-2108',consent:true})
  for(const provider of ['hubspot','salesforce','google_drive','slack']){
   const input={provider,version:0,token:'synthetic-platter-4105',consent:true},before=calls.length
   for(const role of ['manager','sales','content_editor','viewer','billing'])await h.cmd('provider.connect',input,people[role].cookie,403)
   assert.equal(calls.length,before);await h.cmd('provider.connect',input,people.admin.cookie);const snapshot=JSON.stringify((await h.db.prepare('SELECT * FROM p_connections WHERE id=?').bind('workspace:'+provider).first()))
   for(const role of ['manager','sales','content_editor','viewer','billing'])await h.cmd('provider.disconnect',{provider,version:1},people[role].cookie,403)
   assert.equal(JSON.stringify(await h.db.prepare('SELECT * FROM p_connections WHERE id=?').bind('workspace:'+provider).first()),snapshot)
   await h.cmd('provider.disconnect',{provider,version:1},people.admin.cookie);await h.cmd('provider.connect',{...input,version:2},h.owner);await h.cmd('provider.disconnect',{provider,version:3},h.owner)
   assert.equal(await h.db.prepare('SELECT connection_id FROM p_connection_secrets WHERE connection_id=?').bind('workspace:'+provider).first(),null)
  }
  for(const role of ['owner','admin','manager','sales','billing']){mailbox=role==='owner'?h.auth.OWNER_EMAIL:people[role].email;const cookie=role==='owner'?h.owner:people[role].cookie;await h.cmd('provider.connect',{provider:'microsoft',version:0,token:'synthetic-platter-4130',consent:true},cookie);const id='mailbox:microsoft:'+(role==='owner'?(await h.state()).actor.id:people[role].id);assert.equal((await h.state(cookie)).connections.find(c=>c.id===id).mailboxEmail,mailbox);await h.cmd('provider.disconnect',{provider:'microsoft',version:1},cookie);assert.equal((await h.state(cookie)).connections.find(c=>c.id===id).status,'disconnected')}
  for(const role of ['content_editor','viewer']){const before=calls.length;await h.cmd('provider.connect',{provider:'microsoft',version:0,token:'synthetic-platter-4130',consent:true},people[role].cookie,403);assert.equal(calls.length,before)}
  const rows=async()=>JSON.stringify((await h.db.prepare('SELECT * FROM p_connections ORDER BY id').all()).results),saved=await rows(),callsBeforeRefusal=calls.length;providerRefusal=true
  await h.cmd('provider.connect',{provider:'stripe',version:1,token:'synthetic-platter-4131',webhookSecret:'synthetic-platter-4132',consent:true},h.owner,400);assert.equal(calls.length,callsBeforeRefusal+1);assert.equal(await rows(),saved,'a refused provider check cannot replace a working account or follow a redirect')
  await h.cmd('provider.connect',{provider:'hubspot',version:4,token:'synthetic-platter-4131',consent:false},h.owner,400);assert.equal(calls.length,callsBeforeRefusal+1);assert.equal(await rows(),saved,'connection consent is checked before any provider call')
  const audit=await h.send('/api/platter/audit',undefined,h.owner);assert.equal(audit.status,200);assert.doesNotMatch(audit.text,/synthetic-platter-(210[45678]|4105|413[012])/)
  for(const cookie of [h.owner,...Object.values(people).map(p=>p.cookie)]){const s=await h.state(cookie);assert.doesNotMatch(JSON.stringify(s),/synthetic-platter-210[45678]|synthetic-platter-4105|sealed|webhookSecret/);const page=await h.send(cookie===h.owner?'/app/settings':'/app/team',undefined,cookie);assert.doesNotMatch(page.text,/synthetic-platter-210[45678]/)}
 }finally{await h.close()}
})

test('TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund',async()=>{
 const calls=[];let accepted,refunded=0,uncertain=false
 const h=await harness({outboundService:async request=>{const url=new URL(request.url);assert.equal(url.hostname,'api.stripe.com');calls.push({path:url.pathname,method:request.method});if(url.pathname==='/v1/account')return Response.json({id:'synthetic-platter-2400'});if(url.pathname==='/v1/charges/synthetic-platter-2401')return Response.json({id:'synthetic-platter-2401',paid:true,status:'succeeded',amount:accepted.deposit_cents,amount_refunded:refunded,currency:accepted.currency.toLowerCase(),metadata:{platter_proposal_id:accepted.proposal_id,platter_revision:String(accepted.revision)}});assert.equal(url.pathname,'/v1/refunds');assert.equal(request.method,'POST');assert.match(request.headers.get('idempotency-key'),/^platter-refund-/);const body=new URLSearchParams(await request.text());assert.equal(body.get('charge'),'synthetic-platter-2401');if(uncertain)return new Response(null,{status:503});const amount=Number(body.get('amount'));refunded+=amount;assert.ok(refunded<=accepted.deposit_cents);return Response.json({id:'synthetic-platter-'+(2500+calls.length),charge:'synthetic-platter-2401',amount,status:'succeeded'})}})
 try{
  const people={};for(const role of ['admin','manager','sales','content_editor','viewer','billing']){const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id;await h.cmd('member.set',{operatorId:id,version:0,role,teams:[]});people[role]=cookie}
  const {p,path}=await sent(h),cookie=await verified(h,path);assert.equal((await h.send(path+'/action?name=accept',{name:'Synthetic client',optionId:'one',consent:true},cookie)).status,200);accepted=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
  await h.cmd('provider.connect',{provider:'stripe',version:0,token:'synthetic-platter-2402',webhookSecret:'synthetic-platter-2403',consent:true})
  for(const role of ['manager','sales','content_editor','viewer']){await h.cmd('payment.bind',{id:p.id,chargeId:'synthetic-platter-2401',consent:true},people[role],403);await h.cmd('payment.record',{id:p.id,amount:'1',receivedOn:'2026-10-21',method:'wire',reference:'Synthetic reference',consent:true},people[role],403)}
  assert.equal(calls.length,1);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_payment_records').first()).n,0)
  const linked=await h.cmd('payment.bind',{id:p.id,chargeId:'synthetic-platter-2401',consent:true},people.billing)
  const before=calls.length;await h.cmd('payment.refund',{paymentId:linked.id,amount:'100',requestId:'synthetic-platter-2404',reason:'Synthetic partial refund',consent:true},people.sales,403);assert.equal(calls.length,before);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_refunds').first()).n,0)
  const refund={paymentId:linked.id,amount:'100',requestId:'synthetic-platter-2404',reason:'Synthetic partial refund',consent:true};assert.equal((await h.cmd('payment.refund',refund,people.billing)).status,'succeeded');const after=calls.length;assert.equal((await h.cmd('payment.refund',refund,people.billing)).status,'succeeded');assert.equal(calls.length,after);assert.equal(refunded,10000)
  await h.cmd('payment.refund',{...refund,amount:'101'},people.billing,409);assert.equal(calls.length,after)
  const attempts=await Promise.all(['synthetic-platter-2405','synthetic-platter-2406'].map(requestId=>h.send('/api/platter/command',{name:'payment.refund',input:{...refund,amount:'300',requestId}},people.billing)))
  assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);assert.equal(refunded,40000)
  uncertain=true;const pending={...refund,amount:'50',requestId:'synthetic-platter-2407'};assert.equal((await h.cmd('payment.refund',pending,people.billing)).status,'needs_review');const pendingCalls=calls.length;assert.equal((await h.cmd('payment.refund',pending,people.billing)).status,'needs_review');assert.equal(calls.length,pendingCalls)
  await h.cmd('payment.refund',{...refund,amount:'200',requestId:'synthetic-platter-2408'},people.billing,409);assert.equal(calls.filter(c=>c.method==='POST').length,3)
  for(const [index,method] of ['check','wire','ach_credit'].entries())await h.cmd('payment.record',{id:p.id,amount:'1',receivedOn:'2026-10-21',method,reference:'synthetic-platter-'+(2600+index),consent:true},people.billing)
  const records=(await h.state(people.billing)).paymentRecords;assert.equal(records.length,4);assert.equal(records.find(r=>r.id===linked.id).heldCents,45000);assert.deepEqual((await h.state(people.sales)).paymentRecords,[])
  assert.equal((await h.state()).proposals.find(r=>r.id===p.id).acceptance.depositCents,60000,'refunds never rewrite the accepted deposit')
  // Recorded revenue is a pipeline view, so CSV and scheduled email retain the same rows, scope and exact money.
  const team=await h.cmd('team.create',{name:'Revenue team'})
  for(const role of ['sales','manager','viewer'])await h.cmd('member.set',{operatorId:(await h.state(people[role])).actor.id,version:1,role,teams:[team.id]})
  const client=await h.cmd('client.save',{name:'Synthetic second client',email:'revenue-client@synthetic-platter.example'}),second=await h.cmd('proposal.prepare',{...offer,title:'Sales owned revenue',clientId:client.id},people.sales)
  await h.cmd('proposal.approve',{id:second.id,version:1,revision:1});const secondSend=await h.cmd('proposal.send',{id:second.id,version:2},people.sales),secondPath=new URL(secondSend.shareUrl).pathname,secondCookie=await verified(h,secondPath)
  assert.equal((await h.send(secondPath+'/action?name=accept',{name:'Synthetic client',optionId:'one',consent:true},secondCookie)).status,200)
  await h.cmd('payment.record',{id:second.id,amount:'7',receivedOn:'2026-10-21',method:'check',reference:'synthetic-platter-4200',consent:true},people.billing);await h.cmd('invoice.export',{id:p.id})
  const query='view=recorded-revenue&sort=value&direction=desc',totals={currency:'USD',count:2,valueCents:480000,oneOffCents:480000,firstYearCents:480000,receivedCents:61000,refundedCents:40000,netReceivedCents:21000,uncertainRefundCents:5000,exportedDepositCents:60000}
  for(const [role,cookie] of Object.entries({owner:h.owner,...people})){
   const report=await h.send('/api/platter/pipeline?'+query,undefined,cookie)
   if(role==='content_editor'){assert.equal(report.status,403);assert.equal((await h.send('/app?'+query,undefined,cookie)).status,403);assert.ok((await h.state(cookie)).proposals.every(p=>!Object.hasOwn(p,'recordedRevenue')));continue}
   assert.equal(report.status,200,report.text);assert.equal(report.value.view,'recorded-revenue');assert.equal(report.value.count,['owner','admin','billing'].includes(role)?2:1)
   if(['owner','admin','billing'].includes(role))assert.deepEqual(report.value.totals,[totals]);else{assert.deepEqual(report.value.rows.map(r=>r.id),[second.id]);assert.equal(report.value.totals[0].netReceivedCents,700)}
   assert.doesNotMatch(report.text,/provider_charge|reference|recorded_by|internalPricing|synthetic-platter-2401/)
  }
  const csv=await h.send('/api/platter/pipeline.csv?'+query,undefined,h.owner);assert.equal(csv.status,200);assert.match(csv.text,/Received payments,Confirmed refunds,Net received,Unconfirmed refunds,Exported deposit CSV value/);assert.match(csv.text,/Total \(2 proposals\),,,,,USD,4800\.00,,,,4800\.00,4800\.00,610\.00,400\.00,210\.00,50\.00,600\.00/)
  const scheduled=await h.cmd('report.schedule',{filters:query,cadence:'daily',hour:8,recipients:[h.auth.OWNER_EMAIL]});const due=(await h.state()).reportSchedules.find(r=>r.id===scheduled.id).nextRunAt,worker=await h.mf.getWorker();await worker.scheduled({scheduledTime:new Date(due),cron:'*/15 * * * *'});await worker.scheduled({scheduledTime:new Date(due),cron:'*/15 * * * *'})
  const email=(await h.state()).reportOutbox;assert.equal(email.length,1);assert.match(email[0].subject,/recorded revenue/);const asOfRun=await h.send('/api/platter/pipeline.csv?'+query,undefined,h.owner);assert.equal(asOfRun.status,200);assert.ok(email[0].body.includes(asOfRun.text),'scheduled CSV equals the same filtered rows as of the run time');assert.match(email[0].body,/Net received: \$210\.00 USD/);assert.match(email[0].body,/Unconfirmed refunds: \$50\.00 USD/)

  const undated=new URLSearchParams({view:'recorded-revenue',q:offer.title,bookedFrom:'2099-01-01',bookedTo:'2099-12-31',receivedFrom:'2000-01-01',receivedTo:'2100-12-31'})
  const datedOnly=await h.send('/api/platter/pipeline?'+undated,undefined,h.owner);assert.equal(datedOnly.status,200);assert.equal(datedOnly.value.totals[0].receivedCents,300,'A linked Stripe receipt has no recorded receipt date and cannot be placed in a collection period');assert.equal(datedOnly.value.totals[0].refundedCents,0)
  const ownerId=(await h.state()).actor.id
  const first=await acceptRevenue(h,{clientId:client.id}),later=await acceptRevenue(h,{clientId:client.id,term:24,date:'2099-04-01',title:'Two-year care'})
  const other=await acceptRevenue(h,{clientId:client.id,cookie:people.sales,title:'Sales care'}),aud=await acceptRevenue(h,{clientId:client.id,currency:'AUD',title:'Historical AUD care'})
  for(const [id,amount,receivedOn] of [[first.id,'2500','2099-03-31'],[first.id,'1200','2099-04-01'],[later.id,'2400','2099-06-30'],[other.id,'900','2099-04-01'],[aud.id,'700','2099-04-01']])await h.cmd('payment.record',{id,amount,receivedOn,method:'wire',reference:'synthetic-platter-4300',consent:true},people.billing)
  const filters=new URLSearchParams({view:'recorded-revenue',currency:'USD',owner:ownerId,bookedFrom:'2099-01-15',bookedTo:'2099-03-31',receivedFrom:'2099-04-01',receivedTo:'2099-06-30',sort:'value',direction:'desc'}).toString()
  const read=async query=>{const r=await h.send('/api/platter/pipeline?'+query,undefined,h.owner);assert.equal(r.status,200,r.text);return r.value}
  const native=await read(filters)
  assert.deepEqual(native.rows.map(r=>r.id),[first.id,later.id])
  assert.deepEqual(native.totals,[{currency:'USD',count:2,valueCents:1690000,oneOffCents:250000,firstYearCents:1690000,receivedCents:360000,refundedCents:0,netReceivedCents:360000,uncertainRefundCents:0,exportedDepositCents:0}])
  assert.equal(native.rows[0].bookedOn,'2099-01-15')
  assert.deepEqual(native.rows.map(r=>[r.recordedRevenue.oneOffCents,r.recordedRevenue.firstYearCents,r.recordedRevenue.receivedCents]),[[250000,1690000,120000],[0,0,240000]])
  const reverse=new URLSearchParams(filters);reverse.set('bookedFrom','2099-04-01');reverse.set('bookedTo','2099-06-30');reverse.set('receivedFrom','2099-01-01');reverse.set('receivedTo','2099-03-31')
  const secondQuarter=await read(reverse)
  assert.deepEqual(secondQuarter.totals,[{currency:'USD',count:2,valueCents:3130000,oneOffCents:250000,firstYearCents:1690000,receivedCents:250000,refundedCents:0,netReceivedCents:250000,uncertainRefundCents:0,exportedDepositCents:0}])
  const sameDay=new URLSearchParams(filters);sameDay.set('bookedTo','2099-01-15');sameDay.set('receivedFrom','2099-03-31');sameDay.set('receivedTo','2099-03-31')
  assert.deepEqual((await read(sameDay)).rows.map(r=>[r.id,r.recordedRevenue.receivedCents]),[[first.id,250000]],'Both date endpoints are inclusive')
  const foreign=new URLSearchParams(filters);foreign.set('currency','AUD');assert.deepEqual((await read(foreign)).totals,[{currency:'AUD',count:1,valueCents:1690000,oneOffCents:250000,firstYearCents:1690000,receivedCents:70000,refundedCents:0,netReceivedCents:70000,uncertainRefundCents:0,exportedDepositCents:0}])
  for(const cookie of [people.sales,people.manager,people.viewer])assert.equal((await h.send('/api/platter/pipeline?'+filters,undefined,cookie)).value.count,0,'Owner filter cannot widen live revenue scope')
  const frozen=(await h.state()).proposals.find(p=>p.id===first.id).acceptance
  await h.cmd('proposal.revise',{...first.input,id:first.id,version:4},h.owner,409)
  assert.equal((await h.send(first.path+'/action?name=accept',{name:'Changed',optionId:'two',consent:true},first.cookie)).status,200)
  assert.deepEqual((await h.state()).proposals.find(p=>p.id===first.id).acceptance,frozen)
  assert.deepEqual((await read(filters)).totals,native.totals,'Retries and refused repricing cannot change booked snapshots')
  for(const bad of ['bookedFrom=2099-02-30','bookedFrom=2099-04-01&bookedTo=2099-01-01','receivedFrom=2099-07-01&receivedTo=2099-04-01','currency=usd']){
   assert.equal((await h.send('/api/platter/pipeline?view=recorded-revenue&'+bad,undefined,h.owner)).status,400)
   const before=(await h.state()).reportSchedules;await h.cmd('report.schedule',{filters:'view=recorded-revenue&'+bad,cadence:'daily',hour:8,recipients:[h.auth.OWNER_EMAIL]},h.owner,400);assert.deepEqual((await h.state()).reportSchedules,before)
  }
  const filteredCsv=await h.send('/api/platter/pipeline.csv?'+filters,undefined,h.owner)
  assert.equal(filteredCsv.status,200);assert.match(filteredCsv.text,/Accepted on \(UTC\),Booked one-off value,Booked first-year value/)
  assert.match(filteredCsv.text,/Total \(2 proposals\),,,,,USD,16900\.00,,,,2500\.00,16900\.00,3600\.00,0\.00,3600\.00/)
  const scheduledNative=await h.cmd('report.schedule',{filters,cadence:'daily',hour:8,recipients:[h.auth.OWNER_EMAIL]})
  const saved=(await h.state()).reportSchedules.find(r=>r.id===scheduledNative.id);assert.deepEqual(Object.fromEntries(new URLSearchParams(saved.filters)),Object.fromEntries(new URLSearchParams(filters)))
  await worker.scheduled({scheduledTime:new Date(saved.nextRunAt),cron:'*/15 * * * *'});await worker.scheduled({scheduledTime:new Date(saved.nextRunAt),cron:'*/15 * * * *'})
  const nativeMail=(await h.state()).reportOutbox.filter(m=>m.body.includes('Booked first-year value: $16,900.00 USD'))
  assert.equal(nativeMail.length,1);assert.ok(nativeMail[0].body.includes((await h.send('/api/platter/pipeline.csv?'+filters,undefined,h.owner)).text));assert.match(nativeMail[0].body,/Received payments: \$3,600\.00 USD/)


 }finally{await h.close()}
})

test('TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content',()=>run(async h=>{
 const east=await h.cmd('team.create',{name:'East'}),west=await h.cmd('team.create',{name:'West'}),people={}
 for(const role of ['admin','manager','sales','content_editor','viewer','billing','other']){const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id;await h.cmd('member.set',{operatorId:id,version:0,role:role==='other'?'sales':role,teams:[role==='other'?west.id:east.id]});people[role]={cookie,id}}
 const folder=await h.cmd('folder.save',{kind:'template',name:'East templates',teams:[east.id],shareConsent:true},people.manager.cookie),library=await h.cmd('folder.save',{kind:'library',name:'East library',teams:[east.id],shareConsent:true},people.content_editor.cookie)
 for(const role of ['sales','viewer','billing'])await h.cmd('folder.save',{kind:'template',name:'Forbidden',teams:[],shareConsent:true},people[role].cookie,403)
 await h.cmd('folder.save',{kind:'template',name:'Other team',teams:[west.id],shareConsent:true},people.manager.cookie,403)
 const client=await h.cmd('client.save',{name:'Synthetic client',email:'client@synthetic-platter.example'}),source=await h.cmd('proposal.prepare',{...offer,clientId:client.id},people.content_editor.cookie)
 const shared=await h.cmd('template.save',{id:source.id,version:1,name:'Shared East',shared:true,shareConsent:true,folderId:folder.id},people.content_editor.cookie)
 const item=await h.cmd('library.save',{title:'East bio',kind:'bio',content:'Team-only text',folderId:library.id},people.content_editor.cookie)
 for(const role of ['sales','viewer','billing'])await h.cmd('template.save',{id:source.id,version:1,name:'Forbidden',shared:true,shareConsent:true},people[role].cookie,403)
 for(const role of ['owner','admin','manager','sales','content_editor']){const cookie=role==='owner'?h.owner:people[role].cookie,s=await h.state(cookie);assert.ok(s.templates.some(t=>t.id===shared.id));assert.ok(s.libraryItems.some(t=>t.id===item.id));const copy=await h.cmd('template.start',{id:shared.id,version:1,clientId:client.id},cookie);assert.equal((await h.state(cookie)).proposals.find(p=>p.id===copy.id).approved_by,null)}
 const outsider=await h.state(people.other.cookie);assert.equal(outsider.templates.some(t=>t.id===shared.id),false);assert.equal(outsider.libraryItems.some(t=>t.id===item.id),false);assert.equal(outsider.resourceFolders.some(f=>f.id===folder.id),false)
 await h.cmd('template.start',{id:shared.id,version:1,clientId:client.id},people.other.cookie,403);await h.cmd('library.save',{id:item.id,version:1,title:'Stolen',kind:'bio',content:'No',folderId:null},people.other.cookie,403)
 await h.cmd('member.set',{operatorId:people.content_editor.id,version:1,role:'content_editor',teams:[west.id]})
 assert.equal((await h.state(people.content_editor.cookie)).templates.some(t=>t.id===shared.id),false)
 await h.cmd('template.save',{id:source.id,version:1,templateId:shared.id,templateVersion:1,name:'Stolen',shared:true,folderId:null},people.content_editor.cookie,403)
 await h.cmd('library.save',{id:item.id,version:1,title:'Stolen',kind:'bio',content:'No',folderId:null},people.content_editor.cookie,403)
 await h.cmd('template.save',{id:source.id,version:1,templateId:shared.id,templateVersion:1,name:'Updated shared'},h.owner);const current=(await h.state()).templates.find(t=>t.id===shared.id);assert.equal(current.shared,1);assert.equal(current.folder_id,folder.id)
 const oldCopy=(await h.state(people.sales.cookie)).proposals[0];assert.equal(oldCopy.title,offer.title,'replacing the shared template cannot mutate an existing draft')
 const rows=(await h.db.prepare('SELECT * FROM p_personal_templates').all()).results;assert.equal(rows.length,1);assert.equal((await h.db.prepare('SELECT content FROM p_library_items WHERE id=?').bind(item.id).first()).content,'Team-only text')
 // Widening moves need explicit consent, preserve every row on refusal, and expose only the selected audience.
 const westLibrary=await h.cmd('folder.save',{kind:'library',name:'West library',teams:[west.id],shareConsent:true})
 const westTemplates=await h.cmd('folder.save',{kind:'template',name:'West templates',teams:[west.id],shareConsent:true})
 const readResources=async()=>Promise.all(['p_library_items','p_personal_templates','p_resource_folders','p_folder_teams','p_audit'].map(t=>h.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all().then(r=>r.results)))
 for(const target of [null,westLibrary.id]){
  const before=await readResources(),row=await h.db.prepare('SELECT * FROM p_library_items WHERE id=?').bind(item.id).first(),move={id:item.id,version:row.version,title:'East bio',kind:'bio',content:'Team-only text',folderId:target}
  await h.cmd('library.save',move,h.owner,400);assert.deepEqual(await readResources(),before)
  await h.cmd('library.save',{...move,shareConsent:true})
  assert.ok((await h.state(people.other.cookie)).libraryItems.some(r=>r.id===item.id))
  assert.equal((await h.state(people.sales.cookie)).libraryItems.some(r=>r.id===item.id),target===null)
  await audited(h,'library.save',(await h.state()).actor.id,'owner',item.id)
  const moved=await h.db.prepare('SELECT * FROM p_library_items WHERE id=?').bind(item.id).first()
  await h.cmd('library.save',{...move,version:moved.version,folderId:library.id,shareConsent:true})
 }
 for(const target of [null,westTemplates.id]){
  const row=(await h.state()).templates.find(t=>t.id===shared.id),move={id:source.id,version:1,templateId:shared.id,templateVersion:row.version,name:row.name,folderId:target}
  const before=await readResources();await h.cmd('template.save',move,h.owner,400);assert.deepEqual(await readResources(),before)
  await h.cmd('template.save',{...move,shareConsent:true})
  assert.ok((await h.state(people.other.cookie)).templates.some(r=>r.id===shared.id))
  assert.equal((await h.state(people.sales.cookie)).templates.some(r=>r.id===shared.id),target===null)
  await audited(h,'template.save',(await h.state()).actor.id,'owner',shared.id)
  await h.cmd('template.save',{...move,templateVersion:row.version+1,folderId:folder.id,shareConsent:true})
 }
 const folderBefore=await readResources()
 await h.cmd('folder.save',{id:library.id,version:1,name:'Shared library',teams:[]},h.owner,400);assert.deepEqual(await readResources(),folderBefore)
 await h.cmd('folder.save',{id:library.id,version:1,name:'Shared library',teams:[],shareConsent:true})
 assert.ok((await h.state(people.other.cookie)).libraryItems.some(r=>r.id===item.id))
 await audited(h,'folder.save',(await h.state()).actor.id,'owner',library.id)
 await audited(h,'folder.save',people.manager.id,'manager',folder.id);await audited(h,'library.save',people.content_editor.id,'content_editor',item.id);await audited(h,'template.save',people.content_editor.id,'content_editor',shared.id)
}))

test('TEAM-001 / EDIT-015 template locks survive starts, copies and personal templates; proposal unlocks require scope and edited terms require approval',()=>run(async h=>{
 const team=await h.cmd('team.create',{name:'East'}),people={}
 for(const role of ['admin','manager','sales','content_editor','viewer','billing','other']){const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id;await h.cmd('member.set',{operatorId:id,version:0,role:role==='other'?'manager':role,teams:role==='other'?[]:[team.id]});people[role]={cookie,id}}
 const client=await h.cmd('client.save',{name:'Synthetic client',email:'client@synthetic-platter.example'}),source=await h.cmd('proposal.prepare',{...offer,clientId:client.id,terms:'Payment within 14 days.',document:documentFixture()})
 const saved=await h.cmd('template.save',{id:source.id,version:1,name:'Locked legal',shared:true,shareConsent:true})
 await h.cmd('approval.policy',{version:0,required:false,defaultRole:'owner'})
 await h.cmd('approval.rule',{version:1,name:'Legal review',position:0,condition:{kind:'termsEdited'},approvers:['person:'+people.admin.id]})
 for(const role of ['owner','admin','manager','content_editor']){const cookie=role==='owner'?h.owner:people[role].cookie,current=(await h.state()).templates.find(t=>t.id===saved.id);await h.cmd('template.locks',{id:saved.id,version:current.version,sections:['terms','block:columns','block:terms']},cookie)}
 const template=(await h.state()).templates.find(t=>t.id===saved.id)
 for(const role of ['sales','viewer','billing'])await h.cmd('template.locks',{id:saved.id,version:template.version,sections:[]},people[role].cookie,403)
 const p=await h.cmd('template.start',{id:saved.id,version:template.version,clientId:client.id},people.sales.cookie),fields={...offer,clientId:client.id,id:p.id,version:1,terms:'Changed terms'}
 await h.cmd('proposal.revise',fields,people.sales.cookie,403);assert.equal((await h.state(people.sales.cookie)).proposals.find(r=>r.id===p.id).revision,1)
 const lockedDocument=(await h.state(people.sales.cookie)).proposals.find(r=>r.id===p.id).document
 for(const change of [b=>b.text='Changed warranty',b=>b.second='Changed second column',b=>b.title='Changed heading',b=>b.type='text',b=>b.condition='two',b=>b.id='replacement']){
  const document=structuredClone(lockedDocument);change(document.blocks.find(b=>b.id==='columns'))
  await h.cmd('proposal.document',{id:p.id,version:1,document},people.sales.cookie,403)
 }
 const removed=structuredClone(lockedDocument);removed.blocks=removed.blocks.filter(b=>b.id!=='columns')
 await h.cmd('proposal.document',{id:p.id,version:1,document:removed},people.sales.cookie,403)
 await h.cmd('template.locks',{id:saved.id,version:template.version,sections:['block:missing']},h.owner,400)
 assert.deepEqual((await h.state(people.sales.cookie)).proposals.find(r=>r.id===p.id).document,lockedDocument)
 const copy=await h.cmd('proposal.duplicate',{id:p.id,version:1},people.sales.cookie);await h.cmd('proposal.revise',{...fields,id:copy.id},people.sales.cookie,403)
 const personal=await h.cmd('template.save',{id:p.id,version:1,name:'Personal with locks'},people.sales.cookie)
 const changedTemplateDocument=documentFixture();changedTemplateDocument.blocks.find(b=>b.id==='columns').second='Changed warranty'
 const unlockedSource=await h.cmd('proposal.prepare',{...offer,clientId:client.id,terms:'Payment within 14 days.',document:changedTemplateDocument},people.sales.cookie)
 await h.cmd('template.save',{id:unlockedSource.id,version:1,templateId:personal.id,templateVersion:1,name:'Bypass'},people.sales.cookie,403)
 const started=await h.cmd('template.start',{id:personal.id,version:1,clientId:client.id},people.sales.cookie);await h.cmd('proposal.revise',{...fields,id:started.id},people.sales.cookie,403)
 for(const id of [copy.id,started.id])assert.deepEqual((await h.state(people.sales.cookie)).proposals.find(r=>r.id===id).lockedSections,['block:columns','block:terms','terms'])
 const reordered=structuredClone(lockedDocument);reordered.blocks.reverse();reordered.blocks.find(b=>b.id==='story').text='An independently editable paragraph'
 await h.cmd('proposal.document',{id:started.id,version:1,document:reordered},people.sales.cookie)
 await h.cmd('proposal.share',{id:started.id,operatorId:people.other.id},people.sales.cookie)
 await h.cmd('proposal.unlock',{id:started.id,version:2,section:'block:terms'},people.other.cookie,403)
 for(const role of ['sales','content_editor'])await h.cmd('proposal.unlock',{id:started.id,version:2,section:'block:terms'},people[role].cookie,403)
 await h.cmd('proposal.unlock',{id:started.id,version:2,section:'block:terms'},people.admin.cookie)
 const editedDocument=structuredClone(reordered);editedDocument.blocks.find(b=>b.id==='terms').text='Amended rich legal terms'
 await h.cmd('proposal.document',{id:started.id,version:3,document:editedDocument},people.sales.cookie,403)
 await h.cmd('proposal.unlock',{id:started.id,version:3,section:'terms'},people.admin.cookie)
 await h.cmd('proposal.document',{id:started.id,version:4,document:editedDocument},people.sales.cookie)
 const richReview=(await h.state(people.sales.cookie)).proposals.find(r=>r.id===started.id);assert.equal(richReview.approval.required,true);assert.equal(richReview.approval.complete,false)
 await h.cmd('proposal.send',{id:started.id,version:5},people.sales.cookie,409)
 await h.cmd('member.set',{operatorId:people.manager.id,version:1,role:'manager',teams:[]})
 await h.cmd('proposal.unlock',{id:copy.id,version:1,section:'block:columns'},people.manager.cookie,403)
 await h.cmd('member.set',{operatorId:people.manager.id,version:2,role:'manager',teams:[team.id]})
 await h.cmd('proposal.unlock',{id:copy.id,version:1,section:'block:columns'},people.manager.cookie)
 await h.cmd('proposal.unlock',{id:copy.id,version:1,section:'block:terms'},people.manager.cookie,409)
 await h.cmd('proposal.share',{id:p.id,operatorId:people.content_editor.id},people.sales.cookie)
 for(const role of ['sales','content_editor','viewer','billing','other'])await h.cmd('proposal.unlock',{id:p.id,version:1,section:'terms'},people[role].cookie,403)
 await h.cmd('proposal.unlock',{id:p.id,version:1,section:'terms'},people.admin.cookie)
 await h.cmd('proposal.revise',{...fields,version:2},people.sales.cookie)
 const edited=(await h.state(people.sales.cookie)).proposals.find(r=>r.id===p.id);assert.equal(edited.terms,'Changed terms');assert.equal(edited.approval.required,true);assert.equal(edited.approval.complete,false)
 await h.cmd('proposal.send',{id:p.id,version:3},people.sales.cookie,409)
 await h.cmd('proposal.approve',{id:p.id,version:3,revision:2},people.admin.cookie);await h.cmd('proposal.send',{id:p.id,version:4},people.sales.cookie)
 const audit=await h.send('/api/platter/audit?action=proposal.unlock',undefined,h.owner);assert.equal(audit.status,200);assert.ok(audit.value.rows.some(r=>r.actor_id===people.admin.id&&r.subject===p.id))
 await h.cmd('template.locks',{id:saved.id,version:template.version,sections:[]})
 assert.deepEqual((await h.state(people.sales.cookie)).proposals.find(r=>r.id===copy.id).lockedSections,['block:terms','terms'],'later template changes do not unlock existing proposals')
 // An allowed team manager can unlock their team's draft, and a stale revision cannot do so twice.
 await h.cmd('proposal.unlock',{id:copy.id,version:2,section:'terms'},people.manager.cookie);await h.cmd('proposal.unlock',{id:copy.id,version:1,section:'terms'},people.manager.cookie,409)
}))

test('TEAM-001 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses',async()=>{
 const mailCalls=[],h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-2900'},outboundService:async request=>{assert.equal(new URL(request.url).hostname,'api.resend.com');mailCalls.push(await request.json());return Response.json({id:'synthetic-platter-'+(3000+mailCalls.length)})}})
 const inviteToken=address=>new URL(mailCalls.findLast(m=>m.to.includes(address)).text.match(/https?:\/\/[^\s]+\/auth\/confirm\?token=[^\s]+/)[0]).searchParams.get('token')
 const joinInvite=async address=>{const r=await h.send('/auth/confirm',{token:inviteToken(address)});assert.equal(r.status,303,r.text);return r.cookie}
 try{
 const east=await h.cmd('team.create',{name:'East'}),west=await h.cmd('team.create',{name:'West'}),people={}
 for(const role of ['admin','manager','sales','content_editor','viewer','billing']){const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id;await h.cmd('member.set',{operatorId:id,version:0,role,teams:[east.id]});people[role]={cookie,id}}
 const input={email:'new-sales@synthetic-platter.example',displayName:'New salesperson',role:'sales',teams:[east.id]}
 const before=(await h.db.prepare('SELECT count(*) AS n FROM oa_operators').first()).n
 for(const role of ['sales','content_editor','viewer','billing'])await h.cmd('member.invite',input,people[role].cookie,403)
 for(const role of ['admin','manager','billing'])await h.cmd('member.invite',{...input,role},people.manager.cookie,403)
 await h.cmd('member.invite',{...input,teams:[west.id]},people.manager.cookie,403);await h.cmd('member.invite',{...input,teams:[]},people.manager.cookie,403)
 await h.cmd('member.invite',{...input,role:'admin'},people.admin.cookie,403)
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM oa_operators').first()).n,before);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_member_invitations').first()).n,0)
 const invitation=await h.cmd('member.invite',input,people.manager.cookie);assert.equal(invitation.status,'invited')
 const invited=await h.db.prepare('SELECT * FROM oa_operators WHERE email=?').bind(input.email).first();assert.equal(invited.status,'invited');assert.equal(await h.db.prepare('SELECT role FROM p_members WHERE operator_id=?').bind(invited.id).first(),null)
 // Even while an eligible pending grant exists, raw native invitations cannot bypass its target role/team selection.
 const raw=await h.send('/auth/invite',{email:'bypass@synthetic-platter.example',displayName:'Bypass',role:'member',returnTo:'/app'},people.manager.cookie);assert.equal(raw.status,403);assert.equal(await h.db.prepare('SELECT id FROM oa_operators WHERE email=?').bind('bypass@synthetic-platter.example').first(),null)
 const joined=await joinInvite(input.email),s=await h.state(joined);assert.equal(s.actor.role,'sales');assert.deepEqual(s.teams.map(t=>t.id),[east.id]);assert.equal((await h.db.prepare('SELECT status FROM p_member_invitations WHERE email=?').bind(input.email).first()).status,'accepted')
 const managerInvite={...input,email:'new-manager@synthetic-platter.example',displayName:'New manager',role:'manager',teams:[west.id]};assert.equal((await h.cmd('member.invite',managerInvite,people.admin.cookie)).status,'invited');const newManager=await joinInvite(managerInvite.email),managerState=await h.state(newManager);assert.equal(managerState.actor.role,'manager');assert.deepEqual(managerState.teams.map(t=>t.id),[west.id])
 const rejectLink=async token=>{const r=await h.send('/auth/confirm',{token});assert.ok(r.status>=400,r.text);assert.equal(r.cookie,undefined);return r}
 const rotated={...input,email:'rotated@synthetic-platter.example'}
 await h.cmd('member.invite',rotated,people.manager.cookie);const neverUsed=inviteToken(rotated.email)
 await h.cmd('member.invite',{...rotated,role:'viewer',teams:[west.id]})
 await rejectLink(neverUsed)
 const rotatedPerson=await h.db.prepare('SELECT id FROM oa_operators WHERE email=?').bind(rotated.email).first()
 assert.equal(await h.db.prepare('SELECT * FROM p_members WHERE operator_id=?').bind(rotatedPerson.id).first(),null)
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_team_members WHERE operator_id=?').bind(rotatedPerson.id).first()).n,0)
 const rotatedState=await h.state(await joinInvite(rotated.email));assert.equal(rotatedState.actor.role,'viewer');assert.deepEqual(rotatedState.teams.map(t=>t.id),[west.id])
 const ownerIssued={...input,email:'owner-issued@synthetic-platter.example',role:'admin'}
 await h.cmd('member.invite',ownerIssued);const ownerIssuedToken=inviteToken(ownerIssued.email)
 await h.cmd('member.invite',{...ownerIssued,role:'sales'},people.admin.cookie)
 assert.equal((await rejectLink(ownerIssuedToken)).status,403)
 assert.equal((await h.state(await joinInvite(ownerIssued.email))).actor.role,'sales','reissue depends on authority for the new grant')
 const zoneInvite={...input,email:'zone@synthetic-platter.example'}
 await h.cmd('member.invite',zoneInvite,people.manager.cookie)
 await h.cmd('member.zone',{timeZone:'America/New_York'},people.manager.cookie)
 await h.cmd('team.member',{operatorId:people.manager.id,teamId:west.id})
 const zoneState=await h.state(await joinInvite(zoneInvite.email));assert.equal(zoneState.actor.role,'sales');assert.deepEqual(zoneState.teams.map(t=>t.id),[east.id])
 // A pre-upgrade pending grant binds its existing native link on first use.
 const legacyInvite={...input,email:'legacy-invite@synthetic-platter.example'}
 await h.cmd('member.invite',legacyInvite,people.manager.cookie)
 await h.db.prepare('UPDATE p_member_invitations SET token_id=NULL,token_binding_pending=0 WHERE email=?').bind(legacyInvite.email).run()
 assert.equal((await h.state(await joinInvite(legacyInvite.email))).actor.role,'sales')
 const expired={...input,email:'expired@synthetic-platter.example'}
 await h.cmd('member.invite',expired,people.manager.cookie)
 await h.db.prepare('UPDATE p_member_invitations SET expires_at=? WHERE email=?').bind(Date.now()-1,expired.email).run()
 const expiredResponse=await rejectLink(inviteToken(expired.email));assert.equal(expiredResponse.status,403)
 const expiredPerson=await h.db.prepare('SELECT id FROM oa_operators WHERE email=?').bind(expired.email).first()
 assert.equal(await h.db.prepare('SELECT * FROM p_members WHERE operator_id=?').bind(expiredPerson.id).first(),null)
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM oa_sessions WHERE operator_id=? AND revoked_at IS NULL').bind(expiredPerson.id).first()).n,0)
 const revoked={...input,email:'revoked@synthetic-platter.example'}
 await h.cmd('member.invite',revoked,people.manager.cookie);const revokedToken=inviteToken(revoked.email),revokedPerson=await h.db.prepare('SELECT id FROM oa_operators WHERE email=?').bind(revoked.email).first()
 assert.equal((await h.send('/auth/invite/cancel',{operatorId:revokedPerson.id},h.owner)).status,200)
 assert.ok((await h.db.prepare('SELECT revoked_at FROM p_member_invitations WHERE email=?').bind(revoked.email).first()).revoked_at)
 await rejectLink(revokedToken)
 assert.equal((await h.send('/auth/invite',{email:revoked.email,displayName:'Native reissue',role:'member',returnTo:'/app'},h.owner)).status,202)
 await rejectLink(inviteToken(revoked.email))
 assert.equal(await h.db.prepare('SELECT * FROM p_members WHERE operator_id=?').bind(revokedPerson.id).first(),null)
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_team_members WHERE operator_id=?').bind(revokedPerson.id).first()).n,0)
 await h.cmd('member.invite',{...revoked,role:'viewer',teams:[west.id]})
 const legitimatelyReissued=await h.state(await joinInvite(revoked.email));assert.equal(legitimatelyReissued.actor.role,'viewer');assert.deepEqual(legitimatelyReissued.teams.map(t=>t.id),[west.id])
 const stale={...input,email:'stale@synthetic-platter.example'};assert.equal((await h.cmd('member.invite',stale,people.manager.cookie)).status,'invited');await h.cmd('member.set',{operatorId:people.manager.id,version:3,role:'sales',teams:[east.id]})
 const staleToken=inviteToken(stale.email),refused=await h.send('/auth/confirm',{token:staleToken})
 assert.ok(refused.status>=400);assert.equal(refused.cookie,undefined);const person=await h.db.prepare('SELECT id FROM oa_operators WHERE email=?').bind(stale.email).first();assert.equal(await h.db.prepare('SELECT role FROM p_members WHERE operator_id=?').bind(person.id).first(),null)
 assert.equal((await h.send('/api/platter/state',undefined,refused.cookie??'')).status,401)
 assert.equal((await h.cmd('member.invite',{...stale,role:'content_editor',teams:[west.id]})).status,'invited');const recovered=await h.state(await joinInvite(stale.email));assert.equal(recovered.actor.role,'content_editor');await audited(h,'member.invite',people.manager.id,'manager',invitation.id);await audited(h,'native.auth.confirm',recovered.actor.id,'content_editor',recovered.actor.id);assert.deepEqual(recovered.teams.map(t=>t.id),[west.id]);assert.ok((await h.send('/auth/confirm',{token:staleToken})).status>=400,'reissue revokes the earlier invitation')
 // Reproduce the supported-Base dependency without rebinding or weakening its credential version guard.
 const retainedIssuer={email:'promoted-issuer@synthetic-platter.example',displayName:'Promoted issuer',role:'member',returnTo:'/app'}
 assert.equal((await h.send('/auth/invite',retainedIssuer,h.owner)).status,202)
 const retainedCookie=await h.signIn(retainedIssuer.email),retainedPerson=(await h.state(retainedCookie)).actor
 await h.cmd('member.set',{operatorId:retainedPerson.id,version:0,role:'manager',teams:[east.id]})
 const retainedGrant={...input,email:'native-version-blocked@synthetic-platter.example'}
 await h.cmd('member.invite',retainedGrant,retainedCookie);const retainedToken=inviteToken(retainedGrant.email)
 const promoted=await h.send('/auth/operator/role',{operatorId:retainedPerson.id,role:'admin'},h.owner);assert.equal(promoted.status,200,promoted.text)
 const blocked=await rejectLink(retainedToken);assert.equal(blocked.status,400,'pinned Base invalidates the issuer-version capability even though the promoted admin can still issue the grant')
 const blockedPerson=await h.db.prepare('SELECT id FROM oa_operators WHERE email=?').bind(retainedGrant.email).first()
 assert.equal(await h.db.prepare('SELECT * FROM p_members WHERE operator_id=?').bind(blockedPerson.id).first(),null)
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM oa_sessions WHERE operator_id=? AND revoked_at IS NULL').bind(blockedPerson.id).first()).n,0)
 }finally{await h.close()}
})

test('TEAM-001 / CAT-001 catalog edits enforce the role matrix; copied prices and private costs stay frozen in proposals',async()=>{
 const h=await harness({assetsDirectory:'public'});try{
 const team=await h.cmd('team.create',{name:'East'}),people={}
 for(const role of ['admin','manager','sales','content_editor','viewer','billing']){const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id;await h.cmd('member.set',{operatorId:id,version:0,role,teams:[team.id]});people[role]=cookie}
 const input={name:'Synthetic service',sku:'synthetic-platter-3100',description:'Explicitly priced service',unit:'hour',unitPrice:'100',unitCost:'25'},catalog=[]
 for(const role of ['owner','admin','manager']){const cookie=role==='owner'?h.owner:people[role];catalog.push(await h.cmd('catalog.save',{...input,sku:input.sku+'-'+role},cookie))}
 const before=(await h.db.prepare('SELECT * FROM p_priced_catalog ORDER BY id').all()).results
 for(const role of ['sales','content_editor','viewer','billing'])await h.cmd('catalog.save',{...input,id:catalog[0].id,version:1},people[role],403)
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_priced_catalog ORDER BY id').all()).results,before)
 for(const role of ['sales','content_editor'])assert.equal(Object.hasOwn((await h.state(people[role])).catalogItems[0],'unitCostCents'),false)
 assert.deepEqual((await h.state(people.viewer)).catalogItems,[]);assert.equal((await h.send('/app/catalog',undefined,people.viewer)).status,403)
 const client=await h.cmd('client.save',{name:'Synthetic client',email:'client@synthetic-platter.example'}),p=await h.cmd('proposal.prepare',{...offer,title:'Synthetic catalog proposal',clientId:client.id},people.sales)
 await h.cmd('catalog.insert',{id:p.id,version:1,catalogId:catalog[0].id,catalogVersion:1,optionId:'one',quantity:'2'},people.sales)
 let current=(await h.state()).proposals.find(r=>r.id===p.id);assert.equal(current.options[0].cents,260000);assert.equal(current.options[1].cents,420000);assert.equal(current.internalPricing.lines.find(l=>l.name===input.name).unitCostCents,2500)
 assert.equal((await h.state(people.manager)).proposals.find(r=>r.id===p.id).internalPricing.lines.find(l=>l.name===input.name).costCents,5000)
 assert.equal(Object.hasOwn((await h.state(people.sales)).proposals.find(r=>r.id===p.id),'internalPricing'),false)
 await h.cmd('proposal.approve',{id:p.id,version:2,revision:2});const path=new URL((await h.cmd('proposal.send',{id:p.id,version:3},people.sales)).shareUrl).pathname,frozen=(await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(p.id).first()).snapshot
 const cookie=await verified(h,path),publicPage=await h.send(path,undefined,cookie);assert.doesNotMatch(publicPage.text,/Internal cost|Margin|unit_cost_cents|unitCostCents/)
 const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=one',{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,200);assert.doesNotMatch((await pdfPages(new Uint8Array(await pdf.arrayBuffer()))).join('\n'),/Internal cost|Margin/)
 await h.cmd('catalog.save',{...input,sku:input.sku+'-owner',id:catalog[0].id,version:1,unitPrice:'150',unitCost:'30'},people.manager)
 current=(await h.state()).proposals.find(r=>r.id===p.id);assert.equal(current.options[0].cents,260000);assert.equal((await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(p.id).first()).snapshot,frozen)
 const fresh=await h.cmd('proposal.prepare',{...offer,title:'New catalog proposal',clientId:client.id},people.sales)
 await h.cmd('catalog.insert',{id:fresh.id,version:1,catalogId:catalog[0].id,catalogVersion:2,optionId:'one',quantity:'2'},people.sales);assert.equal((await h.state()).proposals.find(r=>r.id===fresh.id).options[0].cents,270000)
 await h.cmd('catalog.insert',{id:fresh.id,version:2,catalogId:catalog[0].id,catalogVersion:1,optionId:'one',quantity:'1'},people.sales,409)
 await h.cmd('catalog.save',{...input,sku:input.sku+'-owner'},h.owner,409);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_priced_catalog').first()).n,3)
 await h.cmd('catalog.save',{...input,sku:'synthetic-platter-3101',unitCost:'0.00'});assert.equal((await h.state()).catalogItems.find(r=>r.sku==='synthetic-platter-3101').unitCostCents,0);await audited(h,'catalog.save',(await h.state(people.manager)).actor.id,'manager',catalog[0].id);await audited(h,'catalog.insert',(await h.state(people.sales)).actor.id,'sales',p.id)
 const {catalogJourney}=await import('./catalog-journey.mjs');await catalogJourney(h,{client,people,offer,verified})
 }finally{await h.close()}
})

test('TEAM-001 / PAY-006 dispute responses enforce financial roles, exact deposit binding, deadlines and consent, retaining the exact idempotent Stripe evidence',async()=>{
 const calls=[],uploads=[],statuses=new Map(),overrides=new Map(),deadline=Math.floor(Date.now()/1000)+86400
 let accepted,h,claim,chargeId='synthetic-platter-3401',receiptStatus='under_review',timeout=false
 h=await harness({assetsDirectory:'public',outboundService:async request=>{
  const url=new URL(request.url);calls.push({host:url.hostname,path:url.pathname,method:request.method})
  if(claim)assert.equal((await h.db.prepare('SELECT status FROM p_dispute_submissions WHERE id=?').bind(claim).first()).status,'reserved','claim is durable before every provider call')
  if(url.hostname==='files.stripe.com'){
   const key=request.headers.get('idempotency-key');assert.ok(key?.startsWith('platter-dispute-file-'));assert.equal((await h.db.prepare('SELECT status FROM p_dispute_submissions WHERE id=?').bind(key.slice('platter-dispute-file-'.length)).first()).status,'reserved');if(claim)assert.equal(key,'platter-dispute-file-'+claim)
   const data=await request.formData();assert.equal(data.get('purpose'),'dispute_evidence');const bytes=new Uint8Array(await data.get('file').arrayBuffer());assert.match(new TextDecoder().decode(bytes.subarray(0,8)),/^%PDF-/);uploads.push(bytes);return Response.json({id:'synthetic-platter-'+(3500+uploads.length)})
  }
  assert.equal(url.hostname,'api.stripe.com')
  if(url.pathname==='/v1/account')return Response.json({id:'synthetic-platter-3400'})
  if(url.pathname.includes('/charges/'))return Response.json({id:chargeId,paid:true,status:'succeeded',amount:accepted.deposit_cents,amount_refunded:0,currency:accepted.currency.toLowerCase(),metadata:{platter_proposal_id:accepted.proposal_id,platter_revision:String(accepted.revision)}})
  const id=url.pathname.split('/').at(-1)
  if(request.method==='GET')return Response.json({id,charge:id==='synthetic-platter-3403'?'synthetic-platter-other-charge':chargeId,amount:accepted.deposit_cents,currency:accepted.currency.toLowerCase(),status:statuses.get(id)??'needs_response',evidence_details:{due_by:deadline},...overrides.get(id)})
  const body=new URLSearchParams(await request.text());assert.deepEqual([...body.keys()].sort(),['evidence[service_documentation]','submit']);assert.equal(body.get('submit'),'true');assert.match(body.get('evidence[service_documentation]'),/^synthetic-platter-/)
  assert.ok(request.headers.get('idempotency-key')?.startsWith('platter-dispute-submit-'));if(claim)assert.equal(request.headers.get('idempotency-key'),'platter-dispute-submit-'+claim)
  if(timeout)throw new Error('Synthetic provider timeout')
  statuses.set(id,receiptStatus);return Response.json({id,status:receiptStatus})
 }})
 try{
  assert.equal((await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
  const people={};for(const role of ['admin','manager','sales','content_editor','viewer','billing']){const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id;await h.cmd('member.set',{operatorId:id,version:0,role,teams:[]});people[role]=cookie}
  const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'}),p=await h.cmd('proposal.prepare',{...offer,clientId:client.id,pricingTables:[{optionId:'one',name:'Delivery',lines:[{name:'Studio',description:'Synthetic delivery',quantity:'1',unit:'project',unitPrice:'2400'}]}]});const line=(await h.state()).proposals[0].internalPricing.lines[0];await h.cmd('pricing.cost',{id:p.id,version:1,lineKey:line.key,unitCost:'1337.29'});await h.cmd('proposal.approve',{id:p.id,version:2,revision:2});const path=new URL((await h.cmd('proposal.send',{id:p.id,version:3})).shareUrl).pathname,cookie=await verified(h,path);assert.equal((await h.send(path+'/action?name=accept',{name:'Synthetic client',optionId:'one',consent:true},cookie)).status,200);accepted=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
  await h.cmd('provider.connect',{provider:'stripe',version:0,token:'synthetic-platter-3405',webhookSecret:'synthetic-platter-3406',consent:true});const payment=await h.cmd('payment.bind',{id:p.id,chargeId:'synthetic-platter-3401',consent:true}),input={paymentId:payment.id,disputeId:'synthetic-platter-3402'}

  const forbidden=['manager','sales','content_editor','viewer'],before=calls.length
  for(const role of forbidden){
   for(const name of ['dispute.import','dispute.prepare','dispute.authorize','dispute.submit'])await h.cmd(name,{...input,version:1,note:'Forbidden',consent:true},people[role],403)
   assert.equal((await h.send('/api/platter/disputes/'+input.disputeId+'/evidence.pdf',undefined,people[role])).status,403)
  }
  const key=await h.cmd('agent.create',{label:'Synthetic dispute refusal'})
  for(const name of ['dispute.import','dispute.prepare','dispute.authorize','dispute.submit'])assert.equal((await h.send('/api/platter/agent/command',{name,input},'',{authorization:'Bearer '+key.token})).status,403)
  assert.equal(calls.length,before);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_disputes').first()).n,0)
  await h.cmd('dispute.import',{...input,disputeId:'synthetic-platter-3403'},people.billing,409)
  const preview=async(disputeId,packetId,actor=h.owner)=>{const file=await h.mf.dispatchFetch(h.origin+'/api/platter/disputes/'+disputeId+'/evidence.pdf?packet='+packetId,{headers:{host:new URL(h.origin).host,cookie:actor}});assert.equal(file.status,200);const bytes=new Uint8Array(await file.arrayBuffer());const hash=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');assert.equal(file.headers.get('x-platter-packet-sha256'),hash);return {bytes,hash}}
  const prepare=async(disputeId,actor=h.owner)=>{
   await h.cmd('dispute.import',{...input,disputeId},actor)
   const count=calls.length,note='Synthetic response',packet=await h.cmd('dispute.prepare',{disputeId,version:1,note},actor),view=await preview(disputeId,packet.id,actor)
   assert.equal(packet.documentHash,view.hash);assert.equal(calls.length,count,'preparation and preview use retained facts only')
   return {disputeId,packetId:packet.id,documentHash:view.hash,requestId:packet.id,note}
  }
  const authorize=async(request,actor=h.owner)=>h.cmd('dispute.authorize',{...request,consent:true},actor)
  const submit=async(request,actor=h.owner)=>{claim=request.requestId;try{return await h.cmd('dispute.submit',request,actor)}finally{claim=undefined}}
  for(const [index,role] of ['billing','owner','admin'].entries()){
   const actor=role==='owner'?h.owner:people[role],request=await prepare('synthetic-platter-'+(3410+index),actor),view=await preview(request.disputeId,request.packetId,actor),count=calls.length
   await h.cmd('dispute.submit',request,actor,409)
   await h.cmd('dispute.authorize',{...request,consent:false},actor,400)
   await h.cmd('dispute.authorize',{...request,documentHash:'0'.repeat(64),consent:true},actor,409)
   await authorize(request,actor)
   await h.cmd('dispute.submit',{...request,documentHash:'0'.repeat(64)},actor,409)
   await h.cmd('dispute.submit',{...request,note:'Changed response'},actor,409)
   assert.equal(calls.length,count,'absent authorization, wrong hash and changed note make no provider call')
   const audit=await h.send('/api/platter/audit?action=dispute.authorize',undefined,h.owner),entry=audit.value.rows.find(r=>JSON.parse(r.subject).packetId===request.packetId)
   assert.equal(entry.actor_id,(await h.state(actor)).actor.id);assert.equal(entry.actor_role,role)
   assert.deepEqual(JSON.parse(entry.subject),{packetId:request.packetId,disputeId:request.disputeId,cents:accepted.deposit_cents,currency:accepted.currency,deadline:deadline*1000,sha256:view.hash})
   assert.equal((await submit(request,actor)).status,'submitted');await audited(h,'dispute.submit',(await h.state(actor)).actor.id,role,request.requestId)
   const submittedCalls=calls.length;assert.equal((await h.cmd('dispute.submit',request,actor)).status,'submitted');assert.equal((await h.cmd('dispute.submit',{...request,requestId:'synthetic-platter-replay-'+index},actor)).status,'submitted');assert.equal(calls.length,submittedCalls)
   const file=await h.mf.dispatchFetch(h.origin+'/api/platter/disputes/'+request.disputeId+'/evidence.pdf?submission='+request.requestId,{headers:{host:new URL(h.origin).host,cookie:actor}});assert.equal(file.status,200);const bytes=new Uint8Array(await file.arrayBuffer());assert.deepEqual(bytes,view.bytes);assert.deepEqual(bytes,uploads[index])
   assert.equal((await h.db.prepare('SELECT document_hash FROM p_dispute_submissions WHERE id=?').bind(request.requestId).first()).document_hash,view.hash)
   const text=(await pdfPages(bytes)).join(' ');assert.match(text,/not a signature certificate/);assert.match(text,/Synthetic client/);assert.match(text,/Northstar brand photography/);assert.match(text,/invitation mailbox code verified/);assert.match(text,/Verified mailbox:/)
   for(const expected of ['SIGN-005','TRACK-001','PAY-001','PAY-002','Attachment contents are not included',request.disputeId,'USD 600.00'])assert.ok(text.includes(expected),expected)
   assert.doesNotMatch(text,/Internal cost|unit_cost_cents|unitCostCents|1337\.29|synthetic-platter-3405/)
  }
  // A refresh changing the amount invalidates the already authorized packet locally.
  const changed=await prepare('synthetic-platter-3440');await authorize(changed);overrides.set(changed.disputeId,{amount:accepted.deposit_cents-1})
  await h.cmd('dispute.import',{...input,disputeId:changed.disputeId,version:1});let count=calls.length
  await h.cmd('dispute.submit',changed,h.owner,409);assert.equal(calls.length,count)
  // A provider-side change after authorization is detected after the claim, before uploading any bytes.
  const remoteChanged=await prepare('synthetic-platter-3441');await authorize(remoteChanged);overrides.set(remoteChanged.disputeId,{amount:accepted.deposit_cents-1})
  const uploadCount=uploads.length;assert.equal((await submit(remoteChanged)).status,'needs_review');assert.equal(uploads.length,uploadCount)
  // Let a genuinely provider-issued deadline pass after preparation and authorization.
  const expiringId='synthetic-platter-3442';overrides.set(expiringId,{evidence_details:{due_by:Math.floor(Date.now()/1000)+5}})
  const expired=await prepare(expiringId);await authorize(expired)
  const expiry=(await h.state()).disputes.find(d=>d.id===expiringId).deadline
  await new Promise(r=>setTimeout(r,Math.max(0,expiry-Date.now()+20)));count=calls.length
  await h.cmd('dispute.submit',expired,h.owner,409);assert.equal(calls.length,count)
  // A timeout holds custody forever: replay, a different request ID and refresh cannot resend.
  const held=await prepare('synthetic-platter-3443');await authorize(held);timeout=true
  assert.equal((await submit(held)).status,'needs_review');timeout=false;count=calls.length
  assert.equal((await h.cmd('dispute.submit',held)).status,'needs_review')
  assert.equal((await h.cmd('dispute.submit',{...held,requestId:'synthetic-platter-3444'})).status,'needs_review');assert.equal(calls.length,count)
  await h.cmd('dispute.import',{...input,disputeId:held.disputeId,version:3});count=calls.length
  await h.cmd('dispute.prepare',{disputeId:held.disputeId,version:4,note:'Do not retry'},h.owner,409);assert.equal(calls.length,count)
  statuses.set(held.disputeId,'under_review');await h.cmd('dispute.import',{...input,disputeId:held.disputeId,version:4})
  assert.equal((await h.state()).disputes.find(d=>d.id===held.disputeId).submissions[0].status,'submitted')
  for(const status of ['won','lost']){const d=(await h.state()).disputes.find(d=>d.id===held.disputeId);statuses.set(held.disputeId,status);await h.cmd('dispute.import',{...input,disputeId:held.disputeId,version:d.version});assert.equal((await h.state()).disputes.find(d=>d.id===held.disputeId).status,status)}
  // A terminal response does not manufacture an under-review receipt.
  const terminal=await prepare('synthetic-platter-3445');await authorize(terminal);receiptStatus='won'
  assert.equal((await submit(terminal)).status,'needs_review');assert.equal((await h.state()).disputes.find(d=>d.id===terminal.disputeId).status,'won');receiptStatus='under_review'
  // Two independent authorized packets cannot race into a second network attempt.
  const racing=await prepare('synthetic-platter-3446'),second=await h.cmd('dispute.prepare',{disputeId:racing.disputeId,version:1,note:'Other packet'})
  const other={...racing,note:'Other packet',packetId:second.id,documentHash:second.documentHash,requestId:second.id};await authorize(racing);await authorize(other)
  count=uploads.length
  const results=await Promise.all([racing,other].map(input=>h.send('/api/platter/command',{name:'dispute.submit',input},h.owner)))
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(results.find(r=>r.status===200).value.status,'submitted');assert.equal(uploads.length,count+1)
  // An owner-attested signed copy is retained but its contents are explicitly omitted.
  const paper=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Synthetic attested agreement'})
  const attachment=new FormData();attachment.set('id',paper.id);attachment.set('version','1');attachment.set('file',new File(['Retained attachment contents'],'synthetic-platter-attachment.txt',{type:'text/plain'}))
  const attachmentRequest=new Request(h.origin+'/app/attachment',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner},body:attachment});const upload=await h.mf.dispatchFetch(attachmentRequest.url,{method:'POST',headers:attachmentRequest.headers,body:await attachmentRequest.arrayBuffer()});assert.equal(upload.status,200,await upload.text());assert.equal((await h.state()).proposals.find(r=>r.id===paper.id).version,2)
  await h.cmd('proposal.approve',{id:paper.id,version:2,revision:2});await h.cmd('proposal.send',{id:paper.id,version:3})
  const form=new FormData();for(const [key,value] of Object.entries({id:paper.id,version:'4',signer:'Synthetic client',signedOn:'2026-10-21',optionId:'one',attest:'yes'}))form.set(key,value)
  form.set('file',new File(['Retained signed copy contents'],'synthetic-platter-signed.txt',{type:'text/plain'}))
  const paperRequestUpload=new Request(h.origin+'/app/paper-acceptance',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner},body:form});const recorded=await h.mf.dispatchFetch(paperRequestUpload.url,{method:'POST',headers:paperRequestUpload.headers,body:await paperRequestUpload.arrayBuffer()});assert.equal(recorded.status,200,await recorded.text())
  accepted=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(paper.id).first();chargeId='synthetic-platter-3450'
  const paperPayment=await h.cmd('payment.bind',{id:paper.id,chargeId,consent:true})
  await h.cmd('dispute.import',{paymentId:paperPayment.id,disputeId:'synthetic-platter-3447'})
  const packet=await h.cmd('dispute.prepare',{disputeId:'synthetic-platter-3447',version:1,note:'Owner-attested copy'})
  const view=await preview('synthetic-platter-3447',packet.id),paperText=(await pdfPages(view.bytes)).join(' ')
  assert.match(paperText,/owner-attested upload/);assert.match(paperText,/Platter did not verify the signature/)
  assert.doesNotMatch(paperText,/Verified mailbox|invitation mailbox code/)
  for(const expected of ['synthetic-platter-attachment.txt','synthetic-platter-signed.txt','Attachment contents are not included','SIGN-005','TRACK-001','PAY-001','PAY-002'])assert.ok(paperText.includes(expected),expected)
  assert.doesNotMatch(paperText,/Retained attachment contents|Retained signed copy contents/)
  const paperRequest={disputeId:'synthetic-platter-3447',packetId:packet.id,documentHash:packet.documentHash,requestId:packet.id};await authorize(paperRequest,people.billing);assert.equal((await submit(paperRequest,people.billing)).status,'submitted');assert.deepEqual(uploads.at(-1),view.bytes)
  assert.deepEqual((await h.state(people.sales)).disputes,[])
  await audited(h,'dispute.import',(await h.state(people.billing)).actor.id,'billing','synthetic-platter-3410')
 }finally{await h.close()}
})

test('TEAM-001 / APPROVE-003 native admins remain eligible named approvers and settings audit records identify the actual person or workspace',()=>run(async h=>{
 const email='native-admin@synthetic-platter.example';assert.equal((await h.send('/auth/invite',{email,displayName:'Native admin',role:'admin',returnTo:'/app'},h.owner)).status,202);const admin=await h.signIn(email),actor=(await h.state(admin)).actor;assert.equal(actor.role,'admin')
 await h.cmd('member.zone',{timeZone:'America/New_York'},admin);await audited(h,'member.zone',actor.id,'admin',actor.id)
 await h.cmd('workspace.defaults',{version:0,reminderDays:[2,5],expiryDays:30},admin);await audited(h,'workspace.defaults',actor.id,'admin','installation')
 await h.cmd('approval.policy',{version:0,required:false,defaultRole:'owner'},admin);await audited(h,'approval.policy',actor.id,'admin','installation')
 const rule=await h.cmd('approval.rule',{version:1,name:'Named native admin',position:0,condition:{kind:'totalOver',cents:0,currency:'USD'},approvers:['person:'+actor.id]},admin);await audited(h,'approval.rule',actor.id,'admin',rule.id)
 const {p}=await draft(h);await h.cmd('proposal.send',{id:p.id,version:1},h.owner,409);await h.cmd('proposal.approve',{id:p.id,version:1,revision:1},admin);await h.cmd('proposal.send',{id:p.id,version:2});await audited(h,'proposal.approve',actor.id,'admin',p.id)
 await h.cmd('approval.rule.delete',{id:rule.id,version:2},admin);await audited(h,'approval.rule.delete',actor.id,'admin',rule.id)
 // Native ownership handoff remains owner-only, uses fresh email proof and revokes the former owner's bound sessions and agent credentials.
 const people={native_admin:{cookie:admin,id:actor.id}},oldOwner=(await h.state()).actor,key=await h.cmd('agent.create',{label:'Synthetic ownership handoff'})
 for(const role of ['admin','manager','sales','content_editor','viewer','billing']){const address=role+'@synthetic-platter.example';await h.send('/auth/invite',{email:address,displayName:role,role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(address),person=(await h.state(cookie)).actor;await h.cmd('member.set',{operatorId:person.id,role,version:0,teams:[]});people[role]={cookie,id:person.id,email:address}}
 const authority=async()=>JSON.stringify([(await h.db.prepare('SELECT id,role,version FROM oa_operators ORDER BY id').all()).results,(await h.db.prepare('SELECT id,revoked_at FROM p_agent_keys ORDER BY id').all()).results])
 const before=await authority()
 for(const person of Object.values(people)){assert.equal((await h.send('/auth/operator/role',{operatorId:people.sales.id,role:'owner'},person.cookie)).status,403);await h.cmd('agent.revoke',{id:key.id},person.cookie,403);assert.equal(await authority(),before,'forbidden native ownership/key writes leave authority unchanged')}
 const fresh=await h.signIn(oldOwner.email);const promoted=await h.send('/auth/operator/role',{operatorId:people.sales.id,role:'owner'},fresh);assert.equal(promoted.status,200,promoted.text)
 const successor=await h.signIn(people.sales.email);assert.equal((await h.state(successor)).actor.role,'owner')
 const demoted=await h.send('/auth/operator/role',{operatorId:oldOwner.id,role:'admin'},successor);assert.equal(demoted.status,200,demoted.text)
 assert.equal((await h.send('/api/platter/state',undefined,fresh)).status,401)
 assert.equal((await h.send('/api/platter/agent/context',undefined,'',{authorization:'Bearer '+key.token})).status,401)
 assert.deepEqual((await h.db.prepare("SELECT id FROM oa_operators WHERE role='owner' AND status='active'").all()).results.map(p=>p.id),[people.sales.id]);assert.ok((await h.state(successor)).proposals.some(row=>row.id===p.id),'handoff retains existing proposals')
 const previous=await h.signIn(oldOwner.email);assert.equal((await h.state(previous)).actor.role,'admin')
 const handoffAudit=await h.send('/api/platter/audit?action=native.auth.operator.role',undefined,successor);assert.equal(handoffAudit.status,200);assert.ok(handoffAudit.value.rows.some(row=>row.actor_id===oldOwner.id&&row.actor_role==='owner'&&row.subject===people.sales.id));assert.ok(handoffAudit.value.rows.some(row=>row.actor_id===people.sales.id&&row.actor_role==='owner'&&row.subject===oldOwner.id))
}))

test('TEAM-001 / PRICE-006 optional and flat-package costs produce exact selected totals while verified client JSON, pages and PDFs exclude private state',async()=>{
 const h=await harness({assetsDirectory:'public'})
 try{
  const {client}=await draft(h),p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic selected package',scope:'Public delivery',depositPercent:'25',packages:[{id:'main',label:'Delivery',price:'100',optionalItems:[{id:'rush',label:'Rush delivery',unitPrice:'10',min:1,max:5,quantity:2,editable:true}]},{id:'alternative',label:'Alternative',price:'200'}],pricingTables:[{optionId:'main',name:'Services',lines:[{name:'Delivery work',description:'Public work',quantity:'1',unit:'project',unitPrice:'100'}]}]})
  const current=async()=>(await h.state()).proposals.find(r=>r.id===p.id)
  let row=await current();await h.cmd('pricing.cost',{id:p.id,version:1,lineKey:row.internalPricing.lines.find(l=>l.kind==='base'&&l.optionId==='main').key,unitCost:'40'})
  row=await current();await h.cmd('pricing.cost',{id:p.id,version:2,lineKey:row.internalPricing.lines.find(l=>l.kind==='optional').key,unitCost:'3.17'})
  row=await current();await h.cmd('pricing.cost',{id:p.id,version:3,lineKey:row.internalPricing.lines.find(l=>l.optionId==='alternative').key,unitCost:'80'})
  row=await current();assert.deepEqual([row.internalPricing.total.revenueCents,row.internalPricing.total.costCents,row.internalPricing.total.marginCents],[10000,4000,6000]);const optional=row.internalPricing.lines.find(l=>l.kind==='optional');assert.deepEqual([optional.selected,optional.quantity,optional.costCents,optional.marginCents],[false,'2',634,1366]);assert.equal(row.internalPricing.packages[1].marginCents,12000)
  const template=await h.cmd('template.save',{id:p.id,version:4,name:'Optional costing'}),started=await h.cmd('template.start',{id:template.id,version:1,clientId:client.id});assert.deepEqual((await h.state()).proposals.find(r=>r.id===started.id).internalPricing,row.internalPricing)
  await h.cmd('proposal.approve',{id:p.id,version:4,revision:4});const path=new URL((await h.cmd('proposal.send',{id:p.id,version:5})).shareUrl).pathname
  const unauthenticated=await h.send(path+'/data.json',undefined,h.owner);assert.equal(unauthenticated.status,401);assert.doesNotMatch(unauthenticated.text,/Synthetic selected package|Public delivery|unitCost|margin/)
  const cookie=await verified(h,path),initial=await h.send(path+'/data.json',undefined,cookie);assert.equal(initial.status,200,initial.text);assert.equal(initial.value.selection.totalCents,10000)
  assert.equal((await h.send(path+'/data.json',{},cookie)).status,405)
  const file=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=main&add.rush=yes&qty.rush=3',{headers:{cookie}});assert.equal(file.status,200);const publicPdf=(await pdfPages(await file.arrayBuffer())).join(' ');assert.match(publicPdf,/130\.00/);assert.doesNotMatch(publicPdf,/Internal cost|Margin|3\.17|49\.51|80\.49/)
  assert.equal((await h.send(path+'/action?name=accept',{name:'Casey Synthetic',optionId:'main',items:[{id:'rush',quantity:3}],consent:true},cookie)).status,200)
  row=await current();assert.equal(row.acceptance.totalCents,13000);assert.deepEqual([row.internalPricing.total.revenueCents,row.internalPricing.total.costCents,row.internalPricing.total.marginCents,row.internalPricing.total.marginBps],[13000,4951,8049,6192]);assert.deepEqual([row.internalPricing.lines.find(l=>l.kind==='optional').quantity,row.internalPricing.lines.find(l=>l.kind==='optional').costCents],['3',951])
  const data=await h.send(path+'/data.json',undefined,cookie);assert.equal(data.status,200,data.text);assert.equal(data.value.selection.totalCents,13000);assert.equal(data.value.acceptance.depositCents,3250);assert.equal(data.value.acceptance.name,'Casey Synthetic');assert.doesNotMatch(data.text,/internalPricing|unitCost|unit_cost|margin|owner_email|owner_id|outbox|session|token/)
  const publicPage=await h.send(path,undefined,cookie);assert.doesNotMatch(publicPage.text,/Internal cost|3\.17|49\.51|80\.49/)
  assert.equal((await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=main',{headers:{cookie}})).status,409,'the unsigned PDF door stays closed after acceptance')
  await audited(h,'proposal.data',client.id,'client',p.id)
  const foreign=await h.cmd('proposal.prepare',{...offer,clientId:client.id});await h.cmd('proposal.approve',{id:foreign.id,version:1,revision:1});const foreignPath=new URL((await h.cmd('proposal.send',{id:foreign.id,version:2})).shareUrl).pathname;assert.equal((await h.send(foreignPath+'/data.json',undefined,cookie)).status,401,'another invitation never inherits the mailbox session')
  // Converting a flat package into an itemized table preserves its previously entered private package cost.
  let flat=(await h.state()).proposals.find(r=>r.id===started.id);const item=await h.cmd('catalog.save',{name:'Synthetic add-on',sku:'synthetic-platter-3800',description:'Public item',unit:'each',unitPrice:'10',unitCost:'2'})
  await h.cmd('catalog.insert',{id:flat.id,version:1,catalogId:item.id,catalogVersion:1,optionId:'alternative',quantity:'1'});flat=(await h.state()).proposals.find(r=>r.id===started.id);assert.equal(flat.internalPricing.packages.find(o=>o.id==='alternative').costCents,8200)
 }finally{await h.close()}
})

test('PRICE-004 scoped discounts preserve exact selections, private margins, templates and public PDF and JSON custody',async()=>{
 const h=await harness({assetsDirectory:'public'})
 try{
  const {client}=await draft(h),input={clientId:client.id,title:'Synthetic discounted package',scope:'Public scope',depositPercent:'25',packages:[{id:'main',label:'Delivery',price:'100',discountPercent:'20',optionalItems:[{id:'rush',label:'Rush',unitPrice:'10',min:1,max:5,quantity:2,editable:true}]}],pricingTables:[{optionId:'main',name:'Services',lines:[{name:'Work',description:'Public work',quantity:'1',unit:'project',unitPrice:'100'}]}]},p=await h.cmd('proposal.prepare',input)
  let row=(await h.state()).proposals.find(r=>r.id===p.id);assert.deepEqual(row.options[0].discount,{bps:2000,grossCents:10000,cents:2000});assert.equal(row.options[0].cents,8000)
  await h.cmd('pricing.cost',{id:p.id,version:1,lineKey:row.internalPricing.lines[0].key,unitCost:'40'});row=(await h.state()).proposals.find(r=>r.id===p.id);await h.cmd('pricing.cost',{id:p.id,version:2,lineKey:row.internalPricing.lines.find(l=>l.kind==='optional').key,unitCost:'3.17'});row=(await h.state()).proposals.find(r=>r.id===p.id);assert.deepEqual([row.internalPricing.total.revenueCents,row.internalPricing.total.costCents,row.internalPricing.total.marginCents],[8000,4000,4000])
  const template=await h.cmd('template.save',{id:p.id,version:3,name:'Discounted starter'}),copy=await h.cmd('template.start',{id:template.id,version:1,clientId:client.id});assert.deepEqual((await h.state()).proposals.find(r=>r.id===copy.id).options,row.options)
  const before=(await h.db.prepare('SELECT * FROM p_proposals ORDER BY id').all()).results
  for(const discountPercent of ['100','-1','20.001','NaN'])await h.cmd('proposal.prepare',{...input,packages:[{id:'main',label:'Invalid',price:'100',discountPercent}]},h.owner,400)
  assert.deepEqual((await h.db.prepare('SELECT * FROM p_proposals ORDER BY id').all()).results,before)
  await h.cmd('proposal.approve',{id:p.id,version:3,revision:3});const path=new URL((await h.cmd('proposal.send',{id:p.id,version:4})).shareUrl).pathname,cookie=await verified(h,path),query='?optionId=main&add.rush=yes&qty.rush=3'
  const data=await h.send(path+'/data.json'+query,undefined,cookie);assert.equal(data.status,200,data.text);assert.equal(data.value.selection.totalCents,10400);assert.equal(data.value.selection.discountCents,2600);assert.equal(data.value.selection.depositCents,2600);assert.doesNotMatch(data.text,/unitCost|internalPricing|margin/)
  const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf'+query,{headers:{cookie}});assert.equal(pdf.status,200);const text=(await pdfPages(await pdf.arrayBuffer())).join(' ');assert.match(text,/Package discount: 20%/);assert.match(text,/104\.00/);assert.doesNotMatch(text,/Internal cost|3\.17/)
  assert.equal((await h.send(path+'/action?name=accept',{name:'Synthetic client',optionId:'main',items:[{id:'rush',quantity:3}],consent:true},cookie)).status,200)
  row=(await h.state()).proposals.find(r=>r.id===p.id);assert.deepEqual([row.acceptance.totalCents,row.acceptance.depositCents,row.acceptance.selection.discountCents],[10400,2600,2600]);assert.deepEqual([row.internalPricing.total.revenueCents,row.internalPricing.total.costCents,row.internalPricing.total.marginCents],[10400,4951,5449]);assert.equal(row.internalPricing.lines.reduce((n,l)=>n+(l.selected?l.revenueCents:0),0),10400)
  // Pin the installation clock before exercising discount dates.
  await h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(Date.parse('2099-04-30T12:00:00Z')).run()
  // Group reductions precede the once-only fixed total reduction.
  const advanced={clientId:client.id,title:'Scoped discounts',scope:'Public scope',depositPercent:'25',packages:[{id:'main',label:'Scoped package',price:'2500',discountAmount:'500',discountExpiresOn:'2099-05-01'}],pricingTables:[{optionId:'main',name:'Services',lines:[{name:'First',quantity:'1',unit:'project',unitPrice:'1000',group:'Delivery',groupDiscountPercent:'10'},{name:'Second',quantity:'1',unit:'project',unitPrice:'1000',group:'Delivery'},{name:'Other',quantity:'1',unit:'project',unitPrice:'500'}]}]}
  await h.cmd('approval.policy',{version:0,required:false,defaultRole:'owner'})
  await h.cmd('approval.rule',{version:1,name:'Discount review',position:0,condition:{kind:'discountOver',bps:1500},approvers:['role:owner']})
  const scoped=await h.cmd('proposal.prepare',advanced);let current=(await h.state()).proposals.find(r=>r.id===scoped.id)
  assert.equal(current.options[0].cents,180000);assert.deepEqual(current.options[0].tables[0].lines.map(l=>l.lineTotalCents),[90000,90000,50000]);assert.equal(current.internalPricing.total.revenueCents,180000);assert.equal(current.approval.required,true)
  await h.cmd('proposal.send',{id:scoped.id,version:1},h.owner,409)
  await h.cmd('proposal.approve',{id:scoped.id,version:1,revision:1});await h.cmd('proposal.send',{id:scoped.id,version:2})
  for(const [linePatch,packagePatch,totalCents,review] of [[{groupDiscountPercent:'20'},{discountAmount:'0'},210000,true],[{groupDiscountPercent:'0',groupDiscountAmount:'500'},{discountAmount:'0'},200000,true],[{groupDiscountPercent:'0',discountPercent:'20'},{discountAmount:'0'},230000,true],[{groupDiscountPercent:'10'},{discountAmount:'0'},230000,false],[{groupDiscountPercent:'100'},{discountAmount:'0'},50000,true]]){
   const fields={...advanced,packages:[{...advanced.packages[0],...packagePatch}],pricingTables:[{...advanced.pricingTables[0],lines:advanced.pricingTables[0].lines.map((l,i)=>i===0?{...l,...linePatch}:l)}]},candidate=await h.cmd('proposal.prepare',fields),candidateRow=(await h.state()).proposals.find(r=>r.id===candidate.id)
   assert.equal(candidateRow.options[0].cents,totalCents);assert.equal(candidateRow.approval.required,review)
   if(review)await h.cmd('proposal.send',{id:candidate.id,version:1},h.owner,409)
   else await h.cmd('proposal.send',{id:candidate.id,version:1})
  }
  const variant={...advanced,packages:[{...advanced.packages[0],showDiscount:false}],pricingTables:[{...advanced.pricingTables[0],lines:advanced.pricingTables[0].lines.map((l,i)=>i===0?{...l,discountPercent:'20',discountAmount:'10'}:l)}]}
  const hidden=await h.cmd('proposal.prepare',variant);current=(await h.state()).proposals.find(r=>r.id===hidden.id)
  assert.equal(current.options[0].cents,161100);assert.equal(current.approval.required,true);assert.equal(current.internalPricing.total.revenueCents,161100)
  const templ=await h.cmd('template.save',{id:hidden.id,version:1,name:'Scoped discount template'}),started=await h.cmd('template.start',{id:templ.id,version:1,clientId:client.id}),duplicate=await h.cmd('proposal.duplicate',{id:hidden.id,version:1})
  for(const id of [started.id,duplicate.id])assert.deepEqual((await h.state()).proposals.find(r=>r.id===id).options,current.options)
  await h.cmd('proposal.approve',{id:hidden.id,version:1,revision:1});const hiddenPath=new URL((await h.cmd('proposal.send',{id:hidden.id,version:2})).shareUrl).pathname,hiddenCookie=await verified(h,hiddenPath)
  const hiddenData=await h.send(hiddenPath+'/data.json',undefined,hiddenCookie);assert.equal(hiddenData.value.selection.totalCents,161100);assert.doesNotMatch(hiddenData.text,/grossCents|discountCents|discountBps|fixedCents|unitPrice/);assert.equal(hiddenData.value.options[0].tables[0].lines.reduce((n,l)=>n+l.lineTotalCents,0),161100)
  const hiddenPage=await h.send(hiddenPath,undefined,hiddenCookie);assert.doesNotMatch(hiddenPage.text,/Package discount:|Package discounts|Unit price/)
  const hiddenPdf=await h.mf.dispatchFetch(h.origin+hiddenPath+'/download.pdf?optionId=main',{headers:{cookie:hiddenCookie}});assert.equal(hiddenPdf.status,200);assert.doesNotMatch((await pdfPages(await hiddenPdf.arrayBuffer())).join(' '),/Package discount:|1000[.]00/)
  await h.cmd('proposal.approve',{id:duplicate.id,version:1,revision:1});const acceptedHiddenPath=new URL((await h.cmd('proposal.send',{id:duplicate.id,version:2})).shareUrl).pathname,acceptedHiddenCookie=await verified(h,acceptedHiddenPath)
  assert.equal((await h.send(acceptedHiddenPath+'/action?name=accept',{name:'Synthetic client',optionId:'main',consent:true},acceptedHiddenCookie)).status,200)
  const acceptedHiddenData=await h.send(acceptedHiddenPath+'/data.json',undefined,acceptedHiddenCookie);assert.equal(acceptedHiddenData.value.acceptance.totalCents,161100);assert.doesNotMatch(acceptedHiddenData.text,/grossCents|discountCents|discountBps|fixedCents|unitPrice/)
  const savedRows=(await h.db.prepare('SELECT * FROM p_proposals ORDER BY id').all()).results
  for(const patch of [{discountAmount:'3000'},{discountAmount:'-1'},{discountExpiresOn:'2099-02-30'}])await h.cmd('proposal.prepare',{...advanced,packages:[{...advanced.packages[0],...patch}]},h.owner,400)
  for(const linePatch of [{discountPercent:'100.01'},{discountAmount:'1001'},{groupDiscountAmount:'2001'},{groupDiscountPercent:'-1'}])await h.cmd('proposal.prepare',{...advanced,pricingTables:[{...advanced.pricingTables[0],lines:advanced.pricingTables[0].lines.map((l,i)=>i===0?{...l,...linePatch}:l)}]},h.owner,400)
  assert.deepEqual((await h.db.prepare('SELECT * FROM p_proposals ORDER BY id').all()).results,savedRows)
  // The installation clock advances to a fixed instant, independent of wall-clock boundaries.
  await h.cmd('expiry.remove',{id:hidden.id,version:3})
  await h.db.prepare('UPDATE p_shares SET session_expires=? WHERE proposal_id=?').bind(Date.parse('2099-05-03T12:00:00Z'),hidden.id).run()
  await h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(Date.parse('2099-05-02T12:00:00Z')).run()
  await h.cmd('proposal.send',{id:started.id,version:1},h.owner,409)
  const expiredAcceptance=await h.send(hiddenPath+'/action?name=accept',{name:'Synthetic client',optionId:'main',consent:true},hiddenCookie);assert.equal(expiredAcceptance.status,409);assert.match(expiredAcceptance.text,/discount expired/)
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_acceptances WHERE proposal_id=?').bind(hidden.id).first()).n,0)
  const tiny=await h.cmd('proposal.prepare',{clientId:client.id,title:'Cent allocation',scope:'Public scope',depositPercent:'25',packages:[{id:'main',label:'Tiny',price:'0.03',discountPercent:'33.33'}],pricingTables:[{optionId:'main',name:'Tiny lines',lines:['First','Second','Third'].map(name=>({name,description:'',quantity:'1',unit:'each',unitPrice:'0.01'}))}]});const small=(await h.state()).proposals.find(r=>r.id===tiny.id);assert.equal(small.options[0].cents,2);assert.deepEqual(small.internalPricing.lines.map(l=>l.revenueCents),[1,1,0])
 }finally{await h.close()}
})

test('APPROVE-001 gross value and 20% discount require manager then owner; margin, payment-term and template conditions skip only when satisfied',()=>run(async h=>{
 const team=await h.cmd('team.create',{name:'East'}),people={}
 for(const role of ['manager','sales']){const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id;await h.cmd('member.set',{operatorId:id,version:0,role,teams:[team.id]});people[role]={cookie,id}}
 const {client}=await draft(h),owner=(await h.state()).actor,policy=async()=>(await h.state()).approvalSettings.policy,rule=async(name,condition,approvers,position=0,templates=[])=>h.cmd('approval.rule',{version:(await policy()).version,name,condition,approvers,position,templates}),remove=async id=>h.cmd('approval.rule.delete',{id,version:(await policy()).version}),current=async(id,cookie=h.owner)=>(await h.state(cookie)).proposals.find(p=>p.id===id),prepare=async(packages,other={})=>h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic approval conditions',scope:'Public scope',depositPercent:'25',packages,...other},people.sales.cookie)
 await h.cmd('approval.policy',{version:0,required:false,defaultRole:'owner'})
 const amount=await rule('Manager over $25,000',{kind:'totalOver',cents:2500000,currency:'USD'},['role:manager']),discount=await rule('Owner above 15% discount',{kind:'discountOver',bps:1500},['role:owner'],1),packages=[{id:'main',label:'Delivery',price:'30000',discountPercent:'20'}],p=await prepare(packages)
 let row=await current(p.id);assert.equal(row.options[0].cents,2400000);assert.deepEqual(row.approval.steps.map(s=>s.id),[amount.id,discount.id]);await h.cmd('proposal.approve',{id:p.id,version:1,revision:1},people.manager.cookie);row=await current(p.id);assert.equal(row.approval.steps[0].done,true);assert.equal(row.approval.steps[1].active,true)
 await h.cmd('proposal.revise',{clientId:client.id,id:p.id,version:2,title:row.title,scope:'Edited after manager approval',depositPercent:'25',packages},people.sales.cookie);row=await current(p.id);assert.ok(row.approval.steps.every(s=>!s.done));await h.cmd('proposal.approve',{id:p.id,version:3,revision:2},h.owner,403);await h.cmd('proposal.send',{id:p.id,version:3},people.sales.cookie,409)
 await h.cmd('proposal.approve',{id:p.id,version:3,revision:2},people.manager.cookie);await h.cmd('proposal.approve',{id:p.id,version:4,revision:2});await h.cmd('proposal.send',{id:p.id,version:5},people.sales.cookie)
 await remove(amount.id);await remove(discount.id)
 const margin=await rule('Private margin floor',{kind:'marginBelow',bps:5000},['person:'+owner.id]),m=await prepare([{id:'main',label:'Delivery',price:'100'}]);row=await current(m.id);assert.equal(row.approval.required,true,'unrecorded cost never bypasses review');assert.equal((await current(m.id,people.sales.cookie)).approval.steps[0].name,'Internal approval review')
 await h.cmd('pricing.cost',{id:m.id,version:1,lineKey:row.internalPricing.lines[0].key,unitCost:'60'},people.manager.cookie);assert.equal((await current(m.id)).approval.required,true)
 row=await current(m.id);await h.cmd('pricing.cost',{id:m.id,version:2,lineKey:row.internalPricing.lines[0].key,unitCost:'40'},people.manager.cookie);assert.equal((await current(m.id)).approval.required,false)
 row=await current(m.id);await h.cmd('proposal.revise',{clientId:client.id,id:m.id,version:3,title:row.title,scope:row.scope,depositPercent:'25',packages:[{id:'main',label:'Delivery',price:'100',discountPercent:'30'}]},people.sales.cookie);assert.equal((await current(m.id)).approval.required,true)
 const key=await h.cmd('agent.create',{label:'Synthetic drafting agent'}),agent=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{clientId:client.id,title:'Agent private rule',scope:'Public',depositPercent:'25',packages:[{id:'main',label:'Delivery',price:'100'}]}},'',{authorization:'Bearer '+key.token});assert.equal(agent.status,200,agent.text);const context=await h.send('/api/platter/agent/context',undefined,'',{authorization:'Bearer '+key.token});assert.equal(context.status,200);assert.ok(context.value.proposals.find(r=>r.id===agent.value.id).approval.steps.every(s=>!s.canApprove),'an owner-bound key never inherits a personally named owner approval')
 await remove(margin.id)
 const terms=await rule('Standard payment terms',{kind:'paymentTerms',minimumDepositBps:5000,standardTerms:'Net 30'},['role:owner'])
 const low=await prepare([{id:'main',label:'Delivery',price:'100'}],{terms:'Net 30'}),standard=await prepare([{id:'main',label:'Delivery',price:'100'}],{depositPercent:'50',terms:'Net 30'}),different=await prepare([{id:'main',label:'Delivery',price:'100'}],{depositPercent:'50',terms:'Net 60'})
 assert.equal((await current(low.id)).approval.required,true);assert.equal((await current(standard.id)).approval.required,false);assert.equal((await current(different.id)).approval.required,true);const {scheduleFixture}=await import('./packages-fixture.mjs');for(const depositFixed of [null,'50']){const scheduled=await h.cmd('proposal.prepare',{...offer,clientId:client.id,depositPercent:'60',terms:'Net 30',paymentTerms:{...scheduleFixture(),depositFixed}});assert.equal((await current(scheduled.id)).approval.required,true,'A schedule needs explicit payment-term review');await h.cmd('proposal.send',{id:scheduled.id,version:1},h.owner,409);await h.cmd('proposal.approve',{id:scheduled.id,version:1,revision:1});await h.cmd('proposal.revise',{...offer,clientId:client.id,id:scheduled.id,version:2,depositPercent:'60',terms:'Net 30',paymentTerms:{...scheduleFixture(),depositFixed,netDays:30}});assert.equal((await current(scheduled.id)).approval.complete,false,'Schedule changes clear prior review');await h.cmd('proposal.send',{id:scheduled.id,version:3},h.owner,409)}await remove(terms.id)
 const sourceRule=await rule('Consultancy template',{kind:'template'},['role:owner'],0,['starter:consultancy']),consultancy=await h.cmd('template.start',{id:'starter:consultancy',version:1,clientId:client.id},people.sales.cookie),agency=await h.cmd('template.start',{id:'starter:agency',version:1,clientId:client.id},people.sales.cookie)
 assert.equal((await current(consultancy.id)).approval.required,true);assert.equal((await current(agency.id)).approval.required,false)
 const duplicate=await h.cmd('proposal.duplicate',{id:consultancy.id,version:1},people.sales.cookie);assert.equal((await current(duplicate.id)).approval.required,true,'a duplicate retains its template rule scope')
 const scoped=await rule('Agency manager',{kind:'totalOver',cents:0,currency:'USD'},['role:manager'],1,['starter:agency']);assert.deepEqual((await current(agency.id)).approval.steps.map(s=>s.id),[scoped.id]);assert.deepEqual((await current(consultancy.id)).approval.steps.map(s=>s.id),[sourceRule.id])
 const priorVersion=(await policy()).version;await h.cmd('approval.rule',{version:priorVersion,name:'Unknown template',condition:{kind:'template'},approvers:['role:owner'],position:2,templates:['synthetic-platter-missing']},h.owner,400);assert.equal((await policy()).version,priorVersion)
}))


test('TEAM-001 upgrading a pre-role database keeps former members as sales without inferring historical ownership',async()=>{
 const files=(await readdir('migrations/core')).filter(f=>f.endsWith('.sql')).sort()
 assert.ok(files.some(f=>f.startsWith('0038_')))
 const old=files.filter(f=>f<'0039_').at(-1),h=await harness({migrateThrough:old})
 try{
  assert.equal(await h.db.prepare("SELECT name FROM sqlite_master WHERE name='p_members'").first(),null)
  const owner=(await h.db.prepare("SELECT * FROM oa_operators WHERE role='owner'").first()),legacyId=crypto.randomUUID(),email='legacy-sales@synthetic-platter.example',clientId=crypto.randomUUID(),ownId=crypto.randomUUID(),foreignId=crypto.randomUUID(),unrecordedId=crypto.randomUUID()
  await h.db.prepare("INSERT INTO oa_operators(id,email,display_name,role,status,version,created_at) VALUES(?,?,?,'member','active',1,?)").bind(legacyId,email,'Former member',owner.created_at).run()
  await h.db.prepare('INSERT INTO p_clients(id,name,email) VALUES(?,?,?)').bind(clientId,'Synthetic upgrade client','upgrade-client@synthetic-platter.example').run()
  const legacy=JSON.parse((await readFile('fixtures/first-release-aud.ndjson','utf8')).split('\n').filter(Boolean).find(line=>{const x=JSON.parse(line);return x.kind==='part'&&x.items.some(i=>i.table==='p_proposals')})).items.find(i=>i.table==='p_proposals').row
  for(const [id,salesOwner,title] of [[ownId,legacyId,'Recorded own proposal'],[foreignId,owner.id,'Other owner proposal'],[unrecordedId,null,'Unrecorded historical ownership']]){
   await h.db.prepare("INSERT INTO p_proposals(id,client_id,title,scope,version,revision,status,deposit_bps,options,prepared_by,created_at,sales_owner_id,sales_owner_name,currency) VALUES(?,?,?,?,1,1,'draft',?,?,?,?,?,?,'AUD')").bind(id,clientId,title,legacy.scope,legacy.deposit_bps,legacy.options,email,owner.created_at,salesOwner,salesOwner===legacyId?'Former member':salesOwner?'Owner':null).run()
  }
  for(const file of files.filter(f=>f>old))await h.db.batch(unstable_splitSqlQuery(await readFile('migrations/core/'+file,'utf8')).map(sql=>h.db.prepare(sql)))
  const cookie=await h.signIn(email),state=await h.state(cookie)
  assert.equal(state.actor.role,'sales');assert.deepEqual(state.teams,[]);assert.deepEqual(state.proposals.map(p=>p.id),[ownId]);assert.equal(await h.db.prepare('SELECT operator_id FROM p_members WHERE operator_id=?').bind(legacyId).first(),null,'upgrade fallback does not invent membership or ownership')
  const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
  assert.equal((await h.send('/app/proposal?id='+ownId,undefined,cookie)).status,200)
  for(const id of [foreignId,unrecordedId])assert.equal((await h.send('/app/proposal?id='+id,undefined,cookie)).status,403)
  const report=await h.send('/api/platter/pipeline',undefined,cookie);assert.equal(report.status,200);assert.equal(report.value.count,1);assert.equal(report.value.rows[0].id,ownId)
  const upgraded=await h.state();assert.deepEqual(upgraded.workspaceDefaults,{remindersEnabled:true,reminderDays:[2,5,9],beforeExpiryDays:[3],reminderCap:3,expiryDays:60,warningDays:1,paymentMethods:['card'],version:0});assert.equal(upgraded.proposals.find(p=>p.id===ownId).reminderSettings,null);assert.equal(upgraded.proposals.find(p=>p.id===ownId).deliveryDefaults,undefined);assert.equal(upgraded.proposals.find(p=>p.id===ownId).expiry.mode,'never')
  const future=await h.cmd('proposal.prepare',{...offer,clientId});const copied=(await h.state()).proposals.find(p=>p.id===future.id);assert.deepEqual(copied.deliveryDefaults,{remindersEnabled:true,reminderDays:[2,5,9],beforeExpiryDays:[3],reminderCap:3,paymentMethods:['card']});assert.equal(copied.expiry.days,60);assert.equal(copied.expiry.warningDays,1);assert.equal(copied.reminderSettings,null);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_reminder_authority').first()).n,0)
 }finally{await h.close()}
})


test('EDIT-001 document revisions preserve ordered blocks and brand through preview, restore, copies, templates, negotiation and exact client PDF', {timeout:120000},async()=>{
 const h=await harness({assetsDirectory:'public'})
 try{
  const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
  const client=await h.cmd('client.save',{name:'Synthetic Platter client',email:'synthetic-platter-1@example.com'}),document=documentFixture()
  const fields={...offer,clientId:client.id,document,pricingTables:[{optionId:'one',name:'Placed services',lines:[{name:'Discovery',description:'A reviewed workshop',quantity:'2',unit:'hour',unitPrice:'10.01',group:''}]},{optionId:'one',name:'Unplaced contingency',lines:[{name:'Review',description:'',quantity:'1',unit:'hour',unitPrice:'10.00',group:''}]}]}
  document.blocks.splice(4,0,{id:'pricing',type:'pricing',title:'Investment detail',text:'',optionId:'one',tableIndex:0})
  const created=await h.cmd('proposal.prepare',fields)
  let p=(await h.state()).proposals.find(p=>p.id===created.id)
  assert.deepEqual(p.document,document)
  await h.cmd('proposal.autosave',{...fields,document:undefined,id:p.id,version:1,pricingTables:[fields.pricingTables[1]]},h.owner,400)
  assert.equal((await h.state()).proposals.find(v=>v.id===p.id).options[0].tables[0].name,'Placed services','native edits cannot silently rebind placed pricing to a different table')
  const preview=await h.send(`/app/preview/client?id=${p.id}&revision=1&optionId=two`,undefined,h.owner)
  assert.equal(preview.status,200);assert.match(preview.text,/Two perspectives/);assert.match(preview.text,/<strong>careful<\/strong>/);assert.match(preview.text,/Campaign timeline/)
  await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
  const edited=structuredClone(document);edited.blocks.reverse();edited.blocks.find(b=>b.id==='story').text='A revised approach.'
  const saved=await h.cmd('proposal.document',{id:p.id,version:2,document:edited})
  p=(await h.state()).proposals.find(p=>p.id===created.id)
  assert.equal(p.revision,2);assert.equal(p.status,'draft');assert.equal(p.approved_by,null);assert.deepEqual(p.document,edited)
  await h.cmd('proposal.send',{id:p.id,version:saved.version},h.owner,409)
  await h.cmd('proposal.document',{id:p.id,version:2,document},h.owner,409)
  await h.cmd('proposal.restore',{id:p.id,version:saved.version,revision:1})
  p=(await h.state()).proposals.find(p=>p.id===created.id);assert.deepEqual(p.document,document);assert.equal(p.revision,3)
  const compare=await h.send(`/app/proposal?id=${p.id}&from=1&to=2`,undefined,h.owner);assert.match(compare.text,/Document blocks and brand/);assert.match(compare.text,/A revised approach/)
  const copy=await h.cmd('proposal.duplicate',{id:p.id,version:p.version})
  assert.deepEqual((await h.state()).proposals.find(p=>p.id===copy.id).document,document)
  const template=await h.cmd('template.save',{id:p.id,version:p.version,name:'Document template'})
  const start=await h.cmd('template.start',{id:template.id,version:template.version,clientId:client.id})
  assert.deepEqual((await h.state()).proposals.find(p=>p.id===start.id).document,document)
  await h.cmd('proposal.approve',{id:p.id,version:p.version,revision:p.revision});p=(await h.state()).proposals.find(p=>p.id===created.id)
  const invitation=await h.cmd('proposal.send',{id:p.id,version:p.version}),path=new URL(invitation.shareUrl).pathname,cookie=await verified(h,path)
  const data=(await h.send(path+'/data.json?optionId=one',undefined,cookie)).value
  assert.deepEqual(data.document.blocks,document.blocks.filter(b=>b.id!=='extra'));assert.deepEqual(data.document.brand,document.brand)
  const raw=await h.mf.dispatchFetch(h.origin+path+'/download.pdf',{method:'POST',headers:{origin:h.origin,cookie,'content-type':'application/json'},body:JSON.stringify({optionId:'one'})})
  assert.equal(raw.status,200);const layout=await pdfPages(await raw.arrayBuffer(),true),pages=layout.map(p=>p.text),pdf=pages.join(' '),left=layout.flatMap(p=>p.items).find(i=>i.text.includes('First column content.')),right=layout.flatMap(p=>p.items).find(i=>i.text.includes('Second column content.'));assert.ok(left&&right&&right.x-left.x>200&&left.y===right.y,'PDF preserves the two-column layout')
  for(const page of pages)assert.ok(page.includes('Not signed, revision 3'))
  const titles=document.blocks.filter(b=>b.type!=='page_break'&&b.id!=='extra').map(b=>b.title);let at=-1;for(const title of titles){const next=pdf.indexOf(title,at+1);assert.ok(next>at,'PDF keeps block order for '+title);at=next}
  assert.ok(!pdf.includes('Campaign timeline'));assert.ok(pdf.includes('First column content.'));assert.ok(pdf.includes('Second column content.'));assert.ok(pdf.includes('USD 20.02'))
  p=(await h.state()).proposals.find(p=>p.id===created.id)
  await h.cmd('proposal.document',{id:p.id,version:p.version,document:edited},h.owner,409)
  await h.cmd('proposal.negotiate',{...fields,id:p.id,version:p.version,document:edited})
  assert.deepEqual((await h.send(path+'/data.json?optionId=two',undefined,cookie)).value.document,document,'live sent document stays frozen during negotiation')
  p=(await h.state()).proposals.find(p=>p.id===created.id)
  await h.cmd('proposal.approve',{id:p.id,version:p.version,revision:p.revision});p=(await h.state()).proposals.find(p=>p.id===created.id)
  const replaced=await h.cmd('proposal.send',{id:p.id,version:p.version}),nextPath=new URL(replaced.shareUrl).pathname,nextCookie=await verified(h,nextPath)
  assert.equal((await h.send(path,undefined,cookie)).status,404)
  assert.deepEqual((await h.send(nextPath+'/data.json?optionId=two',undefined,nextCookie)).value.document,edited)
  assert.equal((await h.send(nextPath+'/action?name=accept',{name:'Synthetic Platter signer',optionId:'two',consent:true},nextCookie)).status,200)
  const accepted=JSON.parse((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).snapshot)
  assert.deepEqual(accepted.document,edited)
  const agreementHtml=(await h.send(nextPath,undefined,nextCookie)).text,currentAccepted=(await h.state()).proposals.find(v=>v.id===created.id)
  await h.cmd('proposal.duplicate',{id:created.id,version:currentAccepted.version})
  assert.equal((await h.send(nextPath,undefined,nextCookie)).text,agreementHtml,'duplicating a branded accepted agreement preserves its exact response bytes')
  await h.cmd('proposal.approve',{id:copy.id,version:1,revision:1});const standard=await h.cmd('proposal.send',{id:copy.id,version:2}),standardPath=new URL(standard.shareUrl).pathname,standardCookie=await verified(h,standardPath)
  assert.equal((await h.send(standardPath+'/action?name=accept',{name:'Synthetic standard signer',optionId:'one',consent:true},standardCookie)).status,200)
  const standardAgreement=JSON.parse((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(copy.id).first()).snapshot);assert.ok(!standardAgreement.document.blocks.some(b=>b.id==='extra'),'accepted Standard document excludes the conditional timeline')

 }finally{await h.close()}
})

test('EDIT-001 block saves enforce live proposal scope, stale versions, content bounds, safe brand values and locked terms',()=>run(async h=>{
 const {client,p}=await draft(h),document=documentFixture()
 const malformed=[{version:2,blocks:[]},{version:1,blocks:[...document.blocks,document.blocks[0]]},{version:1,blocks:[{id:'x',type:'script',text:'bad'}]},{version:1,blocks:Array.from({length:401},(_,i)=>({id:'b'+i,type:'text'}))},{...document,brand:{...document.brand,accent:'url(synthetic-platter-1)'}},{...document,brand:{...document.brand,ink:'#ffffff'}},{version:1,blocks:[{id:'x',type:'text',condition:'missing',text:'Hidden'}]},{version:1,blocks:[{id:'x',type:'pricing',optionId:'one',tableIndex:0}]},{version:1,blocks:[{id:'x',type:'text',text:'x'.repeat(10001)}]}]
 const initial=(await h.state()).revisions.filter(r=>r.proposal_id===p.id)
 for(const value of malformed)await h.cmd('proposal.document',{id:p.id,version:1,document:value},h.owner,400)
 assert.deepEqual((await h.state()).revisions.filter(r=>r.proposal_id===p.id),initial,'invalid edits add no revision')
 const key=await h.cmd('agent.create',{label:'Synthetic Platter draft helper'})
 assert.equal((await h.send('/api/platter/agent/command',{name:'proposal.document',input:{id:p.id,version:1,document}},'',{authorization:'Bearer '+key.token})).status,403)
 assert.equal((await h.send('/api/platter/command',{name:'proposal.document',input:{id:p.id,version:1,document}})).status,401)
 await h.send('/auth/invite',{email:'synthetic-platter-2@example.com',displayName:'Unshared sales member',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('synthetic-platter-2@example.com')
 await h.cmd('proposal.document',{id:p.id,version:1,document},member,403)
 const saved=await h.cmd('proposal.document',{id:p.id,version:1,document})
 const template=await h.cmd('template.save',{id:p.id,version:saved.version,name:'Locked document'})
 await h.cmd('template.locks',{id:template.id,version:template.version,sections:['terms']})
 const started=await h.cmd('template.start',{id:template.id,version:template.version+1,clientId:client.id})
 const reordered=structuredClone(document);reordered.blocks.reverse()
 await h.cmd('proposal.share',{id:started.id,operatorId:(await h.state(member)).actor.id})
 await h.cmd('proposal.document',{id:started.id,version:1,document:reordered},member)
 const changed=structuredClone(reordered);changed.blocks.find(b=>b.type==='terms').text='Different legal terms.'
 await h.cmd('proposal.document',{id:started.id,version:2,document:changed},h.owner,403)
 const hidden=structuredClone(reordered);hidden.blocks.find(b=>b.type==='terms').condition='two'
 await h.cmd('proposal.document',{id:started.id,version:2,document:hidden},h.owner,403)
 const removed=structuredClone(reordered);removed.blocks=removed.blocks.filter(b=>b.type!=='terms')
 await h.cmd('proposal.document',{id:started.id,version:2,document:removed},h.owner,403)
 assert.deepEqual((await h.state()).proposals.find(p=>p.id===started.id).document,reordered)
 await h.cmd('proposal.document',{id:started.id,version:2,document:changed},member,403)
 await h.cmd('approval.policy',{version:0,required:false,defaultRole:'owner'})
 await h.cmd('approval.rule',{version:1,name:'Rich legal review',position:0,condition:{kind:'termsEdited'},approvers:['role:owner']})
 assert.equal((await h.state()).proposals.find(p=>p.id===started.id).approval.required,false,'moving locked terms does not change legal text')
 await h.cmd('proposal.unlock',{id:started.id,version:2,section:'terms'},member,403)
 await h.cmd('proposal.unlock',{id:started.id,version:2,section:'terms'})
 await h.cmd('proposal.document',{id:started.id,version:3,document:changed},member)
 const legalReview=(await h.state()).proposals.find(p=>p.id===started.id);assert.equal(legalReview.approval.required,true);assert.equal(legalReview.approval.complete,false)
 await h.cmd('proposal.send',{id:started.id,version:4},h.owner,409)
}))

test('EDIT-001 display media requires consent and live edit scope, stays private until placed and keeps exact bytes through copies and templates', {timeout:120000},async()=>{
 const h=await harness({assetsDirectory:'public'})
 try{
  const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
  assert.notEqual((await h.state()).workspaceDefaults.externalContentEnabled,true,'external content defaults off')
  await h.cmd('workspace.defaults',{version:0,externalContentEnabled:true})
  const {client,p}=await draft(h),bytes=await readFile('public/brand/apple-touch-icon.png')
  const upload=async(input={},cookie=h.owner)=>{const data=new FormData();data.set('id',p.id);data.set('version','1');data.set('consent','yes');for(const [key,value]of Object.entries(input))data.set(key,value);if(!data.has('file'))data.set('file',new File([bytes],'synthetic-platter-1.png',{type:'image/png'}));const request=new Request(h.origin+'/app/document-media',{method:'POST',headers:{origin:h.origin,cookie,accept:'application/json'},body:data});const r=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});return {status:r.status,text:await r.text()}}
  assert.equal((await upload({consent:'no'})).status,400)
  assert.equal((await upload({version:'999'})).status,409)
  assert.equal((await upload({file:new File(['<svg onload="alert(1)">'],'synthetic-platter-2.png',{type:'image/png'})})).status,400)
  assert.equal((await upload({file:new File([new Uint8Array(5*1024*1024+1)],'synthetic-platter-3.png',{type:'image/png'})})).status,413)
  const result=await upload();assert.equal(result.status,200,result.text);const image=JSON.parse(result.text).media,unplaced=JSON.parse((await upload({file:new File([bytes],'synthetic-platter-unplaced.png',{type:'image/png'})})).text).media
  const privatePath='/api/platter/document-media/'+p.id+'/'+image.id
  assert.equal((await h.send(privatePath)).status,401)
  assert.equal((await h.send(privatePath,undefined,h.owner)).status,404,'unplaced uploads are not document content')
  const document=documentFixture();document.brand.logoId=image.id;document.blocks.splice(2,0,{id:'photo',type:'image',title:'The studio image',text:'A retained original.',assetId:image.id,alt:'Synthetic Platter studio mark'})
  document.blocks.push({id:'gallery',type:'gallery',title:'Image gallery',text:'Retained gallery.',images:[{assetId:image.id,alt:'Gallery studio mark'}]},{id:'loom',type:'embed',title:'External introduction',text:'Click to load.',url:'https://www.loom.com/share/'+'a'.repeat(32),posterId:image.id,alt:'Loom introduction',consent:true})
  const initialRevisions=(await h.state()).revisions
  for(const url of ['https://www.loom.com.evil.example/embed/'+'a'.repeat(32),'http://www.loom.com/share/'+'a'.repeat(32),'https://user:pass@www.loom.com/share/'+'a'.repeat(32),'https://www.loom.com:444/share/'+'a'.repeat(32),'https://www.loom.com/other/'+'a'.repeat(32),'javascript:alert(1)']){const invalid=structuredClone(document);invalid.blocks.at(-1).url=url;await h.cmd('proposal.document',{id:p.id,version:1,document:invalid},h.owner,400)}
  for(const change of [{consent:false},{posterId:'missing'}]){const invalid=structuredClone(document);Object.assign(invalid.blocks.at(-1),change);await h.cmd('proposal.document',{id:p.id,version:1,document:invalid},h.owner,400)}
  const invalidGallery=structuredClone(document);invalidGallery.blocks.find(b=>b.id==='gallery').images[0].assetId='missing';await h.cmd('proposal.document',{id:p.id,version:1,document:invalidGallery},h.owner,400)
  invalidGallery.blocks.find(b=>b.id==='gallery').images=[null];await h.cmd('proposal.document',{id:p.id,version:1,document:invalidGallery},h.owner,400)
  assert.deepEqual((await h.state()).revisions,initialRevisions,'refused external content never writes a revision')
  document.blocks.at(-1).url='https://www.loom.com/embed/'+'a'.repeat(32)
  await h.cmd('proposal.document',{id:p.id,version:1,document})
  await h.send('/auth/invite',{email:'synthetic-platter-6@example.com',displayName:'Shared editor',role:'member',returnTo:'/app'},h.owner)
  const member=await h.signIn('synthetic-platter-6@example.com'),memberId=(await h.state(member)).actor.id;await h.cmd('proposal.share',{id:p.id,operatorId:memberId})
  const memberChange=structuredClone(document);memberChange.blocks.at(-1).url='https://www.loom.com/embed/'+'c'.repeat(32)
  await h.cmd('proposal.document',{id:p.id,version:2,document:memberChange},member,403)
  assert.deepEqual((await h.state()).proposals.find(row=>row.id===p.id).document,document,'a shared editor cannot change an external provider block')
  assert.equal((await h.state()).revisions.find(r=>r.proposal_id===p.id&&r.revision===2).snapshot.document.blocks.at(-1).consent,true,'author consent is retained in the immutable revision')
  const actual=await h.mf.dispatchFetch(h.origin+privatePath,{headers:{cookie:h.owner}});assert.equal(actual.status,200);assert.equal(actual.headers.get('content-disposition'),'inline');assert.deepEqual(Buffer.from(await actual.arrayBuffer()),bytes)
  const other=await h.cmd('proposal.prepare',{...offer,clientId:client.id});await h.cmd('proposal.document',{id:other.id,version:1,document},h.owner,400)
  const copy=await h.cmd('proposal.duplicate',{id:p.id,version:2});assert.equal((await h.send('/api/platter/document-media/'+copy.id+'/'+image.id,undefined,h.owner)).status,200);assert.deepEqual((await h.state()).proposals.find(p=>p.id===copy.id).documentMedia.map(f=>f.id),[image.id],'copies exclude files never placed in the source document')
  const template=await h.cmd('template.save',{id:p.id,version:2,name:'Retained media template'}),started=await h.cmd('template.start',{id:template.id,version:1,clientId:client.id})
  assert.equal((await h.send('/api/platter/document-media/'+started.id+'/'+image.id,undefined,h.owner)).status,200);assert.ok(!(await h.state()).proposals.find(p=>p.id===started.id).documentMedia.some(f=>f.id===unplaced.id),'templates cannot expose unplaced source uploads')
  await h.cmd('proposal.approve',{id:p.id,version:2,revision:2});const sent=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(sent.shareUrl).pathname
  const publicImage=await h.mf.dispatchFetch(h.origin+path+'/media/'+image.id);assert.equal(publicImage.status,200);assert.deepEqual(Buffer.from(await publicImage.arrayBuffer()),bytes)
  const cookie=await verified(h,path),pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf',{method:'POST',headers:{origin:h.origin,cookie,'content-type':'application/json'},body:JSON.stringify({optionId:'two'})});assert.equal(pdf.status,200)
  const pdfBytes=await pdf.arrayBuffer(),pages=await pdfPages(pdfBytes.slice(0));assert.ok(pages.join(' ').includes('The studio image'));assert.ok(pages.join(' ').includes(document.blocks.at(-1).url),'PDF names the canonical external playback URL')
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs'),parsed=await getDocument({data:new Uint8Array(pdfBytes),isEvalSupported:false}).promise
  try{const links=[];for(let i=1;i<=parsed.numPages;i++)links.push(...await (await parsed.getPage(i)).getAnnotations());assert.ok(links.some(a=>a.url===document.blocks.at(-1).url),'PDF has an actionable playback annotation')}finally{await parsed.destroy()}
  await h.cmd('workspace.defaults',{version:1,externalContentEnabled:false},member,403)
  await h.cmd('workspace.defaults',{version:1,externalContentEnabled:false})
  const disabled=await h.send(path,undefined,cookie);assert.match(disabled.text,/Loom content is disabled/);assert.ok(!disabled.text.includes('data-embed-url'))
  assert.equal((await h.send('/api/platter/audit?action=workspace.defaults',undefined,h.owner)).value.rows.length,2,'external policy changes are audited')
  await h.cmd('workspace.defaults',{version:2,externalContentEnabled:true})
  const html=await h.send(path,undefined,cookie);assert.equal(html.headers.get('content-security-policy').split(';').map(s=>s.trim()).find(s=>s.startsWith('frame-src ')),"frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://www.loom.com https://fast.wistia.net https://calendly.com https://drive.google.com");assert.ok(!html.text.includes('<iframe'),'providers are unloaded by default');assert.match(html.text,/data-external-embed/);assert.match(html.text,/Gallery studio mark/)

  await h.cmd('proposal.send',{id:p.id,version:4});assert.equal((await h.send(path+'/media/'+image.id)).status,404,'rotated invitations lose media authority too')
  for(const [url,canonical]of [['https://youtu.be/abcdefghijk?autoplay=1','https://www.youtube-nocookie.com/embed/abcdefghijk'],['https://vimeo.com/123456','https://player.vimeo.com/video/123456'],['https://loom.com/share/'+'b'.repeat(32)+'?sid=ignored','https://www.loom.com/embed/'+'b'.repeat(32)],['https://fast.wistia.com/embed/iframe/abcdefghij','https://fast.wistia.net/embed/iframe/abcdefghij'],['https://calendly.com/synthetic-platter-1/meeting?email=ignored','https://calendly.com/synthetic-platter-1/meeting'],['https://drive.google.com/file/d/synthetic-platter-1/view?usp=sharing','https://drive.google.com/file/d/synthetic-platter-1/preview']]){
   // Use this proposal's own uploaded poster, copied through the duplication door.
   const copy=await h.cmd('proposal.duplicate',{id:p.id,version:5}),placed=structuredClone(document);placed.blocks.at(-1).url=url
   await h.cmd('proposal.document',{id:copy.id,version:1,document:placed});const saved=(await h.state()).proposals.find(p=>p.id===copy.id);assert.equal(saved.document.blocks.at(-1).url,canonical,'only canonical playback paths reach client frames')
  }


  const auditBefore=(await h.send('/api/platter/audit?action=workspace.defaults',undefined,h.owner)).value.rows
  for(const role of ['manager','sales','content_editor','viewer','billing','admin']){
   const person=(await h.state()).teamPeople.find(row=>row.id===memberId)
   await h.cmd('member.set',{operatorId:memberId,version:person.version,role,teams:[]})
   if(role==='admin'){
    await h.cmd('workspace.defaults',{version:3,externalContentEnabled:false},member)
    await h.cmd('workspace.defaults',{version:4,externalContentEnabled:true},member)
    const copy=await h.cmd('proposal.duplicate',{id:p.id,version:5}),placed=structuredClone(document);placed.blocks.at(-1).url='https://vimeo.com/654321'
    await h.cmd('proposal.document',{id:copy.id,version:1,document:placed},member)
    assert.equal((await h.state()).proposals.find(row=>row.id===copy.id).document.blocks.at(-1).url,'https://player.vimeo.com/video/654321','admins may change external blocks')
   }else{
    await h.cmd('workspace.defaults',{version:3,externalContentEnabled:false},member,403)
    await h.cmd('proposal.document',{id:p.id,version:5,document:memberChange},member,403)
   }
  }
  const key=await h.cmd('agent.create',{label:'synthetic-platter-9000'})
  for(const name of ['workspace.defaults','proposal.document'])assert.equal((await h.send('/api/platter/agent/command',{name,input:{id:p.id,version:5,externalContentEnabled:false,document:memberChange}},'',{authorization:'Bearer '+key.token})).status,403)
  const auditAfter=(await h.send('/api/platter/audit?action=workspace.defaults',undefined,h.owner)).value.rows
  assert.equal(auditAfter.length,auditBefore.length+2,'every successful admin setting change is audited and denied changes add none')
  assert.equal(auditAfter.filter(row=>row.actor_role==='admin').length,2)

 }finally{await h.close()}
})

test('EDIT-001 Client-assigned required fields and typed signature blocks validate at signing and freeze exact values with the selected agreement',()=>run(async h=>{
 const {client,p}=await draft(h),document=documentFixture()
 document.blocks.push({id:'po',type:'field',title:'Purchase order',text:'Use the approved PO.',recipientRole:'client',fieldKind:'text',required:true},{id:'start',type:'field',title:'Project start',text:'',recipientRole:'client',fieldKind:'date',required:true},{id:'confirm',type:'field',title:'Confirm delivery address',text:'',recipientRole:'client',fieldKind:'checkbox',required:true},{id:'signature',type:'signature',title:'Client signature',text:'',recipientRole:'client'})
 await h.cmd('proposal.document',{id:p.id,version:1,document})
 const bound=(await h.state()).proposals.find(v=>v.id===p.id).document
 assert.ok(bound.blocks.filter(b=>['field','signature'].includes(b.type)).every(b=>b.recipientId===client.id))
 const other=await h.cmd('client.save',{name:'Second synthetic client',email:'synthetic-platter-3@example.com'}),copy=await h.cmd('proposal.duplicate',{id:p.id,version:2,clientId:other.id})
 assert.ok((await h.state()).proposals.find(v=>v.id===copy.id).document.blocks.filter(b=>['field','signature'].includes(b.type)).every(b=>b.recipientId===other.id))
 const template=await h.cmd('template.save',{id:p.id,version:2,name:'Client-assigned fields'}),started=await h.cmd('template.start',{id:template.id,version:1,clientId:other.id})
 assert.ok((await h.state()).proposals.find(v=>v.id===started.id).document.blocks.filter(b=>['field','signature'].includes(b.type)).every(b=>b.recipientId===other.id))
 await h.cmd('proposal.approve',{id:p.id,version:2,revision:2});const invitation=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(invitation.shareUrl).pathname,cookie=await verified(h,path)
 const input={optionId:'two',name:'Synthetic Platter signer',consent:true,'field:po':'synthetic-platter-4','field:start':'2026-11-01','field:confirm':true,'signature:signature':'Synthetic Platter signer'}
 for(const name of ['field:po','field:start','field:confirm','signature:signature']){const incomplete={...input};delete incomplete[name];const r=await h.send(path+'/action?name=accept',incomplete,cookie);assert.equal(r.status,400,r.text)}
 assert.equal((await h.send(path+'/action?name=accept',{...input,'field:start':'2026-02-30'},cookie)).status,400)
 assert.equal((await h.send(path+'/action?name=accept',{...input,'signature:signature':'A different name'},cookie)).status,400)
 assert.equal((await h.send(path+'/action?name=accept',{...input,'field:other':'Not assigned'},cookie)).status,400)
 assert.equal((await h.state()).proposals.find(v=>v.id===p.id).status,'sent')
 assert.equal((await h.send(path+'/action?name=accept',input,cookie)).status,200)
 const expected={po:'synthetic-platter-4',start:'2026-11-01',confirm:true,signature:'Synthetic Platter signer'}
 const data=(await h.send(path+'/data.json',undefined,cookie)).value;assert.deepEqual(data.acceptance.fieldValues,expected)
 assert.deepEqual((await h.state()).proposals.find(v=>v.id===p.id).acceptance.fieldValues,expected)
 const agreement=(await h.send(path,undefined,cookie)).text;assert.match(agreement,/synthetic-platter-4/);assert.match(agreement,/2026-11-01/)
 await h.send(path+'/action?name=accept',{...input,'field:po':'Changed'},cookie)
 assert.deepEqual((await h.send(path+'/data.json',undefined,cookie)).value.acceptance.fieldValues,expected,'replay cannot rewrite accepted fields')
}))

test('EDIT-001 new sections inherit verified questions and opt-in tracked edits without changing the sent document or bypassing review',()=>run(async h=>{
 const {client,p}=await draft(h),document=documentFixture();await h.cmd('proposal.document',{id:p.id,version:1,document});await h.cmd('proposal.approve',{id:p.id,version:2,revision:2})
 const invitation=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(invitation.shareUrl).pathname,cookie=await verified(h,path)
 const question={revision:2,section:'block:story',text:'Can the plan include a handoff?'}
 assert.equal((await h.send(path+'/action?name=question.create',question)).status,401)
 assert.equal((await h.send(path+'/action?name=question.create',{...question,section:'block:missing'},cookie)).status,400)
 assert.equal((await h.send(path+'/action?name=question.create',{...question,section:'block:extra'},cookie)).status,400,'hidden conditional sections are not question targets for this selection')
 assert.equal((await h.send(path+'/action?name=question.create',question,cookie)).status,200)
 let current=(await h.state()).proposals.find(v=>v.id===p.id)
 assert.equal(current.questions[0].block_id,'story');assert.equal(current.questions[0].block_title,'Our approach')
 await h.cmd('question.answer',{id:p.id,questionId:current.questions[0].id,text:'Yes, the handoff is included.',requestId:crypto.randomUUID()})
 assert.match((await h.send(path,undefined,cookie)).text,/Yes, the handoff is included/)
 const suggested={revision:2,section:'block:story:text',original:'clear',replacement:'weekly'}
 assert.equal((await h.send(path+'/action?name=suggestion.create',suggested,cookie)).status,409,'new sections default to suggestions off')
 await h.cmd('suggestions.allow',{id:p.id,version:4,section:suggested.section,enabled:true})
 assert.equal((await h.send(path+'/action?name=suggestion.create',suggested)).status,401)
 assert.equal((await h.send(path+'/action?name=suggestion.create',{...suggested,section:'block:pricing:cents'},cookie)).status,400)
 assert.equal((await h.send(path+'/action?name=suggestion.create',suggested,cookie)).status,200)
 current=(await h.state()).proposals.find(v=>v.id===p.id)
 await h.cmd('suggestion.resolve',{id:p.id,version:current.version,suggestionId:current.suggestions[0].id,decision:'accepted'})
 const negotiated=(await h.state()).proposals.find(v=>v.id===p.id)
 assert.equal(negotiated.status,'draft');assert.equal(negotiated.approved_by,null);assert.ok(negotiated.document.blocks.find(b=>b.id==='story').text.includes('weekly'))
 assert.deepEqual((await h.send(path+'/data.json?optionId=two',undefined,cookie)).value.document,document,'client offer remains the exact sent document')
 await h.cmd('proposal.send',{id:p.id,version:negotiated.version},h.owner,409)
}))

test('EDIT-011 server-confirmed quantity edits retain document content, clear approval and enforce bounds, scope and exact version',()=>run(async h=>{
 const client=await h.cmd('client.save',{name:'Synthetic Platter client',email:'synthetic-platter-1@example.com'}),document=documentFixture(),created=await h.cmd('proposal.prepare',{...offer,clientId:client.id,document,pricingTables:[{optionId:'one',name:'Reference services',lines:[{name:'Discovery',description:'Reviewed service',quantity:'2',unit:'hour',unitPrice:'10.01',group:''}]}]})
 const input={id:created.id,version:1,optionId:'one',tableIndex:0,lineIndex:0,quantity:'3'}
 for(const quantity of ['0','-1','NaN','1.0001','1000001'])await h.cmd('proposal.quantity',{...input,quantity},h.owner,400)
 await h.cmd('proposal.quantity',{...input,lineIndex:1},h.owner,400)
 await h.cmd('proposal.quantity',{...input,optionId:'missing'},h.owner,400)
 await h.cmd('proposal.quantity',{...input,version:999},h.owner,409)
 const before=(await h.state()).revisions.filter(r=>r.proposal_id===created.id)
 await h.cmd('proposal.approve',{id:created.id,version:1,revision:1})
 const changed=await h.cmd('proposal.quantity',{...input,version:2})
 assert.equal(changed.option.cents,3003);assert.equal(changed.version,3);assert.equal(changed.revision,2)
 const current=(await h.state()).proposals.find(p=>p.id===created.id);assert.deepEqual(current.document,document);assert.equal(current.options[0].tables[0].lines[0].quantity,'3');assert.equal(current.approved_by,null);assert.equal(current.status,'draft')
 assert.deepEqual((await h.state()).revisions.filter(r=>r.proposal_id===created.id&&r.revision===1),before)
 await h.cmd('proposal.quantity',{...input,version:2},h.owner,409)
 await h.send('/auth/invite',{email:'synthetic-platter-2@example.com',displayName:'Unshared member',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('synthetic-platter-2@example.com');await h.cmd('proposal.quantity',{...input,version:3},member,403)
}))

test('EDIT-003 linked draft copies propagate atomically while detached, sent and accepted copies retain exact content',()=>run(async h=>{
 const {client}=await draft(h),item=await h.cmd('library.save',{title:'Synthetic case study',kind:'case_study',content:'Original client story'})
 const make=async title=>h.cmd('proposal.prepare',{...offer,title,clientId:client.id})
 const read=async id=>(await h.state()).proposals.find(p=>p.id===id)
 const insert=async(p,mode)=>h.cmd('library.insert',{id:p.id,version:p.version,itemId:item.id,itemVersion:1,mode,consent:true})
 const linked=await make('Linked draft'),detached=await make('Detached draft'),frozen=await make('Sent story')
 await insert(linked,'linked');await insert(detached,'detached');await insert(frozen,'linked')
 const source=await read(linked.id),copy=await h.cmd('proposal.duplicate',{id:linked.id,version:source.version}),template=await h.cmd('template.save',{id:linked.id,version:source.version,name:'Independent library template'}),started=await h.cmd('template.start',{id:template.id,version:1,clientId:client.id})
 let p=await read(frozen.id);await h.cmd('proposal.approve',{id:p.id,version:p.version,revision:p.revision});p=await read(frozen.id)
 const path=new URL((await h.cmd('proposal.send',{id:p.id,version:p.version})).shareUrl).pathname,cookie=await verified(h,path)
 let l=await read(linked.id);await h.cmd('proposal.approve',{id:l.id,version:l.version,revision:l.revision})
 const frozenBefore=await read(frozen.id),history=(await h.state()).revisions
 const usage=(await h.state()).libraryItems.find(i=>i.id===item.id).uses
 assert.deepEqual(new Set(usage.map(u=>u.proposalId)),new Set([linked.id,detached.id,frozen.id]));assert.equal(usage.find(u=>u.proposalId===frozen.id).frozen,true)
 await h.cmd('library.save',{id:item.id,version:1,title:'Updated case study',kind:'case_study',content:'Updated client story'})
 l=await read(linked.id);assert.equal(l.document.blocks[0].text,'Updated client story');assert.equal(l.status,'draft');assert.equal(l.approved_by,null)
 assert.equal((await read(detached.id)).document.blocks[0].text,'Original client story');assert.deepEqual(await read(frozen.id),frozenBefore)
 for(const independent of [copy,started])assert.equal((await read(independent.id)).document.blocks[0].text,'Original client story','copies and template starts retain independent text')
 for(const r of history)assert.deepEqual((await h.state()).revisions.find(n=>n.proposal_id===r.proposal_id&&n.revision===r.revision),r)
 const live=await h.send(path,undefined,cookie);assert.match(live.text,/Original client story/);assert.doesNotMatch(live.text,/Updated client story/)
 await h.cmd('library.insert',{id:frozen.id,version:frozenBefore.version,itemId:item.id,itemVersion:2,mode:'linked',consent:true},h.owner,409)
 await h.cmd('proposal.negotiate',{...offer,id:frozen.id,version:frozenBefore.version,clientId:client.id})
 await h.cmd('library.save',{id:item.id,version:2,title:'Updated case study',kind:'case_study',content:'Negotiated story'})
 assert.equal((await read(frozen.id)).document.blocks[0].text,'Negotiated story');assert.match((await h.send(path,undefined,cookie)).text,/Original client story/)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Synthetic client',optionId:'one',consent:true},cookie)).status,200)
 const accepted=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(frozen.id).first(),acceptedView=await read(frozen.id)
 await h.cmd('library.save',{id:item.id,version:3,title:'Updated case study',kind:'case_study',content:'Final library story'})
 assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(frozen.id).first(),accepted)
 assert.equal((await read(linked.id)).document.blocks[0].text,'Final library story')
 const updated=await read(linked.id),block=updated.document.blocks[0]
 await h.cmd('proposal.document',{id:linked.id,version:updated.version,document:{...updated.document,blocks:[{...block,text:'Local independent edit'}]}})
 const edited=await read(linked.id)
 await h.cmd('proposal.document',{id:linked.id,version:edited.version,document:{...edited.document,blocks:[{...block,text:'Final library story'}]}})
 await h.cmd('library.save',{id:item.id,version:4,title:'Updated case study',kind:'case_study',content:'Later library text'})
 assert.equal((await read(linked.id)).document.blocks[0].text,'Final library story','restoring matching text never silently relinks a manually detached copy')
 const afterAcceptance=await read(frozen.id);assert.deepEqual(afterAcceptance,acceptedView,'the accepted proposal stays byte-identical after later library edits')
 await richLibraryPropagation(h,client.id)

}))

test('EDIT-003 insertion enforces live role, folder and proposal scope, consent, stale versions and locked terms without writes',()=>run(async h=>{
 const {client,p}=await draft(h),item=await h.cmd('library.save',{title:'Terms',kind:'terms',content:'Reviewed terms'})
 await h.send('/auth/invite',{email:'sales-library@synthetic-platter.example',displayName:'Sales',role:'member',returnTo:'/app'},h.owner)
 const sales=await h.signIn('sales-library@synthetic-platter.example'),person=(await h.state(sales)).actor
 const input={id:p.id,version:1,itemId:item.id,itemVersion:1,mode:'linked',consent:true}
 const before=await h.state();await h.cmd('library.insert',input,sales,403);assert.deepEqual(await h.state(),before)
 for(const consent of [false,undefined,'no']){const refused={...input,consent};await h.cmd('library.insert',refused,h.owner,400);assert.deepEqual(await h.state(),before,'absent or revoked insertion consent writes nothing')}
 await h.cmd('library.insert',{...input,consent:false},h.owner,400);await h.cmd('library.insert',{...input,itemVersion:2},h.owner,409)
 await h.cmd('proposal.share',{id:p.id,operatorId:person.id});await h.cmd('library.insert',input,sales)
 await h.cmd('proposal.share',{id:p.id,operatorId:person.id,shared:false})
 const revokedBefore=await h.state();await h.cmd('library.insert',{...input,version:2},sales,403);assert.deepEqual(await h.state(),revokedBefore,'revoked editor authority refuses insertion despite earlier consent')
 const current=(await h.state()).proposals.find(n=>n.id===p.id),template=await h.cmd('template.save',{id:p.id,version:current.version,name:'Locked terms'})
 await h.cmd('template.locks',{id:template.id,version:1,sections:['terms']})
 const locked=await h.cmd('template.start',{id:template.id,version:2,clientId:client.id})
 await h.cmd('library.insert',{...input,id:locked.id,version:1},h.owner,403)
 const folder=await h.cmd('folder.save',{kind:'library',name:'Private team',teams:[(await h.cmd('team.create',{name:'Private'})).id],shareConsent:true})
 const privateItem=await h.cmd('library.save',{title:'Private case',kind:'case_study',content:'Team-only story',folderId:folder.id})
 await h.cmd('library.insert',{...input,version:current.version,itemId:privateItem.id},sales,403)
 assert.ok(!(await h.state(sales)).libraryItems.some(i=>i.id===privateItem.id))
 const own=await h.cmd('proposal.prepare',{...offer,title:'Other sales story',clientId:client.id},sales)
 await h.cmd('library.insert',{...input,id:own.id,version:1},sales)
 await h.send('/auth/invite',{email:'editor-library@synthetic-platter.example',displayName:'Editor',role:'member',returnTo:'/app'},h.owner)
 const editor=await h.signIn('editor-library@synthetic-platter.example'),editorId=(await h.state(editor)).actor.id
 await h.cmd('member.set',{operatorId:editorId,version:0,role:'content_editor',teams:[]})
 assert.equal((await h.state(editor)).libraryItems.find(i=>i.id===item.id).uses.length,0,'usage never reveals out-of-scope proposals')
 await h.cmd('library.save',{id:item.id,version:1,title:'Terms',kind:'terms',content:'Updated authorized terms'},editor)
 assert.equal((await h.state(sales)).proposals.find(n=>n.id===own.id).document.blocks[0].text,'Updated authorized terms')
 const lockedLink=await h.cmd('library.save',{title:'Case study',kind:'case_study',content:'An authorized story'})
 await h.cmd('library.insert',{id:locked.id,version:1,itemId:lockedLink.id,itemVersion:1,mode:'linked',consent:true})
 const lockBefore=await h.state()
 await h.cmd('library.save',{id:lockedLink.id,version:1,title:'New terms',kind:'terms',content:'Must not bypass a terms lock'},h.owner,403)
 assert.deepEqual(await h.state(),lockBefore,'locked-term refusal rolls back the library edit, propagation and every revision')
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {source}=await richLibrarySource(h,client.id),capture={title:'Shared image',kind:'image',sourceRef:source.id+':image',shareConsent:true}
 const privateSource=await h.state();await h.cmd('library.save',capture,editor,403);assert.deepEqual(await h.state(),privateSource,'library editing rights do not expose an out-of-scope source proposal')
 await h.cmd('proposal.share',{id:source.id,operatorId:editorId});await h.cmd('library.save',capture,editor)
 for(const role of ['viewer','billing']){
  const email=role+'-library@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner)
  const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id;await h.cmd('member.set',{operatorId:id,version:0,role,teams:[]})
  const before=await h.state();await h.cmd('library.insert',{...input,id:own.id,version:2},cookie,403);assert.deepEqual(await h.state(),before)
 }
}))


async function collectionHarness(){
 const intents=new Map();let next=0
 const h=await harness({outboundService:async request=>{
  const url=new URL(request.url),path=url.pathname
  if(path==='/v1/account')return Response.json({id:'synthetic-platter-account',default_currency:'usd'})
  if(path==='/v1/payment_intents'&&request.method==='POST'){
   const form=new URLSearchParams(await request.text()),id='synthetic-platter-intent-'+(++next),intent={id,amount:Number(form.get('amount')),currency:form.get('currency'),status:'requires_payment_method',client_secret:'synthetic-platter-client-'+next,payment_method_types:[form.get('excluded_payment_method_types[]')==='card'?'us_bank_account':'card'],metadata:{platter_proposal_id:form.get('metadata[platter_proposal_id]'),platter_revision:form.get('metadata[platter_revision]')}};intents.set(id,intent);return Response.json(intent)
  }
  const id=path.split('/').at(-1);assert.ok(intents.has(id),'only bound Stripe requests are sent');return Response.json(intents.get(id))
 }})
 await h.cmd('provider.connect',{provider:'stripe',version:0,token:'synthetic-platter-1',publishableKey:'synthetic-platter-2',consent:true})
 return {h,intents}
}

test('deposit signatures survive declines, required acceptance waits for Stripe success and due acceptance stays complete',async()=>{
 const {h,intents}=await collectionHarness()
 try{
  await collectionLifecycle(h,async(id,outcome)=>{const intent=intents.get(id);intent.status=outcome==='success'?'succeeded':'requires_payment_method';if(outcome==='success')intent.latest_charge={id:'synthetic-platter-charge-'+id,paid:true,status:'succeeded',amount:intent.amount,currency:intent.currency}})
 }finally{await h.close()}
})

test('card fees require admin confirmation, remain separate and exempt ACH and prohibited billing states',async()=>{
 const {h}=await collectionHarness()
 try{await collectionFees(h)}finally{await h.close()}
})

test('proposal methods copy template overrides or workspace defaults and remain independent',()=>run(collectionMethodInheritance))

test('TRACK-001 opted-in views retain trusted coarse location, verification and device with quiet-period owner alerts',()=>run(async h=>{
 const {p,path}=await sent(h),at=Date.parse('2028-03-10T12:00:00Z')
 await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})
 const clock=async n=>h.db.prepare('INSERT INTO p_expiry_clock VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(at+n*60000).run()
 const open=async(cf,ua,cookie='')=>{const r=await h.mf.dispatchFetch(h.origin+path,{cf,headers:{host:new URL(h.origin).host,'user-agent':ua,cookie,'x-forwarded-for':'192.0.2.123'}});assert.equal(r.status,200);return r.text()}
 await clock(0);await open({city:'Austin',region:'Texas',country:'US'},'Desktop')
 assert.deepEqual((await h.state()).tracking.views,[])
 await h.cmd('tracking.settings',{enabled:'yes',alerts:'yes',retentionDays:90,quietMinutes:30,consent:'yes'})
 await open({city:'Austin',region:'Texas',country:'US'},'Desktop')
 await clock(10);await open({city:'Austin',region:'Texas',country:'US'},'Desktop')
 assert.equal((await h.state()).tracking.alerts.length,1)
 await clock(55);const cookie=await verified(h,path);await open({city:'Portland',region:'Oregon',country:'US'},'iPhone Mobile',cookie)
 const t=(await h.state()).tracking
 assert.equal(t.views.length,3);assert.deepEqual(t.views.map(v=>[v.city,v.region,v.country,v.device,v.verified]),[['Austin','Texas','United States','desktop',0],['Austin','Texas','United States','desktop',0],['Portland','Oregon','United States','phone',1]])
 assert.deepEqual(t.alerts.map(a=>a.kind),['first','return']);assert.deepEqual(t.alerts.map(a=>a.alerted_at),[at,at+55*60000]);assert.ok(t.views.every(v=>v.proposal_id===p.id&&v.recipient==='avery@northstar.example'&&v.revision===1));assert.ok(!JSON.stringify(t).includes('192.0.2.123'))
 const replacement=await h.cmd('signer.replace',{id:p.id,version:3,recipient:'coo@northstar.example',reason:'COO will review and sign'})
 const secondPath=new URL(replacement.shareUrl).pathname,secondCookie=await verified(h,secondPath)
 const second=await h.mf.dispatchFetch(h.origin+secondPath,{cf:{city:'Portland',region:'Oregon',country:'US'},headers:{host:new URL(h.origin).host,'user-agent':'iPhone Mobile',cookie:secondCookie}});assert.equal(second.status,200)
 const recipients=(await h.state()).tracking.views;assert.equal(recipients.length,4);assert.deepEqual([...new Set(recipients.map(v=>v.recipient))],['avery@northstar.example','coo@northstar.example']);assert.deepEqual(recipients.at(-1)&&[recipients.at(-1).city,recipients.at(-1).device,recipients.at(-1).verified],['Portland','phone',1])
 const page=await h.send('/app/proposal?id='+p.id,undefined,h.owner);assert.match(page.text,/Unverified link view/);assert.match(page.text,/Verified mailbox/);assert.match(page.text,/Return visit/)
 await h.send('/auth/invite',{email:'tracking-member@studio.example',displayName:'Member',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('tracking-member@studio.example');await h.cmd('proposal.share',{id:p.id,operatorId:(await h.state(member)).actor.id});assert.equal((await h.state(member)).tracking,undefined)
 await h.cmd('tracking.settings',{enabled:'yes',alerts:'yes',retentionDays:90,quietMinutes:30,consent:'yes'},member,403)
 assert.equal((await h.send('/api/platter/tracking-alerts')).status,401)
 let notices=await h.send('/api/platter/tracking-alerts',undefined,h.owner);assert.equal(notices.status,200);assert.equal(notices.value.alerts.length,3);assert.ok(notices.value.alerts.some(n=>n.kind==='return'));assert.ok(!JSON.stringify(notices.value).includes('avery@northstar.example'));assert.ok(!JSON.stringify(notices.value).includes('Portland'))
 assert.deepEqual((await h.send('/api/platter/tracking-alerts',undefined,member)).value.alerts,[])
 const sentByMember=await h.cmd('proposal.send',{id:p.id,version:4},member);await clock(100);assert.equal((await h.send(new URL(sentByMember.shareUrl).pathname)).status,200)
 notices=await h.send('/api/platter/tracking-alerts',undefined,member);assert.equal(notices.value.alerts.length,1);assert.equal(notices.value.alerts[0].proposalId,p.id);assert.equal(notices.value.alerts[0].kind,'return');assert.ok(!JSON.stringify(notices.value).includes('avery@northstar.example'))
 await h.cmd('proposal.share',{id:p.id,operatorId:(await h.state(member)).actor.id,shared:false});assert.deepEqual((await h.send('/api/platter/tracking-alerts',undefined,member)).value.alerts,[])
 const audit=(await h.send('/api/platter/audit?action=tracking.settings',undefined,h.owner)).value.rows;assert.ok(audit.some(a=>a.action==='tracking.settings'&&a.actor_role==='owner'))
}))

test('TRACK-004 disclosure, bounded retention and explicit erasure respect holds and owner authority',()=>run(async h=>{
 const {p,path}=await sent(h),settings={enabled:'yes',alerts:'no',retentionDays:90,quietMinutes:30,consent:'yes'}
 assert.equal((await h.state()).tracking.settings.retention_days,90)
 await h.cmd('tracking.settings',{...settings,consent:'no'},h.owner,400)
 for(const retentionDays of [1,365])await h.cmd('tracking.settings',{...settings,retentionDays})
 for(const retentionDays of [0,366,1.5])await h.cmd('tracking.settings',{...settings,retentionDays},h.owner,400)
 await h.cmd('tracking.settings',settings);const page=await h.send(path,undefined,'',{'x-forwarded-for':'192.0.2.123'});assert.match(page.text,/Views of this page are measured/);assert.match(page.text,/90 days/)
 let t=(await h.state()).tracking;assert.equal(t.views.length,1);assert.equal(t.alerts.length,0);assert.ok(!JSON.stringify(t.views).includes('192.0.2.123'))
 await h.db.prepare('UPDATE p_views SET viewed_at=? WHERE proposal_id=?').bind(Date.now()-91*86400000,p.id).run()
 await h.cmd('tracking.hold',{id:p.id,held:'yes',reason:'Pending dispute'})
 await h.cmd('tracking.settings',settings);assert.equal((await h.state()).tracking.views.length,1)
 await h.cmd('tracking.erase',{id:p.id,confirm:'erase'},h.owner,409)
 await h.cmd('tracking.hold',{id:p.id,held:'no'});await h.cmd('tracking.settings',settings);assert.equal((await h.state()).tracking.views.length,0)
 await h.cmd('tracking.settings',{...settings,alerts:'yes'});await h.send(path)
 await h.db.prepare('UPDATE p_tracking_alerts SET alerted_at=? WHERE proposal_id=?').bind(Date.now()-91*86400000,p.id).run()
 assert.deepEqual((await h.send('/api/platter/tracking-alerts',undefined,h.owner)).value.alerts,[],'Polling alone enforces retention before notices leave the server')
 await h.cmd('tracking.erase',{id:p.id,confirm:'no'},h.owner,400);assert.equal((await h.state()).tracking.views.length,1)
 await h.cmd('tracking.erase',{id:p.id,confirm:'erase'});assert.equal((await h.state()).tracking.views.length,0)
 await h.cmd('tracking.settings',{...settings,enabled:'no'});assert.match((await h.send(path)).text,/View measurement is off/);assert.equal((await h.state()).tracking.views.length,0)
 const audit=(await h.send('/api/platter/audit?subject='+p.id,undefined,h.owner)).value.rows;for(const action of ['tracking.hold','tracking.erase'])assert.ok(audit.some(a=>a.action===action))
}))

test('TRACK-001 measured views use trusted coarse locations, label identity, claim quiet-period alerts and preserve preview isolation',()=>run(async h=>{
 const finished=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':['application','x-www-form-urlencoded'].join('/')},body:'confirm=yes',redirect:'manual'});assert.equal(finished.status,303)
 const {p,path}=await sent(h),at=Date.parse('2027-04-01T12:00:00Z')
 await h.cmd('expiry.remove',{id:p.id,version:3})
 const advance=async n=>h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(at+n*60000).run()
 const read=async()=>{const r=await h.send('/api/platter/engagement?id='+p.id,undefined,h.owner);assert.equal(r.status,200,r.text);return r.value}
 await h.send(path);assert.equal((await read()).views.length,0,'tracking starts off')
 await h.cmd('tracking.settings',{id:p.id,enabled:'yes',consent:'yes',alerts:'yes',quietMinutes:30,retentionDays:90})
 await advance(0)
 const open=async(device,cf)=>{const r=await h.mf.dispatchFetch(h.origin+path,{headers:{host:new URL(h.origin).host,'user-agent':device,'cf-connecting-ip':cf.city==='Austin'?'192.0.2.1':'198.51.100.2'},cf});assert.equal(r.status,200);return r.text()}
 assert.match(await open('Desktop',{city:'Austin',region:'Texas',country:'US'}),/Views of this page are measured/)
 await advance(10);await open('iPhone Mobile',{city:'Portland',region:'Oregon',country:'US'})
 let data=await read();assert.equal(data.views.length,2);assert.deepEqual(data.views.map(v=>[v.device,v.city,v.region,v.country,v.verified]),[['desktop','Austin','Texas','United States',0],['phone','Portland','Oregon','United States',0]])
 const alerts=async()=> (await h.db.prepare('SELECT * FROM p_tracking_alerts').all()).results
 assert.equal((await alerts()).length,1)
 await advance(55);await Promise.all([open('Desktop',{city:'Austin',region:'Texas',country:'US'}),open('Desktop',{city:'Austin',region:'Texas',country:'US'})])
 assert.equal((await alerts()).length,2,'concurrent return visits claim exactly one quiet-period alert')
 assert.equal((await alerts()).filter(m=>m.kind==='return').length,1)
 assert.ok((await alerts()).every(m=>m.sender_id))
 const serialized=JSON.stringify((await read()).views);for(const raw of ['192.0.2.1','198.51.100.2','iPhone Mobile'])assert.ok(!serialized.includes(raw))
 const cookie=await verified(h,path);await h.send(path,undefined,cookie)
 assert.equal((await read()).views.filter(v=>v.verified).length,1)
 assert.equal((await h.send('/api/platter/pipeline?status=viewed&sort=value',undefined,h.owner)).value.rows[0].id,p.id)
 const draftProposal={p:await h.cmd('proposal.prepare',{...offer,clientId:(await h.state()).proposals.find(x=>x.id===p.id).client_id,title:'Preview isolation'})},before=await h.db.prepare('SELECT COUNT(*) AS n FROM p_views').first()
 await h.cmd('tracking.settings',{id:draftProposal.p.id,enabled:'yes',consent:'yes',alerts:'yes',quietMinutes:30,retentionDays:90})
 assert.equal((await h.send('/app/preview?id='+draftProposal.p.id+'&revision=1',undefined,h.owner)).status,200)
 assert.deepEqual(await h.db.prepare('SELECT COUNT(*) AS n FROM p_views').first(),before)
 await h.send('/auth/invite',{email:'tracking-member@studio.example',displayName:'Member',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('tracking-member@studio.example')
 assert.equal((await h.send('/api/platter/engagement?id='+p.id,undefined,member)).status,403)
 await h.cmd('tracking.settings',{id:p.id,enabled:'yes',consent:'yes',alerts:'yes',quietMinutes:30,retentionDays:90},member,403)
 assert.equal((await h.send('/api/platter/engagement?id='+p.id)).status,401)
}))

test('TRACK-004 owner retention and erasure remove views and dependent engagement without changing proposal records',()=>run(async h=>{
 const {p,path}=await sent(h),at=Date.parse('2027-05-01T12:00:00Z')
 const clock=async n=>h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(at+n).run()
 await clock(0);await h.cmd('tracking.settings',{id:p.id,enabled:'yes',consent:'yes',alerts:'no',quietMinutes:30,retentionDays:365})
 const page=await h.send(path),viewId=page.text.match(/data-engagement-view="([^"]+)"/)[1]
 const event=async(section,milliseconds,optionId='two')=>h.send(path+'/engagement',{viewId,section,milliseconds,optionId})
 await clock(45000);assert.equal((await event('pricing',40000)).status,200)
 let data
 const retained=await h.send(path),newId=retained.text.match(/data-engagement-view="([^"]+)"/)[1]
 await h.db.prepare('UPDATE p_views SET viewed_at=? WHERE id=?').bind(at-91*86400000,viewId).run()
 await h.cmd('tracking.settings',{id:p.id,enabled:'yes',consent:'yes',alerts:'no',quietMinutes:30,retentionDays:90})
 data=(await h.send('/api/platter/engagement?id='+p.id,undefined,h.owner)).value
 assert.deepEqual(data.views.map(v=>v.id),[newId]);assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_tracking_reading').first()).n,0)
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_tracking_transport WHERE view_id=?').bind(viewId).first()).n,0)
 await h.cmd('tracking.hold',{id:p.id,held:'yes',reason:'Retain current engagement details'})
 await h.cmd('tracking.erase',{id:p.id,confirm:'erase'},h.owner,409)
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_views').first()).n,1)
 await h.cmd('tracking.hold',{id:p.id,held:'no'})
 await h.cmd('tracking.erase',{id:p.id,confirm:'wrong'},h.owner,400)
 await h.cmd('tracking.erase',{id:p.id,confirm:'erase'})
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_views').first()).n,0)
 assert.ok(!(await h.state()).outbox.some(m=>m.subject.startsWith('Proposal opened:')),'alerts require separate explicit consent')
 await h.cmd('tracking.settings',{id:p.id,enabled:'no',alerts:'no',quietMinutes:30,retentionDays:90})
 assert.equal((await h.send(path+'/engagement',{viewId:newId,section:'scope',milliseconds:1})).status,403)
}))


test('TRACK-002 reading events retain monotonic section times and validated package choices on the exact view',()=>run(async h=>{
 const {client}=await draft(h),at=Date.parse('2027-05-01T12:00:00Z')
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':['application','x-www-form-urlencoded'].join('/')},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id,document:{version:1,blocks:[{id:'case-stable',type:'case_study',title:'Case study',text:'Synthetic Platter case study'}]},packages:[{id:'one',label:'Essential',price:'2400',optionalItems:[{id:'rush',label:'Rush',unitPrice:'100',min:1,max:3,quantity:1,editable:true}]},{id:'two',label:'Campaign',price:'4200'}]})
 const form=new FormData();form.set('id',p.id);form.set('version','1');form.set('file',new File(['Synthetic Platter attachment'],'synthetic-platter-1.txt',{type:['text','plain'].join('/')}))
 const request=new Request(h.origin+'/app/attachment',{method:'POST',headers:{origin:h.origin,cookie:h.owner},body:form}),uploaded=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});assert.equal(uploaded.status,200,await uploaded.text())
 await h.cmd('proposal.approve',{id:p.id,version:2,revision:2});const share=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(share.shareUrl).pathname
 const file=(await h.state()).proposals.find(r=>r.id===p.id).attachments[0]
 const clock=async n=>h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(at+n).run()
 await clock(0);await h.cmd('tracking.settings',{id:p.id,enabled:'yes',consent:'yes',alerts:'no',quietMinutes:30,retentionDays:90})
 const page=await h.send(path),viewId=page.text.match(/data-engagement-view="([^"]+)"/)[1]
 assert.match(page.text,/data-engagement-section="block:case-stable"/)
 const event=async(section,milliseconds,optionId='two',extra={})=>h.send(path+'/engagement',{viewId,section,milliseconds,optionId,...extra})
 assert.equal((await event('pricing',40000)).status,400)
 await clock(45000)
 for(const [section,ms,option] of [['pricing',40000,'two'],['scope',5000,'two'],['pricing',10000,'one']])assert.equal((await event(section,ms,option)).status,200)
 assert.equal((await event('block:case-stable',5000,'one',{choiceSequence:3,items:[{id:'rush',quantity:2}]})).status,200)
 const transition={viewId,choiceSequence:4,optionId:'two',readings:{pricing:40000,'block:case-stable':5000}}
 assert.equal((await h.send(path+'/engagement',transition)).status,200)
 assert.equal((await h.send(path+'/engagement',transition)).status,200,'a transport retry records the same choice once')
 assert.equal((await h.send(path+'/engagement',{...transition,optionId:'one'})).status,409)
 assert.equal((await event('block:missing',1)).status,400)
 assert.equal((await event('pricing',40001,'one',{items:[{id:'not-offered',quantity:1}]})).status,400)
 const download=await h.send(path+'/attachments/'+file.id+'?viewId='+viewId);assert.equal(download.status,200);assert.equal(download.text,'Synthetic Platter attachment')
 const read=async()=>(await h.send('/api/platter/engagement?id='+p.id,undefined,h.owner)).value
 let data=await read()
 assert.deepEqual(data.views[0].reading.map(r=>[r.section,r.milliseconds]),[['block:case-stable',5000],['pricing',40000],['scope',5000]])
 assert.equal(data.views[0].reading[0].label,'Case study')
 assert.deepEqual([...new Set(data.views[0].choices.map(c=>c.option_id))].sort(),['one','two'])
 assert.deepEqual(data.views[0].choices.map(c=>[c.sequence,c.option_id,c.items]),[[1,'two',[]],[2,'one',[]],[3,'one',[{id:'rush',quantity:2}]],[4,'two',[]]])
 assert.equal(data.views[0].attachments[0].file_id,file.id)
 assert.deepEqual(data.recipients.map(r=>[r.recipient,r.revision,r.viewCount,r.reading.find(x=>x.section==='pricing').milliseconds,r.attachments.length]),[[['avery','northstar.example'].join('@'),2,1,40000,1]])
 assert.equal((await h.send(path+'/engagement',{viewId:'foreign',section:'scope',milliseconds:1})).status,404)
 const foreign=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Other proposal'});await h.cmd('proposal.approve',{id:foreign.id,version:1,revision:1});const foreignShare=await h.cmd('proposal.send',{id:foreign.id,version:2}),other={path:new URL(foreignShare.shareUrl).pathname},otherPage=await h.send(other.path),otherView=otherPage.text.match(/data-engagement-view="([^"]+)"/)[1]
 assert.equal((await h.send(path+'/attachments/'+file.id+'?viewId='+otherView)).status,404)
 assert.equal((await h.send(other.path+'/engagement',{viewId,section:'pricing',milliseconds:1,optionId:'two'})).status,404)
 assert.deepEqual(await read(),data,'foreign proposal events and downloads change no history')
 const replacement=await h.cmd('signer.replace',{id:p.id,version:4,recipient:['synthetic-platter-2','example.test'].join('@'),reason:'New invited client'})
 const replacementPath=new URL(replacement.shareUrl).pathname
 assert.equal((await h.send(path+'/engagement',transition)).status,410)
 assert.equal((await h.send(replacementPath+'/engagement',transition)).status,404)
 const replacementPage=await h.send(replacementPath),replacementView=replacementPage.text.match(/data-engagement-view="([^"]+)"/)[1]
 assert.equal((await h.send(replacementPath+'/engagement',{viewId:replacementView,section:'pricing',milliseconds:0,optionId:'one'})).status,200)
 data=await read();assert.deepEqual(data.recipients.map(r=>[r.recipient,r.revision,r.viewCount]).sort(),[[['avery','northstar.example'].join('@'),2,1],[['synthetic-platter-2','example.test'].join('@'),2,1]])
 assert.equal(data.recipients.find(r=>r.recipient===['synthetic-platter-2','example.test'].join('@')).attachments.length,0)
 const current=(await h.state()).proposals.find(r=>r.id===p.id)
 await h.cmd('proposal.negotiate',{...offer,id:p.id,clientId:client.id,version:current.version,document:{version:1,blocks:[{id:'case-stable',type:'case_study',title:'Updated case study',text:'New revision story'}]}})
 const next=(await h.state()).proposals.find(r=>r.id===p.id)
 await h.cmd('proposal.approve',{id:p.id,version:next.version,revision:next.revision});const nextShare=await h.cmd('proposal.send',{id:p.id,version:next.version+1}),activePath=new URL(nextShare.shareUrl).pathname
 assert.ok([404,409,410].includes((await h.send(replacementPath+'/engagement',{viewId:replacementView,section:'pricing',milliseconds:0})).status))
 const activePage=await h.send(activePath),activeView=activePage.text.match(/data-engagement-view="([^"]+)"/)[1]
 assert.equal((await h.send(activePath+'/engagement',{viewId:replacementView,section:'pricing',milliseconds:0})).status,404)
 assert.equal((await h.send(activePath+'/engagement',{viewId:activeView,section:'block:case-stable',milliseconds:0,optionId:'one'})).status,200)
 data=await read();assert.equal(data.views.find(r=>r.id===viewId).reading[0].label,'Case study');assert.equal(data.views.find(r=>r.id===activeView).reading[0].label,'Updated case study')
 assert.deepEqual(data.recipients.map(r=>r.revision).sort(),[2,2,3])
 for(const role of ['sales','manager','admin','viewer','billing','content_editor']){
  const address='synthetic-platter-'+role+'@example.test';await h.send('/auth/invite',{email:address,displayName:role,role:'member',returnTo:'/app'},h.owner)
  const cookie=await h.signIn(address),person=(await h.state(cookie)).actor
  await h.cmd('member.set',{operatorId:person.id,version:0,role,teams:[]})
  assert.equal((await h.send('/api/platter/engagement?id='+p.id,undefined,cookie)).status,403)
  assert.ok(!(await h.state(cookie)).proposals.some(r=>r.engagementDetails),'other roles never receive section or recipient details')
 }
 await h.cmd('tracking.hold',{id:p.id,held:'yes',reason:'Retain the measured history'})
 await h.cmd('tracking.erase',{id:p.id,confirm:'erase'},h.owner,409);assert.deepEqual(await read(),data)
 await h.cmd('tracking.hold',{id:p.id,held:'no'});await h.cmd('tracking.erase',{id:p.id,confirm:'erase'})
 assert.deepEqual((await read()).recipients,[])
 assert.equal((await h.send(activePath+'/engagement',{viewId:activeView,section:'pricing',milliseconds:0})).status,404)
 assert.equal((await h.send(activePath+'/attachments/'+file.id+'?viewId='+activeView)).status,404)
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_tracking_choices WHERE view_id=?').bind(viewId).first()).n,0)
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_tracking_attachment_opens').first()).n,0)

}))

test('TRACK-003 forwarded viewers verify their own mailbox before owner conversion to an approver record without inherited signing authority',()=>run(async h=>{
 const {p,path}=await sent(h)
 await h.cmd('tracking.settings',{id:p.id,enabled:'yes',consent:'yes',alerts:'no',quietMinutes:30,retentionDays:90})
 const identify=await h.send(path+'/stakeholder',{name:'Riley Procurement',email:'riley@synthetic-platter.example',consent:'yes'});assert.equal(identify.status,200,identify.text)
 const challengeId=identify.text.match(/name="challengeId" value="([^"]+)"/)[1],mail=(await h.state()).outbox.find(m=>m.subject==='Verify your stakeholder mailbox'),code=mail.body.match(/\b\d{6}\b/)[0]
 assert.equal(mail.recipient,'riley@synthetic-platter.example')
 assert.equal((await h.send(path+'/stakeholder',{challengeId,code:'invalid'})).status,400)
 assert.equal((await h.send(path+'/stakeholder',{challengeId,code})).status,200)
 assert.equal((await h.send(path+'/stakeholder',{challengeId,code})).status,401,'code is single use')
 const data=(await h.send('/api/platter/engagement?id='+p.id,undefined,h.owner)).value,person=data.stakeholders[0]
 assert.equal(person.name,'Riley Procurement');assert.equal(person.email,'riley@synthetic-platter.example');assert.equal(person.role,'stakeholder')
 const beforeConversion=(await h.state()).outbox,invitationCount=(await h.db.prepare('SELECT count(*) n FROM p_shares WHERE proposal_id=?').bind(p.id).first()).n
 await h.cmd('tracking.recipient',{id:p.id,stakeholderId:person.id,consent:'yes'})
 assert.deepEqual((await h.state()).outbox,beforeConversion,'stakeholder conversion sends no automatic invitation')
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_shares WHERE proposal_id=?').bind(p.id).first()).n,invitationCount,'stakeholder conversion creates no invitation authority')
 assert.equal((await h.send('/api/platter/engagement?id='+p.id,undefined,h.owner)).value.stakeholders[0].role,'approver')
 assert.equal((await h.send(path+'/action?name=accept',{name:'Riley Procurement',optionId:'one',consent:true})).status,401)
 assert.equal((await h.state()).proposals.find(row=>row.id===p.id).acceptance,undefined)
}))

test('PRICE-003 recurring fees keep exact schedules, first-year queue value and immutable selected documents',async()=>{
 const h=await harness({assetsDirectory:'public'});try{
 const {recurringJourney}=await import('./recurring-journey.mjs')
 await recurringJourney(h,{offer,verified})
 }finally{await h.close()}
})

test('AUTO-004 scoped REST drafting, immutable owner keys and human-only authority',async()=>{
 const h=await harness();try{
  const api=(path,input,token,cookie='')=>h.send('/api/platter/v1'+path,input,cookie,token?{authorization:'Bearer '+token}:{})
  const client=await h.cmd('client.save',{name:'Synthetic API client',email:'synthetic-platter-94@studio.example'}),p=await h.cmd('proposal.prepare',{...offer,title:'Plan for {{Client.Company}}',scope:'Contact {{Contact.Title}} at {{Client.Company}}.',clientId:client.id}),template=await h.cmd('template.save',{id:p.id,version:1,name:'Synthetic API template'})
  assert.equal((await api('/keys',{label:'No session',scopes:['proposals.write']})).status,401)
  await h.send('/auth/invite',{email:'synthetic-platter-91@studio.example',displayName:'API member',role:'member',returnTo:'/app'},h.owner)
  const member=await h.signIn('synthetic-platter-91@studio.example')
  assert.equal((await api('/keys',{label:'Member key',scopes:['proposals.write']},null,member)).status,403)
  assert.equal((await h.send('/api/platter/v1/keys',{label:'Unsafe origin',scopes:['proposals.write']},h.owner,{origin:'https://elsewhere.example'})).status,403)
  const readonly=(await api('/keys',{label:'Read only',scopes:['proposals.read']},null,h.owner)).value
  assert.equal((await api('/proposals',{templateId:template.id,templateVersion:1,clientId:client.id},readonly.token)).status,403)
  const key=(await api('/keys',{label:'Draft and selected reads',scopes:['proposals.write','templates.read','proposals.read','analytics.read','payments.read','agreements.read']},null,h.owner)).value
  const templates=await api('/templates',undefined,key.token);assert.equal(templates.status,200);assert.deepEqual(templates.value,[{id:template.id,name:'Synthetic API template',version:1}])
  const made=await api('/proposals',{templateId:template.id,templateVersion:1,clientId:client.id},key.token);assert.equal(made.status,200,made.text)
  const rows=await api('/proposals',undefined,key.token);assert.equal(rows.status,200);assert.deepEqual(rows.value.map(r=>[r.id,r.status]).sort(),[[p.id,'draft'],[made.value.id,'draft']].sort())
  assert.deepEqual((await api('/analytics',undefined,key.token)).value,[{status:'draft',count:2}])
  assert.deepEqual((await api('/payments',undefined,key.token)).value,[])
  assert.deepEqual((await api('/agreements',undefined,key.token)).value,[])
  for(const verb of ['approve','send','sign','refund'])assert.equal((await api('/proposals/'+made.value.id+'/'+verb,{},key.token)).status,404)
  assert.equal((await h.send('/api/platter/agent/context',undefined,'',{authorization:'Bearer '+readonly.token})).status,403,'REST scopes cannot escape through the legacy agent door')
  assert.equal((await api('/keys/'+key.id,{scopes:['proposals.read']},null,h.owner)).status,404)
  assert.doesNotMatch((await api('/keys',undefined,null,h.owner)).text,new RegExp(key.token+'|'+readonly.token))
  await h.cmd('proposal.approve',{id:made.value.id,version:1,revision:1});const missing=await h.send('/api/platter/command',{name:'proposal.send',input:{id:made.value.id,version:2}},h.owner);assert.equal(missing.status,409);assert.match(missing.text,/Contact.Title/);assert.match(missing.text,/Client.Company/)
  assert.equal((await api('/proposals/'+made.value.id+'/variables',{version:2,values:{'Client.Company':'Synthetic client','Contact.Title':'Director'}},readonly.token)).status,403)
  const filled=await api('/proposals/'+made.value.id+'/variables',{version:2,values:{'Client.Company':'Synthetic client','Contact.Title':'Director'}},key.token);assert.equal(filled.status,200,filled.text)
  const current=(await h.state()).proposals.find(r=>r.id===made.value.id);assert.equal(current.scope,'Contact Director at Synthetic client.');assert.equal(current.title,'Plan for Synthetic client');assert.equal(current.status,'draft');assert.equal(current.approved_by,null)
  await h.cmd('proposal.approve',{id:made.value.id,version:3,revision:2});const sent=await h.cmd('proposal.send',{id:made.value.id,version:4});assert.ok(sent.shareUrl)
  assert.equal((await api('/proposals/'+made.value.id+'/variables',{version:5,values:{'Client.Company':'Changed'}},key.token)).status,400)
  const path=new URL(sent.shareUrl).pathname,cookie=await verified(h,path);assert.equal((await h.send(path+'/action?name=accept',{name:'Synthetic API signer',optionId:'one',consent:true},cookie)).status,200)
  const payment=await h.cmd('payment.record',{id:made.value.id,method:'wire',amount:'600',receivedOn:'2026-10-25',reference:'synthetic-platter-95',consent:true})
  assert.deepEqual((await api('/payments',undefined,key.token)).value,[{id:payment.id,proposalId:made.value.id,amountCents:60000,currency:'USD',method:'wire',receivedOn:'2026-10-25'}])
  const agreements=(await api('/agreements',undefined,key.token)).value;assert.equal(agreements.length,1);assert.equal(agreements[0].id,made.value.id);assert.equal(agreements[0].totalCents,240000);assert.equal(agreements[0].revision,2)
  assert.equal((await api('/proposals',undefined,readonly.token)).value.find(r=>r.id===made.value.id).status,'accepted')
  for(const route of ['/templates','/analytics','/payments','/agreements'])assert.equal((await api(route,undefined,readonly.token)).status,403)
  await api('/keys/'+key.id+'/revoke',{},null,h.owner);assert.equal((await api('/templates',undefined,key.token)).status,401)
  await h.db.prepare('UPDATE p_agent_keys SET expires_at=0 WHERE id=?').bind(readonly.id).run();assert.equal((await api('/proposals',undefined,readonly.token)).status,401)
 }finally{await h.close()}
})

test('AUTO-004 signed lifecycle webhooks retry, log, redact and stop on revocation',async()=>{
 const {createHmac}=await import('node:crypto'),received=[]
 let refuse=true,revokeDuringDelivery=null
 const h=await harness({assetsDirectory:'public',outboundService:async request=>{received.push({url:request.url,body:await request.text(),headers:Object.fromEntries(request.headers)});if(revokeDuringDelivery){const id=revokeDuringDelivery;revokeDuringDelivery=null;assert.equal((await h.send('/api/platter/v1/webhooks/'+id+'/revoke',{},h.owner)).status,200)}return new Response(refuse?'synthetic-platter-92':null,{status:refuse?503:204})}})
 try{
  const api=(path,input,cookie=h.owner)=>h.send('/api/platter/v1'+path,input,cookie)
  assert.equal((await api('/webhooks',{url:'https://hooks.example.com/events',consent:false})).status,400)
  for(const url of ['http://hooks.example.com/events','https://127.0.0.1/events','https://localhost/events','https://hooks.example.com/events?token=private'])assert.equal((await api('/webhooks',{url,consent:true})).status,400)
  const hook=(await api('/webhooks',{url:'https://hooks.example.com/events',consent:true})).value;assert.ok(hook.secret)
  // PRICE-006: distinct nonzero private amounts travel with each revision, never with an event.
  const client=await h.cmd('client.save',{name:'Synthetic priced client',email:h.auth.MAIL_FROM})
  const p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic priced package',scope:'Public delivery',depositPercent:'25',packages:[{id:'main',label:'Delivery',price:'15000',optionalItems:[{id:'rush',label:'Rush delivery',unitPrice:'1000',min:1,max:5,quantity:2,editable:true}]},{id:'alternative',label:'Alternative',price:'20000'}],pricingTables:[{optionId:'main',name:'Services',lines:[{name:'Delivery work',description:'Public work',quantity:'1.5',unit:'hour',unitPrice:'10000'}]}]})
  const current=async(cookie=h.owner)=>(await h.state(cookie)).proposals.find(row=>row.id===p.id)
  let row=await current()
  await h.cmd('pricing.cost',{id:p.id,version:row.version,lineKey:row.internalPricing.lines.find(l=>l.kind==='base'&&l.optionId==='main').key,unitCost:'4137.29'})
  row=await current();await h.cmd('pricing.cost',{id:p.id,version:row.version,lineKey:row.internalPricing.lines.find(l=>l.kind==='optional').key,unitCost:'317.29'})
  row=await current();await h.cmd('pricing.cost',{id:p.id,version:row.version,lineKey:row.internalPricing.lines.find(l=>l.optionId==='alternative').key,unitCost:'8329.41'})
  row=await current()
  assert.deepEqual(row.internalPricing.lines.map(l=>[l.unitCostCents,l.costCents,l.marginCents]),[[413729,620594,879406],[31729,63458,136542],[832941,832941,1167059]])
  assert.deepEqual(row.internalPricing.packages.map(o=>[o.revenueCents,o.costCents,o.marginCents]),[[1500000,620594,879406],[2000000,832941,1167059]])
  assert.deepEqual([row.internalPricing.total.costCents,row.internalPricing.total.marginCents],[620594,879406])
  const privateAmounts=['413729','620594','879406','31729','63458','136542','832941','1167059','95187','715781','1084219','204813','4137.29','6205.94','8794.06','317.29','634.58','1365.42','8329.41','11670.59','951.87','7157.81','10842.19','2048.13']
  const costFree=value=>{
   assert.doesNotMatch(value,/internalPricing|unitCost|unit_cost|costCents|cost_cents|margin/i)
   for(const amount of privateAmounts){assert.ok(!value.includes(amount),'private amount excluded: '+amount);const [whole,fraction]=amount.split('.');if(fraction)assert.ok(!value.includes(Number(whole).toLocaleString('en-US')+'.'+fraction),'formatted private amount excluded: '+amount)}
  }
  await h.send('/auth/invite',{email:h.auth.MAIL_FROM,displayName:'Synthetic sales',role:'member',returnTo:'/app'},h.owner)
  const sales=await h.signIn(h.auth.MAIL_FROM),salesActor=(await h.state(sales)).actor
  await h.cmd('member.set',{operatorId:salesActor.id,version:0,role:'sales',teams:[]})
  await h.cmd('proposal.share',{id:p.id,operatorId:salesActor.id})
  assert.equal((await current(sales)).internalPricing,undefined);costFree(JSON.stringify(await current(sales)))
  await h.cmd('pricing.cost',{id:p.id,version:row.version,lineKey:row.internalPricing.lines[0].key,unitCost:'0'},sales,403)
  assert.deepEqual((await current()).internalPricing,row.internalPricing,'a refused sales edit changes no private amounts')
  await h.cmd('proposal.approve',{id:p.id,version:row.version,revision:row.revision})
  row=await current();const path=new URL((await h.cmd('proposal.send',{id:p.id,version:row.version})).shareUrl).pathname
  const unsigned=await current()
  const unverified=await h.send(path+'/action?name=accept',{name:'Synthetic Signer',optionId:'main',items:[{id:'rush',quantity:3}],consent:true})
  assert.equal(unverified.status,401);const refused=await current();assert.equal(refused.acceptance,undefined)
  assert.deepEqual([refused.version,refused.revision,refused.status,refused.internalPricing],[unsigned.version,unsigned.revision,unsigned.status,unsigned.internalPricing],'unverified acceptance leaves the sent revision and private amounts unchanged')
  const cookie=await verified(h,path),query='?optionId=main&add.rush=yes&qty.rush=3'
  const data=await h.send(path+'/data.json'+query,undefined,cookie);assert.equal(data.status,200,data.text);assert.equal(data.value.selection.totalCents,1800000);costFree(data.text)
  const page=await h.send(path+query,undefined,cookie);assert.equal(page.status,200);costFree(page.text)
  const file=await h.mf.dispatchFetch(h.origin+path+'/download.pdf'+query,{headers:{cookie}});assert.equal(file.status,200)
  const publicPdf=(await pdfPages(await file.arrayBuffer())).join(' ');assert.match(publicPdf,/18,?000\.00/);costFree(publicPdf)
  const accepted=await h.send(path+'/action?name=accept',{name:'Synthetic Signer',optionId:'main',items:[{id:'rush',quantity:3}],consent:true},cookie);assert.equal(accepted.status,200)
  row=await current();assert.equal(row.acceptance.totalCents,1800000)
  assert.deepEqual([row.internalPricing.total.revenueCents,row.internalPricing.total.costCents,row.internalPricing.total.marginCents,row.internalPricing.total.marginBps],[1800000,715781,1084219,6023])
  assert.deepEqual([row.internalPricing.lines[1].quantity,row.internalPricing.lines[1].costCents,row.internalPricing.lines[1].marginCents],['3',95187,204813])
  const acceptedData=await h.send(path+'/data.json',undefined,cookie);assert.equal(acceptedData.status,200);costFree(acceptedData.text)
  const acceptedPage=await h.send(path,undefined,cookie);assert.equal(acceptedPage.status,200);costFree(acceptedPage.text)
  costFree(JSON.stringify(await current(sales)))
  const now=Date.now()+1000,cron=async at=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'})
  await cron(now)
  let log=await api('/deliveries');assert.equal(log.status,200);assert.deepEqual(log.value.map(d=>d.type).sort(),['proposal.approved','proposal.created','proposal.revised','proposal.revised','proposal.revised','proposal.sent','proposal.signed'])
  assert.ok(log.value.every(d=>d.status==='retry'&&d.attempts===1&&d.httpStatus===503),'all failed deliveries are retained for retry')
  const sentEvent=received.find(r=>JSON.parse(r.body).type==='proposal.sent'),signedEvent=received.find(r=>JSON.parse(r.body).type==='proposal.signed')
  assert.ok(sentEvent&&signedEvent)
  const expected=[['proposal.created',1,'draft'],['proposal.revised',2,'draft'],['proposal.revised',3,'draft'],['proposal.revised',4,'draft'],['proposal.approved',4,'approved'],['proposal.sent',4,'sent'],['proposal.signed',4,'accepted']]
  assert.deepEqual(received.map(r=>{const e=JSON.parse(r.body);return [e.type,e.data.revision,e.data.status]}).sort(),expected.sort(),'the receiver sees every priced lifecycle projection')
  const checkRequests=()=>{for(const r of received){const event=JSON.parse(r.body);assert.equal(r.url,hook.url);assert.equal(r.headers['platter-event-id'],event.id);assert.equal(r.headers['platter-signature'],'v1='+createHmac('sha256',hook.secret).update(r.headers['platter-timestamp']+'.'+r.body).digest('hex'));assert.notEqual(r.headers['platter-signature'],'v1='+createHmac('sha256',hook.secret).update(r.headers['platter-timestamp']+'.'+r.body+' ').digest('hex'));assert.deepEqual(Object.keys(event).sort(),['data','id','occurredAt','type']);assert.ok(Number.isSafeInteger(event.occurredAt));assert.deepEqual(Object.keys(event.data).sort(),['id','revision','status']);assert.equal(event.data.id,p.id);assert.ok(expected.some(([type,revision,status])=>event.type===type&&event.data.revision===revision&&event.data.status===status));assert.doesNotMatch(r.body,/cost|margin|email|token|secret|scope/i);costFree(r.body)}}
  checkRequests()
  const firstBodies=new Map(received.map(r=>[JSON.parse(r.body).id,r.body]))
  refuse=false;await cron(now+60001)
  log=await api('/deliveries');assert.ok(log.value.every(d=>d.status==='delivered'&&d.attempts===2&&d.httpStatus===204))
  assert.equal(received.filter(r=>JSON.parse(r.body).id===JSON.parse(sentEvent.body).id).length,2,'retry keeps the same event id')
  assert.equal(received.length,14);checkRequests()
  for(const [id,body] of firstBodies)assert.deepEqual(received.filter(r=>JSON.parse(r.body).id===id).map(r=>r.body),[body,body],'every retry keeps the same cost-free body')
  const n=received.length;await cron(now+120002);assert.equal(received.length,n,'delivered events are not resent')
  assert.doesNotMatch((await api('/webhooks')).text,new RegExp(hook.secret))
  assert.doesNotMatch((await h.state()).proposals.map(p=>JSON.stringify(p)).join(''),new RegExp(hook.secret))
  await api('/webhooks/'+hook.id+'/revoke',{});await h.cmd('proposal.prepare',{...offer,clientId:client.id});await cron(now+180003);assert.equal(received.length,n,'revocation stops future delivery')
  const second=(await api('/webhooks',{url:'https://hooks.example.com/second',consent:true})).value
  const queued=await h.cmd('proposal.prepare',{...offer,clientId:client.id});await h.cmd('proposal.approve',{id:queued.id,version:1,revision:1});revokeDuringDelivery=second.id
  await cron(now+240004);assert.equal(received.length,n+1,'revocation during one request withholds the other preselected deliveries')
 }finally{await h.close()}
})

test('AUTO-004 published route reference matches live methods and webhook schemas both ways',async()=>{
 const h=await harness();try{
  const spec=await h.send('/api/platter/v1/openapi.json');assert.equal(spec.status,200)
  const reference=await h.send('/api/platter/v1/reference');assert.equal(reference.status,200)
  const documented=[]
  for(const [path,methods] of Object.entries(spec.value.paths))for(const [method,operation] of Object.entries(methods)){
   assert.ok(operation['x-scope']);documented.push(method.toUpperCase()+' '+path)
   const response=await h.send(path.replace('{id}','synthetic-platter-93'),method==='post'?{}:undefined)
   assert.notEqual(response.status,404,'documented route exists: '+method+' '+path)
  }
  const rendered=[...reference.text.matchAll(/data-route="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(rendered.sort(),documented.sort())
  assert.equal((await h.send('/api/platter/v1/not-registered')).status,404)
  const validate=(schema,value)=>{assert.equal(Array.isArray(value)?'array':Number.isInteger(value)?'integer':typeof value,schema.type);if(schema.enum)assert.ok(schema.enum.includes(value));if(schema.type==='object'){for(const key of schema.required)assert.ok(Object.hasOwn(value,key));assert.deepEqual(Object.keys(value).sort(),Object.keys(schema.properties).sort());for(const [key,item] of Object.entries(value))validate(schema.properties[key],item)}}
  const events=spec.value['x-webhook-events'];assert.ok(Object.keys(events).length>=2)
  for(const [type,event] of Object.entries(events)){validate(spec.value.components.schemas.LifecycleEvent,event.example);assert.equal(event.example.type,type);assert.ok(reference.text.includes(type))}
  const {p,client}=await draft(h);await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:1,scope:'Synthetic revised scope'});await h.cmd('proposal.approve',{id:p.id,version:2,revision:2});const share=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(share.shareUrl).pathname,cookie=await verified(h,path)
  assert.equal((await h.send(path+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true},cookie)).status,200)
  const make=()=>h.cmd('proposal.prepare',{...offer,clientId:client.id})
  const withdrawn=await make();await h.cmd('proposal.approve',{id:withdrawn.id,version:1,revision:1});await h.cmd('proposal.send',{id:withdrawn.id,version:2});await h.cmd('proposal.withdraw',{id:withdrawn.id,version:3,reason:'Synthetic withdrawn',notify:'no'})
  const lost=await make();await h.cmd('proposal.approve',{id:lost.id,version:1,revision:1});await h.cmd('proposal.send',{id:lost.id,version:2});await h.cmd('proposal.lose',{id:lost.id,version:3,reason:'Synthetic lost',notify:'no'})
  const declined=await make();await h.cmd('proposal.approve',{id:declined.id,version:1,revision:1});const declineShare=await h.cmd('proposal.send',{id:declined.id,version:2}),declinePath=new URL(declineShare.shareUrl).pathname,declineCookie=await verified(h,declinePath);assert.equal((await h.send(declinePath+'/action?name=decline',{revision:1,reason:'Synthetic declined'},declineCookie)).status,410)
  const won=await make();await h.cmd('proposal.approve',{id:won.id,version:1,revision:1});await h.cmd('proposal.send',{id:won.id,version:2});await h.cmd('proposal.win',{id:won.id,version:3,reason:'Synthetic won',notify:'no'})
  const expiring=await make();await h.cmd('expiry.set',{id:expiring.id,version:1,mode:'days',days:1});await h.cmd('proposal.approve',{id:expiring.id,version:2,revision:1});await h.cmd('proposal.send',{id:expiring.id,version:3})
  const deadline=(await h.state()).proposals.find(r=>r.id===expiring.id).expiry.deadlineAt;await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(deadline+1),cron:'*/15 * * * *'})
  const emitted=(await h.db.prepare('SELECT * FROM p_webhook_events').all()).results;assert.deepEqual([...new Set(emitted.map(e=>e.type))].sort(),['proposal.approved','proposal.created','proposal.declined','proposal.expired','proposal.lost','proposal.revised','proposal.sent','proposal.signed','proposal.withdrawn','proposal.won'])
  for(const event of emitted){assert.ok(events[event.type]);validate(spec.value.components.schemas.LifecycleEvent,{id:event.id,type:event.type,occurredAt:event.occurred_at,data:{id:event.proposal_id,revision:event.revision,status:event.status}})}
 }finally{await h.close()}
})

async function apiSentFixture(h,clientId){
 const p=await h.cmd('proposal.prepare',{...offer,clientId})
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
 const share=await h.cmd('proposal.send',{id:p.id,version:2})
 return {p,path:new URL(share.shareUrl).pathname}
}

describe('AUTO-004 terminal proposal projections',()=>{
 test('scoped status and analytics distinguish withdrawn and expired offers from live offers',()=>run(async h=>{
  const key=(await h.send('/api/platter/v1/keys',{label:'Synthetic status reader',scopes:['proposals.read','analytics.read']},h.owner)).value
  const read=path=>h.send('/api/platter/v1'+path,undefined,'',{authorization:'Bearer '+key.token})
  const withdrawn=await sent(h)
  await h.cmd('proposal.withdraw',{id:withdrawn.p.id,version:3,reason:'Synthetic withdrawal',notice:false})
  const expiring=await apiSentFixture(h,withdrawn.client.id)
  await h.cmd('expiry.set',{id:expiring.p.id,version:3,mode:'days',days:1})
  const live=await apiSentFixture(h,withdrawn.client.id),accepted=await apiSentFixture(h,withdrawn.client.id),cookie=await verified(h,accepted.path)
  assert.equal((await h.send(accepted.path+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true},cookie)).status,200)
  const deadline=(await h.state()).proposals.find(p=>p.id===expiring.p.id).expiry.deadlineAt
  const before=await read('/proposals');assert.equal(before.status,200)
  assert.equal(before.value.find(p=>p.id===withdrawn.p.id).status,'withdrawn')
  assert.equal(before.value.find(p=>p.id===expiring.p.id).status,'sent')
  assert.deepEqual((await read('/analytics')).value,[{status:'accepted',count:1},{status:'sent',count:2},{status:'withdrawn',count:1}])
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(deadline+1),cron:'*/15 * * * *'})
  const after=await read('/proposals');assert.equal(after.status,200)
  assert.equal(after.value.find(p=>p.id===withdrawn.p.id).status,'withdrawn')
  assert.equal(after.value.find(p=>p.id===expiring.p.id).status,'expired')
  assert.equal(after.value.find(p=>p.id===live.p.id).status,'sent')
  assert.equal(after.value.find(p=>p.id===accepted.p.id).status,'accepted')
  assert.deepEqual((await read('/analytics')).value,[{status:'accepted',count:1},{status:'expired',count:1},{status:'sent',count:1},{status:'withdrawn',count:1}])
  await h.cmd('expiry.remove',{id:expiring.p.id,version:4})
  assert.equal((await read('/proposals')).value.find(p=>p.id===expiring.p.id).status,'sent')
  assert.deepEqual((await read('/analytics')).value,[{status:'accepted',count:1},{status:'sent',count:2},{status:'withdrawn',count:1}])
 }))
})

describe('AUTO-004 negotiated lifecycle delivery',()=>{
 test('receiver gets revised and approved events for each negotiated revision before it is sent',async()=>{
  const received=[],h=await harness({migrateThrough:'0078_public_api.sql',outboundService:async request=>{received.push(await request.json());return new Response(null,{status:204})}})
  try{
   const upgrades=(await readdir('migrations/core')).filter(file=>file.endsWith('.sql')&&file>'0078_public_api.sql').sort()
   for(const file of upgrades)await h.db.batch(unstable_splitSqlQuery(await readFile('migrations/core/'+file,'utf8')).map(sql=>h.db.prepare(sql)))
   assert.equal((await h.send('/api/platter/v1/webhooks',{url:'https://hooks.example.com/negotiated',consent:true},h.owner)).status,200)
   const {p,client,path}=await sent(h)
   await h.cmd('proposal.negotiate',{...offer,id:p.id,clientId:client.id,version:3,scope:'Synthetic negotiated scope'})
   const cron=async()=>{await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'*/15 * * * *'})}
   await cron()
   const revised=received.filter(e=>e.type==='proposal.revised'&&e.data.id===p.id)
   assert.deepEqual(revised.map(e=>e.data),[{id:p.id,revision:2,status:'draft'}])
   assert.equal(received.filter(e=>e.type==='proposal.approved'&&e.data.revision===2).length,0)
   assert.equal((await h.send(path)).status,200,'negotiating preserves the original live invitation')
   await h.cmd('proposal.approve',{id:p.id,version:4,revision:2})
   await cron()
   assert.deepEqual(received.filter(e=>e.type==='proposal.approved'&&e.data.revision===2).map(e=>e.data),[{id:p.id,revision:2,status:'approved'}])
   await h.cmd('proposal.revise',{...offer,id:p.id,clientId:client.id,version:5,scope:'Synthetic third revision'})
   await h.cmd('proposal.approve',{id:p.id,version:6,revision:3})
   await cron()
   assert.deepEqual(received.filter(e=>e.type==='proposal.revised'&&e.data.revision===3).map(e=>e.data),[{id:p.id,revision:3,status:'draft'}])
   assert.deepEqual(received.filter(e=>e.type==='proposal.approved'&&e.data.revision===3).map(e=>e.data),[{id:p.id,revision:3,status:'approved'}])
   const share=await h.cmd('proposal.send',{id:p.id,version:7});assert.ok(share.shareUrl)
   await cron()
   assert.deepEqual(received.filter(e=>e.type==='proposal.sent'&&e.data.revision===3).map(e=>e.data),[{id:p.id,revision:3,status:'sent'}])
   assert.equal(new Set(received.map(e=>e.id)).size,received.length,'completed deliveries are not replayed')
   assert.deepEqual(received.filter(e=>e.type==='proposal.revised').map(e=>e.data.revision),[2,3])
   assert.deepEqual(received.filter(e=>e.type==='proposal.approved').map(e=>e.data.revision).sort(),[1,2,3])
  }finally{await h.close()}
 })
})

describe('AUTO-004 complete lifecycle receiver coverage',()=>{
 test('receiver obtains all ten lifecycle types including every terminal outcome',async()=>{
  const received=[],h=await harness({outboundService:async request=>{received.push(await request.json());return new Response(null,{status:204})}})
  try{
   assert.equal((await h.send('/api/platter/v1/webhooks',{url:'https://hooks.example.com/lifecycle',consent:true},h.owner)).status,200)
   const {p,client}=await draft(h)
   await h.cmd('proposal.revise',{...offer,id:p.id,clientId:client.id,version:1,scope:'Synthetic revised scope'})
   await h.cmd('proposal.approve',{id:p.id,version:2,revision:2})
   const share=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(share.shareUrl).pathname,cookie=await verified(h,path)
   assert.equal((await h.send(path+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true},cookie)).status,200)
   const withdrawn=await apiSentFixture(h,client.id);await h.cmd('proposal.withdraw',{id:withdrawn.p.id,version:3,reason:'Synthetic withdrawn',notice:false})
   const lost=await apiSentFixture(h,client.id);await h.cmd('proposal.lose',{id:lost.p.id,version:3,reason:'Synthetic lost',notice:false})
   const declined=await apiSentFixture(h,client.id),declineCookie=await verified(h,declined.path)
   assert.equal((await h.send(declined.path+'/action?name=decline',{revision:1,reason:'Synthetic declined'},declineCookie)).status,410)
   const won=await apiSentFixture(h,client.id);await h.cmd('proposal.win',{id:won.p.id,version:3,reason:'Synthetic won'})
   const expiring=await apiSentFixture(h,client.id);await h.cmd('expiry.set',{id:expiring.p.id,version:3,mode:'days',days:1})
   const deadline=(await h.state()).proposals.find(row=>row.id===expiring.p.id).expiry.deadlineAt
   for(let tick=0;tick<3;tick++)await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(deadline+1+tick),cron:'*/15 * * * *'})
   const data=type=>received.filter(e=>e.type===type).map(e=>e.data)
   assert.deepEqual(data('proposal.revised'),[{id:p.id,revision:2,status:'draft'}])
   assert.ok(data('proposal.withdrawn').some(d=>d.id===withdrawn.p.id&&d.revision===1&&d.status==='withdrawn'))
   assert.deepEqual(data('proposal.declined'),[{id:declined.p.id,revision:1,status:'declined'}])
   assert.deepEqual(data('proposal.lost'),[{id:lost.p.id,revision:1,status:'lost'}])
   assert.deepEqual(data('proposal.won'),[{id:won.p.id,revision:1,status:'won'}])
   assert.deepEqual(data('proposal.expired'),[{id:expiring.p.id,revision:1,status:'expired'}])
   assert.ok(data('proposal.created').some(d=>d.id===p.id&&d.revision===1&&d.status==='draft'))
   assert.ok(data('proposal.approved').some(d=>d.id===p.id&&d.revision===2&&d.status==='approved'))
   assert.ok(data('proposal.sent').some(d=>d.id===p.id&&d.revision===2&&d.status==='sent'))
   assert.deepEqual(data('proposal.signed'),[{id:p.id,revision:2,status:'accepted'}])
   const log=await h.send('/api/platter/v1/deliveries',undefined,h.owner);assert.equal(log.status,200)
   assert.equal(log.value.length,received.length)
   assert.ok(log.value.every(d=>d.status==='delivered'&&d.attempts===1&&d.httpStatus===204))
  }finally{await h.close()}
 })
})

describe('AUTO-004 independently documented authority',()=>{
 test('each published method and route declares its independently expected scope',()=>run(async h=>{
  const response=await h.send('/api/platter/v1/openapi.json');assert.equal(response.status,200)
  const expected=[
   ['get','/openapi.json','public'],['get','/reference','public'],
   ['post','/keys','session:owner'],['get','/keys','session:owner'],['post','/keys/{id}/revoke','session:owner'],
   ['get','/templates','templates.read'],['post','/proposals','proposals.write'],
   ['post','/proposals/{id}/variables','proposals.write'],['get','/proposals','proposals.read'],
   ['get','/analytics','analytics.read'],['get','/payments','payments.read'],['get','/agreements','agreements.read'],
   ['post','/webhooks','session:owner'],['get','/webhooks','session:owner'],
   ['post','/webhooks/{id}/revoke','session:owner'],['get','/deliveries','session:owner'],
  ]
  for(const [method,path,scope] of expected)assert.equal(response.value.paths['/api/platter/v1'+path]?.[method]?.['x-scope'],scope,method+' '+path)
  const documented=Object.entries(response.value.paths).flatMap(([path,methods])=>Object.keys(methods).map(method=>method+' '+path)).sort()
  assert.deepEqual(documented,expected.map(([method,path])=>method+' /api/platter/v1'+path).sort())
 }))
})


test('SIGN-004 sequential and parallel recipient groups complete only after every signature',async()=>{
 const h=await harness({assetsDirectory:'public'})
 try{const {signingOrderHttp,ownershipHandoffHttp}=await import('./recipients-http.mjs');await signingOrderHttp(h);await ownershipHandoffHttp(h)}finally{await h.close()}
})
test('SEND-003 separately verified roles, removed viewers and unfilled template slots through HTTP',()=>run(async h=>{const {recipientRolesHttp}=await import('./recipients-http.mjs');await recipientRolesHttp(h)}))

test('EDIT-004 linked deal variables refuse missing values, freeze the sent revision and refill destination copies',async()=>{
 let dealName='Synthetic first deal',company='Synthetic Alpha',title=null,amount='1250.00',sfAmount=4100
 const h=await harness({outboundService:async request=>{const url=new URL(request.url);if(url.pathname==='/services/oauth2/userinfo')return Response.json({organization_id:'synthetic-platter-org',user_id:'synthetic-platter-user',urls:{rest:'https://synthetic-platter.salesforce.com/services/data/{version}/'}});if(url.pathname.includes('/sobjects/Opportunity/'))return Response.json({Name:'Synthetic Salesforce opportunity',Amount:sfAmount,Account:{Name:'Synthetic Salesforce client',BillingStreet:'41 Synthetic Street'}});if(url.pathname.endsWith('/query'))return Response.json({records:[{Contact:{FirstName:'Taylor',LastName:'Lane',Title:'CFO',Email:['synthetic-platter-209','example.test'].join('@')}}]});if(url.pathname==='/account-info/v3/details')return Response.json({portalId:8001});if(url.pathname.includes('/deals/'))return Response.json({properties:{dealname:dealName,amount},associations:{contacts:{results:[{id:'synthetic-platter-201'}]}}});if(url.pathname.includes('/contacts/'))return Response.json({properties:{firstname:'Avery',lastname:'Chen',jobtitle:title,company,email:['synthetic-platter-206','example.test'].join('@'),address:'10 Synthetic Street'}});return new Response(null,{status:404})}})
 try{
  const a=await h.cmd('client.save',{name:'Synthetic Alpha',email:['synthetic-platter-201','example.test'].join('@')}),b=await h.cmd('client.save',{name:'Synthetic Beta',email:['synthetic-platter-202','example.test'].join('@'),variableFields:{contactName:'Casey Lane',title:'Buyer',address:'20 Synthetic Street',custom:{Region:'West'}}})
  await h.cmd('provider.connect',{provider:'hubspot',version:0,token:'synthetic-platter-203',consent:true})
  let p=await h.cmd('proposal.prepare',{...offer,clientId:a.id,title:'Offer for {{Client.Company}}',scope:'Hello {{Client.FirstName}}, {{Contact.Title}}: {{Deal.Name}}',priceOne:'{{Deal.Amount}}',variableDeal:{provider:'hubspot',id:'synthetic-platter-204'}})
  const get=async id=>(await h.state()).proposals.find(p=>p.id===id)
  let current=await get(p.id);assert.equal(current.title,'Offer for Synthetic Alpha');assert.equal(current.options[0].cents,125000);assert.match(current.scope,/\{\{Contact.Title\}\}/)
  await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
  const refused=await h.send('/api/platter/command',{name:'proposal.send',input:{id:p.id,version:2}},h.owner);assert.equal(refused.status,409);assert.match(refused.text,/Contact.Title/)
  await h.cmd('proposal.variables',{id:p.id,version:2,values:{'Contact.Title':'Director'}})
  current=await get(p.id);assert.equal(current.scope,'Hello Avery, Director: Synthetic first deal');assert.equal(current.status,'draft');assert.equal(current.approved_by,null)
  await h.cmd('proposal.approve',{id:p.id,version:3,revision:2});const sent=await h.cmd('proposal.send',{id:p.id,version:4}),path=new URL(sent.shareUrl).pathname,before=(await h.send(path)).text,source=JSON.stringify(await get(p.id))
  const verifiedCookie=await verified(h,path),data=await h.send(path+'/data.json',undefined,verifiedCookie);assert.equal(data.status,200);assert.equal(data.value.document?.merge,undefined,'client data exposes displayed values without private variable templates')
  company='Changed Alpha';dealName='Changed first deal';amount='9999.00'
  assert.equal((await h.send(path)).text,before,'sent page does not refresh CRM data');await h.cmd('proposal.variables',{id:p.id,version:5,values:{'Contact.Title':'Changed'}},h.owner,409)
  company='Synthetic Beta';title='Buyer';dealName='Destination deal';amount='3200.00'
  const copy=await h.cmd('proposal.duplicate',{id:p.id,version:5,clientId:b.id,deal:{provider:'hubspot',id:'synthetic-platter-205'}}),next=await get(copy.id)
  assert.equal(next.title,'Offer for Synthetic Beta (copy)');assert.equal(next.scope,'Hello Avery, Buyer: Destination deal');assert.equal(next.options[0].cents,320000);assert.equal(JSON.stringify(await get(p.id)),source,'all source bytes stay unchanged')
  await h.cmd('proposal.variables',{id:copy.id,version:1,fields:{terms:'Region {{Custom.Region}}. Optional {{Custom.Note}}.'},values:{'Custom.Note':''}})
  assert.equal((await get(copy.id)).terms,'Region West. Optional .');const copyAgain=await h.cmd('proposal.duplicate',{id:copy.id,version:2,clientId:a.id});assert.equal((await get(copyAgain.id)).title,'Offer for Synthetic Alpha (copy) (copy)')
  const dealRoles=await h.cmd('proposal.prepare',{...offer,clientId:b.id,title:'Synthetic deal role binding',variableDeal:{provider:'hubspot',id:'synthetic-platter-207'},recipientPlan:[{id:'synthetic-platter-deal-client',name:'{{Contact.Name}}',email:'{{Client.Email}}',role:'signer',group:1}]});assert.deepEqual(JSON.parse((await get(dealRoles.id)).recipient_plan).map(r=>[r.name,r.email]),[['Avery Chen',['synthetic-platter-206','example.test'].join('@')]])
  const native=await h.cmd('proposal.prepare',{...offer,clientId:b.id,title:'{{Client.Company}} native roles',scope:'{{Contact.Name}} {{Contact.Title}} {{Client.Address}} {{Custom.Region}} {{Sender.FirstName}}',variableValues:{},recipientPlan:[{id:'synthetic-platter-client',name:'{{Contact.Name}}',email:'{{Client.Email}}',role:'signer',group:1}]})
  const nativeRow=await get(native.id);assert.equal(nativeRow.scope,'Casey Lane Buyer 20 Synthetic Street West Jordan');assert.deepEqual(JSON.parse(nativeRow.recipient_plan).map(r=>[r.name,r.email]),[['Casey Lane',['synthetic-platter-202','example.test'].join('@')]])
  const template=await h.cmd('template.save',{id:native.id,version:1,name:'Synthetic variable roles'}),fromTemplate=await h.cmd('template.start',{id:template.id,version:1,clientId:b.id}),templateRow=await get(fromTemplate.id)
  assert.deepEqual((await h.state()).templates.find(t=>t.id===template.id).snapshot.document.merge.values,{},'templates retain bindings without source contact or deal values');assert.equal(templateRow.scope,nativeRow.scope);assert.deepEqual(JSON.parse(templateRow.recipient_plan).map(r=>[r.name,r.email]),[['Casey Lane',['synthetic-platter-202','example.test'].join('@')]])
  const budget=await h.cmd('proposal.prepare',{...offer,clientId:b.id,title:'Synthetic unresolved price',priceOne:'{{Custom.Budget}}',variableValues:{}});await h.cmd('proposal.variables',{id:budget.id,version:1,fields:{terms:'An ordinary draft edit must retain the missing price binding.'}});await h.cmd('proposal.approve',{id:budget.id,version:2,revision:2});const missingPrice=await h.send('/api/platter/command',{name:'proposal.send',input:{id:budget.id,version:3}},h.owner);assert.equal(missingPrice.status,409);assert.match(missingPrice.text,/Custom.Budget/)
  await h.cmd('proposal.variables',{id:budget.id,version:3,values:{'Custom.Budget':'750'}});assert.equal((await get(budget.id)).options[0].cents,75000);await h.cmd('proposal.approve',{id:budget.id,version:4,revision:3});assert.ok((await h.cmd('proposal.send',{id:budget.id,version:5})).shareUrl)
  const scoped=await h.cmd('proposal.prepare',{...offer,clientId:b.id,title:'Native conditional variable',scope:'Only the West office sees this scope.',sectionConditions:{scope:'variable:Custom.Region=West'},variableValues:{}})
  await h.cmd('proposal.approve',{id:scoped.id,version:1,revision:1});const scopedSent=await h.cmd('proposal.send',{id:scoped.id,version:2}),scopedPath=new URL(scopedSent.shareUrl).pathname,scopedCookie=await verified(h,scopedPath);assert.equal((await h.send(scopedPath+'/data.json',undefined,scopedCookie)).value.scope,'Only the West office sees this scope.')
  const scopedCopy=await h.cmd('proposal.duplicate',{id:scoped.id,version:3,clientId:a.id});await h.cmd('proposal.approve',{id:scopedCopy.id,version:1,revision:1});const missingCondition=await h.send('/api/platter/command',{name:'proposal.send',input:{id:scopedCopy.id,version:2}},h.owner);assert.equal(missingCondition.status,409);assert.match(missingCondition.text,/Custom.Region/)
  await h.cmd('provider.connect',{provider:'salesforce',version:0,token:'synthetic-platter-208',consent:true})
  const sf=await h.cmd('proposal.prepare',{...offer,clientId:b.id,title:'{{Deal.Name}} for {{Client.Company}}',scope:'{{Contact.Name}} {{Contact.Title}} {{Client.Address}}',priceOne:'{{Deal.Amount}}',variableDeal:{provider:'salesforce',id:'synthetic-platter-209'}}),sfRow=await get(sf.id)
  assert.equal(sfRow.title,'Synthetic Salesforce opportunity for Synthetic Salesforce client');assert.equal(sfRow.scope,'Taylor Lane CFO 41 Synthetic Street');assert.equal(sfRow.options[0].cents,410000)
  await h.cmd('proposal.variables',{id:sf.id,version:1,fields:{terms:'Unrelated edit preserves the numeric variable binding.'}});sfAmount=5200;const sfCopy=await h.cmd('proposal.duplicate',{id:sf.id,version:2,clientId:a.id,deal:{provider:'salesforce',id:'synthetic-platter-211'}});assert.equal((await get(sfCopy.id)).options[0].cents,520000);assert.equal((await get(sf.id)).options[0].cents,410000)
  await h.cmd('proposal.prepare',{...offer,clientId:b.id,title:'Orbit variables',variableDeal:{provider:'orbit',id:'synthetic-platter-210'}},h.owner,409)
  const conditioned=await h.cmd('proposal.prepare',{...offer,clientId:b.id,variableValues:{'Custom.Region':'West'},document:{version:1,blocks:[{id:'synthetic-platter-west',type:'text',title:'West delivery',text:'Shown West content',condition:'variable:Custom.Region=West'},{id:'synthetic-platter-east',type:'text',title:'East delivery',text:'Excluded East content',condition:'variable:Custom.Region=East'},{id:'synthetic-platter-marker',type:'text',title:'Region',text:'{{Custom.Region}}'}]}})
  await h.cmd('proposal.approve',{id:conditioned.id,version:1,revision:1});const visible=await h.cmd('proposal.send',{id:conditioned.id,version:2}),visiblePath=new URL(visible.shareUrl).pathname,visibleCookie=await verified(h,visiblePath),visibleData=await h.send(visiblePath+'/data.json',undefined,visibleCookie)
  assert.deepEqual(visibleData.value.document.blocks.map(b=>b.id),['synthetic-platter-west','synthetic-platter-marker']);assert.doesNotMatch(JSON.stringify(visibleData.value),/Excluded East content|patterns/)
  await (await h.mf.getWorker()).scheduled({scheduledTime:Date.UTC(2099,5,15,12),cron:'*/15 * * * *'})
  const dated=await h.cmd('proposal.prepare',{...offer,clientId:b.id,title:'Synthetic dated variables',scope:'{{Date.Today}} {{Sender.Name}} {{Sender.FirstName}} {{Sender.LastName}} {{Sender.Email}}',variableValues:{}});assert.equal((await get(dated.id)).scope,'2099-06-15 Jordan Venue Jordan Venue '+['owner','studio.example'].join('@'))
  await h.cmd('provider.disconnect',{provider:'hubspot',version:1});await h.cmd('proposal.duplicate',{id:p.id,version:5,clientId:b.id,deal:{provider:'hubspot',id:'synthetic-platter-205'}},h.owner,409)
  await h.cmd('proposal.variables',{id:copy.id,version:2,fields:{terms:'Native edit after disconnect'}});assert.equal((await get(copy.id)).terms,'Native edit after disconnect')
 }finally{await h.close()}
})

test('EDIT-005 Word import maps tokens and catalog quote rows, keeps editable blocks and splits Heading 1 library sections',async()=>{
 const {wordFixture,uploadDocument}=await import('./document-import-fixture.mjs'),{applyBusiness}=await import('./business-import-fixture.mjs'),h=await harness()
 try{
  const {p}=await draft(h),csv='id,sku,name,description,price,currency,unit\n'+Array.from({length:5},(_,i)=>'synthetic-platter-'+(300+i)+',SKU'+(i+1)+',Synthetic product '+(i+1)+',,99,USD,each').join('\n')
  await applyBusiness(h,{kind:'catalog',format:'platter',csv})
  const imported=await uploadDocument(h,p.id,1,await wordFixture(),'synthetic-platter-301.docx',{mode:'template',templateName:'Synthetic imported template'}),s=await h.state(),current=s.proposals.find(r=>r.id===p.id),doc=current.document
  assert.equal(current.revision,2);assert.equal(doc.blocks.filter(b=>b.type==='heading').length,3);assert.equal(doc.blocks.filter(b=>b.type==='image').length,1)
  assert.match(doc.blocks.find(b=>b.type==='text').text,/\{\{Client.Company\}\} \{\{Sender.FirstName\}\} \{\{Custom.Unmapped_Case\}\}/)
  assert.deepEqual(imported.report.unknown,['Custom.Unmapped_Case']);assert.deepEqual(imported.report.unmatched,['Synthetic product 6']);assert.match(imported.report.missing.join(' '),/images absent/)
  const lines=current.options[0].tables[0].lines;assert.equal(lines.length,6);assert.deepEqual(lines.map(l=>l.catalogId??null),['synthetic-platter-300','synthetic-platter-301','synthetic-platter-302','synthetic-platter-303','synthetic-platter-304',null]);assert.deepEqual(lines.map(l=>[l.name,l.quantity,l.unitPrice,l.lineTotalCents]),Array.from({length:6},(_,i)=>['Synthetic product '+(i+1),String(i+1),(10+i)+'.00',(i+1)*(10+i)*100]));assert.equal(current.options[0].cents,28000)
  assert.equal(s.templates.find(t=>t.name==='Synthetic imported template').snapshot.document.blocks.length,doc.blocks.length)
  const importedTemplate=s.templates.find(t=>t.name==='Synthetic imported template'),variableDraft=await h.cmd('template.start',{id:importedTemplate.id,version:1,clientId:current.client_id});await h.cmd('proposal.approve',{id:variableDraft.id,version:1,revision:1});const missingTokens=await h.send('/api/platter/command',{name:'proposal.send',input:{id:variableDraft.id,version:2}},h.owner);assert.equal(missingTokens.status,409);assert.match(missingTokens.text,/Custom.Unmapped_Case/)
  await h.cmd('proposal.variables',{id:variableDraft.id,version:2,values:{'Custom.Unmapped_Case':'Synthetic custom value'}});const filledImport=(await h.state()).proposals.find(p=>p.id===variableDraft.id);assert.equal(filledImport.document.blocks.find(b=>b.type==='text').text,'Northstar Coffee Jordan Synthetic custom value Paragraph 1');await h.cmd('proposal.approve',{id:variableDraft.id,version:3,revision:2});assert.ok((await h.cmd('proposal.send',{id:variableDraft.id,version:4})).shareUrl)

  const bytes=await h.send('/api/platter/document-media/'+p.id+'/'+doc.blocks.find(b=>b.type==='image').assetId,undefined,h.owner);assert.equal(bytes.status,200);const rawImage=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+p.id+'/'+doc.blocks.find(b=>b.type==='image').assetId,{headers:{cookie:h.owner}});assert.deepEqual(new Uint8Array(await rawImage.arrayBuffer()),new Uint8Array(await readFile('fixtures/business/brand.png')))
  await h.cmd('proposal.document',{id:p.id,version:2,document:{...doc,blocks:doc.blocks.map(b=>b.type==='heading'?{...b,title:b.title+' edited'}:b)}})
  assert.equal((await h.state()).proposals.find(r=>r.id===p.id).document.blocks[0].title,'Synthetic section 1 edited')
  const library=await uploadDocument(h,p.id,3,await wordFixture({headings:10,rows:0,images:0,tokens:false}),'synthetic-platter-302.docx',{mode:'library'})
  assert.equal(library.libraryItems,10);assert.deepEqual((await h.state()).libraryItems.map(i=>i.title).sort(),Array.from({length:10},(_,i)=>'Synthetic section '+(i+1)).sort());assert.equal((await h.state()).libraryItems.find(i=>i.title==='Synthetic section 10').content,'Synthetic section 10\n\nParagraph 10')
  const rich=await uploadDocument(h,p.id,3,await wordFixture({headings:1,rows:2,images:1,tokens:false,prefix:'Synthetic rich section'}),'synthetic-platter-304.docx',{mode:'library'});assert.equal(rich.libraryItems,1)
  const richItem=(await h.state()).libraryItems.find(i=>i.title==='Synthetic rich section 1'),destination=await h.cmd('proposal.prepare',{...offer,clientId:current.client_id,title:'Synthetic rich library insertion'})
  await h.cmd('library.insert',{id:destination.id,version:1,itemId:richItem.id,itemVersion:1,mode:'detached',consent:true})
  const inserted=(await h.state()).proposals.find(p=>p.id===destination.id);assert.deepEqual(inserted.document.blocks.map(b=>b.type),['heading','text','pricing','image']);assert.equal(inserted.options[0].tables[0].lines.length,2);assert.equal((await h.send('/api/platter/document-media/'+destination.id+'/'+inserted.document.blocks[3].assetId,undefined,h.owner)).status,200)
  const linkedDestination=await h.cmd('proposal.prepare',{...offer,clientId:current.client_id,title:'Synthetic linked imported section'});await h.cmd('library.insert',{id:linkedDestination.id,version:1,itemId:richItem.id,itemVersion:1,mode:'linked',consent:true});await h.cmd('library.save',{id:richItem.id,version:1,title:'Renamed imported section',kind:'section',content:richItem.content});assert.equal((await h.state()).proposals.find(p=>p.id===linkedDestination.id).document.blocks[0].title,'Renamed imported section');assert.equal((await h.state()).proposals.find(p=>p.id===destination.id).document.blocks[0].title,'Synthetic rich section 1');assert.equal((await h.state()).proposals.find(p=>p.id===linkedDestination.id).options[0].tables[0].subtotalCents,3200)
  const mailbox=['synthetic-platter-305','example.test'].join('@');await h.send('/auth/invite',{email:mailbox,displayName:'Synthetic document member',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn(mailbox),actor=(await h.state(member)).actor
  await h.cmd('proposal.share',{id:destination.id,operatorId:actor.id});await uploadDocument(h,destination.id,2,await wordFixture({headings:1,rows:0,images:0,tokens:false}),'synthetic-platter-305.docx',{},200,member)
  const retained=(await h.state()).proposals.find(r=>r.id===destination.id);assert.ok(retained.document.blocks.some(b=>b.type==='image'));assert.equal(retained.version,3)
  await h.cmd('proposal.share',{id:destination.id,operatorId:actor.id,shared:false});await uploadDocument(h,destination.id,3,await wordFixture(),'synthetic-platter-306.docx',{},403,member);assert.equal((await h.send('/api/platter/document-export?id='+destination.id+'&format=docx',undefined,member)).status,403);assert.equal((await h.send('/api/platter/document-media/'+destination.id+'/'+inserted.document.blocks[3].assetId,undefined,member)).status,403);assert.deepEqual((await h.state()).proposals.find(r=>r.id===destination.id).document,retained.document)
  await uploadDocument(h,p.id,1,await wordFixture(),'synthetic-platter-303.docx',{},409)
 }finally{await h.close()}
})

test('EDIT-005 fixed PDF originals remain exact with a page-three signature and appended selected unsigned pricing',async()=>{
 const {uploadDocument}=await import('./document-import-fixture.mjs'),h=await harness({assetsDirectory:'public'})
 try{
  const {p}=await draft(h),source=await PDFDocument.create(),font=await source.embedFont(StandardFonts.Helvetica);for(let i=1;i<=3;i++)source.addPage([612,792]).drawText('Synthetic original page '+i,{x:48,y:700,font});const bytes=await source.save()
  await uploadDocument(h,p.id,1,bytes,'synthetic-platter-310.pdf')
  let current=(await h.state()).proposals.find(r=>r.id===p.id);assert.equal(current.document.fixedPdf.pages,3);assert.equal(current.document.blocks.length,0)
  const original=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+p.id+'/'+current.document.fixedPdf.fileId,{headers:{cookie:h.owner}});assert.deepEqual(new Uint8Array(await original.arrayBuffer()),bytes)
  await h.cmd('proposal.variables',{id:p.id,version:2,fields:{pricingTables:[{optionId:'one',name:'Synthetic appended quote',lines:[{name:'Synthetic line A',unit:'each',quantity:'2',unitPrice:'120'},{name:'Synthetic line B',unit:'each',quantity:'1',unitPrice:'60'}]}],paymentTerms:{milestones:[],netDays:15},document:{...current.document,blocks:[{id:'synthetic-platter-sign',type:'signature',title:'Page three signature',text:'',recipientRole:'client',page:3,x:70,y:120},{id:'synthetic-platter-initials',type:'field',title:'Client initials',text:'',recipientRole:'client',fieldKind:'text',required:true,page:2,x:70,y:120},{id:'synthetic-platter-date',type:'field',title:'Signed date',text:'',recipientRole:'client',fieldKind:'date',required:true,page:3,x:70,y:160},{id:'synthetic-platter-reference',type:'field',title:'Purchase reference',text:'',recipientRole:'client',fieldKind:'text',required:true,page:1,x:70,y:120},{id:'synthetic-platter-prices',type:'pricing',title:'',text:'',optionId:'one',tableIndex:0}]}}})
  current=(await h.state()).proposals.find(r=>r.id===p.id);assert.equal(current.options[0].cents,30000)
  const a4=await h.mf.dispatchFetch(h.origin+'/api/platter/document-export?id='+p.id+'&format=pdf&size=a4',{headers:{cookie:h.owner}});assert.equal(a4.status,200);const a4Pages=await pdfPages(new Uint8Array(await a4.arrayBuffer()),true);assert.ok(a4Pages.length>=4);assert.ok(a4Pages.every(p=>Math.abs(p.width-595.28)<.01&&Math.abs(p.height-841.89)<.01));assert.match(a4Pages[2].text,/Synthetic original page 3/);assert.match(a4Pages[2].text,/Page three signature/)
  await h.cmd('proposal.approve',{id:p.id,version:3,revision:3});const sent=await h.cmd('proposal.send',{id:p.id,version:4}),path=new URL(sent.shareUrl).pathname,cookie=await verified(h,path)
  const download=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=one',{headers:{cookie}});assert.equal(download.status,200);const pages=await pdfPages(new Uint8Array(await download.arrayBuffer()))
  assert.ok(pages.length>=4);for(let i=0;i<3;i++)assert.match(pages[i],new RegExp('Synthetic original page '+(i+1)));assert.match(pages[2],/Page three signature/);for(const page of pages)assert.match(page,/Not signed, revision 3/)
  assert.match(pages.slice(3).join(' '),/Synthetic appended quote/);assert.match(pages.slice(3).join(' '),/USD 300.00/)
  const clientPages=await h.mf.dispatchFetch(h.origin+path+'/media/'+current.document.fixedPdf.fileId,{headers:{cookie}});assert.equal(clientPages.status,200);const fragment=await pdfPages(new Uint8Array(await clientPages.arrayBuffer()));assert.equal(fragment.length,3);for(const page of fragment)assert.match(page,/Not signed, revision 3/);const untouched=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+p.id+'/'+current.document.fixedPdf.fileId,{headers:{cookie:h.owner}});assert.deepEqual(new Uint8Array(await untouched.arrayBuffer()),bytes,'client viewing never rewrites the retained source PDF')
  await h.cmd('pdf.downloads',{id:p.id,version:5,enabled:false});assert.equal((await h.send(path+'/download.pdf?optionId=one',undefined,cookie)).status,403)
  const accepted=await h.send(path+'/action?name=accept',{optionId:'one',name:'Synthetic signer',consent:true,'signature:synthetic-platter-sign':'Synthetic signer','field:synthetic-platter-initials':'SS','field:synthetic-platter-date':'2026-10-28','field:synthetic-platter-reference':'synthetic-platter-311 東京'},cookie);assert.equal(accepted.status,200,accepted.text)
  const agreement=(await h.state()).proposals.find(r=>r.id===p.id).acceptance;assert.deepEqual(agreement.fieldValues,{'synthetic-platter-sign':'Synthetic signer','synthetic-platter-initials':'SS','synthetic-platter-date':'2026-10-28','synthetic-platter-reference':'synthetic-platter-311 東京'});assert.equal(agreement.totalCents,30000);assert.equal(agreement.paymentSchedule.netDays,15)
  const signed=await h.mf.dispatchFetch(h.origin+path+'/agreement.pdf',{headers:{cookie}});assert.equal(signed.status,200);const signedBytes=new Uint8Array(await signed.arrayBuffer()),signedPages=await pdfPages(signedBytes);for(const page of signedPages)assert.match(page,/Signed agreement, revision 3/);assert.match(signedPages[2],/Page three signature: Synthetic signer/);assert.match(signedPages[1],/Client initials: SS/);assert.match(signedPages[0],/synthetic-platter-311 東京/);assert.doesNotMatch(signedPages.join(' '),/Not signed/)
  const certificate=await h.send(path+'/certificate.json',undefined,cookie);assert.equal(certificate.status,200);assert.equal(certificate.value.documentSha256,Buffer.from(await crypto.subtle.digest('SHA-256',signedBytes)).toString('hex'));const ownerSigned=await h.mf.dispatchFetch(h.origin+'/api/platter/agreement.pdf?id='+p.id,{headers:{cookie:h.owner}});assert.deepEqual(new Uint8Array(await ownerSigned.arrayBuffer()),signedBytes);const publicPreview=await h.mf.dispatchFetch(h.origin+path+'/media/'+current.document.fixedPdf.fileId);assert.equal(publicPreview.status,200);assert.doesNotMatch((await pdfPages(new Uint8Array(await publicPreview.arrayBuffer()))).join(' '),/Synthetic signer|synthetic-platter-311/,'an unverified invitation does not expose completed fixed-page field values')

 }finally{await h.close()}
})

test('EDIT-005 Word and PDF exports retain heading styles, four exact table lines, two images and reading order',async()=>{
 const {wordFixture,uploadDocument}=await import('./document-import-fixture.mjs'),{unzipSync,strFromU8}=await import('fflate'),h=await harness({assetsDirectory:'public'})
 try{
  const {p}=await draft(h);await uploadDocument(h,p.id,1,await wordFixture({rows:4,images:2,tokens:false,extras:true}),'synthetic-platter-320.docx')
  const word=await h.mf.dispatchFetch(h.origin+'/api/platter/document-export?id='+p.id+'&format=docx',{headers:{cookie:h.owner}});assert.equal(word.status,200);const files=unzipSync(new Uint8Array(await word.arrayBuffer())),xml=strFromU8(files['word/document.xml'])
  const imported=(await h.state()).proposals.find(r=>r.id===p.id);assert.ok(imported.document.blocks.some(b=>b.type==='text'&&b.text==='- Synthetic list item'));assert.ok(imported.document.blocks.some(b=>b.type==='table'&&b.text==='Service area\tWest'));assert.ok(imported.document.importReport.missing.includes('Image missing-source'));assert.match(xml,/Synthetic list item/);assert.match(xml,/Service area/);
  assert.equal((xml.match(/w:pStyle w:val="Heading1"/g)??[]).length,3);assert.equal(Object.keys(files).filter(k=>k.startsWith(['word','media',''].join('/'))).length,2)
  const nativeTables=xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g)??[],quoteTable=nativeTables.find(t=>t.includes('Synthetic product 1'));assert.ok(quoteTable,'pricing exports as a native Word table');const tableRows=(quoteTable.match(/<w:tr>[\s\S]*?<\/w:tr>/g)??[]).map(r=>(r.match(/<w:t[^>]*>[^<]*<\/w:t>/g)??[]).map(c=>c.replace(/<[^>]+>/g,'')));assert.deepEqual(tableRows,[['Name','Quantity','Unit price','Total'],...Array.from({length:4},(_,i)=>['Synthetic product '+(i+1),String(i+1),(10+i)+'.00',((i+1)*(10+i))+'.00'])]);for(const name of Object.keys(files).filter(k=>k.startsWith(['word','media',''].join('/'))))assert.deepEqual(files[name],new Uint8Array(await readFile('fixtures/business/brand.png')),'Word embeds exact original image bytes');
  for(let i=1;i<=4;i++){assert.match(xml,new RegExp('Synthetic product '+i));assert.match(xml,new RegExp('>'+i+'<'));assert.match(xml,new RegExp('>'+(9+i)+'\\.00<'));assert.match(xml,new RegExp('>'+i*(9+i)+'\\.00<'))}
  const pdf=await h.mf.dispatchFetch(h.origin+'/api/platter/document-export?id='+p.id+'&format=pdf&size=a4',{headers:{cookie:h.owner}});assert.equal(pdf.status,200);const pages=await pdfPages(new Uint8Array(await pdf.arrayBuffer()),true),text=pages.map(p=>p.text).join(' ')
  assert.match(text,/Synthetic list item/);assert.match(text,/Service area/);assert.match(text,/West/);assert.ok(text.indexOf('Synthetic section 1')<text.indexOf('Synthetic section 2'));assert.ok(text.indexOf('Synthetic section 3')<text.indexOf('Synthetic product 1'));const order=pages.flatMap(p=>p.readingOrder);assert.ok(order.findIndex(t=>t.includes('Synthetic product 4'))<order.indexOf('IMAGE'),'the PDF places the imported images after the quote table');assert.ok(pages.reduce((n,p)=>n+p.imageCount,0)>=2);assert.ok(pages.every(p=>Math.abs(p.width-595.28)<.01&&Math.abs(p.height-841.89)<.01));for(const page of pages)assert.match(page.text,/Not signed, revision 2/)
  assert.equal((await h.send('/api/platter/document-export?id='+p.id+'&format=docx')).status,401)
 }finally{await h.close()}
})

test('PRICE-005 owner tax follows selected quantities and discounts, freezes rates and refuses unsafe writes',async()=>{const h=await harness({assetsDirectory:'public'});try{
 assert.equal((await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
 const {configureTaxes,taxRequest,taxPackages,taxTables}=await import('./taxes-fixture.mjs')
 let rateVersion=await configureTaxes(h.cmd)
 const {client}=await draft(h),input={clientId:client.id,title:'Taxed services',scope:'One-off services',depositPercent:50,packages:taxPackages(),pricingTables:taxTables(),tax:taxRequest()}
 const billing=await h.cmd('proposal.prepare',{...input,tax:{...taxRequest(),addressKind:'billing'}})
 const p=await h.cmd('proposal.prepare',input),portland=await h.cmd('proposal.prepare',{...input,tax:taxRequest('Portland','OR')})
 const preview=async(id,option='one',items=[])=>h.send('/app/preview/client?'+new URLSearchParams({id,revision:1,optionId:option,items:JSON.stringify(items)}),undefined,h.owner)
 let response=await preview(p.id);assert.equal(response.status,200,response.text);assert.match(response.text,/Sales tax: USD 82\.50/);assert.match(response.text,/1,582\.50/);assert.match(response.text,/791\.25/)
 response=await preview(portland.id);assert.match(response.text,/Sales tax: USD 0\.00/);assert.match(response.text,/1,500\.00/)
 response=await preview(billing.id);assert.match(response.text,/Sales tax: USD 0\.00/)
 const selected=[{id:'extra',quantity:4}]
 // $1,600 less 10% and $50 = $1,390. Allocated taxable base $955.62;
 // each jurisdiction rounds separately: $59.73 + $9.56 + $9.56 = $78.85.
 response=await preview(p.id,'two',selected);for(const value of ['Sales tax: USD 78.85','1,468.85','734.43'])assert.ok(response.text.includes(value),value)
 const noWrites=async action=>{const before=await h.state();await action();assert.deepEqual(await h.state(),before)}
 await noWrites(()=>h.cmd('proposal.prepare',{...input,pricingTables:taxTables().map(t=>({...t,lines:t.lines.map(l=>({...l,taxCode:''}))}))},h.owner,400))
 await noWrites(()=>h.cmd('proposal.prepare',{...input,pricingTables:[],packages:[{id:'large',label:'Large package',price:'10000000',taxable:true,taxCode:'synthetic-platter-service'}]},h.owner,400))
 await noWrites(()=>h.cmd('proposal.prepare',{...input,tax:{...taxRequest(),method:'stripe'}},h.owner,409))
 await noWrites(()=>h.cmd('proposal.prepare',{...input,tax:{...taxRequest(),method:'avatax'}},h.owner,409))
 await noWrites(()=>h.cmd('proposal.prepare',{...input,tax:{...taxRequest(),serviceAddress:{...taxRequest().serviceAddress,region:'WA'}}},h.owner,409))
 await noWrites(()=>h.cmd('proposal.prepare',{...input,pricingTables:taxTables().map(t=>({...t,lines:t.lines.map(l=>({...l,recurrence:{interval:'monthly',term:12,startsOn:'2030-01-01'}}))}))},h.owner,409))
 await noWrites(()=>h.cmd('proposal.prepare',{...input,paymentTerms:{netDays:15,milestones:[],retainer:{percent:10,startsOn:'2030-01-01',months:2}}},h.owner,409))
 await noWrites(()=>h.cmd('proposal.revise',{...input,id:p.id,version:0},h.owner,409))
 await noWrites(()=>h.cmd('tax.rate',{level:'city',region:'TX',jurisdiction:'Austin',percent:'2',startsOn:'2099-01-01',version:0},h.owner,409))
 const key=await h.cmd('agent.create',{label:'Synthetic tax refusal'})
 const agent=(name,input)=>h.send('/api/platter/agent/command',{name,input},'',{authorization:'Bearer '+key.token})
 await noWrites(async()=>{assert.equal((await agent('tax.rate',{level:'state',region:'TX',percent:'99',startsOn:'2020-01-01',version:rateVersion})).status,403);assert.equal((await agent('proposal.prepare',input)).status,403)})
 await h.cmd('agent.revoke',{id:key.id});assert.equal((await agent('proposal.prepare',input)).status,401)
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});const share=await h.cmd('proposal.send',{id:p.id,version:2}),path=new URL(share.shareUrl).pathname,cookie=await verified(h,path)
 const sentOptions=(await h.state()).proposals.find(x=>x.id===p.id).options
 await h.cmd('tax.rate',{level:'city',region:'TX',jurisdiction:'Austin',percent:'2',startsOn:'2099-01-01',version:rateVersion++})
 // A later effective rate also cannot recalculate an already sent revision.
 await h.cmd('tax.rate',{level:'city',region:'TX',jurisdiction:'Austin',percent:'3',startsOn:'2021-01-01',version:rateVersion++})
 assert.deepEqual((await h.state()).proposals.find(x=>x.id===p.id).options,sentOptions)
 const newer=await h.cmd('proposal.prepare',{...input,title:'New dated rates'});response=await preview(newer.id);assert.match(response.text,/Sales tax: USD 102\.50/)
 const query='?optionId=two&items='+encodeURIComponent(JSON.stringify(selected));response=await h.send(path+query,undefined,cookie)
 for(const value of ['Sales tax: USD 78.85','1,468.85','734.43'])assert.ok(response.text.includes(value),value)
 const data=(await h.send(path+'/data.json'+query,undefined,cookie)).value;assert.equal(data.selection.tax.taxableCents,95562);assert.equal(data.selection.tax.taxCents,7885);assert.deepEqual(data.selection.tax.lines.map(l=>l.netCents),[86875,43438,8687]);assert.equal(data.selection.tax.lines[0].taxCode,'synthetic-platter-service')
 const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf'+query,{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,200);const pdfText=(await pdfPages(new Uint8Array(await pdf.arrayBuffer()))).join(' ')
 for(const value of ['Sales tax: USD 78.85','Selected option total: USD 1,468.85','Deposit due: USD 734.43','Austin city tax (1%): USD 9.56'])assert.ok(pdfText.includes(value),value)
 await noWrites(async()=>{assert.equal((await h.send(path+'/action?name=accept',{optionId:'two',items:[{id:'extra',quantity:11}],consent:true,name:'Synthetic signer'},cookie)).status,400)})
 assert.equal((await h.send(path+'/action?name=accept',{optionId:'two',items:selected,consent:true,name:'Synthetic signer'},cookie)).status,200)
 let agreement=(await h.state()).proposals.find(x=>x.id===p.id).acceptance
 assert.equal(agreement.totalCents,146885);assert.equal(agreement.depositCents,73443);assert.equal(agreement.selection.tax.taxCents,7885);assert.deepEqual(agreement.selection.tax.components.map(c=>c.taxCents),[5973,0,956,956])
 response=await h.send(path+'/data.json',undefined,cookie);assert.deepEqual(response.value.selection.tax,agreement.selection.tax)
 const agreementPdf=await h.mf.dispatchFetch(h.origin+path+'/agreement.pdf',{headers:{host:new URL(h.origin).host,cookie}});assert.equal(agreementPdf.status,200);assert.match((await pdfPages(new Uint8Array(await agreementPdf.arrayBuffer()))).join(' '),/Sales tax: USD 78\.85/)
 await noWrites(()=>h.cmd('invoice.export',{id:p.id},h.owner,409))
 const frozen=await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
 assert.equal((await h.send(path+'/action?name=accept',{optionId:'one',consent:true,name:'Replay'},cookie)).status,200)
 assert.equal((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).snapshot,frozen.snapshot)
 const paper=await h.cmd('proposal.prepare',{...input,title:'Taxed signed copy'})
 await h.cmd('proposal.approve',{id:paper.id,version:1,revision:1});await h.cmd('proposal.send',{id:paper.id,version:2})
 const form=new FormData();for(const [key,value]of Object.entries({id:paper.id,version:3,optionId:'one',signer:'Synthetic signer',signedOn:'2020-01-01',attest:'yes'}))form.set(key,String(value));form.set('file',new File(['%PDF synthetic-platter-tax-signed-copy'],'synthetic-platter-tax.pdf',{type:'application/pdf'}))
 const upload=new Request(h.origin+'/app/paper-acceptance',{method:'POST',headers:{origin:h.origin,cookie:h.owner},body:form}),uploaded=await h.mf.dispatchFetch(upload.url,{method:'POST',headers:upload.headers,body:await upload.arrayBuffer()});assert.equal(uploaded.status,200)
 const paperAgreement=(await h.state()).proposals.find(x=>x.id===paper.id).acceptance;assert.equal(paperAgreement.selection.tax.taxCents,10250);assert.equal(paperAgreement.totalCents,160250);assert.equal(paperAgreement.depositCents,80125)
 const restored=await h.cmd('proposal.duplicate',{id:p.id,version:4})
 await h.cmd('proposal.revise',{...input,id:restored.id,version:1,tax:{...taxRequest(),addressKind:'billing'}})
 await h.cmd('proposal.restore',{id:restored.id,version:2,revision:1})
 response=await h.send('/app/preview/client?'+new URLSearchParams({id:restored.id,revision:3,optionId:'one'}),undefined,h.owner);assert.match(response.text,/Sales tax: USD 82\.50/)
 // New client drafts cannot silently inherit another client's address, or send taxable lines without one.
 const destination=await h.cmd('client.save',{name:'Synthetic destination',email:h.auth.OWNER_EMAIL}),copy=await h.cmd('proposal.duplicate',{id:p.id,version:4,clientId:destination.id})
 assert.ok((await h.state()).proposals.find(x=>x.id===copy.id).options.every(o=>!o.tax));await h.cmd('proposal.approve',{id:copy.id,version:1,revision:1});await h.cmd('proposal.send',{id:copy.id,version:2},h.owner,409)
}finally{await h.close()}})

test('AUTO-002 completed agreements archive exact PDFs once under explicit current Drive authority and reconcile uncertain writes without replay',async()=>{
 const {driveFixture,driveSettings,driveRoot,connectDrive,completeDriveAgreement}=await import('./drive-fixture.mjs'),fake=driveFixture(),h=await harness({assetsDirectory:'public',outboundService:fake.outboundService})
 try{
  const before=await sent(h),oldCookie=await verified(h,before.path)
  assert.equal((await h.send(before.path+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true},oldCookie)).status,200)
  await h.send('/auth/invite',{email:['synthetic-platter-admin','example.test'].join('@'),displayName:'Archive administrator',role:'member',returnTo:'/app'},h.owner)
  const adminCookie=await h.signIn(['synthetic-platter-admin','example.test'].join('@')),admin=(await h.state(adminCookie)).actor
  await h.cmd('archive.configure',driveSettings,adminCookie,403);assert.equal(fake.calls.length,0)
  await h.cmd('member.set',{operatorId:admin.id,role:'admin',version:0,teams:[]})
  await connectDrive(h,adminCookie)
  const calls=fake.calls.length
  await h.cmd('archive.configure',{...driveSettings,version:1,consent:false},h.owner,400)
  await h.cmd('archive.configure',{...driveSettings,version:0},h.owner,409)
  await h.cmd('archive.configure',{...driveSettings,version:1,accountId:'synthetic-platter-wrong-account'},h.owner,409)
  assert.equal(fake.calls.length,calls)
  assert.equal((await h.send('/api/platter/archives',undefined,'')).status,401)
  const signed=await completeDriveAgreement(h),worker=await h.mf.getWorker(),tick=()=>worker.scheduled({scheduledTime:new Date(),cron:'*/15 * * * *'})
  assert.equal((await h.send(signed.path+'/action?name=accept',signed.input,signed.cookie)).status,200)
  let history=(await h.send('/api/platter/archives',undefined,h.owner)).value
  assert.equal(history.jobs.length,1);assert.equal(history.jobs[0].status,'queued')
  assert.equal(history.jobs[0].proposal_id,signed.proposal.id,'enabling never backfills historical agreements')
  await Promise.all([tick(),tick(),h.cmd('archive.dispatch',{})])
  history=(await h.send('/api/platter/archives',undefined,h.owner)).value;assert.equal(history.jobs[0].status,'complete')
  const folder=[...fake.files.values()].find(f=>f.parents?.includes(driveRoot));assert.ok(folder);assert.equal(folder.appProperties.platterClient,signed.client.id);assert.ok(folder.name.startsWith('Synthetic archive client - '))
  const artifacts=await h.db.prepare('SELECT * FROM p_agreement_artifacts WHERE proposal_id=?').bind(signed.proposal.id).first()
  const {createHash}=await import('node:crypto')
  for(const kind of ['agreement','certificate']){
   const uploaded=[...fake.files.values()].find(f=>f.name.endsWith(' - '+kind+'.pdf'))
   assert.ok(uploaded);assert.deepEqual(uploaded.parents,[folder.id]);assert.equal(uploaded.name,'Synthetic archive client - Synthetic archive agreement - '+new Date(history.jobs[0].accepted_at).toISOString().slice(0,10)+' - r1 - '+kind+'.pdf')
   const download=await h.mf.dispatchFetch(h.origin+signed.path+'/'+kind+'.pdf',{headers:{cookie:signed.cookie}});assert.equal(download.status,200)
   const bytes=Buffer.from(await download.arrayBuffer());assert.deepEqual(uploaded.bytes,bytes);assert.deepEqual(Buffer.from(kind==='agreement'?artifacts.document:artifacts.certificate),bytes)
   assert.equal(uploaded.appProperties.platterSha256,createHash('sha256').update(bytes).digest('hex'))
  }
  const facts=JSON.parse(artifacts.facts);assert.equal(facts.documentSha256,createHash('sha256').update(Buffer.from(artifacts.document)).digest('hex'))
  const parallel=await Promise.all([completeDriveAgreement(h,'Parallel archive one',signed.client.id),completeDriveAgreement(h,'Parallel archive two',signed.client.id)])
  await Promise.all([tick(),tick()]);await tick()
  const parallelHistory=(await h.send('/api/platter/archives',undefined,h.owner)).value.jobs
  for(const agreement of parallel)assert.equal(parallelHistory.find(j=>j.proposal_id===agreement.proposal.id).status,'complete')

  const posts=()=>fake.calls.filter(c=>c.method==='POST').length,completedPosts=posts();await tick();assert.equal(posts(),completedPosts)
  // A second agreement uses the same client folder. A lost acknowledgement is held, never replayed.
  fake.setUncertain(true)
  const uncertain=await completeDriveAgreement(h,'Uncertain archive agreement',signed.client.id);await tick()
  history=(await h.send('/api/platter/archives',undefined,h.owner)).value
  assert.equal(history.jobs.find(j=>j.proposal_id===uncertain.proposal.id).status,'held')
  const afterUnknown=posts();await tick();await h.cmd('archive.dispatch',{});assert.equal(posts(),afterUnknown)
  await h.cmd('archive.reconcile',{id:uncertain.proposal.id})
  history=(await h.send('/api/platter/archives',undefined,h.owner)).value
  assert.equal(history.jobs.find(j=>j.proposal_id===uncertain.proposal.id).status,'complete');assert.equal(posts(),afterUnknown)
  assert.equal([...fake.files.values()].filter(f=>f.parents?.includes(driveRoot)).length,1)
  // Demotion invalidates execution even though the connection and old consent remain.
  const demoted=await completeDriveAgreement(h,'Demoted archive agreement',signed.client.id)
  await h.cmd('member.set',{operatorId:admin.id,role:'sales',version:1,teams:[]})
  const noCalls=fake.calls.length;await tick();assert.equal(fake.calls.length,noCalls)
  history=(await h.send('/api/platter/archives',undefined,h.owner)).value;assert.equal(history.settings.active,false);assert.equal(history.jobs.find(j=>j.proposal_id===demoted.proposal.id).status,'held')
  await h.cmd('archive.dispatch',{},adminCookie,403);await h.cmd('archive.reconcile',{id:demoted.proposal.id},adminCookie,403)
  assert.equal((await h.send('/api/platter/archives',undefined,adminCookie)).status,403);assert.equal(fake.calls.length,noCalls)
  await h.cmd('archive.configure',{...driveSettings,version:1},h.owner)
  await completeDriveAgreement(h,'Disconnected archive agreement',signed.client.id)
  await h.cmd('provider.disconnect',{provider:'google_drive',version:1})
  const disconnected=fake.calls.length;await tick();assert.equal(fake.calls.length,disconnected)
  // The configuration is also rechecked between individual network requests.
  const {driveToken}=await import('./drive-fixture.mjs');await h.cmd('provider.connect',{provider:'google_drive',version:2,token:driveToken,consent:true})
  await h.cmd('archive.configure',{...driveSettings,version:2,connectionVersion:3})
  await completeDriveAgreement(h,'Revoked during dispatch',signed.client.id)
  let revoked=false;fake.setHook(async request=>{if(!revoked&&new URL(request.url).pathname.endsWith('/generateIds')){revoked=true;await h.cmd('archive.revoke',{version:3})}})
  const preRevokePosts=posts();await tick();assert.equal(revoked,true);assert.equal(posts(),preRevokePosts)
  const audit=await h.send('/api/platter/audit?action=archive.configure',undefined,h.owner);assert.ok(audit.value.rows.length>=3)
 }finally{await h.close()}
})

test('MIG-007 exported document move-in resumes across sessions, holds ambiguous report matches and guards originals and undo', {timeout:120000},()=>run(async h=>{
 const {moveinFixture,hash,uploadMovein}=await import('./document-movein-fixture.mjs'),fixture=await moveinFixture()
 const {id}=await h.cmd('document-import.create',{label:'Synthetic document move-in'})
 const file=fixture.zips[0],sha256=hash(file.bytes),half=Math.floor(file.bytes.length/2),part=file.bytes.subarray(0,half).toString('base64')
 await h.cmd('document-import.upload-start',{id,filename:file.filename,sha256,size:file.bytes.length})
 await h.cmd('document-import.upload-chunk',{id,sha256,position:0,base64:part})
 await h.cmd('document-import.preview',{id},h.owner,409)
 await h.cmd('document-import.upload-finish',{id,sha256},h.owner,409)
 const second=await h.signIn(h.auth.OWNER_EMAIL)
 assert.equal((await h.cmd('document-import.upload-start',{id,filename:file.filename,sha256,size:file.bytes.length},second)).received,half)
 assert.equal((await h.cmd('document-import.upload-chunk',{id,sha256,position:0,base64:part},second)).received,half)
 await h.cmd('document-import.upload-chunk',{id,sha256,position:0,base64:Buffer.from('changed').toString('base64')},second,409)
 for(const zip of fixture.zips)await uploadMovein(h,id,zip,second)
 const before=await h.cmd('document-import.preview',{id},second)
 assert.equal(before.canApply,false)
 assert.deepEqual([before.report.arrived,before.report.held,before.report.unmapped,before.report.duplicateDocuments],[4,2,2,1])
 assert.equal(before.documents.length,5)
 const ambiguous=before.report.rows.find(r=>r.candidates.length===2)
 await h.cmd('document-import.preview',{id,choices:{[ambiguous.id]:''}},second,409)
 assert.deepEqual(new Set(ambiguous.candidates),new Set(fixture.originals.slice(2,4).map(hash)))
 assert.equal(before.report.rows.find(r=>r.fields.Client==='Another client').candidates.length,0,'client and date mismatches cannot auto-match by title')
 await h.cmd('document-import.apply',{id,fingerprint:before.fingerprint},second,409)
 const choices={[ambiguous.id]:hash(fixture.originals[2])}
 await h.cmd('document-import.apply',{id,choices,fingerprint:before.fingerprint},second,409)
 let reviewed=await h.cmd('document-import.preview',{id,choices},second)
 assert.notEqual(reviewed.fingerprint,before.fingerprint)
 assert.deepEqual([reviewed.report.arrived,reviewed.report.held,reviewed.report.unmapped],[4,1,2])
 assert.equal(reviewed.canApply,true)
 await uploadMovein(h,id,{filename:'report.csv',bytes:Buffer.from(fixture.csv)},second)
 await h.cmd('document-import.apply',{id,choices,fingerprint:reviewed.fingerprint},second,409)
 const priorFingerprint=reviewed.fingerprint
 reviewed=await h.cmd('document-import.preview',{id,choices},second)
 assert.notEqual(reviewed.fingerprint,priorFingerprint,'new uploaded bytes require a new review even when report rows deduplicate')
 let applied=await h.cmd('document-import.apply',{id,choices,fingerprint:reviewed.fingerprint},second)
 while(applied.job.state!=='completed')applied=await h.cmd('document-import.continue',{id},second)
 await h.cmd('document-import.apply',{id,choices,fingerprint:reviewed.fingerprint},second)
 await h.cmd('document-import.upload-start',{id,filename:'later.pdf',sha256:hash(fixture.originals[0]),size:fixture.originals[0].length},second,409)
 const state=await h.state(second),documents=state.importedDocuments
 assert.equal(documents.length,5);assert.equal(documents.filter(p=>p.disposition==='retained-agreement').length,4)
 assert.deepEqual(documents.find(p=>p.id===hash(fixture.originals[1])).signatureEvidence,[{kind:'signature-page',page:2,text:'Signature page'}])
 assert.equal(documents.find(p=>p.id===hash(fixture.originals[2])).report.Value,'2400')
 assert.equal(documents.find(p=>p.id===hash(fixture.originals[3])).report,null)
 for(const bytes of fixture.originals){
  const document=documents.find(p=>p.id===hash(bytes));assert.equal(document.sha256,hash(bytes))
  const response=await h.mf.dispatchFetch(h.origin+'/api/platter/imported-original?document='+document.id,{headers:{cookie:second}})
  assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes)
 }
 const journal=await h.cmd('document-import.journal',{id},second)
 assert.equal(journal.provenance.length,5)
 for(const zip of fixture.zips)assert.deepEqual(Buffer.from(journal.originals.find(o=>o.name.endsWith('/'+zip.filename)).original.base64,'base64'),zip.bytes)
 const standalone=await h.cmd('document-import.create',{label:'Synthetic existing-document review'},second)
 await uploadMovein(h,standalone.id,{filename:'Alpha.pdf',bytes:fixture.originals[0]},second)
 const conflict=await h.cmd('document-import.preview',{id:standalone.id},second)
 assert.equal(conflict.canApply,false);assert.deepEqual(conflict.existing,[hash(fixture.originals[0])]);assert.equal(conflict.report.held,1);assert.equal(conflict.report.arrived,0)
 await h.cmd('document-import.apply',{id:standalone.id,fingerprint:conflict.fingerprint},second,409)
 assert.deepEqual((await h.state(second)).importedDocuments,documents,'a later import cannot replace existing originals')
 const tables=['p_document_moveins','p_document_uploads','p_document_upload_chunks','p_imported_documents','ik_jobs','p_audit']
 const snapshot=async()=>Promise.all(tables.map(t=>h.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all().then(r=>r.results)))
 const frozen=await snapshot()
 assert.equal((await h.send('/api/platter/command',{name:'document-import.undo',input:{id}})).status,401)
 const client=await h.cmd('client.save',{name:'Synthetic platter dependent client',email:h.auth.OWNER_EMAIL})
 const draft=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Synthetic dependent draft'})
 const originalId=hash(fixture.originals[2])
 await h.db.prepare('INSERT INTO p_imported_document_links(document_id,proposal_id) VALUES(?,?)').bind(originalId,draft.id).run()
 await h.cmd('document-import.undo',{id},second,409)
 assert.deepEqual((await h.state(second)).importedDocuments,documents,'dependent undo preserves all originals')
 await h.db.prepare('DELETE FROM p_imported_document_links WHERE document_id=?').bind(originalId).run()
 await h.cmd('document-import.undo',{id},second)
 assert.deepEqual((await h.state(second)).importedDocuments,[])
 assert.equal((await h.send('/api/platter/imported-original?document='+originalId,undefined,second)).status,404)
 assert.ok((await h.cmd('document-import.journal',{id},second)).provenance.every(p=>p.reversed))
 const {applyNativeMovein,assertNativeMovein}=await import('./document-movein-fixture.mjs')
 const native=await applyNativeMovein(h,second),nativeProof=await assertNativeMovein(h,native,second)
 await h.cmd('document-import.apply',{id:native.id,choices:native.choices,mapping:{...native.fixture.mapping,[hash(native.fixture.originals[4])]:{kind:'draft',clientId:native.client.id,price:'2600.00'}},fingerprint:native.reviewed.fingerprint},second,409)
 assert.deepEqual((await h.state(second)).importedDocuments,nativeProof.state.importedDocuments)
 const started=await h.cmd('template.start',{id:nativeProof.template.id,version:1,clientId:native.client.id,title:'Synthetic converted offer'},second)
 const section=nativeProof.state.libraryItems.find(i=>i.title==='Synthetic library 1')
 await h.cmd('library.insert',{id:started.id,version:1,itemId:section.id,itemVersion:1,mode:'detached',consent:true},second)
 const derived=(await h.state(second)).proposals.find(p=>p.id===started.id)
 assert.ok(derived.document.blocks.some(b=>b.type==='heading'&&b.title==='Synthetic library 1'))
 assert.match(JSON.stringify(derived.document),/Synthetic move-in destination/)
 await h.cmd('proposal.approve',{id:nativeProof.draft.id,version:1,revision:1},second)
 const sentDraft=(await h.state(second)).proposals.find(p=>p.id===nativeProof.draft.id)
 const issued=await h.cmd('proposal.send',{id:sentDraft.id,version:sentDraft.version},second)
 assert.equal((await h.send(new URL(issued.shareUrl).pathname,undefined,'')).status,200)
 assert.equal((await h.state(second)).proposals.find(p=>p.id===sentDraft.id).status,'sent')
 let nativeRefusal
 for(let i=0;i<60;i++){nativeRefusal=await h.send('/api/platter/command',{name:'document-import.undo',input:{id:native.id}},second);if(nativeRefusal.status===409)break;assert.equal(nativeRefusal.status,200);assert.notEqual(nativeRefusal.value.job?.state,'undone')}
 assert.equal(nativeRefusal.status,409,'undo must stop at a used library section, template or changed draft')
 assert.ok((await h.state(second)).templates.some(t=>t.id===nativeProof.template.id),'dependent native offers preserve their imported template')
 const nativeTables=['p_document_native_imports','p_proposals','p_personal_templates','p_library_items','p_catalog_items','p_contacts']
 const nativeSnapshot=async()=>Promise.all(nativeTables.map(t=>h.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all().then(r=>r.results)))
 const nativeBeforeDemotion=await nativeSnapshot()
 const actor=(await h.state(second)).actor
 const successorAddress=['synthetic-platter-6','example.invalid'].join('@')
 await h.send('/auth/invite',{email:successorAddress,displayName:'Synthetic successor',role:'member',returnTo:'/app'},second)
 const successor=await h.signIn(successorAddress),successorId=(await h.state(successor)).actor.id
 assert.equal((await h.send('/auth/operator/role',{operatorId:successorId,role:'owner'},second)).status,200)
 assert.equal((await h.send('/auth/operator/role',{operatorId:actor.id,role:'admin'},await h.signIn(successorAddress))).status,200)
 const demoted=await h.signIn(actor.email),afterDemotion=await snapshot()
 await h.cmd('document-import.preview',{id},demoted,403)
 await h.cmd('document-import.undo',{id},demoted,403)
 assert.equal((await h.send('/api/platter/imported-original?id='+id+'&name=reviewed-report-choices.json',undefined,demoted)).status,403)
 assert.deepEqual(await snapshot(),afterDemotion,'revoked owner authority cannot expose source bytes or mutate imports')
 await h.cmd('document-import.continue',{id:native.id},demoted,403)
 assert.deepEqual(await nativeSnapshot(),nativeBeforeDemotion,'revoked import authority cannot replay native creation or undo')
 assert.equal(frozen[3].length,5)
}))
