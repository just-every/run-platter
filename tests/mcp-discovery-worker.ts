import worker from './worker'
import type { Bindings } from '../src/auth.server'

// The journey uses the production HTTP door, with business reads and writes
// refused at the database edge during discovery. Credential checks still run.
export default {
 async fetch(request: Request, env: Bindings) {
  if (new URL(request.url).pathname === '/api/platter/agent/mcp' && request.method === 'POST') {
   const message = await request.clone().json() as { method?: string }
   if (['initialize', 'tools/list', 'resources/list', 'resources/templates/list', 'resources/read', 'prompts/list', 'prompts/get'].includes(message.method ?? '')) {
    const db = new Proxy(env.DB, {
     get(target, key) {
      if (key === 'prepare') return (sql: string) => {
       const tables = [...sql.matchAll(/\b(?:FROM|JOIN)\s+(\w+)/gi)].map(match => match[1])
       if (!/^SELECT\b/i.test(sql.trim()) || !tables.length || tables.some(table => !['p_agent_keys', 'oa_operators', 'p_rest_keys'].includes(table))) throw new Error('Discovery attempted business-record access')
       return target.prepare(sql)
      }
      if (key === 'batch' || key === 'exec') return () => { throw new Error('Discovery attempted database writes') }
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
     },
    })
    return worker.fetch(request, { ...env, DB: db })
   }
  }
  return worker.fetch(request, env)
 },
}
