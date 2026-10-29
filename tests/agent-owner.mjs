export default async function({request,origin,claim,displayName}) {
 const claimed=await request(origin+claim.path,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({token:claim.token,displayName,returnTo:'/setup'}),redirect:'manual'})
 if(claimed.status!==303)throw Error('Native owner claim failed')
 const cookie=claimed.headers.getSetCookie().map(v=>v.split(';',1)[0]).join('; ')
 const finish=await request(origin+'/setup',{method:'POST',headers:{cookie,origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({confirm:'yes'}),redirect:'manual'})
 if(finish.status!==303)throw Error('Native first run failed')
 return claimed
}
