import { need } from '../model'

export type AsanaAuthority = () => Promise<string>
const base='https://app.asana.com/api/1.0'
export const asanaId=(value:unknown)=>{need(typeof value==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(value),'Use an Asana resource id');return value}
/** Obtain current authority immediately before every request, including reads. */
async function request(authorize:AsanaAuthority,path:string,data?:unknown){
 const token=await authorize()
 const response=await fetch(base+path,{method:data===undefined?'GET':'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify({data})}),redirect:'manual',signal:AbortSignal.timeout(30000)})
 need(response.ok,'Asana refused the request. Review the destination and any uncertain provider writes before continuing.',409)
 const raw=await response.text();need(raw.length<=262144,'Asana returned an oversized response',409)
 let result:any;try{result=JSON.parse(raw)}catch{need(false,'Asana returned an unreadable response. Review any uncertain provider writes.',409)}
 need(result?.data&&typeof result.data==='object','Asana returned an incomplete response. Review any uncertain provider writes.',409)
 return result.data
}
export async function asanaDestination(authorize:AsanaAuthority,workspace:string,team:string){
 const w=await request(authorize,'/workspaces/'+encodeURIComponent(workspace)+'?opt_fields=gid,name')
 need(w.gid===workspace,'Asana did not confirm the workspace',409)
 const t=await request(authorize,'/teams/'+encodeURIComponent(team)+'?opt_fields=gid,name,organization.gid')
 need(t.gid===team&&t.organization?.gid===workspace,'Choose an Asana team in the verified workspace',409)
}
export async function asanaCreate(authorize:AsanaAuthority,kind:'project'|'task',data:unknown){
 const result=await request(authorize,kind==='project'?'/projects':'/tasks',data)
 try{return asanaId(result.gid)}catch{need(false,'Asana did not acknowledge a resource id. Review the uncertain write; it will not be retried.',409)}
}
