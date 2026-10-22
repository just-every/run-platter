import { area, escape, field, form, hidden, panel } from './shared'

export function reminderMessageChoice(state:any,selected:unknown,name='messageTemplateId',label='Reminder message template'){
 if(selected===undefined&&name==='messageTemplateId')selected=state.reminderTemplates?.find((t:any)=>t.is_default)?.id
 return '<label>'+escape(label)+'<select name="'+name+'"><option value="">'+(name==='messageTemplateId'?'Custom message':'Workspace reminder message default')+'</option>'+(state.reminderTemplates??[]).map((t:any)=>'<option value="'+escape(t.id)+'"'+(selected===t.id?' selected':'')+'>'+escape(t.name)+(t.locked?' · locked':'')+(t.is_default?' · workspace default':'')+'</option>').join('')+'</select></label>'
}
export function reminderMessageAdmin(state:any){
 if(!['owner','admin'].includes(state.actor?.role))return ''
 const edit=(t?:any)=>form('reminder-template.save','/app/settings',(t?hidden('id',t.id)+hidden('version',t.version):'')+field('Shared reminder name','name',t?.name??'','required maxlength="100"')+field('Shared reminder subject','subject',t?.subject??'','required maxlength="200"')+area('Shared reminder message','message',t?.message??'','required maxlength="10000"')+'<label><input type="checkbox" name="locked" value="yes"'+(t?.locked?' checked':'')+'>Lock this reminder message for members</label><label><input type="checkbox" name="isDefault" value="yes"'+(t?.is_default?' checked':'')+'>Use as the workspace reminder message default</label><button>'+(t?'Save '+escape(t.name):'Create shared reminder message')+'</button>')
 return panel('Shared reminder messages','<p>Only owners and admins manage these workspace messages. Supported variables: {client.first_name}, {client.company}, {proposal.title}, {sender.name}, {proposal.expires_on}. A sender supplies a first name explicitly when needed; missing values block sending. Selecting a message copies its text. A lock prevents members from changing that selected text; they can choose another message.</p>'+edit()+(state.reminderTemplates??[]).map((t:any)=>'<details><summary>Edit '+escape(t.name)+'</summary>'+edit(t)+'</details>').join(''))
}
