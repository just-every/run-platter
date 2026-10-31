import worker from './worker'
import type { Bindings } from '../src/auth.server'
export default {...worker,async fetch(request:Request,env:Bindings){
 const person=request.headers.get('x-test-revoke-person'),brand=request.headers.get('x-test-revoke-brand')
 if(!person||!brand)return worker.fetch(request,env)
 const db=env.DB;let pending=true
 const wrapped={prepare:db.prepare.bind(db),batch:async(statements:D1PreparedStatement[])=>{
  if(pending){pending=false;await db.prepare('DELETE FROM p_brand_members WHERE brand_id=? AND operator_id=?').bind(brand,person).run()}
  return db.batch(statements)
 }} as D1Database
 return worker.fetch(request,{...env,DB:wrapped})
}}
