import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
import {join} from 'node:path'

export async function smsReenableBrowser(h,sender,panel,record,width){
 const callback=async fields=>{
  const url=h.origin+'/api/platter/sms/inbound',form=new URLSearchParams({AccountSid:'synthetic-platter-9401',From:'+12025550129',To:'+15005550006',...fields})
  const signature=createHmac('sha1','synthetic-platter-9402').update(url+[...form.keys()].sort().map(k=>k+form.get(k)).join('')).digest('base64')
  const r=await h.mf.dispatchFetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','x-twilio-signature':signature},body:form.toString()});assert.equal(r.status,200);await r.text()
 }
 const reload=async()=>{await sender.reload();await panel.getByText('Inspect SMS consent and texts',{exact:true}).click()}
 await callback({Body:'STOP'});await reload()
 assert.match(await panel.innerText(),/suppressed for every SMS purpose/)
 assert.equal(await panel.getByText('Record new assent to re-enable',{exact:true}).count(),0)
 await callback({Body:'START'});await reload()
 assert.equal(await panel.getByText('Record new assent to re-enable',{exact:true}).count(),0,'ordinary START cannot expose an activation control')
 await callback({Body:'START',OptOutType:'START',MessageSid:'synthetic-platter-9406'})
 await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2030-06-01T12:01:00Z'),cron:'*/15 * * * *'})
 await reload()
 await panel.getByText('Record new assent to re-enable',{exact:true}).click()
 assert.equal(await panel.getByRole('button',{name:'Record new assent and re-enable SMS',exact:true}).isVisible(),true)
 if(process.env.PLATTER_SCREENSHOTS)await panel.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'SEND-008-reenable-form-'+width+'.png')})
 // record opens its disclosure itself.
 await panel.getByText('Record new assent to re-enable',{exact:true}).click()
 await record(true)
 assert.match(await panel.innerText(),/SMS is authorized/)
 assert.match(await panel.innerText(),/number explicitly re-enabled/)
 if(process.env.PLATTER_SCREENSHOTS)await panel.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'SEND-008-reenabled-'+width+'.png')})
}
