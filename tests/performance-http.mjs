import assert from 'node:assert/strict'

export async function reportPerformance(h){
 const {salesFixture,expectedPerformance,metricValues}=await import('./performance-fixture.mjs'),f=await salesFixture(h)
 for(const dimension of ['owner','template','service','segment','quarter']){
  const report=await h.send('/api/platter/performance?groupBy='+dimension,undefined,h.owner);assert.equal(report.status,200,report.text);assert.equal(report.value.count,100)
  const keys={owner:[f.own.id,f.other.id],template:f.templates.map(t=>t.id),service:f.catalog.map(c=>c.id),segment:['Agency','Enterprise'],quarter:['2025-Q1','2025-Q2']}[dimension]
  assert.deepEqual(report.value.rows.map(r=>r.key).sort(),[...keys].sort(),dimension+' explicit group set')
  // Cross-quarter creation, distinct send dates and later receipts make these independent expectations discriminating.
  assert.deepEqual(keys.map(key=>metricValues(report.value.rows.find(r=>r.key===key))),expectedPerformance[dimension],dimension+' exact independent metrics')
  assert.deepEqual(metricValues(report.value.totals[0]),[100,50,50,5000,4,5,200000,{Budget:20,Timing:30}])
 }
 const filtered=await h.send('/api/platter/performance?groupBy=quarter&segment=Agency&quarter=2025-Q1',undefined,h.owner);assert.equal(filtered.value.count,25);assert.deepEqual(metricValues(filtered.value.rows[0]),[25,20,5,8000,2,3,100000,{Budget:5}])
 assert.equal((await h.send('/api/platter/performance?segment=Absent',undefined,h.owner)).value.count,0)
 assert.equal((await h.send('/api/platter/performance?groupBy=private',undefined,h.owner)).status,400)
 const screen=await h.send('/app?view=sales-performance',undefined,h.owner);assert.equal(screen.status,200);assert.match(screen.text,/100 decided proposals/);assert.match(screen.text,/60.00%/)
 const query='groupBy=quarter&segment=Agency',csv=await h.send('/api/platter/performance.csv?'+query,undefined,h.owner);assert.equal(csv.status,200);assert.match(csv.text,/2025-Q1,USD,25,20,5,80.00,2,20,3,20,1000.00/)
 const second=await h.signIn(f.other.email)
 for(const path of ['/api/platter/performance','/api/platter/performance.csv','/app?view=sales-performance'])assert.equal((await h.send(path,undefined,second)).status,403)
 assert.equal((await h.send('/api/platter/performance')).status,401)
 await h.cmd('report.schedule',{report:'sales-performance',filters:query,cadence:'weekly',weekday:1,hour:9,recipients:[h.auth.OWNER_EMAIL,f.other.email]})
 const schedule=(await h.state()).reportSchedules[0];await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(schedule.nextRunAt),cron:'*/15 * * * *'});await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(schedule.nextRunAt),cron:'*/15 * * * *'})
 const mail=(await h.state()).reportOutbox;assert.equal(mail.length,2);for(const m of mail){assert.match(m.subject,/sales performance/);assert.ok(m.body.includes(csv.text),'weekly report matches the filtered screen CSV');assert.match(m.body,/50 decided proposals/)}
 const promotion=await h.send('/auth/operator/role',{operatorId:f.other.id,role:'admin'},h.owner);assert.equal(promotion.status,200)
 const admin=await h.signIn(f.other.email);assert.equal((await h.send('/api/platter/performance',undefined,admin)).status,403);assert.equal((await h.state(admin)).salesHistory,undefined);assert.deepEqual((await h.state(admin)).reportOutbox,[]);assert.deepEqual((await h.state(admin)).reportSchedules,[])
 await h.cmd('report.schedule',{report:'sales-performance',cadence:'weekly',weekday:1,hour:9,recipients:[f.other.email]},admin,403)
 await h.db.prepare("UPDATE p_payment_records SET received_on=(SELECT substr(datetime(a.accepted_at/1000,'unixepoch'),1,10) FROM p_acceptances a WHERE a.proposal_id=p_payment_records.proposal_id)").run()
 assert.equal((await h.send('/api/platter/performance',undefined,h.owner)).value.totals[0].medianTimeToPayMs,0,'same-day date-only receipts have zero elapsed days')
 // Missing sign and payment facts remain null, rather than being invented from creation or invoice exports.
 await h.db.prepare('UPDATE p_expiry SET sent_at=NULL').run();await h.db.prepare('DELETE FROM p_payment_records').run()
 const unknown=await h.send('/api/platter/performance',undefined,h.owner);assert.equal(unknown.value.totals[0].medianTimeToSignMs,null);assert.equal(unknown.value.totals[0].medianTimeToPayMs,null)
 const historical=await h.db.prepare("SELECT * FROM p_proposals WHERE id='synthetic-platter-history-3-24'").first(),aud={...historical,id:'synthetic-platter-aud',currency:'AUD'},columns=Object.keys(aud)
 await h.db.prepare(`INSERT INTO p_proposals(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).bind(...Object.values(aud)).run();await h.cmd('proposal.win',{id:aud.id,version:1,reason:'Budget'})
 const currencies=(await h.send('/api/platter/performance',undefined,h.owner)).value.totals;assert.deepEqual(currencies.map(r=>[r.currency,r.decided,r.won,r.averageDealCents]),[['AUD',1,1,400000],['USD',100,50,200000]],'an explicit won override is counted without combining currencies')
 // One decided proposal contains repeated lines and a second distinct service.
 const options=JSON.parse(historical.options),secondLine={...options[0].tables[0].lines[0],catalogId:f.catalog[1].id,name:'Synthetic service 2'}
 options[0].tables[0].lines.push(secondLine,structuredClone(secondLine))
 await h.db.prepare('UPDATE p_proposals SET options=? WHERE id=?').bind(JSON.stringify(options),historical.id).run()
 const services=(await h.send('/api/platter/performance?groupBy=service',undefined,h.owner)).value
 assert.deepEqual(f.catalog.map(c=>services.rows.find(r=>r.key===c.id&&r.currency==='USD').decided),[50,51],'each proposal appears once in every applicable service group')
 const declined=await h.cmd('proposal.prepare',{...f.base,clientId:f.clients[0].id,title:'Synthetic declined proposal'})
 await h.cmd('proposal.approve',{id:declined.id,version:1,revision:1})
 const share=await h.cmd('proposal.send',{id:declined.id,version:2}),path=new URL(share.shareUrl).pathname
 await h.send(path+'/action?name=code.request',{})
 const code=(await h.state()).outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0],verified=await h.send(path+'/action?name=code.verify',{code})
 assert.equal((await h.send(path+'/action?name=decline',{revision:1,reason:'Competition'},verified.cookie)).status,410)
 const withDecline=(await h.send('/api/platter/performance',undefined,h.owner)).value.totals.find(r=>r.currency==='USD')
 assert.deepEqual([withDecline.decided,withDecline.won,withDecline.lost,withDecline.winRateBps,withDecline.lostReasons],[101,50,51,4950,{Budget:20,Timing:30,Competition:1}],'a client decline changes the denominator, loss count, rate and reason')

}

export async function priceHistory(h){
 const {salesFixture}=await import('./performance-fixture.mjs'),f=await salesFixture(h),before=await h.db.prepare('SELECT options,version FROM p_proposals WHERE id=?').bind(f.draft.id).first()
 // Distractors independently challenge the item, segment, currency and unit boundaries.
 const original=await h.db.prepare("SELECT * FROM p_proposals WHERE id='synthetic-platter-history-0-24'").first()
 for(const [n,patch] of [{client_id:f.clients[1].id},{catalogId:f.catalog[1].id},{currency:'AUD'},{unit:'hour'},{won:true}].entries()){
  const row={...original,id:'synthetic-platter-distractor-'+n,...(patch.client_id?{client_id:patch.client_id}:{}),...(patch.currency?{currency:patch.currency}:{})},options=JSON.parse(row.options)
  for(const line of options[0].tables[0].lines)Object.assign(line,{unitPrice:'0.01',...(patch.catalogId?{catalogId:patch.catalogId}:{}),...(patch.unit?{unit:patch.unit}:{})});row.options=JSON.stringify(options)
  const columns=Object.keys(row);await h.db.prepare(`INSERT INTO p_proposals(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).bind(...Object.values(row)).run()
  await h.db.prepare("INSERT INTO p_outcome_records(proposal_id,revision,kind,actor_id,actor_role,actor_email,occurred_at,reason) VALUES(?,1,?,?,'owner',?,?,'Budget')").bind(row.id,patch.won?'won':'lost',f.own.id,f.own.email,Date.UTC(2025,0,15)).run()
 }
 let p=(await h.state()).proposals.find(p=>p.id===f.draft.id),suggestion=p.priceSuggestions[0]
 assert.equal(p.priceSuggestions.length,1);assert.deepEqual([suggestion.minCents,suggestion.maxCents,suggestion.suggestedCents,suggestion.sampleSize],[100000,400000,250000,50]);assert.equal(suggestion.examples.length,3);assert.equal(new Set(suggestion.examples.map(e=>e.id)).size,3)
 const screen=await h.send('/app/proposal?id='+f.draft.id,undefined,h.owner);assert.equal(screen.status,200);for(const example of suggestion.examples){assert.ok(screen.text.includes('/app/proposal?id='+example.id));assert.equal((await h.send('/app/proposal?id='+example.id,undefined,h.owner)).status,200)}
 assert.deepEqual(await h.db.prepare('SELECT options,version FROM p_proposals WHERE id=?').bind(f.draft.id).first(),before,'read and suggestion leave price unchanged')
 const line={catalogId:f.catalog[0].id,name:'Synthetic service 1',quantity:'1',unit:'project',unitPrice:'123.45'}
 const multi=await h.cmd('proposal.prepare',{...f.base,clientId:f.clients[0].id,title:'Synthetic multiple tables',pricingTables:[{optionId:'one',name:'First',lines:[line]},{optionId:'one',name:'Second',lines:[line]},{optionId:'two',name:'Other package',lines:[line]}]})
 const everyLine=(await h.state()).proposals.find(r=>r.id===multi.id).priceSuggestions
 assert.deepEqual(everyLine.map(r=>[r.optionId,r.tableIndex,r.lineIndex,r.sampleSize,r.suggestedCents]),[['one',0,0,50,250000],['one',1,0,50,250000],['two',0,0,50,250000]],'every table and package receives a suggestion with distinct proposal samples')
 const isolated=await h.cmd('client.save',{name:'Synthetic unmatched client',email:'synthetic-platter-96'+'@'+'example.com',segment:'No comparable history'})
 const unmatched=await h.cmd('proposal.prepare',{...f.base,clientId:isolated.id,title:'Synthetic unmatched history',pricingTables:[{optionId:'one',name:'Services',lines:[line]}]})
 assert.deepEqual((await h.state()).proposals.find(r=>r.id===unmatched.id).priceSuggestions,[],'a classified client without comparable history has no range')
 await h.cmd('proposal.approve',{id:f.draft.id,version:1,revision:1})
 const realApproval=(await h.state()).proposals.find(r=>r.id===f.draft.id)
 assert.equal(realApproval.status,'approved');assert.ok(realApproval.approved_at);assert.ok(realApproval.approved_by)
 const input={id:f.draft.id,version:realApproval.version,optionId:'one',tableIndex:0,lineIndex:0,suggestedCents:250000}
 const businessRecords=async()=>Object.fromEntries(await Promise.all(['p_proposals','p_revisions','p_approvals','p_audit'].map(async table=>[table,(await h.db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results])))
 const refused=async(fields,cookie,status)=>{const records=await businessRecords();await h.cmd('pricing.suggested',fields,cookie,status);assert.deepEqual(await businessRecords(),records,'refused Apply preserves proposal, revision, approval and audit records')}

 await h.cmd('proposal.share',{id:f.draft.id,operatorId:f.other.id});const member=await h.signIn(f.other.email);assert.equal((await h.send('/app/proposal?id='+f.draft.id,undefined,member)).status,200);await refused(input,member,403);await refused({...input,suggestedCents:1},h.owner,409)
 await h.cmd('pricing.suggested',input)
 p=(await h.state()).proposals.find(p=>p.id===f.draft.id);assert.equal(p.options[0].tables[0].lines[0].unitPrice,'2500.00');assert.equal(p.options[0].tables[0].lines[0].catalogId,f.catalog[0].id);assert.equal(p.options[0].cents,500000);assert.equal(p.status,'draft');assert.equal(p.approved_at,null)
 await refused(input,h.owner,409)
 await h.cmd('client.segment',{id:f.clients[0].id,segment:'No comparable history'})
 // Reclassify only the current client: all its historical rows move with that classification; the other segment still never contributes.
 await h.cmd('client.segment',{id:f.clients[0].id,segment:''});p=(await h.state()).proposals.find(p=>p.id===f.draft.id);assert.deepEqual(p.priceSuggestions,[])
 await h.cmd('client.segment',{id:f.clients[0].id,segment:'Agency'})
 await h.cmd('proposal.approve',{id:p.id,version:p.version,revision:p.revision});const approved=(await h.state()).proposals.find(v=>v.id===p.id);await h.cmd('proposal.send',{id:p.id,version:approved.version});const sent=(await h.state()).proposals.find(v=>v.id===p.id);await refused({...input,version:sent.version},h.owner,409)
 await refused({...input,id:'synthetic-platter-history-0-00',version:1},h.owner,409)
 const native=await h.cmd('proposal.prepare',{...f.base,clientId:f.clients[0].id,title:'Native catalog comparison'})
 await h.cmd('catalog.insert',{id:native.id,version:1,catalogId:f.catalog[0].id,catalogVersion:1,optionId:'one',quantity:'1'})
 const linked=(await h.state()).proposals.find(p=>p.id===native.id).priceSuggestions;assert.equal(linked.length,1);assert.equal(linked[0].catalogId,f.catalog[0].id);assert.equal(linked[0].sampleSize,50,'native catalog insertion retains the historical comparison identity')

 assert.ok((await h.send('/api/platter/audit?action=pricing.suggested',undefined,h.owner)).value.rows.some(r=>r.subject===p.id))
}
