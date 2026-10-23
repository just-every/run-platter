import { runNotifications } from '../src/platter/notifications/scheduled'
import { memberAuthOptions,memberAuthHandler } from '../src/platter/member-invitations'
// Real production handlers. Auth mail is captured at its mailbox edge; proposal
// mail uses the configured real adapter with outbound HTTP faked by the harness.
import { createOperatorAuth } from '@runeditrun/rer/modules/operator-auth'
import { createD1DevelopmentOutbox } from '@runeditrun/rer/internal/modules/mail/src/development/index.mjs'
import { withAuthAudit } from '../src/platter/auth-audit'
import { authResponse,authConfig,type Bindings } from '../src/auth.server'
import { platterResponse } from '../src/platter/http'
import { runReminders } from '../src/platter/reminders'
import { runExpiry } from '../src/platter/expiry'
import { runDueReports } from '../src/platter/reports/schedules'
import { runtimeBindings } from '../src/auth.server'
export default {async fetch(request:Request,env:Bindings){
 if(new URL(request.url).pathname.startsWith('/auth/')){
  const auth=createOperatorAuth({...memberAuthOptions(env),db:env.DB,config:authConfig(env),clientIp:()=>'127.0.0.1',mailSender:{async send(message:any){await createD1DevelopmentOutbox({db:env.DB}).put(message);return{provider:'development',mode:'development',providerMessageId:null,status:env.AUTH_LOCAL==='true'?'development':'accepted'}}}})
  return withAuthAudit(request,env,async()=>await memberAuthHandler(request,env,auth),auth)
 }
 return await authResponse(request,env)??await platterResponse(request,env)??new Response('Not found',{status:404})
},async scheduled(controller:ScheduledController,env:Bindings){await runExpiry(runtimeBindings(env),controller.scheduledTime);await runReminders(runtimeBindings(env),controller.scheduledTime);await runDueReports(runtimeBindings(env),controller.scheduledTime);await runNotifications(runtimeBindings(env))}}
