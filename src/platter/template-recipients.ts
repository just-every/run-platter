import { documentOf, type ProposalDocument } from './documents/blocks'
import { need, text, type Actor } from './model'
import { recipientInput, recipientPlan, requiredRecipient, type Recipient } from './recipients'

export type TemplateRole = Omit<Recipient,'email'> & { identity:'mailbox'; preassignedOwnerId:string|null }
export type TemplateRecipients = { version:1; roles:TemplateRole[]; assignments:Record<string,string> }
export function templateRecipients(row:any):TemplateRecipients|null {
 return typeof row.template_recipients==='string'?JSON.parse(row.template_recipients):row.template_recipients??null
}

/** Capture definitions, never ordinary recipient mailboxes or invitation capabilities. */
export function captureTemplateRecipients(content:any,a:Actor,preassignedOwner:unknown=undefined):TemplateRecipients|null {
 const plan=recipientPlan(content),previous=templateRecipients(content)
 if(!plan.length){
  need(!previous,'Keep the captured template roles or explicitly replace their definitions',409)
  need(!documentOf(content).blocks.some(b=>['field','signature'].includes(b.type)&&b.recipientRole==='slot'),'Assign every template field to a defined role before publication')
  need(!preassignedOwner,'Add template role slots before preassigning an owner')
  return null
 }
 need(a.role==='owner','Only the current owner manages template recipient definitions',403)
 const clean=recipientInput(plan,a)
 need(new Set(clean.map(r=>r.name.toLowerCase())).size===clean.length,'Template role names must be distinct')
 const assigned=preassignedOwner===undefined?previous?.roles.find(r=>r.preassignedOwnerId)?.id??'':String(preassignedOwner)
 need(!assigned||clean.some(r=>r.id===assigned&&r.role==='countersigner'),'Preassign only an owner countersigner')
 const roles:TemplateRole[]=clean.map(({email,...r})=>({...r,identity:'mailbox',preassignedOwnerId:r.id===assigned?a.id:null}))
 const assignments:Record<string,string>={}
 for(const b of documentOf(content).blocks.filter(b=>b.type==='signature'||b.type==='field')){
  const id=b.recipientRole==='slot'?b.recipientId:clean.find(r=>r.role==='signer')?.id
  const role=roles.find(r=>r.id===id)
  need(role&&requiredRecipient({...role,email:null}),'Assign '+b.title+' to a required template role before publication')
  if(b.type==='signature')need(['signer','countersigner'].includes(role.role),'Assign signature '+b.title+' to a signer before publication')
  assignments[b.id]=role.id
 }
 return {version:1,roles,assignments}
}
export function bindTemplateAssignments(document:ProposalDocument,definition:TemplateRecipients):ProposalDocument {
 return {...document,blocks:document.blocks.map(b=>definition.assignments[b.id]?{...b,recipientRole:'slot',recipientId:definition.assignments[b.id]}:b)}
}
export async function startTemplateRecipients(db:D1Database,a:Actor,definition:TemplateRecipients,current?:Recipient[]):Promise<Recipient[]> {
 need(a.role==='owner','Only the current owner starts drafts with template recipient definitions',403)
 const owner=await db.prepare("SELECT id,email FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(a.id).first<any>()
 need(owner,'Current owner authority is required',403)
 const slots=current??definition.roles.map(r=>({id:r.id,name:r.name,role:r.role,group:r.group,email:null}))
 return slots.map(r=>{
  const assigned=definition.roles.find(saved=>saved.id===r.id&&saved.role===r.role)?.preassignedOwnerId
  need(!assigned||assigned===owner.id,'The preassigned owner changed. Review the template definitions.',409)
  return {id:r.id,name:r.name,role:r.role,group:r.group,email:assigned?owner.email.toLowerCase():null}
 })
}

/** Settings edits are versioned with the same template as content and delivery. */
export function editedTemplateRecipients(content:any,a:Actor,input:Record<string,unknown>) {
 const previous=templateRecipients(content)
 need(previous,'Save a proposal with recipient slots before editing template definitions',409)
 let roles:any=input.roles
 if(typeof roles==='string'){try{roles=JSON.parse(roles)}catch{need(false,'Enter valid template roles')}}
 if(roles===undefined)roles=previous.roles.map(r=>({...r,name:input['roleName:'+r.id]??r.name,role:input['roleKind:'+r.id]??r.role,group:input['roleGroup:'+r.id]??r.group}))
 need(Array.isArray(roles),'Enter template roles')
 // Emails supplied to this door are refused rather than silently creating a fixed contact.
 need(roles.every(r=>r&&(!r.email)&&(!r.identity||r.identity==='mailbox')),'Template roles support mailbox verification and explicit owner preassignment only')
 const plan=roles.map((r:any)=>({id:r.id,name:r.name,role:r.role,group:r.group,email:null}))
 let assignments:any=input.assignments
 if(typeof assignments==='string'){try{assignments=JSON.parse(assignments)}catch{need(false,'Enter valid field assignments')}}
 if(assignments===undefined)assignments=Object.fromEntries(Object.entries(previous.assignments).map(([id,role])=>[id,input['assignment:'+id]??role]))
 need(assignments&&typeof assignments==='object'&&!Array.isArray(assignments),'Enter field assignments')
 const document=documentOf(content)
 need(Object.keys(assignments).every(id=>document.blocks.some(b=>b.id===id&&['field','signature'].includes(b.type))),'Choose an existing template field')
 const nextDocument={...document,blocks:document.blocks.map(b=>['field','signature'].includes(b.type)?{...b,recipientRole:'slot' as const,recipientId:text(assignments[b.id],'a template field role',100)}:b)}
 const next={...content,document:nextDocument,recipient_plan:plan}
 const definition=captureTemplateRecipients(next,a,input.preassignedOwner)
 need(definition,'Keep at least one template signer')
 return {...next,document:bindTemplateAssignments(nextDocument,definition),template_recipients:definition,recipient_plan:definition.roles.map(({identity,preassignedOwnerId,...r})=>({...r,email:null}))}
}
