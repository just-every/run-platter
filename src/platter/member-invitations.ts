import { AuthError, defaultRolePolicy, type AuthOptions, type RolePolicy } from '@runeditrun/rer/modules/operator-auth'
import { operatorAuth, type Bindings } from '../auth.server'
import { commit, email, need, text, type Actor } from './model'
import { roles } from './permissions'
async function issuer(db:D1Database,id:string){return db.prepare("SELECT o.id,o.email,o.version AS nativeVersion,CASE WHEN o.role IN ('owner','admin') THEN o.role ELSE COALESCE(m.role,'sales') END AS role,COALESCE(m.version,0) AS memberVersion FROM oa_operators o LEFT JOIN p_members m ON m.operator_id=o.id WHERE o.id=? AND o.status='active'").bind(id).first<any>()}
async function grantAuthority(db:D1Database,g:any){
 const a=await issuer(db,g.issuer_id);if(!a||a.nativeVersion!==g.issuer_native_version||a.memberVersion!==g.issuer_member_version||g.expires_at<=Date.now())return null
 const teams:string[]=JSON.parse(g.teams)
 if(a.role==='owner')return a
 if(a.role==='admin'&&g.role!=='admin')return a
 if(a.role!=='manager'||!['sales','content_editor','viewer'].includes(g.role)||!teams.length)return null
 for(const team of teams)if(!await db.prepare('SELECT 1 FROM p_team_members WHERE operator_id=? AND team_id=?').bind(a.id,team).first())return null
 return a
}
export function memberAuthOptions(env:Bindings):Pick<AuthOptions,'rolePolicy'|'hooks'>{
 const db=env.DB
 const rolePolicy:RolePolicy=async input=>{
  if(defaultRolePolicy(input))return true
  if(input.action!=='operators:invite'||input.role!=='member')return false
  const grants=(await db.prepare("SELECT * FROM p_member_invitations WHERE issuer_id=? AND status='pending'").bind(input.actor.id).all<any>()).results
  for(const g of grants)if(await grantAuthority(db,g))return true
  return false
 }
 return {rolePolicy,hooks:{
  async beforeMagicLink({email:address}){const g=await db.prepare("SELECT * FROM p_member_invitations WHERE email=? AND status='pending'").bind(address).first<any>();return !g||Boolean(await grantAuthority(db,g))},
  async afterConfirm({operator}){
   const g=await db.prepare("SELECT * FROM p_member_invitations WHERE email=? AND status='pending'").bind(operator.email).first<any>();if(!g)return
   const a=await grantAuthority(db,g);if(!a||operator.role!=='member')throw new AuthError('invitation_authority_changed',403)
   const teams:string[]=JSON.parse(g.teams),teamSql=a.role==='manager'?teams.map(()=>"EXISTS(SELECT 1 FROM p_team_members WHERE operator_id=? AND team_id=?)").join(' AND '):'1'
   try{await commit(db,a,[db.prepare('INSERT INTO p_members(operator_id,role) VALUES(?,?)').bind(operator.id,g.role),...teams.map(team=>db.prepare('INSERT INTO p_team_members(team_id,operator_id) VALUES(?,?)').bind(team,operator.id)),db.prepare("UPDATE p_member_invitations SET status='accepted',accepted_id=? WHERE email=?").bind(operator.id,operator.email)],false,{sql:"EXISTS(SELECT 1 FROM p_member_invitations WHERE email=? AND request_id=? AND status='pending' AND expires_at>?) AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND version=? AND status='active') AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='member' AND status='active') AND "+teamSql,values:[g.email,g.request_id,Date.now(),a.id,a.nativeVersion,operator.id,...(a.role==='manager'?teams.flatMap(t=>[a.id,t]):[])]})}catch{throw new AuthError('invitation_authority_changed',403)}
  }
 }}
}
// Delegated issuance always goes through the product command so the role/team
// grant is pinned before Base creates or sends an invitation capability.
export async function directInviteBoundary(request:Request,env:Bindings,auth:ReturnType<typeof operatorAuth>){
 if(new URL(request.url).pathname!=='/auth/invite'||request.method!=='POST')return null
 const session=await auth.getSession(request);if(session?.operator.role==='member')return Response.json({error:'Use the team invitation form to choose the permitted role and teams.'},{status:403})
 return null
}
export async function inviteMember(env:Bindings,a:Actor,p:Record<string,unknown>,request:Request){
 need(['owner','admin','manager'].includes(a.role),'Your role cannot invite members',403)
 const role=String(p.role);need((roles as readonly string[]).includes(role),'Choose a product role')
 if(a.role==='admin')need(role!=='admin','Only the owner invites admins',403)
 if(a.role==='manager')need(['sales','content_editor','viewer'].includes(role),'Managers invite sales, content editors and viewers',403)
 const db=env.DB,address=email(p.email),displayName=text(p.displayName,'a member name',100),teams=Array.isArray(p.teams)?[...new Set(p.teams.map(String))]:Object.keys(p).filter(k=>k.startsWith('inviteTeam:')&&p[k]==='yes').map(k=>k.slice(11))
 need(teams.length<=50,'Choose at most 50 teams');if(a.role==='manager')need(teams.length,'Managers invite into their own teams',403)
 for(const team of teams){need(await db.prepare('SELECT id FROM p_teams WHERE id=?').bind(team).first(),'Team not found');if(a.role==='manager')need(await db.prepare('SELECT 1 FROM p_team_members WHERE operator_id=? AND team_id=?').bind(a.id,team).first(),'Invite only into your own teams',403)}
 need(!await db.prepare('SELECT id FROM oa_operators WHERE email=?').bind(address).first(),'This account already exists. Manage its current membership instead.',409)
 need(!await db.prepare('SELECT email FROM p_member_invitations WHERE email=?').bind(address).first(),'An invitation request already exists for this address.',409)
 const current=await issuer(db,a.id);need(current,'Active inviter required',403)
 const requestId=crypto.randomUUID(),expiresAt=Date.now()+7*86400000
 await commit(db,a,[db.prepare("INSERT INTO p_member_invitations(email,request_id,role,teams,issuer_id,issuer_native_version,issuer_member_version,expires_at,status) VALUES(?,?,?,?,?,?,?,?,'pending')").bind(address,requestId,role,JSON.stringify(teams),a.id,current.nativeVersion,current.memberVersion,expiresAt)],false,{sql:"NOT EXISTS(SELECT 1 FROM oa_operators WHERE email=?)"+(a.role==='manager'?' AND '+teams.map(()=>"EXISTS(SELECT 1 FROM p_team_members WHERE operator_id=? AND team_id=?)").join(' AND '):''),values:[address,...(a.role==='manager'?teams.flatMap(t=>[a.id,t]):[])]})
 try{await operatorAuth(env).invite(request,{email:address,displayName,role:'member',returnTo:'/app'});return {id:requestId,status:'invited',expiresAt}}
 catch{return {id:requestId,status:'needs_review',message:'The invitation request is recorded, but delivery was not confirmed. Ask the owner to review it before retrying.'}}
}
