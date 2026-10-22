import { commit, need, proposal, text, type Actor } from './model'
export const roles = ['admin','manager','sales','content_editor','viewer','billing'] as const
export const editors = ['owner','admin','manager','sales','content_editor','agent']
export const senders = ['owner','admin','manager','sales']
export const administrators = ['owner','admin']
export const reporters = ['owner','admin','manager','sales','viewer']
export type Right = 'view'|'edit'|'send'|'share'|'approve'|'report'
export function scope(a:Actor,right:Right,alias='p'):{sql:string;values:any[]} {
 const all=administrators.includes(a.role)||(right==='view'&&a.role==='billing')||a.role==='agent'
 if(all)return {sql:'1',values:[]}
 const eligible=right==='view'?['manager','sales','content_editor','viewer','billing']:right==='edit'?editors:right==='approve'?['manager','billing']:right==='report'?reporters:senders
 if(!eligible.includes(a.role))return {sql:'0',values:[]}
 if(a.role==='billing')return {sql:'1',values:[]} // Named-step eligibility is checked by the approval engine.
 const own=`${alias}.sales_owner_id=?`,values:any[]=[a.id]
 if(a.role==='manager'||a.role==='viewer'){
  const collaborator=right==='view'||(right==='edit'&&a.role==='manager')
  return {sql:`(${own} OR EXISTS(SELECT 1 FROM p_team_members mine JOIN p_team_members theirs ON mine.team_id=theirs.team_id WHERE mine.operator_id=? AND theirs.operator_id=${alias}.sales_owner_id)${collaborator?' OR EXISTS(SELECT 1 FROM p_collaborators c WHERE c.proposal_id='+alias+'.id AND c.operator_id=?)':''})`,values:[...values,a.id,...(collaborator?[a.id]:[])]}
 }
 return {sql:`(${own} OR EXISTS(SELECT 1 FROM p_collaborators c WHERE c.proposal_id=${alias}.id AND c.operator_id=?))`,values:[...values,a.id]}
}
export async function permitted(db:D1Database,a:Actor,id:unknown,right:Right='view') {
 const s=scope(a,right);need(s.sql!=='0','Your role cannot perform this action',403);const row=await proposal(db,id)
 need(await db.prepare(`SELECT id FROM p_proposals p WHERE id=? AND (${s.sql})`).bind(row.id,...s.values).first(),'This proposal is outside your permissions',403)
 // Keep the scope live inside the eventual write transaction as well.
 a.permission={sql:`EXISTS(SELECT 1 FROM p_proposals p WHERE id=? AND (${s.sql}))`,values:[row.id,...s.values]}
 return row
}
export async function teamState(db:D1Database,a:Actor) {
 if(!administrators.includes(a.role)&&a.role!=='manager')return {teams:(await db.prepare('SELECT t.* FROM p_teams t JOIN p_team_members m ON m.team_id=t.id WHERE m.operator_id=? ORDER BY t.name').bind(a.id).all<any>()).results}
 const people=(await db.prepare("SELECT o.id,o.email,o.display_name,CASE WHEN o.role IN ('owner','admin') THEN o.role ELSE COALESCE(m.role,'sales') END AS role,COALESCE(m.version,0) AS version,COALESCE(m.time_zone,'UTC') AS time_zone FROM oa_operators o LEFT JOIN p_members m ON m.operator_id=o.id WHERE o.status='active' ORDER BY o.email").all<any>()).results
 const teams=(await db.prepare('SELECT * FROM p_teams ORDER BY name').all<any>()).results
 const memberships=(await db.prepare('SELECT * FROM p_team_members').all<any>()).results
 const mine=memberships.filter(m=>m.operator_id===a.id).map(m=>m.team_id)
 return {teamPeople:people.filter(p=>a.role!=='manager'||p.id===a.id||memberships.some(m=>m.operator_id===p.id&&mine.includes(m.team_id))).map(p=>({...p,teams:memberships.filter(m=>m.operator_id===p.id).map(m=>m.team_id)})),teams:teams.filter(t=>a.role!=='manager'||mine.includes(t.id))}
}
export async function teamCommand(db:D1Database,a:Actor,name:string,p:Record<string,unknown>) {
 if(name==='proposal.share'){
  const row=await permitted(db,a,p.id,'share'),id=p.collaboratorEmail?(await db.prepare("SELECT id FROM oa_operators WHERE lower(email)=lower(?) AND status='active'").bind(text(p.collaboratorEmail,'a member email',254)).first<any>())?.id:text(p.operatorId,'a collaborator');need(id,'Choose an active member')
  need(await db.prepare("SELECT id FROM oa_operators WHERE id=? AND status='active'").bind(id).first(),'Choose an active member')
  need(p.shared===undefined||[true,false,'yes','no'].includes(p.shared as any),'Choose whether to share')
  await commit(db,a,[db.prepare(p.shared===false||p.shared==='no'?'DELETE FROM p_collaborators WHERE proposal_id=? AND operator_id=?':'INSERT INTO p_collaborators(proposal_id,operator_id) VALUES(?,?) ON CONFLICT DO NOTHING').bind(row.id,id)])
  return {id:row.id}
 }
 if(name==='member.zone'){
  const zone=text(p.timeZone,'an IANA time zone',100);try{new Intl.DateTimeFormat('en',{timeZone:zone})}catch{need(false,'Choose an IANA time zone')}
  need(a.role!=='agent','A person chooses their time zone',403)
  await commit(db,a,[db.prepare("INSERT INTO p_members(operator_id,role,time_zone) VALUES(?,?,?) ON CONFLICT(operator_id) DO UPDATE SET time_zone=excluded.time_zone,version=p_members.version+1").bind(a.id,a.role==='owner'?'admin':a.role,zone)])
  return {timeZone:zone}
 }
 need(administrators.includes(a.role)||a.role==='manager','Only team administrators manage membership',403)
 if(name==='team.create'){
  need(administrators.includes(a.role),'Only owner and admins create teams',403)
  const id=crypto.randomUUID();await commit(db,a,[db.prepare('INSERT INTO p_teams(id,name) VALUES(?,?)').bind(id,text(p.name,'a team name',100))]);return {id}
 }
 if(name==='team.member'){
  need(a.role==='owner','Only the owner assigns owner team membership',403)
  const id=text(p.operatorId,'an active member'),team=text(p.teamId,'a team')
  need(await db.prepare("SELECT id FROM oa_operators WHERE id=? AND status='active'").bind(id).first(),'Active member required')
  need(await db.prepare('SELECT id FROM p_teams WHERE id=?').bind(team).first(),'Team not found')
  await commit(db,a,[db.prepare('INSERT INTO p_team_members(team_id,operator_id) VALUES(?,?) ON CONFLICT DO NOTHING').bind(team,id),db.prepare('UPDATE p_members SET version=version+1 WHERE operator_id=?').bind(id)]);return {id}
 }
 need(name==='member.set','Unknown team command',404)
 const id=text(p.operatorId,'a member'),role=String(p.role),person=await db.prepare("SELECT o.*,COALESCE(m.role,g.role,'sales') AS product_role,COALESCE(m.version,0) AS product_version FROM oa_operators o LEFT JOIN p_members m ON m.operator_id=o.id LEFT JOIN p_member_invitations g ON g.email=o.email AND g.status='pending' WHERE o.id=? AND o.status='active'").bind(id).first<any>()
 need(person&&person.role!=='owner','The native owner keeps ownership',403)
 need(person.role!=='admin','Manage a native admin role through native account administration',403)
 need((roles as readonly string[]).includes(role),'Choose a product role')
 need(Number(p.version)===person.product_version,'Membership changed. Reload.',409)
 let teams:any=p.teams??Object.keys(p).filter(k=>k.startsWith('team:')&&p[k]==='yes').map(k=>k.slice(5));if(typeof teams==='string'){try{teams=JSON.parse(teams)}catch{need(false,'Provide a team list')}}
 need(Array.isArray(teams)&&teams.length<=50&&teams.every((v:any)=>typeof v==='string')&&new Set(teams).size===teams.length,'Provide distinct teams')
 for(const team of teams)need(await db.prepare('SELECT id FROM p_teams WHERE id=?').bind(team).first(),'Team not found')
 if(a.role==='admin')need(person.product_role!=='admin'&&role!=='admin','Only the owner changes admins',403)
 if(a.role==='manager'){
  const allowed=['sales','content_editor','viewer'];need(allowed.includes(role)&&allowed.includes(person.product_role),'Managers assign sales, content editors and viewers',403)
  const mine=(await db.prepare('SELECT team_id FROM p_team_members WHERE operator_id=?').bind(a.id).all<any>()).results.map(r=>r.team_id)
  const existing=(await db.prepare('SELECT team_id FROM p_team_members WHERE operator_id=?').bind(id).all<any>()).results.map(r=>r.team_id)
  need(teams.length&&teams.every((t:string)=>mine.includes(t))&&existing.every(t=>mine.includes(t)),'Managers assign only their own teams',403)
 }
 await commit(db,a,[db.prepare("INSERT INTO p_members(operator_id,role) VALUES(?,?) ON CONFLICT(operator_id) DO UPDATE SET role=excluded.role,version=p_members.version+1").bind(id,role),db.prepare("UPDATE p_member_invitations SET status='accepted',accepted_id=? WHERE email=? AND status='pending'").bind(id,person.email),db.prepare('DELETE FROM p_team_members WHERE operator_id=?').bind(id),...teams.map((t:string)=>db.prepare('INSERT INTO p_team_members(team_id,operator_id) VALUES(?,?)').bind(t,id))],false,{sql:"EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND status='active' AND role!='owner') AND COALESCE((SELECT version FROM p_members WHERE operator_id=?),0)=?",values:[id,id,person.product_version]})
 return {id}
}
export async function authorizeCommand(db:D1Database,a:Actor,name:string,p:Record<string,unknown>) {
 if(name.startsWith('member.')||name.startsWith('team.')||name==='proposal.share')return
 const id=p.id
 if(name.startsWith('expiry.')){await permitted(db,a,id,'send');return}
 const edit=['proposal.revise','proposal.negotiate','proposal.restore','attachments.refresh','suggestions.allow','suggestion.resolve','pdf.downloads']
 if(edit.includes(name)){await permitted(db,a,id,'edit');return}
 if(['proposal.send','proposal.withdraw','proposal.lose','question.answer','question.email'].includes(name)||name.startsWith('followup.')){await permitted(db,a,id,'send');return}
 if(name==='proposal.approve'||name==='proposal.reject'){await permitted(db,a,id,'approve');return}
 if(['proposal.duplicate','template.save','proposal.test-mail'].includes(name)){need(editors.includes(a.role),'Your role cannot prepare proposals',403);await permitted(db,a,id);return}
 if(name==='proposal.prepare'||name==='template.start'||name==='client.save'){need(editors.includes(a.role),'Your role cannot prepare proposals',403);return}
 if(name.startsWith('approval.'))need(administrators.includes(a.role),'Only owner and admins change approval settings',403)
}
