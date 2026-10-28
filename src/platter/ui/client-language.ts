import { action, escape, hidden, panel } from './shared'
export function clientLanguageSettings(state:any) {
 if(state.actor.role!=='owner')return ''
 const rows=state.proposals.filter((p:any)=>['draft','approved'].includes(p.status))
 return panel('Client language','<p>Choose the language before sending. Spanish currently supports a single client with mailbox verification and collection off. Your written content and personal email text are preserved exactly.</p>'+rows.map((p:any)=>'<details><summary>'+escape(p.title)+'</summary><form method="post" action="'+action('proposal.locale','/app/settings')+'">'+hidden('id',p.id)+hidden('version',p.version)+'<label>Client language<select name="locale" aria-label="Client language"><option value="en"'+(p.client_locale!=='es'?' selected':'')+'>English</option><option value="es"'+(p.client_locale==='es'?' selected':'')+'>Español</option></select></label><button>Save client language</button></form></details>').join(''))
}
