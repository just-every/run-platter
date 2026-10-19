// Real production handlers + a mail capture at the external-delivery edge only.
import { createOperatorAuth,createAuthHandler } from '@runeditrun/rer/modules/operator-auth'
import { createD1DevelopmentOutbox } from '@runeditrun/rer/internal/modules/mail/src/development/index.mjs'
import { withAuthAudit } from '../src/platter/auth-audit'
import { authResponse,authConfig,type Bindings } from '../src/auth.server'
import { platterResponse } from '../src/platter/http'
export default {async fetch(request:Request,env:Bindings){
 if(new URL(request.url).pathname.startsWith('/auth/')){
  const auth=createOperatorAuth({db:env.DB,config:authConfig(env),clientIp:()=>'127.0.0.1',mailSender:{async send(message:any){await createD1DevelopmentOutbox({db:env.DB}).put(message);return{provider:'development',mode:'development',providerMessageId:null,status:'development'}}}})
  return withAuthAudit(request,env,()=>createAuthHandler(auth)(request),auth)
 }
 return await authResponse(request,env)??await platterResponse(request,env)??new Response('Not found',{status:404})
}}
