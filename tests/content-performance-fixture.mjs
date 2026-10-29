import assert from 'node:assert/strict'
export const contentOffer={title:'Content campaign',scope:'Reviewed campaign scope',optionOne:'Essentials',priceOne:'1000',optionTwo:'Premium',priceTwo:'2000',depositPercent:'25'}
const rush=id=>({id,label:'Rush delivery',unitPrice:'50',quantity:1,min:1,max:5,editable:true})
const review={id:'review',label:'Review session',unitPrice:'20',quantity:1,min:1,max:1,editable:false}
export async function contentFixture(h,count=100,{approval=true,reason='Recorded client decision',readingSeconds=Array.from({length:20},(_,i)=>i*10)}={}){
 const client=await h.cmd('client.save',{name:'Content fixture client',email:'synthetic-platter-9831'+String.fromCharCode(64)+'example.test'})
 const library=await h.cmd('library.save',{title:'Acme case study',kind:'case_study',content:'Independent campaign outcomes.'})
 const checklist=await h.cmd('library.save',{title:'Delivery checklist',kind:'section',content:'Agreed delivery steps.'})
 const templates=[]
 for(const [index,name] of ['Agency retainer','Studio campaign','Advisory engagement'].entries()){
  let source=await h.cmd('proposal.prepare',{...contentOffer,clientId:client.id})
  if(index===1)source=await h.cmd('library.insert',{id:source.id,version:source.version,itemId:checklist.id,itemVersion:1,mode:'detached',consent:true})
  templates.push(await h.cmd('template.save',{id:source.id,version:source.version,name}))
 }
 await h.cmd('tracking.settings',{enabled:'yes',consent:'yes',alerts:'no',quietMinutes:30,retentionDays:90})
 const proposals=[],views=[]
 let caseIndex=0
 const clock=async at=>h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(at).run()
 for(let i=0;i<count;i++){
  const at=Date.parse('2027-06-01T12:00:00Z')+i*300000;await clock(at)
  const template=templates[i<40?0:i<70?1:2]
  let p=await h.cmd('template.start',{id:template.id,version:1,clientId:client.id,title:'Content decision '+i})
  p=await h.cmd('proposal.revise',{...contentOffer,id:p.id,version:p.version,clientId:client.id,title:'Content decision '+i,packages:[{id:'one',label:i<30?'Growth':'Essentials',price:'1000',optionalItems:i<25?[rush('rush')]:[]},{id:'two',label:'Premium',price:'2000',optionalItems:[review,...(i<25?[rush('rush-other')]:[])]}]})
  if(i<12||i>=18&&i<26)for(let occurrence=0;occurrence<2;occurrence++)p=await h.cmd('library.insert',{id:p.id,version:p.version,itemId:library.id,itemVersion:1,mode:occurrence?'detached':'linked',consent:true})
  if(approval)await h.cmd('proposal.approve',{id:p.id,version:p.version,revision:p.revision})
  const sent=await h.cmd('proposal.send',{id:p.id,version:p.version+(approval?1:0)}),path=new URL(sent.shareUrl).pathname
  const page=await h.send(path),viewId=page.text.match(/data-engagement-view="([^"]+)"/)[1]
  const readings={scope:10000,pricing:40000,'package:one':30000,'package:two':20000,'optional:two:review':5000}
  if(i<25){readings['optional:one:rush']=5000;readings['optional:two:rush-other']=10000}
  const blocks=[...page.text.matchAll(/data-engagement-section="block:([^"]+)"/g)].map(m=>m[1])
  if(i<12||i>=18&&i<26){const total=readingSeconds[caseIndex++]*1000;readings['block:'+blocks[0]]=total/2;readings['block:'+blocks[1]]=total/2}
  else if(i>=40&&i<70)readings['block:'+blocks[0]]=20000
  await clock(at+200000)
  const capture={viewId,optionId:'one',readings}
  assert.equal((await h.send(path+'/engagement',capture)).status,200)
  if(i===0){assert.equal((await h.send(path+'/engagement',capture)).status,200,'cumulative capture replay never adds reading time')}
  views.push({path,viewId,capture})
  const won=i<18||i>=40&&i<55||i>=70&&i<90
  if(won&&i!==89){
   assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
   const messages=(await h.db.prepare('SELECT body FROM p_mail WHERE proposal_id=? AND subject LIKE ? ORDER BY created_at DESC').bind(p.id,'%verification code%').all()).results
   const verified=await h.send(path+'/action?name=code.verify',{code:messages[0].body.match(/\b\d{6}\b/)[0]});assert.equal(verified.status,200,verified.text)
   const input={name:'Synthetic Client',optionId:i>=12&&i<18?'two':'one',consent:true,items:i<6?[{id:'rush',quantity:i===0?3:1}]:[]}
   const accepted=await h.send(path+'/action?name=accept',input,verified.cookie);assert.equal(accepted.status,200,accepted.text)
   if(i===0){assert.equal((await h.send(path+'/action?name=accept',input,verified.cookie)).status,200)}
  }else await h.cmd(i===89?'proposal.win':'proposal.lose',{id:p.id,version:p.version+(approval?2:1),reason,notice:false})
  proposals.push({...p,won})
 }
 return {client,library,checklist,templates,proposals,views}
}
export const expectedContentRows=[
 ['library','Acme case study',20,12,8,0,'60.0%'],['library','Delivery checklist',30,15,15,0,'50.0%'],
 ['optional-item','Review session',100,53,47,0,'0.0%'],['optional-item','Rush delivery',25,18,7,6,'24.0%'],
 ['package','Essentials',70,35,35,34,'48.6%'],['package','Growth',30,18,12,12,'40.0%'],['package','Premium',100,53,47,6,'6.0%'],
 ['template','Advisory engagement',30,20,10,0,'66.7%'],['template','Agency retainer',40,18,22,0,'45.0%'],['template','Studio campaign',30,15,15,0,'50.0%'],
]
export const contentRows=report=>report.rows.map(r=>[r.kind,r.name,r.offered,r.won,r.lost,r.chosen,r.rate]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))

// Independently calculated medians: one sample per proposal, summing its retained views and placements.
export const expectedReadingRows=[
 ['library','Acme case study',95000,20],['library','Delivery checklist',20000,30],
 ['optional-item','Review session',5000,100],['optional-item','Rush delivery',15000,25],
 ['package','Essentials',30000,70],['package','Growth',30000,30],['package','Premium',20000,100],
 ['template','Advisory engagement',50000,30],['template','Agency retainer',50000,40],['template','Studio campaign',70000,30],
]
export const readingRows=report=>report.rows.map(r=>[r.kind,r.name,r.readingTime,r.readingSamples]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
