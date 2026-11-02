import assert from 'node:assert/strict'
// Product assertions supplement the shared mandatory policy, replay and audit
// journey. All observations use the native production doors.
export async function afterStep({step,result,request,origin,cookie,args}) {
 if(step.id==='prepare'||step.id==='revise'||step.id==='template') {
  const response=await request(origin+'/api/platter/state',{headers:{cookie}})
  assert.equal(response.status,200)
  const state=await response.json(),p=state.proposals.find(p=>p.id===result.id)
  assert.ok(p)
  assert.equal(p.status,'draft')
  assert.match(p.preparedByName,/ for /)
  assert.equal(p.options[0].cents,step.id==='template'?300000:100000)
  assert.equal(p.approved_by,null)
  assert.ok(!state.outbox.some(m=>m.proposal_id===p.id))
 }
 if(step.id==='request') {
  assert.equal(result.request.revision,args.revision)
  assert.equal(result.request.status,'pending')
  const queue=await request(origin+'/api/platter/send-requests',{headers:{cookie}})
  assert.equal(queue.status,200)
  assert.ok((await queue.json()).requests.some(r=>r.id===result.request.id&&r.actionable===1))
 }
}
export default async function({request,origin,cookie,tool}) {
 const pause=await request(origin+'/agents/api/pause',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify({paused:true})})
 assert.equal(pause.status,200)
 const refused=await tool('platter.workspace.snapshot',{})
 assert.equal(refused.result?._meta?.['com.runeditrun/error']?.code,'agents_paused')
 const resume=await request(origin+'/agents/api/pause',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify({paused:false})})
 assert.equal(resume.status,200)
}
