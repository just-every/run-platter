export default async function({phase,request,origin,cookie}) {
 // Each round obtains its own real native client. No SQL creates business data.
 const response=await request(origin+'/api/platter/command',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify({name:'client.save',input:{name:'Northstar '+phase,email:'northstar-'+crypto.randomUUID()+'@example.invalid'}})})
 if(response.status!==200)throw Error('Native client preparation failed')
 return {values:{client:await response.json()}}
}
