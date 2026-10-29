import worker from './worker'
import type { Bindings } from '../src/auth.server'
// Test-only storage scheduling barrier. Both requests still use the real public
// handler; the owner pauses after authentication and before the real D1 batch.
export default {...worker,async fetch(request:Request,env:Bindings){
 if(request.headers.get('x-test-agent-commit')==='hold'){
  const db=env.DB
  const wrapped=new Proxy(db,{get(target,property){
   if(property==='batch')return async(statements:D1PreparedStatement[])=>{
    await fetch('https://agent-barrier.example.test/commit')
    return target.batch(statements)
   }
   const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value
  }})
  return worker.fetch(request,{...env,DB:wrapped})
 }
 return worker.fetch(request,env)
}}
