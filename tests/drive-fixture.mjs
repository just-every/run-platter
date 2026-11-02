import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export const driveAccount='synthetic-platter-archive-account'
export const driveRoot='synthetic-platter-archive-root'
export const driveToken='synthetic-platter-archive-token'
export const driveSettings={version:0,accountId:driveAccount,connectionVersion:1,folderId:driveRoot,pattern:'{client} - {title} - {date} - r{revision}',consent:true}
export function driveFixture(){
 const files=new Map([[driveRoot,{id:driveRoot,name:'Completed agreements',mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:true}}]]),calls=[]
 let sequence=0,uncertain=false,hook
 const outboundService=async request=>{
  const url=new URL(request.url);calls.push({url:url.href,method:request.method})
  assert.equal(url.hostname,'www.googleapis.com');assert.equal(request.headers.get('authorization'),'Bearer '+driveToken)
  if(hook)await hook(request)
  if(url.pathname.endsWith('/about'))return Response.json({user:{permissionId:driveAccount,emailAddress:['synthetic-platter-drive','example.test'].join('@')}})
  if(url.pathname.endsWith('/generateIds'))return Response.json({ids:['synthetic-platter-archive-'+(++sequence)]})
  if(request.method==='POST'){
   let metadata,bytes
   if(url.pathname.startsWith('/upload/')){
    const body=Buffer.from(await request.arrayBuffer()),boundary=request.headers.get('content-type').split('boundary=')[1],first=body.indexOf('\r\n\r\n'),second=body.indexOf('\r\n--'+boundary,first+4)
    metadata=JSON.parse(body.subarray(first+4,second).toString())
    const start=body.indexOf('\r\n\r\n',second+4)+4,end=body.lastIndexOf('\r\n--'+boundary+'--')
    bytes=body.subarray(start,end)
    assert.equal(createHash('sha256').update(bytes).digest('hex'),metadata.appProperties.platterSha256)
   }else metadata=await request.json()
   assert.ok(!files.has(metadata.id),'a provider id must never be uploaded twice')
   files.set(metadata.id,{...metadata,capabilities:{canAddChildren:true},bytes})
   // A lost acknowledgement can happen after Drive has durably stored the file.
   if(uncertain&&metadata.name.endsWith(' - certificate.pdf'))return new Response('synthetic-platter-lost-acknowledgement',{status:503})
   return Response.json({id:metadata.id})
  }
  const file=files.get(url.pathname.split('/').at(-1));if(!file)return new Response(null,{status:404})
  if(url.searchParams.get('alt')==='media')return new Response(file.bytes,{headers:{'content-type':'application/pdf'}})
  const {bytes,...metadata}=file;return Response.json(metadata)
 }
 return {files,calls,outboundService,setUncertain:value=>{uncertain=value},setHook:value=>{hook=value}}
}
export async function connectDrive(h,cookie=h.owner){
 await h.cmd('provider.connect',{provider:'google_drive',version:0,token:driveToken,consent:true},cookie)
 await h.cmd('archive.configure',driveSettings,cookie)
}
export async function completeDriveAgreement(h,title='Synthetic archive agreement',clientId){
 const client=clientId?{id:clientId}:await h.cmd('client.save',{name:'Synthetic archive client',email:['synthetic-platter-client','example.test'].join('@')})
 const proposal=await h.cmd('proposal.prepare',{clientId:client.id,title,scope:'Reviewed archive agreement',optionOne:'Studio',priceOne:'100',optionTwo:'Campaign',priceTwo:'200',depositPercent:'25'})
 await h.cmd('proposal.approve',{id:proposal.id,version:1,revision:1})
 const shared=await h.cmd('proposal.send',{id:proposal.id,version:2}),path=new URL(shared.shareUrl).pathname
 assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
 const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code' ORDER BY created_at DESC").bind(proposal.id).first()).body.match(/\b\d{6}\b/)[0]
 const verified=await h.send(path+'/action?name=code.verify',{code});assert.equal(verified.status,200)
 const input={name:'Synthetic signer',optionId:'one',consent:true}
 assert.equal((await h.send(path+'/action?name=accept',input,verified.cookie)).status,200)
 return {proposal,client,path,cookie:verified.cookie,input}
}
