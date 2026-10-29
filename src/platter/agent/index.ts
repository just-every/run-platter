import { createAgentDoor, type Trust } from '../../base/modules/agent-door/index.ts'
import { createBusinessSettings } from '../../base/modules/business-settings/index.ts'
import { operatorAuth, authConfig, type Bindings } from '../../auth.server'
import { principal } from '../credentials'
import { nativePeople } from './people'
import { proposalTools, coreCapabilities, nativeToolScopes } from './tools'

export const businessManifest = {settings:1 as const,values:['display_name' as const],team:{roles:{admin:'admin',member:'member'}}}
function trust(env:Bindings):Trust|null {
 const {RER_OWNER_CLAIM_ISSUER:issuer,RER_OWNER_CLAIM_INSTALLATION_ID:installationId,RER_OWNER_CLAIM_PUBLIC_KEYS:publicKeys}=env
 if(!issuer&&!installationId&&!publicKeys)return null
 if(!issuer||!installationId||!publicKeys)throw new Error('Incomplete agent trust')
 return {issuer,installationId,appOrigin:env.AUTH_ORIGIN,publicKeys:JSON.parse(publicKeys)}
}
export function platterBusinessSettings(env:Bindings) {
 return createBusinessSettings({db:env.DB,trust:env.RER_BUSINESS_TRUST,business:businessManifest,team:operatorAuth(env).businessTeam})
}
export async function localAgent(request:Request,env:Bindings,reportPurpose=false) {
 try {
  const a=await principal(request,env,true)
  const row=await env.DB.prepare('SELECT label FROM p_agent_keys WHERE id=?').bind(a.keyId!).first<{label:string}>()
  if(!row)return null
  return {sponsor:{id:a.id},agent:{id:a.keyId!,name:row.label,specialist:'proposal coordinator'},clientId:'platter-key:'+a.keyId,scopes:[...nativeToolScopes]}
 } catch(error) { if(reportPurpose&&Number((error as any).status)===403)throw error;return null }
}
export async function platterAgentDoor(env:Bindings) {
 const brand=await platterBusinessSettings(env).publicBrand()
 return createAgentDoor({seed:'platter',name:brand.displayName??'Platter',specialist:'proposal coordinator',db:env.DB,origin:env.AUTH_ORIGIN,trust:trust(env),capabilities:coreCapabilities,
  people:nativePeople(env),tools:proposalTools(env),paths:['/api/platter/agent/mcp'],resources:[],
  localCredentials:request=>localAgent(request,env),
  currentScopes:async who=>{
   if(!who.clientId?.startsWith('platter-key:'))return [...who.scopes]
   const key=who.clientId.slice('platter-key:'.length)
   const row=await env.DB.prepare("SELECT 1 FROM p_agent_keys k JOIN oa_operators o ON o.id=k.owner_id WHERE k.id=? AND k.owner_id=? AND k.revoked_at IS NULL AND k.expires_at>? AND o.role='owner' AND o.status='active' AND o.version=k.owner_version AND NOT EXISTS(SELECT 1 FROM p_rest_keys WHERE key_id=k.id)").bind(key,who.person.id,Date.now()).first()
   return row?[...nativeToolScopes]:[]
  },notTools:[{clauses:['IMPORT-001','EDIT-005','EDIT-019'],reason:'import-door'},{clauses:['PORT-001','SEC-001'],reason:'installation'},{clauses:['MOB-002','SIGN-001','SIGN-002'],reason:'screen'},{clauses:['CRM-001','AUTO-003'],reason:'connector'}],
 })
}

/** Select owned paths without reading agent tables for unrelated native routes.
 * The selected handler still runs before app authentication/setup redirects. */
export async function sharedAgentResponse(request:Request,env:Bindings):Promise<Response|null> {
 const path=new URL(request.url).pathname
 if(path==='/mcp'||path==='/api/platter/agent/mcp'||path==='/api/rer/agent-policy'||path==='/agents'||path.startsWith('/agents/')||['/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp'].includes(path)) {
  const response=await (await platterAgentDoor(env)).handle(request)
  if(response)return response
 }
 if(['/api/rer/business-settings','/rer-business-logo','/rer-business.css'].includes(path))return platterBusinessSettings(env).handle(request)
 return null
}
