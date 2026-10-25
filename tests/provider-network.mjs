// Bridge the worker request implementation to Node's real network transport.
export async function forwardProviderRequest(request){
 const body=['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer()
 const headers=new Headers(request.headers)
 for(const name of ['host','connection','content-length','transfer-encoding','accept-encoding'])headers.delete(name)
 let response
 try{response=await fetch(request.url,{method:request.method,headers,body,redirect:'manual'})}
 catch(error){console.log('Provider transport refusal: '+JSON.stringify({type:error.name,cause:error.cause?.code}));throw error}
 if(!response.ok){const error=(await response.clone().json()).error;console.log('Provider refusal: '+JSON.stringify({status:response.status,type:error?.type,code:error?.code,param:error?.param}))}
 return response
}
