import { strict as assert } from 'node:assert'

export async function prepareSenderNoticeArchive(h,client){
 const clock=Date.parse('2032-03-03T12:00:00Z')
  const create=async(title,startsOn)=>{
   const p=await h.cmd('proposal.prepare',{clientId:client.id,title,scope:'Retained renewal terms',depositPercent:'25',packages:[{id:'one',label:'Care',price:'1'}],pricingTables:[{optionId:'one',name:'Services',lines:[{name:'Care',quantity:'1',unit:'month',unitPrice:'1200',interval:'monthly',term:12,startsOn}]}]})
   await h.cmd('notification.renewal',{id:p.id,version:1,consent:true})
   await h.cmd('proposal.approve',{id:p.id,version:2,revision:1});const sent=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(sent.shareUrl).pathname
   await h.send(path+'/action?name=code.request',{})
   const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code'").bind(p.id).first()).body.match(/\b\d{6}\b/)[0],verified=await h.send(path+'/action?name=code.verify',{code})
   assert.equal(verified.status,200);assert.equal((await h.send(path+'/action?name=accept',{name:'Synthetic client',optionId:'one',consent:true},verified.cookie)).status,200)
   return p
  }
  const due=await create('Due retained renewal','2031-04-03'),future=await create('Future retained renewal','2032-06-01')
  const original=(await h.state()).proposals.find(r=>r.id===future.id)
  const template=await h.cmd('template.save',{id:future.id,version:original.version,name:'Retained notice template'})
  await h.cmd('template.delivery',{id:template.id,version:1,noticeSource:'override',expiryNoticeDays:6,renewalNoticeDays:35})
  await (await h.mf.getWorker()).scheduled({scheduledTime:clock,cron:'*/15 * * * *'})
  const followup=(await h.send('/api/platter/followups',undefined,h.owner)).value.rows.find(r=>r.id===due.id)
  assert.equal(followup.dueDate,'2032-03-03');assert.equal(followup.termEnd,'2032-04-02')
 const acceptance=(await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(future.id).first()).snapshot
 return {due,future,template,acceptance,clientId:client.id}
}

export async function assertSenderNoticeRestore(h,owner,receipt){
 const {due,future,template,acceptance,clientId}=receipt
 const restoredState=await h.state(owner)
 assert.deepEqual(restoredState.renewalNotices.active,[])
 assert.equal((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(future.id).first()).snapshot,acceptance)
 const retained=restoredState.renewalNotices.followups.find(r=>r.proposal_id===due.id)
 assert.equal(retained.due_date,'2032-03-03');assert.equal(retained.term_end,'2032-04-02')
 assert.deepEqual(restoredState.renewalNotices.events.map(r=>[r.action,r.lead_days]),[['authorized',30],['authorized',30]])
 await (await h.mf.getWorker()).scheduled({scheduledTime:Date.parse('2033-05-01T00:00:00Z'),cron:'*/15 * * * *'})
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_sender_notice_runs WHERE proposal_id=?').bind(future.id).first()).n,0,'A restored due renewal has no execution grant')
 for(const table of ['p_sender_notice_authority','p_renewal_notice_authority','p_notification_outbox'])assert.equal((await h.db.prepare('SELECT count(*) AS n FROM '+table).first()).n,0)
 const started=await h.cmd('template.start',{id:template.id,version:2,clientId},owner)
 const after=await h.state(owner)
 assert.equal(after.renewalNotices.settings.find(r=>r.proposal_id===started.id).lead_days,35)
 assert.ok(!after.renewalNotices.active.includes(started.id))
 assert.equal(after.proposals.find(r=>r.id===started.id).status,'draft')
}
