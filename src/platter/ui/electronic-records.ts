import { electronicDisclosure } from '../electronic-records'
import { ui } from '../locales'
import { escape, hidden, panel } from './shared'
export function electronicRecordsPanel(view:any,publicForm:(name:string,body:string)=>string){
 if(!view.verified||view.status==='accepted'||view.expiry?.expired||view.recipientProgress&&(!['signer','approver','countersigner'].includes(view.recipientProgress.recipient.role)||view.recipientProgress.signed))return ''
 const controls=view.electronic?.blocked
  ?ui('<p>Your electronic signing step is paused. The firm can see your request. Request paper or give fresh electronic consent to continue.</p>')+publicForm('records.request',hidden('kind','resume')+ui('<button>Consent electronically again</button>'))
  :publicForm('records.request',hidden('kind','withdraw')+ui('<button class="secondary">Withdraw electronic consent</button>'))
 return panel(ui('Electronic records and signatures'),electronicDisclosure(view.clientLocale??'en').map(text=>'<p>'+escape(text)+'</p>').join('')+controls+publicForm('records.request',hidden('kind','paper')+ui('<button class="secondary">Request paper copy</button>')))
}
export function electronicRequestNotices(state:any){
 if(state.actor.role!=='owner'||!state.electronicRequests?.length)return ''
 return panel('Electronic records requests','<p>Recipients asked for manual follow-up. Existing signatures and proposal content remain unchanged.</p><ul>'+state.electronicRequests.map((r:any)=>'<li><a href="/app/proposal?id='+encodeURIComponent(r.proposal_id)+'">'+escape(r.title)+'</a> · '+escape(r.recipient)+' · '+escape(r.kind==='paper'?'Paper copy requested':r.kind==='withdraw'?'Electronic consent withdrawn':'Fresh consent recorded')+'</li>').join('')+'</ul>')
}
