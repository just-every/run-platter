import { operatorAuth, runtimeBindings, type Bindings } from '../auth.server'
import { recordAudit } from './audit'

// Observe native authority changes without retaining request bodies or credentials.
export async function withAuthAudit(request: Request, original: Bindings, handle: () => Promise<Response | null>, suppliedAuth?: ReturnType<typeof operatorAuth>) {
 const path = new URL(request.url).pathname
 const observes = request.method === 'POST' && (path.startsWith('/auth/') || path === '/setup')
 if (!observes) return handle()
 const env = runtimeBindings(original), auth = suppliedAuth ?? operatorAuth(env)
 let before: Awaited<ReturnType<typeof auth.getSession>>
 try { before = await auth.getSession(request) } catch (error) {
  if ((error as any)?.name === 'AuthError' && Number((error as any).status) < 500) return handle()
  throw error
 }
 let requestedSubject: string | undefined
 const copy = ['/auth/operator/role', '/auth/operator/status', '/auth/invite/cancel', '/auth/session/revoke'].includes(path) ? request.clone() : undefined
 const response = await handle()
 if (!response || response.status >= 400) return response
 if (copy) {
  const input = copy.headers.get('content-type')?.includes('application/json') ? await copy.json() as any : Object.fromEntries(new URLSearchParams(await copy.text()))
  const id = input.operatorId ?? input.sessionId
  if (typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id)) requestedSubject = id
 }
 let actor = before?.operator
 if (!actor) {
  const cookie = response.headers.get('set-cookie')?.split(';')[0]
  if (cookie) { const headers = new Headers(request.headers); headers.set('cookie', cookie); actor = (await auth.getSession(new Request(request.url, { headers })))?.operator }
 }
 if (path === '/auth/invite' && response.headers.get('content-type')?.includes('application/json')) {
  const value = await response.clone().json() as any, id = value.operatorId ?? value.operator?.id ?? value.id
  if (typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id)) requestedSubject = id
 }
 await recordAudit(env.DB, actor ? { id: actor.id, role: actor.role } : { id: 'unidentified', role: 'visitor' }, 'native' + path.replaceAll('/', '.'), requestedSubject ?? actor?.id ?? 'installation')
 return response
}
