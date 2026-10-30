import { recipientPlan } from '../recipients'
import { lockChoices } from '../section-locks'
import { searchTemplates } from '../pipeline'
import { reminderMessageChoice } from './reminder-messages'
import { resourceEditors } from '../folders'
import { folderSelect } from './folders'
import { escape, field, form, hidden, panel, proposalPath } from './shared'

function templateDelivery(state:any,t:any){
 if(!(t.shared?resourceEditors.includes(state.actor.role):t.owner_id===state.actor.id))return ''
 const d=t.deliveryDefaults??{},sources=t.deliverySources??{reminders:'override',expiry:'override',warning:'override'}
 const source=(key:string,label:string)=>'<label>'+label+'<select name="'+key+'Source"><option value="inherit"'+(sources[key]==='inherit'?' selected':'')+'>Follow workspace at creation</option><option value="override"'+(sources[key]==='override'?' selected':'')+'>Use this template’s override</option></select></label>'
 return '<details><summary>Reminder and expiry defaults for '+escape(t.name)+'</summary><p>Each new draft copies these choices. Later changes never alter existing proposals. Copies require fresh reminder authorization and a recipient time zone.</p>'+form('template.delivery','/app',hidden('id',t.id)+hidden('version',t.version)
 +source('reminders','Reminder source')+'<label>Template reminders<select name="remindersEnabled"><option value="yes"'+(d.remindersEnabled?' selected':'')+'>On</option><option value="no"'+(!d.remindersEnabled?' selected':'')+'>Off</option></select></label>'
 +field('Template days after sending','reminderDays',(d.reminderDays??[]).join(', '))+field('Template days before expiry','beforeExpiryDays',(d.beforeExpiryDays??[]).join(', '))+field('Template reminder cap','reminderCap',d.reminderCap??3,'type="number" required min="0" max="365"')
 +reminderMessageChoice(state,t.reminderTemplateId,'reminderTemplateId','Template reminder message')+source('expiry','Expiry source')+field('Template expiry days (empty for no expiry)','expiryDays',t.expiry.period_days??'','type="number" min="1" max="36500"')+(t.expiry.mode==='date'?'<p>The saved fixed expiry date '+escape(t.expiry.expires_on)+' will be replaced by the period above when saving these controls.</p>':'')
 +source('warning','Warning source')+field('Template warning days (empty for no warning)','warningDays',t.expiry.warning_days??'','type="number" min="1" max="36500"')
 +hidden('methodsProvided','yes')+'<fieldset><legend>Template payment methods</legend>'+[['card','Card'],['ach','ACH'],['apple_pay','Apple Pay'],['google_pay','Google Pay']].map(([id,label])=>'<label><input type="checkbox" name="method:'+id+'" value="yes"'+((d.paymentMethods??[]).includes(id)?' checked':'')+'>'+escape(label)+'</label>').join('')+'</fieldset><p>New drafts copy these payment choices with collection off. Configure collection separately on each proposal.</p><button>Save template delivery defaults</button>')+'</details>'
}

export function personalTemplates(state: any,query='',params=new URLSearchParams()): string {
 if (!['owner','admin','manager','sales','content_editor'].includes(state.actor?.role) || !state.templates?.length) return ''
 const clients = (state.clients ?? []).map((c: any) => `<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('')
 const matching=searchTemplates(state.templates,query,params)
 const group=(shared:boolean)=>{const rows=matching.filter((t:any)=>Boolean(t.shared)===shared);if(!rows.length)return '';return panel(shared?'Shared templates':'Personal templates','<p>Start an independent draft for a client. Later template changes do not change that draft.</p>'+rows.map((t:any)=>`<article><h3>${escape(t.name)}</h3><p>Version ${escape(t.version)} · ${shared?'shared template':'your personal template'}</p>`+(clients&&(!t.snapshot.template_recipients||state.actor.role==='owner')?form('template.start','/app',hidden('id',t.id)+hidden('version',t.version)+`<label>Client for ${escape(t.name)}<select name="clientId" required>${clients}</select></label>`+field('New proposal title (optional)','title','','maxlength="200"')+`<button>Start from ${escape(t.name)}</button>`):'<p>'+(clients?'The current owner starts drafts with these recipient definitions.':'Add a client to use this template.')+'</p>')+(resourceEditors.includes(state.actor.role)&&(t.shared||t.owner_id===state.actor.id)?form('template.locks','/app',hidden('id',t.id)+hidden('version',t.version)+'<fieldset><legend>Locked sections for '+escape(t.name)+'</legend>'+lockChoices(t.snapshot).map(({section,label})=>'<label><input type="checkbox" name="lock:'+section+'" value="yes"'+(t.lockedSections?.includes(section)?' checked':'')+'>'+escape(label)+'</label>').join('')+'</fieldset><button>Save template locks</button>'):'')+templateDelivery(state,t)+'</article>').join(''))}
 return (query?panel('Template search', '<p data-template-search-count="'+matching.length+'">'+matching.length+' template'+(matching.length===1?' matches':'s match')+' this phrase. Other pipeline filters apply to proposals.</p>'):'')+group(false)+group(true)
}

export function savePersonalTemplate(state: any, p: any): string {
 if (!['owner','admin','manager','sales','content_editor'].includes(state.actor?.role) || p.currency !== 'USD' || p.template_recipients&&state.actor.role!=='owner') return ''
 const roles=recipientPlan(p),preassignment=state.actor.role==='owner'&&roles.length?'<label>Explicit owner preassignment<select name="preassignedOwner" aria-label="Explicit owner preassignment"><option value="">No preassigned recipient</option>'+roles.filter(r=>r.role==='countersigner').map(r=>'<option value="'+escape(r.id)+'"'+(p.template_recipients?.roles?.some((saved:any)=>saved.id===r.id&&saved.preassignedOwnerId)?' selected':'')+'>'+escape(r.name)+'</option>').join('')+'</select></label>':''
 const source = hidden('id', p.id) + hidden('version', p.version)+preassignment
 const replace = (state.templates ?? []).filter((t:any)=>!t.shared||resourceEditors.includes(state.actor.role)).map((t: any) => form('template.save', proposalPath(p.id), source
  + hidden('templateId', t.id) + hidden('templateVersion', t.version) + hidden('name', t.name)
  + (t.shared?folderSelect(state,'template',t.folder_id)+'<label><input type="checkbox" name="shareConsent" value="yes">I authorize sharing with the selected folder audience if it widens access.</label>':'')
  + `<button class="secondary">Replace ${escape(t.name)} with this revision</button>`)).join('')
 return panel('Save a personal template', '<p>Keep this displayed revision’s content, packages, attachments, PDF-download choice and expiry settings for future drafts. Approvals, client details and signing links are not copied.</p>'
  + form('template.save', proposalPath(p.id), source + field('Template name', 'name', p.title, 'required maxlength="200"') + '<button>Save personal template</button>')
  + (resourceEditors.includes(state.actor.role)?form('template.save',proposalPath(p.id),source+hidden('shared','yes')+field('Shared template name','name',p.title,'required maxlength="200"')+folderSelect(state,'template')+'<label><input type="checkbox" name="shareConsent" value="yes" required>I authorize sharing this content with the selected audience.</label><button>Save shared template</button>'):'')
  + (replace ? `<details><summary>Replace an existing personal template</summary>${replace}</details>` : ''))
}

export function starterTemplatesPanel(state: any): string {
 if (!['owner','admin','manager','sales','content_editor'].includes(state.actor?.role)) return ''
 const clients = (state.clients ?? []).map((c: any) => `<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('')
 const choices = (state.starterTemplates ?? []).map((t: any) => `<option value="${escape(t.id)}">${escape(t.name)}</option>`).join('')
 return panel('Starter templates', '<p>Five starting points with example USD pricing. Client and sender details are filled when you start an independent draft. Review scope, prices and terms before approval.</p>'
  + (clients ? form('template.start', '/app', hidden('version', 1)
   + `<label for="starter-template">Starter template</label><select id="starter-template" name="id" required>${choices}</select>`
   + `<label for="starter-client">Client for starter proposal</label><select id="starter-client" name="starterClientId" required>${clients}</select>`
   + '<button>Start starter proposal</button>') : '<p>Add a client to start from Agency, Consultancy, IT managed services, Creative studio or Professional services.</p>'))
}

export function templateRecipientSettings(state:any):string {
 if(state.actor?.role!=='owner')return ''
 const templates=(state.templates??[]).filter((t:any)=>t.snapshot.template_recipients)
 if(!templates.length)return ''
 return panel('Template recipient definitions','<p>Roles, assigned fields and signing groups are copied into independent drafts. Only an explicitly preassigned owner is filled. Every new draft needs fresh approval and invitations.</p>'+templates.map((t:any)=>{
  const d=t.snapshot.template_recipients,choices=(selected:string)=>d.roles.map((r:any)=>'<option value="'+escape(r.id)+'"'+(r.id===selected?' selected':'')+'>'+escape(r.name)+'</option>').join('')
  return '<details><summary>'+escape(t.name)+' recipient definitions</summary>'+form('template.recipients','/app/settings',hidden('id',t.id)+hidden('version',t.version)+d.roles.map((r:any)=>'<fieldset><legend>'+escape(r.name)+'</legend>'+field('Role name','roleName:'+r.id,r.name,'required maxlength="200"')+'<label>Role kind<select name="roleKind:'+escape(r.id)+'">'+[['signer','Signer'],['approver','Client approver'],['viewer','Viewer'],['cc','CC'],['countersigner','Owner countersigner']].map(([value,label])=>'<option value="'+value+'"'+(value===r.role?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'+field('Signing group','roleGroup:'+r.id,r.group,'type="number" required min="1" max="10000"')+'<p>Identity check: separate mailbox verification</p></fieldset>').join('')+'<label>Explicit owner preassignment<select name="preassignedOwner" aria-label="Explicit owner preassignment"><option value="">No preassigned recipient</option>'+d.roles.filter((r:any)=>r.role==='countersigner').map((r:any)=>'<option value="'+escape(r.id)+'"'+(r.preassignedOwnerId?' selected':'')+'>'+escape(r.name)+'</option>').join('')+'</select></label>'+Object.entries(d.assignments).map(([id,role])=>'<label>'+escape(t.snapshot.document.blocks.find((b:any)=>b.id===id)?.title??id)+' assigned role<select name="assignment:'+escape(id)+'">'+choices(String(role))+'</select></label>').join('')+'<button>Save '+escape(t.name)+' recipient definitions</button>')+'</details>'
 }).join(''))
}
