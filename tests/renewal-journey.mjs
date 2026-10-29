import assert from 'node:assert/strict'

export const renewalOffer={title:'Synthetic fixed-term care',scope:'Selected care scope',terms:'Fixed term; renewal drafts are prepared 45 days before the term ends.',depositPercent:'1',packages:[{id:'unused',label:'Unselected',price:'500'},{id:'care',label:'Agreed care',price:'1',optionalItems:[{id:'extra',label:'Selected extra',unitPrice:'10.01',min:1,max:8,quantity:1,editable:true,interval:'monthly',term:12,startsOn:'2099-01-31'},{id:'excluded',label:'Not accepted',unitPrice:'999',min:1,max:1,quantity:1,editable:false}]}],pricingTables:[{optionId:'care',name:'Care services',lines:[{name:'Monthly care',quantity:'1',unit:'month',unitPrice:'1200',interval:'monthly',term:12,startsOn:'2099-01-31'}]}]}
export async function verifyRenewalClient(h,path){
 assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
 const mail=await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=(SELECT proposal_id FROM p_shares WHERE token=?) AND subject='Your Platter verification code' ORDER BY created_at DESC LIMIT 1").bind(path.split('/').at(-1)).first()
 const response=await h.send(path+'/action?name=code.verify',{code:mail.body.match(/\b\d{6}\b/)[0]})
 assert.equal(response.status,200,response.text);return response.cookie
}
export async function acceptedRenewal(h,{title=renewalOffer.title,items=[],paymentTerms,setup=false}={}){
 const sequence=(await h.db.prepare('SELECT count(*) AS n FROM p_clients').first()).n
 const fixture=structuredClone(renewalOffer)
 if(setup)fixture.pricingTables[0].lines.unshift({name:'Setup',quantity:'1',unit:'project',unitPrice:'500'})
 const client=await h.cmd('client.save',{name:'Synthetic renewal client '+sequence,email:['synthetic-platter-'+sequence,'example.invalid'].join('@')}),p=await h.cmd('proposal.prepare',{...fixture,clientId:client.id,title,...(paymentTerms?{paymentTerms}:{})})
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
 const path=new URL((await h.cmd('proposal.send',{id:p.id,version:2})).shareUrl).pathname,cookie=await verifyRenewalClient(h,path)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Synthetic signer',optionId:'care',items,consent:true},cookie)).status,200)
 return {...p,path,cookie,client}
}
export async function renewalJourney(h){
 const clock=async at=>h.db.prepare('INSERT INTO p_expiry_clock VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(Date.parse(at)).run()
 await clock('2098-12-01T12:00:00Z')
 const source=await acceptedRenewal(h,{paymentTerms:{netDays:30,milestones:[]}}),get=async id=>(await h.state()).proposals.find(p=>p.id===id)
 const original=(await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(source.id).first()).snapshot
 const pdf=async()=>{const r=await h.mf.dispatchFetch(h.origin+'/api/platter/agreement.pdf?id='+source.id,{headers:{cookie:h.owner}});assert.equal(r.status,200);return Buffer.from(await r.arrayBuffer())},bytes=await pdf()
 const input={id:source.id,version:4,policyVersion:0,increaseKind:'percent',increase:'5',consent:true}
 await h.cmd('renewal.configure',{...input,consent:false},h.owner,400)
 const key=await h.cmd('agent.create',{label:'Synthetic renewal refusal'})
 assert.equal((await h.send('/api/platter/agent/command',{name:'renewal.configure',input},'',{authorization:'Bearer '+key.token})).status,403)
 const otherEmail=['synthetic-platter-member','example.invalid'].join('@')
 assert.equal((await h.send('/auth/invite',{email:otherEmail,displayName:'Synthetic colleague',role:'member',returnTo:'/app'},h.owner)).status,202)
 let other=await h.signIn(otherEmail)
 const otherId=(await h.state(other)).actor.id
 assert.equal((await h.send('/auth/operator/role',{operatorId:otherId,role:'admin'},h.owner)).status,200)
 other=await h.signIn(otherEmail)
 for(const name of ['renewal.configure','renewal.revoke','renewal.run'])await h.cmd(name,input,other,403)
 assert.equal((await h.state(other)).renewals,undefined,'Non-owner roles receive no renewal configuration')
 await h.cmd('renewal.configure',{...input,version:99},h.owner,409)
 await h.cmd('renewal.configure',{...input,increaseKind:'fixed',increase:'-0.01'},h.owner,400)
 assert.equal((await h.state()).renewals.rows.length,0)
 const configured=await h.cmd('renewal.configure',input)
 assert.equal(configured.dueOn,'2099-12-17');assert.equal(configured.endsOn,'2100-01-31')
 await h.cmd('renewal.configure',input,h.owner,409)
 const run=async at=>{await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'})}
 await run('2099-12-16T23:59:59Z');assert.equal((await h.state()).renewals.rows[0].draft_id,null,'No early draft')
 const rule=await h.cmd('approval.rule',{version:0,name:'Review increased recurring value',position:0,condition:{kind:'totalOver',cents:1500000,currency:'USD'},approvers:['role:owner']})
 const mailBefore=(await h.db.prepare('SELECT COUNT(*) AS n FROM p_mail').first()).n
 await Promise.all([run('2099-12-17T00:00:00Z'),run('2099-12-17T00:00:00Z')])
 await h.cmd('renewal.run',{});const renewal=(await h.state()).renewals.rows[0],draft=await get(renewal.draft_id)
 assert.ok(draft);assert.equal(draft.status,'draft');assert.equal(draft.revision,1);assert.equal(draft.approval.complete,false);assert.deepEqual(draft.approval.steps.map(s=>s.id),[rule.id],'The current ordinary approval policy is evaluated for the new price')
 assert.deepEqual(draft.options.map(o=>o.id),['care'],'Only the accepted package is offered')
 assert.equal(draft.options[0].tables[0].lines[0].unitPrice,'1260.00')
 assert.equal(draft.options[0].tables[0].lines[0].recurrence.startsOn,'2100-01-31')
 assert.equal(draft.options[0].cents,1512000)
 await h.cmd('client.erase',{id:source.client.id,confirmName:'Synthetic renewal client 0'},h.owner,409)
 assert.equal(draft.scope,'Selected care scope');assert.equal(draft.terms,renewalOffer.terms)
 for(const table of ['p_approvals','p_shares','p_reminder_authority','p_sender_notice_authority','p_acceptances','p_collection_policy'])assert.equal((await h.db.prepare('SELECT count(*) AS n FROM '+table+' WHERE proposal_id=?').bind(draft.id).first()).n,0,table+' grants nothing to the draft')
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_mail').first()).n,mailBefore,'Draft creation sends no mail')
 assert.equal((await h.db.prepare("SELECT count(*) AS n FROM p_audit WHERE action='renewal.drafted' AND subject=?").bind(draft.id).first()).n,1,'Repeated or concurrent execution creates one draft and audit')
 await h.cmd('proposal.send',{id:draft.id,version:1},h.owner,409)
 await h.cmd('proposal.approve',{id:draft.id,version:1,revision:1})
 const nextPath=new URL((await h.cmd('proposal.send',{id:draft.id,version:2})).shareUrl).pathname
 assert.equal((await h.send(nextPath+'/action?name=accept',{name:'Synthetic signer',optionId:'care',consent:true},source.cookie)).status,401,'Old verification does not authorize the renewal')
 const cookie=await verifyRenewalClient(h,nextPath)
 assert.equal((await h.send(nextPath+'/action?name=accept',{name:'Synthetic signer',optionId:'care',consent:true},cookie)).status,200)
 const accepted=(await get(draft.id)).acceptance
 assert.equal(accepted.paymentSchedule.netDays,30,'Informational payment terms follow the selected accepted agreement')
 assert.deepEqual(accepted.paymentSchedule.rows.filter(r=>r.kind==='recurring').map(r=>r.date),['2100-01-31','2100-02-28','2100-03-31','2100-04-30','2100-05-31','2100-06-30','2100-07-31','2100-08-31','2100-09-30','2100-10-31','2100-11-30','2100-12-31'])
 assert.equal(accepted.selection.fees.recurring[0].amountCents,126000)
 assert.equal((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(source.id).first()).snapshot,original)
 assert.deepEqual(await pdf(),bytes,'The original signed artifact stays byte identical')
 // Exact fixed increases and selected optional quantities survive independent copying.
 const fixed=await acceptedRenewal(h,{title:'Fixed increase',items:[{id:'extra',quantity:3}],setup:true,paymentTerms:{netDays:15,milestones:[{label:'First milestone',percent:'40',date:'2099-02-28'},{label:'Delivery milestone',percent:'60',event:'Delivery'}]}})
 await h.cmd('approval.policy',{version:1,required:false,defaultRole:'owner'})
 await h.cmd('approval.rule.delete',{version:2,id:rule.id})
 await h.cmd('renewal.configure',{...input,id:fixed.id,increaseKind:'fixed',increase:'0.01'})
 await h.cmd('renewal.run',{})
 const fixedRow=(await h.state()).renewals.rows.find(r=>r.proposal_id===fixed.id),fixedDraft=await get(fixedRow.draft_id)
 assert.deepEqual(fixedDraft.options[0].tables.flatMap(t=>t.lines).map(l=>[l.name,l.quantity,l.unitPrice]),[['Setup','1','500.00'],['Monthly care','1','1200.01'],['Selected extra','3','10.02']])
 assert.deepEqual(JSON.parse(fixedDraft.payment_terms).milestones,[{label:'First milestone',bps:4000,date:'2100-02-28'},{label:'Delivery milestone',bps:6000,event:'Delivery'}],'Dated informational milestones move by the fixed term; events remain events')
 assert.equal(fixedDraft.options[0].optionalItems?.length??0,0,'Unselected additions cannot enter the draft')
 assert.equal(fixedDraft.approval.required,true,'Renewals retain a fresh human review when ordinary unmatched proposals skip approval')
 await h.cmd('proposal.send',{id:fixedDraft.id,version:1},h.owner,409)
 await h.cmd('approval.policy',{version:3,required:true,defaultRole:'owner'})
 await h.cmd('proposal.revise',{id:fixedDraft.id,version:1,title:'Independent renewal edit',clientId:fixed.client.id,scope:'Independently edited',packages:[{id:'care',label:'New',price:'1'}],pricingTables:[],depositPercent:'1'})
 assert.equal((await get(fixed.id)).scope,'Selected care scope')
 // Revocation and an owner credential revision invalidate dormant execution.
 const revoked=await acceptedRenewal(h,{title:'Revoked renewal'}),stale=await acceptedRenewal(h,{title:'Stale owner renewal'})
 for(const p of [revoked,stale])await h.cmd('renewal.configure',{...input,id:p.id})
 await h.cmd('renewal.revoke',{id:revoked.id,version:4,policyVersion:1})
 const operator=await h.db.prepare("SELECT id FROM oa_operators WHERE role='owner'").first()
 await h.db.prepare('UPDATE oa_operators SET version=version+1 WHERE id=?').bind(operator.id).run()
 await run('2099-12-18T00:00:00Z')
 for(const id of [revoked.id,stale.id])assert.equal((await h.db.prepare('SELECT draft_id FROM p_renewals WHERE proposal_id=?').bind(id).first()).draft_id,null,'Lost authority creates no draft')
}
