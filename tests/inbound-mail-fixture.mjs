import { createHmac } from 'node:crypto'
// Construct the wire format at runtime from an unmistakably synthetic fixture.
export function inboundMailFixture(){
 const bytes=Buffer.from('synthetic-platter-5700'),messages=new Map()
 let serial=0
 return {
  settings:{MAIL_WEBHOOK_KEY:['whsec',bytes.toString('base64')].join('_'),QUESTION_REPLY_DOMAIN:'replies.example.com'},
  messages,
  async deliver(h,to,from,text,options={}){
   const id='synthetic-platter-'+(5701+serial++),message={id,to:[to],from,subject:'Re: proposal',text,html:null,headers:{},authentication:{spf:'pass',dkim:'pass',dmarc:'pass'},attachments:[],...options.message}
   messages.set(id,message)
   const body=JSON.stringify({type:'email.received',data:{email_id:id}}),event='synthetic-platter-'+(5800+serial),timestamp=String(Math.floor(Date.now()/1000))
   const signature=createHmac('sha256',bytes).update(event+'.'+timestamp+'.'+body).digest('base64')
   const headers={'content-type':'application/json','svix-id':event,'svix-timestamp':timestamp,'svix-signature':'v1,'+(options.badSignature?'invalid':signature)}
   const submit=async()=>{const r=await h.mf.dispatchFetch(h.origin+'/api/platter/client-mail-replies',{method:'POST',headers,body});return {status:r.status,text:await r.text()}}
   return {...await submit(),submit}
  },
 }
}
