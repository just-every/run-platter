import assert from 'node:assert/strict'

export async function paymentCredentialJourney(h,{linked,calls,setHook,chargeId}){
 const connection=async()=>(await h.state()).connections.find(c=>c.provider==='stripe')
 const reconnect=async()=>{setHook(undefined);const c=await connection();await h.cmd('provider.connect',{provider:'stripe',version:c.version,token:'synthetic-platter-payment-credential',consent:true})}
 const refund={paymentId:linked.id,amount:'0.01',requestId:'synthetic-platter-credential-refund',reason:'Reviewed credential-bound refund',consent:true}
 const privateValue='synthetic-platter-private-payment-diagnostic'
 const failure=(status,headers={})=>Response.json({error:{message:privateValue}},{status,headers})
 const records=async()=>(await h.db.prepare('SELECT * FROM p_refunds ORDER BY id').all()).results
 const before=await records(),start=calls.length
 setHook(()=>failure(401));await h.cmd('payment.refund',refund,h.owner,409)
 assert.equal(calls.length,start+1);assert.equal((await connection()).status,'broken');assert.deepEqual(await records(),before,'a rejected preflight reserves and refunds nothing')
 await h.cmd('payment.refund',refund,h.owner,409);assert.equal(calls.length,start+1,'a broken credential stops later financial I/O')
 await reconnect()
 setHook(request=>request.method==='POST'?failure(403,{'www-authenticate':'Bearer error="insufficient_scope"'}):undefined)
 const scoped=await h.cmd('payment.refund',refund);assert.equal(scoped.status,'needs_review');assert.equal((await connection()).status,'broken')
 assert.equal((await records()).length,before.length+1,'the refused write retains its original reservation')
 await reconnect();const replaced=calls.length;assert.equal((await h.cmd('payment.refund',refund)).status,'needs_review');assert.equal(calls.length,replaced,'reconnection cannot replay the held refund')
 setHook(()=>failure(403));const resource=await records();await h.cmd('payment.bind',{id:linked.proposalId,chargeId,consent:true},h.owner,409)
 assert.equal((await connection()).status,'connected');assert.deepEqual(await records(),resource,'a resource permission error changes neither credentials nor refunds')
 setHook(undefined)
 const c=await connection();let replacedDuringRead=false
 setHook(async request=>{
  if(request.method!=='GET')return
  setHook(undefined);await reconnect();replacedDuringRead=true
  return Response.json({id:chargeId})
 })
 await h.cmd('payment.refund',{...refund,requestId:'synthetic-platter-stale-refund'},h.owner,409)
 assert.equal(replacedDuringRead,true);assert.equal((await connection()).version,c.version+1);assert.equal((await connection()).status,'connected');assert.deepEqual(await records(),resource)
 const fresh=await h.cmd('payment.refund',{...refund,requestId:'synthetic-platter-fresh-refund'});assert.equal(fresh.status,'succeeded')
 for(const value of [await h.state(),(await h.send('/api/platter/audit',undefined,h.owner)).value])assert.ok(!JSON.stringify(value).includes(privateValue))
}
