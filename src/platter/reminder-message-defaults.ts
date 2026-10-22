/** Message content is copied, but recipient variable input and execution authority are not. */
export function reminderMessageSnapshot(template:any){
 if(!template)return null
 const {firstName:_recipient,...snapshot}=template
 return snapshot
}
export async function reminderMessageDefaults(db:D1Database,id?:string|null){
 const row=id?await db.prepare('SELECT * FROM p_reminder_templates WHERE id=?').bind(id).first<any>():await db.prepare('SELECT * FROM p_reminder_templates WHERE is_default=1').first<any>()
 return row?{reminderTemplateId:row.id,reminderMessageTemplate:{id:row.id,name:row.name,version:row.version,locked:Boolean(row.locked),subject:row.subject,message:row.message,sourceSubject:row.subject,sourceMessage:row.message}}:{}
}
export function agentDeliveryDefaults(settings:any){const {reminderMessageTemplate:_template,reminderSubject:_subject,reminderMessage:_message,...metadata}=settings;return metadata}
