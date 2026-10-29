import assert from 'node:assert/strict'
import { verifyRecipient, decision, roles } from './recipients-http.mjs'

export async function watcherActivity(h,{messages,chats,teams,intents,faults,tick,route,member,person}) {
 const owner=(await h.state()).actor
 await h.cmd('provider.connect',{provider:'teams',version:0,token:'synthetic-platter-9901',consent:true})
 const teamsRoute=await h.cmd('notification.route',{provider:'teams',event:'approval',kind:'direct',destination:'synthetic-platter-9902',operatorId:owner.id,consent:true})
 const events=['view','comment','signed','paid','declined','payment_failed']
 const watch={version:0,revision:1,email:true,slackRoute:route.id,teamsRoute:teamsRoute.id,events,consent:true}
 const client=await h.cmd('client.save',{name:'Synthetic leadership',email:'synthetic-platter-9903'+String.fromCharCode(64)+'example.test'})
 const offer={clientId:client.id,title:'Synthetic leadership notifications',scope:'synthetic-platter-private-9904',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'}
 const p=await h.cmd('proposal.prepare',offer)
 await h.cmd('payment.collection',{id:p.id,version:1,completion:'required',paymentMethods:['card']})
 const plan=await h.cmd('recipient.save',{id:p.id,version:2,recipients:roles(h.auth.OWNER_EMAIL)})
 await h.cmd('proposal.approve',{id:p.id,version:plan.version,revision:plan.revision})
 const sent=await h.cmd('proposal.send',{id:p.id,version:plan.version+1})
 const paths=Object.fromEntries(sent.recipients.map(r=>[r.id,new URL(r.shareUrl).pathname]))
 await h.cmd('proposal.share',{id:p.id,operatorId:person.id,shared:true})
 await h.cmd('notification.watch',{...watch,id:p.id,revision:plan.revision})
 await h.cmd('notification.watch',{...watch,id:p.id,revision:plan.revision,slackRoute:null},member,403)
 await h.cmd('notification.watch',{...watch,id:p.id,revision:plan.revision,slackRoute:null,teamsRoute:null,events:events.filter(e=>e!=='view')},member)
 const mails=()=>messages.filter(m=>['Proposal opened','Proposal comment','Proposal signed','Proposal payment recorded','Proposal declined','Proposal payment failed'].includes(m.subject)&&m.text?.includes('/app/proposal?id='+p.id))
 const slack=()=>chats.filter(m=>m.text.includes('/app/proposal?id='+p.id))
 const chat=()=>teams.filter(m=>m.body.content.includes('/app/proposal?id='+p.id))
 const counts=()=>[mails().length,slack().length,chat().length]
 const sessions={}
 for(const id of ['ceo','cfo','owner'])sessions[id]=await verifyRecipient(h,paths[id])
 assert.equal((await h.send(paths.ceo,undefined,sessions.ceo)).status,200);await tick()
 assert.deepEqual(counts(),[1,1,1])
 assert.equal((await h.send(paths.ceo+'/action?name=question.create',{revision:plan.revision,section:'scope',text:'synthetic-platter-private-9905'},sessions.ceo)).status,200);await tick()
 assert.deepEqual(counts(),[3,2,2])
 assert.equal((await decision(h,paths.owner,sessions.owner)).status,409,'an out-of-order signature cannot notify completion')
 for(const id of ['ceo','cfo']){assert.equal((await decision(h,paths[id],sessions[id])).status,200);await tick();assert.deepEqual(counts(),[3,2,2],'partial signatures do not announce a completed proposal')}
 assert.equal((await decision(h,paths.owner,sessions.owner)).status,200);await tick()
 assert.deepEqual(counts(),[5,3,3],'the final countersignature announces completion once')
 const path=paths.ceo,cookie=sessions.ceo
 assert.equal((await h.send(path+'/payment.json',{method:'card',consent:true},cookie)).status,200)
 await tick();assert.deepEqual(counts(),[5,3,3],'an unattempted payment is not a failed payment')
 const saved=await h.db.prepare('SELECT * FROM p_collection_intents WHERE proposal_id=?').bind(p.id).first(),intent=intents.get(saved.provider_intent)
 faults.payment=true
 assert.equal((await h.send(path+'/payment-status.json',{},cookie)).status,409)
 faults.payment=false;await tick();assert.deepEqual(counts(),[5,3,3],'a provider outage is not a failed payment')
 intent.latest_charge={id:'synthetic-platter-9906',paid:false,status:'failed',amount:saved.cents+1,currency:'usd',failure_message:'synthetic-platter-private-9907'}
 assert.equal((await h.send(path+'/payment-status.json',{},cookie)).status,409)
 await tick();assert.deepEqual(counts(),[5,3,3],'a mismatched charge cannot create a failure notice')
 intent.latest_charge.amount=saved.cents
 assert.equal((await h.send(path+'/payment-status.json',{})).status,401)
 assert.equal((await h.send(path+'/payment-status.json',{},cookie)).status,200);await tick()
 assert.deepEqual(counts(),[7,4,4])
 assert.equal(chat().at(-1).body.content.split('\n')[0],'Proposal payment failed')
 await Promise.all([h.send(path+'/payment-status.json',{},cookie),h.send(path+'/payment-status.json',{},cookie)])
 await Promise.all([tick(),tick()]);assert.deepEqual(counts(),[7,4,4],'the same failed charge and concurrent workers never repeat a notice')
 intent.latest_charge.id='synthetic-platter-9908'
 assert.equal((await h.send(path+'/payment-status.json',{},cookie)).status,200);await tick()
 assert.deepEqual(counts(),[9,5,5],'a distinct failed charge has its own notice')
 assert.equal((await h.send(path+'/payment-consent.json',{consent:true,cents:saved.cents},cookie)).status,200)
 intent.status='succeeded';intent.latest_charge={id:'synthetic-platter-9909',paid:true,status:'succeeded',amount:saved.cents,currency:'usd'}
 assert.equal((await h.send(path+'/payment-status.json',{},cookie)).status,200);await tick()
 assert.deepEqual(counts(),[11,6,6],'a later successful payment remains a separate event')
 for(const text of [...mails().map(m=>m.text),...slack().map(m=>m.text),...chat().map(m=>m.body.content)]){
  assert.ok(!text.includes('/p/'));for(const privateValue of [offer.scope,'synthetic-platter-private-9905','synthetic-platter-private-9907',saved.provider_intent])assert.ok(!text.includes(privateValue))
 }
 assert.equal((await decision(h,paths.owner,sessions.owner)).status,200)
 await h.send(path+'/payment-status.json',{},cookie);await tick();assert.deepEqual(counts(),[11,6,6])

 const decline=await h.cmd('proposal.prepare',{...offer,title:'Declined leadership notifications'})
 const declinePlan=await h.cmd('recipient.save',{id:decline.id,version:1,recipients:roles(h.auth.OWNER_EMAIL)})
 await h.cmd('proposal.approve',{id:decline.id,version:declinePlan.version,revision:declinePlan.revision})
 const invitations=await h.cmd('proposal.send',{id:decline.id,version:declinePlan.version+1})
 const declinedPath=new URL(invitations.recipients.find(r=>r.id==='ceo').shareUrl).pathname
 await h.cmd('notification.watch',{...watch,id:decline.id,revision:declinePlan.revision,events:['declined']})
 await h.cmd('proposal.share',{id:decline.id,operatorId:person.id,shared:true})
 await h.cmd('notification.watch',{...watch,id:decline.id,revision:declinePlan.revision,slackRoute:null,teamsRoute:null,events:['declined']},member)
 const before=[messages.length,chats.length,teams.length]
 assert.equal((await h.send(declinedPath+'/action?name=decline',{revision:declinePlan.revision,reason:'synthetic-platter-private-9910'})).status,401)
 const verified=await verifyRecipient(h,declinedPath)
 assert.equal((await h.send(declinedPath+'/action?name=decline',{revision:1,reason:'Stale'},verified)).status,409)
 await tick();assert.deepEqual([chats.length,teams.length],before.slice(1),'refused declines create no chat event')
 assert.equal((await h.send(declinedPath+'/action?name=decline',{revision:declinePlan.revision,reason:'synthetic-platter-private-9910'},verified)).status,410);await tick()
 assert.equal((await h.db.prepare('SELECT kind FROM p_outcome_records WHERE proposal_id=? AND revision=?').bind(decline.id,declinePlan.revision).first()).kind,'declined','the verified decline is retained before its invitation is closed')
 const declinedMail=messages.filter(m=>m.subject==='Proposal declined')
 assert.deepEqual(declinedMail.map(m=>m.to[0]).sort(),[h.auth.OWNER_EMAIL,person.email].sort())
 assert.equal(chats.at(-1).text.split('\n')[0],'Proposal declined');assert.equal(teams.at(-1).body.content.split('\n')[0],'Proposal declined')
 for(const text of [...declinedMail.map(m=>m.text),chats.at(-1).text,teams.at(-1).body.content])assert.ok(!text.includes('synthetic-platter-private-9910'))
 const delivered=[messages.length,chats.length,teams.length]
 assert.equal((await h.send(declinedPath+'/action?name=decline',{revision:declinePlan.revision,reason:'Replay'},verified)).status,410)
 await Promise.all([tick(),tick()]);assert.deepEqual([messages.length,chats.length,teams.length],delivered)

 const held=await h.cmd('proposal.prepare',{...offer,title:'Personal Teams revocation'})
 await h.cmd('proposal.approve',{id:held.id,version:1,revision:1});const heldSend=await h.cmd('proposal.send',{id:held.id,version:2}),heldPath=new URL(heldSend.shareUrl).pathname
 await h.cmd('notification.watch',{...watch,id:held.id,email:false,slackRoute:null,events:['view']})
 faults.teams=true;await h.send(heldPath);await tick();faults.teams=false
 const uncertain=teams.length;await tick();assert.equal(teams.length,uncertain,'an uncertain Teams delivery is held without retry')
 assert.equal((await h.db.prepare("SELECT count(*) n FROM p_notification_outbox WHERE proposal_id=? AND status='uncertain'").bind(held.id).first()).n,1)
 await h.cmd('notification.watch',{...watch,id:held.id,version:1,email:false,slackRoute:null,events:['comment']})
 assert.equal((await h.send(heldPath+'/action?name=code.request',{})).status,200)
 const heldCode=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code' ORDER BY rowid DESC LIMIT 1").bind(held.id).first()).body.match(/\b\d{6}\b/)[0]
 const heldVerification=await h.send(heldPath+'/action?name=code.verify',{code:heldCode});assert.equal(heldVerification.status,200)
 const heldSession=heldVerification.cookie
 assert.equal((await h.send(heldPath+'/action?name=question.create',{revision:1,section:'scope',text:'Before disconnect'},heldSession)).status,200)
 await h.cmd('provider.disconnect',{provider:'teams',version:1})
 await tick();assert.equal(teams.length,uncertain,'disconnected Teams cannot send queued activity')
 await h.cmd('provider.connect',{provider:'teams',version:2,token:'synthetic-platter-9911',consent:true})
 await tick();assert.equal(teams.length,uncertain,'reconnection cannot restore an earlier route grant')
 await h.cmd('notification.watch',{...watch,id:held.id,version:2,email:false,slackRoute:null,events:['comment']},h.owner,403)
 const freshRoute=await h.cmd('notification.route',{provider:'teams',event:'approval',kind:'direct',destination:'synthetic-platter-9912',operatorId:person.id,consent:true})
 await h.cmd('proposal.share',{id:held.id,operatorId:person.id,shared:true})
 await h.cmd('notification.watch',{id:held.id,version:0,revision:1,email:false,teamsRoute:freshRoute.id,events:['comment'],consent:true},member)
 assert.equal((await h.send(heldPath+'/action?name=question.create',{revision:1,section:'scope',text:'After personal consent'},heldSession)).status,200)
 await h.cmd('proposal.share',{id:held.id,operatorId:person.id,shared:false})
 await tick();assert.equal(teams.length,uncertain,'lost proposal access suppresses another person’s real Teams event')
 await h.cmd('proposal.share',{id:held.id,operatorId:person.id,shared:true})
 await h.cmd('notification.unwatch',{id:held.id,version:1,revision:1},member)
 await tick();assert.equal(teams.length,uncertain,'revocation keeps earlier activity inactive')
 const memberPreferences=(await h.send('/api/platter/watch?id='+held.id,undefined,member)).value.watcher
 assert.equal(memberPreferences.teams_route,freshRoute.id);assert.equal(memberPreferences.authorized,0)

}
