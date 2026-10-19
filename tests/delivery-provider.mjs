import { createHmac, randomBytes } from 'node:crypto'
export function resendEvents() {
 const bytes=randomBytes(32)
 return {key:'whsec_'+bytes.toString('base64'),async emit(h,message,type,{to='avery@northstar.example',at=Date.now()-1000,id='event-'+randomBytes(8).toString('hex')}={}){
  const body=JSON.stringify({type,created_at:new Date(at).toISOString(),data:{email_id:message,to:[to]}}),timestamp=String(Math.floor(Date.now()/1000))
  const signature=createHmac('sha256',bytes).update(id+'.'+timestamp+'.'+body).digest('base64')
  const response=await h.mf.dispatchFetch(h.origin+'/api/platter/mail/events',{method:'POST',headers:{'content-type':'application/json','svix-id':id,'svix-timestamp':timestamp,'svix-signature':'v1,'+signature},body})
  const text=await response.text()
  return {status:response.status,text}
 }}
}
