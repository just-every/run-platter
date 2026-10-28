import { action, escape, hidden, panel } from './shared'
const languages=[['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],['pt','Português'],['auto','Browser language']]
export function clientLanguageSettings(state:any) {
 if(state.actor.role!=='owner')return ''
 const rows=state.proposals.filter((p:any)=>['draft','approved'].includes(p.status))
 const selector=(selected:string)=>'<label>Client language<select name="locale" aria-label="Client language">'+languages.map(([value,label])=>'<option value="'+value+'"'+(selected===value?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'
 const save=(p:any,slot?:any)=>'<form method="post" action="'+action('proposal.locale','/app/settings')+'">'+hidden('id',p.id)+hidden('version',p.version)+(slot?hidden('recipientId',slot.id):'')+selector(slot?.locale??p.client_locale??'en')+'<button>Save client language</button></form>'
 return panel('Client language','<p>Choose a language before sending. Your written content and personal email text are preserved exactly. Browser language uses the first supported browser preference at the invitation’s first visit; the initial invitation email uses English.</p>'+rows.map((p:any)=>'<details><summary>'+escape(p.title)+'</summary>'+save(p)+(p.recipientLocales??[]).map((r:any)=>'<details><summary>'+escape(r.name)+'</summary>'+save(p,r)+'</details>').join('')+'</details>').join(''))
}
