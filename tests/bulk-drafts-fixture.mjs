export async function bulkFixture(h, count=40) {
 const clients=[]
 for(let i=1;i<=count;i++)clients.push(await h.cmd('client.save',{name:'Synthetic bulk client '+i,email:['synthetic-platter-bulk-'+i,'example.test'].join('@')}))
 // Duplicate names are allowed in the native client book; never guess a binding.
 await h.cmd('client.save',{name:'Synthetic ambiguous bulk client',email:['synthetic-platter-bulk-duplicate-a','example.test'].join('@')})
 await h.cmd('client.save',{name:'Synthetic ambiguous bulk client',email:['synthetic-platter-bulk-duplicate-b','example.test'].join('@')})
 const prepared=await h.cmd('proposal.prepare',{clientId:clients[0].id,title:'Plan for {{Custom.Project}}',scope:'Deliver {{Custom.Deliverable}}.',optionOne:'Standard',priceOne:'100',optionTwo:'Extended',priceTwo:'200',depositPercent:'25'})
 await h.cmd('proposal.approve',{id:prepared.id,version:1,revision:1})
 const template=await h.cmd('template.save',{id:prepared.id,version:2,name:'Synthetic bulk draft template'})
 const delivery=await h.cmd('template.delivery',{id:template.id,version:1,remindersSource:'override',expirySource:'override',warningSource:'override',reminderDays:[3,7],reminderCap:2,expiryDays:21,warningDays:2})
 const lines=clients.map((c,index)=>[index===count-2?'missing-client':index===count-1?'Synthetic ambiguous bulk client':c.id,'Project '+(index+1),index>=count-5&&index<count-2?'':'Work '+(index+1),(1000+index+0.17).toFixed(2),(2000+index+0.31).toFixed(2)])
 const csv='client,var:Custom.Project,var:Custom.Deliverable,price:one,price:two\n'+lines.map(line=>line.join(',')).join('\n')
 const input={requestId:crypto.randomUUID(),templateId:template.id,templateVersion:delivery.version,csv}
 return {clients,prepared,template:{...template,version:delivery.version},csv,input}
}
export const bulkApply=(review)=>({id:review.id,digest:review.digest,csv:review.csv,templateVersion:review.templateVersion,consent:true})
