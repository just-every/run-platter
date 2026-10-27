// Historical decided offers have fixed dates and independent hand-calculated expectations.
export async function salesFixture(h) {
 const finished=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});if(finished.status!==303)throw Error('Fixture setup failed')
 const own=await h.db.prepare("SELECT * FROM oa_operators WHERE role='owner'").first(),other={...own,id:'synthetic-platter-person',email:'synthetic-platter-person@example.com',display_name:'Synthetic salesperson',role:'member'}
 const columns=Object.keys(other);await h.db.prepare(`INSERT INTO oa_operators(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).bind(...Object.values(other)).run()
 const clients=[];for(const segment of ['Agency','Enterprise'])clients.push(await h.cmd('client.save',{name:'Synthetic '+segment,email:segment.toLowerCase()+'@synthetic-platter.example.com',segment}))
 const catalog=[];for(const n of [1,2])catalog.push(await h.cmd('catalog.save',{name:'Synthetic service '+n,sku:'synthetic-platter-'+n,unit:'project',unitPrice:'100',description:'Fixture service'}))
 const base={title:'Synthetic source',scope:'A bounded service',optionOne:'Service',priceOne:'1000',optionTwo:'Extended',priceTwo:'2000',depositPercent:'25'}
 const source=await h.cmd('proposal.prepare',{...base,clientId:clients[0].id}),templates=[]
 for(const name of ['Synthetic template A','Synthetic template B'])templates.push(await h.cmd('template.save',{id:source.id,version:1,name}))
 const groups=[{owner:own.id,client:0,template:0,service:0,month:0,wins:20,days:2,price:1000,reason:'Budget'},{owner:own.id,client:1,template:1,service:1,month:3,wins:15,days:4,price:2000,reason:'Timing'},{owner:other.id,client:1,template:0,service:1,month:0,wins:10,days:6,price:3000,reason:'Budget'},{owner:other.id,client:0,template:1,service:0,month:3,wins:5,days:8,price:4000,reason:'Timing'}]
 const writes=[]
 for(const [g,r] of groups.entries())for(let i=0;i<25;i++){
  const id=`synthetic-platter-history-${g}-${String(i).padStart(2,'0')}`,at=Date.UTC(2025,r.month,15),sent=at-r.days*86400000,won=i<r.wins,cents=r.price*100,line={catalogId:catalog[r.service].id,name:'Synthetic service '+(r.service+1),description:'Fixture service',quantity:'1',unit:'project',unitPrice:r.price.toFixed(2),group:'',lineTotalCents:cents},options=[{id:'one',label:'Service',cents,tables:[{name:'Services',lines:[line],groups:[{name:'',subtotalCents:cents}],subtotalCents:cents}]}],snapshot={id,client_id:clients[r.client].id,title:id,scope:base.scope,revision:1,deposit_bps:2500,options,currency:'USD'}
  writes.push(h.db.prepare("INSERT INTO p_proposals(id,client_id,title,scope,version,revision,status,deposit_bps,options,prepared_by,created_at,currency,sales_owner_id,sales_owner_name) VALUES(?,?,?,?,1,1,?,2500,?,?,?,?,?,?)").bind(id,snapshot.client_id,id,base.scope,won?'accepted':'sent',JSON.stringify(options),own.email,sent,'USD',r.owner,r.owner===own.id?own.email:other.email))
  writes.push(h.db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,1,?,?,?,?)').bind(id,JSON.stringify(snapshot),own.email,sent,'USD'))
  writes.push(h.db.prepare("INSERT INTO p_expiry(proposal_id,mode,time_zone,sent_at) VALUES(?,'never','UTC',?)").bind(id,sent))
  writes.push(h.db.prepare('INSERT INTO p_template_sources(proposal_id,template_id,template_version) VALUES(?,?,1)').bind(id,templates[r.template].id))
  if(won){writes.push(h.db.prepare("INSERT INTO p_acceptances(proposal_id,revision,snapshot,name,email,option_id,total_cents,deposit_cents,accepted_at,consent,currency) VALUES(?,1,?,'Synthetic client','client@synthetic-platter.example.com','one',?,?,?,?, 'USD')").bind(id,JSON.stringify(snapshot),cents,cents/4,at,'Explicit historical acceptance'))
   writes.push(h.db.prepare("INSERT INTO p_payment_records(id,proposal_id,revision,currency,cents,method,reference,received_on,recorded_by,recorded_at) VALUES(?,?,1,'USD',?,'wire',?,?,?,?)").bind('payment-'+id,id,cents,'synthetic-platter-payment',new Date(at+(r.days+1)*86400000).toISOString().slice(0,10),own.id,at+(r.days+1)*86400000))
  }else writes.push(h.db.prepare("INSERT INTO p_outcome_records(proposal_id,revision,kind,actor_id,actor_role,actor_email,occurred_at,reason) VALUES(?,1,'lost',?,'owner',?,?,?)").bind(id,own.id,own.email,at,r.reason))
 }
 for(let i=0;i<writes.length;i+=80)await h.db.batch(writes.slice(i,i+80))
 const draft=await h.cmd('proposal.prepare',{...base,title:'Synthetic pricing draft',clientId:clients[0].id,pricingTables:[{optionId:'one',name:'Services',lines:[{catalogId:catalog[0].id,name:'Synthetic service 1',description:'Fixture service',quantity:'2',unit:'project',unitPrice:'123.45'}]}]})
 return {own,other,clients,catalog,templates,draft,base}
}
export const expectedPerformance={
 owner:[[50,35,15,7000,2,3,142857,{Budget:5,Timing:10}],[50,15,35,3000,6,7,333333,{Budget:15,Timing:20}]],
 template:[[50,30,20,6000,2,3,166667,{Budget:20}],[50,20,30,4000,4,5,250000,{Timing:30}]],
 service:[[50,25,25,5000,2,3,160000,{Budget:5,Timing:20}],[50,25,25,5000,4,5,240000,{Budget:15,Timing:10}]],
 segment:[[50,25,25,5000,2,3,160000,{Budget:5,Timing:20}],[50,25,25,5000,4,5,240000,{Budget:15,Timing:10}]],
 quarter:[[50,30,20,6000,2,3,166667,{Budget:20}],[50,20,30,4000,4,5,250000,{Timing:30}]],
}
export const metricValues=r=>[r.decided,r.won,r.lost,r.winRateBps,r.medianTimeToSignMs/86400000,r.medianTimeToPayMs/86400000,r.averageDealCents,r.lostReasons]
