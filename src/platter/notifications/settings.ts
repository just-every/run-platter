import { need } from '../model'

export async function workspaceNotices(db:D1Database){
 const d=await db.prepare('SELECT * FROM p_sender_notice_defaults WHERE singleton=1').first<any>()
 return {expiry:{enabled:d.enabled,leadDays:d.lead_days},renewal:{enabled:d.renewal_enabled,leadDays:d.renewal_days}}
}
export async function proposalNotices(db:D1Database,id:string){
 const defaults=await workspaceNotices(db)
 for(const kind of ['expiry','renewal'] as const){
  const row=await db.prepare('SELECT enabled,lead_days FROM '+(kind==='expiry'?'p_sender_notice_settings':'p_renewal_notice_settings')+' WHERE proposal_id=?').bind(id).first<any>()
  if(row)defaults[kind]={enabled:row.enabled,leadDays:row.lead_days}
 }
 return defaults
}
export function noticeSnapshots(db:D1Database,id:string,settings:Awaited<ReturnType<typeof workspaceNotices>>){
 return (['expiry','renewal'] as const).map(kind=>db.prepare('INSERT INTO '+(kind==='expiry'?'p_sender_notice_settings':'p_renewal_notice_settings')+'(proposal_id,enabled,lead_days,version) VALUES(?,?,?,1)').bind(id,settings[kind].enabled,settings[kind].leadDays))
}
export const copyNotices=(db:D1Database,from:string,to:string)=>(['p_sender_notice_settings','p_renewal_notice_settings']).map(table=>db.prepare('INSERT INTO '+table+'(proposal_id,enabled,lead_days,version) SELECT ?,enabled,lead_days,1 FROM '+table+' WHERE proposal_id=?').bind(to,from))
export async function templateNotices(db:D1Database,id?:string){
 const saved=id?await db.prepare('SELECT * FROM p_template_notice_defaults WHERE template_id=?').bind(id).first<any>():null
 return {source:saved?.source??'inherit',settings:saved?.source==='override'?JSON.parse(saved.settings):await workspaceNotices(db)}
}
export async function saveTemplateNotices(db:D1Database,proposalId:string,templateId:string){
 return db.prepare("INSERT INTO p_template_notice_defaults(template_id,source,settings) VALUES(?,'override',?) ON CONFLICT(template_id) DO UPDATE SET source='override',settings=excluded.settings").bind(templateId,JSON.stringify(await proposalNotices(db,proposalId)))
}
export async function editTemplateNotices(db:D1Database,id:string,input:Record<string,unknown>){
 const old=await templateNotices(db,id),source=input.noticeSource??old.source
 need(source==='inherit'||source==='override','Choose workspace notice inheritance or a template override')
 const settings=structuredClone(old.settings)
 for(const kind of ['expiry','renewal'] as const){
  if(input[kind+'NoticeEnabled']!==undefined){const value=input[kind+'NoticeEnabled'];need([true,false,'yes','no'].includes(value as any),'Choose whether sender notices are on');settings[kind].enabled=value===true||value==='yes'?1:0}
  if(input[kind+'NoticeDays']!==undefined){const value=Number(input[kind+'NoticeDays']);need(input[kind+'NoticeDays']!==''&&Number.isInteger(value)&&value>=1&&value<=365,'Choose sender notice lead days from 1 to 365');settings[kind].leadDays=value}
 }
 return db.prepare('INSERT INTO p_template_notice_defaults(template_id,source,settings) VALUES(?,?,?) ON CONFLICT(template_id) DO UPDATE SET source=excluded.source,settings=excluded.settings').bind(id,source,JSON.stringify(settings))
}
